import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function testSingleUpdate() {
  const { data: s } = await supabase.from('students').select('*').limit(1).single();
  console.log('Testing update on student:', s.id, s.full_name);
  const { error } = await supabase.from('students').update({
    section: s.section,
    total_package: s.total_package,
    fee_received: s.fee_received
  }).eq('id', s.id);
  console.log('Update result error:', error?.message || 'SUCCESS');
}

testSingleUpdate();
