import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for managing tournament blind timer
 * Handles timer state, persistence, synchronization, and countdown logic
 * 
 * @param {Object} options
 * @param {string} options.gameId - Game ID
 * @param {Object} options.gameConfig - Game configuration including blindStructure
 * @param {string} options.tournamentStatus - Current tournament status
 * @param {boolean} options.isCreator - Whether current user is game creator
 * @param {string} options.userEmail - Current user's email
 * @param {Function} options.onGameDataUpdate - Callback to trigger game data refresh
 */
export const useTournamentTimer = ({
  gameId,
  gameConfig,
  tournamentStatus,
  isCreator,
  userEmail,
  onGameDataUpdate
}) => {
  // Timer state
  const [currentBlindLevel, setCurrentBlindLevel] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);

  // Refs for managing timer lifecycle
  const countdownIntervalRef = useRef(null);
  const lastSaveTimeRef = useRef(null);
  const hasLoadedTimerOnceRef = useRef(false);
  const timerActiveRef = useRef(false);
  const currentTimeRef = useRef(null);
  const currentLevelRef = useRef(0);

  /**
   * Save timer state to database (only creator can write)
   */
  const saveTimerState = useCallback(async (level, seconds, running, paused) => {
    if (!userEmail || !isCreator) return;

    try {
      await fetch(`/api/games/${gameId}/timer-state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          currentBlindLevel: level,
          timeRemainingSeconds: seconds,
          timerRunning: running,
          timerPaused: paused
        })
      });
      lastSaveTimeRef.current = Date.now();
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  }, [gameId, userEmail, isCreator]);

  /**
   * Debounced save function - prevents excessive DB writes
   */
  const saveTimerStateDebounced = useCallback((level, seconds, running, paused) => {
    const now = Date.now();
    // Save immediately if:
    // - Level changed (critical event)
    // - Pause state changed (user action)
    // - More than 3 seconds since last save
    if (
      lastSaveTimeRef.current === null ||
      now - lastSaveTimeRef.current > 3000 ||
      paused !== timerPaused ||
      level !== currentBlindLevel
    ) {
      saveTimerState(level, seconds, running, paused);
    }
  }, [saveTimerState, timerPaused, currentBlindLevel]);

  /**
   * Load timer state from database response
   * Handles background time calculation and level advancement
   */
  const loadTimerStateFromData = useCallback((gameData) => {
    // Use gameData.config directly (not gameConfig prop) since this is called before state updates
    const config = gameData?.config || gameConfig;
    if (!gameData || !config?.blindStructure) return;

    // Determine if we should load timer state
    // Creators: Only load ONCE (they are source of truth)
    // Viewers: Always sync (they read from DB)
    const shouldLoad = !isCreator || !hasLoadedTimerOnceRef.current;
    
    if (!shouldLoad) {
      return;
    }

    // Mark as loading immediately to prevent initialization effect from running
    // This must be set synchronously before any async state updates
    // Check if we have meaningful timer state from the database
    const hasTimerState = 
      (gameData.timeRemainingSeconds !== null && gameData.timeRemainingSeconds !== undefined) ||
      (gameData.timerRunning === false) || // Explicitly stopped
      (gameData.currentBlindLevel !== undefined && gameData.currentBlindLevel !== null && gameData.currentBlindLevel > 0) || // Level was set
      (gameData.timerLastUpdate !== null && gameData.timerLastUpdate !== undefined); // Timer was updated at some point
    
    if (hasTimerState) {
      hasLoadedTimerOnceRef.current = true;
    }

    // Update blind level
    if (gameData.currentBlindLevel !== undefined) {
      setCurrentBlindLevel(gameData.currentBlindLevel);
      currentLevelRef.current = gameData.currentBlindLevel;
    }

    // Calculate elapsed time if timer was running in background
    let adjustedTimeRemaining = gameData.timeRemainingSeconds;

    if (
      gameData.timerRunning &&
      !gameData.timerPaused &&
      gameData.timerLastUpdate &&
      gameData.timeRemainingSeconds !== null
    ) {
      const lastUpdate = new Date(gameData.timerLastUpdate);
      const now = new Date();
      const elapsedSeconds = Math.floor((now - lastUpdate) / 1000);

      // Subtract elapsed time
      adjustedTimeRemaining = gameData.timeRemainingSeconds - elapsedSeconds;

      // Check if we need to advance levels
      const blindStructure = config.blindStructure;
      let currentLevel = gameData.currentBlindLevel;
      let timeLeft = adjustedTimeRemaining;

      if (blindStructure && blindStructure.length > 0) {
        while (timeLeft <= 0 && currentLevel < blindStructure.length - 1) {
          currentLevel++;
          const nextLevelData = blindStructure[currentLevel];
          if (!nextLevelData.isBreak) {
            timeLeft += nextLevelData.duration * 60;
          } else {
            timeLeft += nextLevelData.duration * 60; // Breaks still have duration
          }
        }

        // Update level if it changed
        if (currentLevel !== gameData.currentBlindLevel) {
          setCurrentBlindLevel(currentLevel);
          currentLevelRef.current = currentLevel;
          saveTimerState(currentLevel, Math.max(0, timeLeft), true, false);
        }
      }

      adjustedTimeRemaining = Math.max(0, timeLeft);
    }

    // Initialize timer if tournament is In Progress but no timer state exists
    const statusNow = config?.tournamentStatus || gameData.config?.tournamentStatus;
    if (
      (gameData.timeRemainingSeconds === null || gameData.timeRemainingSeconds === undefined) &&
      statusNow === 'In Progress'
    ) {
      if (config.blindStructure && config.blindStructure.length > 0) {
        const first = config.blindStructure[0];
        const initSeconds = (parseInt(first.duration, 10) || 0) * 60;
        setCurrentBlindLevel(0);
        currentLevelRef.current = 0;
        setTimeRemaining(initSeconds);
        currentTimeRef.current = initSeconds;
        setTimerRunning(true);
        setTimerPaused(false);
        // Only creator can persist initial state
        if (isCreator) {
          saveTimerState(0, initSeconds, true, false);
        }
        hasLoadedTimerOnceRef.current = true;
      }
    } else if (adjustedTimeRemaining !== null && adjustedTimeRemaining !== undefined) {
      setTimeRemaining(adjustedTimeRemaining);
      currentTimeRef.current = adjustedTimeRemaining;
      hasLoadedTimerOnceRef.current = true;
    }

    // Adopt server running/paused flags only when server has concrete time value
    if (gameData.timeRemainingSeconds !== null && gameData.timeRemainingSeconds !== undefined) {
      if (gameData.timerRunning !== undefined) {
        setTimerRunning(gameData.timerRunning);
      }
      if (gameData.timerPaused !== undefined) {
        setTimerPaused(gameData.timerPaused);
      }
      // Mark as loaded if we have timer data (even if paused)
      if (!hasLoadedTimerOnceRef.current) {
        hasLoadedTimerOnceRef.current = true;
      }
    } else if (gameData.timeRemainingSeconds === null && gameData.timerRunning === false) {
      // Timer was explicitly stopped - mark as loaded to prevent re-initialization
      if (!hasLoadedTimerOnceRef.current) {
        hasLoadedTimerOnceRef.current = true;
      }
    }
  }, [gameConfig, isCreator, saveTimerState]);

  /**
   * Get polling interval based on tournament status
   */
  const getPollInterval = useCallback((status) => {
    if (status === 'In Progress') return 2000; // 2 seconds for timer sync
    if (status === 'Registering') return 43200000; // 12 hours - safety net
    if (status === 'Finished') return 30000; // 30 seconds
    return 43200000; // Default 12 hours
  }, []);

  /**
   * Advance to next blind level
   */
  const advanceToNextLevel = useCallback(() => {
    const nextLevel = currentBlindLevel + 1;
    if (gameConfig?.blindStructure && nextLevel < gameConfig.blindStructure.length) {
      const nextLevelData = gameConfig.blindStructure[nextLevel];
      const durationInSeconds = nextLevelData.duration * 60;

      setCurrentBlindLevel(nextLevel);
      currentLevelRef.current = nextLevel;
      currentTimeRef.current = durationInSeconds;

      if (isCreator) {
        saveTimerState(nextLevel, durationInSeconds, true, false);
      }

      return durationInSeconds;
    } else {
      // No more levels, stop timer
      timerActiveRef.current = false;
      setTimerRunning(false);
      if (isCreator) {
        saveTimerState(currentBlindLevel, 0, false, false);
      }
      return 0;
    }
  }, [currentBlindLevel, gameConfig, isCreator, saveTimerState]);

  /**
   * Initialize timer when status changes to "In Progress"
   * Only runs if no timer data exists (fresh start, not a refresh)
   */
  useEffect(() => {
    if (tournamentStatus === 'In Progress' && gameConfig?.blindStructure && gameConfig.blindStructure.length > 0) {
      // Only initialize if:
      // 1. Timer is not already running
      // 2. We haven't loaded timer data from DB yet (hasLoadedTimerOnceRef)
      // 3. No time remaining is set (meaning no data was loaded from DB)
      // This prevents resetting on page refresh when DB has existing timer state
      if (!timerRunning && !hasLoadedTimerOnceRef.current && timeRemaining === null) {
        const firstLevel = gameConfig.blindStructure[0];
        const durationInSeconds = firstLevel.duration * 60;
        setTimeRemaining(durationInSeconds);
        setCurrentBlindLevel(0);
        setTimerRunning(true);
        setTimerPaused(false);
        currentTimeRef.current = durationInSeconds;
        currentLevelRef.current = 0;
        if (isCreator) {
          saveTimerState(0, durationInSeconds, true, false);
        }
      }
    } else if (tournamentStatus !== 'In Progress') {
      setTimerRunning(false);
    }
  }, [tournamentStatus, gameConfig, timerRunning, timeRemaining, isCreator, saveTimerState]);

  /**
   * Countdown timer logic
   */
  useEffect(() => {
    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Don't run if timer is not running, paused, or no time remaining
    if (!timerRunning || timerPaused || timeRemaining === null) {
      timerActiveRef.current = false;
      return;
    }

    // Creator controls the timer, viewers just display (will sync via polling)
    if (isCreator) {
      timerActiveRef.current = true;
    } else {
      timerActiveRef.current = false;
    }

    let tickCount = 0;
    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null) return null;
        
        const newTime = prev - 1;
        tickCount++;
        
        // Update ref for accurate unmount save
        currentTimeRef.current = newTime;
        
        // Save periodically (every 10 seconds for creator)
        if (isCreator && tickCount % 10 === 0) {
          saveTimerStateDebounced(currentBlindLevel, newTime, true, false);
        }
        
        if (newTime <= 0) {
          // Time's up - advance level
          const nextTime = advanceToNextLevel();
          return nextTime;
        }
        
        return newTime;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      // Save state on unmount (creator only)
      if (isCreator && currentTimeRef.current !== null) {
        saveTimerState(currentLevelRef.current, currentTimeRef.current, timerRunning, timerPaused);
      }
      timerActiveRef.current = false;
    };
  }, [timerRunning, timerPaused, timeRemaining, currentBlindLevel, gameConfig, isCreator, advanceToNextLevel, saveTimerStateDebounced, saveTimerState]);

  /**
   * Reset timer state when gameId changes
   */
  useEffect(() => {
    hasLoadedTimerOnceRef.current = false;
    timerActiveRef.current = false;
    setCurrentBlindLevel(0);
    setTimeRemaining(null);
    setTimerRunning(false);
    setTimerPaused(false);
  }, [gameId]);

  /**
   * Toggle pause/play (creator only)
   */
  const togglePause = useCallback(() => {
    if (!isCreator) return;
    
    const newPausedState = !timerPaused;
    setTimerPaused(newPausedState);
    
    // Save paused state to database so viewers can see it
    if (timeRemaining !== null) {
      saveTimerState(currentBlindLevel, timeRemaining, timerRunning, newPausedState);
    }
  }, [isCreator, timerPaused, timeRemaining, currentBlindLevel, timerRunning, saveTimerState]);

  /**
   * Format time as MM:SS
   */
  const formatTime = useCallback((seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Get current blind level data
   */
  const getCurrentBlindLevel = useCallback(() => {
    if (!gameConfig?.blindStructure || currentBlindLevel >= gameConfig.blindStructure.length) {
      return null;
    }
    return gameConfig.blindStructure[currentBlindLevel];
  }, [gameConfig, currentBlindLevel]);

  // Return timer state and controls
  return {
    // State
    currentBlindLevel,
    timeRemaining,
    timerRunning,
    timerPaused,
    
    // Functions
    formatTime,
    getCurrentBlindLevel,
    togglePause,
    loadTimerStateFromData,
    getPollInterval
  };
};

