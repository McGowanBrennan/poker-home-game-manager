-- Migration: Add username support to users table
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Make email column nullable (to allow username-only signups)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Step 2: Add username column to users table (allow NULL for existing users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(20) UNIQUE;

-- Step 3: Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Step 4: Add a constraint to ensure at least one identifier exists
ALTER TABLE users ADD CONSTRAINT users_identifier_check 
  CHECK (email IS NOT NULL OR username IS NOT NULL);

-- Optional: Update any existing users to have a username based on their email (if needed)
-- UPDATE users SET username = split_part(email, '@', 1) WHERE username IS NULL AND email IS NOT NULL;

-- Note: Users must have either an email, username, or both (enforced by constraint)

