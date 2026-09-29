import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  MessageCircle, 
  FileText, 
  Shield, 
  School
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
    return 68;
  }, [countdown]);

  const activeMessage = customMessage || (
    authLoading 
      ? "Verifying institutional credentials..." 
      : LOADING_STATUS_MESSAGES[statusIndex]
  );

  return (
    <div className="min-h-screen w-full bg-[#fbfcfb] text-slate-800 flex items-center justify-center p-3 sm:p-5 md:p-6 relative overflow-hidden select-none font-sans">
      {/* Subtle ambient background glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[450px] h-[450px] rounded-full bg-teal-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 [background-image:radial-gradient(rgba(8,90,78,0.03)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      {/* ------------------------------------------------------------- */}
      {/* CENTERED FLOATING CARD (MATCHING LOGIN SCREEN CARD DIMENSIONS) */}
      {/* ------------------------------------------------------------- */}
      <motion.div 
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[540px] bg-white/95 rounded-[2.25rem] sm:rounded-[2.5rem] border border-slate-200/90 shadow-[0_20px_60px_rgba(8,90,78,0.12)] p-6 sm:p-8 backdrop-blur-2xl relative overflow-hidden flex flex-col items-center text-center z-10"
      >
        {/* Subtle decorative inner corner glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* 1. TOP HEADER BRANDING */}
        <div className="w-full flex items-center justify-between pb-3.5 mb-2 border-b border-slate-100/90">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-[0_3px_12px_rgba(8,90,78,0.12)] border border-emerald-900/10 p-0.5 flex items-center justify-center shrink-0">
              {brandingSettings.logo ? (
                <img 
                  src={brandingSettings.logo} 
                  alt="Logo" 
                  className="w-full h-full object-contain rounded-full" 
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#064e43] to-[#085a4e] flex items-center justify-center text-white">
                  <School size={18} />
                </div>
              )}
            </div>
            <div>
              <h1 className="font-serif font-black text-xs sm:text-sm text-[#064e43] tracking-tight leading-none">
                Superior College
              </h1>
              <p className="font-sans font-bold text-[10px] text-[#085a4e]/80 tracking-wider mt-0.5 uppercase">
                Jahanian Campus
              </p>
            </div>
          </div>

          {/* Session Pill */}
          <div className="flex items-center gap-1.5 bg-emerald-50/90 border border-emerald-200/70 px-3 py-1 rounded-full shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse" />
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-900 tracking-wide">
              Session 2026–28
            </span>
          </div>
        </div>

        {/* 2. 3D ACADEMIC MOTIF (HANDCRAFTED SVG/CSS 3D COMPOSITION: BOOKS, CAP, ORB, CALENDAR) */}
        <div className="w-full relative flex items-center justify-center my-1 select-none">
          <motion.div 
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-full max-w-[400px] h-[165px] sm:h-[180px] relative flex items-center justify-center"
          >
            <svg 
              viewBox="0 0 400 210" 
              className="w-full h-full drop-shadow-sm overflow-visible"
            >
              <defs>
                {/* Book 1 (Knowledge) Gradients */}
                <linearGradient id="emeraldSpine" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#04322a" />
                  <stop offset="35%" stopColor="#085a4e" />
                  <stop offset="100%" stopColor="#05453b" />
                </linearGradient>
                <linearGradient id="emeraldCover" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#085a4e" />
                  <stop offset="50%" stopColor="#064e43" />
                  <stop offset="100%" stopColor="#033029" />
                </linearGradient>

                {/* Book 2 (A Brighter Tomorrow) Gradients */}
                <linearGradient id="tealSpine" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0369a1" />
                  <stop offset="35%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#0f766e" />
                </linearGradient>
                <linearGradient id="tealCover" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="60%" stopColor="#0e7490" />
                  <stop offset="100%" stopColor="#085a4e" />
                </linearGradient>

                {/* Page stack gradient */}
                <linearGradient id="paperPages" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e2d8c3" />
                  <stop offset="50%" stopColor="#fdfbf7" />
                  <stop offset="100%" stopColor="#eee5d3" />
                </linearGradient>

                {/* Gold foil metallic gradient */}
                <linearGradient id="goldFoil" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="40%" stopColor="#eab308" />
                  <stop offset="70%" stopColor="#ca8a04" />
                  <stop offset="100%" stopColor="#fef08a" />
                </linearGradient>

                {/* Graduation cap gradient */}
                <linearGradient id="capGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#061c16" />
                </linearGradient>

                {/* Iridescent glowing orb gradient */}
                <radialGradient id="orbGlow" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="25%" stopColor="#a7f3d0" stopOpacity="0.85" />
                  <stop offset="60%" stopColor="#14b8a6" stopOpacity="0.8" />
                  <stop offset="85%" stopColor="#0284c7" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#064e43" stopOpacity="0.95" />
                </radialGradient>

                {/* Soft ground shadow blur */}
                <filter id="softGroundShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" />
                </filter>
                <filter id="glowFilt" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 3D Realistic Ground Shadow */}
              <ellipse 
                cx="205" 
                cy="185" 
                rx="145" 
                ry="18" 
                fill="#085a4e" 
                opacity="0.14" 
                filter="url(#softGroundShadow)" 
              />

              {/* ========================================================= */}
              {/* BOTTOM BOOK: "KNOWLEDGE" (EMERALD GREEN & GOLD ACCENTS) */}
              {/* ========================================================= */}
              <g id="bottom-book-knowledge">
                {/* Bottom Cover Shadow & Base Plate */}
                <polygon 
                  points="80,158 92,184 308,162 300,136" 
                  fill="#03251f" 
                  opacity="0.6" 
                />

                {/* Paper Pages Block (Front & Right side edges) */}
                <polygon 
                  points="94,180 304,158 304,144 94,166" 
                  fill="url(#paperPages)" 
                />
                {/* Stack page lines */}
                <line x1="96" y1="169" x2="302" y2="147" stroke="#d5c8b2" strokeWidth="0.8" opacity="0.7" />
                <line x1="95" y1="172" x2="303" y2="150" stroke="#d5c8b2" strokeWidth="0.8" opacity="0.7" />
                <line x1="95" y1="176" x2="303" y2="154" stroke="#d5c8b2" strokeWidth="0.8" opacity="0.7" />

                {/* Curved Book Spine (Left) */}
                <path 
                  d="M 80,152 C 70,155 68,172 78,180 L 95,182 L 95,154 Z" 
                  fill="url(#emeraldSpine)" 
                />
                {/* Spine gold rib lines */}
                <path d="M 75,160 Q 82,161 88,159" stroke="url(#goldFoil)" strokeWidth="1.5" fill="none" opacity="0.85" />
                <path d="M 74,167 Q 82,168 89,166" stroke="url(#goldFoil)" strokeWidth="1.5" fill="none" opacity="0.85" />
                <path d="M 76,174 Q 83,175 90,173" stroke="url(#goldFoil)" strokeWidth="1.5" fill="none" opacity="0.85" />

                {/* Top Cover Surface (Emerald with gold embossing) */}
                <polygon 
                  points="78,152 288,131 312,143 95,166" 
                  fill="url(#emeraldCover)" 
                  stroke="#054238" 
                  strokeWidth="1" 
                />

                {/* Gold Embossed Spine Border & Title */}
                <line x1="98" y1="164" x2="304" y2="143" stroke="url(#goldFoil)" strokeWidth="1.2" opacity="0.8" />
                <line x1="84" y1="154" x2="284" y2="134" stroke="url(#goldFoil)" strokeWidth="0.8" opacity="0.5" />
                
                {/* "KNOWLEDGE" Embossed Gold Text */}
                <text 
                  x="192" 
                  y="153" 
                  transform="rotate(-5.8 192 153)" 
                  fill="url(#goldFoil)" 
                  fontSize="10" 
                  fontWeight="900" 
                  letterSpacing="3.5" 
                  textAnchor="middle"
                  filter="url(#glowFilt)"
                >
                  KNOWLEDGE
                </text>
              </g>

              {/* ========================================================= */}
              {/* TOP BOOK: "A BRIGHTER TOMORROW" (TEAL/AZURE & SILK RIBBON) */}
              {/* ========================================================= */}
              <g id="top-book-brighter-tomorrow">
                {/* Paper Pages Block */}
                <polygon 
                  points="110,154 316,134 316,122 110,142" 
                  fill="url(#paperPages)" 
                />
                <line x1="112" y1="145" x2="314" y2="125" stroke="#d5c8b2" strokeWidth="0.8" opacity="0.7" />
                <line x1="111" y1="149" x2="315" y2="129" stroke="#d5c8b2" strokeWidth="0.8" opacity="0.7" />

                {/* Curved Book Spine (Left) */}
                <path 
                  d="M 96,126 C 87,130 86,145 96,152 L 112,154 L 112,128 Z" 
                  fill="url(#tealSpine)" 
                />
                {/* Spine gold bands */}
                <path d="M 91,133 Q 98,134 105,132" stroke="url(#goldFoil)" strokeWidth="1.5" fill="none" opacity="0.85" />
                <path d="M 92,140 Q 99,141 106,139" stroke="url(#goldFoil)" strokeWidth="1.5" fill="none" opacity="0.85" />
                <path d="M 94,147 Q 100,148 108,146" stroke="url(#goldFoil)" strokeWidth="1.5" fill="none" opacity="0.85" />

                {/* Top Cover Surface */}
                <polygon 
                  points="96,126 302,106 324,118 112,140" 
                  fill="url(#tealCover)" 
                  stroke="#026d85" 
                  strokeWidth="1" 
                />

                {/* Gold Embossed Foil Frame on Cover */}
                <polygon 
                  points="108,129 292,111 310,121 122,139" 
                  fill="none" 
                  stroke="url(#goldFoil)" 
                  strokeWidth="0.9" 
                  opacity="0.8" 
                />

                {/* "A BRIGHTER TOMORROW" Embossed Text */}
                <text 
                  x="208" 
                  y="127" 
                  transform="rotate(-5.5 208 127)" 
                  fill="url(#goldFoil)" 
                  fontSize="8.5" 
                  fontWeight="900" 
                  letterSpacing="2.2" 
                  textAnchor="middle"
                  filter="url(#glowFilt)"
                >
                  A BRIGHTER TOMORROW
                </text>

                {/* Silk Crimson Bookmark Ribbon Draping Down */}
                <path 
                  d="M 270,110 Q 284,128 278,160 L 285,164 L 288,150 L 280,111 Z" 
                  fill="#dc2626" 
                  opacity="0.95" 
                />
                <polygon points="278,160 285,164 281,154" fill="#991b1b" />
              </g>

              {/* ========================================================= */}
              {/* GRADUATION MORTARBOARD CAP (FLOATING ELEGANTLY ON TOP) */}
              {/* ========================================================= */}
              <g id="graduation-mortarboard">
                {/* Cap Skull Base */}
                <path 
                  d="M 195,68 Q 228,82 260,68 L 260,80 Q 228,95 195,80 Z" 
                  fill="#031f18" 
                />

                {/* Diamond Cap Top (Glossy 3D Finish) */}
                <polygon 
                  points="155,56 228,36 300,56 228,76" 
                  fill="url(#capGradient)" 
                  stroke="#085a4e" 
                  strokeWidth="1.5" 
                />

                {/* Top Subtle Gloss Reflection */}
                <polygon 
                  points="165,55 228,38 275,52 228,68" 
                  fill="white" 
                  opacity="0.08" 
                />

                {/* Gold Button at Center */}
                <circle cx="228" cy="56" r="4.5" fill="url(#goldFoil)" stroke="#b45309" strokeWidth="0.8" />

                {/* Swaying Golden Tassel */}
                <path 
                  d="M 228,56 C 255,62 272,70 275,98" 
                  stroke="url(#goldFoil)" 
                  strokeWidth="2.8" 
                  fill="none" 
                  strokeLinecap="round" 
                />
                {/* Tassel Fringe & Ring */}
                <circle cx="275" cy="98" r="3" fill="#d97706" />
                <polygon points="271,98 279,98 281,114 269,114" fill="url(#goldFoil)" />
              </g>

              {/* ========================================================= */}
              {/* GLOWING IRIDESCENT ORB / CRYSTAL SPHERE */}
              {/* ========================================================= */}
              <g id="iridescent-orb" transform="translate(325, 62)">
                {/* Outer Glow Halo */}
                <circle cx="0" cy="0" r="26" fill="#10b981" opacity="0.2" filter="url(#glowFilt)" />
                {/* Main Orb Body */}
                <circle cx="0" cy="0" r="21" fill="url(#orbGlow)" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
                {/* Primary Specular Highlight */}
                <ellipse cx="-6" cy="-7" rx="7" ry="4" fill="white" opacity="0.85" transform="rotate(-30 -6 -7)" />
                <circle cx="6" cy="7" r="2.5" fill="white" opacity="0.4" />
              </g>

              {/* ========================================================= */}
              {/* MINI CAMPUS CALENDAR BADGE (FLOATING ON THE LEFT) */}
              {/* ========================================================= */}
              <g id="calendar-badge" transform="translate(68, 64)">
                {/* Drop shadow */}
                <rect x="0" y="3" width="46" height="48" rx="10" fill="#085a4e" opacity="0.12" filter="url(#glowFilt)" />
                {/* White Card Container */}
                <rect x="0" y="0" width="46" height="48" rx="10" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.2" />
                {/* Header (Superior Emerald) */}
                <path d="M 0,10 C 0,4.5 4.5,0 10,0 L 36,0 C 41.5,0 46,4.5 46,10 L 46,15 L 0,15 Z" fill="#085a4e" />
                <text x="23" y="11" fill="white" fontSize="7.5" fontWeight="900" letterSpacing="1" textAnchor="middle">SCJ</text>
                {/* Spiral Rings */}
                <circle cx="12" cy="0" r="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                <circle cx="34" cy="0" r="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                {/* Day / Session Number "28" */}
                <text x="23" y="35" fill="#064e43" fontSize="17" fontWeight="900" textAnchor="middle">28</text>
                <text x="23" y="43" fill="#64748b" fontSize="6" fontWeight="bold" letterSpacing="0.8" textAnchor="middle">CAMPUS</text>
              </g>

              {/* ========================================================= */}
              {/* 3D FLOATING GOLD SPARKLE STARS */}
              {/* ========================================================= */}
              <g id="sparkle-1" transform="translate(138, 28)">
                <path d="M 0,-8 Q 0,0 8,0 Q 0,0 0,8 Q 0,0 -8,0 Q 0,0 0,-8 Z" fill="url(#goldFoil)" filter="url(#glowFilt)" />
              </g>
              <g id="sparkle-2" transform="translate(372, 108)">
                <path d="M 0,-6 Q 0,0 6,0 Q 0,0 0,6 Q 0,0 -6,0 Q 0,0 0,-6 Z" fill="url(#goldFoil)" filter="url(#glowFilt)" />
              </g>
              <g id="sparkle-3" transform="translate(60, 42)">
                <path d="M 0,-5 Q 0,0 5,0 Q 0,0 0,5 Q 0,0 -5,0 Q 0,0 0,-5 Z" fill="url(#goldFoil)" opacity="0.8" />
              </g>
            </svg>
          </motion.div>
        </div>

        {/* 3. EDITORIAL HEADLINE & BADGE */}
        <div className="space-y-1.5 my-2">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-1.5 bg-[#e6f4ea] text-[#085a4e] px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.18em] shadow-2xs">
            <Sparkles size={11} className="text-amber-500" />
            <span>YOUR CONNECTED CAMPUS</span>
          </div>

          {/* Editorial Headline */}
          <div className="pt-1">
            <h2 className="font-serif font-black text-2xl sm:text-3xl text-[#064e43] leading-tight tracking-tight">
              A smarter campus.
            </h2>
            <h2 className="font-serif italic font-normal text-2xl sm:text-3xl text-[#085a4e] leading-tight tracking-tight">
              A brighter future.
            </h2>
          </div>

          {/* Subtitle */}
          <p className="text-slate-500 text-xs sm:text-[13px] font-normal max-w-sm mx-auto leading-relaxed pt-0.5">
            One place for academics, updates and everyday campus life.
          </p>

          {/* Welcome back chip if logged in */}
          {userName && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60 text-[11px] font-semibold text-emerald-900 mt-1">
              <span>Welcome back, <strong className="font-black text-[#085a4e]">{userName}</strong></span>
            </div>
          )}
        </div>

        {/* 4. THREE 3D FEATURE PILLS */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 my-2.5 w-full">
          {/* Feature 1: Nexus AI 360 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs hover:bg-white transition-colors">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#064e43] to-[#0d9488] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Sparkles size={12} className="text-amber-300" />
            </div>
            <span className="text-[11px] font-black text-slate-800 tracking-tight">
              Nexus AI 360°
            </span>
          </div>

          {/* Feature 2: WhatsApp Updates */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs hover:bg-white transition-colors">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#10b981] to-[#059669] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <MessageCircle size={12} />
            </div>
            <span className="text-[11px] font-black text-slate-800 tracking-tight">
              WhatsApp updates
            </span>
          </div>

          {/* Feature 3: Digital Slips */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs hover:bg-white transition-colors">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#f59e0b] to-[#d97706] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <FileText size={12} />
            </div>
            <span className="text-[11px] font-black text-slate-800 tracking-tight">
              Digital slips
            </span>
          </div>
        </div>

        {/* 5. DYNAMIC PROGRESS ENGINE */}
        <div className="w-full space-y-2 mt-2 pt-2 border-t border-slate-100">
          {/* Live Status Row */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
            <div className="flex items-center gap-2 overflow-hidden text-left">
              <div className="relative flex items-center justify-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
                <span className="w-2 h-2 rounded-full bg-[#085a4e]" />
              </div>
              
              <div className="h-4 flex items-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={activeMessage}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.25 }}
                    className="font-bold text-[#064e43] text-[11px] sm:text-xs truncate max-w-[320px]"
                  >
                    {activeMessage}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            {countdown > 0 && (
              <span className="text-[11px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                {countdown}s
              </span>
            )}
          </div>

          {/* High-End Gradient Progress Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/70 relative shadow-inner">
            {countdown > 0 ? (
              <motion.div
                className="h-full bg-gradient-to-r from-[#085a4e] via-[#0d9488] to-[#eab308] rounded-full shadow-[0_0_10px_rgba(8,90,78,0.3)] relative overflow-hidden"
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
                  className="w-1/2 h-full bg-gradient-to-r from-[#085a4e] via-[#0d9488] to-[#eab308] rounded-full shadow-[0_0_10px_rgba(8,90,78,0.3)]"
                />
              </div>
            )}
          </div>

          {/* Sub-caption */}
          <p className="text-slate-400 text-[10.5px] font-medium tracking-wide">
            Bringing your campus together.
          </p>
        </div>

        {/* 6. BOTTOM SECURITY CERTIFICATION FOOTER */}
        <div className="w-full pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-slate-500">
            <Shield size={12} className="text-[#085a4e]" />
            <span>256-Bit TLS 1.3 Certified</span>
          </span>
          <span className="font-semibold text-slate-500">
            Academic Portal 2026-28
          </span>
        </div>

      </motion.div>
    </div>
  );
}
