import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function searchOld() {
  const tables = ['students', 'admissions', 'leads', 'income', 'expenses', 'academic_records', 'student_attendance', 'staff', 'settings'];
  for (const t of tables) {
    const { data } = await supabase.from(t).select('*');
    if (!data) continue;
    let found = 0;
    const oldSessions = new Set();
    data.forEach(row => {
      const s = JSON.stringify(row);
      const m = s.match(/201[89]-2\d|202[012]-2\d|2023-25/g);
      if (m) {
        found++;
        m.forEach(x => oldSessions.add(x));
      }
    });
    console.log(`Table ${t} (rows: ${data.length}): matched old sessions? ${found}`, Array.from(oldSessions));
  }
}

searchOld();
