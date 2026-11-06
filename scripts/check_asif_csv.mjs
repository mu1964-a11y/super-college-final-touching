import XLSX from 'xlsx';

const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

const r1 = rows.find(r => r.Record_ID === 'VER-0795');
console.log('VER-0795 (Usman Asif):', r1);

const r2 = rows.find(r => r.Record_ID === 'VER-0835');
console.log('VER-0835 (Shahzaib Muneer):', r2);
