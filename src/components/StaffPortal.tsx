import React, { useMemo, useState } from 'react';
import {
  LogOut,
  Calendar,
  Wallet,
  Clock,
  CheckCircle2,
  Send,
  FileDown,
  BookOpen,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  parseAttendanceNotesAndTime,
  sendAutoStaffAttendancePdfNotice,
  sendAutoStaffSalaryPdfNotice,
} from '../lib/whatsappAutomation';
import { toast } from 'sonner';

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
  staffAdvances,
  collegeSettings,
  onLogout,
}: StaffPortalProps) {
  const [sendingSalaryPdf, setSendingSalaryPdf] = useState(false);
  const [sendingAttPdf, setSendingAttPdf] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const collegeName = collegeSettings?.name || collegeSettings?.collegeName || 'Superior College Jahanian';
  const staffId = staff?.id || staff?.staffId || '';
  const staffPhone = staff?.contact || staff?.phone || '';

  const myLectures = useMemo(
    () => (staffTimetable || []).filter((t: any) => (t.staffId || t.staff_id) === staffId),
    [staffTimetable, staffId]
  );

  const myAllAttendance = useMemo(() => {
    return (staffAttendance || [])
      .filter((a: any) => (a.staffId || a.staff_id) === staffId)
      .map((a: any) => {
        const parsed = parseAttendanceNotesAndTime(
          a.notes,
          a.checkIn || a.check_in || a.checkInTime || a.check_in_time,
          a.checkOut || a.check_out || a.checkOutTime || a.check_out_time
        );
        return {
          ...a,
          dateStr: String(a.date || '').slice(0, 10),
          checkInDisplay: parsed.checkIn || (a.status === 'Present' || a.status === 'Late' ? '08:00 AM' : '-'),
          breakDisplay: parsed.breakOut
            ? `${parsed.breakOut} → ${parsed.breakIn || 'On Break'}`
            : '-',
          checkOutDisplay: parsed.checkOut || '-',
          cleanRemarks: parsed.cleanRemarks || 'Verified',
        };
      })
      .sort((a: any, b: any) => String(b.dateStr).localeCompare(String(a.dateStr)));
  }, [staffAttendance, staffId]);

  const monthAttendance = useMemo(
    () => myAllAttendance.filter((a: any) => a.dateStr.startsWith(selectedMonth)),
    [myAllAttendance, selectedMonth]
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecord = useMemo(
    () => myAllAttendance.find((a: any) => a.dateStr === todayStr) || myAllAttendance[0],
    [myAllAttendance, todayStr]
  );

  const myAdvances = useMemo(
    () => (staffAdvances || []).filter((adv: any) => (adv.staffId || adv.staff_id) === staffId),
    [staffAdvances, staffId]
  );

  const stats = useMemo(() => {
    const present = monthAttendance.filter((a: any) => a.status === 'Present').length;
    const late = monthAttendance.filter((a: any) => a.status === 'Late').length;
    const absent = monthAttendance.filter((a: any) => a.status === 'Absent').length;
    const leave = monthAttendance.filter((a: any) => String(a.status || '').includes('Leave')).length;

    const baseSalary = Number(staff?.baseSalary || staff?.salary || staff?.base_salary || 0);
    const perDay = Math.round(baseSalary / 30);
    const absentDed = absent * perDay;
    const lateDed = Math.floor(late / 3) * perDay;
    const remAdvance = myAdvances.reduce(
      (sum: number, a: any) => sum + Number(a.remainingBalance ?? a.remaining_balance ?? 0),
      0
    );
    const netPayable = Math.max(0, baseSalary - absentDed - lateDed);

    return { present, late, absent, leave, baseSalary, absentDed, lateDed, remAdvance, netPayable };
  }, [monthAttendance, staff, myAdvances]);

  const handleSendWhatsAppAttendancePdf = async () => {
    if (!staffId) return;
    setSendingAttPdf(true);
    try {
      await sendAutoStaffAttendancePdfNotice(staffId, staffPhone, selectedMonth);
    } finally {
      setSendingAttPdf(false);
    }
  };

  const handleSendWhatsAppSalaryPdf = async () => {
    if (!staffId) return;
    setSendingSalaryPdf(true);
    try {
      await sendAutoStaffSalaryPdfNotice(staffId, staffPhone, selectedMonth);
    } finally {
      setSendingSalaryPdf(false);
    }
  };

  const handleDownloadAttendanceAndSalaryPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFillColor(6, 78, 67);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(collegeName.toUpperCase(), 14, 14);
      doc.setFontSize(10);
      doc.text(`OFFICIAL FACULTY ATTENDANCE & PAYROLL STATEMENT (${selectedMonth})`, 14, 23);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.text(`Faculty Name: ${staff?.fullName || 'Faculty'} (${staffId})`, 14, 42);
      doc.text(`Designation: ${staff?.role || staff?.designation || 'Faculty'}`, 14, 48);
      doc.text(
        `Monthly Summary: Present: ${stats.present} | Late: ${stats.late} | Absent: ${stats.absent} | Base Salary: Rs. ${stats.baseSalary.toLocaleString()}`,
        14,
        54
      );

      const rows = monthAttendance.map((r: any, idx: number) => {
        const d = new Date(r.dateStr);
        const dayName = !isNaN(d.getTime())
          ? d.toLocaleDateString('en-US', { weekday: 'long' })
          : '-';
        return [
          String(idx + 1),
          r.dateStr,
          dayName,
          r.checkInDisplay,
          r.breakDisplay || '-',
          r.checkOutDisplay,
          String(r.status || 'Present').toUpperCase(),
          r.cleanRemarks,
        ];
      });

      autoTable(doc, {
        startY: 60,
        head: [['Sr#', 'Date', 'Day', 'Morning In', 'Break Out / In', 'Final Out', 'Status', 'Verification Mode']],
        body: rows.length > 0 ? rows : [['1', selectedMonth, '-', '-', '-', '-', 'NO RECORDS', '-']],
        theme: 'grid',
        headStyles: { fillColor: [6, 78, 67], textColor: [255, 255, 255], fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
      });

      doc.save(`Faculty_Statement_${staffId}_${selectedMonth}.pdf`);
      toast.success('Official PDF Statement downloaded!');
    } catch (e: any) {
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center font-black text-xl overflow-hidden">
              {staff?.photo ? (
                <img src={staff.photo} alt={staff.fullName} className="w-full h-full object-cover" />
              ) : (
                (staff?.fullName || 'F').charAt(0)
              )}
            </div>
            <div>
              <p className="text-xs text-emerald-200 font-bold uppercase tracking-wider">{collegeName}</p>
              <h1 className="text-xl font-black">{staff?.fullName || 'Faculty Member'}</h1>
              <p className="text-xs text-emerald-100">
                ID: {staffId} • {staff?.role || staff?.designation || 'Faculty'} •{' '}
                {(staff?.subjects || []).join(', ') || 'Academic Department'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadAttendanceAndSalaryPdf}
              className="px-3.5 py-2 rounded-xl bg-white text-[#064e43] hover:bg-emerald-50 text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
            >
              <FileDown size={14} />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={handleSendWhatsAppSalaryPdf}
              disabled={sendingSalaryPdf}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-60"
            >
              <Send size={14} />
              <span>{sendingSalaryPdf ? 'Sending...' : 'WhatsApp Salary PDF'}</span>
            </button>
            <button
              type="button"
              onClick={handleSendWhatsAppAttendancePdf}
              disabled={sendingAttPdf}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-60"
            >
              <Send size={14} />
              <span>{sendingAttPdf ? 'Sending...' : 'WhatsApp Attendance PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* KPI Cards including Exact Marked Attendance Timestamp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <UserCheck size={15} className="text-emerald-600" />
                <span>Today / Latest Hazri Time</span>
              </span>
              {todayRecord && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    todayRecord.status === 'Late'
                      ? 'bg-amber-100 text-amber-800'
                      : todayRecord.status === 'Absent'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {todayRecord.status}
                </span>
              )}
            </div>
            <p className="text-lg font-black text-slate-900 font-mono">
              {todayRecord ? `In: ${todayRecord.checkInDisplay}` : 'Not Marked Today'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              {todayRecord
                ? `${todayRecord.dateStr}${
                    todayRecord.breakDisplay && todayRecord.breakDisplay !== '-'
                      ? ` • Break: ${todayRecord.breakDisplay}`
                      : ''
                  }${
                    todayRecord.checkOutDisplay && todayRecord.checkOutDisplay !== '-'
                      ? ` • Out: ${todayRecord.checkOutDisplay}`
                      : ''
                  }`
                : `Date: ${todayStr}`}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <Calendar size={15} className="text-sky-600" />
              <span>Monthly Attendance ({selectedMonth})</span>
            </div>
            <p className="text-xl font-black text-slate-900">
              P: {stats.present} <span className="text-amber-600 text-sm">/ L: {stats.late}</span>{' '}
              <span className="text-rose-600 text-sm">/ A: {stats.absent}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {monthAttendance.length} days logged • Leaves: {stats.leave}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <Wallet size={15} className="text-amber-600" />
              <span>Base Salary & Net Est.</span>
            </div>
            <p className="text-xl font-black text-slate-900">
              Rs. {stats.baseSalary.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Net Est: Rs. {stats.netPayable.toLocaleString()} • Adv Bal: Rs. {stats.remAdvance.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <Clock size={15} className="text-indigo-600" />
              <span>Assigned Lectures</span>
            </div>
            <p className="text-xl font-black text-slate-900">{myLectures.length} Slots</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {salaryPayments?.filter((p: any) => p.staffId === staffId).length || 0} salary slips issued
            </p>
          </div>
        </div>

        {/* Chronological Day-by-Day Attendance Table with Exact Check-In, Break, & Check-Out Time */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-[#064e43]" />
                <span>Chronological Attendance Register (Morning In • Mid-Day Break • Final Out)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Har din ki hazri, recess/free-period out/in aur final chutti ka exact biometric time darj hai
              </p>
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Morning Check-In</th>
                  <th className="py-3 px-4">Mid-Day Break (Out → In)</th>
                  <th className="py-3 px-4">Final Check-Out</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Verification / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {monthAttendance.length > 0 ? (
                  monthAttendance.map((rec: any) => {
                    const d = new Date(rec.dateStr);
                    const dayName = !isNaN(d.getTime())
                      ? d.toLocaleDateString('en-US', { weekday: 'long' })
                      : '-';
                    return (
                      <tr key={rec.id || rec.dateStr} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{rec.dateStr}</td>
                        <td className="py-3 px-4 text-slate-600">{dayName}</td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-700">
                          {rec.checkInDisplay}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-700">
                          {rec.breakDisplay || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-sky-700">
                          {rec.checkOutDisplay}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              rec.status === 'Present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'Late'
                                ? 'bg-amber-100 text-amber-800'
                                : rec.status === 'Absent'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {rec.status === 'Present' ? (
                              <CheckCircle2 size={11} />
                            ) : rec.status === 'Late' ? (
                              <AlertTriangle size={11} />
                            ) : null}
                            <span>{rec.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{rec.cleanRemarks}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      Is maheenay ({selectedMonth}) ka koi attendance record abhi darj nahi hua.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assigned Lecture Timetable */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={16} className="text-[#064e43]" />
              <span>Assigned Lecture Schedule</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Lecture Timing</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Class / Section / Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {myLectures.length > 0 ? (
                  myLectures.map((lec: any, idx: number) => (
                    <tr key={lec.id || idx} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{lec.day || 'Mon - Sat'}</td>
                      <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                        {lec.startTime || lec.start_time || '08:00'} - {lec.endTime || lec.end_time || '08:45'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{lec.subject || 'Lecture'}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {lec.className || lec.section || lec.class_room || 'Main Campus'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                      No lecture slots assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
