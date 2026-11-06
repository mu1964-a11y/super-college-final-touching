import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';

const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

console.log('Total rows in CSV:', rows.length);

const sessionMap = {};
const sectionMap = {};
const programMap = {};
const statusMap = {};

rows.forEach((r, idx) => {
  const sess = r.Session;
  const sec = r.Exact_Section_Name;
  const prog = r.Program;
  const stat = r.Roster_Status;

  sessionMap[sess] = (sessionMap[sess] || 0) + 1;
  programMap[prog] = (programMap[prog] || 0) + 1;
  statusMap[stat] = (statusMap[stat] || 0) + 1;

  const key = `${prog} | ${sess} | ${sec} | ${r.Section_ID}`;
  sectionMap[key] = (sectionMap[key] || 0) + 1;
});

console.log('\nSessions in CSV:');
console.log(sessionMap);

console.log('\nPrograms in CSV:');
console.log(programMap);

console.log('\nRoster Status in CSV:');
console.log(statusMap);

console.log('\nSections breakdown:');
for (const [k, v] of Object.entries(sectionMap).sort()) {
  console.log(`  ${k} => ${v}`);
}
