import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  User,
  GraduationCap,
  Briefcase,
  Phone,
  CreditCard,
  Calendar,
  Sparkles,
  X,
  Volume2,
  VolumeX,
  ExternalLink,
  MessageCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { secugenService, SecuGenStatus } from "../lib/secugenService";
import { Student, Staff } from "../types";
import { supabase } from "../lib/supabase";

interface InstantBiometricVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsList: Student[];
  staffList: Staff[];
  data?: any;
}

export default function InstantBiometricVerifyModal({
  isOpen,
  onClose,
  studentsList = [],
  staffList = [],
  data,
}: InstantBiometricVerifyModalProps) {
  const [deviceStatus, setDeviceStatus] = useState<SecuGenStatus>({
    connected: false,
    serviceRunning: false,
    deviceFound: false,
    activeUrl: null,
  });

  const [scanState, setScanState] = useState<"idle" | "listening" | "matching" | "matched" | "not_found">("idle");
  const [matchedResult, setMatchedResult] = useState<{
    personType: "student" | "staff";
    person: Student | Staff;
    score: number;
    scannedAt: string;
  } | null>(null);

  const [autoListen, setAutoListen] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [matchProgress, setMatchProgress] = useState<{ checked: number; total: number }>({ checked: 0, total: 0 });
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);

  const isScanningLoopActive = useRef(false);

  // Pleasant Web Audio Chime
  const playSound = useCallback((type: "success" | "error") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === "success") {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc2.type = "triangle";

        osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.45);
        osc2.stop(ctx.currentTime + 0.45);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(160, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Audio not permitted or supported
    }
  }, [soundEnabled]);

  // Refresh hardware status
  const checkStatus = useCallback(async () => {
    try {
      const s = await secugenService.getStatus(true);
      setDeviceStatus(s);
      return s;
    } catch {
      return null;
    }
  }, []);

  // 1:N Identification Function: Scans finger and matches against all enrolled persons
  const handleTriggerSpotScan = useCallback(async () => {
    if (isScanningLoopActive.current) return;
    isScanningLoopActive.current = true;
    setScanState("listening");
    setAttendanceSuccess(null);

    try {
      const capture = await secugenService.captureFingerprint({
        timeoutMs: 15000,
        quality: 50,
        templateFormat: "ISO",
      });

      if (!capture.success || !capture.templateBase64) {
        setScanState("idle");
        isScanningLoopActive.current = false;
        if (capture.error && !capture.error.includes("timeout") && !capture.error.includes("Cancel")) {
          toast.error(capture.error);
        }
        return;
      }

      setScanState("matching");
      const liveTemplate = capture.templateBase64;

      // Filter all persons who actually have a registered fingerprint
      const enrolledStaff = staffList.filter((s) => Boolean(s.fingerprintTemplate));
      const enrolledStudents = studentsList.filter((s) => Boolean(s.fingerprintTemplate));
      const totalEnrolled = enrolledStaff.length + enrolledStudents.length;

      setMatchProgress({ checked: 0, total: totalEnrolled });

      let foundPerson: { personType: "student" | "staff"; person: Student | Staff; score: number } | null = null;

      // 1. Check Staff First (typically smaller roster, ultra fast)
      for (let i = 0; i < enrolledStaff.length; i++) {
        const st = enrolledStaff[i];
        setMatchProgress({ checked: i + 1, total: totalEnrolled });

        const match = await secugenService.matchFingerprints(liveTemplate, st.fingerprintTemplate!, "ISO");
        if (match.isMatched || match.matchingScore >= 70) {
          foundPerson = {
            personType: "staff",
            person: st,
            score: match.matchingScore,
          };
          break;
        }
      }

      // 2. Check Students if not found in staff
      if (!foundPerson) {
        for (let j = 0; j < enrolledStudents.length; j++) {
          const std = enrolledStudents[j];
          setMatchProgress({ checked: enrolledStaff.length + j + 1, total: totalEnrolled });

          const match = await secugenService.matchFingerprints(liveTemplate, std.fingerprintTemplate!, "ISO");
          if (match.isMatched || match.matchingScore >= 70) {
            foundPerson = {
              personType: "student",
              person: std,
              score: match.matchingScore,
            };
            break;
          }
        }
      }

      if (foundPerson) {
        playSound("success");
        setMatchedResult({
          personType: foundPerson.personType,
          person: foundPerson.person,
          score: foundPerson.score,
          scannedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        });
        setScanState("matched");
        toast.success(`Identity Verified: ${foundPerson.person.fullName} (${foundPerson.score}% match)`, {
          description: `${foundPerson.personType.toUpperCase()} Record Found`,
        });
      } else {
        playSound("error");
        setMatchedResult(null);
        setScanState("not_found");
        toast.error("Fingerprint not recognized in college database.", {
          description: "This finger is either not enrolled or placed improperly.",
        });
      }
    } catch (err: any) {
      console.error("Spot scan error:", err);
      setScanState("idle");
    } finally {
      isScanningLoopActive.current = false;
    }
  }, [staffList, studentsList, playSound]);

  // When modal opens, check device and auto-start scan
  useEffect(() => {
    if (isOpen) {
      checkStatus().then(() => {
        handleTriggerSpotScan();
      });
    } else {
      setScanState("idle");
      setMatchedResult(null);
      setAttendanceSuccess(null);
      isScanningLoopActive.current = false;
    }
  }, [isOpen, checkStatus, handleTriggerSpotScan]);

  // 1-Click Fast Attendance Check-in
  const handleMarkGateAttendance = async () => {
    if (!matchedResult) return;
    setIsMarkingAttendance(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      const nowTime = new Date().toLocaleTimeString("en-US", { hour12: false });

      if (matchedResult.personType === "student") {
        const student = matchedResult.person as Student;
        const { error } = await supabase.from("student_attendance").upsert({
          student_id: student.id,
          student_name: student.fullName,
          date: today,
          status: "Present",
          check_in_time: nowTime,
          verification_method: "biometric_fingerprint",
        }, { onConflict: "student_id,date" });

        if (error) throw error;
        setAttendanceSuccess(`Gate Entry Recorded at ${nowTime} for ${student.fullName}`);
        toast.success(`Gate Attendance Recorded for ${student.fullName}! ✅`);
      } else {
        const staffMember = matchedResult.person as Staff;
        const { error } = await supabase.from("staff_attendance").upsert({
          staff_id: staffMember.id,
          date: today,
          status: "Present",
          check_in: nowTime,
          notes: JSON.stringify({ method: "biometric_fingerprint", check_in_time: nowTime }),
        });

        if (error) throw error;
        setAttendanceSuccess(`Staff Check-In Recorded at ${nowTime} for ${staffMember.fullName}`);
        toast.success(`Staff Attendance Recorded for ${staffMember.fullName}! ✅`);
      }

      data?.fetchData?.(true);
    } catch (err: any) {
      toast.error(`Failed to record attendance: ${err.message || String(err)}`);
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  const student = matchedResult?.personType === "student" ? (matchedResult.person as Student) : null;
  const staffMember = matchedResult?.personType === "staff" ? (matchedResult.person as Staff) : null;

  const totalFee = student ? Number(student.totalPackage || 0) : 0;
  const receivedFee = student ? Number(student.feeReceived || 0) : 0;
  const feeBalance = Math.max(0, totalFee - receivedFee);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-[2.5rem] border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-50/50 dark:bg-slate-950">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#085a4e] via-[#064e43] to-slate-900 text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-superior-gold shadow-inner">
                <Fingerprint size={28} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-black text-xl tracking-tight text-white">
                    Instant Biometric Spot-Check
                  </h3>
                  <Badge className="bg-superior-gold text-slate-900 font-black text-[10px] uppercase tracking-wider border-none">
                    1-Touch Verify
                  </Badge>
                </div>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  Touch SecuGen scanner to instantly identify any Student or Faculty member
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled((prev) => !prev)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                title={soundEnabled ? "Mute Chime" : "Enable Sound Chime"}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8">
          {/* Scanning / Waiting State */}
          {scanState === "listening" && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="w-28 h-28 rounded-full bg-emerald-500/10 flex items-center justify-center animate-ping absolute inset-0" />
                <div className="w-28 h-28 rounded-full border-4 border-dashed border-superior-teal bg-white dark:bg-slate-900 flex items-center justify-center shadow-xl relative z-10">
                  <Fingerprint size={56} className="text-superior-teal animate-pulse" />
                </div>
              </div>
              <h4 className="font-display font-black text-2xl text-slate-800 dark:text-white tracking-tight mb-2">
                Scanner is Ready! Place Any Finger...
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                Place thumb or finger firmly on the SecuGen HU20-A scanner. Verification takes less than 1 second.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Scanning against {studentsList.filter(s => s.fingerprintTemplate).length} Students & {staffList.filter(s => s.fingerprintTemplate).length} Staff Enrolled Templates
              </div>
            </div>
          )}

          {/* Matching In-Progress */}
          {scanState === "matching" && (
            <div className="py-14 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-full border-4 border-t-superior-teal border-slate-200 animate-spin mb-6 flex items-center justify-center">
                <Fingerprint size={42} className="text-superior-teal" />
              </div>
              <h4 className="font-display font-black text-xl text-slate-800 dark:text-white mb-2">
                Matching Fingerprint...
              </h4>
              <p className="text-xs text-slate-500 font-mono">
                Searching record {matchProgress.checked} of {matchProgress.total}...
              </p>
            </div>
          )}

          {/* Not Found State */}
          {scanState === "not_found" && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200">
                <AlertCircle size={44} />
              </div>
              <h4 className="font-display font-black text-2xl text-slate-800 dark:text-white mb-2">
                Fingerprint Not Recognized
              </h4>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                This fingerprint was not found among registered students or staff. Please ensure the finger is clean and placed flat, or enroll this member first.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleTriggerSpotScan}
                  className="bg-superior-teal text-white font-bold h-11 px-6 rounded-2xl gap-2 shadow-lg shadow-superior-teal/15"
                >
                  <RefreshCw size={15} /> Try Finger Again
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="h-11 px-6 rounded-2xl border-slate-200"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Matched Result Card (Glorious Pop Screen) */}
          {scanState === "matched" && matchedResult && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Verification Header Banner */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-800 dark:text-emerald-300 text-sm uppercase tracking-wider">
                        {matchedResult.personType === "student" ? "STUDENT IDENTIFIED" : "FACULTY / STAFF IDENTIFIED"}
                      </span>
                      <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                        {matchedResult.score}% Confidence Match
                      </Badge>
                    </div>
                    <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                      Scanned at {matchedResult.scannedAt} • Official Biometric Authentication
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleTriggerSpotScan}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-100/70 h-9 px-4 font-bold text-xs gap-1.5 shrink-0"
                >
                  <RefreshCw size={13} /> Scan Next Person (اگلا)
                </Button>
              </div>

              {/* Main Profile Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6 items-start">
                {/* Photo Area */}
                <div className="shrink-0 flex flex-col items-center text-center mx-auto md:mx-0">
                  <div className="w-28 h-28 rounded-3xl border-4 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-xl ring-2 ring-emerald-500/20 mb-3">
                    {matchedResult.person.photo ? (
                      <img
                        src={matchedResult.person.photo}
                        alt=""
                        className="w-full h-full object-cover object-[center_top]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-superior-gold font-black text-3xl bg-superior-gold/10">
                        {matchedResult.person.fullName ? matchedResult.person.fullName.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="font-mono text-xs font-black tracking-widest text-slate-700 dark:text-slate-300">
                    {matchedResult.person.id}
                  </Badge>
                </div>

                {/* Identity & Key Attributes */}
                <div className="flex-1 min-w-0 space-y-4 w-full">
                  <div>
                    <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white tracking-tight">
                      {matchedResult.person.fullName}
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      Father: <span className="font-bold text-slate-700 dark:text-slate-300">{matchedResult.person.fatherName || "N/A"}</span>
                    </p>
                  </div>

                  {/* Student Details Grid */}
                  {student && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Program / Class</span>
                        <span className="text-xs font-bold text-superior-teal truncate block">{student.category}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{student.group} • Sec {student.section || "A"}</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Fee Status</span>
                        {feeBalance <= 0 ? (
                          <Badge className="bg-emerald-500 text-white font-bold text-[10px] border-none">
                            Paid in Full (Clear)
                          </Badge>
                        ) : (
                          <div>
                            <span className="text-xs font-black text-rose-600 block">Due: Rs. {feeBalance.toLocaleString()}</span>
                            <span className="text-[9px] text-slate-400">Pkg: Rs. {totalFee.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Contact</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">{student.contact || "N/A"}</span>
                        {student.fatherContact && (
                          <span className="text-[10px] text-slate-500 truncate block">F: {student.fatherContact}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Staff Details Grid */}
                  {staffMember && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Role / Designation</span>
                        <span className="text-xs font-black text-superior-teal truncate block">{staffMember.role}</span>
                        <span className="text-[10px] text-slate-500 font-semibold truncate block">{staffMember.qualification || "Faculty"}</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Monthly Salary</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white block">
                          Rs. {(staffMember.salary || 0).toLocaleString()}
                        </span>
                        <span className="text-[9px] text-slate-400">Joined: {staffMember.joinDate || "N/A"}</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Phone Contact</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">{staffMember.contact || "N/A"}</span>
                        {staffMember.cnic && (
                          <span className="text-[10px] text-slate-500 truncate block font-mono">{staffMember.cnic}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance Feedback */}
              {attendanceSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-500 text-white font-bold text-xs flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>{attendanceSuccess}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  onClick={handleMarkGateAttendance}
                  disabled={isMarkingAttendance}
                  className="bg-[#085a4e] hover:bg-[#064e43] text-white font-black text-xs uppercase tracking-wider h-11 px-5 rounded-2xl gap-2 shadow-lg shadow-emerald-900/15"
                >
                  <Clock size={16} />
                  {isMarkingAttendance ? "Recording..." : "Mark Gate Check-In (حاضری لگائیں)"}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleTriggerSpotScan}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 px-5 rounded-2xl gap-1.5 shadow-md"
                  >
                    <Fingerprint size={16} /> Scan Next Person
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="h-11 px-4 rounded-2xl border-slate-200 text-xs font-bold"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
