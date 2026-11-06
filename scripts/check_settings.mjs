import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function checkSettings() {
  const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  if (error) console.error(error);
  console.log('Settings keys:', Object.keys(data || {}));
  console.log('academic_session:', data?.academic_session);
  console.log('predefined_sections count:', data?.predefined_sections?.length || data?.predefinedSections?.length);
  const sections = data?.predefined_sections || data?.predefinedSections;
  console.log('predefinedSections sample:', sections?.slice(0, 5));
}

checkSettings();
