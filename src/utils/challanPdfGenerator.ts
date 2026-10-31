import { jsPDF } from 'jspdf';
import { SUPERIOR_COLLEGE_LOGO } from './collegeLogo';

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
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
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

export function numberToUrduWords(num: number): string {
  if (!num || num <= 0) return 'صفر روپے فقط';

  const urduUnits = [
    '', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھ', 'سات', 'آٹھ', 'نو',
    'دس', 'گیارہ', 'بارہ', 'تیرہ', 'چودہ', 'پندرہ', 'سولہ', 'سترہ', 'اٹھارہ', 'انیس',
  ];

  const urduNumbers: Record<number, string> = {
    20: 'بیس', 21: 'اکیس', 22: 'بائیس', 23: 'تیئیس', 24: 'چوبیس', 25: 'پچیس', 26: 'چھبیس', 27: 'ستائیس', 28: 'اٹھائیس', 29: 'انتیس',
    30: 'تیس', 31: 'اکتیس', 32: 'بتیس', 33: 'تینتیس', 34: 'چونتیس', 35: 'پینتیس', 36: 'چھتیس', 37: 'سینتیس', 38: 'اڑتیس', 39: 'انتالیس',
    40: 'چالیس', 41: 'اکتالیس', 42: 'بیالیس', 43: 'تینتالیس', 44: 'چوالیس', 45: 'پینتالیس', 46: 'چھیالیس', 47: 'سینتالیس', 48: 'اڑتالیس', 49: 'انچاس',
    50: 'پچاس', 51: 'اکیاون', 52: 'باون', 53: 'ترپن', 54: 'چون', 55: 'پچپن', 56: 'چھپن', 57: 'ستتاون', 58: 'اٹھاون', 59: 'انسٹھ',
    60: 'ساٹھ', 61: 'اکسٹھ', 62: 'باسٹھ', 63: 'تریسٹھ', 64: 'چونسٹھ', 65: 'پینسٹھ', 66: 'چھیاسٹھ', 67: 'سڑسٹھ', 68: 'اڑسٹھ', 69: 'انہتر',
    70: 'ستر', 71: 'اکہتر', 72: 'بہتر', 73: 'تہتر', 74: 'چوہتر', 75: 'پچہتر', 76: 'چھہتر', 77: 'ستتر', 78: 'اٹھہتر', 79: 'اناسی',
    80: 'اسی', 81: 'اکیاسی', 82: 'بیاسی', 83: 'تراسی', 84: 'چوراسی', 85: 'پچاسی', 86: 'چھیاسی', 87: 'ستاسی', 88: 'اٹھاسی', 89: 'نواسی',
    90: 'نوے', 91: 'اکیانوے', 92: 'بانوے', 93: 'ترانوے', 94: 'چورانوے', 95: 'پچانوے', 96: 'چھیانوے', 97: 'ستانوے', 98: 'اٹھانوے', 99: 'ننانوے',
  };

  function convertTwoDigits(n: number): string {
    if (n < 20) return urduUnits[n] || '';
    return urduNumbers[n] || '';
  }

  function convertThreeDigits(n: number): string {
    let str = '';
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    if (hundreds > 0) {
      str += `${urduUnits[hundreds]} سو `;
    }
    if (rest > 0) {
      str += convertTwoDigits(rest);
    }
    return str.trim();
  }

  let result = '';
  const n = Math.floor(num);

  const crores = Math.floor(n / 10000000);
  const lakhs = Math.floor((n % 10000000) / 100000);
  const thousands = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  if (crores > 0) {
    result += `${convertTwoDigits(crores)} کروڑ `;
  }
  if (lakhs > 0) {
    result += `${convertTwoDigits(lakhs)} لاکھ `;
  }
  if (thousands > 0) {
    result += `${convertTwoDigits(thousands)} ہزار `;
  }
  if (remainder > 0) {
    result += convertThreeDigits(remainder);
  }

  return `${result.trim()} روپے فقط`;
}

