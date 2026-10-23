import React from 'react';
import { X, CheckCircle2, Calendar } from 'lucide-react';

interface DailyAttendanceCloseoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  students: any[];
  studentAttendance: any[];
  staff: any[];
  staffAttendance: any[];
  settings?: any;
  onRefreshData?: () => void;
}

export default function DailyAttendanceCloseoutModal({
  isOpen,
  onClose,
  selectedDate,
  students,
  studentAttendance,
}: DailyAttendanceCloseoutModalProps) {
  if (!isOpen) return null;

  const todaysRecords = (studentAttendance || []).filter((a: any) => a.date === selectedDate);
  const presentCount = todaysRecords.filter((a: any) => a.status === 'Present').length;
  const absentCount = todaysRecords.filter((a: any) => a.status === 'Absent').length;
  const leaveCount = todaysRecords.filter((a: any) => a.status === 'Leave').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar size={18} className="text-emerald-300" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">Daily Attendance Closeout</h3>
              <p className="text-[11px] text-emerald-200">Date: {selectedDate}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500">Total</p>
              <p className="text-lg font-black text-slate-900">{(students || []).length}</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <p className="text-[10px] font-bold text-emerald-700">Present</p>
              <p className="text-lg font-black text-emerald-800">{presentCount}</p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
              <p className="text-[10px] font-bold text-rose-700">Absent</p>
              <p className="text-lg font-black text-rose-800">{absentCount}</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-[10px] font-bold text-amber-700">Leave</p>
              <p className="text-lg font-black text-amber-800">{leaveCount}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>Confirm Daily Register Closeout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
