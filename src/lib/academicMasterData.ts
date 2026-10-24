// Canonical session normalization and academic master data helpers
export const CANONICAL_SESSIONS: string[] = [
  '2026-28',
  '2025-27',
  '2024-26',
  '2026-30',
  '2025-29',
  '2024-28',
  '2023-27',
  '2026-27',
  '2025-26',
  '2027-29',
  '2027-31',
];

export type EducationalStream = 'fsc' | 'bs' | 'ads' | 'dit' | 'ukl3';

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
    return ['2026-30', '2025-29', '2024-28', '2023-27', '2024-26', '2026-28'];
  }
  if (p.includes('ads') || p.includes('adp') || p.includes('ada')) {
    return ['2026-28', '2025-27', '2024-26'];
  }
  if (p.includes('dit') || p.includes('diploma')) {
    return ['2026-27', '2026-28', '2025-26', '2025-27'];
  }
  if (p.includes('uk') || p.includes('level 3') || p.includes('ukl3')) {
    return ['2026-28', '2026-27', '2025-27', '2025-26'];
  }
  return ['2026-28', '2025-27', '2024-26'];
}

/**
 * Single source of truth for classifying any Student or Admission record
 * into one of the 5 educational streams: 'fsc' | 'bs' | 'ads' | 'dit' | 'ukl3'
 */
export function detectEducationalStream(record: any): EducationalStream {
  if (!record) return 'fsc';
  const g = String(record.group || record.groupName || record.group_name || '').toLowerCase();
  const c = String(record.category || record.currentClass || record.current_class || '').toLowerCase();
  const p = String(record.program || '').toLowerCase();
  const combined = `${g} ${c} ${p}`;

  if (
    combined.includes('ads') ||
    combined.includes('adp') ||
    combined.includes('ada') ||
    combined.includes('associate degree')
  ) {
    return 'ads';
  }

  if (
    combined.includes('dit') ||
    combined.includes('d.i.t') ||
    combined.includes('diploma in it') ||
    combined.includes('diploma in information')
  ) {
    return 'dit';
  }

  if (
    combined.includes('ukl3') ||
    combined.includes('uk l3') ||
    combined.includes('uk level') ||
    combined.includes('u.k. level') ||
    combined.includes('level 3') ||
    combined.includes('pearson')
  ) {
    return 'ukl3';
  }

  if (
    /\bbs\b/.test(combined) ||
    combined.includes('b.s') ||
    combined.includes('bscs') ||
    combined.includes('bsit') ||
    combined.includes('bsse') ||
    combined.includes('bba') ||
    combined.includes('bachelor') ||
    combined.includes('bs ')
  ) {
    return 'bs';
  }

  return 'fsc';
}

/**
 * Matches whether a Student or Admission record belongs to the requested stream filter
 */
export function matchesEducationalStream(record: any, streamFilter?: string | null): boolean {
  if (!streamFilter || streamFilter === 'all') return true;
  const f = streamFilter.toLowerCase().trim();
  const detected = detectEducationalStream(record);

  if (f === 'fsc' || f === 'inter' || f === 'intermediate') return detected === 'fsc';
  if (f === 'bs' || f.includes('b.s') || f === 'degree') return detected === 'bs';
  if (f === 'ads' || f === 'adp' || f === 'ada') return detected === 'ads';
  if (f === 'dit' || f.includes('diploma')) return detected === 'dit';
  if (f === 'ukl3' || f.includes('uk') || f.includes('level 3')) return detected === 'ukl3';

  const combined = `${record?.group || ''} ${record?.category || ''}`.toLowerCase();
  return combined.includes(f);
}

/**
 * Unified stage / cohort filter matcher across Inter, BS, ADS, DIT, and UKL3
 */
