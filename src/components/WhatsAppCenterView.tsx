import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Search, Send, FileText, Phone, UserCheck, AlertTriangle, Users, 
  GraduationCap, Clock, QrCode, Wifi, WifiOff, Cpu, Play, Pause, 
  RotateCcw, Wand2, Terminal, CheckCircle2, XCircle, Sliders, Battery, 
  Sparkles, Check, Database, RefreshCw, Layers, Bot, MessageSquare,
  ChevronRight, CheckSquare, Square, ShieldCheck, Zap, Copy, CheckCheck,
  User, ArrowLeft, Trash2, ExternalLink, Smile, Paperclip, MoreVertical,
  Reply, X, BarChart3, Activity, Download, Eye, DollarSign, Calendar,
  BookOpen, ShieldAlert, PieChart, Lock, Filter, Smartphone, HelpCircle,
  CheckCircle, Info, ChevronDown, Plus, CalendarCheck, TrendingUp, Bell,
  Coffee, ChevronLeft, ArrowRight, Shield, Camera
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import WhatsAppExecutiveConsole from "./WhatsAppExecutiveConsole";

interface WhatsAppCenterViewProps {
  data: {
    students?: any[];
    staff?: any[];
    academicRecords?: any[];
    settings?: any;
    [key: string]: any;
  };
}

interface MessageQueueItem {
  id: string;
  name: string;
  phone: string;
  resolvedMessage: string;
  status: "queued" | "sending" | "sent" | "failed";
  error?: string;
  detail: string;
}

