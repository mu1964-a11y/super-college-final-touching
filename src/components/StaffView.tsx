
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Eye, 
  Plus,
  User,
  Briefcase,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Download,
  Users,
  Camera,
  Trash2,
  AlertCircle,
  CreditCard,
  Printer,
  FileSpreadsheet,
  Upload,
  Clock,
  Smartphone,
  Send,
  Loader2,
  CheckCircle2,
  X,
  Fingerprint,
  BookOpen,
  FileText
} from 'lucide-react';
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
  DialogTrigger,
  DialogClose,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Staff, StaffRole } from '../types';
import { 
  STAFF_ROLES, 
  ADDITIONAL_PORTFOLIOS, 
  PAKISTAN_QUALIFICATIONS_PRESETS, 
  POPULAR_FACULTY_DEGREES 
} from '../constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { compressImage, base64ToBlob } from '../lib/imageUtils';
import { sendStaffPhotoRequestNotice, dispatchBulkStaffPhotoRequests, buildStaffPhotoRequestMessage } from '../lib/whatsappAutomation';
import WhatsAppReportModal, { ReportRecipientItem } from './WhatsAppReportModal';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import StaffAttendance from './StaffAttendance';
import StaffPayroll from './StaffPayroll';
import StaffSubjects from './StaffSubjects';
import StaffTimetable from './StaffTimetable';
import ExecutiveIDCardModal from './ExecutiveIDCardModal';
import BiometricEnrollmentModal from './BiometricEnrollmentModal';
import InstantBiometricVerifyModal from './InstantBiometricVerifyModal';
import StaffSalarySlipModal from './StaffSalarySlipModal';
import StaffJoiningDossierModal from './StaffJoiningDossierModal';
import StaffDutyRoster from './StaffDutyRoster';