function formatDate(dateObj: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mmm = months[dateObj.getMonth()];
  const yyyy = dateObj.getFullYear();
  return `${dd}-${mmm}-${yyyy}`;
}

export function getDefaultDueDate(baseDate?: string | Date): string {
  let base: Date;
  if (!baseDate) {
    base = new Date();
  } else if (typeof baseDate === 'string') {
    const parsed = new Date(baseDate);
    if (!isNaN(parsed.getTime())) {
      base = parsed;
    } else {
      const parts = baseDate.split('-');
      if (parts.length === 3) {
        const months: Record<string, number> = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
        };
        const m = months[parts[1].toLowerCase().slice(0, 3)];
        if (m !== undefined) {
          base = new Date(Number(parts[2]), m, Number(parts[0]));
        } else {
          base = new Date();
        }
      } else {
        base = new Date();
      }
    }
  } else {
    base = baseDate;
  }

  if (isNaN(base.getTime())) {
    base = new Date();
  }

  const due = new Date(base);
  due.setDate(due.getDate() + 10);
  return formatDate(due);
}

export interface FeeVoucherOptions {
  collegeName?: string;
  collegeAddress?: string;
  collegeContact?: string;
  issueDate?: string;
  dueDate?: string;
  lateSurcharge?: number;
  feeMonth?: string;
  layoutMode?: 'quad_2_students' | 'single_student_3_copies'; // 2 Students/Page (4 rows) vs 1 Student/Page (3 detailed copies)
  pageIndices?: number[]; // custom 0-based page indices to export
  voucherNumber?: string;
  singleStudentMode?: 'quad_copies' | 'single_slip';
  challanTitle?: string;
  installmentMode?: 'fixed_installment' | 'full_balance';
  fixedInstallmentAmount?: number;
}

/**
 * Standard College Academic Classes / Groups Configuration (SGC-J)
 */
export const ACADEMIC_CLASSES = [
  { id: 'all', label: 'All Academic Classes / Groups' },
  { id: 'inter-p1', label: 'Inter Part-1 (Session 2026-28)' },
  { id: 'inter-p2', label: 'Inter Part-2 (Session 2025-27)' },
  { id: 'bs-all', label: 'BS Degree Programs (All Semesters)' },
  { id: 'bs-2nd', label: '  ↳ BS 2nd Semester (2025-29)' },
  { id: 'bs-4th', label: '  ↳ BS 4th Semester (2024-28)' },
  { id: 'bs-6th', label: '  ↳ BS 6th Semester (2023-27)' },
  { id: 'bs-8th', label: '  ↳ BS 8th Semester (2024-26)' },
  { id: 'dit', label: 'D.I.T. Technical Diploma (2026-28)' },
  { id: 'ads-adp', label: 'ADS / ADP (2-Year Degree)' },
  { id: 'ukl3', label: 'UK Level 3 (International)' },
];

/**
 * Derives the clean, official Academic Class name for fee vouchers and documentation.
 * Replaces raw subject group codes like 'Ics1' with 'Inter Part 1 2026-28'.
 */
