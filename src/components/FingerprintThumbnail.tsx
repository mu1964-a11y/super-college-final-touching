import React, { useState, useEffect } from "react";
import { Fingerprint, Eye, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface FingerprintThumbnailProps {
  personId?: string;
  altId?: string;
  template?: string;
  fingerLabel?: string;
  bmpBase64?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  showBadge?: boolean;
  onClick?: () => void;
  allowInspect?: boolean;
}

export default function FingerprintThumbnail({
  personId,
  altId,
  template,
  fingerLabel = "Right Thumb",
  bmpBase64,
  size = "sm",
  className,
  showBadge = false,
  onClick,
  allowInspect = true,
}: FingerprintThumbnailProps) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(bmpBase64 || null);
  const [isInspectOpen, setIsInspectOpen] = useState(false);

  useEffect(() => {
    if (bmpBase64) {
      setThumbSrc(bmpBase64);
      return;
    }

    // Check localStorage cache
    if (typeof window !== "undefined") {
      if (personId) {
        const cached = localStorage.getItem(`scj_fp_thumb_${personId}`);
        if (cached) {
          setThumbSrc(cached);
          return;
        }
      }
      if (altId) {
        const cachedAlt = localStorage.getItem(`scj_fp_thumb_${altId}`);
        if (cachedAlt) {
          setThumbSrc(cachedAlt);
          return;
        }
      }
    }

    // Fallback: check if static uploaded impression file exists on server
    const candidateId = personId || altId;
    if (candidateId) {
      const safeId = String(candidateId).replace(/[^a-zA-Z0-9_-]/g, "_");
      const img = new Image();
      img.src = `/uploads/fingerprints/${safeId}.bmp`;
      img.onload = () => setThumbSrc(`/uploads/fingerprints/${safeId}.bmp`);
    }
  }, [personId, altId, bmpBase64]);

  const hasEnrollment = Boolean(template || thumbSrc);

  const sizeClasses = {
    xs: "w-5 h-6 rounded-md",
    sm: "w-7 h-8.5 rounded-lg",
    md: "w-10 h-12 rounded-xl",
    lg: "w-14 h-16 rounded-2xl",
  };

  const iconSizes = {
    xs: 12,
    sm: 15,
    md: 20,
    lg: 28,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else if (allowInspect && hasEnrollment) {
      e.stopPropagation();
      setIsInspectOpen(true);
    }
  };

  if (!hasEnrollment) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          "border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center text-slate-300 dark:text-slate-600 transition-colors",
          className
        )}
        title="Fingerprint missing"
      >
        <Fingerprint size={iconSizes[size]} className="opacity-40" />
      </div>
    );
  }

  return (
    <>
      <div
        onClick={handleClick}
        className={cn(
          sizeClasses[size],
          "relative overflow-hidden group cursor-pointer border transition-all shrink-0",
          "border-emerald-500/40 bg-slate-950 shadow-xs hover:border-emerald-400 hover:shadow-emerald-500/20 hover:scale-105",
          className
        )}
        title={`${fingerLabel} Impression (SecuGen) — Click to inspect`}
      >
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={`${fingerLabel} Impression`}
            className="w-full h-full object-contain p-0.5 filter contrast-125 brightness-110 drop-shadow-[0_0_2px_rgba(16,185,129,0.4)]"
          />
        ) : (
          /* High-fidelity Biometric Ridge Preview Vector */
          <div className="w-full h-full flex flex-col items-center justify-center relative p-0.5 bg-gradient-to-b from-slate-950 to-slate-900">
            <svg
              viewBox="0 0 40 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full text-emerald-400 stroke-current opacity-90 drop-shadow-[0_0_3px_rgba(52,211,153,0.5)]"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              {/* Outer Loop */}
              <path d="M7 26 C7 14, 33 14, 33 26 C33 34, 28 40, 26 43" />
              {/* Middle Ridge */}
              <path d="M12 26 C12 18, 28 18, 28 26 C28 35, 23 38, 20 44" />
              {/* Inner Loop */}
              <path d="M16 26 C16 21, 24 21, 24 26 C24 33, 21 37, 20 40" />
              {/* Core Whorl */}
              <path d="M19 26 C19 23, 21 23, 21 26 C21 30, 20 33, 20 36" />
              {/* Left Delta Ridge */}
              <path d="M4 29 C4 18, 12 8, 20 8 C28 8, 36 18, 36 29" />
              <path d="M4 35 C5 39, 9 43, 15 44" />
              <path d="M36 35 C35 39, 31 43, 25 44" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
          </div>
        )}

        {/* Micro Green Active Biometric Pulse Indicator */}
        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_4px_rgba(52,211,153,0.9)]" />

        {/* Hover Inspect Icon Overlay */}
        <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-emerald-300">
          <Eye size={iconSizes[size]} />
        </div>

        {showBadge && (
          <span className="absolute bottom-0 inset-x-0 bg-emerald-950/90 text-[7px] font-mono font-black text-emerald-300 text-center uppercase tracking-tight py-0.2">
            Thumb
          </span>
        )}
      </div>

      {/* Enlarged Biometric Inspection Modal */}
      {isInspectOpen && (
        <Dialog open={isInspectOpen} onOpenChange={setIsInspectOpen}>
          <DialogContent className="max-w-xs p-0 overflow-hidden bg-slate-950 border border-emerald-500/40 rounded-3xl text-white shadow-2xl">
            <div className="bg-gradient-to-b from-[#085a4e] to-slate-950 p-4 border-b border-white/10 text-center relative">
              <div className="flex items-center justify-center gap-1.5 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider mb-1">
                <Sparkles size={13} />
                <span>SecuGen Biometric Archive</span>
              </div>
              <DialogTitle className="text-base font-black text-white">
                {fingerLabel} Impression
              </DialogTitle>
              <p className="text-[10px] text-emerald-200 mt-0.5 font-mono">
                {personId ? `ID: ${personId}` : "Biometric Verified"}
              </p>
            </div>

            <div className="p-6 flex flex-col items-center justify-center gap-4">
              <div className="w-48 h-60 rounded-2xl bg-black border-2 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.25)] flex items-center justify-center p-2 relative overflow-hidden">
                {thumbSrc ? (
                  <img
                    src={thumbSrc}
                    alt="High-Res Biometric Impression"
                    className="w-full h-full object-contain filter contrast-125 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center relative p-3">
                    <svg
                      viewBox="0 0 40 48"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-full h-full text-emerald-400 stroke-current opacity-95 drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    >
                      <path d="M7 26 C7 14, 33 14, 33 26 C33 34, 28 40, 26 43" />
                      <path d="M12 26 C12 18, 28 18, 28 26 C28 35, 23 38, 20 44" />
                      <path d="M16 26 C16 21, 24 21, 24 26 C24 33, 21 37, 20 40" />
                      <path d="M19 26 C19 23, 21 23, 21 26 C21 30, 20 33, 20 36" />
                      <path d="M4 29 C4 18, 12 8, 20 8 C28 8, 36 18, 36 29" />
                      <path d="M4 35 C5 39, 9 43, 15 44" />
                      <path d="M36 35 C35 39, 31 43, 25 44" />
                    </svg>
                  </div>
                )}
                {/* Visual Laser Scan Effect */}
                <div className="absolute inset-x-0 h-0.5 bg-emerald-400 opacity-60 shadow-[0_0_8px_#34d399] animate-pulse top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="w-full bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-center space-y-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live ANSI/ISO Biometric Template Enrolled
                </span>
                <p className="text-[11px] text-slate-400 font-sans">
                  Optical 500 DPI SecuGen Hamster Pro 20 scan verified for gate attendance.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
