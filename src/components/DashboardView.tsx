
import React, { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
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
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
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
  Area
} from 'recharts';

export default function DashboardView({ 
  data, 
  setActivePage,
  selectedSession,
  setSelectedSession 
}: { 
  data: any, 
  setActivePage: any,
  selectedSession: string,
  setSelectedSession: (s: string) => void
}) {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalApplicants = useMemo(() => data.admissions.length, [data.admissions]);
  const confirmedAdmissions = useMemo(() => {
    const activeStudentIds = new Set(data.students.map((s: any) => s.id));
    const activeAdmissionIdsForStudents = new Set(data.students.map((s: any) => s.admissionId).filter(Boolean));

    return data.admissions.filter((a: any) => {
      const isConfirmedStatus = a.isAdmitted || 
        a.status === 'Admitted/Confirmed' || 
        a.status === 'Admitted' || 
        a.status === 'Full Paid' || 
        a.status === 'Partial Paid' ||
        (a.feeReceived > 0) ||
        (a.totalPackage > 0);
      
      if (!isConfirmedStatus) return false;

      // Only count if they are a current student OR a pending applicant who hasn't been linked to any student yet
      const isLinkedToCurrentStudent = activeAdmissionIdsForStudents.has(a.id) || (a.studentId && activeStudentIds.has(a.studentId));
      const isPendingApplicant = !a.studentId;

      return isLinkedToCurrentStudent || isPendingApplicant;
    });
  }, [data.admissions, data.students]);
  
  const [selectedMonth, setSelectedMonth] = React.useState<string>(new Date().toLocaleString('default', { month: 'long' }));
  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Total Enrollment = Registered Students + Confirmed but not-yet-processed admissions
  const mergedGenderCounts = useMemo(() => {
    const allRelevantStudents = [
      ...data.students,
      ...confirmedAdmissions.filter((a: any) => !data.students.some((s: any) => s.admissionId === a.id || s.id === a.studentId))
    ].map(s => {
      let derivedGender = s.gender;
      if (!derivedGender) {
        const identifier = (`${s.category || ''} ${s.group || ''}`).toLowerCase();
        if (identifier.includes('girl') || identifier.includes('female')) {
          derivedGender = 'Female';
        } else {
          derivedGender = 'Male';
        }
      }
      return { ...s, gender: derivedGender };
    });

    const boys = allRelevantStudents.filter(s => s.gender === 'Male').length;
    const girls = allRelevantStudents.filter(s => s.gender === 'Female').length;

    return { boys, girls };
  }, [data.students, confirmedAdmissions]);

  const mergedBoysCount = mergedGenderCounts.boys;
  const mergedGirlsCount = mergedGenderCounts.girls;

  const totalEnrollmentCount = mergedBoysCount + mergedGirlsCount;

  const fullPaidAdmissions = useMemo(() => data.admissions.filter((a: any) => a.status === 'Full Paid').length, [data.admissions]);
  const partialPaidAdmissions = useMemo(() => data.admissions.filter((a: any) => a.status === 'Partial Paid').length, [data.admissions]);
  const notPaidAdmissions = useMemo(() => data.admissions.filter((a: any) => a.status === 'Not Paid' || a.status === 'Prospective').length, [data.admissions]);

  const boysCount = mergedBoysCount;
  const girlsCount = mergedGirlsCount;
  
  const teachersCount = useMemo(() => data.staff.filter((s: any) => s.role === 'Lecturer').length, [data.staff]);
  const totalStaff = useMemo(() => data.staff.length, [data.staff]);

  const defaultersCount = useMemo(() => data.students.filter((s: any) => 
    s.feeHistory?.some((f: any) => f.status === 'Unpaid' || f.status === 'Partial') ||
    (s.feeLedger?.remainingBalance > 0 && s.feeLedger?.installments?.some((inst: any) => inst.status === 'Overdue'))
  ).length, [data.students, data.admissions]);

  const activeIncomes = useMemo(() => {
    const activeStudentIds = new Set(data.students.map((s: any) => s.id));
    const activeAdmissionIdsForStudents = new Set(data.students.map((s: any) => s.admissionId).filter(Boolean));
    const activeStudentNames = new Set(data.students.map((s: any) => s.fullName?.toLowerCase().trim()).filter(Boolean));

    // We only consider admissions as "active" for income tracking if:
    // 1. They are linked to an existing student
    // 2. OR they are purely pending/prospective candidates who haven't been promoted to a student yet
    const validAdmissions = data.admissions.filter((a: any) => {
      if (activeAdmissionIdsForStudents.has(a.id)) return true;
      if (a.studentId && !activeStudentIds.has(a.studentId)) return false;
      // If it doesn't have a studentId, it's a pending applicant - we show their money
      return !a.studentId;
    });

    const activeIds = new Set([
      ...activeStudentIds,
      ...validAdmissions.map((a: any) => a.id)
    ]);
    const activeNames = new Set([
        ...activeStudentNames,
        ...validAdmissions.map((a: any) => a.fullName?.toLowerCase().trim()).filter(Boolean)
    ]);

    return data.incomes.filter((inc: any) => {
      if (inc.studentId && inc.studentId.trim() !== '') {
          return activeIds.has(inc.studentId);
      }
      if (inc.studentName && inc.studentName.trim() !== '') {
          return activeNames.has(inc.studentName.toLowerCase().trim());
      }
      return true; 
    });
  }, [data.incomes, data.students, data.admissions]);

  const recentActivities = useMemo(() => [
    ...activeIncomes.slice(-2).map((i: any) => ({
      icon: Wallet,
      color: "gold",
      title: "Income Received",
      desc: `Rs. ${(i.amount || 0).toLocaleString()} received from ${i.studentName}.`,
      time: "Recent"
    })),
    ...data.admissions.slice(-2).map((a: any) => ({
      icon: UserPlus,
      color: "teal",
      title: "New Enrollment",
      desc: `${a.fullName} in ${a.group}.`,
      time: "Recent"
    })),
    ...data.expenses.slice(-1).map((e: any) => ({
      icon: TrendingDown,
      color: "red",
      title: "Expense Logged",
      desc: `Rs. ${(e.amount || 0).toLocaleString()} spent on ${e.category}.`,
      time: "Recent"
    }))
  ].sort(() => 0.5 - Math.random()).slice(0, 4), [activeIncomes, data.admissions, data.expenses]);

  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  const monthlyIncome = useMemo(() => {
    const getMonthFromDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleString('default', { month: 'long' });
    };

    const targetYear = new Date().getFullYear();

    // Monthly flow should primarily come from individual income transactions
    const fromIncomes = activeIncomes.filter((inc: any) => {
        if (selectedMonth === 'all') return true;
        const incMonth = inc.month || getMonthFromDate(inc.date);
        const incYear = inc.year || (inc.date ? new Date(inc.date).getFullYear() : targetYear);
        return incMonth === selectedMonth && Number(incYear) === targetYear;
    }).reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

    // Ensure admission fees directly recorded are accounted for if no formal income record exists
    const fromPendingAdmissions = data.admissions.filter((a: any) => {
        // If a month is selected, only include if dates match
        if (selectedMonth !== 'all') {
            const admMonth = getMonthFromDate(a.date);
            const admYear = a.date ? new Date(a.date).getFullYear() : targetYear;
            if (admMonth !== selectedMonth || Number(admYear) !== targetYear) return false;
        }
        
        // Stricter Activity Check: Only candidates or current students
        const activeStudentIds = new Set(data.students.map((s: any) => s.id));
        const activeAdmissionIdsForStudents = new Set(data.students.map((s: any) => s.admissionId).filter(Boolean));
        
        const isCurrentlyActive = activeAdmissionIdsForStudents.has(a.id) || (a.studentId && activeStudentIds.has(a.studentId));
        const isPendingCandidate = !a.studentId;

        if (!isCurrentlyActive && !isPendingCandidate) return false;

        // Check total received for this student in income records
        const studentIncomesTotal = activeIncomes
            .filter((inc: any) => inc.studentId === a.studentId || (inc.studentName === a.fullName))
            .reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);

        // Only add the difference if admission record shows more than what is reflected in individual income records
        return Number(a.feeReceived) > studentIncomesTotal;
    }).reduce((acc: number, curr: any) => {
        const studentIncomesTotal = activeIncomes
            .filter((inc: any) => inc.studentId === curr.studentId || (inc.studentName === curr.fullName))
            .reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);
        
        const outstandingFromAdmissionDoc = Math.max(0, Number(curr.feeReceived) - studentIncomesTotal);
        return acc + outstandingFromAdmissionDoc;
    }, 0);

    return fromIncomes + fromPendingAdmissions;
  }, [activeIncomes, data.admissions, data.students, selectedMonth]);

  // Academic-specific total collected fees (only active students)
  const activeStudentsRevenue = useMemo(() => {
    const studentCollections = data.students.reduce((acc: number, s: any) => acc + (Number(s.feeReceived) || 0), 0);
    const admissionCollections = confirmedAdmissions
      .filter((a: any) => !data.students.some((s: any) => s.admissionId === a.id || s.id === a.studentId))
      .reduce((acc: number, a: any) => acc + (Number(a.feeReceived) || 0), 0);
    
    return studentCollections + admissionCollections;
  }, [data.students, data.admissions, confirmedAdmissions]);

  const genderData = useMemo(() => [
    { name: 'Boys', value: boysCount, color: '#085a4e' },
    { name: 'Girls', value: girlsCount, color: '#fb7185' },
  ], [boysCount, girlsCount]);

  // Academic breakdown for average calculations
  const academicPerformance = useMemo(() => {
    const allRelevantStudents = [
      ...data.students,
      ...confirmedAdmissions.filter((a: any) => !data.students.some((s: any) => s.admissionId === a.id || s.id === a.studentId))
    ].map(s => {
      let derivedGender = s.gender;
      if (!derivedGender) {
        const identifier = (`${s.category || ''} ${s.group || ''}`).toLowerCase();
        if (identifier.includes('girl') || identifier.includes('female')) {
          derivedGender = 'Female';
        } else {
          derivedGender = 'Male';
        }
      }
      return {
        ...s,
        gender: derivedGender,
        calcPackage: (s.feeLedger?.totalPackage || s.totalPackage || s.total_package || s.fee_package) 
          ? Number(s.feeLedger?.totalPackage || s.totalPackage || s.total_package || s.fee_package) 
          : (Number(s.registrationFee || 0) + (Number(s.monthlyFee || s.monthly_fee || 0) * Number(s.totalInstallments || s.total_installments || 12))),
        calcReceived: Number(s.feeReceived || 0),
        calcIdentifier: (`${s.category || ''} ${s.group || ''} ${s.stream || ''}`).toLowerCase()
      }
    });

    const fscList = allRelevantStudents.filter(s => 
      !s.calcIdentifier.includes('dit') && !s.calcIdentifier.includes('uk') && !s.calcIdentifier.includes('level 3') && !s.calcIdentifier.includes('bs ') && (
        s.calcIdentifier.includes('fsc') || 
        s.calcIdentifier.includes('f.sc') || 
        s.calcIdentifier.includes('fcs') ||
        s.calcIdentifier.includes('pre-med') ||
        s.calcIdentifier.includes('pre-eng') ||
        s.calcIdentifier.includes('ics') ||
        s.calcIdentifier.includes('general science')
      )
    );
    const bsList = allRelevantStudents.filter(s => s.calcIdentifier.includes('bs'));
    const ditList = allRelevantStudents.filter(s => s.calcIdentifier.includes('dit'));
    const ukL3List = allRelevantStudents.filter(s => s.calcIdentifier.includes('uk') || s.calcIdentifier.includes('level 3'));
    
    // Isolation for FSc specifics
    const fscBoys = fscList.filter(s => s.gender === 'Male');
    const fscGirls = fscList.filter(s => s.gender === 'Female');
    
    // Isolation for BS specifics
    const bsBoys = bsList.filter(s => s.gender === 'Male');
    const bsGirls = bsList.filter(s => s.gender === 'Female');

    // Isolation for DIT specifics
    const ditBoys = ditList.filter(s => s.gender === 'Male');
    const ditGirls = ditList.filter(s => s.gender === 'Female');
    
    // Isolation for UK L3 specifics
    const ukL3Boys = ukL3List.filter(s => s.gender === 'Male');
    const ukL3Girls = ukL3List.filter(s => s.gender === 'Female');

    const calcAvg = (list: any[]) => {
      if (list.length === 0) return 0;
      const sum = list.reduce((acc: number, s: any) => acc + s.calcPackage, 0);
      return sum / list.length;
    };

    const calcCollection = (list: any[]) => list.reduce((acc, s) => acc + (s.calcReceived || 0), 0);

    const boysList = allRelevantStudents.filter(s => s.gender === 'Male');
    const girlsList = allRelevantStudents.filter(s => s.gender === 'Female');

    // Categorized package totals for cluster info
    const totalInvoiced = allRelevantStudents.reduce((acc, s) => acc + s.calcPackage, 0);

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
      totalAvg: calcAvg(allRelevantStudents),
      totalInvoiced,
      studentCounts: {
        part1: allRelevantStudents.filter(s => (s.academicPart || s.academic_part) === 'Part-1').length,
        part2: allRelevantStudents.filter(s => (s.academicPart || s.academic_part) === 'Part-2').length,
        semester1: allRelevantStudents.filter(s => Number(s.currentSemester) === 1 || Number(s.current_semester) === 1).length,
        semester2: allRelevantStudents.filter(s => Number(s.currentSemester) === 2 || Number(s.current_semester) === 2).length,
        semester3: allRelevantStudents.filter(s => Number(s.currentSemester) === 3 || Number(s.current_semester) === 3).length,
        semester4: allRelevantStudents.filter(s => Number(s.currentSemester) === 4 || Number(s.current_semester) === 4).length,
      },
      ditSemesters: {
        sem1: ditList.filter(s => Number(s.currentSemester) === 1 || Number(s.current_semester) === 1 || !s.currentSemester).length,
        sem2: ditList.filter(s => Number(s.currentSemester) === 2 || Number(s.current_semester) === 2).length,
        sem3: ditList.filter(s => Number(s.currentSemester) === 3 || Number(s.current_semester) === 3).length,
        sem4: ditList.filter(s => Number(s.currentSemester) === 4 || Number(s.current_semester) === 4).length,
      },
      bsSemesters: {
        sem1: bsList.filter(s => Number(s.currentSemester) === 1 || Number(s.current_semester) === 1 || !s.currentSemester).length,
        sem2: bsList.filter(s => Number(s.currentSemester) === 2 || Number(s.current_semester) === 2).length,
        sem3: bsList.filter(s => Number(s.currentSemester) === 3 || Number(s.current_semester) === 3).length,
        sem4: bsList.filter(s => Number(s.currentSemester) === 4 || Number(s.current_semester) === 4).length,
        sem5: bsList.filter(s => Number(s.currentSemester) === 5 || Number(s.current_semester) === 5).length,
        sem6: bsList.filter(s => Number(s.currentSemester) === 6 || Number(s.current_semester) === 6).length,
        sem7: bsList.filter(s => Number(s.currentSemester) === 7 || Number(s.current_semester) === 7).length,
        sem8: bsList.filter(s => Number(s.currentSemester) === 8 || Number(s.current_semester) === 8).length,
      },
      ukL3Semesters: {
        sem1: ukL3List.filter(s => Number(s.currentSemester) === 1 || Number(s.current_semester) === 1 || !s.currentSemester).length,
        sem2: ukL3List.filter(s => Number(s.currentSemester) === 2 || Number(s.current_semester) === 2).length,
        sem3: ukL3List.filter(s => Number(s.currentSemester) === 3 || Number(s.current_semester) === 3).length,
      },
      fscParts: {
        part1: fscList.filter(s => (s.academicPart || s.academic_part) === 'Part-1' || !s.academicPart).length,
        part2: fscList.filter(s => (s.academicPart || s.academic_part) === 'Part-2').length,
      }
    };
  }, [data.students, confirmedAdmissions]);

  // Total Expenses
  const totalExpenses = useMemo(() => {
    return (data.expenses || []).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
  }, [data.expenses]);

  // Information Cluster Data Points
  const infoCluster = useMemo(() => {
    return [
      { label: "Lead Conversion", value: data.leads?.length ? `${Math.round((confirmedAdmissions.length / data.leads.length) * 100)}%` : '0%', icon: TrendingUp, color: "text-emerald-600", bgColor: "bg-emerald-50/50", border: "border-emerald-100/50", desc: "Leads to Admission" },
      { label: "Male Students", value: mergedBoysCount, icon: Users, color: "text-blue-600", bgColor: "bg-blue-50/50", border: "border-blue-100/50", desc: "Active Boys Count" },
      { label: "Female Students", value: mergedGirlsCount, icon: Users, color: "text-rose-600", bgColor: "bg-rose-50/50", border: "border-rose-100/50", desc: "Active Girls Count" },
      { label: "Instructional Staff", value: teachersCount, icon: GraduationCap, color: "text-indigo-600", bgColor: "bg-indigo-50/50", border: "border-indigo-100/50", desc: "Active Lecturers" },
      { label: "Support Personnel", value: totalStaff - teachersCount, icon: Briefcase, color: "text-slate-600", bgColor: "bg-slate-50/50", border: "border-slate-100/50", desc: "Admin & Support" },
      { label: "Academic Part-I", value: academicPerformance.studentCounts.part1, icon: BarChart3, color: "text-amber-600", bgColor: "bg-amber-50/50", border: "border-amber-100/50", desc: "Freshman Enrollment" },
      { label: "Academic Part-II", value: academicPerformance.studentCounts.part2, icon: BarChart3, color: "text-cyan-600", bgColor: "bg-cyan-50/50", border: "border-cyan-100/50", desc: "Senior Enrollment" },
      { label: "Total Receivables", value: `Rs. ${academicPerformance.totalInvoiced.toLocaleString()}`, icon: Wallet, color: "text-superior-teal", bgColor: "bg-superior-teal/5", border: "border-superior-teal/10", desc: "Combined Package Sum" },
      { label: "Fee Received (Active)", value: `Rs. ${activeStudentsRevenue.toLocaleString()}`, icon: CheckCircle2, color: "text-emerald-500", bgColor: "bg-emerald-50/50", border: "border-emerald-100/50", desc: "Student Fee Collected" },
      { label: "Pending Student Dues", value: `Rs. ${(academicPerformance.totalInvoiced - activeStudentsRevenue).toLocaleString()}`, icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-50/50", border: "border-red-100/50", desc: "For Active Students" },
      { label: "Avg. Yield / Head", value: `Rs. ${Math.round(academicPerformance.totalAvg).toLocaleString()}`, icon: TrendingUp, color: "text-emerald-700", bgColor: "bg-emerald-50/80", border: "border-emerald-200/50", desc: "Institutional PSA" },
      { label: "Total Expenses", value: `Rs. ${totalExpenses.toLocaleString()}`, icon: TrendingDown, color: "text-orange-600", bgColor: "bg-orange-50/50", border: "border-orange-100/50", desc: "All College Costs" }
    ];
  }, [data.leads, confirmedAdmissions, mergedBoysCount, mergedGirlsCount, teachersCount, totalStaff, academicPerformance, activeStudentsRevenue, totalExpenses]);

  return (
    <div className="space-y-8 pb-12 relative">
      {/* Dynamic Background Highlights - Giving "Life" to the Dashboard */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            x: [0, 50, 0], 
            y: [0, 30, 0],
            scale: [1, 1.1, 1] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -left-20 w-96 h-96 bg-superior-teal/5 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -40, 0], 
            y: [0, 50, 0],
            scale: [1, 1.2, 1] 
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[20%] -right-20 w-80 h-80 bg-superior-gold/5 rounded-full blur-[100px]" 
        />
      </div>

      {/* Hero Banner - ORIGINAL Branded Version */}
      <div className="relative overflow-hidden bg-superior-teal rounded-[2.5rem] p-10 border border-superior-teal/20 shadow-2xl shadow-superior-teal/20 z-10">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-superior-gold/5 to-transparent pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-8 pl-4">
            <div className="space-y-2">
              <h1 className="text-white text-lg font-black uppercase tracking-[0.4em] opacity-80 pl-1">
                {data.settings?.collegeName || 'Superior College'}, {data.settings?.campusName || 'Jahanian'}
              </h1>
              <h2 className="text-5xl md:text-8xl font-display font-black text-white tracking-tighter leading-[0.85] flex flex-col">
                <span>ADMIN</span>
                <span className="text-superior-gold">DASHBOARD</span>
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => setActivePage('admissions')}
                  className="bg-superior-gold text-superior-teal hover:bg-superior-gold/90 font-black uppercase tracking-widest text-[10px] h-11 rounded-xl px-6 shadow-lg shadow-superior-gold/10 transition-all active:scale-95"
                >
                  New Admission
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setActivePage('reports')}
                  className="bg-transparent border-white/20 text-white hover:bg-white/10 h-11 rounded-xl px-6 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                >
                  View Reports
                </Button>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <div className="w-2 h-2 rounded-full bg-superior-gold animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Ongoing Session: <span className="text-white">{selectedSession}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl text-right min-w-[260px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1 h-full bg-superior-gold/50" />
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em]">System Live</span>
              </div>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="w-[130px] h-7 bg-white/10 border-white/20 text-white text-[9px] font-black uppercase tracking-widest rounded-lg focus:ring-0">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent className="bg-superior-teal border-superior-teal/50 text-white">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-widest focus:bg-white/10">All Sessions</SelectItem>
                  {(data.availableSessions || ['2024-26', '2025-27', '2026-28', '2027-29']).map((session: string) => (
                    <SelectItem key={session} value={session} className="text-[10px] font-bold uppercase tracking-widest focus:bg-white/10">
                      {session}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <p className="text-superior-gold text-[9px] font-black uppercase tracking-[0.2em] mb-1">Current Date & Time</p>
              <p className="text-white text-xl font-display font-black tracking-tight">
                {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="flex items-center justify-end gap-2">
                <p className="text-white/40 text-xs font-medium">{currentDate.toLocaleDateString('en-US', { weekday: 'long' })}</p>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <p className="text-white font-mono text-sm tracking-widest">
                  {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </p>
              </div>
            </div>

            <Separator className="my-4 bg-white/5" />
            <div className="flex items-center justify-end gap-2 text-superior-gold">
              <div className="w-6 h-6 rounded-lg bg-superior-gold/20 flex items-center justify-center">
                <TrendingUp size={12} />
              </div>
              <span className="text-[10px] font-black tracking-tight uppercase">Active Filter: {selectedSession}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty Session Alarm */}
      {totalApplicants === 0 && confirmedAdmissions.length === 0 && selectedSession !== 'all' && (
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
                <p className="text-amber-900 font-black uppercase tracking-widest text-[11px] leading-tight">No Active Records for Session "{selectedSession}"</p>
                <p className="text-amber-700/70 text-xs font-medium mt-1">We couldn't find any admissions or students for this specific session ID. Try switching to <span className="font-bold">"All Sessions"</span> or check your settings.</p>
              </div>
            </div>
            <Button 
              onClick={() => setSelectedSession('all')}
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
          <h3 className="text-xl font-serif font-black text-slate-800">Financial Snapshot</h3>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Viewing Data For:</span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl bg-slate-50 border-transparent focus:bg-white transition-all font-bold text-slate-600">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
              <SelectItem value="all" className="font-bold">Total Collection (All Months)</SelectItem>
              {monthsList.map(m => (
                <SelectItem key={m} value={m}>{m} {new Date().getFullYear()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid - RESTORED ORIGINAL MODULES */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
        <StatCard 
          title="Total Enrollment" 
          value={totalEnrollmentCount} 
          isUp={true}
          icon={Users}
          color="teal"
          onClick={() => setActivePage('students-boys')}
        />
        <StatCard 
          title={selectedMonth === 'all' ? "Total Revenue" : `${selectedMonth} Collection`} 
          value={`Rs. ${(monthlyIncome || 0).toLocaleString()}`} 
          isUp={true}
          icon={Wallet}
          color="gold"
          onClick={() => setActivePage('accounts')}
        />
        <StatCard 
          title="Per Student Avg (PSA)" 
          value={`Rs. ${Math.round(academicPerformance.totalAvg).toLocaleString()}`} 
          subValue="Institutional Value / Student"
          trend={activeStudentsRevenue > 0 ? "Calculated" : null}
          isUp={true}
          icon={TrendingUp}
          color="teal"
          onClick={() => setActivePage('accounts')}
        />
        <StatCard 
          title="Raw Leads" 
          value={data.leads?.length || 0} 
          isUp={true}
          icon={BarChart3}
          color="gold"
          onClick={() => setActivePage('leads')}
        />
        <StatCard 
          title="Staff Presence" 
          value={`${totalStaff}/${totalStaff}`} 
          isUp={true}
          icon={Briefcase}
          color="slate"
          onClick={() => setActivePage('staff')}
        />
      </div>

      {/* Complete Information Cluster Panel - REPLACING Shortucts */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Superior Information Cluster</h3>
          <Badge variant="outline" className="bg-white text-[9px] font-black uppercase tracking-widest text-slate-400 border-slate-100">Live Institutional Analytics</Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6 relative z-10">
          {infoCluster.map((item: any, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className={cn(
                "group relative p-5 rounded-[2.5rem] border backdrop-blur-xl shadow-lg transition-all overflow-hidden",
                item.bgColor,
                item.border
              )}
            >
              {/* Metallic Grain / Crystallized Reflection */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/10 pointer-events-none" />
              <div className="absolute -inset-x-full top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg] transition-all duration-1000 group-hover:translate-x-[400%] pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("w-8 h-8 rounded-xl bg-white/80 shadow-sm flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-6 shadow-inner", item.color)}>
                    <item.icon size={16} />
                  </div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-800 transition-colors">{item.label}</h4>
                </div>
                <p className="text-xl font-display font-black text-slate-800 tracking-tight group-hover:translate-x-1 transition-transform">{item.value}</p>
                <p className="text-[8px] font-black text-slate-400 mt-1 italic opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Primary Analytics Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Academic Yield Breakdown */}
        <Card className="lg:col-span-2 rounded-[3rem] border-none shadow-xl shadow-slate-200/50 bg-gradient-to-br from-white to-slate-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-superior-teal/5 rounded-bl-[10rem]" />
          <CardHeader className="p-10 pb-0">
             <CardTitle className="text-2xl font-serif font-black italic text-slate-800 tracking-tight flex items-center gap-3">
               <TrendingUp className="text-superior-teal" /> Academic Yield Analysis
             </CardTitle>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Average Revenue Per Student Module</p>
          </CardHeader>
          <CardContent className="p-10 space-y-10">
            <div className="h-[300px] w-full mt-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'FSc Stream', value: academicPerformance.fscAvg, count: academicPerformance.fscCount },
                  { name: 'BS / Semester', value: academicPerformance.bsAvg, count: academicPerformance.bsCount },
                  { name: 'DIT / Tech', value: academicPerformance.ditAvg, count: academicPerformance.ditCount },
                  { name: 'UK L3', value: academicPerformance.ukL3Avg, count: academicPerformance.ukL3Count },
                  { name: 'Boys', value: academicPerformance.boysAvg },
                  { name: 'Girls', value: academicPerformance.girlsAvg },
                ]}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 900 }} />
                  <Tooltip 
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl border border-white/10 shadow-xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">{payload[0].payload.name}</p>
                            <p className="text-lg font-black italic">Rs. {payload[0].value.toLocaleString()}</p>
                            {payload[0].payload.count !== undefined && (
                              <p className="text-[9px] font-bold text-superior-gold mt-1 uppercase">{payload[0].payload.count} Registered Modules</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    <Cell fill="#6366f1" />
                    <Cell fill="#c9a84c" />
                    <Cell fill="#10b981" />
                    <Cell fill="#3b82f6" />
                    <Cell fill="#085a4e" />
                    <Cell fill="#fb7185" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-5 border-t border-slate-100">
               <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Global Yield</p>
                 <p className="text-xl font-black text-slate-800 tracking-tight">Rs. {Math.round(academicPerformance.totalAvg).toLocaleString()}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">FSc Average</p>
                 <p className="text-xl font-black text-indigo-600 tracking-tight">Rs. {Math.round(academicPerformance.fscAvg).toLocaleString()}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Enrollment Intensity</p>
                 <p className="text-xl font-black text-slate-800 tracking-tight">{totalEnrollmentCount} Heads</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Audit Precision</p>
                 <p className="text-xl font-black text-emerald-600 tracking-tight">100.0%</p>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Gender Diversification */}
        <Card className="rounded-[3rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
          <CardHeader className="p-10 pb-0">
             <CardTitle className="text-2xl font-serif font-black italic text-slate-800 tracking-tight">Institutional Strength</CardTitle>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Gender Diversification Index</p>
          </CardHeader>
          <CardContent className="p-10">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    <Cell fill="#085a4e" />
                    <Cell fill="#fb7185" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-superior-teal" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Male Ratio</span>
                </div>
                <span className="text-lg font-black italic">{totalEnrollmentCount > 0 ? ((mergedBoysCount / totalEnrollmentCount) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Female Ratio</span>
                </div>
                <span className="text-lg font-black italic">{totalEnrollmentCount > 0 ? ((mergedGirlsCount / totalEnrollmentCount) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Financial Metrics */}
        <Card className="rounded-[3.2rem] bg-slate-900 border-none text-white overflow-hidden shadow-2xl relative lg:row-span-2 flex flex-col">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-[60px]" />
          <CardHeader className="p-10 pb-0">
             <CardTitle className="text-2xl font-serif font-black italic text-superior-gold tracking-tight">Financial Treasury</CardTitle>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mt-1">Global Audit Integrity</p>
          </CardHeader>
          <CardContent className="p-10 space-y-8 flex-1 flex flex-col justify-center">
             <div className="space-y-2">
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Collection</p>
               <h3 className="text-4xl font-black italic">Rs. {activeStudentsRevenue.toLocaleString()}</h3>
             </div>
             
             <div className="space-y-4 pt-2">
               <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/50">FSc Core Level</span>
                 <span className="text-sm font-black text-indigo-400">Rs. {academicPerformance.fscCollection.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/50">DIT Program</span>
                 <span className="text-sm font-black text-emerald-400">Rs. {academicPerformance.ditCollection.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/50">UK Level 3</span>
                 <span className="text-sm font-black text-rose-400">Rs. {academicPerformance.ukL3Collection.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/50">BS Program</span>
                 <span className="text-sm font-black text-cyan-400">Rs. {academicPerformance.bsCollection.toLocaleString()}</span>
               </div>
             </div>

             <div className="p-5 bg-white/5 rounded-3xl border border-white/10 space-y-4">
               <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Active Defaulters</span>
                    <span className="text-xs font-black text-rose-400">{defaultersCount} Records</span>
                 </div>
                 <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: '15%' }} />
                 </div>
               </div>
             </div>

             <div className="pt-4 mt-auto">
               <Button 
                  onClick={() => setActivePage('accounts')}
                  className="w-full h-14 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-[10px] transition-all"
                >
                  Access Detailed Ledger
               </Button>
             </div>
          </CardContent>
        </Card>

        {/* FSc Control Center (New Cluster) */}
        <Card className="rounded-[3rem] border-none shadow-xl shadow-cyan-500/5 overflow-hidden bg-white/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-serif font-black italic text-cyan-900 tracking-tight underline decoration-cyan-200 underline-offset-8">FSc Control Center</CardTitle>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-3">Core Program Analytics • (2 Parts)</p>
            </div>
            <Badge className="bg-cyan-50 text-cyan-600 border-cyan-100 font-black uppercase tracking-[0.2em] text-[8px] px-3 py-1">Annual System Active</Badge>
          </CardHeader>
          <CardContent className="p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* FSc Yield Analysis */}
              <div className="space-y-6">
                 <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">FSc Average Yield (PSA)</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter italic">Rs. {Math.round(academicPerformance.fscAvg).toLocaleString()}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-cyan-50/50 p-4 rounded-3xl border border-cyan-100 flex flex-col items-center">
                       <span className="text-[8px] font-black text-cyan-900 uppercase tracking-widest mb-1">FSc Boys PSA</span>
                       <span className="text-sm font-black text-cyan-700 italic">Rs. {Math.round(academicPerformance.fscBoysAvg).toLocaleString()}</span>
                    </div>
                    <div className="bg-rose-50/50 p-4 rounded-3xl border border-rose-100 flex flex-col items-center">
                       <span className="text-[8px] font-black text-rose-900 uppercase tracking-widest mb-1">FSc Girls PSA</span>
                       <span className="text-sm font-black text-rose-700 italic">Rs. {Math.round(academicPerformance.fscGirlsAvg).toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              {/* Part Breakdown */}
              <div className="col-span-2 grid grid-cols-2 gap-4">
                 {[
                   { label: "Part I", value: academicPerformance.fscParts.part1, color: "cyan" },
                   { label: "Part II", value: academicPerformance.fscParts.part2, color: "blue" },
                 ].map((sem, idx) => (
                   <div key={idx} className={`bg-slate-50 border border-slate-100 p-8 rounded-[2rem] flex flex-col justify-center items-center text-center relative overflow-hidden`}>
                      <div className={`absolute -right-2 -bottom-2 opacity-5 text-5xl font-black italic`}>{idx + 1}</div>
                      <span className={`text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2`}>{sem.label}</span>
                      <span className={`text-5xl font-black text-slate-800 tracking-tighter`}>{sem.value}</span>
                      <span className="text-[7px] font-bold text-slate-400 uppercase mt-2 italic tracking-[0.2em]">Registered Scholars</span>
                   </div>
                 ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 pt-6 border-t border-slate-100">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-600/10">
                     <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div className="space-y-0.5">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">FSc Academic Weight</p>
                     <p className="text-xs font-black text-cyan-600 uppercase tracking-tight">{academicPerformance.fscCount} Enrolled Modules</p>
                  </div>
               </div>
               <Separator orientation="vertical" className="h-8 bg-slate-200 hidden md:block" />
               <div className="flex items-center gap-3 ml-auto">
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Institutional Split</p>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-tight">{academicPerformance.fscBoysCount} Boys / {academicPerformance.fscGirlsCount} Girls</p>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* DIT Semester Analysis (New Cluster) */}
        <Card className="rounded-[3rem] border-none shadow-xl shadow-superior-teal/5 overflow-hidden bg-white/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-serif font-black italic text-superior-teal tracking-tight underline decoration-superior-gold/30 underline-offset-8">DIT Semester Control Center</CardTitle>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-3">Advanced Program Analytics • (4 Semesters)</p>
            </div>
            <Badge className="bg-superior-gold/10 text-superior-gold border-superior-gold/20 font-black uppercase tracking-[0.2em] text-[8px] px-3 py-1 ring-4 ring-superior-gold/5">Semester System Active</Badge>
          </CardHeader>
          <CardContent className="p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* DIT Yield Analysis */}
              <div className="space-y-6">
                 <div className="bg-slate-100/50 p-6 rounded-[2rem] border border-slate-200/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">DIT Average Yield (PSA)</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter italic">Rs. {Math.round(academicPerformance.ditAvg).toLocaleString()}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100 flex flex-col items-center">
                       <span className="text-[8px] font-black text-blue-900 uppercase tracking-widest mb-1">DIT Boys PSA</span>
                       <span className="text-sm font-black text-blue-700 italic">Rs. {Math.round(academicPerformance.ditBoysAvg).toLocaleString()}</span>
                    </div>
                    <div className="bg-rose-50/50 p-4 rounded-3xl border border-rose-100 flex flex-col items-center">
                       <span className="text-[8px] font-black text-rose-900 uppercase tracking-widest mb-1">DIT Girls PSA</span>
                       <span className="text-sm font-black text-rose-700 italic">Rs. {Math.round(academicPerformance.ditGirlsAvg).toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              {/* Semester Breakdown */}
              <div className="col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                 {[
                   { label: "Semester 1", value: academicPerformance.ditSemesters.sem1, color: "indigo" },
                   { label: "Semester 2", value: academicPerformance.ditSemesters.sem2, color: "emerald" },
                   { label: "Semester 3", value: academicPerformance.ditSemesters.sem3, color: "amber" },
                   { label: "Semester 4", value: academicPerformance.ditSemesters.sem4, color: "cyan" },
                 ].map((sem, idx) => (
                   <div key={idx} className={`bg-${sem.color}-50/50 border border-${sem.color}-100 p-6 rounded-[2rem] flex flex-col justify-center items-center text-center relative overflow-hidden group`}>
                      <div className={`absolute -right-2 -bottom-2 opacity-5 text-4xl font-black italic`}>{idx + 1}</div>
                      <span className={`text-[9px] font-black text-${sem.color}-900 uppercase tracking-widest mb-2`}>{sem.label}</span>
                      <span className={`text-4xl font-black text-${sem.color}-600 tracking-tighter`}>{sem.value}</span>
                      <span className="text-[7px] font-bold text-slate-400 uppercase mt-2">Active Scholars</span>
                   </div>
                 ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 pt-6 border-t border-slate-100">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-superior-teal flex items-center justify-center shadow-lg shadow-superior-teal/10">
                     <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div className="space-y-0.5">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">DIT Market Strength</p>
                     <p className="text-xs font-black text-superior-teal uppercase tracking-tight">{academicPerformance.ditCount} Total Portfolios</p>
                  </div>
               </div>
               <Separator orientation="vertical" className="h-8 bg-slate-200 hidden md:block" />
               <div className="flex items-center gap-3 ml-auto">
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">DIT Population Breakdown</p>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-tight">{academicPerformance.ditBoysCount} Boys / {academicPerformance.ditGirlsCount} Girls</p>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Campus Demographics */}
        <Card className="rounded-[3rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
          <CardHeader className="p-8 pb-0">
             <CardTitle className="text-2xl font-serif font-black italic text-slate-800 tracking-tight">Campus Demographics</CardTitle>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Student vs Staff Ratio</p>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Students', value: totalEnrollmentCount },
                      { name: 'Teachers', value: teachersCount },
                      { name: 'Support', value: totalStaff - teachersCount }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    <Cell fill="#085a4e" />
                    <Cell fill="#6366f1" />
                    <Cell fill="#cbd5e1" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-superior-teal" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Students</span>
                </div>
                <span className="text-lg font-black italic">{totalEnrollmentCount}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Teachers</span>
                </div>
                <span className="text-lg font-black italic">{teachersCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* UK L3 Semester Analysis (New Cluster) */}
        <Card className="rounded-[3rem] border-none shadow-xl shadow-indigo-500/5 overflow-hidden bg-white/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-serif font-black italic text-indigo-900 tracking-tight underline decoration-indigo-200 underline-offset-8 text-indigo-800">UK Level 3 Control Center</CardTitle>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-3">Advanced Program Analytics • (3 Semesters)</p>
            </div>
            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 font-black uppercase tracking-[0.2em] text-[8px] px-3 py-1">Semester System Active</Badge>
          </CardHeader>
          <CardContent className="p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* UK L3 Yield Analysis */}
              <div className="space-y-6">
                 <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">UK L3 Average Yield (PSA)</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter italic">Rs. {Math.round(academicPerformance.ukL3Avg).toLocaleString()}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100 flex flex-col items-center">
                       <span className="text-[8px] font-black text-indigo-900 uppercase tracking-widest mb-1">UK-L3 Boys PSA</span>
                       <span className="text-sm font-black text-indigo-700 italic">Rs. {Math.round(academicPerformance.ukL3BoysAvg).toLocaleString()}</span>
                    </div>
                    <div className="bg-rose-50/50 p-4 rounded-3xl border border-rose-100 flex flex-col items-center">
                       <span className="text-[8px] font-black text-rose-900 uppercase tracking-widest mb-1">UK-L3 Girls PSA</span>
                       <span className="text-sm font-black text-rose-700 italic">Rs. {Math.round(academicPerformance.ukL3GirlsAvg).toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              {/* Semester Breakdown */}
              <div className="col-span-2 grid grid-cols-2 lg:grid-cols-3 gap-4">
                 {[
                   { label: "Semester 1", value: academicPerformance.ukL3Semesters.sem1, color: "indigo" },
                   { label: "Semester 2", value: academicPerformance.ukL3Semesters.sem2, color: "emerald" },
                   { label: "Semester 3", value: academicPerformance.ukL3Semesters.sem3, color: "amber" },
                 ].map((sem, idx) => (
                   <div key={idx} className={`bg-${sem.color}-50/50 border border-${sem.color}-100 p-8 rounded-[2rem] flex flex-col justify-center items-center text-center relative overflow-hidden`}>
                      <div className={`absolute -right-2 -bottom-2 opacity-5 text-5xl font-black italic`}>{idx + 1}</div>
                      <span className={`text-[9px] font-black text-${sem.color}-900 uppercase tracking-widest mb-2`}>{sem.label}</span>
                      <span className={`text-5xl font-black text-${sem.color}-600 tracking-tighter`}>{sem.value}</span>
                      <span className="text-[7px] font-bold text-slate-400 uppercase mt-2 italic tracking-[0.2em]">Registered Scholars</span>
                   </div>
                 ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 pt-6 border-t border-slate-100">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/10">
                     <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div className="space-y-0.5">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">UK L3 Academic Weight</p>
                     <p className="text-xs font-black text-indigo-600 uppercase tracking-tight">{academicPerformance.ukL3Count} Enrolled Modules</p>
                  </div>
               </div>
               <Separator orientation="vertical" className="h-8 bg-slate-200 hidden md:block" />
               <div className="flex items-center gap-3 ml-auto">
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Institutional Split</p>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-tight">{academicPerformance.ukL3BoysCount} Boys / {academicPerformance.ukL3GirlsCount} Girls</p>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Operations & Pipeline */}
        <Card className="rounded-[3rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
          <CardHeader className="p-8 pb-0">
             <CardTitle className="text-2xl font-serif font-black italic text-slate-800 tracking-tight">Operations Budget</CardTitle>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Income vs Expenses Scope</p>
          </CardHeader>
          <CardContent className="p-8 space-y-6 flex-1 flex flex-col justify-center mt-2">
            <div className="flex flex-col items-center justify-center pt-8 pb-4">
               <div className="w-40 h-40 rounded-full border-[12px] border-emerald-50 flex items-center justify-center relative shadow-inner">
                  <div className="absolute inset-[-12px] rounded-full border-[12px] border-emerald-500 border-t-transparent border-l-transparent -rotate-12" />
                  <div className="text-center">
                    <span className="text-3xl font-black text-slate-800">{activeStudentsRevenue > 0 ? Math.round((totalExpenses / activeStudentsRevenue) * 100) : 0}%</span>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Exp / Inc</p>
                  </div>
               </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50">
                 <span className="text-xs font-black uppercase tracking-widest text-emerald-700">Total Income</span>
                 <span className="text-lg font-black text-emerald-600">Rs. {Math.round(activeStudentsRevenue / 1000)}k</span>
              </div>
              <div className="flex justify-between items-center bg-orange-50 p-5 rounded-2xl border border-orange-100/50">
                 <span className="text-xs font-black uppercase tracking-widest text-orange-700">Total Expenses</span>
                 <span className="text-lg font-black text-orange-600">Rs. {Math.round(totalExpenses / 1000)}k</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BS Control Center */}
        <Card className="rounded-[3rem] border-none shadow-xl shadow-fuchsia-500/5 overflow-hidden bg-white/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-serif font-black italic text-fuchsia-900 tracking-tight underline decoration-fuchsia-200 underline-offset-8 text-fuchsia-800">BS Control Center</CardTitle>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-3">University Program Analytics • (8 Semesters)</p>
            </div>
            <Badge className="bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100 font-black uppercase tracking-[0.2em] text-[8px] px-3 py-1">Semester System Active</Badge>
          </CardHeader>
          <CardContent className="p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* BS Yield Analysis */}
              <div className="space-y-6">
                 <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">BS Average Yield (PSA)</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter italic">Rs. {Math.round(academicPerformance.bsAvg).toLocaleString()}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-fuchsia-50/50 p-4 rounded-3xl border border-fuchsia-100 flex flex-col items-center">
                       <span className="text-[8px] font-black text-fuchsia-900 uppercase tracking-widest mb-1">BS Boys PSA</span>
                       <span className="text-sm font-black text-fuchsia-700 italic">Rs. {Math.round(academicPerformance.bsBoysAvg).toLocaleString()}</span>
                    </div>
                    <div className="bg-rose-50/50 p-4 rounded-3xl border border-rose-100 flex flex-col items-center">
                       <span className="text-[8px] font-black text-rose-900 uppercase tracking-widest mb-1">BS Girls PSA</span>
                       <span className="text-sm font-black text-rose-700 italic">Rs. {Math.round(academicPerformance.bsGirlsAvg).toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              {/* Semester Breakdown */}
              <div className="col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
                 {[
                   { label: "Sem 1", value: academicPerformance.bsSemesters.sem1, color: "fuchsia" },
                   { label: "Sem 2", value: academicPerformance.bsSemesters.sem2, color: "purple" },
                   { label: "Sem 3", value: academicPerformance.bsSemesters.sem3, color: "indigo" },
                   { label: "Sem 4", value: academicPerformance.bsSemesters.sem4, color: "blue" },
                   { label: "Sem 5", value: academicPerformance.bsSemesters.sem5, color: "cyan" },
                   { label: "Sem 6", value: academicPerformance.bsSemesters.sem6, color: "teal" },
                   { label: "Sem 7", value: academicPerformance.bsSemesters.sem7, color: "emerald" },
                   { label: "Sem 8", value: academicPerformance.bsSemesters.sem8, color: "green" },
                 ].map((sem, idx) => (
                   <div key={idx} className={`bg-slate-50 border border-slate-100 p-4 rounded-[1.5rem] flex flex-col justify-center items-center text-center relative overflow-hidden`}>
                      <span className={`text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1`}>{sem.label}</span>
                      <span className={`text-2xl font-black text-slate-800 tracking-tighter`}>{sem.value}</span>
                   </div>
                 ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 pt-6 border-t border-slate-100">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-fuchsia-600 flex items-center justify-center shadow-lg shadow-fuchsia-600/10">
                     <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div className="space-y-0.5">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">BS Academic Weight</p>
                     <p className="text-xs font-black text-fuchsia-600 uppercase tracking-tight">{academicPerformance.bsCount} Enrolled Modules</p>
                  </div>
               </div>
               <Separator orientation="vertical" className="h-8 bg-slate-200 hidden md:block" />
               <div className="flex items-center gap-3 ml-auto">
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Institutional Split</p>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-tight">{academicPerformance.bsBoysCount} Boys / {academicPerformance.bsGirlsCount} Girls</p>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, subValue, trend, isUp, icon: Icon, color, onClick }: any) {
  const colorMap: any = {
    teal: "bg-superior-teal text-white",
    gold: "bg-superior-gold text-superior-teal",
    slate: "bg-slate-800 text-white"
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
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner shadow-black/20", colorMap[color])}>
          <Icon size={28} />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-tight shadow-sm border border-white/50 backdrop-blur-sm", isUp ? "bg-emerald-50/80 text-emerald-600" : "bg-rose-50/80 text-rose-600")}>
            {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</p>
        <h3 className="text-3xl font-display font-black text-slate-800 tracking-tight group-hover:translate-x-1 transition-transform">{value}</h3>
        {subValue && <p className="text-sm text-slate-500 mt-2 font-medium italic opacity-80">{subValue}</p>}
      </div>
    </motion.div>
  );
}

function ActivityRow({ icon: Icon, color, title, desc, time }: any) {
  const colorMap: any = {
    teal: "bg-superior-bg-teal text-superior-teal",
    gold: "bg-superior-bg-gold text-superior-gold",
    red: "bg-rose-50 text-rose-500",
    slate: "bg-slate-50 text-slate-500"
  };

  return (
    <div className="flex items-start gap-4 p-6 hover:bg-slate-50/50 transition-colors">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", colorMap[color])}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-bold text-slate-800 truncate">{title}</p>
          <span className="text-[10px] font-medium text-slate-400 shrink-0">{time}</span>
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
    slate: "hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:shadow-lg hover:shadow-slate-200/50"
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-3xl transition-all duration-300 group active:scale-95 relative overflow-hidden",
        colorMap[color]
      )}
    >
      <div className="absolute inset-0 border-2 border-transparent group-active:border-current/20 transition-colors pointer-events-none rounded-3xl" />
      <div className="mb-3 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
        <Icon size={24} />
      </div>
      <span className="text-[11px] font-black uppercase tracking-[0.2em]">{label}</span>
    </motion.button>
  );
}
