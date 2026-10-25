import React, { useState, useEffect } from 'react';
import { ShieldCheck, Database, Fingerprint, Sparkles } from 'lucide-react';

interface PremiumLoadingScreenProps {
  brandingSettings: any;
  authLoading?: boolean;
  customMessage?: string;
  countdown?: number;
  userName?: string;
}

export default function PremiumLoadingScreen({
  brandingSettings,
  customMessage,
  userName,
}: PremiumLoadingScreenProps) {
  const collegeName = brandingSettings?.name || 'Superior College Jahanian';
  const logo = brandingSettings?.logo || '/superior-logo.png';
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((prev) => (prev < 92 ? prev + 14 : prev));
    }, 280);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#022822] via-[#053e35] to-[#064e43] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Subtle geometric background grid */}
      <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-20 h-20 mx-auto rounded-2xl p-0.5 bg-gradient-to-tr from-[#c9a84c] via-[#f7e096] to-[#b89437] shadow-xl">
          <div className="w-full h-full rounded-2xl bg-white p-2.5 flex items-center justify-center">
            <img src={logo} alt={collegeName} className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-[10px] font-black uppercase tracking-widest">
            <Sparkles size={11} />
            <span>Session 2026-28 Enterprise ERP</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {collegeName}
          </h2>
          <p className="text-xs text-emerald-100/80 font-medium">
            {customMessage ||
              (userName
                ? `Welcome back, ${userName} • Synchronizing workspace...`
                : 'Synchronizing encrypted campus ledgers & biometric vault...')}
          </p>
        </div>

        <div className="space-y-2">
          <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-300 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-emerald-200/75 font-mono">
            <span className="inline-flex items-center gap-1">
              <Database size={11} /> Cloud Ledger Connected
            </span>
            <span className="inline-flex items-center gap-1">
              <Fingerprint size={11} /> Biometrics Ready
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 inline-flex items-center gap-1.5 text-[11px] text-emerald-300/90 font-semibold">
          <ShieldCheck size={14} />
          <span>Superior College Jahanian • TLS 1.3</span>
        </div>
      </div>
    </div>
  );
}
