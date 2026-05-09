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
  { name: 'UK Level 3', subjects: ['UK Level 3 Subjects'], type: 'Vocational' },
  { name: 'DIT', subjects: ['Diploma in IT Subjects'], type: 'Diploma' },
  { name: 'BS Program', subjects: ['BS Subjects'], type: 'Degree' }
];

export const COMPULSORY_SUBJECTS = ['English', 'Urdu', 'Islamic Studies', 'Pakistan Studies'];

export const SUBJECTS = [
  'Biology', 'Physics', 'Chemistry', 'Math', 'Computer Science', 
  'Statistics', 'Economics', 'Accounting', 'Commerce', 'Civics', 'Education',
  'Islamic Studies', 'Punjabi', 'Health & Physical Education', 'UK Level 3 Subjects', 'Diploma in IT Subjects', 'BS Subjects'
];

export const STAFF_ROLES = [
  'Directors',
  'Coordinator',
  'Lecturer',
  'Exam Controller',
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
  enableHighlighting: true
};
