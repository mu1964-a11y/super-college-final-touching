const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function clean(s) {
  return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function testScope() {
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
  console.log(`Total DB Admissions: ${allAdm.length}, Total Active Students: ${allSt.length}`);

  const stIdSet = new Set(allSt.map(s => (s.id || '').toUpperCase()));
  const stNameMap = new Map();
  allSt.forEach(s => {
    const key = clean(s.full_name) + '__' + clean(s.father_name);
    stNameMap.set(key, s);
  });

  const enrolledAdm = [];
  const prospectiveAdm = [];
  const archiveAdm = [];

  for (const a of allAdm) {
    const sid = (a.student_id || '').toUpperCase();
    const key = clean(a.full_name) + '__' + clean(a.father_name);
    const isEnrolledStudent = stIdSet.has(sid) || stNameMap.has(key);

    const statusStr = (a.status || '').toLowerCase();
    const isProspective = statusStr === 'prospective' || statusStr === 'inquiry' || a.is_admitted === false;

    if (isEnrolledStudent) {
      enrolledAdm.push(a);
    } else if (isProspective) {
      prospectiveAdm.push(a);
    } else {
      archiveAdm.push(a);
    }
  }

  console.log('Enrolled Admissions matching active students:', enrolledAdm.length);
  console.log('Prospective & Inquiries:', prospectiveAdm.length);
  console.log('Past Sessions & Left / Archived:', archiveAdm.length);
  console.log('Sum:', enrolledAdm.length + prospectiveAdm.length + archiveAdm.length);
}

testScope();
