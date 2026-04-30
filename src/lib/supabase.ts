import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Use placeholders to prevent hard crash if keys are missing
// The actual error "supabaseUrl is required" happens when passing empty string to createClient
export const supabase = createClient(
  supabaseUrl || 'https://your-project.supabase.co',
  supabaseAnonKey || 'your-anon-key',
  {
    auth: {
      storageKey: 'scj-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  }
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. App UI will load but data fetching will fail. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Environment Variables.');
}
