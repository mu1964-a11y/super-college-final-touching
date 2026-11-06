import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
  const { data: s } = await supabase.from('students').select('*').limit(1);
  console.log('Students columns:', Object.keys(s[0] || {}));
  const { data: a } = await supabase.from('admissions').select('*').limit(1);
  console.log('Admissions columns:', Object.keys(a[0] || {}));
}

checkColumns();
