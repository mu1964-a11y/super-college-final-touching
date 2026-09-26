import React, { useState, useEffect, useMemo } from 'react';
import { Staff } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Calendar, 
  Plus, 
  X, 
  Clock, 
  AlertTriangle, 
  Printer, 
  FileText, 
  Users, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  Sparkles,
  School,
  Building2,
  Download,
  Filter,
  Eye,
  Grid
} from 'lucide-react';
import { toast } from 'sonner';
import { safeLocalStorage } from '../utils/safeStorage';
import { cn } from '@/lib/utils';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface StaffTimetableProps {
  staffList: Staff[];
  timetableRecords?: TimetableEntry[];
  onAddEntry?: (entry: TimetableEntry) => void;
  onRemoveEntry?: (id: string) => void;
  predefinedSections?: any[];
  settings?: any;
}

export interface TimetableEntry {
  id: string;
  staffId: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  classRoom: string;
  section: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STANDARD_PERIODS = [
  { name: "Period 1", startTime: "08:00", endTime: "08:45" },
  { name: "Period 2", startTime: "08:45", endTime: "09:30" },
  { name: "Period 3", startTime: "09:30", endTime: "10:15" },
  { name: "Period 4", startTime: "10:15", endTime: "11:00" },
  { name: "Break", startTime: "11:00", endTime: "11:30" },
  { name: "Period 5", startTime: "11:30", endTime: "12:15" },
  { name: "Period 6", startTime: "12:15", endTime: "01:00" },
  { name: "Period 7", startTime: "01:00", endTime: "01:45" },
];

export default function StaffTimetable({ 
  staffList = [], 
  timetableRecords = [], 
  onAddEntry, 
  onRemoveEntry, 
  predefinedSections = [],
  settings = {}
}: StaffTimetableProps) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  
  // Navigation & View Modes
  const [viewMode, setViewMode] = useState<'master' | 'daily' | 'faculty'>('master');
  const [campusFilter, setCampusFilter] = useState<'all' | 'Male' | 'Female'>('all');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>("Monday");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Faculty Schedule State
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State (Shared between Faculty View & Quick Add Modal)
  const [formStaffId, setFormStaffId] = useState<string>("");
  const [day, setDay] = useState<string>("Monday");
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("08:45");
  const [subject, setSubject] = useState<string>("");
  const [classRoom, setClassRoom] = useState<string>("Regular");
  const [section, setSection] = useState<string>("");
  const [allowClashOverride, setAllowClashOverride] = useState<boolean>(false);

