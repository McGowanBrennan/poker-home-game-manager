-- Migration: Add buy-in total tracking to reservations
-- Tracks total amount paid in by each player for bookkeeping
-- Date: October 30, 2025

-- Add owed_amount column to track total buy-ins
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS owed_amount DECIMAL(10, 2) DEFAULT 0.00;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reservations_owed_amount 
ON reservations(game_id, owed_amount);

-- Update existing reservations to 0.00 (no total by default)
UPDATE reservations 
SET owed_amount = 0.00 
WHERE owed_amount IS NULL;

COMMENT ON COLUMN reservations.owed_amount IS 'Total amount paid in by player (for bookkeeping)';

