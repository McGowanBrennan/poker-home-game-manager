-- Complete migration for Groups refactor
-- Run this SQL in your Supabase SQL Editor
-- This combines the foreign key fix and user_code column addition

-- ========================================
-- PART 1: Fix foreign key constraint on groups table
-- ========================================

-- Drop the existing foreign key constraint that's blocking group creation
ALTER TABLE groups DROP CONSTRAINT IF EXISTS fk_groups_user;

-- Modify created_by column to be flexible (VARCHAR to store email or username)
ALTER TABLE groups ALTER COLUMN created_by TYPE VARCHAR(255);

-- ========================================
-- PART 2: Add user_code to group_players table
-- ========================================

-- Add user_code column to group_players table
ALTER TABLE group_players ADD COLUMN IF NOT EXISTS user_code VARCHAR(8);

-- Create index on user_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_group_players_user_code ON group_players(user_code);

-- Add foreign key constraint to ensure user_code exists in users table
ALTER TABLE group_players 
ADD CONSTRAINT fk_group_players_user_code 
FOREIGN KEY (user_code) REFERENCES users(user_code) ON DELETE CASCADE;

-- Make name nullable since we'll fetch it from users table
ALTER TABLE group_players ALTER COLUMN name DROP NOT NULL;

-- Drop the old phone_number column if it exists (no longer needed)
ALTER TABLE group_players DROP COLUMN IF EXISTS phone_number;

-- ========================================
-- VERIFICATION
-- ========================================

-- Verify groups table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'groups'
ORDER BY ordinal_position;

-- Verify group_players table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'group_players'
ORDER BY ordinal_position;

-- Verify foreign key constraints
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
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('groups', 'group_players');

