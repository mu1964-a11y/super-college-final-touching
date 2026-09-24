import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, User, CreditCard, Award, ArrowRight, CornerDownLeft, 
  Home, Users, Briefcase, Wallet, GraduationCap, CheckCircle2, 
  BarChart3, Settings as SettingsIcon, MessageSquare, X, Sparkles,
  Command, Layers, FileText, Receipt, Printer, Clock, ExternalLink,
  Calendar, ShieldCheck, Filter, Building2, AlertCircle, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getUnifiedTransactions } from '../utils/fee';
import AdmissionSlip from './AdmissionSlip';
import FeeReceipt from './FeeReceipt';
import BankChallanModal from './BankChallanModal';

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onSelectStudent: (student: any, tab?: 'profile' | 'financials' | 'academic' | 'whatsapp') => void;
  onNavigate: (page: string, filter?: string | null) => void;
}

// Helper to extract exact fee transaction date and time
function getLatestFeeDetails(student: any) {
  if (!student) return null;
  const txs = getUnifiedTransactions(student);
  if (!txs || txs.length === 0) return null;

  const latest = txs[0];
  let dateFormatted = 'Recorded';
  let timeFormatted = '';

  // 1. Try ISO or createdAt
  if (latest.createdAt || latest.created_at) {
    const d = new Date(latest.createdAt || latest.created_at);
    if (!isNaN(d.getTime())) {
      dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  } else if (typeof latest.date === 'string' && (latest.date.includes('T') || latest.date.includes(':'))) {
    const d = new Date(latest.date);
    if (!isNaN(d.getTime())) {
      dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  } else if (typeof latest.id === 'string' && latest.id.startsWith('tx-')) {
    const numPart = latest.id.replace('tx-', '').split('-')[0];
    const ts = Number(numPart);
    if (!isNaN(ts) && ts > 1600000000000 && ts < 2500000000000) {
      const d = new Date(ts);
      dateFormatted = latest.date 
        ? new Date(latest.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
        : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } else if (latest.date) {
      const d = new Date(latest.date);
      if (!isNaN(d.getTime())) {
        dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
  } else if (latest.date) {
    const d = new Date(latest.date);
    if (!isNaN(d.getTime())) {
      dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }

  const isWhatsApp = latest.paymentMethod === 'WhatsApp Bot' || 
    (latest.recordedBy || latest.collectedBy || '').toLowerCase().includes('whatsapp');

  return {
    amount: Number(latest.amount || 0),
    date: dateFormatted,
    time: timeFormatted,
    method: isWhatsApp ? 'WhatsApp Bot' : (latest.paymentMethod || 'Cash'),
    receiptId: latest.receiptId || latest.id,
    description: latest.description || 'Fee Voucher',
    count: txs.length
  };
}

export default function GlobalCommandPalette({
  isOpen,
  onClose,
  data,
  onSelectStudent,
  onNavigate,
}: GlobalCommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'students' | 'slips' | 'finance' | 'modules'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Document Preview Dialog states
  const [activeSlipStudent, setActiveSlipStudent] = useState<any | null>(null);
  const [activeReceiptStudent, setActiveReceiptStudent] = useState<any | null>(null);
  const [activeChallanStudent, setActiveChallanStudent] = useState<any | null>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setFilterCategory('all');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  // Global Navigation & Document Shortcuts
  const systemShortcuts = useMemo(() => [
    { 
      id: 'doc-admission-slip', 
      label: 'Official Admission Slips Desk', 
      icon: FileText, 
      category: 'slips', 
      hint: 'Admission Slips & Forms with Branded QR Code',
      action: () => onNavigate('admissions')
    },
    { 
      id: 'doc-fee-receipt', 
      label: 'Fee Receipts & Payment Vouchers', 
      icon: Receipt, 
      category: 'slips', 
      hint: 'Official Verified Receipts, Print & WhatsApp',
      action: () => onNavigate('fee')
    },
    { 
      id: 'doc-bank-challan', 
      label: 'Multi-Bank Challan Center (Meezan / HBL / BOP)', 
      icon: Building2, 
      category: 'slips', 
      hint: 'Generate 3-Fold Bank Deposit Slips',
      action: () => onNavigate('fee')
    },
    { 
      id: 'doc-result-card', 
      label: 'Student Exam Marks & Result Cards', 
      icon: Award, 
      category: 'slips', 
      hint: 'Preparatory Tests, Progress & Merit Lists',
      action: () => onNavigate('academic')
    },
    { 
      id: 'doc-ledger', 
      label: 'Financial Ledgers & Roznamcha Cash Flow', 
      icon: Wallet, 
      category: 'finance', 
      hint: 'Incomes, Expenses, Profit/Loss Audit',
      action: () => onNavigate('accounts')
    },
    { 
      id: 'dashboard', 
      label: 'Main Executive Dashboard', 
      icon: Home, 
      category: 'modules', 
      hint: 'Live College Statistics & Intelligence',
      action: () => onNavigate('dashboard')
    },
    { 
      id: 'students-boys', 
      label: 'Boys Campus Student Roster', 
      icon: Users, 
      category: 'modules', 
      hint: 'Active Boys Enrolled Directory',
      action: () => onNavigate('students-boys')
    },
    { 
      id: 'students-girls', 
      label: 'Girls Campus Student Roster', 
      icon: Users, 
      category: 'modules', 
      hint: 'Active Girls Enrolled Directory',
      action: () => onNavigate('students-girls')
    },
    { 
      id: 'fee-billing', 
      label: 'Fee Collection & Defaulters List', 
      icon: CreditCard, 
      category: 'finance', 
      hint: 'Collect dues, view overdue notices',
      action: () => onNavigate('fee')
    },
    { 
      id: 'whatsapp-center', 
      label: 'WhatsApp Center & 360° Automated Bot', 
      icon: MessageSquare, 
      category: 'modules', 
      hint: 'Live Chat, Broadcasts, Instant Verification',
      action: () => onNavigate('whatsapp-center')
    },
    { 
      id: 'staff-payroll', 
      label: 'Staff Directory, Attendance & Payroll HR', 
      icon: Briefcase, 
      category: 'modules', 
      hint: 'Faculty salaries, deductions & timetable',
      action: () => onNavigate('staff')
    },
    { 
      id: 'system-settings', 
      label: 'Campus Settings & Sub-Admin Roles', 
      icon: SettingsIcon, 
      category: 'modules', 
      hint: 'College branding, fees, modules & backup',
      action: () => onNavigate('settings')
    },
  ], [onNavigate]);

  // Filter students based on query (name, rollNo, contact, fatherName, class/group)
  const matchingStudents = useMemo(() => {
    if (filterCategory === 'modules') return [];
    const students = data?.students || [];
    if (!query.trim()) {
      if (filterCategory === 'students' || filterCategory === 'slips' || filterCategory === 'finance') {
        return students.slice(0, 10);
      }
      return [];
    }

    const q = query.toLowerCase().trim();
    const cleanQ = q.replace(/\D/g, '');

    return students.filter((s: any) => {
      const name = (s.fullName || s.name || '').toLowerCase();
      const father = (s.fatherName || s.father_name || '').toLowerCase();
      const roll = String(s.collegeNo || s.rollNo || s.id || '').toLowerCase();
      const group = (s.group || s.category || s.discipline || '').toLowerCase();
      const contact = String(s.contact || s.phone || s.fatherContact || '').replace(/\D/g, '');

      return name.includes(q) || 
             father.includes(q) || 
             roll.includes(q) || 
             group.includes(q) ||
             (cleanQ && cleanQ.length >= 3 && contact.includes(cleanQ));
    }).slice(0, 10);
  }, [query, data?.students, filterCategory]);

  // Filter shortcuts
  const matchingShortcuts = useMemo(() => {
    if (filterCategory === 'students') return [];
    let pool = systemShortcuts;
    if (filterCategory === 'slips') {
      pool = pool.filter(s => s.category === 'slips');
    } else if (filterCategory === 'finance') {
      pool = pool.filter(s => s.category === 'finance');
    } else if (filterCategory === 'modules') {
      pool = pool.filter(s => s.category === 'modules');
    }

    if (!query.trim()) {
      return pool.slice(0, 6);
    }

    const q = query.toLowerCase().trim();
    return pool.filter(s => 
      s.label.toLowerCase().includes(q) || 
      s.hint.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      q.includes('slip') || q.includes('receipt') || q.includes('challan') || q.includes('result') || q.includes('ledger')
    );
  }, [query, systemShortcuts, filterCategory]);

  // Keyboard navigation handler (Arrows, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const total = matchingStudents.length + matchingShortcuts.length;
      if (total > 0) setSelectedIndex(prev => (prev + 1) % total);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const total = matchingStudents.length + matchingShortcuts.length;
      if (total > 0) setSelectedIndex(prev => (prev - 1 + total) % total);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < matchingStudents.length) {
        const student = matchingStudents[selectedIndex];
        if (student) {
          onSelectStudent(student, 'profile');
          onClose();
        }
      } else {
        const shortcutIndex = selectedIndex - matchingStudents.length;
        const shortcut = matchingShortcuts[shortcutIndex];
        if (shortcut) {
          shortcut.action();
          onClose();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[5vh] sm:pt-[7vh] px-3 sm:px-4 bg-slate-950/75 backdrop-blur-xl">
          {/* Backdrop click to close */}
          <div className="fixed inset-0" onClick={onClose} />

          {/* 3D Elevated Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="bg-white/95 dark:bg-slate-900/95 border border-white/40 dark:border-slate-700/80 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.5),0_0_50px_rgba(13,148,136,0.18)] w-full max-w-3xl overflow-hidden relative z-10 flex flex-col max-h-[88vh]"
          >
            {/* Header Ambient Bar with 3D Brand Badge */}
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white shrink-0 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-44 h-44 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute left-1/3 -bottom-10 w-44 h-44 bg-superior-gold/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-superior-gold to-amber-300 flex items-center justify-center text-slate-950 shadow-md">
                    <Sparkles size={16} className="fill-slate-950" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                      SCJ Omni Spotlight Search
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0">
                        Universal Hub
                      </Badge>
                    </h3>
                    <p className="text-[11px] text-teal-200/70 font-medium">
                      Instant access to Student 360°, Admission Slips, Fee Receipts & Exam Cards
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold bg-white/10 text-teal-200 rounded-lg border border-white/15 shadow-inner">
                    <Command size={11} /> K
                  </kbd>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* 3D Search Input Bar */}
              <div className="relative flex items-center">
                <Search size={18} className="absolute left-4 text-teal-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by Name, Roll No (e.g. 1042), Father Name, Phone, or Slips..."
                  className="w-full pl-11 pr-24 py-3 bg-white/10 dark:bg-black/30 border border-white/20 focus:border-teal-400 rounded-2xl outline-none text-white text-sm sm:text-base font-medium placeholder-white/40 focus:ring-4 focus:ring-teal-500/20 transition-all shadow-inner"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery('');
                      setSelectedIndex(0);
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3 px-2 py-1 text-[11px] text-teal-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Quick Filter Segmented Pills */}
              <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-0.5 text-[11px] font-bold">
                {[
                  { id: 'all', label: 'All Results' },
                  { id: 'students', label: 'Students 360°' },
                  { id: 'slips', label: 'Slips & Receipts' },
                  { id: 'finance', label: 'Fee & Ledgers' },
                  { id: 'modules', label: 'Modules' },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => {
                      setFilterCategory(pill.id as any);
                      setSelectedIndex(0);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-xl transition-all whitespace-nowrap border shrink-0",
                      filterCategory === pill.id
                        ? "bg-teal-500 text-slate-950 font-black border-teal-400 shadow-md scale-102"
                        : "bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border-white/10"
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">

              {/* SECTION 1: MATCHING STUDENTS */}
              {matchingStudents.length > 0 && (
                <div className="space-y-2.5">
                  <div className="px-2 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-400">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-teal-600" />
                      Student Profiles & Fee Submissions ({matchingStudents.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold normal-case">
                      Click button to open slip / receipt directly
                    </span>
                  </div>

                  {matchingStudents.map((student: any, idx: number) => {
                    const isSelected = selectedIndex === idx;
                    const totalPkg = Number(student.totalPackage || student.feeLedger?.totalPackage || 0);
                    const feeRcv = Number(student.feeReceived || student.feeLedger?.totalReceived || 0);
                    const remaining = Math.max(0, totalPkg - feeRcv);
                    const latestTx = getLatestFeeDetails(student);

                    return (
                      <div
                        key={student.id || idx}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          "group relative rounded-2xl p-3 sm:p-3.5 transition-all duration-200 border",
                          isSelected
                            ? "bg-teal-50/70 dark:bg-teal-950/30 border-teal-500/60 shadow-[0_8px_25px_-5px_rgba(13,148,136,0.2)] ring-1 ring-teal-500/40"
                            : "bg-white dark:bg-slate-900/70 border-slate-200/90 dark:border-slate-800/90 hover:border-teal-400/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-2xs"
                        )}
                      >
                        {/* Top Info Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar with 3D Ring */}
                            <div className={cn(
                              "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900",
                              isSelected ? "ring-2 ring-teal-500" : ""
                            )}>
                              {student.photo ? (
                                <img
                                  src={student.photo}
                                  alt={student.fullName || ''}
                                  className="w-full h-full object-cover object-[center_top]"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-teal-800 dark:text-teal-300 font-extrabold">
                                  {(student.fullName || 'S').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>

                            {/* Name, Roll & Bio */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-slate-900 dark:text-white text-sm truncate">
                                  {student.fullName}
                                </h4>
                                <Badge className="text-[10px] font-black bg-superior-gold text-slate-950 border-none shadow-2xs px-2 py-0">
                                  Roll #{student.collegeNo || student.rollNo || student.id}
                                </Badge>
                                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-100/60 dark:bg-teal-900/40 px-2 py-0.5 rounded-md">
                                  {student.group || student.category || 'F.Sc'} {student.section ? `(Sec ${student.section})` : ''}
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                                Father: <b className="text-slate-700 dark:text-slate-200 font-semibold">{student.fatherName || 'N/A'}</b>
                                {student.contact && (
                                  <> • Phone: <span className="font-mono text-slate-600 dark:text-slate-300">{student.contact}</span></>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Cleared vs Balance Badge */}
                          <div className="shrink-0 text-right">
                            {remaining > 0 ? (
                              <Badge variant="outline" className="text-[11px] font-black text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5">
                                Dues: Rs. {remaining.toLocaleString()}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5">
                                Cleared (NIL)
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* FEE SUBMISSION TIME CAPSULE (CRITICAL REQUIREMENT) */}
                        {latestTx ? (
                          <div className="mt-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-slate-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900/60 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
                              <span className="font-extrabold text-emerald-900 dark:text-emerald-300">
                                Latest Fee Paid: <span className="text-emerald-700 dark:text-emerald-200">Rs. {latestTx.amount.toLocaleString()}</span>
                              </span>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                                <Calendar size={12} className="text-emerald-600 dark:text-emerald-400" />
                                {latestTx.date}
                              </span>
                              {latestTx.time && (
                                <span className="font-mono text-emerald-800 dark:text-emerald-300 font-black flex items-center gap-1 bg-white/90 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800 text-[11px] shadow-2xs">
                                  <Clock size={11} className="text-teal-600 dark:text-teal-400" />
                                  {latestTx.time}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                {latestTx.method}
                              </span>
                            </div>

                            <div className="text-[11px] font-mono font-bold flex items-center gap-2 text-slate-500 dark:text-slate-400">
                              <span>Total: <b>Rs. {totalPkg.toLocaleString()}</b></span>
                              <span>•</span>
                              <span>Rcvd: <b className="text-emerald-600 dark:text-emerald-400">Rs. {feeRcv.toLocaleString()}</b></span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between text-xs">
                            <span className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                              <AlertCircle size={13} className="text-amber-600" />
                              No fee payment submitted yet
                            </span>
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-[11px]">
                              Total Package: Rs. {totalPkg.toLocaleString()}
                            </span>
                          </div>
                        )}

                        {/* DIRECT 3D SLIPS & ACTION LAUNCHERS (CRITICAL REQUIREMENT) */}
                        <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5 sm:gap-2">
                          {/* 1. Official Admission Slip */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSlipStudent(student);
                            }}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-teal-50 hover:bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:hover:bg-teal-900 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800 transition-all flex items-center gap-1.5 shadow-2xs hover:scale-102 active:scale-98"
                            title="View official Admission Slip with QR Code"
                          >
                            <FileText size={12} className="text-teal-600 dark:text-teal-400" />
                            Admission Slip
                          </button>

                          {/* 2. Official Fee Receipt */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveReceiptStudent(student);
                            }}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 transition-all flex items-center gap-1.5 shadow-2xs hover:scale-102 active:scale-98"
                            title="View official Fee Receipt voucher & Print"
                          >
                            <Receipt size={12} className="text-emerald-600 dark:text-emerald-400" />
                            Fee Receipt
                          </button>

                          {/* 3. 3-Part Bank Challan */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveChallanStudent(student);
                            }}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:hover:bg-blue-900 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 transition-all flex items-center gap-1.5 shadow-2xs hover:scale-102 active:scale-98"
                            title="Generate 3-Fold Bank Deposit Slip (Meezan / HBL / BOP)"
                          >
                            <Building2 size={12} className="text-blue-600 dark:text-blue-400" />
                            Bank Challan
                          </button>

                          {/* 4. Financial Ledger Statement */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectStudent(student, 'financials');
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:hover:bg-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 transition-all flex items-center gap-1.5 shadow-2xs hover:scale-102 active:scale-98"
                            title="Open Financial Ledger & Installment Vouchers"
                          >
                            <CreditCard size={12} className="text-amber-600 dark:text-amber-400" />
                            Financial Ledger
                          </button>

                          {/* 5. Academic Result Card */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectStudent(student, 'academic');
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-purple-50 hover:bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:hover:bg-purple-900 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 transition-all flex items-center gap-1.5 shadow-2xs hover:scale-102 active:scale-98"
                            title="Open Exam Marks & Academic Result Register"
                          >
                            <Award size={12} className="text-purple-600 dark:text-purple-400" />
                            Result Card
                          </button>

                          {/* 6. Open Full Student 360° Profile */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectStudent(student, 'profile');
                              onClose();
                            }}
                            className="ml-auto px-3 py-1 rounded-xl text-[11px] font-black bg-slate-900 hover:bg-slate-800 text-white dark:bg-teal-600 dark:hover:bg-teal-500 dark:text-white transition-all flex items-center gap-1 shadow-sm hover:scale-102 active:scale-98"
                          >
                            <span>Open 360°</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SECTION 2: SYSTEM SHORTCUTS & DOCUMENT CENTERS */}
              {matchingShortcuts.length > 0 && (
                <div className="space-y-2">
                  <div className="px-2 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Command size={13} />
                      Document Desks & Direct System Navigation
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {matchingShortcuts.map((shortcut, idx) => {
                      const itemIndex = matchingStudents.length + idx;
                      const isSelected = selectedIndex === itemIndex;
                      const Icon = shortcut.icon;

                      return (
                        <div
                          key={shortcut.id}
                          onClick={() => {
                            shortcut.action();
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border",
                            isSelected
                              ? "bg-slate-100 dark:bg-slate-800 border-teal-500/80 shadow-md scale-101"
                              : "bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
                              isSelected 
                                ? "bg-teal-600 text-white" 
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            )}>
                              <Icon size={17} />
                            </div>
                            <div className="truncate">
                              <h5 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs truncate">
                                {shortcut.label}
                              </h5>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                {shortcut.hint}
                              </p>
                            </div>
                          </div>

                          <ChevronRight size={14} className={cn(
                            "shrink-0 transition-transform",
                            isSelected ? "text-teal-600 translate-x-0.5" : "text-slate-300 dark:text-slate-600"
                          )} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* EMPTY STATE */}
              {matchingStudents.length === 0 && matchingShortcuts.length === 0 && (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 shadow-inner">
                    <Search size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                      No matching records or documents found
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Search by student name, roll number (e.g. 1042), phone number, or try "slip", "receipt", "result", or "ledger".
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Footer Help */}
            <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0 px-5">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-medium">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[9px] font-mono shadow-2xs">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[9px] font-mono shadow-2xs">↵</kbd>
                  Open 360°
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[9px] font-mono shadow-2xs">Esc</kbd>
                  Dismiss
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-teal-700 dark:text-teal-400">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                Superior Group of Colleges Jahanian
              </div>
            </div>

          </motion.div>
        </div>
      </AnimatePresence>

      {/* POPUP 1: DIRECT OFFICIAL ADMISSION SLIP MODAL */}
      <Dialog 
        open={Boolean(activeSlipStudent)} 
        onOpenChange={(open) => !open && setActiveSlipStudent(null)}
      >
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <FileText className="text-teal-600" size={20} />
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                  Official Admission Slip Preview
                </h3>
                <p className="text-[11px] text-slate-400">
                  Student: {activeSlipStudent?.fullName} • Roll: {activeSlipStudent?.collegeNo || activeSlipStudent?.id}
                </p>
              </div>
            </div>
          </div>
          {activeSlipStudent && (
            <AdmissionSlip 
              admission={activeSlipStudent} 
              settings={data?.settings} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* POPUP 2: DIRECT OFFICIAL FEE RECEIPT MODAL */}
      <Dialog 
        open={Boolean(activeReceiptStudent)} 
        onOpenChange={(open) => !open && setActiveReceiptStudent(null)}
      >
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Receipt className="text-emerald-600" size={20} />
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                  Official Fee Payment Voucher & Receipt
                </h3>
                <p className="text-[11px] text-slate-400">
                  Student: {activeReceiptStudent?.fullName} • Roll: {activeReceiptStudent?.collegeNo || activeReceiptStudent?.id}
                </p>
              </div>
            </div>
          </div>
          {activeReceiptStudent && (
            <FeeReceipt 
              student={activeReceiptStudent} 
              settings={data?.settings} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* POPUP 3: DIRECT 3-PART BANK CHALLAN MODAL */}
      <BankChallanModal
        isOpen={Boolean(activeChallanStudent)}
        onClose={() => setActiveChallanStudent(null)}
        students={activeChallanStudent ? [activeChallanStudent] : []}
        settings={data?.settings}
      />
    </>
  );
}
