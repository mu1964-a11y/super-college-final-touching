
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
  Filter,
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

import { useDebounce } from '../hooks/useDebounce';
import { useVirtualizer } from '@tanstack/react-virtual';

export default function FeeManagementView({ data, gender, program }: { data: any, gender?: Gender, program?: string }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = React.useState('all');
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
          totalPackage: a.totalPackage || 0,
          feeReceived: a.feeReceived || 0,
          status: 'Active',
          feeHistory: a.feeHistory || []
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

  // 2. Executive Summary Stats (Combined)
  const executiveStats = useMemo(() => {
    const totalExpected = allEnrolled.reduce((sum: number, s: any) => sum + (s.totalPackage || 0), 0);
    const totalReceived = allEnrolled.reduce((sum: number, s: any) => sum + (s.feeReceived || 0), 0);
    const boysFiltered = allEnrolled.filter((s: any) => s.gender === 'Male');
    const girlsFiltered = allEnrolled.filter((s: any) => s.gender === 'Female');
    const boysExpected = boysFiltered.reduce((sum: number, s: any) => sum + (s.totalPackage || 0), 0);
    const boysReceived = boysFiltered.reduce((sum: number, s: any) => sum + (s.feeReceived || 0), 0);
    const girlsExpected = girlsFiltered.reduce((sum: number, s: any) => sum + (s.totalPackage || 0), 0);
    const girlsReceived = girlsFiltered.reduce((sum: number, s: any) => sum + (s.feeReceived || 0), 0);

    return {
      totalExpected,
      totalReceived,
      boys: { expected: boysExpected, received: boysReceived, count: boysFiltered.length },
      girls: { expected: girlsExpected, received: girlsReceived, count: girlsFiltered.length },
      collectionRate: totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0
    };
  }, [allEnrolled]);

  const students = useMemo(() => {
    return allEnrolled.filter((s: any) => {
      let matchesGender = true;
      if (gender) matchesGender = s.gender === gender;
      return matchesGender;
    });
  }, [allEnrolled, gender]);
  
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

    const payDate = new Date(paymentDate);
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
        [`Fee Installment (${payment.month} ${payment.year})`, `Rs. ${payment.amountPaid.toLocaleString()}`],
        ['Total Received', `Rs. ${payment.amountPaid.toLocaleString()}`]
      ],
      headStyles: { fillColor: [16, 185, 129] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Footer Stats
    doc.text(`Total Package: Rs. ${student.totalPackage.toLocaleString()}`, 20, finalY);
    doc.text(`Fee Received: Rs. ${(student.feeReceived + payment.amountPaid).toLocaleString()}`, 20, finalY + 8);
    doc.text(`Remaining Balance: Rs. ${(student.totalPackage - (student.feeReceived + payment.amountPaid)).toLocaleString()}`, 20, finalY + 16);
    
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
    
    const sortedHistory = [...(student.feeHistory || [])].sort((a: any, b: any) => new Date(a.datePaid).getTime() - new Date(b.datePaid).getTime());
    const body = sortedHistory.map((h: any) => [
      new Date(h.datePaid).toLocaleDateString(),
      h.receiptId || 'N/A',
      (h.feeType || `Installment (${h.month} ${h.year})`) + (h.collectedBy ? `\n(By: ${h.collectedBy})` : ''),
      `Rs. ${h.amountPaid.toLocaleString()}`
    ]);

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

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      const nameMatch = (s.fullName || s.full_name || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      const idMatch = (s.id || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      const fatherMatch = (s.fatherName || s.father_name || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesSearch = nameMatch || idMatch || fatherMatch;
      
      const balance = (s.totalPackage || 0) - (s.feeReceived || 0);
      const received = s.feeReceived || 0;
      
      // User Request Filters:
      // - Paid (Full payment)
      // - Pending Installments (Some paid, more to go)
      // - Not Paid at all (received = 0)
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'paid' && balance <= 0 && received > 0) ||
        (statusFilter === 'pending' && balance > 0 && received > 0) ||
        (statusFilter === 'not-paid' && received <= 0);

      return matchesSearch && matchesStatus;
    });
  }, [students, debouncedSearch, statusFilter]);

  const rowVirtualizer = useVirtualizer({
    count: filteredStudents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 75,
    overscan: 5,
  });

  const programLabel = useMemo(() => {
    if (program === 'ukl3') return 'UK Level 3';
    if (program === 'dit') return 'DIT Program';
    if (program === 'bs') return 'BS Program';
    return 'FSC';
  }, [program]);

  return (
    <div className="space-y-8 pb-10">
      {/* Executive Financial Summary */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-superior-gold/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-superior-gold mb-2 italic">Institutional Treasury Control</h2>
            <h1 className="text-4xl font-serif font-black tracking-tight">{programLabel !== 'FSC' ? `${programLabel} ` : ''}Executive Financial Summary</h1>
          </div>
          <div className="flex bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 gap-8">
            <div className="text-center">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 font-sans">Combined Revenue</p>
              <h4 className="text-2xl font-black text-white">Rs. {executiveStats.totalReceived.toLocaleString()}</h4>
            </div>
            <Separator orientation="vertical" className="bg-white/10 h-10 self-center" />
            <div className="text-center">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 font-sans">Collection Rate</p>
              <h4 className="text-2xl font-black text-emerald-400">{executiveStats.collectionRate.toFixed(1)}%</h4>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Users size={16} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-white/80">{programLabel === 'FSC' ? 'Boys Section' : `${programLabel} Boys`} <span className="text-white/40 ml-2">({executiveStats.boys.count} Students)</span></span>
            </div>
            <div className="text-right">
              <p className="text-lg font-black italic">Rs. {executiveStats.boys.received.toLocaleString()}</p>
              <p className="text-[9px] text-white/30 uppercase font-bold">Of Rs. {executiveStats.boys.expected.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
                <Users size={16} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-white/80">{programLabel === 'FSC' ? 'Girls Section' : `${programLabel} Girls`} <span className="text-white/40 ml-2">({executiveStats.girls.count} Students)</span></span>
            </div>
            <div className="text-right">
              <p className="text-lg font-black italic">Rs. {executiveStats.girls.received.toLocaleString()}</p>
              <p className="text-[9px] text-white/30 uppercase font-bold">Of Rs. {executiveStats.girls.expected.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display font-black text-superior-teal tracking-tight flex items-center gap-3 italic">
            <CreditCard size={32} className="text-superior-gold" />
            {programLabel === 'FSC' ? (gender === 'Male' ? 'Boys Fee Management' : 'Girls Fee Management') : `${programLabel} Fee Management`}
          </h2>
          <p className="text-slate-500 mt-1 font-bold tracking-tight">Student Ledger Control & Transaction Verification</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {activeRowStudent && (
            <>
              <Button onClick={() => generateFeeStatement(activeRowStudent)} variant="outline" className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-emerald-100 transition-all">
                <Download size={16} className="mr-2" /> Fee Statement
              </Button>
              {(activeRowStudent.feeHistory && activeRowStudent.feeHistory.length > 0) && (
                <Button 
                  onClick={() => {
                    const sorted = [...activeRowStudent.feeHistory].sort((a: any, b: any) => new Date(b.datePaid).getTime() - new Date(a.datePaid).getTime());
                    generateReceipt(activeRowStudent, sorted[0]);
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
          <Button onClick={handleExportExcel} variant="outline" className="rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-slate-50 transition-all">
            <Download size={16} className="mr-2 text-emerald-600" /> Export Excel
          </Button>
          <Button onClick={() => { setSelectedStudent(null); setPaymentAmount(''); setIsPaymentOpen(true); }} className="h-12 px-8 rounded-xl bg-superior-teal text-white font-black uppercase tracking-widest text-[10px] hover:bg-superior-teal/90 transition-all shadow-xl shadow-superior-teal/10 flex items-center justify-center">
            <Plus size={18} className="mr-2" /> Add New Fee
          </Button>
        </div>
      </div>

      {/* Institutional Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden relative group bg-gradient-to-br from-white to-slate-50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-superior-teal/5 rounded-bl-[4rem] group-hover:scale-110 transition-transform" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-superior-teal/10 flex items-center justify-center text-superior-teal shadow-inner">
                  <Wallet size={24} />
                </div>
                <Badge className="bg-superior-teal/10 text-superior-teal border-none font-black text-[10px] uppercase">Target</Badge>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected Revenue</p>
              <h3 className="text-2xl font-black text-slate-900 leading-none italic">Rs. {stats.totalExpected.toLocaleString()}</h3>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden relative group bg-gradient-to-br from-white to-emerald-50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-[4rem] group-hover:scale-110 transition-transform" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner">
                  <ArrowUpRight size={24} />
                </div>
                <Badge className="bg-emerald-500 text-white border-none font-black text-[10px] uppercase">{stats.collectionRate.toFixed(0)}% Rate</Badge>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Received</p>
              <h3 className="text-2xl font-black text-emerald-600 leading-none italic">Rs. {stats.totalReceived.toLocaleString()}</h3>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden relative group bg-gradient-to-br from-white to-rose-50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-[4rem] group-hover:scale-110 transition-transform" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 shadow-inner">
                  <ArrowDownRight size={24} />
                </div>
                <Badge variant="destructive" className="bg-rose-500 text-white border-none font-black text-[10px] uppercase">Arrears</Badge>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
              <h3 className="text-2xl font-black text-rose-600 leading-none italic">Rs. {stats.outstanding.toLocaleString()}</h3>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden relative group bg-gradient-to-br from-white to-superior-gold/5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-superior-gold/5 rounded-bl-[4rem] group-hover:scale-110 transition-transform" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-superior-gold/10 flex items-center justify-center text-superior-gold shadow-inner">
                  <Users size={24} />
                </div>
                <Badge className="bg-superior-gold text-white border-none font-black text-[10px] uppercase">{stats.defaulters} Defaulters</Badge>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Strength</p>
              <h3 className="text-2xl font-black text-superior-teal leading-none italic">{stats.totalStudents} Students</h3>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <CardTitle className="text-xl font-display font-black text-slate-800 uppercase tracking-tight italic">Enrollment Billing Hub</CardTitle>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Real-time Individual Transaction Access</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <Input 
                      placeholder="Search name or ID..." 
                      className="pl-10 rounded-xl bg-white border-slate-100 italic focus:border-superior-teal/30 focus:shadow-md transition-all h-10 text-xs font-bold" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 rounded-xl border-slate-100 h-10 font-bold text-xs uppercase tracking-tighter">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="all" className="font-bold text-xs">All Status</SelectItem>
                      <SelectItem value="paid" className="font-bold text-xs">Full Paid</SelectItem>
                      <SelectItem value="pending" className="font-bold text-xs">Pending Installments</SelectItem>
                      <SelectItem value="not-paid" className="font-bold text-xs">Not Paid Yet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div ref={parentRef} className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader className="bg-slate-50/30 sticky top-0 z-10 shadow-sm border-b border-slate-100">
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
                                <div>
                                  <p className="font-black text-slate-700 leading-none mb-1 group-hover:text-superior-teal transition-colors italic">{student.fullName}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{student.id}</p>
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
                                    {(student.feeHistory && student.feeHistory.length > 0) && (
                                      <DropdownMenuItem 
                                        onClick={(e) => { 
                                          e.stopPropagation();
                                          const sorted = [...student.feeHistory].sort((a: any, b: any) => new Date(b.datePaid).getTime() - new Date(a.datePaid).getTime());
                                          generateReceipt(student, sorted[0]);
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

        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden group">
            <CardHeader className="bg-emerald-500/5 border-b border-emerald-500/10 p-6">
              <CardTitle className="text-lg font-black text-emerald-700 flex items-center gap-2 uppercase tracking-widest text-[11px] italic">
                <Clock size={18} /> Global Billing Audit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {students.slice(0, 10).flatMap((s: any) => (s.feeHistory || []).map((h: any) => ({ ...h, studentName: s.fullName, student: s }))).sort((a: any, b: any) => new Date(b.datePaid).getTime() - new Date(a.datePaid).getTime()).slice(0, 8).map((pay: any, idx: number) => (
                  <div key={idx} className="flex gap-4 group/item">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600 transition-all group-hover/item:bg-emerald-500 group-hover/item:text-white group-hover/item:scale-110">
                      <CreditCard size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-[13px] font-black text-slate-800 truncate italic">Rs. {pay.amountPaid?.toLocaleString()}</p>
                        <span className="text-[8px] font-black text-slate-300 uppercase shrink-0">{new Date(pay.datePaid).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold truncate tracking-tight">{pay.studentName}</p>
                      <button 
                         onClick={() => generateReceipt(pay.student, pay)}
                         className="text-[8px] font-black text-emerald-500 uppercase tracking-widest hover:underline mt-1"
                      >
                        Download PDF Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] bg-superior-teal text-white border-none shadow-2xl shadow-superior-teal/40 overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <CardContent className="p-8 relative z-10 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-superior-gold mb-6 backdrop-blur-sm border border-white/10 group-hover:rotate-12 transition-transform">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-xl font-display font-black leading-tight italic">Enrollment Linked To Financial Fulfillment</h3>
              <p className="text-sm text-white/70 font-bold leading-relaxed tracking-tight">
                Instantly track payments and generate institutional receipts. Transparency drives institutional trust.
              </p>
              <Separator className="bg-white/10" />
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-superior-gold">Direct Ledger Access:</span>
                <span className="text-lg font-black italic">{stats.totalStudents} Active</span>
              </div>
            </CardContent>
          </Card>
        </div>
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
              {(selectedStudent?.feeHistory || []).sort((a: any, b: any) => new Date(b.datePaid).getTime() - new Date(a.datePaid).getTime()).map((h: any, idx: number) => (
                <div key={idx} className="bg-slate-50 rounded-2xl p-6 flex items-center justify-between border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-slate-100 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <p className="text-lg font-black italic text-slate-800 leading-none mb-1">
                        Rs. {h.amountPaid?.toLocaleString()} 
                        <span className="text-[10px] font-bold text-superior-teal ml-2 uppercase not-italic tracking-widest bg-superior-teal/10 px-2 py-0.5 rounded-md">{h.feeType || 'Tuition Fee Installment'}</span>
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        {new Date(h.datePaid).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} • {h.receiptId}
                        {h.collectedBy && <><br/><span className="text-slate-500 opacity-80">Rcvd By: {h.collectedBy}</span></>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={() => generateReceipt(selectedStudent, h)}
                      variant="outline" 
                      className="rounded-xl border-slate-200 h-10 font-black text-[10px] uppercase tracking-widest"
                    >
                      <Download size={14} className="mr-2" /> PDF
                    </Button>
                    <Button 
                      onClick={() => {
                        const msg = `SCJ Receipt: Received Rs. ${h.amountPaid} from ${selectedStudent.fullName} on ${new Date(h.datePaid).toLocaleDateString()}. Balance: Rs. ${selectedStudent.totalPackage - (selectedStudent.feeReceived || 0)}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
                      }}
                      className="bg-[#25D366] hover:bg-[#25D366]/90 text-white rounded-xl h-10 font-black text-[10px] uppercase tracking-widest"
                    >
                       Share
                    </Button>
                  </div>
                </div>
              ))}
              {(selectedStudent?.feeHistory || []).length === 0 && (
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
