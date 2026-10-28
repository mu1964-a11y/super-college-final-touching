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

  // Form Fields
  const [selectedBankId, setSelectedBankId] = useState<string>('cash');
  const [dueDate, setDueDate] = useState<string>(() => getDefaultDueDate());
  const [issueDate, setIssueDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [lateSurcharge, setLateSurcharge] = useState<number>(500);
  const [feeMonth, setFeeMonth] = useState<string>('Term Installment / Dues');

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
        });

        toast.success(
          toExport.length === 1
            ? `Fee Voucher downloaded for ${toExport[0].fullName || 'Student'}!`
            : `Downloaded 4-per-page Fee Vouchers for ${toExport.length} students (${Math.ceil(toExport.length / 4)} A4 Pages)!`
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-emerald-800/40">
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
                  4 Vouchers / A4 Page
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                Official College Student Fee Vouchers • Individual, Group & Section Batch Download
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
        <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-2.5 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVoucherFormat('college_quad')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                voucherFormat === 'college_quad'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Layers size={14} />
              <span>College Fee Voucher (4 Vouchers / A4 Page)</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">Standard</span>
            </button>

            <button
              type="button"
              onClick={() => setVoucherFormat('bank_3copy')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                voucherFormat === 'bank_3copy'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Building2 size={14} />
              <span>3-Copy Bank Challan (Landscape)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
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

        {/* Main Content Grid: Left Controls (1/3) + Right Live Preview (2/3) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT: Controls & Filters */}
          <div className="lg:col-span-4 p-5 border-r border-slate-200 dark:border-slate-800 overflow-y-auto space-y-5 bg-slate-50/50 dark:bg-slate-900/50">
            {/* Filter Scope Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Filter size={13} className="text-emerald-600" />
                <span>1. Select Download Scope</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterScope('selected')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    filterScope === 'selected'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Current Selection ({Array.isArray(students) ? students.length : 1})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope('defaulters')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    filterScope === 'defaulters'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Pending Defaulters Only
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope('group')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    filterScope === 'group'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  By Class / Group
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope('section')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    filterScope === 'section'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  By Section
                </button>
              </div>
            </div>

            {/* Sub-Filters: Group, Section, Campus */}
            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              {/* Group Dropdown */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Class / Academic Group
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-emerald-600"
                >
                  <option value="all">All Academic Groups ({availableGroups.length})</option>
                  {availableGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Dropdown */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Section
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-emerald-600"
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Campus Shift
                  </label>
                  <select
                    value={selectedCampus}
                    onChange={(e) => setSelectedCampus(e.target.value as any)}
                    className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-emerald-600"
                  >
                    <option value="all">All Campuses</option>
                    <option value="Male">Boys Campus</option>
                    <option value="Female">Girls Campus</option>
                  </select>
                </div>
              </div>

              {/* Single Student Multi-copy toggle */}
              {activeStudentList.length === 1 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                    Single Student Layout Mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSingleStudentMode('quad_copies')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all ${
                        singleStudentMode === 'quad_copies'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      4 Copies / 1 Page
                    </button>
                    <button
                      type="button"
                      onClick={() => setSingleStudentMode('single_slip')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all ${
                        singleStudentMode === 'single_slip'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      1 Slip
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Voucher Particulars (Dates & Surcharge) */}
            <div className="space-y-3 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                2. Voucher Particulars
              </label>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fee Head / Term</label>
                <input
                  type="text"
                  value={feeMonth}
                  onChange={(e) => setFeeMonth(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-900"
                  placeholder="e.g. Term 1 Installment"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 px-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Due Date</label>
                  <input
                    type="text"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 px-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900"
                    placeholder="e.g. 10-Nov-2026"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Late Surcharge after Due Date (PKR)
                </label>
                <input
                  type="number"
                  value={lateSurcharge}
                  onChange={(e) => setLateSurcharge(Number(e.target.value) || 0)}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-900"
                  step="50"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => handleDownloadPdf(false)}
                disabled={isExporting || activeStudentList.length === 0}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <Download size={18} />
                <span>
                  {isExporting
                    ? 'Generating PDF...'
                    : `Download ${activeStudentList.length} Vouchers (${Math.ceil(activeStudentList.length / 4)} Pages)`}
                </span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={isExporting || activeStudentList.length === 0}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer size={15} />
                <span>Print Directly</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Visual Interactive A4 Quad-Slip Preview */}
          <div className="lg:col-span-8 p-5 bg-slate-100 dark:bg-slate-950 overflow-y-auto flex flex-col items-center">
            {/* Preview Page Controls */}
            <div className="w-full max-w-2xl flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText size={15} className="text-emerald-600" />
                <span>A4 Sheet Interactive Preview (2 Columns × 2 Rows)</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white dark:bg-slate-800 text-xs font-bold disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-400">
                  Page {safePage + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white dark:bg-slate-800 text-xs font-bold disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* A4 Sheet Mockup Container (Aspect Ratio 1 : 1.414) */}
            <div className="w-full max-w-2xl bg-white shadow-2xl rounded-2xl border-2 border-slate-300 p-4 relative overflow-hidden select-none">
              {/* Dashed Center Cut Lines */}
              <div className="absolute inset-y-0 left-1/2 w-0 border-r-2 border-dashed border-slate-300 z-10 pointer-events-none flex flex-col justify-between items-center py-2">
                <span className="text-[9px] font-bold text-slate-400 bg-white px-1">✂ CUT</span>
                <span className="text-[9px] font-bold text-slate-400 bg-white px-1">✂ CUT</span>
              </div>
              <div className="absolute inset-x-0 top-1/2 h-0 border-b-2 border-dashed border-slate-300 z-10 pointer-events-none flex justify-between items-center px-4">
                <span className="text-[9px] font-bold text-slate-400 bg-white px-1">✂ CUT</span>
                <span className="text-[9px] font-bold text-slate-400 bg-white px-1">✂ CUT</span>
              </div>

              {/* 4 Quadrants Grid */}
              <div className="grid grid-cols-2 gap-4 relative z-0">
                {[0, 1, 2, 3].map((quadIdx) => {
                  const student =
                    activeStudentList.length === 1 && singleStudentMode === 'quad_copies'
                      ? activeStudentList[0]
                      : currentQuadStudents[quadIdx];

                  const copyBadges = ['College Copy', 'Accounts Copy', 'Student Copy', 'Admin Record'];
                  const copyLabel =
                    activeStudentList.length === 1 && singleStudentMode === 'quad_copies'
                      ? copyBadges[quadIdx]
                      : `Slip ${safePage * 4 + quadIdx + 1}`;

                  if (!student) {
                    return (
                      <div
                        key={quadIdx}
                        className="h-72 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 text-center text-slate-400"
                      >
                        <Scissors size={20} className="mb-1 text-slate-300" />
                        <span className="text-[11px] font-semibold">Blank Voucher Slot</span>
                        <span className="text-[9px]">A4 sheet quadrant {quadIdx + 1}</span>
                      </div>
                    );
                  }

                  const sName = student.fullName || student.name || 'Verified Student';
                  const rollNo = student.collegeNo || student.studentId || student.id || 'SCJ-0000';
                  const prog = student.group || student.program || student.currentClass || 'Intermediate';
                  const sec = student.section || 'A';
                  const shift = student.gender === 'Female' ? 'Girls' : 'Boys';

                  const sTotalPkg = Number(student.totalPackage || student.total_package || 0);
                  const sPaid = Number(student.feeReceived || student.fee_received || 0);
                  const sRemaining = Math.max(0, sTotalPkg - sPaid);
                  const sMonthly = Number(student.monthlyFee || student.monthly_fee || Math.min(sRemaining, 12000));
                  const tuition = Math.min(sMonthly || 12000, sRemaining || 12000);
                  const arrears = Number(student.previousArrears || student.arrears || 0);
                  const totalPayable = tuition + arrears;
                  const totalAfter = totalPayable + lateSurcharge;

                  return (
                    <div
                      key={quadIdx}
                      className="border border-emerald-800/40 rounded-xl overflow-hidden bg-white shadow-xs flex flex-col text-[10px]"
                    >
                      {/* Slip Header */}
                      <div className="bg-[#085a4e] text-white p-2 text-center border-b-2 border-[#c9a84c]">
                        <h4 className="font-black text-[11px] tracking-tight leading-tight">
                          SUPERIOR COLLEGE JAHANIAN
                        </h4>
                        <div className="flex items-center justify-between text-[8px] text-emerald-100 font-semibold mt-0.5 px-1">
                          <span className="text-[#fef08a] font-bold">{copyLabel}</span>
                          <span>Canal Road, Jahanian</span>
                        </div>
                      </div>

                      {/* Slip Content */}
                      <div className="p-2 space-y-1.5 flex-1">
                        {/* Meta bar */}
                        <div className="flex justify-between items-center text-[8.5px] border-b pb-1 font-mono">
                          <span className="font-bold text-slate-700">Vch: SCJ-{rollNo}</span>
                          <span className="text-rose-600 font-black">Due: {dueDate}</span>
                        </div>

                        {/* Student Info */}
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/80 leading-tight">
                          <div className="flex justify-between items-center">
                            <strong className="text-slate-900 truncate max-w-[140px] text-[10px]">
                              {sName}
                            </strong>
                            <span className="bg-emerald-100 text-emerald-900 px-1 py-0.2 rounded font-black text-[8px]">
                              {rollNo}
                            </span>
                          </div>
                          <div className="flex justify-between text-[8.5px] text-slate-600 mt-0.5">
                            <span>{prog}</span>
                            <span>
                              Sec {sec} ({shift})
                            </span>
                          </div>
                        </div>

                        {/* Fee Particulars */}
                        <div className="space-y-0.5 pt-0.5">
                          <div className="flex justify-between text-[8.5px] text-slate-600">
                            <span>Tuition Fee / Dues:</span>
                            <strong className="text-slate-900">Rs. {tuition.toLocaleString()}</strong>
                          </div>
                          {arrears > 0 && (
                            <div className="flex justify-between text-[8.5px] text-amber-700">
                              <span>Previous Arrears:</span>
                              <strong>Rs. {arrears.toLocaleString()}</strong>
                            </div>
                          )}
                        </div>

                        {/* Highlight Total Box */}
                        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-1.5 flex justify-between items-center text-emerald-900">
                          <div>
                            <div className="text-[7.5px] font-black uppercase text-emerald-700">
                              Payable Within Due Date:
                            </div>
                            <div className="font-black text-xs text-emerald-800">
                              Rs. {totalPayable.toLocaleString()}/-
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[7px] text-rose-600">After Due (+{lateSurcharge}):</div>
                            <div className="font-black text-[10px] text-rose-700">
                              Rs. {totalAfter.toLocaleString()}/-
                            </div>
                          </div>
                        </div>

                        {/* Accounts Signature Box */}
                        <div className="pt-1 flex items-center justify-between text-[7px] text-slate-400">
                          <span>Depositor Sign</span>
                          <span className="border border-slate-300 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                            Accounts Stamp
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-3 text-center">
              💡 <strong>Paper Saving Tip:</strong> Standard A4 sheet prints 4 full vouchers. Use scissors or a paper
              cutter along the dashed lines for easy distribution to students.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
