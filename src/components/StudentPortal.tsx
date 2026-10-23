import React from 'react';
import { GraduationCap, LogOut, Calendar, Award, CreditCard } from 'lucide-react';

interface StudentPortalProps {
  student: any;
  academicRecords: any[];
  staffTimetable: any[];
  studentAttendance: any[];
  collegeSettings: any;
  onLogout: () => void;
}

export default function StudentPortal({
  student,
  academicRecords,
  studentAttendance,
  collegeSettings,
  onLogout,
}: StudentPortalProps) {
  const collegeName = collegeSettings?.name || 'Superior College Jahanian';
  const myExams = (academicRecords || []).filter((r: any) => r.studentId === student?.id);
  const myAttendance = (studentAttendance || []).filter((a: any) => a.studentId === student?.id);
  const totalPkg = Number(student?.totalPackage || 0);
  const paid = Number(student?.feeReceived || 0);
  const balance = Math.max(0, totalPkg - paid);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center font-black text-xl">
              {(student?.fullName || 'S').charAt(0)}
            </div>
            <div>
              <p className="text-xs text-emerald-200 font-bold uppercase tracking-wider">{collegeName}</p>
              <h1 className="text-xl font-black">{student?.fullName || 'Student'}</h1>
              <p className="text-xs text-emerald-100">
                Roll No: {student?.collegeNo || student?.studentId || 'N/A'} • {student?.group || student?.course || 'Program'}
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
              <CreditCard size={15} className="text-emerald-600" />
              <span>Fee Balance</span>
            </div>
            <p className="text-2xl font-black text-slate-900">Rs. {balance.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-1">Paid: Rs. {paid.toLocaleString()} / {totalPkg.toLocaleString()}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <Calendar size={15} className="text-sky-600" />
              <span>Attendance Logs</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{myAttendance.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Recorded campus check-ins</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <Award size={15} className="text-amber-600" />
              <span>Academic Assessments</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{myExams.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Published exam results</p>
          </div>
        </div>
      </div>
    </div>
  );
}
