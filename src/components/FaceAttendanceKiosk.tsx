import React, { useState } from 'react';
import { Camera, ArrowLeft, CheckCircle2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface FaceAttendanceKioskProps {
  standalone?: boolean;
  collegeLogo?: string;
  collegeName?: string;
  onBackToApp?: () => void;
  data?: any;
}

export default function FaceAttendanceKiosk({
  collegeLogo = '/superior-logo.png',
  collegeName = 'Superior College Jahanian',
  onBackToApp,
}: FaceAttendanceKioskProps) {
  const [rollSearch, setRollSearch] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6">
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={collegeLogo} alt={collegeName} className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-base font-black">{collegeName}</h1>
            <p className="text-xs text-emerald-400">AI Smart Gate Face Attendance Kiosk</p>
          </div>
        </div>
        {onBackToApp && (
          <button
            onClick={onBackToApp}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Exit Kiosk</span>
          </button>
        )}
      </div>

      <div className="max-w-xl w-full mx-auto my-auto bg-slate-900 border border-white/10 rounded-3xl p-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center">
          <Camera className="w-10 h-10 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-black">Smart Gate Check-In Ready</h2>
          <p className="text-xs text-slate-400 mt-1">
            Position student in front of camera or enter Roll Number below for instant check-in.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={rollSearch}
              onChange={(e) => setRollSearch(e.target.value)}
              placeholder="Enter Roll Number..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
            />
          </div>
          <button
            onClick={() => {
              if (!rollSearch.trim()) return;
              toast.success(`Check-in recorded for Roll No: ${rollSearch}`);
              setRollSearch('');
            }}
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>Check In</span>
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500">
        {collegeName} • Biometric & AI Gate Terminal
      </div>
    </div>
  );
}
