import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Send, 
  Bot, 
  Copy, 
  Check, 
  Loader2, 
  FileText, 
  Coins, 
  Activity, 
  HelpCircle,
  Megaphone,
  Briefcase,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AiCopilotProps {
  collegeContext: {
    studentCount: number;
    boysCount: number;
    girlsCount: number;
    staffCount: number;
    revenue: number;
    expenses: number;
    outstandingDues: number;
    staffWageLiability: number;
    staffAdvancesPaid: number;
    session: string;
    studentsList?: any[];
    staffList?: any[];
    marksList?: any[];
  };
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AiCopilotView({ collegeContext }: AiCopilotProps) {
  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `### Welcome to the **SCJ AI Executive Co-Pilot**! 🏛️⚡

I am your active artificial intelligence counsel, preloaded with the real-time operational database of **Superior College Jahanian**. 

Currently, I have fully indexed and have administrative lookup access to:
* **${collegeContext.studentCount}** registered students detail catalogs (${collegeContext.boysCount} Boys / ${collegeContext.girlsCount} Girls programs)
* **${collegeContext.staffCount}** active teachers & workforce profiles
* **${(collegeContext.marksList || []).length}** test results & exam academic records
* **Rs. ${collegeContext.outstandingDues.toLocaleString()}** in student outstanding dues
* Monthly payroll liability of **Rs. ${collegeContext.staffWageLiability.toLocaleString()}**

**Super Admin Privileges Active:** You can ask me absolute details about *any* specific student, teacher, class attendance, fees, outstanding dues, or exam test marks. I will lookup the live tables and give you precise bulleted reports. 

How can I assist you with college strategy, custom notices, or student audits today?`,
      timestamp: new Date()
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Strategy Analysis State
  const [analysisOutput, setAnalysisOutput] = useState("");
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  // Notification Composer State
  const [noticeType, setNoticeType] = useState("fee_default");
  const [extraParams, setExtraParams] = useState({
    deadlineDate: "May 30, 2026",
    installmentAllowed: "Yes",
    penaltyAmount: "Rs. 500",
    attendanceThreshold: "75%",
    parentMeetingTime: "10:00 AM"
  });
  const [composedNotice, setComposedNotice] = useState("");
  const [isNoticeLoading, setIsNoticeLoading] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatLoading]);

  // Handle Copy to Clipboard
  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Run Strategic Analysis
  const runStrategicAnalysis = async (type: "financial" | "performance" | "general") => {
    setIsAnalysisLoading(true);
    setAnalysisOutput("");
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collegeContext,
          requestType: type
        })
      });
      const data = await response.json();
      if (data.error) {
        setAnalysisOutput(`⚠️ **AI Model Error**: ${data.error}`);
      } else {
        setAnalysisOutput(data.text);
      }
    } catch (err: any) {
      setAnalysisOutput(`❌ **Connection Error**: ${err.message || "Failed to reach backend server."}`);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  // Compose Notice & SMS drafts
  const composeAIVariantNotice = async () => {
    setIsNoticeLoading(true);
    setComposedNotice("");
    try {
      let customInstruction = "";
      if (noticeType === "fee_default") {
        customInstruction = `Compose an urgent, firm yet highly professional payment notice and SMS broadcast template to parents regarding outstanding student fees of Rs. ${collegeContext.outstandingDues.toLocaleString()}. Deadline to submit is ${extraParams.deadlineDate}. Mention that penalty fine of ${extraParams.penaltyAmount} will be applicable after due date. Offer ${extraParams.installmentAllowed === "Yes" ? "installments support if genuine reasons are filed at campus" : "no installments option without administrative approval"}. Ensure there is a section for Roman Urdu (WhatsApp style) and a formal English Letter notice draft.`;
      } else if (noticeType === "low_attendance") {
        customInstruction = `Draft a low attendance warning message and WhatsApp template to parents whose kids have attendance below ${extraParams.attendanceThreshold}. Ask them to report to the Principal's office at ${extraParams.parentMeetingTime} on coming Monday. Stress academic loss, college policies, and Punjab Board requirements. Send drafts in both English and Roman Urdu (highly readable, emotional yet official).`;
      } else {
        customInstruction = `Compose an elegant academic performance review report notification for the upcoming Parents-Teachers Meeting (PTM). PTM starting time is ${extraParams.parentMeetingTime} on ${extraParams.deadlineDate}. Encourage high parent turnout, feedback for faculty, and distribution of mid-term board preparatory results. Draft custom texts in English and Urdu romanized broadcast.`;
      }

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: customInstruction,
          collegeContext
        })
      });
      const data = await response.json();
      if (data.error) {
        setComposedNotice(`⚠️ **Error composing circular**: ${data.error}`);
      } else {
        setComposedNotice(data.text);
      }
    } catch (err: any) {
      setComposedNotice(`❌ **Network Error**: ${err.message || "Failed to call composition endpoint."}`);
    } finally {
      setIsNoticeLoading(false);
    }
  };

  // Execute Custom Chat Message
  const sendChatMessage = async (e?: React.FormEvent, presetMessage?: string) => {
    if (e) e.preventDefault();
    const promptToSend = presetMessage || chatInput;
    if (!promptToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: promptToSend,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      // Build history payload
      const historyPayload = chatHistory.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptToSend,
          history: historyPayload,
          collegeContext
        })
      });

      const data = await response.json();
      if (data.error) {
        setChatHistory(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          role: "assistant",
          content: `⚠️ **AI Process Error**: ${data.error}`,
          timestamp: new Date()
        }]);
      } else {
        setChatHistory(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          role: "assistant",
          content: data.text,
          timestamp: new Date()
        }]);
      }
    } catch (err: any) {
      setChatHistory(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: `❌ **Failed to reach server**: ${err.message || "Your server-side middleware is starting up. Please retry in 3 seconds."}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Preset prompts
  const presets = [
    "Suggest 3 ways to recover our outstanding dues of " + collegeContext.outstandingDues.toLocaleString() + " Rupees.",
    "Draft a professional warning letter to staff arriving consistently late.",
    "Formulate a girls enrollment marketing strategy for Jahanian area.",
    "Help me optimize our monthly wage liability structure."
  ];

  return (
    <div className="space-y-8 relative">
      {/* Background Ornaments */}
      <div className="absolute top-[30%] left-1/4 w-96 h-96 bg-superior-gold/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[20%] right-1/4 w-[500px] h-[500px] bg-superior-teal/5 rounded-full blur-[140px] -z-10 pointer-events-none" />

      {/* Grid of Strategy Desk and Notice Composer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Module 1: Strategic SWOT Desk (Left Col - 7 Span) */}
        <div className="lg:col-span-7 bg-white/95 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-[2.5rem] shadow-xl p-6 md:p-8 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-superior-gold/[0.04] to-transparent pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-superior-gold to-yellow-500 flex items-center justify-center text-white shadow-md">
                <Briefcase size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-[#c9a84c] uppercase">Executive Strategist</span>
                <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Active Analytics & SWOT Auditing</h4>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Scan active stats in real-time. Choose a high-level auditing focus below to generate an intelligence audit & strategic policies for Superior College Jahanian.
            </p>

            {/* Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {[
                { type: "financial", label: "Fiscal Cost SWOT", icon: Coins, desc: "Revenue & fee arrears", color: "from-[#c9a84c]/10 to-[#c9a84c]/5 border-[#c9a84c]/20 text-[#c9a84c]" },
                { type: "performance", label: "Academic Audit", icon: Users, desc: "Ratios & faculty density", color: "from-superior-teal/10 to-superior-teal/5 border-superior-teal/20 text-superior-teal" },
                { type: "general", label: "General Admin Plan", icon: Activity, desc: "3-Month strategy", color: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-600" },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => runStrategicAnalysis(item.type as any)}
                  className={`flex flex-col text-left p-4 rounded-2xl border bg-gradient-to-b ${item.color} hover:scale-[1.03] active:scale-95 transition-all text-sm font-semibold cursor-pointer`}
                >
                  <item.icon size={20} className="mb-2" />
                  <span className="font-bold uppercase tracking-tight block text-slate-800 dark:text-white text-xs">{item.label}</span>
                  <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>

            {/* Strategic Output Display */}
            <div className="min-h-[295px] max-h-[400px] overflow-auto rounded-3xl bg-slate-50/50 dark:bg-slate-950 p-6 border border-slate-100 dark:border-slate-800 relative shadow-inner">
              {isAnalysisLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <Loader2 className="w-10 h-10 text-superior-gold animate-spin mb-3" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#c9a84c] animate-pulse">Running AI Model...</span>
                  <span className="text-[10px] text-slate-400 mt-1">Gleaning insights & computing policy plans</span>
                </div>
              ) : analysisOutput ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analysis Output</span>
                    <button
                      onClick={() => handleCopy(analysisOutput, "strategy")}
                      className="text-xs text-slate-400 hover:text-[#c9a84c] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSection === "strategy" ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      <span className="font-mono">{copiedSection === "strategy" ? "Copied" : "Copy Reports"}</span>
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-4 font-sans prose prose-slate max-w-none">
                    {analysisOutput.split("\n").map((line, idx) => {
                      if (line.startsWith("###")) {
                        return <h4 key={idx} className="text-[#c9a84c] font-black uppercase tracking-tight text-sm mt-4">{line.replace("###", "").trim()}</h4>;
                      }
                      if (line.startsWith("##")) {
                        return <h3 key={idx} className="text-[#c9a84c] font-black uppercase tracking-tight text-base mt-4">{line.replace("##", "").trim()}</h3>;
                      }
                      if (line.startsWith("*") || line.startsWith("-")) {
                        return (
                          <li key={idx} className="ml-4 list-disc text-slate-600 dark:text-slate-300">
                            <strong>{line.split("**")[1] || ""}</strong>
                            {line.split("**")[2] || line.substring(1)}
                          </li>
                        );
                      }
                      return <p key={idx}>{line}</p>;
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400 dark:text-slate-600">
                  <Sparkles size={36} className="text-slate-300 dark:text-slate-800 mb-2" />
                  <span className="text-xs font-bold uppercase tracking-widest">Awaiting Directorial Instruction</span>
                  <span className="text-[10px] max-w-[260px] mt-1 leading-normal text-slate-400">Click any strategic audit button at the top to draft localized, data-driven performance strategies.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Module 2: Notice Board composer (Right Col - 5 Span) */}
        <div className="lg:col-span-5 bg-white/95 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-[2.5rem] shadow-xl p-6 md:p-8 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-superior-teal/[0.04] to-transparent pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-superior-teal to-emerald-600 flex items-center justify-center text-white shadow-md">
                <Megaphone size={18} />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-superior-teal uppercase">Notice Composer</span>
                <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">AI Circulars & SMS</h4>
              </div>
            </div>

            {/* Set Circular Type */}
            <div className="space-y-4 mb-4">
              <div>
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Select Announcement Goal</label>
                <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                  {[
                    { val: "fee_default", label: "Fee Default" },
                    { val: "low_attendance", label: "Late / Absent" },
                    { val: "ptm", label: "PTM Brief" },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      onClick={() => setNoticeType(btn.val)}
                      className={`py-2 px-3 rounded-xl border text-[11px] font-black uppercase text-center cursor-pointer transition-all ${
                        noticeType === btn.val 
                          ? "bg-superior-teal text-white border-superior-teal" 
                          : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic parameters inputs */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-[9px] uppercase font-black tracking-wider text-slate-400">Target Date / Time</label>
                  <input
                    type="text"
                    value={extraParams.deadlineDate}
                    onChange={(e) => setExtraParams(prev => ({ ...prev, deadlineDate: e.target.value }))}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 font-bold focus:border-[#c9a84c] text-slate-800 dark:text-slate-200"
                  />
                </div>
                {noticeType === "fee_default" ? (
                  <div>
                    <label className="text-[9px] uppercase font-black tracking-wider text-slate-400">Penalty Amount</label>
                    <input
                      type="text"
                      value={extraParams.penaltyAmount}
                      onChange={(e) => setExtraParams(prev => ({ ...prev, penaltyAmount: e.target.value }))}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 font-bold focus:border-[#c9a84c] text-slate-800 dark:text-slate-200"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[9px] uppercase font-black tracking-wider text-slate-400">Meeting / Threshold</label>
                    <input
                      type="text"
                      value={noticeType === "low_attendance" ? extraParams.attendanceThreshold : extraParams.parentMeetingTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExtraParams(prev => (
                          noticeType === "low_attendance" 
                            ? { ...prev, attendanceThreshold: val } 
                            : { ...prev, parentMeetingTime: val }
                        ));
                      }}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 font-bold focus:border-[#c9a84c] text-slate-800 dark:text-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={composeAIVariantNotice}
              disabled={isNoticeLoading}
              className="w-full py-2.5 bg-superior-gold text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-superior-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-superior-gold/15"
            >
              {isNoticeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles size={14} />}
              Compose Circular Drafts
            </button>

            {/* Circular output area */}
            <div className="mt-4 h-[240px] overflow-auto rounded-2xl bg-slate-50/50 dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-800 relative">
              {isNoticeLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <Loader2 className="w-8 h-8 text-superior-teal animate-spin mb-2" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">Drafting Templates...</span>
                </div>
              ) : composedNotice ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between sticky top-0 bg-slate-50 dark:bg-slate-950 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ready Broadcast Templates</span>
                    <button
                      onClick={() => handleCopy(composedNotice, "notice")}
                      className="text-[10px] text-slate-400 hover:text-superior-teal flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSection === "notice" ? <Check size={12} className="text-green-500" /> : <Copy size={11} />}
                      <span>{copiedSection === "notice" ? "Copied" : "Copy Drafts"}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {composedNotice}
                  </pre>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400 dark:text-slate-600">
                  <FileText size={24} className="text-slate-300 dark:text-slate-800 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Circular Composer is Ready</span>
                  <span className="text-[9px] opacity-75 mt-0.5">Click compose above to auto-generate board notices and parent notifications.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Module 3: Executive Real-Time Intelligent Chatdesk */}
      <div className="bg-white/95 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-[2.5rem] shadow-xl overflow-hidden relative flex flex-col">
        {/* Dynamic header */}
        <div className="px-6 py-5 md:px-8 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c]">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Principal's Interactive AI Chatdesk</h4>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Dual-channel contextual intelligence workspace</p>
            </div>
          </div>
          <div className="bg-[#c9a84c]/10 px-4 py-1.5 rounded-2xl border border-[#c9a84c]/20 text-[10px] font-black uppercase text-[#c9a84c] flex items-center gap-2">
            Model: GEMINI 3.5 FLASH
          </div>
        </div>

        {/* Preset Prompts section */}
        <div className="px-6 py-4 md:px-8 border-b border-slate-150 dark:border-slate-800 bg-slate-50/20 flex flex-wrap gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <HelpCircle size={12} />
            Quick Suggestion Prompts:
          </span>
          <div className="flex flex-wrap gap-2 w-full mt-1.5">
            {presets.map((p, idx) => (
              <button
                key={idx}
                disabled={isChatLoading}
                onClick={() => sendChatMessage(undefined, p)}
                className="text-[10px] font-bold py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 hover:border-[#c9a84c] text-slate-600 dark:text-slate-400 hover:text-[#c9a84c] transition-all cursor-pointer text-left truncate max-w-full sm:max-w-xs"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Chat log */}
        <div className="p-6 md:p-8 space-y-4 max-h-[500px] min-h-[355px] overflow-auto bg-slate-50/20 dark:bg-slate-950/10">
          <AnimatePresence initial={false}>
            {chatHistory.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm ${
                  msg.role === "user" 
                    ? "bg-slate-800 border-slate-700 text-white" 
                    : "bg-[#053229] border-white/10 text-white"
                }`}>
                  {msg.role === "user" ? "AD" : <Bot size={16} />}
                </div>
                
                <div className={`p-4 rounded-3xl text-xs leading-relaxed transition-all shadow-sm ${
                  msg.role === "user" 
                    ? "bg-slate-800 text-white rounded-tr-none" 
                    : "bg-white dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none"
                }`}>
                  <div className="font-sans prose prose-sm dark:prose-invert max-w-none space-y-2">
                    {msg.content.split("\n\n").map((para, pIdx) => {
                      if (para.startsWith("###")) {
                        return <h4 key={pIdx} className="font-bold text-sm text-[#c9a84c] uppercase tracking-tight mt-2">{para.replace("###", "").trim()}</h4>;
                      }
                      if (para.startsWith("##")) {
                        return <h3 key={pIdx} className="font-bold text-base text-[#c9a84c] uppercase tracking-tight mt-2">{para.replace("##", "").trim()}</h3>;
                      }
                      
                      const lines = para.split("\n");
                      const isList = lines.every(l => l.trim().startsWith("*") || l.trim().startsWith("-"));
                      if (isList) {
                        return (
                          <ul key={pIdx} className="list-disc pl-4 space-y-1">
                            {lines.map((l, lIdx) => {
                              const cleaned = l.trim().substring(1).trim();
                              return (
                                <li key={lIdx}>
                                  {cleaned.includes("**") ? (
                                    <>
                                      <strong>{cleaned.split("**")[1]}</strong>
                                      {cleaned.split("**")[2]}
                                    </>
                                  ) : cleaned}
                                </li>
                              );
                            })}
                          </ul>
                        );
                      }
                      
                      return (
                        <p key={pIdx}>
                          {para.includes("**") ? (
                            para.split("**").map((part, partIdx) => 
                              partIdx % 2 === 1 ? <strong key={partIdx}>{part}</strong> : part
                            )
                          ) : para}
                        </p>
                      );
                    })}
                  </div>
                  <span className="text-[8px] opacity-40 block text-right mt-2">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}

            {isChatLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 max-w-[85%] mr-auto"
              >
                <div className="w-8 h-8 rounded-full bg-[#053229] flex items-center justify-center text-white border border-white/10 shadow-sm">
                  <Bot size={16} />
                </div>
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200/60 dark:border-slate-850 text-slate-500 rounded-tl-none flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#c9a84c] animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#c9a84c] animate-pulse">SCJ AI is formulating solution...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatBottomRef} />
        </div>

        {/* Input box */}
        <form onSubmit={sendChatMessage} className="p-4 md:p-6 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isChatLoading}
            placeholder="Ask AI anything about fee collection policies, late teacher notifications, admissions optimizations..."
            className="flex-1 px-4 py-3 text-xs md:text-sm rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 focus:outline-none focus:border-[#c9a84c] text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isChatLoading}
            className="px-6 rounded-2xl bg-superior-teal text-white font-bold flex items-center justify-center text-xs md:text-sm gap-2 transition-all cursor-pointer hover:bg-superior-teal/90 disabled:opacity-40"
          >
            <Send size={14} />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </form>
      </div>

    </div>
  );
}
