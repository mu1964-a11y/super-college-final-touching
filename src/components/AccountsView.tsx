
import * as React from 'react';
import { useState } from 'react';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Plus,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
  CreditCard,
  History,
  Receipt,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from '@/components/ui/dialog';
import FeeReceipt from './FeeReceipt';
import AdmissionSlip from './AdmissionSlip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { 
  Student, 
  Income, 
  Expense, 
  FeeTransaction, 
  Installment,
  Admission
} from '../types';

export default function AccountsView({ data, initialTab }: { data: any, initialTab?: string | null }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'summary');
  const [incomeSearch, setIncomeSearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [feeSearch, setFeeSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [incomeTypeFilter, setIncomeTypeFilter] = useState('all');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [incomeFilters, setIncomeFilters] = useState({ startDate: '', endDate: '', minAmount: '', maxAmount: '' });
  const [expenseFilters, setExpenseFilters] = useState({ startDate: '', endDate: '', minAmount: '', maxAmount: '' });

  const selectedStudent = data.students.find((s: Student) => s.id === selectedStudentId);

  // Sync with initialTab if it changes from sidebar
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Filter out incomes from deleted students
  const activeIncomes = React.useMemo(() => {
    const activeStudentIds = new Set(data.students.map((s: any) => s.id));
    const activeAdmissionIdsForStudents = new Set(data.students.map((s: any) => s.admissionId).filter(Boolean));
    const activeStudentNames = new Set(data.students.map((s: any) => s.fullName?.toLowerCase().trim()).filter(Boolean));

    const validAdmissions = data.admissions.filter((a: any) => {
      if (activeAdmissionIdsForStudents.has(a.id)) return true;
      if (a.studentId && !activeStudentIds.has(a.studentId)) return false;
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

  const totalIncome = React.useMemo(() => {
    const fromIncomes = activeIncomes.reduce((acc: number, curr: Income) => acc + (curr.amount || 0), 0);
    const activeStudentIds = new Set(data.students.map((s: any) => s.id));
    const activeAdmissionIdsForStudents = new Set(data.students.map((s: any) => s.admissionId).filter(Boolean));

    // Add admission fees that aren't in incomes yet
    const fromPendingAdmissions = data.admissions.reduce((acc: number, curr: any) => {
      const isCurrentlyActive = activeAdmissionIdsForStudents.has(curr.id) || (curr.studentId && activeStudentIds.has(curr.studentId));
      const isPendingCandidate = !curr.studentId;

      if (!isCurrentlyActive && !isPendingCandidate) return acc;

      const studentIncomesTotal = activeIncomes
          .filter((inc: any) => inc.studentId === curr.studentId || (inc.studentName === curr.fullName))
          .reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);

      const excessInAdmission = Math.max(0, Number(curr.feeReceived) - studentIncomesTotal);
      return acc + excessInAdmission;
    }, 0);
    return fromIncomes + fromPendingAdmissions;
  }, [activeIncomes, data.students, data.admissions]);

  const totalExpenses = data.expenses.reduce((acc: number, curr: Expense) => acc + (curr.amount || 0), 0);
  const netBalance = totalIncome - totalExpenses;

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-3xl font-display font-black text-superior-teal tracking-tight">
              Accounts & Finance
            </h3>
            <span className="text-slate-300 text-2xl">/</span>
            <span className="urdu-text text-2xl text-superior-gold font-medium">اکاؤنٹس اور فنانس</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-4 rounded-3xl flex items-center gap-5 border border-slate-100 shadow-sm">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Net Balance</p>
              <p className={cn(
                "text-2xl font-display font-black tracking-tight",
                netBalance >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>Rs. {netBalance.toLocaleString()}</p>
            </div>
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
              netBalance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              <Wallet size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <TrendingUp size={28} />
              </div>
              <div className="flex flex-col items-end">
                <Badge className="bg-emerald-100 text-emerald-700 border-none font-black px-3 py-1 rounded-lg">Live</Badge>
                <span className="text-[10px] text-slate-400 font-bold mt-1">Real-time Data</span>
              </div>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Income</p>
            <h3 className="text-4xl font-display font-black tracking-tight text-slate-800">Rs. {(totalIncome || 0).toLocaleString()}</h3>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                <TrendingDown size={28} />
              </div>
              <div className="flex flex-col items-end">
                <Badge className="bg-rose-100 text-rose-700 border-none font-black px-3 py-1 rounded-lg">Live</Badge>
                <span className="text-[10px] text-slate-400 font-bold mt-1">Real-time Data</span>
              </div>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Expenses</p>
            <h3 className="text-4xl font-display font-black tracking-tight text-slate-800">Rs. {(totalExpenses || 0).toLocaleString()}</h3>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-superior-teal p-8 rounded-[2.5rem] text-white relative overflow-hidden group border-none shadow-xl shadow-superior-teal/20"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center">
                <Wallet size={28} className="text-superior-gold" />
              </div>
              <Badge className="bg-superior-gold text-superior-teal border-none font-black px-3 py-1 rounded-lg">Healthy</Badge>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Net Profit/Loss</p>
            <h3 className="text-4xl font-display font-black tracking-tight">Rs. {(netBalance || 0).toLocaleString()}</h3>
          </div>
        </motion.div>
      </div>

      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-8">
          <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 h-auto">
            <TabsTrigger value="summary" className="rounded-xl font-bold px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all">Summary</TabsTrigger>
            <TabsTrigger value="income" className="rounded-xl font-bold px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all">Income</TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-xl font-bold px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all">Expenses</TabsTrigger>
            <TabsTrigger value="fee-manager" className="rounded-xl font-bold px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all">Fee Manager</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl border-slate-200 font-bold text-slate-600 h-11 px-5">
              <Calendar size={16} className="mr-2 text-superior-gold" />
              This Month
            </Button>
            <Button 
              className="bg-superior-teal text-white hover:bg-superior-teal/90 rounded-xl font-bold h-11 px-5 shadow-lg shadow-superior-teal/10"
              onClick={() => setIsAddEntryOpen(true)}
            >
              <Plus size={18} className="mr-2" />
              Add Entry
            </Button>
          </div>
        </div>

        <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
          <AddEntryDialog data={data} onClose={() => setIsAddEntryOpen(false)} />
        </Dialog>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 size={18} className="text-superior-teal" />
                  Monthly Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center text-slate-400 italic bg-slate-50 rounded-xl m-4 mt-0">
                [Income vs Expense Bar Chart]
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon size={18} className="text-superior-teal" />
                  Expense Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center text-slate-400 italic bg-slate-50 rounded-xl m-4 mt-0">
                [Expense Category Pie Chart]
              </CardContent>
            </Card>
          </div>
          
          <Button className="w-full bg-superior-teal text-white hover:bg-superior-teal/90">
            <Download size={16} className="mr-2" /> Download Full Financial Report (JPG)
          </Button>
        </TabsContent>

        <TabsContent value="income" className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  placeholder="Search by student name or ID..." 
                  className="pl-12 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all"
                  value={incomeSearch}
                  onChange={(e) => setIncomeSearch(e.target.value)}
                />
              </div>
              <Select value={incomeTypeFilter} onValueChange={setIncomeTypeFilter}>
                <SelectTrigger className="w-[180px] h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold">
                  <SelectValue placeholder="Fee Type" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                  <SelectItem value="all">All Income</SelectItem>
                  <SelectItem value="Admission Fee">Admission Fees</SelectItem>
                  <SelectItem value="Monthly Installment">Installments</SelectItem>
                  <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Phase 3: Module-Wise Deep Filtering (Income) */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest w-12">From</Label>
                <Input type="date" className="h-10 w-[140px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30" 
                  value={incomeFilters.startDate} onChange={(e) => setIncomeFilters({...incomeFilters, startDate: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest w-10">To</Label>
                <Input type="date" className="h-10 w-[140px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30" 
                  value={incomeFilters.endDate} onChange={(e) => setIncomeFilters({...incomeFilters, endDate: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest w-24">Min Amount</Label>
                <Input type="number" placeholder="Rs. 0" className="h-10 w-[120px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30" 
                  value={incomeFilters.minAmount} onChange={(e) => setIncomeFilters({...incomeFilters, minAmount: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest w-24">Max Amount</Label>
                <Input type="number" placeholder="Rs. Any" className="h-10 w-[120px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30" 
                  value={incomeFilters.maxAmount} onChange={(e) => setIncomeFilters({...incomeFilters, maxAmount: e.target.value})} />
              </div>
              <Button onClick={() => setIncomeFilters({startDate:'', endDate:'', minAmount:'', maxAmount:''})} variant="ghost" className="h-10 px-4 text-slate-400 hover:text-red-500 rounded-xl">
                Clear Filters
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Date</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Student / Source</TableHead>
                  <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Type</TableHead>
                  <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Month/Year</TableHead>
                  <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Amount</TableHead>
                  <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeIncomes
                  .filter((inc: Income) => {
                    const matchesSearch = inc.studentName.toLowerCase().includes(incomeSearch.toLowerCase()) || 
                                          (inc.studentId && inc.studentId.toLowerCase().includes(incomeSearch.toLowerCase()));
                    const matchesType = incomeTypeFilter === 'all' || inc.feeType === incomeTypeFilter;
                    
                    // Deep filters mapping
                    let matchesDate = true;
                    if (incomeFilters.startDate) matchesDate = matchesDate && new Date(inc.date) >= new Date(incomeFilters.startDate);
                    if (incomeFilters.endDate) matchesDate = matchesDate && new Date(inc.date) <= new Date(incomeFilters.endDate);
                    
                    let matchesAmount = true;
                    if (incomeFilters.minAmount) matchesAmount = matchesAmount && (inc.amount || 0) >= Number(incomeFilters.minAmount);
                    if (incomeFilters.maxAmount) matchesAmount = matchesAmount && (inc.amount || 0) <= Number(incomeFilters.maxAmount);

                    return matchesSearch && matchesType && matchesDate && matchesAmount;
                  })
                  .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((inc: Income) => (
                    <TableRow key={inc.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                      <TableCell className="py-5 px-6 text-sm font-medium text-slate-600">{inc.date}</TableCell>
                      <TableCell className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-superior-teal/5 flex items-center justify-center text-xs font-black text-superior-teal group-hover:bg-superior-teal group-hover:text-white transition-all">
                            {inc.studentName.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{inc.studentName}</span>
                            {inc.studentId && <span className="text-[10px] text-slate-400 font-bold tracking-widest">{inc.studentId}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6">
                        <Badge variant="outline" className="rounded-lg border-slate-100 bg-slate-50/50 text-slate-600 font-bold">{inc.feeType}</Badge>
                      </TableCell>
                      <TableCell className="py-5 px-6 text-sm font-bold text-slate-500">{inc.month || '-'} {inc.year || ''}</TableCell>
                      <TableCell className="py-5 px-6 text-right font-display font-black text-emerald-600 text-lg">Rs. {(inc.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="py-5 px-6">
                        <Badge className="bg-emerald-100 text-emerald-700 border-none font-black px-3 py-1 rounded-lg">{inc.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="expenses" className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  placeholder="Search by description or category..." 
                  className="pl-12 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all"
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                />
              </div>
              <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                <SelectTrigger className="w-[180px] h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Staff Salaries">Staff Salaries</SelectItem>
                  <SelectItem value="Electricity Bills">Utility Bills</SelectItem>
                  <SelectItem value="Maintenance & Repairs">Maintenance</SelectItem>
                  <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Phase 3: Module-Wise Deep Filtering (Expense) */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest w-12">From</Label>
                <Input type="date" className="h-10 w-[140px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30" 
                  value={expenseFilters.startDate} onChange={(e) => setExpenseFilters({...expenseFilters, startDate: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest w-10">To</Label>
                <Input type="date" className="h-10 w-[140px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30" 
                  value={expenseFilters.endDate} onChange={(e) => setExpenseFilters({...expenseFilters, endDate: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest w-24">Min Amount</Label>
                <Input type="number" placeholder="Rs. 0" className="h-10 w-[120px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30" 
                  value={expenseFilters.minAmount} onChange={(e) => setExpenseFilters({...expenseFilters, minAmount: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest w-24">Max Amount</Label>
                <Input type="number" placeholder="Rs. Any" className="h-10 w-[120px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30" 
                  value={expenseFilters.maxAmount} onChange={(e) => setExpenseFilters({...expenseFilters, maxAmount: e.target.value})} />
              </div>
              <Button onClick={() => setExpenseFilters({startDate:'', endDate:'', minAmount:'', maxAmount:''})} variant="ghost" className="h-10 px-4 text-slate-400 hover:text-red-500 rounded-xl">
                Clear Filters
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Date</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Category</TableHead>
                  <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Description</TableHead>
                  <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Method</TableHead>
                  <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.expenses
                  .filter((exp: Expense) => {
                    const matchesSearch = exp.description.toLowerCase().includes(expenseSearch.toLowerCase()) || 
                                          exp.category.toLowerCase().includes(expenseSearch.toLowerCase());
                    const matchesCat = expenseCategoryFilter === 'all' || exp.category === expenseCategoryFilter;
                    
                    let matchesDate = true;
                    if (expenseFilters.startDate) matchesDate = matchesDate && new Date(exp.date) >= new Date(expenseFilters.startDate);
                    if (expenseFilters.endDate) matchesDate = matchesDate && new Date(exp.date) <= new Date(expenseFilters.endDate);
                    
                    let matchesAmount = true;
                    if (expenseFilters.minAmount) matchesAmount = matchesAmount && (exp.amount || 0) >= Number(expenseFilters.minAmount);
                    if (expenseFilters.maxAmount) matchesAmount = matchesAmount && (exp.amount || 0) <= Number(expenseFilters.maxAmount);

                    return matchesSearch && matchesCat && matchesDate && matchesAmount;
                  })
                  .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((exp: Expense) => (
                    <TableRow key={exp.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                      <TableCell className="py-5 px-6 text-sm font-medium text-slate-600">{exp.date}</TableCell>
                      <TableCell className="py-5 px-6">
                        <Badge className="bg-rose-50 text-rose-600 border-none font-black px-3 py-1 rounded-lg">{exp.category}</Badge>
                      </TableCell>
                      <TableCell className="py-5 px-6 text-sm font-bold text-slate-800">{exp.description}</TableCell>
                      <TableCell className="py-5 px-6">
                        <Badge variant="outline" className="rounded-lg border-slate-100 bg-slate-50/50 text-slate-500 font-bold">{exp.paymentMethod || 'Cash'}</Badge>
                      </TableCell>
                      <TableCell className="py-5 px-6 text-right font-display font-black text-rose-600 text-lg">Rs. {(exp.amount || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="fee-manager" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Search & List */}
            <Card className="lg:col-span-1 rounded-[2rem] border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-3 font-black text-superior-teal">
                  <div className="w-10 h-10 rounded-xl bg-superior-teal text-white flex items-center justify-center shadow-lg shadow-superior-teal/10">
                    <Search size={20} />
                  </div>
                  Find Student
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5 flex-1 overflow-hidden flex flex-col">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input 
                    placeholder="Search by name or ID..." 
                    className="pl-12 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all"
                    value={feeSearch}
                    onChange={(e) => setFeeSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {data.students
                    .filter((s: Student) => 
                      s.fullName.toLowerCase().includes(feeSearch.toLowerCase()) || 
                      s.id.toLowerCase().includes(feeSearch.toLowerCase())
                    )
                    .map((student: Student) => (
                      <motion.div 
                        key={student.id}
                        whileHover={{ x: 4 }}
                        onClick={() => setSelectedStudentId(student.id)}
                        className={cn(
                          "p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4",
                          selectedStudentId === student.id 
                            ? "bg-superior-teal text-white border-superior-teal shadow-lg shadow-superior-teal/20" 
                            : "bg-white border-slate-100 hover:border-superior-teal/30 hover:bg-slate-50/50"
                        )}
                      >
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-black text-superior-teal shrink-0 overflow-hidden shadow-inner">
                          {student.photo ? (
                            <img src={student.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            student.fullName.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black truncate text-sm tracking-tight">{student.fullName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className={cn("text-[10px] font-mono font-bold", selectedStudentId === student.id ? "text-white/60" : "text-slate-400")}>
                              {student.id}
                            </p>
                            <span className={cn("w-1 h-1 rounded-full", selectedStudentId === student.id ? "bg-white/30" : "bg-slate-200")}></span>
                            <p className={cn("text-[10px] font-bold uppercase tracking-wider", selectedStudentId === student.id ? "text-white/60" : "text-slate-400")}>
                              {student.category}
                            </p>
                          </div>
                        </div>
                        {selectedStudentId === student.id && (
                          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                            <CheckCircle2 size={14} />
                          </div>
                        )}
                      </motion.div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Fee Ledger & Management */}
            <Card className="lg:col-span-2 rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
              {selectedStudent ? (
                <FeeLedgerManager student={selectedStudent} data={data} />
              ) : (
                <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-400 p-12 text-center bg-slate-50/30">
                  <div className="w-24 h-24 rounded-[2rem] bg-white shadow-sm flex items-center justify-center mb-6 border border-slate-100">
                    <Wallet size={48} className="text-slate-200" />
                  </div>
                  <h3 className="text-2xl font-display font-black text-slate-800 mb-3 tracking-tight">No Student Selected</h3>
                  <p className="max-w-xs text-slate-500 font-medium leading-relaxed">Select a student from the list to manage their fee package, installments, and ledger history.</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FeeLedgerManager({ student, data }: { student: Student, data: any }) {
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [newPackage, setNewPackage] = useState(String(student.feeLedger?.totalPackage || 0));
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  
  const group = (student.group || student.category || '').toLowerCase();
  const isSemester = group.includes('uk') || group.includes('level 3') || group.includes('dit') || group.includes('bs');
  const termLabel = isSemester ? 'Semester' : 'Monthly';

  const [txData, setTxData] = useState({
    amount: '',
    paymentMethod: 'Cash' as any,
    description: isSemester ? 'Semester Installment' : 'Monthly Installment'
  });

  const receiptRef = React.useRef<HTMLDivElement>(null);

  const handleUpdatePackage = () => {
    data.updateFeePackage(student.id, Number(newPackage));
    setIsEditingPackage(false);
    toast.success("Fee package updated successfully!");
  };

  const handleAddTransaction = () => {
    if (!txData.amount || Number(txData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    data.recordFeeTransaction(student.id, {
      date: new Date().toISOString().split('T')[0],
      amount: Number(txData.amount),
      paymentMethod: txData.paymentMethod,
      receiptId: `REC-${Date.now().toString().slice(-6)}`,
      description: txData.description
    });

    setIsAddingTransaction(false);
    setTxData({ amount: '', paymentMethod: 'Cash', description: isSemester ? 'Semester Installment' : 'Monthly Installment' });
    toast.success("Payment recorded successfully!");
  };

  const downloadReceipt = async (tx: FeeTransaction) => {
    // Logic to generate a small receipt PDF
    const pdf = new jsPDF({
      unit: 'mm',
      format: [80, 150] // Thermal printer style
    });

    pdf.setFontSize(14);
    pdf.setTextColor(8, 90, 78); // Superior Teal
    pdf.text("SUPERIOR COLLEGES", 40, 15, { align: 'center' });
    
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text("Jahanian Campus", 40, 20, { align: 'center' });
    
    pdf.setDrawColor(200);
    pdf.line(5, 25, 75, 25);
    
    pdf.setFontSize(10);
    pdf.setTextColor(0);
    pdf.text("FEE RECEIPT", 40, 32, { align: 'center' });
    
    pdf.setFontSize(8);
    pdf.text(`Receipt ID: ${tx.receiptId}`, 5, 40);
    pdf.text(`Date: ${tx.date}`, 5, 45);
    
    pdf.line(5, 50, 75, 50);
    
    pdf.text(`Student: ${student.fullName}`, 5, 58);
    pdf.text(`ID: ${student.id}`, 5, 63);
    pdf.text(`Father: ${student.fatherName}`, 5, 68);
    
    pdf.line(5, 73, 75, 73);
    
    pdf.setFontSize(9);
    pdf.text("Description", 5, 80);
    pdf.text("Amount", 75, 80, { align: 'right' });
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(tx.description, 5, 88);
    pdf.text(`Rs. ${(tx.amount || 0).toLocaleString()}`, 75, 88, { align: 'right' });
    
    pdf.line(5, 95, 75, 95);
    
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Remaining Balance: Rs. ${(student.feeLedger?.remainingBalance || 0).toLocaleString()}`, 5, 102);
    
    pdf.setFontSize(7);
    pdf.text("Thank you for your payment.", 40, 130, { align: 'center' });
    pdf.text("This is a computer generated receipt.", 40, 135, { align: 'center' });

    pdf.save(`Receipt-${tx.receiptId}.pdf`);
    toast.success("Receipt downloaded!");
  };

  const getBalanceStatus = () => {
    const balance = student.feeLedger.remainingBalance;
    const hasOverdue = student.feeLedger.installments?.some(inst => 
      inst.status === 'Unpaid' && new Date(inst.dueDate) < new Date() && new Date(inst.dueDate).toDateString() !== new Date().toDateString()
    );

    if (hasOverdue && balance > 0) return <Badge className="bg-red-600 text-white animate-pulse">Overdue</Badge>;
    if (balance <= 0) return <Badge className="bg-emerald-100 text-emerald-700 font-bold">Fully Paid</Badge>;
    if (balance < student.feeLedger.totalPackage) return <Badge className="bg-orange-100 text-orange-700 font-bold">Partial Paid</Badge>;
    return <Badge className="bg-slate-100 text-slate-700 font-bold">Not Paid</Badge>;
  };

  const [dialogType, setDialogType] = useState<'receipt' | 'slip' | null>(null);

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="border-b border-slate-100 p-8 bg-slate-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-superior-teal font-black text-2xl overflow-hidden shadow-inner">
              {student.photo ? (
                <img src={student.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                student.fullName.charAt(0)
              )}
            </div>
            <div>
              <CardTitle className="text-2xl font-display font-black text-superior-teal tracking-tight">{student.fullName}</CardTitle>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-slate-500 font-bold font-mono bg-slate-100 px-2 py-0.5 rounded-lg">{student.id}</p>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <p className="text-sm text-superior-gold font-black uppercase tracking-wider">{student.category}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-4">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Payment Status</p>
              {getBalanceStatus()}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl border-superior-teal/20 text-superior-teal hover:bg-superior-teal hover:text-white font-bold h-10 px-4 transition-all shadow-sm"
                onClick={() => setDialogType('slip')}
              >
                <Download size={14} className="mr-2" /> Slip
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl border-superior-gold/20 text-superior-gold hover:bg-superior-gold hover:text-superior-teal font-bold h-10 px-4 transition-all shadow-sm"
                onClick={() => setDialogType('receipt')}
              >
                <Receipt size={14} className="mr-2" /> Receipt
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
        {/* Package Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm relative group transition-all hover:border-superior-teal/20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-slate-400 uppercase font-black tracking-widest">Total Package</p>
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                <CreditCard size={16} />
              </div>
            </div>
            {isEditingPackage ? (
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  value={newPackage} 
                  onChange={e => setNewPackage(e.target.value)}
                  className="h-10 text-xl font-black rounded-xl border-superior-teal/30 focus:ring-superior-teal/10"
                />
                <Button size="sm" className="h-10 bg-superior-teal rounded-xl px-4" onClick={handleUpdatePackage}>Save</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-2xl font-display font-black text-slate-800 tracking-tight">Rs. {(student.feeLedger?.totalPackage || 0).toLocaleString()}</p>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 bg-slate-50 text-superior-teal transition-all" onClick={() => setIsEditingPackage(true)}>
                  <Edit size={14} />
                </Button>
              </div>
            )}
          </div>
          
          <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 shadow-sm relative group transition-all hover:border-emerald-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-emerald-600 uppercase font-black tracking-widest">Total Received</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="text-2xl font-display font-black text-emerald-700 tracking-tight">Rs. {(student.feeLedger?.totalReceived || 0).toLocaleString()}</p>
          </div>

          <div className="p-6 bg-rose-50/50 rounded-3xl border border-rose-100 shadow-sm relative group transition-all hover:border-rose-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-rose-600 uppercase font-black tracking-widest">Remaining</p>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <p className="text-2xl font-display font-black text-rose-700 tracking-tight">Rs. {(student.feeLedger?.remainingBalance || 0).toLocaleString()}</p>
          </div>
        </div>

        <Tabs defaultValue="ledger" className="w-full">
          <TabsList className="w-full justify-start border-b border-slate-100 rounded-none bg-transparent h-auto p-0 mb-8 gap-8">
            <TabsTrigger value="ledger" className="rounded-none border-b-2 border-transparent data-[state=active]:border-superior-teal data-[state=active]:bg-transparent px-2 py-4 font-black text-slate-400 data-[state=active]:text-superior-teal transition-all uppercase text-[11px] tracking-widest">
              <History size={16} className="mr-2" /> Transaction History
            </TabsTrigger>
            <TabsTrigger value="installments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-superior-teal data-[state=active]:bg-transparent px-2 py-4 font-black text-slate-400 data-[state=active]:text-superior-teal transition-all uppercase text-[11px] tracking-widest">
              <Calendar size={16} className="mr-2" /> Installment Builder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ledger" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-superior-gold rounded-full"></div>
                <h4 className="font-display font-black text-slate-800 text-lg tracking-tight">Fee Ledger</h4>
              </div>
              <Button size="sm" className="bg-superior-teal text-white hover:bg-superior-teal/90 rounded-xl font-bold px-5 h-10 shadow-lg shadow-superior-teal/10" onClick={() => setIsAddingTransaction(true)}>
                <Plus size={18} className="mr-2" /> Record Payment
              </Button>
            </div>

            {isAddingTransaction && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-6 shadow-inner"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Amount Paid (Rs.)</Label>
                    <Input 
                      type="number" 
                      value={txData.amount || ""} 
                      onChange={e => setTxData({...txData, amount: e.target.value})}
                      placeholder="0.00"
                      className="h-12 rounded-2xl bg-white border-slate-200 focus:border-superior-teal/30 font-bold text-lg"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Payment Method</Label>
                    <Select value={txData.paymentMethod || ""} onValueChange={v => setTxData({...txData, paymentMethod: v})}>
                      <SelectTrigger className="h-12 rounded-2xl bg-white border-slate-200 focus:border-superior-teal/30 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Description / Remarks</Label>
                    <Input 
                      value={txData.description} 
                      onChange={e => setTxData({...txData, description: e.target.value})}
                      placeholder="e.g. 2nd Installment"
                      className="h-12 rounded-2xl bg-white border-slate-200 focus:border-superior-teal/30 font-medium"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" className="rounded-xl font-bold text-slate-500 hover:bg-slate-200/50" onClick={() => setIsAddingTransaction(false)}>Cancel</Button>
                  <Button className="bg-superior-teal text-white hover:bg-superior-teal/90 rounded-xl font-bold px-6 shadow-lg shadow-superior-teal/10" onClick={handleAddTransaction}>Confirm & Save Payment</Button>
                </div>
              </motion.div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Date</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Receipt ID</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Description</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Method</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Amount</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.feeLedger.transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">No transactions recorded yet.</TableCell>
                    </TableRow>
                  ) : (
                    student.feeLedger.transactions.map((tx: FeeTransaction) => (
                      <TableRow key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                        <TableCell className="py-5 px-6 text-sm font-medium text-slate-600">{tx.date}</TableCell>
                        <TableCell className="py-5 px-6">
                          <code className="text-[10px] font-mono font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-500">{tx.receiptId}</code>
                        </TableCell>
                        <TableCell className="py-5 px-6 text-sm font-bold text-slate-800">{tx.description}</TableCell>
                        <TableCell className="py-5 px-6">
                          <Badge variant="outline" className="rounded-lg border-slate-100 bg-slate-50/50 text-slate-500 font-bold px-2 py-0.5">{tx.paymentMethod}</Badge>
                        </TableCell>
                        <TableCell className="py-5 px-6 text-right font-display font-black text-emerald-600 text-lg">Rs. {(tx.amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="py-5 px-6 text-right">
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-superior-teal hover:bg-superior-teal hover:text-white transition-all shadow-sm" onClick={() => downloadReceipt(tx)}>
                            <Download size={18} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

          <TabsContent value="installments" className="space-y-4">
            <InstallmentBuilder student={student} data={data} />
          </TabsContent>
        </Tabs>

        {/* Slips & Receipts Dialogs */}
        <Dialog open={dialogType === 'receipt'} onOpenChange={(open) => !open && setDialogType(null)}>
          <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] overflow-y-auto p-0 border-none bg-white rounded-3xl">
            <FeeReceipt student={student} settings={data.settings} />
          </DialogContent>
        </Dialog>

        <Dialog open={dialogType === 'slip'} onOpenChange={(open) => !open && setDialogType(null)}>
          <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] overflow-y-auto p-0 border-none bg-white rounded-3xl">
             <AdmissionSlip 
               admission={data.admissions.find((a: any) => a.id === student.admissionId) || student} 
               settings={data.settings} 
             />
          </DialogContent>
        </Dialog>
      </CardContent>
    </div>
  );
}

function InstallmentBuilder({ student, data }: { student: Student, data: any }) {
  const [installments, setInstallments] = useState<Installment[]>(student.feeLedger.installments || []);

  const addRow = () => {
    const newInstallment: Installment = {
      id: `inst-${Date.now()}`,
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      status: 'Unpaid'
    };
    setInstallments([...installments, newInstallment]);
  };

  const removeRow = (id: string) => {
    setInstallments(installments.filter(i => i.id !== id));
  };

  const updateRow = (id: string, updates: Partial<Installment>) => {
    setInstallments(installments.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleSave = () => {
    const total = installments.reduce((acc, curr) => acc + Number(curr.amount), 0);
    if (total > student.feeLedger.totalPackage) {
      toast.warning(`Warning: Total installments (Rs. ${(total || 0).toLocaleString()}) exceed total package (Rs. ${(student.feeLedger.totalPackage || 0).toLocaleString()})`);
    }
    data.updateInstallments(student.id, installments);
    toast.success("Installment plan updated!");
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const group = (student.group || student.category || '').toLowerCase();
  const isSemester = group.includes('uk') || group.includes('level 3') || group.includes('dit') || group.includes('bs');
  const termLabel = isSemester ? 'Semester' : 'Monthly';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-800">{termLabel} Plan</h4>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus size={16} className="mr-2" /> Add Row
          </Button>
          <Button size="sm" className="bg-superior-teal text-white" onClick={handleSave}>
            Save Plan
          </Button>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount (Rs.)</TableHead>
              <TableHead>Update Status</TableHead>
              <TableHead>Current Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {installments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-slate-400 italic">No installments defined. Click 'Add Row' to start.</TableCell>
              </TableRow>
            ) : (
              installments.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell>
                    <Input 
                      type="date" 
                      value={inst.dueDate || ""} 
                      onChange={e => updateRow(inst.id, { dueDate: e.target.value })}
                      className="h-9 w-40"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      value={inst.amount ?? 0} 
                      onChange={e => updateRow(inst.id, { amount: Number(e.target.value) })}
                      className="h-9 w-40 font-bold"
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={inst.status || ""} onValueChange={v => updateRow(inst.id, { status: v as any })}>
                      <SelectTrigger className="h-9 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Unpaid">Unpaid</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {inst.status === 'Paid' ? (
                      <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>
                    ) : isOverdue(inst.dueDate) ? (
                      <Badge className="bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                        <AlertCircle size={12} /> Overdue
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => removeRow(inst.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
        <p className="text-sm font-medium text-slate-600">Total Planned:</p>
        <p className={cn(
          "text-lg font-black",
          installments.reduce((acc, curr) => acc + Number(curr.amount), 0) > student.feeLedger.totalPackage ? "text-red-600" : "text-superior-teal"
        )}>
          Rs. {(installments.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function AddEntryDialog({ data, onClose }: { data: any, onClose: () => void }) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    description: '',
    paymentMethod: 'Cash' as any,
    studentName: '', // For misc income
  });

  const categories = type === 'expense' 
    ? ['Staff Salaries', 'Electricity Bills', 'Utility Bills', 'Maintenance & Repairs', 'Rent', 'Stationery', 'Miscellaneous']
    : ['Miscellaneous', 'Asset Sale', 'Donation', 'Other Revenue'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0 || !formData.category) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    if (type === 'expense') {
      data.addExpense({
        date: formData.date,
        amount: Number(formData.amount),
        category: formData.category,
        description: formData.description,
        addedBy: data.currentUser?.email || 'Admin',
        paymentMethod: formData.paymentMethod
      });
    } else {
      data.addIncome({
        date: formData.date,
        amount: Number(formData.amount),
        feeType: formData.category,
        description: formData.description,
        studentName: formData.studentName || 'Manual Entry',
        status: 'Full',
        recordedBy: data.currentUser?.email || 'Admin',
        paymentMethod: formData.paymentMethod
      });
    }
    onClose();
  };

  return (
    <DialogContent className="max-w-md rounded-[2rem]">
      <DialogHeader>
        <DialogTitle className="text-2xl font-display font-black text-superior-teal tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-superior-gold flex items-center justify-center text-superior-teal shadow-lg shadow-superior-gold/20">
            <Plus size={20} />
          </div>
          Add New Entry
        </DialogTitle>
        <DialogDescription>Record a manual transaction into the finance ledger.</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6 py-4">
        <Tabs value={type} onValueChange={(v: any) => setType(v)} className="w-full">
          <TabsList className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <TabsTrigger value="expense" className="rounded-xl font-bold data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all">Expense</TabsTrigger>
            <TabsTrigger value="income" className="rounded-xl font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all">Income</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Date</Label>
            <Input 
              type="date" 
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="h-11 rounded-xl bg-slate-50 border-slate-200"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Amount (Rs.)</Label>
            <Input 
              type="number" 
              placeholder="0.00"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Category</Label>
          <Select value={formData.category || ""} onValueChange={v => setFormData({...formData, category: v})}>
            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl border-slate-100">
              {categories.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {type === 'income' && (
          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Payer Name / Source</Label>
            <Input 
              placeholder="e.g. Scrap Sale or Payer Name"
              value={formData.studentName}
              onChange={e => setFormData({...formData, studentName: e.target.value})}
              className="h-11 rounded-xl bg-slate-50 border-slate-200"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Description</Label>
          <Input 
            placeholder="Additional details..."
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="h-11 rounded-xl bg-slate-50 border-slate-200"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Payment Method</Label>
          <Select value={formData.paymentMethod || ""} onValueChange={v => setFormData({...formData, paymentMethod: v})}>
            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl border-slate-100">
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 flex gap-3">
          <Button variant="ghost" className="flex-1 rounded-xl font-bold h-12" type="button" onClick={onClose}>Cancel</Button>
          <Button 
            className={cn(
              "flex-1 text-white rounded-xl font-bold h-12 shadow-lg",
              type === 'expense' ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
            )}
            type="submit"
          >
            Record {type === 'expense' ? 'Expense' : 'Income'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
