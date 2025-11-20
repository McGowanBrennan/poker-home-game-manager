import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './App.css';

function PokerTable() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [reservedSeats, setReservedSeats] = useState({});
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
  const [buyInPopupPlayer, setBuyInPopupPlayer] = useState(null); // {seatId, playerName, buyInCount, owedAmount, isCashGame}
  const [cashBuyInAmount, setCashBuyInAmount] = useState(''); // Manual buy-in amount for cash games
  const [showPayoutStructure, setShowPayoutStructure] = useState(false);

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
  const fetchGameData = async () => {
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
        setGameName(gameData.name);
        setGameCreator(gameData.createdBy);
        setGameDateTime(gameData.gameDateTime);
        setGameNote(gameData.note);
        setGameConfig(gameData.config);
        
        // Set tournament status if available
        if (gameData.config && gameData.config.tournamentStatus) {
          setTournamentStatus(gameData.config.tournamentStatus);
        }
      }

      // Fetch reservations for this game and current table
      const reservationsResponse = await fetch(`/api/games/${gameId}/reservations?tableNumber=${currentTable}`);
      if (reservationsResponse.ok) {
        const reservationsData = await reservationsResponse.json();
        setReservedSeats(reservationsData);
      }
    } catch (error) {
      console.error('Error fetching game data:', error);
    }
  };

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
    
    // Poll for updates every 2 seconds
    const interval = setInterval(fetchGameData, 2000);
    
    return () => clearInterval(interval);
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
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove reservation');
      }
    } catch (error) {
      console.error('Error removing reservation:', error);
      alert('Failed to remove reservation. Please try again.');
    }
  };

  const handleUpdateBuyInCount = async (seatId, newCount, addOnPurchased = false, customAmount = null) => {
    try {
      // For cash games, use custom amount if provided, otherwise calculate from count
      const buyInAmount = customAmount !== null ? customAmount : (gameConfig?.buyInAmount || 0);
      const finalAmount = customAmount !== null ? customAmount : (newCount * parseFloat(buyInAmount));
      
      const response = await fetch(`/api/games/${gameId}/reservations/${seatId}/buyins`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
          tableNumber: currentTable,
          buyInCount: newCount,
          buyInAmount: buyInAmount,
          customBuyInAmount: customAmount, // For cash games
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
        // Refresh game data to update totals
        fetchGameData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update buy-in count');
      }
    } catch (error) {
      console.error('Error updating buy-in count:', error);
      alert('Failed to update buy-in count. Please try again.');
    }
  };

  // Check if current user is the game creator
  const isCreator = userEmail && gameCreator && userEmail === gameCreator;

  // Calculate prize pool (sum of all buy-ins across all players)
  // For tournaments: prize pool
  // For cash games: total buy-ins on table
  const calculatePrizePool = () => {
    if (!gameConfig) {
      return 0;
    }
    
    // Sum up all owed amounts (which represents total buy-ins)
    const total = Object.values(reservedSeats).reduce((sum, reservation) => {
      return sum + (parseFloat(reservation.owedAmount) || 0);
    }, 0);
    
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
    const statuses = ['Registering', 'In Progress', 'Finished'];
    const currentIndex = statuses.indexOf(tournamentStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    const newStatus = statuses[nextIndex];

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
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update tournament status');
      }
    } catch (error) {
      console.error('Error updating tournament status:', error);
      alert('Failed to update tournament status. Please try again.');
    }
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
              // For cash games, we don't calculate buy-in count (it's just the amount)
              // For tournaments, calculate count based on fixed buy-in amount
              const buyInCount = gameConfig?.gameType === 'cash' ? (owedAmount > 0 ? 1 : 0) : (buyInAmount > 0 ? Math.round(owedAmount / buyInAmount) : 0);
              const hasTotal = owedAmount > 0;
              
              const handleButtonClick = () => {
                if (isReserved && isCreator) {
                  // Open buy-in popup for tournaments during registration or cash games
                  if ((gameConfig?.gameType === 'tournament' && tournamentStatus === 'Registering') || 
                      gameConfig?.gameType === 'cash') {
                    setBuyInPopupPlayer({
                      seatId: player.id,
                      playerName,
                      buyInCount,
                      owedAmount,
                      addOnPurchased: reservation?.addOnPurchased || false,
                      isCashGame: gameConfig?.gameType === 'cash'
                    });
                    // Initialize cash buy-in amount input with existing amount
                    if (gameConfig?.gameType === 'cash') {
                      setCashBuyInAmount(owedAmount > 0 ? owedAmount.toFixed(2) : '');
                    }
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
                            <div className="hover-amount-value">${owedAmount.toFixed(2)}</div>
                            <div className="hover-amount-label">
                              {gameConfig?.gameType === 'cash' 
                                ? 'buy-in' 
                                : `${buyInCount} buy-in${buyInCount !== 1 ? 's' : ''}`}
                            </div>
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
                  className={`tournament-status-btn ${isCreator ? 'clickable' : ''}`}
                  onClick={isCreator ? handleUpdateTournamentStatus : undefined}
                  disabled={!isCreator}
                  title={isCreator ? 'Click to change status' : ''}
                >
                  {tournamentStatus}
                </button>
                
                {/* Prize Pool Display - Show during Registering status */}
                {tournamentStatus === 'Registering' && gameConfig.buyInAmount && (
                  <div 
                    className="prize-pool-display clickable"
                    onClick={() => gameConfig?.payoutStructure && setShowPayoutStructure(true)}
                    style={{ cursor: gameConfig?.payoutStructure ? 'pointer' : 'default' }}
                    title={gameConfig?.payoutStructure ? 'Click to view payout structure' : ''}
                  >
                    <span className="prize-pool-label">Prize Pool:</span>
                    <span className="prize-pool-amount">${calculatePrizePool().toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Cash Game Total Buy-Ins Display */}
            {gameConfig && gameConfig.gameType === 'cash' && (
              <div className="tournament-status-container">
                <div className="prize-pool-display" style={{ cursor: 'default' }}>
                  <span className="prize-pool-label">Total Buy-Ins:</span>
                  <span className="prize-pool-amount">${calculatePrizePool().toFixed(2)}</span>
                </div>
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
              
              {/* Cash Game: Manual Buy-In Amount Entry */}
              {buyInPopupPlayer.isCashGame ? (
                <div style={{ marginBottom: '30px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>
                    Buy-In Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter amount"
                    value={cashBuyInAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCashBuyInAmount(value);
                      // Update owed amount in real-time
                      const amount = parseFloat(value) || 0;
                      setBuyInPopupPlayer({
                        ...buyInPopupPlayer,
                        owedAmount: amount
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '15px',
                      fontSize: '1.5rem',
                      textAlign: 'center',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontWeight: '600'
                    }}
                    autoFocus
                  />
                  <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#6b7280', textAlign: 'center' }}>
                    Enter the amount this player is buying in for
                  </p>
                </div>
              ) : (
                /* Tournament: Buy-In Count Controls */
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
              )}
              
              {/* Add-On Checkbox (only show for tournaments with add-ons enabled) */}
              {!buyInPopupPlayer.isCashGame && gameConfig?.enableAddOn && (
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
                  onClick={() => {
                    // For cash games, save the custom amount
                    if (buyInPopupPlayer.isCashGame && cashBuyInAmount) {
                      const amount = parseFloat(cashBuyInAmount) || 0;
                      handleUpdateBuyInCount(buyInPopupPlayer.seatId, 1, false, amount);
                    }
                    setBuyInPopupPlayer(null);
                    setCashBuyInAmount('');
                  }}
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
      </div>
    </div>
  );
}

export default PokerTable;

