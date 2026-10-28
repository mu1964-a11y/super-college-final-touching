import React, { useState, useEffect } from 'react';
import { Fingerprint, HeartPulse, Waves, Radio, Activity, Sparkles } from 'lucide-react';

interface BiometricLivePulseProps {
  isScanning: boolean;
  statusMessage?: string;
  variant?: 'dark' | 'light' | 'kiosk';
  onManualScan?: () => void;
  scannerName?: string;
  enrolledCount?: number;
}

export const BiometricLivePulse: React.FC<BiometricLivePulseProps> = ({
  isScanning,
  statusMessage,
  variant = 'kiosk',
  onManualScan,
  scannerName = 'SecuGen HU20 Hamster Pro',
  enrolledCount = 31,
}) => {
  const [elapsedScanMs, setElapsedScanMs] = useState<number>(0);
  const [pulseCount, setPulseCount] = useState<number>(72);

  // Real-time scan timer to give reassuring, dynamic feedback during the 2-4 second wait
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isScanning) {
      setElapsedScanMs(0);
      const start = Date.now();
      timer = setInterval(() => {
        setElapsedScanMs(Date.now() - start);
      }, 50);
      // Simulated live cardiac / optical sensor rate increase during finger verification
      setPulseCount(Math.floor(92 + Math.random() * 12));
    } else {
      setElapsedScanMs(0);
      setPulseCount(72);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isScanning]);

  const elapsedSeconds = (elapsedScanMs / 1000).toFixed(1);

  // Dynamic phase messaging to completely eliminate user anxiety during verification
  let phaseBadge = 'Sensor Ready';
  let phaseTitle = 'Waiting for Finger';
  let phaseDetail = 'Place enrolled thumb or index finger flat on the optical sensor.';
  let phaseColor = 'text-emerald-400';
  let waveSpeed = 'duration-1000';

  if (isScanning) {
    if (elapsedScanMs < 1200) {
      phaseBadge = '1/2 Optical Capture';
      phaseTitle = 'Reading Finger Minutiae...';
      phaseDetail = 'Hold finger steady on optical glass. Reading ridge contours...';
      phaseColor = 'text-emerald-300';
      waveSpeed = 'duration-500';
    } else {
      phaseBadge = '2/2 1:N Vault Match';
      phaseTitle = 'Verifying Biometric Signature...';
      phaseDetail = `Comparing against ${enrolledCount}+ enrolled templates. Releasing in a moment...`;
      phaseColor = 'text-teal-300';
      waveSpeed = 'duration-300';
    }
  }

  const isKiosk = variant === 'kiosk';

  return (
    <div className="w-full flex flex-col items-center select-none py-2">
      {/* Top Reassuring Live Pulse Status Bar */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-wide border transition-all ${
            isScanning
              ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : isKiosk
              ? 'bg-slate-800/80 border-white/10 text-slate-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          {/* Animated Heartbeat Icon */}
          <div className="relative flex items-center justify-center">
            <HeartPulse
              size={14}
              className={`text-emerald-400 transition-transform ${
                isScanning ? 'scale-125 animate-pulse text-emerald-300' : 'text-emerald-500'
              }`}
            />
            {isScanning && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          <span className="font-extrabold uppercase text-[10px] tracking-wider">
            Live Pulse Active
          </span>

          <span className="opacity-40">•</span>

          <span className="font-mono text-[10.5px] font-bold">
            {isScanning ? `${elapsedSeconds}s Verification` : `${pulseCount} bpm Heartbeat`}
          </span>
        </div>

        {/* Live Optical Waveform Frequency Bars */}
        <div className="flex items-end gap-1 h-5 px-2 py-1 rounded-md bg-slate-950/60 border border-white/10">
          {[0.4, 0.9, 0.6, 1.0, 0.7, 0.8, 0.5, 0.95].map((height, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all ${
                isScanning
                  ? 'bg-gradient-to-t from-emerald-500 to-teal-300 animate-pulse'
                  : 'bg-emerald-600/50'
              }`}
              style={{
                height: isScanning ? `${Math.max(20, height * 100)}%` : `${height * 40}%`,
                animationDelay: `${i * 120}ms`,
                animationDuration: isScanning ? '450ms' : '1400ms',
              }}
            />
          ))}
        </div>
      </div>

      {/* Centerpiece: Ripple Wave Rings + Glowing Fingerprint Scanner Center */}
      <div className="relative my-2 flex items-center justify-center">
        {/* Radar / Sonar Concentric Ripple Waves */}
        {isScanning && (
          <>
            <div
              className={`absolute w-36 h-36 rounded-full border-2 border-emerald-400/40 animate-ping pointer-events-none ${waveSpeed}`}
              style={{ animationDuration: '2s' }}
            />
            <div
              className={`absolute w-44 h-44 rounded-full border border-teal-400/30 animate-ping pointer-events-none`}
              style={{ animationDuration: '2.5s', animationDelay: '400ms' }}
            />
            <div
              className={`absolute w-52 h-52 rounded-full border border-emerald-500/20 animate-ping pointer-events-none`}
              style={{ animationDuration: '3s', animationDelay: '800ms' }}
            />
          </>
        )}

        {/* Fingerprint Interactive Target Circle */}
        <div
          onClick={onManualScan}
          className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex flex-col items-center justify-center border-3 transition-all cursor-pointer ${
            isScanning
              ? 'bg-gradient-to-br from-emerald-950/90 via-slate-900 to-teal-950/90 border-emerald-400 shadow-[0_0_45px_rgba(16,185,129,0.5)] scale-105 ring-4 ring-emerald-500/20'
              : isKiosk
              ? 'bg-slate-800/90 border-white/20 hover:border-emerald-400/70 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : 'bg-slate-900 border-slate-700 hover:border-emerald-500'
          }`}
          title="Click to trigger biometric scan cycle"
        >
          {/* Laser Scan Line Sweep Animation during active capture */}
          {isScanning && (
            <div className="absolute inset-x-2 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_12px_#10b981] rounded-full animate-bounce duration-700" />
          )}

          <Fingerprint
            className={`w-14 h-14 sm:w-16 sm:h-16 transition-all duration-300 ${
              isScanning
                ? 'text-emerald-300 animate-pulse drop-shadow-[0_0_12px_rgba(52,211,153,0.8)] scale-110'
                : 'text-emerald-400/80 group-hover:text-emerald-300'
            }`}
          />

          <span
            className={`text-[9px] font-black uppercase tracking-widest mt-1.5 transition-colors ${
              isScanning ? 'text-emerald-300 font-extrabold' : 'text-slate-400'
            }`}
          >
            {isScanning ? 'Analyzing...' : 'Click or Touch'}
          </span>
        </div>
      </div>

      {/* Real-time Electrocardiogram (ECG) / Live Pulse Wave Monitor */}
      <div className="w-full max-w-sm mt-3 px-3">
        <div
          className={`relative h-11 rounded-2xl border overflow-hidden flex items-center justify-center px-3 ${
            isScanning
              ? 'bg-slate-950 border-emerald-500/40 shadow-inner'
              : isKiosk
              ? 'bg-slate-950/70 border-white/10'
              : 'bg-slate-950 border-slate-800'
          }`}
        >
          {/* ECG Background Grid Lines */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                'linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)',
              backgroundSize: '12px 12px',
            }}
          />

          {/* SVG Animated Cardiogram Wave */}
          <svg
            className="w-full h-8 relative z-10"
            viewBox="0 0 300 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d={
                isScanning
                  ? 'M0 20 L40 20 L50 10 L60 32 L70 5 L80 35 L90 20 L130 20 L140 8 L150 34 L160 3 L170 37 L180 20 L220 20 L230 11 L240 31 L250 6 L260 35 L270 20 L300 20'
                  : 'M0 20 L60 20 L75 14 L85 27 L95 10 L105 28 L115 20 L190 20 L205 15 L215 26 L225 12 L235 27 L245 20 L300 20'
              }
              stroke={isScanning ? '#34d399' : '#059669'}
              strokeWidth={isScanning ? '2.5' : '1.8'}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isScanning ? 'animate-pulse' : ''}
              style={{
                filter: isScanning
                  ? 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.8))'
                  : 'drop-shadow(0 0 2px rgba(5, 150, 105, 0.4))',
              }}
            />
          </svg>

          {/* Glowing sweeping pulse head */}
          <div
            className={`absolute top-0 bottom-0 w-12 bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent pointer-events-none ${
              isScanning ? 'animate-[pulse_1s_ease-in-out_infinite]' : 'opacity-40'
            }`}
          />
        </div>
      </div>

      {/* Anxiety-Free Step Indicators & Reassurance Copy */}
      <div className="mt-3 text-center max-w-md mx-auto space-y-1.5 px-4">
        <div className="inline-flex items-center gap-2">
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isScanning
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                : 'bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            {phaseBadge}
          </span>
          <span className="text-xs font-black text-white">{phaseTitle}</span>
        </div>

        <p className="text-[11.5px] text-slate-400 leading-snug">
          {statusMessage || phaseDetail}
        </p>

        {/* 3 Step Reassurance Trail */}
        <div className="flex items-center justify-center gap-1.5 pt-1 text-[9.5px] font-bold text-slate-400">
          <span
            className={`flex items-center gap-1 ${
              isScanning ? 'text-emerald-400 font-black' : 'text-slate-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            1. Touch Sensor
          </span>
          <span className="text-slate-600">&rarr;</span>
          <span
            className={`flex items-center gap-1 ${
              isScanning && elapsedScanMs >= 1000 ? 'text-teal-400 font-black' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isScanning && elapsedScanMs >= 1000 ? 'bg-teal-400 animate-ping' : 'bg-slate-600'
              }`}
            />
            2. Live Minutiae Pulse
          </span>
          <span className="text-slate-600">&rarr;</span>
          <span className="text-slate-500">3. Instant Check-In</span>
        </div>
      </div>
    </div>
  );
};

export default BiometricLivePulse;