  // Sync entries from props
  useEffect(() => {
    if (timetableRecords.length > 0) {
      setEntries(timetableRecords);
    } else {
      const stored = safeLocalStorage.getItem('staffTimetable');
      if (stored) {
        try {
          setEntries(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse timetable entries", e);
        }
      }
    }
  }, [timetableRecords]);

  const saveEntries = (newEntries: TimetableEntry[]) => {
    setEntries(newEntries);
    safeLocalStorage.setItem('staffTimetable', JSON.stringify(newEntries));
  };

  // Helper to determine gender / campus of a section
  const getSectionGender = (secName: string): 'Male' | 'Female' | 'Co-ed' => {
    if (!secName) return 'Co-ed';
    const clean = secName.replace(/\(Boys\)|\(Girls\)/gi, '').trim().toLowerCase();
    
    // Check in predefinedSections
    const found = predefinedSections.find(s => (s.name || '').trim().toLowerCase() === clean);
    if (found?.gender) return found.gender as any;

    if (secName.toUpperCase().endsWith('B') || secName.toLowerCase().includes('boy')) return 'Male';
    if (secName.toUpperCase().endsWith('G') || secName.toLowerCase().includes('girl')) return 'Female';
    return 'Co-ed';
  };

  // Compile all active sections (predefined + any entered in timetable)
  const allSections = useMemo(() => {
    const list: { name: string; gender: 'Male' | 'Female' | 'Co-ed'; program?: string; class?: string }[] = [];
    const seen = new Set<string>();

    predefinedSections.forEach(s => {
      const cleanName = (s.name || '').trim();
      if (cleanName && !seen.has(cleanName.toLowerCase())) {
        seen.add(cleanName.toLowerCase());
        list.push({
          name: cleanName,
          gender: s.gender || 'Male',
          program: s.program || 'Inter',
          class: s.class || settings?.academicSession || '2026-28'
        });
      }
    });

    entries.forEach(e => {
      const cleanName = (e.section || '').replace(/\(Boys\)|\(Girls\)/gi, '').trim();
      if (cleanName && !seen.has(cleanName.toLowerCase())) {
        seen.add(cleanName.toLowerCase());
        list.push({
          name: cleanName,
          gender: getSectionGender(cleanName),
          program: 'Inter',
          class: settings?.academicSession || '2026-28'
        });
      }
    });

    return list;
  }, [predefinedSections, entries, settings]);

  // Filter sections by campus filter
  const filteredSections = useMemo(() => {
    if (campusFilter === 'all') return allSections;
    return allSections.filter(s => s.gender === campusFilter);
  }, [allSections, campusFilter]);

  // Set default selectedSection if none selected
  useEffect(() => {
    if (!selectedSection && filteredSections.length > 0) {
      setSelectedSection(filteredSections[0].name);
    } else if (selectedSection && !filteredSections.some(s => s.name.toLowerCase() === selectedSection.toLowerCase()) && filteredSections.length > 0) {
      setSelectedSection(filteredSections[0].name);
    }
  }, [filteredSections, selectedSection]);

  // Filter entries based on campus
  const campusFilteredEntries = useMemo(() => {
    if (campusFilter === 'all') return entries;
    return entries.filter(e => {
      const g = getSectionGender(e.section);
      return g === campusFilter;
    });
  }, [entries, campusFilter]);

  // Faculty filtering for faculty view
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const name = (s.fullName || '').toLowerCase();
      const role = (s.role || '').toLowerCase();
      const q = (searchQuery || '').toLowerCase();
      return name.includes(q) || role.includes(q);
    });
  }, [staffList, searchQuery]);

  const staffEntries = useMemo(() => {
    const sId = selectedStaff?.id || formStaffId;
    return entries.filter(e => e.staffId === sId);
  }, [entries, selectedStaff, formStaffId]);

  // Time conversion & overlap helper
  const timeToMinutes = (t: string): number => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const timesOverlap = (startA: string, endA: string, startB: string, endB: string): boolean => {
    const sA = timeToMinutes(startA);
    const eA = timeToMinutes(endA);
    const sB = timeToMinutes(startB);
    const eB = timeToMinutes(endB);
    return sA < eB && eA > sB;
  };

  // Live Clash Detection Engine
  const effectiveStaffId = selectedStaff?.id || formStaffId;
  const currentStaffObj = staffList.find(s => s.id === effectiveStaffId);

  const detectedClash = useMemo(() => {
    if (!effectiveStaffId || !startTime || !endTime) return null;

    // 1. Teacher Clash: Same teacher already has a class in this day/time
    const teacherConflict = entries.find(e =>
      e.staffId === effectiveStaffId &&
      e.day === day &&
      timesOverlap(startTime, endTime, e.startTime, e.endTime)
    );
    if (teacherConflict) {
      return {
        type: 'teacher' as const,
        title: 'Teacher Schedule Conflict!',
        details: `${currentStaffObj?.fullName || 'Teacher'} is already assigned to "${teacherConflict.subject}" (${teacherConflict.section || 'General'}) from ${teacherConflict.startTime} to ${teacherConflict.endTime} on ${day}.`
      };
    }

    // 2. Section Clash: Same section already occupied by another class
    if (section) {
      const cleanSection = section.replace(/\(Boys\)|\(Girls\)/gi, '').trim().toLowerCase();
      const sectionConflict = entries.find(e => {
        const cleanE = (e.section || '').replace(/\(Boys\)|\(Girls\)/gi, '').trim().toLowerCase();
        return e.day === day &&
          cleanE === cleanSection &&
          timesOverlap(startTime, endTime, e.startTime, e.endTime) &&
          e.staffId !== effectiveStaffId;
      });
      if (sectionConflict) {
        const assignedTeacher = staffList.find(s => s.id === sectionConflict.staffId)?.fullName || 'Another teacher';
        return {
          type: 'section' as const,
          title: 'Class / Section Occupancy Conflict!',
          details: `Section "${section}" already has a lecture scheduled with ${assignedTeacher} ("${sectionConflict.subject}") from ${sectionConflict.startTime} to ${sectionConflict.endTime} on ${day}.`
        };
      }
    }

    return null;
  }, [entries, effectiveStaffId, day, startTime, endTime, section, staffList, currentStaffObj]);

  const handleAddEntry = () => {
    const targetStaffId = selectedStaff?.id || formStaffId;
    if (!targetStaffId || !subject || !startTime || !endTime || !section) {
      toast.error('Please fill in required fields (Teacher, Subject, Section, Time)');
      return;
    }

    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      toast.error('End time must be after start time.');
      return;
    }

    if (detectedClash && !allowClashOverride) {
      toast.error(`${detectedClash.title} Please resolve or enable "Override Clash" to proceed.`);
      return;
    }

    const cleanSec = section.replace(/\(Boys\)|\(Girls\)/gi, '').trim();
    const newEntry: TimetableEntry = {
      id: crypto.randomUUID(),
      staffId: targetStaffId,
      day,
      startTime,
      endTime,
      subject,
      classRoom: classRoom || 'Regular',
      section: cleanSec
    };

    if (onAddEntry) {
      onAddEntry(newEntry);
    } else {
      saveEntries([...entries, newEntry]);
      toast.success('Timetable entry added successfully');
    }
    
    // reset form partly & close modal if open
    setSubject("");
    setClassRoom("Regular");
    setAllowClashOverride(false);
    setIsAddModalOpen(false);
  };

  const handleRemoveEntry = (id: string) => {
    if (onRemoveEntry) {
      onRemoveEntry(id);
    } else {
      saveEntries(entries.filter(e => e.id !== id));
      toast.success('Timetable entry removed locally');
    }
  };

  // Teacher Name Helper
  const getTeacherName = (staffId: string) => {
    return staffList.find(s => s.id === staffId)?.fullName || 'Assigned Faculty';
  };

  // -------------------------------------------------------------
  // PDF GENERATION: NOTICE BOARD COPY (OFFICIAL A4 PRINT)
  // -------------------------------------------------------------
  const generateSectionNoticeBoardPDF = (targetSectionName: string) => {
    const secGender = getSectionGender(targetSectionName);
    const secObj = allSections.find(s => s.name.toLowerCase() === targetSectionName.toLowerCase());
    const secEntries = entries.filter(e => {
      const cleanE = (e.section || '').replace(/\(Boys\)|\(Girls\)/gi, '').trim().toLowerCase();
      return cleanE === targetSectionName.toLowerCase();
    });

    if (secEntries.length === 0) {
      toast.error(`No lectures scheduled for section "${targetSectionName}" yet.`);
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const collegeName = settings?.collegeName || 'SUPERIOR GROUP OF COLLEGES';
    const campusName = (settings?.campusName || 'JAHANIAN') + (secGender === 'Female' ? ' (GIRLS CAMPUS)' : secGender === 'Male' ? ' (BOYS CAMPUS)' : '');
    const session = secObj?.class || settings?.academicSession || '2026-28';

    // Header Background Accent
    doc.setFillColor(8, 90, 78); // Superior Teal
    doc.rect(0, 0, 210, 8, 'F');

    // College Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(8, 90, 78);
    doc.text(collegeName.toUpperCase(), 105, 18, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(campusName.toUpperCase(), 105, 24, { align: 'center' });

    // Official Badge
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(40, 27, 130, 8, 2, 2, 'F');
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("OFFICIAL CLASS TIMETABLE — NOTICE BOARD COPY", 105, 32.5, { align: 'center' });

    // Meta Details Box
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, 38, 182, 16, 2, 2, 'S');

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("CLASS / SECTION:", 18, 44);
    doc.text("CAMPUS WING:", 85, 44);
    doc.text("ACADEMIC SESSION:", 145, 44);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${targetSectionName} (${secObj?.program || 'Inter'})`, 18, 50);
    doc.text(secGender === 'Female' ? 'Girls Campus' : secGender === 'Male' ? 'Boys Campus' : 'Co-ed Wing', 85, 50);
    doc.text(session, 145, 50);

    // Build Table Body grouped by Days
    const tableBody: any[] = [];
    DAYS_OF_WEEK.forEach(d => {
      const dayClasses = secEntries
        .filter(e => e.day.toLowerCase() === d.toLowerCase())
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      if (dayClasses.length > 0) {
        tableBody.push([
          { 
            content: d.toUpperCase(), 
            colSpan: 4, 
            styles: { 
              fillColor: [241, 245, 249], 
              textColor: [8, 90, 78], 
              fontStyle: 'bold', 
              fontSize: 10,
              halign: 'left'
            } 
          }
        ]);

        dayClasses.forEach((cls, idx) => {
          tableBody.push([
            `${cls.startTime} - ${cls.endTime} (Period ${idx + 1})`,
            cls.subject,
            getTeacherName(cls.staffId),
            cls.classRoom || 'Regular'
          ]);
        });
      } else {
        tableBody.push([
          { 
            content: `${d.toUpperCase()} — No Scheduled Lectures / Self-Study`, 
            colSpan: 4, 
            styles: { 
              fillColor: [250, 250, 250], 
              textColor: [148, 163, 184], 
              fontStyle: 'italic', 
              fontSize: 8.5,
              halign: 'left'
            } 
          }
        ]);
      }
    });

    autoTable(doc, {
      startY: 58,
      head: [['Time / Period', 'Subject', 'Faculty Member', 'Room / Type']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [8, 90, 78],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [30, 41, 59]
      },
      alternateRowStyles: {
        fillColor: [253, 253, 254]
      },
      margin: { left: 14, right: 14, bottom: 35 }
    });

    // Signature Block at Bottom
    const pageHeight = doc.internal.pageSize.getHeight();
    const sigY = pageHeight - 20;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    doc.line(20, sigY, 65, sigY);
    doc.text("Incharge Timetable", 42.5, sigY + 4, { align: 'center' });

    doc.line(85, sigY, 130, sigY);
    doc.text("Vice Principal", 107.5, sigY + 4, { align: 'center' });

    doc.line(150, sigY, 195, sigY);
    doc.text("Principal (SGC Jahanian)", 172.5, sigY + 4, { align: 'center' });

    doc.setFontSize(7.5);
    doc.text("Notice Board Copy • Punctuality and adherence to lecture schedules are strictly enforced.", 105, pageHeight - 7, { align: 'center' });

    doc.save(`${targetSectionName}_Notice_Board_Timetable.pdf`);
    toast.success(`Notice board timetable for ${targetSectionName} downloaded!`);
  };

  // -------------------------------------------------------------
  // PDF GENERATION: BATCH PRINT ALL SECTIONS (COMPLETE COLLEGE)
  // -------------------------------------------------------------
  const handleBatchPrintAllNoticeBoards = () => {
    const targetSections = filteredSections;
    if (targetSections.length === 0) {
      toast.error("No sections available to print.");
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let pageAdded = false;

    targetSections.forEach((secObj, sIndex) => {
      const secEntries = entries.filter(e => {
        const cleanE = (e.section || '').replace(/\(Boys\)|\(Girls\)/gi, '').trim().toLowerCase();
        return cleanE === secObj.name.toLowerCase();
      });

      if (secEntries.length === 0) return; // skip empty sections

      if (pageAdded) doc.addPage();
      pageAdded = true;

      const secGender = secObj.gender;
      const collegeName = settings?.collegeName || 'SUPERIOR GROUP OF COLLEGES';
      const campusName = (settings?.campusName || 'JAHANIAN') + (secGender === 'Female' ? ' (GIRLS CAMPUS)' : secGender === 'Male' ? ' (BOYS CAMPUS)' : '');
      const session = secObj.class || settings?.academicSession || '2026-28';

      // Header
      doc.setFillColor(8, 90, 78);
      doc.rect(0, 0, 210, 8, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(8, 90, 78);
      doc.text(collegeName.toUpperCase(), 105, 18, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(campusName.toUpperCase(), 105, 24, { align: 'center' });

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(40, 27, 130, 8, 2, 2, 'F');
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("OFFICIAL CLASS TIMETABLE — NOTICE BOARD COPY", 105, 32.5, { align: 'center' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(14, 38, 182, 16, 2, 2, 'S');

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text("CLASS / SECTION:", 18, 44);
      doc.text("CAMPUS WING:", 85, 44);
      doc.text("ACADEMIC SESSION:", 145, 44);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`${secObj.name} (${secObj.program || 'Inter'})`, 18, 50);
      doc.text(secGender === 'Female' ? 'Girls Campus' : 'Boys Campus', 85, 50);
      doc.text(session, 145, 50);

      const tableBody: any[] = [];
      DAYS_OF_WEEK.forEach(d => {
        const dayClasses = secEntries
          .filter(e => e.day.toLowerCase() === d.toLowerCase())
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        if (dayClasses.length > 0) {
          tableBody.push([
            { 
              content: d.toUpperCase(), 
              colSpan: 4, 
              styles: { 
                fillColor: [241, 245, 249], 
                textColor: [8, 90, 78], 
                fontStyle: 'bold', 
                fontSize: 10,
                halign: 'left'
              } 
            }
          ]);

          dayClasses.forEach((cls, idx) => {
            tableBody.push([
              `${cls.startTime} - ${cls.endTime} (Period ${idx + 1})`,
              cls.subject,
              getTeacherName(cls.staffId),
              cls.classRoom || 'Regular'
            ]);
          });
        }
      });

      autoTable(doc, {
        startY: 58,
        head: [['Time / Period', 'Subject', 'Faculty Member', 'Room / Type']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [8, 90, 78],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'left'
        },
        bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [253, 253, 254] },
        margin: { left: 14, right: 14, bottom: 35 }
      });

      const pageHeight = doc.internal.pageSize.getHeight();
      const sigY = pageHeight - 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);

      doc.line(20, sigY, 65, sigY);
      doc.text("Incharge Timetable", 42.5, sigY + 4, { align: 'center' });

      doc.line(85, sigY, 130, sigY);
      doc.text("Vice Principal", 107.5, sigY + 4, { align: 'center' });

      doc.line(150, sigY, 195, sigY);
      doc.text("Principal (SGC Jahanian)", 172.5, sigY + 4, { align: 'center' });

      doc.setFontSize(7.5);
      doc.text("Notice Board Copy • Punctuality and adherence to lecture schedules are strictly enforced.", 105, pageHeight - 7, { align: 'center' });
    });

    if (!pageAdded) {
      toast.error("No scheduled lectures found across sections to print.");
      return;
    }

    doc.save(`SGC_Complete_College_Notice_Boards_${campusFilter}.pdf`);
    toast.success("Batch notice board timetables generated successfully!");
  };

  // -------------------------------------------------------------
  // PDF GENERATION: DAILY MASTER MATRIX (A4 LANDSCAPE)
  // -------------------------------------------------------------
  const handlePrintDailyMatrix = () => {
    const dayEntries = campusFilteredEntries.filter(e => e.day.toLowerCase() === selectedDay.toLowerCase());
    if (dayEntries.length === 0) {
      toast.error(`No lectures scheduled for ${selectedDay}.`);
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const collegeName = settings?.collegeName || 'SUPERIOR GROUP OF COLLEGES JAHANIAN';
    const campusTitle = campusFilter === 'Male' ? 'BOYS CAMPUS' : campusFilter === 'Female' ? 'GIRLS CAMPUS' : 'ALL CAMPUSES COMBINED';

    // Header
    doc.setFillColor(8, 90, 78);
    doc.rect(0, 0, 297, 8, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(8, 90, 78);
    doc.text(collegeName.toUpperCase(), 148.5, 17, { align: 'center' });

    doc.setFontSize(10.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`DAILY MASTER ACADEMIC SCHEDULE — ${selectedDay.toUpperCase()} (${campusTitle})`, 148.5, 23, { align: 'center' });

    // Table Data
    const periods = STANDARD_PERIODS.filter(p => p.name !== 'Break');
    const headRow = ['Class / Section', 'Campus', ...periods.map(p => `${p.name}\n(${p.startTime}-${p.endTime})`)];

    const bodyRows: any[] = [];
    filteredSections.forEach(sec => {
      const row = [sec.name, sec.gender === 'Female' ? 'Girls' : 'Boys'];
      periods.forEach(p => {
        const foundClass = dayEntries.find(e => {
          const cleanE = (e.section || '').replace(/\(Boys\)|\(Girls\)/gi, '').trim().toLowerCase();
          return cleanE === sec.name.toLowerCase() && timesOverlap(e.startTime, e.endTime, p.startTime, p.endTime);
        });
        if (foundClass) {
          row.push(`${foundClass.subject}\n(${getTeacherName(foundClass.staffId)})`);
        } else {
          row.push("—");
        }
      });
      bodyRows.push(row);
    });

    autoTable(doc, {
      startY: 28,
      head: [headRow],
      body: bodyRows,
      theme: 'grid',
      headStyles: {
        fillColor: [8, 90, 78],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 7.5,
        halign: 'center',
        valign: 'middle'
      },
      alternateRowStyles: { fillColor: [250, 252, 252] },
      margin: { left: 10, right: 10, bottom: 15 }
    });

    doc.save(`SGC_Daily_Master_Timetable_${selectedDay}_${campusFilter}.pdf`);
    toast.success(`Daily schedule matrix for ${selectedDay} downloaded!`);
  };

  // -------------------------------------------------------------
  // PDF GENERATION: INDIVIDUAL FACULTY SCHEDULE
  // -------------------------------------------------------------
  const downloadTimetablePDF = () => {
    if (!selectedStaff) return;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(8, 90, 78);
    doc.text(`Faculty Timetable — ${selectedStaff.fullName}`, 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Department / Role: ${selectedStaff.role || 'Faculty Member'}`, 14, 27);
    
    const total = staffEntries.length;
    const extra = staffEntries.filter(e => e.classRoom === 'Extra').length;
    const regular = total - extra;
    doc.text(`Weekly Workload: ${total} Lectures (${regular} Regular, ${extra} Extra)`, 14, 33);

    const tableData: any[] = [];
    DAYS_OF_WEEK.forEach(dayName => {
      const dailyEntries = staffEntries
        .filter(e => e.day.toLowerCase() === dayName.toLowerCase())
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      if (dailyEntries.length > 0) {
        tableData.push([{ content: dayName.toUpperCase(), colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
        dailyEntries.forEach(entry => {
          tableData.push([
            `${entry.startTime} - ${entry.endTime}`,
            entry.subject,
            entry.section || 'General',
            entry.classRoom === 'Extra' ? 'Extra' : 'Regular'
          ]);
        });
      }
    });

    if (tableData.length === 0) {
      toast.error("No entries to download for this faculty member");
      return;
    }

    autoTable(doc, {
      startY: 40,
      head: [['Time', 'Subject', 'Section', 'Type']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [8, 90, 78], textColor: [255, 255, 255] }
    });

    doc.save(`${selectedStaff.fullName.replace(/\s+/g, '_')}_Timetable.pdf`);
    toast.success(`Faculty timetable for ${selectedStaff.fullName} downloaded!`);
  };

  // Selected section entries
  const currentSectionEntries = useMemo(() => {
    if (!selectedSection) return [];
    return entries.filter(e => {
      const cleanE = (e.section || '').replace(/\(Boys\)|\(Girls\)/gi, '').trim().toLowerCase();
      return cleanE === selectedSection.toLowerCase();
    });
  }, [entries, selectedSection]);

  const currentSectionObj = allSections.find(s => s.name.toLowerCase() === selectedSection.toLowerCase());

  // Count metrics
  const totalBoysLectures = entries.filter(e => getSectionGender(e.section) === 'Male').length;
  const totalGirlsLectures = entries.filter(e => getSectionGender(e.section) === 'Female').length;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER: MASTER CONTROLS & CAMPUS SWITCHER */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-superior-teal/10 flex items-center justify-center text-superior-teal">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>College Academic Timetable</span>
                <Badge variant="outline" className="border-superior-teal/30 text-superior-teal bg-superior-teal/5 text-xs font-bold">
                  {entries.length} Total Scheduled
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Comprehensive routine management & notice board printouts for Boys and Girls campuses.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center">
            <button
              type="button"
              onClick={() => setViewMode('master')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                viewMode === 'master' 
                  ? "bg-white text-superior-teal shadow-sm" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <FileText size={14} />
              <span>Section Notice Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                viewMode === 'daily' 
                  ? "bg-white text-superior-teal shadow-sm" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Grid size={14} />
              <span>Campus Daily Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('faculty')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                viewMode === 'faculty' 
                  ? "bg-white text-superior-teal shadow-sm" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Users size={14} />
              <span>Faculty Workload</span>
            </button>
          </div>

          {/* Quick Add Button */}
          <Button 
            onClick={() => {
              setFormStaffId(selectedStaff?.id || (staffList[0]?.id || ""));
              setSection(selectedSection || (predefinedSections[0]?.name || ""));
              setIsAddModalOpen(true);
            }}
            className="h-10 px-4 rounded-xl font-bold bg-superior-teal text-white shadow-sm flex items-center gap-2 ml-auto xl:ml-0"
          >
            <Plus size={16} /> Add Lecture
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CAMPUS SELECTION BAR (BOYS / GIRLS / COMBINED) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-3 rounded-2xl">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 pl-2">Campus Wing:</span>
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setCampusFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                campusFilter === 'all' 
                  ? "bg-slate-800 text-white" 
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <School size={13} />
              <span>All Campuses ({entries.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setCampusFilter('Male')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                campusFilter === 'Male' 
                  ? "bg-blue-600 text-white" 
                  : "text-blue-700 hover:bg-blue-50"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>Boys Campus ({totalBoysLectures})</span>
            </button>
            <button
              type="button"
              onClick={() => setCampusFilter('Female')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                campusFilter === 'Female' 
                  ? "bg-pink-600 text-white" 
                  : "text-pink-700 hover:bg-pink-50"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-pink-400"></span>
              <span>Girls Campus ({totalGirlsLectures})</span>
            </button>
          </div>
        </div>

        {/* Global Batch Notice Board Print Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchPrintAllNoticeBoards}
            className="h-9 px-3 rounded-xl font-bold bg-white text-superior-teal border-superior-teal/30 hover:bg-emerald-50 text-xs flex items-center gap-2 shadow-xs"
            title="Download formatted notice board copy for all classes in one multi-page PDF"
          >
            <Printer size={14} /> Batch Print All Notice Boards
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODE 1: SECTION NOTICE BOARD TIMETABLE */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'master' && (
        <div className="space-y-6">
          {/* Section Picker Bar */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Layers size={16} className="text-superior-teal" />
                  <span>Select Class / Section</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pick a section to view its full weekly lecture routine and print the classroom notice board copy.
                </p>
              </div>

              {/* Action Buttons for Current Section */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => generateSectionNoticeBoardPDF(selectedSection)}
                  disabled={!selectedSection || currentSectionEntries.length === 0}
                  className="h-10 px-4 rounded-xl font-bold bg-superior-teal text-white shadow-sm flex items-center gap-2"
                >
                  <Printer size={16} /> Print Notice Board Copy
                </Button>
              </div>
            </div>

            {/* Quick Section Pills */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {filteredSections.map(sec => {
                const isSelected = selectedSection.toLowerCase() === sec.name.toLowerCase();
                const secCount = entries.filter(e => (e.section || '').replace(/\(Boys\)|\(Girls\)/gi, '').trim().toLowerCase() === sec.name.toLowerCase()).length;
                const isGirl = sec.gender === 'Female';

                return (
                  <button
                    key={sec.name}
                    type="button"
                    onClick={() => setSelectedSection(sec.name)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border",
                      isSelected
                        ? isGirl
                          ? "bg-pink-600 text-white border-pink-600 shadow-sm"
                          : "bg-superior-teal text-white border-superior-teal shadow-sm"
                        : isGirl
                          ? "bg-pink-50/60 text-pink-800 border-pink-200/60 hover:bg-pink-100"
                          : "bg-blue-50/60 text-blue-800 border-blue-200/60 hover:bg-blue-100"
                    )}
                  >
                    <span>{sec.name}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-black",
                      isSelected ? "bg-white/20 text-white" : isGirl ? "bg-pink-200 text-pink-900" : "bg-blue-200 text-blue-900"
                    )}>
                      {secCount}
                    </span>
                  </button>
                );
              })}

              {filteredSections.length === 0 && (
                <div className="py-4 text-xs text-slate-400 italic">
                  No sections match the current campus filter.
                </div>
              )}
            </div>
          </div>

          {/* Section Summary Header */}
          {selectedSection && (
            <Card className="bg-white border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg",
                    currentSectionObj?.gender === 'Female' ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {selectedSection.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-800">{selectedSection}</h3>
                      <Badge className={cn(
                        "text-[10px] font-black uppercase tracking-wider",
                        currentSectionObj?.gender === 'Female' ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {currentSectionObj?.gender === 'Female' ? 'Girls Campus' : 'Boys Campus'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-semibold text-slate-500">
                        {currentSectionObj?.program || 'Inter'} • {currentSectionObj?.class || settings?.academicSession || '2026-28'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Weekly Schedule: {currentSectionEntries.length} Lectures &bull; Notice Board Approved Copy
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400">Total Workload</p>
                  <p className="text-lg font-black text-superior-teal">{currentSectionEntries.length} Periods/Week</p>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* 6-Day Weekly Matrix Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {DAYS_OF_WEEK.map(d => {
                    const dayLectures = currentSectionEntries
                      .filter(e => e.day.toLowerCase() === d.toLowerCase())
                      .sort((a, b) => a.startTime.localeCompare(b.startTime));

                    return (
                      <div key={d} className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="font-black text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <Calendar size={13} className="text-superior-teal" /> {d}
                          </span>
                          <Badge variant="secondary" className="bg-white text-slate-600 text-[10px] font-bold">
                            {dayLectures.length} {dayLectures.length === 1 ? 'Period' : 'Periods'}
                          </Badge>
                        </div>

                        <div className="space-y-2.5 flex-1">
                          {dayLectures.map((entry, idx) => (
                            <div 
                              key={entry.id} 
                              className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs hover:border-superior-teal/40 transition-all relative group"
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveEntry(entry.id)}
                                className="absolute top-2 right-2 h-6 w-6 rounded-full text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove lecture"
                              >
                                <X size={12} />
                              </Button>

                              <div className="flex items-center gap-1.5 text-superior-teal font-black text-xs mb-1">
                                <Clock size={12} />
                                <span>{entry.startTime} - {entry.endTime}</span>
                                <span className="text-[10px] bg-superior-teal/10 px-1.5 py-0.2 rounded-md text-superior-teal font-bold ml-auto">
                                  P{idx + 1}
                                </span>
                              </div>

                              <p className="font-black text-slate-800 text-sm">{entry.subject}</p>

                              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mt-2 pt-2 border-t border-slate-50">
                                <span className="flex items-center gap-1 truncate max-w-[150px]" title={getTeacherName(entry.staffId)}>
                                  <Users size={12} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{getTeacherName(entry.staffId)}</span>
                                </span>
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-50 font-bold border-slate-200">
                                  {entry.classRoom || 'Regular'}
                                </Badge>
                              </div>
                            </div>
                          ))}

                          {dayLectures.length === 0 && (
                            <div className="py-8 text-center text-slate-400 text-xs italic">
                              No lectures scheduled for {d}.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 2: CAMPUS DAILY MATRIX */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'daily' && (
        <Card className="bg-white border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Grid size={18} className="text-superior-teal" />
                <span>Master Daily Schedule Matrix</span>
              </CardTitle>
              <CardDescription className="text-xs font-medium text-slate-400 mt-1">
                College-wide consolidated period view across sections for {selectedDay}.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Day Selector Pills */}
              <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1">
                {DAYS_OF_WEEK.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDay(d)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      selectedDay === d ? "bg-superior-teal text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintDailyMatrix}
                className="h-9 px-3 rounded-xl font-bold bg-white text-superior-teal border-superior-teal/30 hover:bg-emerald-50 text-xs flex items-center gap-2"
              >
                <Printer size={14} /> Print Day Matrix
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-black">
                  <th className="p-4 min-w-[140px] sticky left-0 bg-slate-100 z-10">Class / Section</th>
                  <th className="p-4 min-w-[100px]">Wing</th>
                  {STANDARD_PERIODS.filter(p => p.name !== 'Break').map(p => (
                    <th key={p.name} className="p-4 text-center min-w-[130px] border-l border-slate-200">
                      <div className="font-black text-slate-800">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{p.startTime} - {p.endTime}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSections.map(sec => {
                  const periods = STANDARD_PERIODS.filter(p => p.name !== 'Break');
                  const isGirl = sec.gender === 'Female';

                  return (
                    <tr key={sec.name} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-black text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-xs">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", isGirl ? "bg-pink-500" : "bg-blue-500")}></span>
                          <span>{sec.name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-500">
                        <Badge variant="secondary" className={cn("text-[10px]", isGirl ? "bg-pink-50 text-pink-700" : "bg-blue-50 text-blue-700")}>
                          {isGirl ? 'Girls' : 'Boys'}
                        </Badge>
                      </td>
                      {periods.map(p => {
                        const lecture = campusFilteredEntries.find(e => {
                          const cleanE = (e.section || '').replace(/\(Boys\)|\(Girls\)/gi, '').trim().toLowerCase();
                          return e.day.toLowerCase() === selectedDay.toLowerCase() &&
                            cleanE === sec.name.toLowerCase() &&
                            timesOverlap(e.startTime, e.endTime, p.startTime, p.endTime);
                        });

                        return (
                          <td key={p.name} className="p-3 border-l border-slate-100 text-center">
                            {lecture ? (
                              <div className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-left space-y-1">
                                <p className="font-black text-slate-800 truncate" title={lecture.subject}>{lecture.subject}</p>
                                <p className="text-[10px] text-superior-teal font-bold truncate" title={getTeacherName(lecture.staffId)}>
                                  {getTeacherName(lecture.staffId)}
                                </p>
                                <span className="text-[9px] text-slate-400 font-medium block">
                                  {lecture.classRoom || 'Regular'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-bold">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {filteredSections.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                      No sections found for this campus.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 3: FACULTY WORKLOAD & SCHEDULE (TEACHER SPECIFIC) */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'faculty' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 border-r border-slate-100 pr-0 lg:pr-6">
            <h3 className="text-lg font-black mb-4 text-slate-800">Faculty Directory</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input 
                placeholder="Search faculty members..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-12 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {filteredStaff.map(staff => {
                const sLectures = entries.filter(e => e.staffId === staff.id).length;
                return (
                  <div 
                    key={staff.id} 
                    onClick={() => {
                      setSelectedStaff(staff);
                      setFormStaffId(staff.id);
                      setSubject("");
                    }}
                    className={cn(
                      "p-4 rounded-xl cursor-pointer transition-all border flex items-center justify-between",
                      selectedStaff?.id === staff.id 
                        ? 'border-superior-teal bg-superior-teal/5 shadow-xs' 
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <div>
                      <p className="font-bold text-slate-800">{staff.fullName}</p>
                      <p className="text-xs text-slate-500 font-medium">{staff.role || 'Teacher'}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-bold bg-white text-slate-600 border border-slate-200">
                      {sLectures} {sLectures === 1 ? 'Class' : 'Classes'}
                    </Badge>
                  </div>
                );
              })}
              {filteredStaff.length === 0 && (
                <div className="text-center text-sm text-slate-500 py-8">
                  No staff found matching search.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedStaff ? (
              <div className="space-y-6">
                <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-black text-slate-800">
                        {selectedStaff.fullName}'s Schedule
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                          {staffEntries.length} Total Lectures
                        </span>
                        <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                          {staffEntries.filter(e => e.classRoom !== 'Extra').length} Regular
                        </span>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                          {staffEntries.filter(e => e.classRoom === 'Extra').length} Extra
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadTimetablePDF} 
                      className="h-10 rounded-xl font-bold bg-white text-superior-teal border-superior-teal/20 hover:bg-superior-teal/5 flex items-center gap-2"
                    >
                      <Download size={16} /> Faculty Schedule PDF
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-8">
                      {DAYS_OF_WEEK.map(d => {
                        const dayEntries = staffEntries.filter(e => e.day.toLowerCase() === d.toLowerCase()).sort((a, b) => a.startTime.localeCompare(b.startTime));
                        if (dayEntries.length === 0) return null;
                        return (
                          <div key={d}>
                            <h4 className="text-sm font-bold text-slate-700 bg-slate-100 px-4 py-2 rounded-lg mb-3 inline-block uppercase tracking-wider">{d}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {dayEntries.map(entry => (
                                <div key={entry.id} className="relative p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-superior-teal transition-colors group">
                                  <Button 
                                    variant="destructive" 
                                    size="icon"
                                    onClick={() => handleRemoveEntry(entry.id)}
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={12} />
                                  </Button>
                                  <div className="flex items-center text-superior-teal font-black mb-2 text-sm">
                                    <Clock size={14} className="mr-1"/> {entry.startTime} - {entry.endTime}
                                  </div>
                                  <p className="font-bold text-slate-800 text-lg mb-1">{entry.subject}</p>
                                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                    {entry.classRoom === 'Extra' ? (
                                      <span className="bg-amber-100/50 text-amber-700 px-2 py-1 rounded-md border border-amber-200">Extra Lecture</span>
                                    ) : (
                                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200">Regular</span>
                                    )}
                                    <span className="bg-white px-2 py-1 rounded-md border border-slate-200 line-clamp-1 flex-1 text-center" title={entry.section}>Sec: {entry.section || 'N/A'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {staffEntries.length === 0 && (
                        <div className="text-center p-12 text-slate-400 italic border-2 border-dashed border-slate-100 rounded-2xl">
                          No schedule entries found for {selectedStaff.fullName}.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-[2rem]">
                Select a faculty member from the list to view/manage their weekly timetable.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* QUICK ADD LECTURE MODAL / DIALOG */}
      {/* ------------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-superior-teal/10 flex items-center justify-center text-superior-teal">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg">Add Timetable Lecture</h3>
                  <p className="text-xs text-slate-400 font-medium">Assign a subject, teacher, and time slot to a section</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </Button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Teacher Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Assigned Faculty Member</label>
                <Select value={formStaffId} onValueChange={(val) => {
                  setFormStaffId(val);
                  setSubject("");
                }}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl font-medium">
                    <SelectValue placeholder="Select faculty member" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    {staffList.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName} ({s.role || 'Teacher'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Day & Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Day of Week</label>
                  <Select value={day} onValueChange={setDay}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Class / Section</label>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl font-medium">
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {allSections.map(s => (
                        <SelectItem key={s.name} value={s.name}>
                          {s.name} ({s.gender === 'Female' ? 'Girls' : 'Boys'}) - {s.program}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Start & End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Start Time</label>
                  <Input 
                    type="time" 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)} 
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl font-medium" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">End Time</label>
                  <Input 
                    type="time" 
                    value={endTime} 
                    onChange={e => setEndTime(e.target.value)} 
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl font-medium" 
                  />
                </div>
              </div>

              {/* Quick Period Presets */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Quick Period Presets</label>
                <div className="flex flex-wrap gap-1.5">
                  {STANDARD_PERIODS.filter(p => p.name !== 'Break').map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setStartTime(p.startTime);
                        setEndTime(p.endTime);
                      }}
                      className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all",
                        startTime === p.startTime && endTime === p.endTime
                          ? "bg-superior-teal text-white border-superior-teal shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {p.name} ({p.startTime})
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject & Lecture Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Subject</label>
                  {currentStaffObj && (currentStaffObj.subjects || []).length > 0 ? (
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl font-medium">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {(currentStaffObj.subjects || []).map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                        <SelectItem value="Other">Other / Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      placeholder="e.g. Physics, Chemistry..." 
                      value={subject} 
                      onChange={e => setSubject(e.target.value)}
                      className="h-11 bg-slate-50 border-slate-200 rounded-xl font-medium"
                    />
                  )}
                  {subject === 'Other' && (
                    <Input 
                      placeholder="Enter custom subject name" 
                      onChange={e => setSubject(e.target.value)} 
                      className="mt-2 h-11 bg-slate-50 border-slate-200 rounded-xl font-medium"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Room / Lecture Type</label>
                  <Select value={classRoom} onValueChange={setClassRoom}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regular">Regular Lecture</SelectItem>
                      <SelectItem value="Extra">Extra Lecture</SelectItem>
                      <SelectItem value="Lab 1">Computer Lab 1</SelectItem>
                      <SelectItem value="Lab 2">Science Lab</SelectItem>
                      <SelectItem value="Hall A">Hall A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Live Clash Warning Banner */}
              {detectedClash && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/90 text-rose-900 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-left flex-1">
                      <p className="font-bold text-sm text-rose-800 flex items-center gap-1.5">
                        <span>{detectedClash.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 uppercase tracking-wider font-extrabold">
                          {detectedClash.type === 'teacher' ? 'Double-Booking' : 'Section Busy'}
                        </span>
                      </p>
                      <p className="text-xs text-rose-700 leading-relaxed">
                        {detectedClash.details}
                      </p>
                      <label className="flex items-center gap-2 pt-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allowClashOverride}
                          onChange={(e) => setAllowClashOverride(e.target.checked)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                        />
                        <span className="text-xs font-bold text-rose-900 hover:text-rose-950">
                          Allow override (Force assign despite clash)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl h-11 px-5 font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddEntry} 
                  className={cn(
                    "rounded-xl h-11 px-6 text-white font-bold transition-all shadow-md",
                    detectedClash && !allowClashOverride
                      ? 'bg-rose-600 hover:bg-rose-700 cursor-not-allowed opacity-90'
                      : 'bg-superior-teal hover:bg-superior-teal/90'
                  )}
                >
                  {detectedClash && !allowClashOverride ? 'Resolve Conflict' : 'Confirm & Save Lecture'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
