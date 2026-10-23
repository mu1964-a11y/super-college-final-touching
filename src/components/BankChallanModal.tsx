import React, { useRef } from 'react';
import { X, Download, Building2 } from 'lucide-react';
import { exportElementToPdf } from '../utils/documentExporter';

interface BankChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: any[] | null;
  settings?: any;
}

export default function BankChallanModal({
  isOpen,
  onClose,
  students,
  settings,
}: BankChallanModalProps) {
  const challanRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !students || students.length === 0) return null;

  const collegeName = settings?.collegeName || 'Superior College Jahanian';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 size={18} className="text-emerald-300" />
            <h3 className="text-sm font-black uppercase tracking-wider">Official Fee Bank Challan</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1" ref={challanRef}>
          {students.map((s: any) => {
            const totalPkg = Number(s.totalPackage || 0);
            const paid = Number(s.feeReceived || 0);
            const due = Math.max(0, totalPkg - paid);
            return (
              <div key={s.id} className="p-5 rounded-2xl border border-slate-300 mb-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{collegeName}</h4>
                    <p className="text-[11px] text-slate-500">Student Copy / Bank Fee Voucher</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    Roll: {s.collegeNo || s.studentId || s.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Student Name:</span>{' '}
                    <strong className="text-slate-900">{s.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Father Name:</span>{' '}
                    <strong className="text-slate-900">{s.fatherName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Program:</span>{' '}
                    <strong className="text-slate-900">{s.group || s.course || 'F.Sc'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Payable Dues:</span>{' '}
                    <strong className="text-emerald-700">Rs. {due.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => exportElementToPdf(challanRef.current, { filename: 'SCJ_Fee_Challan' })}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Export Challan PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
