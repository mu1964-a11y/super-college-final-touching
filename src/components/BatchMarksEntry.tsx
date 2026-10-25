import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  BookOpen,
  Download,
  Upload,
  Search,
  FileSpreadsheet,
  HelpCircle,
  Users,
  ArrowDown,
  Check,
  Trash2,
  Plus,
  X,
  Calendar,
  Hash,
  Table2,
  ListFilter,
  CopyCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface BatchMarksEntryProps {
  students: any[];
  academicRecords: any[];
  onSaveBatchMarks: (records: any[]) => void;
  predefinedSections?: any[];
  settings?: any;
}

interface SubjectColumnConfig {
  id: string;
  name: string;
  totalMarks: string;
  examDate: string;
}

const PROGRAM_CATEGORIES = [
  { id: 'all', label: 'All Programs' },
  { id: 'Inter', label: 'Intermediate (F.Sc / ICS / I.Com / FA)' },
  { id: 'BS', label: 'BS Programs (4-Year)' },
  { id: 'DIT', label: 'DIT (Diploma)' },
  { id: 'UKL3', label: 'UKL3 (International)' },
];

const TEST_TYPES = [
  { id: 'Daily', label: 'Daily Test (روزانہ ٹیسٹ)' },
  { id: 'Weekly', label: 'Weekly Test (ہفتہ وار ٹیسٹ)' },
  { id: 'Monthly', label: 'Monthly Exam (ماہانہ ٹیسٹ)' },
  { id: 'Mid-Term', label: 'Mid-Term / Send-Up' },
  { id: 'Six-Month', label: '6-Month Terminal Exam' },
  { id: 'Pre-Board', label: 'Pre-Board Exam' },
];

const COMMON_SUBJECTS = [
  'Physics',
  'Chemistry',
  'Biology',
  'Mathematics',
  'Computer Science',
  'English',
  'Urdu',
  'Islamiat',
  'Pakistan Studies',
  'Principles of Accounting',
  'Principles of Economics',
  'Principles of Commerce',
  'Business Math',
  'Statistics',
  'Civics',
  'Education',
  'Programming Fundamentals',
  'Database Systems',
  'Operating Systems',
  'Networking',
  'MS Office & ICT',
  'Business Communication',
];

function getDefaultSubjectsForGroup(
  program: string,
  groupName: string,
  defaultTotal: string,
  defaultDate: string
): SubjectColumnConfig[] {
  const g = (groupName || '').toUpperCase();
  const p = (program || '').toUpperCase();

  let names: string[] = [];

  if (p === 'DIT' || g.includes('DIT')) {
    names = ['MS Office & ICT', 'Operating Systems', 'Networking', 'Programming Fundamentals', 'Database Systems'];
  } else if (p === 'UKL3' || g.includes('UKL3') || g.includes('UK LEVEL')) {
    names = ['Business Environment', 'Business Communication', 'IT in Business', 'Financial Accounting'];
  } else if (p === 'BS' || g.includes('BS') || g.includes('ADP')) {
    if (g.includes('ENG')) {
      names = ['Introduction to Literature', 'Linguistics', 'Academic Writing', 'Pakistan Studies', 'ICT'];
    } else {
      names = ['Programming Fundamentals', 'Calculus & Analytical Geometry', 'Applied Physics', 'English Composition', 'ICT'];
    }
  } else if (g.includes('MED')) {
    names = ['Biology', 'Physics', 'Chemistry', 'English', 'Urdu', 'Islamiat / Pak Studies'];
  } else if (g.includes('ENG')) {
    names = ['Mathematics', 'Physics', 'Chemistry', 'English', 'Urdu', 'Islamiat / Pak Studies'];
  } else if (g.includes('ICS')) {
    names = ['Computer Science', 'Mathematics', 'Physics', 'English', 'Urdu', 'Islamiat / Pak Studies'];
  } else if (g.includes('COM')) {
    names = ['Principles of Accounting', 'Principles of Economics', 'Principles of Commerce', 'Business Math', 'English', 'Urdu'];
  } else if (g.includes('FA') || g.includes('ARTS') || g.includes('HUM')) {
    names = ['Education', 'Civics', 'Economics', 'English', 'Urdu', 'Islamiat / Pak Studies'];
  } else {
    names = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'English', 'Urdu'];
  }

  return names.map((name, idx) => {
    // Realistic default board/college marks per subject if defaultTotal is 85/100
    let customMax = defaultTotal || '50';
    if (defaultTotal === '100' || defaultTotal === '85') {
      if (['Physics', 'Chemistry', 'Biology'].includes(name)) customMax = '85';
      else if (name === 'Computer Science') customMax = '75';
      else if (name.includes('Islamiat') || name.includes('Pakistan Studies') || name === 'Business Math') customMax = '50';
      else customMax = '100';
    }
    return {
      id: `sub-${idx}-${name.replace(/\s+/g, '_')}`,
      name,
      totalMarks: customMax,
      examDate: defaultDate,
    };
  });
}

function matchesProgramCategory(student: any, category: string): boolean {
  if (category === 'all') return true;
  const grp = String(student.group || student.course || student.category || '').toUpperCase();
  const cat = String(student.category || '').toUpperCase();
  if (category === 'BS') return grp.includes('BS') || cat.includes('BS') || grp.includes('ADP');
  if (category === 'DIT') return grp.includes('DIT') || cat.includes('DIT');
  if (category === 'UKL3')
    return grp.includes('UKL3') || grp.includes('UK LEVEL') || cat.includes('UKL3');
  if (category === 'Inter') {
    return (
      !grp.includes('BS') &&
      !grp.includes('DIT') &&
      !grp.includes('UKL3') &&
      !cat.includes('BS') &&
      !cat.includes('DIT') &&
      !cat.includes('UKL3')
    );
  }
  return true;
}

