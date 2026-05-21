import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function repairSubjects() {
  const { data: students, error: studentsError } = await supabase.from('students').select('id, admission_id, subjects');
  if (studentsError) {
    console.error(studentsError);
    return;
  }
  console.log(`Found ${students?.length || 0} students`);

  const { data: admissions, error: adError } = await supabase.from('admissions').select('id, subjects');
  if (adError) {
    console.error(adError);
    return;
  }
  console.log(`Found ${admissions?.length || 0} admissions`);

  let repaired = 0;
  for (const student of students) {
    if (!student.subjects || student.subjects.length === 0) {
      console.log(`Student ${student.id} has no subjects. admission_id: ${student.admission_id}`);
      if (student.admission_id) {
        const admission = admissions.find(a => a.id === student.admission_id);
        if (admission && admission.subjects && admission.subjects.length > 0) {
          await supabase.from('students').update({ subjects: admission.subjects }).eq('id', student.id);
          repaired++;
        }
      }
    } else {
        console.log(`Student ${student.id} HAS subjects:`, student.subjects);
    }
  }
  console.log(`Repaired ${repaired} students' subjects from their admissions data.`);
}

repairSubjects();
