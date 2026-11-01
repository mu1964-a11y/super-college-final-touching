const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function parseDateStr(raw) {
  if (!raw) return new Date().toISOString().split('T')[0];
  const str = String(raw).trim();
  let datePart = str;
  if (str.includes('/')) {
    const parts = str.split('/');
    datePart = parts[parts.length - 1];
  }
  const dm = datePart.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (dm) {
    const day = String(dm[1]).padStart(2, '0');
    const month = String(dm[2]).padStart(2, '0');
    let yr = parseInt(dm[3], 10);
    if (yr < 100) yr += 2000;
    return `${yr}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

function parseReceiptId(raw) {
  if (!raw) return 'REC-' + Math.floor(10000 + Math.random() * 90000);
  const str = String(raw).trim();
  if (str.includes('/')) {
    return str.split('/')[0].trim();
  }
  return str;
}

const bsConfigs = [
  {
    file: 'Bs & 5th Semester 2023-2027.xlsx',
    sheets: [
      { name: 'Semester B.S 6 Girls 2023-27 ', sem: 6, semFee: 18000, campus: 'Girls' },
      { name: 'Semester B.S 6 Boys 2023-2 (2', sem: 6, semFee: 18000, campus: 'Boys' },
      { name: 'Semester S 8th Girls 2023-25', sem: 8, semFee: 18000, campus: 'Girls' }
    ]
  },
  {
    file: 'Bscs 2024-2028.xlsx',
    sheets: [
      { name: 'Semester B.S 4 Girls 2024-2028', sem: 4, semFee: 18000, campus: 'Girls' },
      { name: 'Semester B.S 4 Boys 2024-28', sem: 4, semFee: 18000, campus: 'Boys' },
      { name: 'Semester 8th Girls 2024-26', sem: 8, semFee: 18000, campus: 'Girls' }
    ]
  },
  {
    file: 'Bscs 2025-2029.xlsx',
    sheets: [
      { name: 'Semester B.S  Girl 2025-29', sem: 2, semFee: 18000, campus: 'Girls' },
      { name: 'Semester B.S 1st Boys 2025-2029', sem: 2, semFee: 18000, campus: 'Boys' },
      { name: 'Semester B.S 5th Girl 2025-2027', sem: 5, semFee: 18000, campus: 'Girls' }
    ]
  },
  {
    file: 'B.S 2026-2030.xlsx',
    sheets: [
      { name: 'Semester B.S Girl 2026-2030', sem: 1, semFee: 18000, campus: 'Girls' },
      { name: 'Semester B.S 1st Boys 202-2030', sem: 1, semFee: 18000, campus: 'Boys' }
    ]
  }
];

function extractAllBsStudents() {
  const allParsed = [];

  for (const item of bsConfigs) {
    const filePath = path.join('f:/SCJ WEB/college_excels', item.file);
    if (!fs.existsSync(filePath)) continue;

    for (const sheetCfg of item.sheets) {
      try {
        const wb = xlsx.readFile(filePath, { sheets: [sheetCfg.name] });
        const ws = wb.Sheets[sheetCfg.name];
        if (!ws) continue;

        let curStudent = null;
        for (let r = 4; r <= 200; r++) {
          const nameCell = ws['C' + r];
          const fatherCell = ws['D' + r];
          const rollCell = ws['B' + r] || ws['A' + r];
          const hasName = nameCell && String(nameCell.v).trim().length > 2 &&
            !String(nameCell.v).toLowerCase().includes('name') &&
            !String(nameCell.v).toLowerCase().includes('total') &&
            !String(nameCell.v).toLowerCase().includes('admission') &&
            !String(nameCell.v).toLowerCase().includes('fee');

          if (hasName) {
            if (curStudent) allParsed.push(curStudent);
            curStudent = {
              file: item.file,
              sheet: sheetCfg.name,
              semester: sheetCfg.sem,
              semFee: sheetCfg.semFee,
              campus: sheetCfg.campus,
              name: String(nameCell.v).trim(),
              fatherName: fatherCell ? String(fatherCell.v).trim() : '',
              roll: rollCell ? String(rollCell.v).trim() : '',
              packageFromCol: 0,
              transactions: []
            };
          }

          if (curStudent) {
            const pkgCell = ws['AK' + r];
            if (pkgCell && typeof pkgCell.v === 'number' && pkgCell.v > 0) {
              curStudent.packageFromCol += pkgCell.v;
            }

            const instCols = ['AL', 'AN', 'AP', 'AR', 'AT', 'AV', 'AX', 'AZ'];
            for (const col of instCols) {
              const amtCell = ws[col + r];
              if (amtCell && typeof amtCell.v === 'number' && amtCell.v > 0 && amtCell.v < 200000) {
                const colIdx = xlsx.utils.decode_col(col);
                const nextCol = xlsx.utils.encode_col(colIdx + 1);
                const recCell = ws[nextCol + r];
                const recVal = recCell ? String(recCell.v).trim() : '';

                curStudent.transactions.push({
                  amount: amtCell.v,
                  receiptRaw: recVal,
                  date: parseDateStr(recVal),
                  receiptId: parseReceiptId(recVal),
                  cell: col + r
                });
              }
            }
          }
        }
        if (curStudent) allParsed.push(curStudent);
      } catch (err) {
        console.error('Error in', item.file, sheetCfg.name, err.message);
      }
    }
  }

  return allParsed;
}

async function run() {
  const { createClient } = await import('@supabase/supabase-js');
  const env = fs.readFileSync('.env', 'utf8');
  const url = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)[1].trim();
  const key = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)[1].trim();
  const supabase = createClient(url, key);

  console.log('--- 1. EXTRACTING BS RECORDS FROM OFFICIAL EXCEL SHEETS ---');
  const excelBsList = extractAllBsStudents();
  console.log(`Extracted ${excelBsList.length} student records from BS Excel sheets.`);

  console.log('--- 2. FETCHING ALL STUDENTS FROM SUPABASE ---');
  const { data: dbStudents, error: fetchErr } = await supabase
    .from('students')
    .select('*');

  if (fetchErr) {
    console.error('Supabase fetch error:', fetchErr);
    return;
  }
  console.log(`Fetched ${dbStudents.length} total students from Supabase.`);

  const bsStudents = dbStudents.filter(s =>
    (s.category && s.category.toUpperCase().includes('BS')) ||
    (s.section && s.section.toUpperCase().includes('BS')) ||
    (s.group && s.group.toUpperCase().includes('BS'))
  );
  console.log(`Found ${bsStudents.length} BS students in Supabase.`);

  const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const bsUpdates = [];
  for (const s of bsStudents) {
    const sName = clean(s.full_name);
    const sFather = clean(s.father_name);
    const sRoll = clean(s.college_no);

    const match = excelBsList.find(e => {
      const eName = clean(e.name);
      const eFather = clean(e.fatherName);
      const eRoll = clean(e.roll);

      if (sRoll && eRoll && (sRoll === eRoll || sRoll.endsWith(eRoll) || eRoll.endsWith(sRoll))) {
        if (sName.includes(eName) || eName.includes(sName)) return true;
      }
      if (sName && eName && sName === eName) return true;
      if (sName && eName && (sName.includes(eName) || eName.includes(sName))) {
        if (sFather && eFather && (sFather.includes(eFather) || eFather.includes(sFather))) return true;
      }
      return false;
    });

    let curSem = 6;
    const secStr = (s.section || s.category || '').toUpperCase();
    if (secStr.includes('8TH')) curSem = 8;
    else if (secStr.includes('6TH')) curSem = 6;
    else if (secStr.includes('4TH')) curSem = 4;
    else if (secStr.includes('2ND')) curSem = 2;
    else if (secStr.includes('1ST')) curSem = 1;

    const semFee = match ? match.semFee : 18000;
    const standardSemPackage = curSem * semFee;

    let totalPkg = standardSemPackage;
    let feeRec = 0;
    let txs = [];

    if (match && match.transactions.length > 0) {
      feeRec = match.transactions.reduce((acc, t) => acc + t.amount, 0);
      if (match.packageFromCol > 0) {
        totalPkg = Math.max(match.packageFromCol, standardSemPackage);
      }
      txs = match.transactions.map((t, idx) => ({
        id: `tx-bs-${s.id}-${idx + 1}`,
        date: t.date,
        amount: t.amount,
        receiptId: t.receiptId,
        description: `Semester Installment #${idx + 1} (${t.receiptRaw})`,
        paymentMethod: 'Cash',
        recordedBy: 'Accounts Counter'
      }));
    } else {
      feeRec = Number(s.fee_received || 0);
      totalPkg = Math.max(Number(s.total_package || 0), standardSemPackage);
      if (feeRec > 0) {
        txs = [{
          id: `tx-bs-${s.id}-init`,
          date: new Date().toISOString().split('T')[0],
          amount: feeRec,
          receiptId: `REC-${s.id}`,
          description: 'Previous Semesters Clearance',
          paymentMethod: 'Cash',
          recordedBy: 'Accounts Counter'
        }];
      }
    }

    const remainingBal = Math.max(0, totalPkg - feeRec);

    const updatedLedger = {
      totalPackage: totalPkg,
      totalReceived: feeRec,
      remainingBalance: remainingBal,
      currentSemester: curSem,
      semesterFee: semFee,
      completedSemesters: curSem,
      installments: [],
      transactions: txs
    };

    bsUpdates.push({
      id: s.id,
      total_package: totalPkg,
      fee_received: feeRec,
      current_semester: curSem,
      fee_ledger: updatedLedger
    });
  }

  console.log(`Writing ${bsUpdates.length} BS student updates in parallel chunks...`);
  const CHUNK_SIZE = 25;
  for (let i = 0; i < bsUpdates.length; i += CHUNK_SIZE) {
    const chunk = bsUpdates.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(u => 
      supabase.from('students').update({
        total_package: u.total_package,
        fee_received: u.fee_received,
        current_semester: u.current_semester,
        fee_ledger: u.fee_ledger
      }).eq('id', u.id)
    ));
    console.log(`  BS Updated: ${Math.min(i + CHUNK_SIZE, bsUpdates.length)} / ${bsUpdates.length}`);
  }
  console.log('✓ All BS students updated successfully!');

  // PART 3: Inter Part-2 Students
  console.log('--- 3. UPDATING INTER PART-2 STUDENTS ---');
  const p2Students = dbStudents.filter(s =>
    (s.session && s.session.includes('2025-27')) ||
    (s.section && (s.section.includes('-G2') || s.section.includes('-B2'))) ||
    (s.category && s.category.includes('Part-2'))
  );
  console.log(`Found ${p2Students.length} Inter Part-2 students.`);

  const p2Updates = p2Students.map(s => ({
    id: s.id,
    academic_part: 'Part-2',
    fee_ledger: {
      ...(s.fee_ledger || {}),
      academicPart: 'Part-2',
      part1Status: 'Part-1 (2024-25) Dues Cleared & Promoted',
      part2Status: 'Part-2 (2025-27) Current Active Session'
    }
  }));

  for (let i = 0; i < p2Updates.length; i += CHUNK_SIZE) {
    const chunk = p2Updates.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(u =>
      supabase.from('students').update({
        academic_part: u.academic_part,
        fee_ledger: u.fee_ledger
      }).eq('id', u.id)
    ));
    console.log(`  Part-2 Updated: ${Math.min(i + CHUNK_SIZE, p2Updates.length)} / ${p2Updates.length}`);
  }
  console.log('✓ All Inter Part-2 students updated successfully!');

  // Check Sadaf record specifically
  const { data: sadafVerify } = await supabase
    .from('students')
    .select('id, full_name, college_no, section, total_package, fee_received, fee_ledger')
    .eq('id', 'BSP-26-505');
  console.log('\n--- VERIFIED SADAF IDREES IN SUPABASE ---');
  console.log(JSON.stringify(sadafVerify, null, 2));
}

run();
