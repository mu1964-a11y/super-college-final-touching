import React from 'react';
import { Fingerprint } from 'lucide-react';

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
  template,
  fingerLabel = 'Right Thumb',
  onClick,
}: FingerprintThumbnailProps) {
  const isEnrolled = Boolean(template);

  return (
    <button
      type="button"
      onClick={onClick}
      title={isEnrolled ? `Biometric Enrolled (${fingerLabel})` : 'Click to Enroll Fingerprint'}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border transition-colors cursor-pointer ${
        isEnrolled
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
          : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
      }`}
    >
      <Fingerprint size={14} />
    </button>
  );
}
