import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function checkStudentSections() {
  const { data: students } = await supabase.from('students').select('id, full_name, section, group, session');
  const secCounts = {};
  students.forEach(s => {
    const k = `${s.session} | ${s.section}`;
    secCounts[k] = (secCounts[k] || 0) + 1;
  });
  console.log('Students section counts in DB:');
  for (const [k, v] of Object.entries(secCounts).sort()) {
    console.log(`  ${k} => ${v}`);
  }
}

checkStudentSections();
