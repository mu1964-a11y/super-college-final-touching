
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
  FileSpreadsheet,
  MessageSquare,
  Fingerprint,
  ExternalLink,
  RefreshCw,
  Sparkles,
  BookOpen,
  Building2,
  Laptop,
  Check,
  ShieldCheck,
  Plus,
  Upload,
  X
} from 'lucide-react';
import BulkImportWizard from './BulkImportWizard';
import BulkEditStudentsModal from './BulkEditStudentsModal';
import { secugenService } from '../lib/secugenService';
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
import { getUnifiedTransactions, parseDateSafe } from '../utils/fee';
import { CANONICAL_SESSIONS, normalizeSessionString, detectEducationalStream, matchesEducationalStream, matchesCohortStage } from '../lib/academicMasterData';
import PhotoEditorModal from './PhotoEditorModal';

export default function StudentsView({ data, gender, program }: { data: any, gender?: Gender, program?: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [monthlyFeeFilter, setMonthlyFeeFilter] = useState('all');
  const [defaulterFilter, setDefaulterFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState<string>(gender || 'all');
  const [programFilter, setProgramFilter] = useState<string>(program || 'all');
  const [academicStageFilter, setAcademicStageFilter] = useState<string>('all');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with-photo' | 'missing-photo'>('all');
  const [photoEditorStudent, setPhotoEditorStudent] = useState<Student | null>(null);
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [subjectFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
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

  const allRawStudents = React.useMemo(() => {
    const deletedArchiveList = (data.deletedArchive || []) as any[];
    const archivedIds = new Set<string>();
    const archivedNames = new Set<string>();
    deletedArchiveList.forEach((arch: any) => {
      if (arch.originalId) archivedIds.add(arch.originalId);
      if (arch.studentId) archivedIds.add(arch.studentId);
      if (arch.fullName && arch.fatherName) {
        archivedNames.add(`${arch.fullName.trim().toLowerCase()}::${arch.fatherName.trim().toLowerCase()}`);
      }
    });

    const rawStudents = [...(data.students || [])]
      .filter((s: any) => {
        if (s.status === 'archived' || s.status === 'Deleted') return false;
        if (archivedIds.has(s.id) || (s.admissionId && archivedIds.has(s.admissionId))) return false;
        if (s.fullName && s.fatherName && archivedNames.has(`${s.fullName.trim().toLowerCase()}::${s.fatherName.trim().toLowerCase()}`)) return false;
        return true;
      })
      .map(s => {
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
    (data.admissions || []).forEach((a: any) => {
      const isArchived = a.status === 'Archived' || 
                         a.status === 'Deleted' || 
                         a.isAdmitted === false ||
                         archivedIds.has(a.id) || 
                         (a.studentId && archivedIds.has(a.studentId)) ||
                         (a.fullName && a.fatherName && archivedNames.has(`${a.fullName.trim().toLowerCase()}::${a.fatherName.trim().toLowerCase()}`));
      if (isArchived) return;

      const existsInStudents = rawStudents.some((s: any) => s.admissionId === a.id || s.id === a.studentId);
      const isConfirmed = (a.isAdmitted === true || 
                          a.status === "Admitted/Confirmed" || 
                          a.status === "Admitted" || 
                          a.status === "Confirmed" || 
                          a.status === "Full Paid" || 
                          a.status === "Partial Paid") && a.status !== 'Pending' && a.status !== 'Rejected';
      
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

    return rawStudents;
  }, [data.students, data.admissions, data.deletedArchive]);

  // Real-time dynamic counts for all educational streams & sub-cohorts
  const quickCohortStats = React.useMemo(() => {
    let interTotal = 0, p1Boys = 0, p1Girls = 0, p2Boys = 0, p2Girls = 0, interSess26_28 = 0, interSess25_27 = 0;
    let bsTotal = 0, bsBoys = 0, bsGirls = 0, bsSem1 = 0, bsSem5 = 0, bsSem7_8 = 0, bsSess26_30 = 0, bsSess25_29 = 0, bsSess24_28 = 0, bsSess23_27 = 0, bsSess24_26 = 0;
    let adsTotal = 0, adsBoys = 0, adsGirls = 0, adsPart1 = 0, adsPart2 = 0, adsSess26_28 = 0, adsSess25_27 = 0;
    let ditTotal = 0, ditBoys = 0, ditGirls = 0, ditPart1 = 0, ditPart2 = 0, ditSess26_27 = 0, ditSess26_28 = 0;
    let ukl3Total = 0, ukBoys = 0, ukGirls = 0, ukYear1 = 0, ukYear2 = 0, ukSess26_28 = 0;

    for (const s of allRawStudents) {
      const stream = detectEducationalStream(s);
      const c = (s.category || '').toLowerCase();
      const sess = normalizeSessionString(s.session);
      const isMale = s.gender === 'Male';
      const isFemale = s.gender === 'Female';

      const sem = Number(s.currentSemester || s.current_semester || 0);
      const part = (s.academicPart || s.academic_part || '').toLowerCase();
      const isPart2 = part.includes('part-2') || part.includes('2nd') || c.includes('part-2') || c.includes('part 2') || c.includes('year-2') || c.includes('year 2') || sess === '2025-27';

      if (stream === 'fsc') {
        interTotal++;
        if (!isPart2 && isMale) p1Boys++;
        if (!isPart2 && isFemale) p1Girls++;
        if (isPart2 && isMale) p2Boys++;
        if (isPart2 && isFemale) p2Girls++;
        if (sess === '2026-28') interSess26_28++;
        if (sess === '2025-27') interSess25_27++;
      } else if (stream === 'bs') {
        bsTotal++;
        if (isMale) bsBoys++;
        if (isFemale) bsGirls++;
        if (sem === 1 || c.includes('1st') || c.includes('fresh')) bsSem1++;
        if (sem === 5 || c.includes('5th') || c.includes('lateral')) bsSem5++;
        if (sem === 7 || sem === 8 || c.includes('7th') || c.includes('8th') || c.includes('final')) bsSem7_8++;
        if (sess === '2026-30') bsSess26_30++;
        if (sess === '2025-29') bsSess25_29++;
        if (sess === '2024-28') bsSess24_28++;
        if (sess === '2023-27') bsSess23_27++;
        if (sess === '2024-26') bsSess24_26++;
      } else if (stream === 'ads') {
        adsTotal++;
        if (isMale) adsBoys++;
        if (isFemale) adsGirls++;
        if ((sem > 0 && sem <= 2) || (!isPart2 && sem <= 2)) adsPart1++;
        else adsPart2++;
        if (sess === '2026-28') adsSess26_28++;
        if (sess === '2025-27') adsSess25_27++;
      } else if (stream === 'dit') {
        ditTotal++;
        if (isMale) ditBoys++;
        if (isFemale) ditGirls++;
        if (!isPart2) ditPart1++;
        else ditPart2++;
        if (sess === '2026-27') ditSess26_27++;
        if (sess === '2026-28') ditSess26_28++;
      } else if (stream === 'ukl3') {
        ukl3Total++;
        if (isMale) ukBoys++;
        if (isFemale) ukGirls++;
        if (!isPart2) ukYear1++;
        else ukYear2++;
        if (sess === '2026-28') ukSess26_28++;
      }
    }

    return {
      all: allRawStudents.length,
      inter: { total: interTotal, p1Boys, p1Girls, p2Boys, p2Girls, sess26_28: interSess26_28, sess25_27: interSess25_27 },
      bs: { total: bsTotal, bsBoys, bsGirls, sem1: bsSem1, sem5: bsSem5, sem7_8: bsSem7_8, sess26_30: bsSess26_30, sess25_29: bsSess25_29, sess24_28: bsSess24_28, sess23_27: bsSess23_27, sess24_26: bsSess24_26 },
      ads: { total: adsTotal, adsBoys, adsGirls, part1: adsPart1, part2: adsPart2, sess26_28: adsSess26_28, sess25_27: adsSess25_27 },
      dit: { total: ditTotal, ditBoys, ditGirls, part1: ditPart1, part2: ditPart2, sess26_27: ditSess26_27, sess26_28: ditSess26_28 },
      ukl3: { total: ukl3Total, ukBoys, ukGirls, year1: ukYear1, year2: ukYear2, sess26_28: ukSess26_28 }
    };
  }, [allRawStudents]);

  const mergedStudents = React.useMemo(() => {
    return allRawStudents.filter((s: any) => {
      // 1. Gender Filter (Always enforced even during search so Boys/Girls campus never leaks)
      if (genderFilter !== 'all' && s.gender !== genderFilter) return false;
      
      // 2. Educational Stream Filter (Single Source of Truth)
      if (programFilter !== 'all' && !matchesEducationalStream(s, programFilter)) return false;

      // 3. Academic Stage & Cohort Filter
      if (academicStageFilter !== 'all' && !matchesCohortStage(s, academicStageFilter)) return false;

      // 4. Session Filter
      if (sessionFilter !== 'all') {
        const sSessNorm = normalizeSessionString(s.session);
        if (sSessNorm !== normalizeSessionString(sessionFilter)) return false;
      }

      return true;
    });
  }, [allRawStudents, genderFilter, programFilter, academicStageFilter, sessionFilter]);

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
        const isADS = pg.includes("ads") || pg.includes("adp") || pg.includes("ada");
        const isDIT = pg.includes("dit") || pg.includes("diploma");
        const isBS = !isADS && (pg.includes("bs") || pg.includes("b.s"));
        const isUKL3 = pg.includes("uk") || pg.includes("level 3") || pg.includes("l3");
        
        if (pFilter === "fsc" || pFilter === "inter") {
          return !isADS && !isDIT && !isBS && !isUKL3;
        } else if (pFilter === "ads") {
          return isADS;
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
    const searchTokens = searchClean.split(/\s+/).filter(Boolean);
    return mergedStudents.filter((s: any) => {
      const searchableText = `${s.fullName || ''} ${s.fatherName || ''} ${s.id || ''} ${s.studentId || ''} ${s.collegeNo || s.college_no || ''} ${s.contact || s.contactNumber || ''} ${s.fatherContact || ''} ${s.bayFormNo || (s as any).bay_form_no || ''} ${s.group || ''} ${s.category || ''} ${s.section || ''}`.toLowerCase();
      const matchesSearch = searchTokens.length === 0 || searchTokens.every(tok => searchableText.includes(tok));
      
      // Dynamic fee status check (current calendar month OR overall package status)
      const now = new Date();
      const currentMonthName = now.toLocaleString('en-US', { month: 'long' });
      const currentYearNum = now.getFullYear();
      const currentMonthPayment = (s.feeHistory || []).find((f: any) => f.month === currentMonthName && Number(f.year) === currentYearNum);
      const totalPkg = Number(s.totalPackage || s.feeLedger?.totalPackage || 0);
      const totalRec = Number(s.feeReceived || s.feeLedger?.totalReceived || 0);
      const isFullyPaidPkg = totalPkg > 0 && totalRec >= totalPkg;
      const isPartialPkg = totalRec > 0 && totalRec < totalPkg;
      const isUnpaidPkg = totalRec <= 0;

      const matchesFee = monthlyFeeFilter === 'all' || 
                        (monthlyFeeFilter === 'Paid' && (currentMonthPayment?.status === 'Paid' || isFullyPaidPkg)) ||
                        (monthlyFeeFilter === 'Partial' && (currentMonthPayment?.status === 'Partial' || isPartialPkg)) ||
                        (monthlyFeeFilter === 'Unpaid' && ((!currentMonthPayment || currentMonthPayment.status === 'Unpaid') && isUnpaidPkg));

      // Defaulter logic
      const unpaidMonths = (s.feeHistory || []).filter((f: any) => f.status === 'Unpaid').length;
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
  }, [searchTerm, monthlyFeeFilter, defaulterFilter, subjectFilter, sectionFilter, photoFilter, programFilter, academicStageFilter, sessionFilter]);

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

  const loadLogoBase64 = async (customUrl?: string): Promise<string | null> => {
    if (customUrl && customUrl.startsWith('data:image')) return customUrl;
    const target = customUrl || '/superior-logo.png';
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 1500);
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 120;
          canvas.height = img.naturalHeight || 120;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
          resolve(null);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      img.src = target;
    });
  };

  const getExportStudentList = (scope: 'filtered' | 'all' | 'selected' = 'filtered') => {
    if (scope === 'selected') {
      return (mergedStudents || []).filter((s: any) => selectedStudents.includes(s.id));
    }
    if (scope === 'all') {
      return mergedStudents || [];
    }
    return filteredStudents || [];
  };

  const handleExportPDF = async ({
    mode = 'directory',
    exportScope = 'filtered'
  }: {
    mode: 'directory' | 'financial';
    exportScope?: 'filtered' | 'all' | 'selected';
  }) => {
    const listToExport = getExportStudentList(exportScope);
    if (!listToExport || listToExport.length === 0) {
      toast.error("No student records found to export!");
      return;
    }

    const toastId = toast.loading(`Generating official ${mode === 'financial' ? 'Student Financial Ledger' : 'Student Directory'} PDF...`);

    try {
      const doc = new jsPDF('landscape', 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Fetch official college crest / logo
      const logoBase64 = await loadLogoBase64(data?.settings?.logo);

      // 2. Top Royal Header
      const headerHeight = 64;
      doc.setFillColor(6, 78, 67); // Superior Teal #064e43
      doc.rect(0, 0, pageWidth, headerHeight, 'F');

      // Gold Accent Ribbon
      doc.setFillColor(212, 175, 55); // #d4af37 Gold
      doc.rect(0, headerHeight, pageWidth, 2.5, 'F');

      // Logo rendering on the left
      let textStartX = 24;
      if (logoBase64) {
        try {
          const logoCenterX = 44;
          const logoCenterY = 32;
          const logoRadius = 21;
          
          doc.setFillColor(255, 255, 255);
          doc.circle(logoCenterX, logoCenterY, logoRadius, 'F');
          doc.setDrawColor(212, 175, 55);
          doc.setLineWidth(1.2);
          doc.circle(logoCenterX, logoCenterY, logoRadius, 'S');
          
          doc.addImage(logoBase64, 'PNG', logoCenterX - 16, logoCenterY - 16, 32, 32);
          textStartX = 78;
        } catch (err) {
          console.warn('Logo embed warning:', err);
        }
      }

      // College Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      const collegeTitle = (data?.settings?.collegeName || "SUPERIOR COLLEGE JAHANIAN").toUpperCase();
      doc.text(collegeTitle, textStartX, 22);

      // Document Subtitle
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(212, 175, 55); // Gold
      const docTitle = mode === 'financial'
        ? "STUDENT FINANCIAL LEDGER & FEE RECOVERY MASTER REPORT"
        : "OFFICIAL STUDENT ACADEMIC & ENROLLMENT DIRECTORY";
      doc.text(docTitle, textStartX, 36);

      // Sub-metadata Line
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(226, 232, 240); // Silver slate
      const sessionLabel = data?.settings?.academicSession || "Session 2026-28";
      const campusName = (data?.settings?.campusName || "Jahanian Campus").toUpperCase();
      const dateFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const programLabel = programFilter !== 'all' ? `Program: ${programFilter.toUpperCase()}` : 'All Programs';
      const sectionLabel = sectionFilter !== 'all' ? `Section: ${sectionFilter}` : '';
      const scopeLabel = exportScope === 'selected' 
        ? `Scope: Selected (${listToExport.length} Students)` 
        : exportScope === 'all' 
          ? `Scope: Full College Roster (${listToExport.length} Students)` 
          : `Scope: Filtered View (${listToExport.length} Students)`;
      
      const metaText = `Campus: ${campusName}  |  ${sessionLabel}  |  ${programLabel}  ${sectionLabel ? `|  ${sectionLabel}  ` : ''}|  ${scopeLabel}  |  Issued: ${dateFormatted}`;
      doc.text(metaText, textStartX, 50);

      // Right Badge Pill
      const badgeW = 135;
      const badgeH = 22;
      const badgeX = pageWidth - badgeW - 24;
      const badgeY = 21;
      if (mode === 'financial') {
        doc.setFillColor(153, 27, 27); // Rich Burgundy
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, 'F');
        doc.setDrawColor(254, 202, 202);
        doc.setLineWidth(0.8);
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text("ACCOUNTS CONFIDENTIAL", badgeX + badgeW / 2, badgeY + 14, { align: 'center' });
      } else {
        doc.setFillColor(8, 90, 78); // Teal
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, 'F');
        doc.setDrawColor(212, 175, 55); // Gold
        doc.setLineWidth(0.8);
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(212, 175, 55);
        doc.text("ACADEMIC ROSTER", badgeX + badgeW / 2, badgeY + 14, { align: 'center' });
      }

      let head: string[][] = [];
      let body: any[][] = [];
      let foot: string[][] = [];
      let columnStyles: Record<string | number, any> = {};

      if (mode === 'directory') {
        // Academic & General Roster (NO FEES)
        head = [[
          'Sr #',
          'Student ID',
          'College #',
          'Student Full Name',
          'Father Name',
          'Gender',
          'Group / Degree',
          'Class / Stage',
          'Sec',
          'Contact / WhatsApp',
          'Bay Form / CNIC'
        ]];

        body = listToExport.map((s: any, idx: number) => [
          String(idx + 1),
          s.id || s.studentId || '-',
          s.collegeNo || (s as any).college_no || '-',
          s.fullName || '-',
          s.fatherName || '-',
          s.gender || '-',
          s.group || '-',
          s.category || '-',
          s.section && s.section !== '-' ? s.section : '-',
          s.parentContact || s.fatherContact || s.contact || s.contactNumber || '-',
          s.bayFormNo || (s as any).bay_form_no || '-'
        ]);

        foot = [[
          'Total',
          '',
          `${listToExport.length} Student(s)`,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]];

        columnStyles = {
          0: { cellWidth: 26, halign: 'center' },
          1: { cellWidth: 65, fontStyle: 'bold', textColor: [6, 78, 67] },
          2: { cellWidth: 50, halign: 'center' },
          3: { cellWidth: 105, fontStyle: 'bold' },
          4: { cellWidth: 95 },
          5: { cellWidth: 42, halign: 'center' },
          6: { cellWidth: 90 },
          7: { cellWidth: 80 },
          8: { cellWidth: 32, halign: 'center' },
          9: { cellWidth: 80 },
          10: { cellWidth: 75 }
        };
      } else {
        // Financial Ledger & Recovery Sheet (WITH FEES & REMAINING)
        let totalGrossPkg = 0;
        let totalGrossPaid = 0;
        let totalGrossRem = 0;

        listToExport.forEach((s: any) => {
          const pkg = Number(s.totalPackage || s.total_package || s.feeLedger?.totalPackage || s.totalFeeFinalized || 0);
          const paid = Number(s.feeReceived || s.fee_received || s.feeLedger?.totalReceived || 0);
          const rem = Math.max(0, pkg - paid);
          totalGrossPkg += pkg;
          totalGrossPaid += paid;
          totalGrossRem += rem;
        });

        head = [[
          'Sr #',
          'Student ID',
          'Student Full Name',
          'Father Name',
          'Program & Group',
          'Sec',
          'Contact / Phone',
          'Total Fee (Rs)',
          'Paid (Rs)',
          'Remaining (Rs)',
          'Fee Status'
        ]];

        body = listToExport.map((s: any, idx: number) => {
          const pkg = Number(s.totalPackage || s.total_package || s.feeLedger?.totalPackage || s.totalFeeFinalized || 0);
          const paid = Number(s.feeReceived || s.fee_received || s.feeLedger?.totalReceived || 0);
          const rem = Math.max(0, pkg - paid);
          const status = pkg > 0 && paid >= pkg ? 'Full Paid' : paid > 0 ? 'Partial Paid' : 'Unpaid';

          return [
            String(idx + 1),
            s.id || s.studentId || '-',
            s.fullName || '-',
            s.fatherName || '-',
            `${s.group || ''} ${s.category ? `(${s.category})` : ''}`.trim() || '-',
            s.section && s.section !== '-' ? s.section : '-',
            s.parentContact || s.fatherContact || s.contact || s.contactNumber || '-',
            `Rs. ${pkg.toLocaleString()}`,
            `Rs. ${paid.toLocaleString()}`,
            `Rs. ${rem.toLocaleString()}`,
            status
          ];
        });

        foot = [[
          'Total',
          '',
          `${listToExport.length} Student(s)`,
          '',
          '',
          '',
          '',
          `Rs. ${totalGrossPkg.toLocaleString()}`,
          `Rs. ${totalGrossPaid.toLocaleString()}`,
          `Rs. ${totalGrossRem.toLocaleString()}`,
          ''
        ]];

        columnStyles = {
          0: { cellWidth: 26, halign: 'center' },
          1: { cellWidth: 68, fontStyle: 'bold', textColor: [6, 78, 67] },
          2: { cellWidth: 105, fontStyle: 'bold' },
          3: { cellWidth: 95 },
          4: { cellWidth: 110 },
          5: { cellWidth: 30, halign: 'center' },
          6: { cellWidth: 78 },
          7: { cellWidth: 70, halign: 'right' },
          8: { cellWidth: 70, halign: 'right', fontStyle: 'bold', textColor: [6, 78, 67] },
          9: { cellWidth: 75, halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] },
          10: { cellWidth: 60, halign: 'center', fontStyle: 'bold' }
        };
      }

      autoTable(doc, {
        startY: 76,
        head,
        body,
        foot,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 3.5,
          valign: 'middle',
          lineColor: [226, 232, 240],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: mode === 'financial' ? [8, 90, 78] : [6, 78, 67],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8,
        },
        columnStyles,
        didDrawPage: (dataHook) => {
          const str = `Page ${dataHook.pageNumber} of ${doc.getNumberOfPages()}`;
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text("Official Computer-Generated Document · Superior College ERP System", 36, pageHeight - 18);
          doc.text(str, pageWidth - 36, pageHeight - 18, { align: 'right' });
        }
      });

      const fileName = mode === 'financial'
        ? `Students_Fee_Ledger_${exportScope}_${new Date().toISOString().split('T')[0]}.pdf`
        : `Students_Directory_${exportScope}_${new Date().toISOString().split('T')[0]}.pdf`;

      doc.save(fileName);
      toast.dismiss(toastId);
      toast.success(`Exported ${listToExport.length} students to official PDF (${mode === 'financial' ? 'Fee Ledger' : 'Directory'})!`);
    } catch (err) {
      console.error("PDF export error:", err);
      toast.dismiss(toastId);
      toast.error("Failed to generate PDF document.");
    }
  };

  const handleExportExcel = (mode: 'directory' | 'financial' = 'directory', exportScope: 'filtered' | 'all' | 'selected' = 'filtered') => {
    const listToExport = getExportStudentList(exportScope);
    if (!listToExport || listToExport.length === 0) {
      toast.error("No student records found to export!");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(listToExport.map((s: any, idx: number) => {
      const pkg = Number(s.totalPackage || s.total_package || s.feeLedger?.totalPackage || s.totalFeeFinalized || 0);
      const paid = Number(s.feeReceived || s.fee_received || s.feeLedger?.totalReceived || 0);
      const rem = Math.max(0, pkg - paid);
      const arrears = Number((s as any).arrears || (s as any).col49Arrears || 0);
      const status = pkg > 0 && paid >= pkg ? 'Full Paid' : paid > 0 ? 'Partial Paid' : 'Unpaid';

      const record: Record<string, any> = {
        "Sr #": idx + 1,
        "Student ID / Roll No": s.id || s.studentId || "",
        "College Roll No": s.collegeNo || (s as any).college_no || "",
        "Student Full Name": s.fullName || "",
        "Father Name": s.fatherName || "",
        "Gender": s.gender || "",
        "Academic Stream": s.program || s.programType || "",
        "Academic Group": s.group || "",
        "Class / Category": s.category || "",
        "Section": s.section && s.section !== '-' ? s.section : "",
        "Academic Session": s.session || "",
        "Date of Birth": s.dob || "",
        "Bay Form / CNIC": s.bayFormNo || (s as any).bay_form_no || "",
        "Student Contact": s.contact || s.contactNumber || "",
        "Father Contact / WhatsApp": s.fatherContact || s.parentContact || "",
        "Residential Address": s.address || "",
        "Blood Group": s.bloodGroup || "",
        "Previous School": s.previousSchool || "",
        "Board Roll No": s.boardRollNo || (s as any).board_roll_no || "",
        "Matric / Previous Marks": s.previousMarks ?? (s as any).previous_marks ?? ""
      };

      if (mode === 'financial') {
        record["Total Package Fee (Rs)"] = pkg;
        record["Fee Paid to Date (Rs)"] = paid;
        record["Remaining Outstanding Balance (Rs)"] = rem;
        record["Previous Arrears (Rs)"] = arrears;
        record["Payment Status"] = status;
        record["Installments Count"] = s.totalInstallments || 12;
        record["Monthly Fee Rate (Rs)"] = s.monthlyFee || 0;
      }

      return record;
    }));

    const wb = XLSX.utils.book_new();
    const sheetTitle = mode === 'financial' ? "Fee Ledger" : "Students Directory";
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

    const fileName = mode === 'financial'
      ? `Students_Fee_Ledger_${exportScope}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `Students_Directory_${exportScope}_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(wb, fileName);
    toast.success(`Exported ${listToExport.length} students to Excel (${sheetTitle})!`);
  };

  const handleExportCSV = (mode: 'directory' | 'financial' = 'directory', exportScope: 'filtered' | 'all' | 'selected' = 'filtered') => {
    const listToExport = getExportStudentList(exportScope);
    if (!listToExport || listToExport.length === 0) {
      toast.error("No student records found to export!");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(listToExport.map((s: any, idx: number) => {
      const pkg = Number(s.totalPackage || s.total_package || s.feeLedger?.totalPackage || s.totalFeeFinalized || 0);
      const paid = Number(s.feeReceived || s.fee_received || s.feeLedger?.totalReceived || 0);
      const rem = Math.max(0, pkg - paid);
      const arrears = Number((s as any).arrears || (s as any).col49Arrears || 0);
      const status = pkg > 0 && paid >= pkg ? 'Full Paid' : paid > 0 ? 'Partial Paid' : 'Unpaid';

      const record: Record<string, any> = {
        "Sr #": idx + 1,
        "Student ID / Roll No": s.id || s.studentId || "",
        "College Roll No": s.collegeNo || (s as any).college_no || "",
        "Student Full Name": s.fullName || "",
        "Father Name": s.fatherName || "",
        "Gender": s.gender || "",
        "Academic Stream": s.program || s.programType || "",
        "Academic Group": s.group || "",
        "Class / Category": s.category || "",
        "Section": s.section && s.section !== '-' ? s.section : "",
        "Academic Session": s.session || "",
        "Bay Form / CNIC": s.bayFormNo || (s as any).bay_form_no || "",
        "Contact Number": s.contact || s.contactNumber || "",
        "Father Contact": s.fatherContact || s.parentContact || "",
      };

      if (mode === 'financial') {
        record["Total Fee (Rs)"] = pkg;
        record["Paid (Rs)"] = paid;
        record["Remaining Balance (Rs)"] = rem;
        record["Arrears (Rs)"] = arrears;
        record["Status"] = status;
      }

      return record;
    }));

    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Students_Export_${mode === 'financial' ? 'FeeLedger' : 'Directory'}_${exportScope}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${listToExport.length} students to CSV!`);
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
                { id: 'fsc', label: 'Inter (2-Yr)' },
                { id: 'bs', label: 'BS (4-Yr)' },
                { id: 'ads', label: 'ADS (2-Yr)' },
                { id: 'dit', label: 'DIT Diploma' },
                { id: 'ukl3', label: 'UK Level 3' },
              ].map(prog => (
                <button
                  key={prog.id}
                  type="button"
                  onClick={() => {
                    setProgramFilter(prog.id);
                    setAcademicStageFilter('all');
                    setSessionFilter('all');
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
                  { id: 'all', label: 'All Inter' },
                  { id: 'part1', label: 'Part-1 (1st Year)' },
                  { id: 'part2', label: 'Part-2 (2nd Year)' },
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

            {programFilter === 'ads' && (
              <div className="hidden sm:flex items-center bg-cyan-50/80 dark:bg-cyan-950/40 p-0.5 rounded-xl border border-cyan-200/80 dark:border-cyan-800/60 gap-0.5">
                {[
                  { id: 'all', label: 'All ADS' },
                  { id: 'ads-p1', label: 'Part-1 (Sem 1-2)' },
                  { id: 'ads-p2', label: 'Part-2 (Sem 3-4)' },
                ].map(stg => (
                  <button
                    key={stg.id}
                    type="button"
                    onClick={() => setAcademicStageFilter(stg.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      academicStageFilter === stg.id
                        ? "bg-cyan-700 text-white shadow-2xs"
                        : "text-cyan-800 dark:text-cyan-300 hover:text-cyan-950"
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
                  { id: 'dit-p1', label: 'Part-1' },
                  { id: 'dit-p2', label: 'Part-2' },
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

            {programFilter === 'ukl3' && (
              <div className="hidden sm:flex items-center bg-purple-50/80 dark:bg-purple-950/40 p-0.5 rounded-xl border border-purple-200/80 dark:border-purple-800/60 gap-0.5">
                {[
                  { id: 'all', label: 'All UKL3' },
                  { id: 'uk-yr1', label: 'Year-1' },
                  { id: 'uk-yr2', label: 'Year-2' },
                ].map(stg => (
                  <button
                    key={stg.id}
                    type="button"
                    onClick={() => setAcademicStageFilter(stg.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      academicStageFilter === stg.id
                        ? "bg-purple-600 text-white shadow-2xs"
                        : "text-purple-800 dark:text-purple-300 hover:text-purple-950"
                    )}
                  >
                    {stg.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 3-Stage Bulk Import Wizard Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsBulkImportOpen(true)}
              className="h-7.5 px-3 rounded-xl border-slate-200/90 dark:border-slate-800 hover:border-blue-500/40 text-slate-700 dark:text-slate-200 hover:bg-blue-50/50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Upload size={13} className="text-blue-600" />
              <span>Import Students</span>
            </Button>

            {/* Comprehensive Export Reports Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7.5 px-3 rounded-xl border-slate-200/90 dark:border-slate-800 hover:border-superior-teal/40 text-slate-700 dark:text-slate-200 hover:bg-emerald-50/50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Download size={13} className="text-superior-teal dark:text-emerald-400" />
                  <span>Export Reports</span>
                </Button>
              } />
              <DropdownMenuContent align="end" className="w-80 p-2.5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-50">
                {/* Category 1: Academic & General Directory (NO FEES) */}
                <div className="px-2 py-1.5 text-[10.5px] font-black tracking-wider text-emerald-800 dark:text-emerald-400 uppercase flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-950/40 rounded-lg mb-1">
                  <span className="flex items-center gap-1.5">
                    <FileText size={13} className="text-emerald-700 dark:text-emerald-400" />
                    1. Students Roster (General)
                  </span>
                  <span className="text-[9px] bg-white dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded font-black border border-emerald-200 dark:border-emerald-700">NO FEES</span>
                </div>
                <DropdownMenuItem onClick={() => handleExportPDF({ mode: 'directory', exportScope: 'filtered' })} className="rounded-xl py-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-emerald-50/60 dark:hover:bg-slate-800">
                  <FileText size={15} className="mr-2 text-emerald-600" />
                  PDF Roster (Filtered - {filteredStudents.length} Students)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPDF({ mode: 'directory', exportScope: 'all' })} className="rounded-xl py-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-emerald-50/60 dark:hover:bg-slate-800">
                  <FileText size={15} className="mr-2 text-teal-700 dark:text-teal-400" />
                  PDF Roster (All Students - {mergedStudents.length} Students)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportExcel('directory', 'filtered')} className="rounded-xl py-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                  <FileSpreadsheet size={14} className="mr-2 text-emerald-600" />
                  Excel Roster (No Fees - Filtered)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportExcel('directory', 'all')} className="rounded-xl py-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                  <FileSpreadsheet size={14} className="mr-2 text-teal-700" />
                  Excel All Students Master Roster
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCSV('directory', 'filtered')} className="rounded-xl py-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                  <Download size={14} className="mr-2 text-emerald-600" />
                  CSV Student Roster (Filtered)
                </DropdownMenuItem>

                <Separator className="my-2" />

                {/* Category 2: Fee Ledger & Financial Recovery (WITH FEES & REMAINING) */}
                <div className="px-2 py-1.5 text-[10.5px] font-black tracking-wider text-amber-900 dark:text-amber-400 uppercase flex items-center justify-between bg-amber-50/80 dark:bg-amber-950/40 rounded-lg mb-1">
                  <span className="flex items-center gap-1.5">
                    <CreditCard size={13} className="text-amber-700 dark:text-amber-400" />
                    2. Fee Ledger & Recovery
                  </span>
                  <span className="text-[9px] bg-white dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-black border border-amber-200 dark:border-amber-700">WITH FEES & BALANCES</span>
                </div>
                <DropdownMenuItem onClick={() => handleExportPDF({ mode: 'financial', exportScope: 'filtered' })} className="rounded-xl py-2 cursor-pointer text-xs font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-50/60 dark:hover:bg-slate-800">
                  <CreditCard size={15} className="mr-2 text-amber-600" />
                  PDF Fee Ledger (Filtered - {filteredStudents.length} Students)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPDF({ mode: 'financial', exportScope: 'all' })} className="rounded-xl py-2 cursor-pointer text-xs font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-50/60 dark:hover:bg-slate-800">
                  <CreditCard size={15} className="mr-2 text-amber-700" />
                  PDF Master Fee Ledger (All Students)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportExcel('financial', 'filtered')} className="rounded-xl py-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <FileSpreadsheet size={14} className="mr-2 text-amber-600" />
                  Excel Fee Ledger (Filtered - With Dues)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportExcel('financial', 'all')} className="rounded-xl py-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <FileSpreadsheet size={14} className="mr-2 text-amber-700" />
                  Excel Master Fee Ledger (All Students)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCSV('financial', 'filtered')} className="rounded-xl py-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                  <Download size={14} className="mr-2 text-amber-600" />
                  CSV Fee Ledger (With Balances)
                </DropdownMenuItem>

                {/* Category 3: Export Selected Students (If checked) */}
                {selectedStudents.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="px-2 py-1 text-[10px] font-black tracking-widest text-indigo-700 dark:text-indigo-400 uppercase bg-indigo-50/80 dark:bg-indigo-950/40 rounded-lg mb-1 flex items-center justify-between">
                      <span>Selected Candidates</span>
                      <span className="font-black text-indigo-900 dark:text-indigo-200">{selectedStudents.length} Students</span>
                    </div>
                    <DropdownMenuItem onClick={() => handleExportPDF({ mode: 'directory', exportScope: 'selected' })} className="rounded-xl py-1.5 cursor-pointer text-xs font-bold text-indigo-900 dark:text-indigo-300">
                      <FileText size={14} className="mr-2 text-indigo-600" />
                      PDF Selected (No Fees)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportPDF({ mode: 'financial', exportScope: 'selected' })} className="rounded-xl py-1.5 cursor-pointer text-xs font-bold text-indigo-900 dark:text-indigo-300">
                      <CreditCard size={14} className="mr-2 text-indigo-600" />
                      PDF Selected (With Fees & Balances)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportExcel('financial', 'selected')} className="rounded-xl py-1.5 cursor-pointer text-xs font-semibold text-indigo-800 dark:text-indigo-300">
                      <FileSpreadsheet size={14} className="mr-2 text-indigo-600" />
                      Excel Selected (With Fees)
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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

      {/* Quick Navigation & Cohort Shortcut Ribbon */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2 mb-3">
        {/* Stream Pills & Reset Button */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Award size={11} className="text-superior-gold" /> Stream:
            </span>
            {[
              { id: "all", label: "All Streams", count: quickCohortStats.all },
              { id: "fsc", label: "Inter / FSc", count: quickCohortStats.inter.total, color: "hover:bg-emerald-50 hover:text-emerald-700", activeBg: "bg-emerald-600 text-white" },
              { id: "bs", label: "BS Degrees (4-Yr)", count: quickCohortStats.bs.total, color: "hover:bg-indigo-50 hover:text-indigo-700", activeBg: "bg-indigo-600 text-white" },
              { id: "ads", label: "ADS / ADP (2-Yr)", count: quickCohortStats.ads.total, color: "hover:bg-cyan-50 hover:text-cyan-700", activeBg: "bg-cyan-700 text-white" },
              { id: "dit", label: "D.I.T. Diploma", count: quickCohortStats.dit.total, color: "hover:bg-sky-50 hover:text-sky-700", activeBg: "bg-sky-600 text-white" },
              { id: "ukl3", label: "UK Level 3", count: quickCohortStats.ukl3.total, color: "hover:bg-purple-50 hover:text-purple-700", activeBg: "bg-purple-600 text-white" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setProgramFilter(st.id);
                  setAcademicStageFilter("all");
                  setSessionFilter("all");
                }}
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                  programFilter === st.id
                    ? (st.activeBg || "bg-slate-900 text-white border-transparent shadow-xs")
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 " + (st.color || "hover:bg-slate-100")
                )}
              >
                <span>{st.label}</span>
                <span className={cn(
                  "text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full",
                  programFilter === st.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                )}>
                  {st.count}
                </span>
              </button>
            ))}
          </div>

          {(academicStageFilter !== "all" || sessionFilter !== "all" || programFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setProgramFilter("all");
                setAcademicStageFilter("all");
                setSessionFilter("all");
              }}
              className="text-[10px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-800 transition-all cursor-pointer flex items-center gap-1 shrink-0"
            >
              <X size={12} /> Reset Quick Filter
            </button>
          )}
        </div>

        {/* Dynamic Contextual Sub-Cohort Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter size={11} className="text-superior-gold" /> Cohorts:
          </span>

          {(programFilter === "all" || programFilter === "fsc") && (
            <>
              {[
                { id: "all", label: "All Inter", count: quickCohortStats.inter.total, type: "stage" },
                { id: "p1-boys", label: "Part-1 Boys", count: quickCohortStats.inter.p1Boys, type: "stage", color: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200" },
                { id: "p1-girls", label: "Part-1 Girls", count: quickCohortStats.inter.p1Girls, type: "stage", color: "bg-pink-50 text-pink-800 border-pink-300 dark:bg-pink-950 dark:text-pink-200" },
                { id: "p2-boys", label: "Part-2 Boys", count: quickCohortStats.inter.p2Boys, type: "stage", color: "bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-200" },
                { id: "p2-girls", label: "Part-2 Girls", count: quickCohortStats.inter.p2Girls, type: "stage", color: "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200" },
                { id: "2026-28", label: "Session 2026-28 (P-1)", count: quickCohortStats.inter.sess26_28, type: "session" },
                { id: "2025-27", label: "Session 2025-27 (P-2)", count: quickCohortStats.inter.sess25_27, type: "session" },
              ].map((pill) => {
                const isActive = pill.type === "session"
                  ? sessionFilter === pill.id
                  : academicStageFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      if (programFilter === "all") setProgramFilter("fsc");
                      if (pill.type === "session") {
                        setSessionFilter(sessionFilter === pill.id ? "all" : pill.id);
                      } else {
                        setAcademicStageFilter(academicStageFilter === pill.id ? "all" : pill.id);
                      }
                    }}
                    className={cn(
                      "px-2.5 py-0.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-xs"
                        : pill.color || "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <span>{pill.label}</span>
                    <span className={cn(
                      "text-[9.5px] font-mono font-black px-1.5 py-0.1 rounded-full",
                      isActive ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-black/5 dark:bg-white/10"
                    )}>
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {programFilter === "bs" && (
            <>
              {[
                { id: "all", label: "All BS", count: quickCohortStats.bs.total, type: "stage" },
                { id: "bs-boys", label: "BS Boys Only", count: quickCohortStats.bs.bsBoys, type: "stage", color: "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200" },
                { id: "bs-girls", label: "BS Girls Only", count: quickCohortStats.bs.bsGirls, type: "stage", color: "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200" },
                { id: "bs-sem1", label: "1st Sem (Fresh)", count: quickCohortStats.bs.sem1, type: "stage", color: "bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200" },
                { id: "bs-sem5", label: "5th Sem (Lateral)", count: quickCohortStats.bs.sem5, type: "stage", color: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200" },
                { id: "bs-sem7-8", label: "Final Sem (7th/8th)", count: quickCohortStats.bs.sem7_8, type: "stage", color: "bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-200" },
                { id: "2026-30", label: "2026-30", count: quickCohortStats.bs.sess26_30, type: "session" },
                { id: "2025-29", label: "2025-29", count: quickCohortStats.bs.sess25_29, type: "session" },
                { id: "2024-28", label: "2024-28", count: quickCohortStats.bs.sess24_28, type: "session" },
                { id: "2023-27", label: "2023-27", count: quickCohortStats.bs.sess23_27, type: "session" },
                { id: "2024-26", label: "2024-26 (Lateral)", count: quickCohortStats.bs.sess24_26, type: "session" },
              ].map((pill) => {
                const isActive = pill.type === "session"
                  ? sessionFilter === pill.id
                  : academicStageFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      if (pill.type === "session") {
                        setSessionFilter(sessionFilter === pill.id ? "all" : pill.id);
                      } else {
                        setAcademicStageFilter(academicStageFilter === pill.id ? "all" : pill.id);
                      }
                    }}
                    className={cn(
                      "px-2.5 py-0.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-xs"
                        : pill.color || "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <span>{pill.label}</span>
                    <span className={cn(
                      "text-[9.5px] font-mono font-black px-1.5 py-0.1 rounded-full",
                      isActive ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-black/5 dark:bg-white/10"
                    )}>
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {programFilter === "ads" && (
            <>
              {[
                { id: "all", label: "All ADS", count: quickCohortStats.ads.total, type: "stage" },
                { id: "ads-boys", label: "ADS Boys Only", count: quickCohortStats.ads.adsBoys, type: "stage", color: "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-200" },
                { id: "ads-girls", label: "ADS Girls Only", count: quickCohortStats.ads.adsGirls, type: "stage", color: "bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-200" },
                { id: "ads-p1", label: "Part-1 (Sem 1-2)", count: quickCohortStats.ads.part1, type: "stage" },
                { id: "ads-p2", label: "Part-2 (Sem 3-4)", count: quickCohortStats.ads.part2, type: "stage" },
                { id: "2026-28", label: "Session 2026-28", count: quickCohortStats.ads.sess26_28, type: "session" },
                { id: "2025-27", label: "Session 2025-27", count: quickCohortStats.ads.sess25_27, type: "session" },
              ].map((pill) => {
                const isActive = pill.type === "session"
                  ? sessionFilter === pill.id
                  : academicStageFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      if (pill.type === "session") {
                        setSessionFilter(sessionFilter === pill.id ? "all" : pill.id);
                      } else {
                        setAcademicStageFilter(academicStageFilter === pill.id ? "all" : pill.id);
                      }
                    }}
                    className={cn(
                      "px-2.5 py-0.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-xs"
                        : pill.color || "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <span>{pill.label}</span>
                    <span className={cn(
                      "text-[9.5px] font-mono font-black px-1.5 py-0.1 rounded-full",
                      isActive ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-black/5 dark:bg-white/10"
                    )}>
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {programFilter === "dit" && (
            <>
              {[
                { id: "all", label: "All DIT", count: quickCohortStats.dit.total, type: "stage" },
                { id: "dit-boys", label: "DIT Boys", count: quickCohortStats.dit.ditBoys, type: "stage", color: "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200" },
                { id: "dit-girls", label: "DIT Girls", count: quickCohortStats.dit.ditGirls, type: "stage", color: "bg-pink-50 text-pink-800 border-pink-300 dark:bg-pink-950 dark:text-pink-200" },
                { id: "dit-p1", label: "DIT Part-1", count: quickCohortStats.dit.part1, type: "stage" },
                { id: "dit-p2", label: "DIT Part-2", count: quickCohortStats.dit.part2, type: "stage" },
                { id: "2026-27", label: "Session 2026-27 (1-Yr)", count: quickCohortStats.dit.sess26_27, type: "session" },
                { id: "2026-28", label: "Session 2026-28 (2-Yr)", count: quickCohortStats.dit.sess26_28, type: "session" },
              ].map((pill) => {
                const isActive = pill.type === "session"
                  ? sessionFilter === pill.id
                  : academicStageFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      if (pill.type === "session") {
                        setSessionFilter(sessionFilter === pill.id ? "all" : pill.id);
                      } else {
                        setAcademicStageFilter(academicStageFilter === pill.id ? "all" : pill.id);
                      }
                    }}
                    className={cn(
                      "px-2.5 py-0.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-xs"
                        : pill.color || "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <span>{pill.label}</span>
                    <span className={cn(
                      "text-[9.5px] font-mono font-black px-1.5 py-0.1 rounded-full",
                      isActive ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-black/5 dark:bg-white/10"
                    )}>
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {programFilter === "ukl3" && (
            <>
              {[
                { id: "all", label: "All UK Level 3", count: quickCohortStats.ukl3.total, type: "stage" },
                { id: "uk-boys", label: "UK L3 Boys", count: quickCohortStats.ukl3.ukBoys, type: "stage", color: "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200" },
                { id: "uk-girls", label: "UK L3 Girls", count: quickCohortStats.ukl3.ukGirls, type: "stage", color: "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200" },
                { id: "uk-yr1", label: "Year-1", count: quickCohortStats.ukl3.year1, type: "stage" },
                { id: "uk-yr2", label: "Year-2", count: quickCohortStats.ukl3.year2, type: "stage" },
                { id: "2026-28", label: "Session 2026-28", count: quickCohortStats.ukl3.sess26_28, type: "session" },
              ].map((pill) => {
                const isActive = pill.type === "session"
                  ? sessionFilter === pill.id
                  : academicStageFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      if (pill.type === "session") {
                        setSessionFilter(sessionFilter === pill.id ? "all" : pill.id);
                      } else {
                        setAcademicStageFilter(academicStageFilter === pill.id ? "all" : pill.id);
                      }
                    }}
                    className={cn(
                      "px-2.5 py-0.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-xs"
                        : pill.color || "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <span>{pill.label}</span>
                    <span className={cn(
                      "text-[9.5px] font-mono font-black px-1.5 py-0.1 rounded-full",
                      isActive ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-black/5 dark:bg-white/10"
                    )}>
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </>
          )}
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
              onClick={() => handleExportPDF({ mode: 'financial', exportScope: 'selected' })}
              size="sm"
              className="h-8 rounded-xl bg-white/20 text-white hover:bg-white/30 border border-white/20 font-bold text-[9px] uppercase tracking-wider px-3 gap-1 cursor-pointer"
              title="Download PDF Ledger for Selected Students"
            >
              <Download size={12} /> Export Selected ({selectedStudents.length})
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
              onClick={() => setIsBulkEditOpen(true)}
              size="sm"
              className="h-8 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-[9px] uppercase tracking-wider px-3 shadow-sm gap-1 flex items-center cursor-pointer"
            >
              <Edit size={12} /> Bulk Edit ({selectedStudents.length})
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
            <Button variant="destructive" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={async () => {
              if (selectedStudent) {
                const s = selectedStudent;
                setDialogType(null);
                await data.deleteStudent(s.id);
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
            key={selectedStudent.id}
            student={selectedStudent} 
            data={data} 
            onClose={() => setDialogType(null)} 
            onDelete={() => setDialogType('delete')}
          />
        )}
      </Dialog>

      {/* 3-Stage Bulk Import Wizard */}
      <BulkImportWizard
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        data={data}
        defaultProgram={programFilter === 'bs' ? 'bs' : programFilter === 'dit' ? 'dit' : programFilter === 'ukl3' ? 'ukl3' : 'inter'}
      />

      {/* Multi-Student Bulk Edit Modal */}
      <BulkEditStudentsModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedStudents={(mergedStudents || []).filter((s: Student) => selectedStudents.includes(s.id))}
        data={data}
        onSuccess={() => setSelectedStudents([])}
      />

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
                        {(() => {
                          const ledgerInstallments = student.feeLedger?.installments || [];
                          if (ledgerInstallments.length > 0) {
                            const paidCount = ledgerInstallments.filter((ins: any) => ins.status === 'Paid' || (Number(ins.paidAmount) >= Number(ins.amount) && Number(ins.amount) > 0)).length;
                            return `${paidCount} / ${student.totalInstallments || ledgerInstallments.length} Paid`;
                          }
                          const totalInst = student.totalInstallments || 12;
                          const monthly = student.monthlyFee || Math.round((student.totalPackage || 1) / totalInst);
                          const totalRec = student.feeLedger?.totalReceived || student.feeReceived || 0;
                          const paidInst = Math.min(totalInst, Math.floor(totalRec / Math.max(1, monthly)));
                          return `${paidInst} / ${totalInst} Paid`;
                        })()}
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
                        {parseDateSafe(tx.date).toLocaleDateString()}
                        {String(tx.date || '').includes('T') && (
                          <>
                            {' • '}
                            <span className="text-[10px]">{parseDateSafe(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-superior-gold/20 text-superior-teal border-none text-[9px] font-mono">
                          {tx.receiptId || (tx.id ? `REC-${String(tx.id).replace(/\D/g, '').slice(-6) || String(tx.id).slice(-6)}` : 'REC-OFFICIAL')}
                        </Badge>
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
  const initialStream = React.useMemo<'fsc' | 'bs' | 'dit' | 'ukl3'>(() => {
    const grp = (student.group || '').toLowerCase();
    const cat = (student.category || '').toLowerCase();
    if (grp.includes('bs') || grp.includes('b.s') || grp.includes('bba') || grp.includes('bachelor') || cat.includes('bs')) return 'bs';
    if (grp.includes('dit') || cat.includes('dit')) return 'dit';
    if (grp.includes('uk') || cat.includes('uk')) return 'ukl3';
    return 'fsc';
  }, [student.group, student.category]);

  const [activeTab, setActiveTab] = useState<'identity' | 'academic' | 'fee'>('identity');
  const [activeStream, setActiveStream] = useState<'fsc' | 'bs' | 'dit' | 'ukl3'>(initialStream);
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  const [formData, setFormData] = useState({
    fullName: student.fullName || '',
    fatherName: student.fatherName || '',
    collegeNo: student.collegeNo || '',
    bayFormNo: student.bayFormNo || '',
    dob: student.dob || '',
    previousClass: student.previousClass || (initialStream === 'bs' ? '12th' : '10th'),
    boardRollNo: student.boardRollNo || '',
    previousMarks: student.previousMarks !== undefined ? String(student.previousMarks) : '',
    contact: student.contact || '',
    fatherContact: student.fatherContact || (student as any).parentContact || '',
    email: student.email || '',
    bloodGroup: student.bloodGroup || '',
    gender: student.gender || 'Male',
    address: student.address || '',
    admissionFee: student.admissionFee || 0,
    miscFunds: student.miscFunds || 0,
    totalFeeFinalized: student.totalFeeFinalized || 0,
    previousArrears: (student as any).previousArrears ? Number((student as any).previousArrears) : 0,
    totalInstallments: student.totalInstallments || (initialStream === 'bs' ? 2 : 12),
    monthlyFee: student.monthlyFee || 0,
    subjects: [...(student.subjects || [])],
    category: student.category || (initialStream === 'bs' ? 'BS Semester 1st (Fresh Intake)' : 'Inter Part-1 Boys'),
    group: student.group || '',
    section: student.section || '',
    photo: student.photo || '',
    session: student.session || (initialStream === 'bs' ? '2026-30' : '2026-28'),
    sessionStartDate: student.sessionStartDate || '',
    sessionEndDate: student.sessionEndDate || '',
    academicPart: student.academicPart || 'Part-1',
    programType: student.programType || (initialStream === 'bs' ? 'Semester' : 'Yearly'),
    currentSemester: student.currentSemester || (initialStream === 'bs' ? 1 : 1),
    totalSemesters: student.totalSemesters || (initialStream === 'bs' ? 8 : 0),
    fingerprintTemplate: student.fingerprintTemplate || '',
    fingerprintFinger: student.fingerprintFinger || 'Right Thumb (دایاں انگوٹھا)',
    fingerprintEnrolledAt: student.fingerprintEnrolledAt || '',
  });

  React.useEffect(() => {
    setFormData({
      fullName: student.fullName || '',
      fatherName: student.fatherName || '',
      collegeNo: student.collegeNo || '',
      bayFormNo: student.bayFormNo || '',
      dob: student.dob || '',
      previousClass: student.previousClass || (initialStream === 'bs' ? '12th' : '10th'),
      boardRollNo: student.boardRollNo || '',
      previousMarks: student.previousMarks !== undefined ? String(student.previousMarks) : '',
      contact: student.contact || '',
      fatherContact: student.fatherContact || (student as any).parentContact || '',
      email: student.email || '',
      bloodGroup: student.bloodGroup || '',
      gender: student.gender || 'Male',
      address: student.address || '',
      admissionFee: student.admissionFee || 0,
      miscFunds: student.miscFunds || 0,
      totalFeeFinalized: student.totalFeeFinalized || 0,
      previousArrears: (student as any).previousArrears ? Number((student as any).previousArrears) : 0,
      totalInstallments: student.totalInstallments || (initialStream === 'bs' ? 2 : 12),
      monthlyFee: student.monthlyFee || 0,
      subjects: [...(student.subjects || [])],
      category: student.category || (initialStream === 'bs' ? 'BS Semester 1st (Fresh Intake)' : 'Inter Part-1 Boys'),
      group: student.group || '',
      section: student.section || '',
      photo: student.photo || '',
      session: student.session || (initialStream === 'bs' ? '2026-30' : '2026-28'),
      sessionStartDate: student.sessionStartDate || '',
      sessionEndDate: student.sessionEndDate || '',
      academicPart: student.academicPart || 'Part-1',
      programType: student.programType || (initialStream === 'bs' ? 'Semester' : 'Yearly'),
      currentSemester: student.currentSemester || (initialStream === 'bs' ? 1 : 1),
      totalSemesters: student.totalSemesters || (initialStream === 'bs' ? 8 : 0),
      fingerprintTemplate: student.fingerprintTemplate || '',
      fingerprintFinger: student.fingerprintFinger || 'Right Thumb (دایاں انگوٹھا)',
      fingerprintEnrolledAt: student.fingerprintEnrolledAt || '',
    });
    setActiveStream(initialStream);
  }, [student, initialStream]);

  const isBS = activeStream === 'bs';

  const [isScanningFP, setIsScanningFP] = useState(false);
  const [fpQuality, setFpQuality] = useState<number | null>(null);
  const [fpBmp, setFpBmp] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = (
      localStorage.getItem(`scj_fp_thumb_${student.id}`) ||
      (student.studentId ? localStorage.getItem(`scj_fp_thumb_${student.studentId}`) : null) ||
      (student.collegeNo ? localStorage.getItem(`scj_fp_thumb_${student.collegeNo}`) : null) ||
      null
    );
    if (raw && raw.length > 100 && !raw.includes("undefined") && raw.startsWith("Qk")) {
      return raw;
    }
    return null;
  });

  const streamGroups = React.useMemo(() => {
    return ACADEMIC_GROUPS.filter(g => {
      const gName = g.name.toLowerCase();
      if (activeStream === 'bs') {
        return g.type === 'Degree' || gName.includes('bs') || gName.includes('b.s') || gName.includes('bba');
      }
      if (activeStream === 'dit') {
        return g.type === 'Diploma' || gName.includes('dit');
      }
      if (activeStream === 'ukl3') {
        return g.type === 'Vocational' || gName.includes('uk');
      }
      return g.type === 'Intermediate' || (!gName.includes('bs') && !gName.includes('dit') && !gName.includes('uk'));
    });
  }, [activeStream]);

  const filteredSections = React.useMemo(() => {
    if (!data.settings?.predefinedSections) return [];
    
    return data.settings.predefinedSections.filter(sec => {
      const matchesGender = sec.gender === formData.gender || sec.gender === 'Co-ed';
      if (!matchesGender) return false;

      const sp = (sec.program || '').toLowerCase();
      let programMatch = false;
      if (activeStream === 'fsc' && (sp === 'inter' || sp.includes('inter'))) programMatch = true;
      else if (activeStream === 'bs' && (sp === 'bs program' || sp.includes('bs'))) programMatch = true;
      else if (activeStream === 'dit' && (sp === 'dit' || sp.includes('dit'))) programMatch = true;
      else if (activeStream === 'ukl3' && (sp === 'uk level 3' || sp.includes('uk'))) programMatch = true;
      else if (sp === 'other' || sp === 'all') programMatch = true;

      return matchesGender && programMatch;
    });
  }, [data.settings?.predefinedSections, formData.gender, activeStream]);

  const compulsoryForStream = React.useMemo(() => {
    if (activeStream === 'bs') {
      return ['English / Communication', 'Pakistan Studies / Ideology', 'Islamic Studies / Ethics', 'Quran Translation'];
    }
    if (activeStream === 'dit') {
      return ['ICT Fundamentals', 'English Communication'];
    }
    if (activeStream === 'ukl3') {
      return ['Academic English', 'Applied Research'];
    }
    return ['English', 'Urdu', 'Islamic Studies', 'Pakistan Studies', 'Tarjuma-tul-Quran'];
  }, [activeStream]);

  const activeGroupSubjects = React.useMemo(() => {
    const selectedGroupObj = ACADEMIC_GROUPS.find(g => g.name === formData.group);
    if (selectedGroupObj && selectedGroupObj.subjects) {
      return selectedGroupObj.subjects.filter(s => !compulsoryForStream.includes(s));
    }
    return [];
  }, [formData.group, compulsoryForStream]);

  const handleStreamChange = (stream: 'fsc' | 'bs' | 'dit' | 'ukl3') => {
    setActiveStream(stream);
    let defaultGroup = '';
    let defaultCategory = '';
    let defaultSubjects: string[] = [];
    let programType: 'Yearly' | 'Semester' = 'Yearly';
    let totalSemesters = 0;
    let currentSemester = 1;
    let totalInstallments = 12;

    if (stream === 'bs') {
      defaultGroup = 'BS Computer Science (BSCS)';
      defaultCategory = 'BS Semester 1st (Fresh Intake)';
      programType = 'Semester';
      totalSemesters = 8;
      currentSemester = 1;
      totalInstallments = 2;
      const bscsGroup = ACADEMIC_GROUPS.find(g => g.name.includes('BS Computer Science'));
      defaultSubjects = bscsGroup 
        ? Array.from(new Set(['English / Communication', 'Pakistan Studies / Ideology', 'Islamic Studies / Ethics', ...bscsGroup.subjects]))
        : ['Programming Fundamentals', 'Calculus', 'English Composition'];
    } else if (stream === 'dit') {
      defaultGroup = 'DIT';
      defaultCategory = formData.gender === 'Female' ? 'DIT Girls' : 'DIT Boys';
      programType = 'Semester';
      totalSemesters = 4;
      totalInstallments = 4;
      const ditGroup = ACADEMIC_GROUPS.find(g => g.name.includes('DIT'));
      defaultSubjects = ditGroup ? [...ditGroup.subjects] : ['Office Automation', 'Web Development'];
    } else if (stream === 'ukl3') {
      defaultGroup = 'UK Level 3';
      defaultCategory = 'UK Level 3 Year-1';
      programType = 'Semester';
      totalSemesters = 3;
      totalInstallments = 3;
      const ukGroup = ACADEMIC_GROUPS.find(g => g.name.includes('UK Level 3'));
      defaultSubjects = ukGroup ? [...ukGroup.subjects] : ['Applied Science', 'Business Analysis'];
    } else {
      defaultGroup = 'FSC (Premedical)';
      defaultCategory = formData.gender === 'Female' ? 'Inter Part-1 Girls' : 'Inter Part-1 Boys';
      programType = 'Yearly';
      totalSemesters = 0;
      totalInstallments = 12;
      const fscGroup = ACADEMIC_GROUPS.find(g => g.name.includes('Premedical'));
      defaultSubjects = fscGroup ? Array.from(new Set([...COMPULSORY_SUBJECTS, ...fscGroup.subjects])) : ['Biology', 'Physics', 'Chemistry', ...COMPULSORY_SUBJECTS];
    }

    setFormData(prev => ({
      ...prev,
      group: defaultGroup,
      category: defaultCategory,
      subjects: defaultSubjects,
      programType,
      totalSemesters,
      currentSemester,
      totalInstallments
    }));
  };

  const handleGroupChange = (groupName: string) => {
    const group = ACADEMIC_GROUPS.find(g => g.name === groupName);
    if (group) {
      const lowerGroupName = groupName.toLowerCase();
      const groupIsBS = activeStream === 'bs' || lowerGroupName.includes('bs') || lowerGroupName.includes('b.s') || lowerGroupName.includes('bba');
      const newSubjects = groupIsBS
        ? Array.from(new Set(['English / Communication', 'Pakistan Studies / Ideology', 'Islamic Studies / Ethics', ...group.subjects]))
        : Array.from(new Set([...COMPULSORY_SUBJECTS, ...group.subjects]));

      setFormData(prev => ({
        ...prev,
        group: groupName,
        subjects: newSubjects,
        programType: groupIsBS ? 'Semester' : 'Yearly',
        totalSemesters: groupIsBS ? 8 : prev.totalSemesters,
      }));
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
        toast.success("Photo updated!");
      } catch (err) {
        console.error('Photo upload error:', err);
        toast.dismiss(toastId);
        toast.error("Failed to upload photo.");
      }
    }
  };

  const handleScanThumb = async () => {
    setIsScanningFP(true);
    toast.info("Please place student's right thumb firmly on the SecuGen scanner...", { id: "secugen-edit" });
    try {
      const res = await secugenService.captureFingerprint({
        timeoutMs: 12000,
        quality: 50,
        templateFormat: "ISO",
      });
      if (res.success && res.templateBase64) {
        setFormData((prev) => ({
          ...prev,
          fingerprintTemplate: res.templateBase64,
          fingerprintFinger: "Right Thumb (دایاں انگوٹھا)",
          fingerprintEnrolledAt: new Date().toISOString(),
        }));
        setFpQuality(res.quality);
        if (res.bmpBase64) {
          setFpBmp(res.bmpBase64);
          try {
            const targetId = student.id || formData.collegeNo;
            if (targetId) localStorage.setItem(`scj_fp_thumb_${targetId}`, res.bmpBase64);
          } catch (e) {}
        }
        toast.success(`Thumb impression captured successfully! (Quality: ${res.quality}%)`, { id: "secugen-edit" });
      } else {
        toast.error(res.error || "Failed to capture fingerprint. Ensure device is plugged in.", { id: "secugen-edit" });
      }
    } catch (err: any) {
      toast.error(`Scanner error: ${err.message || String(err)}`, { id: "secugen-edit" });
    } finally {
      setIsScanningFP(false);
    }
  };

  const handleClearThumb = () => {
    setFormData((prev) => ({
      ...prev,
      fingerprintTemplate: "",
      fingerprintFinger: "",
      fingerprintEnrolledAt: "",
    }));
    setFpQuality(null);
    setFpBmp(null);
    try {
      const targetId = student.id || formData.collegeNo;
      if (targetId) localStorage.removeItem(`scj_fp_thumb_${targetId}`);
    } catch (e) {}
    toast.info("Thumb impression removed.");
  };

  const handleWhatsAppPing = () => {
    const contactRaw = formData.fatherContact || formData.contact;
    if (!contactRaw) {
      toast.error("No phone number entered for Guardian WhatsApp.");
      return;
    }
    const cleanNumber = contactRaw.replace(/\D/g, "");
    const formatted = cleanNumber.startsWith("0") 
      ? `92${cleanNumber.slice(1)}` 
      : cleanNumber.startsWith("92") 
        ? cleanNumber 
        : `92${cleanNumber}`;
    const textMsg = encodeURIComponent(
      `Assalam-o-Alaikum! Superior College Jahanian - Academic update for student ${formData.fullName} (Roll: ${formData.collegeNo || student.id}).`
    );
    window.open(`https://wa.me/${formatted}?text=${textMsg}`, "_blank");
  };

  const handleAutoSuggestRollNo = () => {
    const allRolls: number[] = [];
    (data.students || []).forEach((s: any) => {
      const num = parseInt(String(s.collegeNo || '').replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > 0) allRolls.push(num);
    });
    const next = allRolls.length > 0 ? Math.max(...allRolls) + 1 : 1001;
    setFormData(prev => ({ ...prev, collegeNo: String(next) }));
    toast.success(`Suggested Roll #: ${next}`);
  };

  const toggleSubject = (subject: string) => {
    setFormData(prev => {
      const current = prev.subjects || [];
      const updated = current.includes(subject)
        ? current.filter(s => s !== subject)
        : [...current, subject];
      return { ...prev, subjects: updated };
    });
  };

  const handleAddCustomSubject = () => {
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    if ((formData.subjects || []).includes(trimmed)) {
      toast.info("Subject already in curriculum.");
      return;
    }
    setFormData(prev => ({
      ...prev,
      subjects: [...(prev.subjects || []), trimmed]
    }));
    setCustomSubjectInput('');
    toast.success(`Added custom subject: ${trimmed}`);
  };

  const finalized = Number(formData.totalFeeFinalized || 0);
  const adm = Number(formData.admissionFee || 0);
  const misc = Number(formData.miscFunds || 0);
  const arrears = Number(formData.previousArrears || 0);
  const totalPackageFee = finalized + adm + misc + arrears;
  const installmentsCount = Number(formData.totalInstallments) || 12;
  const installmentMonthlyDues = Math.round(totalPackageFee / Math.max(1, installmentsCount));

  const paidAmount = Number(student.feeReceived || (student as any).fee_received || student.feeLedger?.totalReceived || 0);
  const remainingOutstanding = Math.max(0, totalPackageFee - paidAmount);
  const feeStatus = totalPackageFee > 0 && paidAmount >= totalPackageFee ? 'Full Paid' : paidAmount > 0 ? 'Partial Paid' : 'Unpaid';

  const handleSave = () => {
    const groupChanged = formData.group !== student.group;
    
    data.updateStudent(student.id, {
      ...formData,
      previousMarks: formData.previousMarks ? Number(formData.previousMarks) : undefined,
      totalPackage: totalPackageFee,
      previousArrears: arrears,
      monthlyFee: installmentMonthlyDues,
      totalInstallments: installmentsCount,
      fingerprintTemplate: formData.fingerprintTemplate,
      fingerprintFinger: formData.fingerprintFinger,
      fingerprintEnrolledAt: formData.fingerprintEnrolledAt,
      fatherContact: formData.fatherContact,
      'feeLedger.totalPackage': totalPackageFee
    });

    if (data?.updateFingerprintRecord && formData.fingerprintTemplate) {
      data.updateFingerprintRecord(student.id, 'student', formData.fingerprintTemplate, formData.fingerprintFinger || 'Right Thumb');
    }

    toast.success("Student profile updated successfully!");
    if (onClose) onClose();
    
    if (groupChanged) {
      toast.warning("Academic Group changed! Please review the Fee Package in Fee Manager.");
    }
  };

  const handleDelete = () => {
    if (onDelete) onDelete();
  };

  const STREAM_TABS = [
    { key: 'fsc', label: 'Intermediate HSSC', icon: School },
    { key: 'bs', label: 'BS Degree & ADP', icon: GraduationCap },
    { key: 'dit', label: 'D.I.T. Diploma', icon: Laptop },
    { key: 'ukl3', label: 'UK Level 3', icon: Building2 },
  ] as const;

  return (
    <DialogContent className="max-w-[1680px] w-[98vw] h-[92vh] max-h-[92vh] overflow-hidden flex flex-col p-0 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-none">
      {/* 1. TOP LANDSCAPE HEADER & STREAM SWITCHER */}
      <div className="bg-gradient-to-r from-superior-teal to-teal-900 text-white p-5 sm:p-6 shrink-0 border-b border-teal-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
              {formData.photo ? (
                <img src={formData.photo} alt={formData.fullName} className="w-full h-full object-cover object-[center_top]" />
              ) : (
                <User size={28} className="text-white/60" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight">
                  {formData.fullName || "Edit Student Profile"}
                </h2>
                <Badge className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5 shadow-xs">
                  Roll #{formData.collegeNo || student.collegeNo || student.id}
                </Badge>
                <span className="text-xs bg-white/15 px-2 py-0.5 rounded-full text-teal-100 font-mono">
                  ID: {student.id}
                </span>
              </div>
              <p className="text-xs text-teal-100/80 mt-1 flex items-center gap-2 flex-wrap">
                <span>{formData.gender}</span>
                <span>•</span>
                <span>{formData.category || "General Roster"}</span>
                <span>•</span>
                <span>Session: {formData.session || "2026-28"}</span>
                {formData.fingerprintTemplate ? (
                  <>
                    <span>•</span>
                    <span className="text-emerald-300 font-bold inline-flex items-center gap-1">
                      <Fingerprint size={12} /> Biometric Enrolled
                    </span>
                  </>
                ) : (
                  <>
                    <span>•</span>
                    <span className="text-amber-300 font-bold inline-flex items-center gap-1">
                      <AlertCircle size={12} /> Thumb Missing
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Stream Switcher Badges */}
          <div className="flex items-center gap-1.5 bg-black/20 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm self-start md:self-auto flex-wrap">
            {STREAM_TABS.map(st => {
              const Icon = st.icon;
              const isActive = activeStream === st.key;
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => handleStreamChange(st.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    isActive
                      ? "bg-white text-superior-teal shadow-md scale-102"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon size={13} />
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Selection Strip */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === 'identity'
                ? "bg-white text-superior-teal shadow-xs font-black"
                : "text-white/80 hover:bg-white/10"
            )}
          >
            <User size={14} />
            <span>1. Identity & Biometrics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === 'academic'
                ? "bg-white text-superior-teal shadow-xs font-black"
                : "text-white/80 hover:bg-white/10"
            )}
          >
            <GraduationCap size={14} />
            <span>2. Academic & Curriculum</span>
            <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded-full font-mono">
              {formData.subjects?.length || 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fee')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === 'fee'
                ? "bg-white text-superior-teal shadow-xs font-black"
                : "text-white/80 hover:bg-white/10"
            )}
          >
            <CreditCard size={14} />
            <span>3. Fee Ledger & Recovery</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
              remainingOutstanding > 0 ? "bg-amber-500/30 text-amber-200" : "bg-emerald-500/30 text-emerald-200"
            )}>
              {feeStatus}
            </span>
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENTS (SCROLLABLE BODY) */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
        {/* TAB 1: IDENTITY & BIOMETRICS */}
        {activeTab === 'identity' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {/* Column 1: Primary Identity Form Fields */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3.5">
              <h3 className="text-xs font-black text-superior-teal dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <User size={15} /> Student Legal Identity
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Full Name</Label>
                  <Input 
                    value={formData.fullName} 
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })} 
                    className="h-10 bg-slate-50 dark:bg-slate-900 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Father's Name</Label>
                  <Input 
                    value={formData.fatherName} 
                    onChange={e => setFormData({ ...formData, fatherName: e.target.value })} 
                    className="h-10 bg-slate-50 dark:bg-slate-900 font-bold text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">B-Form / CNIC</Label>
                    <Input 
                      value={formData.bayFormNo} 
                      onChange={e => setFormData({ ...formData, bayFormNo: e.target.value })} 
                      placeholder="36103-..." 
                      className="h-10 bg-slate-50 dark:bg-slate-900 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Date of Birth</Label>
                    <Input 
                      type="date" 
                      value={formData.dob} 
                      onChange={e => setFormData({ ...formData, dob: e.target.value })} 
                      className="h-10 bg-slate-50 dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Gender</Label>
                    <Select value={formData.gender} onValueChange={(v: any) => setFormData({ ...formData, gender: v })}>
                      <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900 text-xs font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male (Boys)</SelectItem>
                        <SelectItem value="Female">Female (Girls)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Blood Group</Label>
                    <Input 
                      value={formData.bloodGroup} 
                      onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })} 
                      placeholder="e.g. O+, B+" 
                      className="h-10 bg-slate-50 dark:bg-slate-900 uppercase text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Communication & Guardian WhatsApp Section */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3.5">
              <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare size={15} /> Guardian & WhatsApp
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Guardian WhatsApp</Label>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200">
                        <MessageSquare size={10} className="fill-emerald-500/20" /> Active
                      </span>
                      {Boolean(formData.fatherContact || formData.contact) && (
                        <button
                          type="button"
                          onClick={handleWhatsAppPing}
                          className="text-[9.5px] font-black text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 flex items-center gap-0.5 bg-emerald-100/70 px-1.5 py-0.5 rounded cursor-pointer"
                          title="Open WhatsApp chat with guardian"
                        >
                          <ExternalLink size={10} /> Ping
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
                      <MessageSquare size={14} className="fill-emerald-500/20" />
                    </div>
                    <Input 
                      value={formData.fatherContact} 
                      onChange={e => setFormData({ ...formData, fatherContact: e.target.value })} 
                      placeholder="03xx-xxxxxxx (Father WhatsApp)" 
                      className="h-10 pl-8.5 font-mono text-xs font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Student Mobile</Label>
                  <Input 
                    value={formData.contact} 
                    onChange={e => setFormData({ ...formData, contact: e.target.value })} 
                    placeholder="03xx-xxxxxxx" 
                    className="h-10 bg-slate-50 dark:bg-slate-900 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Email Address</Label>
                  <Input 
                    value={formData.email} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })} 
                    placeholder="student@example.com" 
                    className="h-10 bg-slate-50 dark:bg-slate-900 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Residential Address</Label>
                  <Input 
                    value={formData.address} 
                    onChange={e => setFormData({ ...formData, address: e.target.value })} 
                    placeholder="Street, City, Tehsil..." 
                    className="h-10 bg-slate-50 dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Column 3: Photo & Biometrics */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Fingerprint size={15} className="text-superior-teal dark:text-emerald-400" /> Photo & Biometrics
              </h3>

              {/* Photo Row */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="relative group w-18 h-18 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col items-center justify-center overflow-hidden transition-colors group-hover:border-superior-teal shadow-inner shrink-0">
                  {formData.photo ? (
                    <img src={formData.photo} alt={formData.fullName} className="w-full h-full object-cover object-[center_top]" />
                  ) : (
                    <>
                      <Camera className="text-slate-400 mb-0.5" size={18} />
                      <span className="text-[8px] text-slate-500 font-bold uppercase">No Photo</span>
                    </>
                  )}
                  <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px] font-bold">
                    <span>Change</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </label>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Student Photo</span>
                  <p className="text-[10px] text-slate-400">Passport white background</p>
                  {formData.photo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, photo: '' })}
                      className="mt-1 text-rose-600 hover:text-rose-700 text-[10px] h-6 px-1"
                    >
                      Remove Photo
                    </Button>
                  )}
                </div>
              </div>

              {/* Biometric Thumb Impression Box (SecuGen Hardware) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Thumb Impression
                  </span>
                  {formData.fingerprintTemplate && (
                    <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200">
                      Enrolled {fpQuality ? `(${fpQuality}%)` : '✅'}
                    </span>
                  )}
                </div>

                {/* Thumb Visual Frame */}
                <div className={cn(
                  "w-full h-28 rounded-2xl border-2 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 relative",
                  formData.fingerprintTemplate
                    ? "border-emerald-500 bg-slate-950 shadow-inner"
                    : isScanningFP
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40 animate-pulse text-amber-600"
                    : "border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400"
                )}>
                  {fpBmp && fpBmp.length > 100 && !fpBmp.includes("undefined") && fpBmp.startsWith("Qk") ? (
                    <img
                      src={fpBmp.startsWith("data:") ? fpBmp : `data:image/bmp;base64,${fpBmp}`}
                      alt="Fingerprint"
                      className="w-full h-full object-contain p-2 filter contrast-125 brightness-110 drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]"
                      onError={() => setFpBmp(null)}
                    />
                  ) : formData.fingerprintTemplate ? (
                    <div className="w-full h-full flex flex-col items-center justify-center relative p-2 bg-gradient-to-b from-slate-950 to-slate-900">
                      <svg
                        viewBox="0 0 40 48"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-12 h-16 text-emerald-400 stroke-current opacity-90 drop-shadow-[0_0_3px_rgba(52,211,153,0.5)]"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      >
                        <path d="M7 26 C7 14, 33 14, 33 26 C33 34, 28 40, 26 43" />
                        <path d="M12 26 C12 18, 28 18, 28 26 C28 35, 23 38, 20 44" />
                        <path d="M16 26 C16 21, 24 21, 24 26 C24 33, 21 37, 20 40" />
                        <path d="M19 26 C19 23, 21 23, 21 26 C21 30, 20 33, 20 36" />
                        <path d="M4 29 C4 18, 12 8, 20 8 C28 8, 36 18, 36 29" />
                        <path d="M4 35 C5 39, 9 43, 15 44" />
                        <path d="M36 35 C35 39, 31 43, 25 44" />
                      </svg>
                      <span className="text-[9.5px] font-black uppercase text-emerald-300 tracking-wider mt-0.5">
                        Biometric Verified
                      </span>
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                    </div>
                  ) : isScanningFP ? (
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      <Fingerprint size={32} className="text-amber-500 animate-bounce mb-1" />
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 animate-pulse">
                        Place Thumb on SecuGen...
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      <Fingerprint size={30} className="text-slate-300 dark:text-slate-600 mb-1" />
                      <span className="text-[10px] font-bold text-slate-400">Thumb Not Scanned</span>
                    </div>
                  )}
                </div>

                {/* Thumb Action Buttons */}
                <div className="flex items-center gap-2 w-full mt-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isScanningFP}
                    onClick={handleScanThumb}
                    className="flex-1 h-8.5 rounded-xl bg-superior-teal hover:bg-superior-teal/90 text-white font-bold text-xs gap-1.5 shadow-xs"
                  >
                    <Fingerprint size={13} />
                    {isScanningFP ? "Scanning..." : formData.fingerprintTemplate ? "Rescan Thumb" : "Scan Thumb"}
                  </Button>
                  {formData.fingerprintTemplate && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleClearThumb}
                      className="h-8.5 w-8.5 p-0 rounded-xl text-rose-600 hover:bg-rose-50 border-rose-200"
                      title="Clear Thumb Impression"
                    >
                      <Trash2 size={13} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACADEMIC & CURRICULUM */}
        {activeTab === 'academic' && (
          <div className="space-y-6">
            {/* Top Academic Placement Grid */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-superior-teal dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <GraduationCap size={15} /> Academic Placement & Program
                </h3>
                <Badge className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                  Active Stream: {activeStream.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Academic Group / Degree</Label>
                  <Select value={formData.group} onValueChange={handleGroupChange}>
                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900 font-semibold"><SelectValue placeholder="Select Group" /></SelectTrigger>
                    <SelectContent>
                      {streamGroups.map(group => (
                        <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Section Assignment</Label>
                  <Select value={formData.section || ""} onValueChange={v => setFormData({ ...formData, section: v })}>
                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900 font-semibold"><SelectValue placeholder="Select Section" /></SelectTrigger>
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
                      className="mt-2 h-9 text-xs" 
                      placeholder="Enter manual section name" 
                      onChange={e => setFormData({ ...formData, section: e.target.value.toUpperCase() })} 
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Academic Session</Label>
                  <Select value={formData.session} onValueChange={v => setFormData({ ...formData, session: v })}>
                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900 font-semibold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CANONICAL_SESSIONS.map((sess) => (
                        <SelectItem key={sess} value={sess} className="font-mono font-bold">
                          {sess}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Academic Stage / Current Semester */}
                {isBS ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Current Semester (موجودہ سمسٹر)</Label>
                    <Select
                      value={String(formData.currentSemester || 1)}
                      onValueChange={(v) => {
                        const sem = Number(v);
                        const suffix = sem === 1 ? '1st' : sem === 2 ? '2nd' : sem === 3 ? '3rd' : `${sem}th`;
                        setFormData(prev => ({
                          ...prev,
                          currentSemester: sem,
                          academicPart: sem > 4 ? "Part-2" : "Part-1",
                          category: `BS Semester ${suffix}${sem === 1 ? ' (Fresh Intake)' : sem === 5 ? ' (ADP Lateral Entry)' : ''}`
                        }));
                      }}
                    >
                      <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900 font-bold text-superior-teal"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                          <SelectItem key={s} value={String(s)}>
                            Semester {s} {s === 1 ? '(Fresh Intake)' : s === 5 ? '(ADP Lateral Entry 5th)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Academic Stage</Label>
                    <Select value={formData.academicPart || "Part-1"} onValueChange={v => setFormData({ ...formData, academicPart: v as any })}>
                      <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900 font-semibold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Part-1">Part-1 (First Year)</SelectItem>
                        <SelectItem value="Part-2">Part-2 (Second Year)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">College Roll #</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={formData.collegeNo} 
                      onChange={e => setFormData({ ...formData, collegeNo: e.target.value })} 
                      placeholder="Roll #"
                      className="h-10 bg-slate-50 dark:bg-slate-900 font-bold font-mono"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleAutoSuggestRollNo}
                      className="h-10 px-3 text-xs text-superior-teal font-bold shrink-0"
                    >
                      Auto
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {isBS ? "Previous Qualification" : "Previous Class"}
                  </Label>
                  <Select value={formData.previousClass || (isBS ? "12th" : "10th")} onValueChange={v => setFormData({ ...formData, previousClass: v as any })}>
                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900 font-semibold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {isBS ? (
                        <>
                          <SelectItem value="12th">12th Class (F.Sc / ICS / I.Com - Part 2)</SelectItem>
                          <SelectItem value="ADP">ADP / B.Sc (Lateral Entry)</SelectItem>
                          <SelectItem value="11th">11th Class (Inter Part-1)</SelectItem>
                          <SelectItem value="DAE">DAE (3-Year Technical Diploma)</SelectItem>
                          <SelectItem value="10th">10th Class (Matric)</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="10th">10th Class (Matric SSC)</SelectItem>
                          <SelectItem value="9th">9th Class</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {isBS ? "Obtained Marks (Inter / ADP)" : "SSC / Matric Marks"}
                  </Label>
                  <Input 
                    type="number" 
                    value={formData.previousMarks} 
                    onChange={e => setFormData({ ...formData, previousMarks: e.target.value })} 
                    placeholder="Marks" 
                    className="h-10 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {isBS ? "Uni / Board Roll #" : "Board Roll #"}
                  </Label>
                  <Input 
                    value={formData.boardRollNo} 
                    onChange={e => setFormData({ ...formData, boardRollNo: e.target.value })} 
                    placeholder="Board Roll #" 
                    className="h-10 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Admission Category</Label>
                  <Input 
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })} 
                    className="h-10 bg-slate-50 dark:bg-slate-900 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Stream-Isolated Curriculum & Subjects Deck */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-superior-teal dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <BookOpen size={15} /> Curriculum & Subjects ({formData.subjects?.length || 0} Enrolled)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Stream-isolated curriculum. 1-click toggle to add or drop subjects from student's active semester/year.
                  </p>
                </div>
                <Badge className="bg-superior-teal/10 text-superior-teal dark:text-emerald-300 font-mono text-xs px-2.5 py-0.5">
                  {formData.group || "Custom"}
                </Badge>
              </div>

              {/* Compulsory Subjects Section */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Compulsory Subjects / لازمی مضامین
                </span>
                <div className="flex flex-wrap gap-2">
                  {compulsoryForStream.map(subj => {
                    const isSelected = (formData.subjects || []).includes(subj);
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => toggleSubject(subj)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-2xs"
                            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check size={12} className="text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                        <span>{subj}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Elective & Major Subjects Section */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Major Group Electives / اختیاری مضامین ({formData.group})
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeGroupSubjects.map(subj => {
                    const isSelected = (formData.subjects || []).includes(subj);
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => toggleSubject(subj)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-800 dark:text-indigo-300 shadow-2xs"
                            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check size={12} className="text-indigo-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                        <span>{subj}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Other Active Subjects Not in Compulsory or Group (e.g. ad-hoc/transferred) */}
              {(() => {
                const otherActive = (formData.subjects || []).filter(
                  s => !compulsoryForStream.includes(s) && !activeGroupSubjects.includes(s)
                );
                if (otherActive.length === 0) return null;
                return (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Additional Enrolled Electives
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {otherActive.map(subj => (
                        <div
                          key={subj}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 flex items-center gap-1.5"
                        >
                          <Check size={12} className="text-amber-700" />
                          <span>{subj}</span>
                          <button
                            type="button"
                            onClick={() => toggleSubject(subj)}
                            className="ml-1 text-amber-600 hover:text-amber-900 cursor-pointer"
                            title="Remove Subject"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Add Custom Elective Input */}
              <div className="pt-2 flex items-center gap-2 max-w-md">
                <Input
                  value={customSubjectInput}
                  onChange={e => setCustomSubjectInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomSubject(); } }}
                  placeholder="Add custom elective subject..."
                  className="h-9 text-xs bg-slate-50 dark:bg-slate-900"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustomSubject}
                  className="h-9 px-3 rounded-xl bg-superior-teal hover:bg-superior-teal/90 text-white font-bold text-xs gap-1 shrink-0"
                >
                  <Plus size={13} /> Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FEE LEDGER & RECOVERY */}
        {activeTab === 'fee' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 8 Cols: Fee Configuration Inputs */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-superior-teal dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard size={15} /> Fee Package Structure & Breakdown
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500">
                    {isBS ? "BS 4-Year Semester Billing" : "Intermediate Installment Plan"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {isBS ? "Semester Tuition Fee (Rs.)" : "Tuition Fee Finalized (Rs.)"}
                    </Label>
                    <Input 
                      type="number" 
                      value={formData.totalFeeFinalized || ""} 
                      onChange={e => setFormData({ ...formData, totalFeeFinalized: Number(e.target.value) })} 
                      className="h-10 bg-slate-50 dark:bg-slate-900 font-bold font-mono text-superior-teal text-base"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        Previous Arrears / پچھلا بقایا جات (Rs.)
                      </Label>
                      <span className="text-[9px] bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-black border border-amber-200 dark:border-amber-800">
                        Bakaya-jat
                      </span>
                    </div>
                    <Input 
                      type="number" 
                      placeholder="0"
                      value={formData.previousArrears || ""} 
                      onChange={e => setFormData({ ...formData, previousArrears: Number(e.target.value) })} 
                      className="h-10 bg-slate-50 dark:bg-slate-900 font-bold font-mono text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Admission Fee (Rs.)</Label>
                    <Input 
                      type="number" 
                      value={formData.admissionFee || ""} 
                      onChange={e => setFormData({ ...formData, admissionFee: Number(e.target.value) })} 
                      className="h-10 bg-slate-50 dark:bg-slate-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Misc Funds / Registration (Rs.)</Label>
                    <Input 
                      type="number" 
                      value={formData.miscFunds || ""} 
                      onChange={e => setFormData({ ...formData, miscFunds: Number(e.target.value) })} 
                      className="h-10 bg-slate-50 dark:bg-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Total Installments Plan</Label>
                    <Select 
                      value={String(formData.totalInstallments || (isBS ? 2 : 12))} 
                      onValueChange={v => setFormData({ ...formData, totalInstallments: Number(v) })}
                    >
                      <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900 font-semibold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                          <SelectItem key={num} value={String(num)}>
                            {num} Installment{num > 1 ? 's' : ''} {isBS && num === 2 ? '(Standard Semester Plan)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Monthly / Installment Dues (Auto-Calc)</Label>
                    <div className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center font-black font-mono text-superior-teal text-base">
                      Rs. {installmentMonthlyDues.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 4 Cols: Master Financial Summary Card */}
              <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">
                      Ledger Overview
                    </span>
                    <Badge className={cn(
                      "font-black text-[10px] px-2 py-0.5",
                      feeStatus === 'Full Paid' ? "bg-emerald-500 text-white" : feeStatus === 'Partial Paid' ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
                    )}>
                      {feeStatus}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Total Finalized Package</p>
                      <p className="text-2xl font-black font-mono text-white mt-0.5">
                        Rs. {totalPackageFee.toLocaleString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-bold uppercase text-emerald-400">Paid to Date</p>
                        <p className="text-lg font-black font-mono text-emerald-300 mt-0.5">
                          Rs. {paidAmount.toLocaleString()}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-bold uppercase text-amber-400">Remaining Due</p>
                        <p className="text-lg font-black font-mono text-amber-300 mt-0.5">
                          Rs. {remainingOutstanding.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Installments:</span>
                    <span className="font-bold text-white">{installmentsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rate / Dues:</span>
                    <span className="font-bold text-white">Rs. {installmentMonthlyDues.toLocaleString()}</span>
                  </div>
                  {arrears > 0 && (
                    <div className="flex justify-between text-amber-300">
                      <span>Included Arrears:</span>
                      <span className="font-bold">Rs. {arrears.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM LANDSCAPE ACTION BAR */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <Button
          type="button"
          variant="ghost"
          onClick={handleDelete}
          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold gap-1.5"
        >
          <Trash2 size={16} /> Delete Student Record
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs font-bold rounded-xl h-10 px-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-superior-teal hover:bg-superior-teal/90 text-white font-bold text-xs rounded-xl h-10 px-6 gap-2 shadow-md cursor-pointer"
          >
            <Check size={16} /> Save Changes
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
