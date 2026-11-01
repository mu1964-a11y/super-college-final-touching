const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyAll() {
  const { data: st, count: stCount } = await sb.from('students').select('id', { count: 'exact' });
  const { data: adm, count: admCount } = await sb.from('admissions').select('id, student_id, full_name', { count: 'exact' });

  console.log('Students count in DB:', stCount);
  console.log('Admissions count in DB:', admCount);

  // Check the 5 specific collision IDs from screenshot
  const targetIds = ['SGC-26-813', 'SGC-26-948', 'SGC-26-845', 'BSP-26-738', 'BSP-26-496'];
  for (const tid of targetIds) {
    const matched = adm.filter(a => a.student_id === tid);
    console.log(`Collision Check for ID '${tid}': ${matched.length} record(s) -> ${JSON.stringify(matched.map(m => m.full_name))}`);
  }

  // Check any remaining duplicates in admissions
  const counts = {};
  adm.forEach(a => {
    if (a.student_id) counts[a.student_id] = (counts[a.student_id] || 0) + 1;
  });
  const anyDupes = Object.entries(counts).filter(([k, v]) => v > 1);
  console.log('Total Duplicate IDs across entire Admissions table:', anyDupes.length);
}
verifyAll();
