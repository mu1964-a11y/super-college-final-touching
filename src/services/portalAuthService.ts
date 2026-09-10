import { safeLocalStorage } from '../utils/safeStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface PortalAccount {
  id: string; // student or staff id
  type: 'student' | 'staff';
  identifier: string; // rollNo, collegeNo, or staffId
  fullName: string;
  contact: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'scj_portal_accounts_registry';

/**
 * Loads all locally stored portal accounts
 */
export function getRegisteredPortalAccounts(): PortalAccount[] {
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse registered portal accounts', e);
    return [];
  }
}

/**
 * Saves a registered portal account
 */
export function savePortalAccount(account: Omit<PortalAccount, 'createdAt' | 'updatedAt'> & { createdAt?: string }): PortalAccount {
  const accounts = getRegisteredPortalAccounts();
  const now = new Date().toISOString();
  
  const existingIndex = accounts.findIndex(
    (a) => a.id === account.id && a.type === account.type
  );

  const fullAccount: PortalAccount = {
    ...account,
    createdAt: account.createdAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    accounts[existingIndex] = {
      ...accounts[existingIndex],
      ...fullAccount,
      createdAt: accounts[existingIndex].createdAt,
    };
  } else {
    accounts.push(fullAccount);
  }

  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));

  // Sync to student or staff notes in Supabase if configured so it persists
  syncAccountToSupabase(fullAccount).catch((err) => {
    console.warn('Background sync of portal account to Supabase failed:', err);
  });

  return fullAccount;
}

/**
 * Finds a registered account by student/staff ID or identifier
 */
export function findPortalAccount(idOrIdentifier: string, type: 'student' | 'staff'): PortalAccount | undefined {
  const accounts = getRegisteredPortalAccounts();
  const normalized = (idOrIdentifier || '').toLowerCase().trim();
  return accounts.find(
    (a) => a.type === type && (
      (a.id || '').toLowerCase() === normalized || 
      (a.identifier || '').toLowerCase() === normalized
    )
  );
}

/**
 * Verifies if the provided password matches the registered account
 */
export function verifyPortalAccountPassword(
  idOrIdentifier: string,
  type: 'student' | 'staff',
  passwordAttempt: string
): boolean {
  const account = findPortalAccount(idOrIdentifier, type);
  if (!account || !passwordAttempt) return false;
  return account.passwordHash === passwordAttempt.trim();
}

/**
 * Resets or updates a portal account's password
 */
export function resetPortalAccountPassword(
  idOrIdentifier: string,
  type: 'student' | 'staff',
  newPassword: string
): boolean {
  const accounts = getRegisteredPortalAccounts();
  const normalized = (idOrIdentifier || '').toLowerCase().trim();
  const index = accounts.findIndex(
    (a) => a.type === type && (
      (a.id || '').toLowerCase() === normalized || 
      (a.identifier || '').toLowerCase() === normalized
    )
  );

  if (index === -1) return false;

  accounts[index].passwordHash = newPassword.trim();
  accounts[index].updatedAt = new Date().toISOString();
  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));

  syncAccountToSupabase(accounts[index]).catch(console.warn);
  return true;
}

/**
 * Sync portal password to Supabase user or notes column for persistence
 */
async function syncAccountToSupabase(account: PortalAccount) {
  if (!isSupabaseConfigured) return;

  try {
    const table = account.type === 'student' ? 'students' : 'staff';
    const { data: record, error: fetchErr } = await supabase
      .from(table)
      .select('id, notes')
      .eq('id', account.id)
      .maybeSingle();

    if (fetchErr || !record) return;

    let existingNotes: any[] = [];
    if (Array.isArray(record.notes)) {
      existingNotes = record.notes;
    } else if (typeof record.notes === 'string') {
      try { existingNotes = JSON.parse(record.notes); } catch {}
    }

    const cleanNotes = existingNotes.filter((n: any) => n?.tag !== 'portal_auth_credential');
    cleanNotes.push({
      tag: 'portal_auth_credential',
      type: account.type,
      passwordHash: account.passwordHash,
      updatedAt: account.updatedAt,
      identifier: account.identifier,
    });

    await supabase
      .from(table)
      .update({ notes: cleanNotes })
      .eq('id', account.id);
  } catch (e) {
    console.warn('Supabase credential sync skipped:', e);
  }
}
