# Timer Refactoring Proposal

## Current Issues

### 1. **Complex Conditional Logic (Lines 107-240)**
- 130+ lines of nested conditions checking `userEmail`, `gameCreator`, `isCreator`, `hasLoadedTimerOnce`, `timerActiveRef`
- Hard to maintain and debug
- Multiple code paths that can lead to the same outcome

### 2. **Multiple Overlapping useEffects**
- Timer initialization (lines 446-473)
- Timer countdown (lines 476-569)
- Polling setup (lines 354-420)
- Polling interval update (lines 317-351)
- Risk of race conditions and duplicate work

### 3. **Excessive Ref Usage**
- `timerActiveRef` - tracks if timer is counting locally
- `currentTimeRef` - current time for unmount save
- `currentLevelRef` - current level for unmount save
- `hasLoadedTimerOnce` - prevents creator reloads
- `tournamentStatusRef` - tracks status for polling
- `pollingIntervalRef` - manages polling interval
- Hard to reason about which ref is updated when

### 4. **Inefficient Background Calculation**
- Runs on every `fetchGameData` call, even when timer isn't running
- Should only calculate when: timer was running AND not paused AND has timestamp

### 5. **No Debouncing on Saves**
- Could save multiple times if state changes rapidly
- Currently saves every 10 seconds + on level change + on unmount + on pause
- Could use a debounced save function

### 6. **Polling Duplication**
- Two separate useEffects manage polling
- One for initial setup (lines 354-420)
- One for status changes (lines 317-351)
- Both modify the same `pollingIntervalRef`

## Proposed Refactor

### Architecture: Custom Hook `useTournamentTimer`

```javascript
// Custom hook encapsulates all timer logic
const useTournamentTimer = ({
  gameId,
  gameConfig,
  tournamentStatus,
  isCreator,
  gameCreator,
  userEmail
}) => {
  // State
  const [currentBlindLevel, setCurrentBlindLevel] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  
  // Refs (simplified)
  const lastSaveTimeRef = useRef(null); // For debouncing saves
  const countdownIntervalRef = useRef(null);
  const isInitializedRef = useRef(false);
  
  // Simplified loading logic
  const loadTimerState = useCallback(async () => {
    // Clear rules:
    // 1. Load once on mount
    // 2. Viewers always sync
    // 3. Creators load once, then control locally
    // ...
  }, [gameId, isCreator]);
  
  // Debounced save function
  const saveTimerStateDebounced = useCallback(
    debounce((level, seconds, running, paused) => {
      if (isCreator) {
        saveTimerState(level, seconds, running, paused);
      }
    }, 3000), // 3 second debounce
    [isCreator, gameId]
  );
  
  // Single polling effect
  useEffect(() => {
    const interval = getPollInterval(tournamentStatus);
    const pollId = setInterval(() => {
      if (shouldSync(tournamentStatus, isCreator)) {
        loadTimerState();
      }
    }, interval);
    return () => clearInterval(pollId);
  }, [tournamentStatus, isCreator]);
  
  // Single countdown effect
  useEffect(() => {
    if (timerRunning && !timerPaused && timeRemaining !== null) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            advanceLevel();
            return getNextLevelDuration();
          }
          saveTimerStateDebounced(currentBlindLevel, newTime, true, false);
          return newTime;
        });
      }, 1000);
      countdownIntervalRef.current = interval;
      return () => clearInterval(interval);
    }
  }, [timerRunning, timerPaused, timeRemaining]);
  
  return {
    currentBlindLevel,
    timeRemaining,
    timerRunning,
    timerPaused,
    togglePause: () => { /* ... */ },
    formatTime: (seconds) => { /* ... */ }
  };
};
```

### Benefits

1. **Separation of Concerns**: Timer logic isolated from table rendering
2. **Reduced Complexity**: Single source of truth for timer state
3. **Easier Testing**: Hook can be tested independently
4. **Clearer State Management**: Fewer refs, clearer state flow
5. **Better Performance**: Debounced saves, optimized calculations
6. **Maintainability**: One place to fix bugs, add features

### Migration Strategy

1. Create `hooks/useTournamentTimer.js`
2. Move timer logic from `PokerTable.js` to hook
3. Update `PokerTable.js` to use hook
4. Test thoroughly
5. Remove old code

### Risk Assessment

**Low Risk**: The hook pattern is well-established, and we're just reorganizing existing logic.

**Testing Checklist**:
- [ ] Timer counts down correctly
- [ ] Timer pauses/resumes
- [ ] Timer persists on page refresh
- [ ] Viewers sync with creator
- [ ] Level advancement works
- [ ] Timer stops at end of blind structure
- [ ] No race conditions between creator/viewer
- [ ] Polling works for different statuses

