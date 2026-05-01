const fs = require('fs');

const files = fs.readdirSync('src/hooks/data');
for (const file of files) {
   let lines = fs.readFileSync('src/hooks/data/' + file, 'utf-8').split('\n');
   
   for (let i = 0; i < lines.length; i++) {
       if (lines[i].includes('export function') && lines[i+1].includes('const {')) {
           // We just inject user and generateStudentId into the destructuring.
           // Only add them if not already there to prevent syntax errors
           let str = lines[i+1];
           if (!str.includes(' user,')) str = str.replace('const { ', 'const { user, ');
           if (!str.includes(' generateStudentId,')) str = str.replace('const { ', 'const { generateStudentId, ');
           lines[i+1] = str;
           break;
       }
   }
   
   fs.writeFileSync('src/hooks/data/' + file, lines.join('\n'));
}
console.log("Forced user and generateStudentId");
