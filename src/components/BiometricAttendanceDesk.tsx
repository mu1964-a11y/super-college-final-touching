import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Users,
  Clock,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  Volume2,
  VolumeX,
  Send,
  LogIn,
  LogOut,
  Briefcase,
  GraduationCap,
  ExternalLink,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "../lib/supabase";
import {
  secugenService,
  SecuGenStatus,
  EnrolledCandidate
} from "../lib/secugenService";
import { Student, Staff } from "../types";
import BiometricEnrollmentModal from "./BiometricEnrollmentModal";
import { sendAutoDailyAttendanceNotice } from "../lib/whatsappAutomation";

interface BiometricAttendanceDeskProps {
  onBackToApp?: () => void;
  standalone?: boolean;
  collegeLogo?: string;
  collegeName?: string;
}

interface BiometricPunchLog {
  id: string;
  personId: string;
  fullName: string;
  fatherName?: string;
  rollNoOrRole: string;
  personType: "student" | "staff";
  photo?: string;
  time: string;
  date: string;
  status: "Present" | "Late";
  direction: "entry" | "exit";
  matchScore: number;
  finger: string;
  waStatus: "sending" | "sent" | "failed" | "skipped";
}

export default function BiometricAttendanceDesk({
  onBackToApp,
  standalone = false,
  collegeLogo = "/superior-logo.png",
  collegeName = "Superior College Jahanian",
}: BiometricAttendanceDeskProps) {
  // Device state
  const [deviceStatus, setDeviceStatus] = useState<SecuGenStatus>({
    connected: false,
    serviceRunning: false,
    deviceFound: false,
    activeUrl: null,
  });
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [autoLoopActive, setAutoLoopActive] = useState(false);

  // Enrolled Roster Candidates
  const [enrolledCandidates, setEnrolledCandidates] = useState<EnrolledCandidate[]>([]);
  const [rawStudents, setRawStudents] = useState<Student[]>([]);
  const [rawStaff, setRawStaff] = useState<Staff[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);

  // Today's Punches
  const [todayPunches, setTodayPunches] = useState<BiometricPunchLog[]>([]);
  const [lastPunchedPerson, setLastPunchedPerson] = useState<BiometricPunchLog | null>(null);

  // Enrollment Modal
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Manual fallback search
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Web Audio Synth for cheerful chime
  const playChime = useCallback((type: "success" | "late" | "error") => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      if (type === "success") {
        // Bright two-tone chime (G5 -> C6)
        osc.frequency.setValueAtTime(783.99, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15);
      } else if (type === "late") {
        // Mellow amber chime
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.15);
      } else {
        // Low error buzz
        osc.frequency.setValueAtTime(220.0, now);
        osc.frequency.exponentialRampToValueAtTime(146.83, now + 0.2);
      }

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch {}
  }, [soundEnabled]);

  // Load Device Status
  const checkDevice = useCallback(async () => {
    setIsCheckingDevice(true);
    try {
      const status = await secugenService.getStatus(true);
      setDeviceStatus(status);
    } catch (e) {
      console.warn("Device check error:", e);
    } finally {
      setIsCheckingDevice(false);
    }
  }, []);

  useEffect(() => {
    checkDevice();
  }, [checkDevice]);

  // Load Enrolled Candidates from Supabase
  const loadRoster = useCallback(async () => {
    setIsLoadingRoster(true);
    try {
      const [stuRes, staffRes] = await Promise.all([
        supabase
          .from("students")
          .select("id, full_name, father_name, college_no, group_name, group, contact, father_contact, photo, photo_url, fingerprint_template, fingerprint_finger"),
        supabase
          .from("staff")
          .select("id, full_name, father_name, contact, role, designation, photo, photo_url, fingerprint_template, fingerprint_finger"),
      ]);

      const candidates: EnrolledCandidate[] = [];

      if (stuRes.data) {
        setRawStudents(stuRes.data as any);
        stuRes.data.forEach((s: any) => {
          if (s.fingerprint_template) {
            candidates.push({
              id: s.id,
              fullName: s.full_name,
              fatherName: s.father_name,
              collegeNo: s.college_no,
              phone: s.father_contact || s.contact,
              personType: "student",
              roleOrGroup: s.group_name || s.group || "Student",
              photo: s.photo_url || s.photo,
              fingerprintTemplate: s.fingerprint_template,
              fingerprintFinger: s.fingerprint_finger || "Right Thumb",
            });
          }
        });
      }

      if (staffRes.data) {
        setRawStaff(staffRes.data as any);
        staffRes.data.forEach((st: any) => {
          if (st.fingerprint_template) {
            candidates.push({
              id: st.id,
              fullName: st.full_name,
              fatherName: st.father_name,
              phone: st.contact,
              personType: "staff",
              roleOrGroup: st.designation || st.role || "Faculty",
              photo: st.photo_url || st.photo,
              fingerprintTemplate: st.fingerprint_template,
              fingerprintFinger: st.fingerprint_finger || "Right Thumb",
            });
          }
        });
      }

      setEnrolledCandidates(candidates);
    } catch (err: any) {
      console.error("Roster load error:", err);
      toast.error("Failed to load enrolled candidates from database.");
    } finally {
      setIsLoadingRoster(false);
    }
  }, []);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  // Record Attendance in Database & WhatsApp
  const recordAttendance = async (
    candidate: EnrolledCandidate,
    matchScore: number
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    const timeNow = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const nowIso = new Date().toISOString();

    // Check college arrival policy (8:00 AM cutoff for Late)
    const currentHour = new Date().getHours();
    const currentMin = new Date().getMinutes();
    const isLate = currentHour > 8 || (currentHour === 8 && currentMin > 10);
    const status: "Present" | "Late" = isLate ? "Late" : "Present";

    // Play cheerful feedback
    playChime(isLate ? "late" : "success");

    const newPunch: BiometricPunchLog = {
      id: `${candidate.id}-${Date.now()}`,
      personId: candidate.id,
      fullName: candidate.fullName,
      fatherName: candidate.fatherName,
      rollNoOrRole: candidate.collegeNo || candidate.roleOrGroup || candidate.id,
      personType: candidate.personType,
      photo: candidate.photo,
      time: timeNow,
      date: today,
      status,
      direction: "entry",
      matchScore,
      finger: candidate.fingerprintFinger || "Thumb",
      waStatus: "sending",
    };

    setLastPunchedPerson(newPunch);
    setTodayPunches((prev) => [newPunch, ...prev.filter((p) => p.personId !== candidate.id)]);

    toast.success(
      `Biometric Check-in Confirmed: ${candidate.fullName} (${status})!`,
      { id: "punch-toast", duration: 3500 }
    );

    // 1. Save into Supabase Database
    try {
      if (candidate.personType === "student") {
        await supabase
          .from("student_attendance")
          .upsert(
            {
              student_id: candidate.id,
              date: today,
              status: status,
              check_in_time: nowIso,
              verification_method: "secugen_fingerprint",
              notes: `SecuGen HU20-A Match (Score: ${matchScore}, Finger: ${candidate.fingerprintFinger || "Thumb"})`,
            },
            { onConflict: "student_id,date" }
          );
      } else {
        await supabase
          .from("staff_attendance")
          .upsert(
            {
              staff_id: candidate.id,
              date: today,
              status: status,
              check_in_time: nowIso,
              verification_method: "secugen_fingerprint",
              notes: `SecuGen HU20-A Match (Score: ${matchScore}, Finger: ${candidate.fingerprintFinger || "Thumb"})`,
            },
            { onConflict: "staff_id,date" }
          );
      }
    } catch (dbErr) {
      console.error("Attendance database save error:", dbErr);
    }

    // 2. Dispatch WhatsApp Confirmation Notice to Parent/Staff
    if (candidate.phone) {
      try {
        const studentObj = rawStudents.find((s) => s.id === candidate.id);
        if (studentObj) {
          sendAutoDailyAttendanceNotice(studentObj, status, today, timeNow)
            .then((res) => {
              newPunch.waStatus = res.success ? "sent" : "failed";
              setTodayPunches((prev) =>
                prev.map((p) => (p.id === newPunch.id ? { ...p, waStatus: newPunch.waStatus } : p))
              );
            })
            .catch(() => {
              newPunch.waStatus = "failed";
              setTodayPunches((prev) =>
                prev.map((p) => (p.id === newPunch.id ? { ...p, waStatus: "failed" } : p))
              );
            });
        } else {
          newPunch.waStatus = "skipped";
        }
      } catch {
        newPunch.waStatus = "skipped";
      }
    } else {
      newPunch.waStatus = "skipped";
    }
  };

  // Perform a single live scan & match against enrolled database
  const handleSingleScan = async () => {
    if (isScanning) return;
    setIsScanning(true);

    toast.info("Please touch finger firmly on SecuGen scanner...", {
      id: "scan-info",
      duration: 3000,
    });

    try {
      const capResult = await secugenService.captureFingerprint({
        timeoutMs: 10000,
        quality: 50,
        templateFormat: "ISO",
      });

      if (!capResult.success || !capResult.templateBase64) {
        toast.error(capResult.error || "No finger detected or capture timed out.", {
          id: "scan-info",
        });
        setIsScanning(false);
        return;
      }

      // Match against enrolled roster
      if (enrolledCandidates.length === 0) {
        toast.error("No enrolled fingerprints found in database. Please enroll members first.", {
          id: "scan-info",
        });
        setIsScanning(false);
        return;
      }

      toast.loading("Matching against biometric database...", { id: "scan-info" });
      const identified = await secugenService.identifyCandidate(
        capResult.templateBase64,
        enrolledCandidates
      );

      if (identified) {
        toast.dismiss("scan-info");
        await recordAttendance(identified.candidate, identified.score);
      } else {
        playChime("error");
        toast.error(
          "Fingerprint not recognized. Please make sure the student/staff is registered.",
          { id: "scan-info", duration: 4000 }
        );
      }
    } catch (err: any) {
      toast.error(`Scan error: ${err.message || String(err)}`, { id: "scan-info" });
    } finally {
      setIsScanning(false);
    }
  };

  // Continuous Auto-Loop (Waits for touch repeatedly)
  useEffect(() => {
    let isCancelled = false;

    async function runAutoLoop() {
      if (!autoLoopActive || isScanning || !deviceStatus.connected) return;

      while (autoLoopActive && !isCancelled) {
        setIsScanning(true);
        try {
          const cap = await secugenService.captureFingerprint({
            timeoutMs: 6000,
            quality: 48,
            templateFormat: "ISO",
          });

          if (isCancelled) break;

          if (cap.success && cap.templateBase64) {
            const identified = await secugenService.identifyCandidate(
              cap.templateBase64,
              enrolledCandidates
            );
            if (identified) {
              await recordAttendance(identified.candidate, identified.score);
              // Brief pause before next scan
              await new Promise((r) => setTimeout(r, 2000));
            } else {
              playChime("error");
              toast.error("Unrecognized finger. Please try again or register student.", { duration: 3000 });
              await new Promise((r) => setTimeout(r, 1500));
            }
          }
        } catch (loopErr) {
          console.warn("Auto-loop step:", loopErr);
          await new Promise((r) => setTimeout(r, 1000));
        } finally {
          setIsScanning(false);
        }
      }
    }

    if (autoLoopActive) {
      runAutoLoop();
    }

    return () => {
      isCancelled = true;
    };
  }, [autoLoopActive, deviceStatus.connected, enrolledCandidates]);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullScreen(false);
    }
  };

  // Filtered manual search roster
  const filteredManualList = React.useMemo(() => {
    if (!manualSearchQuery.trim()) return [];
    const q = manualSearchQuery.toLowerCase().trim();
    const students = rawStudents
      .filter(
        (s) =>
          (s.fullName || "").toLowerCase().includes(q) ||
          (s.fatherName || "").toLowerCase().includes(q) ||
          (s.collegeNo || "").toLowerCase().includes(q) ||
          (s.id || "").toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        fullName: s.fullName,
        fatherName: s.fatherName,
        collegeNo: s.collegeNo,
        phone: s.contact,
        personType: "student" as const,
        roleOrGroup: s.group,
        photo: s.photo,
        fingerprintTemplate: s.fingerprintTemplate,
      }));

    const staff = rawStaff
      .filter(
        (st) =>
          (st.fullName || "").toLowerCase().includes(q) ||
          (st.role || "").toLowerCase().includes(q) ||
          (st.id || "").toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((st) => ({
        id: st.id,
        fullName: st.fullName,
        fatherName: st.fatherName,
        phone: st.contact,
        personType: "staff" as const,
        roleOrGroup: st.role,
        photo: st.photo,
        fingerprintTemplate: st.fingerprintTemplate,
      }));

    return [...students, ...staff];
  }, [manualSearchQuery, rawStudents, rawStaff]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-sans select-none">
      {/* Top Navigation & Status Bar */}
      <header className="bg-gradient-to-r from-[#085a4e] via-[#0b6e60] to-[#085a4e] text-white px-6 py-4 shadow-xl border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {onBackToApp && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBackToApp}
                className="rounded-xl border-white/20 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase"
              >
                <ArrowLeft size={16} className="mr-1.5" /> Back to App
              </Button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-inner">
                <Fingerprint size={22} />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight flex items-center gap-2">
                  <span>SecuGen Biometric Attendance Desk</span>
                  <span className="text-[10px] font-mono font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                    HU20-A (Made in Korea)
                  </span>
                </h1>
                <p className="text-[11px] text-emerald-100 font-medium">
                  {collegeName} • Instant Check-in &amp; Parent WhatsApp Notices
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* SecuGen Hardware Status Badge */}
            <div
              onClick={checkDevice}
              title="Click to re-check hardware"
              className={cn(
                "px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold cursor-pointer transition-all",
                deviceStatus.connected
                  ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-200"
                  : deviceStatus.serviceRunning
                  ? "bg-amber-500/20 border-amber-400/50 text-amber-200"
                  : "bg-rose-500/20 border-rose-400/50 text-rose-200"
              )}
            >
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
              <span>
                {deviceStatus.connected
                  ? "Scanner Ready"
                  : deviceStatus.serviceRunning
                  ? "Scanner Unplugged"
                  : "WebAPI Offline"}
              </span>
              <RefreshCw size={12} className={cn(isCheckingDevice && "animate-spin")} />
            </div>

            {/* Enrolled Count Badge */}
            <Badge
              variant="outline"
              className="border-white/20 bg-white/10 text-white font-bold text-xs px-2.5 py-1"
            >
              <Users size={13} className="mr-1.5 text-amber-300" />
              {enrolledCandidates.length} Enrolled Profiles
            </Badge>

            {/* Audio Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white hover:bg-white/10 rounded-xl h-9 px-2.5"
              title="Toggle Audio Chimes"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </Button>

            {/* Register New Fingerprint Button */}
            <Button
              onClick={() => setIsEnrollModalOpen(true)}
              className="h-9 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 border-none"
            >
              <Plus size={15} />
              <span>Enroll Fingerprint</span>
            </Button>

            {/* Fullscreen Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/10 rounded-xl h-9 px-2.5"
              title="Toggle Fullscreen"
            >
              {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Big Touch-to-Scan & Last Punched Card */}
        <div className="lg:col-span-7 space-y-6">
          {/* Big Interactive Scanner Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Aesthetic Glow */}
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4 max-w-md mx-auto">
              {/* Animated Fingerprint Sensor Target */}
              <button
                type="button"
                onClick={handleSingleScan}
                disabled={isScanning || !deviceStatus.connected}
                className={cn(
                  "w-36 h-36 mx-auto rounded-3xl flex flex-col items-center justify-center transition-all duration-300 shadow-2xl relative group cursor-pointer",
                  isScanning
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 scale-105 animate-pulse shadow-amber-500/30"
                    : deviceStatus.connected
                    ? "bg-gradient-to-br from-[#085a4e] to-[#0d7d6c] text-white hover:scale-105 active:scale-95 shadow-emerald-900/30 ring-4 ring-emerald-500/20"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                )}
              >
                <Fingerprint
                  size={64}
                  className={cn(
                    "transition-transform",
                    isScanning && "animate-bounce",
                    "group-hover:scale-110"
                  )}
                />
                <span className="text-[10px] font-black uppercase tracking-widest mt-1">
                  {isScanning ? "Scanning..." : deviceStatus.connected ? "Touch Sensor" : "Offline"}
                </span>
              </button>

              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {isScanning
                    ? "Hold Finger on Sensor..."
                    : "Ready for Biometric Check-in"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Place finger flat and firmly on the SecuGen HU20-A scanner prism.
                </p>
              </div>

              {/* Controls: Continuous Auto-Mode & Single Touch */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  onClick={handleSingleScan}
                  disabled={isScanning || !deviceStatus.connected}
                  className="h-11 px-6 rounded-xl bg-[#085a4e] hover:bg-[#06483e] text-white font-black text-xs uppercase tracking-wider shadow-md"
                >
                  <Fingerprint size={16} className="mr-2" /> 1-Tap Check-in
                </Button>

                <Button
                  variant={autoLoopActive ? "destructive" : "outline"}
                  onClick={() => setAutoLoopActive(!autoLoopActive)}
                  disabled={!deviceStatus.connected}
                  className="h-11 px-5 rounded-xl font-black text-xs uppercase tracking-wider"
                >
                  <RefreshCw
                    size={14}
                    className={cn("mr-2", autoLoopActive && "animate-spin")}
                  />
                  {autoLoopActive ? "Stop Auto-Scan" : "Auto-Continuous Scan"}
                </Button>
              </div>
            </div>

            {/* SSL Help prompt if 8443 needs permission */}
            {deviceStatus.isSslCertificateRequired && (
              <div className="mt-6 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 text-left flex items-center justify-between gap-2 max-w-lg w-full">
                <span>
                  <strong>Browser Permission Needed</strong>: Click to allow local SecuGen SSL certificate on this PC.
                </span>
                <a
                  href="https://localhost:8443"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider hover:bg-amber-300 shrink-0 flex items-center gap-1"
                >
                  <span>Allow SSL</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          {/* Last Punched Identity Card */}
          {lastPunchedPerson && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-emerald-500 shadow-xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck size={16} /> Verified Biometric Log
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {lastPunchedPerson.time}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xl text-superior-teal overflow-hidden border-2 border-emerald-500 shadow-sm shrink-0">
                  {lastPunchedPerson.photo ? (
                    <img
                      src={lastPunchedPerson.photo}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    lastPunchedPerson.fullName.charAt(0)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
                      {lastPunchedPerson.fullName}
                    </h3>
                    <Badge
                      className={cn(
                        "text-[10px] font-black uppercase",
                        lastPunchedPerson.status === "Present"
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-500 text-slate-950"
                      )}
                    >
                      {lastPunchedPerson.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Father: {lastPunchedPerson.fatherName || "N/A"} • ID: {lastPunchedPerson.rollNoOrRole}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Match Confidence:{" "}
                    <span className="text-emerald-600 font-bold">
                      {lastPunchedPerson.matchScore}/199
                    </span>{" "}
                    • Verified Finger: {lastPunchedPerson.finger}
                  </p>
                </div>

                {/* WhatsApp Status Pill */}
                <div className="text-right shrink-0">
                  <span
                    className={cn(
                      "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1",
                      lastPunchedPerson.waStatus === "sent"
                        ? "bg-emerald-100 text-emerald-800"
                        : lastPunchedPerson.waStatus === "sending"
                        ? "bg-blue-100 text-blue-800 animate-pulse"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <Send size={10} />
                    WhatsApp {lastPunchedPerson.waStatus}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Audit Stream & Manual Fallback */}
        <div className="lg:col-span-5 space-y-6">
          {/* Manual Search Fallback Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Search size={14} className="text-slate-400" />
                Manual Check-in Fallback
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">
                (Injured finger / Unregistered)
              </span>
            </div>

            <div className="relative">
              <Input
                placeholder="Search name, roll no, or ID to mark manual check-in..."
                value={manualSearchQuery}
                onChange={(e) => setManualSearchQuery(e.target.value)}
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs border-slate-200"
              />
            </div>

            {filteredManualList.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredManualList.map((m) => (
                  <div
                    key={m.id}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {m.fullName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {m.collegeNo || m.id} • {m.roleOrGroup}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        recordAttendance(
                          {
                            id: m.id,
                            fullName: m.fullName,
                            fatherName: m.fatherName,
                            collegeNo: m.collegeNo,
                            phone: m.phone,
                            personType: m.personType,
                            roleOrGroup: m.roleOrGroup,
                            photo: m.photo,
                            fingerprintFinger: "Manual Override",
                          },
                          100
                        );
                        setManualSearchQuery("");
                      }}
                      className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider"
                    >
                      <Check size={12} className="mr-1" /> Mark Present
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Biometric Activity Log */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-superior-teal" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Today&apos;s Biometric Log ({todayPunches.length})
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                {new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {todayPunches.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Fingerprint size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="font-bold">No Biometric Scans Yet Today</p>
                  <p className="text-[10px] mt-0.5">
                    Scans will appear here in real-time as students and staff check in.
                  </p>
                </div>
              ) : (
                todayPunches.map((punch) => (
                  <div
                    key={punch.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-superior-teal text-xs shrink-0 overflow-hidden">
                        {punch.photo ? (
                          <img
                            src={punch.photo}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          punch.fullName.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {punch.fullName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {punch.rollNoOrRole} • {punch.personType}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono font-black text-slate-800 dark:text-slate-200 block">
                        {punch.time}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase",
                          punch.status === "Present"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        )}
                      >
                        {punch.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Biometric Enrollment Modal */}
      {isEnrollModalOpen && (
        <BiometricEnrollmentModal
          isOpen={isEnrollModalOpen}
          onClose={() => setIsEnrollModalOpen(false)}
          studentsList={rawStudents}
          staffList={rawStaff}
          onEnrollmentSaved={(id, type, template, finger) => {
            loadRoster();
          }}
        />
      )}
    </div>
  );
}
