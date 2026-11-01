const fs = require('fs');

let content = fs.readFileSync('src/components/BankChallanModal.tsx', 'utf8');

if (!content.includes('voucherRegistry')) {
  content = content.replace(
    "import { toast } from 'sonner';",
    "import { toast } from 'sonner';\nimport { registerIssuedVouchers, IssuedVoucher } from '../utils/voucherRegistry';"
  );
}

const persistHelper = `
  // Register generated vouchers into persistent audit registry
  const persistGeneratedVouchers = (studentList: any[]) => {
    try {
      const records: IssuedVoucher[] = studentList.map((st) => {
        const vchId = getVoucherId(st);
        const sTotalPkg = Number(st.totalPackage || 0);
        const sPaid = Number(st.feeReceived || 0);
        const sRemaining = Math.max(0, sTotalPkg - sPaid);
        let payable = sRemaining;
        if (installmentMode === 'fixed_installment' && fixedInstallmentAmount > 0) {
          payable = sRemaining <= fixedInstallmentAmount ? sRemaining : fixedInstallmentAmount;
        }
        const isCleared = sRemaining <= 200;
        return {
          id: vchId,
          studentId: st.id,
          studentName: st.fullName || st.name || 'Student',
          fatherName: st.fatherName || 'N/A',
          collegeNo: st.collegeNo || st.id,
          section: st.section || 'General',
          campus: st.gender === 'Female' ? 'Girls Campus' : 'Boys Campus',
          feeMonth,
          amountBilled: payable,
          issueDate,
          dueDate,
          lateSurcharge,
          status: isCleared ? 'COLLECTED' : 'ISSUED',
          collectedAmount: isCleared ? sPaid : 0,
          collectedDate: isCleared ? issueDate : undefined,
          createdAt: new Date().toISOString()
        };
      });
      registerIssuedVouchers(records);
    } catch (e) {
      console.error('Error logging issued vouchers:', e);
    }
  };
`;

if (!content.includes('persistGeneratedVouchers =')) {
  content = content.replace(
    "  // Download Action\n  const handleDownloadPdf = async () => {",
    `${persistHelper}\n  // Download Action\n  const handleDownloadPdf = async () => {`
  );
}

// In handleDownloadPdf, persist
if (!content.includes('persistGeneratedVouchers(displayedStudents);\n      await download4VouchersPerPagePdf')) {
  content = content.replace(
    "await download4VouchersPerPagePdf(displayedStudents,",
    "persistGeneratedVouchers(displayedStudents);\n      await download4VouchersPerPagePdf(displayedStudents,"
  );
}

// In handlePrint, persist
if (!content.includes('persistGeneratedVouchers(displayedStudents);\n      const doc = generate4VouchersPerPageDoc')) {
  content = content.replace(
    "const doc = generate4VouchersPerPageDoc(displayedStudents,",
    "persistGeneratedVouchers(displayedStudents);\n      const doc = generate4VouchersPerPageDoc(displayedStudents,"
  );
}

fs.writeFileSync('src/components/BankChallanModal.tsx', content, 'utf8');
console.log('Successfully updated BankChallanModal.tsx!');
