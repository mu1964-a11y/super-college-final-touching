import * as React from "react";
import { useState, useMemo } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { CANONICAL_SESSIONS } from "../lib/academicMasterData";
import {
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Eye,
  CheckCircle2,
  Plus,
  Download,
  Camera,
  Upload,
  School,
  User,
  Trash2,
  CreditCard,
  GraduationCap,
  Users,
  AlertCircle,
  Info,
  Receipt,
  Shield,
  Wallet,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  Globe,
  Layers,
  FileSpreadsheet,
  Database,
  ScrollText,
  Building,
  Mail,
  Droplet,
  MapPin,
  MessageSquare,
  Sparkles,
  Share2,
  FileText,
  Fingerprint,
  Smartphone,
  Building2,
  Laptop,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SUBJECTS, ACADEMIC_GROUPS, COMPULSORY_SUBJECTS } from "../constants";
import { Admission, AdmissionStatus, Gender } from "../types";
import { HighlightText } from "./HighlightText";
import { toast } from "sonner";
import { exportElementToPdf } from "../utils/documentExporter";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import FeeReceipt from "./FeeReceipt";
import AdmissionSlip from "./AdmissionSlip";
import { compressImage } from "../lib/imageUtils";
import { sendAutoAdmissionNotice, buildAdmissionNoticeMessage } from "../lib/whatsappAutomation";
import { secugenService } from "../lib/secugenService";
import WhatsAppReportModal, { ReportRecipientItem } from "./WhatsAppReportModal";
import PhotoEditorModal from "./PhotoEditorModal";
import BulkImportWizard from "./BulkImportWizard";

