import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function inspectOld() {
  const { data: adm2426 } = await supabase.from('admissions').select('id, full_name, session, category, group, program_type').eq('session', '2024-26');
  console.log('Admissions with 2024-26:', adm2426?.length);
  adm2426?.forEach(a => {
    console.log(`  ${a.id} | ${a.full_name} | cat: ${a.category} | grp: ${a.group} | prog: ${a.program_type}`);
  });

  // Check for any pre-2023 or 2023-25 records in admissions and students
  const { data: allAdm } = await supabase.from('admissions').select('id, session, category, group');
  const oldAdm = allAdm.filter(a => {
    const s = a.session || '';
    return s.includes('2018') || s.includes('2019') || s.includes('2020') || s.includes('2021') || s.includes('2022') || s.includes('2023-25') || s.includes('2023-2025');
  });
  console.log('Admissions with pre-2023 or 2023-25:', oldAdm.length);
}

inspectOld();
