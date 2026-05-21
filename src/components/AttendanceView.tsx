
import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle2, CalendarDays, Search, Save, Download, FileText, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type StudentAttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave' | 'Holiday' | '';

export interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: StudentAttendanceStatus;
  notes: string;
}

export default function AttendanceView({ data }: { data: any }) {
  const [activeTab, setActiveTab] = useState<'daily' | 'report'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  
  const records = useMemo(() => {
    return data?.studentAttendance || [];
  }, [data?.studentAttendance]);

  const students = useMemo(() => {
    const raw: any[] = [...(data?.students || [])];
    data?.admissions?.forEach((a: any) => {
      const isConfirmed = a.isAdmitted === true || 
                          a.status === "Admitted/Confirmed" || 
                          a.status === "Admitted" || 
                          a.status === "Confirmed" || 
                          a.status === "Full Paid" || 
                          a.status === "Partial Paid" || 
                          Number(a.feeReceived) > 0;
      if (isConfirmed) {
        if (!raw.some((s: any) => s.admissionId === a.id || s.id === (a.studentId || a.id))) {
          raw.push({
            id: a.studentId || a.id,
            admissionId: a.id,
            studentId: a.studentId,
            fullName: a.fullName,
            section: a.section,
            currentClass: a.category,
            groupName: a.group,
            gender: a.gender
          });
        }
      }
    });
    return raw;
  }, [data?.students, data?.admissions]);

  const sectionOptions = React.useMemo(() => {
    let sections = data?.settings?.predefinedSections || [];
    if (classFilter && classFilter !== 'all') {
      if (classFilter.toLowerCase().includes('boys')) {
        sections = sections.filter((s: any) => s.gender === 'Male');
      } else if (classFilter.toLowerCase().includes('girls')) {
        sections = sections.filter((s: any) => s.gender === 'Female');
      }
    }
    return Array.from(new Set(sections.map((s: any) => s.name).filter(Boolean))) as string[];
  }, [data?.settings?.predefinedSections, classFilter]);

  const classOptions = [
    "Inter Part-1 Boys", "Inter Part-2 Boys", "Inter Part-1 Girls", "Inter Part-2 Girls", 
    "DIT Boys", "DIT Girls", "UK L3 Boys", "UK L3 Girls", "BS Boys", "BS Girls"
  ];

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      const matchName = (s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
             (s.studentId || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchSection = sectionFilter === 'all' || s.section === sectionFilter;
      const matchClass = classFilter === 'all' || s.category === classFilter || s.currentClass === classFilter || s.groupName === classFilter;
      return matchName && matchSection && matchClass;
    });
  }, [students, searchTerm, sectionFilter, classFilter]);

  // Daily entries state
  const [dailyEntries, setDailyEntries] = useState<Record<string, Partial<StudentAttendanceRecord>>>({});

  useEffect(() => {
    // Only re-initialize dailyEntries if selectedDate changes, not when filters change.
    // We use all students to persist data even when filtered out.
    const existingForDate = records.filter(r => r.date === selectedDate);
    
    setDailyEntries(prev => {
      const newEntries = { ...prev };
      let initializedCount = 0;
      
      students.forEach((student: any) => {
        // If we switch to a new date, `prev` might have the previous date's entries or be empty.
        // If `prev[student.id]?.date === selectedDate`, we've already initialized it.
        if (!newEntries[student.id] || newEntries[student.id].date !== selectedDate) {
          const existing = existingForDate.find(r => r.studentId === student.id);
          if (existing) {
            newEntries[student.id] = { ...existing };
          } else {
            newEntries[student.id] = {
              studentId: student.id,
              date: selectedDate,
              status: 'Present',
              notes: ''
            };
          }
          initializedCount++;
        }
      });
      
      // If nothing new was added, just return prev to avoid unnecessary re-renders
      return initializedCount > 0 ? newEntries : prev;
    });
  }, [selectedDate, students, records]);

  const markAllFiltered = (status: StudentAttendanceStatus) => {
    setDailyEntries(prev => {
      const updated = { ...prev };
      filteredStudents.forEach((student: any) => {
        if (updated[student.id]) {
          updated[student.id] = { ...updated[student.id], status };
        }
      });
      return updated;
    });
    toast.success(`Marked all ${filteredStudents.length} filtered students as ${status}`);
  };

  const handleEntryChange = (studentId: string, field: keyof StudentAttendanceRecord, value: string) => {
    setDailyEntries(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSaveDaily = async () => {
    const payloads: Omit<StudentAttendanceRecord, "id">[] = [];
    
    Object.values(dailyEntries).forEach(entry => {
      if (entry.status && entry.studentId) { 
        payloads.push({
          studentId: entry.studentId,
          date: entry.date!,
          status: entry.status as StudentAttendanceStatus,
          notes: entry.notes || ''
        });
      }
    });

    if (payloads.length === 0) {
      toast.error('No attendance data to save for this date.');
      return;
    }

    const success = await data.saveStudentAttendanceLogs(payloads);
    if (success) {
      toast.success(`Attendance saved successfully for ${selectedDate}`);
    } else {
      toast.error('Failed to save attendance. Ensure all students are fully converted to the Students table.');
    }
  };

  const getMonthlyStats = (studentId: string) => {
    const monthRecords = records.filter(r => r.studentId === studentId && r.date.startsWith(reportMonth));
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      holiday: 0,
      totalWorkingDays: 0
    };

    monthRecords.forEach(r => {
      if (['Present', 'Late'].includes(r.status)) stats.totalWorkingDays++;
      
      switch(r.status) {
        case 'Present': stats.present++; break;
        case 'Absent': stats.absent++; break;
        case 'Late': stats.late++; break;
        case 'Leave': stats.leave++; break;
        case 'Holiday': stats.holiday++; break;
      }
    });

    return stats;
  };

  const downloadSectionPDF = () => {
    if (sectionFilter === 'all') {
      toast.error('Please select a specific section to download the section report.');
      return;
    }
    const doc = new jsPDF();
    const title = `${data?.settings?.collegeName || 'College'}\nAttendance Report - Section: ${sectionFilter}\nMonth: ${reportMonth}`;
    
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    
    const tableData = filteredStudents.map(student => {
      const stats = getMonthlyStats(student.id);
      return [
        student.studentId || '-',
        student.fullName,
        stats.present.toString(),
        stats.absent.toString(),
        stats.late.toString(),
        stats.leave.toString(),
        stats.holiday.toString()
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Name', 'Present', 'Absent', 'Late', 'Leave', 'Holiday']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87] } // Superior Teal
    });

    doc.save(`Attendance_${sectionFilter}_${reportMonth}.pdf`);
  };

  const downloadIndividualPDF = (student: any) => {
    const doc = new jsPDF();
    import('../lib/pdfHelpers').then(({ addStandardLetterhead }) => {
      addStandardLetterhead(doc, `Individual Attendance Report - ${reportMonth}`);
      
      doc.setFontSize(11);
      doc.text(`Student Name: ${student.fullName}`, 14, 65);
      doc.text(`Student ID: ${student.studentId || 'N/A'}`, 14, 71);
      doc.text(`Section: ${student.section || 'N/A'}`, 14, 77);

      const monthRecords = records
        .filter(r => r.studentId === student.id && r.date.startsWith(reportMonth))
        .sort((a, b) => a.date.localeCompare(b.date));

      const tableData = monthRecords.map(r => [
        r.date,
        r.status,
        r.notes || '-'
      ]);

      autoTable(doc, {
        startY: 85,
        head: [['Date', 'Status', 'Notes']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [4, 120, 87] }
      });

      const stats = getMonthlyStats(student.id);
      const finalY = (doc as any).lastAutoTable.finalY || 85;
      doc.text(`Summary: Present: ${stats.present}, Absent: ${stats.absent}, Late: ${stats.late}, Leave: ${stats.leave}, Holiday: ${stats.holiday}`, 14, finalY + 10);

      doc.save(`Attendance_${student.fullName.replace(/\s+/g, '_')}_${reportMonth}.pdf`);
    });
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display font-black text-superior-teal tracking-tight flex items-center gap-3">
            <CheckCircle2 size={32} className="text-superior-gold" />
            Students Attendance
          </h2>
          <p className="text-slate-500 mt-1 font-medium italic">Track daily presence and maintain precise records</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Search by student name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 transition-all font-medium"
              />
            </div>
            
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[180px] h-12 rounded-2xl bg-slate-50 border-transparent">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map(cls => (
                   <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-[180px] h-12 rounded-2xl bg-slate-50 border-transparent">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sectionOptions.map(sec => (
                  <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2">
              <Button 
                variant={activeTab === 'daily' ? 'default' : 'outline'}
                onClick={() => setActiveTab('daily')}
                className={cn("rounded-xl h-10 w-32", activeTab === 'daily' ? "bg-superior-teal text-white shadow-md shadow-superior-teal/20" : "")}
              >
                Daily Entry
              </Button>
              <Button 
                variant={activeTab === 'report' ? 'default' : 'outline'}
                onClick={() => setActiveTab('report')}
                className={cn("rounded-xl h-10 w-32", activeTab === 'report' ? "bg-superior-teal text-white shadow-md shadow-superior-teal/20" : "")}
              >
                Monthly Report
              </Button>
            </div>
            
            {activeTab === 'daily' ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 mr-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-11 rounded-xl text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                    onClick={() => markAllFiltered('Present')}
                  >
                    All Present
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-11 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                    onClick={() => markAllFiltered('Absent')}
                  >
                    All Absent
                  </Button>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <CalendarDays size={16} className="text-slate-400" />
                  <Input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border-none bg-transparent h-8 focus-visible:ring-0 w-[140px] text-sm font-medium"
                  />
                </div>
                {data?.syncAdmissionsToStudents && (
                  <Button 
                    variant="outline" 
                    onClick={() => data.syncAdmissionsToStudents?.()}
                    className="rounded-xl h-11 px-6 border-superior-teal/30 text-superior-teal hover:bg-superior-teal/5 bg-superior-teal/5"
                    title="If student is missing or save fails, click to synchronize"
                  >
                    <RefreshCw size={16} className="mr-2" /> Sync Students
                  </Button>
                )}
                <Button className="rounded-xl h-11 px-6 bg-superior-teal hover:bg-superior-teal/90 shadow-md shadow-superior-teal/20" onClick={handleSaveDaily}>
                   <Save size={18} className="mr-2" /> Save Attendance
                </Button>
              </div>
            ) : (
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <CalendarDays size={16} className="text-slate-400" />
                    <Input 
                      type="month" 
                      value={reportMonth}
                      onChange={(e) => setReportMonth(e.target.value)}
                      className="border-none bg-transparent h-8 focus-visible:ring-0 w-[140px] text-sm font-medium"
                    />
                  </div>
                  <Button variant="outline" className="rounded-xl h-11 border-superior-teal text-superior-teal" onClick={downloadSectionPDF}>
                     <Download size={18} className="mr-2" /> Download Section PDF
                  </Button>
               </div>
            )}
        </div>
      </div>

      <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <CardContent className="p-0">
          {activeTab === 'daily' ? (
             <div className="overflow-x-auto min-h-[400px]">
             <Table>
               <TableHeader className="bg-slate-50 border-b border-slate-100">
                 <TableRow className="hover:bg-transparent">
                   <TableHead className="w-20 pl-8 font-black uppercase text-[10px] tracking-wider text-slate-400">Roll No</TableHead>
                   <TableHead className="font-black uppercase text-[10px] tracking-wider text-slate-400">Student Info</TableHead>
                   <TableHead className="w-56 font-black uppercase text-[10px] tracking-wider text-slate-400">Status</TableHead>
                   <TableHead className="w-1/3 font-black uppercase text-[10px] tracking-wider text-slate-400 pr-8">Notes</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                           <CheckCircle2 size={32} className="opacity-20" />
                           <p className="font-medium">No students found matching your filters.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student: any) => (
                      <TableRow key={student.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="pl-8 font-mono text-xs font-semibold text-slate-600">
                           {student.studentId || student.collegeNo || 'Pending'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-superior-teal/10 flex items-center justify-center text-superior-teal font-black text-sm">
                              {(student.fullName || 'S').substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                 {student.fullName}
                                 {student.gender === 'Female' && <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>}
                                 {student.gender === 'Male' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
                              </div>
                              <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                                {student.section || 'Unassigned'} • {student.groupName || student.currentClass}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center bg-slate-50 inline-flex p-1 rounded-xl border border-slate-100">
                            {['Present', 'Absent', 'Late', 'Leave'].map(status => {
                              const isActive = dailyEntries[student.id]?.status === status;
                              return (
                                <button
                                  key={status}
                                  onClick={() => handleEntryChange(student.id, 'status', status)}
                                  className={cn(
                                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                                    isActive 
                                      ? status === 'Present' ? "bg-emerald-500 text-white shadow-sm"
                                      : status === 'Absent' ? "bg-red-500 text-white shadow-sm"
                                      : status === 'Late' ? "bg-amber-500 text-white shadow-sm"
                                      : "bg-blue-500 text-white shadow-sm"
                                      : "text-slate-500 hover:bg-slate-200/50"
                                  )}
                                >
                                  {status.charAt(0)}
                                </button>
                              )
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="pr-8">
                          <Input 
                            placeholder="Add reason/note..." 
                            className="h-10 rounded-xl text-sm border-slate-200 bg-slate-50 focus:bg-white"
                            value={dailyEntries[student.id]?.notes || ''}
                            onChange={(e) => handleEntryChange(student.id, 'notes', e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
               </TableBody>
             </Table>
           </div>
          ) : (
            <div className="overflow-x-auto min-h-[400px]">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-100">
                  <TableRow>
                    <TableHead className="whitespace-nowrap pl-8 font-black uppercase text-[10px] text-slate-400">Student Info</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 text-center">Present</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-emerald-500 text-center">Late</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-red-500 text-center">Absent</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-blue-500 text-center">Leave</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-purple-500 text-center">Holiday</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 pr-8 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center text-slate-500 font-medium">No students found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student: any) => {
                      const stats = getMonthlyStats(student.id);
                      return (
                        <TableRow key={student.id} className="hover:bg-slate-50/50">
                          <TableCell className="pl-8">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-sm">
                                {(student.fullName || 'S').substring(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 text-sm">{student.fullName}</div>
                                <div className="text-[10px] text-slate-500 font-medium">{student.section} • ID: {student.studentId || 'Pending'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-700 bg-slate-50/30">{stats.present}</TableCell>
                          <TableCell className="text-center font-bold text-emerald-600">{stats.late > 0 ? stats.late : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-red-600">{stats.absent > 0 ? stats.absent : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-blue-600">{stats.leave > 0 ? stats.leave : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-purple-600">{stats.holiday > 0 ? stats.holiday : '-'}</TableCell>
                          <TableCell className="pr-8 text-right">
                             <Button variant="ghost" size="sm" className="h-8 rounded-lg text-superior-teal hover:text-superior-teal hover:bg-superior-teal/10" onClick={() => downloadIndividualPDF(student)}>
                               <FileText size={14} className="mr-1.5" /> PDF
                             </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
