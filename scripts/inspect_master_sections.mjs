import XLSX from 'xlsx';

const wb = XLSX.readFile('College_2023_2030_Lightweight.xlsx');
const secSheet = XLSX.utils.sheet_to_json(wb.Sheets['1_Sections_Master']);

console.log('Sections Master Count:', secSheet.length);
console.log('\n--- ALL SECTIONS IN MASTER ---');
secSheet.forEach(s => {
  console.log(`${s.Section_ID} | ${s.Campus} | ${s.Program} | ${s.Session} | ${s.Exact_Section_Name} | Headcount: ${s.Exact_Student_Count} (B:${s.Boys_Count}, G:${s.Girls_Count})`);
});
