import XLSX from 'xlsx';

const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
const csvRows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

const unverified = csvRows.filter(r => r.Record_Type !== 'VERIFIED_ROSTER');
console.log('Unverified / Other count:', unverified.length);
console.log('Sample row:', unverified[0]);
console.log('Status breakdown:');
const sMap = {};
unverified.forEach(u => {
  sMap[u.Roster_Status] = (sMap[u.Roster_Status] || 0) + 1;
});
console.log(sMap);
