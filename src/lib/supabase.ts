import { createClient } from '@supabase/supabase-js';
import { safeLocalStorage } from '../utils/safeStorage';

const rawSupabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://wgjkodcggpklxqcpnjhu.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

const isConfigured = Boolean(rawSupabaseUrl && rawSupabaseUrl !== 'https://your-project.supabase.co');

// Dynamic ISP-Bypass State: If direct connection is blocked in Pakistan, remember and use proxy
let shouldUseProxyTunnel = false;

// Resilient Network Transport:
// In Pakistan, mobile carriers (Jazz, Zong, Telenor) and broadband providers (PTCL) intermittently
// block or throttle Cloudflare edge IPs (*.supabase.co).
// If a direct request fails or stalls for > 4.5s, we seamlessly route it via the portal server proxy (/api/supabase-proxy).
const resilientFetch: typeof fetch = async (input, init) => {
  const urlStr = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
  
  if (urlStr.startsWith(rawSupabaseUrl)) {
    // If we already know direct connection is blocked on this network, route directly through tunnel
    if (shouldUseProxyTunnel && typeof window !== 'undefined') {
      const proxyUrl = urlStr.replace(rawSupabaseUrl, '/api/supabase-proxy');
      return fetch(proxyUrl, init);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      // If caller passed a signal, handle its abort as well
      const callerSignal = init?.signal;
      if (callerSignal) {
        callerSignal.addEventListener('abort', () => controller.abort());
      }

      const response = await fetch(input, {
        ...init,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch {
      // Direct connection failed or timed out (ISP blocked or DNS fail)
      shouldUseProxyTunnel = true;
      if (typeof window !== 'undefined') {
        const proxyUrl = urlStr.replace(rawSupabaseUrl, '/api/supabase-proxy');
        return fetch(proxyUrl, init);
      }
      throw new Error(`Direct connection to Supabase failed on this network.`);
    }
  }

  return fetch(input, init);
};

export const supabase = createClient(
  rawSupabaseUrl,
  supabaseAnonKey || 'your-anon-key',
  {
    auth: {
      storageKey: 'scj-auth',
      storage: safeLocalStorage,
    },
    global: {
      fetch: resilientFetch
    }
  }
);

export const isSupabaseConfigured = isConfigured;

if (!isConfigured) {
  console.warn('Supabase credentials missing or invalid.');
}
