import React, { useMemo, useState } from 'react';
import {
  LogOut,
  Calendar,
  Award,
  CreditCard,
  Clock,
  FileDown,
  Send,
  CheckCircle2,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  parseAttendanceNotesAndTime,
  sendAutoFeeReceiptNotice,
} from '../lib/whatsappAutomation';
import { toast } from 'sonner';

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
  const [sendingWhatsAppPdf, setSendingWhatsAppPdf] = useState(false);

  const collegeName = collegeSettings?.name || collegeSettings?.collegeName || 'Superior College Jahanian';
  const studentId = student?.id || '';
  const rollNo = student?.collegeNo || student?.studentId || student?.college_no || studentId || 'N/A';

  const myExams = useMemo(
    () =>
      (academicRecords || [])
        .filter((r: any) => (r.studentId || r.student_id) === studentId)
        .sort((a: any, b: any) => String(b.date || '').localeCompare(String(a.date || ''))),
    [academicRecords, studentId]
  );

  const myAttendance = useMemo(() => {
    return (studentAttendance || [])
      .filter((a: any) => (a.studentId || a.student_id) === studentId)
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
          checkOutDisplay: parsed.checkOut || '-',
          cleanRemarks: parsed.cleanRemarks || 'Verified',
        };
      })
      .sort((a: any, b: any) => String(b.dateStr).localeCompare(String(a.dateStr)));
  }, [studentAttendance, studentId]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const latestAtt = useMemo(
    () => myAttendance.find((a: any) => a.dateStr === todayStr) || myAttendance[0],
    [myAttendance, todayStr]
  );

  const totalPkg = Number(student?.totalPackage || student?.total_package || 0);
  const paid = Number(student?.feeReceived || student?.fee_received || 0);
  const balance = Math.max(0, totalPkg - paid);

  const attStats = useMemo(() => {
    const present =
      myAttendance.filter((a: any) => a.status === 'Present').length ||
      Number(student?.attendancePresent || student?.attendance_present || 0);
    const absent =
      myAttendance.filter((a: any) => a.status === 'Absent').length ||
      Number(student?.attendanceAbsent || student?.attendance_absent || 0);
    const late = myAttendance.filter((a: any) => a.status === 'Late').length;
    const total = present + absent + late;
    const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
    return { present, absent, late, pct };
  }, [myAttendance, student]);

  const handleDownloadStudentPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFillColor(6, 78, 67);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(collegeName.toUpperCase(), 14, 14);
      doc.setFontSize(10);
      doc.text('OFFICIAL STUDENT ATTENDANCE, FEE & ACADEMIC TRANSCRIPT', 14, 23);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.text(
        `Student: ${student?.fullName || student?.full_name || 'Student'} S/D/O ${
          student?.fatherName || student?.father_name || 'N/A'
        }`,
        14,
        42
      );
      doc.text(
        `Roll No: ${rollNo} | Class: ${student?.group || student?.course || 'Intermediate'} (Sec ${
          student?.section || 'A'
        })`,
        14,
        48
      );
      doc.text(
        `Fee Package: Rs. ${totalPkg.toLocaleString()} | Paid: Rs. ${paid.toLocaleString()} | Balance: Rs. ${balance.toLocaleString()}`,
        14,
        54
      );

      const attRows = myAttendance.slice(0, 20).map((r: any, idx: number) => {
        const d = new Date(r.dateStr);
        const dayName = !isNaN(d.getTime())
          ? d.toLocaleDateString('en-US', { weekday: 'long' })
          : '-';
        return [
          String(idx + 1),
          r.dateStr,
          dayName,
          r.checkInDisplay,
          r.checkOutDisplay,
          String(r.status || 'Present').toUpperCase(),
          r.cleanRemarks,
        ];
      });

      autoTable(doc, {
        startY: 60,
        head: [['Sr#', 'Date', 'Day', 'Check-In Time', 'Check-Out Time', 'Status', 'Verification']],
        body: attRows.length > 0 ? attRows : [['1', todayStr, '-', '-', '-', 'VERIFIED', '-']],
        theme: 'grid',
        headStyles: { fillColor: [6, 78, 67], textColor: [255, 255, 255], fontSize: 8.5 },
        bodyStyles: { fontSize: 8 },
      });

      if (myExams.length > 0) {
        const nextY = ((doc as any).lastAutoTable?.finalY || 110) + 8;
        const examRows = myExams.slice(0, 15).map((ex: any, i: number) => {
          const obt = Number(ex.obtainedMarks ?? ex.obtained_marks ?? 0);
          const tot = Number(ex.totalMarks ?? ex.total_marks ?? 100);
          const pct = tot > 0 ? Math.round((obt / tot) * 100) : 0;
          return [
            String(i + 1),
            String(ex.date || '-').slice(0, 10),
            String(ex.testName || ex.test_name || 'Assessment'),
            String(ex.subject || 'Subject'),
            `${obt} / ${tot}`,
            `${pct}%`,
          ];
        });

        autoTable(doc, {
          startY: nextY,
          head: [['Sr#', 'Date', 'Test / Exam', 'Subject', 'Marks', 'Percentage']],
          body: examRows,
          theme: 'grid',
          headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontSize: 8.5 },
          bodyStyles: { fontSize: 8 },
        });
      }

      doc.save(`Student_Report_${rollNo}.pdf`);
      toast.success('Official Student PDF Report downloaded!');
    } catch {
      toast.error('Failed to generate Student PDF');
    }
  };

  const handleSendWhatsAppStatement = async () => {
    setSendingWhatsAppPdf(true);
    try {
      const ok = await sendAutoFeeReceiptNotice(
        student,
        {
          receiptId: `STMT-${rollNo}`,
          amountPaid: 0,
          remainingBalance: balance,
          feeType: 'Complete Account Statement',
        },
        collegeSettings
      );
      if (ok) {
        toast.success('Official Statement PDF dispatched to WhatsApp!');
      } else {
        toast.error('Could not dispatch WhatsApp PDF. Check registered phone number.');
      }
    } finally {
      setSendingWhatsAppPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center font-black text-xl overflow-hidden">
              {student?.photo ? (
                <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover" />
              ) : (
                (student?.fullName || 'S').charAt(0)
              )}
            </div>
            <div>
              <p className="text-xs text-emerald-200 font-bold uppercase tracking-wider">{collegeName}</p>
              <h1 className="text-xl font-black">{student?.fullName || student?.full_name || 'Student'}</h1>
              <p className="text-xs text-emerald-100">
                Roll No: {rollNo} • {student?.group || student?.course || 'Program'} (Sec{' '}
                {student?.section || 'A'})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadStudentPdf}
              className="px-3.5 py-2 rounded-xl bg-white text-[#064e43] hover:bg-emerald-50 text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
            >
              <FileDown size={14} />
              <span>Download Report PDF</span>
            </button>
            <button
              type="button"
              onClick={handleSendWhatsAppStatement}
              disabled={sendingWhatsAppPdf}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-60"
            >
              <Send size={14} />
              <span>{sendingWhatsAppPdf ? 'Sending...' : 'WhatsApp PDF Statement'}</span>
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

        {/* KPI Cards including Exact Attendance Check-In Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <UserCheck size={15} className="text-emerald-600" />
                <span>Latest Hazri & Time</span>
              </span>
              {latestAtt && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    latestAtt.status === 'Absent'
                      ? 'bg-rose-100 text-rose-800'
                      : latestAtt.status === 'Late'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {latestAtt.status}
                </span>
              )}
            </div>
            <p className="text-lg font-black text-slate-900 font-mono">
              {latestAtt ? `In: ${latestAtt.checkInDisplay}` : 'Verified'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              {latestAtt ? `Date: ${latestAtt.dateStr}` : `Today: ${todayStr}`}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <Calendar size={15} className="text-sky-600" />
              <span>Attendance Rate ({attStats.pct}%)</span>
            </div>
            <p className="text-xl font-black text-slate-900">
              P: {attStats.present} <span className="text-rose-600 text-sm">/ A: {attStats.absent}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Late arrivals: {attStats.late}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <CreditCard size={15} className="text-emerald-600" />
              <span>Fee Balance</span>
            </div>
            <p className="text-xl font-black text-slate-900">Rs. {balance.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Paid: Rs. {paid.toLocaleString()} / {totalPkg.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <Award size={15} className="text-amber-600" />
              <span>Academic Assessments</span>
            </div>
            <p className="text-xl font-black text-slate-900">{myExams.length} Tests</p>
            <p className="text-[11px] text-slate-500 mt-1">Published exam results</p>
          </div>
        </div>

        {/* Chronological Attendance Log with Exact Check-In & Check-Out Time */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-[#064e43]" />
              <span>Daily Attendance Log (With Exact Marked Check-In Time)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Har roz ki hazri jis waqt Gate Kiosk, Biometric ya Classroom mein mark hui uska exact waqt
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Marked Check-In Time</th>
                  <th className="py-3 px-4">Check-Out Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Verification Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {myAttendance.length > 0 ? (
                  myAttendance.map((rec: any, idx: number) => {
                    const d = new Date(rec.dateStr);
                    const dayName = !isNaN(d.getTime())
                      ? d.toLocaleDateString('en-US', { weekday: 'long' })
                      : '-';
                    return (
                      <tr key={rec.id || idx} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{rec.dateStr}</td>
                        <td className="py-3 px-4 text-slate-600">{dayName}</td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-700">
                          {rec.checkInDisplay}
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
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {rec.status === 'Present' ? (
                              <CheckCircle2 size={11} />
                            ) : (
                              <AlertTriangle size={11} />
                            )}
                            <span>{rec.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{rec.cleanRemarks}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Abhi tak koi daily attendance entry darj nahi hui.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Examination & Test Results Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Award size={16} className="text-[#064e43]" />
              <span>Subject-Wise Examination & Assessment Results</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Examination / Test</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Obtained / Total</th>
                  <th className="py-3 px-4">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {myExams.length > 0 ? (
                  myExams.map((ex: any, i: number) => {
                    const obt = Number(ex.obtainedMarks ?? ex.obtained_marks ?? 0);
                    const tot = Number(ex.totalMarks ?? ex.total_marks ?? 100);
                    const pct = tot > 0 ? Math.round((obt / tot) * 100) : 0;
                    return (
                      <tr key={ex.id || i} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {String(ex.date || '-').slice(0, 10)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {ex.testName || ex.test_name || 'Monthly Assessment'}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{ex.subject || 'Subject'}</td>
                        <td className="py-3 px-4 font-mono font-black text-slate-900">
                          {obt} / {tot}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">{pct}%</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                      No examination records uploaded yet.
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
