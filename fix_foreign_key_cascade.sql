-- Fix foreign key constraint on students table so deleting admissions cascades cleanly
-- Execute this in Supabase SQL Editor if you want database-level automatic cascade:

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_admission_id_fkey;

ALTER TABLE students 
ADD CONSTRAINT students_admission_id_fkey 
FOREIGN KEY (admission_id) 
REFERENCES admissions(id) 
ON DELETE CASCADE;
