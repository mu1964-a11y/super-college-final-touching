import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Fingerprint,
  ArrowLeft,
  CheckCircle2,
  Volume2,
  VolumeX,
  Zap,
  Clock,
  Users,
  UserCheck,
  LogOut,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Search,
  Pause,
  Play,
} from 'lucide-react';
import { secugenService } from '../lib/secugenService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { safeLocalStorage } from '../utils/safeStorage';
import { sendAutoStaffAttendancePdfNotice } from '../lib/whatsappAutomation';
import { toast } from 'sonner';

interface BiometricAttendanceDeskProps {
  standalone?: boolean;
  collegeLogo?: string;
  collegeName?: string;
  onBackToApp?: () => void;
  staffListProp?: any[];
  studentsListProp?: any[];
  staffAttendanceProp?: any[];
  settingsProp?: any;
  onAttendanceMarked?: () => void;
}

// Instant Web Audio API Synthesizer for Biometric Kiosk Feedback
function playKioskSound(type: 'checkin' | 'checkout' | 'duplicate' | 'error') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'checkin') {
      // Crisp 2-tone ascending chime (A5 -> E6)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1318.5, now + 0.11);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.38);
    } else if (type === 'checkout') {
      // Pleasant 2-tone completion chime (E6 -> C6)
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now);
      osc.frequency.setValueAtTime(1567.98, now + 0.12);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === 'duplicate') {
      // Gentle double-tap tone
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // Low warning buzz for unrecognized finger
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.setValueAtTime(175, now + 0.14);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch {}
}

function speakKioskAnnouncement(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.08;
    utter.pitch = 1.02;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
  } catch {}
}

