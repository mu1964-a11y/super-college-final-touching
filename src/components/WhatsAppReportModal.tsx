import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Shield,
  ExternalLink,
  Sliders,
  Play,
  Square,
  Sparkles,
  Eye,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatWhatsAppPhone } from "../lib/whatsappAutomation";

export interface ReportRecipientItem {
  id: string;
  student: any;
  name: string;
  phone: string;
  rollNo?: string;
  className?: string;
  message: string;
  statusBadge?: string;
  isAbsent?: boolean;
  isFailed?: boolean;
  isTopRank?: boolean;
}

export interface WhatsAppReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  category: "daily_attendance" | "monthly_attendance" | "test_marks" | "monthly_merit" | "leads" | "admissions" | "students" | "fee_reminders";
  items: ReportRecipientItem[];
  settings?: any;
  onFinished?: () => void;
}

export default function WhatsAppReportModal({
  open,
  onOpenChange,
  title,
  subtitle,
  category,
  items,
  settings,
  onFinished,
}: WhatsAppReportModalProps) {
  // Filter state
  const [filterMode, setFilterMode] = useState<string>("all");
  const [delaySeconds, setDelaySeconds] = useState<number>(2.5);
  const [showPreview, setShowPreview] = useState<boolean>(true);

  // Dispatch state
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sentCount, setSentCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [currentRecipient, setCurrentRecipient] = useState<ReportRecipientItem | null>(null);
  const [dispatchLogs, setDispatchLogs] = useState<Array<{ name: string; phone: string; status: 'sent' | 'failed' | 'skipped'; time: string }>>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize default filter mode based on category and data
  useEffect(() => {
    if (open) {
      setIsCompleted(false);
      setIsDispatching(false);
      setCurrentIndex(0);
      setSentCount(0);
      setFailedCount(0);
      setCurrentRecipient(null);
      setDispatchLogs([]);

      if (category === "daily_attendance") {
        const hasAbsents = items.some((i) => i.isAbsent);
        setFilterMode(hasAbsents ? "absent" : "all");
      } else {
        setFilterMode("all");
      }
    }
  }, [open, category, items]);

  // Compute active recipient list based on filter
  const targetRecipients = useMemo(() => {
    if (category === "daily_attendance") {
      if (filterMode === "absent") return items.filter((i) => i.isAbsent);
      if (filterMode === "present") return items.filter((i) => !i.isAbsent);
    }
    if (category === "test_marks") {
      if (filterMode === "failed") return items.filter((i) => i.isFailed);
      if (filterMode === "top") return items.filter((i) => i.isTopRank);
    }
    if (category === "leads") {
      if (filterMode === "new") return items.filter((i) => i.student?.pipelineStage === "new" || (i.statusBadge || "").toLowerCase().includes("new"));
      if (filterMode === "pending") return items.filter((i) => !i.student?.isConverted);
    }
    if (category === "admissions") {
      if (filterMode === "confirmed") return items.filter((i) => i.student?.status === "Confirmed" || (i.statusBadge || "").toLowerCase().includes("confirmed"));
      if (filterMode === "pending") return items.filter((i) => i.student?.status !== "Confirmed");
    }
    if (category === "students") {
      if (filterMode === "male") return items.filter((i) => i.student?.gender === "Male");
      if (filterMode === "female") return items.filter((i) => i.student?.gender === "Female");
    }
    if (category === "fee_reminders") {
      if (filterMode === "high") {
        return items.filter((i) => {
          const bal = Number(i.student?.balance ?? (Number(i.student?.totalPackage || 0) - Number(i.student?.feeReceived || 0)));
          return bal >= 20000;
        });
      }
    }
    return items;
  }, [items, category, filterMode]);

  // Sample message for preview
  const previewSample = targetRecipients[0] || items[0] || null;

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [dispatchLogs]);

  // Start Bulk Dispatch
  const handleStartDispatch = async () => {
    if (targetRecipients.length === 0) {
      toast.error("No recipients match the selected criteria.");
      return;
    }

    setIsDispatching(true);
    setIsCompleted(false);
    setCurrentIndex(0);
    setSentCount(0);
    setFailedCount(0);
    setDispatchLogs([]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let sCount = 0;
    let fCount = 0;

    for (let i = 0; i < targetRecipients.length; i++) {
      if (controller.signal.aborted) {
        break;
      }

      const item = targetRecipients[i];
      setCurrentIndex(i + 1);
      setCurrentRecipient(item);

      const rawPhone = item.phone || item.student?.fatherContact || item.student?.contact || "";
      const cleanPhone = formatWhatsAppPhone(rawPhone);
      const timeStr = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      if (!cleanPhone) {
        fCount++;
        setFailedCount(fCount);
        setDispatchLogs((prev) => [
          ...prev,
          { name: item.name, phone: rawPhone || "Missing", status: "skipped", time: timeStr },
        ]);
        continue;
      }

      try {
        const res = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanPhone, message: item.message }),
          signal: controller.signal,
        });

        if (res.ok) {
          sCount++;
          setSentCount(sCount);
          setDispatchLogs((prev) => [
            ...prev,
            { name: item.name, phone: cleanPhone, status: "sent", time: timeStr },
          ]);
        } else {
          fCount++;
          setFailedCount(fCount);
          setDispatchLogs((prev) => [
            ...prev,
            { name: item.name, phone: cleanPhone, status: "failed", time: timeStr },
          ]);
        }
      } catch (err: any) {
        if (controller.signal.aborted) break;
        fCount++;
        setFailedCount(fCount);
        setDispatchLogs((prev) => [
          ...prev,
          { name: item.name, phone: cleanPhone, status: "failed", time: timeStr },
        ]);
      }

      // Safe anti-ban delay between messages
      if (i < targetRecipients.length - 1 && !controller.signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
      }
    }

    setIsDispatching(false);
    setIsCompleted(true);
    toast.success(`WhatsApp Broadcast completed! Sent: ${sCount}, Failed: ${fCount}`);
    onFinished?.();
  };

  const handleCancelDispatch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsDispatching(false);
    toast.info("WhatsApp broadcast stopped by user.");
  };

  const progressPercent = targetRecipients.length > 0 ? Math.round((currentIndex / targetRecipients.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !isDispatching && onOpenChange(v)}>
      <DialogContent className="max-w-2xl w-[95vw] p-0 rounded-3xl overflow-hidden border-none shadow-2xl bg-white max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#044e42] via-[#0b6355] to-[#044e42] p-6 text-white shrink-0 relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/20 shadow-inner">
                <MessageSquare size={24} />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-[9px] font-black uppercase tracking-wider text-emerald-200 mb-1">
                  <Sparkles size={10} /> Superior College Jahanian
                </div>
                <DialogTitle className="text-xl font-bold font-serif">{title}</DialogTitle>
                <p className="text-emerald-100/80 text-xs font-medium mt-0.5">
                  {subtitle || `Target Audience: ${targetRecipients.length} Students Selected`}
                </p>
              </div>
            </div>

            <Badge variant="outline" className="border-white/20 text-white bg-white/10 text-[10px] font-mono px-2.5 py-1">
              {targetRecipients.length} Target
            </Badge>
          </div>

          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 1. Recipient Filter Tabs */}
          {!isDispatching && !isCompleted && (
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Audience Selection Filter:</span>
                <span className="text-superior-teal font-mono font-bold text-xs">{targetRecipients.length} to receive</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {category === "daily_attendance" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setFilterMode("absent")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "absent"
                          ? "bg-rose-50 border-rose-300 text-rose-800 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">🚨 Absentees Only</span>
                        <Badge variant="secondary" className="bg-rose-200 text-rose-900 text-[10px]">
                          {items.filter((i) => i.isAbsent).length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Ghair hazir bacho ke parents</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterMode("all")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "all"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">📢 All Students</span>
                        <Badge variant="secondary" className="bg-emerald-200 text-emerald-900 text-[10px]">
                          {items.length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Present + Absent + Leaves</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterMode("present")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "present"
                          ? "bg-blue-50 border-blue-300 text-blue-800 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">✅ Present Only</span>
                        <Badge variant="secondary" className="bg-blue-200 text-blue-900 text-[10px]">
                          {items.filter((i) => !i.isAbsent).length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Sirf hazir talba</p>
                    </button>
                  </>
                )}

                {category === "test_marks" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setFilterMode("all")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "all"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">📊 All Evaluated</span>
                        <Badge variant="secondary" className="bg-emerald-200 text-emerald-900 text-[10px]">
                          {items.length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Tamam marks darj shuda</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterMode("failed")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "failed"
                          ? "bg-amber-50 border-amber-300 text-amber-900 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">⚠️ Needs Improvement</span>
                        <Badge variant="secondary" className="bg-amber-200 text-amber-900 text-[10px]">
                          {items.filter((i) => i.isFailed).length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Marks less than 50%</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterMode("top")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "top"
                          ? "bg-purple-50 border-purple-300 text-purple-900 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">🏆 Top Positions</span>
                        <Badge variant="secondary" className="bg-purple-200 text-purple-900 text-[10px]">
                          {items.filter((i) => i.isTopRank).length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">1st, 2nd & 3rd ranks</p>
                    </button>
                  </>
                )}

                {(category === "monthly_attendance" || category === "monthly_merit") && (
                  <button
                    type="button"
                    onClick={() => setFilterMode("all")}
                    className="p-3 rounded-2xl border bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs font-bold text-left col-span-2 sm:col-span-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">📢 All Students in Selected Section</span>
                      <Badge variant="secondary" className="bg-emerald-200 text-emerald-900 text-[10px]">
                        {items.length} Students
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal">
                      Har bache ke parent ko unka personalized monthly performance digest dispatch hoga
                    </p>
                  </button>
                )}

                {category === "leads" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setFilterMode("all")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "all"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">📢 All Leads Pool</span>
                        <Badge variant="secondary" className="bg-emerald-200 text-emerald-900 text-[10px]">
                          {items.length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Tamam filtered prospects</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterMode("new")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "new"
                          ? "bg-blue-50 border-blue-300 text-blue-800 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">🆕 New Inquiries</span>
                        <Badge variant="secondary" className="bg-blue-200 text-blue-900 text-[10px]">
                          {items.filter((i) => i.student?.pipelineStage === "new" || (i.statusBadge || "").toLowerCase().includes("new")).length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Taza dakhla inquiries</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterMode("pending")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "pending"
                          ? "bg-amber-50 border-amber-300 text-amber-900 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">⏳ Unconverted</span>
                        <Badge variant="secondary" className="bg-amber-200 text-amber-900 text-[10px]">
                          {items.filter((i) => !i.student?.isConverted).length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Ghair dakhil shuda leads</p>
                    </button>
                  </>
                )}

                {category === "admissions" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setFilterMode("all")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "all"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">📢 All Applicants</span>
                        <Badge variant="secondary" className="bg-emerald-200 text-emerald-900 text-[10px]">
                          {items.length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Tamam filtered dakhlay</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterMode("confirmed")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "confirmed"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">✅ Confirmed Dakhlay</span>
                        <Badge variant="secondary" className="bg-emerald-200 text-emerald-900 text-[10px]">
                          {items.filter((i) => i.student?.status === "Confirmed" || (i.statusBadge || "").toLowerCase().includes("confirmed")).length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Allotted Roll No & Section</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterMode("pending")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "pending"
                          ? "bg-amber-50 border-amber-300 text-amber-900 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">⏳ Under Verification</span>
                        <Badge variant="secondary" className="bg-amber-200 text-amber-900 text-[10px]">
                          {items.filter((i) => i.student?.status !== "Confirmed").length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Docs / Fee pending</p>
                    </button>
                  </>
                )}

                {category === "students" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setFilterMode("all")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "all"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">📢 All Enrolled</span>
                        <Badge variant="secondary" className="bg-emerald-200 text-emerald-900 text-[10px]">
                          {items.length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Both Campuses</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterMode("male")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "male"
                          ? "bg-blue-50 border-blue-300 text-blue-800 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">👦 Boys Campus</span>
                        <Badge variant="secondary" className="bg-blue-200 text-blue-900 text-[10px]">
                          {items.filter((i) => i.student?.gender === "Male").length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Male students only</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterMode("female")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "female"
                          ? "bg-pink-50 border-pink-300 text-pink-900 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">👧 Girls Campus</span>
                        <Badge variant="secondary" className="bg-pink-200 text-pink-900 text-[10px]">
                          {items.filter((i) => i.student?.gender === "Female").length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Female students only</p>
                    </button>
                  </>
                )}

                {category === "fee_reminders" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setFilterMode("all")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "all"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">📢 All Defaulters</span>
                        <Badge variant="secondary" className="bg-emerald-200 text-emerald-900 text-[10px]">
                          {items.length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Har baqaya student</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterMode("high")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        filterMode === "high"
                          ? "bg-rose-50 border-rose-300 text-rose-900 shadow-xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">🚨 High Balance (≥ 20k)</span>
                        <Badge variant="secondary" className="bg-rose-200 text-rose-900 text-[10px]">
                          {items.filter((i) => {
                            const bal = Number(i.student?.balance ?? (Number(i.student?.totalPackage || 0) - Number(i.student?.feeReceived || 0)));
                            return bal >= 20000;
                          }).length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">Heavy dues priority</p>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 2. Anti-Ban Delay & Speed Selector */}
          {!isDispatching && !isCompleted && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Shield size={16} className="text-emerald-600" />
                  <span>Anti-Ban Safety Throttle (Safe Interval):</span>
                </div>
                <span className="font-mono text-xs font-black text-emerald-700">{delaySeconds}s per message</span>
              </div>
              <div className="flex items-center gap-2">
                {[1.5, 2.5, 4.0].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDelaySeconds(sec)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      delaySeconds === sec
                        ? "bg-white text-emerald-800 border border-emerald-300 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 bg-slate-200/40"
                    }`}
                  >
                    {sec === 1.5 ? "⚡ Fast (1.5s)" : sec === 2.5 ? "🛡️ Standard (2.5s)" : "🧘 Relaxed (4.0s)"}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Tip: Standard interval (2.5s) safe rahta hai taake WhatsApp account par spam restriction na lage.
              </p>
            </div>
          )}

          {/* 3. Live Message Preview Box */}
          {!isDispatching && !isCompleted && previewSample && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Eye size={14} /> WhatsApp Message Preview (Sample: {previewSample.name}):
                </span>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs font-bold text-superior-teal hover:underline"
                >
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </button>
              </div>

              {showPreview && (
                <div className="p-4 rounded-2xl bg-[#efeae2] dark:bg-slate-900 border border-[#dad3c8] text-slate-800 dark:text-slate-100 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner max-h-56 overflow-y-auto">
                  {previewSample.message}
                </div>
              )}
            </div>
          )}

          {/* 4. Active Dispatch Progress UI */}
          {isDispatching && (
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center animate-spin">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Broadcasting via WhatsApp...</h4>
                    <p className="text-xs text-slate-400 font-medium">
                      Sending {currentIndex} of {targetRecipients.length} messages ({progressPercent}%)
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono text-xs px-3 py-1">
                  {progressPercent}%
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400">Total</p>
                  <p className="text-lg font-black text-slate-800">{targetRecipients.length}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <p className="text-[10px] font-black uppercase text-emerald-600">Dispatched</p>
                  <p className="text-lg font-black text-emerald-700">{sentCount}</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                  <p className="text-[10px] font-black uppercase text-rose-600">Skipped/Failed</p>
                  <p className="text-lg font-black text-rose-700">{failedCount}</p>
                </div>
              </div>

              {/* Live recipient current target */}
              {currentRecipient && (
                <div className="p-3 bg-emerald-100/40 rounded-xl border border-emerald-200/60 text-xs font-bold text-emerald-900 flex items-center justify-between">
                  <span>Current: {currentRecipient.name} ({currentRecipient.rollNo || 'N/A'})</span>
                  <span className="font-mono text-emerald-700">+{currentRecipient.phone || 'N/A'}</span>
                </div>
              )}
            </div>
          )}

          {/* 5. Dispatch Logs Scrollable */}
          {(isDispatching || isCompleted) && dispatchLogs.length > 0 && (
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Live Dispatch Audit Trail ({dispatchLogs.length} events):
              </label>
              <div className="bg-slate-900 text-slate-200 rounded-2xl p-3 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1.5">
                {dispatchLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="truncate max-w-[280px]">
                      {log.status === "sent" ? (
                        <span className="text-emerald-400">✔ [SENT] </span>
                      ) : (
                        <span className="text-rose-400">✖ [{log.status.toUpperCase()}] </span>
                      )}
                      {log.name}
                    </span>
                    <span className="text-slate-400 text-[10px] shrink-0">
                      {log.phone} • {log.time}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {/* 6. Completed Summary View */}
          {isCompleted && (
            <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-200 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-black text-emerald-900 font-serif">Broadcast Complete!</h3>
              <p className="text-xs text-emerald-700 font-medium">
                Successfully dispatched WhatsApp messages to <span className="font-bold">{sentCount}</span> recipients.
                {failedCount > 0 && ` (${failedCount} were skipped due to invalid/missing numbers).`}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          {!isDispatching && !isCompleted ? (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-11 rounded-xl text-slate-600 font-bold px-5"
              >
                Cancel
              </Button>

              <Button
                onClick={handleStartDispatch}
                disabled={targetRecipients.length === 0}
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-md shadow-emerald-600/20"
              >
                <Send size={16} className="mr-2" /> Start Broadcast ({targetRecipients.length})
              </Button>
            </>
          ) : isDispatching ? (
            <>
              <div className="text-xs font-bold text-slate-500">
                Please do not close this window while sending...
              </div>
              <Button
                variant="destructive"
                onClick={handleCancelDispatch}
                className="h-11 rounded-xl font-bold px-6"
              >
                <Square size={16} className="mr-2" /> Stop Broadcast
              </Button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <Button
                onClick={() => onOpenChange(false)}
                className="h-11 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold px-8"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
