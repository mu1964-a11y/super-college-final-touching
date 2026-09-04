-- Supabase DB Schema
-- Execute this in the Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. App Settings
CREATE TABLE "app_settings" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "college_name" TEXT NOT NULL,
    "campus_name" TEXT NOT NULL,
    "logo" TEXT,
    "address" TEXT NOT NULL,
    "contact_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "principal_name" TEXT NOT NULL,
    "theme_color" TEXT NOT NULL,
    "currency_symbol" TEXT NOT NULL,
    "sidebar_color" TEXT,
    "sidebar_text_color" TEXT,
    "header_color" TEXT,
    "header_text_color" TEXT,
    "font_family" TEXT,
    "card_radius" TEXT,
    "glass_effect" BOOLEAN DEFAULT false,
    "admission_slip_custom_text" TEXT,
    "fee_receipt_custom_text" TEXT,
    "enabled_modules" JSONB DEFAULT '[]'::jsonb,
    "auto_lead_conversion" BOOLEAN DEFAULT false,
    "defaulter_alert_threshold" INTEGER,
    "academic_session" TEXT,
    "allow_quick_nav" BOOLEAN DEFAULT true,
    "enable_highlighting" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. User Permissions
CREATE TABLE "user_permissions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" TEXT UNIQUE NOT NULL,
    "sections" JSONB DEFAULT '[]'::jsonb,
    "is_admin" BOOLEAN DEFAULT false,
    "custom_password" TEXT,
    "display_name" TEXT,
    "last_active" TIMESTAMP WITH TIME ZONE,
    "status" TEXT DEFAULT 'offline',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Leads
