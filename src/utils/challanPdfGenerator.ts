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
}

/**
 * Draws a single compact, high-density College Fee Voucher (width 97mm x height 140mm).
 * Strictly College Branded (Superior College Jahanian) with zero bank references.
 */
function drawSingleCollegeSlip(
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
  const feeMonth = options.feeMonth || 'Term Installment / Dues';

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

  const voucherNo = `SCJ-${new Date().getFullYear()}-${String(studentIdx + 1).padStart(3, '0')}${String(rollNo).replace(/[^0-9]/g, '').slice(-4) || '101'}`;

  // 1. Outer Card Rounded Box
  doc.setDrawColor(8, 90, 78); // Superior Teal
  doc.setLineWidth(0.35);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, 97, 140, 2, 2, 'FD');

  // 2. Top Header Banner
  doc.setFillColor(8, 90, 78);
  doc.rect(x + 0.3, y + 0.3, 96.4, 13.5, 'F');
  // Golden accent bar
  doc.setFillColor(201, 168, 76); // Superior Gold
  doc.rect(x + 0.3, y + 13.8, 96.4, 0.7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(collegeName, x + 48.5, y + 5.2, { align: 'center' });

  doc.setFontSize(6.2);
  doc.setTextColor(254, 240, 138); // Light Gold
  const slipTitle = copyBadgeText ? `STUDENT FEE VOUCHER (${copyBadgeText.toUpperCase()})` : 'STUDENT FEE VOUCHER (COLLEGE DESK)';
  doc.text(slipTitle, x + 48.5, y + 9.0, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.8);
  doc.setTextColor(226, 232, 240);
  doc.text(`${collegeAddress} • ${collegeContact}`, x + 48.5, y + 12.3, { align: 'center' });

  // 3. Metadata Bar (Voucher No, Issue Date, Due Date)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(x + 1.2, y + 15, 94.6, 6, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text(`Vch: ${voucherNo}`, x + 2.5, y + 19.2);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Issue: ${issueDateStr}`, x + 46, y + 19.2);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // Bold red for due date
  doc.text(`Due: ${dueDateStr}`, x + 94.5, y + 19.2, { align: 'right' });

  // 4. Student Academic & Profile Details Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(x + 1.2, y + 22, 94.6, 23, 1.2, 1.2, 'FD');

  // Mini label strip
  doc.setFillColor(241, 245, 249);
  doc.rect(x + 1.2, y + 22, 94.6, 4.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(8, 90, 78);
  doc.text('STUDENT ENROLLMENT PARTICULARS', x + 2.5, y + 25.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Roll No: ${rollNo}`, x + 94.5, y + 25.5, { align: 'right' });

  // Row 1: Student Name & Father Name
  let dy = y + 30;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Student:', x + 2.5, dy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(sName.slice(0, 25), x + 13, dy);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Father:', x + 50, dy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(fName.slice(0, 22), x + 61, dy);

  // Row 2: Program / Group & Section
  dy += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Class/Grp:', x + 2.5, dy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(prog.slice(0, 24), x + 13, dy);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Sec/Shift:', x + 50, dy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Sec ${sec} • ${shift}`, x + 61, dy);

  // Row 3: Session & Fee Head
  dy += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Session:', x + 2.5, dy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(8, 90, 78);
  doc.text(session, x + 13, dy);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Fee Head:', x + 50, dy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(8, 90, 78);
  doc.text(feeMonth.slice(0, 22), x + 61, dy);

  // 5. Fee Particulars Table
  const tableTopY = y + 46;
  doc.setFillColor(8, 90, 78);
  doc.rect(x + 1.2, tableTopY, 94.6, 4.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.text('SR#   FEE PARTICULARS / HEADS', x + 2.5, tableTopY + 3.2);
  doc.text('AMOUNT (PKR)', x + 94.5, tableTopY + 3.2, { align: 'right' });

  const rows = [
    { num: '1', title: 'Tuition Fee / Term Installment', amount: tuitionDue },
    { num: '2', title: 'Previous Arrears / Pending Dues', amount: arrears },
    { num: '3', title: 'Examination & Laboratory Charges', amount: examMisc },
    { num: '4', title: 'College Development & Security Fund', amount: 0 },
  ];

  let rY = tableTopY + 4.5;
  rows.forEach((r, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(x + 1.2, rY, 94.6, 4.2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(51, 65, 85);
    doc.text(`${r.num}.  ${r.title}`, x + 2.5, rY + 3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${r.amount.toLocaleString()}`, x + 94.5, rY + 3, { align: 'right' });
    rY += 4.2;
  });

  // 6. Highlight Total Boxes
  // Total Within Due Date Box
  const totalBoxY = rY + 1.2;
  doc.setFillColor(236, 253, 245); // Emerald-50
  doc.setDrawColor(5, 150, 105);
  doc.roundedRect(x + 1.2, totalBoxY, 94.6, 7.5, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(6, 95, 70);
  doc.text('TOTAL PAYABLE WITHIN DUE DATE:', x + 2.5, totalBoxY + 5);
  doc.setFontSize(8.5);
  doc.setTextColor(4, 120, 87);
  doc.text(`Rs. ${totalPayableNow.toLocaleString()}/-`, x + 94.5, totalBoxY + 5.2, { align: 'right' });

  // Total After Due Date Box
  const afterBoxY = totalBoxY + 8.5;
  doc.setFillColor(255, 241, 242); // Rose-50
  doc.setDrawColor(225, 29, 72);
  doc.roundedRect(x + 1.2, afterBoxY, 94.6, 6.8, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(159, 18, 57);
  doc.text(`AFTER DUE DATE (Inc. Rs ${lateFee} Late Fine):`, x + 2.5, afterBoxY + 4.5);
  doc.setFontSize(7.5);
  doc.setTextColor(190, 18, 60);
  doc.text(`Rs. ${totalAfterDue.toLocaleString()}/-`, x + 94.5, afterBoxY + 4.7, { align: 'right' });

  // 7. Important Instructions Box
  const notesBoxY = afterBoxY + 8;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x + 1.2, notesBoxY, 94.6, 12, 1, 1, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.3);
  doc.setTextColor(71, 85, 105);
  doc.text('• Fee is payable strictly in Cash at College Accounts Desk on or before due date.', x + 2.5, notesBoxY + 3.2);
  doc.text('• Stamped voucher must be preserved by student for semester exam & roll clearance.', x + 2.5, notesBoxY + 6.2);
  doc.text(`• After due date, late arrival fine of Rs. ${lateFee} will be charged without exception.`, x + 2.5, notesBoxY + 9.2);

  // 8. Signatures & Stamp Area
  const sigY = notesBoxY + 13.5;
  // Left: Depositor signature line
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(x + 3, sigY + 9, x + 40, sigY + 9);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Student / Depositor Signature', x + 21.5, sigY + 12.5, { align: 'center' });

  // Right: Accounts Counter Stamp Box
  doc.setDrawColor(8, 90, 78);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + 45, sigY, 50.8, 14, 1.2, 1.2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(8, 90, 78);
  doc.text('ACCOUNTS CASH DESK', x + 70.4, sigY + 3.8, { align: 'center' });
  doc.setFontSize(4.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Superior College Jahanian', x + 70.4, sigY + 6.8, { align: 'center' });
  doc.text('Received & Verified Stamp', x + 70.4, sigY + 11.5, { align: 'center' });
}

/**
 * Generates an A4 portrait document containing 4 vouchers per page (2x2 grid) with dashed cut lines.
 */
export function generate4VouchersPerPageDoc(
  students: any[],
  options: FeeVoucherOptions = {}
): jsPDF {
  const JsPdfCtor: any = (jsPDF as any).default || jsPDF;
  const doc: jsPDF = new JsPdfCtor({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const studentList = Array.isArray(students) && students.length > 0 ? students : [{}];
  const isSingleStudentQuad = studentList.length === 1 && options.singleStudentMode === 'quad_copies';

  const singleCopyBadges = ['College Copy', 'Accounts Copy', 'Student Copy', 'Admin Record'];

  if (isSingleStudentQuad) {
    // Exactly 1 page with 4 copies for this single student
    const student = studentList[0];
    const coords = [
      { x: 6, y: 6 },
      { x: 107, y: 6 },
      { x: 6, y: 151 },
      { x: 107, y: 151 },
    ];
    coords.forEach((c, idx) => {
      drawSingleCollegeSlip(doc, student, c.x, c.y, 0, options, singleCopyBadges[idx]);
    });

    // Draw Perforated / Cut Lines (Center Vertical and Center Horizontal)
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(105, 3, 105, 294);
    doc.line(3, 148.5, 207, 148.5);
    doc.setLineDashPattern([], 0);

    return doc;
  }

  // Multi-student batch layout: 4 students per A4 page
  const totalPages = Math.ceil(studentList.length / 4);

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) {
      doc.addPage('a4', 'portrait');
    }

    const pageStudents = studentList.slice(p * 4, p * 4 + 4);
    const coords = [
      { x: 6, y: 6 },
      { x: 107, y: 6 },
      { x: 6, y: 151 },
      { x: 107, y: 151 },
    ];

    pageStudents.forEach((student, idx) => {
      const overallIdx = p * 4 + idx;
      drawSingleCollegeSlip(doc, student, coords[idx].x, coords[idx].y, overallIdx, options);
    });

    // Draw Perforated / Cut Lines between quadrants
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(105, 3, 105, 294);
    doc.line(3, 148.5, 207, 148.5);
    doc.setLineDashPattern([], 0);
  }

  return doc;
}

/**
 * Triggers instant vector PDF download for 4-per-page College Fee Vouchers.
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

    let defaultName = 'SCJ_Fee_Vouchers_4perPage.pdf';
    if (list.length === 1) {
      const s = list[0];
      const roll = String(s?.collegeNo || s?.studentId || s?.id || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
      const name = String(s?.fullName || s?.name || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
      defaultName = `SCJ_Fee_Voucher_${roll}${name ? `_${name}` : ''}.pdf`;
    } else {
      defaultName = `SCJ_Fee_Vouchers_${list.length}_Students.pdf`;
    }

    const finalName = filename || defaultName;
    doc.save(finalName.endsWith('.pdf') ? finalName : `${finalName}.pdf`);

    return { success: true, count: list.length, filename: finalName };
  } catch (err: any) {
    console.error('[Fee Voucher PDF Generator Error]:', err);
    throw err;
  }
}
