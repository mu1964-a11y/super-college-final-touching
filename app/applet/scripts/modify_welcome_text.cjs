const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('Experience the next generation of academic management. Secure,'));

if (startIdx > -1) {
  // We'll replace the static <p> with an animated list and richer text
  lines[startIdx] = `                Experience the next generation of academic management.`;
  lines[startIdx + 1] = `                A unified ecosystem for students, staff, and administration.`;
  lines[startIdx + 2] = `                Streamlined operations at your fingertips, crafted for excellence.`;
  
  fs.writeFileSync('src/App.tsx', lines.join('\n'));
  console.log('Modified text');
} else {
  console.log('Not found');
}
