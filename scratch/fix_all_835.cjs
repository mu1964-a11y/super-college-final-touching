const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function clean(s) {
  return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function fixAll835() {
  const { data: students } = await sb.from('students').select('*');
  let adm = [];
  let from = 0;
  while (true) {
    const { data } = await sb.from('admissions').select('*').range(from, from + 999);
    if (!data || data.length === 0) break;
    adm = adm.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const admSidSet = new Set(adm.map(a => a.student_id));
  const missingStudents = students.filter(s => !admSidSet.has(s.id));

  console.log(`Active students missing admission link: ${missingStudents.length}`);

  for (const st of missingStudents) {
    // Check if an admission exists with matching name
    const match = adm.find(a => clean(a.full_name) === clean(st.full_name) && clean(a.father_name) === clean(st.father_name));
    if (match) {
      await sb.from('admissions').update({
        student_id: st.id,
        status: 'Admitted/Confirmed',
        is_admitted: true,
        college_no: st.college_no || match.college_no || '',
        section: st.section || match.section,
        group: st.group || match.group,
      }).eq('id', match.id);
      admSidSet.add(st.id);
      console.log(`Updated matching admission: ${st.full_name} -> ${st.id}`);
    } else {
      // Insert fresh admission record
      await sb.from('admissions').insert({
        student_id: st.id,
        full_name: st.full_name,
        father_name: st.father_name || 'N/A',
        college_no: st.college_no || '',
        category: st.category || 'Regular',
        group: st.group || 'General',
        section: st.section || 'General',
        gender: st.gender || 'Male',
        session: st.session || '2026-28',
        academic_part: st.academic_part || 'Part-1',
        current_semester: st.current_semester || null,
        total_package: st.total_package || 0,
        fee_received: st.fee_received || 0,
        fee_ledger: st.fee_ledger || {},
        contact_number: st.contact_number || st.phone || '',
        father_contact: st.father_contact || '',
        address: st.address || 'Jahanian',
        status: 'Admitted/Confirmed',
        is_admitted: true,
        photo_url: st.photo_url || st.photo || null,
        created_at: new Date().toISOString(),
      });
      admSidSet.add(st.id);
      console.log(`Inserted fresh admission: ${st.full_name} -> ${st.id}`);
    }
  }

  // Final check
  let finalAdm = [];
  from = 0;
  while (true) {
    const { data } = await sb.from('admissions').select('id, student_id').range(from, from + 999);
    if (!data || data.length === 0) break;
    finalAdm = finalAdm.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  const finalAdmSids = new Set(finalAdm.map(a => a.student_id));
  const finalMissing = students.filter(s => !finalAdmSids.has(s.id));
  console.log(`\nFINAL CHECK: Active students missing in admissions: ${finalMissing.length}`);
}

fixAll835();
