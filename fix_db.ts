import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Migrating sessions from "2026-2028" to "2026-28"...');
  
  // Note: These tables actually exist and have session column
  const tables = ['leads', 'admissions', 'students'];

  for (const table of tables) {
    console.log(`Updating ${table}...`);
    const { error: err1 } = await supabase.from(table).update({ session: '2026-28' }).eq('session', '2026-2028');
    if (err1) console.error(`Error updating table ${table} '2026-2028':`, err1);
  }
  
  console.log('Updating settings...');
  const { error: err2 } = await supabase.from('settings').update({ academic_session: '2026-28' }).eq('academic_session', '2026-2028');
  if (err2) console.error('Error updating settings 2026-2028:', err2);

  console.log('Done.');
}
run();
