# SMS Notifications Setup Guide

## Overview

The PokerHomeGameManager now supports sending SMS text notifications to player groups! Game creators can notify all players in a group about upcoming games with a custom message.

## How It Works

### Without Twilio (Development Mode)
- SMS messages are **simulated** and logged to the console
- Perfect for testing and development
- No setup required!

### With Twilio (Production Mode)
- Real SMS messages are sent to players' phone numbers
- Requires a Twilio account (free trial available)

## Setting Up Twilio (Optional)

### Step 1: Create a Twilio Account
1. Go to [https://www.twilio.com](https://www.twilio.com)
2. Sign up for a free trial account
3. Verify your email and phone number

### Step 2: Get Your Credentials
1. Log in to the Twilio Console
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Get a Twilio phone number:
   - Go to Phone Numbers → Manage → Buy a number
   - Choose a number (free trial includes credits)

### Step 3: Configure Environment Variables

Create a `.env` file in the project root directory:

```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important:** Replace the placeholder values with your actual Twilio credentials.

### Step 4: Restart the Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

You should see: `Twilio SMS enabled` in the console output.

## Using the Notification Feature

### For Game Creators:

1. **Navigate to your game** - Go to the poker table page
2. **Click "📱 Notify Players"** button (only visible to game creator)
3. **Select a player group** from the dropdown
4. **Compose your message**:
   - Write a custom message (max 320 characters)
   - Use `[GAME_CODE]` as a placeholder - it will be automatically replaced with your actual game code
   - Example: "Hey! Join my poker game tonight at 7pm. Use code: [GAME_CODE]"
5. **Click "📤 Send Notifications"**

### Message Tips:
- Keep messages concise (SMS has 320 character limit)
- Include game details (time, location, buy-in, etc.)
- Use the `[GAME_CODE]` placeholder to automatically insert your game code
- Be respectful of players' time - don't spam!

## Testing Without Twilio

Even without Twilio configured, you can test the feature:

1. Create a group with players (include phone numbers)
2. Send a notification
3. Check the server console - you'll see simulated SMS logs:
   ```
   [SIMULATED SMS] To: +1234567890 (John Doe)
   [SIMULATED SMS] Message: Hey! Join my poker game. Use code: ABC123
   ```

## Troubleshooting

### "No players with phone numbers in this group"
- Make sure players in your group have valid phone numbers
- Phone numbers should include country code (e.g., +1 for US)

### SMS not sending (with Twilio configured)
- Verify your Twilio credentials are correct
- Check your Twilio account has credits
- Ensure phone numbers are in E.164 format (+[country code][number])
- Check the server console for error messages

### Free Trial Limitations
- Twilio free trial requires number verification
- You can only send to verified numbers
- To send to unverified numbers, upgrade your account

## Phone Number Format

Phone numbers should be in international format:
- ✅ Correct: `+12025551234`
- ✅ Correct: `+447911123456`
- ❌ Wrong: `202-555-1234`
- ❌ Wrong: `(202) 555-1234`

## Cost

### Twilio Pricing (as of 2024):
- Free trial: $15 in credits
- US/Canada SMS: ~$0.0075 per message
- International rates vary by country
- Phone number rental: ~$1/month

**Example:** With $15 trial credit, you can send ~2000 messages!

## Privacy & Best Practices

- Only send notifications to players who have opted in
- Include opt-out instructions if sending regularly
- Respect local laws regarding SMS marketing
- Don't send messages at inappropriate hours
- Keep player phone numbers secure

## Support

For Twilio support: [https://support.twilio.com](https://support.twilio.com)
For app issues: Check the GitHub repository or contact support

---

**Happy Gaming! 🎲♠️♥️♣️♦️**

