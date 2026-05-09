import * as React from 'react';
import { useState, useRef } from 'react';
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
  School
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
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useReactToPrint } from 'react-to-print';

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
      
      const dataUrl = await toPng(reportRef.current, { 
        cacheBust: true, 
        backgroundColor: '#ffffff',
        includeQueryParams: true,
        style: {
          overflow: 'visible',
          height: 'auto',
          margin: "0",
          padding: "0"
        }
      });
      
      reportRef.current.style.cssText = originalStyle;
      
      const link = document.createElement('a');
      link.download = `${selectedReport.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
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
        return data.students
          .filter((s: any) => genderFilter === 'all' || s.gender === genderFilter)
          .filter((s: any) => !individualSearch || s.fullName.toLowerCase().includes(individualSearch.toLowerCase()) || s.id.toLowerCase().includes(individualSearch.toLowerCase()))
          .map((s: any) => [
            s.id, 
            s.fullName, 
            s.fatherName, 
            s.gender, 
            `${s.attendance.present}/${s.attendance.present + s.attendance.absent}`,
            s.notes?.map((n: any) => `[${n.type}] ${n.content}`).join('; ') || 'No notes'
          ]);
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
        data.students
          .filter((s: any) => genderFilter === 'all' || s.gender === genderFilter)
          .filter((s: any) => !individualSearch || s.fullName.toLowerCase().includes(individualSearch.toLowerCase()) || s.id.toLowerCase().includes(individualSearch.toLowerCase()))
          .forEach((s: any) => {
            s.feeHistory
              .filter((f: any) => monthFilter === 'all' || f.month === monthFilter)
              .filter((f: any) => statusFilter === 'all' || f.status === statusFilter)
              .forEach((f: any) => {
                feeData.push([s.id, s.fullName, f.month, f.year, `Rs. ${f.amountPaid}`, f.status]);
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
        return data.staff
          .filter((s: any) => !individualSearch || s.fullName.toLowerCase().includes(individualSearch.toLowerCase()) || s.id.toLowerCase().includes(individualSearch.toLowerCase()))
          .map((s: any) => [
            s.id, 
            s.fullName, 
            s.role, 
            s.contact, 
            s.joinDate,
            s.notes?.map((n: any) => `[${n.type}] ${n.content}`).join('; ') || 'No notes'
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
        const activeStudentIds = new Set(data.students.map((s: any) => s.id));
        const activeAdmissionIdsForStudents = new Set(data.students.map((s: any) => s.admissionId).filter(Boolean));
        const activeStudentNames = new Set(data.students.map((s: any) => s.fullName?.toLowerCase().trim()).filter(Boolean));

        const validAdmissionsForIncome = data.admissions.filter((a: any) => {
          if (activeAdmissionIdsForStudents.has(a.id)) return true;
          if (a.studentId && !activeStudentIds.has(a.studentId)) return false;
          return !a.studentId;
        });

        const activeIds = new Set([
            ...activeStudentIds,
            ...validAdmissionsForIncome.map((a: any) => a.id)
        ]);
        const activeNames = new Set([
            ...activeStudentNames,
            ...validAdmissionsForIncome.map((a: any) => a.fullName?.toLowerCase().trim()).filter(Boolean)
        ]);
        const activeIncomes = data.incomes;

        const financialData: any[] = [];
        activeIncomes
          .filter((i: any) => monthFilter === 'all' || i.month === monthFilter)
          .filter((i: any) => {
             let matchesDate = true;
             if (startDateFilter) matchesDate = matchesDate && new Date(i.date) >= new Date(startDateFilter);
             if (endDateFilter) matchesDate = matchesDate && new Date(i.date) <= new Date(endDateFilter);
             return matchesDate;
          })
          .forEach((i: any) => {
            financialData.push([i.date, "Income", i.feeType, `Rs. ${i.amount}`, i.status]);
          });

        // Add additional admission fees not in ledgers
        validAdmissionsForIncome.forEach((a: any) => {
           const studentIncomesTotal = activeIncomes
              .filter((inc: any) => inc.studentId === a.studentId || (inc.studentName === a.fullName))
              .reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);
           
           const excess = Math.max(0, Number(a.feeReceived) - studentIncomesTotal);
           if (excess > 0) {
             const admMonth = months[new Date(a.date).getMonth()] || 'N/A';
             let matchesDate = true;
             if (startDateFilter) matchesDate = matchesDate && new Date(a.date) >= new Date(startDateFilter);
             if (endDateFilter) matchesDate = matchesDate && new Date(a.date) <= new Date(endDateFilter);
             
             if ((monthFilter === 'all' || admMonth === monthFilter) && matchesDate) {
                financialData.push([a.date, "Income (Adm)", "Admission Fee", `Rs. ${excess}`, "Received"]);
             }
           }
        });

        data.expenses
          .filter((e: any) => monthFilter === 'all' || months[new Date(e.date).getMonth()] === monthFilter)
          .filter((e: any) => {
             let matchesDate = true;
             if (startDateFilter) matchesDate = matchesDate && new Date(e.date) >= new Date(startDateFilter);
             if (endDateFilter) matchesDate = matchesDate && new Date(e.date) <= new Date(endDateFilter);
             return matchesDate;
          })
          .forEach((e: any) => {
            financialData.push([e.date, "Expense", e.category, `Rs. ${e.amount}`, "Paid"]);
          });
        return financialData.sort((a: any, b: any) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
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
        return data.admissions
          .filter((a: any) => genderFilter === 'all' || a.gender === genderFilter)
          .filter((a: any) => monthFilter === 'all' || months[new Date(a.date).getMonth()] === monthFilter)
          .filter((a: any) => statusFilter === 'all' || a.status === statusFilter)
          .filter((a: any) => {
             let matchesDate = true;
             if (startDateFilter) matchesDate = matchesDate && new Date(a.date) >= new Date(startDateFilter);
             if (endDateFilter) matchesDate = matchesDate && new Date(a.date) <= new Date(endDateFilter);
             return matchesDate;
          })
          .map((a: any) => [a.id, a.fullName, a.fatherName, a.status, a.date]);
      }
    },
  ];

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
