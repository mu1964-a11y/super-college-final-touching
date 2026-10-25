import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Staff } from '../types';
import { Download, Upload, Save, Calendar, FileSpreadsheet, Search, Filter, Camera, CheckCircle2, X, Clock, ShieldCheck, Eye, Building2, LogOut, AlertCircle, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { safeLocalStorage } from '../utils/safeStorage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import BiometricEnrollmentModal from './BiometricEnrollmentModal';
import BiometricAttendanceDesk from './BiometricAttendanceDesk';
import { sendAutoStaffAttendancePdfNotice, parseAttendanceNotesAndTime } from '../lib/whatsappAutomation';

interface StaffAttendanceProps {
  staffList: Staff[];
  attendanceRecords?: any[];
  onSaveAttendance?: (records: any[]) => void;
  data?: any;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Personal Leave' | 'College Holiday' | 'Public Holiday' | '';

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  notes: string;
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
  let isBio = Boolean(entrySnap || exitSnap || entry.verificationMethod === 'face_biometric' || (entry as any).verification_method === 'face_biometric');

  if (entry.notes && typeof entry.notes === 'string' && entry.notes.startsWith('{')) {
    try {
      const p = JSON.parse(entry.notes);
      if ('entry_snapshot' in p) entrySnap = p.entry_snapshot;
      if ('exit_snapshot' in p) exitSnap = p.exit_snapshot;
      if (p.snapshot && !entrySnap && !exitSnap) entrySnap = p.snapshot;
      if (p.check_in_time && !checkIn) checkIn = p.check_in_time;
      if (p.check_out_time && !checkOut) checkOut = p.check_out_time;
      if (p.verification_method === 'face_biometric' || p.method === 'face_biometric') isBio = true;
    } catch {}
  }

  // Only if notes didn't specify and we have legacy snapshot_url
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
  const [activeTab, setActiveTab] = useState<'daily' | 'report'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');
  const [auditSnapshot, setAuditSnapshot] = useState<AuditSnapshotData | null>(null);
  const [selectedDossierStaff, setSelectedDossierStaff] = useState<Staff | null>(null);
  
  // Helper to convert "07:50:12 AM" or ISO or "08:00:00" into 24-hour "HH:MM" for <input type="time">
  const toTimeInputHHMM = (raw?: string | null): string => {
    if (!raw || typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    // Match 12-hour format e.g. "07:50:12 AM" or "2:15 PM"
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      const m = ampmMatch[2];
      const period = ampmMatch[3].toUpperCase();
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m}`;
    }
    // Match 24-hour HH:MM or HH:MM:SS
    const hhmmMatch = trimmed.match(/^(\d{2}):(\d{2})/);
    if (hhmmMatch) {
      return `${hhmmMatch[1]}:${hhmmMatch[2]}`;
    }
    return '';
  };

  // Local state for attendance records
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  React.useEffect(() => {
    if (attendanceRecords && attendanceRecords.length > 0) {
      setRecords(attendanceRecords);
    } else {
      const stored = safeLocalStorage.getItem('staffAttendanceRecords');
      if (stored) {
        try {
          setRecords(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse attendance records", e);
        }
      }
    }
  }, [attendanceRecords]);

  // Listen for live biometric punches from InstantBiometricVerifyModal or BiometricAttendanceDesk
  React.useEffect(() => {
    const handleLivePunch = (e: Event) => {
      const custom = e as CustomEvent;
      const rec = custom.detail?.record;
      const staffId = custom.detail?.staffId;
      const date = custom.detail?.date;
      if (!rec || !staffId || !date) return;

      setRecords((prev) => [
        rec,
        ...prev.filter((r: any) => !((r.staffId || r.staff_id) === staffId && r.date === date)),
      ]);
    };
    window.addEventListener('scj-biometric-attendance-updated', handleLivePunch);
    return () => window.removeEventListener('scj-biometric-attendance-updated', handleLivePunch);
  }, []);

  // Daily Attendance State overrides
  const [dailyEntries, setDailyEntries] = useState<Record<string, Partial<AttendanceRecord>>>({});
  const [isBiometricEnrollOpen, setIsBiometricEnrollOpen] = useState(false);
  const [isBiometricDeskOpen, setIsBiometricDeskOpen] = useState(false);
  const [biometricTargetStaff, setBiometricTargetStaff] = useState<any | null>(null);

  // Initialize or update daily entries when selected date changes or staff list changes
  React.useEffect(() => {
    const existingForDate = records.filter(r => r.date === selectedDate);
    
    const newEntries: Record<string, Partial<AttendanceRecord>> = {};
    staffList.forEach(staff => {
      const existing = existingForDate.find(r => (r.staffId || (r as any).staff_id) === staff.id);
      if (existing) {
        const parsed = parseAttendanceNotesAndTime(
          existing.notes,
          existing.checkIn || (existing as any).check_in || existing.checkInTime || (existing as any).check_in_time,
          existing.checkOut || (existing as any).check_out || existing.checkOutTime || (existing as any).check_out_time
        );
        newEntries[staff.id] = {
          ...existing,
          staffId: staff.id,
          checkIn: toTimeInputHHMM(parsed.checkIn || existing.checkIn) || '08:00',
          checkOut: toTimeInputHHMM(parsed.checkOut || existing.checkOut) || '',
        };
      } else {
        newEntries[staff.id] = {
          staffId: staff.id,
          date: selectedDate,
          status: 'Present',
          checkIn: '08:00',
          checkOut: '14:00',
          notes: ''
        };
      }
    });
    setDailyEntries(newEntries);
  }, [selectedDate, staffList, records]);

  const handleEntryChange = (staffId: string, field: keyof AttendanceRecord, value: string) => {
    setDailyEntries(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value
      }
    }));
  };

  const handleSaveDaily = () => {
    const newRecordsList = [...records.filter(r => r.date !== selectedDate)];
    
    Object.values(dailyEntries).forEach(entry => {
      if (entry.status) {
        newRecordsList.push({
          id: entry.id || `${entry.staffId}-${entry.date}`,
          staffId: entry.staffId!,
          date: entry.date!,
          status: entry.status as AttendanceStatus,
          checkIn: entry.checkIn || '',
          checkOut: entry.checkOut || '',
          notes: entry.notes || '',
          snapshotUrl: entry.snapshotUrl || entry.snapshot_url,
          snapshot_url: entry.snapshotUrl || entry.snapshot_url,
          verificationMethod: entry.verificationMethod || entry.verification_method,
          checkInTime: entry.checkInTime || entry.check_in_time,
          checkOutTime: entry.checkOutTime || entry.check_out_time,
        });
      }
    });
    
    setRecords(newRecordsList);
    safeLocalStorage.setItem('staffAttendanceRecords', JSON.stringify(newRecordsList));
    
    if (onSaveAttendance) {
      // Just save the records for the selected date
      const batchForDate = Object.values(dailyEntries).filter(e => e.status).map(e => ({
        id: e.id || `${e.staffId}-${e.date}`,
        staffId: e.staffId!,
        date: e.date!,
        status: e.status as AttendanceStatus,
        checkIn: e.checkIn || '',
        checkOut: e.checkOut || '',
        notes: e.notes || '',
        snapshotUrl: e.snapshotUrl || e.snapshot_url,
        snapshot_url: e.snapshotUrl || e.snapshot_url,
        verificationMethod: e.verificationMethod || e.verification_method,
        checkInTime: e.checkInTime || e.check_in_time,
        checkOutTime: e.checkOutTime || e.check_out_time,
      }));
      onSaveAttendance(batchForDate);

      // Automatically dispatch updated Cumulative Day-by-Day Attendance PDFs on WhatsApp
      const targetMonth = selectedDate.slice(0, 7);
      setTimeout(() => {
        batchForDate.forEach((rec, idx) => {
          const staffObj = staffList.find(s => s.id === rec.staffId);
          const phone = staffObj?.contact || (staffObj as any)?.phone;
          if (phone) {
            setTimeout(() => {
              sendAutoStaffAttendancePdfNotice(rec.staffId, phone, targetMonth, { silent: true });
            }, idx * 1200);
          }
        });
      }, 1500);
    } else {
      toast.success(`Attendance saved locally for ${selectedDate}`);
    }
  };

  const handleDownloadTemplate = () => {
    const data = staffList.map(staff => ({
      'Staff ID': staff.id,
      'Name': staff.fullName,
      'Date': selectedDate,
      'Status (Present/Absent/Late/Half Day/Personal Leave/College Holiday/Public Holiday)': 'Present',
      'Check In (HH:MM)': '08:00',
      'Check Out (HH:MM)': '14:00',
      'Notes': ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Template");
    XLSX.writeFile(wb, `Staff_Attendance_Template_${selectedDate}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const newEntries = { ...dailyEntries };

        data.forEach((row: any) => {
          const staffId = row['Staff ID'] || row['Staff Id'];
          if (staffId && newEntries[staffId]) {
            newEntries[staffId] = {
              ...newEntries[staffId],
              status: (row['Status (Present/Absent/Late/Half Day/Personal Leave/College Holiday/Public Holiday)'] || row['Status'] || 'Present') as AttendanceStatus,
              checkIn: row['Check In (HH:MM)'] || row['Check In'] || '',
              checkOut: row['Check Out (HH:MM)'] || row['Check Out'] || '',
              notes: row['Notes'] || ''
            };
          }
        });

        setDailyEntries(newEntries);
        toast.success("Excel data imported successfully! Please review and save.");
      } catch (error) {
        toast.error("Failed to parse Excel file.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const handleExportExcel = () => {
    const data = staffList.map(staff => {
      const entry = dailyEntries[staff.id];
      return {
        'Staff ID': staff.id,
        'Name': staff.fullName,
        'Role': staff.role || 'N/A',
        'Date': selectedDate,
        'Status': entry?.status || '',
        'Check In': entry?.checkIn || '',
        'Check Out': entry?.checkOut || '',
        'Notes': entry?.notes || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Attendance");
    XLSX.writeFile(wb, `Daily_Attendance_${selectedDate}.xlsx`);
  };

  const getMonthlyStats = (staffId: string) => {
    const monthRecords = records.filter(r => r.staffId === staffId && r.date.startsWith(reportMonth));
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      personalLeave: 0,
      collegeHoliday: 0,
      publicHoliday: 0,
      totalWorkingDays: 0
    };

    monthRecords.forEach(r => {
      if (['Present', 'Late', 'Half Day'].includes(r.status)) stats.totalWorkingDays++;
      
      switch(r.status) {
        case 'Present': stats.present++; break;
        case 'Absent': stats.absent++; break;
        case 'Late': stats.late++; break;
        case 'Half Day': stats.halfDay++; break;
        case 'Personal Leave': stats.personalLeave++; break;
        case 'College Holiday': stats.collegeHoliday++; break;
        case 'Public Holiday': stats.publicHoliday++; break;
      }
    });

    return stats;
  };

  const formatPunchTime = (isoString?: string | null): string | null => {
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
  };

  const isPunchLate = (isoString?: string | null, collegeStartTime = '07:54'): boolean => {
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
  };

  const downloadStaffDossierPDF = (staff: Staff) => {
    const doc = new jsPDF();
    const title = `Superior College Jahanian (Faculty Attendance)\n30-Day Biometric Attendance Dossier - ${reportMonth}`;
    
    doc.setFontSize(13);
    doc.text(title, 14, 15);
    doc.setFontSize(9.5);
    doc.text(`Faculty / Staff: ${staff.fullName}   |   ID: ${staff.id}   |   Role: ${staff.role || 'Faculty'}`, 14, 28);
    
    const [year, month] = reportMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dossierRows = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(year, month - 1, d);
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      const isSun = dayDate.getDay() === 0;
      const rec = records.find((r: any) => r.staffId === staff.id && r.date === dateStr);
      const cin = formatPunchTime(rec?.checkInTime || rec?.check_in_time || rec?.checkIn) || '-';
      const cout = formatPunchTime(rec?.checkOutTime || rec?.check_out_time || rec?.checkOut) || '-';
      const snap = getSnapshotUrl(rec) ? 'Biometric Face Match' : (rec ? 'Manual Entry' : '-');
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
      headStyles: { fillColor: [6, 78, 67] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`Staff_Biometric_Dossier_${staff.fullName.replace(/\s+/g, '_')}_${reportMonth}.pdf`);
    toast.success('Staff 30-Day Biometric Dossier PDF downloaded successfully!');
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const name = s.fullName || '';
      const id = s.id || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             id.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [staffList, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Button 
            variant={activeTab === 'daily' ? 'default' : 'outline'}
            onClick={() => setActiveTab('daily')}
            className={cn("rounded-xl", activeTab === 'daily' ? "bg-superior-teal text-white" : "")}
          >
            Daily Attendance
          </Button>
          <Button 
            variant={activeTab === 'report' ? 'default' : 'outline'}
            onClick={() => setActiveTab('report')}
            className={cn("rounded-xl", activeTab === 'report' ? "bg-superior-teal text-white" : "")}
          >
            Monthly Report
          </Button>
        </div>

        {activeTab === 'daily' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsBiometricDeskOpen(true)}
              className="rounded-xl border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold"
              title="Open Fast-Boost SecuGen HU20 Biometric Attendance Desk"
            >
              <Fingerprint size={16} className="mr-1.5 text-amber-600" /> Fast Biometric Desk
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setBiometricTargetStaff(null);
                setIsBiometricEnrollOpen(true);
              }}
              className="rounded-xl border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 font-bold"
              title="Enroll Staff Fingerprints"
            >
              <Fingerprint size={16} className="mr-1.5 text-teal-600" /> Enroll Fingerprints
            </Button>
            <div className="relative">
              <input type="file" id="excel-import" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
              <Button variant="outline" className="rounded-xl border-dashed" onClick={() => document.getElementById('excel-import')?.click()}>
                <Upload size={16} className="mr-2" /> Import
              </Button>
            </div>
            <Button variant="outline" className="rounded-xl text-superior-teal border-superior-teal" onClick={handleDownloadTemplate}>
              <FileSpreadsheet size={16} className="mr-2" /> Format
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={handleExportExcel}>
              <Download size={16} className="mr-2" /> Export
            </Button>
            <Button className="rounded-xl bg-superior-teal hover:bg-superior-teal/90" onClick={handleSaveDaily}>
              <Save size={16} className="mr-2" /> Save Records
            </Button>
          </div>
        )}
      </div>

      <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 px-8 py-6 border-b border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-widest text-superior-teal">
                {activeTab === 'daily' ? 'Daily Attendance Tracker' : 'Monthly Attendance Summary'}
              </CardTitle>
              <p className="text-xs text-slate-500 font-medium tracking-wide mt-1">
                {activeTab === 'daily' 
                  ? 'Record check-in/out times and daily statuses' 
                  : 'Overview of leaves, presents, and holidays for payroll calculation'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input 
                  placeholder="Search staff..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 rounded-xl bg-white border-slate-200"
                />
              </div>

              {activeTab === 'daily' ? (
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  <Input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40 h-10 rounded-xl"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  <Input 
                    type="month" 
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="w-40 h-10 rounded-xl"
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {activeTab === 'daily' ? (
             <div className="overflow-x-auto min-h-[400px]">
             <Table>
               <TableHeader className="bg-slate-50">
                 <TableRow>
                   <TableHead className="w-16 whitespace-nowrap pl-8 font-black uppercase text-[10px] text-slate-400">ID</TableHead>
                   <TableHead className="font-black uppercase text-[10px] text-slate-400">Staff Member</TableHead>
                   <TableHead className="w-40 font-black uppercase text-[10px] text-slate-400">Gate Verification</TableHead>
                   <TableHead className="w-44 font-black uppercase text-[10px] text-slate-400">Status</TableHead>
                   <TableHead className="w-32 font-black uppercase text-[10px] text-slate-400">Check In</TableHead>
                   <TableHead className="w-32 font-black uppercase text-[10px] text-slate-400">Check Out</TableHead>
                   <TableHead className="w-64 font-black uppercase text-[10px] text-slate-400 pr-8">Notes</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center text-slate-500">No staff members found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map(staff => {
                      const entry = dailyEntries[staff.id];
                      const snapshotUrl = getSnapshotUrl(entry);
                      const isBiometric = Boolean(snapshotUrl || entry?.verificationMethod === 'face_biometric' || entry?.verification_method === 'face_biometric');

                      return (
                      <TableRow key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="pl-8 font-mono text-[10px] text-slate-500">{staff.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-superior-teal/10 flex items-center justify-center text-superior-teal font-bold text-xs overflow-hidden border border-slate-200 shrink-0">
                              {staff.photo ? (
                                <img src={staff.photo} alt={staff.fullName} className="w-full h-full object-cover" />
                              ) : (
                                staff.fullName.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                <span>{staff.fullName}</span>
                                {staff.fingerprintTemplate ? (
                                  <button
                                    type="button"
                                    title={`Fingerprint Enrolled (${staff.fingerprintFinger || 'Thumb'}) — Click to inspect or re-register`}
                                    onClick={() => {
                                      setBiometricTargetStaff({
                                        id: staff.id,
                                        fullName: staff.fullName,
                                        fatherName: staff.fatherName,
                                        phone: staff.contact,
                                        personType: "staff",
                                        roleOrGroup: staff.role,
                                        photo: staff.photo,
                                        fingerprintTemplate: staff.fingerprintTemplate,
                                        fingerprintFinger: staff.fingerprintFinger,
                                      });
                                      setIsBiometricEnrollOpen(true);
                                    }}
                                    className="text-emerald-600 hover:text-emerald-700 hover:scale-110 transition-transform cursor-pointer"
                                  >
                                    <Fingerprint size={13} />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    title="Fingerprint Missing — Click to enroll"
                                    onClick={() => {
                                      setBiometricTargetStaff({
                                        id: staff.id,
                                        fullName: staff.fullName,
                                        fatherName: staff.fatherName,
                                        phone: staff.contact,
                                        personType: "staff",
                                        roleOrGroup: staff.role,
                                        photo: staff.photo,
                                      });
                                      setIsBiometricEnrollOpen(true);
                                    }}
                                    className="text-slate-300 hover:text-amber-600 hover:scale-110 transition-transform cursor-pointer"
                                  >
                                    <Fingerprint size={13} />
                                  </button>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">{staff.role || 'Staff'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const staffBio = getStaffBiometrics(entry);
                            const entrySnap = staffBio.entrySnapshot;
                            const exitSnap = staffBio.exitSnapshot;
                            return (entrySnap || exitSnap) ? (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                  {entrySnap && (
                                    <button 
                                      type="button"
                                      onClick={() => setAuditSnapshot({
                                        staffName: staff.fullName,
                                        staffId: staff.id,
                                        role: staff.role || 'Faculty',
                                        registeredPhoto: staff.photo,
                                        entrySnapshotUrl: entrySnap,
                                        exitSnapshotUrl: exitSnap,
                                        snapshotUrl: entrySnap,
                                        checkInTime: entry?.checkInTime || entry?.check_in_time,
                                        checkOutTime: entry?.checkOutTime || entry?.check_out_time,
                                        status: entry?.status,
                                        date: selectedDate
                                      })}
                                      className="group relative w-9 h-9 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-2xs hover:scale-105 transition-all cursor-pointer shrink-0"
                                      title="Gate Arrival (Entry) Snapshot"
                                    >
                                      <img src={entrySnap} alt="Entry Scan" className="w-full h-full object-cover" />
                                      <span className="absolute bottom-0 inset-x-0 bg-emerald-700/90 text-[7px] font-black text-white text-center leading-tight">IN</span>
                                    </button>
                                  )}
                                  {exitSnap ? (
                                    <button 
                                      type="button"
                                      onClick={() => setAuditSnapshot({
                                        staffName: staff.fullName,
                                        staffId: staff.id,
                                        role: staff.role || 'Faculty',
                                        registeredPhoto: staff.photo,
                                        entrySnapshotUrl: entrySnap,
                                        exitSnapshotUrl: exitSnap,
                                        snapshotUrl: exitSnap,
                                        checkInTime: entry?.checkInTime || entry?.check_in_time,
                                        checkOutTime: entry?.checkOutTime || entry?.check_out_time,
                                        status: entry?.status,
                                        date: selectedDate
                                      })}
                                      className="group relative w-9 h-9 rounded-xl overflow-hidden border-2 border-blue-500 shadow-2xs hover:scale-105 transition-all cursor-pointer shrink-0"
                                      title="Gate Departure (Exit) Snapshot"
                                    >
                                      <img src={exitSnap} alt="Exit Scan" className="w-full h-full object-cover" />
                                      <span className="absolute bottom-0 inset-x-0 bg-blue-700/90 text-[7px] font-black text-white text-center leading-tight">OUT</span>
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-500 border border-slate-200" title="Staff is currently on campus (Departure pending)">
                                      🏢 In
                                    </span>
                                  )}
                                </div>
                                <span className="inline-flex items-center gap-1 font-bold text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 size={9} className="text-emerald-600" /> {exitSnap ? 'In+Out' : 'Match'}
                                </span>
                              </div>
                            ) : (entry?.verificationMethod === 'secugen_fingerprint' || entry?.verification_method === 'secugen_fingerprint' || entry?.notes?.includes('SecuGen') || entry?.notes?.includes('biometric_fingerprint') || entry?.notes?.includes('Biometric')) ? (
                              (() => {
                                const parsed = parseAttendanceNotesAndTime(entry?.notes, entry?.checkIn, entry?.checkOut);
                                return (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 font-black text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                                      <CheckCircle2 size={11} className="text-emerald-600" />
                                      <span>Biometric Marked {parsed.checkIn ? `• ${parsed.checkIn}` : ''}</span>
                                    </span>
                                    {parsed.breakOut && (
                                      <div className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50/70 px-1.5 py-0.5 rounded border border-amber-200/70">
                                        Break: {parsed.breakOut} &rarr; {parsed.breakIn || 'Out'}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ) : isBiometric ? (
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                  <ShieldCheck size={16} />
                                </div>
                                <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  Face Verified
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                Manual Entry
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={dailyEntries[staff.id]?.status || 'Present'} 
                            onValueChange={(val) => handleEntryChange(staff.id, 'status', val)}
                          >
                            <SelectTrigger className="h-9 rounded-xl border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Present">Present</SelectItem>
                              <SelectItem value="Absent">Absent</SelectItem>
                              <SelectItem value="Late">Late</SelectItem>
                              <SelectItem value="Half Day">Half Day</SelectItem>
                              <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                              <SelectItem value="College Holiday">College Holiday</SelectItem>
                              <SelectItem value="Public Holiday">Public Holiday</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="time" 
                            className="h-9 rounded-xl text-xs" 
                            value={dailyEntries[staff.id]?.checkIn || ''}
                            onChange={(e) => handleEntryChange(staff.id, 'checkIn', e.target.value)}
                            disabled={['Absent', 'Personal Leave', 'College Holiday', 'Public Holiday'].includes(dailyEntries[staff.id]?.status || '')}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="time" 
                            className="h-9 rounded-xl text-xs"
                            value={dailyEntries[staff.id]?.checkOut || ''}
                            onChange={(e) => handleEntryChange(staff.id, 'checkOut', e.target.value)}
                            disabled={['Absent', 'Personal Leave', 'College Holiday', 'Public Holiday'].includes(dailyEntries[staff.id]?.status || '')}
                          />
                        </TableCell>
                        <TableCell className="pr-8">
                          <Input 
                            placeholder="Add reason/note..." 
                            className="h-9 rounded-xl text-xs"
                            value={dailyEntries[staff.id]?.notes || ''}
                            onChange={(e) => handleEntryChange(staff.id, 'notes', e.target.value)}
                          />
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
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="whitespace-nowrap pl-8 font-black uppercase text-[10px] text-slate-400">Staff Member</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 text-center">Present</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-emerald-500 text-center">Late</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-amber-500 text-center">Half Day</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-red-500 text-center">Absent</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-blue-500 text-center">Personal Leave</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-purple-500 text-center bg-purple-50/50">College Off</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-indigo-500 text-center bg-indigo-50/50">Public Holiday</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 pr-8 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-64 text-center text-slate-500">No staff members found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map(staff => {
                      const stats = getMonthlyStats(staff.id);
                      return (
                        <TableRow key={staff.id} className="hover:bg-slate-50">
                          <TableCell className="pl-8">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                                {staff.fullName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 text-sm">{staff.fullName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">ID: {staff.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-700 bg-slate-50/50">{stats.present}</TableCell>
                          <TableCell className="text-center font-bold text-emerald-600">{stats.late > 0 ? stats.late : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-amber-600">{stats.halfDay > 0 ? stats.halfDay : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-red-600">{stats.absent > 0 ? stats.absent : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-blue-600">{stats.personalLeave > 0 ? stats.personalLeave : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-purple-600 bg-purple-50/30">{stats.collegeHoliday > 0 ? stats.collegeHoliday : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-indigo-600 bg-indigo-50/30">{stats.publicHoliday > 0 ? stats.publicHoliday : '-'}</TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 font-bold text-xs gap-1 shadow-2xs cursor-pointer"
                                onClick={() => sendAutoStaffAttendancePdfNotice(staff.id, staff.contact, reportMonth)}
                                title="Send Updated Day-by-Day Cumulative Attendance PDF on WhatsApp"
                              >
                                📄 WhatsApp PDF
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 font-bold text-xs gap-1 shadow-2xs cursor-pointer"
                                onClick={() => setSelectedDossierStaff(staff)}
                                title="Open 30-Day Biometric Attendance Dossier & Photo Audit"
                              >
                                <Eye size={13} /> Dossier 👁️
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

      {/* Biometric Gate Snapshot Audit Modal */}
      {auditSnapshot && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Gate Face Biometric Verification</h3>
                  <p className="text-xs text-slate-400">Attendance Audit Record • {auditSnapshot.date}</p>
                </div>
              </div>
              <button
                onClick={() => setAuditSnapshot(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Person Info */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <h4 className="font-black text-slate-900 text-base">{auditSnapshot.staffName}</h4>
                  <p className="text-xs text-slate-500 font-mono">ID: {auditSnapshot.staffId} • {auditSnapshot.role}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 font-black text-xs text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-300">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    {auditSnapshot.status || 'Present'}
                  </span>
                </div>
              </div>

              {/* Side-by-side Photo Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="text-center space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">1. Registered Profile</p>
                  <div className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 shadow-sm">
                    {auditSnapshot.registeredPhoto ? (
                      <img src={auditSnapshot.registeredPhoto} alt="Registered Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                        No ID Photo
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold">Database Reference</span>
                </div>

                <div className="text-center space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center justify-center gap-1">
                    <Camera size={11} /> 2. Arrival Scan (IN)
                  </p>
                  <div className="aspect-square rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-900 shadow-md ring-2 ring-emerald-500/20">
                    {auditSnapshot.entrySnapshotUrl || auditSnapshot.snapshotUrl ? (
                      <img src={auditSnapshot.entrySnapshotUrl || auditSnapshot.snapshotUrl} alt="Arrival Scan" className="w-full h-full object-cover" />
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
                    {auditSnapshot.exitSnapshotUrl ? (
                      <img src={auditSnapshot.exitSnapshotUrl} alt="Departure Scan" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center bg-slate-800/80">
                        <span className="text-xl mb-1">🏢</span>
                        <span className="text-[9px] font-bold text-slate-300">On Campus</span>
                        <span className="text-[8px] text-slate-400">Exit Pending</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-blue-600 font-bold">{auditSnapshot.exitSnapshotUrl ? 'Afternoon Departure' : 'Still On Campus'}</span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium flex items-center gap-1.5"><Clock size={13} className="text-slate-400" /> Check In Timestamp:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {auditSnapshot.checkInTime ? new Date(auditSnapshot.checkInTime).toLocaleString() : 'N/A'}
                  </span>
                </div>
                {auditSnapshot.checkOutTime && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-medium flex items-center gap-1.5"><Clock size={13} className="text-slate-400" /> Check Out Timestamp:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {new Date(auditSnapshot.checkOutTime).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                  <span className="font-medium">Verification Method:</span>
                  <span className="font-bold text-emerald-700">Face Recognition AI Biometric</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button
                onClick={() => setAuditSnapshot(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl px-5"
              >
                Close Audit Record
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 30-Day Biometric Staff Attendance Dossier Modal */}
      {selectedDossierStaff && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold overflow-hidden shadow-inner shrink-0">
                  {selectedDossierStaff.photo ? (
                    <img src={selectedDossierStaff.photo} alt={selectedDossierStaff.fullName} className="w-full h-full object-cover" />
                  ) : (
                    (selectedDossierStaff.fullName || 'S').slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white tracking-tight">{selectedDossierStaff.fullName}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                      ID: {selectedDossierStaff.id} • {selectedDossierStaff.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    Faculty 30-Day Gate Biometric Audit Dossier • Month: <span className="font-mono font-bold text-amber-300">{reportMonth}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadStaffDossierPDF(selectedDossierStaff)}
                  className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs font-bold rounded-xl gap-1.5 cursor-pointer"
                >
                  <Download size={13} /> Export PDF
                </Button>
                <button
                  onClick={() => setSelectedDossierStaff(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            {(() => {
              const stats = getMonthlyStats(selectedDossierStaff.id);
              const [year, month] = reportMonth.split('-').map(Number);
              const daysInMonth = new Date(year, month, 0).getDate();
              let biometricCount = 0;
              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const rec = records.find((r: any) => r.staffId === selectedDossierStaff.id && r.date === dateStr);
                if (getSnapshotUrl(rec) || rec?.verificationMethod === 'face_biometric') biometricCount++;
              }

              return (
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 shadow-2xs">
                      Days in Month: <strong className="text-slate-900">{daysInMonth}</strong>
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl font-bold text-emerald-800 shadow-2xs">
                      Present: <strong className="text-emerald-900">{stats.present}</strong>
                    </span>
                    <span className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-xl font-bold text-amber-800 shadow-2xs">
                      Late: <strong className="text-amber-900">{stats.late}</strong>
                    </span>
                    <span className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-xl font-bold text-rose-800 shadow-2xs">
                      Absent: <strong className="text-rose-900">{stats.absent}</strong>
                    </span>
                    <span className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-800 shadow-2xs">
                      Leave: <strong className="text-blue-900">{stats.personalLeave}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-extrabold text-[11px] shadow-2xs">
                    <Camera size={13} className="text-teal-700" />
                    Biometric Face Scans: {biometricCount} / {stats.present + stats.late}
                  </div>
                </div>
              );
            })()}

            {/* Scrollable Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="w-24 font-black uppercase text-[10px] text-slate-400">Date</TableHead>
                    <TableHead className="w-28 font-black uppercase text-[10px] text-slate-400">Status</TableHead>
                    <TableHead className="w-36 font-black uppercase text-[10px] text-slate-400">Scanned Face 📸</TableHead>
                    <TableHead className="w-32 font-black uppercase text-[10px] text-slate-400">Check In</TableHead>
                    <TableHead className="w-32 font-black uppercase text-[10px] text-slate-400">Check Out</TableHead>
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
                      const rec = records.find((r: any) => r.staffId === selectedDossierStaff.id && r.date === dateStr);
                      const snapUrl = getSnapshotUrl(rec);
                      const cin = rec?.checkInTime || rec?.check_in_time || rec?.checkIn;
                      const cout = rec?.checkOutTime || rec?.check_out_time || rec?.checkOut;
                      const isLate = isPunchLate(cin, '07:54');
                      const status = rec?.status || (isSun ? 'College Holiday' : '');

                      rows.push(
                        <TableRow key={dateStr} className={cn("hover:bg-slate-50/70 transition-colors", isSun && "bg-slate-50/50")}>
                          <TableCell className="font-mono text-xs font-semibold text-slate-700">
                            <div>
                              <span>{dateStr.slice(8)} {dayDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                              <span className={cn("block text-[10px] font-bold", isSun ? "text-purple-600" : "text-slate-400")}>
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
                            {status === 'Half Day' && (
                              <span className="inline-flex items-center gap-1 font-bold text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                Half Day
                              </span>
                            )}
                            {status === 'Personal Leave' && (
                              <span className="inline-flex items-center gap-1 font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                Leave
                              </span>
                            )}
                            {(status === 'College Holiday' || status === 'Public Holiday') && (
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
                                onClick={() => setAuditSnapshot({
                                  staffName: selectedDossierStaff.fullName,
                                  staffId: selectedDossierStaff.id,
                                  role: selectedDossierStaff.role || 'Faculty',
                                  registeredPhoto: selectedDossierStaff.photo,
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
                            {rec?.notes ? (
                              (() => {
                                const parsed = parseAttendanceNotesAndTime(rec.notes, cin, cout);
                                return (
                                  <div className="space-y-0.5">
                                    {parsed.breakOut && (
                                      <span className="inline-block mr-2 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-mono font-bold text-amber-800">
                                        Break: {parsed.breakOut} &rarr; {parsed.breakIn || 'Out'}
                                      </span>
                                    )}
                                    <span>{parsed.cleanRemarks || 'Verified'}</span>
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
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
              <span>Superior College Jahanian • Faculty Biometric Audit Trail</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDossierStaff(null)}
                className="rounded-xl font-bold px-5"
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Fingerprint Enrollment Modal for Staff */}
      {isBiometricEnrollOpen && (
        <BiometricEnrollmentModal
          isOpen={isBiometricEnrollOpen}
          onClose={() => {
            setIsBiometricEnrollOpen(false);
            setBiometricTargetStaff(null);
          }}
          targetPerson={biometricTargetStaff}
          staffList={staffList}
          onEnrollmentSaved={(personId, personType, template, finger) => {
            data?.updateFingerprintRecord?.(personId, personType, template, finger);
            data?.fetchData?.(true);
          }}
        />
      )}

      {/* Fast-Boost Zero-Click Biometric Attendance Kiosk Overlay */}
      {isBiometricDeskOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950">
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
    </div>
  );
}