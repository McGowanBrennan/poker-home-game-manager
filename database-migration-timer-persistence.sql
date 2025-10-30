-- Migration: Add tournament timer persistence to games table
-- This allows the timer state to persist across page refreshes and player sessions
-- Date: October 30, 2025

-- Add timer state columns to games table
ALTER TABLE games
ADD COLUMN IF NOT EXISTS current_blind_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_remaining_seconds INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS timer_running BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS timer_paused BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS timer_last_update TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster queries on timer state
CREATE INDEX IF NOT EXISTS idx_games_timer_state
ON games(id, timer_running, timer_paused);

-- Add comments for clarity
COMMENT ON COLUMN games.current_blind_level IS 'Current blind level index (0-based) for tournament';
COMMENT ON COLUMN games.time_remaining_seconds IS 'Seconds remaining in current blind level';
COMMENT ON COLUMN games.timer_running IS 'Whether tournament timer is actively running';
COMMENT ON COLUMN games.timer_paused IS 'Whether tournament timer is paused by manager';
COMMENT ON COLUMN games.timer_last_update IS 'Last time timer state was updated (for sync verification)';

