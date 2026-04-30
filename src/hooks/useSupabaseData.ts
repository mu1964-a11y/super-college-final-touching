import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
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
    if (isFetchingRef.current || isBulkOperatingRef.current) return;
    
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
        settingsResult,
        permissionsResult,
        notificationsResult
      ] = await Promise.all([
        fetchAllRecords('leads', 'date_added'),
        fetchAllRecords('admissions', 'created_at'),
        fetchAllRecords('students', 'created_at'),
        fetchAllRecords('expenses', 'date'),
        fetchAllRecords('income', 'date'),
        supabase.from('staff').select('*').order('created_at', { ascending: false }).limit(1000),
        supabase.from('settings').select('*').limit(1).maybeSingle(),
        supabase.from('permissions').select('*'),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)
      ]);

      const { data: staffData } = staffResult;
      const { data: settingsData } = settingsResult;
      const { data: permissionsData } = permissionsResult;
      const { data: notificationsData } = notificationsResult;

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
        session: l.session,
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
        isAdmitted: a.is_admitted,
        session: a.session,
        sessionStartDate: a.session_start_date,
        sessionEndDate: a.session_end_date,
        academicPart: a.academic_part,
        programType: a.program_type || 'Yearly',
        currentSemester: a.current_semester,
        studentId: a.student_id,
        photo: a.photo_url || a.photo, // Mapping photo_url from DB to photo in app
        feeHistory: a.fee_history || []
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
          admissionFee: s.admission_fee,
          miscFunds: s.misc_funds,
          totalFeeFinalized: s.total_fee_finalized,
          totalPackage: s.total_package,
          feeReceived: s.fee_received,
          totalInstallments: s.total_installments,
          monthlyFee: s.monthly_fee,
          admissionId: s.admission_id,
          session: s.session,
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
        baseSalary: st.base_salary
      })));
      if (expensesData) setExpenses(expensesData);
      if (incomeData) setIncomes(incomeData.map(i => ({
        ...i,
        studentId: i.student_id,
        studentName: i.student_name,
        feeType: i.fee_type,
        paymentMethod: i.payment_method,
        recordedBy: i.recorded_by
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
        feeReceiptCustomText: settingsData.fee_receipt_custom_text ?? settingsData.config?.feeReceiptCustomText
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
    if (!userId) {
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

  const addLead = async (lead: Omit<Lead, 'id'>) => {
    try {
      const { error } = await supabase.from('leads').insert({
        student_name: lead.studentName,
        father_name: lead.fatherName,
        package: lead.finalizedFee,
        finalized_by: lead.finalizedBy,
        cnic: lead.cnic,
        previous_school: lead.previousSchool,
        area_village: lead.areaVillage,
        city: lead.city,
        father_phone: lead.fatherPhone,
        grade: lead.grade,
        current_class: lead.currentClass,
        subjects: lead.subjects || [],
        session: (lead as any).session,
        is_converted: false
      });
      if (error) throw error;
      await fetchData(true); // Refresh data silently
      logActivity("Lead Added", `New lead ${lead.studentName} added`, 'info');
      toast.success("Lead added successfully");
    } catch (e: any) {
      console.error("Supabase Add Lead Error:", e);
      const details = e.message || "Unknown error";
      toast.error(`Add Lead Failed: ${details}. Check Console (F12) for more.`);
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const { error } = await supabase.from('leads').update({
        student_name: updates.studentName,
        father_name: updates.fatherName,
        package: updates.finalizedFee,
        finalized_by: updates.finalizedBy,
        cnic: updates.cnic,
        previous_school: updates.previousSchool,
        area_village: updates.areaVillage,
        city: updates.city,
        father_phone: updates.fatherPhone,
        grade: updates.grade,
        current_class: updates.currentClass,
        subjects: updates.subjects,
        is_converted: updates.isConverted
      }).eq('id', id);
      if (error) throw error;
      await fetchData(true); // Refresh data silently
      toast.success("Lead updated");
    } catch (e) {
      toast.error("Failed to update lead");
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const { error, count } = await supabase.from('leads').delete({ count: 'exact' }).eq('id', id);
      if (error) throw error;
      
      if (count === 0) {
        toast.error("Delete failed: Record not found or permission denied (RLS).");
        return;
      }

      await fetchData(true); // Refresh data silently
      logActivity("Lead Deleted", `Lead record removed`, 'alert');
      toast.success("Lead record deleted successfully");
    } catch (e: any) {
      console.error("Delete Lead Error:", e);
      toast.error(`Error: ${e.message || "Failed to delete lead"}`);
    }
  };

  const addAdmission = async (admission: Omit<Admission, 'id'>) => {
    try {
      const today = new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      
      let initialHistory: FeePayment[] = [];
      let initialLedger: any = null;

      if (admission.feeReceived && admission.feeReceived > 0) {
        const payment: FeePayment = {
          id: `pay-${Date.now()}`,
          month: monthNames[today.getMonth()],
          year: today.getFullYear(),
          amountDue: admission.totalPackage || 0,
          amountPaid: admission.feeReceived,
          status: 'Paid',
          datePaid: today.toISOString(),
          receiptId: `REC-${Date.now().toString().slice(-6)}`,
          feeType: 'Admission Fee / Initial Payment'
        };

        initialHistory = [payment];

        const transaction: FeeTransaction = {
          id: `tx-${Date.now()}`,
          date: today.toISOString(),
          amount: admission.feeReceived,
          description: `Initial Admission Fee Payment`,
          paymentMethod: 'Cash',
          receiptId: payment.receiptId || '',
          recordedBy: user?.email || 'System'
        };

        initialLedger = {
          totalPackage: admission.totalPackage || 0,
          totalReceived: admission.feeReceived,
          remainingBalance: Math.max(0, (admission.totalPackage || 0) - admission.feeReceived),
          installments: [],
          transactions: [transaction]
        };

        // Also add to income table
        await supabase.from('income').insert({
          student_name: admission.fullName, 
          fee_type: payment.feeType,
          amount: payment.amountPaid,
          month: payment.month,
          year: payment.year,
          date: payment.datePaid,
          status: payment.status,
          recorded_by: payment.collectedBy || user?.email || 'System'
        });
      }

      const { error } = await supabase.from('admissions').insert({
        full_name: admission.fullName,
        father_name: admission.fatherName,
        previous_marks: admission.previousMarks || 0,
        previous_institute: admission.previousInstitute,
        college_no: admission.collegeNo,
        bay_form_no: admission.bayFormNo,
        dob: admission.dob || null, // Handle empty date
        previous_class: admission.previousClass,
        board_roll_no: admission.boardRollNo,
        category: admission.category,
        group: admission.group,
        section: admission.section,
        subjects: admission.subjects,
        address: admission.address,
        admission_fee: admission.admissionFee || 0,
        misc_funds: admission.miscFunds || 0,
        total_fee_finalized: admission.totalFeeFinalized || 0,
        total_package: admission.totalPackage || 0,
        fee_received: admission.feeReceived || 0,
        payment_plan: admission.paymentPlan,
        contact_number: admission.contactNumber,
        father_contact: admission.fatherContact,
        secondary_contact: admission.secondaryContact,
        reference: admission.reference,
        gender: admission.gender,
        photo_url: admission.photo,
        student_id: admission.studentId || (admission.feeReceived > 0 ? generateStudentId(admission.group) : null),
        status: admission.status,
        is_admitted: admission.isAdmitted,
        session: admission.session || settings?.academicSession,
        session_start_date: admission.sessionStartDate || null,
        session_end_date: admission.sessionEndDate || null,
        academic_part: admission.academicPart || 'Part-1'
      });
      if (error) throw error;
      await fetchData(true);
      logActivity("Admission Recorded", `${admission.fullName} application added`, 'success');
      toast.success("Admission added successfully");
    } catch (e: any) {
      console.error("Add Admission Error:", e);
      toast.error(`Failed to add admission: ${e.message || "Unknown error"}`);
    }
  };

  const addIncome = async (inc: Omit<Income, 'id'>) => {
    try {
      const { error } = await supabase.from('income').insert({
        student_id: inc.studentId,
        student_name: inc.studentName,
        fee_type: inc.feeType,
        amount: inc.amount,
        month: inc.month,
        year: inc.year,
        date: inc.date,
        status: inc.status,
        payment_method: inc.paymentMethod,
        recorded_by: user?.email
      });
      if (error) throw error;
      toast.success("Payment recorded");
    } catch (e) {
      toast.error("Failed to record income");
    }
  };

  const updateSettings = async (newSettings: AppSettings) => {
    try {
      const payload = {
        college_name: newSettings.collegeName,
        campus_name: newSettings.campusName,
        logo_url: newSettings.logo,
        address: newSettings.address,
        contact_number: newSettings.contactNumber,
        email: newSettings.email,
        website: newSettings.website,
        principal_name: newSettings.principalName,
        theme_color: newSettings.themeColor,
        currency_symbol: newSettings.currencySymbol,
        academic_session: newSettings.academicSession,
        enabled_modules: newSettings.enabledModules,
        config: {
          sidebarColor: newSettings.sidebarColor,
          sidebarTextColor: newSettings.sidebarTextColor,
          headerColor: newSettings.headerColor,
          headerTextColor: newSettings.headerTextColor,
          fontFamily: newSettings.fontFamily,
          cardRadius: newSettings.cardRadius,
          glassEffect: newSettings.glassEffect,
          autoLeadConversion: newSettings.autoLeadConversion,
          defaulterAlertThreshold: newSettings.defaulterAlertThreshold,
          allowQuickNav: newSettings.allowQuickNav,
          enableHighlighting: newSettings.enableHighlighting,
          admissionSlipCustomText: newSettings.admissionSlipCustomText,
          feeReceiptCustomText: newSettings.feeReceiptCustomText,
          logo: newSettings.logo
        }
      };

      if ((settings as any)?.id) {
        const { error } = await supabase.from('settings').update(payload).eq('id', (settings as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('settings').insert([payload]);
        if (error) throw error;
      }
      
      await fetchData(true);
      toast.success("Settings updated");
    } catch (e: any) {
      console.error("Update Settings Error:", e);
      toast.error("Failed to update settings" + (e?.message ? `: ${e.message}` : ''));
    }
  };

  const addStudent = async (student: Omit<Student, 'id'>) => {
    try {
      const id = (student as any).id || generateStudentId(student.group);
      const { error } = await supabase.from('students').insert({
        id,
        admission_id: student.admissionId,
        full_name: student.fullName,
        father_name: student.fatherName,
        category: student.category,
        group: student.group,
        section: student.section,
        contact: student.contact,
        address: student.address,
        total_package: student.totalPackage,
        monthly_fee: student.monthlyFee,
        academic_part: student.academicPart || 'Part-1'
      });
      if (error) throw error;
      logActivity("Student Added", `New student ${student.fullName} initialized`, 'success');
      toast.success("Student added");
    } catch (e) {
      toast.error("Failed to add student");
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      toast.success("Student removed");
    } catch (e) {
      toast.error("Failed to delete student");
    }
  };

  const recordFeePayment = async (studentId: string, payment: FeePayment) => {
    try {
      const student = students.find(s => s.id === studentId || s.admissionId === studentId);
      const admission = admissions.find(a => a.id === studentId || a.studentId === studentId);

      if (!student && !admission) throw new Error("Student not found in management or admissions");

      const targetId = student?.id || admission?.id;
      const targetName = student?.fullName || admission?.fullName;

      // 1. Record in Income table
      const { error: incomeError } = await supabase.from('income').insert({
        student_id: targetId,
        student_name: targetName, 
        fee_type: payment.feeType || 'Monthly Installment',
        amount: payment.amountPaid,
        month: payment.month,
        year: payment.year,
        date: payment.datePaid,
        status: payment.status,
        recorded_by: payment.collectedBy || user?.email || 'System'
      });
      if (incomeError) throw incomeError;

      if (student) {
        // 2. Update Student Record Metadata
        const newFeeReceived = (student.feeReceived || 0) + payment.amountPaid;
        const history = student.feeHistory || [];
        const updatedHistory = [...history, payment];

        // Calculate Proportional Distribution
        const currentLedger = student.feeLedger || {
          totalPackage: student.totalPackage || 0,
          totalReceived: student.feeReceived || 0,
          remainingBalance: (student.totalPackage || 0) - (student.feeReceived || 0),
          installments: [],
          transactions: []
        };

        const totalPkg = student.totalPackage || 0;
        const remainingBalance = Math.max(0, totalPkg - newFeeReceived);
        const totalInst = student.totalInstallments || 12;
        const remainingInst = Math.max(0, totalInst - updatedHistory.length);
        
        const newMonthlyFee = remainingInst > 0 ? Math.ceil(remainingBalance / remainingInst) : 0;

        const transaction: FeeTransaction = {
          id: `tx-${Date.now()}`,
          date: payment.datePaid,
          amount: payment.amountPaid,
          description: payment.feeType ? `${payment.feeType} (${payment.month} ${payment.year})` : `Installment Payment - ${payment.month} ${payment.year}`,
          paymentMethod: 'Cash',
          receiptId: `REC-${Date.now().toString().slice(-6)}`,
          recordedBy: payment.collectedBy || user?.email || 'System'
        };

        const updatedLedger = {
          ...currentLedger,
          totalReceived: newFeeReceived,
          remainingBalance: remainingBalance,
          transactions: [transaction, ...(currentLedger.transactions || [])]
        };

        const { error: studentUpdateError } = await supabase
          .from('students')
          .update({
            fee_received: newFeeReceived,
            fee_history: updatedHistory,
            fee_ledger: updatedLedger,
            monthly_fee: newMonthlyFee,
            total_package: student.totalPackage // Ensure sync
          })
          .eq('id', student.id);

        if (studentUpdateError) throw studentUpdateError;

        // 3. Keep Admission record in sync if linked
        if (student.admissionId) {
          const linkedAdmission = admissions.find(a => a.id === student.admissionId);
          let admissionStatus: AdmissionStatus = linkedAdmission?.status || 'Not Paid';
          const totalPkgAdmission = linkedAdmission?.totalPackage || student.totalPackage || 0;
          
          if (newFeeReceived >= totalPkgAdmission && totalPkgAdmission > 0) admissionStatus = 'Full Paid';
          else if (newFeeReceived > 0) admissionStatus = 'Partial Paid';

          await supabase.from('admissions').update({ 
            fee_received: newFeeReceived,
            fee_history: updatedHistory,
            fee_ledger: updatedLedger,
            status: admissionStatus,
            total_package: totalPkgAdmission // Ensure sync
          }).eq('id', student.admissionId);
        }
      } else if (admission) {
        // Update Admission only
        const newFeeReceived = (admission.feeReceived || 0) + payment.amountPaid;
        const history = admission.feeHistory || [];
        const updatedHistory = [...history, payment];

        let admissionStatus: AdmissionStatus = admission.status || 'Not Paid';
        const totalPkg = admission.totalPackage || 0;
        if (newFeeReceived >= totalPkg && totalPkg > 0) admissionStatus = 'Full Paid';
        else if (newFeeReceived > 0) admissionStatus = 'Partial Paid';

        // Calculate a basic ledger for admission if it doesn't exist
        const currentLedger = admission.feeLedger || {
          totalPackage: totalPkg,
          totalReceived: admission.feeReceived || 0,
          remainingBalance: Math.max(0, totalPkg - (admission.feeReceived || 0)),
          installments: [],
          transactions: []
        };

        const updatedLedger = {
          ...currentLedger,
          totalReceived: newFeeReceived,
          remainingBalance: Math.max(0, totalPkg - newFeeReceived),
          transactions: [{
            id: `tx-adm-${Date.now()}`,
            date: payment.datePaid,
            amount: payment.amountPaid,
            description: payment.feeType || 'Partial Fee Payment',
            recordedBy: user?.email || 'System'
          }, ...(currentLedger.transactions || [])]
        };

        const { error: admissionUpdateError } = await supabase
          .from('admissions')
          .update({
            fee_received: newFeeReceived,
            status: admissionStatus,
            fee_history: updatedHistory,
            fee_ledger: updatedLedger
          })
          .eq('id', admission.id);

        if (admissionUpdateError) throw admissionUpdateError;
      }

      await fetchData(true);
      toast.success("Fee payment recorded and ledger updated!");
    } catch (e: any) {
      console.error("Record Fee Error:", e);
      toast.error(`Failed to record fee: ${e.message}`);
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

  return {
    leads,
    admissions,
    students,
    staff,
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
    addLead,
    updateLead,
    deleteLead,
    addAdmission,
    addIncome,
    updateSettings,
    academicRecords,
    salaryPayments,
    addStudent,
    deleteStudent,
    recordFeePayment,
    generateStudentId,
    promoteSemester: async (studentId: string, nextSemesterFee: number) => {
      try {
        const student = students.find(s => s.id === studentId);
        if (!student) throw new Error("Student not found");

        const currentSemester = student.currentSemester || 1;
        const totalSemesters = student.totalSemesters || 4;

        if (currentSemester >= totalSemesters) {
          toast.warning("Student is already in the final semester.");
          return;
        }

        const nextSemester = currentSemester + 1;
        const newTotalPackage = (student.totalPackage || 0) + nextSemesterFee;
        const arrears = (student.totalPackage || 0) - (student.feeReceived || 0);

        const currentLedger = student.feeLedger || { totalPackage: 0, totalReceived: 0, remainingBalance: 0, installments: [], transactions: [] };
        
        // Add Arrears Balance Transaction
        const arrearsTx = {
          id: `bf-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amount: 0,
          description: `Balance B/F from Semester ${currentSemester}: Rs. ${arrears}`,
          paymentMethod: 'Adjustment',
          receiptId: 'SYSTEM',
          recordedBy: 'Auto'
        };

        const updatedLedger = {
          ...currentLedger,
          totalPackage: newTotalPackage,
          remainingBalance: newTotalPackage - (student.feeReceived || 0),
          transactions: [arrearsTx, ...(currentLedger.transactions || [])]
        };

        const { error } = await supabase.from('students').update({
          total_package: newTotalPackage,
          fee_ledger: updatedLedger
        }).eq('id', student.id);

        if (error) throw error;

        // Sync with admissions
        if (student.admissionId) {
          const linkedAdmission = admissions.find(a => a.id === student.admissionId);
          let admissionStatus: AdmissionStatus = linkedAdmission?.status || 'Not Paid';
          const totalReceived = student.feeReceived || 0;
          
          if (totalReceived >= newTotalPackage && newTotalPackage > 0) admissionStatus = 'Full Paid';
          else if (totalReceived > 0) admissionStatus = 'Partial Paid';
          else admissionStatus = 'Not Paid';

          await supabase.from('admissions').update({ 
            total_package: newTotalPackage,
            status: admissionStatus
          }).eq('id', student.admissionId);
        }

        await fetchData(true);
        toast.success(`Promoted to Semester ${nextSemester}. Arrears of Rs. ${arrears} carried forward.`);
        logActivity("Promotion", `${student.fullName} promoted to Semester ${nextSemester}`, 'success');
      } catch (e: any) {
        toast.error(`Promotion failed: ${e.message}`);
      }
    },
    bulkDeleteLeads: async (ids: string[]) => {
      if (!ids.length) return;
      
      isBulkOperatingRef.current = true;
      // Optimistic update for real-time feel
      setLeads(prev => prev.filter(l => !ids.includes(l.id)));
      const toastId = toast.loading(`Deleting ${ids.length} records...`);

      try {
        const batchSize = 100; // Safer batch size
        let totalDeleted = 0;
        
        for (let i = 0; i < ids.length; i += batchSize) {
          const chunk = ids.slice(i, i + batchSize);
          const { error, count } = await supabase.from('leads').delete({ count: 'exact' }).in('id', chunk);
          
          if (error) {
            if (error.code === '23503') {
              throw new Error("Some leads are linked to other records (Students/Admissions) and cannot be deleted. Please remove linked records first.");
            }
            throw error;
          }
          
          totalDeleted += (count || 0);
          
          // Small delay to prevent network congestion
          if (i + batchSize < ids.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        toast.success(`${totalDeleted} leads deleted successfully`, { id: toastId });
        logActivity("Bulk Delete", `Removed ${totalDeleted} lead records`, 'alert');
      } catch (e: any) {
        console.error("Bulk Delete Leads Error:", e);
        toast.error(`Bulk Delete Failed: ${e.message}`, { id: toastId });
      } finally {
        isBulkOperatingRef.current = false;
        fetchData(true); 
      }
    },
    importLeads: async (newLeads: Lead[]) => {
      try {
        // Map frontend fields back to Supabase snake_case columns
        const leadsData = newLeads.map(l => ({
          student_name: l.studentName,
          father_name: l.fatherName,
          package: l.finalizedFee,
          finalized_by: l.finalizedBy,
          cnic: l.cnic,
          previous_school: l.previousSchool,
          area_village: l.areaVillage,
          city: l.city,
          father_phone: l.fatherPhone,
          grade: l.grade,
          current_class: l.currentClass,
          subjects: l.subjects || [],
          session: (l as any).session || settings?.academicSession || '2026-28',
          is_converted: false
        }));

        const { error } = await supabase.from('leads').insert(leadsData);
        if (error) throw error;
        await fetchData(true);
        logActivity("Bulk Import", `Imported ${newLeads.length} leads via Excel`, 'success');
      } catch (e: any) {
        console.error("Bulk Import Error:", e);
        toast.error(`Import Failed: ${e.message}`);
        throw e;
      }
    },
    convertLeadsToApplicants: async (ids: string[], targetProgram?: string) => {
      if (!ids.length) return;
      const toastId = toast.loading(`Converting ${ids.length} leads...`);
      try {
        const leadsToConvert = leads.filter(l => ids.includes(l.id));
        const admissionsData = leadsToConvert.map(l => {
          let expectedGroup = 'Pending';
          if (targetProgram === 'dit') expectedGroup = 'DIT';
          else if (targetProgram === 'ukl3') expectedGroup = 'UK Level 3';
          else if (targetProgram === 'bs') expectedGroup = 'BS Program';

          return {
            full_name: l.studentName,
            father_name: l.fatherName,
            contact_number: l.fatherPhone,
            previous_institute: l.previousSchool,
            group: expectedGroup,
            payment_plan: 'Monthly',
            is_admitted: false,
            student_id: generateStudentId(expectedGroup),
            session: l.session || settings?.academicSession || '2026-28'
          };
        });

        // Split into larger chunks for efficiency
        const batchSize = 500;
        for (let i = 0; i < admissionsData.length; i += batchSize) {
          const chunk = admissionsData.slice(i, i + batchSize);
          const { error: admissionError } = await supabase.from('admissions').insert(chunk);
          if (admissionError) throw admissionError;
        }

        for (let i = 0; i < ids.length; i += batchSize) {
          const chunk = ids.slice(i, i + batchSize);
          const { error: leadUpdateError } = await supabase.from('leads').update({ is_converted: true }).in('id', chunk);
          if (leadUpdateError) throw leadUpdateError;
        }

        // Optimistic update
        setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, isConverted: true } : l));
        
        await fetchData(true);
        logActivity("Bulk Conversion", `Converted ${ids.length} leads to applicants`, 'success');
        toast.success(`Successfully converted ${ids.length} leads!`, { id: toastId });
      } catch (e: any) {
        console.error("Bulk Conversion Error:", e);
        toast.error(`Conversion failed: ${e.message}`, { id: toastId });
        fetchData(true);
      }
    },
    updateAdmission: async (id: string, updates: Partial<Admission>) => {
      try {
        const existingAdmission = admissions.find(a => a.id === id);
        let updatedStudentId = updates.studentId !== undefined ? updates.studentId : existingAdmission?.studentId;
        
        // Auto-allot student ID if fee is received, and ID hasn't been allotted yet
        if (!updatedStudentId && updates.feeReceived && updates.feeReceived > 0) {
            updatedStudentId = generateStudentId(updates.group || existingAdmission?.group);
            
            if (updates.status === 'Prospective' || updates.status === 'Not Paid') {
                updates.status = 'Admitted/Confirmed';
            }
        }

        const { error } = await supabase.from('admissions').update({
          full_name: updates.fullName,
          father_name: updates.fatherName,
          college_no: updates.collegeNo,
          bay_form_no: updates.bayFormNo,
          dob: updates.dob || null, // Handle empty date
          previous_class: updates.previousClass,
          board_roll_no: updates.boardRollNo,
          previous_marks: updates.previousMarks || 0,
          previous_institute: updates.previousInstitute,
          subjects: updates.subjects,
          address: updates.address,
          admission_fee: updates.admissionFee || 0,
          misc_funds: updates.miscFunds || 0,
          total_fee_finalized: updates.totalFeeFinalized || 0,
          total_package: updates.totalPackage || 0,
          fee_received: updates.feeReceived || 0,
          payment_plan: updates.paymentPlan,
          contact_number: updates.contactNumber,
          father_contact: updates.fatherContact,
          secondary_contact: updates.secondaryContact,
          reference: updates.reference,
          gender: updates.gender,
          category: updates.category,
          group: updates.group,
          section: updates.section,
          photo_url: updates.photo,
          student_id: updatedStudentId,
          status: updates.status,
          is_admitted: updates.isAdmitted,
          session: updates.session,
          session_start_date: updates.sessionStartDate || null,
          session_end_date: updates.sessionEndDate || null,
          academic_part: updates.academicPart
        }).eq('id', id);
        if (error) throw error;
        await fetchData(true);
        toast.success("Admission details updated");
      } catch (e: any) {
        console.error("Update Admission Error:", e);
        toast.error(`Failed to update admission: ${e.message || "Unknown error"}`);
      }
    },
    deleteAdmission: async (id: string) => {
      try {
        const { error, count } = await supabase.from('admissions').delete({ count: 'exact' }).eq('id', id);
        if (error) throw error;
        if (count === 0) {
          toast.error("Admission record not found or delete restricted.");
          return;
        }
        await fetchData(true);
        toast.success("Admission record deleted successfully");
      } catch (e: any) {
        console.error("Delete Admission Error:", e);
        toast.error(`Delete Failed: ${e.message}`);
      }
    },
    bulkDeleteAdmissions: async (ids: string[]) => {
      if (!ids.length) return;
      
      isBulkOperatingRef.current = true;
      // Optimistic update
      setAdmissions(prev => prev.filter(a => !ids.includes(a.id)));
      const toastId = toast.loading(`Deleting ${ids.length} admissions...`);

      try {
        const batchSize = 100;
        let totalDeleted = 0;

        for (let i = 0; i < ids.length; i += batchSize) {
          const chunk = ids.slice(i, i + batchSize);
          const { error, count } = await supabase.from('admissions').delete({ count: 'exact' }).in('id', chunk);
          if (error) {
            if (error.code === '23503') {
              throw new Error("Some admissions are already fully enrolled and converted to students. Please delete the associated student records first.");
            }
            throw error;
          }
          totalDeleted += (count || 0);

          if (i + batchSize < ids.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        logActivity("Bulk Delete", `Removed ${totalDeleted} admission records`, 'alert');
        toast.success(`${totalDeleted} admissions deleted successfully`, { id: toastId });
      } catch (e: any) {
        console.error("Bulk Delete Admissions Error:", e);
        toast.error(`Bulk Delete Failed: ${e.message}`, { id: toastId });
      } finally {
        isBulkOperatingRef.current = false;
        fetchData(true);
      }
    },
    confirmAdmission: async (admissionId: string, _operatorEmail?: string) => {
      try {
        const admission = admissions.find(a => a.id === admissionId);
        if (!admission) throw new Error("Admission not found");
        
        // Ensure there's a finalized fee and at least some payment
        if (!admission.totalPackage || admission.totalPackage <= 0) {
          toast.error("Please finalize the total fee package first!");
          return;
        }

        if (admission.feeReceived <= 0) {
          toast.error("Student must pay the first installment to be fully enrolled!");
          return;
        }

        // Mark as admitted/confirmed
        const studentId = admission.studentId || generateStudentId(admission.group);
        const { error: updateError } = await supabase.from('admissions').update({
          is_admitted: true,
          status: 'Admitted/Confirmed',
          student_id: studentId
        }).eq('id', admissionId);
        if (updateError) throw updateError;

        const remaining = (admission.totalPackage || 0) - (admission.feeReceived || 0);
        const installments = admission.totalInstallments || 12;
        const calculatedMonthlyFee = installments > 0 ? Math.ceil(remaining / installments) : 0;

        const initialFeeLedger = {
          totalPackage: admission.totalPackage,
          totalReceived: admission.feeReceived,
          remainingBalance: remaining,
          installments: [],
          transactions: [
            {
              id: `adm-fee-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              amount: admission.feeReceived,
              paymentMethod: 'Cash',
              receiptId: `ADM-RCP-${Math.floor(Date.now() / 1000).toString().slice(-6)}`,
              description: 'Initial Admission Fee Payment'
            }
          ]
        };

        // Create student record
        const { error: studentError } = await supabase.from('students').insert({
          id: studentId,
          admission_id: admissionId,
          full_name: admission.fullName,
          father_name: admission.fatherName,
          category: admission.category,
          group: admission.group,
          section: admission.section,
          contact: admission.contactNumber,
          address: admission.address,
          total_package: admission.totalPackage,
          fee_received: admission.feeReceived,
          fee_ledger: initialFeeLedger,
          monthly_fee: calculatedMonthlyFee,
          total_installments: installments,
          session: admission.session,
          session_start_date: admission.sessionStartDate,
          session_end_date: admission.sessionEndDate,
          academic_part: admission.academicPart || 'Part-1',
          fee_history: admission.feeHistory || []
        });
        if (studentError) throw studentError;

        await fetchData(true);
        toast.success("Student confirmed and moved to Management!");
      } catch (e) {
        toast.error("Failed to confirm admission");
      }
    },
    updateStudent: async (id: string, updates: Partial<Student>) => {
      try {
        const { error } = await supabase.from('students').update({
          full_name: updates.fullName,
          father_name: updates.fatherName,
          category: updates.category,
          group: updates.group,
          section: updates.section,
          contact: updates.contact,
          address: updates.address,
          total_package: updates.totalPackage,
          fee_received: updates.feeReceived,
          monthly_fee: updates.monthlyFee,
          fee_ledger: updates.feeLedger,
          fee_history: updates.feeHistory,
          academic_part: updates.academicPart,
          session: updates.session
        }).eq('id', id);
        
        if (error) throw error;
        await fetchData(true);
        toast.success("Student details updated");
      } catch (e: any) {
        toast.error(`Failed to update student: ${e.message}`);
      }
    },
    bulkDeleteStudents: async (ids: string[]) => {
      if (!ids.length) return;
      
      isBulkOperatingRef.current = true;
      setStudents(prev => prev.filter(s => !ids.includes(s.id)));
      const toastId = toast.loading(`Deleting ${ids.length} students...`);

      try {
        const batchSize = 100;
        for (let i = 0; i < ids.length; i += batchSize) {
          const chunk = ids.slice(i, i + batchSize);
          const { error } = await supabase.from('students').delete().in('id', chunk);
          if (error) {
            if (error.code === '23503') {
              throw new Error("Some students have linked financial records or attendance that prevent deletion. Please contact support.");
            }
            throw error;
          }

          if (i + batchSize < ids.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        logActivity("Bulk Delete", `Removed ${ids.length} student records`, 'alert');
        toast.success(`${ids.length} students removed`, { id: toastId });
      } catch (e: any) {
        console.error("Bulk Delete Students Error:", e);
        toast.error(`Deletion failed: ${e.message}`, { id: toastId });
      } finally {
        isBulkOperatingRef.current = false;
        fetchData(true);
      }
    },
    recordFeeTransaction: async (studentId: string, transaction: Omit<FeeTransaction, 'id'>) => {
      try {
        const student = students.find(s => s.id === studentId);
        if (!student) throw new Error("Student not found");

        const newTx: FeeTransaction = {
          ...transaction,
          id: `tx-${Date.now()}`
        };

        const currentLedger = student.feeLedger || { totalPackage: 0, totalReceived: 0, remainingBalance: 0, installments: [], transactions: [] };
        const updatedLedger = {
          ...currentLedger,
          transactions: [newTx, ...(currentLedger.transactions || [])]
        };

        const { error } = await supabase.from('students').update({
          fee_ledger: updatedLedger
        }).eq('id', studentId);

        if (error) throw error;
        await fetchData(true);
      } catch (e: any) {
        toast.error(`Transaction record failed: ${e.message}`);
      }
    },
    updateInstallments: async (studentId: string, installments: Installment[]) => {
      try {
        const student = students.find(s => s.id === studentId || s.admissionId === studentId);
        if (!student) throw new Error("Student not found in management registry");

        const currentLedger = student.feeLedger || { totalPackage: 0, totalReceived: 0, remainingBalance: 0, installments: [], transactions: [] };
        const updatedLedger = {
          ...currentLedger,
          installments
        };

        const { error } = await supabase.from('students').update({
          fee_ledger: updatedLedger
        }).eq('id', student.id);

        if (error) throw error;
        await fetchData(true);
        toast.success("Installment plan updated");
      } catch (e: any) {
        toast.error(`Update failed: ${e.message}`);
      }
    },
    updateFeePackage: async (studentId: string, totalPackage: number) => {
      try {
        const student = students.find(s => s.id === studentId || s.admissionId === studentId);
        const admission = admissions.find(a => a.id === studentId || a.studentId === studentId);

        if (!student && !admission) throw new Error("Student not found");

        if (student) {
          const currentLedger = student.feeLedger || { totalPackage: 0, totalReceived: 0, remainingBalance: 0, installments: [], transactions: [] };
          const feeReceived = student.feeReceived || 0;
          const remainingBalance = totalPackage - feeReceived;

          const updatedLedger = {
            ...currentLedger,
            totalPackage,
            remainingBalance
          };

          const { error } = await supabase.from('students').update({
            total_package: totalPackage,
            fee_ledger: updatedLedger
          }).eq('id', student.id);

          if (error) throw error;
          
          // Also sync with admission if linked
          if (student.admissionId) {
            await supabase.from('admissions').update({ total_package: totalPackage }).eq('id', student.admissionId);
          }
        } else if (admission) {
          const { error } = await supabase.from('admissions').update({
            total_package: totalPackage
          }).eq('id', admission.id);
          if (error) throw error;
        }

        await fetchData(true);
        toast.success("Fee package updated");
      } catch (e: any) {
        toast.error(`Update failed: ${e.message}`);
      }
    },
    addStaff: async (member: Omit<Staff, 'id'>) => {
      try {
        const { error } = await supabase.from('staff').insert({
          full_name: member.fullName,
          father_name: member.fatherName,
          role: member.role,
          contact: member.contact,
          address: member.address,
          base_salary: member.baseSalary,
          join_date: member.joinDate,
          photo_url: member.photo
        });
        if (error) throw error;
        await fetchData(true);
        toast.success("Staff member added successfully");
      } catch (e: any) {
        toast.error(`Failed to add staff: ${e.message}`);
      }
    },
    updateStaff: async (id: string, updates: Partial<Staff>) => {
      try {
        const { error } = await supabase.from('staff').update({
          full_name: updates.fullName,
          father_name: updates.fatherName,
          role: updates.role,
          contact: updates.contact,
          address: updates.address,
          base_salary: updates.baseSalary,
          join_date: updates.joinDate,
          photo_url: updates.photo,
          status: updates.status
        }).eq('id', id);
        if (error) throw error;
        await fetchData(true);
        toast.success("Staff details updated");
      } catch (e: any) {
        toast.error(`Failed to update staff: ${e.message}`);
      }
    },
    deleteStaff: async (id: string) => {
      try {
        const { error } = await supabase.from('staff').delete().eq('id', id);
        if (error) throw error;
        await fetchData(true);
        toast.success("Staff member removed");
      } catch (e: any) {
        toast.error(`Failed to delete staff: ${e.message}`);
      }
    },
    bulkDeleteStaff: async (ids: string[]) => {
      if (!ids.length) return;
      
      isBulkOperatingRef.current = true;
      setStaff(prev => prev.filter(s => !ids.includes(s.id)));
      const toastId = toast.loading(`Deleting ${ids.length} staff members...`);

      try {
        const batchSize = 100;
        for (let i = 0; i < ids.length; i += batchSize) {
          const chunk = ids.slice(i, i + batchSize);
          const { error } = await supabase.from('staff').delete().in('id', chunk);
          if (error) throw error;

          if (i + batchSize < ids.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        logActivity("Bulk Delete", `Removed ${ids.length} staff records`, 'alert');
        toast.success(`${ids.length} staff members removed`, { id: toastId });
      } catch (e: any) {
        console.error("Bulk Delete Staff Error:", e);
        toast.error(`Deletion failed: ${e.message}`, { id: toastId });
      } finally {
        isBulkOperatingRef.current = false;
        fetchData(true);
      }
    },
    addExpense: async (expense: Omit<Expense, 'id'>) => {
      try {
        const { error, data } = await supabase.from('expenses').insert({
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          recorded_by: user?.email || 'System'
        }).select().single();
        
        if (error) throw error;
        await fetchData(true);
        toast.success("Expense recorded");
        return data.id;
      } catch (e: any) {
        toast.error(`Failed to record expense: ${e.message}`);
        return '';
      }
    },
    updatePermission: async (permission: Omit<UserPermission, 'id'>) => {
      try {
        // 1. Call Node backend to create user in Auth (so they can actually log in)
        const response = await fetch('/api/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: permission.email,
            password: permission.customPassword,
            displayName: permission.displayName
          })
        });
        
        const data = await response.json();
        
        if (!response.ok && !data.message?.includes('already exists')) {
          throw new Error(data.error || 'Failed to create user in Auth system');
        }

        // 2. Save permissions to the 'permissions' table
        const { error } = await supabase.from('permissions').upsert({
          email: permission.email,
          display_name: permission.displayName,
          sections: permission.sections,
          is_admin: permission.isAdmin,
          custom_password: permission.customPassword,
          status: 'offline',
          last_active: new Date().toISOString()
        }, { onConflict: 'email' });
        
        if (error) throw error;
        
        await fetchData(true);
        toast.success(`Access updated for ${permission.email}`);
      } catch (e: any) {
        console.error("Update Permission Error:", e);
        toast.error(`Permission update failed: ${e.message}`);
      }
    },
    deletePermission: async (email: string) => {
      try {
        const { error } = await supabase.from('permissions').delete().eq('email', email);
        if (error) throw error;
        
        await fetchData(true);
        toast.success(`Access removed for ${email}`);
      } catch (e: any) {
        toast.error(`Permission deletion failed: ${e.message}`);
      }
    },
    markNotificationRead: async (id: string) => {
      try {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        if (error) throw error;
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      } catch (e) {
        console.error("Failed to mark notification as read", e);
      }
    },
    clearAllNotifications: async () => {
      try {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
        if (error) throw error;
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast.success("All notifications marked as read");
      } catch (e) {
        toast.error("Failed to clear notifications");
      }
    },
    addAcademicRecord: async (record: Omit<AcademicRecord, 'id'>) => {
      try {
        const { error } = await supabase.from('academic_records').insert({
          student_id: record.studentId,
          student_name: record.studentName,
          class_name: record.class,
          subject: record.subject,
          marks_obtained: record.obtainedMarks,
          total_marks: record.totalMarks,
          exam_type: record.testType,
          date: record.date,
          recorded_by: user?.email
        });
        if (error) throw error;
        await fetchData(true);
        toast.success("Academic record added");
      } catch (e) {
        toast.error("Failed to add academic record");
      }
    },
    importAcademicRecords: async (records: Omit<AcademicRecord, 'id'>[]) => {
      try {
        const mapped = records.map(r => ({
          student_id: r.studentId,
          student_name: r.studentName,
          class_name: r.class,
          subject: r.subject,
          marks_obtained: r.obtainedMarks,
          total_marks: r.totalMarks,
          exam_type: r.testType,
          date: r.date,
          recorded_by: user?.email
        }));
        const { error } = await supabase.from('academic_records').insert(mapped);
        if (error) throw error;
        await fetchData(true);
        toast.success(`Imported ${records.length} academic records`);
      } catch (e) {
        toast.error("Academic records import failed");
      }
    },
    addSalaryPayment: async (payment: Omit<SalaryPayment, 'id'>) => {
      try {
        const { error } = await supabase.from('salary_payments').insert({
          staff_id: payment.staffId,
          staff_name: payment.staffName,
          amount: payment.amount,
          month: payment.month,
          year: payment.year,
          payment_date: payment.date,
          payment_method: payment.paymentMethod,
          recorded_by: user?.email
        });
        if (error) throw error;
        
        // Also record as expense
        await supabase.from('expenses').insert({
          description: `Salary: ${payment.staffName} (${payment.month} ${payment.year})`,
          amount: payment.amount,
          category: 'Salaries',
          date: payment.date,
          recorded_by: user?.email
        });

        await fetchData(true);
        toast.success("Salary payment recorded");
      } catch (e: any) {
        toast.error(`Salary record failed: ${e.message}`);
      }
    },
  };
}
