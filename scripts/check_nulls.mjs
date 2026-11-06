import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf8');
let url = '', key = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const client = createClient(url, key);
async function run() {
  const { data, error } = await client.from('students').select('*').limit(5);
  if (error) console.error('Error fetching students:', error);
  else {
    console.log('Sample student keys:', Object.keys(data[0] || {}));
    const nullFather = await client.from('students').select('id, full_name, father_name').or('father_name.is.null');
    console.log('Null father_name count:', nullFather.data?.length, nullFather.error);
    if (nullFather.data?.length) {
      console.log('Samples:', nullFather.data.slice(0, 5));
    }
  }
}
run();
