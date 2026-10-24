import React from 'react';
import {
  Shield,
  Briefcase,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Fingerprint,
  Camera,
} from 'lucide-react';

interface PortalGatewayViewProps {
  brandingSettings: any;
  onSelectPortal: (portal: 'admin' | 'staff' | 'student') => void;
  onBackToWelcome: () => void;
}

export default function PortalGatewayView({
  brandingSettings,
  onSelectPortal,
  onBackToWelcome,
}: PortalGatewayViewProps) {
  const collegeName = brandingSettings?.name || 'Superior College Jahanian';
  const logo = brandingSettings?.logo || '/superior-logo.png';

  const portals = [
    {
      id: 'admin' as const,
      title: 'Administration & Accounts ERP',
      subtitle:
        'Executive Dashboard, Inter/BS/DIT/UKL3 Admissions, Double-Entry Fee Ledger & Biometrics',
      icon: Shield,
      badge: 'Executive Access',
      accent: 'from-[#064e43] to-teal-700',
    },
    {
      id: 'staff' as const,
      title: 'Faculty & Staff Workplace',
      subtitle:
        'Lecture Timetable, Thumb Biometric Logs, Fast Marks Entry & Monthly Salary Vouchers',
      icon: Briefcase,
      badge: 'Faculty Access',
      accent: 'from-amber-600 to-orange-700',
    },
    {
      id: 'student' as const,
      title: 'Student & Parent Portal',
      subtitle:
        '6-Month Exam Progress, Attendance Record, Official Fee Receipts & Digital Student ID',
      icon: GraduationCap,
      badge: 'Scholar Access',
      accent: 'from-sky-600 to-indigo-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#022822] via-[#053e35] to-[#064e43] text-white flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden select-none">
      <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={onBackToWelcome}
          className="inline-flex items-center gap-2 text-xs font-bold text-white px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Welcome</span>
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center">
            <img src={logo} alt={collegeName} className="w-full h-full object-contain" />
          </div>
          <span className="text-sm font-black uppercase tracking-wide">{collegeName}</span>
        </div>
      </div>

      <div className="relative z-10 max-w-5xl w-full mx-auto my-auto py-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-4xl font-black">Select Your Workspace Portal</h1>
          <p className="text-xs sm:text-sm text-emerald-100/80">
            Choose your designated role to sign in to {collegeName}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {portals.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPortal(p.id)}
                className="p-6 rounded-3xl bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/20 hover:border-amber-300/50 text-left flex flex-col justify-between gap-6 transition-all group cursor-pointer shadow-2xl"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.accent} flex items-center justify-center shadow-lg border border-white/20`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15 text-amber-200 border border-white/15">
                      {p.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{p.title}</h3>
                    <p className="text-xs text-emerald-100/80 mt-1.5 leading-relaxed">
                      {p.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/15 text-xs font-black text-amber-300">
                  <span>Continue to Sign In</span>
                  <ArrowRight
                    size={15}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href="/?biometric=true"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/30 hover:bg-black/45 border border-white/15 text-xs font-bold text-emerald-200"
          >
            <Fingerprint size={14} className="text-amber-300" />
            <span>Open Biometric Attendance Kiosk</span>
          </a>
          <a
            href="/?gate=true"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/30 hover:bg-black/45 border border-white/15 text-xs font-bold text-emerald-200"
          >
            <Camera size={14} className="text-emerald-300" />
            <span>Open Face Gate Kiosk</span>
          </a>
        </div>
      </div>

      <div className="relative z-10 text-center text-xs text-emerald-200/70">
        {collegeName} • Session 2026-28
      </div>
    </div>
  );
}
