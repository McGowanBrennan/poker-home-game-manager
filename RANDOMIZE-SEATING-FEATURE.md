# Randomize Seating Feature

## Overview
The **Randomize Seating** feature allows game creators to shuffle all reserved players and redistribute them evenly across multiple tables. This is particularly useful for tournament games to create balanced tables and ensure fair seating arrangements.

## Feature Highlights
- 🎲 **Randomization**: Uses Fisher-Yates shuffle algorithm for truly random seating
- ⚖️ **Balanced Tables**: Automatically distributes players evenly across tables
- 🔒 **Creator Only**: Only the game creator can randomize seating
- ✅ **Confirmation**: Requires user confirmation before shuffling
- 🔄 **Multi-Table Support**: Works seamlessly with 1 or more tables

## How It Works

### Algorithm
1. **Fetch all reservations** for the game across all tables
2. **Shuffle players** using Fisher-Yates algorithm
3. **Calculate balanced distribution**:
   - Base players per table = `floor(totalPlayers / numberOfTables)`
   - Remainder = `totalPlayers % numberOfTables`
   - First `remainder` tables get `base + 1` players
   - Remaining tables get `base` players
4. **Delete all existing reservations**
5. **Redistribute players** to new seats across tables

### Examples

#### Example 1: 14 players, 2 tables
- Table 1: 7 players (seats 1-7)
- Table 2: 7 players (seats 1-7)

#### Example 2: 15 players, 2 tables
- Table 1: 8 players (seats 1-8)
- Table 2: 7 players (seats 1-7)

#### Example 3: 22 players, 3 tables
- Table 1: 8 players (seats 1-8)
- Table 2: 7 players (seats 1-7)
- Table 3: 7 players (seats 1-7)

#### Example 4: 24 players, 3 tables
- Table 1: 8 players (seats 1-8)
- Table 2: 8 players (seats 1-8)
- Table 3: 8 players (seats 1-8)

## User Interface

### Button Location
- **Location**: Game header, next to the "Game Code" button
- **Visibility**: Only visible to the game creator
- **Style**: Purple gradient button with 🔀 icon

### Confirmation Dialog
```
Are you sure you want to randomize the seating chart?
This will shuffle all players and redistribute them evenly across tables.
```

### Success Message
```
Seating randomized! {totalPlayers} players distributed across {numberOfTables} table(s).
```

## Backend Implementation

### Endpoint
```
POST /api/games/:gameId/randomize-seating
```

### Request Body
```json
{
  "userEmail": "user@example.com",
  "numberOfTables": 2
}
```

### Response
```json
{
  "success": true,
  "message": "Seating randomized successfully",
  "tables": {
    "1": {
      "1": "Player A",
      "2": "Player B",
      ...
    },
    "2": {
      "1": "Player C",
      "2": "Player D",
      ...
    }
  },
  "totalPlayers": 14
}
```

### Authorization
- Requires `userEmail` in request body
- Validates user is the game creator
- Returns 401 if not authenticated
- Returns 403 if not the creator

## Files Modified

### Backend
- **`server.js`**: Added `/api/games/:gameId/randomize-seating` endpoint

### Frontend
- **`src/PokerTable.js`**: 
  - Added `handleRandomizeSeating()` function
  - Added randomize button in game header
  - Only displays for game creator

### Styling
- **`src/App.css`**:
  - Added `.randomize-seating-btn` styles
  - Added mobile responsive styles
  - Purple gradient theme to distinguish from other buttons

## Technical Details

### Fisher-Yates Shuffle Algorithm
```javascript
const shuffled = [...players];
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}
```

### Distribution Calculation
```javascript
const totalPlayers = shuffled.length;
const basePerTable = Math.floor(totalPlayers / numTables);
const remainder = totalPlayers % numTables;

for (let tableNum = 1; tableNum <= numTables; tableNum++) {
  const playersForThisTable = basePerTable + (tableNum <= remainder ? 1 : 0);
  // Assign players to this table
}
```

## Use Cases

### Tournament Setup
1. Players reserve their preferred seats
2. Game creator reviews the seating
3. Creator clicks "Randomize Seating" before tournament start
4. All players are shuffled and balanced across tables

### Fair Distribution
- Prevents friends from sitting together (if desired)
- Creates balanced tables for fair play
- Ensures no table has significantly more or fewer players

### Re-Randomization
- Can be clicked multiple times if needed
- Each click creates a new random arrangement
- Useful for creating fair brackets or heats

## Security

### Access Control
- ✅ Only game creator can randomize
- ✅ Requires authentication
- ✅ Validates game exists
- ✅ User confirmation required

### Data Integrity
- All operations wrapped in try-catch
- Database rollback on error
- Real-time updates via polling
- Preserves player names during shuffle

## Mobile Responsiveness

### Responsive Design
- Button stacks vertically on mobile (< 768px)
- Full width on small screens
- Smaller font size for readability
- Touch-friendly button size

## Future Enhancements (Potential)
- [ ] Undo randomization
- [ ] Lock specific players to tables/seats
- [ ] Custom balancing rules
- [ ] Animation showing shuffle in progress
- [ ] History of randomization events
- [ ] Option to randomize specific tables only

## Testing Scenarios

### Test Case 1: Single Table
- Create game with 1 table, 8 players
- Randomize → All 8 players shuffled on table 1

### Test Case 2: Balanced Distribution
- Create game with 2 tables, 10 players
- Randomize → 5 players per table

### Test Case 3: Unbalanced Distribution
- Create game with 3 tables, 20 players
- Randomize → Tables get 7, 7, 6 players

### Test Case 4: Authorization
- Non-creator tries to randomize → Error 403
- Unauthenticated user → Error 401

### Test Case 5: Empty Game
- Randomize with no players → Success message, no changes

## Related Features
- Multi-table navigation (switch between tables)
- Game configuration (set number of tables)
- Reservation system (player seat reservations)

