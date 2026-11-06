import XLSX from 'xlsx';

const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

const verified = rows.filter(r => r.Record_Type === 'VERIFIED_ROSTER');

console.log('Verified count:', verified.length);

// Group by Exact_Section_Name and Section_ID
const secCounts = {};
verified.forEach(r => {
  const key = `${r.Program} | ${r.Session} | ${r.Exact_Section_Name} | ${r.Section_ID}`;
  secCounts[key] = (secCounts[key] || 0) + 1;
});

console.log('\nVerified Sections & Counts:');
for (const [k, v] of Object.entries(secCounts).sort()) {
  console.log(`  ${k} => ${v}`);
}
