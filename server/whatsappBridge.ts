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

  constructor() {
    this.authDir = path.join(process.cwd(), ".whatsapp_auth");
    this.chatLogsFile = path.join(process.cwd(), ".whatsapp_chat_logs.json");
    if (!fs.existsSync(this.authDir)) {
      try {
        fs.mkdirSync(this.authDir, { recursive: true });
      } catch (e) {
        console.warn("[WhatsApp Bridge] Could not create auth directory:", e);
      }
    }
    this.loadLidMappings();
    this.loadChatLogs();
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
    return {
      enabled: this.isBotEnabled,
      totalQueriesProcessed: this.botQueriesProcessed,
      recentLogs: this.botActivityLogs.slice(-20),
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

  private async generateAiConversationalReply(
    userMessage: string,
    history: Array<{ role: "user" | "model"; text: string }>,
    fallbackResponse: string
  ): Promise<string> {
    const ai = this.getGeminiClient();
    if (!ai) return fallbackResponse;

    try {
      const systemInstruction = `You are an elite, highly professional Executive Academic Assistant at Superior Group of Colleges Jahanian (SGC-J).
Target Audience: Pakistani parents, students, and prospective applicants chatting on WhatsApp.
Tone & Persona: Dignified, courteous, refined, concise (maximum 2-3 sentences), and strictly to the point. Always address the user respectfully as 'Mohtaram Janab' or 'Sir/Madam'. You are an executive representative of the Principal Office.
Language: High-quality, polite Roman Urdu (or formal English if the user messages in English).

College Information:
- Institution: Superior Group of Colleges Jahanian (SGC-J).
- Programs: Intermediate Admissions 2026-28 (FSc Pre-Medical, FSc Pre-Engineering, ICS, I.Com, FA IT).
- Timings: Monday to Saturday: 08:00 AM to 01:30 PM (Office open till 02:00 PM). Sunday: Closed.
- Official Helpline: 0301-4455891.
- Campuses: Purpose-built separate Boys & Girls campuses on Khanewal Road, Jahanian.
- Student Privacy: If a user asks for sensitive records (fees, marks, attendance), concisely ask them for the student's Full Name or Roll Number so we can verify and retrieve the official record.

Guidelines:
1. Always keep responses brief, crisp, and to the point (no long rambling paragraphs).
2. Answer queries with immediate clarity, precision, and respectful warmth.
3. Never use slang, casual filler words, or excessive emojis.`;

      const contents: any[] = [];
      for (const h of history.slice(-4)) {
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
      "fee", "fees", "dues", "status", "baqaya", "paisa", "paise", "rupay", "installment",
      "marks", "mark", "result", "test", "exam", "exams", "paper", "number", "score",
      "attendance", "attend", "hazri", "hazir", "ghair", "absent", "chutti", "din",
      "chahiye", "batao", "bata", "dein", "batayein", "bataen", "sunao", "kya", "kia", "hai", "hain", "hoon", "tha",
      "salam", "assalam", "walaikum", "aoa", "slam", "slm", "hi", "hello", "hey",
      "student", "bacha", "bache", "larka", "larki", "beti", "beta", "roll", "number", "id", "admission",
      "ka", "ki", "ke", "ko", "se", "par", "pe", "mein", "main", "mera", "meri", "mere", "apna", "apni",
      "naam", "name", "walid", "father", "section", "sec", "class", "group", "college", "superior", "jahanian",
      "please", "plz", "sir", "madam", "bhai", "admin", "desk", "information", "record", "karo", "karna",
      "check", "details", "info", "mujhe", "humein", "hum", "aap", "tum"
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
      const queryStr = keywords.join(" ");
      // Try full query on full_name first
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

      // Try searching with individual keywords across full_name and father_name
      for (const kw of keywords) {
        if (["muhammad", "mohammad", "syed", "rana", "mian", "ch"].includes(kw)) continue;
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

      // Check admissions table if not found in active students
      for (const kw of keywords) {
        if (["muhammad", "mohammad", "syed", "rana", "mian", "ch"].includes(kw)) continue;
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

    // 2. Name Match (check non-generic name tokens)
    const titles = ["muhammad", "mohammad", "syed", "mian", "rana", "choudhary", "malik", "sheikh"];
    const nameTokens = expName.split(/\s+/).filter(t => t.length >= 2);
    const distinctNameTokens = nameTokens.filter(t => !titles.includes(t));
    const nameTokensToCheck = distinctNameTokens.length > 0 ? distinctNameTokens : nameTokens;
    const nameMatched = nameTokensToCheck.some(t => inputWords.includes(t) || cleanInput.includes(t)) || (expName.length > 2 && cleanInput.includes(expName));

    // 3. Father Name Match
    const fatherTokens = expFather.split(/\s+/).filter(t => t.length >= 2);
    const distinctFatherTokens = fatherTokens.filter(t => !titles.includes(t));
    const fatherTokensToCheck = distinctFatherTokens.length > 0 ? distinctFatherTokens : fatherTokens;
    const fatherMatched = fatherTokensToCheck.some(t => inputWords.includes(t) || cleanInput.includes(t)) || (expFather.length > 3 && cleanInput.includes(expFather));

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
      // Requires rigorous satisfaction to protect privacy:
      // - Roll Number + Name/Father/Section
      // - OR Name + Father Name
      // - OR Name + Section
      // - OR Father Name + Section
      // - OR Registered Mobile Number + Name/Father/Section
      // - OR B-Form / CNIC
      // - OR Score >= 2
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
      } else if (score >= 2) {
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
      this.logBotActivity(rawNumber, text, logType);
      session!.history?.push({ role: "user", text });
      session!.history?.push({ role: "model", text: replyText });
      if (session!.history && session!.history.length > 10) {
        session!.history = session!.history.slice(-10);
      }

      this.saveChatLog({
        phone: rawNumber,
        direction: "outgoing",
        text: replyText,
        verifiedStudent: verifiedStudentName || (session!.verifiedStudent ? session!.verifiedStudent.full_name : undefined),
      });
      if (this.sock) {
        await this.sock.sendMessage(senderJid, { text: replyText });
      }
      return replyText;
    };

    // 1. Reset / Restart Session
    if (cleanQuery === "reset" || cleanQuery === "restart" || cleanQuery === "cancel" || cleanQuery === "wapis") {
      session.stage = "IDLE";
      session.candidateStudent = undefined;
      session.candidateStudents = undefined;
      session.accumulatedMatches = undefined;
      session.verifiedStudent = undefined;
      session.pendingIntent = undefined;
      session.history = [];
      const resetMsg = "🔄 Session reset ho chuki hai. Kahiye, main aapki kya madad kar sakta hoon? Aap kisi student ka Naam, Walid ka Naam, Class Section (maslan: MEPB), ya Roll Number likh sakte hain, ya *menu* type kar ke mukammal options dekh sakte hain.";
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

    // 3. Natural Human Greetings Detection (Emulates real, authentic human conversation)
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
        baseGreetingReply = "Walaikum Assalam Mohtaram Janab. 🏛️\n\nSuperior Group of Colleges Jahanian mein khush-amdeed. Main Principal Office ka Executive Assistant hoon. Kahiye, admissions, fee status, exam results ya attendance ke silsilay mein main aapki kya madad kar sakta hoon?";
      } else if (isHiGreeting || isHelloGreeting) {
        baseGreetingReply = "Greetings Mohtaram Janab. 🏛️\n\nWelcome to Superior Group of Colleges Jahanian Executive Helpdesk. How may I assist you today regarding admissions, student fees, exam results, or attendance records?";
      } else if (isHalAhwalGreeting) {
        baseGreetingReply = "Alhamdolillah, shukriya. 🏛️ Superior College Jahanian Helpdesk par khush-amdeed. Kahiye aaj academic ya administrative silsilay mein aapko kya maloomat darkaar hain?";
      } else {
        baseGreetingReply = "Good day Mohtaram Janab. 🏛️\n\nSuperior Group of Colleges Jahanian Information Desk par khush-amdeed. Kahiye aaj main aapki kya madad kar sakta hoon?";
      }

      const reply = await this.generateAiConversationalReply(text, session.history || [], baseGreetingReply);
      return await sendReply(reply, "Conversational Greeting");
    }

    // 4. Inquiries about Bot Identity / College Helpdesk
    const isIntroQuery = 
      cleanQuery.includes("who are you") || 
      cleanQuery.includes("kon ho") || 
      cleanQuery.includes("kaun ho") || 
      cleanQuery.includes("kis ka number") || 
      cleanQuery.includes("kia krte ho") || 
      cleanQuery.includes("kya karte ho");

    if (isIntroQuery) {
      const baseIntro = "Ji, main Superior Group of Colleges Jahanian (Principal Office) ka official Virtual Assistant hoon. Main aapko admissions, fee balance, imtehani nataij (results), aur rozana ki haziri (attendance) ke baray mein verified maloomat faraham karta hoon. Kahiye aapko kis hawalay se rehnumai darkaar hai?";
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
Mohtaram Janab,

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

          const successGreeting = 
`Shukriya! Aapki tasdeeq (Verification) kamyab ho chuki hai. ✅ (Student Name + Section/Father)
Hum *${session.verifiedStudent.full_name}* (Farzand/Binte: ${session.verifiedStudent.father_name}, Sec: ${session.verifiedStudent.section || "A"}) ka official record share kar rahe hain:`;

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
Hum *${session.verifiedStudent.full_name}* (Farzand/Binte: ${session.verifiedStudent.father_name}, Sec: ${session.verifiedStudent.section || "A"}) ka official record share kar rahe hain:`;

          const detailsMsg = await this.buildStudentReply(supabase, session.verifiedStudent, session.pendingIntent || "general");
          const combined = `${successGreeting}\n\n${detailsMsg}`;
          return await sendReply(combined, `Verified Reply (${session.pendingIntent || "general"})`, session.verifiedStudent.full_name);
        } else {
          // Verification needs more satisfaction / failed
          if (evalResult.nameMatched || acc.name) {
            const needFatherOrSecMsg = 
`Shukriya! Student ka naam (*${candidate.full_name}*) hamare pas darj hai.
Student privacy aur security policy ke tehat, mukammal tasdeeq ke liye baraye meherbani in mein se koi aik cheez darj farmayein:
• Walid ka Naam (Father Name)
• Class Section (maslan: MEPB ya ICS)
• College mein register Mobile Number`;
            return await sendReply(needFatherOrSecMsg, "Verification Partial - Need Father/Section");
          } else if (evalResult.fatherMatched || acc.father) {
            const needNameMsg = 
`Shukriya! Walid ka naam mil gaya hai.
Tasdeeq mukammal karne ke liye baraye meherbani *Student ka Mukammal Naam* ya *Class Section (maslan: MEPB)* likh kar reply farmayein:`;
            return await sendReply(needNameMsg, "Verification Partial - Need Student Name");
          } else if (evalResult.sectionMatched || acc.section) {
            const needNameOrFatherMsg = 
`Shukriya! Class Section darj ho gaya hai.
Mukammal tasdeeq ke liye baraye meherbani *Student ka Mukammal Naam* ya *Walid ka Naam* likh kar reply farmayein:`;
            return await sendReply(needNameOrFatherMsg, "Verification Partial - Need Name/Father");
          } else {
            const failMsg = 
`Mohtaram Walidain / Student,
Aapka faraham karda record hamare database se match nahi ho saka. ⚠️

Student ki privacy aur hifazat ke liye, baraye meherbani in mein se koi maloomat darj karein:
• Student ka Mukammal Naam
• Walid ka Naam (Father's Name)
• Class Section (maslan: MEPB, ICS, FSc)
• College mein register shuda Mobile Number
• Roll Number ya Student ID (agar maloom ho)`;
            return await sendReply(failMsg, "Verification Failed");
          }
        }
      }
    }

    // 12. Candidate Lookup: Search by Roll, Phone in text, Sender Phone, or Student/Father Name
    const lookup = await this.findStudentCandidate(supabase, text, rawNumber, explicitRoll);

    // 13. If Multiple Candidates Match a generic keyword (e.g. "Ali")
    if (lookup.multipleMatches && lookup.multipleMatches.length > 1) {
      session.stage = "AWAITING_VERIFICATION";
      session.candidateStudents = lookup.multipleMatches;
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

        const verificationReasonStr = evalResult.matchedReasons.length > 0 
          ? ` (${evalResult.matchedReasons.join(" + ")})` 
          : "";

        const successGreeting = 
`Shukriya! Aapki tasdeeq (Verification) kamyab ho chuki hai. ✅${verificationReasonStr}
Hum *${candidate.full_name}* (Farzand/Binte: ${candidate.father_name}, Sec: ${candidate.section || "A"}) ka official record share kar rahe hain:`;

        const detailsMsg = await this.buildStudentReply(supabase, candidate, session.pendingIntent || "general");
        const combined = `${successGreeting}\n\n${detailsMsg}`;
        return await sendReply(combined, `Direct Verified Reply`, candidate.full_name);
      }

      // If not yet fully satisfied, enter AWAITING_VERIFICATION stage:
      session.candidateStudent = candidate;
      session.stage = "AWAITING_VERIFICATION";
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
`Assalam-o-Alaikum! 🌸
Superior Group of Colleges Jahanian mein khush-amdeed.

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
`Assalam-o-Alaikum! 🌸
Superior Group of Colleges Jahanian Information Desk.

Student (*${candidate.full_name}*) ka record dhoondh liya gaya hai.
Student privacy aur hifazat ke pesh-e-nazar, tasdeeq mukammal karne ke liye baraye meherbani in mein se koi cheez darj farmayein:
• Walid ka Naam (Father's Name)
• Class Section (maslan: MEPB ya ICS)
• College mein register Mobile Number
• Roll Number ya Student ID`;
        return await sendReply(challengeMsg, "Verification Challenge Sent (Unverified Phone)", `Pending (${candidate.full_name})`);
      }
    }

    // 15. If user asked for student record (fee, marks, attendance, all) but no candidate matched yet:
    if (isFeeQuery || isMarksQuery || isAttendanceQuery || isAllQuery) {
      const intentName = isFeeQuery ? "Fee Status" : isMarksQuery ? "Exam Result" : isAttendanceQuery ? "Attendance" : "Record";
      const askForStudent = 
`🏛️ *SUPERIOR GROUP OF COLLEGES JAHANIAN*
🔒 *STUDENT VERIFICATION REQUIRED*
━━━━━━━━━━━━━━━━━━━━━━━━━
Mohtaram Janab,

Student ka *${intentName}* hasil karne ke liye, baraye meherbani darj zail mein se koi aik maloomat irsal farmayein:

• Student ka Mukammal Naam (Full Name)
• Roll Number ya Student ID
• Class Section (maslan: MEPB / ICS)
• Registered Mobile Number

_System tasdeeq ke foran baad official record faraham karega._`;
      return await sendReply(askForStudent, "Ask Student Info For Query");
    }

    // 15. Default Fallback: Conversational AI response or Warm Human Inquirer (NEVER dump cold menu)
    const fallbackMessage = 
      "Superior Group of Colleges Jahanian mein khush-amdeed! Main Principal Office ka Executive Assistant hoon. Admissions, student fees, exam results, attendance ya timings ke silsilay mein aap direct pooch sakte hain, ya *menu* likh kar tamam options dekh sakte hain.";
    const conversationalReply = await this.generateAiConversationalReply(text, session.history || [], fallbackMessage);
    return await sendReply(conversationalReply, "Conversational AI Fallback");
  }

  // Helper: Interactive Main Menu
  public getMainMenuText(verifiedStudentName?: string): string {
    const verifiedHeader = verifiedStudentName
      ? `👤 *Verified Student:* ${verifiedStudentName}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      : "";

    return `🏛️ *SUPERIOR GROUP OF COLLEGES JAHANIAN*
🏢 *Executive Student & Parent Helpdesk*
━━━━━━━━━━━━━━━━━━━━━━━━━
${verifiedHeader}Mohtaram Janab, matlooba service ke liye number likh kar reply karein:

1️⃣ *Fee Status & Outstanding Balance* 💰
2️⃣ *Monthly Examination Marks & Results* 📊
3️⃣ *Daily Attendance & Punctuality* 📅
4️⃣ *Campus Information & Schedule* 📍
5️⃣ *Principal Office & Contact Desk* 📞

_Tip: Aap kisi bhi student ka Naam ya Roll Number direct likh kar bhi bhej sakte hain._`;
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
