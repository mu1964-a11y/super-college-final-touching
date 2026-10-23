import React from 'react';
import { Briefcase, LogOut, Calendar, Wallet, Clock } from 'lucide-react';

interface StaffPortalProps {
  staff: any;
  staffTimetable: any[];
  staffAttendance: any[];
  salaryPayments: any[];
  staffAdvances: any[];
  collegeSettings: any;
  onLogout: () => void;
}

export default function StaffPortal({
  staff,
  staffTimetable,
  staffAttendance,
  salaryPayments,
  collegeSettings,
  onLogout,
}: StaffPortalProps) {
  const collegeName = collegeSettings?.name || 'Superior College Jahanian';
  const myLectures = (staffTimetable || []).filter((t: any) => t.staffId === staff?.id);
  const myAttendance = (staffAttendance || []).filter((a: any) => a.staffId === staff?.id);
  const mySalaries = (salaryPayments || []).filter((p: any) => p.staffId === staff?.id);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center font-black text-xl">
              {(staff?.fullName || 'F').charAt(0)}
            </div>
            <div>
              <p className="text-xs text-emerald-200 font-bold uppercase tracking-wider">{collegeName}</p>
              <h1 className="text-xl font-black">{staff?.fullName || 'Faculty Member'}</h1>
              <p className="text-xs text-emerald-100">
                {staff?.role || staff?.designation || 'Faculty'} • {(staff?.subjects || []).join(', ') || 'Academic Department'}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <Clock size={15} className="text-emerald-600" />
              <span>Assigned Lectures</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{myLectures.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Weekly timetable slots</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <Calendar size={15} className="text-sky-600" />
              <span>Attendance Days</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{myAttendance.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Logged attendance entries</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <Wallet size={15} className="text-amber-600" />
              <span>Base Salary</span>
            </div>
            <p className="text-2xl font-black text-slate-900">
              Rs. {Number(staff?.baseSalary || staff?.salary || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">{mySalaries.length} salary slips issued</p>
          </div>
        </div>
      </div>
    </div>
  );
}
