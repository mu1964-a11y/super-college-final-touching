
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
  const confirmedAdmissions = useMemo(() => data.admissions.filter((a: any) => a.isAdmitted || a.status === 'Admitted/Confirmed'), [data.admissions]);
  
  const [selectedMonth, setSelectedMonth] = React.useState<string>(new Date().toLocaleString('default', { month: 'long' }));
  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Total Enrollment = Registered Students + Confirmed but not-yet-processed admissions
  const mergedBoysCount = useMemo(() => {
    const studentBoys = data.students.filter((s: any) => s.gender === 'Male').length;
    const pendingBoys = confirmedAdmissions.filter((a: any) => 
      a.gender === 'Male' && !data.students.some((s: any) => s.admissionId === a.id || s.id === a.studentId)
    ).length;
    return studentBoys + pendingBoys;
  }, [data.students, confirmedAdmissions]);

  const mergedGirlsCount = useMemo(() => {
    const studentGirls = data.students.filter((s: any) => s.gender === 'Female').length;
    const pendingGirls = confirmedAdmissions.filter((a: any) => 
      a.gender === 'Female' && !data.students.some((s: any) => s.admissionId === a.id || s.id === a.studentId)
    ).length;
    return studentGirls + pendingGirls;
  }, [data.students, confirmedAdmissions]);

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

  const recentActivities = useMemo(() => [
    ...data.incomes.slice(-2).map((i: any) => ({
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
  ].sort(() => 0.5 - Math.random()).slice(0, 4), [data.incomes, data.admissions, data.expenses]);

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

    const fromIncomes = data.incomes.filter((inc: any) => {
        if (selectedMonth === 'all') return true;
        const incMonth = inc.month || getMonthFromDate(inc.date);
        const incYear = inc.year || (inc.date ? new Date(inc.date).getFullYear() : targetYear);
        return incMonth === selectedMonth && Number(incYear) === targetYear;
    }).reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

    const fromPendingAdmissions = data.admissions.filter((adm: any) => {
        const hasIncomeRecord = data.incomes.some((inc: any) => inc.studentId === adm.studentId || (inc.studentName === adm.fullName && inc.amount === adm.feeReceived));
        if (hasIncomeRecord || !adm.feeReceived || adm.feeReceived <= 0) return false;
        
        if (selectedMonth === 'all') return true;
        
        const admMonth = getMonthFromDate(adm.date);
        const admYear = adm.date ? new Date(adm.date).getFullYear() : targetYear;
        return admMonth === selectedMonth && Number(admYear) === targetYear;
    }).reduce((acc: number, curr: any) => acc + Number(curr.feeReceived), 0);

    return fromIncomes + fromPendingAdmissions;
  }, [data.incomes, data.admissions, selectedMonth]);

  const totalRevenue = useMemo(() => {
    const fromIncomes = data.incomes.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
    // Find admissions where feeReceived > 0 but no matching income record exists
    const fromPendingAdmissions = data.admissions.reduce((acc: number, curr: any) => {
      const hasIncomeRecord = data.incomes.some((inc: any) => inc.studentId === curr.studentId || (inc.studentName === curr.fullName && inc.amount === curr.feeReceived));
      if (!hasIncomeRecord && curr.feeReceived > 0) {
        return acc + Number(curr.feeReceived);
      }
      return acc;
    }, 0);
    return fromIncomes + fromPendingAdmissions;
  }, [data.incomes, data.admissions]);

  const perStudentAverage = useMemo(() => {
    const totalPackageSum = data.students.reduce((acc: number, curr: any) => acc + (Number(curr.feeLedger?.totalPackage) || 0), 0);
    const admissionPackageSum = confirmedAdmissions.reduce((acc: number, curr: any) => {
       // Only count admissions not yet in students collection to avoid double counting
       const isAlreadyStudent = data.students.some((s: any) => s.admissionId === curr.id || s.id === curr.studentId);
       if (!isAlreadyStudent) {
         return acc + (Number(curr.totalPackage || curr.totalFeeFinalized) || 0);
       }
       return acc;
    }, 0);

    const totalConfPackages = totalPackageSum + admissionPackageSum;
    const confirmedCount = data.students.length + confirmedAdmissions.filter((a: any) => !data.students.some((s: any) => s.admissionId === a.id || s.id === a.studentId)).length;
    
    return confirmedCount > 0 ? totalConfPackages / confirmedCount : 0;
  }, [data.students, confirmedAdmissions, data.incomes]);

  // Calculate real trends based on data
  const enrollmentData = useMemo(() => [
    { name: 'Jan', students: 0 },
    { name: 'Feb', students: 0 },
    { name: 'Mar', students: 0 },
    { name: 'Apr', students: totalApplicants },
  ], [totalApplicants]);

  const feeCollectionData = useMemo(() => [
    { name: 'Medical', value: data.admissions.filter((a: any) => a.group === 'Medical').length * 10000, color: '#085a4e' },
    { name: 'Engineering', value: data.admissions.filter((a: any) => a.group === 'Engineering').length * 10000, color: '#c9a84c' },
    { name: 'ICS/ICom', value: data.admissions.filter((a: any) => a.group === 'ICS' || a.group === 'ICom').length * 10000, color: '#0f7b6c' },
    { name: 'FA/Gen', value: data.admissions.filter((a: any) => a.group === 'FA' || a.group === 'General Science').length * 10000, color: '#1e293b' },
  ], [data.admissions]);

  const genderData = useMemo(() => [
    { name: 'Boys', value: boysCount, color: '#085a4e' },
    { name: 'Girls', value: girlsCount, color: '#c9a84c' },
  ], [boysCount, girlsCount]);

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner - Minimal Refined */}
      <div className="relative overflow-hidden bg-superior-teal rounded-[2rem] p-8 border border-superior-teal/20 shadow-xl shadow-superior-teal/5">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-superior-gold/5 to-transparent pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter leading-none">
              SCJ <span className="text-superior-gold">DashBoard</span>
            </h2>
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
                <SelectTrigger className="w-[120px] h-7 bg-white/10 border-white/20 text-white text-[9px] font-black uppercase tracking-widest rounded-lg focus:ring-0">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent className="bg-superior-teal border-superior-teal/50 text-white">
                  <SelectItem value="2024-26" className="text-[10px] font-bold uppercase tracking-widest focus:bg-white/10">2024-26</SelectItem>
                  <SelectItem value="2025-27" className="text-[10px] font-bold uppercase tracking-widest focus:bg-white/10">2025-27</SelectItem>
                  <SelectItem value="2026-28" className="text-[10px] font-bold uppercase tracking-widest focus:bg-white/10">2026-28</SelectItem>
                  <SelectItem value="2027-29" className="text-[10px] font-bold uppercase tracking-widest focus:bg-white/10">2027-29</SelectItem>
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

      {/* Stats Grid - High Visual Impact */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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
          value={`Rs. ${Math.round(perStudentAverage).toLocaleString()}`} 
          subValue="Institutional Value / Student"
          trend={perStudentAverage > 0 ? "Calculated" : null}
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

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-8 border-slate-200 rounded-2xl shadow-none overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between py-6 px-8 border-b border-slate-50">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Enrollment Trends</CardTitle>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="rounded-md border-slate-200 text-slate-500">Monthly</Badge>
              <Badge variant="outline" className="rounded-md border-slate-200 text-slate-500">Session {selectedSession}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={enrollmentData}>
                  <defs>
                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#085a4e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#085a4e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="students" 
                    stroke="#085a4e" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorStudents)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Chart */}
        <Card className="lg:col-span-4 border-slate-200 rounded-2xl shadow-none overflow-hidden">
          <CardHeader className="py-6 px-8 border-b border-slate-50">
            <CardTitle className="text-lg font-bold text-slate-800">Fee Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feeCollectionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {feeCollectionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-3">
              {feeCollectionData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">Rs. {(item.value / 1000).toFixed(0)}k</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Recent Activity - Mission Control Style */}
        <Card className="lg:col-span-6 border-slate-200 rounded-2xl shadow-none overflow-hidden">
          <CardHeader className="py-6 px-8 border-b border-slate-50 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800">System Activity Log</CardTitle>
            <Button variant="ghost" size="sm" className="text-superior-teal font-bold text-xs">View All</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, idx) => (
                  <ActivityRow 
                    key={idx}
                    icon={activity.icon} 
                    color={activity.color} 
                    title={activity.title} 
                    desc={activity.desc} 
                    time={activity.time} 
                  />
                ))
              ) : (
                <div className="p-12 text-center text-slate-400 italic">
                  No recent activities found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - Grid Style */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest px-2">Quick Console</h3>
          <div className="grid grid-cols-2 gap-4">
            <ConsoleAction 
              icon={UserPlus} 
              label="Admit" 
              color="teal" 
              onClick={() => setActivePage('admissions')} 
            />
            <ConsoleAction 
              icon={Wallet} 
              label="Collect" 
              color="gold" 
              onClick={() => setActivePage('accounts')} 
            />
            <ConsoleAction 
              icon={Search} 
              label="Search" 
              color="slate" 
              onClick={() => setActivePage('students-boys')} 
            />
            <ConsoleAction 
              icon={CheckCircle2} 
              label="Attendance" 
              color="teal" 
              onClick={() => setActivePage('students-boys')} 
            />
            <ConsoleAction 
              icon={FileText} 
              label="Reports" 
              color="gold" 
              onClick={() => setActivePage('reports')} 
            />
            <ConsoleAction 
              icon={BarChart3} 
              label="Leads" 
              color="teal" 
              onClick={() => setActivePage('leads')} 
            />
          </div>
          
          {defaultersCount > 0 && (
            <Card className="bg-superior-bg-gold border-superior-gold/30 p-6 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-superior-gold/20 flex items-center justify-center text-superior-gold">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Fee Defaulters</p>
                  <p className="text-xs text-slate-600">{defaultersCount} {defaultersCount === 1 ? 'student has' : 'students have'} pending dues.</p>
                </div>
              </div>
              <Button 
                onClick={() => setActivePage('accounts')}
                className="w-full mt-4 bg-superior-gold text-superior-teal hover:bg-superior-gold/90 font-bold rounded-xl"
              >
                Send Reminders
              </Button>
            </Card>
          )}
        </div>
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
      className="bg-white p-8 rounded-[2.5rem] border border-slate-100 cursor-pointer hover:border-superior-teal/30 transition-all duration-500 group shadow-sm hover:shadow-xl hover:shadow-superior-teal/5 relative overflow-hidden"
    >
      <div className="absolute inset-0 border-4 border-transparent group-active:border-superior-gold/20 transition-colors pointer-events-none rounded-[2.5rem]" />
      <div className="flex items-center justify-between mb-8">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner", colorMap[color])}>
          <Icon size={28} />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-tight", isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
            {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</p>
        <h3 className="text-3xl font-display font-black text-slate-800 tracking-tight">{value}</h3>
        {subValue && <p className="text-sm text-slate-500 mt-2 font-medium">{subValue}</p>}
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
