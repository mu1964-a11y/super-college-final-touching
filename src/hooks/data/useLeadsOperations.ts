import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Lead, Admission, Student, Staff, Expense, Income, AppSettings, UserPermission, Notification, AcademicRecord, SalaryPayment, FeePayment, Installment, FeeTransaction , AdmissionStatus } from '../../types';

export function useLeadsOperations(ctx: any) {
  const { user, generateStudentId, leads, setLeads, admissions, setAdmissions, settings, isBulkOperatingRef, logActivity, fetchData } = ctx;
  const addLead = async (lead: Omit<Lead, 'id'>) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticLead: Lead = { ...lead, id: tempId } as Lead;
    setLeads(prev => [optimisticLead, ...prev]);

    try {
      const { data, error } = await supabase.from('leads').insert({
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
      }).select().single();
      
      if (error) throw error;
      
      // Replace temp ID with real ID
      setLeads(prev => prev.map(l => l.id === tempId ? { ...l, id: data.id, dateAdded: data.date_added } : l));
      logActivity("Lead Added", `New lead ${lead.studentName} added`, 'info');
      toast.success("Lead added successfully");
    } catch (e: any) {
      setLeads(prev => prev.filter(l => l.id !== tempId));
      console.error("Supabase Add Lead Error:", e);
      const details = e.message || "Unknown error";
      toast.error(`Add Lead Failed: ${details}. Check Console (F12) for more.`);
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const backupLeads = [...leads];
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));

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
      toast.success("Lead updated");
    } catch (e) {
      setLeads(backupLeads); // Revert
      toast.error("Failed to update lead");
    }
  };

  const deleteLead = async (id: string) => {
    const backupLeads = [...leads];
    setLeads(prev => prev.filter(l => l.id !== id));

    try {
      const { error, count } = await supabase.from('leads').delete({ count: 'exact' }).eq('id', id);
      if (error) throw error;
      
      if (count === 0) {
        setLeads(backupLeads);
        toast.error("Delete failed: Record not found or permission denied (RLS).");
        return;
      }

      logActivity("Lead Deleted", `Lead record removed`, 'alert');
      toast.success("Lead record deleted successfully");
    } catch (e: any) {
      setLeads(backupLeads);
      console.error("Delete Lead Error:", e);
      toast.error(`Error: ${e.message || "Failed to delete lead"}`);
    }
  };

  const bulkDeleteLeads = async (ids: string[]) => {
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
        // fetchData(true); 
      }
    };

  const importLeads = async (newLeads: Lead[]) => {
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
        // await fetchData(true);
        logActivity("Bulk Import", `Imported ${newLeads.length} leads via Excel`, 'success');
      } catch (e: any) {
        console.error("Bulk Import Error:", e);
        toast.error(`Import Failed: ${e.message}`);
        throw e;
      }
    };

  const convertLeadsToApplicants = async (ids: string[], targetProgram?: string) => {
      if (!ids.length) return;
      const toastId = toast.loading(`Converting ${ids.length} leads...`);
      try {
        const leadsToConvert = leads.filter(l => ids.includes(l.id));
        const newAdmissionsOptimistic = leadsToConvert.map(l => {
          let expectedGroup = 'Pending';
          if (targetProgram === 'dit') expectedGroup = 'DIT';
          else if (targetProgram === 'ukl3') expectedGroup = 'UK Level 3';
          else if (targetProgram === 'bs') expectedGroup = 'BS Program';

          return {
            id: `temp-adm-${l.id}`,
            fullName: l.studentName,
            fatherName: l.fatherName,
            contactNumber: l.fatherPhone,
            previousInstitute: l.previousSchool,
            group: expectedGroup,
            paymentPlan: 'Monthly',
            isAdmitted: false,
            studentId: generateStudentId(expectedGroup),
            session: l.session || settings?.academicSession || '2026-28',
            dateApplied: new Date().toISOString()
          } as unknown as Admission;
        });

        // Optimistic update
        setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, isConverted: true } : l));
        setAdmissions(prev => [...newAdmissionsOptimistic, ...prev]);

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

        logActivity("Bulk Conversion", `Converted ${ids.length} leads to applicants`, 'success');
        toast.success(`Successfully converted ${ids.length} leads!`, { id: toastId });
        // fetchData(true); // Fire and forget background refresh
      } catch (e: any) {
        console.error("Bulk Conversion Error:", e);
        toast.error(`Conversion failed: ${e.message}`, { id: toastId });
        // fetchData(true);
      }
    };
  return { addLead, updateLead, deleteLead, bulkDeleteLeads, importLeads, convertLeadsToApplicants };
}