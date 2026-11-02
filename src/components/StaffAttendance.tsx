import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Staff } from '../types';
import {
  Download,
  Upload,
  Save,
  Calendar,
  FileSpreadsheet,
  Search,
  Filter,
  Camera,
  CheckCircle2,
  X,
  Clock,
  ShieldCheck,
  Eye,
  Building2,
  LogOut,
  AlertCircle,
  Fingerprint,
  RefreshCw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Undo2,
  Send,
  RotateCcw,
  Sparkles,
  FileText,
  UserCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { safeLocalStorage } from '../utils/safeStorage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import BiometricEnrollmentModal from './BiometricEnrollmentModal';
import BiometricAttendanceDesk from './BiometricAttendanceDesk';
import BiometricReEnrollModal from './BiometricReEnrollModal';
import {
  useBiometricAttendance,
  getTodayDateStr,
  formatTime12h,
  timeStringToMinutes,
  calculateWorkingHours,
  BiometricStage,
} from '../context/BiometricAttendanceContext';
import {
  sendAutoStaffDailyCheckInNotice,
  sendAutoStaffAttendancePdfNotice,
  parseAttendanceNotesAndTime,
} from '../lib/whatsappAutomation';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface StaffAttendanceProps {
  staffList: Staff[];
  attendanceRecords?: any[];
  onSaveAttendance?: (records: any[]) => void;
  data?: any;
}

export type AttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Late'
  | 'Half Day'
  | 'Personal Leave'
  | 'College Holiday'
  | 'Public Holiday'
  | '';

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  notes: string;
  morning_in?: string;
  break_out?: string;
  break_in?: string;
  final_out?: string;
  total_hours?: number;
  match_score?: number;
  stage?: string;
  operator_notes?: string;
  whatsapp_status?: string;
  whatsapp_sent_at?: string;
  whatsapp_error?: string;
  snapshotUrl?: string;
  snapshot_url?: string;
  verificationMethod?: string;
  verification_method?: string;
  checkInTime?: string;
  check_in_time?: string;
  checkOutTime?: string;
  check_out_time?: string;
}

interface AuditSnapshotData {
  staffName: string;
  staffId: string;
  role: string;
  registeredPhoto?: string;
  entrySnapshotUrl?: string | null;
  exitSnapshotUrl?: string | null;
  snapshotUrl?: string | null;
  checkInTime?: string;
  checkOutTime?: string;
  status?: string;
  date: string;
}

function getStaffBiometrics(entry?: Partial<AttendanceRecord>): {
  entrySnapshot: string | null;
  exitSnapshot: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  isBiometric: boolean;
} {
  if (!entry) return { entrySnapshot: null, exitSnapshot: null, checkInTime: null, checkOutTime: null, isBiometric: false };
  let entrySnap: string | null = (entry as any).entrySnapshotUrl || (entry as any).entry_snapshot_url || null;
  let exitSnap: string | null = (entry as any).exitSnapshotUrl || (entry as any).exit_snapshot_url || null;
  let checkIn = entry.checkInTime || (entry as any).check_in_time || null;
  let checkOut = entry.checkOutTime || (entry as any).check_out_time || null;
  let isBio = Boolean(
    entrySnap ||
    exitSnap ||
    entry.verificationMethod === 'face_biometric' ||
    (entry as any).verification_method === 'face_biometric' ||
    entry.verificationMethod === 'secugen_fingerprint' ||
    (entry as any).verification_method === 'secugen_fingerprint'
  );

  if (entry.notes && typeof entry.notes === 'string' && entry.notes.startsWith('{')) {
    try {
      const p = JSON.parse(entry.notes);
      if ('entry_snapshot' in p) entrySnap = p.entry_snapshot;
      if ('exit_snapshot' in p) exitSnap = p.exit_snapshot;
      if (p.snapshot && !entrySnap && !exitSnap) entrySnap = p.snapshot;
      if (p.check_in_time && !checkIn) checkIn = p.check_in_time;
      if (p.check_out_time && !checkOut) checkOut = p.check_out_time;
      if (p.verification_method?.includes('biometric') || p.method?.includes('biometric')) isBio = true;
    } catch {}
  }

  if (!entrySnap && !exitSnap && ((entry as any).snapshotUrl || (entry as any).snapshot_url)) {
    const snap = (entry as any).snapshotUrl || (entry as any).snapshot_url;
    if (checkOut && !checkIn) {
      exitSnap = snap;
    } else {
      entrySnap = snap;
    }
  }

  return { entrySnapshot: entrySnap, exitSnapshot: exitSnap, checkInTime: checkIn, checkOutTime: checkOut, isBiometric: isBio || Boolean(entrySnap || exitSnap) };
}

function getSnapshotUrl(entry?: Partial<AttendanceRecord>): string | null {
  if (!entry) return null;
  const bio = getStaffBiometrics(entry);
  return bio.entrySnapshot || bio.exitSnapshot || null;
}

