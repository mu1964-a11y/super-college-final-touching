import * as baileys from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const makeWASocket = (baileys.default || baileys.makeWASocket) as any;
const { useMultiFileAuthState, DisconnectReason } = baileys;

export interface WhatsAppStatus {
  status: "disconnected" | "connecting" | "qr_ready" | "connected";
  qrCode: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  connectedAt: string | null;
  lastError: string | null;
}

export interface VerifiedUser {
  phone: string;
  role: "Principal" | "Teacher" | "Staff" | "Admin";
  staffId?: string;
  name: string;
  email?: string;
  designation?: string;
  linkedAt: string;
}

class WhatsAppBridgeService {
  private sock: any = null;
  private status: "disconnected" | "connecting" | "qr_ready" | "connected" = "disconnected";
  private qrCode: string | null = null;
  private connectedPhone: string | null = null;
  private connectedName: string | null = null;
  private connectedAt: string | null = null;
  private lastError: string | null = null;
  private authDir: string;
  private isInitializing: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private isBotEnabled: boolean = true;
  private botQueriesProcessed: number = 0;
  private botActivityLogs: Array<{ timestamp: string; sender: string; query: string; replyType: string }> = [];

  private chatLogsFile: string;
  private chatLogs: Array<{
    id: string;
    timestamp: string;
    phone: string;
    direction: "incoming" | "outgoing";
    senderName?: string;
    text: string;
    verifiedStudent?: string;
  }> = [];
  private sessionState: Map<
    string,
    {
      stage: "IDLE" | "AWAITING_VERIFICATION" | "VERIFIED";
      candidateStudent?: any;
      candidateStudents?: any[];
      verifiedStudent?: any;
      pendingIntent?: "fee" | "marks" | "attendance" | "general";
      lastActive: number;
      history?: Array<{ role: "user" | "model"; text: string }>;
      salamSent?: boolean;
      targetStudentQuery?: string;
      failedVerificationAttempts?: number;
      accumulatedMatches?: {
        name?: boolean;
        father?: boolean;
        section?: boolean;
        phone?: boolean;
        roll?: boolean;
        bay?: boolean;
      };
    }
  > = new Map();

  private lidToPhoneMap: Map<string, string> = new Map();
  private phoneToLidMap: Map<string, string> = new Map();

  private verifiedUsersFile: string;
  private verifiedUsers: Map<string, VerifiedUser> = new Map();
  private pendingOTPs: Map<
    string,
    {
      code: string;
      phone: string;
      expiresAt: number;
      attempts: number;
      candidate: {
        role: "Principal" | "Teacher" | "Staff" | "Admin";
        staffId?: string;
        name: string;
        email?: string;
        designation?: string;
        contact: string;
      };
      registeredPhone: string;
    }
  > = new Map();

  constructor() {
    this.authDir = path.join(process.cwd(), ".whatsapp_auth");
    this.chatLogsFile = path.join(process.cwd(), ".whatsapp_chat_logs.json");
    this.verifiedUsersFile = path.join(process.cwd(), ".whatsapp_verified_users.json");
    if (!fs.existsSync(this.authDir)) {
      try {
        fs.mkdirSync(this.authDir, { recursive: true });
      } catch (e) {
        console.warn("[WhatsApp Bridge] Could not create auth directory:", e);
      }
    }
    this.loadLidMappings();
    this.loadChatLogs();
    this.loadVerifiedUsers();
  }

