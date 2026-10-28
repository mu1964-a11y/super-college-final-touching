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
        ['Roll / College ID:', String(rollNo), 'Class / Program:', `${prog} (${sec})`],
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
 * Draws a single full-width horizontal fee voucher row (width 200mm x height 67mm).
 * Strictly College Branded (Superior College Jahanian).
 * 4 horizontal rows fit perfectly on 1 standard A4 sheet without column squishing.
 * High-contrast, pitch-dark, large bold fonts for crystal-clear printing on any laser printer/photocopier.
 */
function drawSingleCollegeSlipRow(
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
  const rawSec = String(student?.section || 'A');
  const sec = rawSec.replace(/^(sec|section)\s*[:-]?\s*/i, '').trim() || 'A';
  const shift = student?.gender === 'Female' ? 'Girls Campus' : 'Boys Campus';
  const session = String(student?.session || '2026-28');

  // Financial breakdown
  const totalPkg = Number(student?.totalPackage || student?.total_package || 0);
  const paidSoFar = Number(student?.feeReceived || student?.fee_received || 0);
  const totalRemaining = Math.max(0, totalPkg - paidSoFar);

  // Installment calculation with smart fallback:
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

  // 1. Outer Card Rounded Box (200mm wide x 67mm tall)
  doc.setDrawColor(6, 78, 59); // Deep Emerald Border
  doc.setLineWidth(0.4);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, 200, 67, 2, 2, 'FD');

  // 2. Top Header Banner (Superior Emerald Green + Gold accent)
  doc.setFillColor(6, 78, 59); // Emerald-900
  doc.rect(x + 0.3, y + 0.3, 199.4, 11, 'F');
  // Gold accent line
  doc.setFillColor(217, 119, 6); // Superior Gold
  doc.rect(x + 0.3, y + 11.3, 199.4, 0.8, 'F');

  // College Name (Large Bold 12pt White Font)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(collegeName, x + 4, y + 5.5);

  // Subtitle / Fee Head
  doc.setFontSize(7.5);
  doc.setTextColor(254, 240, 138); // Soft Gold
  const voucherTitle = copyBadgeText
    ? `OFFICIAL STUDENT FEE VOUCHER • ${copyBadgeText.toUpperCase()}`
    : `OFFICIAL STUDENT FEE VOUCHER • ${feeMonth.toUpperCase()}`;
  doc.text(voucherTitle, x + 4, y + 9.5);

  // Campus Address & Contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(241, 245, 249);
  doc.text(`${collegeAddress} • ${collegeContact}`, x + 88, y + 5.5);

  // Right-side Metadata Strip inside Header
  doc.setFillColor(4, 120, 87);
  doc.roundedRect(x + 144, y + 1.2, 53, 9, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Vch: ${voucherNo}`, x + 146, y + 4.2);
  doc.setFontSize(6);
  doc.text(`Issue: ${issueDateStr}`, x + 146, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(254, 240, 138); // Light Gold for due date
  doc.text(`Due: ${dueDateStr}`, x + 195, y + 6.2, { align: 'right' });

  // 3. Main Row Content: 3 Horizontal Panels across 200mm
  const contentY = y + 13.5;
  const panelHeight = 44.5;

  // --- PANEL 1: STUDENT PARTICULARS (Width: 68mm) ---
  const p1X = x + 1.5;
  const p1W = 67;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(100, 116, 139); // Dark slate border
  doc.setLineWidth(0.3);
  doc.roundedRect(p1X, contentY, p1W, panelHeight, 1.2, 1.2, 'FD');

  // Title Strip
  doc.setFillColor(241, 245, 249);
  doc.rect(p1X, contentY, p1W, 4.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(6, 78, 59);
  doc.text('STUDENT INFORMATION', p1X + 2.5, contentY + 3.2);

  // Roll Number Badge
  doc.setFillColor(6, 78, 59);
  doc.roundedRect(p1X + p1W - 25, contentY + 0.8, 23.5, 3.8, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(255, 255, 255);
  doc.text(`Roll: ${rollNo}`, p1X + p1W - 13.2, contentY + 3.4, { align: 'center' });

  // Student Particulars Rows (Large, Dark, Bold)
  let sY = contentY + 8.5;
  const drawStudentRow = (label: string, value: string, isBig = false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isBig ? 6.5 : 6);
    doc.setTextColor(30, 41, 59); // Dark slate
    doc.text(label, p1X + 2.5, sY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isBig ? 9.5 : 7.2);
    doc.setTextColor(0, 0, 0); // Pure pitch-black for maximum contrast!
    doc.text(value.slice(0, 30), p1X + 22, sY);
    sY += isBig ? 5.5 : 4.8;
  };

  drawStudentRow('Student:', sName, true);
  drawStudentRow('Father:', fName);
  drawStudentRow('Class/Grp:', prog);
  drawStudentRow('Section:', `${sec} • ${shift}`);
  drawStudentRow('Session:', session);

  // Depositor signature line in student panel bottom
  doc.setDrawColor(100, 116, 139);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(p1X + 3, contentY + 37, p1X + 38, contentY + 37);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Depositor / Student Sign', p1X + 20.5, contentY + 41, { align: 'center' });

  // --- PANEL 2: FEE DETAILS & REMAINING DUES (Width: 80mm) ---
  const p2X = x + 70;
  const p2W = 79;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.roundedRect(p2X, contentY, p2W, panelHeight, 1.2, 1.2, 'FD');

  // Title Strip
  doc.setFillColor(241, 245, 249);
  doc.rect(p2X, contentY, p2W, 4.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(6, 78, 59);
  doc.text('FEE SUMMARY & TOTAL REMAINING DUES', p2X + 2.5, contentY + 3.2);

  let fY = contentY + 8.5;
  // Row 1: Course Package
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Total Course Package:', p2X + 2.5, fY);
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Rs. ${totalPkg.toLocaleString()}`, p2X + p2W - 2.5, fY, { align: 'right' });

  // Row 2: Total Paid
  fY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Total Paid Till Date:', p2X + 2.5, fY);
  doc.setFontSize(7.5);
  doc.setTextColor(4, 120, 87);
  doc.text(`Rs. ${paidSoFar.toLocaleString()}`, p2X + p2W - 2.5, fY, { align: 'right' });

  // Row 3: Total Remaining Balance (Highlighted Rose Box - Crystal Clear!)
  fY += 4.5;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(248, 113, 113);
  doc.roundedRect(p2X + 1.5, fY - 3.2, p2W - 3, 5.2, 0.8, 0.8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(153, 27, 27); // Dark Crimson Red
  doc.text('TOTAL REMAINING BALANCE:', p2X + 3, fY + 0.4);
  doc.setFontSize(8.5);
  doc.text(`Rs. ${totalRemaining.toLocaleString()}`, p2X + p2W - 3, fY + 0.4, { align: 'right' });

  // Big Highlight Box: Current Payable Amount / Installment
  const payableBoxY = fY + 3.8;
  doc.setFillColor(236, 253, 245); // Light Emerald
  doc.setDrawColor(4, 120, 87); // Solid Emerald Border
  doc.setLineWidth(0.4);
  doc.roundedRect(p2X + 1.5, payableBoxY, p2W - 3, 13.5, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(6, 78, 59);
  const payableTitle = options.installmentMode === 'fixed_installment'
    ? 'PAYABLE THIS MONTH (INSTALLMENT):'
    : 'PAYABLE AMOUNT (THIS VOUCHER):';
  doc.text(payableTitle, p2X + 3, payableBoxY + 4.2);

  doc.setFontSize(13);
  doc.setTextColor(4, 120, 87);
  doc.text(`Rs. ${currentPayable.toLocaleString()}/-`, p2X + p2W - 3, payableBoxY + 5.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(6, 95, 70);
  doc.text(installmentSubtext.slice(0, 56), p2X + 3, payableBoxY + 10.8);

  // Late Fee Row
  const lateBoxY = payableBoxY + 14.8;
  doc.setFillColor(255, 241, 242);
  doc.setDrawColor(251, 113, 133);
  doc.roundedRect(p2X + 1.5, lateBoxY, p2W - 3, 5, 0.8, 0.8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(159, 18, 57);
  doc.text(`After Due Date (+Rs. ${lateFee} Late Fine):`, p2X + 3, lateBoxY + 3.5);
  doc.setFontSize(7.5);
  doc.text(`Rs. ${totalAfterDue.toLocaleString()}/-`, p2X + p2W - 3, lateBoxY + 3.5, { align: 'right' });

  // --- PANEL 3: ACCOUNTS CASH DESK & VERIFICATION (Width: 48mm) ---
  const p3X = x + 150.5;
  const p3W = 48;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.roundedRect(p3X, contentY, p3W, panelHeight, 1.2, 1.2, 'FD');

  // Title Strip
  doc.setFillColor(241, 245, 249);
  doc.rect(p3X, contentY, p3W, 4.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(6, 78, 59);
  doc.text('ACCOUNTS VERIFICATION', p3X + 2.5, contentY + 3.2);

  // Campus Badge
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(p3X + 2.5, contentY + 6.5, p3W - 5, 8.5, 0.8, 0.8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(0, 0, 0);
  doc.text(`Shift: ${shift}`, p3X + 4, contentY + 10);
  doc.setTextColor(6, 78, 59);
  doc.text(`Session: ${session}`, p3X + 4, contentY + 13.5);

  // Cash Desk Stamp Box
  const stampY = contentY + 17;
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(0.35);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(p3X + 2.5, stampY, p3W - 5, 24, 1.2, 1.2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(6, 78, 59);
  doc.text('ACCOUNTS CASH DESK', p3X + p3W / 2, stampY + 4.5, { align: 'center' });
  doc.setFontSize(5.8);
  doc.setTextColor(0, 0, 0);
  doc.text('Superior College Jahanian', p3X + p3W / 2, stampY + 8.5, { align: 'center' });
  doc.setFontSize(5.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Received & Verified Official Stamp', p3X + p3W / 2, stampY + 14, { align: 'center' });
  doc.text('Officer Sign: ________________', p3X + p3W / 2, stampY + 20, { align: 'center' });

  // 4. Bottom Instructions Note (Crisp Dark Text)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(15, 23, 42); // Dark slate
  doc.text('• Fee is payable strictly in Cash at College Accounts Desk on or before due date.', x + 4, y + 63);
  doc.text('• Stamped voucher must be preserved for semester clearance.', x + 4, y + 65.5);

  if (copyBadgeText) {
    doc.setFillColor(6, 78, 59);
    doc.roundedRect(x + 160, y + 61, 38, 4.5, 0.8, 0.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(255, 255, 255);
    doc.text(copyBadgeText.toUpperCase(), x + 179, y + 64.2, { align: 'center' });
  }
}

/**
 * Generates an A4 Portrait document containing 4 FULL-WIDTH HORIZONTAL ROWS per page.
 * Format: 4 rows stacked vertically on A4 page (width 200mm x height 67mm each).
 * Dashed cut lines with scissors between every voucher row.
 */
export function generate4VouchersPerPageDoc(
  students: any[],
  options: FeeVoucherOptions = {}
): jsPDF {
  const JsPdfCtor: any = (jsPDF as any).default || jsPDF;
  // A4 Portrait: Width = 210mm, Height = 297mm
  const doc: jsPDF = new JsPdfCtor({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const studentList = Array.isArray(students) && students.length > 0 ? students : [{}];
  const isSingleStudentQuad = studentList.length === 1 && options.singleStudentMode === 'quad_copies';

  const singleCopyBadges = ['College Copy', 'Accounts Copy', 'Student Copy', 'Admin Record'];

  // Coordinates for 4 horizontal rows on A4 Portrait:
  // Available height = 297mm. Available width = 200mm (margins: 5mm left/right).
  // Row height = 67mm.
  // Row 0: y = 5mm (ends at 72mm)
  // Cut 1: y = 73.5mm
  // Row 1: y = 75.5mm (ends at 142.5mm)
  // Cut 2: y = 144mm
  // Row 2: y = 146mm (ends at 213mm)
  // Cut 3: y = 214.5mm
  // Row 3: y = 216.5mm (ends at 283.5mm)
  const rowCoords = [
    { x: 5, y: 5 },
    { x: 5, y: 75.5 },
    { x: 5, y: 146 },
    { x: 5, y: 216.5 },
  ];

  const cutLineYPositions = [73.5, 144, 214.5];

  const drawRowCutLines = () => {
    cutLineYPositions.forEach((cutY) => {
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.25);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(4, cutY, 206, cutY);
      doc.setLineDashPattern([], 0);

      // Scissors marks and guide text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      doc.text('✂ CUT', 5, cutY - 1);
      doc.text('-- ✂ CUT ALONG DASHED LINE TO SEPARATE VOUCHER ✂ --', 105, cutY - 1, { align: 'center' });
      doc.text('CUT ✂', 205, cutY - 1, { align: 'right' });
    });
  };

  // If exactly 1 student is selected:
  if (studentList.length === 1) {
    const student = studentList[0];
    if (options.singleStudentMode === 'single_slip') {
      // 1 Pair (Row 0: College Copy, Row 1: Student Copy)
      drawSingleCollegeSlipRow(doc, student, rowCoords[0].x, rowCoords[0].y, 0, options, 'College Copy');
      drawSingleCollegeSlipRow(doc, student, rowCoords[1].x, rowCoords[1].y, 0, options, 'Student Copy');
    } else {
      // 2 Sets of (College Copy + Student Copy) on 1 sheet
      drawSingleCollegeSlipRow(doc, student, rowCoords[0].x, rowCoords[0].y, 0, options, 'College Copy');
      drawSingleCollegeSlipRow(doc, student, rowCoords[1].x, rowCoords[1].y, 0, options, 'Student Copy');
      drawSingleCollegeSlipRow(doc, student, rowCoords[2].x, rowCoords[2].y, 0, options, 'College Copy (Duplicate)');
      drawSingleCollegeSlipRow(doc, student, rowCoords[3].x, rowCoords[3].y, 0, options, 'Student Copy (Duplicate)');
    }
    drawRowCutLines();
    return doc;
  }

  // Multi-student batch layout: 2 Students per A4 page (2 copies each: 1 College Copy + 1 Student Copy = 4 full-width rows)
  const totalPages = Math.ceil(studentList.length / 2);

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) {
      doc.addPage('a4', 'portrait');
    }

    const studentA = studentList[p * 2];
    const studentB = studentList[p * 2 + 1];

    if (studentA) {
      // Student A: 2 copies (College Copy + Student Copy)
      drawSingleCollegeSlipRow(doc, studentA, rowCoords[0].x, rowCoords[0].y, p * 2, options, 'College Copy');
      drawSingleCollegeSlipRow(doc, studentA, rowCoords[1].x, rowCoords[1].y, p * 2, options, 'Student Copy');
    }

    if (studentB) {
      // Student B: 2 copies (College Copy + Student Copy)
      drawSingleCollegeSlipRow(doc, studentB, rowCoords[2].x, rowCoords[2].y, p * 2 + 1, options, 'College Copy');
      drawSingleCollegeSlipRow(doc, studentB, rowCoords[3].x, rowCoords[3].y, p * 2 + 1, options, 'Student Copy');
    }

    drawRowCutLines();
  }

  return doc;
}

/**
 * Triggers instant vector PDF download for 4-per-page College Fee Vouchers in 4 Full-Width Horizontal Rows.
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

    let defaultName = 'SCJ_Fee_Vouchers_4Rows_A4.pdf';
    if (list.length === 1) {
      const s = list[0];
      const roll = String(s?.collegeNo || s?.studentId || s?.id || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
      const name = String(s?.fullName || s?.name || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
      defaultName = `SCJ_Fee_Voucher_${roll}${name ? `_${name}` : ''}.pdf`;
    } else {
      defaultName = `SCJ_Fee_Vouchers_${list.length}_Students_2CopiesEach.pdf`;
    }

    const finalName = filename || defaultName;
    doc.save(finalName.endsWith('.pdf') ? finalName : `${finalName}.pdf`);

    return { success: true, count: list.length, filename: finalName };
  } catch (err: any) {
    console.error('[Fee Voucher PDF Generator Error]:', err);
    throw err;
  }
}
