import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  BookOpen,
  Download,
  Upload,
  Search,
  Sparkles,
  FileSpreadsheet,
  HelpCircle,
  Users,
  ArrowDown,
  Check,
  AlertCircle,
  Trash2,
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
  'Programming Fundamentals',
  'Database Systems',
  'Operating Systems',
  'Networking',
];

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

  // Step 3: Fast Marks Entry State (studentId -> obtainedMarks string)
  const [marksMap, setMarksMap] = useState<Record<string, string>>({});
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Check if a student already has saved marks for this Subject + TestType + Date
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

  // Handle Enter / Down Arrow / Up Arrow for ultra-fast spreadsheet entry
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

  // Save All Entered Marks
  const handleSaveBatch = () => {
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

  // Download Pre-Filled Class Format Excel Sheet
  const handleDownloadDemoFormat = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students in current filter to generate format sheet.');
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
    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 14 },
      { wch: 24 },
      { wch: 22 },
      { wch: 14 },
      { wch: 18 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
      { wch: 20 },
      { wch: 13 },
      { wch: 12 },
      { wch: 16 },
      { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks_Format_Sheet');

    const safeClass = `${programFilter}_${genderFilter === 'all' ? 'All' : genderFilter}_${
      sectionFilter === 'all' ? 'AllSec' : sectionFilter
    }_${subject}`.replace(/[^a-zA-Z0-9_-]/g, '_');

    XLSX.writeFile(wb, `SCJ_Marks_Format_${safeClass}_${examDate}.xlsx`);
    toast.success('Class Marks Format Excel Sheet downloaded! Fill "Obtained_Marks" and upload.');
  };

  // Upload Filled Excel Sheet & Auto-Populate Grid
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

        let matchedCount = 0;
        const newMarks: Record<string, string> = { ...marksMap };
        const newRemarks: Record<string, string> = { ...remarksMap };

        // Detect metadata from first row if available
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

  const enteredCount = useMemo(
    () =>
      filteredStudents.filter(
        (s) => marksMap[s.id] !== undefined && String(marksMap[s.id]).trim() !== ''
      ).length,
    [filteredStudents, marksMap]
  );

  return (
    <div className="space-y-5">
      {/* Top Card: Hierarchical Class -> Boys/Girls -> Section -> Subject Selector */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Fast Class-Wise & Section-Wise Marks Sheet
              </h3>
              <p className="text-xs text-slate-500">
                Select Program &rarr; Boys/Girls Campus &rarr; Section &rarr; Enter marks with{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[10px] font-mono font-bold">
                  Enter ↵
                </kbd>{' '}
                or upload Excel sheet
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
              <span>How Excel Upload Works (طریقہ کار)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadDemoFormat}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              title="Download Pre-Filled Excel Format for Selected Class/Section"
            >
              <Download size={14} className="text-emerald-700" />
              <span>1. Download Class Format Excel</span>
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

        {/* Step-by-Step Excel Guide Banner */}
        {showGuide && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-emerald-50/60 to-sky-50 border border-amber-200/80 space-y-2.5 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-900 flex items-center gap-1.5 text-sm">
                <FileSpreadsheet size={16} className="text-emerald-700" />
                <span>Fast Excel Sheet Marks Upload Guide (آسان ایکسل مارکس اپ لوڈ طریقہ)</span>
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
                  STEP 1: SELECT & DOWNLOAD
                </span>
                <p className="font-semibold text-slate-800">
                  Select Program (Inter / BS / DIT / UKL3), Boys or Girls Campus, and Section below.
                  Then click <strong>"1. Download Class Format Excel"</strong>.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-black text-[10px] mb-1">
                  STEP 2: FILL MARKS IN EXCEL
                </span>
                <p className="font-semibold text-slate-800">
                  Open the downloaded Excel file. Every student's Roll No & Name is already written!
                  Simply type their marks in the <strong>Obtained_Marks</strong> column and save.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                <span className="inline-block px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-black text-[10px] mb-1">
                  STEP 3: UPLOAD & SAVE
                </span>
                <p className="font-semibold text-slate-800">
                  Click <strong>"2. Upload Filled Excel"</strong> to load all marks into the table
                  instantly, then click <strong>"Save All Marks"</strong>. Done in 30 seconds!
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

        {/* Row 2: Specific Group, Section Dropdown, Test Type, Subject, Date, Total Marks */}
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
              4. Subject (مضمون)
            </label>
            <input
              list="scj-batch-subjects"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Physics"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <datalist id="scj-batch-subjects">
              {subjectSuggestions.map((sub) => (
                <option key={sub} value={sub} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              5. Total Marks (کل نمبر)
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
              6. Exam Date
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>
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
              Entered: <strong className="text-emerald-700">{enteredCount}</strong> /{' '}
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

        {/* Sticky Bottom Save Bar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <ArrowDown size={14} className="text-emerald-700" />
            <span>
              Tip: Press <strong>Enter</strong> or <strong>Down Arrow</strong> after typing marks to
              jump directly to the next student.
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
