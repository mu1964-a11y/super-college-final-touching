import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Lead, Admission, Student, Staff, Expense, Income, AppSettings, UserPermission, Notification, AcademicRecord, SalaryPayment, FeePayment, Installment, FeeTransaction , AdmissionStatus } from '../../types';

export function useAccountsOperations(ctx: any) {
  const { generateStudentId, user, admissions, students, staff, expenses, fetchData } = ctx;
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

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
      try {
        const { error, data } = await supabase.from('expenses').insert({
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          recorded_by: user?.email || 'System'
        }).select().single();
        
        if (error) throw error;
        // await fetchData(true);
        toast.success("Expense recorded");
        return data.id;
      } catch (e: any) {
        toast.error(`Failed to record expense: ${e.message}`);
        return '';
      }
    };

  const recordFeePayment = async (studentId: string, payment: FeePayment, fallbackName?: string) => {
    try {
      const student = students.find(s => s.id === studentId || s.admissionId === studentId);
      const admission = admissions.find(a => a.id === studentId || a.studentId === studentId);

      const targetId = student?.id || admission?.id || studentId;
      const targetName = student?.fullName || admission?.fullName || fallbackName || 'Unknown Student';

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

      // await fetchData(true);
      toast.success("Fee payment recorded and ledger updated!");
    } catch (e: any) {
      console.error("Record Fee Error:", e);
      toast.error(`Failed to record fee: ${e.message}`);
    }
  };

  const recordFeeTransaction = async (studentId: string, transaction: Omit<FeeTransaction, 'id'>) => {
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
        // await fetchData(true);
      } catch (e: any) {
        toast.error(`Transaction record failed: ${e.message}`);
      }
    };

  const updateInstallments = async (studentId: string, installments: Installment[]) => {
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
        // await fetchData(true);
        toast.success("Installment plan updated");
      } catch (e: any) {
        toast.error(`Update failed: ${e.message}`);
      }
    };

  const updateFeePackage = async (studentId: string, totalPackage: number) => {
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

        // await fetchData(true);
        toast.success("Fee package updated");
      } catch (e: any) {
        toast.error(`Update failed: ${e.message}`);
      }
    };

  const addSalaryPayment = async (payment: Omit<SalaryPayment, 'id'>) => {
      try {
        const { error } = await supabase.from('salary_payments').insert({
          staff_id: payment.staffId,
          staff_name: payment.staffName,
          amount: payment.amount,
          month: payment.month,
          year: payment.year,
          date: payment.date,
          payment_method: payment.paymentMethod,
          status: payment.status || 'Paid',
          receipt_number: payment.receiptNumber || null
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

        // await fetchData(true);
        toast.success("Salary payment recorded");
      } catch (e: any) {
        toast.error(`Salary record failed: ${e.message}`);
      }
    };
  return { addIncome, addExpense, recordFeePayment, recordFeeTransaction, updateInstallments, updateFeePackage, addSalaryPayment };
}