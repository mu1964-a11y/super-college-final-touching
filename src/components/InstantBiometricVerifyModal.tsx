import React, { useState } from 'react';
import { Fingerprint, X, CheckCircle2 } from 'lucide-react';
import { secugenService } from '../lib/secugenService';
import { toast } from 'sonner';

interface InstantBiometricVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsList: any[];
  staffList: any[];
  data?: any;
}

export default function InstantBiometricVerifyModal({
  isOpen,
  onClose,
  studentsList,
  staffList,
}: InstantBiometricVerifyModalProps) {
  const [scanning, setScanning] = useState(false);
  const [matchedPerson, setMatchedPerson] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSpotVerify = async () => {
    setScanning(true);
    setMatchedPerson(null);
    try {
      const res = await secugenService.captureFingerprint({ timeoutMs: 10000 });
      if (!res.success || !res.templateBase64) {
        toast.error(res.error || 'Could not capture fingerprint');
        return;
      }

      const enrolledStudents = (studentsList || []).filter((s) => s.fingerprintTemplate);
      const enrolledStaff = (staffList || []).filter((s) => s.fingerprintTemplate);

      for (const s of enrolledStudents) {
        const m = await secugenService.matchTemplates(res.templateBase64, s.fingerprintTemplate);
        if (m.matched) {
          setMatchedPerson({ ...s, personType: 'Student' });
          toast.success(`Verified Student: ${s.fullName}`);
          return;
        }
      }

      for (const st of enrolledStaff) {
        const m = await secugenService.matchTemplates(res.templateBase64, st.fingerprintTemplate);
        if (m.matched) {
          setMatchedPerson({ ...st, personType: 'Staff' });
          toast.success(`Verified Faculty: ${st.fullName}`);
          return;
        }
      }

      toast.warning('No matching fingerprint found in enrolled records.');
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
            <h3 className="text-sm font-black uppercase tracking-wider">Instant Biometric Spot-Check</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 text-center space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 mx-auto flex items-center justify-center">
            <Fingerprint className={`w-10 h-10 text-emerald-700 ${scanning ? 'animate-pulse' : ''}`} />
          </div>

          {matchedPerson ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                <CheckCircle2 size={15} />
                <span>Identity Verified ({matchedPerson.personType})</span>
              </div>
              <p className="text-sm font-black text-slate-900">{matchedPerson.fullName}</p>
              <p className="text-xs text-slate-600">
                ID: {matchedPerson.collegeNo || matchedPerson.studentId || matchedPerson.id}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Place thumb on the SecuGen scanner to verify student or staff identity against enrolled templates.
            </p>
          )}

          <button
            onClick={handleSpotVerify}
            disabled={scanning}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
          >
            {scanning ? 'Scanning Thumb...' : 'Scan & Verify Identity'}
          </button>
        </div>
      </div>
    </div>
  );
}
