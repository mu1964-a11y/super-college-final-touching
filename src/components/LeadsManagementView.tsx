
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
  const [convertedFilter, setConvertedFilter] = useState('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogType, setDialogType] = useState<'add' | 'edit' | 'delete' | 'bulkDelete' | 'convert' | null>(null);
  const [convertTargetProgram, setConvertTargetProgram] = useState<string>('fsc');
  
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
      const finalizedBy = String(lead.finalizedBy || '').toLowerCase();
      const school = String(lead.previousSchool || '').toLowerCase();
      const area = String(lead.areaVillage || '').toLowerCase();
      const city = String(lead.city || '').toLowerCase();
      const phone = String(lead.fatherPhone || '');
      const cnic = String(lead.cnic || '');

      const matchesSearch = 
        studentName.includes(searchLower) ||
        fatherName.includes(searchLower) ||
        finalizedBy.includes(searchLower) ||
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
      const matchesConverted = convertedFilter === 'all' || 
                              (convertedFilter === 'converted' && lead.isConverted) || 
                              (convertedFilter === 'pending' && !lead.isConverted);

      return matchesSearch && matchesSchool && matchesArea && matchesClass && matchesConverted;
    });
  }, [leads, deferredSearchTerm, schoolFilter, areaFilter, classFilter, convertedFilter]);

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
          finalizedFee: Number(row['Package'] || row['Finalized Fee'] || 0),
          finalizedBy: row['Finalized By'] || '',
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
        'Package': 55000,
        'Finalized By': 'Director Azam',
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
      'Package': l.finalizedFee,
      'Finalized By': l.finalizedBy,
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
      l.finalizedFee || 0,
      l.finalizedBy || '-',
      l.previousSchool,
      l.areaVillage,
      l.fatherPhone,
      l.grade,
      l.subjects?.join(', ') || ''
    ]);

    autoTable(doc, {
      head: [['Student Name', 'Father Name', 'Package', 'By', 'School', 'Area', 'Phone', 'Grade', 'Subjects']],
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
    data.convertLeadsToApplicants(selectedLeads, convertTargetProgram);
    setSelectedLeads([]);
    setDialogType(null);
    
    // Auto-conversion interlinking logic
    if (data.settings?.autoLeadConversion && onNavigate) {
      toast.info(`Navigating to ${convertTargetProgram.toUpperCase()} Admissions pool...`, {
        description: "Checking converted applicants in processing queue."
      });
      setTimeout(() => onNavigate(`admissions-${convertTargetProgram}`, 'Not Paid'), 1000);
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
  const ITEMS_PER_PAGE = 30;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);

  // Reset pagination when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, schoolFilter, areaFilter, classFilter, convertedFilter]);

  const visibleLeads = useMemo(
    () => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      return filteredLeads.slice(start, end);
    },
    [filteredLeads, currentPage],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="shrink-0 flex items-center gap-3">
          <h2 className="text-3xl font-display font-black text-superior-teal tracking-tight whitespace-nowrap">
            Leads Pipeline
          </h2>
          <span className="text-slate-300 text-2xl">/</span>
          <span className="urdu-text text-2xl text-superior-gold font-medium whitespace-nowrap mt-1">مارکیٹنگ ڈیٹا</span>
        </div>

        <div className="shrink-0 flex items-center gap-4">
          <Button 
             onClick={generateFullReport}
             variant="outline"
             className="shrink-0 h-14 rounded-2xl border-slate-200 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 gap-2 shadow-sm px-6"
          >
             <FileText size={16} className="text-superior-teal" /> Full Report
          </Button>
          <div className="bg-white px-6 py-2 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm h-14">
            <div className="text-right whitespace-nowrap hidden md:block">
              <p className="text-[11px] font-black text-slate-700 leading-none uppercase tracking-widest mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-superior-teal/5 flex items-center justify-center text-superior-teal shadow-inner shrink-0">
              <Database size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Insights */}
      <div className="w-full bg-[#053b32] px-6 py-5 rounded-[2rem] shadow-xl text-white relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-superior-gold/5 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
          
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 md:gap-12 flex-1 relative z-10 w-full">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-[1rem] bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <BarChart3 className="text-emerald-400" size={24} />
               </div>
               <div>
                 <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest leading-none mb-2">Total Leads</p>
                 <p className="text-3xl font-black text-white leading-none">{filteredLeads.length}</p>
               </div>
            </div>

            <div className="hidden sm:block h-12 w-px bg-white/10"></div>

            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-[1rem] bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                  <School className="text-orange-400" size={24} />
               </div>
               <div>
                 <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest leading-none mb-2">Schools</p>
                 <p className="text-3xl font-black text-white leading-none">{uniqueSchoolsInSearchCount}</p>
               </div>
            </div>

            <div className="hidden md:block h-12 w-px bg-white/10"></div>

            <div className="hidden lg:flex flex-col justify-center flex-1">
               <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest leading-none mb-3">Top Schools</p>
               <div className="flex flex-wrap gap-2 overflow-hidden max-h-[80px]">
                 {leadsBySchool.slice(0, 6).map(([school]) => (
                   <Badge key={school} variant="outline" className="text-[10px] bg-white/5 text-white/90 border-white/20 hover:bg-white/10 px-3 py-1 whitespace-normal text-left h-auto leading-tight shadow-sm rounded-full border">
                     {school}
                   </Badge>
                 ))}
                 {leadsBySchool.length > 6 && (
                   <Badge variant="outline" className="text-[11px] bg-white/10 text-white font-bold border-transparent px-3 py-1 rounded-full">
                     +{leadsBySchool.length - 6}
                   </Badge>
                 )}
               </div>
            </div>
          </div>
      </div>

      <div className="w-full flex justify-center py-1 overflow-visible relative z-0">
        <svg
          viewBox="0 0 1000 10"
          preserveAspectRatio="none"
          className="w-full h-[6px] opacity-90 drop-shadow-md"
        >
          <path
            d="M 0 5 Q 500 10 1000 5 Q 500 0 0 5 Z"
            fill="url(#orange-lens)"
          />
          <defs>
            <linearGradient id="orange-lens" x1="0" y1="0" x2="1000" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
              <stop offset="20%" stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#ea580c" stopOpacity="1" />
              <stop offset="80%" stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Search and Filters */}
      <div className="bg-[#f8fbfa] p-5 md:p-6 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex flex-col gap-5 mb-10 transition-all duration-500 w-full relative z-10">
        
        {/* Row 1: Search & Main Action */}
        <div className="flex flex-col lg:flex-row gap-4 w-full">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-superior-teal transition-colors" size={18} />
            <Input 
              placeholder="Search by Student Name, School, Phone, City, or Specific Village/Town..." 
              className="pl-12 h-12 bg-white border-slate-200 focus:bg-white focus:border-superior-teal/40 focus:ring-4 focus:ring-superior-teal/5 rounded-md transition-all font-medium text-slate-700 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            className="bg-[#053b32] text-white hover:bg-[#042f28] rounded-md h-12 px-8 shrink-0 font-bold uppercase tracking-[0.1em] text-[11px] transition-all shadow-md active:scale-95 flex items-center gap-3 w-full lg:w-auto"
            onClick={() => setDialogType('add')}
          >
            <Plus size={18} /> Add New Lead Record
          </Button>
        </div>

        {/* Row 2: Expanded Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Filter by School</Label>
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="h-11 rounded-md bg-white border-slate-200 focus:bg-white focus:border-superior-teal/40 focus:ring-4 focus:ring-superior-teal/5 transition-all font-semibold text-slate-700 shadow-sm w-full">
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent className="rounded-md border-slate-200 shadow-xl max-h-[400px] min-w-[350px]">
                <SelectItem value="all" className="font-bold">All Schools Pool</SelectItem>
                {schools.map(s => <SelectItem key={s} value={s} className="text-sm py-2 px-3 whitespace-nowrap">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Filter by Area/Village</Label>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="h-11 rounded-md bg-white border-slate-200 focus:bg-white focus:border-superior-teal/40 focus:ring-4 focus:ring-superior-teal/5 transition-all font-semibold text-slate-700 shadow-sm w-full">
                <SelectValue placeholder="All Area/City" />
              </SelectTrigger>
              <SelectContent className="rounded-md border-slate-200 shadow-xl max-h-[400px] min-w-[300px]">
                <SelectItem value="all" className="font-bold">All Geographical Areas</SelectItem>
                {areas.map(a => <SelectItem key={a} value={a} className="text-sm py-2 px-3 whitespace-nowrap">{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Filter by Class</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-11 rounded-md bg-white border-slate-200 focus:bg-white focus:border-superior-teal/40 focus:ring-4 focus:ring-superior-teal/5 transition-all font-semibold text-slate-700 shadow-sm w-full">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent className="rounded-md border-slate-200 shadow-xl max-h-[400px] min-w-[250px]">
                <SelectItem value="all" className="font-bold">All Class Levels</SelectItem>
                {classes.map(c => <SelectItem key={c} value={c} className="text-sm py-2 px-3 whitespace-nowrap">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Conversion Status</Label>
            <Select value={convertedFilter} onValueChange={setConvertedFilter}>
              <SelectTrigger className="h-11 rounded-md bg-white border-slate-200 focus:bg-white focus:border-superior-teal/40 focus:ring-4 focus:ring-superior-teal/5 transition-all font-semibold text-slate-700 shadow-sm w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-md border-slate-200 shadow-xl">
                <SelectItem value="all" className="font-bold text-slate-700">All Records</SelectItem>
                <SelectItem value="converted" className="font-bold text-emerald-600">Converted (Admission Taken)</SelectItem>
                <SelectItem value="pending" className="font-bold text-amber-600">Pending Leads</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 3: Totals & Formats */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200/60 w-full">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-white text-[#053b32] rounded-md border border-slate-200 shadow-sm w-full md:w-auto overflow-hidden">
            <Info size={16} className="text-superior-teal shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              {searchTerm || schoolFilter !== 'all' || areaFilter !== 'all' || classFilter !== 'all' 
                ? `Showing ${filteredLeads.length} Records Found`
                : `Total Leads in System: ${leads.length}`}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".xlsx, .xls"
            />
            <div className="flex flex-col items-end">
              <Button variant="ghost" className="rounded-md text-slate-500 hover:text-superior-teal hover:bg-slate-200/50 gap-2 font-bold uppercase tracking-widest text-[10px] h-9 px-3" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} /> Bulk Import
              </Button>
              <button onClick={downloadSampleExcel} className="text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-superior-teal hover:underline mt-0.5 pr-3">Download Format</button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-md text-slate-500 hover:text-superior-teal hover:bg-slate-200/50 gap-2 font-bold uppercase tracking-widest text-[10px] h-9 px-3 flex items-center justify-center border border-transparent outline-hidden transition-all">
                <Download size={14} /> Export
              </DropdownMenuTrigger>
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

      {/* Bulk Actions Bar */}
      {selectedLeads.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-4 z-30 flex items-center justify-between p-4 bg-superior-teal rounded-2xl shadow-2xl text-white mb-6 border border-white/10"
        >
          <div className="flex items-center gap-4 pl-2">
            <Checkbox 
              checked={selectedLeads.length === filteredLeads.length} 
              onCheckedChange={toggleSelectAll} 
              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-superior-teal"
            />
            <div className="flex flex-col">
              <p className="text-sm font-black uppercase tracking-widest">
                {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
              </p>
              {selectedLeads.length < filteredLeads.length && (
                <button 
                  onClick={() => setSelectedLeads(filteredLeads.map(l => l.id))}
                  className="text-[10px] font-black underline uppercase tracking-tighter opacity-70 hover:opacity-100 text-left"
                >
                  Select all {filteredLeads.length} matching leads
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedLeads([])}
              className="h-10 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 font-black text-[10px] uppercase tracking-widest px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => setDialogType('convert')}
              className="h-10 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 border-none font-black text-[10px] uppercase tracking-widest px-6 shadow-lg shadow-black/20"
            >
              <UserPlus size={14} className="mr-2" /> Convert
            </Button>
            <Button 
              onClick={() => setDialogType('bulkDelete')}
              variant="destructive" 
              className="h-10 rounded-xl bg-white text-rose-600 hover:bg-rose-50 border-none font-black text-[10px] uppercase tracking-widest px-6 shadow-lg shadow-black/20"
            >
              <Trash2 size={14} className="mr-2" /> Delete
            </Button>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        {/* Table Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-serif font-bold text-slate-800">Leads Data Grid</h3>
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
                  <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Package</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Finalized By</TableHead>
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
                  visibleLeads.map((lead) => {
                    const leadObj = lead as any;
                    const isNew = data.isNewRecord?.(lead.id, lead.dateAdded || leadObj.date_added);
                    return (
                    <TableRow 
                      key={lead.id} 
                      onClick={() => {
                        data.markActioned?.(lead.id);
                        toggleSelectLead(lead.id);
                      }}
                      className={cn(
                        "group transition-colors border-slate-50 cursor-pointer relative",
                        selectedLeads.includes(lead.id) ? "bg-slate-50" : "hover:bg-slate-50/50",
                        lead.isConverted ? "bg-superior-teal/5 border-l-[3px] border-l-superior-teal" : "",
                        isNew && !lead.isConverted ? "bg-red-50/20 border-l-[3px] border-l-red-500 hover:bg-red-50" : ""
                      )}>
                      <TableCell className="pl-6 relative">
                        {isNew && !lead.isConverted && (
                           <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
                        )}
                        <Checkbox checked={selectedLeads.includes(lead.id)} onCheckedChange={() => toggleSelectLead(lead.id)} />
                      </TableCell>
                      <TableCell className={cn("font-bold text-slate-600 group-hover:text-slate-900 transition-colors", lead.isConverted && "text-emerald-700")}>
                        <div className="flex items-center gap-2">
                          <HighlightText text={lead.studentName} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                          {lead.isConverted && <CheckCircle2 size={14} className="text-emerald-500" />}
                          {isNew && !lead.isConverted && <span className="text-[9px] font-black uppercase text-red-500 tracking-widest bg-red-100 px-2 py-0.5 rounded-md">New</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium">
                        <HighlightText text={lead.fatherName} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
                      </TableCell>
                      <TableCell className="font-black text-superior-teal">
                        Rs. {lead.finalizedFee?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="text-slate-500 font-bold italic">
                        <HighlightText text={lead.finalizedBy || '-'} search={data.settings?.enableHighlighting !== false ? searchTerm : ''} />
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
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 outline-hidden transition-all">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px] rounded-2xl shadow-xl border-slate-100 p-2">
                            <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-700" onClick={() => { setSelectedLead(lead); setDialogType('edit'); }}>
                              <Edit size={16} className="text-superior-teal" /> Edit Details
                            </DropdownMenuItem>
                            {!lead.isConverted && (
                              <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-emerald-600" onClick={() => { setSelectedLeads([lead.id]); setDialogType('convert'); }}>
                                <UserPlus size={16} /> Convert to Admission
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-400 opacity-50">
                              <FileText size={16} /> View Lead Sheet
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-slate-400 opacity-50">
                              <Info size={16} /> Add Private Note
                            </DropdownMenuItem>
                            <Separator className="my-1" />
                            <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-red-600 hover:bg-red-50" onClick={() => { setSelectedLead(lead); setDialogType('delete'); }}>
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
          
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-slate-100">
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
            <Button variant="destructive" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={async () => {
              const idsToDelete = [...selectedLeads];
              setDialogType(null);
              setSelectedLeads([]);
              await data.bulkDeleteLeads(idsToDelete);
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
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Select Target Program</Label>
              <Select value={convertTargetProgram} onValueChange={setConvertTargetProgram}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fsc">FSC / General Science</SelectItem>
                  <SelectItem value="ukl3">UK Level 3</SelectItem>
                  <SelectItem value="dit">DIT</SelectItem>
                  <SelectItem value="bs">BS Program</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <p className="text-sm font-bold text-slate-700">Conversion Summary:</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Source: Raw Marketing Data</li>
                <li>• Destination: {convertTargetProgram.toUpperCase()} Admissions</li>
                <li>• Status: Pending Review</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button>
            <Button className="bg-superior-teal text-white" onClick={async () => {
              const idsToConvert = [...selectedLeads];
              setDialogType(null);
              setSelectedLeads([]);
              data.convertLeadsToApplicants(idsToConvert, convertTargetProgram);
            }}>Proceed with Conversion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
}

function AddLeadDialog({ onAdd }: { onAdd: (lead: Lead) => void }) {
  const [formData, setFormData] = useState({
    studentName: '',
    fatherName: '',
    finalizedFee: 0,
    finalizedBy: '',
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
            <Label>Package</Label>
            <Input type="number" value={formData.finalizedFee} onChange={e => setFormData({...formData, finalizedFee: Number(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>Finalized By</Label>
            <Input value={formData.finalizedBy} onChange={e => setFormData({...formData, finalizedBy: e.target.value})} />
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
    finalizedFee: lead.finalizedFee || 0,
    finalizedBy: lead.finalizedBy || '',
    previousSchool: lead.previousSchool || '',
    areaVillage: lead.areaVillage || '',
    city: lead.city || 'Jahanian',
    fatherPhone: lead.fatherPhone || '',
    grade: lead.grade || '',
    currentClass: lead.currentClass || '',
    subjects: lead.subjects || [],
    cnic: lead.cnic || ''
  });

  // Sync state with lead prop if it changes
  React.useEffect(() => {
    setFormData({
      ...lead,
      studentName: lead.studentName || '',
      fatherName: lead.fatherName || '',
      finalizedFee: lead.finalizedFee || 0,
      finalizedBy: lead.finalizedBy || '',
      previousSchool: lead.previousSchool || '',
      areaVillage: lead.areaVillage || '',
      city: lead.city || 'Jahanian',
      fatherPhone: lead.fatherPhone || '',
      grade: lead.grade || '',
      currentClass: lead.currentClass || '',
      subjects: lead.subjects || [],
      cnic: lead.cnic || ''
    });
  }, [lead]);

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
            <Label>Package</Label>
            <Input type="number" value={formData.finalizedFee} onChange={e => setFormData({...formData, finalizedFee: Number(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>Finalized By</Label>
            <Input value={formData.finalizedBy} onChange={e => setFormData({...formData, finalizedBy: e.target.value})} />
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
