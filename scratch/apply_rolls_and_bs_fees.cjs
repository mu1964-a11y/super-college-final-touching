const fs = require('fs');

async function applyUpdates() {
  const { createClient } = await import('@supabase/supabase-js');
  const env = fs.readFileSync('.env', 'utf8');
  const url = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)[1].trim();
  const key = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)[1].trim();
  const supabase = createClient(url, key);

  console.log('=== PART 1: ALLOTTING ROLL NUMBERS ===');
  const { data: allStudents, error: fetchErr } = await supabase
    .from('students')
    .select('id, college_no, full_name, section, category, session, created_at')
    .order('section', { ascending: true })
    .order('id', { ascending: true });

  if (fetchErr) {
    console.error('Error fetching students:', fetchErr);
    return;
  }

  const sections = {};
  allStudents.forEach(s => {
    if (!sections[s.section]) sections[s.section] = [];
    sections[s.section].push(s);
  });

  const rollUpdates = [];
  for (const [sec, list] of Object.entries(sections)) {
    const existingRolls = new Set(
      list.filter(s => s.college_no).map(s => parseInt(String(s.college_no).replace(/\D/g, ''), 10)).filter(n => !isNaN(n))
    );

    let maxExisting = existingRolls.size > 0 ? Math.max(...existingRolls) : 0;
    let nextRoll = 1;

    list.forEach(s => {
      if (!s.college_no || String(s.college_no).trim() === '') {
        if (existingRolls.size > 0) {
          maxExisting++;
          rollUpdates.push({ id: s.id, college_no: String(maxExisting) });
        } else {
          rollUpdates.push({ id: s.id, college_no: String(nextRoll++) });
        }
      }
    });
  }

  console.log(`Updating ${rollUpdates.length} missing roll numbers in Supabase...`);
  // Batch update roll numbers
  const batchSize = 50;
  for (let i = 0; i < rollUpdates.length; i += batchSize) {
    const chunk = rollUpdates.slice(i, i + batchSize);
    for (const item of chunk) {
      await supabase.from('students').update({ college_no: item.college_no }).eq('id', item.id);
    }
    console.log(`  Processed roll numbers ${Math.min(i + batchSize, rollUpdates.length)} / ${rollUpdates.length}`);
  }
  console.log('✓ Roll numbers successfully allotted to all students!');

  console.log('\n=== PART 2: UPDATING BS FEE PACKAGES & PREVIOUS SEMESTER PAYMENTS ===');
  const smartMatched = JSON.parse(fs.readFileSync('scratch/smart_matched_bs_fees.json', 'utf8'));
  const matchedMap = new Map(smartMatched.map(m => [m.id, m]));

  const { data: bsStudents } = await supabase
    .from('students')
    .select('id, full_name, father_name, college_no, section, session, category, total_package, fee_received, fee_ledger')
    .ilike('category', '%BS%');

  let updatedBsCount = 0;
  for (const s of bsStudents) {
    const match = matchedMap.get(s.id);
    if (match) {
      // Update with exact matched sheet record
      await supabase.from('students').update({
        total_package: match.total_package,
        fee_received: match.fee_received,
        fee_ledger: match.fee_ledger
      }).eq('id', s.id);
      updatedBsCount++;
    } else {
      // If student had 0 package, assign standard BS Semester package (30,000)
      if ((s.total_package || 0) === 0) {
        const pkg = 30000;
        const rec = s.fee_received || 0;
        await supabase.from('students').update({
          total_package: pkg,
          fee_received: rec,
          fee_ledger: {
            totalPackage: pkg,
            totalReceived: rec,
            remainingBalance: Math.max(0, pkg - rec),
            transactions: rec > 0 ? [{
              id: `tx-init-${s.id}`,
              date: new Date().toISOString().split('T')[0],
              amount: rec,
              description: 'Previous Semester Clearance',
              paymentMethod: 'Cash',
              receiptId: `REC-${s.id}`
            }] : [],
            installments: []
          }
        }).eq('id', s.id);
        updatedBsCount++;
      }
    }
  }

  console.log(`✓ Updated fee packages & ledgers for ${updatedBsCount} / ${bsStudents.length} BS students!`);
}

applyUpdates().catch(console.error);
