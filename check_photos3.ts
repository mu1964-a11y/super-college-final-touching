import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: students, error: studentError, count } = await supabase.from('students').select('id, photo', { count: 'exact' });
  console.log("Students Count:", count, "Data length:", students?.length, "Error:", studentError);
}
check();