  private loadLidMappings() {
    try {
      if (fs.existsSync(this.authDir)) {
        const files = fs.readdirSync(this.authDir);
        for (const file of files) {
          if (file.startsWith("lid-mapping-") && file.endsWith("_reverse.json")) {
            const lid = file.replace("lid-mapping-", "").replace("_reverse.json", "");
            const fullPath = path.join(this.authDir, file);
            const pn = fs.readFileSync(fullPath, "utf-8").trim().replace(/["'\s]/g, "");
            if (lid && pn) {
              const lidJid = `${lid}@lid`;
              this.lidToPhoneMap.set(lidJid, pn);
              this.lidToPhoneMap.set(lid, pn);
              this.phoneToLidMap.set(pn, lidJid);
            }
          }
        }
      }
    } catch (e) {
      console.warn("[WhatsApp Bridge] Error loading lid mappings:", e);
    }
  }

  // Resolve true Pakistani or international phone number from JID or LID
  public async resolvePhoneNumber(rawJid: string, msgKey?: any): Promise<string> {
    if (!rawJid) return "";

    // 1. If rawJid is standard @s.whatsapp.net
    if (rawJid.includes("@s.whatsapp.net")) {
      return rawJid.split("@")[0].replace(/\D/g, "");
    }

    // 2. Check participantAlt or remoteJidAlt from message key
    const altJid = msgKey?.participantAlt || msgKey?.remoteJidAlt;
    if (altJid && altJid.includes("@s.whatsapp.net")) {
      const pn = altJid.split("@")[0].replace(/\D/g, "");
      if (pn && pn.length >= 10) {
        this.lidToPhoneMap.set(rawJid, pn);
        this.phoneToLidMap.set(pn, rawJid);
        return pn;
      }
    }

    // 3. Check memory cache
    if (this.lidToPhoneMap.has(rawJid)) {
      return this.lidToPhoneMap.get(rawJid)!;
    }
    const rawId = rawJid.split("@")[0].replace(/\D/g, "");
    if (this.lidToPhoneMap.has(rawId)) {
      return this.lidToPhoneMap.get(rawId)!;
    }

    // 4. If it is @lid, try signalRepository lidMapping
    if (rawJid.endsWith("@lid") && this.sock?.signalRepository?.lidMapping) {
      try {
        const mappedPn = await this.sock.signalRepository.lidMapping.getPNForLID(rawJid);
        if (mappedPn) {
          const cleanPn = mappedPn.split("@")[0].replace(/\D/g, "");
          if (cleanPn && cleanPn.length >= 10) {
            this.lidToPhoneMap.set(rawJid, cleanPn);
            this.lidToPhoneMap.set(rawId, cleanPn);
            this.phoneToLidMap.set(cleanPn, rawJid);
            return cleanPn;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 5. Check on-disk auth lid-mapping file
    try {
      const mappingFile = path.join(this.authDir, `lid-mapping-${rawId}_reverse.json`);
      if (fs.existsSync(mappingFile)) {
        const data = fs.readFileSync(mappingFile, "utf-8").trim().replace(/["'\s]/g, "");
        if (data && data.length >= 10) {
          this.lidToPhoneMap.set(rawJid, data);
          this.lidToPhoneMap.set(rawId, data);
          this.phoneToLidMap.set(data, rawJid);
          return data;
        }
      }
    } catch (e) {
      // ignore
    }

    // 6. Check participant
    if (msgKey?.participant && msgKey.participant.includes("@s.whatsapp.net")) {
      const pn = msgKey.participant.split("@")[0].replace(/\D/g, "");
      if (pn && pn.length >= 10) return pn;
    }

    // Fallback: stripped raw id
    return rawId;
  }

  private loadChatLogs() {
    try {
      if (fs.existsSync(this.chatLogsFile)) {
        const data = fs.readFileSync(this.chatLogsFile, "utf-8");
        this.chatLogs = JSON.parse(data || "[]");
      }
    } catch (e) {
      console.warn("[WhatsApp Bridge] Could not read chat logs file:", e);
      this.chatLogs = [];
    }
  }

  private saveChatLog(entry: {
    phone: string;
    direction: "incoming" | "outgoing";
    senderName?: string;
    text: string;
    verifiedStudent?: string;
  }) {
    const logItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.chatLogs.unshift(logItem);
    if (this.chatLogs.length > 500) {
      this.chatLogs = this.chatLogs.slice(0, 500);
    }
    try {
      fs.writeFileSync(this.chatLogsFile, JSON.stringify(this.chatLogs, null, 2), "utf-8");
    } catch (e) {
      console.warn("[WhatsApp Bridge] Could not write chat logs:", e);
    }
  }

  public getChatLogs(phoneFilter?: string) {
    if (!phoneFilter) return this.chatLogs;
    const clean = phoneFilter.replace(/\D/g, "");
    return this.chatLogs.filter((log) => log.phone.includes(clean));
  }

  public deleteMessage(messageId: string) {
    this.chatLogs = this.chatLogs.filter((log) => log.id !== messageId);
    try {
      fs.writeFileSync(this.chatLogsFile, JSON.stringify(this.chatLogs, null, 2), "utf-8");
    } catch (e) {
      console.warn("[WhatsApp Bridge] Could not update chat logs after delete:", e);
    }
    return { success: true };
  }

  public deleteConversation(phone: string) {
    const clean = phone.replace(/\D/g, "");
    this.chatLogs = this.chatLogs.filter((log) => !log.phone.includes(clean));
    try {
      fs.writeFileSync(this.chatLogsFile, JSON.stringify(this.chatLogs, null, 2), "utf-8");
    } catch (e) {
      console.warn("[WhatsApp Bridge] Could not update chat logs after clearing conversation:", e);
    }
    return { success: true };
  }

  public clearChatLogs() {
    this.chatLogs = [];
    try {
      fs.writeFileSync(this.chatLogsFile, "[]", "utf-8");
    } catch (e) {}
    return { success: true };
  }

  // --- Faculty & Admin Verified Users Storage & Sync ---
  private loadVerifiedUsers() {
    try {
      if (fs.existsSync(this.verifiedUsersFile)) {
        const raw = fs.readFileSync(this.verifiedUsersFile, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const u of parsed) {
            const norm = this.normalizePhoneNumber(u.phone);
            if (norm) this.verifiedUsers.set(norm, u);
          }
        }
      }
    } catch (e) {
      console.warn("[WhatsApp Bridge] Error loading verified users file:", e);
    }
  }

  private saveVerifiedUsersLocal() {
    try {
      const list = Array.from(this.verifiedUsers.values());
      fs.writeFileSync(this.verifiedUsersFile, JSON.stringify(list, null, 2), "utf-8");
    } catch (e) {
      console.warn("[WhatsApp Bridge] Error saving verified users locally:", e);
    }
  }

  public async saveVerifiedUsers(supabase?: any) {
    this.saveVerifiedUsersLocal();
    if (supabase) {
      try {
        const list = Array.from(this.verifiedUsers.values());
        const { data: settings } = await supabase.from("settings").select("id, config").limit(1).maybeSingle();
        if (settings) {
          const currentConfig = settings.config || {};
          await supabase.from("settings").update({
            config: {
              ...currentConfig,
              whatsappVerifiedUsers: list
            }
          }).eq("id", settings.id);
        }
      } catch (err) {
        console.warn("[WhatsApp Bridge] Error saving verified users to Supabase:", err);
      }
    }
  }

  public async syncVerifiedUsersWithSupabase(supabase?: any) {
    try {
      if (!supabase) return;
      const { data: settings } = await supabase.from("settings").select("id, config").limit(1).maybeSingle();
      if (settings && settings.config?.whatsappVerifiedUsers) {
        const cloudList = settings.config.whatsappVerifiedUsers || [];
        let changed = false;
        for (const u of cloudList) {
          const norm = this.normalizePhoneNumber(u.phone);
          if (norm && !this.verifiedUsers.has(norm)) {
            this.verifiedUsers.set(norm, u);
            changed = true;
          }
        }
        if (changed) {
          this.saveVerifiedUsersLocal();
        }
      }
    } catch (err) {
      console.warn("[WhatsApp Bridge] Could not sync verified users with Supabase:", err);
    }
  }

  public getVerifiedUsersList(): VerifiedUser[] {
    return Array.from(this.verifiedUsers.values());
  }

  public async unlinkVerifiedUser(phone: string, supabase?: any): Promise<boolean> {
    const norm = this.normalizePhoneNumber(phone);
    if (this.verifiedUsers.has(norm)) {
      this.verifiedUsers.delete(norm);
      await this.saveVerifiedUsers(supabase);
      return true;
    }
    return false;
  }

  public getFacultyMenuText(user: VerifiedUser): string {
    const isLeader = user.role === "Principal" || user.role === "Admin" || user.role === "Director" || !!user.email;
    return `🏛️ *SUPERIOR GROUP OF COLLEGES JAHANIAN*
🎓 *Faculty & Administrative Helpdesk*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Verified User:* ${user.name}
🏷️ *Role / Designation:* ${user.designation || user.role} ${user.staffId ? `(${user.staffId})` : ""}
📱 *Linked WhatsApp:* ${user.phone}
━━━━━━━━━━━━━━━━━━━━━━━━━
Matlooba sahulat ke liye number ya sawal likhein:

📅 *1. Mera Timetable* (Aaj ya kisi bhi din ka lecture schedule)
🔍 *2. Student Inquiry* (Kisi bhi student ka Name ya Roll No likhein)
${isLeader ? `📊 *3. Institutional Overview* (Total strength, collection, staff attendance)\n` : `📋 *3. Meri Attendance & Salary Advance*\n`}
🚪 *4. Logout / Unlink* (Is device ko unlink karne ke liye)

_Tip: Aap seedha pooch sakte hain: "Mera Monday ka lecture kab hai?" ya "Student SGC-26-419 ka record dikhao"._`;
  }

  public async getTeacherTimetable(supabase: any, staffId: string, staffName: string, queryDay?: string): Promise<string> {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let targetDay = queryDay;
    if (!targetDay) {
      const todayIdx = new Date().getDay();
      targetDay = daysOfWeek[todayIdx];
    }

    const { data: rows, error } = await supabase
      .from("staff_timetable")
      .select("*")
      .eq("staff_id", staffId)
      .ilike("day", `%${targetDay}%`)
      .order("start_time", { ascending: true });

    if (error || !rows || rows.length === 0) {
      const { data: allDays } = await supabase
        .from("staff_timetable")
        .select("day")
        .eq("staff_id", staffId);
      
      const uniqueDays = Array.from(new Set((allDays || []).map((r: any) => r.day)));
      const scheduleHint = uniqueDays.length > 0 
        ? `\n\nAapke lecture in dino mein schedule hain: *${uniqueDays.join(", ")}*.\nKisi din ka schedule dekhne ke liye din ka naam likhein (maslan: *Monday timetable*).`
        : "";

      return `📅 *LECTURE TIMETABLE — ${targetDay.toUpperCase()}*\nFaculty: *${staffName}* (ID: ${staffId})\n━━━━━━━━━━━━━━━━━━━━━━━━━\n✨ *${targetDay}* ko aapka koi lecture schedule nahi hai (Free Day).${scheduleHint}`;
    }

    const formatTime = (t: string) => {
      if (!t) return "";
      const parts = t.split(":");
      let h = parseInt(parts[0], 10);
      const m = parts[1] || "00";
      const ampm = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${h}:${m} ${ampm}`;
    };

    const lines = rows.map((r: any, idx: number) => {
      const timeStr = `${formatTime(r.start_time)} - ${formatTime(r.end_time)}`;
      return `${idx + 1}️⃣ *${timeStr}*\n   📚 *Subject:* ${r.subject}\n   🏛️ *Room / Section:* ${r.class_room || r.section || "Lecture Hall"}`;
    });

    return `📅 *LECTURE TIMETABLE — ${targetDay.toUpperCase()}*\nFaculty: *${staffName}* (ID: ${staffId})\n━━━━━━━━━━━━━━━━━━━━━━━━━\n${lines.join("\n\n")}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n_Superior College Jahanian Academic Desk_`;
  }

  public async getTeacherStudentDossier(supabase: any, query: string): Promise<string | null> {
    const clean = query
      .replace(/^(student|talib-e-ilm|roll|roll no|details of|record of|profile of)\s+/i, "")
      .replace(/\s+(ka record|ki detail|ka fee status|ki fee|ka status|kya hai)$/i, "")
      .trim();
    if (clean.length < 2) return null;

    const { data: students } = await supabase
      .from("students")
      .select("*");
    
    if (!students || students.length === 0) return null;

    const qLower = clean.toLowerCase();
    const matched = students.filter((s: any) => {
      const sId = (s.id || "").toLowerCase();
      const sRoll = (s.board_roll_no || s.college_no || "").toLowerCase();
      const sName = (s.full_name || "").toLowerCase();
      const sFather = (s.father_name || "").toLowerCase();
      const sPhone = (s.contact || "").replace(/\D/g, "");
      const qDigits = qLower.replace(/\D/g, "");

      return sId === qLower || 
             sRoll === qLower || 
             sId.endsWith(qLower) || 
             sName === qLower ||
             (qLower.length >= 3 && (sName.includes(qLower) || qLower.includes(sName))) ||
             (qLower.length >= 4 && (sFather.includes(qLower) || qLower.includes(sFather))) ||
             (qDigits.length >= 7 && sPhone.includes(qDigits));
    });

    if (matched.length === 0) return null;

    if (matched.length === 1) {
      const st = matched[0];
      const totalPkg = Number(st.total_package || st.total_fee_finalized || 0);
      const paid = Number(st.fee_received || 0);
      const dues = Math.max(0, totalPkg - paid);

      return `👤 *STUDENT ACADEMIC & FINANCIAL DOSSIER*
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Name:* *${st.full_name}*
• *Father:* ${st.father_name}
• *Student ID / Roll:* *${st.id}*
• *Program & Section:* ${st.category || st.group || "Inter"} — *${st.section || "A"}*
• *Session:* ${st.session || "2026-28"}
• *Student Mobile:* ${st.contact || "N/A"}
• *Father Mobile:* ${st.father_contact || st.secondary_contact || st.contact || "N/A"}
• *Address:* ${st.address || "Jahanian"}

💰 *Fee & Balance Ledger:*
• Total Fee Package: *Rs. ${totalPkg.toLocaleString()}*
• Total Paid So Far: *Rs. ${paid.toLocaleString()}*
• Outstanding Balance: *Rs. ${dues.toLocaleString()}* ${dues > 0 ? "⚠️ (Pending)" : "✅ (Cleared)"}
━━━━━━━━━━━━━━━━━━━━━━━━━
_Authorized Faculty Access_`;
    }

    const list = matched.slice(0, 5).map((s: any, idx: number) => {
      return `${idx + 1}. *${s.full_name}* s/o ${s.father_name} (Roll: *${s.id}*, Sec: ${s.section || "A"})`;
    });

    return `🔍 *Multiple Students Matched (${matched.length}):*\n\n${list.join("\n")}\n\nBaraye meherbani specific Roll Number (maslan: *${matched[0].id}*) likh kar reply karein.`;
  }

  public async getInstitutionalReport(supabase: any, adminName: string): Promise<string> {
    const { data: students } = await supabase.from("students").select("id, category, group, total_package, fee_received");
    const totalStudents = students?.length || 0;
    
    let boysCount = 0;
    let girlsCount = 0;
    let totalFeeRecoverable = 0;
    let totalFeeReceived = 0;
    let defaultersCount = 0;

    for (const s of (students || [])) {
      const pkg = Number(s.total_package || 0);
      const paid = Number(s.fee_received || 0);
      totalFeeRecoverable += pkg;
      totalFeeReceived += paid;
      if (pkg > paid) defaultersCount++;

      const cat = (s.category || "").toLowerCase();
      if (cat.includes("boys") || cat.includes("boy") || cat.includes("male")) {
        boysCount++;
      } else if (cat.includes("girls") || cat.includes("girl") || cat.includes("female")) {
        girlsCount++;
      } else {
        boysCount++;
      }
    }

    const currentYearMonth = new Date().toISOString().slice(0, 7);
    const { data: incomes } = await supabase.from("income").select("amount, date");
    
    let monthCollection = 0;
    for (const inc of (incomes || [])) {
      if ((inc.date || "").startsWith(currentYearMonth)) {
        monthCollection += Number(inc.amount || 0);
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: staffAtt } = await supabase
      .from("staff_attendance")
      .select("status")
      .eq("date", today);
    
    const presentStaff = (staffAtt || []).filter((a: any) => a.status === "Present").length;
    const absentStaff = (staffAtt || []).filter((a: any) => a.status === "Absent").length;

    return `🏛️ *SUPERIOR GROUP OF COLLEGES JAHANIAN*
📊 *Executive Institutional Briefing*
Executive: *${adminName}*
Date: *${new Date().toLocaleDateString('en-GB')}*
━━━━━━━━━━━━━━━━━━━━━━━━━
👥 *Student Enrolment Strength:*
   • Total Enrolled: *${totalStudents} Students*
   • Boys Campus: *${boysCount}*
   • Girls Campus: *${girlsCount}*

💰 *Financial Ledger Summary:*
   • Current Month Collection (${currentYearMonth}): *Rs. ${monthCollection.toLocaleString()}*
   • Total Active Defaulters: *${defaultersCount} Students*
   • Outstanding Dues Balance: *Rs. ${(totalFeeRecoverable - totalFeeReceived).toLocaleString()}*

📋 *Staff Attendance Today (${today}):*
   • Present Faculty: *${presentStaff}*
   • Absent Faculty: *${absentStaff}*
━━━━━━━━━━━━━━━━━━━━━━━━━
_Realtime College Management System (LMS)_`;
  }

  public async getStaffPersonalSummary(supabase: any, staffId: string, staffName: string): Promise<string> {
    const { data: staff } = await supabase.from("staff").select("*").eq("id", staffId).maybeSingle();
    const { data: advances } = await supabase.from("staff_advances").select("*").eq("staff_id", staffId);
    let totalAdvance = 0;
    let remainingAdvance = 0;
    for (const adv of (advances || [])) {
      totalAdvance += Number(adv.amount || 0);
      remainingAdvance += Number(adv.remaining_balance || 0);
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: att } = await supabase
      .from("staff_attendance")
      .select("status, date")
      .eq("staff_id", staffId)
      .ilike("date", `${currentMonth}%`);

    const present = (att || []).filter((a: any) => a.status === "Present").length;
    const late = (att || []).filter((a: any) => a.status === "Late").length;
    const absent = (att || []).filter((a: any) => a.status === "Absent").length;

    return `📋 *PERSONAL FACULTY PROFILE & ATTENDANCE*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Name:* ${staff?.full_name || staffName}
🏷️ *Role:* ${staff?.role || "Faculty"} (ID: *${staffId}*)
💰 *Base Salary:* Rs. ${(staff?.salary || staff?.base_salary || 0).toLocaleString()}

📅 *Monthly Attendance (${currentMonth}):*
• Present Days: *${present}*
• Late Arrivals: *${late}*
• Absents: *${absent}*

💳 *Salary Advance Account:*
• Total Advanced: Rs. ${totalAdvance.toLocaleString()}
• Remaining Balance: *Rs. ${remainingAdvance.toLocaleString()}*
━━━━━━━━━━━━━━━━━━━━━━━━━
_Superior College Staff Portal_`;
  }

  public getStatus(): WhatsAppStatus {
    return {
      status: this.status,
      qrCode: this.qrCode,
      connectedPhone: this.connectedPhone,
      connectedName: this.connectedName,
      connectedAt: this.connectedAt,
      lastError: this.lastError,
    };
  }

  public async init(forceFresh: boolean = false): Promise<WhatsAppStatus> {
    if (this.isInitializing) {
      return this.getStatus();
    }

    if (forceFresh) {
      await this.disconnect();
    }

    this.isInitializing = true;
    this.status = "connecting";
    this.lastError = null;

    try {
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      this.sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Superior College Jahanian ERP", "Chrome", "3.0.0"],
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCode = await QRCode.toDataURL(qr, {
              width: 320,
              margin: 2,
              color: {
                dark: "#053d38",
                light: "#ffffff",
              },
            });
            this.status = "qr_ready";
            console.log("[WhatsApp Bridge] Generated fresh QR code for linking device.");
          } catch (qrErr: any) {
            console.error("[WhatsApp Bridge] Failed to render QR code image:", qrErr);
            this.lastError = qrErr.message;
          }
        }

        if (connection === "open") {
          this.status = "connected";
          this.qrCode = null;
          this.reconnectAttempts = 0;
          this.connectedAt = new Date().toISOString();

          // Extract phone number from WhatsApp ID
          const userJid = this.sock?.user?.id || "";
          const rawNum = userJid.split(":")[0]?.split("@")[0] || "";
          this.connectedPhone = rawNum ? `+${rawNum}` : "+92 300 0000000";
          this.connectedName = this.sock?.user?.name || "Superior College Host Gateway";

          console.log(`[WhatsApp Bridge] Successfully connected to WhatsApp as ${this.connectedPhone} (${this.connectedName})`);
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[WhatsApp Bridge] Connection closed. Reason code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

          if (statusCode === DisconnectReason.loggedOut) {
            this.cleanAuthDir();
            this.status = "disconnected";
            this.qrCode = null;
            this.connectedPhone = null;
            this.connectedName = null;
          } else if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(5000 * this.reconnectAttempts, 20000);
            console.log(`[WhatsApp Bridge] Reconnecting in ${delay / 1000}s (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
              this.isInitializing = false;
              this.init(false);
            }, delay);
          } else {
            this.status = "disconnected";
            this.qrCode = null;
          }
        }
      });

      // Listen for incoming WhatsApp messages for the 360° Student Assistant Bot
      this.sock.ev.on("messages.upsert", async (m: any) => {
        try {
          if (!this.isBotEnabled) return;
          const messages = m.messages || [];
          for (const msg of messages) {
            if (!msg.message || msg.key.fromMe) continue;
            
            const rawJid = msg.key.remoteJid || "";
            // Ignore status broadcasts, group chats, newsletters, channels
            if (
              !rawJid ||
              rawJid === "status@broadcast" ||
              rawJid.endsWith("@broadcast") ||
              rawJid.endsWith("@g.us") ||
              rawJid.endsWith("@newsletter") ||
              rawJid.startsWith("120363")
            ) {
              continue;
            }

            const text = (
              msg.message.conversation ||
              msg.message.extendedTextMessage?.text ||
              msg.message.imageMessage?.caption ||
              ""
            ).trim();

            if (!text) continue;

            // Resolve true phone number (Pakistani / International MSISDN)
            const realPhone = await this.resolvePhoneNumber(rawJid, msg.key);
            console.log(`[WhatsApp Bot] Incoming message from ${rawJid} (Resolved Phone: ${realPhone}, PushName: ${msg.pushName || "N/A"}): "${text}"`);
            await this.handleIncomingBotQuery(rawJid, text, realPhone, msg.pushName);
          }
        } catch (botErr: any) {
          console.error("[WhatsApp Bot] Error in message listener:", botErr);
        }
      });

      return this.getStatus();
    } catch (err: any) {
      console.error("[WhatsApp Bridge] Initialization error:", err);
      this.status = "disconnected";
      this.lastError = err.message;
      return this.getStatus();
    } finally {
      this.isInitializing = false;
    }
  }

  // Toggle Bot Status
  public setBotEnabled(enabled: boolean) {
    this.isBotEnabled = enabled;
  }

  public getBotEnabled(): boolean {
    return this.isBotEnabled;
  }

  public getBotStats() {
    let verifiedCount = 0;
    for (const session of this.sessionState.values()) {
      if (session.stage === "VERIFIED") verifiedCount++;
    }

    return {
      enabled: this.isBotEnabled,
      persona: "Superior Nexus",
      gender: "Female AI Assistant",
      model: "Gemini 2.5 Flash",
      totalQueriesProcessed: this.botQueriesProcessed,
      activeSessions: this.sessionState.size,
      verifiedSessions: verifiedCount,
      recentLogs: this.botActivityLogs.slice(-100),
      timestamp: new Date().toISOString(),
    };
  }

  private logBotActivity(sender: string, query: string, replyType: string) {
    this.botQueriesProcessed++;
    const entry = {
      timestamp: new Date().toISOString(),
      sender,
      query,
      replyType,
    };
    this.botActivityLogs.push(entry);
    if (this.botActivityLogs.length > 100) {
      this.botActivityLogs.shift();
    }
  }

  private getGeminiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return null;
    try {
      return new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (e) {
      console.warn("[WhatsApp Bot] Could not init GoogleGenAI:", e);
      return null;
    }
  }

  // Set of common Pakistani titles, surnames, and generic names that cannot satisfy verification alone
  private static readonly COMMON_NAMES_AND_SURNAMES = new Set([
    "muhammad", "mohammad", "mohd", "md", "syed", "mian", "rana", 
    "choudhary", "chaudhary", "choudhry", "ch", "malik", "sheikh", 
    "khan", "ahmad", "ahmed", "ali", "shah", "butt", "bhatti", 
    "gujjar", "jutt", "jat", "bajwa", "cheema", "warraich", "qureshi", 
    "ansari", "rehman", "hassan", "hussain", "zia", "deen", "din", "khanum", "bibi"
  ]);

  private async generateAiConversationalReply(
    userMessage: string,
    history: Array<{ role: "user" | "model"; text: string }>,
    fallbackResponse: string,
    customSystemInstruction?: string
  ): Promise<string> {
    const ai = this.getGeminiClient();
    if (!ai) return fallbackResponse;

    try {
      const systemInstruction = customSystemInstruction || `You are Superior Nexus, the official female AI Virtual Assistant of Superior Group of Colleges Jahanian (SGC-J).
Identity & Persona:
- Name: Superior Nexus.
- Gender / Persona: Female AI Assistant.
- When speaking in Roman Urdu / Hinglish, ALWAYS use female grammatical forms: say "karti hoon", "bata sakti hoon", "dekh sakti hoon", "hazir hoon", "meri koshish hai" (NEVER male forms like "karta hoon").
- Strictly DO NOT use archaic or overly formal royal court words like "Mohtaram", "Janab", "Janab-e-Aali", or "Binte/Farzand". Speak respectfully, warmly, modernly, and naturally (e.g. "Aap", "Dear", or address them directly).
- Salam Rule: ONLY include a Salam greeting (like "Assalam-o-Alaikum" or "Walaikum Assalam") if the user explicitly greeted you with Salam in their current message. Otherwise, jump directly to answering helpfully.
- ChatGPT Intelligence: You can answer ANY question intelligently, accurately, and helpfully, just like ChatGPT:
  * College information (admissions 2026-28, programs, fee policies, timetable, transport, campus address).
  * Academic subjects: physics, chemistry, biology, mathematics, computer science, English grammar, essays.
  * Writing requests: applications for leave/concession, study plans, essays, apology letters.
  * General knowledge, career guidance, motivation, everyday questions.
- Even if a question is NOT related to college, give a smart, crisp, polite answer directly, just like ChatGPT.
- Tone: Crisp, helpful, articulate, professional, concise (2-4 sentences or short neat bullet points when needed).
- Language: Reply in the language the user messages in (Roman Urdu / Hinglish or English).

College Key Info:
- Institution: Superior Group of Colleges Jahanian (SGC-J).
- Programs: Intermediate 2026-28 (FSc Pre-Medical, FSc Pre-Engineering, ICS, I.Com, FA IT).
- Location: Khanewal Road, Jahanian.
- Helpline / Inquiries: 0301-4455891.
- Timings: Mon-Sat 08:00 AM - 02:00 PM.
- Separate purpose-built campuses for Boys and Girls.
- Student Privacy: If sensitive personal student records (dues, marks, attendance) are requested, remind them that verification (Student Name + Father Name, or Roll Number) is required.`;

      const contents: any[] = [];
      for (const h of history.slice(-6)) {
        contents.push({
          role: h.role,
          parts: [{ text: h.text }],
        });
      }
      contents.push({
        role: "user",
        parts: [{ text: userMessage }],
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text?.trim();
      if (reply) return reply;
    } catch (err: any) {
      console.warn("[WhatsApp Bot Gemini] Fallback used due to:", err?.message || err);
    }
    return fallbackResponse;
  }

  // Helper to extract candidate keywords (names, identifiers) from text
  private extractCandidateKeywords(text: string): string[] {
    const stopWords = new Set([
      // Fees & financial terms
      "fee", "fees", "dues", "status", "baqaya", "paisa", "paise", "rupay", "installment", "ledger", "challan", "package", "balance",
      // Academic terms
      "marks", "mark", "result", "test", "exam", "exams", "paper", "number", "score", "grades",
      "attendance", "attend", "hazri", "hazir", "ghair", "absent", "chutti", "din", "leave",
      // Common conversational verbs & filler words in Roman Urdu
      "chahiye", "chahye", "batao", "bata", "dein", "den", "batayein", "bataen", "sunao", "kya", "kia", "hai", "hain", "hay", "hoon", "hun", "tha", "thi", "the",
      "salam", "assalam", "walaikum", "aoa", "slam", "slm", "hi", "hello", "hey",
      // Student & identity generic terms
      "student", "bacha", "bache", "larka", "larki", "beti", "beta", "roll", "number", "id", "admission", "dakhla",
      // Pronouns, prepositions & conjunctions (Roman Urdu variations)
      "ka", "ki", "ke", "ko", "se", "par", "pe", "mein", "main", "me", "men",
      "mera", "meri", "mere", "meray", "apna", "apni", "apne", "apnay",
      "mujhe", "mjhe", "mujay", "mujhy", "mje", "humein", "humain", "hamain", "hum", "ham", "hamara", "hamari",
      "aap", "ap", "aapka", "aapki", "aapke", "tum", "tumhara",
      "uska", "uski", "uske", "uskay", "unka", "unki", "unke", "is", "iss", "us", "uss",
      "karna", "karo", "karein", "karen", "kar", "krna", "kro", "janna", "janni", "jan'na", "jan", "jana",
      "dekhna", "dekhni", "dekho", "check", "details", "info", "information", "record",
      "bhejo", "bhejna", "bhej", "send", "give", "share",
      "naam", "name", "walid", "father", "section", "sec", "class", "group", "college", "superior", "jahanian",
      "please", "plz", "sir", "madam", "bhai", "admin", "desk", "zara", "kitni", "kitna", "kitne", "kab", "kahan", "kaise", "kese",
      "bhi", "to", "toh", "aur", "or", "kuch", "koi", "ye", "yeh", "wo", "woh"
    ]);

    const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    const words = clean.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w) && !/^\d+$/.test(w));
    return words;
  }

  // Format admission row as student object
  private formatAdmissionAsStudent(a: any) {
    return {
      id: a.student_id || a.id,
      full_name: a.full_name,
      father_name: a.father_name,
      college_no: a.college_no || "N/A",
      group: a.group_name || a.group || a.category,
      section: a.section,
      total_package: a.total_package || a.total_fee_finalized || 0,
      fee_received: a.fee_received || 0,
      academic_part: a.academic_part || "Part-I",
      session: a.session || "2026-28",
      contact: a.contact_number || a.father_contact || a.secondary_contact || "",
      bay_form_no: a.bay_form_no || "",
      attendance_present: 0,
      attendance_absent: 0,
    };
  }

  // Multi-attribute Candidate Lookup (Search by Roll, Phone, Student Name, Father Name, Section)
  private async findStudentCandidate(
    supabase: any,
    text: string,
    rawNumber: string,
    explicitRoll?: string
  ): Promise<{ candidate?: any; multipleMatches?: any[]; matchedBy?: string }> {
    // 1. Search by Explicit Roll / Student ID
    if (explicitRoll) {
      const { data: byRoll } = await supabase
        .from("students")
        .select("*")
        .or(`college_no.ilike.%${explicitRoll}%,id.ilike.%${explicitRoll}%`)
        .limit(1);
      if (byRoll && byRoll.length > 0) {
        return { candidate: byRoll[0], matchedBy: "roll" };
      }
      const { data: byRollAdm } = await supabase
        .from("admissions")
        .select("*")
        .or(`college_no.ilike.%${explicitRoll}%,student_id.ilike.%${explicitRoll}%,id.ilike.%${explicitRoll}%`)
        .limit(1);
      if (byRollAdm && byRollAdm.length > 0) {
        return { candidate: this.formatAdmissionAsStudent(byRollAdm[0]), matchedBy: "roll" };
      }
    }

    // 2. Search by Explicit Phone Number provided in message text (e.g. 03001234567 or 923001234567)
    const phoneInTextMatch = text.replace(/[-\s]/g, "").match(/(?:03|923|\+923)[0-9]{9}/);
    if (phoneInTextMatch) {
      const phoneDigits = phoneInTextMatch[0].replace(/\D/g, "");
      const strippedPhone = phoneDigits.startsWith("92") ? phoneDigits.slice(2) : phoneDigits.startsWith("0") ? phoneDigits.slice(1) : phoneDigits;
      const last7 = phoneDigits.slice(-7);
      const hyphenated = `0${strippedPhone.slice(0, 3)}-${last7}`;
      
      const { data: byPhoneText } = await supabase
        .from("students")
        .select("*")
        .or(`contact.ilike.%${last7}%,contact.ilike.%${strippedPhone}%,contact.ilike.%${hyphenated}%`)
        .limit(1);
      if (byPhoneText && byPhoneText.length > 0) {
        return { candidate: byPhoneText[0], matchedBy: "phone_text" };
      }
      const { data: byPhoneTextAdm } = await supabase
        .from("admissions")
        .select("*")
        .or(`contact_number.ilike.%${last7}%,contact_number.ilike.%${strippedPhone}%,contact_number.ilike.%${hyphenated}%,father_contact.ilike.%${last7}%,father_contact.ilike.%${strippedPhone}%`)
        .limit(1);
      if (byPhoneTextAdm && byPhoneTextAdm.length > 0) {
        return { candidate: this.formatAdmissionAsStudent(byPhoneTextAdm[0]), matchedBy: "phone_text" };
      }
    }

    // 3. Search by Sender's WhatsApp Phone Number
    if (rawNumber && rawNumber.length >= 7) {
      const phoneDigits = rawNumber.replace(/\D/g, "");
      const strippedSender = phoneDigits.startsWith("92") ? phoneDigits.slice(2) : phoneDigits.startsWith("0") ? phoneDigits.slice(1) : phoneDigits;
      const last7 = phoneDigits.slice(-7);
      const hyphenated = `0${strippedSender.slice(0, 3)}-${last7}`;

      const { data: bySender } = await supabase
        .from("students")
        .select("*")
        .or(`contact.ilike.%${last7}%,contact.ilike.%${strippedSender}%,contact.ilike.%${hyphenated}%`)
        .limit(1);
      if (bySender && bySender.length > 0) {
        return { candidate: bySender[0], matchedBy: "sender_phone" };
      }
      const { data: bySenderAdm } = await supabase
        .from("admissions")
        .select("*")
        .or(`contact_number.ilike.%${last7}%,contact_number.ilike.%${strippedSender}%,contact_number.ilike.%${hyphenated}%,father_contact.ilike.%${last7}%,father_contact.ilike.%${strippedSender}%`)
        .limit(1);
      if (bySenderAdm && bySenderAdm.length > 0) {
        return { candidate: this.formatAdmissionAsStudent(bySenderAdm[0]), matchedBy: "sender_phone" };
      }
    }

    // 4. Search by Candidate Keywords (Student Name / Father Name / Section)
    const keywords = this.extractCandidateKeywords(text);
    if (keywords.length > 0) {
      // Step 4A: If user supplied multiple words (e.g. "ahmad khattak"), search for ALL keywords in full_name
      if (keywords.length >= 2) {
        let multiQuery = supabase.from("students").select("*");
        for (const kw of keywords) {
          multiQuery = multiQuery.ilike("full_name", `%${kw}%`);
        }
        const { data: byAllKw } = await multiQuery.limit(5);
        if (byAllKw && byAllKw.length === 1) {
          return { candidate: byAllKw[0], matchedBy: "all_name_keywords" };
        }
        if (byAllKw && byAllKw.length > 1) {
          return { multipleMatches: byAllKw, matchedBy: "multiple_full_name" };
        }

        // Check admissions table for all keywords
        let multiAdmQuery = supabase.from("admissions").select("*");
        for (const kw of keywords) {
          multiAdmQuery = multiAdmQuery.ilike("full_name", `%${kw}%`);
        }
        const { data: byAllAdmKw } = await multiAdmQuery.limit(5);
        if (byAllAdmKw && byAllAdmKw.length === 1) {
          return { candidate: this.formatAdmissionAsStudent(byAllAdmKw[0]), matchedBy: "admission_all_keywords" };
        }
        if (byAllAdmKw && byAllAdmKw.length > 1) {
          return { 
            multipleMatches: byAllAdmKw.map((a: any) => this.formatAdmissionAsStudent(a)), 
            matchedBy: "multiple_admission_matches" 
          };
        }

        // Step 4B: Cross search - Check if one keyword matches full_name and another matches father_name
        for (let i = 0; i < keywords.length; i++) {
          const nameKw = keywords[i];
          const otherKws = keywords.filter((_, idx) => idx !== i);
          for (const otherKw of otherKws) {
            const { data: crossMatch } = await supabase
              .from("students")
              .select("*")
              .ilike("full_name", `%${nameKw}%`)
              .ilike("father_name", `%${otherKw}%`)
              .limit(3);
            if (crossMatch && crossMatch.length === 1) {
              return { candidate: crossMatch[0], matchedBy: "name_and_father_cross" };
            }
          }
        }
      }

      // Step 4C: Combined full query check
      const queryStr = keywords.join(" ");
      const { data: byFullName } = await supabase
        .from("students")
        .select("*")
        .ilike("full_name", `%${queryStr}%`)
        .limit(5);

      if (byFullName && byFullName.length === 1) {
        return { candidate: byFullName[0], matchedBy: "full_name" };
      }
      if (byFullName && byFullName.length > 1) {
        return { multipleMatches: byFullName, matchedBy: "multiple_full_name" };
      }

      // Step 4D: Search with distinctive individual keywords (exclude generic names & common surnames)
      for (const kw of keywords) {
        if (WhatsAppBridgeService.COMMON_NAMES_AND_SURNAMES.has(kw)) continue;
        const { data: byKw } = await supabase
          .from("students")
          .select("*")
          .or(`full_name.ilike.%${kw}%,father_name.ilike.%${kw}%`)
          .limit(5);

        if (byKw && byKw.length === 1) {
          return { candidate: byKw[0], matchedBy: "name_keyword" };
        }
        if (byKw && byKw.length > 1) {
          const narrowed = byKw.filter((st: any) => {
            const fName = (st.father_name || "").toLowerCase();
            const sec = (st.section || "").toLowerCase();
            return keywords.some((otherKw: string) => otherKw !== kw && (fName.includes(otherKw) || sec.includes(otherKw)));
          });
          if (narrowed.length === 1) {
            return { candidate: narrowed[0], matchedBy: "name_and_father_or_section" };
          }
          return { multipleMatches: byKw, matchedBy: "multiple_keyword_matches" };
        }
      }

      // Check admissions table if not found in active students with distinctive keywords
      for (const kw of keywords) {
        if (WhatsAppBridgeService.COMMON_NAMES_AND_SURNAMES.has(kw)) continue;
        const { data: byAdmKw } = await supabase
          .from("admissions")
          .select("*")
          .or(`full_name.ilike.%${kw}%,father_name.ilike.%${kw}%`)
          .limit(5);

        if (byAdmKw && byAdmKw.length === 1) {
          return { candidate: this.formatAdmissionAsStudent(byAdmKw[0]), matchedBy: "admission_keyword" };
        }
        if (byAdmKw && byAdmKw.length > 1) {
          return { 
            multipleMatches: byAdmKw.map((a: any) => this.formatAdmissionAsStudent(a)), 
            matchedBy: "multiple_admission_matches" 
          };
        }
      }
    }

    return {};
  }

  // Multi-attribute Verification Evaluator: Satisfies verification using Name, Father, Section, Phone, Roll
  private evaluateVerificationCredentials(
    candidate: any,
    text: string,
    rawNumber: string,
    explicitRoll?: string
  ): {
    isSatisfied: boolean;
    nameMatched: boolean;
    fatherMatched: boolean;
    sectionMatched: boolean;
    phoneMatched: boolean;
    rollMatched: boolean;
    bayMatched: boolean;
    score: number;
    matchedReasons: string[];
    isPhoneVerified: boolean;
  } {
    const cleanInput = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    const inputWords = cleanInput.split(/\s+/).filter(w => w.length >= 2);
    const inputDigits = text.replace(/\D/g, "");

    const expName = (candidate.full_name || "").toLowerCase().trim();
    const expFather = (candidate.father_name || "").toLowerCase().trim();
    const expRoll = String(candidate.college_no || candidate.id || "").toLowerCase().trim();
    const expSection = (candidate.section || "").toLowerCase().trim();
    const expGroup = (candidate.group || candidate.category || "").toLowerCase().trim();
    const expBayForm = String(candidate.bay_form_no || "").replace(/\D/g, "");

    // 1. Phone Match: Check sender phone against candidate contact
    const strippedSender = rawNumber ? (rawNumber.startsWith("92") ? rawNumber.slice(2) : rawNumber.startsWith("0") ? rawNumber.slice(1) : rawNumber) : "";
    const candidateContact = (candidate.contact || candidate.contact_number || candidate.father_contact || "").replace(/\D/g, "");
    const strippedCandidate = candidateContact.startsWith("92") ? candidateContact.slice(2) : candidateContact.startsWith("0") ? candidateContact.slice(1) : candidateContact;
    
    // Sender phone matches registered contact
    const isSenderPhoneMatch = Boolean(strippedSender && strippedCandidate && (strippedCandidate.includes(strippedSender) || strippedSender.includes(strippedCandidate)));
    
    // User explicitly entered candidate's registered phone in message text
    const isPhoneInTextMatch = Boolean(strippedCandidate && inputDigits.length >= 7 && strippedCandidate.includes(inputDigits.slice(-7)));
    
    const phoneMatched = isSenderPhoneMatch || isPhoneInTextMatch;
    const isPhoneVerified = isSenderPhoneMatch;

    // 2. Student Name Match (check non-generic name tokens)
    const nameTokens = expName.split(/\s+/).filter(t => t.length >= 2);
    const distinctNameTokens = nameTokens.filter(t => !WhatsAppBridgeService.COMMON_NAMES_AND_SURNAMES.has(t));
    let nameMatched = false;
    if (distinctNameTokens.length > 0) {
      nameMatched = distinctNameTokens.some(t => inputWords.includes(t) || cleanInput.includes(t));
    } else {
      if (cleanInput.includes(expName) || expName.includes(cleanInput)) {
        nameMatched = true;
      } else {
        const matchedTokens = nameTokens.filter(t => inputWords.includes(t));
        if (matchedTokens.length >= 2) nameMatched = true;
      }
    }

    // 3. Father Name Match (Strict: common surnames alone NEVER match!)
    const fatherTokens = expFather.split(/\s+/).filter(t => t.length >= 2);
    const distinctFatherTokens = fatherTokens.filter(t => !WhatsAppBridgeService.COMMON_NAMES_AND_SURNAMES.has(t));
    let fatherMatched = false;
    if (distinctFatherTokens.length > 0) {
      // Must match at least one distinctive father token (e.g. "Pervez" in "Pervez Khan")
      fatherMatched = distinctFatherTokens.some(t => inputWords.includes(t) || cleanInput.includes(t));
    } else {
      // Only common names exist (e.g. "Muhammad Ali Khan"): must match full name or at least 2 tokens
      if (cleanInput.includes(expFather) || expFather.includes(cleanInput)) {
        fatherMatched = true;
      } else {
        const matchedTokens = fatherTokens.filter(t => inputWords.includes(t));
        if (matchedTokens.length >= 2) fatherMatched = true;
      }
    }

    // 4. Section / Group Match
    let sectionMatched = false;
    if (expSection && expSection.length >= 2) {
      const secWords = expSection.split(/[^a-z0-9]+/i).filter(w => w.length >= 2);
      const isWordMatch = secWords.some(w => inputWords.includes(w) || cleanInput.includes(w));
      if (cleanInput.includes(expSection) || expSection.includes(cleanInput) || isWordMatch) {
        sectionMatched = true;
      }
    }
    if (!sectionMatched && expGroup) {
      const grpWords = expGroup.split(/[^a-z0-9]+/i).filter(w => w.length >= 2);
      const isGrpWordMatch = grpWords.some(w => inputWords.includes(w) || cleanInput.includes(w));
      if (cleanInput.includes(expGroup) || expGroup.includes(cleanInput) || isGrpWordMatch) {
        sectionMatched = true;
      } else if (expGroup.includes("pre-medical") || expGroup.includes("medical")) {
        sectionMatched = cleanInput.includes("medical") || cleanInput.includes("fsc");
      } else if (expGroup.includes("engineering")) {
        sectionMatched = cleanInput.includes("engineering") || cleanInput.includes("pre eng");
      } else if (expGroup.includes("ics") || expGroup.includes("computer")) {
        sectionMatched = cleanInput.includes("ics") || cleanInput.includes("computer");
      } else if (expGroup.includes("icom") || expGroup.includes("commerce")) {
        sectionMatched = cleanInput.includes("icom") || cleanInput.includes("commerce");
      }
    }

    // 5. Roll Number / College No Match
    let rollMatched = false;
    if (explicitRoll && (expRoll.includes(explicitRoll) || explicitRoll.includes(expRoll))) {
      rollMatched = true;
    } else {
      const matchRollInText = inputDigits && expRoll.replace(/\D/g, "") && inputDigits.includes(expRoll.replace(/\D/g, ""));
      if (matchRollInText) rollMatched = true;
    }

    // 6. B-Form / CNIC Match
    const bayMatched = Boolean(expBayForm && expBayForm.length >= 4 && inputDigits.includes(expBayForm.slice(-4)));

    // Calculate Satisfaction Score & Reasons
    const matchedReasons: string[] = [];
    let score = 0;
    if (rollMatched) { score += 2; matchedReasons.push("Roll Number / Student ID"); }
    if (bayMatched) { score += 2; matchedReasons.push("B-Form / CNIC"); }
    if (nameMatched) { score += 1; matchedReasons.push("Student Name"); }
    if (fatherMatched) { score += 1; matchedReasons.push("Father Name"); }
    if (sectionMatched) { score += 1; matchedReasons.push("Class Section / Program"); }
    if (isPhoneInTextMatch) { score += 1.5; matchedReasons.push("Registered Mobile Number"); }

    let isSatisfied = false;

    if (isPhoneVerified) {
      // Registered SIM: Message is sent directly from the registered mobile number in database
      // ANY 1 matching attribute satisfies verification completely!
      if (nameMatched || fatherMatched || sectionMatched || rollMatched || bayMatched || score >= 1) {
        isSatisfied = true;
      }
    } else {
      // Unverified SIM / Unknown Number:
      // STRICT VERIFICATION to protect student privacy:
      // - Roll Number + Name/Father/Section
      // - OR Name + Father Name
      // - OR Name + Section
      // - OR Father Name + Section
      // - OR Registered Mobile Number + Name/Father/Section
      // - OR B-Form / CNIC
      if (rollMatched && (nameMatched || fatherMatched || sectionMatched)) {
        isSatisfied = true;
      } else if (nameMatched && fatherMatched) {
        isSatisfied = true;
      } else if (nameMatched && sectionMatched) {
        isSatisfied = true;
      } else if (fatherMatched && sectionMatched) {
        isSatisfied = true;
      } else if (isPhoneInTextMatch && (nameMatched || fatherMatched || sectionMatched)) {
        isSatisfied = true;
      } else if (bayMatched) {
        isSatisfied = true;
      }
    }

    return {
      isSatisfied,
      nameMatched,
      fatherMatched,
      sectionMatched,
      phoneMatched,
      rollMatched,
      bayMatched,
      score,
      matchedReasons,
      isPhoneVerified,
    };
  }

  // 360° Comprehensive Human-like Conversational Student Inquiry Handler with Verification
  public async handleIncomingBotQuery(
    senderJid: string, 
    text: string, 
    actualPhone?: string,
    pushName?: string
  ): Promise<string> {
    const rawNumber = actualPhone || await this.resolvePhoneNumber(senderJid);
    const cleanQuery = text.toLowerCase().trim();

    // Log incoming message with true phone number and sender's WhatsApp name
    this.saveChatLog({
      phone: rawNumber,
      senderName: pushName || undefined,
      direction: "incoming",
      text: text,
    });

    // Setup Supabase Client
    let supabase: any = null;
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const url = process.env.VITE_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (url && key) {
        supabase = createClient(url, key, { auth: { persistSession: false } });
      }
    } catch (dbInitErr) {
      console.error("[WhatsApp Bot] Could not init Supabase:", dbInitErr);
    }

    if (!supabase) {
      const errReply = "Assalam-o-Alaikum! Superior College Jahanian Information Desk par khush-amdeed.\n\nHumara college database is waqt thora masroof hai. Baraye meherbani thori der baad dobara koshish karein ya seedha college office se rabta farmayein:\n📞 *0301-4455891*";
      if (this.sock) await this.sock.sendMessage(senderJid, { text: errReply });
      this.saveChatLog({
        phone: rawNumber,
        direction: "outgoing",
        text: errReply,
      });
      return errReply;
    }

    // Retrieve or initialize sender session state
    let session = this.sessionState.get(rawNumber);
    const now = Date.now();
    // Reset session after 30 minutes of inactivity
    if (!session || (now - session.lastActive > 30 * 60 * 1000)) {
      session = {
        stage: "IDLE",
        lastActive: now,
        history: [],
      };
      this.sessionState.set(rawNumber, session);
    }
    if (!session.history) session.history = [];
    session.lastActive = now;

    // Helper to send and log a reply
    const sendReply = async (replyText: string, logType: string, verifiedStudentName?: string) => {
      let finalReply = replyText;

      const userSaidSalam = 
        cleanQuery.includes("salam") || 
        cleanQuery.includes("assalam") || 
        cleanQuery.includes("aoa") || 
        cleanQuery === "slam" || 
        cleanQuery === "slm";

      // Salam Rule: Only send Salam on the 1st message of a session, OR if user explicitly greeted with Salam now.
      if (session!.salamSent && !userSaidSalam) {
        // Strip any leading Salam greeting
        finalReply = finalReply
          .replace(/^(Assalam-o-Alaikum[!.,\s🌸🏛️]*\n*|Walaikum Assalam[!.,\s🌸🏛️]*\n*)/i, "")
          .trim();
      }

      if (!session!.salamSent) {
        session!.salamSent = true;
      }

      this.logBotActivity(rawNumber, text, logType);
      session!.history?.push({ role: "user", text });
      session!.history?.push({ role: "model", text: finalReply });
      if (session!.history && session!.history.length > 10) {
        session!.history = session!.history.slice(-10);
      }

      this.saveChatLog({
        phone: rawNumber,
        direction: "outgoing",
        text: finalReply,
        verifiedStudent: verifiedStudentName || (session!.verifiedStudent ? session!.verifiedStudent.full_name : undefined),
      });
      if (this.sock) {
        await this.sock.sendMessage(senderJid, { text: finalReply });
      }
      return finalReply;
    };

    // Sync verified users from Supabase
    await this.syncVerifiedUsersWithSupabase(supabase);
    const standardPhone = this.normalizePhoneNumber(rawNumber);

    // ─── A. CHECK PENDING OTP VERIFICATION ───
    const pendingOtp = this.pendingOTPs.get(standardPhone);
    if (pendingOtp) {
      const cleanDigits = cleanQuery.replace(/\D/g, "");
      const isDigitsCode = cleanDigits.length === 4;

      if (Date.now() > pendingOtp.expiresAt) {
        this.pendingOTPs.delete(standardPhone);
        const expMsg = "⏳ Aapka 4-digit verification code expire ho chuka hai (5 minutes exceeded).\n\nNaya verification code hasil karne ke liye dobara *login* likhein ya apna Staff ID bhej dein.";
        return await sendReply(expMsg, "OTP Expired");
      }

      if (isDigitsCode) {
        if (cleanDigits === pendingOtp.code) {
          // SUCCESS! Verify and bind number permanently
          const verified: VerifiedUser = {
            phone: standardPhone,
            role: pendingOtp.candidate.role,
            staffId: pendingOtp.candidate.staffId,
            name: pendingOtp.candidate.name,
            email: pendingOtp.candidate.email,
            designation: pendingOtp.candidate.designation,
            linkedAt: new Date().toISOString(),
          };
          this.verifiedUsers.set(standardPhone, verified);
          await this.saveVerifiedUsers(supabase);
          this.pendingOTPs.delete(standardPhone);

          const isLeader = verified.role === "Principal" || verified.role === "Admin" || verified.role === "Director" || !!verified.email;
          const welcomeMsg = 
`✅ *TASDEEQ KAMYAB (VERIFICATION COMPLETED)*
━━━━━━━━━━━━━━━━━━━━━━━━━
Khush-amdeed Mohtaram *${verified.name}*!
🏷️ *Role / Designation:* ${verified.designation || verified.role} ${verified.staffId ? `(${verified.staffId})` : ""}
📱 *Linked WhatsApp:* ${standardPhone}

🎉 Mubarik ho! Aapka WhatsApp number permanently register ho chuka hai. Ab aapko dobara kabhi OTP ki zaroorat nahi paregi.

Aap seedha yeh maloomat hasil kar sakte hain:
📅 *1. Mera Timetable* (Aaj ya kisi bhi din ka lecture schedule)
🔍 *2. Student Inquiry* (Kisi bhi student ka Name ya Roll No likhein)
${isLeader ? `📊 *3. Institutional Overview* (Total strength, collection, staff attendance)\n` : `📋 *3. Meri Attendance & Salary Advance*\n`}
🚪 *4. Logout / Unlink*

_Tip: Aap seedha likh sakte hain: "Mera aaj ka timetable kya hai?" ya "Student SGC-26-419 ka fee status dikhao"._`;
          return await sendReply(welcomeMsg, "OTP Verification Succeeded", verified.name);
        } else {
          pendingOtp.attempts = (pendingOtp.attempts || 0) + 1;
          if (pendingOtp.attempts >= 3) {
            this.pendingOTPs.delete(standardPhone);
            const failMsg = "❌ *3 Martaba Ghalat OTP!* Security policy ke tehat yeh verification cancel kar di gayi hai. Dobara koshish ke liye *login* likhein.";
            return await sendReply(failMsg, "OTP Attempts Exceeded");
          } else {
            const retryMsg = `❌ *Ghalat Verification Code!* Baraye meherbani 4-digit code dobara check karke likhein.\n\n⚠️ Baqaya koshishein: *${3 - pendingOtp.attempts}*`;
            return await sendReply(retryMsg, "OTP Code Mismatch");
          }
        }
      }
    }

    // ─── B. CHECK IF SENDER IS AN ALREADY VERIFIED USER ───
    const verifiedUser = this.verifiedUsers.get(standardPhone);
    if (verifiedUser) {
      // 1. Logout / Unlink
      if (cleanQuery === "logout" || cleanQuery === "unlink" || cleanQuery === "signout" || cleanQuery === "4" || cleanQuery.startsWith("4.")) {
        this.verifiedUsers.delete(standardPhone);
        await this.saveVerifiedUsers(supabase);
        const logoutMsg = `🚪 *SESSION LOGOUT / UNLINKED*\n━━━━━━━━━━━━━━━━━━━━━━━━━\nAapka WhatsApp number (${standardPhone}) Mohtaram *${verifiedUser.name}* ke profile se kamyab tareeqay se unlink kar diya gaya hai.\n\nAgli martaba access karne ke liye aapko dobara 4-digit OTP ke zariye verify hona hoga.`;
        return await sendReply(logoutMsg, "Faculty Unlinked");
      }

      // 2. Menu Request
      if (cleanQuery === "menu" || cleanQuery === "help" || cleanQuery === "options" || cleanQuery === "0" || cleanQuery === "shuru") {
        const menuMsg = this.getFacultyMenuText(verifiedUser);
        return await sendReply(menuMsg, "Faculty Menu Displayed", verifiedUser.name);
      }

      // 3. Timetable / Lecture Schedule
      const isTimetableQuery = 
        cleanQuery === "1" || 
        cleanQuery.startsWith("1.") || 
        cleanQuery.includes("timetable") || 
        cleanQuery.includes("time table") || 
        cleanQuery.includes("lecture") || 
        cleanQuery.includes("classes") || 
        cleanQuery.includes("schedule") ||
        cleanQuery.includes("aaj ki class");

      if (isTimetableQuery && verifiedUser.staffId) {
        let queryDay: string | undefined = undefined;
        const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        const urduDays: Record<string, string> = {
          "somwar": "Monday",
          "mangal": "Tuesday",
          "budh": "Wednesday",
          "jumerat": "Thursday",
          "jumma": "Friday",
          "hafta": "Saturday",
          "itwar": "Sunday",
          "aaj": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()],
          "kal": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][(new Date().getDay() + 1) % 7]
        };
        for (const d of days) {
          if (cleanQuery.includes(d)) {
            queryDay = d.charAt(0).toUpperCase() + d.slice(1);
            break;
          }
        }
        if (!queryDay) {
          for (const [uDay, engDay] of Object.entries(urduDays)) {
            if (cleanQuery.includes(uDay)) {
              queryDay = engDay;
              break;
            }
          }
        }

        const timetableText = await this.getTeacherTimetable(supabase, verifiedUser.staffId, verifiedUser.name, queryDay);
        return await sendReply(timetableText, "Teacher Timetable Reply", verifiedUser.name);
      }

      // 4. Institutional Overview (for Principal / Admin) or Personal Summary (for Teacher)
      const isLeader = verifiedUser.role === "Principal" || verifiedUser.role === "Admin" || verifiedUser.role === "Director" || !!verifiedUser.email;
      const isInstQuery = 
        cleanQuery === "3" || 
        cleanQuery.startsWith("3.") ||
        cleanQuery.includes("total student") || 
        cleanQuery.includes("strength") || 
        cleanQuery.includes("collection") || 
        cleanQuery.includes("fee collection") || 
        cleanQuery.includes("defaulter") || 
        cleanQuery.includes("staff attendance") ||
        cleanQuery.includes("meri attendance") ||
        cleanQuery.includes("advance");

      if (isInstQuery) {
        if (isLeader) {
          const reportText = await this.getInstitutionalReport(supabase, verifiedUser.name);
          return await sendReply(reportText, "Executive Institutional Report", verifiedUser.name);
        } else {
          const personalSummary = await this.getStaffPersonalSummary(supabase, verifiedUser.staffId || "", verifiedUser.name);
          return await sendReply(personalSummary, "Staff Personal Summary", verifiedUser.name);
        }
      }

      // 5. Student Query by Teacher / Principal (Look up student dossier)
      const dossier = await this.getTeacherStudentDossier(supabase, text);
      if (dossier) {
        return await sendReply(dossier, "Faculty Student Dossier", verifiedUser.name);
      }

      // 6. Conversational AI fallback with Faculty awareness
      const facultySystemPrompt = `You are Superior Nexus, the intelligent executive AI assistant for Superior Group of Colleges Jahanian.
You are currently speaking directly with a verified faculty / administrative authority:
Name: ${verifiedUser.name}
Role: ${verifiedUser.designation || verifiedUser.role}
Staff ID: ${verifiedUser.staffId || "Administrative Staff"}

Respond with high professional respect (polite Urdu / English / Hinglish). Answer accurately regarding college procedures, students, lecture scheduling, or policies.`;
      const aiReply = await this.generateAiConversationalReply(text, session.history || [], "", facultySystemPrompt);
      return await sendReply(aiReply, "Faculty Conversational AI", verifiedUser.name);
    }

