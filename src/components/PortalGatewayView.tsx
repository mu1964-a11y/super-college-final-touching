import React, { useState } from "react";
import { motion } from "motion/react";
import {
  GraduationCap,
  Users,
  Shield,
  ArrowRight,
  ArrowLeft,
  School,
  Lock,
  FileText,
  Calendar,
  Signal,
  Check,
  Award,
  CreditCard,
} from "lucide-react";
import AcademicCanvasBackground from "./AcademicCanvasBackground";

interface PortalGatewayViewProps {
  brandingSettings: {
    name: string;
    logo: string | null;
  };
  onSelectPortal: (portal: "student" | "staff" | "admin") => void;
  onBackToWelcome?: () => void;
}

export default function PortalGatewayView({
  brandingSettings,
  onSelectPortal,
  onBackToWelcome,
}: PortalGatewayViewProps) {
  const [selectedRole, setSelectedRole] = useState<"student" | "staff" | "admin">("student");

  const roleCards = [
    {
      id: "student" as const,
      title: "Student",
      description: "Access your records, timetables, results and more.",
      icon: GraduationCap,
      highlights: ["3-Copy Bank Fee Challans", "Terminal Marksheets", "Class Presence Logs"],
    },
    {
      id: "staff" as const,
      title: "Faculty",
      description: "Manage classes, view schedules and academic tools.",
      icon: Users,
      highlights: ["Assigned Period Rosters", "Biometric Duty Punch", "Verified Salary Slips"],
    },
    {
      id: "admin" as const,
      title: "Admin",
      description: "Administrative control and system management.",
      icon: Shield,
      highlights: ["Admissions & Inquiries", "Double-Entry Cashbook", "Staff Payroll Control"],
    },
  ];

  const getCtaLabel = () => {
    switch (selectedRole) {
      case "student":
        return "Continue to Student Portal";
      case "staff":
        return "Continue to Faculty Portal";
      case "admin":
        return "Continue to Admin Console";
      default:
        return "Access Digital Campus";
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-5 lg:p-7 font-sans select-none relative overflow-hidden text-slate-800">
      {/* Real Campus Photo Background + Reduced Wave & Top Slogan */}
      <AcademicCanvasBackground logo={brandingSettings.logo} />

      {/* Main Unified Portal Card (1140-1180px width) */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[1140px] xl:max-w-[1180px] rounded-3xl sm:rounded-[2.25rem] bg-white border border-slate-200/90 shadow-[0_25px_80px_rgba(0,0,0,0.22)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] lg:min-h-[600px] relative z-10"
      >
        {/* LEFT COLUMN (approx 38-40%): Deep Superior Emerald Brand Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#064e43] via-[#053e35] to-[#022822] p-7 sm:p-9 lg:p-10 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Subtle Background Watermark */}
          <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          <div className="absolute top-1/4 right-0 w-80 h-80 opacity-[0.08] pointer-events-none text-white flex items-center justify-center">
            <GraduationCap size={320} className="stroke-[1]" />
          </div>
          <div className="absolute -top-16 -left-16 w-60 h-60 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />

          {/* Top Branding Section */}
          <div className="relative z-10">
            {/* Return to Welcome & TLS Badge */}
            <div className="flex items-center justify-between mb-5">
              {onBackToWelcome && (
                <button
                  type="button"
                  onClick={onBackToWelcome}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all cursor-pointer group shadow-sm backdrop-blur-md"
                >
                  <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
                  <span>Return to Welcome</span>
                </button>
              )}

              <span className="text-[10px] font-mono text-emerald-200 tracking-wider">
                GATEWAY SECURE
              </span>
            </div>

            {/* Brand Identity Lockup */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#c9a84c] via-[#f7e096] to-[#b89437] shadow-lg flex items-center justify-center shrink-0">
                <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                  {brandingSettings.logo ? (
                    <img
                      src={brandingSettings.logo}
                      alt="Logo"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <School size={22} className="text-[#053229]" />
                  )}
                </div>
              </div>
              <div>
                <h2 className="text-xs sm:text-[13px] font-black text-white uppercase tracking-wider leading-snug">
                  {brandingSettings.name || "SUPERIOR COLLEGE JAHANIAN"}
                </h2>
                <p className="text-[10px] sm:text-[11px] font-semibold text-amber-200/90 tracking-wide">
                  Jahanian Main Campus &bull; Digital Gateway
                </p>
              </div>
            </div>

            {/* Main Title & Supporting Copy */}
            <div className="mb-7">
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-black tracking-tight text-white leading-tight">
                Select Your{" "}
                <span className="text-[#f5d47a] block sm:inline">
                  Workspace.
                </span>
              </h1>
              <p className="text-xs sm:text-[13px] text-emerald-100/85 mt-2.5 leading-relaxed max-w-md">
                Dedicated gateways for scholars, faculty educators, and campus administrators with authenticated single sign-on.
              </p>
            </div>

            {/* 3 Benefit Feature Pillars */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center text-emerald-200 mb-2 shadow-inner">
                  <FileText size={18} />
                </div>
                <h4 className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                  Academic Records
                </h4>
                <p className="text-[9.5px] sm:text-[10px] text-emerald-200/70 mt-1 leading-snug">
                  Transcripts, marksheets & fee ledgers.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center text-emerald-200 mb-2 shadow-inner">
                  <Calendar size={18} />
                </div>
                <h4 className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                  Timetables
                </h4>
                <p className="text-[9.5px] sm:text-[10px] text-emerald-200/70 mt-1 leading-snug">
                  Weekly classes & attendance logs.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center text-emerald-200 mb-2 shadow-inner">
                  <Users size={18} />
                </div>
                <h4 className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                  Campus Services
                </h4>
                <p className="text-[9.5px] sm:text-[10px] text-emerald-200/70 mt-1 leading-snug">
                  Official notices & institutional tools.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Slogan Line */}
          <div className="relative z-10 pt-5 mt-5 border-t border-emerald-700/40 text-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-200/60 uppercase tracking-[0.25em]">
              &mdash;&mdash; EMPOWERING BRIGHTER TOMORROWS &mdash;&mdash;
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN (approx 60-62%): Crisp White Functional Workspace Selection */}
        <div className="lg:col-span-7 bg-white p-7 sm:p-9 lg:p-11 flex flex-col justify-between relative">
          {/* Top Status Indicators Row */}
          <div className="w-full flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] sm:text-xs font-semibold text-emerald-900 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Academic Systems Operational</span>
            </div>

            <div className="flex items-center gap-3 text-slate-500 text-[11px] sm:text-xs font-medium">
              <span className="inline-flex items-center gap-1 text-slate-600">
                <Lock size={13} className="text-emerald-700" />
                <span>Secure Login</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-slate-400">
                <Signal size={12} className="text-emerald-700" />
                <span>TLS 1.3 Encrypted</span>
              </span>
            </div>
          </div>

          {/* Main UX Functional Selection Block */}
          <div className="my-auto py-4 flex flex-col items-center text-center">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-[#085a4e] mb-1.5">
              SUPERIOR COLLEGE JAHANIAN
            </span>

            <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-black text-slate-900 tracking-tight">
              Choose Your Portal
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 mb-6 max-w-md leading-relaxed">
              Select your role to access personalised features, academic information, and campus services.
            </p>

            {/* 3 Interactive Selectable Role Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full mb-6 text-left">
              {roleCards.map((card) => {
                const IconComponent = card.icon;
                const isSelected = selectedRole === card.id;

                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedRole(card.id)}
                    onDoubleClick={() => onSelectPortal(card.id)}
                    className={`relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all cursor-pointer group ${
                      isSelected
                        ? "border-2 border-emerald-600 bg-emerald-50/45 shadow-md ring-2 ring-emerald-500/15"
                        : "border border-slate-200/80 bg-white hover:border-emerald-300 hover:bg-slate-50/70 shadow-xs"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check size={10} className="stroke-[3]" />
                      </div>
                    )}

                    <div>
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-emerald-50 text-emerald-800 group-hover:bg-emerald-100/70"
                        }`}
                      >
                        <IconComponent size={20} />
                      </div>

                      <h3 className="text-sm sm:text-base font-black text-slate-900 mb-1">
                        {card.title}
                      </h3>

                      <p className="text-[11px] sm:text-xs text-slate-500 leading-snug mb-3">
                        {card.description}
                      </p>

                      {/* Micro-Features */}
                      <div className="space-y-1 pt-1 border-t border-slate-100">
                        {card.highlights.map((h, i) => (
                          <div key={i} className="text-[9.5px] text-slate-600 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-600" />
                            <span className="truncate">{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRole(card.id);
                          onSelectPortal(card.id);
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                            : "bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-800"
                        }`}
                      >
                        <ArrowRight size={14} className="stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main Role-Specific CTA Button */}
            <motion.button
              whileHover={{ scale: 1.015, y: -1 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => onSelectPortal(selectedRole)}
              className="w-full h-12 sm:h-13 rounded-xl bg-[#0c6b5d] hover:bg-[#09574b] text-white font-bold text-sm sm:text-[15px] tracking-wide shadow-[0_10px_25px_rgba(12,107,93,0.35)] hover:shadow-[0_15px_35px_rgba(12,107,93,0.45)] transition-all flex items-center justify-center gap-2.5 cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
              <span>{getCtaLabel()}</span>
              <ArrowRight size={16} className="stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
            </motion.button>

            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-3.5">
              &mdash;&mdash; A SMARTER CAMPUS FOR A BRIGHTER TOMORROW &mdash;&mdash;
            </p>
          </div>

          {/* Bottom Card Footer */}
          <div className="w-full pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <span>&copy; 2026 Superior Group of Colleges Jahanian. All rights reserved.</span>
            <span className="font-medium text-slate-500">Session 2026-28</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
