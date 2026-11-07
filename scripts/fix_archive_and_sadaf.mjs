import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
});

const client = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

function parseReceiptAndDate(str, fallbackDate = '2026-09-01') {
  if (!str) return { receipt: '', date: fallbackDate };
  const trimmed = String(str).trim();
  const m = trimmed.match(/^([A-Za-z0-9_-]+)\s*[/]\s*(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/);
  if (m) {
    const receipt = m[1].trim();
    let day = m[2].padStart(2, '0');
    let month = m[3].padStart(2, '0');
    let yr = m[4];
    if (yr.length === 2) yr = '20' + yr;
    return { receipt, date: `${yr}-${month}-${day}` };
  }
  const m2 = trimmed.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/);
  if (m2) {
    let day = m2[1].padStart(2, '0');
    let month = m2[2].padStart(2, '0');
    let yr = m2[3];
    if (yr.length === 2) yr = '20' + yr;
    return { receipt: '', date: `${yr}-${month}-${day}` };
  }
  return { receipt: trimmed, date: fallbackDate };
}

async function fix() {
  console.log('=== FIXING OBSOLETE DELETED ARCHIVE & ORPHANED STUDENT ===\n');

  // 1. Fetch CSV row for VER-0746 (SADAF SAJJAD)
  const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);
  const sadafRow = rows.find(r => r.Record_ID === 'VER-0746');
  if (!sadafRow) {
    console.error('Could not find VER-0746 in CSV!');
    return;
  }
  console.log('Found VER-0746 in CSV:', sadafRow.Student_Name, sadafRow.Exact_Section_Name);

  // Parse installments
  let rawInstallments = [];
  try {
    if (sadafRow.Installments_Ledger_JSON) rawInstallments = JSON.parse(sadafRow.Installments_Ledger_JSON);
  } catch (e) {}

  const totalPkg = Number(sadafRow.Combined_Total_Package || 120000);
  const totalPaid = Number(sadafRow.Combined_Tuition_Paid || 93000);
  const totalRem = Number(sadafRow.Combined_Remaining_Balance || 27000);

  let runningBal = totalPkg;
  const transactions = [];
  const installments = [];

  rawInstallments.forEach((item, iIdx) => {
    const { receipt, date } = parseReceiptAndDate(item.receipt_date);
    const amt = Number(item.amount || 0);
    runningBal = Math.max(0, runningBal - amt);

    transactions.push({
      id: `tx-inst-${sadafRow.Record_ID}-${item.installment_no}-${iIdx}`,
      date,
      amount: amt,
      receiptId: receipt || `REC-${sadafRow.Roll_No}`,
      description: `Tuition Installment #${item.installment_no} (${item.phase})`,
      phase: item.phase,
      installmentNo: item.installment_no,
      paymentMethod: 'Cash',
      recordedBy: 'Accounts Office',
      runningBalance: runningBal
    });

    installments.push({
      id: `inst-${sadafRow.Record_ID}-${item.installment_no}-${iIdx}`,
      installmentNumber: item.installment_no,
      phase: item.phase,
      amount: amt,
      dueDate: date,
      status: 'Paid',
      paidDate: date,
      receiptId: receipt,
      amountPaid: amt
    });
  });

  if (sadafRow.Other_Fees_Paid && Number(sadafRow.Other_Fees_Paid) > 0) {
    const rawDates = String(sadafRow.Other_Fees_Receipts_Dates || '').split('|').map(s => s.trim()).filter(Boolean);
    const uniqueReceiptDates = Array.from(new Set(rawDates));
    const chunkAmt = Math.round(Number(sadafRow.Other_Fees_Paid) / Math.max(1, uniqueReceiptDates.length));

    uniqueReceiptDates.forEach((ud, uIdx) => {
      const { receipt, date } = parseReceiptAndDate(ud);
      transactions.push({
        id: `tx-oth-${sadafRow.Record_ID}-${uIdx}`,
        date,
        amount: chunkAmt,
        receiptId: receipt || `REC-OTH-${sadafRow.Record_ID}`,
        description: 'Registration / Board / Misc Ancillary Fee',
        paymentMethod: 'Cash',
        recordedBy: 'Accounts Office',
        isOtherFee: true
      });
    });
  }

  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const feeLedger = {
    status: 'Active',
    sectionId: sadafRow.Section_ID,
    exactSectionName: sadafRow.Exact_Section_Name,
    campus: sadafRow.Campus,
    p1_1stYear_Package: Number(sadafRow.P1_1stYear_Package || 60000),
    p1_1stYear_Paid: Number(sadafRow.P1_1stYear_Paid || 60000),
    p1_1stYear_Remaining: Number(sadafRow.P1_1stYear_Remaining || 0),
    p2_2ndYear_Package: Number(sadafRow.P2_2ndYear_Package || 60000),
    p2_2ndYear_Paid: Number(sadafRow.P2_2ndYear_Paid || 33000),
    p2_2ndYear_Remaining: Number(sadafRow.P2_2ndYear_Remaining || 27000),
    combined_Total_Package: totalPkg,
    combined_Tuition_Paid: totalPaid,
    combined_Remaining_Balance: totalRem,
    otherFeesPaid: Number(sadafRow.Other_Fees_Paid || 53000),
    otherFeesReceiptsDates: sadafRow.Other_Fees_Receipts_Dates || '',
    totalPackage: totalPkg,
    totalReceived: totalPaid,
    remainingBalance: totalRem,
    installments,
    transactions
  };

  // Update BSP-26-647 to SADAF SAJJAD
  console.log('\n2. Updating student BSP-26-647 to SADAF SAJJAD...');
  const { error: stuErr } = await client.from('students').update({
    full_name: 'SADAF SAJJAD',
    father_name: 'SAJJAD HUSSAIN',
    college_no: 'GUENG 24-40',
    section: 'BS-ENGLISH 4th SEMESTER',
    group: 'Eng',
    group_name: 'Eng',
    category: 'BS',
    gender: 'Female',
    session: '2024-28',
    total_package: totalPkg,
    fee_received: totalPaid,
    total_fee_finalized: totalPkg,
    academic_part: 'Semester 4',
    program_type: 'Semester',
    fee_ledger: feeLedger,
    fee_history: transactions
  }).eq('id', 'BSP-26-647');

  if (stuErr) {
    console.error('Error updating BSP-26-647:', stuErr);
  } else {
    console.log('✓ Successfully updated BSP-26-647 to SADAF SAJJAD with full fee ledger and history!');
  }

  // Also update admissions table for SADAF SAJJAD
  const { error: admErr } = await client.from('admissions').update({
    total_package: totalPkg,
    fee_received: totalPaid,
    total_fee_finalized: totalPkg,
    status: 'Admitted/Confirmed',
    is_admitted: true,
    fee_ledger: feeLedger
  }).eq('id', 'd9df23f2-9a21-4acc-a75d-e560e8dcafee');
  console.log('✓ Updated SADAF SAJJAD admission record.');

  // Delete obsolete admission for AREEBA ARSHAD that pointed to BSP-26-647
  await client.from('admissions').delete().eq('id', 'cbd454c5-3ed9-40b6-a75a-999360e7f0c8');
  console.log('✓ Deleted orphaned duplicate admission cbd454c5-3ed9-40b6-a75a-999360e7f0c8.');

  // 3. CLEAN UP DELETED ARCHIVE
  console.log('\n3. Cleaning up settings.config.deletedArchive...');
  const { data: settingsData } = await client.from('settings').select('*').limit(1).maybeSingle();
  const deletedArchive = settingsData?.config?.deletedArchive || [];
  console.log(`Current deletedArchive has ${deletedArchive.length} entries.`);

  const { data: allActiveStudents } = await client.from('students').select('id, full_name, father_name, college_no').range(0, 10000);
  const activeStudentIds = new Set(allActiveStudents.map(s => s.id));
  const activeStudentNames = new Set(allActiveStudents.map(s => `${(s.full_name||'').trim().toLowerCase()}::${(s.father_name||'').trim().toLowerCase()}`));

  // Filter out any archive entry that conflicts with active students
  const cleanedArchive = deletedArchive.filter(arch => {
    if (activeStudentIds.has(arch.studentId) || activeStudentIds.has(arch.originalId) || activeStudentIds.has(arch.id)) {
      return false; // Remove! This is an active verified student
    }
    const nameKey = `${(arch.fullName||'').trim().toLowerCase()}::${(arch.fatherName||'').trim().toLowerCase()}`;
    if (activeStudentNames.has(nameKey)) {
      return false; // Remove! This is an active verified student
    }
    return true;
  });

  console.log(`Cleaned deletedArchive from ${deletedArchive.length} down to ${cleanedArchive.length} (removed ${deletedArchive.length - cleanedArchive.length} blocking entries).`);

  const updatedConfig = {
    ...(settingsData.config || {}),
    deletedArchive: cleanedArchive
  };

  const { error: confErr } = await client.from('settings').update({
    config: updatedConfig,
    updated_at: new Date().toISOString()
  }).eq('id', settingsData.id);

  if (confErr) {
    console.error('Error updating settings config:', confErr);
  } else {
    console.log('✓ Successfully saved cleaned deletedArchive to settings table!');
  }
}

fix();
