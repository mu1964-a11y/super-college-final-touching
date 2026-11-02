const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fullBreakdown() {
  // Fetch ALL rows from admissions (using pagination or large limit)
  let allAdm = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await sb.from('admissions').select('*').range(from, from + batchSize - 1);
    if (error || !data || data.length === 0) break;
    allAdm = allAdm.concat(data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  const { data: allSt } = await sb.from('students').select('*');

  console.log('Total Admissions rows in DB:', allAdm.length);
  console.log('Total Active Students in DB:', allSt.length);

  // Group by session
  const bySession = {};
  allAdm.forEach(a => {
    const s = a.session || 'Unknown';
    bySession[s] = (bySession[s] || 0) + 1;
  });
  console.log('\nAdmissions By Session:', bySession);

  // Group by status
  const byStatus = {};
  allAdm.forEach(a => {
    const s = a.status || 'No Status';
    byStatus[s] = (byStatus[s] || 0) + 1;
  });
  console.log('\nAdmissions By Status:', byStatus);

  // Check matching by Name + Father Name
  function clean(s) {
    return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  const stNameMap = new Map();
  allSt.forEach(s => {
    const key = clean(s.full_name) + '__' + clean(s.father_name);
    stNameMap.set(key, s);
  });

  let matchedStudentsCount = 0;
  const matchedAdmissions = [];
  const unmatchedAdmissions = [];

  for (const a of allAdm) {
    const key = clean(a.full_name) + '__' + clean(a.father_name);
    if (stNameMap.has(key) || allSt.some(s => s.id === a.student_id)) {
      matchedStudentsCount++;
      matchedAdmissions.push(a);
    } else {
      unmatchedAdmissions.push(a);
    }
  }

  console.log(`\nMatched with Active Students: ${matchedStudentsCount}`);
  console.log(`Unmatched (Old sessions, cancelled, prospective, left): ${unmatchedAdmissions.length}`);

  // Breakdown of unmatched
  const unmatchedStatus = {};
  const unmatchedSession = {};
  unmatchedAdmissions.forEach(a => {
    unmatchedStatus[a.status || 'None'] = (unmatchedStatus[a.status || 'None'] || 0) + 1;
    unmatchedSession[a.session || 'None'] = (unmatchedSession[a.session || 'None'] || 0) + 1;
  });

  console.log('\nUnmatched Admissions Status Breakdown:');
  console.log(unmatchedStatus);
  console.log('\nUnmatched Admissions Session Breakdown:');
  console.log(unmatchedSession);
}

fullBreakdown();
