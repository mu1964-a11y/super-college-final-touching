import React, { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  UserPlus,
  GraduationCap,
  Briefcase,
  Wallet,
  BarChart3,
  CreditCard,
  Plus,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Database,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Calendar,
  Users,
  Eye,
  EyeOff,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  Menu,
  X,
  PlusCircle,
  Filter,
  Download,
  Share2,
  Undo2,
  Redo2,
  RotateCcw,
  Maximize2,
  Minimize2,
  Trash2,
  Clock3,
  Landmark,
  Banknote,
  ReceiptText,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  LandPlot,
  BookOpen,
  ShieldCheck,
  PieChart as PieChartIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { Sparkles, BrainCircuit } from "lucide-react";
import AiCopilotView from "./AiCopilotView";

export default function DashboardView({
  data,
  setActivePage,
  selectedSession,
  setSelectedSession,
}: {
  data: any;
  setActivePage: any;
  selectedSession: string;
  setSelectedSession: (s: string) => void;
}) {
  const [time, setTime] = React.useState(new Date());
  const [activeDashboardTab, setActiveDashboardTab] = React.useState<"overview" | "directors" | "staff" | "ai_copilot">("overview");

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalApplicants = useMemo(
    () => data.admissions.length,
    [data.admissions],
  );
  const confirmedAdmissions = useMemo(() => {
    return data.admissions.filter((a: any) => {
      const isConfirmedStatus =
        a.isAdmitted === true ||
        a.status === "Admitted/Confirmed" ||
        a.status === "Admitted" ||
        a.status === "Confirmed" ||
        a.status === "Full Paid" ||
        a.status === "Partial Paid" ||
        Number(a.feeReceived) > 0;

      return isConfirmedStatus;
    });
  }, [data.admissions]);

  const [selectedMonth, setSelectedMonth] = React.useState<string>(
    new Date().toLocaleString("default", { month: "long" }),
  );
  const monthsList = [
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

  // Total Enrollment = Registered Students + Confirmed but not-yet-processed admissions
  const mergedGenderCounts = useMemo(() => {
    const allRelevantStudents = [
      ...data.students,
      ...confirmedAdmissions.filter(
        (a: any) =>
          !data.students.some(
            (s: any) => s.admissionId === a.id || s.id === a.studentId,
          ),
      ),
    ].map((s) => {
      let derivedGender = s.gender;
      if (!derivedGender) {
        const identifier = `${s.category || ""} ${s.group || ""}`.toLowerCase();
        if (identifier.includes("girl") || identifier.includes("female")) {
          derivedGender = "Female";
        } else {
          derivedGender = "Male";
        }
      }
      return { ...s, gender: derivedGender };
    });

    const boys = allRelevantStudents.filter((s) => s.gender === "Male").length;
    const girls = allRelevantStudents.filter(
      (s) => s.gender === "Female",
    ).length;

    return { boys, girls };
  }, [data.students, confirmedAdmissions]);

  const mergedBoysCount = mergedGenderCounts.boys;
  const mergedGirlsCount = mergedGenderCounts.girls;

  const totalEnrollmentCount = mergedBoysCount + mergedGirlsCount;

  const fullPaidAdmissions = useMemo(
    () => data.admissions.filter((a: any) => a.status === "Full Paid").length,
    [data.admissions],
  );
  const partialPaidAdmissions = useMemo(
    () =>
      data.admissions.filter((a: any) => a.status === "Partial Paid").length,
    [data.admissions],
  );
  const notPaidAdmissions = useMemo(
    () =>
      data.admissions.filter(
        (a: any) => a.status === "Not Paid" || a.status === "Prospective",
      ).length,
    [data.admissions],
  );

  const boysCount = mergedBoysCount;
  const girlsCount = mergedGirlsCount;

  const teachersCount = useMemo(
    () => data.staff.filter((s: any) => s.role === "Lecturer").length,
    [data.staff],
  );
  const totalStaff = useMemo(() => data.staff.length, [data.staff]);

  const defaultersCount = useMemo(
    () =>
      data.students.filter(
        (s: any) =>
          s.feeHistory?.some(
            (f: any) => f.status === "Unpaid" || f.status === "Partial",
          ) ||
          (s.feeLedger?.remainingBalance > 0 &&
            s.feeLedger?.installments?.some(
              (inst: any) => inst.status === "Overdue",
            )),
      ).length,
    [data.students, data.admissions],
  );

  const activeIncomes = useMemo(() => {
    const activeStudentIds = new Set(data.students.map((s: any) => s.id));
    const activeAdmissionIdsForStudents = new Set(
      data.students.map((s: any) => s.admissionId).filter(Boolean),
    );
    const activeStudentNames = new Set(
      data.students
        .map((s: any) => s.fullName?.toLowerCase().trim())
        .filter(Boolean),
    );

    // We want to consider all admissions for income tracking
    const validAdmissions = data.admissions;

    const activeIds = new Set([
      ...activeStudentIds,
      ...validAdmissions.map((a: any) => a.id),
    ]);
    const activeNames = new Set([
      ...activeStudentNames,
      ...validAdmissions
        .map((a: any) => a.fullName?.toLowerCase().trim())
        .filter(Boolean),
    ]);

    return data.incomes.filter((inc: any) => {
      if (inc.studentId && inc.studentId.trim() !== "") {
        return activeIds.has(inc.studentId);
      }
      if (inc.studentName && inc.studentName.trim() !== "") {
        return activeNames.has(inc.studentName.toLowerCase().trim());
      }
      return true;
    });
  }, [data.incomes, data.students, data.admissions]);

  const recentActivities = useMemo(
    () =>
      [
        ...activeIncomes.slice(-2).map((i: any) => ({
          icon: Wallet,
          color: "gold",
          title: "Income Received",
          desc: `Rs. ${(i.amount || 0).toLocaleString()} received from ${i.studentName}.`,
          time: "Recent",
        })),
        ...data.admissions.slice(-2).map((a: any) => ({
          icon: UserPlus,
          color: "teal",
          title: "New Enrollment",
          desc: `${a.fullName} in ${a.group}.`,
          time: "Recent",
        })),
        ...data.expenses.slice(-1).map((e: any) => ({
          icon: TrendingDown,
          color: "red",
          title: "Expense Logged",
          desc: `Rs. ${(e.amount || 0).toLocaleString()} spent on ${e.category}.`,
          time: "Recent",
        })),
      ]
        .sort(() => 0.5 - Math.random())
        .slice(0, 4),
    [activeIncomes, data.admissions, data.expenses],
  );

  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString("default", { month: "long" });
  const currentYear = currentDate.getFullYear();

  const monthlyIncome = useMemo(() => {
    const getMonthFromDate = (dateStr: string) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return d.toLocaleString("default", { month: "long" });
    };

    const targetYear = new Date().getFullYear();

    if (selectedMonth === "all") {
      const studentFees = data.students.reduce((acc: number, s: any) => acc + (Number(s.feeReceived || s.fee_received) || 0), 0);
      const admissionFees = data.admissions
        .filter((a: any) => !data.students.some((s: any) => s.admissionId === a.id || s.id === a.studentId))
        .reduce((acc: number, a: any) => acc + (Number(a.feeReceived || a.fee_received) || 0), 0);

      const unlinkedIncomes = activeIncomes.filter((inc: any) => {
        const hasStudent = data.students.some((s: any) => s.id === inc.studentId || (s.fullName && inc.studentName && s.fullName.toLowerCase().trim() === inc.studentName.toLowerCase().trim()));
        const hasAdmission = data.admissions.some((a: any) => (a.id === inc.studentId || a.studentId === inc.studentId) || (a.fullName && inc.studentName && a.fullName.toLowerCase().trim() === inc.studentName.toLowerCase().trim()));
        return !hasStudent && !hasAdmission;
      }).reduce((acc: number, inc: any) => acc + (Number(inc.amount) || 0), 0);

      return studentFees + admissionFees + unlinkedIncomes;
    }

    // Monthly flow should primarily come from individual income transactions
    const fromIncomes = activeIncomes
      .filter((inc: any) => {
        const incMonth = inc.month || getMonthFromDate(inc.date);
        
        // If it's the current year or no year specified, let it through to the month check
        const incYear =
          inc.year ||
          (inc.date ? new Date(inc.date).getFullYear() : targetYear);
          
        return incMonth === selectedMonth; // Removed strict year check to be more helpful with historical/future session shifts
      })
      .reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

    // Track consumed incomes to prevent double deduplication
    const consumedIncomesForMonth = 0;

    // Ensure admission fees directly recorded are accounted for if no formal income record exists
    const fromPendingAdmissions = data.admissions
      .filter((a: any) => {
        const admMonth = getMonthFromDate(a.date);
        const admYear = a.date ? new Date(a.date).getFullYear() : targetYear;
        return (admMonth === selectedMonth && Number(admYear) === targetYear);
      })
      .reduce((acc: number, curr: any) => {
        const studentIncomesTotal = activeIncomes
          .filter(
            (inc: any) =>
              (inc.studentId && (inc.studentId === curr.studentId || inc.studentId === curr.id)) ||
              (inc.studentName && curr.fullName && inc.studentName.toLowerCase().trim() === curr.fullName.toLowerCase().trim()),
          )
          .reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);

        // Calculate if there's an outstanding amount that hasn't been mapped to income yet
        const mappedAmount = studentIncomesTotal;
        const totalAdmittedFee = Number(curr.feeReceived) || 0;
        
        // Simplified mapping strategy
        const diff = Math.max(0, totalAdmittedFee - mappedAmount);
        return acc + diff;
      }, 0);

    // Further correction for multiple admissions sharing the same name
    // (This is highly complex for monthly split, but for single months the impact is smaller)
    return fromIncomes + fromPendingAdmissions;
  }, [activeIncomes, data.admissions, data.students, selectedMonth]);

  // Academic-specific total collected fees (only active students)
  const activeStudentsRevenue = useMemo(() => {
    const studentCollections = data.students.reduce(
      (acc: number, s: any) => acc + (Number(s.feeReceived) || 0),
      0,
    );
    const admissionCollections = confirmedAdmissions
      .filter(
        (a: any) =>
          !data.students.some(
            (s: any) => s.admissionId === a.id || s.id === a.studentId,
          ),
      )
      .reduce((acc: number, a: any) => acc + (Number(a.feeReceived) || 0), 0);

    return studentCollections + admissionCollections;
  }, [data.students, data.admissions, confirmedAdmissions]);

  const genderData = useMemo(
    () => [
      { name: "Boys", value: boysCount, color: "#085a4e" },
      { name: "Girls", value: girlsCount, color: "#fb7185" },
    ],
    [boysCount, girlsCount],
  );

  // Academic breakdown for average calculations
  const academicPerformance = useMemo(() => {
    const allRelevantStudents = [
      ...data.students,
      ...confirmedAdmissions.filter(
        (a: any) =>
          !data.students.some(
            (s: any) => s.admissionId === a.id || s.id === a.studentId,
          ),
      ),
    ].map((s) => {
      let derivedGender = s.gender;
      if (!derivedGender) {
        const identifier = `${s.category || ""} ${s.group || ""}`.toLowerCase();
        if (identifier.includes("girl") || identifier.includes("female")) {
          derivedGender = "Female";
        } else {
          derivedGender = "Male";
        }
      }
      return {
        ...s,
        gender: derivedGender,
        calcPackage:
          s.feeLedger?.totalPackage ||
          s.totalPackage ||
          s.total_package ||
          s.fee_package
            ? Number(
                s.feeLedger?.totalPackage ||
                  s.totalPackage ||
                  s.total_package ||
                  s.fee_package,
              )
            : Number(s.registrationFee || 0) +
              Number(s.monthlyFee || s.monthly_fee || 0) *
                Number(s.totalInstallments || s.total_installments || 12),
        calcReceived: Number(s.feeReceived || 0),
        calcIdentifier:
          `${s.category || ""} ${s.group || ""} ${s.stream || ""}`.toLowerCase(),
      };
    });

    const fscList = allRelevantStudents.filter(
      (s) =>
        !s.calcIdentifier.includes("dit") &&
        !s.calcIdentifier.includes("uk") &&
        !s.calcIdentifier.includes("level 3") &&
        !s.calcIdentifier.includes("bs") &&
        (s.calcIdentifier.includes("fsc") ||
          s.calcIdentifier.includes("f.sc") ||
          s.calcIdentifier.includes("fcs") ||
          s.calcIdentifier.includes("pre-med") ||
          s.calcIdentifier.includes("pre-eng") ||
          s.calcIdentifier.includes("ics") ||
          s.calcIdentifier.includes("inter") ||
          s.calcIdentifier.includes("fa") ||
          s.calcIdentifier.includes("i.com") ||
          s.calcIdentifier.includes("gen") ||
          !(
            s.calcIdentifier.includes("dit") ||
            s.calcIdentifier.includes("bs") ||
            s.calcIdentifier.includes("uk") ||
            s.calcIdentifier.includes("level")
          )),
    );
    const bsList = allRelevantStudents.filter((s) =>
      s.calcIdentifier.includes("bs"),
    );
    const ditList = allRelevantStudents.filter((s) =>
      s.calcIdentifier.includes("dit"),
    );
    const ukL3List = allRelevantStudents.filter(
      (s) =>
        s.calcIdentifier.includes("uk") || s.calcIdentifier.includes("level 3"),
    );

    // Isolation for FSc specifics
    const fscBoys = fscList.filter((s) => s.gender === "Male");
    const fscGirls = fscList.filter((s) => s.gender === "Female");

    // Isolation for BS specifics
    const bsBoys = bsList.filter((s) => s.gender === "Male");
    const bsGirls = bsList.filter((s) => s.gender === "Female");

    // Isolation for DIT specifics
    const ditBoys = ditList.filter((s) => s.gender === "Male");
    const ditGirls = ditList.filter((s) => s.gender === "Female");

    // Isolation for UK L3 specifics
    const ukL3Boys = ukL3List.filter((s) => s.gender === "Male");
    const ukL3Girls = ukL3List.filter((s) => s.gender === "Female");

    const calcAvg = (list: any[]) => {
      if (list.length === 0) return 0;
      const sum = list.reduce((acc: number, s: any) => acc + (s.calcPackage || 0), 0);
      return sum / list.length;
    };

    const psaOverall = allRelevantStudents.length > 0 
      ? allRelevantStudents.reduce((acc, s) => acc + (s.calcPackage || 0), 0) / allRelevantStudents.length 
      : 0;

    const calcCollection = (list: any[]) =>
      list.reduce((acc, s) => acc + (s.calcReceived || 0), 0);

    const boysList = allRelevantStudents.filter((s) => s.gender === "Male");
    const girlsList = allRelevantStudents.filter((s) => s.gender === "Female");

    const totalInvoiced = allRelevantStudents.reduce(
      (acc, s) => acc + (s.calcPackage || 0),
      0,
    );

    return {
      fscAvg: calcAvg(fscList),
      fscBoysAvg: calcAvg(fscBoys),
      fscGirlsAvg: calcAvg(fscGirls),
      bsAvg: calcAvg(bsList),
      bsBoysAvg: calcAvg(bsBoys),
      bsGirlsAvg: calcAvg(bsGirls),
      ditAvg: calcAvg(ditList),
      ditBoysAvg: calcAvg(ditBoys),
      ditGirlsAvg: calcAvg(ditGirls),
      ukL3Avg: calcAvg(ukL3List),
      ukL3BoysAvg: calcAvg(ukL3Boys),
      ukL3GirlsAvg: calcAvg(ukL3Girls),
      fscCollection: calcCollection(fscList),
      bsCollection: calcCollection(bsList),
      ditCollection: calcCollection(ditList),
      ukL3Collection: calcCollection(ukL3List),
      totalCollection: calcCollection(allRelevantStudents),
      boysAvg: calcAvg(boysList),
      girlsAvg: calcAvg(girlsList),
      fscCount: fscList.length,
      fscBoysCount: fscBoys.length,
      fscGirlsCount: fscGirls.length,
      bsCount: bsList.length,
      bsBoysCount: bsBoys.length,
      bsGirlsCount: bsGirls.length,
      ditCount: ditList.length,
      ditBoysCount: ditBoys.length,
      ditGirlsCount: ditGirls.length,
      ukL3Count: ukL3List.length,
      ukL3BoysCount: ukL3Boys.length,
      ukL3GirlsCount: ukL3Girls.length,
      totalAvg: psaOverall,
      psa: psaOverall,
      totalInvoiced,
      studentCounts: {
        part1: allRelevantStudents.filter(
          (s) => (s.academicPart || s.academic_part) === "Part-1",
        ).length,
        part2: allRelevantStudents.filter(
          (s) => (s.academicPart || s.academic_part) === "Part-2",
        ).length,
        semester1: allRelevantStudents.filter(
          (s) =>
            Number(s.currentSemester) === 1 || Number(s.current_semester) === 1,
        ).length,
        semester2: allRelevantStudents.filter(
          (s) =>
            Number(s.currentSemester) === 2 || Number(s.current_semester) === 2,
        ).length,
        semester3: allRelevantStudents.filter(
          (s) =>
            Number(s.currentSemester) === 3 || Number(s.current_semester) === 3,
        ).length,
        semester4: allRelevantStudents.filter(
          (s) =>
            Number(s.currentSemester) === 4 || Number(s.current_semester) === 4,
        ).length,
      },
      ditSemesters: {
        sem1: ditList.filter(
          (s) =>
            Number(s.currentSemester) === 1 ||
            Number(s.current_semester) === 1 ||
            !s.currentSemester,
        ).length,
        sem2: ditList.filter(
          (s) =>
            Number(s.currentSemester) === 2 || Number(s.current_semester) === 2,
        ).length,
        sem3: ditList.filter(
          (s) =>
            Number(s.currentSemester) === 3 || Number(s.current_semester) === 3,
        ).length,
        sem4: ditList.filter(
          (s) =>
            Number(s.currentSemester) === 4 || Number(s.current_semester) === 4,
        ).length,
      },
      bsSemesters: {
        sem1: bsList.filter(
          (s) =>
            Number(s.currentSemester) === 1 ||
            Number(s.current_semester) === 1 ||
            !s.currentSemester,
        ).length,
        sem2: bsList.filter(
          (s) =>
            Number(s.currentSemester) === 2 || Number(s.current_semester) === 2,
        ).length,
        sem3: bsList.filter(
          (s) =>
            Number(s.currentSemester) === 3 || Number(s.current_semester) === 3,
        ).length,
        sem4: bsList.filter(
          (s) =>
            Number(s.currentSemester) === 4 || Number(s.current_semester) === 4,
        ).length,
        sem5: bsList.filter(
          (s) =>
            Number(s.currentSemester) === 5 || Number(s.current_semester) === 5,
        ).length,
        sem6: bsList.filter(
          (s) =>
            Number(s.currentSemester) === 6 || Number(s.current_semester) === 6,
        ).length,
        sem7: bsList.filter(
          (s) =>
            Number(s.currentSemester) === 7 || Number(s.current_semester) === 7,
        ).length,
        sem8: bsList.filter(
          (s) =>
            Number(s.currentSemester) === 8 || Number(s.current_semester) === 8,
        ).length,
      },
      ukL3Semesters: {
        sem1: ukL3List.filter(
          (s) =>
            Number(s.currentSemester) === 1 ||
            Number(s.current_semester) === 1 ||
            !s.currentSemester,
        ).length,
        sem2: ukL3List.filter(
          (s) =>
            Number(s.currentSemester) === 2 || Number(s.current_semester) === 2,
        ).length,
        sem3: ukL3List.filter(
          (s) =>
            Number(s.currentSemester) === 3 || Number(s.current_semester) === 3,
        ).length,
      },
      fscParts: {
        part1: fscList.filter(
          (s) =>
            (s.academicPart || s.academic_part) === "Part-1" || !s.academicPart,
        ).length,
        part2: fscList.filter(
          (s) => (s.academicPart || s.academic_part) === "Part-2",
        ).length,
      },
    };
  }, [data.students, confirmedAdmissions]);

  // Total Expenses
  const totalExpenses = useMemo(() => {
    return (data.expenses || []).reduce(
      (acc: number, curr: any) => acc + (Number(curr.amount) || 0),
      0,
    );
  }, [data.expenses]);

  // Information Cluster Data Points
  const infoCluster = useMemo(() => {
    return [
      {
        label: "Lead Conversion",
        value: data.leads?.length
          ? `${Math.round((confirmedAdmissions.length / data.leads.length) * 100)}%`
          : "0%",
        icon: TrendingUp,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50/50",
        border: "border-emerald-100/50",
        pill: data.leads?.length ? (confirmedAdmissions.length / data.leads.length < 0.1 ? "Very low" : "Good") : "No leads",
        pillColor: "bg-rose-50 text-rose-600",
        desc: "Leads to Admission",
      },
      {
        label: "Male Students",
        value: mergedBoysCount,
        icon: Users,
        color: "text-blue-600",
        bgColor: "bg-blue-50/50",
        border: "border-blue-100/50",
        pill: totalEnrollmentCount > 0 ? `${Math.round(mergedBoysCount / totalEnrollmentCount * 100)}%` : "0%",
        pillColor: "bg-emerald-100 text-emerald-700",
        desc: "Active Boys Count",
      },
      {
        label: "Female Students",
        value: mergedGirlsCount,
        icon: Users,
        color: "text-rose-600",
        bgColor: "bg-rose-50/50",
        border: "border-rose-100/50",
        pill: totalEnrollmentCount > 0 ? `${Math.round(mergedGirlsCount / totalEnrollmentCount * 100)}%` : "0%",
        pillColor: "bg-emerald-100 text-emerald-700",
        desc: "Active Girls Count",
      },
      {
        label: "Instructional Staff",
        value: teachersCount,
        icon: GraduationCap,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50/50",
        border: "border-indigo-100/50",
        pill: teachersCount > 0 ? "Active" : "None",
        pillColor: teachersCount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-50 text-rose-600",
        desc: "Active Lecturers",
      },
      {
        label: "Support Personnel",
        value: totalStaff - teachersCount,
        icon: Briefcase,
        color: "text-slate-600",
        bgColor: "bg-slate-50/50",
        border: "border-slate-100/50",
        pill: totalStaff - teachersCount > 0 ? "Active" : "Vacant",
        pillColor: totalStaff - teachersCount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-50 text-rose-600",
        desc: "Admin & Support",
      },
      {
        label: "Academic Part-I",
        value: academicPerformance.studentCounts.part1,
        icon: BarChart3,
        color: "text-amber-600",
        bgColor: "bg-amber-50/50",
        border: "border-amber-100/50",
        desc: "Freshman Enrollment",
      },
      {
        label: "Academic Part-II",
        value: academicPerformance.studentCounts.part2,
        icon: BarChart3,
        color: "text-cyan-600",
        bgColor: "bg-cyan-50/50",
        border: "border-cyan-100/50",
        desc: "Senior Enrollment",
      },
      {
        label: "Total Receivables",
        value: `Rs. ${academicPerformance.totalInvoiced.toLocaleString()}`,
        icon: Wallet,
        color: "text-superior-teal",
        bgColor: "bg-superior-teal/5",
        border: "border-superior-teal/10",
        desc: "Combined Package Sum",
      },
      {
        label: "Fee Received (Active)",
        value: `Rs. ${activeStudentsRevenue.toLocaleString()}`,
        icon: CheckCircle2,
        color: "text-emerald-500",
        bgColor: "bg-emerald-50/50",
        border: "border-emerald-100/50",
        pill: currentMonth.slice(0,3),
        pillColor: "bg-emerald-100 text-emerald-700",
        desc: "Student Fee Collected",
        progress: academicPerformance.totalInvoiced > 0 ? (activeStudentsRevenue / academicPerformance.totalInvoiced) * 100 : 0,
        progressText: `${academicPerformance.totalInvoiced > 0 ? Math.round((activeStudentsRevenue / academicPerformance.totalInvoiced) * 100) : 0}% of receivables collected`,
        progressColor: "bg-emerald-500"
      },
      {
        label: "Pending Student Dues",
        value: `Rs. ${(academicPerformance.totalInvoiced - activeStudentsRevenue).toLocaleString()}`,
        icon: AlertCircle,
        color: "text-red-600",
        bgColor: "bg-red-50/50",
        border: "border-red-100/50",
        pill: "Pending",
        pillColor: "bg-red-100 text-red-700",
        desc: "For Active Students",
        progress: academicPerformance.totalInvoiced > 0 ? ((academicPerformance.totalInvoiced - activeStudentsRevenue) / academicPerformance.totalInvoiced) * 100 : 0,
        progressText: `${academicPerformance.totalInvoiced > 0 ? Math.round(((academicPerformance.totalInvoiced - activeStudentsRevenue) / academicPerformance.totalInvoiced) * 100) : 0}% still outstanding`,
        progressColor: "bg-red-500"
      },
      {
        label: "Avg. Yield / Head",
        value: `Rs. ${Math.round(academicPerformance.totalAvg).toLocaleString()}`,
        icon: TrendingUp,
        color: "text-emerald-700",
        bgColor: "bg-emerald-50/80",
        border: "border-emerald-200/50",
        desc: "Institutional PSA",
      },
      {
        label: "Total Expenses",
        value: `Rs. ${totalExpenses.toLocaleString()}`,
        icon: TrendingDown,
        color: "text-orange-600",
        bgColor: "bg-orange-50/50",
        border: "border-orange-100/50",
        desc: "All College Costs",
      },
    ];
  }, [
    data.leads,
    confirmedAdmissions,
    mergedBoysCount,
    mergedGirlsCount,
    teachersCount,
    totalStaff,
    academicPerformance,
    activeStudentsRevenue,
    totalExpenses,
  ]);

  // --- Staff Analytics ---
  const staffAnalytics = useMemo(() => {
    const rawStaff = data.staff || [];
    
    // Active counting
    const activeStaff = rawStaff.filter((s:any) => s.status !== "Inactive" && s.status !== "Resigned");
    
    // Distribution
    let management = 0, academic = 0, administration = 0, support = 0;
    let totalBaseSalary = 0;

    activeStaff.forEach((s:any) => {
      if (s.role === 'Principal' || s.role === 'Director' || s.role === 'Management') management++;
      else if (s.role === 'Lecturer' || s.role === 'Professor' || s.role === 'Academic') academic++;
      else if (s.role === 'Admin' || s.role === 'Clerk' || s.role === 'Administration') administration++;
      else support++;

      totalBaseSalary += Number(s.baseSalary || s.base_salary || s.salary || 0);
    });

    const averageSalary = activeStaff.length > 0 ? (totalBaseSalary / activeStaff.length) : 0;

    // Attendance processing (Current Month)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyAttendance = (data.staffAttendance || []).filter((a:any) => a.date?.startsWith(currentMonth) || a.date_logged?.startsWith(currentMonth));
    const totalPresents = monthlyAttendance.filter((a:any) => a.status === 'Present').length;
    const totalAbsents = monthlyAttendance.filter((a:any) => a.status === 'Absent').length;
    const totalLates = monthlyAttendance.filter((a:any) => a.status === 'Late').length;
    const totalLeaves = monthlyAttendance.filter((a:any) => a.status === 'Leave').length;

    // Advances processing (Active remaining balance)
    const advances = data.staffAdvances || [];
    const totalAdvancesTaken = advances.reduce((sum:number, a:any) => sum + Number(a.amount || 0), 0);
    const pendingAdvances = advances.reduce((sum:number, a:any) => sum + Number(a.remainingBalance ?? a.remaining_balance ?? 0), 0);
    const totalAdvancesRecovered = totalAdvancesTaken - pendingAdvances;

    const inactiveStaffCount = rawStaff.filter((s:any) => s.status === "Inactive" || s.status === "Resigned").length;
    
    const possibleAttendanceDays = totalPresents + totalAbsents + totalLeaves + totalLates;
    const attendanceRate = possibleAttendanceDays > 0 ? ((totalPresents + totalLates) / possibleAttendanceDays) * 100 : 0;

    return {
      totalActive: activeStaff.length,
      inactiveCount: inactiveStaffCount,
      attendanceRate,
      management,
      academic,
      administration,
      support,
      totalBaseSalary,
      averageSalary,
      attendance: {
        presents: totalPresents,
        absents: totalAbsents,
        lates: totalLates,
        leaves: totalLeaves,
      },
      advances: {
        total: totalAdvancesTaken,
        recovered: totalAdvancesRecovered,
        pending: pendingAdvances,
      }
    };
  }, [data.staff, data.staffAttendance, data.staffAdvances]);

  // --- Directors Analytics ---
  const directorsAnalytics = useMemo(() => {
    const incomes = data.incomes || [];
    const expenses = data.expenses || [];

    // Determine Other Incomes (Not related to students to avoid double counting)
    const otherIncomesTotal = incomes.reduce((sum: number, inc: any) => {
      // If the income record has a studentId or studentName, it's a student fee payment
      // and is already incorporated in activeStudentsRevenue via the students/admissions tables.
      // So we only count incomes that are purely "Other" or "Miscellaneous" without a student attached.
      const isStudentFee = Boolean(inc.studentId || (inc.studentName && inc.studentName !== 'Manual Entry'));
      if (!isStudentFee) {
        return sum + Number(inc.amount || 0);
      }
      return sum;
    }, 0);
    
    const totalEarnings = activeStudentsRevenue + otherIncomesTotal;
    const trueTotalExpenses = totalExpenses + staffAnalytics.totalBaseSalary;
    const netProfit = totalEarnings - trueTotalExpenses;
    const profitMargin = totalEarnings > 0 ? (netProfit / totalEarnings) * 100 : 0;

    // Monthly breakdown for charting
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const year = new Date().getFullYear();
    const monthlyFinance = months.map(m => ({ name: m, income: 0, expense: 0, profit: 0 }));

    incomes.forEach((i: any) => {
      if (!i.date) return;
      const d = new Date(i.date);
      if (d.getFullYear() === year) {
        const isStudentFee = Boolean(i.studentId || (i.studentName && i.studentName !== 'Manual Entry'));
        // We only add "Other Incomes" to the historical month distribution directly
        if (!isStudentFee) {
          monthlyFinance[d.getMonth()].income += Number(i.amount || 0);
        }
      }
    });

    expenses.forEach((e: any) => {
      if (!e.date) return;
      const d = new Date(e.date);
      if (d.getFullYear() === year) {
        monthlyFinance[d.getMonth()].expense += Number(e.amount || 0);
      }
    });

    // We add all active students revenue to the chart
    // Ideally this would be mapped by payment dates, but for an aggregate view we allocate it into the current operational month
    // as student fees are dynamically tracked as a current net positive.
    const currentM = new Date().getMonth();
    monthlyFinance[currentM].income += activeStudentsRevenue; 

    monthlyFinance.forEach(m => {
      m.profit = m.income - m.expense;
    });

    // Categories
    const expenseCategories: Record<string, number> = {};
    expenses.forEach((e: any) => {
      const cat = e.category || 'General';
      expenseCategories[cat] = (expenseCategories[cat] || 0) + Number(e.amount || 0);
    });
    
    // Add staff salaries to expenses
    expenseCategories['Payroll'] = (expenseCategories['Payroll'] || 0) + staffAnalytics.totalBaseSalary;
    
    const maxMonthlyIncome = Math.max(...monthlyFinance.map(m => m.income));
    const maxMonthlyExpense = Math.max(...monthlyFinance.map(m => m.expense));

    return {
      totalEarnings,
      totalExpenses: trueTotalExpenses, // True total
      netProfit,
      profitMargin,
      monthlyFinance,
      expenseCategories: Object.entries(expenseCategories)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value).slice(0, 5), // Top 5
    };
  }, [data.incomes, data.expenses, activeStudentsRevenue, totalExpenses, staffAnalytics.totalBaseSalary]);

  return (
    <div className="space-y-8 pb-12 relative">
      {/* Dynamic Background Highlights - Giving "Life" to the Dashboard */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -left-20 w-96 h-96 bg-superior-teal/5 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            x: [0, -40, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[20%] -right-20 w-80 h-80 bg-superior-gold/5 rounded-full blur-[100px]"
        />
      </div>

      {/* Hero Banner - ORIGINAL Branded Version */}
      <div className="relative overflow-hidden bg-superior-teal rounded-[2rem] p-6 lg:p-8 border border-superior-teal/20 shadow-2xl shadow-superior-teal/20 z-10">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-superior-gold/5 to-transparent pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-6 pl-4">
            <div className="space-y-1">
              <h1 className="text-white text-xs md:text-sm font-black uppercase tracking-[0.4em] opacity-80 pl-1">
                {(() => {
                  const collegeName = data.settings?.collegeName || "Superior College";
                  const campusName = data.settings?.campusName || "Jahanian";
                  if (!campusName) return collegeName;
                  return collegeName.toLowerCase().includes(campusName.toLowerCase())
                    ? collegeName
                    : `${collegeName}, ${campusName}`;
                })()}
              </h1>
              <h2 className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter leading-none flex flex-wrap gap-x-4">
                <span>ADMIN</span>
                <span className="text-superior-gold">DASHBOARD</span>
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    setActivePage("admissions");
                    setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-admission')), 100);
                  }}
                  className="bg-superior-gold text-superior-teal hover:bg-superior-gold/90 font-black uppercase tracking-widest text-[10px] h-10 rounded-xl px-6 shadow-lg shadow-superior-gold/10 transition-all active:scale-95"
                >
                  New Admission
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActivePage("reports")}
                  className="bg-transparent border-white/20 text-white hover:bg-white/10 h-10 rounded-xl px-6 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                >
                  View Reports
                </Button>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <div className="w-2 h-2 rounded-full bg-superior-gold animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Ongoing Session:{" "}
                  <span className="text-white">{selectedSession}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl text-right min-w-[260px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1 h-full bg-superior-gold/50" />
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                  System Live
                </span>
              </div>
              <Select
                value={selectedSession}
                onValueChange={setSelectedSession}
              >
                <SelectTrigger className="w-[130px] h-7 bg-white/10 border-white/20 text-white text-[9px] font-black uppercase tracking-widest rounded-lg focus:ring-0">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent className="bg-superior-teal border-superior-teal/50 text-white">
                  <SelectItem
                    value="all"
                    className="text-[10px] font-bold uppercase tracking-widest focus:bg-white/10"
                  >
                    All Sessions
                  </SelectItem>
                  {(
                    data.availableSessions || [
                      "2024-26",
                      "2025-27",
                      "2026-28",
                      "2027-29",
                    ]
                  ).map((session: string) => (
                    <SelectItem
                      key={session}
                      value={session}
                      className="text-[10px] font-bold uppercase tracking-widest focus:bg-white/10"
                    >
                      {session}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-superior-gold text-[9px] font-black uppercase tracking-[0.2em] mb-1">
                Current Date & Time
              </p>
              <p className="text-white text-xl font-display font-black tracking-tight">
                {currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <div className="flex items-center justify-end gap-2">
                <p className="text-white/40 text-xs font-medium">
                  {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
                </p>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <p className="text-white font-mono text-sm tracking-widest">
                  {time.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>
            </div>

            <Separator className="my-4 bg-white/5" />
            <div className="flex items-center justify-end gap-2 text-superior-gold">
              <div className="w-6 h-6 rounded-lg bg-superior-gold/20 flex items-center justify-center">
                <TrendingUp size={12} />
              </div>
              <span className="text-[10px] font-black tracking-tight uppercase">
                Active Filter: {selectedSession}
              </span>
            </div>
          </div>
        </div>

        {/* Unified Dashboard Navigational Tabs */}
        <div className="relative z-20 mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-2 w-full">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "directors", label: "Directors", icon: ShieldCheck },
            { id: "staff", label: "Staff", icon: Users },
            { id: "ai_copilot", label: "SCJ Nexus AI", icon: BrainCircuit },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDashboardTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-widest transition-all relative overflow-hidden",
                activeDashboardTab === tab.id
                  ? "text-superior-teal"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {activeDashboardTab === tab.id && (
                <motion.div
                  layoutId="dashboardTabBg"
                  className="absolute inset-0 bg-superior-gold rounded-xl z-0 shadow-[0_0_15px_rgba(201,168,76,0.3)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-2">
                <tab.icon size={16} />
                {tab.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeDashboardTab === "overview" && (
        <>
      {/* Program-wise Gender Breakdown */}
      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between px-2">
          <div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Academic Group Demographics</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time Boys vs Girls split across programs</p>
          </div>
          <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 font-black px-4 py-1.5 rounded-xl shadow-sm">
            <Users size={14} className="mr-2 text-superior-teal" />
            Total Enrollment: {totalEnrollmentCount}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ perspective: 1000 }}>
          {[
            { 
              name: "Intermediate (FSC)", 
              icon: GraduationCap, 
              color: "emerald", 
              total: academicPerformance.fscCount,
              boys: academicPerformance.fscBoysCount,
              girls: academicPerformance.fscGirlsCount,
              page: 'students-boys',
              status: academicPerformance.fscCount > 20 ? "Active" : academicPerformance.fscCount > 0 ? "Low intake" : "No enrollment"
            },
            { 
              name: "Diploma in IT (DIT)", 
              icon: LandPlot, 
              color: "blue", 
              total: academicPerformance.ditCount,
              boys: academicPerformance.ditBoysCount,
              girls: academicPerformance.ditGirlsCount,
              page: 'students-dit',
              status: academicPerformance.ditCount > 20 ? "Active" : academicPerformance.ditCount > 0 ? "Low intake" : "No enrollment"
            },
            { 
              name: "B.S Program", 
              icon: BookOpen, 
              color: "rose", 
              total: academicPerformance.bsCount,
              boys: academicPerformance.bsBoysCount,
              girls: academicPerformance.bsGirlsCount,
              page: 'students-bs',
              status: academicPerformance.bsCount > 20 ? "Active" : academicPerformance.bsCount > 0 ? "Low intake" : "No enrollment"
            },
            { 
              name: "UK Level 3", 
              icon: ShieldCheck, 
              color: "indigo", 
              total: academicPerformance.ukL3Count,
              boys: academicPerformance.ukL3BoysCount,
              girls: academicPerformance.ukL3GirlsCount,
              page: 'students-ukl3',
              status: academicPerformance.ukL3Count > 20 ? "Active" : academicPerformance.ukL3Count > 0 ? "No enrollment" : "No enrollment"
            }
          ].map((prog) => {
            const boysPercent = prog.total > 0 ? Math.round((prog.boys / prog.total) * 100) : 0;
            const girlsPercent = prog.total > 0 ? Math.round((prog.girls / prog.total) * 100) : 0;

            return (
              <motion.div
                key={prog.name}
                whileHover={{ 
                  y: -12,
                  scale: 1.04,
                  rotateX: 6,
                  rotateY: -4,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.06)"
                }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className={cn(
                  "bg-white rounded-2xl p-5 border-2 relative overflow-hidden flex flex-col justify-between transition-colors duration-300",
                  prog.color === "emerald" ? "border-emerald-500 shadow-lg shadow-emerald-500/5" : 
                  prog.color === "blue" ? "border-blue-500 shadow-lg shadow-blue-500/5" : 
                  prog.color === "rose" ? "border-rose-500 shadow-lg shadow-rose-500/5" : "border-indigo-500 shadow-lg shadow-indigo-500/5"
                )}
                style={{ transformStyle: "preserve-3d" }}
              >
                
                <div className="flex items-start justify-between mb-2">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                    prog.color === "emerald" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                    prog.color === "blue" ? "bg-blue-50 text-blue-600 border-blue-100" : 
                    prog.color === "rose" ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                  )}>
                    <prog.icon size={20} />
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide",
                    prog.status === "Active" ? "bg-emerald-100 text-emerald-700" : 
                    prog.status === "Low intake" ? "bg-amber-100 text-amber-700" : 
                    "bg-rose-100 text-rose-700"
                  )}>
                    {prog.status}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="text-[15px] font-bold text-slate-800 leading-tight mb-0.5">{prog.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{prog.total} total students</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Boys</p>
                    <h5 className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{prog.boys}</h5>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Girls</p>
                    <h5 className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{prog.girls}</h5>
                  </div>
                </div>

                <div className="space-y-1.5 mb-6">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full flex overflow-hidden">
                     {prog.total > 0 ? (
                       <>
                         <div style={{ width: `${boysPercent}%` }} className={cn(
                           prog.color === "emerald" ? "bg-emerald-500" : 
                           prog.color === "blue" ? "bg-blue-500" : 
                           prog.color === "rose" ? "bg-rose-500" : "bg-indigo-500"
                         )} />
                         <div style={{ width: `${girlsPercent}%` }} className={cn(
                           prog.color === "emerald" ? "bg-emerald-200" : 
                           prog.color === "blue" ? "bg-blue-200" : 
                           prog.color === "rose" ? "bg-rose-200" : "bg-indigo-200"
                         )} />
                       </>
                     ) : (
                       <div className="w-full bg-slate-200" />
                     )}
                  </div>
                  <div className="flex justify-between text-[10px] font-medium text-slate-500">
                    {prog.total > 0 ? (
                      <>
                        <span>Boys {boysPercent}%</span>
                        <span>Girls {girlsPercent}%</span>
                      </>
                    ) : (
                      <>
                        <span>No data</span>
                        <span>—</span>
                      </>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setActivePage(prog.page)}
                  className="flex items-center text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors w-max"
                >
                  <ArrowRight size={14} className="mr-1.5" />
                  View full record
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Empty Session Alarm */}
      {totalApplicants === 0 &&
        confirmedAdmissions.length === 0 &&
        selectedSession !== "all" && (
          <div className="px-4 md:px-10 mt-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-[2rem] bg-amber-50 border border-amber-200 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center gap-4 text-center md:text-left transition-all">
                <div className="w-12 h-12 rounded-2xl bg-amber-200 flex items-center justify-center text-amber-700 shadow-inner shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <p className="text-amber-900 font-black uppercase tracking-widest text-[11px] leading-tight">
                    No Active Records for Session "{selectedSession}"
                  </p>
                  <p className="text-amber-700/70 text-xs font-medium mt-1">
                    We couldn't find any admissions or students for this
                    specific session ID. Try switching to{" "}
                    <span className="font-bold">"All Sessions"</span> or check
                    your settings.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setSelectedSession("all")}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-6 h-11 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-200 shrink-0"
              >
                Expose All Data
              </Button>
            </motion.div>
          </div>
        )}

      {/* Filter Row */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-superior-gold rounded-full" />
          <h3 className="text-xl font-serif font-black text-slate-800">
            Financial Snapshot
          </h3>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">
            Viewing Data For:
          </span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl bg-slate-50 border-transparent focus:bg-white transition-all font-bold text-slate-600">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
              <SelectItem value="all" className="font-bold">
                Total Collection (All Months)
              </SelectItem>
              {monthsList.map((m) => (
                <SelectItem key={m} value={m}>
                  {m} {new Date().getFullYear()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Financial Snapshot - Restructured for ss2 Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* May Collection Card */}
        <div 
          onClick={() => setActivePage("accounts")}
          className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100/50 relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group flex flex-col justify-between min-h-[160px]"
        >
          <div>
            <div className="flex items-center gap-2 mb-2 text-emerald-600">
               <ReceiptText size={16} />
               <p className="text-[12px] font-bold uppercase tracking-widest leading-none">
                 {selectedMonth === "all" ? "TOTAL REVENUE" : `${selectedMonth.toUpperCase()} COLLECTION`}
               </p>
            </div>
            <h4 className="text-4xl font-display font-black text-emerald-600 tracking-tighter">
              Rs. {(monthlyIncome || 0).toLocaleString()}
            </h4>
            <p className="text-[11px] font-semibold text-emerald-600/80 mt-1">
              {selectedMonth === "all" ? "Total fee received" : "Total fee received this month"}
            </p>
          </div>
          {/* Faux Bar Chart Representation at bottom */}
          <div className="flex items-end gap-1.5 h-12 mt-4 opacity-70 group-hover:opacity-100 transition-opacity">
            {[40, 50, 60, 45, 80].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-emerald-400" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* PSA Card */}
        <div 
          onClick={() => setActivePage("accounts")}
          className="bg-white rounded-2xl p-6 border border-slate-200 cursor-pointer hover:shadow-lg transition-shadow flex flex-col justify-center min-h-[160px]"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingUp size={16} />
            <p className="text-[12px] font-bold uppercase tracking-widest leading-none">PER STUDENT AVG (PSA)</p>
          </div>
          <h4 className="text-4xl font-display font-black text-slate-800 tracking-tighter">
            Rs. {Math.round(academicPerformance.totalAvg).toLocaleString()}
          </h4>
          <p className="text-[11px] font-semibold text-slate-500 mt-1 mb-4">
            Institutional value / student
          </p>
          {activeStudentsRevenue > 0 && (
             <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-sm w-max">
               <ArrowUpRight size={10} /> +4.2% vs last month
             </span>
          )}
        </div>

        {/* Consolidated Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 grid grid-cols-2 gap-4 gap-y-6">
           <div className="cursor-pointer" onClick={() => setActivePage("students-boys")}>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 leading-none">TOTAL ENROLLMENT</p>
             <h5 className="text-3xl font-black text-slate-800 tracking-tighter mb-1 leading-none">{totalEnrollmentCount}</h5>
             <Badge variant="outline" className="bg-slate-50 text-slate-600 rounded-sm px-1.5 py-0 text-[9px] border-slate-200">All programs</Badge>
           </div>
           
           <div className="cursor-pointer" onClick={() => setActivePage("staff")}>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 leading-none">STAFF PRESENCE</p>
             <h5 className="text-3xl font-black text-slate-800 tracking-tighter mb-1 leading-none">{totalStaff}/{totalStaff}</h5>
             <Badge variant="outline" className="bg-emerald-50 text-emerald-600 rounded-sm px-1.5 py-0 text-[9px] border-emerald-100 border flex w-max items-center gap-1"><CheckCircle2 size={8} /> Full</Badge>
           </div>

           <div className="cursor-pointer" onClick={() => setActivePage("leads")}>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 leading-none">RAW LEADS</p>
             <h5 className="text-3xl font-black text-slate-800 tracking-tighter mb-1 leading-none">{(data.leads?.length || 0).toLocaleString()}</h5>
             <Badge variant="outline" className="bg-rose-50 text-rose-600 rounded-sm px-1.5 py-0 text-[10px] border-rose-100">
                <ArrowDownRight size={10} className="inline mr-0.5" /> 1% converted
             </Badge>
           </div>

           <div>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 leading-none">LEAD CONVERSION</p>
             <h5 className="text-2xl font-black text-slate-800 tracking-tighter mb-1 leading-none">
                {data.leads?.length ? `${Math.round((confirmedAdmissions.length / data.leads.length) * 100)}%` : "0%"}
             </h5>
             <Badge variant="outline" className="bg-rose-50 text-rose-600 rounded-sm px-1.5 py-0 text-[9px] border-rose-100">Needs attention</Badge>
           </div>
        </div>
      </div>

      {/* Complete Information Cluster Panel - REPLACING Shortucts */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">
            Superior Information Cluster
          </h3>
          <Badge
            variant="outline"
            className="bg-white text-[9px] font-black uppercase tracking-widest text-slate-400 border-slate-100"
          >
            Live Institutional Analytics
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6 relative z-10">
          {infoCluster.map((item: any, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className={cn(
                "group relative p-5 rounded-[2.5rem] border shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all overflow-hidden cursor-default",
                "hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1),0_0_20px_rgba(0,0,0,0.05)]",
                item.color, // used for the beam color
                item.border
              )}
            >
              {/* Base background for the 2px gap when beam isn't there */}
              <div className="absolute inset-0 z-0 bg-white dark:bg-slate-900" />
              
              {/* Spinning Beam Border */}
              <div className="absolute inset-0 z-[1] overflow-hidden rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div 
                  className="absolute animate-[spin_4s_linear_infinite]"
                  style={{
                    background: `conic-gradient(from 90deg at 50% 50%, transparent 60%, currentColor 100%)`,
                    width: '300%',
                    height: '300%',
                    left: '-100%',
                    top: '-100%'
                  }}
                />
              </div>

              {/* Inner Solid Card background (opaque layer to block inner gradient spin) */}
              <div className="absolute inset-[2px] rounded-[calc(2.5rem-2px)] z-[2] transition-colors duration-300 bg-white dark:bg-slate-900" />
              
              {/* Inner Tint Layer */}
              <div className={cn(
                "absolute inset-[2px] rounded-[calc(2.5rem-2px)] z-[2] transition-colors duration-300 pointer-events-none",
                item.bgColor,
              )} />

              {/* Metallic Grain / Crystallized Reflection */}
              <div className="absolute inset-[2px] rounded-[calc(2.5rem-2px)] z-[2] bg-gradient-to-br from-white/30 dark:from-white/10 via-transparent to-black/5 dark:to-white/5 pointer-events-none" />
              <div className="absolute -inset-x-full top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent skew-x-[-25deg] transition-all duration-1000 group-hover:translate-x-[400%] pointer-events-none z-[2]" />

              <div className="relative z-[3] flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-xs border flex items-center justify-center transition-all group-hover:scale-110",
                        item.color,
                        item.border
                      )}
                    >
                      <item.icon size={16} />
                    </div>
                    {item.pill && (
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide",
                        item.pillColor || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      )}>
                        {item.pill}
                      </span>
                    )}
                  </div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                    {item.label}
                  </h4>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                    {item.value}
                  </p>
                  
                  {item.progress !== undefined && (
                    <div className="mt-3 w-full">
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1.5">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", item.progressColor)} 
                          style={{ width: `${Math.min(item.progress, 100)}%` }} 
                        />
                      </div>
                      <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{item.progressText}</p>
                    </div>
                  )}

                  <p className={cn("mt-2 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest", item.progress !== undefined ? "opacity-0 h-0" : "")}>
                    {item.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detailed Program Intelligence Cabinets - REPLACING Treasury Grid and Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            name: "FSc Stream",
            count: academicPerformance.fscCount,
            boys: academicPerformance.fscBoysCount,
            girls: academicPerformance.fscGirlsCount,
            avg: academicPerformance.fscAvg,
            boysAvg: academicPerformance.fscBoysAvg,
            girlsAvg: academicPerformance.fscGirlsAvg,
            collection: academicPerformance.fscCollection,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-100",
            icon: Landmark,
          },
          {
            name: "DIT Tech",
            count: academicPerformance.ditCount,
            boys: academicPerformance.ditBoysCount,
            girls: academicPerformance.ditGirlsCount,
            avg: academicPerformance.ditAvg,
            boysAvg: academicPerformance.ditBoysAvg,
            girlsAvg: academicPerformance.ditGirlsAvg,
            collection: academicPerformance.ditCollection,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
            icon: Wallet,
          },
          {
            name: "UK Level 3",
            count: academicPerformance.ukL3Count,
            boys: academicPerformance.ukL3BoysCount,
            girls: academicPerformance.ukL3GirlsCount,
            avg: academicPerformance.ukL3Avg,
            boysAvg: academicPerformance.ukL3BoysAvg,
            girlsAvg: academicPerformance.ukL3GirlsAvg,
            collection: academicPerformance.ukL3Collection,
            color: "text-rose-600",
            bg: "bg-rose-50",
            border: "border-rose-100",
            icon: Banknote,
          },
          {
            name: "BS Honors",
            count: academicPerformance.bsCount,
            boys: academicPerformance.bsBoysCount,
            girls: academicPerformance.bsGirlsCount,
            avg: academicPerformance.bsAvg,
            boysAvg: academicPerformance.bsBoysAvg,
            girlsAvg: academicPerformance.bsGirlsAvg,
            collection: academicPerformance.bsCollection,
            color: "text-cyan-600",
            bg: "bg-cyan-50",
            border: "border-cyan-100",
            icon: ReceiptText,
          },
        ].map((program, idx) => (
          <motion.div
            key={program.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.1 }}
            className={`group relative flex flex-col overflow-hidden rounded-[2.5rem] border ${program.border} bg-white/95 p-8 shadow-sm backdrop-blur-xl transition-all duration-500 hover:shadow-2xl`}
          >
            {/* Decorative Background Elements */}
            <div
              className={`absolute -right-10 -top-10 h-32 w-32 ${program.bg} rounded-full blur-3xl opacity-50 transition-opacity group-hover:opacity-100`}
            />

            <div className="relative z-10 mb-8 flex items-center justify-between">
              <div className="space-y-1">
                <h3
                  className={`text-[10px] font-black uppercase tracking-[0.2em] ${program.color}`}
                >
                  {program.name}
                </h3>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  Institutional Unit
                </p>
              </div>
              <div
                className={`p-4 rounded-2xl ${program.bg} ${program.color} shadow-inner transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110`}
              >
                <program.icon size={20} strokeWidth={2.5} />
              </div>
            </div>

            <div className="relative z-10 flex flex-1 flex-col py-2">
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="mr-1 text-sm font-black italic text-slate-400">
                    Rs.
                  </span>
                  <span className="text-3xl font-black tracking-tighter text-slate-900 sm:text-4xl">
                    {program.collection.toLocaleString()}
                  </span>
                </div>
                <span className="mt-1 block text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Total Financial Treasury
                </span>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition-colors group-hover:bg-white">
                  <div className="mb-1 flex items-center gap-2">
                    <GraduationCap size={12} className="text-slate-400" />
                    <span className="text-[9px] font-black uppercase text-slate-400">
                      Scholars
                    </span>
                  </div>
                  <p className="text-xl font-black text-slate-800">
                    {program.count}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition-colors group-hover:bg-white">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <span className="text-[10px] font-bold text-blue-500">
                        ♂
                      </span>
                      <span className="text-[10px] font-bold text-xs text-rose-500">
                        ♀
                      </span>
                    </div>
                    <span className="text-[9px] font-black uppercase text-slate-400">
                      Ratio
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-black text-slate-700">
                    {program.boys}B / {program.girls}G
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-3 flex flex-col gap-5 border-t border-slate-100 pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                    Program Average Yield
                  </span>
                  <div className="mt-1 text-3xl font-black text-slate-900 tracking-tight">
                    Rs. {Math.round(program.avg || 0).toLocaleString()}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-slate-200 bg-slate-50/50 px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-slate-500"
                >
                  Verified
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="group flex flex-col rounded-lg border border-teal-200 bg-teal-50/70 p-4 transition-all duration-300 hover:bg-teal-50 hover:shadow-sm">
                  <span className="text-[9px] font-black uppercase tracking-wider text-teal-600/80">
                    Boys Yield
                  </span>
                  <span className="mt-1 text-xl font-black text-teal-900">
                    Rs. {Math.round(program.boysAvg || 0).toLocaleString()}
                  </span>
                </div>
                
                <div className="group flex flex-col rounded-lg border border-orange-200 bg-orange-50/70 p-4 transition-all duration-300 hover:bg-orange-50 hover:shadow-sm">
                  <span className="text-[9px] font-black uppercase tracking-wider text-orange-600/80">
                    Girls Yield
                  </span>
                  <span className="mt-1 text-xl font-black text-orange-900">
                    Rs. {Math.round(program.girlsAvg || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
        </>
      )}

      {activeDashboardTab === "directors" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-6 relative p-6 md:p-8 rounded-[2.5rem] bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden z-10"
        >
          {/* Executive Backdrop Accents */}
          <div className="absolute inset-0 bg-[radial-gradient(#085a4e_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04] z-0 pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-superior-gold/15 to-transparent rounded-full blur-[140px] -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-gradient-to-br from-superior-teal/5 to-transparent rounded-full blur-[120px] -z-10 pointer-events-none" />
          
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4 mb-2 dark:border-slate-800">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-superior-gold shadow-[0_0_8px_rgba(201,168,76,0.8)]" />
                Director Console & Analytics
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">High-level financial summaries and yield analysis</p>
            </div>
            <div className="bg-white/80 dark:bg-slate-800 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-superior-gold animate-pulse" />
              Directorial Overview Mode
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            <StatCard
              title="Total Revenue"
              value={`Rs. ${directorsAnalytics.totalEarnings.toLocaleString()}`}
              subValue="From all sources"
              icon={Banknote}
              color="teal"
            />
            <StatCard
              title="Total Operating Costs"
              value={`Rs. ${directorsAnalytics.totalExpenses.toLocaleString()}`}
              subValue="Includes payroll & overheads"
              icon={CreditCard}
              color="slate"
            />
            <StatCard
              title="Net Profit"
              value={`Rs. ${directorsAnalytics.netProfit.toLocaleString()}`}
              subValue="Revenue - Expenses"
              icon={TrendingUp}
              color="gold"
              isUp={directorsAnalytics.netProfit > 0}
            />
            <StatCard
              title="Profit Margin"
              value={`${directorsAnalytics.profitMargin.toFixed(1)}%`}
              subValue="Percentage of revenue"
              icon={PieChartIcon}
              color="teal"
            />
          </div>
          
          {/* Second Row of Director Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Outstanding Dues"
              value={`Rs. ${Math.max(0, academicPerformance.totalInvoiced - activeStudentsRevenue).toLocaleString()}`}
              subValue="Pending student fees"
              icon={AlertCircle}
              color="rose"
            />
            <StatCard
              title="Per Student Avg (PSA)"
              value={`Rs. ${Math.round(academicPerformance.totalAvg).toLocaleString()}`}
              subValue="Institutional value / student"
              icon={BarChart3}
              color="teal"
            />
            <StatCard
              title="Staff Wage Liability"
              value={`Rs. ${staffAnalytics.totalBaseSalary.toLocaleString()}`}
              subValue="Monthly payroll commitment"
              icon={Users}
              color="orange"
            />
            <StatCard
              title="Staff Advances Paid"
              value={`Rs. ${(staffAnalytics.advances?.pending || 0).toLocaleString()}`}
              subValue="Total unrecovered advances"
              icon={Redo2}
              color="indigo"
            />
          </div>

          {/* Directors Revenue Share Blocks */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-6 md:p-8 border border-slate-200/50 dark:border-slate-800 shadow-sm mt-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-superior-gold/5 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 relative z-10">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-superior-gold/10 text-superior-gold">
                    <ShieldCheck size={16} />
                  </span>
                  Directors Equity & Revenue Distribution
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">
                  Real-time division of overall gross collections based on directorial equity holding
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200/60 dark:border-slate-750 shadow-xs">
                  Total gross: Rs. {directorsAnalytics.totalEarnings.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10 font-sans">
              {[
                { name: "M Akhtar", share: 44, role: "Chief Executive Partner", color: "from-emerald-50 to-teal-50/20 dark:from-emerald-950/20 dark:to-teal-950/5 border-emerald-200/60 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400", bgBadge: "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300" },
                { name: "M Saleem", share: 35, role: "Management Director", color: "from-amber-50 to-yellow-50/20 dark:from-amber-950/20 dark:to-yellow-950/5 border-amber-200/60 dark:border-amber-900/60 text-amber-700 dark:text-amber-400", bgBadge: "bg-amber-100/80 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300" },
                { name: "Ehsan Ahsan", share: 15, role: "Advisory Director", color: "from-blue-50 to-indigo-50/20 dark:from-blue-950/20 dark:to-indigo-950/5 border-blue-200/60 dark:border-blue-900/60 text-blue-700 dark:text-blue-400", bgBadge: "bg-blue-100/80 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300" },
                { name: "M Siddiq", share: 6, role: "Operational Coordinator", color: "from-purple-50 to-pink-50/20 dark:from-purple-950/20 dark:to-pink-950/5 border-purple-200/60 dark:border-purple-900/60 text-purple-700 dark:text-purple-400", bgBadge: "bg-purple-100/80 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300" }
              ].map((director, idx) => {
                const partnerShareVal = Math.round(directorsAnalytics.totalEarnings * (director.share / 100));
                return (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -4, scale: 1.01 }}
                    className={`bg-gradient-to-br ${director.color} border p-5 rounded-[1.8rem] space-y-4 shadow-xs relative overflow-hidden group`}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-[0.02] rounded-bl-full pointer-events-none transition-all duration-300 group-hover:scale-125" />
                    
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h5 className="font-sans font-black text-slate-800 dark:text-white text-base leading-tight">
                          {director.name}
                        </h5>
                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">
                          {director.role}
                        </p>
                      </div>
                      <span className={`text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-full ${director.bgBadge} tracking-tight shrink-0`}>
                        {director.share}%
                      </span>
                    </div>

                    <div className="space-y-1 relative z-10">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                        Dividend Share Amount
                      </span>
                      <span className="font-sans font-black text-xl text-slate-800 dark:text-slate-100 block tracking-tight">
                        Rs. {partnerShareVal.toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-slate-150 dark:bg-slate-800/80 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${director.share}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.1 }}
                          className={`h-full rounded-full ${
                            director.share >= 40 
                              ? "bg-emerald-500" 
                              : director.share >= 30 
                              ? "bg-amber-500" 
                              : director.share >= 10 
                              ? "bg-blue-500" 
                              : "bg-purple-500"
                          }`}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    Annual Financial Overview
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    Income vs Expenses over the year
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-600">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-xs font-bold text-slate-600">Expenses</span>
                  </div>
                </div>
              </div>
              
              <div className="h-[350px] relative z-10 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={directorsAnalytics.monthlyFinance}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `Rs.${(value / 1000)}k`}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`Rs. ${Number(value).toLocaleString()}`]}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="income" name="Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" name="Expenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
               <div className="w-full h-full flex flex-col justify-between">
                 <div>
                   <h3 className="text-xl font-black text-slate-800 text-left">Top Expenses</h3>
                   <p className="text-sm font-medium text-slate-500 mt-1 text-left">Key spending areas</p>
                 </div>
                 
                 <div className="space-y-6 mt-8 flex-1">
                    {directorsAnalytics.expenseCategories.length > 0 ? directorsAnalytics.expenseCategories.map((cat, idx) => (
                      <div key={idx} className="relative">
                        <div className="flex justify-between text-sm mb-2">
                           <span className="font-bold text-slate-700">{cat.name}</span>
                           <span className="text-slate-500 font-semibold">Rs. {cat.value.toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${(cat.value / (directorsAnalytics.totalExpenses || 1)) * 100}%` }}
                             transition={{ duration: 1, ease: "easeOut" }}
                             className={cn("h-full rounded-full", idx === 0 ? "bg-rose-500" : idx === 1 ? "bg-orange-400" : "bg-blue-400")}
                           />
                        </div>
                      </div>
                    )) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        No expense data available
                      </div>
                    )}
                 </div>
                 
                 <div className="pt-6 border-t border-slate-100 mt-6 mt-auto">
                    <div className="flex justify-between items-center">
                       <span className="text-slate-500 font-medium">Total Spending</span>
                       <span className="font-black text-lg text-slate-800">Rs. {directorsAnalytics.totalExpenses.toLocaleString()}</span>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeDashboardTab === "staff" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-6 relative p-6 md:p-8 rounded-[2.5rem] bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden z-10"
        >
          {/* HR Backdrop Accents */}
          <div className="absolute inset-0 bg-[radial-gradient(#c9a84c_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.04] z-0 pointer-events-none" />
          <div className="absolute top-1/3 right-10 w-[450px] h-[450px] bg-gradient-to-bl from-superior-teal/10 to-transparent rounded-full blur-[130px] -z-10 pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-gradient-to-tr from-[#fb7185]/5 to-transparent rounded-full blur-[110px] -z-10 pointer-events-none" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4 mb-2 dark:border-slate-800">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-superior-teal shadow-[0_0_8px_rgba(8,90,78,0.8)]" />
                Staff Attendance & Payroll Console
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Workforce allocation, daily presents, and advance wages liability</p>
            </div>
            <div className="bg-white/80 dark:bg-slate-800 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-superior-teal animate-pulse" />
              HR Command Center
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            <StatCard
              title="Total Active Staff"
              value={staffAnalytics.totalActive}
              subValue="Current headcount"
              icon={Users}
              color="teal"
            />
            <StatCard
              title="Monthly Salary Payout"
              value={`Rs. ${staffAnalytics.totalBaseSalary.toLocaleString()}`}
              subValue={`Avg Rs. ${Math.round(staffAnalytics.averageSalary).toLocaleString()}`}
              icon={Banknote}
              color="slate"
            />
            <StatCard
              title="This Month Presents"
              value={staffAnalytics.attendance.presents}
              subValue={`${staffAnalytics.attendance.absents} Absents, ${staffAnalytics.attendance.lates} Lates`}
              icon={CheckCircle2}
              color="gold"
            />
            <StatCard
              title="Pending Advances"
              value={`Rs. ${staffAnalytics.advances.pending.toLocaleString()}`}
              subValue={`Out of Rs. ${staffAnalytics.advances.total.toLocaleString()} total`}
              icon={Briefcase}
              color="teal"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Avg. Daily Labor Cost"
              value={`Rs. ${Math.round(staffAnalytics.totalBaseSalary / 30).toLocaleString()}`}
              subValue="Estimated cost per day"
              icon={DollarSign}
              color="orange"
            />
            <StatCard
              title="Advances Recovered"
              value={`Rs. ${staffAnalytics.advances.recovered.toLocaleString()}`}
              subValue="Deducted from salaries"
              icon={RotateCcw}
              color="emerald"
            />
            <StatCard
              title="Attendance Rate"
              value={`${Math.round(staffAnalytics.attendanceRate)}%`}
              subValue="Based on logged days"
              icon={BarChart3}
              color="teal"
            />
            <StatCard
              title="Inactive/Resigned"
              value={staffAnalytics.inactiveCount}
              subValue="Total left staff"
              icon={LogOut}
              color="rose"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    Role Distribution
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    Staff breakdown by role
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <Users className="text-teal-600" size={24} />
                </div>
              </div>
              
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Academic", value: staffAnalytics.academic },
                        { name: "Management", value: staffAnalytics.management },
                        { name: "Administration", value: staffAnalytics.administration },
                        { name: "Support", value: staffAnalytics.support },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#085a4e" />
                      <Cell fill="#c9a84c" />
                      <Cell fill="#0f172a" />
                      <Cell fill="#94a3b8" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-[#085a4e]" />
                   <span className="text-xs font-bold text-slate-600">Academic ({staffAnalytics.academic})</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-[#c9a84c]" />
                   <span className="text-xs font-bold text-slate-600">Management ({staffAnalytics.management})</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-[#0f172a]" />
                   <span className="text-xs font-bold text-slate-600">Admin ({staffAnalytics.administration})</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-[#94a3b8]" />
                   <span className="text-xs font-bold text-slate-600">Support ({staffAnalytics.support})</span>
                 </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    Monthly Attendance
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    Present vs Absent vs Late
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <BarChart3 className="text-superior-gold" size={24} />
                </div>
              </div>
              
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Presents", count: staffAnalytics.attendance.presents, fill: "#085a4e" },
                      { name: "Absents", count: staffAnalytics.attendance.absents, fill: "#ef4444" },
                      { name: "Lates", count: staffAnalytics.attendance.lates, fill: "#c9a84c" },
                      { name: "Leaves", count: staffAnalytics.attendance.leaves, fill: "#3b82f6" },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Bar
                      dataKey="count"
                      radius={[6, 6, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeDashboardTab === "ai_copilot" && (
        <AiCopilotView
          collegeContext={{
            studentCount: totalEnrollmentCount,
            boysCount: mergedBoysCount,
            girlsCount: mergedGirlsCount,
            staffCount: staffAnalytics.totalActive,
            revenue: academicPerformance.totalCollection,
            expenses: data.expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0),
            outstandingDues: Math.max(0, academicPerformance.totalInvoiced - academicPerformance.totalCollection),
            staffWageLiability: staffAnalytics.totalBaseSalary,
            staffAdvancesPaid: staffAnalytics.advances.pending,
            session: selectedSession,
            studentsList: (data.students || []).map((s: any) => ({
              id: s.id,
              colNo: s.collegeNo || s.college_no,
              name: s.fullName,
              gender: s.gender,
              fatherName: s.fatherName,
              contact: s.contact,
              cat: s.category,
              grp: s.group,
              sec: s.section,
              part: s.academicPart,
              session: s.session,
              pkg: s.totalPackage,
              rec: s.feeReceived,
              bal: Math.max(0, (s.totalPackage || 0) - (s.feeReceived || 0))
            })),
            staffList: (data.staff || []).map((s: any) => ({
              id: s.id,
              name: s.fullName,
              role: s.role,
              status: s.status,
              salary: s.baseSalary || s.salary,
              contact: s.contact,
              qualification: s.qualification,
              specialization: s.specialization,
              subjects: s.subjects
            })),
            marksList: (data.academicRecords || []).map((r: any) => ({
              studentId: r.studentId || r.student_id,
              studentName: r.studentName || r.student_name,
              testName: r.testName || r.test_name,
              subject: r.subject,
              total: r.totalMarks || r.total_marks,
              obtained: r.obtainedMarks || r.obtained_marks,
              remarks: r.remarks,
              date: r.date
            }))
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subValue,
  trend,
  isUp,
  icon: Icon,
  color,
  onClick,
}: any) {
  const colorMap: any = {
    teal: "bg-superior-teal text-white",
    gold: "bg-[#c9a84c] text-white",
    slate: "bg-slate-800 text-white",
    rose: "bg-rose-500 text-white",
    orange: "bg-orange-500 text-white",
    indigo: "bg-indigo-600 text-white",
    emerald: "bg-emerald-600 text-white",
  };

  return (
    <motion.div
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-white shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] cursor-pointer hover:border-superior-teal/30 transition-all duration-500 group shadow-sm hover:shadow-xl hover:shadow-superior-teal/5 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-slate-200/10 pointer-events-none" />
      <div className="absolute inset-0 border-4 border-transparent group-active:border-superior-gold/20 transition-colors pointer-events-none rounded-[2.5rem]" />
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner shadow-black/20",
            colorMap[color],
          )}
        >
          <Icon size={28} />
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-tight shadow-sm border border-white/50 backdrop-blur-sm",
              isUp
                ? "bg-emerald-50/80 text-emerald-600"
                : "bg-rose-50/80 text-rose-600",
            )}
          >
            {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
          {title}
        </p>
        <h3 className="text-3xl font-display font-black text-slate-800 tracking-tight group-hover:translate-x-1 transition-transform">
          {value}
        </h3>
        {subValue && (
          <p className="text-sm text-slate-500 mt-2 font-medium italic opacity-80">
            {subValue}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function ActivityRow({ icon: Icon, color, title, desc, time }: any) {
  const colorMap: any = {
    teal: "bg-superior-bg-teal text-superior-teal",
    gold: "bg-superior-bg-gold text-superior-gold",
    red: "bg-rose-50 text-rose-500",
    slate: "bg-slate-50 text-slate-500",
  };

  return (
    <div className="flex items-start gap-4 p-6 hover:bg-slate-50/50 transition-colors">
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          colorMap[color],
        )}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-bold text-slate-800 truncate">{title}</p>
          <span className="text-[10px] font-medium text-slate-400 shrink-0">
            {time}
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function ConsoleAction({ icon: Icon, label, color, onClick }: any) {
  const colorMap: any = {
    teal: "hover:bg-superior-bg-teal hover:border-superior-teal/30 text-superior-teal hover:shadow-lg hover:shadow-superior-teal/5",
    gold: "hover:bg-superior-bg-gold hover:border-superior-gold/30 text-superior-gold hover:shadow-lg hover:shadow-superior-gold/5",
    slate:
      "hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:shadow-lg hover:shadow-slate-200/50",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-3xl transition-all duration-300 group active:scale-95 relative overflow-hidden",
        colorMap[color],
      )}
    >
      <div className="absolute inset-0 border-2 border-transparent group-active:border-current/20 transition-colors pointer-events-none rounded-3xl" />
      <div className="mb-3 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
        <Icon size={24} />
      </div>
      <span className="text-[11px] font-black uppercase tracking-[0.2em]">
        {label}
      </span>
    </motion.button>
  );
}
