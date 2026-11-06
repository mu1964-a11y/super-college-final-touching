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

async function matchStudents() {
  const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
  const csvRows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

  let dbStudents = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase.from('students').select('*').range(page * 1000, (page + 1) * 1000 - 1);
    if (error || !data || data.length === 0) break;
    dbStudents.push(...data);
    if (data.length < 1000) break;
    page++;
  }
  console.log('Total students in DB:', dbStudents.length);
  console.log('Total rows in CSV:', csvRows.length);

  // Let's see how DB students match CSV rows: by id, roll_no/college_no, or name+father_name
  console.log('Sample DB student:', {
    id: dbStudents[0]?.id,
    college_no: dbStudents[0]?.college_no,
    full_name: dbStudents[0]?.full_name,
    father_name: dbStudents[0]?.father_name,
    section: dbStudents[0]?.section,
    session: dbStudents[0]?.session
  });

  const verified = csvRows.filter(r => r.Record_Type === 'VERIFIED_ROSTER');
  console.log('Verified roster rows in CSV:', verified.length);
  console.log('Sample verified CSV row:', {
    Record_ID: verified[0]?.Record_ID,
    Roll_No: verified[0]?.Roll_No,
    Student_Name: verified[0]?.Student_Name,
    Father_Name: verified[0]?.Father_Name,
    Section: verified[0]?.Exact_Section_Name,
    Section_ID: verified[0]?.Section_ID,
    Session: verified[0]?.Session
  });

  // Let's test matching by (Name + Father Name) or Roll No
  let matchedByName = 0;
  dbStudents.forEach(s => {
    const sName = (s.full_name || '').trim().toLowerCase();
    const sfName = (s.father_name || '').trim().toLowerCase();
    const match = verified.find(v => {
      const vName = (v.Student_Name || '').trim().toLowerCase();
      const vfName = (v.Father_Name || '').trim().toLowerCase();
      return vName === sName && (!sfName || !vfName || vfName === sfName);
    });
    if (match) matchedByName++;
  });
  console.log(`Matched ${matchedByName} of ${dbStudents.length} DB students to CSV verified rows by name!`);
}

matchStudents();
