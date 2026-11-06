import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import crypto from 'crypto';

// 1. Read .env credentials
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeSession(sess) {
  if (!sess) return '2026-28';
  const str = String(sess).trim();
  if (str === '2025-2027') return '2025-27';
  if (str === '2026-2028') return '2026-28';
  if (str === '2023-2027') return '2023-27';
  if (str === '2024-2028') return '2024-28';
  if (str === '2025-2029') return '2025-29';
  if (str === '2026-2030') return '2026-30';
  if (str === '2024-2026') return '2024-26';
  return str;
}

function parseReceiptAndDate(str, fallbackDate = '2026-09-01') {
  if (!str) return { receipt: '', date: fallbackDate };
  const trimmed = String(str).trim();
  
  // Format: "RECEIPT/DD-MM-YY" or "RECEIPT/DD-MM-YYYY" or with dots/slashes
  const m = trimmed.match(/^([A-Za-z0-9_-]+)\s*[/]\s*(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/);
  if (m) {
    const receipt = m[1].trim();
    let day = m[2].padStart(2, '0');
    let month = m[3].padStart(2, '0');
    let yr = m[4];
    if (yr.length === 2) yr = '20' + yr;
    return { receipt, date: `${yr}-${month}-${day}` };
  }
  // Date only pattern: DD-MM-YYYY
  const m2 = trimmed.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/);
  if (m2) {
    let day = m2[1].padStart(2, '0');
    let month = m2[2].padStart(2, '0');
    let yr = m2[3];
    if (yr.length === 2) yr = '20' + yr;
    return { receipt: '', date: `${yr}-${month}-${day}` };
  }
  return { receipt: trimmed, date: fallbackDate };
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function fetchAllRows(tableName) {
  let allRows = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      break;
    }
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  return allRows;
}

