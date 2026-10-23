import React, { useState } from 'react';
import { Fingerprint, X, CheckCircle2 } from 'lucide-react';
import { secugenService } from '../lib/secugenService';
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

export default function BiometricEnrollmentModal({
  isOpen,
  onClose,
  targetPerson,
  onEnrollmentSaved,
}: BiometricEnrollmentModalProps) {
  const [finger, setFinger] = useState(targetPerson?.fingerprintFinger || 'Right Thumb');
  const [scanning, setScanning] = useState(false);

  if (!isOpen || !targetPerson) return null;

  const handleCapture = async () => {
    setScanning(true);
    try {
      const res = await secugenService.captureFingerprint({ timeoutMs: 12000, quality: 50 });
      if (res.success && res.templateBase64) {
        if (res.bmpBase64 && targetPerson.id) {
          try {
            localStorage.setItem(`scj_fp_thumb_${targetPerson.id}`, res.bmpBase64);
          } catch {}
        }
        onEnrollmentSaved?.(
          targetPerson.id,
          targetPerson.personType === 'staff' ? 'staff' : 'student',
          res.templateBase64,
          finger
        );
        toast.success(`Fingerprint enrolled for ${targetPerson.fullName}`);
        onClose();
      } else {
        toast.error(res.error || 'Failed to capture fingerprint');
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Fingerprint size={20} className="text-emerald-300" />
            <h3 className="text-sm font-black uppercase tracking-wider">Biometric Thumb Enrollment</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-sm font-black text-slate-900">{targetPerson.fullName}</p>
            <p className="text-xs text-slate-500">
              {targetPerson.collegeNo || targetPerson.roleOrGroup || targetPerson.personType || 'Member'}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Select Finger
            </label>
            <select
              value={finger}
              onChange={(e) => setFinger(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
            >
              <option value="Right Thumb">Right Thumb (دایاں انگوٹھا)</option>
              <option value="Left Thumb">Left Thumb (بایاں انگوٹھا)</option>
              <option value="Right Index">Right Index Finger</option>
              <option value="Left Index">Left Index Finger</option>
            </select>
          </div>

          <button
            onClick={handleCapture}
            disabled={scanning}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 size={15} />
            <span>{scanning ? 'Waiting for Thumb on Sensor...' : 'Scan & Save Biometric Template'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
