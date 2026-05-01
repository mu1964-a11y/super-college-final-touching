const fs = require('fs');
const file = 'src/hooks/useSupabaseData.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/await fetchData\(true\);/g, '// await fetchData(true);');
code = code.replace(/fetchData\(true\); \/\/ Fire and forget/g, '// fetchData(true); // Fire and forget');
code = code.replace(/        fetchData\(true\);/g, '        // fetchData(true);');

// Specifically keep the realtime debounce valid
// We'll just replace the exact line if needed, but the debounce is inside useEffect:
// `debounceTimerRef.current = setTimeout(() => { \n      fetchData(true);\n    }, 1500);`
// Actually earlier I replaced `      fetchData(true);`. But I used `      // fetchData(true);` above? No my regex was exact spaces.

fs.writeFileSync(file, code);
console.log("Done");
