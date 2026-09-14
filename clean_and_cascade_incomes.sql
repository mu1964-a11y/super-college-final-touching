-- ==============================================================================
-- POSTGRES DATABASE TRIGGERS: AUTOMATIC CASCADE DELETION FOR INCOMES
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor)
-- This guarantees that whether records are deleted from the UI, API, or DB Studio,
-- all linked income transactions and ledgers are automatically deleted.
-- ==============================================================================

-- 1. Index on income(student_id) and income(student_name) for ultra-fast queries and cascades
CREATE INDEX IF NOT EXISTS idx_income_student_id ON income(student_id);
CREATE INDEX IF NOT EXISTS idx_income_student_name ON income(student_name);

-- 2. Trigger Function: Delete Linked Incomes when Admission is Deleted
CREATE OR REPLACE FUNCTION trg_fn_delete_linked_income_admission()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all income records explicitly linked by admission id or student_id
  DELETE FROM income 
  WHERE student_id = OLD.id 
     OR (OLD.student_id IS NOT NULL AND student_id = OLD.student_id);

  -- Also delete any unlinked/legacy admission initial payments matching this applicant's name
  IF OLD.full_name IS NOT NULL AND OLD.full_name <> '' THEN
    DELETE FROM income 
    WHERE student_name = OLD.full_name 
      AND fee_type IN ('Admission / Initial Fee', 'Admission Fee / Initial Payment')
      AND (student_id IS NULL OR student_id = OLD.id OR student_id LIKE 'adm-%');
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_delete_linked_income_admission ON admissions;
CREATE TRIGGER trg_delete_linked_income_admission
AFTER DELETE ON admissions
FOR EACH ROW
EXECUTE FUNCTION trg_fn_delete_linked_income_admission();

-- 3. Trigger Function: Delete Linked Incomes when Student is Deleted
CREATE OR REPLACE FUNCTION trg_fn_delete_linked_income_student()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all income records explicitly linked by student id or admission_id
  DELETE FROM income 
  WHERE student_id = OLD.id 
     OR (OLD.admission_id IS NOT NULL AND student_id = OLD.admission_id);

  -- Also delete any legacy initial payment matching student's full name
  IF OLD.full_name IS NOT NULL AND OLD.full_name <> '' THEN
    DELETE FROM income 
    WHERE student_name = OLD.full_name 
      AND fee_type IN ('Admission / Initial Fee', 'Admission Fee / Initial Payment')
      AND (student_id IS NULL OR student_id = OLD.id);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_delete_linked_income_student ON students;
CREATE TRIGGER trg_delete_linked_income_student
AFTER DELETE ON students
FOR EACH ROW
EXECUTE FUNCTION trg_fn_delete_linked_income_student();

-- 4. Purge existing orphaned test entries (Safety Cleanup)
DELETE FROM income 
WHERE student_name ILIKE '%Ahmad Khattak (Demo)%'
   OR student_name ILIKE '%Uzair Akram%'
   OR (student_name ILIKE 'Fatima' AND date >= '2026-09-01' AND date <= '2026-09-30');
