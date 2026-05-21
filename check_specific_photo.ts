import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data: admissions, error: err2 } = await supabase.from('admissions').select('*'); // select all
  
  if (err2) console.error("Err2", err2);

  const withPhoto = admissions?.filter(a => a.photo_url || a.photo);
  console.log("Admissions with photo:", withPhoto?.map(a => ({ name: a.full_name, id: a.id, photo_url_len: a.photo_url?.length, photo_len: a.photo?.length })));
}
run();
