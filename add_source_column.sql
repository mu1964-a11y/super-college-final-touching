-- ==============================================================================
-- ADD SOURCE COLUMN TO LEADS & ADMISSIONS TABLES (SUPERIOR COLLEGE JAHANIAN)
-- ==============================================================================
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This allows tracking whether a lead came from Website Form, WhatsApp AI, Campus Desk, etc.
-- ==============================================================================

-- 1. Add 'source' column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Campus Desk';

-- 2. Add 'source' column to admissions table
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Campus Desk';

-- 3. Create index for fast filtering by lead source
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_admissions_source ON admissions(source);

-- 4. Enable public (anonymous) insert policy so website form can directly post to leads
-- (Note: They can ONLY insert new records, they cannot read or delete existing leads)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'leads' AND policyname = 'Public website can insert leads'
  ) THEN
    CREATE POLICY "Public website can insert leads" 
    ON leads FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);
  END IF;
END $$;
