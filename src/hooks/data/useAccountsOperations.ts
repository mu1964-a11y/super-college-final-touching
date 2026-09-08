import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Lead, Admission, Student, Staff, Expense, Income, AppSettings, UserPermission, Notification, AcademicRecord, SalaryPayment, FeePayment, Installment, FeeTransaction , AdmissionStatus } from '../../types';
import { calculateStudentFeeBreakdown } from '../../lib/feeCalculations';

export function useAccountsOperations(ctx: any) {
  const { generateStudentId, user, admissions, students, staff, expenses, setExpenses, fetchData, logActivity } = ctx;
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
        const tags: string[] = [];
        if (expense.expenseType) tags.push(`[${expense.expenseType}]`);
        if (expense.paidTo?.trim()) tags.push(`[Paid to: ${expense.paidTo.trim()}]`);
        if (expense.voucherNo?.trim()) tags.push(`[Voucher: ${expense.voucherNo.trim()}]`);
        
        const combinedDescription = tags.length > 0
          ? `${tags.join(' ')} ${expense.description || ''}`.trim()
          : (expense.description || '');

        const payload: any = {
          description: combinedDescription,
          amount: Number(expense.amount),
          category: expense.category,
          date: expense.date,
          added_by: user?.email || 'Admin Office',
          payment_method: expense.paymentMethod || 'Cash'
        };
        if (expense.session) payload.session = expense.session;
        if (expense.expenseType) payload.expense_type = expense.expenseType;
        if (expense.paidTo) payload.paid_to = expense.paidTo;
        if (expense.voucherNo) payload.voucher_no = expense.voucherNo;

        let currentPayload = { ...payload };
        let insertResult = await supabase.from('expenses').insert(currentPayload).select().single();

        // Automatic retry and schema-cache fallback if any column is missing in user's Supabase table
        let retryCount = 0;
        while (insertResult.error && retryCount < 6) {
          retryCount++;
          const errMsg = insertResult.error.message || '';

          if (errMsg.includes('added_by')) {
            delete currentPayload.added_by;
            currentPayload.recorded_by = user?.email || 'Admin Office';
            insertResult = await supabase.from('expenses').insert(currentPayload).select().single();
            continue;
          }

          // Match: Could not find the '<column>' column of 'expenses' in the schema cache
          const match = errMsg.match(/Could not find the '([^']+)' column/i);
          if (match && match[1]) {
            const missingCol = match[1];
            delete currentPayload[missingCol];
            insertResult = await supabase.from('expenses').insert(currentPayload).select().single();
            continue;
          }

          // If payment_method or any other optional column failed
          if (errMsg.includes('payment_method') && currentPayload.payment_method) {
            delete currentPayload.payment_method;
            insertResult = await supabase.from('expenses').insert(currentPayload).select().single();
            continue;
          }

          break;
        }

        if (insertResult.error) throw insertResult.error;
        
        const createdId = insertResult.data?.id || `exp-${Date.now()}`;
        const newExp: Expense = {
          id: createdId,
          date: expense.date,
          category: expense.category,
          amount: Number(expense.amount),
          description: combinedDescription,
          addedBy: user?.email || 'Admin Office',
          paymentMethod: expense.paymentMethod || 'Cash',
          session: expense.session,
          expenseType: expense.expenseType,
          voucherNo: expense.voucherNo,
          paidTo: expense.paidTo
        };

        if (setExpenses) {
          setExpenses((prev: Expense[]) => [newExp, ...(prev || [])]);
        }

        logActivity?.("Expense Added", `Expense of Rs. ${expense.amount} under ${expense.category} added`, "info");
        toast.success("Expense recorded successfully");
        return createdId;
      } catch (e: any) {
        toast.error(`Failed to record expense: ${e.message}`);
        return '';
      }
    };

  const deleteExpense = async (id: string) => {
    try {
      if (setExpenses) {
        setExpenses((prev: Expense[]) => prev.filter((e: Expense) => e.id !== id));
      }
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) {
        if (fetchData) await fetchData(true);
        throw error;
      }
      if (fetchData) {
        await fetchData(true);
      }
      logActivity?.("Expense Deleted", `Expense record removed`, "warning");
      toast.success("Expense deleted successfully");
    } catch (e: any) {
      toast.error(`Failed to delete expense: ${e.message}`);
    }
  };

  const recordFeePayment = async (studentId: string, payment: FeePayment, fallbackName?: string) => {
    try {
      const student = students.find(s => s.id === studentId || s.admissionId === studentId);
      const admission = admissions.find(a => a.id === studentId || a.studentId === studentId);

      const targetId = student?.id || admission?.id || studentId;
      const targetName = student?.fullName || admission?.fullName || fallbackName || 'Unknown Student';

      // Synchronized official receipt ID
      const syncReceiptId = payment.receiptId || `REC-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(100000 + Math.random() * 900000)}`;
      const safePayment: FeePayment = {
        ...payment,
        receiptId: syncReceiptId,
      };

      // 1. Record in Income table (Roznamcha Inflow)
      const { error: incomeError } = await supabase.from('income').insert({
        student_id: targetId,
        student_name: targetName, 
        fee_type: safePayment.feeType || 'Monthly Installment',
        amount: safePayment.amountPaid,
        month: safePayment.month,
        year: safePayment.year,
        date: safePayment.datePaid,
        status: safePayment.status,
        payment_method: (safePayment as any).paymentMethod || 'Cash',
        recorded_by: safePayment.collectedBy || user?.email || 'System'
      });
      if (incomeError) throw incomeError;

      if (student) {
        // 2. Update Student Record Metadata
        const newFeeReceived = (student.feeReceived || 0) + safePayment.amountPaid;
        const history = student.feeHistory || [];
        const updatedHistory = [...history, safePayment];

        const totalPkg = student.totalPackage || 0;
        const remainingBalance = Math.max(0, totalPkg - newFeeReceived);

        // Run smart installment breakdown to mark installments as Paid/Partial
        const breakdown = calculateStudentFeeBreakdown({
          ...student,
          feeReceived: newFeeReceived,
          totalPackage: totalPkg,
        });

        const currentLedger = student.feeLedger || {
          totalPackage: totalPkg,
          totalReceived: student.feeReceived || 0,
          remainingBalance: remainingBalance,
          installments: [],
          transactions: []
        };

        const transaction: FeeTransaction = {
          id: `tx-${Date.now()}`,
          date: safePayment.datePaid || new Date().toISOString().split('T')[0],
          amount: safePayment.amountPaid,
          description: safePayment.feeType ? `${safePayment.feeType} (${safePayment.month} ${safePayment.year})` : `Installment Payment - ${safePayment.month} ${safePayment.year}`,
          paymentMethod: (safePayment as any).paymentMethod || 'Cash',
          receiptId: syncReceiptId,
          recordedBy: safePayment.collectedBy || user?.email || 'System'
        };

        const updatedLedger = {
          ...currentLedger,
          totalPackage: totalPkg,
          totalReceived: newFeeReceived,
          remainingBalance: remainingBalance,
          installments: breakdown.installments,
          transactions: [transaction, ...(currentLedger.transactions || [])]
        };

        // Optimistic UI state update
        if (ctx.setStudents) {
          ctx.setStudents((prev: any[]) => prev.map(s => s.id === student.id ? {
            ...s,
            feeReceived: newFeeReceived,
            feeHistory: updatedHistory,
            feeLedger: updatedLedger,
            monthlyFee: breakdown.monthlyTuition
          } : s));
        }

        const { error: studentUpdateError } = await supabase
          .from('students')
          .update({
            fee_received: newFeeReceived,
            fee_history: updatedHistory,
            fee_ledger: updatedLedger,
            monthly_fee: breakdown.monthlyTuition,
            total_package: totalPkg
          })
          .eq('id', student.id);

        if (studentUpdateError) throw studentUpdateError;

        // 3. Keep Admission record in sync if linked
        if (student.admissionId) {
          const linkedAdmission = admissions.find(a => a.id === student.admissionId);
          let admissionStatus: AdmissionStatus = linkedAdmission?.status || 'Not Paid';
          const totalPkgAdmission = linkedAdmission?.totalPackage || totalPkg;
          
          if (newFeeReceived >= totalPkgAdmission && totalPkgAdmission > 0) admissionStatus = 'Full Paid';
          else if (newFeeReceived > 0) admissionStatus = 'Partial Paid';

          if (ctx.setAdmissions) {
            ctx.setAdmissions((prev: any[]) => prev.map(a => a.id === student.admissionId ? {
              ...a,
              feeReceived: newFeeReceived,
              feeHistory: updatedHistory,
              feeLedger: updatedLedger,
              status: admissionStatus,
              totalPackage: totalPkgAdmission
            } : a));
          }

          await supabase.from('admissions').update({ 
            fee_received: newFeeReceived,
            fee_history: updatedHistory,
            fee_ledger: updatedLedger,
            status: admissionStatus,
            total_package: totalPkgAdmission
          }).eq('id', student.admissionId);
        }
      } else if (admission) {
        // Update Admission only
        const newFeeReceived = (admission.feeReceived || 0) + safePayment.amountPaid;
        const history = admission.feeHistory || [];
        const updatedHistory = [...history, safePayment];

        let admissionStatus: AdmissionStatus = admission.status || 'Not Paid';
        const totalPkg = admission.totalPackage || 0;
        if (newFeeReceived >= totalPkg && totalPkg > 0) admissionStatus = 'Full Paid';
        else if (newFeeReceived > 0) admissionStatus = 'Partial Paid';

        const breakdown = calculateStudentFeeBreakdown({
          ...admission,
          feeReceived: newFeeReceived,
          totalPackage: totalPkg,
        });

        const currentLedger = admission.feeLedger || {
          totalPackage: totalPkg,
          totalReceived: admission.feeReceived || 0,
          remainingBalance: Math.max(0, totalPkg - (admission.feeReceived || 0)),
          installments: [],
          transactions: []
        };

        const updatedLedger = {
          ...currentLedger,
          totalPackage: totalPkg,
          totalReceived: newFeeReceived,
          remainingBalance: Math.max(0, totalPkg - newFeeReceived),
          installments: breakdown.installments,
          transactions: [{
            id: `tx-adm-${Date.now()}`,
            date: safePayment.datePaid || new Date().toISOString().split('T')[0],
            amount: safePayment.amountPaid,
            description: safePayment.feeType || 'Fee Payment',
            paymentMethod: (safePayment as any).paymentMethod || 'Cash',
            receiptId: syncReceiptId,
            recordedBy: safePayment.collectedBy || user?.email || 'System'
          }, ...(currentLedger.transactions || [])]
        };

        if (ctx.setAdmissions) {
          ctx.setAdmissions((prev: any[]) => prev.map(a => a.id === admission.id ? {
            ...a,
            feeReceived: newFeeReceived,
            status: admissionStatus,
            feeHistory: updatedHistory,
            feeLedger: updatedLedger
          } : a));
        }

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

      logActivity("Fee Collected", `Received Rs. ${safePayment.amountPaid.toLocaleString()} for ${targetName} (${syncReceiptId})`, "info");
      toast.success(`Fee payment recorded! Receipt: ${syncReceiptId}`);
      if (fetchData) fetchData(true);
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

        // Optimistic UI Update
        if (ctx.setStudents) {
          ctx.setStudents((prev: any[]) => prev.map(s => s.id === student.id ? { ...s, feeLedger: updatedLedger } : s));
        }

        const { error } = await supabase.from('students').update({
          fee_ledger: updatedLedger
        }).eq('id', student.id);

        if (error) {
          throw error;
        }
        
        logActivity("Fee Plan Updated", `Installment plan changed for student ${studentId}`, "warning");
        toast.success("Installment plan updated");
      } catch (e: any) {
        toast.error(`Update failed: ${e.message}`);
        fetchData(true); // Revert optimistic changes on failure
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
        logActivity("Fee Package Updated", `Fee package changed for student/admission ${studentId}`, "warning");
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

        toast.success("Salary payment recorded");
        if (fetchData) fetchData(true);
      } catch (e: any) {
        toast.error(`Salary payment failed: ${e.message}`);
      }
    };

    const recordBankDeposit = async (deposit: {
      bankName: string;
      accountNo: string;
      amount: number;
      slipRef?: string;
      depositedBy?: string;
      date: string;
      notes?: string;
    }) => {
      try {
        const desc = `[Bank Deposit] ${deposit.bankName} (${deposit.accountNo}) Ref: ${deposit.slipRef || 'N/A'}${deposit.notes ? ' - ' + deposit.notes : ''}`;
        const { error } = await supabase.from('expenses').insert({
          category: 'Bank Deposit (Contra)',
          expense_type: 'Bank Deposit',
          description: desc,
          amount: Number(deposit.amount),
          date: deposit.date,
          added_by: deposit.depositedBy || user?.email || 'Admin',
          payment_method: 'Bank Deposit',
          paid_to: deposit.bankName,
          voucher_no: deposit.slipRef || `BD-${Date.now().toString().slice(-6)}`
        });
        if (error) throw error;

        logActivity("Bank Deposit", `Transferred Rs. ${Number(deposit.amount).toLocaleString()} from safe to ${deposit.bankName}`, "info");
        toast.success(`Rs. ${Number(deposit.amount).toLocaleString()} deposited to ${deposit.bankName}!`);
        if (fetchData) fetchData(true);
      } catch (e: any) {
        toast.error(`Bank deposit failed: ${e.message}`);
      }
    };

  return { addIncome, addExpense, deleteExpense, recordFeePayment, recordFeeTransaction, updateInstallments, updateFeePackage, addSalaryPayment, recordBankDeposit };
}