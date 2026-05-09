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

  return allTx.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
