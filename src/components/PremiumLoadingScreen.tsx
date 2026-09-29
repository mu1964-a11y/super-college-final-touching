import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Wallet, 
  Shield, 
  School,
  GraduationCap,
  Sparkles,
  MessageCircle,
  FileText,
  Lock,
  Wifi
} from 'lucide-react';
import AcademicCanvasBackground from './AcademicCanvasBackground';

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
  const progressPercent = useMemo(() => {
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
    return 72;
  }, [countdown]);

  const activeMessage = customMessage || (
    authLoading 
      ? "Verifying institutional credentials..." 
      : LOADING_STATUS_MESSAGES[statusIndex]
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-5 lg:p-7 font-sans select-none relative overflow-x-hidden overflow-y-auto text-slate-800">
      {/* 1. EXACT CAMPUS BACKGROUND AS IN SCREENSHOT 1 (Real Campus Photo + Bottom Wave) */}
      <AcademicCanvasBackground logo={brandingSettings.logo} />

      {/* 2. MASTER CONTAINER - EXACT SAME SIZE & PROPORTIONS AS SIGN-IN SCREENSHOT 1 */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[1140px] xl:max-w-[1180px] mx-auto rounded-3xl sm:rounded-[2.25rem] bg-white border border-slate-200/90 shadow-[0_25px_80px_rgba(0,0,0,0.22)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] lg:min-h-[600px]"
      >
        {/* ============================================================== */}
        {/* LEFT PANEL (approx 40% - 5 cols): Deep Superior Emerald Canvas */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#064e43] via-[#053e35] to-[#022822] p-7 sm:p-9 lg:p-10 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Subtle Background Watermark & Dot Grid */}
          <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          <div className="absolute top-1/4 right-0 w-80 h-80 opacity-[0.08] pointer-events-none text-white flex items-center justify-center">
            <GraduationCap size={320} className="stroke-[1]" />
          </div>
          <div className="absolute -top-16 -left-16 w-60 h-60 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* Top Bar: Active Status Badge & TLS 1.3 */}
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-bold shadow-sm backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Campus Workspace</span>
              </div>

              <span className="text-[10px] font-mono text-emerald-200 tracking-wider">
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
            <div className="mb-7">
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

            {/* 3 Pillars (Matching SS1 Exactly) */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center text-emerald-200 mb-2 shadow-inner">
                  <Users size={18} />
                </div>
                <h4 className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                  Total Student Enrollment
                </h4>
                <p className="text-[9.5px] sm:text-[10px] text-emerald-200/70 mt-1 leading-snug">
                  Active Enrolled Scholars Monitored
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center text-emerald-200 mb-2 shadow-inner">
                  <Wallet size={18} />
                </div>
                <h4 className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                  Double-Entry Ledger
                </h4>
                <p className="text-[9.5px] sm:text-[10px] text-emerald-200/70 mt-1 leading-snug">
                  Cashbook & Fee Clearance Audited
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center text-emerald-200 mb-2 shadow-inner">
                  <Shield size={18} />
                </div>
                <h4 className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                  System Security Node
                </h4>
                <p className="text-[9.5px] sm:text-[10px] text-emerald-200/70 mt-1 leading-snug">
                  End-to-End Cryptographic Protection
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Slogan Line (Matching SS1) */}
          <div className="relative z-10 pt-5 mt-5 border-t border-emerald-700/40 text-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-200/60 uppercase tracking-[0.25em]">
              &mdash;&mdash; EMPOWERING BRIGHTER TOMORROWS &mdash;&mdash;
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT PANEL (approx 60% - 7 cols): Crisp White Loading Studio  */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 bg-white p-7 sm:p-9 lg:p-11 flex flex-col justify-between relative">
          {/* Top Status Indicators Row (Matching SS1 Right Panel Header) */}
          <div className="w-full flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] sm:text-xs font-semibold text-emerald-900 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Academic Systems Operational</span>
            </div>

            <div className="flex items-center gap-3 text-slate-500 text-[11px] sm:text-xs font-medium">
              <span className="inline-flex items-center gap-1 text-slate-600">
                <Lock size={13} className="text-emerald-700" />
                <span>Secure Access</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-slate-400">
                <Wifi size={12} className="text-emerald-700" />
                <span>TLS 1.3 Encrypted</span>
              </span>
            </div>
          </div>

          {/* Center Loading Studio (Editorial Elegance + Features + Progress) */}
          <div className="my-auto py-6 sm:py-8 flex flex-col items-center text-center max-w-lg mx-auto w-full">
            {/* Pill Tag */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-1.5 bg-[#e6f4ea] text-[#085a4e] px-3.5 py-1.5 rounded-full text-[10.5px] font-black uppercase tracking-[0.18em] shadow-xs mb-3"
            >
              <Sparkles size={12} className="text-amber-500" />
              <span>YOUR CONNECTED CAMPUS</span>
            </motion.div>

            {/* Editorial Headline */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-0.5 mb-2"
            >
              <h2 className="font-serif font-black text-3xl sm:text-4xl text-[#064e43] leading-tight tracking-tight">
                A smarter campus.
              </h2>
              <h2 className="font-serif italic font-normal text-3xl sm:text-4xl text-[#085a4e] leading-tight tracking-tight">
                A brighter future.
              </h2>
            </motion.div>

            {/* Subtitle */}
            <p className="text-slate-500 text-xs sm:text-sm font-normal max-w-md mx-auto leading-relaxed mb-6">
              One place for academics, updates and everyday campus life.
            </p>

            {/* 3 Neo-Morphic Feature Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-7 w-full">
              {/* Feature 1: Nexus AI 360 */}
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#064e43] to-[#0d9488] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Sparkles size={13} className="text-amber-300" />
                </div>
                <span className="text-xs font-black text-slate-800">
                  Nexus AI 360°
                </span>
              </div>

              {/* Feature 2: WhatsApp Updates */}
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#10b981] to-[#059669] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <MessageCircle size={13} />
                </div>
                <span className="text-xs font-black text-slate-800">
                  WhatsApp updates
                </span>
              </div>

              {/* Feature 3: Digital Slips */}
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#f59e0b] to-[#d97706] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <FileText size={13} />
                </div>
                <span className="text-xs font-black text-slate-800">
                  Digital slips
                </span>
              </div>
            </div>

            {/* Dynamic Progress Engine */}
            <div className="w-full max-w-md space-y-2.5">
              {/* Status Message + Dot */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                <div className="flex items-center gap-2 overflow-hidden text-left">
                  <div className="relative flex items-center justify-center shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#085a4e]" />
                  </div>
                  
                  <div className="h-5 flex items-center overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={activeMessage}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.25 }}
                        className="font-bold text-[#064e43] text-xs truncate max-w-[320px]"
                      >
                        {activeMessage}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>

                {countdown > 0 && (
                  <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                    {countdown}s
                  </span>
                )}
              </div>

              {/* Premium Gradient Progress Bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/70 relative shadow-inner">
                {countdown > 0 ? (
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#085a4e] via-[#0d9488] to-[#eab308] rounded-full shadow-[0_0_12px_rgba(8,90,78,0.3)] relative overflow-hidden"
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  >
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
                      className="w-1/2 h-full bg-gradient-to-r from-[#085a4e] via-[#0d9488] to-[#eab308] rounded-full shadow-[0_0_12px_rgba(8,90,78,0.3)]"
                    />
                  </div>
                )}
              </div>

              {/* Sub-caption */}
              <p className="text-slate-400 text-[11px] font-medium tracking-wide">
                Bringing your campus together.
              </p>
            </div>
          </div>

          {/* Bottom Card Footer (Matching SS1 Right Panel Footer) */}
          <div className="w-full pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <span>&copy; 2026 Superior College Jahanian. All rights reserved.</span>
            <span className="font-medium text-slate-500">Session 2026-28</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
