-- Migration: Create saved_blind_structures table
-- Stores user's saved tournament blind structures
-- Previously stored in localStorage

CREATE TABLE IF NOT EXISTS saved_blind_structures (
  id SERIAL PRIMARY KEY,
  user_identifier VARCHAR(255) NOT NULL,  -- email or username
  structure_name VARCHAR(255) NOT NULL,
  blind_levels JSONB NOT NULL,  -- Array of blind levels
  enable_bb_antes BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_blind_structures_user ON saved_blind_structures(user_identifier);

-- Index for name searches
CREATE INDEX IF NOT EXISTS idx_blind_structures_name ON saved_blind_structures(user_identifier, structure_name);

-- Unique constraint: user can't have duplicate structure names
CREATE UNIQUE INDEX IF NOT EXISTS idx_blind_structures_unique_name 
ON saved_blind_structures(user_identifier, structure_name);

COMMENT ON TABLE saved_blind_structures IS 'User-saved tournament blind structures for reuse';
COMMENT ON COLUMN saved_blind_structures.user_identifier IS 'Email or username of the structure owner';
COMMENT ON COLUMN saved_blind_structures.blind_levels IS 'Array of blind level objects with smallBlind, bigBlind, duration, etc.';

