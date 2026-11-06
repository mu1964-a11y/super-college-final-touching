import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function checkConfig() {
  const { data } = await supabase.from('settings').select('config').limit(1).maybeSingle();
  const cfg = data?.config || {};
  console.log('Config keys:', Object.keys(cfg));
  console.log('predefinedSections in config:', cfg.predefinedSections?.length);
  console.log('Sample sections:', cfg.predefinedSections?.slice(0, 5));
}

checkConfig();
