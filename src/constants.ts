import { Admission, Lead, Student, Staff, Expense, Income, AppSettings } from './types';

export const INITIAL_ADMISSIONS: Admission[] = [];
export const INITIAL_LEADS: Lead[] = [];
export const INITIAL_STUDENTS: Student[] = [];
export const INITIAL_STAFF: Staff[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_INCOMES: Income[] = [];

export const ACADEMIC_GROUPS = [
  { name: 'FSC (Premedical)', subjects: ['Biology', 'Physics', 'Chemistry'], type: 'Intermediate' },
  { name: 'FSC (Pre Engineering)', subjects: ['Math', 'Physics', 'Chemistry'], type: 'Intermediate' },
  { name: 'General Science (Phy, Math, CS)', subjects: ['Physics', 'Math', 'Computer Science'], type: 'Intermediate' },
  { name: 'General Science (Eco, Math, CS)', subjects: ['Economics', 'Math', 'Computer Science'], type: 'Intermediate' },
  { name: 'Humanities (Eco, Isl, CS)', subjects: ['Economics', 'Islamic Studies', 'Computer Science'], type: 'Intermediate' },
  { name: 'Humanities (Eco, Isl, Punjabi)', subjects: ['Economics', 'Islamic Studies', 'Punjabi'], type: 'Intermediate' },
  { name: 'Humanities (Eco, Isl, Education)', subjects: ['Economics', 'Islamic Studies', 'Education'], type: 'Intermediate' },
  { name: 'Humanities (Eco, Isl, H&P Edu)', subjects: ['Economics', 'Islamic Studies', 'Health & Physical Education'], type: 'Intermediate' },
  { name: 'I. Com', subjects: ['Accounting', 'Commerce', 'Economics'], type: 'Intermediate' },
  { name: 'UK Level 3', subjects: ['Applied Science', 'Business Analysis', 'IT Fundamentals', 'Cyber Security'], type: 'Vocational' },
  { name: 'DIT', subjects: ['Office Automation', 'Web Development', 'Computer Graphics', 'Networking & Hardware'], type: 'Diploma' },
  { name: 'BS Computer Science (BSCS)', subjects: ['Programming Fundamentals', 'Data Structures', 'Database Systems', 'Software Engineering', 'Calculus', 'Linear Algebra'], type: 'Degree' },
  { name: 'BS Information Technology (BSIT)', subjects: ['Web Systems', 'Network Administration', 'Database Management', 'IT Infrastructure', 'Cloud Computing'], type: 'Degree' },
  { name: 'BS Physics', subjects: ['Mechanics & Waves', 'Electromagnetism', 'Quantum Mechanics', 'Thermal Physics', 'Modern Physics', 'Differential Equations'], type: 'Degree' },
  { name: 'BS Chemistry', subjects: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry', 'Biochemistry'], type: 'Degree' },
  { name: 'BS Mathematics', subjects: ['Calculus & Analytic Geometry', 'Linear Algebra', 'Real Analysis', 'Differential Equations', 'Numerical Methods'], type: 'Degree' },
  { name: 'BS English', subjects: ['Introduction to Linguistics', 'Classical Literature', 'Academic Writing', 'History of English Literature', 'Phonetics & Phonology'], type: 'Degree' },
  { name: 'BS Botany', subjects: ['Plant Diversity', 'Cell Biology & Genetics', 'Plant Physiology', 'Ecology', 'Plant Anatomy'], type: 'Degree' },
  { name: 'BS Zoology', subjects: ['Animal Diversity', 'Cell & Molecular Biology', 'Genetics', 'Animal Physiology', 'Evolution & Ecology'], type: 'Degree' },
  { name: 'BBA (Bachelor of Business Admin)', subjects: ['Principles of Management', 'Financial Accounting', 'Marketing Management', 'Business Economics', 'Organizational Behavior'], type: 'Degree' },
  { name: 'BS Program', subjects: ['Core BS Electives', 'Research Methodology'], type: 'Degree' }
];

export const COMPULSORY_SUBJECTS = ['English', 'Urdu', 'Islamic Studies', 'Pakistan Studies'];

export const SUBJECTS = [
  'Biology', 'Physics', 'Chemistry', 'Math', 'Computer Science', 
  'Statistics', 'Economics', 'Accounting', 'Commerce', 'Civics', 'Education',
  'Islamic Studies', 'Punjabi', 'Health & Physical Education', 'UK Level 3 Subjects', 'Diploma in IT Subjects', 'BS Subjects',
  'Programming Fundamentals', 'Data Structures', 'Database Systems', 'Software Engineering', 'Calculus', 'Linear Algebra',
  'Web Systems', 'Network Administration', 'Database Management', 'IT Infrastructure', 'Cloud Computing',
  'Mechanics & Waves', 'Electromagnetism', 'Quantum Mechanics', 'Thermal Physics', 'Modern Physics', 'Differential Equations',
  'Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry', 'Biochemistry',
  'Calculus & Analytic Geometry', 'Real Analysis', 'Numerical Methods',
  'Introduction to Linguistics', 'Classical Literature', 'Academic Writing', 'History of English Literature', 'Phonetics & Phonology',
  'Plant Diversity', 'Cell Biology & Genetics', 'Plant Physiology', 'Ecology', 'Plant Anatomy',
  'Animal Diversity', 'Cell & Molecular Biology', 'Genetics', 'Animal Physiology', 'Evolution & Ecology',
  'Principles of Management', 'Financial Accounting', 'Marketing Management', 'Business Economics', 'Organizational Behavior',
  'Applied Science', 'Business Analysis', 'IT Fundamentals', 'Cyber Security',
  'Office Automation', 'Web Development', 'Computer Graphics', 'Networking & Hardware',
  'Core BS Electives', 'Research Methodology'
];

export const STAFF_ROLES = [
  'Campus Head',
  'Principal',
  'Vice Principal',
  'Directors',
  'Coordinator',
  'Lecturer',
  'Faculty',
  'Exam Controller',
  'Exam Officer',
  'Librarian',
  'Lab Attendant',
  'Admin Officer',
  'Accountant',
  'Receptionist',
  'Office Boy',
  'Guard',
  'Gardener',
  'Sweeper'
];

export const ADDITIONAL_PORTFOLIOS = [
  'HOD (Head of Department)',
  'Campus Coordinator',
  'Lecturer (Teaching Faculty)',
  'Academic Coordinator',
  'Examination Controller / In-charge',
  'Discipline In-charge',
  'Senior Course Instructor',
  'Admission Counselor',
  'Sports In-charge',
  'Student Affairs In-charge',
  'Lab In-charge',
  'Visiting Faculty',
  'Chief Proctor',
  'Timetable In-charge'
];

export const PAKISTAN_QUALIFICATIONS_PRESETS = [
  {
    category: "Post-Graduate & Doctorate (18+ Years)",
    degrees: [
      "Ph.D",
      "M.Phil Physics",
      "M.Phil Chemistry",
      "M.Phil Mathematics",
      "M.Phil English",
      "M.Phil Urdu",
      "M.Phil Botany",
      "M.Phil Zoology",
      "M.Phil Economics",
      "M.Phil Education",
      "M.Phil Computer Science",
      "MS Computer Science (MSCS)",
      "MS Information Technology (MSIT)",
      "MS Software Engineering (MSSE)",
      "MS Management Sciences"
    ]
  },
  {
    category: "Master Degrees (16 Years)",
    degrees: [
      "M.Sc Physics",
      "M.Sc Chemistry",
      "M.Sc Mathematics",
      "M.Sc Zoology",
      "M.Sc Botany",
      "M.Sc Economics",
      "M.Sc Statistics",
      "M.A English",
      "M.A Urdu",
      "M.A Islamic Studies",
      "M.A Pak Studies",
      "M.A Education",
      "M.A Political Science",
      "M.Com",
      "MBA",
      "MCS",
      "MIT"
    ]
  },
  {
    category: "BS 4-Years & Graduation",
    degrees: [
      "BS Computer Science (BSCS)",
      "BS Information Technology (BSIT)",
      "BS Software Engineering (BSSE)",
      "BS Physics",
      "BS Chemistry",
      "BS Mathematics",
      "BS English",
      "BS Botany",
      "BS Zoology",
      "BBA (Bachelor of Business Admin)",
      "B.Sc",
      "B.A",
      "B.Com",
      "ADP (Associate Degree Program)"
    ]
  },
  {
    category: "Teaching & Professional Diplomas",
    degrees: [
      "B.Ed (1.5 Years)",
      "B.Ed (2.5 Years)",
      "B.Ed (4 Years)",
      "M.Ed",
      "DIT (Diploma in Information Technology)",
      "ACCA / CA Inter",
      "CMA / PIPFA"
    ]
  },
  {
    category: "Intermediate & Schooling",
    degrees: [
      "F.Sc (Pre-Medical)",
      "F.Sc (Pre-Engineering)",
      "ICS (Computer Science)",
      "I.Com",
      "F.A",
      "Matric (Science)",
      "Matric (Computer Science)",
      "Matric (Arts)",
      "Middle Pass",
      "Primary Pass"
    ]
  }
];

export const POPULAR_FACULTY_DEGREES = [
  "M.Phil Physics",
  "M.Sc Physics",
  "M.Phil Chemistry",
  "M.Sc Chemistry",
  "M.Phil English",
  "M.A English",
  "M.Phil Mathematics",
  "M.Sc Mathematics",
  "BS Computer Science (BSCS)",
  "M.Phil Botany",
  "M.Sc Zoology",
  "B.Ed",
  "M.Ed",
  "MBA",
  "M.Com"
];

export const INITIAL_SETTINGS: AppSettings = {
  collegeName: 'Superior Group',
  campusName: 'Colleges Jahanian',
  logo: '',
  address: 'Main Multan Road, Jahanian, Pakistan',
  contactNumber: '+92 300 1234567',
  email: 'info@superiorjahanian.edu.pk',
  website: 'www.superiorjahanian.edu.pk',
  principalName: 'Prof. Muhammad Azam',
  themeColor: '#085a4e', // Superior Teal
  currencySymbol: 'Rs.',
  
  // Customization Defaults
  sidebarColor: '#085a4e', // Superior Teal
  sidebarTextColor: '#ffffff',
  headerColor: '#ffffff',
  headerTextColor: '#0f172a', // Slate 900
  fontFamily: 'Inter',
  cardRadius: '3xl',
  glassEffect: true,
  
  // Module Controls
  enabledModules: ['dashboard', 'leads', 'admissions', 'students', 'staff', 'accounts', 'reports', 'settings', 'academic'],
  predefinedSections: [],
  
  // System Logic
  autoLeadConversion: false,
  defaulterAlertThreshold: 0,
  academicSession: '2026-28',
  allowQuickNav: true,
  enableHighlighting: true,
  autoWhatsAppAdmission: true,
  autoWhatsAppFeePayment: true,
  gateEntryStartTime: '07:00',
  collegeStartTime: '07:54',
  gateEntryCutoffTime: '08:30',
  gateExitStartTime: '13:30',
  gateExitCutoffTime: '15:30',
  allowOffHoursScan: false
};
