import { Installment, Student, Admission } from "@/types";

/**
 * Generate cyclic monthly installments with a fixed day of the month (e.g., 10th of every month)
 */
export function generateSmartInstallmentSchedule(
  totalPackage: number,
  totalInstallments: number = 10,
  startDateStr?: string,
  fixedDueDay: number = 10
): Installment[] {
  const safeInstallments = Math.max(1, Math.min(12, totalInstallments || 10));
  const baseAmount = Math.floor(totalPackage / safeInstallments);
  let remainder = totalPackage - (baseAmount * safeInstallments);

  // Determine starting date
  let baseDate = new Date();
  if (startDateStr && !isNaN(new Date(startDateStr).getTime())) {
    baseDate = new Date(startDateStr);
  }

  const schedule: Installment[] = [];

  for (let i = 0; i < safeInstallments; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, fixedDueDay);
    const amount = i === safeInstallments - 1 ? baseAmount + remainder : baseAmount;
    const monthName = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();

    schedule.push({
      id: `inst-${i + 1}-${d.getTime()}`,
      installmentNo: i + 1,
      title: `Inst. #${i + 1} (${monthName} ${year})`,
      amount,
      dueDate: d.toISOString().split("T")[0],
      status: 'Unpaid',
      amountPaid: 0,
      arrearsIncluded: 0,
    });
  }

  return schedule;
}

export interface StudentFeeBreakdown {
  totalPackage: number;
  feeReceived: number;
  totalBalance: number;
  monthlyTuition: number;
  currentInstallmentDue: number;
  previousArrears: number;
  totalPayableBeforeDue: number;
  lateFeeFine: number;
  totalPayableAfterDue: number;
  advanceBalance: number;
  dueDate: string;
  isOverdue: boolean;
  installments: Installment[];
  statusText: string;
}

/**
 * Calculates current fee breakdown, previous arrears, and auto-rollover for any student or admission
 */
export function calculateStudentFeeBreakdown(
  student: Partial<Student & Admission> | any,
  asOfDate: Date = new Date()
): StudentFeeBreakdown {
  const totalPackage = Number(student.totalPackage || student.feeLedger?.totalPackage || 0);
  const feeReceived = Number(student.feeReceived || student.feeLedger?.totalReceived || 0);
  const totalBalance = Math.max(0, totalPackage - feeReceived);
  const totalInstallmentsCount = Number(student.totalInstallments || 10);

  // Retrieve or dynamically generate installments
  let installments: Installment[] = [];
  if (student.feeLedger?.installments && Array.isArray(student.feeLedger.installments) && student.feeLedger.installments.length > 0) {
    installments = JSON.parse(JSON.stringify(student.feeLedger.installments));
  } else {
    installments = generateSmartInstallmentSchedule(
      totalPackage,
      totalInstallmentsCount,
      student.sessionStartDate || student.date || student.created_at,
      10
    );
  }

  // Simulate payment distribution across installments chronologically
  let remainingPaidCredit = feeReceived;
  let previousArrears = 0;
  let currentInstallmentDue = 0;
  let currentDueDate = "";
  let isCurrentOverdue = false;
  let foundCurrentCycle = false;

  const todayStr = asOfDate.toISOString().split("T")[0];

  const updatedInstallments: Installment[] = installments.map((inst) => {
    const instAmount = Number(inst.amount) || 0;
    let paidForThis = 0;

    if (remainingPaidCredit >= instAmount) {
      paidForThis = instAmount;
      remainingPaidCredit -= instAmount;
    } else if (remainingPaidCredit > 0) {
      paidForThis = remainingPaidCredit;
      remainingPaidCredit = 0;
    }

    const unpaidRemainder = Math.max(0, instAmount - paidForThis);
    let status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' = 'Unpaid';

    if (paidForThis >= instAmount) {
      status = 'Paid';
    } else if (paidForThis > 0) {
      status = 'Partial';
    } else if (inst.dueDate < todayStr) {
      status = 'Overdue';
    }

    // Determine arrears vs current due
    const isPastDue = inst.dueDate < todayStr;

    if (status !== 'Paid') {
      if (!foundCurrentCycle) {
        // This is the active/current installment for this student
        foundCurrentCycle = true;
        currentInstallmentDue = unpaidRemainder;
        currentDueDate = inst.dueDate;
        isCurrentOverdue = isPastDue;
      } else {
        // If there were already unpaid installments in the past
        if (isPastDue) {
          previousArrears += unpaidRemainder;
        }
      }
    }

    return {
      ...inst,
      amountPaid: paidForThis,
      status: status as any
    };
  });

  // If all installments were paid or none left
  if (!foundCurrentCycle) {
    if (totalBalance > 0) {
      currentInstallmentDue = totalBalance;
      const fallbackDue = new Date();
      fallbackDue.setDate(fallbackDue.getDate() + 5);
      currentDueDate = fallbackDue.toISOString().split("T")[0];
    } else {
      currentInstallmentDue = 0;
      currentDueDate = todayStr;
    }
  }

  // Arrears rollover: if past installments had unpaid dues, sum them
  let accumulatedPastUnpaid = 0;
  let passedCurrent = false;
  for (const inst of updatedInstallments) {
    const unpaid = Math.max(0, (Number(inst.amount) || 0) - (Number(inst.amountPaid) || 0));
    if (inst.dueDate === currentDueDate) {
      passedCurrent = true;
      continue;
    }
    if (!passedCurrent && inst.dueDate < todayStr) {
      accumulatedPastUnpaid += unpaid;
    }
  }

  previousArrears = accumulatedPastUnpaid;

  // Total payable before due date: cannot exceed total remaining balance
  const totalPayableBeforeDue = Math.min(totalBalance, currentInstallmentDue + previousArrears);
  const lateFeeFine = totalBalance > 0 ? 500 : 0;
  const totalPayableAfterDue = totalBalance > 0 ? totalPayableBeforeDue + lateFeeFine : 0;
  const advanceBalance = remainingPaidCredit > 0 ? remainingPaidCredit : 0;

  const monthlyTuition = Number(student.monthlyFee) || (totalInstallmentsCount > 0 ? Math.ceil(totalPackage / totalInstallmentsCount) : 0);

  let statusText = "Clear / Fully Paid";
  if (totalBalance > 0) {
    if (previousArrears > 0) {
      statusText = `Arrears Overdue (Rs. ${previousArrears.toLocaleString()})`;
    } else if (isCurrentOverdue) {
      statusText = "Current Installment Overdue";
    } else {
      statusText = "Current Dues Pending";
    }
  }

  return {
    totalPackage,
    feeReceived,
    totalBalance,
    monthlyTuition,
    currentInstallmentDue,
    previousArrears,
    totalPayableBeforeDue,
    lateFeeFine,
    totalPayableAfterDue,
    advanceBalance,
    dueDate: currentDueDate || todayStr,
    isOverdue: isCurrentOverdue,
    installments: updatedInstallments,
    statusText
  };
}