export default function StaffView({ data, initialFilter, title, hideNavigation }: { data: any, initialFilter?: string | null, title?: string, hideNavigation?: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(
    ['all', 'Management', 'Academic', 'Administration', 'Support'].includes(initialFilter || 'all') 
      ? (initialFilter || 'all') 
      : 'all'
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [biometricTargetStaff, setBiometricTargetStaff] = useState<Staff | null>(null);
  const [isSpotCheckOpen, setIsSpotCheckOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'profile' | 'edit' | 'delete' | 'bulkDelete' | null>(null);
  const [cardStaffMember, setCardStaffMember] = useState<Staff | null>(null);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [selectedDossierStaff, setSelectedDossierStaff] = useState<Staff | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const [activeModule, setActiveModule] = useState<'directory' | 'attendance' | 'payroll' | 'timetable' | 'subjects' | 'roster'>(
    ['directory', 'attendance', 'payroll', 'timetable', 'subjects', 'roster'].includes(initialFilter as string) 
      ? (initialFilter as any) 
      : 'directory'
  );

  // Biometric Photo Filter & WhatsApp Collection State
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with-photo' | 'missing-photo'>('all');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isBulkSendingPhotos, setIsBulkSendingPhotos] = useState(false);
  const [bulkPhotoProgress, setBulkPhotoProgress] = useState({ done: 0, total: 0 });

  // Bulk WhatsApp Report Modal State
  const [isBulkStaffModalOpen, setIsBulkStaffModalOpen] = useState(false);
  const [bulkStaffModalProps, setBulkStaffModalProps] = useState<{
    title: string;
    subtitle: string;
    category: "staff_photos";
    items: ReportRecipientItem[];
  }>({
    title: "",
    subtitle: "",
    category: "staff_photos",
    items: [],
  });

  const staffWithoutPhotos = React.useMemo(() => {
    return (data.staff || []).filter((s: Staff) => {
      const p = s.photo || (s as any).photo_url;
      return !p || String(p).trim().length <= 5;
    });
  }, [data.staff]);

  const staffWithPhotos = React.useMemo(() => {
    return (data.staff || []).filter((s: Staff) => {
      const p = s.photo || (s as any).photo_url;
      return Boolean(p && String(p).trim().length > 5);
    });
  }, [data.staff]);

  const handleSendSinglePhotoRequest = async (staff: Staff) => {
    await sendStaffPhotoRequestNotice(staff, data?.settings);
  };

  const handleSendBulkPhotoRequests = () => {
    if (staffWithoutPhotos.length === 0) {
      toast.info('All staff members have profile photos!');
      return;
    }
    const items: ReportRecipientItem[] = staffWithoutPhotos.map((s: Staff) => {
      const msg = buildStaffPhotoRequestMessage(s, data?.settings);
      return {
        id: s.id,
        student: s,
        name: s.fullName || 'Faculty Member',
        phone: s.contact || (s as any).phone || '',
        rollNo: s.id || 'Staff',
        className: s.role || 'Faculty Member',
        message: msg,
        statusBadge: 'Missing Photo',
      };
    });

    setBulkStaffModalProps({
      title: 'Request Faculty Profile Photos (Bulk)',
      subtitle: `${items.length} Faculty Members Missing Gate Biometric Photos`,
      category: 'staff_photos',
      items,
    });
    setIsBulkStaffModalOpen(true);
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

  const handleExportPDF = async ({
    mode = 'directory',
    exportAll = false
  }: {
    mode: 'directory' | 'payroll';
    exportAll?: boolean;
  }) => {
    const listToExport: Staff[] = exportAll ? (data.staff || []) : filteredStaff;
    if (!listToExport || listToExport.length === 0) {
      toast.error("No staff records found to export!");
      return;
    }

    const toastId = toast.loading(`Generating official ${mode === 'payroll' ? 'Payroll Master Sheet' : 'Faculty Directory'} PDF...`);

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
      const docTitle = mode === 'payroll'
        ? "EXECUTIVE STAFF REMUNERATION & PAYROLL MASTER SHEET"
        : "OFFICIAL FACULTY & STAFF PROFILE DIRECTORY";
      doc.text(docTitle, textStartX, 36);

      // Sub-metadata Line
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(226, 232, 240); // Silver slate
      const sessionLabel = "Session 2026-28";
      const campusName = (data?.settings?.campusName || "Jahanian Campus").toUpperCase();
      const dateFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const metaText = `Campus: ${campusName}  |  ${sessionLabel}  |  Scope: ${exportAll ? 'Full College Roster' : 'Filtered Selection'}  |  Total Employees: ${listToExport.length}  |  Issued: ${dateFormatted}`;
      doc.text(metaText, textStartX, 50);

      // Right Badge Pill
      const badgeW = 120;
      const badgeH = 22;
      const badgeX = pageWidth - badgeW - 24;
      const badgeY = 21;
      if (mode === 'payroll') {
        doc.setFillColor(153, 27, 27); // Rich Burgundy
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, 'F');
        doc.setDrawColor(254, 202, 202);
        doc.setLineWidth(0.8);
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text("STRICTLY CONFIDENTIAL", badgeX + badgeW / 2, badgeY + 14, { align: 'center' });
      } else {
        doc.setFillColor(8, 90, 78); // Teal
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, 'F');
        doc.setDrawColor(212, 175, 55); // Gold
        doc.setLineWidth(0.8);
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(212, 175, 55);
        doc.text("OFFICIAL DIRECTORY", badgeX + badgeW / 2, badgeY + 14, { align: 'center' });
      }

      // 3. Prepare Columns & Table Data
      const totalPayroll = listToExport.reduce((acc, s) => acc + (Number(s.baseSalary) || Number(s.salary) || 0), 0);

      let head: string[][] = [];
      let body: any[][] = [];
      let columnStyles: Record<string | number, any> = {};

      if (mode === 'directory') {
        // General Directory - NO SALARY COLUMN
        head = [[
          'Sr #',
          'Staff ID',
          'Full Name',
          'Father Name',
          'Designations & Roles',
          'Assigned Subjects',
          'Qualification',
          'CNIC',
          'Contact',
          'Joining Date',
          'Biometric Access'
        ]];

        body = listToExport.map((staff: Staff, idx: number) => {
          const secondary = staff.secondaryRole || (staff.designation && staff.designation.includes('&') ? staff.designation.split('&')[1].trim() : '');
          const fullDesig = staff.designation || (secondary ? `${staff.role} & ${secondary}` : staff.role);
          const subjectsStr = staff.subjects && staff.subjects.length > 0 ? staff.subjects.join(', ') : 'N/A';
          return [
            (idx + 1).toString(),
            staff.id,
            staff.fullName,
            staff.fatherName || 'N/A',
            fullDesig,
            subjectsStr,
            staff.qualification || 'N/A',
            staff.cnic || 'N/A',
            staff.contact || 'N/A',
            staff.joinDate || 'Official',
            staff.fingerprintTemplate ? 'Enrolled' : 'Missing'
          ];
        });

        columnStyles = {
          0: { cellWidth: 26, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
          1: { cellWidth: 55, halign: 'center', fontStyle: 'bold', textColor: [6, 78, 67] },
          2: { cellWidth: 95, halign: 'left', fontStyle: 'bold', textColor: [15, 23, 42] },
          3: { cellWidth: 85, halign: 'left', textColor: [51, 65, 85] },
          4: { cellWidth: 105, halign: 'left', textColor: [30, 41, 59] },
          5: { cellWidth: 100, halign: 'left', textColor: [71, 85, 105] },
          6: { cellWidth: 85, halign: 'left', textColor: [71, 85, 105] },
          7: { cellWidth: 78, halign: 'center', textColor: [51, 65, 85] },
          8: { cellWidth: 68, halign: 'center', textColor: [51, 65, 85] },
          9: { cellWidth: 54, halign: 'center', textColor: [71, 85, 105] },
          10: { cellWidth: 55, halign: 'center' }
        };
      } else {
        // Executive Payroll Sheet - WITH SALARY & SIGNATURE
        head = [[
          'Sr #',
          'Staff ID',
          'Full Name',
          'Father Name',
          'Designations & Roles',
          'Qualification',
          'Contact Number',
          'Joining Date',
          'Base Salary (PKR)',
          'Biometric',
          'Receiver Signature'
        ]];

        body = listToExport.map((staff: Staff, idx: number) => {
          const secondary = staff.secondaryRole || (staff.designation && staff.designation.includes('&') ? staff.designation.split('&')[1].trim() : '');
          const fullDesig = staff.designation || (secondary ? `${staff.role} & ${secondary}` : staff.role);
          const salaryVal = Number(staff.baseSalary) || Number(staff.salary) || 0;
          return [
            (idx + 1).toString(),
            staff.id,
            staff.fullName,
            staff.fatherName || 'N/A',
            fullDesig,
            staff.qualification || 'N/A',
            staff.contact || 'N/A',
            staff.joinDate || 'Official',
            `Rs. ${salaryVal.toLocaleString()}`,
            staff.fingerprintTemplate ? 'Enrolled' : 'Missing',
            '..................................'
          ];
        });

        columnStyles = {
          0: { cellWidth: 26, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
          1: { cellWidth: 55, halign: 'center', fontStyle: 'bold', textColor: [6, 78, 67] },
          2: { cellWidth: 100, halign: 'left', fontStyle: 'bold', textColor: [15, 23, 42] },
          3: { cellWidth: 90, halign: 'left', textColor: [51, 65, 85] },
          4: { cellWidth: 120, halign: 'left', textColor: [30, 41, 59] },
          5: { cellWidth: 85, halign: 'left', textColor: [71, 85, 105] },
          6: { cellWidth: 70, halign: 'center', textColor: [51, 65, 85] },
          7: { cellWidth: 55, halign: 'center', textColor: [71, 85, 105] },
          8: { cellWidth: 80, halign: 'right', fontStyle: 'bold', textColor: [6, 95, 70] },
          9: { cellWidth: 55, halign: 'center' },
          10: { cellWidth: 65, halign: 'center', textColor: [148, 163, 184] }
        };
      }

      const biometricColIndex = mode === 'directory' ? 10 : 9;

      // 4. Render AutoTable
      autoTable(doc, {
        startY: 72,
        head,
        body,
        foot: mode === 'payroll' ? [[
          { 
            content: 'TOTAL MONTHLY PAYROLL BUDGET (PKR):', 
            colSpan: 8, 
            styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8 } 
          },
          { 
            content: `Rs. ${totalPayroll.toLocaleString()}`, 
            styles: { halign: 'right', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [6, 95, 70], fontSize: 8.5 } 
          },
          { 
            content: '', 
            colSpan: 2, 
            styles: { fillColor: [241, 245, 249] } 
          }
        ]] : undefined,
        theme: 'grid',
        styles: {
          fontSize: 7.2,
          cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
          lineColor: [226, 232, 240], // delicate silver border
          lineWidth: 0.4,
          overflow: 'linebreak',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [6, 78, 67], // Superior Teal
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
          cellPadding: { top: 5, bottom: 5, left: 3, right: 3 },
          lineColor: [212, 175, 55], // Gold bottom border line
          lineWidth: { bottom: 1.5, top: 0, left: 0, right: 0 }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Slate-50 alternating row
        },
        columnStyles,
        margin: { left: 20, right: 20, bottom: 45 },
        didDrawCell: (hookData) => {
          // Draw modern status pill badge in Biometric column
          if (hookData.section === 'body' && hookData.column.index === biometricColIndex) {
            const { x, y, width, height } = hookData.cell;
            const isEnrolled = hookData.cell.raw === 'Enrolled';
            const badgeW = 48;
            const badgeH = 13;
            const badgeX = x + (width - badgeW) / 2;
            const badgeY = y + (height - badgeH) / 2;

            if (isEnrolled) {
              // Soft emerald pill
              doc.setFillColor(236, 253, 245);
              doc.setDrawColor(167, 243, 208);
              doc.setLineWidth(0.5);
              doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3, 3, 'FD');

              // Emerald indicator dot
              doc.setFillColor(16, 185, 129);
              doc.circle(badgeX + 6, badgeY + 6.5, 2.2, 'F');

              // Text
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.8);
              doc.setTextColor(6, 95, 70);
              doc.text("Enrolled", badgeX + 13, badgeY + 9.5);
            } else {
              // Soft rose pill
              doc.setFillColor(254, 242, 242);
              doc.setDrawColor(254, 202, 202);
              doc.setLineWidth(0.5);
              doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3, 3, 'FD');

              // Rose indicator dot
              doc.setFillColor(239, 68, 68);
              doc.circle(badgeX + 6, badgeY + 6.5, 2.2, 'F');

              // Text
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.8);
              doc.setTextColor(185, 28, 28);
              doc.text("Missing", badgeX + 13, badgeY + 9.5);
            }
          }
        }
      });

      // 5. Add Verification Signature Blocks on the last page
      const finalY = (doc as any).lastAutoTable?.finalY || 400;
      const remainingSpace = pageHeight - finalY;
      
      if (remainingSpace < 75) {
        doc.addPage();
      }

      const sigY = remainingSpace < 75 ? 60 : finalY + 28;
      const sigBoxW = 180;
      const spacing = (pageWidth - 40 - (sigBoxW * 3)) / 2;

      const sigs = [
        { label: "Prepared By", desig: "Accounts & Payroll Officer" },
        { label: "Verified By", desig: "Admin / HR Coordinator" },
        { label: "Approved & Signed By", desig: "Principal / Executive Director" }
      ];

      sigs.forEach((sig, i) => {
        const sigX = 20 + i * (sigBoxW + spacing);
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.6);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(sigX + 10, sigY + 20, sigX + sigBoxW - 10, sigY + 20);
        doc.setLineDashPattern([], 0);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text(sig.label, sigX + sigBoxW / 2, sigY + 30, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(sig.desig, sigX + sigBoxW / 2, sigY + 40, { align: 'center' });
      });

      // 6. Universal Header / Footer numbering across all pages
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(20, pageHeight - 22, pageWidth - 20, pageHeight - 22);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text("SCJ Management System LMS • Official College Administration Record • Superior College Jahanian", 20, pageHeight - 11);

        if (mode === 'payroll') {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(185, 28, 28);
          doc.text("CONFIDENTIAL PAYROLL DOCUMENT — UNAUTHORIZED SHARING PROHIBITED", pageWidth / 2, pageHeight - 11, { align: 'center' });
        }

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth - 20, pageHeight - 11, { align: 'right' });
      }

      // 7. Save Document
      const fileName = mode === 'payroll'
        ? `Staff_Payroll_Sheet_${exportAll ? 'Full' : 'Filtered'}_${new Date().toISOString().split('T')[0]}.pdf`
        : `Staff_Directory_${exportAll ? 'Full' : 'Filtered'}_${new Date().toISOString().split('T')[0]}.pdf`;

      doc.save(fileName);
      toast.dismiss(toastId);
      toast.success(`Exported ${listToExport.length} staff records (${mode === 'payroll' ? 'Payroll Master Sheet' : 'Official Directory'})!`);
    } catch (err: any) {
      console.error("Staff PDF export error:", err);
      toast.dismiss(toastId);
      toast.error("Failed to generate PDF document.");
    }
  };

  const handleExportExcel = (exportAll: boolean = false, includeSalary: boolean = false) => {
    const listToExport: Staff[] = exportAll ? (data.staff || []) : filteredStaff;
    if (!listToExport || listToExport.length === 0) {
      toast.error("No staff records found to export!");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(listToExport.map((staff: Staff, idx: number) => {
      const secondary = staff.secondaryRole || (staff.designation && staff.designation.includes('&') ? staff.designation.split('&')[1].trim() : '');
      const fullDesig = staff.designation || (secondary ? `${staff.role} & ${secondary}` : staff.role);
      
      const record: Record<string, any> = {
        "Sr #": idx + 1,
        "Staff ID": staff.id,
        "Full Name": staff.fullName,
        "Father Name": staff.fatherName || "",
        "Primary Role": staff.role || "",
        "Secondary Role": secondary || "",
        "Full Designation": fullDesig,
        "Assigned Subjects": (staff.subjects || []).join(", "),
        "Qualification": staff.qualification || "",
        "CNIC Number": staff.cnic || "",
        "Contact Number": staff.contact || "",
        "Date of Joining": staff.joinDate || "",
        "Date of Birth": staff.dob || "",
        "Residential Address": staff.address || ""
      };

      if (includeSalary) {
        record["Monthly Base Salary (Rs)"] = Number(staff.baseSalary) || Number(staff.salary) || 0;
      }

      record["Biometric Enrolled"] = staff.fingerprintTemplate ? "Yes" : "No";
      record["Registered Finger"] = staff.fingerprintFinger || "";
      record["Account Status"] = staff.status;

      return record;
    }));
    
    const wb = XLSX.utils.book_new();
    const sheetTitle = includeSalary ? "Staff Payroll" : "Staff Directory";
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
    
    const fileName = includeSalary
      ? `Staff_Payroll_Sheet_${exportAll ? 'All' : 'Filtered'}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `Staff_Directory_General_${exportAll ? 'All' : 'Filtered'}_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(wb, fileName);
    toast.success(`Exported ${listToExport.length} staff records to Excel (${sheetTitle})!`);
  };

  const handleExportCSV = (exportAll: boolean = false, includeSalary: boolean = false) => {
    const listToExport: Staff[] = exportAll ? (data.staff || []) : filteredStaff;
    if (!listToExport || listToExport.length === 0) {
      toast.error("No staff records found to export!");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(listToExport.map((staff: Staff, idx: number) => {
      const secondary = staff.secondaryRole || (staff.designation && staff.designation.includes('&') ? staff.designation.split('&')[1].trim() : '');
      const fullDesig = staff.designation || (secondary ? `${staff.role} & ${secondary}` : staff.role);
      
      const record: Record<string, any> = {
        "Sr #": idx + 1,
        "Staff ID": staff.id,
        "Full Name": staff.fullName,
        "Father Name": staff.fatherName || "",
        "Primary Role": staff.role || "",
        "Secondary Role": secondary || "",
        "Full Designation": fullDesig,
        "Assigned Subjects": (staff.subjects || []).join(", "),
        "Qualification": staff.qualification || "",
        "CNIC Number": staff.cnic || "",
        "Contact Number": staff.contact || "",
        "Date of Joining": staff.joinDate || "",
        "Date of Birth": staff.dob || "",
        "Residential Address": staff.address || ""
      };

      if (includeSalary) {
        record["Monthly Base Salary (Rs)"] = Number(staff.baseSalary) || Number(staff.salary) || 0;
      }

      record["Biometric Enrolled"] = staff.fingerprintTemplate ? "Yes" : "No";
      record["Registered Finger"] = staff.fingerprintFinger || "";
      record["Account Status"] = staff.status;

      return record;
    }));
    
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Staff_Export_${includeSalary ? 'Payroll' : 'Directory'}_${exportAll ? 'All' : 'Filtered'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${listToExport.length} staff records to CSV!`);
  };

  const handleDownloadTemplate = () => {
    const template = [{
      "Staff ID": "SGC-T-001",
      "Full Name": "John Doe",
      "Father Name": "Richard Doe",
      "CNIC": "12345-1234567-1",
      "Contact": "03001234567",
      "Role": "Lecturer",
      "Status": "Active",
      "Join Date": new Date().toISOString().split('T')[0],
      "Salary": 50000
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff_Template");
    XLSX.writeFile(wb, "Staff_Format_Template.xlsx");
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          toast.error("The uploaded file is empty.");
          return;
        }

        let importCount = 0;
        const toastId = toast.loading("Processing staff import...");
        
        for (const row of rows as any[]) {
          // Generate ID if not provided
          let id = row['Staff ID'] || row['ID'] || '';
          if (!id) {
            const currentIds = data.staff.map((s: Staff) => s.id)
                .filter((i: string) => typeof i === 'string' && i.startsWith('SGC-T-'))
                .map((i: string) => parseInt(i.replace('SGC-T-', ''), 10))
                .filter((num: number) => !isNaN(num));
            const nextNum = currentIds.length > 0 ? Math.max(...currentIds) + 1 : 1;
            id = `SGC-T-${(nextNum + importCount).toString().padStart(3, '0')}`;
          }

          const existingStaff = data.staff.find((s: Staff) => s.id === id);
          if (existingStaff) continue; // skip duplicates manually
          
          await data.addStaff({
            id: id,
            fullName: row['Full Name'] || row['Name'] || '',
            fatherName: row['Father Name'] || '',
            cnic: row['CNIC'] || '',
            contact: row['Contact'] || row['Phone'] || '',
            role: row['Role'] || row['Designation'] || 'Lecturer',
            status: row['Status'] || 'Active',
            joinDate: row['Join Date'] || new Date().toISOString().split('T')[0],
            qualification: '',
            salary: row['Salary'] || 0,
            baseSalary: row['Salary'] || 0,
            subjects: [],
            photo: ''
          });
          importCount++;
        }
        toast.dismiss(toastId);
        toast.success(`Successfully imported ${importCount} staff members!`);
        if (data.fetchData) data.fetchData(true);
      } catch (err) {
        toast.dismiss();
        toast.error("Failed to parse file. Please use the provided format.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Sync with initialFilter if it changes from sidebar
  React.useEffect(() => {
    if (initialFilter) {
      if (['all', 'Management', 'Academic', 'Administration', 'Support'].includes(initialFilter)) {
        setActiveModule('directory');
        setRoleFilter(initialFilter);
      } else if (initialFilter === 'directory') {
        setActiveModule('directory');
        setRoleFilter('all');
      } else if (['attendance', 'payroll', 'timetable', 'subjects', 'roster'].includes(initialFilter)) {
        setActiveModule(initialFilter as any);
        setRoleFilter('all');
      }
    }
  }, [initialFilter]);

  const roleGroups: Record<string, StaffRole[]> = {
    'Management': ['Campus Head', 'Principal', 'Vice Principal', 'Directors', 'Coordinator'],
    'Academic': ['Lecturer', 'Faculty', 'Exam Controller', 'Exam Officer', 'Librarian', 'Lab Attendant'],
    'Administration': ['Admin Officer', 'Accountant', 'Receptionist'],
    'Support': ['Office Boy', 'Guard', 'Gardener', 'Sweeper']
  };

  const filteredStaff = data.staff.filter((s: Staff) => {
    const name = s.fullName || '';
    const id = s.id || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         id.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesRole = roleFilter === 'all';
    if (!matchesRole) {
      if (roleGroups[roleFilter]) {
        matchesRole = roleGroups[roleFilter].includes(s.role);
      } else {
        matchesRole = s.role === roleFilter;
      }
    }

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    let matchesPhoto = true;
    const hasPhoto = Boolean((s.photo || (s as any).photo_url) && String(s.photo || (s as any).photo_url).trim().length > 5);
    if (photoFilter === 'with-photo') {
      matchesPhoto = hasPhoto;
    } else if (photoFilter === 'missing-photo') {
      matchesPhoto = !hasPhoto;
    }

    return matchesSearch && matchesRole && matchesStatus && matchesPhoto;
  });

  const toggleSelectAll = () => {
    if (selectedStaffIds.length === filteredStaff.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(filteredStaff.map((s: Staff) => s.id));
    }
  };

  const toggleSelectStaff = (id: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    setDialogType('bulkDelete');
  };

  const getRoleBadge = (role: StaffRole) => {
    if (role === 'Campus Head') {
      return (
        <Badge className="bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700 font-black shadow-2xs">
          Campus Head
        </Badge>
      );
    }
    const group = Object.entries(roleGroups).find(([_, roles]) => roles.includes(role))?.[0];
    
    switch (group) {
      case 'Management': return <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-bold">{role}</Badge>;
      case 'Academic': return <Badge className="bg-superior-teal/10 text-superior-teal border-superior-teal/20 font-bold">{role}</Badge>;
      case 'Administration': return <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-bold">{role}</Badge>;
      case 'Support': return <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold">{role}</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Compact Unified Header Line (< 45px) */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-display font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{title || "Staff Directory"}</span>
            <span className="font-nastaleeq text-xs text-superior-gold font-medium px-1.5 py-0.5 bg-superior-gold/10 rounded-md">
              اسٹاف ڈائریکٹری
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              {data.staff.length}
            </span>
          </h2>

          {!hideNavigation && (
            <div className="hidden sm:flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 gap-1">
              <button
                type="button"
                onClick={() => setActiveModule('directory')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  activeModule === 'directory'
                    ? "bg-white dark:bg-slate-700 text-superior-teal dark:text-emerald-300 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <Users size={13} /> Directory
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('attendance')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  activeModule === 'attendance'
                    ? "bg-white dark:bg-slate-700 text-superior-teal dark:text-emerald-300 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <Calendar size={13} /> Attendance
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('payroll')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  activeModule === 'payroll'
                    ? "bg-white dark:bg-slate-700 text-superior-teal dark:text-emerald-300 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <CreditCard size={13} /> Payroll
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('timetable')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  activeModule === 'timetable'
                    ? "bg-white dark:bg-slate-700 text-superior-teal dark:text-emerald-300 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <Clock size={13} /> Timetable
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('subjects')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  activeModule === 'subjects'
                    ? "bg-white dark:bg-slate-700 text-superior-teal dark:text-emerald-300 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <GraduationCap size={13} /> Subjects
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('roster')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  activeModule === 'roster'
                    ? "bg-white dark:bg-slate-700 text-superior-teal dark:text-emerald-300 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
                title="Teacher-wise Lecture Timings & Biometric Duty Roster"
              >
                <Clock size={13} className="text-amber-500" /> Duty Roster
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="outline" size="sm" className="h-8.5 px-3 rounded-xl border-slate-200/90 hover:border-superior-teal/40 text-slate-700 dark:text-slate-200 hover:bg-emerald-50/50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all">
                <Download size={14} className="text-superior-teal dark:text-emerald-400" />
                <span>Export Reports</span>
              </Button>
            } />
            <DropdownMenuContent align="end" className="w-80 p-2.5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-50">
              {/* Category 1: General Directory (NO SALARY) */}
              <div className="px-2 py-1.5 text-[10.5px] font-black tracking-wider text-emerald-800 dark:text-emerald-400 uppercase flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-950/40 rounded-lg mb-1">
                <span className="flex items-center gap-1.5">
                  <FileText size={13} className="text-emerald-700 dark:text-emerald-400" />
                  1. Staff Directory (General)
                </span>
                <span className="text-[9px] bg-white dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded font-black border border-emerald-200 dark:border-emerald-700">NO SALARY</span>
              </div>
              <DropdownMenuItem onClick={() => handleExportPDF({ mode: 'directory', exportAll: false })} className="rounded-xl py-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-emerald-50/60 dark:hover:bg-slate-800">
                <FileText size={15} className="mr-2 text-emerald-600" />
                PDF Directory (Filtered Staff)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPDF({ mode: 'directory', exportAll: true })} className="rounded-xl py-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-emerald-50/60 dark:hover:bg-slate-800">
                <FileText size={15} className="mr-2 text-teal-700 dark:text-teal-400" />
                PDF Directory (All Staff Roster)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportExcel(false, false)} className="rounded-xl py-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                <Download size={14} className="mr-2 text-emerald-600" />
                Excel Directory (No Salary)
              </DropdownMenuItem>

              <Separator className="my-2" />

              {/* Category 2: Executive Payroll Master Sheet (WITH SALARY) */}
              <div className="px-2 py-1.5 text-[10.5px] font-black tracking-wider text-amber-900 dark:text-amber-400 uppercase flex items-center justify-between bg-amber-50/80 dark:bg-amber-950/40 rounded-lg mb-1">
                <span className="flex items-center gap-1.5">
                  <CreditCard size={13} className="text-amber-700 dark:text-amber-400" />
                  2. Payroll Sheet (Financial)
                </span>
                <span className="text-[9px] bg-white dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-black border border-amber-200 dark:border-amber-700">WITH SALARY</span>
              </div>
              <DropdownMenuItem onClick={() => handleExportPDF({ mode: 'payroll', exportAll: false })} className="rounded-xl py-2 cursor-pointer text-xs font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-50/60 dark:hover:bg-slate-800">
                <CreditCard size={15} className="mr-2 text-amber-600" />
                PDF Payroll Sheet (Filtered Staff)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPDF({ mode: 'payroll', exportAll: true })} className="rounded-xl py-2 cursor-pointer text-xs font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-50/60 dark:hover:bg-slate-800">
                <CreditCard size={15} className="mr-2 text-amber-700" />
                PDF Payroll Sheet (All Staff Master)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportExcel(false, true)} className="rounded-xl py-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <FileSpreadsheet size={14} className="mr-2 text-amber-600" />
                Excel Payroll Sheet (Filtered)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportExcel(true, true)} className="rounded-xl py-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <FileSpreadsheet size={14} className="mr-2 text-amber-700" />
                Excel All Staff Master Sheet
              </DropdownMenuItem>

              <Separator className="my-2" />

              {/* Category 3: Bulk Data & CSV */}
              <div className="px-2 py-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Bulk Tools & Templates
              </div>
              <DropdownMenuItem onClick={handleDownloadTemplate} className="rounded-xl py-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                <FileSpreadsheet size={14} className="mr-2 text-superior-teal" />
                Download Format Template
              </DropdownMenuItem>
              <div className="relative">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  accept=".xlsx, .xls, .csv"
                  onChange={handleBulkImport}
                />
                <DropdownMenuItem className="rounded-xl py-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                  <Upload size={14} className="mr-2 text-blue-600" />
                  Bulk Import Staff (Excel/CSV)
                </DropdownMenuItem>
              </div>
              <DropdownMenuItem onClick={() => handleExportCSV(false, false)} className="rounded-xl py-1.5 cursor-pointer text-xs text-slate-500">
                <Download size={14} className="mr-2 text-slate-400" />
                Export CSV Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
            <DialogTrigger nativeButton={true} render={
              <button 
                onClick={() => setIsAddStaffOpen(true)}
                className="h-8.5 px-4 rounded-xl bg-superior-teal text-white font-bold text-xs hover:bg-superior-teal/90 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} /> Add Staff
              </button>
            }>
            </DialogTrigger>
            {isAddStaffOpen && (
              <AddStaffDialog 
                data={data} 
                isOpen={isAddStaffOpen}
                onClose={() => setIsAddStaffOpen(false)} 
              />
            )}
          </Dialog>
        </div>
      </div>

      <Tabs value={activeModule} onValueChange={(v: any) => setActiveModule(v)} className="w-full space-y-3">
        <TabsContent value="directory" className="space-y-4 mt-0 focus-visible:outline-none">
          {/* Bulk Actions Bar */}
          {selectedStaffIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky top-4 z-30 flex items-center justify-between p-3 bg-superior-teal rounded-2xl shadow-xl text-white mb-2 border border-white/10"
            >
              <div className="flex items-center gap-3 pl-1">
                <Checkbox 
                  checked={selectedStaffIds.length === filteredStaff.length} 
                  onCheckedChange={toggleSelectAll} 
                  className="border-white data-[state=checked]:bg-white data-[state=checked]:text-superior-teal"
                />
                <div className="flex flex-col">
                  <p className="text-xs font-black uppercase tracking-wider">
                    {selectedStaffIds.length} staff member{selectedStaffIds.length > 1 ? 's' : ''} selected
                  </p>
                  {selectedStaffIds.length < filteredStaff.length && (
                    <button 
                      onClick={() => setSelectedStaffIds(filteredStaff.map(s => s.id))}
                      className="text-[10px] font-bold underline opacity-80 hover:opacity-100 text-left"
                    >
                      Select all {filteredStaff.length} matching staff
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedStaffIds([])}
                  className="h-8 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 text-xs px-4"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkDelete}
                  variant="destructive" 
                  size="sm"
                  className="h-8 rounded-xl bg-white text-rose-600 hover:bg-rose-50 border-none font-bold text-xs px-4 shadow-sm"
                >
                  <Trash2 size={13} className="mr-1.5" /> Delete
                </Button>
              </div>
            </motion.div>
          )}

          {/* Compact Filter Toolbar (< 44px) */}
          <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
              <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-800">
                <Checkbox 
                  id="select-all-staff"
                  checked={selectedStaffIds.length === filteredStaff.length && filteredStaff.length > 0} 
                  onCheckedChange={toggleSelectAll} 
                  className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <Label htmlFor="select-all-staff" className="text-[10px] font-bold text-slate-400 cursor-pointer uppercase tracking-wider">All</Label>
              </div>

              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <Input 
                  placeholder="Search staff..." 
                  className="pl-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Role Filter Pills */}
              <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[11px]">
                {['all', 'Management', 'Academic', 'Administration', 'Support'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoleFilter(role)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold transition-all",
                      roleFilter === role
                        ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {role === 'all' ? `All (${data.staff.length})` : role === 'Administration' ? 'Admin' : role}
                  </button>
                ))}
              </div>

              {/* Photo Filter Pills */}
              <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPhotoFilter('all')}
                  className={cn(
                    "px-2 py-1 rounded-lg font-bold transition-all",
                    photoFilter === 'all' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" : "text-slate-500"
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoFilter('with-photo')}
                  className={cn(
                    "px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1",
                    photoFilter === 'with-photo' ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-emerald-600"
                  )}
                >
                  <Camera size={11} />
                  <span>Enrolled ({staffWithPhotos.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoFilter('missing-photo')}
                  className={cn(
                    "px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1",
                    photoFilter === 'missing-photo' ? "bg-amber-600 text-white shadow-xs" : "text-slate-500 hover:text-amber-600"
                  )}
                >
                  <AlertCircle size={11} />
                  <span>Missing ({staffWithoutPhotos.length})</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBiometricTargetStaff(null);
                  setIsBiometricModalOpen(true);
                }}
                className="h-8 px-2.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1"
                title="Open Biometric Fingerprint Manager"
              >
                <Fingerprint size={13} className="text-superior-teal" />
                <span className="hidden xl:inline">Biometric Enroll</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setIsSpotCheckOpen(true)}
                className="h-8 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                title="Instant 1-Touch Spot-Check Scanner"
              >
                <Fingerprint size={13} className="animate-pulse" />
                <span>Spot-Check</span>
              </Button>

              <Button
                onClick={() => setShowPhotoModal(true)}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 rounded-xl border-emerald-300 bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-1"
                title="Request staff profile photos on WhatsApp"
              >
                <Smartphone size={13} />
                <span className="hidden sm:inline">Request Photos</span>
              </Button>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
                <button
                  type="button"
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                    viewMode === 'grid' ? "bg-white dark:bg-slate-700 text-superior-teal shadow-xs" : "text-slate-400 hover:text-slate-600"
                  )}
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </button>
                <button
                  type="button"
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                    viewMode === 'list' ? "bg-white dark:bg-slate-700 text-superior-teal shadow-xs" : "text-slate-400 hover:text-slate-600"
                  )}
                  onClick={() => setViewMode('list')}
                >
                  List
                </button>
              </div>
            </div>
          </div>

      {/* Staff View (Grid or List) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredStaff.map((member: Staff) => (
            <motion.div
              key={member.id}
              whileHover={{ y: -3 }}
              className={cn(
                "bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden relative group transition-all duration-300 shadow-sm hover:shadow-xl hover:border-superior-teal/40 flex flex-col justify-between",
                selectedStaffIds.includes(member.id) && "ring-2 ring-superior-teal ring-offset-2"
              )}
            >
              {/* Profile Top Bar */}
              <div className="p-4 pb-3 flex items-start gap-3.5">
                {/* 100% Fully Visible Unclipped Avatar */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-sm flex items-center justify-center">
                    {member.photo ? (
                      <img 
                        src={member.photo} 
                        alt={member.fullName} 
                        className="w-full h-full object-cover object-top" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-teal-50 dark:bg-teal-950/40 text-superior-teal font-black text-xl">${member.fullName ? member.fullName.charAt(0).toUpperCase() : 'T'}</div>`;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-teal-50 dark:bg-teal-950/40 text-superior-teal font-black text-xl">
                        {member.fullName ? member.fullName.charAt(0).toUpperCase() : 'T'}
                      </div>
                    )}
                  </div>
                  {/* Active/Inactive Status Dot */}
                  <span className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center",
                    member.status === 'Active' ? "bg-emerald-500" : "bg-slate-400"
                  )}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </span>
                </div>

                {/* Identity Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono font-black text-superior-gold uppercase tracking-wider">
                      {member.id}
                    </span>
                    <div className="flex flex-wrap items-center gap-1 justify-end">
                      {getRoleBadge(member.role)}
                      {member.additionalRoles && member.additionalRoles.length > 0 ? (
                        member.additionalRoles.slice(0, 2).map((r, idx) => (
                          <Badge key={idx} className="text-[9px] font-bold bg-amber-100/90 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700">
                            {r.length > 15 ? r.slice(0, 15) + '…' : r}
                          </Badge>
                        ))
                      ) : (
                        member.secondaryRole && member.secondaryRole !== 'None' && member.secondaryRole !== member.role && (
                          getRoleBadge(member.secondaryRole as any)
                        )
                      )}
                      {member.additionalRoles && member.additionalRoles.length > 2 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                          +{member.additionalRoles.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight truncate group-hover:text-superior-teal transition-colors" title={member.fullName}>
                    {member.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate" title={member.designation || member.role}>
                    {member.designation || (member.secondaryRole && member.secondaryRole !== 'None' ? `${member.role} & ${member.secondaryRole}` : member.role)}
                  </p>
                  {member.qualification && (
                    <p className="text-[11px] text-blue-700 dark:text-blue-400 font-bold truncate mt-0.5" title={member.qualification}>
                      🎓 {member.qualification}
                    </p>
                  )}
                </div>
              </div>

              {/* Prominent Biometric Status Strip */}
              <div className="px-4 py-2 border-y border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                    member.fingerprintTemplate 
                      ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400" 
                      : "bg-rose-500/15 text-rose-600 dark:bg-rose-500/25 dark:text-rose-400"
                  )}>
                    <Fingerprint size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-[11px] font-black tracking-tight",
                        member.fingerprintTemplate ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}>
                        {member.fingerprintTemplate ? "Biometric Enrolled" : "Biometric Missing"}
                      </span>
                      {member.fingerprintTemplate && (
                        <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {member.fingerprintTemplate 
                        ? `${member.fingerprintFinger || 'Thumb'} Registered` 
                        : "Fingerprint required"}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setBiometricTargetStaff(member);
                    setIsBiometricModalOpen(true);
                  }}
                  className={cn(
                    "h-7 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0",
                    member.fingerprintTemplate
                      ? "bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white shadow-xs animate-pulse"
                  )}
                >
                  <Fingerprint size={12} className="mr-1" />
                  {member.fingerprintTemplate ? "Manage" : "Scan Now"}
                </Button>
              </div>

              {/* Key Stats: Contact & Salary */}
              <div className="p-4 pt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Contact</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate" title={member.contact || "N/A"}>
                      {member.contact || "N/A"}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Monthly Salary</p>
                    <p className="font-black text-emerald-700 dark:text-emerald-400 truncate">
                      Rs. {(member.salary || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Checkbox 
                      checked={selectedStaffIds.includes(member.id)} 
                      onCheckedChange={() => toggleSelectStaff(member.id)}
                      className="w-4 h-4 rounded-md"
                    />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 rounded-xl text-[11px] font-bold border-slate-200 hover:bg-superior-teal hover:text-white px-3 transition-colors" 
                      onClick={() => {
                        setSelectedStaff(member);
                        setDialogType('profile');
                      }}
                    >
                      <Eye size={13} className="mr-1 text-superior-teal group-hover:text-white" /> View
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                          <MoreHorizontal size={15} />
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[200px] border-slate-100 shadow-xl">
                        <DropdownMenuItem 
                          className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer font-bold text-superior-teal focus:bg-emerald-50" 
                          onClick={() => {
                            setBiometricTargetStaff(member);
                            setIsBiometricModalOpen(true);
                          }}
                        >
                          <Fingerprint size={15} /> <span>Biometric Fingerprint</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer font-bold text-[#085a4e] focus:bg-emerald-50" 
                          onClick={() => {
                            setSelectedDossierStaff(member);
                            setIsDossierOpen(true);
                          }}
                        >
                          <FileText size={15} className="text-[#085a4e]" /> <span>Joining Dossier (Print/PDF)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer font-bold text-slate-600 focus:bg-slate-50" 
                          onClick={() => setCardStaffMember(member)}
                        >
                          <CreditCard size={15} className="text-emerald-600" /> <span>Official ID Card</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer font-bold text-emerald-700 focus:bg-emerald-50" 
                          onClick={() => handleSendSinglePhotoRequest(member)}
                        >
                          <Smartphone size={15} className="text-emerald-600" /> <span>Request Photo (WhatsApp)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer font-bold text-slate-600 focus:bg-slate-50" 
                          onClick={() => {
                            setSelectedStaff(member);
                            setDialogType('edit');
                          }}
                        >
                          <Edit size={15} className="text-superior-gold" /> <span>Edit Details</span>
                        </DropdownMenuItem>
                        <Separator className="my-1.5 opacity-50" />
                        <DropdownMenuItem 
                          className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer text-rose-600 focus:bg-rose-50"
                          onClick={() => {
                            setSelectedStaff(member);
                            setDialogType('delete');
                          }}
                        >
                          <Trash2 size={15} /> <span>Delete Record</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List (Table) View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <TableRow className="border-none">
                <TableHead className="w-[50px] pl-6"></TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Staff Member</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Role & Dept</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Contact</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Joined</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Salary</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Biometric Fingerprint</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Status</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((member: Staff) => (
                <TableRow key={member.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => { setSelectedStaff(member); setDialogType('profile'); }}>
                  <TableCell onClick={(e) => e.stopPropagation()} className="pl-6">
                    <Checkbox 
                      checked={selectedStaffIds.includes(member.id)} 
                      onCheckedChange={() => toggleSelectStaff(member.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200">
                        {member.photo ? (
                          <img src={member.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">
                            {member.fullName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-superior-teal transition-colors">
                          {member.fullName}
                        </p>
                        <p className="text-[10px] font-mono text-superior-gold font-bold">
                          {member.id} {member.cnic && `• ${member.cnic}`}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {getRoleBadge(member.role)}
                      {member.additionalRoles && member.additionalRoles.length > 0 ? (
                        member.additionalRoles.slice(0, 2).map((r, idx) => (
                          <Badge key={idx} className="text-[9px] font-bold bg-amber-100 text-amber-900 border-amber-300">
                            {r.length > 15 ? r.slice(0, 15) + '…' : r}
                          </Badge>
                        ))
                      ) : (
                        member.secondaryRole && member.secondaryRole !== 'None' && member.secondaryRole !== member.role && (
                          getRoleBadge(member.secondaryRole as any)
                        )
                      )}
                    </div>
                    {(member.designation || (member.secondaryRole && member.secondaryRole !== 'None')) && (
                      <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px] mt-0.5">
                        {member.designation || `${member.role} & ${member.secondaryRole}`}
                      </p>
                    )}
                    {member.qualification && (
                      <p className="text-[10px] text-blue-700 dark:text-blue-400 font-bold truncate max-w-[200px]">
                        🎓 {member.qualification}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">{member.contact || "N/A"}</TableCell>
                  <TableCell className="text-xs text-slate-500">{member.joinDate || "N/A"}</TableCell>
                  <TableCell className="text-xs font-black text-slate-800 dark:text-slate-100">Rs. {(member.salary || 0).toLocaleString()}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {member.fingerprintTemplate ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold flex items-center gap-1 w-fit cursor-pointer hover:bg-emerald-100" onClick={() => { setBiometricTargetStaff(member); setIsBiometricModalOpen(true); }}>
                        <Fingerprint size={11} className="text-emerald-600" /> Enrolled ({member.fingerprintFinger?.split(" ")[0] || "Thumb"})
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="h-6.5 text-[9px] font-bold border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg px-2 flex items-center gap-1" onClick={() => { setBiometricTargetStaff(member); setIsBiometricModalOpen(true); }}>
                        <Fingerprint size={11} className="text-amber-600" /> Enroll Fingerprint
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-[9px] font-bold", member.status === 'Active' ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700")}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-superior-teal" onClick={() => { setSelectedStaff(member); setDialogType('profile'); }} title="View Profile">
                        <Eye size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-[#085a4e] hover:bg-emerald-50" onClick={() => { setSelectedDossierStaff(member); setIsDossierOpen(true); }} title="Print Official Joining Dossier">
                        <FileText size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:bg-emerald-50" onClick={() => setCardStaffMember(member)} title="Official ID Card">
                        <CreditCard size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-superior-gold hover:bg-amber-50" onClick={() => { setSelectedStaff(member); setDialogType('edit'); }} title="Edit Staff">
                        <Edit size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:bg-rose-50" onClick={() => { setSelectedStaff(member); setDialogType('delete'); }} title="Delete Staff">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Centralized Dialogs */}
      <Dialog open={dialogType === 'delete'} onOpenChange={(open) => {
        if (!open) {
          setDialogType(null);
          setSelectedStaff(null);
        }
      }}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">Delete Staff Record</DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete the record for <span className="font-bold text-slate-800">{selectedStaff?.fullName}</span>? This action is permanent and cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertCircle size={24} />
              </div>
              <p className="text-xs text-red-700 font-medium">Deleting this record will remove all associated employment history and salary data from the system.</p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => { setDialogType(null); setSelectedStaff(null); }} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
            <Button variant="destructive" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={() => {
              if (selectedStaff) {
                const idToDelete = selectedStaff.id;
                data.deleteStaff(idToDelete);
                setSelectedStaff(null);
                setDialogType(null);
                toast.success("Staff record deleted successfully!");
              }
            }}>Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'bulkDelete'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">Bulk Delete Staff</DialogTitle>
            <DialogDescription className="text-slate-500">
              You are about to delete <span className="font-bold text-slate-800">{selectedStaffIds.length}</span> selected staff records.
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
              const idsToDelete = [...selectedStaffIds];
              setDialogType(null);
              setSelectedStaffIds([]);
              await data.bulkDeleteStaff(idsToDelete);
            }}>Delete All Selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'profile'} onOpenChange={(open) => {
        if (!open) {
          setDialogType(null);
          setSelectedStaff(null);
        }
      }}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-0 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl">
          {selectedStaff && (
            <StaffProfile 
              key={`profile-${selectedStaff.id}`}
              member={selectedStaff} 
              data={data} 
              onEdit={() => setDialogType('edit')}
              onShowCard={() => setCardStaffMember(selectedStaff)}
              onOpenDossier={(staff) => {
                setSelectedDossierStaff(staff);
                setIsDossierOpen(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'edit'} onOpenChange={(open) => {
        if (!open) {
          setDialogType(null);
          setSelectedStaff(null);
        }
      }}>
        {selectedStaff && (
          <EditStaffDialog 
            key={`edit-${selectedStaff.id}`}
            member={selectedStaff} 
            data={data} 
            onClose={() => {
              setDialogType(null);
              setSelectedStaff(null);
            }} 
            onDelete={() => setDialogType('delete')}
          />
        )}
      </Dialog>
      </TabsContent>

      <TabsContent value="attendance" className="space-y-8 mt-0 focus-visible:outline-none">
        <StaffAttendance staffList={data.staff || filteredStaff} attendanceRecords={data.staffAttendance} onSaveAttendance={data.bulkSaveStaffAttendance} data={data} />
      </TabsContent>

      <TabsContent value="payroll" className="space-y-8 mt-0 focus-visible:outline-none">
        <StaffPayroll 
          staffList={data.staff || filteredStaff} 
          advances={data.staffAdvances || []} 
          staffTimetable={data.staffTimetable || []} 
          attendanceRecords={data.staffAttendance || []}
          onRecordAdvance={data.recordStaffAdvance} 
          onUpdateAdvance={data.updateStaffAdvance} 
        />
      </TabsContent>

      <TabsContent value="timetable" className="space-y-8 mt-0 focus-visible:outline-none">
        <StaffTimetable 
          staffList={data.staff || filteredStaff} 
          students={data.students || []}
          timetableRecords={data.staffTimetable || []} 
          onAddEntry={data.addTimetableEntry} 
          onRemoveEntry={data.removeTimetableEntry} 
          predefinedSections={data?.settings?.predefinedSections || []}
          settings={data?.settings}
        />
      </TabsContent>

      <TabsContent value="subjects" className="space-y-8 mt-0 focus-visible:outline-none">
        <StaffSubjects staffList={data.staff || filteredStaff} onUpdateStaff={data.updateStaff} />
      </TabsContent>

      <TabsContent value="roster" className="space-y-8 mt-0 focus-visible:outline-none">
        <StaffDutyRoster 
          staffList={data.staff || filteredStaff} 
          staffTimetable={data.staffTimetable || []} 
          onUpdateStaff={data.updateStaff} 
          settings={data?.settings}
          collegeName={data?.settings?.collegeName || 'Superior College Jahanian'}
        />
      </TabsContent>
      </Tabs>

      {/* Missing Photos WhatsApp Request Modal for Staff */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Request Staff Profile Photos via WhatsApp</h3>
                  <p className="text-xs text-slate-400">Total {staffWithoutPhotos.length} staff without biometric photos</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPhotoModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-emerald-950">
                <p className="font-semibold">Automated WhatsApp Photo Collection for Gate Biometrics</p>
                <p className="text-[11px] text-emerald-700">Staff members ko WhatsApp notice jayega. Unke reply krte hi bot unka face biometric gate attendance ke liye register kar lega.</p>
              </div>
              <Button
                size="sm"
                onClick={handleSendBulkPhotoRequests}
                disabled={isBulkSendingPhotos || staffWithoutPhotos.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-1.5 whitespace-nowrap self-end sm:self-auto"
              >
                {isBulkSendingPhotos ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sending ({bulkPhotoProgress.done}/{bulkPhotoProgress.total})
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send to All ({staffWithoutPhotos.length})
                  </>
                )}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {staffWithoutPhotos.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                  All staff members have biometric photos enrolled!
                </div>
              ) : (
                staffWithoutPhotos.map((s: Staff) => (
                  <div key={s.id} className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{s.fullName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        ID: {s.id} • {s.role || "Faculty"}
                      </p>
                      <p className="text-[10px] text-slate-400">Phone: {s.contact || "No contact"}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendSinglePhotoRequest(s)}
                      className="text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5"
                    >
                      <Smartphone size={13} />
                      Request Photo
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {cardStaffMember && (
        <ExecutiveIDCardModal
          open={!!cardStaffMember}
          onOpenChange={(open) => !open && setCardStaffMember(null)}
          settings={data?.settings}
          entity={{
            type: 'staff',
            fullName: cardStaffMember.fullName,
            fatherName: cardStaffMember.fatherName,
            idNumber: cardStaffMember.id,
            categoryOrRole: cardStaffMember.role || 'Faculty Member',
            subCategory: cardStaffMember.subjects && cardStaffMember.subjects.length > 0
              ? cardStaffMember.subjects.slice(0, 2).join(', ')
              : (cardStaffMember.qualification || 'Academic Faculty'),
            sessionOrValidity: cardStaffMember.joinDate ? `Valid From: ${cardStaffMember.joinDate.slice(0, 4)}` : '2026-2027',
            contact: cardStaffMember.contact,
            emergencyContact: cardStaffMember.contact,
            cnicOrBForm: cardStaffMember.cnic,
            photo: cardStaffMember.photo,
            qualification: cardStaffMember.qualification,
            address: cardStaffMember.address
          }}
        />
      )}

      {/* Bulk WhatsApp Report Modal for Staff Photos */}
      <WhatsAppReportModal
        open={isBulkStaffModalOpen}
        onOpenChange={setIsBulkStaffModalOpen}
        title={bulkStaffModalProps.title}
        subtitle={bulkStaffModalProps.subtitle}
        category={bulkStaffModalProps.category}
        items={bulkStaffModalProps.items}
        settings={data?.settings}
      />

      {/* Biometric Fingerprint Enrollment Modal for Staff */}
      {isBiometricModalOpen && (
        <BiometricEnrollmentModal
          isOpen={isBiometricModalOpen}
          onClose={() => {
            setIsBiometricModalOpen(false);
            setBiometricTargetStaff(null);
          }}
          staffList={data.staff || []}
          studentsList={data.students || []}
          targetPerson={biometricTargetStaff ? {
            id: biometricTargetStaff.id,
            fullName: biometricTargetStaff.fullName,
            fatherName: biometricTargetStaff.fatherName,
            personType: 'staff',
            roleOrGroup: biometricTargetStaff.designation || biometricTargetStaff.role,
            photo: biometricTargetStaff.photo,
            phone: biometricTargetStaff.contact,
            fingerprintTemplate: biometricTargetStaff.fingerprintTemplate,
            fingerprintFinger: biometricTargetStaff.fingerprintFinger,
            fingerprintEnrolledAt: biometricTargetStaff.fingerprintEnrolledAt,
          } : null}
          onEnrollmentSaved={(personId, personType, template, finger) => {
            data.updateFingerprintRecord?.(personId, personType, template, finger);
            data.fetchData?.(true);
          }}
        />
      )}

      {/* Instant 1-Touch Spot-Check Scanner (Student & Staff Identification) */}
      <InstantBiometricVerifyModal
        isOpen={isSpotCheckOpen}
        onClose={() => setIsSpotCheckOpen(false)}
        studentsList={data.students || []}
        staffList={data.staff || []}
        data={data}
      />

      {/* Official Staff Joining Dossier & Employment Record Modal */}
      {isDossierOpen && selectedDossierStaff && (
        <StaffJoiningDossierModal
          isOpen={isDossierOpen}
          onClose={() => {
            setIsDossierOpen(false);
            setSelectedDossierStaff(null);
          }}
          staff={selectedDossierStaff}
          brandingSettings={data?.settings}
        />
      )}
    </div>
  );
}

function StaffProfile({ 
  member, 
  data, 
  onEdit, 
  onShowCard,
  onOpenDossier
}: { 
  member: Staff, 
  data: any, 
  onEdit?: () => void, 
  onShowCard?: () => void,
  onOpenDossier?: (staff: Staff) => void
}) {
  const [imageError, setImageError] = useState(false);
  const [selectedSlipPayment, setSelectedSlipPayment] = useState<any | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const toastId = toast.loading("Processing photo...");
      try {
        const compressedBase64 = await compressImage(file);
        await data.updateStaff(member.id, { photo: compressedBase64 });
        setImageError(false);
        toast.dismiss(toastId);
        toast.success("Photo updated successfully!");
      } catch (err) {
        console.error('Photo upload error:', err);
        toast.dismiss(toastId);
        toast.error("Failed to upload photo.");
      }
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl overflow-hidden flex flex-col">
      {/* Executive Profile Header */}
      <div className="bg-gradient-to-r from-[#064e43] via-[#085a4e] to-teal-900 p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-superior-gold/10 rounded-full -ml-32 -mb-32 blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar with Camera upload */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-4 border-white/20 bg-white/10 backdrop-blur-md overflow-hidden shadow-2xl ring-2 ring-white/20 flex items-center justify-center">
              {member.photo && !imageError ? (
                <img 
                  src={member.photo} 
                  alt={member.fullName} 
                  className="w-full h-full object-cover object-top rounded-2xl" 
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/10 text-superior-gold font-black text-3xl">
                  {member.fullName ? member.fullName.charAt(0).toUpperCase() : 'T'}
                </div>
              )}
            </div>
            <label 
              className="absolute -bottom-1 -right-1 p-2 bg-superior-gold text-slate-950 rounded-xl cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-md border-2 border-white dark:border-slate-800"
              title="Upload / Change Staff Photo"
            >
              <Camera size={14} />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>

          {/* Identity & Badges */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
              <span className="font-mono text-xs font-black tracking-widest text-superior-gold bg-black/30 px-2.5 py-0.5 rounded-lg border border-superior-gold/30">
                {member.id}
              </span>
              <Badge className={cn(
                "rounded-lg px-2.5 py-0.5 font-black uppercase tracking-wider text-[10px] border-none",
                member.status === 'Active' ? "bg-emerald-500 text-white" : "bg-slate-500 text-white"
              )}>
                {member.status}
              </Badge>
              {member.fingerprintTemplate ? (
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold flex items-center gap-1">
                  <Fingerprint size={12} className="text-emerald-400" /> Thumb Registered ({member.fingerprintFinger || 'Finger'})
                </Badge>
              ) : (
                <Badge className="bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[10px] font-bold flex items-center gap-1">
                  <Fingerprint size={12} className="text-rose-400" /> Biometric Missing
                </Badge>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-white truncate" title={member.fullName}>
              {member.fullName}
            </h2>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs opacity-90 mt-2 font-medium">
              <div className="flex items-center gap-1.5">
                <Briefcase size={14} className="text-superior-gold" />
                <span>{member.role || 'Staff Member'}</span>
              </div>
              <span className="opacity-40">•</span>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-superior-gold" />
                <span>Joined: {member.joinDate || 'N/A'}</span>
              </div>
              {member.contact && (
                <>
                  <span className="opacity-40">•</span>
                  <div className="flex items-center gap-1.5">
                    <Phone size={14} className="text-superior-gold" />
                    <span>{member.contact}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto">
        {/* Personal & Professional Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Personal & Contact */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
              <User size={15} className="text-superior-teal" /> Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Father's Name</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{member.fatherName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CNIC</p>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{member.cnic || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Number</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{member.contact || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{member.dob || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Residential Address</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{member.address || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Card 2: Professional Details & Financials */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
              <GraduationCap size={15} className="text-superior-teal" /> Professional & Financial
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation / Role</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{member.role || 'Lecturer'}</p>
                {member.additionalRoles && member.additionalRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {member.additionalRoles.map(r => (
                      <span key={r} className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qualifications & Degrees</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {member.qualifications && member.qualifications.length > 0 ? (
                    member.qualifications.map(q => (
                      <span key={q} className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-300">
                        {q}
                      </span>
                    ))
                  ) : typeof member.qualification === 'string' && member.qualification.trim() ? (
                    member.qualification.split(',').map(q => q.trim()).filter(Boolean).map(q => (
                      <span key={q} className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-300">
                        {q}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 font-medium">N/A</span>
                  )}
                </div>
              </div>
              <div className="col-span-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Monthly Base Salary</p>
                  <p className="text-xl font-black text-emerald-800 dark:text-emerald-200 mt-0.5">
                    Rs. {(member.salary || member.baseSalary || 0).toLocaleString()}
                  </p>
                </div>
                <Badge className="bg-emerald-600 text-white font-bold text-[10px]">Active Payroll</Badge>
              </div>
              {member.subjects && member.subjects.length > 0 && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assigned Teaching Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {member.subjects.map(s => (
                      <Badge key={s} variant="outline" className="text-xs font-bold bg-white dark:bg-slate-800 text-superior-teal dark:text-emerald-400 border-slate-200 dark:border-slate-700 px-2.5 py-0.5">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Salary Payment History Section */}
        <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <CreditCard size={16} />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">Salary Payment History</h3>
                <p className="text-[10px] text-slate-400">Past disbursements & downloadable official slips</p>
              </div>
            </div>

            <Dialog>
              <DialogTrigger nativeButton={true} render={
                <button className="h-8 px-3 rounded-xl bg-superior-teal text-white font-bold text-xs flex items-center gap-1.5 hover:bg-superior-teal/90 shadow-sm cursor-pointer transition-all">
                  <Plus size={14} /> Record Salary Payment
                </button>
              } />
              <RecordSalaryDialog member={member} data={data} />
            </Dialog>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-slate-800/80">
                <TableRow className="border-none">
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Month / Year</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Amount Paid</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Payment Date</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Method</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-right pr-4">Salary Slip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.salaryPayments?.filter((p: any) => p.staffId === member.id).length > 0 ? (
                  data.salaryPayments.filter((p: any) => p.staffId === member.id).map((payment: any) => (
                    <TableRow key={payment.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60">
                      <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {payment.month} {payment.year}
                      </TableCell>
                      <TableCell className="font-black text-xs text-emerald-700 dark:text-emerald-400">
                        Rs. {(payment.amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {payment.date}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                        {payment.paymentMethod || 'Cash'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold border-none">
                          {payment.status || 'Paid'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 px-2.5 rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40 text-[11px] font-bold gap-1 shadow-2xs cursor-pointer"
                          onClick={() => setSelectedSlipPayment(payment)}
                          title="Print / Download Official Salary Slip"
                        >
                          <Printer size={13} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Print Slip</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-slate-400 italic text-xs">
                      No previous salary payment records found for {member.fullName}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button 
            variant="outline" 
            className="h-10 px-5 text-[#085a4e] border-emerald-300 hover:bg-emerald-50 font-bold rounded-xl text-xs flex items-center gap-2"
            onClick={() => {
              if (onOpenDossier) {
                onOpenDossier(member);
              }
            }}
          >
            <FileText size={15} className="text-[#085a4e]" /> Joining Dossier (Print/PDF)
          </Button>
          <Button 
            variant="outline" 
            className="h-10 px-5 text-superior-teal border-superior-teal/30 hover:bg-superior-teal/5 font-bold rounded-xl text-xs flex items-center gap-2"
            onClick={onShowCard}
          >
            <CreditCard size={15} /> Official ID Card
          </Button>
          <Button 
            className="h-10 px-8 bg-superior-teal text-white hover:bg-superior-teal/90 font-bold rounded-xl text-xs shadow-md shadow-superior-teal/10"
            onClick={onEdit}
          >
            <Edit size={14} className="mr-1.5" /> Edit Profile Details
          </Button>
        </div>
      </div>

      {/* Official Salary Slip Print Modal */}
      {selectedSlipPayment && (
        <StaffSalarySlipModal
          isOpen={Boolean(selectedSlipPayment)}
          onClose={() => setSelectedSlipPayment(null)}
          staff={member}
          month={`${selectedSlipPayment.month} ${selectedSlipPayment.year}`}
          baseSalary={member.baseSalary || member.salary || 0}
          extraAllowance={0}
          extraLecturesCount={0}
          extraLectureRate={0}
          leavesTaken={0}
          leaveDeduction={0}
          lateMinutes={0}
          lateDeduction={0}
          advanceDeduction={0}
          netSalary={selectedSlipPayment.amount || member.salary || 0}
          totalRemainingAdvance={0}
          totalLecturesCount={0}
          regularLecturesCount={0}
          settings={data?.settings}
        />
      )}
    </div>
  );
}

const QUICK_TEACHING_SUBJECTS = [
  'English',
  'Urdu',
  'Physics',
  'Chemistry',
  'Biology',
  'Mathematics',
  'Computer Science',
  'Economics',
  'Islamic Studies',
  'Pak Studies',
  'Accounting',
  'Commerce'
];

const SECONDARY_ROLES = [
  'None',
  'Campus Head',
  'Lecturer (Teaching Faculty)',
  'Visiting Faculty',
  'Course Instructor',
  'HOD (Head of Department)',
  'Academic Coordinator',
  'Examination In-charge',
  'Lab In-charge',
  'Custom'
];

function EditStaffDialog({ member, data, onClose, onDelete }: { member: Staff, data: any, onClose?: () => void, onDelete?: () => void }) {
  const getInitialFormData = useCallback((m: Staff) => {
    // Parse existing additional roles
    let initRoles: string[] = [];
    if (Array.isArray(m?.additionalRoles) && m.additionalRoles.length > 0) {
      initRoles = [...m.additionalRoles];
    } else if (m?.secondaryRole && m.secondaryRole !== 'None') {
      initRoles = m.secondaryRole.split('&').map(r => r.trim()).filter(Boolean);
    } else if (m?.designation && m.designation.includes('&')) {
      const parts = m.designation.split('&').map(r => r.trim()).filter(Boolean);
      initRoles = parts.slice(1);
    }

    // Parse existing qualifications
    let initQuals: string[] = [];
    if (Array.isArray(m?.qualifications) && m.qualifications.length > 0) {
      initQuals = [...m.qualifications];
    } else if (m?.qualification && typeof m.qualification === 'string') {
      initQuals = m.qualification.split(',').map(q => q.trim()).filter(Boolean);
    }

    return {
      fullName: m?.fullName || '',
      fatherName: m?.fatherName || '',
      cnic: m?.cnic || '',
      contact: m?.contact || '',
      address: m?.address || '',
      dob: m?.dob || '',
      joinDate: m?.joinDate || new Date().toISOString().split('T')[0],
      qualification: m?.qualification || '',
      qualifications: initQuals,
      salary: m?.salary || 0,
      baseSalary: m?.baseSalary || m?.salary || 0,
      subjects: m?.subjects || [],
      role: (m?.role || 'Lecturer') as StaffRole,
      additionalRoles: initRoles,
      secondaryRole: initRoles.join(' & ') || 'None',
      designation: m?.designation || m?.role || 'Lecturer',
      status: m?.status || 'Active',
      photo: m?.photo || ''
    };
  }, []);

  const [formData, setFormData] = useState(() => getInitialFormData(member));
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [customPortfolioInput, setCustomPortfolioInput] = useState('');
  const [customDegreeInput, setCustomDegreeInput] = useState('');

  // Critical: Always re-sync formData when member changes
  useEffect(() => {
    if (member) {
      setFormData(getInitialFormData(member));
      setCustomSubjectInput('');
      setCustomPortfolioInput('');
      setCustomDegreeInput('');
    }
  }, [member, getInitialFormData]);

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

  // Additional Portfolios / Multi-Role management
  const togglePortfolio = (portfolio: string) => {
    setFormData(prev => {
      const exists = prev.additionalRoles.includes(portfolio);
      const updated = exists 
        ? prev.additionalRoles.filter(p => p !== portfolio)
        : [...prev.additionalRoles, portfolio];
      return {
        ...prev,
        additionalRoles: updated,
        secondaryRole: updated.join(' & ')
      };
    });
  };

  const handleAddCustomPortfolio = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customPortfolioInput.trim();
    if (!trimmed) return;
    if (!formData.additionalRoles.includes(trimmed)) {
      setFormData(prev => {
        const updated = [...prev.additionalRoles, trimmed];
        return {
          ...prev,
          additionalRoles: updated,
          secondaryRole: updated.join(' & ')
        };
      });
    }
    setCustomPortfolioInput('');
  };

  const removePortfolio = (portfolio: string) => {
    setFormData(prev => {
      const updated = prev.additionalRoles.filter(p => p !== portfolio);
      return {
        ...prev,
        additionalRoles: updated,
        secondaryRole: updated.join(' & ')
      };
    });
  };

  // Qualifications / Multiple Degrees management
  const addQualification = (deg: string) => {
    const trimmed = deg.trim();
    if (!trimmed) return;
    setFormData(prev => {
      if (prev.qualifications.includes(trimmed)) return prev;
      const updated = [...prev.qualifications, trimmed];
      return {
        ...prev,
        qualifications: updated,
        qualification: updated.join(', ')
      };
    });
  };

  const removeQualification = (deg: string) => {
    setFormData(prev => {
      const updated = prev.qualifications.filter(q => q !== deg);
      return {
        ...prev,
        qualifications: updated,
        qualification: updated.join(', ')
      };
    });
  };

  const handleAddCustomQualification = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customDegreeInput.trim();
    if (!trimmed) return;
    addQualification(trimmed);
    setCustomDegreeInput('');
  };

  // Teaching subjects management
  const toggleSubject = (sub: string) => {
    setFormData(prev => {
      const exists = prev.subjects.includes(sub);
      return {
        ...prev,
        subjects: exists ? prev.subjects.filter(s => s !== sub) : [...prev.subjects, sub]
      };
    });
  };

  const handleAddCustomSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    if (!formData.subjects.includes(trimmed)) {
      setFormData(prev => ({ ...prev, subjects: [...prev.subjects, trimmed] }));
    }
    setCustomSubjectInput('');
  };

  const handleDelete = () => {
    if (onDelete) onDelete();
  };

  const handleSave = () => {
    const sec = formData.additionalRoles.join(' & ');
    const fullDesig = formData.additionalRoles.length > 0 
      ? `${formData.role} & ${sec}`
      : formData.role;
    const qualStr = formData.qualifications.join(', ') || formData.qualification;

    data.updateStaff(member.id, {
      ...formData,
      qualifications: formData.qualifications,
      qualification: qualStr,
      additionalRoles: formData.additionalRoles,
      secondaryRole: sec,
      designation: fullDesig
    });
    toast.success("Staff profile updated successfully!");
    if (onClose) onClose();
  };

  return (
    <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[92vh] h-[92vh] flex flex-col p-0 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
      {/* Pinned Top Header */}
      <div className="shrink-0 bg-gradient-to-r from-superior-teal to-emerald-900 text-white p-4 sm:p-5 flex items-center justify-between z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
            <User size={20} className="text-superior-gold" />
          </div>
          <div>
            <DialogTitle className="text-lg font-black tracking-tight text-white">Edit Staff Profile</DialogTitle>
            <p className="text-xs text-white/70">Modify credentials, multiple portfolios & academic degrees</p>
          </div>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded-xl bg-white/10 text-superior-gold font-bold border border-white/15">
          {member.id}
        </span>
      </div>

      {/* Scrollable Modal Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-5">
        {/* Top Profile Strip with Photo */}
        <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-sm">
              {formData.photo ? (
                <img src={formData.photo} alt="" className="w-full h-full object-cover object-top rounded-2xl" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <Camera size={22} />
                  <span className="text-[9px] font-bold uppercase mt-1">Photo</span>
                </div>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 p-1.5 bg-superior-teal hover:bg-superior-teal/90 text-white rounded-xl cursor-pointer shadow-md border-2 border-white dark:border-slate-800 transition-all">
              <Camera size={13} />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-slate-800 dark:text-white text-base truncate">{formData.fullName || "Unnamed Staff Member"}</h4>
            <p className="text-xs text-slate-500 font-medium">
              Primary Role: <span className="text-superior-teal font-bold">{formData.role}</span>
              {formData.additionalRoles.length > 0 && (
                <span className="text-amber-700 dark:text-amber-300 font-bold ml-1.5">
                  (+{formData.additionalRoles.length} Portfolios)
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click camera icon to change passport photo for biometric gate & ID cards.</p>
          </div>
        </div>

        {/* Section 1: Basic Identity & Primary Role */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Briefcase size={14} className="text-superior-teal" />
            <span>Basic Identity & Primary Role</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Full Name *</Label>
              <Input 
                className="h-9 text-xs rounded-xl"
                value={formData.fullName} 
                onChange={e => setFormData({...formData, fullName: e.target.value})} 
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Father's Name</Label>
              <Input 
                className="h-9 text-xs rounded-xl"
                value={formData.fatherName} 
                onChange={e => setFormData({...formData, fatherName: e.target.value})} 
                placeholder="Enter father's name"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Primary Designation / Core College Role *</Label>
              <Select value={formData.role || ""} onValueChange={(v: any) => setFormData({...formData, role: v})}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {STAFF_ROLES.map(role => (
                    <SelectItem key={role} value={role} className="text-xs">{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 2: Multi-Role / Additional Portfolios */}
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase size={15} className="text-amber-700 dark:text-amber-400" />
              <Label className="text-xs font-black text-amber-950 dark:text-amber-200">
                Additional Portfolios & Roles (Assign 2, 3 or More Portfolios)
              </Label>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
              {formData.additionalRoles.length} Assigned
            </span>
          </div>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
            A staff member can hold multiple responsibilities simultaneously (e.g. Campus Head, HOD, Campus Coordinator, Timetable In-charge).
          </p>

          {/* Active Assigned Portfolios Badges */}
          {formData.additionalRoles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/60">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold self-center mr-1">Active Portfolios:</span>
              {formData.additionalRoles.map(r => (
                <span key={r} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/90 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-300 dark:border-amber-700 shadow-2xs">
                  <span>{r}</span>
                  <button 
                    type="button" 
                    onClick={() => removePortfolio(r)}
                    className="text-amber-700 hover:text-rose-600 font-black text-sm leading-none ml-0.5"
                    title="Remove portfolio"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Quick Toggle Portfolios */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Select Common College Portfolios:</p>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl bg-white/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              {ADDITIONAL_PORTFOLIOS.map(p => {
                const isSelected = formData.additionalRoles.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePortfolio(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border",
                      isSelected
                        ? "bg-amber-600 text-white border-amber-600 shadow-2xs scale-102"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                    )}
                  >
                    {isSelected ? `✓ ${p}` : `+ ${p}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Portfolio Adder */}
          <div className="flex gap-2 pt-1">
            <Input
              placeholder="Type custom portfolio (e.g. Science Club In-charge, Transport In-charge)..."
              className="h-8 text-xs rounded-xl bg-white dark:bg-slate-800 border-slate-200"
              value={customPortfolioInput}
              onChange={e => setCustomPortfolioInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomPortfolio(); } }}
            />
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              onClick={() => handleAddCustomPortfolio()}
              className="h-8 px-3 text-xs rounded-xl font-bold border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              Add Role
            </Button>
          </div>
        </div>

        {/* Section 3: Pakistani Qualifications Hierarchy & Multiple Degrees */}
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap size={15} className="text-blue-700 dark:text-blue-400" />
              <Label className="text-xs font-black text-blue-950 dark:text-blue-200">
                Academic Qualifications & Pakistani Degrees (Multiple Degrees)
              </Label>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
              {formData.qualifications.length} Degrees Added
            </span>
          </div>
          <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
            Select degrees from Pakistan education system (Post-Graduate, Masters, BS 4-Years, B.Ed, Intermediate, Schooling) or enter custom.
          </p>

          {/* Active Qualifications Badges */}
          {formData.qualifications.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800/60">
              <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold self-center mr-1">Enrolled Degrees:</span>
              {formData.qualifications.map(q => (
                <span key={q} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100/90 dark:bg-blue-950 text-blue-900 dark:text-blue-200 text-xs font-bold border border-blue-300 dark:border-blue-700 shadow-2xs">
                  <span>{q}</span>
                  <button 
                    type="button" 
                    onClick={() => removeQualification(q)}
                    className="text-blue-700 hover:text-rose-600 font-black text-sm leading-none ml-0.5"
                    title="Remove degree"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Categorized Dropdown Selector */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Degree from Pakistani Categories:</Label>
            <Select value="" onValueChange={(val) => { if (val) addQualification(val); }}>
              <SelectTrigger className="h-9 text-xs rounded-xl bg-white dark:bg-slate-800 border-slate-200">
                <SelectValue placeholder="Click to choose a Pakistani degree/qualification..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {PAKISTAN_QUALIFICATIONS_PRESETS.map((catGroup) => (
                  <div key={catGroup.category} className="py-1">
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-superior-teal bg-slate-50 dark:bg-slate-800/60 rounded">
                      {catGroup.category}
                    </div>
                    {catGroup.degrees.map((deg) => (
                      <SelectItem key={deg} value={deg} className="text-xs font-medium cursor-pointer pl-4">
                        {deg}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Popular Faculty Degrees Quick Pills */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Popular Faculty Degrees (1-Click Add):</p>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-xl bg-white/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              {POPULAR_FACULTY_DEGREES.map(deg => {
                const isSelected = formData.qualifications.includes(deg);
                return (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => isSelected ? removeQualification(deg) : addQualification(deg)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-bold transition-all border",
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                    )}
                  >
                    {isSelected ? `✓ ${deg}` : `+ ${deg}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Degree Adder */}
          <div className="flex gap-2 pt-1">
            <Input
              placeholder="Type custom degree / specialization (e.g. M.Phil Nanotechnology, Ph.D Applied Physics)..."
              className="h-8 text-xs rounded-xl bg-white dark:bg-slate-800 border-slate-200"
              value={customDegreeInput}
              onChange={e => setCustomDegreeInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomQualification(); } }}
            />
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              onClick={() => handleAddCustomQualification()}
              className="h-8 px-3 text-xs rounded-xl font-bold border-blue-300 text-blue-800 hover:bg-blue-100"
            >
              Add Degree
            </Button>
          </div>
        </div>

        {/* Section 4: Teaching Subjects Selector */}
        <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-superior-teal" />
              <Label className="text-xs font-black text-teal-950 dark:text-teal-200">
                Teaching Subjects (Lectures & Academic Specialization)
              </Label>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
              {formData.subjects.length} Selected
            </span>
          </div>

          {/* Active Assigned Subjects Badges */}
          {formData.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800/60">
              <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold self-center mr-1">Assigned Subjects:</span>
              {formData.subjects.map(s => (
                <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-superior-teal dark:text-teal-300 text-[11px] font-bold border border-teal-200 dark:border-teal-800 shadow-2xs">
                  {s}
                  <button type="button" onClick={() => toggleSubject(s)} className="text-slate-400 hover:text-rose-500 font-bold ml-0.5">×</button>
                </span>
              ))}
            </div>
          )}

          {/* Quick-select pills */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TEACHING_SUBJECTS.map(subj => {
              const isSelected = formData.subjects.includes(subj);
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => toggleSubject(subj)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border",
                    isSelected
                      ? "bg-superior-teal text-white border-superior-teal shadow-2xs scale-102"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-superior-teal/50"
                  )}
                >
                  {isSelected ? `✓ ${subj}` : `+ ${subj}`}
                </button>
              );
            })}
          </div>

          {/* Custom subject adder */}
          <div className="flex gap-2 pt-1">
            <Input
              placeholder="Type custom subject and press Add..."
              className="h-8 text-xs rounded-xl bg-white dark:bg-slate-800"
              value={customSubjectInput}
              onChange={e => setCustomSubjectInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomSubject(); } }}
            />
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              onClick={() => handleAddCustomSubject()}
              className="h-8 px-3 text-xs rounded-xl font-bold border-teal-300 text-superior-teal hover:bg-teal-100/50"
            >
              Add
            </Button>
          </div>
        </div>

        {/* Section 5: Contact & Identification */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Phone size={14} className="text-superior-teal" />
            <span>Contact & Identity</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">CNIC Number</Label>
              <Input 
                className="h-9 text-xs rounded-xl"
                value={formData.cnic} 
                onChange={e => setFormData({...formData, cnic: e.target.value})} 
                placeholder="36104-XXXXXXX-X"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Contact Number</Label>
              <Input 
                className="h-9 text-xs rounded-xl"
                value={formData.contact} 
                onChange={e => setFormData({...formData, contact: e.target.value})} 
                placeholder="0300-XXXXXXX"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Date of Birth</Label>
              <Input 
                type="date"
                className="h-9 text-xs rounded-xl"
                value={formData.dob} 
                onChange={e => setFormData({...formData, dob: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#085a4e] dark:text-emerald-400">Date of Joining College *</Label>
              <Input 
                type="date"
                className="h-9 text-xs rounded-xl border-emerald-300 dark:border-emerald-700 bg-emerald-50/30"
                value={formData.joinDate} 
                onChange={e => setFormData({...formData, joinDate: e.target.value})} 
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Residential Address</Label>
            <Input 
              className="h-9 text-xs rounded-xl"
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})} 
              placeholder="Enter full address"
            />
          </div>
        </div>

        {/* Section 6: Payroll & Status */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <CreditCard size={14} className="text-superior-teal" />
            <span>Payroll & Status</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Monthly Base Salary (Rs.)</Label>
              <Input 
                type="number"
                className="h-9 text-xs rounded-xl"
                value={formData.salary} 
                onChange={e => setFormData({...formData, salary: Number(e.target.value), baseSalary: Number(e.target.value)})} 
                placeholder="e.g. 50000"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Account Status</Label>
              <Select value={formData.status || ""} onValueChange={(v: any) => setFormData({...formData, status: v})}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active" className="text-xs">Active</SelectItem>
                  <SelectItem value="Inactive" className="text-xs">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Sticky Bottom Footer - Always visible on all screens & zoom levels */}
      <div className="shrink-0 sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 py-3.5 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 z-20 shadow-lg">
        <Button 
          variant="ghost" 
          type="button"
          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs h-9 rounded-xl font-bold cursor-pointer" 
          onClick={handleDelete}
        >
          <Trash2 size={15} className="mr-1.5" /> Delete Staff
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" type="button" onClick={onClose} className="h-9 px-4 text-xs rounded-xl font-bold cursor-pointer">
            Cancel
          </Button>
          <Button 
            className="bg-superior-teal text-white hover:bg-superior-teal/90 h-9 px-5 text-xs rounded-xl font-bold shadow-sm cursor-pointer" 
            onClick={handleSave}
          >
            Save Profile Changes
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function AddStaffDialog({ data, isOpen, onClose }: { data: any; isOpen?: boolean; onClose?: () => void }) {
  const computeNextId = useCallback(() => {
    const currentIds = (data.staff || [])
      .map((s: Staff) => s.id)
      .filter((id: string) => typeof id === 'string' && id.startsWith('SGC-T-'))
      .map((id: string) => parseInt(id.replace('SGC-T-', ''), 10))
      .filter((num: number) => !isNaN(num));
    
    const nextNum = currentIds.length > 0 ? Math.max(...currentIds) + 1 : 1;
    return `SGC-T-${nextNum.toString().padStart(3, '0')}`;
  }, [data.staff]);

  const createBlankForm = useCallback(() => ({
    id: computeNextId(),
    fullName: '',
    fatherName: '',
    cnic: '',
    contact: '',
    address: '',
    dob: '',
    joinDate: new Date().toISOString().split('T')[0],
    qualification: '',
    qualifications: [] as string[],
    salary: 0,
    baseSalary: 0,
    subjects: [] as string[],
    role: 'Lecturer' as StaffRole,
    additionalRoles: [] as string[],
    secondaryRole: 'None',
    customSecondaryRole: '',
    designation: '',
    status: 'Active' as const,
    photo: ''
  }), [computeNextId]);

  const [formData, setFormData] = useState(createBlankForm);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [customPortfolioInput, setCustomPortfolioInput] = useState('');
  const [customDegreeInput, setCustomDegreeInput] = useState('');

  // Always reset to a completely blank, fresh form with next unique ID whenever opened
  useEffect(() => {
    if (isOpen) {
      setFormData(createBlankForm());
      setCustomSubjectInput('');
      setCustomPortfolioInput('');
      setCustomDegreeInput('');
    }
  }, [isOpen, createBlankForm]);

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

  // Additional Portfolios / Multi-Role management
  const togglePortfolio = (portfolio: string) => {
    setFormData(prev => {
      const exists = prev.additionalRoles.includes(portfolio);
      const updated = exists 
        ? prev.additionalRoles.filter(p => p !== portfolio)
        : [...prev.additionalRoles, portfolio];
      return {
        ...prev,
        additionalRoles: updated,
        secondaryRole: updated.join(' & ')
      };
    });
  };

  const handleAddCustomPortfolio = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customPortfolioInput.trim();
    if (!trimmed) return;
    if (!formData.additionalRoles.includes(trimmed)) {
      setFormData(prev => {
        const updated = [...prev.additionalRoles, trimmed];
        return {
          ...prev,
          additionalRoles: updated,
          secondaryRole: updated.join(' & ')
        };
      });
    }
    setCustomPortfolioInput('');
  };

  const removePortfolio = (portfolio: string) => {
    setFormData(prev => {
      const updated = prev.additionalRoles.filter(p => p !== portfolio);
      return {
        ...prev,
        additionalRoles: updated,
        secondaryRole: updated.join(' & ')
      };
    });
  };

  // Qualifications / Multiple Degrees management
  const addQualification = (deg: string) => {
    const trimmed = deg.trim();
    if (!trimmed) return;
    setFormData(prev => {
      if (prev.qualifications.includes(trimmed)) return prev;
      const updated = [...prev.qualifications, trimmed];
      return {
        ...prev,
        qualifications: updated,
        qualification: updated.join(', ')
      };
    });
  };

  const removeQualification = (deg: string) => {
    setFormData(prev => {
      const updated = prev.qualifications.filter(q => q !== deg);
      return {
        ...prev,
        qualifications: updated,
        qualification: updated.join(', ')
      };
    });
  };

  const handleAddCustomQualification = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customDegreeInput.trim();
    if (!trimmed) return;
    addQualification(trimmed);
    setCustomDegreeInput('');
  };

  // Teaching subjects management
  const toggleSubject = (sub: string) => {
    setFormData(prev => {
      const exists = prev.subjects.includes(sub);
      return {
        ...prev,
        subjects: exists ? prev.subjects.filter(s => s !== sub) : [...prev.subjects, sub]
      };
    });
  };

  const handleAddCustomSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    if (!formData.subjects.includes(trimmed)) {
      setFormData(prev => ({ ...prev, subjects: [...prev.subjects, trimmed] }));
    }
    setCustomSubjectInput('');
  };

  const handleSave = () => {
    if (!formData.id || !formData.fullName) {
      toast.error("Please enter staff full name!");
      return;
    }

    // Uniqueness check
    const idExists = (data.staff || []).some((s: Staff) => s.id.toLowerCase() === formData.id.toLowerCase());
    if (idExists) {
      toast.error(`Staff ID '${formData.id}' already exists! Please use a unique ID.`);
      return;
    }

    const sec = formData.additionalRoles.join(' & ');
    const fullDesig = formData.additionalRoles.length > 0 
      ? `${formData.role} & ${sec}`
      : formData.role;
    const qualStr = formData.qualifications.join(', ') || formData.qualification;

    data.addStaff({ 
      ...formData,
      qualifications: formData.qualifications,
      qualification: qualStr,
      additionalRoles: formData.additionalRoles,
      secondaryRole: sec,
      designation: fullDesig,
    });
    toast.success("Staff member enrolled successfully!");
    setFormData(createBlankForm());
    if (onClose) onClose();
  };

  return (
    <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[92vh] h-[92vh] flex flex-col p-0 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
      {/* Pinned Top Header */}
      <div className="shrink-0 bg-gradient-to-r from-superior-teal to-emerald-900 text-white p-4 sm:p-5 flex items-center justify-between z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
            <User size={20} className="text-superior-gold" />
          </div>
          <div>
            <DialogTitle className="text-lg font-black tracking-tight text-white">Add New Staff / Faculty Member</DialogTitle>
            <p className="text-xs text-white/70">Register employee details, multiple portfolios & academic degrees</p>
          </div>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded-xl bg-white/10 text-superior-gold font-bold border border-white/15">
          {formData.id}
        </span>
      </div>

      {/* Scrollable Modal Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-5">
        {/* Top Profile Strip with Photo */}
        <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-sm">
              {formData.photo ? (
                <img src={formData.photo} alt="" className="w-full h-full object-cover object-top rounded-2xl" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <Camera size={22} />
                  <span className="text-[9px] font-bold uppercase mt-1">Upload</span>
                </div>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 p-1.5 bg-superior-teal hover:bg-superior-teal/90 text-white rounded-xl cursor-pointer shadow-md border-2 border-white dark:border-slate-800 transition-all">
              <Camera size={13} />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-superior-gold/15 text-superior-gold px-2 py-0.5 rounded-md border border-superior-gold/25">
                {formData.id}
              </span>
              <span className="text-xs text-slate-400">• New Enrollment</span>
            </div>
            <h4 className="font-black text-slate-800 dark:text-white text-base truncate mt-1">
              {formData.fullName || "Enter Staff Name Below"}
            </h4>
            <p className="text-[11px] text-slate-400">Passport photo is used for Biometric Tablet Gate Attendance and Faculty ID Cards.</p>
          </div>
        </div>

        {/* Section 1: Basic Identity & Core Designation */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Briefcase size={14} className="text-superior-teal" />
            <span>Basic Identity & Core Designation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Full Name *</Label>
              <Input 
                className="h-9 text-xs rounded-xl"
                value={formData.fullName} 
                onChange={e => setFormData({...formData, fullName: e.target.value})} 
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Father's Name</Label>
              <Input 
                className="h-9 text-xs rounded-xl"
                value={formData.fatherName} 
                onChange={e => setFormData({...formData, fatherName: e.target.value})} 
                placeholder="Enter father's name"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Primary Designation / Core College Role *</Label>
              <Select value={formData.role || ""} onValueChange={(v: any) => setFormData({...formData, role: v})}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {STAFF_ROLES.map(role => (
                    <SelectItem key={role} value={role} className="text-xs">{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 2: Multi-Role / Additional Portfolios */}
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase size={15} className="text-amber-700 dark:text-amber-400" />
              <Label className="text-xs font-black text-amber-950 dark:text-amber-200">
                Additional Portfolios & Roles (Assign 2, 3 or More Portfolios)
              </Label>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
              {formData.additionalRoles.length} Assigned
            </span>
          </div>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
            A staff member can hold multiple responsibilities simultaneously (e.g. Campus Head, HOD, Campus Coordinator, Timetable In-charge).
          </p>

          {/* Active Assigned Portfolios Badges */}
          {formData.additionalRoles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/60">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold self-center mr-1">Active Portfolios:</span>
              {formData.additionalRoles.map(r => (
                <span key={r} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/90 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-300 dark:border-amber-700 shadow-2xs">
                  <span>{r}</span>
                  <button 
                    type="button" 
                    onClick={() => removePortfolio(r)}
                    className="text-amber-700 hover:text-rose-600 font-black text-sm leading-none ml-0.5"
                    title="Remove portfolio"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Quick Toggle Portfolios */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Select Common College Portfolios:</p>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl bg-white/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              {ADDITIONAL_PORTFOLIOS.map(p => {
                const isSelected = formData.additionalRoles.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePortfolio(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border",
                      isSelected
                        ? "bg-amber-600 text-white border-amber-600 shadow-2xs scale-102"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                    )}
                  >
                    {isSelected ? `✓ ${p}` : `+ ${p}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Portfolio Adder */}
          <div className="flex gap-2 pt-1">
            <Input
              placeholder="Type custom portfolio (e.g. Science Club In-charge, Transport In-charge)..."
              className="h-8 text-xs rounded-xl bg-white dark:bg-slate-800 border-slate-200"
              value={customPortfolioInput}
              onChange={e => setCustomPortfolioInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomPortfolio(); } }}
            />
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              onClick={() => handleAddCustomPortfolio()}
              className="h-8 px-3 text-xs rounded-xl font-bold border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              Add Role
            </Button>
          </div>
        </div>

        {/* Section 3: Pakistani Qualifications Hierarchy & Multiple Degrees */}
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap size={15} className="text-blue-700 dark:text-blue-400" />
              <Label className="text-xs font-black text-blue-950 dark:text-blue-200">
                Academic Qualifications & Pakistani Degrees (Multiple Degrees)
              </Label>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
              {formData.qualifications.length} Degrees Added
            </span>
          </div>
          <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
            Select degrees from Pakistan education system (Post-Graduate, Masters, BS 4-Years, B.Ed, Intermediate, Schooling) or enter custom.
          </p>

          {/* Active Qualifications Badges */}
          {formData.qualifications.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800/60">
              <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold self-center mr-1">Enrolled Degrees:</span>
              {formData.qualifications.map(q => (
                <span key={q} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100/90 dark:bg-blue-950 text-blue-900 dark:text-blue-200 text-xs font-bold border border-blue-300 dark:border-blue-700 shadow-2xs">
                  <span>{q}</span>
                  <button 
                    type="button" 
                    onClick={() => removeQualification(q)}
                    className="text-blue-700 hover:text-rose-600 font-black text-sm leading-none ml-0.5"
                    title="Remove degree"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Categorized Dropdown Selector */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Degree from Pakistani Categories:</Label>
            <Select value="" onValueChange={(val) => { if (val) addQualification(val); }}>
              <SelectTrigger className="h-9 text-xs rounded-xl bg-white dark:bg-slate-800 border-slate-200">
                <SelectValue placeholder="Click to choose a Pakistani degree/qualification..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {PAKISTAN_QUALIFICATIONS_PRESETS.map((catGroup) => (
                  <div key={catGroup.category} className="py-1">
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-superior-teal bg-slate-50 dark:bg-slate-800/60 rounded">
                      {catGroup.category}
                    </div>
                    {catGroup.degrees.map((deg) => (
                      <SelectItem key={deg} value={deg} className="text-xs font-medium cursor-pointer pl-4">
                        {deg}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Popular Faculty Degrees Quick Pills */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Popular Faculty Degrees (1-Click Add):</p>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-xl bg-white/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              {POPULAR_FACULTY_DEGREES.map(deg => {
                const isSelected = formData.qualifications.includes(deg);
                return (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => isSelected ? removeQualification(deg) : addQualification(deg)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-bold transition-all border",
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                    )}
                  >
                    {isSelected ? `✓ ${deg}` : `+ ${deg}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Degree Adder */}
          <div className="flex gap-2 pt-1">
            <Input
              placeholder="Type custom degree / specialization (e.g. M.Phil Nanotechnology, Ph.D Applied Physics)..."
              className="h-8 text-xs rounded-xl bg-white dark:bg-slate-800 border-slate-200"
              value={customDegreeInput}
              onChange={e => setCustomDegreeInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomQualification(); } }}
            />
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              onClick={() => handleAddCustomQualification()}
              className="h-8 px-3 text-xs rounded-xl font-bold border-blue-300 text-blue-800 hover:bg-blue-100"
            >
              Add Degree
            </Button>
          </div>
        </div>

        {/* Section 4: Teaching Subjects Selector */}
        <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-superior-teal" />
              <Label className="text-xs font-black text-teal-950 dark:text-teal-200">
                Teaching Subjects (Lectures & Academic Specialization)
              </Label>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
              {formData.subjects.length} Selected
            </span>
          </div>

          {/* Active Assigned Subjects Badges */}
          {formData.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800/60">
              <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold self-center mr-1">Assigned Subjects:</span>
              {formData.subjects.map(s => (
                <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-superior-teal dark:text-teal-300 text-[11px] font-bold border border-teal-200 dark:border-teal-800 shadow-2xs">
                  {s}
                  <button type="button" onClick={() => toggleSubject(s)} className="text-slate-400 hover:text-rose-500 font-bold ml-0.5">×</button>
                </span>
              ))}
            </div>
          )}

          {/* Quick-select pills */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TEACHING_SUBJECTS.map(subj => {
              const isSelected = formData.subjects.includes(subj);
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => toggleSubject(subj)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border",
                    isSelected
                      ? "bg-superior-teal text-white border-superior-teal shadow-2xs scale-102"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-superior-teal/50"
                  )}
                >
                  {isSelected ? `✓ ${subj}` : `+ ${subj}`}
                </button>
              );
            })}
          </div>

          {/* Custom subject adder */}
          <div className="flex gap-2 pt-1">
            <Input
              placeholder="Type custom subject and press Add..."
              className="h-8 text-xs rounded-xl bg-white dark:bg-slate-800"
              value={customSubjectInput}
              onChange={e => setCustomSubjectInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomSubject(); } }}
            />
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              onClick={() => handleAddCustomSubject()}
              className="h-8 px-3 text-xs rounded-xl font-bold border-teal-300 text-superior-teal hover:bg-teal-100/50"
            >
              Add
            </Button>
          </div>
        </div>

        {/* Section 5: Contact & Identification */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Phone size={14} className="text-superior-teal" />
            <span>Contact & Identity</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">CNIC Number</Label>
              <Input 
                className="h-9 text-xs rounded-xl"
                value={formData.cnic} 
                onChange={e => setFormData({...formData, cnic: e.target.value})} 
                placeholder="36104-XXXXXXX-X"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Contact Number</Label>
              <Input 
                className="h-9 text-xs rounded-xl"
                value={formData.contact} 
                onChange={e => setFormData({...formData, contact: e.target.value})} 
                placeholder="0300-XXXXXXX"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Date of Birth</Label>
              <Input 
                type="date"
                className="h-9 text-xs rounded-xl"
                value={formData.dob} 
                onChange={e => setFormData({...formData, dob: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#085a4e] dark:text-emerald-400">Date of Joining College *</Label>
              <Input 
                type="date"
                className="h-9 text-xs rounded-xl border-emerald-300 dark:border-emerald-700 bg-emerald-50/30"
                value={formData.joinDate} 
                onChange={e => setFormData({...formData, joinDate: e.target.value})} 
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Residential Address</Label>
            <Input 
              className="h-9 text-xs rounded-xl"
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})} 
              placeholder="Enter full address"
            />
          </div>
        </div>

        {/* Section 6: Payroll & Status */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <CreditCard size={14} className="text-superior-teal" />
            <span>Payroll & Status</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Monthly Base Salary (Rs.)</Label>
              <Input 
                type="number"
                className="h-9 text-xs rounded-xl"
                value={formData.salary} 
                onChange={e => setFormData({...formData, salary: Number(e.target.value), baseSalary: Number(e.target.value)})} 
                placeholder="e.g. 50000"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Account Status</Label>
              <Select value={formData.status || ""} onValueChange={(v: any) => setFormData({...formData, status: v})}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active" className="text-xs">Active</SelectItem>
                  <SelectItem value="Inactive" className="text-xs">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Sticky Bottom Footer - Always visible on all screens & zoom levels */}
      <div className="shrink-0 sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 py-3.5 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 z-20 shadow-lg">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose} 
          className="h-9 px-4 text-xs rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Cancel
        </Button>
        <Button 
          type="button" 
          className="h-9 px-5 text-xs rounded-xl font-bold bg-superior-teal text-white hover:bg-superior-teal/90 transition-colors shadow-sm cursor-pointer"
          onClick={handleSave}
        >
          Add Staff Member
        </Button>
      </div>
    </DialogContent>
  );
}

function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-slate-500 uppercase font-bold">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function RecordSalaryDialog({ member, data }: { member: Staff, data: any }) {
  const [formData, setFormData] = useState({
    amount: member.salary,
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    status: 'Paid' as const,
    receiptNumber: `SAL-${Date.now().toString().slice(-6)}`
  });

  const handleSave = () => {
    data.addSalaryPayment({
      ...formData,
      staffId: member.id,
      staffName: member.fullName
    });
    toast.success(`Salary recorded for ${member.fullName}`);
  };

  return (
    <DialogContent className="max-w-md bg-white rounded-3xl p-8">
      <DialogHeader>
        <DialogTitle className="text-2xl font-serif text-superior-teal">Record Salary Payment</DialogTitle>
        <DialogDescription>Recording payment for {member.fullName}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Month</Label>
            <Select value={formData.month || ""} onValueChange={v => setFormData({...formData, month: v})}>
              <SelectTrigger className="rounded-xl bg-slate-50 border-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Input type="number" value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})} className="rounded-xl bg-slate-50 border-transparent" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Amount (Rs.)</Label>
          <Input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="rounded-xl bg-slate-50 border-transparent" />
        </div>
        <div className="space-y-2">
          <Label>Payment Date</Label>
          <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="rounded-xl bg-slate-50 border-transparent" />
        </div>
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select value={formData.paymentMethod || ""} onValueChange={v => setFormData({...formData, paymentMethod: v})}>
            <SelectTrigger className="rounded-xl bg-slate-50 border-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-3">
        <DialogClose nativeButton={true} render={<button className="flex-1 h-12 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-colors" />}>
          Cancel
        </DialogClose>
        <DialogClose nativeButton={true} render={
          <button 
            className="flex-1 h-12 rounded-2xl bg-superior-teal text-white font-bold hover:bg-superior-teal/90 transition-colors"
            onClick={handleSave}
          />
        }>
          Confirm Payment
        </DialogClose>
      </div>
    </DialogContent>
  );
}
