import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Lead, Admission, Student, Staff, Expense, Income, AppSettings, UserPermission, Notification, AcademicRecord, SalaryPayment, FeePayment, Installment, FeeTransaction , AdmissionStatus } from '../../types';

export function useStaffOperations(ctx: any) {
  const { generateStudentId, user, staff, setStaff, isBulkOperatingRef, logActivity, fetchData } = ctx;
  const addStaff = async (member: Omit<Staff, 'id'>) => {
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
        // await fetchData(true);
        toast.success("Staff member added successfully");
      } catch (e: any) {
        toast.error(`Failed to add staff: ${e.message}`);
      }
    };

  const updateStaff = async (id: string, updates: Partial<Staff>) => {
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
        // await fetchData(true);
        toast.success("Staff details updated");
      } catch (e: any) {
        toast.error(`Failed to update staff: ${e.message}`);
      }
    };

  const deleteStaff = async (id: string) => {
      try {
        const { error } = await supabase.from('staff').delete().eq('id', id);
        if (error) throw error;
        // await fetchData(true);
        toast.success("Staff member removed");
      } catch (e: any) {
        toast.error(`Failed to delete staff: ${e.message}`);
      }
    };

  const bulkDeleteStaff = async (ids: string[]) => {
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
        // fetchData(true);
      }
    };
  return { addStaff, updateStaff, deleteStaff, bulkDeleteStaff };
}