import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: students, error: studentError } = await supabase.from('students').select('id, admission_id, photo');
  if (studentError) { console.error('Student Error:', studentError); return; }

  const { data: admissions, error: admissionError } = await supabase.from('admissions').select('id, photo_url');
  if (admissionError) { console.error('Admission Error:', admissionError); return; }

  let count = 0;
  for (const student of students) {
    if (student.admission_id && !student.photo) {
      const parentAdmission = admissions.find(a => a.id === student.admission_id);
      if (parentAdmission && parentAdmission.photo_url) {
        console.log(`Updating student ${student.id} with photo`);
        await supabase.from('students').update({ photo: parentAdmission.photo_url }).eq('id', student.id);
        count++;
      }
    }
  }
  console.log(`Updated ${count} students`);
}
run();
