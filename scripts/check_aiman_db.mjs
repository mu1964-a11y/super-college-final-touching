import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function checkDb() {
  const { data: dbAiman } = await supabase.from('students').select('*').ilike('full_name', '%AIMAN%');
  console.log('Aiman in DB:', dbAiman?.map(s => `${s.id} | ${s.college_no} | ${s.full_name} | ${s.father_name} | ${s.section}`));

  const { data: dbFarhan } = await supabase.from('students').select('*').ilike('full_name', '%FARHAN%');
  console.log('Farhan in DB:', dbFarhan?.map(s => `${s.id} | ${s.college_no} | ${s.full_name} | ${s.father_name} | ${s.section}`));
}

checkDb();
