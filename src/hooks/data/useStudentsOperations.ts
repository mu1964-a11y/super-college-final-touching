import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Lead, Admission, Student, Staff, Expense, Income, AppSettings, UserPermission, Notification, AcademicRecord, SalaryPayment, FeePayment, Installment, FeeTransaction , AdmissionStatus } from '../../types';

export function useStudentsOperations(ctx: any) {
  const { user, generateStudentId, admissions, students, setStudents, isBulkOperatingRef, logActivity, fetchData } = ctx;
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
        address: student.address,
        total_package: student.totalPackage,
        monthly_fee: student.monthlyFee,
        academic_part: student.academicPart || 'Part-1'
      });
      if (error) throw error;
      logActivity("Student Added", `New student ${student.fullName} initialized`, 'success');
      toast.success("Student added");
    } catch (e) {
      setStudents(prev => prev.filter(s => s.id !== id));
      toast.error("Failed to add student");
    }
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
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
        // await fetchData(true);
        toast.success("Student details updated");
      } catch (e: any) {
        toast.error(`Failed to update student: ${e.message}`);
      }
    };

  const deleteStudent = async (id: string) => {
    const backupStudents = [...students];
    setStudents(prev => prev.filter(s => s.id !== id));

    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      toast.success("Student removed");
    } catch (e) {
      setStudents(backupStudents);
      toast.error("Failed to delete student");
    }
  };

  const bulkDeleteStudents = async (ids: string[]) => {
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
        // fetchData(true);
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

        // await fetchData(true);
        toast.success(`Promoted to Semester ${nextSemester}. Arrears of Rs. ${arrears} carried forward.`);
        logActivity("Promotion", `${student.fullName} promoted to Semester ${nextSemester}`, 'success');
      } catch (e: any) {
        toast.error(`Promotion failed: ${e.message}`);
      }
    };
  return { addStudent, updateStudent, deleteStudent, bulkDeleteStudents, promoteSemester };
}