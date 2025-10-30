-- Migration: Add add-on tracking to reservations
-- This allows tracking which players have purchased tournament add-ons
-- Date: October 30, 2025

-- Add addon_purchased column to track if player purchased add-on
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS addon_purchased BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on add-on status
CREATE INDEX IF NOT EXISTS idx_reservations_addon_purchased
ON reservations(game_id, addon_purchased);

-- Update existing reservations to FALSE (no add-on by default)
UPDATE reservations
SET addon_purchased = FALSE
WHERE addon_purchased IS NULL;

COMMENT ON COLUMN reservations.addon_purchased IS 'Tracks if player has purchased tournament add-on';

