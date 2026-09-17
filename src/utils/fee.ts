export const getUnifiedTransactions = (student: any) => {
  if (!student) return [];
  const transactions = student.feeLedger?.transactions || [];
  const history = student.feeHistory || [];

  const txReceipts = new Set(transactions.map((tx: any) => tx.receiptId).filter(Boolean));
  // Fallback signature for when receiptId is missing but we want to avoid exact dupes matching legacy
  const txSignatures = new Set(transactions.map((tx: any) => `${tx.amount}-${new Date(tx.date).getTime()}`));
  
  const uniqueHistory = history.filter((h: any) => {
     if (!h.amountPaid || !h.datePaid) return false;
     if (h.receiptId && txReceipts.has(h.receiptId)) return false;
     
     // Legacy signature check (only if receiptId wasn't present)
     const sig = `${h.amountPaid}-${new Date(h.datePaid).getTime()}`;
     if (txSignatures.has(sig)) return false;

     return true;
  }).map((h: any) => ({
    id: h.id || `legacy-${Date.now()}-${Math.random()}`,
    date: h.datePaid || new Date().toISOString(),
    amount: h.amountPaid || 0,
    description: h.feeType || `Installment (${h.month} ${h.year})`,
    paymentMethod: h.paymentMethod || 'Cash',
    receiptId: h.receiptId || `REC-LEG-${Math.floor(Math.random()*1000)}`,
    recordedBy: h.collectedBy || 'System',
    isLegacy: true
  }));

  const allTx = [...transactions, ...uniqueHistory];

  // Auto-synthesize initial admission deposit if totalReceived exceeds transaction sum
  const totalFromTxs = allTx.reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);
  const totalReceived = Number(student.feeReceived || student.feeLedger?.totalReceived || 0);

  if (totalReceived > totalFromTxs) {
    const difference = totalReceived - totalFromTxs;
    allTx.push({
      id: `tx-adm-init-${student.id || student.studentId || 'fee'}`,
      date: student.admissionDate || student.dateOfAdmission || student.created_at || student.date || new Date().toISOString().split('T')[0],
      amount: difference,
      description: "Admission / Initial Fee",
      paymentMethod: "CASH PAYMENT",
      receiptId: `REC-ADM-${String(student.collegeNo || student.id || '').slice(-6)}`,
      recordedBy: "Admission Desk",
      isLegacy: false
    });
  }

  return allTx.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
