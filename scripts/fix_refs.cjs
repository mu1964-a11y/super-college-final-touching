const fs = require('fs');

// 1. Add user and generateStudentId to ctx inside useSupabaseData.ts
let code = fs.readFileSync('src/hooks/useSupabaseData.ts', 'utf-8');
code = code.replace(/const ctx = \{ /, 'const ctx = { user, generateStudentId, ');
fs.writeFileSync('src/hooks/useSupabaseData.ts', code);

// 2. Add user, generateStudentId and AdmissionStatus to the hooks
const files = fs.readdirSync('src/hooks/data');
for (const file of files) {
   let hookCode = fs.readFileSync('src/hooks/data/' + file, 'utf-8');
   
   // Add AdmissionStatus to imports safely
   hookCode = hookCode.replace(/import \{ Lead([^}]+)\} from '\.\.\/\.\.\/types';/, "import { Lead$1, AdmissionStatus } from '../../types';");
   
   // Check if it uses user or generateStudentId
   let needsUser = hookCode.includes('user.');
   let needsGenerate = hookCode.includes('generateStudentId');
   
   let adds = [];
   if (needsUser) adds.push('user');
   if (needsGenerate) adds.push('generateStudentId');
   
   if (adds.length > 0) {
      hookCode = hookCode.replace(/const \{ /g, `const { ${adds.join(', ')}, `);
   }
   
   fs.writeFileSync('src/hooks/data/' + file, hookCode);
}
console.log("Fixed missing refs");
