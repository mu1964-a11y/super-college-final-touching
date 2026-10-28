import React, { useState, useEffect, useMemo } from 'react';
import { Fingerprint, CheckCircle2, X, ShieldCheck } from 'lucide-react';
import { secugenService } from '../lib/secugenService';
import { safeLocalStorage } from '../utils/safeStorage';

interface FingerprintThumbnailProps {
  personId?: string;
  altId?: string;
  template?: string;
  fingerLabel?: string;
  size?: 'xs' | 'sm' | 'md';
  showBadge?: boolean;
  allowInspect?: boolean;
  onClick?: () => void;
}

export default function FingerprintThumbnail({
  personId,
  altId,
  template,
  fingerLabel = 'Right Thumb',
  size = 'sm',
  showBadge = false,
  allowInspect = false,
  onClick,
}: FingerprintThumbnailProps) {
  const [bmpSrc, setBmpSrc] = useState<string | null>(null);
  const [inspectOpen, setInspectOpen] = useState(false);

  const isEnrolled = Boolean(template && String(template).trim().length > 10);
  const cleanLabel = useMemo(
    () =>
      isEnrolled
        ? secugenService.formatFingerBadge(fingerLabel, template)
        : secugenService.cleanFingerLabel(fingerLabel),
    [fingerLabel, template, isEnrolled]
  );

  const minutiaePoints = useMemo(() => {
    if (!isEnrolled || !template || template === 'enrolled') return [];
    return secugenService.parseIsoMinutiae(template);
  }, [isEnrolled, template]);

  useEffect(() => {
    if (!personId && !altId) {
      setBmpSrc(null);
      return;
    }
    const cached =
      (personId ? safeLocalStorage.getItem(`scj_fp_thumb_${personId}`) : null) ||
      (altId ? safeLocalStorage.getItem(`scj_fp_thumb_${altId}`) : null);

    if (cached && cached.length > 80 && !cached.includes('undefined')) {
      setBmpSrc(cached.startsWith('data:') ? cached : `data:image/bmp;base64,${cached}`);
    } else {
      setBmpSrc(null);
    }
  }, [personId, altId, template]);

  const sizeClasses =
    size === 'xs'
      ? 'w-6 h-7 rounded-md'
      : size === 'md'
      ? 'w-12 h-14 rounded-xl'
      : 'w-8 h-9 rounded-lg';

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
      return;
    }
    if (allowInspect && isEnrolled) {
      e.stopPropagation();
      setInspectOpen(true);
    }
  };

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleClick}
          title={
            isEnrolled
              ? `Biometric Enrolled (${cleanLabel}${
                  minutiaePoints.length > 0 ? ` • ${minutiaePoints.length} Minutiae` : ''
                })`
              : 'Fingerprint Not Enrolled — Click to Scan'
          }
          className={`relative inline-flex items-center justify-center overflow-hidden border transition-all shrink-0 cursor-pointer ${sizeClasses} ${
            isEnrolled
              ? 'bg-slate-950 border-emerald-500/80 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)] hover:scale-105'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 hover:border-amber-400 hover:text-amber-500'
          }`}
        >
          {bmpSrc ? (
            <img
              src={bmpSrc}
              alt={cleanLabel}
              className="w-full h-full object-contain p-0.5 filter contrast-125 brightness-110"
              onError={() => setBmpSrc(null)}
            />
          ) : isEnrolled ? (
            <svg
              viewBox="0 0 40 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full p-1 text-emerald-400 stroke-current"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M7 26 C7 14, 33 14, 33 26 C33 34, 28 40, 26 43" />
              <path d="M12 26 C12 18, 28 18, 28 26 C28 35, 23 38, 20 44" />
              <path d="M16 26 C16 21, 24 21, 24 26 C24 33, 21 37, 20 40" />
              <path d="M19 26 C19 23, 21 23, 21 26 C21 30, 20 33, 20 36" />
              <path d="M4 29 C4 18, 12 8, 20 8 C28 8, 36 18, 36 29" />
            </svg>
          ) : (
            <Fingerprint size={size === 'xs' ? 13 : size === 'md' ? 20 : 15} />
          )}
          {isEnrolled && (
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
          )}
        </button>

        {showBadge && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              isEnrolled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isEnrolled ? cleanLabel : 'No Thumb'}
          </span>
        )}
      </div>

      {inspectOpen && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setInspectOpen(false);
          }}
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-300" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    SecuGen Biometric Record
                  </h4>
                  <p className="text-[10px] text-emerald-200 font-mono">
                    ID: {altId || personId || 'Verified'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectOpen(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-5 flex flex-col items-center text-center space-y-4">
              <div className="w-36 h-44 rounded-2xl bg-slate-950 border-2 border-emerald-500 shadow-inner flex flex-col items-center justify-center relative overflow-hidden p-2">
                {bmpSrc ? (
                  <img
                    src={bmpSrc}
                    alt={cleanLabel}
                    className="w-full h-full object-contain filter contrast-125 brightness-110"
                  />
                ) : (
                  <svg
                    viewBox="0 0 300 400"
                    className="w-full h-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Subtle biometric ridge contours */}
                    <g stroke="rgba(16,185,129,0.28)" strokeWidth="3" fill="none" strokeLinecap="round">
                      <path d="M55 220 C55 110, 245 110, 245 220 C245 290, 210 340, 190 365" />
                      <path d="M85 220 C85 140, 215 140, 215 220 C215 280, 185 320, 165 350" />
                      <path d="M115 220 C115 170, 185 170, 185 220 C185 265, 165 295, 150 325" />
                      <path d="M35 240 C35 140, 95 65, 150 65 C205 65, 265 140, 265 240" />
                    </g>
                    {/* Plotted real ISO 19794-2 minutiae coordinates */}
                    {minutiaePoints.map((pt, idx) => (
                      <g key={idx}>
                        <circle
                          cx={Math.max(15, Math.min(285, pt.x))}
                          cy={Math.max(15, Math.min(385, pt.y))}
                          r={pt.type === 2 ? 4.5 : 3.5}
                          fill={pt.type === 2 ? '#34d399' : '#fbbf24'}
                        />
                      </g>
                    ))}
                  </svg>
                )}
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>{cleanLabel}</span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  ISO/IEC 19794-2 (FMR 20) •{' '}
                  {minutiaePoints.length > 0
                    ? `${minutiaePoints.length} Minutiae Points Extracted`
                    : 'Cloud Template Active'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