export default function AdmissionsView({
  data,
  initialFilter,
  selectedSession,
  program,
}: {
  data: any;
  initialFilter?: string | null;
  selectedSession?: string;
  program?: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [feeFilter, setFeeFilter] = useState<string>(initialFilter || "all");
  const [admittedFilter, setAdmittedFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [photoFilter, setPhotoFilter] = useState<"all" | "with-photo" | "missing-photo">("all");
  const [editingPhotoAdmission, setEditingPhotoAdmission] = useState<Admission | null>(null);
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("date-new");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkImportWizardOpen, setIsBulkImportWizardOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkImportResults, setBulkImportResults] = useState<{
    success: number;
    errors: { row: number; name: string; reason: string }[];
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedAdmissions, setSelectedAdmissions] = useState<string[]>([]);
  const [activeAdmission, setActiveAdmission] = useState<Admission | null>(
    null,
  );
  const [dialogType, setDialogType] = useState<
    "profile" | "edit" | "slip" | "receipt" | "delete" | "bulkDelete" | null
  >(null);

  const [localProgram, setLocalProgram] = useState<string | undefined>(program);

  // Sync with initialFilter if it changes from sidebar
  React.useEffect(() => {
    if (initialFilter) {
      setFeeFilter(initialFilter);
    }
  }, [initialFilter]);

  React.useEffect(() => {
    const handleOpenNewAdmission = () => setIsAddDialogOpen(true);
    window.addEventListener("open-new-admission", handleOpenNewAdmission);
    return () =>
      window.removeEventListener("open-new-admission", handleOpenNewAdmission);
  }, []);

  React.useEffect(() => {
    setLocalProgram(program);
  }, [program]);

  const programAdmissions = useMemo(() => {
    return (data.admissions || []).filter((a: any) => {
      let matchesProgram = true;
      if (localProgram && localProgram !== "all") {
        const groupLower = (a.group || "").toLowerCase();
        const categoryLower = (a.category || "").toLowerCase();
        
        const isDIT = groupLower.includes("dit") || groupLower.includes("diploma") || categoryLower.includes("dit") || categoryLower.includes("diploma");
        const isBS = groupLower.includes("bs") || groupLower.includes("b.s") || categoryLower.includes("bs") || groupLower.includes("bba") || groupLower.includes("bachelor") || groupLower.includes("bscs") || groupLower.includes("bsit") || groupLower.includes("ads") || categoryLower.includes("ads") || groupLower.includes("adp") || categoryLower.includes("adp");
        const isUKL3 = groupLower.includes("uk") || groupLower.includes("level 3") || groupLower.includes("l3") || categoryLower.includes("uk");

        if (localProgram === "fsc")
          matchesProgram = !isDIT && !isBS && !isUKL3;
        else if (localProgram === "dit")
          matchesProgram = isDIT;
        else if (localProgram === "ukl3")
          matchesProgram = isUKL3;
        else if (localProgram === "bs")
          matchesProgram = isBS;
      }
      return matchesProgram;
    });
  }, [data.admissions, localProgram]);

  const summaryStats = useMemo(() => {
    return programAdmissions.reduce(
      (acc: any, a: any) => {
        const received = Number(a.feeReceived ?? a.fee_received ?? 0);
        const total = Number(a.totalPackage ?? a.total_package ?? a.totalFeeFinalized ?? 0);

        if (received >= total && total > 0) {
          acc.fullPaid++;
        } else if (received > 0) {
          acc.partialPaid++;
        } else {
          acc.unpaid++;
        }

        return acc;
      },
      { total: programAdmissions.length, fullPaid: 0, partialPaid: 0, unpaid: 0 },
    );
  }, [programAdmissions]);

  const photoStats = useMemo(() => {
    let withPhoto = 0;
    let missingPhoto = 0;
    for (const a of programAdmissions) {
      const hasP = Boolean(
        (a.photo && a.photo.trim().length > 10) ||
        ((a as any).photoUrl && (a as any).photoUrl.trim().length > 10) ||
        ((a as any).photo_url && (a as any).photo_url.trim().length > 10)
      );
      if (hasP) withPhoto++;
      else missingPhoto++;
    }
    return { withPhoto, missingPhoto, total: programAdmissions.length };
  }, [programAdmissions]);

  const filteredAdmissions = useMemo(() => {
    const baseList = debouncedSearch.trim() ? (data.admissions || []) : programAdmissions;
    return baseList
      .filter((a: Admission) => {
        const searchClean = (debouncedSearch || "").trim().toLowerCase();
        const matchesSearch =
          !searchClean ||
          (a.fullName || "").toLowerCase().includes(searchClean) ||
          (a.fatherName || "").toLowerCase().includes(searchClean) ||
          (a.studentId && a.studentId.toLowerCase().includes(searchClean)) ||
          (String(a.collegeNo || (a as any).college_no || "").toLowerCase().includes(searchClean)) ||
          (String(a.contactNumber || (a as any).contact || "").includes(searchClean)) ||
          (String(a.fatherContact || "").includes(searchClean)) ||
          (String(a.bayFormNo || (a as any).bay_form_no || "").includes(searchClean));

        const received = Number(a.feeReceived ?? (a as any).fee_received ?? 0);
        const total = Number(a.totalPackage ?? (a as any).total_package ?? (a as any).totalFeeFinalized ?? 0);
        let calcFeeStatus = "";
        if (received >= total && total > 0) {
          calcFeeStatus = "Full Paid";
        } else if (received > 0) {
          calcFeeStatus = "Partial Paid";
        } else {
          calcFeeStatus = "Not Paid";
        }
        const matchesFee = feeFilter === "all" || calcFeeStatus === feeFilter;
        const matchesGender =
          genderFilter === "all" || a.gender === genderFilter;

        let matchesProgram = true;
        // When searching by query across all admissions, apply program filter if active
        if (debouncedSearch.trim() && localProgram && localProgram !== "all") {
          const groupLower = (a.group || "").toLowerCase();
          const categoryLower = (a.category || "").toLowerCase();
          
          const isDIT = groupLower.includes("dit") || groupLower.includes("diploma") || categoryLower.includes("dit") || categoryLower.includes("diploma");
          const isBS = groupLower.includes("bs") || groupLower.includes("b.s") || categoryLower.includes("bs") || groupLower.includes("bba") || groupLower.includes("bachelor") || groupLower.includes("bscs") || groupLower.includes("bsit") || groupLower.includes("ads") || categoryLower.includes("ads") || groupLower.includes("adp") || categoryLower.includes("adp");
          const isUKL3 = groupLower.includes("uk") || groupLower.includes("level 3") || groupLower.includes("l3") || categoryLower.includes("uk");

          if (localProgram === "fsc")
            matchesProgram = !isDIT && !isBS && !isUKL3;
          else if (localProgram === "dit")
            matchesProgram = isDIT;
          else if (localProgram === "ukl3")
            matchesProgram = isUKL3;
          else if (localProgram === "bs")
            matchesProgram = isBS;
        }

        // Diversion Logic: Only show students who are NOT yet fully admitted (haven't paid initial fee)
        const statusStr = a.status as string;
        const isFullyEnrolled = a.isAdmitted === true ||
        statusStr === "Admitted/Confirmed" ||
        statusStr === "Admitted" ||
        statusStr === "Confirmed" ||
        statusStr === "Full Paid" ||
        statusStr === "Partial Paid" ||
        received > 0;
        
        const matchesAdmitted =
          admittedFilter === "all" ||
          (admittedFilter === "Admitted" && isFullyEnrolled) ||
          (admittedFilter === "Prospective" && !isFullyEnrolled);

        const hasPhoto = Boolean(
          (a.photo && a.photo.trim().length > 10) ||
          ((a as any).photoUrl && (a as any).photoUrl.trim().length > 10) ||
          ((a as any).photo_url && (a as any).photo_url.trim().length > 10)
        );
        const matchesPhoto =
          photoFilter === "all" ||
          (photoFilter === "with-photo" && hasPhoto) ||
          (photoFilter === "missing-photo" && !hasPhoto);

        return (
          matchesSearch &&
          matchesFee &&
          matchesGender &&
          matchesAdmitted &&
          matchesProgram &&
          matchesPhoto
        );
      })
      .sort((a: Admission, b: Admission) => {
        if (sortBy === "date-new")
          return String(b.dateApplied || b.date || "").localeCompare(
            String(a.dateApplied || a.date || ""),
          );
        if (sortBy === "date-old")
          return String(a.dateApplied || a.date || "").localeCompare(
            String(b.dateApplied || b.date || ""),
          );
        if (sortBy === "name-az")
          return (a.fullName || "").localeCompare(b.fullName || "");
        if (sortBy === "status")
          return (a.status || "").localeCompare(b.status || "");
        return 0;
      });
  }, [
    programAdmissions,
    data.admissions,
    debouncedSearch,
    feeFilter,
    admittedFilter,
    genderFilter,
    photoFilter,
    sortBy,
    localProgram,
  ]);

  const programStats = useMemo(() => {
    return programAdmissions.reduce(
      (acc: any, a: any) => {
        const received = Number(a.feeReceived || 0);
        const total = Number(a.totalPackage || 0);

        if (received >= total && total > 0) acc.fullPaid++;
        else if (received > 0) acc.partialPaid++;
        else acc.unpaid++;

        const groupLower = (a.group || "").toLowerCase();
        const catLower = (a.category || "").toLowerCase();
        if (localProgram === "fsc") {
          if (
            groupLower.includes("part 2") ||
            groupLower.includes("part ii") ||
            groupLower.includes("part-2") ||
            groupLower.includes("12th") ||
            catLower.includes("part-2") ||
            catLower.includes("part 2")
          ) {
            acc.part2++;
          } else {
            acc.part1++;
          }
        }
        if (localProgram === "bs") {
          const combined = `${groupLower} ${catLower}`;
          if (combined.includes("1st") || combined.includes("sem 1") || combined.includes("semester 1")) acc.sem1++;
          else if (combined.includes("2nd") || combined.includes("sem 2") || combined.includes("semester 2")) acc.sem2++;
          else if (combined.includes("3rd") || combined.includes("sem 3") || combined.includes("semester 3")) acc.sem3++;
          else if (combined.includes("4th") || combined.includes("sem 4") || combined.includes("semester 4")) acc.sem4++;
          else if (combined.includes("5th") || combined.includes("sem 5") || combined.includes("semester 5") || combined.includes("lateral")) acc.sem5++;
          else if (combined.includes("6th") || combined.includes("sem 6") || combined.includes("semester 6")) acc.sem6++;
          else if (combined.includes("7th") || combined.includes("sem 7") || combined.includes("semester 7")) acc.sem7++;
          else if (combined.includes("8th") || combined.includes("sem 8") || combined.includes("semester 8")) acc.sem8++;
          else acc.otherSem++;
        }
        if (localProgram === "ukl3") {
          if (groupLower.includes("dit")) {
            acc.dit++;
          } else if (groupLower.includes("bs")) {
            acc.bs++;
          } else {
            acc.other++;
          }
        }

        return acc;
      },
      {
        total: programAdmissions.length,
        fullPaid: 0,
        partialPaid: 0,
        unpaid: 0,
        part1: 0,
        part2: 0,
        sem1: 0,
        sem2: 0,
        sem3: 0,
        sem4: 0,
        sem5: 0,
        sem6: 0,
        sem7: 0,
        sem8: 0,
        otherSem: 0,
        dit: 0,
        bs: 0,
        other: 0,
      },
    );
  }, [programAdmissions, localProgram]);

  const programTitle = useMemo(() => {
    switch (localProgram) {
      case "fsc":
        return "Inter";
      case "ukl3":
        return "U.K. Level 3";
      case "dit":
        return "D.I.T.";
      case "bs":
        return "BS";
      case "all":
        return "All Programs";
      default:
        return "Program";
    }
  }, [localProgram]);

  // Handle pagination for better performance
  const ITEMS_PER_PAGE = 30;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredAdmissions.length / ITEMS_PER_PAGE);

  // Reset pagination when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearch,
    feeFilter,
    admittedFilter,
    genderFilter,
    sortBy,
    localProgram,
  ]);

  const visibleAdmissions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredAdmissions.slice(start, end);
  }, [filteredAdmissions, currentPage]);

  const getStatusBadge = (
    status: AdmissionStatus,
    isAdmitted: boolean,
    feeReceived?: number,
    totalPackage?: number,
  ) => {
    if (!isAdmitted)
      return (
        <Badge
          variant="outline"
          className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full"
        >
          Pending
        </Badge>
      );

    const received = Number(feeReceived || 0);
    const total = Number(totalPackage || 0);

    // Dynamic financial status check (ensures records match active fee filter)
    if (total > 0 && received >= total) {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full"
        >
          Full Paid
        </Badge>
      );
    }

    if (received > 0 && received < total) {
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full"
        >
          Partial Paid
        </Badge>
      );
    }

    if (total > 0 && received === 0) {
      return (
        <Badge
          variant="outline"
          className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full"
        >
          Unpaid
        </Badge>
      );
    }

    switch (status) {
      case "Full Paid":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full"
          >
            Full Paid
          </Badge>
        );
      case "Partial Paid":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full"
          >
            Partial Paid
          </Badge>
        );
      case "Not Paid":
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full"
          >
            Unpaid
          </Badge>
        );
      case "Admitted/Confirmed":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full"
          >
            Confirmed
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full"
          >
            {status || "Confirmed"}
          </Badge>
        );
    }
  };

  // Bulk WhatsApp modal state
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

  const sendWhatsAppConfirmationNotice = async (admission: Admission) => {
    await sendAutoAdmissionNotice(admission, data?.settings, { manualTrigger: true });
  };

  const handleOpenBulkWhatsAppModal = (targetAdmissionIds?: string[]) => {
    const allAdmissions: Admission[] = data.admissions || [];
    const list = targetAdmissionIds && targetAdmissionIds.length > 0
      ? allAdmissions.filter((a: Admission) => targetAdmissionIds.includes(a.id))
      : filteredAdmissions;

    if (list.length === 0) {
      toast.error("No admissions available to broadcast.");
      return;
    }

    const items: ReportRecipientItem[] = list.map((a: Admission) => {
      const msg = buildAdmissionNoticeMessage(a, data?.settings);
      const rollNo = a.collegeNo || (a as any).rollNo || a.studentId || a.id || "N/A";
      return {
        id: a.id,
        student: a,
        name: a.fullName,
        phone: a.fatherContact || a.contactNumber || (a as any).phone || (a as any).mobile || "",
        rollNo,
        className: `${a.group || 'Admission'} (Sec: ${a.section || 'A'})`,
        message: msg,
        statusBadge: a.status || "Pending",
      };
    });

    setBulkModalProps({
      title: "Broadcast Admission Confirmation Notices",
      subtitle: `Target: ${items.length} Applicants (${selectedSession || 'All Sessions'})`,
      items
    });
    setIsBulkWhatsAppModalOpen(true);
  };

  const handleConfirm = (id: string) => {
    data.confirmAdmission(id, data.currentUser?.email);
  };

  const toggleSelectAll = () => {
    if (selectedAdmissions.length === filteredAdmissions.length) {
      setSelectedAdmissions([]);
    } else {
      setSelectedAdmissions(filteredAdmissions.map((a: Admission) => a.id));
    }
  };

  const toggleSelectAdmission = (id: string) => {
    setSelectedAdmissions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleBulkDelete = () => {
    setDialogType("bulkDelete");
  };

  const handleExportCSV = (customList?: Admission[]) => {
    const target = customList || (selectedAdmissions.length > 0
      ? filteredAdmissions.filter((a) => selectedAdmissions.includes(a.id))
      : filteredAdmissions);

    const exportData = target.map((a) => ({
      "Student ID": a.studentId || "PENDING",
      "Registration #": a.id,
      Name: a.fullName,
      "Father Name": a.fatherName,
      Gender: a.gender,
      DOB: a.dob,
      CNIC: a.cnic,
      Contact: a.contactNumber || a.fatherContact || "",
      Category: a.category,
      "Program/Group": a.group,
      Section: a.section || "",
      Session: a.session || selectedSession || "",
      "Total Package": a.totalPackage || a.totalFeeFinalized || 0,
      "Fee Received": a.feeReceived || 0,
      "Remaining Balance": (Number(a.totalPackage || a.totalFeeFinalized || 0) - Number(a.feeReceived || 0)),
      Status: a.status,
    }));

    if (exportData.length === 0) {
      toast.error("No candidate data to export");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `admissions_export_${selectedSession || '2026-28'}_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportExcel = (customList?: Admission[]) => {
    const target = customList || (selectedAdmissions.length > 0
      ? filteredAdmissions.filter((a) => selectedAdmissions.includes(a.id))
      : filteredAdmissions);

    const exportData = target.map((a) => ({
      "Student ID": a.studentId || "PENDING",
      "Registration #": a.id,
      Name: a.fullName,
      "Father Name": a.fatherName,
      Gender: a.gender,
      DOB: a.dob,
      CNIC: a.cnic,
      Contact: a.contactNumber || a.fatherContact || "",
      Category: a.category,
      "Program/Group": a.group,
      Section: a.section || "",
      Session: a.session || selectedSession || "",
      "Total Package": a.totalPackage || a.totalFeeFinalized || 0,
      "Fee Received": a.feeReceived || 0,
      "Remaining Balance": (Number(a.totalPackage || a.totalFeeFinalized || 0) - Number(a.feeReceived || 0)),
      Status: a.status,
    }));

    if (exportData.length === 0) {
      toast.error("No candidate data to export");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Admissions");
    XLSX.writeFile(
      wb,
      `admissions_export_${selectedSession || '2026-28'}_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    toast.success(`Excel file downloaded with ${target.length} records!`);
  };

  const handleExportPDF = (customList?: Admission[]) => {
    const target = customList || (selectedAdmissions.length > 0
      ? filteredAdmissions.filter((a) => selectedAdmissions.includes(a.id))
      : filteredAdmissions);

    if (target.length === 0) {
      toast.error("No candidate records found to export.");
      return;
    }

    try {
      toast.loading("Generating Admissions PDF Report...", { id: "adm-pdf" });
      const doc = new jsPDF("landscape", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const isCustomSelection = selectedAdmissions.length > 0 && target.length === selectedAdmissions.length;
      const sessionLabel = selectedSession || data?.settings?.academicSession || "2026-28";
      const campusLabel = data?.settings?.campusName || data?.settings?.collegeName || "Jahanian Campus";

      // 1. TOP HEADER BANNER (Superior Teal #085a4e)
      doc.setFillColor(8, 90, 78);
      doc.rect(0, 0, pageWidth, 58, "F");

      // College Title
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("SUPERIOR GROUP OF COLLEGES", 36, 25);

      // Gold Subtitle
      doc.setTextColor(201, 168, 76);
      doc.setFontSize(10.5);
      doc.text("ADMISSIONS PIPELINE & CANDIDATE INTAKE REPORT", 36, 40);

      // Right Campus & Session badge
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`${campusLabel}  |  Session ${sessionLabel}`, pageWidth - 36, 28, { align: "right" });
      doc.setFontSize(7.5);
      doc.setTextColor(200, 230, 220);
      doc.text(`Generated on ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`, pageWidth - 36, 42, { align: "right" });

      // 2. CONTEXT & METADATA BAR (Explains what this record is)
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(36, 68, pageWidth - 72, 34, 5, 5, "FD");

      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      const scopeText = isCustomSelection 
        ? `Scope: Selected Candidates (${target.length} records)` 
        : `Scope: Filtered Pipeline (${target.length} records)`;
      const groupText = `Program: ${localProgram && localProgram !== 'all' ? localProgram.toUpperCase() : 'All Programs'}`;
      const feeText = `Fee Category: ${feeFilter === 'all' ? 'All (Full Paid, Partial, Unpaid)' : feeFilter}`;
      const userText = `Admin: ${data?.currentUser?.displayName || data?.currentUser?.email?.split('@')[0] || 'Administrator'}`;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(8, 90, 78);
      doc.text(scopeText, 48, 82);
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      doc.text(`|   ${groupText}   |   ${feeText}   |   ${userText}`, 48 + doc.getTextWidth(scopeText) + 8, 82);

      // Financial totals
      let totalGross = 0;
      let totalReceived = 0;
      target.forEach((a) => {
        const pkg = Number(a.totalPackage || a.totalFeeFinalized || 0);
        const rec = Number(a.feeReceived || 0);
        totalGross += pkg;
        totalReceived += rec;
      });
      const totalRemaining = totalGross - totalReceived;

      doc.setFont("helvetica", "bold");
      doc.text(
        `Total Package: Rs. ${totalGross.toLocaleString()}   |   Received: Rs. ${totalReceived.toLocaleString()}   |   Outstanding Balance: Rs. ${totalRemaining.toLocaleString()}`,
        48,
        93
      );

      // 3. TABLE GENERATION
      autoTable(doc, {
        startY: 110,
        margin: { left: 36, right: 36, bottom: 55 },
        head: [[
          "#",
          "Student ID",
          "Applicant Name",
          "Father Name",
          "Contact / WhatsApp",
          "Program & Group",
          "Sec",
          "Total Fee",
          "Paid",
          "Remaining",
          "Status"
        ]],
        body: target.map((a, idx) => {
          const pkg = Number(a.totalPackage || a.totalFeeFinalized || 0);
          const rec = Number(a.feeReceived || 0);
          const rem = pkg - rec;
          let statusText = "Pending";
          if (a.isAdmitted || (a.status as string) === "Admitted") statusText = "Admitted";
          else if (rec >= pkg && pkg > 0) statusText = "Full Paid";
          else if (rec > 0) statusText = "Partial Paid";
          else statusText = "Unpaid";

          return [
            String(idx + 1),
            a.studentId || a.collegeNo || `Pending (${a.id.slice(-4)})`,
            a.fullName || "-",
            a.fatherName || "-",
            a.contactNumber || a.fatherContact || "-",
            `${a.category || ''} ${a.group ? `(${a.group})` : ''}`.trim() || "-",
            a.section && a.section !== '-' ? a.section : "-",
            `Rs. ${pkg.toLocaleString()}`,
            `Rs. ${rec.toLocaleString()}`,
            `Rs. ${rem.toLocaleString()}`,
            statusText
          ];
        }),
        foot: [[
          "Total",
          "",
          `${target.length} Candidate(s)`,
          "",
          "",
          "",
          "",
          `Rs. ${totalGross.toLocaleString()}`,
          `Rs. ${totalReceived.toLocaleString()}`,
          `Rs. ${totalRemaining.toLocaleString()}`,
          ""
        ]],
        theme: "grid",
        styles: {
          fontSize: 7.5,
          cellPadding: 3.5,
          valign: "middle",
          lineColor: [226, 232, 240],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [8, 90, 78],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 22, halign: "center" },
          1: { cellWidth: 68, fontStyle: "bold", textColor: [8, 90, 78] },
          2: { cellWidth: 95, fontStyle: "bold" },
          3: { cellWidth: 90 },
          4: { cellWidth: 80 },
          5: { cellWidth: 90 },
          6: { cellWidth: 28, halign: "center" },
          7: { cellWidth: 65, halign: "right", fontStyle: "bold" },
          8: { cellWidth: 62, halign: "right", textColor: [16, 149, 106], fontStyle: "bold" },
          9: { cellWidth: 65, halign: "right", textColor: [225, 29, 72], fontStyle: "bold" },
          10: { cellWidth: 55, halign: "center", fontStyle: "bold" },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: "bold",
          fontSize: 8,
          halign: "right",
        },
        didDrawPage: () => {
          const str = `Page ${doc.getNumberOfPages()}`;
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(str, pageWidth - 40, pageHeight - 16, { align: "right" });
          doc.text("Superior Group of Colleges Jahanian • Official Admissions Record", 36, pageHeight - 16);
        }
      });

      // 4. SIGNATURE LINES on the last page
      const finalY = (doc as any).lastAutoTable?.finalY || 400;
      const signatureY = finalY + 45 > pageHeight - 40 ? pageHeight - 35 : finalY + 35;
      
      if (signatureY < pageHeight - 20) {
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.8);
        doc.line(60, signatureY, 200, signatureY);
        doc.line(340, signatureY, 480, signatureY);
        doc.line(620, signatureY, 760, signatureY);

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("Prepared By (Incharge)", 130, signatureY + 12, { align: "center" });
        doc.text("Accounts Verification", 410, signatureY + 12, { align: "center" });
        doc.text("Principal / Campus Director", 690, signatureY + 12, { align: "center" });
      }

      const fileName = `SGC_Admissions_${sessionLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${isCustomSelection ? 'Selected_' + target.length : 'All_' + target.length}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      toast.success(`PDF Report successfully generated for ${target.length} candidate(s)!`, { id: "adm-pdf" });
    } catch (err: any) {
      console.error("PDF Export Error:", err);
      toast.error(`Failed to generate PDF: ${err.message}`, { id: "adm-pdf" });
    }
  };

  const handleDownloadFormat = () => {
    const templateData = [
      {
        "Full Name": "Ahmad Raza",
        "Father Name": "Muhammad Raza",
        Gender: "Male",
        "Date of Birth": "2008-05-15",
        "Bay Form No": "36101-0000000-0",
        "Contact Number": "03001234567",
        "Father Contact": "03007654321",
        "Previous School": "Alpha Secondary School",
        "Previous Class": "10th",
        "Board Roll No": "123456",
        "Previous Marks": 950,
        "Academic Group": "Pre-Engineering",
        Category: "Inter Part-1 Boys",
        "Admission Fee": 5000,
        "Misc Funds": 2000,
        "Tuition Fee": 60000,
        "Fee Received": 10000,
        "Payment Plan": "Installments",
        Reference: "Website",
        Address: "House 123, Street 4, Jahanian",
        Subjects: "Physics, Chemistry, Maths",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Admissions Template");

    // Add a second sheet with instructions/options
    const optionsData = [
      { Field: "Gender", Options: "Male, Female" },
      { Field: "Previous Class", Options: "9th, 10th" },
      { Field: "Payment Plan", Options: "Semester, Installments" },
      {
        Field: "Academic Group",
        Options: ACADEMIC_GROUPS.map((g) => g.name).join(", "),
      },
    ];
    const wsOptions = XLSX.utils.json_to_sheet(optionsData);
    XLSX.utils.book_append_sheet(wb, wsOptions, "Supported Options");

    XLSX.writeFile(wb, "Admission_Format_Template.xlsx");
    toast.success("Template downloaded successfully");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

        const results: {
          success: number;
          errors: { row: number; name: string; reason: string }[];
        } = { success: 0, errors: [] };

        const newAdmissions: any[] = [];

        jsonData.forEach((row, index) => {
          const rowNum = index + 2; // Excel row number (1-indexed + header)
          const rawName = row["Full Name"] || row["Name"];
          const name = String(rawName || "Unknown").trim();

          const errors: string[] = [];

          // Basic Validations
          if (!rawName) errors.push("Missing Full Name/Name column");
          if (!row["Father Name"]) errors.push("Missing Father Name column");

          // Gender Validation
          const rawGender = String(row["Gender"] || "")
            .trim()
            .toLowerCase();
          let normalizedGender: Gender | null = null;
          if (["male", "boy", "m", "bi", "larka"].includes(rawGender))
            normalizedGender = "Male";
          else if (["female", "girl", "f", "gi", "larki"].includes(rawGender))
            normalizedGender = "Female";

          if (!normalizedGender) {
            errors.push(
              `Invalid Gender: "${row["Gender"] || "Empty"}". Valid values: Male, Female, Boy, Girl.`,
            );
          }

          const rawGroup = String(
            row["Academic Group"] || row["Program/Group"] || row["Group"] || "",
          ).trim();
          if (!rawGroup) {
            errors.push(
              "Missing Academic Group (e.g., Pre-Engineering, Medical, etc.)",
            );
          }

          // Advanced Matching Logic for Academic Groups
          let validGroup = null;
          if (rawGroup) {
            const cleanInput = rawGroup.toLowerCase().replace(/[^a-z0-9]/g, ""); // strip all non-alphanumeric

            validGroup = ACADEMIC_GROUPS.find((g) => {
              const cleanOfficial = g.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");
              // Match if input is contained in official or official starts with input
              return (
                cleanOfficial.includes(cleanInput) ||
                (cleanInput.includes("preengineering") &&
                  cleanOfficial.includes("preengineering"))
              );
            });

            // Special case for Pre-Engineering / Pre-Medical common terms
            if (!validGroup) {
              if (cleanInput.includes("eng") || cleanInput.includes("math")) {
                validGroup = ACADEMIC_GROUPS.find((g) =>
                  g.name.includes("Pre Engineering"),
                );
              } else if (
                cleanInput.includes("med") ||
                cleanInput.includes("bio")
              ) {
                validGroup = ACADEMIC_GROUPS.find((g) =>
                  g.name.includes("Premedical"),
                );
              } else if (cleanInput.includes("icom")) {
                validGroup = ACADEMIC_GROUPS.find((g) =>
                  g.name.includes("I. Com"),
                );
              } else if (
                cleanInput.includes("cs") ||
                cleanInput.includes("comp")
              ) {
                validGroup = ACADEMIC_GROUPS.find((g) =>
                  g.name.includes("General Science"),
                );
              }
            }
          }

          if (rawGroup && !validGroup) {
            errors.push(
              `Group mismatch: "${rawGroup}". Best matches: FSC (Pre Engineering), FSC (Premedical), I. Com, DIT.`,
            );
          }

          if (errors.length > 0) {
            results.errors.push({
              row: rowNum,
              name,
              reason: errors.join(" | "),
            });
            return;
          }

          // If passed validation, prepare data
          const admissionFee = Number(row["Admission Fee"] || 0);
          const miscFunds = Number(row["Misc Funds"] || 0);
          const tuitionFee = Number(
            row["Tuition Fee"] || row["totalFeeFinalized"] || 0,
          );
          const totalPackage = admissionFee + miscFunds + tuitionFee;

          const admission: any = {
            id: `adm-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
            fullName: name,
            fatherName: String(row["Father Name"]).trim(),
            gender: (normalizedGender || "Male") as Gender,
            dob:
              row["Date of Birth"] || row["DOB"]
                ? String(row["Date of Birth"] || row["DOB"])
                : "",
            bayFormNo:
              row["Bay Form No"] || row["CNIC"]
                ? String(row["Bay Form No"] || row["CNIC"])
                : "",
            contactNumber: String(row["Contact Number"] || row["Phone"] || ""),
            fatherContact: String(row["Father Contact"] || ""),
            previousSchool: row["Previous School"] || "",
            previousClass: (String(row["Previous Class"]).includes("9")
              ? "9th"
              : "10th") as "9th" | "10th",
            boardRollNo: String(row["Board Roll No"] || ""),
            previousMarks: Number(row["Previous Marks"] || 0),
            group: validGroup?.name || rawGroup,
            category:
              row["Category"] ||
              (normalizedGender === "Female"
                ? "Inter Part-1 Girls"
                : "Inter Part-1 Boys"),
            admissionFee,
            miscFunds,
            totalFeeFinalized: tuitionFee,
            totalPackage,
            feeReceived: Number(row["Fee Received"] || 0),
            paymentPlan: (String(row["Payment Plan"])
              .toLowerCase()
              .includes("sem")
              ? "Semester"
              : "Installments") as any,
            reference: row["Reference"] || "Bulk Import",
            address: row["Address"] || "",
            subjects: row["Subjects"]
              ? String(row["Subjects"])
                  .split(/[,;|]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
              : validGroup?.subjects || [],
            date: new Date().toISOString().split("T")[0],
            dateApplied: new Date().toISOString().split("T")[0],
            status:
              Number(row["Fee Received"]) > 0
                ? "Admitted/Confirmed"
                : "Prospective",
            isAdmitted: Number(row["Fee Received"]) > 0,
            session:
              selectedSession || data?.settings?.academicSession || "2026-28",
          };

          // Generate Student ID if fee received
          if (admission.feeReceived > 0) {
            admission.studentId = data.generateStudentId(
              admission.group || program,
            );
            admission.status = "Admitted/Confirmed";
          }

          newAdmissions.push(admission);
          results.success++;
        });

        if (newAdmissions.length > 0) {
          data.importAdmissions(newAdmissions);
        }

        setBulkImportResults(results);
        setIsBulkDialogOpen(true);

        if (results.errors.length === 0) {
          toast.success(
            `Bulk Import Successful! Imported ${results.success} students.`,
          );
        } else if (results.success > 0) {
          toast.warning(
            `Partial Import: ${results.success} success, ${results.errors.length} failed.`,
          );
        } else {
          toast.error(
            `Bulk Import Failed: All ${results.errors.length} rows had errors.`,
          );
        }
      } catch (error) {
        console.error("Error parsing Excel:", error);
        toast.error(
          "Failed to parse Excel file. Please ensure it is a valid format.",
        );
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3 pb-12">
      {/* Compact Header Line (< 45px) */}
      <div className="flex flex-wrap justify-between items-center gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span>Admission Pipeline</span>
            <span className="font-nastaleeq text-xs text-superior-gold font-medium px-1.5 py-0.5 bg-superior-gold/10 rounded-md">
              داخلہ پائپ لائن
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              {summaryStats.total}
            </span>
          </h2>

          {/* Inline Program Group Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
            {[
              { id: 'all', label: 'All Groups' },
              { id: 'fsc', label: 'Inter' },
              { id: 'dit', label: 'DIT' },
              { id: 'ukl3', label: 'UKL3' },
              { id: 'bs', label: 'BS' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setLocalProgram(tab.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer",
                  (localProgram || 'all') === tab.id
                    ? "bg-white dark:bg-slate-700 text-superior-teal dark:text-superior-gold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs h-8.5 px-3 shadow-xs hover:bg-slate-50 transition-all flex items-center gap-1.5"
                >
                  <MoreHorizontal size={14} className="text-slate-400" />
                  <span>Actions</span>
                </Button>
              }
            />
            <DropdownMenuContent className="w-56 rounded-2xl shadow-2xl border-none p-2">
              <DropdownMenuItem
                onClick={handleDownloadFormat}
                className="rounded-lg py-2 cursor-pointer text-xs font-semibold"
              >
                <FileSpreadsheet size={15} className="mr-2 text-emerald-600" />
                Download Format Template
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsBulkImportWizardOpen(true)}
                className="rounded-lg py-2 cursor-pointer text-xs font-semibold"
              >
                <Upload size={15} className="mr-2 text-blue-600" />
                Bulk Import Admissions (3-Stage Wizard)
              </DropdownMenuItem>
              <Separator className="my-1.5" />
              <DropdownMenuItem
                onClick={() => handleExportPDF()}
                className="rounded-lg py-2 cursor-pointer text-xs font-semibold text-rose-600"
              >
                <FileText size={15} className="mr-2 text-rose-600" />
                Export to PDF Report
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportExcel()}
                className="rounded-lg py-2 cursor-pointer text-xs font-semibold text-emerald-600"
              >
                <Download size={15} className="mr-2 text-emerald-600" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportCSV()}
                className="rounded-lg py-2 cursor-pointer text-xs font-semibold text-amber-600"
              >
                <Download size={15} className="mr-2 text-amber-600" />
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger
              render={
                <button className="h-8.5 px-3.5 rounded-xl bg-superior-teal text-white font-bold text-xs hover:bg-superior-teal/90 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer">
                  <Plus size={15} /> New Admission
                </button>
              }
            ></DialogTrigger>
            <DialogContent className="max-w-[1680px] w-[98vw] h-[92vh] max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-3xl border-none shadow-2xl bg-white dark:bg-slate-900">
              <div className="bg-gradient-to-r from-superior-teal via-teal-900 to-slate-900 px-6 py-4 text-white relative overflow-hidden flex items-center justify-between shrink-0 shadow-sm border-b border-white/10">
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-white shadow-inner">
                    <Sparkles size={20} className="text-superior-gold" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl sm:text-2xl font-serif font-black tracking-tight text-white uppercase">
                      Student Admission Dossier
                    </DialogTitle>
                    <p className="text-teal-100/70 text-[11px] font-bold uppercase tracking-wider">
                      Session {selectedSession || data?.settings?.academicSession || "2026-28"} · {data?.settings?.collegeName || "Jahanian Campus"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/50">
                {isAddDialogOpen && (
                  <AdmissionForm
                    data={data}
                    onClose={() => setIsAddDialogOpen(false)}
                    selectedSession={selectedSession}
                    program={program}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk Import Results Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display font-black tracking-tight uppercase flex items-center gap-3">
                <Database size={24} className="text-emerald-400" />
                Bulk Import Results
              </DialogTitle>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-2">
                Processing Summary · Session{" "}
                {data?.settings?.academicSession || "2026-28"}
              </p>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <span className="text-3xl font-black text-emerald-700">
                  {bulkImportResults?.success || 0}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70 mt-1">
                  Successful Imports
                </span>
              </div>
              <div
                className={cn(
                  "rounded-3xl p-6 flex flex-col items-center justify-center text-center border",
                  (bulkImportResults?.errors.length || 0) > 0
                    ? "bg-rose-50 border-rose-100 text-rose-700"
                    : "bg-slate-50 border-slate-100 text-slate-400",
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-3",
                    (bulkImportResults?.errors.length || 0) > 0
                      ? "bg-rose-100 text-rose-600"
                      : "bg-slate-100",
                  )}
                >
                  <AlertCircle size={24} />
                </div>
                <span className="text-3xl font-black">
                  {bulkImportResults?.errors.length || 0}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 mt-1">
                  Failed Entries
                </span>
              </div>
            </div>

            {(bulkImportResults?.errors.length || 0) > 0 && (
              <div className="space-y-4">
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1 flex items-center gap-2">
                    <Info size={12} /> How to fix these errors:
                  </p>
                  <p className="text-xs text-rose-500 font-medium leading-relaxed">
                    Check your Excel file for the rows listed below. Ensure
                    "Academic Group" and "Gender" match the official names
                    exactly as shown in the downloadable template.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-rose-500" />
                    Error Details
                  </h4>
                  <Badge
                    variant="outline"
                    className="text-[9px] border-rose-200 text-rose-500 font-black uppercase"
                  >
                    Required Action
                  </Badge>
                </div>
                <div className="max-h-[300px] overflow-y-auto rounded-3xl border border-slate-100 divide-y divide-slate-50">
                  {bulkImportResults?.errors.map((err, i) => (
                    <div
                      key={i}
                      className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-black shrink-0">
                        R{err.row}
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-900">
                          {err.name}
                        </div>
                        <div className="text-xs text-rose-500 font-medium leading-relaxed">
                          {err.reason}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                onClick={() => setIsBulkDialogOpen(false)}
                className="w-full h-14 rounded-2xl bg-superior-teal text-white font-black uppercase tracking-widest text-[10px] hover:bg-superior-teal/90 transition-all shadow-xl shadow-superior-teal/10"
              >
                Close Summary
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* High-Density Quick Status Chips Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#064e43] text-white px-3 py-1.5 rounded-2xl shadow-xs border border-emerald-500/20 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setFeeFilter("all");
              setAdmittedFilter("all");
            }}
            className={cn(
              "px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5",
              feeFilter === "all" && admittedFilter === "all" ? "bg-white text-[#064e43] shadow-xs" : "text-white/80 hover:text-white hover:bg-white/10"
            )}
          >
            <span>Total:</span>
            <span className="font-black">{summaryStats.total}</span>
          </button>
          <span className="text-white/30">•</span>
          <button
            type="button"
            onClick={() => setFeeFilter("Full Paid")}
            className={cn(
              "px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5",
              feeFilter === "Full Paid" ? "bg-emerald-400 text-slate-900 shadow-xs" : "text-emerald-300 hover:text-white hover:bg-white/10"
            )}
          >
            <span>Full Paid:</span>
            <span className="font-black">{summaryStats.fullPaid}</span>
          </button>
          <span className="text-white/30">•</span>
          <button
            type="button"
            onClick={() => setFeeFilter("Partial Paid")}
            className={cn(
              "px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5",
              feeFilter === "Partial Paid" ? "bg-amber-400 text-slate-900 shadow-xs" : "text-amber-300 hover:text-white hover:bg-white/10"
            )}
          >
            <span>Partial:</span>
            <span className="font-black">{summaryStats.partialPaid}</span>
          </button>
          <span className="text-white/30">•</span>
          <button
            type="button"
            onClick={() => setFeeFilter("Not Paid")}
            className={cn(
              "px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5",
              feeFilter === "Not Paid" ? "bg-rose-400 text-slate-900 shadow-xs" : "text-rose-300 hover:text-white hover:bg-white/10"
            )}
          >
            <span>Unpaid:</span>
            <span className="font-black">{summaryStats.unpaid}</span>
          </button>
        </div>

        {localProgram && localProgram !== "all" && summaryStats.total > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-emerald-200 bg-white/10 px-2.5 py-0.5 rounded-xl border border-white/10">
            <span className="font-bold">{programTitle}:</span>
            <span className="font-black text-white">{summaryStats.total}</span>
            {localProgram === "fsc" && <span className="opacity-80">(Part-1: {programStats.part1}, Part-2: {programStats.part2})</span>}
            {localProgram === "bs" && (
              <span className="opacity-80">
                (Sem 1: {programStats.sem1}, Sem 3: {programStats.sem3}, Sem 5: {programStats.sem5}, Sem 7: {programStats.sem7})
              </span>
            )}
            {localProgram === "dit" && <span className="opacity-80">(Diploma in IT)</span>}
            {localProgram === "ukl3" && <span className="opacity-80">(UK Level 3)</span>}
          </div>
        )}
      </div>

      {/* High-Density Unified Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <Input
              placeholder="Search name, father, ID..."
              className="pl-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-[110px] h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
              <SelectItem value="all" className="text-xs">All Genders</SelectItem>
              <SelectItem value="Male" className="text-xs">Boys Only</SelectItem>
              <SelectItem value="Female" className="text-xs">Girls Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={admittedFilter} onValueChange={setAdmittedFilter}>
            <SelectTrigger className="w-[125px] h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold">
              <SelectValue placeholder="Admission" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="Admitted" className="text-xs">Admitted Only</SelectItem>
              <SelectItem value="Prospective" className="text-xs">Prospective</SelectItem>
            </SelectContent>
          </Select>

          <Select value={feeFilter} onValueChange={setFeeFilter}>
            <SelectTrigger className="w-[125px] h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold">
              <SelectValue placeholder="Fee Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
              <SelectItem value="all" className="text-xs">All Fees</SelectItem>
              <SelectItem value="Full Paid" className="text-xs">Full Paid</SelectItem>
              <SelectItem value="Partial Paid" className="text-xs">Partial Paid</SelectItem>
              <SelectItem value="Not Paid" className="text-xs">Not Paid</SelectItem>
            </SelectContent>
          </Select>

          {/* Photo Filter Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
            <button
              type="button"
              onClick={() => setPhotoFilter("all")}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all",
                photoFilter === "all" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" : "text-slate-500"
              )}
            >
              All ({photoStats.total})
            </button>
            <button
              type="button"
              onClick={() => setPhotoFilter("with-photo")}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1",
                photoFilter === "with-photo" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-emerald-600"
              )}
            >
              <Camera size={11} />
              <span>Enrolled ({photoStats.withPhoto})</span>
            </button>
            <button
              type="button"
              onClick={() => setPhotoFilter("missing-photo")}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1",
                photoFilter === "missing-photo" ? "bg-amber-600 text-white shadow-xs" : "text-slate-500 hover:text-amber-600"
              )}
            >
              <AlertCircle size={11} />
              <span>Missing ({photoStats.missingPhoto})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {photoStats.missingPhoto > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenBulkWhatsAppModal()}
              className="h-8 px-2.5 rounded-xl border-amber-300 bg-amber-50 text-amber-800 font-bold text-xs flex items-center gap-1"
              title="Request Missing Photos via WhatsApp"
            >
              <Smartphone size={13} />
              <span className="hidden sm:inline">Request Photos ({photoStats.missingPhoto})</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => handleOpenBulkWhatsAppModal()}
            className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            title="Broadcast Admission Notices"
          >
            <MessageSquare size={14} />
            <span className="hidden sm:inline">Broadcast WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedAdmissions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-gradient-to-r from-[#085a4e] via-[#0b6e60] to-[#085a4e] rounded-2xl shadow-2xl text-white mb-6 border border-emerald-400/30 backdrop-blur-md"
        >
          <div className="flex items-center gap-3 pl-1">
            <Checkbox
              checked={
                selectedAdmissions.length === filteredAdmissions.length &&
                filteredAdmissions.length > 0
              }
              onCheckedChange={toggleSelectAll}
              className="border-white/80 data-[state=checked]:bg-white data-[state=checked]:text-[#085a4e] rounded-md h-4.5 w-4.5"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-black tracking-wide">
                  {selectedAdmissions.length} Selected
                </span>
                <span className="text-[11px] text-emerald-100/90 font-semibold hidden md:inline">
                  ({Math.round((selectedAdmissions.length / (filteredAdmissions.length || 1)) * 100)}% of {filteredAdmissions.length} matching)
                </span>
              </div>
              {selectedAdmissions.length < filteredAdmissions.length && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedAdmissions(filteredAdmissions.map((a) => a.id))
                  }
                  className="text-[11px] font-bold text-amber-300 hover:text-white underline underline-offset-2 transition-colors text-left mt-0.5"
                >
                  Select all {filteredAdmissions.length} matching candidates
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Quick Bulk PDF Report */}
            <Button
              onClick={() => handleExportPDF()}
              className="h-9 sm:h-10 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] uppercase tracking-wider px-3.5 shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 border-none"
              title="Download official PDF report for selected candidates"
            >
              <FileText size={15} className="text-slate-950 shrink-0" />
              <span>Download PDF ({selectedAdmissions.length})</span>
            </Button>

            {/* Excel Export */}
            <Button
              onClick={() => handleExportExcel()}
              variant="outline"
              className="h-9 sm:h-10 rounded-xl border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] uppercase tracking-wider px-3 hidden sm:flex items-center gap-1.5 transition-colors"
              title="Export selected candidates to Excel"
            >
              <FileSpreadsheet size={15} className="text-emerald-300 shrink-0" />
              <span>Excel</span>
            </Button>

            {/* WhatsApp Broadcast */}
            <Button
              onClick={() => handleOpenBulkWhatsAppModal(selectedAdmissions)}
              className="h-9 sm:h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[11px] uppercase tracking-wider px-3.5 shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 border-none"
              title="Send WhatsApp notice to selected candidates"
            >
              <MessageSquare size={14} className="shrink-0" />
              <span>WhatsApp ({selectedAdmissions.length})</span>
            </Button>

            {/* Bulk Delete */}
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              className="h-9 sm:h-10 rounded-xl bg-rose-500/90 hover:bg-rose-600 text-white font-black text-[11px] uppercase tracking-wider px-3 shadow-md flex items-center gap-1 transition-colors border-none"
              title="Delete selected candidates"
            >
              <Trash2 size={14} className="shrink-0" />
              <span className="hidden lg:inline">Delete</span>
            </Button>

            {/* Clear / Cancel */}
            <Button
              variant="ghost"
              onClick={() => setSelectedAdmissions([])}
              className="h-9 sm:h-10 rounded-xl hover:bg-white/15 text-white/90 hover:text-white font-bold text-[11px] uppercase tracking-wider px-3 transition-colors"
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {/* Admissions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[60px] pl-8">
                  <Checkbox
                    checked={
                      selectedAdmissions.length === filteredAdmissions.length &&
                      filteredAdmissions.length > 0
                    }
                    onCheckedChange={toggleSelectAll}
                    className="rounded-md border-slate-300"
                  />
                </TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">
                  Student ID
                </TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">
                  Applicant
                </TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">
                  Father Name
                </TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">
                  Contact
                </TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">
                  Program & Section
                </TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">
                  Subjects
                </TableHead>
                <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">
                  Total Fee
                </TableHead>
                <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">
                  Received
                </TableHead>
                <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">
                  Remaining
                </TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">
                  Status
                </TableHead>
                <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-5 pr-8">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleAdmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Search size={48} className="mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-xs">
                        No records found
                      </p>
                      <p className="text-xs mt-1">
                        Try adjusting your search or filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visibleAdmissions.map((admission: Admission) => {
                  const isNew = data.isNewRecord?.(
                    admission.id,
                    admission.date,
                  );
                  return (
                    <TableRow
                      key={admission.id}
                      onClick={() => {
                        data.markActioned?.(admission.id);
                        toggleSelectAdmission(admission.id);
                      }}
                      className={cn(
                        "group transition-all border-slate-100 cursor-pointer relative",
                        selectedAdmissions.includes(admission.id)
                          ? "bg-emerald-50/80 hover:bg-emerald-100/70 border-l-4 border-l-[#085a4e] shadow-2xs"
                          : "hover:bg-slate-50/70",
                        isNew && !admission.isAdmitted
                          ? "bg-red-50/20 border-l-[3px] border-l-red-500 hover:bg-red-50"
                          : "",
                      )}
                    >
                      <TableCell
                        className="pl-8 relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isNew && !admission.isAdmitted && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
                        )}
                        <Checkbox
                          checked={selectedAdmissions.includes(admission.id)}
                          onCheckedChange={() => {
                            data.markActioned?.(admission.id);
                            toggleSelectAdmission(admission.id);
                          }}
                          className="rounded-md border-slate-300 data-[state=checked]:bg-[#085a4e] data-[state=checked]:border-[#085a4e]"
                        />
                      </TableCell>
                      <TableCell>
                        {admission.studentId ? (
                          <div className="flex flex-col">
                            <span className="text-[11px] font-mono font-black text-superior-teal tracking-tighter leading-none mb-1">
                              {admission.studentId}
                            </span>
                            <span className="text-[9px] text-slate-300 font-medium">
                              #{admission.id.slice(-6)}
                            </span>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-black uppercase bg-slate-50 text-slate-300 border-slate-100 px-2 py-0"
                          >
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-4">
                          {(() => {
                            const linkedStudent = data.students?.find((s: any) => 
                              s.id === admission.id || 
                              (admission.studentId && (s.studentId === admission.studentId || s.collegeNo === admission.studentId || s.id === admission.studentId)) || 
                              (admission.collegeNo && (s.collegeNo === admission.collegeNo || s.studentId === admission.collegeNo)) || 
                              ((s.fullName || '').trim().toLowerCase() === (admission.fullName || '').trim().toLowerCase() && (s.fatherName || '').trim().toLowerCase() === (admission.fatherName || '').trim().toLowerCase())
                            );
                            const applicantPhoto = admission.photo || (admission as any).photoUrl || (admission as any).photo_url || linkedStudent?.photo || (linkedStudent as any)?.photo_url;
                            
                            return (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPhotoAdmission(admission);
                                  setIsPhotoEditorOpen(true);
                                }}
                                title="Click to Crop or Edit Student Photo"
                                className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-base font-black text-superior-teal overflow-hidden border-2 border-slate-200 shadow-sm shrink-0 ring-2 ring-superior-teal/20 relative group cursor-pointer hover:border-superior-teal hover:scale-105 transition-all"
                              >
                                {applicantPhoto ? (
                                  <img
                                    src={applicantPhoto}
                                    alt=""
                                    className="w-full h-full object-cover object-[center_top] rounded-full"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = "none";
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerText = admission.fullName ? admission.fullName.charAt(0).toUpperCase() : "A";
                                      }
                                    }}
                                  />
                                ) : (
                                  <span>{admission.fullName ? admission.fullName.charAt(0).toUpperCase() : "A"}</span>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px]">
                                  <Camera size={16} />
                                </div>
                              </div>
                            );
                          })()}
                          <div>
                            <p className="font-black text-slate-800 text-sm uppercase tracking-tight flex items-center gap-2">
                              <HighlightText
                                text={admission.fullName}
                                search={
                                  data.settings?.enableHighlighting !== false
                                    ? searchTerm
                                    : ""
                                }
                              />
                              {isNew && !admission.isAdmitted && (
                                <span className="text-[9px] font-black uppercase text-red-500 tracking-widest bg-red-100 px-2 py-0.5 rounded-md">
                                  New
                                </span>
                              )}
                              {((admission.reference || '').toLowerCase().includes('whatsapp') || (admission.source || '').toLowerCase().includes('whatsapp') || ((admission as any).remarks || '').toLowerCase().includes('whatsapp')) && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                  🤖 Via WhatsApp Bot {admission.reference ? `(${admission.reference.replace(/via whatsapp bot/i, '').replace(/[()]/g, '').trim() || 'Admin'})` : ''}
                                </span>
                              )}
                              {((admission.reference || '').toLowerCase().includes('website') || (admission.source || '').toLowerCase().includes('website')) && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                  🌐 Online Website
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                              {admission.date}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                               {admission.bloodGroup && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-red-50 text-red-600 font-bold flex items-center gap-0.5" title="Blood Group">
                                     <Droplet size={8} /> {admission.bloodGroup}
                                  </span>
                               )}
                               {admission.email && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-500 font-medium flex items-center gap-0.5 max-w-[100px] truncate" title={admission.email}>
                                     <Mail size={8} /> {admission.email}
                                  </span>
                               )}
                               {admission.address && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-500 font-medium flex items-center gap-0.5 max-w-[120px] truncate" title={admission.address}>
                                     <MapPin size={8} /> {admission.address}
                                  </span>
                               )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 font-bold text-sm">
                        <HighlightText
                          text={admission.fatherName}
                          search={
                            data.settings?.enableHighlighting !== false
                              ? searchTerm
                              : ""
                          }
                        />
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs font-bold">
                        <HighlightText
                          text={admission.contactNumber}
                          search={
                            data.settings?.enableHighlighting !== false
                              ? searchTerm
                              : ""
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-superior-teal max-w-[120px] truncate" title={admission.category}>{admission.category}</span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 max-w-[120px] truncate" title={admission.group}>{admission.group}</span>
                          {admission.section && admission.section !== '-' && (
                            <Badge variant="outline" className="mt-1 w-fit text-[8px] px-1 py-0 h-4 border-slate-200 text-slate-600 bg-slate-50">{admission.section}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[120px]">
                          {admission.subjects && admission.subjects.length > 0 ? (
                            admission.subjects.map((sub: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[8px] font-black uppercase bg-slate-50 text-slate-500 border-slate-200 px-1 py-0 cursor-help" title={sub}>
                                {sub === 'Diploma in IT Subjects' ? 'DIT' : sub === 'BS Subjects' ? 'BS' : sub === 'Computer Science' ? 'CS' : sub.substring(0, 3)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-300">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-800 text-sm">
                        Rs.{" "}
                        {(
                          admission.totalPackage ||
                          admission.totalFeeFinalized ||
                          0
                        ).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-black text-sm">
                        Rs. {(admission.feeReceived || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-rose-600 font-black text-sm">
                        Rs.{" "}
                        {(
                          (admission.totalPackage ||
                            admission.totalFeeFinalized ||
                            0) - (admission.feeReceived || 0)
                        ).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(
                          admission.status,
                          admission.isAdmitted,
                          admission.feeReceived,
                          admission.totalPackage || admission.totalFeeFinalized
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Direct 1-Click Admission Slip */}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAdmission(admission);
                              setDialogType("slip");
                            }}
                            size="sm"
                            title="Download Admission Slip"
                            className="h-8 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-800 border border-teal-200/80 font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 shadow-xs transition-all hover:scale-105 active:scale-95"
                          >
                            <Download size={13} className="text-teal-600 shrink-0" />
                            <span className="hidden xl:inline">Slip</span>
                          </Button>

                          {/* Direct 1-Click Fee Receipt (Bakaya) */}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAdmission(admission);
                              setDialogType("receipt");
                            }}
                            size="sm"
                            title="Download Admission Fee Receipt (Bakaya)"
                            className="h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200/80 font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 shadow-xs transition-all hover:scale-105 active:scale-95"
                          >
                            <Receipt size={13} className="text-emerald-600 shrink-0" />
                            <span className="hidden xl:inline">Receipt</span>
                          </Button>

                          {/* Direct 1-Click View Profile */}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAdmission(admission);
                              setDialogType("profile");
                            }}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-superior-teal hover:bg-slate-100 rounded-lg transition-all"
                            title="View Admission Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Dropdown Menu for Other Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger 
                              onClick={(e) => e.stopPropagation()}
                              className="h-8 w-8 rounded-lg hover:bg-slate-100 border border-slate-200/60 transition-all flex items-center justify-center text-slate-500 outline-hidden hover:text-slate-800"
                              title="More Actions"
                            >
                              <MoreHorizontal size={16} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="rounded-2xl p-2 min-w-[200px] border-slate-200 shadow-xl"
                            >
                              <DropdownMenuItem
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-superior-teal hover:bg-superior-teal/5"
                                onClick={() => {
                                  setEditingPhotoAdmission(admission);
                                  setIsPhotoEditorOpen(true);
                                }}
                              >
                                <Camera size={16} className="text-superior-teal" />{" "}
                                Crop & Edit Photo
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700"
                                onClick={() => {
                                  setActiveAdmission(admission);
                                  setDialogType("edit");
                                }}
                              >
                                <Edit size={16} className="text-superior-gold" />{" "}
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-superior-teal"
                                onClick={() => {
                                  setActiveAdmission(admission);
                                  setDialogType("slip");
                                }}
                              >
                                <Download size={16} /> Download Slip
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-emerald-600"
                                onClick={() => {
                                  setActiveAdmission(admission);
                                  setDialogType("receipt");
                                }}
                              >
                                <Receipt size={16} /> Fee Receipt (Bakaya)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-emerald-600 hover:bg-emerald-50"
                                onClick={() => sendWhatsAppConfirmationNotice(admission)}
                              >
                                <MessageSquare size={16} className="text-emerald-500" /> WhatsApp Notice
                              </DropdownMenuItem>
                              <Separator className="my-2 bg-slate-100" />
                              <DropdownMenuItem
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  setActiveAdmission(admission);
                                  setDialogType("delete");
                                }}
                              >
                                <Trash2 size={16} /> Delete Record
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {data.admissions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-100 pb-8">
          <p className="text-sm font-bold text-slate-500">
            Showing {visibleAdmissions.length} of {filteredAdmissions.length} Admissions {localProgram && localProgram !== 'all' ? `(${programTitle} Total: ${programAdmissions.length})` : data.admissions.length !== filteredAdmissions.length ? `(Total: ${data.admissions.length})` : ''} 
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
      <Dialog
        open={dialogType === "delete"}
        onOpenChange={(open) => !open && setDialogType(null)}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">
              Delete Admission Record
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete the admission record for{" "}
              <span className="font-bold text-slate-800">
                {activeAdmission?.fullName}
              </span>
              ? This action is permanent and cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertCircle size={24} />
              </div>
              <p className="text-xs text-red-700 font-medium">
                Deleting this record will remove all associated fee history and
                academic data from the system.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="ghost"
              onClick={() => setDialogType(null)}
              className="rounded-xl h-12 px-6 font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs"
              onClick={() => {
                if (activeAdmission) {
                  data.deleteAdmission(activeAdmission.id);
                  setDialogType(null);
                }
              }}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogType === "bulkDelete"}
        onOpenChange={(open) => !open && setDialogType(null)}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">
              Bulk Delete Admissions
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              You are about to delete{" "}
              <span className="font-bold text-slate-800">
                {selectedAdmissions.length}
              </span>{" "}
              selected admission records.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertCircle size={24} />
              </div>
              <p className="text-xs text-red-700 font-medium">
                This is a bulk action. All selected data will be permanently
                removed from the database.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="ghost"
              onClick={() => setDialogType(null)}
              className="rounded-xl h-12 px-6 font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs"
              onClick={async () => {
                const idsToDelete = [...selectedAdmissions];
                setDialogType(null);
                setSelectedAdmissions([]);
                await data.bulkDeleteAdmissions(idsToDelete);
              }}
            >
              Delete All Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogType === "profile"}
        onOpenChange={(open) => !open && setDialogType(null)}
      >
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] overflow-y-auto p-0 border-none bg-white rounded-3xl">
          {activeAdmission && (
            <AdmissionProfile
              admission={activeAdmission}
              data={data}
              onEdit={() => setDialogType("edit")}
              onDownloadReceipt={() => setDialogType("receipt")}
              onWhatsAppNotice={() => sendWhatsAppConfirmationNotice(activeAdmission)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogType === "edit"}
        onOpenChange={(open) => !open && setDialogType(null)}
      >
        <DialogContent className="max-w-[1680px] w-[98vw] h-[92vh] max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-3xl border-none shadow-2xl bg-white dark:bg-slate-900">
          <div className="bg-gradient-to-r from-superior-teal via-teal-900 to-slate-900 px-6 py-4 text-white relative overflow-hidden flex items-center justify-between shrink-0 shadow-sm border-b border-white/10">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-white shadow-inner">
                <Edit size={18} className="text-superior-gold" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-serif font-black tracking-tight text-white uppercase">
                  Update Admission Dossier
                </DialogTitle>
                <p className="text-teal-100/70 text-[11px] font-bold uppercase tracking-wider">
                  {activeAdmission?.fullName || "Candidate"} · {data?.settings?.collegeName || "Jahanian Campus"}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/50">
            {activeAdmission && dialogType === 'edit' && (
              <AdmissionForm
                admission={activeAdmission}
                data={data}
                onClose={() => setDialogType(null)}
                selectedSession={selectedSession}
                program={program}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 3-Stage Bulk Import Wizard */}
      <BulkImportWizard
        isOpen={isBulkImportWizardOpen}
        onClose={() => setIsBulkImportWizardOpen(false)}
        data={data}
        defaultProgram={program === 'bs' ? 'bs' : program === 'dit' ? 'dit' : program === 'ukl3' ? 'ukl3' : 'inter'}
      />

      <Dialog
        open={dialogType === "slip"}
        onOpenChange={(open) => !open && setDialogType(null)}
      >
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] overflow-y-auto p-0 border-none bg-white rounded-3xl">
          {activeAdmission && (
            <AdmissionSlip
              admission={activeAdmission}
              settings={data.settings}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogType === "receipt"}
        onOpenChange={(open) => !open && setDialogType(null)}
      >
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] overflow-y-auto p-0 border-none bg-white rounded-3xl">
          {activeAdmission && (
            <FeeReceipt student={activeAdmission} settings={data.settings} />
          )}
        </DialogContent>
      </Dialog>

      {/* Universal WhatsApp Reporting & Safe Bulk Dispatch Modal */}
      <WhatsAppReportModal
        open={isBulkWhatsAppModalOpen}
        onOpenChange={setIsBulkWhatsAppModalOpen}
        title={bulkModalProps.title}
        subtitle={bulkModalProps.subtitle}
        category="admissions"
        items={bulkModalProps.items}
        settings={data?.settings}
      />

      {/* Interactive Photo Studio & AI Editor Modal */}
      {editingPhotoAdmission && (
        <PhotoEditorModal
          isOpen={isPhotoEditorOpen}
          onClose={() => {
            setIsPhotoEditorOpen(false);
            setEditingPhotoAdmission(null);
          }}
          initialPhotoUrl={
            editingPhotoAdmission.photo ||
            (editingPhotoAdmission as any).photoUrl ||
            (editingPhotoAdmission as any).photo_url
          }
          studentName={editingPhotoAdmission.fullName}
          studentId={editingPhotoAdmission.studentId}
          admissionId={editingPhotoAdmission.id}
          onSaveSuccess={(newUrl) => {
            editingPhotoAdmission.photo = newUrl;
            (editingPhotoAdmission as any).photoUrl = newUrl;
            (editingPhotoAdmission as any).photo_url = newUrl;
            if (data.updateAdmission) {
              data.updateAdmission(editingPhotoAdmission.id, { photo_url: newUrl, photo: newUrl });
            }
          }}
        />
      )}
    </div>
  );
}

