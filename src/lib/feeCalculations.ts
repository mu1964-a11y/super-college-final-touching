import { Installment } from '../types';

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

export function calculateStudentFeeBreakdown(student: any): StudentFeeBreakdown {
  const totalPackage = Math.max(0, Number(student?.totalPackage ?? student?.total_package ?? 0));
  const totalReceived = Math.max(
    0,
    Number(student?.feeReceived ?? student?.fee_received ?? student?.admissionFee ?? 0)
  );
  const totalBalance = Math.max(0, totalPackage - totalReceived);

  const rawInstallments: Installment[] =
    student?.feeLedger?.installments && Array.isArray(student.feeLedger.installments)
      ? student.feeLedger.installments
      : Array.isArray(student?.installments)
      ? student.installments
      : [];

  let remainingPaidPool = totalReceived;
  const updatedInstallments: Installment[] = rawInstallments.map((inst, idx) => {
    const amount = Math.max(0, Number(inst.amount || 0));
    if (remainingPaidPool >= amount && amount > 0) {
      remainingPaidPool -= amount;
      return {
        ...inst,
        status: 'Paid' as const,
        paidDate: inst.paidDate || new Date().toISOString().split('T')[0],
      };
    } else if (remainingPaidPool > 0) {
      remainingPaidPool = 0;
      return {
        ...inst,
        status: 'Partial' as const,
      };
    }
    return {
      ...inst,
      id: inst.id || `inst-${idx + 1}`,
      status: inst.status === 'Overdue' ? ('Overdue' as const) : ('Pending' as const),
    };
  });

  const explicitMonthly = Number(student?.monthlyFee ?? student?.monthly_fee ?? 0);
  const installmentCount = updatedInstallments.length > 0 ? updatedInstallments.length : 10;
  const monthlyTuition =
    explicitMonthly > 0
      ? explicitMonthly
      : totalBalance > 0
      ? Math.round(totalBalance / Math.max(1, installmentCount))
      : 0;

  const pendingInstallments = updatedInstallments.filter((i) => i.status !== 'Paid');
  let currentInstallmentDue =
    pendingInstallments.length > 0
      ? Number(pendingInstallments[0].amount || monthlyTuition)
      : Math.min(totalBalance, monthlyTuition || totalBalance);

  if (currentInstallmentDue > totalBalance) {
    currentInstallmentDue = totalBalance;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueInstallments = pendingInstallments.filter(
    (i) => i.dueDate && i.dueDate < todayStr
  );
  let previousArrears = 0;
  if (overdueInstallments.length > 1) {
    previousArrears = overdueInstallments
      .slice(0, -1)
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);
  }
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
