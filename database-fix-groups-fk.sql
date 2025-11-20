-- Fix groups foreign key constraint
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Check current foreign key constraints on groups table
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='groups';

-- Step 2: Drop the existing foreign key constraint
ALTER TABLE groups DROP CONSTRAINT IF EXISTS fk_groups_user;

-- Step 3: Modify created_by column to be flexible (VARCHAR to store email or username)
-- It should already be VARCHAR, but let's ensure it's the right size
ALTER TABLE groups ALTER COLUMN created_by TYPE VARCHAR(255);

-- Step 4: Optionally add back a foreign key if needed (commented out by default)
-- If you want to enforce that created_by must reference a valid user:
-- You'll need to decide what column to reference. Options:
-- A) Reference email (but email can be NULL now with username support)
-- ALTER TABLE groups ADD CONSTRAINT fk_groups_user 
--   FOREIGN KEY (created_by) REFERENCES users(email) ON DELETE CASCADE;
-- 
-- B) Reference username (but username can be NULL with email-only accounts)
-- ALTER TABLE groups ADD CONSTRAINT fk_groups_user 
--   FOREIGN KEY (created_by) REFERENCES users(username) ON DELETE CASCADE;
--
-- C) Don't add foreign key constraint - just store email/username as a string
--    (RECOMMENDED for flexibility with both email and username logins)

-- Verification: Check that the constraint has been removed
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='groups';

