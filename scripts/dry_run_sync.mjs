import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

function normalizeSession(sess) {
  if (!sess) return '2026-28';
  const str = String(sess).trim();
  if (str === '2025-2027') return '2025-27';
  if (str === '2026-2028') return '2026-28';
  if (str === '2023-2027') return '2023-27';
  if (str === '2024-2028') return '2024-28';
  if (str === '2025-2029') return '2025-29';
  if (str === '2026-2030') return '2026-30';
  if (str === '2024-2026') return '2024-26';
  return str;
}

function parseReceiptAndDate(str, fallbackDate) {
  if (!str) return { receipt: '', date: fallbackDate || '2026-09-01' };
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
  return { receipt: trimmed, date: fallbackDate || '2026-09-01' };
}

async function dryRun() {
  const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
  const csvRows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

  const wbXlsx = XLSX.readFile('College_2023_2030_Lightweight.xlsx');
  const sectionsMaster = XLSX.utils.sheet_to_json(wbXlsx.Sheets['1_Sections_Master']);

  console.log(`CSV Rows: ${csvRows.length}`);
  console.log(`Sections Master: ${sectionsMaster.length}`);

  const verified = csvRows.filter(r => r.Record_Type === 'VERIFIED_ROSTER');
  console.log(`Verified Rows: ${verified.length}`);

  let totalParsedInstallments = 0;
  let totalOtherFees = 0;

  const sectionCounts = {};

  verified.forEach((r, idx) => {
    const secKey = `${r.Section_ID} | ${r.Exact_Section_Name} | ${r.Session}`;
    sectionCounts[secKey] = (sectionCounts[secKey] || 0) + 1;

    let ledgerJson = [];
    try {
      if (r.Installments_Ledger_JSON) {
        ledgerJson = JSON.parse(r.Installments_Ledger_JSON);
      }
    } catch (e) {}

    const totalPkg = Number(r.Combined_Total_Package || 0);
    let runningBalance = totalPkg;

    const txs = [];
    ledgerJson.forEach((item, iIdx) => {
      totalParsedInstallments++;
      const { receipt, date } = parseReceiptAndDate(item.receipt_date);
      const amt = Number(item.amount || 0);
      runningBalance = Math.max(0, runningBalance - amt);
      txs.push({
        id: `tx-inst-${r.Record_ID}-${item.installment_no}-${iIdx}`,
        date,
        amount: amt,
        receiptId: receipt,
        description: `Tuition Installment #${item.installment_no} (${item.phase})`,
        phase: item.phase,
        installmentNo: item.installment_no,
        paymentMethod: 'Cash',
        runningBalance
      });
    });

    if (r.Other_Fees_Paid && Number(r.Other_Fees_Paid) > 0) {
      totalOtherFees++;
      const rawDates = String(r.Other_Fees_Receipts_Dates || '').split('|').map(s => s.trim()).filter(Boolean);
      const uniqueDates = Array.from(new Set(rawDates));
      uniqueDates.forEach((ud, uIdx) => {
        const { receipt, date } = parseReceiptAndDate(ud);
        txs.push({
          id: `tx-oth-${r.Record_ID}-${uIdx}`,
          date,
          amount: Math.round(Number(r.Other_Fees_Paid) / Math.max(1, uniqueDates.length)),
          receiptId: receipt,
          description: 'Registration / Board / Misc Ancillary Fee',
          paymentMethod: 'Cash',
          isOtherFee: true
        });
      });
    }
  });

  console.log(`Total parsed installments: ${totalParsedInstallments}`);
  console.log(`Total students with other fees: ${totalOtherFees}`);

  console.log('\n--- Section Headcounts in CSV ---');
  let totalHeadcount = 0;
  sectionsMaster.forEach(sm => {
    const key = `${sm.Section_ID} | ${sm.Exact_Section_Name} | ${sm.Session}`;
    const countInCsv = sectionCounts[key] || 0;
    const match = countInCsv === sm.Exact_Student_Count ? '✓' : `✗ MISMATCH (CSV:${countInCsv}, Master:${sm.Exact_Student_Count})`;
    console.log(`  ${sm.Section_ID} [${sm.Exact_Section_Name}]: ${countInCsv} students ${match}`);
    totalHeadcount += countInCsv;
  });

  console.log(`\nTotal verified headcount across 55 sections: ${totalHeadcount} (Expected: 870)`);
}

dryRun();
