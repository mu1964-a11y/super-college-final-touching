import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const tables = ['admissions', 'leads', 'students'];
  for (const table of tables) {
    await supabase.from(table).update({ session: '2026-28' }).eq('session', 'all');
    await supabase.from(table).update({ session: '2026-28' }).eq('session', '2026-2028');
    await supabase.from(table).update({ session: '2026-28' }).eq('session', '2026-202');
  }
}
run();
