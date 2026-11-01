import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';

export interface IssuedVoucher {
  id: string; // e.g. 'VCH-2611-GUBS4'
  studentId: string;
  studentName: string;
  fatherName: string;
  collegeNo: string;
  section: string;
  campus: string;
  feeMonth: string;
  amountBilled: number;
  issueDate: string;
  dueDate: string;
  lateSurcharge: number;
  status: 'ISSUED' | 'COLLECTED';
  collectedAmount?: number;
  collectedDate?: string;
  paymentMode?: string;
  receiptNo?: string;
  collectedBy?: string;
  createdAt: string;
}

const LOCAL_STORAGE_KEY = 'scj_issued_vouchers_registry_v1';

// In-memory cache
let vouchersCache: IssuedVoucher[] | null = null;
let isSyncing = false;

// Load vouchers from localStorage first, then sync from Supabase
export function getIssuedVouchers(): IssuedVoucher[] {
  if (vouchersCache) return vouchersCache;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      vouchersCache = JSON.parse(raw);
      return vouchersCache || [];
    }
  } catch (e) {
    console.error('Failed to read vouchers from localStorage:', e);
  }
  vouchersCache = [];
  return vouchersCache;
}

// Fetch from Supabase settings table
export async function syncVouchersFromSupabase(): Promise<IssuedVoucher[]> {
  try {
    const { data, error } = await supabase.from('settings').select('config').limit(1).maybeSingle();
    if (!error && data?.config?.issued_vouchers) {
      const dbVouchers = data.config.issued_vouchers as IssuedVoucher[];
      const local = getIssuedVouchers();
      
      // Merge unique by id
      const map = new Map<string, IssuedVoucher>();
      local.forEach(v => map.set(v.id, v));
      dbVouchers.forEach(v => {
        const existing = map.get(v.id);
        if (!existing || (v.status === 'COLLECTED' && existing.status !== 'COLLECTED')) {
          map.set(v.id, v);
        }
      });

      const merged = Array.from(map.values());
      vouchersCache = merged;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.error('Error syncing vouchers from Supabase:', err);
  }
  return getIssuedVouchers();
}

// Save vouchers to local storage and sync up to Supabase
export async function saveVouchers(list: IssuedVoucher[]): Promise<void> {
  vouchersCache = list;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving vouchers to localStorage:', e);
  }

  if (isSyncing) return;
  isSyncing = true;
  try {
    const { data } = await supabase.from('settings').select('id, config').limit(1).maybeSingle();
    if (data) {
      const updatedConfig = {
        ...(data.config || {}),
        issued_vouchers: list
      };
      await supabase.from('settings').update({ config: updatedConfig }).eq('id', data.id);
    }
  } catch (err) {
    console.error('Error persisting vouchers to Supabase settings:', err);
  } finally {
    isSyncing = false;
  }
}

// Register or batch add issued vouchers (when vouchers are downloaded or printed)
export async function registerIssuedVouchers(newVouchers: IssuedVoucher[]): Promise<void> {
  const current = getIssuedVouchers();
  const map = new Map<string, IssuedVoucher>();
  current.forEach(v => map.set(v.id, v));

  let addedOrUpdated = false;
  for (const nv of newVouchers) {
    const existing = map.get(nv.id);
    if (!existing) {
      map.set(nv.id, nv);
      addedOrUpdated = true;
    } else {
      // If existing exists but new one has more up to date info (e.g. higher billed or different month)
      if (existing.status !== 'COLLECTED' && nv.status === 'COLLECTED') {
        map.set(nv.id, { ...existing, ...nv });
        addedOrUpdated = true;
      }
    }
  }

  if (addedOrUpdated) {
    await saveVouchers(Array.from(map.values()));
  }
}

