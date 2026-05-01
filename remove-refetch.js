const fs = require('fs');
const file = 'src/hooks/useSupabaseData.ts';
let code = fs.readFileSync(file, 'utf-8');

// We want to replace `await fetchData(true);` with `// await fetchData(true);`
// But we should NOT replace it inside the realtime listener `fetchData(true);`
code = code.replace(/await fetchData\(true\);/g, '// await fetchData(true);');
code = code.replace(/fetchData\(true\); \/\/ Fire and forget/g, '// fetchData(true); // Fire and forget');

// Keep the others commented except line 258 which is in debounceTimerRef
code = code.replace(/        fetchData\(true\);/g, '        // fetchData(true);');
code = code.replace(/      fetchData\(true\);/g, '      // fetchData(true);');

// Restore the allowed ones (e.g. inside debounceTimerRef on line 258)
code = code.replace(/\/\/       \/\/ fetchData\(true\);\n    }, 1500\);/g, '      fetchData(true);\n    }, 1500);');

fs.writeFileSync(file, code);
console.log("Done");
