# Buy-In Tracking & Prize Pool Feature 💰

Tournament organizers can now track which players have paid their buy-ins and display a real-time prize pool!

## 🎯 Feature Overview

### What It Does
- Game creators can mark players as "Paid" during tournament registration
- Prize pool automatically calculates: `Number of Paid Players × Buy-In Amount`
- Prize pool displays prominently in the center of the table
- Only visible during "Registering" status

### Who Can Use It
- **Game Creators Only**: Mark players as paid/unpaid
- **All Players**: View the prize pool

## 📋 How To Use

### For Game Creators

1. **Create a Tournament** with a buy-in amount
2. **Players Reserve Seats** (or you seat them manually)
3. **Mark Players as Paid**:
   - Each reserved seat shows a "Paid" checkbox
   - Check the box when a player pays their buy-in
   - Uncheck if they need a refund or didn't pay
4. **Watch Prize Pool Grow**:
   - Prize pool updates automatically
   - Displays below the "Registering" status button

### For Players

1. **Join a tournament table**
2. **View the prize pool** in the center of the table
3. **See who's paid** (if you're the game creator)

## 🛠️ Technical Implementation

### Database Changes

**New Column:** `paid_buyin` in `reservations` table
- Type: `BOOLEAN`
- Default: `FALSE`
- Indexed for fast queries

**Migration File:** `database-migration-buyin-tracking.sql`

### Backend API

**New Endpoint:** `PATCH /api/games/:gameId/reservations/:seatId/paid`

Request:
```json
{
  "userEmail": "creator@example.com",
  "tableNumber": 1,
  "paid": true
}
```

Response:
```json
{
  "success": true,
  "message": "Player marked as paid",
  "reservation": {
    "seatId": "1",
    "playerName": "John",
    "paidBuyin": true
  }
}
```

**Modified Endpoint:** `GET /api/games/:gameId/reservations`

Now returns:
```json
{
  "1": {
    "playerName": "John",
    "paidBuyin": true
  },
  "2": {
    "playerName": "Jane",
    "paidBuyin": false
  }
}
```

Previously returned:
```json
{
  "1": "John",
  "2": "Jane"
}
```

### Frontend Changes

**PokerTable.js:**
1. `handleMarkPaid()` - API call to update paid status
2. `calculatePrizePool()` - Calculates total prize pool
3. Updated reservation format handling (object instead of string)
4. Checkbox UI for each reserved seat
5. Prize pool display component

**App.css:**
- `.buyin-checkbox-container` - Checkbox wrapper
- `.buyin-checkbox-label` - Interactive label
- `.buyin-checkbox` - Styled checkbox
- `.prize-pool-display` - Prize pool container
- `.prize-pool-amount` - Large, eye-catching amount
- Responsive styles for mobile

## 🎨 Design Details

### Buy-in Checkbox
- **Location**: Below each reserved seat's name button
- **Visibility**: Only for game creator during "Registering"
- **Style**: Dark background, green accent color
- **Interaction**: Click to toggle paid status

### Prize Pool Display
- **Location**: Center of table, below tournament status
- **Visibility**: During "Registering" status only
- **Colors**: 
  - Background: Translucent green
  - Border: Green with glow
  - Amount: Bright green with text shadow
- **Font**: Monospace for amount (dollar values)
- **Responsive**: Smaller on mobile devices

## 📱 User Experience

### Flow for Game Creators

1. Create tournament: "Friday Night Poker - $20 Buy-in"
2. Players reserve seats
3. As each player arrives and pays:
   - Check the "Paid" box under their name
   - Prize pool updates: $20 → $40 → $60...
4. Start tournament when ready
5. Prize pool display disappears (status changes from "Registering")

### Visual Feedback

- ✅ **Checked**: Player has paid
- ⬜ **Unchecked**: Player hasn't paid yet
- 💰 **Prize Pool**: Updates in real-time
- 🎯 **Clear Display**: Easy to see total pot

## 🚀 Deployment

### Step 1: Run Database Migration
```bash
# In Supabase SQL Editor
\i database-migration-buyin-tracking.sql
```

Or copy/paste SQL directly:
```sql
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS paid_buyin BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_reservations_paid_buyin 
ON reservations(game_id, paid_buyin);

UPDATE reservations 
SET paid_buyin = FALSE 
WHERE paid_buyin IS NULL;
```

### Step 2: Deploy Code
```bash
git add .
git commit -m "Add buy-in tracking and prize pool feature"
git push origin main
```

### Step 3: Test
1. Create a tournament with a buy-in
2. Reserve some seats
3. Mark players as paid
4. Verify prize pool updates correctly

## 🎯 Use Cases

### Home Game Tournament
- Track $20 buy-ins
- Show prize pool: $160 for 8 players
- Everyone sees the pot they're playing for

### Charity Event
- Track donations as "buy-ins"
- Display total raised
- Motivate more sign-ups

### Multi-Table Tournament
- Track buy-ins across all tables
- Prize pool visible on each table
- Accurate accounting

## 🔒 Security

### Authorization
- Only game creator can mark players as paid
- API validates user email against game creator
- 403 Forbidden if not authorized

### Data Integrity
- Boolean field (can't be invalid)
- Indexed for performance
- Defaults to FALSE (unpaid)

## 📊 Benefits

1. **Accountability**: Know who has paid
2. **Transparency**: Everyone sees the prize pool
3. **Motivation**: Growing pot encourages sign-ups
4. **Professional**: Looks organized and official
5. **Flexible**: Uncheck if someone drops out

## 🔮 Future Enhancements

Potential improvements:
1. **Re-buys**: Track multiple buy-ins per player
2. **Add-ons**: Separate tracking for add-ons
3. **Partial Payments**: Track partial buy-ins
4. **Payment Methods**: Note how they paid (cash, Venmo, etc.)
5. **History**: Log when each payment was marked
6. **Notifications**: Alert when all players have paid
7. **Reports**: Export payment status for records

## 📝 Notes

- Prize pool only shows during "Registering" status
- Checkboxes disappear when tournament starts
- Buy-in amount must be set in game config
- Works with multi-table tournaments
- Prize pool calculates across all tables

---

**Feature Status:** ✅ Complete and Ready
**Date:** October 30, 2025
**Next Step:** Run database migration and test!

