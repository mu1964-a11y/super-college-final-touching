import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Building2,
  Calendar,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Check,
  Scissors,
  Users,
  AlertTriangle,
  Receipt,
  Layers,
} from 'lucide-react';
import {
  downloadBankChallanPdf,
  download4VouchersPerPagePdf,
  generate4VouchersPerPageDoc,
  generate3CopyChallanDoc,
  getDefaultDueDate,
} from '../utils/challanPdfGenerator';
import { toast } from 'sonner';

interface BankChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: any[] | null;
  allStudents?: any[];
  settings?: any;
}

const BANK_OPTIONS = [
  {
    id: 'hbl',
    name: 'Habib Bank Limited (HBL)',
    accountTitle: 'Superior College Jahanian',
    accountNo: '0123-4567890123',
    branch: 'Canal Road Branch (0425)',
  },
  {
    id: 'bop',
    name: 'The Bank of Punjab (BOP)',
    accountTitle: 'Superior College Jahanian Collection',
    accountNo: '0987-6543210987',
    branch: 'Jahanian Main Branch (0112)',
  },
  {
    id: 'abl',
    name: 'Allied Bank Limited (ABL)',
    accountTitle: 'Superior College Jahanian Fee Account',
    accountNo: '5432-1098765432',
    branch: 'College Road Branch (0331)',
  },
  {
    id: 'mcb',
    name: 'Muslim Commercial Bank (MCB)',
    accountTitle: 'Superior College Jahanian',
    accountNo: '1122-3344556677',
    branch: 'Jahanian Cantt Branch (0211)',
  },
  {
    id: 'cash',
    name: 'College Accounts Office / Cash Counter',
    accountTitle: 'Superior College Jahanian (Cash Counter)',
    accountNo: 'DIRECT-CASH-RECEIPT',
    branch: 'Canal Road Campus Accounts Desk',
  },
];

