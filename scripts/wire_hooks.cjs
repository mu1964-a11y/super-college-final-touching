const fs = require('fs');

let code = fs.readFileSync('src/hooks/useSupabaseData.ts.new', 'utf-8');

const imports = [
  "import { useLeadsOperations } from './data/useLeadsOperations';",
  "import { useAdmissionsOperations } from './data/useAdmissionsOperations';",
  "import { useStudentsOperations } from './data/useStudentsOperations';",
  "import { useAccountsOperations } from './data/useAccountsOperations';",
  "import { useStaffOperations } from './data/useStaffOperations';",
  "import { useSettingsOperations } from './data/useSettingsOperations';",
  "import { useAcademicOperations } from './data/useAcademicOperations';"
];

// Combine state variables into a ctx object before the return block
// The return block starts with "return {"
const lines = code.split('\n');

// Find imports insertion point
let importIdx = lines.findIndex(l => l.includes("import { supabase }"));
lines.splice(importIdx + 1, 0, ...imports);

// Find return block start
let retIdx = lines.findIndex(l => l.trim() === 'return {');

const ctxVars = [
  'leads', 'setLeads', 'admissions', 'setAdmissions', 'students', 'setStudents',
  'staff', 'setStaff', 'expenses', 'setExpenses', 'incomes', 'setIncomes',
  'academicRecords', 'setAcademicRecords', 'salaryPayments', 'setSalaryPayments',
  'settings', 'setSettings', 'permissions', 'setPermissions', 'notifications', 'setNotifications',
  'isBulkOperatingRef', 'logActivity', 'fetchData'
];

const injections = [
  `  const ctx = { ${ctxVars.join(', ')} };`,
  `  const leadsOps = useLeadsOperations(ctx);`,
  `  const admissionsOps = useAdmissionsOperations(ctx);`,
  `  const studentsOps = useStudentsOperations(ctx);`,
  `  const accountsOps = useAccountsOperations(ctx);`,
  `  const staffOps = useStaffOperations(ctx);`,
  `  const settingsOps = useSettingsOperations(ctx);`,
  `  const academicOps = useAcademicOperations(ctx);`
];

// Insert the hooks before the return statement.
// Since return statement's index has shifted due to imports, recalculate:
retIdx = lines.findIndex(l => l.trim() === 'return {');

lines.splice(retIdx, 0, ...injections);

// Now inside the return block, replace the raw functions with ...leadsOps, ...admissionsOps
// It's easier: just comment out the raw variables! The easiest is to just find the ones in domains!
const domains = {
    useLeadsOperations: ['addLead', 'updateLead', 'deleteLead', 'bulkDeleteLeads', 'importLeads', 'convertLeadsToApplicants'],
    useAdmissionsOperations: ['addAdmission', 'updateAdmission', 'deleteAdmission', 'bulkDeleteAdmissions', 'confirmAdmission'],
    useStudentsOperations: ['addStudent', 'updateStudent', 'deleteStudent', 'bulkDeleteStudents', 'promoteSemester'],
    useAccountsOperations: ['addIncome', 'addExpense', 'recordFeePayment', 'recordFeeTransaction', 'updateInstallments', 'updateFeePackage', 'addSalaryPayment'],
    useStaffOperations: ['addStaff', 'updateStaff', 'deleteStaff', 'bulkDeleteStaff'],
    useSettingsOperations: ['updateSettings', 'updatePermission', 'deletePermission', 'markNotificationRead', 'clearAllNotifications'],
    useAcademicOperations: ['addAcademicRecord', 'importAcademicRecords']
};

let allMethods = [];
Object.values(domains).forEach(arr => allMethods.push(...arr));

for (let i = retIdx + injections.length; i < lines.length; i++) {
    for (const m of allMethods) {
        // match word boundary
        const rx = new RegExp(`^\\s*${m}\\s*,?`);
        if (rx.test(lines[i])) {
            lines[i] = `    // ${lines[i].trim()}`;
        }
    }
}

// Add the spreads inside the return block
lines.splice(retIdx + injections.length + 1, 0, 
  `    ...leadsOps,`,
  `    ...admissionsOps,`,
  `    ...studentsOps,`,
  `    ...accountsOps,`,
  `    ...staffOps,`,
  `    ...settingsOps,`,
  `    ...academicOps,`
);

fs.writeFileSync('src/hooks/useSupabaseData.ts.final', lines.join('\n'));
console.log("Wiring completed");
