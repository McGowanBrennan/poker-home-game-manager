# Buy-In Tracking Feature 💰

Track total buy-ins for each player for easy bookkeeping!

## 🎯 Feature Overview

### What It Does
- Automatically tracks total money paid in by each player
- When you check "Paid", it adds the buy-in to their running total
- Visual indicators show players who have paid multiple buy-ins
- Hover tooltips display exact total amounts
- Real-time badges on player seats showing totals

### Who Can Use It
- **Game Creators**: Mark players as paid and track their totals
- **All Players**: See total amounts paid in by each player

## 📋 How To Use

### For Game Creators

1. **Player Reserves Seat** (or is seated automatically)
2. **Mark Player as Paid**:
   - Check the "Paid" checkbox under their name
   - Buy-in amount is **automatically added** to their total
3. **Visual Feedback**:
   - 💰 emoji appears on avatar
   - Green border around avatar
   - Green badge shows total paid in (e.g., "$20")
   - Name button turns light green
4. **Hover to See Details**:
   - Hover over avatar or name to see exact total: "John - Total: $40.00"
5. **Multiple Buy-ins**:
   - Check "Paid" again for rebuys
   - Total automatically updates (e.g., $20 → $40 → $60)

### For Players

1. **View the Table**
2. **See Total Indicators**:
   - 💰 icon = This player has paid in money
   - Green borders and badges = Total amount paid
3. **Hover for Details**:
   - Tooltip shows: "PlayerName - Total: $XX.XX"

## 🎨 Visual Indicators

| Element | Appearance | Meaning |
|---------|------------|---------|
| **💰 Emoji** | Top-right of avatar | Player has paid in money |
| **Green Border** | Around avatar | Player has paid buy-in(s) |
| **Green Button** | Player name button | Player has paid in money |
| **$XX Badge** | On name button | Total amount paid (rounded) |
| **Pulsing Animation** | 💰 emoji | Draws attention to total |

## 💡 Use Cases

### Scenario 1: Simple Buy-In
- Player arrives and pays $20 buy-in
- Mark as paid
- Total tracked: $20
- 💰 appears, badge shows "$20"

### Scenario 2: Multiple Buy-Ins (Rebuys)
- Player busts, rebuys for $20
- First buy-in: Check "Paid" → Total: $20
- Second buy-in: Check "Paid" again → Total: $40
- Badge updates to "$40"
- Easy to see who's in for multiple bullets

### Scenario 3: Tournament Bookkeeping
- 8 players, all pay $20
- Mark each as paid
- End of night: Total prize pool = $160
- You can see each player contributed $20
- Makes settlement easier

## 🛠️ Technical Implementation

### Database Changes

**New Column:** `owed_amount` in `reservations` table
- Type: `DECIMAL(10, 2)`
- Default: `0.00`
- Indexed for fast queries

**Migration File:** `database-migration-debt-tracking.sql`

### Backend API

**Modified Endpoint:** `PATCH /api/games/:gameId/reservations/:seatId/paid`

Request:
```json
{
  "userEmail": "creator@example.com",
  "tableNumber": 1,
  "paid": true,
  "paymentMethod": "iou",
  "buyInAmount": "20"
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
    "paidBuyin": true,
    "owedAmount": 20.00
  }
}
```

**Buy-In Tracking Logic:**
- Checking "Paid": Adds `buyInAmount` to existing total
- Unchecking "Paid": Subtracts `buyInAmount` from total
- Multiple check/uncheck cycles accumulate correctly

**Modified Endpoint:** `GET /api/games/:gameId/reservations`

Now returns:
```json
{
  "1": {
    "playerName": "John",
    "paidBuyin": true,
    "owedAmount": 20.00
  },
  "2": {
    "playerName": "Jane",
    "paidBuyin": true,
    "owedAmount": 0.00
  }
}
```

### Frontend Changes

**PokerTable.js:**
1. `handleMarkPaid()` - Prompts for payment method (cash/iou)
2. Debt tooltip generation
3. Conditional rendering of debt indicators
4. Visual styling classes (`has-debt`)
5. Debt badge display

