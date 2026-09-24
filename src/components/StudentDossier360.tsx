import React, { useState } from 'react';
import { 
  X, User, Phone, MapPin, Calendar, CreditCard, Award, 
  GraduationCap, CheckCircle2, AlertCircle, Download, 
  MessageSquare, Send, ExternalLink, ShieldCheck, FileText,
  DollarSign, Clock, ArrowUpRight, Building2, BookOpen,
  Sparkles, Layers, Check, Copy, Printer
} from 'lucide-react';
import BankChallanModal from './BankChallanModal';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getUnifiedTransactions } from '../utils/fee';
import { getDocumentLink } from '../lib/whatsappAutomation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StudentDossier360Props {
  student: any | null;
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onOpenWhatsApp?: (phone: string) => void;
  initialTab?: 'profile' | 'financials' | 'academic' | 'whatsapp';
  autoOpenChallan?: boolean;
}

export default function StudentDossier360({
  student,
  isOpen,
  onClose,
  data,
  onOpenWhatsApp,
  initialTab = 'profile',
  autoOpenChallan = false,
}: StudentDossier360Props) {
  const [activeTab, setActiveTab] = useState<'profile' | 'financials' | 'academic' | 'whatsapp'>(initialTab);
  const [isChallanOpen, setIsChallanOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
    if (autoOpenChallan) {
      setIsChallanOpen(true);
    }
  }, [initialTab, autoOpenChallan, student]);

  if (!isOpen || !student) return null;

  const copyToClipboard = (text: string, label: string) => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Normalize session format so 2026-2028 becomes 2026-28
  const normalizeSession = (s: string | null | undefined): string => {
    if (!s) return "";
    let trimmed = s.trim();
    if (trimmed.match(/^\d{4}-\d{4}$/)) {
      const parts = trimmed.split('-');
      if (parts[1].length === 4) {
        trimmed = `${parts[0]}-${parts[1].substring(2)}`;
      }
    }
    return trimmed;
  };

  // Calculate financial statistics - exact mathematical balance
  const totalPackage = Number(student.totalPackage || student.feeLedger?.totalPackage || 0);
  const totalReceived = Number(student.feeReceived || student.feeLedger?.totalReceived || 0);
  const remainingBalance = Math.max(0, totalPackage - totalReceived);
  const paymentRatio = totalPackage > 0 ? Math.min(100, Math.round((totalReceived / totalPackage) * 100)) : 0;

  // Attendance metrics
  const presentDays = Number(student.attendance?.present || 0);
  const absentDays = Number(student.attendance?.absent || 0);
  const totalAttendanceDays = presentDays + absentDays;
  const attendancePercentage = totalAttendanceDays > 0 ? Math.round((presentDays / totalAttendanceDays) * 100) : 100;

  // Academic results lookup
  const academicRecords = (data?.academicRecords || []).filter(
    (r: any) => String(r.studentId) === String(student.id) || String(r.rollNo) === String(student.collegeNo || student.id)
  );

  // Unified Fee Transactions
  const feeTransactions = getUnifiedTransactions(student);

  // Quick WhatsApp message sender
  const handleQuickWhatsAppNotice = async (type: 'fee' | 'results' | 'general') => {
    const rawPhone = student.contact || student.fatherContact || student.phone;
    if (!rawPhone) {
      toast.error('No contact number available for this student.');
      return;
    }

    const cleanPhone = rawPhone.replace(/\D/g, '');
    const studentRef = student.collegeNo || student.id || 'N/A';
    let text = '';

    if (type === 'fee') {
      const statementUrl = getDocumentLink("statement", studentRef);
      text = 
`🏛️ *SUPERIOR COLLEGE JAHANIAN*
📄 *OFFICIAL FEE REMINDER & ACCOUNT STATEMENT*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian (${student.fatherName || 'Guardian'}),

Aapke bache ka fee ledger baqaya darj zail hai:

• *Student Name:* ${student.fullName}
• *Roll Number:* ${studentRef}
• *Class / Group:* ${student.group || student.category || 'Intermediate'}
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Outstanding Balance:* *Rs. ${remainingBalance.toLocaleString()}*
━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *Online Fee Statement / Ledger:*
${statementUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *Instruction:* Baraye meherbani aakhri tareekh se qabal accounts desk par baqaya fee jama karwa kar computerised receipt hasil karein.
📞 Accounts Desk: 0301-4455891
_Accounts & Finance Department, Superior College Jahanian_`;
    } else if (type === 'results') {
      const resultUrl = getDocumentLink("result", studentRef);
      const marksList = academicRecords.map((r: any) => `• *${r.subject || 'Assessment'}:* ${r.obtainedMarks}/${r.totalMarks}`).join('\n') || '• Academic records are being updated';
      text = 
`🏛️ *SUPERIOR COLLEGE JAHANIAN*
📊 *OFFICIAL ACADEMIC ASSESSMENT REPORT*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian (${student.fatherName || 'Guardian'}),

• *Student Name:* ${student.fullName}
• *Roll Number:* ${studentRef}
• *Class / Group:* ${student.group || student.category || 'Intermediate'}
━━━━━━━━━━━━━━━━━━━━━━━━━
📝 *Latest Examination Scores:*
${marksList}
━━━━━━━━━━━━━━━━━━━━━━━━━
📈 *Official Academic Result Card:*
${resultUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *Instruction:* Board imtehanat ki aala tayari ke liye regular revision yaqeeni banayein.
📞 Academic Helpdesk: 0301-4455891
_Office of the Controller of Examinations, Superior College Jahanian_`;
    } else {
      const dossierUrl = getDocumentLink("student", studentRef);
      text = 
`🏛️ *SUPERIOR COLLEGE JAHANIAN*
📋 *STUDENT PROGRESS UPDATE*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian (${student.fatherName || 'Guardian'}),

• *Student Name:* ${student.fullName}
• *Roll Number:* ${studentRef}
• *Class / Group:* ${student.group || student.category || 'Intermediate'}
• *Attendance Performance:* ${attendancePercentage}% (${presentDays} days present)

Aapke bache ka official 360° student portal record verified hai:
🔗 ${dossierUrl}

_Office of the Principal, Superior College Jahanian_`;
    }

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, message: text }),
      });
      const respData = await res.json();
      if (res.ok && respData.success) {
        toast.success(`WhatsApp ${type === 'fee' ? 'Fee Alert' : type === 'results' ? 'Score Card' : 'Update'} sent successfully!`);
      } else {
        // Fallback to wa.me direct link
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
        toast.info('Opened direct WhatsApp web portal');
      }
    } catch {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
      toast.info('Opened direct WhatsApp web portal');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xl">
        {/* Backdrop click to close */}
        <div className="fixed inset-0" onClick={onClose} />

        {/* 3D Elevated Chassis */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="bg-white/95 dark:bg-slate-900/95 border border-white/40 dark:border-slate-800 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.5),0_0_50px_rgba(13,148,136,0.18)] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden relative z-10"
        >
          {/* Top Header Banner with 3D Depth, Ambient Glow & Action Bar */}
          <div className="bg-gradient-to-r from-[#021f19] via-[#053229] to-[#011713] text-white p-5 sm:p-6 relative shrink-0 overflow-hidden border-b border-white/10 shadow-lg">
            {/* Ambient Glow Orbs */}
            <div className="absolute -right-10 -top-10 w-52 h-52 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 -bottom-10 w-44 h-44 bg-superior-gold/15 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button Top-Right */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer z-10"
              title="Close Dossier (Esc)"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative z-0">
              {/* Photo Avatar with 3D Metallic Ring */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 p-1 flex-shrink-0 shadow-[0_8px_24px_rgba(0,0,0,0.4)] relative overflow-hidden flex items-center justify-center border-2 border-superior-gold/50 ring-4 ring-superior-gold/20">
                {student.photo ? (
                  <img
                    src={student.photo}
                    alt={student.fullName}
                    className="w-full h-full object-cover object-[center_top] rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-800 to-teal-950 flex items-center justify-center">
                    <User size={40} className="text-superior-gold" />
                  </div>
                )}
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#053229] shadow-sm animate-pulse" />
              </div>

              {/* Student Identification & 3D Badges */}
              <div className="flex-1 text-center sm:text-left space-y-2 min-w-0 pr-0 sm:pr-8">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {/* 3D Gold Roll Badge */}
                  <Badge className="bg-gradient-to-r from-amber-400 via-superior-gold to-amber-500 text-slate-950 border-none text-[11px] font-black uppercase tracking-wider shadow-sm px-2.5 py-0.5">
                    ROLL: {student.collegeNo || student.id}
                  </Badge>

                  {/* Campus Badge */}
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-extrabold shadow-2xs px-2 py-0.5">
                    {student.gender === 'Female' ? 'Girls Campus' : 'Boys Campus'}
                  </Badge>

                  {/* Session Badge */}
                  {student.session && (
                    <Badge variant="outline" className="text-white/80 border-white/25 bg-white/5 text-[10px] font-mono shadow-2xs px-2 py-0.5">
                      Session {normalizeSession(student.session)}
                    </Badge>
                  )}

                  {/* 3D Dues vs Cleared Badge */}
                  {remainingBalance > 0 ? (
                    <Badge className="bg-gradient-to-r from-rose-600/30 to-red-600/20 text-rose-200 border border-rose-400/40 text-[10px] font-black shadow-xs px-2.5 py-0.5">
                      Dues: Rs. {remainingBalance.toLocaleString()}
                    </Badge>
                  ) : (
                    <Badge className="bg-gradient-to-r from-emerald-600/30 to-teal-600/20 text-emerald-200 border border-emerald-400/40 text-[10px] font-black shadow-xs px-2.5 py-0.5">
                      Fee Cleared (NIL)
                    </Badge>
                  )}

                  {/* WhatsApp Bot Badge */}
                  {((student.reference || '').toLowerCase().includes('whatsapp') || 
                    (student.notes && JSON.stringify(student.notes).toLowerCase().includes('whatsapp'))) && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold flex items-center gap-1 shadow-2xs px-2 py-0.5">
                      🤖 Via WhatsApp Bot {student.reference?.replace(/via whatsapp bot/i, '').replace(/[()]/g, '').trim() ? `(${student.reference.replace(/via whatsapp bot/i, '').replace(/[()]/g, '').trim()})` : ''}
                    </Badge>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate drop-shadow-sm">
                  {student.fullName}
                </h2>

                <p className="text-xs sm:text-sm text-white/80 font-medium truncate">
                  Father: <b className="text-white font-bold">{student.fatherName || 'N/A'}</b> • Program: <b className="text-superior-gold font-bold">{student.group || student.category || 'F.Sc'}</b> {student.section ? `(Sec ${student.section})` : ''}
                </p>
              </div>

              {/* 3D Action Buttons in Header (FIXED: NEVER SOLID WHITE) */}
              <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto justify-center sm:justify-start pt-2 sm:pt-0">
                {/* 1. Send Fee Alert (3D Emerald Button) */}
                <button
                  type="button"
                  onClick={() => handleQuickWhatsAppNotice('fee')}
                  className="flex-1 sm:flex-initial bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl h-9 px-4 shadow-[0_4px_14px_rgba(16,185,129,0.35)] hover:shadow-[0_6px_18px_rgba(16,185,129,0.45)] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <MessageSquare size={14} />
                  <span>Send Fee Alert</span>
                </button>

                {/* 2. Open Live Chat (3D Glassmorphic Button - ALWAYS VISIBLE TEXT & ICON) */}
                {onOpenWhatsApp && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWhatsApp(student.contact || student.fatherContact);
                    }}
                    className="flex-1 sm:flex-initial bg-white/10 hover:bg-white/20 text-white border border-white/25 hover:border-white/40 text-xs font-bold rounded-xl h-9 px-4 shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                  >
                    <ExternalLink size={14} className="text-teal-300" />
                    <span>Open Live Chat</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3D Segmented Control Tab Navigation */}
          <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/80 px-4 sm:px-6 py-2.5 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: 'profile', label: 'Bio & Identity', icon: User, count: null },
                { id: 'financials', label: 'Financial Ledger', icon: CreditCard, count: feeTransactions.length },
                { id: 'academic', label: 'Academic Results', icon: Award, count: academicRecords.length },
                { id: 'whatsapp', label: 'Direct WhatsApp', icon: MessageSquare, count: null },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all duration-200 cursor-pointer whitespace-nowrap",
                      isActive
                        ? "bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-[0_3px_12px_rgba(0,0,0,0.08)] border border-slate-200/90 dark:border-slate-700/80 font-black scale-102"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50 font-bold"
                    )}
                  >
                    <Icon size={14} className={isActive ? "text-teal-600 dark:text-teal-400" : "text-slate-400"} />
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span className={cn(
                        "text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold",
                        isActive 
                          ? "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* TAB 1: BIO & IDENTITY (PREMIUM 3D CARDS AS REQUESTED) */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 4 Elevated 3D Metric Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {/* Card 1: Group & Program */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-white via-slate-50/60 to-teal-50/40 dark:from-slate-800 dark:via-slate-800/90 dark:to-teal-950/20 border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(13,148,136,0.12)] hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-slate-400 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Group & Program</span>
                      <div className="w-6 h-6 rounded-lg bg-teal-100/70 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300">
                        <GraduationCap size={13} />
                      </div>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                      {student.group || student.category || 'Humanities'}
                    </p>
                  </div>

                  {/* Card 2: Section */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-white via-slate-50/60 to-blue-50/40 dark:from-slate-800 dark:via-slate-800/90 dark:to-blue-950/20 border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(59,130,246,0.12)] hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-slate-400 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Section</span>
                      <div className="w-6 h-6 rounded-lg bg-blue-100/70 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300">
                        <Layers size={13} />
                      </div>
                    </div>
                    <p className="text-sm font-black text-blue-700 dark:text-blue-400 leading-snug">
                      Section {student.section || 'A'}
                    </p>
                  </div>

                  {/* Card 3: Attendance Ratio */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-white via-slate-50/60 to-emerald-50/40 dark:from-slate-800 dark:via-slate-800/90 dark:to-emerald-950/20 border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.12)] hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-slate-400 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Attendance Ratio</span>
                      <div className="w-6 h-6 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 size={13} />
                      </div>
                    </div>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 leading-snug">
                      {attendancePercentage}% <span className="text-xs font-normal text-slate-500">({presentDays}/{totalAttendanceDays || presentDays} Days)</span>
                    </p>
                  </div>

                  {/* Card 4: Current Status */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-white via-slate-50/60 to-teal-50/50 dark:from-slate-800 dark:via-slate-800/90 dark:to-teal-950/30 border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(13,148,136,0.12)] hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-slate-400 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current Status</span>
                      <div className="w-6 h-6 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                        <Sparkles size={13} />
                      </div>
                    </div>
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 leading-snug flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      ACTIVE ENROLLED
                    </p>
                  </div>
                </div>

                {/* 3D Details Breakdown Grid (Profile + Contact) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {/* Left: Student Profile Details Card */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.04)] space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-400 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300 shadow-2xs">
                          <User size={14} />
                        </div>
                        Student Profile Details
                      </h4>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs space-y-2.5">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500 font-medium">Full Legal Name</span>
                        <span className="font-black text-slate-900 dark:text-white uppercase">{student.fullName}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-500 font-medium">Father / Guardian</span>
                        <span className="font-black text-slate-800 dark:text-slate-200 uppercase">{student.fatherName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-500 font-medium">CNIC / B-Form</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{student.cnic || student.bForm || 'Not Registered'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-500 font-medium">Gender / Campus</span>
                        <Badge variant="outline" className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {student.gender || 'Female'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-500 font-medium">Address</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-right truncate max-w-[220px]" title={student.address}>
                          {student.address || 'Jahanian Campus Vicinity'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Contact & Connectivity Card */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.04)] space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shadow-2xs">
                            <Phone size={14} />
                          </div>
                          Contact & Connectivity
                        </h4>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs space-y-2.5">
                        {/* Primary Phone */}
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-medium">Primary Phone</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                              {student.contact || student.phone || 'N/A'}
                            </span>
                            {student.contact && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(student.contact, 'Primary Phone')}
                                className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                                title="Copy Number"
                              >
                                {copiedField === 'Primary Phone' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Father WhatsApp */}
                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-slate-500 font-medium">Father WhatsApp</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                              {student.fatherContact || student.contact || 'N/A'}
                            </span>
                            {(student.fatherContact || student.contact) && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(student.fatherContact || student.contact, 'Father WhatsApp')}
                                className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                                title="Copy WhatsApp"
                              >
                                {copiedField === 'Father WhatsApp' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Academic Part */}
                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-slate-500 font-medium">Academic Part</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {student.academicPart || 'Part-1'}
                          </span>
                        </div>

                        {/* Admission Reference */}
                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-slate-500 font-medium">Admission Reference</span>
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 font-semibold truncate max-w-[200px]" title={student.admissionId || student.id}>
                            {student.admissionId || student.id}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3D Action Button: Send General WhatsApp Ping */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleQuickWhatsAppNotice('general')}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl h-10 shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_18px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                      >
                        <MessageSquare size={14} />
                        <span>Send General WhatsApp Ping</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FINANCIALS & LEDGER */}
            {activeTab === 'financials' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 3 Elevated 3D Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-white via-teal-50/50 to-teal-100/40 dark:from-slate-800 dark:to-teal-950/30 border border-teal-200 dark:border-teal-900 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-400">Total Finalized Fee</span>
                    <p className="text-2xl font-black text-teal-950 dark:text-teal-100 mt-1">Rs. {totalPackage.toLocaleString()}</p>
                    <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium mt-0.5">Approved admission package</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-white via-emerald-50/50 to-emerald-100/40 dark:from-slate-800 dark:to-emerald-950/30 border border-emerald-200 dark:border-emerald-900 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Total Fee Paid</span>
                    <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">Rs. {totalReceived.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={paymentRatio} className="h-2 flex-1" />
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{paymentRatio}%</span>
                    </div>
                  </div>

                  <div className={cn(
                    "p-4 rounded-2xl border shadow-sm",
                    remainingBalance > 0 
                      ? "bg-gradient-to-br from-white via-rose-50/50 to-rose-100/40 dark:from-slate-800 dark:to-rose-950/30 border-rose-200 dark:border-rose-900" 
                      : "bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700"
                  )}>
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-400">Remaining Balance Dues</span>
                    <p className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-1">Rs. {remainingBalance.toLocaleString()}</p>
                    <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium mt-0.5">
                      {remainingBalance > 0 ? 'Pending student arrears' : 'No dues pending (Cleared)'}
                    </p>
                  </div>
                </div>

                {/* Transaction History Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Payment History & Receipt Vouchers ({feeTransactions.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsChallanOpen(true)}
                        className="border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold rounded-xl h-8 px-3 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Building2 size={12} /> 3-Copy Bank Challan
                      </button>
                      {remainingBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => handleQuickWhatsAppNotice('fee')}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl h-8 px-3 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Send size={12} /> Send Due Notice
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Receipt / Month</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Amount Paid</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Payment Date & Time</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Payment Mode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feeTransactions.length > 0 ? (
                          feeTransactions.map((tx: any, idx: number) => (
                            <TableRow key={tx.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                              <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                {tx.description || tx.month || `Voucher #${tx.receiptId || idx + 1}`}
                              </TableCell>
                              <TableCell className="text-right font-black text-emerald-600 text-xs">
                                Rs. {(tx.amount || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-slate-500">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {tx.date ? new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recorded'}
                                </div>
                                {(() => {
                                  let timeDisplay = '';
                                  if (tx.createdAt || tx.created_at) {
                                    const d = new Date(tx.createdAt || tx.created_at);
                                    if (!isNaN(d.getTime())) timeDisplay = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                                  } else if (typeof tx.date === 'string' && (tx.date.includes('T') || tx.date.includes(':'))) {
                                    const d = new Date(tx.date);
                                    if (!isNaN(d.getTime())) timeDisplay = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                                  } else if (typeof tx.id === 'string' && tx.id.startsWith('tx-')) {
                                    const ts = Number(tx.id.replace('tx-', '').split('-')[0]);
                                    if (!isNaN(ts) && ts > 1600000000000 && ts < 2500000000000) {
                                      timeDisplay = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                                    }
                                  }
                                  return timeDisplay ? (
                                    <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1 mt-0.5">
                                      <Clock size={10} />
                                      {timeDisplay}
                                    </div>
                                  ) : null;
                                })()}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[9px] font-bold uppercase",
                                    (tx.paymentMethod === 'WhatsApp Bot' || (tx.recordedBy || tx.collectedBy || '').toLowerCase().includes('whatsapp'))
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-black shadow-2xs"
                                      : ""
                                  )}
                                >
                                  {(tx.paymentMethod === 'WhatsApp Bot' || (tx.recordedBy || tx.collectedBy || '').toLowerCase().includes('whatsapp'))
                                    ? `🤖 Via WhatsApp Bot ${((tx.recordedBy || tx.collectedBy || '').replace(/whatsapp bot/i, '').replace(/[()]/g, '').trim()) ? `(${((tx.recordedBy || tx.collectedBy || '').replace(/whatsapp bot/i, '').replace(/[()]/g, '').trim())})` : ''}`
                                    : (tx.paymentMethod || 'Cash Payment')}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-28 text-center text-slate-400 italic text-xs">
                              No payment vouchers recorded yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ACADEMIC RESULTS */}
            {activeTab === 'academic' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Preparatory Tests & Examination Register
                    </h4>
                    <p className="text-[11px] text-slate-400">Official academic performance records for {student.fullName}</p>
                  </div>
                  {academicRecords.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleQuickWhatsAppNotice('results')}
                      className="bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl h-8 px-3 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Send size={12} /> Share Score Card via WhatsApp
                    </button>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase">Test Name & Type</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Subject</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center">Score / Marks</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Percentage</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Teacher</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {academicRecords.length > 0 ? (
                        academicRecords.map((rec: any, idx: number) => {
                          const percentage = rec.totalMarks > 0 ? Math.round((rec.obtainedMarks / rec.totalMarks) * 100) : 0;
                          return (
                            <TableRow key={rec.id || idx}>
                              <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                {rec.testName}
                                <span className="block text-[10px] text-slate-400 font-normal uppercase">{rec.testType || 'Quiz/Exam'}</span>
                              </TableCell>
                              <TableCell className="text-xs font-bold text-teal-700 dark:text-teal-400">
                                {rec.subject}
                              </TableCell>
                              <TableCell className="text-center font-mono font-black text-xs text-slate-800 dark:text-slate-100">
                                {rec.obtainedMarks} / {rec.totalMarks}
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-[10px] font-black ${
                                  percentage >= 75 ? 'bg-emerald-100 text-emerald-800' :
                                  percentage >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {percentage}% {percentage >= 50 ? 'PASS' : 'FAIL'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">
                                {rec.teacherName || 'Faculty Cell'}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic text-xs">
                            No examination records found for this student.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* TAB 4: DIRECT WHATSAPP ACTION SUITE */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl space-y-1 shadow-2xs">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck size={14} /> One-Click WhatsApp Notification Center
                  </h4>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-400">
                    Send automated, branded college notifications directly to the parent's phone without typing manually.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fee Reminder Card */}
                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800/40 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                        <CreditCard size={16} />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-800 dark:text-slate-100">Fee Arrears Notice</h5>
                        <p className="text-[10px] text-slate-400">Pending Dues: Rs. {remainingBalance.toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl font-mono leading-relaxed">
                      "Dear Parent! {student.fullName} ki baqaya fees Rs. {remainingBalance.toLocaleString()} jama karwayen..."
                    </p>
                    <button
                      type="button"
                      onClick={() => handleQuickWhatsAppNotice('fee')}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl h-9 shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Send size={13} /> Dispatch Fee Reminder
                    </button>
                  </div>

                  {/* Academic Results Notice Card */}
                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800/40 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                        <Award size={16} />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-800 dark:text-slate-100">Academic Score Card</h5>
                        <p className="text-[10px] text-slate-400">Total Tests Logged: {academicRecords.length}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl font-mono leading-relaxed">
                      "Dear Parent! {student.fullName} ki latest test performance report..."
                    </p>
                    <button
                      type="button"
                      onClick={() => handleQuickWhatsAppNotice('results')}
                      className="w-full bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl h-9 shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Send size={13} /> Dispatch Score Card
                    </button>
                  </div>
                </div>

                {/* Open in WhatsApp Center */}
                {onOpenWhatsApp && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenWhatsApp(student.contact || student.fatherContact);
                      }}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Go to WhatsApp Web 2-Pane Messenger to chat in real-time</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span>Campus: <b className="text-slate-700 dark:text-slate-300">{student.gender === 'Female' ? 'Girls' : 'Boys'}</b></span>
              <span>•</span>
              <span>Enrollment ID: <b className="font-mono text-slate-700 dark:text-slate-300">{student.id}</b></span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs transition-all cursor-pointer shadow-2xs"
            >
              Close Dossier
            </button>
          </div>

        </motion.div>
      </div>

      {/* 3-Copy Bank Challan Modal */}
      {isChallanOpen && (
        <BankChallanModal
          isOpen={isChallanOpen}
          onClose={() => setIsChallanOpen(false)}
          students={[student]}
          settings={data?.settings}
        />
      )}
    </AnimatePresence>
  );
}
