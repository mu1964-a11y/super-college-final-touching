import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data } = await supabase.from('admissions').select('id, full_name, section, session');
  console.log('Total admissions:', data?.length);
  const badSections = data?.filter(d => d.section && d.section.includes('2026-202')) || [];
  console.log(`Bad sections found: ${badSections.length}`);
  badSections.slice(0, 5).forEach(b => console.log(b));
}
run();
