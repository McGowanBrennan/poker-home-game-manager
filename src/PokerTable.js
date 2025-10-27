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
  const [gameCreator, setGameCreator] = useState('');
  const [gameDateTime, setGameDateTime] = useState(null);
  const [gameNote, setGameNote] = useState(null);

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
        navigate('/dashboard', { state: { userEmail } });
        return;
      }
      
      if (gameResponse.ok) {
        const gameData = await gameResponse.json();
        setGameName(gameData.name);
        setGameCreator(gameData.createdBy);
        setGameDateTime(gameData.gameDateTime);
        setGameNote(gameData.note);
      }

      // Fetch reservations for this game
      const reservationsResponse = await fetch(`/api/games/${gameId}/reservations`);
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
    if (location.state?.userEmail) {
      setUserEmail(location.state.userEmail);
    }

    fetchGameData();
    
    // Poll for updates every 2 seconds
    const interval = setInterval(fetchGameData, 2000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

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
          playerName: trimmedName
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
    navigate('/dashboard', { state: { userEmail } });
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
      const response = await fetch(`/api/games/${gameId}/reservations/${seatId}`, {
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

  // Check if current user is the game creator
  const isCreator = userEmail && gameCreator && userEmail === gameCreator;

  return (
    <div className="App">
      <div className="poker-room">
        <div className="game-header">
          <button onClick={handleBackToDashboard} className="back-to-dashboard-btn">
            ← Back to Dashboard
          </button>
          <h2 className="game-title">{gameName || 'Poker Game'}</h2>
          <button onClick={handleCopyGameLink} className="game-code-btn" title="Click to copy invite link">
            Game Code: {gameId}
          </button>
        </div>

        <div className="poker-table-container">
          <div className="poker-table">
            {players.map((player) => {
              const isReserved = reservedSeats[player.id];
              
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
                        alt={reservedSeats[player.id]}
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
                    {isReserved ? reservedSeats[player.id] : 'Reserve Seat'}
                  </button>
                </div>
              );
            })}
            
            {(gameDateTime || gameNote) && (
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PokerTable;

