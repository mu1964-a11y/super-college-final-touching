const xlsx = require('xlsx');
const fs = require('fs');

const files = [
  'Bs & 5th Semester 2023-2027.xlsx',
  'Bscs 2024-2028.xlsx',
  'Bscs 2025-2029.xlsx',
  'B.S 2026-2030.xlsx'
];

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

const extractedRecords = [];

files.forEach(f => {
  const p = 'college_excels/' + f;
  if (!fs.existsSync(p)) return;
  const wb = xlsx.readFile(p, { dense: true });
  wb.SheetNames.forEach(sheetName => {
    // Only look at BS semester sheets
    if (!sheetName.toLowerCase().includes('semester') && !sheetName.toLowerCase().includes('b.s') && !sheetName.toLowerCase().includes('bs')) return;
    const sheet = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (!data || data.length < 3) return;

    // Find header row (the row that has "Name" or "F/Name" or "pakage")
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(6, data.length); i++) {
      const row = data[i] || [];
      const rowStr = row.map(c => String(c).toLowerCase()).join(' ');
      if (rowStr.includes('name') && (rowStr.includes('f/name') || rowStr.includes('father') || rowStr.includes('subjects') || rowStr.includes('pakage'))) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) return;

    const headers = (data[headerRowIdx] || []).map(h => String(h || '').trim());
    
    // Find column indices
    let nameIdx = -1;
    let fNameIdx = -1;
    let pkgIdx = -1;
    let paidIdx = -1;
    let remIdx = -1;
    let cellIdx = -1;
    let rollIdx = -1;

    headers.forEach((h, col) => {
      const hl = h.toLowerCase();
      if ((hl === 'name' || hl === "student's name" || hl === 'student name') && nameIdx === -1) nameIdx = col;
      if ((hl === 'f/name' || hl === "father's name" || hl === 'father name' || hl === 'f.name') && fNameIdx === -1) fNameIdx = col;
      if (hl.includes('pakage') || hl.includes('package') || hl.includes('total fee')) pkgIdx = col;
      if (hl === 'paid' || hl === 'paid amont' || hl === 'paid amount' || hl.includes('received')) paidIdx = col;
      if (hl === 'remaining' || hl.includes('balance')) remIdx = col;
      if (hl.includes('cell') || hl.includes('mobile') || hl.includes('phone') || hl.includes('contact')) cellIdx = col;
      if (hl.includes('roll')) rollIdx = col;
    });

    if (nameIdx === -1) return;

    // Also look for installment columns: e.g. "1st installment", "2nd installment", etc.
    const installmentCols = [];
    headers.forEach((h, col) => {
      const hl = h.toLowerCase();
      const match = hl.match(/(\d+)(?:st|nd|rd|th)?\s*installment/i);
      if (match) {
        // usually receipt is in col + 1
        installmentCols.push({
          num: parseInt(match[1], 10),
          title: `${match[1]}th Installment`,
          amountCol: col,
          receiptCol: col + 1
        });
      }
    });

    // Parse student rows
    for (let r = headerRowIdx + 1; r < data.length; r++) {
      const row = data[r];
      if (!row || !row[nameIdx]) continue;
      const rawName = String(row[nameIdx]).trim();
      if (!rawName || rawName.toLowerCase() === 'name' || rawName.toLowerCase().includes('total')) continue;
      
      const rawFName = fNameIdx !== -1 && row[fNameIdx] ? String(row[fNameIdx]).trim() : '';
      const rawCell = cellIdx !== -1 && row[cellIdx] ? String(row[cellIdx]).trim() : '';
      const rawRoll = rollIdx !== -1 && row[rollIdx] ? String(row[rollIdx]).trim() : '';
      
      let pkg = pkgIdx !== -1 && row[pkgIdx] ? Number(String(row[pkgIdx]).replace(/[^0-9.]/g, '')) : 0;
      let paid = paidIdx !== -1 && row[paidIdx] ? Number(String(row[paidIdx]).replace(/[^0-9.]/g, '')) : 0;
      let rem = remIdx !== -1 && row[remIdx] ? Number(String(row[remIdx]).replace(/[^0-9.]/g, '')) : 0;

      // Extract installments
      const transactions = [];
      let sumInstallments = 0;
      installmentCols.forEach(inst => {
        const amtVal = row[inst.amountCol];
        if (amtVal) {
          const amt = Number(String(amtVal).replace(/[^0-9.]/g, ''));
          if (amt > 0) {
            sumInstallments += amt;
            const recVal = row[inst.receiptCol] ? String(row[inst.receiptCol]).trim() : '';
            transactions.push({
              installment: inst.title,
              amount: amt,
              receipt: recVal,
              description: `Semester Fee - ${inst.title}`
            });
          }
        }
      });

      if (paid === 0 && sumInstallments > 0) {
        paid = sumInstallments;
      }
      if (pkg === 0 && (paid > 0 || rem > 0)) {
        pkg = paid + rem;
      }
      if (rem === 0 && pkg > paid) {
        rem = pkg - paid;
      }

      if (pkg > 0 || paid > 0 || transactions.length > 0) {
        extractedRecords.push({
          sourceFile: f,
          sourceSheet: sheetName,
          name: rawName,
          fName: rawFName,
          phone: rawCell,
          roll: rawRoll,
          pkg,
          paid,
          rem,
          transactions
        });
      }
    }
  });
});

console.log('Total BS student fee records extracted from excel sheets:', extractedRecords.length);
console.log('Sample extracted record:', JSON.stringify(extractedRecords[0], null, 2));
console.log('Sample extracted record #2:', JSON.stringify(extractedRecords[1], null, 2));

// Save extracted records for inspection
fs.writeFileSync('scratch/extracted_bs_fees.json', JSON.stringify(extractedRecords, null, 2));
