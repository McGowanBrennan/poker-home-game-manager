# User Code Feature

## Overview
Each user is assigned a unique 8-character code when they sign up. This code serves as a personal identifier that can be shared with friends or used for future features like friend connections, player stats tracking, or game invitations.

## Implementation Details

### Database
- **Column**: `user_code` (VARCHAR(8), UNIQUE, NOT NULL)
- **Index**: `idx_users_user_code` for fast lookups
- **Generation**: Random 8-character hexadecimal code (uppercase)

### Backend (server.js)

#### New Function
```javascript
async function generateUniqueUserCode()
```
- Generates random 8-character hexadecimal codes
- Checks database to ensure uniqueness
- Returns unique code

#### Updated Endpoints

**POST /api/users/register**
- Generates unique user code during registration
- Returns `userCode` in response
```json
{
  "user": {
    "email": "user@example.com",
    "username": "username",
    "identifier": "user@example.com",
    "userCode": "A1B2C3D4"
  }
}
```

**POST /api/users/login**
- Returns `userCode` with login response
```json
{
  "email": "user@example.com",
  "username": "username",
  "identifier": "user@example.com",
  "userCode": "A1B2C3D4"
}
```

### Frontend

#### Components Updated

1. **Login.js**
   - Receives `userCode` from login response
   - Passes to dashboard via navigation state

2. **SignUp.js**
   - Receives `userCode` from registration response
   - Passes to dashboard via navigation state

3. **GameManagement.js (Dashboard)**
   - Displays user code in header
   - Clickable button to copy code to clipboard
   - Shows success alert on copy
   - Styled with gold gradient matching theme

4. **PokerTable.js**
   - Receives `userCode` from location state
   - Preserves code when navigating back to dashboard

#### User Experience

**Display Location**: Dashboard header, below user email

**Visual Design**:
- Label: "Your Code:"
- Golden gradient button (matches site theme)
- Letter-spaced for readability
- Hover effects for interactivity

**Interaction**:
- Click button to copy code
- Shows alert: "User code [CODE] copied to clipboard!"
- Mobile-responsive design

### Styling

**Desktop**:
- Horizontal layout with label and button
- Full-size button with padding
- Smooth hover animations

**Mobile**:
- Vertical layout for better space usage
- Smaller button text
- Maintains functionality

### Database Migration

Run the SQL migration in Supabase SQL Editor:
```sql
-- See database-migration-user-code.sql
```

This migration:
1. Adds `user_code` column
2. Creates index for performance
3. Generates codes for existing users
4. Sets NOT NULL constraint

### Future Enhancements

Potential uses for user codes:
- **Friend System**: Add friends by their code
- **Player Stats**: Track performance across games
- **Leaderboards**: Compare stats with friends
- **Game Invites**: Share your code for quick invites
- **Social Features**: Profile discovery
- **Referral System**: Track who invited whom
- **Privacy**: Share code instead of email/phone

## Testing Checklist

- [ ] Run database migration in Supabase
- [ ] New user registration generates unique code
- [ ] User code displayed on dashboard after signup
- [ ] User code displayed on dashboard after login
- [ ] Click to copy functionality works
- [ ] Alert shows on successful copy
- [ ] Code persists when navigating to game and back
- [ ] Mobile responsive layout works correctly
- [ ] Code is unique across all users
- [ ] Existing users get codes via migration

## Security Considerations

- User codes are **not** passwords - they're identifiers
- Codes are 8 characters (16^8 = 4.3 billion combinations)
- Collision probability is extremely low
- No sensitive information exposed
- Consider adding rate limiting if codes become public-facing identifiers

