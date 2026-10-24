-- ==============================================================================
-- SUPERIOR COLLEGE JAHANIAN (SGC-J) — FULL SCHEMA SYNC & CACHE RELOAD
-- ==============================================================================
-- Safe & Idempotent: Uses "ADD COLUMN IF NOT EXISTS" so zero existing data is lost.
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query -> Run.
-- ==============================================================================

-- 1. ADMISSIONS TABLE (Add any missing columns used by the app)
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "total_installments" INTEGER DEFAULT 12;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "total_semesters" INTEGER DEFAULT 4;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "date_applied" DATE DEFAULT CURRENT_DATE;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "photo" TEXT;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "group" TEXT;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "group_name" TEXT;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "program_type" TEXT DEFAULT 'Yearly';
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "current_semester" INTEGER DEFAULT 1;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "academic_part" TEXT DEFAULT 'Part-1';
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "session_start_date" DATE;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "session_end_date" DATE;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "secondary_contact" TEXT;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "concession_reason" TEXT;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'Campus Desk';
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "fee_ledger" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "fee_history" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "fingerprint_template" TEXT;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "fingerprint_finger" TEXT;
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "fingerprint_enrolled_at" TIMESTAMP WITH TIME ZONE;

-- 2. STUDENTS TABLE (Add any missing columns used by the app)
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "total_installments" INTEGER DEFAULT 12;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "total_semesters" INTEGER DEFAULT 4;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "program_type" TEXT DEFAULT 'Yearly';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "current_semester" INTEGER DEFAULT 1;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "academic_part" TEXT DEFAULT 'Part-1';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "session_start_date" DATE;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "session_end_date" DATE;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "father_contact" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "secondary_contact" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "concession_reason" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "photo" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "group" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "group_name" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "fee_ledger" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "fee_history" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "fingerprint_template" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "fingerprint_finger" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "fingerprint_enrolled_at" TIMESTAMP WITH TIME ZONE;

-- 3. LEADS TABLE
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "package" NUMERIC DEFAULT 0;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "finalized_fee" NUMERIC DEFAULT 0;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "pipeline_stage" TEXT DEFAULT 'new';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "follow_up_date" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'Campus Desk';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "extra_info1" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "extra_info2" TEXT;

-- 4. STAFF & BIOMETRIC ATTENDANCE TABLES
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "designation" TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "base_salary" NUMERIC DEFAULT 0;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "photo" TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "fingerprint_template" TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "fingerprint_finger" TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "fingerprint_enrolled_at" TIMESTAMP WITH TIME ZONE;

ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "check_in" TIME;
ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "check_out" TIME;
ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "check_in_time" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "check_out_time" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "snapshot_url" TEXT;
ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "verification_method" TEXT DEFAULT 'face_biometric';
ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- 5. INCOME & EXPENSES TABLES
ALTER TABLE "income" ADD COLUMN IF NOT EXISTS "payment_method" TEXT DEFAULT 'Cash';
ALTER TABLE "income" ADD COLUMN IF NOT EXISTS "recorded_by" TEXT;
ALTER TABLE "income" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT '2026-28';
ALTER TABLE "income" ADD COLUMN IF NOT EXISTS "receipt_id" TEXT;
ALTER TABLE "income" ADD COLUMN IF NOT EXISTS "photo" TEXT;
ALTER TABLE "income" ADD COLUMN IF NOT EXISTS "gender" TEXT;

ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "added_by" TEXT DEFAULT 'Admin';
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "recorded_by" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "payment_method" TEXT DEFAULT 'Cash';
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT '2026-28';
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "expense_type" TEXT DEFAULT 'Daily';
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "paid_to" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "voucher_no" TEXT;

-- 6. ACADEMIC RECORDS & STUDENT ATTENDANCE TABLES
ALTER TABLE "academic_records" ADD COLUMN IF NOT EXISTS "class" TEXT;
ALTER TABLE "academic_records" ADD COLUMN IF NOT EXISTS "section" TEXT DEFAULT 'A';
ALTER TABLE "academic_records" ADD COLUMN IF NOT EXISTS "test_name" TEXT;
ALTER TABLE "academic_records" ADD COLUMN IF NOT EXISTS "test_type" TEXT DEFAULT 'Monthly';
ALTER TABLE "academic_records" ADD COLUMN IF NOT EXISTS "teacher_id" TEXT;
ALTER TABLE "academic_records" ADD COLUMN IF NOT EXISTS "teacher_name" TEXT;
ALTER TABLE "academic_records" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
ALTER TABLE "academic_records" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT '2026-28';

ALTER TABLE "student_attendance" ADD COLUMN IF NOT EXISTS "check_in_time" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "student_attendance" ADD COLUMN IF NOT EXISTS "check_out_time" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "student_attendance" ADD COLUMN IF NOT EXISTS "snapshot_url" TEXT;
ALTER TABLE "student_attendance" ADD COLUMN IF NOT EXISTS "verification_method" TEXT DEFAULT 'manual';
ALTER TABLE "student_attendance" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- 7. SETTINGS TABLE
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "config" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "enabled_modules" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 8. FORCE RELOAD POSTGREST SCHEMA CACHE IMMEDIATELY
NOTIFY pgrst, 'reload schema';
