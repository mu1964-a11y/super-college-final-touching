
import * as React from 'react';
import { useState } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Eye, 
  Download,
  CreditCard,
  GraduationCap,
  Calendar,
  CheckCircle2,
  AlertCircle,
  User,
  Camera,
  Wallet,
  BarChart3,
  Trash2,
  School,
  Globe,
  Award,
  Droplet,
  MapPin,
  Mail,
  Phone,
  Receipt,
  FileText,
  MessageSquare,
  Fingerprint
} from 'lucide-react';
import WhatsAppReportModal, { ReportRecipientItem } from './WhatsAppReportModal';
import { buildStudentNoticeMessage, sendAutoStudentNotice } from '../lib/whatsappAutomation';
import BiometricEnrollmentModal from './BiometricEnrollmentModal';
import FingerprintThumbnail from './FingerprintThumbnail';
import { motion } from 'motion/react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Student, Gender, FeePayment } from '../types';
import { SUBJECTS, ACADEMIC_GROUPS, COMPULSORY_SUBJECTS } from '../constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { HighlightText } from './HighlightText';
import FeeReceipt from './FeeReceipt';
import StudentIDCardModal from './StudentIDCardModal';
import { compressImage } from '../lib/imageUtils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useDebounce } from '../hooks/useDebounce';
import { getUnifiedTransactions } from '../utils/fee';
import PhotoEditorModal from './PhotoEditorModal';

