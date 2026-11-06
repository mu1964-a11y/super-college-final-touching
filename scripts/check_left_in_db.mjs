import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function checkLeftStudents() {
  const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
  const csvRows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

  const leftRows = csvRows.filter(r => r.Record_Type === 'VERIFIED_ROSTER' && String(r.Roster_Status).includes('Left'));
  console.log('Left rows in CSV:', leftRows.length);

  const { data: dbStudents } = await supabase.from('students').select('id, full_name, father_name, section, status');
  const { data: dbAdmissions } = await supabase.from('admissions').select('id, full_name, father_name, section, status');

  let inStudents = 0;
  let inAdmissions = 0;

  leftRows.forEach(l => {
    const lName = (l.Student_Name || '').trim().toLowerCase();
    const lfName = (l.Father_Name || '').trim().toLowerCase();

    const inS = dbStudents?.find(s => (s.full_name || '').trim().toLowerCase() === lName && (!lfName || (s.father_name || '').trim().toLowerCase() === lfName));
    if (inS) inStudents++;

    const inA = dbAdmissions?.find(a => (a.full_name || '').trim().toLowerCase() === lName && (!lfName || (a.father_name || '').trim().toLowerCase() === lfName));
    if (inA) inAdmissions++;
  });

  console.log(`Of ${leftRows.length} LEFT rows in CSV:`);
  console.log(`- Found in students table: ${inStudents}`);
  console.log(`- Found in admissions table: ${inAdmissions}`);
  console.log('Sample left row in CSV:', {
    name: leftRows[0]?.Student_Name,
    father: leftRows[0]?.Father_Name,
    section: leftRows[0]?.Exact_Section_Name,
    secId: leftRows[0]?.Section_ID,
    status: leftRows[0]?.Roster_Status
  });
}

checkLeftStudents();
