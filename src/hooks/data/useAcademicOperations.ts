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
          class_name: record.class,
          subject: record.subject,
          marks_obtained: record.obtainedMarks,
          total_marks: record.totalMarks,
          exam_type: record.testType,
          date: record.date,
          recorded_by: user?.email
        });
        if (error) throw error;
        // await fetchData(true);
        toast.success("Academic record added");
      } catch (e) {
        toast.error("Failed to add academic record");
      }
    };

  const importAcademicRecords = async (records: Omit<AcademicRecord, 'id'>[]) => {
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
        // await fetchData(true);
        toast.success(`Imported ${records.length} academic records`);
      } catch (e) {
        toast.error("Academic records import failed");
      }
    };
  return { addAcademicRecord, importAcademicRecords };
}