-- ==============================================================================
-- SUPERIOR GROUP OF COLLEGES JAHANIAN (SGC-J)
-- COMPLETE MASTER SUPABASE POSTGRESQL SCHEMA (IDEMPOTENT & PRODUCTION READY)
-- ==============================================================================
-- Run this entire script in your Supabase SQL Editor.
-- It uses "IF NOT EXISTS" and "ADD COLUMN IF NOT EXISTS" everywhere,
-- ensuring NO EXISTING DATA is lost or overwritten, while all missing
-- tables, columns, indexes, views, and RLS policies are created properly.
-- ==============================================================================

-- 0. Enable UUID Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. SETTINGS & APP BRANDING
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "settings" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "college_name" TEXT DEFAULT 'Superior Group of Colleges',
    "campus_name" TEXT DEFAULT 'Jahanian Campus',
    "logo" TEXT,
    "logo_url" TEXT,
    "address" TEXT DEFAULT 'Jahanian, Multan Road',
    "contact_number" TEXT DEFAULT '0301-4455891',
    "email" TEXT DEFAULT 'info@superiorjhn.com',
    "website" TEXT DEFAULT 'https://portal.superiorjhn.com',
    "principal_name" TEXT DEFAULT 'Principal Office',
    "theme_color" TEXT DEFAULT '#085a4e',
    "currency_symbol" TEXT DEFAULT 'Rs.',
    "academic_session" TEXT DEFAULT '2026-28',
    "enabled_modules" JSONB DEFAULT '["dashboard", "leads", "admissions", "students", "staff", "accounts", "reports", "settings", "academic", "whatsapp-center"]'::jsonb,
    "config" JSONB DEFAULT '{}'::jsonb,
    "sidebar_color" TEXT,
    "sidebar_text_color" TEXT,
    "header_color" TEXT,
    "header_text_color" TEXT,
    "font_family" TEXT,
    "card_radius" TEXT,
    "glass_effect" BOOLEAN DEFAULT false,
    "admission_slip_custom_text" TEXT,
    "fee_receipt_custom_text" TEXT,
    "auto_lead_conversion" BOOLEAN DEFAULT false,
    "defaulter_alert_threshold" INTEGER DEFAULT 30,
    "allow_quick_nav" BOOLEAN DEFAULT true,
    "enable_highlighting" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure all columns exist on settings
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "config" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "enabled_modules" JSONB DEFAULT '["dashboard", "leads", "admissions", "students", "staff", "accounts", "reports", "settings", "academic", "whatsapp-center"]'::jsonb;

-- Backward compatibility alias view for app_settings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_settings') THEN
        CREATE OR REPLACE VIEW "app_settings" AS SELECT * FROM "settings";
    END IF;
END $$;

-- Insert default row if table is completely empty
INSERT INTO "settings" ("id", "college_name", "campus_name", "theme_color", "academic_session")
SELECT gen_random_uuid(), 'Superior College Jahanian', 'Jahanian Campus', '#085a4e', '2026-28'
WHERE NOT EXISTS (SELECT 1 FROM "settings" LIMIT 1);

-- ==============================================================================
-- 2. USER PERMISSIONS & SUB-ADMINS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "permissions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" TEXT UNIQUE NOT NULL,
    "display_name" TEXT,
    "contact" TEXT,
    "phone" TEXT,
    "sections" JSONB DEFAULT '[]'::jsonb,
    "is_admin" BOOLEAN DEFAULT false,
    "custom_password" TEXT,
    "last_active" TIMESTAMP WITH TIME ZONE,
    "status" TEXT DEFAULT 'offline',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "contact" TEXT;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "display_name" TEXT;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "custom_password" TEXT;

-- Backward compatibility alias view for user_permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_permissions') THEN
        CREATE OR REPLACE VIEW "user_permissions" AS SELECT * FROM "permissions";
    END IF;
END $$;

