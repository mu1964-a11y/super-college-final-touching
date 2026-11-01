const fs = require('fs');

async function testAllot() {
  const { createClient } = await import('@supabase/supabase-js');
  const env = fs.readFileSync('.env', 'utf8');
  const url = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)[1].trim();
  const key = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)[1].trim();
  const supabase = createClient(url, key);

  const { data: students } = await supabase
    .from('students')
    .select('id, college_no, full_name, section, category, session, created_at')
    .order('section', { ascending: true })
    .order('id', { ascending: true });

  const sections = {};
  students.forEach(s => {
    if (!sections[s.section]) sections[s.section] = [];
    sections[s.section].push(s);
  });

  const updates = [];

  for (const [sec, list] of Object.entries(sections)) {
    const existingRolls = new Set(
      list.filter(s => s.college_no).map(s => parseInt(String(s.college_no).replace(/\D/g, ''), 10)).filter(n => !isNaN(n))
    );

    let maxExisting = existingRolls.size > 0 ? Math.max(...existingRolls) : 0;
    let nextRoll = 1;

    list.forEach(s => {
      if (!s.college_no || String(s.college_no).trim() === '') {
        // If some already have numbers in this section, continue from maxExisting + 1
        if (existingRolls.size > 0) {
          maxExisting++;
          updates.push({ id: s.id, name: s.full_name, section: sec, allotted_roll: String(maxExisting) });
        } else {
          // All students in section are fresh, allot 1, 2, 3...
          updates.push({ id: s.id, name: s.full_name, section: sec, allotted_roll: String(nextRoll++) });
        }
      }
    });
  }

  console.log('Total students to allot roll numbers:', updates.length);
  console.log('Sample allotments:');
  console.log(updates.slice(0, 10));
  console.log('Sample ICS3-G2 allotments:');
  console.log(updates.filter(u => u.section.includes('ICS3-G2')));
}

testAllot();
