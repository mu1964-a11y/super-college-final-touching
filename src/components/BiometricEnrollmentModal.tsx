import React, { useState, useEffect, useCallback } from "react";
import {
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Users,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  HelpCircle,
  Trash2,
  ArrowRight,
  UserCheck
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "../lib/supabase";
import {
  secugenService,
  SecuGenStatus,
  FingerprintCaptureResult
} from "../lib/secugenService";
import { Student, Staff } from "../types";

export interface BiometricPersonTarget {
  id: string;
  fullName: string;
  fatherName?: string;
  collegeNo?: string;
  phone?: string;
  personType: "student" | "staff";
  roleOrGroup?: string;
  photo?: string;
  fingerprintTemplate?: string;
  fingerprintFinger?: string;
  fingerprintEnrolledAt?: string;
}

interface BiometricEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If provided, modal opens directly for this specific person
  targetPerson?: BiometricPersonTarget | null;
  // Full rosters for search/bulk enrollment mode
  studentsList?: Student[];
  staffList?: Staff[];
  onEnrollmentSaved?: (personId: string, personType: "student" | "staff", template: string, finger: string) => void;
}

const FINGER_OPTIONS = [
  { id: "right_thumb", label: "Right Thumb (دایاں انگوٹھا)", short: "R. Thumb" },
  { id: "right_index", label: "Right Index (شہادت کی انگلی)", short: "R. Index" },
  { id: "left_thumb", label: "Left Thumb (بایاں انگوٹھا)", short: "L. Thumb" },
  { id: "left_index", label: "Left Index (بائیں شہادت انگلی)", short: "L. Index" },
];

