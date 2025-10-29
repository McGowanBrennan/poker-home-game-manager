import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './GameManagement.css';

function GameManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState('');
  const [games, setGames] = useState([]);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [gameName, setGameName] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [gameTime, setGameTime] = useState('');
  const [gameNote, setGameNote] = useState('');
  const [gameCode, setGameCode] = useState('');
  
  // Groups state
  const [groups, setGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [contactsSupported, setContactsSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  // Tournament player list state
  const [showGameConfig, setShowGameConfig] = useState(false);
  const [showPlayerListQuestion, setShowPlayerListQuestion] = useState(false);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [tournamentPlayers, setTournamentPlayers] = useState([]);
  const [userCode, setUserCode] = useState('');
  const [gameConfig, setGameConfig] = useState({
    gameType: '',
    maxPlayers: 10,
    numberOfTables: 1,
    playersPerTable: 10,
    pokerType: 'NLH',
    smallBlind: '',
    bigBlind: '',
    buyInAmount: '',
    tournamentType: 'Standard',
    enableRebuys: true,
    autoDeleteAfterDays: 7,
    playerList: []
  });

  useEffect(() => {
    // Get user email and user code from navigation state
    if (location.state?.userEmail) {
      setUserEmail(location.state.userEmail);
    }
    if (location.state?.userCode) {
      setUserCode(location.state.userCode);
    }

    // Check if Contact Picker API is supported
    if ('contacts' in navigator && 'ContactsManager' in window) {
      setContactsSupported(true);
    }

    // Detect iOS device
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);
  }, [location]);

  // Fetch games and groups when userEmail is set
  useEffect(() => {
    if (userEmail) {
      fetchGames();
      fetchGroups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  const fetchGames = async () => {
    if (!userEmail) return;
    
    try {
      const response = await fetch(`/api/games?userEmail=${userEmail}`);
      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  // Tournament flow handlers
  const handleTournamentClick = () => {
    setShowGameConfig(false);
    setShowPlayerListQuestion(true);
  };

  const handlePlayerListReady = () => {
    setShowPlayerListQuestion(false);
    setShowPlayerSelection(true);
  };

  const handlePlayerListNotReady = () => {
    setShowPlayerListQuestion(false);
    setShowGameConfig(true);
    setGameConfig({ ...gameConfig, gameType: 'tournament', playerList: [] });
  };

  const handleAddTournamentPlayer = () => {
    const playerName = document.querySelector('.tournament-player-input')?.value;
    if (!playerName?.trim()) {
      alert('Please enter a player name');
      return;
    }
    
    if (tournamentPlayers.some(p => p.toLowerCase() === playerName.trim().toLowerCase())) {
      alert('This player is already in the list');
      return;
    }

    setTournamentPlayers([...tournamentPlayers, playerName.trim()]);
    document.querySelector('.tournament-player-input').value = '';
  };

  const handleRemoveTournamentPlayer = (playerName) => {
    setTournamentPlayers(tournamentPlayers.filter(p => p !== playerName));
  };

  const handlePlayerSelectionComplete = () => {
    if (tournamentPlayers.length === 0) {
      alert('Please add at least one player');
      return;
    }
    
    const playersPerTable = gameConfig.playersPerTable || 10;
    const calculatedTables = Math.ceil(tournamentPlayers.length / playersPerTable);
    
    setShowPlayerSelection(false);
    setShowGameConfig(true);
    setGameConfig({ 
      ...gameConfig, 
      gameType: 'tournament', 
      playerList: tournamentPlayers,
      numberOfTables: calculatedTables
    });
  };

  const handleBackFromPlayerSelection = () => {
    setShowPlayerSelection(false);
    setShowPlayerListQuestion(true);
  };

  const handleBackFromPlayerListQuestion = () => {
    setShowPlayerListQuestion(false);
    setShowGameConfig(true);
    setGameConfig({ ...gameConfig, gameType: '' });
  };

  const handleExitTournamentFlow = () => {
    setShowPlayerListQuestion(false);
    setShowPlayerSelection(false);
    setShowGameConfig(false);
    setTournamentPlayers([]);
    setGameConfig({
      gameType: '',
      maxPlayers: 10,
      numberOfTables: 1,
      playersPerTable: 10,
      pokerType: 'NLH',
      smallBlind: '',
      bigBlind: '',
      buyInAmount: '',
      tournamentType: 'Standard',
      enableRebuys: true,
      autoDeleteAfterDays: 7,
      playerList: []
    });
  };

  const seatPlayersAutomatically = async (gameId, playerList, playersPerTable, numberOfTables) => {
    try {
      const playerDistribution = [];
      let currentTable = 1;
      let currentSeat = 1;

      for (let i = 0; i < playerList.length; i++) {
        playerDistribution.push({
          playerName: playerList[i],
          tableNumber: currentTable,
          seatId: currentSeat
        });

        currentSeat++;
        
        if (currentSeat > playersPerTable) {
          currentTable++;
          currentSeat = 1;
          
          if (currentTable > numberOfTables) {
            currentTable = 1;
          }
        }
      }

      const reservationPromises = playerDistribution.map(({ playerName, tableNumber, seatId }) =>
        fetch(`/api/games/${gameId}/reservations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            seatId,
            playerName,
            tableNumber
          })
        })
      );

      await Promise.all(reservationPromises);
      console.log(`Successfully seated ${playerList.length} players across ${numberOfTables} table(s)`);
    } catch (error) {
      console.error('Error seating players:', error);
      alert('Players were not automatically seated. You can add them manually.');
    }
  };

  const handleOpenGameConfig = () => {
    if (!gameName.trim()) {
      alert('Please enter a game name');
      return;
    }
    setShowGameConfig(true);
  };

  const handleCreateGame = async () => {
    if (!gameName.trim()) {
      alert('Please enter a game name');
      return;
    }

    // Combine date and time for database (without timezone conversion)
    let gameDateTime = null;
    if (gameDate) {
      if (gameTime) {
        // Format as PostgreSQL timestamp: YYYY-MM-DD HH:MM:SS
        gameDateTime = `${gameDate} ${gameTime}:00`;
      } else {
        gameDateTime = `${gameDate} 00:00:00`;
      }
    }

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: gameName,
          createdBy: userEmail,
          gameDateTime,
          note: gameNote.trim() || null,
          config: gameConfig
        })
      });

      if (response.ok) {
        const data = await response.json();
        const gameId = data.game.id;

        // If we have a player list, automatically seat players
        if (gameConfig.playerList && gameConfig.playerList.length > 0) {
          await seatPlayersAutomatically(gameId, gameConfig.playerList, gameConfig.playersPerTable, gameConfig.numberOfTables);
        }

        setShowCreateGame(false);
        setShowGameConfig(false);
        setGameName('');
        setGameDate('');
        setGameTime('');
        setGameNote('');
        setTournamentPlayers([]);
        setGameConfig({
          gameType: '',
          maxPlayers: 10,
          numberOfTables: 1,
          playersPerTable: 10,
          pokerType: 'NLH',
          smallBlind: '',
          bigBlind: '',
          buyInAmount: '',
          tournamentType: 'Standard',
          enableRebuys: true,
          autoDeleteAfterDays: 7,
          playerList: []
        });
        fetchGames();
        // Navigate to the game table with the game ID
        navigate(`/table/${gameId}`, { state: { userEmail, userCode } });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create game');
      }
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
    }
  };

  const handleJoinGame = async () => {
    if (!gameCode.trim()) {
      alert('Please enter a game code');
      return;
    }

    try {
      const response = await fetch(`/api/games/${gameCode}`);
      if (response.ok) {
        await response.json(); // Validate game exists
        navigate(`/table/${gameCode}`, { state: { userEmail } });
      } else {
        alert('Game not found. Please check the code and try again.');
      }
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Failed to join game. Please try again.');
    }
  };

  const handleLogout = () => {
    navigate('/');
  };

  const handleDeleteGame = async (gameId, gameName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${gameName}"?\n\nThis will permanently delete the game and all player reservations. This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail })
      });

      if (response.ok) {
        alert('Game deleted successfully');
        fetchGames(); // Refresh the games list
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete game');
      }
    } catch (error) {
      console.error('Error deleting game:', error);
      alert('Failed to delete game. Please try again.');
    }
  };

  // Groups functions
  const fetchGroups = async () => {
    if (!userEmail) return;
    
    try {
      const response = await fetch(`/api/groups?userEmail=${userEmail}`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newGroupName,
          createdBy: userEmail
        })
      });

      if (response.ok) {
        setShowCreateGroup(false);
        setNewGroupName('');
        fetchGroups();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) {
      return;
    }

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchGroups();
        if (selectedGroup?.id === groupId) {
          setSelectedGroup(null);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group. Please try again.');
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      alert('Please enter a player name');
      return;
    }

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPlayerName,
          phoneNumber: newPlayerPhone
        })
      });

      if (response.ok) {
        const data = await response.json();
        setShowAddPlayer(false);
        setNewPlayerName('');
        setNewPlayerPhone('');
        setSelectedGroup(data.group);
        fetchGroups();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add player');
      }
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Failed to add player. Please try again.');
    }
  };

  const handleAddFromContacts = async () => {
    if (!contactsSupported) {
      alert('Contact picker is not supported on this device');
      return;
    }

    try {
      const props = ['name', 'tel'];
      const opts = { multiple: false };
      
      const contacts = await navigator.contacts.select(props, opts);
      
      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        setNewPlayerName(contact.name?.[0] || '');
        setNewPlayerPhone(contact.tel?.[0] || '');
      }
    } catch (error) {
      console.error('Error selecting contact:', error);
      if (error.name !== 'AbortError') {
        alert('Failed to access contacts. Please try again.');
      }
    }
  };

  const handleVCardUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const vCardText = e.target.result;
        const nameMatch = vCardText.match(/FN:(.+)/i);
        const telMatch = vCardText.match(/TEL[^:]*:(.+)/i);
        
        if (nameMatch) {
          setNewPlayerName(nameMatch[1].trim());
        }
        if (telMatch) {
          // Clean up the phone number (remove spaces, dashes, etc.)
          const phone = telMatch[1].trim().replace(/[\s-()]/g, '');
          setNewPlayerPhone(phone);
        }
      } catch (error) {
        console.error('Error parsing vCard:', error);
        alert('Failed to read contact file. Please try again.');
      }
    };
    reader.readAsText(file);
    
    // Reset the file input
    event.target.value = '';
  };

  const handleOpenContactsApp = () => {
    if (isIOS) {
      // Show instructions modal for iOS users
      alert(
        '📱 To import a contact:\n\n' +
        '1. Open your Contacts app\n' +
        '2. Find the contact you want to add\n' +
        '3. Tap the contact name\n' +
        '4. Scroll down and tap "Share Contact"\n' +
        '5. Choose "Save to Files" or "AirDrop" to yourself\n' +
        '6. Come back here and use "Import Contact" to select the saved file\n\n' +
        'The contact will be saved as a .vcf file that you can import.'
      );
      
      // Attempt to open Contacts app (may not work in all iOS versions/browsers)
      try {
        window.location.href = 'contacts://';
        // Fallback after a short delay if the app doesn't open
        setTimeout(() => {
          // If still on page, the deep link didn't work
          console.log('Deep link may not have worked, instructions shown');
        }, 1000);
      } catch (error) {
        console.log('Deep link not supported, instructions shown');
      }
    }
  };

  const handleRemovePlayer = async (playerId) => {
    if (!window.confirm('Are you sure you want to remove this player?')) {
      return;
    }

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/players/${playerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedGroup(data.group);
        fetchGroups();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove player');
      }
    } catch (error) {
      console.error('Error removing player:', error);
      alert('Failed to remove player. Please try again.');
    }
  };

  return (
    <div className="game-management-page">
      <div className="game-management-container">
        <div className="header">
          <div className="header-content">
            <h1>Game Management</h1>
            {userEmail && <p className="user-email">Logged in as: {userEmail}</p>}
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Log Out
          </button>
        </div>

        <div className="actions-section">
          <div className="action-card">
            <h2>Create New Game</h2>
            <p>Start a new poker game and invite your friends</p>
            {!showCreateGame ? (
              <button 
                onClick={() => setShowCreateGame(true)} 
                className="primary-btn"
              >
                Create Game
              </button>
            ) : (
              <div className="create-game-form">
                <input
                  type="text"
                  placeholder="Enter game name"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="game-input"
                  maxLength={30}
                />
                <div className="date-time-inputs">
                  <div className="input-group">
                    <label htmlFor="game-date">Game Date (Optional)</label>
                    <input
                      id="game-date"
                      type="date"
                      value={gameDate}
                      onChange={(e) => setGameDate(e.target.value)}
                      className="game-input date-input"
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="game-time">Game Time (Optional)</label>
                    <input
                      id="game-time"
                      type="time"
                      value={gameTime}
                      onChange={(e) => setGameTime(e.target.value)}
                      className="game-input time-input"
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label htmlFor="game-note">Game Note (Optional)</label>
                  <textarea
                    id="game-note"
                    placeholder="Add a note about the game (e.g., buy-in amount, special rules)"
                    value={gameNote}
                    onChange={(e) => setGameNote(e.target.value)}
                    className="game-input game-note-input"
                    maxLength={200}
                    rows={3}
                  />
                </div>
                <div className="form-actions">
                  <button onClick={handleOpenGameConfig} className="primary-btn">
                    Next: Configure Game
                  </button>
                  <button 
                    onClick={() => {
                      setShowCreateGame(false);
                      setGameName('');
                      setGameDate('');
                      setGameTime('');
                      setGameNote('');
                    }} 
                    className="secondary-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="action-card">
            <h2>Join Existing Game</h2>
            <p>Enter a game code to join a friend's game</p>
            <div className="join-game-form">
              <input
                type="text"
                placeholder="Enter game code"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value)}
                className="game-input"
              />
              <button onClick={handleJoinGame} className="primary-btn">
                Join Game
              </button>
            </div>
          </div>
        </div>

        <div className="games-section">
          <h2>Your Games</h2>
          {games.length === 0 ? (
            <div className="no-games">
              <p>You haven't created any games yet.</p>
              <p>Create a new game to get started!</p>
            </div>
          ) : (
            <div className="games-list">
              {games.map((game) => (
                <div key={game.id} className="game-card">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGame(game.id, game.name);
                    }}
                    className="delete-game-btn"
                    title="Delete game"
                  >
                    ✕
                  </button>
                  <div className="game-info">
                    <h3>{game.name}</h3>
                    <p className="game-code">Code: {game.id}</p>
                    <p className="game-meta">
                      Created {new Date(game.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/table/${game.id}`, { state: { userEmail } })}
                    className="join-btn"
                  >
                    Enter Game
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Groups Section */}
        <div className="groups-section">
          <div className="section-header">
            <h2>Player Groups</h2>
            {!showCreateGroup ? (
              <button 
                onClick={() => setShowCreateGroup(true)} 
                className="create-group-btn"
              >
                + Create Group
              </button>
            ) : (
              <div className="create-group-inline">
                <input
                  type="text"
                  placeholder="Enter group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="group-input-inline"
                  maxLength={30}
                />
                <button onClick={handleCreateGroup} className="save-btn">
                  Save
                </button>
                <button 
                  onClick={() => {
                    setShowCreateGroup(false);
                    setNewGroupName('');
                  }} 
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="groups-content">
            <div className="groups-list-panel">
              {groups.length === 0 ? (
                <div className="no-groups">
                  <p>No groups yet. Create a group to get started!</p>
                </div>
              ) : (
                <div className="groups-list">
                  {groups.map((group) => (
                    <div 
                      key={group.id} 
                      className={`group-item ${selectedGroup?.id === group.id ? 'selected' : ''}`}
                      onClick={() => setSelectedGroup(group)}
                    >
                      <div className="group-item-content">
                        <h3>{group.name}</h3>
                        <p className="player-count">
                          {group.players?.length || 0} player{group.players?.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(group.id);
                        }} 
                        className="delete-group-btn"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="group-details-panel">
              {selectedGroup ? (
                <>
                  <div className="group-details-header">
                    <h3>{selectedGroup.name}</h3>
                    {!showAddPlayer ? (
                      <button 
                        onClick={() => setShowAddPlayer(true)} 
                        className="add-player-btn"
                      >
                        + Add Player
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setShowAddPlayer(false);
                          setNewPlayerName('');
                          setNewPlayerPhone('');
                        }} 
                        className="cancel-add-btn"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {showAddPlayer && (
                    <div className="add-player-form">
                      <input
                        type="text"
                        placeholder="Player name"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        className="player-input"
                        maxLength={30}
                      />
                      <input
                        type="tel"
                        placeholder="Phone number (optional)"
                        value={newPlayerPhone}
                        onChange={(e) => setNewPlayerPhone(e.target.value)}
                        className="player-input"
                      />
                      <div className="add-player-actions">
                        <button onClick={handleAddPlayer} className="save-player-btn">
                          Save Player
                        </button>
                        {contactsSupported ? (
                          <button onClick={handleAddFromContacts} className="contacts-btn">
                            📱 Pick Contact
                          </button>
                        ) : (
                          <>
                            {isIOS && (
                              <button onClick={handleOpenContactsApp} className="contacts-btn open-contacts-btn">
                                📖 Open Contacts
                              </button>
                            )}
                            <label className="contacts-btn vcard-label">
                              📇 Import Contact
                              <input
                                type="file"
                                accept=".vcf,text/vcard,text/x-vcard"
                                onChange={handleVCardUpload}
                                className="vcard-input"
                              />
                            </label>
                          </>
                        )}
                      </div>
                      {!contactsSupported && isIOS && (
                        <p className="ios-hint">
                          💡 Tap "Open Contacts" for step-by-step instructions, then use "Import Contact" to select the saved .vcf file
                        </p>
                      )}
                      {!contactsSupported && !isIOS && (
                        <p className="ios-hint">
                          💡 Export a contact as vCard (.vcf) from your device and import it here
                        </p>
                      )}
                    </div>
                  )}

                  <div className="players-list">
                    {!selectedGroup.players || selectedGroup.players.length === 0 ? (
                      <div className="no-players">
                        <p>No players in this group yet.</p>
                      </div>
                    ) : (
                      selectedGroup.players.map((player) => (
                        <div key={player.id} className="player-item">
                          <div className="player-info">
                            <p className="player-name">{player.name}</p>
                            {player.phoneNumber && (
                              <p className="player-phone">{player.phoneNumber}</p>
                            )}
                          </div>
                          <button 
                            onClick={() => handleRemovePlayer(player.id)} 
                            className="remove-player-btn"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="no-selection">
                  <p>Select a group to view players</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Game Configuration Modal */}
        {showGameConfig && (
          <div className="modal-overlay" onClick={handleExitTournamentFlow}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Configure Game Settings</h3>
              <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '0.95rem' }}>
                Choose your game type and customize settings
              </p>

              <div className="config-form">
                {/* Game Type Selection */}
                {!gameConfig.gameType && (
                  <div className="game-type-selection">
                    <button
                      onClick={() => setGameConfig({ ...gameConfig, gameType: 'cash' })}
                      className="game-type-btn"
                    >
                      <span className="game-type-icon">💵</span>
                      <span className="game-type-title">Cash Game</span>
                      <span className="game-type-desc">Play with chips that have real value</span>
                    </button>
                    <button
                      onClick={handleTournamentClick}
                      className="game-type-btn"
                    >
                      <span className="game-type-icon">🏆</span>
                      <span className="game-type-title">Tournament</span>
                      <span className="game-type-desc">Play for prizes with fixed buy-in</span>
                    </button>
                  </div>
                )}

                {/* Cash Game Configuration */}
                {gameConfig.gameType === 'cash' && (
                  <>
                    <div className="config-section-header">
                      <h4>Cash Game Settings</h4>
                      <button 
                        onClick={() => setGameConfig({ ...gameConfig, gameType: '' })}
                        className="change-type-btn"
                      >
                        Change Game Type
                      </button>
                    </div>

                    <div className="config-item">
                      <label>Maximum Players</label>
                      <input
                        type="number"
                        min="2"
                        max="20"
                        value={gameConfig.maxPlayers}
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : parseInt(e.target.value);
                          setGameConfig({ ...gameConfig, maxPlayers: value });
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || parseInt(e.target.value) < 2) {
                            setGameConfig({ ...gameConfig, maxPlayers: 10 });
                          }
                        }}
                        className="game-input"
                      />
                    </div>

                    <div className="config-item">
                      <label>Number of Tables</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={gameConfig.numberOfTables}
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : parseInt(e.target.value);
                          setGameConfig({ ...gameConfig, numberOfTables: value });
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || parseInt(e.target.value) < 1) {
                            setGameConfig({ ...gameConfig, numberOfTables: 1 });
                          }
                        }}
                        className="game-input"
                      />
                    </div>

                    <div className="config-item">
                      <label>Game Type</label>
                      <select
                        value={gameConfig.pokerType}
                        onChange={(e) => setGameConfig({ ...gameConfig, pokerType: e.target.value })}
                        className="game-input"
                      >
                        <option value="NLH">No-Limit Hold'em (NLH)</option>
                        <option value="PLO">Pot-Limit Omaha (PLO)</option>
                        <option value="Mixed">Mixed Games</option>
                      </select>
                    </div>

                    <div className="config-item">
                      <label>Stakes</label>
                      <div className="stakes-input-group">
                        <div className="stake-input-wrapper">
                          <span className="stake-label">Small Blind</span>
                          <input
                            type="text"
                            placeholder="$0.50"
                            value={gameConfig.smallBlind}
                            onChange={(e) => setGameConfig({ ...gameConfig, smallBlind: e.target.value })}
                            className="game-input stake-input"
                          />
                        </div>
                        <span className="stake-divider">/</span>
                        <div className="stake-input-wrapper">
                          <span className="stake-label">Big Blind</span>
                          <input
                            type="text"
                            placeholder="$1.00"
                            value={gameConfig.bigBlind}
                            onChange={(e) => setGameConfig({ ...gameConfig, bigBlind: e.target.value })}
                            className="game-input stake-input"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Tournament Configuration */}
                {gameConfig.gameType === 'tournament' && (
                  <>
                    <div className="config-section-header">
                      <h4>Tournament Settings</h4>
                      <button 
                        onClick={() => setGameConfig({ ...gameConfig, gameType: '' })}
                        className="change-type-btn"
                      >
                        Change Game Type
                      </button>
                    </div>

                    {/* Player list vs No player list configuration */}
                    {gameConfig.playerList && gameConfig.playerList.length > 0 ? (
                      <>
                        <div className="config-item">
                          <label>Total Players: {gameConfig.playerList.length}</label>
                          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '5px 0 0 0' }}>
                            {gameConfig.playerList.join(', ')}
                          </p>
                        </div>

                        <div className="config-item">
                          <label>Players Per Table</label>
                          <input
                            type="number"
                            min="2"
                            max="20"
                            value={gameConfig.playersPerTable}
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : parseInt(e.target.value);
                              const playersPerTable = value || 10;
                              const calculatedTables = Math.ceil(gameConfig.playerList.length / playersPerTable);
                              setGameConfig({ ...gameConfig, playersPerTable: value, numberOfTables: calculatedTables });
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '' || parseInt(e.target.value) < 2) {
                                const playersPerTable = 10;
                                const calculatedTables = Math.ceil(gameConfig.playerList.length / playersPerTable);
                                setGameConfig({ ...gameConfig, playersPerTable, numberOfTables: calculatedTables });
                              }
                            }}
                            className="game-input"
                          />
                        </div>

                        <div className="config-item">
                          <label>Number of Tables (Auto-calculated)</label>
                          <input
                            type="number"
                            value={gameConfig.numberOfTables}
                            disabled
                            className="game-input"
                            style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                          />
                          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '5px 0 0 0' }}>
                            Based on {gameConfig.playerList.length} players at {gameConfig.playersPerTable} per table
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="config-item">
                          <label>Maximum Players</label>
                          <input
                            type="number"
                            min="2"
                            max="200"
                            value={gameConfig.maxPlayers}
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : parseInt(e.target.value);
                              setGameConfig({ ...gameConfig, maxPlayers: value });
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '' || parseInt(e.target.value) < 2) {
                                setGameConfig({ ...gameConfig, maxPlayers: 10 });
                              }
                            }}
                            className="game-input"
                          />
                        </div>

                        <div className="config-item">
                          <label>Number of Tables</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={gameConfig.numberOfTables}
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : parseInt(e.target.value);
                              setGameConfig({ ...gameConfig, numberOfTables: value });
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '' || parseInt(e.target.value) < 1) {
                                setGameConfig({ ...gameConfig, numberOfTables: 1 });
                              }
                            }}
                            className="game-input"
                          />
                        </div>
                      </>
                    )}

                    <div className="config-item">
                      <label>Buy-In Amount</label>
                      <input
                        type="text"
                        placeholder="e.g., $50"
                        value={gameConfig.buyInAmount}
                        onChange={(e) => setGameConfig({ ...gameConfig, buyInAmount: e.target.value })}
                        className="game-input"
                      />
                    </div>

                    <div className="config-item">
                      <label>Tournament Type</label>
                      <select
                        value={gameConfig.tournamentType}
                        onChange={(e) => setGameConfig({ ...gameConfig, tournamentType: e.target.value })}
                        className="game-input"
                      >
                        <option value="Standard">Standard</option>
                        <option value="PKO">Progressive Knockout (PKO)</option>
                        <option value="Mystery Bounty">Mystery Bounty</option>
                        <option value="Freezeout">Freezeout</option>
                      </select>
                    </div>

                    {(gameConfig.tournamentType === 'Standard' || gameConfig.tournamentType === 'PKO') && (
                      <div className="config-item">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={gameConfig.enableRebuys}
                            onChange={(e) => setGameConfig({ ...gameConfig, enableRebuys: e.target.checked })}
                          />
                          <span>Allow Re-buys</span>
                        </label>
                      </div>
                    )}
                  </>
                )}
              </div>

              {gameConfig.gameType && (
                <div className="button-group" style={{ marginTop: '20px' }}>
                  <button onClick={handleCreateGame} className="primary-btn">
                    Create Game
                  </button>
                  <button 
                    onClick={handleExitTournamentFlow} 
                    className="secondary-btn"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Player List Question Modal */}
        {showPlayerListQuestion && (
          <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <h3>Tournament Player List</h3>
              <p style={{ color: '#6b7280', marginBottom: '30px', fontSize: '0.95rem' }}>
                Do you already have your player list ready?
              </p>
              
              <div className="player-list-options">
                <button onClick={handlePlayerListReady} className="player-list-option-btn">
                  <span style={{ fontSize: '2rem', marginBottom: '10px' }}>✅</span>
                  <span style={{ fontWeight: '600', marginBottom: '5px' }}>I have my player list</span>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Add players to the tournament</span>
                </button>
                <button onClick={handlePlayerListNotReady} className="player-list-option-btn">
                  <span style={{ fontSize: '2rem', marginBottom: '10px' }}>📋</span>
                  <span style={{ fontWeight: '600', marginBottom: '5px' }}>Player list not finalized</span>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Players can reserve seats later</span>
                </button>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button onClick={handleBackFromPlayerListQuestion} className="cancel-btn">
                  ← Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Player Selection Modal */}
        {showPlayerSelection && (
          <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
              <h3>Add Tournament Players</h3>
              <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '0.95rem' }}>
                Enter the names of players who will participate in this tournament ({tournamentPlayers.length} added)
              </p>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Enter player name"
                    className="player-input tournament-player-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTournamentPlayer();
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button 
                    onClick={handleAddTournamentPlayer}
                    className="save-player-btn"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Add Player
                  </button>
                </div>
              </div>

              {tournamentPlayers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                  <p>No players added yet</p>
                </div>
              ) : (
                <div className="tournament-players-list">
                  {tournamentPlayers.map((playerName, index) => (
                    <div key={index} className="tournament-player-item">
                      <div className="tournament-player-info">
                        <span className="player-number">{index + 1}.</span>
                        <span className="player-name">{playerName}</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveTournamentPlayer(playerName)}
                        className="remove-player-btn"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleBackFromPlayerSelection} 
                  className="cancel-btn"
                >
                  ← Back
                </button>
                <button 
                  onClick={handlePlayerSelectionComplete} 
                  className="confirm-btn"
                  disabled={tournamentPlayers.length === 0}
                  style={{ flex: 1 }}
                >
                  Continue ({tournamentPlayers.length} players)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameManagement;