export function getStudentDisplayClass(st: any): string {
  if (!st) return 'Intermediate';
  const cat = String(st.category || '').toLowerCase();
  const part = String(st.academicPart || st.academic_part || '').toLowerCase();
  const sec = String(st.section || '').toLowerCase();
  const grp = String(st.group || st.group_name || '').toLowerCase();
  const sess = String(st.session || '');
  const isBs = cat.includes('bs') || sec.includes('bs') || grp.startsWith('bs') || part.includes('semester');

  // 1. D.I.T. Diploma
  if (cat.includes('dit') || sec.includes('dit') || grp.includes('dit')) {
    return `D.I.T. Diploma (${sess || '2026-28'})`;
  }

  // 2. BS Degree Programs
  if (isBs) {
    const rawGrp = st.group || st.group_name || 'BS';
    const cleanGrp = String(rawGrp).replace(/_/g, '-').trim();
    const sem = st.academicPart || st.academic_part || '';
    if (sem) {
      return `${cleanGrp} (${sem})`;
    }
    const match = sec.match(/(\d+(?:st|nd|rd|th)?\s*sem(?:ester)?)/i);
    if (match) {
      return `${cleanGrp} (${match[1].toUpperCase()})`;
    }
    return `${cleanGrp} Degree`;
  }

  // 3. ADS / ADP (2-Year Degree)
  if (!isBs && (cat.startsWith('ads') || cat.startsWith('adp') || grp.startsWith('adp') || grp.startsWith('ads'))) {
    return `ADS / ADP (${sess || '2-Year'})`;
  }

  // 4. UK Level 3
  if (!isBs && (cat.includes('uk') || grp.includes('uk') || sec.includes('uk'))) {
    return `UK Level 3 (${sess || 'International'})`;
  }

  // 5. Inter Part 1
  if (
    part === 'part-1' ||
    part === 'part 1' ||
    cat.includes('part-1') ||
    cat.includes('part 1') ||
    sess === '2026-28' ||
    sec.includes('-1') ||
    sec.includes('g1') ||
    sec.includes('b1') ||
    grp.includes('p1') ||
    grp.includes('ics1')
  ) {
    return 'Inter Part 1 2026-28';
  }

  // 6. Inter Part 2
  if (
    part === 'part-2' ||
    part === 'part 2' ||
    cat.includes('part-2') ||
    cat.includes('part 2') ||
    sess === '2025-27' ||
    sec.includes('-2') ||
    sec.includes('g2') ||
    sec.includes('b2') ||
    grp.includes('p2') ||
    grp.includes('ics2') ||
    grp.includes('ics3')
  ) {
    return 'Inter Part 2 2025-27';
  }

  return st.category || st.group || 'Intermediate';
}

/**
 * Accurately determines campus shift ('Girls Campus' or 'Boys Campus').
 * Fully accounts for BS girls and female student names.
 */
export function getStudentCampusShift(st: any): string {
  if (!st) return 'Boys Campus';
  const g = String(st?.gender || '').toLowerCase().trim();
  if (g === 'female' || g === 'girl' || g === 'girls') return 'Girls Campus';
  if (g === 'male' || g === 'boy' || g === 'boys') return 'Boys Campus';

  const cat = String(st?.category || '').toLowerCase();
  const sec = String(st?.section || '').toLowerCase();
  if (
    cat.includes('girl') ||
    sec.includes('girl') ||
    sec.includes('-g') ||
    sec.endsWith('g') ||
    sec.includes('pmc1g') ||
    sec.includes('mes-g') ||
    sec.includes('ics1-g') ||
    sec.includes('ics2-g') ||
    sec.includes('ics3-g')
  ) {
    return 'Girls Campus';
  }
  return 'Boys Campus';
}

/**
 * Filter helper matching students against standardized Academic Classes / Groups
 */