**App.css:**
- `.player-avatar.has-debt` - Green border and glow
- `.debt-indicator` - 💰 emoji styling with pulse animation
- `.reserve-seat-btn.has-debt` - Light green button style
- `.debt-badge` - Green badge showing total amount
- `@keyframes pulse` - Attention-grabbing animation

## 🎯 User Experience

### Payment Flow

1. **Check "Paid" Box**
   - ✅ Paid marked instantly
   - Buy-in amount automatically added to total
   - 💰 indicator appears
   - Green styling applied
   - Badge shows total (e.g., "$20")

2. **Check "Paid" Again (Rebuy)**
   - ✅ Another buy-in recorded
   - Total increases (e.g., $20 → $40)
   - Badge updates to show new total

3. **Uncheck "Paid"**
   - ❌ Paid unmarked
   - Buy-in amount subtracted from total
   - If total reaches $0, indicators disappear

### Hover Behavior

- **No Total**: "John Doe"
- **With Total**: "John Doe - Total: $40.00"
- **Game Creator**: "John Doe - Total: $40.00 (click to remove)"

### Visual Progression

```
No Total:    👤 [John Doe]
Has Total:   💰👤 [John Doe $40]
             ↑  ↑     ↑      ↑
          Pulse Green Light  Badge
          Money Border Green
```

## 🚀 Deployment

### Step 1: Run Database Migration
```bash
# In Supabase SQL Editor
\i database-migration-debt-tracking.sql
```

Or copy/paste SQL:
```sql
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS owed_amount DECIMAL(10, 2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_reservations_owed_amount 
ON reservations(game_id, owed_amount);

UPDATE reservations 
SET owed_amount = 0.00 
WHERE owed_amount IS NULL;
```

### Step 2: Restart Dev Server
```bash
# Kill existing processes
taskkill /F /IM node.exe

# Start server
npm run dev
```

### Step 3: Test
1. Create tournament with buy-in amount (e.g., $20)
2. Reserve seat for a player
3. Check "Paid" box
4. See 💰 indicator and "$20" badge appear
5. Hover to verify tooltip shows "PlayerName - Total: $20.00"
6. Check "Paid" again to test rebuy
7. Badge updates to "$40"

## 📊 Benefits

1. **Bookkeeping**: Clear record of all money collected
2. **Transparency**: Everyone sees who paid what
3. **Convenience**: No need to track buy-ins manually
4. **Professional**: Automated total tracking
5. **Visual**: Instant recognition of multiple buy-ins
6. **Accurate**: Running total across rebuys and add-ons

## 🔒 Security

### Authorization
- Only game creator can mark payments
- Only game creator can choose payment method
- API validates authorization on every request

### Data Integrity
- Debt stored as DECIMAL(10, 2) for precision
- Never decreases unexpectedly
- Indexed for performance
- Defaults to 0.00

## 🔮 Future Enhancements

Potential improvements:
1. **Pay Down Debt**: Button to record partial payments
2. **Debt History**: Log of when debt was added
3. **Total Debt Report**: Summary of all debts for a game
4. **Export**: CSV export of outstanding debts
5. **Reminders**: Notify players of outstanding debt
6. **Multi-Game Tracking**: Track debt across multiple games
7. **Settlement**: Mark debt as paid off

## 💬 User Feedback

### Tooltips
- **Informative**: Shows exact total amount paid in
- **Always Available**: Hover anytime to see details
- **Context-Aware**: Different for creator vs players
- **Clear Format**: "PlayerName - Total: $XX.XX"

## 📝 Notes

- Totals accumulate across multiple buy-ins
- Automatically tracks all marked payments
- Visible to all players (transparency)
- Totals persist even if player is removed and re-added
- Works with multi-table tournaments
- Great for bookkeeping and end-of-night accounting
- Helps track who's "in for" multiple bullets

---

**Feature Status:** ✅ Complete and Ready
**Date:** October 30, 2025
**Next Step:** Run database migration and test!

