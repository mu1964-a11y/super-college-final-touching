import React from 'react';
import { CheckCircle2, Printer } from 'lucide-react';

interface MobileDigitalReceiptCardProps {
  type: 'admission' | 'receipt';
  student: any;
  receiptNo?: string;
  collegeLogo?: string;
  collegeName?: string;
  qrCodeUrl?: string;
  matchedTx?: any;
  totalPackageAmount: number;
  feeReceivedAmount: number;
  remainingBalanceAmount: number;
  onSwitchToPrintView?: () => void;
  isPrintViewAvailable?: boolean;
}

export default function MobileDigitalReceiptCard({
  type,
  student,
  receiptNo,
  collegeLogo = '/superior-logo.png',
  collegeName = 'Superior College Jahanian',
  qrCodeUrl,
  totalPackageAmount,
  feeReceivedAmount,
  remainingBalanceAmount,
  onSwitchToPrintView,
  isPrintViewAvailable,
}: MobileDigitalReceiptCardProps) {
  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white p-5 text-center space-y-1.5">
        <img src={collegeLogo} alt={collegeName} className="w-12 h-12 mx-auto object-contain" />
        <h3 className="text-sm font-black uppercase tracking-wider">{collegeName}</h3>
        <p className="text-[11px] text-emerald-200 font-bold">
          {type === 'admission' ? 'Digital Admission Confirmation Slip' : 'Official Digital Fee Receipt'}
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
          <span className="font-bold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Verified Receipt
          </span>
          <span className="font-mono font-black text-emerald-900">{receiptNo || 'SCJ-REC'}</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Student Name:</span>
            <span className="font-black text-slate-900">{student?.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Roll / ID:</span>
            <span className="font-mono font-bold text-slate-800">
              {student?.collegeNo || student?.studentId || student?.id}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Package:</span>
            <span className="font-mono font-bold text-slate-800">
              Rs. {Number(totalPackageAmount || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Fee Received:</span>
            <span className="font-mono font-black text-emerald-700">
              Rs. {Number(feeReceivedAmount || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-100">
            <span className="text-slate-700 font-bold">Remaining Balance:</span>
            <span className="font-mono font-black text-rose-700">
              Rs. {Number(remainingBalanceAmount || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {qrCodeUrl && (
          <div className="flex justify-center pt-2">
            <img src={qrCodeUrl} alt="Verification QR" className="w-28 h-28 object-contain" />
          </div>
        )}

        {isPrintViewAvailable && onSwitchToPrintView && (
          <button
            onClick={onSwitchToPrintView}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} />
            <span>Switch to Full Print Layout</span>
          </button>
        )}
      </div>
    </div>
  );
}
