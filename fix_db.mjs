import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const tables = ['admissions', 'students', 'incomes', 'expenses', 'academic_records'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).update({ session: '2026-28' }).eq('session', '2026-2028');
    console.log(t, error, data);
    const { data: d2, error: e2 } = await supabase.from(t).update({ session: '2025-27' }).eq('session', '2025-2027');
    const { data: d3, error: e3 } = await supabase.from(t).update({ session: '2024-26' }).eq('session', '2024-2026');
    const { data: d4, error: e4 } = await supabase.from(t).update({ session: '2027-29' }).eq('session', '2027-2029');
  }
}
run();
