import React, { useRef } from 'react';
import { X, Download, Briefcase } from 'lucide-react';
import { exportElementToPdf } from '../utils/documentExporter';

interface StaffJoiningDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: any;
  brandingSettings?: any;
}

export default function StaffJoiningDossierModal({
  isOpen,
  onClose,
  staff,
  brandingSettings,
}: StaffJoiningDossierModalProps) {
  const dossierRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !staff) return null;

  const collegeName = brandingSettings?.collegeName || 'Superior College Jahanian';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-emerald-300" />
            <h3 className="text-sm font-black uppercase tracking-wider">Faculty Joining Report & Dossier</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4" ref={dossierRef}>
          <div className="border-b border-slate-200 pb-3">
            <h4 className="text-base font-black text-slate-900">{collegeName}</h4>
            <p className="text-xs text-slate-500">Official HR Faculty Joining Dossier</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-bold block">Full Name</span>
              <span className="font-black text-slate-900">{staff.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Designation / Role</span>
              <span className="font-bold text-slate-800">{staff.role || staff.designation || 'Faculty'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Contact Number</span>
              <span className="font-bold text-slate-800">{staff.contact || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Joining Date</span>
              <span className="font-bold text-slate-800">{staff.joinDate || '2026'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Qualification</span>
              <span className="font-bold text-slate-800">{staff.qualification || 'M.Phil / MS'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Base Salary Package</span>
              <span className="font-mono font-black text-emerald-700">
                Rs. {Number(staff.baseSalary || staff.salary || 0).toLocaleString()}
              </span>
            </div>
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
              exportElementToPdf(dossierRef.current, {
                filename: `Faculty_Dossier_${(staff.fullName || 'Staff').replace(/\s+/g, '_')}`,
              })
            }
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Download Dossier PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
