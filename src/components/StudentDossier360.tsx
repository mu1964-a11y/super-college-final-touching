import React, { useState } from 'react';
import { 
  X, User, Phone, MapPin, Calendar, CreditCard, Award, 
  GraduationCap, CheckCircle2, AlertCircle, Download, 
  MessageSquare, Send, ExternalLink, ShieldCheck, FileText,
  DollarSign, Clock, ArrowUpRight, Building2
} from 'lucide-react';
import BankChallanModal from './BankChallanModal';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getUnifiedTransactions } from '../utils/fee';
import { toast } from 'sonner';

interface StudentDossier360Props {
  student: any | null;
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onOpenWhatsApp?: (phone: string) => void;
}

export default function StudentDossier360({
  student,
  isOpen,
  onClose,
  data,
  onOpenWhatsApp,
}: StudentDossier360Props) {
  const [activeTab, setActiveTab] = useState<'profile' | 'financials' | 'academic' | 'whatsapp'>('profile');
  const [isChallanOpen, setIsChallanOpen] = useState(false);

  if (!isOpen || !student) return null;

  // Calculate financial statistics
  const totalPackage = Number(student.totalPackage || student.feeLedger?.totalPackage || 0);
  const totalReceived = Number(student.feeReceived || student.feeLedger?.totalReceived || 0);
  const remainingBalance = Number(
    student.feeLedger?.remainingBalance ?? (totalPackage - totalReceived)
  );
  const paymentRatio = totalPackage > 0 ? Math.min(100, Math.round((totalReceived / totalPackage) * 100)) : 0;

  // Attendance metrics
  const presentDays = Number(student.attendance?.present || 0);
  const absentDays = Number(student.attendance?.absent || 0);
  const totalAttendanceDays = presentDays + absentDays;
  const attendancePercentage = totalAttendanceDays > 0 ? Math.round((presentDays / totalAttendanceDays) * 100) : 100;

  // Academic results lookup
  const academicRecords = (data?.academicRecords || []).filter(
    (r: any) => String(r.studentId) === String(student.id) || String(r.rollNo) === String(student.collegeNo || student.id)
  );

  // Unified Fee Transactions
  const feeTransactions = getUnifiedTransactions(student);

  // Quick WhatsApp message sender
  const handleQuickWhatsAppNotice = async (type: 'fee' | 'results' | 'general') => {
    const rawPhone = student.contact || student.fatherContact || student.phone;
    if (!rawPhone) {
      toast.error('No contact number available for this student.');
      return;
    }

    const cleanPhone = rawPhone.replace(/\D/g, '');
    let text = '';

    if (type === 'fee') {
      text = `Assalam-o-Alaikum Mohtaram ${student.fatherName || 'Walid'}! Superior College Jahanian se itlaa: Aapke bache ${student.fullName} (Class: ${student.group || student.category || 'N/A'}, Roll No: ${student.collegeNo || student.id}) ki baqaya fees Rs. ${remainingBalance.toLocaleString()} wajib-ul-ada hai. Baraye meherbani accounts office mein jama karwayen. Shukriya!`;
    } else if (type === 'results') {
      const marksList = academicRecords.map((r: any) => `${r.subject || r.testName}: ${r.obtainedMarks}/${r.totalMarks}`).join(', ') || 'Records in process';
      text = `Assalam-o-Alaikum Mohtaram ${student.fatherName || 'Walid'}! Superior College Jahanian se ${student.fullName} ki test report:\n${marksList}\nFeedback ya rehnumai k lye campus office tashreef layen.`;
    } else {
      text = `Assalam-o-Alaikum Mohtaram ${student.fatherName || 'Walid'}! Superior College Jahanian updates regarding ${student.fullName} (Roll No: ${student.collegeNo || student.id}).`;
    }

    try {
      toast.loading('Sending official WhatsApp notice...', { id: 'wa-send' });
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, message: text }),
      });

      if (res.ok) {
        toast.success(`WhatsApp notice dispatched to +${cleanPhone}!`, { id: 'wa-send' });
      } else {
        const err = await res.json();
        toast.error(err.error || 'WhatsApp gateway offline. Opening web client.', { id: 'wa-send' });
        window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
      }
    } catch {
      window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
      toast.dismiss('wa-send');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden relative"
        >
          {/* Top Header Banner with Emerald & Gold Accents */}
          <div className="bg-gradient-to-r from-[#03241e] via-[#053229] to-[#011410] text-white p-5 sm:p-6 relative shrink-0">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              {/* Photo Avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 border-2 border-superior-gold/40 p-1 flex-shrink-0 shadow-lg relative overflow-hidden flex items-center justify-center">
                {student.photo ? (
                  <img
                    src={student.photo}
                    alt={student.fullName}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <User size={42} className="text-superior-gold/80" />
                )}
                <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#053229]" />
              </div>

              {/* Student Identification & Tags */}
              <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <Badge className="bg-superior-gold/20 text-superior-gold border border-superior-gold/30 text-[10px] font-black uppercase tracking-wider">
                    Roll: {student.collegeNo || student.id}
                  </Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    {student.gender === 'Female' ? 'Girls Campus' : 'Boys Campus'}
                  </Badge>
                  {student.session && (
                    <Badge variant="outline" className="text-white/60 border-white/20 text-[10px]">
                      Session {student.session}
                    </Badge>
                  )}
                  {remainingBalance > 0 ? (
                    <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                      Dues: Rs. {remainingBalance.toLocaleString()}
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      Fee Cleared
                    </Badge>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                  {student.fullName}
                </h2>

                <p className="text-xs text-white/70 font-medium truncate">
                  Father: <b className="text-white">{student.fatherName || 'N/A'}</b> • Program: <b className="text-superior-gold">{student.group || student.category || 'F.Sc'}</b> {student.section ? `(Sec ${student.section})` : ''}
                </p>
              </div>

              {/* Action Buttons in Header */}
              <div className="hidden sm:flex flex-col gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleQuickWhatsAppNotice('fee')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-9 shadow-md flex items-center gap-1.5"
                >
                  <MessageSquare size={14} /> Send Fee Alert
                </Button>
                {onOpenWhatsApp && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      onOpenWhatsApp(student.contact || student.fatherContact);
                    }}
                    className="border-white/20 text-white/90 hover:bg-white/10 text-xs rounded-xl h-9"
                  >
                    <ExternalLink size={14} className="mr-1" /> Open Live Chat
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-6 shrink-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="h-12 bg-transparent gap-2 p-0">
                <TabsTrigger
                  value="profile"
                  className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 font-bold text-xs"
                >
                  <User size={14} className="mr-1.5" /> Bio & Identity
                </TabsTrigger>
                <TabsTrigger
                  value="financials"
                  className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 font-bold text-xs"
                >
                  <CreditCard size={14} className="mr-1.5" /> Financial Ledger ({feeTransactions.length})
                </TabsTrigger>
                <TabsTrigger
                  value="academic"
                  className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 font-bold text-xs"
                >
                  <Award size={14} className="mr-1.5" /> Academic Results ({academicRecords.length})
                </TabsTrigger>
                <TabsTrigger
                  value="whatsapp"
                  className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 font-bold text-xs"
                >
                  <MessageSquare size={14} className="mr-1.5" /> Direct WhatsApp
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* TAB 1: BIO & IDENTITY */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Group & Program</span>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{student.group || student.category || 'F.Sc'}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Section</span>
                    <p className="text-sm font-black text-teal-700 dark:text-teal-400 mt-0.5">Section {student.section || 'A'}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Attendance Ratio</span>
                    <p className="text-sm font-black text-emerald-600 mt-0.5">{attendancePercentage}% ({presentDays}/{totalAttendanceDays || presentDays} Days)</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Current Status</span>
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-0.5">ACTIVE ENROLLED</p>
                  </div>
                </div>

                {/* Details Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Personal Details */}
                  <div className="bg-white dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <User size={13} className="text-teal-600" /> Student Profile Details
                    </h4>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs space-y-2">
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Full Legal Name</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{student.fullName}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Father / Guardian</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{student.fatherName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">CNIC / B-Form</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{student.cnic || student.bForm || 'Not Registered'}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Gender / Campus</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{student.gender || 'Male'}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Address</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-right truncate max-w-[200px]">{student.address || 'Jahanian Campus Vicinity'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Guardian & Contact Details */}
                  <div className="bg-white dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Phone size={13} className="text-emerald-600" /> Contact & Connectivity
                    </h4>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs space-y-2">
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Primary Phone</span>
                        <span className="font-mono font-bold text-emerald-600">{student.contact || student.phone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Father WhatsApp</span>
                        <span className="font-mono font-bold text-emerald-600">{student.fatherContact || student.contact || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Academic Part</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{student.academicPart || 'Part-1'}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Admission Reference</span>
                        <span className="font-mono font-bold text-slate-600">{student.admissionId || student.id}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleQuickWhatsAppNotice('general')}
                        className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold rounded-xl h-9"
                      >
                        <MessageSquare size={13} className="mr-1.5" /> Send General WhatsApp Ping
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FINANCIALS & LEDGER */}
            {activeTab === 'financials' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">Total Finalized Fee</span>
                    <p className="text-2xl font-black text-teal-900 dark:text-teal-100 mt-1">Rs. {totalPackage.toLocaleString()}</p>
                    <p className="text-[11px] text-teal-600 mt-0.5">Approved admission package</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Fee Paid</span>
                    <p className="text-2xl font-black text-emerald-800 dark:text-emerald-100 mt-1">Rs. {totalReceived.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={paymentRatio} className="h-2 flex-1" />
                      <span className="text-[10px] font-bold text-emerald-700">{paymentRatio}%</span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border ${
                    remainingBalance > 0 
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}>
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">Remaining Balance Dues</span>
                    <p className="text-2xl font-black text-rose-800 dark:text-rose-200 mt-1">Rs. {remainingBalance.toLocaleString()}</p>
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      {remainingBalance > 0 ? 'Pending student arrears' : 'No dues pending'}
                    </p>
                  </div>
                </div>

                {/* Transaction History Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Payment History & Receipt Vouchers ({feeTransactions.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsChallanOpen(true)}
                        className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 text-xs font-bold rounded-xl h-8 shadow-xs flex items-center gap-1.5"
                      >
                        <Building2 size={12} /> 3-Copy Bank Challan
                      </Button>
                      {remainingBalance > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handleQuickWhatsAppNotice('fee')}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl h-8 shadow-sm flex items-center gap-1.5"
                        >
                          <Send size={12} /> Send WhatsApp Due Notice
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Receipt / Month</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Amount Paid</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Payment Date</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Payment Mode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feeTransactions.length > 0 ? (
                          feeTransactions.map((tx: any, idx: number) => (
                            <TableRow key={tx.id || idx}>
                              <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                {tx.description || tx.month || `Voucher #${tx.receiptId || idx + 1}`}
                              </TableCell>
                              <TableCell className="text-right font-black text-emerald-600 text-xs">
                                Rs. {(tx.amount || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-slate-500">
                                {tx.date ? new Date(tx.date).toLocaleDateString() : 'Recorded'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[9px] font-bold uppercase">
                                  {tx.paymentMethod || 'Cash Payment'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-28 text-center text-slate-400 italic text-xs">
                              No payment vouchers recorded yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ACADEMIC RESULTS */}
            {activeTab === 'academic' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Preparatory Tests & Examination Register
                    </h4>
                    <p className="text-[11px] text-slate-400">Official academic performance records for {student.fullName}</p>
                  </div>
                  {academicRecords.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleQuickWhatsAppNotice('results')}
                      className="bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl h-8 flex items-center gap-1.5"
                    >
                      <Send size={12} /> Share Score Card via WhatsApp
                    </Button>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase">Test Name & Type</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Subject</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center">Score / Marks</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Percentage</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Teacher</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {academicRecords.length > 0 ? (
                        academicRecords.map((rec: any, idx: number) => {
                          const percentage = rec.totalMarks > 0 ? Math.round((rec.obtainedMarks / rec.totalMarks) * 100) : 0;
                          return (
                            <TableRow key={rec.id || idx}>
                              <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                {rec.testName}
                                <span className="block text-[10px] text-slate-400 font-normal uppercase">{rec.testType || 'Quiz/Exam'}</span>
                              </TableCell>
                              <TableCell className="text-xs font-bold text-teal-700 dark:text-teal-400">
                                {rec.subject}
                              </TableCell>
                              <TableCell className="text-center font-mono font-black text-xs text-slate-800 dark:text-slate-100">
                                {rec.obtainedMarks} / {rec.totalMarks}
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-[10px] font-black ${
                                  percentage >= 75 ? 'bg-emerald-100 text-emerald-800' :
                                  percentage >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {percentage}% {percentage >= 50 ? 'PASS' : 'FAIL'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">
                                {rec.teacherName || 'Faculty Cell'}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic text-xs">
                            No examination records found for this student.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* TAB 4: DIRECT WHATSAPP ACTION SUITE */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck size={14} /> One-Click WhatsApp Notification Center
                  </h4>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-400">
                    Send automated, branded college notifications directly to the parent's phone without typing manually.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fee Reminder Card */}
                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800/40 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                        <CreditCard size={16} />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-800 dark:text-slate-100">Fee Arrears Notice</h5>
                        <p className="text-[10px] text-slate-400">Pending Dues: Rs. {remainingBalance.toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl font-mono leading-relaxed">
                      "Mohtaram Walid! {student.fullName} ki baqaya fees Rs. {remainingBalance.toLocaleString()} jama karwayen..."
                    </p>
                    <Button
                      onClick={() => handleQuickWhatsAppNotice('fee')}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl h-9 shadow-sm"
                    >
                      <Send size={13} className="mr-1.5" /> Dispatch Fee Reminder
                    </Button>
                  </div>

                  {/* Academic Results Notice Card */}
                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800/40 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                        <Award size={16} />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-800 dark:text-slate-100">Academic Score Card</h5>
                        <p className="text-[10px] text-slate-400">Total Tests Logged: {academicRecords.length}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl font-mono leading-relaxed">
                      "Mohtaram Walid! {student.fullName} ki latest test performance report..."
                    </p>
                    <Button
                      onClick={() => handleQuickWhatsAppNotice('results')}
                      className="w-full bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl h-9 shadow-sm"
                    >
                      <Send size={13} className="mr-1.5" /> Dispatch Score Card
                    </Button>
                  </div>
                </div>

                {/* Open in WhatsApp Center */}
                {onOpenWhatsApp && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenWhatsApp(student.contact || student.fatherContact);
                      }}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Go to WhatsApp Web 2-Pane Messenger to chat in real-time</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span>Campus: <b className="text-slate-700 dark:text-slate-300">{student.gender === 'Female' ? 'Girls' : 'Boys'}</b></span>
              <span>•</span>
              <span>Enrollment ID: <b className="font-mono text-slate-700 dark:text-slate-300">{student.id}</b></span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl font-bold text-xs"
            >
              Close Dossier
            </Button>
          </div>

        </motion.div>
      </div>

      {/* 3-Copy Bank Challan Modal */}
      {isChallanOpen && (
        <BankChallanModal
          isOpen={isChallanOpen}
          onClose={() => setIsChallanOpen(false)}
          students={[student]}
          settings={data?.settings}
        />
      )}
    </AnimatePresence>
  );
}