export default function BankChallanModal({
  isOpen,
  onClose,
  students,
  allStudents = [],
  settings,
}: BankChallanModalProps) {
  // Primary format: 'college_quad' (4 vouchers per A4 page) vs 'bank_3copy'
  const [voucherFormat, setVoucherFormat] = useState<'college_quad' | 'bank_3copy'>('college_quad');

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
  const [selectedBankId, setSelectedBankId] = useState<string>('cash');
  const [dueDate, setDueDate] = useState<string>(() => getDefaultDueDate());
  const [issueDate, setIssueDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [lateSurcharge, setLateSurcharge] = useState<number>(500);
  const [feeMonth, setFeeMonth] = useState<string>('Monthly Installment');

  // Preview Pagination (Page of 4 vouchers)
  const [previewPage, setPreviewPage] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Pool of students to pick from
  const masterStudentPool = useMemo(() => {
    if (allStudents && allStudents.length > 0) return allStudents;
    return Array.isArray(students) ? students : students ? [students] : [];
  }, [allStudents, students]);

  // Available groups and sections dynamically derived from student pool
  const availableGroups = useMemo(() => {
    const s = new Set<string>();
    masterStudentPool.forEach((st) => {
      const g = st.group || st.program || st.currentClass || st.category;
      if (g) s.add(String(g).trim());
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
      list = Array.isArray(students) ? students : students ? [students] : [];
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
        list = list.filter((st) => {
          const g = st.group || st.program || st.currentClass || st.category || '';
          return String(g).toLowerCase() === selectedGroup.toLowerCase();
        });
      }
    }

    // Apply Section Filter
    if (filterScope === 'section' || selectedSection !== 'all') {
      if (selectedSection !== 'all') {
        list = list.filter((st) => {
          return String(st.section || '').toUpperCase() === selectedSection.toUpperCase();
        });
      }
    }

    // Apply Defaulters Filter
    if (filterScope === 'defaulters') {
      list = list.filter((st) => {
        const pkg = Number(st.totalPackage || st.total_package || 0);
        const rec = Number(st.feeReceived || st.fee_received || 0);
        const bal = pkg - rec;
        return bal > 0 || Number(st.previousArrears || st.arrears || 0) > 0;
      });
    }

    return list;
  }, [filterScope, students, masterStudentPool, selectedCampus, selectedGroup, selectedSection]);

  if (!isOpen) return null;

  const totalPages = Math.max(1, Math.ceil(activeStudentList.length / 4));
  const safePage = Math.min(previewPage, totalPages - 1);
  const currentQuadStudents = activeStudentList.slice(safePage * 4, safePage * 4 + 4);

  const collegeName = 'SUPERIOR COLLEGE JAHANIAN';
  const collegeAddress = settings?.address || 'Canal Road Campus, Jahanian';
  const collegeContact = settings?.contactNumber || 'Accounts Desk: 0331-2211147';

  // Download Action
  const handleDownloadPdf = async (singleOnly = false) => {
    setIsExporting(true);
    try {
      if (voucherFormat === 'college_quad') {
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
            ? `Fee Voucher downloaded for ${toExport[0].fullName || 'Student'}!`
            : `Downloaded 4-per-page Landscape Fee Vouchers for ${toExport.length} students (${Math.ceil(toExport.length / 4)} A4 Pages)!`
        );
      } else {
        // 3-Copy Bank Challan fallback
        const activeBank = BANK_OPTIONS.find((b) => b.id === selectedBankId) || BANK_OPTIONS[0];
        const toExport = singleOnly && activeStudentList[0] ? [activeStudentList[0]] : activeStudentList;
        await downloadBankChallanPdf(toExport, undefined, {
          collegeName,
          collegeAddress,
          collegeContact,
          bankName: activeBank.name,
          accountTitle: activeBank.accountTitle,
          accountNo: activeBank.accountNo,
          branchName: activeBank.branch,
          dueDate,
          lateSurcharge,
          feeMonth,
        });
        toast.success(`3-Copy Bank Challan downloaded successfully!`);
      }
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
      const doc =
        voucherFormat === 'college_quad'
          ? generate4VouchersPerPageDoc(activeStudentList, {
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
            })
          : generate3CopyChallanDoc(activeStudentList, {
              collegeName,
              collegeAddress,
              collegeContact,
              dueDate,
              lateSurcharge,
              feeMonth,
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



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl h-[94vh] max-h-[94vh] flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-emerald-800/40">
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
                  4 Rows / A4 Page
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                Official College Student Fee Vouchers • 4 Full-Width Horizontal Rows per A4 Sheet
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

        {/* Format Selector Tab Line */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-5 py-2 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVoucherFormat('college_quad')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                voucherFormat === 'college_quad'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Layers size={14} />
              <span>College Fee Voucher (4 Horizontal Rows / A4)</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">Recommended</span>
            </button>

            <button
              type="button"
              onClick={() => setVoucherFormat('bank_3copy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                voucherFormat === 'bank_3copy'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Building2 size={14} />
              <span>3-Copy Bank Challan</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Users size={14} className="text-emerald-600" />
            <span>
              Target: <strong className="text-emerald-700 dark:text-emerald-400">{activeStudentList.length} Students</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span>
              Sheets: <strong>{Math.ceil(activeStudentList.length / 4)} A4 Pages</strong>
            </span>
          </div>
        </div>

        {/* Main Content Grid: Left Controls (with sticky bottom buttons) + Right Live Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* LEFT: Controls & Filters (Fixed Sticky Action Buttons!) */}
          <div className="lg:col-span-4 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col h-full min-h-0 overflow-hidden">
            {/* Scrollable Filters Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-3">
              {/* Filter Scope Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Filter size={13} className="text-emerald-600" />
                  <span>1. Select Download Scope</span>
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
                {/* Group Dropdown */}
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

                {/* Section & Campus Dropdowns */}
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

                {/* Single Student Multi-copy toggle */}
                {activeStudentList.length === 1 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block mb-1">
                      Single Student Layout Mode
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSingleStudentMode('quad_copies')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          singleStudentMode === 'quad_copies'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-600'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        4 Copies / 1 Page
                      </button>
                      <button
                        type="button"
                        onClick={() => setSingleStudentMode('single_slip')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          singleStudentMode === 'single_slip'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-600'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        1 Slip
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Fee Calculation & Installment Mode */}
              <div className="space-y-3 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>2. Installment & Billing Mode</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-black">4 Rows A4</span>
                </label>

                {/* Mode Toggle */}
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

                    {/* Preset Buttons */}
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
                      💡 <strong>Smart Fallback:</strong> Agar kisi student ke total baqaya (arrears) Rs. {fixedInstallmentAmount.toLocaleString()} se kam hain (e.g. Rs. 3,200), toh uska voucher automatically uske actual baqaya (Rs. 3,200) ka hi banega.
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Voucher Particulars (Dates & Surcharge) */}
              <div className="space-y-3 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  3. Voucher Particulars
                </label>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">Fee Head / Term</label>
                  <input
                    type="text"
                    value={feeMonth}
                    onChange={(e) => setFeeMonth(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 px-3 text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    placeholder="e.g. Monthly Installment"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">Issue Date</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 px-2 text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">Due Date</label>
                    <input
                      type="text"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 px-2 text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      placeholder="e.g. 10-Nov-2026"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Late Surcharge after Due Date (PKR)
                  </label>
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

            {/* STICKY BOTTOM ACTION BAR - Always 100% visible on small screens! */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 shrink-0 shadow-lg space-y-2 z-20">
              <button
                type="button"
                onClick={() => handleDownloadPdf(false)}
                disabled={isExporting || activeStudentList.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <Download size={17} />
                <span>
                  {isExporting
                    ? 'Generating PDF...'
                    : `Download ${activeStudentList.length} Vouchers (${Math.ceil(activeStudentList.length / 4)} A4 Pages)`}
                </span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={isExporting || activeStudentList.length === 0}
                className="w-full py-2 px-4 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-100 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer size={15} />
                <span>Print Directly (A4)</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Visual Interactive A4 Portrait (4 Full-Width Horizontal Rows) Preview */}
          <div className="lg:col-span-8 p-4 bg-slate-100 dark:bg-slate-950 overflow-y-auto flex flex-col items-center min-h-0">
            {/* Preview Page Controls */}
            <div className="w-full max-w-2xl flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText size={15} className="text-emerald-700" />
                <span>A4 Portrait Preview (4 Full-Width Horizontal Rows)</span>
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

            {/* A4 Sheet Mockup Container (4 Full-Width Rows Stacked Vertically) */}
            <div className="w-full max-w-2xl bg-white shadow-2xl rounded-2xl border-2 border-slate-400 p-3 relative overflow-hidden select-none space-y-2.5">
              {[0, 1, 2, 3].map((rowIdx) => {
                const student =
                  activeStudentList.length === 1 && singleStudentMode === 'quad_copies'
                    ? activeStudentList[0]
                    : currentQuadStudents[rowIdx];

                const copyBadges = ['College Copy', 'Accounts Copy', 'Student Copy', 'Admin Record'];
                const copyLabel =
                  activeStudentList.length === 1 && singleStudentMode === 'quad_copies'
                    ? copyBadges[rowIdx]
                    : `Slip ${safePage * 4 + rowIdx + 1}`;

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
                const sec = student.section || 'A';
                const shift = student.gender === 'Female' ? 'Girls Campus' : 'Boys Campus';
                const session = student.session || '2026-28';

                const sTotalPkg = Number(student.totalPackage || student.total_package || 0);
                const sPaid = Number(student.feeReceived || student.fee_received || 0);
                const sRemaining = Math.max(0, sTotalPkg - sPaid);

                let currentPayable = 0;
                let payableTag = '';
                if (installmentMode === 'fixed_installment' && fixedInstallmentAmount > 0) {
                  if (sRemaining <= fixedInstallmentAmount) {
                    currentPayable = sRemaining;
                    payableTag = 'Full Remaining Arrears';
                  } else {
                    currentPayable = fixedInstallmentAmount;
                    payableTag = `Installment (Bal: Rs. ${(sRemaining - fixedInstallmentAmount).toLocaleString()})`;
                  }
                } else {
                  currentPayable = sRemaining;
                  payableTag = 'Full Outstanding Due';
                }

                const totalAfter = currentPayable + (currentPayable > 0 ? lateSurcharge : 0);

                return (
                  <React.Fragment key={rowIdx}>
                    {rowIdx > 0 && (
                      <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 border-b border-dashed border-slate-400 py-0.5">
                        <span className="bg-white px-1">✂ CUT</span>
                        <span className="tracking-widest uppercase">-- ✂ Cut Along Dashed Line ✂ --</span>
                        <span className="bg-white px-1">CUT ✂</span>
                      </div>
                    )}

                    {/* Full-Width Horizontal Voucher Row Card */}
                    <div className="border-2 border-emerald-900 rounded-xl overflow-hidden bg-white shadow-xs flex flex-col text-[10px]">
                      {/* Row Header Banner */}
                      <div className="bg-[#064e3b] text-white px-3 py-1.5 border-b-2 border-[#d97706] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-xs tracking-tight text-white">
                            SUPERIOR COLLEGE JAHANIAN
                          </h4>
                          <span className="text-[8px] bg-amber-400/20 text-[#fef08a] font-bold px-1.5 py-0.2 rounded">
                            {copyLabel.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[8.5px] font-mono">
                          <span className="font-bold text-white">Vch: SCJ-{rollNo}</span>
                          <span className="font-semibold text-emerald-100">Issue: {issueDate}</span>
                          <span className="bg-rose-900 text-rose-100 font-black px-1.5 py-0.2 rounded">
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
                              <span className="text-[8px] font-black text-emerald-900 uppercase">Student</span>
                              <span className="bg-[#064e3b] text-white font-black px-1.5 py-0.2 rounded text-[8px]">
                                Roll: {rollNo}
                              </span>
                            </div>
                            <div className="font-black text-black truncate text-[11px] leading-snug">{sName}</div>
                            <div className="text-[8.5px] text-slate-800 font-bold truncate">S/D/O: {fName}</div>
                            <div className="text-[8.5px] text-slate-900 font-black mt-0.5 truncate">{prog}</div>
                            <div className="text-[8px] text-slate-700 font-bold">Sec {sec} • {shift}</div>
                            <div className="text-[8px] text-emerald-800 font-black">{session}</div>
                          </div>

                          <div className="pt-1.5 border-t border-slate-300 text-[7.5px] text-slate-700 font-bold flex items-center justify-between">
                            <span>Depositor Sign: _________</span>
                          </div>
                        </div>

                        {/* Panel 2: Fee Particulars & Highlight Box (5 Cols) */}
                        <div className="col-span-5 flex flex-col justify-between p-1 bg-white">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8.5px] text-slate-800 font-bold">
                              <span>Total Package:</span>
                              <span className="font-black text-black">Rs. {sTotalPkg.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[8.5px] text-slate-800 font-bold">
                              <span>Total Paid:</span>
                              <span className="font-black text-emerald-700">Rs. {sPaid.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[9px] bg-rose-50 border border-rose-300 px-1.5 py-0.5 rounded text-rose-900 font-black">
                              <span>TOTAL REMAINING:</span>
                              <span>Rs. {sRemaining.toLocaleString()}</span>
                            </div>

                            {/* Highlight Payable Box */}
                            <div className="bg-emerald-50 border-2 border-emerald-600 rounded-lg p-1.5 text-emerald-950 shadow-2xs">
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] font-black text-emerald-900 uppercase">
                                  Payable This Month:
                                </span>
                                <span className="font-black text-sm text-emerald-800 leading-tight">
                                  Rs. {currentPayable.toLocaleString()}/-
                                </span>
                              </div>
                              <div className="text-[7.5px] text-emerald-800 font-bold truncate mt-0.5">
                                {payableTag}
                              </div>
                            </div>
                          </div>

                          <div className="pt-0.5 text-[7.5px] text-rose-800 font-black flex items-center justify-between">
                            <span>After Due Date (+Rs. {lateSurcharge}):</span>
                            <span className="text-rose-900 font-black">Rs. {totalAfter.toLocaleString()}/-</span>
                          </div>
                        </div>

                        {/* Panel 3: Cash Desk Verification (3 Cols) */}
                        <div className="col-span-3 border-2 border-slate-300 rounded-lg p-1.5 flex flex-col justify-between text-center bg-slate-50">
                          <div>
                            <div className="text-[8px] font-black text-emerald-900 uppercase">
                              Accounts Verification
                            </div>
                            <div className="text-[7.5px] text-slate-800 font-bold mt-0.5">
                              {shift}
                            </div>
                          </div>

                          <div className="border border-dashed border-slate-400 bg-white rounded p-1.5">
                            <div className="text-[7.5px] font-black text-[#064e3b]">ACCOUNTS CASH DESK</div>
                            <div className="text-[7px] text-black font-bold">Superior College Jahanian</div>
                            <div className="text-[6.5px] text-slate-500 font-medium mt-1">Verified & Stamped</div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Footer Line */}
                      <div className="bg-slate-100 px-3 py-0.5 text-[7.5px] font-bold text-slate-800 border-t border-slate-200 flex justify-between">
                        <span>• Fee is payable strictly in Cash at College Accounts Desk on or before Due Date.</span>
                        <span className="text-emerald-800 font-black">{collegeAddress}</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-600 font-bold mt-2.5 text-center">
              💡 <strong>4 Full-Width Horizontal Rows:</strong> 1 standard A4 sheet gives 4 wide, easy-to-read vouchers.
              Cut along the 3 horizontal dashed lines for rapid student distribution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