function getGradeBadge(pct: number): { grade: string; colorClass: string } {
  if (pct >= 80) return { grade: 'A+', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  if (pct >= 70) return { grade: 'A', colorClass: 'bg-teal-100 text-teal-800 border-teal-300' };
  if (pct >= 60) return { grade: 'B', colorClass: 'bg-sky-100 text-sky-800 border-sky-300' };
  if (pct >= 50) return { grade: 'C', colorClass: 'bg-amber-100 text-amber-800 border-amber-300' };
  if (pct >= 40) return { grade: 'D', colorClass: 'bg-orange-100 text-orange-800 border-orange-300' };
  return { grade: 'F', colorClass: 'bg-rose-100 text-rose-800 border-rose-300' };
}

export default function BatchMarksEntry({
  students = [],
  academicRecords = [],
  onSaveBatchMarks,
  predefinedSections = [],
}: BatchMarksEntryProps) {
  // Entry Mode: 'multi' (Multi-Subject Sheet with custom Total Marks & Date per subject) or 'single'
  const [entryMode, setEntryMode] = useState<'multi' | 'single'>('multi');

  // Step 1: Class / Campus / Group / Section Hierarchy Filters
  const [programFilter, setProgramFilter] = useState<string>('Inter');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Step 2: Exam / Test Configuration
  const [testType, setTestType] = useState<string>('Monthly');
  const [testName, setTestName] = useState<string>('Monthly Assessment');
  const [subject, setSubject] = useState<string>('Physics');
  const [examDate, setExamDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [totalMarks, setTotalMarks] = useState<string>('50');
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Multi-Subject Columns Configuration (each subject has its own custom Total Marks & Test Date)
  const [subjectColumns, setSubjectColumns] = useState<SubjectColumnConfig[]>(() =>
    getDefaultSubjectsForGroup('Inter', 'Pre-Medical', '50', new Date().toISOString().split('T')[0])
  );
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubMarks, setNewSubMarks] = useState<string>('50');

  // Multi-Subject Marks State: studentId -> { [subjectId]: obtainedMarksString }
  const [multiMarksMap, setMultiMarksMap] = useState<Record<string, Record<string, string>>>({});

  // Single-Subject Marks State: studentId -> obtainedMarksString
  const [marksMap, setMarksMap] = useState<Record<string, string>>({});
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const multiInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Update subject columns automatically when Program or Group changes
  useEffect(() => {
    const preset = getDefaultSubjectsForGroup(programFilter, groupFilter, totalMarks, examDate);
    setSubjectColumns(preset);
  }, [programFilter, groupFilter]);

  // Active students (excluding Struck Off)
  const activeStudents = useMemo(
    () => (students || []).filter((s) => s.status !== 'Struck Off'),
    [students]
  );

  // Available specific groups within selected Program + Gender
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    activeStudents.forEach((s) => {
      if (!matchesProgramCategory(s, programFilter)) return;
      if (genderFilter !== 'all' && (s.gender || 'Male') !== genderFilter) return;
      if (s.group && String(s.group).trim()) set.add(String(s.group).trim());
    });
    return Array.from(set).sort();
  }, [activeStudents, programFilter, genderFilter]);

  // Available sections within selected Program + Gender + Group
  const availableSections = useMemo(() => {
    const secSet = new Set<string>();
    activeStudents.forEach((s) => {
      if (!matchesProgramCategory(s, programFilter)) return;
      if (genderFilter !== 'all' && (s.gender || 'Male') !== genderFilter) return;
      if (groupFilter !== 'all' && (s.group || '') !== groupFilter) return;
      if (s.section && String(s.section).trim() && s.section !== '-') {
        secSet.add(String(s.section).trim());
      }
    });
    (predefinedSections || []).forEach((ps: any) => {
      const name = typeof ps === 'string' ? ps : ps?.name;
      const pGender = typeof ps === 'object' ? ps?.gender : null;
      if (name && (genderFilter === 'all' || !pGender || pGender === genderFilter)) {
        secSet.add(String(name).trim());
      }
    });
    return Array.from(secSet).sort();
  }, [activeStudents, programFilter, genderFilter, groupFilter, predefinedSections]);

  // Reset sub-filters if they become invalid when switching Program/Gender
  useEffect(() => {
    setGroupFilter('all');
    setSectionFilter('all');
  }, [programFilter, genderFilter]);

  // Filtered & Ordered Students List (Ordered by Section -> Roll No -> Name)
  const filteredStudents = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    return activeStudents
      .filter((s) => {
        if (!matchesProgramCategory(s, programFilter)) return false;
        if (genderFilter !== 'all' && (s.gender || 'Male') !== genderFilter) return false;
        if (groupFilter !== 'all' && (s.group || '') !== groupFilter) return false;
        if (
          sectionFilter !== 'all' &&
          (s.section || '').toLowerCase() !== sectionFilter.toLowerCase()
        ) {
          return false;
        }
        if (q) {
          const name = (s.fullName || '').toLowerCase();
          const roll = String(s.collegeNo || s.studentId || s.id || '').toLowerCase();
          const father = (s.fatherName || '').toLowerCase();
          return name.includes(q) || roll.includes(q) || father.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        const secA = String(a.section || 'Z');
        const secB = String(b.section || 'Z');
        if (secA !== secB) return secA.localeCompare(secB);
        const rollA = String(a.collegeNo || a.studentId || a.id || '');
        const rollB = String(b.collegeNo || b.studentId || b.id || '');
        return rollA.localeCompare(rollB, undefined, { numeric: true });
      });
  }, [activeStudents, programFilter, genderFilter, groupFilter, sectionFilter, searchQuery]);

  // Available subjects based on students in the current filter + common subjects
  const subjectSuggestions = useMemo(() => {
    const set = new Set<string>(COMMON_SUBJECTS);
    filteredStudents.forEach((s) => {
      if (Array.isArray(s.subjects)) {
        s.subjects.forEach((sub: string) => sub && set.add(sub));
      }
    });
    (academicRecords || []).forEach((r: any) => {
      if (r.subject) set.add(r.subject);
    });
    return Array.from(set).sort();
  }, [filteredStudents, academicRecords]);

  // Single-subject existing record lookup
  const existingRecordMap = useMemo(() => {
    const map: Record<string, any> = {};
    const cleanSub = (subject || '').trim().toLowerCase();
    (academicRecords || []).forEach((r: any) => {
      if (
        (r.subject || '').trim().toLowerCase() === cleanSub &&
        (r.testType || '').toLowerCase() === testType.toLowerCase() &&
        r.date === examDate
      ) {
        map[r.studentId] = r;
      }
    });
    return map;
  }, [academicRecords, subject, testType, examDate]);

  // Multi-subject existing record lookup: studentId -> subjectNameLower -> record
  const existingMultiRecordMap = useMemo(() => {
    const map: Record<string, Record<string, any>> = {};
    (academicRecords || []).forEach((r: any) => {
      if ((r.testType || '').toLowerCase() !== testType.toLowerCase()) return;
      const sId = r.studentId;
      const subKey = String(r.subject || '').trim().toLowerCase();
      if (!sId || !subKey) return;
      if (!map[sId]) map[sId] = {};
      map[sId][subKey] = r;
    });
    return map;
  }, [academicRecords, testType]);

  // Update a specific subject column's config (name, totalMarks, or examDate)
  const updateSubjectColumn = (
    colId: string,
    field: keyof SubjectColumnConfig,
    value: string
  ) => {
    setSubjectColumns((prev) =>
      prev.map((col) => (col.id === colId ? { ...col, [field]: value } : col))
    );
  };

  // Add a custom subject column to the Multi-Subject Matrix
  const handleAddSubjectColumn = () => {
    const clean = newSubName.trim();
    if (!clean) {
      toast.error('Please enter a subject name to add.');
      return;
    }
    if (subjectColumns.some((c) => c.name.toLowerCase() === clean.toLowerCase())) {
      toast.error(`Subject "${clean}" is already in the sheet.`);
      return;
    }
    setSubjectColumns((prev) => [
      ...prev,
      {
        id: `sub-${Date.now()}-${clean.replace(/\s+/g, '_')}`,
        name: clean,
        totalMarks: newSubMarks || totalMarks || '50',
        examDate,
      },
    ]);
    setNewSubName('');
    toast.success(`Added "${clean}" (Max: ${newSubMarks || totalMarks}) column to sheet.`);
  };

  const handleRemoveSubjectColumn = (colId: string) => {
    if (subjectColumns.length <= 1) {
      toast.error('At least one subject column must remain in the matrix.');
      return;
    }
    setSubjectColumns((prev) => prev.filter((c) => c.id !== colId));
  };

  // Apply default totalMarks & examDate to all subject columns in 1 click
  const handleApplyDefaultsToAllSubjects = () => {
    setSubjectColumns((prev) =>
      prev.map((c) => ({
        ...c,
        totalMarks: totalMarks || '50',
        examDate: examDate,
      }))
    );
    toast.success(`Applied ${totalMarks} Total Marks & Date (${examDate}) to all ${subjectColumns.length} subjects!`);
  };

  // Set obtained marks for a student in a specific subject column
  const handleMultiMarkChange = (studentId: string, colId: string, val: string) => {
    setMultiMarksMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [colId]: val,
      },
    }));
  };

  // Keyboard navigation for Multi-Subject Matrix (Enter/Down moves down same column; Left/Right moves across columns)
  const handleMultiKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextStu = filteredStudents[rowIdx + 1];
      const col = subjectColumns[colIdx];
      if (nextStu && col) {
        const key = `${nextStu.id}__${col.id}`;
        multiInputRefs.current[key]?.focus();
        multiInputRefs.current[key]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevStu = filteredStudents[rowIdx - 1];
      const col = subjectColumns[colIdx];
      if (prevStu && col) {
        const key = `${prevStu.id}__${col.id}`;
        multiInputRefs.current[key]?.focus();
        multiInputRefs.current[key]?.select();
      }
    } else if (e.key === 'ArrowRight') {
      const stu = filteredStudents[rowIdx];
      const nextCol = subjectColumns[colIdx + 1];
      if (stu && nextCol) {
        e.preventDefault();
        const key = `${stu.id}__${nextCol.id}`;
        multiInputRefs.current[key]?.focus();
        multiInputRefs.current[key]?.select();
      }
    } else if (e.key === 'ArrowLeft') {
      const stu = filteredStudents[rowIdx];
      const prevCol = subjectColumns[colIdx - 1];
      if (stu && prevCol) {
        e.preventDefault();
        const key = `${stu.id}__${prevCol.id}`;
        multiInputRefs.current[key]?.focus();
        multiInputRefs.current[key]?.select();
      }
    }
  };

  // Handle Enter / Down Arrow / Up Arrow for Single-Subject entry
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextStudent = filteredStudents[currentIndex + 1];
      if (nextStudent && inputRefs.current[nextStudent.id]) {
        inputRefs.current[nextStudent.id]?.focus();
        inputRefs.current[nextStudent.id]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevStudent = filteredStudents[currentIndex - 1];
      if (prevStudent && inputRefs.current[prevStudent.id]) {
        inputRefs.current[prevStudent.id]?.focus();
        inputRefs.current[prevStudent.id]?.select();
      }
    }
  };

  // Save All Entered Marks (Handles both Multi-Subject Matrix and Single-Subject Mode)
  const handleSaveBatch = () => {
    if (entryMode === 'multi') {
      const entriesToSave: any[] = [];

      for (const stu of filteredStudents) {
        const stuRow = multiMarksMap[stu.id] || {};
        for (const col of subjectColumns) {
          const rawVal = stuRow[col.id];
          if (rawVal === undefined || String(rawVal).trim() === '') continue;
          const numVal = Number(rawVal);
          if (isNaN(numVal)) continue;

          const maxMarks = Number(col.totalMarks) || Number(totalMarks) || 100;
          if (maxMarks <= 0) {
            toast.error(`Total Marks for ${col.name} must be greater than 0.`);
            return;
          }
          if (numVal > maxMarks) {
            toast.error(
              `${stu.fullName}'s marks in ${col.name} (${numVal}) cannot exceed Total Marks (${maxMarks}).`
            );
            return;
          }

          const pct = (numVal / maxMarks) * 100;
          const autoRemark =
            remarksMap[stu.id] ||
            (pct >= 80
              ? 'Excellent'
              : pct >= 60
              ? 'Good Progress'
              : pct >= 50
              ? 'Satisfactory'
              : 'Needs Extra Attention');

          entriesToSave.push({
            studentId: stu.id,
            studentName: stu.fullName,
            class: stu.group || programFilter || 'Inter',
            section: stu.section || 'A',
            testName: testName.trim() || `${testType} Exam`,
            testType,
            date: col.examDate || examDate,
            subject: col.name.trim(),
            totalMarks: maxMarks,
            obtainedMarks: numVal,
            remarks: autoRemark,
          });
        }
      }

      if (entriesToSave.length === 0) {
        toast.error('Please enter marks in at least one subject cell before saving.');
        return;
      }

      onSaveBatchMarks(entriesToSave);
      toast.success(
        `Successfully saved ${entriesToSave.length} subject-wise mark records across the class!`
      );
      setMultiMarksMap({});
      setRemarksMap({});
      return;
    }

    // Single-Subject Mode Save
    if (!subject.trim()) {
      toast.error('Please enter or select a Subject Name first.');
      return;
    }
    const maxMarks = Number(totalMarks) || 100;
    if (maxMarks <= 0) {
      toast.error('Total Marks must be greater than 0.');
      return;
    }

    const entriesToSave: any[] = [];
    for (const stu of filteredStudents) {
      const rawVal = marksMap[stu.id];
      if (rawVal === undefined || rawVal.trim() === '') continue;
      const numVal = Number(rawVal);
      if (isNaN(numVal)) continue;

      if (numVal > maxMarks) {
        toast.error(
          `${stu.fullName}'s obtained marks (${numVal}) cannot exceed Total Marks (${maxMarks}).`
        );
        return;
      }

      const pct = (numVal / maxMarks) * 100;
      const autoRemark =
        remarksMap[stu.id] ||
        (pct >= 80
          ? 'Excellent'
          : pct >= 60
          ? 'Good Progress'
          : pct >= 50
          ? 'Satisfactory'
          : 'Needs Extra Attention');

      entriesToSave.push({
        studentId: stu.id,
        studentName: stu.fullName,
        class: stu.group || programFilter || 'Inter',
        section: stu.section || 'A',
        testName: testName.trim() || `${testType} Exam`,
        testType,
        date: examDate,
        subject: subject.trim(),
        totalMarks: maxMarks,
        obtainedMarks: numVal,
        remarks: autoRemark,
      });
    }

    if (entriesToSave.length === 0) {
      toast.error('Please enter marks for at least one student in the list below.');
      return;
    }

    onSaveBatchMarks(entriesToSave);
    toast.success(
      `Successfully saved ${entriesToSave.length} students' marks for ${subject} (${testType})!`
    );
    setMarksMap({});
    setRemarksMap({});
  };

  // Download Pre-Filled Class Format Excel Sheet (Multi-Subject or Single-Subject)
  const handleDownloadDemoFormat = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students in current filter to generate format sheet.');
      return;
    }

    if (entryMode === 'multi') {
      const rows = filteredStudents.map((stu, idx) => {
        const rowObj: Record<string, any> = {
          S_No: idx + 1,
          Student_ID: stu.id,
          Roll_No: stu.collegeNo || stu.studentId || stu.id,
          Student_Name: stu.fullName || '',
          Father_Name: stu.fatherName || '',
          Campus: stu.gender === 'Female' ? 'Girls Campus' : 'Boys Campus',
          Program_Group: stu.group || programFilter,
          Section: stu.section || 'A',
          Test_Type: testType,
        };

        subjectColumns.forEach((col) => {
          const headerKey = `${col.name} (Max:${col.totalMarks}|Date:${col.examDate})`;
          const existing = existingMultiRecordMap[stu.id]?.[col.name.toLowerCase()];
          const val =
            multiMarksMap[stu.id]?.[col.id] !== undefined
              ? multiMarksMap[stu.id][col.id]
              : existing
              ? existing.obtainedMarks
              : '';
          rowObj[headerKey] = val;
        });

        rowObj['Remarks'] = remarksMap[stu.id] || '';
        return rowObj;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Multi_Subject_Marks');

      const safeClass = `${programFilter}_${genderFilter === 'all' ? 'All' : genderFilter}_${
        sectionFilter === 'all' ? 'AllSec' : sectionFilter
      }`.replace(/[^a-zA-Z0-9_-]/g, '_');

      XLSX.writeFile(wb, `SCJ_MultiSubject_Marks_${safeClass}_${examDate}.xlsx`);
      toast.success('Multi-Subject Class Excel Sheet downloaded! Fill marks under each subject column and upload.');
      return;
    }

    const maxM = Number(totalMarks) || 50;
    const rows = filteredStudents.map((stu, idx) => ({
      S_No: idx + 1,
      Student_ID: stu.id,
      Roll_No: stu.collegeNo || stu.studentId || stu.id,
      Student_Name: stu.fullName || '',
      Father_Name: stu.fatherName || '',
      Campus: stu.gender === 'Female' ? 'Girls Campus' : 'Boys Campus',
      Program_Group: stu.group || programFilter,
      Section: stu.section || 'A',
      Subject: subject || 'Physics',
      Test_Type: testType,
      Test_Name: testName || `${testType} Test`,
      Exam_Date: examDate,
      Total_Marks: maxM,
      Obtained_Marks: marksMap[stu.id] !== undefined ? marksMap[stu.id] : '',
      Remarks: remarksMap[stu.id] || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks_Format_Sheet');

    const safeClass = `${programFilter}_${genderFilter === 'all' ? 'All' : genderFilter}_${
      sectionFilter === 'all' ? 'AllSec' : sectionFilter
    }_${subject}`.replace(/[^a-zA-Z0-9_-]/g, '_');

    XLSX.writeFile(wb, `SCJ_Marks_Format_${safeClass}_${examDate}.xlsx`);
    toast.success('Class Marks Format Excel Sheet downloaded! Fill "Obtained_Marks" and upload.');
  };

  // Upload Filled Excel Sheet & Auto-Populate Grid (Supports both Multi-Subject and Single-Subject sheets)
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          toast.error('The uploaded Excel sheet is empty.');
          return;
        }

        if (entryMode === 'multi') {
          let matchedCells = 0;
          const nextMulti: Record<string, Record<string, string>> = { ...multiMarksMap };

          rows.forEach((row) => {
            const rowStudentId = String(row.Student_ID || row.student_id || row.ID || row.id || '')
              .trim()
              .toLowerCase();
            const rowRoll = String(row.Roll_No || row.roll_no || row['Roll No'] || row.College_No || '')
              .trim()
              .toLowerCase();
            const rowName = String(row.Student_Name || row.student_name || row.Name || '')
              .trim()
              .toLowerCase();

            const matchedStu = activeStudents.find((s) => {
              const sId = String(s.id || '').toLowerCase();
              const sRoll = String(s.collegeNo || s.studentId || '').toLowerCase();
              const sName = String(s.fullName || '').toLowerCase();
              if (rowStudentId && sId === rowStudentId) return true;
              if (rowRoll && (sRoll === rowRoll || sId === rowRoll)) return true;
              if (rowName && sName === rowName) return true;
              return false;
            });

            if (!matchedStu) return;

            Object.keys(row).forEach((colHeader) => {
              const cleanHeader = colHeader.split('(')[0].trim().toLowerCase();
              const matchedCol = subjectColumns.find(
                (c) => c.name.trim().toLowerCase() === cleanHeader
              );
              if (matchedCol) {
                const rawVal = row[colHeader];
                if (rawVal !== '' && rawVal !== null && rawVal !== undefined && !isNaN(Number(rawVal))) {
                  if (!nextMulti[matchedStu.id]) nextMulti[matchedStu.id] = {};
                  nextMulti[matchedStu.id][matchedCol.id] = String(rawVal);
                  matchedCells++;
                }
              }
            });
          });

          setMultiMarksMap(nextMulti);
          if (matchedCells > 0) {
            toast.success(
              `Loaded ${matchedCells} subject mark entries from Excel! Review below and click "Save All Marks".`
            );
          } else {
            toast.warning('No matching subject marks found in Excel.');
          }
          return;
        }

        let matchedCount = 0;
        const newMarks: Record<string, string> = { ...marksMap };
        const newRemarks: Record<string, string> = { ...remarksMap };

        const firstRow = rows[0];
        if (firstRow.Subject && typeof firstRow.Subject === 'string') {
          setSubject(firstRow.Subject.trim());
        }
        if (firstRow.Test_Type && typeof firstRow.Test_Type === 'string') {
          setTestType(firstRow.Test_Type.trim());
        }
        if (firstRow.Test_Name && typeof firstRow.Test_Name === 'string') {
          setTestName(firstRow.Test_Name.trim());
        }
        if (firstRow.Total_Marks && !isNaN(Number(firstRow.Total_Marks))) {
          setTotalMarks(String(firstRow.Total_Marks));
        }
        if (firstRow.Exam_Date && typeof firstRow.Exam_Date === 'string') {
          setExamDate(firstRow.Exam_Date.trim());
        }

        rows.forEach((row) => {
          const rowStudentId = String(
            row.Student_ID || row.student_id || row.ID || row.id || ''
          )
            .trim()
            .toLowerCase();
          const rowRoll = String(
            row.Roll_No || row.roll_no || row['Roll No'] || row.College_No || ''
          )
            .trim()
            .toLowerCase();
          const rowName = String(
            row.Student_Name || row.student_name || row['Student Name'] || row.Name || ''
          )
            .trim()
            .toLowerCase();

          const rawObtained =
            row.Obtained_Marks ??
            row.obtained_marks ??
            row['Obtained Marks'] ??
            row.Marks ??
            row.marks ??
            '';

          if (rawObtained === '' || rawObtained === null || rawObtained === undefined) return;

          const matchedStu = activeStudents.find((s) => {
            const sId = String(s.id || '').toLowerCase();
            const sRoll = String(s.collegeNo || s.studentId || '').toLowerCase();
            const sName = String(s.fullName || '').toLowerCase();
            if (rowStudentId && sId === rowStudentId) return true;
            if (rowRoll && (sRoll === rowRoll || sId === rowRoll)) return true;
            if (rowName && sName === rowName) return true;
            return false;
          });

          if (matchedStu && !isNaN(Number(rawObtained))) {
            newMarks[matchedStu.id] = String(rawObtained);
            if (row.Remarks || row.remarks) {
              newRemarks[matchedStu.id] = String(row.Remarks || row.remarks);
            }
            matchedCount++;
          }
        });

        setMarksMap(newMarks);
        setRemarksMap(newRemarks);

        if (matchedCount > 0) {
          toast.success(
            `Loaded marks for ${matchedCount} students from Excel! Review below and click "Save All Marks".`
          );
        } else {
          toast.warning(
            'Could not match student IDs/Roll Nos from Excel. Please use the "Download Format Sheet" button first.'
          );
        }
      } catch (err: any) {
        toast.error(`Excel read error: ${err?.message || 'Invalid file format'}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Count how many students/cells have unsaved marks entered
  const enteredCount = useMemo(() => {
    if (entryMode === 'multi') {
      let count = 0;
      filteredStudents.forEach((s) => {
        const row = multiMarksMap[s.id];
        if (!row) return;
        const hasAny = Object.values(row).some((v) => v !== undefined && String(v).trim() !== '');
        if (hasAny) count++;
      });
      return count;
    }
    return filteredStudents.filter(
      (s) => marksMap[s.id] !== undefined && String(marksMap[s.id]).trim() !== ''
    ).length;
  }, [entryMode, filteredStudents, multiMarksMap, marksMap]);

  // Grand Total of all active subject columns' Total Marks
  const sumOfAllSubjectMaxMarks = useMemo(
    () => subjectColumns.reduce((acc, c) => acc + (Number(c.totalMarks) || 0), 0),
    [subjectColumns]
  );

  return (
    <div className="space-y-5">
      {/* Top Card: Hierarchical Class -> Boys/Girls -> Section -> Multi-Subject Matrix Config */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Subject-Wise & Class-Wise Result Sheet Builder
                </h3>
                {/* Mode Switcher Pill */}
                <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEntryMode('multi')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      entryMode === 'multi'
                        ? 'bg-[#064e43] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Table2 size={12} />
                    <span>Multi-Subject Sheet (All Subjects + Auto Total)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode('single')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      entryMode === 'single'
                        ? 'bg-[#064e43] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ListFilter size={12} />
                    <span>Single Subject</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Har مضمون (Subject) ke apne Custom Total Marks aur Test Date set karein &bull; Grand Total aur % khud bakhud calculate honge!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle size={14} className="text-amber-700" />
              <span>How It Works (طریقہ کار)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadDemoFormat}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              title="Download Pre-Filled Excel Format for Selected Class/Section"
            >
              <Download size={14} className="text-emerald-700" />
              <span>1. Download Class Excel</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Upload size={14} className="text-emerald-700" />
              <span>2. Upload Filled Excel</span>
            </button>

            <button
              type="button"
              onClick={handleSaveBatch}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>Save All Marks ({enteredCount})</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Guide Banner */}
        {showGuide && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-emerald-50/60 to-sky-50 border border-amber-200/80 space-y-2.5 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-900 flex items-center gap-1.5 text-sm">
                <FileSpreadsheet size={16} className="text-emerald-700" />
                <span>Multi-Subject Custom Total Marks & Date Guide (مضمون وار کسٹم ٹوٹل مارکس اور تاریخ)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Close ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black text-[10px] mb-1">
                  1. SELECT CLASS & GROUP
                </span>
                <p className="font-semibold text-slate-800">
                  Select Program (Inter / BS / DIT / UKL3), Campus, Group, and Section. All subjects for that group load automatically as columns!
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-black text-[10px] mb-1">
                  2. CUSTOM TOTAL MARKS & DATE PER SUBJECT
                </span>
                <p className="font-semibold text-slate-800">
                  In each subject column header, type its custom <strong>Total Marks</strong> (e.g., Physics = 85, Computer = 75, English = 100, Islamiat = 50) and <strong>Test Date</strong>.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                <span className="inline-block px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-black text-[10px] mb-1">
                  3. TYPE MARKS & AUTO GRAND TOTAL
                </span>
                <p className="font-semibold text-slate-800">
                  Type obtained marks and press <strong>Enter ↵</strong> to jump to the next student. Each student's <strong>Grand Obtained / Grand Total, %, and Grade</strong> are calculated live!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Row 1: Program Tabs + Boys/Girls Campus Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Program Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/70">
            {PROGRAM_CATEGORIES.map((prog) => (
              <button
                key={prog.id}
                type="button"
                onClick={() => setProgramFilter(prog.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  programFilter === prog.id
                    ? 'bg-[#064e43] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {prog.label}
              </button>
            ))}
          </div>

          {/* Boys / Girls Campus Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                genderFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Campuses
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('Male')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                genderFilter === 'Male'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              Boys Campus
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('Female')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                genderFilter === 'Female'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-purple-800 hover:bg-purple-50'
              }`}
            >
              Girls Campus
            </button>
          </div>
        </div>

        {/* Row 2: Group, Section, Test Type, Default Total Marks, Default Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-1">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              1. Group / Discipline
            </label>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">All Groups ({availableGroups.length})</option>
              {availableGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              2. Section (سیکشن)
            </label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">All Sections ({availableSections.length})</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              3. Test Frequency / Type
            </label>
            <select
              value={testType}
              onChange={(e) => {
                setTestType(e.target.value);
                setTestName(`${e.target.value} Test`);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {TEST_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              4. Exam / Test Title
            </label>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g. Monthly Test #1"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              5. Default Total Marks (کل نمبر)
            </label>
            <input
              type="number"
              min="1"
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              placeholder="50"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-black text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              6. Default Test Date
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Multi-Subject Toolbar: Add Custom Subject Column or Apply Default Total/Date to All */}
        {entryMode === 'multi' ? (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Active Subjects ({subjectColumns.length} Columns • Max Sum: {sumOfAllSubjectMaxMarks}):
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  list="scj-batch-subjects"
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="+ Add Subject (e.g. Statistics)"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 w-48"
                />
                <input
                  type="number"
                  min="1"
                  value={newSubMarks}
                  onChange={(e) => setNewSubMarks(e.target.value)}
                  placeholder="Max"
                  title="Custom Total Marks for this new subject"
                  className="px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 bg-slate-50 w-16 text-center"
                />
                <button
                  type="button"
                  onClick={handleAddSubjectColumn}
                  className="px-3 py-1.5 rounded-xl bg-[#064e43] hover:bg-[#064e43]/90 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Subject</span>
                </button>
              </div>
              <datalist id="scj-batch-subjects">
                {subjectSuggestions.map((sub) => (
                  <option key={sub} value={sub} />
                ))}
              </datalist>
            </div>

            <button
              type="button"
              onClick={handleApplyDefaultsToAllSubjects}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
              title="Apply the Default Total Marks and Default Test Date to all subject columns at once"
            >
              <CopyCheck size={13} className="text-emerald-700" />
              <span>
                Apply {totalMarks} Marks & {examDate} to All {subjectColumns.length} Subjects
              </span>
            </button>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
            <label className="text-xs font-black uppercase text-slate-500">Selected Subject:</label>
            <input
              list="scj-batch-subjects"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Physics"
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white w-64"
            />
            <datalist id="scj-batch-subjects">
              {subjectSuggestions.map((sub) => (
                <option key={sub} value={sub} />
              ))}
            </datalist>
          </div>
        )}
      </div>

      {/* Bottom Card: Ordered Scrollable Student Marks Roster */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black">
              <Users size={13} />
              <span>{filteredStudents.length} Students in Roster</span>
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Students with New Marks: <strong className="text-emerald-700">{enteredCount}</strong> /{' '}
              {filteredStudents.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quick search student or roll no..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {enteredCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMarksMap({});
                  setMultiMarksMap({});
                  setRemarksMap({});
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Clear Unsaved</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Spreadsheet Container */}
        {entryMode === 'multi' ? (
          <div className="max-h-[580px] overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/95 sticky top-0 z-20 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3 pl-4 pr-2 w-10 sticky left-0 bg-slate-100 z-30">#</th>
                  <th className="py-3 px-2.5 w-24 sticky left-10 bg-slate-100 z-30">Roll No</th>
                  <th className="py-3 px-3 min-w-[190px] sticky left-[136px] bg-slate-100 z-30 border-r border-slate-200">
                    Student & Class
                  </th>

                  {/* Dynamic Subject Columns with Custom Total Marks & Test Date inside Header */}
                  {subjectColumns.map((col) => (
                    <th
                      key={col.id}
                      className="p-2 min-w-[148px] border-r border-slate-200/80 bg-slate-50/90 align-top"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <input
                            type="text"
                            value={col.name}
                            onChange={(e) => updateSubjectColumn(col.id, 'name', e.target.value)}
                            className="w-full px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-black text-slate-900 focus:outline-none focus:border-emerald-600"
                            title="Subject Name (Click to edit)"
                          />
                          {subjectColumns.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSubjectColumn(col.id)}
                              className="p-0.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                              title={`Remove ${col.name} column`}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        {/* Custom Total Marks for this Subject */}
                        <div className="flex items-center gap-1 bg-white px-1.5 py-1 rounded-lg border border-slate-200">
                          <Hash size={10} className="text-emerald-700 shrink-0" />
                          <span className="text-[9px] font-bold text-slate-500">Max:</span>
                          <input
                            type="number"
                            min="1"
                            value={col.totalMarks}
                            onChange={(e) =>
                              updateSubjectColumn(col.id, 'totalMarks', e.target.value)
                            }
                            className="w-full text-right font-mono text-[11px] font-black text-emerald-800 focus:outline-none"
                            title={`Custom Total Marks for ${col.name}`}
                          />
                        </div>

                        {/* Custom Test Date for this Subject */}
                        <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200">
                          <Calendar size={10} className="text-slate-400 shrink-0" />
                          <input
                            type="date"
                            value={col.examDate}
                            onChange={(e) =>
                              updateSubjectColumn(col.id, 'examDate', e.target.value)
                            }
                            className="w-full text-[9.5px] font-mono font-bold text-slate-700 focus:outline-none"
                            title={`Test Date for ${col.name}`}
                          />
                        </div>
                      </div>
                    </th>
                  ))}

                  {/* Auto-Calculated Grand Total & Grade Column */}
                  <th className="py-3 px-3 min-w-[150px] text-center bg-emerald-950 text-white">
                    <div>Grand Total</div>
                    <div className="text-[9px] text-emerald-300 font-mono mt-0.5">
                      Obtained / Max (% & Grade)
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={subjectColumns.length + 4}
                      className="py-16 text-center text-slate-400 font-medium"
                    >
                      No students match the selected Program / Campus / Section filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stu, rowIdx) => {
                    const stuMulti = multiMarksMap[stu.id] || {};
                    const stuExistingMap = existingMultiRecordMap[stu.id] || {};
                    let grandObtained = 0;
                    let grandMax = 0;
                    let subjectsAttempted = 0;

                    subjectColumns.forEach((col) => {
                      const existingRec = stuExistingMap[col.name.trim().toLowerCase()];
                      const raw =
                        stuMulti[col.id] !== undefined
                          ? stuMulti[col.id]
                          : existingRec
                          ? String(existingRec.obtainedMarks)
                          : '';
                      const num = raw !== '' ? Number(raw) : NaN;
                      const colMax = Number(col.totalMarks) || 0;
                      if (!isNaN(num) && colMax > 0) {
                        grandObtained += num;
                        grandMax += colMax;
                        subjectsAttempted++;
                      }
                    });

                    const grandPct = grandMax > 0 ? (grandObtained / grandMax) * 100 : null;
                    const grandBadge = grandPct !== null ? getGradeBadge(grandPct) : null;
                    const isGirls = stu.gender === 'Female';

                    return (
                      <tr key={stu.id} className="hover:bg-slate-50/90 transition-colors">
                        <td className="py-2 pl-4 pr-2 font-mono text-[11px] text-slate-400 font-bold sticky left-0 bg-white">
                          {rowIdx + 1}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-700 sticky left-10 bg-white">
                          {stu.collegeNo || stu.studentId || stu.id}
                        </td>
                        <td className="py-2 px-3 sticky left-[136px] bg-white border-r border-slate-200">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 truncate leading-tight">
                                {stu.fullName}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {stu.group || 'Inter'} {stu.section ? `• Sec ${stu.section}` : ''}
                              </p>
                            </div>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                                isGirls
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isGirls ? 'G' : 'B'}
                            </span>
                          </div>
                        </td>

                        {/* Subject Cells */}
                        {subjectColumns.map((col, colIdx) => {
                          const existingRec = stuExistingMap[col.name.trim().toLowerCase()];
                          const rawVal =
                            stuMulti[col.id] !== undefined
                              ? stuMulti[col.id]
                              : existingRec
                              ? String(existingRec.obtainedMarks)
                              : '';
                          const colMax = Number(col.totalMarks) || 50;
                          const numVal = rawVal !== '' ? Number(rawVal) : null;
                          const isOverMax = numVal !== null && numVal > colMax;
                          const refKey = `${stu.id}__${col.id}`;

                          return (
                            <td
                              key={col.id}
                              className={`p-2 text-center border-r border-slate-100 ${
                                stuMulti[col.id] !== undefined && stuMulti[col.id] !== ''
                                  ? 'bg-emerald-50/50'
                                  : ''
                              }`}
                            >
                              <div className="inline-flex items-center gap-1">
                                <input
                                  ref={(el) => {
                                    multiInputRefs.current[refKey] = el;
                                  }}
                                  type="number"
                                  min="0"
                                  max={colMax}
                                  step="0.5"
                                  value={rawVal}
                                  onKeyDown={(e) => handleMultiKeyDown(e, rowIdx, colIdx)}
                                  onChange={(e) =>
                                    handleMultiMarkChange(stu.id, col.id, e.target.value)
                                  }
                                  placeholder={`/ ${colMax}`}
                                  className={`w-20 px-2 py-1.5 rounded-xl border text-center font-mono text-xs font-black focus:outline-none focus:ring-2 ${
                                    isOverMax
                                      ? 'border-rose-500 bg-rose-50 text-rose-900 focus:ring-rose-500/30'
                                      : 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600 focus:ring-emerald-500/20'
                                  }`}
                                />
                                {existingRec && stuMulti[col.id] === undefined && (
                                  <span
                                    className="text-emerald-600"
                                    title={`Saved: ${existingRec.obtainedMarks}/${existingRec.totalMarks} on ${existingRec.date}`}
                                  >
                                    <Check size={13} />
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Auto-Aggregated Grand Total / % / Grade Cell */}
                        <td className="py-2 px-3 text-center bg-slate-50/80">
                          {subjectsAttempted > 0 && grandPct !== null && grandBadge ? (
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-mono font-black text-xs text-slate-900">
                                {grandObtained} <span className="text-slate-400">/ {grandMax}</span>
                              </span>
                              <span
                                className={`mt-0.5 inline-flex items-center gap-1 px-2 py-0.2 rounded-full border text-[10px] font-black ${grandBadge.colorClass}`}
                              >
                                <span>{grandPct.toFixed(1)}%</span>
                                <span>({grandBadge.grade})</span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-mono text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Single-Subject Fast Table */
          <div className="max-h-[540px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/90 sticky top-0 z-10 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 pl-5 pr-2 w-12">#</th>
                  <th className="py-3 px-3 w-28">Roll / ID</th>
                  <th className="py-3 px-3">Student & Father Name</th>
                  <th className="py-3 px-3 w-44">Class / Campus / Sec</th>
                  <th className="py-3 px-3 w-44 text-center">
                    Obtained Marks (Out of {totalMarks || 50})
                  </th>
                  <th className="py-3 px-3 w-28 text-center">% & Grade</th>
                  <th className="py-3 pl-3 pr-5 w-48">Teacher Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 font-medium">
                      No students match the selected Program / Campus / Section filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stu, idx) => {
                    const existing = existingRecordMap[stu.id];
                    const rawVal =
                      marksMap[stu.id] !== undefined
                        ? marksMap[stu.id]
                        : existing
                        ? String(existing.obtainedMarks)
                        : '';
                    const maxM = Number(totalMarks) || 50;
                    const numVal = rawVal !== '' ? Number(rawVal) : null;
                    const pct =
                      numVal !== null && !isNaN(numVal) && maxM > 0 ? (numVal / maxM) * 100 : null;
                    const badge = pct !== null ? getGradeBadge(pct) : null;
                    const isGirls = stu.gender === 'Female';

                    return (
                      <tr
                        key={stu.id}
                        className={`transition-colors ${
                          marksMap[stu.id] !== undefined && marksMap[stu.id] !== ''
                            ? 'bg-emerald-50/40'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-2.5 pl-5 pr-2 font-mono text-[11px] text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                          {stu.collegeNo || stu.studentId || stu.id}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center overflow-hidden shrink-0 border border-emerald-200">
                              {stu.photo ? (
                                <img
                                  src={stu.photo}
                                  alt={stu.fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (stu.fullName || 'S').slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 leading-tight">
                                {stu.fullName}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                S/D/O {stu.fatherName || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap items-center gap-1">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                isGirls
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isGirls ? 'Girls' : 'Boys'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {stu.group || 'Inter'}
                            </span>
                            {stu.section && stu.section !== '-' && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black">
                                Sec {stu.section}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              ref={(el) => {
                                inputRefs.current[stu.id] = el;
                              }}
                              type="number"
                              min="0"
                              max={maxM}
                              step="0.5"
                              value={rawVal}
                              onKeyDown={(e) => handleKeyDown(e, idx)}
                              onChange={(e) =>
                                setMarksMap((prev) => ({
                                  ...prev,
                                  [stu.id]: e.target.value,
                                }))
                              }
                              placeholder={`/ ${maxM}`}
                              className="w-24 px-3 py-1.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-center font-mono text-xs font-black text-slate-900 bg-white"
                            />
                            {existing && marksMap[stu.id] === undefined && (
                              <span
                                className="text-emerald-600"
                                title="Already saved in database for this date"
                              >
                                <Check size={14} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {pct !== null && badge ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-black ${badge.colorClass}`}
                            >
                              <span>{pct.toFixed(0)}%</span>
                              <span>({badge.grade})</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pl-3 pr-5">
                          <input
                            type="text"
                            value={remarksMap[stu.id] ?? existing?.remarks ?? ''}
                            onChange={(e) =>
                              setRemarksMap((prev) => ({
                                ...prev,
                                [stu.id]: e.target.value,
                              }))
                            }
                            placeholder="Auto / Optional note"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 bg-slate-50/60 focus:bg-white focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Sticky Bottom Save Bar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <ArrowDown size={14} className="text-emerald-700" />
            <span>
              Tip: Press <strong>Enter</strong> or <strong>Down Arrow</strong> to jump to the next
              student in the same subject, or <strong>Left / Right Arrows</strong> to move across
              subjects.
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveBatch}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <CheckCircle2 size={16} />
            <span>Save All Entered Marks ({enteredCount} Students)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
