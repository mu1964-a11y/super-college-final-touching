const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function clean(s) {
  return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function findMissingAdmissions() {
  let allAdm = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('admissions').select('*').range(from, from + 999);
    if (!data || data.length === 0) break;
    allAdm = allAdm.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const { data: allSt } = await sb.from('students').select('*');

  const admSidSet = new Set(allAdm.map(a => (a.student_id || '').toUpperCase()));
  const admNameMap = new Map();
  allAdm.forEach(a => {
    const key = clean(a.full_name) + '__' + clean(a.father_name);
    admNameMap.set(key, a);
  });

  const studentsWithoutAdmission = [];
  for (const s of allSt) {
    const sid = (s.id || '').toUpperCase();
    const key = clean(s.full_name) + '__' + clean(s.father_name);
    if (!admSidSet.has(sid) && !admNameMap.has(key)) {
      studentsWithoutAdmission.push(s);
    }
  }

  console.log(`Active students without admission record: ${studentsWithoutAdmission.length} / ${allSt.length}`);

  // Breakdown by section / group / session
  const byGroup = {};
  const byPart = {};
  studentsWithoutAdmission.forEach(s => {
    const g = s.group || s.category || 'Unknown';
    const p = s.academic_part || s.session || 'Unknown';
    byGroup[g] = (byGroup[g] || 0) + 1;
    byPart[p] = (byPart[p] || 0) + 1;
  });

  console.log('Missing admissions by group:', byGroup);
  console.log('Missing admissions by part/session:', byPart);
  console.log('Sample 5:', studentsWithoutAdmission.slice(0, 5).map(s => ({ id: s.id, name: s.full_name, father: s.father_name, sec: s.section, part: s.academic_part })));
}

findMissingAdmissions();
