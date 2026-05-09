import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Lead, Admission, Student, Staff, Expense, Income, AppSettings, UserPermission, Notification, AcademicRecord, SalaryPayment, FeePayment, Installment, FeeTransaction , AdmissionStatus } from '../../types';

export function useAdmissionsOperations(ctx: any) {
  const { user, generateStudentId, admissions, setAdmissions, students, settings, isBulkOperatingRef, logActivity, fetchData } = ctx;
  const addAdmission = async (admission: Omit<Admission, 'id'>) => {
    const optimisticId = `temp-adm-${Date.now()}`;
    const optimisticAdmission: Admission = {
      ...admission,
      id: optimisticId,
      dateApplied: new Date().toISOString()
    } as Admission;
    setAdmissions(prev => [optimisticAdmission, ...prev]);

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

      const { data, error } = await supabase.from('admissions').insert({
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
        email: admission.email,
        blood_group: admission.bloodGroup,
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
      }).select().single();
      if (error) throw error;
      
      setAdmissions(prev => prev.map(a => a.id === optimisticId ? { ...a, id: data.id, dateApplied: data.date_applied } : a));
      
      logActivity("Admission Recorded", `${admission.fullName} application added`, 'success');
      toast.success("Admission added successfully");
    } catch (e: any) {
      setAdmissions(prev => prev.filter(a => a.id !== optimisticId));
      console.error("Add Admission Error:", e);
      toast.error(`Failed to add admission: ${e.message || "Unknown error"}`);
    }
  };

  const updateAdmission = async (id: string, updates: Partial<Admission>) => {
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
          email: updates.email,
          blood_group: updates.bloodGroup,
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
        fetchData(true);
        toast.success("Admission details updated");
      } catch (e: any) {
        console.error("Update Admission Error:", e);
        toast.error(`Failed to update admission: ${e.message || "Unknown error"}`);
      }
    };

  const deleteAdmission = async (id: string) => {
      try {
        const { error, count } = await supabase.from('admissions').delete({ count: 'exact' }).eq('id', id);
        if (error) throw error;
        if (count === 0) {
          toast.error("Admission record not found or delete restricted.");
          return;
        }
        fetchData(true);
        toast.success("Admission record deleted successfully");
      } catch (e: any) {
        console.error("Delete Admission Error:", e);
        toast.error(`Delete Failed: ${e.message}`);
      }
    };

  const bulkDeleteAdmissions = async (ids: string[]) => {
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
    };

  const confirmAdmission = async (admissionId: string, _operatorEmail?: string) => {
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
          category: admission.category || 'N/A',
          group: admission.group || 'N/A',
          section: admission.section || 'A',
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
        fetchData(true);
        toast.success("Student confirmed and moved to Management!");
      } catch (e) {
        toast.error("Failed to confirm admission");
      }
    };

  const importAdmissions = async (admissionsToImport: Admission[]) => {
    if (!admissionsToImport.length) return;

    isBulkOperatingRef.current = true;
    const toastId = toast.loading(`Importing ${admissionsToImport.length} admissions...`);

    try {
      const batchSize = 50;
      let totalImported = 0;

      for (let i = 0; i < admissionsToImport.length; i += batchSize) {
        const chunk = admissionsToImport.slice(i, i + batchSize);
        const mappedChunk = chunk.map(admission => ({
          full_name: admission.fullName,
          father_name: admission.fatherName,
          previous_marks: admission.previousMarks || 0,
          previous_institute: admission.previousInstitute || '',
          college_no: admission.collegeNo || '',
          bay_form_no: admission.bayFormNo || '',
          dob: admission.dob || null,
          previous_class: admission.previousClass || '10th',
          board_roll_no: admission.boardRollNo || '',
          category: admission.category,
          group: admission.group,
          section: admission.section || '',
          subjects: admission.subjects || [],
          address: admission.address || '',
          admission_fee: admission.admissionFee || 0,
          misc_funds: admission.miscFunds || 0,
          total_fee_finalized: admission.totalFeeFinalized || 0,
          total_package: admission.totalPackage || 0,
          fee_received: admission.feeReceived || 0,
          payment_plan: admission.paymentPlan || 'Installments',
          contact_number: admission.contactNumber || '',
          father_contact: admission.fatherContact || '',
          secondary_contact: admission.secondaryContact || '',
          email: admission.email || '',
          blood_group: admission.bloodGroup || '',
          reference: admission.reference || 'Bulk Import',
          gender: admission.gender,
          photo_url: admission.photo || '',
          student_id: admission.studentId || null,
          status: admission.status || 'Prospective',
          is_admitted: admission.isAdmitted || false,
          session: admission.session || settings?.academicSession,
          academic_part: admission.academicPart || 'Part-1'
        }));

        const { error } = await supabase.from('admissions').insert(mappedChunk);
        if (error) throw error;
        
        totalImported += chunk.length;
        
        if (i + batchSize < admissionsToImport.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      logActivity("Bulk Import", `Imported ${totalImported} admissions via Excel`, 'success');
      toast.success(`${totalImported} admissions imported successfully`, { id: toastId });
    } catch (e: any) {
      console.error("Bulk Import Admissions Error:", e);
      toast.error(`Import Failed: ${e.message}`, { id: toastId });
    } finally {
      isBulkOperatingRef.current = false;
      fetchData(true);
    }
  };

    const syncAdmissionsToStudents = async () => {
      try {
        const admitted = admissions.filter(a => a.isAdmitted || a.status === 'Admitted/Confirmed');
        const existingIds = new Set(students?.map((s: any) => s.id) || []);
        const toInsert = admitted.filter(a => !existingIds.has(a.studentId || a.id)).map(a => ({
          id: a.studentId || a.id,
          admission_id: a.id,
          full_name: a.fullName,
          father_name: a.fatherName,
          category: a.category || 'N/A',
          group: a.group || 'N/A',
          section: a.section || 'Unassigned',
          contact: a.contactNumber,
          address: a.address,
          total_package: a.totalPackage,
          fee_received: a.feeReceived,
          fee_ledger: a.feeLedger || {},
          monthly_fee: Math.round((a.totalPackage || 0) / 12),
          total_installments: 12,
          session: a.session,
          session_start_date: a.sessionStartDate,
          session_end_date: a.sessionEndDate,
          academic_part: a.academicPart || 'Part-1',
          fee_history: a.feeHistory || []
        }));

        if (toInsert.length === 0) {
          toast.info("All student records are already in sync.");
          return;
        }

        const { error } = await supabase.from('students').insert(toInsert);
        if (error) throw error;
        toast.success(`Successfully synced ${toInsert.length} students to database.`);
        fetchData(true);
      } catch (e: any) {
        toast.error(`Sync failed: ${e.message}`);
      }
    };

  return { addAdmission, updateAdmission, deleteAdmission, bulkDeleteAdmissions, confirmAdmission, importAdmissions, syncAdmissionsToStudents };
}