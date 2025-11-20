# Multi-Table Tournament Feature

## Overview
This feature enables games with multiple tables, allowing tournaments to scale beyond the standard 8-seat capacity. Players can navigate between tables using left/right arrows at the bottom of the screen.

## Use Case
**Example**: A tournament with 24 players and 3 tables (8 seats each)
- Table 1: Seats 1-8
- Table 2: Seats 1-8  
- Table 3: Seats 1-8

Each table maintains its own independent seat reservations. When Table 1 fills up, players can navigate to Table 2 to reserve seats.

## Implementation

### Frontend Changes

#### `src/PokerTable.js`

**New State Variables:**
```javascript
const [gameConfig, setGameConfig] = useState(null);
const [currentTable, setCurrentTable] = useState(1);
```

**Key Changes:**
1. **Fetch game config** to determine number of tables
2. **Filter reservations by table** when fetching from API
3. **Include tableNumber** in all reservation requests
4. **Add dependency** `currentTable` to useEffect to refetch when table changes
5. **Navigation UI** conditionally renders when `numberOfTables > 1`

**Navigation Component:**
```jsx
{gameConfig && gameConfig.numberOfTables && gameConfig.numberOfTables > 1 && (
  <div className="table-navigation">
    <button onClick={() => setCurrentTable(prev => Math.max(1, prev - 1))}>
      ← Previous Table
    </button>
    <span>Table {currentTable} of {gameConfig.numberOfTables}</span>
    <button onClick={() => setCurrentTable(prev => Math.min(gameConfig.numberOfTables, prev + 1))}>
      Next Table →
    </button>
  </div>
)}
```

#### `src/App.css`

**New Styles:**
- `.table-navigation` - Container for navigation controls
- `.table-nav-btn` - Styled left/right arrow buttons
- `.table-indicator` - Current table display
- Responsive adjustments for mobile (stacks vertically)

**Key Features:**
- Golden gradient buttons matching theme
- Disabled state for first/last table
- Glass-morphism effect consistent with design
- Smooth transitions and hover effects

### Backend Changes

#### `server.js`

**Updated Endpoints:**

1. **GET `/api/games/:gameId/reservations`**
   - Now accepts `?tableNumber=X` query parameter
   - Defaults to table 1 if not specified
   - Filters reservations by both game_id and table_number

2. **POST `/api/games/:gameId/reservations`**
   - Accepts `tableNumber` in request body
   - Creates reservation for specific table
   - Checks seat availability per table (same seat can exist on multiple tables)

3. **DELETE `/api/games/:gameId/reservations/:seatId`**
   - Accepts `?tableNumber=X` query parameter
   - Removes reservation from specific table only

**Key Logic:**
```javascript
const table = parseInt(tableNumber) || 1;

// Query with table_number filter
await db.query(
  'SELECT seat_id, player_name FROM reservations WHERE game_id = $1 AND table_number = $2',
  [gameId, table]
);
```

### Database Changes

#### Migration: `database-migration-table-numbers.sql`

**Changes to `reservations` table:**

1. **Add `table_number` column**
   - Type: INTEGER NOT NULL DEFAULT 1
   - Defaults to 1 for single-table games

2. **Create indexes**
   - `idx_reservations_table_number` - on table_number
   - `idx_reservations_game_table` - composite on (game_id, table_number)

3. **Update unique constraint**
   - Old: `UNIQUE (game_id, seat_id)`
   - New: `UNIQUE (game_id, seat_id, table_number)`
   - Allows same seat number across different tables

## How It Works

### Creating a Multi-Table Game

1. User creates a game and opens the configuration modal
2. In tournament settings, user enters `numberOfTables > 1`
3. Config is saved to `gameConfigurations.json`:
```json
{
  "gameId": "ABC123",
  "gameType": "tournament",
  "numberOfTables": 3,
  "maxPlayers": 24,
  ...
}
```

### Viewing the Game

1. **Single Table Games (default)**
   - No navigation UI is shown
   - All reservations are on table 1
   - Works exactly as before

2. **Multi-Table Games**
   - Navigation UI appears at bottom
   - Shows "Table X of Y"
   - Left/Right buttons to navigate
   - Buttons disable at first/last table

### Reserving Seats

1. User navigates to desired table
2. Clicks "Reserve Seat" on available seat
3. Request includes `tableNumber: currentTable`
4. Seat is reserved for that specific table
5. Same seat number can be reserved on other tables

### Navigation Behavior

- **Poll for updates** continues every 2 seconds
- **Switching tables** triggers immediate refetch
- **Reservations are isolated** per table
- **Creator can remove players** from any table

## User Experience

### Visual Feedback

- **Arrow buttons** have clear hover/disabled states
- **Table indicator** shows current position clearly
- **Smooth transitions** when switching tables
- **Consistent styling** with poker theme

### Edge Cases Handled

1. **Single table games** - Navigation hidden, works as before
2. **First table** - Left arrow disabled
3. **Last table** - Right arrow disabled
4. **No config** - Defaults to single table behavior
5. **Invalid table numbers** - Backend defaults to table 1

## Benefits

1. **Scalability** - Support tournaments of any size
2. **Organization** - Players can find empty tables easily
3. **Backwards Compatible** - Single table games unchanged
4. **Performance** - Only fetch reservations for current table
5. **Flexibility** - Easy to add/adjust table count in config

## Future Enhancements

Potential improvements:
- **Table capacity indicator** - Show "5/8 seats filled"
- **Auto-navigation** - Jump to first table with empty seats
- **Table balancing** - Suggest table moves to balance player counts
- **Dealer assignment** - Assign dealers to specific tables
- **Tournament brackets** - Show tournament structure across tables
- **Blind levels** - Different blind levels per table (if desired)

## Testing Checklist

### Database
- [ ] Run `database-migration-table-numbers.sql` in Supabase
- [ ] Verify table_number column exists
- [ ] Verify indexes are created
- [ ] Verify unique constraint updated

### Single Table (Existing Behavior)
- [ ] Create cash game (no numberOfTables set)
- [ ] Verify no navigation UI appears
- [ ] Reserve seats - should work as before
- [ ] Remove seats - should work as before

### Multi-Table (New Feature)
- [ ] Create tournament with numberOfTables = 3
- [ ] Verify navigation UI appears
- [ ] Navigate to Table 2, reserve a seat
- [ ] Navigate to Table 3, reserve a seat
- [ ] Navigate back to Table 1, verify different reservations
- [ ] Fill Table 1 completely (8 seats)
- [ ] Navigate to Table 2, verify seats available
- [ ] Remove player from Table 2 (as creator)
- [ ] Verify player still on Table 1 if they reserved there

### Edge Cases
- [ ] First table - left arrow disabled
- [ ] Last table - right arrow disabled
- [ ] Non-signed-in user can reserve seats
- [ ] Creator can remove players from any table
- [ ] Switching tables while polling continues

### Mobile Responsive
- [ ] Navigation stacks vertically on mobile
- [ ] Buttons are thumb-friendly
- [ ] Table indicator readable

