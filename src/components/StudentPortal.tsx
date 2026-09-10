import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GraduationCap, 
  CreditCard, 
  BookOpen, 
  Calendar, 
  Clock, 
  LogOut, 
  FileText, 
  Download, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Mail, 
  MapPin, 
  Bell, 
  User, 
  Printer,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Student, AcademicRecord } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import FeeReceipt from './FeeReceipt';
import { generateProfessionalResultCard } from './AcademicView';

interface StudentPortalProps {
  student: Student;
  academicRecords?: AcademicRecord[];
  timetable?: any[];
  settings?: any;
  onLogout: () => void;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StudentPortal({
  student,
  academicRecords = [],
  timetable = [],
  settings,
  onLogout
}: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [showFeeReceiptModal, setShowFeeReceiptModal] = useState<boolean>(false);

  // Student specific records
  const myRecords = useMemo(() => {
    return academicRecords.filter(r => r.studentId === student.id || r.studentName === student.fullName)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [academicRecords, student]);

  // Overall Academic Stats
  const academicStats = useMemo(() => {
    if (myRecords.length === 0) return { totalObtained: 0, totalMax: 0, pct: 0, grade: 'N/A' };
    const totalObtained = myRecords.reduce((sum, r) => sum + (Number(r.obtainedMarks) || 0), 0);
    const totalMax = myRecords.reduce((sum, r) => sum + (Number(r.totalMarks) || 0), 0);
    const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const grade = pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F';
    return { totalObtained, totalMax, pct, grade };
  }, [myRecords]);

  // Fee Details
  const totalPackage = student.totalPackage || student.feeLedger?.totalPackage || 0;
  const feeReceived = student.feeReceived || student.feeLedger?.totalReceived || 0;
  const pendingDues = Math.max(0, totalPackage - feeReceived);
  const feePaidPct = totalPackage > 0 ? Math.min(100, Math.round((feeReceived / totalPackage) * 100)) : 0;

  // Timetable entries for student's section & group
  const myTimetable = useMemo(() => {
    const studentSec = (student.section || '').trim().toLowerCase();
    const studentGroup = (student.group || '').trim().toLowerCase();

    return timetable.filter(t => {
      const tSec = (t.section || '').trim().toLowerCase();
      // Match section name
      return tSec.includes(studentSec) || tSec.includes(studentGroup);
    }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [timetable, student]);

  // Attendance Stats
  const attPresent = student.attendance?.present || 0;
  const attAbsent = student.attendance?.absent || 0;
  const attTotal = attPresent + attAbsent;
  const attPercentage = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 100;

  // Download Official Result Card PDF
  const downloadResultCard = () => {
    if (myRecords.length === 0) {
      toast.error("No exam records available to download result card.");
      return;
    }
    const doc = new jsPDF("p", "pt", "a4");
    generateProfessionalResultCard(myRecords, { settings }, doc, true);
    doc.save(`Result_Card_${(student.fullName || 'Student').replace(/\s+/g, '_')}.pdf`);
    toast.success("Official Result Card PDF downloaded successfully!");
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 font-sans pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-superior-teal flex items-center justify-center text-white shadow-md shadow-superior-teal/20">
              <GraduationCap size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-superior-teal bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Student Self-Service Portal
              </span>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                {settings?.collegeName || "Superior Group of Colleges"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="font-bold text-sm text-slate-900">{student.fullName}</span>
              <span className="text-xs text-slate-500 font-mono font-medium">
                Roll No: {student.id || student.rollNo} • Sec {student.section || 'A'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="h-10 px-3.5 rounded-xl border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 font-bold gap-2 transition-all"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Welcome & Student Hero Card */}
        <Card className="border-none shadow-xl shadow-slate-200/60 rounded-[2.5rem] bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 text-white overflow-hidden p-6 sm:p-8 relative">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/10 backdrop-blur border-2 border-white/20 flex items-center justify-center text-white font-black text-3xl shadow-2xl overflow-hidden shrink-0">
                {student.photo ? (
                  <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover" />
                ) : (
                  (student.fullName || 'ST').substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-superior-gold text-slate-950 font-black text-[10px] px-2.5 py-0.5">
                    ENROLLED
                  </Badge>
                  <span className="text-xs text-teal-300 font-mono font-bold">
                    {student.group} • Section {student.section || 'A'}
                  </span>
                  {student.session && (
                    <span className="text-xs text-slate-400">
                      • Session {student.session}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {student.fullName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium">
                  Father Name: <span className="text-white font-semibold">{student.fatherName || 'N/A'}</span> • Roll No: <span className="text-superior-gold font-mono font-bold">{student.id || student.rollNo}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
              <Button
                onClick={() => setShowFeeReceiptModal(true)}
                className="flex-1 md:flex-none h-11 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold gap-2 shadow-lg text-xs"
              >
                <CreditCard size={16} className="text-superior-teal" />
                <span>View Fee Receipt</span>
              </Button>
              <Button
                onClick={downloadResultCard}
                className="flex-1 md:flex-none h-11 px-4 rounded-xl bg-superior-teal hover:bg-superior-teal/90 text-white font-bold gap-2 shadow-lg text-xs"
              >
                <Award size={16} />
                <span>Download Result Card</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap h-auto gap-1">
            <TabsTrigger
              value="overview"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-superior-teal data-[state=active]:text-white transition-all gap-1.5"
            >
              <BookOpen size={15} />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger
              value="fees"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-superior-teal data-[state=active]:text-white transition-all gap-1.5"
            >
              <CreditCard size={15} />
              <span>Fee Ledger & Dues</span>
            </TabsTrigger>
            <TabsTrigger
              value="academics"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-superior-teal data-[state=active]:text-white transition-all gap-1.5"
            >
              <Award size={15} />
              <span>Academic Results ({myRecords.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-superior-teal data-[state=active]:text-white transition-all gap-1.5"
            >
              <Calendar size={15} />
              <span>Attendance ({attPercentage}%)</span>
            </TabsTrigger>
            <TabsTrigger
              value="timetable"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-superior-teal data-[state=active]:text-white transition-all gap-1.5"
            >
              <Clock size={15} />
              <span>Class Schedule</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Fee Status */}
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Fee Status</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-black text-slate-900">
                    RS {feeReceived.toLocaleString()}
                  </p>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${feePaidPct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-2">
                    <span>{feePaidPct}% Paid</span>
                    <span className="text-rose-600 font-bold">Due: RS {pendingDues.toLocaleString()}</span>
                  </div>
                </div>
              </Card>

              {/* Card 2: Academic Average */}
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Academic Average</span>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-superior-teal flex items-center justify-center">
                    <Award size={20} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-black text-slate-900">
                    {academicStats.pct.toFixed(1)}%
                  </p>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mt-2">
                    <span>Grade: <span className="font-black text-teal-800">{academicStats.grade}</span></span>
                    <span>{myRecords.length} Tests Taken</span>
                  </div>
                </div>
              </Card>

              {/* Card 3: Attendance Ratio */}
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Attendance</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-black text-slate-900">{attPercentage}%</p>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mt-2">
                    <span className="text-emerald-700">{attPresent} Present</span>
                    <span className="text-rose-600">{attAbsent} Absent</span>
                  </div>
                </div>
              </Card>

              {/* Card 4: Enrolled Program */}
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Class & Section</span>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                    <GraduationCap size={20} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xl font-black text-slate-900 truncate">
                    {student.group}
                  </p>
                  <p className="text-xs font-bold text-superior-teal mt-1">
                    Section: {student.section || 'A'} ({student.gender || 'General'})
                  </p>
                </div>
              </Card>
            </div>

            {/* Profile & College Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Details Card */}
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6 space-y-4">
                <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
                  <User size={18} className="text-superior-teal" /> Personal & Admission Details
                </CardTitle>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Registered Phone</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{student.contact || 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Father Contact</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{student.fatherContact || 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Bay-Form / CNIC</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{student.bayFormNo || 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Blood Group</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{student.bloodGroup || 'N/A'}</span>
                  </div>
                  <div className="col-span-2 p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Home Address</span>
                    <span className="font-medium text-slate-700 mt-0.5 block">{student.address || 'Khanewal Road, Jahanian'}</span>
                  </div>
                </div>
              </Card>

              {/* Campus Announcements & Helpdesk */}
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
                    <Bell size={18} className="text-amber-500" /> Digital Notice Board
                  </CardTitle>
                  <div className="mt-3 space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-100">
                      <p className="font-bold text-teal-900">Official Portal Active</p>
                      <p className="text-teal-700/90 mt-0.5">
                        Students can now view live examination marks, track fee dues, and download official receipts directly from this portal.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="font-bold text-slate-800">College Examination Timings</p>
                      <p className="text-slate-600 mt-0.5">
                        Please ensure on-time attendance before 08:00 AM. Roll number slips must be carried for all scheduled tests.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold">Helpline: 0301-4455891</span>
                  <span className="font-bold text-superior-teal">Jahanian Campus</span>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: FEE LEDGER */}
          <TabsContent value="fees" className="space-y-6">
            <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <CardTitle className="text-lg font-black text-slate-800">Fee Ledger & Installment Plan</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Complete record of package, paid installments, and remaining college fees.
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setShowFeeReceiptModal(true)}
                  className="bg-superior-teal hover:bg-superior-teal/90 text-white font-bold rounded-xl h-10 gap-2"
                >
                  <Printer size={16} />
                  <span>Print Official Fee Receipt</span>
                </Button>
              </div>

              {/* Fee Snapshot Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Total Package Fee</span>
                  <p className="text-xl font-black text-slate-800 mt-1">RS {totalPackage.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase">Total Paid</span>
                  <p className="text-xl font-black text-emerald-900 mt-1">RS {feeReceived.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100">
                  <span className="text-[11px] font-bold text-rose-800 uppercase">Remaining Dues</span>
                  <p className="text-xl font-black text-rose-900 mt-1">RS {pendingDues.toLocaleString()}</p>
                </div>
              </div>

              {/* Installments Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden mt-4">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700">Installment / Description</TableHead>
                      <TableHead className="font-bold text-slate-700">Due Date</TableHead>
                      <TableHead className="font-bold text-slate-700 text-right">Amount (RS)</TableHead>
                      <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(student.feeLedger?.installments || []).length > 0 ? (
                      student.feeLedger.installments.map((inst, idx) => (
                        <TableRow key={inst.id || idx}>
                          <TableCell className="font-semibold text-slate-800">
                            Installment #{idx + 1}
                          </TableCell>
                          <TableCell className="text-slate-600 font-mono text-xs">
                            {inst.dueDate || 'Upon Schedule'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-800">
                            {inst.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={
                              inst.status === 'Paid' 
                                ? 'bg-emerald-100 text-emerald-800 font-bold border-0' 
                                : 'bg-rose-100 text-rose-800 font-bold border-0'
                            }>
                              {inst.status || 'Pending'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-400 font-medium">
                          No customized installment breakdown configured. Contact college accounts office.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: ACADEMICS */}
          <TabsContent value="academics" className="space-y-6">
            <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <CardTitle className="text-lg font-black text-slate-800">Examination Results & Performance</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Official scorecards for weekly tests, monthly exams, and mid-terms.
                  </CardDescription>
                </div>
                <Button 
                  onClick={downloadResultCard}
                  className="bg-superior-teal hover:bg-superior-teal/90 text-white font-bold rounded-xl h-10 gap-2"
                >
                  <Download size={16} />
                  <span>Download Official Result Card PDF</span>
                </Button>
              </div>

              {/* Marks Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden mt-6">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700">Exam Date</TableHead>
                      <TableHead className="font-bold text-slate-700">Test Type</TableHead>
                      <TableHead className="font-bold text-slate-700">Subject</TableHead>
                      <TableHead className="font-bold text-slate-700 text-center">Total</TableHead>
                      <TableHead className="font-bold text-slate-700 text-center">Obtained</TableHead>
                      <TableHead className="font-bold text-slate-700 text-center">Score %</TableHead>
                      <TableHead className="font-bold text-slate-700 text-center">Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRecords.length > 0 ? (
                      myRecords.map((r, idx) => {
                        const obt = Number(r.obtainedMarks) || 0;
                        const tot = Number(r.totalMarks) || 1;
                        const pct = (obt / tot) * 100;
                        const grade = pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F';
                        return (
                          <TableRow key={r.id || idx}>
                            <TableCell className="font-mono text-xs font-semibold text-slate-600">
                              {r.date}
                            </TableCell>
                            <TableCell className="font-medium text-slate-700">
                              {r.testType || 'Exam'}
                            </TableCell>
                            <TableCell className="font-bold text-slate-900">
                              {r.subject}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-slate-600">
                              {r.totalMarks}
                            </TableCell>
                            <TableCell className="text-center font-bold text-teal-800">
                              {r.obtainedMarks}
                            </TableCell>
                            <TableCell className="text-center font-mono font-bold text-xs">
                              {pct.toFixed(0)}%
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                grade === 'A+' || grade === 'A' ? 'bg-emerald-100 text-emerald-800 border-0' :
                                grade === 'B' ? 'bg-blue-100 text-blue-800 border-0' :
                                grade === 'C' ? 'bg-amber-100 text-amber-800 border-0' : 'bg-rose-100 text-rose-800 border-0'
                              }>
                                {grade}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                          No academic exam marks recorded yet for this student.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 4: ATTENDANCE */}
          <TabsContent value="attendance" className="space-y-6">
            <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6">
              <CardTitle className="text-lg font-black text-slate-800 mb-4">
                Attendance Performance Log
              </CardTitle>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-5 rounded-2xl bg-teal-50 border border-teal-100 text-center">
                  <span className="text-xs font-bold text-teal-800 uppercase">Overall Attendance Rate</span>
                  <p className="text-3xl font-black text-teal-950 mt-1">{attPercentage}%</p>
                </div>
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                  <span className="text-xs font-bold text-emerald-800 uppercase">Present Classes</span>
                  <p className="text-3xl font-black text-emerald-950 mt-1">{attPresent} Days</p>
                </div>
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-100 text-center">
                  <span className="text-xs font-bold text-rose-800 uppercase">Absences Recorded</span>
                  <p className="text-3xl font-black text-rose-950 mt-1">{attAbsent} Days</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                <p className="font-bold text-slate-800 mb-1">Attendance Policy Notice:</p>
                A minimum of 75% class attendance is mandatory per Board & College regulations to qualify for official examinations.
              </div>
            </Card>
          </TabsContent>

          {/* TAB 5: TIMETABLE */}
          <TabsContent value="timetable" className="space-y-6">
            <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6">
              <CardTitle className="text-lg font-black text-slate-800 mb-1">
                Weekly Class Schedule
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mb-6">
                Assigned lectures and timing for Section {student.section || 'A'} ({student.group})
              </CardDescription>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DAYS_OF_WEEK.map(day => {
                  const dayLectures = myTimetable.filter(t => (t.day || '').toLowerCase() === day.toLowerCase());
                  return (
                    <div key={day} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-black text-slate-800 text-sm">{day}</span>
                        <Badge variant="outline" className="text-[10px] border-slate-300 font-bold">
                          {dayLectures.length} Lectures
                        </Badge>
                      </div>

                      {dayLectures.length > 0 ? (
                        <div className="space-y-2">
                          {dayLectures.map((lec, idx) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800">{lec.subject}</span>
                                <span className="font-mono font-bold text-superior-teal text-[11px]">
                                  {lec.startTime} - {lec.endTime}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Section: {lec.section} • {lec.classRoom || 'Regular Lecture'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-4 text-center">
                          No lectures scheduled
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Fee Receipt Modal */}
      {showFeeReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-black text-lg text-slate-900">Official Student Fee Receipt</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowFeeReceiptModal(false)}
                className="rounded-xl font-bold"
              >
                Close ✕
              </Button>
            </div>
            <FeeReceipt student={student} settings={settings} />
          </div>
        </div>
      )}
    </div>
  );
}
