# Username/Email Authentication Feature

## Overview
Users can now sign up and log in using either an **email address** OR a **username**, giving more flexibility in how users authenticate.

## Features Added

### Sign Up
- Toggle between email and username signup
- Email validation: Must be a valid email format
- Username validation:
  - 3-20 characters
  - Only letters, numbers, and underscores allowed
  - Must be unique
- Password requirements: Minimum 6 characters

### Login
- Single input field accepts either email or username
- Backend automatically detects and validates both formats

## Database Changes

A new `username` column has been added to the `users` table:
- Type: VARCHAR(20)
- Nullable: Yes (to support existing email-only users)
- Unique constraint
- Indexed for fast lookups

### To Apply Database Migration:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL from `database-migration-username.sql`:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(20) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

## API Changes

### Register Endpoint: `POST /api/users/register`

**Request Body:**
```json
{
  "email": "user@example.com",  // Optional if username provided
  "username": "cool_user",       // Optional if email provided
  "password": "password123"      // Required
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "email": "user@example.com",
    "username": "cool_user",
    "identifier": "user@example.com"  // or username if no email
  }
}
```

### Login Endpoint: `POST /api/users/login`

**Request Body:**
```json
{
  "identifier": "user@example.com",  // Can be email OR username
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "email": "user@example.com",
  "username": "cool_user",
  "identifier": "user@example.com"  // or username if no email
}
```

## Frontend Changes

### SignUp Component
- Added toggle buttons to switch between email and username signup
- Conditional rendering of email or username input field
- Updated validation logic for both types

### Login Component
- Single input field labeled "Email or Username"
- Accepts either format seamlessly

## Backward Compatibility

✅ **Existing email-only accounts continue to work perfectly**
- The username column allows NULL values
- Login still works with email addresses
- No migration needed for existing users

## Testing

### Test Scenarios:

1. **Sign up with email:**
   - Select "Email" option
   - Enter valid email and password
   - Should create account successfully

2. **Sign up with username:**
   - Select "Username" option
   - Enter valid username (3-20 chars, alphanumeric + underscore)
   - Should create account successfully

3. **Login with email:**
   - Enter email in the login field
   - Should authenticate successfully

4. **Login with username:**
   - Enter username in the login field
   - Should authenticate successfully

5. **Duplicate detection:**
   - Try to create account with existing email: Should fail
   - Try to create account with existing username: Should fail

## Implementation Files Changed

- ✅ `server.js` - Updated register and login endpoints
- ✅ `src/SignUp.js` - Added username option with toggle
- ✅ `src/Login.js` - Updated to accept email or username
- ✅ `database-migration-username.sql` - SQL migration script

## Future Enhancements

Possible improvements:
- Add "forgot username" feature
- Display username/email on dashboard
- Allow users to add email to username-only accounts (and vice versa)
- Profile page to manage both email and username

---

**Last Updated**: October 2025

