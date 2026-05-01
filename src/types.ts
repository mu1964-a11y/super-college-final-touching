
export type Gender = 'Male' | 'Female';

export type StudentCategory = string | 'Inter Part-1 Boys' | 'Inter Part-2 Boys' | 'Inter Part-1 Girls' | 'Inter Part-2 Girls';

export type AdmissionStatus = 'Prospective' | 'Admitted/Confirmed' | 'Full Paid' | 'Partial Paid' | 'Not Paid' | 'Overdue';

export interface Installment {
  id: string;
  amount: number;
  dueDate: string;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  paidDate?: string;
  amountPaid?: number;
}

export interface FeeTransaction {
  id: string;
  date: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque';
  receiptId: string;
  description: string;
  recordedBy?: string;
}

export interface FeeLedger {
  totalPackage: number;
  totalReceived: number;
  remainingBalance: number;
  installments: Installment[];
  transactions: FeeTransaction[];
}

export interface Lead {
  id: string;
  studentName: string;
  fatherName: string;
  finalizedFee?: number;
  finalizedBy?: string;
  cnic?: string;
  previousSchool: string;
  areaVillage: string;
  city: string;
  fatherPhone: string;
  grade: string;
  currentClass: string;
  subjects?: string[];
  dateAdded: string;
  isConverted?: boolean;
  session?: string;
}

export interface Admission {
  id: string;
  studentId?: string; // SGC-J-2026-XXXX
  date: string;
  dateApplied?: string;
  fullName: string;
  fatherName: string;
  email?: string;
  bloodGroup?: string;
  previousMarks: number;
  previousInstitute: string;
  collegeNo?: string;
  bayFormNo?: string;
  dob?: string;
  previousClass?: '9th' | '10th';
  boardRollNo?: string;
  category: StudentCategory;
  group: string;
  section: string;
  subjects: string[];
  address: string;
  admissionFee: number;
  miscFunds?: number;
  totalFeeFinalized: number; // This will be the Tuition Fee
  totalPackage: number; // Admission + Misc + Tuition
  feeReceived: number;
  paymentPlan: 'Semester' | 'Installments';
  paidMonths?: string[]; 
  paidInstallments?: number;
  totalInstallments?: number; // 1 to 12
  nextInstallmentDate?: string;
  totalSemesters?: number;
  feePerSemester?: number;
  nextSemesterDueDate?: string;
  contactNumber: string;
  fatherContact?: string;
  secondaryContact?: string;
  reference: string;
  gender: Gender;
  photo?: string;
  status: AdmissionStatus;
  isAdmitted: boolean;
  session?: string;
  sessionStartDate?: string;
  sessionEndDate?: string;
  academicPart?: 'Part-1' | 'Part-2';
  programType?: 'Yearly' | 'Semester';
  currentSemester?: number;
  feeHistory?: FeePayment[];
  feeLedger?: FeeLedger;
}

export interface Student {
  id: string; // SGC-J-2026-XXXX
  admissionId: string;
  category: StudentCategory;
  group: string;
  section: string;
  fullName: string;
  fatherName: string;
  collegeNo?: string;
  bayFormNo?: string;
  dob?: string;
  previousClass?: '9th' | '10th';
  boardRollNo?: string;
  previousMarks?: number;
  contact: string;
  address: string;
  gender: Gender;
  photo?: string;
  subjects: string[];
  classTeacherId?: string;
  admissionFee: number;
  miscFunds?: number;
  totalFeeFinalized?: number; // Tuition Fee
  totalPackage: number;
  feeReceived?: number;
  totalInstallments?: number; // 4, 10, 12 etc
  monthlyFee: number; // This is the Installment Amount
  feeLedger: FeeLedger;
  otherFees: { name: string; amount: number }[];
  feeHistory: FeePayment[];
  performance: AcademicRecord[];
  attendance: { present: number; absent: number };
  notes?: { date: string; content: string; type: 'Award' | 'Warning' | 'General' }[];
  session?: string;
  sessionStartDate?: string;
  sessionEndDate?: string;
  academicPart?: 'Part-1' | 'Part-2';
  programType?: 'Yearly' | 'Semester';
  currentSemester?: number;
  totalSemesters?: number;
}

