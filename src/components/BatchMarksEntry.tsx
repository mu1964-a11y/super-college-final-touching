import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Save, 
  Download, 
  MessageSquare, 
  Search, 
  Award, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle, 
  HelpCircle,
  TrendingUp,
  GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';
import { Student, AcademicRecord } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BatchMarksEntryProps {
  students: Student[];
  academicRecords?: AcademicRecord[];
  onSaveBatchMarks: (records: any[]) => void;
  predefinedSections?: any[];
  settings?: any;
}

const COMMON_SUBJECTS = [
  "English",
  "Urdu",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Islamic Studies",
  "Pakistan Studies",
  "Economics",
  "Accounting",
  "Principles of Commerce"
];

const TEST_TYPES = [
  "Monthly Test",
  "Weekly Test",
  "Mid-Term Exam",
  "Send-Up Exam",
  "Pre-Board Exam",
  "Final Term"
];

export default function BatchMarksEntry({
  students,
  academicRecords = [],
  onSaveBatchMarks,
  predefinedSections = [],
  settings
}: BatchMarksEntryProps) {
  // Batch Configuration State
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [subject, setSubject] = useState<string>("English");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [testType, setTestType] = useState<string>("Monthly Test");
  const [testDate, setTestDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [totalMarks, setTotalMarks] = useState<number>(50);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Map of studentId -> obtainedMarks string
  const [marksMap, setMarksMap] = useState<Record<string, string>>({});
  const [isDispatchingWhatsApp, setIsDispatchingWhatsApp] = useState<boolean>(false);

  // Input refs for Excel-like keyboard navigation (Enter / ArrowDown / ArrowUp)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const activeSubject = subject === "Custom" ? customSubject.trim() : subject;

  // Filter students based on group, section & search
  const filteredStudents = useMemo(() => {
    return students
      .filter((s: any) => s.status !== "Struck Off")
      .filter((s: Student) => {
        const matchesGroup = selectedGroup === "all" || s.group === selectedGroup;
        const matchesSection = selectedSection === "all" || (s.section || '').trim() === selectedSection.trim();
        const matchesSearch = !searchQuery || 
          (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.id || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesGroup && matchesSection && matchesSearch;
      })
      .sort((a, b) => (a.rollNo || a.id || '').localeCompare(b.rollNo || b.id || ''));
  }, [students, selectedGroup, selectedSection, searchQuery]);

  // Compute live ranks across all entered students in the filtered view
  const rankedStudents = useMemo(() => {
    // 1. Gather all students with valid entered marks
    const entered = filteredStudents
      .filter(s => marksMap[s.id] !== undefined && marksMap[s.id].trim() !== '')
      .map(s => ({
        id: s.id,
        obtained: Number(marksMap[s.id]) || 0
      }))
      .sort((a, b) => b.obtained - a.obtained);

    // 2. Assign ranks (handle ties properly)
    const rankMap = new Map<string, number>();
    let currentRank = 1;
    entered.forEach((item, idx) => {
      if (idx > 0 && item.obtained < entered[idx - 1].obtained) {
        currentRank = idx + 1;
      }
      rankMap.set(item.id, currentRank);
    });

    return filteredStudents.map(s => {
      const val = marksMap[s.id];
      const hasMark = val !== undefined && val.trim() !== '';
      const num = hasMark ? Number(val) : null;
      const rank = num !== null ? rankMap.get(s.id) ?? null : null;
      const pct = num !== null && totalMarks > 0 ? (num / totalMarks) * 100 : null;
      const grade = pct !== null 
        ? (pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F') 
        : null;

      return {
        ...s,
        obtained: val || '',
        numObtained: num,
        rank,
        pct,
        grade
      };
    });
  }, [filteredStudents, marksMap, totalMarks]);

  // Stats
  const filledCount = Object.values(marksMap).filter(v => v.trim() !== '').length;
  const topScore = useMemo(() => {
    const vals = Object.values(marksMap).map(Number).filter(n => !isNaN(n) && n > 0);
    return vals.length > 0 ? Math.max(...vals) : 0;
  }, [marksMap]);

  // Keyboard navigation handler for fast Excel entry
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (idx < filteredStudents.length - 1) {
        inputRefs.current[idx + 1]?.focus();
        inputRefs.current[idx + 1]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) {
        inputRefs.current[idx - 1]?.focus();
        inputRefs.current[idx - 1]?.select();
      }
    }
  };

  // Batch Save handler
  const handleSaveAll = () => {
    if (!activeSubject) {
      toast.error('Please specify a subject.');
      return;
    }

    const recordsToSave: any[] = [];
    rankedStudents.forEach(s => {
      if (s.obtained.trim() !== '') {
        recordsToSave.push({
          studentId: s.id,
          studentName: s.fullName,
          class: s.group,
          section: s.section || 'A',
          testName: testType,
          testType: testType,
          date: testDate,
          subject: activeSubject,
          teacherId: '',
          totalMarks: String(totalMarks),
          obtainedMarks: s.obtained.trim(),
          remarks: s.rank ? `Rank: #${s.rank} (${s.grade})` : ''
        });
      }
    });

    if (recordsToSave.length === 0) {
      toast.error('No marks entered to save. Please enter marks for at least one student.');
      return;
    }

    onSaveBatchMarks(recordsToSave);
    toast.success(`Successfully saved marks for ${recordsToSave.length} students!`);
  };

  // Batch WhatsApp Result Dispatch
  const handleBatchWhatsAppDispatch = async () => {
    const enteredList = rankedStudents.filter(s => s.numObtained !== null);
    if (enteredList.length === 0) {
      toast.error('No marks entered to send via WhatsApp.');
      return;
    }

    setIsDispatchingWhatsApp(true);
    let sentCount = 0;

    for (const student of enteredList) {
      const phone = (student.contact || student.fatherContact || student.phone || student.mobile || '').replace(/\D/g, '');
      if (!phone) continue;

      const pctStr = student.pct !== null ? student.pct.toFixed(1) + '%' : 'N/A';
      const rankBadge = student.rank === 1 ? '🥇 1st Position' : student.rank === 2 ? '🥈 2nd Position' : student.rank === 3 ? '🥉 3rd Position' : student.rank ? `Position #${student.rank}` : 'N/A';
      const status = (student.pct ?? 0) >= 50 ? 'PASSED (Kamyab) ✅' : 'NEEDS ATTENTION (Mehnat Darkar) ⚠️';

      const message = 
`🎓 *SUPERIOR GROUP OF COLLEGES JAHANIAN*
📊 *Official Examination Result Notification*
━━━━━━━━━━━━━━━━━━━━━━━━━
Mohtaram Walid/Guardian (${student.fatherName || 'Sahib'}),

Aapke bache ka imtehani result darj zail hai:

👤 *Student Name:* ${student.fullName}
🆔 *Roll Number:* ${student.id || student.rollNo || 'N/A'}
🏫 *Class & Section:* ${student.group} (Sec: ${student.section || 'A'})
📖 *Subject:* ${activeSubject}
📝 *Exam / Test:* ${testType} (${testDate})
━━━━━━━━━━━━━━━━━━━━━━━━━
📈 *Obtained Marks:* ${student.obtained} / ${totalMarks} (${pctStr})
🏆 *Grade:* ${student.grade || 'N/A'}
🎖️ *Class Rank:* ${rankBadge}
✅ *Status:* ${status}
━━━━━━━━━━━━━━━━━━━━━━━━━
College Helpdesk: 0301-4455891
Superior Group of Colleges Jahanian`;

      try {
        await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message }),
        });
        sentCount++;
      } catch {
        // Fallback: silently continue batch
      }
    }

    setIsDispatchingWhatsApp(false);
    toast.success(`WhatsApp results dispatched to ${sentCount} parents successfully!`);
  };

  // Export to Excel Award Sheet
  const handleExportExcel = () => {
    if (rankedStudents.length === 0) return toast.error('No students to export.');

    const sheetData = rankedStudents.map((s, idx) => ({
      "Sr No": idx + 1,
      "Roll No": s.id || s.rollNo || '',
      "Student Name": s.fullName,
      "Father Name": s.fatherName || '',
      "Class / Group": s.group || '',
      "Section": s.section || '',
      "Subject": activeSubject,
      "Test Type": testType,
      "Total Marks": totalMarks,
      "Obtained Marks": s.obtained || '-',
      "Percentage": s.pct !== null ? `${s.pct.toFixed(1)}%` : '-',
      "Grade": s.grade || '-',
      "Class Position": s.rank ? `#${s.rank}` : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Result Award List");
    XLSX.writeFile(wb, `Result_Award_${activeSubject}_${selectedGroup}_${testDate}.xlsx`);
    toast.success('Award list exported to Excel successfully!');
  };

  // Export to PDF Award List
  const handleExportPdf = () => {
    if (rankedStudents.length === 0) return toast.error('No students to export.');

    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(11, 77, 69); // Superior Teal
    doc.text(settings?.collegeName || 'SUPERIOR GROUP OF COLLEGES JAHANIAN', pageWidth / 2, 40, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(`Official Award List - ${activeSubject} (${testType})`, pageWidth / 2, 58, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Group: ${selectedGroup}   |   Section: ${selectedSection}   |   Date: ${testDate}   |   Total Marks: ${totalMarks}`, pageWidth / 2, 74, { align: 'center' });

    // Table
    const tableRows = rankedStudents.map((s, idx) => [
      idx + 1,
      s.id || s.rollNo || '',
      s.fullName,
      s.fatherName || '',
      s.section || 'A',
      s.obtained || '-',
      s.pct !== null ? `${s.pct.toFixed(1)}%` : '-',
      s.grade || '-',
      s.rank ? `#${s.rank}` : '-'
    ]);

    autoTable(doc, {
      head: [['#', 'Roll No', 'Student Name', 'Father Name', 'Sec', 'Marks', '%', 'Grade', 'Rank']],
      body: tableRows,
      startY: 90,
      styles: { fontSize: 8, cellPadding: 4, halign: 'center' },
      headStyles: { fillColor: [11, 77, 69], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        2: { halign: 'left' },
        3: { halign: 'left' }
      }
    });

    // Signatures
    const finalY = (doc as any).lastAutoTable?.finalY || 400;
    if (finalY < 750) {
      doc.setFontSize(9);
      doc.line(60, finalY + 50, 180, finalY + 50);
      doc.text('Subject Teacher', 120, finalY + 62, { align: 'center' });

      doc.line(pageWidth - 180, finalY + 50, pageWidth - 60, finalY + 50);
      doc.text('Principal / Director', pageWidth - 120, finalY + 62, { align: 'center' });
    }

    doc.save(`Award_List_${activeSubject}_${testDate}.pdf`);
    toast.success('Award list PDF exported successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Controls & Configuration Bar */}
      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300">
                  <Zap size={18} />
                </span>
                <CardTitle className="text-xl font-black">
                  Batch Marks Entry (Excel Mode)
                </CardTitle>
              </div>
              <CardDescription className="text-slate-300 text-xs mt-1">
                Enter class marks in rapid sequence. Auto-calculates % percentage, letter grades & class positions (1st 🥇, 2nd 🥈, 3rd 🥉).
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-10 px-3 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 font-bold gap-1.5"
              >
                <FileSpreadsheet size={15} />
                <span>Excel</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                className="h-10 px-3 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 font-bold gap-1.5"
              >
                <FileText size={15} />
                <span>Award PDF</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchWhatsAppDispatch}
                disabled={isDispatchingWhatsApp}
                className="h-10 px-3 rounded-xl border-emerald-400 bg-emerald-500 text-white hover:bg-emerald-600 font-bold gap-1.5 shadow-md"
              >
                <MessageSquare size={15} />
                <span>{isDispatchingWhatsApp ? "Dispatching..." : "WhatsApp All"}</span>
              </Button>
              <Button
                onClick={handleSaveAll}
                className="h-10 px-5 rounded-xl bg-superior-teal hover:bg-superior-teal/90 text-white font-extrabold gap-1.5 shadow-lg"
              >
                <Save size={16} />
                <span>Save All Marks ({filledCount})</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Filters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Group / Class */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Class / Group</label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="h-10 bg-slate-50 rounded-xl font-medium border-slate-200">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="all">All Groups</SelectItem>
                  {['Inter', 'DIT', 'BS', 'DPT', 'Matric'].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Section</label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="h-10 bg-slate-50 rounded-xl font-medium border-slate-200">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="all">All Sections</SelectItem>
                  {predefinedSections.map((sec: any) => (
                    <SelectItem key={sec.name} value={sec.name}>
                      {sec.name} {sec.gender && `(${sec.gender})`}
                    </SelectItem>
                  ))}
                  {predefinedSections.length === 0 && (
                    <>
                      <SelectItem value="A">Section A</SelectItem>
                      <SelectItem value="B">Section B</SelectItem>
                      <SelectItem value="C">Section C</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Subject</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="h-10 bg-slate-50 rounded-xl font-medium border-slate-200">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl max-h-[250px]">
                  {COMMON_SUBJECTS.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                  <SelectItem value="Custom">Custom Subject...</SelectItem>
                </SelectContent>
              </Select>
              {subject === "Custom" && (
                <Input
                  placeholder="Enter Subject Name"
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  className="h-9 mt-1 rounded-xl text-xs bg-slate-50 border-slate-200 font-medium"
                />
              )}
            </div>

            {/* Exam / Test Type */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Test Type</label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger className="h-10 bg-slate-50 rounded-xl font-medium border-slate-200">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  {TEST_TYPES.map(tt => (
                    <SelectItem key={tt} value={tt}>{tt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Test Date */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Exam Date</label>
              <Input
                type="date"
                value={testDate}
                onChange={e => setTestDate(e.target.value)}
                className="h-10 bg-slate-50 rounded-xl font-medium border-slate-200 text-xs"
              />
            </div>

            {/* Total Marks */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Total Marks</label>
              <Input
                type="number"
                value={totalMarks}
                onChange={e => setTotalMarks(Number(e.target.value) || 1)}
                min="1"
                className="h-10 bg-slate-50 rounded-xl font-bold border-slate-200 text-teal-800"
              />
            </div>
          </div>

          {/* Quick Metrics & Keyboard Hint Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-teal-50/70 border border-teal-100 rounded-xl text-xs">
            <div className="flex items-center gap-6">
              <span className="font-bold text-teal-900">
                Total Students: <span className="font-black text-teal-950">{filteredStudents.length}</span>
              </span>
              <span className="font-bold text-teal-900">
                Marks Entered: <span className="font-black text-teal-950">{filledCount}</span> / {filteredStudents.length}
              </span>
              <span className="font-bold text-teal-900">
                Highest Score: <span className="font-black text-teal-950">{topScore} / {totalMarks}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-teal-800 font-medium">
              <span className="px-1.5 py-0.5 rounded bg-white font-mono border border-teal-200">Enter</span>
              <span>or</span>
              <span className="px-1.5 py-0.5 rounded bg-white font-mono border border-teal-200">↓</span>
              <span>to move to next student instantly</span>
            </div>
          </div>

          {/* Search student inside batch */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search student by name or roll no..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl text-xs bg-slate-50 border-slate-200"
            />
          </div>

          {/* Rapid Excel-like Marks Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="w-12 text-center font-bold text-slate-600">#</TableHead>
                  <TableHead className="font-bold text-slate-600 w-28">Roll No</TableHead>
                  <TableHead className="font-bold text-slate-600">Student Name</TableHead>
                  <TableHead className="font-bold text-slate-600">Father Name</TableHead>
                  <TableHead className="font-bold text-slate-600 text-center">Sec</TableHead>
                  <TableHead className="font-bold text-slate-700 w-36 text-center bg-teal-50/50">
                    Obtained Marks (/{totalMarks})
                  </TableHead>
                  <TableHead className="font-bold text-slate-600 text-center w-20">Score %</TableHead>
                  <TableHead className="font-bold text-slate-600 text-center w-20">Grade</TableHead>
                  <TableHead className="font-bold text-slate-600 text-center w-28">Class Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-slate-400 font-medium">
                      No active students found matching selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rankedStudents.map((s, idx) => (
                    <TableRow 
                      key={s.id} 
                      className={`hover:bg-teal-50/30 transition-colors ${
                        s.rank === 1 ? 'bg-amber-50/40' : s.rank === 2 ? 'bg-slate-50/80' : s.rank === 3 ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      <TableCell className="text-center font-mono text-xs text-slate-400">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-slate-700">
                        {s.id || s.rollNo}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 text-sm">
                        {s.fullName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium">
                        {s.fatherName || '-'}
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold text-slate-600">
                        {s.section || '-'}
                      </TableCell>
                      
                      {/* Excel-style Numeric Input Cell */}
                      <TableCell className="text-center p-2 bg-teal-50/20">
                        <Input
                          ref={el => { inputRefs.current[idx] = el; }}
                          type="number"
                          min="0"
                          max={totalMarks}
                          value={s.obtained}
                          onChange={e => {
                            const val = e.target.value;
                            setMarksMap(prev => ({ ...prev, [s.id]: val }));
                          }}
                          onKeyDown={e => handleKeyDown(e, idx)}
                          placeholder="-"
                          className="h-9 w-28 mx-auto text-center font-bold text-sm bg-white border-teal-200 focus-visible:ring-teal-500 rounded-lg shadow-sm"
                        />
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs font-bold text-slate-700">
                        {s.pct !== null ? `${s.pct.toFixed(1)}%` : '-'}
                      </TableCell>

                      <TableCell className="text-center">
                        {s.grade ? (
                          <Badge 
                            variant="secondary"
                            className={`font-black text-[10px] px-2 ${
                              s.grade === 'A+' ? 'bg-emerald-100 text-emerald-800' :
                              s.grade === 'A' ? 'bg-teal-100 text-teal-800' :
                              s.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                              s.grade === 'C' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {s.grade}
                          </Badge>
                        ) : '-'}
                      </TableCell>

                      {/* Live Calculated Class Position */}
                      <TableCell className="text-center">
                        {s.rank === 1 ? (
                          <Badge className="bg-amber-500 text-white font-black text-[10px] gap-1 shadow-sm">
                            🥇 1st Rank
                          </Badge>
                        ) : s.rank === 2 ? (
                          <Badge className="bg-slate-400 text-white font-black text-[10px] gap-1 shadow-sm">
                            🥈 2nd Rank
                          </Badge>
                        ) : s.rank === 3 ? (
                          <Badge className="bg-amber-700 text-white font-black text-[10px] gap-1 shadow-sm">
                            🥉 3rd Rank
                          </Badge>
                        ) : s.rank ? (
                          <span className="font-mono text-xs font-bold text-slate-600">
                            #{s.rank}
                          </span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