async function runSync() {
  console.log('=== STARTING SUPABASE 2023-2030 DATA SYNCHRONIZATION ===\n');

  // Load CSV and XLSX Master
  console.log('1. Reading CSV and XLSX Master files...');
  const wbCsv = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
  const csvRows = XLSX.utils.sheet_to_json(wbCsv.Sheets['Sheet1']);

  const wbXlsx = XLSX.readFile('College_2023_2030_Lightweight.xlsx');
  const sectionsMaster = XLSX.utils.sheet_to_json(wbXlsx.Sheets['1_Sections_Master']);

  console.log(`- Loaded ${csvRows.length} total rows from CSV.`);
  console.log(`- Loaded ${sectionsMaster.length} sections from Sections Master.`);

  const verifiedRows = csvRows.filter(r => r.Record_Type === 'VERIFIED_ROSTER');
  console.log(`- Filtered ${verifiedRows.length} VERIFIED_ROSTER students.`);

  // -------------------------------------------------------------
  // STEP 1: DELETE PRE-2023 HISTORICAL RECORDS & DUPLICATES
  // -------------------------------------------------------------
  console.log('\n2. Step 1: Deleting pre-2023 historical records and duplicates from Supabase...');
  
  // A) Delete known duplicate student SGC-26-1158 (AIMAN SHAHID with null college_no)
  const { error: delDupErr } = await supabase.from('students').delete().eq('id', 'SGC-26-1158');
  if (delDupErr) console.warn('Warning deleting SGC-26-1158:', delDupErr.message);
  else console.log('✓ Removed erroneous duplicate student SGC-26-1158 (ICS1-G2(PMC)).');

  // B) Check for any pre-2023 sessions in students
  const pre2023Sessions = ['2018-20', '2019-21', '2020-22', '2021-23', '2022-24', '2023-25', '2018-2020', '2019-2021', '2020-2022', '2021-2023', '2022-2024'];
  for (const sess of pre2023Sessions) {
    const { error: delStuErr } = await supabase.from('students').delete().eq('session', sess);
    if (!delStuErr) {
      await supabase.from('admissions').delete().eq('session', sess);
    }
  }

  // C) Check for old Inter 2024-26 (keeping BS 2024-26 intact)
  const { data: inter2426Students } = await supabase
    .from('students')
    .select('id, category, group')
    .eq('session', '2024-26');

  if (inter2426Students && inter2426Students.length > 0) {
    const oldInterIds = inter2426Students
      .filter(s => {
        const cat = (s.category || '').toLowerCase();
        const grp = (s.group || '').toLowerCase();
        return !cat.includes('bs') && !grp.includes('bs');
      })
      .map(s => s.id);

    if (oldInterIds.length > 0) {
      await supabase.from('students').delete().in('id', oldInterIds);
      console.log(`✓ Deleted ${oldInterIds.length} old Inter 2024-26 student records.`);
    }
  }

  // Also check admissions for old Inter 2024-26
  const { data: inter2426Admissions } = await supabase
    .from('admissions')
    .select('id, category, group')
    .eq('session', '2024-26');

  if (inter2426Admissions && inter2426Admissions.length > 0) {
    const oldInterAdmIds = inter2426Admissions
      .filter(a => {
        const cat = (a.category || '').toLowerCase();
        const grp = (a.group || '').toLowerCase();
        return !cat.includes('bs') && !grp.includes('bs');
      })
      .map(a => a.id);

    if (oldInterAdmIds.length > 0) {
      await supabase.from('admissions').delete().in('id', oldInterAdmIds);
      console.log(`✓ Deleted ${oldInterAdmIds.length} old Inter 2024-26 admission records.`);
    }
  }

  // -------------------------------------------------------------
  // STEP 2: UPDATE SETTINGS CONFIG WITH ALL 55 SECTIONS
  // -------------------------------------------------------------
  console.log('\n3. Step 2: Updating settings.config.predefinedSections with 55 Sections Master...');
  const predefinedSectionsList = sectionsMaster.map(sm => {
    let genderMapped = 'Co-ed';
    if (sm.Gender === 'Girls') genderMapped = 'Female';
    else if (sm.Gender === 'Boys') genderMapped = 'Male';

    const cleanSession = normalizeSession(sm.Session);
    const isAspire = sm.Campus && sm.Campus.includes('Aspire');

    return {
      id: sm.Section_ID,
      sectionId: sm.Section_ID,
      name: sm.Exact_Section_Name,
      exactSectionName: sm.Exact_Section_Name,
      campus: sm.Campus,
      program: sm.Program,
      class: cleanSession,
      session: cleanSession,
      gender: genderMapped,
      exactStudentCount: sm.Exact_Student_Count,
      boysCount: sm.Boys_Count,
      girlsCount: sm.Girls_Count,
      p1Package: sm.P1_1stYear_Package,
      p1Paid: sm.P1_1stYear_Paid,
      p1Remaining: sm.P1_1stYear_Remaining,
      p2Package: sm.P2_2ndYear_Package,
      p2Paid: sm.P2_2ndYear_Paid,
      p2Remaining: sm.P2_2ndYear_Remaining,
      totalPackage: sm.Combined_Total_Package,
      tuitionPaid: sm.Combined_Tuition_Paid,
      remainingBalance: sm.Combined_Remaining_Balance,
      otherFeesPaid: sm.Other_Fees_Paid,
      isAspire: Boolean(isAspire)
    };
  });

  const { data: currentSettings } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  if (currentSettings) {
    const updatedConfig = {
      ...(currentSettings.config || {}),
      predefinedSections: predefinedSectionsList
    };

    const { error: setErr } = await supabase
      .from('settings')
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentSettings.id);

    if (setErr) {
      console.error('Error updating settings config:', setErr);
    } else {
      console.log(`✓ Updated settings with all ${predefinedSectionsList.length} verified sections!`);
    }
  }

  // -------------------------------------------------------------
  // STEP 3: MATCH & UPSERT ALL 870 VERIFIED STUDENTS IN SUPABASE
  // -------------------------------------------------------------
  console.log('\n4. Step 3: Fetching existing students & admissions from DB for matching...');
  const dbStudents = await fetchAllRows('students');
  const dbAdmissions = await fetchAllRows('admissions');
  console.log(`- Retrieved ${dbStudents.length} students and ${dbAdmissions.length} admissions from DB.`);

  const usedDbStudentIds = new Set();
  const toUpdateStudents = [];
  const toInsertStudents = [];
  const toInsertAdmissions = [];

  let nextIdCounter = 1900;

  for (let idx = 0; idx < verifiedRows.length; idx++) {
    const r = verifiedRows[idx];

    // Parse installments ledger JSON
    let rawInstallments = [];
    try {
      if (r.Installments_Ledger_JSON) {
        rawInstallments = JSON.parse(r.Installments_Ledger_JSON);
      }
    } catch (e) {}

    const totalPkg = Number(r.Combined_Total_Package || 0);
    const totalPaid = Number(r.Combined_Tuition_Paid || 0);
    const totalRem = Number(r.Combined_Remaining_Balance || 0);

    let runningBal = totalPkg;

    // Generate date-wise, receipt-wise transaction history with running balance
    const transactions = [];
    const installments = [];

    rawInstallments.forEach((item, iIdx) => {
      const { receipt, date } = parseReceiptAndDate(item.receipt_date);
      const amt = Number(item.amount || 0);
      runningBal = Math.max(0, runningBal - amt);

      const txObj = {
        id: `tx-inst-${r.Record_ID}-${item.installment_no}-${iIdx}`,
        date,
        amount: amt,
        receiptId: receipt || `REC-${r.Roll_No || r.Record_ID}`,
        description: `Tuition Installment #${item.installment_no} (${item.phase})`,
        phase: item.phase,
        installmentNo: item.installment_no,
        paymentMethod: 'Cash',
        recordedBy: 'Accounts Office',
        runningBalance: runningBal
      };
      transactions.push(txObj);

      installments.push({
        id: `inst-${r.Record_ID}-${item.installment_no}-${iIdx}`,
        installmentNumber: item.installment_no,
        phase: item.phase,
        amount: amt,
        dueDate: date,
        status: 'Paid',
        paidDate: date,
        receiptId: receipt,
        amountPaid: amt
      });
    });

    // Parse Other Fees Paid & Receipts
    if (r.Other_Fees_Paid && Number(r.Other_Fees_Paid) > 0) {
      const rawDates = String(r.Other_Fees_Receipts_Dates || '').split('|').map(s => s.trim()).filter(Boolean);
      const uniqueReceiptDates = Array.from(new Set(rawDates));
      const chunkAmt = Math.round(Number(r.Other_Fees_Paid) / Math.max(1, uniqueReceiptDates.length));

      uniqueReceiptDates.forEach((ud, uIdx) => {
        const { receipt, date } = parseReceiptAndDate(ud);
        transactions.push({
          id: `tx-oth-${r.Record_ID}-${uIdx}`,
          date,
          amount: chunkAmt,
          receiptId: receipt || `REC-OTH-${r.Record_ID}`,
          description: 'Registration / Board / Misc Ancillary Fee',
          paymentMethod: 'Cash',
          recordedBy: 'Accounts Office',
          isOtherFee: true
        });
      });
    }

    // Sort transactions chronologically
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const isLeft = String(r.Roster_Status).includes('Left');

    // Build exact fee_ledger
    const feeLedger = {
      status: isLeft ? 'Left' : 'Active',
      sectionId: r.Section_ID,
      exactSectionName: r.Exact_Section_Name,
      campus: r.Campus,
      p1_1stYear_Package: Number(r.P1_1stYear_Package || 0),
      p1_1stYear_Paid: Number(r.P1_1stYear_Paid || 0),
      p1_1stYear_Remaining: Number(r.P1_1stYear_Remaining || 0),
      p2_2ndYear_Package: Number(r.P2_2ndYear_Package || 0),
      p2_2ndYear_Paid: Number(r.P2_2ndYear_Paid || 0),
      p2_2ndYear_Remaining: Number(r.P2_2ndYear_Remaining || 0),
      combined_Total_Package: totalPkg,
      combined_Tuition_Paid: totalPaid,
      combined_Remaining_Balance: totalRem,
      otherFeesPaid: Number(r.Other_Fees_Paid || 0),
      otherFeesReceiptsDates: r.Other_Fees_Receipts_Dates || '',
      totalPackage: totalPkg,
      totalReceived: totalPaid,
      remainingBalance: totalRem,
      installments,
      transactions
    };

    const phoneParts = String(r.Mobile_No || '').split('/');
    const contact = phoneParts[0]?.trim() || '';
    const secondaryContact = phoneParts[1]?.trim() || '';

    const sessionNormalized = normalizeSession(r.Session);
    const academicPart = r.Program === 'Inter Part 2' ? 'Part-2' : 'Part-1';
    const programType = r.Program === 'BS' ? 'Semester' : 'Yearly';

    // Try matching to existing student in DB
    const rName = norm(r.Student_Name);
    const rFather = norm(r.Father_Name);
    const rRoll = norm(r.Roll_No);

    let matchedDbStudent = null;

    // Match 1: College No + Name
    if (rRoll) {
      matchedDbStudent = dbStudents.find(s => !usedDbStudentIds.has(s.id) && norm(s.college_no) === rRoll && norm(s.full_name) === rName);
    }
    // Match 2: Full Name + Father Name
    if (!matchedDbStudent) {
      matchedDbStudent = dbStudents.find(s => !usedDbStudentIds.has(s.id) && norm(s.full_name) === rName && (!rFather || norm(s.father_name) === rFather));
    }
    // Match 3: Full Name only if exact unique
    if (!matchedDbStudent) {
      const candidates = dbStudents.filter(s => !usedDbStudentIds.has(s.id) && norm(s.full_name) === rName);
      if (candidates.length === 1) {
        matchedDbStudent = candidates[0];
      }
    }

    if (matchedDbStudent) {
      usedDbStudentIds.add(matchedDbStudent.id);
      toUpdateStudents.push({
        id: matchedDbStudent.id,
        admission_id: matchedDbStudent.admission_id,
        college_no: r.Roll_No ? String(r.Roll_No) : (matchedDbStudent.college_no || null),
        full_name: r.Student_Name,
        father_name: r.Father_Name || matchedDbStudent.father_name,
        section: r.Exact_Section_Name,
        group: r.Group_Subject || matchedDbStudent.group || r.Exact_Section_Name,
        group_name: r.Group_Subject || matchedDbStudent.group_name || r.Exact_Section_Name,
        category: r.Program,
        gender: r.Gender === 'Girls' ? 'Female' : 'Male',
        session: sessionNormalized,
        total_package: totalPkg,
        fee_received: totalPaid,
        total_fee_finalized: totalPkg,
        contact: contact || matchedDbStudent.contact || '',
        father_contact: contact || matchedDbStudent.father_contact || '',
        secondary_contact: secondaryContact || matchedDbStudent.secondary_contact || '',
        address: r.Address || matchedDbStudent.address || 'Jahanian',
        academic_part: academicPart,
        program_type: programType,
        fee_ledger: feeLedger,
        fee_history: transactions
      });
    } else {
      // New Student to insert (e.g. M FARHAN or 35 LEFT students)
      const newStudentId = isLeft 
        ? `SGC-LEFT-${String(nextIdCounter++).padStart(4, '0')}`
        : `SGC-26-${String(nextIdCounter++).padStart(4, '0')}`;

      // Check if admission already exists in dbAdmissions by student name + father name
      const existingAdm = dbAdmissions.find(a => norm(a.full_name) === rName && (!rFather || norm(a.father_name) === rFather));
      const newAdmId = existingAdm ? existingAdm.id : crypto.randomUUID();

      const newStudent = {
        id: newStudentId,
        admission_id: newAdmId,
        college_no: r.Roll_No ? String(r.Roll_No) : null,
        full_name: r.Student_Name,
        father_name: r.Father_Name || 'Father',
        section: r.Exact_Section_Name,
        group: r.Group_Subject || r.Exact_Section_Name,
        group_name: r.Group_Subject || r.Exact_Section_Name,
        category: r.Program,
        gender: r.Gender === 'Girls' ? 'Female' : 'Male',
        session: sessionNormalized,
        total_package: totalPkg,
        fee_received: totalPaid,
        total_fee_finalized: totalPkg,
        contact: contact,
        father_contact: contact,
        secondary_contact: secondaryContact,
        address: r.Address || 'Jahanian',
        academic_part: academicPart,
        program_type: programType,
        attendance: { present: 0, absent: 0 },
        fee_ledger: feeLedger,
        fee_history: transactions,
        created_at: new Date().toISOString()
      };

      toInsertStudents.push(newStudent);

      if (!existingAdm) {
        const newAdm = {
          id: newAdmId,
          student_id: newStudentId,
          college_no: r.Roll_No ? String(r.Roll_No) : null,
          full_name: r.Student_Name,
          father_name: r.Father_Name || 'Father',
          section: r.Exact_Section_Name,
          group: r.Group_Subject || r.Exact_Section_Name,
          group_name: r.Group_Subject || r.Exact_Section_Name,
          category: r.Program,
          gender: r.Gender === 'Girls' ? 'Female' : 'Male',
          session: sessionNormalized,
          total_package: totalPkg,
          fee_received: totalPaid,
          total_fee_finalized: totalPkg,
          contact_number: contact,
          father_contact: contact,
          secondary_contact: secondaryContact,
          address: r.Address || 'Jahanian',
          academic_part: academicPart,
          program_type: programType,
          status: isLeft ? 'Left' : 'Admitted/Confirmed',
          is_admitted: true,
          fee_ledger: feeLedger,
          fee_history: transactions,
          date: '2026-08-15',
          created_at: new Date().toISOString()
        };
        toInsertAdmissions.push(newAdm);
      }
    }
  }

  console.log(`\nMatch & Plan Summary:`);
  console.log(`- Matched & Updating Students: ${toUpdateStudents.length}`);
  console.log(`- New Students to Insert: ${toInsertStudents.length}`);
  console.log(`- Total Verified Students: ${toUpdateStudents.length + toInsertStudents.length} (Expected: 870)`);

  // -------------------------------------------------------------
  // STEP 4: EXECUTE INSERTS AND UPDATES IN SUPABASE
  // -------------------------------------------------------------
  // A) Insert new admissions
  if (toInsertAdmissions.length > 0) {
    console.log(`\nInserting ${toInsertAdmissions.length} new admission records...`);
    const chunkSize = 50;
    for (let i = 0; i < toInsertAdmissions.length; i += chunkSize) {
      const chunk = toInsertAdmissions.slice(i, i + chunkSize);
      const { error: insAdmErr } = await supabase.from('admissions').insert(chunk);
      if (insAdmErr) console.error(`Error inserting admissions chunk ${i}:`, insAdmErr);
      else console.log(`✓ Inserted admissions chunk ${i + 1} to ${i + chunk.length}`);
    }
  }

  // B) Insert new students (without status column)
  if (toInsertStudents.length > 0) {
    console.log(`\nInserting ${toInsertStudents.length} new student records...`);
    const chunkSize = 50;
    for (let i = 0; i < toInsertStudents.length; i += chunkSize) {
      const chunk = toInsertStudents.slice(i, i + chunkSize);
      const { error: insStuErr } = await supabase.from('students').insert(chunk);
      if (insStuErr) console.error(`Error inserting students chunk ${i}:`, insStuErr);
      else console.log(`✓ Inserted students chunk ${i + 1} to ${i + chunk.length}`);
    }
  }

  // C) Update matched students in batches
  console.log(`\nUpdating ${toUpdateStudents.length} existing student records...`);
  let updateCount = 0;
  const updateChunkSize = 25;
  for (let i = 0; i < toUpdateStudents.length; i += updateChunkSize) {
    const chunk = toUpdateStudents.slice(i, i + updateChunkSize);
    await Promise.all(
      chunk.map(async (u) => {
        const { error: updErr } = await supabase
          .from('students')
          .update({
            college_no: u.college_no,
            full_name: u.full_name,
            father_name: u.father_name,
            section: u.section,
            group: u.group,
            group_name: u.group_name,
            category: u.category,
            gender: u.gender,
            session: u.session,
            total_package: u.total_package,
            fee_received: u.fee_received,
            total_fee_finalized: u.total_fee_finalized,
            contact: u.contact,
            father_contact: u.father_contact,
            secondary_contact: u.secondary_contact,
            address: u.address,
            academic_part: u.academic_part,
            program_type: u.program_type,
            fee_ledger: u.fee_ledger,
            fee_history: u.fee_history
          })
          .eq('id', u.id);

        if (!updErr) {
          updateCount++;
          // Also sync corresponding admission record if linked
          if (u.admission_id) {
            await supabase
              .from('admissions')
              .update({
                college_no: u.college_no,
                full_name: u.full_name,
                father_name: u.father_name,
                section: u.section,
                group: u.group,
                group_name: u.group_name,
                category: u.category,
                gender: u.gender,
                session: u.session,
                total_package: u.total_package,
                fee_received: u.fee_received,
                total_fee_finalized: u.total_fee_finalized,
                contact_number: u.contact,
                father_contact: u.father_contact,
                secondary_contact: u.secondary_contact,
                address: u.address,
                academic_part: u.academic_part,
                program_type: u.program_type,
                status: String(u.fee_ledger?.status).includes('Left') ? 'Left' : 'Admitted/Confirmed',
                is_admitted: true,
                fee_ledger: u.fee_ledger,
                fee_history: u.fee_history
              })
              .eq('id', u.admission_id);
          }
        } else {
          console.error(`Error updating student ${u.id}:`, updErr.message);
        }
      })
    );
    if ((i + updateChunkSize) % 100 === 0 || i + updateChunkSize >= toUpdateStudents.length) {
      console.log(`✓ Updated ${Math.min(i + updateChunkSize, toUpdateStudents.length)} / ${toUpdateStudents.length} students...`);
    }
  }

  // D) Mark non-verified admissions as is_admitted = false & status = 'Unverified'
  console.log('\n5. Step 4: Ensuring non-verified admissions do not self-heal into active roster...');
  const allUpdatedStudentAdmIds = new Set(toUpdateStudents.map(s => s.admission_id).filter(Boolean));
  toInsertStudents.forEach(s => allUpdatedStudentAdmIds.add(s.admission_id));

  const finalAdmissions = await fetchAllRows('admissions');
  const unverifiedAdmIds = finalAdmissions
    .filter(a => !allUpdatedStudentAdmIds.has(a.id) && (a.is_admitted || a.status === 'Admitted/Confirmed'))
    .map(a => a.id);

  console.log(`- Found ${unverifiedAdmIds.length} extra admissions to mark as unverified...`);
  if (unverifiedAdmIds.length > 0) {
    const admChunk = 50;
    for (let i = 0; i < unverifiedAdmIds.length; i += admChunk) {
      const c = unverifiedAdmIds.slice(i, i + admChunk);
      await supabase
        .from('admissions')
        .update({
          is_admitted: false,
          status: 'Unverified'
        })
        .in('id', c);
    }
    console.log(`✓ Marked ${unverifiedAdmIds.length} unverified admissions.`);
  }

  // -------------------------------------------------------------
  // STEP 5: VERIFY FINAL SUPABASE DATA & SECTION HEADCOUNTS
  // -------------------------------------------------------------
  console.log('\n=== FINAL VERIFICATION & SECTION HEADCOUNT AUDIT ===');
  const finalStudents = await fetchAllRows('students');
  console.log(`Total students now in Supabase 'students' table: ${finalStudents.length} (Expected: 870)`);

  const finalSecCounts = {};
  finalStudents.forEach(s => {
    const secId = s.fee_ledger?.sectionId || 'UNKNOWN';
    const key = `${secId} | ${s.section} | ${s.session}`;
    finalSecCounts[key] = (finalSecCounts[key] || 0) + 1;
  });

  let passCount = 0;
  sectionsMaster.forEach(sm => {
    const cleanSess = normalizeSession(sm.Session);
    const key = `${sm.Section_ID} | ${sm.Exact_Section_Name} | ${cleanSess}`;
    const actual = finalSecCounts[key] || 0;
    const isOk = actual === sm.Exact_Student_Count;
    if (isOk) passCount++;
    console.log(`  ${sm.Section_ID} [${sm.Exact_Section_Name}] (${sm.Campus.slice(0, 7)}): DB Headcount = ${actual} / Target = ${sm.Exact_Student_Count} ${isOk ? '✓ PASS' : '✗ FAIL'}`);
  });

  console.log(`\nAudit Result: ${passCount} of ${sectionsMaster.length} sections PASSED 100% exact headcount verification!`);
  console.log('=== SYNCHRONIZATION COMPLETE ===\n');
}

runSync().catch(console.error);
