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

  console.log('Total BS students in DB:', bsStudents.length);

  function cleanWords(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/\b(muhammad|mohammad|md|m|hafiz|syed|choudhary|ch|rana|babu|sheikh|malik)\b/g, '')
      .replace(/arshid/g, 'arshad')
      .replace(/rehman/g, 'rahman')
      .replace(/hussan/g, 'hussain')
      .replace(/watto/g, '')
      .replace(/randhawa/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  let matchedCount = 0;
  const updates = [];

  bsStudents.forEach(st => {
    const sName = cleanWords(st.full_name);
    const sFName = cleanWords(st.father_name);

    let match = extracted.find(ex => {
      const eName = cleanWords(ex.name);
      const eFName = cleanWords(ex.fName);
      if (sName === eName && sFName === eFName) return true;
      if (sName === eName && (sFName.includes(eFName) || eFName.includes(sFName))) return true;
      return false;
    });

    if (!match) {
      // Partial match on name if father name matches exactly
      match = extracted.find(ex => {
        const eName = cleanWords(ex.name);
        const eFName = cleanWords(ex.fName);
        if (sFName === eFName && (sName.includes(eName) || eName.includes(sName))) return true;
        return false;
      });
    }

    if (match) {
      matchedCount++;
      updates.push({
        id: st.id,
        full_name: st.full_name,
        father_name: st.father_name,
        college_no: st.college_no,
        section: st.section,
        total_package: match.pkg,
        fee_received: match.paid,
        fee_ledger: {
          totalPackage: match.pkg,
          totalReceived: match.paid,
          remainingBalance: Math.max(0, match.pkg - match.paid),
          transactions: match.transactions.map((t, idx) => ({
            id: `tx-bs-${st.id}-${idx + 1}`,
            date: t.receipt && t.receipt.includes('/') ? t.receipt.split('/')[1] : new Date().toISOString().split('T')[0],
            amount: t.amount,
            description: t.description,
            paymentMethod: 'Cash',
            receiptId: t.receipt || `REC-BS-${idx + 1}`
          })),
          installments: []
        }
      });
    }
  });

  console.log(`Smart matched BS students: ${matchedCount} / ${bsStudents.length}`);
  fs.writeFileSync('scratch/smart_matched_bs_fees.json', JSON.stringify(updates, null, 2));
}

run();
