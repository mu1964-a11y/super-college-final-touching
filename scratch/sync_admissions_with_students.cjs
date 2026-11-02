const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function clean(s) {
  return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function sync() {
  const { data: students, error: errSt } = await sb.from('students').select('*');
  let admissions = [];
  let from = 0;
  while (true) {
    const { data } = await sb.from('admissions').select('*').range(from, from + 999);
    if (!data || data.length === 0) break;
    admissions = admissions.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  console.log(`Students: ${students.length}, Admissions: ${admissions.length}`);

  // Map admissions by student_id and by clean name+father
  const admBySid = new Map();
  const admByName = new Map();
  admissions.forEach(a => {
    if (a.student_id) admBySid.set(a.student_id.toUpperCase(), a);
    const key = clean(a.full_name) + '__' + clean(a.father_name);
    admByName.set(key, a);
  });

  const toInsert = [];
  const toUpdate = [];

  for (const st of students) {
    const sid = (st.id || '').toUpperCase();
    const key = clean(st.full_name) + '__' + clean(st.father_name);

    let adm = admBySid.get(sid) || admByName.get(key);
    if (adm) {
      // Existing admission record: ensure it is marked Admitted/Confirmed and linked to student.id
      if (adm.student_id !== st.id || adm.status !== 'Admitted/Confirmed' || !adm.is_admitted) {
        toUpdate.push({
          id: adm.id,
          student_id: st.id,
          full_name: st.full_name,
          father_name: st.father_name || adm.father_name,
          college_no: st.college_no || adm.college_no || '',
          section: st.section || adm.section,
          group: st.group || adm.group,
          status: 'Admitted/Confirmed',
          is_admitted: true,
          session: st.session || adm.session,
          academic_part: st.academic_part || adm.academic_part,
          current_semester: st.current_semester || adm.current_semester,
          total_package: st.total_package || adm.total_package || 0,
          fee_received: st.fee_received || adm.fee_received || 0,
        });
      }
    } else {
      // Missing admission record: create one for this verified active student!
      toInsert.push({
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
    }
  }

  console.log(`To Update in Admissions: ${toUpdate.length}`);
  console.log(`To Insert in Admissions: ${toInsert.length}`);

  // Execute updates
  for (const u of toUpdate) {
    const { id, ...fields } = u;
    await sb.from('admissions').update(fields).eq('id', id);
  }

  // Execute inserts in chunks of 50
  for (let i = 0; i < toInsert.length; i += 50) {
    const chunk = toInsert.slice(i, i + 50);
    const { error } = await sb.from('admissions').insert(chunk);
    if (error) console.error('Insert chunk error:', error);
  }

  console.log('Sync complete!');
}

sync();
