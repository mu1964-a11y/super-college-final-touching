
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
  Plus,
  Camera,
  Upload,
  PieChart,
  Wallet,
  BarChart3,
  Trash2
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
  DialogTrigger,
  DialogClose,
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
import { compressImage, base64ToBlob } from '../lib/imageUtils';

import { useDebounce } from '../hooks/useDebounce';

export default function StudentsView({ data, gender, program }: { data: any, gender?: Gender, program?: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [monthlyFeeFilter, setMonthlyFeeFilter] = useState('all');
  const [defaulterFilter, setDefaulterFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [dialogType, setDialogType] = useState<'profile' | 'edit' | 'pay' | 'receipt' | 'delete' | 'bulkDelete' | null>(null);
  const [payConfig, setPayConfig] = useState<{ month?: string, year?: number }>({});

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
    
    // Add confirmed admissions that don't have a matching student record yet
    data.admissions.forEach((a: any) => {
      // User Request: A student is considered enrolled only upon fee receipt.
      const isEnrolled = a.isAdmitted || a.status === 'Admitted/Confirmed' || (a.feeReceived > 0);
      const existsInStudents = rawStudents.some((s: any) => s.admissionId === a.id || s.id === a.studentId);
      
      if (isEnrolled && !existsInStudents) {
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
          feeHistory: [],
          feeLedger: { 
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
      if (gender) matchesGender = s.gender === gender;
      
      let matchesProgram = true;
      if (program) {
        const identifier = (`${s.category || ''} ${s.group || ''}`).toLowerCase();
        if (program === 'fsc') matchesProgram = !identifier.includes('dit') && !identifier.includes('level 3') && !identifier.includes('uk') && !identifier.includes('bs ');
        else if (program === 'dit') matchesProgram = identifier.includes('dit');
        else if (program === 'ukl3') matchesProgram = identifier.includes('level 3') || identifier.includes('uk');
        else if (program === 'bs') matchesProgram = identifier.includes('bs');
      }
      return matchesGender && matchesProgram;
    });
  }, [data.students, data.admissions, gender, program]);

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

      return matchesSearch && matchesFee && matchesDefaulter && matchesSubject;
    });
  }, [mergedStudents, debouncedSearch, monthlyFeeFilter, defaulterFilter, subjectFilter]);

  // Handle pagination for better performance
  const ITEMS_PER_PAGE = 30;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);

  // Reset pagination when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, monthlyFeeFilter, defaulterFilter, subjectFilter]);

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
              {gender === 'Male' ? 'Boys Campus' : 'Girls Campus'}
            </h3>
            <span className="text-slate-300 text-2xl">/</span>
            <span className="urdu-text text-2xl text-superior-gold font-medium">
              {gender === 'Male' ? 'بوائز کیمپس' : 'گرلز کیمپس'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
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
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
            <div className="bg-superior-teal h-28 relative">
              <div className="absolute -bottom-14 left-8">
                <div className="w-28 h-28 rounded-3xl border-4 border-white bg-slate-100 overflow-hidden shadow-xl shadow-superior-teal/10">
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
              <div className="absolute top-5 right-6">
                {getDefaulterBadge(student)}
              </div>
            </div>
            <div className="pt-18 pb-8 px-8 bg-white">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-display font-black text-2xl text-slate-800 tracking-tight leading-tight">
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

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Academic Group</p>
                  <p className="text-xs font-black text-superior-teal truncate">{student.group}</p>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Attendance</p>
                  <p className="text-xs font-black text-emerald-600">
                    {Math.round((student.attendance.present / (student.attendance.present + student.attendance.absent || 1)) * 100)}% Present
                  </p>
                </div>
              </div>

              <Separator className="mb-6 bg-slate-100" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Package / Installment</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-display font-black text-slate-800 tracking-tight">Rs. {(student.monthlyFee || 0).toLocaleString()}</p>
                    <span className="text-[10px] font-bold text-rose-500 underline decoration-rose-500/30">Bal: {((student.feeLedger?.remainingBalance || (student.totalPackage || 0) - (student.feeReceived || 0)) / 1000).toFixed(1)}k</span>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50 shadow-sm transition-all active:scale-95" 
                    onClick={() => {
                      setSelectedStudent(student);
                      setDialogType('profile');
                    }}
                  >
                    <Eye size={14} className="mr-2 text-superior-teal" /> Profile
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest text-superior-teal border-superior-teal/20 hover:bg-superior-teal/5 shadow-sm transition-all active:scale-95"
                    onClick={() => {
                      setSelectedStudent(student);
                      setDialogType('pay');
                    }}
                  >
                    <CreditCard size={14} className="mr-2" /> Pay Fee
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-11 w-11 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all flex items-center justify-center text-slate-400 outline-hidden">
                      <MoreHorizontal size={18} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[200px] border-slate-100 shadow-2xl">
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
                        <Edit size={16} className="text-superior-gold" /> Edit Details
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
              </div>
            </div>
          </motion.div>
        ))}
      </div>

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

      <Dialog open={dialogType === 'profile'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] overflow-y-auto p-0 border-none bg-white rounded-3xl">
          {selectedStudent && (
            <StudentProfile 
              student={selectedStudent} 
              data={data} 
              onEdit={() => setDialogType('edit')}
              onDownloadReceipt={() => setDialogType('receipt')}
              onPay={(month, year) => {
                setPayConfig({ month, year });
                setDialogType('pay');
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'pay'} onOpenChange={(open) => !open && setDialogType(null)}>
        {selectedStudent && (
          <PayFeeDialog 
            student={selectedStudent} 
            data={data} 
            initialMonth={payConfig.month} 
            initialYear={payConfig.year} 
            onClose={() => {
              setDialogType(null);
              setPayConfig({});
            }} 
          />
        )}
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

function StudentProfile({ student, data, onEdit, onPay, onDownloadReceipt }: { student: Student, data: any, onEdit?: () => void, onPay?: (month: string, year: number) => void, onDownloadReceipt?: () => void }) {
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
        <Tabs defaultValue="overview" className="w-full">
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
                <Button size="sm" variant="outline" className="text-xs">
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
                  {/* Show specific monthly installments first */}
                  {student.feeHistory.map((fee) => (
                    <TableRow key={fee.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">Installment: {fee.month} {fee.year}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly Dues</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-600">Rs. {(fee.amountPaid || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-slate-500">{fee.datePaid || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 text-slate-600 border-none text-[9px]">INT-FEE</Badge>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Show Ledger Transactions (like Initial Admission Payment) */}
                  {(student.feeLedger?.transactions || []).map((tx: any) => (
                    <TableRow key={tx.id} className="hover:bg-slate-50/50 transition-colors bg-slate-50/20">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-superior-teal">{tx.description}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{tx.paymentMethod} Payment</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-superior-teal">Rs. {(tx.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-slate-500">{tx.date}</TableCell>
                      <TableCell>
                        <Badge className="bg-superior-gold/20 text-superior-teal border-none text-[9px]">{tx.receiptId || 'TRANS'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}

                  {student.feeHistory.length === 0 && (!student.feeLedger?.transactions || student.feeLedger.transactions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-slate-400 italic">No specific payment records found. Total received is reflected in summary.</TableCell>
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
                <Label>Session (e.g. 2026-28)</Label>
                <Input value={formData.session || ""} onChange={e => setFormData({...formData, session: e.target.value})} />
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
            <Input value={formData.section || ""} onChange={e => setFormData({...formData, section: e.target.value.toUpperCase()})} />
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

function PayFeeDialog({ student, data, initialMonth, initialYear, onClose }: { student: Student, data: any, initialMonth?: string, initialYear?: number, onClose?: () => void }) {
  const [amount, setAmount] = useState(String(student.monthlyFee || 0));
  const [month, setMonth] = useState(initialMonth || 'March');
  const [year, setYear] = useState(initialYear || 2026);

  const lastPayment = student.feeLedger?.transactions?.[0];
  const totalPaid = student.feeLedger?.totalReceived || student.feeReceived || 0;
  const totalPackage = student.totalPackage || student.feeLedger?.totalPackage || 0;
  const remainingBal = totalPackage - totalPaid;
  const paidCount = Math.floor(totalPaid / (student.monthlyFee || 1));
  const totalCount = student.totalInstallments || 12;

  const handlePay = () => {
    const paid = Number(amount);
    if (paid <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const payment: FeePayment = {
      id: `pay-${Date.now()}`,
      month,
      year,
      amountDue: student.monthlyFee,
      amountPaid: paid,
      datePaid: new Date().toISOString().split('T')[0],
      status: paid >= student.monthlyFee ? 'Paid' : 'Partial'
    };

    data.recordFeePayment(student.id, payment, data.currentUser?.email);
    if (onClose) onClose();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="text-2xl font-serif text-superior-teal tracking-tight flex items-center gap-2">
          <Wallet size={24} /> Record Installment
        </DialogTitle>
        <DialogDescription>Review student financial history before confirming payment</DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6 py-2">
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-superior-teal/10 flex items-center justify-center text-superior-teal font-black text-xl">
            {student.fullName.charAt(0)}
          </div>
          <div>
            <p className="font-black text-slate-800 tracking-tight">{student.fullName}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.id}</p>
          </div>
        </div>

        {/* Financial Diagnostics */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] uppercase font-black text-white/40 tracking-widest mb-1">Total Package</p>
              <p className="text-lg font-bold text-superior-gold">Rs. {totalPackage.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase font-black text-white/40 tracking-widest mb-1">Remaining Balance</p>
              <p className="text-lg font-bold text-rose-400">Rs. {remainingBal.toLocaleString()}</p>
            </div>
          </div>
          <div className="h-px bg-white/10" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] uppercase font-black text-white/40 tracking-widest mb-1">Last Payment</p>
              <p className="text-sm font-semibold">{lastPayment ? lastPayment.date : 'None'}</p>
              {lastPayment && (
                <p className="text-[10px] text-emerald-400">By: {lastPayment.recordedBy || 'Admin'}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase font-black text-white/40 tracking-widest mb-1">Installments Tracking</p>
              <p className="text-sm font-semibold text-superior-gold">{paidCount} / {totalCount} months paid</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase text-slate-500">Target Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase text-slate-500">Target Year</Label>
            <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-bold uppercase text-slate-500">Amount to Receive (Rs.)</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">Rs.</span>
            <Input 
              type="number" 
              className="pl-12 h-14 text-xl font-black bg-slate-50 border-2 border-slate-100 focus:border-superior-teal rounded-2xl" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex justify-between items-center px-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Standard Installment: Rs. {(student.monthlyFee || 0).toLocaleString()}</p>
            <Badge variant="outline" className="text-[10px] border-emerald-100 text-emerald-600 font-bold">Plan Verified</Badge>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <Button variant="ghost" className="flex-1 font-bold h-12" type="button" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-superior-teal text-white hover:bg-superior-teal/90 font-bold h-12 rounded-xl shadow-lg shadow-superior-teal/20" onClick={handlePay}>
            Confirm Payment
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function PerformanceStat({ label, value, color }: { label: string, value: string, color: string }) {
  const colors: any = {
    teal: "bg-superior-teal/5 text-superior-teal border-superior-teal/10",
    gold: "bg-superior-gold/10 text-superior-gold border-superior-gold/20",
    slate: "bg-slate-50 text-slate-600 border-slate-200"
  };

  return (
    <div className={cn("p-6 rounded-2xl border text-center", colors[color])}>
      <p className="text-[10px] uppercase font-bold mb-1 opacity-70">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
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
