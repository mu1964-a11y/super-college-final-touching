import * as React from 'react';
import { useState, useRef, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Users, 
  CreditCard, 
  Briefcase, 
  BarChart3,
  Search,
  ChevronLeft,
  Printer,
  Image as ImageIcon,
  FileDown,
  Edit3,
  Filter,
  Calendar as CalendarIcon,
  UserCheck,
  UserX,
  Award,
  School,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { exportElementToPdf, exportElementToImage } from '../utils/documentExporter';
import { jsPDF } from 'jspdf';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from 'recharts';

export default function ReportsView({ data, initialFilter }: { data: any, initialFilter?: string | null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialFilter || 'all');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  
  // Advanced Filters
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [individualSearch, setIndividualSearch] = useState('');
  
  const reportRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: selectedReport ? `${selectedReport.title}_Report` : 'Report'
  });

  // Sync with initialFilter if it changes from sidebar
  React.useEffect(() => {
    if (initialFilter) {
      setCategoryFilter(initialFilter);
    }
  }, [initialFilter]);

  const handleDownloadImage = async () => {
    if (reportRef.current === null) return;
    
    try {
      // Temporarily remove height restrictions and scrollbars
      const originalStyle = reportRef.current.style.cssText;
      reportRef.current.style.height = 'auto';
      reportRef.current.style.overflow = 'visible';
      
      await exportElementToImage(
        reportRef.current,
        `${selectedReport.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`,
        { pixelRatio: 2.0, backgroundColor: '#ffffff' }
      );
      
      reportRef.current.style.cssText = originalStyle;
      toast.success("Report downloaded as Image!");
    } catch (err) {
      console.error('oops, something went wrong!', err);
      toast.error("Failed to download image");
    }
  };

  const handleDownloadPDF = async () => {
    if (reportRef.current === null) return;

    toast.info("Preparing multi-page PDF... Please wait.");
    
    try {
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Use jspdf's html method which handles multi-page better
      await pdf.html(reportRef.current, {
        callback: function (doc) {
          doc.save(`${selectedReport.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
          toast.success("Report downloaded as PDF!");
        },
        x: 0,
        y: 0,
        width: pdfWidth,
        windowWidth: 1200, // Fixed width for consistent rendering
        autoPaging: 'text',
        margin: [40, 40, 40, 40]
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error("Failed to download PDF. Try printing to PDF instead.");
    }
  };

  const handleDownloadExcel = () => {
    if (!selectedReport || !selectedReport.data) return;
    try {
      const rows = selectedReport.data.map((row: string[]) => {
        const obj: Record<string, string> = {};
        selectedReport.columns.forEach((col: string, idx: number) => {
          obj[col] = row[idx] || '';
        });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, selectedReport.title.substring(0, 31));
      XLSX.writeFile(wb, `${selectedReport.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Report downloaded as Excel (.xlsx)!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export Excel file.");
    }
  };

  const handleDownloadCSV = () => {
    if (!selectedReport || !selectedReport.data) return;
    try {
      const headers = selectedReport.columns.map((c: string) => `"${c.replace(/"/g, '""')}"`).join(',');
      const rows = selectedReport.data.map((r: string[]) => r.map((c: string) => `"${String(c || '').replace(/"/g, '""')}"`).join(','));
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${selectedReport.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Report downloaded as CSV!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export CSV file.");
    }
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const reports = [
    { 
      id: 'students', 
      title: "Student Reports", 
      description: "Result cards, attendance summaries, and student profiles.", 
      icon: Users, 
      color: "teal",
      bgColor: "bg-superior-teal/5",
      iconColor: "text-superior-teal",
      hoverColor: "hover:bg-superior-teal/5 hover:border-superior-teal/10",
      columns: ["ID", "Name", "Father Name", "Gender", "Attendance", "Notes"],
      getData: () => {
        return (data.students || [])
          .filter((s: any) => genderFilter === 'all' || s?.gender === genderFilter)
          .filter((s: any) => !individualSearch || (s?.fullName || '').toLowerCase().includes(individualSearch.toLowerCase()) || (s?.id || '').toLowerCase().includes(individualSearch.toLowerCase()))
          .map((s: any) => {
            const attPresent = s?.attendance?.present || 0;
            const attAbsent = s?.attendance?.absent || 0;
            const attTotal = attPresent + attAbsent;
            const attText = attTotal > 0 ? `${attPresent}/${attTotal}` : 'N/A';
            return [
              s?.id || '', 
              s?.fullName || '', 
              s?.fatherName || '', 
              s?.gender || '', 
              attText,
              s?.notes?.map((n: any) => `[${n.type}] ${n.content}`).join('; ') || 'No notes'
            ];
          });
      }
    },
    { 
      id: 'fees', 
      title: "Fee Reports", 
      description: "Monthly collection, defaulter lists, and fee receipts.", 
      icon: CreditCard, 
      color: "gold",
      bgColor: "bg-amber-50/30",
      iconColor: "text-amber-600",
      hoverColor: "hover:bg-amber-50 hover:border-amber-100",
      columns: ["Student ID", "Name", "Month", "Year", "Amount Paid", "Status"],
      getData: () => {
        const feeData: any[] = [];
        (data.students || [])
          .filter((s: any) => genderFilter === 'all' || s?.gender === genderFilter)
          .filter((s: any) => !individualSearch || (s?.fullName || '').toLowerCase().includes(individualSearch.toLowerCase()) || (s?.id || '').toLowerCase().includes(individualSearch.toLowerCase()))
          .forEach((s: any) => {
            (s?.feeHistory || [])
              .filter((f: any) => monthFilter === 'all' || f?.month === monthFilter)
              .filter((f: any) => statusFilter === 'all' || f?.status === statusFilter)
              .forEach((f: any) => {
                feeData.push([s?.id || '', s?.fullName || '', f?.month || '', f?.year || '', `Rs. ${f?.amountPaid || 0}`, f?.status || '']);
              });
          });
        return feeData;
      }
    },
    { 
      id: 'staff', 
      title: "Staff Reports", 
      description: "Performance reports, ID cards, and salary statements.", 
      icon: Briefcase, 
      color: "slate",
      bgColor: "bg-slate-50/30",
      iconColor: "text-slate-600",
      hoverColor: "hover:bg-slate-50 hover:border-slate-100",
      columns: ["ID", "Name", "Role", "Contact", "Join Date", "Notes"],
      getData: () => {
        return (data.staff || [])
          .filter((s: any) => !individualSearch || (s?.fullName || '').toLowerCase().includes(individualSearch.toLowerCase()) || (s?.id || '').toLowerCase().includes(individualSearch.toLowerCase()))
          .map((s: any) => [
            s?.id || '', 
            s?.fullName || '', 
            s?.role || '', 
            s?.contact || '', 
            s?.joinDate || '',
            s?.notes?.map((n: any) => `[${n.type}] ${n.content}`).join('; ') || 'No notes'
          ]);
      }
    },
    { 
      id: 'financial', 
      title: "Financial Reports", 
      description: "Income vs Expense, balance sheets, and category breakdowns.", 
      icon: BarChart3, 
      color: "green",
      bgColor: "bg-emerald-50/30",
      iconColor: "text-emerald-600",
      hoverColor: "hover:bg-emerald-50 hover:border-emerald-100",
      columns: ["Date", "Type", "Category", "Amount", "Status"],
      getData: () => {
        const studentsList = data.students || [];
        const admissionsList = data.admissions || [];
        const activeStudentIds = new Set(studentsList.map((s: any) => s.id));
        const activeAdmissionIdsForStudents = new Set(studentsList.map((s: any) => s.admissionId).filter(Boolean));

        const validAdmissionsForIncome = admissionsList.filter((a: any) => {
          if (activeAdmissionIdsForStudents.has(a.id)) return true;
          if (a.studentId && !activeStudentIds.has(a.studentId)) return false;
          return !a.studentId;
        });

        const activeIncomes = data.incomes || [];
        const activeExpenses = data.expenses || [];

        const financialData: any[] = [];
        activeIncomes
          .filter((i: any) => monthFilter === 'all' || i?.month === monthFilter)
          .filter((i: any) => {
             if (!i?.date) return true;
             let matchesDate = true;
             if (startDateFilter) matchesDate = matchesDate && new Date(i.date) >= new Date(startDateFilter);
             if (endDateFilter) matchesDate = matchesDate && new Date(i.date) <= new Date(endDateFilter);
             return matchesDate;
          })
          .forEach((i: any) => {
            financialData.push([i?.date || '', "Income", i?.feeType || 'General', `Rs. ${i?.amount || 0}`, i?.status || 'Received']);
          });

        // Add additional admission fees not in ledgers
        validAdmissionsForIncome.forEach((a: any) => {
           const studentIncomesTotal = activeIncomes
              .filter((inc: any) => inc.studentId === a.id || (inc.studentName === a.fullName))
              .reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);
           
           const excess = Math.max(0, Number(a.feeReceived || 0) - studentIncomesTotal);
           if (excess > 0 && a.date) {
             const admMonth = months[new Date(a.date).getMonth()] || 'N/A';
             let matchesDate = true;
             if (startDateFilter) matchesDate = matchesDate && new Date(a.date) >= new Date(startDateFilter);
             if (endDateFilter) matchesDate = matchesDate && new Date(a.date) <= new Date(endDateFilter);
             
             if ((monthFilter === 'all' || admMonth === monthFilter) && matchesDate) {
                financialData.push([a.date, "Income (Adm)", "Admission Fee", `Rs. ${excess}`, "Received"]);
             }
           }
        });

        activeExpenses
          .filter((e: any) => !e?.date || monthFilter === 'all' || months[new Date(e.date).getMonth()] === monthFilter)
          .filter((e: any) => {
             if (!e?.date) return true;
             let matchesDate = true;
             if (startDateFilter) matchesDate = matchesDate && new Date(e.date) >= new Date(startDateFilter);
             if (endDateFilter) matchesDate = matchesDate && new Date(e.date) <= new Date(endDateFilter);
             return matchesDate;
          })
          .forEach((e: any) => {
            financialData.push([e?.date || '', "Expense", e?.category || 'General', `Rs. ${e?.amount || 0}`, "Paid"]);
          });
        return financialData.sort((a: any, b: any) => new Date(b[0] || 0).getTime() - new Date(a[0] || 0).getTime());
      }
    },
    { 
      id: 'admissions', 
      title: "Admission Reports", 
      description: "Applicant lists, conversion rates, and confirmation slips.", 
      icon: FileText, 
      color: "purple",
      bgColor: "bg-purple-50/30",
      iconColor: "text-purple-600",
      hoverColor: "hover:bg-purple-50 hover:border-purple-100",
      columns: ["ID", "Name", "Father Name", "Status", "Date"],
      getData: () => {
        return (data.admissions || [])
          .filter((a: any) => genderFilter === 'all' || a?.gender === genderFilter)
          .filter((a: any) => !a?.date || monthFilter === 'all' || months[new Date(a.date).getMonth()] === monthFilter)
          .filter((a: any) => statusFilter === 'all' || a?.status === statusFilter)
          .filter((a: any) => {
             if (!a?.date) return true;
             let matchesDate = true;
             if (startDateFilter) matchesDate = matchesDate && new Date(a.date) >= new Date(startDateFilter);
             if (endDateFilter) matchesDate = matchesDate && new Date(a.date) <= new Date(endDateFilter);
             return matchesDate;
          })
          .map((a: any) => [a?.id || '', a?.fullName || '', a?.fatherName || '', a?.status || '', a?.date || '']);
      }
    },
  ];

  // Executive KPI Analytics calculations
  const studentsList = data.students || [];
  const activeStudents = useMemo(() => studentsList.filter((s: any) => s && s.status !== "Struck Off"), [studentsList]);
  const boysCount = useMemo(() => activeStudents.filter((s: any) => (s?.gender || '').toLowerCase() === 'male').length, [activeStudents]);
  const girlsCount = useMemo(() => activeStudents.filter((s: any) => (s?.gender || '').toLowerCase() === 'female').length, [activeStudents]);

  const totalIncomes = useMemo(() => {
    const incomesList = data.incomes || [];
    return incomesList.reduce((sum: number, i: any) => sum + (Number(i?.amount) || 0), 0);
  }, [data.incomes]);

  const totalExpenses = useMemo(() => {
    const expensesList = data.expenses || [];
    return expensesList.reduce((sum: number, e: any) => sum + (Number(e?.amount) || 0), 0);
  }, [data.expenses]);

  const netCashFlow = totalIncomes - totalExpenses;

  const totalFeePackage = useMemo(() => {
    return activeStudents.reduce((sum: number, s: any) => sum + (Number(s?.totalPackage || s?.feeLedger?.totalPackage) || 0), 0);
  }, [activeStudents]);

  const totalFeeReceived = useMemo(() => {
    return activeStudents.reduce((sum: number, s: any) => sum + (Number(s?.feeReceived || s?.feeLedger?.totalReceived) || 0), 0);
  }, [activeStudents]);

  const feeRecoveryRate = totalFeePackage > 0 ? Math.round((totalFeeReceived / totalFeePackage) * 100) : 0;

  const totalStaffPayroll = useMemo(() => {
    const staffList = data.staff || [];
    return staffList.reduce((sum: number, s: any) => sum + (Number(s?.baseSalary || s?.salary) || 0), 0);
  }, [data.staff]);

  // Monthly Revenue vs Expense trend data (last 6 months)
  const financialTrendData = useMemo(() => {
    const monthsArr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const result: any[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = monthsArr[d.getMonth()];
      
      const monthIncome = (data.incomes || [])
        .filter((inc: any) => inc?.date && inc.date.startsWith(monthKey))
        .reduce((sum: number, inc: any) => sum + (Number(inc?.amount) || 0), 0);

      const monthExpense = (data.expenses || [])
        .filter((exp: any) => exp?.date && exp.date.startsWith(monthKey))
        .reduce((sum: number, exp: any) => sum + (Number(exp?.amount) || 0), 0);

      result.push({
        month: monthName,
        Revenue: monthIncome,
        Expense: monthExpense
      });
    }
    return result;
  }, [data.incomes, data.expenses]);

  // Program Distribution data for PieChart
  const programDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeStudents.forEach((s: any) => {
      const prog = s?.group || s?.program || 'General';
      counts[prog] = (counts[prog] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeStudents]);

  const PIE_COLORS = ['#0b4d45', '#d4af37', '#0284c7', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || report.id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (selectedReport) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedReport(null)}
            className="flex items-center gap-3 text-slate-500 hover:text-superior-teal w-fit font-black uppercase tracking-widest text-xs bg-slate-100/50 rounded-xl px-4 h-10 transition-all"
          >
            <ChevronLeft size={18} /> Back to Reports
          </Button>
          
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={handleDownloadExcel} className="flex items-center gap-2 h-10 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-800 font-bold px-4 hover:bg-emerald-100 shadow-sm">
              <FileSpreadsheet size={16} className="text-emerald-600" /> Excel (.xlsx)
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="flex items-center gap-2 h-10 rounded-xl border-slate-200 font-bold text-slate-600 px-4 hover:bg-slate-100">
              <Download size={16} className="text-slate-600" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadImage} className="flex items-center gap-2 h-10 rounded-xl border-slate-200 font-bold text-slate-600 px-4">
              <ImageIcon size={16} className="text-superior-gold" /> Image
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="flex items-center gap-2 h-10 rounded-xl border-slate-200 font-bold text-slate-600 px-4">
              <FileDown size={16} className="text-superior-gold" /> PDF
            </Button>
            <Button className="bg-superior-teal text-white hover:bg-superior-teal/90 h-10 rounded-xl font-bold px-6 shadow-lg shadow-superior-teal/10" onClick={() => handlePrint()}>
              <Printer size={16} className="mr-2" /> Print Report
            </Button>
          </div>
        </div>

        {/* Report Controls */}
        <Card className="bg-white border-slate-100 rounded-3xl shadow-sm">
          <CardContent className="p-6 flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <Filter size={18} className="text-superior-gold" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Report Filters</span>
            </div>
            
            {(selectedReport.id === 'students' || selectedReport.id === 'fees' || selectedReport.id === 'admissions') && (
              <Select value={genderFilter} onValueChange={(val) => { setGenderFilter(val); setSelectedReport({...selectedReport, data: selectedReport.getData()}) }}>
                <SelectTrigger className="w-[150px] h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="Boy">Boys</SelectItem>
                  <SelectItem value="Girl">Girls</SelectItem>
                </SelectContent>
              </Select>
            )}

            {(selectedReport.id === 'fees' || selectedReport.id === 'financial' || selectedReport.id === 'admissions') && (
              <Select value={monthFilter} onValueChange={(val) => { setMonthFilter(val); setSelectedReport({...selectedReport, data: selectedReport.getData()}) }}>
                <SelectTrigger className="w-[150px] h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                  <SelectItem value="all">All Months</SelectItem>
                  {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {(selectedReport.id === 'fees' || selectedReport.id === 'admissions') && (
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setSelectedReport({...selectedReport, data: selectedReport.getData()}) }}>
                <SelectTrigger className="w-[150px] h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                  <SelectItem value="all">All Status</SelectItem>
                  {selectedReport.id === 'fees' ? (
                    <>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Full Paid">Full Paid</SelectItem>
                      <SelectItem value="Partial Paid">Partial Paid</SelectItem>
                      <SelectItem value="Not Paid">Not Paid</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            )}

            {(selectedReport.id === 'students' || selectedReport.id === 'staff' || selectedReport.id === 'fees') && (
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  placeholder="Search Individual..." 
                  className="pl-12 h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-medium" 
                  value={individualSearch}
                  onChange={(e) => { setIndividualSearch(e.target.value); setSelectedReport({...selectedReport, data: selectedReport.getData()}) }}
                />
              </div>
            )}
            
            {(selectedReport.id === 'financial' || selectedReport.id === 'admissions') && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">From</Label>
                  <Input type="date" className="h-11 w-[140px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30" 
                    value={startDateFilter} onChange={(e) => { setStartDateFilter(e.target.value); setSelectedReport({...selectedReport, data: selectedReport.getData()}) }} />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">To</Label>
                  <Input type="date" className="h-11 w-[140px] rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30" 
                    value={endDateFilter} onChange={(e) => { setEndDateFilter(e.target.value); setSelectedReport({...selectedReport, data: selectedReport.getData()}) }} />
                </div>
                {(startDateFilter || endDateFilter) && (
                  <Button onClick={() => { setStartDateFilter(''); setEndDateFilter(''); setSelectedReport({...selectedReport, data: selectedReport.getData()}) }} variant="ghost" className="h-11 px-3 text-slate-400 hover:text-red-500 rounded-xl">
                    Clear
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-100 rounded-[2.5rem] shadow-xl overflow-hidden print:border-none print:shadow-none">
          <div ref={reportRef} className="bg-white p-12 md:p-20 min-h-[1000px] w-full print:p-0">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * { visibility: hidden; }
                .print-container, .print-container * { visibility: visible; }
                .print-container { position: absolute; left: 0; top: 0; width: 100%; }
                @page { size: A4; margin: 1.5cm; }
              }
              .report-table [contenteditable]:focus {
                background: rgba(201, 168, 76, 0.05);
                outline: none;
                box-shadow: inset 0 0 0 2px rgba(201, 168, 76, 0.2);
              }
              /* Hide scrollbars during capture */
              .no-scrollbar::-webkit-scrollbar { display: none; }
              .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
            
            <div className="print-container">
              {/* Report Header */}
              <div className="flex justify-between items-start border-b-4 border-superior-teal pb-12 mb-12">
                <div className="flex gap-8 items-center">
                  <div className="w-28 h-28 rounded-full bg-white shadow-inner border border-slate-100 flex items-center justify-center overflow-hidden p-0">
                    {data.settings?.logo ? (
                      <img src={data.settings.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="bg-superior-teal w-full h-full flex items-center justify-center text-white rounded-2xl">
                        <School size={56} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-5xl font-display font-black text-superior-teal mb-2 uppercase tracking-tight" style={{ color: data.settings?.themeColor }}>{data.settings?.collegeName || 'Superior College'}</h1>
                    <p className="text-superior-gold font-black tracking-[0.3em] text-base uppercase">{data.settings?.campusName || 'Main Campus'}</p>
                    <div className="mt-6 text-slate-500 text-xs space-y-1.5 font-medium">
                      <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-superior-gold"></span> {data.settings?.address || 'N/A'}</p>
                      <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-superior-gold"></span> Contact: {data.settings?.contactNumber || 'N/A'}</p>
                      <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-superior-gold"></span> Email: {data.settings?.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-superior-teal text-white px-6 py-3 rounded-2xl inline-block mb-6 shadow-lg shadow-superior-teal/20" style={{ backgroundColor: data.settings?.themeColor || '#1e293b' }}>
                    <h2 className="text-2xl font-display font-black uppercase tracking-widest">{selectedReport.title}</h2>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Date Generated</p>
                    <p className="text-slate-700 font-bold text-sm">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="mt-4 space-y-1">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Report ID</p>
                    <p className="text-slate-700 font-mono font-bold text-xs">{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                  </div>
                </div>
              </div>

              <div className="mb-8 flex items-center gap-3 text-slate-400 text-xs italic print:hidden bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-superior-gold/10 flex items-center justify-center text-superior-gold">
                  <Edit3 size={14} />
                </div>
                Tip: You can click on any cell to edit the data before downloading or printing.
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <Table className="report-table">
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 border-y-2 border-slate-100">
                      {selectedReport.columns.map((col: string) => (
                        <TableHead key={col} className="font-black text-slate-800 uppercase text-[11px] tracking-widest py-6 px-4">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReport.data.length > 0 ? (
                      selectedReport.data.map((row: string[], idx: number) => (
                        <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                          {row.map((cell: string, cellIdx: number) => (
                            <TableCell 
                              key={cellIdx} 
                              contentEditable 
                              suppressContentEditableWarning
                              className="py-5 px-4 text-sm text-slate-600 outline-none font-medium"
                            >
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={selectedReport.columns.length} className="text-center py-20 text-slate-400 italic font-medium">
                          No data found matching the selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Report Footer */}
              <div className="mt-24 flex justify-between items-end px-4">
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">Generated By</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <UserCheck size={20} />
                    </div>
                    <p className="text-base font-black text-slate-800 tracking-tight">System Administrator</p>
                  </div>
                </div>
                <div className="text-center space-y-5">
                  <div className="w-64 border-b-2 border-slate-200"></div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.3em]">Authorized Signature</p>
                </div>
              </div>
              
              <div className="mt-16 pt-8 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-[0.4em] font-black">SCJ Management System | Excellence in Execution</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-display font-black text-superior-teal tracking-tight">
              Reports Center
            </h2>
            <span className="text-slate-300 text-2xl">/</span>
            <span className="urdu-text text-2xl text-superior-gold font-medium">رپورٹس سینٹر</span>
          </div>
          {categoryFilter !== 'all' && (
            <Button 
              variant="link" 
              className="p-0 h-auto text-superior-teal font-black text-xs uppercase tracking-widest mt-2" 
              onClick={() => setCategoryFilter('all')}
            >
              ← Show all reports
            </Button>
          )}
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-superior-teal/40" size={20} />
          <Input 
            placeholder="Search reports..." 
            className="pl-12 h-14 rounded-2xl bg-white border-slate-100 shadow-sm focus:border-superior-teal/30 transition-all font-medium" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Executive KPI Analytics Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <TrendingUp className="text-superior-teal" size={22} />
              Executive KPI Overview & Financial Trends
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real-time institutional health metrics, cash flows, and enrollment analytics.
            </p>
          </div>
          <span className="text-xs font-bold text-superior-teal bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 self-start sm:self-auto">
            Live College Intelligence
          </span>
        </div>

        {/* 4 Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Active Students */}
          <Card className="bg-white border-none shadow-lg shadow-slate-100/80 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Students</span>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-superior-teal flex items-center justify-center">
                <Users size={20} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-slate-900">{activeStudents.length}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold text-slate-500">
                <span className="text-teal-700">{boysCount} Boys</span>
                <span>•</span>
                <span className="text-rose-600">{girlsCount} Girls</span>
              </div>
            </div>
          </Card>

          {/* Net Cash Flow */}
          <Card className="bg-white border-none shadow-lg shadow-slate-100/80 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Cash Flow</span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {netCashFlow >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
              </div>
            </div>
            <div className="mt-3">
              <p className={`text-2xl font-black ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                RS {Math.abs(netCashFlow).toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] font-semibold text-slate-500 truncate">
                <span>Inflow: {totalIncomes.toLocaleString()}</span>
                <span>|</span>
                <span>Outflow: {totalExpenses.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Fee Recovery */}
          <Card className="bg-white border-none shadow-lg shadow-slate-100/80 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fee Collection</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <CreditCard size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-slate-900">{feeRecoveryRate}%</p>
                <span className="text-xs font-bold text-amber-700">RS {totalFeeReceived.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(0, feeRecoveryRate))}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Total Expected: RS {totalFeePackage.toLocaleString()}</p>
            </div>
          </Card>

          {/* Monthly Staff Payroll */}
          <Card className="bg-white border-none shadow-lg shadow-slate-100/80 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Payroll</span>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Briefcase size={20} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900">
                RS {totalStaffPayroll.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-500">
                <span>{(data.staff || []).length} Faculty & Staff</span>
                <span>•</span>
                <span className="text-superior-teal">Active</span>
              </div>
            </div>
          </Card>
        </div>

        {/* 2 Recharts Visual Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue vs Expense Trend AreaChart (2 Cols) */}
          <Card className="lg:col-span-2 bg-white border-none shadow-lg shadow-slate-100/80 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-black text-base text-slate-800">Monthly Revenue vs Expense Cash Flow</h4>
                <p className="text-xs text-slate-400 font-medium">6-Month financial trends (Incomes vs Operating Expenses)</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-superior-teal">
                  <span className="w-2.5 h-2.5 rounded-full bg-superior-teal inline-block"></span> Revenue
                </span>
                <span className="flex items-center gap-1.5 text-rose-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Expense
                </span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0b4d45" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0b4d45" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `RS ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: any) => [`RS ${Number(value).toLocaleString()}`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="Revenue" stroke="#0b4d45" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="Expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Program Distribution PieChart (1 Col) */}
          <Card className="bg-white border-none shadow-lg shadow-slate-100/80 rounded-3xl p-6 flex flex-col justify-between">
            <div className="mb-2">
              <h4 className="font-black text-base text-slate-800">Program Distribution</h4>
              <p className="text-xs text-slate-400 font-medium">Active student enrollment share</p>
            </div>
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={programDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {programDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} Students`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-slate-100 text-[11px]">
              {programDistributionData.slice(0, 4).map((entry, idx) => (
                <span key={entry.name} className="flex items-center gap-1 font-semibold text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                  {entry.name}: {entry.value}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Reports Catalog Section Header */}
      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">
          Standard Institutional Reports Catalog
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Select any report below to inspect, customize filters, edit inline, or export in multi-formats (PDF, Excel, CSV, Image).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredReports.map((report, idx) => (
          <ReportCard 
            key={idx}
            title={report.title}
            description={report.description}
            icon={report.icon}
            color={report.color}
            bgColor={report.bgColor}
            iconColor={report.iconColor}
            hoverColor={report.hoverColor}
            onOpen={() => {
              // Reset filters when opening a new report
              setGenderFilter('all');
              setMonthFilter('all');
              setStatusFilter('all');
              setIndividualSearch('');
              
              const initialData = report.getData();
              setSelectedReport({
                ...report,
                data: initialData
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ReportCard({ title, description, icon: Icon, color, bgColor, iconColor, hoverColor, onOpen }: any) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "bg-white rounded-[2.5rem] border border-slate-100 group transition-all duration-500 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-superior-teal/5",
        hoverColor || "hover:bg-slate-50"
      )}>
        <CardHeader className="pb-4 p-10">
          <div className={cn(
            "w-20 h-20 rounded-3xl flex items-center justify-center mb-8 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner",
            bgColor || "bg-slate-100",
            iconColor || "text-slate-600"
          )}>
            <Icon size={40} />
          </div>
          <CardTitle className="text-2xl font-display font-black text-slate-800 group-hover:text-superior-teal transition-colors tracking-tight">{title}</CardTitle>
          <CardDescription className="text-sm font-medium leading-relaxed mt-3 text-slate-500">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 p-10">
          <Button 
            onClick={onOpen}
            className="w-full h-14 rounded-2xl bg-slate-50 text-slate-700 border border-slate-100 font-black uppercase tracking-widest text-xs group-hover:bg-superior-teal group-hover:text-white group-hover:border-superior-teal transition-all duration-300 shadow-sm"
          >
            <FileText size={18} className="mr-2" /> View & Edit Report
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
