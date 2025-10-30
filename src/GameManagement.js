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
  const [tournamentPlayerInput, setTournamentPlayerInput] = useState('');
  const [userCode, setUserCode] = useState('');
  
  // Blind structure state
  const [showBlindStructureQuestion, setShowBlindStructureQuestion] = useState(false);
  const [showBlindStructureBuilder, setShowBlindStructureBuilder] = useState(false);
  const [showCustomBlindBuilder, setShowCustomBlindBuilder] = useState(false);
  const [chipSet, setChipSet] = useState('standard'); // 'standard', 'custom'
  const [blindDuration, setBlindDuration] = useState(15); // minutes
  const [customBlindLevels, setCustomBlindLevels] = useState([]);
  const [newLevelSmallBlind, setNewLevelSmallBlind] = useState('');
  const [newLevelBigBlind, setNewLevelBigBlind] = useState('');
  const [newLevelDuration, setNewLevelDuration] = useState('15');
  const [isBreakLevel, setIsBreakLevel] = useState(false);
  const [useSameDuration, setUseSameDuration] = useState(false);
  const [savedDuration, setSavedDuration] = useState('15');
  const [enableBBAntes, setEnableBBAntes] = useState(false);
  const [showSaveStructure, setShowSaveStructure] = useState(false);
  const [structureName, setStructureName] = useState('');
  const [showLoadStructure, setShowLoadStructure] = useState(false);
  const [savedStructures, setSavedStructures] = useState([]);
  
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
    playerList: [],
    blindStructure: null, // Will store the blind structure configuration
    tournamentStatus: 'Registering' // Default status for tournaments
  });

  useEffect(() => {
    // Get user email and user code from navigation state or localStorage
    const emailFromState = location.state?.userEmail;
    const codeFromState = location.state?.userCode;
    const emailFromStorage = localStorage.getItem('userEmail');
    const codeFromStorage = localStorage.getItem('userCode');

    // Prioritize navigation state, then fall back to localStorage
    if (emailFromState) {
      setUserEmail(emailFromState);
      localStorage.setItem('userEmail', emailFromState);
    } else if (emailFromStorage) {
      setUserEmail(emailFromStorage);
    } else {
      // If no user email found, redirect to login
      navigate('/');
      return;
    }

    if (codeFromState) {
      setUserCode(codeFromState);
      localStorage.setItem('userCode', codeFromState);
    } else if (codeFromStorage) {
      setUserCode(codeFromStorage);
    }

    // Check if Contact Picker API is supported
    if ('contacts' in navigator && 'ContactsManager' in window) {
      setContactsSupported(true);
    }

    // Detect iOS device
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);
  }, [location, navigate]);

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
    if (!tournamentPlayerInput.trim()) {
      alert('Please enter a player name');
      return;
    }
    
    if (tournamentPlayers.some(p => p.toLowerCase() === tournamentPlayerInput.trim().toLowerCase())) {
      alert('This player is already in the list');
      return;
    }

    setTournamentPlayers([...tournamentPlayers, tournamentPlayerInput.trim()]);
    setTournamentPlayerInput('');
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
    setShowBlindStructureQuestion(false);
    setShowBlindStructureBuilder(false);
    setShowCustomBlindBuilder(false);
    setShowSaveStructure(false);
    setShowLoadStructure(false);
    setTournamentPlayers([]);
    setTournamentPlayerInput('');
    setChipSet('standard');
    setBlindDuration(15);
    setCustomBlindLevels([]);
    setNewLevelSmallBlind('');
    setNewLevelBigBlind('');
    setNewLevelDuration('15');
    setIsBreakLevel(false);
    setUseSameDuration(false);
    setSavedDuration('15');
    setEnableBBAntes(false);
    setStructureName('');
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
      playerList: [],
      blindStructure: null,
      tournamentStatus: 'Registering'
    });
  };

  const seatPlayersAutomatically = async (gameId, playerList, playersPerTable, numberOfTables) => {
    try {
      console.log(`🎯 Starting automatic seating: ${playerList.length} players, ${numberOfTables} tables`);
      
      const totalPlayers = playerList.length;
      const basePlayersPerTable = Math.floor(totalPlayers / numberOfTables);
      const remainder = totalPlayers % numberOfTables;
      
      console.log(`📊 Base players per table: ${basePlayersPerTable}, Remainder: ${remainder}`);
      
      // Calculate how many players each table should get
      // First 'remainder' tables get one extra player to balance the distribution
      const tableSizes = [];
      for (let i = 0; i < numberOfTables; i++) {
        tableSizes.push(basePlayersPerTable + (i < remainder ? 1 : 0));
      }
      
      console.log(`📋 Table sizes:`, tableSizes);
      
      const playerDistribution = [];
      let playerIndex = 0;
      
      // Distribute players across tables based on calculated sizes
      for (let tableNum = 1; tableNum <= numberOfTables; tableNum++) {
        const playersForThisTable = tableSizes[tableNum - 1];
        
        for (let seat = 1; seat <= playersForThisTable; seat++) {
          if (playerIndex < totalPlayers) {
            playerDistribution.push({
              playerName: playerList[playerIndex],
              tableNumber: tableNum,
              seatId: seat
            });
            playerIndex++;
          }
        }
      }

      console.log(`🪑 Created ${playerDistribution.length} seat assignments`);
      console.log('Distribution breakdown:', playerDistribution.map(p => `${p.playerName} -> Table ${p.tableNumber} Seat ${p.seatId}`));

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
      
      // Log the distribution for debugging
      const distribution = tableSizes.map((size, idx) => `Table ${idx + 1}: ${size} players`).join(', ');
      console.log(`✅ Successfully seated ${playerList.length} players across ${numberOfTables} table(s)`);
      console.log(`📍 Final distribution: ${distribution}`);
    } catch (error) {
      console.error('❌ Error seating players:', error);
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

  // Check if we should show blind structure question or create game directly
  const handleCreateGame = () => {
    if (!gameName.trim()) {
      alert('Please enter a game name');
      return;
    }

    // If it's a tournament, show blind structure question
    if (gameConfig.gameType === 'tournament') {
      setShowGameConfig(false);
      setShowBlindStructureQuestion(true);
    } else {
      // For cash games, create directly
      createGameOnServer();
    }
  };

  // Blind structure question handlers
  const handleUseOwnBlindStructure = () => {
    setShowBlindStructureQuestion(false);
    setShowCustomBlindBuilder(true);
  };

  const handleUseBuiltInBlindStructure = () => {
    setShowBlindStructureQuestion(false);
    setShowBlindStructureBuilder(true);
  };

  const handleBackFromBlindQuestion = () => {
    setShowBlindStructureQuestion(false);
    setShowGameConfig(true);
  };

  const handleBackFromBlindBuilder = () => {
    setShowBlindStructureBuilder(false);
    setShowBlindStructureQuestion(true);
  };

  const handleBackFromCustomBuilder = () => {
    setShowCustomBlindBuilder(false);
    setShowBlindStructureQuestion(true);
  };

  const handleSaveStructure = () => {
    if (customBlindLevels.length === 0) {
      alert('Please add at least one blind level before saving');
      return;
    }
    setShowSaveStructure(true);
  };

  const handleSaveStructureConfirm = async () => {
    if (!structureName.trim()) {
      alert('Please enter a name for this structure');
      return;
    }

    try {
      const response = await fetch('/api/blind-structures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIdentifier: userEmail,
          name: structureName.trim(),
          levels: customBlindLevels,
          enableBBAntes
        })
      });

      if (response.ok) {
        alert(`Blind structure "${structureName}" saved successfully!`);
        setShowSaveStructure(false);
        setStructureName('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save blind structure');
      }
    } catch (error) {
      console.error('Error saving blind structure:', error);
      alert('Failed to save blind structure. Please try again.');
    }
  };

  const handleLoadStructure = async () => {
    try {
      const response = await fetch(`/api/blind-structures?userIdentifier=${encodeURIComponent(userEmail)}`);
      
      if (response.ok) {
        const structures = await response.json();
        
        if (structures.length === 0) {
          alert('You have no saved blind structures yet');
          return;
        }

        setSavedStructures(structures);
        setShowLoadStructure(true);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to load blind structures');
      }
    } catch (error) {
      console.error('Error loading blind structures:', error);
      alert('Failed to load blind structures. Please try again.');
    }
  };

  const handleSelectStructure = (structure) => {
    setCustomBlindLevels(structure.levels);
    setEnableBBAntes(structure.enableBBAntes);
    setShowLoadStructure(false);
    alert(`Loaded structure: ${structure.name}`);
  };

  const handleDeleteStructure = async (structureId, index) => {
    if (!window.confirm('Are you sure you want to delete this blind structure?')) {
      return;
    }

    try {
      const response = await fetch(`/api/blind-structures/${structureId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIdentifier: userEmail
        })
      });

      if (response.ok) {
        // Remove from local state
        const updatedStructures = [...savedStructures];
        updatedStructures.splice(index, 1);
        setSavedStructures(updatedStructures);

        if (updatedStructures.length === 0) {
          setShowLoadStructure(false);
        }
        
        alert('Blind structure deleted successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete blind structure');
      }
    } catch (error) {
      console.error('Error deleting blind structure:', error);
      alert('Failed to delete blind structure. Please try again.');
    }
  };

  const handleAddBlindLevel = () => {
    // For break levels, only duration is required
    if (isBreakLevel) {
      if (!newLevelDuration) {
        alert('Please enter break duration');
        return;
      }
      const duration = parseInt(newLevelDuration);
      if (isNaN(duration) || duration <= 0) {
        alert('Please enter a valid duration');
        return;
      }

      const newLevel = {
        level: customBlindLevels.length + 1,
        isBreak: true,
        duration
      };

      setCustomBlindLevels([...customBlindLevels, newLevel]);
      setNewLevelDuration('');
      setIsBreakLevel(false);
      return;
    }

    // For regular levels, all fields required
    if (!newLevelSmallBlind || !newLevelBigBlind || !newLevelDuration) {
      alert('Please fill in all fields');
      return;
    }

    const smallBlind = parseInt(newLevelSmallBlind);
    const bigBlind = parseInt(newLevelBigBlind);
    const duration = parseInt(newLevelDuration);

    if (isNaN(smallBlind) || isNaN(bigBlind) || isNaN(duration)) {
      alert('Please enter valid numbers');
      return;
    }

    if (smallBlind <= 0 || bigBlind <= 0 || duration <= 0) {
      alert('Values must be greater than 0');
      return;
    }

    if (bigBlind <= smallBlind) {
      alert('Big blind must be greater than small blind');
      return;
    }

    const newLevel = {
      level: customBlindLevels.length + 1,
      smallBlind,
      bigBlind,
      duration,
      bbAnte: enableBBAntes ? bigBlind : null
    };

    setCustomBlindLevels([...customBlindLevels, newLevel]);
    setNewLevelSmallBlind('');
    setNewLevelBigBlind('');
    
    // Save duration after first level
    if (customBlindLevels.length === 0) {
      setSavedDuration(newLevelDuration);
    }
    
    // If using same duration, keep it; otherwise reset
    if (!useSameDuration) {
      setNewLevelDuration(savedDuration);
    }
  };

  const handleRemoveBlindLevel = (index) => {
    const updatedLevels = customBlindLevels.filter((_, i) => i !== index);
    // Re-number the levels
    const reNumbered = updatedLevels.map((level, i) => ({ ...level, level: i + 1 }));
    setCustomBlindLevels(reNumbered);
  };

  const handleCreateGameWithCustomBlinds = () => {
    if (customBlindLevels.length === 0) {
      alert('Please add at least one blind level');
      return;
    }

    const structure = customBlindLevels; // Just use the levels array directly

    setShowCustomBlindBuilder(false);
    createGameOnServer(structure); // Pass structure directly
  };

  const handleGenerateBlindStructure = () => {
    // Generate blind structure based on chip set and duration
    const structure = generateBlindStructure(chipSet, blindDuration);
    setShowBlindStructureBuilder(false);
    createGameOnServer(structure); // Pass structure directly
  };

  // Generate a standard blind structure
  const generateBlindStructure = (chipSetType, duration) => {
    const levels = [];
    const startingStack = chipSetType === 'standard' ? 10000 : 20000;
    let smallBlind = chipSetType === 'standard' ? 25 : 50;
    let bigBlind = chipSetType === 'standard' ? 50 : 100;

    // Generate 15 blind levels
    for (let i = 1; i <= 15; i++) {
      levels.push({
        level: i,
        smallBlind,
        bigBlind,
        ante: i > 3 ? Math.floor(bigBlind / 10) : 0,
        duration: duration
      });

      // Increase blinds progressively
      if (i % 3 === 0) {
        smallBlind *= 2;
        bigBlind *= 2;
      } else {
        smallBlind = Math.floor(smallBlind * 1.5);
        bigBlind = Math.floor(bigBlind * 1.5);
      }
    }

    return {
      chipSet: chipSetType,
      startingStack,
      blindDuration: duration,
      levels
    };
  };

  // Actually create the game on the server
  const createGameOnServer = async (blindStructure = null) => {
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

    // Create config with blind structure if provided
    const configToSend = blindStructure
      ? { ...gameConfig, blindStructure }
      : gameConfig;

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
          config: configToSend
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
        setShowBlindStructureQuestion(false);
        setShowBlindStructureBuilder(false);
        setShowCustomBlindBuilder(false);
        setShowSaveStructure(false);
        setShowLoadStructure(false);
        setGameName('');
        setGameDate('');
        setGameTime('');
        setGameNote('');
        setTournamentPlayers([]);
        setTournamentPlayerInput('');
        setChipSet('standard');
        setBlindDuration(15);
        setCustomBlindLevels([]);
        setNewLevelSmallBlind('');
        setNewLevelBigBlind('');
        setNewLevelDuration('15');
        setIsBreakLevel(false);
        setUseSameDuration(false);
        setSavedDuration('15');
        setEnableBBAntes(false);
        setStructureName('');
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
          playerList: [],
          blindStructure: null,
          tournamentStatus: 'Registering'
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
    // Clear localStorage on logout
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userCode');
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
              {games.map((game) => {
                // Determine status badge color
                const getStatusColor = (status) => {
                  switch(status) {
                    case 'Registering': return '#10b981'; // green
                    case 'In Progress': return '#f59e0b'; // yellow/orange
                    case 'Finished': return '#ef4444'; // red
                    default: return '#6b7280'; // gray
                  }
                };

                const status = game.config?.tournamentStatus;
                const isTournament = game.config?.gameType === 'tournament';

                return (
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
                      {isTournament && status && (
                        <div 
                          className="tournament-status-badge"
                          style={{ 
                            backgroundColor: getStatusColor(status),
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'inline-block',
                            marginTop: '8px',
                            marginBottom: '4px'
                          }}
                        >
                          {status}
                        </div>
                      )}
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
                );
              })}
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
                    value={tournamentPlayerInput}
                    onChange={(e) => setTournamentPlayerInput(e.target.value)}
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

        {/* Blind Structure Question Modal */}
        {showBlindStructureQuestion && (
          <div className="modal-overlay" onClick={handleBackFromBlindQuestion}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <h3>Tournament Blind Structure</h3>
              <p style={{ color: '#6b7280', marginBottom: '30px', fontSize: '0.95rem' }}>
                Would you like to use your own blind structure or let us help you create one?
              </p>
              
              <div className="player-list-options">
                <button onClick={handleUseOwnBlindStructure} className="player-list-option-btn">
                  <span style={{ fontSize: '2rem', marginBottom: '10px' }}>📝</span>
                  <span style={{ fontWeight: '600', marginBottom: '5px' }}>Use my own blind structure</span>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Manage blinds and timers yourself</span>
                </button>
                <button onClick={handleUseBuiltInBlindStructure} className="player-list-option-btn">
                  <span style={{ fontSize: '2rem', marginBottom: '10px' }}>⚙️</span>
                  <span style={{ fontWeight: '600', marginBottom: '5px' }}>Help me create a structure</span>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Auto-generate blinds and timers</span>
                </button>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button onClick={handleBackFromBlindQuestion} className="cancel-btn">
                  ← Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Blind Structure Builder Modal */}
        {showBlindStructureBuilder && (
          <div className="modal-overlay" onClick={handleBackFromBlindBuilder}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <h3>Configure Blind Structure</h3>
              <p style={{ color: '#6b7280', marginBottom: '25px', fontSize: '0.95rem' }}>
                Select your chip set and blind duration to generate a tournament structure
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label className="config-label">Chip Set</label>
                <select 
                  value={chipSet}
                  onChange={(e) => setChipSet(e.target.value)}
                  className="config-select"
                >
                  <option value="standard">Standard (10,000 starting stack)</option>
                  <option value="deep">Deep Stack (20,000 starting stack)</option>
                </select>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label className="config-label">Blind Duration (minutes)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[10, 15, 20, 30].map((duration) => (
                    <button
                      key={duration}
                      onClick={() => setBlindDuration(duration)}
                      className={blindDuration === duration ? 'duration-btn active' : 'duration-btn'}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: blindDuration === duration ? '2px solid #16a34a' : '2px solid #d1d5db',
                        background: blindDuration === duration ? '#f0fdf4' : 'white',
                        color: blindDuration === duration ? '#16a34a' : '#374151',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: blindDuration === duration ? '600' : '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      {duration} min
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '8px' }}>
                  Total tournament time: ~{Math.ceil(15 * blindDuration / 60)} hours
                </p>
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleBackFromBlindBuilder} className="cancel-btn">
                  ← Back
                </button>
                <button 
                  onClick={handleGenerateBlindStructure} 
                  className="confirm-btn"
                  style={{ flex: 1 }}
                >
                  Generate Structure & Create Game
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Blind Structure Builder Modal */}
        {showCustomBlindBuilder && (
          <div className="modal-overlay" onClick={handleBackFromCustomBuilder}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '85vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Custom Blind Structure</h3>
                <button 
                  onClick={handleLoadStructure}
                  className="cancel-btn"
                  style={{ background: '#3b82f6', color: 'white', border: 'none' }}
                >
                  📂 Load Saved
                </button>
              </div>
              <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '0.95rem' }}>
                Add blind levels one by one. Configure options below.
              </p>

              {/* BB Ante Toggle */}
              <div style={{ marginBottom: '20px', padding: '15px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '500' }}>
                  <input
                    type="checkbox"
                    checked={enableBBAntes}
                    onChange={(e) => setEnableBBAntes(e.target.checked)}
                    style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  Enable Big Blind Antes (BB Ante = Big Blind)
                </label>
              </div>

              {/* Add new level form */}
              <div style={{ marginBottom: '25px', padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>
                    Add Level {customBlindLevels.length + 1}
                  </h4>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={isBreakLevel}
                      onChange={(e) => setIsBreakLevel(e.target.checked)}
                      style={{ marginRight: '8px', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    Break Level
                  </label>
                </div>

                {isBreakLevel ? (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
                    <div style={{ flex: 1 }}>
                      <label className="config-label" style={{ fontSize: '0.85rem' }}>Break Duration (min)</label>
                      <input
                        type="number"
                        placeholder="15"
                        value={newLevelDuration}
                        onChange={(e) => setNewLevelDuration(e.target.value)}
                        className="player-input"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <button 
                      onClick={handleAddBlindLevel}
                      className="save-player-btn"
                      style={{ height: '44px', padding: '0 20px' }}
                    >
                      Add Break
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                      <div>
                        <label className="config-label" style={{ fontSize: '0.85rem' }}>Small Blind</label>
                        <input
                          type="number"
                          placeholder="25"
                          value={newLevelSmallBlind}
                          onChange={(e) => setNewLevelSmallBlind(e.target.value)}
                          className="player-input"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label className="config-label" style={{ fontSize: '0.85rem' }}>Big Blind</label>
                        <input
                          type="number"
                          placeholder="50"
                          value={newLevelBigBlind}
                          onChange={(e) => setNewLevelBigBlind(e.target.value)}
                          className="player-input"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label className="config-label" style={{ fontSize: '0.85rem' }}>Duration (min)</label>
                        <input
                          type="number"
                          placeholder="15"
                          value={newLevelDuration}
                          onChange={(e) => setNewLevelDuration(e.target.value)}
                          className="player-input"
                          style={{ width: '100%' }}
                          disabled={useSameDuration && customBlindLevels.length > 0}
                        />
                      </div>
                      <button 
                        onClick={handleAddBlindLevel}
                        className="save-player-btn"
                        style={{ height: '44px', padding: '0 20px' }}
                      >
                        Add
                      </button>
                    </div>
                    {customBlindLevels.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem', color: '#6b7280' }}>
                          <input
                            type="checkbox"
                            checked={useSameDuration}
                            onChange={(e) => {
                              setUseSameDuration(e.target.checked);
                              if (e.target.checked) {
                                setNewLevelDuration(savedDuration);
                              }
                            }}
                            style={{ marginRight: '8px', width: '14px', height: '14px', cursor: 'pointer' }}
                          />
                          Use same duration ({savedDuration} min) for all future levels
                        </label>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Blind levels table */}
              {customBlindLevels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px', marginBottom: '20px' }}>
                  <p>No blind levels added yet. Add your first level above.</p>
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ marginBottom: '15px', fontSize: '1rem', color: '#374151' }}>
                    Blind Levels ({customBlindLevels.length})
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Level</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Small Blind</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Big Blind</th>
                          {enableBBAntes && <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>BB Ante</th>}
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Duration</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customBlindLevels.map((level, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #e5e7eb', background: level.isBreak ? '#fef3c7' : 'transparent' }}>
                            <td style={{ padding: '12px', color: '#374151', fontWeight: level.isBreak ? '600' : '400' }}>
                              {level.isBreak ? `Break ${level.level}` : level.level}
                            </td>
                            <td style={{ padding: '12px', color: '#374151' }}>
                              {level.isBreak ? '—' : level.smallBlind}
                            </td>
                            <td style={{ padding: '12px', color: '#374151' }}>
                              {level.isBreak ? '—' : level.bigBlind}
                            </td>
                            {enableBBAntes && (
                              <td style={{ padding: '12px', color: '#374151' }}>
                                {level.isBreak ? '—' : (level.bbAnte || '—')}
                              </td>
                            )}
                            <td style={{ padding: '12px', color: '#374151' }}>{level.duration} min</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <button 
                                onClick={() => handleRemoveBlindLevel(index)}
                                className="remove-player-btn"
                                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '12px' }}>
                    Total tournament time: ~{Math.ceil(customBlindLevels.reduce((sum, level) => sum + level.duration, 0) / 60)} hours
                  </p>
                </div>
              )}

              <div className="modal-actions" style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleBackFromCustomBuilder} className="cancel-btn">
                  ← Back
                </button>
                <button 
                  onClick={handleSaveStructure}
                  className="cancel-btn"
                  style={{ background: '#10b981', color: 'white', border: 'none' }}
                  disabled={customBlindLevels.length === 0}
                >
                  💾 Save Structure
                </button>
                <button 
                  onClick={handleCreateGameWithCustomBlinds} 
                  className="confirm-btn"
                  style={{ flex: 1 }}
                  disabled={customBlindLevels.length === 0}
                >
                  Create Game ({customBlindLevels.length} levels)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Structure Name Modal */}
        {showSaveStructure && (
          <div className="modal-overlay" onClick={() => setShowSaveStructure(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <h3>Save Blind Structure</h3>
              <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '0.95rem' }}>
                Give this blind structure a name so you can reuse it later.
              </p>
              
              <div style={{ marginBottom: '20px' }}>
                <label className="config-label">Structure Name</label>
                <input
                  type="text"
                  placeholder="e.g., Standard Weekly Tournament"
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveStructureConfirm();
                    }
                  }}
                  className="player-input"
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowSaveStructure(false)} className="cancel-btn">
                  Cancel
                </button>
                <button 
                  onClick={handleSaveStructureConfirm}
                  className="confirm-btn"
                  style={{ flex: 1 }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load Saved Structures Modal */}
        {showLoadStructure && (
          <div className="modal-overlay" onClick={() => setShowLoadStructure(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '70vh', overflow: 'auto' }}>
              <h3>Load Saved Blind Structure</h3>
              <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '0.95rem' }}>
                Select a previously saved blind structure to load.
              </p>

              {savedStructures.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                  <p>No saved structures found.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  {savedStructures.map((structure, index) => (
                    <div 
                      key={index}
                      style={{
                        padding: '15px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#111827' }}>
                          {structure.name}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                          {structure.levels.length} levels • 
                          {structure.enableBBAntes ? ' BB Antes enabled' : ' No BB Antes'} • 
                          Saved {new Date(structure.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleSelectStructure(structure)}
                          className="save-player-btn"
                          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                        >
                          Load
                        </button>
                        <button 
                          onClick={() => handleDeleteStructure(structure.id, index)}
                          className="remove-player-btn"
                          style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                <button onClick={() => setShowLoadStructure(false)} className="cancel-btn" style={{ width: '100%' }}>
                  Close
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

