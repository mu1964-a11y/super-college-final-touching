import XLSX from 'xlsx';

const wb = XLSX.readFile('College_2023_2030_Lightweight.xlsx');
const sheet = XLSX.utils.sheet_to_json(wb.Sheets['1_Sections_Master']);

console.log(JSON.stringify(sheet, null, 2));
