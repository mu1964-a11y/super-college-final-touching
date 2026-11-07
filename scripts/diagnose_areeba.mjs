import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf8');
let url = '', key = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const client = createClient(url, key);

async function testExact() {
  const { data: studentsData } = await client.from('students').select('*').range(0, 10000);
  const { data: settingsData } = await client.from('settings').select('*').limit(1).maybeSingle();

  const deletedArchiveList = (settingsData?.config?.deletedArchive || []);
  const archivedIds = new Set();
  const archivedNames = new Set();
  deletedArchiveList.forEach((arch) => {
    if (arch.originalId) archivedIds.add(arch.originalId);
    if (arch.studentId) archivedIds.add(arch.studentId);
    if (arch.fullName && arch.fatherName) {
      archivedNames.add(`${arch.fullName.trim().toLowerCase()}::${arch.fatherName.trim().toLowerCase()}`);
    }
  });

  console.log('Archived Ids has BSP-26-664?', archivedIds.has('BSP-26-664'));
  console.log('Archived Ids has SGC-26-1272?', archivedIds.has('SGC-26-1272'));
  console.log('Archived Ids has BSP-26-647?', archivedIds.has('BSP-26-647'));
  console.log('Is areeba arshad::arshad ali in archivedNames?', archivedNames.has('areeba arshad::arshad ali'));

  const activeStudentsData = studentsData.filter(s => {
    if (s.status === 'archived' || s.status === 'Deleted') return false;
    if (archivedIds.has(s.id) || (s.admission_id && archivedIds.has(s.admission_id))) return false;
    if (s.full_name && s.father_name && archivedNames.has(`${s.full_name.trim().toLowerCase()}::${s.father_name.trim().toLowerCase()}`)) return false;
    return true;
  });

  const areebas = activeStudentsData.filter(s => (s.full_name || '').toLowerCase().includes('areeba arshad'));
  console.log('Active areebas after useSupabaseData filter:', areebas.map(s => ({
    id: s.id,
    name: s.full_name,
    roll: s.college_no,
    sec: s.section,
    sess: s.session
  })));
}
testExact();
