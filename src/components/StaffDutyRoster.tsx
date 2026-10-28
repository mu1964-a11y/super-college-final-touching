import React, { useState, useMemo, useCallback } from 'react';
import { Staff } from '../types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Clock, 
  Search, 
  Download, 
  Send, 
  Save, 
  Sparkles, 
  FileText, 
  GraduationCap, 
  SlidersHorizontal, 
  Copy, 
  Check, 
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { safeLocalStorage } from '../utils/safeStorage';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StaffDutyRosterProps {
  staffList: Staff[];
  staffTimetable?: any[];
  onUpdateStaff?: (id: string, updates: Partial<Staff>) => Promise<void> | void;
  settings?: any;
  collegeName?: string;
}

interface LocalRosterState {
  dutyStartTime: string;
  dutyEndTime: string;
  graceMinutes: number;
  isModified?: boolean;
}

// Function to strictly determine if a staff member is a Lecturer / Teacher
export function isTeachingFaculty(st: Staff): boolean {
  const role = (st.role || '').trim().toLowerCase();
  const designation = (st.designation || '').trim().toLowerCase();

  // Explicitly block non-teaching staff (receptionists, guards, sweepers, etc.)
  const nonTeachingKeywords = [
    'receptionist',
    'guard',
    'gardener',
    'sweeper',
    'office boy',
    'accountant',
    'admin officer',
    'lab attendant',
    'driver',
    'security',
    'peon',
  ];
  if (nonTeachingKeywords.some((kw) => role.includes(kw) || designation.includes(kw))) {
    return false;
  }

  // Allow Lecturers, Faculty, Professors, or staff with assigned subjects
  if (
    role.includes('lecturer') ||
    role.includes('faculty') ||
    role.includes('professor') ||
    role.includes('teacher') ||
    designation.includes('lecturer') ||
    designation.includes('faculty') ||
    (Array.isArray(st.subjects) && st.subjects.length > 0)
  ) {
    return true;
  }

  // If role is explicitly 'Lecturer' or 'Faculty'
  return st.role === 'Lecturer' || st.role === 'Faculty';
}

