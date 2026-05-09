
import * as React from 'react';
import { useState } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Eye, 
  Download,
  CreditCard,
  GraduationCap,
  Calendar,
  CheckCircle2,
  AlertCircle,
  User,
  Camera,
  Wallet,
  BarChart3,
  Trash2,
  School,
  Globe,
  Award
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Student, Gender, FeePayment } from '../types';
import { SUBJECTS, ACADEMIC_GROUPS, COMPULSORY_SUBJECTS } from '../constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { HighlightText } from './HighlightText';
import FeeReceipt from './FeeReceipt';
import { compressImage } from '../lib/imageUtils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useDebounce } from '../hooks/useDebounce';
import { getUnifiedTransactions } from '../utils/fee';

export default function StudentsView({ data, gender, program }: { data: any, gender?: Gender, program?: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [monthlyFeeFilter, setMonthlyFeeFilter] = useState('all');
  const [defaulterFilter, setDefaulterFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState<string>(gender || 'all');
  const [programFilter, setProgramFilter] = useState<string>(program || 'all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [subjectFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [dialogType, setDialogType] = useState<'profile' | 'profile_academic' | 'profile_fees' | 'edit' | 'pay' | 'receipt' | 'delete' | 'bulkDelete' | null>(null);
  const [payConfig, setPayConfig] = useState<{ month?: string, year?: number }>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const mergedStudents = React.useMemo(() => {
    const rawStudents = [...data.students].map(s => {
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
    
    // Add all admissions that don't have a matching student record yet (automatically populated in Students tab)
    data.admissions.forEach((a: any) => {
      const existsInStudents = rawStudents.some((s: any) => s.admissionId === a.id || s.id === a.studentId);
      
      if (!existsInStudents) {
        let derivedGender = a.gender;
        if (!derivedGender) {
          const identifier = (`${a.category || ''} ${a.group || ''}`).toLowerCase();
          if (identifier.includes('girl') || identifier.includes('female')) {
            derivedGender = 'Female';
          } else {
            derivedGender = 'Male';
          }
        }

        // Map Admission to a Student model for display
        rawStudents.push({
          id: a.studentId || a.id,
          admissionId: a.id,
          fullName: a.fullName,
          fatherName: a.fatherName,
          contact: a.contactNumber,
          address: a.address || '',
          gender: derivedGender,
          category: a.category || 'Inter Part-1 Boys',
          group: a.group || 'Pending',
          section: a.section || 'A',
          photo: a.photo || '',
          attendance: { present: 0, absent: 0 },
          feeHistory: a.feeHistory || [],
          feeLedger: a.feeLedger ? a.feeLedger : { 
            totalPackage: a.totalPackage || 0, 
            totalReceived: a.feeReceived || 0, 
            remainingBalance: (a.totalPackage || 0) - (a.feeReceived || 0), 
            transactions: a.feeReceived > 0 ? [{
              id: `tx-initial-${a.id}`,
              date: a.date?.split('T')[0] || new Date().toISOString().split('T')[0],
              amount: a.feeReceived,
              description: 'Initial Admission Payment',
              paymentMethod: 'Cash',
              receiptId: `REC-${a.id.slice(-6)}`
            }] : [], 
            installments: [] 
          },
          subjects: a.subjects || [],
          admissionFee: a.admissionFee || 0,
          miscFunds: a.miscFunds || 0,
          totalFeeFinalized: a.totalFeeFinalized || 0,
          totalInstallments: a.totalInstallments || 12,
          monthlyFee: Math.round((a.totalPackage || 0) / (a.totalInstallments || 12)),
          totalPackage: a.totalPackage || 0,
          feeReceived: a.feeReceived || 0,
          session: a.session,
          sessionStartDate: a.sessionStartDate,
          sessionEndDate: a.sessionEndDate,
          academicPart: a.academicPart || 'Part-1',
          programType: a.programType || 'Yearly',
          currentSemester: a.currentSemester || 0
        } as any);
      }
    });

    // Filter by Gender and Program
    return rawStudents.filter((s: any) => {
      let matchesGender = true;
      if (genderFilter !== 'all') matchesGender = s.gender === genderFilter;
      
      let matchesProgram = true;
      if (programFilter !== 'all') {
        const sGroup = (s.group || '').toLowerCase();
        const sCategory = (s.category || '').toLowerCase();
        const identifier = `${sGroup} ${sCategory}`;
        const pFilter = programFilter.toLowerCase();
        
        if (pFilter === 'fsc' || pFilter.includes('engineering') || pFilter.includes('medical') || pFilter.includes('intermediate')) {
           matchesProgram = sGroup.includes('engineering') || sGroup.includes('medical') || sGroup.includes('science') || sGroup.includes('com') || sGroup.includes('intermediate') || sCategory.includes('inter') || sGroup.includes('ics') || sGroup.includes('fsc');
        } else if (pFilter === 'dit' || pFilter.includes('diploma')) {
           matchesProgram = sGroup.includes('dit') || sGroup.includes('diploma');
        } else if (pFilter === 'bs' || pFilter.includes('b.s')) {
           matchesProgram = sGroup.includes('bs') || sGroup.includes('b.s');
        } else if (pFilter === 'ukl3' || pFilter.includes('uk') || pFilter.includes('level 3')) {
           matchesProgram = sGroup.includes('uk') || sGroup.includes('l3') || sGroup.includes('level 3');
        } else {
           matchesProgram = identifier.includes(pFilter);
        }
      }
      return matchesGender && matchesProgram;
    });
  }, [data.students, data.admissions, genderFilter, programFilter]);

  const sectionOptions = React.useMemo(() => {
    return Array.from(new Set(data?.settings?.predefinedSections?.map((s: any) => s.name).filter(Boolean))) as string[];
  }, [data?.settings?.predefinedSections]);

  const filteredStudents = React.useMemo(() => {
    return mergedStudents.filter((s: any) => {
      const matchesSearch = s.fullName.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                           s.id.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      // Monthly fee status for current month (March 2026 for demo)
      const currentMonthPayment = s.feeHistory.find((f: any) => f.month === 'March' && f.year === 2026);
      const matchesFee = monthlyFeeFilter === 'all' || 
                        (monthlyFeeFilter === 'Paid' && currentMonthPayment?.status === 'Paid') ||
                        (monthlyFeeFilter === 'Partial' && currentMonthPayment?.status === 'Partial') ||
                        (monthlyFeeFilter === 'Unpaid' && (!currentMonthPayment || currentMonthPayment.status === 'Unpaid'));

      // Defaulter logic
      const unpaidMonths = s.feeHistory.filter((f: any) => f.status === 'Unpaid').length;
      const matchesDefaulter = defaulterFilter === 'all' ||
                              (defaulterFilter === '1' && unpaidMonths === 1) ||
                              (defaulterFilter === '2' && unpaidMonths === 2) ||
                              (defaulterFilter === '3' && unpaidMonths >= 3) ||
                              (defaulterFilter === '4' && unpaidMonths >= 4);

      const matchesSubject = subjectFilter === 'all' || (s.subjects || []).includes(subjectFilter);

      const matchesSection = sectionFilter === 'all' || (s.section || '').trim().toLowerCase() === sectionFilter.trim().toLowerCase();

      return matchesSearch && matchesFee && matchesDefaulter && matchesSubject && matchesSection;
    });
  }, [mergedStudents, debouncedSearch, monthlyFeeFilter, defaulterFilter, subjectFilter, sectionFilter]);

  // Handle pagination for better performance
  const ITEMS_PER_PAGE = 30;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);

  // Reset pagination when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, monthlyFeeFilter, defaulterFilter, subjectFilter, sectionFilter]);

  const visibleStudents = React.useMemo(
    () => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      return filteredStudents.slice(start, end);
    },
    [filteredStudents, currentPage],
  );

  const getDefaulterBadge = (student: Student) => {
    const unpaidMonths = student.feeHistory.filter(f => f.status === 'Unpaid').length;
    if (unpaidMonths >= 4) return <Badge className="bg-red-900 text-white border-red-950">Serious Defaulter (4+)</Badge>;
    if (unpaidMonths >= 2) return <Badge className="bg-red-100 text-red-700 border-red-200">Defaulter ({unpaidMonths}m)</Badge>;
    return null;
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s: Student) => s.id));
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    const title = `Students List - ${programFilter !== 'all' ? programFilter : 'All Programs'} ${sectionFilter !== 'all' ? '- Section ' + sectionFilter : ''}`;
    doc.text(title, 40, 40);
    
    autoTable(doc, {
      startY: 50,
      head: [['ID', 'Name', 'Father Name', 'Gender', 'Group', 'Class', 'Section', 'Contact']],
      body: filteredStudents.map((s: any) => [
        s.id,
        s.fullName,
        s.fatherName,
        s.gender,
        s.group,
        s.category,
        s.section || 'N/A',
        s.parentContact || 'N/A'
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [5, 59, 50], textColor: [255, 255, 255] }
    });
    
    doc.save(`Students_Export_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredStudents.map((s: any) => ({
      'ID': s.id,
      'Name': s.fullName,
      'Father Name': s.fatherName,
      'DOB': s.dob || 'N/A',
      'Gender': s.gender,
      'Group': s.group,
      'Class': s.category,
      'Section': s.section || 'N/A',
      'Session': s.session || 'N/A',
      'Parent Contact': s.parentContact || 'N/A',
      'Address': s.address || 'N/A',
      'Blood Group': s.bloodGroup || 'N/A',
      'Admission Date': s.admissionDate || 'N/A'
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `Students_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    setDialogType('bulkDelete');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-3xl font-display font-black text-superior-teal tracking-tight">
              {gender === 'Male' ? 'Boys Campus' : gender === 'Female' ? 'Girls Campus' : 'Student Records'}
            </h3>
            <span className="text-slate-300 text-2xl">/</span>
            <span className="urdu-text text-2xl text-superior-gold font-medium">
              {gender === 'Male' ? 'بوائز کیمپس' : gender === 'Female' ? 'گرلز کیمپس' : 'طلباء کا ریکارڈ'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button onClick={handleExportPDF} variant="outline" className="h-14 rounded-[2rem] border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-100 flex items-center gap-2">
              <Download size={18} /> PDF
            </Button>
            <Button onClick={handleExportExcel} variant="outline" className="h-14 rounded-[2rem] border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 flex items-center gap-2">
              <Download size={18} /> Excel
            </Button>
          </div>
          <div className="bg-white px-8 py-4 rounded-[2rem] border border-slate-100 flex items-center gap-6 shadow-sm">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Students</p>
              <p className="text-3xl font-display font-black text-superior-teal leading-none">{filteredStudents.length}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-superior-teal/5 flex items-center justify-center text-superior-teal shadow-inner">
              <GraduationCap size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedStudents.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-4 z-30 flex items-center justify-between p-4 bg-superior-teal rounded-2xl shadow-2xl text-white mb-6 border border-white/10"
        >
          <div className="flex items-center gap-4 pl-2">
            <Checkbox 
              checked={selectedStudents.length === filteredStudents.length} 
              onCheckedChange={toggleSelectAll} 
              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-superior-teal"
            />
            <div className="flex flex-col">
              <p className="text-sm font-black uppercase tracking-widest">
                {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
              </p>
              {selectedStudents.length < filteredStudents.length && (
                <button 
                  onClick={() => setSelectedStudents(filteredStudents.map(s => s.id))}
                  className="text-[10px] font-black underline uppercase tracking-tighter opacity-70 hover:opacity-100 text-left"
                >
                  Select all {filteredStudents.length} matching students
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedStudents([])}
              className="h-10 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 font-black text-[10px] uppercase tracking-widest px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkDelete}
              variant="destructive" 
              className="h-10 rounded-xl bg-white text-rose-600 hover:bg-rose-50 border-none font-black text-[10px] uppercase tracking-widest px-6 shadow-lg shadow-black/20"
            >
              <Trash2 size={14} className="mr-2" /> Delete
            </Button>
          </div>
        </motion.div>
      )}

      {/* Group Navigation Tabs */}
      <Tabs value={programFilter} onValueChange={(val) => setProgramFilter(val)} className="w-full mb-6">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl w-full flex items-center justify-start overflow-x-auto scrollbar-hide h-auto border border-slate-200/50">
          <TabsTrigger value="all" className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            All Groups
          </TabsTrigger>
          <TabsTrigger value="fsc" className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <School size={15} className="mr-2 inline-block" />
            Inter
          </TabsTrigger>
          <TabsTrigger value="dit" className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <GraduationCap size={15} className="mr-2 inline-block" />
            DIT
          </TabsTrigger>
          <TabsTrigger value="ukl3" className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <Globe size={15} className="mr-2 inline-block" />
            UKL3
          </TabsTrigger>
          <TabsTrigger value="bs" className="rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <GraduationCap size={15} className="mr-2 inline-block" />
            BS
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-5 mb-10 hover:border-superior-teal/20 transition-all duration-500">
        <div className="flex items-center gap-3 pr-5 border-r border-slate-100">
          <Checkbox 
            id="select-all-students"
            checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0} 
            onCheckedChange={toggleSelectAll} 
            className="rounded-md border-superior-teal/30 data-[state=checked]:bg-superior-teal data-[state=checked]:text-white"
          />
          <Label htmlFor="select-all-students" className="text-[10px] font-black text-superior-teal/60 cursor-pointer uppercase tracking-[0.2em]">Select All</Label>
        </div>

        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-superior-teal/40" size={18} />
          <Input 
            placeholder="Search by name or ID..." 
            className="pl-12 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-[140px] h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-slate-600">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
              <SelectItem value="all">All Sections</SelectItem>
              {sectionOptions.map(sec => (
                <SelectItem key={sec} value={sec}>{sec}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-[140px] h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-slate-600 font-bold">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="Male">Boys Only</SelectItem>
              <SelectItem value="Female">Girls Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={monthlyFeeFilter} onValueChange={setMonthlyFeeFilter}>
            <SelectTrigger className="w-[180px] h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-slate-600">
              <SelectValue placeholder="Monthly Fee" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
              <SelectItem value="all">All Fee Status</SelectItem>
              <SelectItem value="Paid" className="text-emerald-600">Paid This Month</SelectItem>
              <SelectItem value="Partial" className="text-orange-600">Partial Paid</SelectItem>
              <SelectItem value="Unpaid" className="text-rose-600">Not Paid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={defaulterFilter} onValueChange={setDefaulterFilter}>
            <SelectTrigger className="w-[180px] h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-slate-600">
              <SelectValue placeholder="Defaulter Filter" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="1" className="text-orange-500">Defaulter 1 Month</SelectItem>
              <SelectItem value="2" className="text-orange-600">Defaulter 2 Months</SelectItem>
              <SelectItem value="3" className="text-rose-600">Defaulter 3+ Months</SelectItem>
              <SelectItem value="4" className="text-red-700 font-bold">Serious Defaulters (4+)</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="h-12 w-12 rounded-xl border-slate-100 bg-slate-50 hover:bg-white transition-all p-0">
            <Filter size={18} className="text-slate-400" />
          </Button>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", viewMode === 'grid' ? "bg-white text-superior-teal shadow-sm" : "text-slate-400 hover:text-slate-600")}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", viewMode === 'list' ? "bg-white text-superior-teal shadow-sm" : "text-slate-400 hover:text-slate-600")}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Students View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
          {visibleStudents.map((student: Student) => (
            <motion.div
              key={student.id}
              whileHover={{ y: -5 }}
              className={cn(
                "bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden relative group",
                selectedStudents.includes(student.id) && "ring-4 ring-superior-teal ring-offset-4"
              )}
            >
              <div className="absolute top-4 left-4 z-20">
                <Checkbox 
                  checked={selectedStudents.includes(student.id)} 
                  onCheckedChange={() => toggleSelectStudent(student.id)}
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-md"
                />
              </div>
              <div className="bg-superior-teal h-24 relative">
                <div className="absolute top-3 left-5">
                  {getDefaulterBadge(student)}
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    title="Profile"
                    className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-none transition-all active:scale-95" 
                    onClick={() => {
                      setSelectedStudent(student);
                      setDialogType('profile');
                    }}
                  >
                    <Eye size={14} />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-8 w-8 flex-shrink-0 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center justify-center text-white outline-hidden">
                      <MoreHorizontal size={14} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[200px] border-slate-100 shadow-2xl">
                      <DropdownMenuItem 
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700" 
                        onClick={() => {
                          setSelectedStudent(student);
                          setDialogType('profile_academic');
                        }}
                      >
                        <Award size={16} className="text-emerald-500" /> Academic Records
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700" 
                        onClick={() => {
                          setSelectedStudent(student);
                          setDialogType('profile_fees');
                        }}
                      >
                        <Wallet size={16} className="text-superior-gold" /> Fee Statement
                      </DropdownMenuItem>
                      <Separator className="my-2 bg-slate-50" />
                      <DropdownMenuItem 
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700" 
                        onClick={() => {
                          setSelectedStudent(student);
                          setDialogType('receipt');
                        }}
                      >
                        <CreditCard size={16} className="text-superior-teal" /> Download Receipt
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700" 
                        onClick={() => {
                          setSelectedStudent(student);
                          setDialogType('edit');
                        }}
                      >
                        <Edit size={16} className="text-slate-400" /> Edit Details
                      </DropdownMenuItem>
                      <Separator className="my-2 bg-slate-50" />
                      <DropdownMenuItem 
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          setSelectedStudent(student);
                          setDialogType('delete');
                        }}
                      >
                        <Trash2 size={16} /> Delete Record
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="absolute -bottom-10 left-5">
                  <div className="w-20 h-20 rounded-[1.5rem] border-4 border-white bg-slate-100 overflow-hidden shadow-xl shadow-superior-teal/10">
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
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400 font-bold text-2xl">
                        {student.fullName.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-14 pb-6 px-5 bg-white">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="font-display font-black text-lg text-slate-800 tracking-tight leading-tight line-clamp-1">
                      <HighlightText text={student.fullName} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                    </h3>
                    <p className="text-[10px] font-black text-superior-gold uppercase tracking-[0.3em] mt-1">{student.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Guardian</p>
                    <p className="text-sm font-black text-slate-600">
                      <HighlightText text={student.fatherName} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">Academic Group</p>
                    <p className="text-xs font-black text-superior-teal truncate">{student.group}</p>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">Attendance</p>
                    <p className="text-xs font-black text-emerald-600">
                      {Math.round((student.attendance.present / (student.attendance.present + student.attendance.absent || 1)) * 100)}% Present
                    </p>
                  </div>
                </div>

                <Separator className="mb-5 bg-slate-100" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Package / Installment</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-lg font-display font-black text-slate-800 tracking-tight">Rs. {(student.monthlyFee || 0).toLocaleString()}</p>
                      <span className="text-[10px] font-bold text-rose-500 underline decoration-rose-500/30">Bal: {((student.feeLedger?.remainingBalance || (student.totalPackage || 0) - (student.feeReceived || 0)) / 1000).toFixed(1)}k</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden auto-mx-4">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Student Details</TableHead>
                <TableHead>Program/Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Total Package</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {visibleStudents.map((student: Student) => (
                  <TableRow key={student.id} className="group cursor-pointer hover:bg-slate-50/50" onClick={() => { setSelectedStudent(student); setDialogType('profile'); }}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                         <Checkbox 
                           checked={selectedStudents.includes(student.id)} 
                           onCheckedChange={() => toggleSelectStudent(student.id)}
                         />
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-[10px] overflow-hidden bg-slate-100 flex-shrink-0">
                             {student.photo ? (
                               <img src={student.photo} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg bg-slate-200">{student.fullName.charAt(0)}</div>
                             )}
                           </div>
                           <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-900 group-hover:text-superior-teal transition-colors tracking-tight">{student.fullName}</span>
                              <span className="text-[10px] font-black text-superior-gold uppercase tracking-widest">{student.id}</span>
                           </div>
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col">
                           <span className="text-xs font-black text-slate-700">{student.category}</span>
                           <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase">{student.group}</span>
                         </div>
                      </TableCell>
                      <TableCell>
                         <Badge variant="outline" className="text-[10px] text-slate-600 font-bold border-slate-200">
                           {student.section || '-'}
                         </Badge>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-600 font-mono tracking-tight">{student.contact}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Guardian: {student.fatherName.split(' ')[0]}</span>
                         </div>
                      </TableCell>
                      <TableCell>
                         <span className="text-xs font-black text-emerald-600 block">
                           Rs. {((student.totalPackage) || 0).toLocaleString()}
                         </span>
                      </TableCell>
                      <TableCell>
                         <span className="text-xs font-black text-rose-500 block underline decoration-rose-500/20">
                           Rs. {(student.feeLedger?.remainingBalance || (student.totalPackage || 0) - (student.feeReceived || 0)).toLocaleString()}
                         </span>
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                           <Button onClick={() => { setSelectedStudent(student); setDialogType('receipt'); }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-500"><CreditCard className="h-4 w-4" /></Button>
                           <Button onClick={() => { setSelectedStudent(student); setDialogType('edit'); }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-superior-teal"><Edit className="h-4 w-4" /></Button>
                         </div>
                      </TableCell>
                  </TableRow>
               ))}
               {visibleStudents.length === 0 && (
                 <TableRow>
                   <TableCell colSpan={8} className="h-32 text-center text-slate-500 font-bold py-12">
                     <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                     No students found matching your filters.
                   </TableCell>
                 </TableRow>
               )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-slate-100">
          <p className="text-sm font-bold text-slate-500">
            Showing Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border-slate-200 text-slate-500 hover:text-superior-teal hover:bg-superior-teal/5 font-bold px-6 h-10 disabled:opacity-50"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border-slate-200 text-slate-500 hover:text-superior-teal hover:bg-superior-teal/5 font-bold px-6 h-10 disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Centralized Dialogs */}
      <Dialog open={dialogType === 'delete'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">Delete Student Record</DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete the record for <span className="font-bold text-slate-800">{selectedStudent?.fullName}</span>? This action is permanent and cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertCircle size={24} />
              </div>
              <p className="text-xs text-red-700 font-medium">Deleting this record will remove all associated attendance, fee history, and academic data from the system.</p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setDialogType(null)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
            <Button variant="destructive" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={() => {
              if (selectedStudent) {
                data.deleteStudent(selectedStudent.id);
                setDialogType(null);
                toast.success("Student record deleted successfully!");
              }
            }}>Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'bulkDelete'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">Bulk Delete Students</DialogTitle>
            <DialogDescription className="text-slate-500">
              You are about to delete <span className="font-bold text-slate-800">{selectedStudents.length}</span> selected student records.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertCircle size={24} />
              </div>
              <p className="text-xs text-red-700 font-medium">This is a bulk action. All selected data will be permanently removed from the database.</p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setDialogType(null)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
            <Button variant="destructive" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={async () => {
              const idsToDelete = [...selectedStudents];
              setDialogType(null);
              setSelectedStudents([]);
              await data.bulkDeleteStudents(idsToDelete);
            }}>Delete All Selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType !== null && dialogType.startsWith('profile')} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] overflow-y-auto p-0 border-none bg-white rounded-3xl">
          {selectedStudent && (
            <StudentProfile 
              student={selectedStudent} 
              data={data} 
              initialTab={dialogType === 'profile_academic' ? 'academic' : dialogType === 'profile_fees' ? 'fees' : 'overview'}
              onEdit={() => setDialogType('edit')}
              onDownloadReceipt={() => setDialogType('receipt')}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'edit'} onOpenChange={(open) => !open && setDialogType(null)}>
        {selectedStudent && (
          <EditStudentDialog 
            student={selectedStudent} 
            data={data} 
            onClose={() => setDialogType(null)} 
            onDelete={() => setDialogType('delete')}
          />
        )}
      </Dialog>

      <Dialog open={dialogType === 'receipt'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] overflow-y-auto p-0 border-none bg-white rounded-3xl">
          {selectedStudent && <FeeReceipt student={selectedStudent} settings={data.settings} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentProfile({ student, data, initialTab = 'overview', onEdit, onDownloadReceipt }: { student: Student, data: any, initialTab?: string, onEdit?: () => void, onDownloadReceipt?: () => void }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const totalAttendance = student.attendance.present + student.attendance.absent;
  const attendanceRatio = totalAttendance > 0 ? student.attendance.present / totalAttendance : 0;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const toastId = toast.loading("Processing photo...");
      try {
        const compressedBase64 = await compressImage(file);
        await data.updateStudent(student.id, { photo: compressedBase64 });
        toast.dismiss(toastId);
        toast.success("Photo updated successfully!");
      } catch (err) {
        console.error('Photo upload error:', err);
        toast.dismiss(toastId);
        toast.error("Failed to upload photo.");
      }
    }
  };

  const handleExportStatement = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text('SUPERIOR COLLEGE JAHANIAN', 105, 20, { align: 'center' });
      doc.setFontSize(14);
      doc.text('Official Fee Statement', 105, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Student Name: ${student.fullName}`, 14, 45);
      doc.text(`Roll Number: ${student.id}`, 14, 52);
      doc.text(`Class/Group: ${student.group}`, 14, 59);

      const unified = getUnifiedTransactions(student);
      const rows = unified.map((t: any) => [
        t.date ? new Date(t.date).toLocaleDateString() : '-',
        t.description || '-',
        t.receiptId || '-',
        `Rs. ${(t.amount || 0).toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: 70,
        head: [['Date', 'Description', 'Receipt ID', 'Amount']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [11, 77, 69] } // superior-teal
      });

      doc.setFontSize(10);
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      const totalPaid = unified.reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);
      doc.text(`Total Amount Paid: Rs. ${totalPaid.toLocaleString()}`, 14, finalY + 10);
      const totalPkg = student.totalPackage || 0;
      doc.text(`Total Package: Rs. ${totalPkg.toLocaleString()}`, 14, finalY + 17);
      doc.text(`Remaining Balance: Rs. ${(totalPkg - totalPaid).toLocaleString()}`, 14, finalY + 24);

      doc.save(`Fee_Statement_${student.fullName.replace(/\s+/g, '_')}_${student.id}.pdf`);
      toast.success('Fee statement exported as PDF');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export statement');
    }
  };

  return (
    <div className="w-full">
      <div className="bg-superior-teal p-6 md:p-10 text-white relative">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-center relative z-10">
          <div className="relative group shrink-0">
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-2xl border-4 border-white/20 bg-white/10 backdrop-blur-md overflow-hidden">
              {student.photo ? (
                <img src={student.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40">
                  <User size={64} />
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 p-2.5 bg-superior-gold text-white rounded-xl cursor-pointer hover:scale-110 active:scale-95 transition-all border-2 border-white">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          
          <div className="text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 bg-superior-gold/20 text-superior-gold border border-superior-gold/30 mb-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              <GraduationCap size={12} /> Student Identity Card
            </div>
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-2 tracking-tight">{student.fullName}</h2>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-6 text-sm md:text-base opacity-90">
                <p className="font-mono font-bold text-superior-gold">{student.id}</p>
                <span className="hidden md:block opacity-30">|</span>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-superior-gold" />
                  <span>Father: {student.fatherName}</span>
                </div>
                <span className="hidden md:block opacity-30">|</span>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-superior-gold" />
                  <span>{student.academicPart} - {student.session}</span>
                </div>
                <span className="hidden md:block opacity-30">|</span>
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-superior-gold" />
                  <span>{student.category} - Section {student.section}</span>
                </div>
              </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="bg-white text-slate-800 hover:bg-slate-100 font-bold rounded-xl h-12"
              onClick={onDownloadReceipt}
            >
              <CreditCard className="mr-2" size={18} /> Download Receipt
            </Button>
            <Button 
              className="bg-superior-gold text-white hover:bg-superior-gold/90 font-bold rounded-xl h-12"
              onClick={onEdit}
            >
              <Edit className="mr-2" size={18} /> Edit Profile
            </Button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-superior-gold/5 rounded-full -ml-32 -mb-32 blur-2xl"></div>
      </div>

      <div className="p-6 md:p-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="inline-flex w-auto mb-8 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <TabsTrigger value="overview" className="px-8 rounded-lg data-[state=active]:bg-white">Overview</TabsTrigger>
            <TabsTrigger value="fees" className="px-8 rounded-lg data-[state=active]:bg-white">Fee History</TabsTrigger>
            <TabsTrigger value="academic" className="px-8 rounded-lg data-[state=active]:bg-white">Academic</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <InfoCard title="Academic Stage" value={student.academicPart || 'Part-1'} icon={GraduationCap} />
              <InfoCard title="Session" value={student.session || 'N/A'} icon={Calendar} />
              <InfoCard title="Category" value={student.category} icon={GraduationCap} />
              <InfoCard title="Section" value={student.section} icon={Filter} />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-black text-superior-teal flex items-center gap-2">
                <CreditCard size={18} /> Financial Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tuition Fee</p>
                  <p className="text-2xl font-display font-black text-slate-700">Rs. {(student.totalFeeFinalized || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Misc Funds</p>
                  <p className="text-2xl font-display font-black text-slate-700">Rs. {(student.miscFunds || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Admission Fee</p>
                  <p className="text-2xl font-display font-black text-slate-700">Rs. {(student.admissionFee || 0).toLocaleString()}</p>
                </div>
                <div className="bg-superior-teal/5 p-6 rounded-2xl border border-superior-teal/10 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] font-black text-superior-teal uppercase tracking-widest mb-2">Total Package</p>
                  <p className="text-2xl font-display font-black text-superior-teal">Rs. {(student.totalPackage || 0).toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Received</p>
                  <p className="text-2xl font-display font-black text-emerald-700">Rs. {(student.feeReceived || (student.feeLedger?.totalReceived || 0)).toLocaleString()}</p>
                </div>
                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-2">Remaining Balance</p>
                  <p className="text-2xl font-display font-black text-rose-700">Rs. {(student.feeLedger?.remainingBalance || (student.totalPackage || 0) - (student.feeReceived || 0)).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800 text-white p-6 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-xl">
                      <CreditCard className="text-superior-gold" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-white/50">Installments Tracking (کستوں کا ریکارڈ)</p>
                      <h4 className="text-xl font-bold">
                        {Math.floor((student.feeLedger?.totalReceived || student.feeReceived || 0) / (student.monthlyFee || 1))} / {student.totalInstallments || 12} Paid
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black tracking-widest text-white/50">Plan Amount (کست رقم)</p>
                    <p className="font-bold text-superior-gold">Rs. {(student.monthlyFee || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-superior-teal text-white p-6 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-xl">
                      <BarChart3 className="text-superior-gold" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-white/50">Recovery Progress</p>
                      <h4 className="text-xl font-bold">
                        Remaining: Rs. {(student.feeLedger?.remainingBalance || (student.totalPackage || 0) - (student.feeReceived || 0)).toLocaleString()}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black tracking-widest text-white/50">Collected</p>
                    <p className="font-bold text-emerald-300">
                      {Math.round(((student.feeLedger?.totalReceived || student.feeReceived || 0) / (student.totalPackage || 1)) * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
              <Card className="lg:col-span-2 border-slate-200 overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Calendar size={16} className="text-superior-teal" />
                    Attendance Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-8 pb-8">
                  <div className="flex flex-col sm:flex-row items-center gap-8 md:gap-12">
                    <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" 
                          strokeDasharray={2 * Math.PI * 56}
                          strokeDashoffset={2 * Math.PI * 56 * (1 - attendanceRatio)}
                          strokeLinecap="round"
                          className="text-superior-teal transition-all duration-1000" />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-bold text-superior-teal">
                          {Math.round(attendanceRatio * 100)}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Ratio</span>
                      </div>
                    </div>
                    <div className="flex-1 w-full space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[10px] text-emerald-600 uppercase font-bold mb-1">Present</p>
                          <p className="text-xl font-bold text-emerald-700">{student.attendance.present} Days</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                          <p className="text-[10px] text-red-600 uppercase font-bold mb-1">Absent</p>
                          <p className="text-xl font-bold text-red-700">{student.attendance.absent} Days</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                          <span>Progress</span>
                          <span>{student.attendance.present} / {totalAttendance}</span>
                        </div>
                        <Progress value={attendanceRatio * 100} className="h-3 rounded-full" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-slate-50/30 rounded-2xl">
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-bold">Contact & Support</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100">
                    <div className="p-2.5 bg-superior-teal/10 rounded-lg">
                      <Edit size={16} className="text-superior-teal" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Guardian Contact</p>
                      <p className="text-sm font-bold text-slate-700">{student.contact}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100">
                    <div className="p-2.5 bg-superior-gold/10 rounded-lg">
                      <CheckCircle2 size={16} className="text-superior-gold" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Status</p>
                      <p className="text-sm font-bold text-emerald-600 tracking-wide">ENROLLED</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full h-10 text-xs font-bold border-slate-200 hover:bg-slate-50"
                    onClick={onEdit}
                  >
                    Update Profile Details
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fees" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Transaction & Installment History</h3>
              <div className="flex gap-2">
                <Button onClick={handleExportStatement} size="sm" variant="outline" className="text-xs">
                  <Download size={14} className="mr-1" /> Export Statement
                </Button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="py-4">Description / Month</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>System Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Show Ledger Transactions (Source of Truth + Legacy merged) */}
                  {getUnifiedTransactions(student).map((tx: any) => (
                    <TableRow key={tx.id} className="hover:bg-slate-50/50 transition-colors bg-slate-50/20">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-superior-teal">{tx.description}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{tx.paymentMethod} Payment</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-superior-teal">Rs. {(tx.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(tx.date).toLocaleDateString()}
                        {' • '}
                        <span className="text-[10px]">{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-superior-gold/20 text-superior-teal border-none text-[9px]">{tx.receiptId || 'TRANS'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}

                  {getUnifiedTransactions(student).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-slate-400 italic font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">No payment records found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="academic" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Academic Performance History</h3>
              <p className="text-xs text-slate-400 font-medium">Showing all recorded test results</p>
            </div>
            
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase">Test Name</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Subject</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Marks</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Date</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Teacher</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.academicRecords?.filter((r: any) => r.studentId === student.id).length > 0 ? (
                    data.academicRecords.filter((r: any) => r.studentId === student.id).map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{record.testName}</span>
                            <span className="text-[9px] font-black uppercase text-slate-400">{record.testType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-600">{record.subject}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800">{record.obtainedMarks} / {record.totalMarks}</span>
                            <Badge className={cn(
                              "text-[9px] font-black uppercase",
                              (record.obtainedMarks / record.totalMarks) >= 0.8 ? "bg-emerald-100 text-emerald-700" :
                              (record.obtainedMarks / record.totalMarks) >= 0.5 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                            )}>
                              {Math.round((record.obtainedMarks / record.totalMarks) * 100)}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{record.date}</TableCell>
                        <TableCell className="text-xs text-slate-500">{record.teacherName}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-slate-400 italic text-sm">
                        No academic records found for this student.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Button 
              className="w-full h-12 bg-superior-teal text-white hover:bg-superior-teal/90 rounded-xl"
              onClick={() => window.print()}
            >
              <Download size={18} className="mr-2" /> Download Full Academic Transcript
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EditStudentDialog({ student, data, onClose, onDelete }: { student: Student, data: any, onClose?: () => void, onDelete?: () => void }) {
  const [formData, setFormData] = useState({
    fullName: student.fullName || '',
    fatherName: student.fatherName || '',
    contact: student.contact || '',
    address: student.address || '',
    admissionFee: student.admissionFee || 0,
    miscFunds: student.miscFunds || 0,
    totalFeeFinalized: student.totalFeeFinalized || 0,
    totalInstallments: student.totalInstallments || 12,
    monthlyFee: student.monthlyFee || 0,
    subjects: [...(student.subjects || [])],
    category: student.category || 'Inter Part-1 Boys',
    group: student.group || '',
    section: student.section || '',
    photo: student.photo || '',
    session: student.session || '',
    sessionStartDate: student.sessionStartDate || '',
    sessionEndDate: student.sessionEndDate || '',
    academicPart: student.academicPart || 'Part-1'
  });

  const filteredSections = React.useMemo(() => {
    if (!data.settings?.predefinedSections) return [];
    
    return data.settings.predefinedSections.filter(sec => {
      const matchesGender = sec.gender === student.gender || sec.gender === 'Co-ed';
      if (!matchesGender) return false;

      const sp = sec.program.toLowerCase();
      const cat = (student.category || '').toLowerCase();
      
      let programMatch = false;
      if (cat.includes('inter') && sp === 'inter') programMatch = true;
      else if (cat.includes('bs') && sp === 'bs program') programMatch = true;
      else if (cat.includes('dit') && sp === 'dit') programMatch = true;
      else if (cat.includes('uk') && sp === 'uk level 3') programMatch = true;
      else if (sp === 'other') programMatch = true;

      return matchesGender && programMatch;
    });
  }, [data.settings?.predefinedSections, student.gender, student.category]);

  const handleGroupChange = (groupName: string) => {
    const group = ACADEMIC_GROUPS.find(g => g.name === groupName);
    if (group) {
      const newSubjects = Array.from(new Set([...COMPULSORY_SUBJECTS, ...group.subjects]));
      setFormData(prev => ({ ...prev, group: groupName, subjects: newSubjects }));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const toastId = toast.loading("Processing photo...");
      try {
        const compressedBase64 = await compressImage(file);
        setFormData(prev => ({ ...prev, photo: compressedBase64 }));
        toast.dismiss(toastId);
        toast.success("Photo uploaded!");
      } catch (err) {
        console.error('Photo upload error:', err);
        toast.dismiss(toastId);
        toast.error("Failed to upload photo.");
      }
    }
  };

  const handleSave = () => {
    const groupChanged = formData.group !== student.group;
    const finalized = Number(formData.totalFeeFinalized);
    const adm = Number(formData.admissionFee);
    const misc = Number(formData.miscFunds);
    const totalPkg = finalized + adm + misc;
    const instCount = Number(formData.totalInstallments) || 12;
    const instAmount = Math.round(totalPkg / instCount);
    
    data.updateStudent(student.id, {
      ...formData,
      totalPackage: totalPkg,
      monthlyFee: instAmount,
      totalInstallments: instCount,
      'feeLedger.totalPackage': totalPkg
    });
    toast.success("Student profile updated successfully!");
    if (onClose) onClose();
    
    if (groupChanged) {
      toast.warning(
        "Academic Group changed! Please review the Fee Package in Fee Manager.",
        {
          duration: 6000,
          action: {
            label: "Go to Fee Manager",
            onClick: () => {
              // This would ideally switch the tab, but for now just a reminder
              console.log("Navigate to Fee Manager");
            }
          }
        }
      );
    }
  };

  const handleDelete = () => {
    if (onDelete) onDelete();
  };

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: (prev.subjects || []).includes(subject)
        ? (prev.subjects || []).filter(s => s !== subject)
        : [...(prev.subjects || []), subject]
    }));
  };

  return (
    <DialogContent className="max-w-[90vw] w-[90vw] max-h-[92vh] overflow-y-auto p-6 bg-white rounded-3xl">
      <DialogHeader>
        <DialogTitle className="text-2xl font-serif text-superior-teal">Edit Student Profile</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4">
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center overflow-hidden transition-colors group-hover:border-superior-teal">
              {formData.photo ? (
                <img src={formData.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="text-slate-400 mb-2" size={24} />
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Upload Photo</span>
                </>
              )}
            </div>
            <label className="absolute inset-0 cursor-pointer">
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Admission Category</Label>
            <Select value={formData.category || ""} onValueChange={(v: any) => setFormData({...formData, category: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Inter Part-1 Boys', 'Inter Part-2 Boys', 'Inter Part-1 Girls', 'Inter Part-2 Girls'].map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={formData.fullName || ""} onChange={e => setFormData({...formData, fullName: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Father's Name</Label>
            <Input value={formData.fatherName || ""} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 col-span-2 space-y-4">
            <h4 className="text-xs font-black text-superior-teal uppercase tracking-widest">Academic & Session Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Stage</Label>
                <Select value={formData.academicPart || "Part-1"} onValueChange={v => setFormData({...formData, academicPart: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Part-1">Inter Part-1</SelectItem>
                    <SelectItem value="Part-2">Inter Part-2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session (Academic Period)</Label>
                <Select value={formData.session || ""} onValueChange={v => setFormData({...formData, session: v})}>
                  <SelectTrigger><SelectValue placeholder="Select Session" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023-2025">2023-2025</SelectItem>
                    <SelectItem value="2024-2026">2024-2026</SelectItem>
                    <SelectItem value="2025-2027">2025-2027</SelectItem>
                    <SelectItem value="2026-28">2026-28</SelectItem>
                    <SelectItem value="2027-2029">2027-2029</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session Start</Label>
                <Input type="date" value={formData.sessionStartDate || ""} onChange={e => setFormData({...formData, sessionStartDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Session End</Label>
                <Input type="date" value={formData.sessionEndDate || ""} onChange={e => setFormData({...formData, sessionEndDate: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input value={formData.contact || ""} onChange={e => setFormData({...formData, contact: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Monthly Installment (Auto-Calc)</Label>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-lg font-black text-superior-teal">
              Rs. {Math.round((Number(formData.totalFeeFinalized || 0) + Number(formData.admissionFee || 0) + Number(formData.miscFunds || 0)) / (formData.totalInstallments || 1)).toLocaleString()}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Total Installments Plan (Months)</Label>
            <Select value={String(formData.totalInstallments ?? 12)} onValueChange={(v) => setFormData({...formData, totalInstallments: Number(v)})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                  <SelectItem key={num} value={String(num)}>{num} Installments</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tuition Fee (Total)</Label>
            <Input type="number" value={formData.totalFeeFinalized || ""} onChange={e => setFormData({...formData, totalFeeFinalized: Number(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>Admission Fee</Label>
            <Input type="number" value={formData.admissionFee || ""} onChange={e => setFormData({...formData, admissionFee: Number(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>Misc Funds</Label>
            <Input type="number" value={formData.miscFunds || ""} onChange={e => setFormData({...formData, miscFunds: Number(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>Academic Group</Label>
            <Select value={formData.group || ""} onValueChange={handleGroupChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Group" />
              </SelectTrigger>
              <SelectContent>
                {ACADEMIC_GROUPS.map(group => (
                  <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={formData.section || ""} onValueChange={v => {
              const sectionObj = filteredSections.find(sec => sec.name === v);
              const newFormData = { ...formData, section: v };
              if (sectionObj && sectionObj.class) {
                newFormData.session = sectionObj.class;
              }
              setFormData(newFormData);
            }}>
              <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
              <SelectContent>
                {filteredSections.map(sec => (
                  <SelectItem key={sec.id} value={sec.name}>{sec.name} ({sec.class})</SelectItem>
                ))}
                <SelectItem value="Other">Other / Manual</SelectItem>
              </SelectContent>
            </Select>
            {formData.section === 'Other' && (
              <Input 
                className="mt-2"
                placeholder="Enter manual section name" 
                onChange={e => setFormData({...formData, section: e.target.value.toUpperCase()})} 
              />
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={formData.address || ""} onChange={e => setFormData({...formData, address: e.target.value})} />
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="space-y-2">
              <Label className="text-superior-teal font-bold">Compulsory Subjects / لازمی مضامین</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COMPULSORY_SUBJECTS.map(subject => (
                  <div key={subject} className="flex items-center space-x-2 bg-white p-2 rounded border border-slate-100">
                    <Checkbox 
                      id={`edit-comp-subject-${subject}`} 
                      checked={(formData.subjects || []).includes(subject)}
                      onCheckedChange={() => toggleSubject(subject)}
                    />
                    <label htmlFor={`edit-comp-subject-${subject}`} className="text-xs font-medium leading-none cursor-pointer">
                      {subject}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-superior-teal font-bold">Elective & Group Subjects / اختیاری مضامین</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SUBJECTS.filter(s => !COMPULSORY_SUBJECTS.includes(s)).map(subject => (
                  <div key={subject} className="flex items-center space-x-2 bg-white p-2 rounded border border-slate-100">
                    <Checkbox 
                      id={`edit-subject-${subject}`} 
                      checked={(formData.subjects || []).includes(subject)}
                      onCheckedChange={() => toggleSubject(subject)}
                    />
                    <label htmlFor={`edit-subject-${subject}`} className="text-sm font-medium leading-none cursor-pointer">
                      {subject}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="pt-4 flex gap-3">
          <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleDelete}>
            <Trash2 size={18} className="mr-2" /> Delete Student
          </Button>
          <div className="flex-1" />
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button className="bg-superior-teal text-white hover:bg-superior-teal/90" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}



function InfoCard({ title, value, icon: Icon }: { title: string, value: string, icon?: any }) {
  return (
    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white transition-all group">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={14} className="text-slate-400 group-hover:text-superior-teal transition-colors" />}
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{title}</p>
      </div>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
