import React from 'react';
import { Archive, RotateCcw, ArrowLeft } from 'lucide-react';

interface DeletedArchiveViewProps {
  data: any;
  onNavigate: (page: string) => void;
}

export default function DeletedArchiveView({ data, onNavigate }: DeletedArchiveViewProps) {
  const archivedStudents = (data?.students || []).filter((s: any) => s.isDeleted || s.status === 'Archived');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Archive size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Institutional Archive Vault</h1>
            <p className="text-xs text-slate-500">Recoverable audit archive of removed records</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Dashboard</span>
        </button>
      </div>

      {archivedStudents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
          <Archive className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-black text-slate-700">Archive Vault is Clean</p>
          <p className="text-xs text-slate-400">No archived or soft-deleted student records found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100">
          {archivedStudents.map((s: any) => (
            <div key={s.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">{s.fullName}</p>
                <p className="text-xs text-slate-500">{s.collegeNo || s.studentId} • {s.group}</p>
              </div>
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <RotateCcw size={13} /> Archived
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
