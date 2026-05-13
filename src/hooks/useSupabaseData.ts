import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useLeadsOperations } from './data/useLeadsOperations';
import { useAdmissionsOperations } from './data/useAdmissionsOperations';
import { useStudentsOperations } from './data/useStudentsOperations';
import { useAccountsOperations } from './data/useAccountsOperations';
import { useStaffOperations } from './data/useStaffOperations';
import { useSettingsOperations } from './data/useSettingsOperations';
import { useAcademicOperations } from './data/useAcademicOperations';
import { 
  Lead, Admission, Student, Staff, Expense, Income, 
  AppSettings, UserPermission, Notification, AcademicRecord, 
  SalaryPayment, FeePayment, Installment, FeeTransaction, AdmissionStatus 
} from '../types';
import { toast } from 'sonner';

export function useSupabaseData(user: any) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<any[]>([]);
  const [staffTimetable, setStaffTimetable] = useState<any[]>([]);
  const [staffAdvances, setStaffAdvances] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [academicRecords, setAcademicRecords] = useState<AcademicRecord[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isFetchingRef = useRef<boolean>(false);
  const isBulkOperatingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [actionedItems, setActionedItems] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('scj_actioned') || '[]'); } catch { return []; }
  });

  const markActioned = useCallback((id: string) => {
    setActionedItems(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem('scj_actioned', JSON.stringify(next));
      return next;
    });
  }, []);

  const isNewRecord = useCallback((id: string, dateStr?: string) => {
    if (actionedItems.includes(id)) return false;
    if (!dateStr) return false;
    const itemDate = new Date(dateStr);
    const launchDate = new Date('2026-04-24T00:00:00Z'); // Feature launch boundary
    return itemDate > launchDate;
  }, [actionedItems]);

  const fetchAllRecords = async (table: string, orderCol: string, countLimit: number = 50000) => {
    let allData: any[] = [];
    let from = 0;
    const step = 500; // Smaller step size to avoid server-side caps
    let hasMore = true;

    while (hasMore && allData.length < countLimit) {
      // Order by orderCol AND id to ensure stable pagination
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(orderCol, { ascending: false })
        .order('id', { ascending: false }) 
        .range(from, from + step - 1);

      if (error) {
        console.error(`Error fetching batch from ${table}:`, error);
        hasMore = false;
      } else if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += step;
        // If we got fewer than requested, we definitely hit the end
        if (data.length < step) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    return allData;
  };

  const fetchData = useCallback(async (silent = false) => {
    // Prevent overlapping fetches or fetches during bulk operations
    if (isFetchingRef.current || isBulkOperatingRef.current || !isSupabaseConfigured) return;
    
    isFetchingRef.current = true;
    if (!silent) setLoading(true);
    try {
      // Use parallel fetch for simple items, but paginate large ones
      const [
        leadsData,
        admissionsData,
        studentsData,
        expensesData,
        incomeData,
        staffResult,
        staffAttendanceResult,
        staffTimetableResult,
        staffAdvancesResult,
        settingsResult,
        permissionsResult,
        notificationsResult,
        academicRecordsResult,
        salaryPaymentsResult,
        studentAttendanceResult
      ] = await Promise.all([
        fetchAllRecords('leads', 'date_added'),
        fetchAllRecords('admissions', 'created_at'),
        fetchAllRecords('students', 'created_at'),
        fetchAllRecords('expenses', 'date'),
        fetchAllRecords('income', 'date'),
        supabase.from('staff').select('*').order('created_at', { ascending: false }).limit(1000),
        supabase.from('staff_attendance').select('*').order('date', { ascending: false }).limit(2000),
        supabase.from('staff_timetable').select('*').limit(1000),
        supabase.from('staff_advances').select('*').order('date_issued', { ascending: false }).limit(500),
        supabase.from('settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('permissions').select('*'),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(1000),
        fetchAllRecords('academic_records', 'date'),
        fetchAllRecords('salary_payments', 'date'),
        fetchAllRecords('student_attendance', 'date')
      ]);

      const { data: staffData } = staffResult;
      const { data: staffAttendanceData } = staffAttendanceResult;
      const { data: staffTimetableData } = staffTimetableResult;
      const { data: staffAdvancesData } = staffAdvancesResult;
      const { data: settingsData } = settingsResult;
      const { data: permissionsData } = permissionsResult;
      const { data: notificationsData } = notificationsResult;
      const academicRecordsData = academicRecordsResult || [];
      const salaryPaymentsData  = salaryPaymentsResult || [];
      const studentAttendanceData = studentAttendanceResult || [];

      const defaultSession = settingsData?.academic_session || '2026-28';

      if (leadsData) setLeads(leadsData.map(l => ({ 
        ...l, 
        studentName: l.student_name,
        fatherName: l.father_name,
        finalizedFee: l.package,
        finalizedBy: l.finalized_by,
        previousSchool: l.previous_school,
        fatherPhone: l.father_phone,
        areaVillage: l.area_village,
        dateAdded: l.date_added,
        currentClass: l.current_class,
        isConverted: l.is_converted,
        session: l.session || defaultSession,
        subjects: l.subjects || [] 
      })));
      if (admissionsData) setAdmissions(admissionsData.map(a => ({
        ...a,
        fullName: a.full_name,
        fatherName: a.father_name,
        previousMarks: a.previous_marks,
        previousInstitute: a.previous_institute,
        collegeNo: a.college_no,
        bayFormNo: a.bay_form_no,
        admissionFee: a.admission_fee,
        miscFunds: a.misc_funds,
        totalFeeFinalized: a.total_fee_finalized,
        totalPackage: a.total_package,
        feeReceived: a.fee_received,
        paymentPlan: a.payment_plan,
        contactNumber: a.contact_number,
        fatherContact: a.father_contact,
        secondaryContact: a.secondary_contact,
        email: a.email,
        bloodGroup: a.blood_group,
        isAdmitted: a.is_admitted,
        session: a.session || defaultSession,
        sessionStartDate: a.session_start_date,
        sessionEndDate: a.session_end_date,
        academicPart: a.academic_part,
        programType: a.program_type || 'Yearly',
        currentSemester: a.current_semester,
        studentId: a.student_id,
        photo: a.photo_url || a.photo, // Mapping photo_url from DB to photo in app
        feeHistory: a.fee_history || [],
        feeLedger: a.fee_ledger || null,
      })));
      if (studentsData) {
        const mappedStudents = studentsData.map(s => ({
          ...s,
          fullName: s.full_name,
          fatherName: s.father_name,
          collegeNo: s.college_no,
          bayFormNo: s.bay_form_no,
          previousClass: s.previous_class,
          boardRollNo: s.board_roll_no,
          previousMarks: s.previous_marks,
          email: s.email,
          bloodGroup: s.blood_group,
          admissionFee: s.admission_fee,
          miscFunds: s.misc_funds,
          totalFeeFinalized: s.total_fee_finalized,
          totalPackage: s.total_package,
          feeReceived: s.fee_received,
          totalInstallments: s.total_installments,
          monthlyFee: s.monthly_fee,
          admissionId: s.admission_id,
          session: s.session || defaultSession,
          sessionStartDate: s.session_start_date,
          sessionEndDate: s.session_end_date,
          academicPart: s.academic_part,
          programType: s.program_type || 'Yearly',
          currentSemester: s.current_semester,
          feeLedger: s.fee_ledger || { totalPackage: 0, totalReceived: 0, remainingBalance: 0, installments: [], transactions: [] },
          feeHistory: s.fee_history || []
        }));
        setStudents(mappedStudents);
        // Run promotion check
        autoPromoteStudents(mappedStudents);
      }
      if (staffData) setStaff(staffData.map(st => ({
        ...st,
        fullName: st.full_name,
        fatherName: st.father_name,
        joinDate: st.join_date,
        baseSalary: st.base_salary,
        salary: st.salary,
        photo: st.photo,
        dob: st.dob,
        cnic: st.cnic,
        qualification: st.qualification,
        specialization: st.specialization,
        subjects: st.subjects
      })));
      if (staffAttendanceData) setStaffAttendance(staffAttendanceData.map(a => ({
        ...a,
        staffId: a.staff_id,
        checkIn: a.check_in,
        checkOut: a.check_out
      })));
      if (staffTimetableData) setStaffTimetable(staffTimetableData.map(t => ({
        ...t,
        staffId: t.staff_id,
        startTime: t.start_time,
        endTime: t.end_time,
        classRoom: t.class_room
      })));
      if (studentAttendanceData) setStudentAttendance(studentAttendanceData.map(a => ({
        ...a,
        studentId: a.student_id,
      })));
      if (staffAdvancesData) setStaffAdvances(staffAdvancesData.map(a => ({
        ...a,
        staffId: a.staff_id,
        dateIssued: a.date_issued,
        deductionPerMonth: a.deduction_per_month,
        remainingBalance: a.remaining_balance
      })));
      if (expensesData) setExpenses(expensesData.map(e => ({
        ...e,
        session: e.session || defaultSession
      })));
      if (incomeData) setIncomes(incomeData.map(i => ({
        ...i,
        studentId: i.student_id,
        studentName: i.student_name,
        feeType: i.fee_type,
        paymentMethod: i.payment_method,
        recordedBy: i.recorded_by,
        session: i.session || defaultSession
      })));
      if (settingsData) setSettings({
        id: settingsData.id,
        collegeName: settingsData.college_name,
        campusName: settingsData.campus_name,
        logo: settingsData.logo_url || settingsData.logo || settingsData.config?.logo,
        address: settingsData.address,
        contactNumber: settingsData.contact_number,
        email: settingsData.email,
        website: settingsData.website,
        principalName: settingsData.principal_name,
        themeColor: settingsData.theme_color,
        currencySymbol: settingsData.currency_symbol,
        academicSession: settingsData.academic_session,
        sidebarColor: settingsData.sidebar_color || settingsData.config?.sidebarColor,
        sidebarTextColor: settingsData.sidebar_text_color || settingsData.config?.sidebarTextColor,
        headerColor: settingsData.header_color || settingsData.config?.headerColor,
        headerTextColor: settingsData.header_text_color || settingsData.config?.headerTextColor,
        fontFamily: settingsData.font_family || settingsData.config?.fontFamily,
        cardRadius: settingsData.card_radius || settingsData.config?.cardRadius,
        glassEffect: settingsData.glass_effect ?? settingsData.config?.glassEffect,
        enabledModules: settingsData.enabled_modules || [],
        autoLeadConversion: settingsData.auto_lead_conversion ?? settingsData.config?.autoLeadConversion,
        defaulterAlertThreshold: settingsData.defaulter_alert_threshold ?? settingsData.config?.defaulterAlertThreshold,
        allowQuickNav: settingsData.allow_quick_nav ?? settingsData.config?.allowQuickNav,
        enableHighlighting: settingsData.enable_highlighting ?? settingsData.config?.enableHighlighting,
        admissionSlipCustomText: settingsData.admission_slip_custom_text ?? settingsData.config?.admissionSlipCustomText,
        feeReceiptCustomText: settingsData.fee_receipt_custom_text ?? settingsData.config?.feeReceiptCustomText,
        predefinedSections: settingsData.config?.predefinedSections || []
      } as any);
      if (permissionsData) setPermissions(permissionsData.map(p => ({
        ...p,
        displayName: p.display_name,
        isAdmin: p.is_admin,
        lastActive: p.last_active
      })));
      if (notificationsData) setNotifications(notificationsData.map(n => ({
        ...n,
        actorName: n.actor_name,
        isRead: n.is_read,
        timestamp: n.created_at
      })));
      if (academicRecordsData) setAcademicRecords(academicRecordsData.map(r => ({
        ...r,
        studentId: r.student_id,
        studentName: r.student_name,
        class: r.class,
        section: r.section,
        testName: r.test_name,
        testType: r.test_type,
        totalMarks: r.total_marks,
        obtainedMarks: r.obtained_marks,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        session: r.session || defaultSession
      })));
      if (salaryPaymentsData) setSalaryPayments(salaryPaymentsData.map(p => ({
        ...p,
        staffId: p.staff_id,
        staffName: p.staff_name,
        paymentMethod: p.payment_method,
        receiptNumber: p.receipt_number
      })));
    } catch (error) {
      console.error('Error fetching Supabase data:', error);
    } finally {
      if (!silent) setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const debouncedFetchData = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchData(true);
    }, 1500); // 1.5 second debounce to bundle realtime events during bulk operations
  }, [fetchData]);

  const userId = user?.id;

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setLoading(false);
      return;
    }

    fetchData();

    const leadsSubscription = supabase.channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => debouncedFetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(leadsSubscription);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [userId, fetchData, debouncedFetchData]);

  const logActivity = async (title: string, message: string, type: 'info' | 'alert' | 'success' | 'warning' = 'info') => {
    if (!user) return;
    try {
      await supabase.from('notifications').insert({
        title,
        message,
        type,
        actor_name: user.displayName || user.email,
        is_read: false
      });
    } catch (e) {
      console.error('Failed to log activity', e);
    }
  };

  async function autoPromoteStudents(studentsList: Student[]) {
    const today = new Date();
    const promoteCandidates = studentsList.filter(s => {
      if (!s.sessionEndDate || s.academicPart !== 'Part-1') return false;
      const endDate = new Date(s.sessionEndDate);
      return today > endDate;
    });

    if (promoteCandidates.length === 0) return;

    for (const student of promoteCandidates) {
      try {
        const nextEndDate = new Date(student.sessionEndDate!);
        nextEndDate.setFullYear(nextEndDate.getFullYear() + 1);
        
        const nextStartDate = new Date(student.sessionEndDate!);
        nextStartDate.setDate(nextStartDate.getDate() + 1);

        const { error } = await supabase.from('students').update({
          academic_part: 'Part-2',
          session_start_date: nextStartDate.toISOString().split('T')[0],
          session_end_date: nextEndDate.toISOString().split('T')[0]
        }).eq('id', student.id);

        if (error) throw error;
        
        logActivity("Promotion", `Student ${student.fullName} auto-promoted to Part-2`, 'success');
      } catch (e) {
        console.error(`Promotion failed for student ${student.id}:`, e);
      }
    }
    // Refresh if any were promoted
    if (promoteCandidates.length > 0) fetchData(true);
  };

  const generateStudentId = (program?: string) => {
    const year = new Date().getFullYear().toString().slice(-2);
    let prefix = 'SGC';
    
    if (program) {
      const p = program.toLowerCase();
      if (p.includes('dit')) prefix = 'DIT';
      else if (p.includes('uk') || p.includes('level 3')) prefix = 'UKL';
      else if (p.includes('bs')) prefix = 'BSP';
      else prefix = 'SGC';
    }

    const random = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${year}-${random}`;
  };

  const ctx = { user, generateStudentId, leads, setLeads, admissions, setAdmissions, students, setStudents, staff, setStaff, staffAttendance, setStaffAttendance, staffTimetable, setStaffTimetable, staffAdvances, setStaffAdvances, expenses, setExpenses, incomes, setIncomes, academicRecords, setAcademicRecords, salaryPayments, setSalaryPayments, studentAttendance, setStudentAttendance, settings, setSettings, permissions, setPermissions, notifications, setNotifications, isBulkOperatingRef, logActivity, fetchData };
  const leadsOps = useLeadsOperations(ctx);
  const admissionsOps = useAdmissionsOperations(ctx);
  const studentsOps = useStudentsOperations(ctx);
  const accountsOps = useAccountsOperations(ctx);
  const staffOps = useStaffOperations(ctx);
  const settingsOps = useSettingsOperations(ctx);
  const academicOps = useAcademicOperations(ctx);
  return {
    ...leadsOps,
    ...admissionsOps,
    ...studentsOps,
    ...accountsOps,
    ...staffOps,
    ...settingsOps,
    ...academicOps,
    leads,
    admissions,
    students,
    staff,
    staffAttendance,
    studentAttendance,
    staffTimetable,
    staffAdvances,
    expenses,
    incomes,
    settings,
    permissions,
    notifications,
    loading,
    actionedItems,
    markActioned,
    isNewRecord,
    logActivity,
    ...admissionsOps,
    // addLead,
    // updateLead,
    // deleteLead,
    // addAdmission,
    // addIncome,
    // updateSettings,
    academicRecords,
    salaryPayments,
    // addStudent,
    // deleteStudent,
    // recordFeePayment,
    generateStudentId,
  };
}
