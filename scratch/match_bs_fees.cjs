const fs = require('fs');

async function run() {
  const { createClient } = await import('@supabase/supabase-js');
  const env = fs.readFileSync('.env', 'utf8');
  const url = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)[1].trim();
  const key = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)[1].trim();
  const supabase = createClient(url, key);

  const extracted = JSON.parse(fs.readFileSync('scratch/extracted_bs_fees.json', 'utf8'));

  const { data: bsStudents } = await supabase
    .from('students')
    .select('id, full_name, father_name, college_no, section, session, category')
    .ilike('category', '%BS%');

  console.log('Total BS students in Supabase:', bsStudents.length);

  function clean(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  }

  let matchedCount = 0;
  const matches = [];

  bsStudents.forEach(st => {
    const sName = clean(st.full_name);
    const sFName = clean(st.father_name);
    
    // Find in extracted
    const match = extracted.find(ex => {
      const eName = clean(ex.name);
      const eFName = clean(ex.fName);
      if (sName === eName && sFName === eFName) return true;
      if (sName === eName && (sFName.includes(eFName) || eFName.includes(sFName))) return true;
      if (sName.length > 5 && eName.includes(sName) && sFName === eFName) return true;
      return false;
    });

    if (match) {
      matchedCount++;
      matches.push({
        id: st.id,
        full_name: st.full_name,
        father_name: st.father_name,
        college_no: st.college_no,
        section: st.section,
        pkg: match.pkg,
        paid: match.paid,
        rem: match.rem,
        transactionsCount: match.transactions.length,
        transactions: match.transactions
      });
    }
  });

  console.log('Matched BS students with fee records:', matchedCount);
  console.log('Sample matched:', matches.slice(0, 3));
  fs.writeFileSync('scratch/matched_bs_fees.json', JSON.stringify(matches, null, 2));
}

run();
