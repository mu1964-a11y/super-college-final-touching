const xlsx = require('xlsx');
const fs = require('fs');

const files = [
  'B.S 2026-2030.xlsx',
  'Bs & 5th Semester 2023-2027.xlsx',
  'BS Students All Samesters.xlsx',
  'Bscs 2024-2028.xlsx',
  'Bscs 2025-2029.xlsx'
];

for (const f of files) {
  const p = 'college_excels/' + f;
  if (!fs.existsSync(p)) continue;
  console.log('\n====================================');
  console.log('FILE:', f);
  const wb = xlsx.readFile(p, { dense: true });
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (!data || data.length === 0) continue;
    console.log(`\n--- Sheet: [${sheetName}] (Rows: ${data.length}) ---`);
    // Print first 5 rows with content
    const sample = data.filter(r => r && r.length > 0).slice(0, 5);
    sample.forEach((r, idx) => {
      console.log(`  Row ${idx}:`, JSON.stringify(r.slice(0, 12)));
    });
  }
}
