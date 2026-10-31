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
  Search,
  DollarSign,
  Maximize2,
  List,
} from 'lucide-react';
import {
  ACADEMIC_CLASSES,
  download4VouchersPerPagePdf,
  generate4VouchersPerPageDoc,
  getDefaultDueDate,
  getStudentCampusShift,
  getStudentDisplayClass,
  matchesAcademicClass,
  numberToEnglishWords,
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

  // Layout Mode: 'quad_2_students' (2 Students/A4 Page = 4 Horizontal Rows) vs 'single_student_3_copies' (1 Student/A4 Page = 3 Detailed Copies)
  const [layoutMode, setLayoutMode] = useState<'quad_2_students' | 'single_student_3_copies'>('quad_2_students');

  // Page Range options for Export & Print
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'current' | 'custom'>('all');
  const [customRangeText, setCustomRangeText] = useState<string>('1-2');

  // View Mode: 'all_scroll' (Continuous Scroll of all students) vs 'page_fit' (A4 Sheet scaled to fit screen)
  const [viewMode, setViewMode] = useState<'all_scroll' | 'page_fit'>('all_scroll');
  const [zoomLevel, setZoomLevel] = useState<number>(0.8);
  const [inModalSearch, setInModalSearch] = useState<string>('');

  // Scope & Filtering State
  const [filterScope, setFilterScope] = useState<'selected' | 'group' | 'section' | 'defaulters' | 'all'>('selected');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedCampus, setSelectedCampus] = useState<'all' | 'Male' | 'Female'>('all');

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

  // Preview Pagination (Sheet Page)
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

    return raw.map((s: any) => {
      const campusShift = getStudentCampusShift(s);
      const normGender = campusShift === 'Girls Campus' ? 'Female' : 'Male';
      return {
        ...s,
        fullName: s.fullName || s.full_name || s.name || 'Verified Student',
        fatherName: s.fatherName || s.father_name || 'N/A',
        collegeNo: s.collegeNo || s.studentId || s.rollNumber || s.id || 'SCJ-0000',
        group: s.group || s.program || s.currentClass || s.category || 'Intermediate',
        section: s.section || 'A',
        gender: s.gender || normGender,
        session: s.session || '2026-28',
        totalPackage: Number(s.totalPackage ?? s.total_package ?? 0),
        feeReceived: Number(s.feeReceived ?? s.fee_received ?? 0),
        contactNumber: s.contactNumber || s.fatherContact || s.phone || '',
      };
    });
  }, [allStudents, students]);

  // Derived groups and sections
  const availableGroups = useMemo(() => {
    const s = new Set<string>();
    masterStudentPool.forEach((st) => {
      if (st.group) s.add(String(st.group).trim());
    });
    return Array.from(s).sort();
  }, [masterStudentPool]);

  const availableSections = useMemo(() => {
    const s = new Set<string>();
    const pool = selectedGroup === 'all'
      ? masterStudentPool
      : masterStudentPool.filter((st) => matchesAcademicClass(st, selectedGroup));

    pool.forEach((st) => {
      if (st.section) s.add(String(st.section).trim().toUpperCase());
    });
    return Array.from(s).sort();
  }, [masterStudentPool, selectedGroup]);

  // Compute Active Filtered Students List
  const activeStudentList = useMemo(() => {
    let list: any[] = [];

    if (filterScope === 'selected') {
      const selRaw = Array.isArray(students) ? students : students ? [students] : [];
      list = selRaw.map((s: any) => {
        const campusShift = getStudentCampusShift(s);
        const normGender = campusShift === 'Girls Campus' ? 'Female' : 'Male';
        return {
          ...s,
          fullName: s.fullName || s.full_name || s.name || 'Verified Student',
          fatherName: s.fatherName || s.father_name || 'N/A',
          collegeNo: s.collegeNo || s.studentId || s.rollNumber || s.id || 'SCJ-0000',
          group: s.group || s.program || s.currentClass || s.category || 'Intermediate',
          section: s.section || 'A',
          gender: s.gender || normGender,
          session: s.session || '2026-28',
          totalPackage: Number(s.totalPackage ?? s.total_package ?? 0),
          feeReceived: Number(s.feeReceived ?? s.fee_received ?? 0),
          contactNumber: s.contactNumber || s.fatherContact || s.phone || '',
        };
      });
    } else {
      list = [...masterStudentPool];
    }

    if (selectedCampus !== 'all') {
      list = list.filter((st) => {
        const shift = getStudentCampusShift(st);
        return selectedCampus === 'Female' ? shift === 'Girls Campus' : shift === 'Boys Campus';
      });
    }

    if (filterScope === 'group' || selectedGroup !== 'all') {
      if (selectedGroup !== 'all') {
        list = list.filter((st) => matchesAcademicClass(st, selectedGroup));
      }
    }

    if (filterScope === 'section' || selectedSection !== 'all') {
      if (selectedSection !== 'all') {
        list = list.filter((st) => String(st.section || '').toUpperCase() === selectedSection.toUpperCase());
      }
    }

    if (filterScope === 'defaulters') {
      list = list.filter((st) => {
        const pkg = Number(st.totalPackage || 0);
        const rec = Number(st.feeReceived || 0);
        return pkg - rec > 0;
      });
    }

    return list;
  }, [filterScope, students, masterStudentPool, selectedCampus, selectedGroup, selectedSection]);

  // Filtered by in-modal quick search bar
  const displayedStudents = useMemo(() => {
    if (!inModalSearch.trim()) return activeStudentList;
    const q = inModalSearch.trim().toLowerCase();
    return activeStudentList.filter((s) => {
      const name = String(s.fullName || '').toLowerCase();
      const roll = String(s.collegeNo || '').toLowerCase();
      const father = String(s.fatherName || '').toLowerCase();
      return name.includes(q) || roll.includes(q) || father.includes(q);
    });
  }, [activeStudentList, inModalSearch]);

  if (!isOpen || !mounted) return null;

  // Calculate total sheets based on layout mode
  const totalSheets = layoutMode === 'single_student_3_copies'
    ? Math.max(1, displayedStudents.length)
    : Math.max(1, Math.ceil(displayedStudents.length / 2));

  const safePage = Math.min(previewPage, totalSheets - 1);
  const pageStudentA = displayedStudents[safePage * 2];
  const pageStudentB = displayedStudents[safePage * 2 + 1];
  const pageStudentSingle = displayedStudents[safePage];

  const collegeName = 'SUPERIOR COLLEGE JAHANIAN';
  const collegeAddress = settings?.address || 'Canal Road Campus, Jahanian';
  const collegeContact = settings?.contactNumber || 'Accounts Desk: 0331-2211147';

  // Helper to build structured, audit-ready voucher reference
  const getVoucherId = (student: any) => {
    const yStr = (issueDate || '').split('-')[0]?.slice(-2) || '26';
    const mStr = (issueDate || '').split('-')[1] || '11';
    const roll = String(student?.collegeNo || student?.studentId || student?.rollNumber || student?.id || '101').replace(/[^a-zA-Z0-9]/g, '');
    return `VCH-${yStr}${mStr}-${roll}`;
  };

  // Helper to resolve target page indices for print & download
  const resolveTargetPages = (totalCount: number): number[] | undefined => {
    if (pageRangeMode === 'all') return undefined; // all sheets
    if (pageRangeMode === 'current') return [safePage];
    if (pageRangeMode === 'custom') {
      const set = new Set<number>();
      const parts = customRangeText.split(',').map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (p.includes('-')) {
          const [start, end] = p.split('-').map(n => parseInt(n.trim(), 10));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
              if (i >= 1 && i <= totalCount) set.add(i - 1);
            }
          }
        } else {
          const num = parseInt(p, 10);
          if (!isNaN(num) && num >= 1 && num <= totalCount) set.add(num - 1);
        }
      }
      return set.size > 0 ? Array.from(set).sort((a, b) => a - b) : undefined;
    }
    return undefined;
  };

  // Download Action
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      if (displayedStudents.length === 0) {
        toast.error('No students matching current filter.');
        return;
      }

      const targetPages = resolveTargetPages(totalSheets);

      await download4VouchersPerPagePdf(displayedStudents, undefined, {
        collegeName,
        collegeAddress,
        collegeContact,
        issueDate,
        dueDate,
        lateSurcharge,
        feeMonth,
        layoutMode,
        pageIndices: targetPages,
        installmentMode,
        fixedInstallmentAmount,
      });

      const pageCountLabel = targetPages ? `${targetPages.length} Selected Sheets` : `${totalSheets} Total Sheets`;
      toast.success(`Downloaded Fee Vouchers PDF (${pageCountLabel})!`);
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
      const targetPages = resolveTargetPages(totalSheets);

      const doc = generate4VouchersPerPageDoc(displayedStudents, {
        collegeName,
        collegeAddress,
        collegeContact,
        issueDate,
        dueDate,
        lateSurcharge,
        feeMonth,
        layoutMode,
        pageIndices: targetPages,
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
          doc.save(`SCJ_Fee_Vouchers.pdf`);
        }
      };
      toast.success('Print document prepared!');
    } catch (err: any) {
      toast.error('Print preview failed: ' + err?.message);
    }
  };

  // Reusable Toner & Laser-Friendly Voucher Row Renderer
  const renderVoucherRow = (
    student: any,
    copyLabel: string,
    rowIdx: number,
    showCutLine: boolean = true,
    isTall: boolean = false
  ) => {
    if (!student) {
      return (
        <div
          key={`blank-${rowIdx}`}
          className="h-20 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center p-2 text-center text-slate-400 gap-2"
        >
          <Scissors size={14} className="text-slate-300" />
          <span className="text-[11px] font-bold">Blank Voucher Slot (Row {rowIdx + 1})</span>
        </div>
      );
    }

    const sName = student.fullName || student.name || 'Verified Student';
    const fName = student.fatherName || student.father_name || 'N/A';
    const rollNo = student.collegeNo || student.studentId || student.id || 'SCJ-0000';
    const prog = getStudentDisplayClass(student);
    const rawSec = student.section || 'A';
    const sec = String(rawSec).replace(/^(sec|section)\s*[:-]?\s*/i, '').trim() || 'A';
    const shift = getStudentCampusShift(student);
    const session = student.session || '2026-28';
    const contact = student.contactNumber || '';
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
    const englishWords = numberToEnglishWords(currentPayable);

    return (
      <React.Fragment key={`${student.id || rollNo}-${copyLabel}-${rowIdx}`}>
        {showCutLine && (
          <div className="flex items-center justify-between text-[7px] font-mono text-slate-400 border-b border-dashed border-slate-400 py-0.5 my-0.5">
            <span className="bg-white dark:bg-slate-900 px-1">✂ CUT</span>
            <span className="tracking-widest uppercase font-bold text-slate-500">
              -- ✂ Cut Along Dashed Line For Student Handover ✂ --
            </span>
            <span className="bg-white dark:bg-slate-900 px-1">CUT ✂</span>
          </div>
        )}

        {/* Full-Width Horizontal Voucher Row Card (Laser B&W Ink-Friendly!) */}
        <div className="border border-slate-800 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-2xs flex flex-col text-[9.5px]">
          {/* Row Header Banner: Toner-Friendly White Background with Sharp Black Borders */}
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2.5 py-1 border-b-2 border-slate-900 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-black text-[11px] sm:text-xs tracking-tight text-black dark:text-white">
                SUPERIOR COLLEGE JAHANIAN
              </h4>
              <span className="text-[7.5px] border border-slate-500 text-slate-800 dark:text-slate-200 font-bold px-1.5 py-0.2 rounded">
                {feeMonth.toUpperCase()}
              </span>
              <span className="text-[7.5px] border border-slate-700 text-slate-900 dark:text-slate-200 font-black px-2 py-0.2 rounded bg-white dark:bg-slate-900">
                {copyLabel.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[7.5px] font-mono">
              <span className="font-bold text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 px-1 py-0.2 rounded">
                Ref: {vchId}
              </span>
              <span className="text-slate-500 hidden sm:inline">Issue: {issueDate}</span>
              <span className="text-rose-700 dark:text-rose-400 font-black border border-rose-400 px-1.5 py-0.2 rounded">
                Due: {dueDate}
              </span>
            </div>
          </div>

          {/* Row Body: 3 Wide Horizontal Panels */}
          <div className="p-1.5 grid grid-cols-12 gap-1.5 bg-white dark:bg-slate-900">
            {/* Panel 1: Student Particulars (4 Cols) */}
            <div className="col-span-4 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-md border border-slate-300 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-[7px] font-black text-slate-700 dark:text-slate-300 uppercase">Student Particulars</span>
                  <span className="border border-slate-900 dark:border-slate-400 text-black dark:text-white font-black px-1.5 py-0.2 rounded text-[7px]">
                    Roll: {rollNo}
                  </span>
                </div>
                <div className="font-black text-black dark:text-white truncate text-[10px] leading-tight">{sName}</div>
                <div className="text-[7.5px] text-slate-800 dark:text-slate-300 font-bold truncate">S/D/O: {fName}</div>
                <div className="text-[7.5px] text-slate-900 dark:text-slate-200 font-black truncate">{prog}</div>
                <div className="text-[7px] text-slate-800 dark:text-slate-400 font-bold">Sec: {sec} • {shift}</div>
                <div className="text-[7px] text-slate-900 dark:text-slate-300 font-black">{session}</div>
                {isTall && contact && (
                  <div className="text-[7px] text-slate-600 dark:text-slate-400 font-medium">Contact: {contact}</div>
                )}
              </div>

              <div className="pt-0.5 border-t border-slate-300 dark:border-slate-700 text-[6.5px] text-slate-700 dark:text-slate-400 font-bold flex items-center justify-between">
                <span>Depositor Sign: _________</span>
              </div>
            </div>

            {/* Panel 2: Fee Particulars & Urdu Nastaleeq Figure (5 Cols) - Course package is hidden! */}
            <div className="col-span-5 flex flex-col justify-between p-0.5 bg-white dark:bg-slate-900">
              <div className="space-y-0.5">
                {/* Total Remaining Balance (Course package is hidden!) */}
                <div className="flex justify-between items-center text-[7.5px] bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 px-1.5 py-0.5 rounded text-rose-900 dark:text-rose-300 font-black">
                  <span>TOTAL REMAINING BALANCE:</span>
                  <span className="font-mono text-[8.5px] font-black">Rs. {sRemaining.toLocaleString()}</span>
                </div>

                {/* Highlight Payable Box */}
                <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-600 rounded-md p-1 text-slate-900 dark:text-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[7px] font-black text-slate-800 dark:text-slate-300 uppercase">
                      Payable ({feeMonth}):
                    </span>
                    <span className="font-black text-xs sm:text-[13px] text-black dark:text-white leading-tight">
                      Rs. {currentPayable.toLocaleString()}/-
                    </span>
                  </div>
                  <div className="text-[6.5px] text-slate-700 dark:text-slate-300 font-bold truncate">
                    {payableTag}
                  </div>
                  <div className="text-[7px] text-slate-800 dark:text-slate-200 font-bold truncate mt-0.5 pt-0.5 border-t border-slate-200 dark:border-slate-700">
                    Amount in Words: {englishWords}
                  </div>
                </div>
              </div>

              <div className="pt-0.5 text-[6.5px] text-rose-800 dark:text-rose-400 font-black flex items-center justify-between">
                <span>After Due Date (+Rs. {lateSurcharge}/day):</span>
                <span className="text-rose-900 dark:text-rose-300 font-black">Rs. {totalAfter.toLocaleString()}/-</span>
              </div>
            </div>

            {/* Panel 3: Cash Desk Verification & Audit Stamp (3 Cols) */}
            <div className="col-span-3 border border-slate-300 dark:border-slate-700 rounded-md p-1 flex flex-col justify-between text-center bg-slate-50 dark:bg-slate-800/60">
              <div>
                <div className="text-[7px] font-black text-slate-800 dark:text-slate-300 uppercase">
                  Audit Verification
                </div>
                <div className="text-[6.5px] font-mono text-slate-800 dark:text-slate-200 font-bold bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 py-0.2">
                  {vchId}
                </div>
              </div>

              <div className="border border-dashed border-slate-800 dark:border-slate-600 bg-white dark:bg-slate-900 rounded p-0.5">
                <div className="text-[6.5px] font-black text-slate-900 dark:text-white">ACCOUNTS CASH DESK</div>
                <div className="text-[6px] text-slate-800 dark:text-slate-300 font-bold">Superior College Jahanian</div>
                <div className="text-[5.5px] text-slate-600 dark:text-slate-400 font-bold">
                  STATUS: ISSUED (COUNTER)
                </div>
              </div>

              {onQuickCollect && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickCollect(student, vchId, currentPayable, feeMonth);
                  }}
                  className="w-full py-0.5 rounded border border-slate-400 bg-white hover:bg-slate-100 text-slate-800 dark:text-slate-200 text-[6.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs mt-0.5"
                  title="Receive cash and mark paid at counter"
                >
                  <DollarSign size={8} />
                  <span>Receive & Stamp</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Footer Line */}
          <div className="bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[6.5px] font-bold text-slate-800 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 flex justify-between">
            <span>• Fee payable on or before {dueDate}. Late fine Rs. {lateSurcharge}/day. Stamped slip required for semester clearance.</span>
            <span className="text-slate-900 dark:text-slate-200 font-black">{collegeAddress}</span>
          </div>
        </div>
      </React.Fragment>
    );
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl h-[95vh] max-h-[95vh] flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white px-5 py-3 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-lg text-white tracking-tight">
                  SUPERIOR COLLEGE JAHANIAN
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  {layoutMode === 'single_student_3_copies' ? '1 Student / Sheet (3 Detailed Copies)' : 'Quad Mode (2 Students / Sheet)'}
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  {feeMonth}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Official Student Fee Vouchers • {layoutMode === 'single_student_3_copies' ? 'College, Student & Accounts Copies' : '4 Full-Width Horizontal Rows per Sheet (50% Paper Saved)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Left Controls vs Right Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* LEFT: Controls & Filters */}
          <div className="lg:col-span-4 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col h-full min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-3">
              {/* 1. Layout Mode Switcher (1 Student vs 2 Students / Sheet) */}
              <div className="space-y-2 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-xs">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers size={13} className="text-emerald-600" />
                    <span>Voucher Layout Format</span>
                  </span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 px-1.5 py-0.5 rounded font-black">
                    A4 Sheet
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('quad_2_students')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      layoutMode === 'quad_2_students'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-2 ring-emerald-700'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-black text-[11px]">👥 2 Students / Page</div>
                    <div className="text-[9.5px] font-medium text-slate-500 mt-0.5">4 Rows (2 Copies each) • Saves 50% Paper</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLayoutMode('single_student_3_copies')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      layoutMode === 'single_student_3_copies'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-2 ring-emerald-700'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-black text-[11px]">👤 1 Student / Page</div>
                    <div className="text-[9.5px] font-medium text-slate-500 mt-0.5">3 Detailed Copies (College, Student, Accounts)</div>
                  </button>
                </div>
              </div>

              {/* 2. Billing Month Selector */}
              <div className="space-y-2 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-emerald-600" />
                    <span>Billing Month / Term</span>
                  </span>
                  <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-black">
                    Printed on Banner
                  </span>
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {MONTH_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFeeMonth(m)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        feeMonth === m
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
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

              {/* 3. Download Scope Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Filter size={13} className="text-emerald-600" />
                  <span>Select Target Scope</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterScope('selected')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      filterScope === 'selected'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-700'
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
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-700'
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
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-700'
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
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-700'
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
                    onChange={(e) => {
                      setSelectedGroup(e.target.value);
                      setSelectedSection('all');
                    }}
                    className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-emerald-600"
                  >
                    {ACADEMIC_CLASSES.map((cls) => {
                      const count = cls.id === 'all'
                        ? masterStudentPool.length
                        : masterStudentPool.filter((st) => matchesAcademicClass(st, cls.id)).length;
                      return (
                        <option key={cls.id} value={cls.id}>
                          {cls.label} {count > 0 ? `(${count})` : ''}
                        </option>
                      );
                    })}
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
              </div>

              {/* 4. Installment & Billing Mode */}
              <div className="space-y-3 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Billing Mode</span>
                  <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-black">
                    {layoutMode === 'single_student_3_copies' ? '3 Copies / Page' : '4 Rows / Page'}
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInstallmentMode('fixed_installment')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      installmentMode === 'fixed_installment'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-700'
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
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-700'
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
                      <span className="text-[10px] font-mono font-black text-slate-900 dark:text-white">
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

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {[3000, 5000, 7000, 10000, 12000, 15000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setFixedInstallmentAmount(amt)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            fixedInstallmentAmount === amt
                              ? 'bg-slate-900 text-white border-slate-900 font-black'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          Rs. {amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Dates & Late Fine */}
              <div className="space-y-3 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Dates & Late Fine
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

              {/* 6. Page Range Selector for Print / PDF */}
              <div className="space-y-2 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-xs">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>🖨️ Pages to Print / Download</span>
                  <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-black">
                    {totalSheets} Sheets Total
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPageRangeMode('all')}
                    className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                      pageRangeMode === 'all'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-black ring-1 ring-emerald-700'
                        : 'border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    All ({totalSheets})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageRangeMode('current')}
                    className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                      pageRangeMode === 'current'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-black ring-1 ring-emerald-700'
                        : 'border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Page #{safePage + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageRangeMode('custom')}
                    className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                      pageRangeMode === 'custom'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-black ring-1 ring-emerald-700'
                        : 'border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {pageRangeMode === 'custom' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={customRangeText}
                      onChange={(e) => setCustomRangeText(e.target.value)}
                      placeholder="e.g. 1-2, 5"
                      className="w-full h-8 rounded-lg border border-slate-300 dark:border-slate-700 px-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-[9px] text-slate-500 mt-0.5 block">
                      Enter sheet numbers (e.g. 1-2, or 1, 3, 5)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Action Buttons */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 shrink-0 shadow-lg space-y-2 z-20">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExporting || displayedStudents.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <Download size={17} />
                <span>
                  {isExporting
                    ? 'Generating Laser PDF...'
                    : `Download PDF (${pageRangeMode === 'current' ? `Page #${safePage + 1} Only` : pageRangeMode === 'custom' ? `Custom (${customRangeText})` : `All ${totalSheets} Sheets`})`}
                </span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={isExporting || displayedStudents.length === 0}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-100 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer size={15} />
                <span>Print Laser Vouchers (B&W Toner Friendly)</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Live Interactive Preview */}
          <div className="lg:col-span-8 p-3 sm:p-4 bg-slate-100 dark:bg-slate-950 flex flex-col min-h-0 overflow-hidden">
            {/* Top Toolbar inside Preview */}
            <div className="w-full max-w-3xl flex flex-wrap items-center justify-between gap-2 mb-2 px-1 shrink-0">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={inModalSearch}
                  onChange={(e) => setInModalSearch(e.target.value)}
                  placeholder="Filter preview by name / roll..."
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>

              {/* View Mode Toggle: All Scroll vs Page Fit */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl p-0.5 border border-slate-300 dark:border-slate-700 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setViewMode('all_scroll')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'all_scroll'
                        ? 'bg-slate-900 text-white font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <List size={13} />
                    <span>Scroll All ({displayedStudents.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('page_fit')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'page_fit'
                        ? 'bg-slate-900 text-white font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Maximize2 size={13} />
                    <span>Fit Page</span>
                  </button>
                </div>
              </div>

              {/* Zoom & Page Controls when in page_fit mode */}
              {viewMode === 'page_fit' ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-300 dark:border-slate-700 text-xs font-bold">
                    {[0.75, 0.85, 1.0].map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setZoomLevel(z)}
                        className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer ${
                          zoomLevel === z ? 'bg-slate-900 text-white font-black' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {Math.round(z * 100)}%
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                      disabled={safePage === 0}
                      className="px-2 py-1 rounded-lg border border-slate-300 bg-white dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                      Page {safePage + 1} of {totalSheets}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewPage((p) => Math.min(totalSheets - 1, p + 1))}
                      disabled={safePage >= totalSheets - 1}
                      className="px-2 py-1 rounded-lg border border-slate-300 bg-white dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  📜 Showing <strong>{displayedStudents.length} Students</strong> ({totalSheets} A4 Sheets)
                </div>
              )}
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col items-center">
              {displayedStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 my-auto">
                  <p className="font-bold text-sm">No students match current filter.</p>
                  <p className="text-xs mt-1">Try changing class, section, or clear search box.</p>
                </div>
              ) : viewMode === 'all_scroll' ? (
                /* Continuous Scroll Mode */
                <div className="w-full max-w-3xl space-y-5 pb-8">
                  {Array.from({ length: totalSheets }).map((_, sheetIdx) => {
                    if (layoutMode === 'single_student_3_copies') {
                      const st = displayedStudents[sheetIdx];
                      return (
                        <div
                          key={`sheet-single-${sheetIdx}`}
                          className="w-full bg-white dark:bg-slate-900 shadow-xl rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-2.5 relative select-none space-y-1.5"
                        >
                          <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-black text-slate-700 dark:text-slate-300">
                            <span className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                              <FileText size={14} />
                              <span>A4 Sheet #{sheetIdx + 1} of {totalSheets} (1 Student • 3 Detailed Copies)</span>
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              Student: <strong>{st?.fullName}</strong> ({st?.collegeNo})
                            </span>
                          </div>

                          {renderVoucherRow(st, 'College Copy', 0, false, true)}
                          {renderVoucherRow(st, 'Student Copy', 1, true, true)}
                          {renderVoucherRow(st, 'Accounts / Bank Copy', 2, true, true)}
                        </div>
                      );
                    }

                    // Quad 2-students mode
                    const stA = displayedStudents[sheetIdx * 2];
                    const stB = displayedStudents[sheetIdx * 2 + 1];

                    return (
                      <div
                        key={`sheet-quad-${sheetIdx}`}
                        className="w-full bg-white dark:bg-slate-900 shadow-xl rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-2.5 relative select-none space-y-1.5"
                      >
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-black text-slate-700 dark:text-slate-300">
                          <span className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                            <FileText size={14} />
                            <span>A4 Sheet #{sheetIdx + 1} of {totalSheets} (4 Vouchers / 2 Students)</span>
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Students: <strong>{stA?.fullName}</strong> {stB ? <>• <strong>{stB?.fullName}</strong></> : null}
                          </span>
                        </div>

                        {renderVoucherRow(stA, 'College Copy', 0, false, false)}
                        {renderVoucherRow(stA, 'Student Copy', 1, true, false)}

                        {stB ? (
                          <>
                            {renderVoucherRow(stB, 'College Copy', 2, true, false)}
                            {renderVoucherRow(stB, 'Student Copy', 3, true, false)}
                          </>
                        ) : (
                          <>
                            {renderVoucherRow(null, '', 2, true, false)}
                            {renderVoucherRow(null, '', 3, true, false)}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Page Fit Mode */
                <div
                  className="w-full max-w-3xl transition-transform duration-150 origin-top"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'top center',
                    marginBottom: `${(1 - zoomLevel) * -200}px`,
                  }}
                >
                  <div className="w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border-2 border-slate-400 dark:border-slate-700 p-2.5 relative select-none space-y-1.5">
                    {layoutMode === 'single_student_3_copies' ? (
                      <>
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-black text-slate-700 dark:text-slate-300">
                          <span className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                            <FileText size={14} />
                            <span>A4 Sheet #{safePage + 1} of {totalSheets} (1 Student • 3 Copies)</span>
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Student: <strong>{pageStudentSingle?.fullName}</strong> ({pageStudentSingle?.collegeNo})
                          </span>
                        </div>

                        {renderVoucherRow(pageStudentSingle, 'College Copy', 0, false, true)}
                        {renderVoucherRow(pageStudentSingle, 'Student Copy', 1, true, true)}
                        {renderVoucherRow(pageStudentSingle, 'Accounts / Bank Copy', 2, true, true)}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-black text-slate-700 dark:text-slate-300">
                          <span className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                            <FileText size={14} />
                            <span>A4 Sheet #{safePage + 1} of {totalSheets} (4 Vouchers / 2 Students)</span>
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Students: <strong>{pageStudentA?.fullName}</strong> {pageStudentB ? <>• <strong>{pageStudentB?.fullName}</strong></> : null}
                          </span>
                        </div>

                        {renderVoucherRow(pageStudentA, 'College Copy', 0, false, false)}
                        {renderVoucherRow(pageStudentA, 'Student Copy', 1, true, false)}

                        {pageStudentB ? (
                          <>
                            {renderVoucherRow(pageStudentB, 'College Copy', 2, true, false)}
                            {renderVoucherRow(pageStudentB, 'Student Copy', 3, true, false)}
                          </>
                        ) : (
                          <>
                            {renderVoucherRow(null, '', 2, true, false)}
                            {renderVoucherRow(null, '', 3, true, false)}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}