export default function StudentsView({ data, gender, program }: { data: any, gender?: Gender, program?: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [monthlyFeeFilter, setMonthlyFeeFilter] = useState('all');
  const [defaulterFilter, setDefaulterFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState<string>(gender || 'all');
  const [programFilter, setProgramFilter] = useState<string>(program || 'all');
  const [academicStageFilter, setAcademicStageFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with-photo' | 'missing-photo'>('all');
  const [photoEditorStudent, setPhotoEditorStudent] = useState<Student | null>(null);
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [subjectFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [dialogType, setDialogType] = useState<'profile' | 'profile_academic' | 'profile_fees' | 'edit' | 'pay' | 'receipt' | 'delete' | 'bulkDelete' | 'id_card' | 'bulk_promote' | 'migrate_section' | null>(null);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [biometricTargetStudent, setBiometricTargetStudent] = useState<Student | null>(null);
  const [targetMigrateSection, setTargetMigrateSection] = useState<string>('');
  const [targetPromoteSession, setTargetPromoteSession] = useState<string>(data?.settings?.academicSession || '2026-28');
  const [payConfig, setPayConfig] = useState<{ month?: string, year?: number }>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  React.useEffect(() => {
    setGenderFilter(gender || 'all');
  }, [gender]);

  React.useEffect(() => {
    setProgramFilter(program || 'all');
  }, [program]);

  const isNewStudent = React.useCallback((student: any): boolean => {
    const ts = student?.createdAt || student?.created_at;
    if (!ts) return false;
    const createdTime = new Date(ts).getTime();
    if (isNaN(createdTime)) return false;
    const diffHours = (Date.now() - createdTime) / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours < 12;
  }, []);

  const mergedStudents = React.useMemo(() => {
    console.log("Students data preview:", data.students.slice(0, 3).map((s: any) => ({ name: s.fullName, subjects: s.subjects })));
    const rawStudents = [...data.students].map(s => {
      let derivedGender = s.gender;
      if (!derivedGender) {
        const identifier = (`${s.category || ''} ${s.group || ''}`).toLowerCase();
        if (identifier.includes('girl') || identifier.includes('female')) {
          derivedGender = 'Female';
        } else {
          derivedGender = 'Male';
        }
      }
      const linkedAdm = data.admissions?.find((a: any) => a.id === s.admissionId || a.studentId === s.id || (s.collegeNo && a.collegeNo === s.collegeNo));
      const resolvedPhoto = s.photo || s.photo_url || linkedAdm?.photo_url || linkedAdm?.photo || '';
      return { 
        ...s, 
        gender: derivedGender, 
        photo: resolvedPhoto,
        createdAt: s.createdAt || s.created_at || linkedAdm?.createdAt || linkedAdm?.created_at,
        created_at: s.created_at || s.createdAt || linkedAdm?.created_at || linkedAdm?.createdAt,
      };
    });
    
    // Add all admissions that don't have a matching student record yet but are confirmed
    data.admissions.forEach((a: any) => {
      const existsInStudents = rawStudents.some((s: any) => s.admissionId === a.id || s.id === a.studentId);
      const isConfirmed = a.isAdmitted === true || 
                          a.status === "Admitted/Confirmed" || 
                          a.status === "Admitted" || 
                          a.status === "Confirmed" || 
                          a.status === "Full Paid" || 
                          a.status === "Partial Paid" || 
                          Number(a.feeReceived) > 0;
      
      if (!existsInStudents && isConfirmed) {
        let derivedGender = a.gender;
        if (!derivedGender) {
          const identifier = (`${a.category || ''} ${a.group || ''}`).toLowerCase();
          if (identifier.includes('girl') || identifier.includes('female')) {
            derivedGender = 'Female';
          } else {
            derivedGender = 'Male';
          }
        }

        // Map Admission to a Student model for display
        rawStudents.push({
          id: a.studentId || a.id,
          admissionId: a.id,
          fullName: a.fullName,
          fatherName: a.fatherName,
          collegeNo: a.collegeNo || (a as any).college_no,
          bayFormNo: a.bayFormNo || (a as any).bay_form_no,
          dob: a.dob,
          previousClass: a.previousClass || (a as any).previous_class,
          boardRollNo: a.boardRollNo || (a as any).board_roll_no,
          previousMarks: a.previousMarks ?? (a as any).previous_marks,
          contact: a.contactNumber || a.contact,
          fatherContact: a.fatherContact || (a as any).father_contact,
          secondaryContact: a.secondaryContact || (a as any).secondary_contact,
          email: a.email,
          bloodGroup: a.bloodGroup,
          concessionReason: a.concessionReason || (a as any).concession_reason,
          address: a.address || '',
          gender: derivedGender,
          category: a.category || 'Inter Part-1 Boys',
          group: a.group || 'Pending',
          section: a.section || 'A',
          photo: a.photo || a.photoUrl || (a as any).photo_url || '',
          attendance: { present: 0, absent: 0 },
          feeHistory: a.feeHistory || [],
          feeLedger: a.feeLedger ? a.feeLedger : { 
            totalPackage: a.totalPackage || 0, 
            totalReceived: a.feeReceived || 0, 
            remainingBalance: (a.totalPackage || 0) - (a.feeReceived || 0), 
            transactions: a.feeReceived > 0 ? [{
              id: `tx-initial-${a.id}`,
              date: a.date?.split('T')[0] || new Date().toISOString().split('T')[0],
              amount: a.feeReceived,
              description: 'Initial Admission Payment',
              paymentMethod: 'Cash',
              receiptId: `REC-${a.id.slice(-6)}`
            }] : [], 
            installments: [] 
          },
          subjects: a.subjects || [],
          admissionFee: a.admissionFee || 0,
          miscFunds: a.miscFunds || 0,
          totalFeeFinalized: a.totalFeeFinalized || 0,
          totalInstallments: a.totalInstallments || 12,
          monthlyFee: Math.round((a.totalPackage || 0) / (a.totalInstallments || 12)),
          totalPackage: a.totalPackage || 0,
          feeReceived: a.feeReceived || 0,
          session: a.session,
          sessionStartDate: a.sessionStartDate,
          sessionEndDate: a.sessionEndDate,
          academicPart: a.academicPart || 'Part-1',
          programType: a.programType || 'Yearly',
          currentSemester: a.currentSemester || 0
        } as any);
      }
    });

    // Filter by Gender and Program
    const searchClean = (debouncedSearch || '').trim().toLowerCase();
    return rawStudents.filter((s: any) => {
      let matchesGender = true;
      if (genderFilter !== 'all') matchesGender = s.gender === genderFilter;
      
      let matchesProgram = true;
      // When searching by text, allow cross-program match so student isn't hidden by active group tab
      if (!searchClean && programFilter !== 'all') {
        const sGroup = (s.group || '').toLowerCase();
        const sCategory = (s.category || '').toLowerCase();
        const identifier = `${sGroup} ${sCategory}`;
        const pFilter = programFilter.toLowerCase();
        
        const isDIT = sGroup.includes('dit') || sGroup.includes('diploma') || sCategory.includes('dit') || sCategory.includes('diploma');
        const isBS = sGroup.includes('bs') || sGroup.includes('b.s') || sCategory.includes('bs');
        const isUKL3 = sGroup.includes('uk') || sGroup.includes('l3') || sGroup.includes('level 3') || sCategory.includes('uk');

        if (pFilter === 'fsc') {
           matchesProgram = !isDIT && !isBS && !isUKL3;
        } else if (pFilter === 'dit' || pFilter.includes('diploma')) {
           matchesProgram = isDIT;
        } else if (pFilter === 'bs' || pFilter.includes('b.s')) {
           matchesProgram = isBS;
        } else if (pFilter === 'ukl3' || pFilter.includes('uk') || pFilter.includes('level 3')) {
           matchesProgram = isUKL3;
        } else {
           matchesProgram = identifier.includes(pFilter);
        }
      }
      // Academic Stage / Part / Semester filter
      let matchesStage = true;
      if (academicStageFilter !== 'all') {
        const studentPart = (s.academicPart || s.academic_part || '').toLowerCase();
        const studentSem = Number(s.currentSemester || s.current_semester || 0);
        if (academicStageFilter === 'part1') {
          matchesStage = studentPart.includes('part-1') || studentPart.includes('1st') || (!studentPart && studentSem === 0);
        } else if (academicStageFilter === 'part2') {
          matchesStage = studentPart.includes('part-2') || studentPart.includes('2nd');
        } else if (academicStageFilter.startsWith('sem')) {
          matchesStage = studentSem === Number(academicStageFilter.replace('sem', ''));
        } else if (academicStageFilter === 'yr1') {
          matchesStage = studentSem <= 2 || studentPart.includes('1st') || studentPart.includes('part-1');
        } else if (academicStageFilter === 'yr2') {
          matchesStage = (studentSem >= 3 && studentSem <= 4) || studentPart.includes('2nd') || studentPart.includes('part-2');
        } else if (academicStageFilter === 'yr3') {
          matchesStage = studentSem >= 5 || studentPart.includes('3rd') || studentPart.includes('part-3');
        }
      }

      return matchesGender && matchesProgram && matchesStage;
    });
  }, [data.students, data.admissions, genderFilter, programFilter, debouncedSearch, academicStageFilter]);

  const sectionOptions = React.useMemo(() => {
    let sections = data?.settings?.predefinedSections || [];
    
    // Filter by gender if selected
    if (genderFilter !== "all") {
      sections = sections.filter((s: any) => s.gender === genderFilter || !s.gender);
    }
    
    // Filter by group if selected
    const pFilter = programFilter.toLowerCase();
    if (pFilter !== "all") {
      sections = sections.filter((s: any) => {
        const pg = (s.program || "").toLowerCase();
        const isDIT = pg.includes("dit") || pg.includes("diploma");
        const isBS = pg.includes("bs") || pg.includes("b.s");
        const isUKL3 = pg.includes("uk") || pg.includes("level 3") || pg.includes("l3");
        
        if (pFilter === "fsc") {
          return !isDIT && !isBS && !isUKL3;
        } else if (pFilter === "dit" || pFilter.includes("diploma")) {
          return isDIT;
        } else if (pFilter === "bs" || pFilter.includes("b.s")) {
          return isBS;
        } else if (pFilter === "ukl3" || pFilter.includes("uk") || pFilter.includes("level 3")) {
           return isUKL3;
        } else {
          return pg.includes(pFilter);
        }
      });
    }

    const predefinedNames = sections.map((s: any) => s.name).filter(Boolean);
    const activeStudentSections = (mergedStudents || [])
      .filter((s: any) => {
        if (genderFilter !== "all" && s.gender && s.gender !== genderFilter) return false;
        return true;
      })
      .map((s: any) => (s.section || '').trim())
      .filter((sec: string) => sec && sec !== '-' && sec.toLowerCase() !== 'unassigned');

    return Array.from(new Set([...predefinedNames, ...activeStudentSections])).sort() as string[];
  }, [data?.settings?.predefinedSections, programFilter, genderFilter, mergedStudents]);

  const photoStats = React.useMemo(() => {
    const withPhoto = (mergedStudents || []).filter((s: any) => Boolean(s.photo && String(s.photo).trim())).length;
    const missingPhoto = (mergedStudents || []).length - withPhoto;
    return { withPhoto, missingPhoto, total: (mergedStudents || []).length };
  }, [mergedStudents]);

  const filteredStudents = React.useMemo(() => {
    const searchClean = (debouncedSearch || '').trim().toLowerCase();
    return mergedStudents.filter((s: any) => {
      const matchesSearch =
        !searchClean ||
        (s.fullName || '').toLowerCase().includes(searchClean) || 
        (s.id || '').toLowerCase().includes(searchClean) ||
        (s.fatherName || '').toLowerCase().includes(searchClean) ||
        String(s.collegeNo || s.college_no || '').toLowerCase().includes(searchClean) ||
        String(s.contact || s.contactNumber || '').includes(searchClean) ||
        String(s.fatherContact || '').includes(searchClean) ||
        String(s.bayFormNo || '').includes(searchClean);
      
      // Monthly fee status for current month (March 2026 for demo)
      const currentMonthPayment = s.feeHistory.find((f: any) => f.month === 'March' && f.year === 2026);
      const matchesFee = monthlyFeeFilter === 'all' || 
                        (monthlyFeeFilter === 'Paid' && currentMonthPayment?.status === 'Paid') ||
                        (monthlyFeeFilter === 'Partial' && currentMonthPayment?.status === 'Partial') ||
                        (monthlyFeeFilter === 'Unpaid' && (!currentMonthPayment || currentMonthPayment.status === 'Unpaid'));

      // Defaulter logic
      const unpaidMonths = s.feeHistory.filter((f: any) => f.status === 'Unpaid').length;
      const matchesDefaulter = defaulterFilter === 'all' ||
                              (defaulterFilter === '1' && unpaidMonths === 1) ||
                              (defaulterFilter === '2' && unpaidMonths === 2) ||
                              (defaulterFilter === '3' && unpaidMonths >= 3) ||
                              (defaulterFilter === '4' && unpaidMonths >= 4);

      const matchesSubject = subjectFilter === 'all' || (s.subjects || []).includes(subjectFilter);

      const matchesSection = sectionFilter === 'all' || (s.section || '').trim().toLowerCase() === sectionFilter.trim().toLowerCase();

      // Photo presence filter
      const matchesPhoto = 
        photoFilter === 'all' ||
        (photoFilter === 'with-photo' && Boolean(s.photo && String(s.photo).trim())) ||
        (photoFilter === 'missing-photo' && (!s.photo || !String(s.photo).trim()));

      return matchesSearch && matchesFee && matchesDefaulter && matchesSubject && matchesSection && matchesPhoto;
    });
  }, [mergedStudents, debouncedSearch, monthlyFeeFilter, defaulterFilter, subjectFilter, sectionFilter, photoFilter]);

  // Handle pagination for better performance
  const ITEMS_PER_PAGE = 30;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);

  // Reset pagination when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, monthlyFeeFilter, defaulterFilter, subjectFilter, sectionFilter, photoFilter]);

  const visibleStudents = React.useMemo(
    () => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      return filteredStudents.slice(start, end);
    },
    [filteredStudents, currentPage],
  );

  const getDefaulterBadge = (student: Student) => {
    const unpaidMonths = student.feeHistory.filter(f => f.status === 'Unpaid').length;
    if (unpaidMonths >= 4) return <Badge className="bg-red-900 text-white border-red-950">Serious Defaulter (4+)</Badge>;
    if (unpaidMonths >= 2) return <Badge className="bg-red-100 text-red-700 border-red-200">Defaulter ({unpaidMonths}m)</Badge>;
    return null;
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s: Student) => s.id));
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    const title = `Students List - ${programFilter !== 'all' ? programFilter : 'All Programs'} ${sectionFilter !== 'all' ? '- Section ' + sectionFilter : ''}`;
    doc.text(title, 40, 40);
    
    autoTable(doc, {
      startY: 50,
      head: [['ID', 'Name', 'Father Name', 'Gender', 'Group', 'Class', 'Section', 'Contact']],
      body: filteredStudents.map((s: any) => [
        s.id,
        isNewStudent(s) ? `${s.fullName} [NEW]` : s.fullName,
        s.fatherName,
        s.gender,
        s.group,
        s.category,
        s.section || 'N/A',
        s.parentContact || 'N/A'
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [5, 59, 50], textColor: [255, 255, 255] }
    });
    
    doc.save(`Students_Export_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredStudents.map((s: any) => ({
      'ID': s.id,
      'Name': isNewStudent(s) ? `${s.fullName} [NEW]` : s.fullName,
      'Father Name': s.fatherName,
      'DOB': s.dob || 'N/A',
      'Gender': s.gender,
      'Group': s.group,
      'Class': s.category,
      'Section': s.section || 'N/A',
      'Session': s.session || 'N/A',
      'Parent Contact': s.parentContact || 'N/A',
      'Address': s.address || 'N/A',
      'Blood Group': s.bloodGroup || 'N/A',
      'Admission Date': s.admissionDate || 'N/A'
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `Students_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    setDialogType('bulkDelete');
  };

  // Universal WhatsApp Broadcast Modal state
  const [isBulkWhatsAppModalOpen, setIsBulkWhatsAppModalOpen] = useState(false);
  const [bulkModalProps, setBulkModalProps] = useState<{
    title: string;
    subtitle?: string;
    items: ReportRecipientItem[];
  }>({
    title: '',
    subtitle: '',
    items: []
  });

  const handleSendSingleStudentWhatsApp = async (student: Student) => {
    const defaultNotice = {
      title: "Academic & Campus Circular Notice",
      content: "Assalam-o-Alaikum, Baraye meherbani apne bache ke latest attendance, marks, aur fee dossier ke liye online student portal review karein. Regular class attendance yaqeeni banayein."
    };
    await sendAutoStudentNotice(student, defaultNotice, data?.settings);
  };

  const handleOpenBulkWhatsAppModal = (targetStudentIds?: string[]) => {
    const list = targetStudentIds && targetStudentIds.length > 0
      ? mergedStudents.filter((s: Student) => targetStudentIds.includes(s.id))
      : filteredStudents;

    if (list.length === 0) {
      toast.error("No students available to broadcast.");
      return;
    }

    const defaultTitle = "Important Institutional Circular";
    const defaultContent = "Assalam-o-Alaikum, Tamam parents se guzarish hai ke rozana attendance aur class lectures ki pabandi barwaqt yaqeeni banayein. Mazeed tafseelat ke liye online student portal check karein.";

    const items: ReportRecipientItem[] = list.map((s: Student) => {
      const msg = buildStudentNoticeMessage(s, { title: defaultTitle, content: defaultContent }, data?.settings);
      const rollNo = s.collegeNo || s.studentId || s.id || "N/A";
      return {
        id: s.id,
        student: s,
        name: s.fullName,
        phone: s.fatherContact || s.contact || s.phone || s.mobile || "",
        rollNo,
        className: `${s.group || ''} (Sec: ${s.section || 'A'})`,
        message: msg,
        statusBadge: s.gender || "Student",
      };
    });

    setBulkModalProps({
      title: "Broadcast Student Circular (WhatsApp)",
      subtitle: `Target: ${items.length} Students (${genderFilter === 'all' ? 'All Campuses' : genderFilter === 'Male' ? 'Boys Campus' : 'Girls Campus'}, Sec: ${sectionFilter})`,
      items
    });
    setIsBulkWhatsAppModalOpen(true);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Ultra-Compact High-Density Header & Filter Ribbon (< 85px total height) */}
      <div className="space-y-2 mb-3">
        {/* Row 1: Title + Urdu + Group Pills + Actions & Export */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5 shrink-0">
              <span>{gender === 'Male' ? 'Boys Campus' : gender === 'Female' ? 'Girls Campus' : 'Student Records'}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-superior-teal/10 text-superior-teal border border-superior-teal/20">
                {filteredStudents.length}
              </span>
            </h3>

            <span className="urdu-text font-nastaleeq text-xs text-superior-gold hidden sm:inline shrink-0">
              {gender === 'Male' ? 'بوائز کیمپس' : gender === 'Female' ? 'گرلز کیمپس' : 'طلباء کا ریکارڈ'}
            </span>

            {/* Inline Educational Stream Filter Pills */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 gap-0.5">
              {[
                { id: 'all', label: 'All Streams' },
                { id: 'fsc', label: 'FSc (2-Yr)' },
                { id: 'dit', label: 'DIT (3-Yr)' },
                { id: 'bs', label: 'BS (4-Yr SS4)' },
                { id: 'ukl3', label: 'UK Level 3' },
              ].map(prog => (
                <button
                  key={prog.id}
                  type="button"
                  onClick={() => {
                    setProgramFilter(prog.id);
                    setAcademicStageFilter('all');
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    programFilter === prog.id
                      ? "bg-white dark:bg-slate-700 text-superior-teal dark:text-superior-gold shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {prog.label}
                </button>
              ))}
            </div>

            {/* Dynamic Academic Stage Sub-Pills */}
            {programFilter === 'fsc' && (
              <div className="hidden sm:flex items-center bg-emerald-50/80 dark:bg-emerald-950/40 p-0.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 gap-0.5">
                {[
                  { id: 'all', label: 'All FSc' },
                  { id: 'part1', label: 'Part-1 Fresh (1st Year)' },
                  { id: 'part2', label: 'Part-2 Senior (2nd Year)' },
                ].map(stg => (
                  <button
                    key={stg.id}
                    type="button"
                    onClick={() => setAcademicStageFilter(stg.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      academicStageFilter === stg.id
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-emerald-800 dark:text-emerald-300 hover:text-emerald-950"
                    )}
                  >
                    {stg.label}
                  </button>
                ))}
              </div>
            )}

            {programFilter === 'bs' && (
              <div className="hidden sm:flex items-center bg-indigo-50/80 dark:bg-indigo-950/40 p-0.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 gap-0.5 overflow-x-auto max-w-[340px]">
                <button
                  type="button"
                  onClick={() => setAcademicStageFilter('all')}
                  className={cn(
                    "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0",
                    academicStageFilter === 'all' ? "bg-indigo-600 text-white shadow-2xs" : "text-indigo-800 dark:text-indigo-300"
                  )}
                >
                  All (8)
                </button>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <button
                    key={`sem${sem}`}
                    type="button"
                    onClick={() => setAcademicStageFilter(`sem${sem}`)}
                    className={cn(
                      "px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer shrink-0",
                      academicStageFilter === `sem${sem}` ? "bg-indigo-600 text-white shadow-2xs" : "text-indigo-700 dark:text-indigo-300 hover:text-indigo-950"
                    )}
                  >
                    S{sem}
                  </button>
                ))}
              </div>
            )}

            {programFilter === 'dit' && (
              <div className="hidden sm:flex items-center bg-teal-50/80 dark:bg-teal-950/40 p-0.5 rounded-xl border border-teal-200/80 dark:border-teal-800/60 gap-0.5">
                {[
                  { id: 'all', label: 'All DIT' },
                  { id: 'yr1', label: '1st Year' },
                  { id: 'yr2', label: '2nd Year' },
                  { id: 'yr3', label: '3rd Year' },
                ].map(stg => (
                  <button
                    key={stg.id}
                    type="button"
                    onClick={() => setAcademicStageFilter(stg.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      academicStageFilter === stg.id
                        ? "bg-teal-600 text-white shadow-2xs"
                        : "text-teal-800 dark:text-teal-300 hover:text-teal-950"
                    )}
                  >
                    {stg.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button 
              onClick={handleExportPDF} 
              variant="outline" 
              size="sm"
              className="h-7.5 px-2.5 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-rose-600 hover:bg-rose-50 font-bold text-[10px] uppercase gap-1"
            >
              <Download size={12} className="text-rose-500" /> PDF
            </Button>
            <Button 
              onClick={handleExportExcel} 
              variant="outline" 
              size="sm"
              className="h-7.5 px-2.5 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-600 hover:bg-emerald-50 font-bold text-[10px] uppercase gap-1"
            >
              <Download size={12} className="text-emerald-500" /> Excel
            </Button>
            <Button 
              onClick={() => handleOpenBulkWhatsAppModal()} 
              size="sm"
              className="h-7.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase gap-1 shadow-2xs"
            >
              <MessageSquare size={12} /> WhatsApp Broadcast
            </Button>

            {/* Grid / List View Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 ml-1">
              <button
                type="button"
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  viewMode === 'grid' ? "bg-white dark:bg-slate-700 text-superior-teal shadow-2xs" : "text-slate-400 hover:text-slate-600"
                )}
                onClick={() => setViewMode('grid')}
              >
                Grid
              </button>
              <button
                type="button"
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  viewMode === 'list' ? "bg-white dark:bg-slate-700 text-superior-teal shadow-2xs" : "text-slate-400 hover:text-slate-600"
                )}
                onClick={() => setViewMode('list')}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Search + Photo Status Filter Pills + Dropdown Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
            {/* Compact Search Box */}
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input 
                placeholder="Search name, roll no, father..." 
                className="pl-8 h-7.5 text-xs rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Photo Filter Pills */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setPhotoFilter("all")}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1",
                  photoFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                )}
              >
                <span>All</span>
                <span className="text-[9px] px-1 py-0.1 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono">
                  {photoStats.total}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPhotoFilter("with-photo")}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1",
                  photoFilter === "with-photo" ? "bg-emerald-600 text-white" : "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
                )}
              >
                <Camera size={11} />
                <span>Photos ({photoStats.withPhoto})</span>
              </button>
              <button
                type="button"
                onClick={() => setPhotoFilter("missing-photo")}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1",
                  photoFilter === "missing-photo" ? "bg-amber-600 text-white" : "text-amber-700 dark:text-amber-300 hover:bg-amber-50"
                )}
              >
                <AlertCircle size={11} />
                <span>Missing ({photoStats.missingPhoto})</span>
              </button>
            </div>
          </div>

          {/* Compact Dropdown Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="h-7.5 text-[11px] rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 w-[110px]">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs">All Sections</SelectItem>
                {sectionOptions.map(sec => (
                  <SelectItem key={sec} value={sec} className="text-xs">{sec}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="h-7.5 text-[11px] rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 w-[105px]">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs">All Genders</SelectItem>
                <SelectItem value="Male" className="text-xs">Boys Only</SelectItem>
                <SelectItem value="Female" className="text-xs">Girls Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={monthlyFeeFilter} onValueChange={setMonthlyFeeFilter}>
              <SelectTrigger className="h-7.5 text-[11px] rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 w-[125px]">
                <SelectValue placeholder="Monthly Fee" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs">All Fee Status</SelectItem>
                <SelectItem value="Paid" className="text-xs text-emerald-600">Paid This Month</SelectItem>
                <SelectItem value="Partial" className="text-xs text-orange-600">Partial Paid</SelectItem>
                <SelectItem value="Unpaid" className="text-xs text-rose-600">Not Paid</SelectItem>
              </SelectContent>
            </Select>

            <Select value={defaulterFilter} onValueChange={setDefaulterFilter}>
              <SelectTrigger className="h-7.5 text-[11px] rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 w-[125px]">
                <SelectValue placeholder="Defaulter Filter" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs">All Students</SelectItem>
                <SelectItem value="1" className="text-xs text-orange-500">Defaulter 1 Month</SelectItem>
                <SelectItem value="2" className="text-xs text-orange-600">Defaulter 2 Months</SelectItem>
                <SelectItem value="3" className="text-xs text-rose-600">Defaulter 3+ Months</SelectItem>
                <SelectItem value="4" className="text-xs text-red-700 font-bold">Serious (4+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedStudents.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-2 z-30 flex items-center justify-between p-3 bg-superior-teal rounded-2xl shadow-xl text-white mb-3 border border-white/10"
        >
          <div className="flex items-center gap-3 pl-1">
            <Checkbox 
              checked={selectedStudents.length === filteredStudents.length} 
              onCheckedChange={toggleSelectAll} 
              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-superior-teal"
            />
            <div className="flex flex-col">
              <p className="text-xs font-black uppercase tracking-wider">
                {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
              </p>
              {selectedStudents.length < filteredStudents.length && (
                <button 
                  onClick={() => setSelectedStudents(filteredStudents.map(s => s.id))}
                  className="text-[9px] font-black underline uppercase opacity-75 hover:opacity-100 text-left"
                >
                  Select all {filteredStudents.length} matching students
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button 
              onClick={() => handleOpenBulkWhatsAppModal(selectedStudents)}
              size="sm"
              className="h-8 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-[9px] uppercase tracking-wider px-3 shadow-sm gap-1 flex items-center"
            >
              <MessageSquare size={12} /> WhatsApp ({selectedStudents.length})
            </Button>
            <Button 
              onClick={() => setDialogType('bulk_promote')}
              size="sm"
              className="h-8 rounded-xl bg-superior-gold text-slate-900 hover:bg-superior-gold/90 font-bold text-[9px] uppercase tracking-wider px-3 shadow-sm gap-1"
            >
              <GraduationCap size={12} /> Promote Part-2
            </Button>
            <Button 
              onClick={() => setDialogType('migrate_section')}
              size="sm"
              className="h-8 rounded-xl bg-white/20 text-white hover:bg-white/30 border border-white/20 font-bold text-[9px] uppercase tracking-wider px-3 gap-1"
            >
              <School size={12} /> Migrate Section
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedStudents([])}
              className="h-8 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 font-bold text-[9px] uppercase tracking-wider px-3"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkDelete}
              variant="destructive" 
              size="sm"
              className="h-8 rounded-xl bg-white text-rose-600 hover:bg-rose-50 font-bold text-[9px] uppercase tracking-wider px-3 shadow-sm"
            >
              <Trash2 size={12} className="mr-1" /> Delete
            </Button>
          </div>
        </motion.div>
      )}

      {/* Students View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 lg:gap-4.5">
          {visibleStudents.map((student: Student) => {
            const isViaBot = (student.reference || '').toLowerCase().includes('whatsapp') || 
              (student.notes && JSON.stringify(student.notes).toLowerCase().includes('whatsapp')) ||
              (student.admissionId && (data.admissions || []).some((a: any) => (a.id === student.admissionId || a.studentId === student.id) && (a.reference || '').toLowerCase().includes('whatsapp')));
            
            const totalAtt = (student.attendance?.present || 0) + (student.attendance?.absent || 0);
            const attPercent = totalAtt > 0 ? Math.round(((student.attendance?.present || 0) / totalAtt) * 100) : 0;
            const balK = (Math.max(0, (student.totalPackage || 0) - (student.feeReceived || (student.feeLedger?.totalReceived || 0))) / 1000).toFixed(1);

            return (
              <motion.div
                key={student.id}
                whileHover={{ y: -3 }}
                className={cn(
                  "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-superior-teal/50 transition-all duration-200 overflow-hidden relative group shadow-xs hover:shadow-md flex flex-col justify-between",
                  selectedStudents.includes(student.id) && "ring-2 ring-superior-teal"
                )}
              >
                {/* Top Header Strip with Monospace Roll No & Fast Actions */}
                <div className="px-3 py-2 flex items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/30">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Checkbox 
                      checked={selectedStudents.includes(student.id)} 
                      onCheckedChange={() => toggleSelectStudent(student.id)}
                      className="rounded-md"
                    />
                    <span className="text-[10px] font-mono font-black text-superior-gold tracking-wider truncate">
                      {student.id}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                      {student.academicPart || 'Part-1'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {getDefaulterBadge(student)}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Send WhatsApp Circular"
                      className="h-6.5 w-6.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 p-0" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendSingleStudentWhatsApp(student);
                      }}
                    >
                      <MessageSquare size={12} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="View Student Profile"
                      className="h-6.5 w-6.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-0" 
                      onClick={() => {
                        setSelectedStudent(student);
                        setDialogType('profile');
                      }}
                    >
                      <Eye size={12} />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-6.5 w-6.5 flex-shrink-0 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center outline-hidden">
                        <MoreHorizontal size={13} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[200px] border-slate-100 shadow-2xl">
                        <DropdownMenuItem 
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-emerald-600 hover:bg-emerald-50" 
                          onClick={() => handleSendSingleStudentWhatsApp(student)}
                        >
                          <MessageSquare size={16} /> Send WhatsApp Circular
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700" 
                          onClick={() => {
                            setSelectedStudent(student);
                            setDialogType('profile_academic');
                          }}
                        >
                          <Award size={16} className="text-emerald-500" /> Academic Records
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700" 
                          onClick={() => {
                            setSelectedStudent(student);
                            setDialogType('profile_fees');
                          }}
                        >
                          <Wallet size={16} className="text-superior-gold" /> Fee Statement
                        </DropdownMenuItem>
                        <Separator className="my-2 bg-slate-50" />
                        <DropdownMenuItem 
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700" 
                          onClick={() => {
                            setSelectedStudent(student);
                            setDialogType('id_card');
                          }}
                        >
                          <CreditCard size={16} className="text-emerald-500" /> Official ID Card
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700" 
                          onClick={() => {
                            setSelectedStudent(student);
                            setDialogType('receipt');
                          }}
                        >
                          <Download size={16} className="text-superior-teal" /> Download Receipt
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-teal-600 hover:bg-teal-50" 
                          onClick={() => {
                            setPhotoEditorStudent(student);
                            setIsPhotoEditorOpen(true);
                          }}
                        >
                          <Camera size={16} /> Crop & Edit Photo
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700" 
                          onClick={() => {
                            setSelectedStudent(student);
                            setDialogType('edit');
                          }}
                        >
                          <Edit size={16} className="text-slate-400" /> Edit Details
                        </DropdownMenuItem>
                        <Separator className="my-2 bg-slate-50" />
                        <DropdownMenuItem 
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-rose-600 hover:bg-rose-50"
                          onClick={() => {
                            setSelectedStudent(student);
                            setDialogType('delete');
                          }}
                        >
                          <Trash2 size={16} /> Delete Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Identity Block: Modern Avatar & Names */}
                <div className="p-3 pb-2 flex items-start gap-2.5">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoEditorStudent(student);
                      setIsPhotoEditorOpen(true);
                    }}
                    className="w-13 h-13 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-xs flex items-center justify-center shrink-0 cursor-pointer relative group/avatar"
                    title="Click to Crop & Edit Photo (Passport Studio)"
                  >
                    {student.photo ? (
                      <img 
                        src={student.photo} 
                        alt="" 
                        className="w-full h-full object-cover object-top" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-teal-50 dark:bg-teal-950/40 text-superior-teal font-black text-base">
                        {student.fullName ? student.fullName.charAt(0).toUpperCase() : 'S'}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                      <Camera size={14} className="text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 
                      onClick={() => { setSelectedStudent(student); setDialogType('profile'); }}
                      className="font-black text-slate-900 dark:text-white text-sm tracking-tight truncate hover:text-superior-teal cursor-pointer transition-colors flex items-center gap-1.5" 
                      title={student.fullName}
                    >
                      <HighlightText text={student.fullName} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                      {isNewStudent(student) && (
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-wider bg-emerald-500 text-white px-1.5 py-0.5 rounded-full shadow-2xs">
                          NEW
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                      S/D: <HighlightText text={student.fatherName} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                    </p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="text-[9px] font-bold text-superior-teal bg-superior-teal/10 px-1.5 py-0.5 rounded-md truncate max-w-[130px]" title={student.category}>
                        {student.category}
                      </span>
                      {student.section && (
                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                          Sec {student.section}
                        </span>
                      )}
                      {isViaBot && (
                        <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded">
                          🤖 Bot
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prominent Biometric Status Strip (Matches Staff Directory) */}
                <div className="px-3 py-1.5 border-y border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FingerprintThumbnail
                      personId={student.id}
                      altId={student.studentId || student.collegeNo}
                      template={student.fingerprintTemplate}
                      size="xs"
                      fingerLabel={student.fingerprintFinger || "Right Thumb"}
                      allowInspect={true}
                    />
                    <span className={cn(
                      "text-[10px] font-bold truncate",
                      student.fingerprintTemplate ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                    )}>
                      {student.fingerprintTemplate ? "Thumb Enrolled" : "Thumb Missing"}
                    </span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBiometricTargetStudent(student);
                      setIsBiometricModalOpen(true);
                    }}
                    className={cn(
                      "h-6 px-2.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all shrink-0",
                      student.fingerprintTemplate
                        ? "bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-amber-500 hover:bg-amber-600 text-white shadow-2xs"
                    )}
                  >
                    {student.fingerprintTemplate ? "Manage" : "Scan"}
                  </Button>
                </div>

                {/* Key Metrics: Attendance & Fee / Balance */}
                <div className="px-3 py-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-1.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Attendance</p>
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {attPercent}% Present
                    </p>
                  </div>
                  <div className="p-1.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Installment</p>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="font-bold text-slate-800 dark:text-white text-xs truncate">Rs. {(student.monthlyFee || 0).toLocaleString()}</span>
                      <span className="text-[9px] font-bold text-rose-500 shrink-0">Bal:{balK}k</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Direct Printable Action Buttons */}
                <div className="p-2.5 pt-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedStudent(student);
                      setDialogType('id_card');
                    }}
                    className="flex-1 h-7 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border-emerald-200/70 font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95 px-1"
                    title="Print Student ID Card"
                  >
                    <CreditCard size={11} className="text-emerald-600 shrink-0" />
                    ID Card
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedStudent(student);
                      setDialogType('receipt');
                    }}
                    className="flex-1 h-7 rounded-xl bg-teal-50/80 hover:bg-teal-100 text-teal-700 hover:text-teal-800 border-teal-200/70 font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95 px-1"
                    title="Download Fee Receipt"
                  >
                    <Receipt size={11} className="text-teal-600 shrink-0" />
                    Receipt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedStudent(student);
                      setDialogType('profile_fees');
                    }}
                    className="flex-1 h-7 rounded-xl bg-amber-50/80 hover:bg-amber-100 text-amber-800 hover:text-amber-900 border-amber-200/70 font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95 px-1"
                    title="Fee Statement & Vouchers"
                  >
                    <Wallet size={11} className="text-amber-700 shrink-0" />
                    Statement
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden auto-mx-4">
          <Table>
            <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 sticky top-0 z-10 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
              <TableRow className="border-none">
                <TableHead className="w-[50px] pl-6"></TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Student Details</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Program/Class</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Section</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Subjects</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Contact Info</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Total Package</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Balance</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {visibleStudents.map((student: Student) => (
                  <TableRow key={student.id} className="group cursor-pointer hover:bg-slate-50/50" onClick={() => { setSelectedStudent(student); setDialogType('profile'); }}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                         <Checkbox 
                           checked={selectedStudents.includes(student.id)} 
                           onCheckedChange={() => toggleSelectStudent(student.id)}
                         />
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-3">
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoEditorStudent(student);
                                setIsPhotoEditorOpen(true);
                              }}
                              className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 border-2 border-slate-200 shadow-sm cursor-pointer relative group ring-2 ring-superior-teal/15"
                              title="Click to Crop & Edit Photo (AI Studio)"
                            >
                              {student.photo ? (
                                <img src={student.photo} alt="" className="w-full h-full object-cover object-[center_top] rounded-full group-hover:opacity-75 transition-opacity" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-lg bg-slate-200 rounded-full group-hover:bg-slate-300 transition-colors">{student.fullName ? student.fullName.charAt(0).toUpperCase() : 'S'}</div>
                              )}
                              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera size={16} className="text-white" />
                              </div>
                            </div>
                           <div className="flex flex-col">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-black text-slate-900 group-hover:text-superior-teal transition-colors tracking-tight">{student.fullName}</span>
                                {isNewStudent(student) && (
                                  <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500 text-white px-1.5 py-0.5 rounded-full shadow-2xs">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-[10px] font-black text-superior-gold uppercase tracking-widest">{student.id}</span>
                                {((student.reference || '').toLowerCase().includes('whatsapp') || 
                                  (student.notes && JSON.stringify(student.notes).toLowerCase().includes('whatsapp')) ||
                                  (student.admissionId && (data.admissions || []).some((a: any) => (a.id === student.admissionId || a.studentId === student.id) && (a.reference || '').toLowerCase().includes('whatsapp')))) && (
                                  <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded flex items-center gap-0.5 shadow-2xs">
                                    🤖 Via WhatsApp Bot
                                  </span>
                                )}
                              </div>
                              {student.bloodGroup && (
                                <span className="text-[8px] mt-1 px-1 py-0.5 w-fit rounded-[4px] bg-red-50 text-red-600 font-bold flex items-center gap-0.5" title="Blood Group">
                                  <Droplet size={8} /> {student.bloodGroup}
                                </span>
                              )}
                           </div>
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col">
                           <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Admitted In</span>
                           <span className="text-xs font-black text-superior-teal max-w-[150px] truncate" title={student.category}>{student.category}</span>
                           <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase max-w-[150px] truncate" title={student.group}>{student.group}</span>
                         </div>
                      </TableCell>
                      <TableCell>
                         <Badge variant="outline" className="text-[10px] text-slate-600 font-bold border-slate-200">
                           {student.section || '-'}
                         </Badge>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-wrap gap-1 max-w-[120px]">
                           {Array.isArray(student.subjects) && student.subjects.length > 0 ? (
                             student.subjects.map((sub: string, i: number) => (
                               <Badge key={i} variant="outline" className="text-[8px] font-black uppercase bg-slate-50 text-slate-500 border-slate-200 px-1 py-0 cursor-help" title={sub}>
                                 {sub === 'Diploma in IT Subjects' ? 'DIT' : sub === 'BS Subjects' ? 'BS' : sub === 'Computer Science' ? 'CS' : sub.substring(0, 3)}
                               </Badge>
                             ))
                           ) : (
                             <span className="text-[10px] text-slate-300">-</span>
                           )}
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-slate-600">
                               <Phone size={10} className="text-slate-400" />
                               <span className="text-[10px] font-black font-mono tracking-tight">{student.contact}</span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                               <User size={10} className="text-slate-400 shrink-0" />
                               <span className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[120px]" title={`Father / Guardian: ${student.fatherName}`}>{student.fatherName.split(' ')[0]}</span>
                            </div>
                            {student.email && (
                             <div className="flex items-center gap-1.5 min-w-0">
                                <Mail size={10} className="text-slate-400 shrink-0" />
                                <span className="text-[9px] font-medium text-slate-500 truncate max-w-[120px]" title={student.email}>{student.email}</span>
                             </div>
                            )}
                            {student.address && (
                             <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin size={10} className="text-slate-400 shrink-0" />
                                <span className="text-[9px] font-medium text-slate-500 truncate max-w-[120px]" title={student.address}>{student.address}</span>
                             </div>
                            )}
                         </div>
                      </TableCell>
                      <TableCell>
                         <span className="text-xs font-black text-emerald-600 block">
                           Rs. {((student.totalPackage) || 0).toLocaleString()}
                         </span>
                      </TableCell>
                      <TableCell>
                         <span className="text-xs font-black text-rose-500 block underline decoration-rose-500/20">
                           Rs. {Math.max(0, (student.totalPackage || 0) - (student.feeReceived || 0)).toLocaleString()}
                         </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                         <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                           {/* Direct 1-Click ID Card */}
                           <Button 
                             onClick={() => { setSelectedStudent(student); setDialogType('id_card'); }} 
                             size="sm" 
                             className="h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200/80 font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 shadow-xs transition-all hover:scale-105 active:scale-95" 
                             title="Print Official Student ID Card"
                           >
                             <CreditCard size={13} className="text-emerald-600 shrink-0" />
                             <span className="hidden xl:inline">ID Card</span>
                           </Button>

                           {/* Direct 1-Click Fee Receipt */}
                           <Button 
                             onClick={() => { setSelectedStudent(student); setDialogType('receipt'); }} 
                             size="sm" 
                             className="h-8 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-800 border border-teal-200/80 font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 shadow-xs transition-all hover:scale-105 active:scale-95" 
                             title="Download Fee Receipt"
                           >
                             <Receipt size={13} className="text-teal-600 shrink-0" />
                             <span className="hidden xl:inline">Receipt</span>
                           </Button>

                           {/* Direct 1-Click Fee Statement & Vouchers */}
                           <Button 
                             onClick={() => { setSelectedStudent(student); setDialogType('profile_fees'); }} 
                             size="sm" 
                             className="h-8 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-900 border border-amber-200/80 font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 shadow-xs transition-all hover:scale-105 active:scale-95" 
                             title="View Fee Statement & Vouchers"
                           >
                             <Wallet size={13} className="text-amber-700 shrink-0" />
                             <span className="hidden xl:inline">Statement</span>
                           </Button>

                           {/* View Profile */}
                           <Button 
                             onClick={() => { setSelectedStudent(student); setDialogType('profile'); }} 
                             variant="ghost" 
                             size="icon" 
                             className="h-8 w-8 text-slate-400 hover:text-superior-teal hover:bg-slate-100 rounded-lg transition-all" 
                             title="View Student 360 Dossier"
                           >
                             <Eye className="h-4 w-4" />
                           </Button>

                           {/* Edit Details */}
                           <Button 
                             onClick={() => { setSelectedStudent(student); setDialogType('edit'); }} 
                             variant="ghost" 
                             size="icon" 
                             className="h-8 w-8 text-slate-400 hover:text-superior-teal hover:bg-slate-100 rounded-lg transition-all" 
                             title="Edit Student Information"
                           >
                             <Edit className="h-4 w-4" />
                           </Button>
                            <Button
                              onClick={() => { setPhotoEditorStudent(student); setIsPhotoEditorOpen(true); }}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                              title="Crop and Edit Photo (AI Studio)"
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                            <div
                              onClick={() => {
                                setBiometricTargetStudent(student);
                                setIsBiometricModalOpen(true);
                              }}
                              className="cursor-pointer"
                              title={
                                student.fingerprintTemplate
                                  ? `Fingerprint Enrolled (${student.fingerprintFinger || 'Thumb'}) — Click to inspect or re-register`
                                  : "Enroll Biometric Fingerprint (SecuGen)"
                              }
                            >
                              <FingerprintThumbnail
                                personId={student.id}
                                altId={student.studentId || student.collegeNo}
                                template={student.fingerprintTemplate}
                                size="xs"
                                fingerLabel={student.fingerprintFinger || "Right Thumb"}
                              />
                            </div>
                         </div>
                      </TableCell>
                  </TableRow>
               ))}
               {visibleStudents.length === 0 && (
                 <TableRow>
                   <TableCell colSpan={8} className="h-32 text-center text-slate-500 font-bold py-12">
                     <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                     No students found matching your filters.
                   </TableCell>
                 </TableRow>
               )}
            </TableBody>
          </Table>
        </div>
      )}

      {mergedStudents.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-slate-100">
          <p className="text-sm font-bold text-slate-500">
            Showing {visibleStudents.length} of {filteredStudents.length} Students {mergedStudents.length !== filteredStudents.length ? `(Total: ${mergedStudents.length})` : ''} 
            {totalPages > 1 && ` | Page ${currentPage} of ${totalPages}`}
          </p>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border-slate-200 text-slate-500 hover:text-superior-teal hover:bg-superior-teal/5 font-bold px-6 h-10 disabled:opacity-50"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl border-slate-200 text-slate-500 hover:text-superior-teal hover:bg-superior-teal/5 font-bold px-6 h-10 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Centralized Dialogs */}
      <Dialog open={dialogType === 'delete'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">Delete Student Record</DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete the record for <span className="font-bold text-slate-800">{selectedStudent?.fullName}</span>? This action is permanent and cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertCircle size={24} />
              </div>
              <p className="text-xs text-red-700 font-medium">Deleting this record will remove all associated attendance, fee history, and academic data from the system.</p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setDialogType(null)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
            <Button variant="destructive" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={() => {
              if (selectedStudent) {
                data.deleteStudent(selectedStudent.id);
                setDialogType(null);
                toast.success("Student record deleted successfully!");
              }
            }}>Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'bulkDelete'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">Bulk Delete Students</DialogTitle>
            <DialogDescription className="text-slate-500">
              You are about to delete <span className="font-bold text-slate-800">{selectedStudents.length}</span> selected student records.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertCircle size={24} />
              </div>
              <p className="text-xs text-red-700 font-medium">This is a bulk action. All selected data will be permanently removed from the database.</p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setDialogType(null)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
            <Button variant="destructive" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={async () => {
              const idsToDelete = [...selectedStudents];
              setDialogType(null);
              setSelectedStudents([]);
              await data.bulkDeleteStudents(idsToDelete);
            }}>Delete All Selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType !== null && dialogType.startsWith('profile')} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-5xl xl:max-w-6xl w-[94vw] max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl">
          {selectedStudent && (
            <StudentProfile 
              student={selectedStudent} 
              data={data} 
              initialTab={dialogType === 'profile_academic' ? 'academic' : dialogType === 'profile_fees' ? 'fees' : 'overview'}
              onEdit={() => setDialogType('edit')}
              onDownloadReceipt={() => setDialogType('receipt')}
              onPrintIDCard={() => setDialogType('id_card')}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'edit'} onOpenChange={(open) => !open && setDialogType(null)}>
        {selectedStudent && (
          <EditStudentDialog 
            student={selectedStudent} 
            data={data} 
            onClose={() => setDialogType(null)} 
            onDelete={() => setDialogType('delete')}
          />
        )}
      </Dialog>

      <Dialog open={dialogType === 'receipt'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] overflow-y-auto p-0 border-none bg-white rounded-3xl">
          {selectedStudent && <FeeReceipt student={selectedStudent} settings={data.settings} />}
        </DialogContent>
      </Dialog>

      {/* Official Student ID Card Modal */}
      <StudentIDCardModal 
        student={selectedStudent} 
        settings={data.settings} 
        open={dialogType === 'id_card'} 
        onOpenChange={(open) => !open && setDialogType(null)} 
      />

      {/* Bulk Promotion to Part-2 Dialog */}
      <Dialog open={dialogType === 'bulk_promote'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-superior-teal flex items-center gap-2">
              <GraduationCap className="text-superior-gold" /> Bulk Promote to Part-2
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Promote <span className="font-bold text-slate-800">{selectedStudents.length}</span> selected student(s) to 2nd Year (Part-2).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-800 font-medium">
              This action updates their academic stage to <strong>Part-2 (2nd Year)</strong> across both Students and Admissions registers in Supabase.
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
                Target Session (Academic Rollover)
              </Label>
              <Input 
                value={targetPromoteSession} 
                onChange={(e) => setTargetPromoteSession(e.target.value)} 
                placeholder="e.g. 2026-28" 
                className="h-12 rounded-xl border-slate-200 font-bold"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogType(null)} className="rounded-xl h-11">
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                await data.bulkPromoteToPart2(selectedStudents, targetPromoteSession);
                setSelectedStudents([]);
                setDialogType(null);
              }} 
              className="bg-superior-teal text-white hover:bg-superior-teal/90 rounded-xl h-11 px-6 font-bold"
            >
              Confirm Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Migration Dialog */}
      <Dialog open={dialogType === 'migrate_section'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-superior-teal flex items-center gap-2">
              <School className="text-superior-teal" /> Section Migration Tool
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Move <span className="font-bold text-slate-800">{selectedStudents.length}</span> student(s) to a different classroom section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
                Destination Section Name
              </Label>
              <Input 
                placeholder="e.g. PMC1B, Med-1, Pre-Eng B" 
                value={targetMigrateSection} 
                onChange={(e) => setTargetMigrateSection(e.target.value.toUpperCase())}
                className="h-12 rounded-xl font-bold uppercase"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogType(null)} className="rounded-xl h-11">
              Cancel
            </Button>
            <Button 
              disabled={!targetMigrateSection.trim()}
              onClick={async () => {
                await data.migrateSection(selectedStudents, targetMigrateSection.trim());
                setSelectedStudents([]);
                setDialogType(null);
              }} 
              className="bg-superior-teal text-white hover:bg-superior-teal/90 rounded-xl h-11 px-6 font-bold"
            >
              Move Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Universal WhatsApp Reporting & Safe Bulk Dispatch Modal */}
      <WhatsAppReportModal
        open={isBulkWhatsAppModalOpen}
        onOpenChange={setIsBulkWhatsAppModalOpen}
        title={bulkModalProps.title}
        subtitle={bulkModalProps.subtitle}
        category="students"
        items={bulkModalProps.items}
        settings={data?.settings}
      />

      {/* Interactive Photo Studio and AI Editor Modal */}
      {photoEditorStudent && (
        <PhotoEditorModal
          isOpen={isPhotoEditorOpen}
          onClose={() => {
            setIsPhotoEditorOpen(false);
            setPhotoEditorStudent(null);
          }}
          initialPhotoUrl={photoEditorStudent.photo}
          studentName={photoEditorStudent.fullName}
          studentId={photoEditorStudent.id}
          admissionId={(photoEditorStudent as any).admissionId}
          onSaveSuccess={(newPhoto) => {
            if (photoEditorStudent) {
              photoEditorStudent.photo = newPhoto;
            }
            if (data?.updateStudent) {
              data.updateStudent(photoEditorStudent.id, { photo: newPhoto });
            }
          }}
        />
      )}
      {/* Biometric Fingerprint Enrollment Modal */}
      {isBiometricModalOpen && (
        <BiometricEnrollmentModal
          isOpen={isBiometricModalOpen}
          onClose={() => {
            setIsBiometricModalOpen(false);
            setBiometricTargetStudent(null);
          }}
          targetPerson={
            biometricTargetStudent
              ? {
                  id: biometricTargetStudent.id,
                  fullName: biometricTargetStudent.fullName,
                  fatherName: biometricTargetStudent.fatherName,
                  collegeNo: biometricTargetStudent.collegeNo,
                  phone: biometricTargetStudent.contact,
                  personType: "student",
                  roleOrGroup: biometricTargetStudent.group,
                  photo: biometricTargetStudent.photo,
                  fingerprintTemplate: biometricTargetStudent.fingerprintTemplate,
                  fingerprintFinger: biometricTargetStudent.fingerprintFinger,
                }
              : null
          }
          studentsList={data?.students || []}
          staffList={data?.staff || []}
          onEnrollmentSaved={(personId, personType, template, finger) => {
            data?.updateFingerprintRecord?.(personId, personType, template, finger);
            data?.fetchData?.(true);
          }}
        />
      )}
    </div>
  );
}

