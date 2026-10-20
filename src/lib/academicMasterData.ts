/**
 * Centralized Academic Master Data Source for Superior Group of Colleges
 * Single Source of Truth for:
 * - Educational Programs (Intermediate, BS 4-Year & Lateral, DIT, UK Level 3)
 * - Academic Groups & Curricula (Pre-Medical, Pre-Engineering, ICS, I.Com, BS Zoology, BS English, BSCS, etc.)
 * - Categories & Part / Semester Number Mappings
 * - Academic Sessions & Session Normalization
 * - Sections & Campus Alignments
 */

export interface MasterProgram {
  id: 'inter' | 'bs' | 'dit' | 'ukl3';
  code: string;
  name: string;
  shortName: string;
  durationYears: number;
  durationSemesters?: number;
  type: 'Yearly' | 'Semester';
  defaultSession: string;
  validSessions: string[];
  boardOrUniversity: string;
  highlights: string[];
}

export interface MasterAcademicGroup {
  id: string;
  name: string;
  programId: 'inter' | 'bs' | 'dit' | 'ukl3';
  type: 'Intermediate' | 'Degree' | 'Diploma' | 'Vocational';
  subjects: string[];
  aliases: string[];
}

export interface MasterCategory {
  id: string;
  name: string;
  programId: 'inter' | 'bs' | 'dit' | 'ukl3';
  academicPart: 'Part-1' | 'Part-2';
  semesterNumber: number;
  gender?: 'Male' | 'Female' | 'Co-ed';
  label: string;
}

export const MASTER_PROGRAMS: Record<'inter' | 'bs' | 'dit' | 'ukl3', MasterProgram> = {
  inter: {
    id: 'inter',
    code: 'INTER',
    name: 'Intermediate (F.Sc / ICS / I.Com / FA)',
    shortName: 'Intermediate HSSC',
    durationYears: 2,
    type: 'Yearly',
    defaultSession: '2026-28',
    validSessions: ['2026-28', '2025-2027', '2024-2026', '2023-2025'],
    boardOrUniversity: 'BISE Multan Board',
    highlights: ['2-Year Higher Secondary Certificate', 'Tailored for Matric (10th) graduates', 'Board subjects & monthly installments']
  },
  bs: {
    id: 'bs',
    code: 'BS',
    name: 'BS 4-Year Degree & ADP Lateral',
    shortName: 'BS Degree & ADP',
    durationYears: 4,
    durationSemesters: 8,
    type: 'Semester',
    defaultSession: '2026-30',
    validSessions: ['2026-30', '2025-29', '2024-28', '2024-26', '2023-27'],
    boardOrUniversity: 'HEC Recognized University Degree',
    highlights: ['Semester system (Semesters 1–8)', 'Direct 5th semester ADP Lateral entry', 'University syllabus & semester fee plans']
  },
  dit: {
    id: 'dit',
    code: 'DIT',
    name: 'D.I.T. (Diploma in Information Technology)',
    shortName: 'D.I.T. Diploma',
    durationYears: 1,
    durationSemesters: 4,
    type: 'Semester',
    defaultSession: '2026-27',
    validSessions: ['2026-27', '2025-26', '2024-25'],
    boardOrUniversity: 'PBTE Technical Board Lahore',
    highlights: ['1 to 2 Years professional technical diploma', 'Office automation, web dev, graphics & networking', 'PBTE certified examinations']
  },
  ukl3: {
    id: 'ukl3',
    code: 'UKL3',
    name: 'U.K. Level 3 International Diploma',
    shortName: 'UK Level 3',
    durationYears: 2,
    durationSemesters: 4,
    type: 'Semester',
    defaultSession: '2026-28',
    validSessions: ['2026-28', '2025-27'],
    boardOrUniversity: 'Pearson / OTHM Qualifications UK',
    highlights: ['Globally recognized international diploma', 'Direct progression pathway to foreign universities', 'Business & Information Technology']
  }
};

