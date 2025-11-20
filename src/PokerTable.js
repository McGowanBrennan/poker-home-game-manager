import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTournamentTimer } from './hooks/useTournamentTimer';
import './App.css';

function PokerTable() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [reservedSeats, setReservedSeats] = useState({});
  const [allReservations, setAllReservations] = useState({}); // All reservations across all tables for prize pool calculation
  const [gameName, setGameName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userCode, setUserCode] = useState('');
  const [gameCreator, setGameCreator] = useState('');
  const [gameDateTime, setGameDateTime] = useState(null);
  const [gameNote, setGameNote] = useState(null);
  const [gameConfig, setGameConfig] = useState(null);
  const [currentTable, setCurrentTable] = useState(1);
  const [tournamentStatus, setTournamentStatus] = useState('Registering');
  const [showEditDetails, setShowEditDetails] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editNote, setEditNote] = useState('');
  const [showBlindStructure, setShowBlindStructure] = useState(false);
  const [buyInPopupPlayer, setBuyInPopupPlayer] = useState(null); // {seatId, playerName, buyInCount, owedAmount}
  const [showPayoutStructure, setShowPayoutStructure] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [tournamentResults, setTournamentResults] = useState([]); // Array of {position, playerName, amount}
  
  // Calculate if current user is game creator
  const isCreator = userEmail && gameCreator && userEmail === gameCreator;
  
  // Tournament timer hook
  const timer = useTournamentTimer({
    gameId,
    gameConfig,
    tournamentStatus,
    isCreator,
    userEmail
  });
  
  const pollingIntervalRef = useRef(null); // Track polling interval to adjust dynamically

  const players = [
    { id: 1, position: 'seat-1' },
    { id: 2, position: 'seat-2' },
    { id: 3, position: 'seat-3' },
    { id: 4, position: 'seat-4' },
    { id: 5, position: 'seat-5' },
    { id: 6, position: 'seat-6' },
    { id: 7, position: 'seat-7' },
    { id: 8, position: 'seat-8' },
  ];

  // Fetch game details and reservations from server
  const fetchGameData = async (skipTimerSync = false) => {
    try {
      // Fetch game details
      const gameResponse = await fetch(`/api/games/${gameId}`);
      
      if (gameResponse.status === 404) {
        // Game doesn't exist (was deleted)
        alert('This game no longer exists. It may have been deleted.');
        if (userEmail) {
          navigate('/dashboard', { state: { userEmail, userCode } });
        } else {
          navigate('/');
        }
        return;
      }
      
      if (gameResponse.ok) {
        const gameData = await gameResponse.json();
        
        console.log('📥 Full game data received:', {
          currentBlindLevel: gameData.currentBlindLevel,
          timeRemainingSeconds: gameData.timeRemainingSeconds,
          timerRunning: gameData.timerRunning,
          timerPaused: gameData.timerPaused,
          timerLastUpdate: gameData.timerLastUpdate,
          hasBlindStructure: !!gameData.config?.blindStructure
        });
        
        // Load timer state FIRST (before state updates that trigger initialization effect)
        // This ensures timer state is loaded before the initialization effect runs
        if (!skipTimerSync) {
          timer.loadTimerStateFromData(gameData);
        }

        setGameName(gameData.name);
        setGameCreator(gameData.createdBy);
        setGameDateTime(gameData.gameDateTime);
        setGameNote(gameData.note);
        setGameConfig(gameData.config);
        
        // Set tournament status if available
        if (gameData.config && gameData.config.tournamentStatus) {
          setTournamentStatus(gameData.config.tournamentStatus);
        }

        // Load tournament results if available
        if (gameData.config && gameData.config.tournamentResults) {
          setTournamentResults(gameData.config.tournamentResults);
        }

        // Fetch reservations for this game and current table
        const reservationsResponse = await fetch(`/api/games/${gameId}/reservations?tableNumber=${currentTable}`);
        let reservationsData = {};
      if (reservationsResponse.ok) {
          reservationsData = await reservationsResponse.json();
        setReservedSeats(reservationsData);
        }

        // Fetch ALL reservations across all tables for prize pool calculation
        // Use gameData.config directly (not gameConfig state) since state updates are async
        if (gameData.config?.gameType === 'tournament') {
          const numberOfTables = gameData.config.numberOfTables || 1; // Default to 1 if not set
          console.log('🏆 Fetching all reservations for tournament with', numberOfTables, 'table(s)');
          
          const allReservationsPromises = [];
          for (let table = 1; table <= numberOfTables; table++) {
            allReservationsPromises.push(
              fetch(`/api/games/${gameId}/reservations?tableNumber=${table}`)
                .then(res => {
                  if (res.ok) {
                    return res.json();
                  }
                  console.warn(`⚠️ Failed to fetch reservations for table ${table}`);
                  return {};
                })
                .catch(error => {
                  console.error(`❌ Error fetching table ${table}:`, error);
                  return {};
                })
            );
          }
          
          Promise.all(allReservationsPromises).then(allTablesData => {
            console.log('📊 Fetched reservations from all tables:', allTablesData);
            
            // Combine all tables' reservations into one object
            const combined = {};
            allTablesData.forEach((tableData, index) => {
              console.log(`  Table ${index + 1} has ${Object.keys(tableData).length} reservations`);
              Object.keys(tableData).forEach(seatId => {
                // Use unique key combining table and seat to avoid conflicts
                // For single table, keys will be: table1_seat1, table1_seat2, etc.
                const uniqueKey = numberOfTables > 1 ? `table${index + 1}_seat${seatId}` : seatId;
                combined[uniqueKey] = tableData[seatId];
              });
            });
            
            console.log('💰 Combined all reservations for prize pool:', combined, 'Total keys:', Object.keys(combined).length);
            setAllReservations(combined);
          }).catch(error => {
            console.error('❌ Error in Promise.all for all reservations:', error);
            // Fallback: use current table's reservations if we have them
            console.log('🔄 Using fallback: current table reservations');
            setAllReservations(reservationsData || {});
          });
        } else {
          // For non-tournament games, just use current table's reservations
          console.log('💰 Non-tournament game, using current table reservations for allReservations');
          setAllReservations(reservationsData || {});
        }
      }
    } catch (error) {
      console.error('Error fetching game data:', error);
    }
  };

  // Update polling interval when tournament status or timer pause state changes
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      
      // If timer is paused, stop frequent polling (timer not changing)
      const skipTimerSync = tournamentStatus !== 'In Progress' || timer.timerPaused;
      let interval = timer.getPollInterval(tournamentStatus);
      
      // When paused during "In Progress", use longer interval (30 seconds) since timer isn't changing
      if (tournamentStatus === 'In Progress' && timer.timerPaused) {
        interval = 30000; // 30 seconds when paused
      }
      
      pollingIntervalRef.current = setInterval(() => {
        fetchGameData(skipTimerSync);
      }, interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentStatus, timer.timerPaused]);

  // Load game data on mount and poll for updates
  useEffect(() => {
    // Get user email and user code from navigation state or localStorage
    const emailFromState = location.state?.userEmail;
    const codeFromState = location.state?.userCode;
    const emailFromStorage = localStorage.getItem('userEmail');
    const codeFromStorage = localStorage.getItem('userCode');

    // Prioritize navigation state, then fall back to localStorage
    if (emailFromState) {
      setUserEmail(emailFromState);
    } else if (emailFromStorage) {
      setUserEmail(emailFromStorage);
    }

    if (codeFromState) {
      setUserCode(codeFromState);
    } else if (codeFromStorage) {
      setUserCode(codeFromStorage);
    }

    fetchGameData();
    
    // Start polling based on tournament status and timer pause state
    const skipTimerSync = tournamentStatus !== 'In Progress' || timer.timerPaused;
    let interval = timer.getPollInterval(tournamentStatus);
    
    // When paused during "In Progress", use longer interval since timer isn't changing
    if (tournamentStatus === 'In Progress' && timer.timerPaused) {
      interval = 30000; // 30 seconds when paused
    }
    
    pollingIntervalRef.current = setInterval(() => {
      fetchGameData(skipTimerSync);
    }, interval);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, currentTable]);


  const handleReserveSeat = async (seatId) => {
    // Check if seat is already reserved
    if (reservedSeats[seatId]) {
      return;
    }

    // Prompt user for their name
    const playerName = window.prompt('Please enter your name (max 20 characters):');
    
    // Check if user cancelled
    if (playerName === null) {
      return;
    }

    // Trim whitespace
    const trimmedName = playerName.trim();

    // Validate name
    if (trimmedName === '') {
      alert('Name cannot be empty. Please try again.');
      return;
    }

    if (trimmedName.length > 20) {
      alert('Name cannot be longer than 20 characters. Please try again.');
      return;
    }

    // Reserve the seat via API
    try {
      const response = await fetch(`/api/games/${gameId}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seatId: seatId.toString(),
          playerName: trimmedName,
          tableNumber: currentTable
        })
      });

      if (response.ok) {
        const data = await response.json();
        setReservedSeats(data.reservations);
        // Immediately refresh all data to sync across tables and update prize pool
        fetchGameData(tournamentStatus !== 'In Progress');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to reserve seat');
      }
    } catch (error) {
      console.error('Error reserving seat:', error);
      alert('Failed to reserve seat. Please try again.');
    }
  };

  const handleBackToDashboard = () => {
    // If user is signed in, go to dashboard; otherwise go to landing page
    if (userEmail) {
      navigate('/dashboard', { state: { userEmail, userCode } });
    } else {
      navigate('/');
    }
  };

  // Format game date/time for display
  const formatGameDateTime = (dateTimeString) => {
    if (!dateTimeString) return null;
    
    try {
      // Handle both ISO format (2025-10-29T21:22:00.000Z) and PostgreSQL format (2025-10-29 21:22:00)
      let date;
      
      if (dateTimeString.includes('T')) {
        // ISO format - strip the Z to treat as local time
        const localDateString = dateTimeString.replace('Z', '').replace('T', ' ');
        const parts = localDateString.split(' ');
        const datePart = parts[0]; // YYYY-MM-DD
        const timePart = parts[1]; // HH:MM:SS.mmm or HH:MM:SS
        
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        
        // Create date with explicit values (no timezone conversion)
        date = new Date(year, month - 1, day, hour, minute);
      } else {
        // PostgreSQL format: YYYY-MM-DD HH:MM:SS
        const parts = dateTimeString.split(' ');
        const datePart = parts[0];
        const timePart = parts[1];
        
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        
        date = new Date(year, month - 1, day, hour, minute);
      }
      
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return null;
    }
  };

  const handleCopyGameLink = async () => {
    const gameLink = `${window.location.origin}/table/${gameId}`;
    const message = `Come join my game ${gameLink}`;
    
    try {
      await navigator.clipboard.writeText(message);
      alert('Game invitation copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Game invitation copied to clipboard!');
      } catch (err) {
        alert('Failed to copy link. Please copy manually: ' + message);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleRemoveReservation = async (seatId) => {
    if (!window.confirm('Are you sure you want to remove this player?')) {
      return;
    }

    try {
      const response = await fetch(`/api/games/${gameId}/reservations/${seatId}?tableNumber=${currentTable}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail
        })
      });

      if (response.ok) {
        const data = await response.json();
        setReservedSeats(data.reservations);
        // Immediately refresh all data to sync across tables and update prize pool
        fetchGameData(tournamentStatus !== 'In Progress');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove reservation');
      }
    } catch (error) {
      console.error('Error removing reservation:', error);
      alert('Failed to remove reservation. Please try again.');
    }
  };

  const handleUpdateBuyInCount = async (seatId, newCount, addOnPurchased = false) => {
    try {
      const response = await fetch(`/api/games/${gameId}/reservations/${seatId}/buyins`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
          tableNumber: currentTable,
          buyInCount: newCount,
          buyInAmount: gameConfig?.buyInAmount || 0,
          addOnPurchased: addOnPurchased,
          addOnCost: gameConfig?.addOnCost || 0
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state with new values from server
        setReservedSeats(prev => ({
          ...prev,
          [seatId]: {
            ...prev[seatId],
            paidBuyin: data.reservation.paidBuyin,
            owedAmount: data.reservation.owedAmount,
            addOnPurchased: data.reservation.addOnPurchased
          }
        }));
        
        // Also update allReservations for accurate prize pool calculation
        const numberOfTables = gameConfig?.numberOfTables || 1;
        const uniqueKey = numberOfTables > 1 ? `table${currentTable}_seat${seatId}` : seatId;
        
        setAllReservations(prev => ({
          ...prev,
          [uniqueKey]: {
            ...prev[uniqueKey],
            playerName: prev[uniqueKey]?.playerName || data.reservation.playerName,
            owedAmount: data.reservation.owedAmount,
            addOnPurchased: data.reservation.addOnPurchased
          }
        }));
        
        console.log('🔄 Updated allReservations for prize pool:', uniqueKey, 'Amount:', data.reservation.owedAmount);
        
        // Immediately refresh all reservations to ensure prize pool is accurate across all tables
        fetchGameData(tournamentStatus !== 'In Progress');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update buy-in count');
      }
    } catch (error) {
      console.error('Error updating buy-in count:', error);
      alert('Failed to update buy-in count. Please try again.');
    }
  };

  // Calculate prize pool (sum of all buy-ins across all players on all tables)
  const calculatePrizePool = () => {
    if (!gameConfig || gameConfig.gameType !== 'tournament') {
      return 0;
    }
    
    // Sum up all owed amounts across ALL tables (not just current table)
    const reservationsArray = Object.values(allReservations);
    console.log('🏆 Calculating prize pool from', reservationsArray.length, 'reservations:', allReservations);
    
    const total = reservationsArray.reduce((sum, reservation) => {
      const amount = parseFloat(reservation?.owedAmount) || 0;
      console.log('  - Reservation:', reservation, 'Amount:', amount);
      return sum + amount;
    }, 0);
    
    console.log('💰 Total prize pool calculated:', total);
    return total;
  };

  // Calculate actual payouts based on prize pool and payout structure
  const calculatePayouts = () => {
    const prizePool = calculatePrizePool();
    if (!gameConfig?.payoutStructure || prizePool === 0) {
      return [];
    }

    return gameConfig.payoutStructure.map(payout => ({
      position: payout.position,
      percentage: payout.percentage,
      amount: (prizePool * payout.percentage) / 100
    }));
  };

  // Format time remaining as MM:SS

  const handleRandomizeSeating = async () => {
    if (!window.confirm('Are you sure you want to randomize the seating chart? This will shuffle all players and redistribute them evenly across tables.')) {
      return;
    }

    try {
      const response = await fetch(`/api/games/${gameId}/randomize-seating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
          numberOfTables: gameConfig?.numberOfTables || 1
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Seating randomized! ${data.totalPlayers} players distributed across ${gameConfig?.numberOfTables || 1} table(s).`);
        // Refresh game data to show new seating
        fetchGameData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to randomize seating');
      }
    } catch (error) {
      console.error('Error randomizing seating:', error);
      alert('Failed to randomize seating. Please try again.');
    }
  };

  const handleUpdateTournamentStatus = async () => {
    // Prevent status changes from "Finished"
    if (tournamentStatus === 'Finished') {
      alert('Tournament is finished and cannot be changed to another status.');
      return;
    }

    const statuses = ['Registering', 'In Progress', 'Finished'];
    const currentIndex = statuses.indexOf(tournamentStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    const newStatus = statuses[nextIndex];

    // If changing to "Finished", show results entry modal instead of immediately updating
    if (newStatus === 'Finished' && tournamentStatus === 'In Progress') {
      // Initialize results array with payout structure
      const payouts = calculatePayouts();
      const initialResults = payouts.map(payout => ({
        position: payout.position,
        playerName: '',
        amount: payout.amount
      }));
      setTournamentResults(initialResults);
      setShowResultsModal(true);
      return;
    }

    // For other status changes, update immediately
    try {
      const response = await fetch(`/api/games/${gameId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
          status: newStatus
        })
      });

      if (response.ok) {
        setTournamentStatus(newStatus);
        // Immediately fetch latest game state; if moving to In Progress, do a full timer sync
        const skipTimerSync = newStatus !== 'In Progress';
        fetchGameData(skipTimerSync);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update tournament status');
      }
    } catch (error) {
      console.error('Error updating tournament status:', error);
      alert('Failed to update tournament status. Please try again.');
    }
  };

  const handleSaveResults = async () => {
    // Validate that all positions have player names
    const emptyPositions = tournamentResults.filter(r => !r.playerName || r.playerName.trim() === '');
    if (emptyPositions.length > 0) {
      alert('Please select players for all paid positions.');
      return;
    }

    try {
      // First save the results
      const resultsResponse = await fetch(`/api/games/${gameId}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
          results: tournamentResults
        })
      });

      if (!resultsResponse.ok) {
        const error = await resultsResponse.json();
        console.error('Error saving results:', error);
        alert(error.error || error.details || 'Failed to save tournament results');
        return;
      }

      // Then update status to "Finished"
      const statusResponse = await fetch(`/api/games/${gameId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
          status: 'Finished'
        })
      });

      if (statusResponse.ok) {
        setTournamentStatus('Finished');
        setShowResultsModal(false);
        // Navigate to dashboard after saving results
        navigate('/dashboard', { state: { userEmail, userCode } });
      } else {
        const error = await statusResponse.json();
        alert(error.error || 'Failed to update tournament status');
      }
    } catch (error) {
      console.error('Error saving tournament results:', error);
      alert(`Failed to save tournament results: ${error.message || 'Unknown error'}. Please check the console for details.`);
    }
  };

  // Get unique player names from all reservations
  const getTournamentPlayers = () => {
    const playersSet = new Set();
    Object.values(allReservations).forEach(reservation => {
      if (reservation?.playerName) {
        playersSet.add(reservation.playerName);
      }
    });
    return Array.from(playersSet).sort();
  };

  const handleCancelResults = () => {
    setShowResultsModal(false);
    setTournamentResults([]);
  };

  const handleOpenEditDetails = () => {
    // Parse existing date/time if available
    if (gameDateTime) {
      const date = new Date(gameDateTime);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      setEditDate(`${year}-${month}-${day}`);
      setEditTime(`${hours}:${minutes}`);
    } else {
      setEditDate('');
      setEditTime('');
    }
    
    setEditNote(gameNote || '');
    setShowEditDetails(true);
  };

  const handleSaveDetails = async () => {
    try {
      // Combine date and time
      let gameDateTime = null;
      if (editDate && editTime) {
        gameDateTime = `${editDate}T${editTime}`;
      }

      console.log('Sending update request:', {
        gameId,
        userEmail,
        gameDateTime,
        note: editNote.trim() || null
      });

      const response = await fetch(`/api/games/${gameId}/update-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
          gameDateTime: gameDateTime,
          note: editNote.trim() || null
        })
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Update successful:', data);
        setGameDateTime(data.game.game_date_time);
        setGameNote(data.game.note);
        setShowEditDetails(false);
        alert('Game details updated successfully!');
      } else {
        const error = await response.json();
        console.error('Server error:', error);
        alert(error.error || 'Failed to update game details');
      }
    } catch (error) {
      console.error('Error updating game details:', error);
      alert(`Failed to update game details: ${error.message}`);
    }
  };

  return (
    <div className="App">
      <div className="poker-room">
        <div className="game-header-minimal">
          <div className="header-row">
            <button onClick={handleBackToDashboard} className="minimal-btn back-btn" title={userEmail ? 'Back to Dashboard' : 'Return to Home'}>
              ← Back
          </button>
            <div className="header-center">
              <h2 className="game-title-minimal">{gameName || 'Poker Game'}</h2>
              <button onClick={handleCopyGameLink} className="game-code-minimal" title="Click to copy invite link">
                {gameId}
          </button>
              {gameDateTime && (
                <div className="header-datetime" onClick={isCreator ? handleOpenEditDetails : undefined} style={{ cursor: isCreator ? 'pointer' : 'default' }} title={isCreator ? 'Click to edit' : ''}>
                  📅 {formatGameDateTime(gameDateTime)}
                </div>
              )}
              {gameNote && (
                <div className="header-note" onClick={isCreator ? handleOpenEditDetails : undefined} style={{ cursor: isCreator ? 'pointer' : 'default' }} title={isCreator ? 'Click to edit' : ''}>
                  {gameNote}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {gameConfig && gameConfig.gameType === 'tournament' && gameConfig.blindStructure && (
                <button 
                  onClick={() => setShowBlindStructure(true)}
                  className="minimal-btn blinds-btn" 
                  title="View blind structure"
                >
                  📊 Blinds
                </button>
              )}
              {isCreator ? (
                <button 
                  onClick={handleRandomizeSeating} 
                  className="minimal-btn randomize-btn" 
                  title="Shuffle players and balance tables"
                >
                  🔀 Shuffle
                </button>
              ) : (
                !gameConfig?.blindStructure && <div className="header-spacer"></div>
              )}
            </div>
          </div>
        </div>

        <div className="poker-table-container">
          <div className="poker-table">
            {players.map((player) => {
              const reservation = reservedSeats[player.id];
              const isReserved = !!reservation;
              const playerName = reservation?.playerName || '';
              const owedAmount = reservation?.owedAmount || 0;
              const buyInAmount = parseFloat(gameConfig?.buyInAmount) || 0;
              const buyInCount = buyInAmount > 0 ? Math.round(owedAmount / buyInAmount) : 0;
              const hasTotal = owedAmount > 0;
              
              const handleButtonClick = () => {
                if (isReserved && isCreator) {
                  // Open buy-in popup for tournaments (allow updates during Registering and In Progress)
                  if (gameConfig?.gameType === 'tournament' && (tournamentStatus === 'Registering' || tournamentStatus === 'In Progress')) {
                    setBuyInPopupPlayer({
                      seatId: player.id,
                      playerName,
                      buyInCount,
                      owedAmount,
                      addOnPurchased: reservation?.addOnPurchased || false
                    });
                  } else {
                    // For non-tournaments or other statuses, remove directly
                  handleRemoveReservation(player.id);
                  }
                } else if (!isReserved) {
                  handleReserveSeat(player.id);
                }
              };
              
              return (
                <div key={player.id} className={`player-seat ${player.position}`}>
                  <div 
                    className={`player-avatar ${isReserved ? 'reserved' : ''} ${hasTotal ? 'has-total' : ''}`}
                  >
                    {isReserved && (
                      <>
                      <img 
                        src="/player-avatar.png" 
                          alt={playerName}
                        className="avatar-image"
                      />
                        {hasTotal && (
                          <div className="avatar-hover-amount">
                            <div className="hover-amount-value">${owedAmount.toFixed(0)}</div>
                            <div className="hover-amount-label">{buyInCount} buy-in{buyInCount !== 1 ? 's' : ''}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <button 
                    className={`reserve-seat-btn ${isReserved ? 'reserved' : ''} ${isReserved && isCreator ? 'removable' : ''} ${hasTotal ? 'has-total' : ''}`}
                    onClick={handleButtonClick}
                    disabled={isReserved && !isCreator}
                    title={isReserved ? (isCreator ? `${playerName} (click to manage)` : playerName) : ''}
                  >
                    {isReserved ? playerName : 'Reserve Seat'}
                  </button>
                </div>
              );
            })}
            
            {/* Tournament Status Button */}
            {gameConfig && gameConfig.gameType === 'tournament' && (
              <div className="tournament-status-container">
                <button
                  className={`tournament-status-btn ${isCreator && tournamentStatus !== 'Finished' ? 'clickable' : ''}`}
                  onClick={isCreator && tournamentStatus !== 'Finished' ? handleUpdateTournamentStatus : undefined}
                  disabled={!isCreator || tournamentStatus === 'Finished'}
                  title={tournamentStatus === 'Finished' ? 'Tournament is finished' : (isCreator ? 'Click to change status' : '')}
                >
                  {tournamentStatus}
                </button>
                
                {/* Prize Pool Display - Show during Registering, In Progress, and Finished */}
                {gameConfig.buyInAmount && (tournamentStatus === 'Registering' || tournamentStatus === 'In Progress' || tournamentStatus === 'Finished') && (
                  <div 
                    className="prize-pool-display clickable"
                    onClick={() => gameConfig?.payoutStructure && setShowPayoutStructure(true)}
                    style={{ cursor: gameConfig?.payoutStructure ? 'pointer' : 'default' }}
                    title={gameConfig?.payoutStructure ? 'Click to view payout structure' : ''}
                  >
                    <span className="prize-pool-label">Prize Pool:</span>
                    <span className="prize-pool-amount">${calculatePrizePool()}</span>
                  </div>
                )}

                {/* Blind Timer Display - Show during In Progress status */}
                {tournamentStatus === 'In Progress' && timer.getCurrentBlindLevel() && (
                  <div className="blind-timer-display">
                    <div className="blind-timer-header">
                      <span className="blind-timer-level">
                        Level {timer.currentBlindLevel + 1}
                        {timer.getCurrentBlindLevel().isBreak && ' - BREAK'}
                        {timer.timerPaused && ' - PAUSED'}
                      </span>
                      <div className="blind-timer-controls">
                        <span className="blind-timer-countdown" style={{ opacity: timer.timerPaused ? 0.6 : 1 }}>
                          {timer.formatTime(timer.timeRemaining)}
                        </span>
                        {isCreator && (
                          <button 
                            className="timer-pause-btn"
                            onClick={timer.togglePause}
                            title={timer.timerPaused ? 'Resume timer' : 'Pause timer'}
                          >
                            {timer.timerPaused ? '▶' : '⏸'}
                          </button>
                        )}
                      </div>
                    </div>
                    {!timer.getCurrentBlindLevel().isBreak && (
                      <div className="blind-timer-info">
                        <div className="blind-info-item">
                          <span className="blind-info-label">SB</span>
                          <span className="blind-info-value">{timer.getCurrentBlindLevel().smallBlind?.toLocaleString() || '-'}</span>
                        </div>
                        <div className="blind-info-item">
                          <span className="blind-info-label">BB</span>
                          <span className="blind-info-value">{timer.getCurrentBlindLevel().bigBlind?.toLocaleString() || '-'}</span>
                        </div>
                        {timer.getCurrentBlindLevel().bbAnte && (
                          <div className="blind-info-item">
                            <span className="blind-info-label">Ante</span>
                            <span className="blind-info-value">{timer.getCurrentBlindLevel().bbAnte?.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Multi-table navigation */}
        {gameConfig && gameConfig.numberOfTables && gameConfig.numberOfTables > 1 && (
          <div className="table-navigation">
            <button 
              className="table-nav-btn"
              onClick={() => setCurrentTable(prev => Math.max(1, prev - 1))}
              disabled={currentTable === 1}
              title="Previous Table"
            >
              ←
            </button>
            <span className="table-indicator">
              Table {currentTable} of {gameConfig.numberOfTables}
            </span>
            <button 
              className="table-nav-btn"
              onClick={() => setCurrentTable(prev => Math.min(gameConfig.numberOfTables, prev + 1))}
              disabled={currentTable === gameConfig.numberOfTables}
              title="Next Table"
            >
              →
            </button>
          </div>
        )}

        {/* Edit Details Modal */}
        {showEditDetails && (
          <div className="modal-overlay" onClick={() => setShowEditDetails(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <h3>Edit Game Details</h3>
              <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '0.95rem' }}>
                Update the date, time, and note for this game.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Game Date
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Game Time
                </label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Game Note (Optional)
                </label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Add a note about this game..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    resize: 'vertical',
                    fontFamily: 'Roboto, sans-serif'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setShowEditDetails(false)}
                  style={{
                    flex: '1',
                    padding: '12px',
                    fontSize: '1rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveDetails}
                  style={{
                    flex: '1',
                    padding: '12px',
                    fontSize: '1rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Blind Structure Modal */}
        {showBlindStructure && gameConfig && gameConfig.blindStructure && (
          <div className="modal-overlay" onClick={() => setShowBlindStructure(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '80vh', overflow: 'auto' }}>
              <h3>Tournament Blind Structure</h3>
              <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '0.95rem' }}>
                Complete blind schedule for this tournament
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.95rem'
                }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Level</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Small Blind</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Big Blind</th>
                      {gameConfig.blindStructure.some(level => level.bbAnte) && (
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>BB Ante</th>
                      )}
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameConfig.blindStructure.map((level, index) => (
                      <tr 
                        key={index}
                        style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          background: level.isBreak ? '#fef3c7' : index % 2 === 0 ? '#ffffff' : '#f9fafb'
                        }}
                      >
                        <td style={{ padding: '12px', fontWeight: '500' }}>
                          {level.isBreak ? `Break ${level.level}` : `Level ${level.level}`}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {level.isBreak ? '—' : level.smallBlind?.toLocaleString() || '—'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {level.isBreak ? '—' : level.bigBlind?.toLocaleString() || '—'}
                        </td>
                        {gameConfig.blindStructure.some(l => l.bbAnte) && (
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {level.isBreak ? '—' : level.bbAnte?.toLocaleString() || '—'}
                          </td>
                        )}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {level.duration} min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ 
                marginTop: '20px', 
                padding: '15px', 
                background: '#f0fdf4', 
                borderRadius: '8px',
                border: '1px solid #bbf7d0'
              }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#166534', fontWeight: '500' }}>
                  ⏱️ Total Tournament Time: ~{Math.ceil(gameConfig.blindStructure.reduce((sum, level) => sum + level.duration, 0) / 60)} hours
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#15803d' }}>
                  {gameConfig.blindStructure.length} levels • 
                  {gameConfig.blindStructure.filter(l => l.isBreak).length > 0 && 
                    ` ${gameConfig.blindStructure.filter(l => l.isBreak).length} break(s) •`
                  }
                  {gameConfig.blindStructure.some(l => l.bbAnte) && ' BB Antes enabled'}
                </p>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <button 
                  onClick={() => setShowBlindStructure(false)}
                  style={{
                    padding: '12px 32px',
                    fontSize: '1rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
              </div>
            )}

        {/* Buy-In Management Popup */}
        {buyInPopupPlayer && (
          <div className="modal-overlay" onClick={() => setBuyInPopupPlayer(null)}>
            <div className="modal-content buyin-popup" onClick={(e) => e.stopPropagation()}>
              <button 
                className="modal-close" 
                onClick={() => setBuyInPopupPlayer(null)}
                style={{ position: 'absolute', top: '10px', right: '10px' }}
              >
                ×
              </button>
              
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.3rem', color: '#1f2937' }}>
                {buyInPopupPlayer.playerName}
              </h3>
              
              <div className="buyin-popup-controls">
                <button 
                  className="buyin-popup-btn minus"
                  onClick={() => {
                    const newCount = Math.max(0, buyInPopupPlayer.buyInCount - 1);
                    const buyInCost = newCount * (parseFloat(gameConfig?.buyInAmount) || 0);
                    const addOnCostParsed = buyInPopupPlayer.addOnPurchased ? parseFloat(String(gameConfig?.addOnCost || 0).replace('$', '')) : 0;
                    const newTotal = buyInCost + addOnCostParsed;
                    
                    handleUpdateBuyInCount(buyInPopupPlayer.seatId, newCount, buyInPopupPlayer.addOnPurchased);
                    setBuyInPopupPlayer({
                      ...buyInPopupPlayer,
                      buyInCount: newCount,
                      owedAmount: newTotal
                    });
                  }}
                  disabled={buyInPopupPlayer.buyInCount === 0}
                >
                  −
                </button>
                
                <div className="buyin-popup-display">
                  <div className="buyin-popup-count">{buyInPopupPlayer.buyInCount}</div>
                  <div className="buyin-popup-label">
                    buy-in{buyInPopupPlayer.buyInCount !== 1 ? 's' : ''}
          </div>
        </div>
                
                <button 
                  className="buyin-popup-btn plus"
                  onClick={() => {
                    const newCount = buyInPopupPlayer.buyInCount + 1;
                    const buyInCost = newCount * (parseFloat(gameConfig?.buyInAmount) || 0);
                    const addOnCostParsed = buyInPopupPlayer.addOnPurchased ? parseFloat(String(gameConfig?.addOnCost || 0).replace('$', '')) : 0;
                    const newTotal = buyInCost + addOnCostParsed;
                    
                    handleUpdateBuyInCount(buyInPopupPlayer.seatId, newCount, buyInPopupPlayer.addOnPurchased);
                    setBuyInPopupPlayer({
                      ...buyInPopupPlayer,
                      buyInCount: newCount,
                      owedAmount: newTotal
                    });
                  }}
                >
                  +
                </button>
              </div>
              
              {/* Add-On Checkbox (only show if add-ons are enabled) */}
              {gameConfig?.enableAddOn && (
                <div className="buyin-addon-container">
                  <label className="buyin-addon-label">
                    <input
                      type="checkbox"
                      checked={buyInPopupPlayer.addOnPurchased}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const buyInCost = buyInPopupPlayer.buyInCount * (parseFloat(gameConfig?.buyInAmount) || 0);
                        const addOnCostParsed = isChecked ? parseFloat(String(gameConfig?.addOnCost || 0).replace('$', '')) : 0;
                        const newTotal = buyInCost + addOnCostParsed;
                        
                        handleUpdateBuyInCount(buyInPopupPlayer.seatId, buyInPopupPlayer.buyInCount, isChecked);
                        setBuyInPopupPlayer({
                          ...buyInPopupPlayer,
                          addOnPurchased: isChecked,
                          owedAmount: newTotal
                        });
                      }}
                      className="buyin-addon-checkbox"
                    />
                    <span className="buyin-addon-text">
                      Add-On ({gameConfig?.addOnCost} for {gameConfig?.addOnChips?.toLocaleString()} chips)
                    </span>
                  </label>
                </div>
              )}
              
              <div className="buyin-popup-total">
                Total: ${buyInPopupPlayer.owedAmount.toFixed(2)}
              </div>
              
              <div className="buyin-popup-actions">
                <button 
                  className="buyin-popup-remove"
                  onClick={() => {
                    handleRemoveReservation(buyInPopupPlayer.seatId);
                    setBuyInPopupPlayer(null);
                  }}
                >
                  🗑️ Remove Player
                </button>
                
                <button 
                  className="buyin-popup-done"
                  onClick={() => setBuyInPopupPlayer(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payout Structure Modal */}
        {showPayoutStructure && (
          <div className="modal-overlay" onClick={() => setShowPayoutStructure(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <button 
                className="modal-close" 
                onClick={() => setShowPayoutStructure(false)}
                style={{ position: 'absolute', top: '10px', right: '10px' }}
              >
                ×
              </button>
              
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', color: '#1f2937' }}>
                💰 Prize Pool Payouts
              </h3>
              
              <div style={{ 
                padding: '15px', 
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', 
                borderRadius: '10px',
                border: '2px solid #86efac',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#065f46', fontWeight: '600', marginBottom: '5px' }}>
                  Total Prize Pool
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#059669' }}>
                  ${calculatePrizePool().toFixed(2)}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#374151' }}>
                  Payout Structure
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {calculatePayouts().map((payout) => (
                    <div 
                      key={payout.position}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '15px',
                        background: payout.position <= 3 
                          ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' 
                          : '#f9fafb',
                        borderRadius: '8px',
                        border: payout.position <= 3 
                          ? '2px solid #fbbf24' 
                          : '1px solid #e5e7eb',
                        boxShadow: payout.position === 1 
                          ? '0 4px 12px rgba(251, 191, 36, 0.3)' 
                          : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.5rem' }}>
                          {payout.position === 1 ? '🥇' : payout.position === 2 ? '🥈' : payout.position === 3 ? '🥉' : `${payout.position}th`}
                        </span>
                        <div>
                          <div style={{ fontWeight: '600', color: '#111827', fontSize: '1rem' }}>
                            {payout.position === 1 ? '1st Place' : payout.position === 2 ? '2nd Place' : payout.position === 3 ? '3rd Place' : `${payout.position}th Place`}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            {payout.percentage}%
                          </div>
                        </div>
                      </div>
                      <div style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: '900', 
                        color: payout.position === 1 ? '#059669' : '#374151',
                        fontFamily: 'Courier New, monospace'
                      }}>
                        ${payout.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <button 
                  onClick={() => setShowPayoutStructure(false)}
                  style={{
                    padding: '12px 32px',
                    fontSize: '1rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tournament Results Entry Modal */}
        {showResultsModal && (
          <div className="modal-overlay" onClick={handleCancelResults}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <button 
                className="modal-close" 
                onClick={handleCancelResults}
                style={{ position: 'absolute', top: '10px', right: '10px' }}
              >
                ×
              </button>
              
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', color: '#1f2937' }}>
                🏆 Enter Tournament Results
              </h3>
              
              <div style={{ 
                padding: '15px', 
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', 
                borderRadius: '10px',
                border: '2px solid #86efac',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '4px' }}>Total Prize Pool</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: '#059669' }}>
                  ${calculatePrizePool().toFixed(2)}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#374151' }}>
                  Enter Player Names for Each Position
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tournamentResults.map((result, index) => (
                    <div 
                      key={result.position}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        padding: '15px',
                        background: result.position <= 3 
                          ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' 
                          : '#f9fafb',
                        borderRadius: '8px',
                        border: result.position <= 3 
                          ? '2px solid #fbbf24' 
                          : '1px solid #e5e7eb',
                        boxShadow: result.position === 1 
                          ? '0 4px 12px rgba(251, 191, 36, 0.3)' 
                          : 'none'
                      }}
                    >
                      <div style={{ 
                        minWidth: '60px', 
                        textAlign: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }}>
                        {result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : result.position === 3 ? '🥉' : `${result.position}th`}
                      </div>
                      <select
                        value={result.playerName || ''}
                        onChange={(e) => {
                          const updated = [...tournamentResults];
                          updated[index].playerName = e.target.value;
                          setTournamentResults(updated);
                        }}
                        style={{
                          flex: 1,
                          padding: '10px 15px',
                          fontSize: '1rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                          background: 'white',
                          cursor: 'pointer'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      >
                        <option value="">Select player...</option>
                        {getTournamentPlayers().map(playerName => (
                          <option key={playerName} value={playerName}>
                            {playerName}
                          </option>
                        ))}
                      </select>
                      <div style={{ 
                        minWidth: '100px', 
                        textAlign: 'right',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: '#059669'
                      }}>
                        ${result.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={handleCancelResults}
                  style={{
                    padding: '12px 24px',
                    fontSize: '1rem',
                    background: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveResults}
                  style={{
                    padding: '12px 24px',
                    fontSize: '1rem',
                    background: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Save Results & Finish Tournament
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tournament Results Display (when finished) */}
        {tournamentStatus === 'Finished' && tournamentResults.length > 0 && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            maxWidth: '400px',
            zIndex: 1000
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3rem', color: '#1f2937' }}>
              🏆 Tournament Results
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tournamentResults.map((result) => (
                <div 
                  key={result.position}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 15px',
                    background: result.position <= 3 
                      ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' 
                      : '#f9fafb',
                    borderRadius: '6px',
                    border: result.position <= 3 
                      ? '2px solid #fbbf24' 
                      : '1px solid #e5e7eb'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>
                      {result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : result.position === 3 ? '🥉' : `${result.position}th`}
                    </span>
                    <span style={{ fontWeight: '500' }}>{result.playerName}</span>
                  </div>
                  <span style={{ fontWeight: '600', color: '#059669' }}>
                    ${result.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PokerTable;

