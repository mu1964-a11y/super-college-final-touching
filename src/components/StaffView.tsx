
import * as React from 'react';
import { useState } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Eye, 
  Plus,
  User,
  Briefcase,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Download,
  Users,
  Camera,
  Trash2,
  AlertCircle,
  CreditCard,
  Printer,
  FileSpreadsheet,
  Upload
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Staff, StaffRole } from '../types';
import { STAFF_ROLES } from '../constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { compressImage, base64ToBlob } from '../lib/imageUtils';

import * as XLSX from 'xlsx';
import StaffAttendance from './StaffAttendance';
import StaffPayroll from './StaffPayroll';
import StaffSubjects from './StaffSubjects';
import StaffTimetable from './StaffTimetable';

export default function StaffView({ data, initialFilter, title, hideNavigation }: { data: any, initialFilter?: string | null, title?: string, hideNavigation?: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(
    ['all', 'Management', 'Academic', 'Administration', 'Support'].includes(initialFilter || 'all') 
      ? (initialFilter || 'all') 
      : 'all'
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [dialogType, setDialogType] = useState<'profile' | 'edit' | 'delete' | 'bulkDelete' | null>(null);

  const [activeModule, setActiveModule] = useState<'directory' | 'attendance' | 'payroll' | 'timetable' | 'subjects'>(
    ['directory', 'attendance', 'payroll', 'timetable', 'subjects'].includes(initialFilter as string) 
      ? (initialFilter as any) 
      : 'directory'
  );

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredStaff.map((staff: Staff) => ({
      "Staff ID": staff.id,
      "Full Name": staff.fullName,
      "Father Name": staff.fatherName,
      "CNIC": staff.cnic,
      "Contact": staff.contact,
      "Role": staff.role || "",
      "Status": staff.status,
      "Join Date": staff.joinDate,
      "Salary": staff.baseSalary || staff.salary || 0,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff");
    XLSX.writeFile(wb, `Staff_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filteredStaff.map((staff: Staff) => ({
      "Staff ID": staff.id,
      "Full Name": staff.fullName,
      "Father Name": staff.fatherName,
      "CNIC": staff.cnic,
      "Contact": staff.contact,
      "Role": staff.role || "",
      "Status": staff.status,
      "Join Date": staff.joinDate,
      "Salary": staff.baseSalary || staff.salary || 0,
    })));
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Staff_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const template = [{
      "Staff ID": "SGC-T-001",
      "Full Name": "John Doe",
      "Father Name": "Richard Doe",
      "CNIC": "12345-1234567-1",
      "Contact": "03001234567",
      "Role": "Lecturer",
      "Status": "Active",
      "Join Date": new Date().toISOString().split('T')[0],
      "Salary": 50000
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff_Template");
    XLSX.writeFile(wb, "Staff_Format_Template.xlsx");
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          toast.error("The uploaded file is empty.");
          return;
        }

        let importCount = 0;
        const toastId = toast.loading("Processing staff import...");
        
        for (const row of rows as any[]) {
          // Generate ID if not provided
          let id = row['Staff ID'] || row['ID'] || '';
          if (!id) {
            const currentIds = data.staff.map((s: Staff) => s.id)
                .filter((i: string) => typeof i === 'string' && i.startsWith('SGC-T-'))
                .map((i: string) => parseInt(i.replace('SGC-T-', ''), 10))
                .filter((num: number) => !isNaN(num));
            const nextNum = currentIds.length > 0 ? Math.max(...currentIds) + 1 : 1;
            id = `SGC-T-${(nextNum + importCount).toString().padStart(3, '0')}`;
          }

          const existingStaff = data.staff.find((s: Staff) => s.id === id);
          if (existingStaff) continue; // skip duplicates manually
          
          await data.addStaff({
            id: id,
            fullName: row['Full Name'] || row['Name'] || '',
            fatherName: row['Father Name'] || '',
            cnic: row['CNIC'] || '',
            contact: row['Contact'] || row['Phone'] || '',
            role: row['Role'] || row['Designation'] || 'Lecturer',
            status: row['Status'] || 'Active',
            joinDate: row['Join Date'] || new Date().toISOString().split('T')[0],
            qualification: '',
            salary: row['Salary'] || 0,
            baseSalary: row['Salary'] || 0,
            subjects: [],
            photo: ''
          });
          importCount++;
        }
        toast.dismiss(toastId);
        toast.success(`Successfully imported ${importCount} staff members!`);
        if (data.fetchData) data.fetchData(true);
      } catch (err) {
        toast.dismiss();
        toast.error("Failed to parse file. Please use the provided format.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Sync with initialFilter if it changes from sidebar
  React.useEffect(() => {
    if (initialFilter) {
      if (['all', 'Management', 'Academic', 'Administration', 'Support'].includes(initialFilter)) {
        setActiveModule('directory');
        setRoleFilter(initialFilter);
      } else if (initialFilter === 'directory') {
        setActiveModule('directory');
        setRoleFilter('all');
      } else if (['attendance', 'payroll', 'timetable', 'subjects'].includes(initialFilter)) {
        setActiveModule(initialFilter as any);
        setRoleFilter('all');
      }
    }
  }, [initialFilter]);

  const roleGroups: Record<string, StaffRole[]> = {
    'Management': ['Directors', 'Coordinator'],
    'Academic': ['Lecturer', 'Exam Controller', 'Librarian', 'Lab Attendant'],
    'Administration': ['Admin Officer', 'Accountant', 'Receptionist'],
    'Support': ['Office Boy', 'Guard', 'Gardener', 'Sweeper']
  };

  const filteredStaff = data.staff.filter((s: Staff) => {
    const name = s.fullName || '';
    const id = s.id || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         id.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesRole = roleFilter === 'all';
    if (!matchesRole) {
      if (roleGroups[roleFilter]) {
        matchesRole = roleGroups[roleFilter].includes(s.role);
      } else {
        matchesRole = s.role === roleFilter;
      }
    }

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedStaffIds.length === filteredStaff.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(filteredStaff.map((s: Staff) => s.id));
    }
  };

  const toggleSelectStaff = (id: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    setDialogType('bulkDelete');
  };

  const getRoleBadge = (role: StaffRole) => {
    const group = Object.entries(roleGroups).find(([_, roles]) => roles.includes(role))?.[0];
    
    switch (group) {
      case 'Management': return <Badge className="bg-rose-100 text-rose-700 border-rose-200">{role}</Badge>;
      case 'Academic': return <Badge className="bg-superior-teal/10 text-superior-teal border-superior-teal/20">{role}</Badge>;
      case 'Administration': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">{role}</Badge>;
      case 'Support': return <Badge className="bg-slate-100 text-slate-700 border-slate-200">{role}</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-700 border-slate-200">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-3xl font-display font-black text-superior-teal tracking-tight">
              {title || "Staff Management"}
            </h3>
            {!title && (
              <>
                <span className="text-slate-300 text-2xl">/</span>
                <span className="urdu-text text-2xl text-superior-gold font-medium">اسٹاف مینجمنٹ</span>
              </>
            )}
          </div>
        </div>
        
        {!hideNavigation && (
          <div className="flex items-center gap-4">
            <div className="bg-white px-6 py-4 rounded-3xl flex items-center gap-5 border border-slate-100 shadow-sm">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Staff</p>
                <p className="text-2xl font-display font-black text-superior-teal tracking-tight">{data.staff.length}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-superior-teal/5 text-superior-teal flex items-center justify-center shadow-inner">
                <Users size={24} />
              </div>
            </div>
          </div>
        )}
      </div>

      <Tabs value={activeModule} onValueChange={(v: any) => setActiveModule(v)} className="w-full space-y-8">
        {!hideNavigation && (
          <TabsList className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm h-auto flex flex-wrap gap-2 w-full justify-start overflow-x-auto">
            <TabsTrigger value="directory" className="rounded-xl px-6 py-3 font-bold text-slate-500 data-[state=active]:bg-superior-teal data-[state=active]:text-white">Directory</TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-xl px-6 py-3 font-bold text-slate-500 data-[state=active]:bg-superior-teal data-[state=active]:text-white">Attendance</TabsTrigger>
            <TabsTrigger value="payroll" className="rounded-xl px-6 py-3 font-bold text-slate-500 data-[state=active]:bg-superior-teal data-[state=active]:text-white">Payroll & Salaries</TabsTrigger>
            <TabsTrigger value="timetable" className="rounded-xl px-6 py-3 font-bold text-slate-500 data-[state=active]:bg-superior-teal data-[state=active]:text-white">Timetable</TabsTrigger>
            <TabsTrigger value="subjects" className="rounded-xl px-6 py-3 font-bold text-slate-500 data-[state=active]:bg-superior-teal data-[state=active]:text-white">Subjects</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="directory" className="space-y-8 mt-0 focus-visible:outline-none">
          {/* Bulk Actions Bar */}
          {selectedStaffIds.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-4 z-30 flex items-center justify-between p-4 bg-superior-teal rounded-2xl shadow-2xl text-white mb-6 border border-white/10"
        >
          <div className="flex items-center gap-4 pl-2">
            <Checkbox 
              checked={selectedStaffIds.length === filteredStaff.length} 
              onCheckedChange={toggleSelectAll} 
              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-superior-teal"
            />
            <div className="flex flex-col">
              <p className="text-sm font-black uppercase tracking-widest">
                {selectedStaffIds.length} staff member{selectedStaffIds.length > 1 ? 's' : ''} selected
              </p>
              {selectedStaffIds.length < filteredStaff.length && (
                <button 
                  onClick={() => setSelectedStaffIds(filteredStaff.map(s => s.id))}
                  className="text-[10px] font-black underline uppercase tracking-tighter opacity-70 hover:opacity-100 text-left"
                >
                  Select all {filteredStaff.length} matching staff
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedStaffIds([])}
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

      {/* Category Tabs */}
      <Tabs value={roleFilter} className="w-full" onValueChange={setRoleFilter}>
        <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 h-auto flex flex-wrap max-w-fit mb-8">
          <TabsTrigger value="all" className="rounded-xl font-bold px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all">All ({data.staff.length})</TabsTrigger>
          <TabsTrigger value="Management" className="rounded-xl font-bold px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all">Management</TabsTrigger>
          <TabsTrigger value="Academic" className="rounded-xl font-bold px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all">Academic</TabsTrigger>
          <TabsTrigger value="Administration" className="rounded-xl font-bold px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all">Admin</TabsTrigger>
          <TabsTrigger value="Support" className="rounded-xl font-bold px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-superior-teal data-[state=active]:shadow-sm transition-all">Support</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-5 mb-10 hover:border-superior-teal/20 transition-all duration-500">
        <div className="flex items-center gap-3 pr-5 border-r border-slate-100">
          <Checkbox 
            id="select-all-staff"
            checked={selectedStaffIds.length === filteredStaff.length && filteredStaff.length > 0} 
            onCheckedChange={toggleSelectAll} 
            className="w-5 h-5 rounded-lg border-slate-200 data-[state=checked]:bg-superior-teal data-[state=checked]:border-superior-teal transition-all"
          />
          <Label htmlFor="select-all-staff" className="text-[11px] font-black text-slate-400 cursor-pointer uppercase tracking-widest">Select All</Label>
        </div>

        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Search staff by name or ID..." 
            className="pl-12 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="outline" className="h-12 w-12 rounded-2xl border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700">
                <MoreHorizontal size={18} />
              </Button>
            } />
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl shadow-slate-200/50">
              <div className="px-2 py-1.5 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Bulk Actions
              </div>
              <DropdownMenuItem onClick={handleDownloadTemplate} className="rounded-lg py-3 cursor-pointer">
                <FileSpreadsheet size={16} className="mr-2 text-superior-teal" />
                Download Format Template
              </DropdownMenuItem>
              <div className="relative">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  accept=".xlsx, .xls, .csv"
                  onChange={handleBulkImport}
                />
                <DropdownMenuItem className="rounded-lg py-3 cursor-pointer">
                  <Upload size={16} className="mr-2 text-blue-600" />
                  Bulk Import Staff
                </DropdownMenuItem>
              </div>
              <Separator className="my-2" />
              <DropdownMenuItem onClick={handleExportExcel} className="rounded-lg py-3 cursor-pointer">
                <Download size={16} className="mr-2 text-emerald-600" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="rounded-lg py-3 cursor-pointer">
                <Download size={16} className="mr-2 text-superior-gold" />
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog>
            <DialogTrigger nativeButton={true} render={
              <button className="h-12 px-6 rounded-2xl bg-superior-teal text-white font-black uppercase tracking-widest text-xs hover:bg-superior-teal/90 shadow-lg shadow-superior-teal/10 transition-all flex items-center justify-center">
                <Plus size={18} className="mr-2" /> Add Staff Member
              </button>
            }>
            </DialogTrigger>
            <AddStaffDialog data={data} />
          </Dialog>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredStaff.map((member: Staff) => (
          <motion.div
            key={member.id}
            whileHover={{ y: -8 }}
            className={cn(
              "bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden relative group transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-superior-teal/5",
              selectedStaffIds.includes(member.id) && "ring-4 ring-superior-teal ring-offset-4"
            )}
          >
            <div className="absolute top-6 left-6 z-20">
              <Checkbox 
                checked={selectedStaffIds.includes(member.id)} 
                onCheckedChange={() => toggleSelectStaff(member.id)}
                className="w-5 h-5 bg-white/40 backdrop-blur-md border-white/30 rounded-lg data-[state=checked]:bg-superior-teal data-[state=checked]:border-superior-teal transition-all"
              />
            </div>
            <div className="bg-superior-teal h-28 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
              <div className="absolute -bottom-14 left-8">
                <div className="w-28 h-28 rounded-3xl border-4 border-white bg-slate-50 overflow-hidden shadow-lg shadow-black/5">
                  {member.photo ? (
                    <img 
                      src={member.photo} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-superior-gold/10 text-superior-gold font-bold text-lg">${member.fullName.charAt(0)}</div>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                      <User size={48} />
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute top-6 right-6">
                <Badge className={cn(
                  "rounded-xl px-3 py-1 font-black uppercase tracking-widest text-[10px] shadow-lg",
                  member.status === 'Active' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-slate-500 text-white shadow-slate-500/20"
                )}>
                  {member.status}
                </Badge>
              </div>
            </div>
            <div className="pt-18 pb-8 px-8 bg-white">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-display font-black text-2xl text-slate-800 tracking-tight group-hover:text-superior-teal transition-colors">{member.fullName}</h3>
                  <p className="text-[10px] font-mono text-superior-gold font-black tracking-[0.2em] uppercase mt-1">{member.id}</p>
                </div>
                <div className="text-right">
                  {getRoleBadge(member.role)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 group-hover:bg-white group-hover:border-slate-100 transition-all">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Contact</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{member.contact}</p>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 group-hover:bg-white group-hover:border-slate-100 transition-all">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Joined</p>
                  <p className="text-xs font-bold text-slate-700">{member.joinDate}</p>
                </div>
              </div>

              <Separator className="mb-6 opacity-50" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Monthly Salary</p>
                  <p className="font-display font-black text-slate-800 text-lg">Rs. {(member.salary || 0).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 rounded-xl text-xs font-black uppercase tracking-widest border-slate-100 hover:bg-superior-teal hover:text-white hover:border-superior-teal transition-all px-4" 
                    onClick={() => {
                      setSelectedStaff(member);
                      setDialogType('profile');
                    }}
                  >
                    <Eye size={14} className="mr-2" /> Profile
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-10 w-10 rounded-xl hover:bg-slate-100 text-slate-400 flex items-center justify-center border border-transparent outline-hidden transition-all">
                      <MoreHorizontal size={18} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[200px] border-slate-100 shadow-2xl">
                      <DropdownMenuItem 
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-600 focus:bg-superior-teal/5 focus:text-superior-teal" 
                        onClick={() => {
                          setSelectedStaff(member);
                          setDialogType('edit');
                        }}
                      >
                        <Edit size={16} className="text-superior-gold" /> <span>Edit Details</span>
                      </DropdownMenuItem>
                      <Separator className="my-2 opacity-50" />
                      <DropdownMenuItem 
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-600"
                        onClick={() => {
                          setSelectedStaff(member);
                          setDialogType('delete');
                        }}
                      >
                        <Trash2 size={16} /> <span>Delete Record</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Centralized Dialogs */}
      <Dialog open={dialogType === 'delete'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">Delete Staff Record</DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete the record for <span className="font-bold text-slate-800">{selectedStaff?.fullName}</span>? This action is permanent and cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertCircle size={24} />
              </div>
              <p className="text-xs text-red-700 font-medium">Deleting this record will remove all associated employment history and salary data from the system.</p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setDialogType(null)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
            <Button variant="destructive" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={() => {
              if (selectedStaff) {
                data.deleteStaff(selectedStaff.id);
                setDialogType(null);
                toast.success("Staff record deleted successfully!");
              }
            }}>Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'bulkDelete'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">Bulk Delete Staff</DialogTitle>
            <DialogDescription className="text-slate-500">
              You are about to delete <span className="font-bold text-slate-800">{selectedStaffIds.length}</span> selected staff records.
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
              const idsToDelete = [...selectedStaffIds];
              setDialogType(null);
              setSelectedStaffIds([]);
              await data.bulkDeleteStaff(idsToDelete);
            }}>Delete All Selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'profile'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] overflow-y-auto p-0 border-none bg-white rounded-3xl">
          {selectedStaff && (
            <StaffProfile 
              member={selectedStaff} 
              data={data} 
              onEdit={() => setDialogType('edit')}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'edit'} onOpenChange={(open) => !open && setDialogType(null)}>
        {selectedStaff && (
          <EditStaffDialog 
            member={selectedStaff} 
            data={data} 
            onClose={() => setDialogType(null)} 
            onDelete={() => setDialogType('delete')}
          />
        )}
      </Dialog>
      </TabsContent>

      <TabsContent value="attendance" className="space-y-8 mt-0 focus-visible:outline-none">
        <StaffAttendance staffList={filteredStaff} attendanceRecords={data.staffAttendance} onSaveAttendance={data.bulkSaveStaffAttendance} />
      </TabsContent>

      <TabsContent value="payroll" className="space-y-8 mt-0 focus-visible:outline-none">
        <StaffPayroll 
          staffList={filteredStaff} 
          advances={data.staffAdvances || []} 
          staffTimetable={data.staffTimetable || []} 
          attendanceRecords={data.staffAttendance || []}
          onRecordAdvance={data.recordStaffAdvance} 
          onUpdateAdvance={data.updateStaffAdvance} 
        />
      </TabsContent>

      <TabsContent value="timetable" className="space-y-8 mt-0 focus-visible:outline-none">
        <StaffTimetable 
          staffList={filteredStaff} 
          timetableRecords={data.staffTimetable || []} 
          onAddEntry={data.addTimetableEntry} 
          onRemoveEntry={data.removeTimetableEntry} 
          predefinedSections={data?.settings?.predefinedSections || []}
        />
      </TabsContent>

      <TabsContent value="subjects" className="space-y-8 mt-0 focus-visible:outline-none">
        <StaffSubjects staffList={filteredStaff} onUpdateStaff={data.updateStaff} />
      </TabsContent>
      </Tabs>
    </div>
  );
}

function StaffProfile({ member, data, onEdit }: { member: Staff, data: any, onEdit?: () => void }) {
  const [imageError, setImageError] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const toastId = toast.loading("Processing photo...");
      try {
        const compressedBase64 = await compressImage(file);
        await data.updateStaff(member.id, { photo: compressedBase64 });
        setImageError(false);
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
      <div className="bg-slate-800 p-6 md:p-10 text-white relative">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-center relative z-10">
          <div className="relative group shrink-0">
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-2xl border-4 border-white/20 bg-white/10 backdrop-blur-md overflow-hidden">
              {member.photo && !imageError ? (
                <img 
                  src={member.photo} 
                  alt="" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                />
              ) : member.photo && imageError ? (
                <div className="w-full h-full flex items-center justify-center bg-superior-gold/10 text-superior-gold font-bold text-3xl">
                  {member.fullName.charAt(0)}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40">
                  <User size={64} />
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 p-2.5 bg-superior-gold text-superior-teal rounded-xl cursor-pointer hover:scale-110 active:scale-95 transition-all border-2 border-white">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          
          <div className="text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              <Briefcase size={12} /> Official Staff Member
            </div>
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-2 tracking-tight">{member.fullName}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-6 text-sm md:text-base opacity-90">
              <p className="font-mono font-bold text-superior-gold">{member.id}</p>
              <span className="hidden md:block opacity-30">|</span>
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-superior-gold" />
                <span>{member.role}</span>
              </div>
              <span className="hidden md:block opacity-30">|</span>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-superior-gold" />
                <span>Joined: {member.joinDate}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-superior-gold/5 rounded-full -ml-32 -mb-32 blur-2xl"></div>
      </div>

      <div className="p-6 md:p-10 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 text-lg">
              <User size={20} className="text-superior-teal" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoItem label="Father's Name" value={member.fatherName} />
              <InfoItem label="CNIC" value={member.cnic} />
              <InfoItem label="Date of Birth" value={member.dob} />
              <InfoItem label="Contact" value={member.contact} />
              <InfoItem label="Designation" value={member.role} />
              <div className="sm:col-span-2">
                <InfoItem label="Address" value={member.address} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 text-lg">
              <GraduationCap size={20} className="text-superior-teal" /> Professional Details
            </h3>
            <div className="space-y-6">
              <InfoItem label="Qualification" value={member.qualification || 'N/A'} />
              {member.role === 'Lecturer' && (
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Specializations</p>
                  <div className="flex flex-wrap gap-2">
                    {member.specialization?.map(s => (
                      <Badge key={s} variant="outline" className="text-xs bg-slate-50 px-3 py-1 border-slate-200">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-[10px] text-emerald-600 uppercase font-bold mb-1 tracking-wider">Monthly Salary</p>
                <p className="text-2xl font-bold text-emerald-700">Rs. {(member.salary || 0).toLocaleString()}</p>
              </div>
              {member.subjects && member.subjects.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Teaching Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {member.subjects.map(s => (
                      <Badge key={s} variant="outline" className="text-xs bg-superior-teal/5 text-superior-teal px-3 py-1 border-superior-teal/20">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
              <CreditCard size={20} className="text-superior-teal" /> Salary Payment History
            </h3>
            <Dialog>
              <DialogTrigger nativeButton={true} render={
                <button className="h-8 px-3 rounded-md bg-superior-teal text-white font-bold text-xs flex items-center justify-center hover:bg-superior-teal/90">
                  <Plus size={14} className="mr-1" /> Record Payment
                </button>
              }>
              </DialogTrigger>
              <RecordSalaryDialog member={member} data={data} />
            </Dialog>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase">Month/Year</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Amount</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Date</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Method</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.salaryPayments?.filter((p: any) => p.staffId === member.id).length > 0 ? (
                  data.salaryPayments.filter((p: any) => p.staffId === member.id).map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-bold text-slate-700">{payment.month} {payment.year}</TableCell>
                      <TableCell className="font-bold text-emerald-600">Rs. {(payment.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-slate-500">{payment.date}</TableCell>
                      <TableCell className="text-sm text-slate-500">{payment.paymentMethod}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase">{payment.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-superior-teal h-8 w-8 p-0">
                          <Printer size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-slate-400 italic text-sm">No salary records found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        </div>

        {member.role === 'Lecturer' && (
          <div className="space-y-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <Users size={20} className="text-superior-teal" /> Assigned Students
              </h3>
              <Button size="sm" variant="outline" className="text-xs font-bold border-slate-200"><Plus size={14} className="mr-1" /> Assign Student</Button>
            </div>
            <div className="bg-slate-50 p-12 rounded-3xl border border-dashed border-slate-200 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Users size={24} className="text-slate-300" />
              </div>
              <p className="text-sm text-slate-400 font-medium italic">No students currently assigned to this teacher.</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t border-slate-100">
          <Button variant="outline" className="h-11 px-6 text-superior-teal border-superior-teal/20 hover:bg-superior-teal/5 font-bold">
            <Download size={18} className="mr-2" /> Download ID Card
          </Button>
          <Button 
            className="h-11 px-10 bg-superior-teal text-white hover:bg-superior-teal/90 font-bold"
            onClick={onEdit}
          >
            Edit Profile
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditStaffDialog({ member, data, onClose, onDelete }: { member: Staff, data: any, onClose?: () => void, onDelete?: () => void }) {
  const [formData, setFormData] = useState({
    fullName: member.fullName || '',
    fatherName: member.fatherName || '',
    cnic: member.cnic || '',
    contact: member.contact || '',
    address: member.address || '',
    dob: member.dob || '',
    qualification: member.qualification || '',
    salary: member.salary || 0,
    baseSalary: member.baseSalary || member.salary || 0,
    subjects: member.subjects || [],
    role: member.role,
    status: member.status,
    photo: member.photo || ''
  });

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

  const handleDelete = () => {
    if (onDelete) onDelete();
  };

  const handleSave = () => {
    data.updateStaff(member.id, formData);
    toast.success("Staff profile updated successfully!");
    if (onClose) onClose();
  };

  return (
    <DialogContent className="max-w-[90vw] w-[90vw] max-h-[92vh] overflow-y-auto p-6 bg-white rounded-3xl">
      <DialogHeader>
        <DialogTitle className="text-2xl font-serif text-superior-teal">Edit Staff Profile</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4">
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center overflow-hidden transition-colors group-hover:border-superior-teal">
              {formData.photo ? (
                <img src={formData.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
            <Label>Full Name</Label>
            <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Father's Name</Label>
            <Input value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>CNIC</Label>
            <Input value={formData.cnic} onChange={e => setFormData({...formData, cnic: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Qualification</Label>
            <Input value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Monthly Salary (Rs.)</Label>
            <Input type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value), baseSalary: Number(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>Subjects (Comma separated)</Label>
            <Input 
              placeholder="e.g. Physics, Math" 
              value={formData.subjects?.join(', ')} 
              onChange={e => setFormData({...formData, subjects: e.target.value.split(',').map(s => s.trim())})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Designation</Label>
            <Select value={formData.role || ""} onValueChange={(v: any) => setFormData({...formData, role: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status || ""} onValueChange={(v: any) => setFormData({...formData, status: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
        </div>
        <div className="pt-4 flex gap-3">
          <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleDelete}>
            <Trash2 size={18} className="mr-2" /> Delete Staff
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

function AddStaffDialog({ data }: { data: any }) {
  const [formData, setFormData] = useState({
    id: '',
    fullName: '',
    fatherName: '',
    cnic: '',
    contact: '',
    address: '',
    dob: '',
    joinDate: new Date().toISOString().split('T')[0],
    qualification: '',
    salary: 0,
    baseSalary: 0,
    subjects: [] as string[],
    role: 'Lecturer' as StaffRole,
    status: 'Active' as const,
    photo: ''
  });

  React.useEffect(() => {
    // Generate next staff ID automatically
    const currentIds = data.staff.map((s: Staff) => s.id)
      .filter((id: string) => typeof id === 'string' && id.startsWith('SGC-T-'))
      .map((id: string) => parseInt(id.replace('SGC-T-', ''), 10))
      .filter((num: number) => !isNaN(num));
    
    const nextNum = currentIds.length > 0 ? Math.max(...currentIds) + 1 : 1;
    const nextId = `SGC-T-${nextNum.toString().padStart(3, '0')}`;
    
    setFormData(prev => ({ ...prev, id: nextId }));
  }, [data.staff]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!formData.id) { 
        toast.error("Please enter Staff ID first to associate photo!");
        return;
      }
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
    if (!formData.id || !formData.fullName || !formData.cnic) {
      toast.error("Please fill in all required fields including Staff ID");
      return;
    }

    // Validation for format: SGC-[Letter]-[3 or more digits]
    // Allowing some flexibility as per user request example 'SGC-T-XXX'
    const idPattern = /^SGC-[A-Z]-\d{3,5}$/i;
    if (!idPattern.test(formData.id)) {
      toast.error("Invalid ID Format! Use 'SGC-X-000' (e.g., SGC-T-123)");
      return;
    }

    // Uniqueness check
    const idExists = data.staff.some((s: Staff) => s.id.toLowerCase() === formData.id.toLowerCase());
    if (idExists) {
      toast.error(`Staff ID '${formData.id}' already exists! Please use a unique ID.`);
      return;
    }

    data.addStaff({ ...formData });
    toast.success("Staff member added successfully!");
  };

  return (
    <DialogContent className="max-w-[90vw] w-[90vw] max-h-[92vh] overflow-y-auto p-6 bg-white rounded-3xl">
      <DialogHeader>
        <DialogTitle className="text-2xl font-serif text-superior-teal">Add New Staff Member</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4">
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center overflow-hidden transition-colors group-hover:border-superior-teal">
              {formData.photo ? (
                <img src={formData.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
            <Label className="flex items-center gap-1 group">
              Staff ID
            </Label>
            <Input 
              value={formData.id} 
              readOnly
              className="font-mono uppercase tracking-wider bg-slate-50 cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <Label>Full Name <span className="text-rose-500">*</span></Label>
            <Input placeholder="Enter full name" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Father's Name</Label>
            <Input placeholder="Enter father's name" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>CNIC</Label>
            <Input placeholder="00000-0000000-0" value={formData.cnic} onChange={e => setFormData({...formData, cnic: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input placeholder="0300-0000000" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Designation</Label>
            <Select value={formData.role || ""} onValueChange={(v: any) => setFormData({...formData, role: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Qualification</Label>
            <Input placeholder="e.g. M.Sc Physics" value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Monthly Salary (Rs.)</Label>
            <Input type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value), baseSalary: Number(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>Subjects (Comma separated)</Label>
            <Input 
              placeholder="e.g. Physics, Math" 
              value={formData.subjects.join(', ')} 
              onChange={e => setFormData({...formData, subjects: e.target.value.split(',').map(s => s.trim())})} 
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input placeholder="Enter residential address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
        </div>
        <div className="pt-4 flex gap-3">
          <DialogClose nativeButton={true} render={<button className="flex-1 h-10 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors font-medium text-sm" />}>Cancel</DialogClose>
          <DialogClose nativeButton={true} render={
            <button className="flex-1 h-10 rounded-md bg-superior-teal text-white hover:bg-superior-teal/90 transition-colors font-medium text-sm" onClick={handleSave}>
              Add Staff Member
            </button>
          } />
        </div>
      </div>
    </DialogContent>
  );
}

function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-slate-500 uppercase font-bold">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function RecordSalaryDialog({ member, data }: { member: Staff, data: any }) {
  const [formData, setFormData] = useState({
    amount: member.salary,
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    status: 'Paid' as const,
    receiptNumber: `SAL-${Date.now().toString().slice(-6)}`
  });

  const handleSave = () => {
    data.addSalaryPayment({
      ...formData,
      staffId: member.id,
      staffName: member.fullName
    });
    toast.success(`Salary recorded for ${member.fullName}`);
  };

  return (
    <DialogContent className="max-w-md bg-white rounded-3xl p-8">
      <DialogHeader>
        <DialogTitle className="text-2xl font-serif text-superior-teal">Record Salary Payment</DialogTitle>
        <DialogDescription>Recording payment for {member.fullName}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Month</Label>
            <Select value={formData.month || ""} onValueChange={v => setFormData({...formData, month: v})}>
              <SelectTrigger className="rounded-xl bg-slate-50 border-transparent">
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
            <Label>Year</Label>
            <Input type="number" value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})} className="rounded-xl bg-slate-50 border-transparent" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Amount (Rs.)</Label>
          <Input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="rounded-xl bg-slate-50 border-transparent" />
        </div>
        <div className="space-y-2">
          <Label>Payment Date</Label>
          <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="rounded-xl bg-slate-50 border-transparent" />
        </div>
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select value={formData.paymentMethod || ""} onValueChange={v => setFormData({...formData, paymentMethod: v})}>
            <SelectTrigger className="rounded-xl bg-slate-50 border-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-3">
        <DialogClose nativeButton={true} render={<button className="flex-1 h-12 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-colors" />}>
          Cancel
        </DialogClose>
        <DialogClose nativeButton={true} render={
          <button 
            className="flex-1 h-12 rounded-2xl bg-superior-teal text-white font-bold hover:bg-superior-teal/90 transition-colors"
            onClick={handleSave}
          />
        }>
          Confirm Payment
        </DialogClose>
      </div>
    </DialogContent>
  );
}
