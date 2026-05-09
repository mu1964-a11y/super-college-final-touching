import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Staff } from '../types';
import { Download, Upload, Save, Calendar, FileSpreadsheet, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';

interface StaffAttendanceProps {
  staffList: Staff[];
  attendanceRecords?: any[];
  onSaveAttendance?: (records: any[]) => void;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Personal Leave' | 'College Holiday' | 'Public Holiday' | '';

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  notes: string;
}

export default function StaffAttendance({ staffList, attendanceRecords = [], onSaveAttendance }: StaffAttendanceProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'report'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local state for attendance records
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  React.useEffect(() => {
    if (attendanceRecords && attendanceRecords.length > 0) {
      setRecords(attendanceRecords);
    } else {
      const stored = localStorage.getItem('staffAttendanceRecords');
      if (stored) {
        try {
          setRecords(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse attendance records", e);
        }
      }
    }
  }, [attendanceRecords]);

  // Daily Attendance State overrides
  const [dailyEntries, setDailyEntries] = useState<Record<string, Partial<AttendanceRecord>>>({});

  // Initialize or update daily entries when selected date changes or staff list changes
  React.useEffect(() => {
    const existingForDate = records.filter(r => r.date === selectedDate);
    
    const newEntries: Record<string, Partial<AttendanceRecord>> = {};
    staffList.forEach(staff => {
      const existing = existingForDate.find(r => r.staffId === staff.id);
      if (existing) {
        newEntries[staff.id] = { ...existing };
      } else {
        newEntries[staff.id] = {
          staffId: staff.id,
          date: selectedDate,
          status: 'Present',
          checkIn: '08:00',
          checkOut: '14:00',
          notes: ''
        };
      }
    });
    setDailyEntries(newEntries);
  }, [selectedDate, staffList, records]);

  const handleEntryChange = (staffId: string, field: keyof AttendanceRecord, value: string) => {
    setDailyEntries(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value
      }
    }));
  };

  const handleSaveDaily = () => {
    const newRecordsList = [...records.filter(r => r.date !== selectedDate)];
    
    Object.values(dailyEntries).forEach(entry => {
      if (entry.status) {
        newRecordsList.push({
          id: entry.id || `${entry.staffId}-${entry.date}`,
          staffId: entry.staffId!,
          date: entry.date!,
          status: entry.status as AttendanceStatus,
          checkIn: entry.checkIn || '',
          checkOut: entry.checkOut || '',
          notes: entry.notes || ''
        });
      }
    });
    
    setRecords(newRecordsList);
    localStorage.setItem('staffAttendanceRecords', JSON.stringify(newRecordsList));
    
    if (onSaveAttendance) {
      // Just save the records for the selected date
      const batchForDate = Object.values(dailyEntries).filter(e => e.status).map(e => ({
        id: e.id || `${e.staffId}-${e.date}`,
        staffId: e.staffId!,
        date: e.date!,
        status: e.status as AttendanceStatus,
        checkIn: e.checkIn || '',
        checkOut: e.checkOut || '',
        notes: e.notes || ''
      }));
      onSaveAttendance(batchForDate);
    } else {
      toast.success(`Attendance saved locally for ${selectedDate}`);
    }
  };

  const handleDownloadTemplate = () => {
    const data = staffList.map(staff => ({
      'Staff ID': staff.id,
      'Name': staff.fullName,
      'Date': selectedDate,
      'Status (Present/Absent/Late/Half Day/Personal Leave/College Holiday/Public Holiday)': 'Present',
      'Check In (HH:MM)': '08:00',
      'Check Out (HH:MM)': '14:00',
      'Notes': ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Template");
    XLSX.writeFile(wb, `Staff_Attendance_Template_${selectedDate}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const newEntries = { ...dailyEntries };

        data.forEach((row: any) => {
          const staffId = row['Staff ID'] || row['Staff Id'];
          if (staffId && newEntries[staffId]) {
            newEntries[staffId] = {
              ...newEntries[staffId],
              status: (row['Status (Present/Absent/Late/Half Day/Personal Leave/College Holiday/Public Holiday)'] || row['Status'] || 'Present') as AttendanceStatus,
              checkIn: row['Check In (HH:MM)'] || row['Check In'] || '',
              checkOut: row['Check Out (HH:MM)'] || row['Check Out'] || '',
              notes: row['Notes'] || ''
            };
          }
        });

        setDailyEntries(newEntries);
        toast.success("Excel data imported successfully! Please review and save.");
      } catch (error) {
        toast.error("Failed to parse Excel file.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const handleExportExcel = () => {
    const data = staffList.map(staff => {
      const entry = dailyEntries[staff.id];
      return {
        'Staff ID': staff.id,
        'Name': staff.fullName,
        'Role': staff.role || 'N/A',
        'Date': selectedDate,
        'Status': entry?.status || '',
        'Check In': entry?.checkIn || '',
        'Check Out': entry?.checkOut || '',
        'Notes': entry?.notes || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Attendance");
    XLSX.writeFile(wb, `Daily_Attendance_${selectedDate}.xlsx`);
  };

  const getMonthlyStats = (staffId: string) => {
    const monthRecords = records.filter(r => r.staffId === staffId && r.date.startsWith(reportMonth));
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      personalLeave: 0,
      collegeHoliday: 0,
      publicHoliday: 0,
      totalWorkingDays: 0
    };

    monthRecords.forEach(r => {
      if (['Present', 'Late', 'Half Day'].includes(r.status)) stats.totalWorkingDays++;
      
      switch(r.status) {
        case 'Present': stats.present++; break;
        case 'Absent': stats.absent++; break;
        case 'Late': stats.late++; break;
        case 'Half Day': stats.halfDay++; break;
        case 'Personal Leave': stats.personalLeave++; break;
        case 'College Holiday': stats.collegeHoliday++; break;
        case 'Public Holiday': stats.publicHoliday++; break;
      }
    });

    return stats;
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const name = s.fullName || '';
      const id = s.id || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             id.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [staffList, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Button 
            variant={activeTab === 'daily' ? 'default' : 'outline'}
            onClick={() => setActiveTab('daily')}
            className={cn("rounded-xl", activeTab === 'daily' ? "bg-superior-teal text-white" : "")}
          >
            Daily Attendance
          </Button>
          <Button 
            variant={activeTab === 'report' ? 'default' : 'outline'}
            onClick={() => setActiveTab('report')}
            className={cn("rounded-xl", activeTab === 'report' ? "bg-superior-teal text-white" : "")}
          >
            Monthly Report
          </Button>
        </div>

        {activeTab === 'daily' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <input type="file" id="excel-import" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
              <Button variant="outline" className="rounded-xl border-dashed" onClick={() => document.getElementById('excel-import')?.click()}>
                <Upload size={16} className="mr-2" /> Import
              </Button>
            </div>
            <Button variant="outline" className="rounded-xl text-superior-teal border-superior-teal" onClick={handleDownloadTemplate}>
              <FileSpreadsheet size={16} className="mr-2" /> Format
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={handleExportExcel}>
              <Download size={16} className="mr-2" /> Export
            </Button>
            <Button className="rounded-xl bg-superior-teal hover:bg-superior-teal/90" onClick={handleSaveDaily}>
              <Save size={16} className="mr-2" /> Save Records
            </Button>
          </div>
        )}
      </div>

      <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 px-8 py-6 border-b border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-widest text-superior-teal">
                {activeTab === 'daily' ? 'Daily Attendance Tracker' : 'Monthly Attendance Summary'}
              </CardTitle>
              <p className="text-xs text-slate-500 font-medium tracking-wide mt-1">
                {activeTab === 'daily' 
                  ? 'Record check-in/out times and daily statuses' 
                  : 'Overview of leaves, presents, and holidays for payroll calculation'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input 
                  placeholder="Search staff..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 rounded-xl bg-white border-slate-200"
                />
              </div>

              {activeTab === 'daily' ? (
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  <Input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40 h-10 rounded-xl"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  <Input 
                    type="month" 
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="w-40 h-10 rounded-xl"
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {activeTab === 'daily' ? (
             <div className="overflow-x-auto min-h-[400px]">
             <Table>
               <TableHeader className="bg-slate-50">
                 <TableRow>
                   <TableHead className="w-16 whitespace-nowrap pl-8 font-black uppercase text-[10px] text-slate-400">ID</TableHead>
                   <TableHead className="font-black uppercase text-[10px] text-slate-400">Staff Member</TableHead>
                   <TableHead className="w-48 font-black uppercase text-[10px] text-slate-400">Status</TableHead>
                   <TableHead className="w-32 font-black uppercase text-[10px] text-slate-400">Check In</TableHead>
                   <TableHead className="w-32 font-black uppercase text-[10px] text-slate-400">Check Out</TableHead>
                   <TableHead className="w-64 font-black uppercase text-[10px] text-slate-400 pr-8">Notes</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center text-slate-500">No staff members found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map(staff => (
                      <TableRow key={staff.id} className="hover:bg-slate-50">
                        <TableCell className="pl-8 font-mono text-[10px] text-slate-500">{staff.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-superior-teal/10 flex items-center justify-center text-superior-teal font-bold text-xs">
                              {staff.fullName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{staff.fullName}</div>
                              <div className="text-[10px] text-slate-500">{staff.role || 'Staff'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={dailyEntries[staff.id]?.status || 'Present'} 
                            onValueChange={(val) => handleEntryChange(staff.id, 'status', val)}
                          >
                            <SelectTrigger className="h-9 rounded-xl border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Present">Present</SelectItem>
                              <SelectItem value="Absent">Absent</SelectItem>
                              <SelectItem value="Late">Late</SelectItem>
                              <SelectItem value="Half Day">Half Day</SelectItem>
                              <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                              <SelectItem value="College Holiday">College Holiday</SelectItem>
                              <SelectItem value="Public Holiday">Public Holiday</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="time" 
                            className="h-9 rounded-xl text-xs" 
                            value={dailyEntries[staff.id]?.checkIn || ''}
                            onChange={(e) => handleEntryChange(staff.id, 'checkIn', e.target.value)}
                            disabled={['Absent', 'Personal Leave', 'College Holiday', 'Public Holiday'].includes(dailyEntries[staff.id]?.status || '')}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="time" 
                            className="h-9 rounded-xl text-xs"
                            value={dailyEntries[staff.id]?.checkOut || ''}
                            onChange={(e) => handleEntryChange(staff.id, 'checkOut', e.target.value)}
                            disabled={['Absent', 'Personal Leave', 'College Holiday', 'Public Holiday'].includes(dailyEntries[staff.id]?.status || '')}
                          />
                        </TableCell>
                        <TableCell className="pr-8">
                          <Input 
                            placeholder="Add reason/note..." 
                            className="h-9 rounded-xl text-xs"
                            value={dailyEntries[staff.id]?.notes || ''}
                            onChange={(e) => handleEntryChange(staff.id, 'notes', e.target.value)}
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
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="whitespace-nowrap pl-8 font-black uppercase text-[10px] text-slate-400">Staff Member</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 text-center">Present</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-emerald-500 text-center">Late</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-amber-500 text-center">Half Day</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-red-500 text-center">Absent</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-blue-500 text-center">Personal Leave</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-purple-500 text-center bg-purple-50/50">College Off</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-indigo-500 text-center pr-8 bg-indigo-50/50">Public Holiday</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center text-slate-500">No staff members found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map(staff => {
                      const stats = getMonthlyStats(staff.id);
                      return (
                        <TableRow key={staff.id} className="hover:bg-slate-50">
                          <TableCell className="pl-8">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                                {staff.fullName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 text-sm">{staff.fullName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">ID: {staff.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-700 bg-slate-50/50">{stats.present}</TableCell>
                          <TableCell className="text-center font-bold text-emerald-600">{stats.late > 0 ? stats.late : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-amber-600">{stats.halfDay > 0 ? stats.halfDay : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-red-600">{stats.absent > 0 ? stats.absent : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-blue-600">{stats.personalLeave > 0 ? stats.personalLeave : '-'}</TableCell>
                          <TableCell className="text-center font-bold text-purple-600 bg-purple-50/30">{stats.collegeHoliday > 0 ? stats.collegeHoliday : '-'}</TableCell>
                          <TableCell className="text-center pr-8 font-bold text-indigo-600 bg-indigo-50/30">{stats.publicHoliday > 0 ? stats.publicHoliday : '-'}</TableCell>
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
