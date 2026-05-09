const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('Experience the next generation of academic management.'));

if (startIdx > -1) {
  // Restore the <p> tag
  lines[startIdx] = `                Experience the next generation of academic management. Secure, `;
  lines[startIdx + 1] = `                A unified ecosystem for students, staff, and administration. `;
  lines[startIdx + 2] = `                Streamlined operations at your fingertips, crafted for excellence.</p>`;
  
  fs.writeFileSync('src/App.tsx', lines.join('\n'));
  console.log('Modified text');
} else {
  console.log('Not found');
}
