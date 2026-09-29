import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  MessageCircle, 
  FileText, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Shield, 
  Bot, 
  School,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    return 65;
  }, [countdown]);

  const activeMessage = customMessage || (
    authLoading 
      ? "Verifying institutional credentials..." 
      : LOADING_STATUS_MESSAGES[statusIndex]
  );

  return (
    <div className="min-h-screen w-full bg-[#fbfcfb] text-slate-800 flex flex-col justify-between p-4 sm:p-6 md:p-8 relative overflow-hidden select-none font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-teal-500/5 blur-[100px] pointer-events-none" />

      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER BRANDING & SESSION PILL */}
      {/* ------------------------------------------------------------- */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-7xl mx-auto flex items-center justify-between z-20"
      >
        {/* Left: College Crest & Brand Typography */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-[0_4px_20px_rgba(8,90,78,0.08)] border border-emerald-900/10 p-1 flex items-center justify-center shrink-0">
            {brandingSettings.logo ? (
              <img 
                src={brandingSettings.logo} 
                alt="Logo" 
                className="w-full h-full object-contain rounded-full" 
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#064e43] to-[#085a4e] flex items-center justify-center text-white">
                <School size={24} />
              </div>
            )}
          </div>
          <div>
            <h1 className="font-serif font-black text-xl md:text-2xl text-[#064e43] tracking-tight leading-none">
              Superior College
            </h1>
            <p className="font-sans font-bold text-xs md:text-sm text-[#085a4e]/85 tracking-wide mt-1">
              Jahanian Campus
            </p>
          </div>
        </div>

        {/* Right: Academic Session Pill */}
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200/80 px-4 py-2 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
          <span className="text-xs font-bold text-slate-700 tracking-wide">
            Academic Session 2026–28
          </span>
        </div>
      </motion.header>

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN CENTER HERO (EDITORIAL LEFT + 3D MOTIF RIGHT) */}
      {/* ------------------------------------------------------------- */}
      <main className="w-full max-w-7xl mx-auto my-auto py-6 sm:py-8 lg:py-12 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: Editorial Headline, 3D Feature Pills & Progress */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8 text-left">
            
            {/* Tag pill */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-[#e6f4ea] text-[#085a4e] px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-xs"
            >
              <span>YOUR CONNECTED CAMPUS</span>
            </motion.div>

            {/* Editorial Headline */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-1"
            >
              <h2 className="font-serif font-black text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] text-[#064e43] leading-[1.08] tracking-tight">
                A smarter campus.
              </h2>
              <h2 className="font-serif italic font-normal text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] text-[#085a4e] leading-[1.08] tracking-tight">
                A brighter future.
              </h2>
            </motion.div>

            {/* Subtitle */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-slate-600 text-sm sm:text-base lg:text-lg font-normal max-w-md leading-relaxed"
            >
              One place for academics, updates and everyday campus life.
            </motion.p>

            {/* Welcome back message if logged in */}
            {userName && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/60 text-xs font-semibold text-emerald-900"
              >
                <span>Welcome back, <strong className="font-black text-[#085a4e]">{userName}</strong></span>
              </motion.div>
            )}

            {/* 3 Neo-Morphic / 3D Feature Pills */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              {/* Feature 1: Nexus AI 360 */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#064e43] to-[#0d9488] flex items-center justify-center text-white shadow-xs">
                  <Sparkles size={16} className="text-amber-300" />
                </div>
                <span className="text-xs font-black text-slate-800">
                  Nexus AI 360°
                </span>
              </div>

              {/* Feature 2: WhatsApp Updates */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10b981] to-[#059669] flex items-center justify-center text-white shadow-xs">
                  <MessageCircle size={16} />
                </div>
                <span className="text-xs font-black text-slate-800">
                  WhatsApp updates
                </span>
              </div>

              {/* Feature 3: Digital Slips */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f59e0b] to-[#d97706] flex items-center justify-center text-white shadow-xs">
                  <FileText size={16} />
                </div>
                <span className="text-xs font-black text-slate-800">
                  Digital slips
                </span>
              </div>
            </motion.div>

            {/* Dynamic Progress Engine */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="space-y-3 pt-3"
            >
              {/* Pulsing Dot + Live Status Message */}
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-700">
                <div className="relative flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#085a4e]" />
                </div>
                
                <div className="h-5 flex items-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={activeMessage}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3 }}
                      className="font-bold text-[#064e43]"
                    >
                      {activeMessage}
                    </motion.span>
                  </AnimatePresence>
                </div>

                {countdown > 0 && (
                  <span className="ml-auto text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {countdown}s
                  </span>
                )}
              </div>

              {/* High-End Dual-Tone Gradient Progress Bar */}
              <div className="w-full max-w-md h-2.5 bg-slate-200/60 rounded-full overflow-hidden p-0.5 border border-slate-200/80 relative shadow-inner">
                {countdown > 0 ? (
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#085a4e] via-[#0d9488] to-[#eab308] rounded-full shadow-[0_0_12px_rgba(8,90,78,0.3)] relative overflow-hidden"
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    {/* Shimmer light reflection */}
                    <motion.div
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-1/2"
                    />
                  </motion.div>
                ) : (
                  <div className="w-full h-full relative overflow-hidden rounded-full">
                    <motion.div
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                      className="w-1/2 h-full bg-gradient-to-r from-[#085a4e] via-[#0d9488] to-[#eab308] rounded-full shadow-[0_0_12px_rgba(8,90,78,0.3)]"
                    />
                  </div>
                )}
              </div>

              {/* Sub-caption */}
              <p className="text-slate-400 text-xs font-medium tracking-wide">
                Bringing your campus together.
              </p>
            </motion.div>

          </div>

          {/* RIGHT COLUMN: 3D Visual Composition Motif */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            
            {/* Ambient Circular Glow */}
            <div className="absolute w-[350px] sm:w-[480px] h-[350px] sm:h-[480px] rounded-full bg-gradient-to-tr from-emerald-100/40 via-teal-50/50 to-amber-50/40 blur-2xl -z-10" />

            {/* 3D Composition Frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative w-full max-w-[540px] aspect-[16/11] sm:aspect-[16/10] rounded-[2.5rem] overflow-hidden flex items-center justify-center"
            >
              {/* The 3D Artwork Layer (Cropped to highlight books, graduation cap, podium, pen, calendar) */}
              <img
                src="/images/loading-hero-3d.jpg"
                alt="Superior College Academic 3D Composition"
                className="w-full h-full object-cover object-[84%_center] scale-[1.03] select-none pointer-events-none drop-shadow-md rounded-[2.5rem]"
              />

              {/* Smooth inward gradient blend to fuse with the cream canvas */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#fbfcfb] via-transparent to-transparent w-1/5 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#fbfcfb] via-[#fbfcfb]/50 to-transparent pointer-events-none" />

              {/* Floating 3D Map Pin Badge (Jahanian Main Campus) */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: [0, -6, 0] }}
                transition={{ 
                  opacity: { duration: 0.5, delay: 0.6 },
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }
                }}
                className="absolute bottom-5 sm:bottom-7 right-4 sm:right-6 bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-2.5 sm:p-3 shadow-[0_12px_32px_rgba(8,90,78,0.12)] flex items-center gap-3 z-20"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#064e43] to-[#0d9488] flex items-center justify-center text-white shadow-xs">
                  <MapPin size={18} className="text-emerald-200" />
                </div>
                <div className="text-left pr-2">
                  <p className="font-serif font-black text-sm text-[#064e43] leading-tight">
                    Jahanian
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-500">
                    Main Campus
                  </p>
                </div>
              </motion.div>

              {/* Floating Mini 2026 Academic Chip on top left of 3D image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, y: [0, 5, 0] }}
                transition={{ 
                  opacity: { duration: 0.5, delay: 0.7 },
                  y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }
                }}
                className="absolute top-4 left-4 sm:left-6 bg-white/90 backdrop-blur-md border border-white/80 rounded-xl px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] flex items-center gap-2 z-20"
              >
                <GraduationCap size={14} className="text-[#085a4e]" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                  Knowledge &bull; Tomorrow
                </span>
              </motion.div>

            </motion.div>

          </div>

        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* 3. FOOTER INFO & SECURITY */}
      {/* ------------------------------------------------------------- */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-200/50 text-[11px] font-semibold text-slate-400 z-20"
      >
        <div>
          <span>Superior College Jahanian</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-500">
          <Shield size={12} className="text-[#085a4e]" />
          <span>256-Bit TLS 1.3 Certified &bull; Intelligent Academic Operating Cloud</span>
        </div>

        <div>
          <span>Academic Portal &bull; 2026–28</span>
        </div>
      </motion.footer>
    </div>
  );
}