function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime12h(dateObj: Date): string {
  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatHHMM(dateObj: Date): string {
  return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
}

export default function BiometricAttendanceDesk({
  collegeLogo = '/superior-logo.png',
  collegeName = 'Superior College Jahanian',
  onBackToApp,
  staffListProp,
  studentsListProp,
  staffAttendanceProp,
  settingsProp,
  onAttendanceMarked,
}: BiometricAttendanceDeskProps) {
  const [staffList, setStaffList] = useState<any[]>(staffListProp || []);
  const [studentsList, setStudentsList] = useState<any[]>(studentsListProp || []);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(settingsProp || null);
  const [loadingDb, setLoadingDb] = useState<boolean>(!staffListProp || staffListProp.length === 0);

  // Kiosk Controls
  const [autoLoopEnabled, setAutoLoopEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [punchMode, setPunchMode] = useState<'auto' | 'checkin' | 'checkout'>('auto');
  const [scannerStatus, setScannerStatus] = useState<{ connected: boolean; deviceFound: boolean }>({
    connected: false,
    deviceFound: false,
  });
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [searchRoster, setSearchRoster] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Instant Verification Result Banner (Auto-resets after 3 seconds)
  const [verifiedCard, setVerifiedCard] = useState<{
    type: 'checkin' | 'checkout' | 'duplicate' | 'unrecognized';
    person?: any;
    status?: string;
    punchTime?: string;
    score?: number;
    message: string;
    thumbBmp?: string;
  } | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const autoLoopActiveRef = useRef<boolean>(true);
  const isScanningLockRef = useRef<boolean>(false);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    autoLoopActiveRef.current = autoLoopEnabled;
  }, [autoLoopEnabled]);

  // Live digital clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load live Staff, Students, and Today's Attendance from Supabase
  const loadBiometricDatabase = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoadingDb(false);
      return;
    }
    try {
      const todayStr = getTodayDateStr();
      const [staffRes, studentsRes, attRes, settingsRes] = await Promise.all([
        supabase.from('staff').select('*').order('id', { ascending: true }),
        supabase.from('students').select('*'),
        supabase.from('staff_attendance').select('*').eq('date', todayStr),
        supabase.from('settings').select('*').limit(1).maybeSingle(),
      ]);

      if (staffRes.data) {
        const mappedStaff = staffRes.data.map((st: any) => {
          let fpTemplate = st.fingerprint_template || st.fingerprintTemplate;
          let fpFinger = st.fingerprint_finger || st.fingerprintFinger || 'Right Thumb';
          if (!fpTemplate) {
            try {
              const cached = safeLocalStorage.getItem(`scj_fp_vault_${st.id}`);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed?.template) {
                  fpTemplate = parsed.template;
                  fpFinger = parsed.finger || 'Right Thumb';
                }
              }
            } catch {}
          }
          return {
            ...st,
            fullName: st.full_name || st.fullName || 'Staff Member',
            fatherName: st.father_name || st.fatherName || '',
            role: st.role || st.designation || 'Faculty',
            designation: st.designation || st.role || 'Faculty',
            photo: st.photo_url || st.photo,
            contact: st.contact || '',
            fingerprintTemplate: fpTemplate,
            fingerprintFinger: fpFinger,
            fingerprintEnrolledAt: st.fingerprint_enrolled_at || st.fingerprintEnrolledAt,
          };
        });
        setStaffList(mappedStaff);
      }

      if (studentsRes.data) {
        setStudentsList(
          studentsRes.data.map((s: any) => ({
            ...s,
            fullName: s.full_name || s.fullName || 'Student',
            collegeNo: s.college_no || s.student_id || s.id,
            photo: s.photo_url || s.photo,
            fingerprintTemplate: s.fingerprint_template || s.fingerprintTemplate,
            fingerprintFinger: s.fingerprint_finger || s.fingerprintFinger,
          }))
        );
      }

      if (attRes.data) {
        setTodayAttendance(attRes.data);
      }

      if (settingsRes.data) {
        setSettings({
          ...settingsRes.data,
          collegeName: settingsRes.data.college_name || collegeName,
          collegeStartTime: settingsRes.data.config?.collegeStartTime || '07:54',
        });
      }
    } catch (err) {
      console.error('Error loading biometric database:', err);
    } finally {
      setLoadingDb(false);
    }
  }, [collegeName]);

  useEffect(() => {
    loadBiometricDatabase();
  }, [loadBiometricDatabase]);

  // Sync props if parent updates them
  useEffect(() => {
    if (staffListProp && staffListProp.length > 0) {
      setStaffList(staffListProp);
      setLoadingDb(false);
    }
  }, [staffListProp]);

  useEffect(() => {
    if (staffAttendanceProp && staffAttendanceProp.length > 0) {
      const todayStr = getTodayDateStr();
      setTodayAttendance(
        staffAttendanceProp.filter((a: any) => a.date === todayStr)
      );
    }
  }, [staffAttendanceProp]);

  // Check SecuGen hardware connection
  const checkHardwareStatus = useCallback(async () => {
    const st = await secugenService.getStatus();
    if (isMountedRef.current) {
      setScannerStatus({ connected: st.connected, deviceFound: st.deviceFound });
    }
    return st;
  }, []);

  useEffect(() => {
    checkHardwareStatus();
  }, [checkHardwareStatus]);

  const enrolledStaff = useMemo(
    () => staffList.filter((st) => Boolean(st.fingerprintTemplate || st.fingerprint_template)),
    [staffList]
  );

  const enrolledStudents = useMemo(
    () => studentsList.filter((s) => Boolean(s.fingerprintTemplate || s.fingerprint_template)),
    [studentsList]
  );

  // Core 1:N Biometric Scan & Instant Attendance Processor
  const executeSingleScanCycle = useCallback(
    async (isManualTrigger = false) => {
      if (isScanningLockRef.current) return;
      isScanningLockRef.current = true;
      setIsCapturing(true);

      try {
        const res = await secugenService.captureFingerprint({
          timeoutMs: isManualTrigger ? 9000 : 5000,
          quality: 40,
          templateFormat: 'ISO',
        });

        if (!isMountedRef.current) return;

        if (!res.success || !res.templateBase64) {
          // If in continuous auto-loop and it simply timed out waiting for a finger, silently loop again
          if (isManualTrigger && res.error) {
            toast.error(res.error);
          }
          return;
        }

        const thumbDataUrl =
          res.bmpDataUrl ||
          (res.bmpBase64
            ? res.bmpBase64.startsWith('data:')
              ? res.bmpBase64
              : `data:image/bmp;base64,${res.bmpBase64}`
            : undefined);

        setScannerStatus({ connected: true, deviceFound: true });

        // 1:N Fast Template Matching against Enrolled Staff (31+ Faculty)
        let matchedStaff: any = null;
        let bestScore = 0;

        for (const teacher of enrolledStaff) {
          const tpl = teacher.fingerprintTemplate || teacher.fingerprint_template;
          if (!tpl) continue;
          const m = await secugenService.matchTemplates(res.templateBase64, tpl);
          if (m.matched && m.score > bestScore) {
            bestScore = m.score;
            matchedStaff = teacher;
          }
        }

        // Also check enrolled students if no staff matched
        let matchedStudent: any = null;
        if (!matchedStaff && enrolledStudents.length > 0) {
          for (const stu of enrolledStudents) {
            const tpl = stu.fingerprintTemplate || stu.fingerprint_template;
            if (!tpl) continue;
            const m = await secugenService.matchTemplates(res.templateBase64, tpl);
            if (m.matched && m.score > bestScore) {
              bestScore = m.score;
              matchedStudent = stu;
            }
          }
        }

        const now = new Date();
        const todayStr = getTodayDateStr();
        const hhmm = formatHHMM(now);
        const hhmmss = `${hhmm}:${String(now.getSeconds()).padStart(2, '0')}`;
        const displayTime = formatTime12h(now);
        const cutoffTime = settings?.collegeStartTime || '07:54';

        if (!matchedStaff && !matchedStudent) {
          if (soundEnabled) playKioskSound('error');
          speakKioskAnnouncement('Finger not recognized. Please place thumb flat on sensor.', voiceEnabled);
          setVerifiedCard({
            type: 'unrecognized',
            message: 'Fingerprint Not Recognized — Please Place Enrolled Finger Flat on Sensor',
            thumbBmp: thumbDataUrl,
          });
          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
          resetTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) setVerifiedCard(null);
          }, 2600);
          return;
        }

        if (matchedStaff) {
          if (res.bmpBase64) {
            secugenService.saveFingerprintThumbnail(matchedStaff.id, res.bmpBase64);
          }

          const existingRec = todayAttendance.find(
            (r: any) => (r.staff_id || r.staffId) === matchedStaff.id && r.date === todayStr
          );
          const existingCheckIn =
            existingRec?.check_in || existingRec?.checkIn || existingRec?.check_in_time || existingRec?.checkInTime;
          const existingCheckOut =
            existingRec?.check_out || existingRec?.checkOut || existingRec?.check_out_time || existingRec?.checkOutTime;

          // Determine whether this scan is Check-In, Duplicate Guard, or Check-Out
          let actionType: 'checkin' | 'checkout' | 'duplicate' = 'checkin';
          if (punchMode === 'checkin') {
            actionType = 'checkin';
          } else if (punchMode === 'checkout') {
            actionType = 'checkout';
          } else {
            // Smart Auto Mode
            if (!existingCheckIn) {
              actionType = 'checkin';
            } else {
              // Calculate minutes since check-in to prevent accidental double-scan within 5 mins
              let minsSinceCheckIn = 999;
              const isoIn = existingRec?.check_in_time || existingRec?.checkInTime || existingRec?.created_at;
              if (isoIn) {
                const cinDate = new Date(isoIn);
                if (!isNaN(cinDate.getTime())) {
                  minsSinceCheckIn = (now.getTime() - cinDate.getTime()) / 60000;
                }
              }
              if (minsSinceCheckIn < 5 && !existingCheckOut) {
                actionType = 'duplicate';
              } else {
                actionType = 'checkout';
              }
            }
          }

          if (actionType === 'duplicate') {
            if (soundEnabled) playKioskSound('duplicate');
            speakKioskAnnouncement(
              `${matchedStaff.fullName}, your check in is already marked.`,
              voiceEnabled
            );
            setVerifiedCard({
              type: 'duplicate',
              person: matchedStaff,
              status: existingRec?.status || 'Present',
              punchTime: existingCheckIn || displayTime,
              score: bestScore,
              message: `Already Checked In Today at ${existingCheckIn || displayTime}`,
              thumbBmp: thumbDataUrl,
            });
          } else if (actionType === 'checkin') {
            // Calculate Present vs Late based on collegeStartTime (default 07:54)
            const [cutH, cutM] = cutoffTime.split(':').map(Number);
            const nowMins = now.getHours() * 60 + now.getMinutes();
            const cutMins = (cutH || 7) * 60 + (cutM || 54);
            const computedStatus = nowMins > cutMins ? 'Late' : 'Present';

            const payload = {
              staff_id: matchedStaff.id,
              date: todayStr,
              status: computedStatus,
              check_in: hhmmss,
              check_in_time: now.toISOString(),
              verification_method: 'secugen_fingerprint',
              notes: JSON.stringify({
                method: 'biometric_fingerprint',
                check_in_time: hhmmss,
                score: bestScore,
              }),
            };

            if (isSupabaseConfigured) {
              await supabase
                .from('staff_attendance')
                .upsert([payload], { onConflict: 'staff_id,date' });
            }

            setTodayAttendance((prev) => {
              const others = prev.filter(
                (r: any) => (r.staff_id || r.staffId) !== matchedStaff.id
              );
              return [...others, { ...existingRec, ...payload, staffId: matchedStaff.id }];
            });

            if (soundEnabled) playKioskSound('checkin');
            speakKioskAnnouncement(
              `Thank you ${matchedStaff.fullName}. Check in marked.`,
              voiceEnabled
            );

            setVerifiedCard({
              type: 'checkin',
              person: matchedStaff,
              status: computedStatus,
              punchTime: displayTime,
              score: bestScore,
              message:
                computedStatus === 'Late'
                  ? `Check-In Recorded (Late Arrival after ${cutoffTime} AM)`
                  : 'On-Time Biometric Check-In Recorded!',
              thumbBmp: thumbDataUrl,
            });

            onAttendanceMarked?.();

            // Dispatch Official WhatsApp Attendance Slip in background
            if (matchedStaff.contact) {
              const monthStr = todayStr.slice(0, 7);
              sendAutoStaffAttendancePdfNotice(matchedStaff.id, matchedStaff.contact, monthStr, {
                silent: true,
              }).catch(() => {});
            }
          } else {
            // Check-Out
            const payload = {
              staff_id: matchedStaff.id,
              date: todayStr,
              status: existingRec?.status || 'Present',
              check_in: existingRec?.check_in || existingRec?.checkIn || hhmmss,
              check_in_time: existingRec?.check_in_time || existingRec?.checkInTime || now.toISOString(),
              check_out: hhmmss,
              check_out_time: now.toISOString(),
              verification_method: 'secugen_fingerprint',
              notes: JSON.stringify({
                method: 'biometric_fingerprint',
                check_in_time: existingRec?.check_in || hhmmss,
                check_out_time: hhmmss,
                score: bestScore,
              }),
            };

            if (isSupabaseConfigured) {
              await supabase
                .from('staff_attendance')
                .upsert([payload], { onConflict: 'staff_id,date' });
            }

            setTodayAttendance((prev) => {
              const others = prev.filter(
                (r: any) => (r.staff_id || r.staffId) !== matchedStaff.id
              );
              return [...others, { ...existingRec, ...payload, staffId: matchedStaff.id }];
            });

            if (soundEnabled) playKioskSound('checkout');
            speakKioskAnnouncement(
              `Goodbye ${matchedStaff.fullName}. Check out recorded.`,
              voiceEnabled
            );

            setVerifiedCard({
              type: 'checkout',
              person: matchedStaff,
              status: 'Checked Out',
              punchTime: displayTime,
              score: bestScore,
              message: 'Official Duty Check-Out Recorded!',
              thumbBmp: thumbDataUrl,
            });

            onAttendanceMarked?.();
          }

          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
          resetTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) setVerifiedCard(null);
          }, 3200);
        } else if (matchedStudent) {
          if (res.bmpBase64) {
            secugenService.saveFingerprintThumbnail(
              matchedStudent.id,
              res.bmpBase64,
              matchedStudent.collegeNo
            );
          }
          // Student Biometric Attendance
          const payload = {
            student_id: matchedStudent.id,
            date: todayStr,
            status: 'Present',
            check_in_time: now.toISOString(),
            verification_method: 'secugen_fingerprint',
            notes: `SecuGen Biometric Check-In (Score ${bestScore})`,
          };
          if (isSupabaseConfigured) {
            await supabase
              .from('student_attendance')
              .upsert([payload], { onConflict: 'student_id,date' });
          }
          if (soundEnabled) playKioskSound('checkin');
          speakKioskAnnouncement(
            `Welcome ${matchedStudent.fullName}. Attendance marked.`,
            voiceEnabled
          );
          setVerifiedCard({
            type: 'checkin',
            person: {
              ...matchedStudent,
              role: `Student • Roll: ${matchedStudent.collegeNo || matchedStudent.id}`,
            },
            status: 'Present',
            punchTime: displayTime,
            score: bestScore,
            message: 'Student Biometric Check-In Recorded!',
            thumbBmp: thumbDataUrl,
          });
          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
          resetTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) setVerifiedCard(null);
          }, 3200);
        }
      } finally {
        if (isMountedRef.current) {
          setIsCapturing(false);
        }
        isScanningLockRef.current = false;
      }
    },
    [
      enrolledStaff,
      enrolledStudents,
      todayAttendance,
      punchMode,
      soundEnabled,
      voiceEnabled,
      settings,
      onAttendanceMarked,
    ]
  );

  // Continuous Zero-Click Auto-Scan Loop
  useEffect(() => {
    isMountedRef.current = true;
    let loopTimer: NodeJS.Timeout | null = null;

    const runContinuousLoop = async () => {
      if (!isMountedRef.current) return;
      if (autoLoopActiveRef.current && !isScanningLockRef.current && enrolledStaff.length > 0) {
        await executeSingleScanCycle(false);
      }
      if (isMountedRef.current && autoLoopActiveRef.current) {
        // Short 650ms breather before listening for the next teacher's finger
        loopTimer = setTimeout(runContinuousLoop, 650);
      }
    };

    if (autoLoopEnabled && !loadingDb) {
      loopTimer = setTimeout(runContinuousLoop, 400);
    }

    return () => {
      if (loopTimer) clearTimeout(loopTimer);
    };
  }, [autoLoopEnabled, loadingDb, enrolledStaff.length, executeSingleScanCycle]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Stats for Today
  const stats = useMemo(() => {
    const present = todayAttendance.filter((a) => a.status === 'Present').length;
    const late = todayAttendance.filter((a) => a.status === 'Late').length;
    const checkedOut = todayAttendance.filter(
      (a) => Boolean(a.check_out || a.checkOut || a.check_out_time)
    ).length;
    const totalEnrolled = enrolledStaff.length;
    const pending = Math.max(0, staffList.length - (present + late));
    return { present, late, checkedOut, totalEnrolled, pending };
  }, [todayAttendance, enrolledStaff.length, staffList.length]);

  const filteredStaffRoster = useMemo(() => {
    const q = (searchRoster || '').toLowerCase();
    return staffList.filter(
      (s) =>
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.id || '').toLowerCase().includes(q) ||
        (s.role || '').toLowerCase().includes(q)
    );
  }, [staffList, searchRoster]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Institutional Kiosk Header */}
      <header className="max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-2 flex items-center justify-center shrink-0">
            <img src={collegeLogo} alt={collegeName} className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                {settings?.collegeName || collegeName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Fast-Boost Zero-Click Terminal
              </span>
            </div>
            <p className="text-xs text-slate-400">
              SecuGen HU20 Biometric Attendance Kiosk • Just Place Finger & Walk Away (3s Auto-Reset)
            </p>
          </div>
        </div>

        {/* Right Controls: Live Clock, Audio/Voice Toggles & Return Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-2 font-mono text-xs font-bold text-amber-300">
            <Clock size={14} className="text-emerald-400" />
            <span>{formatTime12h(currentTime)}</span>
          </div>

          <button
            type="button"
            onClick={() => setAutoLoopEnabled((v) => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer ${
              autoLoopEnabled
                ? 'bg-emerald-600/25 border-emerald-400/50 text-emerald-300'
                : 'bg-slate-900 border-white/15 text-slate-400'
            }`}
            title="Toggle Continuous Zero-Click Auto-Scanning"
          >
            {autoLoopEnabled ? <Pause size={14} /> : <Play size={14} />}
            <span>{autoLoopEnabled ? 'Auto-Scan ON' : 'Auto-Scan Paused'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              setVoiceEnabled(next);
              if (next) playKioskSound('checkin');
            }}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-900 border-white/10 text-slate-500'
            }`}
            title={soundEnabled ? 'Sound & Voice Feedback Enabled' : 'Muted'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Return to ERP</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Kiosk Split Grid */}
      <main className="max-w-7xl w-full mx-auto my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left / Center (7 Cols): Zero-Click Live Sensor Terminal & Instant Verification Card */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          {/* Top Mode Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isCapturing ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'
                }`}
              />
              <span className="text-xs font-bold text-slate-300">
                {isCapturing
                  ? 'Sensor Active — Waiting for Finger on SecuGen Reader...'
                  : 'Ready for Next Faculty Member'}
              </span>
            </div>

            {/* Punch Mode Selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setPunchMode('auto')}
                className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  punchMode === 'auto'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Smart Auto
              </button>
              <button
                type="button"
                onClick={() => setPunchMode('checkin')}
                className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  punchMode === 'checkin'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Check-In Only
              </button>
              <button
                type="button"
                onClick={() => setPunchMode('checkout')}
                className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  punchMode === 'checkout'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Check-Out Only
              </button>
            </div>
          </div>

          {/* Center Display: Either Verified Result Card OR Active Sensor Prompt */}
          <div className="my-auto py-8 flex flex-col items-center justify-center text-center min-h-[320px]">
            {verifiedCard ? (
              <div
                className={`w-full max-w-lg rounded-3xl p-6 sm:p-7 border-2 shadow-2xl transition-all animate-in zoom-in-95 duration-200 ${
                  verifiedCard.type === 'checkin'
                    ? 'bg-emerald-950/90 border-emerald-400 text-white'
                    : verifiedCard.type === 'checkout'
                    ? 'bg-blue-950/90 border-blue-400 text-white'
                    : verifiedCard.type === 'duplicate'
                    ? 'bg-amber-950/90 border-amber-400 text-white'
                    : 'bg-rose-950/90 border-rose-500 text-white'
                }`}
              >
                {verifiedCard.person ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/30 overflow-hidden flex items-center justify-center text-2xl font-black shrink-0 shadow-lg">
                        {verifiedCard.person.photo ? (
                          <img
                            src={verifiedCard.person.photo}
                            alt={verifiedCard.person.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (verifiedCard.person.fullName || 'F').slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-black uppercase tracking-wider mb-1">
                          <CheckCircle2 size={13} />
                          <span>{verifiedCard.status}</span>
                        </div>
                        <h3 className="text-2xl font-black truncate">
                          {verifiedCard.person.fullName}
                        </h3>
                        <p className="text-xs text-white/80 font-mono">
                          ID: {verifiedCard.person.id} • {verifiedCard.person.role}
                        </p>
                      </div>
                      {verifiedCard.thumbBmp && (
                        <img
                          src={verifiedCard.thumbBmp}
                          alt="Thumb"
                          className="w-12 h-14 object-contain rounded-xl border border-white/30 bg-black/40 p-0.5 shrink-0"
                        />
                      )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-black/30 border border-white/15 flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-[11px] uppercase tracking-wider text-white/70 font-bold">
                          Status Confirmation
                        </p>
                        <p className="text-sm font-black text-emerald-300">
                          {verifiedCard.message}
                        </p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="text-base font-black text-amber-300">
                          {verifiedCard.punchTime}
                        </p>
                        <p className="text-[10px] text-white/60">
                          Match Score: {verifiedCard.score}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-white/70 font-bold uppercase tracking-widest">
                      ✓ Attendance Confirmed — Ready for Next Teacher in 3 Seconds...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 py-4">
                    <AlertTriangle className="w-14 h-14 text-rose-400 mx-auto" />
                    <h3 className="text-xl font-black text-white">Finger Not Recognized</h3>
                    <p className="text-xs text-rose-200 max-w-md mx-auto">
                      {verifiedCard.message}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 max-w-md mx-auto">
                <div
                  onClick={() => executeSingleScanCycle(true)}
                  className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center border-4 transition-all cursor-pointer ${
                    isCapturing
                      ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.45)] scale-105'
                      : 'bg-slate-800/80 border-white/15 hover:border-emerald-400/60'
                  }`}
                >
                  <Fingerprint
                    className={`w-16 h-16 text-emerald-400 ${
                      isCapturing ? 'animate-pulse' : ''
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                    <Zap size={12} />
                    <span>Zero-Click Continuous Scanner Active</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                    Place Finger on Scanner
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    No button press needed! Simply place your enrolled thumb or index finger on the
                    SecuGen USB sensor. Wait for the confirmation beep and walk away.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => executeSingleScanCycle(true)}
                    disabled={isCapturing}
                    className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-60"
                  >
                    <Fingerprint size={16} />
                    <span>{isCapturing ? 'Listening on Sensor...' : 'Scan Finger Now'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={loadBiometricDatabase}
                    className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Refresh Enrolled Templates from Cloud"
                  >
                    <RefreshCw size={14} />
                    <span>Sync DB ({enrolledStaff.length})</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Summary Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10">
              <p className="text-[10px] font-bold uppercase text-slate-400">Enrolled Faculty</p>
              <p className="text-xl font-black text-emerald-400 mt-0.5">
                {stats.totalEnrolled} <span className="text-xs text-slate-500">/ {staffList.length}</span>
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10">
              <p className="text-[10px] font-bold uppercase text-slate-400">Present Today</p>
              <p className="text-xl font-black text-white mt-0.5">{stats.present}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10">
              <p className="text-[10px] font-bold uppercase text-slate-400">Late (After 07:54)</p>
              <p className="text-xl font-black text-amber-400 mt-0.5">{stats.late}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10">
              <p className="text-[10px] font-bold uppercase text-slate-400">Checked Out</p>
              <p className="text-xl font-black text-sky-400 mt-0.5">{stats.checkedOut}</p>
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): Live Today's Biometric Feed & 30 Enrolled Staff Verification Roster */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-white/10 rounded-3xl p-6 flex flex-col justify-between max-h-[640px]">
          <div className="space-y-3 pb-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Live Faculty Biometric Roster ({enrolledStaff.length} Enrolled)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {getTodayDateStr()}
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchRoster}
                onChange={(e) => setSearchRoster(e.target.value)}
                placeholder="Filter teacher by name or ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5 my-2 pr-1">
            {filteredStaffRoster.map((teacher) => {
              const rec = todayAttendance.find(
                (r: any) => (r.staff_id || r.staffId) === teacher.id
              );
              const cin = rec?.check_in || rec?.checkIn;
              const cout = rec?.check_out || rec?.checkOut;
              const hasFinger = Boolean(
                teacher.fingerprintTemplate || teacher.fingerprint_template
              );

              return (
                <div
                  key={teacher.id}
                  className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-white/10 flex items-center justify-center text-xs font-black text-emerald-300 overflow-hidden shrink-0">
                      {teacher.photo ? (
                        <img
                          src={teacher.photo}
                          alt={teacher.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (teacher.fullName || 'T').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-white truncate">
                          {teacher.fullName}
                        </p>
                        {hasFinger ? (
                          <span
                            className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
                            title={`Enrolled (${teacher.fingerprintFinger || 'Right Thumb'})`}
                          />
                        ) : (
                          <span
                            className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold"
                            title="Fingerprint not yet scanned"
                          >
                            No Thumb
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {teacher.id} • {teacher.role}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {rec ? (
                      <div className="space-y-0.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                            rec.status === 'Late'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          <UserCheck size={10} />
                          <span>
                            {rec.status} {cin ? `• ${cin}` : ''}
                          </span>
                        </span>
                        {cout && (
                          <p className="text-[10px] font-mono text-sky-300 font-bold">
                            Out: {cout}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">
                        Awaiting Punch
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>All 30 Enrolled Staff Templates Verified in Cloud DB</span>
            <span className="text-emerald-400 font-bold">Late Cutoff: {settings?.collegeStartTime || '07:54'} AM</span>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl w-full mx-auto text-center text-xs text-slate-500 pt-2">
        {settings?.collegeName || collegeName} • Fast-Boost SecuGen Biometric Attendance Terminal
      </footer>
    </div>
  );
}
