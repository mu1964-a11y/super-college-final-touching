import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import crypto from 'crypto';

// Read .env
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let v = m[2] || '';
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    env[m[1]] = v.trim();
  }
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const csvPath = 'C:/Users/USER/.gemini/antigravity/brain/6ca385aa-c2d2-48b8-add6-e50e2177ea47/scratch/raw_student_fee_list_2026_28.csv';
const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split(/\r?\n/);

let currentSection = 'boys';
const rawRecords = [];

function cleanStr(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseReceiptDate(str) {
  if (!str) return { receipt: '', date: '' };
  const trimmed = str.trim();
  let receipt = '';
  let dateRaw = '';

  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    receipt = parts[0].trim();
    dateRaw = parts.slice(1).join('/').trim();
  } else {
    receipt = trimmed;
  }

  // Convert dateRaw (e.g. "15-4-26" or "10-9-26" or "1-10-2026") to YYYY-MM-DD
  let dateIso = '';
  if (dateRaw) {
    const dm = dateRaw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (dm) {
      let day = dm[1].padStart(2, '0');
      let month = dm[2].padStart(2, '0');
      let yr = dm[3];
      if (yr.length === 2) yr = '20' + yr;
      dateIso = `${yr}-${month}-${day}`;
    }
  }

  return { receipt, date: dateIso || '2026-09-01' };
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  if (line.includes('Sr#,,Student Name,F/Name')) {
    currentSection = 'girls';
    continue;
  }
  if (line.includes('Sr#,ROLL NO')) {
    currentSection = 'boys';
    continue;
  }

  const parts = line.split(',');

  if (currentSection === 'boys') {
    const sr = parts[8]?.trim();
    const rollNo = parts[9]?.trim();
    const name = parts[10]?.trim();
    const fName = parts[11]?.trim();
    const marks = parts[12]?.trim();
    const group = parts[13]?.trim();
    const phone = parts[14]?.trim();
    const address = parts[15]?.trim();
    const school = parts[16]?.trim();
    const reference = parts[17]?.trim();

    const boardFee = Number(parts[22]?.trim()) || 0;
    const boardFeeRec = Number(parts[23]?.trim()) || 0;
    const boardDateRec = parts[24]?.trim();

    const pkg = Number(parts[26]?.trim()) || 0;

    const installments = [];
    const instPairs = [
      [parts[27], parts[28]],
      [parts[29], parts[30]],
      [parts[31], parts[32]],
      [parts[33], parts[34]],
      [parts[35], parts[36]],
      [parts[37], parts[38]],
    ];

    instPairs.forEach(([amtStr, rdStr], idx) => {
      const amt = Number(amtStr?.trim()) || 0;
      if (amt > 0) {
        const { receipt, date } = parseReceiptDate(rdStr);
        installments.push({
          installmentNumber: idx + 1,
          amount: amt,
          receipt,
          date
        });
      }
    });

    const paid = Number(parts[42]?.trim()) || 0;
    const rem = Number(parts[43]?.trim()) || 0;

    if (name && name !== 'Name' && isNaN(Number(name))) {
      rawRecords.push({
        sr,
        rollNo,
        name,
        fName,
        marks,
        group,
        phone,
        address,
        school,
        reference,
        boardFee,
        boardFeeRec,
        boardDateRec,
        pkg,
        installments,
        paid,
        rem,
        gender: 'Male',
        category: 'Inter Part-1 Boys'
      });
    }
  } else {
    let sr = '';
    let name = '';
    let fName = '';
    let marks = '';
    let group = '';
    let phone = '';
    let address = '';
    let school = '';
    let reference = '';
    let boardFee = 0;
    let boardFeeRec = 0;
    let boardDateRec = '';
    let pkg = 0;
    let installments = [];
    let paid = 0;
    let rem = 0;

    if (/^\d+$/.test(parts[1]?.trim())) {
      sr = parts[1]?.trim();
      name = parts[2]?.trim();
      fName = parts[3]?.trim();
      marks = parts[4]?.trim();
      group = parts[5]?.trim();
      phone = parts[6]?.trim();
      address = parts[7]?.trim();
      school = parts[8]?.trim();
      reference = parts[9]?.trim();
      boardFee = Number(parts[14]?.trim()) || 0;
      boardFeeRec = Number(parts[15]?.trim()) || 0;
      boardDateRec = parts[16]?.trim();
      pkg = Number(parts[18]?.trim()) || 0;

      const instPairs = [
        [parts[19], parts[20]],
        [parts[21], parts[22]],
        [parts[23], parts[24]],
        [parts[25], parts[26]],
        [parts[27], parts[28]],
        [parts[29], parts[30]],
      ];
      instPairs.forEach(([amtStr, rdStr], idx) => {
        const amt = Number(amtStr?.trim()) || 0;
        if (amt > 0) {
          const { receipt, date } = parseReceiptDate(rdStr);
          installments.push({
            installmentNumber: idx + 1,
            amount: amt,
            receipt,
            date
          });
        }
      });

      paid = Number(parts[34]?.trim()) || 0;
      rem = Number(parts[35]?.trim()) || 0;
    } else if (/^\d+$/.test(parts[0]?.trim())) {
      sr = parts[0]?.trim();
      name = parts[1]?.trim();
      fName = parts[2]?.trim();
      marks = parts[3]?.trim();
      group = parts[4]?.trim();
      phone = parts[5]?.trim();
      address = parts[6]?.trim();
      school = parts[7]?.trim();
      reference = parts[8]?.trim();
      boardFee = Number(parts[13]?.trim()) || 0;
      boardFeeRec = Number(parts[14]?.trim()) || 0;
      boardDateRec = parts[15]?.trim();
      pkg = Number(parts[17]?.trim()) || 0;

      const instPairs = [
        [parts[18], parts[19]],
        [parts[20], parts[21]],
        [parts[22], parts[23]],
        [parts[24], parts[25]],
        [parts[26], parts[27]],
        [parts[28], parts[29]],
      ];
      instPairs.forEach(([amtStr, rdStr], idx) => {
        const amt = Number(amtStr?.trim()) || 0;
        if (amt > 0) {
          const { receipt, date } = parseReceiptDate(rdStr);
          installments.push({
            installmentNumber: idx + 1,
            amount: amt,
            receipt,
            date
          });
        }
      });

      paid = Number(parts[33]?.trim()) || 0;
      rem = Number(parts[34]?.trim()) || 0;
    }

    if (name && name !== 'Student Name' && isNaN(Number(name)) && fName) {
      rawRecords.push({
        sr,
        rollNo: '',
        name,
        fName,
        marks,
        group,
        phone,
        address,
        school,
        reference,
        boardFee,
        boardFeeRec,
        boardDateRec,
        pkg,
        installments,
        paid,
        rem,
        gender: 'Female',
        category: 'Inter Part-1 Girls'
      });
    }
  }
}