export const MASTER_ACADEMIC_GROUPS: MasterAcademicGroup[] = [
  // INTERMEDIATE GROUPS
  {
    id: 'fsc-med',
    name: 'FSC (Premedical)',
    programId: 'inter',
    type: 'Intermediate',
    subjects: ['Biology', 'Physics', 'Chemistry'],
    aliases: ['fsc premedical', 'premedical', 'pre-medical', 'premed', 'fsc pre medical', 'fsc (premedical)', 'medical', 'f.sc pre medical', 'fsc medical']
  },
  {
    id: 'fsc-eng',
    name: 'FSC (Pre Engineering)',
    programId: 'inter',
    type: 'Intermediate',
    subjects: ['Math', 'Physics', 'Chemistry'],
    aliases: ['fsc pre engineering', 'pre engineering', 'pre-engineering', 'preeng', 'engineering', 'fsc (pre engineering)', 'f.sc pre engineering', 'fsc engineering', 'pre-eng']
  },
  {
    id: 'ics-phy',
    name: 'General Science (Phy, Math, CS)',
    programId: 'inter',
    type: 'Intermediate',
    subjects: ['Physics', 'Math', 'Computer Science'],
    aliases: ['ics physics', 'ics phy', 'ics', 'general science (phy, math, cs)', 'ics (phy)', 'ics computer', 'ics physics math']
  },
  {
    id: 'ics-eco',
    name: 'General Science (Eco, Math, CS)',
    programId: 'inter',
    type: 'Intermediate',
    subjects: ['Economics', 'Math', 'Computer Science'],
    aliases: ['ics economics', 'ics eco', 'general science (eco, math, cs)', 'ics stats', 'ics statistics']
  },
  {
    id: 'humanities-cs',
    name: 'Humanities (Eco, Isl, CS)',
    programId: 'inter',
    type: 'Intermediate',
    subjects: ['Economics', 'Islamic Studies', 'Computer Science'],
    aliases: ['humanities (eco, isl, cs)', 'arts cs', 'fa computer', 'fa cs']
  },
  {
    id: 'humanities-punjabi',
    name: 'Humanities (Eco, Isl, Punjabi)',
    programId: 'inter',
    type: 'Intermediate',
    subjects: ['Economics', 'Islamic Studies', 'Punjabi'],
    aliases: ['humanities (eco, isl, punjabi)', 'fa punjabi', 'arts punjabi']
  },
  {
    id: 'humanities-edu',
    name: 'Humanities (Eco, Isl, Education)',
    programId: 'inter',
    type: 'Intermediate',
    subjects: ['Economics', 'Islamic Studies', 'Education'],
    aliases: ['humanities (eco, isl, education)', 'fa education', 'fa edu', 'arts education']
  },
  {
    id: 'humanities-hp-edu',
    name: 'Humanities (Eco, Isl, H&P Edu)',
    programId: 'inter',
    type: 'Intermediate',
    subjects: ['Economics', 'Islamic Studies', 'Health & Physical Education'],
    aliases: ['humanities (eco, isl, h&p edu)', 'fa physical education', 'fa sports', 'fa hpe']
  },
  {
    id: 'icom',
    name: 'I. Com',
    programId: 'inter',
    type: 'Intermediate',
    subjects: ['Accounting', 'Commerce', 'Economics'],
    aliases: ['i. com', 'icom', 'i.com', 'commerce', 'i com', 'intermediate in commerce']
  },

  // BS DEGREE & ADP LATERAL GROUPS
  {
    id: 'bs-zoology',
    name: 'BS Zoology',
    programId: 'bs',
    type: 'Degree',
    subjects: ['Animal Diversity', 'Cell & Molecular Biology', 'Genetics', 'Animal Physiology', 'Evolution & Ecology'],
    aliases: ['bs zoology', 'zoology', 'bs-zoology', 'b.s zoology', 'bs(zoology)', 'bs_zoology', 'b.s. zoology']
  },
  {
    id: 'bs-english',
    name: 'BS English',
    programId: 'bs',
    type: 'Degree',
    subjects: ['Introduction to Linguistics', 'Classical Literature', 'Academic Writing', 'History of English Literature', 'Phonetics & Phonology'],
    aliases: ['bs english', 'english', 'bs-english', 'b.s english', 'bs english literature', 'bs lit', 'b.s. english', 'bs eng']
  },
  {
    id: 'bs-cs',
    name: 'BS Computer Science (BSCS)',
    programId: 'bs',
    type: 'Degree',
    subjects: ['Programming Fundamentals', 'Data Structures', 'Database Systems', 'Software Engineering', 'Calculus', 'Linear Algebra'],
    aliases: ['bs computer science', 'bscs', 'bs cs', 'computer science', 'bs-cs', 'b.s.c.s', 'bs comp sci', 'bs computer science (bscs)', 'bs-computer-science']
  },
  {
    id: 'bs-it',
    name: 'BS Information Technology (BSIT)',
    programId: 'bs',
    type: 'Degree',
    subjects: ['Web Systems', 'Network Administration', 'Database Management', 'IT Infrastructure', 'Cloud Computing'],
    aliases: ['bs information technology', 'bsit', 'bs it', 'information technology', 'bs-it', 'b.s.i.t', 'bs information technology (bsit)', 'bs-information-technology']
  },
  {
    id: 'bs-physics',
    name: 'BS Physics',
    programId: 'bs',
    type: 'Degree',
    subjects: ['Mechanics & Waves', 'Electromagnetism', 'Quantum Mechanics', 'Thermal Physics', 'Modern Physics', 'Differential Equations'],
    aliases: ['bs physics', 'physics', 'bs-physics', 'b.s physics', 'b.s. physics', 'bs phy']
  },
  {
    id: 'bs-chemistry',
    name: 'BS Chemistry',
    programId: 'bs',
    type: 'Degree',
    subjects: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry', 'Biochemistry'],
    aliases: ['bs chemistry', 'chemistry', 'bs-chemistry', 'b.s chemistry', 'b.s. chemistry', 'bs chem']
  },
  {
    id: 'bs-math',
    name: 'BS Mathematics',
    programId: 'bs',
    type: 'Degree',
    subjects: ['Calculus & Analytic Geometry', 'Linear Algebra', 'Real Analysis', 'Differential Equations', 'Numerical Methods'],
    aliases: ['bs mathematics', 'math', 'maths', 'bs math', 'bs maths', 'bs-math', 'mathematics', 'b.s mathematics']
  },
  {
    id: 'bs-botany',
    name: 'BS Botany',
    programId: 'bs',
    type: 'Degree',
    subjects: ['Plant Diversity', 'Cell Biology & Genetics', 'Plant Physiology', 'Ecology', 'Plant Anatomy'],
    aliases: ['bs botany', 'botany', 'bs-botany', 'b.s botany', 'b.s. botany', 'bs bot']
  },
  {
    id: 'bba',
    name: 'BBA (Bachelor of Business Admin)',
    programId: 'bs',
    type: 'Degree',
    subjects: ['Principles of Management', 'Financial Accounting', 'Marketing Management', 'Business Economics', 'Organizational Behavior'],
    aliases: ['bba', 'bba (bachelor of business admin)', 'business administration', 'bachelor of business administration', 'bba hons', 'b.b.a']
  },
  {
    id: 'bs-general',
    name: 'BS Program',
    programId: 'bs',
    type: 'Degree',
    subjects: ['Core BS Electives', 'Research Methodology'],
    aliases: ['bs program', 'bachelor program', 'bs general']
  },

  // D.I.T. DIPLOMA GROUPS
  {
    id: 'dit-core',
    name: 'DIT',
    programId: 'dit',
    type: 'Diploma',
    subjects: ['Office Automation', 'Web Development', 'Computer Graphics', 'Networking & Hardware'],
    aliases: ['dit', 'diploma in it', 'diploma in information technology', 'd.i.t', 'd.i.t.', 'dit diploma']
  },

  // UK LEVEL 3 GROUPS
  {
    id: 'ukl3-core',
    name: 'UK Level 3',
    programId: 'ukl3',
    type: 'Vocational',
    subjects: ['Applied Science', 'Business Analysis', 'IT Fundamentals', 'Cyber Security'],
    aliases: ['uk level 3', 'ukl3', 'uk level-3', 'uk level 3 diploma', 'u.k. level 3']
  }
];

