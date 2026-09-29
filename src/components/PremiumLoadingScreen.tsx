import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Wallet, 
  Shield, 
  School,
  GraduationCap,
  Sparkles
} from 'lucide-react';

interface PremiumLoadingScreenProps {
  brandingSettings?: {
    name?: string;
    logo?: string;
  };
  authLoading?: boolean;
  countdown?: number;
  userName?: string;
  customMessage?: string;
}

const LOADING_STATUS_MESSAGES = [
  "Preparing your campus workspace...",
  "Connecting secure academic database...",
  "Loading student records & faculty directory...",
  "Initializing Nexus AI 360° & WhatsApp Gateway...",
  "Finalizing campus security protocols..."
];

export default function PremiumLoadingScreen({
  brandingSettings = {},
  authLoading = false,
  countdown = 0,
  userName,
  customMessage
}: PremiumLoadingScreenProps) {
  const [statusIndex, setStatusIndex] = useState(0);

  // Smoothly cycle status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex(prev => (prev + 1) % LOADING_STATUS_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Compute progress percentage
  const progressPercent = React.useMemo(() => {
    if (countdown > 0) {
      const map: Record<number, number> = {
        5: 22,
        4: 45,
        3: 72,
        2: 88,
        1: 96,
        0: 100
      };
      return map[countdown] || 25;
    }
    return 70;
  }, [countdown]);

  const activeMessage = customMessage || (
    authLoading 
      ? "Verifying institutional credentials..." 
      : LOADING_STATUS_MESSAGES[statusIndex]
  );

  return (
    <div className="min-h-screen w-full bg-[#011712] text-white flex items-center justify-center p-3 sm:p-5 md:p-7 relative overflow-hidden select-none font-sans">
      {/* Deep atmospheric ambient glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[#085a4e]/20 blur-[130px] pointer-events-none" />

      {/* ------------------------------------------------------------- */}
      {/* CENTERED FLOATING CARD (MATCHING LOGIN PANEL IN COLOR & SIZE) */}
      {/* ------------------------------------------------------------- */}
      <motion.div 
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[560px] bg-gradient-to-br from-[#064e43] via-[#053e35] to-[#022822] rounded-3xl sm:rounded-[2.25rem] border border-emerald-500/30 shadow-[0_25px_80px_rgba(0,0,0,0.6)] p-7 sm:p-9 lg:p-10 flex flex-col justify-between text-white relative overflow-hidden z-10"
      >
        {/* Subtle Background Watermark & Dot Grid Pattern */}
        <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-80 h-80 opacity-[0.08] pointer-events-none text-white flex items-center justify-center">
          <GraduationCap size={320} className="stroke-[1]" />
        </div>
        <div className="absolute -top-16 -left-16 w-60 h-60 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Top Status Bar: Return/Status Badge & TLS Tag */}
          <div className="flex items-center justify-between mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-bold shadow-sm backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Campus Workspace</span>
            </div>

            <span className="text-[10px] font-mono text-emerald-200 tracking-wider bg-white/10 px-2.5 py-1 rounded-full border border-white/15 backdrop-blur-md">
              TLS 1.3 SECURE
            </span>
          </div>

          {/* Brand Identity Lockup */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#c9a84c] via-[#f7e096] to-[#b89437] shadow-lg flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                {brandingSettings.logo ? (
                  <img
                    src={brandingSettings.logo}
                    alt="Logo"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <School size={22} className="text-[#053229]" />
                )}
              </div>
            </div>
            <div>
              <h2 className="text-xs sm:text-[13px] font-black text-white uppercase tracking-wider leading-snug">
                {brandingSettings.name || "SUPERIOR COLLEGE JAHANIAN"}
              </h2>
              <p className="text-[10px] sm:text-[11px] font-semibold text-amber-200/90 tracking-wide">
                Jahanian Campus &bull; Academic Portal
              </p>
            </div>
          </div>

          {/* Welcome Role Header & Description */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-black tracking-tight text-white leading-tight">
              Welcome to{" "}
              <span className="text-[#f5d47a] block sm:inline">
                {userName ? `${userName}'s Workspace.` : "Academic Console."}
              </span>
            </h1>
            <p className="text-xs sm:text-[13px] text-emerald-100/85 mt-2.5 leading-relaxed max-w-md">
              Authorized personnel access. Managing admissions pipelines, double-entry cashbooks, and campus records.
            </p>
          </div>

          {/* 3 Role-Specific Feature Pillars (Exact SS1 Icons & Styling) */}
          <div className="grid grid-cols-3 gap-3 pt-1 mb-6">
            {/* Pillar 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-full bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center text-emerald-200 mb-2 shadow-inner">
                <Users size={19} />
              </div>
              <h4 className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                Total Student Enrollment
              </h4>
              <p className="text-[9.5px] sm:text-[10px] text-emerald-200/70 mt-1 leading-snug">
                Active Enrolled Scholars Monitored
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-full bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center text-emerald-200 mb-2 shadow-inner">
                <Wallet size={19} />
              </div>
              <h4 className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                Double-Entry Ledger
              </h4>
              <p className="text-[9.5px] sm:text-[10px] text-emerald-200/70 mt-1 leading-snug">
                Cashbook & Fee Clearance Audited
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-full bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center text-emerald-200 mb-2 shadow-inner">
                <Shield size={19} />
              </div>
              <h4 className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                System Security Node
              </h4>
              <p className="text-[9.5px] sm:text-[10px] text-emerald-200/70 mt-1 leading-snug">
                End-to-End Cryptographic Protection
              </p>
            </div>
          </div>

          {/* Dynamic Loading Progress Engine */}
          <div className="space-y-2.5 my-3 pt-3 border-t border-emerald-700/40">
            {/* Live Status Row */}
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-100 px-0.5">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="relative flex items-center justify-center shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f5d47a]" />
                </div>
                
                <div className="h-5 flex items-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={activeMessage}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.25 }}
                      className="font-bold text-amber-200 text-xs truncate max-w-[340px]"
                    >
                      {activeMessage}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>

              {countdown > 0 && (
                <span className="text-xs font-mono font-black text-[#053229] bg-gradient-to-r from-[#fef08a] to-[#eab308] px-2 py-0.5 rounded-md shadow-xs shrink-0">
                  {countdown}s
                </span>
              )}
            </div>

            {/* Gold Metallic Shimmer Progress Bar */}
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-emerald-500/30 shadow-inner relative">
              {countdown > 0 ? (
                <motion.div
                  className="h-full bg-gradient-to-r from-[#c9a84c] via-[#f7e096] to-[#b89437] rounded-full shadow-[0_0_14px_rgba(201,168,76,0.6)] relative overflow-hidden"
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  {/* Shimmer light reflection beam */}
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-1/2"
                  />
                </motion.div>
              ) : (
                <div className="w-full h-full relative overflow-hidden rounded-full">
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-1/2 h-full bg-gradient-to-r from-[#c9a84c] via-[#f7e096] to-[#b89437] rounded-full shadow-[0_0_14px_rgba(201,168,76,0.6)]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-emerald-200/70 pt-0.5">
              <span>Bringing your campus together</span>
              <span className="font-mono text-emerald-300/80">256-Bit TLS 1.3</span>
            </div>
          </div>
        </div>

        {/* Bottom Slogan Line (Matching SS1 exactly) */}
        <div className="relative z-10 pt-4 mt-2 border-t border-emerald-700/40 text-center flex flex-col items-center gap-1">
          <span className="text-[9.5px] sm:text-[10px] font-bold text-emerald-200/60 uppercase tracking-[0.25em]">
            &mdash;&mdash; EMPOWERING BRIGHTER TOMORROWS &mdash;&mdash;
          </span>
          <span className="text-[9px] text-emerald-300/40 tracking-wider">
            Academic Session 2026-28 &bull; Superior College Jahanian
          </span>
        </div>
      </motion.div>
    </div>
  );
}