    // ─── C. CHECK IF UNVERIFIED SENDER IS REQUESTING FACULTY / ADMIN LOGIN ───
    const isStaffLoginTrigger = 
      cleanQuery.includes("staff") || 
      cleanQuery.includes("teacher") || 
      cleanQuery.includes("principal") || 
      cleanQuery.includes("principle") || 
      cleanQuery.includes("admin") || 
      cleanQuery.includes("login") || 
      cleanQuery.includes("timetable") || 
      cleanQuery.includes("lecture") || 
      cleanQuery.startsWith("sgc-t-") || 
      cleanQuery.startsWith("stf-");

    let matchedCandidate: any = null;
    try {
      const { data: staffList } = await supabase.from("staff").select("*");
      if (staffList && staffList.length > 0) {
        // First check by phone number
        matchedCandidate = staffList.find((st: any) => {
          const stPhone = this.normalizePhoneNumber(st.contact);
          return stPhone && stPhone === standardPhone;
        });

        // If not matched by phone, but user entered a query that might contain Staff ID or Name
        if (!matchedCandidate && isStaffLoginTrigger) {
          matchedCandidate = staffList.find((st: any) => {
            const stId = (st.id || "").toLowerCase();
            const stName = (st.full_name || "").toLowerCase();
            return stId === cleanQuery || cleanQuery.includes(stId) || (stName.length > 3 && cleanQuery.includes(stName));
          });
        }
      }

      // If still not matched, check permissions table for admins
      if (!matchedCandidate && isStaffLoginTrigger) {
        const { data: perms } = await supabase.from("permissions").select("*");
        if (perms && perms.length > 0) {
          const matchedPerm = perms.find((p: any) => {
            const dName = (p.display_name || "").toLowerCase();
            const email = (p.email || "").toLowerCase();
            return dName === cleanQuery || cleanQuery.includes(dName) || email === cleanQuery;
          });
          if (matchedPerm) {
            matchedCandidate = {
              id: `ADM-${matchedPerm.id.slice(0, 4)}`,
              full_name: matchedPerm.display_name || "System Admin",
              role: matchedPerm.is_admin ? "Principal" : "Admin",
              contact: standardPhone,
              designation: matchedPerm.is_admin ? "Principal / Super Admin" : "Sub Admin",
              email: matchedPerm.email
            };
          }
        }
      }
    } catch (searchErr) {
      console.warn("[WhatsApp Bot] Error checking staff candidates:", searchErr);
    }

