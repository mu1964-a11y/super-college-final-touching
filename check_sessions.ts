import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSessions() {
  const tables = ['leads', 'admissions', 'students'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('session');
    if (data) {
      const uniq = [...new Set(data.map(d => d.session))];
      console.log(`Sessions in ${table}:`, uniq);
    }
  }
}
checkSessions();
