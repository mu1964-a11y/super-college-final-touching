const fs = require('fs');

const code = fs.readFileSync('src/hooks/useSupabaseData.ts', 'utf-8');
const lines = code.split('\n');

function extractMethod(name) {
    const rx1 = new RegExp(`const ${name} = `);
    const rx2 = new RegExp(`^[\\s]*${name}:\\s*(async\\s*)?\\(`);
    let startIdx = -1;
    let isInline = false;

    for (let i = 0; i < lines.length; i++) {
        if (rx1.test(lines[i])) { startIdx = i; isInline = false; break; }
        if (rx2.test(lines[i])) { startIdx = i; isInline = true; break; }
    }

    if (startIdx === -1) return null;

    let braceCount = 0;
    let endIdx = -1;
    let started = false;

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        for (const char of line) {
            if (char === '{') { braceCount++; started = true; }
            if (char === '}') braceCount--;
        }
        if (started && braceCount === 0) {
            endIdx = i;
            break;
        }
    }
    
    // Add comma to inline regex end if it exists on next lines
    if (isInline && endIdx !== -1) {
       for(let j = endIdx; j < lines.length; j++){
           if (lines[j].includes(',')) {
              endIdx = j;
              if (lines[j].indexOf(',') >= 0) break;
           }
       }
    }

    return { startIdx, endIdx, code: lines.slice(startIdx, endIdx + 1).join('\n'), isInline };
}

console.log("addLead:", extractMethod("addLead")?.endIdx);
console.log("importLeads:", extractMethod("importLeads")?.endIdx);
