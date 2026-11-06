import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function checkAllTables() {
  const tables = ['students', 'admissions', 'leads', 'income', 'expenses', 'academic_records', 'fee_transactions', 'fee_payments', 'installments', 'student_attendance'];
  
  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(5);
      if (error) {
        console.log(`Table ${t}: error ${error.message}`);
        continue;
      }
      if (!data || data.length === 0) {
        console.log(`Table ${t}: 0 rows`);
        continue;
      }
      const hasSession = 'session' in data[0];
      console.log(`Table ${t}: has session column? ${hasSession}`);
      if (hasSession) {
        const { data: sessRows } = await supabase.from(t).select('session');
        const set = new Set(sessRows?.map(r => r.session));
        console.log(`Table ${t} distinct sessions:`, Array.from(set));
      }
    } catch (e) {
      console.error(e);
    }
  }
}

checkAllTables();
