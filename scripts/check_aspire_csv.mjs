import XLSX from 'xlsx';

const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

const aspire = rows.filter(r => r.Campus && r.Campus.includes('Aspire'));
console.log('Aspire rows count:', aspire.length);
aspire.forEach(a => {
  console.log(`${a.Record_ID} | ${a.Campus} | ${a.Section_ID} | ${a.Exact_Section_Name} | ${a.Student_Name} | ${a.Session}`);
});
