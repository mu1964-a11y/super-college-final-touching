const fs = require('fs');

const files = fs.readdirSync('src/hooks/data');
for (const file of files) {
   let code = fs.readFileSync('src/hooks/data/' + file, 'utf-8');
   
   // Undo the bad replaces
   code = code.replace(/const \{ user, generateStudentId, /g, 'const { ');
   code = code.replace(/const \{ user, /g, 'const { ');
   code = code.replace(/const \{ generateStudentId, /g, 'const { ');
   
   // Get right context vars
   let needsUser = code.includes('user.');
   let needsGenerate = code.includes('generateStudentId');
   
   let adds = [];
   if (needsUser) adds.push('user');
   if (needsGenerate) adds.push('generateStudentId');
   
   if (adds.length > 0) {
      // Find the line that has export function use...
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('export function') && lines[i+1].includes('const {')) {
             // i+1 is something like const { leads, setLeads } = ctx;
             lines[i+1] = lines[i+1].replace('const { ', `const { ${adds.join(', ')}, `);
             break;
          }
      }
      code = lines.join('\n');
   }
   
   fs.writeFileSync('src/hooks/data/' + file, code);
}
console.log("Restored and fixed");
