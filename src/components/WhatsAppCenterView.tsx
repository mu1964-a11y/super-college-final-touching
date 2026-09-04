import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Search, Send, FileText, Phone, UserCheck, AlertTriangle, Users, 
  GraduationCap, Clock, QrCode, Wifi, WifiOff, Cpu, Play, Pause, 
  RotateCcw, Wand2, Terminal, CheckCircle2, XCircle, Sliders, Battery, 
  Sparkles, Check, Database, RefreshCw, Layers
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

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

  // Operational states
  const [targetGroup, setTargetGroup] = useState("Students");
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [selectedGender, setSelectedGender] = useState("All");
  const [messageText, setMessageText] = useState(
    "Assalam o Alaikum {{name}}, this is a notification from Superior College Jahanian."
  );
  const [customNumbers, setCustomNumbers] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"composer" | "automation">("composer");

  // QR Session Controller states with persistence support
  const [isQRGenerating, setIsQRGenerating] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrExpiry, setQrExpiry] = useState(40);
  const [isScanning, setIsScanning] = useState(false);
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected">(() => {
    return (localStorage.getItem("scj_whatsapp_conn_state") as any) || "disconnected";
  });
  const [connectedDevice, setConnectedDevice] = useState<{
    phone: string;
    model: string;
    battery: number;
    network: string;
    ping: number;
  } | null>(() => {
    const saved = localStorage.getItem("scj_whatsapp_conn_device");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Custom User Device Inputs with persistence support
  const [deviceInputPhone, setDeviceInputPhone] = useState(() => {
    return localStorage.getItem("scj_whatsapp_custom_phone") || "+92 301 4455891";
  });
  const [deviceInputModel, setDeviceInputModel] = useState(() => {
    return localStorage.getItem("scj_whatsapp_custom_model") || "Redmi Note 12 Pro (Android Bridge)";
  });

  // AI assistant status
  const [isAiComposing, setIsAiComposing] = useState(false);
  const [customAiPrompt, setCustomAiPrompt] = useState("");

  // Nexus AI WhatsApp Autopilot
  const [aiCommandInput, setAiCommandInput] = useState("");
  const [isProcessingAiCommand, setIsProcessingAiCommand] = useState(false);
  const [aiAutoDispatch, setAiAutoDispatch] = useState(false);
  const [lastAiResult, setLastAiResult] = useState<{
    summary?: string;
    recipientsCount?: number;
    sampleMessage?: string;
  } | null>(null);

  // Bulk Sender status
  const [averageDelay, setAverageDelay] = useState(6); // slider
  const [queueList, setQueueList] = useState<MessageQueueItem[]>([]);
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [isBulkPaused, setIsBulkPaused] = useState(false);
  const [bulkCurrentIndex, setBulkCurrentIndex] = useState<number>(-1);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [dispatchMode, setDispatchMode] = useState<"supervised" | "simulated">("simulated");

  const telemetryEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll the logging console
  useEffect(() => {
    if (telemetryEndRef.current) {
      telemetryEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [telemetryLogs]);

  // Unique classes from students roster
  const classes = useMemo(() => {
    if (!students) return [];
    return Array.from(new Set(students.map(s => s.group).filter(Boolean))).sort();
  }, [students]);

  // Sync / Clean bulk queue if filters shift
  const filteredRecipients = useMemo(() => {
    if (targetGroup === "Students") {
      let List = students || [];
      if (selectedClass !== "All Classes") {
        List = List.filter(s => s.group === selectedClass);
      }
      if (selectedGender !== "All") {
        List = List.filter(s => s.gender === selectedGender);
      }
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        List = List.filter(s => 
          (s.fullName || '').toLowerCase().includes(query) ||
          (s.contact || '').includes(query) ||
          (s.collegeNo || '').toLowerCase().includes(query)
        );
      }
      return List.map(s => {
        const fallbackName = s.fullName || "Unnamed Student";
        const contactNo = s.contact || "";
        return {
          id: s.id || `student-${Math.random()}`,
          name: fallbackName,
          phone: contactNo,
          type: 'Student',
          detail: `${s.group || ''} ${s.section || ''}`.trim() || 'No Class Info'
        };
      }).filter(s => s.phone);
    } else if (targetGroup === "Staff") {
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
          phone: contactNo,
          type: 'Staff',
          detail: s.role || 'Employee'
        };
      }).filter(s => s.phone);
    } else if (targetGroup === "Custom Numbers") {
      let List = (customNumbers || "").split('\n').map(n => n.trim()).filter(Boolean);
      if (searchQuery.trim() !== "") {
        List = List.filter(n => n.includes(searchQuery));
      }
      return List.map((phone, i) => ({
        id: `custom-${i}`,
        name: `Custom Contact ${i + 1}`,
        phone: phone,
        type: 'Custom',
        detail: 'Manual Entry'
      }));
    }
    return [];
  }, [targetGroup, students, staff, selectedClass, selectedGender, customNumbers, searchQuery]);

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "92" + cleaned.substring(1);
    }
    return cleaned;
  };

  // Helper to replace dynamic placeholders safely
  const getPersonalizedMessage = (template: string, recipient: any) => {
    let text = template;
    const name = recipient.name || "Student/Staff";
    const detail = recipient.detail || "";
    const phone = recipient.phone || "";
    
    text = text.replace(/{{name}}/g, name);
    text = text.replace(/{{phone}}/g, phone);
    text = text.replace(/{{class}}/g, detail);
    
    // Find active student mapping
    const studentMatch = students.find(s => s.id === recipient.id || s.fullName === recipient.name);
    if (studentMatch) {
      const father = studentMatch.fatherName || "Guardian";
      const totalPkg = studentMatch.totalPackage || 0;
      const paid = studentMatch.feeReceived || 0;
      const dues = Math.max(0, totalPkg - paid);
      
      text = text.replace(/{{father}}/g, father);
      text = text.replace(/{{dues}}/g, `Rs. ${dues.toLocaleString()}`);
      
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
        text = text.replace(/{{marks}}/g, "No outstanding preparatory exam records loaded.");
        text = text.replace(/{{latest_subject}}/g, "N/A");
        text = text.replace(/{{latest_obtained}}/g, "0");
        text = text.replace(/{{latest_total}}/g, "100");
        text = text.replace(/{{latest_test}}/g, "N/A");
      }
    } else {
      text = text.replace(/{{father}}/g, "Guardian");
      text = text.replace(/{{dues}}/g, "Rs. 0");
      text = text.replace(/{{marks}}/g, "No entries found.");
      text = text.replace(/{{latest_subject}}/g, "N/A");
      text = text.replace(/{{latest_obtained}}/g, "0");
      text = text.replace(/{{latest_total}}/g, "100");
      text = text.replace(/{{latest_test}}/g, "N/A");
    }
    
    return text;
  };

  const addLog = (message: string) => {
    const timeStr = new Date().toLocaleTimeString();
    setTelemetryLogs(prev => [...prev, `[${timeStr}] ${message}`]);
  };

  // Check real Baileys backend status on mount
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/whatsapp/status");
        if (!res.ok) return;
        const json = await res.json();
        if (!isMounted) return;

        if (json.status === "connected") {
          setConnectionState("connected");
          setConnectedDevice({
            phone: json.connectedPhone || "+92 300 0000000",
            model: "Baileys WhatsApp Multi-Device Bridge",
            battery: 100,
            network: "Direct WhatsApp Protocol Socket",
            ping: 8
          });
        } else if (json.status === "qr_ready" && json.qrCode) {
          setConnectionState("connecting");
          setQrCodeData(json.qrCode);
          setIsScanning(true);
        }
      } catch (e) {
        console.warn("Could not check initial WhatsApp status", e);
      }
    };

    checkStatus();
    return () => { isMounted = false; };
  }, []);

  // Generate Real Baileys QR Session Key
  const handleGenerateQR = async () => {
    setIsQRGenerating(true);
    addLog("Contacting WhatsApp Multi-Device Server...");
    
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceFresh: true })
      });
      const json = await res.json();
      setConnectionState("connecting");
      setIsScanning(true);
      if (json.qrCode) {
        setQrCodeData(json.qrCode);
      }
      addLog("Baileys initialization launched. Waiting for authentic QR Code handshake...");
    } catch (e: any) {
      addLog(`[Error] Failed to initialize WhatsApp: ${e.message}`);
      toast.error("Failed to start WhatsApp bridge: " + e.message);
    } finally {
      setIsQRGenerating(false);
    }
  };

  // Poll backend status while connecting/scanning
  useEffect(() => {
    if (connectionState !== "connecting") return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/status");
        if (!res.ok) return;
        const json = await res.json();

        if (json.status === "connected") {
          setConnectionState("connected");
          setQrCodeData(null);
          setIsScanning(false);
          setConnectedDevice({
            phone: json.connectedPhone || "+92 300 0000000",
            model: "Baileys WhatsApp Multi-Device Bridge",
            battery: 100,
            network: "Direct WhatsApp Protocol Socket",
            ping: 8
          });
          localStorage.setItem("scj_whatsapp_conn_state", "connected");
          addLog(`Device ${json.connectedPhone} linked successfully via Baileys Multi-Device! Bridge online.`);
          toast.success("WhatsApp Linked Successfully!");
        } else if (json.status === "qr_ready" && json.qrCode) {
          setQrCodeData(json.qrCode);
        }
      } catch (e) {
        console.warn("Polling WhatsApp status error:", e);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [connectionState]);

  // Scan & Link device fallback / manual confirmation
  const handleVerifyScan = async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      const json = await res.json();
      if (json.status === "connected") {
        setConnectionState("connected");
        setConnectedDevice({
          phone: json.connectedPhone || "+92 300 0000000",
          model: "Baileys WhatsApp Multi-Device Bridge",
          battery: 100,
          network: "Direct WhatsApp Protocol Socket",
          ping: 8
        });
        toast.success("WhatsApp Device Verified and Active!");
        return;
      }
    } catch {
      // ignore
    }
    toast.info("Please scan the QR code on your phone: WhatsApp > Linked Devices > Link a Device.");
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
    } catch (e) {
      console.warn("Disconnect error:", e);
    }
    setConnectionState("disconnected");
    setConnectedDevice(null);
    setQrCodeData(null);
    setIsScanning(false);
    localStorage.removeItem("scj_whatsapp_conn_state");
    localStorage.removeItem("scj_whatsapp_conn_device");
    addLog("WhatsApp device unlinked. Baileys session cleared.");
    toast.info("WhatsApp Device Disconnected.");
  };

  // QR Expiry countdown timer
  useEffect(() => {
    if (connectionState !== "connecting" || !qrCodeData) return;
    
    setQrExpiry(40);
    const interval = setInterval(() => {
      setQrExpiry(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [connectionState, qrCodeData]);

  // Handle auto rotation when expiry hits 0
  useEffect(() => {
    if (connectionState === "connecting" && qrExpiry === 0) {
      // Re-trigger connect to get refreshed QR
      fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceFresh: false })
      }).catch(console.warn);
      addLog("Auto-refreshed WhatsApp QR Code session key.");
    }
  }, [qrExpiry, connectionState]);

  // Ask Gemini AI to Compose Template is server-side
  const handleAiCompose = async (prebuiltStyle?: string) => {
    setIsAiComposing(true);
    addLog("Querying SCJ Nexus AI for intelligent template compilation...");
    
    let promptInstruction = customAiPrompt.trim();
    
    if (prebuiltStyle === "fee_dues") {
      promptInstruction = "Write an outstanding fee dues reminder template in polite Roman Urdu (Hinglish). Use placeholders {{name}}, {{father}}, {{class}}, and {{dues}}. Make it brief but urging them to submit it soon to Superior College Jahanian office.";
    } else if (prebuiltStyle === "announcement") {
      promptInstruction = "Write an official holiday notice or schedule reminder template for Superior Group of Colleges Jahanian. Use placeholders {{name}} and {{class}}. Keep it highly professional and write in literary bilingual Hinglish/English.";
    } else if (prebuiltStyle === "marks") {
      promptInstruction = "Write a proud congratulatory parent report notification with the latest academic test results of the students. Emphasize placeholders {{name}}, {{class}}, and their detailed score log list: {{marks}}. Direct them to meet the coordinator in case of arrears.";
    } else if (prebuiltStyle === "absent_staff") {
      promptInstruction = "Write an administrative notice template for academic staff reminding them of punctual attendance, timetable alignments, and late llegada warning policies of Jahanian Girls/Boys campus.";
    }

    if (!promptInstruction) {
      toast.error("Please select a template format or write instructions for Nexus AI.");
      setIsAiComposing(false);
      return;
    }

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
          message: `Respond ONLY with the drafted message text block ready to apply. Ensure you include the dynamic placeholders properly. Prompt details: ${promptInstruction}`,
          collegeContext: statsContext
        })
      });

      if (!response.ok) {
        throw new Error("Free Gemini API returned server error status");
      }

      const resData = await response.json();
      if (resData.text) {
        setMessageText(resData.text.trim());
        toast.success("Nexus AI Template Compiled and Loaded!");
        addLog("Nexus AI successfully loaded compiled custom payload template.");
        setCustomAiPrompt("");
      } else {
        throw new Error("No text found in response");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Nexus AI failed to compose template. Using default baseline.");
      addLog("Nexus AI request returned offline/credentials error. Precaution fallback triggered.");
    } finally {
      setIsAiComposing(false);
    }
  };

  // Nexus AI WhatsApp Autopilot Command Handler
  const handleRunAiCommand = async (customCmd?: string) => {
    const cmdToRun = (customCmd || aiCommandInput).trim();
    if (!cmdToRun) {
      toast.error("Please enter an AI command (e.g. 'Ghair hazir bachon k ghar absent ka message bhejo').");
      return;
    }

    setIsProcessingAiCommand(true);
    addLog(`[Nexus AI] Processing administrative command: "${cmdToRun}"...`);

    try {
      const res = await fetch("/api/whatsapp/ai-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: cmdToRun,
          students,
          attendanceRecords: data?.studentAttendance || [],
          autoSend: aiAutoDispatch && connectionState === "connected"
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Server error processing AI command");
      }

      const resData = await res.json();
      setLastAiResult({
        summary: resData.commandAnalysis?.summary || resData.commandAnalysis?.audienceDescription,
        recipientsCount: resData.recipientsCount,
        sampleMessage: resData.sampleMessage
      });

      if (resData.recipients && resData.recipients.length > 0) {
        const newQueueItems: MessageQueueItem[] = resData.recipients.map((r: any) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          resolvedMessage: r.message,
          status: resData.autoDispatched ? ("sent" as const) : ("queued" as const),
          detail: `${r.className || ""} ${r.rollNo ? `(Roll: ${r.rollNo})` : ""}`.trim()
        }));

        setQueueList(newQueueItems);
        setActiveTab("automation");
        setBulkCurrentIndex(-1);
        addLog(`[Nexus AI] Identified ${newQueueItems.length} matching recipients. Messages compiled into Transmission Queue.`);
        toast.success(`AI compiled messages for ${newQueueItems.length} students!`);

        if (resData.autoDispatched) {
          toast.success("Messages auto-dispatched via linked WhatsApp!");
          addLog(`[Nexus AI] Auto-dispatched all ${newQueueItems.length} messages via Baileys Bridge.`);
        }
      } else {
        toast.info("No matching students found for this command criteria.");
        addLog(`[Nexus AI] Query completed: 0 matching recipients found in database.`);
      }
    } catch (err: any) {
      console.error("[Nexus AI Command Error]:", err);
      toast.error(`AI Command Failed: ${err.message}`);
      addLog(`[Nexus AI Error ❌] ${err.message}`);
    } finally {
      setIsProcessingAiCommand(false);
    }
  };

  // Direct single manual send
  const handleSendSingle = async (phone: string, name: string) => {
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

    // Try real Baileys background send first if connected
    if (connectionState === "connected") {
      try {
        toast.loading(`Sending via linked WhatsApp to ${name}...`, { id: "single-send" });
        const res = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: formattedPhone, message: personalized })
        });
        const json = await res.json();
        if (json.success) {
          toast.success(`Message delivered to ${name}!`, { id: "single-send" });
          addLog(`[Delivered ✓✓] Baileys socket delivered message to ${name} (${formattedPhone}).`);
          return;
        } else {
          toast.dismiss("single-send");
          toast.info("Falling back to WhatsApp Web dialogue...");
        }
      } catch {
        toast.dismiss("single-send");
      }
    }

    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(personalized)}`;
    window.open(url, "_blank");
    toast.success(`Opening WhatsApp dialogue for ${name}`);
    addLog(`Direct browser web-dispatch launched for ${name} (${formattedPhone}).`);
  };

  // Load Recipients into active automation queue
  const handleLoadQueueActive = () => {
    if (filteredRecipients.length === 0) {
      toast.error("Recipients pool is empty. Adjust filters first.");
      return;
    }
    
    const items: MessageQueueItem[] = filteredRecipients.map(recipient => ({
      id: recipient.id,
      name: recipient.name,
      phone: recipient.phone,
      resolvedMessage: getPersonalizedMessage(messageText, recipient),
      status: "queued" as const,
      detail: recipient.detail
    }));

    setQueueList(items);
    setActiveTab("automation");
    setTelemetryLogs([]);
    setBulkCurrentIndex(-1);
    addLog(`Compiled & Loaded ${items.length} personalized messages into the Hybrid Transmission Queue.`);
    toast.success(`Loaded ${items.length} recipients into Send Queue!`);
  };

  // Active Sending Process Loop
  useEffect(() => {
    if (!isBulkRunning || isBulkPaused) return;

    const executeSendStep = async () => {
      const nextIndex = bulkCurrentIndex + 1;
      
      if (nextIndex >= queueList.length) {
        // Complete bulk
        setIsBulkRunning(false);
        setBulkCurrentIndex(-1);
        addLog("🏁 BROADCAST SEQUENCE COMPLETED! All filtered payloads compiled & processed.");
        toast.success("Bulk Broadcast Campaign Finished!");
        return;
      }

      setBulkCurrentIndex(nextIndex);
      
      // Update item status to sending
      setQueueList(prev => prev.map((item, id) => id === nextIndex ? { ...item, status: "sending" } : item));
      const target = queueList[nextIndex];
      const formattedPhone = formatPhoneNumber(target.phone);
      
      addLog(`Initializing dispatch to ${target.name} (${formattedPhone})...`);

      // 1. Calculate random human-like delay variance to completely prevent spam flags
      const randomVariance = (Math.random() * 3 - 1.5); // ±1.5s
      const actualDelayMs = Math.max(2000, (averageDelay + randomVariance) * 1000);
      
      addLog(`[Safe Guard Mode] Introducing standard delay of ${((actualDelayMs)/1000).toFixed(1)}s before launching payload...`);

      timerRef.current = setTimeout(async () => {
        // Run standard action or simulated link
        if (dispatchMode === "supervised") {
          // Supervised tab launcher
          const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(target.resolvedMessage)}`;
          window.open(url, "_blank");
          addLog(`[Success] Launched WhatsApp tab payload for ${target.name}.`);
          setQueueList(prev => prev.map((item, id) => id === nextIndex ? { ...item, status: "sent" } : item));
        } else {
          // Send via real Baileys WebSocket connection if connected
          if (connectionState === "connected") {
            try {
              const res = await fetch("/api/whatsapp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  phone: formattedPhone || target.phone,
                  message: target.resolvedMessage
                })
              });
              const json = await res.json();
              if (json.success) {
                addLog(`[Baileys Bridge ✓✓] Pushed live payload to ${target.name} (${target.phone}) - Msg ID: ${json.messageId}`);
                setQueueList(prev => prev.map((item, id) => id === nextIndex ? { ...item, status: "sent" } : item));
              } else {
                addLog(`[Bridge Warning ⚠️] ${json.error || "Delivery issue"}. Falling back to browser session.`);
                const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(target.resolvedMessage)}`;
                window.open(url, "_blank");
                setQueueList(prev => prev.map((item, id) => id === nextIndex ? { ...item, status: "sent" } : item));
              }
            } catch (err: any) {
              addLog(`[Bridge Error ❌] ${err.message}`);
              setQueueList(prev => prev.map((item, id) => id === nextIndex ? { ...item, status: "failed", error: err.message } : item));
            }
          } else {
            // Unlinked fallback
            const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(target.resolvedMessage)}`;
            window.open(url, "_blank");
            addLog(`[Tab Launch] Device not linked. Launched WhatsApp web tab for ${target.name}.`);
            setQueueList(prev => prev.map((item, id) => id === nextIndex ? { ...item, status: "sent" } : item));
          }
        }
      }, actualDelayMs);
    };

    executeSendStep();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isBulkRunning, isBulkPaused, bulkCurrentIndex, queueList, averageDelay, dispatchMode, connectionState]);

  const handleStartBulk = () => {
    if (queueList.length === 0) {
      toast.error("Queue is empty. Load targets first.");
      return;
    }
    
    if (connectionState !== "connected" && dispatchMode === "simulated") {
      toast.warning("Simulated auto-transmission requires an active device link! Connect your device QR code on the left pane or switch to Supervised browser-tab dispatcher.");
      return;
    }

    setIsBulkPaused(false);
    setIsBulkRunning(true);
    addLog(`🚀 Broadcast Engine Initialized! Dispaching in ${dispatchMode.toUpperCase()} mode.`);
    toast.success("Broadcast Engine is Running...");
  };

  const handlePauseBulk = () => {
    setIsBulkPaused(true);
    setIsBulkRunning(false);
    addLog("⏸ BROADCAST PAUSED by supervisor command.");
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-teal-800/50">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-xs font-bold border border-teal-500/30">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> SCJ Automated Hybrid Suite
            </span>
            <h1 className="text-2xl font-black tracking-tight mt-1">SCJ WhatsApp & AI Center v3.0</h1>
            <p className="text-teal-150 text-xs sm:text-sm">
              Tailor, format, generate dynamic student ledger updates & preparatory score cards, and broadcast safely using human-delay sequences.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {connectionState === "connected" ? (
              <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-2xl">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span className="text-xs font-bold text-emerald-300">GATEWAY CONNECTED</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 px-4 py-2 rounded-2xl">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span className="text-xs font-bold text-amber-300">DEVICE STANDBY</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COMPONENT: CONFIGURATORS & QR SESSION CONTROLLER */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Target Filter Card */}
          <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sliders className="w-5 h-5 text-teal-600" />
              <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Audience Selector</h2>
            </div>
            
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Target Group
              </label>
              <select
                value={targetGroup}
                onChange={(e) => {
                  setTargetGroup(e.target.value);
                  setSearchQuery("");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl h-11 px-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
              >
                <option value="Students font-bold">Students (Roster & Fees)</option>
                <option value="Staff">College Staff / Faculty</option>
                <option value="Custom Numbers">Custom Phone Numbers</option>
              </select>
            </div>

            {targetGroup === "Students" && (
              <div className="grid grid-cols-1 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Academic Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl h-10 px-3 text-xs text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="All Classes">All Classes</option>
                    {classes.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Gender Segment
                  </label>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl h-10 px-3 text-xs text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="All">All Campuses</option>
                    <option value="Male">Boys Campus Only</option>
                    <option value="Female">Girls Campus Only</option>
                  </select>
                </div>
              </div>
            )}

            {targetGroup === "Custom Numbers" && (
              <div className="pt-2">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                  Formatted Mobile Numbers (One Per Line)
                </label>
                <textarea
                  value={customNumbers}
                  onChange={(e) => setCustomNumbers(e.target.value)}
                  placeholder="e.g.&#10;03014455891&#10;03120000000"
                  className="w-full h-32 resize-none bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono tracking-wider outline-none focus:ring-2 focus:ring-teal-500 transition-all text-slate-700"
                />
              </div>
            )}

            {/* Quick search input */}
            <div className="relative pt-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Fuzzy search by name or contact..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500 transition-all text-slate-700"
              />
            </div>
          </div>

          {/* QR Session Controller */}
          <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-teal-600" />
                <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">QR Session Bridge</h2>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                connectionState === "connected" ? "bg-emerald-100 text-emerald-800" :
                connectionState === "connecting" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
              }`}>
                {connectionState}
              </span>
            </div>

            {connectionState === "disconnected" && (
              <div className="py-2 space-y-4 text-left">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <WifiOff className="w-6 h-6 text-slate-500" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-black text-slate-700">Automation Device Unlinked</p>
                  <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                    Set up your college smartphone containing the SIM below, then generate keys & scan to link it!
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      WhatsApp Mobile Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">+92</span>
                      <input
                        type="text"
                        value={deviceInputPhone.replace(/^\+92\s?/, "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          const fullNum = val.startsWith("+92") ? val : "+92 " + val.replace(/^\+92\s?/, "");
                          setDeviceInputPhone(fullNum);
                          localStorage.setItem("scj_whatsapp_custom_phone", fullNum);
                        }}
                        placeholder="301 4455891"
                        className="w-full pl-11 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold tracking-wider outline-none focus:ring-1 focus:ring-teal-500 transition-all text-slate-700"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">Enter number without starting 0 or +92</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Device Model / Name
                    </label>
                    <input
                      type="text"
                      value={deviceInputModel}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDeviceInputModel(val);
                        localStorage.setItem("scj_whatsapp_custom_model", val);
                      }}
                      placeholder="e.g. Redmi Note 12 Pro (Android Bridge)"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-teal-500 transition-all text-slate-750"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerateQR}
                  disabled={isQRGenerating}
                  className="w-full h-10 bg-teal-750 hover:bg-teal-800 text-white rounded-xl text-xs font-black transition-all disabled:opacity-50 tracking-wider shadow-sm"
                >
                  {isQRGenerating ? "Generating Session Keys..." : "Link College Device"}
                </button>
              </div>
            )}

            {connectionState === "connecting" && qrCodeData && (
              <div className="flex flex-col items-center py-4 space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-[11px] font-black text-amber-600 animate-pulse uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                    ✦ Scan this QR Code to Link ✦
                  </p>
                  <p className="text-[10px] text-slate-500 max-w-[240px] leading-relaxed mx-auto">
                    Open WhatsApp &gt; Linked Devices &gt; Link a Device, then point your phone camera at this code.
                  </p>
                </div>
                
                {/* Visual QR Code Generator Component */}
                <div className="relative p-5 bg-white border border-slate-200 shadow-md rounded-2xl flex flex-col items-center overflow-hidden group">
                  {/* Subtle Scan Overlay Line */}
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-teal-500 opacity-70 animate-scan pointer-events-none z-20" />
                  
                  {/* Real QR Rendering */}
                  <div className="relative w-48 h-48 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-150 p-2">
                    <img 
                      src={qrCodeData.startsWith("data:") ? qrCodeData : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData)}&color=0f172a&bgcolor=ffffff`}
                      alt="WhatsApp Web Session Connection Token"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-lg transition-transform hover:scale-105"
                    />

                    {/* QR Code Center Logo Brand (SGC Sparkles Badge) */}
                    <div className="absolute w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border border-teal-100 z-10 p-0.5">
                      <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-white">
                        <Sparkles className="w-5 h-5 text-teal-400" />
                      </div>
                    </div>
                  </div>

                  {/* Token Info & Copy functionality */}
                  <div className="mt-3.5 w-full text-center space-y-1">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <span>STATUS:</span>
                      <span className="text-teal-800 font-extrabold select-all">
                        {qrCodeData.startsWith("data:") ? "Baileys Live QR Ready" : qrCodeData}
                      </span>
                    </div>

                    {/* Expiry dynamic countdown */}
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
                      <RefreshCw size={11} className={`text-teal-600 ${qrExpiry < 12 ? "animate-spin" : ""}`} />
                      <span>Code updates in <b className="text-slate-800 font-mono">{qrExpiry}s</b></span>
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-2">
                  <button
                    onClick={handleVerifyScan}
                    className="w-full h-10 bg-gradient-to-r from-emerald-500 to-teal-800 hover:from-emerald-600 hover:to-teal-900 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 active:scale-95"
                  >
                    <CheckCircle2 size={14} /> Check Connection Status
                  </button>
                  
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={handleGenerateQR}
                      className="text-teal-600 hover:text-teal-800 text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw size={11} /> Refresh QR Code
                    </button>
                    <span className="text-slate-200">|</span>
                    <button
                      onClick={handleDisconnect}
                      className="text-slate-400 hover:text-slate-650 text-[11px] underline"
                    >
                      Cancel Setup
                    </button>
                  </div>
                </div>
              </div>
            )}

            {connectionState === "connected" && connectedDevice && (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 shrink-0">
                    <Wifi className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="space-y-0.5 truncate">
                    <p className="text-xs font-black text-slate-800 line-clamp-1 truncate">{connectedDevice.phone}</p>
                    <p className="text-[10px] text-slate-500">{connectedDevice.model}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Battery size={12} className="text-emerald-500" />
                    <span>Battery: <b>{connectedDevice.battery}%</b></span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Cpu size={12} className="text-teal-500" />
                    <span>Ping latency: <b>{connectedDevice.ping}ms</b></span>
                  </div>
                  <div className="col-span-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span>Line Active: {connectedDevice.network}</span>
                  </div>
                </div>

                <button
                  onClick={handleDisconnect}
                  className="w-full h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 transition-all mt-1"
                >
                  Unlink System device
                </button>
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COMPONENT: CONSOLE, AI, DISPATCHER */}
        <div className="lg:col-span-8 flex flex-col space-y-6">

          {/* AI WHATSAPP COMMAND AUTOPILOT (BAILEYS BRIDGE MULTI-DEVICE) */}
          <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-teal-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    Nexus AI WhatsApp Autopilot
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      connectionState === "connected" 
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}>
                      {connectionState === "connected" ? "Baileys Live Connected" : "Baileys Bridge Ready"}
                    </span>
                  </h3>
                  <p className="text-xs text-teal-200/80">
                    AI ko Urdu, Hinglish ya English mein command dein (maslan: "Ghair hazir bachon k ghar absent ka message bhejo"). AI database filter kar k messages compile karega!
                  </p>
                </div>
              </div>
              
              <label className="flex items-center gap-2 text-[11px] font-bold text-teal-200 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors shrink-0 self-start sm:self-auto">
                <input
                  type="checkbox"
                  checked={aiAutoDispatch}
                  onChange={(e) => setAiAutoDispatch(e.target.checked)}
                  className="accent-teal-500 rounded"
                />
                <span>Auto-Send Directly via WhatsApp</span>
              </label>
            </div>

            {/* Quick Command Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider shrink-0">Quick Commands:</span>
              <button
                type="button"
                onClick={() => {
                  setAiCommandInput("Ghair hazir bachon k ghar absent ka message bhejo");
                  handleRunAiCommand("Ghair hazir bachon k ghar absent ka message bhejo");
                }}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-teal-500/20 border border-white/10 text-white font-medium text-xs transition-all hover:border-teal-400/40"
              >
                ⚡ Ghair hazir bachon k ghar absent ka msg bhejo
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiCommandInput("Fee defaulters ko polite dues reminder bhejo");
                  handleRunAiCommand("Fee defaulters ko polite dues reminder bhejo");
                }}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-teal-500/20 border border-white/10 text-white font-medium text-xs transition-all hover:border-teal-400/40"
              >
                ⚡ Fee defaulters ko dues reminder bhejo
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiCommandInput("1st Year students ko exam date sheet alert bhejo");
                  handleRunAiCommand("1st Year students ko exam date sheet alert bhejo");
                }}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-teal-500/20 border border-white/10 text-white font-medium text-xs transition-all hover:border-teal-400/40"
              >
                ⚡ 1st Year students ko exam date sheet alert bhejo
              </button>
            </div>

            {/* Input Bar */}
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={aiCommandInput}
                onChange={(e) => setAiCommandInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRunAiCommand()}
                placeholder="e.g. 'Ghair hazir bachon k ghar absent ka message bhejo' ya '2nd year defaulters ko reminder'..."
                className="w-full pl-4 pr-36 py-3 bg-white/10 border border-white/15 focus:border-teal-400 rounded-2xl text-sm font-medium text-white placeholder:text-teal-200/40 outline-none transition-all focus:bg-white/15"
              />
              <button
                type="button"
                disabled={isProcessingAiCommand}
                onClick={() => handleRunAiCommand()}
                className="absolute right-1.5 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-teal-900/50 cursor-pointer"
              >
                {isProcessingAiCommand ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> AI Analyzing...
                  </>
                ) : (
                  <>
                    <Wand2 size={13} /> Run Command
                  </>
                )}
              </button>
            </div>

            {/* AI Command Result Summary Box */}
            {lastAiResult && (
              <div className="bg-teal-900/40 border border-teal-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-400" />
                    <span className="font-black text-white">{lastAiResult.summary || "Action Analyzed"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                      {lastAiResult.recipientsCount || 0} Recipients Identified
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-200/80 line-clamp-2 italic">
                    "{lastAiResult.sampleMessage}"
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveTab("automation")}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all"
                  >
                    View in Queue ({queueList.length})
                  </button>
                  {queueList.length > 0 && !isBulkRunning && (
                    <button
                      onClick={() => {
                        setActiveTab("automation");
                        setIsBulkRunning(true);
                        setIsBulkPaused(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-md shadow-emerald-500/20"
                    >
                      Start Dispatching Now
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Main Module Tabs selector */}
          <div className="bg-white border border-slate-200 shadow-sm p-2.5 rounded-2xl flex items-center gap-2">
            <button
              onClick={() => setActiveTab("composer")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === "composer" 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <FileText size={16} /> Direct Message & Composer
            </button>
            <button
              onClick={() => setActiveTab("automation")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
                activeTab === "automation" 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Cpu size={16} /> Automation Engine & queues
              {queueList.length > 0 && (
                <span className="absolute top-1 right-2 w-5 h-5 bg-teal-555 text-white rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-white">
                  {queueList.length}
                </span>
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "composer" ? (
              
              /* TAB 1: MESSAGE COMPOSER & RECIPIENT DIRECTORY */
              <motion.div
                key="tab-composer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                
                {/* AI Prompt Auto-writer Card */}
                <div className="bg-gradient-to-br from-slate-900 to-teal-980 text-white p-5 rounded-2xl relative border border-teal-900/40">
                  <div className="absolute top-4 right-4 text-teal-400">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-black tracking-widest text-teal-400 uppercase">Nexus AI template writer</p>
                      <h3 className="text-sm font-bold">What would you like the college chat template to convey?</h3>
                    </div>

                    {/* Pre-built Prompt tags */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => handleAiCompose("fee_dues")}
                        disabled={isAiComposing}
                        className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Database size={12} className="text-teal-400" /> Roman Urdu Fee Dues
                      </button>
                      <button
                        onClick={() => handleAiCompose("marks")}
                        disabled={isAiComposing}
                        className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <GraduationCap size={12} className="text-teal-400" /> Student exam Score Cards
                      </button>
                      <button
                        onClick={() => handleAiCompose("announcement")}
                        disabled={isAiComposing}
                        className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Clock size={12} className="text-teal-400" /> SGCJ Holiday Notice
                      </button>
                      <button
                        onClick={() => handleAiCompose("absent_staff")}
                        disabled={isAiComposing}
                        className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <AlertTriangle size={12} className="text-teal-400" /> Staff Attendance Policy
                      </button>
                    </div>

                    <p className="text-[10px] text-teal-300 italic">
                      💡 Standard Placeholders supported: {"{{name}}"}, {"{{father}}"}, {"{{class}}"}, {"{{dues}}"}, and {"{{marks}}"} for direct database report card mapping.
                    </p>

                    <div className="flex gap-2 pt-1">
                      <textarea
                        value={customAiPrompt}
                        onChange={(e) => setCustomAiPrompt(e.target.value)}
                        placeholder="Or customize: Compose a warm reminder notice for girls campus defaulters with dues > 40k..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-400 outline-none h-11 resize-none focus:ring-1 focus:ring-teal-500"
                      />
                      <button
                        onClick={() => handleAiCompose()}
                        disabled={isAiComposing}
                        className="h-11 px-4 bg-teal-555 hover:bg-teal-600 text-slate-900 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all font-mono shrink-0 disabled:opacity-50"
                      >
                        {isAiComposing ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Drafting...
                          </>
                        ) : (
                          <>
                            <Wand2 size={14} /> Ask Nexus AI
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Message Board & Live Roster */}
                <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      Message Pattern Template Workspace
                    </label>
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Write message template. Inject dynamic variables like {{name}} or {{dues}} safely."
                      className="w-full h-32 resize-none bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-slate-900 outline-none leading-relaxed text-slate-700 tracking-wide font-sans shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <span className="text-[11px] text-slate-400">
                      Loaded Target Audience: <b>{filteredRecipients.length} Recipient records ready.</b>
                    </span>
                    <button
                      onClick={handleLoadQueueActive}
                      className="h-10 px-5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 text-center shrink-0 self-start sm:self-center"
                    >
                      <Layers size={14} /> Link All filtered to Automation Engine ({filteredRecipients.length})
                    </button>
                  </div>

                  <div className="pt-2">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest bg-slate-100 p-2.5 rounded-t-xl border border-b-0 border-slate-200 flex justify-between items-center">
                      <span>Roster Directory matching filters</span>
                      <span className="bg-white/80 text-teal-800 px-2 py-0.5 rounded-md text-[10px] font-black border border-slate-200 shadow-sm">
                        {filteredRecipients.length} MATCHED
                      </span>
                    </h3>

                    <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-b-xl bg-white divide-y divide-slate-100">
                      {filteredRecipients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                          <Users size={36} className="mb-2 opacity-50" />
                          <p className="text-xs font-bold">No contacts match the active filter criteria.</p>
                          <p className="text-[10px] mt-1">Refine target selections on your left control panel.</p>
                        </div>
                      ) : (
                        filteredRecipients.map((recipient, i) => (
                          <div key={recipient.id || i} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-150 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                                {recipient.name ? recipient.name[0].toUpperCase() : <Phone size={14} />}
                              </div>
                              <div className="space-y-0.5 truncate">
                                <p className="text-xs font-extrabold text-slate-800 line-clamp-1 truncate">{recipient.name}</p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  {recipient.phone} • <span className="font-sans text-[9px] text-slate-400 uppercase tracking-wider">{recipient.detail || recipient.type}</span>
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleSendSingle(recipient.phone, recipient.name)}
                              className="px-3 h-8 bg-emerald-555 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition-all active:scale-95 shrink-0"
                            >
                              <Send size={11} /> Manual Open
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </motion.div>
            ) : (
              
              /* TAB 2: HYBRID QUEUE AUTOMATION CONTROLLER */
              <motion.div
                key="tab-automation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                
                {/* Control Parameter Bar */}
                <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  
                  {/* Transmission mode Selector */}
                  <div className="md:col-span-5 space-y-1.5">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">
                      Transmission Gate Mode
                    </label>
                    <div className="flex border border-slate-200 p-1 bg-slate-50 rounded-xl gap-1">
                      <button
                        onClick={() => setDispatchMode("simulated")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                          dispatchMode === "simulated" 
                            ? "bg-slate-900 text-white shadow-sm" 
                            : "text-slate-500 hover:text-slate-850"
                        }`}
                      >
                        Simulated Bridge Link
                      </button>
                      <button
                        onClick={() => setDispatchMode("supervised")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                          dispatchMode === "supervised" 
                            ? "bg-slate-900 text-white shadow-sm" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        Supervised Browser Tab
                      </button>
                    </div>
                  </div>

                  {/* Delay Slider */}
                  <div className="md:col-span-4 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-black text-slate-500 uppercase tracking-widest">Antispam Human-Delay Interval</span>
                      <span className="font-mono font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                        ~ {averageDelay} Sec
                      </span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={15}
                      step={1}
                      value={averageDelay}
                      onChange={(e) => setAverageDelay(Number(e.target.value))}
                      className="w-full accent-slate-900 h-1 bg-slate-150 rounded"
                    />
                  </div>

                  {/* Direct Engine State controller buttons */}
                  <div className="md:col-span-3 flex md:flex-col gap-2 pt-2 md:pt-0">
                    {isBulkRunning ? (
                      <button
                        onClick={handlePauseBulk}
                        className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all tracking-wide"
                      >
                        <Pause size={14} /> Pause Broadcast
                      </button>
                    ) : (
                      <button
                        onClick={handleStartBulk}
                        className="flex-1 h-10 bg-teal-800 hover:bg-teal-900 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all tracking-wide"
                      >
                        <Play size={14} /> Launch dispatch
                      </button>
                    )}
                    <button
                      onClick={handleClearQueue}
                      className="h-10 px-3 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl text-xs flex items-center justify-center gap-1 font-bold"
                    >
                      <RotateCcw size={13} /> Reset Queue
                    </button>
                  </div>
                </div>

                {/* Automation Progress Bar */}
                {queueList.length > 0 && (
                  <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-slate-700">CAMPAIGN DISPATCH PROGRESS</span>
                      <span className="font-mono font-black text-teal-850">
                        {totalSent} / {queueList.length} PROCESSED ({Math.round(progressPercent)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-teal-555 to-emerald-500 h-full transition-all duration-300 rounded-full" 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Queue Dashboard & Terminal Split Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Queue Items List */}
                  <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-2xl flex flex-col h-[450px]">
                    <div className="pb-3 border-b border-slate-100 flex justify-between items-center shrink-0">
                      <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Active Dispatch Queue</p>
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-black">
                        {queueList.length} LOADED
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pt-2 pr-1">
                      {queueList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-slate-400 text-center h-full space-y-2">
                          <Sliders size={32} className="opacity-40" />
                          <p className="text-xs font-bold">Transmit Roster is empty.</p>
                          <p className="text-[10px] max-w-[200px]">Go to composer, define templates, and load contacts into automation.</p>
                        </div>
                      ) : (
                        queueList.map((item, index) => {
                          const isActive = index === bulkCurrentIndex;
                          return (
                            <div 
                              key={item.id} 
                              className={`p-2.5 rounded-lg transition-all flex items-center justify-between ${
                                isActive ? "bg-teal-50 border border-teal-200" : "hover:bg-slate-50"
                              }`}
                            >
                              <div className="space-y-0.5 truncate pr-2">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="text-xs font-black text-slate-800 truncate">{item.name}</span>
                                  <span className="text-[9px] text-slate-400 capitalize bg-slate-100 px-1.5 rounded">{item.detail}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 line-clamp-1 italic truncate" title={item.resolvedMessage}>
                                  {item.resolvedMessage}
                                </p>
                              </div>

                              <div className="shrink-0 pl-1">
                                {item.status === "queued" && (
                                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">QUEUED</span>
                                )}
                                {item.status === "sending" && (
                                  <span className="text-[10px] text-teal-800 font-black bg-teal-100 px-2 py-0.5 rounded animate-pulse">SENDING...</span>
                                )}
                                {item.status === "sent" && (
                                  <span className="text-[10px] text-emerald-800 font-black bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-0.5"><Check size={10} /> SENT</span>
                                )}
                                {item.status === "failed" && (
                                  <span className="text-[10px] text-red-800 font-black bg-red-100 px-2 py-0.5 rounded">FAILED</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Digital Telemetry Console Board */}
                  <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-[11px] flex flex-col h-[450px] shadow-lg border border-slate-900">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0 text-slate-400 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <Terminal size={14} className="text-teal-400" />
                        <span>BRIDGE TELEMETRY REPORT [SGCJ-AUTOMATOR]</span>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 pt-3 leading-relaxed text-slate-300 pr-1">
                      {telemetryLogs.map((log, i) => (
                        <div key={i} className="whitespace-pre-wrap select-text">
                          <span className="text-slate-500">➜</span> {log}
                        </div>
                      ))}
                      {telemetryLogs.length === 0 && (
                        <div className="text-slate-600 text-center py-20 italic">
                          [Telemetry Standby] Engine offline. Waiting for transmission sequence triggers.
                        </div>
                      )}
                      <div ref={telemetryEndRef} />
                    </div>
                  </div>

                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>
    </div>
  );
}
