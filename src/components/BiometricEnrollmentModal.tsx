import React, { useState, useEffect, useMemo } from 'react';
import {
  Fingerprint,
  X,
  CheckCircle2,
  ShieldCheck,
  Search,
  AlertCircle,
  UserCheck,
  Trash2,
  Users,
  GraduationCap,
} from 'lucide-react';
import { secugenService } from '../lib/secugenService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { safeLocalStorage } from '../utils/safeStorage';
import { toast } from 'sonner';

interface BiometricEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPerson: any;
  studentsList?: any[];
  staffList?: any[];
  onEnrollmentSaved?: (
    personId: string,
    personType: 'student' | 'staff',
    template: string,
    finger: string
  ) => void;
}

function playFeedbackBeep(type: 'success' | 'error') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.34);
      osc.start();
      osc.stop(ctx.currentTime + 0.34);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    }
  } catch {}
}

export default function BiometricEnrollmentModal({
  isOpen,
  onClose,
  targetPerson,
  studentsList = [],
  staffList = [],
  onEnrollmentSaved,
}: BiometricEnrollmentModalProps) {
  const [selectedPerson, setSelectedPerson] = useState<any | null>(targetPerson || null);
  const [directoryTab, setDirectoryTab] = useState<'staff' | 'students'>(
    targetPerson?.personType === 'student' ? 'students' : 'staff'
  );
  const [finger, setFinger] = useState<string>(
    secugenService.cleanFingerLabel(targetPerson?.fingerprintFinger || 'Right Thumb')
  );
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'enrolled'>('all');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [lastQuality, setLastQuality] = useState<number | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    matched: boolean;
    score: number;
    attendanceMarked?: boolean;
  } | null>(null);

  useEffect(() => {
    if (targetPerson) {
      setSelectedPerson(targetPerson);
      setDirectoryTab(targetPerson.personType === 'student' ? 'students' : 'staff');
      setFinger(secugenService.cleanFingerLabel(targetPerson.fingerprintFinger || 'Right Thumb'));
      setVerifyResult(null);

      const cached =
        safeLocalStorage.getItem(`scj_fp_thumb_${targetPerson.id}`) ||
        (targetPerson.collegeNo
          ? safeLocalStorage.getItem(`scj_fp_thumb_${targetPerson.collegeNo}`)
          : null);
      if (cached && cached.length > 80 && !cached.includes('undefined')) {
        setCapturedPreview(cached.startsWith('data:') ? cached : `data:image/bmp;base64,${cached}`);
      } else {
        setCapturedPreview(null);
      }
    } else {
      setSelectedPerson(null);
      setCapturedPreview(null);
      setVerifyResult(null);
    }
  }, [targetPerson, isOpen]);

  const normalizedStaffList = useMemo(() => {
    return (staffList || []).map((st) => ({
      id: st.id,
      fullName: st.fullName || st.full_name || 'Staff Member',
      fatherName: st.fatherName || st.father_name || '',
      personType: 'staff' as const,
      roleOrGroup: st.designation || st.role || 'Faculty',
      photo: st.photo || st.photo_url,
      phone: st.contact || '',
      fingerprintTemplate: st.fingerprintTemplate || st.fingerprint_template,
      fingerprintFinger: secugenService.cleanFingerLabel(
        st.fingerprintFinger || st.fingerprint_finger || 'Right Thumb'
      ),
      fingerprintEnrolledAt: st.fingerprintEnrolledAt || st.fingerprint_enrolled_at,
    }));
  }, [staffList]);

  const normalizedStudentsList = useMemo(() => {
    return (studentsList || []).map((s) => ({
      id: s.id,
      admissionId: s.admissionId || s.admission_id,
      collegeNo: s.collegeNo || s.studentId || s.id,
      fullName: s.fullName || s.full_name || 'Student',
      fatherName: s.fatherName || s.father_name || '',
      personType: 'student' as const,
      roleOrGroup: `${s.group || s.groupName || s.category || 'Student'}${
        s.section ? ` (${s.section})` : ''
      }`,
      photo: s.photo || s.photo_url,
      phone: s.contact || s.fatherContact || '',
      fingerprintTemplate: s.fingerprintTemplate || s.fingerprint_template,
      fingerprintFinger: secugenService.cleanFingerLabel(
        s.fingerprintFinger || s.fingerprint_finger || 'Right Thumb'
      ),
      fingerprintEnrolledAt: s.fingerprintEnrolledAt || s.fingerprint_enrolled_at,
    }));
  }, [studentsList]);

  const activeDirectory = directoryTab === 'staff' ? normalizedStaffList : normalizedStudentsList;

  const enrolledCount = useMemo(
    () => activeDirectory.filter((s) => Boolean(s.fingerprintTemplate)).length,
    [activeDirectory]
  );

  const filteredDirectory = useMemo(() => {
    return activeDirectory.filter((s) => {
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch =
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.id || '').toLowerCase().includes(q) ||
        ((s as any).collegeNo || '').toLowerCase().includes(q) ||
        (s.roleOrGroup || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (filterMode === 'missing') return !s.fingerprintTemplate;
      if (filterMode === 'enrolled') return Boolean(s.fingerprintTemplate);
      return true;
    });
  }, [activeDirectory, searchQuery, filterMode]);

  const activePerson = selectedPerson || targetPerson;

  const enrolledFingersList = useMemo(() => {
    if (!activePerson?.fingerprintTemplate) return [];
    return secugenService.extractEnrolledFingers(
      activePerson.fingerprintTemplate,
      activePerson.fingerprintFinger
    );
  }, [activePerson?.fingerprintTemplate, activePerson?.fingerprintFinger]);

  const hasThumbEnrolled = useMemo(
    () =>
      enrolledFingersList.some(
        (e) => secugenService.normalizeFingerKey(e.finger) === 'right_thumb'
      ),
    [enrolledFingersList]
  );

  const hasIndexEnrolled = useMemo(
    () =>
      enrolledFingersList.some(
        (e) => secugenService.normalizeFingerKey(e.finger) === 'right_index'
      ),
    [enrolledFingersList]
  );

  const minutiaePoints = useMemo(() => {
    if (!activePerson?.fingerprintTemplate) return [];
    return secugenService.parseIsoMinutiae(activePerson.fingerprintTemplate);
  }, [activePerson?.fingerprintTemplate]);

  if (!isOpen) return null;

  const handleSelectPersonFromList = (person: any) => {
    setSelectedPerson(person);
    const existingEntries = secugenService.extractEnrolledFingers(
      person.fingerprintTemplate,
      person.fingerprintFinger
    );
    const hasThumb = existingEntries.some(
      (e) => secugenService.normalizeFingerKey(e.finger) === 'right_thumb'
    );
    const hasIndex = existingEntries.some(
      (e) => secugenService.normalizeFingerKey(e.finger) === 'right_index'
    );
    // Default to whichever finger is missing if 1 finger is already enrolled, so adding the 2nd finger is automatic!
    if (hasThumb && !hasIndex) {
      setFinger('Right Index');
    } else if (hasIndex && !hasThumb) {
      setFinger('Right Thumb');
    } else {
      setFinger('Right Thumb');
    }
    setVerifyResult(null);
    const cached =
      safeLocalStorage.getItem(`scj_fp_thumb_${person.id}`) ||
      (person.collegeNo ? safeLocalStorage.getItem(`scj_fp_thumb_${person.collegeNo}`) : null);
    if (cached && cached.length > 80 && !cached.includes('undefined')) {
      setCapturedPreview(cached.startsWith('data:') ? cached : `data:image/bmp;base64,${cached}`);
    } else {
      setCapturedPreview(null);
    }
  };

  const handleCaptureAndSave = async (overrideFinger?: string) => {
    if (!activePerson) return;
    const targetFinger = secugenService.cleanFingerLabel(overrideFinger || finger);
    if (overrideFinger) setFinger(targetFinger);
    setScanning(true);
    setVerifyResult(null);
    try {
      const res = await secugenService.captureFingerprint({
        timeoutMs: 12000,
        quality: 40,
        templateFormat: 'ISO',
      });
      if (res.success && res.templateBase64) {
        // Check for duplicate fingerprint (both same-person duplicate scan and cross-person collision)
        const dupCheck = await secugenService.checkDuplicateFinger({
          scannedTemplate: res.templateBase64,
          currentPersonId: activePerson.id,
          currentPersonName: activePerson.fullName,
          currentPersonExistingTemplate: activePerson.fingerprintTemplate,
          currentPersonExistingFinger: activePerson.fingerprintFinger,
          staffList,
          studentsList,
        });

        if (dupCheck.isDuplicate) {
          playFeedbackBeep('error');
          if (dupCheck.isSamePerson) {
            toast.error(
              `Duplicate Finger Blocked: This exact finger is already enrolled as "${dupCheck.matchedFinger}" for ${activePerson.fullName}. Please delete the existing fingerprint first before scanning the same finger again.`
            );
          } else {
            toast.error(
              `Duplicate Fingerprint Blocked: This finger is already registered to ${dupCheck.matchedName} (${dupCheck.matchedRole} • ${dupCheck.matchedFinger}).`
            );
          }
          return;
        }

        const nowIso = new Date().toISOString();
        const pType: 'staff' | 'student' =
          activePerson.personType === 'student' ? 'student' : 'staff';

        if (res.bmpBase64) {
          setCapturedPreview(
            res.bmpDataUrl || `data:image/bmp;base64,${res.bmpBase64}`
          );
          secugenService.saveFingerprintThumbnail(
            activePerson.id,
            res.bmpBase64,
            activePerson.collegeNo
          );
        }
        setLastQuality(res.quality || 85);

        // Merge with any existing finger (e.g. Right Thumb + Right Index) so both fingers work!
        const merged = secugenService.mergeFingerTemplate(
          activePerson.fingerprintTemplate,
          activePerson.fingerprintFinger,
          res.templateBase64,
          targetFinger,
          'merge'
        );
        const finalTemplate = merged.templateField;
        const finalFinger = merged.fingerField;

        // Clear any deleted tombstone & save in local vault
        try {
          safeLocalStorage.removeItem(`scj_fp_deleted_${activePerson.id}`);
          if (activePerson.admissionId) {
            safeLocalStorage.removeItem(`scj_fp_deleted_${activePerson.admissionId}`);
          }
          safeLocalStorage.setItem(
            `scj_fp_vault_${activePerson.id}`,
            JSON.stringify({
              personId: activePerson.id,
              personType: pType,
              template: finalTemplate,
              finger: finalFinger,
              enrolledAt: nowIso,
            })
          );
        } catch {}

        // Persist directly to Supabase first using safe individual queries
        if (isSupabaseConfigured) {
          if (pType === 'staff') {
            const { error } = await supabase
              .from('staff')
              .update({
                fingerprint_template: finalTemplate,
                fingerprint_finger: finalFinger,
                fingerprint_enrolled_at: nowIso,
              })
              .eq('id', activePerson.id);
            if (error) {
              playFeedbackBeep('error');
              toast.error(`Database save error: ${error.message}`);
              return;
            }
          } else {
            const payload = {
              fingerprint_template: finalTemplate,
              fingerprint_finger: finalFinger,
              fingerprint_enrolled_at: nowIso,
            };
            const ops: Promise<any>[] = [
              supabase.from('students').update(payload).eq('id', activePerson.id),
              supabase.from('admissions').update(payload).eq('student_id', activePerson.id),
            ];
            if (activePerson.admissionId) {
              ops.push(supabase.from('students').update(payload).eq('admission_id', activePerson.admissionId));
              ops.push(supabase.from('admissions').update(payload).eq('id', activePerson.admissionId));
            }
            if (activePerson.collegeNo) {
              ops.push(supabase.from('students').update(payload).eq('college_no', activePerson.collegeNo));
              ops.push(supabase.from('admissions').update(payload).eq('college_no', activePerson.collegeNo));
            }
            await Promise.allSettled(ops);
          }
        }

        playFeedbackBeep('success');
        await onEnrollmentSaved?.(activePerson.id, pType, finalTemplate, finalFinger);

        setSelectedPerson({
          ...activePerson,
          fingerprintTemplate: finalTemplate,
          fingerprintFinger: finalFinger,
          fingerprintEnrolledAt: nowIso,
        });

        toast.success(
          merged.entries.length >= 2
            ? `Both Fingers Active (${secugenService.formatFingerBadge(finalFinger, finalTemplate)}) for ${activePerson.fullName}! Either finger will now mark attendance.`
            : `Fingerprint saved permanently for ${activePerson.fullName} (${targetFinger})`
        );
      } else {
        playFeedbackBeep('error');
        toast.error(res.error || 'Failed to capture fingerprint from SecuGen sensor');
      }
    } finally {
      setScanning(false);
    }
  };

  const handleVerifyAndMarkAttendance = async () => {
    if (!activePerson?.fingerprintTemplate) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await secugenService.captureFingerprint({
        timeoutMs: 10000,
        quality: 40,
        templateFormat: 'ISO',
      });
      if (!res.success || !res.templateBase64) {
        playFeedbackBeep('error');
        toast.error(res.error || 'Could not read finger from scanner');
        return;
      }
      if (res.bmpBase64) {
        setCapturedPreview(res.bmpDataUrl || `data:image/bmp;base64,${res.bmpBase64}`);
        secugenService.saveFingerprintThumbnail(
          activePerson.id,
          res.bmpBase64,
          activePerson.collegeNo
        );
      }
      const match = await secugenService.matchTemplates(
        res.templateBase64,
        activePerson.fingerprintTemplate
      );

      if (match.matched) {
        playFeedbackBeep('success');
        // Also mark today's attendance in Supabase
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(now.getDate()).padStart(2, '0')}`;
        const hhmmss = `${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        if (isSupabaseConfigured) {
          if (activePerson.personType === 'student') {
            await supabase.from('student_attendance').upsert(
              [
                {
                  student_id: activePerson.id,
                  date: todayStr,
                  status: 'Present',
                  check_in_time: now.toISOString(),
                  verification_method: 'secugen_fingerprint',
                  notes: `SecuGen Biometric Verified (Score ${match.score})`,
                },
              ],
              { onConflict: 'student_id,date' }
            );
          } else {
            await supabase.from('staff_attendance').upsert(
              [
                {
                  staff_id: activePerson.id,
                  date: todayStr,
                  status: 'Present',
                  check_in: hhmmss,
                  check_in_time: now.toISOString(),
                  verification_method: 'secugen_fingerprint',
                  notes: JSON.stringify({
                    method: 'biometric_fingerprint',
                    check_in_time: hhmmss,
                    score: match.score,
                  }),
                },
              ],
              { onConflict: 'staff_id,date' }
            );
          }
        }

        setVerifyResult({ matched: true, score: match.score, attendanceMarked: true });
        toast.success(
          `Verified & Attendance Marked! ${activePerson.fullName} (Score: ${match.score}/199)`
        );
      } else {
        playFeedbackBeep('error');
        setVerifyResult({ matched: false, score: match.score });
        toast.warning(
          `Finger did not match ${activePerson.fullName}'s stored template (Score: ${match.score})`
        );
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleClearFingerprint = async () => {
    if (!activePerson) return;
    const pType: 'staff' | 'student' =
      activePerson.personType === 'student' ? 'student' : 'staff';
    try {
      safeLocalStorage.removeItem(`scj_fp_vault_${activePerson.id}`);
      safeLocalStorage.removeItem(`scj_fp_thumb_${activePerson.id}`);
      safeLocalStorage.setItem(`scj_fp_deleted_${activePerson.id}`, 'true');
      if (activePerson.admissionId) {
        safeLocalStorage.removeItem(`scj_fp_vault_${activePerson.admissionId}`);
        safeLocalStorage.removeItem(`scj_fp_thumb_${activePerson.admissionId}`);
        safeLocalStorage.setItem(`scj_fp_deleted_${activePerson.admissionId}`, 'true');
      }
      if (activePerson.collegeNo) {
        safeLocalStorage.removeItem(`scj_fp_thumb_${activePerson.collegeNo}`);
      }
    } catch {}

    if (isSupabaseConfigured) {
      const clearPayload = {
        fingerprint_template: null,
        fingerprint_finger: null,
        fingerprint_enrolled_at: null,
      };
      if (pType === 'staff') {
        await supabase.from('staff').update(clearPayload).eq('id', activePerson.id);
      } else {
        const clearOps: any[] = [
          supabase.from('students').update(clearPayload).eq('id', activePerson.id),
          supabase.from('admissions').update(clearPayload).eq('student_id', activePerson.id),
        ];
        if (activePerson.admissionId) {
          clearOps.push(supabase.from('students').update(clearPayload).eq('admission_id', activePerson.admissionId));
          clearOps.push(supabase.from('admissions').update(clearPayload).eq('id', activePerson.admissionId));
        }
        if (activePerson.collegeNo) {
          clearOps.push(supabase.from('students').update(clearPayload).eq('college_no', activePerson.collegeNo));
          clearOps.push(supabase.from('admissions').update(clearPayload).eq('college_no', activePerson.collegeNo));
        }
        await Promise.allSettled(clearOps);
      }
    }

    await onEnrollmentSaved?.(activePerson.id, pType, '', '');
    setSelectedPerson({
      ...activePerson,
      fingerprintTemplate: undefined,
      fingerprintFinger: undefined,
      fingerprintEnrolledAt: undefined,
    });
    setCapturedPreview(null);
    setVerifyResult(null);
    toast.success(`Permanently deleted stored fingerprint for ${activePerson.fullName}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064e43] via-[#085a4e] to-teal-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Fingerprint size={22} className="text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider">
                SecuGen HU20 Biometric Enrollment & Verification
              </h3>
              <p className="text-[11px] text-emerald-200 font-medium">
                {enrolledCount} of {activeDirectory.length}{' '}
                {directoryTab === 'staff' ? 'Faculty Members' : 'Students'} Enrolled in Cloud Database
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Directory Picker when opened as global Biometric Manager */}
          {!targetPerson && (
            <div className="space-y-3">
              {/* Staff vs Students Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setDirectoryTab('staff');
                      setSelectedPerson(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                      directoryTab === 'staff'
                        ? 'bg-[#085a4e] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Users size={13} />
                    <span>Faculty / Staff ({normalizedStaffList.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirectoryTab('students');
                      setSelectedPerson(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                      directoryTab === 'students'
                        ? 'bg-[#085a4e] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <GraduationCap size={13} />
                    <span>Students ({normalizedStudentsList.length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    All ({activeDirectory.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('enrolled')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      filterMode === 'enrolled'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700'
                    }`}
                  >
                    Enrolled ({enrolledCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('missing')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      filterMode === 'missing'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-700'
                    }`}
                  >
                    Missing ({activeDirectory.length - enrolledCount})
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${
                    directoryTab === 'staff' ? 'teacher' : 'student'
                  } by name or ID...`}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40">
                {filteredDirectory.map((person) => {
                  const isSelected = activePerson?.id === person.id;
                  const hasBio = Boolean(person.fingerprintTemplate);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => handleSelectPersonFromList(person)}
                      className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-l-4 border-emerald-600'
                          : 'hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                          {person.photo ? (
                            <img
                              src={person.photo}
                              alt={person.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (person.fullName || 'S').slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {person.fullName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">
                            {(person as any).collegeNo || person.id} • {person.roleOrGroup}
                          </p>
                        </div>
                      </div>
                      {hasBio ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black shrink-0">
                          <CheckCircle2 size={11} />{' '}
                          {secugenService.formatFingerBadge(
                            person.fingerprintFinger,
                            person.fingerprintTemplate
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                          Pending Scan
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activePerson ? (
            <div className="space-y-4">
              {/* Target Person Identity & SecuGen Thumb Impression Visual Pad */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
                <div className="sm:col-span-7 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center text-emerald-800 font-black text-lg overflow-hidden shrink-0">
                      {activePerson.photo ? (
                        <img
                          src={activePerson.photo}
                          alt={activePerson.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (activePerson.fullName || 'S').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-black text-slate-900 dark:text-white truncate">
                          {activePerson.fullName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[10px] font-bold">
                          {activePerson.collegeNo || activePerson.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {activePerson.roleOrGroup || activePerson.personType || 'Faculty Member'}
                      </p>
                      {activePerson.fingerprintTemplate ? (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[10.5px] font-extrabold">
                            <ShieldCheck size={12} className="text-emerald-700" />
                            <span>
                              {secugenService.formatFingerBadge(
                                activePerson.fingerprintFinger,
                                activePerson.fingerprintTemplate
                              )}
                            </span>
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold">
                          <AlertCircle size={13} className="text-amber-700" />
                          <span>Finger Not Scanned Yet</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dual-Finger Quick Slots (Right Thumb + Right Index) */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Dual-Finger Enrollment (Scan 1 or Both Fingers — Either Will Work)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={scanning || verifying}
                        onClick={() => handleCaptureAndSave('Right Thumb')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                          hasThumbEnrolled
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                            : finger.includes('Right Thumb')
                            ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 text-slate-900'
                            : 'bg-white border-slate-200 hover:border-emerald-400 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-black truncate">Right Thumb</p>
                          <p className="text-[9.5px] font-bold text-slate-500">
                            {hasThumbEnrolled ? '✓ Enrolled (Primary)' : '+ Click to Scan Thumb'}
                          </p>
                        </div>
                        {hasThumbEnrolled ? (
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        ) : (
                          <Fingerprint size={15} className="text-slate-400 shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={scanning || verifying}
                        onClick={() => handleCaptureAndSave('Right Index')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                          hasIndexEnrolled
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                            : finger.includes('Right Index')
                            ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 text-slate-900'
                            : 'bg-white border-slate-200 hover:border-emerald-400 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-black truncate">Right Index</p>
                          <p className="text-[9.5px] font-bold text-slate-500">
                            {hasIndexEnrolled ? '✓ Enrolled (2nd Finger)' : '+ Click to Scan Index'}
                          </p>
                        </div>
                        {hasIndexEnrolled ? (
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        ) : (
                          <Fingerprint size={15} className="text-slate-400 shrink-0" />
                        )}
                      </button>
                    </div>

                    <select
                      value={secugenService.cleanFingerLabel(finger)}
                      onChange={(e) => setFinger(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="Right Thumb">
                        Right Thumb (Primary Finger)
                      </option>
                      <option value="Right Index">
                        Right Index (Secondary Finger)
                      </option>
                      <option value="Left Thumb">
                        Left Thumb
                      </option>
                      <option value="Left Index">
                        Left Index
                      </option>
                    </select>
                  </div>
                </div>

                {/* Classic SecuGen HU20 Visual Thumb Impression Pad */}
                <div className="sm:col-span-5 rounded-2xl border-2 border-emerald-500/80 bg-slate-950 p-3 flex flex-col items-center justify-center relative overflow-hidden min-h-[165px] shadow-inner">
                  {capturedPreview ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={capturedPreview}
                        alt="Thumb Impression"
                        className="w-24 h-28 object-contain filter contrast-125 brightness-110 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                      />
                      <span className="text-[10px] font-mono font-bold text-emerald-400 mt-1">
                        SecuGen BMP {lastQuality ? `• Q: ${lastQuality}%` : 'Verified'}
                      </span>
                    </div>
                  ) : activePerson.fingerprintTemplate ? (
                    <div className="flex flex-col items-center text-center">
                      <svg
                        viewBox="0 0 300 400"
                        className="w-20 h-24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g
                          stroke="rgba(16,185,129,0.35)"
                          strokeWidth="4"
                          fill="none"
                          strokeLinecap="round"
                        >
                          <path d="M55 220 C55 110, 245 110, 245 220 C245 290, 210 340, 190 365" />
                          <path d="M85 220 C85 140, 215 140, 215 220 C215 280, 185 320, 165 350" />
                          <path d="M115 220 C115 170, 185 170, 185 220 C185 265, 165 295, 150 325" />
                        </g>
                        {minutiaePoints.map((pt, idx) => (
                          <circle
                            key={idx}
                            cx={Math.max(15, Math.min(285, pt.x))}
                            cy={Math.max(15, Math.min(385, pt.y))}
                            r={pt.type === 2 ? 5.5 : 4.5}
                            fill={pt.type === 2 ? '#34d399' : '#fbbf24'}
                          />
                        ))}
                      </svg>
                      <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider mt-1">
                        {enrolledFingersList.length >= 2
                          ? `${enrolledFingersList.length} Fingers Enrolled (Thumb + Index)`
                          : 'ISO 19794-2 Enrolled'}
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400/80">
                        {minutiaePoints.length > 0
                          ? `${minutiaePoints.length} Minutiae Points Stored`
                          : 'Cloud Template Active'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center text-slate-400">
                      <Fingerprint
                        size={38}
                        className={
                          scanning || verifying
                            ? 'text-amber-400 animate-bounce'
                            : 'text-slate-600'
                        }
                      />
                      <span className="text-[10px] font-bold mt-2 text-slate-300">
                        {scanning || verifying
                          ? 'Place Finger on SecuGen...'
                          : 'Ready to Capture Thumb'}
                      </span>
                    </div>
                  )}

                  {activePerson.fingerprintTemplate && (
                    <button
                      type="button"
                      onClick={handleClearFingerprint}
                      title="Clear all stored fingerprints for this person"
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {verifyResult && (
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    verifyResult.matched
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-black">
                    <CheckCircle2 size={16} />
                    <span>
                      {verifyResult.matched
                        ? `100% Match Confirmed & Today's Attendance Marked for ${activePerson.fullName}!`
                        : 'Scanned finger did not match stored template.'}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold">
                    Score: {verifyResult.score}/199
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleCaptureAndSave()}
                  disabled={scanning || verifying}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  <Fingerprint size={16} className={scanning ? 'animate-ping' : ''} />
                  <span>
                    {scanning
                      ? `Scanning ${finger.split('(')[0].trim()}...`
                      : activePerson.fingerprintTemplate
                      ? `Scan & Save ${finger.split('(')[0].trim()} (Keep Existing)`
                      : `Scan & Save ${finger.split('(')[0].trim()}`}
                  </span>
                </button>

                {activePerson.fingerprintTemplate && (
                  <button
                    type="button"
                    onClick={handleVerifyAndMarkAttendance}
                    disabled={scanning || verifying}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#085a4e] hover:bg-[#064e43] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    <UserCheck size={16} />
                    <span>
                      {verifying
                        ? 'Place Any Enrolled Finger...'
                        : 'Verify Finger & Mark Attendance'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs font-medium">
              Select a faculty member or student above to enroll, verify, or mark biometric attendance.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
