import React from 'react';
import { ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';

interface PublicVerificationViewProps {
  onGoToAdmin: () => void;
}

export default function PublicVerificationView({ onGoToAdmin }: PublicVerificationViewProps) {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const verifyType = params.get('verify') || 'document';
  const docId = params.get('id') || 'N/A';
  const roll = params.get('roll') || params.get('ref') || '';
  const token = params.get('token') || 'VERIFIED';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white p-6 text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-white/15 mx-auto flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-emerald-300" />
          </div>
          <h1 className="text-lg font-black uppercase tracking-wider">Superior College Jahanian</h1>
          <p className="text-xs text-emerald-200">Official Digital Document Verification</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <p className="font-black">Authentic Institutional Document</p>
              <p className="text-emerald-700">Verified against SCJ Digital ERP Ledger</p>
            </div>
          </div>

          <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Document Type:</span>
              <span className="font-black uppercase text-slate-800">{verifyType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Reference / ID:</span>
              <span className="font-mono font-black text-slate-800">{docId}</span>
            </div>
            {roll && (
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Student Roll / Ref:</span>
                <span className="font-mono font-bold text-slate-800">{roll}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Security Token:</span>
              <span className="font-mono text-emerald-700 font-bold">{token}</span>
            </div>
          </div>

          <button
            onClick={onGoToAdmin}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Return to College Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
