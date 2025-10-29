-- Migration: Add table_number support for multi-table tournaments
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add table_number column to reservations table (default 1 for existing reservations)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS table_number INTEGER NOT NULL DEFAULT 1;

-- Step 2: Create index on table_number for faster queries
CREATE INDEX IF NOT EXISTS idx_reservations_table_number ON reservations(table_number);

-- Step 3: Create composite index for common query pattern (game_id + table_number)
CREATE INDEX IF NOT EXISTS idx_reservations_game_table ON reservations(game_id, table_number);

-- Step 4: Update the unique constraint to include table_number
-- First, drop ALL old constraints if they exist
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_game_id_seat_id_key;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS unique_game_seat;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_game_table_seat_unique;

-- Add new unique constraint that includes table_number
-- This allows the same seat number to be used on different tables
ALTER TABLE reservations ADD CONSTRAINT reservations_game_table_seat_unique 
  UNIQUE (game_id, seat_id, table_number);

-- Verification: Check the updated structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'reservations'
ORDER BY ordinal_position;

-- Verification: Check constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'reservations'::regclass;