    if (matchedCandidate && isStaffLoginTrigger) {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const candidatePhone = this.normalizePhoneNumber(matchedCandidate.contact || standardPhone);

      this.pendingOTPs.set(standardPhone, {
        code: otp,
        phone: standardPhone,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
        registeredPhone: candidatePhone,
        candidate: {
          role: matchedCandidate.role || "Faculty",
          staffId: matchedCandidate.id,
          name: matchedCandidate.full_name,
          designation: matchedCandidate.designation || matchedCandidate.role,
          email: matchedCandidate.email,
          contact: candidatePhone
        }
      });

      const otpMsg = 
`🔒 *SUPERIOR COLLEGE JAHANIAN — SECURITY VERIFICATION*
━━━━━━━━━━━━━━━━━━━━━━━━━
Khush-amdeed *${matchedCandidate.full_name}*!
🏷️ *Role:* ${matchedCandidate.role || "Faculty Member"} ${matchedCandidate.id ? `(${matchedCandidate.id})` : ""}

Aapki identity tasdeeq ke liye 4-digit verification code hai:
🔢 *${otp}*

⚠️ Yeh code aglay *5 minute* ke liye valid hai.
Baraye meherbani yeh 4-digit code isi chat mein reply karein.

_(Kamyab tasdeeq ke baad aapka WhatsApp number permanent link ho jayega aur dobara kabhi OTP nahi mangi jayegi)._`;

      await sendReply(otpMsg, "Faculty OTP Dispatched", matchedCandidate.full_name);

      if (candidatePhone && candidatePhone !== standardPhone) {
        await this.sendMessage(candidatePhone, otpMsg);
      }
      return otpMsg;
    }

