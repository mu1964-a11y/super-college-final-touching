import XLSX from 'xlsx';

const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
const csvRows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

const foundAiman = csvRows.filter(r => (r.Student_Name || '').toLowerCase().includes('aiman'));
console.log('Aiman in CSV:', foundAiman.map(r => `${r.Record_ID} | ${r.Student_Name} | ${r.Father_Name} | ${r.Exact_Section_Name} | ${r.Record_Type} | ${r.Roster_Status}`));

const foundFarhan = csvRows.filter(r => (r.Student_Name || '').toLowerCase().includes('farhan'));
console.log('Farhan in CSV:', foundFarhan.map(r => `${r.Record_ID} | ${r.Student_Name} | ${r.Father_Name} | ${r.Exact_Section_Name} | ${r.Record_Type} | ${r.Roster_Status}`));
