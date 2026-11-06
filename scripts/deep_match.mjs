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

async function deepMatch() {
  const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
  const csvRows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

  let dbStudents = [];
  let page = 0;
  while (true) {
    const { data } = await supabase.from('students').select('*').range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    dbStudents.push(...data);
    if (data.length < 1000) break;
    page++;
  }

  const verifiedRows = csvRows.filter(r => r.Record_Type === 'VERIFIED_ROSTER');

  console.log(`DB Students: ${dbStudents.length}`);
  console.log(`CSV Verified Rows: ${verifiedRows.length}`);

  // Normalize string helper
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  let matched = [];
  let unmatchedDb = [];
  let unmatchedCsv = [];

  const usedCsvIndices = new Set();

  dbStudents.forEach(db => {
    const dbName = norm(db.full_name);
    const dbFather = norm(db.father_name);
    const dbRoll = norm(db.college_no);

    let matchIdx = -1;

    // 1. Try matching by roll_no + name
    if (dbRoll) {
      matchIdx = verifiedRows.findIndex((c, idx) => !usedCsvIndices.has(idx) && norm(c.Roll_No) === dbRoll && norm(c.Student_Name) === dbName);
    }
    // 2. Try matching by full_name + father_name
    if (matchIdx === -1) {
      matchIdx = verifiedRows.findIndex((c, idx) => !usedCsvIndices.has(idx) && norm(c.Student_Name) === dbName && (!dbFather || norm(c.Father_Name) === dbFather));
    }
    // 3. Try matching by full_name only if exact and unique
    if (matchIdx === -1) {
      const candidates = verifiedRows.map((c, idx) => (!usedCsvIndices.has(idx) && norm(c.Student_Name) === dbName) ? idx : -1).filter(i => i !== -1);
      if (candidates.length === 1) {
        matchIdx = candidates[0];
      }
    }

    if (matchIdx !== -1) {
      usedCsvIndices.add(matchIdx);
      matched.push({ db, csv: verifiedRows[matchIdx] });
    } else {
      unmatchedDb.push(db);
    }
  });

  verifiedRows.forEach((c, idx) => {
    if (!usedCsvIndices.has(idx)) {
      unmatchedCsv.push(c);
    }
  });

  console.log(`Matched: ${matched.length}`);
  console.log(`Unmatched DB Students: ${unmatchedDb.length}`);
  console.log(`Unmatched CSV Verified: ${unmatchedCsv.length}`);

  if (unmatchedDb.length > 0) {
    console.log('Unmatched DB sample:', unmatchedDb.map(s => `${s.id} | ${s.full_name} | ${s.father_name} | ${s.section}`));
  }

  const leftInUnmatched = unmatchedCsv.filter(c => String(c.Roster_Status).includes('Left')).length;
  const activeInUnmatched = unmatchedCsv.filter(c => !String(c.Roster_Status).includes('Left')).length;
  console.log(`Unmatched CSV breakdown: ${leftInUnmatched} LEFT, ${activeInUnmatched} Active`);
  if (activeInUnmatched > 0) {
    console.log('Active unmatched CSV:', unmatchedCsv.filter(c => !String(c.Roster_Status).includes('Left')).map(c => `${c.Record_ID} | ${c.Student_Name} | ${c.Father_Name} | ${c.Exact_Section_Name}`));
  }
}

deepMatch();
