import React from "react";
import { motion } from "motion/react";
import { MapPin } from "lucide-react";

interface AcademicCanvasBackgroundProps {
  logo?: string | null;
}

export default function AcademicCanvasBackground({ logo }: AcademicCanvasBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none bg-slate-900">
      {/* 1. Real Campus Photo with Crisp Atmospheric View + Soft Dark/Emerald Tint */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/campus-admin-block.jpg"
          alt="Superior College Jahanian Admin Block"
          className="w-full h-full object-cover object-[center_35%] filter blur-[1px] brightness-[0.98] contrast-[1.05] scale-[1.02]"
        />
        {/* Soft Dark & Emerald Gradient Overlay - keeps building clearly recognizable while foreground stays sharp & readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-emerald-950/20 to-[#02201b]/55" />
        <div className="absolute inset-0 bg-radial-[at_50%_35%] from-white/10 via-transparent to-slate-950/30" />
        {/* Subtle Architectural Grid Texture */}
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:48px_48px] opacity-60" />
      </div>

      {/* 2. Top-Right Handwritten Slogan: "Education for a Brighter Tomorrow" */}
      <div className="absolute top-6 right-8 sm:top-8 sm:right-12 z-10 pointer-events-none hidden md:block">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-['Caveat',cursive] text-2xl sm:text-3xl text-emerald-800/90 drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)] -rotate-3 select-none"
        >
          Education for a Brighter Tomorrow
        </motion.div>
      </div>

      {/* 3. Soft Ambient Highlights */}
      <div className="absolute -top-32 left-1/3 w-[600px] h-[600px] bg-gradient-to-b from-emerald-400/10 via-[#085a4e]/5 to-transparent blur-[140px] rounded-full z-1" />
      <div className="absolute top-1/4 right-10 w-[400px] h-[400px] bg-[#c9a84c]/10 blur-[130px] rounded-full z-1" />

      {/* 4. Sleek Superior Teal Wave at Bottom (Reduced to 16-18% screen height) */}
      <div className="absolute bottom-0 inset-x-0 w-full h-[15vh] sm:h-[18vh] min-h-[110px] max-h-[170px] z-2 overflow-hidden flex flex-col justify-end">
        {/* SVG Wave Layers */}
        <div className="absolute inset-0 w-full h-full">
          <svg
            className="w-full h-full"
            viewBox="0 0 1440 180"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="superiorTealFrontGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#032a24" stopOpacity="0.98" />
                <stop offset="35%" stopColor="#05453b" stopOpacity="0.97" />
                <stop offset="70%" stopColor="#085a4e" stopOpacity="0.98" />
                <stop offset="100%" stopColor="#0a6b5c" stopOpacity="0.97" />
              </linearGradient>

              <linearGradient id="superiorTealBackGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#011b16" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#03352c" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#054238" stopOpacity="0.85" />
              </linearGradient>

              <linearGradient id="goldEdgeStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c9a84c" />
                <stop offset="30%" stopColor="#fef08a" />
                <stop offset="60%" stopColor="#f59e0b" />
                <stop offset="85%" stopColor="#fff8db" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>

              <filter id="goldCrestGlow" x="-20%" y="-100%" width="140%" height="300%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* Back Wave - Gentle Undulation */}
            <motion.path
              d="M -20,80 C 320,30 640,110 980,50 C 1180,15 1340,65 1460,40 L 1460,190 L -20,190 Z"
              fill="url(#superiorTealBackGrad)"
              opacity="0.65"
              animate={{
                y: [0, 4, -3, 2, 0],
              }}
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Main Front Wave & Solid Glowing Gold Border - Soft Wave Motion */}
            <motion.g
              animate={{
                y: [0, -5, 1, -3, 0],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {/* Front Teal Wave */}
              <path
                d="M -20,60 C 260,105 560,35 920,70 C 1160,95 1320,45 1460,30 L 1460,190 L -20,190 Z"
                fill="url(#superiorTealFrontGrad)"
              />

              {/* Solid Smooth Golden Crest Border */}
              <motion.path
                d="M -20,60 C 260,105 560,35 920,70 C 1160,95 1320,45 1460,30"
                fill="none"
                stroke="url(#goldEdgeStroke)"
                strokeWidth="2.5"
                filter="url(#goldCrestGlow)"
                strokeLinecap="round"
                animate={{
                  opacity: [0.85, 1, 0.85],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Subtle White-Gold Inner Specular Line */}
              <path
                d="M -20,60 C 260,105 560,35 920,70 C 1160,95 1320,45 1460,30"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1"
                strokeOpacity="0.75"
                strokeLinecap="round"
              />
            </motion.g>
          </svg>
        </div>

        {/* Footer Overlay Branding Content (Matching Image 1) */}
        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-14 pb-3 sm:pb-4 flex items-center justify-between pointer-events-auto">
          {/* Left Campus Tag */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center text-amber-300 shrink-0">
              <MapPin size={13} />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-semibold text-white/95 leading-tight">
                Jahanian Main Campus
              </p>
              <p className="text-[9px] font-bold text-emerald-200/70 tracking-[0.18em] uppercase">
                Knowledge &bull; Character &bull; Opportunity
              </p>
            </div>
          </div>

          {/* Right Slogan Tag */}
          <div className="text-right">
            <p className="text-[11px] sm:text-xs font-semibold text-white/90 leading-tight">
              A Digital Campus
            </p>
            <div className="relative inline-block">
              <p className="text-[11px] sm:text-xs font-bold text-amber-200/95 tracking-wide">
                A Brighter Future
              </p>
              <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