export default function BiometricEnrollmentModal({
  isOpen,
  onClose,
  targetPerson,
  studentsList = [],
  staffList = [],
  onEnrollmentSaved,
}: BiometricEnrollmentModalProps) {
  // Device state
  const [deviceStatus, setDeviceStatus] = useState<SecuGenStatus>({
    connected: false,
    serviceRunning: false,
    deviceFound: false,
    activeUrl: null,
  });
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);

  // Active Person selection
  const [selectedPerson, setSelectedPerson] = useState<BiometricPersonTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"students" | "staff">("students");
  const [filterMissingOnly, setFilterMissingOnly] = useState(false);

  // Enrollment workflow state
  const [selectedFinger, setSelectedFinger] = useState("right_thumb");
  const [enrollStep, setEnrollStep] = useState<"ready" | "capturing_1" | "capturing_2" | "completed">("ready");
  const [sample1, setSample1] = useState<FingerprintCaptureResult | null>(null);
  const [sample2, setSample2] = useState<FingerprintCaptureResult | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Check SecuGen hardware status
  const refreshDeviceStatus = useCallback(async () => {
    setIsCheckingDevice(true);
    try {
      const status = await secugenService.getStatus(true);
      setDeviceStatus(status);
    } catch (err: any) {
      console.warn("Device status check failed:", err);
    } finally {
      setIsCheckingDevice(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshDeviceStatus();
    }
  }, [isOpen, refreshDeviceStatus]);

  // Set initial selected person
  useEffect(() => {
    if (targetPerson) {
      setSelectedPerson(targetPerson);
      setActiveTab(targetPerson.personType === "staff" ? "staff" : "students");
    } else {
      setSelectedPerson(null);
    }
    // Reset enrollment samples
    setEnrollStep("ready");
    setSample1(null);
    setSample2(null);
    setMatchScore(null);
  }, [targetPerson, isOpen]);

  // Available students list
  const filteredStudents = React.useMemo(() => {
    let list = studentsList;
    if (filterMissingOnly) {
      list = list.filter((s) => !s.fingerprintTemplate);
    }
    if (!searchQuery.trim()) return list.slice(0, 50);

    const q = searchQuery.toLowerCase().trim();
    return list
      .filter(
        (s) =>
          (s.fullName || "").toLowerCase().includes(q) ||
          (s.fatherName || "").toLowerCase().includes(q) ||
          (s.id || "").toLowerCase().includes(q) ||
          (s.collegeNo || "").toLowerCase().includes(q) ||
          (s.contact || "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [studentsList, searchQuery, filterMissingOnly]);

  // Available staff list
  const filteredStaff = React.useMemo(() => {
    let list = staffList;
    if (filterMissingOnly) {
      list = list.filter((s) => !s.fingerprintTemplate);
    }
    if (!searchQuery.trim()) return list.slice(0, 50);

    const q = searchQuery.toLowerCase().trim();
    return list
      .filter(
        (s) =>
          (s.fullName || "").toLowerCase().includes(q) ||
          (s.fatherName || "").toLowerCase().includes(q) ||
          (s.id || "").toLowerCase().includes(q) ||
          (s.role || "").toLowerCase().includes(q) ||
          (s.contact || "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [staffList, searchQuery, filterMissingOnly]);

  // Step 1: Capture first fingerprint sample
  const handleCaptureSample1 = async () => {
    if (!selectedPerson) {
      toast.error("Please select a student or staff member first.");
      return;
    }

    setEnrollStep("capturing_1");
    toast.info("Please place finger firmly on SecuGen scanner...", { id: "secugen-cap" });

    const result = await secugenService.captureFingerprint({
      timeoutMs: 12000,
      quality: 50,
      templateFormat: "ISO",
    });

    if (!result.success || !result.templateBase64) {
      toast.error(result.error || "Failed to capture fingerprint.", { id: "secugen-cap" });
      setEnrollStep("ready");
      return;
    }

    setSample1(result);
    setEnrollStep("ready");
    toast.success(`Sample 1 Captured (Quality: ${result.quality}%)! Now capture sample 2.`, {
      id: "secugen-cap",
    });
  };

  // Step 2: Capture second fingerprint sample & verify consistency
  const handleCaptureSample2 = async () => {
    if (!sample1?.templateBase64) {
      toast.error("Please capture sample 1 first.");
      return;
    }

    setEnrollStep("capturing_2");
    toast.info("Lift and place the SAME finger again to confirm...", { id: "secugen-cap" });

    const result = await secugenService.captureFingerprint({
      timeoutMs: 12000,
      quality: 50,
      templateFormat: "ISO",
    });

    if (!result.success || !result.templateBase64) {
      toast.error(result.error || "Failed to capture second sample.", { id: "secugen-cap" });
      setEnrollStep("ready");
      return;
    }

    setSample2(result);

    // Verify consistency between Sample 1 and Sample 2
    const match = await secugenService.matchFingerprints(
      sample1.templateBase64,
      result.templateBase64,
      "ISO"
    );

    setMatchScore(match.matchingScore);

    if (match.isMatched || match.matchingScore >= 80) {
      setEnrollStep("completed");
      toast.success(
        `Fingerprint Verified (Match Score: ${match.matchingScore})! Ready to save.`,
        { id: "secugen-cap" }
      );
    } else {
      setEnrollStep("ready");
      toast.error(
        `Fingerprints did not match (Score: ${match.matchingScore}). Please make sure to place the same finger.`,
        { id: "secugen-cap" }
      );
    }
  };

  // Step 3: Save Enrolled Fingerprint into Database (Supabase + State)
  const handleSaveEnrollment = async () => {
    if (!selectedPerson || !sample1?.templateBase64) {
      toast.error("No valid fingerprint template to save.");
      return;
    }

    setIsSaving(true);
    const templateToSave = sample2?.templateBase64 || sample1.templateBase64;
    const enrolledAt = new Date().toISOString();
    const fingerLabel = FINGER_OPTIONS.find((f) => f.id === selectedFinger)?.label || selectedFinger;

    try {
      const table = selectedPerson.personType === "staff" ? "staff" : "students";
      
      const { error } = await supabase
        .from(table)
        .update({
          fingerprint_template: templateToSave,
          fingerprint_finger: fingerLabel,
          fingerprint_enrolled_at: enrolledAt,
        })
        .eq("id", selectedPerson.id);

      if (error) {
        console.warn("Supabase fingerprint update error (retrying with student_id):", error);
        // Fallback for admissions table if target is an admission
        await supabase
          .from("admissions")
          .update({
            fingerprint_template: templateToSave,
            fingerprint_finger: fingerLabel,
            fingerprint_enrolled_at: enrolledAt,
          })
          .eq("id", selectedPerson.id);
      }

      // Notify parent component
      onEnrollmentSaved?.(
        selectedPerson.id,
        selectedPerson.personType,
        templateToSave,
        fingerLabel
      );

      // Update selected person state
      setSelectedPerson((prev) =>
        prev
          ? {
              ...prev,
              fingerprintTemplate: templateToSave,
              fingerprintFinger: fingerLabel,
              fingerprintEnrolledAt: enrolledAt,
            }
          : null
      );

      toast.success(`Fingerprint registered successfully for ${selectedPerson.fullName}! 🎉`);

      // If we are in bulk mode, advance to next unregistered person
      if (!targetPerson) {
        handleNextUnregistered();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(`Failed to save fingerprint: ${err.message || String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Advances to next student/staff who doesn't have a fingerprint
  const handleNextUnregistered = () => {
    const list = activeTab === "students" ? studentsList : staffList;
    const next = list.find((item) => !item.fingerprintTemplate && item.id !== selectedPerson?.id);

    if (next) {
      setSelectedPerson({
        id: next.id,
        fullName: next.fullName,
        fatherName: next.fatherName,
        collegeNo: (next as any).collegeNo,
        phone: (next as any).contact,
        personType: activeTab === "students" ? "student" : "staff",
        roleOrGroup: (next as any).group || (next as any).role,
        photo: (next as any).photo,
        fingerprintTemplate: next.fingerprintTemplate,
      });
      setEnrollStep("ready");
      setSample1(null);
      setSample2(null);
      setMatchScore(null);
    } else {
      toast.success("All members in this category have registered fingerprints!");
    }
  };

  // Remove existing fingerprint
  const handleRemoveFingerprint = async () => {
    if (!selectedPerson) return;
    if (!confirm(`Are you sure you want to remove the fingerprint for ${selectedPerson.fullName}?`)) {
      return;
    }

    setIsSaving(true);
    try {
      const table = selectedPerson.personType === "staff" ? "staff" : "students";
      await supabase
        .from(table)
        .update({
          fingerprint_template: null,
          fingerprint_finger: null,
          fingerprint_enrolled_at: null,
        })
        .eq("id", selectedPerson.id);

      setSelectedPerson((prev) =>
        prev
          ? {
              ...prev,
              fingerprintTemplate: undefined,
              fingerprintFinger: undefined,
              fingerprintEnrolledAt: undefined,
            }
          : null
      );
      setEnrollStep("ready");
      setSample1(null);
      setSample2(null);
      toast.success("Fingerprint removed.");
    } catch (err: any) {
      toast.error("Failed to delete fingerprint.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#085a4e] via-[#0a6c5e] to-[#085a4e] p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
                <Fingerprint size={26} />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  Biometric Fingerprint Enrollment
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                    SecuGen HU20-A
                  </span>
                </DialogTitle>
                <p className="text-xs text-emerald-100 font-medium">
                  Register thumb impressions for Students & Staff for instant gate attendance & verification
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelpGuide(!showHelpGuide)}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl text-xs flex items-center gap-1.5"
            >
              <HelpCircle size={15} />
              <span>Setup Guide</span>
            </Button>
          </div>

          {/* Hardware Connection Bar */}
          <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  deviceStatus.connected
                    ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : deviceStatus.serviceRunning
                    ? "bg-amber-400"
                    : "bg-rose-400"
                )}
              />
              <span className="font-semibold text-white/90">
                {deviceStatus.connected
                  ? `SecuGen HU20-A Scanner Ready (${deviceStatus.activeUrl})`
                  : deviceStatus.serviceRunning
                  ? "SecuGen WebAPI Connected, but Scanner is Unplugged"
                  : "SecuGen WebAPI Not Detected"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {deviceStatus.isSslCertificateRequired && (
                <a
                  href="https://localhost:8443/SGIFPCapture"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider hover:bg-amber-300 transition-colors flex items-center gap-1"
                >
                  <span>Allow SSL Certificate</span>
                  <ExternalLink size={12} />
                </a>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={refreshDeviceStatus}
                disabled={isCheckingDevice}
                className="h-7 px-2.5 rounded-lg border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase tracking-wider"
              >
                <RefreshCw size={12} className={cn("mr-1", isCheckingDevice && "animate-spin")} />
                Refresh Device
              </Button>
            </div>
          </div>
        </div>

        {/* Setup Guide Accordion */}
        {showHelpGuide && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                SecuGen HU20-A Installation & Operating Instructions:
              </span>
              <button onClick={() => setShowHelpGuide(false)} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                <strong>Install SecuGen WebAPI</strong>: Run the official SecuGen WebAPI Windows installer on this PC (creates a local service on port 8443).
              </li>
              <li>
                <strong>Plug in USB Scanner</strong>: Connect SecuGen Hamster Pro 20 (HU20-A) to any USB 2.0/3.0 port. The blue light will illuminate.
              </li>
              <li>
                <strong>Browser SSL Acceptance (One-Time)</strong>: If browser shows &quot;WebAPI Not Detected&quot;, click &quot;Allow SSL Certificate&quot; above, then click &quot;Advanced &gt; Proceed to localhost (unsafe)&quot;. Chrome will permanently allow it.
              </li>
              <li>
                <strong>Capture &amp; Enroll</strong>: Select finger, place finger flat on optical glass for Sample 1, then place again for Sample 2 to verify.
              </li>
            </ol>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[75vh] overflow-y-auto">
          {/* Left Column: Person Selection (if not locked to targetPerson) */}
          <div className={cn("space-y-4", targetPerson ? "hidden" : "md:col-span-5")}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Select Person to Enroll
              </h4>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
                <button
                  onClick={() => setActiveTab("students")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all",
                    activeTab === "students"
                      ? "bg-white dark:bg-slate-700 text-superior-teal shadow-xs font-black"
                      : "text-slate-500"
                  )}
                >
                  Students ({studentsList.length})
                </button>
                <button
                  onClick={() => setActiveTab("staff")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all",
                    activeTab === "staff"
                      ? "bg-white dark:bg-slate-700 text-superior-teal shadow-xs font-black"
                      : "text-slate-500"
                  )}
                >
                  Staff ({staffList.length})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={`Search ${activeTab === "students" ? "student name, roll no..." : "teacher name, role..."}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 text-xs"
              />
            </div>

            {/* Filter Missing Only */}
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={filterMissingOnly}
                onChange={(e) => setFilterMissingOnly(e.target.checked)}
                className="rounded border-slate-300 text-superior-teal"
              />
              <span>Show missing fingerprints only</span>
            </label>

            {/* Person List */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {activeTab === "students" ? (
                filteredStudents.map((s) => {
                  const isSelected = selectedPerson?.id === s.id;
                  const hasFP = Boolean(s.fingerprintTemplate);
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedPerson({
                          id: s.id,
                          fullName: s.fullName,
                          fatherName: s.fatherName,
                          collegeNo: s.collegeNo,
                          phone: s.contact,
                          personType: "student",
                          roleOrGroup: s.group,
                          photo: s.photo,
                          fingerprintTemplate: s.fingerprintTemplate,
                          fingerprintFinger: s.fingerprintFinger,
                          fingerprintEnrolledAt: s.fingerprintEnrolledAt,
                        });
                        setEnrollStep("ready");
                        setSample1(null);
                        setSample2(null);
                        setMatchScore(null);
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs",
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm"
                          : "bg-white dark:bg-slate-800 border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-superior-teal text-xs shrink-0 overflow-hidden">
                          {s.photo ? (
                            <img src={s.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            s.fullName.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {s.fullName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {s.collegeNo || s.id} • {s.group || "Student"}
                          </p>
                        </div>
                      </div>
                      {hasFP ? (
                        <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          Enrolled ✅
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                          Missing ⚠️
                        </Badge>
                      )}
                    </div>
                  );
                })
              ) : (
                filteredStaff.map((st) => {
                  const isSelected = selectedPerson?.id === st.id;
                  const hasFP = Boolean(st.fingerprintTemplate);
                  return (
                    <div
                      key={st.id}
                      onClick={() => {
                        setSelectedPerson({
                          id: st.id,
                          fullName: st.fullName,
                          fatherName: st.fatherName,
                          phone: st.contact,
                          personType: "staff",
                          roleOrGroup: st.role,
                          photo: st.photo,
                          fingerprintTemplate: st.fingerprintTemplate,
                          fingerprintFinger: st.fingerprintFinger,
                          fingerprintEnrolledAt: st.fingerprintEnrolledAt,
                        });
                        setEnrollStep("ready");
                        setSample1(null);
                        setSample2(null);
                        setMatchScore(null);
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs",
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm"
                          : "bg-white dark:bg-slate-800 border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-superior-teal text-xs shrink-0 overflow-hidden">
                          {st.photo ? (
                            <img src={st.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            st.fullName.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {st.fullName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {st.role} • {st.id}
                          </p>
                        </div>
                      </div>
                      {hasFP ? (
                        <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          Enrolled ✅
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                          Missing ⚠️
                        </Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Enrollment Desk */}
          <div className={cn("space-y-6", targetPerson ? "md:col-span-12" : "md:col-span-7")}>
            {selectedPerson ? (
              <>
                {/* Person Profile Header */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center text-lg font-black text-superior-teal border border-slate-200 shadow-xs overflow-hidden">
                      {selectedPerson.photo ? (
                        <img src={selectedPerson.photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        selectedPerson.fullName.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          {selectedPerson.fullName}
                        </h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            selectedPerson.personType === "staff"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          )}
                        >
                          {selectedPerson.personType}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        Father: {selectedPerson.fatherName || "N/A"} • ID: {selectedPerson.collegeNo || selectedPerson.id}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Group/Role: {selectedPerson.roleOrGroup || "General"}
                      </p>
                    </div>
                  </div>

                  {selectedPerson.fingerprintTemplate && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Enrolled ({selectedPerson.fingerprintFinger || "Registered"})
                      </span>
                      <button
                        onClick={handleRemoveFingerprint}
                        disabled={isSaving}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1"
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Finger Selection */}
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 block">
                    Choose Finger to Register:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FINGER_OPTIONS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFinger(f.id)}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all",
                          selectedFinger === f.id
                            ? "bg-[#085a4e] text-white border-[#085a4e] shadow-md shadow-emerald-900/10 font-bold"
                            : "bg-white dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-200 hover:border-slate-300"
                        )}
                      >
                        <p className="text-xs font-bold">{f.short}</p>
                        <p className="text-[10px] opacity-80 truncate">{f.label.split("(")[0]}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Biometric Capture Stage */}
                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-4">
                  <div className="flex items-center justify-center gap-6">
                    {/* Sample 1 Box */}
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          "w-24 h-28 rounded-2xl border-2 flex flex-col items-center justify-center relative overflow-hidden transition-all",
                          sample1?.bmpBase64
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                            : enrollStep === "capturing_1"
                            ? "border-amber-400 bg-amber-50 animate-pulse"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        )}
                      >
                        {sample1?.bmpBase64 ? (
                          <img
                            src={sample1.bmpBase64}
                            alt="Sample 1"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Fingerprint
                            size={36}
                            className={cn(
                              enrollStep === "capturing_1"
                                ? "text-amber-500 animate-bounce"
                                : "text-slate-300 dark:text-slate-600"
                            )}
                          />
                        )}
                        <span className="absolute bottom-1 right-1 text-[9px] font-mono font-bold px-1 rounded bg-black/60 text-white">
                          #1
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">
                        {sample1 ? `Sample 1 (${sample1.quality}%)` : "Sample 1"}
                      </span>
                    </div>

                    <div className="text-slate-300 font-bold text-xl">→</div>

                    {/* Sample 2 Box */}
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          "w-24 h-28 rounded-2xl border-2 flex flex-col items-center justify-center relative overflow-hidden transition-all",
                          sample2?.bmpBase64
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                            : enrollStep === "capturing_2"
                            ? "border-amber-400 bg-amber-50 animate-pulse"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        )}
                      >
                        {sample2?.bmpBase64 ? (
                          <img
                            src={sample2.bmpBase64}
                            alt="Sample 2"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Fingerprint
                            size={36}
                            className={cn(
                              enrollStep === "capturing_2"
                                ? "text-amber-500 animate-bounce"
                                : "text-slate-300 dark:text-slate-600"
                            )}
                          />
                        )}
                        <span className="absolute bottom-1 right-1 text-[9px] font-mono font-bold px-1 rounded bg-black/60 text-white">
                          #2
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">
                        {sample2 ? `Sample 2 (${sample2.quality}%)` : "Sample 2 (Confirm)"}
                      </span>
                    </div>
                  </div>

                  {/* Status Banner */}
                  {enrollStep === "capturing_1" && (
                    <p className="text-xs font-bold text-amber-600 animate-pulse">
                      Waiting for finger touch on SecuGen HU20-A sensor... (Sample 1)
                    </p>
                  )}
                  {enrollStep === "capturing_2" && (
                    <p className="text-xs font-bold text-amber-600 animate-pulse">
                      Lift finger and place again to confirm consistency... (Sample 2)
                    </p>
                  )}
                  {enrollStep === "completed" && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-600" />
                      <span>Fingerprint Verified &amp; Ready to Save! (Score: {matchScore})</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    {!sample1 && (
                      <Button
                        onClick={handleCaptureSample1}
                        disabled={enrollStep === "capturing_1" || !deviceStatus.connected}
                        className="h-11 px-6 rounded-xl bg-[#085a4e] hover:bg-[#06483e] text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-950/20"
                      >
                        <Fingerprint size={16} />
                        <span>{enrollStep === "capturing_1" ? "Scanning..." : "Scan Sample 1"}</span>
                      </Button>
                    )}

                    {sample1 && !sample2 && (
                      <Button
                        onClick={handleCaptureSample2}
                        disabled={enrollStep === "capturing_2" || !deviceStatus.connected}
                        className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-2 shadow-md"
                      >
                        <Fingerprint size={16} />
                        <span>{enrollStep === "capturing_2" ? "Scanning..." : "Scan Sample 2 (Verify)"}</span>
                      </Button>
                    )}

                    {sample1 && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSample1(null);
                          setSample2(null);
                          setMatchScore(null);
                          setEnrollStep("ready");
                        }}
                        className="h-11 px-4 rounded-xl text-xs font-bold text-slate-600"
                      >
                        Reset Scans
                      </Button>
                    )}

                    {enrollStep === "completed" && (
                      <Button
                        onClick={handleSaveEnrollment}
                        disabled={isSaving}
                        className="h-11 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 animate-bounce"
                      >
                        <Check size={16} />
                        <span>{isSaving ? "Saving to Database..." : "Save Fingerprint"}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center p-6">
                <Users size={48} className="opacity-20 mb-3" />
                <p className="font-bold text-sm">No Student or Staff Selected</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Choose a student or staff member from the left list to begin registering their thumb impression.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
