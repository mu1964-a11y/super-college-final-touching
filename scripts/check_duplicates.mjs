import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function checkDuplicates() {
  const { data: dbStudents } = await supabase.from('students').select('id, full_name, father_name, college_no, section');
  console.log('Total students:', dbStudents.length);
  // Check SGC-26-1158 vs SGC-26-1238
  const s1 = dbStudents.find(s => s.id === 'SGC-26-1158');
  const s2 = dbStudents.find(s => s.id === 'SGC-26-1238');
  console.log('s1 (1158):', s1);
  console.log('s2 (1238):', s2);
}

checkDuplicates();
