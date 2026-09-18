
import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, 
  CalendarDays, 
  Search, 
  Save, 
  Download, 
  FileText, 
  RefreshCw, 
  MessageSquare,
  AlertCircle,
  CheckCheck,
  Loader2,
  Bot,
  RotateCw,
  Send,
  Users
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import WhatsAppReportModal, { ReportRecipientItem } from './WhatsAppReportModal';
import { 
  sendAutoDailyAttendanceNotice, 
  sendAutoDailyAttendanceNoticeDetailed,
  sendAutoPeriodicAttendanceReport, 
  buildDailyAttendanceMessage, 
  buildPeriodicAttendanceMessage 
} from '../lib/whatsappAutomation';

export type StudentAttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave' | 'Holiday' | '';

export interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: StudentAttendanceStatus;
  notes: string;
}

export interface AttendanceWhatsAppStatus {
  status: 'sending' | 'sent' | 'failed';
  timestamp: number;
  phone?: string;
  error?: string;
}

const WA_STORAGE_PREFIX = 'scj_att_wa_status_';
const WA_STATUS_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

function getStoredWaStatuses(date: string): Record<string, AttendanceWhatsAppStatus> {
  try {
    const raw = localStorage.getItem(`${WA_STORAGE_PREFIX}${date}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const valid: Record<string, AttendanceWhatsAppStatus> = {};
    Object.entries(parsed).forEach(([id, val]: [string, any]) => {
      if (val && val.timestamp && (now - val.timestamp < WA_STATUS_EXPIRY_MS)) {
        valid[id] = val;
      }
    });
    return valid;
  } catch {
    return {};
  }
}

function storeWaStatuses(date: string, statuses: Record<string, AttendanceWhatsAppStatus>) {
  try {
    localStorage.setItem(`${WA_STORAGE_PREFIX}${date}`, JSON.stringify(statuses));
  } catch (e) {
    console.warn("Storage error:", e);
  }
}

export default function AttendanceView({ data }: { data: any }) {
  const [activeTab, setActiveTab] = useState<'daily' | 'report'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  
  // WhatsApp Broadcast Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkModalProps, setBulkModalProps] = useState<{
    category: 'daily_attendance' | 'monthly_attendance';
    title: string;
    subtitle?: string;
    items: ReportRecipientItem[];
  } | null>(null);

  const records = useMemo(() => {
    return data?.studentAttendance || [];
  }, [data?.studentAttendance]);

  const students = useMemo(() => {
    const raw: any[] = [...(data?.students || [])];
    data?.admissions?.forEach((a: any) => {
      const isConfirmed = a.isAdmitted === true || 
                          a.status === "Admitted/Confirmed" || 
                          a.status === "Admitted" || 
                          a.status === "Confirmed" || 
                          a.status === "Full Paid" || 
                          a.status === "Partial Paid" || 
                          Number(a.feeReceived) > 0;
      if (isConfirmed) {
        if (!raw.some((s: any) => s.admissionId === a.id || s.id === (a.studentId || a.id))) {
          raw.push({
            id: a.studentId || a.id,
            admissionId: a.id,
            studentId: a.studentId,
            fullName: a.fullName,
            fatherName: a.fatherName,
            contact: a.contactNumber || a.phone || '',
            fatherContact: a.fatherContact || a.contactNumber || '',
            section: a.section,
            currentClass: a.category,
            groupName: a.group,
            gender: a.gender,
            photo: a.photo || a.photoUrl || a.photo_url || a.studentPhoto || a.student_photo
          });
        }
      }
    });
    return raw;
  }, [data?.students, data?.admissions]);

  const sectionOptions = React.useMemo(() => {
    let sections = data?.settings?.predefinedSections || [];
    if (classFilter && classFilter !== 'all') {
      if (classFilter.toLowerCase().includes('boys')) {
        sections = sections.filter((s: any) => s.gender === 'Male');
      } else if (classFilter.toLowerCase().includes('girls')) {
        sections = sections.filter((s: any) => s.gender === 'Female');
      }
    }
    return Array.from(new Set(sections.map((s: any) => s.name).filter(Boolean))) as string[];
  }, [data?.settings?.predefinedSections, classFilter]);

  const classOptions = [
    "Inter Part-1 Boys", "Inter Part-2 Boys", "Inter Part-1 Girls", "Inter Part-2 Girls", 
    "DIT Boys", "DIT Girls", "UK L3 Boys", "UK L3 Girls", "BS Boys", "BS Girls"
  ];

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      const matchName = (s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
             (s.studentId || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchSection = sectionFilter === 'all' || s.section === sectionFilter;
      const matchClass = classFilter === 'all' || s.category === classFilter || s.currentClass === classFilter || s.groupName === classFilter;
      return matchName && matchSection && matchClass;
    });
  }, [students, searchTerm, sectionFilter, classFilter]);

  // Real-time WhatsApp Bot Status for Attendance (Cached for 30 minutes)
  const [waStatuses, setWaStatuses] = useState<Record<string, AttendanceWhatsAppStatus>>(() => getStoredWaStatuses(selectedDate));
  const [autoWhatsAppEnabled, setAutoWhatsAppEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('scj_auto_whatsapp_attendance');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('scj_auto_whatsapp_attendance', JSON.stringify(autoWhatsAppEnabled));
    } catch {}
  }, [autoWhatsAppEnabled]);

  useEffect(() => {
    setWaStatuses(getStoredWaStatuses(selectedDate));
  }, [selectedDate]);

  // Periodic cleanup of expired entries (>30 mins)
  useEffect(() => {
    const interval = setInterval(() => {
      setWaStatuses(prev => {
        const now = Date.now();
        let changed = false;
        const next = { ...prev };
        Object.entries(next).forEach(([id, val]) => {
          if (val && val.timestamp && (now - val.timestamp >= WA_STATUS_EXPIRY_MS)) {
            delete next[id];
            changed = true;
          }
        });
        if (changed) {
          storeWaStatuses(selectedDate, next);
          return next;
        }
        return prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  // Daily entries state
  const [dailyEntries, setDailyEntries] = useState<Record<string, Partial<StudentAttendanceRecord>>>({});

  useEffect(() => {
    // Only re-initialize dailyEntries if selectedDate changes, not when filters change.
    // We use all students to persist data even when filtered out.
    const existingForDate = records.filter(r => r.date === selectedDate);
    
    setDailyEntries(prev => {
      const newEntries = { ...prev };
      let initializedCount = 0;
      
      students.forEach((student: any) => {
        if (!newEntries[student.id] || newEntries[student.id].date !== selectedDate) {
          const existing = existingForDate.find(r => r.studentId === student.id);
          if (existing) {
            newEntries[student.id] = { ...existing };
          } else {
            newEntries[student.id] = {
              studentId: student.id,
              date: selectedDate,
              status: 'Present',
              notes: ''
            };
          }
          initializedCount++;
        }
      });
      
      return initializedCount > 0 ? newEntries : prev;
    });
  }, [selectedDate, students, records]);

  const markAllFiltered = (status: StudentAttendanceStatus) => {
    setDailyEntries(prev => {
      const updated = { ...prev };
      filteredStudents.forEach((student: any) => {
        if (updated[student.id]) {
          updated[student.id] = { ...updated[student.id], status };
        }
      });
      return updated;
    });
    toast.success(`Marked all ${filteredStudents.length} filtered students as ${status}`);
  };

  const handleEntryChange = (studentId: string, field: keyof StudentAttendanceRecord, value: string) => {
    setDailyEntries(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const getMonthlyStats = (studentId: string, targetMonth?: string) => {
    const m = targetMonth || (activeTab === 'report' ? reportMonth : selectedDate.slice(0, 7));
    const monthRecords = records.filter((r: any) => r.studentId === studentId && r.date && r.date.startsWith(m));
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      holiday: 0,
      totalWorkingDays: 0
    };

    monthRecords.forEach((r: any) => {
      if (['Present', 'Late'].includes(r.status)) stats.totalWorkingDays++;
      
      switch(r.status) {
        case 'Present': stats.present++; break;
        case 'Absent': stats.absent++; break;
        case 'Late': stats.late++; break;
        case 'Leave': stats.leave++; break;
        case 'Holiday': stats.holiday++; break;
      }
    });

    return stats;
  };

  const dispatchStudentAttendanceWhatsApp = async (
    student: any,
    targetStatus?: StudentAttendanceStatus,
    targetNotes?: string,
    isManualRetry = false
  ) => {
    if (!student) return false;

    const currentEntry = dailyEntries[student.id];
    const status = targetStatus || currentEntry?.status || 'Present';
    const notes = targetNotes !== undefined ? targetNotes : (currentEntry?.notes || '');

    // Set status to sending in UI
    setWaStatuses(prev => {
      const next = {
        ...prev,
        [student.id]: {
          status: 'sending' as const,
          timestamp: Date.now()
        }
      };
      storeWaStatuses(selectedDate, next);
      return next;
    });

    // Compute month stats for selectedDate's month
    const targetMonth = selectedDate.slice(0, 7);
    const stats = getMonthlyStats(student.id, targetMonth);
    const existingForToday = records.find((r: any) => r.studentId === student.id && r.date === selectedDate);
    const todayWasAlreadyAbsent = existingForToday?.status === 'Absent';
    const totalAbsentsThisMonth = stats.absent + (status === 'Absent' && !todayWasAlreadyAbsent ? 1 : 0);
    const todayWasAlreadyLeave = existingForToday?.status === 'Leave';
    const totalLeavesThisMonth = stats.leave + (status === 'Leave' && !todayWasAlreadyLeave ? 1 : 0);
    const todayWasAlreadyPresent = existingForToday?.status === 'Present';
    const totalPresentsThisMonth = stats.present + (status === 'Present' && !todayWasAlreadyPresent ? 1 : 0);

    const monthDate = new Date(`${selectedDate}T00:00:00`);
    const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const result = await sendAutoDailyAttendanceNoticeDetailed(
      student,
      {
        date: selectedDate,
        status,
        notes,
        monthlyAbsents: totalAbsentsThisMonth,
        monthlyLeaves: totalLeavesThisMonth,
        monthlyPresents: totalPresentsThisMonth,
        monthName: monthLabel
      },
      data?.settings,
      { silent: !isManualRetry, manualTrigger: isManualRetry }
    );

    setWaStatuses(prev => {
      const next = {
        ...prev,
        [student.id]: {
          status: result.success ? ('sent' as const) : ('failed' as const),
          timestamp: Date.now(),
          phone: result.phone,
          error: result.error
        }
      };
      storeWaStatuses(selectedDate, next);
      return next;
    });

    return result.success;
  };

  const handleStatusChange = (student: any, status: StudentAttendanceStatus) => {
    handleEntryChange(student.id, 'status', status);

    // If auto-WhatsApp is enabled and status is Absent or Leave:
    if (autoWhatsAppEnabled && (status === 'Absent' || status === 'Leave')) {
      dispatchStudentAttendanceWhatsApp(student, status, dailyEntries[student.id]?.notes);
    }
  };

  const handleResendAllFailed = async () => {
    const failedStudents = filteredStudents.filter((s: any) => waStatuses[s.id]?.status === 'failed');
    if (failedStudents.length === 0) {
      toast.info('No failed WhatsApp notices to resend.');
      return;
    }

    setIsRetryingFailed(true);
    toast.loading(`Resending WhatsApp notices to ${failedStudents.length} students...`, { id: 'retry-failed-wa' });

    let count = 0;
    for (const student of failedStudents) {
      const entry = dailyEntries[student.id];
      const ok = await dispatchStudentAttendanceWhatsApp(student, entry?.status, entry?.notes, false);
      if (ok) count++;
      await new Promise(r => setTimeout(r, 600));
    }

    setIsRetryingFailed(false);
    toast.success(`Resent ${count} of ${failedStudents.length} notices!`, { id: 'retry-failed-wa' });
  };

  const handleSaveDaily = async () => {
    const payloads: Omit<StudentAttendanceRecord, "id">[] = [];
    
    Object.values(dailyEntries).forEach(entry => {
      if (entry.status && entry.studentId) { 
        payloads.push({
          studentId: entry.studentId,
          date: entry.date!,
          status: entry.status as StudentAttendanceStatus,
          notes: entry.notes || ''
        });
      }
    });

    if (payloads.length === 0) {
      toast.error('No attendance data to save for this date.');
      return;
    }

    const success = await data.saveStudentAttendanceLogs(payloads);
    if (success) {
      toast.success(`Attendance saved successfully for ${selectedDate}`);

      // Auto-dispatch to unsent Absentees / Leaves if enabled
      if (autoWhatsAppEnabled) {
        const unsent = filteredStudents.filter((s: any) => {
          const entry = dailyEntries[s.id];
          const isAbsOrLeave = entry?.status === 'Absent' || entry?.status === 'Leave';
          const alreadySent = waStatuses[s.id]?.status === 'sent';
          return isAbsOrLeave && !alreadySent;
        });

        if (unsent.length > 0) {
          toast.info(`Auto-dispatching WhatsApp notices to ${unsent.length} unsent absentees/leaves...`, { id: 'auto-save-wa' });
          (async () => {
            for (const s of unsent) {
              const entry = dailyEntries[s.id];
              await dispatchStudentAttendanceWhatsApp(s, entry?.status, entry?.notes);
              await new Promise(r => setTimeout(r, 600));
            }
          })();
        }
      }
    } else {
      toast.error('Failed to save attendance. Ensure all students are fully converted to the Students table.');
    }
  };

  const { presentsCount, absentsCount, leavesCount, sentCount, failedCount } = useMemo(() => {
    let p = 0;
    let a = 0;
    let l = 0;
    let sent = 0;
    let fail = 0;

    filteredStudents.forEach((student: any) => {
      const status = dailyEntries[student.id]?.status;
      if (status === 'Present') p++;
      else if (status === 'Absent') a++;
      else if (status === 'Leave') l++;

      const wa = waStatuses[student.id];
      if (wa?.status === 'sent') sent++;
      else if (wa?.status === 'failed') fail++;
    });

    return {
      presentsCount: p,
      absentsCount: a,
      leavesCount: l,
      sentCount: sent,
      failedCount: fail
    };
  }, [filteredStudents, dailyEntries, waStatuses]);

  const downloadSectionPDF = () => {
    if (sectionFilter === 'all') {
      toast.error('Please select a specific section to download the section report.');
      return;
    }
    const doc = new jsPDF();
    const title = `${data?.settings?.collegeName || 'College'}\nAttendance Report - Section: ${sectionFilter}\nMonth: ${reportMonth}`;
    
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    
    const tableData = filteredStudents.map(student => {
      const stats = getMonthlyStats(student.id);
      return [
        student.studentId || '-',
        student.fullName,
        stats.present.toString(),
        stats.absent.toString(),
        stats.late.toString(),
        stats.leave.toString(),
        stats.holiday.toString()
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Name', 'Present', 'Absent', 'Late', 'Leave', 'Holiday']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87] } // Superior Teal
    });

    doc.save(`Attendance_${sectionFilter}_${reportMonth}.pdf`);
  };

  const downloadIndividualPDF = (student: any) => {
    const doc = new jsPDF();
    import('../lib/pdfHelpers').then(({ addStandardLetterhead }) => {
      addStandardLetterhead(doc, `Individual Attendance Report - ${reportMonth}`);
      
      doc.setFontSize(11);
      doc.text(`Student Name: ${student.fullName}`, 14, 65);
      doc.text(`Student ID: ${student.studentId || 'N/A'}`, 14, 71);
      doc.text(`Section: ${student.section || 'N/A'}`, 14, 77);

      const monthRecords = records
        .filter(r => r.studentId === student.id && r.date.startsWith(reportMonth))
        .sort((a, b) => a.date.localeCompare(b.date));

      const tableData = monthRecords.map(r => [
        r.date,
        r.status,
        r.notes || '-'
      ]);

      autoTable(doc, {
        startY: 85,
        head: [['Date', 'Status', 'Notes']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [4, 120, 87] }
      });

      const stats = getMonthlyStats(student.id);
      const finalY = (doc as any).lastAutoTable.finalY || 85;
      doc.text(`Summary: Present: ${stats.present}, Absent: ${stats.absent}, Late: ${stats.late}, Leave: ${stats.leave}, Holiday: ${stats.holiday}`, 14, finalY + 10);

      doc.save(`Attendance_${student.fullName.replace(/\s+/g, '_')}_${reportMonth}.pdf`);
    });
  };

  const getStudentPhone = (student: any) => {
    return student.fatherContact || student.contact || student.contactNumber || student.phone || student.mobile || '';
  };

  const handleSendSingleDailyWhatsApp = async (student: any) => {
    const entry = dailyEntries[student.id];
    const status = entry?.status || 'Present';
    const notes = entry?.notes || '';
    await sendAutoDailyAttendanceNotice(
      student,
      { date: selectedDate, status, notes },
      data?.settings
    );
  };

  const handleOpenBulkDailyModal = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students matching current filters.');
      return;
    }

    const items: ReportRecipientItem[] = filteredStudents.map((s: any) => {
      const entry = dailyEntries[s.id];
      const status = entry?.status || 'Present';
      const isAbsent = status === 'Absent';
      const notes = entry?.notes || '';
      const msg = buildDailyAttendanceMessage(s, { date: selectedDate, status, notes }, data?.settings);
      const phone = getStudentPhone(s);

      return {
        id: s.id,
        student: s,
        name: s.fullName,
        phone,
        rollNo: s.studentId || s.collegeNo || s.id || 'N/A',
        className: `${s.currentClass || s.groupName || ''} (${s.section || 'Sec A'})`,
        message: msg,
        statusBadge: status,
        isAbsent
      };
    });

    setBulkModalProps({
      category: 'daily_attendance',
      title: 'Broadcast Daily Attendance Alerts',
      subtitle: `Date: ${selectedDate} • Target: ${items.length} Students (${classFilter === 'all' ? 'All Classes' : classFilter}, Sec: ${sectionFilter})`,
      items
    });
    setIsBulkModalOpen(true);
  };

  const handleSendSingleMonthlyWhatsApp = async (student: any) => {
    const stats = getMonthlyStats(student.id);
    await sendAutoPeriodicAttendanceReport(
      student,
      {
        period: 'monthly',
        periodLabel: reportMonth,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        leave: stats.leave,
        holiday: stats.holiday,
        totalWorkingDays: stats.totalWorkingDays
      },
      data?.settings
    );
  };

  const handleOpenBulkMonthlyModal = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students found to broadcast monthly reports.');
      return;
    }

    const items: ReportRecipientItem[] = filteredStudents.map((s: any) => {
      const stats = getMonthlyStats(s.id);
      const msg = buildPeriodicAttendanceMessage(
        s,
        {
          period: 'monthly',
          periodLabel: reportMonth,
          present: stats.present,
          absent: stats.absent,
          late: stats.late,
          leave: stats.leave,
          holiday: stats.holiday,
          totalWorkingDays: stats.totalWorkingDays
        },
        data?.settings
      );
      const phone = getStudentPhone(s);

      return {
        id: s.id,
        student: s,
        name: s.fullName,
        phone,
        rollNo: s.studentId || s.collegeNo || s.id || 'N/A',
        className: `${s.currentClass || s.groupName || ''} (${s.section || 'Sec A'})`,
        message: msg,
        statusBadge: `Present: ${stats.present}, Absent: ${stats.absent}`
      };
    });

    setBulkModalProps({
      category: 'monthly_attendance',
      title: 'Broadcast Monthly Attendance Reports',
      subtitle: `Month: ${reportMonth} • Target: ${items.length} Students (${classFilter === 'all' ? 'All Classes' : classFilter}, Sec: ${sectionFilter})`,
      items
    });
    setIsBulkModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display font-black text-superior-teal tracking-tight flex items-center gap-3">
            <CheckCircle2 size={32} className="text-superior-gold" />
            Students Attendance
          </h2>
          <p className="text-slate-500 mt-1 font-medium italic">Track daily presence and maintain precise records</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Search by student name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-medium"
              />
            </div>
            
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[180px] h-12 rounded-2xl bg-slate-50 border-transparent">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map(cls => (
                   <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-[180px] h-12 rounded-2xl bg-slate-50 border-transparent">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sectionOptions.map(sec => (
                  <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2">
              <Button 
                variant={activeTab === 'daily' ? 'default' : 'outline'}
                onClick={() => setActiveTab('daily')}
                className={cn("rounded-xl h-10 w-32", activeTab === 'daily' ? "bg-superior-teal text-white shadow-md shadow-superior-teal/20" : "")}
              >
                Daily Entry
              </Button>
              <Button 
                variant={activeTab === 'report' ? 'default' : 'outline'}
                onClick={() => setActiveTab('report')}
                className={cn("rounded-xl h-10 w-32", activeTab === 'report' ? "bg-superior-teal text-white shadow-md shadow-superior-teal/20" : "")}
              >
                Monthly Report
              </Button>
            </div>
            
            {activeTab === 'daily' ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 mr-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-11 rounded-xl text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                    onClick={() => markAllFiltered('Present')}
                  >
                    All Present
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-11 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                    onClick={() => markAllFiltered('Absent')}
                  >
                    All Absent
                  </Button>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <CalendarDays size={16} className="text-slate-400" />
                  <Input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border-none bg-transparent h-8 focus-visible:ring-0 w-[140px] text-sm font-medium"
                  />
                </div>
                {data?.syncAdmissionsToStudents && (
                  <Button 
                    variant="outline" 
                    onClick={() => data.syncAdmissionsToStudents?.()}
                    className="rounded-xl h-11 px-6 border-superior-teal/30 text-superior-teal hover:bg-superior-teal/5 bg-superior-teal/5"
                    title="If student is missing or save fails, click to synchronize"
                  >
                    <RefreshCw size={16} className="mr-2" /> Sync Students
                  </Button>
                )}
                <Button 
                  variant="outline"
                  className="rounded-xl h-11 px-5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold"
                  onClick={handleOpenBulkDailyModal}
                  title="Send WhatsApp Attendance Alerts to Absentees or All Students in this class"
                >
                  <MessageSquare size={16} className="mr-2 text-emerald-600" /> WhatsApp Alerts
                </Button>
                <Button className="rounded-xl h-11 px-6 bg-superior-teal hover:bg-superior-teal/90 shadow-md shadow-superior-teal/20" onClick={handleSaveDaily}>
                   <Save size={18} className="mr-2" /> Save Attendance
                </Button>
              </div>
            ) : (
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <CalendarDays size={16} className="text-slate-400" />
                    <Input 
                      type="month" 
                      value={reportMonth}
                      onChange={(e) => setReportMonth(e.target.value)}
                      className="border-none bg-transparent h-8 focus-visible:ring-0 w-[140px] text-sm font-medium"
                    />
                  </div>
                  <Button variant="outline" className="rounded-xl h-11 border-superior-teal text-superior-teal" onClick={downloadSectionPDF}>
                     <Download size={18} className="mr-2" /> Download Section PDF
                  </Button>
                  <Button 
                    className="rounded-xl h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20" 
                    onClick={handleOpenBulkMonthlyModal}
                    title="Broadcast monthly attendance summaries to all students in section"
                  >
                     <MessageSquare size={16} className="mr-2" /> Broadcast Monthly Reports
                  </Button>
               </div>
            )}
        </div>
      </div>

      <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <CardContent className="p-0">
          {activeTab === 'daily' ? (
             <div className="overflow-x-auto min-h-[400px]">
              {/* Real-time Attendance & WhatsApp Bot Summary Bar */}
              <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                {/* Left: Live Attendance Counters */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs">
                    <Users size={14} className="text-slate-500" />
                    Total: <strong className="text-slate-900 font-black">{filteredStudents.length}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    Hazir: <strong className="font-black">{presentsCount}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold shadow-2xs">
                    <AlertCircle size={14} className="text-rose-600" />
                    Ghair Hazir: <strong className="font-black">{absentsCount}</strong>
                  </span>
                  {leavesCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold shadow-2xs">
                      Rukhsat: <strong className="font-black">{leavesCount}</strong>
                    </span>
                  )}
                </div>

                {/* Right: WhatsApp Bot Controls & 30m Log Status */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* WhatsApp 30-min log status pill */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                    <Bot size={15} className="text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600">Bot Log (30m):</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-black" title="Delivered within last 30 minutes">
                      <CheckCheck size={13} /> {sentCount} Sent
                    </span>
                    {failedCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-black ml-1" title="Failed deliveries">
                        <AlertCircle size={13} /> {failedCount} Failed
                      </span>
                    )}
                  </div>

                  {/* Resend to all failed button */}
                  {failedCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResendAllFailed}
                      disabled={isRetryingFailed}
                      className="h-8 rounded-xl text-xs font-extrabold text-rose-700 border-rose-300 hover:bg-rose-50 shadow-2xs gap-1.5 animate-pulse"
                      title="Resend WhatsApp notices to all failed students"
                    >
                      <RotateCw size={12} className={isRetryingFailed ? "animate-spin" : ""} />
                      Resend to {failedCount} Failed
                    </Button>
                  )}

                  {/* Auto-WhatsApp Toggle Button */}
                  <div 
                    onClick={() => setAutoWhatsAppEnabled(!autoWhatsAppEnabled)}
                    className={cn(
                      "flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border cursor-pointer select-none transition-all shadow-2xs",
                      autoWhatsAppEnabled 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900" 
                        : "bg-slate-100 border-slate-200 text-slate-500"
                    )}
                    title="When ON, WhatsApp notice is automatically dispatched whenever a student is marked Absent or Leave"
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-black uppercase tracking-wider leading-tight">
                        Auto-WhatsApp
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 leading-tight">
                        {autoWhatsAppEnabled ? "Instant (Absent/Leave)" : "Paused"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                        autoWhatsAppEnabled ? "bg-emerald-600" : "bg-slate-300"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                          autoWhatsAppEnabled ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-20 pl-8 font-black uppercase text-[10px] tracking-wider text-slate-400">Roll No</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-wider text-slate-400">Student Info</TableHead>
                    <TableHead className="w-56 font-black uppercase text-[10px] tracking-wider text-slate-400">Status</TableHead>
                    <TableHead className="w-1/3 font-black uppercase text-[10px] tracking-wider text-slate-400">Notes</TableHead>
                    <TableHead className="w-48 font-black uppercase text-[10px] tracking-wider text-slate-400 pr-8 text-right">WhatsApp Bot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {filteredStudents.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={5} className="h-64 text-center">
                         <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                            <CheckCircle2 size={32} className="opacity-20" />
                            <p className="font-medium">No students found matching your filters.</p>
                         </div>
                       </TableCell>
                     </TableRow>
                   ) : (
                     filteredStudents.map((student: any) => (
                       <TableRow key={student.id} className="hover:bg-slate-50/80 transition-colors">
                         <TableCell className="pl-8 font-mono text-xs font-semibold text-slate-600">
                            {student.studentId || student.collegeNo || 'Pending'}
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-superior-teal/10 flex items-center justify-center text-superior-teal font-black text-sm overflow-hidden border border-slate-200/80 shadow-2xs shrink-0">
                               {student.photo ? (
                                 <img
                                   src={student.photo}
                                   alt={student.fullName || ''}
                                   className="w-full h-full object-cover object-[center_top] rounded-full"
                                   referrerPolicy="no-referrer"
                                 />
                               ) : (
                                 (student.fullName || 'S').substring(0, 1).toUpperCase()
                               )}
                             </div>
                             <div>
                               <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                  {student.fullName}
                                  {student.gender === 'Female' && <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>}
                                  {student.gender === 'Male' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
                               </div>
                               <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                                 {student.section || 'Unassigned'} • {student.groupName || student.currentClass}
                               </div>
                             </div>
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center bg-slate-50 inline-flex p-1 rounded-xl border border-slate-100">
                             {['Present', 'Absent', 'Late', 'Leave'].map(status => {
                               const isActive = dailyEntries[student.id]?.status === status;
                               return (
                                 <button
                                   key={status}
                                   onClick={() => handleStatusChange(student, status as StudentAttendanceStatus)}
                                   className={cn(
                                     "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                                     isActive 
                                       ? status === 'Present' ? "bg-emerald-500 text-white shadow-sm"
                                       : status === 'Absent' ? "bg-red-500 text-white shadow-sm"
                                       : status === 'Late' ? "bg-amber-500 text-white shadow-sm"
                                       : "bg-blue-500 text-white shadow-sm"
                                       : "text-slate-500 hover:bg-slate-200/50"
                                   )}
                                 >
                                   {status.charAt(0)}
                                 </button>
                               )
                             })}
                           </div>
                         </TableCell>
                         <TableCell>
                           <Input 
                             placeholder="Add reason/note..." 
                             className="h-10 rounded-xl text-sm border-slate-200 bg-slate-50 focus:bg-white"
                             value={dailyEntries[student.id]?.notes || ''}
                             onChange={(e) => handleEntryChange(student.id, 'notes', e.target.value)}
                           />
                         </TableCell>
                         <TableCell className="pr-8 text-right">
                           {(() => {
                             const wa = waStatuses[student.id];
                             const currentStatus = dailyEntries[student.id]?.status;
                             const isAbsOrLeave = currentStatus === 'Absent' || currentStatus === 'Leave';

                             if (wa?.status === 'sending') {
                               return (
                                 <div className="flex items-center justify-end">
                                   <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 animate-pulse shadow-2xs">
                                     <Loader2 size={11} className="animate-spin text-amber-600" />
                                     Sending...
                                   </span>
                                 </div>
                               );
                             }

                             if (wa?.status === 'sent') {
                               return (
                                 <div className="flex items-center justify-end gap-1.5">
                                   <span 
                                     className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs"
                                     title={`Delivered via WhatsApp at ${new Date(wa.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                   >
                                     <CheckCheck size={13} className="text-emerald-600" />
                                     Sent ✓
                                   </span>
                                   <Button
                                     variant="ghost"
                                     size="icon"
                                     className="h-7 w-7 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50"
                                     title="Resend WhatsApp notice"
                                     onClick={() => dispatchStudentAttendanceWhatsApp(student, undefined, undefined, true)}
                                   >
                                     <RotateCw size={12} />
                                   </Button>
                                 </div>
                               );
                             }

                             if (wa?.status === 'failed') {
                               return (
                                 <div className="flex items-center justify-end gap-1.5">
                                   <span 
                                     className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs max-w-[125px] truncate"
                                     title={`Failed: ${wa.error || 'Delivery error'}. Click resend to retry.`}
                                   >
                                     <AlertCircle size={12} className="text-rose-600 shrink-0" />
                                     <span className="truncate">{wa.error || 'Failed'}</span>
                                   </span>
                                   <Button
                                     variant="outline"
                                     size="icon"
                                     className="h-7 w-7 rounded-lg text-rose-700 border-rose-200 hover:bg-rose-50 hover:border-rose-300 shadow-2xs"
                                     title="Resend WhatsApp notice"
                                     onClick={() => dispatchStudentAttendanceWhatsApp(student, undefined, undefined, true)}
                                   >
                                     <RotateCw size={12} />
                                   </Button>
                                 </div>
                               );
                             }

                             if (isAbsOrLeave) {
                               return (
                                 <div className="flex items-center justify-end">
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     className="h-7 px-2.5 rounded-lg text-[10px] font-extrabold text-superior-teal border-superior-teal/30 hover:bg-superior-teal/10 gap-1 shadow-2xs"
                                     title={`Send ${currentStatus} notice to parent`}
                                     onClick={() => dispatchStudentAttendanceWhatsApp(student, undefined, undefined, true)}
                                   >
                                     <Send size={10} /> Send Notice
                                   </Button>
                                 </div>
                               );
                             }

                             return (
                               <div className="flex items-center justify-end">
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   className="h-8 w-8 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50"
                                   title={`Send daily attendance alert for ${student.fullName}`}
                                   onClick={() => dispatchStudentAttendanceWhatsApp(student, undefined, undefined, true)}
                                 >
                                   <MessageSquare size={15} />
                                 </Button>
                               </div>
                             );
                           })()}
                         </TableCell>
                       </TableRow>
                     ))
                   )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[400px]">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-100">
                  <TableRow>
                    <TableHead className="whitespace-nowrap pl-8 font-black uppercase text-[10px] text-slate-400">Student Info</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 text-center">Present</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-emerald-500 text-center">Late</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-red-500 text-center">Absent</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-blue-500 text-center">Leave</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-purple-500 text-center">Holiday</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 pr-8 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center text-slate-500 font-medium">No students found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student: any) => {
                      const stats = getMonthlyStats(student.id);
                      return (
                        <TableRow key={student.id} className="hover:bg-slate-50/50">
                          <TableCell className="pl-8">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-sm overflow-hidden border border-slate-200/80 shadow-2xs shrink-0">
                                {student.photo ? (
                                  <img
                                    src={student.photo}
                                    alt={student.fullName || ''}
                                    className="w-full h-full object-cover object-[center_top] rounded-full"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  (student.fullName || 'S').substring(0, 1).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 text-sm">{student.fullName}</div>
                                <div className="text-[10px] text-slate-500 font-medium">{student.section} • ID: {student.studentId || 'Pending'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-700 bg-slate-50/30">{stats.present}</TableCell>
                          <TableCell className="text-center font-bold text-emerald-600">{stats.late > 0 ? stats.late : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-red-600">{stats.absent > 0 ? stats.absent : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-blue-600">{stats.leave > 0 ? stats.leave : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-purple-600">{stats.holiday > 0 ? stats.holiday : '-'}</TableCell>
                          <TableCell className="pr-8 text-right">
                             <div className="flex items-center justify-end gap-1.5">
                               <Button variant="ghost" size="sm" className="h-8 rounded-lg text-superior-teal hover:text-superior-teal hover:bg-superior-teal/10" onClick={() => downloadIndividualPDF(student)}>
                                 <FileText size={14} className="mr-1.5" /> PDF
                               </Button>
                               <Button variant="ghost" size="sm" className="h-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold" onClick={() => handleSendSingleMonthlyWhatsApp(student)}>
                                 <MessageSquare size={14} className="mr-1.5" /> WhatsApp
                               </Button>
                             </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {bulkModalProps && (
        <WhatsAppReportModal
          open={isBulkModalOpen}
          onOpenChange={setIsBulkModalOpen}
          title={bulkModalProps.title}
          subtitle={bulkModalProps.subtitle}
          category={bulkModalProps.category}
          items={bulkModalProps.items}
          settings={data?.settings}
        />
      )}
    </div>
  );
}