    // 1. Reset / Restart Session
    if (cleanQuery === "reset" || cleanQuery === "restart" || cleanQuery === "cancel" || cleanQuery === "wapis") {
      session.stage = "IDLE";
      session.candidateStudent = undefined;
      session.candidateStudents = undefined;
      session.accumulatedMatches = undefined;
      session.verifiedStudent = undefined;
      session.pendingIntent = undefined;
      session.failedVerificationAttempts = 0;
      session.targetStudentQuery = undefined;
      session.history = [];
      const resetMsg = "🔄 Session reset ho chuki hai. Main *Superior Nexus* hoon. Kahiye, main aapki kya madad kar sakti hoon? Aap kisi student ka Naam, Walid ka Naam, Class Section (maslan: MEPB), ya Roll Number likh sakte hain, ya koi bhi general sawal pooch sakte hain.";
      return await sendReply(resetMsg, "Session Reset");
    }

    // 2. Explicit Menu Request (0, menu, options, help)
    const isExplicitMenu = 
      cleanQuery === "0" ||
      cleanQuery === "menu" ||
      cleanQuery === "options" ||
      cleanQuery === "help" ||
      cleanQuery === "shuru" ||
      cleanQuery === "start" ||
      cleanQuery === "menu dikhao";

    if (isExplicitMenu) {
      const menuText = this.getMainMenuText(session.verifiedStudent ? session.verifiedStudent.full_name : undefined);
      return await sendReply(menuText, "Main Menu Displayed");
    }

