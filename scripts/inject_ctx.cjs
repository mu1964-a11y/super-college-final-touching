const fs = require('fs');
const path = require('path');

const availableVars = [
  'leads', 'setLeads', 'admissions', 'setAdmissions', 'students', 'setStudents',
  'staff', 'setStaff', 'expenses', 'setExpenses', 'incomes', 'setIncomes',
  'academicRecords', 'setAcademicRecords', 'salaryPayments', 'setSalaryPayments',
  'settings', 'setSettings', 'permissions', 'setPermissions', 'notifications', 'setNotifications',
  'isBulkOperatingRef', 'logActivity', 'fetchData'
];

const files = fs.readdirSync('src/hooks/data');
for (const file of files) {
   let code = fs.readFileSync('src/hooks/data/' + file, 'utf-8');
   
   let usedVars = [];
   for (const v of availableVars) {
      // Very basic substring search is enough since they are distinct names
      if (code.includes(v)) {
         usedVars.push(v);
      }
   }
   
   // Inject const { ... } = ctx; after export function use...
   const lines = code.split('\n');
   for (let i = 0; i < lines.length; i++) {
       if (lines[i].includes('export function')) {
           lines.splice(i + 1, 0, `  const { ${usedVars.join(', ')} } = ctx;`);
           break;
       }
   }
   fs.writeFileSync('src/hooks/data/' + file, lines.join('\n'));
}
console.log("Injected ctx extraction");
