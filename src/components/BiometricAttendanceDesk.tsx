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
import {
  sendAutoStaffDailyCheckInNotice,
  sendAutoDailyAttendanceNoticeDetailed,
  parseAttendanceNotesAndTime,
} from '../lib/whatsappAutomation';
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
  const [punchMode, setPunchMode] = useState<'auto' | 'checkin' | 'breakout' | 'breakin' | 'checkout'>('auto');
  const [scannerStatus, setScannerStatus] = useState<{ connected: boolean; deviceFound: boolean }>({
    connected: false,
    deviceFound: false,
  });
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [searchRoster, setSearchRoster] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Instant Verification Result Banner (Auto-resets after 3.5 seconds)
  const [verifiedCard, setVerifiedCard] = useState<{
    type: 'checkin' | 'breakout' | 'breakin' | 'checkout' | 'duplicate' | 'unrecognized';
    person?: any;
    status?: string;
    punchTime?: string;
    score?: number;
    message: string;
    thumbBmp?: string;
    checkIn?: string;
    breakOut?: string;
    breakIn?: string;
    checkOut?: string;
    campusState?: 'in_campus' | 'on_break' | 'checked_out';
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

  // Apply and persist a 4-stage Staff Movement action (Morning In, Break Out, Break In, Final Out)
  const recordStaffStageAction = useCallback(
    async (
      matchedStaff: any,
      stageAction: 'checkin' | 'breakout' | 'breakin' | 'checkout' | 'duplicate',
      bestScore: number,
      thumbDataUrl?: string
    ) => {
      const now = new Date();
      const todayStr = getTodayDateStr();
      const hhmm = formatHHMM(now);
      const hhmmss = `${hhmm}:${String(now.getSeconds()).padStart(2, '0')}`;
      const displayTime = formatTime12h(now);
      const cutoffTime = settings?.collegeStartTime || '07:54';

      const existingRec = todayAttendance.find(
        (r: any) => (r.staff_id || r.staffId) === matchedStaff.id && r.date === todayStr
      );
      const parsedExisting = parseAttendanceNotesAndTime(
        existingRec?.notes,
        existingRec?.check_in || existingRec?.checkIn || existingRec?.check_in_time || existingRec?.checkInTime,
        existingRec?.check_out || existingRec?.checkOut || existingRec?.check_out_time || existingRec?.checkOutTime
      );

      let prevJson: Record<string, any> = {};
      if (existingRec?.notes && typeof existingRec.notes === 'string' && existingRec.notes.startsWith('{')) {
        try {
          prevJson = JSON.parse(existingRec.notes);
        } catch {}
      }

      const existingCheckIn = parsedExisting.checkIn;
      const existingBreakOut = parsedExisting.breakOut || prevJson.breakOut || '';
      const existingBreakIn = parsedExisting.breakIn || prevJson.breakIn || '';
      const existingCheckOut = parsedExisting.checkOut;
      const prevMovements = Array.isArray(parsedExisting.movements) ? parsedExisting.movements : [];

      if (stageAction === 'duplicate') {
        if (soundEnabled) playKioskSound('duplicate');
        speakKioskAnnouncement(
          `${matchedStaff.fullName}, your punch is already recorded.`,
          voiceEnabled
        );
        setVerifiedCard({
          type: 'duplicate',
          person: matchedStaff,
          status: existingRec?.status || 'Present',
          punchTime: displayTime,
          score: bestScore,
          message: `Duplicate Scan Guard — Already Punched Recently (${existingCheckIn || displayTime})`,
          thumbBmp: thumbDataUrl,
          checkIn: existingCheckIn,
          breakOut: existingBreakOut,
          breakIn: existingBreakIn,
          checkOut: existingCheckOut,
          campusState: parsedExisting.campusState || 'in_campus',
        });
        return;
      }

      const [cutH, cutM] = cutoffTime.split(':').map(Number);
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const cutMins = (cutH || 7) * 60 + (cutM || 54);
      const computedStatus =
        existingRec?.status || (nowMins > cutMins ? 'Late' : 'Present');

      const nextCheckIn = stageAction === 'checkin' ? (existingCheckIn || displayTime) : (existingCheckIn || displayTime);
      const nextBreakOut = stageAction === 'breakout' ? displayTime : existingBreakOut;
      const nextBreakIn = stageAction === 'breakin' ? displayTime : existingBreakIn;
      const nextCheckOut = stageAction === 'checkout' ? displayTime : existingCheckOut;
      const nextCampusState: 'in_campus' | 'on_break' | 'checked_out' =
        stageAction === 'breakout'
          ? 'on_break'
          : stageAction === 'checkout'
          ? 'checked_out'
          : 'in_campus';

      const nextMovements = [
        ...prevMovements,
        {
          type: stageAction,
          time: displayTime,
          iso: now.toISOString(),
        },
      ];

      const notesJson = JSON.stringify({
        ...prevJson,
        checkIn: nextCheckIn,
        breakOut: nextBreakOut,
        breakIn: nextBreakIn,
        checkOut: nextCheckOut,
        campusState: nextCampusState,
        movements: nextMovements,
        check_in_time: prevJson.check_in_time || hhmmss,
        ...(stageAction === 'checkin' ? { isoCheckIn: now.toISOString() } : {}),
        ...(stageAction === 'breakout' ? { break_out_time: hhmmss, isoBreakOut: now.toISOString() } : {}),
        ...(stageAction === 'breakin' ? { break_in_time: hhmmss, isoBreakIn: now.toISOString() } : {}),
        ...(stageAction === 'checkout' ? { check_out_time: hhmmss, isoCheckOut: now.toISOString() } : {}),
        lastPunchIso: now.toISOString(),
        method: 'biometric_fingerprint',
        Verify: 'Biometric Thumb Verified',
        score: bestScore,
      });

      const basePayload = {
        id: existingRec?.id || `${matchedStaff.id}-${todayStr}`,
        staff_id: matchedStaff.id,
        date: todayStr,
        status: computedStatus,
        notes: notesJson,
      };

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('staff_attendance')
          .upsert([basePayload], { onConflict: 'id' });
        if (error) {
          await supabase
            .from('staff_attendance')
            .upsert(
              [
                {
                  staff_id: matchedStaff.id,
                  date: todayStr,
                  status: computedStatus,
                  notes: notesJson,
                },
              ],
              { onConflict: 'staff_id,date' }
            );
        }
      }

      const updatedStaffRecord = {
        ...existingRec,
        ...basePayload,
        staffId: matchedStaff.id,
        checkIn: nextCheckIn,
        breakOut: nextBreakOut,
        breakIn: nextBreakIn,
        checkOut: nextCheckOut,
        verificationMethod: 'secugen_fingerprint',
      };

      setTodayAttendance((prev) => {
        const others = prev.filter(
          (r: any) => (r.staff_id || r.staffId) !== matchedStaff.id
        );
        return [updatedStaffRecord, ...others];
      });

      try {
        const stored = safeLocalStorage.getItem('staffAttendanceRecords');
        const list = stored ? JSON.parse(stored) : [];
        const filtered = list.filter(
          (r: any) => !(r.staffId === matchedStaff.id && r.date === todayStr)
        );
        filtered.push({
          id: `${matchedStaff.id}-${todayStr}`,
          staffId: matchedStaff.id,
          date: todayStr,
          status: computedStatus,
          checkIn: nextCheckIn,
          breakOut: nextBreakOut,
          breakIn: nextBreakIn,
          checkOut: nextCheckOut,
          notes: notesJson,
          verificationMethod: 'secugen_fingerprint',
          checkInTime: now.toISOString(),
        });
        safeLocalStorage.setItem('staffAttendanceRecords', JSON.stringify(filtered));
        window.dispatchEvent(
          new CustomEvent('scj-biometric-attendance-updated', {
            detail: { staffId: matchedStaff.id, date: todayStr, record: updatedStaffRecord },
          })
        );
      } catch {}

      onAttendanceMarked?.();

      let statusLabel = computedStatus;
      let cardMessage = `On-Time Biometric Check-In Recorded at ${displayTime}!`;
      let voiceText = `Thank you ${matchedStaff.fullName}. Check in marked at ${displayTime}.`;

      if (stageAction === 'checkin') {
        if (soundEnabled) playKioskSound('checkin');
        cardMessage =
          computedStatus === 'Late'
            ? `Morning Check-In Recorded at ${displayTime} (Late Arrival after ${cutoffTime} AM)`
            : `On-Time Morning Check-In Recorded at ${displayTime}!`;
      } else if (stageAction === 'breakout') {
        if (soundEnabled) playKioskSound('checkout');
        statusLabel = 'Break / Free-Period Out';
        cardMessage = `Mid-Day Break / Free-Period Exit Recorded at ${displayTime}`;
        voiceText = `${matchedStaff.fullName}, mid day break out recorded at ${displayTime}.`;
      } else if (stageAction === 'breakin') {
        if (soundEnabled) playKioskSound('checkin');
        statusLabel = 'Returned from Break';
        cardMessage = `Mid-Day Break Return Recorded at ${displayTime} (Out: ${nextBreakOut})`;
        voiceText = `Welcome back ${matchedStaff.fullName}. Break return recorded at ${displayTime}.`;
      } else if (stageAction === 'checkout') {
        if (soundEnabled) playKioskSound('checkout');
        statusLabel = 'Checked Out';
        cardMessage = `Final Off-Duty Check-Out Recorded at ${displayTime}!`;
        voiceText = `Goodbye ${matchedStaff.fullName}. Final check out recorded at ${displayTime}.`;
      }

      speakKioskAnnouncement(voiceText, voiceEnabled);

      setVerifiedCard({
        type: stageAction,
        person: matchedStaff,
        status: statusLabel,
        punchTime: displayTime,
        score: bestScore,
        message: cardMessage,
        thumbBmp: thumbDataUrl,
        checkIn: nextCheckIn,
        breakOut: nextBreakOut,
        breakIn: nextBreakIn,
        checkOut: nextCheckOut,
        campusState: nextCampusState,
      });

      if (matchedStaff.contact) {
        sendAutoStaffDailyCheckInNotice(
          matchedStaff,
          {
            date: todayStr,
            status: computedStatus,
            checkInTime: nextCheckIn,
            breakOutTime: nextBreakOut || undefined,
            breakInTime: nextBreakIn || undefined,
            checkOutTime: nextCheckOut || undefined,
            punchEventLabel: statusLabel,
            mode:
              stageAction === 'breakout'
                ? 'Biometric Scanner (Mid-Day Break Out)'
                : stageAction === 'breakin'
                ? 'Biometric Scanner (Break Return In)'
                : stageAction === 'checkout'
                ? 'Biometric Scanner (Final Check-Out)'
                : 'Biometric Thumb Scanner',
            notes: notesJson,
          },
          { silent: true, alsoSendPdf: stageAction === 'checkin' || stageAction === 'checkout' }
        ).catch(() => {});
      }
    },
    [todayAttendance, settings, soundEnabled, voiceEnabled, onAttendanceMarked]
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

        // 1:N Fast Template Matching against Enrolled Staff (31+ Faculty, supports 1 or 2 fingers per teacher)
        let matchedStaff: any = null;
        let bestScore = 0;

        for (const teacher of enrolledStaff) {
          const tpl = teacher.fingerprintTemplate || teacher.fingerprint_template;
          if (!tpl) continue;
          const m = await secugenService.matchTemplates(
            res.templateBase64,
            tpl,
            'ISO',
            teacher.fingerprintFinger || teacher.fingerprint_finger
          );
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
            const m = await secugenService.matchTemplates(
              res.templateBase64,
              tpl,
              'ISO',
              stu.fingerprintFinger || stu.fingerprint_finger
            );
            if (m.matched && m.score > bestScore) {
              bestScore = m.score;
              matchedStudent = stu;
            }
          }
        }

        const now = new Date();
        const todayStr = getTodayDateStr();
        const displayTime = formatTime12h(now);

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
          const parsedExisting = parseAttendanceNotesAndTime(
            existingRec?.notes,
            existingRec?.check_in || existingRec?.checkIn || existingRec?.check_in_time || existingRec?.checkInTime,
            existingRec?.check_out || existingRec?.checkOut || existingRec?.check_out_time || existingRec?.checkOutTime
          );
          const existingCheckIn = parsedExisting.checkIn;
          const existingBreakOut = parsedExisting.breakOut;
          const existingBreakIn = parsedExisting.breakIn;

          // Determine 4-stage action: Morning Check-In -> Mid-Day Break Out -> Break Return In -> Final Check-Out
          let actionType: 'checkin' | 'breakout' | 'breakin' | 'checkout' | 'duplicate' = 'checkin';
          if (punchMode !== 'auto') {
            actionType = punchMode;
          } else if (!existingCheckIn) {
            actionType = 'checkin';
          } else {
            let minsSinceLastPunch = 999;
            let lastIso = existingRec?.check_in_time || existingRec?.checkInTime || existingRec?.created_at;
            if (existingRec?.notes && typeof existingRec.notes === 'string' && existingRec.notes.startsWith('{')) {
              try {
                const p = JSON.parse(existingRec.notes);
                lastIso = p.lastPunchIso || p.isoBreakIn || p.isoBreakOut || p.isoCheckIn || lastIso;
              } catch {}
            }
            if (lastIso) {
              const lastDate = new Date(lastIso);
              if (!isNaN(lastDate.getTime())) {
                minsSinceLastPunch = (now.getTime() - lastDate.getTime()) / 60000;
              }
            }

            const nowTotalMins = now.getHours() * 60 + now.getMinutes();
            // Before 12:45 PM (765 mins), 2nd scan defaults to Mid-Day Break / Free-Period Out
            const isMidDayWindow = nowTotalMins < 12 * 60 + 45;

            if (minsSinceLastPunch < 3) {
              actionType = 'duplicate';
            } else if (parsedExisting.campusState === 'on_break' || (existingBreakOut && !existingBreakIn)) {
              actionType = 'breakin';
            } else if (!existingBreakOut && isMidDayWindow) {
              actionType = 'breakout';
            } else {
              actionType = 'checkout';
            }
          }

          await recordStaffStageAction(matchedStaff, actionType, bestScore, thumbDataUrl);

          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
          resetTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) setVerifiedCard(null);
          }, 4200);
        } else if (matchedStudent) {
          if (res.bmpBase64) {
            secugenService.saveFingerprintThumbnail(
              matchedStudent.id,
              res.bmpBase64,
              matchedStudent.collegeNo
            );
          }
          // Student Biometric Attendance
          const notesJson = JSON.stringify({
            checkIn: displayTime,
            isoCheckIn: now.toISOString(),
            method: 'biometric_fingerprint',
            Verify: `Biometric Thumb Verified (Score ${bestScore})`,
            notes: `Biometric Check-In at ${displayTime}`,
          });

          const basePayload = {
            id: `${matchedStudent.id}-${todayStr}`,
            student_id: matchedStudent.id,
            date: todayStr,
            status: 'Present',
            notes: notesJson,
          };
          if (isSupabaseConfigured) {
            const { error } = await supabase
              .from('student_attendance')
              .upsert([basePayload], { onConflict: 'id' });
            if (error) {
              await supabase
                .from('student_attendance')
                .upsert(
                  [
                    {
                      student_id: matchedStudent.id,
                      date: todayStr,
                      status: 'Present',
                      notes: notesJson,
                    },
                  ],
                  { onConflict: 'student_id,date' }
                );
            }
          }
          if (soundEnabled) playKioskSound('checkin');
          speakKioskAnnouncement(
            `Welcome ${matchedStudent.fullName}. Attendance marked at ${displayTime}.`,
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
            message: `Student Biometric Check-In Recorded at ${displayTime}!`,
            thumbBmp: thumbDataUrl,
          });
          sendAutoDailyAttendanceNoticeDetailed(
            matchedStudent,
            {
              date: todayStr,
              status: 'Present',
              checkInTime: displayTime,
              notes: notesJson,
            },
            settings,
            { silent: true }
          ).catch(() => {});
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
      recordStaffStageAction,
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
    let onBreak = 0;
    let checkedOut = 0;
    todayAttendance.forEach((a) => {
      const p = parseAttendanceNotesAndTime(
        a.notes,
        a.check_in || a.checkIn,
        a.check_out || a.checkOut
      );
      if (p.campusState === 'on_break' || (p.breakOut && !p.breakIn && !p.checkOut)) {
        onBreak++;
      }
      if (p.checkOut) {
        checkedOut++;
      }
    });
    const totalEnrolled = enrolledStaff.length;
    const pending = Math.max(0, staffList.length - (present + late));
    return { present, late, onBreak, checkedOut, totalEnrolled, pending };
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
                4-Stage Movement & Attendance Terminal
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Morning In • Mid-Day Break Out • Break Return In • Final Off-Duty Out
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

            {/* 4-Stage Punch Mode Selector */}
            <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-white/10 gap-0.5">
              <button
                type="button"
                onClick={() => setPunchMode('auto')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  punchMode === 'auto'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Smart 4-Stage Auto
              </button>
              <button
                type="button"
                onClick={() => setPunchMode('checkin')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  punchMode === 'checkin'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Morning In
              </button>
              <button
                type="button"
                onClick={() => setPunchMode('breakout')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  punchMode === 'breakout'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Break Out
              </button>
              <button
                type="button"
                onClick={() => setPunchMode('breakin')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  punchMode === 'breakin'
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Break Return
              </button>
              <button
                type="button"
                onClick={() => setPunchMode('checkout')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  punchMode === 'checkout'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Final Out
              </button>
            </div>
          </div>

          {/* Center Display: Either Verified Result Card OR Active Sensor Prompt */}
          <div className="my-auto py-6 flex flex-col items-center justify-center text-center min-h-[320px]">
            {verifiedCard ? (
              <div
                className={`w-full max-w-xl rounded-3xl p-5 sm:p-6 border-2 shadow-2xl transition-all animate-in zoom-in-95 duration-200 ${
                  verifiedCard.type === 'checkin' || verifiedCard.type === 'breakin'
                    ? 'bg-emerald-950/90 border-emerald-400 text-white'
                    : verifiedCard.type === 'breakout'
                    ? 'bg-amber-950/90 border-amber-400 text-white'
                    : verifiedCard.type === 'checkout'
                    ? 'bg-blue-950/90 border-blue-400 text-white'
                    : verifiedCard.type === 'duplicate'
                    ? 'bg-amber-950/90 border-amber-400 text-white'
                    : 'bg-rose-950/90 border-rose-500 text-white'
                }`}
              >
                {verifiedCard.person ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-18 h-18 rounded-2xl bg-white/10 border-2 border-white/30 overflow-hidden flex items-center justify-center text-2xl font-black shrink-0 shadow-lg">
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
                        <h3 className="text-xl sm:text-2xl font-black truncate">
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

                    <div className="p-3 rounded-2xl bg-black/30 border border-white/15 flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold">
                          Movement & Attendance Confirmation
                        </p>
                        <p className="text-xs sm:text-sm font-black text-emerald-300">
                          {verifiedCard.message}
                        </p>
                      </div>
                      <div className="text-right font-mono shrink-0 pl-2">
                        <p className="text-sm sm:text-base font-black text-amber-300">
                          {verifiedCard.punchTime}
                        </p>
                        <p className="text-[10px] text-white/60">
                          Match Score: {verifiedCard.score}
                        </p>
                      </div>
                    </div>

                    {/* 4-Stage Timeline Pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                      <div className="p-2 rounded-xl bg-black/25 border border-white/10">
                        <p className="text-[9px] uppercase font-bold text-white/60">1. Morning In</p>
                        <p className="text-xs font-mono font-black text-emerald-300">
                          {verifiedCard.checkIn || '—'}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-black/25 border border-white/10">
                        <p className="text-[9px] uppercase font-bold text-white/60">2. Break Out</p>
                        <p className="text-xs font-mono font-black text-amber-300">
                          {verifiedCard.breakOut || '—'}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-black/25 border border-white/10">
                        <p className="text-[9px] uppercase font-bold text-white/60">3. Break Return</p>
                        <p className="text-xs font-mono font-black text-teal-300">
                          {verifiedCard.breakIn || '—'}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-black/25 border border-white/10">
                        <p className="text-[9px] uppercase font-bold text-white/60">4. Final Out</p>
                        <p className="text-xs font-mono font-black text-sky-300">
                          {verifiedCard.checkOut || '—'}
                        </p>
                      </div>
                    </div>

                    {/* 1-Click Stage Override Buttons (in case teacher is leaving early or going on break) */}
                    {!String(verifiedCard.person.role || '').startsWith('Student') && (
                      <div className="pt-1 flex flex-wrap items-center justify-center gap-1.5">
                        <span className="text-[10px] text-white/70 font-bold mr-1">
                          Switch Action:
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            recordStaffStageAction(
                              verifiedCard.person,
                              'breakout',
                              verifiedCard.score || 150,
                              verifiedCard.thumbBmp
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 border border-amber-300/40 text-[10px] font-black text-amber-100 cursor-pointer"
                        >
                          Mark as Break / Free Out
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            recordStaffStageAction(
                              verifiedCard.person,
                              'breakin',
                              verifiedCard.score || 150,
                              verifiedCard.thumbBmp
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-teal-500/30 hover:bg-teal-500/50 border border-teal-300/40 text-[10px] font-black text-teal-100 cursor-pointer"
                        >
                          Mark as Break Return In
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            recordStaffStageAction(
                              verifiedCard.person,
                              'checkout',
                              verifiedCard.score || 150,
                              verifiedCard.thumbBmp
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-blue-500/30 hover:bg-blue-500/50 border border-blue-300/40 text-[10px] font-black text-blue-100 cursor-pointer"
                        >
                          Mark as Final Off-Duty Out
                        </button>
                      </div>
                    )}
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
                    Automatically records <strong>1. Morning In</strong> &rarr;{' '}
                    <strong>2. Break / Free-Period Out</strong> &rarr;{' '}
                    <strong>3. Break Return In</strong> &rarr; <strong>4. Final Out</strong>.
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4 border-t border-white/10">
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-white/10">
              <p className="text-[10px] font-bold uppercase text-slate-400">Enrolled</p>
              <p className="text-lg font-black text-emerald-400 mt-0.5">
                {stats.totalEnrolled} <span className="text-xs text-slate-500">/ {staffList.length}</span>
              </p>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-white/10">
              <p className="text-[10px] font-bold uppercase text-slate-400">Present</p>
              <p className="text-lg font-black text-white mt-0.5">{stats.present}</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-white/10">
              <p className="text-[10px] font-bold uppercase text-slate-400">Late</p>
              <p className="text-lg font-black text-amber-400 mt-0.5">{stats.late}</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-white/10">
              <p className="text-[10px] font-bold uppercase text-slate-400">On Break Out</p>
              <p className="text-lg font-black text-orange-400 mt-0.5">{stats.onBreak}</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-white/10">
              <p className="text-[10px] font-bold uppercase text-slate-400">Checked Out</p>
              <p className="text-lg font-black text-sky-400 mt-0.5">{stats.checkedOut}</p>
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): Live Today's Biometric Feed & Enrolled Staff Verification Roster */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-white/10 rounded-3xl p-6 flex flex-col justify-between max-h-[640px]">
          <div className="space-y-3 pb-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Live Faculty Movement Roster ({enrolledStaff.length} Enrolled)
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
              const parsedRow = rec
                ? parseAttendanceNotesAndTime(
                    rec.notes,
                    rec.check_in || rec.checkIn,
                    rec.check_out || rec.checkOut
                  )
                : { checkIn: '', breakOut: '', breakIn: '', checkOut: '', campusState: undefined, cleanRemarks: '' };
              const cin = parsedRow.checkIn;
              const bout = parsedRow.breakOut;
              const bin = parsedRow.breakIn;
              const cout = parsedRow.checkOut;
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
                            {rec.status} {cin ? `• In: ${cin}` : ''}
                          </span>
                        </span>
                        {bout && (
                          <p className="text-[10px] font-mono text-amber-300 font-bold">
                            Break: {bout} &rarr; {bin || 'Out Now'}
                          </p>
                        )}
                        {cout && (
                          <p className="text-[10px] font-mono text-sky-300 font-bold">
                            Final Out: {cout}
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
            <span>All Enrolled Staff Templates Verified in Cloud DB</span>
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
