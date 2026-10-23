import React from 'react';

interface AcademicCanvasBackgroundProps {
  logo?: string;
}

export default function AcademicCanvasBackground({ logo }: AcademicCanvasBackgroundProps) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-slate-950">
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-emerald-600/20 blur-[130px]" />
      <div className="absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full bg-teal-500/15 blur-[130px]" />
      <div className="absolute -bottom-40 left-1/3 w-[520px] h-[520px] rounded-full bg-amber-500/10 blur-[140px]" />
      <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />
      {logo && (
        <img
          src={logo}
          alt=""
          className="absolute right-8 bottom-8 w-64 h-64 object-contain opacity-[0.03] select-none"
        />
      )}
    </div>
  );
}
