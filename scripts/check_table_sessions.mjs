import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function checkSessions() {
  const tables = ['students', 'admissions', 'leads', 'academic_records'];
  for (const t of tables) {
    let all = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase.from(t).select('id, session').range(page * 1000, (page + 1) * 1000 - 1);
      if (error || !data || data.length === 0) break;
      all.push(...data);
      if (data.length < 1000) break;
      page++;
    }
    const map = {};
    all.forEach(r => { map[r.session || 'NULL'] = (map[r.session || 'NULL'] || 0) + 1; });
    console.log(`Table ${t} sessions (total: ${all.length}):`, map);
  }
}

checkSessions();