export interface FeePayment {
  id: string;
  month: string;
  year: number;
  amountDue: number;
  amountPaid: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
  datePaid?: string;
  receiptId?: string;
  feeType?: string;
  collectedBy?: string;
}

export interface AcademicRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  testName: string;
  testType: 'Daily' | '15-Day' | 'Monthly' | 'Mid-Term' | 'Final';
  date: string;
  subject: string;
  totalMarks: number;
  obtainedMarks: number;
  teacherId: string;
  teacherName: string;
  remarks?: string;
}

export interface SalaryPayment {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  date: string;
  month: string;
  year: number;
  paymentMethod: string;
  status: 'Paid' | 'Pending';
  receiptNumber: string;
}

export type StaffRole = 
  | 'Directors' 
  | 'Coordinator' 
  | 'Lecturer' 
  | 'Exam Controller' 
  | 'Admin Officer' 
  | 'Accountant' 
  | 'Librarian' 
  | 'Receptionist' 
  | 'Lab Attendant' 
  | 'Office Boy' 
  | 'Guard' 
  | 'Gardener' 
  | 'Sweeper';

export interface AppSettings {
  collegeName: string;
  campusName: string;
  logo?: string;
  address: string;
  contactNumber: string;
  email: string;
  website: string;
  principalName: string;
  themeColor: string;
  currencySymbol: string;
  
  // Customization & Appearance
  sidebarColor?: string;
  sidebarTextColor?: string;
  headerColor?: string;
  headerTextColor?: string;
  fontFamily?: 'Inter' | 'Outfit' | 'Space Grotesk' | 'Playfair Display' | 'JetBrains Mono';
  cardRadius?: 'none' | 'sm' | 'md' | 'lg' | '2xl' | '3xl';
  glassEffect?: boolean;
  admissionSlipCustomText?: string;
  feeReceiptCustomText?: string;
  
  // Module Controls
  enabledModules: string[]; // ['dashboard', 'leads', 'admissions', 'students', 'staff', 'accounts', 'reports', 'settings', 'academic']
  
  // System Logic & Interlinking
  autoLeadConversion?: boolean; 
  defaulterAlertThreshold?: number;
  academicSession?: string;
  allowQuickNav?: boolean;
  enableHighlighting?: boolean;
}

export interface Staff {
  id: string; // SGC-T-001
  fullName: string;
  fatherName: string;
  cnic: string;
  contact: string;
  address: string;
  dob: string;
  joinDate: string;
  qualification?: string;
  specialization?: string[];
  role: StaffRole;
  salary: number;
  baseSalary?: number;
  subjects?: string[];
  status: 'Active' | 'Inactive';
  photo?: string;
  assignedStudentIds?: string[];
  notes?: { date: string; content: string; type: 'Award' | 'Warning' | 'General' }[];
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  addedBy: string;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Cheque';
  session?: string;
}

export interface Income {
  id: string;
  studentId?: string;
  studentName: string;
  photo?: string;
  feeType: string;
  amount: number;
  month?: string;
  year?: number;
  date: string;
  status: 'Full' | 'Partial';
  gender?: Gender;
  recordedBy?: string;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Cheque';
  session?: string;
}

export interface UserPermission {
  id: string;
  email: string;
  sections: string[]; // ['dashboard', 'admissions', etc.]
  isAdmin: boolean;
  customPassword?: string;
  displayName?: string;
  lastActive?: string;
  status?: 'online' | 'offline';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'alert' | 'success' | 'warning';
  actorName: string;
  isRead: boolean;
}
