import { Installment } from '../types';
import { detectEducationalStream } from './academicMasterData';

export interface StudentFeeBreakdown {
  totalPackage: number;
  totalReceived: number;
  totalBalance: number;
  monthlyTuition: number;
  currentInstallmentDue: number;
  previousArrears: number;
  totalPayableBeforeDue: number;
  installments: Installment[];
}

export function getDefaultInstallmentCount(student: any): number {
  const explicitCount = Number(
    student?.totalInstallments ??
      student?.total_installments ??
      student?.feeLedger?.totalInstallments ??
      0
  );
  if (explicitCount > 0) return explicitCount;

  const stream = detectEducationalStream(student);
  const plan = String(student?.paymentPlan || student?.payment_plan || '').toLowerCase();
  if (plan === 'semester' || stream === 'bs' || stream === 'ads') {
    return 2; // Standard 2 installments per semester unless specified otherwise
  }
  if (stream === 'dit' || stream === 'ukl3') {
    return 4;
  }
  return 12;
}

export function generateInstallmentSchedule(
  totalPackage: number,
  totalReceived: number,
  count: number,
  startDateStr?: string
): Installment[] {
  const pkg = Math.max(0, Number(totalPackage || 0));
  const safeCount = Math.max(1, Number(count || 12));
  if (pkg <= 0) return [];

  const baseDate = startDateStr ? new Date(startDateStr) : new Date();
  const validStart = isNaN(baseDate.getTime()) ? new Date() : baseDate;

  const baseAmount = Math.floor(pkg / safeCount);
  const remainder = pkg - baseAmount * safeCount;

  let paidPool = Math.max(0, Number(totalReceived || 0));
  const todayStr = new Date().toISOString().split('T')[0];

  const schedule: Installment[] = [];
  for (let i = 0; i < safeCount; i++) {
    const instAmount = i === 0 ? baseAmount + remainder : baseAmount;
    const dueObj = new Date(validStart);
    dueObj.setMonth(dueObj.getMonth() + i);
    const dueDate = dueObj.toISOString().split('T')[0];

    if (paidPool >= instAmount && instAmount > 0) {
      paidPool -= instAmount;
      schedule.push({
        id: `inst-${i + 1}`,
        amount: instAmount,
        amountPaid: instAmount,
        dueDate,
        status: 'Paid',
        paidDate: todayStr,
      });
    } else if (paidPool > 0) {
      const partialPaid = paidPool;
      paidPool = 0;
      schedule.push({
        id: `inst-${i + 1}`,
        amount: instAmount,
        amountPaid: partialPaid,
        dueDate,
        status: dueDate < todayStr ? 'Overdue' : 'Unpaid',
      });
    } else {
      schedule.push({
        id: `inst-${i + 1}`,
        amount: instAmount,
        amountPaid: 0,
        dueDate,
        status: dueDate < todayStr ? 'Overdue' : 'Unpaid',
      });
    }
  }

  return schedule;
}

export function calculateStudentFeeBreakdown(student: any): StudentFeeBreakdown {
  const totalPackage = Math.max(0, Number(student?.totalPackage ?? student?.total_package ?? 0));
  const totalReceived = Math.max(
    0,
    Number(student?.feeReceived ?? student?.fee_received ?? 0)
  );
  const totalBalance = Math.max(0, totalPackage - totalReceived);

  const installmentCount = getDefaultInstallmentCount(student);

  const rawInstallments: Installment[] =
    student?.feeLedger?.installments &&
    Array.isArray(student.feeLedger.installments) &&
    student.feeLedger.installments.length > 0
      ? student.feeLedger.installments
      : Array.isArray(student?.installments) && student.installments.length > 0
      ? student.installments
      : generateInstallmentSchedule(
          totalPackage,
          totalReceived,
          installmentCount,
          student?.date || student?.dateApplied || student?.createdAt || student?.created_at
        );

  const todayStr = new Date().toISOString().split('T')[0];
  let remainingPaidPool = totalReceived;

  const updatedInstallments: Installment[] = rawInstallments.map((inst, idx) => {
    const amount = Math.max(0, Number(inst.amount || 0));
    const dueDate = inst.dueDate || todayStr;
    if (remainingPaidPool >= amount && amount > 0) {
      remainingPaidPool -= amount;
      return {
        ...inst,
        id: inst.id || `inst-${idx + 1}`,
        amount,
        amountPaid: amount,
        dueDate,
        status: 'Paid' as const,
        paidDate: inst.paidDate || todayStr,
      };
    } else if (remainingPaidPool > 0) {
      const partialPaid = remainingPaidPool;
      remainingPaidPool = 0;
      return {
        ...inst,
        id: inst.id || `inst-${idx + 1}`,
        amount,
        amountPaid: partialPaid,
        dueDate,
        status: (dueDate < todayStr ? 'Overdue' : 'Unpaid') as 'Overdue' | 'Unpaid',
      };
    }
    return {
      ...inst,
      id: inst.id || `inst-${idx + 1}`,
      amount,
      amountPaid: 0,
      dueDate,
      status: (dueDate < todayStr || inst.status === 'Overdue' ? 'Overdue' : 'Unpaid') as 'Overdue' | 'Unpaid',
    };
  });

  const explicitMonthly = Number(student?.monthlyFee ?? student?.monthly_fee ?? 0);
  const effectiveCount = updatedInstallments.length > 0 ? updatedInstallments.length : installmentCount;
  const monthlyTuition =
    explicitMonthly > 0
      ? explicitMonthly
      : totalBalance > 0
      ? Math.ceil(totalBalance / Math.max(1, effectiveCount))
      : 0;

  const pendingInstallments = updatedInstallments.filter((i) => i.status !== 'Paid');
  const firstPending = pendingInstallments[0];
  const firstPendingRemaining = firstPending
    ? Math.max(0, Number(firstPending.amount || 0) - Number(firstPending.amountPaid || 0))
    : 0;

  let currentInstallmentDue =
    firstPendingRemaining > 0
      ? firstPendingRemaining
      : Math.min(totalBalance, monthlyTuition || totalBalance);

  if (currentInstallmentDue > totalBalance) {
    currentInstallmentDue = totalBalance;
  }

  // Explicit carried-forward arrears + any prior overdue installments (excluding currentInstallmentDue)
  const explicitArrears = Math.max(
    0,
    Number(
      student?.previousArrears ??
        student?.previous_arrears ??
        student?.feeLedger?.previousArrears ??
        0
    )
  );

  const overdueInstallments = pendingInstallments.filter(
    (i) => i.dueDate && i.dueDate < todayStr
  );

  let overdueSum = 0;
  if (overdueInstallments.length > 1) {
    // Sum all overdue installments except the current one already counted in currentInstallmentDue
    overdueSum = overdueInstallments
      .slice(1)
      .reduce((acc, item) => acc + Math.max(0, Number(item.amount || 0) - Number(item.amountPaid || 0)), 0);
  }

  let previousArrears = Math.max(explicitArrears, overdueSum);
  if (previousArrears + currentInstallmentDue > totalBalance) {
    previousArrears = Math.max(0, totalBalance - currentInstallmentDue);
  }

  const totalPayableBeforeDue = Math.min(totalBalance, currentInstallmentDue + previousArrears);

  return {
    totalPackage,
    totalReceived,
    totalBalance,
    monthlyTuition,
    currentInstallmentDue,
    previousArrears,
    totalPayableBeforeDue: totalPayableBeforeDue > 0 ? totalPayableBeforeDue : totalBalance,
    installments: updatedInstallments,
  };
}