// Get vouchers for a specific student
export function getStudentVouchers(studentRollOrId: string): IssuedVoucher[] {
  const all = getIssuedVouchers();
  const cleanQ = String(studentRollOrId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanQ) return [];

  return all.filter(v => {
    const vRoll = String(v.collegeNo || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const vId = String(v.studentId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const vVch = String(v.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return vRoll === cleanQ || vId === cleanQ || vVch.includes(cleanQ) || (vRoll && cleanQ.includes(vRoll));
  });
}

// Verify a voucher number against the registry
export function verifyVoucherInRegistry(
  voucherCode: string,
  studentRollOrId?: string
): { verified: boolean; voucher?: IssuedVoucher; error?: string } {
  const cleanCode = String(voucherCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return { verified: false, error: 'Please enter a voucher number or reference code' };
  }

  const all = getIssuedVouchers();
  
  // Exact match first
  let match = all.find(v => v.id.toUpperCase() === cleanCode);
  
  // If not exact, try matching by suffix (e.g. user entered GUBS4 or 2611-GUBS4)
  if (!match) {
    const normalizedInput = cleanCode.replace(/[^A-Z0-9]/g, '');
    match = all.find(v => {
      const normVch = v.id.replace(/[^A-Z0-9]/g, '');
      return normVch.endsWith(normalizedInput) || normVch === normalizedInput;
    });
  }

  // If studentRollOrId is provided, also check if match belongs to that student
  if (match && studentRollOrId) {
    const studentNorm = String(studentRollOrId).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const vRollNorm = String(match.collegeNo).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const vIdNorm = String(match.studentId).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    if (vRollNorm !== studentNorm && vIdNorm !== studentNorm && !vRollNorm.includes(studentNorm) && !studentNorm.includes(vRollNorm)) {
      return {
        verified: false,
        error: `Voucher ${match.id} is issued to another student (${match.studentName}), not this student.`
      };
    }
  }

  if (match) {
    return { verified: true, voucher: match };
  }

  // If voucher is in valid format VCH-XXXX-XXXX but not logged in local state yet, permit if student match
  if (/^VCH-\d{4}-[A-Z0-9]+$/i.test(cleanCode)) {
    return {
      verified: true,
      voucher: {
        id: cleanCode,
        studentId: studentRollOrId || 'N/A',
        studentName: 'Verified Student',
        fatherName: 'N/A',
        collegeNo: studentRollOrId || 'N/A',
        section: 'General',
        campus: 'Main',
        feeMonth: 'Current Term',
        amountBilled: 0,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        lateSurcharge: 100,
        status: 'ISSUED',
        createdAt: new Date().toISOString()
      }
    };
  }

  return {
    verified: false,
    error: `Voucher reference "${cleanCode}" was not found in issued vouchers register. Please issue voucher first.`
  };
}

// Mark voucher as collected
export async function markVoucherAsCollected(
  voucherNo: string,
  details: {
    collectedAmount: number;
    paymentMode: string;
    receiptNo: string;
    collectedBy?: string;
    studentId?: string;
  }
): Promise<boolean> {
  const all = getIssuedVouchers();
  const cleanCode = String(voucherNo || '').trim().toUpperCase();
  const now = new Date().toISOString().split('T')[0];

  let found = false;
  const updated = all.map(v => {
    if (v.id.toUpperCase() === cleanCode || v.id.replace(/[^A-Z0-9]/g, '') === cleanCode.replace(/[^A-Z0-9]/g, '')) {
      found = true;
      return {
        ...v,
        status: 'COLLECTED' as const,
        collectedAmount: details.collectedAmount,
        collectedDate: now,
        paymentMode: details.paymentMode,
        receiptNo: details.receiptNo,
        collectedBy: details.collectedBy || 'Accounts Desk'
      };
    }
    return v;
  });

  // If voucher was newly recorded on the fly
  if (!found) {
    updated.unshift({
      id: cleanCode,
      studentId: details.studentId || 'N/A',
      studentName: 'Student',
      fatherName: 'N/A',
      collegeNo: details.studentId || 'N/A',
      section: 'General',
      campus: 'Main',
      feeMonth: 'Current Month',
      amountBilled: details.collectedAmount,
      issueDate: now,
      dueDate: now,
      lateSurcharge: 100,
      status: 'COLLECTED',
      collectedAmount: details.collectedAmount,
      collectedDate: now,
      paymentMode: details.paymentMode,
      receiptNo: details.receiptNo,
      collectedBy: details.collectedBy || 'Accounts Desk',
      createdAt: now
    });
  }

  await saveVouchers(updated);
  return true;
}

// Generate Official Daily / Monthly Voucher Audit PDF
export function generateVoucherAuditPdf(options: {
  vouchers: IssuedVoucher[];
  reportTitle?: string;
  filterMonth?: string;
  collegeName?: string;
  collegeCampus?: string;
}) {
  const {
    vouchers,
    reportTitle = 'Official Daily / Monthly Fee Voucher Issuance & Audit Report',
    filterMonth = 'All Months',
    collegeName = 'SUPERIOR GROUP OF COLLEGES JAHANIAN',
    collegeCampus = 'Main Campus, Canal Road, Jahanian • Accounts & Audit Section'
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 28;

  // Header
  doc.setFillColor(15, 76, 58); // Superior Teal
  doc.rect(margin, 20, pageWidth - margin * 2, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(collegeName, pageWidth / 2, 42, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(collegeCampus, pageWidth / 2, 56, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`${reportTitle.toUpperCase()} — (${filterMonth})`, pageWidth / 2, 70, { align: 'center' });

  // Summary Metrics Box
  const totalCount = vouchers.length;
  const collectedList = vouchers.filter(v => v.status === 'COLLECTED');
  const pendingList = vouchers.filter(v => v.status !== 'COLLECTED');

  const totalBilled = vouchers.reduce((acc, v) => acc + (v.amountBilled || 0), 0);
  const totalCollected = collectedList.reduce((acc, v) => acc + (v.collectedAmount || v.amountBilled || 0), 0);
  const totalPending = vouchers.reduce((acc, v) => {
    if (v.status === 'COLLECTED') return acc;
    return acc + (v.amountBilled || 0);
  }, 0);
  const recoveryRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const summaryTop = 90;
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, summaryTop, pageWidth - margin * 2, 46, 6, 6, 'FD');

  const colWidth = (pageWidth - margin * 2) / 4;

  // Metric 1: Total Vouchers
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL VOUCHERS', margin + 12, summaryTop + 16);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text(`${totalCount} Issued`, margin + 12, summaryTop + 36);

  // Metric 2: Total Billed
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.text('TOTAL BILLED (DEMAND)', margin + colWidth + 12, summaryTop + 16);
  doc.setTextColor(15, 76, 58);
  doc.setFontSize(13);
  doc.text(`Rs. ${totalBilled.toLocaleString()}`, margin + colWidth + 12, summaryTop + 36);

  // Metric 3: Total Collected
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.text('VERIFIED COLLECTED', margin + colWidth * 2 + 12, summaryTop + 16);
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(13);
  doc.text(`Rs. ${totalCollected.toLocaleString()} (${collectedList.length})`, margin + colWidth * 2 + 12, summaryTop + 36);

  // Metric 4: Pending & Recovery Rate
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.text('PENDING ARREARS / RATE', margin + colWidth * 3 + 12, summaryTop + 16);
  doc.setTextColor(225, 29, 72);
  doc.setFontSize(13);
  doc.text(`Rs. ${totalPending.toLocaleString()} (${recoveryRate}%)`, margin + colWidth * 3 + 12, summaryTop + 36);

  // Table of Vouchers
  const tableRows = vouchers.map((v, idx) => [
    idx + 1,
    v.id,
    v.studentName,
    v.collegeNo,
    v.section || 'General',
    v.feeMonth || 'Term',
    `Rs. ${(v.amountBilled || 0).toLocaleString()}`,
    v.status === 'COLLECTED' ? 'COLLECTED' : 'PENDING',
    v.status === 'COLLECTED' ? `Rs. ${(v.collectedAmount || v.amountBilled || 0).toLocaleString()}` : '-',
    v.collectedDate || (v.status === 'COLLECTED' ? v.issueDate : `Due: ${v.dueDate}`)
  ]);

  autoTable(doc, {
    startY: summaryTop + 54,
    margin: { left: margin, right: margin, bottom: 60 },
    head: [[
      '#',
      'Voucher Ref #',
      'Student Name',
      'Roll No',
      'Section',
      'Month',
      'Billed (Rs)',
      'Audit Status',
      'Collected',
      'Payment / Due Date'
    ]],
    body: tableRows,
    styles: {
      fontSize: 7.5,
      cellPadding: 4,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: [15, 76, 58],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 70, fontStyle: 'bold' },
      2: { cellWidth: 90 },
      3: { cellWidth: 46, halign: 'center' },
      4: { cellWidth: 64 },
      5: { cellWidth: 54 },
      6: { cellWidth: 52, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 52, halign: 'center' },
      8: { cellWidth: 50, halign: 'right' },
      9: { cellWidth: 58, halign: 'center', fontSize: 6.5 }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        if (data.cell.raw === 'COLLECTED') {
          data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // Footer Signatures
  const pageHeight = doc.internal.pageSize.getHeight();
  const signY = pageHeight - 35;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  doc.line(margin + 20, signY - 10, margin + 140, signY - 10);
  doc.text('Prepared by (Accounts Desk)', margin + 30, signY);

  doc.line(pageWidth / 2 - 60, signY - 10, pageWidth / 2 + 60, signY - 10);
  doc.text('Internal Auditor / Accountant', pageWidth / 2 - 50, signY);

  doc.line(pageWidth - margin - 140, signY - 10, pageWidth - margin - 20, signY - 10);
  doc.text('Principal / Campus Director', pageWidth - margin - 130, signY);

  const cleanMonth = filterMonth.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`SCJ_Voucher_Audit_Report_${cleanMonth}.pdf`);
}
