import React, { useState, useEffect, useMemo } from 'react';
import {
  Fingerprint,
  X,
  CheckCircle2,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertCircle,
  UserCheck,
  Sparkles,
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
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
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
  const [finger, setFinger] = useState<string>(targetPerson?.fingerprintFinger || 'Right Thumb');
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'enrolled'>('all');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [lastQuality, setLastQuality] = useState<number | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ matched: boolean; score: number } | null>(null);

  useEffect(() => {
    if (targetPerson) {
      setSelectedPerson(targetPerson);
      setFinger(targetPerson.fingerprintFinger || 'Right Thumb');
      setCapturedPreview(null);
      setVerifyResult(null);
    } else {
      setSelectedPerson(null);
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
      fingerprintFinger: st.fingerprintFinger || st.fingerprint_finger || 'Right Thumb',
      fingerprintEnrolledAt: st.fingerprintEnrolledAt || st.fingerprint_enrolled_at,
    }));
  }, [staffList]);

  const enrolledCount = useMemo(
    () => normalizedStaffList.filter((s) => Boolean(s.fingerprintTemplate)).length,
    [normalizedStaffList]
  );

  const filteredDirectory = useMemo(() => {
    return normalizedStaffList.filter((s) => {
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch =
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.id || '').toLowerCase().includes(q) ||
        (s.roleOrGroup || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (filterMode === 'missing') return !s.fingerprintTemplate;
      if (filterMode === 'enrolled') return Boolean(s.fingerprintTemplate);
      return true;
    });
  }, [normalizedStaffList, searchQuery, filterMode]);

  if (!isOpen) return null;

  const activePerson = selectedPerson || targetPerson;

  const handleCaptureAndSave = async () => {
    if (!activePerson) return;
    setScanning(true);
    setVerifyResult(null);
    try {
      const res = await secugenService.captureFingerprint({ timeoutMs: 12000, quality: 50 });
      if (res.success && res.templateBase64) {
        const nowIso = new Date().toISOString();
        const pType: 'staff' | 'student' =
          activePerson.personType === 'student' ? 'student' : 'staff';

        if (res.bmpBase64) {
          setCapturedPreview(res.bmpBase64);
          try {
            safeLocalStorage.setItem(`scj_fp_thumb_${activePerson.id}`, res.bmpBase64);
          } catch {}
        }
        setLastQuality(res.quality || 85);

        // Save in local vault
        try {
          safeLocalStorage.setItem(
            `scj_fp_vault_${activePerson.id}`,
            JSON.stringify({
              personId: activePerson.id,
              personType: pType,
              template: res.templateBase64,
              finger,
              enrolledAt: nowIso,
            })
          );
        } catch {}

        // Save directly to Supabase database first so fetchData(true) never overwrites it
        if (isSupabaseConfigured) {
          if (pType === 'staff') {
            const { error } = await supabase
              .from('staff')
              .update({
                fingerprint_template: res.templateBase64,
                fingerprint_finger: finger,
                fingerprint_enrolled_at: nowIso,
              })
              .eq('id', activePerson.id);
            if (error) {
              playFeedbackBeep('error');
              toast.error(`Database save error: ${error.message}`);
              return;
            }
          } else {
            await supabase
              .from('students')
              .update({
                fingerprint_template: res.templateBase64,
                fingerprint_finger: finger,
                fingerprint_enrolled_at: nowIso,
              })
              .or(`id.eq.${activePerson.id},admission_id.eq.${activePerson.id}`);

            await supabase
              .from('admissions')
              .update({
                fingerprint_template: res.templateBase64,
                fingerprint_finger: finger,
                fingerprint_enrolled_at: nowIso,
              })
              .or(`id.eq.${activePerson.id},student_id.eq.${activePerson.id}`);
          }
        }

        playFeedbackBeep('success');
        await onEnrollmentSaved?.(activePerson.id, pType, res.templateBase64, finger);

        setSelectedPerson({
          ...activePerson,
          fingerprintTemplate: res.templateBase64,
          fingerprintFinger: finger,
          fingerprintEnrolledAt: nowIso,
        });

        toast.success(
          `Fingerprint saved permanently in Database for ${activePerson.fullName} (${finger})`
        );
        if (targetPerson) {
          setTimeout(() => onClose(), 800);
        }
      } else {
        playFeedbackBeep('error');
        toast.error(res.error || 'Failed to capture fingerprint from SecuGen sensor');
      }
    } finally {
      setScanning(false);
    }
  };

  const handleVerifyExisting = async () => {
    if (!activePerson?.fingerprintTemplate) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await secugenService.captureFingerprint({ timeoutMs: 10000, quality: 45 });
      if (!res.success || !res.templateBase64) {
        playFeedbackBeep('error');
        toast.error(res.error || 'Could not read finger from scanner');
        return;
      }
      if (res.bmpBase64) setCapturedPreview(res.bmpBase64);
      const match = await secugenService.matchTemplates(
        res.templateBase64,
        activePerson.fingerprintTemplate
      );
      setVerifyResult({ matched: match.matched, score: match.score });
      if (match.matched) {
        playFeedbackBeep('success');
        toast.success(
          `Verified! ${activePerson.fullName}'s fingerprint matched (Score: ${match.score})`
        );
      } else {
        playFeedbackBeep('error');
        toast.warning(`Finger did not match stored template (Score: ${match.score})`);
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064e43] via-[#085a4e] to-teal-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Fingerprint size={22} className="text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider">
                SecuGen Biometric Enrollment & Vault
              </h3>
              <p className="text-[11px] text-emerald-200 font-medium">
                {enrolledCount} of {normalizedStaffList.length} Faculty Fingerprints Stored in Cloud Database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Directory Picker when no single targetPerson was locked or user wants to switch */}
          {!targetPerson && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search teacher by name or ID..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    All ({normalizedStaffList.length})
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
                    Saved ({enrolledCount})
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
                    Pending ({normalizedStaffList.length - enrolledCount})
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-slate-50/50">
                {filteredDirectory.map((person) => {
                  const isSelected = activePerson?.id === person.id;
                  const hasBio = Boolean(person.fingerprintTemplate);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => {
                        setSelectedPerson(person);
                        setFinger(person.fingerprintFinger || 'Right Thumb');
                        setVerifyResult(null);
                      }}
                      className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-50 border-l-4 border-emerald-600' : 'hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                          {person.photo ? (
                            <img src={person.photo} alt={person.fullName} className="w-full h-full object-cover" />
                          ) : (
                            (person.fullName || 'S').slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">{person.fullName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {person.id} • {person.roleOrGroup}
                          </p>
                        </div>
                      </div>
                      {hasBio ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black shrink-0">
                          <CheckCircle2 size={11} /> Enrolled ({person.fingerprintFinger})
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
              {/* Target Person Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-800 font-black text-base overflow-hidden shrink-0">
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
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-slate-900">{activePerson.fullName}</h4>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-mono text-[10px] font-bold">
                        {activePerson.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {activePerson.collegeNo || activePerson.roleOrGroup || activePerson.personType || 'Faculty Member'}
                    </p>
                    {activePerson.fingerprintTemplate ? (
                      <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-extrabold">
                        <ShieldCheck size={13} className="text-emerald-700" />
                        <span>
                           Cloud Biometric Active ({activePerson.fingerprintFinger || 'Right Thumb'})
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold">
                        <AlertCircle size={13} className="text-amber-700" />
                        <span>No Fingerprint Stored Yet</span>
                      </div>
                    )}
                  </div>
                </div>

                {capturedPreview && (
                  <div className="text-center shrink-0">
                    <img
                      src={capturedPreview}
                      alt="Thumb Scan"
                      className="w-14 h-16 object-contain rounded-xl border-2 border-emerald-500 bg-white p-0.5"
                    />
                    {lastQuality && (
                      <span className="text-[9px] font-mono font-bold text-emerald-700">
                        Q: {lastQuality}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Finger Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Select Finger to Enroll / Update
                </label>
                <select
                  value={finger}
                  onChange={(e) => setFinger(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="Right Thumb">Right Thumb (دایاں انگوٹھا - Recommended)</option>
                  <option value="Right Index">Right Index Finger (دائیں شہادت کی انگلی)</option>
                  <option value="Left Thumb">Left Thumb (بایاں انگوٹھا)</option>
                  <option value="Left Index">Left Index Finger (بائیں شہادت کی انگلی)</option>
                </select>
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
                        ? '100% Match Confirmed with Stored Cloud Template!'
                        : 'Finger did not match stored template.'}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold">Score: {verifyResult.score}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCaptureAndSave}
                  disabled={scanning || verifying}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  <Fingerprint size={16} className={scanning ? 'animate-ping' : ''} />
                  <span>
                    {scanning
                      ? 'Place Finger on Sensor...'
                      : activePerson.fingerprintTemplate
                      ? 'Re-Scan & Update Finger'
                      : 'Scan & Save to Database'}
                  </span>
                </button>

                {activePerson.fingerprintTemplate && (
                  <button
                    type="button"
                    onClick={handleVerifyExisting}
                    disabled={scanning || verifying}
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    <UserCheck size={16} />
                    <span>
                      {verifying ? 'Place Finger to Verify...' : 'Test / Verify Stored Thumb'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs font-medium">
              Select a faculty member above to enroll or test their fingerprint.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
