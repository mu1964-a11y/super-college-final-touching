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

async function finalAudit() {
  let allStudents = [];
  let page = 0;
  while (true) {
    const { data } = await supabase.from('students').select('*').range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    allStudents.push(...data);
    if (data.length < 1000) break;
    page++;
  }

  console.log(`Total Students in DB: ${allStudents.length}`);

  // Headcount by Section ID & Exact Section Name
  const secCounts = {};
  allStudents.forEach(s => {
    const secId = s.fee_ledger?.sectionId || 'UNKNOWN';
    const secName = s.section;
    const campus = s.fee_ledger?.campus || 'Superior College Jahanian';
    const key = `${secId} | ${secName} (${campus})`;
    secCounts[key] = (secCounts[key] || 0) + 1;
  });

  console.log('\n--- HEADCOUNT AUDIT (55 SECTIONS) ---');
  for (const [k, v] of Object.entries(secCounts).sort()) {
    console.log(`  ${k} => ${v}`);
  }

  // Inter Part 2 total
  const interPart2 = allStudents.filter(s => s.category === 'Inter Part 2');
  console.log(`\nInter Part 2 Total: ${interPart2.length} (Target: 307)`);

  // Inter Part 1 active & left
  const interPart1Active = allStudents.filter(s => s.category === 'Inter Part 1' && s.fee_ledger?.status !== 'Left');
  const interPart1Left = allStudents.filter(s => s.category === 'Inter Part 1' && s.fee_ledger?.status === 'Left');
  console.log(`Inter Part 1 Active: ${interPart1Active.length} (Target: 285)`);
  console.log(`Inter Part 1 Left: ${interPart1Left.length} (Target: 35)`);
  console.log(`Inter Part 1 Total: ${interPart1Active.length + interPart1Left.length} (Target: 320)`);

  // BS Superior vs Aspire
  const bsSuperior = allStudents.filter(s => s.category === 'BS' && (!s.fee_ledger?.campus || s.fee_ledger.campus.includes('Superior')));
  const bsAspire = allStudents.filter(s => s.category === 'BS' && s.fee_ledger?.campus && s.fee_ledger.campus.includes('Aspire'));
  console.log(`BS Superior College Jahanian: ${bsSuperior.length} (Target: 202)`);
  console.log(`BS Aspire College Mukhdoom Rasheed: ${bsAspire.length} (Target: 41)`);
  console.log(`BS Total: ${bsSuperior.length + bsAspire.length} (Target: 243)`);

  // Total Verified
  console.log(`\nGRAND TOTAL VERIFIED: ${interPart2.length + interPart1Active.length + interPart1Left.length + bsSuperior.length + bsAspire.length} (Target: 870)`);

  // Sample student ledger verification
  const sampleStudent = allStudents.find(s => s.college_no === '3' && s.section === 'MEP-G2');
  console.log('\nSample Student (Zara Ansar - MEP-G2 Roll 3):');
  console.log({
    id: sampleStudent?.id,
    name: sampleStudent?.full_name,
    section: sampleStudent?.section,
    secId: sampleStudent?.fee_ledger?.sectionId,
    p1Package: sampleStudent?.fee_ledger?.p1_1stYear_Package,
    p1Paid: sampleStudent?.fee_ledger?.p1_1stYear_Paid,
    p1Rem: sampleStudent?.fee_ledger?.p1_1stYear_Remaining,
    p2Package: sampleStudent?.fee_ledger?.p2_2ndYear_Package,
    p2Paid: sampleStudent?.fee_ledger?.p2_2ndYear_Paid,
    p2Rem: sampleStudent?.fee_ledger?.p2_2ndYear_Remaining,
    combPackage: sampleStudent?.fee_ledger?.combined_Total_Package,
    combPaid: sampleStudent?.fee_ledger?.combined_Tuition_Paid,
    combRem: sampleStudent?.fee_ledger?.combined_Remaining_Balance,
    otherFeesPaid: sampleStudent?.fee_ledger?.otherFeesPaid,
    otherReceipts: sampleStudent?.fee_ledger?.otherFeesReceiptsDates,
    transactionsCount: sampleStudent?.fee_ledger?.transactions?.length,
    firstTx: sampleStudent?.fee_ledger?.transactions?.[0],
    lastTx: sampleStudent?.fee_ledger?.transactions?.[sampleStudent?.fee_ledger?.transactions?.length - 1]
  });
}

finalAudit();
