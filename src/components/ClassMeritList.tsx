import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Award, 
  Medal, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  Star,
  Users,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';
import { Student, AcademicRecord } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClassMeritListProps {
  students: Student[];
  academicRecords: AcademicRecord[];
  predefinedSections?: any[];
  settings?: any;
}

export default function ClassMeritList({
  students,
  academicRecords = [],
  predefinedSections = [],
  settings
}: ClassMeritListProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Get all unique subjects from academic records
  const subjectsList = useMemo(() => {
    return Array.from(new Set(academicRecords.map(r => r.subject).filter(Boolean))).sort();
  }, [academicRecords]);

  // Aggregate results per student based on active filters
  const meritRankings = useMemo(() => {
    // 1. Filter academic records matching month & subject
    const matchingRecords = academicRecords.filter(r => {
      const matchesMonth = !selectedMonth || (r.date && r.date.startsWith(selectedMonth));
      const matchesSubject = selectedSubject === "all" || r.subject === selectedSubject;
      return matchesMonth && matchesSubject;
    });

    // 2. Map student stats
    const studentMap = new Map<string, {
      student: Student;
      obtained: number;
      total: number;
      testsCount: number;
    }>();

    // Map active students
    students
      .filter((s: any) => s.status !== "Struck Off")
      .filter((s: Student) => {
        const matchesGroup = selectedGroup === "all" || s.group === selectedGroup;
        const matchesSection = selectedSection === "all" || (s.section || '').trim() === selectedSection.trim();
        return matchesGroup && matchesSection;
      })
      .forEach(s => {
        studentMap.set(s.id, {
          student: s,
          obtained: 0,
          total: 0,
          testsCount: 0
        });
      });

    // Add record marks
    matchingRecords.forEach(r => {
      const entry = studentMap.get(r.studentId);
      if (entry) {
        entry.obtained += Number(r.obtainedMarks) || 0;
        entry.total += Number(r.totalMarks) || 0;
        entry.testsCount += 1;
      }
    });

    // 3. Filter only students who have taken at least 1 test in this period
    const scoredList = Array.from(studentMap.values())
      .filter(item => item.testsCount > 0 && item.total > 0)
      .map(item => {
        const pct = (item.obtained / item.total) * 100;
        const grade = pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F';
        return {
          ...item.student,
          obtained: item.obtained,
          total: item.total,
          testsCount: item.testsCount,
          pct,
          grade
        };
      })
      .sort((a, b) => b.pct - a.pct);

    // 4. Assign class positions
    let currentRank = 1;
    return scoredList.map((item, idx) => {
      if (idx > 0 && item.pct < scoredList[idx - 1].pct) {
        currentRank = idx + 1;
      }
      return {
        ...item,
        rank: currentRank
      };
    });
  }, [students, academicRecords, selectedGroup, selectedSection, selectedSubject, selectedMonth]);

  // Filtered list by student name or roll no search
  const filteredRankings = useMemo(() => {
    if (!searchQuery) return meritRankings;
    return meritRankings.filter(s =>
      (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.id || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [meritRankings, searchQuery]);

  // Top 3 positions for the Podium
  const firstRank = meritRankings.find(s => s.rank === 1);
  const secondRank = meritRankings.find(s => s.rank === 2);
  const thirdRank = meritRankings.find(s => s.rank === 3);

  // Export to Excel
  const handleExportExcel = () => {
    if (meritRankings.length === 0) return toast.error('No merit rankings to export.');

    const sheetData = meritRankings.map((s) => ({
      "Position": `#${s.rank}`,
      "Roll No": s.id || s.rollNo || '',
      "Student Name": s.fullName,
      "Father Name": s.fatherName || '',
      "Class / Group": s.group || '',
      "Section": s.section || '',
      "Tests Taken": s.testsCount,
      "Marks Obtained": s.obtained,
      "Total Marks": s.total,
      "Percentage": `${s.pct.toFixed(1)}%`,
      "Grade": s.grade
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Class Merit List");
    XLSX.writeFile(wb, `Class_Merit_List_${selectedGroup}_${selectedMonth}.xlsx`);
    toast.success('Merit list exported to Excel successfully!');
  };

  // Export to PDF
  const handleExportPdf = () => {
    if (meritRankings.length === 0) return toast.error('No merit rankings to export.');

    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(11, 77, 69);
    doc.text(settings?.collegeName || 'SUPERIOR GROUP OF COLLEGES JAHANIAN', pageWidth / 2, 40, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(`Official Class Position & Merit List - ${selectedMonth}`, pageWidth / 2, 58, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Group: ${selectedGroup}   |   Section: ${selectedSection}   |   Subject: ${selectedSubject}`, pageWidth / 2, 74, { align: 'center' });

    const rows = meritRankings.map(s => [
      `#${s.rank}`,
      s.id || s.rollNo || '',
      s.fullName,
      s.fatherName || '',
      s.section || 'A',
      `${s.obtained} / ${s.total}`,
      `${s.pct.toFixed(1)}%`,
      s.grade
    ]);

    autoTable(doc, {
      head: [['Pos', 'Roll No', 'Student Name', 'Father Name', 'Sec', 'Score', 'Percentage', 'Grade']],
      body: rows,
      startY: 90,
      styles: { fontSize: 8, cellPadding: 4, halign: 'center' },
      headStyles: { fillColor: [11, 77, 69], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        2: { halign: 'left' },
        3: { halign: 'left' }
      }
    });

    doc.save(`Merit_List_${selectedGroup}_${selectedMonth}.pdf`);
    toast.success('Merit list PDF exported successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Card */}
      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-700 via-teal-900 to-slate-900 text-white p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300">
                  <Trophy size={18} />
                </span>
                <CardTitle className="text-xl font-black">
                  Class Positions & Merit List
                </CardTitle>
              </div>
              <CardDescription className="text-slate-300 text-xs mt-1">
                Official ranking of students based on academic examination performances.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-10 px-3 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 font-bold gap-1.5"
              >
                <FileSpreadsheet size={15} />
                <span>Export Excel</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                className="h-10 px-3 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 font-bold gap-1.5"
              >
                <FileText size={15} />
                <span>Export PDF</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Filters Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-10 bg-slate-50 rounded-xl font-medium border-slate-200">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl max-h-[250px]">
                  <SelectItem value="all">All Subjects (Combined)</SelectItem>
                  {subjectsList.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Exam Month</label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="h-10 bg-slate-50 rounded-xl font-medium border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Top 3 Positions Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* 2nd Position Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200/80 border border-slate-300 text-center flex flex-col justify-between order-2 md:order-1 shadow-sm">
              <div className="flex justify-center mb-2">
                <span className="w-12 h-12 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-black text-xl shadow-inner">
                  🥈
                </span>
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 block">
                  2nd Position
                </span>
                <p className="font-extrabold text-slate-900 text-base mt-1 truncate">
                  {secondRank ? secondRank.fullName : 'Vacant'}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {secondRank ? `${secondRank.id} • Sec ${secondRank.section || 'A'}` : '-'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-300 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Score:</span>
                <span className="font-black text-slate-800 text-sm">
                  {secondRank ? `${secondRank.pct.toFixed(1)}% (${secondRank.grade})` : '-'}
                </span>
              </div>
            </div>

            {/* 1st Position Card (Champion) */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-100 via-amber-50 to-amber-200/70 border-2 border-amber-400 text-center flex flex-col justify-between order-1 md:order-2 shadow-lg -translate-y-1">
              <div className="flex justify-center mb-2">
                <span className="w-14 h-14 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-2xl shadow-md border-2 border-white">
                  🥇
                </span>
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-800 block">
                  1st Position Champion
                </span>
                <p className="font-black text-slate-900 text-lg mt-1 truncate">
                  {firstRank ? firstRank.fullName : 'Vacant'}
                </p>
                <p className="text-xs text-amber-900 font-mono font-bold">
                  {firstRank ? `${firstRank.id} • Sec ${firstRank.section || 'A'}` : '-'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-300 flex items-center justify-between text-xs">
                <span className="text-amber-900 font-bold">Final Score:</span>
                <span className="font-black text-amber-900 text-base">
                  {firstRank ? `${firstRank.pct.toFixed(1)}% (${firstRank.grade})` : '-'}
                </span>
              </div>
            </div>

            {/* 3rd Position Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-orange-50 to-orange-100/80 border border-orange-200 text-center flex flex-col justify-between order-3 md:order-3 shadow-sm">
              <div className="flex justify-center mb-2">
                <span className="w-12 h-12 rounded-full bg-amber-700/20 text-amber-800 flex items-center justify-center font-black text-xl shadow-inner">
                  🥉
                </span>
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-800 block">
                  3rd Position
                </span>
                <p className="font-extrabold text-slate-900 text-base mt-1 truncate">
                  {thirdRank ? thirdRank.fullName : 'Vacant'}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {thirdRank ? `${thirdRank.id} • Sec ${thirdRank.section || 'A'}` : '-'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-orange-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Score:</span>
                <span className="font-black text-slate-800 text-sm">
                  {thirdRank ? `${thirdRank.pct.toFixed(1)}% (${thirdRank.grade})` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Search within merit list */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search student or roll no..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl text-xs bg-slate-50 border-slate-200"
            />
          </div>

          {/* Full Merit Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="w-20 text-center font-bold text-slate-700">Rank</TableHead>
                  <TableHead className="w-28 font-bold text-slate-700">Roll No</TableHead>
                  <TableHead className="font-bold text-slate-700">Student Name</TableHead>
                  <TableHead className="font-bold text-slate-700">Father Name</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Class / Sec</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Tests</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Score</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Percentage</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRankings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-slate-400 font-medium">
                      No academic exam records found for this period. Try adjusting your month or filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRankings.map(s => (
                    <TableRow key={s.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="text-center">
                        {s.rank === 1 ? (
                          <Badge className="bg-amber-500 text-white font-black text-xs gap-1">🥇 1st</Badge>
                        ) : s.rank === 2 ? (
                          <Badge className="bg-slate-400 text-white font-black text-xs gap-1">🥈 2nd</Badge>
                        ) : s.rank === 3 ? (
                          <Badge className="bg-amber-700 text-white font-black text-xs gap-1">🥉 3rd</Badge>
                        ) : (
                          <span className="font-mono text-xs font-bold text-slate-600">#{s.rank}</span>
                        )}
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
                      <TableCell className="text-center text-xs font-medium text-slate-600">
                        {s.group} ({s.section || 'A'})
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-slate-600">
                        {s.testsCount}
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs text-slate-800">
                        {s.obtained} / {s.total}
                      </TableCell>
                      <TableCell className="text-center font-black text-sm text-teal-800">
                        {s.pct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
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
