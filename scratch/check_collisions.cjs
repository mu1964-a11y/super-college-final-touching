const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function findCollisions() {
  const { data: students, error } = await sb.from('students').select('*');
  if (error) {
    console.error('Error fetching students:', error);
    return;
  }
  console.log('Total students fetched:', students.length);

  // Check duplicate IDs
  const idMap = new Map();
  for (const s of students) {
    const id = s.id;
    if (!idMap.has(id)) idMap.set(id, []);
    idMap.get(id).push(s);
  }
  const duplicateIds = [...idMap.entries()].filter(([k, v]) => v.length > 1);
  console.log('Duplicate IDs count in Supabase:', duplicateIds.length);
  duplicateIds.forEach(([id, list]) => {
    console.log('Duplicate ID:', id, list.map(x => ({ name: x.full_name, roll: x.roll_no, collegeNo: x.college_no })));
  });

  // Check duplicate college_no
  const cNoMap = new Map();
  for (const s of students) {
    const cno = s.college_no;
    if (!cno) continue;
    if (!cNoMap.has(cno)) cNoMap.set(cno, []);
    cNoMap.get(cno).push(s);
  }
  const duplicateCNo = [...cNoMap.entries()].filter(([k, v]) => v.length > 1);
  console.log('Duplicate college_no count:', duplicateCNo.length);
  duplicateCNo.forEach(([cno, list]) => {
    console.log('Duplicate college_no:', cno, list.map(x => ({ id: x.id, name: x.full_name, roll: x.roll_no })));
  });

  // Search specific names from user screenshot
  const targetNames = ['ayesha iqbal', 'saira iftikhar', 'minahil qamar', 'andleeb', 'fatima rauf', 'sadia tariq', 'mudasra', 'umar akhtar', 'rabia ambreen', 'zahra khan'];
  console.log('--- TARGET NAMES SEARCH ---');
  for (const s of students) {
    const fn = (s.full_name || '').toLowerCase();
    for (const t of targetNames) {
      if (fn.includes(t)) {
        console.log(`Matched '${t}': id=${s.id}, college_no=${s.college_no}, roll_no=${s.roll_no}, name=${s.full_name}, father=${s.father_name}, section=${s.section}, pkg=${s.total_package}, rec=${s.fee_received}`);
      }
    }
  }
}
findCollisions();