export function matchesCohortStage(record: any, stageFilter?: string | null): boolean {
  if (!stageFilter || stageFilter === 'all') return true;
  const f = stageFilter.toLowerCase().trim();
  const stream = detectEducationalStream(record);
  const g = String(record?.group || record?.groupName || '').toLowerCase();
  const c = String(record?.category || record?.currentClass || '').toLowerCase();
  const part = String(record?.academicPart || record?.academic_part || '').toLowerCase();
  const sem = Number(record?.currentSemester ?? record?.current_semester ?? 0);
  const sessNorm = normalizeSessionString(record?.session);
  const isMale = record?.gender === 'Male';
  const isFemale = record?.gender === 'Female';

  const isPart2Inter =
    part.includes('part-2') ||
    part.includes('2nd') ||
    c.includes('part-2') ||
    c.includes('part 2') ||
    c.includes('2nd year') ||
    g.includes('part-2') ||
    g.includes('part 2') ||
    sessNorm === '2025-27';

  // Inter stages
  if (f === 'part1' || f === 'inter-p1') return stream === 'fsc' && !isPart2Inter;
  if (f === 'part2' || f === 'inter-p2') return stream === 'fsc' && isPart2Inter;
  if (f === 'p1-boys') return stream === 'fsc' && !isPart2Inter && isMale;
  if (f === 'p1-girls') return stream === 'fsc' && !isPart2Inter && isFemale;
  if (f === 'p2-boys') return stream === 'fsc' && isPart2Inter && isMale;
  if (f === 'p2-girls') return stream === 'fsc' && isPart2Inter && isFemale;

  // BS stages
  if (f === 'bs-boys') return stream === 'bs' && isMale;
  if (f === 'bs-girls') return stream === 'bs' && isFemale;
  if (f === 'bs-sem1') return stream === 'bs' && (sem === 1 || c.includes('1st') || c.includes('fresh') || (!sem && !c.includes('2nd') && !c.includes('3rd') && !c.includes('4th') && !c.includes('5th') && !c.includes('6th') && !c.includes('7th') && !c.includes('8th')));
  if (f === 'bs-sem5') return stream === 'bs' && (sem === 5 || c.includes('5th') || c.includes('lateral'));
  if (f === 'bs-sem7-8') return stream === 'bs' && (sem === 7 || sem === 8 || c.includes('7th') || c.includes('8th') || c.includes('final'));
  if (f.startsWith('sem')) {
    const targetSem = Number(f.replace('sem', ''));
    const ord = targetSem === 1 ? '1st' : targetSem === 2 ? '2nd' : targetSem === 3 ? '3rd' : `${targetSem}th`;
    return (
      sem === targetSem ||
      c.includes(`semester ${ord}`) ||
      c.includes(`sem ${targetSem}`) ||
      (targetSem === 1 && stream === 'bs' && !sem && (c.includes('boys') || c.includes('girls') || c.includes('1st')))
    );
  }

  // ADS stages
  if (f === 'ads-boys') return stream === 'ads' && isMale;
  if (f === 'ads-girls') return stream === 'ads' && isFemale;
  if (f === 'ads-p1') return stream === 'ads' && (sem <= 2 && !part.includes('part-2') && !c.includes('3rd') && !c.includes('4th'));
  if (f === 'ads-p2') return stream === 'ads' && (sem > 2 || part.includes('part-2') || c.includes('3rd') || c.includes('4th'));

  // DIT stages (Part-1 / 1st Year, Part-2 / 2nd Year, Boys, Girls)
  const isDitPart2 = part.includes('part-2') || part.includes('2nd') || c.includes('part-2') || c.includes('part 2') || c.includes('2nd') || sem >= 3;
  if (f === 'dit-boys') return stream === 'dit' && isMale;
  if (f === 'dit-girls') return stream === 'dit' && isFemale;
  if (f === 'dit-p1' || f === 'yr1') return (stream === 'dit' || stream === 'ukl3') ? !isDitPart2 : (sem <= 2 || part.includes('part-1') || part.includes('1st'));
  if (f === 'dit-p2' || f === 'yr2') return (stream === 'dit' || stream === 'ukl3') ? isDitPart2 : ((sem >= 3 && sem <= 4) || part.includes('part-2') || part.includes('2nd'));
  if (f === 'yr3') return sem >= 5 || part.includes('part-3') || part.includes('3rd');

  // UKL3 stages (Year-1, Year-2, Boys, Girls)
  const isUkYear2 = part.includes('part-2') || part.includes('2nd') || c.includes('year-2') || c.includes('year 2') || c.includes('2nd') || sem >= 2;
  if (f === 'ukl3-boys') return stream === 'ukl3' && isMale;
  if (f === 'ukl3-girls') return stream === 'ukl3' && isFemale;
  if (f === 'ukl3-y1') return stream === 'ukl3' && !isUkYear2;
  if (f === 'ukl3-y2') return stream === 'ukl3' && isUkYear2;

  return true;
}