async function execute() {
  console.log(`Starting Database Sync for 317 Students...`);

  const { data: dbStudents, error: errStudents } = await supabase
    .from('students')
    .select('*');

  if (errStudents) {
    console.error('Error fetching students:', errStudents);
    return;
  }

  console.log(`Existing Students in DB: ${dbStudents.length}`);

  let maxIdNum = 700;
  for (const s of dbStudents) {
    const m = (s.id || '').match(/(\d+)$/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num) && num > maxIdNum && num < 9000) {
        maxIdNum = num;
      }
    }
  }
  console.log(`Current highest student ID number: ${maxIdNum}`);

  const matched = [];
  const toInsertStudents = [];
  const toInsertAdmissions = [];
  const toUpdateStudents = [];

  let nextIdCounter = maxIdNum + 1;

  for (const rec of rawRecords) {
    const cleanName = cleanStr(rec.name);
    const cleanFName = cleanStr(rec.fName);

    const existing = dbStudents.find(s => {
      const sName = cleanStr(s.full_name);
      const sFName = cleanStr(s.father_name);
      if (sName === cleanName && sFName === cleanFName) return true;
      if (sName.length > 3 && cleanName.length > 3 && (sName.includes(cleanName) || cleanName.includes(sName))) {
        if (sFName === cleanFName || (sFName.length > 3 && (sFName.includes(cleanFName) || cleanFName.includes(sFName)))) {
          return true;
        }
      }
      return false;
    });

    const transactions = [];
    const instList = [];

    if (rec.boardFeeRec > 0) {
      const { receipt, date } = parseReceiptDate(rec.boardDateRec);
      transactions.push({
        id: `TX-BRD-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        date: date,
        amount: rec.boardFeeRec,
        paymentMethod: 'Cash',
        receiptId: receipt || 'REC-BRD',
        description: 'Board Exam / Registration Fee'
      });
    }

    rec.installments.forEach(inst => {
      instList.push({
        id: `INST-${inst.installmentNumber}`,
        amount: inst.amount,
        dueDate: inst.date,
        status: 'Paid',
        paidDate: inst.date,
        amountPaid: inst.amount
      });
      transactions.push({
        id: `TX-${inst.installmentNumber}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        date: inst.date,
        amount: inst.amount,
        paymentMethod: 'Cash',
        receiptId: inst.receipt || `REC-${inst.installmentNumber}`,
        description: `Installment ${inst.installmentNumber}`
      });
    });

    const feeLedger = {
      totalPackage: rec.pkg,
      totalReceived: rec.paid,
      remainingBalance: Math.max(0, rec.pkg - rec.paid),
      installments: instList,
      transactions: transactions
    };

    if (existing) {
      matched.push({ csv: rec, db: existing });

      const existingLedger = existing.fee_ledger || {};
      const mergedTx = [...(existingLedger.transactions || []), ...transactions];
      const mergedInst = instList.length > 0 ? instList : (existingLedger.installments || []);

      toUpdateStudents.push({
        id: existing.id,
        college_no: rec.rollNo || existing.college_no,
        total_package: rec.pkg > 0 ? rec.pkg : existing.total_package,
        fee_received: Math.max(rec.paid, Number(existing.fee_received || 0)),
        session: '2026-28',
        group: rec.group || existing.group,
        group_name: rec.group || existing.group_name,
        fee_ledger: {
          totalPackage: rec.pkg > 0 ? rec.pkg : (existingLedger.totalPackage || existing.total_package || 0),
          totalReceived: Math.max(rec.paid, Number(existing.fee_received || 0)),
          remainingBalance: Math.max(0, (rec.pkg > 0 ? rec.pkg : (existing.total_package || 0)) - Math.max(rec.paid, Number(existing.fee_received || 0))),
          installments: mergedInst,
          transactions: mergedTx
        }
      });
    } else {
      const studentId = `SGC-26-${String(nextIdCounter).padStart(3, '0')}`;
      const admUuid = crypto.randomUUID();
      nextIdCounter++;

      const phoneParts = (rec.phone || '').split('/');
      const contact = phoneParts[0]?.trim() || '';
      const secContact = phoneParts[1]?.trim() || '';

      const numericMarks = parseInt(rec.marks, 10);
      const validMarks = !isNaN(numericMarks) ? numericMarks : 0;

      const newStudent = {
        id: studentId,
        admission_id: admUuid,
        full_name: rec.name,
        father_name: rec.fName,
        college_no: rec.rollNo || null,
        category: rec.category,
        group: rec.group,
        group_name: rec.group,
        section: 'A',
        contact: contact,
        father_contact: contact,
        secondary_contact: secContact,
        address: rec.address || 'Jahanian',
        gender: rec.gender,
        total_package: rec.pkg,
        fee_received: rec.paid,
        fee_ledger: feeLedger,
        fee_history: transactions,
        previous_marks: validMarks,
        session: '2026-28',
        academic_part: 'Part-1',
        program_type: 'Yearly',
        created_at: new Date().toISOString()
      };

      const newAdmission = {
        id: admUuid,
        student_id: studentId,
        full_name: rec.name,
        father_name: rec.fName,
        category: rec.category,
        group: rec.group,
        contact_number: contact,
        secondary_contact: secContact,
        address: rec.address || 'Jahanian',
        status: rec.paid >= rec.pkg && rec.pkg > 0 ? 'Full Paid' : rec.paid > 0 ? 'Partial Paid' : 'Admitted/Confirmed',
        is_admitted: true,
        session: '2026-28',
        total_package: rec.pkg,
        fee_received: rec.paid,
        created_at: new Date().toISOString()
      };

      toInsertStudents.push(newStudent);
      toInsertAdmissions.push(newAdmission);
    }
  }

  console.log(`\nOperations Breakdown:`);
  console.log(`- Matched & Updating Fees: ${toUpdateStudents.length}`);
  console.log(`- New Students to Insert: ${toInsertStudents.length}`);
  console.log(`- New Admissions to Insert: ${toInsertAdmissions.length}`);

  // 1. Insert Admissions first (due to foreign key / logical reference) in chunks of 50
  const chunkSize = 50;
  for (let i = 0; i < toInsertAdmissions.length; i += chunkSize) {
    const chunk = toInsertAdmissions.slice(i, i + chunkSize);
    const { error: insAdmErr } = await supabase.from('admissions').insert(chunk);
    if (insAdmErr) {
      console.error(`Error inserting admissions chunk ${i}:`, insAdmErr);
    } else {
      console.log(`✓ Inserted admissions chunk ${i + 1} to ${i + chunk.length}`);
    }
  }

  // 2. Insert Students in chunks of 50
  for (let i = 0; i < toInsertStudents.length; i += chunkSize) {
    const chunk = toInsertStudents.slice(i, i + chunkSize);
    const { error: insErr } = await supabase.from('students').insert(chunk);
    if (insErr) {
      console.error(`Error inserting students chunk ${i}:`, insErr);
    } else {
      console.log(`✓ Inserted students chunk ${i + 1} to ${i + chunk.length}`);
    }
  }

  // 3. Update Existing Students
  let updateSuccess = 0;
  for (const upd of toUpdateStudents) {
    const { error: updErr } = await supabase
      .from('students')
      .update({
        college_no: upd.college_no,
        total_package: upd.total_package,
        fee_received: upd.fee_received,
        session: upd.session,
        group: upd.group,
        group_name: upd.group_name,
        fee_ledger: upd.fee_ledger
      })
      .eq('id', upd.id);

    if (!updErr) {
      updateSuccess++;
    } else {
      console.error(`Error updating student ${upd.id}:`, updErr.message);
    }
  }
  console.log(`✓ Successfully updated ${updateSuccess} of ${toUpdateStudents.length} existing students.`);

  // Write final report
  const summaryReport = {
    totalParsed: rawRecords.length,
    boysTotal: rawRecords.filter(r => r.gender === 'Male').length,
    girlsTotal: rawRecords.filter(r => r.gender === 'Female').length,
    alreadyExistingUpdated: updateSuccess,
    newStudentsAdded: toInsertStudents.length,
    newStudentsList: toInsertStudents.map(s => ({
      id: s.id,
      name: s.full_name,
      fatherName: s.father_name,
      gender: s.gender,
      group: s.group,
      rollNo: s.college_no,
      totalPackage: s.total_package,
      feeReceived: s.fee_received,
      remaining: s.total_package - s.fee_received
    })),
    matchedUpdatedList: matched.map(m => ({
      dbId: m.db.id,
      name: m.db.full_name,
      fatherName: m.db.father_name,
      csvPackage: m.csv.pkg,
      csvPaid: m.csv.paid
    }))
  };

  fs.writeFileSync('C:/Users/USER/.gemini/antigravity/brain/6ca385aa-c2d2-48b8-add6-e50e2177ea47/scratch/import_summary_report.json', JSON.stringify(summaryReport, null, 2));
  console.log('★ All operations completed! Saved import_summary_report.json');
}

execute();
