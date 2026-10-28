import { jsPDF } from 'jspdf';

export interface ChallanOptions {
  collegeName?: string;
  collegeAddress?: string;
  collegeContact?: string;
  bankName?: string;
  accountTitle?: string;
  accountNo?: string;
  branchName?: string;
  issueDate?: string;
  dueDate?: string;
  lateSurcharge?: number;
  challanTitle?: string;
  feeMonth?: string;
}

export function numberToEnglishWords(num: number): string {
  if (num <= 0) return 'Zero Rupees';
  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return `${b[Math.floor(n / 10)]}${n % 10 !== 0 ? ' ' + a[n % 10] : ''}`;
    if (n < 1000)
      return `${a[Math.floor(n / 100)]} Hundred${n % 100 !== 0 ? ' and ' + inWords(n % 100) : ''}`;
    if (n < 100000)
      return `${inWords(Math.floor(n / 1000))} Thousand${n % 1000 !== 0 ? ' ' + inWords(n % 1000) : ''}`;
    if (n < 10000000)
      return `${inWords(Math.floor(n / 100000))} Lakh${n % 100000 !== 0 ? ' ' + inWords(n % 100000) : ''}`;
    return `${inWords(Math.floor(n / 10000000))} Crore${n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : ''}`;
  }

  return `${inWords(Math.floor(num))} Rupees Only`;
}

function formatDate(dateObj: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mmm = months[dateObj.getMonth()];
  const yyyy = dateObj.getFullYear();
  return `${dd}-${mmm}-${yyyy}`;
}

export function getDefaultDueDate(): string {
  const now = new Date();
  let targetMonth = now.getMonth();
  let targetYear = now.getFullYear();
  if (now.getDate() > 10) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }
  const due = new Date(targetYear, targetMonth, 10);
  return formatDate(due);
}