export function matchesAcademicClass(student: any, selectedClassId: string): boolean {
  if (!selectedClassId || selectedClassId === 'all') return true;

  const cat = String(student.category || '').toLowerCase();
  const part = String(student.academicPart || student.academic_part || '').toLowerCase();
  const sec = String(student.section || '').toLowerCase();
  const grp = String(student.group || student.group_name || '').toLowerCase();
  const sess = String(student.session || '');
  const isBs = cat.includes('bs') || sec.includes('bs') || grp.startsWith('bs') || part.includes('semester');

  switch (selectedClassId) {
    case 'inter-p1':
      return (
        !isBs &&
        !cat.includes('dit') &&
        !sec.includes('dit') &&
        (part === 'part-1' ||
          part === 'part 1' ||
          cat.includes('part-1') ||
          cat.includes('part 1') ||
          sess === '2026-28' ||
          sec.includes('-1') ||
          sec.includes('g1') ||
          sec.includes('b1') ||
          grp.includes('p1') ||
          grp.includes('ics1'))
      );

    case 'inter-p2':
      return (
        !isBs &&
        (part === 'part-2' ||
          part === 'part 2' ||
          cat.includes('part-2') ||
          cat.includes('part 2') ||
          sess === '2025-27' ||
          sec.includes('-2') ||
          sec.includes('g2') ||
          sec.includes('b2') ||
          grp.includes('p2') ||
          grp.includes('ics2') ||
          grp.includes('ics3'))
      );

    case 'bs-all':
      return isBs;

    case 'bs-2nd':
      return (
        isBs &&
        (part.includes('semester 2') ||
          sec.includes('2nd semester') ||
          sec.includes('2th semester') ||
          cat.includes('semester 2'))
      );

    case 'bs-4th':
      return (
        isBs &&
        (part.includes('semester 4') ||
          sec.includes('4th semester') ||
          cat.includes('semester 4'))
      );

    case 'bs-6th':
      return (
        isBs &&
        (part.includes('semester 6') ||
          sec.includes('6th semester') ||
          cat.includes('semester 6'))
      );

    case 'bs-8th':
      return (
        isBs &&
        (part.includes('semester 8') ||
          sec.includes('8th semester') ||
          cat.includes('semester 8'))
      );

    case 'dit':
      return cat.includes('dit') || sec.includes('dit') || grp.includes('dit');

    case 'ads-adp':
      return !isBs && (cat.startsWith('ads') || cat.startsWith('adp') || grp.startsWith('adp') || grp.startsWith('ads'));

    case 'ukl3':
      return !isBs && (cat.includes('uk') || grp.includes('uk') || sec.includes('uk'));

    default:
      return (
        String(student.group || '').toLowerCase() === selectedClassId.toLowerCase() ||
        String(student.category || '').toLowerCase() === selectedClassId.toLowerCase()
      );
  }
}

/**
 * Draws a single full-width horizontal fee voucher row.
 * Toner & Laser-Friendly design: Clean white background, no solid dark fills, crisp 0.4mm borders.
 * Course package and total paid are omitted per institution policy. Only Remaining balance & Payable dues are printed.
 */
