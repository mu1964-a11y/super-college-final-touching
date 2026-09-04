export interface ExpenseHeadConfig {
  name: string;
  group: 'Campus & Maintenance' | 'Utilities & Bills' | 'Transport & Vehicles' | 'Board & Universities' | 'Staff & HR' | 'Administration & Office' | 'Affiliation & Royalties' | 'Facility & Rent';
  defaultType: 'Daily' | 'Monthly' | 'Operational';
  description?: string;
}

export const COLLEGE_EXPENSE_HEADS_CONFIG: ExpenseHeadConfig[] = [
  // Campus & Infrastructure Maintenance
  { name: 'Building Repairing & Maintenance', group: 'Campus & Maintenance', defaultType: 'Operational' },
  { name: 'Computer & Printer Repairing', group: 'Campus & Maintenance', defaultType: 'Operational' },
  { name: 'Cleanliness & Sanitation', group: 'Campus & Maintenance', defaultType: 'Daily' },
  { name: 'Building Paint', group: 'Campus & Maintenance', defaultType: 'Operational' },
  { name: 'Electricity Repairing', group: 'Campus & Maintenance', defaultType: 'Daily' },
  { name: 'Furniture Repairing', group: 'Campus & Maintenance', defaultType: 'Operational' },
  { name: 'AC Service + Old AC Buy', group: 'Campus & Maintenance', defaultType: 'Operational' },
  { name: 'Plumber', group: 'Campus & Maintenance', defaultType: 'Daily' },
  { name: 'Gardening & Plantation', group: 'Campus & Maintenance', defaultType: 'Daily' },

  // Utilities & Bills
  { name: 'Electricity Bill', group: 'Utilities & Bills', defaultType: 'Monthly' },
  { name: 'Mobile Phone Bill & Internet', group: 'Utilities & Bills', defaultType: 'Monthly' },
  { name: 'PTCL Telephone Bill', group: 'Utilities & Bills', defaultType: 'Monthly' },
  { name: 'Cylinder & Gas', group: 'Utilities & Bills', defaultType: 'Daily' },

  // Facility & Rent
  { name: 'Building Rent', group: 'Facility & Rent', defaultType: 'Monthly' },
  { name: 'Gun Rent', group: 'Facility & Rent', defaultType: 'Monthly' },
  { name: 'Camera', group: 'Facility & Rent', defaultType: 'Operational' },

  // Transport & Vehicles
  { name: 'Transport', group: 'Transport & Vehicles', defaultType: 'Monthly' },
  { name: 'Petrol Exp + Diesel', group: 'Transport & Vehicles', defaultType: 'Daily' },
  { name: 'Vehicle Mechanical Services', group: 'Transport & Vehicles', defaultType: 'Operational' },
  { name: 'Traveling Expense', group: 'Transport & Vehicles', defaultType: 'Daily' },

  // Academics, Board & Universities
  { name: 'BISE Multan Challan', group: 'Board & Universities', defaultType: 'Operational' },
  { name: 'University Challan', group: 'Board & Universities', defaultType: 'Operational' },
  { name: 'Universities Expenses', group: 'Board & Universities', defaultType: 'Operational' },
  { name: 'Gomal University', group: 'Board & Universities', defaultType: 'Operational' },
  { name: 'Gomal University Mix', group: 'Board & Universities', defaultType: 'Operational' },
  { name: 'Fees Return', group: 'Board & Universities', defaultType: 'Operational' },

  // Staff & HR
  { name: 'Salary', group: 'Staff & HR', defaultType: 'Monthly' },
  { name: 'Adv Staff Salary', group: 'Staff & HR', defaultType: 'Monthly' },
  { name: 'Social Security', group: 'Staff & HR', defaultType: 'Monthly' },

  // Administration & Office
  { name: 'Printing & Stationery', group: 'Administration & Office', defaultType: 'Daily' },
  { name: 'Refreshment', group: 'Administration & Office', defaultType: 'Daily' },
  { name: 'Kitchen Utensils', group: 'Administration & Office', defaultType: 'Operational' },
  { name: 'Legal Expense', group: 'Administration & Office', defaultType: 'Operational' },
  { name: 'Loan Return', group: 'Administration & Office', defaultType: 'Monthly' },
  { name: 'Misc Expenses', group: 'Administration & Office', defaultType: 'Daily' },

  // Affiliation, Royalty & Directors
  { name: 'Royalty Head Office', group: 'Affiliation & Royalties', defaultType: 'Monthly' },
  { name: 'Network Royalty', group: 'Affiliation & Royalties', defaultType: 'Monthly' },
  { name: 'Arif Paracha', group: 'Affiliation & Royalties', defaultType: 'Monthly' },
  { name: 'D.D.C', group: 'Affiliation & Royalties', defaultType: 'Operational' },
];

export const ALL_EXPENSE_HEAD_NAMES = COLLEGE_EXPENSE_HEADS_CONFIG.map(h => h.name);

export const EXPENSE_GROUPS = [
  'Campus & Maintenance',
  'Utilities & Bills',
  'Facility & Rent',
  'Transport & Vehicles',
  'Board & Universities',
  'Staff & HR',
  'Administration & Office',
  'Affiliation & Royalties'
] as const;
