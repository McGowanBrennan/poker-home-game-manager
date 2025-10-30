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

  const handleMarkPaid = async (seatId, paid) => {
    try {
      const response = await fetch(`/api/games/${gameId}/reservations/${seatId}/paid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
          tableNumber: currentTable,
          paid: paid
        })
      });

      if (response.ok) {
        // Update local state
        setReservedSeats(prev => ({
          ...prev,
          [seatId]: {
            ...prev[seatId],
            paidBuyin: paid
          }
        }));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update buy-in status');
      }
    } catch (error) {
      console.error('Error marking player as paid:', error);
      alert('Failed to update buy-in status. Please try again.');
    }
  };

  // Check if current user is the game creator
  const isCreator = userEmail && gameCreator && userEmail === gameCreator;

  // Calculate prize pool (number of players who have paid * buy-in amount)
  const calculatePrizePool = () => {
    if (!gameConfig || gameConfig.gameType !== 'tournament' || !gameConfig.buyInAmount) {
      return 0;
    }
    
    const buyIn = parseFloat(gameConfig.buyInAmount) || 0;
    const paidCount = Object.values(reservedSeats).filter(r => r.paidBuyin).length;
    
    return buyIn * paidCount;
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
              const isPaid = reservation?.paidBuyin || false;
              
              const handleButtonClick = () => {
                if (isReserved && isCreator) {
                  handleRemoveReservation(player.id);
                } else if (!isReserved) {
                  handleReserveSeat(player.id);
                }
              };
              
              return (
                <div key={player.id} className={`player-seat ${player.position}`}>
                  <div className={`player-avatar ${isReserved ? 'reserved' : ''}`}>
                    {isReserved && (
                      <img 
                        src="/player-avatar.png" 
                        alt={playerName}
                        className="avatar-image"
                      />
                    )}
                  </div>
                  <button 
                    className={`reserve-seat-btn ${isReserved ? 'reserved' : ''} ${isReserved && isCreator ? 'removable' : ''}`}
                    onClick={handleButtonClick}
                    disabled={isReserved && !isCreator}
                    title={isReserved && isCreator ? 'Click to remove player' : ''}
                  >
                    {isReserved ? playerName : 'Reserve Seat'}
                  </button>
                  
                  {/* Buy-in checkbox - only show for game creator during registration */}
                  {isReserved && isCreator && gameConfig && gameConfig.gameType === 'tournament' && tournamentStatus === 'Registering' && (
                    <div className="buyin-checkbox-container">
                      <label className="buyin-checkbox-label">
                        <input 
                          type="checkbox"
                          checked={isPaid}
                          onChange={(e) => handleMarkPaid(player.id, e.target.checked)}
                          className="buyin-checkbox"
                        />
                        <span className="buyin-checkbox-text">Paid</span>
                      </label>
                    </div>
                  )}
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
                  <div className="prize-pool-display">
                    <span className="prize-pool-label">Prize Pool:</span>
                    <span className="prize-pool-amount">${calculatePrizePool()}</span>
                  </div>
                )}
              </div>
            )}

            {(gameDateTime || gameNote || isCreator) && (
              <div className="table-center-info">
                {gameDateTime && (
                  <p className="table-date-time">
                    📅 {formatGameDateTime(gameDateTime)}
                  </p>
                )}
                {gameNote && (
                  <p className="table-game-note">
                    {gameNote}
                  </p>
                )}
                {isCreator && (
                  <button 
                    className="edit-details-btn"
                    onClick={handleOpenEditDetails}
                    title="Edit game date, time, and note"
                  >
                    ✏️ Edit Details
                  </button>
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
      </div>
    </div>
  );
}

export default PokerTable;

