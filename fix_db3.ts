import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const tables = ['admissions', 'leads', 'students'];
  for (const table of tables) {
    const { data } = await supabase.from(table).select('id, session');
    if (data) {
      for (const row of data) {
        if (!row.session) continue;
        if (row.session.includes('2026-2028') || row.session.includes('2026-202') || row.session.includes('2026-2') && row.session !== '2026-28' && row.session !== '2026') {
          console.log(`Found odd session in ${table}: ${row.session} (ID: ${row.id})`);
          await supabase.from(table).update({ session: '2026-28' }).eq('id', row.id);
          console.log(`Updated ID: ${row.id} to 2026-28`);
        }
      }
    }
  }
}
run();
