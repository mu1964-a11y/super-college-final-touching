import React, { useState, useMemo } from 'react';
import { Search, User, X, ArrowRight, GraduationCap } from 'lucide-react';

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onSelectStudent: (student: any, tab?: 'profile' | 'fee' | 'attendance' | 'exams') => void;
  onNavigate: (page: string, filter?: string) => void;
}

export default function GlobalCommandPalette({
  isOpen,
  onClose,
  data,
  onSelectStudent,
  onNavigate,
}: GlobalCommandPaletteProps) {
  const [query, setQuery] = useState('');

  const matchedStudents = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return (data?.students || []).slice(0, 8);
    return (data?.students || [])
      .filter((s: any) => {
        const name = (s.fullName || '').toLowerCase();
        const father = (s.fatherName || '').toLowerCase();
        const roll = String(s.collegeNo || s.studentId || s.id || '').toLowerCase();
        const phone = String(s.contact || s.fatherContact || '').toLowerCase();
        return name.includes(q) || father.includes(q) || roll.includes(q) || phone.includes(q);
      })
      .slice(0, 12);
  }, [data?.students, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-700" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students by Name, Roll No, Father Name, or Phone..."
            className="flex-1 text-sm font-semibold text-slate-900 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-3 space-y-1.5">
          {matchedStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching records found for "{query}"
            </div>
          ) : (
            matchedStudents.map((s: any) => (
              <div
                key={s.id}
                onClick={() => {
                  onSelectStudent(s, 'profile');
                  onClose();
                }}
                className="p-3 rounded-2xl hover:bg-emerald-50/70 flex items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                    {(s.fullName || 'S').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{s.fullName}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Roll: {s.collegeNo || s.studentId || 'N/A'} • {s.group || s.course || 'Program'}
                    </p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-400 shrink-0" />
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Quick Navigation</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onNavigate('admissions');
                onClose();
              }}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 cursor-pointer"
            >
              Admissions
            </button>
            <button
              onClick={() => {
                onNavigate('fee');
                onClose();
              }}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 cursor-pointer"
            >
              Fee Desk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
