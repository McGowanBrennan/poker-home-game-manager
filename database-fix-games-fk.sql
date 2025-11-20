-- Fix games foreign key constraint
-- Run this SQL in your Supabase SQL Editor

-- This fixes the issue where the games table has a foreign key constraint
-- that doesn't work with our username/email flexible login system

-- Step 1: Check current foreign key constraints on games table
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
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='games';

-- Step 2: Drop the existing foreign key constraint
ALTER TABLE games DROP CONSTRAINT IF EXISTS fk_games_user;

-- Step 3: Modify created_by column to be flexible (VARCHAR to store email or username)
-- It should already be VARCHAR, but let's ensure it's the right size
ALTER TABLE games ALTER COLUMN created_by TYPE VARCHAR(255);

-- Note: We're NOT adding the foreign key back because:
-- - created_by can be either an email OR a username
-- - This provides flexibility for our authentication system
-- - The application layer handles validation

-- Verification: Check that the constraint has been removed
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='games';