-- ==============================================================================
-- 3. LEADS (PROSPECTIVE INQUIRIES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "leads" (
    "id" TEXT PRIMARY KEY,
    "student_name" TEXT NOT NULL,
    "father_name" TEXT,
    "finalized_fee" NUMERIC DEFAULT 0,
    "finalized_by" TEXT,
    "cnic" TEXT,
    "previous_school" TEXT,
    "area_village" TEXT,
    "city" TEXT DEFAULT 'Jahanian',
    "father_phone" TEXT,
    "grade" TEXT,
    "current_class" TEXT,
    "subjects" JSONB DEFAULT '[]'::jsonb,
    "is_converted" BOOLEAN DEFAULT false,
    "date_added" DATE DEFAULT CURRENT_DATE,
    "session" TEXT DEFAULT '2026-28',
    "pipeline_stage" TEXT DEFAULT 'new',
    "follow_up_date" TEXT,
    "notes" TEXT,
    "extra_info1" TEXT,
    "extra_info2" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "pipeline_stage" TEXT DEFAULT 'new';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "follow_up_date" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "extra_info1" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "extra_info2" TEXT;

-- ==============================================================================
-- 4. ADMISSIONS (CONFIRMED & APPLIED APPLICANTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "admissions" (
    "id" TEXT PRIMARY KEY,
    "student_id" TEXT,
    "date" DATE DEFAULT CURRENT_DATE,
    "date_applied" DATE,
    "full_name" TEXT NOT NULL,
    "father_name" TEXT,
    "email" TEXT,
    "blood_group" TEXT,
    "previous_marks" NUMERIC DEFAULT 0,
    "previous_institute" TEXT,
    "college_no" TEXT,
    "bay_form_no" TEXT,
    "dob" DATE,
    "previous_class" TEXT,
    "board_roll_no" TEXT,
    "category" TEXT,
    "group" TEXT,
    "group_name" TEXT,
    "section" TEXT,
    "subjects" JSONB DEFAULT '[]'::jsonb,
    "address" TEXT,
    "admission_fee" NUMERIC DEFAULT 0,
    "misc_funds" NUMERIC DEFAULT 0,
    "total_fee_finalized" NUMERIC DEFAULT 0,
    "total_package" NUMERIC DEFAULT 0,
    "fee_received" NUMERIC DEFAULT 0,
    "payment_plan" TEXT DEFAULT 'Installments',
    "paid_months" JSONB DEFAULT '[]'::jsonb,
    "paid_installments" INTEGER DEFAULT 0,
    "total_installments" INTEGER DEFAULT 12,
    "next_installment_date" DATE,
    "total_semesters" INTEGER DEFAULT 4,
    "fee_per_semester" NUMERIC DEFAULT 0,
    "next_semester_due_date" DATE,
    "contact_number" TEXT,
    "father_contact" TEXT,
    "secondary_contact" TEXT,
    "reference" TEXT,
    "concession_reason" TEXT,
    "gender" TEXT DEFAULT 'Male',
    "photo" TEXT,
    "photo_url" TEXT,
    "status" TEXT DEFAULT 'Admitted/Confirmed',
    "is_admitted" BOOLEAN DEFAULT true,
    "session" TEXT DEFAULT '2026-28',
    "session_start_date" DATE,
    "session_end_date" DATE,
    "academic_part" TEXT DEFAULT 'Part-1',
    "program_type" TEXT DEFAULT 'Yearly',
    "current_semester" INTEGER DEFAULT 1,
    "fee_history" JSONB DEFAULT '[]'::jsonb,
    "fee_ledger" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "group" TEXT;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "group_name" TEXT;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "concession_reason" TEXT;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "fee_history" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "fee_ledger" JSONB DEFAULT '{}'::jsonb;

-- ==============================================================================
-- 5. STUDENTS (ACTIVE ROSTER)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "students" (
    "id" TEXT PRIMARY KEY,
    "admission_id" TEXT,
    "student_id" TEXT,
    "full_name" TEXT NOT NULL,
    "father_name" TEXT,
    "category" TEXT,
    "group" TEXT,
    "group_name" TEXT,
    "section" TEXT,
    "college_no" TEXT,
    "bay_form_no" TEXT,
    "dob" DATE,
    "previous_class" TEXT,
    "board_roll_no" TEXT,
    "previous_marks" NUMERIC DEFAULT 0,
    "contact" TEXT,
    "father_contact" TEXT,
    "secondary_contact" TEXT,
    "email" TEXT,
    "blood_group" TEXT,
    "concession_reason" TEXT,
    "address" TEXT,
    "gender" TEXT DEFAULT 'Male',
    "photo" TEXT,
    "photo_url" TEXT,
    "subjects" JSONB DEFAULT '[]'::jsonb,
    "class_teacher_id" TEXT,
    "admission_fee" NUMERIC DEFAULT 0,
    "misc_funds" NUMERIC DEFAULT 0,
    "total_fee_finalized" NUMERIC DEFAULT 0,
    "total_package" NUMERIC DEFAULT 0,
    "fee_received" NUMERIC DEFAULT 0,
    "total_installments" INTEGER DEFAULT 12,
    "monthly_fee" NUMERIC DEFAULT 0,
    "other_fees" JSONB DEFAULT '[]'::jsonb,
    "attendance_present" INTEGER DEFAULT 0,
    "attendance_absent" INTEGER DEFAULT 0,
    "attendance" JSONB DEFAULT '{"present": 0, "absent": 0}'::jsonb,
    "fee_ledger" JSONB DEFAULT '{}'::jsonb,
    "fee_history" JSONB DEFAULT '[]'::jsonb,
    "notes" JSONB DEFAULT '[]'::jsonb,
    "session" TEXT DEFAULT '2026-28',
    "session_start_date" DATE,
    "session_end_date" DATE,
    "academic_part" TEXT DEFAULT 'Part-1',
    "program_type" TEXT DEFAULT 'Yearly',
    "current_semester" INTEGER DEFAULT 1,
    "total_semesters" INTEGER DEFAULT 4,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "group" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "group_name" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "father_contact" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "secondary_contact" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "concession_reason" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "attendance" JSONB DEFAULT '{"present": 0, "absent": 0}'::jsonb;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "fee_ledger" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "fee_history" JSONB DEFAULT '[]'::jsonb;

-- ==============================================================================
-- 6. STAFF & FACULTY DIRECTORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "staff" (
    "id" TEXT PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "father_name" TEXT,
    "cnic" TEXT,
    "contact" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "dob" DATE,
    "join_date" DATE DEFAULT CURRENT_DATE,
    "qualification" TEXT,
    "specialization" JSONB DEFAULT '[]'::jsonb,
    "role" TEXT DEFAULT 'Faculty',
    "designation" TEXT,
    "salary" NUMERIC DEFAULT 0,
    "base_salary" NUMERIC DEFAULT 0,
    "subjects" JSONB DEFAULT '[]'::jsonb,
    "status" TEXT DEFAULT 'Active',
    "photo" TEXT,
    "photo_url" TEXT,
    "assigned_student_ids" JSONB DEFAULT '[]'::jsonb,
    "notes" JSONB DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "designation" TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "base_salary" NUMERIC DEFAULT 0;

-- ==============================================================================
-- 7. STAFF ATTENDANCE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "staff_attendance" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "staff_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "check_in" TIME,
    "check_out" TIME,
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE("staff_id", "date")
);

-- ==============================================================================
-- 8. STAFF TIMETABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "staff_timetable" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "staff_id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "subject" TEXT NOT NULL,
    "class_room" TEXT,
    "section" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 9. STAFF SALARY ADVANCES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "staff_advances" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "staff_id" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "date_issued" DATE NOT NULL DEFAULT CURRENT_DATE,
    "deduction_per_month" NUMERIC NOT NULL,
    "remaining_balance" NUMERIC NOT NULL,
    "months" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 10. FINANCE: INCOME (ROZNAMCHA CASH INFLOWS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "income" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "student_id" TEXT,
    "student_name" TEXT NOT NULL,
    "photo" TEXT,
    "fee_type" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "month" TEXT,
    "year" INTEGER,
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "status" TEXT NOT NULL DEFAULT 'Received',
    "gender" TEXT,
    "recorded_by" TEXT,
    "payment_method" TEXT DEFAULT 'Cash',
    "session" TEXT DEFAULT '2026-28',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE "income" ADD COLUMN IF NOT EXISTS "photo" TEXT;
ALTER TABLE "income" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "income" ADD COLUMN IF NOT EXISTS "payment_method" TEXT DEFAULT 'Cash';
ALTER TABLE "income" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT '2026-28';
ALTER TABLE "income" ADD COLUMN IF NOT EXISTS "recorded_by" TEXT;

-- Dual compatibility view: creates "incomes" pointing to "income" so queries to either work seamlessly
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'incomes') THEN
        CREATE OR REPLACE VIEW "incomes" AS SELECT * FROM "income";
    END IF;
END $$;

-- ==============================================================================
-- 11. FINANCE: EXPENSES (CASH OUTFLOWS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "expenses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "category" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "description" TEXT NOT NULL,
    "added_by" TEXT NOT NULL DEFAULT 'Admin',
    "payment_method" TEXT DEFAULT 'Cash',
    "session" TEXT DEFAULT '2026-28',
    "expense_type" TEXT DEFAULT 'Daily',
    "paid_to" TEXT,
    "voucher_no" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT '2026-28';
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "payment_method" TEXT DEFAULT 'Cash';
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "expense_type" TEXT DEFAULT 'Daily';
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "paid_to" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "voucher_no" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "recorded_by" TEXT;

-- 12. DYNAMIC EXPENSE CATEGORY HEADS
CREATE TABLE IF NOT EXISTS "expense_heads" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT UNIQUE NOT NULL,
    "group_name" TEXT NOT NULL DEFAULT 'General Operating',
    "default_type" TEXT NOT NULL DEFAULT 'Daily',
    "is_custom" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 13. FEE TRANSACTIONS & VOUCHERS (LEDGER)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "fee_transactions" (
    "id" TEXT PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    "amount" NUMERIC NOT NULL,
    "payment_method" TEXT NOT NULL DEFAULT 'Cash',
    "receipt_id" TEXT,
    "description" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE "fee_transactions" ADD COLUMN IF NOT EXISTS "receipt_id" TEXT;
ALTER TABLE "fee_transactions" ADD COLUMN IF NOT EXISTS "recorded_by" TEXT;

-- 14. FEE PAYMENTS (HISTORY LOGS)
CREATE TABLE IF NOT EXISTS "fee_payments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "student_id" TEXT NOT NULL,
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

-- 15. INSTALLMENTS SCHEDULE
CREATE TABLE IF NOT EXISTS "installments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "student_id" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "paid_date" DATE,
    "amount_paid" NUMERIC DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 16. ACADEMIC RECORDS & TEST MARKS REGISTER
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "academic_records" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "student_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "test_name" TEXT NOT NULL,
    "test_type" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "subject" TEXT NOT NULL,
    "total_marks" NUMERIC NOT NULL,
    "obtained_marks" NUMERIC NOT NULL,
    "teacher_id" TEXT,
    "teacher_name" TEXT NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 17. STUDENT DAILY ATTENDANCE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "student_attendance" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "student_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE("student_id", "date")
);

-- ==============================================================================
-- 18. STAFF SALARY PAYMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "salary_payments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "staff_id" TEXT NOT NULL,
    "staff_name" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "payment_method" TEXT NOT NULL DEFAULT 'Cash',
    "status" TEXT NOT NULL DEFAULT 'Paid',
    "receipt_number" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 19. AUDIT TRAIL & SYSTEM NOTIFICATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    "type" TEXT NOT NULL DEFAULT 'info',
    "actor_name" TEXT NOT NULL DEFAULT 'System',
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 20. WHATSAPP BOT: DELEGATED ADMINS & VERIFICATION
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "bot_delegated_admins" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "staff_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT UNIQUE NOT NULL,
    "cnic" TEXT,
    "role_permissions" JSONB DEFAULT '[]'::jsonb,
    "passcode_hash" TEXT,
    "pin_last4" TEXT,
    "face_snapshot_url" TEXT,
    "voice_sample_url" TEXT,
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP WITH TIME ZONE,
    "status" TEXT DEFAULT 'pending_otp',
    "requires_face_reauth" BOOLEAN DEFAULT false,
    "delegated_by" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 21. WHATSAPP BOT: AUDIT & CHAT LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "bot_audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sender_phone" TEXT NOT NULL,
    "sender_name" TEXT,
    "sender_role" TEXT DEFAULT 'Guest',
    "message_type" TEXT DEFAULT 'text',
    "action_type" TEXT NOT NULL,
    "transcript" TEXT,
    "media_url" TEXT,
    "details" JSONB DEFAULT '{}'::jsonb,
    "status" TEXT DEFAULT 'success',
    "verification_level" TEXT DEFAULT 'none',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 22. AI DYNAMIC COLLEGE KNOWLEDGE BASE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "college_knowledge_base" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" JSONB DEFAULT '[]'::jsonb,
    "is_active" BOOLEAN DEFAULT true,
    "priority" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 23. AI UNANSWERED QUERIES REVIEW QUEUE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "ai_unanswered_queries" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sender_phone" TEXT NOT NULL,
    "sender_name" TEXT,
    "query" TEXT NOT NULL,
    "bot_confidence" NUMERIC DEFAULT 0,
    "attempted_response" TEXT,
    "approved_answer" TEXT,
    "status" TEXT DEFAULT 'pending',
    "admin_notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 24. AI CONTACT CONTEXT & CRM MEMORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "ai_contact_memories" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sender_phone" TEXT NOT NULL UNIQUE,
    "sender_name" TEXT,
    "student_id" TEXT,
    "interaction_summary" TEXT,
    "last_topic" TEXT,
    "sentiment" TEXT DEFAULT 'neutral',
    "last_interaction_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- PERFORMANCE INDEXES (FOR INSTANT QUERIES & ZERO LAG)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS "idx_students_admission_id" ON "students" ("admission_id");
CREATE INDEX IF NOT EXISTS "idx_students_college_no" ON "students" ("college_no");
CREATE INDEX IF NOT EXISTS "idx_students_contact" ON "students" ("contact");
CREATE INDEX IF NOT EXISTS "idx_students_session" ON "students" ("session");
CREATE INDEX IF NOT EXISTS "idx_admissions_student_id" ON "admissions" ("student_id");
CREATE INDEX IF NOT EXISTS "idx_admissions_college_no" ON "admissions" ("college_no");
CREATE INDEX IF NOT EXISTS "idx_admissions_contact" ON "admissions" ("contact_number");
CREATE INDEX IF NOT EXISTS "idx_leads_phone" ON "leads" ("father_phone");
CREATE INDEX IF NOT EXISTS "idx_staff_cnic" ON "staff" ("cnic");
CREATE INDEX IF NOT EXISTS "idx_income_student_id" ON "income" ("student_id");
CREATE INDEX IF NOT EXISTS "idx_income_date" ON "income" ("date");
CREATE INDEX IF NOT EXISTS "idx_expenses_date" ON "expenses" ("date");
CREATE INDEX IF NOT EXISTS "idx_fee_tx_student" ON "fee_transactions" ("student_id");
CREATE INDEX IF NOT EXISTS "idx_student_att_date" ON "student_attendance" ("date");
CREATE INDEX IF NOT EXISTS "idx_staff_att_date" ON "staff_attendance" ("date");
CREATE INDEX IF NOT EXISTS "idx_academic_rec_student" ON "academic_records" ("student_id");
CREATE INDEX IF NOT EXISTS "idx_bot_admin_phone" ON "bot_delegated_admins" ("phone");
CREATE INDEX IF NOT EXISTS "idx_bot_audit_phone" ON "bot_audit_logs" ("sender_phone");

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Enables full safe read/write access for authenticated and anon roles during operation

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'settings', 'permissions', 'leads', 'admissions', 'students',
        'staff', 'staff_attendance', 'staff_timetable', 'staff_advances',
        'income', 'expenses', 'expense_heads', 'fee_transactions',
        'fee_payments', 'installments', 'academic_records', 'student_attendance',
        'salary_payments', 'notifications', 'bot_delegated_admins',
        'bot_audit_logs', 'college_knowledge_base', 'ai_unanswered_queries',
        'ai_contact_memories'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Public Full Access" ON %I;', tbl);
            EXECUTE format('CREATE POLICY "Public Full Access" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl);
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Skip if table doesn't exist yet or other non-critical error
        END;
    END LOOP;
END $$;
