-- =========================================================================
-- SUPERIOR COLLEGE JAHANIAN - SECUGEN BIOMETRIC & ATTENDANCE UNIFIED SCHEMA
-- Migration: Non-Destructive Addition of Multi-Finger & 4-Stage Columns
-- =========================================================================

-- 1. Staff Table Multi-Finger Columns (Primary Thumb + Secondary Index)
ALTER TABLE IF EXISTS staff 
  ADD COLUMN IF NOT EXISTS primary_finger_template text,
  ADD COLUMN IF NOT EXISTS primary_finger_name text DEFAULT 'Right Thumb',
  ADD COLUMN IF NOT EXISTS secondary_finger_template text,
  ADD COLUMN IF NOT EXISTS secondary_finger_name text DEFAULT 'Right Index';

-- 2. Staff Attendance Table 4-Stage Columns, Hours, Scores, & WhatsApp Audit
ALTER TABLE IF EXISTS staff_attendance
  ADD COLUMN IF NOT EXISTS morning_in text,
  ADD COLUMN IF NOT EXISTS break_out text,
  ADD COLUMN IF NOT EXISTS break_in text,
  ADD COLUMN IF NOT EXISTS final_out text,
  ADD COLUMN IF NOT EXISTS total_hours numeric(5,2),
  ADD COLUMN IF NOT EXISTS match_score integer,
  ADD COLUMN IF NOT EXISTS stage text,
  ADD COLUMN IF NOT EXISTS operator_notes text,
  ADD COLUMN IF NOT EXISTS whatsapp_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_error text;

-- 3. Optimization Indexes for Fast Queries and Instant Realtime
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date_staff 
  ON staff_attendance(date, staff_id);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_whatsapp_status 
  ON staff_attendance(whatsapp_status);

-- 4. Enable Supabase Realtime Replication on staff_attendance if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'staff_attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE staff_attendance;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
