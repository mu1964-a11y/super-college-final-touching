import React from 'react';
import { X, Upload } from 'lucide-react';

interface BulkImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  defaultProgram?: string;
}

export default function BulkImportWizard({ isOpen, onClose }: BulkImportWizardProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-emerald-300" />
            <h3 className="text-sm font-black uppercase tracking-wider">Bulk Excel / CSV Student Import</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 text-center space-y-4">
          <p className="text-xs text-slate-600">
            Use the main Excel Import button on the toolbar or upload a standard SCJ Admission template.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
          >
            Close Wizard
          </button>
        </div>
      </div>
    </div>
  );
}
