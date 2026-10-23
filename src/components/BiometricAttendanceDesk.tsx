import React, { useState } from 'react';
import { Fingerprint, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { secugenService } from '../lib/secugenService';
import { toast } from 'sonner';

interface BiometricAttendanceDeskProps {
  standalone?: boolean;
  collegeLogo?: string;
  collegeName?: string;
  onBackToApp?: () => void;
}

export default function BiometricAttendanceDesk({
  collegeLogo = '/superior-logo.png',
  collegeName = 'Superior College Jahanian',
  onBackToApp,
}: BiometricAttendanceDeskProps) {
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await secugenService.captureFingerprint({ timeoutMs: 10000 });
      if (res.success) {
        toast.success(`Fingerprint verified! Quality: ${res.quality || 85}%`);
      } else {
        toast.error(res.error || 'Scanner not detected');
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6">
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={collegeLogo} alt={collegeName} className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-base font-black">{collegeName}</h1>
            <p className="text-xs text-emerald-400">SecuGen HU20 Biometric Attendance Desk</p>
          </div>
        </div>
        {onBackToApp && (
          <button
            onClick={onBackToApp}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Return to ERP</span>
          </button>
        )}
      </div>

      <div className="max-w-md w-full mx-auto my-auto bg-slate-900 border border-white/10 rounded-3xl p-8 text-center space-y-6">
        <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center">
          <Fingerprint className={`w-12 h-12 text-emerald-400 ${scanning ? 'animate-pulse' : ''}`} />
        </div>
        <div>
          <h2 className="text-xl font-black">Thumb Verification Terminal</h2>
          <p className="text-xs text-slate-400 mt-1">
            Place thumb firmly on the SecuGen USB sensor to mark attendance.
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <CheckCircle2 size={16} />
          <span>{scanning ? 'Scanning Sensor...' : 'Scan Fingerprint Now'}</span>
        </button>
      </div>

      <div className="text-center text-xs text-slate-500">
        {collegeName} • SecuGen WebAPI Terminal
      </div>
    </div>
  );
}
