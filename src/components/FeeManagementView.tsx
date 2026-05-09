
import React, { useMemo } from 'react';
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
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { Gender } from '../types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';


import { getUnifiedTransactions } from '../utils/fee';
import { useDebounce } from '../hooks/useDebounce';
import { useVirtualizer } from '@tanstack/react-virtual';

export default function FeeManagementView({ data, gender, program }: { data: any, gender?: Gender, program?: string }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [genderFilter, setGenderFilter] = React.useState<string>(gender || 'all');
  const [groupFilter, setGroupFilter] = React.useState('all');
  const [sectionFilter, setSectionFilter] = React.useState('all');
  const [activeTab, setActiveTab] = React.useState('collect');
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState<string>('');
  const [paymentType, setPaymentType] = React.useState<string>('Tuition Fee Installment');
  const [paymentDate, setPaymentDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [collectedByName, setCollectedByName] = React.useState<string>('');
  const [newFeePackage, setNewFeePackage] = React.useState<string>('');
  const [activeRowStudent, setActiveRowStudent] = React.useState<any>(null);
  
  const parentRef = React.useRef<HTMLDivElement>(null);

  // 1. Calculate All Enrolled Students (Boys + Girls)
  const allEnrolled = useMemo(() => {
    let raw = [...(data.students || [])].map((s: any) => {
      // Determine gender from category/group if not explicitly set
      let derivedGender = s.gender;
      if (!derivedGender) {
        const identifier = (`${s.category || ''} ${s.group || ''}`).toLowerCase();
        if (identifier.includes('girl') || identifier.includes('female')) {
          derivedGender = 'Female';
        } else {
          // Default to Male currently in this app
          derivedGender = 'Male';
        }
      }
      return { ...s, gender: derivedGender };
    });
    
    (data.admissions || []).forEach((a: any) => {
      const isEnrolled = a.isAdmitted || a.status === 'Admitted/Confirmed' || (a.feeReceived > 0) || (a.totalPackage > 0);
      const exists = raw.some((s: any) => s.admissionId === a.id || s.id === a.studentId);
      if (isEnrolled && !exists) {
        let derivedGender = a.gender;
        if (!derivedGender) {
          const identifier = (`${a.category || ''} ${a.group || ''}`).toLowerCase();
          if (identifier.includes('girl') || identifier.includes('female')) {
            derivedGender = 'Female';
          } else {
            derivedGender = 'Male';
          }
        }

        raw.push({
          id: a.studentId || a.id,
          fullName: a.fullName,
          fatherName: a.fatherName,
          gender: derivedGender,
          category: a.category || '',
          group: a.group || '',
          section: a.section || '',
          totalPackage: a.totalPackage || 0,
          feeReceived: a.feeReceived || 0,
          status: 'Active',
          feeHistory: a.feeHistory || [],
          feeLedger: a.feeLedger || null
        });
      }
    });

    // Filter by program here so executive stats reflect the current program
    if (program) {
      raw = raw.filter((s: any) => {
        const identifier = (`${s.category || ''} ${s.group || ''}`).toLowerCase();
        if (program === 'fsc') return !identifier.includes('dit') && !identifier.includes('level 3') && !identifier.includes('uk') && !identifier.includes('bs ');
        if (program === 'dit') return identifier.includes('dit');
        if (program === 'ukl3') return identifier.includes('level 3') || identifier.includes('uk');
        if (program === 'bs') return identifier.includes('bs');
        return true;
      });
    }

    return raw;
  }, [data.students, data.admissions, program]);

  const globalStats = useMemo(() => {
    const students = data?.students || [];
    const allBoys = students.filter((s: any) => s.gender === 'Male');
    const allGirls = students.filter((s: any) => s.gender === 'Female');
    const allDIT = students.filter((s: any) => {
      const identifier = (`${s.category || ''} ${s.group || ''}`).toLowerCase();
      return identifier.includes('dit');
    });
    
    return {
      totalStudents: students.length,
      totalReceived: students.reduce((sum: number, s: any) => sum + (s.feeReceived || 0), 0),
      totalExpected: students.reduce((sum: number, s: any) => sum + (s.totalPackage || 0), 0),
      boys: allBoys.length,
      girls: allGirls.length,
      dit: allDIT.length,
    };
  }, [data?.students]);

  const students = useMemo(() => {
    return allEnrolled.filter((s: any) => {
      let matchesGender = true;
      if (genderFilter !== 'all') matchesGender = s.gender === genderFilter;
      return matchesGender;
    });
  }, [allEnrolled, genderFilter]);
  
  const stats = useMemo(() => {
    const totalExpected = students.reduce((sum: number, s: any) => sum + (s.totalPackage || 0), 0);
    const totalReceived = students.reduce((sum: number, s: any) => sum + (s.feeReceived || 0), 0);
    const outstanding = totalExpected - totalReceived;
    const collectionRate = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;

    return {
      totalExpected,
      totalReceived,
      outstanding,
      collectionRate,
      totalStudents: students.length,
      defaulters: students.filter((s: any) => (s.totalPackage - (s.feeReceived || 0)) > 0).length
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
    const [year, month, day] = paymentDate.split('-');
    const payDate = new Date(Number(year), Number(month) - 1, Number(day), currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds());
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    await data.recordFeePayment(selectedStudent.id, {
      id: `pay-${Date.now()}`,
      month: monthNames[payDate.getMonth()],
      year: payDate.getFullYear(),
      amountDue: (selectedStudent.totalPackage || 0) - (selectedStudent.feeReceived || 0),
      amountPaid: amount,
      status: 'Paid',
      datePaid: payDate.toISOString(),
      receiptId: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
      feeType: paymentType,
      collectedBy: collectedByName.trim() || undefined
    });

    setIsPaymentOpen(false);
    setPaymentAmount('');
    setPaymentType('Tuition Fee Installment');
    setCollectedByName('');
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
    setNewFeePackage('');
  };

  const handleExportCSV = () => {
    const exportData = filteredStudents.map((s: any) => ({
      'Student ID': s.id,
      'Name': s.fullName,
      'Father Name': s.fatherName,
      'Program': s.group || s.category,
      'Total Package': s.totalPackage || 0,
      'Received': s.feeReceived || 0,
      'Outstanding': (s.totalPackage || 0) - (s.feeReceived || 0),
      'Status': ((s.totalPackage || 0) - (s.feeReceived || 0)) <= 0 ? 'Clear' : 'Pending'
    }));

    if (exportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `fee_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredStudents.map((s: any) => ({
      'Student ID': s.id,
      'Name': s.fullName,
      'Father Name': s.fatherName,
      'Program': s.group || s.category,
      'Total Package': s.totalPackage || 0,
      'Received': s.feeReceived || 0,
      'Outstanding': (s.totalPackage || 0) - (s.feeReceived || 0),
      'Status': ((s.totalPackage || 0) - (s.feeReceived || 0)) <= 0 ? 'Clear' : 'Pending'
    }));

    if (exportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fees");
    XLSX.writeFile(wb, `fee_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintFeeVouchers = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students carefully selected to print vouchers');
      return;
    }
    const doc = new jsPDF('p', 'pt', 'a4');
    filteredStudents.forEach((student: any, index: number) => {
      if (index > 0) doc.addPage();
      
      doc.setFontSize(20);
      doc.setTextColor(5, 59, 50);
      doc.text(data.settings?.collegeName || 'SUPERIOR GROUP OF COLLEGES', 40, 60);

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('FEE VOUCHER', 40, 90);

      doc.setFontSize(10);
      doc.text(`Student Name: ${student.fullName}`, 40, 130);
      doc.text(`Father Name: ${student.fatherName}`, 40, 150);
      doc.text(`Session: ${student.session || 'N/A'}`, 40, 170);
      doc.text(`Program: ${student.group || student.category || 'N/A'}`, 40, 190);
      doc.text(`Section: ${student.section || 'All'}`, 40, 210);

      doc.text(`Total Package: Rs. ${(student.totalPackage || 0).toLocaleString()}`, 300, 130);
      doc.text(`Received: Rs. ${(student.feeReceived || 0).toLocaleString()}`, 300, 150);
      doc.text(`Outstanding Balance: Rs. ${((student.totalPackage || 0) - (student.feeReceived || 0)).toLocaleString()}`, 300, 170);

      doc.setDrawColor(200, 200, 200);
      doc.line(40, 230, 550, 230);
    });

    doc.save(`Fee_Vouchers_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Fee Vouchers downloaded!");
  };

  const generateReceipt = (student: any, payment: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(data.settings?.collegeName || 'Institutional Receipt', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(data.settings?.address || 'Campus Location', 105, 28, { align: 'center' });
    
    doc.line(20, 35, 190, 35);
    
    // Student Details
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Receipt No: ${payment.receiptId || 'N/A'}`, 20, 45);
    doc.text(`Date: ${new Date(payment.datePaid).toLocaleDateString()}`, 150, 45);
    
    doc.setFont("helvetica", "bold");
    doc.text("STUDENT DETAILS", 20, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`Student Name: ${student.fullName}`, 20, 68);
    doc.text(`Father's Name: ${student.fatherName}`, 20, 76);
    doc.text(`Student ID: ${student.id}`, 20, 84);
    
    // Payment Table
    autoTable(doc, {
      startY: 95,
      head: [['Description', 'Amount']],
      body: [
        [`Fee Installment (${payment.month} ${payment.year})`, `Rs. ${(payment.amountPaid || 0).toLocaleString()}`],
        ['Total Received', `Rs. ${(payment.amountPaid || 0).toLocaleString()}`]
      ],
      headStyles: { fillColor: [16, 185, 129] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Footer Stats
    doc.text(`Total Package: Rs. ${(student.totalPackage || 0).toLocaleString()}`, 20, finalY);
    doc.text(`Fee Received: Rs. ${((student.feeReceived || 0) + (payment.amountPaid || 0)).toLocaleString()}`, 20, finalY + 8);
    doc.text(`Remaining Balance: Rs. ${((student.totalPackage || 0) - ((student.feeReceived || 0) + (payment.amountPaid || 0))).toLocaleString()}`, 20, finalY + 16);
    
    // Time and Collected By
    doc.text(`Recorded Date & Time: ${new Date(payment.datePaid || Date.now()).toLocaleString()}`, 20, finalY + 30);
    // Retrieve recordedBy from the actual ledger if we can, else fallback
    const ledgerTx = student.feeLedger?.transactions?.find((t: any) => t.receiptId === payment.receiptId);
    doc.text(`Collected By / Recorded By: ${payment.collectedBy || ledgerTx?.recordedBy || 'System / Authorized User'}`, 20, finalY + 38);

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Generated by SCJ Management System", 105, 280, { align: 'center' });
    
    doc.save(`${student.fullName}_Receipt_${payment.receiptId}.pdf`);
    toast.success("Receipt downloaded!");
  };

  const generateFeeStatement = (student: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(data.settings?.collegeName || 'Institutional Receipt', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(data.settings?.address || 'Campus Location', 105, 28, { align: 'center' });
    
    doc.line(20, 35, 190, 35);
    
    // Student Details
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Statement Date: ${new Date().toLocaleDateString()}`, 150, 45);
    
    doc.setFont("helvetica", "bold");
    doc.text("FEE STATEMENT / LEDGER", 20, 45);
    doc.text("STUDENT DETAILS", 20, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`Student Name: ${student.fullName}`, 20, 68);
    doc.text(`Father's Name: ${student.fatherName}`, 20, 76);
    doc.text(`Student ID: ${student.id}`, 20, 84);
    
    const unified = getUnifiedTransactions(student);
    const sortedHistory = [...unified].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const body = sortedHistory.map((h: any) => {
      const d = new Date(h.date);
      return [
        `${d.toLocaleDateString()}\n${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
        h.receiptId || 'N/A',
        (h.description || 'Fee Installment') + (h.recordedBy ? `\n(By: ${h.recordedBy})` : ''),
        `Rs. ${(h.amount || 0).toLocaleString()}`
      ];
    });

    // Payment Table
    autoTable(doc, {
      startY: 95,
      head: [['Date', 'Receipt No', 'Description', 'Amount']],
      body: body,
      headStyles: { fillColor: [16, 185, 129] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Footer Stats
    doc.text(`Total Package: Rs. ${(student.totalPackage || 0).toLocaleString()}`, 20, finalY);
    doc.text(`Total Received: Rs. ${(student.feeReceived || 0).toLocaleString()}`, 20, finalY + 8);
    doc.text(`Remaining Balance: Rs. ${((student.totalPackage || 0) - (student.feeReceived || 0)).toLocaleString()}`, 20, finalY + 16);
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Generated by SCJ Management System", 105, 280, { align: 'center' });
    
    doc.save(`${student.fullName}_Fee_Statement.pdf`);
    toast.success("Statement downloaded!");
  };

  const sectionOptions = useMemo(() => {
    return Array.from(new Set(data?.settings?.predefinedSections?.map((s: any) => s.name).filter(Boolean))) as string[];
  }, [data?.settings?.predefinedSections]);

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      const nameMatch = (s.fullName || s.full_name || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      const idMatch = (s.id || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      const fatherMatch = (s.fatherName || s.father_name || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesSearch = nameMatch || idMatch || fatherMatch;
      
      const balance = (s.totalPackage || 0) - (s.feeReceived || 0);
      const received = s.feeReceived || 0;
      
      let effectiveStatus = statusFilter;
      if (activeTab === 'defaulters') effectiveStatus = 'not-paid';
      
      // User Request Filters:
      // - Paid (Full payment)
      // - Pending Installments (Some paid, more to go)
      // - Not Paid at all (received = 0)
      const matchesStatus = 
        effectiveStatus === 'all' ||
        (effectiveStatus === 'paid' && balance <= 0 && received > 0) ||
        (effectiveStatus === 'pending' && balance > 0 && received > 0) ||
        (effectiveStatus === 'not-paid' && received <= 0);

      const matchesGroup = groupFilter === 'all' || (s.group || '').toLowerCase().includes(groupFilter.toLowerCase());
      const matchesSection = sectionFilter === 'all' || (s.section || '').trim().toLowerCase() === sectionFilter.trim().toLowerCase();

      return matchesSearch && matchesStatus && matchesGroup && matchesSection;
    });
  }, [students, debouncedSearch, statusFilter, activeTab, groupFilter, sectionFilter]);

  const rowVirtualizer = useVirtualizer({
    count: filteredStudents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 75,
    overscan: 5,
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Global Billing Audit - Single Line Ticker */}
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex items-center gap-4 overflow-x-auto whitespace-nowrap hide-scrollbar">
        <div className="flex items-center gap-2 text-emerald-700 font-black text-[10px] uppercase tracking-widest shrink-0 bg-emerald-100/50 py-1 px-3 rounded-lg">
          <Clock size={12} /> Global Billing Audit
        </div>
        {students.flatMap((s: any) => getUnifiedTransactions(s).map((h: any) => ({ ...h, studentName: s.fullName, student: s }))).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((pay: any, idx: number) => (
          <div key={idx} className="flex items-center gap-3 text-xs font-bold text-slate-600 shrink-0 border-l border-emerald-200/50 pl-4">
             <CreditCard size={12} className="text-emerald-400" />
             <span className="text-emerald-600 font-black">+Rs. {(pay.amount || 0).toLocaleString()}</span>
             <span>({pay.studentName})</span>
             <button 
                onClick={() => generateReceipt(pay.student, { amountPaid: pay.amount, receiptId: pay.receiptId, datePaid: pay.date, collectedBy: pay.recordedBy, feeType: pay.description })}
                className="text-[9px] font-black uppercase text-slate-400 hover:text-emerald-600 transition-colors bg-white px-2 py-1 rounded shadow-xs"
             >
               Receipt
             </button>
          </div>
        ))}
        {students.flatMap((s: any) => getUnifiedTransactions(s)).length === 0 && (
          <span className="text-xs font-bold text-slate-400">No recent transactions</span>
        )}
      </div>

      {/* Executive Financial Summary & Institutional Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="rounded-2xl border-none shadow-xl shadow-slate-200/50 overflow-hidden relative group bg-gradient-to-br from-white to-slate-50 h-full">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-superior-teal/10 flex items-center justify-center text-superior-teal">
                    <Wallet size={16} />
                  </div>
                  <Badge className="bg-superior-teal/10 text-superior-teal border-none font-black text-[9px] uppercase">Target</Badge>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected Revenue</p>
                  <h3 className="text-lg font-black text-slate-900 leading-none italic">Rs. {stats.totalExpected.toLocaleString()}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="rounded-2xl border-none shadow-xl shadow-slate-200/50 overflow-hidden relative group bg-gradient-to-br from-white to-emerald-50 h-full">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <ArrowUpRight size={16} />
                  </div>
                  <Badge className="bg-emerald-500 text-white border-none font-black text-[9px] uppercase">{stats.collectionRate.toFixed(0)}% Rate</Badge>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Received</p>
                  <h3 className="text-lg font-black text-emerald-600 leading-none italic">Rs. {stats.totalReceived.toLocaleString()}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="rounded-2xl border-none shadow-xl shadow-slate-200/50 overflow-hidden relative group bg-gradient-to-br from-white to-rose-50 h-full">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                    <ArrowDownRight size={16} />
                  </div>
                  <Badge variant="destructive" className="bg-rose-500 text-white border-none font-black text-[9px] uppercase">Arrears</Badge>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
                  <h3 className="text-lg font-black text-rose-600 leading-none italic">Rs. {stats.outstanding.toLocaleString()}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="rounded-2xl border-none shadow-xl shadow-slate-200/50 overflow-hidden relative group bg-gradient-to-br from-white to-superior-gold/5 h-full">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-superior-gold/10 flex items-center justify-center text-superior-gold">
                    <Users size={16} />
                  </div>
                  <Badge className="bg-superior-gold text-white border-none font-black text-[9px] uppercase">{stats.defaulters} Defaulters</Badge>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Strength</p>
                  <h3 className="text-lg font-black text-superior-teal leading-none italic">{stats.totalStudents} Students</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display font-black text-superior-teal tracking-tight flex items-center gap-3 italic">
            <CreditCard size={32} className="text-superior-gold" />
            Fee Module
          </h2>
          <p className="text-slate-500 mt-1 font-bold tracking-tight">Student Ledger Control & Transaction Verification</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {activeRowStudent && (
            <>
              <Button onClick={() => generateFeeStatement(activeRowStudent)} variant="outline" className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-emerald-100 transition-all">
                <Download size={16} className="mr-2" /> Fee Statement
              </Button>
              {(getUnifiedTransactions(activeRowStudent) && getUnifiedTransactions(activeRowStudent).length > 0) && (
                <Button 
                  onClick={() => {
                    generateReceipt(activeRowStudent, getUnifiedTransactions(activeRowStudent)[0]);
                  }}
                  variant="outline" 
                  className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-emerald-100 transition-all"
                >
                  <Download size={16} className="mr-2" /> Latest Receipt
                </Button>
              )}
            </>
          )}
          <Button onClick={handleExportCSV} variant="outline" className="rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-slate-50 transition-all">
            <Download size={16} className="mr-2 text-superior-gold" /> Export CSV
          </Button>
          <Button onClick={handlePrintFeeVouchers} variant="outline" className="rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-red-50 hover:text-red-600 transition-all">
            <Download size={16} className="mr-2 text-red-500" /> Print Vouchers
          </Button>
          <Button onClick={handleExportExcel} variant="outline" className="rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-slate-50 transition-all">
            <Download size={16} className="mr-2 text-emerald-600" /> Export Excel
          </Button>
          <Button onClick={() => { setSelectedStudent(null); setPaymentAmount(''); setIsPaymentOpen(true); }} className="h-12 px-8 rounded-xl bg-superior-teal text-white font-black uppercase tracking-widest text-[10px] hover:bg-superior-teal/90 transition-all shadow-xl shadow-superior-teal/10 flex items-center justify-center">
            <Plus size={18} className="mr-2" /> Add New Fee
          </Button>
        </div>
      </div>



      {/* Tab Navigation Area */}
      <div className="flex border-b border-slate-200 hide-scrollbar overflow-x-auto w-full mb-6">
        {['collect', 'defaulters'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 px-8 font-black text-[11px] uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${activeTab === tab ? 'border-superior-teal text-superior-teal' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {tab === 'collect' && 'Collect Fee'}
            {tab === 'defaulters' && 'Defaulters'}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <CardTitle className="text-xl font-display font-black text-slate-800 uppercase tracking-tight italic">
                    {activeTab === 'collect' && 'Collect Fee Hub'}
                    {activeTab === 'defaulters' && 'Defaulters List'}
                  </CardTitle>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Real-time Individual Transaction Access</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Select value={sectionFilter} onValueChange={setSectionFilter}>
                    <SelectTrigger className="w-28 rounded-xl border-slate-100 h-10 font-bold text-xs uppercase tracking-tighter">
                      <SelectValue placeholder="Section" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="all" className="font-bold text-xs">All Sections</SelectItem>
                      {sectionOptions.map(sec => (
                        <SelectItem key={sec} value={sec} className="font-bold text-xs">{sec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger className="w-28 rounded-xl border-slate-100 h-10 font-bold text-xs uppercase tracking-tighter">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="all" className="font-bold text-xs">All Genders</SelectItem>
                      <SelectItem value="Male" className="font-bold text-xs">Boys Only</SelectItem>
                      <SelectItem value="Female" className="font-bold text-xs">Girls Only</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger className="w-28 rounded-xl border-slate-100 h-10 font-bold text-xs uppercase tracking-tighter">
                      <SelectValue placeholder="Group" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="all" className="font-bold text-xs">All Groups</SelectItem>
                      <SelectItem value="DIT" className="font-bold text-xs">DIT</SelectItem>
                      <SelectItem value="Pre-Medical" className="font-bold text-xs">Pre-Medical</SelectItem>
                      <SelectItem value="Pre-Engineering" className="font-bold text-xs">Pre-Engineering</SelectItem>
                      <SelectItem value="ICS" className="font-bold text-xs">ICS</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative flex-1 md:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
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
            <CardContent className="p-0">
                <div ref={parentRef} className="max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm border-b border-slate-100">
                      <TableRow className="border-none">
                        <TableHead className="font-black text-[10px] uppercase tracking-widest pl-8 h-12">Student Profile</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest h-12">Total Package</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest h-12">Total Received</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest h-12">Current Balance</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest h-12">Progress</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-right pr-8 h-12">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {rowVirtualizer.getVirtualItems().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-300">
                            <AlertCircle size={48} className="mb-4 opacity-10" />
                            <p className="text-sm font-black uppercase tracking-widest">No Billing Records Found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {rowVirtualizer.getVirtualItems()[0]?.start > 0 && (
                          <TableRow style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}>
                            <TableCell colSpan={6} className="p-0 border-0" />
                          </TableRow>
                        )}
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                          const student = filteredStudents[virtualRow.index];
                          const balance = (student.totalPackage || 0) - (student.feeReceived || 0);
                          const progress = student.totalPackage > 0 ? (student.feeReceived / student.totalPackage) * 100 : 0;
                          
                          return (
                            <TableRow 
                              key={student.id} 
                              onClick={() => setActiveRowStudent(student)}
                              className={cn(
                                "group hover:bg-emerald-50/40 transition-colors border-slate-100 cursor-pointer h-[75px]",
                                activeRowStudent?.id === student.id ? "bg-emerald-50/60 border-emerald-200" : ""
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
                                        onError={(e) => {
                                           const target = e.target as HTMLImageElement;
                                           target.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      student.fullName.charAt(0)
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-700 leading-none mb-1 group-hover:text-superior-teal transition-colors italic">{student.fullName}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{student.id}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-black text-slate-600 text-[13px]">Rs. {student.totalPackage?.toLocaleString()}</TableCell>
                              <TableCell className="font-black text-emerald-600 text-[13px]">Rs. {student.feeReceived?.toLocaleString()}</TableCell>
                              <TableCell className={cn("font-black text-[13px]", balance > 0 ? "text-rose-600" : "text-emerald-600")}>
                                Rs. {balance.toLocaleString()}
                              </TableCell>
                              <TableCell className="w-32">
                                <div className="space-y-1.5">
                                  <Progress value={progress} className="h-1.5 bg-slate-100" />
                                  <p className="text-[9px] font-black text-slate-400 text-right uppercase">{progress.toFixed(0)}% Completion</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-8">
                                <DropdownMenu>
                                  <DropdownMenuTrigger className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-sm flex items-center justify-center text-slate-400 outline-none transition-all group-hover:text-slate-600">
                                    <MoreHorizontal className="h-5 w-5" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 p-2 shadow-2xl w-56">
                                    <DropdownMenuItem 
                                      onClick={() => { setSelectedStudent(student); setIsPaymentOpen(true); }}
                                      className="gap-3 p-3 rounded-xl font-black text-xs text-emerald-600 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 uppercase tracking-widest italic"
                                    >
                                      <CreditCard size={14} /> Record Payment
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => { setSelectedStudent(student); setIsUpdateOpen(true); }}
                                      className="gap-3 p-3 rounded-xl font-black text-xs text-superior-teal cursor-pointer hover:bg-superior-teal/5 focus:bg-superior-teal/5 uppercase tracking-widest italic"
                                    >
                                      <Plus size={14} /> Update Fee Package
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => { setSelectedStudent(student); setIsHistoryOpen(true); }}
                                      className="gap-3 p-3 rounded-xl font-black text-xs text-slate-700 cursor-pointer hover:bg-slate-50 focus:bg-slate-50 uppercase tracking-widest italic"
                                    >
                                      <Clock size={14} /> Payment History
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={(e) => { e.stopPropagation(); generateFeeStatement(student); }}
                                      className="gap-3 p-3 rounded-xl font-black text-xs text-emerald-600 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 uppercase tracking-widest italic"
                                    >
                                      <Download size={14} /> Download Fee Statement
                                    </DropdownMenuItem>
                                    {(getUnifiedTransactions(student) && getUnifiedTransactions(student).length > 0) && (
                                      <DropdownMenuItem 
                                        onClick={(e) => { 
                                          e.stopPropagation();
                                          generateReceipt(student, getUnifiedTransactions(student)[0]);
                                        }}
                                        className="gap-3 p-3 rounded-xl font-black text-xs text-emerald-600 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 uppercase tracking-widest italic"
                                      >
                                        <Download size={14} /> Download Latest Receipt
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {rowVirtualizer.getVirtualItems().length > 0 && (
                          <TableRow style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }}>
                            <TableCell colSpan={6} className="p-0 border-0" />
                          </TableRow>
                        )}
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
            <DialogTitle className="text-2xl font-serif font-black text-slate-800 italic">Record Fee Payment</DialogTitle>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedStudent ? `For: ${selectedStudent.fullName}` : 'New Fee Record'}</p>
          </DialogHeader>
          <div className="space-y-6 py-4 overflow-visible">
            {!selectedStudent && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Select Student</Label>
                <Select onValueChange={(val) => {
                  const student = filteredStudents.find((s: any) => s.id === val);
                  setSelectedStudent(student);
                }}>
                  <SelectTrigger className="rounded-2xl h-14 border-slate-100 font-bold bg-slate-50 relative z-50">
                    <SelectValue placeholder="Search or select student..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-60 z-50">
                    {filteredStudents.map((s: any) => (
                      <SelectItem key={s.id} value={s.id} className="py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{s.fullName}</span>
                          <span className="text-[10px] text-slate-400 tracking-widest">{s.id} - ({((s.totalPackage || 0) - (s.feeReceived || 0)).toLocaleString()}) </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Payment Date</Label>
                <Input 
                  type="date"
                  className="rounded-xl h-12 font-bold border-slate-100"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={!selectedStudent}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fee Type / Item</Label>
                <Select disabled={!selectedStudent} value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger className="rounded-xl h-12 font-bold border-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admission Fee">Admission Fee</SelectItem>
                    <SelectItem value="Tuition Fee Installment">Tuition Installment</SelectItem>
                    <SelectItem value="Semester Fee Installment">Semester Fee</SelectItem>
                    <SelectItem value="Semester Balance">Previous Semester Balance</SelectItem>
                    <SelectItem value="Miscellaneous Funds">Miscellaneous</SelectItem>
                    <SelectItem value="Exam / Test Series Fee">Exam / Test Series Fee</SelectItem>
                    <SelectItem value="Registration Fee">Registration Fee</SelectItem>
                    <SelectItem value="Fine / Penalty">Fine / Penalty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Amount To Receive (Rs.)</Label>
              <Input 
                type="number" 
                placeholder="Enter amount..." 
                className="rounded-2xl h-14 text-xl font-black italic pl-6 border-slate-100 focus:border-emerald-500 focus:shadow-emerald-500/10 transition-all"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={!selectedStudent}
              />
              {selectedStudent && (
                <p className="text-[10px] font-bold text-rose-500 italic uppercase">Current Balance: Rs. {((selectedStudent?.totalPackage || 0) - (selectedStudent?.feeReceived || 0)).toLocaleString()}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Collected By (Optional)</Label>
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
            <Button variant="ghost" onClick={() => setIsPaymentOpen(false)} className="rounded-xl font-black uppercase text-[10px]">Cancel</Button>
            <Button disabled={!selectedStudent} onClick={handlePayment} className="bg-emerald-500 hover:bg-emerald-600 focus:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-black uppercase text-[10px] px-8 h-12 shadow-lg shadow-emerald-500/20">Confirm & Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Fee Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent className="rounded-[2.5rem] border-slate-100 shadow-2xl max-w-md p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-black text-slate-800 italic">Update Fee Structure</DialogTitle>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current: Rs. {selectedStudent?.totalPackage?.toLocaleString()}</p>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">New Total Fee Package (Rs.)</Label>
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
            <Button variant="ghost" onClick={() => setIsUpdateOpen(false)} className="rounded-xl font-black uppercase text-[10px]">Close</Button>
            <Button onClick={handleUpdatePackage} className="bg-superior-teal hover:bg-superior-teal/90 text-white rounded-xl font-black uppercase text-[10px] px-8 h-12 shadow-lg shadow-superior-teal/20">Update Ledger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="rounded-[2.5rem] border-slate-100 shadow-2xl max-w-2xl p-8 max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-black text-slate-800 italic">Student Payment History</DialogTitle>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedStudent?.fullName} ({selectedStudent?.id})</p>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-6">
            <div className="space-y-4">
              {getUnifiedTransactions(selectedStudent).map((h: any, idx: number) => (
                <div key={idx} className="bg-slate-50 rounded-2xl p-6 flex items-center justify-between border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-slate-100 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <p className="text-lg font-black italic text-slate-800 leading-none mb-1">
                        Rs. {h.amount?.toLocaleString()} 
                        <span className="text-[10px] font-bold text-superior-teal ml-2 uppercase not-italic tracking-widest bg-superior-teal/10 px-2 py-0.5 rounded-md">{h.description || 'Tuition Fee Installment'}</span>
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        {new Date(h.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} • {h.receiptId}
                        {h.recordedBy && <><br/><span className="text-slate-500 opacity-80">Rcvd By: {h.recordedBy}</span></>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={() => generateReceipt(selectedStudent, { amountPaid: h.amount, receiptId: h.receiptId, datePaid: h.date, collectedBy: h.recordedBy, feeType: h.description })}
                      variant="outline" 
                      className="rounded-xl border-slate-200 h-10 font-black text-[10px] uppercase tracking-widest"
                    >
                      <Download size={14} className="mr-2" /> PDF
                    </Button>
                    <Button 
                      onClick={() => {
                        const msg = `SCJ Receipt: Received Rs. ${h.amount} from ${selectedStudent.fullName} on ${new Date(h.date).toLocaleDateString()}. Balance: Rs. ${selectedStudent.feeLedger?.remainingBalance || (selectedStudent.totalPackage - (selectedStudent.feeReceived || 0))}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
                      }}
                      className="bg-[#25D366] hover:bg-[#25D366]/90 text-white rounded-xl h-10 font-black text-[10px] uppercase tracking-widest"
                    >
                       Share
                    </Button>
                  </div>
                </div>
              ))}
              {getUnifiedTransactions(selectedStudent).length === 0 && (
                <div className="text-center py-12 opacity-30">
                  <Clock size={48} className="mx-auto mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">No Payment Tracks Found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
