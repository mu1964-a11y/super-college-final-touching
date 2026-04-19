
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
  Receipt
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
import FeeReceipt from './FeeReceipt';

export default function AdmissionsView({ data, initialFilter, selectedSession }: { data: any, initialFilter?: string | null, selectedSession?: string }) {
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
        const matchesAdmitted = admittedFilter === 'all' || 
                               (admittedFilter === 'Admitted' && a.isAdmitted) ||
                               (admittedFilter === 'Prospective' && !a.isAdmitted);
        return matchesSearch && matchesFee && matchesGender && matchesAdmitted;
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
    toast.success("Student confirmed and moved to Student Management!");
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
          <Button variant="outline" className="rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-sm hover:bg-slate-50 transition-all">
            <Download size={16} className="mr-2 text-superior-gold" /> Export CSV
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
                <AdmissionForm data={data} onClose={() => setIsAddDialogOpen(false)} selectedSession={selectedSession} />
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
                visibleAdmissions.map((admission: Admission) => (
                  <TableRow key={admission.id} className={cn(
                    "group transition-all border-slate-50",
                    selectedAdmissions.includes(admission.id) ? "bg-superior-bg-teal" : "hover:bg-slate-50/50"
                  )}>
                    <TableCell className="pl-8">
                      <Checkbox 
                        checked={selectedAdmissions.includes(admission.id)} 
                        onCheckedChange={() => toggleSelectAdmission(admission.id)} 
                        className="rounded-md border-slate-300"
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-sm font-black text-superior-teal overflow-hidden border border-slate-200">
                          {admission.photo ? (
                            <img src={admission.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            admission.fullName.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm uppercase tracking-tight">
                            <HighlightText text={admission.fullName} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
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
                    <TableCell className="text-right font-black text-slate-800 text-sm">Rs. {(admission.totalFeeFinalized || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-black text-sm">Rs. {(admission.feeReceived || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-rose-600 font-black text-sm">Rs. {((admission.totalFeeFinalized || 0) - (admission.feeReceived || 0)).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(admission.status, admission.isAdmitted)}</TableCell>
                    <TableCell className="text-right pr-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger nativeButton={true} render={
                          <button className="h-10 w-10 rounded-xl hover:bg-white hover:border-slate-200 border border-transparent transition-all flex items-center justify-center text-slate-400">
                            <MoreHorizontal size={18} />
                          </button>
                        } />
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
                )
              ))}
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
                toast.success("Admission record deleted successfully!");
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
            <Button variant="destructive" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={() => {
              data.bulkDeleteAdmissions(selectedAdmissions);
              setSelectedAdmissions([]);
              setDialogType(null);
              toast.success(`${selectedAdmissions.length} records deleted successfully!`);
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
    reference: admission.reference || '',
    gender: admission.gender || 'Male',
    category: admission.category || 'Inter Part-1 Boys',
    group: admission.group || '',
    section: admission.section || '',
    photo: admission.photo || '',
    studentId: admission.studentId || '',
    status: admission.status || 'Prospective'
  });

  // Auto-calculate Total Package
  React.useEffect(() => {
    const total = Number(formData.admissionFee || 0) + 
                  Number(formData.miscFunds || 0) + 
                  Number(formData.totalFeeFinalized || 0);
    setFormData(prev => ({ ...prev, totalPackage: total }));
  }, [formData.admissionFee, formData.miscFunds, formData.totalFeeFinalized]);

  const handleGroupChange = (groupName: string) => {
    const group = ACADEMIC_GROUPS.find(g => g.name === groupName);
    if (group) {
      const newSubjects = Array.from(new Set([...COMPULSORY_SUBJECTS, ...group.subjects]));
      setFormData(prev => ({ ...prev, group: groupName, subjects: newSubjects }));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const studentId = data.generateStudentId();
        setFormData(prev => ({ 
          ...prev, 
          photo: reader.result as string,
          studentId: studentId,
          status: 'Admitted/Confirmed'
        }));
        toast.success(`Photo uploaded! Student ID Generated: ${studentId}`);
      };
      reader.readAsDataURL(file);
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
    toast.success("Admission details updated successfully!");
    if (onClose) onClose();
  };

  return (
    <DialogContent className="max-w-[90vw] w-[90vw] max-h-[92vh] overflow-y-auto p-6 bg-white rounded-3xl">
      <DialogHeader>
        <DialogTitle className="text-2xl font-serif text-superior-teal">Edit Admission Details</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4">
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center overflow-hidden transition-colors group-hover:border-superior-teal">
              {formData.photo ? (
                <img src={formData.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <>
                  <Camera className="text-slate-400 mb-1" size={20} />
                  <span className="text-[8px] text-slate-500 font-bold uppercase text-center">Photo</span>
                </>
              )}
            </div>
            <label className="absolute inset-0 cursor-pointer">
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Admission Category</Label>
            <Select value={formData.category} onValueChange={(v: any) => {
              const gender = v.includes('Girls') ? 'Female' : 'Male';
              setFormData({...formData, category: v, gender});
            }}>
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
            <Label>Gender (Auto-set)</Label>
            <Select disabled value={formData.gender}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>College No.</Label>
            <Input value={formData.collegeNo} onChange={e => setFormData({...formData, collegeNo: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Student Full Name</Label>
            <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Father's Name</Label>
            <Input value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>B-Form No.</Label>
            <Input value={formData.bayFormNo} onChange={e => setFormData({...formData, bayFormNo: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Father's Contact</Label>
            <Input value={formData.fatherContact} onChange={e => setFormData({...formData, fatherContact: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Previous Class</Label>
            <Select value={formData.previousClass} onValueChange={v => setFormData({...formData, previousClass: v as any})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9th">9th Class</SelectItem>
                <SelectItem value="10th">10th Class</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Board Roll No.</Label>
            <Input value={formData.boardRollNo} onChange={e => setFormData({...formData, boardRollNo: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Marks Obtained</Label>
            <Input type="number" value={formData.previousMarks} onChange={e => setFormData({...formData, previousMarks: e.target.value})} />
          </div>
          <div className="space-y-2 col-span-md-2">
            <Label>Previous Institute</Label>
            <Input value={formData.previousInstitute} onChange={e => setFormData({...formData, previousInstitute: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Academic Group</Label>
            <Select value={formData.group} onValueChange={handleGroupChange}>
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
            <Input value={formData.section} onChange={e => setFormData({...formData, section: e.target.value.toUpperCase()})} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="space-y-2">
              <Label className="text-superior-teal font-bold">Compulsory Subjects</Label>
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
              <Label className="text-superior-teal font-bold">Elective & Group Subjects</Label>
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

        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Admission Fee</Label>
            <Input type="number" value={formData.admissionFee} onChange={e => setFormData({...formData, admissionFee: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Misc Funds</Label>
            <Input type="number" value={formData.miscFunds} onChange={e => setFormData({...formData, miscFunds: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Total Finalized Tution Fee</Label>
            <Input type="number" value={formData.totalFeeFinalized} onChange={e => setFormData({...formData, totalFeeFinalized: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label className="text-emerald-600 font-black">Total Package (Auto)</Label>
            <div className="h-10 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center px-3 font-bold text-emerald-700">
              Rs. {formData.totalPackage.toLocaleString()}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Received Amount</Label>
            <Input type="number" value={formData.feeReceived} onChange={e => setFormData({...formData, feeReceived: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Payment Plan</Label>
            <Select value={formData.paymentPlan} onValueChange={(v: any) => setFormData({...formData, paymentPlan: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semester">Semester</SelectItem>
                <SelectItem value="Installments">Installments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {formData.paymentPlan === 'Installments' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Installments Count ({formData.totalInstallments} Months)</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="12" 
              value={formData.totalInstallments} 
              onChange={(e) => setFormData({...formData, totalInstallments: Number(e.target.value)})}
              className="w-full accent-superior-teal"
            />
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Paid Installments</Label>
                <Select value={String(formData.paidInstallments)} onValueChange={(v) => setFormData({...formData, paidInstallments: Number(v)})}>
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: formData.totalInstallments + 1 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>{i} Paid</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 flex flex-col justify-center">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Status</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-500">Rem: {Math.max(0, formData.totalInstallments - formData.paidInstallments)}</span>
                  <span className="text-xs font-bold text-superior-teal">Amt: Rs. {Math.round(Number(formData.totalPackage || 0) / (formData.totalInstallments || 1)).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Reference</Label>
          <Input value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} />
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <Button 
            variant="destructive" 
            type="button"
            onClick={() => {
              if (onDelete) onDelete();
            }}
          >
            <Trash2 size={16} className="mr-2" /> Delete Record
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button className="bg-superior-teal text-white hover:bg-superior-teal/90" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

function AdmissionProfile({ admission, data, onEdit, onDownloadReceipt }: { admission: Admission, data: any, onEdit?: () => void, onDownloadReceipt?: () => void }) {
  return (
    <div className="w-full">
      <div className="bg-slate-800 p-6 md:p-10 text-white relative">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-center relative z-10">
          <div className="relative group shrink-0">
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-2xl border-4 border-white/20 bg-white/10 backdrop-blur-md overflow-hidden">
              {admission.photo ? (
                <img src={admission.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40">
                  <User size={64} />
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 bg-superior-gold/20 text-superior-gold border border-superior-gold/30 mb-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              <School size={12} /> Admission Applicant Profile
            </div>
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-2 tracking-tight">{admission.fullName}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-6 text-sm md:text-base opacity-90">
              <p className="font-mono font-bold text-superior-gold">{admission.id}</p>
              <span className="hidden md:block opacity-30">|</span>
              <div className="flex items-center gap-2">
                <User size={16} className="text-superior-gold" />
                <span>Father: {admission.fatherName}</span>
              </div>
              <span className="hidden md:block opacity-30">|</span>
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-superior-gold" />
                <span>Applied: {admission.date}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-10 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 text-lg">
              <User size={20} className="text-superior-teal" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoItem label="Father's Name" value={admission.fatherName} />
              <InfoItem label="Contact" value={admission.contactNumber} />
              <InfoItem label="College No." value={admission.collegeNo || 'N/A'} />
              <InfoItem label="B-Form No." value={admission.bayFormNo || 'N/A'} />
              <InfoItem label="Date of Birth" value={admission.dob || 'N/A'} />
              <InfoItem label="Gender" value={admission.gender} />
              <InfoItem label="Board Roll No." value={admission.boardRollNo || 'N/A'} />
              <InfoItem label="Marks Obtained" value={String(admission.previousMarks || 0)} />
              <div className="sm:col-span-2">
                <InfoItem label="Address" value={admission.address} />
              </div>
              <div className="sm:col-span-2">
                <InfoItem label="Previous Institute" value={admission.previousInstitute} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 text-lg">
              <GraduationCap size={20} className="text-superior-teal" /> Academic Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoItem label="Category" value={admission.category} />
              <InfoItem label="Group" value={admission.group || 'Not Assigned'} />
              <InfoItem label="Previous Class" value={admission.previousClass || 'N/A'} />
              <InfoItem label="Section" value={admission.section || 'Not Assigned'} />
              <InfoItem label="Status" value={admission.status} />
              <div className="sm:col-span-2">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Selected Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {(admission.subjects || []).map(s => (
                    <Badge key={s} variant="outline" className="bg-slate-50">{s}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
            <CreditCard size={20} className="text-superior-teal" /> Financial Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Tuition Fee</p>
              <p className="text-xl font-bold text-slate-800">Rs. {(admission.totalFeeFinalized || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Misc Funds</p>
              <p className="text-xl font-bold text-slate-800">Rs. {(admission.miscFunds || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Admission Fee</p>
              <p className="text-xl font-bold text-slate-800">Rs. {(admission.admissionFee || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-superior-bg-teal rounded-xl border border-superior-teal/20">
              <p className="text-[10px] text-superior-teal uppercase font-bold mb-1">Total Package</p>
              <p className="text-xl font-bold text-superior-teal">Rs. {(admission.totalPackage || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-[10px] text-emerald-600 uppercase font-bold mb-1">Received</p>
              <p className="text-xl font-bold text-emerald-700">Rs. {(admission.feeReceived || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-8 border-t border-slate-100">
          <Button variant="outline" className="border-superior-gold text-superior-gold" onClick={onDownloadReceipt}>
            <Receipt size={16} className="mr-2" /> Download Fee Receipt
          </Button>
          {!admission.isAdmitted && (
            <Button 
              className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
              onClick={() => {
                data.confirmAdmission(admission.id, data.currentUser?.email);
                toast.success("Admission confirmed!");
              }}
            >
              <CheckCircle2 size={18} className="mr-2" /> Confirm Admission
            </Button>
          )}
          <Button 
            className="bg-superior-teal text-white hover:bg-superior-teal/90 font-bold"
            onClick={onEdit}
          >
            Edit Details
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdmissionSlip({ admission, settings }: { admission: Admission, settings: any }) {
  const slipRef = React.useRef<HTMLDivElement>(null);

  const downloadSlip = async () => {
    if (!slipRef.current) return;
    const toastId = toast.loading("Generating High-Fidelity Slip...");
    try {
      const dataUrl = await toPng(slipRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const imgProps = new Image();
      imgProps.src = dataUrl;
      await new Promise((resolve) => { imgProps.onload = resolve; });
      
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Use dynamic height if content is longer than A4
      const pdf = new jsPDF('p', 'mm', [pdfWidth, Math.max(297, pdfHeight)]);
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Admission_Slip_${admission.fullName.replace(/\s+/g, '_')}.pdf`);
      toast.dismiss(toastId);
      toast.success("Admission Slip downloaded!");
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Failed to download slip");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xl font-serif font-bold text-superior-teal">Admission Slip Preview</h3>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.print()}>
            <Download size={16} className="mr-2" /> Print
          </Button>
          <Button className="bg-superior-teal text-white" onClick={downloadSlip}>
            <Download size={16} className="mr-2" /> Download PDF
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-10 bg-slate-100 flex justify-center">
        <div 
          ref={slipRef}
          className="w-[210mm] min-h-[297mm] bg-white p-12 relative"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b-4 border-superior-teal pb-8 mb-10">
            <div className="flex gap-6 items-center">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 bg-slate-50 shadow-inner">
                {settings.logo ? (
                  <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="bg-superior-teal w-full h-full flex items-center justify-center text-white">
                    <School size={48} />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-4xl font-serif font-bold text-superior-teal tracking-tight uppercase" style={{ color: settings.themeColor }}>{settings.collegeName}</h1>
                <p className="text-superior-gold font-black tracking-[0.3em] text-sm mt-1 uppercase">{settings.campusName}</p>
                <div className="mt-3 flex gap-4 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  <span>Tel: {settings.contactNumber}</span>
                  <span>|</span>
                  <span>Email: {settings.email}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-superior-gold text-superior-teal px-8 py-3 rounded-2xl font-black text-sm mb-2 inline-block shadow-sm">
                ADMISSION SLIP
              </div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Date: {admission.date}</p>
              <div className="flex flex-col gap-1 mt-3">
                <p className="text-lg font-mono font-black text-superior-teal">ID: {admission.studentId || 'PENDING'}</p>
                <p className="text-xs font-mono font-black text-slate-400">CLN: {admission.collegeNo || '---'}</p>
              </div>
            </div>
          </div>

          {/* Student Info Section */}
          <div className="grid grid-cols-12 gap-10 mb-12">
            <div className="col-span-9 space-y-8">
              <div className="grid grid-cols-2 gap-y-6 gap-x-10">
                <PreviewItem label="Student Full Name" value={admission.fullName} />
                <PreviewItem label="Father's Name" value={admission.fatherName} />
                <PreviewItem label="B-Form / CNIC" value={admission.bayFormNo || '---'} />
                <PreviewItem label="Date of Birth" value={admission.dob || '---'} />
                <PreviewItem label="Contact (Primary)" value={admission.contactNumber} />
                <PreviewItem label="Gender" value={admission.gender} />
                <PreviewItem label="Permanent Address" value={admission.address} isFull />
              </div>
            </div>
            <div className="col-span-3 flex flex-col items-center justify-start">
              <div className="w-full aspect-[3/4] border-2 border-slate-200 rounded-3xl overflow-hidden bg-slate-50 flex items-center justify-center relative shadow-inner">
                {admission.photo ? (
                  <img src={admission.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="text-slate-200 flex flex-col items-center gap-2">
                    <User size={60} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Passport Photo</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Academic Details */}
          <section className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 mb-10 shadow-sm">
            <h3 className="text-[10px] font-black text-superior-teal uppercase tracking-[0.3em] mb-8 border-b border-slate-200 pb-3">Academic Enrollment & Subjects</h3>
            <div className="grid grid-cols-3 gap-8">
              <PreviewItem label="Category" value={admission.category} />
              <PreviewItem label="Academic Group" value={admission.group || '---'} />
              <PreviewItem label="Proposed Section" value={admission.section || '---'} />
              <PreviewItem label="Board Roll No" value={admission.boardRollNo || '---'} />
              <PreviewItem label="Previous Class" value={admission.previousClass || '---'} />
              <PreviewItem label="Grade / Marks" value={String(admission.previousMarks || '---')} />
            </div>
            <div className="mt-8">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Course Subjects Authorized</p>
              <div className="flex flex-wrap gap-2">
                {(admission.subjects || []).map(subject => (
                  <div key={subject} className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 shadow-sm">
                    {subject}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Fee Breakdown */}
          <section className="space-y-6 mb-12">
            <h3 className="text-[10px] font-black text-superior-teal uppercase tracking-[0.3em] mb-4 border-b border-slate-200 pb-3">Financial Structure & Payment Records</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-5 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] text-slate-400 font-black uppercase mb-1">Tuition Fee</p>
                <p className="text-lg font-black text-slate-700">Rs. {(admission.totalFeeFinalized || 0).toLocaleString()}</p>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] text-slate-400 font-black uppercase mb-1">Misc Funds</p>
                <p className="text-lg font-black text-slate-700">Rs. {(admission.miscFunds || 0).toLocaleString()}</p>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] text-slate-400 font-black uppercase mb-1">Admission Fee</p>
                <p className="text-lg font-black text-slate-700">Rs. {(admission.admissionFee || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-8 items-center bg-superior-teal rounded-[2.5rem] p-10 text-white shadow-xl">
              <div className="col-span-5">
                <p className="text-[10px] font-black uppercase opacity-60 mb-2">Total Package Value</p>
                <p className="text-4xl font-black">Rs. {(admission.totalPackage || 0).toLocaleString()}</p>
              </div>
              <div className="col-span-3 border-l border-white/20 pl-8">
                <p className="text-[10px] font-black uppercase opacity-60 mb-2">Payment Plan</p>
                <p className="text-xl font-black">{admission.paymentPlan}</p>
                {admission.paymentPlan === 'Installments' && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{admission.totalInstallments} Terms</span>
                  </div>
                )}
              </div>
              <div className="col-span-4 border-l border-white/20 pl-8 text-right">
                <p className="text-[10px] font-black uppercase opacity-60 mb-2">Installment Term</p>
                <p className="text-2xl font-black">Rs. {Math.round((admission.totalPackage || 0) / (admission.totalInstallments || 1)).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-[10px] text-emerald-600 font-black uppercase">Paid Amount</p>
                  <p className="text-3xl font-black text-emerald-700">Rs. {(admission.feeReceived || 0).toLocaleString()}</p>
                </div>
                <CheckCircle2 size={40} className="text-emerald-200" />
              </div>
              <div className="p-6 bg-rose-50 rounded-[2rem] border border-rose-100 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-[10px] text-rose-600 font-black uppercase">Outstanding</p>
                  <p className="text-3xl font-black text-rose-700">Rs. {((admission.totalPackage || 0) - (admission.feeReceived || 0)).toLocaleString()}</p>
                </div>
                <Info size={40} className="text-rose-200" />
              </div>
            </div>
          </section>

          {/* Footer Signatures */}
          <div className="mt-20 pt-10 border-t-2 border-slate-100 flex justify-between items-end">
            <div className="text-[10px] text-slate-400 max-w-sm leading-relaxed font-medium">
              This slip confirms the admission of {admission.fullName}. Please keep this document safe for all future academic and financial references at {settings.collegeName}.
            </div>
            <div className="flex gap-12">
              <div className="text-center w-44">
                <div className="h-0.5 w-full bg-slate-300 mb-2"></div>
                <p className="text-[8px] font-black uppercase text-slate-400">Accountant</p>
              </div>
              <div className="text-center w-44">
                <div className="h-0.5 w-full bg-slate-800 mb-2"></div>
                <p className="text-[8px] font-black uppercase text-slate-800">Authorized Official</p>
              </div>
            </div>
          </div>

          {/* Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none -rotate-12">
             <School size={500} />
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

function SummaryCard({ label, value, active, onClick, iconColor, bgColor, hoverColor }: any) {
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
          <User size={24} className={active ? "text-white" : iconColor} />
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

function AdmissionForm({ data, onClose, selectedSession }: { data: any, onClose: () => void, selectedSession?: string }) {
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
    reference: '',
    gender: 'Male' as Gender,
    category: 'Inter Part-1 Boys' as any,
    group: '',
    section: '',
    photo: '',
    studentId: '',
    status: 'Prospective' as any
  });

  // Auto-calculate Total Package
  React.useEffect(() => {
    const total = Number(formData.admissionFee || 0) + 
                  Number(formData.miscFunds || 0) + 
                  Number(formData.totalFeeFinalized || 0);
    setFormData(prev => ({ ...prev, totalPackage: total }));
  }, [formData.admissionFee, formData.miscFunds, formData.totalFeeFinalized]);

  // Auto-confirm admission when received amount is entered
  React.useEffect(() => {
    if (Number(formData.feeReceived) > 0 && !formData.studentId) {
      const newId = data.generateStudentId();
      setFormData(prev => ({ 
        ...prev, 
        studentId: newId,
        status: 'Admitted/Confirmed'
      }));
      toast.success(`Student ID Generated: ${newId}. Admission confirmed due to payment!`);
    }
  }, [formData.feeReceived]);

  const categories = [
    'Inter Part-1 Boys',
    'Inter Part-2 Boys',
    'Inter Part-1 Girls',
    'Inter Part-2 Girls'
  ];

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const previewRef = React.useRef<HTMLDivElement>(null);

  const handleGroupChange = (groupName: string) => {
    const group = ACADEMIC_GROUPS.find(g => g.name === groupName);
    if (group) {
      const newSubjects = Array.from(new Set([...COMPULSORY_SUBJECTS, ...group.subjects]));
      setFormData(prev => ({ ...prev, group: groupName, subjects: newSubjects }));
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
      feePerSemester: formData.feePerSemester,
      nextSemesterDueDate: formData.nextSemesterDueDate,
      contactNumber: formData.contactNumber,
      fatherContact: formData.fatherContact,
      secondaryContact: formData.secondaryContact,
      reference: formData.reference,
      gender: formData.gender,
      photo: formData.photo || "",
      status: formData.status || status,
      isAdmitted: formData.status === 'Admitted/Confirmed' || received > 0
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const studentId = data.generateStudentId();
        setFormData(prev => ({ 
          ...prev, 
          photo: reader.result as string,
          studentId: studentId,
          status: 'Admitted/Confirmed'
        }));
        toast.success(`Photo uploaded! Student ID Generated: ${studentId}`);
      };
      reader.readAsDataURL(file);
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
          <TabsContent value="student" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl border-4 border-dashed border-superior-teal/20 bg-slate-50 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-superior-teal group-hover:bg-superior-teal/5">
                  {formData.photo ? (
                    <img src={formData.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <>
                      <Camera className="text-superior-teal/40 mb-2" size={32} />
                      <span className="text-[10px] text-slate-500 font-black uppercase text-center px-4">Upload Photo to Admit</span>
                    </>
                  )}
                </div>
                <label className="absolute inset-0 cursor-pointer">
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
                {formData.photo && (
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white">
                    <CheckCircle2 size={16} />
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                {formData.studentId ? (
                  <span className="text-emerald-600">Student ID: {formData.studentId} (Admitted)</span>
                ) : (
                  "Photo Upload Triggers Admission & ID Generation"
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">Admission Category</Label>
                <Select value={formData.category} onValueChange={(v: any) => {
                  const gender = v.includes('Girls') ? 'Female' : 'Male';
                  setFormData({...formData, category: v, gender});
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender (Auto-set)</Label>
                <Select disabled value={formData.gender}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="collegeNo">College No.</Label>
                <Input 
                  id="collegeNo" 
                  placeholder="Enter College #"
                  value={formData.collegeNo}
                  onChange={e => setFormData({...formData, collegeNo: e.target.value})}
                />
              </div>
              <div className="space-y-2 text-superior-teal font-black">
                <Label htmlFor="fullName">Student Full Name</Label>
                <Input 
                  id="fullName" 
                  required 
                  placeholder="Enter student's full name"
                  className="border-superior-teal/30"
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fatherName">Father's Name</Label>
                <Input 
                  id="fatherName" 
                  required 
                  placeholder="Enter father's name"
                  value={formData.fatherName}
                  onChange={e => setFormData({...formData, fatherName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bayFormNo">B-Form No.</Label>
                <Input 
                  id="bayFormNo" 
                  placeholder="xxxx-xxxxxxx-x"
                  value={formData.bayFormNo}
                  onChange={e => setFormData({...formData, bayFormNo: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input 
                  id="dob" 
                  type="date"
                  value={formData.dob}
                  onChange={e => setFormData({...formData, dob: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Student Contact Number</Label>
                <Input 
                  id="contact" 
                  required 
                  placeholder="03xx-xxxxxxx"
                  value={formData.contactNumber}
                  onChange={e => setFormData({...formData, contactNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fatherContact">Father's Contact Number</Label>
                <Input 
                  id="fatherContact" 
                  placeholder="03xx-xxxxxxx"
                  value={formData.fatherContact}
                  onChange={e => setFormData({...formData, fatherContact: e.target.value})}
                />
              </div>

              <Separator className="col-span-full my-4" />
              <h4 className="col-span-full text-xs font-black uppercase tracking-widest text-superior-teal">Academic Background</h4>

              <div className="space-y-2">
                <Label htmlFor="prevClass">Previous Class</Label>
                <Select value={formData.previousClass} onValueChange={(v: any) => setFormData({...formData, previousClass: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9th">9th Class</SelectItem>
                    <SelectItem value="10th">10th Class</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="boardRollNo">Board Roll No.</Label>
                <Input 
                  id="boardRollNo" 
                  placeholder="Enter Roll #"
                  value={formData.boardRollNo}
                  onChange={e => setFormData({...formData, boardRollNo: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prevMarks">Marks Obtained</Label>
                <Input 
                  id="prevMarks" 
                  type="number" 
                  required 
                  value={formData.previousMarks}
                  onChange={e => setFormData({...formData, previousMarks: e.target.value})}
                />
              </div>
              <div className="space-y-2 col-span-md-2">
                <Label htmlFor="prevInst">Previous Institute</Label>
                <Input 
                  id="prevInst" 
                  required 
                  value={formData.previousInstitute}
                  onChange={e => setFormData({...formData, previousInstitute: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address" 
                required 
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setActiveTab('subjects')} className="bg-superior-teal text-white">
                Next: Subjects & Group
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-lg font-bold text-superior-teal">Academic Group</Label>
                  <Select value={formData.group} onValueChange={handleGroupChange}>
                    <SelectTrigger className="h-14 text-lg font-medium border-2 border-superior-teal/20">
                      <SelectValue placeholder="Select Academic Group" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {ACADEMIC_GROUPS.map(group => (
                        <SelectItem key={group.name} value={group.name} className="py-3 text-base">
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-lg font-bold text-superior-teal">Manual Section Input</Label>
                  <Input 
                    placeholder="e.g. A1, B2" 
                    className="h-14 text-lg font-medium border-2 border-superior-teal/20"
                    value={formData.section}
                    onChange={e => setFormData({...formData, section: e.target.value.toUpperCase()})}
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                <div className="space-y-3">
                  <Label className="text-superior-teal font-bold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-superior-teal" />
                    Compulsory Subjects
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {COMPULSORY_SUBJECTS.map(subject => (
                      <div key={subject} className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-slate-100">
                        <Checkbox 
                          id={`comp-subject-${subject}`} 
                          checked={(formData.subjects || []).includes(subject)}
                          onCheckedChange={() => toggleSubject(subject)}
                        />
                        <label htmlFor={`comp-subject-${subject}`} className="text-xs font-bold leading-none cursor-pointer text-slate-700">
                          {subject}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-superior-teal font-bold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-superior-gold" />
                    Elective & Group Subjects
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SUBJECTS.filter(s => !COMPULSORY_SUBJECTS.includes(s)).map(subject => (
                      <div key={subject} className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-slate-100">
                        <Checkbox 
                          id={`subject-${subject}`} 
                          checked={(formData.subjects || []).includes(subject)}
                          onCheckedChange={() => toggleSubject(subject)}
                        />
                        <label htmlFor={`subject-${subject}`} className="text-xs font-bold leading-none cursor-pointer text-slate-700">
                          {subject}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setActiveTab('student')}>Back</Button>
              <Button type="button" onClick={() => setActiveTab('fees')} className="bg-superior-teal text-white">
                Next: Fee Details
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="fees" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="admissionFee" className="text-superior-gold font-black">Admission Fee</Label>
                <Input 
                  id="admissionFee" 
                  type="number" 
                  required
                  placeholder="Enter admission fee"
                  className="border-superior-gold/20"
                  value={formData.admissionFee}
                  onChange={e => setFormData({...formData, admissionFee: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="miscFunds">Miscellaneous Funds</Label>
                <Input 
                  id="miscFunds" 
                  type="number" 
                  placeholder="Library, Lab, etc."
                  value={formData.miscFunds}
                  onChange={e => setFormData({...formData, miscFunds: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalFeeFinalized">Total Finalized Tuition Fee</Label>
                <Input 
                  id="totalFeeFinalized" 
                  type="number" 
                  required 
                  placeholder="Enter tuition fee"
                  value={formData.totalFeeFinalized}
                  onChange={e => setFormData({...formData, totalFeeFinalized: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">Total Package (Calculated)</Label>
                <div className="h-12 bg-emerald-50 border-2 border-emerald-100 rounded-xl flex items-center px-4 font-black text-emerald-700">
                  Rs. {formData.totalPackage.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="feeReceived" className="font-black text-superior-teal">Amount Received (Initial)</Label>
                <Input 
                  id="feeReceived" 
                  type="number" 
                  required 
                  placeholder="Confirm payment to allot ID"
                  className="h-14 text-xl border-superior-teal/30 focus:border-superior-teal"
                  value={formData.feeReceived}
                  onChange={e => setFormData({...formData, feeReceived: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-lg font-bold text-superior-teal">Payment Plan</Label>
                <Select value={formData.paymentPlan} onValueChange={(v: any) => setFormData({...formData, paymentPlan: v})}>
                  <SelectTrigger className="h-14 border-2 border-superior-teal/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semester">Semester Plan</SelectItem>
                    <SelectItem value="Installments">Installment Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.paymentPlan === 'Installments' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-6 bg-slate-50 border border-slate-200 rounded-2xl"
                >
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="font-black text-slate-700 uppercase tracking-widest text-[10px]">Select Number of Installments</Label>
                        <Badge variant="outline" className="bg-white border-superior-teal text-superior-teal font-black">{formData.totalInstallments} Months</Badge>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="12" 
                        value={formData.totalInstallments} 
                        onChange={(e) => setFormData({...formData, totalInstallments: Number(e.target.value)})}
                        className="w-full accent-superior-teal"
                      />
                      <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>1 Installment</span>
                        <span>12 Installments</span>
                      </div>
                    </div>

                    <div className="w-1 px-8 hidden md:block">
                      <Separator orientation="vertical" className="h-20" />
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid Installments</Label>
                        <Select value={String(formData.paidInstallments)} onValueChange={(v) => setFormData({...formData, paidInstallments: Number(v)})}>
                          <SelectTrigger className="h-10 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: formData.totalInstallments + 1 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>{i} Paid</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Summary</p>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-emerald-600">Paid: {formData.paidInstallments}</p>
                          <p className="text-xs font-bold text-rose-600">Remaining: {Math.max(0, formData.totalInstallments - formData.paidInstallments)}</p>
                          <p className="text-xs font-black text-slate-800 border-t border-slate-200 pt-0.5 mt-1">Total: {formData.totalInstallments}</p>
                        </div>
                      </div>
                    </div>

                    <div className="w-1 px-8 hidden md:block">
                      <Separator orientation="vertical" className="h-20" />
                    </div>

                    <div className="text-center md:text-left space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Installment Amount</p>
                      <p className="text-3xl font-display font-black text-superior-teal">
                        Rs. {Math.round(Number(formData.totalPackage || 0) / (formData.totalInstallments || 1)).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium italic">Calculated from Total Package</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {formData.paymentPlan === 'Semester' && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Total Semesters</Label>
                      <Input 
                        type="number" 
                        value={formData.totalSemesters} 
                        onChange={e => setFormData({...formData, totalSemesters: Number(e.target.value)})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fee Per Semester</Label>
                      <Input 
                        type="number" 
                        value={formData.feePerSemester} 
                        onChange={e => setFormData({...formData, feePerSemester: Number(e.target.value)})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Next Semester Due Date</Label>
                      <Input 
                        type="date" 
                        value={formData.nextSemesterDueDate} 
                        onChange={e => setFormData({...formData, nextSemesterDueDate: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

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
          style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-4 border-superior-teal pb-8 mb-10">
            <div className="flex items-center gap-6">
              <div className="rounded-3xl overflow-hidden w-24 h-24 flex items-center justify-center bg-slate-50 border border-slate-100">
                {data.settings.logo ? (
                  <img src={data.settings.logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="bg-superior-teal w-full h-full flex items-center justify-center">
                    <School className="text-superior-gold" size={50} />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-4xl font-serif font-bold text-superior-teal uppercase tracking-tight" style={{ color: data.settings.themeColor }}>{data.settings.collegeName}</h2>
                <p className="text-lg text-superior-gold uppercase tracking-[0.3em] font-black">{data.settings.campusName}</p>
                <div className="flex gap-3 mt-3">
                  {formData.studentId && (
                    <div className="bg-superior-teal text-white px-4 py-1.5 rounded-lg font-mono text-xs font-black shadow-sm">
                      ST-ID: {formData.studentId}
                    </div>
                  )}
                  {formData.collegeNo && (
                    <div className="bg-slate-800 text-white px-4 py-1.5 rounded-lg font-mono text-xs font-black shadow-sm">
                      COLLEGE NO: {formData.collegeNo}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block bg-superior-gold text-superior-teal px-8 py-3 rounded-2xl text-base font-black mb-3 shadow-sm">ADMISSION FORM</div>
              <p className="text-sm text-slate-500 font-bold">Session: {selectedSession}</p>
              <p className="text-xs text-slate-400 font-mono mt-1">Issue Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Sidebar with Photo & Basic Info */}
            <div className="col-span-3 space-y-6">
              <div className="aspect-[3/4] rounded-3xl border-2 border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shadow-inner">
                {formData.photo ? (
                  <img src={formData.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 opacity-20">
                    <User size={60} />
                    <span className="text-[10px] font-black uppercase">Paste Photo Here</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Gender</p>
                  <p className="text-base font-black text-slate-700 uppercase">{formData.gender || '---'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 uppercase font-black mb-1">B-Form / CNIC</p>
                  <p className="text-base font-mono font-black text-slate-700">{formData.bayFormNo || '---'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Date of Birth</p>
                  <p className="text-base font-black text-slate-700">{formData.dob ? new Date(formData.dob).toLocaleDateString() : '---'}</p>
                </div>
                <div className={`p-4 rounded-2xl border shadow-sm ${Number(formData.feeReceived) > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-superior-gold/5 border-superior-gold/10'}`}>
                  <p className={`text-[10px] uppercase font-black mb-1 ${Number(formData.feeReceived) > 0 ? 'text-emerald-600' : 'text-superior-gold'}`}>Enrollment Status</p>
                  <p className={`text-lg font-black ${Number(formData.feeReceived) > 0 ? 'text-emerald-700' : 'text-superior-gold'}`}>
                    {Number(formData.feeReceived) > 0 ? "CONFIRMED" : "PENDING"}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Details Section */}
            <div className="col-span-9 space-y-8">
              {/* Student Identification */}
              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-superior-teal uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Student Information</h4>
                <div className="grid grid-cols-2 gap-y-6 gap-x-10">
                  <PreviewItem label="Student Full Name" value={formData.fullName || '---'} />
                  <PreviewItem label="Father's Name" value={formData.fatherName || '---'} />
                  <PreviewItem label="Contact (Student)" value={formData.contactNumber || '---'} />
                  <PreviewItem label="Contact (Father)" value={formData.fatherContact || '---'} />
                  <div className="col-span-2 space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Permanent Address</p>
                    <p className="text-lg font-medium text-slate-800 border-b border-slate-100 pb-1">{formData.address || '---'}</p>
                  </div>
                </div>
              </section>

              {/* Academic Profile */}
              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-superior-teal uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Academic & Group Selection</h4>
                <div className="grid grid-cols-2 gap-y-6 gap-x-10">
                  <PreviewItem label="Admission Category" value={formData.category || '---'} />
                  <PreviewItem label="Academic Group" value={formData.group || '---'} />
                  <PreviewItem label="Board Roll No" value={formData.boardRollNo || '---'} />
                  <PreviewItem label="Previous Class" value={formData.previousClass || '---'} />
                  <PreviewItem label="Previous Marks" value={formData.previousMarks || '---'} />
                  <PreviewItem label="Institute Attended" value={formData.previousInstitute || '---'} />
                </div>

                <div className="mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-black mb-3">Selected Course Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {(formData.subjects || []).length > 0 ? (
                      (formData.subjects || []).map(s => (
                        <span key={s} className="bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm">
                          {s}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-slate-300 italic">No subjects selected</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Financial Structure */}
              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-superior-teal uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Financial Breakdown & Payment Plan</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[8px] text-slate-400 uppercase font-black mb-1">Admission Fee</p>
                    <p className="text-xl font-bold text-slate-700">Rs. {Number(formData.admissionFee || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[8px] text-slate-400 uppercase font-black mb-1">Misc Funds</p>
                    <p className="text-xl font-bold text-slate-700">Rs. {Number(formData.miscFunds || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[8px] text-slate-400 uppercase font-black mb-1">Tuition Fee</p>
                    <p className="text-xl font-bold text-slate-700">Rs. {Number(formData.totalFeeFinalized || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-superior-teal p-6 rounded-3xl text-white flex justify-between items-center shadow-lg">
                  <div>
                    <p className="text-[10px] uppercase font-black opacity-60 mb-1">Total Package Value</p>
                    <p className="text-4xl font-black">Rs. {Number(formData.totalPackage || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black opacity-60 mb-1">Payment Plan</p>
                    <p className="text-xl font-bold">{formData.paymentPlan} Plan</p>
                    {formData.paymentPlan === 'Installments' && (
                      <p className="text-xs font-black bg-white/20 px-3 py-1 rounded-full mt-2 inline-block">
                        {formData.totalInstallments} Installments of Rs. {Math.round(Number(formData.totalPackage || 0) / (formData.totalInstallments || 1)).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">Initial Received</p>
                      <p className="text-2xl font-black text-emerald-600">Rs. {Number(formData.feeReceived || 0).toLocaleString()}</p>
                    </div>
                    <CheckCircle2 size={30} className="text-emerald-100" />
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">Remaining Balance</p>
                      <p className="text-2xl font-black text-rose-600">Rs. {(Number(formData.totalPackage || 0) - Number(formData.feeReceived || 0)).toLocaleString()}</p>
                    </div>
                    <Info size={30} className="text-rose-100" />
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between">
            <div className="text-center w-56">
              <div className="h-0.5 w-full bg-slate-300 mb-2"></div>
              <p className="text-[10px] font-black uppercase text-slate-400">Student/Guardian Signature</p>
            </div>
            <div className="text-center w-56">
              <div className="h-0.5 w-full bg-slate-800 mb-2"></div>
              <p className="text-[10px] font-black uppercase text-slate-800">Office Superintendent</p>
            </div>
            <div className="text-center w-56">
              <div className="h-0.5 w-full bg-slate-300 mb-2"></div>
              <p className="text-[10px] font-black uppercase text-slate-400">Principal Signature</p>
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

function PreviewItem({ label, value, isFull }: { label: string, value: string, isFull?: boolean }) {
  return (
    <div className={`space-y-1 ${isFull ? 'col-span-2' : ''}`}>
      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-1">{value}</p>
    </div>
  );
}