function AdmissionActionCell({
  admission,
  data,
}: {
  admission: Admission;
  data: any;
}) {
  return null; // No longer used, refactored into main view for stability
}

function EditAdmissionDialog({
  admission,
  data,
  onClose,
  onDelete,
}: {
  admission: Admission;
  data: any;
  onClose?: () => void;
  onDelete?: () => void;
}) {
  const [formData, setFormData] = useState({
    fullName: admission.fullName || "",
    fatherName: admission.fatherName || "",
    collegeNo: admission.collegeNo || "",
    bayFormNo: admission.bayFormNo || "",
    dob: admission.dob || "",
    previousClass: admission.previousClass || "10th",
    boardRollNo: admission.boardRollNo || "",
    previousMarks: String(admission.previousMarks || 0),
    previousInstitute: admission.previousInstitute || "",
    subjects: admission.subjects || [],
    address: admission.address || "",
    admissionFee: String(admission.admissionFee || 0),
    miscFunds: String(admission.miscFunds || 0),
    totalFeeFinalized: String(admission.totalFeeFinalized || 0),
    totalPackage: admission.totalPackage || 0,
    feeReceived: String(admission.feeReceived || 0),
    paymentPlan: admission.paymentPlan || "Installments",
    paidMonths: admission.paidMonths || [],
    paidInstallments: admission.paidInstallments || 0,
    totalInstallments: admission.totalInstallments || 12,
    nextInstallmentDate: admission.nextInstallmentDate || "",
    totalSemesters: admission.totalSemesters || 0,
    feePerSemester: admission.feePerSemester || 0,
    nextSemesterDueDate: admission.nextSemesterDueDate || "",
    contactNumber: admission.contactNumber || "",
    fatherContact: admission.fatherContact || "",
    secondaryContact: admission.secondaryContact || "",
    email: admission.email || "",
    bloodGroup: admission.bloodGroup || "",
    reference: admission.reference || "",
    gender: admission.gender || "Male",
    category: admission.category || "Inter Part-1 Boys",
    group: admission.group || "",
    section: admission.section || "",
    photo: admission.photo || "",
    studentId: admission.studentId || "",
    status: admission.status || "Prospective",
    session: admission.session || "",
    sessionStartDate: admission.sessionStartDate || "",
    sessionEndDate: admission.sessionEndDate || "",
    academicPart: admission.academicPart || "Part-1",
    programType:
      admission.programType ||
      (String(admission.group).toLowerCase().includes("dit") ||
      String(admission.group).toLowerCase().includes("uk") ||
      String(admission.group).toLowerCase().includes("level 3")
        ? "Semester"
        : "Yearly"),
    currentSemester:
      admission.currentSemester ||
      (String(admission.group).toLowerCase().includes("dit") ||
      String(admission.group).toLowerCase().includes("uk") ||
      String(admission.group).toLowerCase().includes("level 3")
        ? 1
        : 0),
  });

  // Sync form data when admission changes to prevent data leakage between records
  React.useEffect(() => {
    setFormData({
      fullName: admission.fullName || "",
      fatherName: admission.fatherName || "",
      collegeNo: admission.collegeNo || "",
      bayFormNo: admission.bayFormNo || "",
      dob: admission.dob || "",
      previousClass: admission.previousClass || "10th",
      boardRollNo: admission.boardRollNo || "",
      previousMarks: String(admission.previousMarks || 0),
      previousInstitute: admission.previousInstitute || "",
      subjects: admission.subjects || [],
      address: admission.address || "",
      admissionFee: String(admission.admissionFee || 0),
      miscFunds: String(admission.miscFunds || 0),
      totalFeeFinalized: String(admission.totalFeeFinalized || 0),
      totalPackage: admission.totalPackage || 0,
      feeReceived: String(admission.feeReceived || 0),
      paymentPlan: admission.paymentPlan || "Installments",
      paidMonths: admission.paidMonths || [],
      paidInstallments: admission.paidInstallments || 0,
      totalInstallments: admission.totalInstallments || 12,
      nextInstallmentDate: admission.nextInstallmentDate || "",
      totalSemesters: admission.totalSemesters || 0,
      feePerSemester: admission.feePerSemester || 0,
      nextSemesterDueDate: admission.nextSemesterDueDate || "",
      contactNumber: admission.contactNumber || "",
      fatherContact: admission.fatherContact || "",
      secondaryContact: admission.secondaryContact || "",
      email: admission.email || "",
      bloodGroup: admission.bloodGroup || "",
      reference: admission.reference || "",
      gender: admission.gender || "Male",
      category: admission.category || "Inter Part-1 Boys",
      group: admission.group || "",
      section: admission.section || "",
      photo: admission.photo || "",
      studentId: admission.studentId || "",
      status: admission.status || "Prospective",
      session: admission.session || "",
      sessionStartDate: admission.sessionStartDate || "",
      sessionEndDate: admission.sessionEndDate || "",
      academicPart: admission.academicPart || "Part-1",
      programType:
        admission.programType ||
        (String(admission.group).toLowerCase().includes("dit") ||
        String(admission.group).toLowerCase().includes("uk") ||
        String(admission.group).toLowerCase().includes("level 3")
          ? "Semester"
          : "Yearly"),
      currentSemester:
        admission.currentSemester ||
        (String(admission.group).toLowerCase().includes("dit") ||
        String(admission.group).toLowerCase().includes("uk") ||
        String(admission.group).toLowerCase().includes("level 3")
          ? 1
          : 0),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admission.id]);

  // Auto-calculate Total Package
  React.useEffect(() => {
    const total =
      Number(formData.admissionFee || 0) +
      Number(formData.miscFunds || 0) +
      Number(formData.totalFeeFinalized || 0);
    setFormData((prev) => ({ ...prev, totalPackage: total }));
  }, [formData.admissionFee, formData.miscFunds, formData.totalFeeFinalized]);

  // Auto-confirm admission and allot ID when received amount is entered in Edit Dialog
  React.useEffect(() => {
    if (Number(formData.feeReceived) > 0 && !formData.studentId) {
      const studentId = data.generateStudentId(formData.group);
      setFormData((prev) => ({
        ...prev,
        studentId: studentId,
        status: "Admitted/Confirmed",
      }));
      toast.success(`Official Student ID Allotted: ${studentId}`);
    }
  }, [formData.feeReceived, formData.studentId, formData.group, data]);

  const handleGroupChange = (groupName: string) => {
    const group = ACADEMIC_GROUPS.find((g) => g.name === groupName);
    if (group) {
      const newSubjects = Array.from(
        new Set([...COMPULSORY_SUBJECTS, ...group.subjects]),
      );

      // Auto-logic for Semester Programs
      let paymentPlan = formData.paymentPlan;
      let totalSemesters = formData.totalSemesters;
      let programType = "Yearly" as "Yearly" | "Semester";
      let currentSemester = formData.currentSemester;

      const lowerGroupName = groupName.toLowerCase();
      if (
        lowerGroupName.includes("dit") ||
        lowerGroupName.includes("uk") ||
        lowerGroupName.includes("level 3")
      ) {
        paymentPlan = "Semester";
        totalSemesters = lowerGroupName.includes("dit") ? 4 : 3;
        programType = "Semester";
        currentSemester = currentSemester || 1;
        toast.info(
          `${groupName} follows a Semester System. Plan adjusted automatically.`,
        );
      }

      setFormData((prev) => ({
        ...prev,
        group: groupName,
        subjects: newSubjects,
        paymentPlan,
        totalSemesters,
        programType,
        currentSemester,
      }));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const toastId = toast.loading("Processing photo...");
      try {
        const compressedBase64 = await compressImage(file);
        setFormData((prev) => ({
          ...prev,
          photo: compressedBase64,
        }));
        toast.dismiss(toastId);
        toast.success(`Photo updated successfully`);
      } catch (err) {
        console.error("Photo processing error:", err);
        toast.dismiss(toastId);
        toast.error("Failed to process photo.");
      }
    }
  };

  const toggleSubject = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: (prev.subjects || []).includes(subject)
        ? (prev.subjects || []).filter((s) => s !== subject)
        : [...(prev.subjects || []), subject],
    }));
  };

  const handleSave = () => {
    const finalized = Number(formData.totalFeeFinalized);
    const totalPkg = formData.totalPackage;
    const received = Number(formData.feeReceived);
    const oldReceived = Number(admission.feeReceived || 0);

    let status: AdmissionStatus = formData.status as AdmissionStatus;
    if (received >= totalPkg && totalPkg > 0) status = "Full Paid";
    else if (received > 0) status = "Partial Paid";
    else if (formData.status === "Not Paid" || !formData.status)
      status = "Not Paid";

    if (received > oldReceived) {
      const difference = received - oldReceived;
      data.recordFeePayment(admission.id, {
        id: `pay-${Date.now()}`,
        month: new Date().toLocaleString('en-US', { month: 'long' }),
        year: new Date().getFullYear(),
        amountDue: totalPkg - oldReceived,
        amountPaid: difference,
        status: 'Paid',
        datePaid: new Date().toISOString(),
        receiptId: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
        feeType: 'Admission / Initial Fee',
        paymentMethod: 'Cash',
        collectedBy: 'System'
      }, formData.fullName || 'Student');
    }

    data.updateAdmission(admission.id, {
      ...formData,
      previousMarks: Number(formData.previousMarks),
      admissionFee: Number(formData.admissionFee),
      miscFunds: Number(formData.miscFunds),
      totalFeeFinalized: finalized,
      totalPackage: totalPkg,
      feeReceived: received,
      isAdmitted: formData.status === "Admitted/Confirmed" || received > 0,
      status,
    });
    if (onClose) onClose();
  };

  return (
    <DialogContent className="max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 bg-white rounded-3xl shadow-2xl">
      <DialogHeader className="border-b border-slate-100 pb-4">
        <DialogTitle className="text-3xl font-black text-superior-teal uppercase tracking-tight flex items-center gap-3">
          <Edit className="text-superior-gold" /> Edit Admission Instance
        </DialogTitle>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
          Refining Student Enrollment & Financial Data
        </p>
      </DialogHeader>

      <div className="max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-10 py-6">
          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-superior-teal shadow-inner">
                {formData.photo ? (
                  <img
                    src={formData.photo}
                    alt=""
                    className="w-full h-full object-cover object-[center_top] rounded-full"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-superior-gold/10 text-superior-gold font-bold text-3xl rounded-full">${formData.fullName ? formData.fullName.charAt(0) : 'A'}</div>`;
                      }
                    }}
                  />
                ) : (
                  <>
                    <Camera className="text-slate-300 mb-1" size={24} />
                    <span className="text-[9px] text-slate-400 font-black uppercase text-center px-4">
                      Upload Photo
                    </span>
                  </>
                )}
              </div>
              <label className="absolute inset-0 cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
              </label>
              {formData.studentId && (
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-lg">
                  <CheckCircle2 size={16} />
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                {formData.fullName || "Student Name"}
              </h4>
              <div className="flex items-center gap-2 mt-1 justify-center">
                {formData.studentId ? (
                  <Badge className="bg-superior-teal text-white font-mono text-xs px-3">
                    {formData.studentId}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-black uppercase text-slate-400"
                  >
                    ID Pending Admission
                  </Badge>
                )}
                {((formData.reference || '').toLowerCase().includes('whatsapp')) && (
                  <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 flex items-center gap-1">
                    🤖 Via WhatsApp Bot {formData.reference?.replace(/via whatsapp bot/i, '').replace(/[()]/g, '').trim() ? `(${formData.reference.replace(/via whatsapp bot/i, '').replace(/[()]/g, '').trim()})` : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Personal Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-superior-teal/10 flex items-center justify-center text-superior-teal">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  Personal Profile
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Legal Identity & Personal Info
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Admission Category
                </Label>
                <Select
                  value={formData.category || ""}
                  onValueChange={(v: any) => {
                    const gender = v.includes("Girls") ? "Female" : "Male";
                    setFormData(prev => ({ ...prev, category: v, gender }));
                  }}
                >
                  <SelectTrigger className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      let cats = ["Inter Part-1 Boys", "Inter Part-2 Boys", "Inter Part-1 Girls", "Inter Part-2 Girls"];
                      const program = formData.programType?.toLowerCase() || 'yearly';
                      if (program === 'dit') cats = ['DIT Boys', 'DIT Girls'];
                      else if (program === 'ukl3') cats = ['UK L3 Boys', 'UK L3 Girls'];
                      else if (program === 'bs') cats = ["BS Boys", "BS Girls"];
                      
                      if (formData.gender === "Male") cats = cats.filter(c => c.toLowerCase().includes("boys"));
                      else if (formData.gender === "Female") cats = cats.filter(c => c.toLowerCase().includes("girls"));
                      return cats.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Gender (Auto-set)
                </Label>
                <Select disabled value={formData.gender || ""}>
                  <SelectTrigger className="h-12 bg-slate-50/50 border-slate-100 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Full Name
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, fullName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Father's Name
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold"
                  value={formData.fatherName}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, fatherName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  B-Form / CNIC
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-mono"
                  value={formData.bayFormNo}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, bayFormNo: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Date of Birth
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl"
                  type="date"
                  value={formData.dob}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, dob: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Blood Group
                </Label>
                <Select
                  value={formData.bloodGroup || ""}
                  onValueChange={(v) =>
                    setFormData(prev => ({ ...prev, bloodGroup: v }))
                  }
                >
                  <SelectTrigger className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                      (bg) => (
                        <SelectItem key={bg} value={bg}>
                          {bg}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Permanent Address
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, address: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-superior-gold/10 flex items-center justify-center text-superior-gold">
                <Receipt size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  Communication
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Connect with Student & Parents
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Student Mobile
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold"
                  value={formData.contactNumber}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, contactNumber: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Father's Mobile
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold"
                  value={formData.fatherContact}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, fatherContact: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Email Address (Optional)
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Section 3: Academic History */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                <GraduationCap size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  Academic Profile
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Enrollment & Past Performance
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Enrollment Group
                </Label>
                <Select
                  value={formData.group || ""}
                  onValueChange={handleGroupChange}
                >
                  <SelectTrigger className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold">
                    <SelectValue placeholder="Select Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_GROUPS.map((group) => (
                      <SelectItem key={group.name} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Assigned Section
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-black text-lg"
                  value={formData.section || ""}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, section: e.target.value.toUpperCase(), }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  College Roll #
                </Label>
                <div className="flex gap-2">
                  <Input
                    className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold"
                    value={formData.collegeNo || ""}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, collegeNo: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const allRolls: number[] = [];
                      (data.students || []).forEach((s: any) => {
                        const num = parseInt(String(s.collegeNo || "").replace(/\D/g, ""), 10);
                        if (!isNaN(num) && num > 0) allRolls.push(num);
                      });
                      (data.admissions || []).forEach((a: any) => {
                        const num = parseInt(String(a.collegeNo || "").replace(/\D/g, ""), 10);
                        if (!isNaN(num) && num > 0) allRolls.push(num);
                      });
                      const next = allRolls.length > 0 ? Math.max(...allRolls) + 1 : 1001;
                      setFormData(prev => ({ ...prev, collegeNo: String(next) }));
                      toast.success(`Suggested Roll #: ${next}`);
                    }}
                    className="h-12 px-3 rounded-xl border-superior-teal/30 text-superior-teal hover:bg-superior-teal/10 shrink-0 font-bold text-xs gap-1.5"
                  >
                    <Sparkles size={14} className="text-superior-gold" /> Auto
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Previous Class
                </Label>
                <Select
                  value={formData.previousClass || ""}
                  onValueChange={(v) =>
                    setFormData(prev => ({ ...prev, previousClass: v as any }))
                  }
                >
                  <SelectTrigger className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9th">9th Class</SelectItem>
                    <SelectItem value="10th">10th Class</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Matric / Board Roll #
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl"
                  value={formData.boardRollNo || ""}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, boardRollNo: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Obtained Marks
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold"
                  type="number"
                  value={formData.previousMarks || ""}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, previousMarks: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Previous Institute
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl"
                  value={formData.previousInstitute || ""}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, previousInstitute: e.target.value, }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Section 4: Subjects */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Eye size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  Course Selection
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Registered Subjects
                </p>
              </div>
            </div>
            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-superior-teal uppercase tracking-widest">
                  Compulsory Subjects
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {COMPULSORY_SUBJECTS.map((subject) => (
                    <div
                      key={subject}
                      className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-slate-100/50 hover:border-superior-teal transition-all"
                    >
                      <Checkbox
                        id={`edit-comp-subject-${subject}`}
                        checked={(formData.subjects || []).includes(subject)}
                        onCheckedChange={() => toggleSubject(subject)}
                      />
                      <Label
                        htmlFor={`edit-comp-subject-${subject}`}
                        className="text-[11px] font-black leading-none cursor-pointer text-slate-600"
                      >
                        {subject}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-superior-teal uppercase tracking-widest">
                  Elective / Group Subjects
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {SUBJECTS.filter((s) => !COMPULSORY_SUBJECTS.includes(s)).map(
                    (subject) => (
                      <div
                        key={subject}
                        className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-slate-100/50 hover:border-superior-teal transition-all"
                      >
                        <Checkbox
                          id={`edit-subject-${subject}`}
                          checked={(formData.subjects || []).includes(subject)}
                          onCheckedChange={() => toggleSubject(subject)}
                        />
                        <Label
                          htmlFor={`edit-subject-${subject}`}
                          className="text-[11px] font-bold leading-none cursor-pointer text-slate-700"
                        >
                          {subject}
                        </Label>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Financials */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  Financial Commitment
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Pricing & Installment Plans
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Admission Fee
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold"
                  type="number"
                  value={formData.admissionFee || ""}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, admissionFee: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Misc / Lab Funds
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold"
                  type="number"
                  value={formData.miscFunds || ""}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, miscFunds: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Finalized Tuition Fee
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-black text-superior-teal"
                  type="number"
                  value={formData.totalFeeFinalized || ""}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, totalFeeFinalized: e.target.value, }))
                  }
                />
              </div>
              <div className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Package (Auto)
                </Label>
                <div className="text-xl font-black text-slate-800">
                  Rs. {formData.totalPackage.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-6 bg-superior-teal/5 rounded-3xl border border-superior-teal/10 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-superior-teal uppercase">
                    Fee Received So Far
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      Rs.
                    </span>
                    <Input
                      className="h-14 pl-12 border-superior-teal/30 bg-white rounded-2xl text-2xl font-black text-emerald-600 focus:ring-4 focus:ring-superior-teal/5 transition-all"
                      type="number"
                      value={formData.feeReceived || ""}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, feeReceived: e.target.value, }))
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-500 text-white font-black px-3 py-1">
                    Balance: Rs.{" "}
                    {(
                      formData.totalPackage - Number(formData.feeReceived)
                    ).toLocaleString()}
                  </Badge>
                  {Number(formData.feeReceived) > 0 && (
                    <span className="text-[10px] font-black text-emerald-600 uppercase">
                      Official Payment Logged
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Billing Strategy
                </Label>
                <Select
                  value={formData.paymentPlan || ""}
                  onValueChange={(v: any) =>
                    setFormData(prev => ({ ...prev, paymentPlan: v }))
                  }
                >
                  <SelectTrigger className="h-14 bg-white border-slate-200 rounded-2xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semester">Semester Plan</SelectItem>
                    <SelectItem value="Installments">
                      Installment Plan
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 6: Others */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Search size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  Administrative Info
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Sourcing & Operational Status
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Referral / Source
                </Label>
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl"
                  value={formData.reference || ""}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, reference: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase">
                  Record Status
                </Label>
                <Select
                  value={formData.status || ""}
                  onValueChange={(v: any) =>
                    setFormData(prev => ({ ...prev, status: v }))
                  }
                >
                  <SelectTrigger className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Prospective">
                      Prospective (Applicant)
                    </SelectItem>
                    <SelectItem value="Admitted/Confirmed">
                      Admitted (Full Enrollment)
                    </SelectItem>
                    <SelectItem value="Not Paid">
                      Financial: Not Paid
                    </SelectItem>
                    <SelectItem value="Partial Paid">
                      Financial: Partial Paid
                    </SelectItem>
                    <SelectItem value="Full Paid">
                      Financial: Full Paid
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white pt-6 pb-2 border-t border-slate-100 flex justify-between items-center z-10">
          <Button
            variant="destructive"
            type="button"
            className="h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] px-6"
            onClick={() => {
              if (onDelete) onDelete();
            }}
          >
            <Trash2 size={16} className="mr-2" /> Delete Record
          </Button>
          <div className="flex gap-4">
            <Button
              variant="ghost"
              type="button"
              onClick={onClose}
              className="h-12 rounded-xl font-bold px-8"
            >
              Cancel
            </Button>
            <Button
              className="h-12 rounded-xl bg-superior-teal text-white hover:bg-superior-teal/90 px-10 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-superior-teal/20"
              onClick={handleSave}
            >
              Save All Changes
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
        <Icon size={20} />
      </div>
      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
        {title}
      </h3>
    </div>
  );
}

function ProfileItem({
  label,
  value,
  isFull = false,
}: {
  label: string;
  value?: React.ReactNode;
  isFull?: boolean;
}) {
  if (!value || value === '---' || value === 'N/A' || (typeof value === 'string' && value.trim() === '')) return null;
  return (
    <div className={isFull ? "col-span-full" : ""}>
      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
        {label}
      </p>
      <div className="text-[15px] font-bold text-slate-800 leading-tight">
        {value}
      </div>
    </div>
  );
}

function FinanceCard({
  label,
  value,
  sub,
  color = "slate",
}: {
  label: string;
  value: number | string;
  sub: string;
  color?: "slate" | "emerald" | "amber";
}) {
  const colors = {
    slate: "bg-slate-50 text-slate-900 border-slate-100",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-100",
    amber: "bg-amber-50 text-amber-900 border-amber-100",
  };

  return (
    <div className={cn("p-8 rounded-[2.5rem] border shadow-sm", colors[color])}>
      <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">
        {label}
      </p>
      <h4 className="text-3xl font-black tracking-tight">
        Rs. {Number(value || 0).toLocaleString()}
      </h4>
      <p className="text-[10px] font-bold uppercase tracking-widest mt-3 opacity-40">
        {sub}
      </p>
    </div>
  );
}

function AdmissionProfile({
  admission,
  data,
  onEdit,
  onDownloadReceipt,
  onWhatsAppNotice,
}: {
  admission: Admission;
  data: any;
  onEdit?: () => void;
  onDownloadReceipt?: () => void;
  onWhatsAppNotice?: () => void;
}) {
  return (
    <div className="w-full bg-slate-50/30 rounded-[3rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50">
      <div className="bg-slate-900 p-10 md:p-14 text-white relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-superior-gold/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-superior-teal/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

        <div className="flex flex-col md:flex-row gap-10 md:gap-14 items-center relative z-10">
          <div className="shrink-0 flex flex-col items-center">
            <div className="w-40 h-40 md:w-52 md:h-52 rounded-full border-8 border-white/10 bg-white/10 backdrop-blur-xl overflow-hidden shadow-2xl transition-transform hover:scale-105 duration-500 ring-4 ring-superior-gold/30">
              {admission.photo ? (
                <img
                  src={admission.photo}
                  alt=""
                  className="w-full h-full object-cover object-[center_top] rounded-full"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-superior-gold/10 text-superior-gold font-bold text-5xl rounded-full">${admission.fullName ? admission.fullName.charAt(0) : 'A'}</div>`;
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/10">
                  <User size={100} />
                </div>
              )}
            </div>
            {admission.studentId && (
              <div className="mt-6 bg-superior-gold text-superior-teal font-black text-base px-6 py-2.5 rounded-2xl shadow-xl shadow-superior-gold/20 border-2 border-white/20 transform -rotate-1">
                {admission.studentId}
              </div>
            )}
          </div>

          <div className="text-center md:text-left flex-1 space-y-6">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <div className="inline-flex items-center gap-2 bg-white/10 text-superior-gold border border-white/10 px-4 py-1.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-inner">
                <Shield size={14} /> Verified Student
              </div>
              {admission.concessionReason && (
                <Badge className="bg-amber-400 text-slate-900 border-none px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
                  ★ {admission.concessionReason}
                </Badge>
              )}
            </div>
            <h2 className="text-4xl md:text-7xl font-black tracking-tight uppercase leading-[0.9]">
              {admission.fullName}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="flex items-center gap-3 text-white/50 font-bold text-lg">
                <Badge
                  variant="outline"
                  className="border-white/20 text-white/80 py-1.5 px-4 rounded-xl"
                >
                  {admission.category}
                </Badge>
                <span className="w-1.5 h-1.5 rounded-full bg-superior-gold shadow-[0_0_10px_rgba(201,168,76,0.6)]" />
                <span className="text-white/70">{admission.group}</span>
              </div>
              <Badge
                className={cn(
                  "font-black tracking-[0.15em] uppercase text-[10px] px-5 py-2 rounded-xl shadow-lg",
                  admission.status === "Admitted/Confirmed"
                    ? "bg-emerald-500 text-white"
                    : "bg-superior-gold text-superior-teal",
                )}
              >
                {admission.status}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              {onEdit && (
                <Button
                  onClick={onEdit}
                  variant="outline"
                  className="rounded-xl border-white/20 text-slate-800 bg-white hover:bg-slate-100 font-black text-xs gap-2"
                >
                  <Edit size={14} /> Edit Record
                </Button>
              )}
              {onDownloadReceipt && (
                <Button
                  onClick={onDownloadReceipt}
                  variant="outline"
                  className="rounded-xl border-white/20 text-slate-800 bg-white hover:bg-slate-100 font-black text-xs gap-2"
                >
                  <Receipt size={14} /> Fee Receipt
                </Button>
              )}
              {onWhatsAppNotice && (
                <Button
                  onClick={onWhatsAppNotice}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs gap-2 shadow-lg shadow-emerald-900/30"
                >
                  <MessageSquare size={14} /> Send WhatsApp Notice
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-10 md:p-14 space-y-16 bg-white/80 backdrop-blur-sm">
        {/* Profile Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Column 1: Identity */}
          <div className="space-y-10 group">
            <SectionHeading icon={User} title="Student Identity" />
            <div className="space-y-8 pl-4 border-l-2 border-slate-50 group-hover:border-superior-teal/30 transition-colors">
              <ProfileItem label="Father's Name" value={admission.fatherName} />
              <ProfileItem
                label="Date of Birth"
                value={admission.dob || "N/A"}
              />
              <ProfileItem
                label="B-Form / CNIC"
                value={admission.bayFormNo || "N/A"}
              />
              <ProfileItem
                label="Blood Group"
                value={admission.bloodGroup || "N/A"}
              />
              <ProfileItem label="Gender" value={admission.gender} />
            </div>
          </div>

          {/* Column 2: Academic */}
          <div className="space-y-10 group">
            <SectionHeading icon={GraduationCap} title="Academic Stats" />
            <div className="space-y-8 pl-4 border-l-2 border-slate-50 group-hover:border-superior-gold/30 transition-colors">
              <ProfileItem
                label="College No."
                value={admission.collegeNo || "N/A"}
              />
              <ProfileItem
                label="Section"
                value={admission.section || "Not Assigned"}
              />
              <ProfileItem
                label="Board Roll #"
                value={admission.boardRollNo || "N/A"}
              />
              <ProfileItem
                label="Previous Class"
                value={admission.previousClass || "N/A"}
              />
              <ProfileItem
                label="SSC Marks"
                value={admission.previousMarks ? String(admission.previousMarks) : "N/A"}
              />
              <ProfileItem
                label="Previous Institute"
                value={admission.previousInstitute || "N/A"}
              />
            </div>
          </div>

          {/* Column 3: Contact & Subjects */}
          <div className="space-y-10 group">
            <SectionHeading icon={CreditCard} title="Communication" />
            <div className="space-y-8 pl-4 border-l-2 border-slate-50 group-hover:border-blue-300 transition-colors">
              <ProfileItem
                label="Personal Mobile"
                value={admission.contactNumber}
              />
              <ProfileItem
                label="Father's Mobile"
                value={admission.fatherContact || "N/A"}
              />
              <ProfileItem
                label="Secondary Contact"
                value={admission.secondaryContact || "N/A"}
              />
              <ProfileItem
                label="Email Address"
                value={admission.email || "N/A"}
              />
              <ProfileItem
                label="Reference"
                value={
                  (admission.reference || '').toLowerCase().includes('whatsapp') ? (
                    <span className="text-emerald-700 font-black flex items-center gap-1">
                      🤖 {admission.reference}
                    </span>
                  ) : (
                    admission.reference || "N/A"
                  )
                }
              />
              <ProfileItem
                label="Residential Address"
                value={admission.address}
                isFull
              />
            </div>
            <div className="pt-6">
              <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-superior-teal" />{" "}
                Enrolled Subjects
              </div>
              <div className="flex flex-wrap gap-2.5">
                {(admission.subjects || []).map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="bg-slate-50/50 text-slate-700 border-slate-200 font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl hover:bg-white hover:border-superior-teal transition-all"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Section - Redesigned as a Bento Box */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Wallet size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                Financial Ledger
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Real-time payment tracking
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FinanceCard
              label="Overall Package"
              value={admission.totalPackage}
              sub="Official Finalized Fee"
            />
            <FinanceCard
              label="Total Received"
              value={admission.feeReceived}
              sub="Logged to date"
              color="emerald"
            />
            <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-slate-900 text-white flex justify-between items-center relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <p className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-1">
                  Outstanding Balance
                </p>
                <h4 className="text-4xl font-black text-rose-400">
                  Rs.{" "}
                  {(
                    admission.totalPackage - admission.feeReceived
                  ).toLocaleString()}
                </h4>
              </div>
              <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-rose-400 border border-white/10 relative z-10">
                <AlertTriangle size={32} />
              </div>
            </div>
            <FinanceCard
              label="Admission Fee"
              value={admission.admissionFee}
              sub="Registration Cost"
            />
            <FinanceCard
              label="Misc / Lab Funds"
              value={admission.miscFunds}
              sub="Operational Charges"
            />
            <div className="lg:col-span-2 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                <CreditCard size={28} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                  Billing Strategy
                </p>
                <h4 className="text-lg font-black text-slate-700 uppercase">
                  {admission.paymentPlan || "Standard"} Plan
                </h4>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-8 pt-10 border-t border-slate-100/50">
          <Button
            variant="outline"
            className="h-16 px-10 border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[11px] rounded-[1.5rem] hover:bg-slate-50 hover:border-superior-teal transition-all shadow-sm"
            onClick={onDownloadReceipt}
          >
            <Receipt size={20} className="mr-3 text-slate-400" /> Print Fee
            Receipt
          </Button>

          <div className="flex items-center gap-4">
            {!admission.isAdmitted && (
              <Button
                className="h-16 px-12 bg-emerald-600 text-white hover:bg-emerald-700 font-black uppercase tracking-widest text-[11px] rounded-[1.5rem] shadow-2xl shadow-emerald-500/30 transition-all active:scale-95"
                onClick={() => {
                  data.confirmAdmission(admission.id, data.currentUser?.email);
                }}
              >
                <CheckCircle2 size={20} className="mr-3" /> Enroll Student
              </Button>
            )}
            <Button
              className="h-16 px-12 bg-superior-teal text-white hover:bg-superior-teal/90 font-black uppercase tracking-widest text-[11px] rounded-[1.5rem] shadow-2xl shadow-superior-teal/30 transition-all active:scale-95"
              onClick={onEdit}
            >
              <Edit size={20} className="mr-3 text-white/50" /> Update Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
        {label}
      </p>
      <p className="text-base font-bold text-slate-800 border-b border-slate-100 pb-1">
        {value}
      </p>
    </div>
  );
}

function PreviewItem({
  label,
  value,
  isFull,
}: {
  label: string;
  value: string;
  isFull?: boolean;
}) {
  return (
    <div className={`space-y-1 ${isFull ? "col-span-2" : ""}`}>
      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-1">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subValue,
  active,
  onClick,
  iconColor,
  bgColor,
  hoverColor,
  isDark = false,
  icon: Icon = User,
}: any) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-[1rem] border cursor-pointer transition-all duration-300 flex items-center justify-between gap-2 overflow-hidden",
        active
          ? "bg-superior-teal border-superior-teal text-white shadow-md shadow-superior-teal/20"
          : isDark
            ? cn("bg-white/5 border-white/10 text-white shadow-xl", hoverColor)
            : cn("bg-white border-slate-100", hoverColor),
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0",
            active ? "bg-white/20" : bgColor,
          )}
        >
          <Icon size={14} className={active ? "text-white" : iconColor} />
        </div>
        <p
          className={cn(
            "text-[9px] font-bold uppercase tracking-wider leading-tight truncate",
            active ? "text-white" : isDark ? "text-white/80" : "text-slate-500",
          )}
          title={label}
        >
          {label}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-baseline gap-1 text-right">
          <h3 className="text-base font-bold leading-none">{value}</h3>
          {subValue && (
            <span
              className={cn(
                "text-[10px] font-semibold",
                active || isDark ? "text-white/60" : "text-slate-400",
              )}
            >
              {subValue}
            </span>
          )}
        </div>
        {active && (
          <div className="w-1.5 h-1.5 rounded-full bg-superior-gold animate-pulse shrink-0 ml-0.5" />
        )}
      </div>
    </motion.div>
  );
}

function FormSectionHeader({ icon: Icon, title, sub }: any) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-superior-teal/10 flex items-center justify-center text-superior-teal">
        <Icon size={20} />
      </div>
      <div>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-[0.1em]">
          {title}
        </h4>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {sub}
        </p>
      </div>
    </div>
  );
}

