import React, { useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, Image, X, CheckCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { exportElementToPdf, exportElementToImage } from '../utils/documentExporter';
import { Staff } from '../types';

interface StaffSalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff;
  month: string;
  baseSalary: number;
  extraAllowance: number;
  extraLecturesCount: number;
  extraLectureRate: number;
  leavesTaken: number;
  leaveDeduction: number;
  lateMinutes: number;
  lateDeduction: number;
  advanceDeduction: number;
  netSalary: number;
  totalRemainingAdvance: number;
  totalLecturesCount: number;
  regularLecturesCount: number;
  settings?: any;
}

export default function StaffSalarySlipModal({
  isOpen,
  onClose,
  staff,
  month,
  baseSalary,
  extraAllowance,
  extraLecturesCount,
  extraLectureRate,
  leavesTaken,
  leaveDeduction,
  lateMinutes,
  lateDeduction,
  advanceDeduction,
  netSalary,
  totalRemainingAdvance,
  totalLecturesCount,
  regularLecturesCount,
  settings
}: StaffSalarySlipModalProps) {
  const slipRef = useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    if (!staff || !isOpen) return;
    const verifyId = staff.id || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://superiorcollegejahanian.com';
    const qrPayload = `${origin}/?verify=staff_payroll&id=${encodeURIComponent(verifyId)}&m=${encodeURIComponent(month)}`;

    QRCode.toDataURL(qrPayload, {
      width: 140,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }
    }).then(setQrCodeUrl).catch(console.error);
  }, [staff, month, isOpen]);

  const monthFormatted = (() => {
    try {
      const [year, m] = month.split('-');
      const date = new Date(Number(year), Number(m) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return month;
    }
  })();

  const downloadPdf = async () => {
    if (!slipRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading('Generating Official Payslip PDF...');
    try {
      await exportElementToPdf(slipRef.current, {
        filename: `Salary-Slip-${(staff.fullName || 'Staff').replace(/\s+/g, '_')}-${month}`,
        format: 'a4',
        orientation: 'portrait',
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        marginMm: 8,
      });
      toast.dismiss(toastId);
      toast.success('Salary Slip PDF downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadImage = async () => {
    if (!slipRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading('Generating Payslip Image...');
    try {
      await exportElementToImage(slipRef.current, {
        filename: `Salary-Slip-${(staff.fullName || 'Staff').replace(/\s+/g, '_')}-${month}`,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff'
      });
      toast.dismiss(toastId);
      toast.success('Salary Slip Image downloaded!');
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('Failed to generate image.');
    } finally {
      setIsExporting(false);
    }
  };

  const reactToPrintFn = useReactToPrint({
    contentRef: slipRef,
    documentTitle: `Salary_Slip_${(staff.fullName || 'Staff').replace(/\s+/g, '_')}_${month}`,
    onPrintError: () => {
      toast.error('Direct print failed. Falling back to PDF download...');
      downloadPdf();
    }
  });

  const handlePrint = () => {
    try {
      const isIframe = typeof window !== 'undefined' && window !== window.parent;
      if (isIframe) {
        toast.info('Direct printing is blocked in Preview mode. Downloading PDF instead...', { duration: 5000 });
        downloadPdf();
      } else {
        reactToPrintFn();
      }
    } catch {
      downloadPdf();
    }
  };

  const finalRemainingAdvance = Math.max(0, totalRemainingAdvance - advanceDeduction);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl border-none shadow-2xl bg-slate-100">
        <DialogHeader className="sticky top-0 z-20 bg-white/95 backdrop-blur px-6 py-4 border-b border-slate-200 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-black text-slate-800">
              Staff Salary Payslip
            </DialogTitle>
            <p className="text-xs text-slate-500 font-medium">
              {staff.fullName} ({staff.id}) • {monthFormatted}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isExporting}
              className="h-9 px-3 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold gap-1.5"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadImage}
              disabled={isExporting}
              className="h-9 px-3 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold gap-1.5"
            >
              <Image size={15} />
              <span className="hidden sm:inline">Image</span>
            </Button>
            <Button
              size="sm"
              onClick={downloadPdf}
              disabled={isExporting}
              className="h-9 px-4 rounded-xl bg-superior-teal hover:bg-superior-teal/90 text-white font-bold gap-1.5 shadow-sm"
            >
              <Download size={15} />
              <span>Download PDF</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-700"
            >
              <X size={18} />
            </Button>
          </div>
        </DialogHeader>

        {/* Printable & Exportable Payslip Canvas */}
        <div className="p-6 flex justify-center">
          <div
            ref={slipRef}
            className="w-full max-w-[800px] bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-slate-800 space-y-6"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Header / Brand */}
            <div className="border-b-2 border-slate-800 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-superior-teal bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                      Official Salary Disbursement
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      Confidential
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                    SUPERIOR GROUP OF COLLEGES
                  </h1>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">
                    Jahanian Campus • Staff Payroll Slip
                  </p>
                </div>

                {qrCodeUrl && (
                  <div className="shrink-0 text-center flex flex-col items-center">
                    <img
                      src={qrCodeUrl}
                      alt="Verification QR"
                      className="w-20 h-20 border border-slate-200 rounded-lg p-1 bg-white shadow-sm"
                    />
                    <span className="text-[9px] font-bold text-slate-500 mt-1 flex items-center gap-0.5">
                      <ShieldCheck size={11} className="text-teal-600" />
                      Scan to Verify
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Staff & Payroll Meta Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">
                  Employee ID
                </span>
                <span className="font-mono font-black text-slate-800 text-sm">
                  {staff.id}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">
                  Employee Name
                </span>
                <span className="font-bold text-slate-900 text-sm truncate block">
                  {staff.fullName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">
                  Designation / Role
                </span>
                <span className="font-semibold text-slate-700">
                  {staff.role || 'Faculty Member'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">
                  Pay Period
                </span>
                <span className="font-extrabold text-superior-teal">
                  {monthFormatted}
                </span>
              </div>
            </div>

            {/* Attendance & Lecture Metrics Bar */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
                <span className="text-[10px] text-teal-800 font-bold uppercase block">
                  Lectures (Total / Reg)
                </span>
                <span className="text-base font-black text-teal-900">
                  {totalLecturesCount} <span className="text-xs font-medium text-teal-700">({regularLecturesCount} regular)</span>
                </span>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                <span className="text-[10px] text-amber-800 font-bold uppercase block">
                  Leaves Taken
                </span>
                <span className="text-base font-black text-amber-900">
                  {leavesTaken} <span className="text-xs font-medium text-amber-700">days</span>
                </span>
              </div>
              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                <span className="text-[10px] text-rose-800 font-bold uppercase block">
                  Late / Short Time
                </span>
                <span className="text-base font-black text-rose-900">
                  {lateMinutes} <span className="text-xs font-medium text-rose-700">minutes</span>
                </span>
              </div>
            </div>

            {/* Earnings & Deductions Breakdown Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 font-black text-slate-700">
                    <th className="p-3 w-1/2">EARNINGS & ALLOWANCES</th>
                    <th className="p-3 text-right">AMOUNT (RS)</th>
                    <th className="p-3 w-1/3 border-l border-slate-200">DEDUCTIONS & RECOVERIES</th>
                    <th className="p-3 text-right">AMOUNT (RS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">
                      Basic Gross Salary
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {baseSalary.toLocaleString()}
                    </td>
                    <td className="p-3 border-l border-slate-200">
                      Leave Absence Deduction ({leavesTaken} days)
                    </td>
                    <td className="p-3 text-right font-bold text-rose-600">
                      {leaveDeduction > 0 ? `-${Math.round(leaveDeduction).toLocaleString()}` : '0'}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-medium">
                      Extra Lectures ({extraLecturesCount} lecs @ RS {extraLectureRate.toFixed(0)})
                    </td>
                    <td className="p-3 text-right font-bold text-teal-700">
                      {extraAllowance > 0 ? `+${Math.round(extraAllowance).toLocaleString()}` : '0'}
                    </td>
                    <td className="p-3 border-l border-slate-200">
                      Late Arrival / Short Minutes ({lateMinutes}m)
                    </td>
                    <td className="p-3 text-right font-bold text-rose-600">
                      {lateDeduction > 0 ? `-${Math.round(lateDeduction).toLocaleString()}` : '0'}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 text-slate-400 font-medium">
                      Other Approved Allowances
                    </td>
                    <td className="p-3 text-right text-slate-400 font-medium">
                      0
                    </td>
                    <td className="p-3 border-l border-slate-200">
                      Salary Advance Monthly Recovery
                    </td>
                    <td className="p-3 text-right font-bold text-amber-600">
                      {advanceDeduction > 0 ? `-${Math.round(advanceDeduction).toLocaleString()}` : '0'}
                    </td>
                  </tr>

                  {/* Totals Header */}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-900">
                    <td className="p-3">Total Gross Earnings</td>
                    <td className="p-3 text-right text-teal-800">
                      RS {(baseSalary + extraAllowance).toLocaleString()}
                    </td>
                    <td className="p-3 border-l border-slate-200">Total Deductions</td>
                    <td className="p-3 text-right text-rose-700">
                      RS {(leaveDeduction + lateDeduction + advanceDeduction).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Advance Status & Net Payable Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              {/* Advance Repayment Status */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Advance Salary Status
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs text-amber-900 font-medium">Remaining Loan Balance:</span>
                    <span className="font-mono font-bold text-amber-900 text-sm">
                      RS {finalRemainingAdvance.toLocaleString()}
                    </span>
                  </div>
                  {advanceDeduction > 0 && (
                    <p className="text-[11px] text-amber-700 mt-1">
                      RS {advanceDeduction.toLocaleString()} successfully recovered in this payroll cycle.
                    </p>
                  )}
                </div>
                {totalRemainingAdvance === 0 && (
                  <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mt-2">
                    <CheckCircle size={13} /> No outstanding advances
                  </p>
                )}
              </div>

              {/* Net Payable Highlight */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col justify-between shadow-md">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">
                  Net Disbursed / Payable Salary
                </span>
                <div className="mt-2 text-right">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    RS {Math.max(0, Math.round(netSalary)).toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
                    Net Take-Home Pay for {monthFormatted}
                  </span>
                </div>
              </div>
            </div>

            {/* Signatures & Stamp block */}
            <div className="pt-10 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-8">
                <div className="border-b border-slate-400 mx-auto w-3/4"></div>
                <p className="font-bold text-slate-700">Prepared By (Accounts)</p>
              </div>
              <div className="space-y-8">
                <div className="border-b border-slate-400 mx-auto w-3/4"></div>
                <p className="font-bold text-slate-700">Principal / Campus Director</p>
              </div>
              <div className="space-y-8">
                <div className="border-b border-slate-400 mx-auto w-3/4"></div>
                <p className="font-bold text-slate-700">Employee Signature</p>
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-[10px] text-center text-slate-400 pt-2 border-t border-slate-100">
              System generated computer slip • Superior Group of Colleges Jahanian ERP • Verification Key: {staff.id}-{month}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
