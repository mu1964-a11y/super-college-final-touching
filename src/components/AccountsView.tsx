
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
  Edit,
  Building2,
  Printer,
  MessageSquare,
  Coins,
  ShieldCheck
} from 'lucide-react';
import BankChallanModal from './BankChallanModal';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '../lib/supabase';
import FeeReceipt from './FeeReceipt';
import AdmissionSlip from './AdmissionSlip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  COLLEGE_EXPENSE_HEADS_CONFIG, 
  ALL_EXPENSE_HEAD_NAMES, 
  EXPENSE_GROUPS 
} from '../constants/expenseCategories';
import { 
  Student, 
  Income, 
  Expense, 
  FeeTransaction, 
  Installment,
  Admission
} from '../types';

export function parseExpenseDetails(exp: Expense) {
  const description = exp.description || '';
  let expenseType: 'Daily' | 'Monthly' | 'Operational' | 'General' = exp.expenseType || 'General';
  let paidTo = exp.paidTo || (exp as any).paid_to || '';
  let voucherNo = exp.voucherNo || (exp as any).voucher_no || '';

  if (!exp.expenseType) {
    if (description.includes('[Bank Deposit]') || exp.category?.toLowerCase().includes('bank deposit') || (exp as any).expense_type === 'Bank Deposit') {
      expenseType = 'Operational';
    } else if (description.includes('[Daily]')) expenseType = 'Daily';
    else if (description.includes('[Monthly]')) expenseType = 'Monthly';
    else if (description.includes('[Operational]')) expenseType = 'Operational';
    else {
      const match = COLLEGE_EXPENSE_HEADS_CONFIG.find(
        c => c.name.toLowerCase() === (exp.category || '').toLowerCase()
      );
      if (match) expenseType = match.defaultType;
    }
  }

  if (!paidTo) {
    const match = description.match(/\[Paid to:\s*([^\]]+)\]/i);
    if (match) paidTo = match[1];
  }

  if (!voucherNo) {
    const match = description.match(/\[Voucher:\s*([^\]]+)\]/i);
    if (match) voucherNo = match[1];
  }

  const cleanDescription = description
    .replace(/\[(Daily|Monthly|Operational)\]/gi, '')
    .replace(/\[Paid to:[^\]]+\]/gi, '')
    .replace(/\[Voucher:[^\]]+\]/gi, '')
    .replace(/\[Bank Deposit\]/gi, '')
    .trim();

  return {
    expenseType,
    paidTo,
    voucherNo,
    cleanDescription: cleanDescription || description
  };
}