export function generate3CopyChallanDoc(
  students: any[],
  options: ChallanOptions = {}
): jsPDF {
  const JsPdfCtor: any = (jsPDF as any).default || jsPDF;
  const doc: jsPDF = new JsPdfCtor({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const studentList = Array.isArray(students) && students.length > 0 ? students : [{}];
  const now = new Date();
  const issueDateStr = options.issueDate || formatDate(now);
  const dueDateStr = options.dueDate || getDefaultDueDate();
  const lateFee = typeof options.lateSurcharge === 'number' ? options.lateSurcharge : 500;

  const collegeName = 'SUPERIOR COLLEGE JAHANIAN';
  const collegeAddress = options.collegeAddress || 'Canal Road, Jahanian';
  const collegeContact = options.collegeContact || 'Tel: 0331-2211147 / 0300-0000000';
  const bankName = options.bankName || 'Habib Bank Limited (HBL)';
  const accountTitle = options.accountTitle || 'Superior College Jahanian';
  const accountNo = options.accountNo || '0123-4567890123';
  const branchName = options.branchName || 'Canal Road Branch (0425)';

  const copyWidth = 91;
  const startX = 8;
  const copyTitles = [
    { title: 'BANK COPY', subtitle: 'To be retained by receiving Bank Branch' },
    { title: 'COLLEGE COPY', subtitle: 'To be submitted to College Accounts Cell' },
    { title: 'STUDENT COPY', subtitle: 'To be preserved by Student / Depositor' },
  ];

  studentList.forEach((student, studentIdx) => {
    if (studentIdx > 0) {
      doc.addPage('a4', 'landscape');
    }

    const sName = student?.fullName || student?.full_name || student?.name || 'Verified Student';
    const fName = student?.fatherName || student?.father_name || 'N/A';
    const rollNo = student?.collegeNo || student?.studentId || student?.rollNumber || student?.id || 'SCJ-0000';
    const prog = student?.group || student?.program || student?.currentClass || student?.category || 'Intermediate';
    const sec = student?.section || 'A';
    const session = student?.session || '2026-28';

    // Financial breakdown
    const totalPkg = Number(student?.totalPackage || student?.total_package || 0);
    const paidSoFar = Number(student?.feeReceived || student?.fee_received || 0);
    const totalRemaining = Math.max(0, totalPkg - paidSoFar);

    const monthlyInstallment = Number(
      student?.monthlyFee ||
        student?.monthly_fee ||
        student?.feeLedger?.monthlyFee ||
        (student?.totalInstallments && student.totalInstallments > 0
          ? Math.round(totalRemaining / student.totalInstallments)
          : Math.min(totalRemaining, 12000))
    );

    const tuitionDue = Math.min(monthlyInstallment || 12000, totalRemaining || 12000);
    const arrears = Number(student?.previousArrears || student?.arrears || 0);
    const examMisc = Number(student?.miscFunds || student?.examFee || 0);
    const totalPayableNow = tuitionDue + arrears + examMisc;
    const totalAfterDue = totalPayableNow + lateFee;

    const challanNo = `SCJ-${now.getFullYear()}-${String(studentIdx + 1).padStart(3, '0')}${String(rollNo).replace(/[^0-9]/g, '').slice(-4) || '101'}`;

    // Draw 3 Side-by-Side Copies
    copyTitles.forEach((cp, copyIdx) => {
      const x = startX + copyIdx * (copyWidth + 4.5);
      const topY = 7;
      const bottomY = 203;
      const h = bottomY - topY;

      // Outer Card Box
      doc.setDrawColor(11, 36, 71);
      doc.setLineWidth(0.35);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, topY, copyWidth, h, 2, 2, 'FD');

      // Top Navy Header Banner
      doc.setFillColor(11, 36, 71);
      doc.rect(x, topY, copyWidth, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(collegeName, x + copyWidth / 2, topY + 5.5, { align: 'center' });
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${collegeAddress} • ${collegeContact}`, x + copyWidth / 2, topY + 9.5, { align: 'center' });

      // Copy Badge
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(x + 1.5, topY + 13, copyWidth - 3, 7.5, 'FD');
      doc.setTextColor(11, 36, 71);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`[ ${cp.title} ]`, x + copyWidth / 2, topY + 17, { align: 'center' });
      doc.setFontSize(4.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(cp.subtitle, x + copyWidth / 2, topY + 19.5, { align: 'center' });

      // Bank Particulars Block
      let curY = topY + 22.5;
      doc.setFillColor(248, 250, 252);
      doc.rect(x + 1.5, curY, copyWidth - 3, 11, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(`Bank: ${bankName}`, x + 3, curY + 4);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Account Title: ${accountTitle}`, x + 3, curY + 7);
      doc.text(`A/C No: ${accountNo} (${branchName})`, x + 3, curY + 9.5);

      // Metadata Bar: Challan No, Issue Date, Due Date
      curY += 12.5;
      doc.setFillColor(239, 246, 255);
      doc.rect(x + 1.5, curY, copyWidth - 3, 9.5, 'F');
      doc.setDrawColor(191, 219, 254);
      doc.setLineWidth(0.2);
      doc.rect(x + 1.5, curY, copyWidth - 3, 9.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(30, 58, 138);
      doc.text(`Challan No: ${challanNo}`, x + 3, curY + 4);
      doc.text(`Session: ${session}`, x + copyWidth - 3, curY + 4, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Issue Date: ${issueDateStr}`, x + 3, curY + 7.5);
      doc.setTextColor(185, 28, 28);
      doc.setFont('helvetica', 'bold');
      doc.text(`Due Date: ${dueDateStr}`, x + copyWidth - 3, curY + 7.5, { align: 'right' });

      // Student Particulars Block
      curY += 11.5;
      const stuRows = [
        ['Roll / College ID:', String(rollNo), 'Class / Program:', `${prog} (Sec ${sec})`],
        ['Student Name:', sName, 'Father Name:', fName],
      ];

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.rect(x + 1.5, curY, copyWidth - 3, 14, 'FD');

      doc.setFontSize(5.5);
      stuRows.forEach((row, rIdx) => {
        const rowY = curY + 4.5 + rIdx * 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(row[0], x + 3, rowY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(String(row[1]).slice(0, 20), x + 24, rowY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(row[2], x + 48, rowY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(String(row[3]).slice(0, 18), x + 66, rowY);
      });

      // Fee Breakdown Table Header
      curY += 16;
      doc.setFillColor(11, 36, 71);
      doc.rect(x + 1.5, curY, copyWidth - 3, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text('Sr', x + 3.5, curY + 3.5);
      doc.text('Fee Particulars / Account Head', x + 10, curY + 3.5);
      doc.text('Amount (PKR)', x + copyWidth - 3, curY + 3.5, { align: 'right' });

      curY += 5;
      const feeItems = [
        { sr: '1', desc: `Tuition / Installment Fee (${options.feeMonth || 'Regular'})`, amt: tuitionDue },
        { sr: '2', desc: 'Examination & Campus Fund', amt: examMisc },
        { sr: '3', desc: 'Previous Arrears / Baqaya Jat', amt: arrears },
      ];

      feeItems.forEach((item, fIdx) => {
        const itemY = curY + fIdx * 5.2;
        doc.setFillColor(fIdx % 2 === 0 ? 255 : 248, fIdx % 2 === 0 ? 255 : 250, fIdx % 2 === 0 ? 255 : 252);
        doc.rect(x + 1.5, itemY, copyWidth - 3, 5.2, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.line(x + 1.5, itemY + 5.2, x + copyWidth - 1.5, itemY + 5.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(51, 65, 85);
        doc.text(item.sr, x + 3.5, itemY + 3.7);
        doc.text(item.desc.slice(0, 32), x + 10, itemY + 3.7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(item.amt > 0 ? `Rs. ${item.amt.toLocaleString()}` : '-', x + copyWidth - 3, itemY + 3.7, {
          align: 'right',
        });
      });

      curY += feeItems.length * 5.2;

      // Total Within Due Date Box
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.3);
      doc.rect(x + 1.5, curY, copyWidth - 3, 7.5, 'FD');
      doc.setTextColor(6, 95, 70);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text('TOTAL PAYABLE (WITHIN DUE DATE):', x + 3.5, curY + 5);
      doc.text(`Rs. ${totalPayableNow.toLocaleString()}`, x + copyWidth - 3, curY + 5, { align: 'right' });

      // Late Surcharge Row
      curY += 8.5;
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      doc.rect(x + 1.5, curY, copyWidth - 3, 5.5, 'FD');
      doc.setTextColor(185, 28, 28);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(`Late Surcharge (After Due Date ${dueDateStr}):`, x + 3.5, curY + 3.8);
      doc.setFont('helvetica', 'bold');
      doc.text(`+ Rs. ${lateFee.toLocaleString()}`, x + copyWidth - 3, curY + 3.8, { align: 'right' });

      // Total After Due Date Row
      curY += 6.5;
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(244, 63, 94);
      doc.rect(x + 1.5, curY, copyWidth - 3, 6.5, 'FD');
      doc.setTextColor(159, 18, 57);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text('TOTAL PAYABLE (AFTER DUE DATE):', x + 3.5, curY + 4.3);
      doc.text(`Rs. ${totalAfterDue.toLocaleString()}`, x + copyWidth - 3, curY + 4.3, { align: 'right' });

      // Words Bar
      curY += 7.5;
      doc.setFillColor(248, 250, 252);
      doc.rect(x + 1.5, curY, copyWidth - 3, 6, 'F');
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.8);
      doc.text('Amount in Words:', x + 3, curY + 3);
      doc.setFont('helvetica', 'normal');
      doc.text(numberToEnglishWords(totalPayableNow).slice(0, 48), x + 23, curY + 3);

      // Notes & Bank Instructions
      curY += 7;
      doc.setFontSize(4.5);
      doc.setTextColor(100, 116, 139);
      doc.text('• Fee is non-refundable / non-transferable once deposited.', x + 3, curY + 3);
      doc.text('• Please verify payment stamp & signature of bank teller before leaving counter.', x + 3, curY + 5.5);
      doc.text('• Online collection valid at all automated branches of HBL across Pakistan.', x + 3, curY + 8);

      // Signature & Stamp Blocks
      curY += 12;
      doc.setDrawColor(203, 213, 225);
      doc.line(x + 4, curY + 12, x + 38, curY + 12);
      doc.line(x + copyWidth - 38, curY + 12, x + copyWidth - 4, curY + 12);

      doc.setFontSize(5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Depositor / Student Signature', x + 21, curY + 15, { align: 'center' });
      doc.text('Cashier / Authorized Bank Stamp', x + copyWidth - 21, curY + 15, { align: 'center' });
    });

    // Draw Perforated / Scissor Divider Lines Between Copies
    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([1.5, 1.5], 0);
    const div1X = startX + copyWidth + 2.25;
    const div2X = startX + 2 * copyWidth + 6.75;
    doc.line(div1X, 8, div1X, 202);
    doc.line(div2X, 8, div2X, 202);

    // Reset dash pattern
    doc.setLineDashPattern([], 0);
  });

  return doc;
}

export async function downloadBankChallanPdf(
  students: any[],
  filename?: string,
  options: ChallanOptions = {}
): Promise<{ success: boolean; count: number; filename: string }> {
  try {
    const list = Array.isArray(students) ? students : [students];
    if (list.length === 0) {
      throw new Error('No student data provided for challan generation.');
    }

    const doc = generate3CopyChallanDoc(list, options);

    let defaultName = 'SCJ_Bank_Fee_Challan.pdf';
    if (list.length === 1) {
      const s = list[0];
      const roll = (s?.collegeNo || s?.studentId || s?.id || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
      const name = (s?.fullName || s?.name || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
      defaultName = `SCJ_Challan_${roll}${name ? `_${name}` : ''}.pdf`;
    } else {
      defaultName = `SCJ_Bulk_Fee_Challans_${list.length}_Students.pdf`;
    }

    const finalName = filename || defaultName;
    doc.save(finalName.endsWith('.pdf') ? finalName : `${finalName}.pdf`);

    return { success: true, count: list.length, filename: finalName };
  } catch (err: any) {
    console.error('[Challan PDF Generator Error]:', err);
    throw err;
  }
}

export interface FeeVoucherOptions {
  collegeName?: string;
  collegeAddress?: string;
  collegeContact?: string;
  issueDate?: string;
  dueDate?: string;
  lateSurcharge?: number;
  feeMonth?: string;
  singleStudentMode?: 'quad_copies' | 'single_slip';
  challanTitle?: string;
  // Installment Mode & Custom Amount options
  installmentMode?: 'fixed_installment' | 'full_balance';
  fixedInstallmentAmount?: number; // e.g. 5000
}

/**
 * Draws a single landscape fee voucher (width 138mm x height 95mm).
 * Strictly College Branded (Superior College Jahanian).
 * High focus on College Branding, Student Details, Total Remaining Balance, and Monthly Installment.
 */
function drawSingleCollegeSlipLandscape(
  doc: jsPDF,
  student: any,
  x: number,
  y: number,
  studentIdx: number,
  options: FeeVoucherOptions = {},
  copyBadgeText?: string
) {
  const collegeName = 'SUPERIOR COLLEGE JAHANIAN';
  const collegeAddress = options.collegeAddress || 'Canal Road Campus, Jahanian';
  const collegeContact = options.collegeContact || 'Accounts Desk: 0331-2211147';
  const issueDateStr = options.issueDate || formatDate(new Date());
  const dueDateStr = options.dueDate || getDefaultDueDate();
  const lateFee = typeof options.lateSurcharge === 'number' ? options.lateSurcharge : 500;
  const feeMonth = options.feeMonth || 'Monthly Installment';

  const sName = String(student?.fullName || student?.full_name || student?.name || 'Verified Student');
  const fName = String(student?.fatherName || student?.father_name || 'N/A');
  const rollNo = String(student?.collegeNo || student?.studentId || student?.rollNumber || student?.id || 'SCJ-0000');
  const prog = String(student?.group || student?.program || student?.currentClass || student?.category || 'Intermediate');
  const sec = String(student?.section || 'A');
  const shift = student?.gender === 'Female' ? 'Girls Campus' : 'Boys Campus';
  const session = String(student?.session || '2026-28');

  // Financial breakdown
  const totalPkg = Number(student?.totalPackage || student?.total_package || 0);
  const paidSoFar = Number(student?.feeReceived || student?.fee_received || 0);
  const totalRemaining = Math.max(0, totalPkg - paidSoFar);

  // Installment amount logic:
  // If user specified fixed installment (e.g. 5000):
  // - If student's total remaining balance <= fixed installment: charge actual remaining balance!
  // - If student owes more: charge fixed installment!
  // If full_balance mode: charge total remaining balance!
  let currentPayable = 0;
  let installmentSubtext = '';

  if (options.installmentMode === 'fixed_installment' && typeof options.fixedInstallmentAmount === 'number' && options.fixedInstallmentAmount > 0) {
    const target = options.fixedInstallmentAmount;
    if (totalRemaining <= target) {
      currentPayable = totalRemaining;
      installmentSubtext = totalRemaining > 0 
        ? 'Full Remaining Arrears (Final Settlement)' 
        : 'Account Fully Cleared (No Dues)';
    } else {
      currentPayable = target;
      const leftOver = totalRemaining - target;
      installmentSubtext = `Monthly Installment • Remaining Balance: Rs. ${leftOver.toLocaleString()}`;
    }
  } else {
    currentPayable = totalRemaining;
    installmentSubtext = totalRemaining > 0
      ? 'Total Outstanding Balance Due'
      : 'Account Fully Cleared (No Dues)';
  }

  const totalAfterDue = currentPayable + (currentPayable > 0 ? lateFee : 0);
  const voucherNo = `SCJ-${new Date().getFullYear()}-${String(studentIdx + 1).padStart(3, '0')}${String(rollNo).replace(/[^0-9]/g, '').slice(-4) || '101'}`;

  // 1. Outer Card Rounded Box (138mm x 95mm)
  doc.setDrawColor(8, 90, 78); // Superior Teal
  doc.setLineWidth(0.35);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, 138, 95, 2, 2, 'FD');

  // 2. Top Header Banner (Superior Emerald Green + Gold accent)
  doc.setFillColor(6, 78, 59); // Emerald-900
  doc.rect(x + 0.3, y + 0.3, 137.4, 13.5, 'F');
  // Gold accent line
  doc.setFillColor(217, 119, 6); // Superior Gold
  doc.rect(x + 0.3, y + 13.8, 137.4, 0.8, 'F');

  // College Name & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(collegeName, x + 5, y + 5.5);

  doc.setFontSize(6.5);
  doc.setTextColor(254, 240, 138); // Soft Gold
  const voucherTitle = copyBadgeText
    ? `OFFICIAL STUDENT FEE VOUCHER (${copyBadgeText.toUpperCase()})`
    : `OFFICIAL STUDENT FEE VOUCHER • ${feeMonth.toUpperCase()}`;
  doc.text(voucherTitle, x + 5, y + 9.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(226, 232, 240);
  doc.text(`${collegeAddress} • ${collegeContact}`, x + 5, y + 12.3);

  // Top-Right Metadata Badge (Dates & Voucher #)
  doc.setFillColor(4, 120, 87);
  doc.roundedRect(x + 92, y + 1.8, 43, 10.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Vch: ${voucherNo}`, x + 94, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text(`Issue: ${issueDateStr}`, x + 94, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(254, 202, 202); // Light red
  doc.text(`Due: ${dueDateStr}`, x + 94, y + 11);

  // 3. Sub-strip bar (Shift & Session)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(x + 1, y + 15, 136, 4.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(8, 90, 78);
  doc.text(`CAMPUS: ${shift.toUpperCase()}`, x + 3, y + 18.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`SESSION: ${session}`, x + 50, y + 18.2);
  doc.setTextColor(15, 23, 42);
  doc.text('PAYMENT MODE: CASH AT ACCOUNTS DESK', x + 135, y + 18.2, { align: 'right' });

  // 4. Two Clean Columns (Left: Student Details | Right: Fee & Balance Details)
  const contentY = y + 21;
  const colHeight = 58;

  // --- LEFT COLUMN: STUDENT INFORMATION ---
  const leftColW = 65;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(x + 1.5, contentY, leftColW, colHeight, 1.2, 1.2, 'FD');

  // Left Column Title Strip
  doc.setFillColor(241, 245, 249);
  doc.rect(x + 1.5, contentY, leftColW, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(8, 90, 78);
  doc.text('STUDENT INFORMATION', x + 3.5, contentY + 3.5);

  // Roll Number Badge (Prominent top right of student card)
  doc.setFillColor(8, 90, 78);
  doc.roundedRect(x + leftColW - 25, contentY + 1, 24, 4.2, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Roll: ${rollNo}`, x + leftColW - 13, contentY + 3.8, { align: 'center' });

  // Student Particulars Rows
  let sY = contentY + 9;
  const drawStudentRow = (label: string, value: string, isBoldVal = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.3);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 3.5, sY);

    doc.setFont('helvetica', isBoldVal ? 'bold' : 'normal');
    doc.setFontSize(isBoldVal ? 6.8 : 5.8);
    doc.setTextColor(15, 23, 42);
    doc.text(value.slice(0, 28), x + 20, sY);
    sY += 5.2;
  };

  drawStudentRow('Student Name:', sName, true);
  drawStudentRow('Father Name:', fName);
  drawStudentRow('Class/Group:', prog);
  drawStudentRow('Section:', `Section ${sec}`);
  drawStudentRow('Campus Shift:', shift);
  drawStudentRow('Session:', session);

  // Student Signature Box at bottom of left column
  const sigBoxY = contentY + 44;
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(x + 4, sigBoxY + 8, x + 38, sigBoxY + 8);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Student / Depositor Signature', x + 21, sigBoxY + 11.5, { align: 'center' });

  // --- RIGHT COLUMN: FEE & REMAINING DUES ---
  const rightColX = x + 68;
  const rightColW = 68.5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightColX, contentY, rightColW, colHeight, 1.2, 1.2, 'FD');

  // Right Column Title Strip
  doc.setFillColor(241, 245, 249);
  doc.rect(rightColX, contentY, rightColW, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(8, 90, 78);
  doc.text('FEE DETAILS & REMAINING BALANCE', rightColX + 2.5, contentY + 3.5);

  let fY = contentY + 9;
  // Row 1: Total Course Package
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.3);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Course Package:', rightColX + 2.5, fY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${totalPkg.toLocaleString()}`, rightColX + rightColW - 2.5, fY, { align: 'right' });

  // Row 2: Total Received Till Date
  fY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Total Paid (Till Date):', rightColX + 2.5, fY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(`Rs. ${paidSoFar.toLocaleString()}`, rightColX + rightColW - 2.5, fY, { align: 'right' });

  // Row 3: Total Remaining Amount (Highlight Rose/Red)
  fY += 4.5;
  doc.setFillColor(255, 241, 242);
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(rightColX + 1.5, fY - 3.2, rightColW - 3, 5, 0.8, 0.8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(190, 18, 60);
  doc.text('TOTAL REMAINING BALANCE:', rightColX + 2.5, fY + 0.3);
  doc.setFontSize(6.8);
  doc.text(`Rs. ${totalRemaining.toLocaleString()}`, rightColX + rightColW - 2.5, fY + 0.3, { align: 'right' });

  // Big Highlight Box: Current Payable Amount / Installment (The core focus)
  const payableBoxY = fY + 3.5;
  doc.setFillColor(236, 253, 245); // Emerald-50
  doc.setDrawColor(5, 150, 105); // Emerald-600
  doc.setLineWidth(0.35);
  doc.roundedRect(rightColX + 1.5, payableBoxY, rightColW - 3, 14.5, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.6);
  doc.setTextColor(6, 95, 70);
  const payableTitle = options.installmentMode === 'fixed_installment'
    ? 'CURRENT PAYABLE INSTALLMENT:'
    : 'PAYABLE AMOUNT (THIS VOUCHER):';
  doc.text(payableTitle, rightColX + 3.5, payableBoxY + 4.2);

  doc.setFontSize(11);
  doc.setTextColor(4, 120, 87);
  doc.text(`Rs. ${currentPayable.toLocaleString()}/-`, rightColX + rightColW - 3.5, payableBoxY + 5.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.7);
  doc.setTextColor(15, 118, 110);
  doc.text(installmentSubtext.slice(0, 48), rightColX + 3.5, payableBoxY + 11.8);

  // Late Fee Box (After Due Date)
  const lateBoxY = payableBoxY + 16;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(248, 113, 113);
  doc.roundedRect(rightColX + 1.5, lateBoxY, rightColW - 3, 6, 0.8, 0.8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(185, 28, 28);
  doc.text(`After Due Date (+Rs. ${lateFee} Late Fine):`, rightColX + 3.5, lateBoxY + 4);
  doc.setFontSize(6.5);
  doc.text(`Rs. ${totalAfterDue.toLocaleString()}/-`, rightColX + rightColW - 3.5, lateBoxY + 4.2, { align: 'right' });

  // Cash Desk Stamp Box in Right Column Bottom
  const stampBoxY = lateBoxY + 7.5;
  doc.setDrawColor(8, 90, 78);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rightColX + 1.5, stampBoxY, rightColW - 3, 10.5, 1, 1, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(8, 90, 78);
  doc.text('ACCOUNTS CASH DESK • SUPERIOR COLLEGE', rightColX + rightColW / 2, stampBoxY + 3.8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Fee Received & Verified Stamp Box', rightColX + rightColW / 2, stampBoxY + 8, { align: 'center' });

  // 5. Very Bottom Footer Note inside card
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Note: Please deposit fee in cash at college accounts counter on or before due date.', x + 69, y + 92, { align: 'center' });
}

/**
 * Generates an A4 Landscape document containing 4 vouchers per page (2x2 grid) with dashed cut lines.
 * Strictly in Landscape orientation (297mm x 210mm).
 */
export function generate4VouchersPerPageDoc(
  students: any[],
  options: FeeVoucherOptions = {}
): jsPDF {
  const JsPdfCtor: any = (jsPDF as any).default || jsPDF;
  // A4 Landscape: Width = 297mm, Height = 210mm
  const doc: jsPDF = new JsPdfCtor({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const studentList = Array.isArray(students) && students.length > 0 ? students : [{}];
  const isSingleStudentQuad = studentList.length === 1 && options.singleStudentMode === 'quad_copies';

  const singleCopyBadges = ['College Copy', 'Accounts Copy', 'Student Copy', 'Admin Record'];

  // Coords for 2x2 grid on A4 Landscape (297mm x 210mm)
  // Col 0: x = 7, Width = 138 -> ends at 145mm
  // Center cut line: x = 148.5mm
  // Col 1: x = 152, Width = 138 -> ends at 290mm
  // Row 0: y = 6, Height = 95 -> ends at 101mm
  // Center cut line: y = 105mm
  // Row 1: y = 108, Height = 95 -> ends at 203mm
  const quadCoords = [
    { x: 7, y: 6 },
    { x: 152, y: 6 },
    { x: 7, y: 108 },
    { x: 152, y: 108 },
  ];

  const drawCutLines = () => {
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([2, 2], 0);

    // Vertical cut line (X = 148.5mm)
    doc.line(148.5, 3, 148.5, 207);

    // Horizontal cut line (Y = 105mm)
    doc.line(3, 105, 294, 105);

    doc.setLineDashPattern([], 0);

    // Scissors glyphs & instructions on center lines
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);

    // Top vertical guide
    doc.text('-- ✂ CUT HERE --', 148.5, 4.5, { align: 'center' });
    // Center vertical guide
    doc.text('-- ✂ --', 148.5, 104, { align: 'center' });
    // Bottom vertical guide
    doc.text('-- ✂ CUT HERE --', 148.5, 208.5, { align: 'center' });

    // Horizontal guide left & right
    doc.text('✂ CUT', 4.5, 104);
    doc.text('CUT ✂', 288, 104);
  };

  if (isSingleStudentQuad) {
    // Single student with 4 copies on 1 Landscape A4 sheet
    const student = studentList[0];
    quadCoords.forEach((c, idx) => {
      drawSingleCollegeSlipLandscape(doc, student, c.x, c.y, 0, options, singleCopyBadges[idx]);
    });
    drawCutLines();
    return doc;
  }

  // Multi-student batch layout: 4 students per Landscape A4 page
  const totalPages = Math.ceil(studentList.length / 4);

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) {
      doc.addPage('a4', 'landscape');
    }

    const pageStudents = studentList.slice(p * 4, p * 4 + 4);

    pageStudents.forEach((student, idx) => {
      const overallIdx = p * 4 + idx;
      drawSingleCollegeSlipLandscape(doc, student, quadCoords[idx].x, quadCoords[idx].y, overallIdx, options);
    });

    drawCutLines();
  }

  return doc;
}

/**
 * Triggers instant vector PDF download for 4-per-page College Fee Vouchers in Landscape.
 */
export async function download4VouchersPerPagePdf(
  students: any[],
  filename?: string,
  options: FeeVoucherOptions = {}
): Promise<{ success: boolean; count: number; filename: string }> {
  try {
    const list = Array.isArray(students) ? students : [students];
    if (list.length === 0) {
      throw new Error('No student data provided for fee voucher generation.');
    }

    const doc = generate4VouchersPerPageDoc(list, options);

    let defaultName = 'SCJ_Fee_Vouchers_4perPage_Landscape.pdf';
    if (list.length === 1) {
      const s = list[0];
      const roll = String(s?.collegeNo || s?.studentId || s?.id || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
      const name = String(s?.fullName || s?.name || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
      defaultName = `SCJ_Fee_Voucher_${roll}${name ? `_${name}` : ''}.pdf`;
    } else {
      defaultName = `SCJ_Fee_Vouchers_${list.length}_Students_Landscape.pdf`;
    }

    const finalName = filename || defaultName;
    doc.save(finalName.endsWith('.pdf') ? finalName : `${finalName}.pdf`);

    return { success: true, count: list.length, filename: finalName };
  } catch (err: any) {
    console.error('[Fee Voucher PDF Generator Error]:', err);
    throw err;
  }
}
