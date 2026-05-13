import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Lead, Admission, Student, Staff, Expense, Income, AppSettings, UserPermission, Notification, AcademicRecord, SalaryPayment, FeePayment, Installment, FeeTransaction , AdmissionStatus } from '../../types';

export function useAcademicOperations(ctx: any) {
  const { generateStudentId, user, fetchData } = ctx;
  const addAcademicRecord = async (record: Omit<AcademicRecord, 'id'>) => {
      try {
        const { error } = await supabase.from('academic_records').insert({
          student_id: record.studentId,
          student_name: record.studentName,
          class: record.class,
          section: record.section,
          test_name: record.testName,
          test_type: record.testType,
          date: record.date,
          subject: record.subject,
          total_marks: record.totalMarks,
          obtained_marks: record.obtainedMarks,
          teacher_id: record.teacherId,
          remarks: record.remarks,
        });
        if (error) {
          console.error("Supabase insert error: ", error);
          throw error;
        }
        if (fetchData) await fetchData(true);
        toast.success("Academic record added");
      } catch (e: any) {
        console.error("Add record failed:", e);
        toast.error("Failed to add academic record: " + (e.message || "Unknown error"));
      }
    };

  const importAcademicRecords = async (records: Omit<AcademicRecord, 'id'>[]) => {
      try {
        const mapped = records.map(r => ({
          student_id: r.studentId,
          student_name: r.studentName,
          class: r.class,
          section: r.section || 'A',
          test_name: r.testName || 'Imported Test',
          test_type: r.testType || 'Monthly',
          date: r.date,
          subject: r.subject,
          total_marks: r.totalMarks,
          obtained_marks: r.obtainedMarks,
          teacher_id: r.teacherId,
          remarks: r.remarks,
        }));
        const { error } = await supabase.from('academic_records').insert(mapped);
        if (error) {
          console.error("Supabase bulk insert error: ", error);
          throw error;
        }
        if (fetchData) await fetchData(true);
        toast.success(`Imported ${records.length} academic records`);
      } catch (e: any) {
        console.error("Bulk import failed:", e);
        toast.error("Academic records import failed: " + (e.message || "Unknown error"));
      }
    };
  return { addAcademicRecord, importAcademicRecords };
}