export default function StaffDutyRoster({
  staffList,
  staffTimetable = [],
  onUpdateStaff,
  settings,
  collegeName = 'Superior College Jahanian',
}: StaffDutyRosterProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isBulkSaving, setIsBulkSaving] = useState<boolean>(false);

  // Filter staffList down to ONLY Lecturers / Teachers
  const lecturersList = useMemo(() => {
    return staffList.filter(isTeachingFaculty);
  }, [staffList]);

  // Maintain local editable state per lecturer ID
  const [rosterMap, setRosterMap] = useState<Record<string, LocalRosterState>>(() => {
    const initMap: Record<string, LocalRosterState> = {};
    lecturersList.forEach((st) => {
      let inTime = st.dutyStartTime || st.duty_start_time || '';
      let outTime = st.dutyEndTime || st.duty_end_time || '';
      let grace = st.graceMinutes !== undefined ? st.graceMinutes : (st.grace_minutes !== undefined ? st.grace_minutes : 5);

      // Check local cache if not set in object
      if (!inTime) {
        try {
          const cached = safeLocalStorage.getItem(`scj_staff_duty_${st.id}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            inTime = parsed.dutyStartTime || inTime;
            outTime = parsed.dutyEndTime || outTime;
            if (parsed.graceMinutes !== undefined) grace = parsed.graceMinutes;
          }
        } catch {}
      }

      // Default smart values if still blank
      if (!inTime) inTime = '08:30';
      if (!outTime) outTime = '01:30';

      initMap[st.id] = {
        dutyStartTime: inTime,
        dutyEndTime: outTime,
        graceMinutes: Number(grace) || 5,
        isModified: false,
      };
    });
    return initMap;
  });

  // Calculate lecture timetable range for a lecturer
  const getTimetableRange = useCallback(
    (staffId: string) => {
      const entries = (staffTimetable || []).filter((t: any) => (t.staff_id || t.staffId) === staffId);
      if (entries.length === 0) return null;

      let earliest = '23:59';
      let latest = '00:00';

      entries.forEach((e: any) => {
        const start = e.start_time || e.startTime;
        const end = e.end_time || e.endTime;
        if (start && start < earliest) earliest = start.slice(0, 5);
        if (end && end > latest) latest = end.slice(0, 5);
      });

      if (earliest === '23:59' || latest === '00:00') return null;
      return { start: earliest, end: latest, count: entries.length };
    },
    [staffTimetable]
  );

  // Handle single field change
  const handleFieldChange = (staffId: string, field: keyof LocalRosterState, value: any) => {
    setRosterMap((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || {
          dutyStartTime: '08:30',
          dutyEndTime: '01:30',
          graceMinutes: 5,
        }),
        [field]: value,
        isModified: true,
      },
    }));
  };

  // Sync single teacher from class timetable
  const handleSyncFromTimetable = (staffId: string) => {
    const range = getTimetableRange(staffId);
    if (!range) {
      toast.error('No class timetable lectures found for this teacher.');
      return;
    }

    setRosterMap((prev) => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        dutyStartTime: range.start,
        dutyEndTime: range.end,
        isModified: true,
      },
    }));
    toast.success(`Synced ${range.count} lecture periods! (Arrival: ${range.start} - Departure: ${range.end})`);
  };

  // Bulk sync all lecturers from Timetable
  const handleBulkSyncAll = () => {
    let syncedCount = 0;
    setRosterMap((prev) => {
      const nextMap = { ...prev };
      lecturersList.forEach((st) => {
        const range = getTimetableRange(st.id);
        if (range) {
          nextMap[st.id] = {
            ...(nextMap[st.id] || { graceMinutes: 5 }),
            dutyStartTime: range.start,
            dutyEndTime: range.end,
            isModified: true,
          };
          syncedCount++;
        }
      });
      return nextMap;
    });

    if (syncedCount > 0) {
      toast.success(`Successfully synced lecture timings for ${syncedCount} teachers from Timetable!`);
    } else {
      toast.info('No timetable lectures found for active lecturers.');
    }
  };

  // Quick preset apply for all teachers
  const handleApplyPreset = (start: string, end: string) => {
    setRosterMap((prev) => {
      const nextMap = { ...prev };
      lecturersList.forEach((st) => {
        nextMap[st.id] = {
          ...(nextMap[st.id] || { graceMinutes: 5 }),
          dutyStartTime: start,
          dutyEndTime: end,
          isModified: true,
        };
      });
      return nextMap;
    });
    toast.success(`Applied ${start} - ${end} to all ${lecturersList.length} teachers.`);
  };

  // Save single teacher's schedule
  const handleSaveStaffRoster = async (st: Staff) => {
    const config = rosterMap[st.id];
    if (!config) return;

    setSavingId(st.id);
    try {
      if (onUpdateStaff) {
        await onUpdateStaff(st.id, {
          dutyStartTime: config.dutyStartTime,
          dutyEndTime: config.dutyEndTime,
          graceMinutes: Number(config.graceMinutes),
        });
      }

      // Local storage cache for instant offline attendance
      safeLocalStorage.setItem(
        `scj_staff_duty_${st.id}`,
        JSON.stringify({
          dutyStartTime: config.dutyStartTime,
          dutyEndTime: config.dutyEndTime,
          graceMinutes: Number(config.graceMinutes),
        })
      );

      setRosterMap((prev) => ({
        ...prev,
        [st.id]: {
          ...prev[st.id],
          isModified: false,
        },
      }));

      toast.success(`Lecture duty timing saved for ${st.fullName}!`);
    } catch (err: any) {
      toast.error('Failed to save timing: ' + (err?.message || 'Database error'));
    } finally {
      setSavingId(null);
    }
  };

  // Save all modified rosters
  const handleSaveAll = async () => {
    const modifiedEntries = Object.entries(rosterMap).filter(([_, val]) => val.isModified);
    if (modifiedEntries.length === 0) {
      toast.info('No unsaved changes in teachers roster.');
      return;
    }

    setIsBulkSaving(true);
    let successCount = 0;
    try {
      for (const [staffId, conf] of modifiedEntries) {
        if (onUpdateStaff) {
          await onUpdateStaff(staffId, {
            dutyStartTime: conf.dutyStartTime,
            dutyEndTime: conf.dutyEndTime,
            graceMinutes: Number(conf.graceMinutes),
          });
        }
        safeLocalStorage.setItem(
          `scj_staff_duty_${staffId}`,
          JSON.stringify({
            dutyStartTime: conf.dutyStartTime,
            dutyEndTime: conf.dutyEndTime,
            graceMinutes: Number(conf.graceMinutes),
          })
        );
        successCount++;
      }

      setRosterMap((prev) => {
        const updated = { ...prev };
        modifiedEntries.forEach(([id]) => {
          if (updated[id]) updated[id].isModified = false;
        });
        return updated;
      });

      toast.success(`Successfully saved lecture duty timings for ${successCount} teachers!`);
    } catch (err: any) {
      toast.error('Error during bulk save: ' + (err?.message || ''));
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Filtered teachers list (by search term)
  const filteredLecturers = useMemo(() => {
    return lecturersList.filter((st) => {
      const name = (st.fullName || '').toLowerCase();
      const id = (st.id || '').toLowerCase();
      const sub = (st.subjects || []).join(' ').toLowerCase();
      const des = (st.designation || st.role || '').toLowerCase();
      const q = searchTerm.toLowerCase();

      return name.includes(q) || id.includes(q) || sub.includes(q) || des.includes(q);
    });
  }, [lecturersList, searchTerm]);

  // Compute late cutoff label
  const getCutoffLabel = (startTime?: string | null, grace: number = 5) => {
    if (!startTime || typeof startTime !== 'string' || !startTime.includes(':')) return 'N/A';
    const [h, m] = startTime.split(':').map(Number);
    const totalMins = (h || 8) * 60 + (m || 0) + (Number(grace) || 0);
    const finalH = Math.floor(totalMins / 60);
    const finalM = totalMins % 60;
    const period = finalH >= 12 ? 'PM' : 'AM';
    const displayH = finalH > 12 ? finalH - 12 : finalH === 0 ? 12 : finalH;
    return `${String(displayH).padStart(2, '0')}:${String(finalM).padStart(2, '0')} ${period}`;
  };

  // WhatsApp text notice
  const buildWhatsAppMessage = (st: Staff, conf: LocalRosterState) => {
    const cutoffStr = getCutoffLabel(conf.dutyStartTime, conf.graceMinutes);
    const subjectList = st.subjects && st.subjects.length > 0 ? st.subjects.join(', ') : 'Academic Faculty';

    return `🏛️ *SUPERIOR COLLEGE JAHANIAN*
📋 *OFFICIAL TEACHER LECTURE DUTY SCHEDULE*
━━━━━━━━━━━━━━━━━━━━━━━━━
Respected *Prof. ${st.fullName}* (${subjectList}, ID: *${st.id}*),

Your official daily lecture duty timing has been scheduled as follows:

• ⏰ *First Lecture Arrival:* *${conf.dutyStartTime}*
• 🚪 *Last Lecture Off / Departure:* *${conf.dutyEndTime}*
• ⏳ *Late Cutoff (With ${conf.graceMinutes}m Grace):* *${cutoffStr}*

⚠️ *Biometric Hazri Note:* Kindly mark your thumb attendance on the biometric machine before *${cutoffStr}* each morning to ensure On-Time hazri.

_Superior College Jahanian Administration_
_Canal Road Campus, Jahanian_`;
  };

  // Send WhatsApp message
  const handleSendWhatsApp = (st: Staff) => {
    const conf = rosterMap[st.id] || {
      dutyStartTime: '08:30',
      dutyEndTime: '01:30',
      graceMinutes: 5,
    };
    const phone = st.contact || (st as any).phone;
    if (!phone) {
      toast.error(`No phone number found for ${st.fullName}.`);
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
    const text = buildWhatsAppMessage(st, conf);
    const encoded = encodeURIComponent(text);
    const waUrl = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encoded}`;
    window.open(waUrl, '_blank');
    toast.success(`WhatsApp schedule opened for ${st.fullName}!`);
  };

  // Copy notice to clipboard
  const handleCopyNotice = (st: Staff) => {
    const conf = rosterMap[st.id] || {
      dutyStartTime: '08:30',
      dutyEndTime: '01:30',
      graceMinutes: 5,
    };
    const text = buildWhatsAppMessage(st, conf);
    navigator.clipboard.writeText(text);
    setCopiedId(st.id);
    toast.success('Duty schedule message copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Generate Single Teacher Printable Duty Slip (PDF)
  const handleDownloadSingleSlip = (st: Staff) => {
    const conf = rosterMap[st.id] || {
      dutyStartTime: '08:30',
      dutyEndTime: '01:30',
      graceMinutes: 5,
    };
    const cutoffStr = getCutoffLabel(conf.dutyStartTime, conf.graceMinutes);
    const subjectsStr = st.subjects && st.subjects.length > 0 ? st.subjects.join(', ') : 'Academic Faculty';

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

    // College Header
    doc.setFillColor(6, 78, 67); // Superior Teal
    doc.rect(0, 0, 148, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(collegeName.toUpperCase(), 74, 11, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL TEACHER LECTURE TIMING & DUTY PASS', 74, 18, { align: 'center' });
    doc.text('Session 2026-28 • Canal Road Campus, Jahanian', 74, 23, { align: 'center' });

    // Golden separator line
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(1);
    doc.line(10, 31, 138, 31);

    // Teacher Details Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(10, 35, 128, 42, 3, 3, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Prof. ${st.fullName}`, 16, 44);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Staff ID: ${st.id}`, 16, 51);
    doc.text(`Designation: Lecturer / Faculty`, 16, 57);
    doc.text(`Subjects: ${subjectsStr}`, 16, 63);
    doc.text(`Contact: ${st.contact || 'N/A'}`, 16, 69);

    // Assigned Duty Schedule Table
    autoTable(doc, {
      startY: 82,
      margin: { left: 10, right: 10 },
      head: [['TIMING PARAMETER', 'SCHEDULED DETAILS']],
      body: [
        ['Expected Lecture Arrival (In Time)', conf.dutyStartTime || '08:30'],
        ['Grace Period Allowance', `${conf.graceMinutes} Minutes`],
        ['Biometric Late Cutoff', cutoffStr],
        ['Expected Departure (Off Time)', conf.dutyEndTime || '01:30'],
        ['Hazri Method', 'Right Thumb Biometric Scanner'],
      ],
      headStyles: {
        fillColor: [6, 78, 67],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 140;

    // Instructions
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Note: Teachers punching in after the scheduled Late Cutoff will be logged as Late Arrival.',
      14,
      finalY + 10
    );

    // Signature blocks
    doc.setDrawColor(203, 213, 225);
    doc.line(15, finalY + 36, 55, finalY + 36);
    doc.line(93, finalY + 36, 133, finalY + 36);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Teacher Signature', 35, finalY + 41, { align: 'center' });
    doc.text('Principal / Campus Head', 113, finalY + 41, { align: 'center' });

    doc.save(`SCJ_Teacher_Pass_${st.id}_${st.fullName.replace(/\s+/g, '_')}.pdf`);
    toast.success(`Duty Pass PDF downloaded for ${st.fullName}!`);
  };

  // Generate Master College Teachers Duty Roster PDF (Landscape - Lecturers Only)
  const handleDownloadMasterRoster = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header Banner
    doc.setFillColor(6, 78, 67);
    doc.rect(0, 0, 297, 26, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(collegeName.toUpperCase(), 148.5, 11, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'TEACHERS / LECTURERS DUTY TIMINGS & LECTURE SCHEDULE (MASTER ROSTER)',
      148.5,
      17,
      { align: 'center' }
    );
    doc.text(
      `Generated on: ${new Date().toLocaleDateString('en-PK')} • Total Teachers: ${filteredLecturers.length}`,
      148.5,
      22,
      { align: 'center' }
    );

    // Gold stripe
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 26, 297, 1.5, 'F');

    const tableRows = filteredLecturers.map((st, idx) => {
      const conf = rosterMap[st.id] || {
        dutyStartTime: '08:30',
        dutyEndTime: '01:30',
        graceMinutes: 5,
      };
      const cutoff = getCutoffLabel(conf.dutyStartTime, conf.graceMinutes);
      const subjectsStr = st.subjects && st.subjects.length > 0 ? st.subjects.join(', ') : 'Faculty';

      return [
        String(idx + 1),
        st.id,
        st.fullName,
        'Lecturer',
        subjectsStr,
        conf.dutyStartTime || '08:30',
        `${conf.graceMinutes}m (${cutoff})`,
        conf.dutyEndTime || '01:30',
        st.contact || 'N/A',
      ];
    });

    autoTable(doc, {
      startY: 32,
      margin: { left: 12, right: 12 },
      head: [
        ['SR#', 'STAFF ID', 'TEACHER NAME', 'DESIGNATION', 'TEACHING SUBJECTS', 'ARRIVAL (IN)', 'GRACE / CUTOFF', 'OFF (OUT)', 'PHONE CONTACT'],
      ],
      body: tableRows,
      headStyles: {
        fillColor: [6, 78, 67],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.8,
        halign: 'center',
      },
      columnStyles: {
        2: { halign: 'left', fontStyle: 'bold' },
        3: { halign: 'left' },
        4: { halign: 'left' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 180;
    if (finalY + 25 < 210) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.line(20, finalY + 18, 70, finalY + 18);
      doc.text('Prepared by Administration', 45, finalY + 22, { align: 'center' });

      doc.line(227, finalY + 18, 277, finalY + 18);
      doc.text('Principal / Director Approval', 252, finalY + 22, { align: 'center' });
    }

    doc.save('SCJ_Teachers_Duty_Master_Roster.pdf');
    toast.success('Teachers Master Duty Roster PDF downloaded successfully!');
  };

  const modifiedCount = useMemo(() => {
    return Object.values(rosterMap).filter((v) => v.isModified).length;
  }, [rosterMap]);

  return (
    <div className="space-y-4">
      {/* Top Banner Card */}
      <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <div className="bg-gradient-to-r from-[#064e43] via-[#085a4e] to-teal-900 p-5 sm:p-6 text-white relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                  <GraduationCap className="w-5 h-5 text-superior-gold" />
                </span>
                <Badge className="bg-superior-gold/20 text-superior-gold border border-superior-gold/30 text-[10px] font-bold">
                  Lecturers Only
                </Badge>
                <Badge className="bg-white/15 text-white border-white/20 text-[10px] font-mono">
                  {lecturersList.length} Teachers Enrolled
                </Badge>
                {modifiedCount > 0 && (
                  <Badge className="bg-amber-400 text-slate-950 font-black text-[10px] animate-pulse">
                    {modifiedCount} Unsaved Changes
                  </Badge>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Teachers Lecture Timings & Duty Roster</h2>
              <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
                Set custom arrival and off times for each lecturer. Non-teaching staff (guards, sweepers, receptionists) are excluded.
              </p>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkSyncAll}
                className="h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold gap-1.5 cursor-pointer"
                title="Autofill arrival and off times from existing timetable lecture periods"
              >
                <Sparkles size={14} className="text-superior-gold" />
                <span>Sync from Timetable</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadMasterRoster}
                className="h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold gap-1.5 cursor-pointer"
                title="Export clean printable PDF schedule of all teachers"
              >
                <FileText size={14} className="text-emerald-300" />
                <span>Master PDF Roster</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={isBulkSaving || modifiedCount === 0}
                className={cn(
                  'h-9 rounded-xl font-bold text-xs gap-1.5 cursor-pointer shadow-md transition-all',
                  modifiedCount > 0
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-300/50'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white opacity-80'
                )}
              >
                <Save size={14} />
                <span>{isBulkSaving ? 'Saving...' : `Save All Changes (${modifiedCount})`}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Batch Presets Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
            <SlidersHorizontal size={13} className="text-superior-teal" />
            <span>Quick Timing Presets for Teachers:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApplyPreset('08:00', '01:00')}
              className="h-7 text-[11px] rounded-lg border-emerald-200 hover:bg-emerald-50 text-emerald-800 font-semibold"
            >
              08:00 AM - 01:00 PM
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApplyPreset('08:20', '01:15')}
              className="h-7 text-[11px] rounded-lg border-teal-200 hover:bg-teal-50 text-teal-800 font-semibold"
            >
              08:20 AM - 01:15 PM
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApplyPreset('08:30', '01:30')}
              className="h-7 text-[11px] rounded-lg border-indigo-200 hover:bg-indigo-50 text-indigo-800 font-semibold"
            >
              08:30 AM - 01:30 PM
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApplyPreset('08:40', '01:45')}
              className="h-7 text-[11px] rounded-lg border-purple-200 hover:bg-purple-50 text-purple-800 font-semibold"
            >
              08:40 AM - 01:45 PM
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApplyPreset('09:00', '02:00')}
              className="h-7 text-[11px] rounded-lg border-amber-200 hover:bg-amber-50 text-amber-800 font-semibold"
            >
              09:00 AM - 02:00 PM
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search teacher by name, ID, or subject..."
              className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200"
            />
          </div>

          <p className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900 dark:text-white">{filteredLecturers.length}</span> of{' '}
            <span className="font-bold text-slate-900 dark:text-white">{lecturersList.length}</span> Lecturers
          </p>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
              <TableRow className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <TableHead className="w-[260px]">Teacher / Lecturer</TableHead>
                <TableHead className="w-[180px]">Teaching Subjects</TableHead>
                <TableHead className="w-[160px]">Lecture Arrival (In)</TableHead>
                <TableHead className="w-[140px]">Grace (Margin)</TableHead>
                <TableHead className="w-[140px]">Late Cutoff</TableHead>
                <TableHead className="w-[160px]">Departure (Off)</TableHead>
                <TableHead className="text-right pr-5">Quick Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLecturers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    No lecturers found matching "{searchTerm}".
                  </TableCell>
                </TableRow>
              ) : (
                filteredLecturers.map((st) => {
                  const existingConf = rosterMap[st.id];
                  const conf = {
                    dutyStartTime: existingConf?.dutyStartTime || st.dutyStartTime || st.duty_start_time || '08:30',
                    dutyEndTime: existingConf?.dutyEndTime || st.dutyEndTime || st.duty_end_time || '01:30',
                    graceMinutes: Number(existingConf?.graceMinutes ?? st.graceMinutes ?? st.grace_minutes ?? 5),
                    isModified: Boolean(existingConf?.isModified),
                  };
                  const cutoffStr = getCutoffLabel(conf.dutyStartTime, conf.graceMinutes);
                  const isSavingThis = savingId === st.id;
                  const ttRange = getTimetableRange(st.id);

                  return (
                    <TableRow
                      key={st.id}
                      className={cn(
                        'hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors',
                        conf.isModified && 'bg-amber-50/30 dark:bg-amber-950/20'
                      )}
                    >
                      {/* Teacher Identity */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center font-bold text-xs text-superior-teal">
                            {st.photo ? (
                              <img src={st.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              st.fullName.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {st.fullName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono font-bold text-slate-500">{st.id}</span>
                              <span className="text-[10px] text-slate-400">•</span>
                              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                Lecturer
                              </span>
                            </div>
                            {ttRange && (
                              <button
                                onClick={() => handleSyncFromTimetable(st.id)}
                                className="text-[9px] font-bold text-teal-700 hover:text-teal-900 underline mt-0.5 flex items-center gap-1 cursor-pointer"
                                title="Click to autofill arrival & off times from class timetable"
                              >
                                <Sparkles size={10} className="text-amber-500" />
                                <span>Timetable: {ttRange.start} - {ttRange.end}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Teaching Subjects */}
                      <TableCell>
                        {st.subjects && st.subjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[170px]">
                            {st.subjects.map((sub, sIdx) => (
                              <Badge
                                key={sIdx}
                                variant="outline"
                                className="text-[9px] font-bold bg-slate-100 text-slate-800 border-slate-300 px-1.5 py-0"
                              >
                                {sub}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Faculty Member</span>
                        )}
                      </TableCell>

                      {/* In Time (Arrival) */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="time"
                            value={conf.dutyStartTime}
                            onChange={(e) => handleFieldChange(st.id, 'dutyStartTime', e.target.value)}
                            className="h-8 text-xs font-mono font-bold rounded-xl w-28 bg-white dark:bg-slate-800"
                          />
                        </div>
                      </TableCell>

                      {/* Grace Minutes */}
                      <TableCell>
                        <Select
                          value={String(conf.graceMinutes)}
                          onValueChange={(val) => handleFieldChange(st.id, 'graceMinutes', Number(val))}
                        >
                          <SelectTrigger className="h-8 text-xs font-bold rounded-xl w-24 bg-white dark:bg-slate-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0" className="text-xs">0 min</SelectItem>
                            <SelectItem value="5" className="text-xs">5 mins</SelectItem>
                            <SelectItem value="10" className="text-xs">10 mins</SelectItem>
                            <SelectItem value="15" className="text-xs">15 mins</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Cutoff (Late Threshold) */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] font-black bg-rose-50 text-rose-700 border-rose-200 px-2 py-0.5"
                        >
                          After {cutoffStr}
                        </Badge>
                      </TableCell>

                      {/* Out Time (Departure) */}
                      <TableCell>
                        <Input
                          type="time"
                          value={conf.dutyEndTime}
                          onChange={(e) => handleFieldChange(st.id, 'dutyEndTime', e.target.value)}
                          className="h-8 text-xs font-mono font-bold rounded-xl w-28 bg-white dark:bg-slate-800"
                        />
                      </TableCell>

                      {/* Quick Actions */}
                      <TableCell className="text-right pr-5">
                        <div className="flex items-center justify-end gap-1">
                          {/* Save Single Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveStaffRoster(st)}
                            disabled={isSavingThis}
                            className={cn(
                              'h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
                              conf.isModified
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                : 'text-slate-400 hover:text-emerald-700'
                            )}
                            title="Save this teacher's duty timing"
                          >
                            <Save size={13} className={conf.isModified ? 'text-amber-800' : ''} />
                            <span className="hidden xl:inline ml-1">
                              {conf.isModified ? 'Save' : 'Saved'}
                            </span>
                          </Button>

                          {/* WhatsApp Direct Notice */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSendWhatsApp(st)}
                            className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                            title="Send Lecture Timing Notice on WhatsApp"
                          >
                            <Send size={13} />
                          </Button>

                          {/* Copy Text */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyNotice(st)}
                            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                            title="Copy Schedule Notice to Clipboard"
                          >
                            {copiedId === st.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </Button>

                          {/* PDF Slip Download */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadSingleSlip(st)}
                            className="h-8 w-8 p-0 rounded-lg text-teal-700 hover:bg-teal-50 cursor-pointer"
                            title="Download Teacher Duty Pass PDF"
                          >
                            <Download size={13} />
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
      </Card>
    </div>
  );
}
