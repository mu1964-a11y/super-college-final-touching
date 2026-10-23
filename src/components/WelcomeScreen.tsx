import React from 'react';
import { Shield, GraduationCap, Briefcase, ArrowRight, Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  brandingSettings: any;
  onEnter: () => void;
  onDirectSelectPortal: (portal: 'admin' | 'staff' | 'student') => void;
}

export default function WelcomeScreen({
  brandingSettings,
  onEnter,
  onDirectSelectPortal,
}: WelcomeScreenProps) {
  const collegeName = brandingSettings?.name || 'Superior College Jahanian';
  const logo = brandingSettings?.logo || '/superior-logo.png';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#022822] via-[#053e35] to-[#064e43] text-white flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden">
      <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />

      <header className="relative z-10 flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center">
            <img src={logo} alt={collegeName} className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight">{collegeName}</h1>
            <p className="text-xs text-emerald-200/80 font-medium">Digital Campus ERP & LMS • Session 2026-28</p>
          </div>
        </div>
        <button
          onClick={onEnter}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
        >
          Portal Gateway
        </button>
      </header>

      <main className="relative z-10 max-w-5xl w-full mx-auto my-auto py-12 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
          <Sparkles size={14} />
          <span>Superior Group of Colleges Jahanian — Enterprise Portal</span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
          Institutional Excellence &{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-emerald-200">
            Smart Governance
          </span>
        </h2>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-emerald-100/80 leading-relaxed">
          Unified real-time academic, biometric attendance, financial ledger, and executive analytics platform for Administration, Faculty, and Students.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-4">
          <button
            onClick={() => onDirectSelectPortal('admin')}
            className="p-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-left transition-all group cursor-pointer"
          >
            <Shield className="w-7 h-7 text-amber-300 mb-3" />
            <div className="font-black text-base flex items-center justify-between">
              <span>Admin ERP</span>
              <ArrowRight size={16} className="opacity-60 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-emerald-100/70 mt-1">Principal, Accounts & Admissions Control</p>
          </button>

          <button
            onClick={() => onDirectSelectPortal('staff')}
            className="p-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-left transition-all group cursor-pointer"
          >
            <Briefcase className="w-7 h-7 text-emerald-300 mb-3" />
            <div className="font-black text-base flex items-center justify-between">
              <span>Faculty Portal</span>
              <ArrowRight size={16} className="opacity-60 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-emerald-100/70 mt-1">Lectures, Attendance & Payroll Ledger</p>
          </button>

          <button
            onClick={() => onDirectSelectPortal('student')}
            className="p-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-left transition-all group cursor-pointer"
          >
            <GraduationCap className="w-7 h-7 text-sky-300 mb-3" />
            <div className="font-black text-base flex items-center justify-between">
              <span>Student Portal</span>
              <ArrowRight size={16} className="opacity-60 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-emerald-100/70 mt-1">Results, Fee Challans & Timetable</p>
          </button>
        </div>
      </main>

      <footer className="relative z-10 max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-200/60 gap-2">
        <span>&copy; 2026 {collegeName}. All rights reserved.</span>
        <span>Secured by SCJ Enterprise Cloud</span>
      </footer>
    </div>
  );
}
