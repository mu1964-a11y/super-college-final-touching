import React, { useMemo } from "react";
import {
  CreditCard,
  Search,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Users,
  AlertCircle,
  Clock,
  MoreHorizontal,
  CheckCircle2,
  Plus,
  School,
  GraduationCap,
  Globe,
  Building,
  Building2,
  Eye,
  MessageSquare,
  FileText,
  Receipt,
} from "lucide-react";
import { motion } from "motion/react";
import StudentDossier360 from "./StudentDossier360";
import BankChallanModal from "./BankChallanModal";
import { getDocumentLink, sendAutoFeeReceiptNotice, buildFeeReminderMessage } from "../lib/whatsappAutomation";
import WhatsAppReportModal, { ReportRecipientItem } from "./WhatsAppReportModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { Gender } from "../types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { safeLocalStorage } from "../utils/safeStorage";

import { getUnifiedTransactions } from "../utils/fee";
import { useDebounce } from "../hooks/useDebounce";
import { calculateStudentFeeBreakdown } from "../lib/feeCalculations";
import { matchesEducationalStream, matchesCohortStage } from "../lib/academicMasterData";
import { supabase } from "../lib/supabase";


export default function FeeManagementView({
  data,
  gender,
  program,
}: {
  data: any;
  gender?: Gender;
  program?: string;
}) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [genderFilter, setGenderFilter] = React.useState<string>(
    gender || "all",
  );
  const [groupFilter, setGroupFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [activeTab, setActiveTab] = React.useState("collect");
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState<string>("");
  const [paymentType, setPaymentType] = React.useState<string>(
    "Tuition Fee Installment",
  );
  const [paymentMethod, setPaymentMethod] = React.useState<"Cash" | "Bank Transfer">("Cash");
  const [paymentDate, setPaymentDate] = React.useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [collectedByName, setCollectedByName] = React.useState<string>("");
  const [newFeePackage, setNewFeePackage] = React.useState<string>("");
  const [activeRowStudent, setActiveRowStudent] = React.useState<any>(null);
  const [dossierStudent, setDossierStudent] = React.useState<any | null>(null);
  const [sendingNoticeId, setSendingNoticeId] = React.useState<string | null>(null);
  const [challanStudents, setChallanStudents] = React.useState<any[] | null>(null);
  const [isChallanModalOpen, setIsChallanModalOpen] = React.useState(false);

  const [isBulkFeeModalOpen, setIsBulkFeeModalOpen] = React.useState(false);
  const [bulkFeeModalProps, setBulkFeeModalProps] = React.useState<{
    title: string;
    subtitle?: string;
    items: ReportRecipientItem[];
  }>({ title: "", subtitle: "", items: [] });

  const [stageFilter, setStageFilter] = React.useState<string>("all");
  const [isAncillaryModalOpen, setIsAncillaryModalOpen] = React.useState(false);
  const [ancillaryForm, setAncillaryForm] = React.useState({
    title: "BISE Multan Board Examination Fee",
    amount: "4200",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    targetProgram: "all",
    targetStage: "all",
    targetSection: "all",
  });
  const [includeAncillaryInPayment, setIncludeAncillaryInPayment] = React.useState(false);
  const [isApplyingAncillary, setIsApplyingAncillary] = React.useState(false);

  const isNewStudent = React.useCallback((student: any): boolean => {
    const ts = student?.createdAt || student?.created_at;
    if (!ts) return false;
    const createdTime = new Date(ts).getTime();
    if (isNaN(createdTime)) return false;
    const diffHours = (Date.now() - createdTime) / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours < 12;
  }, []);

  const handleOpenBulkFeeRemindersModal = () => {
    const defaulters = filteredStudents.filter((s: any) => {
      const bal = (s.totalPackage || 0) - (s.feeReceived || 0);
      return bal > 0;
    });
    if (defaulters.length === 0) {
      toast.error("No fee defaulters found matching current filters.");
      return;
    }
    const items: ReportRecipientItem[] = defaulters.map((s: any) => {
      const balance = (s.totalPackage || 0) - (s.feeReceived || 0);
      const msg = buildFeeReminderMessage(s, balance, data?.settings);
      const rollNo = s.collegeNo || s.studentId || s.id || "N/A";
      return {
        id: s.id,
        student: { ...s, balance },
        name: s.fullName,
        phone: s.contact || s.fatherContact || s.phone || s.mobile || "",
        rollNo,
        className: `${s.group || ""} (Sec: ${s.section || "A"})`,
        message: msg,
        statusBadge: `Rs. ${balance.toLocaleString()}`,
        isFailed: balance >= 20000,
      };
    });
    setBulkFeeModalProps({
      title: "Broadcast Fee Due Reminders",
      subtitle: `Target: ${items.length} Defaulters (${genderFilter === "all" ? "All Campuses" : genderFilter === "Male" ? "Boys Campus" : "Girls Campus"}, Sec: ${sectionFilter})`,
      items,
    });
    setIsBulkFeeModalOpen(true);
  };

  const handleQuickWhatsAppNotice = async (student: any, balance: number) => {
    const rawPhone = student.contact || student.fatherContact || student.phone || student.mobile;
    if (!rawPhone) {
      toast.error(`No contact number registered for ${student.fullName || "this student"}.`);
      return;
    }

    const cleanPhone = rawPhone.replace(/\D/g, "");
    const msg = buildFeeReminderMessage(student, balance, data?.settings);

    try {
      setSendingNoticeId(student.id);
      toast.loading(`Sending fee reminder to +${cleanPhone}...`, { id: "fee-wa" });
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, message: msg }),
      });

      if (res.ok) {
        toast.success(`Fee notice sent via WhatsApp to +${cleanPhone}!`, { id: "fee-wa" });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.info(err.error || "Gateway offline. Opening WhatsApp Web...", { id: "fee-wa" });
        window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, "_blank");
      }
    } catch {
      window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, "_blank");
      toast.dismiss("fee-wa");
    } finally {
      setSendingNoticeId(null);
    }
  };

  const parentRef = React.useRef<HTMLDivElement>(null);

  // 1. Calculate All Enrolled Students (Boys + Girls)
  const allEnrolled = useMemo(() => {
    let raw = [...(data.students || [])].map((s: any) => {
      // Determine gender from category/group if not explicitly set
      let derivedGender = s.gender;
      if (!derivedGender) {
        const identifier = `${s.category || ""} ${s.group || ""}`.toLowerCase();
        if (identifier.includes("girl") || identifier.includes("female")) {
          derivedGender = "Female";
        } else {
          // Default to Male currently in this app
          derivedGender = "Male";
        }
      }
      return { ...s, gender: derivedGender };
    });

    (data.admissions || []).forEach((a: any) => {
      const isEnrolled =
        a.isAdmitted === true ||
        a.status === "Admitted/Confirmed" ||
        a.status === "Admitted" ||
        a.status === "Confirmed" ||
        a.status === "Full Paid" ||
        a.status === "Partial Paid" ||
        Number(a.feeReceived) > 0;
      const exists = raw.some(
        (s: any) => s.admissionId === a.id || s.id === a.studentId,
      );
      if (isEnrolled && !exists) {
        let derivedGender = a.gender;
        if (!derivedGender) {
          const identifier =
            `${a.category || ""} ${a.group || ""}`.toLowerCase();
          if (identifier.includes("girl") || identifier.includes("female")) {
            derivedGender = "Female";
          } else {
            derivedGender = "Male";
          }
        }

        raw.push({
          id: a.studentId || a.id,
          admissionId: a.id,
          collegeNo: a.collegeNo || a.studentId || a.id,
          fullName: a.fullName,
          fatherName: a.fatherName,
          gender: derivedGender,
          category: a.category || "",
          group: a.group || "",
          section: a.section || "",
          session: a.session || "2026-28",
          academicPart: a.academicPart || "Part-1",
          programType: a.programType || "2-Year Yearly",
          currentSemester: a.currentSemester || 1,
          totalSemesters: a.totalSemesters || 2,
          totalInstallments: a.totalInstallments || 12,
          previousArrears: a.previousArrears || 0,
          contact: a.contactNumber || a.contact || a.phone || "",
          fatherContact: a.fatherContact || a.contactNumber || "",
          photo: a.photo || a.photo_url || "",
          totalPackage: a.totalPackage || 0,
          feeReceived: a.feeReceived || 0,
          status: "Active",
          feeHistory: a.feeHistory || [],
          feeLedger: a.feeLedger || null,
        });
      }
    });

    // Filter by program here so executive stats reflect the current program
    if (program && program !== "all") {
      raw = raw.filter((s: any) => matchesEducationalStream(s, program));
    }

    return raw;
  }, [data.students, data.admissions, program]);

  const globalStats = useMemo(() => {
    const students = data?.students || [];
    const allBoys = students.filter((s: any) => s.gender === "Male");
    const allGirls = students.filter((s: any) => s.gender === "Female");
    const allDIT = students.filter((s: any) => {
      const identifier = `${s.category || ""} ${s.group || ""}`.toLowerCase();
      return identifier.includes("dit");
    });

    return {
      totalStudents: students.length,
      totalReceived: students.reduce(
        (sum: number, s: any) => sum + (s.feeReceived || 0),
        0,
      ),
      totalExpected: students.reduce(
        (sum: number, s: any) => sum + (s.totalPackage || 0),
        0,
      ),
      boys: allBoys.length,
      girls: allGirls.length,
      dit: allDIT.length,
    };
  }, [data?.students]);

  const students = useMemo(() => {
    return allEnrolled.filter((s: any) => {
      let matchesGender = true;
      if (genderFilter !== "all") matchesGender = s.gender === genderFilter;
      return matchesGender;
    });
  }, [allEnrolled, genderFilter]);

  const stats = useMemo(() => {
    const totalExpected = students.reduce(
      (sum: number, s: any) => sum + (s.totalPackage || 0),
      0,
    );
    const totalReceived = students.reduce(
      (sum: number, s: any) => sum + (s.feeReceived || 0),
      0,
    );
    const outstanding = totalExpected - totalReceived;
    const collectionRate =
      totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;

    return {
      totalExpected,
      totalReceived,
      outstanding,
      collectionRate,
      totalStudents: students.length,
      defaulters: students.filter(
        (s: any) => s.totalPackage - (s.feeReceived || 0) > 0,
      ).length,
    };
  }, [students]);

  const handlePayment = async () => {
    if (!selectedStudent || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const currentDate = new Date();
    const [year, month, day] = paymentDate.split("-");
    const payDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      currentDate.getHours(),
      currentDate.getMinutes(),
      currentDate.getSeconds(),
    );
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const receiptNo = `REC-${Math.floor(100000 + Math.random() * 900000)}`;
    const currentBalance = (selectedStudent.totalPackage || 0) - (selectedStudent.feeReceived || 0);
    const newRemainingBalance = Math.max(0, currentBalance - amount);

    await data.recordFeePayment(selectedStudent.id, {
      id: `pay-${Date.now()}`,
      month: monthNames[payDate.getMonth()],
      year: payDate.getFullYear(),
      amountDue: currentBalance,
      amountPaid: amount,
      status: "Paid",
      datePaid: payDate.toISOString(),
      receiptId: receiptNo,
      feeType: paymentType,
      paymentMethod,
      collectedBy: collectedByName.trim() || undefined,
    });

    setIsPaymentOpen(false);
    setPaymentAmount("");
    setPaymentType("Tuition Fee Installment");
    setPaymentMethod("Cash");
    setCollectedByName("");
  };

  const handleUpdatePackage = async () => {
    if (!selectedStudent || !newFeePackage) return;
    const amount = parseFloat(newFeePackage);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid fee amount");
      return;
    }

    await data.updateFeePackage(selectedStudent.id, amount);
    setIsUpdateOpen(false);
    setNewFeePackage("");
  };

  const handleApplyAncillaryFee = async () => {
    const feeAmount = parseFloat(ancillaryForm.amount);
    if (!ancillaryForm.title.trim()) {
      toast.error("Please enter fee title (e.g. BISE Board Exam Fee)");
      return;
    }
    if (isNaN(feeAmount) || feeAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setIsApplyingAncillary(true);
      toast.loading(`Applying "${ancillaryForm.title.trim()}" to matching scholars...`, { id: "anc-apply" });

      const targetList = allEnrolled.filter((s: any) => {
        if (ancillaryForm.targetProgram !== "all" && !matchesEducationalStream(s, ancillaryForm.targetProgram)) {
          return false;
        }
        if (ancillaryForm.targetStage !== "all" && !matchesCohortStage(s, ancillaryForm.targetStage)) {
          return false;
        }
        if (ancillaryForm.targetSection !== "all") {
          if ((s.section || "").trim().toLowerCase() !== ancillaryForm.targetSection.trim().toLowerCase()) return false;
        }
        return true;
      });

      if (targetList.length === 0) {
        toast.error("No students matched the selected criteria.", { id: "anc-apply" });
        setIsApplyingAncillary(false);
        return;
      }

      const newEntry = {
        id: `anc-${Date.now()}`,
        title: ancillaryForm.title.trim(),
        amount: feeAmount,
        dueDate: ancillaryForm.dueDate,
        status: "Unpaid",
        appliedAt: new Date().toISOString(),
      };

      for (const student of targetList) {
        const existingLedger = student.feeLedger || {};
        const existingAncillary = existingLedger.ancillaryFees || [];
        const updatedLedger = {
          ...existingLedger,
          ancillaryFees: [...existingAncillary, { ...newEntry, id: `anc-${Date.now()}-${student.id}` }],
        };

        await supabase
          .from("students")
          .update({ fee_ledger: updatedLedger })
          .eq("id", student.id);

        if (student.admissionId) {
          await supabase
            .from("admissions")
            .update({ fee_ledger: updatedLedger })
            .eq("id", student.admissionId);
        }
      }

      toast.success(`Applied "${ancillaryForm.title}" (Rs. ${feeAmount.toLocaleString()}) to ${targetList.length} scholars!`, { id: "anc-apply" });
      setIsAncillaryModalOpen(false);
      if (data.fetchData) data.fetchData(true);
    } catch (err: any) {
      console.error("Ancillary apply error:", err);
      toast.error(`Failed to apply fee: ${err?.message || "Database error"}`, { id: "anc-apply" });
    } finally {
      setIsApplyingAncillary(false);
    }
  };

  const handleExportCSV = () => {
    const exportData = filteredStudents.map((s: any) => ({
      "Student ID": s.id,
      Name: s.fullName,
      "Father Name": s.fatherName,
      Program: s.group || s.category,
      "Total Package": s.totalPackage || 0,
      Received: s.feeReceived || 0,
      Outstanding: (s.totalPackage || 0) - (s.feeReceived || 0),
      Status:
        (s.totalPackage || 0) - (s.feeReceived || 0) <= 0 ? "Clear" : "Pending",
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
        `fee_export_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredStudents.map((s: any) => ({
      "Student ID": s.id,
      Name: s.fullName,
      "Father Name": s.fatherName,
      Program: s.group || s.category,
      "Total Package": s.totalPackage || 0,
      Received: s.feeReceived || 0,
      Outstanding: (s.totalPackage || 0) - (s.feeReceived || 0),
      Status:
        (s.totalPackage || 0) - (s.feeReceived || 0) <= 0 ? "Clear" : "Pending",
    }));

    if (exportData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fees");
    XLSX.writeFile(
      wb,
      `fee_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handlePrintFeeVouchers = () => {
    if (filteredStudents.length === 0) {
      toast.error("No students carefully selected to print vouchers");
      return;
    }
    const doc = new jsPDF("p", "pt", "a4");
    const collegeNameText =
      data.settings?.collegeName?.toUpperCase() || "SUPERIOR COLLEGE JAHANIAN";
    const logo = data.settings?.logo || safeLocalStorage.getItem("college_logo");

    filteredStudents.forEach((student: any, index: number) => {
      if (index > 0 && index % 4 === 0) {
        doc.addPage();
      }

      const slipIndex = index % 4;
      const yOffset = slipIndex * 210.47;

      // Box coords
      const boxX = 20;
      const boxY = yOffset + 12; // Shifted down a bit to fill the area nicely
      const boxW = 555;
      const boxH = 188; // Slightly compact height to fit perfectly in 210.47 segment

      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(253, 254, 254);
      doc.roundedRect(boxX, boxY, boxW, boxH, 6, 6, "FD");

      // Header: Center-aligned College Name (Full Width Centered)
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(5, 59, 50); // Superior Teal
      doc.text(collegeNameText, 595.28 / 2, boxY + 24, { align: "center" });

      // Horizontal Divider
      doc.setDrawColor(220, 220, 220);
      doc.line(boxX, boxY + 38, boxX + boxW, boxY + 38);

      // Vertical Divider
      const splitX = 180;
      doc.line(splitX, boxY + 38, splitX, boxY + boxH);

      // --- Left Column Logo and Details Block ---
      if (logo) {
        try {
          doc.saveGraphicsState();
          // Position logo at the top of the left column, perfectly centered
          const colLogoSize = 38;
          const colLogoX = boxX + (160 - colLogoSize) / 2;
          const colLogoY = boxY + 44;

          // Circular clipping path using null style so outer square or black backgrounds do not show
          doc.circle(colLogoX + colLogoSize / 2, colLogoY + colLogoSize / 2, colLogoSize / 2, null as any);
          doc.clip();
          doc.discardPath();

          const isPng = logo.startsWith("data:image/png") || logo.startsWith("data:image/gif") || logo.includes("png") || logo.includes("PNG");
          const format = isPng ? "PNG" : "JPEG";

          // Draw full-color college logo
          doc.addImage(logo, format, colLogoX, colLogoY, colLogoSize, colLogoSize);
          doc.restoreGraphicsState();
        } catch (e) {
          console.warn("Error drawing circular left panel logo:", e);
        }
      }

      // Shifting "FEE VOUCHER" and details downwards towards the empty space to fit perfectly below the logo
      let leftY = boxY + 98;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("FEE VOUCHER", 30, leftY);
      leftY += 15;

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        "Student ID: " +
          (student.id ? student.id.toString().toUpperCase() : "N/A"),
        30,
        leftY,
      );
      leftY += 15;

      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      const safeString = (str: any) => (str ? str.toString() : "N/A");

      // Auto-wrap names if too long
      const renderLeftField = (label: string, value: string) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 30, leftY);
        doc.setFont("helvetica", "normal");
        const valText = doc.splitTextToSize(
          safeString(value),
          140 - doc.getTextWidth(label),
        );
        doc.text(valText, 30 + doc.getTextWidth(label), leftY);
        leftY += Math.max(11, valText.length * 10);
      };

      renderLeftField("Name: ", isNewStudent(student) ? `${student.fullName} [NEW]` : student.fullName);
      renderLeftField("Father: ", student.fatherName);
      renderLeftField("Session: ", student.session);
      renderLeftField("Program: ", student.group || student.category);
      renderLeftField("Section: ", student.section || "All");

      // --- Right Column ---
      const rightX = splitX + 15;

      // Due Date is 5 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 5);
      const dueDateStr = dueDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      // Calculate logic
      let lastAmount = student.feeReceived || 0;
      let lastDate = "Admission";
      let installmentsCount = 0;

      if (
        student.feeLedger &&
        student.feeLedger.transactions &&
        student.feeLedger.transactions.length > 0
      ) {
        const sortedTx = [...student.feeLedger.transactions].sort(
          (a, b) =>
            new Date(a.datePaid).getTime() - new Date(b.datePaid).getTime(),
        );
        const lastTx = sortedTx[sortedTx.length - 1];
        lastAmount = lastTx.amountPaid || lastAmount;
        lastDate = lastTx.datePaid
          ? new Date(lastTx.datePaid).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : lastDate;
        installmentsCount = sortedTx.length;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Rs${lastAmount.toLocaleString()} paid on ${lastDate}`,
        rightX,
        boxY + 60, // shifted down to match left column spacing
      );

      doc.setFontSize(9);
      doc.setTextColor(220, 38, 38);
      doc.text(`Due Date: ${dueDateStr}`, 560, boxY + 58, { align: "right" });

      // Table headers
      const thY = boxY + 84; // shifted down for breathing room
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("Description", rightX, thY);
      doc.text("Amount", 560, thY, { align: "right" });

      doc.setDrawColor(230, 230, 230);
      doc.line(rightX, thY + 5, 560, thY + 5);

      // Table Content
      const tdY = thY + 18;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      const courseTitle = `Course Tuition Fee (${safeString(student.group || student.category)})`;
      const splitCourse = doc.splitTextToSize(courseTitle, 170);
      doc.text(splitCourse, rightX, tdY);

      let descYOffset = splitCourse.length * 12;

      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);

      const subjectsStr = Array.isArray(student.subjects)
        ? student.subjects.join(", ")
        : student.subjects || "General Subjects";
      const splitSubjects = doc.splitTextToSize(
        `Subjects: ${subjectsStr}`,
        170,
      );
      doc.text(splitSubjects, rightX, tdY + descYOffset);

      descYOffset += splitSubjects.length * 10 + 2;

      doc.text(
        `Instalments submitted to date: ${installmentsCount || (lastAmount > 0 ? 1 : 0)}`,
        rightX,
        tdY + descYOffset,
      );

      const totalPackage =
          student.totalPackage || student.feeLedger?.totalPackage || 0;
      const received =
          student.feeReceived || student.feeLedger?.totalReceived || 0;
      const balance = totalPackage - received;

      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Rs${totalPackage.toLocaleString()}`, 560, tdY, {
        align: "right",
      });

      // Totals Area (perfectly shifted down to fill the height beautifully)
      const totalsY = boxY + 138;
      doc.line(380, totalsY - 8, 560, totalsY - 8);

      doc.text("Subtotal", 380, totalsY);
      doc.text(`Rs${totalPackage.toLocaleString()}`, 560, totalsY, {
        align: "right",
      });

      doc.line(380, totalsY + 5, 560, totalsY + 5);

      doc.text("Total Paid", 380, totalsY + 18);
      doc.text(`Rs${received.toLocaleString()}`, 560, totalsY + 18, {
        align: "right",
      });

      doc.setFont("helvetica", "bold");
      doc.text("Remaining Balance", 380, totalsY + 34);
      doc.text(`Rs${balance.toLocaleString()}`, 560, totalsY + 34, {
        align: "right",
      });

      // Cut line between slips
      if (slipIndex < 3) {
        doc.setLineDashPattern([4, 4], 0);
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yOffset + 210.47, 575, yOffset + 210.47);
        doc.setLineDashPattern([], 0);
      }
    });

    doc.save(
      `Professional_Fee_Vouchers_${new Date().toISOString().split("T")[0]}.pdf`,
    );
    toast.success("Professional Fee Vouchers generated!");
  };

  const generateReceipt = (student: any, payment: any) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(data.settings?.collegeName || "Institutional Receipt", 105, 20, {
      align: "center",
    });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(data.settings?.address || "Campus Location", 105, 28, {
      align: "center",
    });

    doc.line(20, 35, 190, 35);

    // Student Details
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Receipt No: ${payment.receiptId || "N/A"}`, 20, 45);
    doc.text(
      `Date: ${new Date(payment.datePaid).toLocaleDateString()}`,
      150,
      45,
    );

    doc.setFont("helvetica", "bold");
    doc.text("STUDENT DETAILS", 20, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`Student Name: ${student.fullName}${isNewStudent(student) ? " [NEW]" : ""}`, 20, 68);
    doc.text(`Father's Name: ${student.fatherName}`, 20, 76);
    doc.text(`Student ID: ${student.id}`, 20, 84);

    // Payment Table
    autoTable(doc, {
      startY: 95,
      head: [["Description", "Amount"]],
      body: [
        [
          `Fee Installment (${payment.month} ${payment.year})`,
          `Rs. ${(payment.amountPaid || 0).toLocaleString()}`,
        ],
        ["Total Received", `Rs. ${(payment.amountPaid || 0).toLocaleString()}`],
      ],
      headStyles: { fillColor: [16, 185, 129] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Footer Stats
    doc.text(
      `Total Package: Rs. ${(student.totalPackage || 0).toLocaleString()}`,
      20,
      finalY,
    );
    doc.text(
      `Fee Received: Rs. ${((student.feeReceived || 0) + (payment.amountPaid || 0)).toLocaleString()}`,
      20,
      finalY + 8,
    );
    doc.text(
      `Remaining Balance: Rs. ${((student.totalPackage || 0) - ((student.feeReceived || 0) + (payment.amountPaid || 0))).toLocaleString()}`,
      20,
      finalY + 16,
    );

    // Time and Collected By
    doc.text(
      `Recorded Date & Time: ${new Date(payment.datePaid || Date.now()).toLocaleString()}`,
      20,
      finalY + 30,
    );
    // Retrieve recordedBy from the actual ledger if we can, else fallback
    const ledgerTx = student.feeLedger?.transactions?.find(
      (t: any) => t.receiptId === payment.receiptId,
    );
    doc.text(
      `Collected By / Recorded By: ${payment.collectedBy || ledgerTx?.recordedBy || "System / Authorized User"}`,
      20,
      finalY + 38,
    );

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Generated by SCJ Management System", 105, 280, {
      align: "center",
    });

    doc.save(`${student.fullName}_Receipt_${payment.receiptId}.pdf`);
    toast.success("Receipt downloaded!");
  };

  const generateFeeStatement = (student: any) => {
    const doc = new jsPDF("p", "pt", "a4");

    // Header
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 59, 50); // Superior Teal
    doc.text(
      data.settings?.collegeName?.toUpperCase() || "SUPERIOR COLLEGE JAHANIAN",
      297.5,
      50,
      { align: "center" },
    );

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(
      data.settings?.address || "Main Canal Road, Jahanian, Khanewal",
      297.5,
      68,
      { align: "center" },
    );

    // Top dividing line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1.5);
    doc.line(40, 85, 555, 85);
    doc.setLineWidth(1); // reset

    // Title & Date
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("FEE STATEMENT / LEDGER", 40, 115);

    const statementDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Statement Date: ${statementDate}`, 555, 115, { align: "right" });

    // Box for Student Details
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 252, 252); // extremely light teal/gray
    doc.roundedRect(40, 135, 515, 120, 6, 6, "FD");

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 59, 50);
    doc.text("ACCOUNT DETAILS", 55, 155);

    // Left Column Details
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);

    const renderField = (label: string, value: any, x: number, y: number) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, x, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(
        value ? value.toString() : "N/A",
        x + doc.getTextWidth(label) + 2,
        y,
      );
      doc.setTextColor(50, 50, 50);
    };

    renderField("Student Name: ", isNewStudent(student) ? `${student.fullName} [NEW]` : student.fullName, 55, 175);
    renderField("Father's Name: ", student.fatherName, 55, 195);
    renderField("Student ID / Reg No: ", student.id, 55, 215);
    renderField(
      "College Roll No: ",
      student.rollNumber || "Not Assigned",
      55,
      235,
    );

    // Right Column Details
    renderField("Session: ", student.session, 310, 175);
    renderField("Program: ", student.group || student.category, 310, 195);
    renderField("Section: ", student.section || "All", 310, 215);
    renderField(
      "Status: ",
      student.status?.toUpperCase() || "ACTIVE",
      310,
      235,
    );

    // Transactions Table
    const unified = getUnifiedTransactions(student);
    const sortedHistory = [...unified].sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const received =
      student.feeReceived || student.feeLedger?.totalReceived || 0;
    const totalPackage =
      student.totalPackage || student.feeLedger?.totalPackage || 0;

    // Calculate total from transactions
    const totalFromTxs = sortedHistory.reduce(
      (sum: number, tx: any) => sum + (Number(tx.amount) || 0),
      0,
    );

    // Inject "Initial Admission / First Payment" if there's a gap between total received and transaction sum
    if (received > totalFromTxs) {
      const difference = received - totalFromTxs;
      // Pretend this initial payment happened on the date of admission or a default date if not available
      const firstPaymentDate =
        student.admissionDate ||
        student.dateOfAdmission ||
        student.created_at ||
        new Date().toISOString();

      sortedHistory.unshift({
        date: firstPaymentDate,
        amount: difference,
        receiptId: "SYS-INITIAL",
        description: "First Payment / Admission Fee",
        recordedBy: "System",
      });

      // Re-sort after unshifting just in case
      sortedHistory.sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    }

    let runningBalance = totalPackage;

    const body = sortedHistory.map((h: any) => {
      const d = new Date(h.date);
      const amount = Number(h.amount) || 0;
      runningBalance -= amount;

      return [
        `${d.toLocaleDateString("en-GB")}`,
        h.receiptId || "System Entry",
        (h.description || "Fee Payment") +
          (h.recordedBy ? ` (By: ${h.recordedBy})` : ""),
        `Rs. ${amount.toLocaleString()}`,
        `Rs. ${runningBalance.toLocaleString()}`,
      ];
    });

    autoTable(doc, {
      startY: 275,
      head: [
        [
          "Date",
          "Receipt / Ref No",
          "Description / Details",
          "Credit (Paid)",
          "Running Balance",
        ],
      ],
      body:
        body.length > 0
          ? body
          : [["-", "-", "No transactions recorded", "-", "-"]],
      theme: "grid",
      headStyles: {
        fillColor: [5, 59, 50],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 10,
        halign: "left",
      },
      bodyStyles: {
        fontSize: 9,
        textColor: 50,
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 90 },
        3: { halign: "right", fontStyle: "bold", cellWidth: 90 },
        4: { halign: "right", cellWidth: 90 },
      },
      margin: { left: 40, right: 40 },
    });

    const finalY = Math.max((doc as any).lastAutoTable.finalY + 30, 420);

    // Account Summary Section
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(253, 253, 253);
    doc.roundedRect(40, finalY, 515, 100, 6, 6, "FD");

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 59, 50);
    doc.text("ACCOUNT SUMMARY", 55, finalY + 25);

    const balance = totalPackage - received;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);

    doc.text("Total Course Package:", 55, finalY + 50);
    doc.text("Total Amount Received (To Date):", 55, finalY + 70);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`Rs. ${totalPackage.toLocaleString()}`, 220, finalY + 50);
    doc.text(`Rs. ${received.toLocaleString()}`, 220, finalY + 70);

    // Right Side of Summary - Final Status
    const summaryRightX = 320;
    doc.setDrawColor(240, 240, 240);
    doc.line(summaryRightX - 10, finalY + 35, summaryRightX - 10, finalY + 85);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("Current Status:", summaryRightX, finalY + 45);

    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38); // red for remaining balance if > 0
    if (balance <= 0) doc.setTextColor(16, 185, 129); // green if zero

    doc.text("CURRENT OUTSTANDING BALANCE", summaryRightX, finalY + 65);
    doc.setFontSize(16);
    doc.text(`Rs. ${balance.toLocaleString()}`, summaryRightX, finalY + 85);

    if (balance <= 0) {
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129);
      doc.text("ACCOUNT FULLY SETTLED", 540, finalY + 85, { align: "right" });
    } else {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("PAYMENT OVERDUE / PENDING", 540, finalY + 85, {
        align: "right",
      });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This is a system-generated statement and does not require a signature.",
      297.5,
      pageHeight - 40,
      { align: "center" },
    );
    doc.text("Generated by SCJ Management System", 297.5, pageHeight - 30, {
      align: "center",
    });

    doc.save(
      `${student.fullName}_Account_Statement_${statementDate.replace(/\//g, "-")}.pdf`,
    );
    toast.success("Professional Fee Statement downloaded!");
  };

  const sectionOptions = useMemo(() => {
    let sections = data?.settings?.predefinedSections || [];
    
    // Filter by gender if selected
    if (genderFilter !== "all") {
      sections = sections.filter((s: any) => s.gender === genderFilter || !s.gender);
    }
    
    // Filter by group if selected
      const pFilter = groupFilter.toLowerCase();
      if (pFilter !== "all") {
        sections = sections.filter((s: any) =>
          matchesEducationalStream({ group: s.program || s.name || "", category: s.program || "" }, pFilter)
        );
      }

    const predefinedNames = sections.map((s: any) => s.name).filter(Boolean);
    const studentSections = (students || [])
      .filter((s: any) => {
        if (genderFilter !== "all" && s.gender && s.gender !== genderFilter) return false;
        if (groupFilter !== "all" && !matchesEducationalStream(s, groupFilter)) return false;
        return true;
      })
      .map((s: any) => (s.section || '').trim())
      .filter((sec: string) => sec && sec !== '-' && sec.toLowerCase() !== 'unassigned');

    return Array.from(new Set([...predefinedNames, ...studentSections])).sort() as string[];
  }, [data?.settings?.predefinedSections, groupFilter, genderFilter, students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      const nameMatch = (s.fullName || s.full_name || "")
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
      const idMatch = (s.id || s.collegeNo || "")
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
      const fatherMatch = (s.fatherName || s.father_name || "")
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
      const matchesSearch = nameMatch || idMatch || fatherMatch;

      const balance = (s.totalPackage || 0) - (s.feeReceived || 0);
      const received = s.feeReceived || 0;

      let matchesStatus = true;
      if (activeTab === "defaulters") {
        // In defaulters tab, show any student with remaining unpaid balance
        matchesStatus = balance > 0;
      } else {
        matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "paid" && balance <= 0 && received > 0) ||
          (statusFilter === "pending" && balance > 0 && received > 0) ||
          (statusFilter === "not-paid" && received <= 0);
      }

      const matchesGroup = groupFilter === "all" || matchesEducationalStream(s, groupFilter);
      const matchesSection =
        sectionFilter === "all" ||
        (s.section || "").trim().toLowerCase() ===
          sectionFilter.trim().toLowerCase();

      const matchesStage = stageFilter === "all" || matchesCohortStage(s, stageFilter);

      return matchesSearch && matchesStatus && matchesGroup && matchesSection && matchesStage;
    });
  }, [
    students,
    debouncedSearch,
    statusFilter,
    activeTab,
    groupFilter,
    sectionFilter,
    stageFilter,
  ]);



  const isSuperAdmin = data.user?.email === "mughalazam1964@gmail.com";
  const userPermission = data.permissions?.find((p: any) => p.email === data.user?.email);
  const isAdmin = isSuperAdmin || userPermission?.isAdmin;

  return (
    <div className="space-y-6 pb-10">
      {/* Sleek Ultra-Compact Ribbon (< 85px) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm space-y-2">
        {/* ROW 1: Title + Urdu + Tabs + Programs + Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Title + Nastaleeq + Mode Switcher + Group Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-superior-teal/10 flex items-center justify-center text-superior-teal">
                <CreditCard size={15} />
              </div>
              <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Fee Management
              </h2>
              <span className="font-nastaleeq text-xs text-superior-gold font-medium px-1.5 py-0.5 bg-superior-gold/10 rounded-md">
                فیس مینجمنٹ
              </span>
            </div>

            {/* Mode Switcher: Collect vs Defaulters */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setActiveTab("collect")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                  activeTab === "collect"
                    ? "bg-white dark:bg-slate-700 text-superior-teal dark:text-superior-gold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
              >
                Collect Fee ({filteredStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("defaulters")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1",
                  activeTab === "defaulters"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-rose-600 dark:text-rose-400 hover:text-rose-700"
                )}
              >
                Defaulters ({stats.defaulters})
              </button>
            </div>

            {/* Educational Stream Program Navigation Pills */}
            <div className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              {[
                { id: "all", label: "All Streams" },
                { id: "fsc", label: "Inter (2-Yr)", icon: School },
                { id: "bs", label: "BS (4-Yr)", icon: GraduationCap },
                { id: "ads", label: "ADS (2-Yr)", icon: GraduationCap },
                { id: "dit", label: "DIT Diploma", icon: GraduationCap },
                { id: "ukl3", label: "UK Level 3", icon: Globe },
              ].map((grp) => {
                const Icon = grp.icon;
                const active = groupFilter === grp.id;
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => {
                      setGroupFilter(grp.id);
                      setStageFilter("all");
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer",
                      active
                        ? "bg-white dark:bg-slate-700 text-superior-teal dark:text-superior-gold shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                    )}
                  >
                    {Icon && <Icon size={11} />}
                    <span>{grp.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Academic Stage Sub-Pills (Inter, BS Semesters 1-8, ADS, DIT, UKL3) */}
            {groupFilter === "fsc" && (
              <div className="flex items-center bg-emerald-50/80 dark:bg-emerald-950/40 p-0.5 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60">
                {[
                  { id: "all", label: "All Inter" },
                  { id: "part1", label: "Part-1 (1st Year)" },
                  { id: "part2", label: "Part-2 (2nd Year)" },
                ].map((stg) => (
                  <button
                    key={stg.id}
                    type="button"
                    onClick={() => setStageFilter(stg.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      stageFilter === stg.id
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-emerald-800 dark:text-emerald-300 hover:text-emerald-950"
                    )}
                  >
                    {stg.label}
                  </button>
                ))}
              </div>
            )}

            {groupFilter === "bs" && (
              <div className="flex items-center bg-indigo-50/80 dark:bg-indigo-950/40 p-0.5 rounded-lg border border-indigo-200/80 dark:border-indigo-800/60 overflow-x-auto max-w-[380px]">
                <button
                  type="button"
                  onClick={() => setStageFilter("all")}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0",
                    stageFilter === "all" ? "bg-indigo-600 text-white shadow-2xs" : "text-indigo-800 dark:text-indigo-300"
                  )}
                >
                  All Semesters (8)
                </button>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <button
                    key={`sem${sem}`}
                    type="button"
                    onClick={() => setStageFilter(`sem${sem}`)}
                    className={cn(
                      "px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer shrink-0",
                      stageFilter === `sem${sem}` ? "bg-indigo-600 text-white shadow-2xs" : "text-indigo-700 dark:text-indigo-300 hover:text-indigo-950"
                    )}
                  >
                    S{sem}
                  </button>
                ))}
              </div>
            )}

            {groupFilter === "ads" && (
              <div className="flex items-center bg-purple-50/80 dark:bg-purple-950/40 p-0.5 rounded-lg border border-purple-200/80 dark:border-purple-800/60">
                {[
                  { id: "all", label: "All ADS" },
                  { id: "ads-p1", label: "Part-1 (Year 1)" },
                  { id: "ads-p2", label: "Part-2 (Year 2)" },
                ].map((stg) => (
                  <button
                    key={stg.id}
                    type="button"
                    onClick={() => setStageFilter(stg.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      stageFilter === stg.id
                        ? "bg-purple-600 text-white shadow-2xs"
                        : "text-purple-800 dark:text-purple-300 hover:text-purple-950"
                    )}
                  >
                    {stg.label}
                  </button>
                ))}
              </div>
            )}

            {groupFilter === "dit" && (
              <div className="flex items-center bg-teal-50/80 dark:bg-teal-950/40 p-0.5 rounded-lg border border-teal-200/80 dark:border-teal-800/60">
                {[
                  { id: "all", label: "All DIT" },
                  { id: "dit-p1", label: "Part-1 (Year 1)" },
                  { id: "dit-p2", label: "Part-2 (Year 2)" },
                ].map((stg) => (
                  <button
                    key={stg.id}
                    type="button"
                    onClick={() => setStageFilter(stg.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      stageFilter === stg.id
                        ? "bg-teal-600 text-white shadow-2xs"
                        : "text-teal-800 dark:text-teal-300 hover:text-teal-950"
                    )}
                  >
                    {stg.label}
                  </button>
                ))}
              </div>
            )}

            {groupFilter === "ukl3" && (
              <div className="flex items-center bg-amber-50/80 dark:bg-amber-950/40 p-0.5 rounded-lg border border-amber-200/80 dark:border-amber-800/60">
                {[
                  { id: "all", label: "All UK L3" },
                  { id: "uk-yr1", label: "Year-1 (Foundation)" },
                  { id: "uk-yr2", label: "Year-2 (Advanced)" },
                ].map((stg) => (
                  <button
                    key={stg.id}
                    type="button"
                    onClick={() => setStageFilter(stg.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      stageFilter === stg.id
                        ? "bg-amber-600 text-white shadow-2xs"
                        : "text-amber-800 dark:text-amber-300 hover:text-amber-950"
                    )}
                  >
                    {stg.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Ancillary Fees Manager Button */}
            <Button
              onClick={() => setIsAncillaryModalOpen(true)}
              size="sm"
              className="h-7.5 px-2.5 rounded-lg bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
              title="Add / Apply Decoupled Institutional Fees (Board Exam, Registration, Funds)"
            >
              <Plus size={13} className="text-superior-gold" />
              <span>Ancillary Fees</span>
            </Button>

            <Button
              onClick={() => {
                if (!filteredStudents || filteredStudents.length === 0) {
                  toast.error("No students found in current filter to generate challans.");
                  return;
                }
                const toPrint = filteredStudents.slice(0, 100);
                if (filteredStudents.length > 100) {
                  toast.info(`Generating challans for the first 100 of ${filteredStudents.length} filtered students.`);
                }
                setChallanStudents(toPrint);
                setIsChallanModalOpen(true);
              }}
              variant="outline"
              size="sm"
              className="h-7.5 px-2.5 rounded-lg border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
              title="Generate 3-Copy Bank Challan Vouchers for Filtered Students"
            >
              <Building2 size={13} className="text-emerald-600" />
              <span>Challans ({filteredStudents.length})</span>
            </Button>

            <Button
              onClick={handleOpenBulkFeeRemindersModal}
              size="sm"
              className="h-7.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
              title="Broadcast Fee Due Reminders via WhatsApp"
            >
              <MessageSquare size={13} />
              <span>Broadcast</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-7.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-[11px] flex items-center gap-1 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
              >
                <Download size={13} className="text-superior-gold" />
                <span>Export</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                <DropdownMenuItem onClick={handleExportCSV} className="text-xs font-bold gap-2">
                  <Download size={14} className="text-superior-gold" /> Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="text-xs font-bold gap-2">
                  <Download size={14} className="text-emerald-600" /> Export Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintFeeVouchers} className="text-xs font-bold gap-2">
                  <Download size={14} className="text-red-500" /> Print Fee Vouchers
                </DropdownMenuItem>
                {activeRowStudent && (
                  <>
                    <DropdownMenuItem onClick={() => generateFeeStatement(activeRowStudent)} className="text-xs font-bold gap-2">
                      <FileText size={14} className="text-indigo-600" /> Selected Fee Statement
                    </DropdownMenuItem>
                    {getUnifiedTransactions(activeRowStudent)?.length > 0 && (
                      <DropdownMenuItem onClick={() => generateReceipt(activeRowStudent, getUnifiedTransactions(activeRowStudent)[0])} className="text-xs font-bold gap-2">
                        <Receipt size={14} className="text-teal-600" /> Selected Latest Receipt
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => {
                setSelectedStudent(null);
                setPaymentAmount("");
                setIsPaymentOpen(true);
              }}
              size="sm"
              className="h-7.5 px-3 rounded-lg bg-superior-teal hover:bg-superior-teal/90 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
            >
              <Plus size={14} />
              <span>Add Payment</span>
            </Button>
          </div>
        </div>

        {/* ROW 2: Search + Filters + Live Mini KPI Metric Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* Left: Search + Filters */}
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <Input
                placeholder="Search student by name, roll, father..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-7.5 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
              />
            </div>

            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-28 h-7.5 rounded-lg border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs font-bold">All Sections</SelectItem>
                {sectionOptions.map((sec) => (
                  <SelectItem key={sec} value={sec} className="text-xs font-bold">{sec}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-24 h-7.5 rounded-lg border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs font-bold">All</SelectItem>
                <SelectItem value="Male" className="text-xs font-bold">Boys Only</SelectItem>
                <SelectItem value="Female" className="text-xs font-bold">Girls Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right: High-Density Live Metrics Strip */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <span className="text-slate-400 uppercase tracking-wider">Target:</span>
                <span className="font-mono font-black">Rs. {(stats.totalExpected || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                <span className="text-emerald-600 uppercase tracking-wider">Received:</span>
                <span className="font-mono font-black">Rs. {(stats.totalReceived || 0).toLocaleString()}</span>
                <span className="text-[9px] bg-emerald-600 text-white px-1 rounded font-black">{stats.collectionRate.toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-[10px] font-bold text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50">
                <span className="text-rose-600 uppercase tracking-wider">Arrears:</span>
                <span className="font-mono font-black">Rs. {(stats.outstanding || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                <span className="text-amber-600 uppercase tracking-wider">Defaulters:</span>
                <span className="font-mono font-black">{stats.defaulters}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: Table */}
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <CardContent className="p-0 border-b-0">
          <div className="overflow-x-auto hide-scrollbar">
            <Table>
                <TableHeader className="bg-slate-50/95 dark:bg-slate-900/95 sticky top-0 z-10 shadow-xs backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
                  <TableRow className="border-none">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest pl-8 h-12 text-slate-600 dark:text-slate-400">
                      Student Profile
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest h-12 text-slate-600 dark:text-slate-400">
                      Total Package
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest h-12 text-slate-600 dark:text-slate-400">
                      Total Received
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest h-12 text-slate-600 dark:text-slate-400">
                      Current Balance
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest h-12 text-slate-600 dark:text-slate-400">
                      Progress
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right pr-8 h-12 text-slate-600 dark:text-slate-400">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          <AlertCircle size={48} className="mb-4 opacity-10" />
                          <p className="text-sm font-black uppercase tracking-widest">
                            No Billing Records Found
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredStudents.map((student: any) => {
                        const balance =
                          (student.totalPackage || 0) -
                          (student.feeReceived || 0);
                        const progress =
                          student.totalPackage > 0
                            ? Math.round((student.feeReceived / student.totalPackage) * 100)
                            : 0;

                        return (
                          <TableRow
                            key={student.id}
                            onClick={() => setActiveRowStudent(student)}
                            className={cn(
                              "group hover:bg-emerald-50/60 transition-colors border-slate-100 cursor-pointer h-[75px]",
                              activeRowStudent?.id === student.id
                                ? "bg-emerald-100 border-emerald-300 shadow-inner ring-1 ring-emerald-300"
                                : "",
                            )}
                          >
                            <TableCell className="pl-8 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-base font-black text-superior-teal overflow-hidden border-2 border-slate-200 shadow-sm shrink-0 ring-2 ring-superior-teal/15">
                                  {student.photo ? (
                                    <img
                                      src={student.photo}
                                      alt=""
                                      className="w-full h-full object-cover object-[center_top] rounded-full"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    (student.fullName || 'S').charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                    <p className="font-black text-slate-700 leading-none group-hover:text-superior-teal transition-colors italic">
                                      {student.fullName}
                                    </p>
                                    {isNewStudent(student) && (
                                      <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500 text-white px-1.5 py-0.5 rounded-full shadow-2xs">
                                        NEW
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded-md">
                                      {student.id}
                                    </p>
                                    {student.section && (
                                      <p className="text-[10px] font-bold text-superior-teal uppercase tracking-tighter bg-superior-teal/10 px-1.5 py-0.5 rounded-md">
                                        Section: {student.section}
                                      </p>
                                    )}
                                    {student.group && (
                                      <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tighter bg-rose-50 px-1.5 py-0.5 rounded-md">
                                        {student.group}
                                      </p>
                                    )}
                                    {((student.reference || '').toLowerCase().includes('whatsapp') ||
                                      (student.notes && JSON.stringify(student.notes).toLowerCase().includes('whatsapp')) ||
                                      (student.feeHistory && student.feeHistory.some((h: any) => (h.paymentMethod === 'WhatsApp Bot' || (h.collectedBy || '').toLowerCase().includes('whatsapp'))))) && (
                                      <p className="text-[9px] font-black text-emerald-700 uppercase tracking-tighter bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs">
                                        🤖 Via WhatsApp Bot
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-black text-slate-600 text-[13px]">
                              Rs. {student.totalPackage?.toLocaleString()}
                            </TableCell>
                            <TableCell className="font-black text-emerald-600 text-[13px]">
                              Rs. {student.feeReceived?.toLocaleString()}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "font-black text-[13px]",
                                balance > 0
                                  ? "text-rose-600"
                                  : "text-emerald-600",
                              )}
                            >
                              Rs. {balance.toLocaleString()}
                            </TableCell>
                            <TableCell className="w-32">
                              <div className="space-y-1.5">
                                <Progress
                                  value={progress}
                                  className="h-1.5 bg-slate-100"
                                />
                                <p className="text-[9px] font-black text-slate-400 text-right uppercase">
                                  {progress.toFixed(0)}% Completion
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6 py-4">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {/* Direct 1-Click 3-Copy Bank Challan */}
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setChallanStudents([student]);
                                    setIsChallanModalOpen(true);
                                  }}
                                  size="sm"
                                  title="Print 3-Copy Bank Challan Voucher"
                                  className="h-8 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-200/80 font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 shadow-xs transition-all hover:scale-105 active:scale-95"
                                >
                                  <Building2 size={13} className="text-indigo-600 shrink-0" />
                                  <span className="hidden xl:inline">Challan</span>
                                </Button>

                                {/* Direct 1-Click Latest Receipt */}
                                {getUnifiedTransactions(student) && getUnifiedTransactions(student).length > 0 && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      generateReceipt(
                                        student,
                                        getUnifiedTransactions(student)[0],
                                      );
                                    }}
                                    size="sm"
                                    title="Download Latest Fee Receipt"
                                    className="h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200/80 font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 shadow-xs transition-all hover:scale-105 active:scale-95"
                                  >
                                    <Receipt size={13} className="text-emerald-600 shrink-0" />
                                    <span className="hidden xl:inline">Receipt</span>
                                  </Button>
                                )}

                                {/* Direct 1-Click Fee Statement */}
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    generateFeeStatement(student);
                                  }}
                                  size="sm"
                                  title="Download Complete Fee Statement / Ledger"
                                  className="h-8 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-900 border border-amber-200/80 font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 shadow-xs transition-all hover:scale-105 active:scale-95"
                                >
                                  <FileText size={13} className="text-amber-700 shrink-0" />
                                  <span className="hidden xl:inline">Statement</span>
                                </Button>

                                {balance > 0 && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickWhatsAppNotice(student, balance);
                                    }}
                                    disabled={sendingNoticeId === student.id}
                                    size="sm"
                                    title="Send 1-Click WhatsApp Fee Due Reminder"
                                    className="h-8 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-[10px] flex items-center gap-1 shadow-xs shadow-emerald-200 transition-all hover:scale-105 active:scale-95"
                                  >
                                    <MessageSquare size={13} className="shrink-0" />
                                    <span className="hidden 2xl:inline">Notice</span>
                                  </Button>
                                )}
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStudent(student);
                                    setIsPaymentOpen(true);
                                  }}
                                  size="sm"
                                  className="h-8 px-3 rounded-lg bg-superior-teal hover:bg-superior-teal/90 text-white font-bold uppercase tracking-widest text-[10px] shadow-xs transition-all hover:scale-105 active:scale-95"
                                >
                                  Collect
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-500 outline-hidden transition-all hover:text-slate-800"
                                    title="More Options"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="rounded-2xl border-slate-100 p-2 shadow-2xl w-56"
                                  >
                                    {balance > 0 && (
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleQuickWhatsAppNotice(student, balance);
                                        }}
                                        className="gap-3 p-3 rounded-xl font-black text-xs text-emerald-600 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 uppercase tracking-widest italic"
                                      >
                                        <MessageSquare size={14} /> Send WhatsApp Notice
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedStudent(student);
                                        setIsPaymentOpen(true);
                                      }}
                                      className="gap-3 p-3 rounded-xl font-black text-xs text-emerald-600 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 uppercase tracking-widest italic"
                                    >
                                      <CreditCard size={14} /> Record Payment
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedStudent(student);
                                        setIsUpdateOpen(true);
                                      }}
                                      className="gap-3 p-3 rounded-xl font-black text-xs text-superior-teal cursor-pointer hover:bg-superior-teal/5 focus:bg-superior-teal/5 uppercase tracking-widest italic"
                                    >
                                      <Plus size={14} /> Update Fee Package
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedStudent(student);
                                        setIsHistoryOpen(true);
                                      }}
                                      className="gap-3 p-3 rounded-xl font-black text-xs text-slate-700 cursor-pointer hover:bg-slate-50 focus:bg-slate-50 uppercase tracking-widest italic"
                                    >
                                      <Clock size={14} /> Payment History
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        generateFeeStatement(student);
                                      }}
                                      className="gap-3 p-3 rounded-xl font-black text-xs text-amber-700 cursor-pointer hover:bg-amber-50 focus:bg-amber-50 uppercase tracking-widest italic"
                                    >
                                      <FileText size={14} /> Download Fee Statement
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setChallanStudents([student]);
                                        setIsChallanModalOpen(true);
                                      }}
                                      className="gap-3 p-3 rounded-xl font-black text-xs text-indigo-700 cursor-pointer hover:bg-indigo-50 focus:bg-indigo-50 uppercase tracking-widest italic"
                                    >
                                      <Building2 size={14} /> 3-Copy Bank Challan
                                    </DropdownMenuItem>
                                    {getUnifiedTransactions(student) &&
                                      getUnifiedTransactions(student).length >
                                        0 && (
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            generateReceipt(
                                              student,
                                              getUnifiedTransactions(
                                                student,
                                              )[0],
                                            );
                                          }}
                                          className="gap-3 p-3 rounded-xl font-black text-xs text-emerald-600 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 uppercase tracking-widest italic"
                                        >
                                          <Receipt size={14} /> Download Latest Receipt
                                        </DropdownMenuItem>
                                      )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="rounded-[2.5rem] border-slate-100 shadow-2xl max-w-md p-8 overflow-visible">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-black text-slate-800 italic">
              Record Fee Payment
            </DialogTitle>
            {selectedStudent ? (
              <div className="flex items-center gap-3 pt-2">
                <div className="w-14 h-14 rounded-full bg-superior-teal/10 flex items-center justify-center text-base font-black text-superior-teal overflow-hidden border-2 border-slate-200 shadow-sm shrink-0 ring-2 ring-superior-teal/15">
                  {selectedStudent.photo ? (
                    <img
                      src={selectedStudent.photo}
                      alt=""
                      className="w-full h-full object-cover object-[center_top] rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    (selectedStudent.fullName || 'S').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 leading-tight">
                    {selectedStudent.fullName}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {selectedStudent.id} • {selectedStudent.group || selectedStudent.category}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                New Fee Record
              </p>
            )}
          </DialogHeader>
          <div className="space-y-6 py-4 overflow-visible">
            {!selectedStudent && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Select Student
                </Label>
                <Select
                  onValueChange={(val) => {
                    const student = filteredStudents.find(
                      (s: any) => s.id === val,
                    );
                    setSelectedStudent(student);
                  }}
                >
                  <SelectTrigger className="rounded-2xl h-14 border-slate-100 font-bold bg-slate-50 relative z-50">
                    <SelectValue placeholder="Search or select student..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-60 z-50">
                    {filteredStudents.map((s: any) => (
                      <SelectItem key={s.id} value={s.id} className="py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {s.fullName}
                          </span>
                          <span className="text-[10px] text-slate-400 tracking-widest">
                            {s.id} - (
                            {(
                              (s.totalPackage || 0) - (s.feeReceived || 0)
                            ).toLocaleString()}
                            ){" "}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Payment Date
                </Label>
                <Input
                  type="date"
                  className="rounded-xl h-12 font-bold border-slate-100"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={!selectedStudent}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Fee Type / Item
                </Label>
                <Select
                  disabled={!selectedStudent}
                  value={paymentType}
                  onValueChange={setPaymentType}
                >
                  <SelectTrigger className="rounded-xl h-12 font-bold border-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admission Fee">Admission Fee</SelectItem>
                    <SelectItem value="Tuition Fee Installment">
                      Tuition Installment
                    </SelectItem>
                    <SelectItem value="Semester Fee Installment">
                      Semester Fee
                    </SelectItem>
                    <SelectItem value="Semester Balance">
                      Previous Semester Balance
                    </SelectItem>
                    <SelectItem value="Miscellaneous Funds">
                      Miscellaneous
                    </SelectItem>
                    <SelectItem value="Exam / Test Series Fee">
                      Exam / Test Series Fee
                    </SelectItem>
                    <SelectItem value="Registration Fee">
                      Registration Fee
                    </SelectItem>
                    <SelectItem value="Fine / Penalty">
                      Fine / Penalty
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedStudent && (() => {
              const breakdown = calculateStudentFeeBreakdown(selectedStudent);
              return (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold uppercase text-[9.5px] tracking-wider">Current Installment:</span>
                    <span className="font-mono font-black text-slate-800">Rs. {breakdown.currentInstallmentDue.toLocaleString()}</span>
                  </div>
                  {breakdown.previousArrears > 0 && (
                    <div className="flex items-center justify-between text-xs bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1">
                      <span className="text-rose-700 font-bold uppercase text-[9.5px] tracking-wider">★ Previous Arrears:</span>
                      <span className="font-mono font-black text-rose-700">+ Rs. {breakdown.previousArrears.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                    <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider">Total Payable Now:</span>
                    <span className="font-mono font-black text-emerald-700 text-sm">Rs. {breakdown.totalPayableBeforeDue.toLocaleString()}</span>
                  </div>
                  
                  {/* Quick autofill buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {breakdown.currentInstallmentDue > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(breakdown.currentInstallmentDue))}
                        className="text-[9px] font-black uppercase tracking-wider bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Installment: {breakdown.currentInstallmentDue.toLocaleString()}
                      </button>
                    )}
                    {breakdown.previousArrears > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(breakdown.totalPayableBeforeDue))}
                        className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        + Arrears: {breakdown.totalPayableBeforeDue.toLocaleString()}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(breakdown.totalBalance))}
                      className="text-[9px] font-black uppercase tracking-wider bg-slate-200 hover:bg-slate-300 text-slate-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ml-auto"
                    >
                      Full: {breakdown.totalBalance.toLocaleString()}
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Amount To Receive (Rs.)
              </Label>
              <Input
                type="number"
                placeholder="Enter amount..."
                className="rounded-2xl h-14 text-xl font-black italic pl-6 border-slate-100 focus:border-emerald-500 focus:shadow-emerald-500/10 transition-all"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={!selectedStudent}
              />
              {selectedStudent && (
                <p className="text-[10px] font-bold text-rose-500 italic uppercase">
                  Remaining Arrears / Balance: Rs.{" "}
                  {(
                    (selectedStudent?.totalPackage || 0) -
                    (selectedStudent?.feeReceived || 0)
                  ).toLocaleString()}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Payment Mode (Roznamcha)
                </Label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl h-12 items-center">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Cash")}
                    className={cn(
                      "h-10 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      paymentMethod === "Cash"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Cash Counter
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Bank Transfer")}
                    className={cn(
                      "h-10 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      paymentMethod === "Bank Transfer"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Bank Transfer
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Collected By (Optional)
                </Label>
                <Input
                  placeholder="Staff Name..."
                  className="rounded-xl h-12 font-bold border-slate-100"
                  value={collectedByName}
                  onChange={(e) => setCollectedByName(e.target.value)}
                  disabled={!selectedStudent}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsPaymentOpen(false)}
              className="rounded-xl font-black uppercase text-[10px]"
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedStudent}
              onClick={handlePayment}
              className="bg-emerald-500 hover:bg-emerald-600 focus:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-black uppercase text-[10px] px-8 h-12 shadow-lg shadow-emerald-500/20"
            >
              Confirm & Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Fee Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent className="rounded-[2.5rem] border-slate-100 shadow-2xl max-w-md p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-black text-slate-800 italic">
              Update Fee Structure
            </DialogTitle>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Current: Rs. {selectedStudent?.totalPackage?.toLocaleString()}
            </p>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                New Total Fee Package (Rs.)
              </Label>
              <Input
                type="number"
                placeholder="Enter new total..."
                className="rounded-2xl h-14 text-xl font-black italic pl-6 border-slate-100 focus:border-superior-teal focus:shadow-superior-teal/10 transition-all"
                value={newFeePackage}
                onChange={(e) => setNewFeePackage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsUpdateOpen(false)}
              className="rounded-xl font-black uppercase text-[10px]"
            >
              Close
            </Button>
            <Button
              onClick={handleUpdatePackage}
              className="bg-superior-teal hover:bg-superior-teal/90 text-white rounded-xl font-black uppercase text-[10px] px-8 h-12 shadow-lg shadow-superior-teal/20"
            >
              Update Ledger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="rounded-[2.5rem] border-slate-100 shadow-2xl max-w-2xl p-8 max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-black text-slate-800 italic">
              Student Payment History
            </DialogTitle>
            {selectedStudent && (
              <div className="flex items-center gap-3 pt-2">
                <div className="w-14 h-14 rounded-full bg-superior-teal/10 flex items-center justify-center text-base font-black text-superior-teal overflow-hidden border-2 border-slate-200 shadow-sm shrink-0 ring-2 ring-superior-teal/15">
                  {selectedStudent.photo ? (
                    <img
                      src={selectedStudent.photo}
                      alt=""
                      className="w-full h-full object-cover object-[center_top] rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    (selectedStudent.fullName || 'S').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 leading-tight">
                    {selectedStudent.fullName}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {selectedStudent.id} • {selectedStudent.group || selectedStudent.category}
                  </p>
                </div>
              </div>
            )}
          </DialogHeader>
          <ScrollArea className="flex-1 mt-6">
            <div className="space-y-4">
              {getUnifiedTransactions(selectedStudent).map(
                (h: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-slate-50 rounded-2xl p-6 flex items-center justify-between border border-slate-100 group hover:bg-white hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-slate-100 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <p className="text-lg font-black italic text-slate-800 leading-none mb-1">
                          Rs. {h.amount?.toLocaleString()}
                          <span className="text-[10px] font-bold text-superior-teal ml-2 uppercase not-italic tracking-widest bg-superior-teal/10 px-2 py-0.5 rounded-md">
                            {h.description || "Tuition Fee Installment"}
                          </span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                          {new Date(h.date).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}{" "}
                          • {h.receiptId}
                          {h.recordedBy && (
                            <>
                              <br />
                              <span className="text-slate-500 opacity-80 inline-flex items-center gap-1.5 mt-0.5">
                                Rcvd By: {h.recordedBy}
                                {(h.paymentMethod === 'WhatsApp Bot' || (h.recordedBy || '').toLowerCase().includes('whatsapp')) && (
                                  <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    🤖 Via WhatsApp Bot
                                  </span>
                                )}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() =>
                          generateReceipt(selectedStudent, {
                            amountPaid: h.amount,
                            receiptId: h.receiptId,
                            datePaid: h.date,
                            collectedBy: h.recordedBy,
                            feeType: h.description,
                          })
                        }
                        variant="outline"
                        className="rounded-xl border-slate-200 h-10 font-black text-[10px] uppercase tracking-widest"
                      >
                        <Download size={14} className="mr-2" /> PDF
                      </Button>
                      <Button
                        onClick={() => {
                          const remainingBal = Math.max(0, Number(selectedStudent.totalPackage || selectedStudent.feeLedger?.totalPackage || 0) - Number(selectedStudent.feeReceived || selectedStudent.feeLedger?.totalReceived || 0));
                          const msg = 
`🏛️ *SUPERIOR COLLEGE JAHANIAN*
🧾 *OFFICIAL FEE PAYMENT RECEIPT*
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Student Name:* ${selectedStudent.fullName}
• *Roll Number:* ${selectedStudent.id || selectedStudent.collegeNo || 'N/A'}
• *Amount Received:* *Rs. ${Number(h.amount).toLocaleString()}*
• *Payment Date:* ${new Date(h.date).toLocaleDateString('en-GB')}
• *Payment Head:* ${h.description || 'College Fee Deposit'}
• *Remaining Balance:* Rs. ${Number(remainingBal).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Payment verified and recorded in college accounts ledger.
📞 Accounts Desk: ${data?.settings?.contactNumber || "0331-2211147"}
_Accounts & Finance Department, SGC Jahanian_`;
                          window.open(
                            `https://wa.me/?text=${encodeURIComponent(msg)}`,
                          );
                        }}
                        className="bg-[#25D366] hover:bg-[#25D366]/90 text-white rounded-xl h-10 font-black text-[10px] uppercase tracking-widest"
                      >
                        Share
                      </Button>
                    </div>
                  </div>
                ),
              )}
              {getUnifiedTransactions(selectedStudent).length === 0 && (
                <div className="text-center py-12 opacity-30">
                  <Clock size={48} className="mx-auto mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">
                    No Payment Tracks Found
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Student 360° Dossier Modal */}
      <StudentDossier360
        student={dossierStudent}
        isOpen={Boolean(dossierStudent)}
        onClose={() => setDossierStudent(null)}
        data={data}
        onOpenWhatsApp={(phone) => {
          window.open(`https://web.whatsapp.com/send?phone=${phone}`, '_blank');
        }}
      />

      {/* 3-Copy Bank Challan Modal */}
      {challanStudents && (
        <BankChallanModal
          isOpen={isChallanModalOpen}
          onClose={() => {
            setIsChallanModalOpen(false);
            setChallanStudents(null);
          }}
          students={challanStudents}
          settings={data?.settings}
        />
      )}

      {/* Bulk Fee Reminders WhatsApp Report Modal */}
      <WhatsAppReportModal
        open={isBulkFeeModalOpen}
        onOpenChange={setIsBulkFeeModalOpen}
        title={bulkFeeModalProps.title}
        subtitle={bulkFeeModalProps.subtitle}
        category="fee_reminders"
        items={bulkFeeModalProps.items}
        settings={data?.settings}
      />
      {/* Institutional Ancillary Fees Manager Dialog */}
      <Dialog open={isAncillaryModalOpen} onOpenChange={setIsAncillaryModalOpen}>
        <DialogContent className="rounded-[2.5rem] border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg p-7">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-superior-gold shadow-xs" />
              <DialogTitle className="text-xl font-serif font-black text-slate-900 dark:text-white">
                Ancillary Fees Manager
              </DialogTitle>
              <span className="font-nastaleeq text-xs text-superior-gold font-medium px-2 py-0.5 bg-superior-gold/10 rounded-md ml-auto">
                بورڈ و رجسٹریشن فیس
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Decoupled from the main tuition package. Apply board exam fees (Rs. 4,200), registration, or miscellaneous funds to all scholars or specific streams/classes.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Quick Fee Presets
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { title: "BISE Multan Board Examination Fee", amount: "4200" },
                  { title: "Board Registration Fee", amount: "3500" },
                  { title: "Computer Lab Charges", amount: "2500" },
                  { title: "Sports & Misc Fund", amount: "1500" },
                ].map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => setAncillaryForm(prev => ({ ...prev, title: preset.title, amount: preset.amount }))}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-superior-teal/10 hover:border-superior-teal/30 hover:text-superior-teal text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {preset.title.split(" ")[0]} (Rs. {preset.amount})
                  </button>
                ))}
              </div>
            </div>

            {/* Fee Title */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Fee Title / Institutional Category
              </Label>
              <Input
                value={ancillaryForm.title}
                onChange={(e) => setAncillaryForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. BISE Board Examination Fee"
                className="h-11 rounded-xl font-bold border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Amount & Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Amount Due (Rs.)
                </Label>
                <Input
                  type="number"
                  value={ancillaryForm.amount}
                  onChange={(e) => setAncillaryForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="4200"
                  className="h-11 rounded-xl font-black font-mono text-emerald-700 dark:text-emerald-400 border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Due Date
                </Label>
                <Input
                  type="date"
                  value={ancillaryForm.dueDate}
                  onChange={(e) => setAncillaryForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="h-11 rounded-xl font-bold border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            {/* Target Scope Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Target Program Stream
                </Label>
                <Select
                  value={ancillaryForm.targetProgram}
                  onValueChange={(val) => setAncillaryForm(prev => ({ ...prev, targetProgram: val }))}
                >
                  <SelectTrigger className="h-11 rounded-xl font-bold">
                    <SelectValue placeholder="All Streams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs & Streams</SelectItem>
                    <SelectItem value="fsc">Inter (2-Yr FSc / ICS / ICom)</SelectItem>
                    <SelectItem value="bs">BS (4-Yr Degree Programs)</SelectItem>
                    <SelectItem value="ads">ADS (2-Yr Associate Degree)</SelectItem>
                    <SelectItem value="dit">DIT (Diploma in IT)</SelectItem>
                    <SelectItem value="ukl3">UK Level 3 Diploma</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Target Academic Stage
                </Label>
                <Select
                  value={ancillaryForm.targetStage}
                  onValueChange={(val) => setAncillaryForm(prev => ({ ...prev, targetStage: val }))}
                >
                  <SelectTrigger className="h-11 rounded-xl font-bold">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Academic Stages</SelectItem>
                    <SelectItem value="part1">Part-1 Fresh (1st Year)</SelectItem>
                    <SelectItem value="part2">Part-2 Senior (2nd Year)</SelectItem>
                    <SelectItem value="dit-p1">DIT Part-1</SelectItem>
                    <SelectItem value="dit-p2">DIT Part-2</SelectItem>
                    <SelectItem value="uk-yr1">UK Level 3 Year-1</SelectItem>
                    <SelectItem value="uk-yr2">UK Level 3 Year-2</SelectItem>
                    <SelectItem value="sem1">BS Semester 1</SelectItem>
                    <SelectItem value="sem2">BS Semester 2</SelectItem>
                    <SelectItem value="sem3">BS Semester 3</SelectItem>
                    <SelectItem value="sem4">BS Semester 4</SelectItem>
                    <SelectItem value="sem5">BS Semester 5</SelectItem>
                    <SelectItem value="sem6">BS Semester 6</SelectItem>
                    <SelectItem value="sem7">BS Semester 7</SelectItem>
                    <SelectItem value="sem8">BS Semester 8</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Calculation Preview */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Independent Ledger Entry (Leaves Tuition Package intact)
                </span>
              </div>
              <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                Rs. {Number(ancillaryForm.amount || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAncillaryModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              disabled={isApplyingAncillary}
              onClick={handleApplyAncillaryFee}
              className="bg-superior-teal hover:bg-superior-teal/90 text-white rounded-xl font-bold px-6 shadow-md cursor-pointer"
            >
              {isApplyingAncillary ? "Applying Fee..." : "Apply to Matching Scholars"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
