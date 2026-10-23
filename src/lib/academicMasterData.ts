// Canonical session normalization and academic master data helpers
export const CANONICAL_SESSIONS: string[] = [
  '2026-28',
  '2025-27',
  '2024-26',
  '2026-30',
  '2025-29',
  '2026-27',
  '2025-26',
];

export function normalizeSessionString(raw?: string | null): string {
  if (!raw) return '2026-28';
  const s = String(raw).trim();
  const match = s.match(/^(\d{4})\s*[-/]\s*(\d{2,4})$/);
  if (match) {
    const startYear = match[1];
    const endPart = match[2].length === 4 ? match[2].slice(2) : match[2];
    return `${startYear}-${endPart}`;
  }
  return s;
}

export function getProgramSessions(programType?: string): string[] {
  const p = (programType || '').toLowerCase();
  if (p.includes('bs') || p.includes('bachelor')) {
    return ['2026-30', '2025-29', '2024-28', '2026-28'];
  }
  if (p.includes('dit') || p.includes('uk') || p.includes('diploma')) {
    return ['2026-27', '2026-28', '2025-26', '2025-27'];
  }
  return ['2026-28', '2025-27', '2024-26'];
}
