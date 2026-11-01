const fs = require('fs');

// 1. StudentsView.tsx
let sv = fs.readFileSync('src/components/StudentsView.tsx', 'utf8').replace(/\r\n/g, '\n');
const oldSv = `<TableRow key={student.id} className="group cursor-pointer hover:bg-slate-50/50" onClick={() => { setSelectedStudent(student); setDialogType('profile'); }}>`;
const newSv = `<TableRow key={student.id} className="group cursor-pointer border-b border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors" onClick={() => { setSelectedStudent(student); setDialogType('profile'); }}>`;

if (sv.includes(oldSv)) {
  fs.writeFileSync('src/components/StudentsView.tsx', sv.replace(oldSv, newSv), 'utf8');
  console.log('✓ Updated StudentsView.tsx divider borders');
} else {
  console.log('Could not find oldSv in StudentsView.tsx');
}

// 2. AdmissionsView.tsx
let av = fs.readFileSync('src/components/AdmissionsView.tsx', 'utf8').replace(/\r\n/g, '\n');
const oldAv = `"group transition-all border-slate-100 cursor-pointer relative"`;
const newAv = `"group transition-all border-b border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer relative"`;
if (av.includes(oldAv)) {
  fs.writeFileSync('src/components/AdmissionsView.tsx', av.replace(oldAv, newAv), 'utf8');
  console.log('✓ Updated AdmissionsView.tsx divider borders');
} else {
  console.log('Could not find oldAv in AdmissionsView.tsx');
}

// 3. FeeManagementView.tsx
let fv = fs.readFileSync('src/components/FeeManagementView.tsx', 'utf8').replace(/\r\n/g, '\n');
const oldFv = `"group hover:bg-emerald-50/60 transition-colors border-slate-100 cursor-pointer h-[75px]"`;
const newFv = `"group hover:bg-emerald-50/60 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer h-[75px]"`;
if (fv.includes(oldFv)) {
  fs.writeFileSync('src/components/FeeManagementView.tsx', fv.replace(oldFv, newFv), 'utf8');
  console.log('✓ Updated FeeManagementView.tsx divider borders');
} else {
  console.log('Could not find oldFv in FeeManagementView.tsx');
}