export const MASTER_CATEGORIES: MasterCategory[] = [
  // Intermediate
  { id: 'cat-inter-p1-boys', name: 'Inter Part-1 Boys', programId: 'inter', academicPart: 'Part-1', semesterNumber: 1, gender: 'Male', label: 'Inter Part-1 Boys' },
  { id: 'cat-inter-p2-boys', name: 'Inter Part-2 Boys', programId: 'inter', academicPart: 'Part-2', semesterNumber: 2, gender: 'Male', label: 'Inter Part-2 Boys' },
  { id: 'cat-inter-p1-girls', name: 'Inter Part-1 Girls', programId: 'inter', academicPart: 'Part-1', semesterNumber: 1, gender: 'Female', label: 'Inter Part-1 Girls' },
  { id: 'cat-inter-p2-girls', name: 'Inter Part-2 Girls', programId: 'inter', academicPart: 'Part-2', semesterNumber: 2, gender: 'Female', label: 'Inter Part-2 Girls' },

  // BS Semesters
  { id: 'cat-bs-s1', name: 'BS Semester 1st (Fresh Intake)', programId: 'bs', academicPart: 'Part-1', semesterNumber: 1, label: 'BS Semester 1st (Fresh Intake)' },
  { id: 'cat-bs-s2', name: 'BS Semester 2nd', programId: 'bs', academicPart: 'Part-1', semesterNumber: 2, label: 'BS Semester 2nd' },
  { id: 'cat-bs-s3', name: 'BS Semester 3rd (2nd Year)', programId: 'bs', academicPart: 'Part-1', semesterNumber: 3, label: 'BS Semester 3rd (2nd Year)' },
  { id: 'cat-bs-s4', name: 'BS Semester 4th', programId: 'bs', academicPart: 'Part-1', semesterNumber: 4, label: 'BS Semester 4th' },
  { id: 'cat-bs-s5', name: 'BS Semester 5th (ADP Lateral Entry)', programId: 'bs', academicPart: 'Part-2', semesterNumber: 5, label: 'BS Semester 5th (ADP Lateral Entry)' },
  { id: 'cat-bs-s6', name: 'BS Semester 6th', programId: 'bs', academicPart: 'Part-2', semesterNumber: 6, label: 'BS Semester 6th' },
  { id: 'cat-bs-s7', name: 'BS Semester 7th (Final Year)', programId: 'bs', academicPart: 'Part-2', semesterNumber: 7, label: 'BS Semester 7th (Final Year)' },
  { id: 'cat-bs-s8', name: 'BS Semester 8th', programId: 'bs', academicPart: 'Part-2', semesterNumber: 8, label: 'BS Semester 8th' },
  { id: 'cat-bs-girls', name: 'BS Girls Campus', programId: 'bs', academicPart: 'Part-1', semesterNumber: 1, gender: 'Female', label: 'BS Girls Campus' },
  { id: 'cat-bs-boys', name: 'BS Boys Campus', programId: 'bs', academicPart: 'Part-1', semesterNumber: 1, gender: 'Male', label: 'BS Boys Campus' },

  // DIT
  { id: 'cat-dit-p1', name: 'DIT Part-1', programId: 'dit', academicPart: 'Part-1', semesterNumber: 1, label: 'DIT Part-1' },
  { id: 'cat-dit-p2', name: 'DIT Part-2', programId: 'dit', academicPart: 'Part-2', semesterNumber: 2, label: 'DIT Part-2' },
  { id: 'cat-dit-boys', name: 'DIT Boys', programId: 'dit', academicPart: 'Part-1', semesterNumber: 1, gender: 'Male', label: 'DIT Boys' },
  { id: 'cat-dit-girls', name: 'DIT Girls', programId: 'dit', academicPart: 'Part-1', semesterNumber: 1, gender: 'Female', label: 'DIT Girls' },

  // UK Level 3
  { id: 'cat-uk-y1', name: 'UK Level 3 Year-1', programId: 'ukl3', academicPart: 'Part-1', semesterNumber: 1, label: 'UK Level 3 Year-1' },
  { id: 'cat-uk-y2', name: 'UK Level 3 Year-2', programId: 'ukl3', academicPart: 'Part-2', semesterNumber: 2, label: 'UK Level 3 Year-2' },
  { id: 'cat-uk-boys', name: 'UK L3 Boys', programId: 'ukl3', academicPart: 'Part-1', semesterNumber: 1, gender: 'Male', label: 'UK L3 Boys' },
  { id: 'cat-uk-girls', name: 'UK L3 Girls', programId: 'ukl3', academicPart: 'Part-1', semesterNumber: 1, gender: 'Female', label: 'UK L3 Girls' }
];

