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
