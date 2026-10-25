import React, { useState, useEffect } from 'react';
import {
  Shield,
  GraduationCap,
  Briefcase,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Lock,
} from 'lucide-react';

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
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#022822] via-[#053e35] to-[#064e43] text-white flex flex-col justify-between p-5 sm:p-8 lg:p-10 relative overflow-hidden select-none">
      {/* Subtle Architectural Dot Pattern & Ambient Lighting */}
      <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

      {/* Top Institutional Header */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 max-w-6xl w-full mx-auto pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-tr from-[#c9a84c] via-[#f7e096] to-[#b89437] shadow-lg">
            <div className="w-full h-full rounded-2xl bg-white p-1.5 flex items-center justify-center">
              <img src={logo} alt={collegeName} className="w-full h-full object-contain" />
            </div>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight uppercase">
              {collegeName}
            </h1>
            <p className="text-xs text-amber-200/90 font-semibold">
              Official Campus Management & Academic Portal • Session 2026-28
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-mono text-emerald-100">
            <Clock size={13} className="text-amber-300" />
            <span>
              {now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </div>
          <button
            onClick={onEnter}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#c9a84c] via-[#f7e096] to-[#b89437] text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg hover:brightness-105 transition-all cursor-pointer"
          >
            All Portals Gateway
          </button>
        </div>
      </header>

      {/* Center Hero & Role Selection */}
      <main className="relative z-10 max-w-5xl w-full mx-auto my-auto py-8 text-center space-y-7">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-amber-300/30 text-amber-200 text-xs font-bold shadow-sm">
          <Sparkles size={14} className="text-amber-300" />
          <span>Superior College Jahanian — Enterprise Campus Cloud</span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
          Institutional Excellence &{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f7e096] via-amber-300 to-emerald-200">
            Smart Governance
          </span>
        </h2>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-emerald-100/85 leading-relaxed">
          Unified real-time academic records, attendance logs, fee vouchers, and executive
          analytics for Intermediate, BS, DIT, and UKL3 programs.
        </p>

        {/* 3 Direct Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto pt-2">
          <button
            onClick={() => onDirectSelectPortal('admin')}
            className="p-6 rounded-3xl bg-white/10 hover:bg-white/15 border border-white/20 hover:border-amber-300/50 text-left transition-all group cursor-pointer shadow-xl backdrop-blur-md"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-amber-300" />
            </div>
            <div className="font-black text-base sm:text-lg flex items-center justify-between text-white">
              <span>Admin ERP Console</span>
              <ArrowRight
                size={16}
                className="text-amber-300 group-hover:translate-x-1 transition-transform"
              />
            </div>
            <p className="text-xs text-emerald-100/75 mt-1.5 leading-relaxed">
              Authorized Administration, Admissions, Accounts & Institutional Operations
            </p>
          </button>

          <button
            onClick={() => onDirectSelectPortal('staff')}
            className="p-6 rounded-3xl bg-white/10 hover:bg-white/15 border border-white/20 hover:border-emerald-300/50 text-left transition-all group cursor-pointer shadow-xl backdrop-blur-md"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6 text-emerald-300" />
            </div>
            <div className="font-black text-base sm:text-lg flex items-center justify-between text-white">
              <span>Faculty Workplace</span>
              <ArrowRight
                size={16}
                className="text-emerald-300 group-hover:translate-x-1 transition-transform"
              />
            </div>
            <p className="text-xs text-emerald-100/75 mt-1.5 leading-relaxed">
              Lecture Schedule, Attendance Records, Academic Evaluations & Salary Slips
            </p>
          </button>

          <button
            onClick={() => onDirectSelectPortal('student')}
            className="p-6 rounded-3xl bg-white/10 hover:bg-white/15 border border-white/20 hover:border-sky-300/50 text-left transition-all group cursor-pointer shadow-xl backdrop-blur-md"
          >
            <div className="w-11 h-11 rounded-2xl bg-sky-400/20 border border-sky-300/30 flex items-center justify-center mb-4">
              <GraduationCap className="w-6 h-6 text-sky-300" />
            </div>
            <div className="font-black text-base sm:text-lg flex items-center justify-between text-white">
              <span>Student & Parent Portal</span>
              <ArrowRight
                size={16}
                className="text-sky-300 group-hover:translate-x-1 transition-transform"
              />
            </div>
            <p className="text-xs text-emerald-100/75 mt-1.5 leading-relaxed">
              Result Progress, Fee Vouchers, Daily Attendance Timings & Timetable
            </p>
          </button>
        </div>

        {/* Security Assurance Notice */}
        <div className="pt-2 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-semibold text-emerald-100/80">
            <Lock size={13} className="text-amber-300" />
            <span>Role-Based Encrypted Access • Authorized SGC-J Personnel, Faculty & Scholars Only</span>
          </div>
        </div>
      </main>

      <footer className="relative z-10 max-w-6xl w-full mx-auto pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-200/70 gap-2">
        <span>&copy; 2026 {collegeName}. All rights reserved.</span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-emerald-300" />
          <span>256-Bit Encrypted Enterprise Academic Cloud</span>
        </span>
      </footer>
    </div>
  );
}
