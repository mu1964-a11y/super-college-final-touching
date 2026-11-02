import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { secugenService, BiometricCachedStaff, BestMatchResult } from '../lib/secugenService';
import { sendAutoStaffDailyCheckInNotice, parseAttendanceNotesAndTime } from '../lib/whatsappAutomation';
import { safeLocalStorage } from '../utils/safeStorage';
import { toast } from 'sonner';

export type BiometricStage = 'checkin' | 'breakout' | 'breakin' | 'checkout';
export type PunchMode = 'auto' | BiometricStage;

export interface LastMatchInfo {
  staff: BiometricCachedStaff;
  stage: BiometricStage;
  punchTime: string;
  score: number;
  margin: number;
  durationMs: number;
  thumbBmp?: string;
  previousRecord?: any;
  attendanceId: string;
}

export interface BiometricContextType {
  // Scanner Hardware Status
  scannerStatus: { connected: boolean; deviceFound: boolean; checking: boolean };
  refreshScannerStatus: (force?: boolean) => Promise<{ connected: boolean; deviceFound: boolean }>;
  isCapturing: boolean;

  // Auto-Scan Loop & Stage Mode
  isAutoScanActive: boolean;
  setIsAutoScanActive: React.Dispatch<React.SetStateAction<boolean>>;
  punchMode: PunchMode;
  setPunchMode: (mode: PunchMode) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;

  // In-Memory RAM Cache & Today Attendance
  staffRamCache: BiometricCachedStaff[];
  todayAttendance: any[];
  refreshStaffCache: () => Promise<void>;
  refreshTodayAttendance: () => Promise<void>;
  updateStaffTemplateInCache: (
    staffId: string,
    primaryTpl?: string | null,
    secondaryTpl?: string | null,
    combinedTpl?: string | null,
    primaryName?: string | null,
    secondaryName?: string | null
  ) => void;

  // Scanner Actions
  executeScanCycle: (manual?: boolean) => Promise<{ success: boolean; matched?: boolean; error?: string }>;
  recordStaffPunch: (
    staffId: string,
    stageAction: BiometricStage,
    options?: {
      score?: number;
      thumbBmp?: string;
      manualTime?: string;
      notes?: string;
      margin?: number;
      durationMs?: number;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  manualOverrideAttendance: (
    staffId: string,
    updates: {
      status?: string;
      morningIn?: string;
      breakOut?: string;
      breakIn?: string;
      finalOut?: string;
      notes?: string;
    }
  ) => Promise<boolean>;

  // Last Match & Undo
  lastMatch: LastMatchInfo | null;
  clearLastMatch: () => void;
  undoLastScan: () => Promise<boolean>;

  // WhatsApp Audit & Retries
  retryWhatsApp: (attendanceRecord: any, staffMember?: any) => Promise<boolean>;
  resendAllFailedWhatsApp: () => Promise<{ successCount: number; failCount: number }>;
  isRetryingWhatsApp: boolean;

  // Modal Triggers
  isBiometricDeskModalOpen: boolean;
  setIsBiometricDeskModalOpen: (open: boolean) => void;
  reEnrollModalStaff: BiometricCachedStaff | null;
  openReEnrollModal: (staff: BiometricCachedStaff) => void;
  closeReEnrollModal: () => void;

  // Helpers & Sound
  playSound: (type: 'checkin' | 'checkout' | 'duplicate' | 'error' | 'undo') => void;
  notifyScannerOnline: () => void;
  collegeStartTime: string;
  collegeEndTime: string;
  collegeGraceMinutes: number;
  updateDutyTiming: (start: string, end: string, graceMinutes: number) => Promise<boolean>;
}

const BiometricAttendanceContext = createContext<BiometricContextType | null>(null);

export function playKioskSound(type: 'checkin' | 'checkout' | 'duplicate' | 'error' | 'undo') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'checkin') {
      // Crisp 2-tone ascending chime (A5 -> E6)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1318.5, now + 0.11);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === 'checkout') {
      // Pleasant 2-tone completion chime (E6 -> C6)
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
    } else if (type === 'undo') {
      // Descending warning chime for undo
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(587.33, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Low buzz for unrecognized finger
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

export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTime12h(dateObj: Date): string {
  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatHHMM(dateObj: Date): string {
  return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
}

// Convert 12h or 24h string into total minutes since midnight
export function timeStringToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  // Check 12-hour format e.g. "07:45 AM"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = (match12[3] || '').toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return null;
}

// Calculate hours between check-in and check-out deducting break time if present
export function calculateWorkingHours(
  checkIn?: string | null,
  breakOut?: string | null,
  breakIn?: string | null,
  checkOut?: string | null
): number | null {
  const inMins = timeStringToMinutes(checkIn);
  const outMins = timeStringToMinutes(checkOut);
  if (inMins === null || outMins === null || outMins <= inMins) return null;

  let totalMins = outMins - inMins;
  const bOutMins = timeStringToMinutes(breakOut);
  const bInMins = timeStringToMinutes(breakIn);

  if (bOutMins !== null && bInMins !== null && bInMins > bOutMins) {
    const breakDuration = bInMins - bOutMins;
    totalMins = Math.max(0, totalMins - breakDuration);
  }

  const hours = totalMins / 60;
  return Math.round(hours * 100) / 100;
}

export function BiometricAttendanceProvider({ children }: { children: React.ReactNode }) {
  // Scanner state
  const [scannerStatus, setScannerStatus] = useState<{ connected: boolean; deviceFound: boolean; checking: boolean }>({
    connected: false,
    deviceFound: false,
    checking: false,
  });
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Kiosk & Stage Controls
  const [isAutoScanActive, setIsAutoScanActive] = useState<boolean>(false);
  const [punchMode, setPunchMode] = useState<PunchMode>('auto');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [collegeStartTime, setCollegeStartTime] = useState<string>('07:54');
  const [collegeEndTime, setCollegeEndTime] = useState<string>('14:00');
  const [collegeGraceMinutes, setCollegeGraceMinutes] = useState<number>(5);

  // In-Memory RAM Cache & Live Records
  const [staffRamCache, setStaffRamCache] = useState<BiometricCachedStaff[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);

  // Last Match & Undo
  const [lastMatch, setLastMatch] = useState<LastMatchInfo | null>(null);

  // Modal triggers
  const [isBiometricDeskModalOpen, setIsBiometricDeskModalOpen] = useState<boolean>(false);
  const [reEnrollModalStaff, setReEnrollModalStaff] = useState<BiometricCachedStaff | null>(null);

  // WhatsApp retry loading state
  const [isRetryingWhatsApp, setIsRetryingWhatsApp] = useState<boolean>(false);

  // Internal locks & cooldown map
  const isScanningLockRef = useRef<boolean>(false);
  const recentPunchesRef = useRef<Map<string, { timestamp: number; displayTime: string; stage: string }>>(new Map());
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // 1. Initial Load of In-Memory RAM Cache from Supabase
  const refreshStaffCache = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase.from('staff').select('*').order('id', { ascending: true });
      if (error || !data) return;

      const mapped: BiometricCachedStaff[] = data.map((st: any) => {
        let pTpl = st.primary_finger_template || null;
        let sTpl = st.secondary_finger_template || null;
        let fpTpl = st.fingerprint_template || st.fingerprintTemplate || null;
        const fpFinger = st.fingerprint_finger || st.fingerprintFinger || 'Right Thumb';

        // Check local vault fallback if DB template is missing
        if (!pTpl && !fpTpl) {
          try {
            const vault = safeLocalStorage.getItem(`scj_fp_vault_${st.id}`);
            if (vault) {
              const parsed = JSON.parse(vault);
              if (parsed?.template) fpTpl = parsed.template;
            }
          } catch {}
        }

        // Count enrolled fingers
        let count = 0;
        if (pTpl && pTpl.trim().length > 20) count++;
        if (sTpl && sTpl.trim().length > 20) count++;
        if (count === 0 && fpTpl && fpTpl.trim().length > 20) {
          count = secugenService.extractEnrolledFingers(fpTpl, fpFinger).length || 1;
        }

        return {
          id: st.id,
          fullName: st.full_name || st.fullName || 'Staff Member',
          role: st.role || st.designation || 'Faculty',
          designation: st.designation || st.role || 'Faculty',
          photo: st.photo_url || st.photo,
          contact: st.contact || st.phone || '',
          primaryFingerTemplate: pTpl,
          primaryFingerName: st.primary_finger_name || 'Right Thumb',
          secondaryFingerTemplate: sTpl,
          secondaryFingerName: st.secondary_finger_name || 'Right Index',
          fingerprintTemplate: fpTpl,
          fingerprintFinger: fpFinger,
          enrolledFingersCount: count,
        };
      });

      setStaffRamCache(mapped);
    } catch (err) {
      console.error('Failed to load biometric staff RAM cache:', err);
    }
  }, []);

