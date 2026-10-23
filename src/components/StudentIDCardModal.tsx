import React, { useRef } from 'react';
import { X, Download, CreditCard } from 'lucide-react';
import { exportElementToPdf } from '../utils/documentExporter';

interface StudentIDCardModalProps {
  student: any;
  settings?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StudentIDCardModal({
  student,
  settings,
  open,
  onOpenChange,
}: StudentIDCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  if (!open || !student) return null;

  const collegeName = settings?.collegeName || 'Superior College Jahanian';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
            <CreditCard size={15} className="text-emerald-700" />
            <span>Student Institutional ID Card</span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-6">
          <div ref={cardRef} className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-white">
            <div className="bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white p-5 text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">
                {collegeName}
              </p>
              <div className="w-20 h-20 rounded-2xl bg-white/15 mx-auto overflow-hidden flex items-center justify-center border-2 border-white/30">
                {student.photo ? (
                  <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black">{(student.fullName || 'S').charAt(0)}</span>
                )}
              </div>
              <h3 className="text-base font-black">{student.fullName}</h3>
              <p className="text-xs text-emerald-200 font-bold">{student.group || student.course || 'Student'}</p>
            </div>

            <div className="p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Roll / College No:</span>
                <span className="font-mono font-black text-slate-800">
                  {student.collegeNo || student.studentId || student.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Father Name:</span>
                <span className="font-bold text-slate-800">{student.fatherName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Session:</span>
                <span className="font-bold text-emerald-700">{student.session || '2026-28'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={() =>
              exportElementToPdf(cardRef.current, {
                filename: `Student_ID_${(student.fullName || 'Student').replace(/\s+/g, '_')}`,
              })
            }
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Download ID Card PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
