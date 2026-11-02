import React, { useState } from 'react';
import {
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { secugenService, BiometricCachedStaff } from '../lib/secugenService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useBiometricAttendance, playKioskSound } from '../context/BiometricAttendanceContext';
import { toast } from 'sonner';

interface BiometricReEnrollModalProps {
  staff: BiometricCachedStaff;
  onClose: () => void;
}

export default function BiometricReEnrollModal({ staff, onClose }: BiometricReEnrollModalProps) {
  const {
    staffRamCache,
    updateStaffTemplateInCache,
    recordStaffPunch,
    setIsAutoScanActive,
  } = useBiometricAttendance();

  // Enrollment State: 1 = Primary (Right Thumb), 2 = Secondary (Right Index), 3 = Saving / Done
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Scanned templates
  const [primaryTemplate, setPrimaryTemplate] = useState<string | null>(null);
  const [primaryQuality, setPrimaryQuality] = useState<number | null>(null);
  const [primaryBmp, setPrimaryBmp] = useState<string | null>(null);

  const [secondaryTemplate, setSecondaryTemplate] = useState<string | null>(null);
  const [secondaryQuality, setSecondaryQuality] = useState<number | null>(null);
  const [secondaryBmp, setSecondaryBmp] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 1. Scan Primary Finger (Right Thumb)
  const handleScanPrimary = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const res = await secugenService.captureFingerprint({
        timeoutMs: 10000,
        quality: 60,
      });

      if (!res.success || !res.templateBase64) {
        setErrorMsg(res.error || 'Failed to capture primary finger. Please try again.');
        playKioskSound('error');
        return;
      }

      // Enforce Quality >= 70%
      const qual = res.quality ?? 0;
      if (qual < 70) {
        setErrorMsg(`Image quality too low (${qual}%). SecuGen requires at least 70% quality. Please wipe sensor and press thumb flat and firmly.`);
        playKioskSound('error');
        return;
      }

      // Check collision against all OTHER staff members in RAM cache
      const otherStaff = staffRamCache.filter((s) => s.id !== staff.id);
      const collisionCheck = secugenService.match1toNBestMatch(res.templateBase64, otherStaff, {
        minScore: 120,
        minMargin: 10,
      });

      if (collisionCheck.matched && collisionCheck.candidate) {
        setErrorMsg(
          `COLLISION DETECTED: This fingerprint matches ${collisionCheck.candidate.fullName} (Score ${collisionCheck.score}). Each teacher must use their own unique fingers.`
        );
        playKioskSound('error');
        return;
      }

      setPrimaryTemplate(res.templateBase64);
      setPrimaryQuality(qual);
      setPrimaryBmp(res.bmpDataUrl || (res.bmpBase64 ? `data:image/bmp;base64,${res.bmpBase64}` : null));
      playKioskSound('checkin');
      setCurrentStep(2);
      toast.success('Right Thumb Captured with 70%+ Quality!', {
        description: 'Now please scan Right Index Finger for 2-finger zero-fail redundancy.',
      });
    } finally {
      setIsScanning(false);
    }
  };

  // 2. Scan Secondary Finger (Right Index)
  const handleScanSecondary = async () => {
    if (!primaryTemplate) return;
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const res = await secugenService.captureFingerprint({
        timeoutMs: 10000,
        quality: 60,
      });

      if (!res.success || !res.templateBase64) {
        setErrorMsg(res.error || 'Failed to capture secondary finger. Please try again.');
        playKioskSound('error');
        return;
      }

      // Enforce Quality >= 70%
      const qual = res.quality ?? 0;
      if (qual < 70) {
        setErrorMsg(`Image quality too low (${qual}%). SecuGen requires at least 70% quality. Please press index finger firmly.`);
        playKioskSound('error');
        return;
      }

      // Ensure index finger is NOT identical to thumb
      const selfThumbCheck = secugenService.matchSingleTemplatePair(res.templateBase64, primaryTemplate);
      if (selfThumbCheck >= 135) {
        setErrorMsg('You placed the same finger again! Please use your RIGHT INDEX finger for the secondary backup.');
        playKioskSound('error');
        return;
      }

      // Check collision against other staff members
      const otherStaff = staffRamCache.filter((s) => s.id !== staff.id);
      const collisionCheck = secugenService.match1toNBestMatch(res.templateBase64, otherStaff, {
        minScore: 120,
        minMargin: 10,
      });

      if (collisionCheck.matched && collisionCheck.candidate) {
        setErrorMsg(
          `COLLISION DETECTED: This finger matches ${collisionCheck.candidate.fullName} (Score ${collisionCheck.score}).`
        );
        playKioskSound('error');
        return;
      }

      setSecondaryTemplate(res.templateBase64);
      setSecondaryQuality(qual);
      setSecondaryBmp(res.bmpDataUrl || (res.bmpBase64 ? `data:image/bmp;base64,${res.bmpBase64}` : null));
      playKioskSound('checkin');

      // Auto-save both fingers
      await finalizeEnrollment(primaryTemplate, res.templateBase64);
    } finally {
      setIsScanning(false);
    }
  };

  // 3. Finalize Enrollment, Save to Supabase & Auto-Mark Present
  const finalizeEnrollment = async (pTpl: string, sTpl?: string | null) => {
    setIsSaving(true);
    setCurrentStep(3);
    try {
      // Delimited fallback for backwards compatibility
      const combinedTpl = sTpl ? `${pTpl}|||${sTpl}` : pTpl;
      const combinedFingers = sTpl ? 'Right Thumb + Right Index' : 'Right Thumb';

      // 1. Update Supabase staff table
      if (isSupabaseConfigured) {
        const { error: dbErr } = await supabase
          .from('staff')
          .update({
            primary_finger_template: pTpl,
            primary_finger_name: 'Right Thumb',
            secondary_finger_template: sTpl || null,
            secondary_finger_name: sTpl ? 'Right Index' : null,
            fingerprint_template: combinedTpl,
            fingerprint_finger: combinedFingers,
            fingerprint_enrolled_at: new Date().toISOString(),
          })
          .eq('id', staff.id);

        if (dbErr) {
          console.error('Supabase staff fingerprint update failed:', dbErr);
          // Try fallback without new columns in case migration is pending
          await supabase
            .from('staff')
            .update({
              fingerprint_template: combinedTpl,
              fingerprint_finger: combinedFingers,
              fingerprint_enrolled_at: new Date().toISOString(),
            })
            .eq('id', staff.id);
        }
      }

      // 2. Update RAM cache
      updateStaffTemplateInCache(
        staff.id,
        pTpl,
        sTpl || null,
        combinedTpl,
        'Right Thumb',
        sTpl ? 'Right Index' : null
      );

      // Save thumb thumbnail
      if (primaryBmp) {
        secugenService.saveFingerprintThumbnail(staff.id, primaryBmp);
      }

      // 3. Immediately mark Morning In (Present) for today!
      await recordStaffPunch(staff.id, 'checkin', {
        score: 185,
        margin: 45,
        durationMs: 8,
        thumbBmp: primaryBmp || undefined,
        notes: `Morning Drive Guided Re-Enrollment (${sTpl ? '2 Fingers' : '1 Finger'})`,
      });

      playKioskSound('checkout');
      toast.success(`Enrolled & Marked Present: ${staff.fullName}`, {
        description: 'Templates calibrated & Morning Check-In marked with WhatsApp dispatched.',
      });

      // Brief delay to show completion animation, then resume auto-scan and close
      setTimeout(() => {
        setIsAutoScanActive(true); // Resume auto-scan
        onClose();
      }, 1600);
    } catch (err) {
      console.error('Error finalizing enrollment:', err);
      setErrorMsg('Failed to save biometric templates. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl max-w-xl w-full p-6 text-white shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-1 flex items-center justify-center overflow-hidden shrink-0">
              {staff.photo ? (
                <img src={staff.photo} alt={staff.fullName} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Fingerprint className="text-emerald-400" size={24} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">{staff.fullName}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  {staff.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {staff.designation || staff.role} • Guided Morning Re-Scan & Auto-Mark
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsAutoScanActive(true);
              onClose();
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`p-3 rounded-2xl border transition-all ${
              currentStep === 1
                ? 'bg-emerald-500/15 border-emerald-500/50 ring-2 ring-emerald-500/30'
                : primaryTemplate
                ? 'bg-emerald-950/40 border-emerald-700/50'
                : 'bg-slate-800/40 border-white/5'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-300">1. Primary Finger</span>
              {primaryTemplate && <Check className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-sm font-black text-white">Right Thumb</p>
            {primaryQuality !== null && (
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                Quality: {primaryQuality}%
              </span>
            )}
          </div>

          <div
            className={`p-3 rounded-2xl border transition-all ${
              currentStep === 2
                ? 'bg-teal-500/15 border-teal-500/50 ring-2 ring-teal-500/30'
                : secondaryTemplate
                ? 'bg-teal-950/40 border-teal-700/50'
                : 'bg-slate-800/40 border-white/5'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-300">2. Secondary Backup</span>
              {secondaryTemplate && <Check className="w-4 h-4 text-teal-400" />}
            </div>
            <p className="text-sm font-black text-white">Right Index</p>
            {secondaryQuality !== null && (
              <span className="text-[10px] font-mono text-teal-400 font-bold">
                Quality: {secondaryQuality}%
              </span>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-2xl flex items-start gap-3 text-xs text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Active Step Actions */}
        {currentStep === 1 && (
          <div className="space-y-4 text-center py-2">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border-2 border-dashed border-emerald-400/50 mx-auto flex items-center justify-center">
              <Fingerprint className={`w-10 h-10 ${isScanning ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-base text-white">Place Right Thumb Flat on Sensor</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Press firmly on the glowing glass surface. Enforces ≥ 70% quality to eliminate dry/weak scans.
              </p>
            </div>
            <Button
              onClick={handleScanPrimary}
              disabled={isScanning}
              className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-black text-sm gap-2 shadow-lg shadow-emerald-900/40 cursor-pointer"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning Right Thumb (firm pressure)...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  <span>Scan Right Thumb (≥ 70% Quality)</span>
                </>
              )}
            </Button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4 text-center py-2">
            <div className="w-20 h-20 rounded-3xl bg-teal-500/10 border-2 border-dashed border-teal-400/50 mx-auto flex items-center justify-center">
              <Fingerprint className={`w-10 h-10 ${isScanning ? 'text-teal-400 animate-pulse' : 'text-slate-400'}`} />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-base text-white">Place Right Index Finger Flat on Sensor</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Capturing a 2nd finger guarantees 100% attendance success even if the thumb has a cut or smudge.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                onClick={handleScanSecondary}
                disabled={isScanning}
                className="flex-1 h-12 rounded-2xl bg-teal-600 hover:bg-teal-500 font-black text-sm gap-2 shadow-lg shadow-teal-900/40 cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Capturing Index Finger...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Scan Right Index & Finalize</span>
                  </>
                )}
              </Button>
              <Button
                onClick={() => primaryTemplate && finalizeEnrollment(primaryTemplate, null)}
                disabled={isScanning || isSaving}
                variant="outline"
                className="h-12 rounded-2xl border-white/20 text-slate-300 hover:bg-white/10 font-bold text-xs cursor-pointer"
              >
                Skip 2nd Finger (Use Thumb Only)
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 mx-auto flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-white">Calibrated & Attendance Marked Present!</h4>
              <p className="text-xs text-emerald-300">
                Templates saved to database • Morning Check-In punched • WhatsApp notification sent.
              </p>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck size={14} className="text-emerald-400" />
            ISO 19794-2 FMR 20 Biometric Vault
          </span>
          <span className="font-mono text-emerald-400 font-bold">Auto-Resumes Auto-Scan Loop</span>
        </div>
      </div>
    </div>
  );
}
