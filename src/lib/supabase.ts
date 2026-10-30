import { createClient } from '@supabase/supabase-js';
import { safeLocalStorage } from '../utils/safeStorage';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://wgjkodcggpklxqcpnjhu.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseUrl !== 'https://your-project.supabase.co');

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'your-anon-key',
  {
    auth: {
      storageKey: 'scj-auth',
      storage: safeLocalStorage,
    }
  }
);

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials missing or invalid.');
}