function StudentProfile({ student, data, initialTab = 'overview', onEdit, onDownloadReceipt, onPrintIDCard }: { student: Student, data: any, initialTab?: string, onEdit?: () => void, onDownloadReceipt?: () => void, onPrintIDCard?: () => void }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const totalAttendance = student.attendance.present + student.attendance.absent;
  const attendanceRatio = totalAttendance > 0 ? student.attendance.present / totalAttendance : 0;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const toastId = toast.loading("Processing photo...");
      try {
        const compressedBase64 = await compressImage(file);
        await data.updateStudent(student.id, { photo: compressedBase64 });
        toast.dismiss(toastId);
        toast.success("Photo updated successfully!");
      } catch (err) {
        console.error('Photo upload error:', err);
        toast.dismiss(toastId);
        toast.error("Failed to upload photo.");
      }
    }
  };

  const handleExportStatement = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text('SUPERIOR COLLEGE JAHANIAN', 105, 20, { align: 'center' });
      doc.setFontSize(14);
      doc.text('Official Fee Statement', 105, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Student Name: ${student.fullName}`, 14, 45);
      doc.text(`Roll Number: ${student.id}`, 14, 52);
      doc.text(`Class/Group: ${student.group}`, 14, 59);

      const unified = getUnifiedTransactions(student);
      const rows = unified.map((t: any) => [
        t.date ? new Date(t.date).toLocaleDateString() : '-',
        t.description || '-',
        t.receiptId || '-',
        `Rs. ${(t.amount || 0).toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: 70,
        head: [['Date', 'Description', 'Receipt ID', 'Amount']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [11, 77, 69] } // superior-teal
      });

      doc.setFontSize(10);
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      const totalPaid = unified.reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);
      doc.text(`Total Amount Paid: Rs. ${totalPaid.toLocaleString()}`, 14, finalY + 10);
      const totalPkg = student.totalPackage || 0;
      doc.text(`Total Package: Rs. ${totalPkg.toLocaleString()}`, 14, finalY + 17);
      doc.text(`Remaining Balance: Rs. ${(totalPkg - totalPaid).toLocaleString()}`, 14, finalY + 24);

      doc.save(`Fee_Statement_${student.fullName.replace(/\s+/g, '_')}_${student.id}.pdf`);
      toast.success('Fee statement exported as PDF');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export statement');
    }
  };

  return (
    <div className="w-full">
      <div className="bg-gradient-to-r from-[#064e43] via-[#085a4e] to-[#04332c] p-5 md:p-6 text-white relative">
        <div className="flex flex-col md:flex-row gap-5 md:gap-6 items-center relative z-10">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-2 border-white/30 bg-white/10 backdrop-blur-md overflow-hidden shadow-xl ring-2 ring-white/10 flex items-center justify-center">
              {student.photo ? (
                <img src={student.photo} alt="" className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50">
                  <User size={40} />
                </div>
              )}
            </div>
            <label className="absolute -bottom-1.5 -right-1.5 p-2 bg-superior-gold text-slate-950 rounded-xl cursor-pointer hover:scale-110 active:scale-95 transition-all border-2 border-white shadow-md">
              <Camera size={14} />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          
          <div className="text-center md:text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 bg-superior-gold/20 text-superior-gold border border-superior-gold/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                <GraduationCap size={11} /> Student Profile
              </span>
              {(student as any).fingerprintTemplate ? (
                <div className="inline-flex items-center gap-1.5 bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
                  <FingerprintThumbnail
                    personId={student.id}
                    altId={(student as any).collegeNo || (student as any).studentId}
                    template={(student as any).fingerprintTemplate}
                    fingerLabel={(student as any).fingerprintFinger || "Right Thumb"}
                    size="xs"
                    allowInspect={true}
                  />
                  <span>Thumb Enrolled ({(student as any).fingerprintFinger || "Registered"})</span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  <Fingerprint size={11} className="text-amber-400" />
                  Thumb Missing
                </span>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight truncate">{student.fullName}</h2>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 text-xs opacity-90 mt-1">
              <span className="font-mono font-bold text-superior-gold bg-black/20 px-2 py-0.5 rounded-md">{student.id}</span>
              <span className="opacity-40">•</span>
              <span>Father: <strong>{student.fatherName}</strong></span>
              <span className="opacity-40">•</span>
              <span>{student.academicPart} ({student.session || 'Active'})</span>
              <span className="opacity-40">•</span>
              <span className="text-emerald-300 font-bold">{student.category} - Sec {student.section}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 shrink-0">
            {onPrintIDCard && (
              <Button 
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded-xl h-8.5 px-3 text-xs shadow-xs gap-1.5"
                onClick={onPrintIDCard}
              >
                <CreditCard size={14} /> ID Card
              </Button>
            )}
            <Button 
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold rounded-xl h-8.5 px-3 text-xs"
              onClick={onDownloadReceipt}
            >
              <Download size={14} className="mr-1.5" /> Receipt
            </Button>
            <Button 
              size="sm"
              className="bg-superior-gold text-slate-950 hover:bg-superior-gold/90 font-bold rounded-xl h-8.5 px-3 text-xs shadow-xs"
              onClick={onEdit}
            >
              <Edit size={14} className="mr-1.5" /> Edit
            </Button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
      </div>

      <div className="p-5 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="inline-flex w-auto mb-5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="overview" className="px-5 py-1.5 text-xs font-bold rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-xs">Overview</TabsTrigger>
            <TabsTrigger value="fees" className="px-5 py-1.5 text-xs font-bold rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-xs">Fee History</TabsTrigger>
            <TabsTrigger value="academic" className="px-5 py-1.5 text-xs font-bold rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-xs">Academic</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <InfoCard title="Academic Stage" value={student.academicPart || 'Part-1'} icon={GraduationCap} />
              <InfoCard title="Session" value={student.session || 'N/A'} icon={Calendar} />
              <InfoCard title="Category" value={student.category} icon={GraduationCap} />
              <InfoCard title="Section" value={student.section} icon={Filter} />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-black text-superior-teal flex items-center gap-2">
                <CreditCard size={18} /> Financial Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tuition Fee</p>
                  <p className="text-xl font-display font-black text-slate-700">Rs. {(student.totalFeeFinalized || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Misc Funds</p>
                  <p className="text-xl font-display font-black text-slate-700">Rs. {(student.miscFunds || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Admission Fee</p>
                  <p className="text-xl font-display font-black text-slate-700">Rs. {(student.admissionFee || 0).toLocaleString()}</p>
                </div>
                <div className="bg-superior-teal/5 p-4.5 rounded-2xl border border-superior-teal/10 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] font-black text-superior-teal uppercase tracking-widest mb-1.5">Total Package</p>
                  <p className="text-xl font-display font-black text-superior-teal">Rs. {(student.totalPackage || 0).toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 p-4.5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Received</p>
                  <p className="text-xl font-display font-black text-emerald-700">Rs. {(student.feeReceived || (student.feeLedger?.totalReceived || 0)).toLocaleString()}</p>
                </div>
                <div className="bg-rose-50 p-4.5 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1.5">Remaining Balance</p>
                  <p className="text-xl font-display font-black text-rose-700">Rs. {Math.max(0, (student.totalPackage || 0) - (student.feeReceived || 0)).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800 text-white p-6 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-xl">
                      <CreditCard className="text-superior-gold" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-white/50">Installments Tracking (کستوں کا ریکارڈ)</p>
                      <h4 className="text-xl font-bold">
                        {Math.floor((student.feeLedger?.totalReceived || student.feeReceived || 0) / (student.monthlyFee || 1))} / {student.totalInstallments || 12} Paid
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black tracking-widest text-white/50">Plan Amount (کست رقم)</p>
                    <p className="font-bold text-superior-gold">Rs. {(student.monthlyFee || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-superior-teal text-white p-6 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-xl">
                      <BarChart3 className="text-superior-gold" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-white/50">Recovery Progress</p>
                      <h4 className="text-xl font-bold">
                        Remaining: Rs. {Math.max(0, (student.totalPackage || 0) - (student.feeReceived || 0)).toLocaleString()}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black tracking-widest text-white/50">Collected</p>
                    <p className="font-bold text-emerald-300">
                      {Math.round(((student.feeLedger?.totalReceived || student.feeReceived || 0) / (student.totalPackage || 1)) * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
              <Card className="lg:col-span-2 border-slate-200 overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Calendar size={16} className="text-superior-teal" />
                    Attendance Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-8 pb-8">
                  <div className="flex flex-col sm:flex-row items-center gap-8 md:gap-12">
                    <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" 
                          strokeDasharray={2 * Math.PI * 56}
                          strokeDashoffset={2 * Math.PI * 56 * (1 - attendanceRatio)}
                          strokeLinecap="round"
                          className="text-superior-teal transition-all duration-1000" />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-bold text-superior-teal">
                          {Math.round(attendanceRatio * 100)}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Ratio</span>
                      </div>
                    </div>
                    <div className="flex-1 w-full space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[10px] text-emerald-600 uppercase font-bold mb-1">Present</p>
                          <p className="text-xl font-bold text-emerald-700">{student.attendance.present} Days</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                          <p className="text-[10px] text-red-600 uppercase font-bold mb-1">Absent</p>
                          <p className="text-xl font-bold text-red-700">{student.attendance.absent} Days</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                          <span>Progress</span>
                          <span>{student.attendance.present} / {totalAttendance}</span>
                        </div>
                        <Progress value={attendanceRatio * 100} className="h-3 rounded-full" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-slate-50/30 rounded-2xl">
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-bold">Contact & Support</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100">
                    <div className="p-2.5 bg-superior-teal/10 rounded-lg">
                      <Edit size={16} className="text-superior-teal" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Guardian Contact</p>
                      <p className="text-sm font-bold text-slate-700">{student.contact}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100">
                    <div className="p-2.5 bg-superior-gold/10 rounded-lg">
                      <CheckCircle2 size={16} className="text-superior-gold" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Status</p>
                      <p className="text-sm font-bold text-emerald-600 tracking-wide">ENROLLED</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full h-10 text-xs font-bold border-slate-200 hover:bg-slate-50"
                    onClick={onEdit}
                  >
                    Update Profile Details
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fees" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Transaction & Installment History</h3>
              <div className="flex gap-2">
                <Button onClick={handleExportStatement} size="sm" variant="outline" className="text-xs">
                  <Download size={14} className="mr-1" /> Export Statement
                </Button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="py-4">Description / Month</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>System Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Show Ledger Transactions (Source of Truth + Legacy merged) */}
                  {getUnifiedTransactions(student).map((tx: any) => (
                    <TableRow key={tx.id} className="hover:bg-slate-50/50 transition-colors bg-slate-50/20">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-superior-teal">{tx.description}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{tx.paymentMethod} Payment</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-superior-teal">Rs. {(tx.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(tx.date).toLocaleDateString()}
                        {' • '}
                        <span className="text-[10px]">{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-superior-gold/20 text-superior-teal border-none text-[9px]">{tx.receiptId || 'TRANS'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}

                  {getUnifiedTransactions(student).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-slate-400 italic font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">No payment records found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="academic" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Academic Performance History</h3>
              <p className="text-xs text-slate-400 font-medium">Showing all recorded test results</p>
            </div>
            
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase">Test Name</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Subject</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Marks</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Date</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Teacher</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.academicRecords?.filter((r: any) => r.studentId === student.id).length > 0 ? (
                    data.academicRecords.filter((r: any) => r.studentId === student.id).map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{record.testName}</span>
                            <span className="text-[9px] font-black uppercase text-slate-400">{record.testType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-600">{record.subject}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800">{record.obtainedMarks} / {record.totalMarks}</span>
                            <Badge className={cn(
                              "text-[9px] font-black uppercase",
                              (record.obtainedMarks / record.totalMarks) >= 0.8 ? "bg-emerald-100 text-emerald-700" :
                              (record.obtainedMarks / record.totalMarks) >= 0.5 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                            )}>
                              {Math.round((record.obtainedMarks / record.totalMarks) * 100)}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{record.date}</TableCell>
                        <TableCell className="text-xs text-slate-500">{record.teacherName}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-slate-400 italic text-sm">
                        No academic records found for this student.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Button 
              className="w-full h-12 bg-superior-teal text-white hover:bg-superior-teal/90 rounded-xl"
              onClick={() => window.print()}
            >
              <Download size={18} className="mr-2" /> Download Full Academic Transcript
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EditStudentDialog({ student, data, onClose, onDelete }: { student: Student, data: any, onClose?: () => void, onDelete?: () => void }) {
  const [formData, setFormData] = useState({
    fullName: student.fullName || '',
    fatherName: student.fatherName || '',
    collegeNo: student.collegeNo || '',
    bayFormNo: student.bayFormNo || '',
    dob: student.dob || '',
    previousClass: student.previousClass || '10th',
    boardRollNo: student.boardRollNo || '',
    previousMarks: student.previousMarks !== undefined ? String(student.previousMarks) : '',
    contact: student.contact || '',
    fatherContact: student.fatherContact || '',
    email: student.email || '',
    bloodGroup: student.bloodGroup || '',
    address: student.address || '',
    admissionFee: student.admissionFee || 0,
    miscFunds: student.miscFunds || 0,
    totalFeeFinalized: student.totalFeeFinalized || 0,
    totalInstallments: student.totalInstallments || 12,
    monthlyFee: student.monthlyFee || 0,
    subjects: [...(student.subjects || [])],
    category: student.category || 'Inter Part-1 Boys',
    group: student.group || '',
    section: student.section || '',
    photo: student.photo || '',
    session: student.session || '',
    sessionStartDate: student.sessionStartDate || '',
    sessionEndDate: student.sessionEndDate || '',
    academicPart: student.academicPart || 'Part-1'
  });

  const filteredSections = React.useMemo(() => {
    if (!data.settings?.predefinedSections) return [];
    
    return data.settings.predefinedSections.filter(sec => {
      const matchesGender = sec.gender === student.gender || sec.gender === 'Co-ed';
      if (!matchesGender) return false;

      const sp = sec.program.toLowerCase();
      const cat = (student.category || '').toLowerCase();
      
      let programMatch = false;
      if (cat.includes('inter') && sp === 'inter') programMatch = true;
      else if (cat.includes('bs') && sp === 'bs program') programMatch = true;
      else if (cat.includes('dit') && sp === 'dit') programMatch = true;
      else if (cat.includes('uk') && sp === 'uk level 3') programMatch = true;
      else if (sp === 'other') programMatch = true;

      return matchesGender && programMatch;
    });
  }, [data.settings?.predefinedSections, student.gender, student.category]);

  const handleGroupChange = (groupName: string) => {
    const group = ACADEMIC_GROUPS.find(g => g.name === groupName);
    if (group) {
      const newSubjects = Array.from(new Set([...COMPULSORY_SUBJECTS, ...group.subjects]));
      setFormData(prev => ({ ...prev, group: groupName, subjects: newSubjects }));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const toastId = toast.loading("Processing photo...");
      try {
        const compressedBase64 = await compressImage(file);
        setFormData(prev => ({ ...prev, photo: compressedBase64 }));
        toast.dismiss(toastId);
        toast.success("Photo uploaded!");
      } catch (err) {
        console.error('Photo upload error:', err);
        toast.dismiss(toastId);
        toast.error("Failed to upload photo.");
      }
    }
  };

  const handleSave = () => {
    const groupChanged = formData.group !== student.group;
    const finalized = Number(formData.totalFeeFinalized);
    const adm = Number(formData.admissionFee);
    const misc = Number(formData.miscFunds);
    const totalPkg = finalized + adm + misc;
    const instCount = Number(formData.totalInstallments) || 12;
    const instAmount = Math.round(totalPkg / instCount);
    
    data.updateStudent(student.id, {
      ...formData,
      previousMarks: formData.previousMarks ? Number(formData.previousMarks) : undefined,
      totalPackage: totalPkg,
      monthlyFee: instAmount,
      totalInstallments: instCount,
      'feeLedger.totalPackage': totalPkg
    });
    toast.success("Student profile updated successfully!");
    if (onClose) onClose();
    
    if (groupChanged) {
      toast.warning(
        "Academic Group changed! Please review the Fee Package in Fee Manager.",
        {
          duration: 6000,
          action: {
            label: "Go to Fee Manager",
            onClick: () => {
              // This would ideally switch the tab, but for now just a reminder
              console.log("Navigate to Fee Manager");
            }
          }
        }
      );
    }
  };

  const handleDelete = () => {
    if (onDelete) onDelete();
  };

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: (prev.subjects || []).includes(subject)
        ? (prev.subjects || []).filter(s => s !== subject)
        : [...(prev.subjects || []), subject]
    }));
  };

  return (
    <DialogContent className="max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 bg-white rounded-3xl shadow-2xl">
      <DialogHeader>
        <DialogTitle className="text-2xl font-serif text-superior-teal">Edit Student Profile</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4">
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center overflow-hidden transition-colors group-hover:border-superior-teal shadow-inner">
              {formData.photo ? (
                <img src={formData.photo} alt="" className="w-full h-full object-cover object-[center_top] rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <>
                  <Camera className="text-slate-400 mb-2" size={24} />
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Upload Photo</span>
                </>
              )}
            </div>
            <label className="absolute inset-0 cursor-pointer">
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Admission Category</Label>
            <Select value={formData.category || ""} onValueChange={(v: any) => setFormData({...formData, category: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                   let cats = ['Inter Part-1 Boys', 'Inter Part-2 Boys', 'Inter Part-1 Girls', 'Inter Part-2 Girls'];
                   const program = student.programType?.toLowerCase() || 'yearly';
                   if (program === 'dit') cats = ['DIT Boys', 'DIT Girls'];
                   else if (program === 'ukl3') cats = ['UK L3 Boys', 'UK L3 Girls'];
                   else if (program === 'bs') cats = ["BS Boys", "BS Girls"];
                   
                   if (student.gender === 'Male') cats = cats.filter(c => c.toLowerCase().includes("boys"));
                   else if (student.gender === 'Female') cats = cats.filter(c => c.toLowerCase().includes("girls"));
                   
                   return cats.map(cat => (
                     <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                   ));
                })()}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={formData.fullName || ""} onChange={e => setFormData({...formData, fullName: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Father's Name</Label>
            <Input value={formData.fatherName || ""} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 col-span-2 space-y-4">
            <h4 className="text-xs font-black text-superior-teal uppercase tracking-widest">Academic & Identity Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>College Roll #</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.collegeNo || ""} 
                    onChange={e => setFormData({...formData, collegeNo: e.target.value})} 
                    placeholder="Assign Roll #"
                    className="font-bold bg-white"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      const allRolls: number[] = [];
                      (data.students || []).forEach((s: any) => {
                        const num = parseInt(String(s.collegeNo || '').replace(/\D/g, ''), 10);
                        if (!isNaN(num) && num > 0) allRolls.push(num);
                      });
                      const next = allRolls.length > 0 ? Math.max(...allRolls) + 1 : 1001;
                      setFormData(prev => ({ ...prev, collegeNo: String(next) }));
                      toast.success(`Suggested Roll #: ${next}`);
                    }}
                    className="h-10 px-2.5 text-xs text-superior-teal font-bold shrink-0"
                  >
                    Auto
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>B-Form / CNIC</Label>
                <Input value={formData.bayFormNo || ""} onChange={e => setFormData({...formData, bayFormNo: e.target.value})} placeholder="36103-..." className="bg-white" />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={formData.dob || ""} onChange={e => setFormData({...formData, dob: e.target.value})} className="bg-white" />
              </div>
              <div className="space-y-2">
                <Label>Previous Class</Label>
                <Select value={formData.previousClass || "10th"} onValueChange={v => setFormData({...formData, previousClass: v as any})}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9th">9th Class</SelectItem>
                    <SelectItem value="10th">10th Class (Matric)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>SSC / Matric Marks</Label>
                <Input type="number" value={formData.previousMarks || ""} onChange={e => setFormData({...formData, previousMarks: e.target.value})} placeholder="Obtained Marks" className="bg-white" />
              </div>
              <div className="space-y-2">
                <Label>Board Roll #</Label>
                <Input value={formData.boardRollNo || ""} onChange={e => setFormData({...formData, boardRollNo: e.target.value})} placeholder="Matric Roll #" className="bg-white" />
              </div>
              <div className="space-y-2">
                <Label>Academic Stage</Label>
                <Select value={formData.academicPart || "Part-1"} onValueChange={v => setFormData({...formData, academicPart: v as any})}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Part-1">Inter Part-1</SelectItem>
                    <SelectItem value="Part-2">Inter Part-2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session (Academic Period)</Label>
                <Select value={formData.session || ""} onValueChange={v => setFormData({...formData, session: v})}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Select Session" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023-2025">2023-2025</SelectItem>
                    <SelectItem value="2024-2026">2024-2026</SelectItem>
                    <SelectItem value="2025-2027">2025-2027</SelectItem>
                    <SelectItem value="2026-28">2026-28</SelectItem>
                    <SelectItem value="2027-2029">2027-2029</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Blood Group</Label>
                <Input value={formData.bloodGroup || ""} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} placeholder="e.g. O+, B+" className="bg-white uppercase" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input value={formData.contact || ""} onChange={e => setFormData({...formData, contact: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Monthly Installment (Auto-Calc)</Label>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-lg font-black text-superior-teal">
              Rs. {Math.round((Number(formData.totalFeeFinalized || 0) + Number(formData.admissionFee || 0) + Number(formData.miscFunds || 0)) / (formData.totalInstallments || 1)).toLocaleString()}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Total Installments Plan (Months)</Label>
            <Select value={String(formData.totalInstallments ?? 12)} onValueChange={(v) => setFormData({...formData, totalInstallments: Number(v)})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                  <SelectItem key={num} value={String(num)}>{num} Installments</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tuition Fee (Total)</Label>
            <Input type="number" value={formData.totalFeeFinalized || ""} onChange={e => setFormData({...formData, totalFeeFinalized: Number(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>Admission Fee</Label>
            <Input type="number" value={formData.admissionFee || ""} onChange={e => setFormData({...formData, admissionFee: Number(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>Misc Funds</Label>
            <Input type="number" value={formData.miscFunds || ""} onChange={e => setFormData({...formData, miscFunds: Number(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>Academic Group</Label>
            <Select value={formData.group || ""} onValueChange={handleGroupChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Group" />
              </SelectTrigger>
              <SelectContent>
                {ACADEMIC_GROUPS.map(group => (
                  <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={formData.section || ""} onValueChange={v => {
              const sectionObj = filteredSections.find(sec => sec.name === v);
              const newFormData = { ...formData, section: v };
              if (sectionObj && sectionObj.class) {
                newFormData.session = sectionObj.class;
              }
              setFormData(newFormData);
            }}>
              <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
              <SelectContent>
                {filteredSections.map(sec => (
                  <SelectItem key={sec.id} value={sec.name}>{sec.name} ({sec.class})</SelectItem>
                ))}
                {formData.section && formData.section !== 'Other' && !filteredSections.some(s => s.name === formData.section) && (
                  <SelectItem key="current-sec" value={formData.section}>{formData.section} (Current)</SelectItem>
                )}
                <SelectItem value="Other">Other / Manual</SelectItem>
              </SelectContent>
            </Select>
            {formData.section === 'Other' && (
              <Input 
                className="mt-2"
                placeholder="Enter manual section name" 
                onChange={e => setFormData({...formData, section: e.target.value.toUpperCase()})} 
              />
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={formData.address || ""} onChange={e => setFormData({...formData, address: e.target.value})} />
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="space-y-2">
              <Label className="text-superior-teal font-bold">Compulsory Subjects / لازمی مضامین</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COMPULSORY_SUBJECTS.map(subject => (
                  <div key={subject} className="flex items-center space-x-2 bg-white p-2 rounded border border-slate-100">
                    <Checkbox 
                      id={`edit-comp-subject-${subject}`} 
                      checked={(formData.subjects || []).includes(subject)}
                      onCheckedChange={() => toggleSubject(subject)}
                    />
                    <label htmlFor={`edit-comp-subject-${subject}`} className="text-xs font-medium leading-none cursor-pointer">
                      {subject}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-superior-teal font-bold">Elective & Group Subjects / اختیاری مضامین</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SUBJECTS.filter(s => !COMPULSORY_SUBJECTS.includes(s)).map(subject => (
                  <div key={subject} className="flex items-center space-x-2 bg-white p-2 rounded border border-slate-100">
                    <Checkbox 
                      id={`edit-subject-${subject}`} 
                      checked={(formData.subjects || []).includes(subject)}
                      onCheckedChange={() => toggleSubject(subject)}
                    />
                    <label htmlFor={`edit-subject-${subject}`} className="text-sm font-medium leading-none cursor-pointer">
                      {subject}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="pt-4 flex gap-3">
          <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleDelete}>
            <Trash2 size={18} className="mr-2" /> Delete Student
          </Button>
          <div className="flex-1" />
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button className="bg-superior-teal text-white hover:bg-superior-teal/90" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}



function InfoCard({ title, value, icon: Icon }: { title: string, value: string, icon?: any }) {
  return (
    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white transition-all group">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={14} className="text-slate-400 group-hover:text-superior-teal transition-colors" />}
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{title}</p>
      </div>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