export default function WhatsAppCenterView({ data }: WhatsAppCenterViewProps) {
  const students = data?.students || [];
  const staff = data?.staff || [];
  const academicRecords = data?.academicRecords || [];
  const globalSettings = data?.settings || {};

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<"messenger" | "broadcaster" | "bot_dashboard" | "automated_reports" | "ai_executive">("messenger");

  // Automated Reports States
  const [reportConfig, setReportConfig] = useState<any>(null);
  const [isLoadingReportConfig, setIsLoadingReportConfig] = useState(false);
  const [isSavingReportConfig, setIsSavingReportConfig] = useState(false);
  const [isSendingTestReport, setIsSendingTestReport] = useState<string | null>(null);
  const [reportPreviewModal, setReportPreviewModal] = useState<{ isOpen: boolean; title: string; text: string }>({
    isOpen: false,
    title: "",
    text: "",
  });

  // Audience selector states (Used inside Tab 2: Broadcaster)
  const [targetGroup, setTargetGroup] = useState("All Students");
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [selectedSection, setSelectedSection] = useState("All Sections");
  const [selectedGender, setSelectedGender] = useState("All");
  const [customNumbers, setCustomNumbers] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Interactive Live Preview & Anti-Ban States
  const [selectedPreviewStudentId, setSelectedPreviewStudentId] = useState<string | null>(null);
  const [isSendingTestPreview, setIsSendingTestPreview] = useState(false);
  const [enableAntiBanHash, setEnableAntiBanHash] = useState(true);
  const [enableBatchPause, setEnableBatchPause] = useState(true);
  const [batchPauseInterval, setBatchPauseInterval] = useState(15);
  const [batchPauseDuration, setBatchPauseDuration] = useState(25);
  const [isBatchPausing, setIsBatchPausing] = useState(false);
  const [batchPauseCountdown, setBatchPauseCountdown] = useState(0);

  // Message template state
  const [messageText, setMessageText] = useState(
    "Assalam o Alaikum {{father}}, apka beta/beti {{name}} (Class: {{class}}, Roll No: {{rollNo}}, Sec: {{section}}) ki Superior College Jahanian se updates: Baqaya Fees: {{dues}}."
  );

  // Real Baileys Server Connection states
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "qr_ready" | "connected">("disconnected");
  const [serverQrCode, setServerQrCode] = useState<string | null>(null);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [connectedName, setConnectedName] = useState<string | null>(null);
  const [isConnectingSocket, setIsConnectingSocket] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Bot 360 settings & stats
  const [isBotEnabled, setIsBotEnabled] = useState(true);
  const [botStats, setBotStats] = useState<any>(null);
  const [isLoadingBotStats, setIsLoadingBotStats] = useState(false);
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [isLoadingChatLogs, setIsLoadingChatLogs] = useState(false);

  // WhatsApp Web-style 2-Pane Chat State
  const [selectedChatPhone, setSelectedChatPhone] = useState<string | null>(null);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatFilterMode, setChatFilterMode] = useState<"all" | "verified" | "incoming">("all");
  const [replyInputText, setReplyInputText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<{ id: string; text: string; sender: string } | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevChatPhoneRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef<number>(0);

  // Bot Dashboard State
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [dashboardCategory, setDashboardCategory] = useState("all");
  const [botSimQuery, setBotSimQuery] = useState("FEE 1042");
  const [botSimSenderPhone, setBotSimSenderPhone] = useState("03014455891");
  const [botSimResponse, setBotSimResponse] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Verified Faculty & Admin Users state
  const [verifiedUsersList, setVerifiedUsersList] = useState<any[]>([]);
  const [isLoadingVerifiedUsers, setIsLoadingVerifiedUsers] = useState(false);
  const [isLinkingFacultyModal, setIsLinkingFacultyModal] = useState(false);
  const [selectedStaffIdToLink, setSelectedStaffIdToLink] = useState("");
  const [manualLinkName, setManualLinkName] = useState("");
  const [manualLinkPhone, setManualLinkPhone] = useState("");
  const [manualLinkRole, setManualLinkRole] = useState("Teacher");
  const [manualLinkDesignation, setManualLinkDesignation] = useState("");

  // AI assistant status
  const [isAiComposing, setIsAiComposing] = useState(false);
  const [customAiPrompt, setCustomAiPrompt] = useState("");

  // Bulk Sender status
  const [averageDelay, setAverageDelay] = useState(4);
  const [queueList, setQueueList] = useState<MessageQueueItem[]>([]);
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [isBulkPaused, setIsBulkPaused] = useState(false);
  const [bulkCurrentIndex, setBulkCurrentIndex] = useState<number>(-1);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [dispatchMode, setDispatchMode] = useState<"supervised" | "simulated">("simulated");

  const telemetryContainerRef = useRef<HTMLDivElement>(null);
  const prevTelemetryCountRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Poll Real WhatsApp Status from Backend
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const d = await res.json();
        setConnectionState(d.status);
        setServerQrCode(d.qrCode);
        setConnectedPhone(d.connectedPhone);
        setConnectedName(d.connectedName);
      }
    } catch {}
  };

  const fetchBotSettings = async () => {
    try {
      const res = await fetch("/api/whatsapp/bot-settings");
      if (res.ok) {
        const d = await res.json();
        setIsBotEnabled(Boolean(d.enabled));
      }
    } catch {}
  };

  const fetchBotStats = async () => {
    try {
      setIsLoadingBotStats(true);
      const res = await fetch("/api/whatsapp/bot-stats");
      if (res.ok) {
        const d = await res.json();
        setBotStats(d);
      }
    } catch {} finally {
      setIsLoadingBotStats(false);
    }
  };

  const fetchChatLogs = async () => {
    try {
      setIsLoadingChatLogs(true);
      const res = await fetch("/api/whatsapp/chat-logs");
      if (res.ok) {
        const d = await res.json();
        setChatLogs(d.logs || []);
      }
    } catch {} finally {
      setIsLoadingChatLogs(false);
    }
  };

  const handleClearChatLogs = async () => {
    if (!confirm("Are you sure you want to clear all WhatsApp audit trail logs?")) return;
    try {
      const res = await fetch("/api/whatsapp/chat-logs", { method: "DELETE" });
      if (res.ok) {
        setChatLogs([]);
        toast.success("WhatsApp Audit Trail Logs Cleared.");
      }
    } catch {
      toast.error("Failed to clear chat logs.");
    }
  };

  const fetchVerifiedUsers = async () => {
    try {
      setIsLoadingVerifiedUsers(true);
      const res = await fetch("/api/whatsapp/verified-users");
      if (res.ok) {
        const d = await res.json();
        setVerifiedUsersList(d.users || []);
      }
    } catch {} finally {
      setIsLoadingVerifiedUsers(false);
    }
  };

  const handleUnlinkUser = async (phone: string, name: string) => {
    if (!confirm(`Are you sure you want to unlink ${name} (+${phone}) from WhatsApp Faculty Desk?`)) return;
    try {
      const res = await fetch("/api/whatsapp/unlink-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (res.ok) {
        toast.success(`Unlinked ${name} successfully.`);
        fetchVerifiedUsers();
      } else {
        toast.error("Failed to unlink user.");
      }
    } catch {
      toast.error("Network error while unlinking.");
    }
  };

  const handleQuickLinkStaff = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let phoneToLink = manualLinkPhone.trim();
    let nameToLink = manualLinkName.trim();
    let roleToLink = manualLinkRole;
    let designationToLink = manualLinkDesignation.trim();
    let staffIdToLink = "";

    if (selectedStaffIdToLink) {
      const st = staff.find((s: any) => s.id === selectedStaffIdToLink);
      if (st) {
        nameToLink = st.fullName || st.name || nameToLink;
        phoneToLink = st.contact || st.phone || phoneToLink;
        roleToLink = st.role || roleToLink;
        designationToLink = st.designation || st.role || designationToLink;
        staffIdToLink = st.id;
      }
    }

    if (!phoneToLink || !nameToLink) {
      toast.error("Please provide both Name and Phone number.");
      return;
    }

    try {
      const res = await fetch("/api/whatsapp/link-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneToLink,
          name: nameToLink,
          role: roleToLink,
          staffId: staffIdToLink || undefined,
          designation: designationToLink || undefined,
        }),
      });

      if (res.ok) {
        toast.success(`Authorized ${nameToLink} (+${phoneToLink}) for WhatsApp Faculty Desk!`);
        setIsLinkingFacultyModal(false);
        setSelectedStaffIdToLink("");
        setManualLinkName("");
        setManualLinkPhone("");
        setManualLinkDesignation("");
        fetchVerifiedUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to authorize user.");
      }
    } catch {
      toast.error("Network error authorizing user.");
    }
  };

  const fetchReportConfig = async () => {
    setIsLoadingReportConfig(true);
    try {
      const res = await fetch("/api/whatsapp/scheduled-reports/config");
      if (res.ok) {
        const data = await res.json();
        setReportConfig(data);
      }
    } catch (e) {
      console.error("Error fetching report config:", e);
    } finally {
      setIsLoadingReportConfig(false);
    }
  };

  const saveReportConfig = async (updatedConfig: any) => {
    setIsSavingReportConfig(true);
    try {
      const res = await fetch("/api/whatsapp/scheduled-reports/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });
      if (res.ok) {
        const saved = await res.json();
        setReportConfig(saved);
        toast.success("Scheduled reports settings saved successfully!");
      } else {
        toast.error("Failed to save report settings.");
      }
    } catch {
      toast.error("Network error while saving settings.");
    } finally {
      setIsSavingReportConfig(false);
    }
  };

  const handleSendTestReport = async (reportType: "daily" | "weekly" | "monthly") => {
    setIsSendingTestReport(reportType);
    try {
      const res = await fetch("/api/whatsapp/scheduled-reports/send-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Dispatched ${reportType.toUpperCase()} report to ${reportConfig?.principalPhone || "Principal"}!`);
        setReportPreviewModal({
          isOpen: true,
          title: `Report Dispatched: ${reportType.toUpperCase()}`,
          text: data.messageText || "",
        });
      } else {
        toast.error(data.error || "Failed to dispatch test report.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger test report.");
    } finally {
      setIsSendingTestReport(null);
    }
  };

  const handlePreviewReport = async (reportType: "daily" | "weekly" | "monthly") => {
    try {
      const res = await fetch("/api/whatsapp/scheduled-reports/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType }),
      });
      const data = await res.json();
      if (res.ok && data.previewText) {
        setReportPreviewModal({
          isOpen: true,
          title: `${reportType.toUpperCase()} Report Live Preview`,
          text: data.previewText,
        });
      } else {
        toast.error("Could not generate report preview.");
      }
    } catch {
      toast.error("Network error generating preview.");
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchBotSettings();
    fetchChatLogs();
    fetchBotStats();
    fetchVerifiedUsers();
    fetchReportConfig();
    const iv = setInterval(() => {
      fetchStatus();
      fetchChatLogs();
      fetchBotStats();
      fetchVerifiedUsers();
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  // Delete individual chat message
  const handleDeleteSingleMessage = async (msgId: string) => {
    try {
      const res = await fetch(`/api/whatsapp/chat-logs?messageId=${encodeURIComponent(msgId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setChatLogs(prev => prev.filter(m => m.id !== msgId));
        toast.success("Message deleted.");
      } else {
        toast.error("Could not delete message.");
      }
    } catch {
      toast.error("Network error deleting message.");
    }
  };

  // Delete entire conversation thread
  const handleDeleteConversation = async (phone: string) => {
    if (!confirm(`Are you sure you want to delete all chat history with +${phone}?`)) return;
    try {
      const res = await fetch(`/api/whatsapp/chat-logs?phone=${encodeURIComponent(phone)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setChatLogs(prev => prev.filter(m => m.phone !== phone));
        setSelectedChatPhone(null);
        toast.success(`Chat history with +${phone} cleared.`);
      } else {
        toast.error("Failed to delete conversation.");
      }
    } catch {
      toast.error("Network error deleting conversation.");
    }
  };

  // Send manual reply directly from the 2-pane chat window (supports WhatsApp Quote Reply)
  const handleSendManualChatReply = async () => {
    if (!selectedChatPhone || !replyInputText.trim()) return;
    const phone = selectedChatPhone;
    
    let finalMessage = replyInputText.trim();
    if (replyingToMessage) {
      const quotedSnippet = replyingToMessage.text.length > 50 
        ? replyingToMessage.text.slice(0, 50) + "..." 
        : replyingToMessage.text;
      finalMessage = `> _Replying to (${replyingToMessage.sender}):_\n> "${quotedSnippet}"\n\n${finalMessage}`;
    }

    setIsSendingReply(true);

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message: finalMessage }),
      });

      if (res.ok) {
        setReplyInputText("");
        setReplyingToMessage(null);
        toast.success(`Message sent to +${phone}!`);
        await fetchChatLogs();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to deliver message via WhatsApp gateway.");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to send message.");
    } finally {
      setIsSendingReply(false);
    }
  };

  // Group chat logs by phone number into conversation threads
  const groupedConversations = useMemo(() => {
    const map = new Map<string, {
      phone: string;
      studentName?: string;
      verifiedStudent?: string;
      fatherName?: string;
      className?: string;
      lastMessage: string;
      lastTimestamp: string;
      direction: "incoming" | "outgoing";
      messages: any[];
      unreadCount: number;
    }>();

    for (const log of chatLogs) {
      const phone = log.phone;
      if (!phone) continue;

      if (phone.startsWith("120363") || phone.length > 15) continue;

      if (!map.has(phone)) {
        const normChatPhone = phone.replace(/\D/g, "").slice(-10);
        const matched = (normChatPhone.length >= 9) ? students.find((s: any) => {
          const sContact = (s.contact || "").replace(/\D/g, "").slice(-10);
          return sContact && sContact.length >= 9 && sContact === normChatPhone;
        }) : undefined;

        map.set(phone, {
          phone,
          studentName: matched?.fullName || log.verifiedStudent || log.senderName || undefined,
          verifiedStudent: log.verifiedStudent,
          fatherName: matched?.fatherName,
          className: matched?.group ? `${matched.group} ${matched.section || ""}`.trim() : undefined,
          lastMessage: log.text || "",
          lastTimestamp: log.timestamp,
          direction: log.direction,
          messages: [log],
          unreadCount: log.direction === "incoming" ? 1 : 0,
        });
      } else {
        const conv = map.get(phone)!;
        conv.messages.push(log);
        if (!conv.verifiedStudent && log.verifiedStudent) {
          conv.verifiedStudent = log.verifiedStudent;
        }
        if (!conv.studentName && log.senderName) {
          conv.studentName = log.senderName;
        }
      }
    }

    const list = Array.from(map.values()).sort(
      (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );

    if (chatSearchQuery.trim()) {
      const q = chatSearchQuery.toLowerCase();
      return list.filter(
        c => c.phone.includes(q) ||
             (c.studentName || "").toLowerCase().includes(q) ||
             (c.fatherName || "").toLowerCase().includes(q) ||
             (c.lastMessage || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [chatLogs, students, chatSearchQuery]);

  // Filter conversations by mode in Tab 1
  const filteredConversations = useMemo(() => {
    let list = groupedConversations;
    if (chatFilterMode === "verified") {
      list = list.filter(c => Boolean(c.verifiedStudent));
    } else if (chatFilterMode === "incoming") {
      list = list.filter(c => c.direction === "incoming");
    }
    return list;
  }, [groupedConversations, chatFilterMode]);

  // Set default selected phone if none selected yet
  useEffect(() => {
    if (!selectedChatPhone && groupedConversations.length > 0) {
      setSelectedChatPhone(groupedConversations[0].phone);
    }
  }, [groupedConversations, selectedChatPhone]);

  // Messages of the active conversation sorted chronologically
  const activeConversationMessages = useMemo(() => {
    if (!selectedChatPhone) return [];
    const conv = groupedConversations.find(c => c.phone === selectedChatPhone);
    if (!conv) return [];
    return [...conv.messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [selectedChatPhone, groupedConversations]);

  // Smooth scroll chat
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const count = activeConversationMessages.length;
    const phoneChanged = prevChatPhoneRef.current !== selectedChatPhone;
    const messageAdded = count > prevMessageCountRef.current;

    if (phoneChanged || messageAdded) {
      container.scrollTop = container.scrollHeight;
      prevMessageCountRef.current = count;
      prevChatPhoneRef.current = selectedChatPhone;
    }
  }, [activeConversationMessages, selectedChatPhone]);

  // Smooth scroll telemetry
  useEffect(() => {
    const container = telemetryContainerRef.current;
    if (!container) return;
    const count = telemetryLogs.length;
    if (count > prevTelemetryCountRef.current) {
      container.scrollTop = container.scrollHeight;
      prevTelemetryCountRef.current = count;
    }
  }, [telemetryLogs]);

  // Unique classes from students roster
  const classes = useMemo(() => {
    if (!students) return [];
    return Array.from(new Set(students.map(s => s.group).filter(Boolean))).sort();
  }, [students]);

  // Unique sections from students roster (dynamically updated if a class is picked)
  const sections = useMemo(() => {
    if (!students) return [];
    let list = students;
    if (selectedClass !== "All Classes") {
      list = list.filter(s => s.group === selectedClass);
    }
    const rawSections = list.map(s => (s.section || "").trim()).filter(Boolean);
    return Array.from(new Set(rawSections)).sort();
  }, [students, selectedClass]);

  // Students missing photo
  const missingPhotosCount = useMemo(() => {
    return (students || []).filter(s => !s.photo || String(s.photo).trim().length < 50).length;
  }, [students]);

  // Sync / Clean bulk queue if filters shift
  const filteredRecipients = useMemo(() => {
    if (targetGroup === "Staff") {
      let List = staff || [];
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        List = List.filter(s => 
          (s.fullName || '').toLowerCase().includes(query) ||
          (s.contact || '').includes(query) ||
          (s.role || '').toLowerCase().includes(query)
        );
      }
      return (List as any[]).map(s => {
        const fallbackName = s.fullName || "Unnamed Staff";
        const contactNo = s.contact || "";
        return {
          id: s.id || `staff-${Math.random()}`,
          name: fallbackName,
          father: s.fatherName || "-",
          phone: contactNo,
          type: 'Staff',
          rollNo: s.id || 'STAFF',
          section: 'Staff',
          classGroup: s.role || 'Employee',
          detail: s.role || 'Employee',
          dues: 0,
          marks: "-",
          attendance: "Active",
        };
      }).filter(s => s.phone);
    } else if (targetGroup === "Custom Numbers") {
      let List = (customNumbers || "").split('\n').map(n => n.trim()).filter(Boolean);
      if (searchQuery.trim() !== "") {
        List = List.filter(n => n.includes(searchQuery));
      }
      return List.map((phone, i) => ({
        id: `custom-${i}`,
        name: `Contact ${i + 1}`,
        father: "Guardian",
        phone: phone,
        type: 'Custom',
        rollNo: `CUST-${i + 1}`,
        section: 'Manual',
        classGroup: 'Manual Entry',
        detail: 'Manual Entry',
        dues: 0,
        marks: "-",
        attendance: "N/A",
      }));
    }

    let List = students || [];

    if (targetGroup === "Class Wise" && selectedClass !== "All Classes") {
      List = List.filter(s => s.group === selectedClass);
    }

    if (selectedSection !== "All Sections") {
      List = List.filter(s => (s.section || "").trim().toLowerCase() === selectedSection.trim().toLowerCase());
    }

    if (selectedGender !== "All") {
      List = List.filter(s => s.gender === selectedGender);
    }

    if (targetGroup === "Fee Defaulters") {
      List = List.filter(s => {
        const total = Number(s.totalPackage || 0);
        const paid = Number(s.feeReceived || 0);
        return (total - paid) > 0;
      });
    }

    if (targetGroup === "Missing Photos") {
      List = List.filter(s => !s.photo || String(s.photo).trim().length < 50);
    }

    if (targetGroup === "Selective Students") {
      List = List.filter(s => selectedStudentIds.has(s.id));
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      List = List.filter(s => 
        (s.fullName || '').toLowerCase().includes(query) ||
        (s.fatherName || '').toLowerCase().includes(query) ||
        (s.contact || '').includes(query) ||
        (s.section || '').toLowerCase().includes(query) ||
        (s.collegeNo || '').toLowerCase().includes(query)
      );
    }

    return List.map(s => {
      const fallbackName = s.fullName || "Unnamed Student";
      const contactNo = s.contact || "";
      const totalPkg = Number(s.totalPackage || 0);
      const paid = Number(s.feeReceived || 0);
      const dues = Math.max(0, totalPkg - paid);

      return {
        id: s.id,
        name: fallbackName,
        father: s.fatherName || "Guardian",
        phone: contactNo,
        type: 'Student',
        rollNo: s.collegeNo || s.id || "N/A",
        section: s.section || "A",
        classGroup: s.group || "Intermediate",
        detail: `${s.group || ''} (Sec: ${s.section || 'A'})`.trim(),
        dues,
        photo: s.photo,
        gender: s.gender,
        marks: "Available in report",
        attendance: `${s.attendancePresent || 0} Present / ${s.attendanceAbsent || 0} Absent`,
      };
    }).filter(s => s.phone);
  }, [targetGroup, students, staff, selectedClass, selectedSection, selectedGender, customNumbers, searchQuery, selectedStudentIds]);

  // Active recipient currently selected for live real-time WhatsApp preview
  const activePreviewRecipient = useMemo(() => {
    if (selectedPreviewStudentId) {
      const found = filteredRecipients.find(r => r.id === selectedPreviewStudentId);
      if (found) return found;
    }
    return filteredRecipients[0] || null;
  }, [selectedPreviewStudentId, filteredRecipients]);

  const handlePrevPreviewRecipient = () => {
    if (!activePreviewRecipient || filteredRecipients.length === 0) return;
    const currentIndex = filteredRecipients.findIndex(r => r.id === activePreviewRecipient.id);
    const prevIndex = (currentIndex - 1 + filteredRecipients.length) % filteredRecipients.length;
    setSelectedPreviewStudentId(filteredRecipients[prevIndex].id);
  };

  const handleNextPreviewRecipient = () => {
    if (!activePreviewRecipient || filteredRecipients.length === 0) return;
    const currentIndex = filteredRecipients.findIndex(r => r.id === activePreviewRecipient.id);
    const nextIndex = (currentIndex + 1) % filteredRecipients.length;
    setSelectedPreviewStudentId(filteredRecipients[nextIndex].id);
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "92" + cleaned.substring(1);
    }
    return cleaned;
  };

  // Anti-Ban Message Content Signature: Injects unique reference and micro-spaces
  // so WhatsApp spam filters never see identical byte strings across 100s of messages!
  const applyAntiBanHash = (message: string, recipientId: string): string => {
    if (!enableAntiBanHash) return message;
    const shortRef = recipientId ? recipientId.slice(-4).toUpperCase() : Math.random().toString(36).slice(2, 6).toUpperCase();
    const cleanRef = `\n\n_Ref: #SGCJ-${shortRef}_`;
    const zeroWidthPadding = "\u200B".repeat(((recipientId.charCodeAt(recipientId.length - 1) || 1) % 5) + 1);
    return `${message}${zeroWidthPadding}${cleanRef}`;
  };

  const getPersonalizedMessage = (template: string, recipient: any) => {
    if (!recipient) return template;
    let text = template;
    const name = recipient.name || "Student/Staff";
    const detail = recipient.detail || "";
    const phone = recipient.phone || "";
    const rollNo = recipient.rollNo || "N/A";
    const section = recipient.section || "A";
    const father = recipient.father || "Guardian";
    const classGroup = recipient.classGroup || detail;
    const dues = Number(recipient.dues || 0);

    text = text.replace(/{{name}}/g, name);
    text = text.replace(/{{phone}}/g, phone);
    text = text.replace(/{{class}}/g, classGroup);
    text = text.replace(/{{section}}/g, section);
    text = text.replace(/{{rollNo}}/g, rollNo);
    text = text.replace(/{{roll}}/g, rollNo);
    text = text.replace(/{{father}}/g, father);
    text = text.replace(/{{dues}}/g, `Rs. ${dues.toLocaleString()}`);
    text = text.replace(/{{attendance}}/g, recipient.attendance || "Active");
    text = text.replace(/{{college}}/g, "Superior College Jahanian");
    
    const studentMatch = students.find(s => s.id === recipient.id || s.fullName === recipient.name);
    if (studentMatch) {
      const results = academicRecords.filter((r: any) => 
        r.studentId === studentMatch.id || 
        (r.studentName && r.studentName.toLowerCase() === name.toLowerCase())
      );
      if (results.length > 0) {
        const formattedResults = results.map((r: any) => 
          `${r.testName || 'Test'}: ${r.obtainedMarks || r.obtained || 0}/${r.totalMarks || r.total || 0} in ${r.subject || 'Subject'}`
        ).join(", ");
        text = text.replace(/{{marks}}/g, formattedResults);
        
        const latest = results[0];
        text = text.replace(/{{latest_subject}}/g, latest.subject || "Subject");
        text = text.replace(/{{latest_obtained}}/g, String(latest.obtainedMarks || latest.obtained || 0));
        text = text.replace(/{{latest_total}}/g, String(latest.totalMarks || latest.total || 100));
        text = text.replace(/{{latest_test}}/g, latest.testName || "Exam");
      } else {
        text = text.replace(/{{marks}}/g, "Available on portal");
        text = text.replace(/{{latest_subject}}/g, "N/A");
        text = text.replace(/{{latest_obtained}}/g, "0");
        text = text.replace(/{{latest_total}}/g, "100");
        text = text.replace(/{{latest_test}}/g, "N/A");
      }
    } else {
      text = text.replace(/{{marks}}/g, "N/A");
      text = text.replace(/{{latest_subject}}/g, "N/A");
      text = text.replace(/{{latest_obtained}}/g, "0");
      text = text.replace(/{{latest_total}}/g, "100");
      text = text.replace(/{{latest_test}}/g, "N/A");
    }
    
    return text;
  };

  const handleInsertVariable = (varStr: string) => {
    setMessageText(prev => `${prev} ${varStr}`);
    toast.success(`Added ${varStr}`);
  };

  // Send Single Live Test Message to the Currently Previewed Student via College WhatsApp
  const handleSendTestToPreviewStudent = async () => {
    if (!activePreviewRecipient) {
      toast.error("No student selected for preview.");
      return;
    }
    if (!activePreviewRecipient.phone) {
      toast.error("This student has no valid phone number recorded.");
      return;
    }
    if (connectionState !== "connected") {
      toast.warning("College WhatsApp is not connected. Please scan the QR code first!");
      setIsQRModalOpen(true);
      return;
    }

    setIsSendingTestPreview(true);
    try {
      const rawMsg = getPersonalizedMessage(messageText, activePreviewRecipient);
      const safeMsg = applyAntiBanHash(rawMsg, activePreviewRecipient.id);

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: activePreviewRecipient.phone,
          message: safeMsg,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Test message delivered to ${activePreviewRecipient.name} (${activePreviewRecipient.phone})!`);
        addLog(`[Single Test] Sent live WhatsApp message to ${activePreviewRecipient.name} (${activePreviewRecipient.phone}) from College WhatsApp.`);
        fetchChatLogs();
      } else {
        toast.error(data.error || "Failed to deliver message via WhatsApp socket.");
      }
    } catch (e: any) {
      toast.error(e.message || "Network error while sending test message.");
    } finally {
      setIsSendingTestPreview(false);
    }
  };

  const addLog = (message: string) => {
    const timeStr = new Date().toLocaleTimeString();
    setTelemetryLogs(prev => [...prev, `[${timeStr}] ${message}`]);
  };

  // Connect WhatsApp through Real Baileys Backend
  const handleConnectWhatsApp = async (forceFresh = false) => {
    try {
      setIsConnectingSocket(true);
      setConnectionState("connecting");
      setIsQRModalOpen(true);
      addLog("Contacting backend Baileys Socket bridge...");
      toast.loading("Generating WhatsApp session QR...", { id: "wa-conn" });

      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceFresh }),
      });

      if (res.ok) {
        const status = await res.json();
        setConnectionState(status.status);
        setServerQrCode(status.qrCode);
        toast.success("QR Code ready! Scan with your phone WhatsApp.", { id: "wa-conn" });
        addLog("WhatsApp QR rendered. Open WhatsApp > Linked Devices > Link a Device.");
      } else {
        toast.error("Failed to initialize WhatsApp socket.", { id: "wa-conn" });
      }
    } catch (err: any) {
      toast.error(err.message || "Connection error", { id: "wa-conn" });
    } finally {
      setIsConnectingSocket(false);
    }
  };

  // Disconnect WhatsApp
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to unlink and disconnect your WhatsApp device?")) return;
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
      setConnectionState("disconnected");
      setServerQrCode(null);
      setConnectedPhone(null);
      setConnectedName(null);
      setIsQRModalOpen(false);
      toast.info("WhatsApp Device Disconnected.");
      addLog("Device unlinked from college gateway.");
    } catch (e) {
      toast.error("Failed to disconnect.");
    }
  };

  // Toggle Bot On/Off
  const handleToggleBot = async (enable: boolean) => {
    try {
      setIsBotEnabled(enable);
      await fetch("/api/whatsapp/bot-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: enable }),
      });
      toast.success(`WhatsApp 360° Assistant Bot ${enable ? "Activated" : "Deactivated"}`);
      fetchBotSettings();
      fetchBotStats();
    } catch {
      toast.error("Could not update bot status.");
    }
  };

  // Test Simulated Bot Query in Tab 3
  const handleRunBotSim = async () => {
    if (!botSimQuery.trim()) {
      toast.error("Please enter a question or command to test.");
      return;
    }
    setIsSimulating(true);
    setBotSimResponse(null);
    try {
      const res = await fetch("/api/whatsapp/bot-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: botSimQuery,
          phone: botSimSenderPhone || "03014455891",
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setBotSimResponse(d.reply || "No response generated.");
        toast.success("Nexus AI Query executed!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Simulation error");
      }
    } catch (err: any) {
      toast.error(err.message || "Bot test error");
    } finally {
      setIsSimulating(false);
    }
  };

  // Multi-Select helpers for Selective Students
  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisibleStudents = () => {
    const allIds = (students || []).map(s => s.id);
    setSelectedStudentIds(new Set(allIds));
    toast.success(`Selected all ${allIds.length} students.`);
  };

  const deselectAllStudents = () => {
    setSelectedStudentIds(new Set());
    toast.info("Cleared student selections.");
  };

  // Ask AI Copilot to Compose Template
  const handleAiCompose = async (prebuiltStyle?: string) => {
    setIsAiComposing(true);
    addLog("Querying SCJ Nexus AI for intelligent template compilation...");
    
    let promptInstruction = customAiPrompt.trim();
    
    if (prebuiltStyle === "fee_dues") {
      promptInstruction = "Write an outstanding fee dues reminder template in polite Roman Urdu (Hinglish). Use header '🏛️ *SUPERIOR COLLEGE JAHANIAN*', line divider '━━━━━━━━━━━━━━━━━━━━━━━━━', bullet points with placeholders {{name}}, {{father}}, {{class}}, and {{dues}}. Keep it strictly to the point, dignified, signed off by '_Accounts & Finance Department, SGC Jahanian_' with phone '0301-4455891'. No rambling or conversational filler.";
    } else if (prebuiltStyle === "announcement") {
      promptInstruction = "Write an official campus circular/holiday notice template for Superior College Jahanian. Use header '🏛️ *SUPERIOR COLLEGE JAHANIAN*', divider '━━━━━━━━━━━━━━━━━━━━━━━━━', placeholders {{name}} and {{class}}. Keep it strictly concise, executive, bilingual English/Roman Urdu, signed off by '_Office of the Principal, SGC Jahanian_'.";
    } else if (prebuiltStyle === "marks") {
      promptInstruction = "Write a concise executive academic assessment report notification. Use header '🏛️ *SUPERIOR COLLEGE JAHANIAN*', divider '━━━━━━━━━━━━━━━━━━━━━━━━━', placeholders {{name}}, {{father}}, {{class}}, and {{marks}}. Keep it strictly to the point, signed off by '_Office of the Controller of Examinations, SGC Jahanian_'.";
    } else if (prebuiltStyle === "absent_staff") {
      promptInstruction = "Write a concise administrative faculty notice regarding punctual attendance and lecture timetables. Use header '🏛️ *SUPERIOR COLLEGE JAHANIAN*', divider '━━━━━━━━━━━━━━━━━━━━━━━━━', signed off by '_Office of the Vice Principal, SGC Jahanian_'.";
    } else if (prebuiltStyle === "missing_photos") {
      setTargetGroup("Missing Photos");
      setMessageText(
`🏛️ *SUPERIOR COLLEGE JAHANIAN*
📸 *STUDENT ID CARD & PROFILE NOTIFICATION*
━━━━━━━━━━━━━━━━━━━━━━━━━
Assalam-o-Alaikum Mohtaram {{father}}!
Student *{{name}}* (Roll No: *{{rollNo}}*, Class: *{{class}}*) ke official Student ID Card aur portal profile ke liye passport-size tasveer darkar hai.

Baraye meherbani student ki saaf passport-size tasveer isi WhatsApp chat mein foran bhej dein. Tasveer receive hote hi system mein auto-update ho jayegi.

Shukriya!
_Office of the Principal, SGC Jahanian_
📞 0301-4455891`
      );
      toast.success(`Targeted students missing photos with ID Card template!`);
      setIsAiComposing(false);
      return;
    }

    if (!promptInstruction) {
      toast.error("Please select a template format or write instructions for Nexus AI.");
      setIsAiComposing(false);
      return;
    }

    const getOfflineTemplate = (style?: string) => {
      if (style === "fee_dues") {
        return `🏛️ *SUPERIOR COLLEGE JAHANIAN*
📄 *OFFICIAL FEE REMINDER NOTICE*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian ({{father}}),

• *Student Name:* {{name}}
• *Class / Group:* {{class}}
• *Outstanding Dues:* *{{dues}}*
━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *Instruction:* Baraye meherbani aakhri tareekh se qabal accounts desk par baqaya fee jama karwa kar computerised receipt hasil karein.
📞 Accounts Desk: 0301-4455891
_Accounts & Finance Department, SGC Jahanian_`;
      } else if (style === "marks") {
        return `🏛️ *SUPERIOR COLLEGE JAHANIAN*
📊 *OFFICIAL ACADEMIC ASSESSMENT REPORT*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian ({{father}}),

• *Student Name:* {{name}}
• *Class / Group:* {{class}}
━━━━━━━━━━━━━━━━━━━━━━━━━
📝 *Test Performance:*
{{marks}}
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *Instruction:* Board imtehanat ki behtareen tayari ke liye regular revision aur attendance yaqeeni banayein.
📞 Academic Helpdesk: 0301-4455891
_Office of the Controller of Examinations, SGC Jahanian_`;
      } else if (style === "announcement") {
        return `🏛️ *SUPERIOR COLLEGE JAHANIAN*
📢 *OFFICIAL CAMPUS CIRCULAR*
━━━━━━━━━━━━━━━━━━━━━━━━━
Respected Parents & Students,

Ahem itlaa baraye {{name}} ({{class}}):
College academic schedule aur official directives ke mutabiq tamam classes aur institutional activities barwaqt munaqid hongi.

📞 Campus Helpdesk: 0301-4455891
_Office of the Principal, SGC Jahanian_`;
      } else if (style === "absent_staff") {
        return `🏛️ *SUPERIOR COLLEGE JAHANIAN*
⚠️ *FACULTY ATTENDANCE & PUNCTUALITY NOTICE*
━━━━━━━━━━━━━━━━━━━━━━━━━
Respected Faculty Member,

This is an administrative reminder regarding daily biometric reporting and strict adherence to class timetables. Punctuality is essential for academic excellence.

📞 Administration Office: 0301-4455891
_Office of the Vice Principal, SGC Jahanian_`;
      }
      return `🏛️ *SUPERIOR COLLEGE JAHANIAN*
📌 *OFFICIAL CAMPUS NOTIFICATION*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian ({{father}}),

• *Student Name:* {{name}}
• *Class / Group:* {{class}}
• *Status / Dues:* {{dues}}
━━━━━━━━━━━━━━━━━━━━━━━━━
Kisi bhi tasdeeq ya rehnumai ke liye campus office se rabta karein.
📞 Campus Helpdesk: 0301-4455891
_Administration Directorate, SGC Jahanian_`;
    };

    try {
      const statsContext = {
        studentCount: students.length,
        staffCount: staff.length,
        session: globalSettings.academicSession || "2026-28",
        collegeName: "Superior College Jahanian"
      };

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Respond ONLY with the drafted message text block ready to apply. Ensure you include dynamic placeholders ({{name}}, {{father}}, {{class}}, {{dues}}, {{marks}}). Prompt: ${promptInstruction}`,
          collegeContext: statsContext
        })
      });

      if (!response.ok) throw new Error("API not available");

      const resData = await response.json();
      if (resData.text && !resData.error) {
        setMessageText(resData.text.trim());
        toast.success("Nexus AI Template Compiled and Loaded!");
        addLog("Nexus AI successfully loaded compiled custom payload template.");
        setCustomAiPrompt("");
      } else {
        throw new Error(resData.error || "No text returned");
      }
    } catch (e: any) {
      const fallbackTemplate = getOfflineTemplate(prebuiltStyle);
      setMessageText(fallbackTemplate);
      toast.success("Standard Professional Template Applied!");
      addLog("Applied pre-built official template format with dynamic placeholders.");
      setCustomAiPrompt("");
    } finally {
      setIsAiComposing(false);
    }
  };

  const handleSendSingle = (phone: string, name: string) => {
    if (!phone) {
      toast.error("No phone number available for this contact.");
      return;
    }
    
    if (!messageText.trim()) {
      toast.error("Please enter/compose a message first.");
      return;
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      toast.error("Invalid phone number format.");
      return;
    }

    const personalized = getPersonalizedMessage(messageText, { name, phone, detail: "Contact" });
    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(personalized)}`;
    window.open(url, "_blank");
    toast.success(`Opening WhatsApp dialogue for ${name}`);
    addLog(`Direct browser web-dispatch launched for ${name} (${formattedPhone}).`);
  };

  const handleLoadQueueActive = () => {
    if (filteredRecipients.length === 0) {
      toast.error("Recipients pool is empty. Adjust filters first.");
      return;
    }
    
    const items: MessageQueueItem[] = filteredRecipients.map(recipient => ({
      id: recipient.id,
      name: recipient.name,
      phone: recipient.phone,
      resolvedMessage: applyAntiBanHash(getPersonalizedMessage(messageText, recipient), recipient.id),
      status: "queued" as const,
      detail: recipient.detail
    }));

    setQueueList(items);
    setTelemetryLogs([]);
    setBulkCurrentIndex(-1);
    setIsBatchPausing(false);
    addLog(`Compiled & Loaded ${items.length} personalized messages into the College WhatsApp Dispatch Queue.`);
    toast.success(`Loaded ${items.length} recipients into Send Queue!`);
  };

  useEffect(() => {
    if (!isBulkRunning || isBulkPaused) return;

    const executeSendStep = async () => {
      const nextIndex = bulkCurrentIndex + 1;
      
      if (nextIndex >= queueList.length) {
        setIsBulkRunning(false);
        setIsBulkPaused(false);
        setIsBatchPausing(false);
        setBulkCurrentIndex(-1);
        addLog("🏁 BROADCAST SEQUENCE COMPLETED! All queued messages processed through College WhatsApp.");
        toast.success("Bulk Broadcast Campaign Finished!");
        return;
      }

      // Check for Anti-Ban Batch Cooldown (Simulate natural human pause after every batchPauseInterval)
      if (enableBatchPause && nextIndex > 0 && nextIndex % batchPauseInterval === 0 && !isBatchPausing) {
        setIsBatchPausing(true);
        addLog(`☕ [Anti-Ban Cooldown] Batch milestone reached (${nextIndex} sent). Pausing for ${batchPauseDuration}s to protect College SIM from Meta detection...`);
        toast.info(`Anti-Ban Cooldown: Pausing for ${batchPauseDuration}s...`);

        let remaining = batchPauseDuration;
        setBatchPauseCountdown(remaining);

        const iv = setInterval(() => {
          remaining -= 1;
          setBatchPauseCountdown(remaining);
          if (remaining <= 0) {
            clearInterval(iv);
            setIsBatchPausing(false);
            addLog(`✅ Anti-Ban Cooldown completed. Resuming broadcast transmission...`);
            toast.success("Resuming broadcast sequence...");
          }
        }, 1000);
        return;
      }

      if (isBatchPausing) {
        return;
      }

      setBulkCurrentIndex(nextIndex);
      setQueueList(prev => prev.map((item, id) => id === nextIndex ? { ...item, status: "sending" } : item));
      const target = queueList[nextIndex];
      const formattedPhone = formatPhoneNumber(target.phone);
      
      // Smart human jitter: base delay + random variance between -1.5s and +2.5s
      const randomJitter = (Math.random() * 4 - 1.5);
      const actualDelayMs = Math.max(3000, Math.round((averageDelay + randomJitter) * 1000));
      
      addLog(`[Queue #${nextIndex + 1}/${queueList.length}] Preparing payload for ${target.name} (${formattedPhone})...`);
      addLog(`[Anti-Ban Jitter] Waiting ${(actualDelayMs / 1000).toFixed(1)}s before launching payload...`);

      timerRef.current = setTimeout(async () => {
        try {
          if (dispatchMode === "supervised") {
            const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(target.resolvedMessage)}`;
            window.open(url, "_blank");
            addLog(`[Supervised Web Tab] Launched WhatsApp dialogue for ${target.name}.`);
            setQueueList(prev => prev.map((item, id) => id === nextIndex ? { ...item, status: "sent" } : item));
          } else {
            // REAL TRANSMISSION VIA CONNECTED COLLEGE WHATSAPP QR SOCKET
            const res = await fetch("/api/whatsapp/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                phone: target.phone,
                message: target.resolvedMessage,
              }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
              addLog(`✅ [College QR Socket Delivered] Sent to ${target.name} (${formattedPhone}) - ID: ${data.messageId || "OK"}`);
              setQueueList(prev => prev.map((item, id) => id === nextIndex ? { ...item, status: "sent" } : item));
            } else {
              addLog(`❌ [Failed] Could not deliver to ${target.name} (${formattedPhone}): ${data.error || "Socket error"}`);
              setQueueList(prev => prev.map((item, id) => id === nextIndex ? { ...item, status: "failed", error: data.error } : item));
            }
          }
        } catch (err: any) {
          addLog(`❌ [Network Error] Target ${target.name}: ${err.message}`);
          setQueueList(prev => prev.map((item, id) => id === nextIndex ? { ...item, status: "failed", error: err.message } : item));
        }
      }, actualDelayMs);
    };

    executeSendStep();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isBulkRunning, isBulkPaused, isBatchPausing, bulkCurrentIndex, queueList, averageDelay, dispatchMode, enableBatchPause, batchPauseInterval, batchPauseDuration]);

  const handleStartBulk = () => {
    if (queueList.length === 0) {
      toast.error("Queue is empty. Click 'Link All to Send Queue' first.");
      return;
    }
    
    if (connectionState !== "connected" && dispatchMode === "simulated") {
      toast.warning("College WhatsApp is not connected. Please scan the QR code first!");
      setIsQRModalOpen(true);
      return;
    }

    setIsBulkPaused(false);
    setIsBatchPausing(false);
    setIsBulkRunning(true);
    addLog(`🚀 Broadcast Engine Initialized! Transmitting via ${dispatchMode === "simulated" ? "COLLEGE QR SOCKET" : "SUPERVISED WEB TAB"}.`);
    toast.success("Broadcast Engine is Running...");
  };

  const handlePauseBulk = () => {
    setIsBulkPaused(true);
    setIsBulkRunning(false);
    addLog("⏸ BROADCAST PAUSED by user.");
    toast.info("Broadcast Engine Paused.");
  };

  const handleClearQueue = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsBulkRunning(false);
    setIsBulkPaused(false);
    setBulkCurrentIndex(-1);
    setQueueList([]);
    addLog("🗑 Broadcast Queue cleared.");
    toast.info("Queue and counters reset.");
  };

  const totalSent = queueList.filter(item => item.status === "sent").length;
  const progressPercent = queueList.length > 0 ? (totalSent / queueList.length) * 100 : 0;

  // Classify audit log for Tab 3
  const classifyLog = (text: string) => {
    const lower = (text || "").toLowerCase();
    if (lower.includes("fee") || lower.includes("challan") || lower.includes("dues") || lower.includes("voucher") || lower.includes("baqaya") || lower.includes("installment")) {
      return { category: "Fees", color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800", label: "Fee Ledger", icon: DollarSign };
    }
    if (lower.includes("result") || lower.includes("mark") || lower.includes("test") || lower.includes("exam") || lower.includes("score") || lower.includes("number") || lower.includes("grade")) {
      return { category: "Results", color: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800", label: "Exam Result", icon: GraduationCap };
    }
    if (lower.includes("attendance") || lower.includes("hazri") || lower.includes("absent") || lower.includes("present") || lower.includes("leave") || lower.includes("chutti")) {
      return { category: "Attendance", color: "text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800", label: "Attendance", icon: Calendar };
    }
    if (lower.includes("admission") || lower.includes("dakhla") || lower.includes("apply") || lower.includes("eligib") || lower.includes("criteria") || lower.includes("merit")) {
      return { category: "Admissions", color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800", label: "Admissions", icon: BookOpen };
    }
    if (lower.includes("contact") || lower.includes("phone") || lower.includes("address") || lower.includes("timing") || lower.includes("location") || lower.includes("campus") || lower.includes("principal")) {
      return { category: "Campus Info", color: "text-cyan-700 bg-cyan-50 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800", label: "Campus Info", icon: Phone };
    }
    return { category: "General AI", color: "text-teal-700 bg-teal-50 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800", label: "General AI", icon: Sparkles };
  };

  // Bot Analytics Metrics
  const auditMetrics = useMemo(() => {
    const totalLogs = chatLogs.length;
    const incomingQueries = chatLogs.filter(l => l.direction === "incoming");
    const outgoingReplies = chatLogs.filter(l => l.direction === "outgoing");
    
    let verifiedQueriesCount = 0;
    let challengedCount = 0;
    let categoryCounts: Record<string, number> = {
      Fees: 0,
      Results: 0,
      Attendance: 0,
      Admissions: 0,
      "Campus Info": 0,
      "General AI": 0,
    };

    chatLogs.forEach(l => {
      const cls = classifyLog(l.text || "");
      if (categoryCounts[cls.category] !== undefined) {
        categoryCounts[cls.category]++;
      } else {
        categoryCounts["General AI"]++;
      }
      if (l.verifiedStudent) verifiedQueriesCount++;
      if ((l.text || "").includes("Verification Required") || (l.text || "").includes("Roll No")) {
        challengedCount++;
      }
    });

    return {
      totalLogs,
      incomingCount: incomingQueries.length,
      outgoingCount: outgoingReplies.length,
      totalQueriesProcessed: botStats?.totalQueriesProcessed || incomingQueries.length,
      verifiedCount: botStats?.verifiedSessions || verifiedQueriesCount,
      challengedCount: challengedCount,
      blockedCount: Math.max(0, challengedCount - verifiedQueriesCount),
      generalCount: categoryCounts["General AI"] + categoryCounts["Campus Info"],
      categoryCounts,
    };
  }, [chatLogs, botStats]);

  // Export CSV Audit Trail
  const handleExportAuditCsv = () => {
    if (chatLogs.length === 0) {
      toast.error("No chat logs available to export.");
      return;
    }
    const headers = ["Timestamp", "Direction", "Phone", "Sender/Student", "Verified Student", "Message Text"];
    const rows = chatLogs.map(l => [
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.direction}"`,
      `"${l.phone || ""}"`,
      `"${(l.senderName || "").replace(/"/g, '""')}"`,
      `"${(l.verifiedStudent || "").replace(/"/g, '""')}"`,
      `"${(l.text || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SCJ_Bot_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Audit Log CSV downloaded successfully!");
  };

  // 1-Click Open in Chat
  const handleOpenInChat = (phone: string) => {
    if (!phone) return;
    setSelectedChatPhone(phone);
    setActiveTab("messenger");
    toast.info(`Opened conversation for +${phone}`);
  };

  // Filtered logs for Tab 3 table
  const filteredDashboardLogs = useMemo(() => {
    return chatLogs.filter(l => {
      const cls = classifyLog(l.text || "");
      if (dashboardCategory !== "all" && cls.category.toLowerCase() !== dashboardCategory.toLowerCase()) {
        return false;
      }
      if (dashboardSearch.trim()) {
        const q = dashboardSearch.toLowerCase();
        const matchesPhone = (l.phone || "").toLowerCase().includes(q);
        const matchesSender = (l.senderName || "").toLowerCase().includes(q);
        const matchesVerified = (l.verifiedStudent || "").toLowerCase().includes(q);
        const matchesText = (l.text || "").toLowerCase().includes(q);
        return matchesPhone || matchesSender || matchesVerified || matchesText;
      }
      return true;
    });
  }, [chatLogs, dashboardCategory, dashboardSearch]);

  return (
    <div className="space-y-6 pb-10 w-full">
      
      {/* 1. TOP HEADER BANNER WITH EMBEDDED WHATSAPP GATEWAY BRIDGE */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#064e43] via-[#053d34] to-[#042822] text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> SCJ Automated Hybrid Suite
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold border border-amber-500/30">
                Session: 2026-28
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-white/90 rounded-full text-[11px] font-bold border border-white/10">
                <Bot className="w-3 h-3 text-emerald-300" /> Superior Nexus AI
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">SCJ WhatsApp & AI Center</h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm max-w-2xl font-medium">
              Live WhatsApp Desktop Gateway, dynamic fee and result card dispatches, and intelligent 360° AI Virtual Assistant.
            </p>
          </div>

          {/* EMBEDDED WHATSAPP GATEWAY BRIDGE IN HEADER */}
          <div className="flex items-center gap-3 shrink-0">
            {connectionState === "connected" ? (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shadow-inner">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider">GATEWAY LINKED</span>
                      <ShieldCheck size={12} className="text-emerald-300" />
                    </div>
                    <p className="text-xs font-mono font-bold text-white leading-tight">{connectedPhone || "+92 301 4455891"}</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-2.5 py-1 text-[11px] font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 rounded-lg transition"
                  title="Disconnect WhatsApp Device"
                >
                  Unlink
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10">
                  <span className={`w-2 h-2 rounded-full ${connectionState === "qr_ready" ? "bg-amber-400 animate-pulse" : "bg-slate-400"}`} />
                  <span className="text-xs font-bold text-emerald-100">
                    {connectionState === "connecting" ? "CONNECTING..." : connectionState === "qr_ready" ? "QR CODE READY" : "GATEWAY STANDBY"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsQRModalOpen(true);
                    if (!serverQrCode) handleConnectWhatsApp(false);
                  }}
                  className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-1.5 active:scale-95"
                >
                  <QrCode size={15} /> Link WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. DEDICATED QR MODAL (POPS UP WHEN LINKING WHATSAPP) */}
      <AnimatePresence>
        {isQRModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">
                      Official WhatsApp Gateway
                    </h3>
                    <p className="text-[10px] text-slate-400">Superior College Jahanian</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQRModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              {connectionState === "connected" ? (
                <div className="py-6 space-y-3 text-center">
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-800 dark:text-white">Device Successfully Linked!</h4>
                    <p className="text-sm font-mono font-bold text-emerald-600 mt-0.5">{connectedPhone || "+92 301 4455891"}</p>
                    <p className="text-xs text-slate-500 mt-1">{connectedName || "Official Gateway Online"}</p>
                  </div>
                  <button
                    onClick={() => setIsQRModalOpen(false)}
                    className="w-full mt-4 py-2.5 bg-[#064e43] hover:bg-[#053d34] text-white font-bold text-xs rounded-xl transition"
                  >
                    Done
                  </button>
                </div>
              ) : serverQrCode ? (
                <div className="space-y-4 text-center">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Scan this QR Code on your Mobile WhatsApp
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      WhatsApp &gt; Settings / Menu (⋮) &gt; <b>Linked Devices</b> &gt; <b>Link a Device</b>
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 inline-block">
                    <img src={serverQrCode} alt="WhatsApp QR Code" className="w-56 h-56 object-contain rounded-lg mx-auto" />
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleConnectWhatsApp(true)}
                      disabled={isConnectingSocket}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isConnectingSocket ? "animate-spin" : ""}`} /> Refresh QR Code
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 space-y-4 text-center">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <WifiOff className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-500 max-w-[280px] mx-auto">
                    Click below to start the Baileys socket gateway and display your live WhatsApp pairing QR code.
                  </p>
                  <button
                    onClick={() => handleConnectWhatsApp(false)}
                    disabled={isConnectingSocket}
                    className="w-full py-2.5 bg-[#064e43] hover:bg-[#053d34] text-white rounded-xl text-xs font-black shadow transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isConnectingSocket ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Generating QR Code...
                      </>
                    ) : (
                      <>
                        <QrCode size={15} /> Generate WhatsApp QR Code
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2b. DEDICATED FACULTY / ADMIN AUTHORIZATION MODAL */}
      <AnimatePresence>
        {isLinkingFacultyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">
                      Authorize WhatsApp Faculty Desk
                    </h3>
                    <p className="text-[10px] text-slate-400">Pre-link a Teacher or Admin for automated Bot Access</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLinkingFacultyModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleQuickLinkStaff} className="space-y-4">
                {/* Pick from Staff list */}
                {staff && staff.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Select From Staff Directory (Auto-Fill)
                    </label>
                    <select
                      value={selectedStaffIdToLink}
                      onChange={(e) => {
                        const sId = e.target.value;
                        setSelectedStaffIdToLink(sId);
                        const matched = staff.find((s: any) => s.id === sId);
                        if (matched) {
                          setManualLinkName(matched.fullName || matched.name || "");
                          setManualLinkPhone(matched.contact || matched.phone || "");
                          setManualLinkRole(matched.role || "Teacher");
                          setManualLinkDesignation(matched.designation || matched.role || "");
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#064e43]"
                    >
                      <option value="">-- Choose a Staff Member (or enter manually below) --</option>
                      {staff.map((st: any) => (
                        <option key={st.id} value={st.id}>
                          {st.fullName || st.name} ({st.role || "Faculty"}) {st.contact ? `- ${st.contact}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={manualLinkName}
                      onChange={(e) => setManualLinkName(e.target.value)}
                      placeholder="e.g. Prof. Tariq Mahmood"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#064e43]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      WhatsApp Mobile Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={manualLinkPhone}
                      onChange={(e) => setManualLinkPhone(e.target.value)}
                      placeholder="0300-1234567"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#064e43]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Role Category
                    </label>
                    <select
                      value={manualLinkRole}
                      onChange={(e) => setManualLinkRole(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#064e43]"
                    >
                      <option value="Teacher">Teacher / Faculty</option>
                      <option value="Principal">Principal / Executive</option>
                      <option value="Admin">Administrator / Sub-Admin</option>
                      <option value="Staff">Office / General Staff</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Designation / Department
                    </label>
                    <input
                      type="text"
                      value={manualLinkDesignation}
                      onChange={(e) => setManualLinkDesignation(e.target.value)}
                      placeholder="e.g. HOD Physics / Vice Principal"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#064e43]"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                  💡 <b>Frictionless Access:</b> Once linked here, this staff member will NOT need any OTP. When they message the college WhatsApp number, the bot will immediately recognize them by name and provide Faculty features.
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLinkingFacultyModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#064e43] hover:bg-[#053d34] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <CheckCircle size={14} /> Authorize WhatsApp Desk
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. UNIFIED 3-TAB NAVIGATION BAR */}
      <div className="bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm p-1.5 rounded-2xl flex items-center gap-2">
        <button
          onClick={() => setActiveTab("messenger")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
            activeTab === "messenger" 
              ? "bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white shadow-md" 
              : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <MessageSquare size={16} />
          <span>WhatsApp Web & 360° Bot</span>
          {groupedConversations.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "messenger" ? "bg-white text-emerald-950 font-mono" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono"
            }`}>
              {groupedConversations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("broadcaster")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
            activeTab === "broadcaster" 
              ? "bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white shadow-md" 
              : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Send size={16} />
          <span>Broadcast & AI Composer</span>
          {queueList.length > 0 && (
            <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-bold font-mono">
              {queueList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("bot_dashboard")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
            activeTab === "bot_dashboard" 
              ? "bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white shadow-md" 
              : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <BarChart3 size={16} />
          <span>Bot Intelligence & Analytics</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === "bot_dashboard" ? "bg-emerald-300 text-slate-950" : "bg-teal-500/10 text-teal-600 dark:text-teal-400"
          }`}>
            Nexus AI
          </span>
        </button>

        <button
          onClick={() => setActiveTab("automated_reports")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
            activeTab === "automated_reports" 
              ? "bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white shadow-md" 
              : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <CalendarCheck size={16} />
          <span>Principal Auto-Reports</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === "automated_reports" ? "bg-emerald-300 text-slate-950" : "bg-teal-500/10 text-teal-600 dark:text-teal-400"
          }`}>
            Auto-Digest
          </span>
        </button>

        <button
          onClick={() => setActiveTab("ai_executive")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
            activeTab === "ai_executive" 
              ? "bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white shadow-md" 
              : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <ShieldCheck size={16} />
          <span>AI Executive & Delegation</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === "ai_executive" ? "bg-amber-300 text-slate-950 font-black" : "bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold"
          }`}>
            Biometrics & OTP
          </span>
        </button>
      </div>

      {/* 4. MAIN VIEWS SWITCHER */}
      <AnimatePresence mode="wait">
        
        {/* ========================================================================= */}
        {/* TAB 1: WHATSAPP WEB & 360° BOT (FULL-WIDTH EXTENDED VIEW MATCHING SS4)   */}
        {/* ========================================================================= */}
        {activeTab === "messenger" && (
          <motion.div
            key="tab-messenger-fullwidth"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden"
          >
            {/* WhatsApp Top Branding Strip */}
            <div className="bg-[#064e43] text-white px-5 py-3 flex items-center justify-between border-b border-[#053d34]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black tracking-wide">Superior WhatsApp Web & 360° Bot</h2>
                    <span className="bg-emerald-400/20 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                      {connectionState === "connected" ? "LIVE SYNC" : "OFFLINE"}
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-100/70">
                    Official Two-Way Live WhatsApp Gateway • Superior College Jahanian
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Bot 360 Toggle Switch */}
                <div className="flex items-center gap-2 bg-black/20 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10">
                  <Bot size={15} className={isBotEnabled ? "text-emerald-300" : "text-slate-300"} />
                  <span className="text-xs font-black tracking-wider uppercase text-white/90">
                    360° Bot:
                  </span>
                  <button
                    onClick={() => handleToggleBot(!isBotEnabled)}
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider transition shadow-xs ${
                      isBotEnabled
                        ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                        : "bg-rose-500/80 text-white hover:bg-rose-500"
                    }`}
                  >
                    {isBotEnabled ? "ACTIVE" : "PAUSED"}
                  </button>
                </div>

                <button
                  onClick={fetchChatLogs}
                  disabled={isLoadingChatLogs}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={isLoadingChatLogs ? "animate-spin" : ""} />
                  Sync
                </button>
                {chatLogs.length > 0 && (
                  <button
                    onClick={handleClearChatLogs}
                    className="px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-100 rounded-xl text-xs font-bold transition flex items-center gap-1"
                    title="Clear all stored logs"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* 2-Pane Chat Layout: Full Width, Expansive Height matching WhatsApp Desktop ss4 */}
            <div className="flex flex-col md:flex-row h-[760px] min-h-[700px] overflow-hidden bg-white dark:bg-slate-900">
              
              {/* LEFT PANE: CONTACTS & RECENT CONVERSATIONS LIST (~380px wide) */}
              <div className={`w-full md:w-84 lg:w-96 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/70 dark:bg-slate-950 min-h-0 ${
                selectedChatPhone ? "hidden md:flex" : "flex"
              }`}>
                
                {/* Contacts Search Bar & Filter Pills */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 shrink-0">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={chatSearchQuery}
                      onChange={e => setChatSearchQuery(e.target.value)}
                      placeholder="Search or start new chat..."
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-600 font-sans"
                    />
                    {chatSearchQuery && (
                      <button
                        onClick={() => setChatSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills (All / Verified / Incoming) */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      onClick={() => setChatFilterMode("all")}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                        chatFilterMode === "all"
                          ? "bg-[#064e43] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      All ({groupedConversations.length})
                    </button>
                    <button
                      onClick={() => setChatFilterMode("verified")}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 ${
                        chatFilterMode === "verified"
                          ? "bg-[#064e43] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      <ShieldCheck size={12} className="text-emerald-500" /> Verified
                    </button>
                    <button
                      onClick={() => setChatFilterMode("incoming")}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                        chatFilterMode === "incoming"
                          ? "bg-[#064e43] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      Incoming
                    </button>
                  </div>
                </div>

                {/* Contacts Scrollable List */}
                <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <Users size={32} className="mx-auto opacity-40 text-slate-400" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No conversations found</p>
                      <p className="text-[11px] text-slate-400">
                        Incoming messages and parent queries will automatically stream here in real time.
                      </p>
                    </div>
                  ) : (
                    filteredConversations.map(conv => {
                      const isSelected = selectedChatPhone === conv.phone;
                      const formattedTime = new Date(conv.lastTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                      return (
                        <div
                          key={conv.phone}
                          onClick={() => setSelectedChatPhone(conv.phone)}
                          className={`p-3.5 transition cursor-pointer flex items-start gap-3 relative ${
                            isSelected 
                              ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-l-4 border-[#064e43]" 
                              : "hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          {/* Avatar */}
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                            isSelected 
                              ? "bg-[#064e43] text-white" 
                              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                          }`}>
                            {conv.studentName ? conv.studentName.slice(0, 1).toUpperCase() : <User size={18} />}
                          </div>

                          {/* Contact Details */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
                                {conv.studentName || `+${conv.phone}`}
                              </h4>
                              <span className="text-[10px] text-slate-400 shrink-0 font-mono ml-1">
                                {formattedTime}
                              </span>
                            </div>

                            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                              +{conv.phone}
                              {conv.className && (
                                <span className="font-sans text-slate-400 dark:text-slate-500 font-medium">
                                  • {conv.className}
                                </span>
                              )}
                            </p>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate line-clamp-1">
                              {conv.direction === "outgoing" && (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold mr-1">You:</span>
                              )}
                              {conv.lastMessage}
                            </p>

                            {conv.verifiedStudent && (
                              <div className="pt-0.5">
                                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-800">
                                  <ShieldCheck size={10} className="text-emerald-600" /> Verified: {conv.verifiedStudent}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT PANE: EXPANSIVE CHAT THREAD VIEW (FULL WIDTH EXPANDED) */}
              <div className={`flex-1 min-w-0 flex flex-col bg-[#efeae2]/50 dark:bg-slate-900/60 relative min-h-0 ${
                !selectedChatPhone ? "hidden md:flex" : "flex"
              }`}>
                
                {selectedChatPhone ? (
                  <>
                    {/* Active Chat Header */}
                    {(() => {
                      const activeConv = groupedConversations.find(c => c.phone === selectedChatPhone);
                      return (
                        <div className="p-3.5 bg-[#f0f2f5] dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 shadow-sm">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedChatPhone(null)}
                              className="md:hidden p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition"
                              title="Back to contacts"
                            >
                              <ArrowLeft size={18} />
                            </button>

                            <div className="w-10 h-10 rounded-full bg-[#064e43] text-white flex items-center justify-center font-bold text-sm shadow shrink-0">
                              {activeConv?.studentName ? activeConv.studentName.slice(0, 1).toUpperCase() : <User size={18} />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 truncate">
                                <h3 className="text-sm font-black text-slate-800 dark:text-white truncate">
                                  {activeConv?.studentName || `Parent / Contact`}
                                </h3>
                                {activeConv?.verifiedStudent && (
                                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                    <ShieldCheck size={11} /> Verified
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                                +{selectedChatPhone}
                                {activeConv?.fatherName && <span className="font-sans text-slate-600 dark:text-slate-300 ml-1.5">• Walid: {activeConv.fatherName}</span>}
                                {activeConv?.className && <span className="font-sans text-slate-600 dark:text-slate-300 ml-1.5">• Class: {activeConv.className}</span>}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleDeleteConversation(selectedChatPhone)}
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
                              title="Delete Conversation Thread"
                            >
                              <Trash2 size={16} />
                            </button>
                            <a
                              href={`https://web.whatsapp.com/send?phone=${selectedChatPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                              title="Open in WhatsApp Web"
                            >
                              <ExternalLink size={16} />
                            </a>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Chat Messages Body with Smooth Scrollbar & WhatsApp Pattern */}
                    <div 
                      ref={chatContainerRef}
                      className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-[#efeae2]/60 dark:bg-slate-950/60 select-text"
                      style={{ overscrollBehavior: 'contain' }}
                    >
                      {activeConversationMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center p-8 text-slate-400">
                          <p className="text-xs">No message logs recorded yet for this conversation.</p>
                        </div>
                      ) : (
                        activeConversationMessages.map((msg: any) => {
                          const isOutgoing = msg.direction === "outgoing";
                          const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          const senderName = isOutgoing ? "Superior Nexus Bot / Admin" : "Parent / Student";

                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOutgoing ? "justify-end" : "justify-start"} animate-in fade-in duration-150 group relative`}
                              onMouseEnter={() => setHoveredMessageId(msg.id)}
                              onMouseLeave={() => setHoveredMessageId(null)}
                            >
                              <div
                                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-sm relative text-xs leading-relaxed space-y-1.5 ${
                                  isOutgoing
                                    ? "bg-[#d9fdd3] dark:bg-[#054640] text-slate-900 dark:text-slate-100 rounded-tr-none border border-[#b2e59e]/60 dark:border-emerald-700/50"
                                    : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {/* Quick Message Actions (Reply, Copy, Delete) */}
                                <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs px-1.5 py-0.5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                  <button
                                    onClick={() => {
                                      setReplyingToMessage({
                                        id: msg.id,
                                        text: msg.text,
                                        sender: senderName,
                                      });
                                      toast.info(`Quoting message from ${senderName}`);
                                    }}
                                    className="p-1 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-500 rounded transition"
                                    title="Reply / Quote"
                                  >
                                    <Reply size={12} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(msg.text);
                                      toast.success("Copied to clipboard!");
                                    }}
                                    className="p-1 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-500 rounded transition"
                                    title="Copy text"
                                  >
                                    <Copy size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSingleMessage(msg.id)}
                                    className="p-1 hover:text-red-600 text-slate-400 rounded transition"
                                    title="Delete message"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>

                                {/* Sender Label */}
                                <div className="flex items-center justify-between gap-2 pb-0.5 border-b border-black/5 dark:border-white/5 text-[10px]">
                                  <span className={`font-black ${isOutgoing ? "text-emerald-900 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}`}>
                                    {isOutgoing ? "🏛️ Superior Nexus AI / Admin" : "Parent / Student"}
                                  </span>
                                  {msg.verifiedStudent && (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold border border-emerald-300 dark:border-emerald-800">
                                      {msg.verifiedStudent}
                                    </span>
                                  )}
                                </div>

                                {/* Text Content */}
                                <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                                  {msg.text}
                                </p>

                                {/* Timestamp & Double Check */}
                                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 dark:text-slate-400 pt-0.5 font-mono">
                                  <span>{time}</span>
                                  {isOutgoing && (
                                    <CheckCheck size={13} className="text-sky-600 inline" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Quoted Message Preview Bar (when replying) */}
                    {replyingToMessage && (
                      <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/50 border-t border-emerald-200/80 dark:border-emerald-800 flex items-center justify-between gap-2 shrink-0 animate-in slide-in-from-bottom-2 duration-150">
                        <div className="border-l-4 border-emerald-600 pl-2.5 min-w-0">
                          <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                            Replying to {replyingToMessage.sender}
                          </span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 truncate italic">
                            "{replyingToMessage.text}"
                          </p>
                        </div>
                        <button
                          onClick={() => setReplyingToMessage(null)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/50 transition shrink-0"
                          title="Cancel reply"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}

                    {/* Quick Presets Drawer */}
                    <div className="px-4 py-2 bg-[#f0f2f5] dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">
                        Quick Inquiries:
                      </span>
                      {[
                        "FEE Status Check",
                        "Exam Marks Report",
                        "Attendance Record",
                        "Admissions Criteria 2026",
                        "Assalam-o-Alaikum! Khush-amdeed",
                      ].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setReplyInputText(preset)}
                          className="text-[11px] font-medium bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-800 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-200 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-600 shrink-0 transition shadow-2xs"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    {/* Interactive Message Input Box */}
                    <div className="p-3.5 bg-[#f0f2f5] dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        value={replyInputText}
                        onChange={(e) => setReplyInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendManualChatReply();
                          }
                        }}
                        placeholder={replyingToMessage ? `Replying to ${replyingToMessage.sender}...` : `Type reply to +${selectedChatPhone} or press Enter...`}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#064e43] shadow-inner"
                      />
                      <button
                        onClick={handleSendManualChatReply}
                        disabled={isSendingReply || !replyInputText.trim()}
                        className="h-10 px-5 bg-[#064e43] hover:bg-[#053d34] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow active:scale-95 disabled:opacity-50"
                      >
                        <Send size={14} />
                        <span>{isSendingReply ? "Sending..." : "Send"}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* No Chat Selected State (WhatsApp Desktop style) */
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 text-slate-400 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-[#064e43] dark:text-emerald-400">
                      <MessageSquare size={32} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                        Superior WhatsApp Web & Desktop Gateway
                      </h3>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Select any parent or student number on the left panel to inspect their live conversation history, verification state, and send instant replies.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BROADCAST & AI COMPOSER (SIMPLE YET ADVANCED REAL-TIME WORKSPACE) */}
        {/* ========================================================================= */}
        {activeTab === "broadcaster" && (
          <motion.div
            key="tab-broadcaster-workspace"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* TOP IDENTITY & ANTI-BAN STATUS STRIP */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 transition-all ${
                  connectionState === "connected" 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-inner" 
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                }`}>
                  {connectionState === "connected" ? <Wifi size={24} /> : <WifiOff size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {connectionState === "connected" ? (
                        <>College WhatsApp: <span className="font-mono text-emerald-600 dark:text-emerald-400">+{connectedPhone || "Connected"}</span></>
                      ) : (
                        <>College WhatsApp Disconnected</>
                      )}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                      connectionState === "connected" 
                        ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${connectionState === "connected" ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`} />
                      {connectionState === "connected" ? "QR Socket Ready (Real Dispatch)" : "Scan QR Code"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {connectionState === "connected" 
                      ? "All messages will be dispatched directly through the college's authenticated WhatsApp number." 
                      : "Please scan the QR code to link college WhatsApp before launching broadcasts."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {connectionState !== "connected" && (
                  <button
                    onClick={() => handleConnectWhatsApp()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow active:scale-95"
                  >
                    <QrCode size={15} /> Scan QR Code
                  </button>
                )}

                {/* Anti-Ban Shield Active Badge */}
                <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2 rounded-2xl shadow-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest flex items-center gap-1">
                      <span>Anti-Ban Shield</span>
                      <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded">ACTIVE</span>
                    </div>
                    <div className="text-[9px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
                      Smart Jitter (±2s) • Auto-Cooldown ({batchPauseDuration}s / {batchPauseInterval} msgs) • Unique Hash
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK PRESET CHIPS BAR */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap mr-1 flex items-center gap-1">
                <Sparkles size={13} className="text-amber-500" /> Presets:
              </span>
              <button
                onClick={() => handleAiCompose("fee_dues")}
                disabled={isAiComposing}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 shadow-sm whitespace-nowrap active:scale-95"
              >
                <DollarSign size={13} className="text-emerald-500" /> Fee Dues Notice
              </button>
              <button
                onClick={() => handleAiCompose("marks")}
                disabled={isAiComposing}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 shadow-sm whitespace-nowrap active:scale-95"
              >
                <GraduationCap size={13} className="text-blue-500" /> Exam Results
              </button>
              <button
                onClick={() => handleAiCompose("announcement")}
                disabled={isAiComposing}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 shadow-sm whitespace-nowrap active:scale-95"
              >
                <Clock size={13} className="text-cyan-500" /> Campus Circular
              </button>
              <button
                onClick={() => handleAiCompose("missing_photos")}
                disabled={isAiComposing}
                className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-200 transition flex items-center gap-1.5 shadow-sm whitespace-nowrap active:scale-95"
              >
                <Camera size={13} className="text-amber-600" /> 📸 Request Missing Photos ({missingPhotosCount})
              </button>
              <button
                onClick={() => handleAiCompose("absent_staff")}
                disabled={isAiComposing}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 shadow-sm whitespace-nowrap active:scale-95"
              >
                <AlertTriangle size={13} className="text-purple-500" /> Faculty Notice
              </button>
            </div>

            {/* MAIN TWO-COLUMN WORKSPACE: LEFT = FILTERS + INTERACTIVE ROSTER, RIGHT = COMPOSER + LIVE PREVIEW + ENGINE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* ─── LEFT COLUMN (5 COLS): AUDIENCE FILTERS & INTERACTIVE CLICK-TO-PREVIEW ROSTER ─── */}
              <div className="lg:col-span-5 space-y-5">
                
                {/* 1. AUDIENCE & SECTION FILTER CARD */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#064e43]/10 text-[#064e43] dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Sliders size={16} />
                      </div>
                      <div>
                        <h2 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">Audience & Section Filter</h2>
                        <p className="text-[10px] text-slate-400">Target Specific Classes, Sections, or Defaulters</p>
                      </div>
                    </div>

                    <span className="font-mono font-black text-xs text-[#064e43] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-sm">
                      {filteredRecipients.length} READY
                    </span>
                  </div>

                  {/* Target Group Selector */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      Target Audience Group
                    </label>
                    <select
                      value={targetGroup}
                      onChange={(e) => {
                        setTargetGroup(e.target.value as any);
                        setSearchQuery("");
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl h-10 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#064e43] outline-none transition-all"
                    >
                      <option value="All Students">All Students (Full Roster)</option>
                      <option value="Missing Photos">📸 Missing Photos / ID Card Prep ({missingPhotosCount} Students)</option>
                      <option value="Class Wise">Class & Section Wise</option>
                      <option value="Fee Defaulters">Fee Defaulters (Pending Dues Only)</option>
                      <option value="Selective Students">Selective Students (Pick from List)</option>
                      <option value="Staff">College Staff / Faculty</option>
                      <option value="Custom Numbers">Custom Phone Numbers</option>
                    </select>
                  </div>

                  {/* 3-Way Grid: Class, Section (NEW!), and Campus */}
                  {(targetGroup === "All Students" || targetGroup === "Class Wise" || targetGroup === "Fee Defaulters" || targetGroup === "Missing Photos") && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      {/* Class Filter */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                          Class
                        </label>
                        <select
                          value={selectedClass}
                          onChange={(e) => {
                            setSelectedClass(e.target.value);
                            setSelectedSection("All Sections");
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl h-9 px-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#064e43] outline-none"
                        >
                          <option value="All Classes">All Classes</option>
                          {classes.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* SECTION FILTER (EXACT REQUIREMENT!) */}
                      <div>
                        <label className="block text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Section</span>
                          <span className="text-[9px] font-mono">({sections.length})</span>
                        </label>
                        <select
                          value={selectedSection}
                          onChange={(e) => setSelectedSection(e.target.value)}
                          className="w-full bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl h-9 px-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="All Sections">All Sections</option>
                          {sections.map(sec => (
                            <option key={sec} value={sec}>Sec: {sec}</option>
                          ))}
                        </select>
                      </div>

                      {/* Campus Filter */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                          Campus
                        </label>
                        <select
                          value={selectedGender}
                          onChange={(e) => setSelectedGender(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl h-9 px-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#064e43] outline-none"
                        >
                          <option value="All">All Campuses</option>
                          <option value="Male">Boys Campus</option>
                          <option value="Female">Girls Campus</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Selective Students Mode */}
                  {targetGroup === "Selective Students" && (
                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600 dark:text-slate-300">
                          Selected: <b className="text-emerald-700 dark:text-emerald-400 font-mono">{selectedStudentIds.size}</b> students
                        </span>
                        <div className="flex items-center gap-2 text-[10px] font-bold">
                          <button onClick={selectAllVisibleStudents} className="text-emerald-700 dark:text-emerald-400 hover:underline">Select All</button>
                          <span>|</span>
                          <button onClick={deselectAllStudents} className="text-red-500 hover:underline">Clear</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom Numbers Mode */}
                  {targetGroup === "Custom Numbers" && (
                    <div className="pt-1">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Formatted Mobile Numbers (One Per Line)
                      </label>
                      <textarea
                        value={customNumbers}
                        onChange={(e) => setCustomNumbers(e.target.value)}
                        placeholder="e.g.&#10;03014455891&#10;03120000000"
                        className="w-full h-24 resize-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono tracking-wider outline-none focus:ring-2 focus:ring-[#064e43] transition-all text-slate-700 dark:text-slate-200"
                      />
                    </div>
                  )}

                  {/* Real-time search box */}
                  <div className="relative pt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student, father, roll, section..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#064e43] transition-all text-slate-700 dark:text-slate-200"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. INTERACTIVE STUDENT ROSTER (CLICK ANY STUDENT TO PREVIEW IN REAL TIME) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={14} className="text-[#064e43] dark:text-emerald-400" />
                        <span>Matching Directory</span>
                      </h3>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                        👉 Click any student to preview their live message
                      </p>
                    </div>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-black">
                      {filteredRecipients.length} Students
                    </span>
                  </div>

                  {/* Scrollable Student Cards */}
                  <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1">
                    {filteredRecipients.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                        <Users size={32} className="mb-2 opacity-50" />
                        <p className="text-xs font-bold">No students match current filters.</p>
                        <p className="text-[10px] mt-1 text-slate-500">Try selecting "All Sections" or clearing search.</p>
                      </div>
                    ) : (
                      filteredRecipients.map((recipient) => {
                        const isSelectedForPreview = activePreviewRecipient?.id === recipient.id;
                        const hasDues = Number(recipient.dues || 0) > 0;

                        return (
                          <div
                            key={recipient.id}
                            onClick={() => setSelectedPreviewStudentId(recipient.id)}
                            className={`p-3 rounded-2xl cursor-pointer transition-all border flex items-center justify-between gap-3 ${
                              isSelectedForPreview
                                ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 overflow-hidden border ${
                                isSelectedForPreview
                                  ? "border-emerald-500 shadow-sm ring-2 ring-emerald-400/40"
                                  : "border-slate-200 dark:border-slate-700"
                              }`}>
                                {recipient.photo ? (
                                  <img src={recipient.photo} alt="" className="w-full h-full object-cover object-[center_top] rounded-full" />
                                ) : (
                                  <span className={isSelectedForPreview ? "bg-emerald-600 text-white w-full h-full flex items-center justify-center" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 w-full h-full flex items-center justify-center"}>
                                    {recipient.name ? recipient.name[0].toUpperCase() : "S"}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                    {recipient.name}
                                  </span>
                                  {/* Section Badge (NEW!) */}
                                  <span className="px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono font-bold text-[9px] border border-teal-200 dark:border-teal-800">
                                    Sec: {recipient.section || "A"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate">
                                  s/o {recipient.father} • Roll: <span className="font-mono">{recipient.rollNo}</span>
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-1">
                              {hasDues ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  Rs. {Number(recipient.dues).toLocaleString()}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Clear ✅
                                </span>
                              )}

                              {isSelectedForPreview && (
                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                  <CheckCircle2 size={10} /> Active Preview
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* ─── RIGHT COLUMN (7 COLS): TEMPLATE COMPOSER + REAL-TIME WHATSAPP LIVE PREVIEW + ENGINE ─── */}
              <div className="lg:col-span-7 space-y-5">

                {/* 1. MESSAGE COMPOSER & DYNAMIC VARIABLE CHIPS */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={15} className="text-[#064e43] dark:text-emerald-400" />
                        <span>Message Pattern Workspace</span>
                      </h3>
                      <p className="text-[10px] text-slate-400">Insert dynamic variables or draft custom reminders</p>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400">
                      {messageText.length} chars
                    </div>
                  </div>

                  {/* Clickable Variable Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-center mr-1">Insert:</span>
                    <button
                      onClick={() => handleInsertVariable("{{name}}")}
                      className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 rounded-lg text-[10px] font-bold transition font-mono border border-slate-200 dark:border-slate-700"
                    >
                      + {"{{name}}"}
                    </button>
                    <button
                      onClick={() => handleInsertVariable("{{father}}")}
                      className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 rounded-lg text-[10px] font-bold transition font-mono border border-slate-200 dark:border-slate-700"
                    >
                      + {"{{father}}"}
                    </button>
                    <button
                      onClick={() => handleInsertVariable("{{rollNo}}")}
                      className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 rounded-lg text-[10px] font-bold transition font-mono border border-slate-200 dark:border-slate-700"
                    >
                      + {"{{rollNo}}"}
                    </button>
                    <button
                      onClick={() => handleInsertVariable("{{section}}")}
                      className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg text-[10px] font-bold transition font-mono border border-emerald-300 dark:border-emerald-800"
                    >
                      + {"{{section}}"}
                    </button>
                    <button
                      onClick={() => handleInsertVariable("{{class}}")}
                      className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 rounded-lg text-[10px] font-bold transition font-mono border border-slate-200 dark:border-slate-700"
                    >
                      + {"{{class}}"}
                    </button>
                    <button
                      onClick={() => handleInsertVariable("{{dues}}")}
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-lg text-[10px] font-bold transition font-mono border border-amber-300 dark:border-amber-800"
                    >
                      + {"{{dues}}"}
                    </button>
                    <button
                      onClick={() => handleInsertVariable("{{marks}}")}
                      className="px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded-lg text-[10px] font-bold transition font-mono border border-blue-300 dark:border-blue-800"
                    >
                      + {"{{marks}}"}
                    </button>
                  </div>

                  {/* Main Pattern Textarea */}
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message template here. Live preview below will update immediately as you type..."
                    className="w-full h-32 resize-none bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#064e43] font-sans leading-relaxed shadow-inner"
                  />

                  {/* AI Prompt Input Bar */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={customAiPrompt}
                      onChange={(e) => setCustomAiPrompt(e.target.value)}
                      placeholder="Ask Nexus AI: e.g. Write an urgent reminder for Section MEPB fee defaulters..."
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#064e43]"
                    />
                    <button
                      onClick={() => handleAiCompose()}
                      disabled={isAiComposing}
                      className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-[#064e43] hover:from-emerald-700 hover:to-[#053d34] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      {isAiComposing ? <RefreshCw size={13} className="animate-spin" /> : <Wand2 size={13} />}
                      <span>Compose with AI</span>
                    </button>
                  </div>
                </div>

                {/* 2. REAL-TIME WHATSAPP LIVE PHONE PREVIEW (STAR FEATURE!) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
                  
                  {/* WhatsApp Header Bar */}
                  <div className="bg-[#075E54] dark:bg-[#1f2c34] text-white p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-black text-xs text-emerald-200">
                        SCJ
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black tracking-wide">Superior College Jahanian</h4>
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        </div>
                        <p className="text-[10px] text-emerald-100/80">
                          Live Personalized Message Preview • <span className="font-mono text-white">online</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSendTestToPreviewStudent}
                        disabled={isSendingTestPreview || !activePreviewRecipient}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow active:scale-95 disabled:opacity-50"
                        title="Send this exact message to this student's WhatsApp number right now"
                      >
                        {isSendingTestPreview ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <Send size={13} />
                        )}
                        <span>Test Send to Student</span>
                      </button>
                    </div>
                  </div>

                  {/* Chat Wallpaper & Live Message Bubble */}
                  <div className="bg-[#efeae2] dark:bg-[#0b141a] p-5 min-h-[220px] max-h-[360px] overflow-y-auto space-y-3 relative">
                    <div className="flex justify-center">
                      <span className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-[10px] text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full shadow-sm font-medium">
                        TODAY (REAL-TIME PREVIEW)
                      </span>
                    </div>

                    {activePreviewRecipient ? (
                      <div className="flex flex-col items-start max-w-[92%]">
                        <div className="bg-white dark:bg-[#202c33] text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none p-4 shadow-md border border-black/5 dark:border-white/5 space-y-2 relative">
                          <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 pb-1 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <span>Official Broadcast Desk</span>
                            <span className="font-mono text-slate-400">To: {activePreviewRecipient.phone}</span>
                          </div>

                          {/* Rendered live message text with formatted line breaks */}
                          <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans select-text">
                            {getPersonalizedMessage(messageText, activePreviewRecipient)}
                          </div>

                          {/* Anti-Ban Reference Signature */}
                          {enableAntiBanHash && (
                            <div className="text-[9px] font-mono text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-700/60">
                              _Ref: #SGCJ-{activePreviewRecipient.id ? activePreviewRecipient.id.slice(-4).toUpperCase() : "TEST"}_ (Anti-Ban Token)
                            </div>
                          )}

                          <div className="flex justify-end items-center gap-1 pt-1 text-[9px] text-slate-400">
                            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <CheckCheck size={13} className="text-cyan-500" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs font-bold">
                        No recipient selected for preview.
                      </div>
                    )}
                  </div>

                  {/* Preview Navigation & Student Details Bar */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 px-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Previewing:</span>
                      <span className="font-black text-slate-800 dark:text-white">
                        {activePreviewRecipient?.name || "None"}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-mono text-[10px] font-bold">
                        Sec: {activePreviewRecipient?.section || "A"}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        ({activePreviewRecipient?.phone || "No phone"})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevPreviewRecipient}
                        className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shadow-sm transition"
                      >
                        <ChevronLeft size={13} /> Prev
                      </button>
                      <button
                        onClick={handleNextPreviewRecipient}
                        className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shadow-sm transition"
                      >
                        Next <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>

                </div>

                {/* 3. ANTI-BAN BROADCAST ENGINE & DISPATCH CONTROLLER */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Play size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                          Anti-Ban Broadcast Transmission Engine
                        </h3>
                        <p className="text-[10px] text-slate-400">Automated Dispatch via College WhatsApp QR Socket</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                      Queue: {queueList.length} targets
                    </span>
                  </div>

                  {/* Transmission Controls Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Gate Mode */}
                    <div className="md:col-span-4 space-y-1">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Gate Mode
                      </label>
                      <div className="flex border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl gap-1">
                        <button
                          onClick={() => setDispatchMode("simulated")}
                          className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            dispatchMode === "simulated" 
                              ? "bg-[#064e43] text-white shadow-sm" 
                              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          }`}
                        >
                          QR Socket
                        </button>
                        <button
                          onClick={() => setDispatchMode("supervised")}
                          className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            dispatchMode === "supervised" 
                              ? "bg-[#064e43] text-white shadow-sm" 
                              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          }`}
                        >
                          Web Tab
                        </button>
                      </div>
                    </div>

                    {/* Delay Interval Slider */}
                    <div className="md:col-span-4 space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-black text-slate-500 uppercase tracking-wider">Human Jitter Delay</span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          ~{averageDelay}s (±2s)
                        </span>
                      </div>
                      <input
                        type="range"
                        min={3}
                        max={15}
                        step={1}
                        value={averageDelay}
                        onChange={(e) => setAverageDelay(Number(e.target.value))}
                        className="w-full accent-[#064e43] h-1.5 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
                      />
                    </div>

                    {/* Anti-Ban Safeguard Toggles */}
                    <div className="md:col-span-4 space-y-1.5">
                      <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableBatchPause}
                          onChange={(e) => setEnableBatchPause(e.target.checked)}
                          className="rounded text-[#064e43] focus:ring-emerald-500"
                        />
                        <span>Batch Cooldown (25s / 15 msgs)</span>
                      </label>
                      <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableAntiBanHash}
                          onChange={(e) => setEnableAntiBanHash(e.target.checked)}
                          className="rounded text-[#064e43] focus:ring-emerald-500"
                        />
                        <span>Unique Content Hash</span>
                      </label>
                    </div>
                  </div>

                  {/* COFFEE BREAK / BATCH PAUSE BANNER */}
                  {isBatchPausing && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-amber-500/10 border-2 border-amber-500/30 p-3 rounded-2xl flex items-center justify-between text-amber-800 dark:text-amber-200 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Coffee className="w-5 h-5 text-amber-500 animate-bounce shrink-0" />
                        <div>
                          <span className="font-black">ANTI-BAN BATCH COOLDOWN IN PROGRESS:</span>
                          <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                            Simulating human coffee break to keep College SIM 100% safe from Meta spam detection.
                          </p>
                        </div>
                      </div>
                      <div className="font-mono text-base font-black px-3 py-1 bg-amber-500 text-white rounded-xl shadow-sm">
                        {batchPauseCountdown}s
                      </div>
                    </motion.div>
                  )}

                  {/* Main Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={handleLoadQueueActive}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-sm active:scale-95"
                    >
                      <Layers size={14} /> 1. Link All Filtered to Send Queue ({filteredRecipients.length})
                    </button>

                    {isBulkRunning ? (
                      <button
                        onClick={handlePauseBulk}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-md active:scale-95"
                      >
                        <Pause size={14} /> Pause Broadcast
                      </button>
                    ) : (
                      <button
                        onClick={handleStartBulk}
                        className="px-5 py-2.5 bg-[#064e43] hover:bg-[#053d34] text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-md active:scale-95"
                      >
                        <Play size={14} /> 2. Launch Safe Broadcast
                      </button>
                    )}

                    <button
                      onClick={handleClearQueue}
                      className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <RotateCcw size={13} /> Reset
                    </button>
                  </div>

                  {/* Campaign Progress Bar */}
                  {queueList.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black text-slate-700 dark:text-slate-300">DISPATCH PROGRESS</span>
                        <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                          {totalSent} / {queueList.length} PROCESSED ({Math.round(progressPercent)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-600 to-[#064e43] h-full transition-all duration-300 rounded-full" 
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Digital Telemetry Terminal Console */}
                  <div className="bg-slate-950 text-slate-100 p-3.5 rounded-2xl font-mono text-[11px] flex flex-col h-[200px] shadow-inner border border-slate-900">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0 text-slate-400 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <Terminal size={13} className="text-emerald-400" />
                        <span>COLLEGE WHATSAPP GATEWAY TELEMETRY</span>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>

                    <div ref={telemetryContainerRef} className="flex-1 overflow-y-auto space-y-1 pt-2 leading-relaxed text-slate-300 pr-1 select-text">
                      {telemetryLogs.map((log, i) => (
                        <div key={i} className="whitespace-pre-wrap">
                          <span className="text-emerald-500">➜</span> {log}
                        </div>
                      ))}
                      {telemetryLogs.length === 0 && (
                        <div className="text-slate-600 text-center py-10 italic text-xs">
                          [Telemetry Standby] Real-time transmission logs will appear here during dispatch.
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BOT INTELLIGENCE & ANALYTICS DASHBOARD (BRAND NEW DEDICATED TAB)  */}
        {/* ========================================================================= */}
        {activeTab === "bot_dashboard" && (
          <motion.div
            key="tab-bot-dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* HERO PERSONA & ACTIVE GUARD BAR */}
            <div className="bg-gradient-to-r from-[#064e43] via-[#053d34] to-[#042822] text-white p-6 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl -z-10" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-black border border-emerald-400/30 shadow-inner shrink-0">
                    <Bot size={30} className="animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">Superior Nexus</h2>
                      <span className="px-2.5 py-0.5 bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                        Virtual Assistant (Female)
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100/80 font-medium max-w-xl">
                      Autonomous 360° AI Virtual Assistant powered by SCJ Autonomous Neural Engine and College Database verification.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                    <Activity size={16} className="text-emerald-300" />
                    <span className="text-xs font-bold text-white/90">Bot Engine:</span>
                    <button
                      onClick={() => handleToggleBot(!isBotEnabled)}
                      className={`text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider transition ${
                        isBotEnabled ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "bg-rose-500 text-white hover:bg-rose-600"
                      }`}
                    >
                      {isBotEnabled ? "ACTIVE" : "PAUSED"}
                    </button>
                  </div>
                  <button
                    onClick={fetchBotStats}
                    disabled={isLoadingBotStats}
                    className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition"
                    title="Refresh Stats"
                  >
                    <RefreshCw size={15} className={isLoadingBotStats ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {/* Active Guardrails Pills Row */}
              <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-emerald-200 font-bold border border-white/10">
                  <ShieldCheck size={13} className="text-emerald-400" /> Strict Verification (Zero Data Leak)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-emerald-200 font-bold border border-white/10">
                  <Check size={13} className="text-emerald-400" /> Single-Salam Protocol (1st Message Only)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-emerald-200 font-bold border border-white/10">
                  <X size={13} className="text-rose-400" /> No Excessive Honorifics (Strictly No Mohtaram/Janab)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-emerald-200 font-bold border border-white/10">
                  <Sparkles size={13} className="text-amber-400" /> Comprehensive SGCJ College Knowledgebase
                </span>
              </div>
            </div>

            {/* 5 EXECUTIVE KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-black uppercase tracking-wider">Total Queries</span>
                  <MessageSquare size={16} className="text-[#064e43] dark:text-emerald-400" />
                </div>
                <p className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                  {auditMetrics.totalQueriesProcessed}
                </p>
                <p className="text-[10px] text-slate-400">Processed by Nexus Engine</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-black uppercase tracking-wider">Verified Records</span>
                  <ShieldCheck size={16} className="text-emerald-600" />
                </div>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {auditMetrics.verifiedCount}
                </p>
                <p className="text-[10px] text-emerald-600/80">Zero-leak verified matches</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-black uppercase tracking-wider">Security Challenges</span>
                  <Lock size={16} className="text-amber-500" />
                </div>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {auditMetrics.challengedCount}
                </p>
                <p className="text-[10px] text-amber-600/80">ID & Name Verification requested</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-black uppercase tracking-wider">Leaked Data Blocked</span>
                  <ShieldAlert size={16} className="text-rose-500" />
                </div>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                  {auditMetrics.blockedCount}
                </p>
                <p className="text-[10px] text-rose-600/80">Unverified data prevented</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-1 col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-black uppercase tracking-wider">General AI Answers</span>
                  <Sparkles size={16} className="text-teal-600" />
                </div>
                <p className="text-2xl font-black text-teal-700 dark:text-teal-400 font-mono">
                  {auditMetrics.generalCount}
                </p>
                <p className="text-[10px] text-teal-600/80">Campus FAQs, admissions & timings</p>
              </div>
            </div>

            {/* DOMAIN CATEGORY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { title: "Fee Dues & Chits", count: auditMetrics.categoryCounts.Fees, icon: DollarSign, color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800", cat: "fees" },
                { title: "Results & Scores", count: auditMetrics.categoryCounts.Results, icon: GraduationCap, color: "text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800", cat: "results" },
                { title: "Attendance", count: auditMetrics.categoryCounts.Attendance, icon: Calendar, color: "text-purple-700 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800", cat: "attendance" },
                { title: "Admissions 2026", count: auditMetrics.categoryCounts.Admissions, icon: BookOpen, color: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800", cat: "admissions" },
                { title: "Campus Helpdesk", count: auditMetrics.categoryCounts["Campus Info"], icon: Phone, color: "text-cyan-700 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800", cat: "campus info" },
                { title: "General College AI", count: auditMetrics.categoryCounts["General AI"], icon: Sparkles, color: "text-teal-700 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800", cat: "general ai" },
              ].map((c) => {
                const Icon = c.icon;
                const isSelected = dashboardCategory.toLowerCase() === c.cat;
                return (
                  <div
                    key={c.title}
                    onClick={() => setDashboardCategory(isSelected ? "all" : c.cat)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? "bg-[#064e43] text-white border-[#064e43] shadow-md"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? "bg-white/20 text-white" : c.color}`}>
                        <Icon size={14} />
                      </div>
                      <span className={`text-base font-black font-mono ${isSelected ? "text-white" : "text-slate-800 dark:text-white"}`}>
                        {c.count}
                      </span>
                    </div>
                    <p className={`text-xs font-bold leading-tight ${isSelected ? "text-emerald-100" : "text-slate-600 dark:text-slate-300"}`}>
                      {c.title}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* LIVE BOT SIMULATOR / PLAYGROUND */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">
                      Live Nexus Bot Simulator Playground
                    </h3>
                    <p className="text-[10px] text-slate-400">Test any natural language query against Superior Nexus right now</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Safe Sandboxed Test
                </span>
              </div>

              {/* Quick Prompt Presets */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">Presets:</span>
                {[
                  "Mera fee status check karein",
                  "FEE 1042",
                  "Mera result card dikhao",
                  "Admissions kab open honge?",
                  "Classes ka schedule kya hai?",
                  "Superior College Jahanian address",
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setBotSimQuery(preset)}
                    className="text-[11px] font-medium bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-800 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Simulator Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Simulated Sender Phone
                  </label>
                  <input
                    type="text"
                    value={botSimSenderPhone}
                    onChange={e => setBotSimSenderPhone(e.target.value)}
                    placeholder="03014455891"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#064e43]"
                  />
                </div>
                <div className="md:col-span-7">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Simulated Query Message
                  </label>
                  <input
                    type="text"
                    value={botSimQuery}
                    onChange={e => setBotSimQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleRunBotSim();
                    }}
                    placeholder="Type query e.g. 'FEE 1042' or 'Admission criteria?'"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#064e43]"
                  />
                </div>
                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={handleRunBotSim}
                    disabled={isSimulating}
                    className="w-full h-9 bg-[#064e43] hover:bg-[#053d34] text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {isSimulating ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" /> Running...
                      </>
                    ) : (
                      <>
                        <Play size={13} /> Execute Query
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Simulator Live Response Box */}
              {botSimResponse && (
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <Bot size={14} className="text-emerald-600" /> Superior Nexus Response Output:
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(botSimResponse);
                        toast.success("Response copied!");
                      }}
                      className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Copy size={11} /> Copy
                    </button>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 font-sans text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed shadow-xs">
                    {botSimResponse}
                  </div>
                </div>
              )}
            </div>

            {/* VERIFIED FACULTY & EXECUTIVE DESK (TEACHER / ADMIN WHATSAPP ACCESS) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">
                        Faculty & Executive WhatsApp Access
                      </h3>
                      <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono text-[10px] font-bold rounded-full border border-teal-200 dark:border-teal-800">
                        {verifiedUsersList.length} Authorized
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Teachers and Administrators authenticated for Timetables, Student Dossiers & Executive Briefings
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsLinkingFacultyModal(true);
                      setSelectedStaffIdToLink("");
                      setManualLinkName("");
                      setManualLinkPhone("");
                      setManualLinkRole("Teacher");
                    }}
                    className="px-3 py-1.5 bg-[#064e43] hover:bg-[#053d34] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Plus size={14} /> Authorize Faculty / Admin
                  </button>
                </div>
              </div>

              {/* Informational Guidance Banner */}
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/70 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
                <Info size={16} className="shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <p className="font-bold text-amber-950 dark:text-amber-200">
                    Bot treats Teachers & Admins differently from regular students:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 dark:text-amber-300/90">
                    <li><b>Direct Phone Recognition:</b> Jab registered teacher apne mobile se bot ko message bhejte hain, bot unhein pehchan kar instant 4-digit OTP se connect karta hai.</li>
                    <li><b>Instant Dashboard Authorization:</b> Aap yahan se kisi bhi teacher ko direct 1-click se authorize kar sakte hain (unhein OTP enter karne ki bhi zaroorat nahi rehti).</li>
                    <li><b>Special Powers:</b> Verify hone ke baad teacher <b>Mera Timetable</b>, <b>Student Dossier (Fee/Marks)</b>, aur <b>Salary & Attendance</b> bina kisi restriction ke dekh sakte hain!</li>
                  </ul>
                </div>
              </div>

              {/* List of Verified Personnel */}
              {isLoadingVerifiedUsers ? (
                <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" /> Loading authorized faculty...
                </div>
              ) : verifiedUsersList.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No faculty members linked yet.</p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Staff members can link their WhatsApp directly by messaging the bot, or you can click "Authorize Faculty / Admin" above to pre-link any teacher.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {verifiedUsersList.map((user: any) => {
                    const isLeader = user.role === "Principal" || user.role === "Admin" || user.role === "Director";
                    return (
                      <div
                        key={user.phone}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col justify-between space-y-3 hover:border-slate-300 transition shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                              isLeader 
                                ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300" 
                                : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}>
                              {(user.name || "U").charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
                                {user.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-mono truncate">
                                +{user.phone} {user.staffId ? `• ${user.staffId}` : ""}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            isLeader
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          }`}>
                            {user.designation || user.role}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
                          <span>Linked: {user.linkedAt ? new Date(user.linkedAt).toLocaleDateString("en-GB") : "Active"}</span>
                          <button
                            onClick={() => handleUnlinkUser(user.phone, user.name)}
                            className="text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1"
                            title="Revoke access and unlink WhatsApp"
                          >
                            <Trash2 size={11} /> Unlink
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MASTER AUDIT TRAIL TABLE & INTERACTION LOGS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#064e43] dark:text-emerald-400" />
                  <div>
                    <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">
                      Master Bot Interaction Audit Trail
                    </h3>
                    <p className="text-[10px] text-slate-400">Comprehensive chronological log of every parent and student query</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportAuditCsv}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Download size={13} /> Export CSV
                  </button>
                  {chatLogs.length > 0 && (
                    <button
                      onClick={handleClearChatLogs}
                      className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      title="Clear Audit Logs"
                    >
                      <Trash2 size={13} /> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Filters and Search Toolbar */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={dashboardSearch}
                    onChange={e => setDashboardSearch(e.target.value)}
                    placeholder="Search logs by phone, student, text..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#064e43]"
                  />
                  {dashboardSearch && (
                    <button
                      onClick={() => setDashboardSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
                  {["all", "fees", "results", "attendance", "admissions", "campus info", "general ai"].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setDashboardCategory(cat)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase transition shrink-0 ${
                        dashboardCategory === cat
                          ? "bg-[#064e43] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audit Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="p-3.5">Time</th>
                      <th className="p-3.5">Sender / Phone</th>
                      <th className="p-3.5">Direction</th>
                      <th className="p-3.5">Domain</th>
                      <th className="p-3.5">Interaction Preview</th>
                      <th className="p-3.5">Verification</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                    {filteredDashboardLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-slate-400">
                          <p className="text-xs font-bold">No interaction logs match the filter criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredDashboardLogs.slice(0, 100).map((log, idx) => {
                        const isOutgoing = log.direction === "outgoing";
                        const cls = classifyLog(log.text || "");
                        const DomainIcon = cls.icon;
                        const timeStr = new Date(log.timestamp).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <tr key={log.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-3.5 whitespace-nowrap text-[11px] font-mono text-slate-500">
                              {timeStr}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="space-y-0.5">
                                <p className="font-bold text-slate-800 dark:text-white leading-tight">
                                  {log.senderName || log.verifiedStudent || "Direct Contact"}
                                </p>
                                <p className="text-[10px] font-mono text-slate-400">+{log.phone}</p>
                              </div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              {isOutgoing ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                  <Send size={10} /> Bot Outbound
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                                  <ArrowLeft size={10} /> Inbound Query
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border ${cls.color}`}>
                                <DomainIcon size={11} /> {cls.label}
                              </span>
                            </td>
                            <td className="p-3.5 max-w-xs truncate text-slate-700 dark:text-slate-300 font-sans" title={log.text}>
                              {log.text}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              {log.verifiedStudent ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                  <ShieldCheck size={11} /> Verified
                                </span>
                              ) : (log.text || "").includes("Verification Required") ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                                  <Lock size={11} /> Challenged
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">Guest / General</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <button
                                onClick={() => handleOpenInChat(log.phone)}
                                className="px-2.5 py-1 text-[11px] font-bold text-[#064e43] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg transition border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1"
                              >
                                <MessageSquare size={12} /> Open in Chat
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 px-1">
                <span>Showing up to 100 recent entries</span>
                <span>Total Recorded Logs: {chatLogs.length}</span>
              </div>
            </div>

          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PRINCIPAL EXECUTIVE AUTO-REPORTS & SCHEDULED DIGEST               */}
        {/* ========================================================================= */}
        {activeTab === "automated_reports" && (
          <motion.div
            key="tab-automated-reports"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* HERO HEADER & STATUS */}
            <div className="bg-gradient-to-r from-[#064e43] via-[#053d34] to-[#042822] text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl -z-10" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-black border border-emerald-400/30 shadow-inner shrink-0">
                    <CalendarCheck size={30} className="animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">Executive Auto-Reports & Digest</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        24/7 Daemon Active
                      </span>
                    </div>
                    <p className="text-sm text-emerald-100/70 max-w-xl">
                      Automated institutional intelligence dispatched directly to the Principal's WhatsApp at scheduled times (Daily at 2:00 PM, Weekly summaries & Monthly audit briefs).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Master Scheduler</div>
                    <div className="text-sm font-black text-white">
                      {reportConfig?.enabled ? "Automated & Active" : "System Paused"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const updated = { ...(reportConfig || {}), enabled: !reportConfig?.enabled };
                      saveReportConfig(updated);
                    }}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      reportConfig?.enabled ? "bg-emerald-400 justify-end" : "bg-white/20 justify-start"
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
                  </button>
                </div>
              </div>

              {/* QUICK SCHEDULE BADGES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10">
                <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-emerald-300 shrink-0" />
                  <div>
                    <div className="text-[10px] text-emerald-200/70 uppercase font-bold tracking-wider">Daily Flash Report</div>
                    <div className="text-sm font-black text-white">Everyday at {reportConfig?.daily?.time || "14:00"} PKT</div>
                  </div>
                </div>
                <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-teal-300 shrink-0" />
                  <div>
                    <div className="text-[10px] text-teal-200/70 uppercase font-bold tracking-wider">Weekly Executive</div>
                    <div className="text-sm font-black text-white">Every Saturday at {reportConfig?.weekly?.time || "16:00"} PKT</div>
                  </div>
                </div>
                <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-cyan-300 shrink-0" />
                  <div>
                    <div className="text-[10px] text-cyan-200/70 uppercase font-bold tracking-wider">Monthly Audit Brief</div>
                    <div className="text-sm font-black text-white">1st of Month at {reportConfig?.monthly?.time || "10:00"} PKT</div>
                  </div>
                </div>
              </div>
            </div>

            {/* PRINCIPAL RECIPIENT SETTINGS CARD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#064e43]/10 text-[#064e43] dark:text-emerald-400 flex items-center justify-center font-bold">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Principal / Executive Recipient</h3>
                    <p className="text-xs text-slate-500">The designated mobile phone that receives all automated executive reports.</p>
                  </div>
                </div>

                {/* Quick Staff Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Pick from Staff:</span>
                  <select
                    onChange={(e) => {
                      const st = staff.find((s: any) => s.id === e.target.value);
                      if (st) {
                        setReportConfig((prev: any) => ({
                          ...prev,
                          principalName: st.fullName || st.name,
                          principalPhone: st.contact || st.phone || prev?.principalPhone,
                        }));
                      }
                    }}
                    defaultValue=""
                    className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="" disabled>Select Principal / Leader...</option>
                    {staff.map((st: any) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName || st.name} ({st.role || "Staff"}) - {st.contact || "No Phone"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Principal Title / Display Name
                  </label>
                  <input
                    type="text"
                    value={reportConfig?.principalName || ""}
                    onChange={(e) => setReportConfig((prev: any) => ({ ...prev, principalName: e.target.value }))}
                    placeholder="e.g. Prof. Tariq Javed (Principal)"
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Principal WhatsApp Mobile Number
                  </label>
                  <input
                    type="text"
                    value={reportConfig?.principalPhone || ""}
                    onChange={(e) => setReportConfig((prev: any) => ({ ...prev, principalPhone: e.target.value }))}
                    placeholder="e.g. 0301-4455891 or 923014455891"
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => saveReportConfig(reportConfig)}
                  disabled={isSavingReportConfig}
                  className="px-5 py-2.5 bg-[#064e43] hover:bg-[#053d34] text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isSavingReportConfig ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Recipient Details
                </button>
              </div>
            </div>

            {/* THREE REPORT CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* 1. DAILY FLASH REPORT */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5 relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Clock size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">Daily Flash Report</h4>
                        <span className="text-[10px] text-slate-500 font-medium">Daily Closing Summary</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const updated = {
                          ...(reportConfig || {}),
                          daily: { ...reportConfig?.daily, enabled: !reportConfig?.daily?.enabled }
                        };
                        setReportConfig(updated);
                        saveReportConfig(updated);
                      }}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-300 ${
                        reportConfig?.daily?.enabled ? "bg-emerald-500 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                      }`}
                    >
                      <div className="bg-white w-4 h-4 rounded-full shadow-sm" />
                    </button>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Dispatch Time (PKT)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                        {reportConfig?.daily?.time || "14:00"} (2:00 PM)
                      </span>
                    </label>
                    <input
                      type="time"
                      value={reportConfig?.daily?.time || "14:00"}
                      onChange={(e) => {
                        const updated = {
                          ...(reportConfig || {}),
                          daily: { ...reportConfig?.daily, time: e.target.value }
                        };
                        setReportConfig(updated);
                      }}
                      className="w-full text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Included Modules</div>
                    
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportConfig?.daily?.includeStaffAttendance !== false}
                        onChange={(e) => setReportConfig((prev: any) => ({
                          ...prev,
                          daily: { ...prev.daily, includeStaffAttendance: e.target.checked }
                        }))}
                        className="rounded border-slate-300 text-[#064e43] focus:ring-emerald-500"
                      />
                      <span>Staff Attendance & Absent/Late Faculty</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportConfig?.daily?.includeStudentAttendance !== false}
                        onChange={(e) => setReportConfig((prev: any) => ({
                          ...prev,
                          daily: { ...prev.daily, includeStudentAttendance: e.target.checked }
                        }))}
                        className="rounded border-slate-300 text-[#064e43] focus:ring-emerald-500"
                      />
                      <span>Student Attendance Snapshot (%)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportConfig?.daily?.includeFeeCollection !== false}
                        onChange={(e) => setReportConfig((prev: any) => ({
                          ...prev,
                          daily: { ...prev.daily, includeFeeCollection: e.target.checked }
                        }))}
                        className="rounded border-slate-300 text-[#064e43] focus:ring-emerald-500"
                      />
                      <span>Today's Fee Recovered (Cash vs Bank)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportConfig?.daily?.includeAdmissions !== false}
                        onChange={(e) => setReportConfig((prev: any) => ({
                          ...prev,
                          daily: { ...prev.daily, includeAdmissions: e.target.checked }
                        }))}
                        className="rounded border-slate-300 text-[#064e43] focus:ring-emerald-500"
                      />
                      <span>New Inquiries / Leads & Admissions</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <button
                    onClick={() => handleSendTestReport("daily")}
                    disabled={isSendingTestReport === "daily"}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {isSendingTestReport === "daily" ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    Send Today's Report Now (Test)
                  </button>
                  <button
                    onClick={() => handlePreviewReport("daily")}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Eye size={14} /> Preview Daily Flash
                  </button>
                </div>
              </div>

              {/* 2. WEEKLY EXECUTIVE SUMMARY */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5 relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">Weekly Executive Summary</h4>
                        <span className="text-[10px] text-slate-500 font-medium">Weekly Strategic Performance</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const updated = {
                          ...(reportConfig || {}),
                          weekly: { ...reportConfig?.weekly, enabled: !reportConfig?.weekly?.enabled }
                        };
                        setReportConfig(updated);
                        saveReportConfig(updated);
                      }}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-300 ${
                        reportConfig?.weekly?.enabled ? "bg-teal-500 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                      }`}
                    >
                      <div className="bg-white w-4 h-4 rounded-full shadow-sm" />
                    </button>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Dispatch Day & Time
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={reportConfig?.weekly?.dayOfWeek ?? 6}
                          onChange={(e) => setReportConfig((prev: any) => ({
                            ...prev,
                            weekly: { ...prev.weekly, dayOfWeek: parseInt(e.target.value, 10) }
                          }))}
                          className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          <option value={6}>Saturday</option>
                          <option value={0}>Sunday</option>
                          <option value={5}>Friday</option>
                          <option value={1}>Monday</option>
                        </select>
                        <input
                          type="time"
                          value={reportConfig?.weekly?.time || "16:00"}
                          onChange={(e) => setReportConfig((prev: any) => ({
                            ...prev,
                            weekly: { ...prev.weekly, time: e.target.value }
                          }))}
                          className="text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Included Modules</div>
                    
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-teal-500" />
                        <span>Weekly Fee Recovery vs Expenses</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-teal-500" />
                        <span>Weekly Net Cash Surplus Flow</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-teal-500" />
                        <span>Confirmed Admissions vs Leads Pipe</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-teal-500" />
                        <span>Staff Punctuality & Late Incidents</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <button
                    onClick={() => handleSendTestReport("weekly")}
                    disabled={isSendingTestReport === "weekly"}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {isSendingTestReport === "weekly" ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    Send Weekly Summary Now (Test)
                  </button>
                  <button
                    onClick={() => handlePreviewReport("weekly")}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Eye size={14} /> Preview Weekly Summary
                  </button>
                </div>
              </div>

              {/* 3. MONTHLY AUDIT BRIEF */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5 relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                        <BarChart3 size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">Monthly Audit Brief</h4>
                        <span className="text-[10px] text-slate-500 font-medium">Directorate Audit Overview</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const updated = {
                          ...(reportConfig || {}),
                          monthly: { ...reportConfig?.monthly, enabled: !reportConfig?.monthly?.enabled }
                        };
                        setReportConfig(updated);
                        saveReportConfig(updated);
                      }}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-300 ${
                        reportConfig?.monthly?.enabled ? "bg-cyan-500 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                      }`}
                    >
                      <div className="bg-white w-4 h-4 rounded-full shadow-sm" />
                    </button>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Dispatch Schedule
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 font-bold text-slate-800 dark:text-slate-200 flex items-center">
                          1st of Month
                        </div>
                        <input
                          type="time"
                          value={reportConfig?.monthly?.time || "10:00"}
                          onChange={(e) => setReportConfig((prev: any) => ({
                            ...prev,
                            monthly: { ...prev.monthly, time: e.target.value }
                          }))}
                          className="text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Included Modules</div>
                    
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-cyan-500" />
                        <span>Enrolled Campus Strength (Boys/Girls)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-cyan-500" />
                        <span>Monthly Fee Revenue vs Defaulters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-cyan-500" />
                        <span>Operational Expenses & Net Surplus</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-cyan-500" />
                        <span>Cumulative Outstanding Ledger</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <button
                    onClick={() => handleSendTestReport("monthly")}
                    disabled={isSendingTestReport === "monthly"}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {isSendingTestReport === "monthly" ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    Send Monthly Brief Now (Test)
                  </button>
                  <button
                    onClick={() => handlePreviewReport("monthly")}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Eye size={14} /> Preview Monthly Brief
                  </button>
                </div>
              </div>

            </div>

            {/* SAVE ALL SETTINGS FLOATING BAR */}
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <Info size={16} className="text-emerald-600 shrink-0" />
                <span>All time changes and toggle preferences are synced automatically with the backend WhatsApp daemon.</span>
              </div>
              <button
                onClick={() => saveReportConfig(reportConfig)}
                disabled={isSavingReportConfig}
                className="px-6 py-2.5 bg-[#064e43] hover:bg-[#053d34] text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 shrink-0 active:scale-95"
              >
                {isSavingReportConfig ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                Save All Schedules
              </button>
            </div>

          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: AI EXECUTIVE AGENT & STAFF DELEGATION (BIOMETRICS, OTP, PIN)       */}
        {/* ========================================================================= */}
        {activeTab === "ai_executive" && (
          <motion.div
            key="tab-ai-executive-console"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <WhatsAppExecutiveConsole
              staffList={staff}
              studentsList={students}
              globalSettings={globalSettings}
            />
          </motion.div>
        )}

      </AnimatePresence>

      {/* REPORT PREVIEW MODAL */}
      {reportPreviewModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarCheck size={20} className="text-emerald-300" />
                <h3 className="text-sm font-black tracking-wide">{reportPreviewModal.title}</h3>
              </div>
              <button
                onClick={() => setReportPreviewModal({ isOpen: false, title: "", text: "" })}
                className="text-white/70 hover:text-white p-1 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
                <span>WhatsApp Message Bubble Preview:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(reportPreviewModal.text);
                    toast.success("Copied report text to clipboard!");
                  }}
                  className="text-[#064e43] dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Copy size={12} /> Copy Text
                </button>
              </div>

              {/* WHATSAPP CHAT BUBBLE STYLING */}
              <div className="bg-[#eef8f5] dark:bg-emerald-950/40 p-4 sm:p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 font-sans text-xs sm:text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-100 leading-relaxed shadow-inner">
                {reportPreviewModal.text}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setReportPreviewModal({ isOpen: false, title: "", text: "" })}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
