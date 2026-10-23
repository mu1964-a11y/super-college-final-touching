import React from 'react';
import { Shield, Briefcase, GraduationCap, ArrowLeft, ArrowRight } from 'lucide-react';

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
      subtitle: 'Executive Dashboard, Admissions, Fee Ledger & Biometrics',
      icon: Shield,
      badge: 'Executive Access',
      accent: 'from-emerald-600 to-teal-700',
    },
    {
      id: 'staff' as const,
      title: 'Faculty & Staff Portal',
      subtitle: 'Timetable, Class Attendance, Marks Entry & Salary Slips',
      icon: Briefcase,
      badge: 'Faculty Access',
      accent: 'from-amber-600 to-orange-700',
    },
    {
      id: 'student' as const,
      title: 'Student & Parent Portal',
      subtitle: 'Academic Results, Attendance Log, Fee Receipts & Digital ID',
      icon: GraduationCap,
      badge: 'Student Access',
      accent: 'from-sky-600 to-indigo-700',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden">
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={onBackToWelcome}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-2.5">
          <img src={logo} alt={collegeName} className="w-8 h-8 object-contain" />
          <span className="text-sm font-black">{collegeName}</span>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto my-auto py-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-4xl font-black">Select Your Workspace Portal</h1>
          <p className="text-xs sm:text-sm text-slate-400">
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
                className="p-6 rounded-3xl bg-slate-900/90 hover:bg-slate-900 border border-white/10 hover:border-emerald-500/40 text-left flex flex-col justify-between gap-6 transition-all group cursor-pointer shadow-xl"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.accent} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-slate-200">
                      {p.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{p.title}</h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{p.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs font-bold text-emerald-400">
                  <span>Continue to Sign In</span>
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-center text-xs text-slate-500">
        {collegeName} • Session 2026-28
      </div>
    </div>
  );
}
