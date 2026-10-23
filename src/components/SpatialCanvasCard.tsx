import React from 'react';

export function SpatialCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative z-10 w-full max-w-5xl rounded-3xl bg-white/95 backdrop-blur-2xl shadow-2xl border border-white/20 overflow-hidden grid grid-cols-1 lg:grid-cols-12 ${className}`}
    >
      {children}
    </div>
  );
}

export default SpatialCard;
