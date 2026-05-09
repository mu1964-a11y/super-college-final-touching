import * as React from "react";
import { useState, useMemo } from "react";
import { useDebounce } from "../hooks/useDebounce";
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
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import FeeReceipt from "./FeeReceipt";
import AdmissionSlip from "./AdmissionSlip";
import { compressImage } from "../lib/imageUtils";

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
  const [sortBy, setSortBy] = useState<string>("date-new");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

  const filteredAdmissions = useMemo(() => {
    return data.admissions
      .filter((a: Admission) => {
        const matchesSearch =
          (a.fullName || "")
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          (a.fatherName || "")
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          (a.studentId &&
            a.studentId.toLowerCase().includes(debouncedSearch.toLowerCase()));
        const matchesFee = feeFilter === "all" || a.status === feeFilter;
        const matchesGender =
          genderFilter === "all" || a.gender === genderFilter;

        let matchesProgram = true;
        if (localProgram && localProgram !== "all") {
          const groupLower = (a.group || "").toLowerCase();
          if (localProgram === "fsc")
            matchesProgram =
              !groupLower.includes("dit") &&
              !groupLower.includes("level 3") &&
              !groupLower.includes("bs ");
          else if (localProgram === "dit")
            matchesProgram = groupLower.includes("dit");
          else if (localProgram === "ukl3")
            matchesProgram = groupLower.includes("level 3");
          else if (localProgram === "bs")
            matchesProgram = groupLower.includes("bs ");
        }

        // Diversion Logic: Only show students who are NOT yet fully admitted (haven't paid initial fee)
        const isFullyEnrolled = a.isAdmitted || a.feeReceived > 0;
        const matchesAdmitted =
          admittedFilter === "all" ||
          (admittedFilter === "Admitted" && isFullyEnrolled) ||
          (admittedFilter === "Prospective" && !isFullyEnrolled);

        return (
          matchesSearch &&
          matchesFee &&
          matchesGender &&
          matchesAdmitted &&
          matchesProgram
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
    data.admissions,
    debouncedSearch,
    feeFilter,
    admittedFilter,
    genderFilter,
    sortBy,
    localProgram,
  ]);

  const summaryStats = useMemo(() => {
    return data.admissions.reduce(
      (acc: any, a: any) => {
        const received = Number(a.feeReceived || 0);
        const total = Number(a.totalPackage || 0);

        if (received >= total && total > 0) {
          acc.fullPaid++;
        } else if (received > 0) {
          acc.partialPaid++;
        } else {
          acc.unpaid++;
        }

        return acc;
      },
      { total: data.admissions.length, fullPaid: 0, partialPaid: 0, unpaid: 0 },
    );
  }, [data.admissions]);

  const programAdmissions = useMemo(() => {
    return data.admissions.filter((a: any) => {
      let matchesProgram = true;
      if (localProgram && localProgram !== "all") {
        const groupLower = (a.group || "").toLowerCase();
        if (localProgram === "fsc")
          matchesProgram =
            !groupLower.includes("dit") &&
            !groupLower.includes("level 3") &&
            !groupLower.includes("bs ");
        else if (localProgram === "dit")
          matchesProgram = groupLower.includes("dit");
        else if (localProgram === "ukl3")
          matchesProgram = groupLower.includes("level 3");
        else if (localProgram === "bs")
          matchesProgram = groupLower.includes("bs ");
      }
      return matchesProgram;
    });
  }, [data.admissions, localProgram]);

  const programStats = useMemo(() => {
    return programAdmissions.reduce(
      (acc: any, a: any) => {
        const received = Number(a.feeReceived || 0);
        const total = Number(a.totalPackage || 0);

        if (received >= total && total > 0) acc.fullPaid++;
        else if (received > 0) acc.partialPaid++;
        else acc.unpaid++;

        const groupLower = (a.group || "").toLowerCase();
        if (localProgram === "fsc") {
          if (
            groupLower.includes("part 2") ||
            groupLower.includes("part ii") ||
            groupLower.includes("part-2") ||
            groupLower.includes("12th")
          ) {
            acc.part2++;
          } else {
            acc.part1++;
          }
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

  const getStatusBadge = (status: AdmissionStatus, isAdmitted: boolean) => {
    if (!isAdmitted)
      return (
        <Badge
          variant="outline"
          className="bg-slate-100 text-slate-500 border-slate-200 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg"
        >
          Pending
        </Badge>
      );

    switch (status) {
      case "Full Paid":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg"
          >
            Full Paid
          </Badge>
        );
      case "Partial Paid":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-600 border-amber-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg"
          >
            Partial Paid
          </Badge>
        );
      case "Not Paid":
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-600 border-rose-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg"
          >
            Unpaid
          </Badge>
        );
      case "Admitted/Confirmed":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-600 border-blue-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg"
          >
            Confirmed
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-500 border-slate-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg"
          >
            {status || "Pending"}
          </Badge>
        );
    }
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

  const handleExportCSV = () => {
    const exportData = filteredAdmissions.map((a) => ({
      "Student ID": a.studentId || "PENDING",
      "Registration #": a.id,
      Name: a.fullName,
      "Father Name": a.fatherName,
      Gender: a.gender,
      DOB: a.dob,
      CNIC: a.cnic,
      Category: a.category,
      "Program/Group": a.group,
      Session: a.session,
      "Total Package": a.totalPackage || "",
      Status: a.status,
    }));

    if (exportData.length === 0) {
      toast.error("No data to export");
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
        `admissions_export_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredAdmissions.map((a) => ({
      "Student ID": a.studentId || "PENDING",
      "Registration #": a.id,
      Name: a.fullName,
      "Father Name": a.fatherName,
      Gender: a.gender,
      DOB: a.dob,
      CNIC: a.cnic,
      Category: a.category,
      "Program/Group": a.group,
      Session: a.session,
      "Total Package": a.totalPackage || "",
      Status: a.status,
    }));

    if (exportData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Admissions");
    XLSX.writeFile(
      wb,
      `admissions_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
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
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-display font-black text-superior-teal tracking-tight">
              Admission Pipeline
            </h2>
            <span className="text-slate-300 text-2xl">/</span>
            <span className="urdu-text text-2xl text-superior-gold font-medium">
              ایڈمیشن پائپ لائن
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
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
                  className="rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-slate-50 transition-all"
                >
                  <MoreHorizontal size={16} className="mr-2 text-slate-400" />
                  Bulk Actions
                </Button>
              }
            />
            <DropdownMenuContent className="w-56 rounded-xl shadow-2xl border-none p-2">
              <DropdownMenuItem
                onClick={handleDownloadFormat}
                className="rounded-lg py-3 cursor-pointer"
              >
                <FileSpreadsheet size={16} className="mr-2 text-emerald-600" />
                Download Format Template
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg py-3 cursor-pointer"
              >
                <Upload size={16} className="mr-2 text-blue-600" />
                Bulk Import Admissions
              </DropdownMenuItem>
              <Separator className="my-2" />
              <DropdownMenuItem
                onClick={handleExportExcel}
                className="rounded-lg py-3 cursor-pointer"
              >
                <Download size={16} className="mr-2 text-emerald-600" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportCSV}
                className="rounded-lg py-3 cursor-pointer"
              >
                <Download size={16} className="mr-2 text-superior-gold" />
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger
              render={
                <button className="h-12 px-8 rounded-xl bg-superior-teal text-white font-black uppercase tracking-widest text-[10px] hover:bg-superior-teal/90 transition-all shadow-xl shadow-superior-teal/10 flex items-center justify-center">
                  <Plus size={18} className="mr-2" /> New Admission
                </button>
              }
            ></DialogTrigger>
            <DialogContent className="max-w-[90vw] w-[90vw] max-h-[92vh] overflow-y-auto rounded-[2.5rem] border-none p-0 shadow-2xl">
              <div className="bg-superior-teal p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-40 -mt-40 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-superior-gold/10 rounded-full blur-2xl" />
                <DialogHeader className="relative z-10">
                  <DialogTitle className="text-4xl font-display font-black tracking-tight uppercase">
                    Student Admission Form
                  </DialogTitle>
                  <p className="text-white/60 text-xs font-black uppercase tracking-[0.3em] mt-2">
                    Session {data?.settings?.academicSession || "2026-28"} ·{" "}
                    {data?.settings?.collegeName || "Jahanian Campus"}
                  </p>
                </DialogHeader>
              </div>
              <div className="p-10">
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

      {/* Group Navigation Tabs */}
      <Tabs
        value={localProgram || "all"}
        onValueChange={(val) => setLocalProgram(val)}
        className="w-full mb-6"
      >
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl w-full flex items-center justify-start overflow-x-auto scrollbar-hide h-auto border border-slate-200/50">
          <TabsTrigger
            value="all"
            className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap"
          >
            All Groups
          </TabsTrigger>
          <TabsTrigger
            value="fsc"
            className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap"
          >
            <School size={15} className="mr-2 inline-block" />
            Inter
          </TabsTrigger>
          <TabsTrigger
            value="dit"
            className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap"
          >
            <GraduationCap size={15} className="mr-2 inline-block" />
            DIT
          </TabsTrigger>
          <TabsTrigger
            value="ukl3"
            className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap"
          >
            <Globe size={15} className="mr-2 inline-block" />
            UKL3
          </TabsTrigger>
          <TabsTrigger
            value="bs"
            className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap"
          >
            <GraduationCap size={15} className="mr-2 inline-block" />
            BS
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4 mb-6">
        <div className="bg-[#053b32] rounded-[1.5rem] p-3 shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-superior-gold/5 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 relative z-10">
            <SummaryCard
              label="Overall Applicant Pipeline"
              value={summaryStats.total}
              active={feeFilter === "all" && admittedFilter === "all"}
              onClick={() => {
                setFeeFilter("all");
                setAdmittedFilter("all");
              }}
              isDark={true}
              hoverColor="hover:bg-white/10 hover:border-white/20"
              iconColor="text-white"
              bgColor="bg-white/10"
              icon={Users}
            />
            <SummaryCard
              label="Overall Full Paid"
              value={summaryStats.fullPaid}
              active={feeFilter === "Full Paid"}
              onClick={() => setFeeFilter("Full Paid")}
              isDark={true}
              hoverColor="hover:bg-emerald-500/20 hover:border-emerald-500/30"
              iconColor="text-emerald-400"
              bgColor="bg-emerald-500/10"
              icon={CheckCircle2}
            />
            <SummaryCard
              label="Overall Partial Paid"
              value={summaryStats.partialPaid}
              active={feeFilter === "Partial Paid"}
              onClick={() => setFeeFilter("Partial Paid")}
              isDark={true}
              hoverColor="hover:bg-amber-500/20 hover:border-amber-500/30"
              iconColor="text-amber-400"
              bgColor="bg-amber-500/10"
              icon={CreditCard}
            />
            <SummaryCard
              label="Overall Unpaid"
              value={summaryStats.unpaid}
              active={feeFilter === "Not Paid"}
              onClick={() => setFeeFilter("Not Paid")}
              isDark={true}
              hoverColor="hover:bg-rose-500/20 hover:border-rose-500/30"
              iconColor="text-rose-400"
              bgColor="bg-rose-500/10"
              icon={AlertCircle}
            />
          </div>
        </div>

        {program && programStats.total > 0 && (
          <>
            <div className="w-full flex justify-center py-1 overflow-visible relative z-0">
              <svg
                viewBox="0 0 1000 10"
                preserveAspectRatio="none"
                className="w-full h-[6px] opacity-90 drop-shadow-md"
              >
                <path
                  d="M 0 5 Q 500 10 1000 5 Q 500 0 0 5 Z"
                  fill="url(#orange-lens)"
                />
                <defs>
                  <linearGradient
                    id="orange-lens"
                    x1="0"
                    y1="0"
                    x2="1000"
                    y2="0"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
                    <stop offset="20%" stopColor="#f97316" stopOpacity="0.6" />
                    <stop offset="50%" stopColor="#ea580c" stopOpacity="1" />
                    <stop offset="80%" stopColor="#f97316" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="bg-[#053b32] rounded-[1.5rem] p-3 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-superior-gold/5 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 relative z-10">
                <SummaryCard
                  label={`${programTitle} Pipeline`}
                  value={programStats.total}
                  subValue={
                    program === "fsc"
                      ? `(P1: ${programStats.part1}, P2: ${programStats.part2})`
                      : program === "ukl3"
                        ? `(DIT: ${programStats.dit}, BS: ${programStats.bs})`
                        : ""
                  }
                  active={false}
                  onClick={() => {}}
                  isDark={true}
                  hoverColor="hover:bg-white/10 hover:border-white/20"
                  iconColor="text-white"
                  bgColor="bg-white/10"
                  icon={Users}
                />
                <SummaryCard
                  label={`${programTitle} Full Paid`}
                  value={programStats.fullPaid}
                  active={false}
                  onClick={() => {}}
                  isDark={true}
                  hoverColor="hover:bg-emerald-500/20 hover:border-emerald-500/30"
                  iconColor="text-emerald-400"
                  bgColor="bg-emerald-500/10"
                  icon={CheckCircle2}
                />
                <SummaryCard
                  label={`${programTitle} Partial Paid`}
                  value={programStats.partialPaid}
                  active={false}
                  onClick={() => {}}
                  isDark={true}
                  hoverColor="hover:bg-amber-500/20 hover:border-amber-500/30"
                  iconColor="text-amber-400"
                  bgColor="bg-amber-500/10"
                  icon={CreditCard}
                />
                <SummaryCard
                  label={`${programTitle} Unpaid`}
                  value={programStats.unpaid}
                  active={false}
                  onClick={() => {}}
                  isDark={true}
                  hoverColor="hover:bg-rose-500/20 hover:border-rose-500/30"
                  iconColor="text-rose-400"
                  bgColor="bg-rose-500/10"
                  icon={AlertCircle}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-5 mb-8 hover:border-superior-teal/20 transition-all duration-500">
        <div className="relative flex-1 min-w-[320px]">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <Input
            placeholder="Search by name, father name or ID..."
            className="pl-12 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-[140px] h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-slate-700">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="Male">Boys Only</SelectItem>
              <SelectItem value="Female">Girls Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={admittedFilter} onValueChange={setAdmittedFilter}>
            <SelectTrigger className="w-[170px] h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-slate-700">
              <SelectValue placeholder="Admission" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              <SelectItem value="all">All Applicants</SelectItem>
              <SelectItem value="Admitted">Admitted Only</SelectItem>
              <SelectItem value="Prospective">Prospective Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={feeFilter} onValueChange={setFeeFilter}>
            <SelectTrigger className="w-[180px] h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-slate-700">
              <SelectValue placeholder="Fee Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Full Paid">Full Paid</SelectItem>
              <SelectItem value="Partial Paid">Partial Paid</SelectItem>
              <SelectItem value="Not Paid">Not Paid</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="h-12 w-12 rounded-xl border-slate-100 bg-slate-50 hover:bg-white transition-all p-0"
          >
            <Filter size={18} className="text-slate-400" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedAdmissions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-4 z-30 flex items-center justify-between p-4 bg-superior-teal rounded-2xl shadow-2xl text-white mb-6 border border-white/10"
        >
          <div className="flex items-center gap-4 pl-2">
            <Checkbox
              checked={selectedAdmissions.length === filteredAdmissions.length}
              onCheckedChange={toggleSelectAll}
              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-superior-teal"
            />
            <div className="flex flex-col">
              <p className="text-sm font-black uppercase tracking-widest">
                {selectedAdmissions.length} record
                {selectedAdmissions.length > 1 ? "s" : ""} selected
              </p>
              {selectedAdmissions.length < filteredAdmissions.length && (
                <button
                  onClick={() =>
                    setSelectedAdmissions(filteredAdmissions.map((a) => a.id))
                  }
                  className="text-[10px] font-black underline uppercase tracking-tighter opacity-70 hover:opacity-100 text-left"
                >
                  Select all {filteredAdmissions.length} matching records
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedAdmissions([])}
              className="h-10 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 font-black text-[10px] uppercase tracking-widest px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              className="h-10 rounded-xl bg-white text-rose-600 hover:bg-rose-50 border-none font-black text-[10px] uppercase tracking-widest px-6 shadow-lg shadow-black/20"
            >
              <Trash2 size={14} className="mr-2" /> Delete All Selected
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
                  <TableCell colSpan={9} className="h-64 text-center">
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
                        "group transition-all border-slate-50 cursor-pointer relative",
                        selectedAdmissions.includes(admission.id)
                          ? "bg-superior-bg-teal"
                          : "hover:bg-slate-50/50",
                        isNew && !admission.isAdmitted
                          ? "bg-red-50/20 border-l-[3px] border-l-red-500 hover:bg-red-50"
                          : "",
                      )}
                    >
                      <TableCell className="pl-8 relative">
                        {isNew && !admission.isAdmitted && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
                        )}
                        <Checkbox
                          checked={selectedAdmissions.includes(admission.id)}
                          onCheckedChange={() =>
                            toggleSelectAdmission(admission.id)
                          }
                          className="rounded-md border-slate-300"
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
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-sm font-black text-superior-teal overflow-hidden border border-slate-200">
                            {admission.photo ? (
                              <img
                                src={admission.photo}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const parent = target.parentElement;
                                  if (parent) {
                                    // Use standard DOM or better yet, just hide it and show nothing
                                    // But for now, let's just make it hidden and let CSS handle default
                                  }
                                }}
                              />
                            ) : (
                              admission.fullName.charAt(0)
                            )}
                          </div>
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
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                              {admission.date}
                            </p>
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
                        {getStatusBadge(admission.status, admission.isAdmitted)}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-10 w-10 rounded-xl hover:bg-white hover:border-slate-200 border border-transparent transition-all flex items-center justify-center text-slate-400 outline-hidden">
                            <MoreHorizontal size={18} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-2xl p-2 min-w-[200px] border-slate-200 shadow-xl"
                          >
                            <DropdownMenuItem
                              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700"
                              onClick={() => {
                                setActiveAdmission(admission);
                                setDialogType("profile");
                              }}
                            >
                              <Eye size={16} className="text-superior-teal" />{" "}
                              View Profile
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
                              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-superior-gold"
                              onClick={() => {
                                setActiveAdmission(admission);
                                setDialogType("receipt");
                              }}
                            >
                              <Receipt size={16} /> Fee Receipt (Bakaya)
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
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-100 pb-8">
          <p className="text-sm font-bold text-slate-500">
            Showing Page {currentPage} of {totalPages}
          </p>
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
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogType === "edit"}
        onOpenChange={(open) => !open && setDialogType(null)}
      >
        <DialogContent className="max-w-[90vw] w-[90vw] max-h-[92vh] overflow-y-auto rounded-[2.5rem] border-none p-0 shadow-2xl">
          <div className="bg-superior-teal p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ScrollText size={120} />
            </div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-4xl font-black uppercase tracking-tight flex items-center gap-4">
                <Edit size={36} className="text-superior-gold" />
                Edit Admission Details
              </DialogTitle>
              <p className="text-superior-gold/80 font-bold uppercase tracking-widest mt-2 flex items-center gap-2 text-sm">
                <Building size={16} />{" "}
                {data?.settings?.collegeName || "Jahanian Campus"}
              </p>
            </DialogHeader>
          </div>
          <div className="p-10">
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
    <DialogContent className="max-w-[90vw] w-[90vw] max-h-[92vh] overflow-y-auto p-6 bg-white rounded-3xl">
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
              <div className="w-28 h-28 rounded-3xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-superior-teal shadow-inner">
                {formData.photo ? (
                  <img
                    src={formData.photo}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-superior-gold/10 text-superior-gold font-bold text-3xl">${formData.fullName.charAt(0)}</div>`;
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
                    {[
                      "Inter Part-1 Boys",
                      "Inter Part-2 Boys",
                      "Inter Part-1 Girls",
                      "Inter Part-2 Girls",
                    ].map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
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
                <Input
                  className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl"
                  value={formData.collegeNo || ""}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, collegeNo: e.target.value }))
                  }
                />
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
  value?: string;
  isFull?: boolean;
}) {
  if (!value || value === '---' || value === 'N/A' || value.trim() === '') return null;
  return (
    <div className={isFull ? "col-span-full" : ""}>
      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-[15px] font-bold text-slate-800 leading-tight">
        {value}
      </p>
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
}: {
  admission: Admission;
  data: any;
  onEdit?: () => void;
  onDownloadReceipt?: () => void;
}) {
  return (
    <div className="w-full bg-slate-50/30 rounded-[3rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50">
      <div className="bg-slate-900 p-10 md:p-14 text-white relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-superior-gold/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-superior-teal/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

        <div className="flex flex-col md:flex-row gap-10 md:gap-14 items-center relative z-10">
          <div className="shrink-0 flex flex-col items-center">
            <div className="w-40 h-40 md:w-56 md:h-56 rounded-[3rem] border-8 border-white/5 bg-white/10 backdrop-blur-xl overflow-hidden shadow-2xl transition-transform hover:scale-105 duration-500">
              {admission.photo ? (
                <img
                  src={admission.photo}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-superior-gold/10 text-superior-gold font-bold text-5xl">${admission.fullName.charAt(0)}</div>`;
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
            <div className="inline-flex items-center gap-2.5 bg-white/10 text-superior-gold border border-white/10 px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-inner">
              <Shield size={16} /> Verified Academic record
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
                value={admission.reference || "N/A"}
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
  const [preSelectionComplete, setPreSelectionComplete] = useState(false);
  const [formData, setFormData] = useState({
    fullName: admission?.fullName || "",
    fatherName: admission?.fatherName || "",
    collegeNo: admission?.collegeNo || "",
    bayFormNo: admission?.bayFormNo || "",
    dob: admission?.dob || "",
    previousClass: admission?.previousClass || "10th",
    boardRollNo: admission?.boardRollNo || "",
    previousMarks: admission?.previousMarks ? String(admission.previousMarks) : "",
    previousInstitute: admission?.previousInstitute || "",
    subjects: admission?.subjects || ([] as string[]),
    address: admission?.address || "",
    admissionFee: admission?.admissionFee ? String(admission.admissionFee) : "",
    miscFunds: admission?.miscFunds ? String(admission.miscFunds) : "",
    totalFeeFinalized: admission?.totalFeeFinalized ? String(admission.totalFeeFinalized) : "", // Tuition Fee
    totalPackage: admission?.totalPackage || 0,
    feeReceived: admission?.feeReceived ? String(admission.feeReceived) : "",
    paymentPlan: admission?.paymentPlan || "Installments",
    paidMonths: admission?.paidMonths || ([] as string[]),
    paidInstallments: admission?.paidInstallments || 0,
    totalInstallments: admission?.totalInstallments || 12,
    nextInstallmentDate: admission?.nextInstallmentDate || "",
    totalSemesters: admission?.totalSemesters || 0,
    feePerSemester: admission?.feePerSemester || 0,
    nextSemesterDueDate: admission?.nextSemesterDueDate || "",
    contactNumber: admission?.contactNumber || "",
    fatherContact: admission?.fatherContact || "",
    secondaryContact: admission?.secondaryContact || "",
    email: admission?.email || "",
    bloodGroup: admission?.bloodGroup || "",
    reference: admission?.reference || "",
    gender: admission?.gender || "Male",
    category: admission?.category || "Inter Part-1 Boys",
    group: admission?.group || "",
    section: admission?.section || "",
    photo: admission?.photo || "",
    studentId: admission?.studentId || "",
    status: admission?.status || "Prospective",
    session: admission?.session || "",
    sessionStartDate: admission?.sessionStartDate || "",
    sessionEndDate: admission?.sessionEndDate || "",
    academicPart: admission?.academicPart || "Part-1",
    programType: admission?.programType || "Yearly",
    currentSemester: admission?.currentSemester || 0,
  });

  // Sync form data when admission changes to prevent data leak
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
      });
    }
  }, [admission, admission?.id]);

  // Auto-calculate Total Package
  React.useEffect(() => {
    const total =
      Number(formData.admissionFee || 0) +
      Number(formData.miscFunds || 0) +
      Number(formData.totalFeeFinalized || 0);
    setFormData((prev) => ({ ...prev, totalPackage: total }));
  }, [formData.admissionFee, formData.miscFunds, formData.totalFeeFinalized]);

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

  const categories = React.useMemo(() => {
    let result = [
      "Inter Part-1 Boys",
      "Inter Part-2 Boys",
      "Inter Part-1 Girls",
      "Inter Part-2 Girls",
    ];
    if (program === "dit") result = ["DIT Boys", "DIT Girls"];
    if (program === "ukl3") result = ["UK L3 Boys", "UK L3 Girls"];
    if (program === "bs") result = ["BS Boys", "BS Girls"];

    // Ensure the default category is valid for the current program
    setFormData((prev) => {
      if (!result.includes(prev.category)) {
        return { ...prev, category: result[0] };
      }
      return prev;
    });

    return result;
  }, [program]);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const previewRef = React.useRef<HTMLDivElement>(null);

  const filteredSections = React.useMemo(() => {
    if (!data.settings?.predefinedSections) return [];

    return data.settings.predefinedSections.filter((sec) => {
      // 1. Gender Match (Male/Female/Co-ed)
      const matchesGender =
        sec.gender === formData.gender || sec.gender === "Co-ed";
      if (!matchesGender) return false;

      // 2. Program Match
      if (!program || program === "all") return true;

      const p = program.toLowerCase();
      const sp = sec.program.toLowerCase();

      if (p === "fsc" && sp === "inter") return true;
      if (p === sp) return true;
      if (p === "ukl3" && sp === "uk level 3") return true;
      if (p === "bs" && sp === "bs program") return true;

      return false;
    });
  }, [data.settings?.predefinedSections, formData.gender, program]);

  const filteredGroups = React.useMemo(
    () =>
      ACADEMIC_GROUPS.filter((g) => {
        if (!program) return true;
        const name = g.name.toLowerCase();
        if (program === "fsc")
          return (
            !name.includes("dit") &&
            !name.includes("uk") &&
            !name.includes("level 3") &&
            !name.includes("bs ")
          );
        if (program === "dit") return name.includes("dit");
        if (program === "ukl3")
          return name.includes("uk") || name.includes("level 3");
        if (program === "bs") return name.includes("bs ");
        return true;
      }),
    [program],
  );

  const filteredSubjects = React.useMemo(
    () =>
      SUBJECTS.filter((s: string) => {
        if (COMPULSORY_SUBJECTS.includes(s)) return false; // Handled separately
        if (!program) return true;
        const name = s.toLowerCase();
        if (program === "fsc")
          return (
            !name.includes("dit") &&
            !name.includes("uk") &&
            !name.includes("level 3") &&
            !name.includes("bs ")
          );
        if (program === "dit") return name.includes("dit");
        if (program === "ukl3")
          return name.includes("uk") || name.includes("level 3");
        if (program === "bs") return name.includes("bs ");
        return true;
      }),
    [program],
  );

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

  const handlePrint = async () => {
    if (!previewRef.current) return;

    const toastId = toast.loading("Preparing Admission Form PDF...");
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        includeQueryParams: true,
        style: {
          margin: "0",
          padding: "0",
        },
      });

      const imgProps = new Image();
      imgProps.src = dataUrl;
      await new Promise((resolve) => {
        imgProps.onload = resolve;
      });

      const pdfWidth = 210;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      const pdf = new jsPDF("p", "mm", [pdfWidth, Math.max(297, pdfHeight)]);

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Admission-Form-${formData.fullName || "Student"}.pdf`);
      toast.dismiss(toastId);
      toast.success("Admission Form downloaded successfully!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.dismiss(toastId);
      toast.error("Failed to generate PDF. Use high-speed internet.");
    }
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
      gender: formData.gender,
      photo: formData.photo || "",
      status: formData.status || status,
      isAdmitted: formData.status === "Admitted/Confirmed" || received > 0,
      session:
        formData.session || selectedSession || data.settings?.academicSession,
      sessionStartDate: formData.sessionStartDate,
      sessionEndDate: formData.sessionEndDate,
      academicPart: formData.academicPart || "Part-1",
    };

    data.addAdmission(newAdmission);

    if (received > 0) {
      data.recordFeePayment(newAdmission.id, {
        id: `pay-${Date.now()}`,
        month: new Date().toLocaleString('en-US', { month: 'long' }),
        year: new Date().getFullYear(),
        amountDue: totalPkg,
        amountPaid: received,
        status: 'Paid',
        datePaid: new Date().toISOString(),
        receiptId: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
        feeType: 'Admission / Initial Fee',
        paymentMethod: 'Cash',
        collectedBy: 'System'
      }, formData.fullName || 'New Student');
    }

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

  const downloadPreview = async () => {
    if (previewRef.current === null) return;

    const toastId = toast.loading("Rendering A4 Admission Form...");
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        includeQueryParams: true,
        style: {
          margin: "0",
          padding: "0",
        },
      });

      const imgProps = new Image();
      imgProps.src = dataUrl;
      await new Promise((resolve) => {
        imgProps.onload = resolve;
      });

      const pdfWidth = 210;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      const pdf = new jsPDF("p", "mm", [pdfWidth, Math.max(297, pdfHeight)]);

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Admission-Form-${formData.fullName || "Student"}.pdf`);
      toast.dismiss(toastId);
      toast.success("Admission Form downloaded as PDF!");
    } catch (err) {
      console.error("Error downloading preview:", err);
      toast.dismiss(toastId);
      toast.error("Failed to download PDF");
    }
  };

  return (
    <div className="space-y-6">
      {!preSelectionComplete ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-tight">
              Admission Category Setup
            </h2>
            <p className="text-slate-500 font-medium">
              Please finalize the student's program categorization before
              proceeding to the full admission form. This ensures accurate
              record management and section placement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {/* Gender Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                  <Users size={20} />
                </div>
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  1. Select Gender
                </Label>
              </div>
              <Select
                value={formData.gender || ""}
                onValueChange={(v) => {
                  setFormData(prev => ({ ...prev, gender: v as Gender,
                    section: undefined as any })); // reset section to undefined on gender change
                }}
              >
                <SelectTrigger className="h-20 rounded-3xl border-2 border-slate-100 bg-white shadow-sm p-6 focus:ring-superior-teal/20 focus:border-superior-teal/30">
                  <SelectValue placeholder="Choose Gender" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl p-2">
                  {["Male", "Female"].map((g) => (
                    <SelectItem
                      key={g}
                      value={g}
                      className="rounded-xl py-3 font-bold text-slate-900 focus:bg-superior-teal/5"
                    >
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Academic Group */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
                  <GraduationCap size={20} />
                </div>
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  2. Academic Group
                </Label>
              </div>
              <Select
                value={formData.group || ""}
                onValueChange={handleGroupChange}
              >
                <SelectTrigger className="h-20 rounded-3xl border-2 border-slate-100 bg-white shadow-sm p-6 focus:ring-superior-teal/20 focus:border-superior-teal/30 text-left">
                  <SelectValue placeholder="Choose Program Group" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl p-2 min-w-[max-content] w-max">
                  {filteredGroups.map((group) => (
                    <SelectItem
                      key={group.name}
                      value={group.name}
                      className="rounded-xl py-3 focus:bg-superior-teal/5 min-w-[300px]"
                    >
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-slate-900 whitespace-normal">
                          {group.name}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-black">
                          {group.type}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category / Subjects Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                  <Layers size={20} />
                </div>
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  3. Class Category
                </Label>
              </div>
              <Select
                value={formData.category || ""}
                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger className="h-20 rounded-3xl border-2 border-slate-100 bg-white shadow-sm p-6 focus:ring-superior-teal/20">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl p-2">
                  {categories.map((cat) => (
                    <SelectItem
                      key={cat}
                      value={cat}
                      className="rounded-xl py-3"
                    >
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
                  <School size={20} />
                </div>
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  4. Section
                </Label>
              </div>
              <Select
                key={`section-select-${formData.gender}`}
                value={formData.section || ""}
                onValueChange={(v) => {
                  const sectionObj = (
                    data?.settings?.predefinedSections || []
                  ).find((s: any) => s.name === v);
                  const newSession =
                    sectionObj?.class ||
                    formData.session ||
                    data?.settings?.academicSession ||
                    "2026-28";
                  setFormData(prev => ({ ...prev, section: v, session: newSession }));
                }}
              >
                <SelectTrigger className="h-20 rounded-3xl border-2 border-slate-100 bg-white shadow-sm p-6 focus:ring-superior-teal/20">
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl p-2 max-h-[300px]">
                  {(data?.settings?.predefinedSections || [])
                    .filter((s: any) => s.gender === formData.gender)
                    .map((sec: any) => (
                      <SelectItem
                        key={sec.id}
                        value={sec.name}
                        className="rounded-xl py-3"
                      >
                        {sec.name}
                      </SelectItem>
                    ))}
                  <SelectItem
                    value="Other / Manual"
                    className="rounded-xl py-3"
                  >
                    Other / Manual
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subjects Selection (If Group Selected) */}
          {formData.group && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                    <CheckCircle2 size={20} />
                  </div>
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    4. Review Elective Subjects
                  </Label>
                </div>
                <Badge
                  variant="outline"
                  className="border-slate-200 text-slate-400 text-[9px] uppercase tracking-widest font-black"
                >
                  Based on {formData.group}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filteredSubjects.map((s: string) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    className={cn(
                      "h-14 rounded-2xl border transition-all text-xs font-bold uppercase tracking-tight flex items-center px-4 gap-3",
                      formData.subjects.includes(s)
                        ? "bg-superior-teal/5 border-superior-teal/50 text-superior-teal"
                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200",
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center transition-colors",
                        formData.subjects.includes(s)
                          ? "bg-superior-teal border-superior-teal"
                          : "border-slate-300",
                      )}
                    >
                      {formData.subjects.includes(s) && (
                        <Plus
                          size={12}
                          className="text-white transform rotate-45"
                        />
                      )}
                    </div>
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <div className="flex justify-center pt-6">
            <Button
              disabled={!formData.group || !formData.gender}
              onClick={() => {
                setPreSelectionComplete(true);
                toast.success(
                  "Categorization confirmed. Loading admission details...",
                );
              }}
              className="h-20 px-16 rounded-3xl bg-superior-teal text-white font-black uppercase tracking-widest text-lg hover:bg-superior-teal/90 transition-all shadow-2xl shadow-superior-teal/20 flex items-center justify-center gap-4 group"
            >
              Continue to Admission Form
              <ArrowRight
                size={24}
                className="group-hover:translate-x-2 transition-transform"
              />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 w-full mb-8">
              <TabsTrigger value="student" className="text-sm font-bold">
                1. Student Details
              </TabsTrigger>
              <TabsTrigger value="subjects" className="text-sm font-bold">
                2. Subjects & Group
              </TabsTrigger>
              <TabsTrigger value="fees" className="text-sm font-bold">
                3. Fee Details
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-6 min-h-[400px]">
              <TabsContent
                value="student"
                className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500"
              >
                {/* Identity Banner */}
                <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 flex flex-col md:flex-row items-center gap-8">
                  <div className="relative group shrink-0">
                    <div className="w-36 h-36 rounded-[2.5rem] border-4 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-superior-teal/50 group-hover:bg-superior-teal/[0.02]">
                      {formData.photo ? (
                        <img
                          src={formData.photo}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          <Camera className="text-slate-200 mb-2" size={36} />
                          <span className="text-[9px] text-slate-400 font-black uppercase text-center px-4 leading-tight">
                            Student
                            <br />
                            Photograph
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
                    {formData.photo && (
                      <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl border-4 border-white shadow-lg">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3 text-center md:text-left">
                    <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
                      Candidate Profile
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                      Registering candidate for{" "}
                      <span className="font-bold text-superior-teal">
                        {program?.toUpperCase() || "General Admission"}
                      </span>
                      . Please ensure all names match official documents.
                    </p>
                    {formData.studentId && (
                      <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">
                          Enrollment ID: {formData.studentId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <FormSectionHeader
                      icon={User}
                      title="Primary Identity"
                      sub="Full legal documentation"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormFieldWrapper label="Full Name" required>
                        <Input
                          placeholder="Full Name"
                          className="h-12 border-slate-200 rounded-xl focus:border-superior-teal/30"
                          value={formData.fullName || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, fullName: e.target.value, }))
                          }
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Father's Name" required>
                        <Input
                          placeholder="Father's Name"
                          className="h-12 border-slate-200 rounded-xl focus:border-superior-teal/30"
                          value={formData.fatherName || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, fatherName: e.target.value, }))
                          }
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Date of Birth">
                        <Input
                          type="date"
                          className="h-12 border-slate-200 rounded-xl"
                          value={formData.dob || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, dob: e.target.value }))
                          }
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="B-Form / CNIC">
                        <Input
                          placeholder="38403-xxxxxxx-x"
                          className="h-12 border-slate-200 rounded-xl"
                          value={formData.bayFormNo || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, bayFormNo: e.target.value, }))
                          }
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Gender">
                        <Select
                          disabled
                          value={formData.gender || ""}
                          onValueChange={(v: any) =>
                            setFormData(prev => ({ ...prev, gender: v }))
                          }
                        >
                          <SelectTrigger className="h-12 border-slate-200 rounded-xl bg-slate-50 cursor-not-allowed">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Blood Group">
                        <Select
                          value={formData.bloodGroup || ""}
                          onValueChange={(v) =>
                            setFormData(prev => ({ ...prev, bloodGroup: v }))
                          }
                        >
                          <SelectTrigger className="h-12 border-slate-200 rounded-xl">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              "A+",
                              "A-",
                              "B+",
                              "B-",
                              "O+",
                              "O-",
                              "AB+",
                              "AB-",
                            ].map((bg) => (
                              <SelectItem key={bg} value={bg}>
                                {bg}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormFieldWrapper>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <FormSectionHeader
                      icon={CreditCard}
                      title="Communication"
                      sub="Emergency Contacts"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormFieldWrapper label="Student Contact" required>
                        <Input
                          className="h-12 border-slate-200 rounded-xl"
                          placeholder="03xx-xxxxxxx"
                          value={formData.contactNumber || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, contactNumber: e.target.value, }))
                          }
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Guardian Contact" required>
                        <Input
                          className="h-12 border-slate-200 rounded-xl"
                          placeholder="03xx-xxxxxxx"
                          value={formData.fatherContact || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, fatherContact: e.target.value, }))
                          }
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Email Address">
                        <Input
                          className="h-12 border-slate-200 rounded-xl"
                          placeholder="student@example.com"
                          value={formData.email || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, email: e.target.value }))
                          }
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Reference">
                        <Input
                          className="h-12 border-slate-200 rounded-xl"
                          placeholder="Who referred?"
                          value={formData.reference || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, reference: e.target.value, }))
                          }
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper
                        label="Address"
                        className="md:col-span-2"
                      >
                        <Textarea
                          placeholder="Full Residential Address"
                          className="rounded-2xl border-slate-200 resize-none min-h-[90px] p-4"
                          value={formData.address || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, address: e.target.value, }))
                          }
                        />
                      </FormFieldWrapper>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => setActiveTab("subjects")}
                    className="h-14 px-10 bg-superior-teal text-white hover:bg-superior-teal/90 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-superior-teal/20"
                  >
                    Continue to Academic History
                  </Button>
                </div>
              </TabsContent>

              <TabsContent
                value="subjects"
                className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Academic History */}
                  <div className="space-y-8 group">
                    <FormSectionHeader
                      icon={Search}
                      title="Academic History"
                      sub="Previous Record (SSC)"
                    />
                    <div className="grid grid-cols-1 gap-6 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 group-hover:border-superior-teal/30 transition-colors">
                      <FormFieldWrapper label="SSC Board Roll #">
                        <Input
                          placeholder="Registration #"
                          className="h-12 rounded-xl border-slate-200 bg-white"
                          value={formData.boardRollNo || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, boardRollNo: e.target.value, }))
                          }
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="SSC Obtained Marks">
                        <Input
                          type="number"
                          placeholder="Obtained Marks"
                          className="h-12 rounded-xl border-slate-200 bg-white"
                          value={formData.previousMarks || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, previousMarks: e.target.value, }))
                          }
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Previous Institute">
                        <Input
                          placeholder="Enter school/college name"
                          className="h-12 rounded-xl border-slate-200 bg-white"
                          value={formData.previousInstitute || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, previousInstitute: e.target.value, }))
                          }
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Previous Class">
                        <Select
                          value={formData.previousClass || ""}
                          onValueChange={(v: any) =>
                            setFormData(prev => ({ ...prev, previousClass: v }))
                          }
                        >
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="9th">9th Class</SelectItem>
                            <SelectItem value="10th">10th Class</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormFieldWrapper>
                    </div>
                  </div>

                  {/* Course Selection */}
                  <div className="space-y-8 group">
                    <FormSectionHeader
                      icon={GraduationCap}
                      title="Academic Placement"
                      sub="Internal Program Entry"
                    />
                    <div className="grid grid-cols-1 gap-6 p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 group-hover:border-superior-teal/30 transition-colors">
                      <FormFieldWrapper label="Academic Group" required>
                        <Select
                          value={formData.group || ""}
                          disabled
                          onValueChange={handleGroupChange}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 font-bold bg-slate-50 cursor-not-allowed shadow-sm focus:ring-superior-teal">
                            <SelectValue placeholder="Assign Group" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {filteredGroups.map((g) => (
                              <SelectItem key={g.name} value={g.name}>
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormFieldWrapper>
                      <FormFieldWrapper label="College Roll #">
                        <Input
                          placeholder="Assign Roll #"
                          className="h-12 rounded-xl border-slate-200 bg-white"
                          value={formData.collegeNo || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, collegeNo: e.target.value, }))
                          }
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Assigned Section" required>
                        <Select
                          value={formData.section || ""}
                          disabled
                          onValueChange={(v) => {
                            const sectionObj = filteredSections.find(
                              (sec) => sec.name === v,
                            );
                            const newFormData = { ...formData, section: v };
                            if (sectionObj && sectionObj.class) {
                              newFormData.session = sectionObj.class;
                            }
                            setFormData(newFormData);
                          }}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 cursor-not-allowed">
                            <SelectValue placeholder="Choose Section" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredSections.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No sections configured for this gender/program
                              </SelectItem>
                            ) : (
                              filteredSections.map((sec) => (
                                <SelectItem key={sec.id} value={sec.name}>
                                  {sec.name} ({sec.class})
                                </SelectItem>
                              ))
                            )}
                            <SelectItem value="Other / Manual">
                              Other / Manual
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormFieldWrapper>
                      {formData.section === "Other / Manual" && (
                        <FormFieldWrapper label="Manual Section Name">
                          <Input
                            placeholder="e.g. Med-1"
                            className="h-12 rounded-xl border-slate-200 bg-white"
                            onChange={(e) =>
                              setFormData(prev => ({ ...prev, section: e.target.value.toUpperCase(), }))
                            }
                          />
                        </FormFieldWrapper>
                      )}
                      <FormFieldWrapper label="Academic Session" required>
                        <Select
                          value={formData.session || ""}
                          disabled
                          onValueChange={(v: any) =>
                            setFormData(prev => ({ ...prev, session: v }))
                          }
                        >
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 cursor-not-allowed shadow-sm">
                            <SelectValue placeholder="Choose Session" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2023-2025">2023-2025</SelectItem>
                            <SelectItem value="2024-2026">2024-2026</SelectItem>
                            <SelectItem value="2025-2027">2025-2027</SelectItem>
                            <SelectItem value="2026-28">2026-28</SelectItem>
                            <SelectItem value="2027-2029">2027-2029</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormFieldWrapper>
                    </div>
                  </div>

                  {/* Subject Selection Area */}
                  <div className="space-y-8 group">
                    <FormSectionHeader
                      icon={Layers}
                      title="Course Subjects"
                      sub="Elective & Compulsory"
                    />
                    <div className="p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 group-hover:border-superior-teal/30 transition-colors h-full max-h-[500px] overflow-y-auto">
                      {!formData.group ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                            <Layers size={32} />
                          </div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                            Select an Academic Group
                            <br />
                            to show subjects
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Compulsory Subjects
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {COMPULSORY_SUBJECTS.map((s) => (
                                <Badge
                                  key={s}
                                  variant="outline"
                                  className="bg-white border-slate-200 text-slate-500 font-bold px-3 py-1.5 rounded-lg capitalize"
                                >
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Selected Electives
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                              {filteredSubjects.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => toggleSubject(s)}
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left",
                                    formData.subjects.includes(s)
                                      ? "bg-superior-teal/5 border-superior-teal text-superior-teal"
                                      : "bg-white border-slate-100 text-slate-500 hover:border-slate-200",
                                  )}
                                >
                                  <span className="text-xs font-black uppercase tracking-tight">
                                    {s}
                                  </span>
                                  {formData.subjects.includes(s) && (
                                    <CheckCircle2 size={14} />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-8 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveTab("student")}
                    className="h-14 px-8 font-bold text-slate-400"
                  >
                    Back to profile
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("fees")}
                    className="h-14 px-10 bg-slate-800 text-white hover:bg-slate-900 rounded-2xl font-black uppercase tracking-widest text-[11px] group"
                  >
                    Continue to Financials
                    <ArrowRight
                      size={18}
                      className="ml-2 group-hover:translate-x-1 transition-transform"
                    />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent
                value="fees"
                className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left side: Financial Structure */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-superior-teal/10 flex items-center justify-center text-superior-teal">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                          Financial Structure
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          Setup total package and payment plan
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100">
                      <div className="space-y-6">
                        <FormFieldWrapper label="Admission Fee" required>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                              Rs.
                            </span>
                            <Input
                              type="number"
                              className="h-14 pl-12 rounded-2xl border-slate-200 bg-white font-black"
                              value={formData.admissionFee || ""}
                              onChange={(e) =>
                                setFormData(prev => ({ ...prev, admissionFee: e.target.value, }))
                              }
                            />
                          </div>
                        </FormFieldWrapper>
                        <FormFieldWrapper
                          label="Tuition Fee (Finalized)"
                          required
                        >
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                              Rs.
                            </span>
                            <Input
                              type="number"
                              className="h-14 pl-12 rounded-2xl border-slate-200 bg-white font-black text-lg focus:border-superior-teal"
                              value={formData.totalFeeFinalized || ""}
                              onChange={(e) =>
                                setFormData(prev => ({ ...prev, totalFeeFinalized: e.target.value, }))
                              }
                            />
                          </div>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Miscellaneous Funds">
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                              Rs.
                            </span>
                            <Input
                              type="number"
                              className="h-14 pl-12 rounded-2xl border-slate-200 bg-white font-black"
                              value={formData.miscFunds || ""}
                              onChange={(e) =>
                                setFormData(prev => ({ ...prev, miscFunds: e.target.value, }))
                              }
                            />
                          </div>
                        </FormFieldWrapper>
                      </div>

                      <div className="space-y-6">
                        <div className="p-8 rounded-[2rem] bg-slate-900 text-white shadow-xl relative overflow-hidden">
                          <p className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-1">
                            Total Package
                          </p>
                          <h4 className="text-4xl font-black text-superior-gold tracking-tighter">
                            Rs. {formData.totalPackage.toLocaleString()}
                          </h4>
                          <div className="mt-6 flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                            <TrendingUp
                              size={14}
                              className="text-emerald-400"
                            />
                            <span className="text-[10px] font-bold text-white/60 uppercase">
                              Auto-calculating installments
                            </span>
                          </div>
                        </div>

                        <FormFieldWrapper
                          label="Immediate Payment (Received)"
                          required
                          className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100"
                        >
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300 font-bold text-sm">
                              Rs.
                            </span>
                            <Input
                              type="number"
                              className="h-14 pl-12 rounded-2xl border-emerald-200 bg-white text-xl font-black text-emerald-700"
                              placeholder="0.00"
                              value={formData.feeReceived || ""}
                              onChange={(e) =>
                                setFormData(prev => ({ ...prev, feeReceived: e.target.value, }))
                              }
                            />
                          </div>
                          <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider mt-3 px-1">
                            Triggers Enrollment & ID Allotment
                          </p>
                        </FormFieldWrapper>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Billing Strategy */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                          Installment Plan
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          Bifurcation of remaining dues
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm">
                      <FormFieldWrapper label="Billing Frequency">
                        <Select
                          value={formData.paymentPlan || ""}
                          onValueChange={(v: any) =>
                            setFormData(prev => ({ ...prev, paymentPlan: v }))
                          }
                        >
                          <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Installments">
                              Monthly Installments
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Total Count">
                        <Input
                          type="number"
                          className="h-14 rounded-2xl border-slate-200 font-bold"
                          value={formData.totalInstallments || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, totalInstallments: Number(e.target.value), }))
                          }
                        />
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2 px-1">
                          Dividing Rs.{" "}
                          {(
                            formData.totalPackage -
                            Number(formData.feeReceived || 0)
                          ).toLocaleString()}{" "}
                          into {formData.totalInstallments} parts.
                        </p>
                      </FormFieldWrapper>

                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-superior-teal/10 flex items-center justify-center text-superior-teal">
                          <AlertTriangle size={24} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">
                            Per Installment
                          </p>
                          <h4 className="text-2xl font-black text-slate-800">
                            Rs.{" "}
                            {formData.totalInstallments > 0
                              ? Math.ceil(
                                  (formData.totalPackage -
                                    Number(formData.feeReceived || 0)) /
                                    formData.totalInstallments,
                                ).toLocaleString()
                              : "0"}
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {formData.paymentPlan === "Semester" && (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>Total Semesters</Label>
                        <Input
                          type="number"
                          value={formData.totalSemesters || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, totalSemesters: Number(e.target.value), }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fee Per Semester</Label>
                        <Input
                          type="number"
                          value={formData.feePerSemester || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, feePerSemester: Number(e.target.value), }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Next Semester Due Date</Label>
                        <Input
                          type="date"
                          value={formData.nextSemesterDueDate || ""}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, nextSemesterDueDate: e.target.value, }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 bg-superior-teal/5 rounded-2xl border border-superior-teal/10">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">
                        Remaining Balance
                      </p>
                      <p className="text-3xl font-bold text-superior-teal">
                        Rs.{" "}
                        {(
                          Number(formData.totalPackage || 0) -
                          Number(formData.feeReceived || 0)
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">
                        Admission Status
                      </p>
                      <Badge
                        className={
                          Number(formData.feeReceived) > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }
                      >
                        {Number(formData.feeReceived) > 0
                          ? "ADMITTED"
                          : "PENDING"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    placeholder="Enter reference if any"
                    value={formData.reference}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, reference: e.target.value }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between pt-10 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPreSelectionComplete(false)}
                    className="font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-rose-500 h-10 px-6 underline underline-offset-4 transition-colors"
                  >
                    Reset Categorization
                  </Button>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (activeTab === "fees") setActiveTab("subjects");
                        else if (activeTab === "subjects")
                          setActiveTab("student");
                      }}
                      disabled={activeTab === "student"}
                      className="rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 px-6"
                    >
                      Back
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 px-8"
                      >
                        Discard
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsPreviewOpen(true)}
                        className="rounded-xl border-superior-gold text-superior-gold font-black uppercase tracking-widest text-[10px] h-12 px-8 flex items-center gap-2 hover:bg-superior-gold/10"
                      >
                        <Eye size={16} /> Preview Form
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-xl bg-superior-teal text-white font-black uppercase tracking-widest text-[10px] h-12 px-12 hover:bg-superior-teal/90 shadow-lg shadow-superior-teal/10 transition-all font-black"
                      >
                        {admission ? "Update Finalized Record" : "Finalize & Submit Record"}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </form>
          </Tabs>
        </>
      )}

      {/* Form Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 border-none bg-slate-50 rounded-3xl overflow-hidden flex flex-col">
          <AdmissionSlip
            admission={{
              ...formData,
              id: "ST-PREVIEW",
              session: selectedSession,
            } as unknown as Admission}
            settings={data.settings}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
