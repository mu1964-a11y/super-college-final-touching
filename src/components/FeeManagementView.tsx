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
} from "lucide-react";
import { motion } from "motion/react";
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

import { getUnifiedTransactions } from "../utils/fee";
import { useDebounce } from "../hooks/useDebounce";


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
  const [paymentDate, setPaymentDate] = React.useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [collectedByName, setCollectedByName] = React.useState<string>("");
  const [newFeePackage, setNewFeePackage] = React.useState<string>("");
  const [activeRowStudent, setActiveRowStudent] = React.useState<any>(null);

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
          fullName: a.fullName,
          fatherName: a.fatherName,
          gender: derivedGender,
          category: a.category || "",
          group: a.group || "",
          section: a.section || "",
          totalPackage: a.totalPackage || 0,
          feeReceived: a.feeReceived || 0,
          status: "Active",
          feeHistory: a.feeHistory || [],
          feeLedger: a.feeLedger || null,
        });
      }
    });

    // Filter by program here so executive stats reflect the current program
    if (program) {
      raw = raw.filter((s: any) => {
        const identifier = `${s.category || ""} ${s.group || ""}`.toLowerCase();
        if (program === "fsc")
          return (
            !identifier.includes("dit") &&
            !identifier.includes("level 3") &&
            !identifier.includes("uk") &&
            !identifier.includes("bs ")
          );
        if (program === "dit") return identifier.includes("dit");
        if (program === "ukl3")
          return identifier.includes("level 3") || identifier.includes("uk");
        if (program === "bs") return identifier.includes("bs");
        return true;
      });
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

    await data.recordFeePayment(selectedStudent.id, {
      id: `pay-${Date.now()}`,
      month: monthNames[payDate.getMonth()],
      year: payDate.getFullYear(),
      amountDue:
        (selectedStudent.totalPackage || 0) -
        (selectedStudent.feeReceived || 0),
      amountPaid: amount,
      status: "Paid",
      datePaid: payDate.toISOString(),
      receiptId: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
      feeType: paymentType,
      collectedBy: collectedByName.trim() || undefined,
    });

    setIsPaymentOpen(false);
    setPaymentAmount("");
    setPaymentType("Tuition Fee Installment");
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

    filteredStudents.forEach((student: any, index: number) => {
      if (index > 0 && index % 4 === 0) {
        doc.addPage();
      }

      const slipIndex = index % 4;
      const yOffset = slipIndex * 210.47;

      // Box coords
      const boxX = 20;
      const boxY = yOffset + 10;
      const boxW = 555;
      const boxH = 190;

      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(253, 254, 254);
      doc.roundedRect(boxX, boxY, boxW, boxH, 6, 6, "FD");

      // Header: College Name
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(5, 59, 50); // Superior Teal
      doc.text(collegeNameText, 595.28 / 2, boxY + 20, { align: "center" });

      // Horizontal Divider
      doc.setDrawColor(220, 220, 220);
      doc.line(boxX, boxY + 30, boxX + boxW, boxY + 30);

      // Vertical Divider
      const splitX = 180;
      doc.line(splitX, boxY + 30, splitX, boxY + boxH);

      // --- Left Column ---
      let leftY = boxY + 50;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("FEE VOUCHER", 30, leftY);
      leftY += 18;

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        "Student ID: " +
          (student.id ? student.id.toString().toUpperCase() : "N/A"),
        30,
        leftY,
      );
      leftY += 20;

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
        leftY += Math.max(12, valText.length * 10);
      };

      renderLeftField("Name: ", student.fullName);
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
        boxY + 55,
      );

      doc.setFontSize(9);
      doc.setTextColor(220, 38, 38);
      doc.text(`Due Date: ${dueDateStr}`, 560, boxY + 53, { align: "right" });

      // Table headers
      const thY = boxY + 80;
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("Description", rightX, thY);
      doc.text("Amount", 560, thY, { align: "right" });

      doc.setDrawColor(230, 230, 230);
      doc.line(rightX, thY + 5, 560, thY + 5);

      // Table Content
      const tdY = thY + 20;
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

      // Totals Area
      const totalsY = boxY + 135;
      doc.line(380, totalsY - 10, 560, totalsY - 10);

      doc.text("Subtotal", 380, totalsY);
      doc.text(`Rs${totalPackage.toLocaleString()}`, 560, totalsY, {
        align: "right",
      });

      doc.line(380, totalsY + 6, 560, totalsY + 6);

      doc.text("Total Paid", 380, totalsY + 20);
      doc.text(`Rs${received.toLocaleString()}`, 560, totalsY + 20, {
        align: "right",
      });

      doc.setFont("helvetica", "bold");
      doc.text("Remaining Balance", 380, totalsY + 38);
      doc.text(`Rs${balance.toLocaleString()}`, 560, totalsY + 38, {
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
    doc.text(`Student Name: ${student.fullName}`, 20, 68);
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

    renderField("Student Name: ", student.fullName, 55, 175);
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
      sections = sections.filter((s: any) => {
        const pg = (s.program || "").toLowerCase();
        
        const isDIT = pg.includes("dit") || pg.includes("diploma");
        const isBS = pg.includes("bs") || pg.includes("b.s");
        const isUKL3 = pg.includes("uk") || pg.includes("level 3") || pg.includes("ukl3");

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

    return Array.from(
      new Set(sections.map((s: any) => s.name).filter(Boolean))
    ) as string[];
  }, [data?.settings?.predefinedSections, groupFilter, genderFilter]);

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      const nameMatch = (s.fullName || s.full_name || "")
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
      const idMatch = (s.id || "")
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
      const fatherMatch = (s.fatherName || s.father_name || "")
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
      const matchesSearch = nameMatch || idMatch || fatherMatch;

      const balance = (s.totalPackage || 0) - (s.feeReceived || 0);
      const received = s.feeReceived || 0;

      let effectiveStatus = statusFilter;
      if (activeTab === "defaulters") effectiveStatus = "not-paid";

      // User Request Filters:
      // - Paid (Full payment)
      // - Pending Installments (Some paid, more to go)
      // - Not Paid at all (received = 0)
      const matchesStatus =
        effectiveStatus === "all" ||
        (effectiveStatus === "paid" && balance <= 0 && received > 0) ||
        (effectiveStatus === "pending" && balance > 0 && received > 0) ||
        (effectiveStatus === "not-paid" && received <= 0);

      const pFilter = groupFilter.toLowerCase();
      let matchesGroup = true;
      if (pFilter !== "all") {
        const sGroup = (s.group || "").toLowerCase();
        const sCategory = (s.category || "").toLowerCase();
        const identifier = `${sGroup} ${sCategory}`;
        
        const isDIT = sGroup.includes("dit") || sGroup.includes("diploma") || sCategory.includes("dit") || sCategory.includes("diploma");
        const isBS = sGroup.includes("bs") || sGroup.includes("b.s") || sCategory.includes("bs");
        const isUKL3 = sGroup.includes("uk") || sGroup.includes("level 3") || sGroup.includes("l3") || sCategory.includes("uk");

        if (pFilter === "fsc") {
          matchesGroup = !isDIT && !isBS && !isUKL3;
        } else if (pFilter === "dit" || pFilter.includes("diploma")) {
          matchesGroup = isDIT;
        } else if (pFilter === "bs" || pFilter.includes("b.s")) {
          matchesGroup = isBS;
        } else if (
          pFilter === "ukl3" ||
          pFilter.includes("uk") ||
          pFilter.includes("level 3")
        ) {
          matchesGroup = isUKL3;
        } else {
          matchesGroup = identifier.includes(pFilter);
        }
      }
      const matchesSection =
        sectionFilter === "all" ||
        (s.section || "").trim().toLowerCase() ===
          sectionFilter.trim().toLowerCase();

      return matchesSearch && matchesStatus && matchesGroup && matchesSection;
    });
  }, [
    students,
    debouncedSearch,
    statusFilter,
    activeTab,
    groupFilter,
    sectionFilter,
  ]);



  const isSuperAdmin = data.user?.email === "mughalazam1964@gmail.com";
  const userPermission = data.permissions?.find((p: any) => p.email === data.user?.email);
  const isAdmin = isSuperAdmin || userPermission?.isAdmin;

  return (
    <div className="space-y-6 pb-10">
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="rounded-2xl border-none shadow-xl shadow-slate-200/50 overflow-hidden relative group bg-gradient-to-br from-white to-slate-50 h-full">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-superior-teal/10 flex items-center justify-center text-superior-teal">
                    <Wallet size={16} />
                  </div>
                  <Badge className="bg-superior-teal/10 text-superior-teal border-none font-black text-[9px] uppercase">
                    Target
                  </Badge>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Expected Revenue
                  </p>
                  <h3 className="text-lg font-black text-slate-900 leading-none italic">
                    Rs. {stats.totalExpected.toLocaleString()}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="rounded-2xl border-none shadow-xl shadow-slate-200/50 overflow-hidden relative group bg-gradient-to-br from-white to-emerald-50 h-full">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <ArrowUpRight size={16} />
                  </div>
                  <Badge className="bg-emerald-500 text-white border-none font-black text-[9px] uppercase">
                    {stats.collectionRate.toFixed(0)}% Rate
                  </Badge>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Total Received
                  </p>
                  <h3 className="text-lg font-black text-emerald-600 leading-none italic">
                    Rs. {stats.totalReceived.toLocaleString()}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="rounded-2xl border-none shadow-xl shadow-slate-200/50 overflow-hidden relative group bg-gradient-to-br from-white to-rose-50 h-full">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                    <ArrowDownRight size={16} />
                  </div>
                  <Badge
                    variant="destructive"
                    className="bg-rose-500 text-white border-none font-black text-[9px] uppercase"
                  >
                    Arrears
                  </Badge>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Outstanding
                  </p>
                  <h3 className="text-lg font-black text-rose-600 leading-none italic">
                    Rs. {stats.outstanding.toLocaleString()}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="rounded-2xl border-none shadow-xl shadow-slate-200/50 overflow-hidden relative group bg-gradient-to-br from-white to-superior-gold/5 h-full">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-superior-gold/10 flex items-center justify-center text-superior-gold">
                    <Users size={16} />
                  </div>
                  <Badge className="bg-superior-gold text-white border-none font-black text-[9px] uppercase">
                    {stats.defaulters} Defaulters
                  </Badge>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Total Strength
                  </p>
                  <h3 className="text-lg font-black text-superior-teal leading-none italic">
                    {stats.totalStudents} Students
                  </h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display font-black text-superior-teal tracking-tight flex items-center gap-3 italic">
            <CreditCard size={32} className="text-superior-gold" />
            Fee Module
          </h2>
          <p className="text-slate-500 mt-1 font-bold tracking-tight">
            Student Ledger Control & Transaction Verification
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {activeRowStudent && (
            <>
              <Button
                onClick={() => generateFeeStatement(activeRowStudent)}
                variant="outline"
                className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-emerald-100 transition-all"
              >
                <Download size={16} className="mr-2" /> Fee Statement
              </Button>
              {getUnifiedTransactions(activeRowStudent) &&
                getUnifiedTransactions(activeRowStudent).length > 0 && (
                  <Button
                    onClick={() => {
                      generateReceipt(
                        activeRowStudent,
                        getUnifiedTransactions(activeRowStudent)[0],
                      );
                    }}
                    variant="outline"
                    className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-emerald-100 transition-all"
                  >
                    <Download size={16} className="mr-2" /> Latest Receipt
                  </Button>
                )}
            </>
          )}
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-slate-50 transition-all"
          >
            <Download size={16} className="mr-2 text-superior-gold" /> Export
            CSV
          </Button>
          <Button
            onClick={handlePrintFeeVouchers}
            variant="outline"
            className="rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <Download size={16} className="mr-2 text-red-500" /> Print Vouchers
          </Button>
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-slate-50 transition-all"
          >
            <Download size={16} className="mr-2 text-emerald-600" /> Export
            Excel
          </Button>
          <Button
            onClick={() => {
              setSelectedStudent(null);
              setPaymentAmount("");
              setIsPaymentOpen(true);
            }}
            className="h-12 px-8 rounded-xl bg-superior-teal text-white font-black uppercase tracking-widest text-[10px] hover:bg-superior-teal/90 transition-all shadow-xl shadow-superior-teal/10 flex items-center justify-center"
          >
            <Plus size={18} className="mr-2" /> Add New Fee
          </Button>
        </div>
      </div>

      {/* Tab Navigation Area */}
      <div className="flex border-b border-slate-200 hide-scrollbar overflow-x-auto w-full mb-6">
        {["collect", "defaulters"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 px-8 font-black text-[11px] uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${activeTab === tab ? "border-superior-teal text-superior-teal" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            {tab === "collect" && "Collect Fee"}
            {tab === "defaulters" && "Defaulters"}
          </button>
        ))}
      </div>

      {/* Group Navigation Tabs */}
      <Tabs value={groupFilter} onValueChange={(val) => setGroupFilter(val)} className="w-full mb-6">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl w-full flex items-center justify-start overflow-x-auto scrollbar-hide h-auto border border-slate-200/50">
          <TabsTrigger value="all" className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            All Groups
          </TabsTrigger>
          <TabsTrigger value="fsc" className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <School size={15} className="mr-2 inline-block" />
            Inter
          </TabsTrigger>
          <TabsTrigger value="dit" className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <GraduationCap size={15} className="mr-2 inline-block" />
            DIT
          </TabsTrigger>
          <TabsTrigger value="ukl3" className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <Globe size={15} className="mr-2 inline-block" />
            UKL3
          </TabsTrigger>
          <TabsTrigger value="bs" className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <GraduationCap size={15} className="mr-2 inline-block" />
            BS
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Content Area */}
      <div className="space-y-6">
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <CardTitle className="text-xl font-display font-black text-slate-800 uppercase tracking-tight italic">
                  {activeTab === "collect" && "Collect Fee Hub"}
                  {activeTab === "defaulters" && "Defaulters List"}
                </CardTitle>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                  Real-time Individual Transaction Access
                </p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger className="w-28 rounded-xl border-slate-100 h-10 font-bold text-xs uppercase tracking-tighter">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    <SelectItem value="all" className="font-bold text-xs">
                      All Sections
                    </SelectItem>
                    {sectionOptions.map((sec) => (
                      <SelectItem
                        key={sec}
                        value={sec}
                        className="font-bold text-xs"
                      >
                        {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="w-28 rounded-xl border-slate-100 h-10 font-bold text-xs uppercase tracking-tighter">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    <SelectItem value="all" className="font-bold text-xs">
                      All Genders
                    </SelectItem>
                    <SelectItem value="Male" className="font-bold text-xs">
                      Boys Only
                    </SelectItem>
                    <SelectItem value="Female" className="font-bold text-xs">
                      Girls Only
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1 md:w-48">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                    size={16}
                  />
                  <Input
                    placeholder="Search name or ID..."
                    className="pl-10 rounded-xl bg-white border-slate-100 italic focus:border-superior-teal/30 focus:shadow-md transition-all h-10 text-xs font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 border-b-0">
            <div className="overflow-x-auto hide-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm border-b border-slate-100">
                  <TableRow className="border-none">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest pl-8 h-12">
                      Student Profile
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest h-12">
                      Total Package
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest h-12">
                      Total Received
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest h-12">
                      Current Balance
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest h-12">
                      Progress
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right pr-8 h-12">
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
                                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-sm font-black text-superior-teal overflow-hidden border border-slate-200">
                                  {student.photo ? (
                                    <img
                                      src={student.photo}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    student.fullName?.charAt(0)?.toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <p className="font-black text-slate-700 leading-none mb-1 group-hover:text-superior-teal transition-colors italic">
                                    {student.fullName}
                                  </p>
                                  <div className="flex items-center gap-2">
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
                            <TableCell className="text-right pr-8">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStudent(student);
                                    setIsPaymentOpen(true);
                                  }}
                                  size="sm"
                                  className="h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 font-bold uppercase tracking-widest text-[10px]"
                                >
                                  Collect
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 outline-none transition-all hover:text-slate-600"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="rounded-2xl border-slate-100 p-2 shadow-2xl w-56"
                                  >
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
                                      className="gap-3 p-3 rounded-xl font-black text-xs text-emerald-600 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 uppercase tracking-widest italic"
                                    >
                                      <Download size={14} /> Download Fee
                                      Statement
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
                                          <Download size={14} /> Download Latest
                                          Receipt
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
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="rounded-[2.5rem] border-slate-100 shadow-2xl max-w-md p-8 overflow-visible">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-black text-slate-800 italic">
              Record Fee Payment
            </DialogTitle>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {selectedStudent
                ? `For: ${selectedStudent.fullName}`
                : "New Fee Record"}
            </p>
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
                  Current Balance: Rs.{" "}
                  {(
                    (selectedStudent?.totalPackage || 0) -
                    (selectedStudent?.feeReceived || 0)
                  ).toLocaleString()}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Collected By (Optional)
              </Label>
              <Input
                placeholder="Enter name (or leave empty to use system role)..."
                className="rounded-xl h-12 font-bold border-slate-100"
                value={collectedByName}
                onChange={(e) => setCollectedByName(e.target.value)}
                disabled={!selectedStudent}
              />
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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {selectedStudent?.fullName} ({selectedStudent?.id})
            </p>
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
                              <span className="text-slate-500 opacity-80">
                                Rcvd By: {h.recordedBy}
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
                          const msg = `SCJ Receipt: Received Rs. ${h.amount} from ${selectedStudent.fullName} on ${new Date(h.date).toLocaleDateString()}. Balance: Rs. ${selectedStudent.feeLedger?.remainingBalance || selectedStudent.totalPackage - (selectedStudent.feeReceived || 0)}`;
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
    </div>
  );
}