export default function StaffAttendance({ staffList, attendanceRecords = [], onSaveAttendance, data }: StaffAttendanceProps) {
  // Global Biometric Context
  const {
    scannerStatus,
    refreshScannerStatus,
    isCapturing,
    isAutoScanActive,
    setIsAutoScanActive,
    punchMode,
    setPunchMode,
    soundEnabled,
    setSoundEnabled,
    staffRamCache,
    todayAttendance,
    lastMatch,
    undoLastScan,
    manualOverrideAttendance,
    retryWhatsApp,
    resendAllFailedWhatsApp,
    isRetryingWhatsApp,
    openReEnrollModal,
    reEnrollModalStaff,
    closeReEnrollModal,
    collegeStartTime,
    collegeEndTime,
    collegeGraceMinutes,
    updateDutyTiming,
    setIsBiometricDeskModalOpen,
  } = useBiometricAttendance();

  const [activeTab, setActiveTab] = useState<'daily' | 'report'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [reportStaffFilter, setReportStaffFilter] = useState<string>('all');
  const [reportSubTab, setReportSubTab] = useState<'rollup' | 'daybyday'>('rollup');
  const [searchTerm, setSearchTerm] = useState('');
  const [auditSnapshot, setAuditSnapshot] = useState<AuditSnapshotData | null>(null);
  const [selectedDossierStaff, setSelectedDossierStaff] = useState<Staff | null>(null);

  // Duty Timing Allotment Modal State
  const [isTimingModalOpen, setIsTimingModalOpen] = useState(false);
  const [customStartTime, setCustomStartTime] = useState(collegeStartTime || '07:54');
  const [customEndTime, setCustomEndTime] = useState(collegeEndTime || '14:00');
  const [customGraceMinutes, setCustomGraceMinutes] = useState(collegeGraceMinutes ?? 5);
  const [isSavingTiming, setIsSavingTiming] = useState(false);

  useEffect(() => {
    setCustomStartTime(collegeStartTime || '07:54');
  }, [collegeStartTime]);

  useEffect(() => {
    setCustomEndTime(collegeEndTime || '14:00');
  }, [collegeEndTime]);

  useEffect(() => {
    setCustomGraceMinutes(collegeGraceMinutes ?? 5);
  }, [collegeGraceMinutes]);

  // Scanner Dock Collapse State
  const [isScannerDockOpen, setIsScannerDockOpen] = useState<boolean>(true);

  // Modals
  const [isBiometricEnrollOpen, setIsBiometricEnrollOpen] = useState(false);
  const [isBiometricDeskOpen, setIsBiometricDeskOpen] = useState(false);
  const [biometricTargetStaff, setBiometricTargetStaff] = useState<any | null>(null);

  // Historical records state
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Editing state for inline time adjustments
  const [editingCell, setEditingCell] = useState<{ staffId: string; stage: 'morning_in' | 'break_out' | 'break_in' | 'final_out' } | null>(null);
  const [editingTimeValue, setEditingTimeValue] = useState<string>('');

  useEffect(() => {
    if (attendanceRecords && attendanceRecords.length > 0) {
      setRecords(attendanceRecords);
    } else {
      const stored = safeLocalStorage.getItem('staffAttendanceRecords');
      if (stored) {
        try {
          setRecords(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse attendance records', e);
        }
      }
    }
  }, [attendanceRecords]);

  // Synchronize with live today punches
  const isViewingToday = selectedDate === getTodayDateStr();

  // Merge daily entries: If today, prefer `todayAttendance` from BiometricAttendanceContext
  const dailyEntries = useMemo(() => {
    const map: Record<string, any> = {};

    staffList.forEach((staff) => {
      let rec: any = null;
      if (isViewingToday) {
        rec = todayAttendance.find((r: any) => (r.staff_id || r.staffId) === staff.id);
      }
      if (!rec) {
        rec = records.find((r: any) => (r.staffId || r.staff_id) === staff.id && r.date === selectedDate);
      }

      if (rec) {
        // Parse fields
        const parsed = parseAttendanceNotesAndTime(
          rec.notes,
          rec.morning_in || rec.check_in || rec.checkIn || rec.check_in_time,
          rec.final_out || rec.check_out || rec.checkOut || rec.check_out_time
        );

        const morningIn = rec.morning_in || parsed.checkIn || (rec.checkIn && rec.checkIn !== '08:00' ? rec.checkIn : null);
        const breakOut = rec.break_out || parsed.breakOut || null;
        const breakIn = rec.break_in || parsed.breakIn || null;
        const finalOut = rec.final_out || parsed.checkOut || (rec.checkOut && rec.checkOut !== '14:00' ? rec.checkOut : null);
        const totalHours = rec.total_hours !== undefined ? rec.total_hours : calculateWorkingHours(morningIn, breakOut, breakIn, finalOut);

        map[staff.id] = {
          ...rec,
          staffId: staff.id,
          date: selectedDate,
          status: rec.status || 'Present',
          morningIn,
          breakOut,
          breakIn,
          finalOut,
          totalHours,
          operatorNotes: rec.operator_notes || parsed.cleanRemarks || '',
          whatsappStatus: rec.whatsapp_status || 'pending',
          whatsappSentAt: rec.whatsapp_sent_at || null,
          whatsappError: rec.whatsapp_error || null,
        };
      } else {
        map[staff.id] = {
          staffId: staff.id,
          date: selectedDate,
          status: 'Present',
          morningIn: null,
          breakOut: null,
          breakIn: null,
          finalOut: null,
          totalHours: null,
          operatorNotes: '',
          whatsappStatus: 'pending',
        };
      }
    });

    return map;
  }, [staffList, isViewingToday, todayAttendance, records, selectedDate]);

  // Handle stage time edit commit
  const handleSaveStageTime = async (staffId: string, stage: 'morning_in' | 'break_out' | 'break_in' | 'final_out', timeStr: string) => {
    setEditingCell(null);
    const updates: any = {};
    if (stage === 'morning_in') updates.morningIn = timeStr || null;
    if (stage === 'break_out') updates.breakOut = timeStr || null;
    if (stage === 'break_in') updates.breakIn = timeStr || null;
    if (stage === 'final_out') updates.finalOut = timeStr || null;

    await manualOverrideAttendance(staffId, updates);
  };

  // Handle stage clear punch
  const handleClearStage = async (staffId: string, stage: 'morning_in' | 'break_out' | 'break_in' | 'final_out') => {
    const updates: any = {};
    if (stage === 'morning_in') updates.morningIn = null;
    if (stage === 'break_out') updates.breakOut = null;
    if (stage === 'break_in') updates.breakIn = null;
    if (stage === 'final_out') updates.finalOut = null;

    await manualOverrideAttendance(staffId, updates);
    toast.info(`Cleared punch for ${stage.replace('_', ' ')}`);
  };

  // Handle status change
  const handleStatusChange = async (staffId: string, newStatus: string) => {
    await manualOverrideAttendance(staffId, { status: newStatus });
  };

  // Handle operator notes change
  const handleNotesChange = async (staffId: string, newNotes: string) => {
    await manualOverrideAttendance(staffId, { notes: newNotes });
  };

  // Reset fingerprint for a teacher
  const handleResetFinger = async (staff: Staff, fingerType: 'all' | 'primary' | 'secondary') => {
    if (!confirm(`Are you sure you want to reset/clear ${fingerType === 'all' ? 'both fingerprints' : fingerType + ' finger'} for ${staff.fullName}?`)) {
      return;
    }

    try {
      if (isSupabaseConfigured) {
        const updates: any = {};
        if (fingerType === 'all') {
          updates.primary_finger_template = null;
          updates.secondary_finger_template = null;
          updates.fingerprint_template = null;
          updates.fingerprint_finger = null;
          updates.fingerprint_enrolled_at = null;
        } else if (fingerType === 'primary') {
          updates.primary_finger_template = null;
        } else if (fingerType === 'secondary') {
          updates.secondary_finger_template = null;
        }

        await supabase.from('staff').update(updates).eq('id', staff.id);
      }

      toast.success(`Fingerprint reset for ${staff.fullName}`);
      data?.fetchData?.(true);
    } catch (err) {
      console.error('Failed to reset fingerprint:', err);
      toast.error('Failed to reset fingerprint');
    }
  };

  // Count failed WhatsApp notices for today
  const failedWhatsAppCount = useMemo(() => {
    return Object.values(dailyEntries).filter((e) => e.whatsappStatus === 'failed').length;
  }, [dailyEntries]);

  // Filter staff who are marked Absent, Personal Leave, or Half Day and have NOT been notified yet today
  const pendingAbsentsAndLeaves = useMemo(() => {
    return (staffList || []).filter((staff) => {
      const entry = dailyEntries[staff.id];
      if (!entry) return false;
      const isAbsentOrLeave =
        entry.status === 'Absent' ||
        entry.status === 'Personal Leave' ||
        entry.status === 'Half Day';
      return isAbsentOrLeave && entry.whatsappStatus !== 'sent';
    });
  }, [staffList, dailyEntries]);

  const [isNotifyingAbsents, setIsNotifyingAbsents] = useState(false);

  // Dispatch WhatsApp ONLY to Absent and Leave staff members (Present/Late faculty are NEVER messaged)
  const handleNotifyAbsentsAndLeaves = async () => {
    if (pendingAbsentsAndLeaves.length === 0) {
      toast.info('No pending absent or leave staff members to notify for this date.');
      return;
    }

    setIsNotifyingAbsents(true);
    let sentCount = 0;
    let failedCount = 0;

    for (const staff of pendingAbsentsAndLeaves) {
      const entry = dailyEntries[staff.id];
      try {
        const ok = await sendAutoStaffDailyCheckInNotice(staff, {
          date: selectedDate,
          status: entry.status,
          notes: entry.operatorNotes || '',
        });

        if (ok) {
          sentCount++;
          // Update DB whatsapp_status
          if (isSupabaseConfigured) {
            await supabase
              .from('staff_attendance')
              .update({
                whatsapp_status: 'sent',
                whatsapp_sent_at: new Date().toISOString(),
              })
              .eq('staff_id', staff.id)
              .eq('date', selectedDate);
          }
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    setIsNotifyingAbsents(false);
    if (sentCount > 0) {
      toast.success(`Dispatched WhatsApp notices to ${sentCount} absent/leave faculty members.`, {
        description: 'All Present faculty were completely skipped to prevent duplicate messages.',
      });
      data?.fetchData?.(true);
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} notifications could not be sent. Check WhatsApp connection.`);
    }
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const name = (s.fullName || '').toLowerCase();
      const id = (s.id || '').toLowerCase();
      const q = searchTerm.toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [staffList, searchTerm]);

  // Compute Monthly Rollup Stats for a Staff Member
  const getMonthlyStats = useCallback(
    (staffId: string) => {
      const monthRecords = records.filter(
        (r) => (r.staffId === staffId || (r as any).staff_id === staffId) && r.date.startsWith(reportMonth)
      );

      let present = 0;
      let absent = 0;
      let late = 0;
      let halfDay = 0;
      let personalLeave = 0;
      let collegeHoliday = 0;
      let publicHoliday = 0;
      let totalWorkingDays = 0;
      let totalHours = 0;
      let breakTakenCount = 0;
      let noBreakCount = 0;
      let waDelivered = 0;

      monthRecords.forEach((r: any) => {
        if (['Present', 'Late', 'Half Day'].includes(r.status)) {
          totalWorkingDays++;
        }

        switch (r.status) {
          case 'Present':
            present++;
            break;
          case 'Absent':
            absent++;
            break;
          case 'Late':
            late++;
            break;
          case 'Half Day':
            halfDay++;
            break;
          case 'Personal Leave':
            personalLeave++;
            break;
          case 'College Holiday':
            collegeHoliday++;
            break;
          case 'Public Holiday':
            publicHoliday++;
            break;
        }

        // Parse timing
        const parsed = parseAttendanceNotesAndTime(
          r.notes,
          r.morning_in || r.check_in || r.checkIn,
          r.final_out || r.check_out || r.checkOut
        );

        if (parsed.breakOut) {
          breakTakenCount++;
        } else if (parsed.checkIn && parsed.checkOut) {
          noBreakCount++;
        }

        const hrs = r.total_hours !== undefined ? Number(r.total_hours) : calculateWorkingHours(parsed.checkIn, parsed.breakOut, parsed.breakIn, parsed.checkOut);
        if (hrs && !isNaN(hrs)) {
          totalHours += hrs;
        }

        if (r.whatsapp_status === 'sent') {
          waDelivered++;
        }
      });

      return {
        present,
        absent,
        late,
        halfDay,
        personalLeave,
        collegeHoliday,
        publicHoliday,
        totalWorkingDays,
        totalHours: Math.round(totalHours * 10) / 10,
        breakTakenCount,
        noBreakCount,
        waDelivered,
      };
    },
    [records, reportMonth]
  );

  // Helper for Finger badge
  const renderFingerBadge = (staff: Staff) => {
    // Check RAM cache first
    const cached = staffRamCache.find((s) => s.id === staff.id);
    const pTpl = cached?.primaryFingerTemplate || (staff as any).primary_finger_template;
    const sTpl = cached?.secondaryFingerTemplate || (staff as any).secondary_finger_template;
    const fpTpl = cached?.fingerprintTemplate || staff.fingerprintTemplate;

    let count = 0;
    if (pTpl && pTpl.length > 20) count++;
    if (sTpl && sTpl.length > 20) count++;
    if (count === 0 && fpTpl && fpTpl.length > 20) {
      count = fpTpl.includes('|||') ? 2 : 1;
    }

    if (count >= 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={10} className="text-emerald-600" />
          <span>2 Fingers ✓ R-Thumb + R-Index</span>
        </span>
      );
    }
    if (count === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Fingerprint size={10} className="text-amber-600" />
          <span>1 Finger (Thumb)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
        <span>Not Enrolled</span>
      </span>
    );
  };

  // Export Daily Attendance to Excel
  const handleExportDailyExcel = () => {
    const data = filteredStaff.map((staff) => {
      const e = dailyEntries[staff.id];
      return {
        'Staff ID': staff.id,
        'Staff Name': staff.fullName,
        Role: staff.role || staff.designation || 'Faculty',
        Date: selectedDate,
        Status: e?.status || 'Present',
        'Morning In': e?.morningIn || '-',
        'Break Out': e?.breakOut || '-',
        'Break In': e?.breakIn || (e?.morningIn && e?.finalOut ? 'No Break' : '-'),
        'Final Out': e?.finalOut || '-',
        'Total Hours': e?.totalHours ? `${e.totalHours} hrs` : '-',
        'WhatsApp Delivery': e?.whatsappStatus === 'sent' ? 'Delivered' : e?.whatsappStatus === 'failed' ? 'Failed' : 'Pending',
        Notes: e?.operatorNotes || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Attendance');
    XLSX.writeFile(wb, `SCJ_Staff_Daily_Attendance_${selectedDate}.xlsx`);
    toast.success('Daily attendance exported to Excel');
  };

  // Export Daily Attendance to PDF
  const handleExportDailyPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.text('SUPERIOR COLLEGE JAHANIAN', 14, 15);
    doc.setFontSize(10);
    doc.text(`Staff Daily Movement & Attendance Sheet • Date: ${selectedDate}`, 14, 22);

    const rows = filteredStaff.map((staff) => {
      const e = dailyEntries[staff.id];
      return [
        staff.id,
        staff.fullName,
        staff.role || 'Faculty',
        e?.status || 'Present',
        e?.morningIn || '-',
        e?.breakOut || '-',
        e?.breakIn || (e?.morningIn && e?.finalOut ? 'No Break' : '-'),
        e?.finalOut || '-',
        e?.totalHours ? `${e.totalHours} hrs` : '-',
        e?.whatsappStatus === 'sent' ? '✓ Sent' : e?.whatsappStatus === 'failed' ? 'Failed' : '-',
        e?.operatorNotes || '-',
      ];
    });

    autoTable(doc, {
      startY: 28,
      head: [['ID', 'Staff Name', 'Role', 'Status', 'Morning In', 'Break Out', 'Break In', 'Final Out', 'Hours', 'WhatsApp', 'Notes']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [6, 78, 67] },
      styles: { fontSize: 8 },
    });

    doc.save(`SCJ_Staff_Daily_Attendance_${selectedDate}.pdf`);
    toast.success('Daily attendance sheet downloaded as PDF');
  };

  // Export Monthly Rollup to Excel
  const handleExportMonthlyRollupExcel = () => {
    const data = filteredStaff.map((staff) => {
      const stats = getMonthlyStats(staff.id);
      return {
        'Staff ID': staff.id,
        'Staff Name': staff.fullName,
        Role: staff.role || 'Faculty',
        Month: reportMonth,
        'Working Days': stats.totalWorkingDays,
        Present: stats.present,
        Late: stats.late,
        Absent: stats.absent,
        'Personal Leave': stats.personalLeave,
        'Half Day': stats.halfDay,
        'Breaks Taken': stats.breakTakenCount,
        'No-Break Count': stats.noBreakCount,
        'Total Hours': `${stats.totalHours} hrs`,
        'WhatsApp Notices': stats.waDelivered,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Rollup');
    XLSX.writeFile(wb, `SCJ_Staff_Monthly_Rollup_${reportMonth}.xlsx`);
    toast.success('Monthly rollup exported to Excel');
  };

  // Export Monthly Rollup to PDF
  const handleExportMonthlyRollupPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.text('SUPERIOR COLLEGE JAHANIAN', 14, 15);
    doc.setFontSize(10);
    doc.text(`Monthly Faculty Attendance Rollup Report • Month: ${reportMonth}`, 14, 22);

    const rows = filteredStaff.map((staff) => {
      const stats = getMonthlyStats(staff.id);
      return [
        staff.id,
        staff.fullName,
        staff.role || 'Faculty',
        stats.totalWorkingDays,
        stats.present,
        stats.late,
        stats.absent,
        stats.personalLeave,
        stats.halfDay,
        `${stats.breakTakenCount} / ${stats.noBreakCount}`,
        `${stats.totalHours}h`,
        stats.waDelivered,
      ];
    });

    autoTable(doc, {
      startY: 28,
      head: [['ID', 'Name', 'Role', 'Work Days', 'Present', 'Late', 'Absent', 'Leave', 'Half Day', 'Break/NoBreak', 'Hours', 'WA Count']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [6, 78, 67] },
      styles: { fontSize: 8 },
    });

    doc.save(`SCJ_Staff_Monthly_Rollup_${reportMonth}.pdf`);
    toast.success('Monthly rollup PDF downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Top Tab Switcher & Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'daily' ? 'default' : 'outline'}
            onClick={() => setActiveTab('daily')}
            className={cn('rounded-xl font-bold cursor-pointer', activeTab === 'daily' ? 'bg-superior-teal text-white' : '')}
          >
            Daily Attendance Tracker
          </Button>
          <Button
            variant={activeTab === 'report' ? 'default' : 'outline'}
            onClick={() => setActiveTab('report')}
            className={cn('rounded-xl font-bold cursor-pointer', activeTab === 'report' ? 'bg-superior-teal text-white' : '')}
          >
            Monthly Report & Archive
          </Button>
        </div>

        {activeTab === 'daily' && (
          <div className="flex flex-wrap items-center gap-2">
            {pendingAbsentsAndLeaves.length > 0 && (
              <Button
                onClick={handleNotifyAbsentsAndLeaves}
                disabled={isNotifyingAbsents}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs cursor-pointer shadow-md"
                title="Send WhatsApp notices ONLY to Absent or Leave staff members (Present/Late faculty skipped)"
              >
                {isNotifyingAbsents ? <RefreshCw size={13} className="animate-spin mr-1.5" /> : <Send size={13} className="mr-1.5" />}
                <span>Notify Absents & Leaves ({pendingAbsentsAndLeaves.length})</span>
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setIsTimingModalOpen(true)}
              className="rounded-xl border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 font-bold text-xs cursor-pointer shadow-2xs"
              title="Set Custom Duty Start/End Times & Late Arrival Grace Minutes"
            >
              <Clock size={14} className="mr-1.5 text-teal-600" /> Duty Timings ({collegeStartTime} - {collegeEndTime})
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsBiometricDeskOpen(true)}
              className="rounded-xl border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs cursor-pointer shadow-2xs"
              title="Open Fast SecuGen HU20 Biometric Desk Popup Modal (View 2)"
            >
              <Fingerprint size={15} className="mr-1.5 text-amber-600" /> Fast Biometric Desk (Modal)
            </Button>

            <Button
              variant="outline"
              onClick={handleExportDailyExcel}
              className="rounded-xl text-xs font-bold cursor-pointer"
            >
              <Download size={14} className="mr-1.5" /> Excel
            </Button>
            <Button
              variant="outline"
              onClick={handleExportDailyPDF}
              className="rounded-xl text-xs font-bold text-teal-700 border-teal-200 bg-teal-50 hover:bg-teal-100 cursor-pointer"
            >
              <FileText size={14} className="mr-1.5" /> PDF
            </Button>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportMonthlyRollupExcel}
              className="rounded-xl text-xs font-bold cursor-pointer"
            >
              <Download size={14} className="mr-1.5" /> Excel Rollup
            </Button>
            <Button
              variant="outline"
              onClick={handleExportMonthlyRollupPDF}
              className="rounded-xl text-xs font-bold text-teal-700 border-teal-200 bg-teal-50 hover:bg-teal-100 cursor-pointer"
            >
              <FileText size={14} className="mr-1.5" /> PDF Rollup
            </Button>
          </div>
        )}
      </div>

      {/* VIEW 3 ACTIVE BIOMETRIC DOCK: Collapsible Live Biometric Scanner Bar */}
      {activeTab === 'daily' && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl border border-emerald-500/30 p-4 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Hardware Sensor Status Pill */}
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider',
                  scannerStatus.connected && scannerStatus.deviceFound
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                    : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                )}
              >
                <span
                  className={cn(
                    'w-2.5 h-2.5 rounded-full',
                    scannerStatus.connected && scannerStatus.deviceFound
                      ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]'
                      : 'bg-rose-400'
                  )}
                />
                <Fingerprint size={14} />
                <span>
                  {scannerStatus.connected && scannerStatus.deviceFound ? 'SecuGen HU20 Ready' : 'Scanner Offline'}
                </span>
              </div>

              {/* Auto-Scan Toggle */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAutoScanActive((prev) => !prev)}
                className={cn(
                  'h-8 rounded-xl font-black text-xs gap-1.5 border transition-all cursor-pointer',
                  isAutoScanActive
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : 'bg-slate-800 border-white/20 text-slate-400'
                )}
              >
                {isAutoScanActive ? <Pause size={13} /> : <Play size={13} />}
                <span>{isAutoScanActive ? 'Auto-Scan ON' : 'Auto-Scan Paused'}</span>
              </Button>

              {/* Sound Toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                title={soundEnabled ? 'Audio Feedback Enabled' : 'Muted'}
              >
                {soundEnabled ? <Volume2 size={15} className="text-emerald-400" /> : <VolumeX size={15} />}
              </button>
            </div>

            {/* Live Duty Timing & Late Benchmark Pill */}
            <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-teal-500/30 text-xs shadow-inner">
              <Clock size={13} className="text-teal-400 shrink-0" />
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-slate-400 font-bold">Duty:</span>
                <span className="text-white font-extrabold">{collegeStartTime} - {collegeEndTime}</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-300 font-bold">
                  Late after {(() => {
                    const cut = (timeStringToMinutes(collegeStartTime) ?? (7 * 60 + 54)) + (collegeGraceMinutes ?? 5);
                    return `${Math.floor(cut / 60).toString().padStart(2, '0')}:${(cut % 60).toString().padStart(2, '0')}`;
                  })()}
                </span>
                <span className="text-slate-400 text-[10px]">({collegeGraceMinutes}m grace)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTimingModalOpen(true)}
                className="ml-1 px-2 py-0.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/40 text-teal-300 border border-teal-400/30 text-[10px] font-black cursor-pointer transition-all flex items-center gap-1 active:scale-95"
                title="Configure Official Faculty Duty Hours & Late Cutoff"
              >
                <Settings size={11} />
                <span>Duty Timings</span>
              </button>
            </div>

            {/* Stage Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/10">
              {(
                [
                  { id: 'auto', label: 'Smart 4-Stage' },
                  { id: 'checkin', label: 'Morning In' },
                  { id: 'breakout', label: 'Break Out' },
                  { id: 'breakin', label: 'Break In' },
                  { id: 'checkout', label: 'Final Out' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPunchMode(mode.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
                    punchMode === mode.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Batch WhatsApp Retry Button */}
            {failedWhatsAppCount > 0 && (
              <Button
                size="sm"
                onClick={() => resendAllFailedWhatsApp()}
                disabled={isRetryingWhatsApp}
                className="h-8 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold gap-1.5 cursor-pointer"
              >
                {isRetryingWhatsApp ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Resend Failed WhatsApp ({failedWhatsAppCount})</span>
              </Button>
            )}
          </div>

          {/* Last Matched Teacher Banner & Undo Button */}
          {lastMatch && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-emerald-400/50 bg-slate-800 shrink-0">
                  {lastMatch.thumbBmp ? (
                    <img src={lastMatch.thumbBmp} alt="Thumb" className="w-full h-full object-cover" />
                  ) : lastMatch.staff.photo ? (
                    <img src={lastMatch.staff.photo} alt={lastMatch.staff.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <Fingerprint className="text-emerald-400 p-2" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white">{lastMatch.staff.fullName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {lastMatch.stage.toUpperCase()} • {lastMatch.punchTime}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-emerald-300/80">
                    Match Score: <strong className="text-white">{lastMatch.score}/199</strong> (+{lastMatch.margin}pts margin) • RAM Speed: <strong className="text-white">{lastMatch.durationMs}ms</strong>
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => undoLastScan()}
                className="h-8 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-400/50 text-rose-200 text-xs font-black gap-1.5 cursor-pointer"
                title="Rollback this punch and restore previous attendance state"
              >
                <Undo2 size={13} />
                <span>Undo Last Scan</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Main Table Card */}
      <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 px-8 py-6 border-b border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-widest text-superior-teal flex items-center gap-2">
                <span>{activeTab === 'daily' ? 'Daily Attendance Tracker' : 'Monthly Historical Report'}</span>
                {isViewingToday && activeTab === 'daily' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                    LIVE TODAY
                  </span>
                )}
              </CardTitle>
              <p className="text-xs text-slate-500 font-medium tracking-wide mt-1">
                {activeTab === 'daily'
                  ? 'Real-time 4-stage punches with millisecond RAM matching and zero false cross-matching'
                  : 'Teacher monthly rollup table, working hours, and full day-by-day historical archive'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input
                  placeholder="Search staff name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 rounded-xl bg-white border-slate-200 text-xs"
                />
              </div>

              {activeTab === 'daily' ? (
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40 h-10 rounded-xl text-xs"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  <Input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="w-40 h-10 rounded-xl text-xs"
                  />
                  <Select value={reportSubTab} onValueChange={(val: any) => setReportSubTab(val)}>
                    <SelectTrigger className="w-36 h-10 rounded-xl text-xs border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rollup">Teacher Rollup</SelectItem>
                      <SelectItem value="daybyday">Day-by-Day View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* DAILY TAB: Clean 4-Stage Columns + Re-Scan & Mark */}
          {activeTab === 'daily' ? (
            <div className="overflow-x-auto min-h-[400px]">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-64 pl-8 font-black uppercase text-[10px] text-slate-400">Staff Member</TableHead>
                    <TableHead className="w-28 font-black uppercase text-[10px] text-slate-400 text-center">Morning In</TableHead>
                    <TableHead className="w-28 font-black uppercase text-[10px] text-slate-400 text-center">Break Out</TableHead>
                    <TableHead className="w-28 font-black uppercase text-[10px] text-slate-400 text-center">Break In</TableHead>
                    <TableHead className="w-28 font-black uppercase text-[10px] text-slate-400 text-center">Final Out</TableHead>
                    <TableHead className="w-24 font-black uppercase text-[10px] text-slate-400 text-center">Hours</TableHead>
                    <TableHead className="w-36 font-black uppercase text-[10px] text-slate-400">Status</TableHead>
                    <TableHead className="w-48 font-black uppercase text-[10px] text-slate-400">Notes / Reason</TableHead>
                    <TableHead className="w-36 font-black uppercase text-[10px] text-slate-400 pr-8 text-right">WhatsApp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-64 text-center text-slate-500">
                        No staff members found matching criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((staff) => {
                      const entry = dailyEntries[staff.id];
                      const morningIn = entry?.morningIn;
                      const breakOut = entry?.breakOut;
                      const breakIn = entry?.breakIn;
                      const finalOut = entry?.finalOut;
                      const totalHours = entry?.totalHours;
                      const status = entry?.status || 'Present';
                      const operatorNotes = entry?.operatorNotes || '';
                      const waStatus = entry?.whatsappStatus;

                      // Check if morning in was late based on official duty start + grace minutes
                      const cutoffMinutes = (timeStringToMinutes(collegeStartTime) ?? (7 * 60 + 54)) + (collegeGraceMinutes ?? 5);
                      const isLate = morningIn
                        ? (timeStringToMinutes(morningIn) ?? 0) > cutoffMinutes
                        : false;

                      // Map staff to BiometricCachedStaff for Re-Enroll modal
                      const cachedStaff = staffRamCache.find((s) => s.id === staff.id) || {
                        id: staff.id,
                        fullName: staff.fullName,
                        role: staff.role,
                        designation: staff.designation,
                        photo: staff.photo,
                        contact: staff.contact,
                      };

                      return (
                        <TableRow key={staff.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                          {/* Staff Column with Photo, Name, Finger Badge & [Re-Scan & Mark] */}
                          <TableCell className="pl-8 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-superior-teal/10 flex items-center justify-center text-superior-teal font-bold text-xs overflow-hidden border border-slate-200 shrink-0">
                                {staff.photo ? (
                                  <img src={staff.photo} alt={staff.fullName} className="w-full h-full object-cover" />
                                ) : (
                                  staff.fullName.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                                  <span>{staff.fullName}</span>
                                  <span className="font-mono text-[10px] text-slate-400 font-bold">({staff.id})</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {renderFingerBadge(staff)}

                                  {/* [Re-Scan & Mark] Button */}
                                  <button
                                    type="button"
                                    onClick={() => openReEnrollModal(cachedStaff)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-all cursor-pointer"
                                    title="Guided 2-Finger Re-Scan & Auto-Mark Present for Today"
                                  >
                                    <Sparkles size={9} />
                                    <span>Re-Scan & Mark</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Morning In */}
                          <TableCell className="text-center py-3.5">
                            {editingCell?.staffId === staff.id && editingCell?.stage === 'morning_in' ? (
                              <div className="flex items-center gap-1 justify-center">
                                <Input
                                  type="time"
                                  className="h-8 w-24 text-xs font-mono"
                                  value={editingTimeValue}
                                  onChange={(e) => setEditingTimeValue(e.target.value)}
                                  onBlur={() => handleSaveStageTime(staff.id, 'morning_in', editingTimeValue)}
                                  autoFocus
                                />
                              </div>
                            ) : morningIn ? (
                              <div className="inline-flex items-center gap-1.5 group">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-xl border shadow-2xs',
                                    isLate || status === 'Late'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  )}
                                >
                                  <Clock size={11} className={isLate || status === 'Late' ? 'text-amber-600' : 'text-emerald-600'} />
                                  <span>{morningIn}</span>
                                  {(isLate || status === 'Late') && <span className="text-[8px] bg-amber-200 text-amber-900 px-1 rounded uppercase font-black">Late</span>}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleClearStage(staff.id, 'morning_in')}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer"
                                  title="Clear Morning In"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Break Out */}
                          <TableCell className="text-center py-3.5">
                            {breakOut ? (
                              <div className="inline-flex items-center gap-1.5 group">
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-xl shadow-2xs">
                                  <span>{breakOut}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleClearStage(staff.id, 'break_out')}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer"
                                  title="Clear Break Out"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Break In */}
                          <TableCell className="text-center py-3.5">
                            {breakIn ? (
                              <div className="inline-flex items-center gap-1.5 group">
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-teal-50 text-teal-900 border border-teal-300 px-2.5 py-1 rounded-xl shadow-2xs">
                                  <span>{breakIn}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleClearStage(staff.id, 'break_in')}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer"
                                  title="Clear Break In"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : morningIn && finalOut && !breakOut ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                No Break
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Final Out */}
                          <TableCell className="text-center py-3.5">
                            {finalOut ? (
                              <div className="inline-flex items-center gap-1.5 group">
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-blue-50 text-blue-900 border border-blue-300 px-2.5 py-1 rounded-xl shadow-2xs">
                                  <LogOut size={11} className="text-blue-600" />
                                  <span>{finalOut}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleClearStage(staff.id, 'final_out')}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer"
                                  title="Clear Final Out"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Total Hours */}
                          <TableCell className="text-center py-3.5">
                            {totalHours ? (
                              <span className="inline-flex items-center font-mono font-black text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {totalHours}h
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Status Dropdown */}
                          <TableCell className="py-3.5">
                            <Select
                              value={status}
                              onValueChange={(val) => handleStatusChange(staff.id, val)}
                            >
                              <SelectTrigger className="h-9 rounded-xl border-slate-200 text-xs font-bold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Present">Present</SelectItem>
                                <SelectItem value="Late">Late</SelectItem>
                                <SelectItem value="Absent">Absent</SelectItem>
                                <SelectItem value="Half Day">Half Day</SelectItem>
                                <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                                <SelectItem value="College Holiday">College Holiday</SelectItem>
                                <SelectItem value="Public Holiday">Public Holiday</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Notes / Reason Column (Clean text, NEVER raw JSON!) */}
                          <TableCell className="py-3.5">
                            <Input
                              placeholder="Reason / notes..."
                              defaultValue={operatorNotes}
                              onBlur={(e) => handleNotesChange(staff.id, e.target.value)}
                              className="h-9 rounded-xl text-xs border-slate-200"
                            />
                          </TableCell>

                          {/* WhatsApp Audit & Retry */}
                          <TableCell className="pr-8 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {waStatus === 'sent' ? (
                                <span
                                  className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200"
                                  title={`Delivered via WhatsApp at ${entry.whatsappSentAt ? new Date(entry.whatsappSentAt).toLocaleTimeString() : 'N/A'}`}
                                >
                                  <CheckCircle2 size={11} className="text-emerald-600" />
                                  <span>✓ WA Sent</span>
                                </span>
                              ) : waStatus === 'failed' ? (
                                <div className="flex items-center gap-1">
                                  <span
                                    className="inline-flex items-center gap-1 font-bold text-[10px] text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200"
                                    title={entry.whatsappError || 'Delivery failed or phone offline'}
                                  >
                                    <AlertTriangle size={11} className="text-rose-600" />
                                    <span>Failed</span>
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => retryWhatsApp(entry, staff)}
                                    className="h-7 px-2 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 rounded-lg cursor-pointer"
                                  >
                                    Retry
                                  </Button>
                                </div>
                              ) : ['Absent', 'Personal Leave', 'Half Day'].includes(status) ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      const ok = await sendAutoStaffDailyCheckInNotice(staff, {
                                        date: selectedDate,
                                        status,
                                        notes: operatorNotes || '',
                                      });
                                      if (ok) {
                                        toast.success(`Dispatched ${status} notice to ${staff.fullName}`);
                                        if (isSupabaseConfigured) {
                                          await supabase
                                            .from('staff_attendance')
                                            .update({
                                              whatsapp_status: 'sent',
                                              whatsapp_sent_at: new Date().toISOString(),
                                            })
                                            .eq('staff_id', staff.id)
                                            .eq('date', selectedDate);
                                        }
                                        data?.fetchData?.(true);
                                      } else {
                                        toast.error(`Could not deliver WhatsApp notice to ${staff.fullName}`);
                                      }
                                    } catch {
                                      toast.error(`Failed to send WhatsApp message`);
                                    }
                                  }}
                                  className="h-7 px-2 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200 rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title={`Send WhatsApp ${status} notice to ${staff.fullName}`}
                                >
                                  <Send size={10} />
                                  <span>Notify {status === 'Absent' ? 'Absent' : 'Leave'}</span>
                                </Button>
                              ) : (
                                <span className="text-slate-300 font-mono text-xs">—</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          ) : reportSubTab === 'rollup' ? (
            /* MONTHLY TAB: TEACHER ROLLUP TABLE */
            <div className="overflow-x-auto min-h-[400px]">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="pl-8 font-black uppercase text-[10px] text-slate-400">Staff Member</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 text-center">Work Days</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-emerald-600 text-center">Present</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-amber-600 text-center">Late</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-rose-600 text-center">Absent</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-blue-600 text-center">Leave</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-600 text-center">Break / No Break</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-800 text-center">Total Hours</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-emerald-700 text-center">WhatsApp Sent</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 pr-8 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-64 text-center text-slate-500">
                        No staff members found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((staff) => {
                      const stats = getMonthlyStats(staff.id);
                      return (
                        <TableRow key={staff.id} className="hover:bg-slate-50 border-b border-slate-100">
                          <TableCell className="pl-8 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs overflow-hidden">
                                {staff.photo ? (
                                  <img src={staff.photo} alt={staff.fullName} className="w-full h-full object-cover" />
                                ) : (
                                  staff.fullName.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 text-sm">{staff.fullName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">ID: {staff.id} • {staff.role || 'Faculty'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-700 bg-slate-50/50">{stats.totalWorkingDays}</TableCell>
                          <TableCell className="text-center font-bold text-emerald-600">{stats.present}</TableCell>
                          <TableCell className="text-center font-bold text-amber-600">{stats.late > 0 ? stats.late : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-rose-600">{stats.absent > 0 ? stats.absent : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-blue-600">{stats.personalLeave > 0 ? stats.personalLeave : '-'}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-slate-600">
                            {stats.breakTakenCount} / {stats.noBreakCount}
                          </TableCell>
                          <TableCell className="text-center font-mono font-black text-slate-800">{stats.totalHours}h</TableCell>
                          <TableCell className="text-center font-mono font-bold text-emerald-700">{stats.waDelivered}</TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 font-bold text-xs gap-1 shadow-2xs cursor-pointer"
                                onClick={() => sendAutoStaffAttendancePdfNotice(staff.id, staff.contact, reportMonth)}
                                title="Send Cumulative Attendance PDF to Teacher WhatsApp"
                              >
                                📄 WA PDF
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 font-bold text-xs gap-1 shadow-2xs cursor-pointer"
                                onClick={() => setSelectedDossierStaff(staff)}
                                title="Open 30-Day Biometric Attendance Dossier"
                              >
                                <Eye size={13} /> Dossier
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
          ) : (
            /* MONTHLY TAB: DAY-BY-DAY HISTORICAL BREAKDOWN */
            <div className="overflow-x-auto min-h-[400px] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="font-extrabold text-sm text-slate-800">
                  Day-by-Day Biometric & 4-Stage History for {reportMonth}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Filter Teacher:</span>
                  <select
                    value={reportStaffFilter}
                    onChange={(e) => setReportStaffFilter(e.target.value)}
                    className="h-9 rounded-xl border border-slate-200 text-xs px-3 bg-white font-bold"
                  >
                    <option value="all">All Faculty & Staff</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} ({st.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-24 pl-4 font-black uppercase text-[10px] text-slate-400">Date</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400">Staff Member</TableHead>
                    <TableHead className="w-28 font-black uppercase text-[10px] text-slate-400 text-center">Status</TableHead>
                    <TableHead className="w-28 font-black uppercase text-[10px] text-slate-400 text-center">Morning In</TableHead>
                    <TableHead className="w-28 font-black uppercase text-[10px] text-slate-400 text-center">Break Out</TableHead>
                    <TableHead className="w-28 font-black uppercase text-[10px] text-slate-400 text-center">Break In</TableHead>
                    <TableHead className="w-28 font-black uppercase text-[10px] text-slate-400 text-center">Final Out</TableHead>
                    <TableHead className="w-24 font-black uppercase text-[10px] text-slate-400 text-center">Hours</TableHead>
                    <TableHead className="w-36 font-black uppercase text-[10px] text-slate-400 pr-4 text-right">Verification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const monthRecs = records.filter(
                      (r) =>
                        r.date.startsWith(reportMonth) &&
                        (reportStaffFilter === 'all' || r.staffId === reportStaffFilter || (r as any).staff_id === reportStaffFilter)
                    );

                    if (monthRecs.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={9} className="h-48 text-center text-slate-400">
                            No attendance records found for {reportMonth}.
                          </TableCell>
                        </TableRow>
                      );
                    }

                    // Sort descending by date
                    monthRecs.sort((a, b) => b.date.localeCompare(a.date));

                    return monthRecs.map((rec: any) => {
                      const st = staffList.find((s) => s.id === (rec.staffId || rec.staff_id));
                      const parsed = parseAttendanceNotesAndTime(
                        rec.notes,
                        rec.morning_in || rec.check_in || rec.checkIn,
                        rec.final_out || rec.check_out || rec.checkOut
                      );

                      return (
                        <TableRow key={rec.id} className="hover:bg-slate-50 border-b border-slate-100">
                          <TableCell className="pl-4 font-mono text-xs font-bold text-slate-700">{rec.date}</TableCell>
                          <TableCell className="font-bold text-xs text-slate-800">{st?.fullName || rec.staffId}</TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                                rec.status === 'Present'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : rec.status === 'Late'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              )}
                            >
                              {rec.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">{rec.morning_in || parsed.checkIn || '-'}</TableCell>
                          <TableCell className="text-center font-mono text-xs">{rec.break_out || parsed.breakOut || '-'}</TableCell>
                          <TableCell className="text-center font-mono text-xs">{rec.break_in || parsed.breakIn || '-'}</TableCell>
                          <TableCell className="text-center font-mono text-xs">{rec.final_out || parsed.checkOut || '-'}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-xs">
                            {rec.total_hours ? `${rec.total_hours}h` : '-'}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <span className="text-[10px] font-mono text-slate-500">
                              {rec.verification_method || rec.verificationMethod || 'Biometric'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guided Morning Re-Scan & Auto-Mark Present Modal */}
      {reEnrollModalStaff && (
        <BiometricReEnrollModal staff={reEnrollModalStaff} onClose={closeReEnrollModal} />
      )}

      {/* Fast SecuGen HU20 Biometric Desk Fullscreen Modal (View 2) */}
      {isBiometricDeskOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950 animate-in fade-in duration-150">
          <BiometricAttendanceDesk
            collegeLogo={data?.settings?.logo || '/superior-logo.png'}
            collegeName={data?.settings?.collegeName || 'Superior College Jahanian'}
            staffListProp={staffList}
            staffAttendanceProp={records}
            settingsProp={data?.settings}
            onAttendanceMarked={() => {
              data?.fetchData?.(true);
            }}
            onBackToApp={() => {
              setIsBiometricDeskOpen(false);
              data?.fetchData?.(true);
            }}
          />
        </div>
      )}

      {/* Custom Faculty Duty Timing Allotment Modal */}
      {isTimingModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Faculty Duty Timings</h3>
                  <p className="text-xs text-slate-300">Official In & Out Times for Late Calculation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTimingModalOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Quick Shift Presets</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStartTime('07:54');
                      setCustomEndTime('14:00');
                      setCustomGraceMinutes(5);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left transition-all cursor-pointer"
                  >
                    <div className="font-extrabold text-xs text-slate-800">Standard</div>
                    <div className="text-[10px] text-slate-500 font-mono">07:54 - 14:00</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStartTime('07:45');
                      setCustomEndTime('13:45');
                      setCustomGraceMinutes(5);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left transition-all cursor-pointer"
                  >
                    <div className="font-extrabold text-xs text-slate-800">Summer</div>
                    <div className="text-[10px] text-slate-500 font-mono">07:45 - 13:45</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStartTime('08:15');
                      setCustomEndTime('14:15');
                      setCustomGraceMinutes(10);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left transition-all cursor-pointer"
                  >
                    <div className="font-extrabold text-xs text-slate-800">Winter</div>
                    <div className="text-[10px] text-slate-500 font-mono">08:15 - 14:15</div>
                  </button>
                </div>
              </div>

              {/* Morning Start Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Morning Duty Start Time (In Time)</span>
                  <span className="text-[10px] text-teal-700 font-extrabold uppercase">Arrival Benchmark</span>
                </label>
                <Input
                  type="time"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="font-mono text-sm h-11 rounded-xl"
                />
              </div>

              {/* Grace Minutes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Late Arrival Grace Period (Minutes)</span>
                  <span className="text-[10px] text-amber-700 font-extrabold uppercase">Cutoff Threshold</span>
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={customGraceMinutes}
                    onChange={(e) => setCustomGraceMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="font-mono text-sm h-11 rounded-xl w-24 text-center font-bold"
                  />
                  <div className="text-xs text-slate-500 leading-tight">
                    Arrival after <strong className="text-slate-800 font-mono font-bold">{(() => {
                      const cut = (timeStringToMinutes(customStartTime) ?? (7 * 60 + 54)) + customGraceMinutes;
                      return `${Math.floor(cut / 60).toString().padStart(2, '0')}:${(cut % 60).toString().padStart(2, '0')}`;
                    })()}</strong> is flagged as <span className="text-rose-600 font-black">LATE</span>.
                  </div>
                </div>
              </div>

              {/* Off-Duty End Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Off-Duty Shift End Time (Out Time)</span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase">Final Departure</span>
                </label>
                <Input
                  type="time"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  className="font-mono text-sm h-11 rounded-xl"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => setIsTimingModalOpen(false)}
                  className="rounded-xl font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setIsSavingTiming(true);
                    try {
                      await updateDutyTiming(customStartTime, customEndTime, customGraceMinutes);
                      setIsTimingModalOpen(false);
                      data?.fetchData?.(true);
                    } catch (e) {
                      toast.error('Failed to update duty timings');
                    } finally {
                      setIsSavingTiming(false);
                    }
                  }}
                  disabled={isSavingTiming}
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs gap-1.5 cursor-pointer shadow-md"
                >
                  {isSavingTiming ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Save & Recalculate</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 30-Day Biometric Staff Attendance Dossier Modal */}
      {selectedDossierStaff && (() => {
        const stats = getMonthlyStats(selectedDossierStaff.id);
        const [yearStr, monthStr] = reportMonth.split('-');
        const year = parseInt(yearStr) || new Date().getFullYear();
        const month = parseInt(monthStr) || new Date().getMonth() + 1;
        const daysInMonth = new Date(year, month, 0).getDate();

        // Query records for this staff member in reportMonth
        const staffMonthRecords = records.filter(
          (r: any) =>
            (r.staffId || r.staff_id) === selectedDossierStaff.id &&
            r.date &&
            r.date.startsWith(reportMonth)
        );

        const daysList = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${reportMonth}-${String(d).padStart(2, '0')}`;
          const jsDate = new Date(year, month - 1, d);
          const dayName = jsDate.toLocaleDateString('en-US', { weekday: 'short' });
          const isSunday = jsDate.getDay() === 0;

          let rec = staffMonthRecords.find((r: any) => r.date === dateStr);
          if (!rec && dateStr === getTodayDateStr()) {
            rec = todayAttendance.find(
              (r: any) => (r.staff_id || r.staffId) === selectedDossierStaff.id && r.date === dateStr
            );
          }

          const parsed = rec
            ? parseAttendanceNotesAndTime(
                rec.notes,
                rec.morning_in || rec.check_in || rec.checkIn,
                rec.final_out || rec.check_out || rec.checkOut
              )
            : { checkIn: null, breakOut: null, breakIn: null, checkOut: null, cleanRemarks: '' };

          const morningIn = rec?.morning_in || parsed.checkIn || (rec?.checkIn && rec?.checkIn !== '08:00' ? rec?.checkIn : null);
          const breakOut = rec?.break_out || parsed.breakOut || null;
          const breakIn = rec?.break_in || parsed.breakIn || null;
          const finalOut = rec?.final_out || parsed.checkOut || (rec?.checkOut && rec?.checkOut !== '14:00' ? rec?.checkOut : null);
          const totalHours = rec?.total_hours !== undefined ? rec.total_hours : calculateWorkingHours(morningIn, breakOut, breakIn, finalOut);
          const status = rec?.status || (isSunday ? 'Sunday Holiday' : 'Not Marked');
          const notes = rec?.operator_notes || parsed.cleanRemarks || '';
          const waStatus = rec?.whatsapp_status || 'pending';

          daysList.push({
            date: dateStr,
            dayNum: d,
            dayName,
            isSunday,
            morningIn,
            breakOut,
            breakIn,
            finalOut,
            totalHours,
            status,
            notes,
            waStatus,
            hasRecord: !!rec,
          });
        }

        // Export individual staff monthly PDF
        const handleExportIndividualPDF = () => {
          const doc = new jsPDF();
          doc.setFontSize(14);
          doc.text('SUPERIOR COLLEGE JAHANIAN', 14, 15);
          doc.setFontSize(10);
          doc.text(`Faculty 30-Day Biometric Attendance Dossier • ${selectedDossierStaff.fullName} (${selectedDossierStaff.id})`, 14, 22);
          doc.text(`Month: ${reportMonth} • Role: ${selectedDossierStaff.role || 'Faculty'} • Phone: ${selectedDossierStaff.contact || 'N/A'}`, 14, 28);

          const tableRows = daysList.map((d) => [
            `${d.date} (${d.dayName})`,
            d.status,
            d.morningIn || '—',
            d.breakOut || '—',
            d.breakIn || '—',
            d.finalOut || '—',
            d.totalHours !== null && d.totalHours !== undefined ? `${d.totalHours}h` : '—',
            d.notes || (d.isSunday ? 'Weekly Off' : '—'),
          ]);

          autoTable(doc, {
            startY: 33,
            head: [['Date', 'Status', 'In', 'Break Out', 'Break In', 'Out', 'Hours', 'Remarks']],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [6, 78, 67] },
            styles: { fontSize: 8 },
          });

          doc.save(`SCJ_Attendance_${selectedDossierStaff.id}_${reportMonth}.pdf`);
          toast.success(`Dossier PDF downloaded for ${selectedDossierStaff.fullName}`);
        };

        return (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[10000] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 select-none">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold overflow-hidden shrink-0 shadow-inner">
                    {selectedDossierStaff.photo ? (
                      <img src={selectedDossierStaff.photo} alt={selectedDossierStaff.fullName} className="w-full h-full object-cover" />
                    ) : (
                      (selectedDossierStaff.fullName || 'S').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-white">{selectedDossierStaff.fullName}</h3>
                      <span className="font-mono text-xs text-amber-300 font-bold">({selectedDossierStaff.id})</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {selectedDossierStaff.role || selectedDossierStaff.designation || 'Faculty Member'} • Phone: <strong className="text-emerald-300">{selectedDossierStaff.contact || 'N/A'}</strong>
                    </p>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendAutoStaffAttendancePdfNotice(selectedDossierStaff.id, selectedDossierStaff.contact, reportMonth)}
                    className="h-8 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-400/40 text-xs font-bold gap-1 cursor-pointer"
                    title="Send Full Month Cumulative Attendance PDF to Teacher WhatsApp"
                  >
                    📄 Send WA PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportIndividualPDF}
                    className="h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold gap-1 cursor-pointer"
                    title="Download Official PDF Dossier"
                  >
                    <Download size={13} /> Export PDF
                  </Button>
                  <button
                    onClick={() => setSelectedDossierStaff(null)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Quick Metric Rollup Strip */}
              <div className="bg-slate-50 border-b border-slate-100 p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 shrink-0 text-center">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Work Days</div>
                  <div className="text-base font-black text-slate-800">{stats.totalWorkingDays}</div>
                </div>
                <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">Present</div>
                  <div className="text-base font-black text-emerald-800">{stats.present}</div>
                </div>
                <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                  <div className="text-[10px] font-bold text-amber-700 uppercase">Late</div>
                  <div className="text-base font-black text-amber-800">{stats.late}</div>
                </div>
                <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-200 shadow-2xs">
                  <div className="text-[10px] font-bold text-rose-700 uppercase">Absent</div>
                  <div className="text-base font-black text-rose-800">{stats.absent}</div>
                </div>
                <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Leaves</div>
                  <div className="text-base font-black text-blue-800">{stats.personalLeave}</div>
                </div>
                <div className="bg-teal-50/50 p-2.5 rounded-xl border border-teal-200 shadow-2xs">
                  <div className="text-[10px] font-bold text-teal-700 uppercase">Total Hours</div>
                  <div className="text-base font-black text-teal-800">{stats.totalHours}h</div>
                </div>
                <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">WA Delivered</div>
                  <div className="text-base font-black text-emerald-800">{stats.waDelivered}</div>
                </div>
              </div>

              {/* Day-by-Day Historical Attendance Table */}
              <div className="overflow-y-auto max-h-[58vh] p-4 flex-1">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-xs">
                    <TableRow>
                      <TableHead className="w-28 pl-4 font-black uppercase text-[10px] text-slate-400">Date & Day</TableHead>
                      <TableHead className="w-28 font-black uppercase text-[10px] text-slate-400 text-center">Status</TableHead>
                      <TableHead className="w-24 font-black uppercase text-[10px] text-slate-400 text-center">Morning In</TableHead>
                      <TableHead className="w-24 font-black uppercase text-[10px] text-slate-400 text-center">Break Out</TableHead>
                      <TableHead className="w-24 font-black uppercase text-[10px] text-slate-400 text-center">Break In</TableHead>
                      <TableHead className="w-24 font-black uppercase text-[10px] text-slate-400 text-center">Final Out</TableHead>
                      <TableHead className="w-20 font-black uppercase text-[10px] text-slate-400 text-center">Hours</TableHead>
                      <TableHead className="font-black uppercase text-[10px] text-slate-400">Notes / Remarks</TableHead>
                      <TableHead className="w-24 font-black uppercase text-[10px] text-slate-400 pr-4 text-right">WhatsApp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daysList.map((d) => (
                      <TableRow
                        key={d.date}
                        className={cn(
                          'hover:bg-slate-50/80 border-b border-slate-100 transition-colors',
                          d.isSunday && 'bg-slate-50/40 text-slate-400'
                        )}
                      >
                        <TableCell className="pl-4 font-mono text-xs font-bold text-slate-800">
                          {d.date} <span className="text-[10px] font-normal text-slate-500">({d.dayName})</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border',
                              d.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : d.status === 'Late'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : d.status === 'Personal Leave' || d.status === 'Leave'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : d.status === 'Absent'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            )}
                          >
                            {d.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-slate-700">{d.morningIn || '—'}</TableCell>
                        <TableCell className="text-center font-mono text-xs text-slate-700">{d.breakOut || '—'}</TableCell>
                        <TableCell className="text-center font-mono text-xs text-slate-700">{d.breakIn || '—'}</TableCell>
                        <TableCell className="text-center font-mono text-xs text-slate-700">{d.finalOut || '—'}</TableCell>
                        <TableCell className="text-center font-mono font-bold text-xs text-slate-800">
                          {d.totalHours !== null && d.totalHours !== undefined ? `${d.totalHours}h` : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-medium">
                          {d.notes || (d.isSunday ? <span className="italic text-slate-400">Weekly Off</span> : '—')}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          {d.waStatus === 'sent' ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              ✓ Sent
                            </span>
                          ) : d.hasRecord ? (
                            <span className="text-[10px] font-mono text-slate-400">Pending</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  Showing 30-day verified attendance register for <strong className="text-slate-700">{selectedDossierStaff.fullName}</strong>
                </span>
                <Button onClick={() => setSelectedDossierStaff(null)} className="rounded-xl font-bold text-xs cursor-pointer">
                  Close Dossier
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
