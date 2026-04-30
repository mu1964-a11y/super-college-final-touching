-- ==========================================
-- SUPABASE SCHEMA FOR COLLEGE MANAGEMENT SYSTEM
-- Copy and run this in your Supabase SQL Editor
-- ==========================================

-- 1. APPS SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name TEXT DEFAULT 'Superior Group of Colleges',
  campus_name TEXT DEFAULT 'Jahanian Campus',
  logo_url TEXT,
  address TEXT,
  contact_number TEXT,
  email TEXT,
  website TEXT,
  principal_name TEXT,
  theme_color TEXT DEFAULT '#10b981',
  currency_symbol TEXT DEFAULT 'Rs.',
  academic_session TEXT DEFAULT '2026-28',
  enabled_modules JSONB DEFAULT '["dashboard", "leads", "admissions", "students", "staff", "accounts", "reports", "settings", "academic"]'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. LEADS
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  father_name TEXT,
  finalized_fee NUMERIC DEFAULT 0,
  finalized_by TEXT,
  cnic TEXT,
  previous_school TEXT,
  area_village TEXT,
  city TEXT DEFAULT 'Jahanian',
  father_phone TEXT,
  grade TEXT,
  current_class TEXT,
  subjects TEXT[], -- Array of strings
  is_converted BOOLEAN DEFAULT false,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  session TEXT,
  extra_info1 TEXT, -- Placeholder for future use
  extra_info2 TEXT  -- Placeholder for future use
);

-- 3. ADMISSIONS
CREATE TABLE IF NOT EXISTS admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT, -- SGC-J-2026-XXXX
  date DATE DEFAULT CURRENT_DATE,
  full_name TEXT NOT NULL,
  father_name TEXT,
  previous_marks INTEGER,
  previous_institute TEXT,
  college_no TEXT,
  bay_form_no TEXT,
  dob DATE,
  previous_class TEXT,
  board_roll_no TEXT,
  category TEXT, -- StudentCategory
  "group" TEXT,
  section TEXT,
  subjects TEXT[],
  address TEXT,
  admission_fee NUMERIC DEFAULT 0,
  misc_funds NUMERIC DEFAULT 0,
  total_fee_finalized NUMERIC DEFAULT 0,
  total_package NUMERIC DEFAULT 0,
  fee_received NUMERIC DEFAULT 0,
  payment_plan TEXT,
  contact_number TEXT,
  father_contact TEXT,
  secondary_contact TEXT, -- Added missing field
  reference TEXT,
  gender TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'Prospective',
  is_admitted BOOLEAN DEFAULT false,
  session TEXT, 
  session_start_date DATE, -- Added
  session_end_date DATE,   -- Added
  academic_part TEXT,     -- Added (Part-1, Part-2)
  fee_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY, -- SGC-J-2026-XXXX (Custom ID)
  admission_id UUID REFERENCES admissions(id),
  full_name TEXT NOT NULL,
  father_name TEXT,
  category TEXT,
  "group" TEXT,
  section TEXT,
  college_no TEXT,
  bay_form_no TEXT,
  dob DATE,
  previous_class TEXT,
  board_roll_no TEXT,
  previous_marks INTEGER,
  contact TEXT,
  address TEXT,
  gender TEXT,
  photo_url TEXT,
  subjects TEXT[],
  class_teacher_id TEXT,
  admission_fee NUMERIC DEFAULT 0,
  misc_funds NUMERIC DEFAULT 0,
  total_fee_finalized NUMERIC DEFAULT 0,
  total_package NUMERIC DEFAULT 0,
  fee_received NUMERIC DEFAULT 0,
  total_installments INTEGER,
  monthly_fee NUMERIC DEFAULT 0,
  fee_ledger JSONB DEFAULT '{}'::jsonb, -- Store complex ledger as JSON for now
  fee_history JSONB DEFAULT '[]'::jsonb,
  attendance JSONB DEFAULT '{"present": 0, "absent": 0}'::jsonb,
  session TEXT, 
  session_start_date DATE, -- Added
  session_end_date DATE,   -- Added
  academic_part TEXT,     -- Added (Part-1, Part-2)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. STAFF
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY, -- SGC-T-001
  full_name TEXT NOT NULL,
  father_name TEXT,
  cnic TEXT,
  contact TEXT,
  address TEXT,
  dob DATE,
  join_date DATE,
  qualification TEXT,
  specialization TEXT[],
  role TEXT,
  salary NUMERIC DEFAULT 0,
  base_salary NUMERIC DEFAULT 0,
  subjects TEXT[],
  status TEXT DEFAULT 'Active',
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. FINANCE INCOME
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT,
  student_name TEXT,
  fee_type TEXT,
  amount NUMERIC NOT NULL,
  month TEXT,
  year INTEGER,
  date DATE DEFAULT CURRENT_DATE,
  status TEXT,
  payment_method TEXT DEFAULT 'Cash',
  recorded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. FINANCE EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE DEFAULT CURRENT_DATE,
  category TEXT,
  amount NUMERIC NOT NULL,
  description TEXT,
  payment_method TEXT DEFAULT 'Cash',
  added_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. ACADEMIC RECORDS
CREATE TABLE IF NOT EXISTS academic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT,
  student_name TEXT,
  class TEXT,
  section TEXT,
  test_name TEXT,
  test_type TEXT,
  date DATE DEFAULT CURRENT_DATE,
  subject TEXT,
  total_marks INTEGER,
  obtained_marks INTEGER,
  teacher_id TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. PERMISSIONS
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  sections JSONB DEFAULT '[]'::jsonb,
  is_admin BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'offline',
  last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  message TEXT,
  type TEXT DEFAULT 'info',
  actor_name TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Updated: Allowing public access for initial testing phase
-- You can harden these later once Supabase Auth is fully ready

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON leads FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON admissions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON students FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON staff FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON income FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON expenses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE academic_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON academic_records FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON permissions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Insert initial settings
INSERT INTO settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;

-- ==========================================
-- STORAGE BUCKETS & POLICIES
-- ==========================================

-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-photos', 'staff-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for student-photos
CREATE POLICY "Public Access" 
ON storage.objects FOR ALL 
USING ( bucket_id = 'student-photos' ) 
WITH CHECK ( bucket_id = 'student-photos' );

-- Storage Policies for logos
CREATE POLICY "Public Access Logos" 
ON storage.objects FOR ALL 
USING ( bucket_id = 'logos' ) 
WITH CHECK ( bucket_id = 'logos' );

-- Storage Policies for staff-photos
CREATE POLICY "Public Access Staff" 
ON storage.objects FOR ALL 
USING ( bucket_id = 'staff-photos' ) 
WITH CHECK ( bucket_id = 'staff-photos' );
