import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const tables = ['admissions', 'students', 'leads'];
  
  for (const table of tables) {
    const { data } = await supabase.from(table).select('id, section');
    if (!data) continue;
    
    let count = 0;
    for (const row of data) {
      if (row.section && row.section.includes('2026-202')) {
        const newSection = row.section.replace(/2026-202[0-9]*/g, '2026-28');
        await supabase.from(table).update({ section: newSection }).eq('id', row.id);
        count++;
        console.log(`Updated ${table} [${row.id}]: ${row.section} -> ${newSection}`);
      }
    }
    console.log(`Finished ${table}: updated ${count} rows`);
  }
}
run();
