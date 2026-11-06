import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function checkAspireInDb() {
  // Usman Asif is VER-0795
  const { data: s } = await supabase.from('students').select('id, full_name, father_name, section, category, group, fee_ledger').ilike('full_name', '%USMAN ASIF%');
  console.log('Usman Asif in DB:', s);

  const { data: s2 } = await supabase.from('students').select('id, full_name, father_name, section, category, group, fee_ledger').ilike('full_name', '%SHAHZAIB MUNEER%');
  console.log('Shahzaib Muneer in DB:', s2);
}

checkAspireInDb();
