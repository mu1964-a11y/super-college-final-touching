const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(/const (\w+) = React\.lazy\(\(\) => import\("\.\/components\/(\w+)"\)\);/g, 'import $1 from "./components/$2";');

// Now remove the <React.Suspense ...> block wrapper:
code = code.replace(/<React\.Suspense fallback=\{[\s\S]*?Loading Component\.\.\.<\/p>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\}>/, '');
code = code.replace(/<\/React\.Suspense>/g, '');

fs.writeFileSync('src/App.tsx', code);
console.log("Lazy loading removed.");
