-- Migration: Add buy-in tracking to reservations
-- This allows tracking which players have paid their tournament buy-in
-- Date: October 30, 2025

-- Add paid_buyin column to track if player has paid
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS paid_buyin BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on paid status
CREATE INDEX IF NOT EXISTS idx_reservations_paid_buyin 
ON reservations(game_id, paid_buyin);

-- Update existing reservations to FALSE (unpaid by default)
UPDATE reservations 
SET paid_buyin = FALSE 
WHERE paid_buyin IS NULL;

COMMENT ON COLUMN reservations.paid_buyin IS 'Tracks if player has paid tournament buy-in';

