import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Briefcase, 
  Calendar, 
  Clock, 
  CreditCard, 
  FileText, 
  LogOut, 
  User, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Printer, 
  BookOpen, 
  Phone, 
  Mail, 
  MapPin, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Staff } from '../types';
import StaffSalarySlipModal from './StaffSalarySlipModal';

interface StaffPortalProps {
  staff: Staff;
  timetable?: any[];
  attendanceRecords?: any[];
  advances?: any[];
  settings?: any;
  onLogout: () => void;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StaffPortal({
  staff,
  timetable = [],
  attendanceRecords = [],
  advances = [],
  settings,
  onLogout
}: StaffPortalProps) {
  const [activeTab, setActiveTab] = useState<string>("timetable");
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState<boolean>(false);
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // Teacher specific timetable
  const myTimetable = useMemo(() => {
    return timetable.filter(t => t.staffId === staff.id)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [timetable, staff]);

  // Total & Extra Lectures Count
  const totalWeeklyLectures = myTimetable.length;
  const extraWeeklyLectures = myTimetable.filter(t => t.classRoom === 'Extra').length;
  const regularWeeklyLectures = totalWeeklyLectures - extraWeeklyLectures;

  // Teacher monthly attendance
  const myAttendance = useMemo(() => {
    return attendanceRecords.filter(r => r.staffId === staff.id && r.date?.startsWith(currentMonth))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceRecords, staff, currentMonth]);

  const presentDays = myAttendance.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const absentDays = myAttendance.filter(r => r.status === 'Absent').length;
  const leavesDays = myAttendance.filter(r => r.status === 'Personal Leave' || r.status === 'Sick Leave').length;

  // Advances calculation
  const staffAdvances = useMemo(() => {
    return advances.filter(a => a.staffId === staff.id);
  }, [advances, staff]);

  const totalRemainingAdvance = staffAdvances.reduce((sum, a) => sum + (Number(a.remainingBalance) || 0), 0);
  const totalInitialAdvance = staffAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  // Salary snapshot
  const baseSalary = Number(staff.baseSalary || staff.salary) || 0;
  const extraAllowance = 0; // Configured at payroll generation
  const netPayable = Math.max(0, baseSalary - (totalRemainingAdvance > 0 ? Math.min(baseSalary * 0.2, totalRemainingAdvance) : 0));

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 font-sans pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-superior-teal flex items-center justify-center text-white shadow-md shadow-superior-teal/20">
              <Briefcase size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-superior-teal bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Faculty & Staff Portal
              </span>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                {settings?.collegeName || "Superior Group of Colleges"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="font-bold text-sm text-slate-900">{staff.fullName}</span>
              <span className="text-xs text-slate-500 font-mono font-medium">
                ID: {staff.id} • {staff.role}
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
        {/* Faculty Hero Card */}
        <Card className="border-none shadow-xl shadow-slate-200/60 rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 text-white overflow-hidden p-6 sm:p-8 relative">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/10 backdrop-blur border-2 border-white/20 flex items-center justify-center text-white font-black text-3xl shadow-2xl overflow-hidden shrink-0">
                {staff.photo ? (
                  <img src={staff.photo} alt={staff.fullName} className="w-full h-full object-cover" />
                ) : (
                  (staff.fullName || 'ST').substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-superior-teal text-white font-black text-[10px] px-2.5 py-0.5">
                    FACULTY MEMBER
                  </Badge>
                  <span className="text-xs text-superior-gold font-mono font-bold">
                    {staff.id}
                  </span>
                  <span className="text-xs text-slate-400">
                    • Joined: {staff.joinDate || 'Official Staff'}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {staff.fullName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium">
                  Designation: <span className="text-white font-semibold">{staff.role || 'Teacher'}</span>
                  {staff.qualification && (
                    <span> • Qualification: <span className="text-white font-semibold">{staff.qualification}</span></span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
              <Button
                onClick={() => setIsPayslipModalOpen(true)}
                className="flex-1 md:flex-none h-11 px-5 rounded-xl bg-superior-teal hover:bg-superior-teal/90 text-white font-bold gap-2 shadow-lg text-xs"
              >
                <FileText size={16} />
                <span>Download Salary Slip</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap h-auto gap-1">
            <TabsTrigger
              value="timetable"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-superior-teal data-[state=active]:text-white transition-all gap-1.5"
            >
              <Clock size={15} />
              <span>My Lectures ({totalWeeklyLectures})</span>
            </TabsTrigger>
            <TabsTrigger
              value="payroll"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-superior-teal data-[state=active]:text-white transition-all gap-1.5"
            >
              <CreditCard size={15} />
              <span>Salary & Payslips</span>
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-superior-teal data-[state=active]:text-white transition-all gap-1.5"
            >
              <Calendar size={15} />
              <span>My Attendance</span>
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-superior-teal data-[state=active]:text-white transition-all gap-1.5"
            >
              <User size={15} />
              <span>Profile & Subjects</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: TIMETABLE */}
          <TabsContent value="timetable" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6 text-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Total Weekly Lectures</span>
                <p className="text-3xl font-black text-slate-900 mt-1">{totalWeeklyLectures}</p>
              </Card>
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6 text-center">
                <span className="text-xs font-bold text-teal-700 uppercase">Regular Lectures</span>
                <p className="text-3xl font-black text-superior-teal mt-1">{regularWeeklyLectures}</p>
              </Card>
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6 text-center">
                <span className="text-xs font-bold text-amber-700 uppercase">Extra Lectures</span>
                <p className="text-3xl font-black text-amber-600 mt-1">{extraWeeklyLectures}</p>
              </Card>
            </div>

            <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6">
              <CardTitle className="text-lg font-black text-slate-800 mb-6">
                Assigned Weekly Class Schedule
              </CardTitle>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {DAYS_OF_WEEK.map(day => {
                  const dayLectures = myTimetable.filter(t => (t.day || '').toLowerCase() === day.toLowerCase());
                  return (
                    <div key={day} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-black text-slate-800 text-sm">{day}</span>
                        <Badge variant="outline" className="text-[10px] border-slate-300 font-bold">
                          {dayLectures.length} Classes
                        </Badge>
                      </div>

                      {dayLectures.length > 0 ? (
                        <div className="space-y-2.5">
                          {dayLectures.map((lec, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-sm">{lec.subject}</span>
                                <span className="font-mono font-bold text-superior-teal text-xs">
                                  {lec.startTime} - {lec.endTime}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>Section: <strong className="text-slate-700">{lec.section}</strong></span>
                                <Badge className={
                                  lec.classRoom === 'Extra' 
                                    ? 'bg-amber-100 text-amber-800 text-[10px] border-0' 
                                    : 'bg-teal-50 text-teal-800 text-[10px] border-0'
                                }>
                                  {lec.classRoom || 'Regular'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-4 text-center">
                          No classes scheduled
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* TAB 2: PAYROLL */}
          <TabsContent value="payroll" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6">
                <span className="text-xs font-bold text-slate-400 uppercase">Gross Base Salary</span>
                <p className="text-2xl font-black text-slate-900 mt-1">RS {baseSalary.toLocaleString()}</p>
                <p className="text-[11px] text-slate-400 mt-1">Monthly package</p>
              </Card>

              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6">
                <span className="text-xs font-bold text-amber-800 uppercase">Advance Loan Balance</span>
                <p className="text-2xl font-black text-amber-600 mt-1">RS {totalRemainingAdvance.toLocaleString()}</p>
                <p className="text-[11px] text-slate-400 mt-1">Borrowed: RS {totalInitialAdvance.toLocaleString()}</p>
              </Card>

              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-superior-teal uppercase">Official Payslip</span>
                  <p className="text-xs text-slate-500 mt-1">Generate verified salary disbursement slip</p>
                </div>
                <Button
                  onClick={() => setIsPayslipModalOpen(true)}
                  className="w-full mt-3 bg-superior-teal hover:bg-superior-teal/90 text-white font-bold rounded-xl h-10 gap-2"
                >
                  <Download size={15} />
                  <span>View Official Payslip</span>
                </Button>
              </Card>
            </div>

            {/* Advances History if any */}
            {staffAdvances.length > 0 && (
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6">
                <CardTitle className="text-base font-black text-slate-800 mb-4">
                  Salary Advance Loans & Recovery Log
                </CardTitle>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700">Date Issued</TableHead>
                        <TableHead className="font-bold text-slate-700">Original Amount</TableHead>
                        <TableHead className="font-bold text-slate-700">Duration (Months)</TableHead>
                        <TableHead className="font-bold text-slate-700">Remaining Balance</TableHead>
                        <TableHead className="font-bold text-slate-700">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffAdvances.map((adv, idx) => (
                        <TableRow key={adv.id || idx}>
                          <TableCell className="font-mono text-xs text-slate-600">
                            {adv.date ? new Date(adv.date).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="font-bold text-slate-800">
                            RS {Number(adv.amount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium">
                            {adv.monthsCount || 1} months
                          </TableCell>
                          <TableCell className="font-bold text-amber-600">
                            RS {Number(adv.remainingBalance || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {adv.notes || 'Emergency Loan'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB 3: ATTENDANCE */}
          <TabsContent value="attendance" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6 text-center">
                <span className="text-xs font-bold text-emerald-800 uppercase">Present Days</span>
                <p className="text-3xl font-black text-emerald-900 mt-1">{presentDays} Days</p>
              </Card>
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6 text-center">
                <span className="text-xs font-bold text-rose-800 uppercase">Absent Days</span>
                <p className="text-3xl font-black text-rose-900 mt-1">{absentDays} Days</p>
              </Card>
              <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6 text-center">
                <span className="text-xs font-bold text-amber-800 uppercase">Leaves Approved</span>
                <p className="text-3xl font-black text-amber-900 mt-1">{leavesDays} Days</p>
              </Card>
            </div>

            <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6">
              <CardTitle className="text-lg font-black text-slate-800 mb-4">
                Daily Attendance & Check-in Log ({currentMonth})
              </CardTitle>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700">Date</TableHead>
                      <TableHead className="font-bold text-slate-700">Check In</TableHead>
                      <TableHead className="font-bold text-slate-700">Check Out</TableHead>
                      <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myAttendance.length > 0 ? (
                      myAttendance.map((rec, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs font-bold text-slate-700">
                            {rec.date}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">
                            {rec.checkIn || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">
                            {rec.checkOut || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={
                              rec.status === 'Present' ? 'bg-emerald-100 text-emerald-800 border-0' :
                              rec.status === 'Late' ? 'bg-amber-100 text-amber-800 border-0' : 'bg-rose-100 text-rose-800 border-0'
                            }>
                              {rec.status || 'Present'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-400 font-medium">
                          No daily biometric attendance records logged for this month yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 4: PROFILE */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-white border-none shadow-md shadow-slate-200/50 rounded-3xl p-6 space-y-6">
              <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                <User size={20} className="text-superior-teal" /> Faculty Profile & Assigned Subjects
              </CardTitle>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Staff ID</span>
                  <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">{staff.id}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Official Designation</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{staff.role}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">CNIC / ID Card</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{staff.cnic || 'N/A'}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Contact Number</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{staff.contact || 'N/A'}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Date of Joining</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{staff.joinDate || 'Official Staff'}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Highest Qualification</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{staff.qualification || 'M.Phil / Master'}</span>
                </div>
              </div>

              {/* Assigned Subjects */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-black text-sm text-slate-800 mb-3">Teaching Subjects & Specialization</h4>
                <div className="flex flex-wrap gap-2">
                  {(staff.subjects || []).length > 0 ? (
                    staff.subjects?.map((sub, idx) => (
                      <Badge key={idx} className="bg-teal-50 text-superior-teal border border-teal-200 font-bold px-3 py-1 text-xs">
                        {sub}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No specific subjects mapped in profile</span>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Official Staff Salary Slip Modal */}
      <StaffSalarySlipModal
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
        staff={staff}
        month={currentMonth}
        baseSalary={baseSalary}
        extraAllowance={extraAllowance}
        extraLecturesCount={extraWeeklyLectures}
        extraLectureRate={0}
        leavesTaken={leavesDays}
        leaveDeduction={0}
        lateMinutes={0}
        lateDeduction={0}
        advanceDeduction={0}
        netSalary={baseSalary}
        totalRemainingAdvance={totalRemainingAdvance}
        totalLecturesCount={totalWeeklyLectures}
        regularLecturesCount={regularWeeklyLectures}
        settings={settings}
      />
    </div>
  );
}
