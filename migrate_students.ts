import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function migrate() {
  const { data: admissions, error } = await supabase.from('admissions').select('*');
  if (error) return console.error('Fetch error:', error);
  
  const admitted = admissions.filter(a => a.is_admitted || a.status === 'Admitted/Confirmed');
  console.log(`Found ${admitted.length} admitted students.`);
  
  for (const a of admitted) {
    const studentId = a.student_id || a.id;
    
    // Check if exists
    const { data: existing } = await supabase.from('students').select('id').eq('id', studentId).single();
    if (existing) continue;
    
    const { error: insertError } = await supabase.from('students').insert({
      id: studentId,
      admission_id: a.id,
      full_name: a.full_name,
      father_name: a.father_name,
      category: a.category || 'N/A',
      group: a.group || 'N/A',
      section: a.section || 'Unassigned',
      contact: a.contact_number,
      address: a.address,
      total_package: a.total_package,
      fee_received: a.fee_received,
      fee_ledger: a.fee_ledger || {},
      monthly_fee: Math.round((a.total_package || 0) / 12),
      total_installments: 12,
      session: a.session,
      session_start_date: a.session_start_date,
      session_end_date: a.session_end_date,
      academic_part: a.academic_part || 'Part-1',
      fee_history: a.fee_history || []
    });
    
    if (insertError) {
      if (insertError.code === '42501') {
        console.error(`RLS error for ${studentId}, you must sync from the UI where you are authenticated.`);
        break; // can't run this as anon
      }
      console.error(`Error inserting ${studentId}:`, insertError);
    } else {
      console.log(`Successfully migrated ${studentId}`);
    }
  }
}

migrate();
