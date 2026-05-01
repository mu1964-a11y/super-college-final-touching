const fs = require('fs');

const code = fs.readFileSync('src/hooks/useSupabaseData.ts', 'utf-8');
const lines = code.split('\n');

function extractMethod(name) {
    const rx1 = new RegExp(`const ${name} = `);
    const rx2 = new RegExp(`^[\\s]*${name}:\\s*(async\\s*)?\\(`);
    let startIdx = -1;
    let isInline = false;

    for (let i = 0; i < lines.length; i++) {
        if (rx1.test(lines[i])) { startIdx = i; isInline = false; break; }
        if (rx2.test(lines[i])) { startIdx = i; isInline = true; break; }
    }

    if (startIdx === -1) return null;

    let braceCount = 0;
    let endIdx = -1;
    let started = false;

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        for (const char of line) {
            if (char === '{') { braceCount++; started = true; }
            if (char === '}') braceCount--;
        }
        if (started && braceCount === 0) {
            endIdx = i;
            break;
        }
    }
    
    if (isInline && endIdx !== -1) {
       let added = false;
       for(let j = endIdx; j <= endIdx + 2 && j < lines.length; j++){
           // include trailing comma if inline
           if (lines[j].includes(',')) {
              endIdx = j;
              break;
           }
       }
    } else if (!isInline && endIdx !== -1) {
       for(let j = endIdx; j <= endIdx + 1 && j < lines.length; j++){
           // include trailing semicolon
           if (lines[j].includes(';')) {
              endIdx = j;
              break;
           }
       }
    }

    return { startIdx, endIdx, isInline };
}

const domains = {
    useLeadsOperations: ['addLead', 'updateLead', 'deleteLead', 'bulkDeleteLeads', 'importLeads', 'convertLeadsToApplicants'],
    useAdmissionsOperations: ['addAdmission', 'updateAdmission', 'deleteAdmission', 'bulkDeleteAdmissions', 'confirmAdmission'],
    useStudentsOperations: ['addStudent', 'updateStudent', 'deleteStudent', 'bulkDeleteStudents', 'promoteSemester'],
    useAccountsOperations: ['addIncome', 'addExpense', 'recordFeePayment', 'recordFeeTransaction', 'updateInstallments', 'updateFeePackage', 'addSalaryPayment'],
    useStaffOperations: ['addStaff', 'updateStaff', 'deleteStaff', 'bulkDeleteStaff'],
    useSettingsOperations: ['updateSettings', 'updatePermission', 'deletePermission', 'markNotificationRead', 'clearAllNotifications'],
    useAcademicOperations: ['addAcademicRecord', 'importAcademicRecords']
};

let remainingLines = [...lines];

function convertToStandardFunction(chunk, name) {
    // If it's `name: async (args) => {`, replace it with `const name = async (args) => {`
    // If it ends with `,`, remove it.
    let codeStr = chunk.join('\n');
    const rx = new RegExp(`^[\\s]*${name}:\\s*(async\\s*)?\\(`);
    if (rx.test(codeStr)) {
        codeStr = codeStr.replace(rx, `  const ${name} = $1(`);
    }
    codeStr = codeStr.replace(/,\s*$/, ';');
    return codeStr;
}

if (!fs.existsSync('src/hooks/data')) fs.mkdirSync('src/hooks/data');

for (const [hookName, methods] of Object.entries(domains)) {
    let hookLines = [
        `import { supabase } from '../../lib/supabase';`,
        `import { toast } from 'sonner';`,
        `import { Lead, Admission, Student, Staff, Expense, Income, AppSettings, UserPermission, Notification, AcademicRecord, SalaryPayment, FeePayment, Installment, FeeTransaction } from '../../types';`,
        ``,
        `export function ${hookName}(ctx: any) {`,
    ];

    let extractedBlocks = [];

    for (const method of methods) {
        const ext = extractMethod(method);
        if (ext) {
            const chunk = lines.slice(ext.startIdx, ext.endIdx + 1);
            
            // Blank out the lines in original file
            for(let i = ext.startIdx; i <= ext.endIdx; i++) {
                remainingLines[i] = `/* REFACTORED: ${method} */`;
            }

            extractedBlocks.push(convertToStandardFunction(chunk, method));
        }
    }

    hookLines.push(extractedBlocks.join('\n\n'));
    hookLines.push(`  return { ${methods.join(', ')} };`);
    hookLines.push(`}`);

    fs.writeFileSync(`src/hooks/data/${hookName}.ts`, hookLines.join('\n'));
}

// Now clean up remainingLines
// Remove the REFACTORED blanks but leave one blank line max
let cleanedLines = [];
let skip = false;
for (const line of remainingLines) {
    if (line.includes('/* REFACTORED:')) {
        skip = true; continue; 
    }
    if (skip && line.trim() === '') {
        continue;
    }
    skip = false;
    cleanedLines.push(line);
}

fs.writeFileSync('src/hooks/useSupabaseData.ts.new', cleanedLines.join('\n'));
console.log("Extraction complete!");

