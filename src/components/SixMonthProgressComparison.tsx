import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  FileText,
  Download,
  MessageSquare,
  Award,
  BarChart3,
  Users,
  Calendar,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatWhatsAppPhone } from '../lib/whatsappAutomation';
import { toast } from 'sonner';

interface SixMonthProgressComparisonProps {
  students: any[];
  academicRecords: any[];
  predefinedSections?: any[];
  settings?: any;
}

const PROGRAM_TABS = [
  { id: 'all', label: 'All Programs' },
  { id: 'Inter', label: 'Intermediate' },
  { id: 'BS', label: 'BS Programs' },
  { id: 'DIT', label: 'DIT' },
  { id: 'UKL3', label: 'UKL3' },
];

function matchesProgram(student: any, category: string): boolean {
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

function getLastSixMonths(anchorMonthStr?: string): { key: string; label: string; shortLabel: string }[] {
  const base = anchorMonthStr ? new Date(`${anchorMonthStr}-01T00:00:00`) : new Date();
  const result: { key: string; label: string; shortLabel: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const shortLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    result.push({ key, label, shortLabel });
  }
  return result;
}

function computeGrade(pct: number): string {
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

export default function SixMonthProgressComparison({
  students = [],
  academicRecords = [],
  predefinedSections = [],
  settings,
}: SixMonthProgressComparisonProps) {
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [testTypeFilter, setTestTypeFilter] = useState<string>('all');
  const [anchorMonth, setAnchorMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [sendingWa, setSendingWa] = useState<boolean>(false);

  const sixMonths = useMemo(() => getLastSixMonths(anchorMonth), [anchorMonth]);

  const activeStudents = useMemo(
    () => (students || []).filter((s) => s.status !== 'Struck Off'),
    [students]
  );

  const availableSections = useMemo(() => {
    const set = new Set<string>();
    activeStudents.forEach((s) => {
      if (!matchesProgram(s, programFilter)) return;
      if (genderFilter !== 'all' && (s.gender || 'Male') !== genderFilter) return;
      if (s.section && s.section !== '-') set.add(String(s.section).trim());
    });
    (predefinedSections || []).forEach((ps: any) => {
      const name = typeof ps === 'string' ? ps : ps?.name;
      if (name) set.add(String(name).trim());
    });
    return Array.from(set).sort();
  }, [activeStudents, programFilter, genderFilter, predefinedSections]);

  // Filter academic records by testType if selected
  const filteredAcademicRecords = useMemo(() => {
    if (testTypeFilter === 'all') return academicRecords || [];
    return (academicRecords || []).filter(
      (r: any) => (r.testType || '').toLowerCase() === testTypeFilter.toLowerCase()
    );
  }, [academicRecords, testTypeFilter]);

  // Build 6-month analytics row for every filtered student
  const studentProgressRows = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    const matchingStudents = activeStudents.filter((s) => {
      if (!matchesProgram(s, programFilter)) return false;
      if (genderFilter !== 'all' && (s.gender || 'Male') !== genderFilter) return false;
      if (
        sectionFilter !== 'all' &&
        (s.section || '').toLowerCase() !== sectionFilter.toLowerCase()
      ) {
        return false;
      }
      if (q) {
        const name = (s.fullName || '').toLowerCase();
        const roll = String(s.collegeNo || s.studentId || s.id || '').toLowerCase();
        return name.includes(q) || roll.includes(q);
      }
      return true;
    });

    return matchingStudents.map((stu) => {
      const stuRecords = filteredAcademicRecords.filter(
        (r: any) =>
          r.studentId === stu.id ||
          r.studentId === stu.collegeNo ||
          r.studentId === stu.studentId
      );

      const monthlyMap: Record<
        string,
        { obtained: number; total: number; pct: number | null; count: number }
      > = {};

      sixMonths.forEach((m) => {
        const recs = stuRecords.filter((r: any) => String(r.date || '').startsWith(m.key));
        let obt = 0;
        let tot = 0;
        recs.forEach((r: any) => {
          obt += Number(r.obtainedMarks) || 0;
          tot += Number(r.totalMarks) || 0;
        });
        monthlyMap[m.key] = {
          obtained: obt,
          total: tot,
          pct: tot > 0 ? (obt / tot) * 100 : null,
          count: recs.length,
        };
      });

      // Compute 6-month overall average and trend delta (latest active month vs previous active month)
      const activeMonthsWithMarks = sixMonths
        .map((m) => monthlyMap[m.key])
        .filter((m) => m.pct !== null);

      const totalObtAll = activeMonthsWithMarks.reduce((a, b) => a + b.obtained, 0);
      const totalMaxAll = activeMonthsWithMarks.reduce((a, b) => a + b.total, 0);
      const sixMonthOverallPct = totalMaxAll > 0 ? (totalObtAll / totalMaxAll) * 100 : null;

      let delta: number | null = null;
      if (activeMonthsWithMarks.length >= 2) {
        const latest = activeMonthsWithMarks[activeMonthsWithMarks.length - 1].pct!;
        const prev = activeMonthsWithMarks[activeMonthsWithMarks.length - 2].pct!;
        delta = latest - prev;
      }

      return {
        student: stu,
        records: stuRecords,
        monthlyMap,
        sixMonthOverallPct,
        delta,
        totalTestsCount: stuRecords.length,
      };
    });
  }, [
    activeStudents,
    programFilter,
    genderFilter,
    sectionFilter,
    searchQuery,
    filteredAcademicRecords,
    sixMonths,
  ]);

  const selectedRow = useMemo(
    () => studentProgressRows.find((r) => r.student.id === selectedStudentId) || null,
    [studentProgressRows, selectedStudentId]
  );

  // Subject-wise 6-month matrix for selected student
  const selectedSubjectMatrix = useMemo(() => {
    if (!selectedRow) return [];
    const subjectsSet = new Set<string>();
    if (Array.isArray(selectedRow.student.subjects)) {
      selectedRow.student.subjects.forEach((s: string) => s && subjectsSet.add(s));
    }
    selectedRow.records.forEach((r: any) => {
      if (r.subject) subjectsSet.add(r.subject);
    });

    return Array.from(subjectsSet).map((subj) => {
      const monthPcts: Record<string, { pct: number | null; obt: number; tot: number }> = {};
      let sumObt = 0;
      let sumTot = 0;

      sixMonths.forEach((m) => {
        const recs = selectedRow.records.filter(
          (r: any) =>
            (r.subject || '').toLowerCase() === subj.toLowerCase() &&
            String(r.date || '').startsWith(m.key)
        );
        let o = 0;
        let t = 0;
        recs.forEach((r: any) => {
          o += Number(r.obtainedMarks) || 0;
          t += Number(r.totalMarks) || 0;
        });
        sumObt += o;
        sumTot += t;
        monthPcts[m.key] = {
          obt: o,
          tot: t,
          pct: t > 0 ? (o / t) * 100 : null,
        };
      });

      const active = sixMonths.map((m) => monthPcts[m.key].pct).filter((p) => p !== null) as number[];
      const subjectDelta =
        active.length >= 2 ? active[active.length - 1] - active[active.length - 2] : null;
      const avgPct = sumTot > 0 ? (sumObt / sumTot) * 100 : null;

      return {
        subject: subj,
        monthPcts,
        sumObt,
        sumTot,
        avgPct,
        subjectDelta,
      };
    });
  }, [selectedRow, sixMonths]);

  // Generate Official 6-Month Parent Progress & Comparison PDF
  const handleDownloadSixMonthPDF = (row = selectedRow) => {
    if (!row) return;
    const stu = row.student;
    const doc = new jsPDF();
    const collegeName = settings?.collegeName || 'SUPERIOR COLLEGE JAHANIAN';

    // Header Banner
    doc.setFillColor(6, 78, 67);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(collegeName.toUpperCase(), 105, 14, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(247, 224, 150);
    doc.text(
      `OFFICIAL 6-MONTH ACADEMIC PROGRESS & COMPARISON REPORT (${sixMonths[0].shortLabel} - ${
        sixMonths[5].shortLabel
      })`,
      105,
      23,
      { align: 'center' }
    );

    // Student Profile Box
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Student Name: ${stu.fullName || 'N/A'}`, 14, 44);
    doc.text(`Father Name: ${stu.fatherName || 'N/A'}`, 14, 51);
    doc.text(`Roll / ID No: ${stu.collegeNo || stu.studentId || stu.id}`, 14, 58);

    doc.text(`Program / Class: ${stu.group || 'Intermediate'}`, 120, 44);
    doc.text(
      `Campus & Section: ${stu.gender === 'Female' ? 'Girls' : 'Boys'} • Sec ${stu.section || 'A'}`,
      120,
      51
    );
    const overallText =
      row.sixMonthOverallPct !== null
        ? `${row.sixMonthOverallPct.toFixed(1)}% (Grade ${computeGrade(row.sixMonthOverallPct)})`
        : 'N/A';
    doc.text(`6-Month Overall Avg: ${overallText}`, 120, 58);

    // Table 1: Month-by-Month Trajectory
    const monthHeaders = ['Metric', ...sixMonths.map((m) => m.shortLabel), '6-Mo Avg', 'Trend'];
    const trendStr =
      row.delta !== null
        ? `${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(1)}% (${
            row.delta > 1 ? 'Improving' : row.delta < -1 ? 'Needs Focus' : 'Stable'
          })`
        : 'Baseline';

    const overallRow = [
      'Overall %',
      ...sixMonths.map((m) => {
        const cell = row.monthlyMap[m.key];
        return cell.pct !== null ? `${cell.pct.toFixed(1)}%` : '-';
      }),
      row.sixMonthOverallPct !== null ? `${row.sixMonthOverallPct.toFixed(1)}%` : '-',
      trendStr,
    ];

    autoTable(doc, {
      startY: 65,
      head: [monthHeaders],
      body: [overallRow],
      theme: 'grid',
      headStyles: { fillColor: [6, 78, 67], fontSize: 8.5, halign: 'center' },
      bodyStyles: { fontSize: 8.5, halign: 'center', fontStyle: 'bold' },
    });

    // Table 2: Subject-by-Subject 6-Month Comparison Matrix
    const subjSet = new Set<string>();
    if (Array.isArray(stu.subjects)) stu.subjects.forEach((s: string) => s && subjSet.add(s));
    row.records.forEach((r: any) => r.subject && subjSet.add(r.subject));

    const subjRows = Array.from(subjSet).map((subj) => {
      let sObt = 0;
      let sTot = 0;
      const cells = sixMonths.map((m) => {
        const recs = row.records.filter(
          (r: any) =>
            (r.subject || '').toLowerCase() === subj.toLowerCase() &&
            String(r.date || '').startsWith(m.key)
        );
        let o = 0;
        let t = 0;
        recs.forEach((r: any) => {
          o += Number(r.obtainedMarks) || 0;
          t += Number(r.totalMarks) || 0;
        });
        sObt += o;
        sTot += t;
        return t > 0 ? `${o}/${t} (${((o / t) * 100).toFixed(0)}%)` : '-';
      });
      const avg = sTot > 0 ? `${((sObt / sTot) * 100).toFixed(1)}%` : '-';
      const grade = sTot > 0 ? computeGrade((sObt / sTot) * 100) : '-';
      return [subj, ...cells, avg, grade];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Subject', ...sixMonths.map((m) => m.shortLabel), '6-Mo %', 'Grade']],
      body:
        subjRows.length > 0
          ? subjRows
          : [['No subject records recorded in this 6-month window', '-', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], fontSize: 8, halign: 'center' },
      bodyStyles: { fontSize: 8, halign: 'center' },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 25;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text('Class Incharge Signature: ______________________', 14, Math.min(finalY, 275));
    doc.text('Principal Signature: ______________________', 120, Math.min(finalY, 275));

    doc.save(
      `SCJ_6Month_Progress_${(stu.fullName || 'Student').replace(/\s+/g, '_')}_${anchorMonth}.pdf`
    );
    toast.success(`Downloaded 6-Month Progress Report PDF for ${stu.fullName}!`);
  };

  // Send 6-Month Progress Summary to Parent via WhatsApp
  const handleSendWhatsAppProgress = async (row = selectedRow) => {
    if (!row) return;
    const stu = row.student;
    const rawPhone = stu.fatherContact || stu.whatsappNumber || stu.contact || '';
    const cleanPhone = formatWhatsAppPhone(rawPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Valid Parent WhatsApp number not found on this student profile.');
      return;
    }

    setSendingWa(true);
    try {
      const collegeName = settings?.collegeName || 'Superior College Jahanian';
      const monthLines = sixMonths
        .map((m) => {
          const cell = row.monthlyMap[m.key];
          return cell.pct !== null
            ? `• *${m.shortLabel}:* ${cell.obtained}/${cell.total} (*${cell.pct.toFixed(1)}%*)`
            : null;
        })
        .filter(Boolean)
        .join('\n');

      const trendLine =
        row.delta !== null
          ? row.delta >= 0
            ? `📈 *Monthly Comparison:* Improved by *+${row.delta.toFixed(1)}%* compared to previous month!`
            : `📉 *Monthly Comparison:* Decreased by *${row.delta.toFixed(1)}%* compared to previous month (Needs extra focus).`
          : '';

      const overallStr =
        row.sixMonthOverallPct !== null
          ? `*${row.sixMonthOverallPct.toFixed(1)}% (Grade ${computeGrade(row.sixMonthOverallPct)})*`
          : 'N/A';

      const message = `🏛️ *${collegeName.toUpperCase()}*\n📊 *6-MONTH STUDENT PROGRESS & COMPARISON REPORT*\n━━━━━━━━━━━━━━━━━━━━━━━━━\nDear Parents of *${
        stu.fullName
      }* (Roll No: *${stu.collegeNo || stu.id}*),\nClass: *${stu.group || 'Inter'} (Sec ${
        stu.section || 'A'
      })*\n\n*Month-by-Month Performance:*\n${
        monthLines || '• Assessment records updating'
      }\n\n🏆 *6-Month Overall Average:* ${overallStr}\n${trendLine}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n_Examination & Academics Cell — ${collegeName}_`;

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        toast.success(`6-Month Progress Report sent to Parent (+${cleanPhone}) on WhatsApp!`);
      } else {
        toast.error(data?.error || 'Could not dispatch WhatsApp message.');
      }
    } finally {
      setSendingWa(false);
    }
  };

  // Export Class 6-Month Comparison Sheet to Excel
  const handleExportClassComparisonExcel = () => {
    if (studentProgressRows.length === 0) {
      toast.error('No students in current filter to export.');
      return;
    }
    const rows = studentProgressRows.map((r, i) => {
      const obj: any = {
        S_No: i + 1,
        Roll_No: r.student.collegeNo || r.student.studentId || r.student.id,
        Student_Name: r.student.fullName,
        Father_Name: r.student.fatherName || '',
        Campus: r.student.gender === 'Female' ? 'Girls' : 'Boys',
        Program: r.student.group || '',
        Section: r.student.section || '',
      };
      sixMonths.forEach((m) => {
        const c = r.monthlyMap[m.key];
        obj[m.shortLabel] = c.pct !== null ? `${c.pct.toFixed(1)}%` : '-';
      });
      obj['6_Month_Avg'] =
        r.sixMonthOverallPct !== null ? `${r.sixMonthOverallPct.toFixed(1)}%` : '-';
      obj['Monthly_Change'] =
        r.delta !== null ? `${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(1)}%` : '-';
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '6_Month_Comparison');
    XLSX.writeFile(wb, `SCJ_6Month_Class_Comparison_${anchorMonth}.xlsx`);
    toast.success('Exported 6-Month Class Comparison Excel sheet!');
  };

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                6-Month Student Progress & Monthly Comparison Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Track month-by-month improvement, compare previous vs current month, and send Parent
                Progress Reports
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportClassComparisonExcel}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} className="text-emerald-700" />
              <span>Export Class Comparison Excel</span>
            </button>
          </div>
        </div>

        {/* Program + Boys/Girls + Section + Test Type + Anchor Month */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
            {PROGRAM_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setProgramFilter(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                  programFilter === t.id ? 'bg-[#064e43] text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                genderFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              All Campuses
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('Male')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                genderFilter === 'Male' ? 'bg-emerald-700 text-white' : 'text-emerald-800'
              }`}
            >
              Boys Campus
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('Female')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                genderFilter === 'Female' ? 'bg-purple-700 text-white' : 'text-purple-800'
              }`}
            >
              Girls Campus
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or roll no..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
            />
          </div>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
          >
            <option value="all">All Sections ({availableSections.length})</option>
            {availableSections.map((sec) => (
              <option key={sec} value={sec}>
                Section {sec}
              </option>
            ))}
          </select>

          <select
            value={testTypeFilter}
            onChange={(e) => setTestTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
          >
            <option value="all">All Test Types (Combined)</option>
            <option value="Daily">Daily Tests Only</option>
            <option value="Weekly">Weekly Tests Only</option>
            <option value="Monthly">Monthly Exams Only</option>
            <option value="Mid-Term">Mid-Term / Send-Up</option>
            <option value="Six-Month">6-Month Terminal</option>
          </select>

          <input
            type="month"
            value={anchorMonth}
            onChange={(e) => setAnchorMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
            title="Select End Month for 6-Month Window"
          />
        </div>
      </div>

      {/* Selected Student 6-Month Deep-Dive Dossier */}
      {selectedRow ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-black overflow-hidden">
                {selectedRow.student.photo ? (
                  <img
                    src={selectedRow.student.photo}
                    alt={selectedRow.student.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (selectedRow.student.fullName || 'S').slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">
                  {selectedRow.student.fullName}
                </h4>
                <p className="text-xs text-slate-500">
                  Roll: {selectedRow.student.collegeNo || selectedRow.student.id} •{' '}
                  {selectedRow.student.group} • Sec {selectedRow.student.section || 'A'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleDownloadSixMonthPDF(selectedRow)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <FileText size={14} />
                <span>Download 6-Month Progress Card PDF</span>
              </button>
              <button
                type="button"
                disabled={sendingWa}
                onClick={() => handleSendWhatsAppProgress(selectedRow)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <MessageSquare size={14} />
                <span>
                  {sendingWa ? 'Sending...' : 'Send 6-Month Progress to Parent (WhatsApp)'}
                </span>
              </button>
            </div>
          </div>

          {/* 6-Month Trajectory Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-3">
                6-Month Performance Trajectory ({sixMonths[0].shortLabel} &ndash;{' '}
                {sixMonths[5].shortLabel})
              </h5>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sixMonths.map((m) => ({
                      month: m.shortLabel,
                      percentage:
                        selectedRow.monthlyMap[m.key].pct !== null
                          ? Number(selectedRow.monthlyMap[m.key].pct!.toFixed(1))
                          : 0,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="percentage"
                      stroke="#059669"
                      fill="#10b981"
                      fillOpacity={0.2}
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#064e43] to-[#085a4e] text-white flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                  Executive Summary
                </span>
                <h4 className="text-2xl font-black mt-1">
                  {selectedRow.sixMonthOverallPct !== null
                    ? `${selectedRow.sixMonthOverallPct.toFixed(1)}% Overall`
                    : 'No Marks Yet'}
                </h4>
                <p className="text-xs text-emerald-100/80 mt-1">
                  Across {selectedRow.totalTestsCount} recorded assessments
                </p>
              </div>

              <div className="my-4 p-3.5 rounded-2xl bg-white/10 border border-white/15">
                <p className="text-[10px] uppercase font-bold text-emerald-200">
                  Month-over-Month Comparison
                </p>
                {selectedRow.delta !== null ? (
                  <p className="text-lg font-black text-amber-300 mt-0.5">
                    {selectedRow.delta >= 0 ? `+${selectedRow.delta.toFixed(1)}%` : `${selectedRow.delta.toFixed(1)}%`}{' '}
                    {selectedRow.delta >= 0 ? 'Improvement ▲' : 'Decline ▼'}
                  </p>
                ) : (
                  <p className="text-xs text-white/80 mt-0.5">
                    Requires at least 2 months of marks to compute delta
                  </p>
                )}
              </div>

              <div className="text-[11px] text-emerald-200 font-medium">
                Overall Grade:{' '}
                <strong className="text-white">
                  {selectedRow.sixMonthOverallPct !== null
                    ? computeGrade(selectedRow.sixMonthOverallPct)
                    : 'N/A'}
                </strong>
              </div>
            </div>
          </div>

          {/* Subject-by-Subject 6-Month Comparison Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Subject</th>
                  {sixMonths.map((m) => (
                    <th key={m.key} className="py-3 px-3 text-center">
                      {m.shortLabel}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center">6-Month Avg</th>
                  <th className="py-3 px-4 text-center">Monthly Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedSubjectMatrix.map((row) => (
                  <tr key={row.subject} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-black text-slate-900">{row.subject}</td>
                    {sixMonths.map((m) => {
                      const c = row.monthPcts[m.key];
                      return (
                        <td key={m.key} className="py-2.5 px-3 text-center font-mono">
                          {c.pct !== null ? (
                            <div>
                              <span className="font-bold text-slate-800">
                                {c.pct.toFixed(0)}%
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                ({c.obt}/{c.tot})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-800">
                      {row.avgPct !== null ? `${row.avgPct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {row.subjectDelta !== null ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                            row.subjectDelta > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.subjectDelta < 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.subjectDelta > 0 ? (
                            <TrendingUp size={11} />
                          ) : row.subjectDelta < 0 ? (
                            <TrendingDown size={11} />
                          ) : (
                            <Minus size={11} />
                          )}
                          <span>
                            {row.subjectDelta >= 0 ? '+' : ''}
                            {row.subjectDelta.toFixed(1)}%
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[10px]">Baseline</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Class-Wide 6-Month Comparison Roster Table */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="max-h-[540px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 pl-5 pr-2">Roll / ID</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Class / Sec</th>
                  {sixMonths.map((m) => (
                    <th key={m.key} className="py-3 px-2.5 text-center">
                      {m.shortLabel}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center">6-Mo Avg</th>
                  <th className="py-3 px-3 text-center">Comparison vs Last Mo</th>
                  <th className="py-3 pl-2 pr-5 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentProgressRows.map((row) => {
                  const stu = row.student;
                  return (
                    <tr
                      key={stu.id}
                      onClick={() => setSelectedStudentId(stu.id)}
                      className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 pl-5 pr-2 font-mono font-bold text-slate-700">
                        {stu.collegeNo || stu.studentId || stu.id}
                      </td>
                      <td className="py-2.5 px-3 font-black text-slate-900">{stu.fullName}</td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600 font-semibold">
                        {stu.group} • Sec {stu.section || 'A'}
                      </td>
                      {sixMonths.map((m) => {
                        const cell = row.monthlyMap[m.key];
                        return (
                          <td key={m.key} className="py-2.5 px-2.5 text-center font-mono">
                            {cell.pct !== null ? (
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold text-[11px] ${
                                  cell.pct >= 60
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {cell.pct.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                        {row.sixMonthOverallPct !== null
                          ? `${row.sixMonthOverallPct.toFixed(1)}%`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.delta !== null ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              row.delta > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.delta < 0
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.delta > 0 ? (
                              <TrendingUp size={11} />
                            ) : row.delta < 0 ? (
                              <TrendingDown size={11} />
                            ) : (
                              <Minus size={11} />
                            )}
                            <span>
                              {row.delta >= 0 ? '+' : ''}
                              {row.delta.toFixed(1)}%
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Baseline</span>
                        )}
                      </td>
                      <td
                        className="py-2.5 pl-2 pr-5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDownloadSixMonthPDF(row)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            title="Download 6-Month Progress PDF"
                          >
                            <FileText size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppProgress(row)}
                            className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer"
                            title="Send 6-Month Progress Report via WhatsApp"
                          >
                            <MessageSquare size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
