
import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  Download, 
  Upload, 
  Calendar, 
  User, 
  BookOpen, 
  ChevronRight,
  TrendingUp,
  Award,
  AlertCircle,
  Printer,
  History,
  MessageSquare,
  Zap,
  Trophy
} from 'lucide-react';
import BatchMarksEntry from './BatchMarksEntry';
import ClassMeritList from './ClassMeritList';
import { motion } from 'motion/react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { School, GraduationCap, Globe, Edit, Trash2, MoreHorizontal, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AcademicRecord, Student, Staff } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateProfessionalResultCard = (records: any[], data: any, doc: jsPDF, isFirstPage: boolean) => {
  if (!records || records.length === 0) return; if (!isFirstPage) doc.addPage(); const record = records[0];

  const settings = data.settings;
  const cName = settings?.collegeName || 'SUPERIOR GROUP OF COLLEGES';
  const cCampus = settings?.campusName || 'MAIN CAMPUS';
  const cAddress = settings?.address || 'City Name';
  const cContact = settings?.contactNumber || 'Contact';
  const logo = settings?.logo;
  
  let sumObtained = 0; let sumTotal = 0; records.forEach((r: any) => { sumObtained += Number(r.obtainedMarks) || 0; sumTotal += Number(r.totalMarks) || 0; }); const percentage = sumTotal > 0 ? (sumObtained / sumTotal) * 100 : 0;
  const grade = percentage >= 80 ? 'A+' : percentage >= 70 ? 'A' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : 'F';
  const statusText = percentage >= 50 ? 'PASS' : 'FAIL';
  
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // Background and borders
  doc.setFillColor(252, 252, 252);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setDrawColor(5, 59, 50); // Superior Teal
  doc.setLineWidth(3);
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40);

  // Inner border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(25, 25, pageWidth - 50, pageHeight - 50);

  let currentY = 80;

  // Header Title
  doc.setFontSize(24);
  doc.setTextColor(5, 59, 50);
  doc.setFont('times', 'bold');
  const titleWidth = doc.getTextWidth(cName.toUpperCase());
  
  // Logic to handle logo next to the title
  if (logo) {
    try {
      doc.addImage(logo, 'JPEG', (pageWidth - titleWidth)/2 - 35, currentY - 24, 25, 25);
      doc.text(cName.toUpperCase(), (pageWidth - titleWidth)/2, currentY);
    } catch (e) {
      doc.text(cName.toUpperCase(), (pageWidth - titleWidth)/2, currentY);
    }
  } else {
    doc.text(cName.toUpperCase(), (pageWidth - titleWidth)/2, currentY);
  }

  currentY += 25;
  
  // Campus & Subheading
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  const subTitleText = `${cCampus.toUpperCase()}`;
  const subTitleWidth = doc.getTextWidth(subTitleText);
  doc.text(subTitleText, (pageWidth - subTitleWidth)/2, currentY);

  currentY += 15;
  doc.setFontSize(9);
  const contactText = `${cAddress} | ${cContact}`;
  const contactWidth = doc.getTextWidth(contactText);
  doc.text(contactText, (pageWidth - contactWidth)/2, currentY);

  currentY += 40;

  // Result Card Badge
  doc.setFillColor(5, 59, 50);
  doc.rect((pageWidth - 200)/2, currentY, 200, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const badgeText = "OFFICIAL RESULT CARD";
  const badgeWidth = doc.getTextWidth(badgeText);
  doc.text(badgeText, (pageWidth - badgeWidth)/2, currentY + 17);

  currentY += 60;

  // Details Wrapper
  const startX = 60;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  
  // Left Column
  doc.setFont('helvetica', 'bold');
  doc.text("Student Name:", startX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(record.studentName || 'N/A', startX + 100, currentY);

  doc.setFont('helvetica', 'bold');
  doc.text("Roll / ID No:", startX, currentY + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(record.studentId || 'N/A', startX + 100, currentY + 25);

  doc.setFont('helvetica', 'bold');
  doc.text("Class / Program:", startX, currentY + 50);
  doc.setFont('helvetica', 'normal');
  doc.text(record.class || 'N/A', startX + 100, currentY + 50);

  // Right Column
  const rightX = pageWidth / 2 + 30;

  doc.setFont('helvetica', 'bold');
  doc.text("Exam Type:", rightX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(record.testType || 'N/A', rightX + 80, currentY);

  doc.setFont('helvetica', 'bold');
  doc.text("Date of Exam:", rightX, currentY + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(record.date || 'N/A', rightX + 80, currentY + 25);

  doc.setFont('helvetica', 'bold');
  doc.text("Section/Group:", rightX, currentY + 50);
  doc.setFont('helvetica', 'normal');
  doc.text(record.section || 'N/A', rightX + 80, currentY + 50);

  currentY += 80;

  // Draw table for marks
  autoTable(doc, {
    startY: currentY,
    margin: { left: 50, right: 50 },
    head: [['Subject / Exam Component', 'Total Marks', 'Marks Obtained', 'Percentage', 'Grade']],
    body: records.map((r: any) => {
      const p = Number(r.totalMarks) > 0 ? (Number(r.obtainedMarks) / Number(r.totalMarks)) * 100 : 0;
      const g = p >= 80 ? 'A+' : p >= 70 ? 'A' : p >= 60 ? 'B' : p >= 50 ? 'C' : 'F';
      return [
        `${r.subject} - ${r.testName || 'Examination'}`, 
        (r.totalMarks || 0).toString(), 
        (r.obtainedMarks || 0).toString(), 
        `${p.toFixed(1)}%`, 
        g
      ];
    }).concat([
      [ 'TOTAL', sumTotal.toString(), sumObtained.toString(), `${percentage.toFixed(1)}%`, grade ]
    ]),
    headStyles: {
      fillColor: [5, 59, 50],
      textColor: 255,
      halign: 'center',
      fontStyle: 'bold'
    },
    bodyStyles: {
      halign: 'center',
      textColor: 50,
      fontSize: 11
    },
    theme: 'grid',
    styles: {
      cellPadding: 10
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 40;

  // Summary box
  doc.setDrawColor(5, 59, 50);
  doc.setLineWidth(1);
  doc.setLineDashPattern([4, 4], 0);
  doc.rect(50, currentY, pageWidth - 100, 60);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  if (statusText === 'PASS') {
    doc.setTextColor(34, 197, 94); // Green
  } else {
    doc.setTextColor(239, 68, 68); // Red
  }
  doc.text(`Result Status: ${statusText}`, 70, currentY + 35);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(`Remarks:`, 250, currentY + 35);
  doc.setFont('helvetica', 'normal');
  doc.text(record.remarks || (statusText === 'PASS' ? 'Satisfactory Performance' : 'Needs Improvement'), 315, currentY + 35);
  
  doc.setLineDashPattern([], 0);

  currentY += 150;

  // Signatures
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);

  doc.line(60, currentY, 200, currentY);
  doc.text("Subject Teacher", 95, currentY + 15);

  doc.line(pageWidth - 200, currentY, pageWidth - 60, currentY);
  doc.text("Principal", pageWidth - 145, currentY + 15);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on ${new Date().toLocaleDateString()} by SGC Management System`, pageWidth / 2, pageHeight - 30, { align: 'center' });
};


export default function AcademicView({ data }: { data: any }) {
  const [academicMode, setAcademicMode] = useState<'profiles' | 'batch_entry' | 'merit_list'>('profiles');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0')
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Modal states
  const [recordDate, setRecordDate] = useState(() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  });
  const [recordTestType, setRecordTestType] = useState("Monthly");
  const [recordSubjects, setRecordSubjects] = useState<{subject: string, teacher: string, obtained: string, total: string}[]>([]);

  // TABS
  const [activeTab, setActiveTab] = useState("marks");

  const studentsList = data.students || [];
  const activeStudents = useMemo(() => studentsList.filter((s: Student & { status?: string }) => s.status !== "Struck Off"), [studentsList]);

  const selectedStudent = useMemo(() => {
    return activeStudents.find((s: Student) => s.id === selectedStudentId) || null;
  }, [activeStudents, selectedStudentId]);

  // Derived filtered students for the search/list when no student selected
  const filteredStudents = useMemo(() => {
    return activeStudents.filter((s: Student) => {
      const matchesSearch = (s.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (s.id || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGroup = selectedGroup === "all" || s.group === selectedGroup;
      const matchesSection = selectedSection === "all" || s.section === selectedSection;
      return matchesSearch && matchesGroup && matchesSection;
    });
  }, [activeStudents, searchTerm, selectedGroup, selectedSection]);

  const studentRecords = useMemo(() => {
    if (!selectedStudent) return [];
    return (data.academicRecords || []).filter((r: AcademicRecord) => r.studentId === selectedStudent.id)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.academicRecords, selectedStudent]);

  // Handle + Record marks opens modal
  const handleOpenRecordModal = () => {
    setIsRecordModalOpen(true);
    
    let subjectsList: string[] = selectedStudent?.subjects || [];
    
    // Auto fetch from admission record directly if student model is missing subjects
    if (subjectsList.length === 0 && selectedStudent?.admissionId) {
      const adm = data.admissions?.find((a: any) => a.id === selectedStudent.admissionId);
      if (adm && adm.subjects && adm.subjects.length > 0) {
        subjectsList = adm.subjects;
      }
    }
    
    if (subjectsList.length === 0) {
      // Auto fetch from student's own past records
      subjectsList = Array.from(new Set(studentRecords.map((r: any) => r.subject))).filter(Boolean) as string[];
      
      // If still empty, fetch from other records in the same group/class
      if (subjectsList.length === 0 && selectedStudent) {
        const groupRecords = (data.academicRecords || []).filter((r: any) => r.class === selectedStudent.group);
        subjectsList = Array.from(new Set(groupRecords.map((r: any) => r.subject))).filter(Boolean) as string[];
      }
    }

    if (subjectsList.length > 0) {
      setRecordSubjects(subjectsList.map((sub: string) => ({
        subject: sub, teacher: "", obtained: "", total: "50"
      })));
    } else {
      setRecordSubjects([{ subject: "", teacher: "", obtained: "", total: "50" }]);
    }
  };

  const handleSaveMarks = () => {
    if (!selectedStudent) { toast.error("Please select a student."); return; }
    
    const validRows = recordSubjects.filter(r => r.subject.trim() !== "" && r.obtained.trim() !== "");
    if (validRows.length === 0) {
      toast.error("Please enter marks for at least one subject.");
      return;
    }

    const recordsToSave = validRows.map(r => ({
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      class: selectedStudent.group,
      section: selectedStudent.section,
      testName: "Exam", 
      testType: recordTestType,
      date: recordDate,
      subject: r.subject,
      teacherId: r.teacher,
      totalMarks: r.total,
      obtainedMarks: r.obtained,
      remarks: ""
    }));

    if (data.addBulkAcademicRecords) {
      data.addBulkAcademicRecords(recordsToSave);
      toast.success(`Saved ${recordsToSave.length} subject entries.`);
    } else if (data.addAcademicRecord) {
      recordsToSave.forEach(r => data.addAcademicRecord(r));
      toast.success("Academic records saved.");
    } else {
      toast.error("Methods to save records missing in data context.");
    }
    
    setIsRecordModalOpen(false);
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      data.deleteAcademicRecord(id);
    }
  };

  // Stats
  const totalSubjects = selectedStudent?.subjects?.length || 0;
  let totalObtained = 0;
  let totalMax = 0;
  const currentMonthRecords = studentRecords.filter((r: any) => r.date.startsWith(selectedMonth));
  currentMonthRecords.forEach((r: any) => {
    totalObtained += Number(r.obtainedMarks) || 0;
    totalMax += Number(r.totalMarks) || 0;
  });
  const avgThisMonth = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(0) + "%" : "0%";
  // Distinct tests taken is the number of distinct (date + testType) combinations
  const distinctTests = new Set(currentMonthRecords.map((r:any) => r.date + "_" + r.testType)).size;

  const exportPDF = () => {
    if (!selectedStudent) return;
    const doc = new jsPDF("p", "pt", "a4");
    const records = currentMonthRecords;
    if (records.length === 0) {
      toast.error("No records found for " + selectedMonth + " to export.");
      return;
    }
    generateProfessionalResultCard(records, data, doc, true);
    doc.save(`Result_Card_${selectedStudent.fullName.replace(/\s+/g, "_")}_${selectedMonth}.pdf`);
    toast.success("PDF exported successfully");
  };

  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const sendResultViaWhatsApp = async () => {
    if (!selectedStudent) return;
    const records = currentMonthRecords;
    if (records.length === 0) {
      toast.error("No exam records found for " + selectedMonth + " to send.");
      return;
    }

    const rawPhone = selectedStudent.contact || selectedStudent.fatherContact || selectedStudent.phone || selectedStudent.mobile;
    if (!rawPhone) {
      toast.error(`No contact phone number available for ${selectedStudent.fullName}.`);
      return;
    }

    const cleanPhone = rawPhone.replace(/\D/g, "");
    const percentNum = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : "0";
    const statusText = Number(percentNum) >= 50 ? "PASSED (Kamyab) ✅" : "NEEDS IMPROVEMENT (Mazeed Mehnat) ⚠️";

    const marksTableText = records.map((r: any) => {
      const p = Number(r.totalMarks) > 0 ? ((Number(r.obtainedMarks) / Number(r.totalMarks)) * 100).toFixed(0) : "0";
      return `• *${r.subject}* (${r.testType}): ${r.obtainedMarks} / ${r.totalMarks} (${p}%)`;
    }).join("\n");

    const message = 
`🎓 *SUPERIOR GROUP OF COLLEGES JAHANIAN*
📊 *Official Academic Examination Result Card*
━━━━━━━━━━━━━━━━━━━━━━━━━
Mohtaram Walid/Guardian (${selectedStudent.fatherName || 'Sahib'}),

Aapke bache *${selectedStudent.fullName}* ka official imtehani result darj zail hai:

👤 *Student Name:* ${selectedStudent.fullName}
🆔 *Roll Number:* ${selectedStudent.id || selectedStudent.collegeNo || 'N/A'}
🏫 *Class & Section:* ${selectedStudent.group} (Sec: ${selectedStudent.section})
📅 *Exam Month:* ${getMonthName(selectedMonth)}
━━━━━━━━━━━━━━━━━━━━━━━━━
📝 *Subject-wise Marks:*
${marksTableText}
━━━━━━━━━━━━━━━━━━━━━━━━━
📈 *Total Marks:* ${totalObtained} / ${totalMax} (${percentNum}%)
🏆 *Result Status:* ${statusText}

Hamara maqsad aapke bache ka roshan mustaqbil aur behtareen taleem hai. Kisi bhi rehnumai ya mushawarat ke liye college office rabta karein.

📍 Khanewal Road, Jahanian
📞 College Helpdesk: 0301-4455891
━━━━━━━━━━━━━━━━━━━━━━━━━`;

    try {
      setIsSendingWhatsApp(true);
      toast.loading(`Sending result card to +${cleanPhone}...`, { id: "res-wa" });
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, message }),
      });

      if (res.ok) {
        toast.success(`Result card successfully sent to +${cleanPhone}!`, { id: "res-wa" });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.info(err.error || "Gateway offline. Opening WhatsApp Web...", { id: "res-wa" });
        window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`, "_blank");
      }
    } catch {
      window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`, "_blank");
      toast.dismiss("res-wa");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const exportHistoryExcel = () => {
    if(studentRecords.length === 0) return toast.error("No history to export.");
    const ws = XLSX.utils.json_to_sheet(studentRecords.map((r: any) => ({
      "Exam Type": r.testType,
      "Date": r.date,
      "Subject": r.subject,
      "Marks": `${r.obtainedMarks} / ${r.totalMarks}`,
      "Percentage": (Number(r.totalMarks) > 0 ? (Number(r.obtainedMarks)/Number(r.totalMarks)*100).toFixed(1) : 0) + "%"
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    XLSX.writeFile(wb, `History_${selectedStudent?.fullName}.xlsx`);
  };

  // Basic Month Name formatting
  const getMonthName = (yyyyMM: string) => {
    const m = yyyyMM.split('-');
    if(m.length !== 2) return yyyyMM;
    const date = new Date(Number(m[0]), Number(m[1])-1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };
  
  const getSmallMonth = (yyyyMM: string) => {
    const m = yyyyMM.split('-');
    if(m.length !== 2) return yyyyMM;
    const date = new Date(Number(m[0]), Number(m[1])-1, 1);
    return date.toLocaleString('default', { month: 'short' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-emerald-900">Academic Records & Examination</h2>
          <p className="text-emerald-700/80">Batch marks entry, class positions 1st/2nd/3rd, and consolidated student profiles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-emerald-200 text-emerald-800"><Upload className="w-4 h-4 mr-2" /> Import Excel</Button>
          <Button onClick={handleOpenRecordModal} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"><Plus className="w-4 h-4 mr-2" /> Record marks</Button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 max-w-fit shadow-inner">
        <button
          type="button"
          onClick={() => setAcademicMode('profiles')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            academicMode === 'profiles'
              ? 'bg-white text-emerald-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User size={15} />
          <span>Student Profiles & Result Cards</span>
        </button>
        <button
          type="button"
          onClick={() => setAcademicMode('batch_entry')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            academicMode === 'batch_entry'
              ? 'bg-superior-teal text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap size={15} />
          <span>⚡ Batch Marks Entry (Excel Mode)</span>
        </button>
        <button
          type="button"
          onClick={() => setAcademicMode('merit_list')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            academicMode === 'merit_list'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Trophy size={15} />
          <span>🏆 Class Positions & Merit List</span>
        </button>
      </div>

      {/* Mode Views */}
      {academicMode === 'batch_entry' && (
        <BatchMarksEntry
          students={data.students || []}
          academicRecords={data.academicRecords || []}
          onSaveBatchMarks={(records) => {
            if (data.addBulkAcademicRecords) {
              data.addBulkAcademicRecords(records);
            } else if (data.addAcademicRecord) {
              records.forEach(r => data.addAcademicRecord(r));
            }
          }}
          predefinedSections={data.settings?.predefinedSections || []}
          settings={data.settings}
        />
      )}

      {academicMode === 'merit_list' && (
        <ClassMeritList
          students={data.students || []}
          academicRecords={data.academicRecords || []}
          predefinedSections={data.settings?.predefinedSections || []}
          settings={data.settings}
        />
      )}

      {academicMode === 'profiles' && (
        <div className="space-y-6">
          <Card className="p-4 bg-white/60 backdrop-blur-md border border-emerald-100 shadow-sm rounded-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600/50" />
            <Input 
              placeholder="Search student name, ID..." 
              className="pl-9 border-emerald-100 focus-visible:ring-emerald-500" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="border-emerald-100"><SelectValue placeholder="All groups" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All groups</SelectItem>
              {['Inter', 'DIT', 'BS', 'DPT', 'Matric'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="border-emerald-100"><SelectValue placeholder="All sections" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sections</SelectItem>
              {data.settings?.predefinedSections?.map((s: any) => <SelectItem key={s.name} value={s.name}>{s.name} ({s.gender})</SelectItem>)}
            </SelectContent>
          </Select>
          <Input 
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="border-emerald-100 focus-visible:ring-emerald-500"
          />
        </div>
        
        {!selectedStudent && (
          <div className="mt-4">
            <h3 className="font-semibold text-emerald-800 mb-2">Select a student profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border border-transparent pb-10">
              {filteredStudents.length > 0 ? filteredStudents.map((s: Student) => (
                <div key={s.id} onClick={() => setSelectedStudentId(s.id)} className="p-4 border rounded-xl cursor-pointer hover:-translate-y-1.5 hover:shadow-lg hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300 flex items-center gap-3 bg-white">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-sm">
                    {(s.fullName || "??").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{s.fullName}</div>
                    <div className="text-xs text-emerald-600">{s.id} • {s.group} {s.section !== '-' ? "• SEC " + s.section : ""}</div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full p-4 text-center text-emerald-600 bg-emerald-50 rounded-lg">No students found matching your filters.</div>
              )}
            </div>
          </div>
        )}
      </Card>

      {selectedStudent && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="bg-[#FAF9F6] border-emerald-100 shadow-sm p-4 md:p-6 overflow-hidden relative rounded-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-bold shadow-sm">
                  {(selectedStudent.fullName || "??").substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{selectedStudent.fullName}</h3>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-emerald-600 hover:bg-emerald-100" onClick={() => setSelectedStudentId(null)}>Close</Button>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-2 items-center">
                    <span>{selectedStudent.id}</span> • 
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-0">SEC {selectedStudent.section}</Badge>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-0">{selectedStudent.group}</Badge>
                     {selectedStudent.gender && <span className="text-emerald-700 font-medium">{selectedStudent.gender}</span>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 md:gap-8 bg-white px-6 py-3 rounded-xl border shadow-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-800">{totalSubjects}</div>
                  <div className="text-xs font-medium text-gray-500">Subjects</div>
                </div>
                <div className="text-center border-l pl-6 md:pl-8">
                  <div className="text-2xl font-bold text-emerald-800">{avgThisMonth}</div>
                  <div className="text-xs font-medium text-gray-500">Avg {getSmallMonth(selectedMonth)}</div>
                </div>
                <div className="text-center border-l pl-6 md:pl-8">
                  <div className="text-2xl font-bold text-emerald-800">{distinctTests}</div>
                  <div className="text-xs font-medium text-gray-500">Tests taken</div>
                </div>
                
                <div className="pl-4 flex items-center gap-2">
                  <Button onClick={exportPDF} variant="outline" className="text-emerald-800 border bg-emerald-50 hover:bg-emerald-100 border-emerald-200 shadow-none font-bold text-xs">
                    <FileText className="w-4 h-4 mr-1.5" /> Result card PDF
                  </Button>
                  <Button 
                    onClick={sendResultViaWhatsApp} 
                    disabled={isSendingWhatsApp}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold text-xs flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {isSendingWhatsApp ? "Sending..." : "Send via WhatsApp"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent border-b border-gray-200 rounded-none h-12 w-full justify-start space-x-8 p-0">
              <TabsTrigger value="marks" className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none bg-transparent shadow-none px-1 data-[state=active]:shadow-none font-medium text-gray-500 data-[state=active]:text-emerald-900">This month's marks</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none bg-transparent shadow-none px-1 data-[state=active]:shadow-none font-medium text-gray-500 data-[state=active]:text-emerald-900">Full history</TabsTrigger>
              <TabsTrigger value="preview" className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none bg-transparent shadow-none px-1 data-[state=active]:shadow-none font-medium text-gray-500 data-[state=active]:text-emerald-900">Result card preview</TabsTrigger>
            </TabsList>
            
            <div className="pt-6">
              <TabsContent value="marks" className="mt-0 space-y-4">
                <Card className="border shadow-sm overflow-hidden rounded-xl bg-white">
                  <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
                     <h3 className="font-semibold text-gray-800">Showing marks for {getMonthName(selectedMonth)}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-white hover:bg-white text-xs">
                          <TableHead className="font-medium text-gray-500">Month / Test</TableHead>
                          <TableHead className="font-medium text-gray-500">Subject</TableHead>
                          <TableHead className="font-medium text-gray-500">Marks</TableHead>
                          <TableHead className="font-medium text-gray-500">%</TableHead>
                          <TableHead className="text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentMonthRecords.length > 0 ? currentMonthRecords.map((r: any) => {
                          const p = Number(r.totalMarks) > 0 ? (Number(r.obtainedMarks) / Number(r.totalMarks)) * 100 : 0;
                          return (
                            <TableRow key={r.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium text-gray-900">{r.date} — {r.testType}</TableCell>
                              <TableCell className="text-gray-600">{r.subject}</TableCell>
                              <TableCell className="text-gray-900">{r.obtainedMarks} / {r.totalMarks}</TableCell>
                              <TableCell>
                                <Badge className={cn("font-normal border-0 text-xs", p >= 60 ? "bg-emerald-50 text-emerald-700" : "bg-[#FDF3F3] text-red-700")}>{p.toFixed(0)}%</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord(r.id)} className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                              </TableCell>
                            </TableRow>
                          )
                        }) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                              No marks recorded. Click "Record marks" to add some.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-0 space-y-4">
                <Card className="border shadow-sm p-4 rounded-xl">
                  <div className="flex flex-wrap gap-4 mb-4">
                     <Select defaultValue="all">
                       <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="All subjects" /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All subjects</SelectItem>
                         {selectedStudent.subjects?.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                       </SelectContent>
                     </Select>
                     <Select defaultValue="all_types">
                       <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="All Types" /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all_types">All Types</SelectItem>
                         <SelectItem value="Monthly">Monthly</SelectItem>
                         <SelectItem value="Weekly">Weekly</SelectItem>
                         <SelectItem value="Daily">Daily</SelectItem>
                       </SelectContent>
                     </Select>
                     <Select defaultValue="last_6">
                       <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Last 6 months" /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="last_6">Last 6 months</SelectItem>
                         <SelectItem value="all">All Time</SelectItem>
                       </SelectContent>
                     </Select>
                     <Button variant="outline" className="ml-auto bg-white" onClick={exportHistoryExcel}><Download className="w-4 h-4 mr-2" /> Download Excel</Button>
                  </div>
                  
                  <div className="overflow-x-auto border rounded-xl overflow-hidden relative">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="font-medium text-gray-600">Date / Test</TableHead>
                          <TableHead className="font-medium text-gray-600">Subject</TableHead>
                          <TableHead className="font-medium text-gray-600">Marks</TableHead>
                          <TableHead className="font-medium text-gray-600">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentRecords.length > 0 ? studentRecords.map((r: any) => {
                          const p = Number(r.totalMarks) > 0 ? (Number(r.obtainedMarks) / Number(r.totalMarks)) * 100 : 0;
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{r.date} — {r.testType}</TableCell>
                              <TableCell>{r.subject}</TableCell>
                              <TableCell>{r.obtainedMarks} / {r.totalMarks}</TableCell>
                              <TableCell>
                                <Badge className={cn("font-normal border-0 text-xs", p >= 60 ? "bg-emerald-50 text-emerald-700" : "bg-[#FDF3F3] text-red-700")}>{p.toFixed(0)}%</Badge>
                              </TableCell>
                            </TableRow>
                          )
                        }) : (
                          <TableRow><TableCell colSpan={4} className="text-center py-12 text-gray-500">No history found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="preview" className="mt-0 space-y-6">
                <Card className="p-0 border shadow-sm rounded-xl overflow-hidden bg-white">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="flex-1">
                        <Label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Date Range</Label>
                        <Select defaultValue="last_6">
                           <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Last 6 months" /></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="last_6">Last 6 months</SelectItem>
                             <SelectItem value="this_month">This Month</SelectItem>
                             <SelectItem value="full_year">Full Year</SelectItem>
                           </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Test Types</Label>
                        <div className="flex gap-2">
                          <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-0 cursor-pointer px-4 py-1.5 text-sm font-medium"><Calendar className="w-3.5 h-3.5 mr-1.5" /> Monthly</Badge>
                          <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-0 cursor-pointer px-4 py-1.5 text-sm font-medium"><Calendar className="w-3.5 h-3.5 mr-1.5" /> Weekly</Badge>
                          <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-200 border-0 cursor-pointer px-4 py-1.5 text-sm font-normal"><Calendar className="w-3.5 h-3.5 mr-1.5" /> Daily</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <Label className="text-xs uppercase text-gray-500 font-bold mb-3 block">Export Format</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-emerald-500 bg-emerald-50/30 rounded-xl p-5 cursor-pointer relative shadow-sm" onClick={exportPDF}>
                           <div className="absolute top-3 right-3"><Check className="w-5 h-5 text-emerald-600" /></div>
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center"><FileText className="w-6 h-6 text-emerald-700" /></div>
                             <div>
                               <h4 className="font-bold text-gray-900 text-base">PDF result card</h4>
                               <p className="text-sm text-gray-500 mt-1">Formatted result card — suitable for printing and sharing</p>
                             </div>
                           </div>
                        </div>
                        <div className="border border-gray-200 hover:border-emerald-300 rounded-xl p-5 cursor-pointer transition-colors bg-white shadow-sm" onClick={exportHistoryExcel}>
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center"><BookOpen className="w-6 h-6 text-gray-500" /></div>
                             <div>
                               <h4 className="font-bold text-gray-900 text-base">Excel sheet</h4>
                               <p className="text-sm text-gray-500 mt-1">Raw data spreadsheet with all marks, dates, types</p>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-gray-50 p-4 border-t border-gray-100">
                     <span className="text-sm text-gray-600">{currentMonthRecords.length} records matched</span>
                     <div className="flex items-center gap-2">
                       <Button onClick={exportPDF} variant="outline" className="border-emerald-200 text-emerald-800 shadow-sm font-bold text-xs">
                         <Download className="w-4 h-4 mr-1.5" /> Download PDF
                       </Button>
                       <Button 
                         onClick={sendResultViaWhatsApp} 
                         disabled={isSendingWhatsApp} 
                         className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold text-xs flex items-center gap-1.5"
                       >
                         <MessageSquare className="w-4 h-4" />
                         {isSendingWhatsApp ? "Sending..." : "Send Result via WhatsApp"}
                       </Button>
                     </div>
                  </div>
                </Card>

                {/* Preview List */}
                <Card className="p-5 border shadow-sm rounded-xl border-gray-200">
                   <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><History className="w-4 h-4 text-emerald-600" /> Preview — records matched</h3>
                   <div className="space-y-1">
                     {currentMonthRecords.slice(0,5).map((s: any, i: number) => {
                       const p = Number(s.totalMarks) > 0 ? (Number(s.obtainedMarks)/Number(s.totalMarks))*100 : 0;
                       return (
                       <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 rounded-lg transition-colors">
                         <div>
                           <span className="font-medium text-gray-800">{s.date} — {s.testType}</span>
                           <span className="text-sm text-gray-500 ml-2">{s.subject}</span>
                         </div>
                         <div className="flex items-center gap-4">
                           <span className="text-sm font-medium text-gray-700">{s.obtainedMarks}/{s.totalMarks}</span>
                           <Badge className={cn("border-0 text-xs", p >= 60 ? "bg-emerald-50 text-emerald-700": "bg-red-50 text-red-700")}>{p.toFixed(0)}%</Badge>
                         </div>
                       </div>
                     )})}
                   </div>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </motion.div>
      )}
        </div>
      )}

      {/* Record Marks Modal */}
      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-gray-50 border-0 rounded-xl shadow-xl">
          <div className="p-6 bg-white border-b flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-lg">
                 {(selectedStudent?.fullName || "??").substring(0,2).toUpperCase()}
               </div>
               <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedStudent?.fullName}</h3>
                  <p className="text-xs text-gray-500">{selectedStudent?.id} • {selectedStudent?.group} {selectedStudent?.section !== "-" ? "SEC " + selectedStudent?.section : ""}</p>
               </div>
            </div>
            <div className="flex gap-2 items-center bg-gray-50 p-1.5 rounded-lg border border-gray-100 shadow-sm">
              <Select value={recordTestType} onValueChange={setRecordTestType}>
                <SelectTrigger className="w-[140px] bg-white border-0 shadow-none focus:ring-0 font-medium text-gray-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly exam</SelectItem>
                  <SelectItem value="Weekly">Weekly test</SelectItem>
                  <SelectItem value="Daily">Daily test</SelectItem>
                </SelectContent>
              </Select>
              <div className="w-[1px] h-6 bg-gray-200"></div>
              <Input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)} className="w-[150px] bg-white border-0 shadow-none focus-visible:ring-0 font-medium text-gray-700" />
            </div>
          </div>

          <div className="px-6 py-5 grid grid-cols-3 gap-4">
            <Card className="bg-[#FAF9F6] border border-gray-100 shadow-sm"><CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-emerald-900">{recordSubjects.length}</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-1">Subjects</div>
            </CardContent></Card>
            <Card className="bg-[#FAF9F6] border border-gray-100 shadow-sm"><CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-emerald-900">
                {recordSubjects.reduce((acc, curr) => acc + (Number(curr.obtained)||0), 0)} / {recordSubjects.reduce((acc, curr) => acc + (Number(curr.total)||0), 0)}
              </div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-1">Marks obtained</div>
            </CardContent></Card>
            <Card className="bg-[#FAF9F6] border border-gray-100 shadow-sm"><CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-emerald-900">
                {(() => {
                  const tObs = recordSubjects.reduce((acc, curr) => acc + (Number(curr.obtained)||0), 0);
                  const tMax = recordSubjects.reduce((acc, curr) => acc + (Number(curr.total)||0), 0);
                  return tMax > 0 ? ((tObs/tMax)*100).toFixed(0) + "%" : "0%";
                })()}
              </div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-1">Overall %</div>
            </CardContent></Card>
          </div>

          <div className="px-6 pb-6 w-full overflow-x-auto relative">
             <div className="min-w-[700px] border border-gray-200 bg-white rounded-xl shadow-sm p-4">
               <div className="grid grid-cols-[2fr_2fr_100px_100px_80px_40px] gap-3 mb-3 pb-3 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                 <div>Subject</div>
                 <div>Teacher</div>
                 <div className="text-center">Obtained</div>
                 <div className="text-center">Total</div>
                 <div className="text-center">%</div>
                 <div></div>
               </div>
               
               <datalist id="registered-subjects">
                  {Array.from(new Set([
                    ...(selectedStudent?.subjects || []),
                    ...(data.academicRecords?.map((r: any) => r.subject) || [])
                  ])).filter(Boolean).map(subj => (
                    <option key={subj as string} value={subj as string} />
                  ))}
               </datalist>

               {recordSubjects.map((row, index) => {
                 const percentageValue = Number(row.total) > 0 && row.obtained !== "" ? (Number(row.obtained) / Number(row.total)) * 100 : 0;
                 const percentage = Number(row.total) > 0 && row.obtained !== "" ? percentageValue.toFixed(0) + "%" : "—";
                 return (
                 <div key={index} className="grid grid-cols-[2fr_2fr_100px_100px_80px_40px] gap-3 items-center mb-3">
                   <Input list="registered-subjects" value={row.subject} placeholder="e.g. Chemistry" onChange={e => {
                     const upd = [...recordSubjects]; upd[index].subject = e.target.value; setRecordSubjects(upd);
                   }} className="bg-gray-50 border-gray-200 focus-visible:ring-emerald-500" />
                   <Input value={row.teacher} placeholder="Teacher name (Optional)" onChange={e => {
                     const upd = [...recordSubjects]; upd[index].teacher = e.target.value; setRecordSubjects(upd);
                   }} className="bg-gray-50 border-gray-200 focus-visible:ring-emerald-500" />
                   <Input type="number" min="0" value={row.obtained} onChange={e => {
                     const upd = [...recordSubjects]; upd[index].obtained = e.target.value; setRecordSubjects(upd);
                   }} className="text-center bg-white border-gray-200 focus-visible:ring-emerald-500 font-medium" />
                   <Input type="number" min="1" value={row.total} onChange={e => {
                     const upd = [...recordSubjects]; upd[index].total = e.target.value; setRecordSubjects(upd);
                   }} className="text-center bg-gray-50 border-gray-200 focus-visible:ring-emerald-500" />
                   <div className="text-center text-sm font-medium">
                     {row.obtained !== "" ? <Badge variant="outline" className={cn("border-0 shadow-sm", percentageValue >= 60 ? "bg-emerald-50 text-emerald-700" : "bg-[#FDF3F3] text-red-700")}>{percentage}</Badge> : <span className="text-gray-400">—</span>}
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => {
                     setRecordSubjects(recordSubjects.filter((_, i) => i !== index));
                   }} className="text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                 </div>
               )})}

               <div className="flex items-center justify-center gap-4 mt-4 mb-2">
                 <Button variant="outline" className="border-dashed border-gray-300 text-gray-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50" onClick={() => setRecordSubjects([...recordSubjects, {subject: "", teacher: "", obtained: "", total: "50"}])}>
                   + Add subject
                 </Button>
                 <Button variant="outline" className="border-dashed border-emerald-300 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50" onClick={() => {
                   let subs = selectedStudent?.subjects || [];
                   
                   // Fallback 1: check the admission record directly if student model subjects are somehow missing
                   if (subs.length === 0 && selectedStudent?.admissionId) {
                     const adm = data.admissions?.find((a: any) => a.id === selectedStudent.admissionId);
                     if (adm && adm.subjects && adm.subjects.length > 0) {
                       subs = adm.subjects;
                     }
                   }
                   
                   // Fallback 2: auto fetch from student's own past records
                   if (subs.length === 0) subs = Array.from(new Set(studentRecords.map((r: any) => r.subject))).filter(Boolean) as string[];
                   
                   // Fallback 3: fetch from other records in the same group/class
                   if (subs.length === 0) subs = Array.from(new Set((data.academicRecords || []).filter((r: any) => r.class === selectedStudent?.group).map((r: any) => r.subject))).filter(Boolean) as string[];
                   
                   if (subs.length > 0) {
                     setRecordSubjects(subs.map(s => ({ subject: s, teacher: "", obtained: "", total: "50" })));
                     toast.success(`Fetched ${subs.length} subjects`);
                   } else {
                     toast.error("No subjects found to fetch.");
                   }
                 }}>
                   <Download className="w-4 h-4 mr-2" /> Auto-fetch student subjects
                 </Button>
               </div>
             </div>
          </div>

          <div className="px-6 py-4 bg-white border-t border-gray-100 flex flex-wrap justify-between items-center rounded-b-xl gap-4">
             <Button variant="outline" className="text-gray-600 bg-white shadow-sm hover:bg-gray-50"><Upload className="w-4 h-4 mr-2" /> Bulk import via Excel</Button>
             <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setRecordSubjects([])} className="text-gray-500 hover:text-gray-700">Clear all</Button>
                <Button onClick={handleSaveMarks} className="bg-emerald-600 hover:bg-emerald-700 shadow-md text-white px-6">Save marks</Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
