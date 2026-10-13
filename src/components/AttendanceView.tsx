
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
  Users,
  Camera,
  Smartphone,
  ShieldCheck,
  Clock,
  Sparkles,
  Eye,
  Building2,
  LogOut,
  X
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
import DailyAttendanceCloseoutModal from './DailyAttendanceCloseoutModal';
import { 
  sendAutoDailyAttendanceNotice, 
  sendAutoDailyAttendanceNoticeDetailed,
  sendAutoPeriodicAttendanceReport, 
  buildDailyAttendanceMessage, 
  buildPeriodicAttendanceMessage,
  sendAutoPhotoUploadRequestNotice,
  dispatchBulkPhotoRequests
} from '../lib/whatsappAutomation';

export type StudentAttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave' | 'Holiday' | '';

export interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: StudentAttendanceStatus;
  notes: string;
  checkInTime?: string;
  check_in_time?: string;
  checkOutTime?: string;
  check_out_time?: string;
  snapshotUrl?: string;
  snapshot_url?: string;
  verificationMethod?: 'face_biometric' | 'manual';
  verification_method?: 'face_biometric' | 'manual';
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
  const [studentAuditSnapshot, setStudentAuditSnapshot] = useState<{
    studentName: string;
    rollNo: string;
    classInfo: string;
    registeredPhoto?: string;
    entrySnapshotUrl?: string | null;
    exitSnapshotUrl?: string | null;
    snapshotUrl?: string | null;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    status?: string;
    date: string;
  } | null>(null);

  const [selectedDossierStudent, setSelectedDossierStudent] = useState<any | null>(null);

  function getStudentBiometrics(entry?: any, existing?: any): {
    entrySnapshot: string | null;
    exitSnapshot: string | null;
    checkInTime: string | null;
    checkOutTime: string | null;
    isBiometric: boolean;
  } {
    const raw = existing || entry;
    if (!raw) return { entrySnapshot: null, exitSnapshot: null, checkInTime: null, checkOutTime: null, isBiometric: false };

    let entrySnap: string | null = raw.entrySnapshotUrl || raw.entry_snapshot_url || raw.snapshotUrl || raw.snapshot_url || null;
    let exitSnap: string | null = raw.exitSnapshotUrl || raw.exit_snapshot_url || null;
    let checkIn = raw.checkInTime || raw.check_in_time || null;
    let checkOut = raw.checkOutTime || raw.check_out_time || null;
    let isBio = Boolean(entrySnap || exitSnap || raw.verificationMethod === 'face_biometric' || raw.verification_method === 'face_biometric');

    const notesStr = raw.notes || entry?.notes;
    if (notesStr && typeof notesStr === 'string' && notesStr.startsWith('{')) {
      try {
        const parsed = JSON.parse(notesStr);
        if (parsed.entry_snapshot) entrySnap = parsed.entry_snapshot;
        if (parsed.exit_snapshot) exitSnap = parsed.exit_snapshot;
        if (parsed.snapshot && !entrySnap) entrySnap = parsed.snapshot;
        if (parsed.check_in_time && !checkIn) checkIn = parsed.check_in_time;
        if (parsed.check_out_time && !checkOut) checkOut = parsed.check_out_time;
        if (parsed.method === 'face_biometric' || parsed.verification_method === 'face_biometric') isBio = true;
      } catch {}
    }

    return {
      entrySnapshot: entrySnap,
      exitSnapshot: exitSnap,
      checkInTime: checkIn,
      checkOutTime: checkOut,
      isBiometric: isBio
    };
  }

  function getStudentSnapshotUrl(entry?: any): string | null {
    if (!entry) return null;
    const bio = getStudentBiometrics(entry);
    return bio.entrySnapshot || bio.exitSnapshot || null;
  }

  function formatPunchTime(isoString?: string | null): string | null {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) {
        return String(isoString).slice(0, 5);
      }
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return String(isoString);
    }
  }

  function isPunchLate(isoString?: string | null, collegeStartTime = '07:54'): boolean {
    if (!isoString) return false;
    try {
      const d = new Date(isoString);
      if (!isNaN(d.getTime())) {
        const punchMinutes = d.getHours() * 60 + d.getMinutes();
        const [h, m] = collegeStartTime.split(':').map(Number);
        const startMinutes = (h || 7) * 60 + (m || 54);
        return punchMinutes > startMinutes;
      }
      if (typeof isoString === 'string' && isoString.includes(':')) {
        const [ph, pm] = isoString.split(':').map(Number);
        const punchMinutes = (ph || 0) * 60 + (pm || 0);
        const [h, m] = collegeStartTime.split(':').map(Number);
        const startMinutes = (h || 7) * 60 + (m || 54);
        return punchMinutes > startMinutes;
      }
    } catch {}
    return false;
  }

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
    const predefinedNames = sections.map((s: any) => s.name).filter(Boolean);
    const studentSections = (students || [])
      .filter((s: any) => {
        if (classFilter && classFilter !== 'all') {
          const matchClass = s.category === classFilter || s.currentClass === classFilter || s.groupName === classFilter;
          if (!matchClass) return false;
        }
        return true;
      })
      .map((s: any) => (s.section || '').trim())
      .filter((sec: string) => sec && sec !== '-' && sec.toLowerCase() !== 'unassigned');

    return Array.from(new Set([...predefinedNames, ...studentSections])).sort() as string[];
  }, [data?.settings?.predefinedSections, classFilter, students]);

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

  // Missing Photos WhatsApp Request State
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isBulkSendingPhotos, setIsBulkSendingPhotos] = useState(false);
  const [bulkPhotoProgress, setBulkPhotoProgress] = useState({ done: 0, total: 0 });

  // Daily Closeout Infographics Modal State
  const [showCloseoutModal, setShowCloseoutModal] = useState(false);

  const studentsWithoutPhotos = useMemo(() => {
    return (students || []).filter((s: any) => {
      const p = s.photo_url || s.photo;
      return !p || String(p).trim().length <= 5;
    });
  }, [students]);

  const handleSendSinglePhotoRequest = async (student: any) => {
    await sendAutoPhotoUploadRequestNotice(student, data?.settings);
  };

  const handleSendBulkPhotoRequests = async () => {
    if (studentsWithoutPhotos.length === 0) {
      toast.info('No students missing photos!');
      return;
    }
    setIsBulkSendingPhotos(true);
    setBulkPhotoProgress({ done: 0, total: studentsWithoutPhotos.length });
    const res = await dispatchBulkPhotoRequests(
      studentsWithoutPhotos,
      data?.settings,
      (done, total) => setBulkPhotoProgress({ done, total })
    );
    setIsBulkSendingPhotos(false);
    toast.success(`Photo requests dispatched: ${res.sent} sent, ${res.failed} failed!`);
  };

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

  const downloadStudentDossierPDF = (student: any) => {
    const doc = new jsPDF();
    const collegeName = data?.settings?.collegeName || 'Superior Group of Colleges Jahanian';
    const title = `${collegeName}\n30-Day Biometric Attendance Dossier - ${reportMonth}`;
    
    doc.setFontSize(13);
    doc.text(title, 14, 15);
    doc.setFontSize(9.5);
    doc.text(`Student: ${student.fullName}   |   ID: ${student.studentId || student.collegeNo || '-'}   |   Section: ${student.section || '-'}   |   Group: ${student.groupName || student.currentClass || '-'}`, 14, 28);
    
    const [year, month] = reportMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dossierRows = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(year, month - 1, d);
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      const isSun = dayDate.getDay() === 0;
      const rec = records.find((r: any) => r.studentId === student.id && r.date === dateStr);
      const cin = formatPunchTime(rec?.checkInTime || rec?.check_in_time) || '-';
      const cout = formatPunchTime(rec?.checkOutTime || rec?.check_out_time) || '-';
      const snap = getStudentSnapshotUrl(rec) ? 'Biometric Face Match' : (rec ? 'Manual Entry' : '-');
      const status = rec?.status || (isSun ? 'Sunday' : '-');
      
      dossierRows.push([
        `${d} (${dayName})`,
        dateStr,
        status,
        snap,
        cin,
        cout,
        rec?.notes || '-'
      ]);
    }
    
    autoTable(doc, {
      startY: 34,
      head: [['Day', 'Date', 'Status', 'Biometric Mode', 'Check-In', 'Check-Out', 'Notes']],
      body: dossierRows,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87] }, // Superior Teal
      styles: { fontSize: 8 }
    });
    
    doc.save(`Biometric_Dossier_${student.fullName.replace(/\s+/g, '_')}_${reportMonth}.pdf`);
    toast.success('30-Day Biometric Dossier PDF downloaded successfully!');
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

              <Button 
                variant="outline"
                onClick={() => window.open('/?gate=true', '_blank')}
                className="rounded-xl h-10 px-3 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-semibold flex items-center gap-1.5 shadow-sm"
                title="Open Gate Face Attendance Terminal"
              >
                <Camera size={16} className="text-emerald-600" />
                <span className="hidden sm:inline">Gate Face Kiosk</span>
              </Button>

              <Button 
                variant="outline"
                onClick={() => setShowPhotoModal(true)}
                className="rounded-xl h-10 px-3 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-semibold flex items-center gap-1.5 shadow-sm"
                title="Send WhatsApp Request for Missing Photos"
              >
                <Smartphone size={16} className="text-indigo-600" />
                <span>Request Photos ({studentsWithoutPhotos.length})</span>
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
                <Button 
                  onClick={() => setShowCloseoutModal(true)}
                  className="rounded-xl h-11 px-5 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-extrabold shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
                  title="Open Daily Attendance Closeout & Principal Flash Summary Dashboard"
                >
                  <Sparkles size={16} className="text-amber-200 animate-pulse" />
                  <span>Daily Flash & Closeout ⚡</span>
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
                    <TableHead className="w-16 pl-6 font-black uppercase text-[10px] tracking-wider text-slate-400">Roll No</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-wider text-slate-400">Student Info</TableHead>
                    <TableHead className="w-36 font-black uppercase text-[10px] tracking-wider text-slate-400">Gate Biometric</TableHead>
                    <TableHead className="w-44 font-black uppercase text-[10px] tracking-wider text-slate-400">Punch Timings</TableHead>
                    <TableHead className="w-48 font-black uppercase text-[10px] tracking-wider text-slate-400">Status</TableHead>
                    <TableHead className="w-40 font-black uppercase text-[10px] tracking-wider text-slate-400">Notes</TableHead>
                    <TableHead className="w-40 font-black uppercase text-[10px] tracking-wider text-slate-400 pr-6 text-right">WhatsApp Bot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {filteredStudents.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={7} className="h-64 text-center">
                         <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                            <CheckCircle2 size={32} className="opacity-20" />
                            <p className="font-medium">No students found matching your filters.</p>
                         </div>
                       </TableCell>
                     </TableRow>
                   ) : (
                     filteredStudents.map((student: any) => {
                      const entry = dailyEntries[student.id];
                      const existing = records.find((r: any) => r.studentId === student.id && r.date === selectedDate);
                      const bio = getStudentBiometrics(entry, existing);
                      const entrySnapshot = bio.entrySnapshot;
                      const exitSnapshot = bio.exitSnapshot;
                      const checkInTime = bio.checkInTime;
                      const checkOutTime = bio.checkOutTime;
                      const isBiometric = bio.isBiometric;
                      const isLate = isPunchLate(checkInTime, data?.settings?.collegeStartTime || '07:54');
                      const currentStatus = entry?.status || existing?.status || 'Present';

                       return (
                       <TableRow key={student.id} className="hover:bg-slate-50/80 transition-colors">
                         <TableCell className="pl-6 font-mono text-xs font-semibold text-slate-600">
                            {student.studentId || student.collegeNo || 'Pending'}
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center gap-3">
                             <div className="w-12 h-12 rounded-full bg-superior-teal/10 flex items-center justify-center text-superior-teal font-black text-sm overflow-hidden border-2 border-slate-200 shadow-sm shrink-0 ring-2 ring-slate-100">
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
                          {entrySnapshot || exitSnapshot ? (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                {entrySnapshot && (
                                  <button
                                    type="button"
                                    onClick={() => setStudentAuditSnapshot({
                                      studentName: student.fullName,
                                      rollNo: student.studentId || student.collegeNo || 'Pending',
                                      classInfo: `${student.section || ''} • ${student.groupName || student.currentClass || ''}`,
                                      registeredPhoto: student.photo,
                                      entrySnapshotUrl: entrySnapshot,
                                      exitSnapshotUrl: exitSnapshot,
                                      snapshotUrl: entrySnapshot,
                                      checkInTime: checkInTime,
                                      checkOutTime: checkOutTime,
                                      status: currentStatus,
                                      date: selectedDate
                                    })}
                                    className="group relative w-9 h-9 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-2xs hover:scale-105 transition-all cursor-pointer shrink-0 ring-2 ring-emerald-500/20"
                                    title="Gate Arrival (Entry) Snapshot — Click to inspect"
                                  >
                                    <img src={entrySnapshot} alt="Entry Scan" className="w-full h-full object-cover" />
                                    <span className="absolute bottom-0 inset-x-0 bg-emerald-700/90 text-[7px] font-black text-white text-center leading-tight py-0.2">IN</span>
                                  </button>
                                )}
                                {exitSnapshot ? (
                                  <button
                                    type="button"
                                    onClick={() => setStudentAuditSnapshot({
                                      studentName: student.fullName,
                                      rollNo: student.studentId || student.collegeNo || 'Pending',
                                      classInfo: `${student.section || ''} • ${student.groupName || student.currentClass || ''}`,
                                      registeredPhoto: student.photo,
                                      entrySnapshotUrl: entrySnapshot,
                                      exitSnapshotUrl: exitSnapshot,
                                      snapshotUrl: exitSnapshot,
                                      checkInTime: checkInTime,
                                      checkOutTime: checkOutTime,
                                      status: currentStatus,
                                      date: selectedDate
                                    })}
                                    className="group relative w-9 h-9 rounded-xl overflow-hidden border-2 border-blue-500 shadow-2xs hover:scale-105 transition-all cursor-pointer shrink-0 ring-2 ring-blue-500/20"
                                    title="Gate Departure (Exit) Snapshot — Click to inspect"
                                  >
                                    <img src={exitSnapshot} alt="Exit Scan" className="w-full h-full object-cover" />
                                    <span className="absolute bottom-0 inset-x-0 bg-blue-700/90 text-[7px] font-black text-white text-center leading-tight py-0.2">OUT</span>
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-500 border border-slate-200" title="Student is currently on campus (Departure pending)">
                                    🏢 In
                                  </span>
                                )}
                              </div>
                              <div className="hidden sm:block">
                                <span className="inline-flex items-center gap-0.5 font-bold text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs">
                                  <CheckCircle2 size={9} className="text-emerald-600" /> {exitSnapshot ? 'In+Out' : 'Gate Scan'}
                                </span>
                              </div>
                            </div>
                          ) : isBiometric ? (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                                <ShieldCheck size={16} />
                              </div>
                              <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                Face Verified
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                Manual ✍️
                              </span>
                            </div>
                          )}
                        </TableCell>
                         <TableCell>
                           <div className="flex flex-col gap-1 text-[11px]">
                             {checkInTime ? (
                               <div className="flex items-center gap-1.5">
                                 <span className={cn(
                                   "inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-md border text-[10px]",
                                   isLate 
                                     ? "bg-amber-50 text-amber-800 border-amber-300"
                                     : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                 )}>
                                   <Clock size={11} className={isLate ? "text-amber-600" : "text-emerald-600"} />
                                   In: {formatPunchTime(checkInTime)}
                                   {isLate && <span className="bg-amber-200 text-amber-900 font-black px-1 rounded text-[8px] uppercase">Late</span>}
                                 </span>
                               </div>
                             ) : (
                               <span className="text-[10px] text-slate-400 font-medium">In: —</span>
                             )}

                             {checkOutTime ? (
                               <div className="flex items-center gap-1.5">
                                 <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-md border border-blue-200 bg-blue-50 text-blue-800 text-[10px]">
                                   <LogOut size={11} className="text-blue-600" />
                                   Out: {formatPunchTime(checkOutTime)}
                                 </span>
                               </div>
                             ) : checkInTime ? (
                               <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 w-fit">
                                 <Building2 size={10} className="text-slate-400" /> On Campus
                                </span>
                             ) : null}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center bg-slate-50 inline-flex p-1 rounded-xl border border-slate-100">
                             {['Present', 'Absent', 'Late', 'Leave'].map(status => {
                               const isActive = (dailyEntries[student.id]?.status || currentStatus) === status;
                               return (
                                 <button
                                   key={status}
                                   onClick={() => handleStatusChange(student, status as StudentAttendanceStatus)}
                                   className={cn(
                                     "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
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
                             placeholder="Reason / note..." 
                             className="h-9 rounded-xl text-xs border-slate-200 bg-slate-50 focus:bg-white w-full max-w-[150px]"
                             value={dailyEntries[student.id]?.notes || ''}
                             onChange={(e) => handleEntryChange(student.id, 'notes', e.target.value)}
                           />
                         </TableCell>
                         <TableCell className="pr-6 text-right">
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
                     );
                   })
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
                              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-base overflow-hidden border-2 border-slate-200 shadow-sm shrink-0 ring-2 ring-slate-100">
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
                               <Button
                                 variant="outline"
                                 size="sm"
                                 className="h-8 rounded-lg text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 font-bold text-xs gap-1 shadow-2xs cursor-pointer"
                                 onClick={() => setSelectedDossierStudent(student)}
                                 title="Open 30-Day Biometric Attendance Dossier & Photo Audit"
                               >
                                 <Eye size={13} /> Dossier 👁️
                               </Button>
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
      {/* Missing Photos WhatsApp Request Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Request Student Profile Photos via WhatsApp</h3>
                  <p className="text-xs text-slate-400">Total {studentsWithoutPhotos.length} students without photos</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPhotoModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-indigo-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-indigo-900">
                <p className="font-semibold">Automated WhatsApp Photo Collection</p>
                <p className="text-[11px] text-indigo-700">Students ko WhatsApp notice jayega ke wo selfie bhejein jo system auto-verify karega.</p>
              </div>
              <Button
                size="sm"
                onClick={handleSendBulkPhotoRequests}
                disabled={isBulkSendingPhotos || studentsWithoutPhotos.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-1.5 whitespace-nowrap self-end sm:self-auto"
              >
                {isBulkSendingPhotos ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sending ({bulkPhotoProgress.done}/{bulkPhotoProgress.total})
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send to All ({studentsWithoutPhotos.length})
                  </>
                )}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {studentsWithoutPhotos.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                  All students have profile photos enrolled!
                </div>
              ) : (
                studentsWithoutPhotos.map((s: any) => (
                  <div key={s.id} className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{s.fullName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Roll: {s.collegeNo || s.id} • {s.group || "Inter"} {s.section ? `(Sec ${s.section})` : ""}
                      </p>
                      <p className="text-[10px] text-slate-400">Phone: {s.contactNumber || s.phone || s.fatherContact || "No phone"}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendSinglePhotoRequest(s)}
                      className="text-xs rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      <Send size={12} className="mr-1" /> Send Notice
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowPhotoModal(false)} className="rounded-xl text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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

      {/* Student Biometric Gate Snapshot Audit Modal */}
      {studentAuditSnapshot && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Student Biometric Gate Attendance</h3>
                  <p className="text-xs text-slate-400">Audit Trail • {studentAuditSnapshot.date}</p>
                </div>
              </div>
              <button
                onClick={() => setStudentAuditSnapshot(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Info */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <h4 className="font-black text-slate-900 text-base">{studentAuditSnapshot.studentName}</h4>
                  <p className="text-xs text-slate-500 font-mono">Roll: {studentAuditSnapshot.rollNo} • {studentAuditSnapshot.classInfo}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 font-black text-xs text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-300">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    {studentAuditSnapshot.status || 'Present'}
                  </span>
                </div>
              </div>

              {/* Side-by-side Photo Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="text-center space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">1. Enrolled Master ID</p>
                  <div className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 shadow-sm">
                    {studentAuditSnapshot.registeredPhoto ? (
                      <img src={studentAuditSnapshot.registeredPhoto} alt="Registered Student" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                        No ID Photo
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold">Official Profile</span>
                </div>

                <div className="text-center space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center justify-center gap-1">
                    <Camera size={11} /> 2. Arrival Scan (IN)
                  </p>
                  <div className="aspect-square rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-900 shadow-md ring-2 ring-emerald-500/20">
                    {studentAuditSnapshot.entrySnapshotUrl || studentAuditSnapshot.snapshotUrl ? (
                      <img src={studentAuditSnapshot.entrySnapshotUrl || studentAuditSnapshot.snapshotUrl} alt="Arrival Scan" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                        No Entry Scan
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-emerald-600 font-bold">Morning Entry</span>
                </div>

                <div className="text-center space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 flex items-center justify-center gap-1">
                    <LogOut size={11} /> 3. Departure Scan (OUT)
                  </p>
                  <div className="aspect-square rounded-2xl overflow-hidden border-2 border-blue-500 bg-slate-900 shadow-md ring-2 ring-blue-500/20">
                    {studentAuditSnapshot.exitSnapshotUrl ? (
                      <img src={studentAuditSnapshot.exitSnapshotUrl} alt="Departure Scan" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center bg-slate-800/80">
                        <span className="text-xl mb-1">🏢</span>
                        <span className="text-[9px] font-bold text-slate-300">On Campus</span>
                        <span className="text-[8px] text-slate-400">Exit Pending</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-blue-600 font-bold">{studentAuditSnapshot.exitSnapshotUrl ? 'Afternoon Departure' : 'Still On Campus'}</span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium flex items-center gap-1.5"><Clock size={13} className="text-slate-400" /> Gate Arrival Timestamp:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {studentAuditSnapshot.checkInTime ? new Date(studentAuditSnapshot.checkInTime).toLocaleString() : 'N/A'}
                  </span>
                </div>
                {studentAuditSnapshot.checkOutTime && (
                  <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                    <span className="font-medium flex items-center gap-1.5"><LogOut size={13} className="text-blue-500" /> Gate Departure Timestamp:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {new Date(studentAuditSnapshot.checkOutTime).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                  <span className="font-medium">Verification Engine:</span>
                  <span className="font-bold text-emerald-700">Gate Kiosk AI Face Biometrics</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button
                onClick={() => setStudentAuditSnapshot(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl px-5"
              >
                Close Audit Record
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 30-Day Biometric Attendance Dossier Modal */}
      {selectedDossierStudent && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold overflow-hidden shadow-inner shrink-0">
                  {selectedDossierStudent.photo ? (
                    <img src={selectedDossierStudent.photo} alt={selectedDossierStudent.fullName} className="w-full h-full object-cover" />
                  ) : (
                    (selectedDossierStudent.fullName || 'S').slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white tracking-tight">{selectedDossierStudent.fullName}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                      Roll: {selectedDossierStudent.studentId || selectedDossierStudent.collegeNo || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    30-Day Gate Biometric Audit Dossier • Month: <span className="font-mono font-bold text-amber-300">{reportMonth}</span> • {selectedDossierStudent.section}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadStudentDossierPDF(selectedDossierStudent)}
                  className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs font-bold rounded-xl gap-1.5 cursor-pointer"
                >
                  <Download size={13} /> Export PDF
                </Button>
                <button
                  onClick={() => setSelectedDossierStudent(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick Month Metrics Bar */}
            {(() => {
              const stats = getMonthlyStats(selectedDossierStudent.id);
              const [year, month] = reportMonth.split('-').map(Number);
              const daysInMonth = new Date(year, month, 0).getDate();
              let biometricCount = 0;
              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const rec = records.find((r: any) => r.studentId === selectedDossierStudent.id && r.date === dateStr);
                if (getStudentSnapshotUrl(rec) || rec?.verificationMethod === 'face_biometric') biometricCount++;
              }

              return (
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 shadow-2xs">
                      Days in Month: <strong className="text-slate-900">{daysInMonth}</strong>
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl font-bold text-emerald-800 shadow-2xs">
                      Hazir (P): <strong className="text-emerald-900">{stats.present}</strong>
                    </span>
                    <span className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-xl font-bold text-amber-800 shadow-2xs">
                      Late (L): <strong className="text-amber-900">{stats.late}</strong>
                    </span>
                    <span className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-xl font-bold text-rose-800 shadow-2xs">
                      Ghair Hazir (A): <strong className="text-rose-900">{stats.absent}</strong>
                    </span>
                    <span className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-800 shadow-2xs">
                      Rukhsat: <strong className="text-blue-900">{stats.leave}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-extrabold text-[11px] shadow-2xs">
                    <Camera size={13} className="text-teal-700" />
                    Biometric Face Scans: {biometricCount} / {stats.present + stats.late}
                  </div>
                </div>
              );
            })()}

            {/* Scrollable 30-Day Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="w-24 font-black uppercase text-[10px] text-slate-400">Date</TableHead>
                    <TableHead className="w-28 font-black uppercase text-[10px] text-slate-400">Status</TableHead>
                    <TableHead className="w-44 font-black uppercase text-[10px] text-slate-400">Gate Faces (IN / OUT) 📸</TableHead>
                    <TableHead className="w-32 font-black uppercase text-[10px] text-slate-400">Punch In</TableHead>
                    <TableHead className="w-32 font-black uppercase text-[10px] text-slate-400">Punch Out</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400">Notes & Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const [year, month] = reportMonth.split('-').map(Number);
                    const daysInMonth = new Date(year, month, 0).getDate();
                    const rows = [];

                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const dayDate = new Date(year, month - 1, d);
                      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
                      const isSun = dayDate.getDay() === 0;
                      const rec = records.find((r: any) => r.studentId === selectedDossierStudent.id && r.date === dateStr);
                      const snapUrl = getStudentSnapshotUrl(rec);
                      const cin = rec?.checkInTime || rec?.check_in_time;
                      const cout = rec?.checkOutTime || rec?.check_out_time;
                      const isLate = isPunchLate(cin, data?.settings?.collegeStartTime || '07:54');
                      const status = rec?.status || (isSun ? 'Holiday' : '');

                      rows.push(
                        <TableRow key={dateStr} className={cn("hover:bg-slate-50/70 transition-colors", isSun && "bg-slate-50/50")}>
                          <TableCell className="font-mono text-xs font-semibold text-slate-700">
                            <div>
                              <span>{dateStr.slice(8)} {dayDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                              <span className={cn("block text-[10px] font-bold", isSun ? "text-rose-500" : "text-slate-400")}>
                                {dayName} {isSun && "(Sunday)"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {status === 'Present' && (
                              <span className="inline-flex items-center gap-1 font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle2 size={12} className="text-emerald-600" /> Present
                              </span>
                            )}
                            {status === 'Late' && (
                              <span className="inline-flex items-center gap-1 font-bold text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                                <Clock size={12} className="text-amber-600" /> Late
                              </span>
                            )}
                            {status === 'Absent' && (
                              <span className="inline-flex items-center gap-1 font-bold text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                <AlertCircle size={12} className="text-rose-600" /> Absent
                              </span>
                            )}
                            {status === 'Leave' && (
                              <span className="inline-flex items-center gap-1 font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                Rukhsat
                              </span>
                            )}
                            {status === 'Holiday' && (
                              <span className="inline-flex items-center gap-1 font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                Holiday
                              </span>
                            )}
                            {!status && (
                              <span className="text-slate-300 font-mono text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {snapUrl ? (
                              <button
                                type="button"
                                onClick={() => setStudentAuditSnapshot({
                                  studentName: selectedDossierStudent.fullName,
                                  rollNo: selectedDossierStudent.studentId || selectedDossierStudent.collegeNo || 'N/A',
                                  classInfo: selectedDossierStudent.section || '',
                                  registeredPhoto: selectedDossierStudent.photo,
                                  snapshotUrl: snapUrl,
                                  checkInTime: cin,
                                  checkOutTime: cout,
                                  status: status,
                                  date: dateStr
                                })}
                                className="group relative w-10 h-10 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-2xs hover:scale-105 transition-all cursor-pointer ring-2 ring-emerald-500/20"
                                title="Click to view full photo comparison"
                              >
                                <img src={snapUrl} alt="Gate Snapshot" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/25 group-hover:bg-transparent flex items-center justify-center transition-all">
                                  <Camera size={12} className="text-white drop-shadow" />
                                </div>
                              </button>
                            ) : rec?.verificationMethod === 'face_biometric' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Face Verified
                              </span>
                            ) : rec ? (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                Manual ✍️
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {cin ? (
                              <span className={cn(
                                "inline-flex items-center gap-1 font-mono font-bold text-[11px] px-2 py-0.5 rounded-md border",
                                isLate ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              )}>
                                <Clock size={11} className={isLate ? "text-amber-600" : "text-emerald-600"} />
                                {formatPunchTime(cin)}
                                {isLate && <span className="bg-amber-200 text-amber-900 text-[8px] font-black px-1 rounded uppercase">Late</span>}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {cout ? (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] px-2 py-0.5 rounded-md border border-blue-200 bg-blue-50 text-blue-800">
                                <LogOut size={11} className="text-blue-600" />
                                {formatPunchTime(cout)}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                            {rec?.notes || <span className="text-slate-300">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    }
                    return rows;
                  })()}
                </TableBody>
              </Table>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Superior College Jahanian • Biometric AI Audit Trail</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDossierStudent(null)}
                className="rounded-xl font-bold px-5"
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Attendance Closeout Infographics Modal */}
      {showCloseoutModal && (
        <DailyAttendanceCloseoutModal
          isOpen={showCloseoutModal}
          onClose={() => setShowCloseoutModal(false)}
          selectedDate={selectedDate}
          students={students}
          studentAttendance={data?.studentAttendance || []}
          staff={data?.staff || []}
          staffAttendance={data?.staffAttendance || []}
          settings={data?.settings}
          onRefreshData={() => data?.fetchData?.()}
        />
      )}
    </div>
  );
}