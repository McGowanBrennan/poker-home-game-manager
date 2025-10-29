# Game Configurations Implementation

## Overview
Game configurations are stored locally in JSON files for development flexibility. This allows the schema to evolve without database migrations until the final design is determined.

## Local File Storage

### Files Created

**`gameConfigurations.json`** - Stores all game configurations with gameId references
```json
{
  "config_id_1": {
    "gameId": "GAME123",
    "gameType": "cash",
    "maxPlayers": 10,
    "numberOfTables": 2,
    "pokerType": "NLH",
    "smallBlind": "$1",
    "bigBlind": "$2",
    "createdAt": "2025-10-29T12:00:00.000Z"
  },
  "config_id_2": {
    "gameId": "GAME456",
    "gameType": "tournament",
    "maxPlayers": 50,
    "numberOfTables": 5,
    "buyInAmount": "$100",
    "tournamentType": "PKO",
    "enableRebuys": true,
    "createdAt": "2025-10-29T14:00:00.000Z"
  }
}
```

### Gitignore
The config file is added to `.gitignore` to keep local data out of version control:
```
gameConfigurations.json
```

## Current Config Structure

The frontend sends config as a JSON object:

```javascript
{
  gameType: 'cash' | 'tournament',
  maxPlayers: 10,
  numberOfTables: 1,
  
  // Cash game specific
  pokerType: 'NLH' | 'PLO' | 'Mixed',
  smallBlind: '$0.50',
  bigBlind: '$1.00',
  
  // Tournament specific
  buyInAmount: '$50',
  tournamentType: 'Standard' | 'PKO' | 'Mystery Bounty' | 'Freezeout',
  enableRebuys: true
}
```

## API Endpoints

### Create Game (POST /api/games)
**Request:**
```json
{
  "name": "Friday Night Poker",
  "createdBy": "user@example.com",
  "gameDateTime": "2025-10-29 19:00:00",
  "note": "Bring snacks",
  "config": {
    "gameType": "cash",
    "maxPlayers": 10,
    "numberOfTables": 2,
    "pokerType": "NLH",
    "smallBlind": "$1",
    "bigBlind": "$2"
  }
}
```

**Response:**
```json
{
  "message": "Game created successfully",
  "game": {
    "id": "ABC123",
    "name": "Friday Night Poker",
    "createdBy": "user@example.com",
    "gameDateTime": "2025-10-29T19:00:00.000Z",
    "note": "Bring snacks",
    "configId": "a1b2c3d4e5f6g7h8",
    "reservations": {}
  }
}
```

### Get Games (GET /api/games)
Returns games with their configurations:
```json
[
  {
    "id": "ABC123",
    "name": "Friday Night Poker",
    "createdBy": "user@example.com",
    "createdAt": "2025-10-29T12:00:00.000Z",
    "gameDateTime": "2025-10-29T19:00:00.000Z",
    "note": "Bring snacks",
    "config": {
      "gameType": "cash",
      "maxPlayers": 10,
      "numberOfTables": 2,
      "pokerType": "NLH",
      "smallBlind": "$1",
      "bigBlind": "$2",
      "createdAt": "2025-10-29T12:00:00.000Z"
    }
  }
]
```

### Get Specific Game (GET /api/games/:gameId)
Returns a single game with its configuration (same structure as above).

### Delete Game (DELETE /api/games/:gameId)
Deletes the game and cleans up:
- Game record from database
- All reservations
- Config from `gameConfigurations.json`
- Mapping from `gameConfigMappings.json`

## Implementation Details

### Backend (server.js)

**Helper Functions:**
```javascript
// Generate unique config ID
function generateConfigId()

// Read/write config files
async function readGameConfigs()
async function writeGameConfigs(configs)
```

**Create Game Flow:**
1. Validate game name and creator
2. Generate game ID
3. If config provided:
   - Generate config ID
   - Add `gameId` to config object
   - Save config to `gameConfigurations.json`
4. Create game record in database (no config field needed)
5. Return game with configId

**Fetch Games Flow:**
1. Query games from database
2. Load configs from `gameConfigurations.json`
3. For each game, find config by matching `gameId` property
4. Attach config to game object
5. Return games with configs

**Delete Game Flow:**
1. Delete from database
2. Load configs from `gameConfigurations.json`
3. Find configId by searching for config with matching `gameId`
4. Delete config from `gameConfigurations.json`

### Frontend (GameManagement.js)

The frontend collects configuration through the modal and passes it to the backend:
- Game type selection (Cash/Tournament)
- Type-specific settings
- All config bundled in `config` object

## Future Database Migration

When the design is finalized, you can migrate to a proper database table:

### Option 1: Create `game_configurations` Table

```sql
CREATE TABLE game_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type VARCHAR(20) NOT NULL,
  max_players INTEGER NOT NULL,
  number_of_tables INTEGER NOT NULL,
  
  -- Cash game fields
  poker_type VARCHAR(20),
  small_blind VARCHAR(20),
  big_blind VARCHAR(20),
  
  -- Tournament fields
  buy_in_amount VARCHAR(20),
  tournament_type VARCHAR(30),
  enable_rebuys BOOLEAN,
  
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE games ADD COLUMN config_id UUID REFERENCES game_configurations(id);
```

### Option 2: Add Columns to `games` Table

```sql
ALTER TABLE games
  ADD COLUMN game_type VARCHAR(20),
  ADD COLUMN max_players INTEGER,
  ADD COLUMN number_of_tables INTEGER,
  ADD COLUMN poker_type VARCHAR(20),
  ADD COLUMN small_blind VARCHAR(20),
  ADD COLUMN big_blind VARCHAR(20),
  ADD COLUMN buy_in_amount VARCHAR(20),
  ADD COLUMN tournament_type VARCHAR(30),
  ADD COLUMN enable_rebuys BOOLEAN;
```

### Migration Script

To migrate from JSON to database:

```javascript
const configs = await readGameConfigs();

for (const [configId, config] of Object.entries(configs)) {
  const { gameId, gameType, maxPlayers, ...restConfig } = config;
  
  // Insert into game_configurations table
  const result = await db.query(
    'INSERT INTO game_configurations (game_type, max_players, ...) VALUES ($1, $2, ...) RETURNING id',
    [gameType, maxPlayers, ...]
  );
  
  // Update games table with config_id
  await db.query(
    'UPDATE games SET config_id = $1 WHERE id = $2',
    [result.rows[0].id, gameId]
  );
}
```

## Benefits of This Approach

1. **No Database Changes:** Work without altering the database schema
2. **Flexibility:** Easily modify config structure during development
3. **Version Control:** Configs can be tracked in git (if desired)
4. **Easy Migration:** Clear path to database when ready
5. **Separation of Concerns:** Configs are logically separated
6. **Rapid Iteration:** Test different config structures quickly

## Development Notes

- The JSON file will be created automatically when the first game with config is created
- The file is in `.gitignore` by default to keep local data out of version control
- Each config includes a `gameId` property to reference the associated game
- If you want to track example configs, create `gameConfigurations.example.json`
- Configs are automatically cleaned up when games are deleted

## Testing Checklist

- [ ] Create a cash game with config
- [ ] Create a tournament with config
- [ ] Create a game without config (should work fine)
- [ ] Fetch games and verify configs are returned
- [ ] Delete a game and verify config is cleaned up
- [ ] Restart server and verify configs persist
