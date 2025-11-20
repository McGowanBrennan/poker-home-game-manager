-- Migration: Add config column to games table
-- This stores game configuration data (game type, tournament settings, blind structures, etc.)
-- Previously stored in gameConfigurations.json

-- Add config column as JSONB for flexible storage
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Create index for faster config queries
CREATE INDEX IF NOT EXISTS idx_games_config ON games USING gin(config);

-- Create index for tournament status queries
CREATE INDEX IF NOT EXISTS idx_games_tournament_status ON games ((config->>'tournamentStatus'));

-- Create index for game type queries
CREATE INDEX IF NOT EXISTS idx_games_game_type ON games ((config->>'gameType'));

COMMENT ON COLUMN games.config IS 'Game configuration including type, tournament settings, blind structures, and status';

