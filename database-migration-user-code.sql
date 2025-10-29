-- Migration: Add user_code to users table
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add user_code column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_code VARCHAR(8) UNIQUE;

-- Step 2: Create index on user_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_user_code ON users(user_code);

-- Step 3: Generate unique codes for existing users (8 random alphanumeric characters)
-- Note: You may want to run this in batches if you have many users
DO $$
DECLARE
    user_record RECORD;
    new_code VARCHAR(8);
    code_exists BOOLEAN;
BEGIN
    FOR user_record IN SELECT id FROM users WHERE user_code IS NULL LOOP
        LOOP
            -- Generate a random 8-character code (uppercase letters and numbers)
            new_code := UPPER(
                substring(md5(random()::text || clock_timestamp()::text) from 1 for 8)
            );
            
            -- Check if code already exists
            SELECT EXISTS(SELECT 1 FROM users WHERE user_code = new_code) INTO code_exists;
            
            -- Exit loop if code is unique
            EXIT WHEN NOT code_exists;
        END LOOP;
        
        -- Update user with unique code
        UPDATE users SET user_code = new_code WHERE id = user_record.id;
    END LOOP;
END $$;

-- Step 4: Make user_code NOT NULL after all existing users have codes
ALTER TABLE users ALTER COLUMN user_code SET NOT NULL;

-- Verification: Check that all users have unique codes
SELECT COUNT(*), COUNT(DISTINCT user_code) FROM users;