    // 3. Natural Human Greetings Detection (Emulates authentic, intelligent conversation)
    const isHiGreeting = 
      /^(hi+|hey+|hy|hlo)(\s+.*)?$/i.test(cleanQuery) || 
      cleanQuery === "hi" || 
      cleanQuery === "hii" || 
      cleanQuery === "hiii" || 
      cleanQuery === "hey" || 
      cleanQuery === "heyy";

    const isHelloGreeting = 
      /^(hello+|helo+)(\s+.*)?$/i.test(cleanQuery) || 
      cleanQuery === "hello" || 
      cleanQuery === "helo";

    const isSalamGreeting = 
      cleanQuery.includes("salam") || 
      cleanQuery.includes("assalam") || 
      cleanQuery.includes("aoa") || 
      cleanQuery === "slam" || 
      cleanQuery === "slm";

    const isHalAhwalGreeting = 
      cleanQuery.includes("kese ho") || 
      cleanQuery.includes("kaise ho") || 
      cleanQuery.includes("kaise hain") || 
      cleanQuery.includes("kia hal") || 
      cleanQuery.includes("kya hal") || 
      cleanQuery.includes("sunao") || 
      cleanQuery.includes("theek ho") || 
      cleanQuery.includes("how are you");

    const isGoodTimeGreeting = 
      cleanQuery.includes("good morning") || 
      cleanQuery.includes("good afternoon") || 
      cleanQuery.includes("good evening") || 
      cleanQuery.includes("subah bakhair");

    if (isHiGreeting || isHelloGreeting || isSalamGreeting || isHalAhwalGreeting || isGoodTimeGreeting) {
      let baseGreetingReply = "";
      if (isSalamGreeting) {
        baseGreetingReply = "Walaikum Assalam! Main *Superior Nexus* hoon, Superior Group of Colleges Jahanian ki official AI Virtual Assistant. 🌸 Kahiye, admissions, fees, exam results, attendance ya kisi bhi academic sawal ke silsilay mein main aapki kya madad kar sakti hoon?";
      } else if (isHiGreeting || isHelloGreeting) {
        baseGreetingReply = "Hello! Welcome to Superior Group of Colleges Jahanian. I am *Superior Nexus*, your official AI Assistant. 🌸 How may I assist you today regarding admissions, fee records, exam results, or academic queries?";
      } else if (isHalAhwalGreeting) {
        baseGreetingReply = "Alhamdolillah, main theek hoon, shukriya! 🌸 Main Superior Nexus hoon. Kahiye aaj academic ya administrative silsilay mein aapko kya maloomat darkaar hain?";
      } else {
        baseGreetingReply = "Good day! Superior Group of Colleges Jahanian mein khush-amdeed. Main *Superior Nexus* hoon. 🌸 Kahiye aaj main aapki kya madad kar sakti hoon?";
      }

      const reply = await this.generateAiConversationalReply(text, session.history || [], baseGreetingReply);
      return await sendReply(reply, "Conversational Greeting");
    }

    // 4. Inquiries about Bot Identity / College Helpdesk
    const isIntroQuery = 
      cleanQuery.includes("who are you") || 
      cleanQuery.includes("kon ho") || 
      cleanQuery.includes("kaun ho") || 
      cleanQuery.includes("naam kya") ||
      cleanQuery.includes("kis ka number") || 
      cleanQuery.includes("kia krte ho") || 
      cleanQuery.includes("kya karte ho");

    if (isIntroQuery) {
      const baseIntro = "Main *Superior Nexus* hoon, Superior Group of Colleges Jahanian ki official AI Virtual Assistant. 🌸 Main aapko admissions, fee balance, imtehani results, attendance aur kisi bhi general ya academic sawal ka fori aur verified jawab dene ke liye hazir hoon. Kahiye aapko kis hawalay se rehnumai darkaar hai?";
      const reply = await this.generateAiConversationalReply(text, session.history || [], baseIntro);
      return await sendReply(reply, "Intro Inquiry");
    }

    // 5. Inquiries about Admissions & Programs
    const isAdmissionQuery = 
      cleanQuery.includes("admission") || 
      cleanQuery.includes("dakhla") || 
      cleanQuery.includes("fsc") || 
      cleanQuery.includes("ics") || 
      cleanQuery.includes("icom") || 
      cleanQuery.includes("fa it") || 
      cleanQuery.includes("seats") || 
      cleanQuery.includes("session") || 
      cleanQuery.includes("scholarship");

    if (isAdmissionQuery) {
      const baseAdmission = 
`🏛️ *SUPERIOR GROUP OF COLLEGES JAHANIAN*
📢 *Admissions Open — Session 2026-28*
━━━━━━━━━━━━━━━━━━━━━━━━━
Intermediate ke darj zail programs mein admissions jari hain:
• *FSc:* Pre-Medical & Pre-Engineering
• *ICS:* Computer Science (Physics / Stats)
• *Commerce & Arts:* I.Com & FA IT

✨ *Key Highlights:*
• Separate Purpose-built Boys & Girls Campuses
• State-of-the-art Science & IT Computer Labs
• Special Merit & Need-based Scholarships (Up to 100%)
• Safe College Transport Pick & Drop

📍 *Campus Address:* Khanewal Road, Jahanian
📞 *Admissions Helpline:* 0301-4455891
_Directorate of Admissions, SGC Jahanian_`;
      const reply = await this.generateAiConversationalReply(text, session.history || [], baseAdmission);
      return await sendReply(reply, "Admission Inquiry");
    }

    // 6. Option 4: Campus Information & Timings
    const isCampusInfo = 
      cleanQuery === "4" || 
      cleanQuery.startsWith("4.") || 
      cleanQuery.includes("timing") || 
      cleanQuery.includes("address") || 
      cleanQuery.includes("pata") || 
      cleanQuery.includes("location") || 
      cleanQuery.includes("kahan hy") || 
      cleanQuery.includes("kahan hai");

    if (isCampusInfo) {
      return await sendReply(this.getCampusInfoText(), "Campus Info");
    }

    // 7. Option 5: Helpline / Principal Desk
    const isHelpline = 
      cleanQuery === "5" || 
      cleanQuery.startsWith("5.") || 
      cleanQuery.includes("helpline") || 
      cleanQuery.includes("principal") || 
      cleanQuery.includes("phone number") || 
      cleanQuery.includes("contact number") || 
      cleanQuery.includes("rabta");

    if (isHelpline) {
      return await sendReply(this.getHelplineText(), "Helpline Rabta");
    }

    // 8. Detect Numerical or Keyword Intent (Fee = 1, Marks = 2, Attendance = 3, All = General)
    const isFeeQuery = cleanQuery === "1" || cleanQuery.startsWith("1.") || cleanQuery.includes("fee") || cleanQuery.includes("dues") || cleanQuery.includes("baqaya") || cleanQuery.includes("paisa") || cleanQuery.includes("fees") || cleanQuery.includes("installment");
    const isMarksQuery = cleanQuery === "2" || cleanQuery.startsWith("2.") || cleanQuery.includes("mark") || cleanQuery.includes("result") || cleanQuery.includes("test") || cleanQuery.includes("exam") || cleanQuery.includes("number") || cleanQuery.includes("score");
    const isAttendanceQuery = cleanQuery === "3" || cleanQuery.startsWith("3.") || cleanQuery.includes("attend") || cleanQuery.includes("hazir") || cleanQuery.includes("ghair") || cleanQuery.includes("chutti") || cleanQuery.includes("absent") || cleanQuery.includes("hazri");
    const isAllQuery = cleanQuery.includes("all") || cleanQuery.includes("report") || cleanQuery.includes("performance") || cleanQuery.includes("record");

    if (isFeeQuery) session.pendingIntent = "fee";
    else if (isMarksQuery) session.pendingIntent = "marks";
    else if (isAttendanceQuery) session.pendingIntent = "attendance";
    else if (isAllQuery) session.pendingIntent = "general";

    // 9. Extract Roll Number or Student ID from text if present
    let explicitRoll = "";
    const rollMatch = text.match(/\b([0-9]{3,6})\b/);
    if (rollMatch) {
      explicitRoll = rollMatch[1];
    }

    // 10. If user is ALREADY VERIFIED in this session:
    if (session.stage === "VERIFIED" && session.verifiedStudent) {
      const currentIntent = isFeeQuery ? "fee" : isMarksQuery ? "marks" : isAttendanceQuery ? "attendance" : (session.pendingIntent || "general");
      const detailsMsg = await this.buildStudentReply(supabase, session.verifiedStudent, currentIntent);
      return await sendReply(detailsMsg, `Verified Query (${currentIntent})`, session.verifiedStudent.full_name);
    }

