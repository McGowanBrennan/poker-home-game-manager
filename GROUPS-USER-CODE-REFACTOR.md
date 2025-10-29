# Player Groups Refactor: User Code Integration

## Overview
Refactored the Player Groups feature to use user codes instead of manual name/phone number entry. This creates a stronger integration between user accounts and group membership.

## Changes Made

### Database Migration (`database-migration-groups-user-code.sql`)

**Changes to `group_players` table:**
1. ✅ Added `user_code` column (VARCHAR(8))
2. ✅ Created index on `user_code` for performance
3. ✅ Added foreign key constraint linking to `users.user_code`
4. ✅ Made `name` column nullable (fetched from users table)
5. ✅ Added CASCADE delete (if user is deleted, their group memberships are removed)

**Run this migration before using the new feature!**

### Backend Changes (`server.js`)

#### POST `/api/groups/:groupId/players`
**Before:**
- Accepted `name` and `phoneNumber`
- Stored directly in database

**After:**
- Accepts `userCode` (required)
- Validates user code exists in users table
- Automatically fetches display name from users table
- Prevents duplicate additions (same user can't be added twice)
- Stores user code for linking

#### GET `/api/groups`
**Before:**
- Returned player name and phone number from `group_players` table

**After:**
- JOINs with `users` table to get current user information
- Returns `userCode` and `name` for each player
- Name is always current (reflects email/username from users table)

### Frontend Changes (`src/GameManagement.js`)

#### State Management
**Removed:**
- `newPlayerName`
- `newPlayerPhone`
- `contactsSupported`
- `isIOS`

**Added:**
- `newPlayerUserCode`

#### Functions Removed
- `handleAddFromContacts()` - Contact picker functionality
- `handleVCardUpload()` - vCard file import
- `handleOpenContactsApp()` - iOS contacts app integration

These were replaced with simple user code input.

#### UI Changes
**Before:**
```
[Player name input]
[Phone number input (optional)]
[Save Player] [📱 Pick Contact] [Import Contact options]
```

**After:**
```
[User code input (8 characters)]
[Add Player]
💡 Ask the player for their user code from their dashboard
```

#### Features
- Auto-uppercase user code input
- Letter-spaced input for readability
- 8-character validation
- Clear helper text
- Simplified UX

### Benefits

1. **Data Integrity**
   - Players are linked to real user accounts
   - Names stay current if user changes their email/username
   - No duplicate or misspelled names

2. **Better User Experience**
   - Simple 8-character code entry
   - No manual typing of names
   - No phone number management
   - Works on all devices consistently

3. **Feature Potential**
   - Can show player stats across groups
   - Can implement group permissions
   - Can notify group members
   - Can track player history
   - Can implement friend systems

4. **Simplified Codebase**
   - Removed 80+ lines of contact picker code
   - Removed device-specific logic (iOS detection)
   - Removed file upload handling
   - Single source of truth for player names

## Migration Path

### For Existing Groups

**Option 1: Clean Slate**
- Delete existing group_players entries
- Users re-add players using user codes

**Option 2: Migrate Data** (if needed)
```sql
-- If you have existing players with emails that match users
UPDATE group_players gp
SET user_code = u.user_code
FROM users u
WHERE gp.name = u.email OR gp.name = u.username;

-- Delete players that couldn't be matched
DELETE FROM group_players WHERE user_code IS NULL;
```

### For Users

**New Workflow:**
1. User creates a group
2. User shares group with friends
3. Friends provide their user codes (visible on their dashboard)
4. User enters codes to add friends to group
5. Names automatically sync from user accounts

## Testing Checklist

- [ ] Run database migration
- [ ] Create a new group
- [ ] Try adding player with valid user code → Should succeed
- [ ] Try adding player with invalid code → Should show error
- [ ] Try adding same player twice → Should show error
- [ ] Verify player name displays correctly
- [ ] Remove a player → Should work
- [ ] Delete a group → Should cascade delete players
- [ ] Update user email/username → Name should update in groups

## Future Enhancements

- **Group Invitations**: Send invites via user code
- **Auto-join**: Users can join groups directly with group code
- **Player Stats**: Track performance across all groups
- **Permissions**: Group admins, moderators, members
- **Notifications**: Alert group members about new games
- **Privacy**: Control who can add you to groups

## API Changes Summary

### Request Format Change
```javascript
// OLD
POST /api/groups/:groupId/players
{
  "name": "John Doe",
  "phoneNumber": "+1234567890"  // optional
}

// NEW
POST /api/groups/:groupId/players
{
  "userCode": "A1B2C3D4"  // required, must exist in users table
}
```

### Response Format Change
```javascript
// OLD
{
  "players": [
    {
      "id": 1,
      "name": "John Doe",
      "phoneNumber": "+1234567890"
    }
  ]
}

// NEW
{
  "players": [
    {
      "id": 1,
      "userCode": "A1B2C3D4",
      "name": "john@example.com"  // from users table
    }
  ]
}
```

## Error Handling

### New Error Cases
- `400`: "User code is required"
- `404`: "User code not found"
- `400`: "User is already in this group"

### Validation
- User code must be exactly 8 characters
- User code must exist in users table
- User cannot be added to the same group twice