export const MASTER_COMPULSORY_SUBJECTS: Record<'inter' | 'bs' | 'dit' | 'ukl3', string[]> = {
  inter: ['English', 'Urdu', 'Islamic Studies', 'Pakistan Studies', 'Tarjuma-tul-Quran'],
  bs: ['English / Communication', 'Pakistan Studies / Ideology', 'Islamic Studies / Ethics', 'Quran Translation'],
  dit: ['ICT Fundamentals', 'English Communication'],
  ukl3: ['Academic English', 'Applied Research']
};

/**
 * Normalizes input string for fuzzy comparison (lowercase, removes symbols)
 */
export function normalizeKey(str: string): string {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Normalizes session strings (e.g. 2026-2028 -> 2026-28).
 * Never returns 'all', 'ALL BATCHES', or empty.
 */
export function normalizeSessionString(session: string | null | undefined, fallback: string = '2026-28'): string {
  if (!session) return fallback;
  const s = String(session).trim();
  if (!s || s.toLowerCase() === 'all' || s.toLowerCase() === 'all batches') return fallback;
  
  // Convert 4-digit ended sessions like 2026-2028 -> 2026-28
  const match = s.match(/^(\d{4})[-/](\d{4})$/);
  if (match) {
    return `${match[1]}-${match[2].slice(-2)}`;
  }
  return s;
}

/**
 * Resolves an Academic Group from raw text (file header, user input, alias)
 * Strictly matches official group, aliases, or normalized alphanumeric tokens.
 * Returns exact MasterAcademicGroup or null if unknown. Never returns generic fallback unless explicitly given.
 */
export function resolveAcademicGroup(rawInput: string | null | undefined, programHint?: 'inter' | 'bs' | 'dit' | 'ukl3'): MasterAcademicGroup | null {
  if (!rawInput) return null;
  const raw = String(rawInput).trim();
  if (!raw) return null;
  const clean = normalizeKey(raw);

  // 1. Direct name match
  let found = MASTER_ACADEMIC_GROUPS.find(g => {
    if (programHint && g.programId !== programHint) return false;
    return g.name.toLowerCase() === raw.toLowerCase();
  });
  if (found) return found;

  // 2. Direct alias match
  found = MASTER_ACADEMIC_GROUPS.find(g => {
    if (programHint && g.programId !== programHint) return false;
    return g.aliases.some(a => a.toLowerCase() === raw.toLowerCase() || normalizeKey(a) === clean);
  });
  if (found) return found;

  // 3. Normalized token containment check (prioritizing specific subjects like Zoology, English, Physics)
  const candidateList = programHint 
    ? MASTER_ACADEMIC_GROUPS.filter(g => g.programId === programHint)
    : MASTER_ACADEMIC_GROUPS;

  // Check specific BS majors first
  if (clean.includes('zoology')) return candidateList.find(g => g.id === 'bs-zoology') || null;
  if (clean.includes('botany')) return candidateList.find(g => g.id === 'bs-botany') || null;
  if (clean.includes('english') || clean.includes('literature')) return candidateList.find(g => g.id === 'bs-english') || null;
  if (clean.includes('bba') || clean.includes('businessadmin')) return candidateList.find(g => g.id === 'bba') || null;
  if (clean.includes('bscs') || (clean.includes('cs') && clean.includes('bs')) || clean.includes('computerscience')) {
    return candidateList.find(g => g.id === 'bs-cs') || null;
  }
  if (clean.includes('bsit') || (clean.includes('it') && clean.includes('bs')) || clean.includes('informationtechnology')) {
    return candidateList.find(g => g.id === 'bs-it') || null;
  }
  if (clean.includes('physics') && (clean.includes('bs') || programHint === 'bs')) {
    return candidateList.find(g => g.id === 'bs-physics') || null;
  }
  if (clean.includes('chemistry') && (clean.includes('bs') || programHint === 'bs')) {
    return candidateList.find(g => g.id === 'bs-chemistry') || null;
  }
  if (clean.includes('math') && (clean.includes('bs') || programHint === 'bs')) {
    return candidateList.find(g => g.id === 'bs-math') || null;
  }

  // Check Intermediate groups
  if (clean.includes('premed') || clean.includes('premedical') || (clean.includes('medical') && !clean.includes('paramedical'))) {
    return candidateList.find(g => g.id === 'fsc-med') || null;
  }
  if (clean.includes('preeng') || clean.includes('preengineering') || clean.includes('engineering')) {
    return candidateList.find(g => g.id === 'fsc-eng') || null;
  }
  if (clean.includes('icom') || clean.includes('commerce')) {
    return candidateList.find(g => g.id === 'icom') || null;
  }
  if (clean.includes('dit') || clean.includes('diplomait')) {
    return candidateList.find(g => g.id === 'dit-core') || null;
  }
  if (clean.includes('uklevel3') || clean.includes('ukl3')) {
    return candidateList.find(g => g.id === 'ukl3-core') || null;
  }
  if (clean.includes('ics') || clean.includes('generalscience')) {
    if (clean.includes('eco') || clean.includes('stat')) return candidateList.find(g => g.id === 'ics-eco') || null;
    return candidateList.find(g => g.id === 'ics-phy') || null;
  }

  // Generic fallback match only if explicit
  if (clean === 'bsprogram' || clean === 'bs') {
    return candidateList.find(g => g.id === 'bs-general') || null;
  }

  return null;
}

/**
 * Derives current semester and academic part from category, group, or explicit row indicators.
 * Guarantees that BS Semester 8th is mapped to 8, NOT defaulted to 1!
 */
export function deriveSemesterAndPart(
  categoryRaw?: string | null,
  groupRaw?: string | null,
  classRaw?: string | null,
  defaultSemester: number = 1
): {
  currentSemester: number;
  academicPart: 'Part-1' | 'Part-2';
  programType: 'Yearly' | 'Semester';
  totalSemesters: number;
} {
  const combined = `${categoryRaw || ''} ${groupRaw || ''} ${classRaw || ''}`.toLowerCase();
  
  const isBS = combined.includes('bs') || combined.includes('b.s') || combined.includes('bba') || combined.includes('degree') || combined.includes('semester');
  const isDIT = combined.includes('dit') || combined.includes('diploma');
  const isUK = combined.includes('uk') || combined.includes('level 3');

  if (isBS) {
    let sem = defaultSemester;
    if (combined.includes('8th') || combined.includes('sem 8') || combined.includes('semester 8') || combined.includes('s8')) sem = 8;
    else if (combined.includes('7th') || combined.includes('sem 7') || combined.includes('semester 7') || combined.includes('s7')) sem = 7;
    else if (combined.includes('6th') || combined.includes('sem 6') || combined.includes('semester 6') || combined.includes('s6')) sem = 6;
    else if (combined.includes('5th') || combined.includes('sem 5') || combined.includes('semester 5') || combined.includes('s5') || combined.includes('adp') || combined.includes('lateral')) sem = 5;
    else if (combined.includes('4th') || combined.includes('sem 4') || combined.includes('semester 4') || combined.includes('s4')) sem = 4;
    else if (combined.includes('3rd') || combined.includes('sem 3') || combined.includes('semester 3') || combined.includes('s3')) sem = 3;
    else if (combined.includes('2nd') || combined.includes('sem 2') || combined.includes('semester 2') || combined.includes('s2')) sem = 2;
    else if (combined.includes('1st') || combined.includes('sem 1') || combined.includes('semester 1') || combined.includes('s1')) sem = 1;

    return {
      currentSemester: sem,
      academicPart: sem >= 5 ? 'Part-2' : 'Part-1',
      programType: 'Semester',
      totalSemesters: 8
    };
  }

  if (isDIT) {
    let sem = 1;
    if (combined.includes('part-2') || combined.includes('part 2') || combined.includes('sem 2')) sem = 2;
    return {
      currentSemester: sem,
      academicPart: sem > 1 ? 'Part-2' : 'Part-1',
      programType: 'Semester',
      totalSemesters: 4
    };
  }

  if (isUK) {
    let sem = 1;
    if (combined.includes('year-2') || combined.includes('year 2') || combined.includes('part-2')) sem = 2;
    return {
      currentSemester: sem,
      academicPart: sem > 1 ? 'Part-2' : 'Part-1',
      programType: 'Semester',
      totalSemesters: 4
    };
  }

  // Intermediate HSSC
  const isPart2 = combined.includes('part-2') || combined.includes('part 2') || combined.includes('2nd year') || combined.includes('second year') || combined.includes('12th');
  return {
    currentSemester: isPart2 ? 2 : 1,
    academicPart: isPart2 ? 'Part-2' : 'Part-1',
    programType: 'Yearly',
    totalSemesters: 2
  };
}

/**
 * Builds a composite duplicate detection key for a candidate row
 */
export function buildDuplicateKey(name: string, fatherName: string, session: string, program: string = 'inter'): string {
  const cName = normalizeKey(name);
  const cFather = normalizeKey(fatherName);
  const cSession = normalizeSessionString(session);
  return `${cName}_${cFather}_${cSession}_${program.toLowerCase()}`;
}
