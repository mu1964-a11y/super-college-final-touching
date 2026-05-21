import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Lead, Admission, Student, Staff, Expense, Income, AppSettings, UserPermission, Notification, AcademicRecord, SalaryPayment, FeePayment, Installment, FeeTransaction , AdmissionStatus } from '../../types';

export function useStaffOperations(ctx: any) {
  const { generateStudentId, user, staff, setStaff, isBulkOperatingRef, logActivity, fetchData } = ctx;
  const addStaff = async (member: Staff) => {
      try {
        setStaff((prev: Staff[]) => [...prev, member]);
        const { error } = await supabase.from('staff').insert({
          id: member.id,
          full_name: member.fullName,
          father_name: member.fatherName,
          cnic: member.cnic,
          dob: member.dob,
          role: member.role,
          contact: member.contact,
          address: member.address,
          base_salary: member.baseSalary,
          salary: member.salary,
          join_date: member.joinDate,
          photo: member.photo,
          status: member.status,
          subjects: member.subjects,
          qualification: member.qualification,
          specialization: member.specialization
        });
        if (error) {
          setStaff((prev: Staff[]) => prev.filter(s => s.id !== member.id));
          throw error;
        }
        await fetchData(true);
        toast.success("Staff member added successfully");
      } catch (e: any) {
        toast.error(`Failed to add staff: ${e.message}`);
      }
    };

  const updateStaff = async (id: string, updates: Partial<Staff>) => {
      try {
        setStaff((prev: Staff[]) => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        const { error } = await supabase.from('staff').update({
          full_name: updates.fullName,
          father_name: updates.fatherName,
          cnic: updates.cnic,
          dob: updates.dob,
          role: updates.role,
          contact: updates.contact,
          address: updates.address,
          base_salary: updates.baseSalary,
          salary: updates.salary,
          join_date: updates.joinDate,
          photo: updates.photo,
          status: updates.status,
          subjects: updates.subjects,
          qualification: updates.qualification,
          specialization: updates.specialization
        }).eq('id', id);
        if (error) throw error;
        // await fetchData(true);
        logActivity("Staff Updated", `Staff ${updates.fullName || id} details changed`, "warning");
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
  const bulkSaveStaffAttendance = async (records: any[]) => {
      try {
        const { error } = await supabase.from('staff_attendance').upsert(
          records.map(r => ({
            id: r.id && !r.id.includes('-') ? undefined : (r.id.includes('-') ? r.id : r.id), // Let supabase generate UUID if it's currently a compound id, wait, actually let's not touch id on upsert if it's new. Actually, if r.id includes '-' and it's not a UUID, inserting it will fail because id is UUID.
            staff_id: r.staffId,
            date: r.date,
            status: r.status,
            check_in: r.checkIn || null,
            check_out: r.checkOut || null,
            notes: r.notes || null,
          })).map(rec => {
            // Remove id if it's an old compound id from localstorage to let UUID default gen work
            // But we need to use constraint `staff_attendance_staff_id_date_key`
            if (rec.id && rec.id.length !== 36) delete rec.id; 
            return rec;
          }), 
          { onConflict: 'staff_id,date' }
        );
        if (error) throw error;
        toast.success("Attendance saved successfully");
        fetchData(true);
      } catch (e: any) {
        toast.error(`Failed to save attendance: ${e.message}`);
      }
  };

  const addTimetableEntry = async (entry: any) => {
    try {
      const { error } = await supabase.from('staff_timetable').insert({
        id: entry.id && !entry.id.includes('-') && entry.id.length === 36 ? entry.id : undefined,
        staff_id: entry.staffId,
        day: entry.day,
        start_time: entry.startTime,
        end_time: entry.endTime,
        subject: entry.subject,
        class_room: entry.classRoom + (entry.section ? ` (Sec ${entry.section})` : '')
      });
      if (error) throw error;
      toast.success("Timetable entry added successfully");
      fetchData(true);
    } catch (e: any) {
      toast.error(`Failed to add timetable entry: ${e.message}`);
    }
  };

  const removeTimetableEntry = async (id: string) => {
    try {
      if (id.includes('-') && id.length !== 36) {
        // Was a local ID, can't delete from supabase by uuid, do nothing or show error
        toast.info("Removed local entry");
        return;
      }
      const { error } = await supabase.from('staff_timetable').delete().eq('id', id);
      if (error) throw error;
      toast.success("Timetable entry removed");
      fetchData(true);
    } catch (e: any) {
      toast.error(`Failed to remove timetable entry: ${e.message}`);
    }
  };

  const recordStaffAdvance = async (advance: any) => {
    try {
      const { error } = await supabase.from('staff_advances').insert({
        staff_id: advance.staffId,
        amount: advance.amount,
        date_issued: advance.date || new Date().toISOString(),
        deduction_per_month: advance.deductionPerMonth || 0,
        remaining_balance: advance.remainingBalance,
        months: advance.monthsCount || 1,
        notes: advance.notes
      });
      if (error) throw error;
      toast.success("Advance recorded successfully");
      fetchData(true);
    } catch (e: any) {
      toast.error(`Failed to record advance: ${e.message}`);
    }
  };

  const updateStaffAdvance = async (id: string, updates: any) => {
    try {
      const { error } = await supabase.from('staff_advances').update({
        remaining_balance: updates.remainingBalance
      }).eq('id', id);
      if (error) throw error;
      // fetchData(true);
    } catch (e: any) {
      toast.error(`Failed to update advance: ${e.message}`);
    }
  };

  return { addStaff, updateStaff, deleteStaff, bulkDeleteStaff, bulkSaveStaffAttendance, addTimetableEntry, removeTimetableEntry, recordStaffAdvance, updateStaffAdvance };
}