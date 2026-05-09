const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('animate={{ opacity: 1, scale: 1 }}'));

if (startIdx > -1) {
  lines[startIdx] = `                    animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}`;
  lines[startIdx+1] = `                    transition={{ delay: 0.6 + (i * 0.1), duration: 3, repeat: Infinity, ease: "easeInOut" }}`;
  fs.writeFileSync('src/App.tsx', lines.join('\n'));
  console.log('Modified animation');
} else {
  console.log('Not found');
}
