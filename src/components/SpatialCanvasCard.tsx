import React, { useState, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function useSpatialParallax(maxTilt = 3.5) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, mouseX: 50, mouseY: 50 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const tiltX = ((centerY - y) / centerY) * maxTilt;
      const tiltY = ((x - centerX) / centerX) * maxTilt;

      setTilt({
        x: Math.max(-maxTilt, Math.min(maxTilt, tiltX)),
        y: Math.max(-maxTilt, Math.min(maxTilt, tiltY)),
        mouseX: Math.round((x / rect.width) * 100),
        mouseY: Math.round((y / rect.height) * 100),
      });
    },
    [maxTilt]
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0, mouseX: 50, mouseY: 50 });
  }, []);

  return { ref, tilt, handleMouseMove, handleMouseLeave };
}

interface SpatialCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}

export function SpatialCard({
  children,
  className,
  maxTilt = 3.5,
}: SpatialCardProps) {
  const { ref, tilt, handleMouseMove, handleMouseLeave } =
    useSpatialParallax(maxTilt);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative z-10 w-full max-w-[1140px] xl:max-w-[1180px] mx-auto"
      style={{ perspective: 1400 }}
    >
      {/* VisionOS Floating Ambient Iridescent Orbs */}
      <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#c9a84c]/20 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[130px] pointer-events-none -z-10" />

      {/* Main Spatial Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className={cn(
          "rounded-3xl sm:rounded-[2.25rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/60 dark:border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.22),0_0_0_1px_rgba(255,255,255,0.5)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] lg:min-h-[600px] relative",
          className
        )}
      >
        {/* Specular Top Rim Highlight (Apple Glass Reflection) */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent z-40 pointer-events-none" />

        {/* Dynamic Interactive Cursor Specular Sheen */}
        <div
          className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-300 opacity-60"
          style={{
            background: `radial-gradient(700px circle at ${tilt.mouseX}% ${tilt.mouseY}%, rgba(255,255,255,0.2), transparent 55%)`,
          }}
        />

        {children}
      </motion.div>
    </div>
  );
}
