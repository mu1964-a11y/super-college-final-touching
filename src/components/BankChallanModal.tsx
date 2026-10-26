import React, { useState, useMemo } from 'react';
import { X, Download, Building2, Calendar, DollarSign, Printer, CheckCircle2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { downloadBankChallanPdf, getDefaultDueDate, generate3CopyChallanDoc } from '../utils/challanPdfGenerator';
import { toast } from 'sonner';

interface BankChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: any[] | null;
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
  settings,
}: BankChallanModalProps) {
  const [selectedBankId, setSelectedBankId] = useState<string>('hbl');
  const [dueDate, setDueDate] = useState<string>(() => getDefaultDueDate());
  const [lateSurcharge, setLateSurcharge] = useState<number>(500);
  const [feeMonth, setFeeMonth] = useState<string>('Term Installment / Dues');
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const studentList = useMemo(() => {
    return Array.isArray(students) ? students : students ? [students] : [];
  }, [students]);

  if (!isOpen || studentList.length === 0) return null;

  const activeBank = BANK_OPTIONS.find((b) => b.id === selectedBankId) || BANK_OPTIONS[0];
  const activeStudent = studentList[previewIndex] || studentList[0];

  const collegeName = 'SUPERIOR COLLEGE JAHANIAN';
  const collegeAddress = settings?.address || 'Canal Road, Jahanian';
  const collegeContact = settings?.contactNumber || 'Tel: 0331-2211147';

  const sTotalPkg = Number(activeStudent?.totalPackage || activeStudent?.total_package || 0);
  const sPaid = Number(activeStudent?.feeReceived || activeStudent?.fee_received || 0);
  const sRemaining = Math.max(0, sTotalPkg - sPaid);
  const sMonthly = Number(
    activeStudent?.monthlyFee ||
      activeStudent?.monthly_fee ||
      activeStudent?.feeLedger?.monthlyFee ||
      (activeStudent?.totalInstallments && activeStudent.totalInstallments > 0
        ? Math.round(sRemaining / activeStudent.totalInstallments)
        : Math.min(sRemaining, 12000))
  );
  const sTuitionDue = Math.min(sMonthly || 12000, sRemaining || 12000);
  const sArrears = Number(activeStudent?.previousArrears || activeStudent?.arrears || 0);
  const sMisc = Number(activeStudent?.miscFunds || activeStudent?.examFee || 0);
  const sTotalNow = sTuitionDue + sArrears + sMisc;
  const sTotalLate = sTotalNow + lateSurcharge;

  const handleDownloadPdf = async (singleStudentOnly = false) => {
    setIsExporting(true);
    try {
      const toExport = singleStudentOnly ? [activeStudent] : studentList;
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
      toast.success(
        singleStudentOnly
          ? `3-Copy Bank Challan downloaded for ${activeStudent.fullName}!`
          : `Batch of ${studentList.length} Bank Challans downloaded successfully!`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to download Challan PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    try {
      const doc = generate3CopyChallanDoc(studentList, {
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
          doc.save(`SCJ_Challans_${studentList.length > 1 ? 'Batch' : activeStudent.rollNumber || 'Student'}.pdf`);
        }
      };
      toast.success('Print document prepared!');
    } catch (err: any) {
      toast.error('Print preview failed: ' + err?.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-6xl w-full overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#064e43] via-[#085a4e] to-[#0a6c5d] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Building2 size={22} className="text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-wide">
                  Official 3-Copy Bank Fee Challan Generator
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
                  {studentList.length === 1 ? 'Single Student' : `Batch: ${studentList.length} Students`}
                </span>
              </div>
              <p className="text-[11px] text-white/80">
                {collegeName} • Bank Copy + College Accounts Copy + Student Copy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Customization Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0 text-xs">
          {/* Bank Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <Building2 size={12} className="text-emerald-600" /> Receiving Bank Account
            </label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-100 focus:outline-emerald-500 text-xs cursor-pointer"
            >
              {BANK_OPTIONS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <Calendar size={12} className="text-rose-600" /> Due Date (آخری تاریخ)
            </label>
            <input
              type="text"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="e.g. 10-Nov-2026"
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-100 focus:outline-emerald-500 text-xs"
            />
          </div>

          {/* Late Surcharge */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <DollarSign size={12} className="text-amber-600" /> Late Fee Fine (PKR)
            </label>
            <input
              type="number"
              value={lateSurcharge}
              onChange={(e) => setLateSurcharge(Number(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-100 focus:outline-emerald-500 text-xs"
            />
          </div>

          {/* Fee Installment Label */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <FileText size={12} className="text-sky-600" /> Fee Month / Heading
            </label>
            <input
              type="text"
              value={feeMonth}
              onChange={(e) => setFeeMonth(e.target.value)}
              placeholder="e.g. October 2026 Installment"
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-100 focus:outline-emerald-500 text-xs"
            />
          </div>
        </div>

        {/* Multi-Student Navigation Header if batch > 1 */}
        {studentList.length > 1 && (
          <div className="px-5 py-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs shrink-0">
            <span className="font-bold text-emerald-900 dark:text-emerald-200">
              Previewing Student <strong>{previewIndex + 1}</strong> of <strong>{studentList.length}</strong>:{' '}
              <span className="text-emerald-700 dark:text-emerald-300 font-black">
                {activeStudent.fullName} ({activeStudent.collegeNo || activeStudent.id})
              </span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                disabled={previewIndex === 0}
                className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                title="Previous Student"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewIndex((prev) => Math.min(studentList.length - 1, prev + 1))}
                disabled={previewIndex === studentList.length - 1}
                className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                title="Next Student"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Interactive 3-Copy Live Visual Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/70 dark:bg-slate-950/60">
          <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Live 3-Copy Landscape Layout Preview (Standard A4 Paper)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Resolution: Vector 300 DPI • 100% Instant
              </span>
            </div>

            {/* 3 Columns Grid representing Bank Copy, College Copy, Student Copy */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-sans text-slate-800 dark:text-slate-200">
              {['BANK COPY', 'COLLEGE COPY', 'STUDENT COPY'].map((copyTitle, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 p-3 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-2xs relative"
                >
                  {/* Top Header */}
                  <div>
                    <div className="bg-[#0b2447] text-white p-2 rounded-t-lg text-center">
                      <h4 className="text-[11px] font-black uppercase tracking-wide">
                        {collegeName}
                      </h4>
                      <p className="text-[8px] text-white/80 leading-tight">
                        Canal Road, Jahanian • Ph: 0331-2211147
                      </p>
                    </div>

                    <div className="bg-slate-100 dark:bg-slate-800 text-center py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-black text-[#0b2447] dark:text-emerald-400">
                        [ {copyTitle} ]
                      </span>
                    </div>

                    {/* Bank Info */}
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg border-b border-slate-200 dark:border-slate-700 text-[9px] space-y-0.5">
                      <p className="font-bold text-slate-900 dark:text-white">
                        Bank: <span className="font-normal">{activeBank.name}</span>
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        A/C: <span className="font-mono font-bold">{activeBank.accountNo}</span>
                      </p>
                      <p className="text-slate-500 text-[8px]">{activeBank.branch}</p>
                    </div>

                    {/* Challan Metadata */}
                    <div className="p-2 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg my-2 border border-blue-100 dark:border-blue-900/50 text-[9px] space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Challan #:</span>
                        <strong className="font-mono text-blue-900 dark:text-blue-300">
                          SCJ-2026-{String(activeStudent.collegeNo || activeStudent.id).slice(-4)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Issue Date:</span>
                        <span>{new Date().toLocaleDateString('en-GB')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Due Date:</span>
                        <strong className="text-rose-600 font-bold">{dueDate}</strong>
                      </div>
                    </div>

                    {/* Student Info */}
                    <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[9px] space-y-1 mb-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Roll No:</span>
                        <strong className="font-mono">
                          {activeStudent.collegeNo || activeStudent.id}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Student:</span>
                        <strong className="truncate max-w-[130px]">{activeStudent.fullName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Father:</span>
                        <span className="truncate max-w-[130px]">{activeStudent.fatherName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Class:</span>
                        <strong className="truncate max-w-[130px]">
                          {activeStudent.group || 'F.Sc'} ({activeStudent.section || 'A'})
                        </strong>
                      </div>
                    </div>

                    {/* Particulars Table */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden text-[9px] mb-2">
                      <div className="bg-[#0b2447] text-white p-1 font-bold flex justify-between text-[8.5px]">
                        <span>Particulars</span>
                        <span>Amount (PKR)</span>
                      </div>
                      <div className="p-1.5 flex justify-between border-b border-slate-100 dark:border-slate-800">
                        <span>Tuition / Installment</span>
                        <span className="font-bold">Rs. {sTuitionDue.toLocaleString()}</span>
                      </div>
                      {sMisc > 0 && (
                        <div className="p-1.5 flex justify-between border-b border-slate-100 dark:border-slate-800">
                          <span>Exam / Misc Fund</span>
                          <span className="font-bold">Rs. {sMisc.toLocaleString()}</span>
                        </div>
                      )}
                      {sArrears > 0 && (
                        <div className="p-1.5 flex justify-between border-b border-slate-100 dark:border-slate-800 text-rose-600">
                          <span>Previous Arrears (بقایا)</span>
                          <span className="font-bold">Rs. {sArrears.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-black flex justify-between border-t border-emerald-200 dark:border-emerald-800">
                        <span>Within Due Date:</span>
                        <span>Rs. {sTotalNow.toLocaleString()}</span>
                      </div>
                      <div className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold flex justify-between text-[8px]">
                        <span>After Due Date (+Fine):</span>
                        <span>Rs. {sTotalLate.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="pt-4 border-t border-dashed border-slate-300 dark:border-slate-700 flex justify-between text-[8px] text-slate-500">
                    <div className="text-center">
                      <div className="w-16 border-b border-slate-400 mb-0.5"></div>
                      <span>Depositor</span>
                    </div>
                    <div className="text-center">
                      <div className="w-16 border-b border-slate-400 mb-0.5"></div>
                      <span>Bank Officer</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              {studentList.length === 1
                ? `Ready to export 3-copy challan for ${activeStudent.fullName}`
                : `Ready to export ${studentList.length} challans (${studentList.length * 3} copies in 1 PDF)`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 cursor-pointer transition-colors"
            >
              Cancel
            </button>

            {studentList.length > 1 && (
              <button
                type="button"
                onClick={() => handleDownloadPdf(true)}
                disabled={isExporting}
                className="px-4 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Download size={14} />
                <span>Download This Student ({activeStudent.fullName})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              disabled={isExporting}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
            >
              <Printer size={14} />
              <span>Print Preview</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadPdf(false)}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition-colors"
            >
              <Download size={15} />
              <span>
                {isExporting
                  ? 'Generating PDF...'
                  : studentList.length === 1
                  ? 'Download 3-Copy Challan PDF'
                  : `Download All ${studentList.length} Challans (Combined PDF)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
