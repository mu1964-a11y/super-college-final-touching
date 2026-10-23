import React, { useRef } from 'react';
import { X, Download, Wallet } from 'lucide-react';
import { exportElementToPdf } from '../utils/documentExporter';

interface StaffSalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: any;
  month: string;
  baseSalary: number;
  extraAllowance?: number;
  extraLecturesCount?: number;
  extraLectureRate?: number;
  leavesTaken?: number;
  leaveDeduction?: number;
  lateMinutes?: number;
  lateDeduction?: number;
  advanceDeduction?: number;
  netSalary: number;
  totalRemainingAdvance?: number;
  totalLecturesCount?: number;
  regularLecturesCount?: number;
  settings?: any;
}

export default function StaffSalarySlipModal({
  isOpen,
  onClose,
  staff,
  month,
  baseSalary,
  extraAllowance = 0,
  leaveDeduction = 0,
  lateDeduction = 0,
  advanceDeduction = 0,
  netSalary,
  totalRemainingAdvance = 0,
  settings,
}: StaffSalarySlipModalProps) {
  const slipRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !staff) return null;

  const collegeName = settings?.collegeName || 'Superior College Jahanian';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-emerald-300" />
            <h3 className="text-sm font-black uppercase tracking-wider">Official Faculty Salary Slip</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4" ref={slipRef}>
          <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-black text-slate-900">{collegeName}</h4>
              <p className="text-xs text-slate-500">Payroll Month: {month}</p>
            </div>
            <span className="text-xs font-black text-emerald-700">{staff.fullName}</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Base Salary:</span>
              <span className="font-mono font-bold">Rs. {Number(baseSalary || 0).toLocaleString()}</span>
            </div>
            {extraAllowance > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Extra Lecture Allowance:</span>
                <span className="font-mono font-bold">+ Rs. {extraAllowance.toLocaleString()}</span>
              </div>
            )}
            {leaveDeduction > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>Absent / Leave Deduction:</span>
                <span className="font-mono font-bold">- Rs. {leaveDeduction.toLocaleString()}</span>
              </div>
            )}
            {lateDeduction > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>Late Arrival Deduction:</span>
                <span className="font-mono font-bold">- Rs. {lateDeduction.toLocaleString()}</span>
              </div>
            )}
            {advanceDeduction > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Advance Salary Recovery:</span>
                <span className="font-mono font-bold">- Rs. {advanceDeduction.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-slate-200 text-sm font-black">
              <span className="text-slate-900">Net Payable Salary:</span>
              <span className="font-mono text-emerald-700">Rs. {Number(netSalary || 0).toLocaleString()}</span>
            </div>
            {totalRemainingAdvance > 0 && (
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Remaining Advance Balance:</span>
                <span className="font-mono">Rs. {totalRemainingAdvance.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() =>
              exportElementToPdf(slipRef.current, {
                filename: `Salary_Slip_${(staff.fullName || 'Staff').replace(/\s+/g, '_')}_${month}`,
              })
            }
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
