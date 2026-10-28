import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Calendar,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Scissors,
  Users,
  Receipt,
  Layers,
  CheckCircle2,
  Copy,
  DollarSign,
  QrCode as QrIcon,
} from 'lucide-react';
import {
  download4VouchersPerPagePdf,
  generate4VouchersPerPageDoc,
  getDefaultDueDate,
  numberToEnglishWords,
  numberToUrduWords,
} from '../utils/challanPdfGenerator';
import { toast } from 'sonner';

interface BankChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: any[] | null;
  allStudents?: any[];
  settings?: any;
  onQuickCollect?: (student: any, voucherNo: string, amount: number, month: string) => void;
}

const MONTH_PRESETS = [
  'November 2026',
  'December 2026',
  'January 2027',
  'February 2027',
  'March 2027',
  'Admission / 1st Installment',
];

export default function BankChallanModal({
  isOpen,
  onClose,
  students,
  allStudents = [],
  settings,
  onQuickCollect,
}: BankChallanModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Scope & Filtering State
  const [filterScope, setFilterScope] = useState<'selected' | 'group' | 'section' | 'defaulters' | 'all'>('selected');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedCampus, setSelectedCampus] = useState<'all' | 'Male' | 'Female'>('all');

  // Single Student Option
  const [singleStudentMode, setSingleStudentMode] = useState<'quad_copies' | 'single_slip'>('quad_copies');

  // Installment Mode & Custom Amount options
  const [installmentMode, setInstallmentMode] = useState<'fixed_installment' | 'full_balance'>('fixed_installment');
  const [fixedInstallmentAmount, setFixedInstallmentAmount] = useState<number>(5000);

  // Form Fields
  const [issueDate, setIssueDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [dueDate, setDueDate] = useState<string>(() => getDefaultDueDate(new Date()));
  const [lateSurcharge, setLateSurcharge] = useState<number>(100);
  const [feeMonth, setFeeMonth] = useState<string>('November 2026');

  const handleIssueDateChange = (newDate: string) => {
    setIssueDate(newDate);
    if (newDate) {
      setDueDate(getDefaultDueDate(newDate));
    }
  };

  // Preview Pagination (Page of 4 vouchers)
  const [previewPage, setPreviewPage] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Pool of students to pick from (normalized)
  const masterStudentPool = useMemo(() => {
    const raw = allStudents && allStudents.length > 0
      ? allStudents
      : Array.isArray(students)
        ? students
        : students
          ? [students]
          : [];

    return raw.map((s: any) => ({
      ...s,
      fullName: s.fullName || s.full_name || s.name || 'Verified Student',
      fatherName: s.fatherName || s.father_name || 'N/A',
      collegeNo: s.collegeNo || s.studentId || s.rollNumber || s.id || 'SCJ-0000',
      group: s.group || s.program || s.currentClass || s.category || 'Intermediate',
      section: s.section || 'A',
      gender: s.gender || (String(s.category || '').toLowerCase().includes('girl') ? 'Female' : 'Male'),
      session: s.session || '2026-28',
      totalPackage: Number(s.totalPackage ?? s.total_package ?? 0),
      feeReceived: Number(s.feeReceived ?? s.fee_received ?? 0),
    }));
  }, [allStudents, students]);

  // Available groups and sections dynamically derived from student pool
  const availableGroups = useMemo(() => {
    const s = new Set<string>();
    masterStudentPool.forEach((st) => {
      if (st.group) s.add(String(st.group).trim());
    });
    return Array.from(s).sort();
  }, [masterStudentPool]);

  const availableSections = useMemo(() => {
    const s = new Set<string>();
    masterStudentPool.forEach((st) => {
      if (st.section) s.add(String(st.section).trim().toUpperCase());
    });
    return Array.from(s).sort();
  }, [masterStudentPool]);

  // Compute Active Filtered Students List
  const activeStudentList = useMemo(() => {
    let list: any[] = [];

    if (filterScope === 'selected') {
      const selRaw = Array.isArray(students) ? students : students ? [students] : [];
      list = selRaw.map((s: any) => ({
        ...s,
        fullName: s.fullName || s.full_name || s.name || 'Verified Student',
        fatherName: s.fatherName || s.father_name || 'N/A',
        collegeNo: s.collegeNo || s.studentId || s.rollNumber || s.id || 'SCJ-0000',
        group: s.group || s.program || s.currentClass || s.category || 'Intermediate',
        section: s.section || 'A',
        gender: s.gender || (String(s.category || '').toLowerCase().includes('girl') ? 'Female' : 'Male'),
        session: s.session || '2026-28',
        totalPackage: Number(s.totalPackage ?? s.total_package ?? 0),
        feeReceived: Number(s.feeReceived ?? s.fee_received ?? 0),
      }));
    } else {
      list = [...masterStudentPool];
    }

    // Apply Campus Filter
    if (selectedCampus !== 'all') {
      list = list.filter((st) => st.gender === selectedCampus);
    }

    // Apply Group Filter
    if (filterScope === 'group' || selectedGroup !== 'all') {
      if (selectedGroup !== 'all') {
        list = list.filter((st) => String(st.group || '').toLowerCase() === selectedGroup.toLowerCase());
      }
    }

    // Apply Section Filter
    if (filterScope === 'section' || selectedSection !== 'all') {
      if (selectedSection !== 'all') {
        list = list.filter((st) => String(st.section || '').toUpperCase() === selectedSection.toUpperCase());
      }
    }

    // Apply Defaulters Filter
    if (filterScope === 'defaulters') {
      list = list.filter((st) => {
        const pkg = Number(st.totalPackage || 0);
        const rec = Number(st.feeReceived || 0);
        return pkg - rec > 0;
      });
    }

    return list;
  }, [filterScope, students, masterStudentPool, selectedCampus, selectedGroup, selectedSection]);

  if (!isOpen || !mounted) return null;

  const totalPages = Math.max(1, Math.ceil(activeStudentList.length / 2));
  const safePage = Math.min(previewPage, totalPages - 1);
  const pageStudentA = activeStudentList[safePage * 2];
  const pageStudentB = activeStudentList[safePage * 2 + 1];

  const collegeName = 'SUPERIOR COLLEGE JAHANIAN';
  const collegeAddress = settings?.address || 'Canal Road Campus, Jahanian';
  const collegeContact = settings?.contactNumber || 'Accounts Desk: 0331-2211147';

  // Helper to build structured, audit-ready voucher reference
  const getVoucherId = (student: any) => {
    const yStr = (issueDate || '').split('-')[0]?.slice(-2) || '26';
    const mStr = (issueDate || '').split('-')[1] || '11';
    const roll = String(student?.collegeNo || student?.rollNumber || student?.id || '101').replace(/[^a-zA-Z0-9]/g, '');
    return `VCH-${yStr}${mStr}-${roll}`;
  };

  // Download Action
  const handleDownloadPdf = async (singleOnly = false) => {
    setIsExporting(true);
    try {
      const toExport = singleOnly && activeStudentList[0] ? [activeStudentList[0]] : activeStudentList;
      if (toExport.length === 0) {
        toast.error('No students matching current filter.');
        return;
      }

      await download4VouchersPerPagePdf(toExport, undefined, {
        collegeName,
        collegeAddress,
        collegeContact,
        issueDate,
        dueDate,
        lateSurcharge,
        feeMonth,
        singleStudentMode: toExport.length === 1 ? singleStudentMode : undefined,
        installmentMode,
        fixedInstallmentAmount,
      });

      toast.success(
        toExport.length === 1
          ? `Fee Voucher downloaded for ${toExport[0].fullName || 'Student'} (College Copy + Student Copy)!`
          : `Downloaded Fee Vouchers for ${toExport.length} students (${Math.ceil(toExport.length / 2)} A4 Pages • 2 Copies / Student)!`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to download Fee Vouchers PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Direct Browser Print
  const handlePrint = () => {
    try {
      const doc = generate4VouchersPerPageDoc(activeStudentList, {
        collegeName,
        collegeAddress,
        collegeContact,
        issueDate,
        dueDate,
        lateSurcharge,
        feeMonth,
        singleStudentMode: activeStudentList.length === 1 ? singleStudentMode : undefined,
        installmentMode,
        fixedInstallmentAmount,
      });

      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      printIframe.src = blobUrl;
      document.body.appendChild(printIframe);
      printIframe.onload = () => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch {
          doc.save(`SCJ_Fee_Vouchers_${activeStudentList.length}_Students.pdf`);
        }
      };
      toast.success('Print document prepared!');
    } catch (err: any) {
      toast.error('Print preview failed: ' + err?.message);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl h-[94vh] max-h-[94vh] flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg text-white tracking-tight">
                  SUPERIOR COLLEGE JAHANIAN
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  Quad A4 Mode (2 Students / Page)
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  {feeMonth}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                Official Student Fee Vouchers • 4 Full-Width Horizontal Rows per A4 Sheet • College Copy & Student Copy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Format & Target Ribbon */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-5 py-2 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-700 text-white shadow-xs flex items-center gap-2">
              <Layers size={14} />
              <span>Standard Quad Mode (4 Horizontal Rows / A4 Sheet)</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              • 50% Paper & Photocopy Expense Saved
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Users size={14} className="text-emerald-600" />
            <span>
              Target: <strong className="text-emerald-700 dark:text-emerald-400">{activeStudentList.length} Students</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span>
              Sheets: <strong>{Math.ceil(activeStudentList.length / 2)} A4 Pages</strong>
            </span>
          </div>
        </div>

        {/* Main Content Grid: Left Controls (sticky bottom buttons) + Right Live Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* LEFT: Controls & Filters */}
          <div className="lg:col-span-4 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col h-full min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-3">
              {/* 1. Billing Month Selector */}
              <div className="space-y-2 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-emerald-600" />
                    <span>1. Billing Month / Term</span>
                  </span>
                  <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-black">
                    Printed on Banner
                  </span>
                </label>

                {/* Preset Month Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {MONTH_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFeeMonth(m)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        feeMonth === m
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <input
                    type="text"
                    value={feeMonth}
                    onChange={(e) => setFeeMonth(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 px-3 text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    placeholder="e.g. November 2026 / Custom Term"
                  />
                </div>
              </div>

              {/* 2. Download Scope Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Filter size={13} className="text-emerald-600" />
                  <span>2. Select Target Scope</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterScope('selected')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      filterScope === 'selected'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-600'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Current Selection ({Array.isArray(students) ? students.length : 1})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterScope('defaulters')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      filterScope === 'defaulters'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-600'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Pending Defaulters Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterScope('group')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      filterScope === 'group'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-600'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    By Class / Group
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterScope('section')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      filterScope === 'section'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-600'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    By Section
                  </button>
                </div>
              </div>

              {/* Sub-Filters: Group, Section, Campus */}
              <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700 space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                    Class / Academic Group
                  </label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-emerald-600"
                  >
                    <option value="all">All Academic Groups ({availableGroups.length})</option>
                    {availableGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                      Section
                    </label>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-emerald-600"
                    >
                      <option value="all">All Sections</option>
                      {availableSections.map((sec) => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                      Campus Shift
                    </label>
                    <select
                      value={selectedCampus}
                      onChange={(e) => setSelectedCampus(e.target.value as any)}
                      className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-emerald-600"
                    >
                      <option value="all">All Campuses</option>
                      <option value="Male">Boys Campus</option>
                      <option value="Female">Girls Campus</option>
                    </select>
                  </div>
                </div>

                {activeStudentList.length === 1 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block mb-1">
                      Single Student Copies / Page
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSingleStudentMode('single_slip')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          singleStudentMode === 'single_slip'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-600'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        2 Copies (College + Student)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSingleStudentMode('quad_copies')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          singleStudentMode === 'quad_copies'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-600'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        4 Copies (Full A4 Page)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Fee Calculation & Installment Mode */}
              <div className="space-y-3 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>3. Installment & Billing Mode</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-black">4 Rows A4</span>
                </label>

                <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setInstallmentMode('fixed_installment')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      installmentMode === 'fixed_installment'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-600'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[11px] font-black">💳 Fixed Installment</div>
                    <div className="text-[9px] font-semibold text-slate-600 mt-0.5">e.g. Rs. 5,000 / month</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstallmentMode('full_balance')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      installmentMode === 'full_balance'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-600'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[11px] font-black">📋 Full Remaining</div>
                    <div className="text-[9px] font-semibold text-slate-600 mt-0.5">Total balance due</div>
                  </button>
                </div>

                {installmentMode === 'fixed_installment' && (
                  <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                        Monthly Installment (PKR)
                      </label>
                      <span className="text-[10px] font-mono font-black text-emerald-800 dark:text-emerald-300">
                        Rs. {fixedInstallmentAmount.toLocaleString()}
                      </span>
                    </div>

                    <input
                      type="number"
                      value={fixedInstallmentAmount}
                      onChange={(e) => setFixedInstallmentAmount(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 px-3 text-xs font-black text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900"
                      placeholder="e.g. 5000"
                      step="500"
                    />

                    {/* Presets */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {[3000, 5000, 7000, 10000, 12000, 15000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setFixedInstallmentAmount(amt)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            fixedInstallmentAmount === amt
                              ? 'bg-emerald-700 text-white border-emerald-700 font-black'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-emerald-400'
                          }`}
                        >
                          Rs. {amt.toLocaleString()}
                        </button>
                      ))}
                    </div>

                    <p className="text-[9.5px] text-emerald-900 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-300/80 leading-relaxed font-medium">
                      💡 <strong>Smart Fallback:</strong> Agar kisi student ke total arrears Rs. {fixedInstallmentAmount.toLocaleString()} se kam hain (e.g. Rs. 3,200), toh uska voucher automatically actual baqaya (Rs. 3,200) ka hi banega.
                    </p>
                  </div>
                )}
              </div>

              {/* 4. Dates & Surcharge */}
              <div className="space-y-3 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  4. Voucher Dates & Late Fine
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">Issue Date</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => handleIssueDateChange(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 px-2 text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Due Date (10 Days)
                    </label>
                    <input
                      type="text"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 px-2 text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                      placeholder="e.g. 07-Nov-2026"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                      Late Fine after Due Date (Rs. / Day)
                    </label>
                    <span className="text-[10px] font-black text-rose-600 dark:text-rose-400">
                      Rs. {lateSurcharge} / Day
                    </span>
                  </div>
                  <input
                    type="number"
                    value={lateSurcharge}
                    onChange={(e) => setLateSurcharge(Number(e.target.value) || 0)}
                    className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 px-3 text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    step="50"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Action Buttons */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 shrink-0 shadow-lg space-y-2 z-20">
              <button
                type="button"
                onClick={() => handleDownloadPdf(false)}
                disabled={isExporting || activeStudentList.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-800 hover:from-emerald-800 hover:to-teal-900 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <Download size={17} />
                <span>
                  {isExporting
                    ? 'Generating Laser PDF...'
                    : `Download ${activeStudentList.length} Students (${Math.ceil(activeStudentList.length / 2)} A4 Pages • 2 Copies / Student)`}
                </span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={isExporting || activeStudentList.length === 0}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-100 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer size={15} />
                <span>Print Directly (A4 Laser)</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Visual Interactive A4 Portrait (4 Full-Width Horizontal Rows) Preview */}
          <div className="lg:col-span-8 p-4 bg-slate-100 dark:bg-slate-950 overflow-y-auto flex flex-col items-center min-h-0">
            {/* Preview Pagination */}
            <div className="w-full max-w-3xl flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText size={15} className="text-emerald-700" />
                <span>A4 Sheet Preview (4 Full-Width Horizontal Rows • Jameel Noori Nastaleeq Active)</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                  Page {safePage + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* A4 Sheet Mockup Container */}
            <div className="w-full max-w-3xl bg-white shadow-2xl rounded-2xl border-2 border-slate-400 p-3 relative overflow-hidden select-none space-y-2.5">
              {[0, 1, 2, 3].map((rowIdx) => {
                let student: any = null;
                let copyLabel = 'College Copy';

                if (activeStudentList.length === 1) {
                  student = pageStudentA;
                  if (rowIdx === 0) copyLabel = 'College Copy';
                  else if (rowIdx === 1) copyLabel = 'Student Copy';
                  else if (rowIdx === 2) {
                    student = singleStudentMode === 'quad_copies' ? pageStudentA : null;
                    copyLabel = 'Accounts Copy';
                  } else {
                    student = singleStudentMode === 'quad_copies' ? pageStudentA : null;
                    copyLabel = 'Audit Record';
                  }
                } else {
                  if (rowIdx < 2) {
                    student = pageStudentA;
                    copyLabel = rowIdx === 0 ? 'College Copy' : 'Student Copy';
                  } else {
                    student = pageStudentB;
                    copyLabel = rowIdx === 2 ? 'College Copy' : 'Student Copy';
                  }
                }

                if (!student) {
                  return (
                    <div
                      key={rowIdx}
                      className="h-28 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center p-3 text-center text-slate-400 gap-2"
                    >
                      <Scissors size={18} className="text-slate-300" />
                      <span className="text-xs font-bold">Blank Voucher Slot (Row {rowIdx + 1})</span>
                    </div>
                  );
                }

                const sName = student.fullName || student.name || 'Verified Student';
                const fName = student.fatherName || student.father_name || 'N/A';
                const rollNo = student.collegeNo || student.studentId || student.id || 'SCJ-0000';
                const prog = student.group || student.program || student.currentClass || 'Intermediate';
                const rawSec = student.section || 'A';
                const sec = String(rawSec).replace(/^(sec|section)\s*[:-]?\s*/i, '').trim() || 'A';
                const shift = student.gender === 'Female' ? 'Girls Campus' : 'Boys Campus';
                const session = student.session || '2026-28';
                const vchId = getVoucherId(student);

                const sTotalPkg = Number(student.totalPackage || 0);
                const sPaid = Number(student.feeReceived || 0);
                const sRemaining = Math.max(0, sTotalPkg - sPaid);

                let currentPayable = 0;
                let payableTag = '';
                if (installmentMode === 'fixed_installment' && fixedInstallmentAmount > 0) {
                  if (sRemaining <= fixedInstallmentAmount) {
                    currentPayable = sRemaining;
                    payableTag = 'Full Remaining Arrears';
                  } else {
                    currentPayable = fixedInstallmentAmount;
                    payableTag = `Installment (Remaining: Rs. ${(sRemaining - fixedInstallmentAmount).toLocaleString()})`;
                  }
                } else {
                  currentPayable = sRemaining;
                  payableTag = 'Full Outstanding Due';
                }

                const totalAfter = currentPayable + (currentPayable > 0 ? lateSurcharge : 0);
                const urduWords = numberToUrduWords(currentPayable);
                const englishWords = numberToEnglishWords(currentPayable);

                return (
                  <React.Fragment key={rowIdx}>
                    {rowIdx > 0 && (
                      <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 border-b border-dashed border-slate-400 py-0.5">
                        <span className="bg-white px-1">✂ CUT</span>
                        <span className="tracking-widest uppercase font-bold text-slate-500">
                          -- ✂ Cut Along Dashed Line For Student Handover ✂ --
                        </span>
                        <span className="bg-white px-1">CUT ✂</span>
                      </div>
                    )}

                    {/* Full-Width Horizontal Voucher Row Card */}
                    <div className="border-2 border-emerald-950 rounded-xl overflow-hidden bg-white shadow-xs flex flex-col text-[10px]">
                      {/* Row Header Banner */}
                      <div className="bg-[#044033] text-white px-3 py-1.5 border-b-2 border-amber-500 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-xs tracking-tight text-white">
                            SUPERIOR COLLEGE JAHANIAN
                          </h4>
                          <span className="text-[8px] bg-amber-400/20 text-amber-200 font-bold px-1.5 py-0.2 rounded border border-amber-400/30">
                            {feeMonth.toUpperCase()}
                          </span>
                          <span className="text-[8px] bg-white/20 text-white font-bold px-1.5 py-0.2 rounded">
                            {copyLabel.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[8.5px] font-mono">
                          <span className="font-bold text-white bg-emerald-900/80 px-1.5 py-0.5 rounded">
                            Ref: {vchId}
                          </span>
                          <span className="text-emerald-100">Issue: {issueDate}</span>
                          <span className="bg-rose-950 text-rose-200 font-black px-1.5 py-0.2 rounded border border-rose-700/50">
                            Due: {dueDate}
                          </span>
                        </div>
                      </div>

                      {/* Row Body: 3 Wide Horizontal Panels */}
                      <div className="p-2 grid grid-cols-12 gap-2 bg-white">
                        {/* Panel 1: Student Particulars (4 Cols) */}
                        <div className="col-span-4 bg-slate-50 p-2 rounded-lg border border-slate-300 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[8px] font-black text-emerald-900 uppercase">Student Particulars</span>
                              <span className="bg-[#044033] text-white font-black px-1.5 py-0.2 rounded text-[8px]">
                                Roll: {rollNo}
                              </span>
                            </div>
                            <div className="font-black text-black truncate text-[11px] leading-snug">{sName}</div>
                            <div className="text-[8.5px] text-slate-800 font-bold truncate">S/D/O: {fName}</div>
                            <div className="text-[8.5px] text-slate-900 font-black mt-0.5 truncate">{prog}</div>
                            <div className="text-[8px] text-slate-900 font-bold">Section: {sec} • {shift}</div>
                            <div className="text-[8px] text-emerald-800 font-black">{session}</div>
                          </div>

                          <div className="pt-1.5 border-t border-slate-300 text-[7.5px] text-slate-700 font-bold flex items-center justify-between">
                            <span>Depositor Sign: _________</span>
                          </div>
                        </div>

                        {/* Panel 2: Fee Particulars & Urdu Nastaleeq Figure (5 Cols) */}
                        <div className="col-span-5 flex flex-col justify-between p-1 bg-white">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] text-slate-800 font-bold">
                              <span>Total Package: <strong>Rs. {sTotalPkg.toLocaleString()}</strong></span>
                              <span>Paid: <strong className="text-emerald-700">Rs. {sPaid.toLocaleString()}</strong></span>
                            </div>
                            <div className="flex justify-between text-[8.5px] bg-rose-50 border border-rose-300 px-1.5 py-0.5 rounded text-rose-900 font-black">
                              <span>TOTAL REMAINING BALANCE:</span>
                              <span>Rs. {sRemaining.toLocaleString()}</span>
                            </div>

                            {/* Highlight Payable Box */}
                            <div className="bg-emerald-50 border-2 border-emerald-700 rounded-lg p-1.5 text-emerald-950 shadow-2xs">
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] font-black text-emerald-900 uppercase">
                                  Payable For {feeMonth}:
                                </span>
                                <span className="font-black text-sm text-emerald-900 leading-tight">
                                  Rs. {currentPayable.toLocaleString()}/-
                                </span>
                              </div>
                              <div className="text-[7.5px] text-emerald-800 font-bold truncate mt-0.5">
                                {payableTag} • ({englishWords})
                              </div>

                              {/* Jameel Noori Nastaleeq Urdu Words */}
                              <div
                                className="font-nastaleeq text-xs sm:text-[13px] font-black text-emerald-950 text-right dir-rtl leading-normal mt-1 pt-1 border-t border-emerald-300/80"
                                style={{ fontFamily: "'Jameel Noori Nastaleeq', 'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}
                              >
                                مبلغ: {urduWords}
                              </div>
                            </div>
                          </div>

                          <div className="pt-0.5 text-[7.5px] text-rose-800 font-black flex items-center justify-between">
                            <span>After Due Date (+Rs. {lateSurcharge}/day fine):</span>
                            <span className="text-rose-900 font-black">Rs. {totalAfter.toLocaleString()}/-</span>
                          </div>
                        </div>

                        {/* Panel 3: Cash Desk Verification & Audit Stamp (3 Cols) */}
                        <div className="col-span-3 border-2 border-slate-300 rounded-lg p-1.5 flex flex-col justify-between text-center bg-slate-50">
                          <div>
                            <div className="text-[8px] font-black text-emerald-950 uppercase flex items-center justify-center gap-1">
                              <span>Audit & Verification</span>
                            </div>
                            <div className="text-[7.5px] font-mono text-slate-800 font-bold mt-0.5 bg-white rounded border border-slate-200 py-0.5">
                              {vchId}
                            </div>
                          </div>

                          <div className="border border-dashed border-emerald-800 bg-white rounded p-1.5">
                            <div className="text-[7.5px] font-black text-[#044033]">ACCOUNTS CASH DESK</div>
                            <div className="text-[7px] text-black font-bold">Superior College Jahanian</div>
                            <div className="text-[6.5px] text-emerald-700 font-black mt-0.5">
                              STATUS: ISSUED (COUNTER PAYABLE)
                            </div>
                            <div className="text-[6px] text-slate-400 mt-1">Official Cashier Signature</div>
                          </div>

                          {/* Quick Collect Action at Cash Desk */}
                          {onQuickCollect && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickCollect(student, vchId, currentPayable, feeMonth);
                              }}
                              className="w-full py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[7.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs mt-1"
                              title="Instantly open Payment Dialog to receive cash and issue receipt against this voucher"
                            >
                              <DollarSign size={10} />
                              <span>Receive & Stamp</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bottom Footer Line */}
                      <div className="bg-slate-100 px-3 py-0.5 text-[7.5px] font-bold text-slate-800 border-t border-slate-200 flex justify-between">
                        <span>• Fee is payable on or before {dueDate}. After due date, late fine of Rs. {lateSurcharge}/day applies. Stamped slip is required for semester clearance.</span>
                        <span className="text-emerald-900 font-black">{collegeAddress}</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-600 font-bold mt-2.5 text-center">
              💡 <strong>Quad Mode (2 Students / A4 Sheet):</strong> 1 standard A4 sheet gives 4 vouchers total —
              2 copies per student (<strong>1 College Copy</strong> + <strong>1 Student Copy</strong>) with crisp cut-lines for photocopier savings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