    // 11. VERIFICATION STAGE (AWAITING_VERIFICATION):
    if (session.stage === "AWAITING_VERIFICATION") {
      // Case A: Multiple candidates were previously found (e.g. 2 students named Ali)
      if (session.candidateStudents && session.candidateStudents.length > 1) {
        const narrowed = session.candidateStudents.filter((st: any) => {
          const evalResult = this.evaluateVerificationCredentials(st, text, rawNumber, explicitRoll);
          return evalResult.fatherMatched || evalResult.sectionMatched || evalResult.phoneMatched || evalResult.rollMatched;
        });

        if (narrowed.length === 1) {
          session.stage = "VERIFIED";
          session.verifiedStudent = narrowed[0];
          session.candidateStudent = undefined;
          session.candidateStudents = undefined;
          session.failedVerificationAttempts = 0;

          const successGreeting = 
`Shukriya! Aapki tasdeeq (Verification) kamyab ho chuki hai. ✅ (Student Name + Section/Father)
Hum *${session.verifiedStudent.full_name}* (Walid: ${session.verifiedStudent.father_name}, Sec: ${session.verifiedStudent.section || "A"}) ka official record share kar rahe hain:`;

          const detailsMsg = await this.buildStudentReply(supabase, session.verifiedStudent, session.pendingIntent || "general");
          const combined = `${successGreeting}\n\n${detailsMsg}`;
          return await sendReply(combined, `Verified Reply (${session.pendingIntent || "general"})`, session.verifiedStudent.full_name);
        } else if (narrowed.length > 1) {
          session.candidateStudents = narrowed;
          const multiplePrompt = 
`Record mein abhi bhi 1 se zyada students match ho rahe hain. ⚠️
Baraye meherbani student ka Class Section (maslan: MEPB ya ICS) ya College mein register Mobile Number likh kar reply karein:`;
          return await sendReply(multiplePrompt, "Multiple Matches Narrowing Prompt");
        } else {
          session.failedVerificationAttempts = (session.failedVerificationAttempts || 0) + 1;
          if (session.failedVerificationAttempts >= 2) {
            session.stage = "IDLE";
            session.candidateStudent = undefined;
            session.candidateStudents = undefined;
            session.failedVerificationAttempts = 0;
            const stopMsg = 
`Maazrat! Faraham karda maloomat database record se match nahi ho saki. 🔒
Student privacy aur security policy ke tehat yeh verification stop kar di gayi hai. Agar aapko mazeed maloomat darkaar hon to college helpline *0301-4455891* par rabta karein ya naye sawal ke liye *menu* likhein.`;
            return await sendReply(stopMsg, "Verification Aborted (Multiple Failed)");
          }

          const tryAgainPrompt = 
`Aapka faraham karda record pichlay student name se match nahi ho saka. ⚠️
Baraye meherbani student ke Walid ka Naam (Father Name) ya Class Section (maslan: MEPB ya ICS) dobara likh kar reply farmayein:`;
          return await sendReply(tryAgainPrompt, "Narrowing Failed Prompt");
        }
      }

      // Case B: Single Candidate Evaluation
      if (session.candidateStudent) {
        const candidate = session.candidateStudent;
        const evalResult = this.evaluateVerificationCredentials(candidate, text, rawNumber, explicitRoll);

        if (!session.accumulatedMatches) session.accumulatedMatches = {};
        if (evalResult.nameMatched) session.accumulatedMatches.name = true;
        if (evalResult.fatherMatched) session.accumulatedMatches.father = true;
        if (evalResult.sectionMatched) session.accumulatedMatches.section = true;
        if (evalResult.phoneMatched) session.accumulatedMatches.phone = true;
        if (evalResult.rollMatched) session.accumulatedMatches.roll = true;
        if (evalResult.bayMatched) session.accumulatedMatches.bay = true;

        const acc = session.accumulatedMatches;
        let isAccumulatedSatisfied = evalResult.isSatisfied;

        if (evalResult.isPhoneVerified) {
          if (acc.name || acc.father || acc.section || acc.roll || acc.bay) {
            isAccumulatedSatisfied = true;
          }
        } else {
          if (acc.roll && (acc.name || acc.father || acc.section)) isAccumulatedSatisfied = true;
          else if (acc.name && acc.father) isAccumulatedSatisfied = true;
          else if (acc.name && acc.section) isAccumulatedSatisfied = true;
          else if (acc.father && acc.section) isAccumulatedSatisfied = true;
          else if (acc.phone && (acc.name || acc.father || acc.section)) isAccumulatedSatisfied = true;
          else if (acc.bay) isAccumulatedSatisfied = true;
        }

        if (isAccumulatedSatisfied) {
          // Verification Succeeded!
          session.stage = "VERIFIED";
          session.verifiedStudent = candidate;
          session.candidateStudent = undefined;
          session.candidateStudents = undefined;
          session.accumulatedMatches = undefined;
          session.failedVerificationAttempts = 0;

          const matchedLabels: string[] = [];
          if (acc.name) matchedLabels.push("Student Name");
          if (acc.father) matchedLabels.push("Father Name");
          if (acc.section) matchedLabels.push("Class Section");
          if (acc.phone) matchedLabels.push("Mobile Number");
          if (acc.roll) matchedLabels.push("Roll Number");
          if (acc.bay) matchedLabels.push("B-Form");
          const verificationReasonStr = matchedLabels.length > 0 ? ` (${matchedLabels.join(" + ")})` : "";

          const successGreeting = 
`Shukriya! Aapki tasdeeq (Verification) kamyab ho chuki hai. ✅${verificationReasonStr}
Hum *${session.verifiedStudent.full_name}* (Walid: ${session.verifiedStudent.father_name}, Sec: ${session.verifiedStudent.section || "A"}) ka official record share kar rahe hain:`;

          const detailsMsg = await this.buildStudentReply(supabase, session.verifiedStudent, session.pendingIntent || "general");
          const combined = `${successGreeting}\n\n${detailsMsg}`;
          return await sendReply(combined, `Verified Reply (${session.pendingIntent || "general"})`, session.verifiedStudent.full_name);
        } else {
          // Verification did NOT match the candidate student!
          session.failedVerificationAttempts = (session.failedVerificationAttempts || 0) + 1;

          // Strict Security Check: If user enters mismatched data 2 times, stop conversation without leaking anything!
          if (session.failedVerificationAttempts >= 2) {
            session.stage = "IDLE";
            session.candidateStudent = undefined;
            session.candidateStudents = undefined;
            session.accumulatedMatches = undefined;
            session.failedVerificationAttempts = 0;
            const stopMsg = 
`Maazrat! Faraham karda maloomat student ke record se mutabiqat nahi rakhti. 🔒
Security aur privacy policies ke tehat hum kisi ghair-tasdeeq shuda fard ka data share nahi kar sakte.

Yeh verification session stop kar di gayi hai. Agar aapko koi maloomat darkaar hon to college office (*0301-4455891*) par rabta karein ya dobara shuru karne ke liye *reset* ya *menu* likhein.`;
            return await sendReply(stopMsg, "Verification Aborted (Security Stop)");
          }

          // Single friendly prompt on 1st failure
          if (evalResult.nameMatched || acc.name) {
            const needFatherOrSecMsg = 
`Shukriya! Student ka naam (*${candidate.full_name}*) hamare pas darj hai.
Student privacy policy ke tehat, mukammal tasdeeq ke liye baraye meherbani in mein se koi aik cheez darj farmayein:
• Walid ka Naam (Father Name)
• Class Section (maslan: MEPB ya ICS)
• College mein register Mobile Number`;
            return await sendReply(needFatherOrSecMsg, "Verification Partial - Need Father/Section");
          } else if (evalResult.fatherMatched || acc.father) {
            const needNameMsg = 
`Shukriya! Walid ka naam mil gaya hai.
Tasdeeq mukammal karne ke liye baraye meherbani *Student ka Mukammal Naam* ya *Class Section (maslan: MEPB)* likh kar reply farmayein:`;
            return await sendReply(needNameMsg, "Verification Partial - Need Student Name");
          } else {
            const failMsg = 
`Faraham karda maloomat student (*${candidate.full_name}*) ke record se match nahi ho saki. ⚠️
Student ki privacy aur security ke pesh-e-nazar, baraye meherbani sahi Walid ka Naam (Father's Name) ya Class Section (maslan: MEPB) likh kar reply karein:`;
            return await sendReply(failMsg, "Verification Mismatch Prompt");
          }
        }
      }
    }

    // 12. Candidate Lookup: Search by Roll, Phone in text, Sender Phone, or Student/Father Name
    const lookup = await this.findStudentCandidate(supabase, text, rawNumber, explicitRoll);

    // 13. If Multiple Candidates Match a generic keyword
    if (lookup.multipleMatches && lookup.multipleMatches.length > 1) {
      session.stage = "AWAITING_VERIFICATION";
      session.candidateStudents = lookup.multipleMatches;
      session.failedVerificationAttempts = 0;
      const multiMatchMsg = 
`Record mein is naam ke 1 se zyada students darj hain. ⚠️
Baraye meherbani student ke *Walid ka Naam (Father Name)* ya *Class Section (maslan: MEPB / ICS)* batayein taake sahi student ka record dhoondha ja sake:`;
      return await sendReply(multiMatchMsg, "Multiple Student Candidates Found");
    }

    // 14. If Candidate Found:
    if (lookup.candidate) {
      const candidate = lookup.candidate;
      const evalResult = this.evaluateVerificationCredentials(candidate, text, rawNumber, explicitRoll);

      // If credentials already satisfied in this query (e.g. User sent Name + Father Name, or Name + Section, or Roll Number, or registered phone + Name):
      if (evalResult.isSatisfied) {
        session.stage = "VERIFIED";
        session.verifiedStudent = candidate;
        session.candidateStudent = undefined;
        session.candidateStudents = undefined;
        session.accumulatedMatches = undefined;
        session.failedVerificationAttempts = 0;

        const verificationReasonStr = evalResult.matchedReasons.length > 0 
          ? ` (${evalResult.matchedReasons.join(" + ")})` 
          : "";

        const successGreeting = 
`Shukriya! Aapki tasdeeq (Verification) kamyab ho chuki hai. ✅${verificationReasonStr}
Hum *${candidate.full_name}* (Walid: ${candidate.father_name}, Sec: ${candidate.section || "A"}) ka official record share kar rahe hain:`;

        const detailsMsg = await this.buildStudentReply(supabase, candidate, session.pendingIntent || "general");
        const combined = `${successGreeting}\n\n${detailsMsg}`;
        return await sendReply(combined, `Direct Verified Reply`, candidate.full_name);
      }

      // If not yet fully satisfied, enter AWAITING_VERIFICATION stage:
      session.candidateStudent = candidate;
      session.stage = "AWAITING_VERIFICATION";
      session.failedVerificationAttempts = 0;
      session.accumulatedMatches = {
        name: evalResult.nameMatched,
        father: evalResult.fatherMatched,
        section: evalResult.sectionMatched,
        phone: evalResult.phoneMatched,
        roll: evalResult.rollMatched,
        bay: evalResult.bayMatched,
      };

      if (evalResult.isPhoneVerified) {
        // WhatsApp message originates from the registered contact number in database!
        const challengeMsg = 
`Superior Group of Colleges Jahanian mein khush-amdeed. 🌸

Aapka number hamare college record mein register shuda hai.
Student privacy aur security policy ke tehat, record dekhne ke liye tasdeeq zaroori hai.

🛡️ *Security Verification:*
Baraye meherbani in mein se koi aik cheez likh kar reply farmayein:
• Student ka Mukammal Naam (Student Name)
• Walid ka Naam (Father's Name)
• Class Section (maslan: MEPB ya ICS)
• Roll Number (agar yaad ho)`;
        return await sendReply(challengeMsg, "Verification Challenge Sent (Registered Phone)", `Pending (${candidate.full_name})`);
      } else {
        // Third-party SIM or unknown phone:
        const challengeMsg = 
`Superior Group of Colleges Jahanian Information Desk. 🏛️

Student (*${candidate.full_name}*) ka record dhoondh liya gaya hai.
Student privacy aur hifazat ke pesh-e-nazar, tasdeeq mukammal karne ke liye baraye meherbani in mein se koi cheez darj farmayein:
• Walid ka Naam (Father's Name)
• Class Section (maslan: MEPB ya ICS)
• College mein register Mobile Number
• Roll Number ya Student ID`;
        return await sendReply(challengeMsg, "Verification Challenge Sent (Unverified Phone)", `Pending (${candidate.full_name})`);
      }
    }

    // 15. If user asked explicitly for student record (fee, marks, attendance) but no student candidate matched yet:
    if (isFeeQuery || isMarksQuery || isAttendanceQuery || (isAllQuery && text.split(/\s+/).length <= 4)) {
      const intentName = isFeeQuery ? "Fee Status" : isMarksQuery ? "Exam Result" : isAttendanceQuery ? "Attendance" : "Record";
      const askForStudent = 
`🏛️ *SUPERIOR GROUP OF COLLEGES JAHANIAN*
🔒 *STUDENT RECORD INQUIRY*
━━━━━━━━━━━━━━━━━━━━━━━━━
Student ka *${intentName}* maloom karne ke liye, baraye meherbani darj zail mein se koi maloomat likhein:

• Student ka Mukammal Naam (Full Name)
• Roll Number ya Student ID
• Class Section (maslan: MEPB / ICS)
• Registered Mobile Number

_Verification ke foran baad official record faraham kar diya jayega._`;
      return await sendReply(askForStudent, "Ask Student Info For Query");
    }

