import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface BulkEditStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudents: any[];
  data: any;
  onSuccess?: () => void;
}

export default function BulkEditStudentsModal({
  isOpen,
  onClose,
  selectedStudents = [],
  data,
  onSuccess,
}: BulkEditStudentsModalProps) {
  const [section, setSection] = useState('');
  const [session, setSession] = useState('');

  if (!isOpen) return null;

  const handleApply = async () => {
    const updates: Record<string, any> = {};
    if (section.trim()) updates.section = section.trim();
    if (session.trim()) updates.session = session.trim();

    if (Object.keys(updates).length === 0) {
      toast.error('Please specify at least one field to update');
      return;
    }

    for (const s of selectedStudents) {
      await data?.updateStudent?.(s.id, updates);
    }
    toast.success(`Updated ${selectedStudents.length} students!`);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider">
            Bulk Edit ({selectedStudents.length} Students)
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Assign Section (Optional)
            </label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. Section A"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Assign Session (Optional)
            </label>
            <input
              type="text"
              value={session}
              onChange={(e) => setSession(e.target.value)}
              placeholder="e.g. 2026-28"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
            />
          </div>
          <button
            onClick={handleApply}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>Apply Bulk Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
