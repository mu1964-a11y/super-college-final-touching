
import * as React from 'react';
import { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Eye, 
  CheckCircle2, 
  Plus,
  ArrowUpDown,
  Download,
  Camera,
  Upload,
  School,
  User,
  Trash2,
  Calendar as CalendarIcon,
  CreditCard,
  GraduationCap,
  Users,
  AlertCircle,
  Info,
  Receipt,
  Clock,
  Shield,
  Wallet,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  Globe,
  Layers,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
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
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SUBJECTS, ACADEMIC_GROUPS, COMPULSORY_SUBJECTS } from '../constants';
import { Admission, AdmissionStatus, Gender } from '../types';
import { HighlightText } from './HighlightText';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import FeeReceipt from './FeeReceipt';
import AdmissionSlip from './AdmissionSlip';
import { compressImage, base64ToBlob } from '../lib/imageUtils';

export default function AdmissionsView({ data, initialFilter, selectedSession, program }: { data: any, initialFilter?: string | null, selectedSession?: string, program?: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [feeFilter, setFeeFilter] = useState<string>(initialFilter || 'all');
  const [admittedFilter, setAdmittedFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-new');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedAdmissions, setSelectedAdmissions] = useState<string[]>([]);
  const [activeAdmission, setActiveAdmission] = useState<Admission | null>(null);
  const [dialogType, setDialogType] = useState<'profile' | 'edit' | 'slip' | 'receipt' | 'delete' | 'bulkDelete' | null>(null);

  // Sync with initialFilter if it changes from sidebar
  React.useEffect(() => {
    if (initialFilter) {
      setFeeFilter(initialFilter);
    }
  }, [initialFilter]);

  const filteredAdmissions = useMemo(() => {
    return data.admissions
      .filter((a: Admission) => {
        const matchesSearch = (a.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (a.fatherName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (a.studentId && a.studentId.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFee = feeFilter === 'all' || a.status === feeFilter;
        const matchesGender = genderFilter === 'all' || a.gender === genderFilter;
        
        let matchesProgram = true;
        if (program) {
             const groupLower = (a.group || '').toLowerCase();
             if (program === 'fsc') matchesProgram = !groupLower.includes('dit') && !groupLower.includes('level 3') && !groupLower.includes('bs ');
             else if (program === 'dit') matchesProgram = groupLower.includes('dit');
             else if (program === 'ukl3') matchesProgram = groupLower.includes('level 3');
             else if (program === 'bs') matchesProgram = groupLower.includes('bs ');
        }
        
        // Diversion Logic: Only show students who are NOT yet fully admitted (haven't paid initial fee)
        const isFullyEnrolled = a.isAdmitted || (a.feeReceived > 0);
        const matchesAdmitted = admittedFilter === 'all' || 
                               (admittedFilter === 'Admitted' && isFullyEnrolled) ||
                               (admittedFilter === 'Prospective' && !isFullyEnrolled);
        
        return matchesSearch && matchesFee && matchesGender && matchesAdmitted && matchesProgram;
      })
      .sort((a: Admission, b: Admission) => {
        if (sortBy === 'date-new') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'date-old') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'name-az') return (a.fullName || '').localeCompare(b.fullName || '');
        if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
        return 0;
      });
  }, [data.admissions, searchTerm, feeFilter, admittedFilter, genderFilter, sortBy]);

  const summaryStats = useMemo(() => {
    return data.admissions.reduce((acc: any, a: any) => {
      const received = Number(a.feeReceived || 0);
      const total = Number(a.totalPackage || 0);
      
      if (received >= total && total > 0) {
        acc.fullPaid++;
      } else if (received > 0) {
        acc.partialPaid++;
      } else {
        acc.unpaid++;
      }
      
      return acc;
    }, { total: data.admissions.length, fullPaid: 0, partialPaid: 0, unpaid: 0 });
  }, [data.admissions]);

  // Handle pagination for better performance
  const [displayCount, setDisplayCount] = useState(50);
  const visibleAdmissions = useMemo(() => filteredAdmissions.slice(0, displayCount), [filteredAdmissions, displayCount]);
  const hasMore = filteredAdmissions.length > displayCount;

  const getStatusBadge = (status: AdmissionStatus, isAdmitted: boolean) => {
    if (!isAdmitted) return <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg">Pending</Badge>;
    
    switch (status) {
      case 'Full Paid': return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg">Full Paid</Badge>;
      case 'Partial Paid': return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg">Partial Paid</Badge>;
      case 'Not Paid': return <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg">Unpaid</Badge>;
      case 'Admitted/Confirmed': return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg">Confirmed</Badge>;
      default: return <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg">{status || 'Pending'}</Badge>;
    }
  };

  const handleConfirm = (id: string) => {
    data.confirmAdmission(id, data.currentUser?.email);
  };

  const toggleSelectAll = () => {
    if (selectedAdmissions.length === filteredAdmissions.length) {
      setSelectedAdmissions([]);
    } else {
      setSelectedAdmissions(filteredAdmissions.map((a: Admission) => a.id));
    }
  };

  const toggleSelectAdmission = (id: string) => {
    setSelectedAdmissions(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    setDialogType('bulkDelete');
  };

  const handleExportCSV = () => {
    const exportData = filteredAdmissions.map(a => ({
      'Student ID': a.studentId || 'PENDING',
      'Registration #': a.id,
      'Name': a.fullName,
      'Father Name': a.fatherName,
      'Gender': a.gender,
      'DOB': a.dob,
      'CNIC': a.cnic,
      'Category': a.category,
      'Program/Group': a.group,
      'Session': a.session,
      'Total Package': a.totalPackage || '',
      'Status': a.status
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
      link.setAttribute('download', `admissions_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredAdmissions.map(a => ({
      'Student ID': a.studentId || 'PENDING',
      'Registration #': a.id,
      'Name': a.fullName,
      'Father Name': a.fatherName,
      'Gender': a.gender,
      'DOB': a.dob,
      'CNIC': a.cnic,
      'Category': a.category,
      'Program/Group': a.group,
      'Session': a.session,
      'Total Package': a.totalPackage || '',
      'Status': a.status
    }));
    
    if (exportData.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Admissions");
    XLSX.writeFile(wb, `admissions_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-display font-black text-superior-teal tracking-tight">
              Admission Pipeline
            </h2>
            <span className="text-slate-300 text-2xl">/</span>
            <span className="urdu-text text-2xl text-superior-gold font-medium">ایڈمیشن پائپ لائن</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleExportCSV} variant="outline" className="rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-slate-50 transition-all">
            <Download size={16} className="mr-2 text-superior-gold" /> Export CSV
          </Button>
          <Button onClick={handleExportExcel} variant="outline" className="rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-slate-50 transition-all">
            <Download size={16} className="mr-2 text-emerald-600" /> Export Excel
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger nativeButton={true} render={
              <button className="h-12 px-8 rounded-xl bg-superior-teal text-white font-black uppercase tracking-widest text-[10px] hover:bg-superior-teal/90 transition-all shadow-xl shadow-superior-teal/10 flex items-center justify-center">
                <Plus size={18} className="mr-2" /> New Admission
              </button>
            }>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] w-[90vw] max-h-[92vh] overflow-y-auto rounded-[2.5rem] border-none p-0 shadow-2xl">
              <div className="bg-superior-teal p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-40 -mt-40 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-superior-gold/10 rounded-full blur-2xl" />
                <DialogHeader className="relative z-10">
                  <DialogTitle className="text-4xl font-display font-black tracking-tight uppercase">
                    Student Admission Form
                  </DialogTitle>
                  <p className="text-white/60 text-xs font-black uppercase tracking-[0.3em] mt-2">Session 2026–2027 · Jahanian Campus</p>
                </DialogHeader>
              </div>
            <div className="p-10">
              {isAddDialogOpen && (
                <AdmissionForm 
                  data={data} 
                  onClose={() => setIsAddDialogOpen(false)} 
                  selectedSession={selectedSession} 
                  program={program} 
                />
              )}
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <SummaryCard 
          label="Total Applicants" 
          value={summaryStats.total} 
          active={feeFilter === 'all' && admittedFilter === 'all'} 
          onClick={() => {
            setFeeFilter('all');
            setAdmittedFilter('all');
          }}
          hoverColor="hover:border-superior-teal/30"
          iconColor="text-superior-teal"
          bgColor="bg-superior-teal/5"
          icon={Users}
        />
        <SummaryCard 
          label="Full Paid" 
          value={summaryStats.fullPaid} 
          active={feeFilter === 'Full Paid'} 
          onClick={() => setFeeFilter('Full Paid')}
          hoverColor="hover:border-emerald-500/30"
          iconColor="text-emerald-600"
          bgColor="bg-emerald-50"
          icon={CheckCircle2}
        />
        <SummaryCard 
          label="Partial Paid" 
          value={summaryStats.partialPaid} 
          active={feeFilter === 'Partial Paid'} 
          onClick={() => setFeeFilter('Partial Paid')}
          hoverColor="hover:border-superior-gold/30"
          iconColor="text-superior-gold"
          bgColor="bg-superior-gold/5"
          icon={CreditCard}
        />
        <SummaryCard 
          label="Unpaid" 
          value={summaryStats.unpaid} 
          active={feeFilter === 'Not Paid'} 
          onClick={() => setFeeFilter('Not Paid')}
          hoverColor="hover:border-rose-500/30"
          iconColor="text-rose-600"
          bgColor="bg-rose-50"
          icon={AlertCircle}
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-5 mb-8 hover:border-superior-teal/20 transition-all duration-500">
        <div className="relative flex-1 min-w-[320px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Search by name, father name or ID..." 
            className="pl-12 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <Select value={admittedFilter} onValueChange={setAdmittedFilter}>
            <SelectTrigger className="w-[170px] h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-slate-700">
              <SelectValue placeholder="Admission" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              <SelectItem value="all">All Applicants</SelectItem>
              <SelectItem value="Admitted">Admitted Only</SelectItem>
              <SelectItem value="Prospective">Prospective Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={feeFilter} onValueChange={setFeeFilter}>
            <SelectTrigger className="w-[180px] h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-slate-700">
              <SelectValue placeholder="Fee Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Full Paid">Full Paid</SelectItem>
              <SelectItem value="Partial Paid">Partial Paid</SelectItem>
              <SelectItem value="Not Paid">Not Paid</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="h-12 w-12 rounded-xl border-slate-100 bg-slate-50 hover:bg-white transition-all p-0">
            <Filter size={18} className="text-slate-400" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedAdmissions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-4 z-30 flex items-center justify-between p-4 bg-superior-teal rounded-2xl shadow-2xl text-white mb-6 border border-white/10"
        >
          <div className="flex items-center gap-4 pl-2">
            <Checkbox 
              checked={selectedAdmissions.length === filteredAdmissions.length} 
              onCheckedChange={toggleSelectAll} 
              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-superior-teal"
            />
            <div className="flex flex-col">
              <p className="text-sm font-black uppercase tracking-widest">
                {selectedAdmissions.length} record{selectedAdmissions.length > 1 ? 's' : ''} selected
              </p>
              {selectedAdmissions.length < filteredAdmissions.length && (
                <button 
                  onClick={() => setSelectedAdmissions(filteredAdmissions.map(a => a.id))}
                  className="text-[10px] font-black underline uppercase tracking-tighter opacity-70 hover:opacity-100 text-left"
                >
                  Select all {filteredAdmissions.length} matching records
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedAdmissions([])}
              className="h-10 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 font-black text-[10px] uppercase tracking-widest px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkDelete}
              variant="destructive" 
              className="h-10 rounded-xl bg-white text-rose-600 hover:bg-rose-50 border-none font-black text-[10px] uppercase tracking-widest px-6 shadow-lg shadow-black/20"
            >
              <Trash2 size={14} className="mr-2" /> Delete All Selected
            </Button>
          </div>
        </motion.div>
      )}

      {/* Admissions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[60px] pl-8">
                  <Checkbox 
                    checked={selectedAdmissions.length === filteredAdmissions.length && filteredAdmissions.length > 0} 
                    onCheckedChange={toggleSelectAll} 
                    className="rounded-md border-slate-300"
                  />
                </TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Student ID</TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Applicant</TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Father Name</TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Contact</TableHead>
                <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Total Fee</TableHead>
                <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Received</TableHead>
                <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Remaining</TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Status</TableHead>
                <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-5 pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleAdmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Search size={48} className="mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-xs">No records found</p>
                      <p className="text-xs mt-1">Try adjusting your search or filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visibleAdmissions.map((admission: Admission) => {
                  const isNew = data.isNewRecord?.(admission.id, admission.date);
                  return (
                  <TableRow 
                    key={admission.id} 
                    onClick={() => {
                        data.markActioned?.(admission.id);
                        toggleSelectAdmission(admission.id);
                    }}
                    className={cn(
                    "group transition-all border-slate-50 cursor-pointer relative",
                    selectedAdmissions.includes(admission.id) ? "bg-superior-bg-teal" : "hover:bg-slate-50/50",
                    isNew && !admission.isAdmitted ? "bg-red-50/20 border-l-[3px] border-l-red-500 hover:bg-red-50" : ""
                  )}>
                    <TableCell className="pl-8 relative">
                      {isNew && !admission.isAdmitted && (
                         <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
                      )}
                      <Checkbox 
                        checked={selectedAdmissions.includes(admission.id)} 
                        onCheckedChange={() => toggleSelectAdmission(admission.id)} 
                        className="rounded-md border-slate-300"
                      />
                    </TableCell>
                    <TableCell>
                      {admission.studentId ? (
                        <div className="flex flex-col">
                          <span className="text-[11px] font-mono font-black text-superior-teal tracking-tighter leading-none mb-1">{admission.studentId}</span>
                          <span className="text-[9px] text-slate-300 font-medium">#{admission.id.slice(-6)}</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-slate-50 text-slate-300 border-slate-100 px-2 py-0">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-sm font-black text-superior-teal overflow-hidden border border-slate-200">
                          {admission.photo ? (
                            <img 
                              src={admission.photo} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  // Use standard DOM or better yet, just hide it and show nothing
                                  // But for now, let's just make it hidden and let CSS handle default
                                }
                              }}
                            />
                          ) : (
                            admission.fullName.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm uppercase tracking-tight flex items-center gap-2">
                            <HighlightText text={admission.fullName} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                            {isNew && !admission.isAdmitted && <span className="text-[9px] font-black uppercase text-red-500 tracking-widest bg-red-100 px-2 py-0.5 rounded-md">New</span>}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">{admission.date}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 font-bold text-sm">
                      <HighlightText text={admission.fatherName} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs font-bold">
                      <HighlightText text={admission.contactNumber} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-800 text-sm">Rs. {(admission.totalPackage || admission.totalFeeFinalized || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-black text-sm">Rs. {(admission.feeReceived || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-rose-600 font-black text-sm">Rs. {((admission.totalPackage || admission.totalFeeFinalized || 0) - (admission.feeReceived || 0)).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(admission.status, admission.isAdmitted)}</TableCell>
                    <TableCell className="text-right pr-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-10 w-10 rounded-xl hover:bg-white hover:border-slate-200 border border-transparent transition-all flex items-center justify-center text-slate-400 outline-hidden">
                          <MoreHorizontal size={18} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[200px] border-slate-200 shadow-xl">
                          <DropdownMenuItem 
                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700" 
                            onClick={() => {
                              setActiveAdmission(admission);
                              setDialogType('profile');
                            }}
                          >
                            <Eye size={16} className="text-superior-teal" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700" 
                            onClick={() => {
                              setActiveAdmission(admission);
                              setDialogType('edit');
                            }}
                          >
                            <Edit size={16} className="text-superior-gold" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-superior-teal"
                            onClick={() => {
                              setActiveAdmission(admission);
                              setDialogType('slip');
                            }}
                          >
                            <Download size={16} /> Download Slip
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-superior-gold"
                            onClick={() => {
                              setActiveAdmission(admission);
                              setDialogType('receipt');
                            }}
                          >
                            <Receipt size={16} /> Fee Receipt (Bakaya)
                          </DropdownMenuItem>
                          <Separator className="my-2 bg-slate-100" />
                          <DropdownMenuItem 
                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-rose-600 hover:bg-rose-50"
                            onClick={() => {
                              setActiveAdmission(admission);
                              setDialogType('delete');
                            }}
                          >
                            <Trash2 size={16} /> Delete Record
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button 
            variant="outline" 
            onClick={() => setDisplayCount(prev => prev + 50)}
            className="rounded-2xl border-slate-200 text-slate-500 hover:text-superior-teal hover:bg-superior-teal/5 font-bold px-8 h-12"
          >
            Load More Applicants ({filteredAdmissions.length - displayCount} remaining)
          </Button>
        </div>
      )}

      {/* Centralized Dialogs */}
      <Dialog open={dialogType === 'delete'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">Delete Admission Record</DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete the admission record for <span className="font-bold text-slate-800">{activeAdmission?.fullName}</span>? This action is permanent and cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertCircle size={24} />
              </div>
              <p className="text-xs text-red-700 font-medium">Deleting this record will remove all associated fee history and academic data from the system.</p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setDialogType(null)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
            <Button variant="destructive" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={() => {
              if (activeAdmission) {
                data.deleteAdmission(activeAdmission.id);
                setDialogType(null);
              }
            }}>Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'bulkDelete'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">Bulk Delete Admissions</DialogTitle>
            <DialogDescription className="text-slate-500">
              You are about to delete <span className="font-bold text-slate-800">{selectedAdmissions.length}</span> selected admission records.
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
              const idsToDelete = [...selectedAdmissions];
              setDialogType(null);
              setSelectedAdmissions([]);
              await data.bulkDeleteAdmissions(idsToDelete);
            }}>Delete All Selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'profile'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] overflow-y-auto p-0 border-none bg-white rounded-3xl">
          {activeAdmission && (
            <AdmissionProfile 
              admission={activeAdmission} 
              data={data} 
              onEdit={() => setDialogType('edit')}
              onDownloadReceipt={() => setDialogType('receipt')}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'edit'} onOpenChange={(open) => !open && setDialogType(null)}>
        {activeAdmission && (
          <EditAdmissionDialog 
            admission={activeAdmission} 
            data={data} 
            onClose={() => setDialogType(null)} 
            onDelete={() => setDialogType('delete')}
          />
        )}
      </Dialog>

      <Dialog open={dialogType === 'slip'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] overflow-y-auto p-0 border-none bg-white rounded-3xl">
          {activeAdmission && <AdmissionSlip admission={activeAdmission} settings={data.settings} />}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'receipt'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] overflow-y-auto p-0 border-none bg-white rounded-3xl">
          {activeAdmission && <FeeReceipt student={activeAdmission} settings={data.settings} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdmissionActionCell({ admission, data }: { admission: Admission, data: any }) {
  return null; // No longer used, refactored into main view for stability
}

function EditAdmissionDialog({ admission, data, onClose, onDelete }: { admission: Admission, data: any, onClose?: () => void, onDelete?: () => void }) {
  const [formData, setFormData] = useState({
    fullName: admission.fullName || '',
    fatherName: admission.fatherName || '',
    collegeNo: admission.collegeNo || '',
    bayFormNo: admission.bayFormNo || '',
    dob: admission.dob || '',
    previousClass: admission.previousClass || '10th',
    boardRollNo: admission.boardRollNo || '',
    previousMarks: String(admission.previousMarks || 0),
    previousInstitute: admission.previousInstitute || '',
    subjects: admission.subjects || [],
    address: admission.address || '',
    admissionFee: String(admission.admissionFee || 0),
    miscFunds: String(admission.miscFunds || 0),
    totalFeeFinalized: String(admission.totalFeeFinalized || 0),
    totalPackage: admission.totalPackage || 0,
    feeReceived: String(admission.feeReceived || 0),
    paymentPlan: admission.paymentPlan || 'Installments',
    paidMonths: admission.paidMonths || [],
    paidInstallments: admission.paidInstallments || 0,
    totalInstallments: admission.totalInstallments || 12,
    nextInstallmentDate: admission.nextInstallmentDate || '',
    totalSemesters: admission.totalSemesters || 0,
    feePerSemester: admission.feePerSemester || 0,
    nextSemesterDueDate: admission.nextSemesterDueDate || '',
    contactNumber: admission.contactNumber || '',
    fatherContact: admission.fatherContact || '',
    secondaryContact: admission.secondaryContact || '',
    email: admission.email || '',
    bloodGroup: admission.bloodGroup || '',
    reference: admission.reference || '',
    gender: admission.gender || 'Male',
    category: admission.category || 'Inter Part-1 Boys',
    group: admission.group || '',
    section: admission.section || '',
    photo: admission.photo || '',
    studentId: admission.studentId || '',
    status: admission.status || 'Prospective',
    programType: admission.programType || (String(admission.group).toLowerCase().includes('dit') || String(admission.group).toLowerCase().includes('uk') || String(admission.group).toLowerCase().includes('level 3') ? 'Semester' : 'Yearly'),
    currentSemester: admission.currentSemester || ( (String(admission.group).toLowerCase().includes('dit') || String(admission.group).toLowerCase().includes('uk') || String(admission.group).toLowerCase().includes('level 3')) ? 1 : 0 )
  });

  // Sync form data when admission changes to prevent data leakage between records
  React.useEffect(() => {
    setFormData({
      fullName: admission.fullName || '',
      fatherName: admission.fatherName || '',
      collegeNo: admission.collegeNo || '',
      bayFormNo: admission.bayFormNo || '',
      dob: admission.dob || '',
      previousClass: admission.previousClass || '10th',
      boardRollNo: admission.boardRollNo || '',
      previousMarks: String(admission.previousMarks || 0),
      previousInstitute: admission.previousInstitute || '',
      subjects: admission.subjects || [],
      address: admission.address || '',
      admissionFee: String(admission.admissionFee || 0),
      miscFunds: String(admission.miscFunds || 0),
      totalFeeFinalized: String(admission.totalFeeFinalized || 0),
      totalPackage: admission.totalPackage || 0,
      feeReceived: String(admission.feeReceived || 0),
      paymentPlan: admission.paymentPlan || 'Installments',
      paidMonths: admission.paidMonths || [],
      paidInstallments: admission.paidInstallments || 0,
      totalInstallments: admission.totalInstallments || 12,
      nextInstallmentDate: admission.nextInstallmentDate || '',
      totalSemesters: admission.totalSemesters || 0,
      feePerSemester: admission.feePerSemester || 0,
      nextSemesterDueDate: admission.nextSemesterDueDate || '',
      contactNumber: admission.contactNumber || '',
      fatherContact: admission.fatherContact || '',
      secondaryContact: admission.secondaryContact || '',
      email: admission.email || '',
      bloodGroup: admission.bloodGroup || '',
      reference: admission.reference || '',
      gender: admission.gender || 'Male',
      category: admission.category || 'Inter Part-1 Boys',
      group: admission.group || '',
      section: admission.section || '',
      photo: admission.photo || '',
      studentId: admission.studentId || '',
      status: admission.status || 'Prospective',
      programType: admission.programType || (String(admission.group).toLowerCase().includes('dit') || String(admission.group).toLowerCase().includes('uk') || String(admission.group).toLowerCase().includes('level 3') ? 'Semester' : 'Yearly'),
      currentSemester: admission.currentSemester || ( (String(admission.group).toLowerCase().includes('dit') || String(admission.group).toLowerCase().includes('uk') || String(admission.group).toLowerCase().includes('level 3')) ? 1 : 0 )
    });
  }, [admission.id]);

  // Auto-calculate Total Package
  React.useEffect(() => {
    const total = Number(formData.admissionFee || 0) + 
                  Number(formData.miscFunds || 0) + 
                  Number(formData.totalFeeFinalized || 0);
    setFormData(prev => ({ ...prev, totalPackage: total }));
  }, [formData.admissionFee, formData.miscFunds, formData.totalFeeFinalized]);

  // Auto-confirm admission and allot ID when received amount is entered in Edit Dialog
  React.useEffect(() => {
    if (Number(formData.feeReceived) > 0 && !formData.studentId) {
      const studentId = data.generateStudentId(formData.group);
      setFormData(prev => ({ 
        ...prev, 
        studentId: studentId,
        status: 'Admitted/Confirmed'
      }));
      toast.success(`Official Student ID Allotted: ${studentId}`);
    }
  }, [formData.feeReceived]);

  const handleGroupChange = (groupName: string) => {
    const group = ACADEMIC_GROUPS.find(g => g.name === groupName);
    if (group) {
      const newSubjects = Array.from(new Set([...COMPULSORY_SUBJECTS, ...group.subjects]));
      
      // Auto-logic for Semester Programs
      let paymentPlan = formData.paymentPlan;
      let totalSemesters = formData.totalSemesters;
      let programType = 'Yearly' as 'Yearly' | 'Semester';
      let currentSemester = formData.currentSemester;
      
      const lowerGroupName = groupName.toLowerCase();
      if (lowerGroupName.includes('dit') || lowerGroupName.includes('uk') || lowerGroupName.includes('level 3')) {
        paymentPlan = 'Semester';
        totalSemesters = lowerGroupName.includes('dit') ? 4 : 3;
        programType = 'Semester';
        currentSemester = currentSemester || 1;
        toast.info(`${groupName} follows a Semester System. Plan adjusted automatically.`);
      }

      setFormData(prev => ({ 
        ...prev, 
        group: groupName, 
        subjects: newSubjects,
        paymentPlan,
        totalSemesters,
        programType,
        currentSemester
      }));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const toastId = toast.loading("Processing photo...");
      try {
        const compressedBase64 = await compressImage(file);
        setFormData(prev => ({ 
          ...prev, 
          photo: compressedBase64
        }));
        toast.dismiss(toastId);
        toast.success(`Photo updated successfully`);
      } catch (err) {
        console.error('Photo processing error:', err);
        toast.dismiss(toastId);
        toast.error("Failed to process photo.");
      }
    }
  };

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: (prev.subjects || []).includes(subject) 
        ? (prev.subjects || []).filter(s => s !== subject) 
        : [...(prev.subjects || []), subject]
    }));
  };

  const handleSave = () => {
    const finalized = Number(formData.totalFeeFinalized);
    const totalPkg = formData.totalPackage;
    const received = Number(formData.feeReceived);
    
    let status: AdmissionStatus = formData.status as AdmissionStatus;
    if (received >= totalPkg && totalPkg > 0) status = 'Full Paid';
    else if (received > 0) status = 'Partial Paid';
    else if (formData.status === 'Not Paid' || !formData.status) status = 'Not Paid';

    data.updateAdmission(admission.id, {
      ...formData,
      previousMarks: Number(formData.previousMarks),
      admissionFee: Number(formData.admissionFee),
      miscFunds: Number(formData.miscFunds),
      totalFeeFinalized: finalized,
      totalPackage: totalPkg,
      feeReceived: received,
      isAdmitted: formData.status === 'Admitted/Confirmed' || received > 0,
      status
    });
    if (onClose) onClose();
  };

  return (
    <DialogContent className="max-w-[90vw] w-[90vw] max-h-[92vh] overflow-y-auto p-6 bg-white rounded-3xl">
      <DialogHeader className="border-b border-slate-100 pb-4">
        <DialogTitle className="text-3xl font-black text-superior-teal uppercase tracking-tight flex items-center gap-3">
           <Edit className="text-superior-gold" /> Edit Admission Instance
        </DialogTitle>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Refining Student Enrollment & Financial Data</p>
      </DialogHeader>
      
      <div className="max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="space-y-10 py-6">
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
          <div className="relative group">
            <div className="w-28 h-28 rounded-3xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-superior-teal shadow-inner">
              {formData.photo ? (
                <img 
                  src={formData.photo} 
                  alt="" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-superior-gold/10 text-superior-gold font-bold text-3xl">${formData.fullName.charAt(0)}</div>`;
                    }
                  }}
                />
              ) : (
                <>
                  <Camera className="text-slate-300 mb-1" size={24} />
                  <span className="text-[9px] text-slate-400 font-black uppercase text-center px-4">Upload Photo</span>
                </>
              )}
            </div>
            <label className="absolute inset-0 cursor-pointer">
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
            {formData.studentId && (
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-lg">
                <CheckCircle2 size={16} />
              </div>
            )}
          </div>
          <div className="mt-4 text-center">
            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              {formData.fullName || "Student Name"}
            </h4>
            <div className="flex items-center gap-2 mt-1 justify-center">
              {formData.studentId ? (
                <Badge className="bg-superior-teal text-white font-mono text-xs px-3">{formData.studentId}</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-black uppercase text-slate-400">ID Pending Admission</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Personal Details */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
             <div className="w-10 h-10 rounded-xl bg-superior-teal/10 flex items-center justify-center text-superior-teal">
                <User size={20} />
             </div>
             <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Personal Profile</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Legal Identity & Personal Info</p>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Admission Category</Label>
              <Select value={formData.category || ""} onValueChange={(v: any) => {
                const gender = v.includes('Girls') ? 'Female' : 'Male';
                setFormData({...formData, category: v, gender});
              }}>
                <SelectTrigger className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl">
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
              <Label className="text-xs font-black text-slate-500 uppercase">Gender (Auto-set)</Label>
              <Select disabled value={formData.gender || ""}>
                <SelectTrigger className="h-12 bg-slate-50/50 border-slate-100 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Full Name</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Father's Name</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">B-Form / CNIC</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-mono" value={formData.bayFormNo} onChange={e => setFormData({...formData, bayFormNo: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Date of Birth</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl" type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Blood Group</Label>
              <Select value={formData.bloodGroup || ""} onValueChange={v => setFormData({...formData, bloodGroup: v})}>
                <SelectTrigger className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                     <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Permanent Address</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
             <div className="w-10 h-10 rounded-xl bg-superior-gold/10 flex items-center justify-center text-superior-gold">
                <Receipt size={20} />
             </div>
             <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Communication</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Connect with Student & Parents</p>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Student Mobile</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Father's Mobile</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold" value={formData.fatherContact} onChange={e => setFormData({...formData, fatherContact: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Email Address (Optional)</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Section 3: Academic History */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
             <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                <GraduationCap size={20} />
             </div>
             <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Academic Profile</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enrollment & Past Performance</p>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Enrollment Group</Label>
              <Select value={formData.group || ""} onValueChange={handleGroupChange}>
                <SelectTrigger className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold">
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
              <Label className="text-xs font-black text-slate-500 uppercase">Assigned Section</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-black text-lg" value={formData.section || ""} onChange={e => setFormData({...formData, section: e.target.value.toUpperCase()})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">College Roll #</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl" value={formData.collegeNo || ""} onChange={e => setFormData({...formData, collegeNo: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Previous Class</Label>
              <Select value={formData.previousClass || ""} onValueChange={v => setFormData({...formData, previousClass: v as any})}>
                <SelectTrigger className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9th">9th Class</SelectItem>
                  <SelectItem value="10th">10th Class</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Matric / Board Roll #</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl" value={formData.boardRollNo || ""} onChange={e => setFormData({...formData, boardRollNo: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Obtained Marks</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold" type="number" value={formData.previousMarks || ""} onChange={e => setFormData({...formData, previousMarks: e.target.value})} />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label className="text-xs font-black text-slate-500 uppercase">Previous Institute</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl" value={formData.previousInstitute || ""} onChange={e => setFormData({...formData, previousInstitute: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Section 4: Subjects */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
             <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Eye size={20} />
             </div>
             <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Course Selection</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Registered Subjects</p>
             </div>
          </div>
          <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-superior-teal uppercase tracking-widest">Compulsory Subjects</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COMPULSORY_SUBJECTS.map(subject => (
                  <div key={subject} className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-slate-100/50 hover:border-superior-teal transition-all">
                    <Checkbox 
                      id={`edit-comp-subject-${subject}`} 
                      checked={(formData.subjects || []).includes(subject)}
                      onCheckedChange={() => toggleSubject(subject)}
                    />
                    <Label htmlFor={`edit-comp-subject-${subject}`} className="text-[11px] font-black leading-none cursor-pointer text-slate-600">
                      {subject}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-slate-100" />

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-superior-teal uppercase tracking-widest">Elective / Group Subjects</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {SUBJECTS.filter(s => !COMPULSORY_SUBJECTS.includes(s)).map(subject => (
                  <div key={subject} className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-slate-100/50 hover:border-superior-teal transition-all">
                    <Checkbox 
                      id={`edit-subject-${subject}`} 
                      checked={(formData.subjects || []).includes(subject)}
                      onCheckedChange={() => toggleSubject(subject)}
                    />
                    <Label htmlFor={`edit-subject-${subject}`} className="text-[11px] font-bold leading-none cursor-pointer text-slate-700">
                      {subject}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Financials */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
             <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CreditCard size={20} />
             </div>
             <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Financial Commitment</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pricing & Installment Plans</p>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Admission Fee</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold" type="number" value={formData.admissionFee || ""} onChange={e => setFormData({...formData, admissionFee: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Misc / Lab Funds</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold" type="number" value={formData.miscFunds || ""} onChange={e => setFormData({...formData, miscFunds: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Finalized Tuition Fee</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-black text-superior-teal" type="number" value={formData.totalFeeFinalized || ""} onChange={e => setFormData({...formData, totalFeeFinalized: e.target.value})} />
            </div>
            <div className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Package (Auto)</Label>
              <div className="text-xl font-black text-slate-800">
                Rs. {formData.totalPackage.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="p-6 bg-superior-teal/5 rounded-3xl border border-superior-teal/10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-black text-superior-teal uppercase">Fee Received So Far</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rs.</span>
                  <Input 
                    className="h-14 pl-12 border-superior-teal/30 bg-white rounded-2xl text-2xl font-black text-emerald-600 focus:ring-4 focus:ring-superior-teal/5 transition-all" 
                    type="number" 
                    value={formData.feeReceived || ""} 
                    onChange={e => setFormData({...formData, feeReceived: e.target.value})} 
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-500 text-white font-black px-3 py-1">
                  Balance: Rs. {(formData.totalPackage - Number(formData.feeReceived)).toLocaleString()}
                </Badge>
                {Number(formData.feeReceived) > 0 && <span className="text-[10px] font-black text-emerald-600 uppercase">Official Payment Logged</span>}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-xs font-black text-slate-500 uppercase">Billing Strategy</Label>
              <Select value={formData.paymentPlan || ""} onValueChange={(v: any) => setFormData({...formData, paymentPlan: v})}>
                <SelectTrigger className="h-14 bg-white border-slate-200 rounded-2xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semester">Semester Plan</SelectItem>
                  <SelectItem value="Installments">Installment Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 6: Others */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
             <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Search size={20} />
             </div>
             <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Administrative Info</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sourcing & Operational Status</p>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Referral / Source</Label>
              <Input className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl" value={formData.reference || ""} onChange={e => setFormData({...formData, reference: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase">Record Status</Label>
              <Select value={formData.status || ""} onValueChange={(v: any) => setFormData({...formData, status: v})}>
                <SelectTrigger className="h-12 border-slate-200 focus:border-superior-teal/30 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prospective">Prospective (Applicant)</SelectItem>
                  <SelectItem value="Admitted/Confirmed">Admitted (Full Enrollment)</SelectItem>
                  <SelectItem value="Not Paid">Financial: Not Paid</SelectItem>
                  <SelectItem value="Partial Paid">Financial: Partial Paid</SelectItem>
                  <SelectItem value="Full Paid">Financial: Full Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white pt-6 pb-2 border-t border-slate-100 flex justify-between items-center z-10">
          <Button 
            variant="destructive" 
            type="button"
            className="h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] px-6"
            onClick={() => {
              if (onDelete) onDelete();
            }}
          >
            <Trash2 size={16} className="mr-2" /> Delete Record
          </Button>
          <div className="flex gap-4">
            <Button variant="ghost" type="button" onClick={onClose} className="h-12 rounded-xl font-bold px-8">Cancel</Button>
            <Button className="h-12 rounded-xl bg-superior-teal text-white hover:bg-superior-teal/90 px-10 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-superior-teal/20" onClick={handleSave}>
              Save All Changes
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: any, title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
        <Icon size={20} />
      </div>
      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{title}</h3>
    </div>
  );
}

function ProfileItem({ label, value, isFull = false }: { label: string, value: string, isFull?: boolean }) {
  return (
    <div className={isFull ? "col-span-full" : ""}>
      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-[15px] font-bold text-slate-800 leading-tight">{value || '---'}</p>
    </div>
  );
}

function FinanceCard({ label, value, sub, color = 'slate' }: { label: string, value: number | string, sub: string, color?: 'slate' | 'emerald' | 'amber' }) {
  const colors = {
    slate: "bg-slate-50 text-slate-900 border-slate-100",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-100",
    amber: "bg-amber-50 text-amber-900 border-amber-100"
  };

  return (
    <div className={cn("p-8 rounded-[2.5rem] border shadow-sm", colors[color])}>
      <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{label}</p>
      <h4 className="text-3xl font-black tracking-tight">Rs. {Number(value || 0).toLocaleString()}</h4>
      <p className="text-[10px] font-bold uppercase tracking-widest mt-3 opacity-40">{sub}</p>
    </div>
  );
}

function AdmissionProfile({ admission, data, onEdit, onDownloadReceipt }: { admission: Admission, data: any, onEdit?: () => void, onDownloadReceipt?: () => void }) {
  return (
    <div className="w-full bg-slate-50/30 rounded-[3rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50">
      <div className="bg-slate-900 p-10 md:p-14 text-white relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-superior-gold/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-superior-teal/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
        
        <div className="flex flex-col md:flex-row gap-10 md:gap-14 items-center relative z-10">
          <div className="shrink-0 flex flex-col items-center">
            <div className="w-40 h-40 md:w-56 md:h-56 rounded-[3rem] border-8 border-white/5 bg-white/10 backdrop-blur-xl overflow-hidden shadow-2xl transition-transform hover:scale-105 duration-500">
              {admission.photo ? (
                <img 
                  src={admission.photo} 
                  alt="" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-superior-gold/10 text-superior-gold font-bold text-5xl">${admission.fullName.charAt(0)}</div>`;
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/10">
                  <User size={100} />
                </div>
              )}
            </div>
            {admission.studentId && (
              <div className="mt-6 bg-superior-gold text-superior-teal font-black text-base px-6 py-2.5 rounded-2xl shadow-xl shadow-superior-gold/20 border-2 border-white/20 transform -rotate-1">
                {admission.studentId}
              </div>
            )}
          </div>
          
          <div className="text-center md:text-left flex-1 space-y-6">
            <div className="inline-flex items-center gap-2.5 bg-white/10 text-superior-gold border border-white/10 px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-inner">
              <Shield size={16} /> Verified Academic record
            </div>
            <h2 className="text-4xl md:text-7xl font-black tracking-tight uppercase leading-[0.9]">{admission.fullName}</h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
               <div className="flex items-center gap-3 text-white/50 font-bold text-lg">
                 <Badge variant="outline" className="border-white/20 text-white/80 py-1.5 px-4 rounded-xl">{admission.category}</Badge>
                 <span className="w-1.5 h-1.5 rounded-full bg-superior-gold shadow-[0_0_10px_rgba(201,168,76,0.6)]" />
                 <span className="text-white/70">{admission.group}</span>
               </div>
               <Badge className={cn(
                 "font-black tracking-[0.15em] uppercase text-[10px] px-5 py-2 rounded-xl shadow-lg",
                 admission.status === 'Admitted/Confirmed' ? "bg-emerald-500 text-white" : "bg-superior-gold text-superior-teal"
               )}>
                 {admission.status}
               </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="p-10 md:p-14 space-y-16 bg-white/80 backdrop-blur-sm">
        {/* Profile Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Column 1: Identity */}
          <div className="space-y-10 group">
            <SectionHeading icon={User} title="Student Identity" />
            <div className="space-y-8 pl-4 border-l-2 border-slate-50 group-hover:border-superior-teal/30 transition-colors">
              <ProfileItem label="Father's Name" value={admission.fatherName} />
              <ProfileItem label="Date of Birth" value={admission.dob || 'N/A'} />
              <ProfileItem label="B-Form / CNIC" value={admission.bayFormNo || 'N/A'} />
              <ProfileItem label="Blood Group" value={admission.bloodGroup || 'N/A'} />
              <ProfileItem label="Gender" value={admission.gender} />
            </div>
          </div>

          {/* Column 2: Academic */}
          <div className="space-y-10 group">
            <SectionHeading icon={GraduationCap} title="Academic Stats" />
            <div className="space-y-8 pl-4 border-l-2 border-slate-50 group-hover:border-superior-gold/30 transition-colors">
              <ProfileItem label="College No." value={admission.collegeNo || 'N/A'} />
              <ProfileItem label="Section" value={admission.section || 'Not Assigned'} />
              <ProfileItem label="Board Roll #" value={admission.boardRollNo || 'N/A'} />
              <ProfileItem label="SSC Marks" value={String(admission.previousMarks || 0)} />
              <ProfileItem label="Previous Institute" value={admission.previousInstitute || 'N/A'} />
            </div>
          </div>

          {/* Column 3: Contact & Subjects */}
          <div className="space-y-10 group">
            <SectionHeading icon={CreditCard} title="Communication" />
            <div className="space-y-8 pl-4 border-l-2 border-slate-50 group-hover:border-blue-300 transition-colors">
              <ProfileItem label="Personal Mobile" value={admission.contactNumber} />
              <ProfileItem label="Father's Mobile" value={admission.fatherContact || 'N/A'} />
              <ProfileItem label="Residential Address" value={admission.address} isFull />
            </div>
            <div className="pt-6">
              <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-superior-teal" /> Enrolled Subjects
              </div>
              <div className="flex flex-wrap gap-2.5">
                {(admission.subjects || []).map(s => (
                  <Badge key={s} variant="outline" className="bg-slate-50/50 text-slate-700 border-slate-200 font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl hover:bg-white hover:border-superior-teal transition-all">{s}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Section - Redesigned as a Bento Box */}
        <div className="space-y-8">
           <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
               <Wallet size={24} />
             </div>
             <div>
               <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Financial Ledger</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time payment tracking</p>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <FinanceCard label="Overall Package" value={admission.totalPackage} sub="Official Finalized Fee" />
             <FinanceCard label="Total Received" value={admission.feeReceived} sub="Logged to date" color="emerald" />
             <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-slate-900 text-white flex justify-between items-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <p className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-1">Outstanding Balance</p>
                  <h4 className="text-4xl font-black text-rose-400">Rs. {(admission.totalPackage - admission.feeReceived).toLocaleString()}</h4>
                </div>
                <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-rose-400 border border-white/10 relative z-10">
                  <AlertTriangle size={32} />
                </div>
             </div>
             <FinanceCard label="Admission Fee" value={admission.admissionFee} sub="Registration Cost" />
             <FinanceCard label="Misc / Lab Funds" value={admission.miscFunds} sub="Operational Charges" />
             <div className="lg:col-span-2 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <CreditCard size={28} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Billing Strategy</p>
                  <h4 className="text-lg font-black text-slate-700 uppercase">{admission.paymentPlan || 'Standard'} Plan</h4>
                </div>
             </div>
           </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-8 pt-10 border-t border-slate-100/50">
          <Button 
            variant="outline" 
            className="h-16 px-10 border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[11px] rounded-[1.5rem] hover:bg-slate-50 hover:border-superior-teal transition-all shadow-sm" 
            onClick={onDownloadReceipt}
          >
            <Receipt size={20} className="mr-3 text-slate-400" /> Print Fee Receipt
          </Button>
          
          <div className="flex items-center gap-4">
            {!admission.isAdmitted && (
              <Button 
                className="h-16 px-12 bg-emerald-600 text-white hover:bg-emerald-700 font-black uppercase tracking-widest text-[11px] rounded-[1.5rem] shadow-2xl shadow-emerald-500/30 transition-all active:scale-95"
                onClick={() => {
                  data.confirmAdmission(admission.id, data.currentUser?.email);
                }}
              >
                <CheckCircle2 size={20} className="mr-3" /> Enroll Student
              </Button>
            )}
            <Button 
              className="h-16 px-12 bg-superior-teal text-white hover:bg-superior-teal/90 font-black uppercase tracking-widest text-[11px] rounded-[1.5rem] shadow-2xl shadow-superior-teal/30 transition-all active:scale-95"
              onClick={onEdit}
            >
              <Edit size={20} className="mr-3 text-white/50" /> Update Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{label}</p>
      <p className="text-base font-bold text-slate-800 border-b border-slate-100 pb-1">{value}</p>
    </div>
  );
}

function PreviewItem({ label, value, isFull }: { label: string, value: string, isFull?: boolean }) {
  return (
    <div className={`space-y-1 ${isFull ? 'col-span-2' : ''}`}>
      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-1">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, active, onClick, iconColor, bgColor, hoverColor, icon: Icon = User }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={cn(
        "p-6 rounded-3xl border cursor-pointer transition-all duration-300",
        active 
          ? "bg-superior-teal border-superior-teal text-white shadow-xl shadow-superior-teal/20" 
          : cn("bg-white border-slate-100", hoverColor)
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
          active ? "bg-white/20" : bgColor
        )}>
          <Icon size={24} className={active ? "text-white" : iconColor} />
        </div>
        {active && <div className="w-2 h-2 rounded-full bg-superior-gold animate-pulse" />}
      </div>
      <div>
        <p className={cn(
          "text-[10px] font-black uppercase tracking-widest mb-1",
          active ? "text-white/60" : "text-slate-400"
        )}>{label}</p>
        <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
      </div>
    </motion.div>
  );
}

function FormSectionHeader({ icon: Icon, title, sub }: any) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-superior-teal/10 flex items-center justify-center text-superior-teal">
        <Icon size={20} />
      </div>
      <div>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-[0.1em]">{title}</h4>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sub}</p>
      </div>
    </div>
  );
}

function FormFieldWrapper({ label, children, required, className }: any) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

function AdmissionForm({ data, onClose, selectedSession, program }: { data: any, onClose: () => void, selectedSession?: string, program?: string }) {
  const [activeTab, setActiveTab] = useState('student');
  const [formData, setFormData] = useState({
    fullName: '',
    fatherName: '',
    collegeNo: '',
    bayFormNo: '',
    dob: '',
    previousClass: '10th' as '9th' | '10th',
    boardRollNo: '',
    previousMarks: '',
    previousInstitute: '',
    subjects: [] as string[],
    address: '',
    admissionFee: '',
    miscFunds: '',
    totalFeeFinalized: '', // Tuition Fee
    totalPackage: 0,
    feeReceived: '',
    paymentPlan: 'Installments' as 'Semester' | 'Installments',
    paidMonths: [] as string[],
    paidInstallments: 0,
    totalInstallments: 12,
    nextInstallmentDate: '',
    totalSemesters: 0,
    feePerSemester: 0,
    nextSemesterDueDate: '',
    contactNumber: '',
    fatherContact: '',
    secondaryContact: '',
    email: '',
    bloodGroup: '',
    reference: '',
    gender: 'Male' as Gender,
    category: 'Inter Part-1 Boys' as any,
    group: '',
    section: '',
    photo: '',
    studentId: '',
    status: 'Prospective' as any,
    session: '',
    sessionStartDate: '',
    sessionEndDate: '',
    academicPart: 'Part-1' as 'Part-1' | 'Part-2',
    programType: 'Yearly' as 'Yearly' | 'Semester',
    currentSemester: 0 as number
  });

  // Auto-calculate Total Package
  React.useEffect(() => {
    const total = Number(formData.admissionFee || 0) + 
                  Number(formData.miscFunds || 0) + 
                  Number(formData.totalFeeFinalized || 0);
    setFormData(prev => ({ ...prev, totalPackage: total }));
  }, [formData.admissionFee, formData.miscFunds, formData.totalFeeFinalized]);

  // Auto-confirm admission when received amount is entered (Allot unique Student ID on Fee Submission)
  React.useEffect(() => {
    if (Number(formData.feeReceived) > 0 && !formData.studentId) {
      const newId = data.generateStudentId(formData.group || program);
      setFormData(prev => ({ 
        ...prev, 
        studentId: newId,
        status: 'Admitted/Confirmed'
      }));
      toast.success(`Official Student ID Allotted: ${newId}`, {
        description: "Official identification has been generated based on fee submission."
      });
    }
  }, [formData.feeReceived]);

  const categories = React.useMemo(() => {
    let result = [
      'Inter Part-1 Boys',
      'Inter Part-2 Boys',
      'Inter Part-1 Girls',
      'Inter Part-2 Girls'
    ];
    if (program === 'dit') result = ['DIT Boys', 'DIT Girls'];
    if (program === 'ukl3') result = ['UK L3 Boys', 'UK L3 Girls'];
    if (program === 'bs') result = ['BS Boys', 'BS Girls'];

    // Ensure the default category is valid for the current program
    setFormData(prev => {
      if (!result.includes(prev.category)) {
        return { ...prev, category: result[0] };
      }
      return prev;
    });

    return result;
  }, [program]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const previewRef = React.useRef<HTMLDivElement>(null);

  const filteredGroups = React.useMemo(() => ACADEMIC_GROUPS.filter(g => {
    if (!program) return true;
    const name = g.name.toLowerCase();
    if (program === 'fsc') return !name.includes('dit') && !name.includes('uk') && !name.includes('level 3') && !name.includes('bs ');
    if (program === 'dit') return name.includes('dit');
    if (program === 'ukl3') return name.includes('uk') || name.includes('level 3');
    if (program === 'bs') return name.includes('bs ');
    return true;
  }), [program]);

  const filteredSubjects = React.useMemo(() => SUBJECTS.filter((s: string) => {
    if (COMPULSORY_SUBJECTS.includes(s)) return false; // Handled separately
    if (!program) return true;
    const name = s.toLowerCase();
    if (program === 'fsc') return !name.includes('dit') && !name.includes('uk') && !name.includes('level 3') && !name.includes('bs ');
    if (program === 'dit') return name.includes('dit');
    if (program === 'ukl3') return name.includes('uk') || name.includes('level 3');
    if (program === 'bs') return name.includes('bs ');
    return true;
  }), [program]);

  const handleGroupChange = (groupName: string) => {
    const group = ACADEMIC_GROUPS.find(g => g.name === groupName);
    if (group) {
      const newSubjects = Array.from(new Set([...COMPULSORY_SUBJECTS, ...group.subjects]));
      
      // Auto-logic for Semester Programs
      let paymentPlan = formData.paymentPlan;
      let totalSemesters = formData.totalSemesters;
      let programType = 'Yearly' as 'Yearly' | 'Semester';
      let currentSemester = formData.currentSemester;
      
      const lowerGroupName = groupName.toLowerCase();
      if (lowerGroupName.includes('dit') || lowerGroupName.includes('uk') || lowerGroupName.includes('level 3')) {
        paymentPlan = 'Semester';
        totalSemesters = lowerGroupName.includes('dit') ? 4 : 3;
        programType = 'Semester';
        currentSemester = currentSemester || 1;
        toast.info(`${groupName} follows a Semester System. Plan adjusted automatically.`);
      }

      setFormData(prev => ({ 
        ...prev, 
        group: groupName, 
        subjects: newSubjects,
        paymentPlan,
        totalSemesters,
        programType,
        currentSemester
      }));
    }
  };

  const handlePrint = async () => {
    if (!previewRef.current) return;
    
    const toastId = toast.loading("Preparing Admission Form PDF...");
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          margin: '0',
          padding: '0'
        }
      });
      
      const imgProps = new Image();
      imgProps.src = dataUrl;
      await new Promise((resolve) => { imgProps.onload = resolve; });
      
      const pdfWidth = 210;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      const pdf = new jsPDF('p', 'mm', [pdfWidth, Math.max(297, pdfHeight)]);
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Admission-Form-${formData.fullName || 'Student'}.pdf`);
      toast.dismiss(toastId);
      toast.success("Admission Form downloaded successfully!");
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.dismiss(toastId);
      toast.error("Failed to generate PDF. Use high-speed internet.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalized = Number(formData.totalFeeFinalized);
    const totalPkg = formData.totalPackage;
    const received = Number(formData.feeReceived);
    
    let status: AdmissionStatus = formData.status as AdmissionStatus || 'Not Paid';
    if (received >= totalPkg && totalPkg > 0) status = 'Full Paid';
    else if (received > 0) status = 'Partial Paid';
    else if (formData.status === 'Admitted/Confirmed') status = 'Admitted/Confirmed';

    const newAdmission: Admission = {
      id: `adm-${Date.now()}`,
      studentId: formData.studentId || "",
      collegeNo: formData.collegeNo,
      bayFormNo: formData.bayFormNo,
      dob: formData.dob,
      previousClass: formData.previousClass,
      boardRollNo: formData.boardRollNo,
      date: new Date().toISOString().split('T')[0],
      fullName: formData.fullName,
      fatherName: formData.fatherName,
      previousMarks: Number(formData.previousMarks),
      previousInstitute: formData.previousInstitute,
      category: formData.category,
      group: formData.group,
      section: formData.section,
      subjects: formData.subjects,
      address: formData.address,
      admissionFee: Number(formData.admissionFee),
      miscFunds: Number(formData.miscFunds),
      totalFeeFinalized: finalized,
      totalPackage: totalPkg,
      feeReceived: received,
      paymentPlan: formData.paymentPlan,
      paidMonths: formData.paidMonths,
      paidInstallments: formData.paidInstallments,
      totalInstallments: formData.totalInstallments,
      nextInstallmentDate: formData.nextInstallmentDate,
      totalSemesters: formData.totalSemesters,
      programType: formData.programType,
      currentSemester: formData.currentSemester,
      feePerSemester: Number(formData.feePerSemester),
      nextSemesterDueDate: formData.nextSemesterDueDate,
      contactNumber: formData.contactNumber,
      fatherContact: formData.fatherContact,
      secondaryContact: formData.secondaryContact,
      email: formData.email,
      bloodGroup: formData.bloodGroup,
      reference: formData.reference,
      gender: formData.gender,
      photo: formData.photo || "",
      status: formData.status || status,
      isAdmitted: formData.status === 'Admitted/Confirmed' || received > 0,
      session: formData.session || selectedSession || data.settings?.academicSession,
      sessionStartDate: formData.sessionStartDate,
      sessionEndDate: formData.sessionEndDate,
      academicPart: formData.academicPart || 'Part-1'
    };

    data.addAdmission(newAdmission);
    toast.success("Admission form submitted successfully!");
    onClose();
  };

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: (prev.subjects || []).includes(subject) 
        ? (prev.subjects || []).filter(s => s !== subject) 
        : [...(prev.subjects || []), subject]
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const toastId = toast.loading("Processing photo...");
      try {
        const compressedBase64 = await compressImage(file);
        setFormData(prev => ({ 
          ...prev, 
          photo: compressedBase64
        }));
        toast.dismiss(toastId);
        toast.success(`Photo processed successfully`);
      } catch (err) {
        console.error('Photo processing error:', err);
        toast.dismiss(toastId);
        toast.error("Failed to process photo.");
      }
    }
  };

  const downloadPreview = async () => {
    if (previewRef.current === null) return;
    
    const toastId = toast.loading("Rendering A4 Admission Form...");
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          margin: '0',
          padding: '0'
        }
      });
      
      const imgProps = new Image();
      imgProps.src = dataUrl;
      await new Promise((resolve) => { imgProps.onload = resolve; });
      
      const pdfWidth = 210;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      const pdf = new jsPDF('p', 'mm', [pdfWidth, Math.max(297, pdfHeight)]);
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Admission-Form-${formData.fullName || 'Student'}.pdf`);
      toast.dismiss(toastId);
      toast.success("Admission Form downloaded as PDF!");
    } catch (err) {
      console.error('Error downloading preview:', err);
      toast.dismiss(toastId);
      toast.error("Failed to download PDF");
    }
  };

  return (
    <div className="space-y-8 py-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-8">
          <TabsTrigger value="student" className="text-sm font-bold">1. Student Details</TabsTrigger>
          <TabsTrigger value="subjects" className="text-sm font-bold">2. Subjects & Group</TabsTrigger>
          <TabsTrigger value="fees" className="text-sm font-bold">3. Fee Details</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="space-y-6 min-h-[400px]">
          <TabsContent value="student" className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
            {/* Identity Banner */}
            <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 flex flex-col md:flex-row items-center gap-8">
              <div className="relative group shrink-0">
                <div className="w-36 h-36 rounded-[2.5rem] border-4 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-superior-teal/50 group-hover:bg-superior-teal/[0.02]">
                  {formData.photo ? (
                    <img src={formData.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="text-slate-200 mb-2" size={36} />
                      <span className="text-[9px] text-slate-400 font-black uppercase text-center px-4 leading-tight">Student<br/>Photograph</span>
                    </>
                  )}
                </div>
                <label className="absolute inset-0 cursor-pointer">
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
                {formData.photo && (
                  <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl border-4 border-white shadow-lg">
                    <CheckCircle2 size={16} />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3 text-center md:text-left">
                <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Candidate Profile</h3>
                <p className="text-sm text-slate-500 font-medium">Registering candidate for <span className="font-bold text-superior-teal">{program?.toUpperCase() || 'General Admission'}</span>. Please ensure all names match official documents.</p>
                {formData.studentId && (
                  <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Enrollment ID: {formData.studentId}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div className="space-y-8">
                 <FormSectionHeader icon={User} title="Primary Identity" sub="Full legal documentation" />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormFieldWrapper label="Full Name" required>
                      <Input 
                        placeholder="Full Name" 
                        className="h-12 border-slate-200 rounded-xl focus:border-superior-teal/30" 
                        value={formData.fullName || ""} 
                        onChange={e => setFormData({...formData, fullName: e.target.value})} 
                      />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Father's Name" required>
                      <Input 
                        placeholder="Father's Name" 
                        className="h-12 border-slate-200 rounded-xl focus:border-superior-teal/30" 
                        value={formData.fatherName || ""} 
                        onChange={e => setFormData({...formData, fatherName: e.target.value})} 
                      />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Date of Birth">
                      <Input 
                        type="date" 
                        className="h-12 border-slate-200 rounded-xl" 
                        value={formData.dob || ""} 
                        onChange={e => setFormData({...formData, dob: e.target.value})} 
                      />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="B-Form / CNIC">
                      <Input 
                        placeholder="38403-xxxxxxx-x" 
                        className="h-12 border-slate-200 rounded-xl" 
                        value={formData.bayFormNo || ""} 
                        onChange={e => setFormData({...formData, bayFormNo: e.target.value})} 
                      />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Gender">
                       <Select value={formData.gender || ""} onValueChange={(v: any) => setFormData({...formData, gender: v})}>
                         <SelectTrigger className="h-12 border-slate-200 rounded-xl"><SelectValue /></SelectTrigger>
                         <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                       </Select>
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Blood Group">
                       <Select value={formData.bloodGroup || ""} onValueChange={v => setFormData({...formData, bloodGroup: v})}>
                          <SelectTrigger className="h-12 border-slate-200 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                              <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                            ))}
                          </SelectContent>
                       </Select>
                    </FormFieldWrapper>
                 </div>
               </div>

               <div className="space-y-8">
                 <FormSectionHeader icon={CreditCard} title="Communication" sub="Emergency Contacts" />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormFieldWrapper label="Student Contact" required>
                      <Input className="h-12 border-slate-200 rounded-xl" placeholder="03xx-xxxxxxx" value={formData.contactNumber || ""} onChange={e => setFormData({...formData, contactNumber: e.target.value})} />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Guardian Contact" required>
                      <Input className="h-12 border-slate-200 rounded-xl" placeholder="03xx-xxxxxxx" value={formData.fatherContact || ""} onChange={e => setFormData({...formData, fatherContact: e.target.value})} />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Email Address">
                      <Input className="h-12 border-slate-200 rounded-xl" placeholder="student@example.com" value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Reference">
                      <Input className="h-12 border-slate-200 rounded-xl" placeholder="Who referred?" value={formData.reference || ""} onChange={e => setFormData({...formData, reference: e.target.value})} />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Address" className="md:col-span-2">
                       <Textarea 
                        placeholder="Full Residential Address" 
                        className="rounded-2xl border-slate-200 resize-none min-h-[90px] p-4" 
                        value={formData.address || ""} 
                        onChange={e => setFormData({...formData, address: e.target.value})} 
                       />
                    </FormFieldWrapper>
                 </div>
               </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" onClick={() => setActiveTab('subjects')} className="h-14 px-10 bg-superior-teal text-white hover:bg-superior-teal/90 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-superior-teal/20">
                Continue to Academic History
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Academic History */}
                <div className="space-y-8 group">
                  <FormSectionHeader icon={Search} title="Academic History" sub="Previous Record (SSC)" />
                  <div className="grid grid-cols-1 gap-6 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 group-hover:border-superior-teal/30 transition-colors">
                    <FormFieldWrapper label="SSC Board Roll #">
                      <Input 
                        placeholder="Registration #"
                        className="h-12 rounded-xl border-slate-200 bg-white"
                        value={formData.boardRollNo || ""}
                        onChange={e => setFormData({...formData, boardRollNo: e.target.value})}
                      />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="SSC Obtained Marks">
                      <Input 
                        type="number"
                        placeholder="Obtained Marks"
                        className="h-12 rounded-xl border-slate-200 bg-white"
                        value={formData.previousMarks || ""}
                        onChange={e => setFormData({...formData, previousMarks: e.target.value})}
                      />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Previous Institute">
                      <Input 
                        placeholder="Enter school/college name"
                        className="h-12 rounded-xl border-slate-200 bg-white"
                        value={formData.previousInstitute || ""}
                        onChange={e => setFormData({...formData, previousInstitute: e.target.value})}
                      />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Previous Class">
                       <Select value={formData.previousClass || ""} onValueChange={(v: any) => setFormData({...formData, previousClass: v})}>
                         <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                         <SelectContent><SelectItem value="9th">9th Class</SelectItem><SelectItem value="10th">10th Class</SelectItem></SelectContent>
                       </Select>
                    </FormFieldWrapper>
                  </div>
                </div>

                {/* Course Selection */}
                <div className="space-y-8 group">
                  <FormSectionHeader icon={GraduationCap} title="Academic Placement" sub="Internal Program Entry" />
                  <div className="grid grid-cols-1 gap-6 p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 group-hover:border-superior-teal/30 transition-colors">
                    <FormFieldWrapper label="Academic Group" required>
                      <Select value={formData.group || ""} onValueChange={handleGroupChange}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 font-bold bg-white shadow-sm focus:ring-superior-teal">
                          <SelectValue placeholder="Assign Group" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {filteredGroups.map(g => (
                            <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormFieldWrapper>
                    <FormFieldWrapper label="College Roll #">
                      <Input 
                        placeholder="Assign Roll #"
                        className="h-12 rounded-xl border-slate-200 bg-white"
                        value={formData.collegeNo || ""}
                        onChange={e => setFormData({...formData, collegeNo: e.target.value})}
                      />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Assigned Section">
                      <Input 
                        placeholder="e.g. Med-1"
                        className="h-12 rounded-xl border-slate-200 bg-white"
                        value={formData.section || ""}
                        onChange={e => setFormData({...formData, section: e.target.value.toUpperCase()})}
                      />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Academic Part">
                      <Select value={formData.academicPart || ""} onValueChange={(v: any) => setFormData({...formData, academicPart: v})}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Part-1">Part-1 (1st Year)</SelectItem>
                          <SelectItem value="Part-2">Part-2 (2nd Year)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormFieldWrapper>
                  </div>
                </div>

                {/* Subject Selection Area */}
                <div className="space-y-8 group">
                  <FormSectionHeader icon={Layers} title="Course Subjects" sub="Elective & Compulsory" />
                  <div className="p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 group-hover:border-superior-teal/30 transition-colors h-full max-h-[500px] overflow-y-auto">
                    {!formData.group ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                          <Layers size={32} />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Select an Academic Group<br/>to show subjects</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compulsory Subjects</p>
                          <div className="flex flex-wrap gap-2">
                            {COMPULSORY_SUBJECTS.map(s => (
                              <Badge key={s} variant="outline" className="bg-white border-slate-200 text-slate-500 font-bold px-3 py-1.5 rounded-lg capitalize">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Electives</p>
                          <div className="grid grid-cols-1 gap-2">
                            {filteredSubjects.map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => toggleSubject(s)}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left",
                                  formData.subjects.includes(s) 
                                    ? "bg-superior-teal/5 border-superior-teal text-superior-teal" 
                                    : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                                )}
                              >
                                <span className="text-xs font-black uppercase tracking-tight">{s}</span>
                                {formData.subjects.includes(s) && <CheckCircle2 size={14} />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
             </div>

             <div className="flex justify-between pt-8 border-t border-slate-100">
               <Button type="button" variant="ghost" onClick={() => setActiveTab('student')} className="h-14 px-8 font-bold text-slate-400">Back to profile</Button>
               <Button type="button" onClick={() => setActiveTab('fees')} className="h-14 px-10 bg-slate-800 text-white hover:bg-slate-900 rounded-2xl font-black uppercase tracking-widest text-[11px] group">
                 Continue to Financials
                 <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
               </Button>
             </div>
          </TabsContent>

          <TabsContent value="fees" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left side: Financial Structure */}
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-superior-teal/10 flex items-center justify-center text-superior-teal">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Financial Structure</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Setup total package and payment plan</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100">
                    <div className="space-y-6">
                      <FormFieldWrapper label="Admission Fee" required>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs.</span>
                          <Input type="number" className="h-14 pl-12 rounded-2xl border-slate-200 bg-white font-black" value={formData.admissionFee || ""} onChange={e => setFormData({...formData, admissionFee: e.target.value})} />
                        </div>
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Tuition Fee (Finalized)" required>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs.</span>
                          <Input type="number" className="h-14 pl-12 rounded-2xl border-slate-200 bg-white font-black text-lg focus:border-superior-teal" value={formData.totalFeeFinalized || ""} onChange={e => setFormData({...formData, totalFeeFinalized: e.target.value})} />
                        </div>
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Miscellaneous Funds">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs.</span>
                          <Input type="number" className="h-14 pl-12 rounded-2xl border-slate-200 bg-white font-black" value={formData.miscFunds || ""} onChange={e => setFormData({...formData, miscFunds: e.target.value})} />
                        </div>
                      </FormFieldWrapper>
                    </div>

                    <div className="space-y-6">
                       <div className="p-8 rounded-[2rem] bg-slate-900 text-white shadow-xl relative overflow-hidden">
                          <p className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-1">Total Package</p>
                          <h4 className="text-4xl font-black text-superior-gold tracking-tighter">Rs. {formData.totalPackage.toLocaleString()}</h4>
                          <div className="mt-6 flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                             <TrendingUp size={14} className="text-emerald-400" />
                             <span className="text-[10px] font-bold text-white/60 uppercase">Auto-calculating installments</span>
                          </div>
                       </div>

                       <FormFieldWrapper label="Immediate Payment (Received)" required className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300 font-bold text-sm">Rs.</span>
                          <Input 
                            type="number"
                            className="h-14 pl-12 rounded-2xl border-emerald-200 bg-white text-xl font-black text-emerald-700"
                            placeholder="0.00"
                            value={formData.feeReceived || ""}
                            onChange={e => setFormData({...formData, feeReceived: e.target.value})}
                          />
                        </div>
                        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider mt-3 px-1">
                           Triggers Enrollment & ID Allotment
                        </p>
                      </FormFieldWrapper>
                    </div>
                  </div>
                </div>

                {/* Right side: Billing Strategy */}
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Installment Plan</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bifurcation of remaining dues</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm">
                     <FormFieldWrapper label="Billing Frequency">
                        <Select value={formData.paymentPlan || ""} onValueChange={(v: any) => setFormData({...formData, paymentPlan: v})}>
                          <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Installments">Monthly Installments</SelectItem>
                          </SelectContent>
                        </Select>
                     </FormFieldWrapper>
                     <FormFieldWrapper label="Total Count">
                        <Input type="number" className="h-14 rounded-2xl border-slate-200 font-bold" value={formData.totalInstallments || ""} onChange={e => setFormData({...formData, totalInstallments: Number(e.target.value)})} />
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2 px-1">Dividing Rs. {(formData.totalPackage - Number(formData.feeReceived || 0)).toLocaleString()} into {formData.totalInstallments} parts.</p>
                     </FormFieldWrapper>

                     <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-superior-teal/10 flex items-center justify-center text-superior-teal">
                          <AlertTriangle size={24} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Per Installment</p>
                          <h4 className="text-2xl font-black text-slate-800">
                             Rs. {formData.totalInstallments > 0 
                               ? Math.ceil((formData.totalPackage - Number(formData.feeReceived || 0)) / formData.totalInstallments).toLocaleString() 
                               : '0'
                             }
                          </h4>
                        </div>
                     </div>
                  </div>
                </div>
            </div>

              {formData.paymentPlan === 'Semester' && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Total Semesters</Label>
                      <Input 
                        type="number" 
                        value={formData.totalSemesters || ""} 
                        onChange={e => setFormData({...formData, totalSemesters: Number(e.target.value)})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fee Per Semester</Label>
                      <Input 
                        type="number" 
                        value={formData.feePerSemester || ""} 
                        onChange={e => setFormData({...formData, feePerSemester: Number(e.target.value)})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Next Semester Due Date</Label>
                      <Input 
                        type="date" 
                        value={formData.nextSemesterDueDate || ""} 
                        onChange={e => setFormData({...formData, nextSemesterDueDate: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
              )}

            <div className="p-6 bg-superior-teal/5 rounded-2xl border border-superior-teal/10">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Remaining Balance</p>
                  <p className="text-3xl font-bold text-superior-teal">
                    Rs. {(Number(formData.totalPackage || 0) - Number(formData.feeReceived || 0)).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Admission Status</p>
                  <Badge className={Number(formData.feeReceived) > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                    {Number(formData.feeReceived) > 0 ? "ADMITTED" : "PENDING"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input 
                id="reference" 
                placeholder="Enter reference if any"
                value={formData.reference}
                onChange={e => setFormData({...formData, reference: e.target.value})}
              />
            </div>

            <div className="flex justify-between pt-6">
              <Button type="button" variant="outline" onClick={() => setActiveTab('subjects')}>Back</Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" className="bg-superior-teal text-white hover:bg-superior-teal/90 px-10 font-bold">
                  Submit Admission
                </Button>
              </div>
            </div>
          </TabsContent>
        </form>
      </Tabs>

      <Separator className="my-10" />

      {/* Final Details Preview Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold text-slate-800 flex items-center gap-2">
            <Eye className="text-superior-gold" /> Final Details Preview
          </h3>
          <Button type="button" onClick={downloadPreview} variant="outline" className="border-superior-gold text-superior-gold hover:bg-superior-gold/5">
            <Download size={18} className="mr-2" /> Download A4 Form
          </Button>
        </div>

        <div 
          ref={previewRef}
          className="bg-white border mx-auto p-12 font-sans relative"
          style={{ width: '210mm', height: 'fit-content', boxSizing: 'border-box' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-4 pb-8 mb-10" style={{ borderColor: data.settings?.themeColor || '#0b4d45' }}>
            <div className="flex items-center gap-6">
              <div className="rounded-3xl overflow-hidden w-24 h-24 flex items-center justify-center text-white shadow-xl border-2 border-slate-50" style={{ background: data.settings?.themeColor || '#0b4d45' }}>
                {data.settings?.logo ? (
                  <img src={data.settings.logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <School className="text-white" size={50} />
                )}
              </div>
              <div>
                <h1 className="text-4xl font-serif font-black tracking-tight" style={{ color: data.settings?.themeColor || '#0b4d45' }}>{data.settings?.collegeName || 'Superior College'}</h1>
                <p className="text-sm font-black tracking-[0.4em] uppercase" style={{ color: '#d4af37' }}>{data.settings?.campusName || 'Main Campus'}</p>
                <div className="flex gap-3 mt-3">
                  {formData.studentId && (
                    <div className="text-white px-4 py-1.5 rounded-lg font-mono text-[10px] font-black shadow-sm" style={{ background: data.settings?.themeColor || '#0b4d45' }}>
                      ST-ID: {formData.studentId}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block text-white px-8 py-3 rounded-2xl text-base font-black mb-3 shadow-xl flex flex-col items-center" style={{ background: data.settings?.themeColor || '#0b4d45' }}>
                <span>ADMISSION FORM</span>
                <span className="urdu-text text-[10px] font-medium opacity-60">داخلہ فارم</span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">Issue Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Sidebar */}
            <div className="col-span-3 space-y-6">
              <div className="aspect-[3/4] rounded-3xl border-2 border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shadow-inner group relative">
                {formData.photo ? (
                  <img 
                    src={formData.photo} 
                    alt="" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-300 gap-2"><User size="60" /><span class="text-[10px] font-black uppercase text-center px-4">Photo Placeholder</span></div>`;
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 opacity-20">
                    <User size={60} />
                    <span className="text-[10px] font-black uppercase text-center px-4">Paste Photo Here</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[8px] text-slate-400 uppercase font-black mb-1">B-Form / CNIC</p>
                  <p className="text-sm font-mono font-black text-slate-700">{formData.bayFormNo || '---'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[8px] text-slate-400 uppercase font-black mb-1">Contact Number</p>
                  <p className="text-sm font-black text-slate-700">{formData.contactNumber || '---'}</p>
                </div>
                <div className={`p-3 rounded-xl border shadow-sm ${Number(formData.feeReceived) > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[8px] uppercase font-black mb-1 ${Number(formData.feeReceived) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>Enrollment Status</p>
                  <p className={`text-base font-black ${Number(formData.feeReceived) > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {Number(formData.feeReceived) > 0 ? "CONFIRMED" : "PROSPECTIVE"}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="col-span-9 space-y-6">
              <section className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 pb-2" style={{ color: data.settings?.themeColor || '#0b4d45' }}>Academic & Personal Profile</h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  <PreviewItem label="Student Full Name" value={formData.fullName || '---'} />
                  <PreviewItem label="Father's Name" value={formData.fatherName || '---'} />
                  <PreviewItem label="Category" value={formData.category || '---'} />
                  <PreviewItem label="Academic Group" value={formData.group || '---'} />
                  <div className="col-span-2 space-y-1">
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Permanent Residential Address</p>
                    <p className="text-base font-medium text-slate-800 border-b border-slate-100 pb-1">{formData.address || '---'}</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 pb-2" style={{ color: data.settings?.themeColor || '#0b4d45' }}>Financial Structure</h4>
                <div className="grid grid-cols-12 gap-4 items-center rounded-xl p-5 text-white shadow-lg relative overflow-hidden" style={{ background: data.settings?.themeColor || '#0b4d45' }}>
                  <div className="col-span-12 md:col-span-5">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1 font-mono">Total Package Value</p>
                    <p className="text-3xl font-black tracking-tighter italic">Rs. {Number(formData.totalPackage || 0).toLocaleString()}</p>
                  </div>
                  
                  <div className="col-span-12 md:col-span-7 border-l border-white/20 pl-4">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2 font-mono">
                      {formData.paymentPlan === 'Semester' ? 'Semester Progress' : 'Payment Schedule'}
                    </p>
                    {formData.paymentPlan === 'Semester' ? (
                      <div className="flex gap-2">
                         {Array.from({ length: 8 }).map((_, i) => {
                           const semesterFee = Number(formData.totalPackage || 0) / 8;
                           const isPaid = Number(formData.feeReceived || 0) >= (i + 1) * semesterFee;
                           return (
                             <div key={i} className={`flex flex-col items-center gap-1 p-1 rounded-md border ${isPaid ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/10'}`}>
                                <span className="text-[7px] font-bold">SM{i+1}</span>
                                {isPaid ? <CheckCircle2 size={10} className="text-white" /> : <div className="w-2.5 h-2.5 rounded-full border border-white/20" />}
                             </div>
                           );
                         })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-white/60" />
                        <p className="text-sm font-black italic">Monthly Installment Plan Verified</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mb-0.5">{formData.paymentPlan === 'Semester' ? 'Total Semester Paid' : 'Total Fees Paid'}</p>
                      <p className="text-xl font-black text-emerald-700 italic">Rs. {Number(formData.feeReceived || 0).toLocaleString()}</p>
                    </div>
                    <CheckCircle2 size={24} className="text-emerald-500 opacity-20" />
                  </div>
                  
                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="text-[9px] text-rose-600 font-black uppercase tracking-widest mb-0.5">{formData.paymentPlan === 'Semester' ? 'Unpaid Semesters Balance' : 'Remaining Payable Balance'}</p>
                      <p className="text-xl font-black text-rose-700 italic">Rs. {(Number(formData.totalPackage || 0) - Number(formData.feeReceived || 0)).toLocaleString()}</p>
                    </div>
                    <AlertCircle size={24} className="text-rose-500 opacity-20" />
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-[9px] font-bold text-slate-500 italic flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                     Official system verification for <span className="text-slate-800 font-black tracking-tight">{formData.fullName || '---'}</span>. Outstanding balance: <span className="text-rose-600 font-black">Rs. {(Number(formData.totalPackage || 0) - Number(formData.feeReceived || 0)).toLocaleString()}</span> to be cleared via {formData.paymentPlan} schedule.
                  </p>
                </div>
              </section>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-end">
            <div className="text-[8px] text-slate-400 max-w-sm leading-relaxed font-bold italic uppercase tracking-wider">
               Superior College Registry · J Jahanian Campus · Session {selectedSession}
            </div>
            <div className="flex gap-8">
              <div className="text-center w-36">
                <div className="h-0.5 w-full bg-slate-300 mb-1"></div>
                <p className="text-[8px] font-black uppercase text-slate-400">Accountant Office</p>
              </div>
              <div className="text-center w-36">
                <div className="h-0.5 w-full bg-slate-800 mb-1" style={{ background: data.settings?.themeColor || '#0b4d45' }}></div>
                <p className="text-[8px] font-black uppercase text-slate-800">Registrar Sign</p>
              </div>
            </div>
          </div>

          {/* Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none -rotate-12">
             <School size={600} />
          </div>
        </div>
      </div>
    </div>
  );
}