function FormFieldWrapper({ label, children, required, className }: any) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

function AdmissionForm({
  data,
  onClose,
  selectedSession,
  program,
  admission,
}: {
  data: any;
  onClose: () => void;
  selectedSession?: string;
  program?: string;
  admission?: Admission;
}) {
  const [activeTab, setActiveTab] = useState("student");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Stream-First Engine: Identify or prompt educational level first
  const initialStream = React.useMemo(() => {
    if (admission) {
      const grp = (admission.group || "").toLowerCase();
      const cat = (admission.category || "").toLowerCase();
      if (grp.includes("bs") || grp.includes("b.s") || grp.includes("bba") || cat.includes("bs")) return "bs";
      if (grp.includes("dit") || cat.includes("dit")) return "dit";
      if (grp.includes("uk") || cat.includes("uk")) return "ukl3";
      return "fsc";
    }
    if (program && program !== "all") {
      if (program === "bs") return "bs";
      if (program === "dit") return "dit";
      if (program === "ukl3") return "ukl3";
      if (program === "fsc" || program === "inter") return "fsc";
    }
    return null;
  }, [admission, program]);

  const [selectedStream, setSelectedStream] = useState<"fsc" | "bs" | "dit" | "ukl3" | null>(initialStream);
  const [preSelectionComplete, setPreSelectionComplete] = useState<boolean>(Boolean(admission || initialStream));

  const [formData, setFormData] = useState({
    fullName: admission?.fullName || "",
    fatherName: admission?.fatherName || "",
    collegeNo: admission?.collegeNo || "",
    bayFormNo: admission?.bayFormNo || "",
    dob: admission?.dob || "",
    previousClass: admission?.previousClass || (initialStream === "bs" ? "12th" : "10th"),
    boardRollNo: admission?.boardRollNo || "",
    previousMarks: admission?.previousMarks ? String(admission.previousMarks) : "",
    previousInstitute: admission?.previousInstitute || "",
    subjects: admission?.subjects || ([] as string[]),
    address: admission?.address || "",
    admissionFee: admission?.admissionFee ? String(admission.admissionFee) : "",
    miscFunds: admission?.miscFunds ? String(admission.miscFunds) : "",
    totalFeeFinalized: admission?.totalFeeFinalized ? String(admission.totalFeeFinalized) : "", // Tuition Fee
    previousArrears: (admission as any)?.previousArrears ? String((admission as any).previousArrears) : "0", // Previous Semester Arrears
    totalPackage: admission?.totalPackage || 0,
    feeReceived: admission?.feeReceived ? String(admission.feeReceived) : "",
    paymentPlan: admission?.paymentPlan || (initialStream === "bs" ? "Semester" : "Installments"),
    paidMonths: admission?.paidMonths || ([] as string[]),
    paidInstallments: admission?.paidInstallments || 0,
    totalInstallments: admission?.totalInstallments || (initialStream === "bs" ? 2 : 12),
    nextInstallmentDate: admission?.nextInstallmentDate || "",
    totalSemesters: admission?.totalSemesters || (initialStream === "bs" ? 8 : 0),
    feePerSemester: admission?.feePerSemester || 0,
    nextSemesterDueDate: admission?.nextSemesterDueDate || "",
    contactNumber: admission?.contactNumber || "",
    fatherContact: admission?.fatherContact || "",
    secondaryContact: admission?.secondaryContact || "",
    email: admission?.email || "",
    bloodGroup: admission?.bloodGroup || "",
    reference: admission?.reference || "",
    gender: admission?.gender || "Male",
    category: admission?.category || (initialStream === "bs" ? "BS Semester 1st (Fresh Intake)" : "Inter Part-1 Boys"),
    group: admission?.group || (initialStream === "bs" ? "BS Computer Science (BSCS)" : "FSC (Premedical)"),
    section: admission?.section || "",
    photo: admission?.photo || "",
    studentId: admission?.studentId || "",
    status: admission?.status || "Prospective",
    session: admission?.session || (initialStream === "bs" ? "2026-30" : "2026-28"),
    sessionStartDate: admission?.sessionStartDate || "",
    sessionEndDate: admission?.sessionEndDate || "",
    academicPart: admission?.academicPart || "Part-1",
    programType: admission?.programType || (initialStream === "bs" ? "Semester" : "Yearly"),
    currentSemester: admission?.currentSemester || (initialStream === "bs" ? 1 : 0),
    concessionReason: admission?.concessionReason || "",
    fingerprintTemplate: admission?.fingerprintTemplate || "",
    fingerprintFinger: admission?.fingerprintFinger || "Right Thumb (دایاں انگوٹھا)",
    fingerprintEnrolledAt: admission?.fingerprintEnrolledAt || "",
  });

  // Sync form data when admission changes
  React.useEffect(() => {
    if (admission) {
      setFormData({
        fullName: admission.fullName || "",
        fatherName: admission.fatherName || "",
        collegeNo: admission.collegeNo || "",
        bayFormNo: admission.bayFormNo || "",
        dob: admission.dob || "",
        previousClass: admission.previousClass || "10th",
        boardRollNo: admission.boardRollNo || "",
        previousMarks: admission.previousMarks ? String(admission.previousMarks) : "",
        previousInstitute: admission.previousInstitute || "",
        subjects: admission.subjects || [],
        address: admission.address || "",
        admissionFee: admission.admissionFee ? String(admission.admissionFee) : "",
        miscFunds: admission.miscFunds ? String(admission.miscFunds) : "",
        totalFeeFinalized: admission.totalFeeFinalized ? String(admission.totalFeeFinalized) : "",
        previousArrears: (admission as any).previousArrears ? String((admission as any).previousArrears) : "0",
        totalPackage: admission.totalPackage || 0,
        feeReceived: admission.feeReceived ? String(admission.feeReceived) : "",
        paymentPlan: admission.paymentPlan || "Installments",
        paidMonths: admission.paidMonths || [],
        paidInstallments: admission.paidInstallments || 0,
        totalInstallments: admission.totalInstallments || 12,
        nextInstallmentDate: admission.nextInstallmentDate || "",
        totalSemesters: admission.totalSemesters || 0,
        feePerSemester: admission.feePerSemester || 0,
        nextSemesterDueDate: admission.nextSemesterDueDate || "",
        contactNumber: admission.contactNumber || "",
        fatherContact: admission.fatherContact || "",
        secondaryContact: admission.secondaryContact || "",
        email: admission.email || "",
        bloodGroup: admission.bloodGroup || "",
        reference: admission.reference || "",
        gender: admission.gender || "Male",
        category: (admission.category as any) || "Inter Part-1 Boys",
        group: admission.group || "",
        section: admission.section || "",
        photo: admission.photo || "",
        studentId: admission.studentId || "",
        status: (admission.status as any) || "Prospective",
        session: admission.session || "",
        sessionStartDate: admission.sessionStartDate || "",
        sessionEndDate: admission.sessionEndDate || "",
        academicPart: admission.academicPart || "Part-1",
        programType: admission.programType || "Yearly",
        currentSemester: admission.currentSemester || 0,
        concessionReason: admission.concessionReason || "",
        fingerprintTemplate: admission.fingerprintTemplate || "",
        fingerprintFinger: admission.fingerprintFinger || "Right Thumb (دایاں انگوٹھا)",
        fingerprintEnrolledAt: admission.fingerprintEnrolledAt || "",
      });

      const cachedBmp = typeof window !== "undefined"
        ? localStorage.getItem(`scj_fp_thumb_${admission.id}`) ||
          (admission.studentId ? localStorage.getItem(`scj_fp_thumb_${admission.studentId}`) : null) ||
          (admission.collegeNo ? localStorage.getItem(`scj_fp_thumb_${admission.collegeNo}`) : null)
        : null;
      if (cachedBmp && cachedBmp.length > 100 && !cachedBmp.includes("undefined") && cachedBmp.startsWith("Qk")) {
        setFpBmp(cachedBmp);
      } else {
        setFpBmp(null);
      }
    }
  }, [admission, admission?.id]);

  const [isScanningFP, setIsScanningFP] = useState(false);
  const [fpQuality, setFpQuality] = useState<number | null>(null);
  const [fpBmp, setFpBmp] = useState<string | null>(null);

  const handleScanThumb = async () => {
    setIsScanningFP(true);
    toast.info("Please place student's right thumb firmly on the SecuGen scanner...", { id: "secugen-adm" });
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
            const targetId = admission?.id || formData.studentId || formData.collegeNo;
            if (targetId) localStorage.setItem(`scj_fp_thumb_${targetId}`, res.bmpBase64);
          } catch (e) {}
        }
        toast.success(`Thumb impression captured successfully! (Quality: ${res.quality}%)`, { id: "secugen-adm" });
      } else {
        toast.error(res.error || "Failed to capture fingerprint. Ensure device is plugged in.", { id: "secugen-adm" });
      }
    } catch (err: any) {
      toast.error(`Scanner error: ${err.message || String(err)}`, { id: "secugen-adm" });
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
      const targetId = admission?.id || formData.studentId || formData.collegeNo;
      if (targetId) localStorage.removeItem(`scj_fp_thumb_${targetId}`);
    } catch (e) {}
    toast.info("Thumb impression removed from form.");
  };

  const handleAutoSuggestRollNo = () => {
    const targetSection = (formData.section || "").trim().toLowerCase();
    const targetGroup = (formData.group || "").trim().toLowerCase();

    const allRolls: number[] = [];

    (data.students || []).forEach((s: any) => {
      const matchSec = targetSection && (s.section || "").toLowerCase() === targetSection;
      const matchGrp = targetGroup && (s.group || "").toLowerCase() === targetGroup;
      if (matchSec || matchGrp || !targetSection) {
        const num = parseInt(String(s.collegeNo || "").replace(/\D/g, ""), 10);
        if (!isNaN(num) && num > 0) allRolls.push(num);
      }
    });

    (data.admissions || []).forEach((a: any) => {
      const matchSec = targetSection && (a.section || "").toLowerCase() === targetSection;
      const matchGrp = targetGroup && (a.group || "").toLowerCase() === targetGroup;
      if (matchSec || matchGrp || !targetSection) {
        const num = parseInt(String(a.collegeNo || "").replace(/\D/g, ""), 10);
        if (!isNaN(num) && num > 0) allRolls.push(num);
      }
    });

    const nextRoll = allRolls.length > 0 ? Math.max(...allRolls) + 1 : 1001;
    setFormData((prev) => ({ ...prev, collegeNo: String(nextRoll) }));
    toast.success(`Suggested Roll #: ${nextRoll}`, {
      description: `Next sequential roll number for ${formData.section || formData.group || "Intermediate"}`
    });
  };

  // Auto-calculate Total Package (Tuition + Admission + Misc + Previous Arrears)
  React.useEffect(() => {
    const total =
      Number(formData.admissionFee || 0) +
      Number(formData.miscFunds || 0) +
      Number(formData.totalFeeFinalized || 0) +
      Number(formData.previousArrears || 0);
    setFormData((prev) => ({ ...prev, totalPackage: total }));
  }, [formData.admissionFee, formData.miscFunds, formData.totalFeeFinalized, formData.previousArrears]);

  // Auto-confirm admission when received amount is entered (Allot unique Student ID on Fee Submission)
  React.useEffect(() => {
    if (Number(formData.feeReceived) > 0 && !formData.studentId) {
      const newId = data.generateStudentId(formData.group || program);
      setFormData((prev) => ({
        ...prev,
        studentId: newId,
        status: "Admitted/Confirmed",
      }));
      toast.success(`Official Student ID Allotted: ${newId}`, {
        description:
          "Official identification has been generated based on fee submission.",
      });
    }
  }, [formData.feeReceived, formData.studentId, formData.group, data, program]);

  // Detect program dynamically with strict stream adherence
  const detectedProgram = React.useMemo(() => {
    if (selectedStream) return selectedStream;
    const groupLower = (formData.group || "").toLowerCase();
    const categoryLower = (formData.category || "").toLowerCase();
    if (groupLower.includes("dit") || groupLower.includes("diploma") || categoryLower.includes("dit")) {
      return "dit";
    }
    if (
      groupLower.includes("bs") ||
      groupLower.includes("b.s") ||
      groupLower.includes("bba") ||
      groupLower.includes("bachelor") ||
      categoryLower.includes("bs")
    ) {
      return "bs";
    }
    if (groupLower.includes("uk") || groupLower.includes("level 3") || categoryLower.includes("uk")) {
      return "ukl3";
    }
    return "fsc";
  }, [selectedStream, formData.group, formData.category]);

  // Handle stream selection from Step 0 Cards
  const handleStreamSelect = (stream: "fsc" | "bs" | "dit" | "ukl3") => {
    setSelectedStream(stream);
    let defaultSession = "2026-28";
    let defaultGroup = "";
    let defaultCategory = "";
    let defaultSubjects: string[] = [];
    let paymentPlan = "Installments";
    let totalSemesters = 0;
    let programType: "Yearly" | "Semester" = "Yearly";
    let currentSemester = 1;
    let prevClass = "10th";

    if (stream === "bs") {
      defaultSession = "2026-30";
      defaultGroup = "BS Computer Science (BSCS)";
      defaultCategory = "BS Semester 1st (Fresh Intake)";
      paymentPlan = "Semester";
      totalSemesters = 8;
      programType = "Semester";
      currentSemester = 1;
      prevClass = "12th";
      const bscsGroup = ACADEMIC_GROUPS.find(g => g.name.includes("BS Computer Science"));
      defaultSubjects = bscsGroup 
        ? Array.from(new Set(['English / Communication', 'Pakistan Studies / Ideology', 'Islamic Studies / Ethics', ...bscsGroup.subjects]))
        : ['Programming Fundamentals', 'Calculus', 'English Composition'];
    } else if (stream === "dit") {
      defaultSession = "2026-27";
      defaultGroup = "DIT";
      defaultCategory = formData.gender === "Female" ? "DIT Girls" : "DIT Boys";
      paymentPlan = "Semester";
      totalSemesters = 4;
      programType = "Semester";
      prevClass = "10th";
      const ditGroup = ACADEMIC_GROUPS.find(g => g.name.includes("DIT"));
      defaultSubjects = ditGroup ? [...ditGroup.subjects] : ['Office Automation', 'Web Development'];
    } else if (stream === "ukl3") {
      defaultSession = "2026-28";
      defaultGroup = "UK Level 3";
      defaultCategory = "UK Level 3 Year-1";
      paymentPlan = "Semester";
      totalSemesters = 3;
      programType = "Semester";
      prevClass = "10th";
      const ukGroup = ACADEMIC_GROUPS.find(g => g.name.includes("UK Level 3"));
      defaultSubjects = ukGroup ? [...ukGroup.subjects] : ['Applied Science', 'Business Analysis'];
    } else {
      defaultSession = "2026-28";
      defaultGroup = "FSC (Premedical)";
      defaultCategory = formData.gender === "Female" ? "Inter Part-1 Girls" : "Inter Part-1 Boys";
      paymentPlan = "Installments";
      programType = "Yearly";
      prevClass = "10th";
      const fscGroup = ACADEMIC_GROUPS.find(g => g.name.includes("Premedical"));
      defaultSubjects = fscGroup ? Array.from(new Set([...COMPULSORY_SUBJECTS, ...fscGroup.subjects])) : ['Biology', 'Physics', 'Chemistry', ...COMPULSORY_SUBJECTS];
    }

    setFormData(prev => ({
      ...prev,
      session: defaultSession,
      group: defaultGroup,
      category: defaultCategory,
      subjects: defaultSubjects,
      paymentPlan,
      totalSemesters,
      programType,
      currentSemester,
      previousClass: prevClass,
    }));
    setPreSelectionComplete(true);
    toast.success(`Stream Selected: ${stream.toUpperCase()}`);
  };

  const categories = React.useMemo(() => {
    let result: string[] = [];

    if (detectedProgram === "bs") {
      result = [
        "BS Semester 1st (Fresh Intake)",
        "BS Semester 2nd",
        "BS Semester 3rd (2nd Year)",
        "BS Semester 4th",
        "BS Semester 5th (ADP Lateral Entry)",
        "BS Semester 6th",
        "BS Semester 7th (Final Year)",
        "BS Semester 8th",
        formData.gender === "Female" ? "BS Girls Campus" : "BS Boys Campus",
      ];
    } else if (detectedProgram === "dit") {
      result = [
        "DIT Part-1",
        "DIT Part-2",
        formData.gender === "Female" ? "DIT Girls" : "DIT Boys",
      ];
    } else if (detectedProgram === "ukl3") {
      result = [
        "UK Level 3 Year-1",
        "UK Level 3 Year-2",
        formData.gender === "Female" ? "UK L3 Girls" : "UK L3 Boys",
      ];
    } else {
      result = formData.gender === "Female"
        ? ["Inter Part-1 Girls", "Inter Part-2 Girls"]
        : ["Inter Part-1 Boys", "Inter Part-2 Boys"];
    }

    return result;
  }, [detectedProgram, formData.gender]);

  const previewRef = React.useRef<HTMLDivElement>(null);

  const filteredSections = React.useMemo(() => {
    if (!data.settings?.predefinedSections) return [];

    return data.settings.predefinedSections.filter((sec: any) => {
      // 1. Gender Match (Male/Female/Co-ed)
      const matchesGender =
        !sec.gender || sec.gender === "Co-ed" || sec.gender === formData.gender;
      if (!matchesGender) return false;

      // 2. Program Match
      const sp = (sec.program || "").toLowerCase();
      if (!sec.program || sp === "all" || sp === "other") return true;

      if (detectedProgram === "fsc") {
        return sp === "inter" || sp === "fsc" || sp === "intermediate";
      }
      if (detectedProgram === "dit") {
        return sp.includes("dit") || sp.includes("diploma");
      }
      if (detectedProgram === "ukl3") {
        return sp.includes("uk") || sp.includes("level 3");
      }
      if (detectedProgram === "bs") {
        return sp.includes("bs") || sp.includes("degree");
      }

      return true;
    });
  }, [data.settings?.predefinedSections, formData.gender, detectedProgram]);

  // Strict Stream Isolation: Groups belong ONLY to selected educational stream
  const filteredGroups = React.useMemo(() => {
    return ACADEMIC_GROUPS.filter((g) => {
      const name = g.name.toLowerCase();
      const isDIT = name.includes("dit") || name.includes("diploma") || g.type === "Diploma";
      const isUK = name.includes("uk") || name.includes("level 3") || g.type === "Vocational";
      const isBS = name.includes("bs") || name.includes("b.s") || name.includes("bba") || name.includes("bachelor") || g.type === "Degree";

      if (detectedProgram === "fsc") return !isDIT && !isUK && !isBS;
      if (detectedProgram === "dit") return isDIT;
      if (detectedProgram === "ukl3") return isUK;
      if (detectedProgram === "bs") return isBS;
      return true;
    });
  }, [detectedProgram]);

  const handleGroupChange = (groupName: string) => {
    const group = ACADEMIC_GROUPS.find((g) => g.name === groupName);
    if (group) {
      const lowerGroupName = groupName.toLowerCase();
      const isBS = lowerGroupName.includes("bs") || lowerGroupName.includes("b.s") || lowerGroupName.includes("bba") || lowerGroupName.includes("bachelor");
      const isDIT = lowerGroupName.includes("dit") || lowerGroupName.includes("diploma");
      const isUK = lowerGroupName.includes("uk") || lowerGroupName.includes("level 3");

      const newSubjects = isBS
        ? Array.from(new Set(['English / Communication', 'Pakistan Studies / Ideology', 'Islamic Studies / Ethics', ...group.subjects]))
        : isDIT
        ? Array.from(new Set(['English', ...group.subjects]))
        : Array.from(new Set([...COMPULSORY_SUBJECTS, ...group.subjects]));

      let paymentPlan = formData.paymentPlan;
      let totalSemesters = formData.totalSemesters;
      let programType = "Yearly" as "Yearly" | "Semester";
      let currentSemester = formData.currentSemester || 1;
      let defaultCategory = formData.category;

      if (isBS) {
        paymentPlan = "Semester";
        totalSemesters = 8;
        programType = "Semester";
        defaultCategory = (formData.currentSemester && formData.currentSemester > 1)
          ? `BS Semester ${formData.currentSemester}${formData.currentSemester === 2 ? 'nd' : formData.currentSemester === 3 ? 'rd' : 'th'}`
          : "BS Semester 1st (Fresh Intake)";
      } else if (isDIT) {
        paymentPlan = "Semester";
        totalSemesters = 4;
        programType = "Semester";
        defaultCategory = "DIT Part-1";
      } else if (isUK) {
        paymentPlan = "Semester";
        totalSemesters = 3;
        programType = "Semester";
        defaultCategory = "UK Level 3 Year-1";
      } else {
        paymentPlan = "Installments";
        programType = "Yearly";
        defaultCategory = formData.gender === "Female" ? "Inter Part-1 Girls" : "Inter Part-1 Boys";
      }

      setFormData((prev) => ({
        ...prev,
        group: groupName,
        category: defaultCategory,
        subjects: newSubjects,
        paymentPlan,
        totalSemesters,
        programType,
        currentSemester,
      }));
    }
  };

  const handleCategoryChange = (val: string) => {
    let currentSem = formData.currentSemester;
    const lower = val.toLowerCase();
    if (lower.includes("1st") || lower.includes("sem 1") || lower.includes("semester 1")) currentSem = 1;
    else if (lower.includes("2nd") || lower.includes("sem 2") || lower.includes("semester 2")) currentSem = 2;
    else if (lower.includes("3rd") || lower.includes("sem 3") || lower.includes("semester 3")) currentSem = 3;
    else if (lower.includes("4th") || lower.includes("sem 4") || lower.includes("semester 4")) currentSem = 4;
    else if (lower.includes("5th") || lower.includes("sem 5") || lower.includes("semester 5") || lower.includes("lateral")) currentSem = 5;
    else if (lower.includes("6th") || lower.includes("sem 6") || lower.includes("semester 6")) currentSem = 6;
    else if (lower.includes("7th") || lower.includes("sem 7") || lower.includes("semester 7")) currentSem = 7;
    else if (lower.includes("8th") || lower.includes("sem 8") || lower.includes("semester 8")) currentSem = 8;

    const academicPart = currentSem && currentSem > 4 ? "Part-2" : "Part-1";

    setFormData(prev => ({
      ...prev,
      category: val,
      currentSemester: currentSem || prev.currentSemester,
      academicPart: academicPart as any
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalized = Number(formData.totalFeeFinalized);
    const totalPkg = formData.totalPackage;
    const received = Number(formData.feeReceived);
    const oldReceived = admission ? Number(admission.feeReceived || 0) : 0;

    let status: AdmissionStatus =
      (formData.status as AdmissionStatus) || "Not Paid";
    if (received >= totalPkg && totalPkg > 0) status = "Full Paid";
    else if (received > 0) status = "Partial Paid";
    else if (formData.status === "Admitted/Confirmed")
      status = "Admitted/Confirmed";

    if (admission) {
      if (received > oldReceived) {
        const difference = received - oldReceived;
        data.recordFeePayment(admission.id, {
          id: `pay-${Date.now()}`,
          month: new Date().toLocaleString('en-US', { month: 'long' }),
          year: new Date().getFullYear(),
          amountDue: totalPkg - oldReceived,
          amountPaid: difference,
          status: 'Paid',
          datePaid: new Date().toISOString(),
          receiptId: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
          feeType: 'Admission / Initial Fee',
          paymentMethod: 'Cash',
          collectedBy: 'System'
        }, formData.fullName || 'Student');
      }

      data.updateAdmission(admission.id, {
        ...formData,
        previousMarks: Number(formData.previousMarks),
        admissionFee: Number(formData.admissionFee),
        miscFunds: Number(formData.miscFunds),
        totalFeeFinalized: finalized,
        previousArrears: Number(formData.previousArrears || 0),
        totalPackage: totalPkg,
        feeReceived: received,
        isAdmitted: formData.status === "Admitted/Confirmed" || received > 0,
        status,
      });

      toast.success("Admission updated successfully!");
      onClose();
      return;
    }

    const newAdmission: Admission = {
      id: `adm-${Date.now()}`,
      studentId: formData.studentId || "",
      collegeNo: formData.collegeNo,
      bayFormNo: formData.bayFormNo,
      dob: formData.dob,
      previousClass: formData.previousClass,
      boardRollNo: formData.boardRollNo,
      date: new Date().toISOString().split("T")[0],
      fullName: formData.fullName,
      fatherName: formData.fatherName,
      previousMarks: Number(formData.previousMarks),
      previousInstitute: formData.previousInstitute,
      category: formData.category,
      group: formData.group,
      section: formData.section,
      subjects: formData.subjects,
      address: formData.address,
      admissionFee: Number(formData.admissionFee),
      miscFunds: Number(formData.miscFunds),
      totalFeeFinalized: finalized,
      previousArrears: Number(formData.previousArrears || 0),
      totalPackage: totalPkg,
      feeReceived: received,
      paymentPlan: formData.paymentPlan,
      paidMonths: formData.paidMonths,
      paidInstallments: formData.paidInstallments,
      totalInstallments: formData.totalInstallments,
      nextInstallmentDate: formData.nextInstallmentDate,
      totalSemesters: formData.totalSemesters,
      programType: formData.programType,
      currentSemester: formData.currentSemester,
      feePerSemester: Number(formData.feePerSemester),
      nextSemesterDueDate: formData.nextSemesterDueDate,
      contactNumber: formData.contactNumber,
      fatherContact: formData.fatherContact,
      secondaryContact: formData.secondaryContact,
      email: formData.email,
      bloodGroup: formData.bloodGroup,
      reference: formData.reference,
      concessionReason: formData.concessionReason || undefined,
      gender: formData.gender,
      photo: formData.photo || "",
      fingerprintTemplate: formData.fingerprintTemplate || undefined,
      fingerprintFinger: formData.fingerprintFinger || undefined,
      fingerprintEnrolledAt: formData.fingerprintEnrolledAt || (formData.fingerprintTemplate ? new Date().toISOString() : undefined),
      status: formData.status || status,
      isAdmitted: formData.status === "Admitted/Confirmed" || received > 0,
      session:
        formData.session || selectedSession || data.settings?.academicSession,
      sessionStartDate: formData.sessionStartDate,
      sessionEndDate: formData.sessionEndDate,
      academicPart: formData.academicPart || "Part-1",
    };

    data.addAdmission(newAdmission);

    toast.success("Admission form submitted successfully!");
    onClose();
  };

  const toggleSubject = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: (prev.subjects || []).includes(subject)
        ? (prev.subjects || []).filter((s) => s !== subject)
        : [...(prev.subjects || []), subject],
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const toastId = toast.loading("Processing photo...");
      try {
        const compressedBase64 = await compressImage(file);
        setFormData((prev) => ({
          ...prev,
          photo: compressedBase64,
        }));
        toast.dismiss(toastId);
        toast.success(`Photo processed successfully`);
      } catch (err) {
        console.error("Photo processing error:", err);
        toast.dismiss(toastId);
        toast.error("Failed to process photo.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── STEP 0: STREAM-FIRST LEVEL SELECTION ─── */}
      {!preSelectionComplete ? (
        <div className="space-y-6 py-4 px-2 w-full max-w-full animate-in fade-in zoom-in-95 duration-400">
          <div className="text-center space-y-2 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-superior-teal/10 text-superior-teal text-xs font-black uppercase tracking-widest border border-superior-teal/20">
              <Sparkles size={14} className="text-superior-gold" />
              <span>Step 1 · Select Degree & Educational Stream</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Select Educational Stream
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
              Choose the educational level to open its tailored admission dossier with zero cross-program clutter or unrelated courses.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {/* 1. Intermediate (HSSC) */}
            <div
              onClick={() => handleStreamSelect("fsc")}
              className="group p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-superior-teal hover:shadow-xl hover:shadow-superior-teal/10 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="space-y-3.5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">
                    <GraduationCap size={24} />
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                    BISE Multan
                  </Badge>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-superior-teal transition-colors leading-snug">
                    Intermediate (F.Sc / ICS / I.Com)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                    2-Year Higher Secondary Certificate for Matric graduates with board subjects.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {["F.Sc Pre-Med", "F.Sc Pre-Eng", "ICS Computer", "I.Com"].map((badge) => (
                    <span key={badge} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9.5px] font-bold">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between relative z-10">
                <span className="text-[10px] font-bold text-slate-400">Session: 2026-28</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-superior-teal group-hover:translate-x-1 transition-transform">
                  Apply Inter <ArrowRight size={13} />
                </span>
              </div>
            </div>

            {/* 2. BS 4-Year University Degree & ADP Lateral */}
            <div
              onClick={() => handleStreamSelect("bs")}
              className="group p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="space-y-3.5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">
                    <Building2 size={24} />
                  </div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                    HEC Degree
                  </Badge>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors leading-snug">
                    BS Degree & ADP (5th Sem)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                    Semester system (Sem 1–8) with university syllabus & 5th sem ADP lateral entry.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {["BS CS", "BS IT", "BS English", "BS Zoology", "BS Botany"].map((badge) => (
                    <span key={badge} className="px-2 py-0.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 text-[9.5px] font-bold">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between relative z-10">
                <span className="text-[10px] font-bold text-slate-400">2026-30 / 2024-26</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 group-hover:translate-x-1 transition-transform">
                  Apply BS <ArrowRight size={13} />
                </span>
              </div>
            </div>

            {/* 3. D.I.T. (Diploma in Information Technology) */}
            <div
              onClick={() => handleStreamSelect("dit")}
              className="group p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-600 hover:shadow-xl hover:shadow-sky-500/10 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-sky-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="space-y-3.5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">
                    <Laptop size={24} />
                  </div>
                  <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 text-[10px] font-black uppercase tracking-wider">
                    PBTE Board
                  </Badge>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-sky-600 transition-colors leading-snug">
                    D.I.T. Technical Diploma
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                    1 to 2 Years professional technical diploma in office automation & programming.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {["Office Automation", "Web Dev", "Hardware & Net"].map((badge) => (
                    <span key={badge} className="px-2 py-0.5 rounded-lg bg-sky-50/70 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 text-[9.5px] font-bold">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between relative z-10">
                <span className="text-[10px] font-bold text-slate-400">Session: 2026-27</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-sky-600 group-hover:translate-x-1 transition-transform">
                  Apply D.I.T. <ArrowRight size={13} />
                </span>
              </div>
            </div>

            {/* 4. U.K. Level 3 International */}
            <div
              onClick={() => handleStreamSelect("ukl3")}
              className="group p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-600 hover:shadow-xl hover:shadow-amber-500/10 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="space-y-3.5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">
                    <Globe size={24} />
                  </div>
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                    Pearson / UK
                  </Badge>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition-colors leading-snug">
                    U.K. Level 3 International
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                    International diploma pathway for foreign university degrees in Business & IT.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {["Applied Science", "Business Analysis", "Cyber Sec"].map((badge) => (
                    <span key={badge} className="px-2 py-0.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[9.5px] font-bold">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between relative z-10">
                <span className="text-[10px] font-bold text-slate-400">Session: 2026-28</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-600 group-hover:translate-x-1 transition-transform">
                  Apply UK Level 3 <ArrowRight size={13} />
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Landscape Stream & Session Control Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4 border border-slate-700/60 shadow-lg">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-md",
                detectedProgram === "bs" ? "bg-indigo-600" :
                detectedProgram === "dit" ? "bg-sky-600" :
                detectedProgram === "ukl3" ? "bg-amber-600" : "bg-superior-teal"
              )}>
                {detectedProgram === "bs" ? <Building2 size={22} /> :
                 detectedProgram === "dit" ? <Laptop size={22} /> :
                 detectedProgram === "ukl3" ? <Globe size={22} /> : <GraduationCap size={22} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black uppercase tracking-wider text-white">
                    {detectedProgram === "bs" ? "BS 4-Year University Degree & ADP Lateral" :
                     detectedProgram === "dit" ? "D.I.T. Technical Diploma" :
                     detectedProgram === "ukl3" ? "U.K. Level 3 International" : "Intermediate (HSSC BISE)"}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold border-white/20 text-white/90">
                    {formData.gender === "Female" ? "Girls Campus" : "Boys Campus"}
                  </Badge>
                </div>
                <p className="text-xs text-white/70 font-medium">
                  Group: <span className="text-superior-gold font-bold">{formData.group || "Not Selected"}</span> · Session: <span className="font-bold text-white">{formData.session || "2026-28"}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Select
                value={formData.session || ""}
                onValueChange={(s) => setFormData(prev => ({ ...prev, session: s }))}
              >
                <SelectTrigger className="h-9 w-32 rounded-xl bg-white/10 border-white/20 text-white text-xs font-bold focus:ring-0">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-2xl">
                  {CANONICAL_SESSIONS.map((sess: string) => (
                    <SelectItem key={sess} value={sess} className="font-bold text-xs">
                      Session {sess}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreSelectionComplete(false)}
                className="h-9 px-3 rounded-xl border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold gap-1.5 transition-all"
              >
                <RefreshCw size={13} />
                <span>Switch Stream</span>
              </Button>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 w-full mb-6 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1.5">
              <TabsTrigger value="student" className="rounded-xl text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                1. Candidate & Guardian Profile
              </TabsTrigger>
              <TabsTrigger value="subjects" className="rounded-xl text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                2. Academic & Curriculum
              </TabsTrigger>
              <TabsTrigger value="fees" className="rounded-xl text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                3. Financials & Biometrics
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ─── TAB 1: CANDIDATE & GUARDIAN PROFILE ─── */}
              <TabsContent
                value="student"
                className="space-y-6 animate-in fade-in duration-300"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                  {/* Column 1: Primary Identity Section */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-3.5">
                    <FormSectionHeader
                      icon={User}
                      title="Candidate Identity"
                      sub="Official legal credentials matching board/university"
                    />
                    <div className="space-y-3">
                      <FormFieldWrapper label="Full Student Name" required>
                        <Input
                          placeholder="Student Full Name"
                          className="h-10 border-slate-200 rounded-xl bg-white dark:bg-slate-900 font-bold text-xs"
                          value={formData.fullName || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        />
                      </FormFieldWrapper>

                      <FormFieldWrapper label="Father's Full Name (Optional)">
                        <Input
                          placeholder="Father's Name (Optional with warning)"
                          className="h-10 border-slate-200 rounded-xl bg-white dark:bg-slate-900 font-bold text-xs"
                          value={formData.fatherName || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, fatherName: e.target.value }))}
                        />
                      </FormFieldWrapper>

                      <div className="grid grid-cols-2 gap-2.5">
                        <FormFieldWrapper label="B-Form / CNIC">
                          <Input
                            placeholder="38403-xxxxxxx-x"
                            className="h-10 border-slate-200 rounded-xl bg-white dark:bg-slate-900 font-mono text-xs"
                            value={formData.bayFormNo || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, bayFormNo: e.target.value }))}
                          />
                        </FormFieldWrapper>

                        <FormFieldWrapper label="Date of Birth">
                          <Input
                            type="date"
                            className="h-10 border-slate-200 rounded-xl bg-white dark:bg-slate-900 text-xs"
                            value={formData.dob || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                          />
                        </FormFieldWrapper>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <FormFieldWrapper label="Gender / Campus">
                          <Select
                            value={formData.gender || "Male"}
                            onValueChange={(v: any) => setFormData(prev => ({ ...prev, gender: v }))}
                          >
                            <SelectTrigger className="h-10 border-slate-200 rounded-xl bg-white dark:bg-slate-900 font-bold text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Male">Male (Boys)</SelectItem>
                              <SelectItem value="Female">Female (Girls)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormFieldWrapper>

                        <FormFieldWrapper label="Blood Group">
                          <Select
                            value={formData.bloodGroup || ""}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, bloodGroup: v }))}
                          >
                            <SelectTrigger className="h-10 border-slate-200 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold">
                              <SelectValue placeholder="Blood Group" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormFieldWrapper>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Communication & Guardian WhatsApp Section */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-3.5">
                    <FormSectionHeader
                      icon={MessageSquare}
                      title="Communication & WhatsApp"
                      sub="Direct SMS & fee alerts connectivity"
                    />
                    <div className="space-y-3">
                      <FormFieldWrapper
                        label={
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100">Guardian WhatsApp</span>
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-emerald-700 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300">
                              <MessageSquare size={10} className="text-emerald-600 fill-emerald-600/30" />
                              WhatsApp Active
                            </span>
                          </div>
                        }
                        required
                      >
                        <div className="flex gap-1.5">
                          <div className="relative flex-1">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
                              <MessageSquare size={14} />
                            </div>
                            <Input
                              className="h-10 pl-8.5 border-slate-200 rounded-xl bg-white dark:bg-slate-900 font-mono text-xs font-bold focus:border-emerald-500"
                              placeholder="03xx-xxxxxxx (Father WhatsApp)"
                              value={formData.fatherContact || ""}
                              onChange={(e) => setFormData(prev => ({ ...prev, fatherContact: e.target.value }))}
                            />
                          </div>
                          {formData.fatherContact && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const clean = formData.fatherContact.replace(/[^\d]/g, "");
                                const intl = clean.startsWith("03") ? "92" + clean.slice(1) : clean.startsWith("92") ? clean : "92" + clean;
                                window.open(`https://wa.me/${intl}?text=Assalam-o-Alaikum%20from%20Superior%20College%20Jahanian!`, "_blank");
                              }}
                              className="h-10 px-2.5 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-[11px] font-bold gap-1"
                              title="Open WhatsApp Direct Chat"
                            >
                              <ExternalLink size={12} /> Ping
                            </Button>
                          )}
                        </div>
                      </FormFieldWrapper>

                      <div className="grid grid-cols-2 gap-2.5">
                        <FormFieldWrapper label="Student Mobile">
                          <Input
                            className="h-10 border-slate-200 rounded-xl bg-white dark:bg-slate-900 font-mono text-xs"
                            placeholder="03xx-xxxxxxx"
                            value={formData.contactNumber || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                          />
                        </FormFieldWrapper>

                        <FormFieldWrapper label="Reference">
                          <Input
                            className="h-10 border-slate-200 rounded-xl bg-white dark:bg-slate-900 text-xs"
                            placeholder="Referred by..."
                            value={formData.reference || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                          />
                        </FormFieldWrapper>
                      </div>

                      <FormFieldWrapper label="Email Address">
                        <Input
                          className="h-10 border-slate-200 rounded-xl bg-white dark:bg-slate-900 text-xs"
                          placeholder="student@example.com"
                          value={formData.email || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </FormFieldWrapper>

                      <FormFieldWrapper label="Residential Address">
                        <Input
                          placeholder="Village / Town, Tehsil, City Address"
                          className="h-10 border-slate-200 rounded-xl bg-white dark:bg-slate-900 text-xs"
                          value={formData.address || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </FormFieldWrapper>
                    </div>
                  </div>

                  {/* Column 3: Photo & Biometric Thumb Box */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                    <FormSectionHeader
                      icon={Fingerprint}
                      title="Biometrics & Photo"
                      sub="Physical identification dossier"
                    />

                    {/* Photo + Upload Row */}
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                      <div className="relative group shrink-0">
                        <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center overflow-hidden transition-all shadow-inner group-hover:border-superior-teal">
                          {formData.photo ? (
                            <img
                              src={formData.photo}
                              alt="Candidate Photo"
                              className="w-full h-full object-cover object-[center_top]"
                            />
                          ) : (
                            <>
                              <Camera className="text-slate-400 mb-1" size={20} />
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Upload</span>
                            </>
                          )}
                        </div>
                        <label className="absolute inset-0 cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                          />
                        </label>
                        {formData.photo && (
                          <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white p-1 rounded-lg border border-white shadow-xs">
                            <CheckCircle2 size={12} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">Student Photo</h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Passport size photo with clear background</p>
                        <label className="inline-block mt-2">
                          <span className="text-[10px] font-bold text-superior-teal hover:underline cursor-pointer">
                            {formData.photo ? "Change Photo" : "+ Choose File"}
                          </span>
                          <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                        </label>
                      </div>
                    </div>

                    {/* Biometric Thumb Impression Box (SecuGen) */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Fingerprint size={14} className="text-emerald-600" />
                          <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">SecuGen HU20-A Scanner</h4>
                        </div>
                        {formData.fingerprintTemplate && (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                            Enrolled {fpQuality ? `(${fpQuality}%)` : "✅"}
                          </Badge>
                        )}
                      </div>

                      {/* Thumb Visual Frame */}
                      <div className={cn(
                        "w-full h-28 rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden",
                        formData.fingerprintTemplate
                          ? "border-emerald-500 bg-slate-950 shadow-inner"
                          : isScanningFP
                          ? "border-amber-400 bg-amber-50 animate-pulse text-amber-600"
                          : "border-dashed border-slate-300 bg-white text-slate-400"
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
                            <span className="text-[10px] font-bold text-amber-700 animate-pulse">
                              Place Thumb firmly on SecuGen...
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-center">
                            <Fingerprint size={30} className="text-slate-300 mb-1" />
                            <span className="text-[10px] font-bold text-slate-400">
                              Thumb Not Scanned
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Thumb Action Buttons */}
                      <div className="flex items-center gap-2">
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

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => setActiveTab("subjects")}
                    className="h-11 px-8 bg-superior-teal text-white hover:bg-superior-teal/90 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md shadow-superior-teal/20 gap-2"
                  >
                    <span>Continue to Academic History</span>
                    <ArrowRight size={15} />
                  </Button>
                </div>
              </TabsContent>

              {/* ─── TAB 2: ACADEMIC & CURRICULUM ─── */}
              <TabsContent
                value="subjects"
                className="space-y-6 animate-in fade-in duration-300"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Column 1: Academic Background */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                    <FormSectionHeader
                      icon={School}
                      title="Prior Education"
                      sub={detectedProgram === "bs" ? "HSSC / Inter / ADP Background" : "SSC / Matric Background"}
                    />
                    <div className="space-y-3.5">
                      <FormFieldWrapper label={detectedProgram === "bs" ? "Previous Degree / Qualification" : "Previous Class"}>
                        <Select
                          value={formData.previousClass || (detectedProgram === "bs" ? "12th" : "10th")}
                          onValueChange={(v: any) => setFormData(prev => ({ ...prev, previousClass: v }))}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {detectedProgram === "bs" ? (
                              <>
                                <SelectItem value="12th">12th Class (F.Sc / ICS / I.Com - Part 2)</SelectItem>
                                <SelectItem value="ADP">ADP / B.Sc (Associate Degree Lateral Entry)</SelectItem>
                                <SelectItem value="11th">11th Class (Inter Part-1)</SelectItem>
                                <SelectItem value="DAE">DAE (3-Year Technical Diploma)</SelectItem>
                                <SelectItem value="10th">10th Class (Matric)</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="10th">10th Class (Matric)</SelectItem>
                                <SelectItem value="9th">9th Class</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </FormFieldWrapper>

                      <FormFieldWrapper label={detectedProgram === "bs" ? "Board / University Roll #" : "SSC Matric Roll #"}>
                        <Input
                          placeholder="Roll Number"
                          className="h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-mono text-xs"
                          value={formData.boardRollNo || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, boardRollNo: e.target.value }))}
                        />
                      </FormFieldWrapper>

                      <FormFieldWrapper label={detectedProgram === "bs" ? "Obtained Marks / CGPA (out of 1100/1200)" : "SSC Marks (out of 1100/1200)"}>
                        <Input
                          type="number"
                          placeholder="Marks obtained"
                          className="h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-xs"
                          value={formData.previousMarks || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, previousMarks: e.target.value }))}
                        />
                      </FormFieldWrapper>

                      <FormFieldWrapper label={detectedProgram === "bs" ? "Previous College / Institution" : "Previous School Name"}>
                        <Input
                          placeholder="Institution name"
                          className="h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 text-xs"
                          value={formData.previousInstitute || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, previousInstitute: e.target.value }))}
                        />
                      </FormFieldWrapper>
                    </div>
                  </div>

                  {/* Column 2: Program Intake & Section */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                    <FormSectionHeader
                      icon={GraduationCap}
                      title="Intake & Placement"
                      sub="College Section & Roll Allocation"
                    />
                    <div className="space-y-3.5">
                      <FormFieldWrapper label="Academic Group" required>
                        <Select
                          value={formData.group || ""}
                          onValueChange={handleGroupChange}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-xs">
                            <SelectValue placeholder="Select Group" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] rounded-xl">
                            {filteredGroups.map((g) => (
                              <SelectItem key={g.name} value={g.name} className="font-bold text-xs">
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormFieldWrapper>

                      <FormFieldWrapper label={detectedProgram === "bs" ? "Active Semester" : "Class Category"} required>
                        <Select
                          value={formData.category || ""}
                          onValueChange={handleCategoryChange}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-xs">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] rounded-xl">
                            {categories.map((c) => (
                              <SelectItem key={c} value={c} className="font-bold text-xs">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormFieldWrapper>

                      <FormFieldWrapper label="Assigned Section" required>
                        <Select
                          value={formData.section || ""}
                          onValueChange={(v) => {
                            const sec = filteredSections.find(s => s.name === v);
                            setFormData(prev => ({ ...prev, section: v, session: sec?.class || prev.session }));
                          }}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-xs">
                            <SelectValue placeholder="Choose Section" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {filteredSections.map((sec) => (
                              <SelectItem key={sec.id} value={sec.name} className="font-bold text-xs">
                                {sec.name} {sec.class ? `(${sec.class})` : ""}
                              </SelectItem>
                            ))}
                            <SelectItem value="Other / Manual">Other / Manual Section</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormFieldWrapper>

                      <FormFieldWrapper label="College Roll Number">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Roll #"
                            className="h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-mono font-bold text-xs"
                            value={formData.collegeNo || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, collegeNo: e.target.value }))}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAutoSuggestRollNo}
                            className="h-11 px-3 rounded-xl border-superior-teal/30 text-superior-teal hover:bg-superior-teal/10 font-bold text-xs gap-1 shrink-0"
                            title="Auto next roll number"
                          >
                            <Sparkles size={13} className="text-superior-gold" /> Auto Next
                          </Button>
                        </div>
                      </FormFieldWrapper>
                    </div>
                  </div>

                  {/* Column 3: Course Curriculum & Subjects */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4 flex flex-col">
                    <FormSectionHeader
                      icon={Layers}
                      title="Curriculum Subjects"
                      sub="Stream & Group Specific Courses"
                    />
                    <div className="flex-1 space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Enrolled Courses ({formData.subjects.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                        {formData.subjects.map((sub) => (
                          <span
                            key={sub}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-2xs"
                          >
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <span>{sub}</span>
                            <button
                              type="button"
                              onClick={() => toggleSubject(sub)}
                              className="text-slate-400 hover:text-rose-500 ml-1 text-xs"
                              title="Remove course"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Available Group Electives
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(() => {
                            const groupObj = ACADEMIC_GROUPS.find(g => g.name === formData.group);
                            const pool = groupObj ? groupObj.subjects : [];
                            const unselected = pool.filter(s => !formData.subjects.includes(s));
                            if (unselected.length === 0) {
                              return <span className="text-[11px] text-slate-400 italic">All group subjects selected.</span>;
                            }
                            return unselected.map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => toggleSubject(s)}
                                className="px-2.5 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-superior-teal hover:text-superior-teal text-[11px] font-bold transition-all"
                              >
                                + {s}
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("student")}
                    className="h-11 px-6 rounded-xl font-bold text-xs"
                  >
                    Back to Profile
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("fees")}
                    className="h-11 px-8 bg-superior-teal text-white hover:bg-superior-teal/90 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md shadow-superior-teal/20 gap-2"
                  >
                    <span>Continue to Financials</span>
                    <ArrowRight size={15} />
                  </Button>
                </div>
              </TabsContent>

              {/* ─── TAB 3: FINANCIALS & BIOMETRICS ─── */}
              <TabsContent
                value="fees"
                className="space-y-6 animate-in fade-in duration-300"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Column 1: Financial Structure */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                    <FormSectionHeader
                      icon={CreditCard}
                      title="Fee Structure"
                      sub={detectedProgram === "bs" ? "Semester Package Setup" : "Annual Package Setup"}
                    />
                    <div className="space-y-3.5">
                      <FormFieldWrapper label={detectedProgram === "bs" ? "Semester Tuition Fee" : "Tuition Fee (Finalized)"} required>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                          <Input
                            type="number"
                            className="h-11 pl-10 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-black text-sm"
                            value={formData.totalFeeFinalized || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, totalFeeFinalized: e.target.value }))}
                          />
                        </div>
                      </FormFieldWrapper>

                      <FormFieldWrapper label="Admission Fee">
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                          <Input
                            type="number"
                            className="h-11 pl-10 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-black text-xs"
                            value={formData.admissionFee || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, admissionFee: e.target.value }))}
                          />
                        </div>
                      </FormFieldWrapper>

                      <FormFieldWrapper
                        label={
                          <div className="flex items-center justify-between w-full">
                            <span>Previous Arrears (پچھلا بقایا جات)</span>
                            <span className="text-[9px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md font-bold">Arrears</span>
                          </div>
                        }
                      >
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                          <Input
                            type="number"
                            placeholder="0"
                            className="h-11 pl-10 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-black text-xs text-amber-700"
                            value={formData.previousArrears || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, previousArrears: e.target.value }))}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">
                          {detectedProgram === 'bs' 
                            ? "Prior semester dues carried over (S1, S2, etc.)" 
                            : "Previous balance carried forward"}
                        </p>
                      </FormFieldWrapper>

                      <FormFieldWrapper label="Scholarship / Concession Reason">
                        <Select
                          value={formData.concessionReason || "None"}
                          onValueChange={(v) => setFormData(prev => ({ ...prev, concessionReason: v === "None" ? "" : v }))}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-xs">
                            <SelectValue placeholder="Standard Package" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="None">Standard Package (No Discount)</SelectItem>
                            <SelectItem value="Kinship">Kinship (Sibling Discount)</SelectItem>
                            <SelectItem value="Merit / High Marks">Merit / 1000+ Marks Scholarship</SelectItem>
                            <SelectItem value="Teacher Child">Teacher Child Concession</SelectItem>
                            <SelectItem value="Need-based / Orphan">Need-based / Orphan Scholarship</SelectItem>
                            <SelectItem value="Management Discretion">Management Discretion / Special</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormFieldWrapper>
                    </div>
                  </div>

                  {/* Column 2: Package & Billing Strategy */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                    <FormSectionHeader
                      icon={TrendingUp}
                      title="Installment Strategy"
                      sub="Schedule & Dues Bifurcation"
                    />
                    <div className="space-y-4">
                      {/* Big Package Banner */}
                      <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-md relative overflow-hidden">
                        <p className="text-[10px] text-white/60 font-black uppercase tracking-wider">Total Package Finalized</p>
                        <h4 className="text-3xl font-black text-superior-gold tracking-tight mt-1">
                          Rs. {formData.totalPackage.toLocaleString()}
                        </h4>
                        <div className="mt-3 text-[11px] text-white/80 space-y-1 bg-white/10 p-2.5 rounded-xl border border-white/10">
                          <div className="flex justify-between">
                            <span className="text-white/60">Tuition Fee:</span>
                            <span className="font-bold">Rs. {Number(formData.totalFeeFinalized || 0).toLocaleString()}</span>
                          </div>
                          {Number(formData.previousArrears || 0) > 0 && (
                            <div className="flex justify-between text-amber-300 font-bold">
                              <span>Arrears (بقایا جات):</span>
                              <span>Rs. {Number(formData.previousArrears || 0).toLocaleString()}</span>
                            </div>
                          )}
                          {Number(formData.admissionFee || 0) > 0 && (
                            <div className="flex justify-between text-white/60">
                              <span>Admission Fee:</span>
                              <span>Rs. {Number(formData.admissionFee || 0).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <FormFieldWrapper label="Billing Frequency">
                        <Select
                          value={formData.paymentPlan || (detectedProgram === "bs" ? "Semester" : "Installments")}
                          onValueChange={(v: any) => setFormData(prev => ({ ...prev, paymentPlan: v }))}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Semester">Semester System (Per-Semester Payment)</SelectItem>
                            <SelectItem value="Installments">Monthly Installment Plan</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormFieldWrapper>

                      <div className="grid grid-cols-2 gap-3">
                        <FormFieldWrapper label="Installment Count">
                          <Input
                            type="number"
                            className="h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-xs"
                            value={formData.totalInstallments || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, totalInstallments: Number(e.target.value) }))}
                          />
                        </FormFieldWrapper>
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Per Installment</span>
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                            Rs. {formData.totalInstallments > 0
                              ? Math.ceil((formData.totalPackage - Number(formData.feeReceived || 0)) / formData.totalInstallments).toLocaleString()
                              : "0"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Immediate Collection & Confirmation */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4 flex flex-col justify-between">
                    <FormSectionHeader
                      icon={Receipt}
                      title="Collection & Submission"
                      sub="Official Admission Record Confirmation"
                    />

                    <div className="space-y-4">
                      <FormFieldWrapper
                        label="Immediate Cash / Bank Received"
                        required
                        className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800"
                      >
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-xs">Rs.</span>
                          <Input
                            type="number"
                            className="h-11 pl-9 rounded-xl border-emerald-300 bg-white dark:bg-slate-900 text-lg font-black text-emerald-700 dark:text-emerald-300"
                            placeholder="0.00"
                            value={formData.feeReceived || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, feeReceived: e.target.value }))}
                          />
                        </div>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1.5">
                          Triggers official enrollment & ID allotment
                        </p>
                      </FormFieldWrapper>

                      <div className="p-4 rounded-2xl bg-superior-teal/5 border border-superior-teal/15 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-bold uppercase">Remaining Dues</span>
                          <span className="text-xl font-black text-superior-teal">
                            Rs. {Math.max(0, formData.totalPackage - Number(formData.feeReceived || 0)).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Admission Status:</span>
                          <Badge className={Number(formData.feeReceived) > 0 ? "bg-emerald-100 text-emerald-800 text-[10px] font-black" : "bg-slate-200 text-slate-700 text-[10px] font-bold"}>
                            {Number(formData.feeReceived) >= formData.totalPackage && formData.totalPackage > 0
                              ? "FULL PAID"
                              : Number(formData.feeReceived) > 0
                              ? "PARTIAL PAID / ADMITTED"
                              : "PENDING SUBMISSION"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsPreviewOpen(true)}
                        className="w-full h-11 rounded-xl border-superior-gold text-superior-gold hover:bg-superior-gold/10 font-black uppercase tracking-wider text-xs gap-2"
                      >
                        <Eye size={15} /> Preview Official Slip
                      </Button>
                      <Button
                        type="submit"
                        className="w-full h-12 rounded-xl bg-superior-teal hover:bg-superior-teal/90 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-superior-teal/20"
                      >
                        {admission ? "Update Admission Record" : "Finalize & Admit Student"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("subjects")}
                    className="h-11 px-6 rounded-xl font-bold text-xs"
                  >
                    Back to Curriculum
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="h-11 px-6 text-slate-400 hover:text-rose-500 font-bold text-xs"
                  >
                    Discard Changes
                  </Button>
                </div>
              </TabsContent>
            </form>
          </Tabs>
        </div>
      )}

      {/* Form Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 border-none bg-slate-50 rounded-3xl overflow-hidden flex flex-col">
          <AdmissionSlip
            admission={{
              ...formData,
              id: "ST-PREVIEW",
              session: formData.session || selectedSession,
            } as unknown as Admission}
            settings={data.settings}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
