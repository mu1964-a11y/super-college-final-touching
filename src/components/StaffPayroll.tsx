import React, { useState, useMemo, useEffect } from 'react';
import { Staff } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Calculator, Printer, CreditCard, Clock, FileText, ChevronLeft, Plus, Download, Sparkles } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { safeLocalStorage } from '../utils/safeStorage';
import StaffSalarySlipModal from './StaffSalarySlipModal';

interface StaffPayrollProps {
  staffList: Staff[];
  advances?: AdvanceEntry[];
  staffTimetable?: any[];
  attendanceRecords?: any[];
  onRecordAdvance?: (advance: AdvanceEntry) => void;
  onUpdateAdvance?: (id: string, updates: Partial<AdvanceEntry>) => void;
}

interface AdvanceEntry {
  id: string;
  staffId: string;
  amount: number;
  monthsCount: number;
  date: string;
  notes: string;
  remainingBalance: number;
}

export default function StaffPayroll({ staffList, advances = [], staffTimetable = [], attendanceRecords = [], onRecordAdvance, onUpdateAdvance }: StaffPayrollProps) {
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  
  // Payroll Parameters
  const [monthDays, setMonthDays] = useState(30);
  const [collegeStartTime, setCollegeStartTime] = useState("08:00");
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [leavesTaken, setLeavesTaken] = useState(0);
  const [lateMinutes, setLateMinutes] = useState(0);
  const [advanceDeduction, setAdvanceDeduction] = useState(0);
  
  // Extra Lecture State
  const [extraLectureRate, setExtraLectureRate] = useState(0);
  const [extraLecturesCount, setExtraLecturesCount] = useState(0);
  const [regularLecturesCount, setRegularLecturesCount] = useState(0);
  const [totalLecturesCount, setTotalLecturesCount] = useState(0);

  // Current Month/Year
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  // Advances State
  const [localAdvances, setLocalAdvances] = useState<AdvanceEntry[]>([]);
  const [localAttendance, setLocalAttendance] = useState<any[]>([]);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceMonths, setAdvanceMonths] = useState<number>(1);
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);

  useEffect(() => {
    if (advances && advances.length > 0) {
      setLocalAdvances(advances);
    } else {
      const storedAdvances = safeLocalStorage.getItem('staffAdvances');
      if (storedAdvances) {
        try {
          setLocalAdvances(JSON.parse(storedAdvances));
        } catch (e) {
          console.error("Failed to parse advances", e);
        }
      }
    }
    
    // We didn't pass attendanceRecords as prop to this component in StaffView, but we could. For now, fetch from safeLocalStorage or use prop if we add it.
    if (attendanceRecords.length > 0) {
      setLocalAttendance(attendanceRecords);
    } else {
      const storedAttendance = safeLocalStorage.getItem('staffAttendanceRecords');
      if (storedAttendance) {
        try {
          setLocalAttendance(JSON.parse(storedAttendance));
        } catch (e) {
          console.error("Failed to parse attendance", e);
        }
      }
    }
  }, [advances, attendanceRecords]);

  const saveAdvances = (newAdvances: AdvanceEntry[]) => {
    setLocalAdvances(newAdvances);
    safeLocalStorage.setItem('staffAdvances', JSON.stringify(newAdvances));
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const name = s.fullName || '';
      const id = s.id || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             id.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [staffList, searchQuery]);

  const baseSalary = selectedStaff?.baseSalary || selectedStaff?.salary || 0;
  const computedDailyRate = baseSalary / monthDays;
  const computedHourlyRate = computedDailyRate / hoursPerDay;
  const computedMinuteRate = computedHourlyRate / 60;

  const leaveDeduction = leavesTaken * computedDailyRate;
  const lateDeduction = lateMinutes * computedMinuteRate;
  
  const staffAdvances = localAdvances.filter(a => a.staffId === selectedStaff?.id);
  const totalRemainingAdvance = staffAdvances.reduce((sum, a) => sum + a.remainingBalance, 0);
  const totalInitialAdvance = staffAdvances.reduce((sum, a) => sum + a.amount, 0);
  const advanceRepaidAmount = Math.max(0, totalInitialAdvance - totalRemainingAdvance);
  const advanceRepaidPercent = totalInitialAdvance > 0 ? Math.round((advanceRepaidAmount / totalInitialAdvance) * 100) : 0;

  // Auto-suggest recommended monthly installment across active advances
  const suggestedInstallment = useMemo(() => {
    const activeAdvances = staffAdvances.filter(a => a.remainingBalance > 0);
    if (activeAdvances.length === 0) return 0;
    const calculated = activeAdvances.reduce((sum, a) => {
      const months = Math.max(1, a.monthsCount || 1);
      const monthlyQuota = Math.ceil(a.amount / months);
      return sum + Math.min(monthlyQuota, a.remainingBalance);
    }, 0);
    return Math.min(totalRemainingAdvance, calculated);
  }, [staffAdvances, totalRemainingAdvance]);

  const handleAutoCalculate = () => {
    if (!selectedStaff) return;
    
    const monthRecords = localAttendance.filter(r => 
      r.staffId === selectedStaff.id && 
      r.date.startsWith(selectedMonth)
    );

    let totalLeaves = 0;
    let totalLateMins = 0;
    
    // Lectures calculation
    let extraLecs = 0;
    let regularLecs = 0;
    let totalLecs = 0;

    // Parse the start time config
    const [startH, startM] = collegeStartTime.split(':').map(Number);
    const startMinsConfig = (startH || 0) * 60 + (startM || 0);

    // Calculate expected checkout time based on hours per day
    const endMinsConfig = startMinsConfig + (hoursPerDay * 60);

    monthRecords.forEach(r => {
      // Leaves computation
      if (r.status === 'Absent' || r.status === 'Personal Leave') {
        totalLeaves += 1;
      } else if (r.status === 'Half Day') {
        totalLeaves += 0.5;
      }

      // Late/Short minutes computation
      // Only penalize if status is Present or Late
      if ((r.status === 'Present' || r.status === 'Late') && r.checkIn) {
        const [inH, inM] = r.checkIn.split(':').map(Number);
        const checkInMins = inH * 60 + inM;
        
        if (checkInMins > startMinsConfig) {
          totalLateMins += (checkInMins - startMinsConfig);
        }
      }

      // If they check out early, count as late/short minutes as well
      if ((r.status === 'Present' || r.status === 'Late') && r.checkOut) {
        const [outH, outM] = r.checkOut.split(':').map(Number);
        const checkOutMins = outH * 60 + outM;
        
        if (checkOutMins < endMinsConfig) {
          totalLateMins += (endMinsConfig - checkOutMins);
        }
      }
      
      // Compute Lectures given on this day
      if (['Present', 'Late', 'Half Day'].includes(r.status)) {
         const d = new Date(r.date);
         const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
         const dayStr = daysOfWeek[d.getDay()];

         const daySchedule = staffTimetable.filter(t => t.staffId === selectedStaff.id && t.day === dayStr);
         const dayExtra = daySchedule.filter(t => t.classRoom === 'Extra').length;
         const dayTotal = daySchedule.length;
         const dayRegular = dayTotal - dayExtra;
         
         extraLecs += dayExtra;
         regularLecs += dayRegular;
         totalLecs += dayTotal;
      }
    });

    setLeavesTaken(totalLeaves);
    setLateMinutes(totalLateMins);
    setExtraLecturesCount(extraLecs);
    setRegularLecturesCount(regularLecs);
    setTotalLecturesCount(totalLecs);
    
    if (monthRecords.length === 0) {
      toast.warning(`No attendance records found for ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}`);
    } else {
      toast.success(`Successfully auto-calculated based on ${monthRecords.length} attendance records.\nTotal Lectures: ${totalLecs}`);
    }
  };

  const extraAllowance = extraLecturesCount * extraLectureRate;
  const netSalary = baseSalary + extraAllowance - leaveDeduction - lateDeduction - advanceDeduction;

  const handleIssueAdvance = () => {
    if (!selectedStaff || advanceAmount <= 0) return;
    
    const newAdvance: AdvanceEntry = {
      id: `ADV-${Date.now()}`,
      staffId: selectedStaff.id,
      amount: advanceAmount,
      monthsCount: advanceMonths,
      date: new Date().toISOString(),
      notes: advanceNotes,
      remainingBalance: advanceAmount
    };

    if (onRecordAdvance) {
      onRecordAdvance(newAdvance);
    } else {
      saveAdvances([...localAdvances, newAdvance]);
    }
    setIsAdvanceDialogOpen(false);
    toast.success(`Advance salary of RS ${advanceAmount.toLocaleString()} added for ${selectedStaff.fullName}`);
    setAdvanceAmount(0);
    setAdvanceMonths(1);
    setAdvanceNotes('');
  };

  const handleGeneratePayslip = () => {
    if (advanceDeduction > 0) {
      let remainingToDeduct = advanceDeduction;
      
      if (onUpdateAdvance) {
        // Find which advances to deduct from and update Supabase
        const advancesToUpdate = staffAdvances.filter(adv => adv.remainingBalance > 0);
        advancesToUpdate.forEach(adv => {
           if (remainingToDeduct <= 0) return;
           if (adv.remainingBalance >= remainingToDeduct) {
             onUpdateAdvance(adv.id, { remainingBalance: adv.remainingBalance - remainingToDeduct });
             remainingToDeduct = 0;
           } else {
             onUpdateAdvance(adv.id, { remainingBalance: 0 });
             remainingToDeduct -= adv.remainingBalance;
           }
        });
      } else {
        const newAdvances = localAdvances.map(adv => {
          if (adv.staffId === selectedStaff?.id && adv.remainingBalance > 0 && remainingToDeduct > 0) {
            if (adv.remainingBalance >= remainingToDeduct) {
              const updated = { ...adv, remainingBalance: adv.remainingBalance - remainingToDeduct };
              remainingToDeduct = 0;
              return updated;
            } else {
              const updated = { ...adv, remainingBalance: 0 };
              remainingToDeduct -= adv.remainingBalance;
              return updated;
            }
          }
          return adv;
        });
        saveAdvances(newAdvances);
      }
      toast.success(`Salary Computed. RS ${advanceDeduction.toLocaleString()} recovered from advance balance.`);
    } else {
      toast.success("Payslip Generated Successfully!");
    }
    
    // Open Official Payslip Modal with PDF/Image/Print options
    setIsSlipModalOpen(true);
  };

  if (!selectedStaff) {
    return (
      <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-black text-slate-800 dark:text-white">Payroll Management</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Select a staff member to compute salary, manage attendance deductions and advances.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <Input
                placeholder="Search staff by ID or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 rounded-xl w-full text-sm font-medium text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="bg-slate-50/90 dark:bg-slate-800/80 sticky top-0 z-10 backdrop-blur-md hidden md:table-header-group">
                <TableRow className="border-slate-200/80 dark:border-slate-800">
                  <TableHead className="font-bold text-slate-600 dark:text-slate-300">Staff ID</TableHead>
                  <TableHead className="font-bold text-slate-600 dark:text-slate-300">Name & Role</TableHead>
                  <TableHead className="font-bold text-slate-600 dark:text-slate-300">Base Salary</TableHead>
                  <TableHead className="font-bold text-slate-600 dark:text-slate-300 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center text-slate-500 dark:text-slate-400">
                      No staff members found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((staff) => (
                    <TableRow key={staff.id} className="border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <TableCell className="font-mono text-sm font-bold text-slate-600 dark:text-slate-400">{staff.id}</TableCell>
                      <TableCell>
                        <p className="font-bold text-slate-800 dark:text-white">{staff.fullName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{staff.role}</p>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700 dark:text-slate-300">
                        RS {(staff.baseSalary || staff.salary || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          className="rounded-xl border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all font-semibold"
                          onClick={() => {
                            setSelectedStaff(staff);
                            setLeavesTaken(0);
                            setLateMinutes(0);
                            setAdvanceDeduction(0);
                          }}
                        >
                          <Calculator size={16} className="mr-2" />
                          Compute
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Button 
        variant="ghost" 
        className="text-slate-500 hover:text-slate-800 font-semibold mb-2 -ml-2 hover:bg-slate-100 rounded-xl print:hidden"
        onClick={() => setSelectedStaff(null)}
      >
        <ChevronLeft size={20} className="mr-1" /> Back to Staff List
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column Config */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 p-6">
              <CardTitle className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Clock className="text-emerald-600 dark:text-emerald-400" size={20} />
                Attendance Config
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Payroll Month</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xl">
                      {[0, 1, 2, 3, 4, 5, 6].map(i => {
                        const date = subMonths(new Date(), i);
                        const val = format(date, 'yyyy-MM');
                        return <SelectItem key={val} value={val} className="font-medium rounded-lg">{format(date, 'MMMM yyyy')}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Total Days in Month</label>
                  <Input 
                    type="number"
                    value={monthDays}
                    onChange={(e) => setMonthDays(Number(e.target.value) || 1)}
                    className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium"
                  />
                  <p className="text-[10px] text-slate-400">Used for Daily Rate calculation</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">College Start Time</label>
                  <Input 
                    type="time"
                    value={collegeStartTime}
                    onChange={(e) => setCollegeStartTime(e.target.value)}
                    className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">College Hours / Day</label>
                  <Input 
                    type="number"
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Number(e.target.value) || 1)}
                    className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium"
                    step="0.5"
                  />
                  <p className="text-[10px] text-slate-400">Determines expected check-out time.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden pb-4">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 p-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <CreditCard className="text-amber-500" size={20} />
                Advances
              </CardTitle>
              <Dialog open={isAdvanceDialogOpen} onOpenChange={setIsAdvanceDialogOpen}>
                <DialogTrigger render={
                  <Button variant="outline" size="sm" className="rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-amber-500/10 hover:text-amber-600">
                    <Plus size={16} className="mr-1" /> Issue
                  </Button>
                } />
                <DialogContent className="rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-2xl p-8 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-800 dark:text-white">Issue Advance Salary</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">Record a new advance payment for {selectedStaff.fullName}.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-600 dark:text-slate-300">Advance Amount (RS)</label>
                      <Input 
                        type="number" 
                        value={advanceAmount || ''}
                        onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                        className="h-14 font-mono text-lg rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" 
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-600 dark:text-slate-300">Number of Months (For Reference)</label>
                      <Input 
                        type="number" 
                        value={advanceMonths}
                        onChange={(e) => setAdvanceMonths(Number(e.target.value))}
                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" 
                        min="1"
                      />
                    </div>
                     <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-600 dark:text-slate-300">Notes (Optional)</label>
                      <Input 
                        value={advanceNotes}
                        onChange={(e) => setAdvanceNotes(e.target.value)}
                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" 
                        placeholder="e.g., Medical Emergency, Eid Advance"
                      />
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button 
                      onClick={handleIssueAdvance} 
                      className="w-full h-12 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                    >
                      Record Advance Payment
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Advanced</p>
                  <p className="text-lg font-mono font-black text-slate-700 dark:text-slate-200">RS {totalInitialAdvance.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/30">
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Remaining</p>
                  <p className="text-lg font-mono font-black text-amber-600 dark:text-amber-400">RS {totalRemainingAdvance.toLocaleString()}</p>
                </div>
              </div>

              {/* Repayment Progress Tracker */}
              {totalInitialAdvance > 0 && (
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span>Repaid Progress</span>
                    <span>{advanceRepaidPercent}% ({advanceRepaidAmount.toLocaleString()} / {totalInitialAdvance.toLocaleString()})</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(0, advanceRepaidPercent))}%` }}
                    />
                  </div>
                </div>
              )}

              {totalRemainingAdvance > 0 && (
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase">Deduct From This Month</label>
                    {suggestedInstallment > 0 && (
                      <button 
                        type="button"
                        onClick={() => setAdvanceDeduction(suggestedInstallment)}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Sparkles size={12} /> Auto: RS {suggestedInstallment.toLocaleString()}
                      </button>
                    )}
                  </div>
                  <Input 
                    type="number"
                    value={advanceDeduction || ''}
                    onChange={(e) => setAdvanceDeduction(Number(e.target.value) || 0)}
                    max={totalRemainingAdvance}
                    className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-amber-600 font-bold"
                    placeholder="0"
                  />
                  <p className="text-[10px] text-slate-400">Max available to deduct: RS {totalRemainingAdvance.toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payslip preview */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden printable-payslip print:shadow-none print:rounded-none">
            <div className="bg-gradient-to-r from-[#064e43] via-[#053d34] to-[#042822] p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 print:bg-white print:text-black print:border-b-2 print:border-slate-800 print:p-0 print:pb-4">
              <div>
                <h2 className="text-3xl font-black mb-1 tracking-tight">Superior Group of Colleges</h2>
                <p className="text-emerald-200/90 font-medium print:text-slate-600">Staff Payslip - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</p>
              </div>
              <div className="text-right flex items-center gap-3 print:hidden">
                <Button 
                  onClick={() => setIsSlipModalOpen(true)}
                  className="h-11 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold shadow-sm gap-2"
                >
                  <Download size={16} />
                  Official Slip (PDF / Print)
                </Button>
                <Button onClick={handleGeneratePayslip} variant="outline" className="h-11 px-5 rounded-xl bg-white text-slate-800 hover:bg-slate-100 font-bold shadow-sm">
                  <Printer size={16} className="mr-1.5" />
                  Print & Save
                </Button>
              </div>
            </div>
            
            <CardContent className="p-8 space-y-8 print:p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 print:bg-transparent print:border-none print:p-0">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 print:text-slate-600">Staff ID</p>
                  <p className="font-mono font-bold text-slate-700 print:text-black">{selectedStaff.id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 print:text-slate-600">Name</p>
                  <p className="font-bold text-slate-800 print:text-black">{selectedStaff.fullName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 print:text-slate-600">Designation</p>
                  <p className="font-bold text-slate-800 print:text-black">{selectedStaff.role}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 print:text-slate-600">Base Salary</p>
                  <p className="font-bold text-superior-teal print:text-black">RS {baseSalary.toLocaleString()}</p>
                </div>
              </div>

              <div className="print:hidden bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 border-dashed space-y-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-indigo-800">Extra Lectures Allowance</h3>
                    <p className="text-xs text-indigo-600/80">Configure extra lecture rate and view lecture counts.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-indigo-600 uppercase">Extra Lecture Rate</label>
                    <Input 
                      type="number"
                      value={extraLectureRate}
                      onChange={(e) => setExtraLectureRate(Number(e.target.value))}
                      className="h-12 bg-white border-indigo-200 rounded-xl"
                    />
                    <p className="text-[10px] text-indigo-500">Allowance: RS {extraAllowance.toFixed(0)}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-indigo-600 uppercase">Extra Lectures</label>
                    <Input 
                      type="number"
                      value={extraLecturesCount}
                      readOnly
                      className="h-12 bg-indigo-50 border-indigo-200 rounded-xl font-bold font-mono text-indigo-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-indigo-600 uppercase">Total / Regular</label>
                    <div className="h-12 flex items-center gap-2 px-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold font-mono text-indigo-900">
                      {totalLecturesCount} / {regularLecturesCount}
                    </div>
                  </div>
                </div>
              </div>

              <div className="print:hidden bg-rose-50/50 p-6 rounded-2xl border border-rose-100 border-dashed space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-rose-800">Attendance Deductions</h3>
                    <p className="text-xs text-rose-600/80">Manually adjust or auto-calculate based on records.</p>
                  </div>
                  <Button 
                    onClick={handleAutoCalculate}
                    variant="outline" 
                    size="sm" 
                    className="border-rose-200 text-rose-700 hover:bg-rose-100 font-bold rounded-xl"
                  >
                    <Calculator size={14} className="mr-2"/> Auto Calculate
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-rose-600 uppercase">Leaves Taken (Days)</label>
                    <Input 
                      type="number"
                      value={leavesTaken}
                      onChange={(e) => setLeavesTaken(Number(e.target.value))}
                      className="h-12 bg-white border-rose-200 rounded-xl"
                      step="0.5"
                    />
                    <p className="text-[10px] text-rose-500">Deduction: RS {leaveDeduction.toFixed(0)} (Daily: {computedDailyRate.toFixed(0)})</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-rose-600 uppercase">Late/Short Duration (Mins)</label>
                    <Input 
                      type="number"
                      value={lateMinutes}
                      onChange={(e) => setLateMinutes(Number(e.target.value))}
                      className="h-12 bg-white border-rose-200 rounded-xl"
                    />
                    <p className="text-[10px] text-rose-500">Deduction: RS {lateDeduction.toFixed(0)} (Hourly: {computedHourlyRate.toFixed(0)})</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2 print:text-black">
                  <FileText className="text-emerald-600 dark:text-emerald-400 print:hidden" size={20}/> 
                  Salary Details
                </h3>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:border print:border-black print:rounded-none">
                  <Table className="print:border-collapse">
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/80 print:bg-slate-100">
                      <TableRow className="border-slate-200 dark:border-slate-800 print:border-b print:border-black">
                        <TableHead className="font-bold text-slate-600 dark:text-slate-300 w-2/3 print:text-black print:py-2">Description</TableHead>
                        <TableHead className="font-bold text-slate-600 dark:text-slate-300 text-right print:text-black print:py-2">Amount (RS)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-slate-100 dark:border-slate-800/80 print:border-b print:border-slate-300">
                        <TableCell className="font-semibold text-slate-700 dark:text-slate-300 print:text-black print:py-2">Gross Base Salary</TableCell>
                        <TableCell className="text-right font-bold text-slate-800 dark:text-white print:text-black print:py-2">{baseSalary.toLocaleString()}</TableCell>
                      </TableRow>

                      <TableRow className="border-slate-100 dark:border-slate-800/80 print:border-b print:border-slate-300">
                        <TableCell className="text-slate-500 dark:text-slate-400 font-medium print:text-black print:py-2">
                          Total Lectures Given
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-500 dark:text-slate-400 print:text-black print:py-2">
                          {totalLecturesCount} ({regularLecturesCount} Reg, {extraLecturesCount} Ext)
                        </TableCell>
                      </TableRow>
                      
                      {extraAllowance > 0 && (
                        <TableRow className="border-slate-100 dark:border-slate-800/80 print:border-b print:border-slate-300">
                          <TableCell className="text-indigo-600 dark:text-indigo-400 font-medium border-l-2 border-indigo-500 print:text-black print:py-2">
                            Extra Lectures Allowance ({extraLecturesCount} lectures @ RS {extraLectureRate.toFixed(2)}/lec)
                          </TableCell>
                          <TableCell className="text-right font-bold text-indigo-600 dark:text-indigo-400 print:text-black print:py-2">+ {extraAllowance.toFixed(0)}</TableCell>
                        </TableRow>
                      )}

                      {leaveDeduction > 0 && (
                        <TableRow className="border-slate-100 dark:border-slate-800/80 print:border-b print:border-slate-300">
                          <TableCell className="text-rose-600 dark:text-rose-400 font-medium border-l-2 border-rose-500 print:text-black print:py-2">
                            Leave Deduction ({leavesTaken} days @ RS {computedDailyRate.toFixed(2)}/day)
                          </TableCell>
                          <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400 print:text-black print:py-2">- {leaveDeduction.toFixed(0)}</TableCell>
                        </TableRow>
                      )}
                      
                      {lateDeduction > 0 && (
                        <TableRow className="border-slate-100 dark:border-slate-800/80 print:border-b print:border-slate-300">
                          <TableCell className="text-rose-600 dark:text-rose-400 font-medium border-l-2 border-rose-500 print:text-black print:py-2">
                            Late Deduction ({lateMinutes} mins @ RS {computedMinuteRate.toFixed(2)}/min)
                          </TableCell>
                          <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400 print:text-black print:py-2">- {lateDeduction.toFixed(0)}</TableCell>
                        </TableRow>
                      )}
                      
                      {advanceDeduction > 0 && (
                         <TableRow className="border-slate-100 dark:border-slate-800/80 print:border-b print:border-slate-300">
                          <TableCell className="text-amber-600 dark:text-amber-400 font-medium border-l-2 border-amber-500 print:text-black print:py-2">
                            Advance Recovery Deducted
                          </TableCell>
                          <TableCell className="text-right font-bold text-amber-600 dark:text-amber-400 print:text-black print:py-2">- {advanceDeduction.toFixed(0)}</TableCell>
                        </TableRow>
                      )}
                      
                      <TableRow className="bg-emerald-50/50 dark:bg-emerald-950/20 border-t border-slate-200 dark:border-slate-700 print:bg-transparent print:border-t-2 print:border-black">
                        <TableCell className="font-black text-slate-900 dark:text-white pt-5 pb-5 print:py-4">
                           NET SALARY PAYABLE
                        </TableCell>
                        <TableCell className="text-right font-black text-2xl text-emerald-700 dark:text-emerald-400 pt-5 pb-5 print:py-4 print:text-black">
                           RS {Math.max(0, netSalary).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Outstanding Advance on slip if any remains OR any is deducted */}
              {(totalRemainingAdvance > 0 || advanceDeduction > 0) && (
                <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-4 mt-6 print:border-solid print:border-black print:bg-transparent">
                  <p className="text-sm text-amber-800 font-bold print:text-black">
                    Advance Salary Outstanding: RS {Math.max(0, totalRemainingAdvance - advanceDeduction).toLocaleString()}
                  </p>
                  <p className="text-xs text-amber-700/80 font-medium mt-1 print:text-slate-600">
                    Calculated after this month's deduction of RS {advanceDeduction.toFixed(0)}.
                  </p>
                </div>
              )}

              <div className="hidden print:flex justify-between items-end mt-32 pt-8 border-t border-slate-800">
                <div className="text-center w-[200px]">
                  <div className="border-b border-black mb-2 h-10 w-full"></div>
                  <p className="font-bold text-sm">Prepared By & Date</p>
                </div>
                <div className="text-center w-[200px]">
                  <div className="border-b border-black mb-2 h-10 w-full"></div>
                  <p className="font-bold text-sm">Principal / Director Sign</p>
                </div>
                <div className="text-center w-[200px]">
                  <div className="border-b border-black mb-2 h-10 w-full"></div>
                  <p className="font-bold text-sm">Employee Signature</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Official Staff Salary Slip Modal (PDF / Image / Print / Verification) */}
      {selectedStaff && (
        <StaffSalarySlipModal
          isOpen={isSlipModalOpen}
          onClose={() => setIsSlipModalOpen(false)}
          staff={selectedStaff}
          month={selectedMonth}
          baseSalary={baseSalary}
          extraAllowance={extraAllowance}
          extraLecturesCount={extraLecturesCount}
          extraLectureRate={extraLectureRate}
          leavesTaken={leavesTaken}
          leaveDeduction={leaveDeduction}
          lateMinutes={lateMinutes}
          lateDeduction={lateDeduction}
          advanceDeduction={advanceDeduction}
          netSalary={netSalary}
          totalRemainingAdvance={totalRemainingAdvance}
          totalLecturesCount={totalLecturesCount}
          regularLecturesCount={regularLecturesCount}
        />
      )}
    </div>
  );
}
