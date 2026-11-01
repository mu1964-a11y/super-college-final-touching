const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const targetNames = [
  'ayesha iqbal', 'saira iftikhar',
  'minahil qamar', 'andleeb',
  'fatima rauf', 'sadia tariq',
  'mudasra ashraf', 'umar akhtar',
  'rabia ambreen', 'zahra khan'
];

async function run() {
  console.log('=== CHECKING STUDENTS TABLE ===');
  const { data: students } = await sb.from('students').select('*');
  for (const t of targetNames) {
    const matches = (students || []).filter(s => (s.full_name || '').toLowerCase().includes(t));
    console.log(`[students] Match '${t}': ${matches.length} found`);
    matches.forEach(m => console.log(`   ID: ${m.id}, CollegeNo: ${m.college_no}, RollNo: ${m.roll_no}, Name: ${m.full_name}, Sec: ${m.section}, Father: ${m.father_name}`));
  }

  console.log('\n=== CHECKING ADMISSIONS TABLE ===');
  const { data: admissions } = await sb.from('admissions').select('*');
  for (const t of targetNames) {
    const matches = (admissions || []).filter(a => (a.full_name || a.student_name || '').toLowerCase().includes(t));
    console.log(`[admissions] Match '${t}': ${matches.length} found`);
    matches.forEach(m => console.log(`   ID: ${m.id}, CollegeNo: ${m.college_no}, StudentID: ${m.student_id}, Name: ${m.full_name || m.student_name}`));
  }

  console.log('\n=== CHECKING BY REPORTED COLLISION IDS ===');
  const ids = ['SGC-26-813', 'SGC-26-948', 'SGC-26-845', 'BSP-26-738', 'BSP-26-496'];
  for (const id of ids) {
    const inStudents = (students || []).filter(s => s.id === id || s.college_no === id || s.roll_no === id);
    console.log(`ID ${id} in students:`, inStudents.map(s => ({ id: s.id, college_no: s.college_no, roll_no: s.roll_no, name: s.full_name })));
    const inAdmissions = (admissions || []).filter(a => a.id === id || a.student_id === id || a.college_no === id);
    console.log(`ID ${id} in admissions:`, inAdmissions.map(a => ({ id: a.id, student_id: a.student_id, name: a.full_name || a.student_name })));
  }
}

run();
