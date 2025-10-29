-- Migration: Update group_players to use user_code instead of name/phone
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add user_code column to group_players table
ALTER TABLE group_players ADD COLUMN IF NOT EXISTS user_code VARCHAR(8);

-- Step 2: Create index on user_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_group_players_user_code ON group_players(user_code);

-- Step 3: Add foreign key constraint to ensure user_code exists in users table
ALTER TABLE group_players 
ADD CONSTRAINT fk_group_players_user_code 
FOREIGN KEY (user_code) REFERENCES users(user_code) ON DELETE CASCADE;

-- Step 4: Make name nullable since we'll fetch it from users table
ALTER TABLE group_players ALTER COLUMN name DROP NOT NULL;

-- Step 5: Make user_code required
-- Note: Do this AFTER existing data is migrated/cleaned
-- ALTER TABLE group_players ALTER COLUMN user_code SET NOT NULL;

-- Verification: Check the updated structure
SELECT * FROM group_players LIMIT 5;

-- Note: After migration, the flow will be:
-- 1. User enters their user_code when joining a group
-- 2. Backend validates the code exists in users table
-- 3. Display name is fetched from users table using the code
-- 4. Groups can show members with their actual user accounts