  // 2. Initial Load of Today's Attendance
  const refreshTodayAttendance = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const todayStr = getTodayDateStr();
      const { data, error } = await supabase.from('staff_attendance').select('*').eq('date', todayStr);
      if (!error && data) {
        setTodayAttendance(data);
      }
    } catch (err) {
      console.error('Failed to load today staff attendance:', err);
    }
  }, []);

  // 3. Check SecuGen Hardware Connection
  const refreshScannerStatus = useCallback(async (force = false) => {
    try {
      setScannerStatus((prev) => ({ ...prev, checking: true }));
      const st = await secugenService.getStatus(force);
      const res = { connected: !!st.connected, deviceFound: !!st.deviceFound };
      setScannerStatus({ ...res, checking: false });
      return res;
    } catch {
      const res = { connected: false, deviceFound: false };
      setScannerStatus({ ...res, checking: false });
      return res;
    }
  }, []);

  // 4. Load Settings (Duty Timings & Cutoff)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from('settings')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.config) {
          if (data.config.collegeStartTime) setCollegeStartTime(data.config.collegeStartTime);
          if (data.config.collegeEndTime) setCollegeEndTime(data.config.collegeEndTime);
          if (data.config.collegeGraceMinutes !== undefined) setCollegeGraceMinutes(Number(data.config.collegeGraceMinutes));
        }
      })
      .catch(() => {});
  }, []);

  // 4b. Continuous Background Scanner Status Polling (Self-Healing)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;
      try {
        const res = await secugenService.getStatus(false);
        if (isMounted) {
          setScannerStatus({ connected: !!res.connected, deviceFound: !!res.deviceFound, checking: false });
        }
      } catch {}

      if (isMounted) {
        // Fast 4s poll if scanner is offline/unplugged, 25s check if connected
        const interval = scannerStatus.connected && scannerStatus.deviceFound ? 25000 : 4000;
        timer = setTimeout(poll, interval);
      }
    };

    timer = setTimeout(poll, 1500);
    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [scannerStatus.connected, scannerStatus.deviceFound]);

  // 5. Setup BroadcastChannel and Supabase Realtime Subscription for Instant Sync
  useEffect(() => {
    refreshStaffCache();
    refreshTodayAttendance();
    refreshScannerStatus();

    // BroadcastChannel for instant multi-tab & multi-view sync
    try {
      const bc = new BroadcastChannel('scj_biometric_sync');
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        const msg = event.data;
        if (!msg || !msg.type) return;

        if (msg.type === 'PUNCH_RECORDED' && msg.attendanceRecord) {
          setTodayAttendance((prev) => {
            const rec = msg.attendanceRecord;
            const staffId = rec.staff_id || rec.staffId;
            const idx = prev.findIndex((a) => (a.staff_id || a.staffId) === staffId && a.date === rec.date);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = { ...copy[idx], ...rec };
              return copy;
            }
            return [...prev, rec];
          });
          if (msg.lastMatch) {
            setLastMatch(msg.lastMatch);
          }
        } else if (msg.type === 'UNDO_PUNCH') {
          if (msg.restoredRecord) {
            setTodayAttendance((prev) =>
              prev.map((a) => ((a.staff_id || a.staffId) === msg.staffId && a.date === msg.restoredRecord.date ? msg.restoredRecord : a))
            );
          } else {
            setTodayAttendance((prev) => prev.filter((a) => (a.staff_id || a.staffId) !== msg.staffId || a.date !== msg.date));
          }
          setLastMatch(null);
        } else if (msg.type === 'CACHE_UPDATED') {
          refreshStaffCache();
        } else if (msg.type === 'SCANNER_STATUS') {
          setScannerStatus({ connected: !!msg.connected, deviceFound: !!msg.deviceFound, checking: false });
        } else if (msg.type === 'DUTY_TIMING_UPDATED') {
          if (msg.collegeStartTime) setCollegeStartTime(msg.collegeStartTime);
          if (msg.collegeEndTime) setCollegeEndTime(msg.collegeEndTime);
          if (msg.collegeGraceMinutes !== undefined) setCollegeGraceMinutes(msg.collegeGraceMinutes);
        }
      };
    } catch {}

    // Supabase Realtime Subscription on staff_attendance table
    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        const todayStr = getTodayDateStr();
        channel = supabase
          .channel('public:staff_attendance_live')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'staff_attendance' },
            (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const rec = payload.new;
                if (rec.date === todayStr) {
                  setTodayAttendance((prev) => {
                    const staffId = rec.staff_id || rec.staffId;
                    const idx = prev.findIndex((a) => (a.staff_id || a.staffId) === staffId && a.date === rec.date);
                    if (idx >= 0) {
                      const copy = [...prev];
                      copy[idx] = { ...copy[idx], ...rec };
                      return copy;
                    }
                    return [...prev, rec];
                  });
                }
              } else if (payload.eventType === 'DELETE') {
                const oldRec = payload.old;
                if (oldRec?.id) {
                  setTodayAttendance((prev) => prev.filter((a) => a.id !== oldRec.id));
                }
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Supabase Realtime subscription error:', err);
      }
    }

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [refreshStaffCache, refreshTodayAttendance, refreshScannerStatus]);

  // 6. Update individual staff templates in local RAM cache and notify other tabs
  const updateStaffTemplateInCache = useCallback(
    (
      staffId: string,
      primaryTpl?: string | null,
      secondaryTpl?: string | null,
      combinedTpl?: string | null,
      primaryName?: string | null,
      secondaryName?: string | null
    ) => {
      setStaffRamCache((prev) =>
        prev.map((st) => {
          if (st.id !== staffId) return st;
          let count = 0;
          if (primaryTpl && primaryTpl.trim().length > 20) count++;
          if (secondaryTpl && secondaryTpl.trim().length > 20) count++;
          if (count === 0 && combinedTpl && combinedTpl.trim().length > 20) {
            count = secugenService.extractEnrolledFingers(combinedTpl).length || 1;
          }

          return {
            ...st,
            primaryFingerTemplate: primaryTpl ?? st.primaryFingerTemplate,
            primaryFingerName: primaryName ?? st.primaryFingerName,
            secondaryFingerTemplate: secondaryTpl ?? st.secondaryFingerTemplate,
            secondaryFingerName: secondaryName ?? st.secondaryFingerName,
            fingerprintTemplate: combinedTpl ?? st.fingerprintTemplate,
            enrolledFingersCount: count,
          };
        })
      );

      // Broadcast to other tabs
      try {
        broadcastChannelRef.current?.postMessage({ type: 'CACHE_UPDATED', staffId });
      } catch {}
    },
    []
  );

  // 7. Core Function: Record a Staff Movement Punch
  const recordStaffPunch = useCallback(
    async (
      staffId: string,
      stageAction: BiometricStage,
      options: {
        score?: number;
        thumbBmp?: string;
        manualTime?: string;
        notes?: string;
        margin?: number;
        durationMs?: number;
      } = {}
    ): Promise<{ success: boolean; error?: string }> => {
      const staffMember = staffRamCache.find((s) => s.id === staffId);
      if (!staffMember) {
        return { success: false, error: 'Staff member not found in RAM cache' };
      }

      const now = new Date();
      const todayStr = getTodayDateStr();
      const displayTime = options.manualTime || formatTime12h(now);
      const score = options.score || 150;
      const margin = options.margin || 25;
      const durationMs = options.durationMs || 10;

      // Find existing today record
      const existingRec = todayAttendance.find(
        (r: any) => (r.staff_id || r.staffId) === staffId && r.date === todayStr
      );

      // Parse existing fields
      const parsedExisting = parseAttendanceNotesAndTime(
        existingRec?.notes,
        existingRec?.morning_in || existingRec?.check_in || existingRec?.checkIn,
        existingRec?.final_out || existingRec?.check_out || existingRec?.checkOut
      );

      let morningIn = existingRec?.morning_in || parsedExisting.checkIn || null;
      let breakOut = existingRec?.break_out || parsedExisting.breakOut || null;
      let breakIn = existingRec?.break_in || parsedExisting.breakIn || null;
      let finalOut = existingRec?.final_out || parsedExisting.checkOut || null;

      // Apply the stage punch
      if (stageAction === 'checkin') {
        morningIn = displayTime;
      } else if (stageAction === 'breakout') {
        breakOut = displayTime;
      } else if (stageAction === 'breakin') {
        breakIn = displayTime;
      } else if (stageAction === 'checkout') {
        finalOut = displayTime;
      }

      // Compute status based on arrival time vs (collegeStartTime + graceMinutes)
      let status = existingRec?.status || 'Present';
      if (morningIn) {
        const inMins = timeStringToMinutes(morningIn);
        const cutMins = (timeStringToMinutes(collegeStartTime) ?? (7 * 60 + 54)) + (collegeGraceMinutes ?? 5);
        if (inMins !== null && inMins > cutMins) {
          status = 'Late';
        } else if (status === 'Absent' || !existingRec?.status) {
          status = 'Present';
        }
      }

      // Compute total working hours
      const totalHours = calculateWorkingHours(morningIn, breakOut, breakIn, finalOut);

      // Build structured JSON notes for backward compatibility
      const notesPayload = {
        checkIn: morningIn,
        breakOut: breakOut,
        breakIn: breakIn,
        checkOut: finalOut,
        totalHours: totalHours,
        campusState: finalOut ? 'checked_out' : breakOut && !breakIn ? 'on_break' : 'in_campus',
        method: 'secugen_hu20_biometric',
        matchScore: score,
        runnerUpMargin: margin,
        matchDurationMs: durationMs,
        lastPunchTime: displayTime,
        lastStage: stageAction,
        operatorNotes: options.notes || existingRec?.operator_notes || '',
      };

      const recordId = existingRec?.id || `${staffId}-${todayStr}`;

      const updatedRecord: any = {
        id: recordId,
        staff_id: staffId,
        date: todayStr,
        status,
        morning_in: morningIn,
        break_out: breakOut,
        break_in: breakIn,
        final_out: finalOut,
        check_in: morningIn, // legacy column
        check_out: finalOut, // legacy column
        total_hours: totalHours,
        match_score: score,
        stage: stageAction,
        operator_notes: options.notes || existingRec?.operator_notes || '',
        notes: JSON.stringify(notesPayload),
        verification_method: 'secugen_fingerprint',
        whatsapp_status: existingRec?.whatsapp_status || 'pending',
        whatsapp_sent_at: existingRec?.whatsapp_sent_at || null,
        whatsapp_error: null,
      };

      // 1. Optimistic UI update in RAM
      setTodayAttendance((prev) => {
        const idx = prev.findIndex((a) => (a.staff_id || a.staffId) === staffId && a.date === todayStr);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updatedRecord;
          return copy;
        }
        return [...prev, updatedRecord];
      });

      // Update Last Match Info
      const matchInfo: LastMatchInfo = {
        staff: staffMember,
        stage: stageAction,
        punchTime: displayTime,
        score,
        margin,
        durationMs,
        thumbBmp: options.thumbBmp,
        previousRecord: existingRec ? { ...existingRec } : null,
        attendanceId: recordId,
      };
      setLastMatch(matchInfo);

      // Play audio feedback
      if (soundEnabled) {
        if (stageAction === 'checkout') {
          playKioskSound('checkout');
        } else {
          playKioskSound('checkin');
        }
      }

      // Broadcast immediately across tabs
      try {
        broadcastChannelRef.current?.postMessage({
          type: 'PUNCH_RECORDED',
          attendanceRecord: updatedRecord,
          lastMatch: matchInfo,
        });
      } catch {}

      // 2. Background Asynchronous Save to Supabase
      if (isSupabaseConfigured) {
        try {
          const { error: upsertErr } = await supabase
            .from('staff_attendance')
            .upsert([updatedRecord], { onConflict: 'id' });

          if (upsertErr) {
            console.error('Supabase attendance upsert failed, retrying on (staff_id, date):', upsertErr);
            await supabase
              .from('staff_attendance')
              .upsert([updatedRecord], { onConflict: 'staff_id,date' });
          }
        } catch (dbErr) {
          console.error('Background DB write error:', dbErr);
        }
      }

      // 3. WhatsApp Notification Trigger (Asynchronous background dispatch)
      const stageLabels: Record<BiometricStage, string> = {
        checkin: 'Morning Check-In',
        breakout: 'Break / Free Period Out',
        breakin: 'Break Return In',
        checkout: 'Final Off-Duty Out',
      };

      sendAutoStaffDailyCheckInNotice(
        staffMember,
        {
          date: todayStr,
          status,
          checkInTime: morningIn || undefined,
          breakOutTime: breakOut || undefined,
          breakInTime: breakIn || undefined,
          checkOutTime: finalOut || undefined,
          punchEventLabel: stageLabels[stageAction],
          notes: updatedRecord.notes,
        },
        { silent: true }
      )
        .then(async (waSuccess) => {
          const waStatus = waSuccess ? 'sent' : 'failed';
          const sentAt = waSuccess ? new Date().toISOString() : null;
          const waErr = waSuccess ? null : 'Failed to reach WhatsApp recipient or service offline';

          // Update local state
          setTodayAttendance((prev) =>
            prev.map((a) =>
              (a.staff_id || a.staffId) === staffId && a.date === todayStr
                ? { ...a, whatsapp_status: waStatus, whatsapp_sent_at: sentAt, whatsapp_error: waErr }
                : a
            )
          );

          // Update Supabase
          if (isSupabaseConfigured) {
            await supabase
              .from('staff_attendance')
              .update({
                whatsapp_status: waStatus,
                whatsapp_sent_at: sentAt,
                whatsapp_error: waErr,
              })
              .eq('id', recordId);
          }
        })
        .catch((err) => {
          console.error('WhatsApp dispatch error:', err);
        });

      return { success: true };
    },
    [staffRamCache, todayAttendance, collegeStartTime, soundEnabled]
  );

  // 8. Core Function: Execute a Single Scan Cycle with 1:N RAM Best-Match (5-20ms)
  const executeScanCycle = useCallback(
    async (manual = false): Promise<{ success: boolean; matched?: boolean; error?: string }> => {
      if (isScanningLockRef.current) {
        return { success: false, error: 'Scanner busy' };
      }

      // Check if any staff are enrolled
      const enrolledStaff = staffRamCache.filter(
        (s) => (s.primaryFingerTemplate && s.primaryFingerTemplate.length > 20) ||
               (s.secondaryFingerTemplate && s.secondaryFingerTemplate.length > 20) ||
               (s.fingerprintTemplate && s.fingerprintTemplate.length > 20)
      );

      if (enrolledStaff.length === 0) {
        return { success: false, error: 'No enrolled faculty fingerprints in database' };
      }

      isScanningLockRef.current = true;
      setIsCapturing(true);

      try {
        // High quality capture: timeout 7s for auto, 10s for manual
        const cap = await secugenService.captureFingerprint({
          timeoutMs: manual ? 10000 : 7000,
          quality: 50,
        });

        if (!cap.success || !cap.templateBase64) {
          setScannerStatus((prev) => ({ ...prev, connected: true, deviceFound: true }));
          return { success: false, error: cap.error || 'Scan timed out' };
        }

        setScannerStatus({ connected: true, deviceFound: true, checking: false });

        // Instant RAM 1:N Best-Match (Evaluates ALL candidates, enforces score >= 135 and margin >= 15)
        const matchResult: BestMatchResult = secugenService.match1toNBestMatch(
          cap.templateBase64,
          enrolledStaff,
          { minScore: 135, minMargin: 15 }
        );

        if (!matchResult.matched || !matchResult.candidate) {
          if (soundEnabled) playKioskSound('error');

          if (matchResult.isAmbiguous) {
            toast.warning('Ambiguous Scan Detected', {
              description: `Score: ${matchResult.score}, but runner-up is too close (margin ${matchResult.margin}). Please place finger squarely.`,
            });
          } else if (matchResult.score >= 85) {
            toast.warning('Borderline Fingerprint Score', {
              description: `Score ${matchResult.score}/199 (requires 135). Please center your finger firmly on sensor.`,
            });
          }

          return { success: true, matched: false, error: matchResult.error };
        }

        const matchedTeacher = matchResult.candidate;

        // 5-Minute Anti-Bounce & Cooldown Check
        const lastPunch = recentPunchesRef.current.get(matchedTeacher.id);
        const nowMs = Date.now();
        const COOLDOWN_MS = 5 * 60 * 1000;

        if (lastPunch && nowMs - lastPunch.timestamp < COOLDOWN_MS) {
          if (soundEnabled) playKioskSound('duplicate');
          toast.info(`${matchedTeacher.fullName} Already Marked`, {
            description: `Already recorded at ${lastPunch.displayTime}. Cooldown active.`,
          });
          return { success: true, matched: true };
        }

        // Determine 4-stage action
        const todayStr = getTodayDateStr();
        const existingRec = todayAttendance.find(
          (r: any) => (r.staff_id || r.staffId) === matchedTeacher.id && r.date === todayStr
        );
        const parsed = parseAttendanceNotesAndTime(
          existingRec?.notes,
          existingRec?.morning_in || existingRec?.check_in,
          existingRec?.final_out || existingRec?.check_out
        );

        let stageAction: BiometricStage = 'checkin';
        if (punchMode !== 'auto') {
          stageAction = punchMode;
        } else if (!parsed.checkIn && !existingRec?.morning_in) {
          stageAction = 'checkin';
        } else if (parsed.campusState === 'on_break' || (parsed.breakOut && !parsed.breakIn)) {
          stageAction = 'breakin';
        } else {
          const nowHour = new Date().getHours();
          const nowMin = new Date().getMinutes();
          const minsNow = nowHour * 60 + nowMin;
          // Before 12:45 PM (765 mins), 2nd punch is Break Out; afternoon punch is Final Check-Out
          if (minsNow < 12 * 60 + 45 && !parsed.breakOut) {
            stageAction = 'breakout';
          } else {
            stageAction = 'checkout';
          }
        }

        // Save thumb image to local storage
        if (cap.bmpBase64) {
          secugenService.saveFingerprintThumbnail(matchedTeacher.id, cap.bmpBase64);
        }

        // Record punch
        await recordStaffPunch(matchedTeacher.id, stageAction, {
          score: matchResult.score,
          margin: matchResult.margin,
          durationMs: matchResult.durationMs,
          thumbBmp: cap.bmpDataUrl || (cap.bmpBase64 ? `data:image/bmp;base64,${cap.bmpBase64}` : undefined),
        });

        // Update anti-bounce map
        const now = new Date();
        recentPunchesRef.current.set(matchedTeacher.id, {
          timestamp: nowMs,
          displayTime: formatTime12h(now),
          stage: stageAction,
        });

        toast.success(`Biometric Punch Verified: ${matchedTeacher.fullName}`, {
          description: `Stage: ${stageAction.toUpperCase()} • Score: ${matchResult.score}/199 • Matched in ${matchResult.durationMs}ms`,
        });

        return { success: true, matched: true };
      } finally {
        setIsCapturing(false);
        isScanningLockRef.current = false;
      }
    },
    [staffRamCache, todayAttendance, punchMode, soundEnabled, recordStaffPunch]
  );

  // 9. Continuous Zero-Click Auto-Scan Loop
  useEffect(() => {
    let loopTimer: NodeJS.Timeout | null = null;
    let isActive = true;

    const runAutoLoop = async () => {
      if (!isActive) return;

      // Only run auto loop if enabled, scanner connected, not in modal re-enrollment, and not busy
      if (
        isAutoScanActive &&
        scannerStatus.connected &&
        scannerStatus.deviceFound &&
        !isScanningLockRef.current &&
        !reEnrollModalStaff
      ) {
        await executeScanCycle(false);
      }

      if (isActive && isAutoScanActive && !reEnrollModalStaff) {
        // 600ms breather before checking for the next finger
        loopTimer = setTimeout(runAutoLoop, 600);
      }
    };

    if (isAutoScanActive && !reEnrollModalStaff) {
      loopTimer = setTimeout(runAutoLoop, 400);
    }

    return () => {
      isActive = false;
      if (loopTimer) clearTimeout(loopTimer);
    };
  }, [isAutoScanActive, scannerStatus.connected, scannerStatus.deviceFound, reEnrollModalStaff, executeScanCycle]);

  // 10. Undo Last Scan Action
  const undoLastScan = useCallback(async (): Promise<boolean> => {
    if (!lastMatch) {
      toast.error('No recent biometric scan to undo');
      return false;
    }

    const { staff, attendanceId, previousRecord } = lastMatch;
    const todayStr = getTodayDateStr();

    try {
      if (previousRecord) {
        // Rollback to previous state
        setTodayAttendance((prev) =>
          prev.map((a) => (a.id === attendanceId ? { ...previousRecord } : a))
        );

        if (isSupabaseConfigured) {
          await supabase.from('staff_attendance').upsert([previousRecord], { onConflict: 'id' });
        }

        try {
          broadcastChannelRef.current?.postMessage({
            type: 'UNDO_PUNCH',
            staffId: staff.id,
            date: todayStr,
            restoredRecord: previousRecord,
          });
        } catch {}
      } else {
        // There was no prior record for today, delete the newly created one
        setTodayAttendance((prev) => prev.filter((a) => a.id !== attendanceId));

        if (isSupabaseConfigured) {
          await supabase.from('staff_attendance').delete().eq('id', attendanceId);
        }

        try {
          broadcastChannelRef.current?.postMessage({
            type: 'UNDO_PUNCH',
            staffId: staff.id,
            date: todayStr,
            restoredRecord: null,
          });
        } catch {}
      }

      // Clear cooldown for this teacher so they can scan again immediately
      recentPunchesRef.current.delete(staff.id);
      setLastMatch(null);

      if (soundEnabled) playKioskSound('undo');
      toast.info(`Attendance Scan Undone for ${staff.fullName}`);
      return true;
    } catch (err) {
      console.error('Failed to undo last scan:', err);
      toast.error('Failed to undo scan');
      return false;
    }
  }, [lastMatch, soundEnabled]);

  // 11. Manual Operator Override
  const manualOverrideAttendance = useCallback(
    async (
      staffId: string,
      updates: {
        status?: string;
        morningIn?: string;
        breakOut?: string;
        breakIn?: string;
        finalOut?: string;
        notes?: string;
      }
    ): Promise<boolean> => {
      const todayStr = getTodayDateStr();
      const existingRec = todayAttendance.find(
        (r: any) => (r.staff_id || r.staffId) === staffId && r.date === todayStr
      );

      const morningIn = updates.morningIn !== undefined ? updates.morningIn : existingRec?.morning_in || null;
      const breakOut = updates.breakOut !== undefined ? updates.breakOut : existingRec?.break_out || null;
      const breakIn = updates.breakIn !== undefined ? updates.breakIn : existingRec?.break_in || null;
      const finalOut = updates.finalOut !== undefined ? updates.finalOut : existingRec?.final_out || null;
      let status = updates.status !== undefined ? updates.status : existingRec?.status || 'Present';
      if (updates.status === undefined && updates.morningIn !== undefined && updates.morningIn) {
        const arrivalMins = timeStringToMinutes(updates.morningIn);
        const cutMins = (timeStringToMinutes(collegeStartTime) ?? (7 * 60 + 54)) + (collegeGraceMinutes ?? 5);
        if (arrivalMins !== null && !['Absent', 'Personal Leave', 'College Holiday', 'Public Holiday'].includes(status)) {
          status = arrivalMins > cutMins ? 'Late' : 'Present';
        }
      }
      const notes = updates.notes !== undefined ? updates.notes : existingRec?.operator_notes || '';

      const totalHours = calculateWorkingHours(morningIn, breakOut, breakIn, finalOut);
      const recordId = existingRec?.id || `${staffId}-${todayStr}`;

      const notesPayload = {
        checkIn: morningIn,
        breakOut,
        breakIn,
        checkOut: finalOut,
        totalHours,
        campusState: finalOut ? 'checked_out' : breakOut && !breakIn ? 'on_break' : 'in_campus',
        method: 'manual_override',
        operatorNotes: notes,
      };

      const updatedRecord: any = {
        id: recordId,
        staff_id: staffId,
        date: todayStr,
        status,
        morning_in: morningIn,
        break_out: breakOut,
        break_in: breakIn,
        final_out: finalOut,
        check_in: morningIn,
        check_out: finalOut,
        total_hours: totalHours,
        operator_notes: notes,
        notes: JSON.stringify(notesPayload),
        verification_method: existingRec?.verification_method || 'manual',
        whatsapp_status: existingRec?.whatsapp_status || 'pending',
        whatsapp_sent_at: existingRec?.whatsapp_sent_at || null,
        whatsapp_error: existingRec?.whatsapp_error || null,
      };

      // Optimistic RAM state update
      setTodayAttendance((prev) => {
        const idx = prev.findIndex((a) => (a.staff_id || a.staffId) === staffId && a.date === todayStr);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updatedRecord;
          return copy;
        }
        return [...prev, updatedRecord];
      });

      // Broadcast
      try {
        broadcastChannelRef.current?.postMessage({
          type: 'PUNCH_RECORDED',
          attendanceRecord: updatedRecord,
        });
      } catch {}

      // Supabase write
      if (isSupabaseConfigured) {
        try {
          await supabase.from('staff_attendance').upsert([updatedRecord], { onConflict: 'id' });
        } catch (err) {
          console.error('Failed to save manual override:', err);
          return false;
        }
      }

      toast.success('Attendance record updated');
      return true;
    },
    [todayAttendance]
  );

  // 12. WhatsApp Retry & Batch Queue
  const retryWhatsApp = useCallback(
    async (attendanceRecord: any, staffMember?: any): Promise<boolean> => {
      if (!attendanceRecord) return false;
      const staffId = attendanceRecord.staff_id || attendanceRecord.staffId;
      const targetStaff = staffMember || staffRamCache.find((s) => s.id === staffId);
      if (!targetStaff) {
        toast.error('Staff contact details not found');
        return false;
      }

      setIsRetryingWhatsApp(true);
      try {
        const stageLabels: Record<string, string> = {
          checkin: 'Morning Check-In',
          breakout: 'Break Out',
          breakin: 'Break Return In',
          checkout: 'Final Out',
        };

        const res = await sendAutoStaffDailyCheckInNotice(
          targetStaff,
          {
            date: attendanceRecord.date,
            status: attendanceRecord.status,
            checkInTime: attendanceRecord.morning_in || attendanceRecord.check_in,
            breakOutTime: attendanceRecord.break_out,
            breakInTime: attendanceRecord.break_in,
            checkOutTime: attendanceRecord.final_out || attendanceRecord.check_out,
            punchEventLabel: stageLabels[attendanceRecord.stage || 'checkin'] || 'Attendance Punch',
            notes: attendanceRecord.notes,
          },
          { silent: false }
        );

        const waStatus = res ? 'sent' : 'failed';
        const sentAt = res ? new Date().toISOString() : null;
        const waErr = res ? null : 'Failed to deliver message via WhatsApp gateway';

        // Update local state
        setTodayAttendance((prev) =>
          prev.map((a) =>
            a.id === attendanceRecord.id
              ? { ...a, whatsapp_status: waStatus, whatsapp_sent_at: sentAt, whatsapp_error: waErr }
              : a
          )
        );

        // Update Supabase
        if (isSupabaseConfigured) {
          await supabase
            .from('staff_attendance')
            .update({
              whatsapp_status: waStatus,
              whatsapp_sent_at: sentAt,
              whatsapp_error: waErr,
            })
            .eq('id', attendanceRecord.id);
        }

        if (res) {
          toast.success(`WhatsApp delivered to ${targetStaff.fullName}`);
        } else {
          toast.error(`WhatsApp delivery failed for ${targetStaff.fullName}`);
        }

        return res;
      } finally {
        setIsRetryingWhatsApp(false);
      }
    },
    [staffRamCache]
  );

  // Batch Retry all failed WhatsApp messages for today
  const resendAllFailedWhatsApp = useCallback(async (): Promise<{ successCount: number; failCount: number }> => {
    const failedRecords = todayAttendance.filter(
      (a) => a.whatsapp_status === 'failed' || (!a.whatsapp_status && a.status !== 'Absent')
    );

    if (failedRecords.length === 0) {
      toast.info('No failed WhatsApp notices to resend');
      return { successCount: 0, failCount: 0 };
    }

    setIsRetryingWhatsApp(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const rec of failedRecords) {
        const staff = staffRamCache.find((s) => s.id === (rec.staff_id || rec.staffId));
        if (!staff || !staff.contact) {
          failCount++;
          continue;
        }

        const ok = await retryWhatsApp(rec, staff);
        if (ok) {
          successCount++;
        } else {
          failCount++;
        }

        // Brief delay between calls to prevent rate limiting
        await new Promise((r) => setTimeout(r, 450));
      }

      toast.info(`WhatsApp Batch Complete: ${successCount} sent, ${failCount} failed`);
      return { successCount, failCount };
    } finally {
      setIsRetryingWhatsApp(false);
    }
  }, [todayAttendance, staffRamCache, retryWhatsApp]);

  // 12b. Notify Scanner Online (Instant Event from Kiosk / Successful Capture)
  const notifyScannerOnline = useCallback(() => {
    secugenService.notifyScannerOnline();
    setScannerStatus({ connected: true, deviceFound: true, checking: false });
    try {
      broadcastChannelRef.current?.postMessage({
        type: 'SCANNER_STATUS',
        connected: true,
        deviceFound: true,
      });
    } catch {}
  }, []);

  // 12c. Custom Duty Timing Allotment & Late Calculation Setting
  const updateDutyTiming = useCallback(
    async (start: string, end: string, grace: number): Promise<boolean> => {
      setCollegeStartTime(start);
      setCollegeEndTime(end);
      setCollegeGraceMinutes(grace);

      const cutMins = (timeStringToMinutes(start) ?? 7 * 60 + 54) + grace;

      // Optimistically update today's attendance statuses based on new cutoff!
      setTodayAttendance((prev) =>
        prev.map((rec) => {
          if (!rec.morning_in) return rec;
          if (['Absent', 'Personal Leave', 'College Holiday', 'Public Holiday'].includes(rec.status)) return rec;
          const arrivalMins = timeStringToMinutes(rec.morning_in);
          if (arrivalMins === null) return rec;
          const newStatus = arrivalMins > cutMins ? 'Late' : 'Present';
          return { ...rec, status: newStatus };
        })
      );

      // Save to Supabase settings table
      if (isSupabaseConfigured) {
        try {
          const { data: currentSettings } = await supabase.from('settings').select('*').limit(1).maybeSingle();
          const prevConfig = currentSettings?.config || {};
          const nextConfig = {
            ...prevConfig,
            collegeStartTime: start,
            collegeEndTime: end,
            collegeGraceMinutes: grace,
          };

          if (currentSettings?.id) {
            await supabase.from('settings').update({ config: nextConfig }).eq('id', currentSettings.id);
          } else {
            await supabase.from('settings').insert([{ config: nextConfig }]);
          }

          // Recalculate today's staff_attendance in Supabase
          const todayStr = getTodayDateStr();
          const { data: todayDbRecords } = await supabase.from('staff_attendance').select('*').eq('date', todayStr);
          if (todayDbRecords && todayDbRecords.length > 0) {
            for (const r of todayDbRecords) {
              const mIn = r.morning_in || (r.check_in && r.check_in !== '08:00' ? r.check_in : null);
              if (mIn && !['Absent', 'Personal Leave', 'College Holiday', 'Public Holiday'].includes(r.status)) {
                const arr = timeStringToMinutes(mIn);
                if (arr !== null) {
                  const newStatus = arr > cutMins ? 'Late' : 'Present';
                  if (newStatus !== r.status) {
                    await supabase.from('staff_attendance').update({ status: newStatus }).eq('id', r.id);
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error('Failed to persist duty timings:', err);
        }
      }

      // Broadcast update across tabs
      try {
        broadcastChannelRef.current?.postMessage({
          type: 'DUTY_TIMING_UPDATED',
          collegeStartTime: start,
          collegeEndTime: end,
          collegeGraceMinutes: grace,
        });
      } catch {}

      toast.success('Official Duty Timings Updated', {
        description: `Duty Start: ${start} • Grace: ${grace}m (Late Cutoff: ${Math.floor(cutMins / 60).toString().padStart(2, '0')}:${(cutMins % 60).toString().padStart(2, '0')}) • Duty Off: ${end}`,
      });
      return true;
    },
    []
  );

  // 13. Re-Enrollment Modal Controls
  const openReEnrollModal = useCallback((staff: BiometricCachedStaff) => {
    setIsAutoScanActive(false); // Pause auto loop
    setReEnrollModalStaff(staff);
  }, []);

  const closeReEnrollModal = useCallback(() => {
    setReEnrollModalStaff(null);
  }, []);

  const value = useMemo(
    () => ({
      scannerStatus,
      refreshScannerStatus,
      isCapturing,
      isAutoScanActive,
      setIsAutoScanActive,
      punchMode,
      setPunchMode,
      soundEnabled,
      setSoundEnabled,
      staffRamCache,
      todayAttendance,
      refreshStaffCache,
      refreshTodayAttendance,
      updateStaffTemplateInCache,
      executeScanCycle,
      recordStaffPunch,
      manualOverrideAttendance,
      lastMatch,
      clearLastMatch: () => setLastMatch(null),
      undoLastScan,
      retryWhatsApp,
      resendAllFailedWhatsApp,
      isRetryingWhatsApp,
      isBiometricDeskModalOpen,
      setIsBiometricDeskModalOpen,
      reEnrollModalStaff,
      openReEnrollModal,
      closeReEnrollModal,
      playSound: playKioskSound,
      notifyScannerOnline,
      collegeStartTime,
      collegeEndTime,
      collegeGraceMinutes,
      updateDutyTiming,
    }),
    [
      scannerStatus,
      refreshScannerStatus,
      isCapturing,
      isAutoScanActive,
      punchMode,
      soundEnabled,
      staffRamCache,
      todayAttendance,
      refreshStaffCache,
      refreshTodayAttendance,
      updateStaffTemplateInCache,
      executeScanCycle,
      recordStaffPunch,
      manualOverrideAttendance,
      lastMatch,
      undoLastScan,
      retryWhatsApp,
      resendAllFailedWhatsApp,
      isRetryingWhatsApp,
      isBiometricDeskModalOpen,
      reEnrollModalStaff,
      openReEnrollModal,
      closeReEnrollModal,
      notifyScannerOnline,
      collegeStartTime,
      collegeEndTime,
      collegeGraceMinutes,
      updateDutyTiming,
    ]
  );

  return <BiometricAttendanceContext.Provider value={value}>{children}</BiometricAttendanceContext.Provider>;
}

export function useBiometricAttendance() {
  const context = useContext(BiometricAttendanceContext);
  if (!context) {
    throw new Error('useBiometricAttendance must be used within a BiometricAttendanceProvider');
  }
  return context;
}
