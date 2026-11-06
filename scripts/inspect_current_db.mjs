import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function getAllRows(tableName) {
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

async function inspect() {
  const tables = ['students', 'admissions', 'fee_transactions', 'fee_payments', 'installments', 'student_fees', 'income', 'leads'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`Table ${t}: ${count} rows (err: ${error?.message || 'none'})`);
  }

  const admissions = await getAllRows('admissions');
  console.log(`Fetched all admissions: ${admissions.length}`);
  const admSessions = {};
  for (const a of admissions) {
    const s = a.session || 'NULL';
    admSessions[s] = (admSessions[s] || 0) + 1;
  }
  console.log('Admissions by session:', admSessions);

  const students = await getAllRows('students');
  console.log(`Fetched all students: ${students.length}`);
  const stuSessions = {};
  for (const s of students) {
    const sess = s.session || 'NULL';
    stuSessions[sess] = (stuSessions[sess] || 0) + 1;
  }
  console.log('Students by session:', stuSessions);
}

inspect();
