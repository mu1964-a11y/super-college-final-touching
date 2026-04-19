
import React, { useState, useMemo, useRef, useDeferredValue } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  UserPlus, 
  MoreHorizontal, 
  CheckCircle2, 
  AlertCircle,
  School,
  MapPin,
  GraduationCap,
  ChevronRight,
  Info,
  ArrowRight,
  Database,
  BarChart3,
  Plus,
  Edit,
  Trash2,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Lead } from '../types';
import { HighlightText } from './HighlightText';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LeadsManagementView({ data, onNavigate }: { data: any, onNavigate?: (page: string, filter?: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogType, setDialogType] = useState<'add' | 'edit' | 'delete' | 'bulkDelete' | 'convert' | null>(null);
  
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const leads: Lead[] = data.leads || [];

  const schools = useMemo(() => Array.from(new Set(leads.map(l => String(l.previousSchool || '')).filter(Boolean))), [leads]);
  const areas = useMemo(() => Array.from(new Set(leads.map(l => String(l.areaVillage || '')).filter(Boolean))), [leads]);
  const classes = useMemo(() => Array.from(new Set(leads.map(l => String(l.currentClass || '')).filter(Boolean))), [leads]);

  const topSchools = useMemo(() => {
    const schoolCounts = leads.reduce((acc: any, curr: any) => {
      const school = String(curr.previousSchool || 'Other');
      acc[school] = (acc[school] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(schoolCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5);
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const searchLower = deferredSearchTerm.toLowerCase();
    return leads.filter(lead => {
      // Defensive string conversion to prevent crashes if data contains non-string types
      const studentName = String(lead.studentName || '').toLowerCase();
      const fatherName = String(lead.fatherName || '').toLowerCase();
      const school = String(lead.previousSchool || '').toLowerCase();
      const area = String(lead.areaVillage || '').toLowerCase();
      const city = String(lead.city || '').toLowerCase();
      const phone = String(lead.fatherPhone || '');
      const cnic = String(lead.cnic || '');

      const matchesSearch = 
        studentName.includes(searchLower) ||
        fatherName.includes(searchLower) ||
        school.includes(searchLower) ||
        area.includes(searchLower) ||
        city.includes(searchLower) ||
        phone.includes(deferredSearchTerm) ||
        cnic.includes(deferredSearchTerm);
      
      // Strict matching for filters
      const leadSchool = String(lead.previousSchool || '');
      const leadArea = String(lead.areaVillage || '');
      const leadClass = String(lead.currentClass || '');

      const matchesSchool = schoolFilter === 'all' || leadSchool === schoolFilter;
      const matchesArea = areaFilter === 'all' || leadArea === areaFilter;
      const matchesClass = classFilter === 'all' || leadClass === classFilter;

      return matchesSearch && matchesSchool && matchesArea && matchesClass;
    });
  }, [leads, deferredSearchTerm, schoolFilter, areaFilter, classFilter]);

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

        const newLeads: Lead[] = jsonData.map((row: any) => ({
          id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          studentName: row['Student Name'] || row['Name'] || '',
          fatherName: row['Father Name'] || '',
          cnic: row['CNIC'] || '',
          previousSchool: row['Previous School'] || row['School'] || '',
          areaVillage: row['Area/Village'] || row['Area'] || '',
          city: row['City'] || 'Jahanian',
          fatherPhone: String(row['Phone'] || row['Contact'] || ''),
          grade: row['Grade'] || row['Marks'] || '',
          currentClass: row['Class'] || '',
          subjects: row['Subjects'] ? String(row['Subjects']).split(',').map(s => s.trim()) : [],
          dateAdded: new Date().toISOString().split('T')[0]
        }));

        data.importLeads(newLeads);
        toast.success(`Successfully imported ${newLeads.length} leads!`);
      } catch (error) {
        console.error('Error parsing Excel:', error);
        toast.error('Failed to parse Excel file. Please check the format.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        'Student Name': 'Ahmad Ali',
        'Father Name': 'Muhammad Ali',
        'CNIC': '36101-0000000-0',
        'Previous School': 'Superior School',
        'Area/Village': 'Jahanian City',
        'City': 'Jahanian',
        'Phone': '03001234567',
        'Grade': 'A+',
        'Class': '10th',
        'Subjects': 'Physics, Chemistry, Maths'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample Leads");
    XLSX.writeFile(wb, "Sample_Leads_Format.xlsx");
  };

  const exportToExcel = () => {
    const exportData = filteredLeads.map(l => ({
      'Student Name': l.studentName,
      'Father Name': l.fatherName,
      'CNIC': l.cnic,
      'Previous School': l.previousSchool,
      'Area/Village': l.areaVillage,
      'City': l.city,
      'Phone': l.fatherPhone,
      'Grade': l.grade,
      'Class': l.currentClass,
      'Subjects': l.subjects?.join(', ') || '',
      'Date Added': l.dateAdded
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `Leads_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Leads Management Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
    
    const tableData = filteredLeads.map(l => [
      l.studentName,
      l.fatherName,
      l.previousSchool,
      l.areaVillage,
      l.fatherPhone,
      l.grade,
      l.subjects?.join(', ') || ''
    ]);

    autoTable(doc, {
      head: [['Student Name', 'Father Name', 'School', 'Area', 'Phone', 'Grade', 'Subjects']],
      body: tableData,
      startY: 30,
    });

    doc.save(`Leads_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateFullReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(8, 90, 78); // Superior Teal
    doc.text("Superior Group of Colleges Jahanian", 14, 20);
    doc.setFontSize(16);
    doc.text("Marketing Leads - Full Analytical Report", 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Report Date: ${new Date().toLocaleString()}`, 14, 38);
    doc.text(`Total Records: ${leads.length}`, 14, 44);

    // School Summary
    const schoolCounts = leads.reduce((acc: any, curr: any) => {
      acc[curr.previousSchool] = (acc[curr.previousSchool] || 0) + 1;
      return acc;
    }, {});
    
    const schoolData = Object.entries(schoolCounts).sort((a: any, b: any) => b[1] - a[1]);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text("Leads by School", 14, 55);
    
    autoTable(doc, {
      head: [['School Name', 'Total Leads']],
      body: schoolData,
      startY: 60,
    });

    // Area Summary
    const areaCounts = leads.reduce((acc: any, curr: any) => {
      acc[curr.areaVillage] = (acc[curr.areaVillage] || 0) + 1;
      return acc;
    }, {});
    
    const areaData = Object.entries(areaCounts).sort((a: any, b: any) => b[1] - a[1]);
    
    doc.setFontSize(14);
    const finalLeadY = (doc as any).lastAutoTable.finalY || 60;
    doc.text("Leads by Area/Village", 14, finalLeadY + 15);
    
    autoTable(doc, {
      head: [['Area/Village', 'Total Leads']],
      body: areaData,
      startY: finalLeadY + 20,
    });

    doc.save("Full_Marketing_Report.pdf");
  };

  const handleConvert = async () => {
    await data.convertLeadsToApplicants(selectedLeads);
    setSelectedLeads([]);
    setDialogType(null);
    
    // Auto-conversion interlinking logic
    if (data.settings?.autoLeadConversion && onNavigate) {
      toast.info("Navigating to Admissions pool...", {
        description: "Checking converted applicants in processing queue."
      });
      setTimeout(() => onNavigate('admissions', 'Not Paid'), 1000);
    }
  };

  // Summary stats for search context
  const searchSummary = useMemo(() => {
    if (!searchTerm && schoolFilter === 'all' && areaFilter === 'all' && classFilter === 'all') return null;
    
    const schoolsInSearch = Array.from(new Set(filteredLeads.map(l => String(l.previousSchool || 'Other'))));
    return {
      count: filteredLeads.length,
      schoolsCount: schoolsInSearch.length,
      schoolsList: schoolsInSearch.slice(0, 3).join(', ') + (schoolsInSearch.length > 3 ? '...' : '')
    };
  }, [filteredLeads, searchTerm, schoolFilter, areaFilter, classFilter]);

  const leadsBySchool = useMemo(() => {
    return Object.entries(filteredLeads.reduce((acc: Record<string, number>, curr) => {
      const school = String(curr.previousSchool || 'Other');
      acc[school] = (acc[school] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredLeads]);

  const uniqueSchoolsInSearchCount = useMemo(() => {
    return new Set(filteredLeads.map(l => String(l.previousSchool || 'Other'))).size;
  }, [filteredLeads]);

  // Handle pagination for better performance
  const [displayCount, setDisplayCount] = useState(50);

  // Reset pagination when search or filters change
  React.useEffect(() => {
    setDisplayCount(50);
  }, [deferredSearchTerm, schoolFilter, areaFilter, classFilter]);

  const visibleLeads = useMemo(() => filteredLeads.slice(0, displayCount), [filteredLeads, displayCount]);
  const hasMore = filteredLeads.length > displayCount;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-display font-black text-superior-teal tracking-tight">
              Leads Pipeline
            </h2>
            <span className="text-slate-300 text-2xl">/</span>
            <span className="urdu-text text-2xl text-superior-gold font-medium">مارکیٹنگ ڈیٹا</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white px-8 py-4 rounded-[2rem] border border-slate-100 flex items-center gap-6 shadow-sm">
            <div className="text-right">
              <p className="text-sm font-black text-superior-teal leading-none">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-superior-teal/5 flex items-center justify-center text-superior-teal shadow-inner">
              <Database size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 mb-10 transition-all duration-500 hover:border-superior-teal/20">
        {/* Row 1: Search & Main Action */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <Input 
              placeholder="Search by Student Name, School, Phone, City, or Specific Village/Town..." 
              className="pl-12 h-14 bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 rounded-2xl transition-all font-medium text-base shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            className="bg-superior-teal text-white hover:bg-superior-teal/90 rounded-2xl h-14 px-10 shrink-0 font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl shadow-superior-teal/20 active:scale-95 flex items-center gap-3"
            onClick={() => setDialogType('add')}
          >
            <Plus size={20} /> Add New Lead Record
          </Button>
        </div>

        {/* Row 2: Expanded Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Filter by School</Label>
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-slate-700 shadow-sm">
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100 shadow-2xl max-h-[400px] min-w-[350px]">
                <SelectItem value="all" className="font-bold">All Schools Pool</SelectItem>
                {schools.map(s => <SelectItem key={s} value={s} className="text-sm py-3 px-4 whitespace-nowrap">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Filter by Area/Village</Label>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-slate-700 shadow-sm">
                <SelectValue placeholder="All Area/City" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100 shadow-2xl max-h-[400px] min-w-[300px]">
                <SelectItem value="all" className="font-bold">All Geographical Areas</SelectItem>
                {areas.map(a => <SelectItem key={a} value={a} className="text-sm py-3 px-4 whitespace-nowrap">{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Filter by Class</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-bold text-slate-700 shadow-sm">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100 shadow-2xl max-h-[400px] min-w-[250px]">
                <SelectItem value="all" className="font-bold">All Class Levels</SelectItem>
                {classes.map(c => <SelectItem key={c} value={c} className="text-sm py-3 px-4 whitespace-nowrap">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3 px-5 py-2.5 bg-superior-teal/5 text-superior-teal rounded-full border border-superior-teal/10">
            <Info size={16} className="text-superior-teal" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {searchTerm || schoolFilter !== 'all' || areaFilter !== 'all' || classFilter !== 'all' 
                ? `Showing ${filteredLeads.length} Records Found`
                : `Total Leads in System: ${leads.length}`}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".xlsx, .xls"
            />
            <div className="flex flex-col items-end">
              <Button variant="ghost" className="rounded-xl text-slate-400 hover:text-superior-teal hover:bg-superior-teal/5 gap-2 font-black uppercase tracking-widest text-[10px] h-10 px-4" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} /> Bulk Import
              </Button>
              <button onClick={downloadSampleExcel} className="text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-superior-gold hover:underline mt-1">Download Format</button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger nativeButton={true} render={
                <button className="rounded-xl text-slate-400 hover:text-superior-teal hover:bg-superior-teal/5 gap-2 font-black uppercase tracking-widest text-[10px] h-10 px-4 flex items-center justify-center border border-transparent">
                  <Download size={14} /> Export
                </button>
              } />
              <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-xl p-2">
                <DropdownMenuItem onClick={exportToExcel} className="gap-3 p-3 rounded-xl font-bold text-emerald-600 cursor-pointer">
                  <FileSpreadsheet size={16} /> Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF} className="gap-3 p-3 rounded-xl font-bold text-rose-600 cursor-pointer">
                  <FileText size={16} /> Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Table Section */}
        <div className="xl:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-serif font-bold text-slate-800">Leads Data Grid</h3>
            <div className="flex items-center gap-3">
              <AnimatePresence>
                {selectedLeads.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3"
                  >
                    <Button 
                      variant="destructive" 
                      className="rounded-xl gap-2 h-12 px-6 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-100"
                      onClick={() => setDialogType('bulkDelete')}
                    >
                      <Trash2 size={18} /> Delete Selected ({selectedLeads.length})
                    </Button>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 h-12 px-6 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-100"
                      onClick={() => setDialogType('convert')}
                    >
                      <UserPlus size={18} /> Convert Selected ({selectedLeads.length})
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden transition-all duration-500 hover:border-slate-200">
            <div className="overflow-x-auto min-w-full">
              <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-50">
                  <TableHead className="w-[50px] pl-6">
                    <Checkbox checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Student Name</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Father Name</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Previous School</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Area/Village</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Subjects</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Phone</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Grade</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Status</TableHead>
                  <TableHead className="text-right font-bold text-slate-400 uppercase tracking-widest text-[10px] pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-300">
                        <AlertCircle size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">No leads found matching your criteria</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleLeads.map((lead) => (
                    <TableRow key={lead.id} className={cn(
                      "group transition-colors border-slate-50",
                      selectedLeads.includes(lead.id) ? "bg-slate-50" : "hover:bg-slate-50/50",
                      lead.isConverted ? "bg-superior-teal/10 border-l-2 border-l-superior-teal" : ""
                    )}>
                      <TableCell className="pl-6">
                        <Checkbox checked={selectedLeads.includes(lead.id)} onCheckedChange={() => toggleSelectLead(lead.id)} />
                      </TableCell>
                      <TableCell className={cn("font-bold text-slate-600 group-hover:text-slate-900 transition-colors", lead.isConverted && "text-emerald-700")}>
                        <div className="flex items-center gap-2">
                          <HighlightText text={lead.studentName} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                          {lead.isConverted && <CheckCircle2 size={14} className="text-emerald-500" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium">
                        <HighlightText text={lead.fatherName} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <School size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                          <span className="text-sm text-slate-500">
                            <HighlightText text={lead.previousSchool} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-300">
                          <MapPin size={14} className="shrink-0" />
                          <span className="text-sm text-slate-500">
                            <HighlightText text={lead.areaVillage} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {lead.subjects && lead.subjects.length > 0 ? (
                            lead.subjects.map(s => (
                              <Badge key={s} variant="outline" className="text-[9px] bg-superior-teal/5 text-superior-teal border-superior-teal/10 px-1.5 py-0">{s}</Badge>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-300 italic">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-500 whitespace-nowrap">
                        <HighlightText text={lead.fatherPhone} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-100 font-bold px-2 py-0.5 rounded-lg">{lead.grade}</Badge>
                      </TableCell>
                      <TableCell>
                        {lead.isConverted ? (
                          <Badge variant="outline" className="bg-emerald-50/50 text-emerald-600 border-emerald-100 font-bold px-2 py-0.5 rounded-lg">Admitted</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-100 font-bold px-2 py-0.5 rounded-lg">Raw Lead</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {!lead.isConverted ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setSelectedLeads([lead.id]);
                                setDialogType('convert');
                              }}
                              className="h-9 px-3 rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold text-[10px] uppercase tracking-wider"
                            >
                              <UserPlus size={14} className="mr-1.5" /> Convert
                            </Button>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold">Converted</Badge>
                          )}
                          
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => {
                              setSelectedLead(lead);
                              setDialogType('edit');
                            }}
                            className="h-9 w-9 rounded-lg border-slate-200 text-slate-400 hover:text-superior-teal hover:border-superior-teal/30"
                          >
                            <Edit size={14} />
                          </Button>
 
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => {
                              setSelectedLead(lead);
                              setDialogType('delete');
                            }}
                            className="h-9 w-9 rounded-lg border-red-100 text-red-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
                className="rounded-2xl border-slate-200 text-slate-500 hover:text-superior-teal hover:bg-superior-teal/5 font-bold px-8"
              >
                Load More Records ({filteredLeads.length - displayCount} remaining)
              </Button>
            </div>
          )}
        </div>

        {/* Summary Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden sticky top-24 transition-all duration-500 hover:border-slate-200">
            <div className="bg-slate-900 text-white p-6">
              <h3 className="text-lg font-sans font-black flex items-center gap-2">
                <BarChart3 size={20} className="text-slate-400" />
                {searchTerm || schoolFilter !== 'all' || areaFilter !== 'all' || classFilter !== 'all' 
                  ? "Search Insights" 
                  : "Overall Insights"}
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">
                    {searchTerm || schoolFilter !== 'all' || areaFilter !== 'all' || classFilter !== 'all' ? "Search Context" : "Data Context"}
                  </p>
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {searchTerm || (schoolFilter !== 'all' ? `School: ${schoolFilter}` : '') || (areaFilter !== 'all' ? `Area: ${areaFilter}` : '') || 'All Records'}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-widest mb-1">Leads Found</p>
                    <p className="text-2xl font-black text-emerald-700">{filteredLeads.length}</p>
                  </div>
                  <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                    <p className="text-[10px] text-orange-600 uppercase font-bold tracking-widest mb-1">Schools</p>
                    <p className="text-2xl font-black text-orange-700">
                      {uniqueSchoolsInSearchCount}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Schools:</p>
                  <div className="flex flex-wrap gap-1">
                    {leadsBySchool.map(([school, count]) => (
                      <Badge key={school} variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-100 font-bold px-2 py-0.5 rounded-lg">
                        {school} ({count})
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator className="bg-slate-100" />

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conversion Potential</span>
                    <span className="text-xs font-bold text-emerald-600">High</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[65%]"></div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={generateFullReport}
                  className="w-full bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-2xl h-12 gap-2 transition-all"
                >
                  Generate Full Report <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          </div>

      {/* Centralized Dialogs */}
      <Dialog open={dialogType === 'add'} onOpenChange={(open) => !open && setDialogType(null)}>
        <AddLeadDialog onAdd={(lead) => {
          data.addLead(lead);
          setDialogType(null);
        }} />
      </Dialog>

      <Dialog open={dialogType === 'edit'} onOpenChange={(open) => !open && setDialogType(null)}>
        {selectedLead && (
          <EditLeadDialog 
            lead={selectedLead} 
            onUpdate={(updates) => {
              data.updateLead(selectedLead.id, updates);
              setDialogType(null);
              toast.success("Lead updated successfully!");
            }} 
          />
        )}
      </Dialog>

      <Dialog open={dialogType === 'delete'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">Delete Lead Record</DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete the lead for <span className="font-bold text-slate-800">{selectedLead?.studentName}</span>? This action is permanent and cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertCircle size={24} />
              </div>
              <p className="text-xs text-red-700 font-medium">Deleting this record will remove all associated marketing history and contact details from the system.</p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setDialogType(null)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
            <Button variant="destructive" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={() => {
              if (selectedLead) {
                data.deleteLead(selectedLead.id);
                setDialogType(null);
                toast.success("Lead deleted successfully!");
              }
            }}>Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'bulkDelete'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-red-600">Bulk Delete Records</DialogTitle>
            <DialogDescription className="text-slate-500">
              You are about to delete <span className="font-bold text-slate-800">{selectedLeads.length}</span> selected lead records.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertCircle size={24} />
              </div>
              <p className="text-xs text-red-700 font-medium">This is a bulk action. All selected data will be permanently removed from the marketing database.</p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setDialogType(null)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
            <Button variant="destructive" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={() => {
              data.bulkDeleteLeads(selectedLeads);
              setSelectedLeads([]);
              setDialogType(null);
              toast.success(`${selectedLeads.length} leads deleted successfully!`);
            }}>Delete All Selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'convert'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-superior-teal">Confirm Conversion</DialogTitle>
            <DialogDescription className="text-slate-500">
              You are about to move {selectedLeads.length} records from Raw Leads to the Admissions module. This action will create applicant profiles for all selected students.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <p className="text-sm font-bold text-slate-700">Conversion Summary:</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Source: Raw Marketing Data</li>
                <li>• Destination: Admissions (All Applicants)</li>
                <li>• Status: Pending Review</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button>
            <Button className="bg-superior-teal text-white" onClick={handleConvert}>Proceed with Conversion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

          <div className="p-6 bg-superior-gold/10 rounded-3xl border border-superior-gold/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-superior-gold rounded-lg">
                <GraduationCap className="text-superior-teal" size={20} />
              </div>
              <h4 className="font-serif font-bold text-superior-teal">Marketing Tip</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Focus your marketing efforts on <strong>{topSchools[0]?.[0] || 'Top Schools'}</strong> this week. They represent the highest density of prospective leads in your current data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddLeadDialog({ onAdd }: { onAdd: (lead: Lead) => void }) {
  const [formData, setFormData] = useState({
    studentName: '',
    fatherName: '',
    previousSchool: '',
    areaVillage: '',
    city: 'Jahanian',
    fatherPhone: '',
    grade: '',
    currentClass: '',
    subjects: [] as string[],
    cnic: ''
  });

  const [subjectInput, setSubjectInput] = useState('');

  const addSubject = () => {
    if (subjectInput.trim() && !formData.subjects.includes(subjectInput.trim())) {
      setFormData({ ...formData, subjects: [...formData.subjects, subjectInput.trim()] });
      setSubjectInput('');
    }
  };

  const removeSubject = (sub: string) => {
    setFormData({ ...formData, subjects: formData.subjects.filter(s => s !== sub) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName || !formData.fatherPhone) {
      toast.error("Please fill in required fields");
      return;
    }

    const newLead: any = {
      ...formData,
      isConverted: false,
      dateAdded: new Date().toISOString().split('T')[0]
    };

    onAdd(newLead);
    toast.success("Lead added successfully!");
  };

  return (
    <DialogContent className="max-w-md rounded-3xl">
      <DialogHeader>
        <DialogTitle className="text-2xl font-serif text-superior-teal">Add New Lead</DialogTitle>
        <DialogDescription>Enter prospective student details for marketing tracking.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Student Name *</Label>
            <Input required value={formData.studentName} onChange={e => setFormData({...formData, studentName: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Father Name</Label>
            <Input value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone Number *</Label>
            <Input required value={formData.fatherPhone} onChange={e => setFormData({...formData, fatherPhone: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>CNIC (Optional)</Label>
            <Input value={formData.cnic} onChange={e => setFormData({...formData, cnic: e.target.value})} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Previous School</Label>
          <Input value={formData.previousSchool} onChange={e => setFormData({...formData, previousSchool: e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Area/Village</Label>
            <Input value={formData.areaVillage} onChange={e => setFormData({...formData, areaVillage: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Grade/Marks</Label>
            <Input value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Current Class</Label>
            <Input value={formData.currentClass} onChange={e => setFormData({...formData, currentClass: e.target.value})} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Intended Subjects</Label>
          <div className="flex gap-2">
            <Input 
              value={subjectInput} 
              onChange={e => setSubjectInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubject())}
              placeholder="e.g. Computer, Math..." 
              className="bg-slate-50 border-slate-100 placeholder:text-slate-300"
            />
            <Button type="button" onClick={addSubject} variant="outline" className="shrink-0 border-superior-teal/20 text-superior-teal hover:bg-superior-teal hover:text-white transition-all">Add</Button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.subjects.map(s => (
              <Badge key={s} className="bg-superior-teal/5 text-superior-teal border-superior-teal/10 flex items-center gap-1 py-1 px-2">
                {s}
                <button type="button" onClick={() => removeSubject(s)} className="hover:text-red-500 font-bold ml-1 text-xs">×</button>
              </Badge>
            ))}
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button type="submit" className="w-full bg-superior-teal text-white hover:bg-superior-teal/90 rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg shadow-superior-teal/10">Save Lead Details</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditLeadDialog({ lead, onUpdate }: { lead: Lead, onUpdate: (updates: Partial<Lead>) => void }) {
  const [formData, setFormData] = useState({
    ...lead,
    studentName: lead.studentName || '',
    fatherName: lead.fatherName || '',
    previousSchool: lead.previousSchool || '',
    areaVillage: lead.areaVillage || '',
    city: lead.city || 'Jahanian',
    fatherPhone: lead.fatherPhone || '',
    grade: lead.grade || '',
    currentClass: lead.currentClass || '',
    subjects: lead.subjects || [],
    cnic: lead.cnic || ''
  });

  const [subjectInput, setSubjectInput] = useState('');

  const addSubject = () => {
    if (subjectInput.trim() && !formData.subjects.includes(subjectInput.trim())) {
      setFormData({ ...formData, subjects: [...formData.subjects, subjectInput.trim()] });
      setSubjectInput('');
    }
  };

  const removeSubject = (sub: string) => {
    setFormData({ ...formData, subjects: formData.subjects.filter(s => s !== sub) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <DialogContent className="max-w-md rounded-3xl">
      <DialogHeader>
        <DialogTitle className="text-2xl font-serif text-superior-teal">Edit Lead Details</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Student Name</Label>
            <Input value={formData.studentName} onChange={e => setFormData({...formData, studentName: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Father Name</Label>
            <Input value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={formData.fatherPhone} onChange={e => setFormData({...formData, fatherPhone: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>CNIC</Label>
            <Input value={formData.cnic} onChange={e => setFormData({...formData, cnic: e.target.value})} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Previous School</Label>
          <Input value={formData.previousSchool} onChange={e => setFormData({...formData, previousSchool: e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Area/Village</Label>
            <Input value={formData.areaVillage} onChange={e => setFormData({...formData, areaVillage: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Grade/Marks</Label>
            <Input value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Current Class</Label>
            <Input value={formData.currentClass} onChange={e => setFormData({...formData, currentClass: e.target.value})} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Intended Subjects</Label>
          <div className="flex gap-2">
            <Input 
              value={subjectInput} 
              onChange={e => setSubjectInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubject())}
              placeholder="Add subject..." 
              className="bg-slate-50 border-slate-100 placeholder:text-slate-300"
            />
            <Button type="button" onClick={addSubject} variant="outline" className="shrink-0 border-superior-teal/20 text-superior-teal hover:bg-superior-teal hover:text-white transition-all">Add</Button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.subjects.map(s => (
              <Badge key={s} className="bg-superior-teal/5 text-superior-teal border-superior-teal/10 flex items-center gap-1 py-1 px-2">
                {s}
                <button type="button" onClick={() => removeSubject(s)} className="hover:text-red-500 font-bold ml-1 text-xs">×</button>
              </Badge>
            ))}
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button type="submit" className="w-full bg-superior-teal text-white hover:bg-superior-teal/90 rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg shadow-superior-teal/10">Update Lead</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