export default function AccountsView({ data, initialTab }: { data: any, initialTab?: string | null }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'summary');
  const [incomeSearch, setIncomeSearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [feeSearch, setFeeSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [incomeTypeFilter, setIncomeTypeFilter] = useState('all');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [expenseNatureFilter, setExpenseNatureFilter] = useState<'all' | 'Daily' | 'Monthly' | 'Operational'>('all');
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [incomeFilters, setIncomeFilters] = useState({ startDate: '', endDate: '', minAmount: '', maxAmount: '' });
  const [expenseFilters, setExpenseFilters] = useState({ startDate: '', endDate: '', minAmount: '', maxAmount: '' });
  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);
  const [isBankDepositOpen, setIsBankDepositOpen] = useState(false);
  const [challanStudents, setChallanStudents] = useState<any[] | null>(null);

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

  const isBankDeposit = (exp: Expense) => {
    const cat = (exp.category || '').toLowerCase();
    const type = ((exp as any).expense_type || (exp as any).expenseType || '').toLowerCase();
    return cat.includes('bank deposit') || type.includes('bank deposit');
  };

  const totalOperationalExpenses = React.useMemo(() => {
    return (data.expenses || [])
      .filter((exp: Expense) => !isBankDeposit(exp))
      .reduce((acc: number, curr: Expense) => acc + (curr.amount || 0), 0);
  }, [data.expenses]);

  const totalBankDeposits = React.useMemo(() => {
    return (data.expenses || [])
      .filter((exp: Expense) => isBankDeposit(exp))
      .reduce((acc: number, curr: Expense) => acc + (curr.amount || 0), 0);
  }, [data.expenses]);

  const totalExpenses = (data.expenses || []).reduce((acc: number, curr: Expense) => acc + (curr.amount || 0), 0);
  const netBalance = totalIncome - totalOperationalExpenses;

  // Filtered Expenses with multi-field search and nature filtering
  const filteredExpenses = React.useMemo(() => {
    return (data.expenses || [])
      .filter((exp: Expense) => {
        const details = parseExpenseDetails(exp);
        const search = expenseSearch.toLowerCase().trim();
        const matchesSearch = !search || 
          (exp.description || '').toLowerCase().includes(search) || 
          (exp.category || '').toLowerCase().includes(search) ||
          (details.paidTo && details.paidTo.toLowerCase().includes(search)) ||
          (details.voucherNo && details.voucherNo.toLowerCase().includes(search));

        const matchesCat = expenseCategoryFilter === 'all' || exp.category === expenseCategoryFilter;
        const matchesNature = expenseNatureFilter === 'all' || details.expenseType === expenseNatureFilter;

        let matchesDate = true;
        if (expenseFilters.startDate) matchesDate = matchesDate && new Date(exp.date) >= new Date(expenseFilters.startDate);
        if (expenseFilters.endDate) matchesDate = matchesDate && new Date(exp.date) <= new Date(expenseFilters.endDate);

        let matchesAmount = true;
        if (expenseFilters.minAmount) matchesAmount = matchesAmount && (exp.amount || 0) >= Number(expenseFilters.minAmount);
        if (expenseFilters.maxAmount) matchesAmount = matchesAmount && (exp.amount || 0) <= Number(expenseFilters.maxAmount);

        return matchesSearch && matchesCat && matchesNature && matchesDate && matchesAmount;
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.expenses, expenseSearch, expenseCategoryFilter, expenseNatureFilter, expenseFilters]);

  const filteredTotalAmount = React.useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [filteredExpenses]);

  const dailyTotalAmount = React.useMemo(() => {
    return filteredExpenses
      .filter(e => parseExpenseDetails(e).expenseType === 'Daily')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [filteredExpenses]);

  const monthlyTotalAmount = React.useMemo(() => {
    return filteredExpenses
      .filter(e => parseExpenseDetails(e).expenseType === 'Monthly')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [filteredExpenses]);

  const operationalTotalAmount = React.useMemo(() => {
    return filteredExpenses
      .filter(e => {
        const t = parseExpenseDetails(e).expenseType;
        return t === 'Operational' || t === 'General';
      })
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [filteredExpenses]);

  const allAvailableExpenseCategories = React.useMemo(() => {
    const fromDb = (data.expenses || []).map((e: Expense) => e.category).filter(Boolean);
    return Array.from(new Set([...ALL_EXPENSE_HEAD_NAMES, ...fromDb])).sort();
  }, [data.expenses]);

  // Monthly Comparison (Last 6 Months)
  const monthlyChartData = React.useMemo(() => {
    const monthsMap: Record<string, { month: string; income: number; expense: number; net: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      monthsMap[key] = { month: label, income: 0, expense: 0, net: 0 };
    }

    (activeIncomes || []).forEach((inc: any) => {
      if (inc.date) {
        const key = inc.date.slice(0, 7);
        if (monthsMap[key]) {
          monthsMap[key].income += Number(inc.amount) || 0;
        }
      }
    });

    (data.expenses || []).forEach((exp: any) => {
      if (exp.date) {
        const key = exp.date.slice(0, 7);
        if (monthsMap[key]) {
          monthsMap[key].expense += Number(exp.amount) || 0;
        }
      }
    });

    return Object.values(monthsMap).map(m => ({
      ...m,
      net: m.income - m.expense
    }));
  }, [activeIncomes, data.expenses]);

  // Category Breakdown Data (Top 5 + Others)
  const categoryChartData = React.useMemo(() => {
    const catMap: Record<string, number> = {};
    (data.expenses || []).forEach((exp: Expense) => {
      const c = exp.category || 'Miscellaneous';
      catMap[c] = (catMap[c] || 0) + (Number(exp.amount) || 0);
    });

    const sorted = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    if (sorted.length <= 5) return sorted;
    const top5 = sorted.slice(0, 5);
    const othersVal = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0);
    if (othersVal > 0) {
      top5.push({ name: 'Others', value: othersVal });
    }
    return top5;
  }, [data.expenses]);

  const PIE_COLORS = ['#085a4e', '#d97706', '#e11d48', '#2563eb', '#7c3aed', '#059669', '#64748b'];

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeletingExpense(true);
    try {
      if (data.deleteExpense) {
        await data.deleteExpense(expenseToDelete.id);
      } else {
        const { error } = await supabase.from('expenses').delete().eq('id', expenseToDelete.id);
        if (error) throw error;
        if (data.fetchData) await data.fetchData(true);
        toast.success("Expense deleted successfully");
      }
      setExpenseToDelete(null);
    } catch (e: any) {
      toast.error(`Failed to delete expense: ${e.message}`);
    } finally {
      setIsDeletingExpense(false);
    }
  };

  const handleExportExpensesPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header Banner
      doc.setFillColor(8, 90, 78);
      doc.rect(0, 0, 210, 32, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text("SUPERIOR GROUP OF COLLEGES", 105, 12, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text("Jahanian Campus - Accounts & Expenses Statement", 105, 19, { align: 'center' });

      const filterSummaryText = `Generated: ${new Date().toLocaleDateString('en-GB')} | Category: ${expenseCategoryFilter === 'all' ? 'All Heads' : expenseCategoryFilter} | Type: ${expenseNatureFilter === 'all' ? 'All Types' : expenseNatureFilter}`;
      doc.setFontSize(8);
      doc.text(filterSummaryText, 105, 26, { align: 'center' });

      // Table Data
      const headers = [["Date", "Head / Category", "Type", "Paid To / Voucher", "Description", "Amount (Rs.)"]];
      const rows = filteredExpenses.map((exp: Expense) => {
        const details = parseExpenseDetails(exp);
        const refInfo = [details.paidTo, details.voucherNo].filter(Boolean).join(' | ') || '-';
        return [
          exp.date || '-',
          exp.category || '-',
          details.expenseType || 'General',
          refInfo,
          details.cleanDescription || '-',
          (exp.amount || 0).toLocaleString()
        ];
      });

      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 38,
        theme: 'grid',
        headStyles: {
          fillColor: [8, 90, 78],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 40 },
          2: { cellWidth: 20 },
          3: { cellWidth: 32 },
          4: { cellWidth: 50 },
          5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
        },
        foot: [[
          { content: 'Total Filtered Expenses', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
          { content: `Rs. ${filteredTotalAmount.toLocaleString()}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9, textColor: [180, 20, 20] } }
        ]],
        footStyles: {
          fillColor: [245, 247, 250],
          textColor: [20, 20, 20]
        }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      if (finalY < 250) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Accountant / Admin Officer Signature", 20, finalY + 25);
        doc.line(20, finalY + 20, 75, finalY + 20);

        doc.text("Principal / Director Signature", 140, finalY + 25);
        doc.line(140, finalY + 20, 195, finalY + 20);
      }

      doc.save(`Expenses-Statement-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Expense statement downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to generate PDF: " + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section - Exactly matching SS1 Student Records layout */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
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
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="h-14 rounded-[2rem] border-slate-200 text-slate-600 hover:text-superior-teal hover:bg-slate-50 flex items-center gap-2 font-bold px-5 text-sm"
            >
              <Calendar size={16} className="text-superior-gold" />
              This Month
            </Button>
            <Button 
              className="h-14 rounded-[2rem] bg-superior-teal text-white hover:bg-superior-teal/90 flex items-center gap-2 font-bold px-6 text-sm shadow-md shadow-superior-teal/15 cursor-pointer"
              onClick={() => setIsAddEntryOpen(true)}
            >
              <Plus size={18} />
              Add Entry
            </Button>
          </div>

          <div className="bg-white px-8 py-4 rounded-[2rem] border border-slate-100 flex items-center gap-6 shadow-sm">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Net Balance</p>
              <p className={cn(
                "text-3xl font-display font-black leading-none",
                netBalance >= 0 ? "text-superior-teal" : "text-rose-600"
              )}>Rs. {netBalance.toLocaleString()}</p>
            </div>
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner",
              netBalance >= 0 ? "bg-superior-teal/5 text-superior-teal" : "bg-rose-50 text-rose-600"
            )}>
              <Wallet size={28} />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
        <AddEntryDialog data={data} onClose={() => setIsAddEntryOpen(false)} />
      </Dialog>

      <Dialog open={isBankDepositOpen} onOpenChange={setIsBankDepositOpen}>
        <BankDepositDialog data={data} onClose={() => setIsBankDepositOpen(false)} />
      </Dialog>

      {/* Delete Expense Confirmation Dialog */}
      <Dialog open={!!expenseToDelete} onOpenChange={(open) => !open && !isDeletingExpense && setExpenseToDelete(null)}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-white border border-slate-100 shadow-2xl">
          <DialogHeader className="space-y-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto sm:mx-0 shadow-inner">
              <Trash2 size={24} />
            </div>
            <DialogTitle className="text-xl font-display font-black text-slate-800">
              Delete Expense Record?
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium leading-relaxed">
              Are you sure you want to delete the expense of <span className="font-black text-rose-600">Rs. {(expenseToDelete?.amount || 0).toLocaleString()}</span> ({expenseToDelete?.category}) recorded on {expenseToDelete?.date}? This action is permanent and will remove the record.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <Button
              variant="outline"
              disabled={isDeletingExpense}
              onClick={() => setExpenseToDelete(null)}
              className="rounded-xl border-slate-200 font-bold h-11 px-5 flex-1 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              disabled={isDeletingExpense}
              onClick={confirmDeleteExpense}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 px-5 flex-1 shadow-md shadow-rose-200 cursor-pointer"
            >
              {isDeletingExpense ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Primary Navigation Tabs - Exactly matching SS1 Student Records Tabs design */}
      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl w-full flex items-center justify-start overflow-x-auto scrollbar-hide h-auto border border-slate-200/50 mb-6">
          <TabsTrigger 
            value="summary" 
            className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap"
          >
            <BarChart3 size={15} className="mr-2 inline-block" />
            Financial Summary
          </TabsTrigger>
          <TabsTrigger 
            value="income" 
            className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap"
          >
            <TrendingUp size={15} className="mr-2 inline-block" />
            Income Records
          </TabsTrigger>
          <TabsTrigger 
            value="expenses" 
            className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap"
          >
            <TrendingDown size={15} className="mr-2 inline-block" />
            Expenses Manager
          </TabsTrigger>
          <TabsTrigger 
            value="fee-manager" 
            className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap"
          >
            <Receipt size={15} className="mr-2 inline-block" />
            Fee Collections
          </TabsTrigger>
          <TabsTrigger 
            value="daily-closing" 
            className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap"
          >
            <Clock size={15} className="mr-2 inline-block text-emerald-600" />
            Daily Cash Closing (Roznamcha)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          {/* Financial Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Total Income</p>
                  <h4 className="text-2xl font-display font-black text-slate-800 leading-tight">
                    Rs. {(totalIncome || 0).toLocaleString()}
                  </h4>
                </div>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none font-bold text-xs px-2.5 py-1 rounded-lg">Live</Badge>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-sm">
                  <TrendingDown size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Total Expenses</p>
                  <h4 className="text-2xl font-display font-black text-slate-800 leading-tight">
                    Rs. {(totalExpenses || 0).toLocaleString()}
                  </h4>
                </div>
              </div>
              <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-none font-bold text-xs px-2.5 py-1 rounded-lg">Live</Badge>
            </div>

            <div className={cn(
              "p-5 rounded-3xl border shadow-sm flex items-center justify-between text-white transition-all",
              netBalance >= 0 ? "bg-superior-teal border-superior-teal/30 shadow-superior-teal/15" : "bg-rose-700 border-rose-800"
            )}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/15 text-superior-gold flex items-center justify-center shrink-0">
                  <Wallet size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-0.5">Net Profit / Loss</p>
                  <h4 className="text-2xl font-display font-black text-white leading-tight">
                    Rs. {(netBalance || 0).toLocaleString()}
                  </h4>
                </div>
              </div>
              <Badge className={cn(
                "border-none font-bold text-xs px-3 py-1 rounded-lg",
                netBalance >= 0 ? "bg-superior-gold text-superior-teal" : "bg-white/20 text-white"
              )}>
                {netBalance >= 0 ? "Healthy" : "Deficit"}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 size={18} className="text-superior-teal" />
                  Monthly Comparison (Income vs Expenses)
                </CardTitle>
                <p className="text-xs text-slate-400 font-medium">Trends across the last 6 months</p>
              </CardHeader>
              <CardContent className="h-[320px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="#94a3b8" tickFormatter={(v) => `Rs.${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                    <Tooltip 
                      formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, '']}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="income" name="Income" fill="#059669" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#e11d48" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon size={18} className="text-superior-teal" />
                  Top Expense Categories Breakdown
                </CardTitle>
                <p className="text-xs text-slate-400 font-medium">Distribution by college spending heads</p>
              </CardHeader>
              <CardContent className="h-[320px] p-4 flex flex-col justify-center">
                {categoryChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
                    No expense records available yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        innerRadius={50}
                        paddingAngle={3}
                      >
                        {categoryChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, 'Amount']}
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={handleExportExpensesPDF}
              className="flex-1 bg-superior-teal text-white hover:bg-superior-teal/90 rounded-2xl h-12 font-bold shadow-lg shadow-superior-teal/10"
            >
              <Download size={16} className="mr-2" /> Download Expense Statement (PDF)
            </Button>
          </div>
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
          {/* Quick Expense Metric Cards - Minimal & Compact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Filtered Total</p>
                <h4 className="text-xl font-display font-black text-rose-600">Rs. {filteredTotalAmount.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 font-bold">{filteredExpenses.length} Records</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <TrendingDown size={18} />
              </div>
            </div>

            <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-0.5">Daily / Petty Cash</p>
                <h4 className="text-xl font-display font-black text-slate-800">Rs. {dailyTotalAmount.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 font-bold">Fuel, Repairs, Tea</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <Clock size={18} />
              </div>
            </div>

            <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">Monthly / Fixed</p>
                <h4 className="text-xl font-display font-black text-slate-800">Rs. {monthlyTotalAmount.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 font-bold">Rent, Bills, Salaries</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                <Calendar size={18} />
              </div>
            </div>

            <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-500 mb-0.5">Operational & Board</p>
                <h4 className="text-xl font-display font-black text-slate-800">Rs. {operationalTotalAmount.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 font-bold">Challans, Projects, Misc</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
                <Receipt size={18} />
              </div>
            </div>
          </div>

          {/* Filters & Actions Panel */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  placeholder="Search by description, head, paid to, or voucher #..." 
                  className="pl-12 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-medium"
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                />
              </div>

              {/* Expense Category Head Filter */}
              <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                <SelectTrigger className="w-[260px] h-12 rounded-2xl bg-slate-50 border border-slate-200 hover:border-superior-teal/30 focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-sm">
                  <SelectValue placeholder="All Categories / Heads" />
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false} className="w-[var(--anchor-width)] min-w-[320px] sm:min-w-[420px] rounded-2xl border-slate-100 shadow-2xl max-h-[420px] p-2 bg-white">
                  <SelectItem value="all" className="font-bold py-2.5 px-3 rounded-xl cursor-pointer">
                    All Heads ({allAvailableExpenseCategories.length})
                  </SelectItem>
                  {allAvailableExpenseCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="py-2 px-3 rounded-xl text-sm font-medium cursor-pointer">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Expense Nature Filter */}
              <Select value={expenseNatureFilter} onValueChange={(v: any) => setExpenseNatureFilter(v)}>
                <SelectTrigger className="w-[200px] h-12 rounded-2xl bg-slate-50 border border-slate-200 hover:border-superior-teal/30 focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-sm">
                  <SelectValue placeholder="Expense Type" />
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false} className="rounded-2xl border-slate-100 shadow-2xl p-2 bg-white min-w-[220px]">
                  <SelectItem value="all" className="py-2.5 px-3 rounded-xl font-bold cursor-pointer">All Types</SelectItem>
                  <SelectItem value="Daily" className="py-2.5 px-3 rounded-xl cursor-pointer">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="font-medium">Daily</span>
                      <span className="font-nastaleeq text-xs font-normal text-slate-500">(روزمرہ)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Monthly" className="py-2.5 px-3 rounded-xl cursor-pointer">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="font-medium">Monthly</span>
                      <span className="font-nastaleeq text-xs font-normal text-slate-500">(ماہانہ)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Operational" className="py-2.5 px-3 rounded-xl cursor-pointer">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="font-medium">Operational</span>
                      <span className="font-nastaleeq text-xs font-normal text-slate-500">(چالان / پروجیکٹس)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleExportExpensesPDF}
                variant="outline"
                className="h-12 px-5 rounded-2xl border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
              >
                <Download size={16} className="mr-2 text-superior-teal" />
                Export PDF
              </Button>

              <Button 
                onClick={() => setIsBankDepositOpen(true)}
                variant="outline"
                className="h-12 px-5 rounded-2xl border-blue-200 text-blue-700 hover:bg-blue-50 font-bold"
              >
                <Building2 size={16} className="mr-2 text-blue-600" />
                Deposit to Bank
              </Button>

              <Button 
                onClick={() => setIsAddEntryOpen(true)}
                className="h-12 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-200"
              >
                <Plus size={18} className="mr-2" />
                Add Expense
              </Button>
            </div>
            
            {/* Deep Filtering by Date and Amount */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest w-12">From</Label>
                <Input type="date" className="h-10 w-[140px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 font-medium" 
                  value={expenseFilters.startDate} onChange={(e) => setExpenseFilters({...expenseFilters, startDate: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest w-10">To</Label>
                <Input type="date" className="h-10 w-[140px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 font-medium" 
                  value={expenseFilters.endDate} onChange={(e) => setExpenseFilters({...expenseFilters, endDate: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest w-24">Min Amount</Label>
                <Input type="number" placeholder="Rs. 0" className="h-10 w-[120px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 font-medium" 
                  value={expenseFilters.minAmount} onChange={(e) => setExpenseFilters({...expenseFilters, minAmount: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest w-24">Max Amount</Label>
                <Input type="number" placeholder="Rs. Any" className="h-10 w-[120px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 font-medium" 
                  value={expenseFilters.maxAmount} onChange={(e) => setExpenseFilters({...expenseFilters, maxAmount: e.target.value})} />
              </div>
              <Button 
                onClick={() => {
                  setExpenseFilters({startDate:'', endDate:'', minAmount:'', maxAmount:''});
                  setExpenseSearch('');
                  setExpenseCategoryFilter('all');
                  setExpenseNatureFilter('all');
                }} 
                variant="ghost" 
                className="h-10 px-4 text-slate-400 hover:text-red-500 rounded-xl"
              >
                Reset All
              </Button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Date</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Head / Category</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Type</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Paid To & Voucher</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Description</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Method</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Amount</TableHead>
                    <TableHead className="py-5 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Receipt size={36} className="text-slate-300" />
                          <p className="font-bold">No expenses found matching the criteria</p>
                          <Button 
                            onClick={() => setIsAddEntryOpen(true)}
                            size="sm"
                            className="bg-superior-teal text-white rounded-xl font-bold mt-2"
                          >
                            <Plus size={14} className="mr-1" /> Add New Expense
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((exp: Expense) => {
                      const details = parseExpenseDetails(exp);
                      return (
                        <TableRow key={exp.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors group">
                          <TableCell className="py-4 px-6 text-sm font-medium text-slate-600 whitespace-nowrap">
                            {exp.date}
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <Badge className="bg-rose-50 text-rose-700 border-rose-100 font-black px-3 py-1 rounded-lg">
                              {exp.category || 'General'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-6 whitespace-nowrap">
                            {details.expenseType === 'Daily' ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold px-2.5 py-0.5 rounded-lg text-xs">
                                Daily Petty Cash
                              </Badge>
                            ) : details.expenseType === 'Monthly' ? (
                              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold px-2.5 py-0.5 rounded-lg text-xs">
                                Monthly Fixed
                              </Badge>
                            ) : (
                              <Badge className="bg-sky-50 text-sky-700 border-sky-200 font-bold px-2.5 py-0.5 rounded-lg text-xs">
                                Operational
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-4 px-6 text-xs text-slate-600">
                            {details.paidTo || details.voucherNo ? (
                              <div className="flex flex-col gap-0.5">
                                {details.paidTo && (
                                  <span className="font-bold text-slate-800">To: {details.paidTo}</span>
                                )}
                                {details.voucherNo && (
                                  <span className="text-slate-400 font-mono">Voucher: {details.voucherNo}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 px-6 text-sm font-medium text-slate-700 max-w-[280px] truncate" title={details.cleanDescription}>
                            {details.cleanDescription || exp.description || '-'}
                          </TableCell>
                          <TableCell className="py-4 px-6 whitespace-nowrap">
                            <Badge variant="outline" className="rounded-lg border-slate-200 bg-slate-50 text-slate-600 font-bold">
                              {exp.paymentMethod || 'Cash'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-6 text-right font-display font-black text-rose-600 text-lg whitespace-nowrap">
                            Rs. {(exp.amount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="py-4 px-6 text-center">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setExpenseToDelete(exp)}
                              className="h-9 w-9 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
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

        {/* Daily Cash Closing (Roznamcha / Day-Book) Tab */}
        <TabsContent value="daily-closing" className="space-y-6">
          <DailyCashClosingTab 
            data={data} 
            activeIncomes={activeIncomes} 
            onOpenBankDeposit={() => setIsBankDepositOpen(true)} 
          />
        </TabsContent>
      </Tabs>

      {/* 3-Copy Bank Challan Modal */}
      {challanStudents && (
        <BankChallanModal
          isOpen={isChallanModalOpen}
          onClose={() => {
            setIsChallanModalOpen(false);
            setChallanStudents(null);
          }}
          students={challanStudents}
          settings={data.settings}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 3: Daily Cash Closing Dashboard & Roznamcha (Day-Book) Component
// ---------------------------------------------------------------------------
function DailyCashClosingTab({ 
  data, 
  activeIncomes,
  onOpenBankDeposit 
}: { 
  data: any; 
  activeIncomes: any[];
  onOpenBankDeposit?: () => void;
}) {
  const [closingDate, setClosingDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [cashNotes, setCashNotes] = useState({
    n5000: "",
    n1000: "",
    n500: "",
    n100: "",
    n50: "",
    n20: "",
    n10: "",
    coins: "",
  });
  const [closingRemarks, setClosingRemarks] = useState("");
  const [isSendingDailyBriefing, setIsSendingDailyBriefing] = useState(false);
  const [journalTab, setJournalTab] = useState<"inflow" | "outflow">("inflow");

  const isBankDeposit = (exp: any) => {
    const cat = (exp.category || '').toLowerCase();
    const type = (exp.expense_type || exp.expenseType || '').toLowerCase();
    return cat.includes('bank deposit') || type.includes('bank deposit');
  };

  // Continuous Opening Balance (Yesterday's Closing Cash in Safe)
  const openingSafeBalance = React.useMemo(() => {
    // Inflows strictly before closingDate in Cash
    const priorCashInflows = (activeIncomes || []).filter((inc: any) => {
      const d = String(inc.date || '').split('T')[0];
      if (!d || d >= closingDate) return false;
      const m = (inc.paymentMethod || inc.type || '').toLowerCase();
      return !m.includes('bank') && !m.includes('online') && !m.includes('cheque');
    }).reduce((sum: number, inc: any) => sum + (Number(inc.amount) || 0), 0);

    // Prior safe outflows strictly before closingDate (both operational cash expenses & bank contra deposits)
    const priorCashOutflows = (data.expenses || []).filter((exp: any) => {
      const d = String(exp.date || '').split('T')[0];
      if (!d || d >= closingDate) return false;
      return true;
    }).reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0);

    return priorCashInflows - priorCashOutflows;
  }, [activeIncomes, data.expenses, closingDate]);

  // Filter incomes for the selected date
  const todayIncomes = React.useMemo(() => {
    return (activeIncomes || []).filter((inc: any) => {
      const d = String(inc.date || "").split("T")[0];
      return d === closingDate;
    });
  }, [activeIncomes, closingDate]);

  // Filter expenses for the selected date
  const todayExpenses = React.useMemo(() => {
    return (data.expenses || []).filter((exp: any) => {
      const d = String(exp.date || "").split("T")[0];
      return d === closingDate;
    });
  }, [data.expenses, closingDate]);

  // Breakdown of Incomes: Cash vs Online/Bank
  const dailyInflowCash = React.useMemo(() => {
    return todayIncomes
      .filter((inc: any) => {
        const m = (inc.paymentMethod || inc.type || "").toLowerCase();
        return !m.includes("bank") && !m.includes("online") && !m.includes("cheque");
      })
      .reduce((sum: number, inc: any) => sum + (Number(inc.amount) || 0), 0);
  }, [todayIncomes]);

  const dailyInflowBank = React.useMemo(() => {
    return todayIncomes
      .filter((inc: any) => {
        const m = (inc.paymentMethod || inc.type || "").toLowerCase();
        return m.includes("bank") || m.includes("online") || m.includes("cheque");
      })
      .reduce((sum: number, inc: any) => sum + (Number(inc.amount) || 0), 0);
  }, [todayIncomes]);

  const totalInflowAll = dailyInflowCash + dailyInflowBank;

  // Breakdown of Expenses: Operational Cash Outflow vs Bank Contra Deposits
  const dailyBankDeposits = React.useMemo(() => {
    return todayExpenses
      .filter((exp: any) => isBankDeposit(exp))
      .reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0);
  }, [todayExpenses]);

  const dailyOutflowOperational = React.useMemo(() => {
    return todayExpenses
      .filter((exp: any) => !isBankDeposit(exp))
      .reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0);
  }, [todayExpenses]);

  const totalOutflowToday = dailyOutflowOperational + dailyBankDeposits;

  // Expected Net Cash in Safe at Closing
  const expectedClosingCashInSafe = openingSafeBalance + dailyInflowCash - totalOutflowToday;

  // Physical Currency Calculation
  const physicalCashTotal = React.useMemo(() => {
    return (
      (Number(cashNotes.n5000) || 0) * 5000 +
      (Number(cashNotes.n1000) || 0) * 1000 +
      (Number(cashNotes.n500) || 0) * 500 +
      (Number(cashNotes.n100) || 0) * 100 +
      (Number(cashNotes.n50) || 0) * 50 +
      (Number(cashNotes.n20) || 0) * 20 +
      (Number(cashNotes.n10) || 0) * 10 +
      (Number(cashNotes.coins) || 0)
    );
  }, [cashNotes]);

  const isCountEntered = physicalCashTotal > 0 || Object.values(cashNotes).some((v) => Number(v) > 0);
  const closingDiscrepancy = isCountEntered ? physicalCashTotal - expectedClosingCashInSafe : 0;

  // Quick Date Setters
  const setQuickDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setClosingDate(d.toISOString().split("T")[0]);
  };

  // 1-Click WhatsApp Daily Briefing Dispatcher
  const handleSendDailyWhatsAppBriefing = async () => {
    const rawPhone = data.settings?.principalPhone || data.settings?.adminPhone || data.settings?.phone || "03014455891";
    const cleanPhone = rawPhone.replace(/\D/g, "");

    const varianceText = !isCountEntered 
      ? "Physical Safe Count Pending ⏳" 
      : closingDiscrepancy === 0 
        ? "BALANCED (100% Reconciled) ✅" 
        : closingDiscrepancy > 0 
          ? `CASH SURPLUS (+Rs. ${closingDiscrepancy.toLocaleString()})` 
          : `CASH SHORTAGE (-Rs. ${Math.abs(closingDiscrepancy).toLocaleString()}) ⚠️`;

    const briefingMsg = 
`🎓 *SUPERIOR GROUP OF COLLEGES JAHANIAN*
📊 *Daily Financial Closing Briefing (Roznamcha)*
📅 *Date:* ${closingDate}
━━━━━━━━━━━━━━━━━━━━━━━━━
🏦 *Opening Safe Balance (Carry Fwd):* Rs. ${openingSafeBalance.toLocaleString()}
💰 *Today's Cash Inflow:* Rs. ${dailyInflowCash.toLocaleString()}
💳 *Online / Bank Transfers:* Rs. ${dailyInflowBank.toLocaleString()}
📉 *Daily Operational Expenses:* Rs. ${dailyOutflowOperational.toLocaleString()}
🏛️ *Cash Deposited to Bank (Contra):* Rs. ${dailyBankDeposits.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━
💵 *Expected Net Cash In Safe:* Rs. ${expectedClosingCashInSafe.toLocaleString()}
🪙 *Physical Cash Counted:* Rs. ${physicalCashTotal.toLocaleString()}
⚖️ *Reconciliation Status:* ${varianceText}
━━━━━━━━━━━━━━━━━━━━━━━━━
📝 *Daily Activity:* ${todayIncomes.length} Inflows Processed | ${todayExpenses.length} Outflows
${closingRemarks ? `📌 *Closing Notes:* ${closingRemarks}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ""}
Accounts Department • Superior College Jahanian`;

    try {
      setIsSendingDailyBriefing(true);
      toast.loading(`Sending Daily Briefing to +${cleanPhone}...`, { id: "brief-wa" });
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, message: briefingMsg }),
      });

      if (res.ok) {
        toast.success(`Daily Briefing dispatched to +${cleanPhone}!`, { id: "brief-wa" });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.info(err.error || "Gateway offline. Opening WhatsApp Web...", { id: "brief-wa" });
        window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(briefingMsg)}`, "_blank");
      }
    } catch {
      window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(briefingMsg)}`, "_blank");
      toast.dismiss("brief-wa");
    } finally {
      setIsSendingDailyBriefing(false);
    }
  };

  // Export Printable Roznamcha PDF
  const exportRoznamchaPDF = () => {
    try {
      const doc = new jsPDF("p", "pt", "a4");

      // Header Banner
      doc.setFillColor(11, 77, 69);
      doc.rect(0, 0, doc.internal.pageSize.width, 70, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("SUPERIOR GROUP OF COLLEGES JAHANIAN", 40, 32);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`DAILY CASH CLOSING REGISTER (ROZNAMCHA) • DATE: ${closingDate}`, 40, 52);

      // Summary Table
      autoTable(doc, {
        startY: 90,
        theme: "grid",
        head: [["Closing Metric Head", "Amount (PKR)", "Remarks / Method"]],
        body: [
          ["1. Opening Cash in Safe (Carry Forward)", `Rs. ${openingSafeBalance.toLocaleString()}`, "Balance from previous day's closing"],
          ["2. Cash Collections (Fees & Incomes)", `Rs. ${dailyInflowCash.toLocaleString()}`, `${todayIncomes.length} receipt transactions`],
          ["3. Bank / Online Direct Collections", `Rs. ${dailyInflowBank.toLocaleString()}`, "Direct bank transfer / cheque (Non-cash)"],
          ["4. Gross Total Inflow Today", `Rs. ${totalInflowAll.toLocaleString()}`, "Total revenue processed today"],
          ["5. Petty Cash & Operational Expenses", `Rs. ${dailyOutflowOperational.toLocaleString()}`, `${todayExpenses.filter((e: any) => !isBankDeposit(e)).length} operational vouchers`],
          ["6. Cash Deposited to College Bank (Contra)", `Rs. ${dailyBankDeposits.toLocaleString()}`, `${todayExpenses.filter((e: any) => isBankDeposit(e)).length} bank deposit slips`],
          ["7. Expected Net Closing Cash In Safe", `Rs. ${expectedClosingCashInSafe.toLocaleString()}`, "Opening + Inflows - Operational - Bank Transfers"],
          ["8. Physical Cash Counted (Denominations)", `Rs. ${physicalCashTotal.toLocaleString()}`, isCountEntered ? (closingDiscrepancy === 0 ? "100% Balanced ✅" : closingDiscrepancy > 0 ? "Surplus" : "Shortage") : "Count pending"],
          ["9. Audit Discrepancy / Variance", `Rs. ${closingDiscrepancy.toLocaleString()}`, closingDiscrepancy === 0 ? "RECONCILED & BALANCED ✅" : "DISCREPANCY DETECTED ⚠️"],
        ],
        headStyles: { fillColor: [11, 77, 69], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 5 },
      });

      let nextY = (doc as any).lastAutoTable.finalY + 16;

      // Currency Denominations breakdown in PDF
      if (isCountEntered) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Physical Currency Denomination Breakdown:", 40, nextY);

        autoTable(doc, {
          startY: nextY + 6,
          theme: "plain",
          head: [["Rs. 5000", "Rs. 1000", "Rs. 500", "Rs. 100", "Rs. 50", "Rs. 20", "Rs. 10", "Coins", "Total Counted"]],
          body: [[
            `x ${cashNotes.n5000 || 0}`,
            `x ${cashNotes.n1000 || 0}`,
            `x ${cashNotes.n500 || 0}`,
            `x ${cashNotes.n100 || 0}`,
            `x ${cashNotes.n50 || 0}`,
            `x ${cashNotes.n20 || 0}`,
            `x ${cashNotes.n10 || 0}`,
            `Rs. ${cashNotes.coins || 0}`,
            `Rs. ${physicalCashTotal.toLocaleString()}`
          ]],
          headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: "bold", fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 4, halign: "center" }
        });

        nextY = (doc as any).lastAutoTable.finalY + 20;
      }

      // Page break guard
      if (nextY > 640) {
        doc.addPage();
        nextY = 40;
      }

      // Inflow Details Table
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("1. Daily Cash Inflow Register", 40, nextY);

      autoTable(doc, {
        startY: nextY + 8,
        theme: "striped",
        head: [["Student / Source", "Roll / ID", "Method", "Category", "Amount (PKR)"]],
        body: todayIncomes.length > 0
          ? todayIncomes.map((inc: any) => [
              inc.studentName || "Direct Income",
              inc.studentId || "-",
              inc.paymentMethod || "Cash",
              inc.category || "Fee Payment",
              `Rs. ${(Number(inc.amount) || 0).toLocaleString()}`,
            ])
          : [["No cash inflows recorded on this date", "-", "-", "-", "Rs. 0"]],
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 4 },
      });

      nextY = (doc as any).lastAutoTable.finalY + 25;

      // Page break guard
      if (nextY > 650) {
        doc.addPage();
        nextY = 40;
      }

      // Outflow Details Table
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("2. Daily Cash Outflow & Bank Transfers", 40, nextY);

      autoTable(doc, {
        startY: nextY + 8,
        theme: "striped",
        head: [["Voucher / Ref #", "Type / Head", "Paid To / Bank", "Description", "Amount (PKR)"]],
        body: todayExpenses.length > 0
          ? todayExpenses.map((exp: any) => {
              const d = parseExpenseDetails(exp);
              const isDeposit = isBankDeposit(exp);
              return [
                d.voucherNo || (isDeposit ? "BD-SLIP" : "V-EXP"),
                isDeposit ? "Bank Deposit (Contra)" : (exp.category || "Petty Cash"),
                d.paidTo || (isDeposit ? "College Bank Account" : "-"),
                d.cleanDescription || exp.description || "-",
                `Rs. ${(Number(exp.amount) || 0).toLocaleString()}`,
              ];
            })
          : [["-", "No expenses or bank transfers on this date", "-", "-", "Rs. 0"]],
        headStyles: { fillColor: [225, 29, 72], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 4 },
      });

      nextY = (doc as any).lastAutoTable.finalY + 45;
      if (nextY > 730) {
        doc.addPage();
        nextY = 60;
      }

      // Signatures
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("_________________________", 60, nextY);
      doc.text("Cashier / Assistant Accountant", 60, nextY + 14);

      doc.text("_________________________", 250, nextY);
      doc.text("Chief Accounts Officer", 250, nextY + 14);

      doc.text("_________________________", 430, nextY);
      doc.text("Principal / Campus Director", 430, nextY + 14);

      doc.save(`Daily_Cash_Closing_Roznamcha_${closingDate}.pdf`);
      toast.success(`Roznamcha PDF exported for ${closingDate}!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Roznamcha PDF.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Closing Date:
            </Label>
            <Input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="h-9 w-40 text-xs font-bold rounded-xl border-slate-200 bg-slate-50"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setQuickDate(0)}
              className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                closingDate === new Date().toISOString().split("T")[0]
                  ? "bg-white text-superior-teal shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800 font-bold"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setQuickDate(1)}
              className="px-3 py-1 text-[11px] font-bold rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
            >
              Yesterday
            </button>
          </div>

          <Badge
            className={`px-3 py-1 font-bold text-xs border ${
              !isCountEntered
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : closingDiscrepancy === 0
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            {!isCountEntered
              ? "⏳ Physical Count Pending"
              : closingDiscrepancy === 0
              ? "✅ Safe Balanced & Reconciled"
              : `⚠️ Discrepancy: Rs. ${closingDiscrepancy.toLocaleString()}`}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {onOpenBankDeposit && (
            <Button
              onClick={onOpenBankDeposit}
              className="h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-2 shadow-sm shadow-blue-200 cursor-pointer"
            >
              <Building2 size={15} />
              Deposit to Bank (Contra)
            </Button>
          )}
          <Button
            onClick={exportRoznamchaPDF}
            variant="outline"
            className="h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-2 cursor-pointer"
          >
            <Printer size={15} />
            Export Roznamcha PDF
          </Button>
          <Button
            onClick={handleSendDailyWhatsAppBriefing}
            disabled={isSendingDailyBriefing}
            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-sm shadow-emerald-200 cursor-pointer"
          >
            <MessageSquare size={15} />
            {isSendingDailyBriefing ? "Sending..." : "WhatsApp Daily Briefing"}
          </Button>
        </div>
      </div>

      {/* 5 Financial Status Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Opening Safe Balance */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              1. Opening in Safe
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <History size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">
              Rs. {openingSafeBalance.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Yesterday's carry forward
            </p>
          </div>
        </div>

        {/* Card 2: Cash Inflow Today */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
              2. Cash Inflow Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-emerald-600">
              Rs. {dailyInflowCash.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              + Rs. {dailyInflowBank.toLocaleString()} bank/online
            </p>
          </div>
        </div>

        {/* Card 3: Outflows (Ops + Bank) */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
              3. Cash Outflows
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <TrendingDown size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-rose-600">
              Rs. {totalOutflowToday.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Rs. {dailyOutflowOperational.toLocaleString()} ops + Rs. {dailyBankDeposits.toLocaleString()} bank
            </p>
          </div>
        </div>

        {/* Card 4: System Net Cash in Safe */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-superior-teal uppercase tracking-widest">
              4. System Safe Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-superior-teal flex items-center justify-center shrink-0">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">
              Rs. {expectedClosingCashInSafe.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Opening + Inflow - Outflows
            </p>
          </div>
        </div>

        {/* Card 5: Physical Cash Counted */}
        <div className={cn(
          "p-4 rounded-3xl border shadow-sm flex flex-col justify-between transition-colors",
          !isCountEntered
            ? "bg-amber-50/60 border-amber-200"
            : closingDiscrepancy === 0
            ? "bg-emerald-50/60 border-emerald-200"
            : "bg-rose-50/60 border-rose-200"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              5. Physical Count
            </span>
            <div className="w-8 h-8 rounded-xl bg-white text-slate-700 flex items-center justify-center shrink-0 shadow-xs">
              <Coins size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">
              Rs. {physicalCashTotal.toLocaleString()}
            </h3>
            <p className={cn(
              "text-[10px] font-black mt-0.5",
              !isCountEntered ? "text-amber-700" : closingDiscrepancy === 0 ? "text-emerald-700" : "text-rose-700"
            )}>
              {!isCountEntered
                ? "Count pending ⏳"
                : closingDiscrepancy === 0
                ? "100% BALANCED ✅"
                : closingDiscrepancy > 0
                ? `+Rs. ${closingDiscrepancy.toLocaleString()} Surplus`
                : `-Rs. ${Math.abs(closingDiscrepancy).toLocaleString()} Shortage`}
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Journal Register on Left, Denomination Calculator on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Roznamcha Activity Register */}
        <div className="lg:col-span-7 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">
                Roznamcha Day-Book Journal
              </h3>
              <p className="text-xs text-slate-400 font-semibold">
                Chronological register for {closingDate}
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setJournalTab("inflow")}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  journalTab === "inflow"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Inflows ({todayIncomes.length})
              </button>
              <button
                onClick={() => setJournalTab("outflow")}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  journalTab === "outflow"
                    ? "bg-white text-rose-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Outflows ({todayExpenses.length})
              </button>
            </div>
          </div>

          {journalTab === "inflow" ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="font-black text-slate-400 uppercase text-[10px]">Student / Source</TableHead>
                    <TableHead className="font-black text-slate-400 uppercase text-[10px]">Roll No</TableHead>
                    <TableHead className="font-black text-slate-400 uppercase text-[10px]">Method</TableHead>
                    <TableHead className="font-black text-slate-400 uppercase text-[10px] text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayIncomes.length > 0 ? (
                    todayIncomes.map((inc: any, i: number) => (
                      <TableRow key={inc.id || i} className="hover:bg-slate-50/50">
                        <TableCell className="font-bold text-slate-800 text-xs">
                          {inc.studentName || inc.title || "Fee Payment"}
                        </TableCell>
                        <TableCell className="font-mono text-slate-500 text-xs">
                          {inc.studentId || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-50 text-emerald-700 border-0 font-bold text-[10px]">
                            {inc.paymentMethod || "Cash"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-black text-emerald-600 text-xs text-right">
                          Rs. {(Number(inc.amount) || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-slate-400 text-xs font-medium">
                        No revenue or fees recorded on this date.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="font-black text-slate-400 uppercase text-[10px]">Voucher / Ref</TableHead>
                    <TableHead className="font-black text-slate-400 uppercase text-[10px]">Category / Type</TableHead>
                    <TableHead className="font-black text-slate-400 uppercase text-[10px]">Paid To / Bank</TableHead>
                    <TableHead className="font-black text-slate-400 uppercase text-[10px]">Description</TableHead>
                    <TableHead className="font-black text-slate-400 uppercase text-[10px] text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayExpenses.length > 0 ? (
                    todayExpenses.map((exp: any, i: number) => {
                      const d = parseExpenseDetails(exp);
                      const isDeposit = isBankDeposit(exp);
                      return (
                        <TableRow key={exp.id || i} className={cn("hover:bg-slate-50/50", isDeposit && "bg-blue-50/30")}>
                          <TableCell className="font-bold text-slate-800 text-xs">
                            <span className="font-mono text-[10px] text-slate-400">
                              {d.voucherNo || (isDeposit ? "BD-SLIP" : "V-EXP")}
                            </span>
                          </TableCell>
                          <TableCell>
                            {isDeposit ? (
                              <Badge className="bg-blue-100 text-blue-800 border-none font-bold text-[10px]">
                                Bank Deposit (Contra)
                              </Badge>
                            ) : (
                              <span className="text-xs font-semibold text-slate-700">{exp.category}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs">
                            {d.paidTo || (isDeposit ? "College Bank Account" : "-")}
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs truncate max-w-[150px]">
                            {d.cleanDescription || exp.description || "-"}
                          </TableCell>
                          <TableCell className={cn("font-black text-xs text-right", isDeposit ? "text-blue-600" : "text-rose-600")}>
                            Rs. {(Number(exp.amount) || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-400 text-xs font-medium">
                        No expenses or bank transfers recorded on this date.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Safe Physical Currency Denomination Counter */}
        <div className="lg:col-span-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-800 text-base uppercase tracking-tight flex items-center gap-2">
                <Coins className="text-amber-500" size={18} />
                Physical Safe Cash Counter
              </h3>
              <p className="text-xs text-slate-400 font-semibold">
                Count notes in safe to verify against system balance
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCashNotes({
                  n5000: "",
                  n1000: "",
                  n500: "",
                  n100: "",
                  n50: "",
                  n20: "",
                  n10: "",
                  coins: "",
                })
              }
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear
            </Button>
          </div>

          {/* Denomination Notes Table */}
          <div className="space-y-2 text-xs">
            {[
              { label: "Rs. 5,000 Notes", key: "n5000", val: 5000 },
              { label: "Rs. 1,000 Notes", key: "n1000", val: 1000 },
              { label: "Rs. 500 Notes", key: "n500", val: 500 },
              { label: "Rs. 100 Notes", key: "n100", val: 100 },
              { label: "Rs. 50 Notes", key: "n50", val: 50 },
              { label: "Rs. 20 Notes", key: "n20", val: 20 },
              { label: "Rs. 10 Notes", key: "n10", val: 10 },
            ].map((d) => {
              const count = Number(cashNotes[d.key as keyof typeof cashNotes]) || 0;
              const subtotal = count * d.val;
              return (
                <div
                  key={d.key}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <span className="font-black text-slate-700 w-28">{d.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">×</span>
                    <Input
                      type="number"
                      min="0"
                      value={cashNotes[d.key as keyof typeof cashNotes]}
                      onChange={(e) =>
                        setCashNotes({
                          ...cashNotes,
                          [d.key]: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="h-7 w-16 text-center font-bold text-xs bg-white rounded-lg border-slate-200"
                    />
                  </div>
                  <span className="font-mono font-black text-slate-800 w-24 text-right">
                    = Rs. {subtotal.toLocaleString()}
                  </span>
                </div>
              );
            })}

            {/* Coins / Small change */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-black text-slate-700 w-28">Coins / Change</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">Rs.</span>
                <Input
                  type="number"
                  min="0"
                  value={cashNotes.coins}
                  onChange={(e) => setCashNotes({ ...cashNotes, coins: e.target.value })}
                  placeholder="0"
                  className="h-7 w-20 text-center font-bold text-xs bg-white rounded-lg border-slate-200"
                />
              </div>
              <span className="font-mono font-black text-slate-800 w-24 text-right">
                = Rs. {(Number(cashNotes.coins) || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Physical Total & Difference Box */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-sm font-black">
              <span className="text-slate-700">Total Cash Counted:</span>
              <span className="text-emerald-700 font-mono text-base">
                Rs. {physicalCashTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
              <span>Expected Closing Safe Balance:</span>
              <span className="font-mono text-slate-800">Rs. {expectedClosingCashInSafe.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400">
              <span>Opening Carry Forward:</span>
              <span className="font-mono">Rs. {openingSafeBalance.toLocaleString()}</span>
            </div>
            <div
              className={`p-3 rounded-xl border text-xs font-black flex items-center justify-between ${
                !isCountEntered
                  ? "bg-slate-50 text-slate-500 border-slate-200"
                  : closingDiscrepancy === 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              <span>Audit Discrepancy:</span>
              <span className="font-mono text-sm">
                {!isCountEntered
                  ? "0 (Not Counted)"
                  : closingDiscrepancy === 0
                  ? "Rs. 0 (PERFECTLY BALANCED)"
                  : `Rs. ${closingDiscrepancy.toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Closing Notes */}
          <div className="space-y-1.5 pt-2">
            <Label className="text-xs font-black text-slate-600 uppercase tracking-wider">
              Closing Handover Notes:
            </Label>
            <Input
              value={closingRemarks}
              onChange={(e) => setClosingRemarks(e.target.value)}
              placeholder="e.g. Safe locked and verified with Cashier"
              className="text-xs rounded-xl border-slate-200"
            />
          </div>
        </div>
      </div>
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
    const feeLedger = student.feeLedger || { totalPackage: 0, remainingBalance: 0, installments: [] };
    const balance = feeLedger.remainingBalance || 0;
    const hasOverdue = feeLedger.installments?.some(inst => 
      inst.status === 'Unpaid' && new Date(inst.dueDate) < new Date() && new Date(inst.dueDate).toDateString() !== new Date().toDateString()
    );

    if (hasOverdue && balance > 0) return <Badge className="bg-red-600 text-white animate-pulse">Overdue</Badge>;
    if (balance <= 0) return <Badge className="bg-emerald-100 text-emerald-700 font-bold">Fully Paid</Badge>;
    if (balance < feeLedger.totalPackage) return <Badge className="bg-orange-100 text-orange-700 font-bold">Partial Paid</Badge>;
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
                  {(student.feeLedger?.transactions || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">No transactions recorded yet.</TableCell>
                    </TableRow>
                  ) : (
                    (student.feeLedger?.transactions || []).map((tx: FeeTransaction) => (
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
  const feeLedger = student.feeLedger || { totalPackage: 0, installments: [] };
  const [installments, setInstallments] = useState<Installment[]>(feeLedger.installments || []);

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
    const feeLedger = student.feeLedger || { totalPackage: 0 };
    const total = installments.reduce((acc, curr) => acc + Number(curr.amount), 0);
    if (total > feeLedger.totalPackage) {
      toast.warning(`Warning: Total installments (Rs. ${(total || 0).toLocaleString()}) exceed total package (Rs. ${(feeLedger.totalPackage || 0).toLocaleString()})`);
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
          installments.reduce((acc, curr) => acc + Number(curr.amount), 0) > (student.feeLedger?.totalPackage || 0) ? "text-red-600" : "text-superior-teal"
        )}>
          Rs. {(installments.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function AddEntryDialog({ data, onClose }: { data: any, onClose: () => void }) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: 'Refreshment',
    customCategory: '',
    expenseType: 'Daily' as 'Daily' | 'Monthly' | 'Operational',
    paidTo: '',
    voucherNo: '',
    description: '',
    paymentMethod: 'Cash' as any,
    studentName: '', // For misc income
  });

  const incomeCategories = ['Miscellaneous', 'Asset Sale', 'Donation', 'Prospectus Sale', 'Uniform / Badges', 'Other Revenue'];

  const handleCategoryChange = (val: string) => {
    if (val === '__custom__') {
      setFormData(prev => ({ ...prev, category: '__custom__' }));
      return;
    }
    const matched = COLLEGE_EXPENSE_HEADS_CONFIG.find(h => h.name === val);
    setFormData(prev => ({
      ...prev,
      category: val,
      expenseType: matched ? matched.defaultType : prev.expenseType
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = type === 'expense' 
      ? (formData.category === '__custom__' ? formData.customCategory.trim() : formData.category)
      : formData.category;

    if (!formData.amount || Number(formData.amount) <= 0 || !finalCategory) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    if (type === 'expense') {
      data.addExpense({
        date: formData.date,
        amount: Number(formData.amount),
        category: finalCategory,
        description: formData.description,
        addedBy: data.currentUser?.email || 'Admin Office',
        paymentMethod: formData.paymentMethod,
        expenseType: formData.expenseType,
        paidTo: formData.paidTo?.trim() || undefined,
        voucherNo: formData.voucherNo?.trim() || undefined
      });
    } else {
      data.addIncome({
        date: formData.date,
        amount: Number(formData.amount),
        feeType: finalCategory,
        description: formData.description,
        studentName: formData.studentName || 'Manual Entry',
        status: 'Full',
        recordedBy: data.currentUser?.email || 'Admin Office',
        paymentMethod: formData.paymentMethod
      });
    }
    onClose();
  };

  return (
    <DialogContent className="w-[95vw] max-w-4xl rounded-[2.5rem] p-6 sm:p-9 max-h-[92vh] overflow-y-auto shadow-2xl border-slate-100">
      <DialogHeader className="pb-2 border-b border-slate-100">
        <DialogTitle className="text-2xl sm:text-3xl font-display font-black text-superior-teal tracking-tight flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-superior-gold flex items-center justify-center text-superior-teal shadow-lg shadow-superior-gold/20 shrink-0">
            <Plus size={22} />
          </div>
          <span>Add Financial Transaction</span>
        </DialogTitle>
        <DialogDescription className="text-sm text-slate-500 font-medium pt-1">
          Record college expenses or miscellaneous income in the official accounts ledger.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        <Tabs value={type} onValueChange={(v: any) => setType(v)} className="w-full">
          <TabsList className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5 h-auto">
            <TabsTrigger value="expense" className="rounded-xl font-bold py-3 text-sm sm:text-base data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all flex items-center justify-center gap-2">
              <span>Expense</span>
              <span className="font-nastaleeq text-base font-normal tracking-normal">(کالج خرچہ)</span>
            </TabsTrigger>
            <TabsTrigger value="income" className="rounded-xl font-bold py-3 text-sm sm:text-base data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all flex items-center justify-center gap-2">
              <span>Income</span>
              <span className="font-nastaleeq text-base font-normal tracking-normal">(آمدن)</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Expense Nature Selector */}
        {type === 'expense' && (
          <div className="space-y-2.5 bg-slate-50/80 p-4 rounded-3xl border border-slate-100">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Expense Frequency / Nature
              </Label>
              <span className="text-[11px] text-slate-400 font-bold">Automatic filtering & tracking</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, expenseType: 'Daily' })}
                className={cn(
                  "py-3 px-4 rounded-2xl font-bold text-sm border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                  formData.expenseType === 'Daily'
                    ? "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-200 ring-2 ring-amber-400/30"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                )}
              >
                <span>Daily / Petty Cash</span>
                <span className={cn(
                  "font-nastaleeq text-sm font-normal",
                  formData.expenseType === 'Daily' ? "text-amber-100" : "text-slate-500"
                )}>
                  روزمرہ اخراجات
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, expenseType: 'Monthly' })}
                className={cn(
                  "py-3 px-4 rounded-2xl font-bold text-sm border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                  formData.expenseType === 'Monthly'
                    ? "bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-200 ring-2 ring-indigo-400/30"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                )}
              >
                <span>Monthly / Fixed</span>
                <span className={cn(
                  "font-nastaleeq text-sm font-normal",
                  formData.expenseType === 'Monthly' ? "text-indigo-100" : "text-slate-500"
                )}>
                  ماہانہ اخراجات / بلز
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, expenseType: 'Operational' })}
                className={cn(
                  "py-3 px-4 rounded-2xl font-bold text-sm border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                  formData.expenseType === 'Operational'
                    ? "bg-sky-600 text-white border-sky-700 shadow-md shadow-sky-200 ring-2 ring-sky-400/30"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                )}
              >
                <span>Operational / Board</span>
                <span className={cn(
                  "font-nastaleeq text-sm font-normal",
                  formData.expenseType === 'Operational' ? "text-sky-100" : "text-slate-500"
                )}>
                  چالان / پروجیکٹس
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Date</Label>
            <Input 
              type="date" 
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-medium text-base px-4"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Amount (Rs.) *</Label>
            <Input 
              type="number" 
              placeholder="0.00"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-black text-xl text-rose-600 px-4"
              required
            />
          </div>
        </div>

        {/* Category Head Selection */}
        <div className="space-y-2">
          <div className="flex justify-between items-center ml-1">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              {type === 'expense' ? 'Expense Head / Category *' : 'Income Category *'}
            </Label>
            {type === 'expense' && (
              <span className="text-[11px] text-superior-teal font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full">
                40+ College Heads Available
              </span>
            )}
          </div>

          {type === 'expense' ? (
            <div className="space-y-2.5">
              {/* Quick Autocomplete Expense Shortcut Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                  Frequent:
                </span>
                {[
                  { name: 'Printing & Stationery', type: 'Daily' },
                  { name: 'Refreshment & Tea', type: 'Daily' },
                  { name: 'Electricity Bill', type: 'Monthly' },
                  { name: 'Generator Diesel & Fuel', type: 'Daily' },
                  { name: 'Repair & Maintenance', type: 'Daily' },
                  { name: 'Board Registration Fee', type: 'Operational' },
                  { name: 'Flex & Advertising', type: 'Operational' },
                  { name: 'Office Supplies', type: 'Daily' },
                ].map(chip => (
                  <button
                    key={chip.name}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        category: chip.name,
                        expenseType: chip.type as any,
                      }));
                    }}
                    className={cn(
                      "px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer shrink-0",
                      formData.category === chip.name
                        ? "bg-superior-teal text-white border-superior-teal shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    )}
                  >
                    {chip.name}
                  </button>
                ))}
              </div>

              <Select value={formData.category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full h-13 rounded-2xl bg-slate-50 border border-slate-200 hover:border-superior-teal/50 font-bold px-4 text-base shadow-sm transition-all flex items-center justify-between cursor-pointer">
                  <SelectValue placeholder="Select College Expense Head..." />
                </SelectTrigger>
                <SelectContent 
                  align="start" 
                  alignItemWithTrigger={false}
                  className="w-[var(--anchor-width)] min-w-[360px] sm:min-w-[660px] max-w-[95vw] max-h-[480px] rounded-3xl p-3 shadow-2xl border-slate-200 bg-white"
                >
                  <div className="px-2 py-1.5 mb-2 bg-slate-50 rounded-xl flex items-center justify-between text-xs text-slate-500 font-bold border border-slate-100">
                    <span>Click any head to select. Automatically sets frequency.</span>
                    <span className="text-superior-teal">8 Main Groups</span>
                  </div>

                  {EXPENSE_GROUPS.map(grp => {
                    const heads = COLLEGE_EXPENSE_HEADS_CONFIG.filter(h => h.group === grp);
                    if (heads.length === 0) return null;
                    return (
                      <div key={grp} className="mb-3">
                        <div className="px-3 py-1.5 text-xs font-black uppercase tracking-wider text-superior-teal bg-emerald-50/80 rounded-xl flex items-center justify-between mb-1 sticky top-0 z-10 backdrop-blur-sm border border-emerald-100/50">
                          <span>{grp}</span>
                          <span className="text-[10px] font-bold text-superior-teal/70">{heads.length} Heads</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 px-1">
                          {heads.map(h => (
                            <SelectItem 
                              key={h.name} 
                              value={h.name} 
                              className="py-2.5 px-3 rounded-xl text-sm font-semibold cursor-pointer hover:bg-slate-100 focus:bg-emerald-50 focus:text-emerald-900 transition-colors"
                            >
                              <div className="flex items-center justify-between w-full gap-2">
                                <span className="truncate">{h.name}</span>
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                                  h.defaultType === 'Daily' ? "bg-amber-100 text-amber-800" :
                                  h.defaultType === 'Monthly' ? "bg-indigo-100 text-indigo-800" :
                                  "bg-sky-100 text-sky-800"
                                )}>
                                  {h.defaultType}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="pt-2 border-t border-slate-100 mt-2 px-1">
                    <SelectItem value="__custom__" className="py-3 px-3 rounded-xl text-sm font-bold text-superior-teal hover:bg-emerald-50 focus:bg-emerald-50">
                      <div className="flex items-center gap-2">
                        <span>+ Custom Head /</span>
                        <span className="font-nastaleeq text-sm font-normal">دیگر خرچہ درج کریں...</span>
                      </div>
                    </SelectItem>
                  </div>
                </SelectContent>
              </Select>

              {formData.category === '__custom__' && (
                <div className="pt-1">
                  <Input 
                    placeholder="Enter custom expense head name..."
                    value={formData.customCategory}
                    onChange={e => setFormData({...formData, customCategory: e.target.value})}
                    className="h-12 rounded-2xl bg-amber-50/50 border-amber-200 font-bold text-amber-900 text-base px-4"
                    autoFocus
                  />
                </div>
              )}
            </div>
          ) : (
            <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
              <SelectTrigger className="w-full h-13 rounded-2xl bg-slate-50 border-slate-200 font-bold px-4 text-base">
                <SelectValue placeholder="Select income category..." />
              </SelectTrigger>
              <SelectContent 
                align="start" 
                alignItemWithTrigger={false}
                className="w-[var(--anchor-width)] min-w-[320px] sm:min-w-[440px] rounded-2xl shadow-2xl border-slate-100 p-2"
              >
                {incomeCategories.map(c => (
                  <SelectItem key={c} value={c} className="py-2.5 px-3 rounded-xl text-sm font-semibold cursor-pointer">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Vendor / Paid To & Voucher No */}
        {type === 'expense' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Paid To / Vendor Name
              </Label>
              <Input 
                placeholder="e.g. Munir Electrician, PTCL, PSO"
                value={formData.paidTo}
                onChange={e => setFormData({...formData, paidTo: e.target.value})}
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 text-sm font-medium px-4"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Voucher / Slip / Challan #
              </Label>
              <Input 
                placeholder="e.g. V-104, Challan #892"
                value={formData.voucherNo}
                onChange={e => setFormData({...formData, voucherNo: e.target.value})}
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 text-sm font-mono font-medium px-4"
              />
            </div>
          </div>
        )}

        {type === 'income' && (
          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Payer Name / Source</Label>
            <Input 
              placeholder="e.g. Scrap Sale or Payer Name"
              value={formData.studentName}
              onChange={e => setFormData({...formData, studentName: e.target.value})}
              className="h-12 rounded-2xl bg-slate-50 border-slate-200 text-base px-4"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Payment Method</Label>
            <Select value={formData.paymentMethod || "Cash"} onValueChange={v => setFormData({...formData, paymentMethod: v})}>
              <SelectTrigger className="w-full h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold px-4 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent 
                align="start" 
                alignItemWithTrigger={false}
                className="w-[var(--anchor-width)] min-w-[280px] rounded-2xl shadow-xl border-slate-100 p-2"
              >
                <SelectItem value="Cash" className="py-2.5 px-3 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Cash</span>
                    <span className="font-nastaleeq text-sm font-normal text-slate-500">(کیش)</span>
                  </div>
                </SelectItem>
                <SelectItem value="Bank Transfer" className="py-2.5 px-3 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Bank Transfer</span>
                    <span className="font-nastaleeq text-sm font-normal text-slate-500">(بینک)</span>
                  </div>
                </SelectItem>
                <SelectItem value="Cheque" className="py-2.5 px-3 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Cheque</span>
                    <span className="font-nastaleeq text-sm font-normal text-slate-500">(چیک)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Description / Particulars</Label>
            <Input 
              placeholder="e.g. 50 liters generator diesel"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="h-12 rounded-2xl bg-slate-50 border-slate-200 text-sm font-medium px-4"
            />
          </div>
        </div>

        <div className="pt-4 flex gap-4 border-t border-slate-100">
          <Button variant="ghost" className="flex-1 rounded-2xl font-bold h-13 text-base" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            className={cn(
              "flex-1 text-white rounded-2xl font-bold h-13 text-base shadow-xl transition-all cursor-pointer",
              type === 'expense' 
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200 active:scale-[0.99]" 
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 active:scale-[0.99]"
            )}
            type="submit"
          >
            Save {type === 'expense' ? 'Expense Record' : 'Income Entry'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

function BankDepositDialog({ data, onClose, defaultDate }: { data: any, onClose: () => void, defaultDate?: string }) {
  const [bankName, setBankName] = useState('Meezan Bank');
  const [customBank, setCustomBank] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [slipRef, setSlipRef] = useState('');
  const [depositedBy, setDepositedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const POPULAR_BANKS = [
    'Meezan Bank',
    'Habib Bank Limited (HBL)',
    'Bank of Punjab (BOP)',
    'National Bank of Pakistan (NBP)',
    'Allied Bank Limited (ABL)',
    'United Bank Limited (UBL)',
    'Bank Alfalah',
    'Askari Bank'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalBank = bankName === '__custom__' ? customBank.trim() : bankName;
    if (!finalBank || !amount || Number(amount) <= 0) {
      toast.error('Please enter a valid bank name and deposit amount');
      return;
    }

    try {
      setIsSubmitting(true);
      await data.recordBankDeposit({
        bankName: finalBank,
        accountNo: accountNo.trim() || 'Official College Account',
        amount: Number(amount),
        slipRef: slipRef.trim() || undefined,
        depositedBy: depositedBy.trim() || data.currentUser?.email || 'Accounts Office',
        date,
        notes: notes.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      toast.error(`Bank deposit failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="w-[95vw] max-w-xl rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border-slate-100 bg-white">
      <DialogHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
            <Building2 size={24} />
          </div>
          <div>
            <DialogTitle className="text-xl sm:text-2xl font-display font-black text-slate-800 tracking-tight">
              Deposit Cash to Bank (Contra)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Transfer physical cash from college safe to bank accounts without inflating expenses.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-100 flex items-center gap-3 text-xs text-blue-800">
          <ShieldCheck size={18} className="text-blue-600 shrink-0" />
          <span>
            <strong>Contra Voucher:</strong> Deducts cash from the daily safe register and credits the selected bank account safely.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Deposit Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium text-sm px-3"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Deposit Amount (Rs.) *</Label>
            <Input
              type="number"
              min="1"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="h-11 rounded-xl bg-slate-50 border-slate-200 font-black text-lg text-blue-600 px-3"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Target College Bank *</Label>
          <Select value={bankName} onValueChange={setBankName}>
            <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-sm">
              <SelectValue placeholder="Select Bank..." />
            </SelectTrigger>
            <SelectContent align="start" className="rounded-2xl border-slate-100 shadow-2xl p-2 bg-white max-h-[320px]">
              {POPULAR_BANKS.map(b => (
                <SelectItem key={b} value={b} className="py-2 px-3 rounded-xl text-sm font-semibold cursor-pointer">
                  {b}
                </SelectItem>
              ))}
              <SelectItem value="__custom__" className="py-2 px-3 rounded-xl text-sm font-bold text-blue-600 cursor-pointer">
                + Other Bank / Custom Account
              </SelectItem>
            </SelectContent>
          </Select>

          {bankName === '__custom__' && (
            <div className="pt-2">
              <Input
                placeholder="Enter custom bank name..."
                value={customBank}
                onChange={e => setCustomBank(e.target.value)}
                className="h-11 rounded-xl bg-blue-50/50 border-blue-200 font-bold text-sm px-3"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Bank Account # / IBAN</Label>
            <Input
              placeholder="e.g. 0102-0105829101"
              value={accountNo}
              onChange={e => setAccountNo(e.target.value)}
              className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm px-3 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Deposit Slip / Ref #</Label>
            <Input
              placeholder="e.g. SLIP-99824"
              value={slipRef}
              onChange={e => setSlipRef(e.target.value)}
              className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm px-3"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Deposited By (Cashier)</Label>
            <Input
              placeholder="e.g. Muhammad Kashif"
              value={depositedBy}
              onChange={e => setDepositedBy(e.target.value)}
              className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm px-3"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Remarks / Purpose</Label>
            <Input
              placeholder="e.g. Safe fee collection transfer"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm px-3"
            />
          </div>
        </div>

        <div className="pt-3 flex gap-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl font-bold h-11 text-sm border-slate-200 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-xl font-bold h-11 text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 cursor-pointer"
          >
            {isSubmitting ? "Recording Transfer..." : "Confirm Bank Deposit"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
