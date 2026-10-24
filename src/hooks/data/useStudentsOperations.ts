import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Lead, Admission, Student, Staff, Expense, Income, AppSettings, UserPermission, Notification, AcademicRecord, SalaryPayment, FeePayment, Installment, FeeTransaction , AdmissionStatus, ArchivedRecord } from '../../types';
import { diffObjects, STUDENT_FIELD_LABELS } from '../../utils/changeTracker';

export function useStudentsOperations(ctx: any) {
  const { user, generateStudentId, admissions, setAdmissions, students, setStudents, isBulkOperatingRef, logActivity, fetchData, archiveRecords, deletedArchive, setDeletedArchive } = ctx;
  const addStudent = async (student: Omit<Student, 'id'>) => {
    const id = (student as any).id || generateStudentId(student.group);
    const optimisticStudent: Student = { ...student, id } as Student;
    setStudents(prev => [optimisticStudent, ...prev]);

    try {
      const { error } = await supabase.from('students').insert({
        id,
        admission_id: student.admissionId,
        full_name: student.fullName,
        father_name: student.fatherName,
        category: student.category,
        group: student.group,
        section: student.section,
        contact: student.contact,
        email: student.email,
        blood_group: student.bloodGroup,
        address: student.address,
        photo: student.photo,
        total_package: student.totalPackage,
        monthly_fee: student.monthlyFee,
        academic_part: student.academicPart || 'Part-1',
        fingerprint_template: (student as any).fingerprintTemplate || null,
        fingerprint_finger: (student as any).fingerprintFinger || null,
        fingerprint_enrolled_at: (student as any).fingerprintEnrolledAt || ((student as any).fingerprintTemplate ? new Date().toISOString() : null)
      });
      if (error) throw error;
      logActivity("Student Added", {
        summary: `New student ${student.fullName} initialized`,
        action: "add",
        module: "Student",
        targetName: student.fullName,
        fullRecord: student
      }, 'success');
      toast.success("Student added");
    } catch (e) {
      setStudents(prev => prev.filter(s => s.id !== id));
      toast.error("Failed to add student");
    }
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
      try {
        const oldStudent = students.find((s: any) => s.id === id);
        const changes = diffObjects(oldStudent, updates, STUDENT_FIELD_LABELS);

        let syncedLedger = updates.feeLedger;
        if (!syncedLedger && (updates.totalPackage !== undefined || updates.feeReceived !== undefined)) {
          const baseLedger = oldStudent?.feeLedger || { totalPackage: 0, totalReceived: 0, remainingBalance: 0, installments: [], transactions: [] };
          const nextTotal = updates.totalPackage !== undefined ? Number(updates.totalPackage) : Number(oldStudent?.totalPackage || baseLedger.totalPackage || 0);
          const nextReceived = updates.feeReceived !== undefined ? Number(updates.feeReceived) : Number(oldStudent?.feeReceived || baseLedger.totalReceived || 0);
          syncedLedger = {
            ...baseLedger,
            totalPackage: nextTotal,
            totalReceived: nextReceived,
            remainingBalance: Math.max(0, nextTotal - nextReceived)
          };
        }

        // Immediate optimistic in-memory update (0ms)
        setStudents((prev: Student[]) => prev.map(s => s.id === id ? { ...s, ...updates, ...(syncedLedger ? { feeLedger: syncedLedger } : {}) } : s));

        const updatePayload: any = {
          full_name: updates.fullName,
          father_name: updates.fatherName,
          college_no: updates.collegeNo,
          bay_form_no: updates.bayFormNo,
          dob: updates.dob || null,
          previous_class: updates.previousClass,
          board_roll_no: updates.boardRollNo,
          previous_marks: updates.previousMarks !== undefined ? Number(updates.previousMarks) : undefined,
          category: updates.category,
          group: updates.group,
          section: updates.section,
          subjects: updates.subjects,
          contact: updates.contact,
          father_contact: updates.fatherContact || (updates as any).parentContact,
          email: updates.email,
          blood_group: updates.bloodGroup,
          address: updates.address,
          photo: updates.photo,
          photo_url: updates.photo,
          total_package: updates.totalPackage,
          fee_received: updates.feeReceived,
          monthly_fee: updates.monthlyFee,
          fee_ledger: syncedLedger,
          fee_history: updates.feeHistory,
          academic_part: updates.academicPart,
          current_semester: updates.currentSemester,
          program_type: updates.programType,
          total_installments: updates.totalInstallments,
          session: updates.session
        };

        // Remove undefined keys so existing DB values are never wiped out
        Object.keys(updatePayload).forEach(k => {
          if (updatePayload[k] === undefined) delete updatePayload[k];
        });

        if ((updates as any).fingerprintTemplate !== undefined) {
          updatePayload.fingerprint_template = (updates as any).fingerprintTemplate || null;
          updatePayload.fingerprint_finger = (updates as any).fingerprintFinger || null;
          updatePayload.fingerprint_enrolled_at = (updates as any).fingerprintEnrolledAt || ((updates as any).fingerprintTemplate ? new Date().toISOString() : null);
        }

        const { error } = await supabase.from('students').update(updatePayload).eq('id', id);
        
        if (error) throw error;

        // Keep linked admission in sync atomically (One Source of Truth)
        const admId = oldStudent?.admissionId || (updates as any).admissionId;
        if (admId) {
          const admUpdates: any = {};
          if (updates.fullName !== undefined) admUpdates.full_name = updates.fullName;
          if (updates.fatherName !== undefined) admUpdates.father_name = updates.fatherName;
          if (updates.category !== undefined) admUpdates.category = updates.category;
          if (updates.group !== undefined) admUpdates.group = updates.group;
          if (updates.session !== undefined) admUpdates.session = updates.session;
          if (updates.section !== undefined) admUpdates.section = updates.section;
          if (updates.totalPackage !== undefined) admUpdates.total_package = updates.totalPackage;
          if (updates.feeReceived !== undefined) admUpdates.fee_received = updates.feeReceived;
          if (syncedLedger !== undefined) admUpdates.fee_ledger = syncedLedger;
          if (updates.academicPart !== undefined) admUpdates.academic_part = updates.academicPart;
          if (updates.currentSemester !== undefined) admUpdates.current_semester = updates.currentSemester;
          if (updates.programType !== undefined) admUpdates.program_type = updates.programType;
          if (updates.subjects !== undefined) admUpdates.subjects = updates.subjects;
          if (Object.keys(admUpdates).length > 0) {
            await supabase.from('admissions').update(admUpdates).eq('id', admId);
          }
        }
        await fetchData(true);
        
        logActivity("Student Updated", {
          summary: `Student ${updates.fullName || oldStudent?.fullName || id} details changed`,
          action: "update",
          module: "Student",
          targetName: updates.fullName || oldStudent?.fullName || id,
          changes: changes.length > 0 ? changes : [{ field: "General details", old: "Existing values", new: "Updated values" }]
        }, "warning");
        
        toast.success("Student details updated");
      } catch (e: any) {
        toast.error(`Failed to update student: ${e.message}`);
      }
    };

  const deleteStudent = async (id: string) => {
    // Check if target is already archived
    const isAlreadyArchived = (deletedArchive || []).some((a: any) => 
      a.originalId === id || a.studentId === id
    );
    if (isAlreadyArchived) {
      toast.error("This student record is already in the Deleted Archive.");
      return;
    }

    const backupStudents = [...students];
    const targetStudent = students.find((s: any) => s.id === id || s.admissionId === id);
    
    // Optimistically remove from state
    setStudents(prev => prev.filter(s => s.id !== id && (!targetStudent?.admissionId || s.admissionId !== targetStudent.admissionId)));

    try {
      // 0. Find linked admission snapshot
      let admSnapshot = null;
      if (targetStudent?.admissionId) {
        admSnapshot = (admissions || []).find((a: any) => a.id === targetStudent.admissionId);
      }
      if (!admSnapshot) {
        admSnapshot = (admissions || []).find((a: any) => a.studentId === id || a.student_id === id);
      }

      // 1. Save full snapshot to Deleted Archive before deletion and AWAIT commit
      if (typeof archiveRecords === 'function') {
        const archiveItem: ArchivedRecord = {
          id: `arch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          originalId: targetStudent?.id || id,
          studentId: targetStudent?.id || id,
          entityType: 'student',
          fullName: targetStudent?.fullName || admSnapshot?.fullName || admSnapshot?.full_name || 'Student',
          fatherName: targetStudent?.fatherName || admSnapshot?.fatherName || admSnapshot?.father_name || '',
          category: targetStudent?.category || admSnapshot?.category || 'N/A',
          group: targetStudent?.group || admSnapshot?.group || 'N/A',
          section: targetStudent?.section || admSnapshot?.section || 'A',
          session: targetStudent?.session || admSnapshot?.session || '2026-28',
          contact: targetStudent?.contact || admSnapshot?.contactNumber || admSnapshot?.contact_number || '',
          totalPackage: targetStudent?.totalPackage ?? admSnapshot?.totalPackage ?? admSnapshot?.total_package ?? 0,
          feeReceived: targetStudent?.feeReceived ?? admSnapshot?.feeReceived ?? admSnapshot?.fee_received ?? 0,
          snapshot: { 
            student: targetStudent || null,
            admission: admSnapshot || null,
            feeLedger: targetStudent?.feeLedger || admSnapshot?.feeLedger || null
          },
          deletedAt: new Date().toISOString(),
          deletedBy: user?.email || 'System'
        };
        await archiveRecords([archiveItem]);
      }

      // 2. Soft-archive linked admission records to prevent auto-resurrection on reload
      try {
        if (targetStudent?.admissionId) {
          await supabase.from('admissions').update({
            status: 'Archived',
            is_admitted: false
          }).eq('id', targetStudent.admissionId);
        }
        await supabase.from('admissions').update({
          status: 'Archived',
          is_admitted: false
        }).eq('student_id', id);

        // Also soft-archive any duplicate admissions with matching fullName & fatherName
        if (targetStudent?.fullName && targetStudent?.fatherName) {
          await supabase.from('admissions').update({
            status: 'Archived',
            is_admitted: false
          }).ilike('full_name', targetStudent.fullName.trim()).ilike('father_name', targetStudent.fatherName.trim());
        }
      } catch (admArchErr) {
        console.warn("Could not archive linked admission:", admArchErr);
      }

      // 3. Delete associated child records first to ensure no foreign key violation
      try {
        await supabase.from('academic_records').delete().eq('student_id', id);
        await supabase.from('fee_transactions').delete().eq('student_id', id);
        await supabase.from('fee_payments').delete().eq('student_id', id);
        await supabase.from('installments').delete().eq('student_id', id);
        await supabase.from('student_attendance').delete().eq('student_id', id);

        // Clean up associated income records completely (Audit-proof Cascade)
        const idsToClean = [id];
        if (targetStudent?.admissionId) idsToClean.push(targetStudent.admissionId);
        if (targetStudent?.rollNumber) idsToClean.push(targetStudent.rollNumber);

        try {
          await supabase.from('income').delete().in('student_id', idsToClean);
          if (targetStudent?.fullName) {
            await supabase.from('income').delete()
              .ilike('student_name', targetStudent.fullName.trim())
              .in('fee_type', ['Admission / Initial Fee', 'Admission Fee / Initial Payment']);
          }
        } catch (delIncErr) {
          console.warn("Could not delete associated income records on student delete:", delIncErr);
        }
      } catch (childErr) {
        console.warn("Child records cleanup warning:", childErr);
      }

      // 4. Delete student record from students table
      await supabase.from('students').delete().eq('id', id);
      if (targetStudent?.admissionId) {
        await supabase.from('students').delete().eq('admission_id', targetStudent.admissionId);
      }

      // 5. Update local state
      if (typeof setAdmissions === 'function') {
        setAdmissions((prev: any[]) => prev.map(a => {
          if (a.id === targetStudent?.admissionId || a.studentId === id || (targetStudent?.fullName && a.fullName === targetStudent.fullName && a.fatherName === targetStudent.fatherName)) {
            return { ...a, status: 'Archived', isAdmitted: false };
          }
          return a;
        }));
      }

      await fetchData(true);
      logActivity("Student Deleted", {
        summary: `Student ${targetStudent?.fullName || id} record removed to archive`,
        action: "delete",
        module: "Student",
        targetName: targetStudent?.fullName || id,
        deletedRecord: targetStudent || { id }
      }, 'alert');
      toast.success("Student moved to Deleted Archive");
    } catch (e: any) {
      setStudents(backupStudents);
      console.error("Delete Student Error:", e);
      toast.error(`Failed to delete student: ${e?.message || 'Foreign key conflict'}`);
    }
  };

  const bulkDeleteStudents = async (ids: string[]) => {
      if (!ids.length) return;

      const archivedIdsSet = new Set((deletedArchive || []).map((a: any) => a.originalId || a.studentId));
      const validIdsToDelete = ids.filter(id => !archivedIdsSet.has(id));
      if (validIdsToDelete.length === 0) {
        toast.error("Selected student(s) are already in the Deleted Archive.");
        return;
      }
      
      isBulkOperatingRef.current = true;
      setStudents(prev => prev.filter(s => !validIdsToDelete.includes(s.id)));
      const toastId = toast.loading(`Deleting ${validIdsToDelete.length} students...`);

      try {
        // 0. Save snapshots to Deleted Archive before bulk deletion
        const targetStudents = students.filter((s: any) => validIdsToDelete.includes(s.id));
        if (targetStudents.length > 0 && typeof archiveRecords === 'function') {
          const archiveItems: ArchivedRecord[] = targetStudents.map((s: any) => ({
            id: `arch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            originalId: s.id,
            studentId: s.id,
            entityType: 'student',
            fullName: s.fullName,
            fatherName: s.fatherName,
            category: s.category,
            group: s.group,
            section: s.section,
            session: s.session,
            contact: s.contact,
            totalPackage: s.totalPackage,
            feeReceived: s.feeReceived,
            snapshot: { 
              student: s,
              feeLedger: s.feeLedger || null
            },
            deletedAt: new Date().toISOString(),
            deletedBy: user?.email || 'System'
          }));
          await archiveRecords(archiveItems);
        }

        // 0.5. Soft-archive linked admissions in bulk
        const admIdsToArchive = targetStudents.map((s: any) => s.admissionId).filter(Boolean);
        try {
          if (admIdsToArchive.length > 0) {
            await supabase.from('admissions').update({
              status: 'Archived',
              is_admitted: false
            }).in('id', admIdsToArchive);
          }
          await supabase.from('admissions').update({
            status: 'Archived',
            is_admitted: false
          }).in('student_id', validIdsToDelete);
        } catch (admArchErr) {
          console.warn("Could not bulk archive linked admissions:", admArchErr);
        }

        const batchSize = 100;
        for (let i = 0; i < validIdsToDelete.length; i += batchSize) {
          const chunk = validIdsToDelete.slice(i, i + batchSize);

          try {
            await supabase.from('academic_records').delete().in('student_id', chunk);
            await supabase.from('fee_transactions').delete().in('student_id', chunk);
            await supabase.from('fee_payments').delete().in('student_id', chunk);
            await supabase.from('installments').delete().in('student_id', chunk);
            await supabase.from('student_attendance').delete().in('student_id', chunk);

            // Clean up associated income records completely (Audit-proof Cascade)
            const targetStudentsInChunk = students.filter(s => chunk.includes(s.id));
            const allIdsInChunk = Array.from(new Set([
              ...chunk,
              ...targetStudentsInChunk.map(s => s.admissionId).filter(Boolean),
              ...targetStudentsInChunk.map(s => s.rollNumber).filter(Boolean)
            ]));

            if (allIdsInChunk.length > 0) {
              await supabase.from('income').delete().in('student_id', allIdsInChunk);
            }
            const chunkNames = targetStudentsInChunk.map(s => s.fullName).filter(Boolean);
            if (chunkNames.length > 0) {
              await supabase.from('income').delete()
                .in('student_name', chunkNames)
                .in('fee_type', ['Admission / Initial Fee', 'Admission Fee / Initial Payment']);
            }
          } catch (childErr) {
            console.warn("Child records cleanup in bulk warning:", childErr);
          }

          const { error } = await supabase.from('students').delete().in('id', chunk);
          if (error) throw error;

          if (i + batchSize < validIdsToDelete.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        if (typeof setAdmissions === 'function') {
          setAdmissions((prev: any[]) => prev.map(a => {
            if (validIdsToDelete.includes(a.studentId) || admIdsToArchive.includes(a.id)) {
              return { ...a, status: 'Archived', isAdmitted: false };
            }
            return a;
          }));
        }

        logActivity("Bulk Delete", `Removed ${validIdsToDelete.length} student records`, 'alert');
        toast.success(`Successfully deleted and archived ${validIdsToDelete.length} student(s)!`, { id: toastId });
      } catch (e: any) {
        console.error("Bulk Delete Students Error:", e);
        toast.error(`Deletion failed: ${e.message}`, { id: toastId });
      } finally {
        isBulkOperatingRef.current = false;
        await fetchData(true);
      }
    };

  const promoteSemester = async (studentId: string, nextSemesterFee: number) => {
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
          current_semester: nextSemester,
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
            current_semester: nextSemester,
            total_package: newTotalPackage,
            fee_ledger: updatedLedger,
            status: admissionStatus
          }).eq('id', student.admissionId);
        }

        fetchData(true);
        toast.success(`Promoted to Semester ${nextSemester}. Arrears of Rs. ${arrears} carried forward.`);
        logActivity("Promotion", `${student.fullName} promoted to Semester ${nextSemester}`, 'success');
      } catch (e: any) {
        toast.error(`Promotion failed: ${e.message}`);
      }
    };
    const saveStudentAttendanceLogs = async (records: any[]) => {
      try {
        // Optimistic UI Update
        if (ctx.setStudentAttendance) {
          ctx.setStudentAttendance((prev: any[]) => {
            const current = [...prev];
            records.forEach(r => {
              const idx = current.findIndex(a => a.studentId === r.studentId && a.date === r.date);
              if (idx >= 0) {
                current[idx] = { ...current[idx], status: r.status, notes: r.notes || '' };
              } else {
                current.push({ studentId: r.studentId, date: r.date, status: r.status, notes: r.notes || '' });
              }
            });
            return current;
          });
        }
        
        const { error } = await supabase.from('student_attendance').upsert(
          records.map(r => ({
            student_id: r.studentId,
            date: r.date,
            status: r.status,
            notes: r.notes || ''
          })), 
          { onConflict: 'student_id,date' }
        );
        if (error) {
          console.error("Attendance save error", error);
          throw error;
        }
        fetchData(true);
        return true;
      } catch (e: any) {
        toast.error(`Failed to save attendance: ${e.message}`);
        fetchData(true); // Revert optimistic changes
        return false;
      }
    };

    const bulkPromoteToPart2 = async (ids: string[], targetSession?: string) => {
      if (!ids.length) return;
      const toastId = toast.loading(`Promoting ${ids.length} students to 2nd Year (Part-2)...`);
      try {
        const updatePayload: any = { academic_part: 'Part-2' };
        if (targetSession) {
          updatePayload.session = targetSession;
        }

        const { error: studentErr } = await supabase.from('students').update(updatePayload).in('id', ids);
        if (studentErr) throw studentErr;

        const linkedAdmissionIds = students
          .filter((s: any) => ids.includes(s.id) && s.admissionId)
          .map((s: any) => s.admissionId);

        if (linkedAdmissionIds.length > 0) {
          await supabase.from('admissions').update(updatePayload).in('id', linkedAdmissionIds);
        }

        fetchData(true);
        logActivity("Bulk Promotion", `Promoted ${ids.length} student(s) to Part-2 (${targetSession || 'Active Session'})`, 'success');
        toast.success(`Successfully promoted ${ids.length} student(s) to Part-2!`, { id: toastId });
      } catch (e: any) {
        console.error("Bulk Promote Error:", e);
        toast.error(`Promotion failed: ${e.message}`, { id: toastId });
      }
    };

    const migrateSection = async (ids: string[], newSection: string) => {
      if (!ids.length || !newSection) return;
      const toastId = toast.loading(`Migrating ${ids.length} student(s) to Section ${newSection}...`);
      try {
        const { error: studentErr } = await supabase.from('students').update({ section: newSection }).in('id', ids);
        if (studentErr) throw studentErr;

        const linkedAdmissionIds = students
          .filter((s: any) => ids.includes(s.id) && s.admissionId)
          .map((s: any) => s.admissionId);

        if (linkedAdmissionIds.length > 0) {
          await supabase.from('admissions').update({ section: newSection }).in('id', linkedAdmissionIds);
        }

        fetchData(true);
        logActivity("Section Migration", `Migrated ${ids.length} student(s) to Section ${newSection}`, 'warning');
        toast.success(`Moved ${ids.length} student(s) to Section ${newSection}!`, { id: toastId });
      } catch (e: any) {
        console.error("Migrate Section Error:", e);
        toast.error(`Migration failed: ${e.message}`, { id: toastId });
      }
    };

  return { 
    addStudent, 
    updateStudent, 
    deleteStudent, 
    bulkDeleteStudents, 
    promoteSemester, 
    saveStudentAttendanceLogs,
    bulkPromoteToPart2,
    migrateSection 
  };
}