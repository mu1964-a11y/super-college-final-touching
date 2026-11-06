import fs from 'fs';
import path from 'path';

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') {
        files = files.concat(walk(full));
      }
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

const files = walk('./src');
const issues = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('.split(')) {
      // Check if it's safe (e.g. `new Date().toISOString().split(` or `String(...).split(` or `(x || '').split(` or `?.split(`)
      const trimmed = line.trim();
      const safePatterns = [
        'new Date().',
        'toISOString().split',
        '?.split(',
        '|| "").split(',
        "|| '').split(",
        'String(',
        'const lines = content.split',
        'const lines = html.split'
      ];
      const seemsSafe = safePatterns.some(p => trimmed.includes(p));
      issues.push({ file, line: idx + 1, text: trimmed, seemsSafe });
    }
  });
});

console.log(`Found ${issues.length} total .split() occurrences.`);
console.log('\n--- POTENTIALLY UNGUARDED .split() CALLS ---');
issues.filter(i => !i.seemsSafe).forEach(i => {
  console.log(`${i.file}:${i.line}: ${i.text}`);
});
