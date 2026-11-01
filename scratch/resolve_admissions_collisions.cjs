const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function cleanName(n) {
  return String(n || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function run() {
  const { data: students, error: errSt } = await sb.from('students').select('id, full_name, father_name, college_no, section');
  const { data: admissions, error: errAdm } = await sb.from('admissions').select('id, student_id, full_name, father_name, college_no, group, section');

  if (errSt || errAdm) {
    console.error('Fetch error:', errSt || errAdm);
    return;
  }

  console.log(`Fetched ${students.length} students, ${admissions.length} admissions.`);

  // Build existing ID set to avoid any collision
  const usedIds = new Set();
  students.forEach(s => s.id && usedIds.add(s.id.toUpperCase()));
  admissions.forEach(a => a.student_id && usedIds.add(a.student_id.toUpperCase()));

  let nextSgc = 1500;
  let nextBsp = 1500;
  let nextDit = 1000;

  function getUniqueId(prefix) {
    let p = prefix.toUpperCase();
    if (p.includes('BS')) {
      while (usedIds.has(`BSP-26-${nextBsp}`)) nextBsp++;
      const id = `BSP-26-${nextBsp}`;
      usedIds.add(id);
      return id;
    } else if (p.includes('DIT')) {
      while (usedIds.has(`DIT-26-${nextDit}`)) nextDit++;
      const id = `DIT-26-${nextDit}`;
      usedIds.add(id);
      return id;
    } else {
      while (usedIds.has(`SGC-26-${nextSgc}`)) nextSgc++;
      const id = `SGC-26-${nextSgc}`;
      usedIds.add(id);
      return id;
    }
  }

  // Find admissions grouped by student_id
  const admByStudentId = new Map();
  for (const a of admissions) {
    if (!a.student_id) continue;
    const sid = a.student_id.toUpperCase();
    if (!admByStudentId.has(sid)) admByStudentId.set(sid, []);
    admByStudentId.get(sid).push(a);
  }

  const updates = [];

  // Specifically check the user-reported 5 pairs first
  const specificPairs = [
    { targetName: 'ayesha iqbal', correctId: 'SGC-26-1328' },
    { targetName: 'andleeb', correctId: 'SGC-26-1219' },
    { targetName: 'zahra khan', correctId: 'BSP-26-513' },
    { targetName: 'sadia tariq', correctId: 'LEFT-P1-5' }
  ];

  for (const pair of specificPairs) {
    const adm = admissions.find(a => (a.full_name || '').toLowerCase() === pair.targetName.toLowerCase() || (a.full_name || '').toLowerCase().includes(pair.targetName));
    if (adm && adm.student_id !== pair.correctId) {
      console.log(`Specific fix: '${adm.full_name}' was ${adm.student_id} -> set to ${pair.correctId}`);
      updates.push({ id: adm.id, newStudentId: pair.correctId, name: adm.full_name, oldId: adm.student_id });
      usedIds.add(pair.correctId.toUpperCase());
    }
  }

  // Now resolve all remaining collisions in admissions
  for (const [sid, list] of admByStudentId.entries()) {
    if (list.length <= 1) continue;

    // Check which item in list belongs to an active student with matching id
    let matchedIndex = list.findIndex(a => {
      const st = students.find(s => s.id.toUpperCase() === sid);
      if (!st) return false;
      return cleanName(st.full_name) === cleanName(a.full_name);
    });

    if (matchedIndex === -1) matchedIndex = 0; // keep first one

    // For all other duplicates in the list
    for (let i = 0; i < list.length; i++) {
      if (i === matchedIndex) continue;
      const record = list[i];
      // Check if this record already in updates
      if (updates.some(u => u.id === record.id)) continue;

      // Check if student exists in students under another ID
      const matchingStudent = students.find(s => cleanName(s.full_name) === cleanName(record.full_name));
      let assignedId;
      if (matchingStudent && !usedIds.has(matchingStudent.id.toUpperCase())) {
        assignedId = matchingStudent.id;
      } else {
        const prefix = sid.startsWith('BSP') ? 'BSP' : sid.startsWith('DIT') ? 'DIT' : 'SGC';
        assignedId = getUniqueId(prefix);
      }

      console.log(`Resolving collision for [${sid}] -> '${record.full_name}' assigned ${assignedId}`);
      updates.push({ id: record.id, newStudentId: assignedId, name: record.full_name, oldId: sid });
    }
  }

  console.log(`\nExecuting ${updates.length} updates to Supabase 'admissions' table...`);
  let successCount = 0;
  for (const item of updates) {
    const { error } = await sb.from('admissions').update({ student_id: item.newStudentId }).eq('id', item.id);
    if (error) {
      console.error(`Failed to update admission ${item.id} (${item.name}):`, error);
    } else {
      successCount++;
    }
  }

  console.log(`Successfully updated ${successCount} / ${updates.length} admissions records!`);

  // Verification step: verify duplicate count is now ZERO
  const { data: postAdm } = await sb.from('admissions').select('id, student_id');
  const postMap = new Map();
  for (const a of postAdm) {
    if (!a.student_id) continue;
    const sid = a.student_id.toUpperCase();
    if (!postMap.has(sid)) postMap.set(sid, []);
    postMap.get(sid).push(a);
  }
  const remainingCollisions = [...postMap.entries()].filter(([k, v]) => v.length > 1);
  console.log(`\n=== AUDIT VERIFICATION ===`);
  console.log(`Remaining duplicate student_ids in admissions: ${remainingCollisions.length}`);
  if (remainingCollisions.length > 0) {
    remainingCollisions.forEach(([id, l]) => console.log('Remaining:', id, l.length));
  } else {
    console.log(`PERFECT: 0 COLLISION DEFECTS! All admissions records now have 100% unique student IDs.`);
  }
}

run();
