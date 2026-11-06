import XLSX from 'xlsx';

const wb = XLSX.readFile('College_2023_2030_Lightweight.xlsx');
const unverified = XLSX.utils.sheet_to_json(wb.Sheets['3_Unverified_Fee_23_30']);

console.log('Unverified count:', unverified.length);
const unvStat = {};
const unvProg = {};
const unvSess = {};
unverified.forEach(u => {
  unvStat[u.Roster_Status] = (unvStat[u.Roster_Status] || 0) + 1;
  unvProg[u.Program] = (unvProg[u.Program] || 0) + 1;
  unvSess[u.Session] = (unvSess[u.Session] || 0) + 1;
});
console.log('Statuses:', unvStat);
console.log('Programs:', unvProg);
console.log('Sessions:', unvSess);