CREATE TABLE "leads" (
    "id" TEXT PRIMARY KEY,
    "student_name" TEXT NOT NULL,
    "father_name" TEXT NOT NULL,
    "finalized_fee" NUMERIC,
    "finalized_by" TEXT,
    "cnic" TEXT,
    "previous_school" TEXT,
    "area_village" TEXT,
    "city" TEXT,
    "father_phone" TEXT,
    "grade" TEXT,
    "current_class" TEXT,
    "subjects" JSONB DEFAULT '[]'::jsonb,
    "date_added" DATE NOT NULL,
    "is_converted" BOOLEAN DEFAULT false,
    "session" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Admissions
CREATE TABLE "admissions" (
    "id" TEXT PRIMARY KEY,
    "student_id" TEXT UNIQUE,
    "date" DATE NOT NULL,
    "date_applied" DATE,
    "full_name" TEXT NOT NULL,
    "father_name" TEXT NOT NULL,
    "email" TEXT,
    "blood_group" TEXT,
    "previous_marks" NUMERIC,
    "previous_institute" TEXT,
    "college_no" TEXT,
    "bay_form_no" TEXT,
    "dob" DATE,
    "previous_class" TEXT,
    "board_roll_no" TEXT,
    "category" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "subjects" JSONB DEFAULT '[]'::jsonb,
    "address" TEXT NOT NULL,
    "admission_fee" NUMERIC NOT NULL,
    "misc_funds" NUMERIC,
    "total_fee_finalized" NUMERIC NOT NULL,
    "total_package" NUMERIC NOT NULL,
    "fee_received" NUMERIC NOT NULL DEFAULT 0,
    "payment_plan" TEXT NOT NULL,
    "paid_months" JSONB DEFAULT '[]'::jsonb,
    "paid_installments" INTEGER DEFAULT 0,
    "total_installments" INTEGER,
    "next_installment_date" DATE,
    "total_semesters" INTEGER,
    "fee_per_semester" NUMERIC,
    "next_semester_due_date" DATE,
    "contact_number" TEXT NOT NULL,
    "father_contact" TEXT,
    "secondary_contact" TEXT,
    "reference" TEXT,
    "gender" TEXT NOT NULL,
    "photo" TEXT,
    "status" TEXT NOT NULL,
    "is_admitted" BOOLEAN DEFAULT false,
    "session" TEXT,
    "session_start_date" DATE,
    "session_end_date" DATE,
    "academic_part" TEXT,
    "program_type" TEXT,
    "current_semester" INTEGER,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Staff
CREATE TABLE "staff" (
    "id" TEXT PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "father_name" TEXT NOT NULL,
    "cnic" TEXT NOT NULL UNIQUE,
    "contact" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "join_date" DATE NOT NULL,
    "qualification" TEXT,
    "specialization" JSONB DEFAULT '[]'::jsonb,
    "role" TEXT NOT NULL,
    "salary" NUMERIC NOT NULL,
    "base_salary" NUMERIC,
    "subjects" JSONB DEFAULT '[]'::jsonb,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "photo" TEXT,
    "assigned_student_ids" JSONB DEFAULT '[]'::jsonb,
    "notes" JSONB DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Students
CREATE TABLE "students" (
    "id" TEXT PRIMARY KEY,
    "admission_id" TEXT REFERENCES "admissions"(id) ON DELETE CASCADE,
    "category" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "father_name" TEXT NOT NULL,
    "email" TEXT,
    "blood_group" TEXT,
    "college_no" TEXT,
    "bay_form_no" TEXT,
    "dob" DATE,
    "previous_class" TEXT,
    "board_roll_no" TEXT,
    "previous_marks" NUMERIC,
    "contact" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "photo" TEXT,
    "subjects" JSONB DEFAULT '[]'::jsonb,
    "class_teacher_id" TEXT REFERENCES "staff"(id) ON DELETE SET NULL,
    "admission_fee" NUMERIC NOT NULL,
    "misc_funds" NUMERIC,
    "total_fee_finalized" NUMERIC,
    "total_package" NUMERIC NOT NULL,
    "fee_received" NUMERIC DEFAULT 0,
    "total_installments" INTEGER,
    "monthly_fee" NUMERIC NOT NULL,
    "other_fees" JSONB DEFAULT '[]'::jsonb,
    "attendance_present" INTEGER DEFAULT 0,
    "attendance_absent" INTEGER DEFAULT 0,
    "notes" JSONB DEFAULT '[]'::jsonb,
    "session" TEXT,
    "session_start_date" DATE,
    "session_end_date" DATE,
    "academic_part" TEXT,
    "program_type" TEXT,
    "current_semester" INTEGER,
    "total_semesters" INTEGER,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Installments
CREATE TABLE "installments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "student_id" TEXT REFERENCES "students"(id) ON DELETE CASCADE,
    "amount" NUMERIC NOT NULL,
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "paid_date" DATE,
    "amount_paid" NUMERIC DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Fee Transactions (Ledger)
CREATE TABLE "fee_transactions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "student_id" TEXT REFERENCES "students"(id) ON DELETE CASCADE,
    "date" DATE NOT NULL,
    "amount" NUMERIC NOT NULL,
    "payment_method" TEXT NOT NULL,
    "receipt_id" TEXT,
    "description" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Fee Payments (History)
CREATE TABLE "fee_payments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "student_id" TEXT REFERENCES "students"(id) ON DELETE CASCADE,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "amount_due" NUMERIC NOT NULL,
    "amount_paid" NUMERIC NOT NULL,
    "status" TEXT NOT NULL,
    "date_paid" DATE,
    "receipt_id" TEXT,
    "fee_type" TEXT,
    "collected_by" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. Academic Records
CREATE TABLE "academic_records" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "student_id" TEXT REFERENCES "students"(id) ON DELETE CASCADE,
    "student_name" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "test_name" TEXT NOT NULL,
    "test_type" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "subject" TEXT NOT NULL,
    "total_marks" NUMERIC NOT NULL,
    "obtained_marks" NUMERIC NOT NULL,
    "teacher_id" TEXT REFERENCES "staff"(id) ON DELETE SET NULL,
    "teacher_name" TEXT NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. Salary Payments
CREATE TABLE "salary_payments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "staff_id" TEXT REFERENCES "staff"(id) ON DELETE CASCADE,
    "staff_name" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "date" DATE NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "payment_method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "receipt_number" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. Staff Attendance
CREATE TABLE "staff_attendance" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "staff_id" TEXT REFERENCES "staff"(id) ON DELETE CASCADE,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "check_in" TIME,
    "check_out" TIME,
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE("staff_id", "date")
);

-- 13. Staff Timetable
CREATE TABLE "staff_timetable" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "staff_id" TEXT REFERENCES "staff"(id) ON DELETE CASCADE,
    "day" TEXT NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "subject" TEXT NOT NULL,
    "class_room" TEXT,
    "section" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 14. Staff Advances
CREATE TABLE "staff_advances" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "staff_id" TEXT REFERENCES "staff"(id) ON DELETE CASCADE,
    "amount" NUMERIC NOT NULL,
    "date_issued" DATE NOT NULL,
    "deduction_per_month" NUMERIC NOT NULL,
    "remaining_balance" NUMERIC NOT NULL,
    "months" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 15. Expenses
CREATE TABLE IF NOT EXISTS "expenses" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "category" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "description" TEXT NOT NULL,
    "added_by" TEXT NOT NULL DEFAULT 'Admin',
    "payment_method" TEXT DEFAULT 'Cash',
    "session" TEXT,
    "expense_type" TEXT DEFAULT 'Daily',
    "paid_to" TEXT,
    "voucher_no" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure existing expenses table gets newly supported columns seamlessly
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "session" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "payment_method" TEXT DEFAULT 'Cash';
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "expense_type" TEXT DEFAULT 'Daily';
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "paid_to" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "voucher_no" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "recorded_by" TEXT;

-- Dynamic Expense Heads / Categories Table (allows unlimited custom & new heads)
CREATE TABLE IF NOT EXISTS "expense_heads" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT UNIQUE NOT NULL,
    "group_name" TEXT NOT NULL DEFAULT 'Other Expenses',
    "default_type" TEXT NOT NULL DEFAULT 'Daily',
    "is_custom" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 16. Incomes (Other than student fees handled in ledger)
CREATE TABLE "incomes" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "student_id" TEXT,
    "student_name" TEXT NOT NULL,
    "photo" TEXT,
    "fee_type" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "month" TEXT,
    "year" INTEGER,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "gender" TEXT,
    "recorded_by" TEXT,
    "payment_method" TEXT,
    "session" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 17. Notifications
CREATE TABLE "notifications" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    "type" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 18. Student Attendance
CREATE TABLE "student_attendance" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "student_id" TEXT REFERENCES "students"(id) ON DELETE CASCADE,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE("student_id", "date")
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Allowing public access for initial testing phase
-- You can harden these later once Supabase Auth is fully ready

ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "app_settings" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "user_permissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "user_permissions" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "leads" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "admissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "admissions" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "staff" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "staff" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "students" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "installments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "installments" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "fee_transactions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "fee_transactions" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "fee_payments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "fee_payments" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "academic_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "academic_records" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "salary_payments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "salary_payments" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "staff_attendance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "staff_attendance" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "staff_timetable" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "staff_timetable" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "staff_advances" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "staff_advances" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "expenses" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "incomes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "incomes" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "notifications" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "student_attendance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "student_attendance" FOR ALL USING (true) WITH CHECK (true);

