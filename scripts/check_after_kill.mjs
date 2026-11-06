import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function checkCurrent() {
  const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
  console.log('Students count now:', sCount);
  const { count: aCount } = await supabase.from('admissions').select('*', { count: 'exact', head: true });
  console.log('Admissions count now:', aCount);

  // Check if SGC-LEFT was created
  const { data: lefts } = await supabase.from('students').select('id, full_name').ilike('id', '%LEFT%');
  console.log('Students with LEFT in id:', lefts?.length);
}

checkCurrent();
