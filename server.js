const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs').promises;
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
function generateConfigId() {
  return crypto.randomBytes(8).toString('hex');
}

// Helper functions for game configurations JSON file
async function readGameConfigs() {
  try {
    const data = await fs.readFile('gameConfigurations.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeGameConfigs(configs) {
  await fs.writeFile('gameConfigurations.json', JSON.stringify(configs, null, 2));
}

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
    let configId = null;

    // Create game configuration if provided
    if (config && Object.keys(config).length > 0) {
      console.log('Saving game config:', config);
      configId = generateConfigId();
      
      // Save config to gameConfigurations.json with gameId reference
      const configs = await readGameConfigs();
      configs[configId] = {
        gameId: gameId,
        ...config,
        createdAt: new Date().toISOString()
      };
      console.log('Writing configs to file...');
      await writeGameConfigs(configs);
      console.log('Config saved successfully with ID:', configId);
    }

    // Create game in database
    await db.query(
      'INSERT INTO games (id, name, created_by, game_date_time, note) VALUES ($1, $2, $3, $4::timestamp, $5)',
      [gameId, name, createdBy, gameDateTime || null, note || null]
    );

    res.status(201).json({
      message: 'Game created successfully',
      game: {
        id: gameId,
        name,
        createdBy,
        gameDateTime,
        note,
        configId,
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
    
    // Load configs
    const configs = await readGameConfigs();
    
    // Map games with their configurations by finding config with matching gameId
    const gamesWithConfigs = result.rows.map(game => {
      const configEntry = Object.values(configs).find(cfg => cfg.gameId === game.id);
      return {
        id: game.id,
        name: game.name,
        createdBy: game.created_by,
        createdAt: game.created_at,
        gameDateTime: game.game_date_time,
        note: game.note,
        config: configEntry || null
      };
    });
    
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
    
    // Load config if exists by finding config with matching gameId
    const configs = await readGameConfigs();
    const config = Object.values(configs).find(cfg => cfg.gameId === gameId) || null;
    
    res.json({
      id: game.id,
      name: game.name,
      createdBy: game.created_by,
      createdAt: game.created_at,
      gameDateTime: game.game_date_time,
      note: game.note,
      config: config
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

    // Delete the game
    await db.query(
      'DELETE FROM games WHERE id = $1',
      [gameId]
    );

    // Clean up game config if it exists
    const configs = await readGameConfigs();
    const configId = Object.keys(configs).find(id => configs[id].gameId === gameId);
    
    if (configId) {
      // Remove the config
      delete configs[configId];
      await writeGameConfigs(configs);
    }

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
      'SELECT seat_id, player_name FROM reservations WHERE game_id = $1 AND table_number = $2',
      [gameId, table]
    );

    // Convert to object format {seatId: playerName}
    const reservations = {};
    result.rows.forEach(row => {
      reservations[row.seat_id] = row.player_name;
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
      'SELECT created_by FROM games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.rows[0].created_by !== userEmail) {
      return res.status(403).json({ error: 'Only the game creator can update tournament status' });
    }

    // Update status in game configuration
    const configs = await readGameConfigs();
    let configId = null;
    
    // Find config by gameId
    for (const [id, config] of Object.entries(configs)) {
      if (config.gameId === gameId) {
        configId = id;
        break;
      }
    }

    if (configId && configs[configId]) {
      configs[configId].tournamentStatus = status;
      await writeGameConfigs(configs);
    }

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
  console.log(`Reservations API available at http://localhost:${PORT}/api/reservations`);
  console.log(`Games API available at http://localhost:${PORT}/api/games`);
  console.log(`Groups API available at http://localhost:${PORT}/api/groups`);
  console.log(`User API available at http://localhost:${PORT}/api/users`);
  
  // Test database connection
  await testDatabaseConnection();
  
  // Start cleanup scheduler
  startGameCleanupScheduler();
});
