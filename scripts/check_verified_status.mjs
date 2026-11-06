import XLSX from 'xlsx';

const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
const csvRows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

const verified = csvRows.filter(r => r.Record_Type === 'VERIFIED_ROSTER');
const vStat = {};
verified.forEach(r => {
  vStat[r.Roster_Status] = (vStat[r.Roster_Status] || 0) + 1;
});
console.log('Verified roster statuses:', vStat);
