import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function globalSearch() {
  const tables = ['leads', 'admissions', 'students', 'settings', 'staff'];
  for (const table of tables) {
    const { data } = await supabase.from(table).select('*');
    if (data) {
      for (const row of data) {
        const jsonStr = JSON.stringify(row);
        if (jsonStr.includes('2026-202') || jsonStr.includes('2026-2')) {
          if (!jsonStr.includes('2026-28')) { // Filter out the valid one
             console.log(`Found string in ${table} ID: ${row.id}`, jsonStr.match(/.{0,20}2026-20.{0,20}/g));
          }
           // actually just print whatever doesn't perfectly match
           const matches = jsonStr.match(/2026-202[0-9]*/g);
           if (matches && matches.some(m => m !== '2026-20' && m !== '2026-28' && m !== '2026-2026')) {
              console.log(`Table ${table} row ${row.id} has matches:`, matches);
           }
        }
      }
    }
  }
  
  // Extra specific check for any 2026-2028
  for (const table of tables) {
    const { data } = await supabase.from(table).select('*');
    if (data) {
      for (const row of data) {
        if (JSON.stringify(row).includes('2026-2028')) {
           console.log(`EXACT 2026-2028 in ${table} row ${row.id}`);
           if (table === 'admissions' && row.session === '2026-2028') {
              console.log('It is in session column!');
           }
        }
        if (JSON.stringify(row).includes('2026-202')) {
           console.log(`EXACT 2026-202 in ${table} row ${row.id}`);
        }
      }
    }
  }
}

globalSearch().then(() => console.log('Done searching'));
