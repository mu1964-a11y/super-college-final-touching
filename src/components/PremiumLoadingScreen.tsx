import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface PremiumLoadingScreenProps {
  brandingSettings: any;
  countdown?: number;
  userName?: string;
}

export default function PremiumLoadingScreen({
  brandingSettings,
  userName,
}: PremiumLoadingScreenProps) {
  const collegeName = brandingSettings?.name || 'Superior College Jahanian';
  const logo = brandingSettings?.logo || '/superior-logo.png';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#022822] via-[#053e35] to-[#064e43] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-3 flex items-center justify-center shadow-2xl animate-pulse">
          <img src={logo} alt={collegeName} className="w-full h-full object-contain" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black tracking-tight">{collegeName}</h2>
          <p className="text-xs text-emerald-200/80">
            {userName ? `Welcome back, ${userName} • ` : ''}Synchronizing encrypted campus ledgers...
          </p>
        </div>
        <div className="w-48 h-1.5 bg-white/10 rounded-full mx-auto overflow-hidden">
          <div className="h-full w-2/3 bg-emerald-400 rounded-full animate-pulse" />
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300/80 font-medium">
          <ShieldCheck size={14} />
          <span>SCJ Cloud ERP Active</span>
        </div>
      </div>
    </div>
  );
}
