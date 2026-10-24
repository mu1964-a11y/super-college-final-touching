import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Fingerprint,
  X,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Volume2,
  VolumeX,
  Zap,
  RefreshCw,
  Search,
  UserCheck,
  LogOut,
  AlertTriangle,
  Phone,
  Briefcase,
  GraduationCap,
  Play,
  Pause,
} from 'lucide-react';
import { secugenService } from '../lib/secugenService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { safeLocalStorage } from '../utils/safeStorage';
import { sendAutoStaffAttendancePdfNotice } from '../lib/whatsappAutomation';
import FingerprintThumbnail from './FingerprintThumbnail';
import { toast } from 'sonner';

interface InstantBiometricVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsList: any[];
  staffList: any[];
  data?: any;
}

function playBiometricTone(type: 'checkin' | 'checkout' | 'duplicate' | 'error') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'checkin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1318.5, now + 0.1);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'checkout') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now);
      osc.frequency.setValueAtTime(1567.98, now + 0.11);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'duplicate') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.setValueAtTime(175, now + 0.12);
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.32);
    }
  } catch {}
}

function speakBiometricVoice(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.06;
    utter.pitch = 1.02;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
  } catch {}
}

function getTodayStr(): string {
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

function formatHHMMSS(dateObj: Date): string {
  return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}:${String(dateObj.getSeconds()).padStart(2, '0')}`;
}

export default function InstantBiometricVerifyModal({
  isOpen,
  onClose,
  studentsList,
  staffList,
  data,
}: InstantBiometricVerifyModalProps) {
  const [scanning, setScanning] = useState(false);
  const [autoLoop, setAutoLoop] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [punchMode, setPunchMode] = useState<'auto' | 'checkin' | 'checkout' | 'verify'>('auto');
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterTab, setRosterTab] = useState<'staff' | 'students'>('staff');
  const [todayStaffAtt, setTodayStaffAtt] = useState<any[]>([]);
  const [todayStudentAtt, setTodayStudentAtt] = useState<any[]>([]);
  const [scannerReady, setScannerReady] = useState<boolean>(true);

  const [matchedResult, setMatchedResult] = useState<{
    type: 'checkin' | 'checkout' | 'duplicate' | 'verify' | 'unrecognized';
    personType?: 'Staff' | 'Student';
    person?: any;
    score?: number;
    statusLabel?: string;
    punchTime?: string;
    message: string;
    bmpDataUrl?: string;
  } | null>(null);

  const isMountedRef = useRef(true);
  const isScanningRef = useRef(false);
  const autoLoopRef = useRef(true);
  const clearCardTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    autoLoopRef.current = autoLoop;
  }, [autoLoop]);

  // Sync today's attendance from data prop + Supabase
  const refreshTodayAttendance = useCallback(async () => {
    const todayStr = getTodayStr();
    if (data?.staffAttendance && Array.isArray(data.staffAttendance)) {
      setTodayStaffAtt(data.staffAttendance.filter((a: any) => a.date === todayStr));
    }
    if (data?.studentAttendance && Array.isArray(data.studentAttendance)) {
      setTodayStudentAtt(data.studentAttendance.filter((a: any) => a.date === todayStr));
    }
    if (isSupabaseConfigured) {
      try {
        const [stAtt, stuAtt] = await Promise.all([
          supabase.from('staff_attendance').select('*').eq('date', todayStr),
          supabase.from('student_attendance').select('*').eq('date', todayStr),
        ]);
        if (stAtt.data) setTodayStaffAtt(stAtt.data);
        if (stuAtt.data) setTodayStudentAtt(stuAtt.data);
      } catch {}
    }
  }, [data?.staffAttendance, data?.studentAttendance]);

  useEffect(() => {
    if (isOpen) {
      isMountedRef.current = true;
      refreshTodayAttendance();
      secugenService.getStatus().then((st) => {
        if (isMountedRef.current) setScannerReady(st.connected && st.deviceFound);
      });
    } else {
      isMountedRef.current = false;
      setMatchedResult(null);
      if (clearCardTimerRef.current) clearTimeout(clearCardTimerRef.current);
    }
    return () => {
      isMountedRef.current = false;
      if (clearCardTimerRef.current) clearTimeout(clearCardTimerRef.current);
    };
  }, [isOpen, refreshTodayAttendance]);

  // Build normalized enrolled Staff & Student lists (including local vault & admissions fallback)
  const enrolledStaff = useMemo(() => {
    const raw = staffList && staffList.length > 0 ? staffList : data?.staff || [];
    return raw
      .map((st: any) => {
        let tpl = st.fingerprintTemplate || st.fingerprint_template;
        let finger = st.fingerprintFinger || st.fingerprint_finger || 'Right Thumb (دایاں انگوٹھا)';
        if (!tpl) {
          try {
            const v = safeLocalStorage.getItem(`scj_fp_vault_${st.id}`);
            if (v) {
              const parsed = JSON.parse(v);
              if (parsed?.template) {
                tpl = parsed.template;
                finger = parsed.finger || finger;
              }
            }
          } catch {}
        }
        return {
          ...st,
          fullName: st.fullName || st.full_name || 'Faculty Member',
          fatherName: st.fatherName || st.father_name || '',
          role: st.designation || st.role || 'Faculty',
          photo: st.photo || st.photo_url,
          contact: st.contact || st.phone || '',
          fingerprintTemplate: tpl,
          fingerprintFinger: finger,
        };
      })
      .filter((st: any) => Boolean(st.fingerprintTemplate));
  }, [staffList, data?.staff]);

  const enrolledStudents = useMemo(() => {
    const rawStudents = studentsList && studentsList.length > 0 ? studentsList : data?.students || [];
    const rawAdmissions = data?.admissions || [];
    const byId = new Map<string, any>();

    rawStudents.forEach((s: any) => {
      const linkedAdm = rawAdmissions.find(
        (a: any) => a.id === s.admissionId || a.studentId === s.id || a.id === s.id
      );
      let tpl =
        s.fingerprintTemplate ||
        s.fingerprint_template ||
        linkedAdm?.fingerprintTemplate ||
        linkedAdm?.fingerprint_template;
      let finger =
        s.fingerprintFinger ||
        s.fingerprint_finger ||
        linkedAdm?.fingerprintFinger ||
        linkedAdm?.fingerprint_finger ||
        'Right Thumb (دایاں انگوٹھا)';
      if (!tpl) {
        try {
          const v = safeLocalStorage.getItem(`scj_fp_vault_${s.id}`);
          if (v) {
            const parsed = JSON.parse(v);
            if (parsed?.template) {
              tpl = parsed.template;
              finger = parsed.finger || finger;
            }
          }
        } catch {}
      }
      if (tpl) {
        byId.set(s.id, {
          ...s,
          fullName: s.fullName || s.full_name || 'Student',
          fatherName: s.fatherName || s.father_name || '',
          collegeNo: s.collegeNo || s.studentId || s.id,
          group: s.group || s.groupName || s.category || 'Student',
          section: s.section || '',
          photo: s.photo || s.photo_url,
          fingerprintTemplate: tpl,
          fingerprintFinger: finger,
        });
      }
    });

    rawAdmissions.forEach((a: any) => {
      const tpl = a.fingerprintTemplate || a.fingerprint_template;
      const key = a.studentId || a.id;
      if (tpl && !byId.has(key)) {
        byId.set(key, {
          ...a,
          id: key,
          fullName: a.fullName || a.full_name || 'Student',
          fatherName: a.fatherName || a.father_name || '',
          collegeNo: a.collegeNo || a.studentId || a.id,
          group: a.group || a.category || 'Student',
          section: a.section || '',
          photo: a.photo || a.photo_url,
          fingerprintTemplate: tpl,
          fingerprintFinger: a.fingerprintFinger || a.fingerprint_finger || 'Right Thumb (دایاں انگوٹھا)',
        });
      }
    });

    return Array.from(byId.values());
  }, [studentsList, data?.students, data?.admissions]);

  // Helper to record Staff Attendance in Supabase + Local State
  const recordStaffPunch = useCallback(
    async (
      teacher: any,
      forcedAction?: 'checkin' | 'checkout',
      score = 185,
      bmpDataUrl?: string
    ) => {
      const now = new Date();
      const todayStr = getTodayStr();
      const hhmmss = formatHHMMSS(now);
      const hhmm = hhmmss.slice(0, 5);
      const displayTime = formatTime12h(now);
      const cutoffTime = data?.settings?.collegeStartTime || '07:54';

      const existingRec = todayStaffAtt.find(
        (r: any) => (r.staff_id || r.staffId) === teacher.id && r.date === todayStr
      );
      const existingIn =
        existingRec?.check_in || existingRec?.checkIn || existingRec?.check_in_time || existingRec?.checkInTime;
      const existingOut =
        existingRec?.check_out || existingRec?.checkOut || existingRec?.check_out_time || existingRec?.checkOutTime;

      let action: 'checkin' | 'checkout' | 'duplicate' = 'checkin';
      if (forcedAction) {
        action = forcedAction;
      } else if (punchMode === 'checkin') {
        action = 'checkin';
      } else if (punchMode === 'checkout') {
        action = 'checkout';
      } else {
        if (!existingIn) {
          action = 'checkin';
        } else {
          let minsElapsed = 999;
          const isoIn = existingRec?.check_in_time || existingRec?.checkInTime || existingRec?.created_at;
          if (isoIn) {
            const d = new Date(isoIn);
            if (!isNaN(d.getTime())) {
              minsElapsed = (now.getTime() - d.getTime()) / 60000;
            }
          }
          if (minsElapsed < 5 && !existingOut) {
            action = 'duplicate';
          } else {
            action = 'checkout';
          }
        }
      }

      if (action === 'duplicate') {
        if (soundEnabled) playBiometricTone('duplicate');
        speakBiometricVoice(`${teacher.fullName}, your check in is already marked.`, soundEnabled);
        setMatchedResult({
          type: 'duplicate',
          personType: 'Staff',
          person: teacher,
          score,
          statusLabel: existingRec?.status || 'Present',
          punchTime: existingIn || displayTime,
          message: `Already Checked In Today at ${existingIn || displayTime}`,
          bmpDataUrl,
        });
        return;
      }

      if (action === 'checkin') {
        const [cutH, cutM] = cutoffTime.split(':').map(Number);
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const cutMins = (cutH || 7) * 60 + (cutM || 54);
        const computedStatus = nowMins > cutMins ? 'Late' : 'Present';

        const dbPayload = {
          staff_id: teacher.id,
          date: todayStr,
          status: computedStatus,
          check_in: hhmmss,
          check_in_time: now.toISOString(),
          verification_method: 'secugen_fingerprint',
          notes: JSON.stringify({
            method: 'biometric_fingerprint',
            check_in_time: hhmmss,
            score,
            finger: teacher.fingerprintFinger || 'Right Thumb',
          }),
        };

        if (isSupabaseConfigured) {
          const { error } = await supabase
            .from('staff_attendance')
            .upsert([dbPayload], { onConflict: 'staff_id,date' });
          if (error) {
            console.error('Staff attendance upsert error:', error);
            toast.error(`Attendance DB Error: ${error.message}`);
          }
        }

        // Update local state & localStorage
        setTodayStaffAtt((prev) => [
          ...prev.filter((r: any) => (r.staff_id || r.staffId) !== teacher.id),
          { ...existingRec, ...dbPayload, staffId: teacher.id, checkIn: hhmm },
        ]);

        try {
          const stored = safeLocalStorage.getItem('staffAttendanceRecords');
          const list = stored ? JSON.parse(stored) : [];
          const filtered = list.filter(
            (r: any) => !(r.staffId === teacher.id && r.date === todayStr)
          );
          filtered.push({
            id: `${teacher.id}-${todayStr}`,
            staffId: teacher.id,
            date: todayStr,
            status: computedStatus,
            checkIn: hhmm,
            checkOut: existingRec?.check_out || existingRec?.checkOut || '',
            notes: dbPayload.notes,
            verificationMethod: 'secugen_fingerprint',
            checkInTime: now.toISOString(),
          });
          safeLocalStorage.setItem('staffAttendanceRecords', JSON.stringify(filtered));
        } catch {}

        data?.fetchData?.(true);

        if (soundEnabled) playBiometricTone('checkin');
        speakBiometricVoice(`Thank you ${teacher.fullName}. Check in marked.`, soundEnabled);
        toast.success(`Attendance Marked: ${teacher.fullName} (${computedStatus} at ${displayTime})`);

        setMatchedResult({
          type: 'checkin',
          personType: 'Staff',
          person: teacher,
          score,
          statusLabel: computedStatus,
          punchTime: displayTime,
          message:
            computedStatus === 'Late'
              ? `Check-In Recorded (Late Arrival after ${cutoffTime} AM)`
              : 'On-Time Biometric Check-In Confirmed!',
          bmpDataUrl,
        });

        if (teacher.contact) {
          sendAutoStaffAttendancePdfNotice(teacher.id, teacher.contact, todayStr.slice(0, 7), {
            silent: true,
          }).catch(() => {});
        }
      } else {
        // Check-Out
        const dbPayload = {
          staff_id: teacher.id,
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
            score,
          }),
        };

        if (isSupabaseConfigured) {
          await supabase
            .from('staff_attendance')
            .upsert([dbPayload], { onConflict: 'staff_id,date' });
        }

        setTodayStaffAtt((prev) => [
          ...prev.filter((r: any) => (r.staff_id || r.staffId) !== teacher.id),
          { ...existingRec, ...dbPayload, staffId: teacher.id, checkOut: hhmm },
        ]);

        data?.fetchData?.(true);

        if (soundEnabled) playBiometricTone('checkout');
        speakBiometricVoice(`Goodbye ${teacher.fullName}. Check out recorded.`, soundEnabled);
        toast.success(`Check-Out Marked: ${teacher.fullName} (${displayTime})`);

        setMatchedResult({
          type: 'checkout',
          personType: 'Staff',
          person: teacher,
          score,
          statusLabel: 'Checked Out',
          punchTime: displayTime,
          message: 'Official Duty Check-Out Confirmed!',
          bmpDataUrl,
        });
      }
    },
    [todayStaffAtt, punchMode, soundEnabled, data]
  );

  // Helper to record Student Attendance in Supabase + Local State
  const recordStudentPunch = useCallback(
    async (student: any, score = 185, bmpDataUrl?: string) => {
      const now = new Date();
      const todayStr = getTodayStr();
      const displayTime = formatTime12h(now);

      const dbPayload = {
        student_id: student.id,
        date: todayStr,
        status: 'Present',
        check_in_time: now.toISOString(),
        verification_method: 'secugen_fingerprint',
        notes: `SecuGen Biometric Verified (Score ${score})`,
      };

      if (isSupabaseConfigured) {
        await supabase
          .from('student_attendance')
          .upsert([dbPayload], { onConflict: 'student_id,date' });
      }

      setTodayStudentAtt((prev) => [
        ...prev.filter((r: any) => (r.student_id || r.studentId) !== student.id),
        { ...dbPayload, studentId: student.id },
      ]);

      data?.fetchData?.(true);

      if (soundEnabled) playBiometricTone('checkin');
      speakBiometricVoice(`Welcome ${student.fullName}. Attendance marked.`, soundEnabled);
      toast.success(`Student Attendance Marked: ${student.fullName}`);

      setMatchedResult({
        type: 'checkin',
        personType: 'Student',
        person: student,
        score,
        statusLabel: 'Present',
        punchTime: displayTime,
        message: 'Student Biometric Check-In Confirmed!',
        bmpDataUrl,
      });
    },
    [soundEnabled, data]
  );

  // Core Scan & 1:N Match Cycle
  const handleScanCycle = useCallback(
    async (isManualClick = false) => {
      if (isScanningRef.current) return;
      isScanningRef.current = true;
      setScanning(true);

      try {
        const res = await secugenService.captureFingerprint({
          timeoutMs: isManualClick ? 10000 : 5500,
          quality: 40,
          templateFormat: 'ISO',
        });

        if (!isMountedRef.current) return;

        if (!res.success || !res.templateBase64) {
          if (isManualClick && res.error) {
            toast.error(res.error);
          }
          return;
        }

        setScannerReady(true);

        // 1:N Match against all 31+ enrolled Staff
        let bestStaff: any = null;
        let bestStaffScore = 0;

        for (const st of enrolledStaff) {
          const m = await secugenService.matchTemplates(res.templateBase64, st.fingerprintTemplate);
          if (m.matched && m.score > bestStaffScore) {
            bestStaffScore = m.score;
            bestStaff = st;
          }
        }

        // 1:N Match against enrolled Students
        let bestStudent: any = null;
        let bestStudentScore = 0;

        for (const stu of enrolledStudents) {
          const m = await secugenService.matchTemplates(res.templateBase64, stu.fingerprintTemplate);
          if (m.matched && m.score > bestStudentScore) {
            bestStudentScore = m.score;
            bestStudent = stu;
          }
        }

        if (!bestStaff && !bestStudent) {
          if (soundEnabled) playBiometricTone('error');
          speakBiometricVoice('Finger not recognized. Please place enrolled thumb flat on sensor.', soundEnabled);
          setMatchedResult({
            type: 'unrecognized',
            message: 'Fingerprint did not match any enrolled record. Please place enrolled finger flat on the center of the SecuGen sensor.',
            bmpDataUrl: res.bmpDataUrl,
          });
          if (clearCardTimerRef.current) clearTimeout(clearCardTimerRef.current);
          clearCardTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) setMatchedResult(null);
          }, 3000);
          return;
        }

        if (bestStaff && bestStaffScore >= bestStudentScore) {
          if (res.bmpBase64) {
            secugenService.saveFingerprintThumbnail(bestStaff.id, res.bmpBase64);
          }
          if (punchMode === 'verify') {
            if (soundEnabled) playBiometricTone('checkin');
            speakBiometricVoice(`Verified faculty ${bestStaff.fullName}.`, soundEnabled);
            setMatchedResult({
              type: 'verify',
              personType: 'Staff',
              person: bestStaff,
              score: bestStaffScore,
              statusLabel: 'Identity Verified',
              punchTime: formatTime12h(new Date()),
              message: '100% Biometric Identity Match Confirmed!',
              bmpDataUrl: res.bmpDataUrl,
            });
          } else {
            await recordStaffPunch(bestStaff, undefined, bestStaffScore, res.bmpDataUrl);
          }
        } else if (bestStudent) {
          if (res.bmpBase64) {
            secugenService.saveFingerprintThumbnail(
              bestStudent.id,
              res.bmpBase64,
              bestStudent.collegeNo
            );
          }
          if (punchMode === 'verify') {
            if (soundEnabled) playBiometricTone('checkin');
            speakBiometricVoice(`Verified student ${bestStudent.fullName}.`, soundEnabled);
            setMatchedResult({
              type: 'verify',
              personType: 'Student',
              person: bestStudent,
              score: bestStudentScore,
              statusLabel: 'Identity Verified',
              punchTime: formatTime12h(new Date()),
              message: '100% Biometric Identity Match Confirmed!',
              bmpDataUrl: res.bmpDataUrl,
            });
          } else {
            await recordStudentPunch(bestStudent, bestStudentScore, res.bmpDataUrl);
          }
        }

        if (clearCardTimerRef.current) clearTimeout(clearCardTimerRef.current);
        clearCardTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && autoLoopRef.current) {
            setMatchedResult(null);
          }
        }, 3800);
      } finally {
        if (isMountedRef.current) {
          setScanning(false);
        }
        isScanningRef.current = false;
      }
    },
    [
      enrolledStaff,
      enrolledStudents,
      punchMode,
      soundEnabled,
      recordStaffPunch,
      recordStudentPunch,
    ]
  );

  // Continuous Zero-Click Auto-Loop while modal is open
  useEffect(() => {
    if (!isOpen || !autoLoop) return;
    let timer: NodeJS.Timeout | null = null;

    const loop = async () => {
      if (!isMountedRef.current || !autoLoopRef.current) return;
      if (!isScanningRef.current) {
        await handleScanCycle(false);
      }
      if (isMountedRef.current && autoLoopRef.current) {
        timer = setTimeout(loop, 700);
      }
    };

    timer = setTimeout(loop, 350);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, autoLoop, handleScanCycle]);

  const filteredRoster = useMemo(() => {
    const q = (rosterSearch || '').toLowerCase();
    const list = rosterTab === 'staff' ? enrolledStaff : enrolledStudents;
    return list.filter(
      (item: any) =>
        (item.fullName || '').toLowerCase().includes(q) ||
        (item.id || '').toLowerCase().includes(q) ||
        (item.role || item.group || '').toLowerCase().includes(q)
    );
  }, [rosterTab, enrolledStaff, enrolledStudents, rosterSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Royal Teal Institutional Header */}
        <div className="bg-gradient-to-r from-[#064e43] via-[#085a4e] to-teal-950 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Fingerprint size={24} className="text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider">
                  SecuGen Biometric Attendance & Verification Desk
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    scannerReady
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                  }`}
                >
                  {scannerReady ? 'HU20 Scanner Ready' : 'Waiting for USB Sensor'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/90 font-medium">
                {enrolledStaff.length} Faculty & {enrolledStudents.length} Students Enrolled • Place Finger on Scanner for Instant Match & Attendance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoLoop((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer ${
                autoLoop
                  ? 'bg-emerald-500/25 border-emerald-300/50 text-emerald-100'
                  : 'bg-white/10 border-white/15 text-white/70'
              }`}
              title="Toggle Continuous Zero-Click Auto-Scanning"
            >
              {autoLoop ? <Pause size={13} /> : <Play size={13} />}
              <span>{autoLoop ? 'Auto-Scan ON' : 'Auto-Scan Paused'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playBiometricTone('checkin');
              }}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                  : 'bg-white/10 border-white/15 text-white/60'
              }`}
              title={soundEnabled ? 'Audio Chime & Voice Enabled' : 'Muted'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Split Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 overflow-y-auto flex-1">
          {/* Left 7 Columns: Live Sensor & Verified Person Dossier Card */}
          <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-5 bg-slate-50/50 dark:bg-slate-900">
            {/* Mode Switcher Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    scanning ? 'bg-emerald-500 animate-ping' : 'bg-emerald-600'
                  }`}
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {scanning ? 'Listening on SecuGen Sensor...' : 'Ready for Finger Placement'}
                </span>
              </div>

              <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                {(
                  [
                    { id: 'auto', label: 'Smart Auto' },
                    { id: 'checkin', label: 'Check-In' },
                    { id: 'checkout', label: 'Check-Out' },
                    { id: 'verify', label: 'Verify Only' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPunchMode(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                      punchMode === m.id
                        ? 'bg-[#085a4e] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Result Card OR Sensor Prompt */}
            <div className="my-auto py-2">
              {matchedResult ? (
                <div
                  className={`rounded-3xl p-5 sm:p-6 border-2 shadow-xl transition-all animate-in zoom-in-95 duration-150 ${
                    matchedResult.type === 'unrecognized'
                      ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-950 dark:text-rose-100'
                      : matchedResult.type === 'checkout'
                      ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-400 text-slate-900 dark:text-white'
                      : matchedResult.type === 'duplicate'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-slate-900 dark:text-white'
                      : 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 text-slate-900 dark:text-white'
                  }`}
                >
                  {matchedResult.person ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-20 h-20 rounded-2xl bg-[#085a4e] text-white font-black text-xl flex items-center justify-center overflow-hidden border-2 border-emerald-500 shadow-md shrink-0">
                            {matchedResult.person.photo ? (
                              <img
                                src={matchedResult.person.photo}
                                alt={matchedResult.person.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (matchedResult.person.fullName || 'S').slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                                <CheckCircle2 size={12} />
                                {matchedResult.statusLabel}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 font-mono text-[10px] font-bold">
                                {matchedResult.person.collegeNo || matchedResult.person.id}
                              </span>
                            </div>
                            <h4 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                              {matchedResult.person.fullName}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                              {matchedResult.personType === 'Staff' ? (
                                <span className="inline-flex items-center gap-1">
                                  <Briefcase size={12} className="text-emerald-700" />
                                  {matchedResult.person.role || 'Faculty Member'}
                                  {matchedResult.person.fatherName
                                    ? ` • S/D/O ${matchedResult.person.fatherName}`
                                    : ''}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <GraduationCap size={12} className="text-emerald-700" />
                                  {matchedResult.person.group}{' '}
                                  {matchedResult.person.section
                                    ? `• Sec ${matchedResult.person.section}`
                                    : ''}
                                </span>
                              )}
                            </p>
                            {matchedResult.person.contact && (
                              <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                <Phone size={11} /> {matchedResult.person.contact}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Captured Thumb Impression Box */}
                        <div className="text-center shrink-0">
                          {matchedResult.bmpDataUrl ? (
                            <img
                              src={matchedResult.bmpDataUrl}
                              alt="Scanned Thumb"
                              className="w-14 h-16 object-contain rounded-xl bg-slate-950 border-2 border-emerald-500 p-0.5 shadow-md"
                            />
                          ) : (
                            <FingerprintThumbnail
                              personId={matchedResult.person.id}
                              template={matchedResult.person.fingerprintTemplate}
                              fingerLabel={matchedResult.person.fingerprintFinger}
                              size="md"
                            />
                          )}
                          <span className="block text-[9px] font-mono font-black text-emerald-700 mt-1">
                            Score: {matchedResult.score}/199
                          </span>
                        </div>
                      </div>

                      {/* Attendance Confirmation Banner */}
                      <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-emerald-200 dark:border-slate-700 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Biometric Attendance Status
                          </p>
                          <p className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300">
                            {matchedResult.message}
                          </p>
                        </div>
                        <div className="text-right font-mono shrink-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1 justify-end">
                            <Clock size={13} className="text-emerald-600" />
                            {matchedResult.punchTime}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {matchedResult.person.fingerprintFinger || 'Right Thumb'}
                          </p>
                        </div>
                      </div>

                      {/* Quick Action Buttons on Verified Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        {matchedResult.personType === 'Staff' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                recordStaffPunch(
                                  matchedResult.person,
                                  'checkin',
                                  matchedResult.score,
                                  matchedResult.bmpDataUrl
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <UserCheck size={13} /> Mark Check-In
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                recordStaffPunch(
                                  matchedResult.person,
                                  'checkout',
                                  matchedResult.score,
                                  matchedResult.bmpDataUrl
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <LogOut size={13} /> Mark Check-Out
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setMatchedResult(null);
                            handleScanCycle(true);
                          }}
                          className="ml-auto px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
                        >
                          <Fingerprint size={13} /> Scan Next Person
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 space-y-3">
                      <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto" />
                      <h4 className="text-base font-black text-rose-900 dark:text-rose-200">
                        Fingerprint Not Recognized
                      </h4>
                      <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
                        {matchedResult.message}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setMatchedResult(null);
                          handleScanCycle(true);
                        }}
                        className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                      >
                        Try Scan Again
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-4 py-4">
                  <div
                    onClick={() => handleScanCycle(true)}
                    className={`w-28 h-32 rounded-3xl mx-auto flex flex-col items-center justify-center border-2 transition-all cursor-pointer ${
                      scanning
                        ? 'bg-slate-950 border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.35)] scale-105'
                        : 'bg-slate-900 border-slate-700 hover:border-emerald-500'
                    }`}
                  >
                    <Fingerprint
                      className={`w-14 h-14 text-emerald-400 ${
                        scanning ? 'animate-pulse' : ''
                      }`}
                    />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300 mt-1.5">
                      {scanning ? 'Sensor Active' : 'Click to Scan'}
                    </span>
                  </div>

                  <div className="space-y-1 max-w-md mx-auto">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                      <Zap size={11} />
                      <span>Fast-Boost 1:N Biometric Engine</span>
                    </div>
                    <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      Place Enrolled Finger on SecuGen Scanner
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Place your enrolled thumb or index finger flat on the USB scanner. Attendance (Check-In / Check-Out) and identity details will appear automatically with sound confirmation.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleScanCycle(true)}
                      disabled={scanning}
                      className="px-6 py-3 rounded-2xl bg-[#085a4e] hover:bg-[#064e43] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-60"
                    >
                      <Fingerprint size={16} />
                      <span>{scanning ? 'Scanning Finger...' : 'Scan & Mark Attendance'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={refreshTodayAttendance}
                      className="p-3 rounded-2xl bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 cursor-pointer"
                      title="Refresh Today's Biometric Log"
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Summary Bar */}
            <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
              <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <p className="text-[10px] font-bold uppercase text-slate-400">Enrolled Staff</p>
                <p className="text-base font-black text-emerald-700 dark:text-emerald-400">
                  {enrolledStaff.length}
                </p>
              </div>
              <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <p className="text-[10px] font-bold uppercase text-slate-400">Staff Checked In</p>
                <p className="text-base font-black text-slate-900 dark:text-white">
                  {todayStaffAtt.filter((a: any) => a.status === 'Present' || a.status === 'Late').length}
                </p>
              </div>
              <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <p className="text-[10px] font-bold uppercase text-slate-400">Staff Checked Out</p>
                <p className="text-base font-black text-sky-600">
                  {todayStaffAtt.filter((a: any) => Boolean(a.check_out || a.checkOut)).length}
                </p>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Enrolled Biometric Roster & Today's Live Punch Log */}
          <div className="lg:col-span-5 p-5 flex flex-col justify-between bg-white dark:bg-slate-900 max-h-[540px]">
            <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Enrolled Biometric Roster
                  </h4>
                </div>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setRosterTab('staff')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                      rosterTab === 'staff'
                        ? 'bg-[#085a4e] text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Staff ({enrolledStaff.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterTab('students')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                      rosterTab === 'students'
                        ? 'bg-[#085a4e] text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Students ({enrolledStudents.length})
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Search enrolled person by name or ID..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 my-2 pr-1">
              {filteredRoster.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No enrolled records matching filter.
                </div>
              ) : (
                filteredRoster.map((person: any) => {
                  const rec =
                    rosterTab === 'staff'
                      ? todayStaffAtt.find((r: any) => (r.staff_id || r.staffId) === person.id)
                      : todayStudentAtt.find(
                          (r: any) => (r.student_id || r.studentId) === person.id
                        );
                  const cin = rec?.check_in || rec?.checkIn;
                  const cout = rec?.check_out || rec?.checkOut;

                  return (
                    <div
                      key={person.id}
                      className="py-2.5 px-1.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FingerprintThumbnail
                          personId={person.id}
                          altId={person.collegeNo}
                          template={person.fingerprintTemplate}
                          fingerLabel={person.fingerprintFinger}
                          size="xs"
                          allowInspect={true}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                            {person.fullName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">
                            {person.collegeNo || person.id} • {person.fingerprintFinger || 'Thumb'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {rec ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                                rec.status === 'Late'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              <CheckCircle2 size={10} />
                              {rec.status} {cin ? `• ${String(cin).slice(0, 5)}` : ''}
                            </span>
                            {cout && (
                              <span className="text-[9px] font-mono font-bold text-sky-700">
                                Out: {String(cout).slice(0, 5)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            Awaiting Scan
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
      </div>
    </div>
  );
}
