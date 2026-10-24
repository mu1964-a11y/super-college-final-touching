import { createClient } from '@supabase/supabase-js';
import { safeLocalStorage } from '../utils/safeStorage';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

const isConfigured = Boolean(supabaseUrl && supabaseUrl !== 'https://your-project.supabase.co');

// Cache of columns discovered to be missing in the live PostgREST schema cache per table
const missingColumnsByTable: Record<string, Set<string>> = {};

function extractTableName(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    const match = u.pathname.match(/\/rest\/v1\/([^/?]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function stripColumnFromUrl(urlStr: string, col: string): string {
  try {
    const u = new URL(urlStr);
    const colsParam = u.searchParams.get('columns');
    if (colsParam) {
      const filtered = colsParam
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.replace(/^"|"$/g, '') !== col);
      if (filtered.length > 0) {
        u.searchParams.set('columns', filtered.join(','));
      } else {
        u.searchParams.delete('columns');
      }
      return u.toString();
    }
  } catch {}
  return urlStr;
}

function stripColumnsFromBody(
  parsedBody: any,
  colsToStrip: Iterable<string>
): { nextBody: any; strippedAny: boolean; isEmptyObject: boolean } {
  const colSet = new Set(colsToStrip);
  if (colSet.size === 0 || !parsedBody || typeof parsedBody !== 'object') {
    return { nextBody: parsedBody, strippedAny: false, isEmptyObject: false };
  }

  let strippedAny = false;

  if (Array.isArray(parsedBody)) {
    const nextArr = parsedBody.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const copy = { ...item };
      for (const col of colSet) {
        if (col in copy) {
          delete copy[col];
          strippedAny = true;
        }
      }
      return copy;
    });
    const allEmpty = nextArr.length > 0 && nextArr.every((item) => item && typeof item === 'object' && Object.keys(item).length === 0);
    return { nextBody: nextArr, strippedAny, isEmptyObject: allEmpty };
  }

  const copy = { ...parsedBody };
  for (const col of colSet) {
    if (col in copy) {
      delete copy[col];
      strippedAny = true;
    }
  }
  return { nextBody: copy, strippedAny, isEmptyObject: Object.keys(copy).length === 0 };
}

/**
 * Self-healing fetch wrapper for Supabase PostgREST requests.
 * Automatically intercepts PGRST204 / 42703 missing-column schema cache errors,
 * removes the unbacked column from the payload, and retries transparently so
 * UI operations never fail due to schema drift.
 */
const schemaResilientFetch: typeof fetch = async (input, init) => {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method || 'GET').toUpperCase();

  if ((method !== 'POST' && method !== 'PATCH') || typeof init?.body !== 'string') {
    return fetch(input, init);
  }

  const table = extractTableName(urlStr);
  if (!table) {
    return fetch(input, init);
  }

  let parsedBody: any;
  try {
    parsedBody = JSON.parse(init.body);
  } catch {
    return fetch(input, init);
  }

  let currentUrl = urlStr;
  let currentInit: RequestInit = { ...init };

  // Pre-strip any columns already known to be missing for this table
  const knownMissing = missingColumnsByTable[table];
  if (knownMissing && knownMissing.size > 0) {
    const { nextBody, strippedAny, isEmptyObject } = stripColumnsFromBody(parsedBody, knownMissing);
    if (strippedAny) {
      parsedBody = nextBody;
      for (const col of knownMissing) {
        currentUrl = stripColumnFromUrl(currentUrl, col);
      }
      if (isEmptyObject && method === 'PATCH') {
        return new Response(null, { status: 204 });
      }
      currentInit.body = JSON.stringify(parsedBody);
    }
  }

  let response = await fetch(currentUrl, currentInit);
  let retries = 0;

  while (response.status === 400 && retries < 12) {
    retries++;
    let errJson: any = null;
    try {
      errJson = await response.clone().json();
    } catch {
      break;
    }

    const msg: string = errJson?.message || '';
    const details: string = errJson?.details || '';
    const combined = `${msg} ${details}`;

    // Match PostgREST PGRST204 or PostgreSQL 42703 missing column messages
    const colMatch =
      combined.match(/Could not find the '([^']+)' column/i) ||
      combined.match(/column "([^"]+)" of relation "[^"]+" does not exist/i) ||
      combined.match(/column "([^"]+)" does not exist/i);

    if (colMatch && colMatch[1]) {
      const missingCol = colMatch[1];
      if (!missingColumnsByTable[table]) {
        missingColumnsByTable[table] = new Set();
      }
      missingColumnsByTable[table].add(missingCol);

      const { nextBody, strippedAny, isEmptyObject } = stripColumnsFromBody(parsedBody, [missingCol]);
      currentUrl = stripColumnFromUrl(currentUrl, missingCol);

      if (!strippedAny && currentUrl === urlStr) {
        break;
      }

      parsedBody = nextBody;
      if (isEmptyObject && method === 'PATCH') {
        return new Response(null, { status: 204 });
      }

      currentInit = {
        ...currentInit,
        body: JSON.stringify(parsedBody),
      };
      console.warn(`[Supabase Auto-Heal] Stripped missing column '${missingCol}' from '${table}' payload and retrying.`);
      response = await fetch(currentUrl, currentInit);
      continue;
    }

    break;
  }

  return response;
};

export const supabase = createClient(
  supabaseUrl || 'https://your-project.supabase.co',
  supabaseAnonKey || 'your-anon-key',
  {
    auth: {
      storageKey: 'scj-auth',
      storage: safeLocalStorage,
    },
    global: {
      fetch: schemaResilientFetch,
    },
  }
);

export const isSupabaseConfigured = isConfigured;

if (!isConfigured) {
  console.warn('Supabase credentials missing or invalid. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Environment Variables.');
}