function drawSingleCollegeSlipRow(
  doc: jsPDF,
  student: any,
  x: number,
  y: number,
  studentIdx: number,
  options: FeeVoucherOptions = {},
  copyBadgeText?: string,
  rowHeight: number = 67
) {
  const collegeName = 'SUPERIOR COLLEGE JAHANIAN';
  const collegeAddress = options.collegeAddress || 'Canal Road Campus, Jahanian';
  const collegeContact = options.collegeContact || 'Accounts Desk: 0331-2211147';
  const issueDateStr = options.issueDate || formatDate(new Date());
  const dueDateStr = options.dueDate || getDefaultDueDate(options.issueDate || new Date());
  const lateFee = typeof options.lateSurcharge === 'number' ? options.lateSurcharge : 100;
  const feeMonth = options.feeMonth || 'Monthly Installment';

  const sName = String(student?.fullName || student?.full_name || student?.name || 'Verified Student');
  const fName = String(student?.fatherName || student?.father_name || 'N/A');
  const rollNo = String(student?.collegeNo || student?.studentId || student?.rollNumber || student?.id || 'SCJ-0000');
  const prog = getStudentDisplayClass(student);
  const rawSec = String(student?.section || 'A');
  const sec = rawSec.replace(/^(sec|section)\s*[:-]?\s*/i, '').trim() || 'A';
  const shift = getStudentCampusShift(student);
  const session = String(student?.session || '2026-28');
  const contact = String(student?.contactNumber || student?.fatherContact || student?.phone || '');

  // Financial breakdown (Package is hidden from voucher)
  const totalPkg = Number(student?.totalPackage || student?.total_package || 0);
  const paidSoFar = Number(student?.feeReceived || student?.fee_received || 0);
  const totalRemaining = Math.max(0, totalPkg - paidSoFar);

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
      installmentSubtext = `Installment (Remaining Balance: Rs. ${leftOver.toLocaleString()})`;
    }
  } else {
    currentPayable = totalRemaining;
    installmentSubtext = totalRemaining > 0
      ? 'Total Outstanding Balance Due'
      : 'Account Fully Cleared (No Dues)';
  }

  const totalAfterDue = currentPayable + (currentPayable > 0 ? lateFee : 0);
  const issueDateParts = (options.issueDate || '').split('-');
  const yStr = issueDateParts[0] ? issueDateParts[0].slice(-2) : '26';
  const mStr = issueDateParts[1] || '11';
  const cleanRoll = String(rollNo).replace(/[^a-zA-Z0-9]/g, '');
  const voucherNo = options.voucherNumber || `VCH-${yStr}${mStr}-${cleanRoll || '101'}`;

  // 1. Outer Card Rounded Box (200mm wide x rowHeight mm tall) - Pure White Fill with Crisp Dark Border
  doc.setDrawColor(30, 41, 59); // Crisp Dark Slate Border
  doc.setLineWidth(0.4);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, 200, rowHeight, 1.5, 1.5, 'FD');

  // 2. Top Header Banner - Laser Friendly (No solid dark fill that wastes printer toner!)
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 0.3, y + 0.3, 199.4, 11, 'F');
  
  // Dual divider lines under header
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(x + 0.3, y + 11.2, x + 199.7, y + 11.2);
  doc.setDrawColor(217, 119, 6); // Subtle Gold Accent Line
  doc.setLineWidth(0.25);
  doc.line(x + 0.3, y + 11.8, x + 199.7, y + 11.8);

  // Superior College Crest Logo
  try {
    doc.addImage(SUPERIOR_COLLEGE_LOGO, 'PNG', x + 2.5, y + 1.6, 8.0, 8.0);
  } catch (err) {}

  // College Name (Bold Pitch-Black 11pt)
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(collegeName, x + 12, y + 5.2);

  // Subtitle / Fee Head
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  const voucherTitle = `OFFICIAL STUDENT FEE VOUCHER • ${feeMonth.toUpperCase()}`;
  doc.text(voucherTitle, x + 12, y + 9.2);

  // Campus Address & Contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(`${collegeAddress} • ${collegeContact}`, x + 82, y + 5.2);

  // Right-side Metadata Box (Outline pill with dark text - Toner Friendly!)
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + 138, y + 1.2, 59, 9, 0.8, 0.8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Ref: ${voucherNo}`, x + 140, y + 4.4);
  
  // Copy Badge (College Copy / Student Copy / Accounts Copy)
  const badgeLabel = (copyBadgeText || 'COLLEGE COPY').toUpperCase();
  doc.text(`[ ${badgeLabel} ]`, x + 195, y + 4.4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Issue: ${issueDateStr}`, x + 140, y + 8.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // Bold dark red for due date
  doc.text(`Due: ${dueDateStr}`, x + 195, y + 8.2, { align: 'right' });

  // 3. Main Body: 3 Panels
  const contentY = y + 13;
  const panelHeight = rowHeight - 21;

  // --- PANEL 1: STUDENT PARTICULARS (Width: 67mm) ---
  const p1X = x + 1.5;
  const p1W = 67;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.roundedRect(p1X, contentY, p1W, panelHeight, 1, 1, 'FD');

  // Strip Header
  // Strip Header
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(p1X + 0.2, contentY + 0.2, p1W - 0.4, 4.2, 0.5, 0.5, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(15, 23, 42);
  doc.text('STUDENT PARTICULARS', p1X + 2, contentY + 3.1);

  // Roll Badge (Outline pill, no dark fill)
  doc.setDrawColor(15, 23, 42);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(p1X + p1W - 27, contentY + 0.6, 25, 3.4, 0.6, 0.6, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(0, 0, 0);
  doc.text(`Roll: ${rollNo}`, p1X + p1W - 14.5, contentY + 3.0, { align: 'center' });

  // Student Particulars Rows
  let sY = contentY + 7.8;
  const drawStudentRow = (label: string, value: string, isBig = false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isBig ? 6.2 : 5.8);
    doc.setTextColor(71, 85, 105);
    doc.text(label, p1X + 2, sY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isBig ? 8.5 : 6.8);
    doc.setTextColor(0, 0, 0);
    doc.text(value.slice(0, 32), p1X + 18, sY);
    sY += isBig ? 4.8 : 4.2;
  };

  drawStudentRow('Student:', sName, true);
  drawStudentRow('Father:', fName);
  drawStudentRow('Class/Grp:', prog);
  drawStudentRow('Section:', `${sec} • ${shift}`);
  drawStudentRow('Session:', session);
  if (rowHeight >= 85 && contact) {
    drawStudentRow('Contact:', contact);
  }

  // Depositor Signature
  const depSigY = contentY + panelHeight - 6;
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(p1X + 2.5, depSigY, p1X + 42, depSigY);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Depositor / Student Signature', p1X + 22, depSigY + 3.8, { align: 'center' });

  // --- PANEL 2: FEE PARTICULARS & TOTAL REMAINING DUES (Width: 79mm) ---
  const p2X = x + 70;
  const p2W = 79;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.roundedRect(p2X, contentY, p2W, panelHeight, 1, 1, 'D');

  // Strip Header
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(p2X + 0.2, contentY + 0.2, p2W - 0.4, 4.2, 0.5, 0.5, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(15, 23, 42);
  doc.text('FEE DETAILS & TOTAL REMAINING DUES', p2X + 2, contentY + 3.1);

  // Box 1: Total Remaining Balance (Package is completely hidden!)
  const remY = contentY + 6.2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(248, 113, 113);
  doc.roundedRect(p2X + 1.5, remY, p2W - 3, 5.5, 0.8, 0.8, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(153, 27, 27); // Dark Crimson Red
  doc.text('TOTAL REMAINING BALANCE:', p2X + 3, remY + 3.8);
  doc.setFontSize(8);
  doc.text(`Rs. ${totalRemaining.toLocaleString()}`, p2X + p2W - 3, remY + 3.8, { align: 'right' });

  // Box 2: Highlight Payable Amount
  const payableBoxY = remY + 7.2;
  const payableBoxHeight = rowHeight >= 85 ? 22 : 16.5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(15, 23, 42); // Crisp Double Border Style
  doc.setLineWidth(0.4);
  doc.roundedRect(p2X + 1.5, payableBoxY, p2W - 3, payableBoxHeight, 0.8, 0.8, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  const payableTitle = options.installmentMode === 'fixed_installment'
    ? `PAYABLE THIS MONTH (${feeMonth.toUpperCase()}):`
    : 'PAYABLE AMOUNT (THIS VOUCHER):';
  doc.text(payableTitle, p2X + 3, payableBoxY + 4.2);

  doc.setFontSize(12.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Rs. ${currentPayable.toLocaleString()}/-`, p2X + p2W - 3, payableBoxY + 5.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  doc.text(installmentSubtext.slice(0, 60), p2X + 3, payableBoxY + 9.5);

  // English Amount in Words Only (100% Crisp English, Zero Mojibake!)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(30, 41, 59);
  doc.text(`Amount in Words: ${numberToEnglishWords(currentPayable)}`, p2X + 3, payableBoxY + 13.5);

  // Late Fee Box
  const lateBoxY = payableBoxY + payableBoxHeight + 1.5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(p2X + 1.5, lateBoxY, p2W - 3, 5, 0.6, 0.6, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.6);
  doc.setTextColor(185, 28, 28);
  doc.text(`After Due Date (+Rs. ${lateFee}/Day Fine):`, p2X + 3, lateBoxY + 3.4);
  doc.setFontSize(7.2);
  doc.text(`Rs. ${totalAfterDue.toLocaleString()}/-`, p2X + p2W - 3, lateBoxY + 3.4, { align: 'right' });

  // --- PANEL 3: CASH DESK & AUDIT VERIFICATION (Width: 48mm) ---
  const p3X = x + 150.5;
  const p3W = 48;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.roundedRect(p3X, contentY, p3W, panelHeight, 1, 1, 'D');

  // Strip Header
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(p3X + 0.2, contentY + 0.2, p3W - 0.4, 4.2, 0.5, 0.5, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(15, 23, 42);
  doc.text('ACCOUNTS VERIFICATION', p3X + 2, contentY + 3.1);

  // Audit Reference Box (Clean outline, pure white background, NO black box!)
  const auditRefY = contentY + 5.5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(p3X + 2, auditRefY, p3W - 4, 7.5, 0.6, 0.6, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Audit: ${voucherNo}`, p3X + 3, auditRefY + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Campus: ${shift}`, p3X + 3, auditRefY + 6.4);

  // Cash Desk Stamp Box
  const stampBoxY = auditRefY + 9.5;
  const stampHeight = panelHeight - (stampBoxY - contentY) - 2;
  doc.setDrawColor(30, 41, 59);
  doc.setLineDashPattern([1.5, 1], 0);
  doc.roundedRect(p3X + 2, stampBoxY, p3W - 4, stampHeight, 0.8, 0.8, 'D');
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(0, 0, 0);
  doc.text('ACCOUNTS CASH DESK', p3X + p3W / 2, stampBoxY + 4, { align: 'center' });
  doc.setFontSize(5.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Superior College Jahanian', p3X + p3W / 2, stampBoxY + 7.5, { align: 'center' });
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text('Official Received & Verified Stamp', p3X + p3W / 2, stampBoxY + 12, { align: 'center' });
  doc.text('Officer Sign: __________________', p3X + p3W / 2, stampBoxY + stampHeight - 3, { align: 'center' });

  // 4. Bottom Instructions Note (Crisp Dark Text)
  const yFooter = y + rowHeight - 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`• Fee is payable on or before ${dueDateStr}. Late fine: Rs. ${lateFee}/day. Stamped slip required for clearance.`, x + 3, yFooter);
  doc.text(collegeAddress, x + 197, yFooter, { align: 'right' });
}

/**
 * Generates an A4 Portrait document containing either:
 * 1. 'quad_2_students': 4 Horizontal Rows per A4 Page (2 Students / Page, 2 Copies Each).
 * 2. 'single_student_3_copies': 3 Detailed Horizontal Rows per A4 Page (1 Student / Page, College + Student + Accounts Copy).
 * Supports custom pageIndices filtering.
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
  const layoutMode = options.layoutMode || 'quad_2_students';

  // Helper to draw dashed cut line with scissors
  const drawCutLine = (cutY: number) => {
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(4, cutY, 206, cutY);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text('✂ CUT', 5, cutY - 1);
    doc.text('-- ✂ CUT ALONG DASHED LINE TO SEPARATE VOUCHER ✂ --', 105, cutY - 1, { align: 'center' });
    doc.text('CUT ✂', 205, cutY - 1, { align: 'right' });
  };

  // --- MODE A: 1 STUDENT / SHEET (3 DETAILED COPIES: COLLEGE, STUDENT, ACCOUNTS) ---
  if (layoutMode === 'single_student_3_copies') {
    const totalSheets = studentList.length;
    const requestedPages = options.pageIndices && options.pageIndices.length > 0
      ? options.pageIndices.filter(p => p >= 0 && p < totalSheets)
      : Array.from({ length: totalSheets }, (_, i) => i);

    const pagesToRender = requestedPages.length > 0 ? requestedPages : [0];

    pagesToRender.forEach((pIdx, renderCount) => {
      if (renderCount > 0) {
        doc.addPage('a4', 'portrait');
      }

      const student = studentList[pIdx];
      if (!student) return;

      // 3 Rows of 87mm each
      // Row 0: y = 5
      drawSingleCollegeSlipRow(doc, student, 5, 5, pIdx, options, 'College Copy', 87);
      drawCutLine(93.5);

      // Row 1: y = 96
      drawSingleCollegeSlipRow(doc, student, 5, 96, pIdx, options, 'Student Copy', 87);
      drawCutLine(184.5);

      // Row 2: y = 187
      drawSingleCollegeSlipRow(doc, student, 5, 187, pIdx, options, 'Accounts / Bank Copy', 87);
    });

    return doc;
  }

  // --- MODE B: 2 STUDENTS / SHEET (QUAD ECO MODE: 4 ROWS, 2 STUDENTS / PAGE) ---
  const totalSheets = Math.ceil(studentList.length / 2);
  const requestedPages = options.pageIndices && options.pageIndices.length > 0
    ? options.pageIndices.filter(p => p >= 0 && p < totalSheets)
    : Array.from({ length: totalSheets }, (_, i) => i);

  const pagesToRender = requestedPages.length > 0 ? requestedPages : [0];

  const rowCoords = [
    { x: 5, y: 5 },
    { x: 5, y: 75.5 },
    { x: 5, y: 146 },
    { x: 5, y: 216.5 },
  ];
  const cutLineYPositions = [73.5, 144, 214.5];

  pagesToRender.forEach((pIdx, renderCount) => {
    if (renderCount > 0) {
      doc.addPage('a4', 'portrait');
    }

    const studentA = studentList[pIdx * 2];
    const studentB = studentList[pIdx * 2 + 1];

    if (studentA) {
      drawSingleCollegeSlipRow(doc, studentA, rowCoords[0].x, rowCoords[0].y, pIdx * 2, options, 'College Copy', 67);
      drawSingleCollegeSlipRow(doc, studentA, rowCoords[1].x, rowCoords[1].y, pIdx * 2, options, 'Student Copy', 67);
    }

    if (studentB) {
      drawSingleCollegeSlipRow(doc, studentB, rowCoords[2].x, rowCoords[2].y, pIdx * 2 + 1, options, 'College Copy', 67);
      drawSingleCollegeSlipRow(doc, studentB, rowCoords[3].x, rowCoords[3].y, pIdx * 2 + 1, options, 'Student Copy', 67);
    }

    cutLineYPositions.forEach(cutY => drawCutLine(cutY));
  });

  return doc;
}

/**
 * Triggers vector PDF download for College Fee Vouchers.
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

    let defaultName = 'SCJ_Fee_Vouchers.pdf';
    if (list.length === 1) {
      const s = list[0];
      const roll = String(s?.collegeNo || s?.studentId || s?.id || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
      const name = String(s?.fullName || s?.name || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
      defaultName = `SCJ_Fee_Voucher_${roll}${name ? `_${name}` : ''}.pdf`;
    } else {
      defaultName = options.layoutMode === 'single_student_3_copies'
        ? `SCJ_Fee_Vouchers_${list.length}_Students_1StudentPerSheet.pdf`
        : `SCJ_Fee_Vouchers_${list.length}_Students_2StudentsPerSheet.pdf`;
    }

    const finalName = filename || defaultName;
    doc.save(finalName.endsWith('.pdf') ? finalName : `${finalName}.pdf`);

    return { success: true, count: list.length, filename: finalName };
  } catch (err: any) {
    console.error('[Fee Voucher PDF Generator Error]:', err);
    throw err;
  }
}
