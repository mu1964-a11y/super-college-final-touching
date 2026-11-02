const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectAdmissions() {
  const { data: st } = await sb.from('students').select('id, full_name, session, academic_part');
  const { data: adm } = await sb.from('admissions').select('id, student_id, full_name, status, session, academic_part, created_at, group, section');

  console.log('Total students:', st.length);
  console.log('Total admissions:', adm.length);

  // Status breakdown in admissions
  const statusCounts = {};
  adm.forEach(a => {
    const s = a.status || 'No Status';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  console.log('\nAdmissions Status Breakdown:');
  console.log(statusCounts);

  // Session breakdown in admissions
  const sessionCounts = {};
  adm.forEach(a => {
    const s = a.session || 'No Session';
    sessionCounts[s] = (sessionCounts[s] || 0) + 1;
  });
  console.log('\nAdmissions Session Breakdown:');
  console.log(sessionCounts);

  // Check how many admissions match students table by student_id or name
  const stIdSet = new Set(st.map(s => s.id));
  const matchedById = adm.filter(a => stIdSet.has(a.student_id));
  console.log('\nAdmissions matching students by student_id:', matchedById.length);

  // How many admissions don't match any student in students table
  const notInStudents = adm.filter(a => !stIdSet.has(a.student_id));
  console.log('Admissions NOT in students table:', notInStudents.length);
  
  // Status breakdown of those not in students
  const notInStudentsStatus = {};
  notInStudents.forEach(a => {
    const s = a.status || 'No Status';
    notInStudentsStatus[s] = (notInStudentsStatus[s] || 0) + 1;
  });
  console.log('\nStatus Breakdown of the ' + notInStudents.length + ' records NOT in active students:');
  console.log(notInStudentsStatus);

  console.log('\nSample of admissions not in students table (first 10):');
  notInStudents.slice(0, 10).forEach(a => {
    console.log(`- ${a.full_name} | Status: ${a.status} | Session: ${a.session} | Group: ${a.group} | ID: ${a.student_id}`);
  });
}
inspectAdmissions();
