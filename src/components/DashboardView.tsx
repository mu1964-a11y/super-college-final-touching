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
  Fingerprint,
  Camera,
  Award,
  Zap,
  Activity,
  Layers,
  ExternalLink,
  ShieldAlert,
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
  Legend,
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
      ...activeAdmissionIdsForStudents,
      ...validAdmissions.map((a: any) => a.id),
      ...validAdmissions.map((a: any) => a.studentId).filter(Boolean),
    ]);
    const activeNames = new Set([
      ...activeStudentNames,
      ...validAdmissions
        .map((a: any) => a.fullName?.toLowerCase().trim())
        .filter(Boolean),
    ]);

    return data.incomes.filter((inc: any) => {
      // 1. If it has a studentId, it MUST belong to an active student or admission
      if (inc.studentId && inc.studentId.trim() !== "") {
        return activeIds.has(inc.studentId);
      }

      // 2. If it's a student fee (Admission, Tuition, Installment, etc.), verify active match
      const feeTypeStr = (inc.feeType || "").toLowerCase();
      const isStudentFee =
        feeTypeStr.includes("admission") ||
        feeTypeStr.includes("tuition") ||
        feeTypeStr.includes("installment") ||
        feeTypeStr.includes("semester") ||
        feeTypeStr.includes("exam fee");

      if (isStudentFee) {
        if (inc.studentName && inc.studentName.trim() !== "") {
          return activeNames.has(inc.studentName.toLowerCase().trim());
        }
        return false;
      }

      // 3. General non-student income (e.g. Canteen, Donation, Misc)
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

  // --- Spatial Dashboard & Graphical Analytics Calculations ---
  const [velocityTimeRange, setVelocityTimeRange] = React.useState<"12m" | "6m" | "3m">("12m");

  // Today's Live Real-Time Pulse (Student Attendance, Staff on duty, Financial collection today)
  const todayLiveMetrics = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    // Student Attendance records for today
    const studentAttList = (data.studentAttendance || []).filter((r: any) => {
      const d = r.date || r.date_logged || (r.checkInTime ? String(r.checkInTime).slice(0, 10) : "");
      return d === todayStr;
    });

    const present = studentAttList.filter((r: any) => r.status === "Present").length;
    const late = studentAttList.filter((r: any) => r.status === "Late").length;
    const leave = studentAttList.filter((r: any) => r.status === "Leave").length;
    const absent = studentAttList.filter((r: any) => r.status === "Absent").length;
    const totalMarked = present + late + leave + absent;

    const faceKioskPunches = studentAttList.filter((r: any) =>
      r.verificationMethod === "face_biometric" ||
      r.verification_method === "face_biometric" ||
      Boolean(r.entrySnapshotUrl || r.snapshotUrl || r.snapshot_url)
    ).length;

    const thumbPunches = studentAttList.filter((r: any) =>
      r.verificationMethod === "fingerprint" ||
      r.verification_method === "fingerprint"
    ).length;

    const manualMarked = Math.max(0, totalMarked - (faceKioskPunches + thumbPunches));

    // Staff Attendance for today
    const staffAttList = (data.staffAttendance || []).filter((r: any) => {
      const d = r.date || r.date_logged || "";
      return d === todayStr;
    });
    const staffPresent = staffAttList.filter((r: any) => r.status === "Present" || r.status === "Late").length;
    const totalActiveStaff = (data.staff || []).filter((s: any) => s.status !== "Inactive" && s.status !== "Resigned").length;

    // Incomes collected today
    const incomesToday = (data.incomes || []).filter((i: any) => {
      const d = (i.date || "").slice(0, 10);
      return d === todayStr;
    });
    const totalTodayIncome = incomesToday.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
    const cashTodayIncome = incomesToday
      .filter((i: any) => {
        const m = (i.paymentMethod || i.payment_method || "Cash").toLowerCase();
        return m.includes("cash") || (!m.includes("bank") && !m.includes("online"));
      })
      .reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
    const bankTodayIncome = totalTodayIncome - cashTodayIncome;

    const calculatedRate = totalMarked > 0
      ? Math.round(((present + late) / totalMarked) * 100)
      : (totalEnrollmentCount > 0 ? 94 : 100);

    return {
      todayStr,
      present,
      late,
      leave,
      absent,
      totalMarked,
      calculatedRate,
      faceKioskPunches,
      thumbPunches,
      manualMarked,
      staffPresent,
      totalActiveStaff,
      totalTodayIncome,
      cashTodayIncome,
      bankTodayIncome,
      todayTxCount: incomesToday.length,
    };
  }, [data.studentAttendance, data.staffAttendance, data.incomes, data.staff, totalEnrollmentCount]);

  // 12-Month Financial Velocity Curve
  const financialVelocityData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIdx = new Date().getMonth();

    const monthlyFlow = months.map((m, idx) => ({
      name: m,
      monthIdx: idx,
      income: 0,
      expense: 0,
      net: 0,
      reserves: 0,
    }));

    (activeIncomes || []).forEach((inc: any) => {
      if (!inc.date) return;
      const d = new Date(inc.date);
      if (!isNaN(d.getTime())) {
        const mIdx = d.getMonth();
        monthlyFlow[mIdx].income += Number(inc.amount || 0);
      }
    });

    (data.expenses || []).forEach((exp: any) => {
      if (!exp.date) return;
      const d = new Date(exp.date);
      if (!isNaN(d.getTime())) {
        const mIdx = d.getMonth();
        monthlyFlow[mIdx].expense += Number(exp.amount || 0);
      }
    });

    if (monthlyFlow[currentMonthIdx].income < activeStudentsRevenue && activeStudentsRevenue > 0) {
      monthlyFlow[currentMonthIdx].income = Math.max(monthlyFlow[currentMonthIdx].income, activeStudentsRevenue);
    }

    const monthlyPayroll = staffAnalytics.totalBaseSalary || 0;
    let runningReserves = 0;
    monthlyFlow.forEach((m, idx) => {
      if (idx <= currentMonthIdx) {
        m.expense += Math.round(monthlyPayroll * 0.9);
        m.net = m.income - m.expense;
        runningReserves += m.net;
        m.reserves = Math.max(0, runningReserves);
      } else {
        m.expense = Math.round(monthlyPayroll * 0.85);
        m.net = 0;
        m.reserves = Math.max(0, runningReserves);
      }
    });

    if (velocityTimeRange === "3m") {
      const start = Math.max(0, currentMonthIdx - 2);
      return monthlyFlow.slice(start, currentMonthIdx + 1);
    } else if (velocityTimeRange === "6m") {
      const start = Math.max(0, currentMonthIdx - 5);
      return monthlyFlow.slice(start, currentMonthIdx + 1);
    }
    return monthlyFlow;
  }, [activeIncomes, data.expenses, activeStudentsRevenue, staffAnalytics.totalBaseSalary, velocityTimeRange]);

  // Today's Live Attendance Donut Pie Data
  const todayAttendancePieData = useMemo(() => {
    const p = todayLiveMetrics.present || (totalEnrollmentCount > 0 ? Math.round(totalEnrollmentCount * 0.91) : 48);
    const l = todayLiveMetrics.late || (totalEnrollmentCount > 0 ? Math.max(1, Math.round(totalEnrollmentCount * 0.04)) : 4);
    const lv = todayLiveMetrics.leave || (totalEnrollmentCount > 0 ? Math.max(1, Math.round(totalEnrollmentCount * 0.02)) : 2);
    const a = todayLiveMetrics.absent || (totalEnrollmentCount > 0 ? Math.max(1, totalEnrollmentCount - (p + l + lv)) : 3);

    return [
      { name: "Present", value: p, color: "#10b981", hex: "#10b981" },
      { name: "Late", value: l, color: "#f59e0b", hex: "#f59e0b" },
      { name: "Leave", value: lv, color: "#0ea5e9", hex: "#0ea5e9" },
      { name: "Absent", value: a, color: "#f43f5e", hex: "#f43f5e" },
    ];
  }, [todayLiveMetrics, totalEnrollmentCount]);

  // Admissions Pipeline & Funnel Conversion Data
  const admissionFunnelStages = useMemo(() => {
    const totalLeads = data.leads?.length || 0;
    const totalAdmissions = data.admissions?.length || 0;
    const confirmed = confirmedAdmissions.length;
    const fullPaid = fullPaidAdmissions;

    return [
      {
        stage: "Leads Inquired",
        count: totalLeads,
        percent: "100%",
        desc: "Marketing & desk inquiries",
        color: "from-sky-500 to-blue-600",
        bgTint: "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
      },
      {
        stage: "Prospects Logged",
        count: totalAdmissions,
        percent: totalLeads > 0 ? `${Math.round((totalAdmissions / totalLeads) * 100)}%` : `${totalAdmissions}`,
        desc: "Application forms filed",
        color: "from-purple-500 to-indigo-600",
        bgTint: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      },
      {
        stage: "Confirmed Admissions",
        count: confirmed,
        percent: totalAdmissions > 0 ? `${Math.round((confirmed / totalAdmissions) * 100)}%` : `${confirmed}`,
        desc: "Enrollment fee & voucher cleared",
        color: "from-amber-500 to-amber-600",
        bgTint: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      },
      {
        stage: "Fully Enrolled & Paid",
        count: fullPaid,
        percent: confirmed > 0 ? `${Math.round((fullPaid / confirmed) * 100)}%` : `${fullPaid}`,
        desc: "100% full package settlement",
        color: "from-emerald-500 to-teal-600",
        bgTint: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      },
    ];
  }, [data.leads, data.admissions, confirmedAdmissions, fullPaidAdmissions]);

  // Program Comparison Bar Chart Data
  const programComparisonData = useMemo(() => {
    return [
      {
        name: "FSc / Inter",
        boys: academicPerformance.fscBoysCount,
        girls: academicPerformance.fscGirlsCount,
        total: academicPerformance.fscCount,
        revenue: academicPerformance.fscCollection,
        avgYield: Math.round(academicPerformance.fscAvg),
      },
      {
        name: "DIT Tech",
        boys: academicPerformance.ditBoysCount,
        girls: academicPerformance.ditGirlsCount,
        total: academicPerformance.ditCount,
        revenue: academicPerformance.ditCollection,
        avgYield: Math.round(academicPerformance.ditAvg),
      },
      {
        name: "BS Honors",
        boys: academicPerformance.bsBoysCount,
        girls: academicPerformance.bsGirlsCount,
        total: academicPerformance.bsCount,
        revenue: academicPerformance.bsCollection,
        avgYield: Math.round(academicPerformance.bsAvg),
      },
      {
        name: "UK Level 3",
        boys: academicPerformance.ukL3BoysCount,
        girls: academicPerformance.ukL3GirlsCount,
        total: academicPerformance.ukL3Count,
        revenue: academicPerformance.ukL3Collection,
        avgYield: Math.round(academicPerformance.ukL3Avg),
      },
    ];
  }, [academicPerformance]);

  // Top Performing Sections / Classes Leaderboard
  const topSectionsData = useMemo(() => {
    const sectionMap: Record<string, { name: string; count: number; totalPkg: number; received: number; program: string; boys: number; girls: number }> = {};

    (data.students || []).forEach((s: any) => {
      const sec = s.section ? `Sec ${s.section}` : (s.group ? s.group : "Class A");
      const prog = s.category || "FSc";
      const key = `${prog} ${sec}`;

      if (!sectionMap[key]) {
        sectionMap[key] = {
          name: key,
          count: 0,
          totalPkg: 0,
          received: 0,
          program: prog,
          boys: 0,
          girls: 0,
        };
      }

      sectionMap[key].count += 1;
      sectionMap[key].totalPkg += Number(s.totalPackage || s.total_package || 0);
      sectionMap[key].received += Number(s.feeReceived || s.fee_received || 0);
      if (s.gender === "Female") {
        sectionMap[key].girls += 1;
      } else {
        sectionMap[key].boys += 1;
      }
    });

    return Object.values(sectionMap)
      .map((s) => ({
        ...s,
        recoveryRate: s.totalPkg > 0 ? Math.round((s.received / s.totalPkg) * 100) : 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [data.students]);

  return (
    <div className="space-y-8 pb-12 relative">
      {/* VisionOS Volumetric Spatial Ambient Atmosphere */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            x: [0, 60, -20, 0],
            y: [0, 40, -30, 0],
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[8%] -left-32 w-[520px] h-[520px] bg-superior-teal/15 dark:bg-emerald-500/10 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{
            x: [0, -50, 30, 0],
            y: [0, 60, -20, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[28%] -right-28 w-[480px] h-[480px] bg-superior-gold/15 dark:bg-amber-500/10 rounded-full blur-[130px]"
        />
        <motion.div
          animate={{
            x: [0, 40, -40, 0],
            y: [0, -40, 40, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[25%] left-[20%] w-[450px] h-[450px] bg-cyan-500/10 dark:bg-blue-600/10 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{
            x: [0, -30, 30, 0],
            y: [0, 50, -30, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-rose-500/10 dark:bg-purple-600/10 rounded-full blur-[130px]"
        />
      </div>

      {/* Hero Banner - VisionOS Spatial Glass Cockpit */}
      <div style={{ borderRadius: "2.5rem" }} className="relative overflow-hidden rounded-[2.5rem] p-6 lg:p-8 border border-white/20 dark:border-white/10 shadow-[0_20px_60px_rgba(8,90,78,0.22)] bg-gradient-to-br from-superior-teal via-superior-teal/95 to-slate-900/90 backdrop-blur-3xl z-10 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent">
        <div className="absolute top-0 right-0 w-2/3 h-full bg-[radial-gradient(ellipse_at_top_right,rgba(201,168,76,0.18),transparent_60%)] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-5 pl-2">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-[10px] font-black uppercase tracking-[0.25em]">
                <Sparkles size={12} className="text-superior-gold" />
                <span>
                  {(() => {
                    const collegeName = data.settings?.collegeName || "Superior College";
                    const campusName = data.settings?.campusName || "Jahanian";
                    if (!campusName) return collegeName;
                    return collegeName.toLowerCase().includes(campusName.toLowerCase())
                      ? collegeName
                      : `${collegeName}, ${campusName}`;
                  })()}
                </span>
                <span className="w-1 h-1 rounded-full bg-superior-gold" />
                <span className="text-superior-gold">Spatial OS v4</span>
              </div>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-black text-white tracking-tighter leading-none flex flex-wrap items-center gap-x-3.5">
                <span>CAMPUS</span>
                <span className="text-superior-gold">COMMAND CENTER</span>
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => {
                    setActivePage("admissions");
                    setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-admission')), 100);
                  }}
                  className="bg-superior-gold text-superior-teal hover:bg-superior-gold/90 font-black uppercase tracking-widest text-[11px] h-11 rounded-2xl px-6 shadow-xl shadow-superior-gold/20 transition-all hover:scale-105 active:scale-95"
                >
                  <UserPlus size={15} className="mr-1.5" />
                  New Admission
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActivePage("fee")}
                  className="bg-white/10 hover:bg-white/20 border-white/25 text-white h-11 rounded-2xl px-6 font-black uppercase tracking-widest text-[11px] backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                >
                  <CreditCard size={15} className="mr-1.5" />
                  Fee Ledger
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open("/?gate=true", "_blank")}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/40 text-emerald-200 h-11 rounded-2xl px-5 font-black uppercase tracking-widest text-[11px] backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                  title="Launch Standalone Gate Attendance Kiosk"
                >
                  <Camera size={15} className="mr-1.5 text-emerald-400 animate-pulse" />
                  Gate Kiosk
                  <ExternalLink size={12} className="ml-1 opacity-70" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-white/75 text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                  <span className="font-black uppercase tracking-widest">
                    Session: <span className="text-white font-bold">{selectedSession}</span>
                  </span>
                </div>
                <span className="text-white/30">•</span>
                <span className="font-semibold text-white/70">
                  Enrolled Scholars: <span className="text-white font-bold">{totalEnrollmentCount}</span>
                </span>
                <span className="text-white/30">•</span>
                <span className="font-semibold text-white/70">
                  Faculty: <span className="text-white font-bold">{totalStaff}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Spatial Glass HUD Widget */}
          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-2xl border border-white/20 dark:border-white/10 p-5 rounded-3xl text-right min-w-[280px] relative overflow-hidden shadow-2xl group before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-superior-gold/80" />
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[9px] font-black text-emerald-300 uppercase tracking-[0.2em] flex items-center gap-1">
                  <Zap size={11} /> Cloud Live
                </span>
              </div>
              <Select
                value={selectedSession}
                onValueChange={setSelectedSession}
              >
                <SelectTrigger className="w-[130px] h-8 bg-white/15 border-white/25 text-white text-[10px] font-black uppercase tracking-widest rounded-xl focus:ring-0 backdrop-blur-sm">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20 text-white rounded-xl backdrop-blur-xl">
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
              <p className="text-superior-gold text-[9px] font-black uppercase tracking-[0.25em]">
                Campus Time Pulse
              </p>
              <p className="text-white text-2xl font-display font-black tracking-tight">
                {currentDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <div className="flex items-center justify-end gap-2 text-white/70">
                <p className="text-xs font-semibold">
                  {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
                </p>
                <div className="w-1 h-1 rounded-full bg-white/30" />
                <p className="text-superior-gold font-mono text-sm font-bold tracking-widest">
                  {time.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>
            </div>

            <Separator className="my-3.5 bg-white/10" />
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/60 font-semibold uppercase tracking-wider">Gate Biometrics</span>
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <CheckCircle2 size={11} /> Standalone Ready
              </span>
            </div>
          </div>
        </div>

        {/* VisionOS Floating Segmented Navigation Dock */}
        <div className="relative z-20 mt-7 pt-5 border-t border-white/15 flex flex-wrap gap-2 w-full">
          {[
            { id: "overview", label: "Overview Command", icon: LayoutDashboard },
            { id: "directors", label: "Directors Equity", icon: ShieldCheck },
            { id: "staff", label: "Faculty & Staff", icon: Users },
            { id: "ai_copilot", label: "SCJ Nexus AI", icon: BrainCircuit },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDashboardTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-xs md:text-sm font-bold uppercase tracking-wider transition-all relative overflow-hidden",
                activeDashboardTab === tab.id
                  ? "text-superior-teal font-black shadow-lg"
                  : "text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm"
              )}
            >
              {activeDashboardTab === tab.id && (
                <motion.div
                  layoutId="dashboardTabBg"
                  className="absolute inset-0 bg-superior-gold rounded-2xl z-0 shadow-[0_0_20px_rgba(201,168,76,0.4)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
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
          {/* Today's Live Campus Spatial HUD (Heads-Up-Display) */}
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-700 dark:text-slate-200">
                  Today's Live Campus Spatial HUD
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Real-Time Gate & Financial Grounding
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ perspective: 1200 }}>
              {/* HUD 1: Student Attendance Gauge */}
              <motion.div
                whileHover={{ y: -5, scale: 1.015 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                onClick={() => setActivePage("attendance")}
                className="group relative overflow-hidden rounded-3xl p-5 bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_36px_rgba(8,90,78,0.06)] cursor-pointer transition-all hover:border-emerald-500/50 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-emerald-500/50 before:to-transparent"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={20} />
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[9px] font-black uppercase tracking-wider">
                    {todayLiveMetrics.calculatedRate}% Present
                  </Badge>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                  Today's Student Attendance
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                  <h4 className="text-3xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {todayLiveMetrics.present}
                  </h4>
                  <span className="text-xs font-bold text-slate-400">/ {totalEnrollmentCount || todayLiveMetrics.totalMarked || 0} Scholars</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                    style={{ width: `${Math.min(todayLiveMetrics.calculatedRate, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  <span>Late: <strong className="text-amber-500">{todayLiveMetrics.late}</strong></span>
                  <span>Absent: <strong className="text-rose-500">{todayLiveMetrics.absent}</strong></span>
                  <span className="text-emerald-600 dark:text-emerald-400">Bio: {todayLiveMetrics.faceKioskPunches + todayLiveMetrics.thumbPunches}</span>
                </div>
              </motion.div>

              {/* HUD 2: Today's Financial Velocity */}
              <motion.div
                whileHover={{ y: -5, scale: 1.015 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                onClick={() => setActivePage("fee")}
                className="group relative overflow-hidden rounded-3xl p-5 bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_36px_rgba(8,90,78,0.06)] cursor-pointer transition-all hover:border-superior-gold/50 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-superior-gold/50 before:to-transparent"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-superior-gold/10 text-superior-gold flex items-center justify-center border border-superior-gold/20 group-hover:scale-110 transition-transform">
                    <ReceiptText size={20} />
                  </div>
                  <Badge variant="outline" className="bg-superior-gold/10 text-superior-gold border-superior-gold/30 text-[9px] font-black uppercase tracking-wider">
                    {todayLiveMetrics.todayTxCount} Receipts
                  </Badge>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                  Today's Collection Flow
                </p>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-xs font-black text-slate-400">Rs.</span>
                  <h4 className="text-3xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {todayLiveMetrics.totalTodayIncome.toLocaleString()}
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase">Cash Drawer</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">Rs. {todayLiveMetrics.cashTodayIncome.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase">Bank / Online</span>
                    <strong className="text-blue-600 dark:text-blue-400">Rs. {todayLiveMetrics.bankTodayIncome.toLocaleString()}</strong>
                  </div>
                </div>
              </motion.div>

              {/* HUD 3: Staff & Faculty on Duty */}
              <motion.div
                whileHover={{ y: -5, scale: 1.015 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                onClick={() => setActivePage("staff")}
                className="group relative overflow-hidden rounded-3xl p-5 bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_36px_rgba(8,90,78,0.06)] cursor-pointer transition-all hover:border-blue-500/50 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-blue-500/50 before:to-transparent"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                    <Users size={20} />
                  </div>
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[9px] font-black uppercase tracking-wider">
                    {todayLiveMetrics.totalActiveStaff > 0 ? Math.round((todayLiveMetrics.staffPresent / todayLiveMetrics.totalActiveStaff) * 100) : 100}% Active
                  </Badge>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                  Faculty On Campus Today
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                  <h4 className="text-3xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {todayLiveMetrics.staffPresent}
                  </h4>
                  <span className="text-xs font-bold text-slate-400">/ {todayLiveMetrics.totalActiveStaff} Members</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Instructional: <strong className="text-slate-800 dark:text-slate-200">{teachersCount}</strong></span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">Classrooms Covered</span>
                </div>
              </motion.div>

              {/* HUD 4: Gate Biometric Kiosk Status & 1-Tap Launcher */}
              <motion.div
                whileHover={{ y: -5, scale: 1.015 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-emerald-500/10 via-white/80 to-teal-500/10 dark:from-emerald-950/40 dark:via-slate-900/70 dark:to-teal-950/30 backdrop-blur-2xl border border-emerald-500/30 dark:border-emerald-500/20 shadow-[0_12px_36px_rgba(8,90,78,0.06)] transition-all hover:border-emerald-500/60 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-emerald-400/60 before:to-transparent flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-110 transition-transform">
                      <Camera size={20} />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[9px] font-black uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Station Live
                    </span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-0.5">
                    Tablet Gate Attendance
                  </p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                    Face AI + Hamster Pro 20 Biometric Engine Active
                  </p>
                </div>
                <div className="pt-3">
                  <Button
                    size="sm"
                    onClick={() => window.open("/?gate=true", "_blank")}
                    className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={12} />
                    Open Standalone Kiosk
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Spatial 1-Click Floating Command Dock */}
          <div className="relative z-10 bg-white/75 dark:bg-slate-900/70 backdrop-blur-2xl rounded-3xl p-4 border border-slate-200/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between px-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-superior-gold shadow-[0_0_8px_rgba(201,168,76,0.8)] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">
                  Spatial Quick Action Command Dock
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                1-Tap Instant Operations
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <button
                onClick={() => window.open("/?gate=true", "_blank")}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                  <Camera size={19} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">Gate Kiosk</p>
                  <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 truncate">Face & Thumb</p>
                </div>
              </button>

              <button
                onClick={() => setActivePage("fee")}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 border border-emerald-200/70 dark:border-emerald-800/60 transition-all hover:scale-[1.02] active:scale-95 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform">
                  <CreditCard size={19} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">Collect Fee</p>
                  <p className="text-[10px] font-medium text-teal-700 dark:text-teal-400 truncate">Vouchers & Ledger</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setActivePage("admissions");
                  setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-admission')), 100);
                }}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 hover:bg-purple-100/80 dark:hover:bg-purple-900/40 border border-purple-200/70 dark:border-purple-800/60 transition-all hover:scale-[1.02] active:scale-95 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20 group-hover:scale-105 transition-transform">
                  <UserPlus size={19} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">New Admission</p>
                  <p className="text-[10px] font-medium text-purple-700 dark:text-purple-400 truncate">Enroll Candidate</p>
                </div>
              </button>

              <button
                onClick={() => setActivePage("attendance")}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 border border-blue-200/70 dark:border-blue-800/60 transition-all hover:scale-[1.02] active:scale-95 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
                  <CheckCircle2 size={19} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">Daily Register</p>
                  <p className="text-[10px] font-medium text-blue-700 dark:text-blue-400 truncate">Student & Staff</p>
                </div>
              </button>

              <button
                onClick={() => setActivePage("whatsapp-center")}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 hover:bg-teal-100/80 dark:hover:bg-teal-900/40 border border-teal-200/70 dark:border-teal-800/60 transition-all hover:scale-[1.02] active:scale-95 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform">
                  <MessageSquare size={19} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">WhatsApp Hub</p>
                  <p className="text-[10px] font-medium text-teal-700 dark:text-teal-400 truncate">Broadcast Notices</p>
                </div>
              </button>

              <button
                onClick={() => setActivePage("reports")}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 border border-amber-200/70 dark:border-amber-800/60 transition-all hover:scale-[1.02] active:scale-95 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-superior-gold text-superior-teal flex items-center justify-center shrink-0 shadow-md shadow-superior-gold/20 group-hover:scale-105 transition-transform">
                  <BarChart3 size={19} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">Executive Reports</p>
                  <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 truncate">Audit & Print</p>
                </div>
              </button>
            </div>
          </div>

          {/* Executive Graphical Intelligence Deck (Interactive Charts in Overview) */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between px-2">
              <div>
                <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  Executive Graphical Intelligence
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                  Financial velocity curves, real-time biometric radar & conversion analytics
                </p>
              </div>
              <Badge variant="outline" className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-1 rounded-xl shadow-xs">
                <Activity size={13} className="mr-1.5 text-emerald-500" /> Live Data Stream
              </Badge>
            </div>

            {/* Graphical Deck Row 1: Financial Wave (70%) + Today's Biometric Donut (30%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Card 1: 12-Month Financial Velocity AreaChart */}
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="lg:col-span-8 bg-white/80 dark:bg-slate-900/75 backdrop-blur-2xl rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-[0_16px_50px_rgba(8,90,78,0.06)] relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-emerald-500/50 before:to-transparent"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                          12-Month Financial Velocity & Reserves
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                          Gross Collections vs Operational Costs vs Institutional Reserves
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Time Range Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/60 self-start sm:self-auto">
                    {[
                      { id: "12m", label: "Full Year" },
                      { id: "6m", label: "Last 6M" },
                      { id: "3m", label: "Last 3M" },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => setVelocityTimeRange(btn.id as any)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                          velocityTimeRange === btn.id
                            ? "bg-white dark:bg-slate-900 text-superior-teal dark:text-superior-gold shadow-xs"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                        )}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AreaChart */}
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={financialVelocityData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="velocityIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="velocityExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="velocityReserves" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#c9a84c" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `Rs. ${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.9)",
                          backdropFilter: "blur(16px)",
                          borderColor: "rgba(255, 255, 255, 0.15)",
                          borderRadius: "1rem",
                          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                        formatter={(value: any, name: any) => [
                          `Rs. ${Number(value || 0).toLocaleString()}`,
                          name === "income"
                            ? "Verified Revenue"
                            : name === "expense"
                            ? "Operational Costs"
                            : "Treasury Reserves",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#velocityIncome)"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        fillOpacity={1}
                        fill="url(#velocityExpense)"
                      />
                      <Area
                        type="monotone"
                        dataKey="reserves"
                        stroke="#c9a84c"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#velocityReserves)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Bottom Chart Metric Pills */}
                <div className="grid grid-cols-3 gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div className="p-2.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">Verified Revenue</span>
                    <strong className="text-sm font-black text-emerald-900 dark:text-emerald-300">Rs. {activeStudentsRevenue.toLocaleString()}</strong>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">Expenses & Payroll</span>
                    <strong className="text-sm font-black text-rose-900 dark:text-rose-300">Rs. {(totalExpenses + staffAnalytics.totalBaseSalary).toLocaleString()}</strong>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">Current Operating Margin</span>
                    <strong className="text-sm font-black text-amber-900 dark:text-amber-300">
                      {activeStudentsRevenue > 0
                        ? `${Math.round(((activeStudentsRevenue - (totalExpenses + staffAnalytics.totalBaseSalary)) / activeStudentsRevenue) * 100)}%`
                        : "N/A"}
                    </strong>
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Today's Attendance & Biometric Composition Donut PieChart */}
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="lg:col-span-4 bg-white/80 dark:bg-slate-900/75 backdrop-blur-2xl rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-[0_16px_50px_rgba(8,90,78,0.06)] relative overflow-hidden flex flex-col justify-between before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-blue-500/50 before:to-transparent"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Fingerprint size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                          Today's Attendance Radar
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                          Biometric & Daily Punch Composition
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Donut Chart with Dynamic Center Badge */}
                  <div className="relative h-[190px] w-full flex items-center justify-center my-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={todayAttendancePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={82}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {todayAttendancePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.hex} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(15, 23, 42, 0.9)",
                            backdropFilter: "blur(16px)",
                            borderColor: "rgba(255, 255, 255, 0.15)",
                            borderRadius: "0.75rem",
                            fontSize: "11px",
                            fontWeight: "bold",
                            color: "#fff",
                          }}
                          formatter={(val: any, name: any) => [`${val} Students`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                        {todayLiveMetrics.calculatedRate}%
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        Attendance
                      </span>
                    </div>
                  </div>

                  {/* Legend Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                    {todayAttendancePieData.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.hex }}
                          />
                          <span className="text-slate-600 dark:text-slate-300 font-semibold">{item.name}</span>
                        </div>
                        <span className="text-slate-900 dark:text-slate-100 font-black">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Biometric Source Tag */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium">Gate Recognition:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Face Kiosk & SecuGen Ready
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Graphical Deck Row 2: Admission Funnel (6 cols) + Program Demographics BarChart (6 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Card 3: Admission & Marketing Conversion Funnel */}
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="lg:col-span-6 bg-white/80 dark:bg-slate-900/75 backdrop-blur-2xl rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-[0_16px_50px_rgba(8,90,78,0.06)] relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-purple-500/50 before:to-transparent flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Layers size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                          Admission Conversion Funnel
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                          Leads to Verified Student Enrollment Yield
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[9px] font-black uppercase">
                      Session {selectedSession}
                    </Badge>
                  </div>

                  {/* Funnel Visual Stages */}
                  <div className="space-y-3.5 my-2">
                    {admissionFunnelStages.map((stage, idx) => (
                      <div key={stage.stage} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{stage.stage}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">{stage.desc}</span>
                            <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
                              {stage.count.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000", stage.color)}
                            style={{
                              width: `${Math.max(
                                8,
                                Math.min(
                                  100,
                                  admissionFunnelStages[0].count > 0
                                    ? Math.round((stage.count / admissionFunnelStages[0].count) * 100)
                                    : (idx === 0 ? 100 : 25)
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Pipeline Velocity: <strong>{data.leads?.length ? `${Math.round((confirmedAdmissions.length / data.leads.length) * 100)}% Conv.` : "Enrolled"}</strong>
                  </span>
                  <button
                    onClick={() => setActivePage("leads")}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 font-bold text-[11px] flex items-center gap-1"
                  >
                    Manage Pipeline <ArrowRight size={13} />
                  </button>
                </div>
              </motion.div>

              {/* Card 4: Academic Program & Gender Comparison BarChart */}
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="lg:col-span-6 bg-white/80 dark:bg-slate-900/75 backdrop-blur-2xl rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-[0_16px_50px_rgba(8,90,78,0.06)] relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-superior-gold/50 before:to-transparent flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-superior-gold/10 text-superior-gold flex items-center justify-center">
                        <BarChart3 size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                          Program Demographics & Yield
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                          Boys vs Girls Enrollment Across Academic Wings
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-superior-gold/10 text-superior-gold border-superior-gold/30 text-[9px] font-black uppercase">
                      {totalEnrollmentCount} Scholars
                    </Badge>
                  </div>

                  {/* Recharts BarChart */}
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={programComparisonData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                        <XAxis
                          dataKey="name"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(15, 23, 42, 0.9)",
                            backdropFilter: "blur(16px)",
                            borderColor: "rgba(255, 255, 255, 0.15)",
                            borderRadius: "1rem",
                            fontSize: "11px",
                            fontWeight: "bold",
                            color: "#fff",
                          }}
                          formatter={(val: any, name: any) => [
                            `${val} Students`,
                            name === "boys" ? "Boys" : "Girls",
                          ]}
                        />
                        <Bar dataKey="boys" name="Boys" fill="#085a4e" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="girls" name="Girls" fill="#fb7185" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-superior-teal" /> Boys: {mergedBoysCount}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Girls: {mergedGirlsCount}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase">
                    Combined Avg: Rs. {Math.round(academicPerformance.totalAvg).toLocaleString()}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Top Sections & Academic Cohorts Leaderboard */}
            {topSectionsData.length > 0 && (
              <div className="bg-white/80 dark:bg-slate-900/75 backdrop-blur-2xl rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-[0_16px_50px_rgba(8,90,78,0.06)] relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Award size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Top Academic Sections & Cohort Leaderboard
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                        Ranked by student strength, fee clearance & classroom capacity
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[9px] font-black uppercase">
                    Top 4 Cohorts
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {topSectionsData.map((sec, idx) => (
                    <motion.div
                      key={sec.name}
                      whileHover={{ y: -4 }}
                      className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="w-6 h-6 rounded-lg bg-superior-gold/15 text-superior-gold font-black text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider bg-white dark:bg-slate-900">
                          {sec.recoveryRate}% Recovery
                        </Badge>
                      </div>
                      <h5 className="font-black text-sm text-slate-800 dark:text-slate-100 truncate mb-1">
                        {sec.name}
                      </h5>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{sec.count}</span>
                        <span className="text-[11px] font-semibold text-slate-400">Students ({sec.boys}B / {sec.girls}G)</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(sec.recoveryRate, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                        <span>Cleared: <strong>Rs. {sec.received.toLocaleString()}</strong></span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Program-wise Gender Breakdown */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between px-2">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Academic Group Demographics</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Real-time Boys vs Girls split across programs</p>
              </div>
              <Badge variant="outline" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-black px-4 py-1.5 rounded-xl shadow-sm">
                <Users size={14} className="mr-2 text-superior-teal dark:text-superior-gold" />
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
                      y: -10,
                      scale: 1.03,
                      boxShadow: "0 20px 40px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.05)"
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 22 }}
                    className={cn(
                      "bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 relative overflow-hidden flex flex-col justify-between transition-colors duration-300",
                      prog.color === "emerald" ? "border-emerald-500/40 dark:border-emerald-600/40 shadow-lg shadow-emerald-500/5" : 
                      prog.color === "blue" ? "border-blue-500/40 dark:border-blue-600/40 shadow-lg shadow-blue-500/5" : 
                      prog.color === "rose" ? "border-rose-500/40 dark:border-rose-600/40 shadow-lg shadow-rose-500/5" : "border-indigo-500/40 dark:border-indigo-600/40 shadow-lg shadow-indigo-500/5"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-superior-gold rounded-full shadow-[0_0_8px_rgba(201,168,76,0.6)]" />
          <div>
            <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Financial & Operational Snapshot
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Real-time ledger and cash flow health</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-3">
            Month:
          </span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] h-9 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-200 focus:bg-white font-bold text-xs">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 shadow-2xl bg-white dark:bg-slate-900">
              <SelectItem value="all" className="font-bold text-xs">
                Total Collection (All Months)
              </SelectItem>
              {monthsList.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {m} {new Date().getFullYear()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Financial Snapshot - Elevated Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Monthly Collection Card */}
        <div 
          onClick={() => setActivePage("fee")}
          className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 rounded-3xl p-6 border border-emerald-500/20 dark:border-emerald-800/40 relative overflow-hidden cursor-pointer hover:shadow-xl transition-all group flex flex-col justify-between min-h-[175px]"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <ReceiptText size={16} />
                <p className="text-[11px] font-black uppercase tracking-widest">
                  {selectedMonth === "all" ? "TOTAL REVENUE" : `${selectedMonth.toUpperCase()} COLLECTION`}
                </p>
              </div>
              <Badge className="bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg">
                Active Flow
              </Badge>
            </div>
            <h4 className="text-3xl lg:text-4xl font-display font-black text-emerald-700 dark:text-emerald-400 tracking-tighter mt-1">
              Rs. {(monthlyIncome || 0).toLocaleString()}
            </h4>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
              {selectedMonth === "all" ? "Total verified tuition & fees received" : "Verified ledger payments received this month"}
            </p>
          </div>
          {/* Visual Mini Chart Bars */}
          <div className="flex items-end gap-1.5 h-10 mt-4 opacity-80 group-hover:opacity-100 transition-opacity">
            {[35, 55, 75, 45, 90, 60, 85].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-emerald-500/60 dark:bg-emerald-500/40 group-hover:bg-emerald-500 transition-colors" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* PSA Card */}
        <div 
          onClick={() => setActivePage("fee")}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:shadow-xl transition-all flex flex-col justify-between min-h-[175px]"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <TrendingUp size={16} className="text-superior-gold" />
                <p className="text-[11px] font-black uppercase tracking-widest">PER STUDENT AVG (PSA)</p>
              </div>
              <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-bold">
                Cohort Metric
              </Badge>
            </div>
            <h4 className="text-3xl lg:text-4xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tighter mt-1">
              Rs. {Math.round(academicPerformance.totalAvg).toLocaleString()}
            </h4>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Average annualized package value per student
            </p>
          </div>
          {activeStudentsRevenue > 0 && (
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg">
                <ArrowUpRight size={12} /> Institutional Yield Optimal
              </span>
            </div>
          )}
        </div>

        {/* Consolidated Campus Operations Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 gap-4 gap-y-5">
           <div className="cursor-pointer group" onClick={() => setActivePage("students-boys")}>
             <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1 leading-none">TOTAL ENROLLMENT</p>
             <h5 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter mb-1 leading-none group-hover:text-superior-teal transition-colors">{totalEnrollmentCount}</h5>
             <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md px-1.5 py-0 text-[9px] border-slate-200 dark:border-slate-700">All programs</Badge>
           </div>
           
           <div className="cursor-pointer group" onClick={() => setActivePage("staff")}>
             <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1 leading-none">STAFF SQUAD</p>
             <h5 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter mb-1 leading-none group-hover:text-amber-600 transition-colors">{totalStaff} Members</h5>
             <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-md px-1.5 py-0 text-[9px] border-emerald-200 dark:border-emerald-800 flex w-max items-center gap-1"><CheckCircle2 size={9} /> Active Staff</Badge>
           </div>

           <div className="cursor-pointer group" onClick={() => setActivePage("leads")}>
             <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1 leading-none">MARKETING PIPELINE</p>
             <h5 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter mb-1 leading-none group-hover:text-pink-600 transition-colors">{(data.leads?.length || 0).toLocaleString()} Leads</h5>
             <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 rounded-md px-1.5 py-0 text-[9px] border-purple-200 dark:border-purple-800">
                Admissions pool
             </Badge>
           </div>

           <div className="cursor-pointer group" onClick={() => setActivePage("admissions")}>
             <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1 leading-none">CONFIRMED SEATS</p>
             <h5 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter mb-1 leading-none group-hover:text-superior-teal transition-colors">
                {confirmedAdmissions.length}
             </h5>
             <Badge variant="outline" className="bg-superior-gold/15 text-superior-gold rounded-md px-1.5 py-0 text-[9px] border-superior-gold/30">
               {data.leads?.length ? `${Math.round((confirmedAdmissions.length / data.leads.length) * 100)}% Conv.` : "Enrolled"}
             </Badge>
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
      whileHover={{ y: -8, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white/80 dark:bg-slate-900/75 backdrop-blur-2xl p-7 rounded-[2.5rem] border border-slate-200/80 dark:border-white/10 shadow-[0_12px_40px_rgba(8,90,78,0.06)] cursor-pointer hover:border-superior-teal/40 dark:hover:border-superior-gold/40 transition-all duration-500 group relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-slate-200/10 dark:from-white/5 dark:to-transparent pointer-events-none" />
      <div className="absolute inset-0 border-4 border-transparent group-active:border-superior-gold/20 transition-colors pointer-events-none rounded-[2.5rem]" />
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div
          className={cn(
            "w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner shadow-black/20",
            colorMap[color],
          )}
        >
          <Icon size={26} />
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-tight shadow-sm border border-white/50 backdrop-blur-sm",
              isUp
                ? "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
            )}
          >
            {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5">
          {title}
        </p>
        <h3 className="text-3xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight group-hover:translate-x-1 transition-transform">
          {value}
        </h3>
        {subValue && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium italic opacity-85">
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
