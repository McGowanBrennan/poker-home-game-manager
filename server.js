const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const cron = require('node-cron');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
}

// Helper function to hash passwords
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper function to generate game code
function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper function to generate group ID
function generateGroupId() {
  return Math.random().toString(36).substring(2, 12).toUpperCase();
}

// Helper function to generate unique 8-character user code
async function generateUniqueUserCode() {
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate 8 random alphanumeric characters
    code = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Check if code already exists
    const result = await db.query('SELECT user_code FROM users WHERE user_code = $1', [code]);
    isUnique = result.rows.length === 0;
  }
  
  return code;
}

// Helper function to generate config ID
// Note: Game configurations are now stored directly in the database as JSONB column
// No longer need local file operations

// ========== USER ENDPOINTS ==========

// Register a new user
app.post('/api/users/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // User must provide either email or username
    if ((!email && !username) || !password) {
      return res.status(400).json({ error: 'Email or username, and password are required' });
    }

    // If username provided, validate it
    if (username) {
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
      }
    }

    // If email provided, validate it
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }
    }

    // Check if user already exists (by email or username)
    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email || null, username || null]
    );

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];
      if (email && existing.email === email) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      if (username && existing.username === username) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Hash password and generate unique user code
    const hashedPassword = hashPassword(password);
    const userCode = await generateUniqueUserCode();
    
    const result = await db.query(
      'INSERT INTO users (email, username, password, user_code) VALUES ($1, $2, $3, $4) RETURNING email, username, user_code',
      [email || null, username || null, hashedPassword, userCode]
    );

    const user = result.rows[0];
    res.status(201).json({ 
      message: 'User registered successfully', 
      user: {
        email: user.email,
        username: user.username,
        identifier: user.email || user.username,
        userCode: user.user_code
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
app.post('/api/users/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or username

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    // Find user by email or username
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [identifier]
    );

    if (result.rows.length === 0) {
      console.log('User not found:', identifier);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const hashedPassword = hashPassword(password);

    console.log('Login attempt - Identifier:', identifier);
    console.log('Found user:', user.email || user.username);
    console.log('User code from DB:', user.user_code);
    console.log('Passwords match:', user.password === hashedPassword);

    if (user.password !== hashedPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ 
      message: 'Login successful', 
      email: user.email,
      username: user.username,
      identifier: user.email || user.username,
      userCode: user.user_code
    });
  } catch (error) {
    console.error('Error logging in:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// ========== GAME ENDPOINTS ==========

// Create a new game
app.post('/api/games', async (req, res) => {
  try {
    const { name, createdBy, gameDateTime, note, config } = req.body;
    
    console.log('Creating game with data:', { name, createdBy, gameDateTime, note, hasConfig: !!config });

    if (!name || !createdBy) {
      return res.status(400).json({ error: 'Name and createdBy are required' });
    }

    const gameId = generateGameCode();

    // Prepare config for database (store as JSONB)
    const configJson = config && Object.keys(config).length > 0 
      ? JSON.stringify(config)
      : null;
      
    if (configJson) {
      console.log('Saving game config to database');
    }

    // Create game in database with config
    await db.query(
      'INSERT INTO games (id, name, created_by, game_date_time, note, config) VALUES ($1, $2, $3, $4::timestamp, $5, $6)',
      [gameId, name, createdBy, gameDateTime || null, note || null, configJson]
    );

    res.status(201).json({
      message: 'Game created successfully',
      game: {
        id: gameId,
        name,
        createdBy,
        gameDateTime,
        note,
        config,
        reservations: {}
      }
    });
  } catch (error) {
    console.error('Error creating game:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Failed to create game',
      details: error.message 
    });
  }
});

// Get all games (filtered by user if userEmail provided)
app.get('/api/games', async (req, res) => {
  try {
    const { userEmail } = req.query;
    
    let query = 'SELECT * FROM games';
    let params = [];
    
    if (userEmail) {
      query += ' WHERE created_by = $1';
      params = [userEmail];
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await db.query(query, params);
    
    // Map games with their configurations from database
    const gamesWithConfigs = result.rows.map(game => ({
      id: game.id,
      name: game.name,
      createdBy: game.created_by,
      createdAt: game.created_at,
      gameDateTime: game.game_date_time,
      note: game.note,
      config: game.config || null  // Config is now stored directly in database as JSONB
    }));
    
    res.json(gamesWithConfigs);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Get a specific game
app.get('/api/games/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    const result = await db.query(
      'SELECT * FROM games WHERE id = $1',
      [gameId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = result.rows[0];
    
    res.json({
      id: game.id,
      name: game.name,
      createdBy: game.created_by,
      createdAt: game.created_at,
      gameDateTime: game.game_date_time,
      note: game.note,
      config: game.config || null,  // Config is now stored directly in database as JSONB
      // Timer state for tournaments
      currentBlindLevel: game.current_blind_level || 0,
      timeRemainingSeconds: game.time_remaining_seconds,
      timerRunning: game.timer_running || false,
      timerPaused: game.timer_paused || false,
      timerLastUpdate: game.timer_last_update
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// Delete a game (only by creator)
app.delete('/api/games/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { userEmail } = req.body;

    // Check if userEmail is provided
    if (!userEmail) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Check if the user is the game creator
    const gameResult = await db.query(
      'SELECT created_by FROM games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.rows[0].created_by !== userEmail) {
      return res.status(403).json({ error: 'Only the game creator can delete this game' });
    }

    // Delete all reservations for this game first
    await db.query(
      'DELETE FROM reservations WHERE game_id = $1',
      [gameId]
    );

    // Delete the game (config will be deleted automatically via database)
    await db.query(
      'DELETE FROM games WHERE id = $1',
      [gameId]
    );

    res.json({
      success: true,
      message: 'Game deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting game:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// ========== RESERVATION ENDPOINTS ==========

// Get reservations for a specific game
app.get('/api/games/:gameId/reservations', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { tableNumber } = req.query;
    const table = parseInt(tableNumber) || 1;

    const result = await db.query(
      'SELECT seat_id, player_name, paid_buyin, owed_amount, addon_purchased FROM reservations WHERE game_id = $1 AND table_number = $2',
      [gameId, table]
    );

    // Convert to object format {seatId: {playerName, paidBuyin, owedAmount, addOnPurchased}}
    const reservations = {};
    result.rows.forEach(row => {
      reservations[row.seat_id] = {
        playerName: row.player_name,
        paidBuyin: row.paid_buyin || false,
        owedAmount: parseFloat(row.owed_amount) || 0,
        addOnPurchased: row.addon_purchased || false
      };
    });

    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// Reserve a seat in a game
app.post('/api/games/:gameId/reservations', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { seatId, playerName, tableNumber } = req.body;
    const table = parseInt(tableNumber) || 1;

    console.log(`📍 Creating reservation: ${playerName} -> Table ${table}, Seat ${seatId} (Game: ${gameId})`);

    if (!seatId || !playerName) {
      return res.status(400).json({ error: 'Seat ID and player name are required' });
    }

    // Check if seat is already reserved at this table
    const existing = await db.query(
      'SELECT * FROM reservations WHERE game_id = $1 AND seat_id = $2 AND table_number = $3',
      [gameId, parseInt(seatId), table]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Seat already reserved' });
    }

    // Create reservation
    await db.query(
      'INSERT INTO reservations (game_id, seat_id, player_name, table_number) VALUES ($1, $2, $3, $4)',
      [gameId, parseInt(seatId), playerName, table]
    );

    // Fetch all reservations for this game and table
    const result = await db.query(
      'SELECT seat_id, player_name FROM reservations WHERE game_id = $1 AND table_number = $2',
      [gameId, table]
    );

    const reservations = {};
    result.rows.forEach(row => {
      reservations[row.seat_id] = row.player_name;
    });

    res.json({
      message: 'Seat reserved successfully',
      reservations
    });
  } catch (error) {
    console.error('Error reserving seat:', error);
    res.status(500).json({ error: 'Failed to reserve seat' });
  }
});

// Delete a reservation from a specific game
app.delete('/api/games/:gameId/reservations/:seatId', async (req, res) => {
  try {
    const { gameId, seatId } = req.params;
    const { tableNumber } = req.query;
    const { userEmail } = req.body;
    const table = parseInt(tableNumber) || 1;

    // Check if userEmail is provided
    if (!userEmail) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Check if the user is the game creator
    const gameResult = await db.query(
      'SELECT created_by FROM games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.rows[0].created_by !== userEmail) {
      return res.status(403).json({ error: 'Only the game creator can remove players' });
    }

    // Delete the reservation
    const deleteResult = await db.query(
      'DELETE FROM reservations WHERE game_id = $1 AND seat_id = $2 AND table_number = $3 RETURNING *',
      [gameId, parseInt(seatId), table]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Fetch all remaining reservations for this game and table
    const result = await db.query(
      'SELECT seat_id, player_name FROM reservations WHERE game_id = $1 AND table_number = $2',
      [gameId, table]
    );

    const reservations = {};
    result.rows.forEach(row => {
      reservations[row.seat_id] = row.player_name;
    });

    res.json({
      success: true,
      message: 'Reservation removed',
      reservations
    });
  } catch (error) {
    console.error('Error removing reservation:', error);
    res.status(500).json({ error: 'Failed to remove reservation' });
  }
});

// Update player buy-in count
app.patch('/api/games/:gameId/reservations/:seatId/buyins', async (req, res) => {
  try {
    const { gameId, seatId } = req.params;
    const { tableNumber, buyInCount, userEmail, buyInAmount, addOnPurchased, addOnCost } = req.body;
    const table = parseInt(tableNumber) || 1;

    // Check if userEmail is provided
    if (!userEmail) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Check if the user is the game creator
    const gameResult = await db.query(
      'SELECT created_by FROM games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.rows[0].created_by !== userEmail) {
      return res.status(403).json({ error: 'Only the game creator can update buy-ins' });
    }

    // Get current reservation
    const currentReservation = await db.query(
      'SELECT owed_amount, addon_purchased FROM reservations WHERE game_id = $1 AND seat_id = $2 AND table_number = $3',
      [gameId, parseInt(seatId), table]
    );

    if (currentReservation.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Calculate new total based on buy-in count
    const count = Math.max(0, parseInt(buyInCount) || 0);
    let newTotal = count * parseFloat(buyInAmount || 0);
    
    // Add add-on cost if purchased
    const hasAddOn = addOnPurchased === true || addOnPurchased === 'true';
    if (hasAddOn && addOnCost) {
      // Parse add-on cost (remove $ if present)
      const parsedAddOnCost = parseFloat(String(addOnCost).replace('$', ''));
      newTotal += parsedAddOnCost;
    }
    
    const isPaid = count > 0;

    // Update the buy-in count, total amount, and add-on status
    const updateResult = await db.query(
      'UPDATE reservations SET paid_buyin = $1, owed_amount = $2, addon_purchased = $3 WHERE game_id = $4 AND seat_id = $5 AND table_number = $6 RETURNING *',
      [isPaid, newTotal, hasAddOn, gameId, parseInt(seatId), table]
    );

    res.json({
      success: true,
      message: `Buy-in count updated to ${count}${hasAddOn ? ' (add-on purchased)' : ''}`,
      reservation: {
        seatId: updateResult.rows[0].seat_id,
        playerName: updateResult.rows[0].player_name,
        paidBuyin: updateResult.rows[0].paid_buyin,
        owedAmount: parseFloat(updateResult.rows[0].owed_amount),
        buyInCount: count,
        addOnPurchased: updateResult.rows[0].addon_purchased
      }
    });
  } catch (error) {
    console.error('Error updating buy-in count:', error);
    res.status(500).json({ error: 'Failed to update buy-in count' });
  }
});

// Randomize seating chart - shuffle players and balance across tables
app.post('/api/games/:gameId/randomize-seating', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { userEmail, numberOfTables } = req.body;

    console.log('Randomize seating request:', { gameId, userEmail, numberOfTables });

    // Check if userEmail is provided
    if (!userEmail) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Check if the user is the game creator
    const gameResult = await db.query(
      'SELECT created_by FROM games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.rows[0].created_by !== userEmail) {
      return res.status(403).json({ error: 'Only the game creator can randomize seating' });
    }

    const numTables = parseInt(numberOfTables) || 1;

    // Get all reservations for this game
    const reservationsResult = await db.query(
      'SELECT * FROM reservations WHERE game_id = $1 ORDER BY id',
      [gameId]
    );

    const players = reservationsResult.rows;

    if (players.length === 0) {
      return res.json({ message: 'No players to randomize', tables: {} });
    }

    // Shuffle players using Fisher-Yates algorithm
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Calculate balanced distribution
    const totalPlayers = shuffled.length;
    const basePerTable = Math.floor(totalPlayers / numTables);
    const remainder = totalPlayers % numTables;

    // Delete all existing reservations
    await db.query('DELETE FROM reservations WHERE game_id = $1', [gameId]);

    // Redistribute players across tables
    const newSeating = {};
    let playerIndex = 0;

    for (let tableNum = 1; tableNum <= numTables; tableNum++) {
      // First 'remainder' tables get an extra player
      const playersForThisTable = basePerTable + (tableNum <= remainder ? 1 : 0);
      newSeating[tableNum] = {};

      for (let seatNum = 1; seatNum <= playersForThisTable; seatNum++) {
        if (playerIndex < totalPlayers) {
          const player = shuffled[playerIndex];
          
          // Insert new reservation
          await db.query(
            'INSERT INTO reservations (game_id, seat_id, player_name, table_number) VALUES ($1, $2, $3, $4)',
            [gameId, seatNum, player.player_name, tableNum]
          );

          newSeating[tableNum][seatNum] = player.player_name;
          playerIndex++;
        }
      }
    }

    res.json({
      success: true,
      message: 'Seating randomized successfully',
      tables: newSeating,
      totalPlayers
    });
  } catch (error) {
    console.error('Error randomizing seating:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ 
      error: 'Failed to randomize seating',
      details: error.message 
    });
  }
});

// Update game details (date, time, note)
app.post('/api/games/:gameId/update-details', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { userEmail, gameDateTime, note } = req.body;

    console.log('📝 Update game details request:', { gameId, userEmail, gameDateTime, note });

    // Check if userEmail is provided
    if (!userEmail) {
      console.log('❌ No userEmail provided');
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Check if the user is the game creator
    const gameResult = await db.query(
      'SELECT created_by FROM games WHERE id = $1',
      [gameId]
    );

    console.log('🔍 Game lookup result:', gameResult.rows);

    if (gameResult.rows.length === 0) {
      console.log('❌ Game not found');
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.rows[0].created_by !== userEmail) {
      console.log('❌ User is not game creator:', {
        creator: gameResult.rows[0].created_by,
        requestUser: userEmail
      });
      return res.status(403).json({ error: 'Only the game creator can update game details' });
    }

    console.log('✅ Authorization passed, updating game...');

    // Update game details in database
    const updateResult = await db.query(
      'UPDATE games SET game_date_time = $1, note = $2 WHERE id = $3 RETURNING *',
      [gameDateTime || null, note || null, gameId]
    );

    console.log('✅ Game updated successfully:', updateResult.rows[0]);

    res.json({ 
      success: true,
      game: updateResult.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating game details:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ 
      error: 'Failed to update game details',
      details: error.message 
    });
  }
});

// Update tournament timer state
app.post('/api/games/:gameId/timer-state', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { userEmail, currentBlindLevel, timeRemainingSeconds, timerRunning, timerPaused } = req.body;

    // Check if userEmail is provided
    if (!userEmail) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Check if the user is the game creator
    const gameResult = await db.query(
      'SELECT created_by FROM games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.rows[0].created_by !== userEmail) {
      return res.status(403).json({ error: 'Only the game creator can update timer state' });
    }

    // Update timer state in database
    const updateResult = await db.query(
      `UPDATE games 
       SET current_blind_level = $1, 
           time_remaining_seconds = $2, 
           timer_running = $3, 
           timer_paused = $4,
           timer_last_update = NOW()
       WHERE id = $5 
       RETURNING *`,
      [currentBlindLevel, timeRemainingSeconds, timerRunning, timerPaused, gameId]
    );

    res.json({ 
      success: true,
      timerState: {
        currentBlindLevel: updateResult.rows[0].current_blind_level,
        timeRemainingSeconds: updateResult.rows[0].time_remaining_seconds,
        timerRunning: updateResult.rows[0].timer_running,
        timerPaused: updateResult.rows[0].timer_paused
      }
    });
  } catch (error) {
    console.error('Error updating timer state:', error);
    res.status(500).json({ error: 'Failed to update timer state' });
  }
});

// Update tournament status
app.post('/api/games/:gameId/status', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { userEmail, status } = req.body;

    console.log('Update tournament status request:', { gameId, userEmail, status });

    // Check if userEmail is provided
    if (!userEmail) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Check if the user is the game creator
    const gameResult = await db.query(
      'SELECT created_by, config FROM games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.rows[0].created_by !== userEmail) {
      return res.status(403).json({ error: 'Only the game creator can update tournament status' });
    }

    // Prevent status changes from "Finished"
    const currentConfig = gameResult.rows[0].config || {};
    const currentStatus = currentConfig.tournamentStatus || 'Registering';
    if (currentStatus === 'Finished') {
      return res.status(400).json({ error: 'Cannot change status from Finished. Tournament is complete.' });
    }

    // Update status in game configuration (stored in database)
    await db.query(
      `UPDATE games 
       SET config = jsonb_set(
         COALESCE(config, '{}'::jsonb), 
         '{tournamentStatus}', 
         $1::jsonb
       )
       WHERE id = $2`,
      [JSON.stringify(status), gameId]
    );

    res.json({ 
      success: true,
      status
    });
  } catch (error) {
    console.error('Error updating tournament status:', error);
    res.status(500).json({ 
      error: 'Failed to update tournament status',
      details: error.message 
    });
  }
});

// Save tournament results
app.post('/api/games/:gameId/results', async (req, res) => {
  console.log('📥 Results endpoint hit:', req.method, req.path, req.params);
  try {
    const { gameId } = req.params;
    const { userEmail, results } = req.body;

    console.log('Save tournament results request:', { 
      gameId, 
      userEmail, 
      resultsCount: results?.length,
      results: results
    });

    // Check if userEmail is provided
    if (!userEmail) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Check if the user is the game creator
    const gameResult = await db.query(
      'SELECT created_by FROM games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.rows[0].created_by !== userEmail) {
      return res.status(403).json({ error: 'Only the game creator can save tournament results' });
    }

    // Validate results
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'Results must be a non-empty array' });
    }

    // Validate each result has required fields
    for (const result of results) {
      if (!result.position || !result.playerName || result.amount === undefined) {
        return res.status(400).json({ 
          error: 'Each result must have position, playerName, and amount fields',
          invalidResult: result
        });
      }
    }

    // Update results in game configuration
    // Note: jsonb_set expects the value to be a JSONB type, so we need to cast the stringified JSON
    try {
      const resultString = JSON.stringify(results);
      console.log('Attempting to save results:', resultString);
      
      const updateResult = await db.query(
        `UPDATE games 
         SET config = jsonb_set(
           COALESCE(config, '{}'::jsonb), 
           '{tournamentResults}', 
           $1::jsonb
         )
         WHERE id = $2
         RETURNING config`,
        [resultString, gameId]
      );

      console.log('Results saved successfully:', updateResult.rows[0]?.config?.tournamentResults);

      res.json({ 
        success: true,
        results
      });
    } catch (dbError) {
      console.error('Database error saving tournament results:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error saving tournament results:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to save tournament results',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ========== GROUPS ENDPOINTS ==========

// Get all groups for a user
app.get('/api/groups', async (req, res) => {
  try {
    const { userEmail } = req.query;
    
    let query = 'SELECT * FROM groups';
    let params = [];
    
    if (userEmail) {
      query += ' WHERE created_by = $1';
      params = [userEmail];
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await db.query(query, params);
    
    // Fetch players for each group with user info
    const groups = await Promise.all(result.rows.map(async (group) => {
      const playersResult = await db.query(
        `SELECT gp.id, gp.user_code, COALESCE(u.email, u.username) as name
         FROM group_players gp
         LEFT JOIN users u ON gp.user_code = u.user_code
         WHERE gp.group_id = $1
         ORDER BY gp.created_at`,
        [group.id]
      );
      
      return {
        id: group.id,
        name: group.name,
        createdBy: group.created_by,
        createdAt: group.created_at,
        players: playersResult.rows.map(p => ({
          id: p.id,
          userCode: p.user_code,
          name: p.name
        }))
      };
    }));
    
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Create a new group
app.post('/api/groups', async (req, res) => {
  try {
    const { name, createdBy } = req.body;

    console.log('Create group request - Name:', name, 'CreatedBy:', createdBy);

    if (!name || !createdBy) {
      console.log('Validation failed - missing name or createdBy');
      return res.status(400).json({ error: 'Name and createdBy are required' });
    }

    const groupId = generateGroupId();
    console.log('Generated group ID:', groupId);

    await db.query(
      'INSERT INTO groups (id, name, created_by) VALUES ($1, $2, $3)',
      [groupId, name, createdBy]
    );

    console.log('Group created successfully:', groupId);

    res.status(201).json({
      message: 'Group created successfully',
      group: {
        id: groupId,
        name,
        createdBy,
        players: []
      }
    });
  } catch (error) {
    console.error('Error creating group:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Delete a group
app.delete('/api/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    const result = await db.query(
      'DELETE FROM groups WHERE id = $1 RETURNING *',
      [groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Add a player to a group
app.post('/api/groups/:groupId/players', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userCode } = req.body;

    if (!userCode) {
      return res.status(400).json({ error: 'User code is required' });
    }

    // Validate that the user code exists
    const userResult = await db.query(
      'SELECT email, username FROM users WHERE user_code = $1',
      [userCode]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User code not found' });
    }

    const user = userResult.rows[0];
    const displayName = user.email || user.username;

    // Check if user is already in the group
    const existingPlayer = await db.query(
      'SELECT id FROM group_players WHERE group_id = $1 AND user_code = $2',
      [groupId, userCode]
    );

    if (existingPlayer.rows.length > 0) {
      return res.status(400).json({ error: 'User is already in this group' });
    }

    // Insert player with user code
    await db.query(
      'INSERT INTO group_players (group_id, user_code, name) VALUES ($1, $2, $3)',
      [groupId, userCode, displayName]
    );

    // Fetch updated group with all players
    const groupResult = await db.query(
      'SELECT * FROM groups WHERE id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Fetch players with user info
    const playersResult = await db.query(
      `SELECT gp.id, gp.user_code, COALESCE(u.email, u.username) as name
       FROM group_players gp
       LEFT JOIN users u ON gp.user_code = u.user_code
       WHERE gp.group_id = $1
       ORDER BY gp.created_at`,
      [groupId]
    );

    const group = {
      id: groupResult.rows[0].id,
      name: groupResult.rows[0].name,
      createdBy: groupResult.rows[0].created_by,
      createdAt: groupResult.rows[0].created_at,
      players: playersResult.rows.map(p => ({
        id: p.id,
        userCode: p.user_code,
        name: p.name
      }))
    };

    res.status(201).json({
      message: 'Player added successfully',
      group
    });
  } catch (error) {
    console.error('Error adding player:', error);
    res.status(500).json({ error: 'Failed to add player' });
  }
});

// Remove a player from a group
app.delete('/api/groups/:groupId/players/:playerId', async (req, res) => {
  try {
    const { groupId, playerId } = req.params;

    const result = await db.query(
      'DELETE FROM group_players WHERE id = $1 AND group_id = $2 RETURNING *',
      [parseInt(playerId), groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Fetch updated group
    const groupResult = await db.query(
      'SELECT * FROM groups WHERE id = $1',
      [groupId]
    );

    const playersResult = await db.query(
      'SELECT id, name, phone_number FROM group_players WHERE group_id = $1 ORDER BY created_at',
      [groupId]
    );

    const group = {
      id: groupResult.rows[0].id,
      name: groupResult.rows[0].name,
      createdBy: groupResult.rows[0].created_by,
      createdAt: groupResult.rows[0].created_at,
      players: playersResult.rows.map(p => ({
        id: p.id,
        name: p.name,
        phoneNumber: p.phone_number
      }))
    };

    res.json({
      message: 'Player removed successfully',
      group
    });
  } catch (error) {
    console.error('Error removing player:', error);
    res.status(500).json({ error: 'Failed to remove player' });
  }
});

// ========== BLIND STRUCTURES ENDPOINTS ==========

// Get all saved blind structures for a user
app.get('/api/blind-structures', async (req, res) => {
  try {
    const { userIdentifier } = req.query;
    
    if (!userIdentifier) {
      return res.status(400).json({ error: 'User identifier required' });
    }
    
    const result = await db.query(
      'SELECT * FROM saved_blind_structures WHERE user_identifier = $1 ORDER BY created_at DESC',
      [userIdentifier]
    );
    
    const structures = result.rows.map(row => ({
      id: row.id,
      name: row.structure_name,
      levels: row.blind_levels,
      enableBBAntes: row.enable_bb_antes,
      savedAt: row.created_at
    }));
    
    res.json(structures);
  } catch (error) {
    console.error('Error fetching blind structures:', error);
    res.status(500).json({ error: 'Failed to fetch blind structures' });
  }
});

// Save a new blind structure
app.post('/api/blind-structures', async (req, res) => {
  try {
    const { userIdentifier, name, levels, enableBBAntes } = req.body;
    
    if (!userIdentifier || !name || !levels) {
      return res.status(400).json({ error: 'User identifier, name, and levels are required' });
    }
    
    const result = await db.query(
      `INSERT INTO saved_blind_structures (user_identifier, structure_name, blind_levels, enable_bb_antes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userIdentifier, name, JSON.stringify(levels), enableBBAntes || false]
    );
    
    const structure = {
      id: result.rows[0].id,
      name: result.rows[0].structure_name,
      levels: result.rows[0].blind_levels,
      enableBBAntes: result.rows[0].enable_bb_antes,
      savedAt: result.rows[0].created_at
    };
    
    res.status(201).json({
      message: 'Blind structure saved successfully',
      structure
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'A structure with this name already exists' });
    }
    console.error('Error saving blind structure:', error);
    res.status(500).json({ error: 'Failed to save blind structure' });
  }
});

// Delete a blind structure
app.delete('/api/blind-structures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userIdentifier } = req.body;
    
    if (!userIdentifier) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const result = await db.query(
      'DELETE FROM saved_blind_structures WHERE id = $1 AND user_identifier = $2 RETURNING *',
      [id, userIdentifier]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blind structure not found' });
    }
    
    res.json({
      message: 'Blind structure deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blind structure:', error);
    res.status(500).json({ error: 'Failed to delete blind structure' });
  }
});

// ========== AUTOMATIC GAME CLEANUP ==========

// Function to clean up expired games
async function cleanupExpiredGames() {
  try {
    // Get current date/time in the format we store in DB
    const now = new Date();
    const currentDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    // Find all games with a date/time that has passed
    const expiredGamesResult = await db.query(
      `SELECT id, name, game_date_time 
       FROM games 
       WHERE game_date_time IS NOT NULL 
       AND game_date_time < $1`,
      [currentDateTime]
    );
    
    if (expiredGamesResult.rows.length === 0) {
      console.log('🧹 Cleanup check: No expired games to delete');
      return;
    }
    
    console.log(`🧹 Found ${expiredGamesResult.rows.length} expired game(s) to delete`);
    
    // Delete each expired game and its reservations
    for (const game of expiredGamesResult.rows) {
      // Delete reservations first
      await db.query(
        'DELETE FROM reservations WHERE game_id = $1',
        [game.id]
      );
      
      // Delete the game
      await db.query(
        'DELETE FROM games WHERE id = $1',
        [game.id]
      );
      
      console.log(`   ✓ Deleted expired game: "${game.name}" (${game.id}) - was scheduled for ${game.game_date_time}`);
    }
    
    console.log(`🧹 Cleanup complete: Deleted ${expiredGamesResult.rows.length} expired game(s)`);
  } catch (error) {
    console.error('❌ Error during game cleanup:', error);
  }
}

// Schedule cleanup to run once a day at 11pm EST
function startGameCleanupScheduler() {
  // Run cleanup immediately on startup
  cleanupExpiredGames();
  
  // Schedule to run daily at 11pm (23:00) - cron format: minute hour day month dayOfWeek
  cron.schedule('0 23 * * *', () => {
    console.log('🕐 Running scheduled game cleanup (daily at 11pm)...');
    cleanupExpiredGames();
  });
  
  console.log('✅ Game cleanup scheduler started (runs daily at 11pm EST)');
}

// ========== START SERVER ==========

// Serve React app for all other routes (must be after API routes)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log('   Database time:', result.rows[0].now);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('   Please check your DATABASE_URL in .env file');
  }
}

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('📋 Registered API routes:');
  console.log('   POST /api/games/:gameId/results');
  console.log('   POST /api/games/:gameId/status');
  console.log(`Reservations API available at http://localhost:${PORT}/api/reservations`);
  console.log(`Games API available at http://localhost:${PORT}/api/games`);
  console.log(`Groups API available at http://localhost:${PORT}/api/groups`);
  console.log(`User API available at http://localhost:${PORT}/api/users`);
  
  // Test database connection
  await testDatabaseConnection();
  
  // Start cleanup scheduler
  startGameCleanupScheduler();
});
