
import * as React from 'react';
import { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  Download, 
  Upload, 
  Calendar, 
  User, 
  BookOpen, 
  ChevronRight,
  TrendingUp,
  Award,
  AlertCircle,
  Printer,
  History
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AcademicRecord, Student, Staff } from '../types';
import * as XLSX from 'xlsx';

export default function AcademicView({ data }: { data: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all'); // all, 10-days, 20-days, 6-months, 1-year

  const filteredRecords = useMemo(() => {
    return data.academicRecords.filter((r: AcademicRecord) => {
      const matchesSearch = (r.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (r.studentId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (r.testName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || r.testType === typeFilter;
      const matchesClass = classFilter === 'all' || r.class === classFilter;
      const matchesSubject = subjectFilter === 'all' || r.subject === subjectFilter;
      
      let matchesDate = true;
      if (dateRange !== 'all') {
        const recordDate = new Date(r.date);
        const now = new Date();
        const diffDays = (now.getTime() - recordDate.getTime()) / (1000 * 3600 * 24);
        
        if (dateRange === '10-days') matchesDate = diffDays <= 10;
        else if (dateRange === '20-days') matchesDate = diffDays <= 20;
        else if (dateRange === '6-months') matchesDate = diffDays <= 180;
        else if (dateRange === '1-year') matchesDate = diffDays <= 365;
      }

      return matchesSearch && matchesType && matchesClass && matchesSubject && matchesDate;
    });
  }, [data.academicRecords, searchTerm, typeFilter, classFilter, subjectFilter, dateRange]);

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        studentId: 'SGC-J-2026-1001',
        studentName: 'Ahmed Raza',
        class: 'Inter Part-1 Boys',
        section: 'A',
        testName: 'Monthly Test Oct',
        testType: 'Monthly',
        date: '2026-10-15',
        subject: 'Physics',
        totalMarks: 50,
        obtainedMarks: 45,
        teacherName: 'Prof. Usman',
        remarks: 'Excellent performance'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AcademicRecords");
    XLSX.writeFile(wb, "academic_records_sample.xlsx");
    toast.success("Sample Excel downloaded!");
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const records = XLSX.utils.sheet_to_json(ws) as any[];
        
        const validatedRecords = records.map(r => ({
          ...r,
          totalMarks: Number(r.totalMarks),
          obtainedMarks: Number(r.obtainedMarks)
        }));

        data.importAcademicRecords(validatedRecords);
      };
      reader.readAsBinaryString(file);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-black text-superior-teal tracking-tight">
            Academic Records
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={downloadSampleExcel} className="h-12 rounded-2xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50">
            <Download size={18} className="mr-2" /> Sample Excel
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" nativeButton={false} render={<span><Upload size={18} className="mr-2" /> Import Excel</span>} className="h-12 rounded-2xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50" />
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
          </label>
          <Dialog>
            <DialogTrigger nativeButton={true} render={
              <button className="h-12 px-6 rounded-2xl bg-superior-teal text-white font-black uppercase tracking-widest text-xs hover:bg-superior-teal/90 shadow-lg shadow-superior-teal/10 transition-all flex items-center justify-center">
                <Plus size={18} className="mr-2" /> Record Marks
              </button>
            }>
            </DialogTrigger>
            <RecordMarksDialog data={data} />
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Total Tests" 
          value={data.academicRecords.length} 
          icon={FileText} 
          color="teal" 
        />
        <StatCard 
          title="Avg. Score" 
          value={`${Math.round(data.academicRecords.reduce((acc: number, r: AcademicRecord) => acc + (r.obtainedMarks / r.totalMarks * 100), 0) / (data.academicRecords.length || 1))}%`} 
          icon={TrendingUp} 
          color="gold" 
        />
        <StatCard 
          title="Top Performer" 
          value="Ahmed Raza" 
          icon={Award} 
          color="teal" 
        />
        <StatCard 
          title="Needs Attention" 
          value={data.academicRecords.filter((r: AcademicRecord) => (r.obtainedMarks / r.totalMarks) < 0.4).length} 
          icon={AlertCircle} 
          color="red" 
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Search by student name, ID or test name..." 
              className="pl-12 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-12 rounded-2xl bg-slate-50 border-transparent">
              <SelectValue placeholder="Test Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Daily">Daily</SelectItem>
              <SelectItem value="15-Day">15-Day</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Mid-Term">Mid-Term</SelectItem>
              <SelectItem value="Final">Final</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] h-12 rounded-2xl bg-slate-50 border-transparent">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="10-days">Last 10 Days</SelectItem>
              <SelectItem value="20-days">Last 20 Days</SelectItem>
              <SelectItem value="6-months">Last 6 Months</SelectItem>
              <SelectItem value="1-year">Last 1 Year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[180px] h-12 rounded-2xl bg-slate-50 border-transparent">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="Inter Part-1 Boys">Inter Part-1 Boys</SelectItem>
              <SelectItem value="Inter Part-2 Boys">Inter Part-2 Boys</SelectItem>
              <SelectItem value="Inter Part-1 Girls">Inter Part-1 Girls</SelectItem>
              <SelectItem value="Inter Part-2 Girls">Inter Part-2 Girls</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Records Table */}
      <Card className="border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5 pl-8">Student</TableHead>
              <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Test Details</TableHead>
              <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Subject</TableHead>
              <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Marks</TableHead>
              <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Teacher</TableHead>
              <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Date</TableHead>
              <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5 text-right pr-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record: AcademicRecord) => (
                <TableRow key={record.id} className="hover:bg-slate-50/50 border-slate-50 transition-colors group">
                  <TableCell className="py-5 pl-8">
                    <div>
                      <p className="font-bold text-slate-800">{record.studentName}</p>
                      <p className="text-[10px] font-mono text-slate-400">{record.studentId}</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-bold text-slate-700">{record.testName}</p>
                      <Badge variant="outline" className="w-fit text-[9px] h-5 font-black uppercase px-2 bg-slate-50 border-slate-200">
                        {record.testType}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-superior-teal/5 text-superior-teal flex items-center justify-center">
                        <BookOpen size={14} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{record.subject}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-black text-slate-800">
                        {record.obtainedMarks} <span className="text-slate-300 font-medium">/ {record.totalMarks}</span>
                      </div>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            (record.obtainedMarks / record.totalMarks) >= 0.8 ? "bg-emerald-500" :
                            (record.obtainedMarks / record.totalMarks) >= 0.5 ? "bg-superior-gold" : "bg-rose-500"
                          )}
                          style={{ width: `${(record.obtainedMarks / record.totalMarks) * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {record.teacherName.charAt(0)}
                      </div>
                      <span className="text-xs font-medium text-slate-600">{record.teacherName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar size={14} />
                      <span className="text-xs font-medium">{record.date}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 text-right pr-8">
                    <Dialog>
                      <DialogTrigger nativeButton={true} render={
                        <Button variant="ghost" size="sm" className="h-9 rounded-xl text-superior-teal hover:bg-superior-teal/5 font-bold" />
                      }>
                        <Printer size={16} className="mr-2" /> Result Card
                      </DialogTrigger>
                      <ResultCardDialog record={record} data={data} />
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-20 text-center">
                  <div className="max-w-xs mx-auto">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <Search size={24} className="text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-medium italic">No academic records found matching your filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorMap: any = {
    teal: "bg-superior-teal text-white",
    gold: "bg-superior-gold text-superior-teal",
    red: "bg-rose-500 text-white"
  };

  return (
    <Card className="border-slate-100 rounded-3xl shadow-none overflow-hidden group hover:border-superior-teal/20 transition-all duration-500">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", colorMap[color])}>
            <Icon size={24} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-2xl font-display font-black text-slate-800 tracking-tight">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

function RecordMarksDialog({ data }: { data: any }) {
  const [formData, setFormData] = useState({
    studentId: '',
    testName: '',
    testType: 'Monthly' as any,
    date: new Date().toISOString().split('T')[0],
    subject: '',
    totalMarks: 100,
    obtainedMarks: 0,
    teacherId: '',
    remarks: ''
  });

  const selectedStudent = data.students.find((s: Student) => s.id === formData.studentId);
  const selectedTeacher = data.staff.find((s: Staff) => s.id === formData.teacherId);

  const handleSave = () => {
    if (!formData.studentId || !formData.testName || !formData.subject || !formData.teacherId) {
      toast.error("Please fill in all required fields");
      return;
    }

    data.addAcademicRecord({
      ...formData,
      studentName: selectedStudent?.fullName || 'Unknown',
      class: selectedStudent?.category || 'Unknown',
      section: selectedStudent?.section || 'A',
      teacherName: selectedTeacher?.fullName || 'Unknown'
    });

    toast.success("Academic record saved successfully!");
  };

  return (
    <DialogContent className="max-w-[800px] bg-white rounded-3xl p-8">
      <DialogHeader>
        <DialogTitle className="text-2xl font-serif text-superior-teal">Record Academic Performance</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-6 py-6">
        <div className="space-y-2">
          <Label>Select Student</Label>
          <Select value={formData.studentId} onValueChange={(v) => setFormData({...formData, studentId: v})}>
            <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-transparent">
              <SelectValue placeholder="Choose Student" />
            </SelectTrigger>
            <SelectContent>
              {data.students.map((s: Student) => (
                <SelectItem key={s.id} value={s.id}>{s.fullName} ({s.id})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Test/Exam Name</Label>
          <Input 
            placeholder="e.g. Monthly Test October" 
            className="h-12 rounded-2xl bg-slate-50 border-transparent"
            value={formData.testName}
            onChange={e => setFormData({...formData, testName: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label>Test Type</Label>
          <Select value={formData.testType} onValueChange={(v: any) => setFormData({...formData, testType: v})}>
            <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Daily">Daily</SelectItem>
              <SelectItem value="15-Day">15-Day</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Mid-Term">Mid-Term</SelectItem>
              <SelectItem value="Final">Final</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date</Label>
          <Input 
            type="date" 
            className="h-12 rounded-2xl bg-slate-50 border-transparent"
            value={formData.date}
            onChange={e => setFormData({...formData, date: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={formData.subject} onValueChange={(v) => setFormData({...formData, subject: v})}>
            <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-transparent">
              <SelectValue placeholder="Choose Subject" />
            </SelectTrigger>
            <SelectContent>
              {['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Urdu', 'Islamic Studies', 'Computer Science'].map(sub => (
                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Teacher</Label>
          <Select value={formData.teacherId} onValueChange={(v) => setFormData({...formData, teacherId: v})}>
            <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-transparent">
              <SelectValue placeholder="Choose Teacher" />
            </SelectTrigger>
            <SelectContent>
              {data.staff.filter((s: Staff) => s.role === 'Lecturer').map((s: Staff) => (
                <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Total Marks</Label>
          <Input 
            type="number" 
            className="h-12 rounded-2xl bg-slate-50 border-transparent"
            value={formData.totalMarks}
            onChange={e => setFormData({...formData, totalMarks: Number(e.target.value)})}
          />
        </div>

        <div className="space-y-2">
          <Label>Obtained Marks</Label>
          <Input 
            type="number" 
            className="h-12 rounded-2xl bg-slate-50 border-transparent"
            value={formData.obtainedMarks}
            onChange={e => setFormData({...formData, obtainedMarks: Number(e.target.value)})}
          />
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <Label>Remarks</Label>
        <Input 
          placeholder="e.g. Good progress, needs to focus on theory" 
          className="h-12 rounded-2xl bg-slate-50 border-transparent"
          value={formData.remarks}
          onChange={e => setFormData({...formData, remarks: e.target.value})}
        />
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
          Save Record
        </DialogClose>
      </div>
    </DialogContent>
  );
}

function ResultCardDialog({ record, data }: { record: AcademicRecord, data: any }) {
  const student = data.students.find((s: Student) => s.id === record.studentId);
  const settings = data.settings;

  const handlePrint = () => {
    window.print();
  };

  return (
    <DialogContent className="max-w-[600px] bg-white rounded-3xl p-0 overflow-hidden">
      <div id="result-card" className="p-10 bg-white">
        {/* College Header */}
        <div className="text-center border-b-2 border-superior-teal pb-6 mb-8">
          <h2 className="text-2xl font-serif font-black text-superior-teal uppercase tracking-tight">{settings.collegeName}</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">{settings.campusName}</p>
          <p className="text-[10px] text-slate-400 mt-2">{settings.address} | {settings.contactNumber}</p>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Academic Result Card</h3>
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Student Information</p>
              <p className="text-sm font-black text-slate-800">{record.studentName}</p>
              <p className="text-xs font-medium text-slate-500">{record.class} - Section {record.section}</p>
              <p className="text-xs font-mono text-superior-teal">{record.studentId}</p>
            </div>
          </div>
          <div className="text-right">
            <Badge className="bg-superior-gold text-superior-teal font-black uppercase tracking-widest text-[10px] mb-4">
              {record.testType} Assessment
            </Badge>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase">Report Date</p>
              <p className="text-xs font-bold text-slate-800">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Result Table */}
        <div className="border-2 border-slate-100 rounded-2xl overflow-hidden mb-8">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-[10px] font-black uppercase text-slate-500">Subject</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 text-center">Total</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 text-center">Obtained</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-slate-50">
                <TableCell className="font-bold text-slate-800">{record.subject}</TableCell>
                <TableCell className="text-center font-bold text-slate-600">{record.totalMarks}</TableCell>
                <TableCell className="text-center font-black text-superior-teal">{record.obtainedMarks}</TableCell>
                <TableCell className="text-right font-black text-slate-800">
                  {Math.round((record.obtainedMarks / record.totalMarks) * 100)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl mb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Teacher's Remarks</p>
          <p className="text-sm font-medium text-slate-700 italic">"{record.remarks || 'Keep up the hard work and focus on consistent improvement.'}"</p>
        </div>

        <div className="flex justify-between items-end pt-10">
          <div className="text-center">
            <div className="w-32 border-b border-slate-300 mb-2"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Class Teacher</p>
          </div>
          <div className="text-center">
            <div className="w-32 border-b border-slate-300 mb-2"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Principal Signature</p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
        <DialogClose nativeButton={true} render={<button className="flex-1 h-12 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-colors" />}>
          Close
        </DialogClose>
        <button 
          className="flex-1 h-12 rounded-2xl bg-superior-teal text-white font-bold hover:bg-superior-teal/90 transition-colors flex items-center justify-center"
          onClick={handlePrint}
        >
          <Printer size={18} className="mr-2" /> Print Result
        </button>
      </div>
    </DialogContent>
  );
}