    // 16. Default Fallback: Intelligent AI conversational response (Superior Nexus acts like ChatGPT for any question!)
    const fallbackMessage = 
      "Main *Superior Nexus* hoon, Superior Group of Colleges Jahanian ki AI Assistant. 🌸 Main admissions, fee records, results, timetables aur har qisam ke academic sawalat me aapki rehnumai ke liye hazir hoon. Kahiye, main aapki kya madad kar sakti hoon?";
    const conversationalReply = await this.generateAiConversationalReply(text, session.history || [], fallbackMessage);
    return await sendReply(conversationalReply, "Conversational AI Fallback");
  }

  // Helper: Interactive Main Menu
  public getMainMenuText(verifiedStudentName?: string): string {
    const verifiedHeader = verifiedStudentName
      ? `👤 *Verified Student:* ${verifiedStudentName}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      : "";

    return `🏛️ *SUPERIOR GROUP OF COLLEGES JAHANIAN*
🏢 *Student & Parent Helpdesk*
━━━━━━━━━━━━━━━━━━━━━━━━━
${verifiedHeader}Matlooba service ke liye number likh kar reply karein:

1️⃣ *Fee Status & Outstanding Balance* 💰
2️⃣ *Monthly Examination Marks & Results* 📊
3️⃣ *Daily Attendance & Punctuality* 📅
4️⃣ *Campus Information & Schedule* 📍
5️⃣ *Principal Office & Contact Desk* 📞

_Tip: Aap kisi bhi student ka Naam ya Roll Number direct likh kar bhi bhej sakte hain, ya koi bhi general sawal pooch sakte hain._`;
  }

  // Helper: Campus Info (Option 4)
  public getCampusInfoText(): string {
    return `🏛️ *SUPERIOR GROUP OF COLLEGES JAHANIAN*
📍 *Campus Information & Schedule*
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Location:* Khanewal Road, Jahanian
• *Office Timings:* 08:00 AM – 02:00 PM (Monday – Saturday)
• *Academic Setup:* Separate Purpose-Built Boys & Girls Campuses
• *Helpline:* 0301-4455891

━━━━━━━━━━━━━━━━━━━━━━━━━
🔢 Main Menu ke liye *0* likh kar reply karein.`;
  }

  // Helper: Helpline & Admin Support (Option 5)
  public getHelplineText(): string {
    return `🏛️ *SUPERIOR GROUP OF COLLEGES JAHANIAN*
📞 *Administration & Executive Contacts*
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Principal Office / Inquiries:* 0301-4455891
• *Accounts & Fee Section:* 0301-4455891
• *Visiting Hours:* 08:00 AM – 02:00 PM (Mon – Sat)
• *Address:* Khanewal Road, Jahanian

Admissions, fee concessions ya academic guidance ke liye campus office tashreef layen.
━━━━━━━━━━━━━━━━━━━━━━━━━
🔢 Main Menu ke liye *0* likh kar reply karein.`;
  }

  private getMenuFooter(): string {
    return `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n🔢 *Direct Quick Actions:*\n• Type *1* ➔ Fee Status 💰\n• Type *2* ➔ Exam Marks 📊\n• Type *3* ➔ Attendance 📅\n• Type *0* ➔ Main Menu 📋`;
  }

  // Helper to compile verified student data into a warm, polite human-like message
  private async buildStudentReply(supabase: any, student: any, intent: "fee" | "marks" | "attendance" | "general"): Promise<string> {
    const totalPkg = Number(student.total_package || 0);
    const received = Number(student.fee_received || 0);
    const dues = Math.max(0, totalPkg - received);

    let configuredUrl = process.env.APP_URL || process.env.VITE_APP_URL;
    if (!configuredUrl) {
      try {
        const { data: stg } = await supabase.from('settings').select('*').limit(1).maybeSingle();
        if (stg) {
          configuredUrl = stg.config?.portalUrl || stg.config?.appUrl || stg.portal_url || stg.app_url;
          if (!configuredUrl && stg.website) {
            if (stg.website.includes('superiorjhn.com')) {
              configuredUrl = 'https://portal.superiorjhn.com';
            } else {
              configuredUrl = stg.website.startsWith('http') ? stg.website : `https://${stg.website}`;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load portal URL from settings in whatsappBridge:', e);
      }
    }
    const baseUrl = (configuredUrl || 'https://portal.superiorjhn.com').replace(/\/+$/, '');
    const studentRef = encodeURIComponent(String(student.college_no || student.id || "").trim());

    if (intent === "fee") {
      const statementUrl = `${baseUrl}/?v=statement&id=${studentRef}`;
      return `🏛️ *SUPERIOR GROUP OF COLLEGES JAHANIAN*
💰 *OFFICIAL FEE LEDGER SUMMARY*
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Student Name:* ${student.full_name}
• *Father Name:* ${student.father_name}
• *Roll Number:* ${student.college_no || student.id}
• *Class / Group:* ${student.group || "Intermediate"} (Sec: ${student.section || "A"})
• *Session:* ${student.session || "2026-28"}
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Total Agreed Package:* Rs. ${totalPkg.toLocaleString()}
• *Total Fee Deposited:* Rs. ${received.toLocaleString()}
• *Outstanding Balance:* *Rs. ${dues.toLocaleString()}*
• *Account Status:* ${dues > 0 ? "⚠️ PENDING DUES" : "✅ ALL CLEARED"}
━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *Online Fee Statement / Ledger:*
${statementUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
${dues > 0 ? "⚠️ *Note:* Baraye meherbani aakhri tareekh se qabal accounts desk par baqaya fee jama karwa kar computerised receipt hasil karein.\n" : "🎉 Alhamdolillah, tamam dues mukammal tor par clear hain.\n"}📞 Accounts Desk: 0301-4455891
_Accounts & Finance Department, SGC Jahanian_${this.getMenuFooter()}`;
    }

    if (intent === "marks") {
      const { data: records } = await supabase
        .from("academic_records")
        .select("*")
        .eq("student_id", student.id)
        .order("date", { ascending: false })
        .limit(5);

      let marksText = "";
      if (records && records.length > 0) {
        marksText = records.map((r: any) => 
          `• *${r.subject}* (${r.test_name || "Assessment"}): ${r.obtained_marks || 0} / ${r.total_marks || 100} (${Math.round(((r.obtained_marks || 0) / (r.total_marks || 100)) * 100)}%)`
        ).join("\n");
      } else {
        marksText = "• Koi naya test record abhi tak portal par upload nahi hua.";
      }

      const resultUrl = `${baseUrl}/?v=result&id=${studentRef}`;

      return `🏛️ *SUPERIOR GROUP OF COLLEGES JAHANIAN*
📊 *OFFICIAL ACADEMIC ASSESSMENT REPORT*
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Student:* ${student.full_name} (${student.college_no || student.id})
• *Class:* ${student.group || "Intermediate"} (Sec: ${student.section || "A"})
• *Father:* ${student.father_name}
━━━━━━━━━━━━━━━━━━━━━━━━━
📝 *Recent Examination Results:*
${marksText}
━━━━━━━━━━━━━━━━━━━━━━━━━
📈 *Official Academic Result Card:*
${resultUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *Instruction:* Behtareen board results ke liye regular homework aur class revision par tawajjah dein.
📞 Academic Helpdesk: 0301-4455891
_Office of the Controller of Examinations, SGC Jahanian_${this.getMenuFooter()}`;
    }

    if (intent === "attendance") {
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: todayAtt } = await supabase
        .from("student_attendance")
        .select("status")
        .eq("student_id", student.id)
        .eq("date", todayStr)
        .maybeSingle();

      const todayStatus = todayAtt?.status ? todayAtt.status.toUpperCase() : "Marked in Progress";
      const attendanceUrl = `${baseUrl}/?v=attendance&id=${studentRef}`;

      return `🏛️ *SUPERIOR GROUP OF COLLEGES JAHANIAN*
📅 *ATTENDANCE & PUNCTUALITY NOTIFICATION*
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Student:* ${student.full_name} (${student.college_no || student.id})
• *Class:* ${student.group || "Intermediate"} (Sec: ${student.section || "A"})
• *Father:* ${student.father_name}
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Today's Status (${todayStr}):* ${todayStatus === "PRESENT" ? "✅ PRESENT (Hazir)" : todayStatus === "ABSENT" ? "🚨 ABSENT (Ghair Hazir)" : "🕒 " + todayStatus}
• *Total Present Days:* ${student.attendance_present || 0}
• *Total Absent Days:* ${student.attendance_absent || 0}
━━━━━━━━━━━━━━━━━━━━━━━━━
📅 *Classroom Attendance Dossier:*
${attendanceUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ _Board requirements ke mutabiq 80% haziri imtehanat mein shamil hone ke liye lazmi hai._
📞 Attendance Desk: 0301-4455891
_Office of the Vice Principal (Discipline), SGC Jahanian_${this.getMenuFooter()}`;
    }

    // Default: Complete 360 Progress Summary
    const { data: records } = await supabase
      .from("academic_records")
      .select("*")
      .eq("student_id", student.id)
      .order("date", { ascending: false })
      .limit(3);

    let marksBrief = "• Koi test record darj nahi hai.";
    if (records && records.length > 0) {
      marksBrief = records.map((r: any) => `• ${r.subject} (${r.test_name}): ${r.obtained_marks}/${r.total_marks}`).join("\n");
    }

    const dossierUrl = `${baseUrl}/?v=student&id=${studentRef}`;

    return `🏛️ *SUPERIOR GROUP OF COLLEGES JAHANIAN*
📋 *STUDENT 360° EXECUTIVE PROGRESS SUMMARY*
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Student Name:* ${student.full_name} (${student.college_no || student.id})
• *Class / Group:* ${student.group || "Intermediate"} (Sec: ${student.section || "A"})
• *Father Name:* ${student.father_name}
• *Session:* ${student.session || "2026-28"}
━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *FEE LEDGER:*
• Agreed Package: Rs. ${totalPkg.toLocaleString()}
• Paid Amount: Rs. ${received.toLocaleString()}
• Outstanding Balance: *Rs. ${dues.toLocaleString()}* (${dues === 0 ? "CLEAR ✅" : "PENDING ⚠️"})

📊 *LATEST TEST SCORES:*
${marksBrief}

📅 *ATTENDANCE RECORD:*
• Present: ${student.attendance_present || 0} din | Absent: ${student.attendance_absent || 0} din
━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *Complete Student Dossier:*
${dossierUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
📞 Campus Helpdesk: 0301-4455891
_Office of the Principal, SGC Jahanian_${this.getMenuFooter()}`;
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.sock) {
        try {
          await this.sock.logout();
        } catch {
          this.sock.end(undefined);
        }
        this.sock = null;
      }
    } catch (e) {
      console.warn("[WhatsApp Bridge] Error during socket closure:", e);
    }

    this.cleanAuthDir();
    this.status = "disconnected";
    this.qrCode = null;
    this.connectedPhone = null;
    this.connectedName = null;
    this.connectedAt = null;
    this.lastError = null;
  }

  private cleanAuthDir(): void {
    try {
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
        fs.mkdirSync(this.authDir, { recursive: true });
      }
    } catch (e) {
      console.warn("[WhatsApp Bridge] Error cleaning auth directory:", e);
    }
  }

  public normalizePhoneNumber(phone: string): string {
    if (!phone) return "";
    let cleaned = phone.replace(/[^\d+]/g, "");

    // Format local Pakistani numbers: 03001234567 -> 923001234567
    if (cleaned.startsWith("03")) {
      cleaned = "92" + cleaned.slice(1);
    } else if (cleaned.startsWith("+92")) {
      cleaned = cleaned.replace("+", "");
    } else if (cleaned.startsWith("92")) {
      // already good
    } else if (cleaned.startsWith("+")) {
      cleaned = cleaned.replace("+", "");
    }

    return cleaned;
  }

  public async sendMessage(
    phone: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.sock || this.status !== "connected") {
      return {
        success: false,
        error: "WhatsApp is not connected. Please scan the QR code first in WhatsApp Center.",
      };
    }

    const normalized = this.normalizePhoneNumber(phone);
    if (!normalized || normalized.length < 10) {
      return {
        success: false,
        error: `Invalid phone number format: '${phone}'. Required e.g. 0301-4455891 or 923014455891`,
      };
    }

    let jid = `${normalized}@s.whatsapp.net`;
    if (this.phoneToLidMap.has(normalized)) {
      jid = this.phoneToLidMap.get(normalized)!;
    }

    try {
      const sentMsg = await this.sock.sendMessage(jid, { text: message });
      this.saveChatLog({
        phone: normalized,
        direction: "outgoing",
        text: message,
      });
      return {
        success: true,
        messageId: sentMsg?.key?.id || `msg-${Date.now()}`,
      };
    } catch (err: any) {
      if (jid.endsWith("@lid")) {
        try {
          const fallbackJid = `${normalized}@s.whatsapp.net`;
          const sentMsg = await this.sock.sendMessage(fallbackJid, { text: message });
          this.saveChatLog({
            phone: normalized,
            direction: "outgoing",
            text: message,
          });
          return {
            success: true,
            messageId: sentMsg?.key?.id || `msg-${Date.now()}`,
          };
        } catch {}
      }
      console.error(`[WhatsApp Bridge] Failed to send message to ${jid}:`, err);
      return {
        success: false,
        error: err?.message || "Failed to deliver message through WhatsApp socket.",
      };
    }
  }

  public async sendBulk(
    items: Array<{ id: string; phone: string; name: string; message: string }>,
    delaySeconds: number = 3
  ): Promise<Array<{ id: string; success: boolean; error?: string; messageId?: string }>> {
    const results = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const res = await this.sendMessage(item.phone, item.message);
      results.push({
        id: item.id,
        success: res.success,
        error: res.error,
        messageId: res.messageId,
      });

      // Anti-ban random delay
      if (i < items.length - 1) {
        const jitter = (Math.random() * 2 - 1) * 1000;
        const actualDelay = Math.max(2000, delaySeconds * 1000 + jitter);
        await new Promise((r) => setTimeout(r, actualDelay));
      }
    }

    return results;
  }
}

export const whatsappBridge = new WhatsAppBridgeService();
