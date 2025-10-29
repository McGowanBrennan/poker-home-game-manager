# Multiplayer Poker Table - Setup Guide

This application now supports **shared state across multiple devices**, allowing all players to see real-time seat reservations.

## How It Works

- **Backend Server**: Node.js/Express server running on port `3001`
- **Frontend**: React app running on port `3000`
- **Data Storage**: Reservations stored in `reservations.json`
- **Real-time Updates**: Frontend polls the server every 2 seconds for changes

## Running the Application

### Option 1: Development Mode (Recommended for Development)

Runs both server and frontend together:

```bash
npm run dev
```

This starts:
- Backend server at `http://localhost:3001`
- React app at `http://localhost:3000`

### Option 2: Separate Servers

Run backend and frontend in separate terminals:

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - React Frontend:**
```bash
npm start
```

## Accessing from Multiple Devices

### Local Network Access

1. Find your computer's local IP address:
   - Windows: `ipconfig` → Look for IPv4 Address (e.g., `192.168.1.155`)
   - Mac/Linux: `ifconfig` → Look for inet address

2. Make sure all devices are on the **same WiFi network**

3. On other devices, open:
   - Frontend: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.155:3000`

### Firewall Configuration

You may need to allow Node.js through your firewall:

**Windows:**
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Find Node.js and check both Private and Public
4. Click OK

## API Endpoints

The backend server provides these endpoints:

- `GET /api/reservations` - Get all current reservations
- `POST /api/reservations` - Reserve a seat
  ```json
  {
    "seatId": "1",
    "playerName": "John"
  }
  ```
- `DELETE /api/reservations` - Clear all reservations (for testing)

## Features

✅ **Real-time Sync**: All devices see updates within 2 seconds
✅ **Persistent Storage**: Reservations saved to `reservations.json`
✅ **Collision Prevention**: Server prevents double-booking
✅ **Name Validation**: Max 20 characters, no empty names
✅ **Mobile Friendly**: Responsive design for all devices

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

```bash
# Kill all Node processes
Get-Process -Name node | Stop-Process -Force

# Or manually kill the specific port
# Windows: netstat -ano | findstr :3001
# Then: taskkill /PID <PID> /F
```

### Devices Can't Connect

1. Verify all devices are on the same WiFi
2. Check your firewall settings
3. Make sure the server is running (`npm run dev`)
4. Try accessing from localhost first to verify it works

### Reservations Not Syncing

1. Check the browser console for errors
2. Verify the backend server is running
3. Check that `reservations.json` exists and is readable
4. Try refreshing the page

## Development Tips

- **Clear Reservations**: `curl -X DELETE http://localhost:3001/api/reservations`
- **View Reservations File**: Check `reservations.json` in the project root
- **Test Locally**: Open multiple browser tabs/windows to simulate multiple players
- **Network Testing**: Use your phone's browser to test real network connectivity

## Production Deployment

For production, you'll want to:

1. Use a proper database (PostgreSQL, MongoDB, etc.)
2. Add WebSocket support for true real-time updates
3. Add authentication/sessions
4. Deploy backend to a cloud service (Heroku, AWS, etc.)
5. Deploy frontend to a static hosting service (Vercel, Netlify, etc.)
6. Use environment variables for configuration

