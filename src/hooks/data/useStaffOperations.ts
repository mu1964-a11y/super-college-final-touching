import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Lead, Admission, Student, Staff, Expense, Income, AppSettings, UserPermission, Notification, AcademicRecord, SalaryPayment, FeePayment, Installment, FeeTransaction , AdmissionStatus } from '../../types';
import { diffObjects, STAFF_FIELD_LABELS } from '../../utils/changeTracker';
import { sendStaffEnrollmentNotice } from '../../lib/whatsappAutomation';

export function useStaffOperations(ctx: any) {
  const { generateStudentId, user, staff, setStaff, staffAttendance, setStaffAttendance, staffTimetable, setStaffTimetable, staffAdvances, setStaffAdvances, isBulkOperatingRef, logActivity, fetchData, settings } = ctx;
  const addStaff = async (member: Staff) => {
      try {
        setStaff((prev: Staff[]) => [...prev, member]);
        const { error } = await supabase.from('staff').insert({
          id: member.id,
          full_name: member.fullName,
          father_name: member.fatherName,
          cnic: member.cnic,
          dob: member.dob && String(member.dob).trim() ? member.dob : null,
          role: member.role,
          designation: member.designation || (member.secondaryRole ? `${member.role} & ${member.secondaryRole}` : member.role),
          contact: member.contact,
          address: member.address,
          base_salary: member.baseSalary,
          salary: member.salary,
          join_date: member.joinDate && String(member.joinDate).trim() ? member.joinDate : null,
          photo: member.photo,
          status: member.status,
          subjects: member.subjects,
          qualification: member.qualification,
          specialization: member.specialization,
          fingerprint_template: member.fingerprintTemplate || null,
          fingerprint_finger: member.fingerprintFinger || null,
          fingerprint_enrolled_at: member.fingerprintTemplate ? new Date().toISOString() : null,
        });
        if (error) {
          setStaff((prev: Staff[]) => prev.filter(s => s.id !== member.id));
          throw error;
        }
        await fetchData(true);
        logActivity("Staff Added", {
          summary: `Staff member ${member.fullName} (${member.role}) added successfully`,
          action: "add",
          module: "Staff",
          targetName: member.fullName,
          fullRecord: member
        }, 'success');
        toast.success("Staff member added successfully");

        // Dispatch automated WhatsApp Enrollment Notice to Staff Member
        sendStaffEnrollmentNotice(member, settings).then((sent) => {
          if (sent) {
            toast.success(`WhatsApp enrollment notification dispatched to ${member.fullName}!`);
          }
        }).catch((err) => console.warn("Staff enrollment notice error:", err));
      } catch (e: any) {
        toast.error(`Failed to add staff: ${e.message}`);
      }
    };

  const updateStaff = async (id: string, updates: Partial<Staff>) => {
      try {
        const oldMember = staff.find((s: any) => s.id === id);
        const changes = diffObjects(oldMember, updates, STAFF_FIELD_LABELS);

        setStaff((prev: Staff[]) => prev.map(s => s.id === id ? { ...s, ...updates } : s));

        const updatePayload: any = {
          full_name: updates.fullName,
          father_name: updates.fatherName,
          cnic: updates.cnic,
          role: updates.role,
          contact: updates.contact,
          address: updates.address,
          base_salary: updates.baseSalary,
          salary: updates.salary,
          photo: updates.photo,
          status: updates.status,
          subjects: updates.subjects,
          qualification: updates.qualification,
          specialization: updates.specialization
        };
        if (updates.designation !== undefined) {
          updatePayload.designation = updates.designation;
        } else if (updates.role !== undefined || updates.secondaryRole !== undefined) {
          const r = updates.role || oldMember?.role;
          const sr = updates.secondaryRole !== undefined ? updates.secondaryRole : oldMember?.secondaryRole;
          updatePayload.designation = sr ? `${r} & ${sr}` : r;
        }
        if (updates.dob !== undefined) {
          updatePayload.dob = updates.dob && String(updates.dob).trim() ? updates.dob : null;
        }
        if (updates.joinDate !== undefined) {
          updatePayload.join_date = updates.joinDate && String(updates.joinDate).trim() ? updates.joinDate : null;
        }
        if (updates.fingerprintTemplate !== undefined) {
          updatePayload.fingerprint_template = updates.fingerprintTemplate || null;
          updatePayload.fingerprint_finger = updates.fingerprintFinger || null;
          updatePayload.fingerprint_enrolled_at = updates.fingerprintTemplate ? new Date().toISOString() : null;
        }

        const { error } = await supabase.from('staff').update(updatePayload).eq('id', id);
        if (error) throw error;
        
        logActivity("Staff Updated", {
          summary: `Staff ${updates.fullName || oldMember?.fullName || id} details changed`,
          action: "update",
          module: "Staff",
          targetName: updates.fullName || oldMember?.fullName || id,
          changes: changes.length > 0 ? changes : [{ field: "General details", old: "Existing values", new: "Updated values" }]
        }, "warning");
        
        toast.success("Staff details updated");
      } catch (e: any) {
        toast.error(`Failed to update staff: ${e.message}`);
      }
    };

  const deleteStaff = async (id: string) => {
      try {
        const oldMember = staff.find((s: any) => s.id === id);
        // Instant optimistic removal from UI (0ms)
        setStaff((prev: Staff[]) => prev.filter(s => s.id !== id));

        // 0. Archive staff member before deleting
        if (oldMember && typeof ctx.archiveRecords === 'function') {
          ctx.archiveRecords([{
            id: `arch-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            originalId: oldMember.id,
            entityType: 'staff',
            fullName: oldMember.fullName,
            fatherName: oldMember.fatherName || '',
            category: oldMember.role || 'Staff',
            group: oldMember.designation || oldMember.role || '',
            contact: oldMember.contact || '',
            totalPackage: oldMember.baseSalary || oldMember.salary || 0,
            snapshot: { staff: oldMember },
            deletedAt: new Date().toISOString(),
            deletedBy: user?.email || 'System'
          }]);
        }

        // 1. Clean up child tables to avoid orphaned records or FK errors
        try {
          await supabase.from('staff_attendance').delete().eq('staff_id', id);
          await supabase.from('staff_timetable').delete().eq('staff_id', id);
          await supabase.from('staff_advances').delete().eq('staff_id', id);
        } catch (childErr) {
          console.warn("Staff child tables cleanup warning:", childErr);
        }

        const { error } = await supabase.from('staff').delete().eq('id', id);
        if (error) {
          if (oldMember) setStaff((prev: Staff[]) => [...prev, oldMember]);
          throw error;
        }
        await fetchData(true);
        logActivity("Staff Deleted", {
          summary: `Staff member ${oldMember?.fullName || id} removed`,
          action: "delete",
          module: "Staff",
          targetName: oldMember?.fullName || id,
          deletedRecord: oldMember || { id }
        }, 'alert');
        toast.success("Staff member moved to Deleted Archive");
      } catch (e: any) {
        toast.error(`Failed to delete staff: ${e.message}`);
      }
    };

  const bulkDeleteStaff = async (ids: string[]) => {
      if (!ids.length) return;
      
      isBulkOperatingRef.current = true;
      const targetMembers = staff.filter((s: any) => ids.includes(s.id));
      setStaff(prev => prev.filter(s => !ids.includes(s.id)));
      const toastId = toast.loading(`Deleting ${ids.length} staff members...`);

      try {
        if (targetMembers.length > 0 && typeof ctx.archiveRecords === 'function') {
          ctx.archiveRecords(targetMembers.map((m: any) => ({
            id: `arch-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            originalId: m.id,
            entityType: 'staff',
            fullName: m.fullName,
            fatherName: m.fatherName || '',
            category: m.role || 'Staff',
            group: m.designation || m.role || '',
            contact: m.contact || '',
            totalPackage: m.baseSalary || m.salary || 0,
            snapshot: { staff: m },
            deletedAt: new Date().toISOString(),
            deletedBy: user?.email || 'System'
          })));
        }

        const batchSize = 100;
        for (let i = 0; i < ids.length; i += batchSize) {
          const chunk = ids.slice(i, i + batchSize);
          try {
            await supabase.from('staff_attendance').delete().in('staff_id', chunk);
            await supabase.from('staff_timetable').delete().in('staff_id', chunk);
            await supabase.from('staff_advances').delete().in('staff_id', chunk);
          } catch (childErr) {
            console.warn("Bulk staff child cleanup warning:", childErr);
          }
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
            snapshot_url: r.snapshotUrl || r.snapshot_url || null,
            verification_method: r.verificationMethod || r.verification_method || null,
            check_in_time: r.checkInTime || r.check_in_time || null,
            check_out_time: r.checkOutTime || r.check_out_time || null,
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
      const validUuid = entry.id && entry.id.length === 36 ? entry.id : crypto.randomUUID();
      const optimisticEntry = { ...entry, id: validUuid };
      if (setStaffTimetable) {
        setStaffTimetable((prev: any[]) => [...(prev || []), optimisticEntry]);
      }
      const { error } = await supabase.from('staff_timetable').insert({
        id: validUuid,
        staff_id: entry.staffId,
        day: entry.day,
        start_time: entry.startTime,
        end_time: entry.endTime,
        subject: entry.subject,
        class_room: entry.classRoom || 'Regular',
        section: entry.section || ''
      });
      if (error) throw error;
      toast.success("Timetable entry added successfully");
      if (fetchData) fetchData(true);
    } catch (e: any) {
      toast.error(`Failed to add timetable entry: ${e.message}`);
    }
  };

  const removeTimetableEntry = async (id: string) => {
    try {
      if (setStaffTimetable) {
        setStaffTimetable((prev: any[]) => (prev || []).filter((t: any) => t.id !== id));
      }
      const { error } = await supabase.from('staff_timetable').delete().eq('id', id);
      if (error) throw error;
      toast.success("Timetable entry removed");
      if (fetchData) fetchData(true);
    } catch (e: any) {
      toast.error(`Failed to remove timetable entry: ${e.message}`);
    }
  };

  const recordStaffAdvance = async (advance: any) => {
    try {
      const optimisticAdvance = {
        id: `adv-${Date.now()}`,
        staffId: advance.staffId,
        amount: advance.amount,
        date: advance.date || new Date().toISOString(),
        deductionPerMonth: advance.deductionPerMonth || 0,
        remainingBalance: advance.remainingBalance,
        monthsCount: advance.monthsCount || 1,
        notes: advance.notes
      };
      if (setStaffAdvances) {
        setStaffAdvances((prev: any[]) => [optimisticAdvance, ...(prev || [])]);
      }
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
      if (fetchData) fetchData(true);
    } catch (e: any) {
      toast.error(`Failed to record advance: ${e.message}`);
    }
  };

  const updateStaffAdvance = async (id: string, updates: any) => {
    try {
      if (setStaffAdvances) {
        setStaffAdvances((prev: any[]) => (prev || []).map((a: any) => a.id === id ? { ...a, remainingBalance: updates.remainingBalance } : a));
      }
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