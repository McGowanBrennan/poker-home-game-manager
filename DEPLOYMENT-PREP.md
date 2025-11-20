# Deployment Preparation Checklist

## 🚀 Ready for Render Deployment

### ✅ Pre-Deployment Checklist

#### 1. **Database Migrations** (MUST RUN)
Run these SQL migrations on your Supabase database in order:

```sql
-- 1. Timer Persistence (NEW - MUST RUN!)
-- File: database-migration-timer-persistence.sql
ALTER TABLE games
ADD COLUMN IF NOT EXISTS current_blind_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_remaining_seconds INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS timer_running BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS timer_paused BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS timer_last_update TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_games_timer_state
ON games(id, timer_running, timer_paused);
```

**Status:** ⚠️ REQUIRED - Run this before deployment!

---

#### 2. **Environment Variables on Render**

Verify these are set in Render dashboard:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://[your-supabase-connection-string]
SUPABASE_REGION=us-east-1  # or your region
```

**Status:** ✅ Should already be configured

---

#### 3. **Code Cleanup**

**Console Logs:**
- ⚠️ Many debug console.logs are currently active
- 📝 Recommendation: Clean up before production OR leave for initial testing
- 🔍 Can remove later once deployment is stable

**Files to Review:**
- `src/PokerTable.js` - Has extensive debug logging
- All other files are production-ready

---

#### 4. **Build & Start Commands**

**Verify in `package.json`:**
```json
{
  "scripts": {
    "start": "node server.js",
    "build": "react-scripts build",
    "heroku-postbuild": "npm run build"
  }
}
```

**Status:** ✅ Already configured

---

#### 5. **Server Configuration**

**Port Configuration:**
```javascript
const PORT = process.env.PORT || 3000;
```

**Status:** ✅ Already configured in server.js

---

### 🗄️ Database Migration Steps

**On Supabase SQL Editor:**

1. **Open SQL Editor** in Supabase dashboard
2. **Copy and paste** `database-migration-timer-persistence.sql`
3. **Run the query**
4. **Verify** columns were added:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'games' 
   AND column_name IN ('current_blind_level', 'time_remaining_seconds', 'timer_running', 'timer_paused', 'timer_last_update');
   ```
   Should return 5 rows.

---

### 📦 Deployment Process

#### **Option 1: Deploy via Render Dashboard**
1. Go to your Render dashboard
2. Click on your service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for build to complete (~5-10 minutes)
5. Check logs for errors

#### **Option 2: Deploy via Git Push**
```bash
# Commit all changes
git add .
git commit -m "feat: Add persistent tournament timer with scalability optimizations"
git push origin main

# Render will auto-deploy
```

---

### 🧪 Post-Deployment Testing

After deployment, test these scenarios:

#### **1. Tournament Timer Persistence**
- [ ] Start a tournament
- [ ] Let timer count down for 30 seconds
- [ ] Refresh the page
- [ ] Verify timer continues from correct time

#### **2. Pause Functionality**
- [ ] Game creator can pause timer
- [ ] Timer stays paused on refresh
- [ ] Viewers see paused state within 2 seconds

#### **3. Background Timer**
- [ ] Start tournament, note time (e.g., 14:30)
- [ ] Leave table for 2 minutes
- [ ] Return to table
- [ ] Verify timer shows ~12:30 (elapsed time accounted for)

#### **4. Multi-Viewer Sync**
- [ ] Open game on 2 devices
- [ ] Pause on device 1
- [ ] Verify device 2 shows pause within 2 seconds
- [ ] Resume on device 1
- [ ] Verify device 2 resumes within 2 seconds

#### **5. Status-Based Polling**
- [ ] Open browser console
- [ ] With status = "Registering", verify logs show: `💤 Tournament status: Registering - polling without timer sync`
- [ ] Change to "In Progress", verify timer sync logs appear
- [ ] Change to "Finished", verify logs show: `💤 Tournament status: Finished - polling without timer sync`

---

### 📊 Production Metrics to Monitor

**First 24 Hours:**
- Database connection pool utilization (should be <50%)
- API response times (should be <200ms p95)
- Error rate (should be <0.1%)
- Supabase bill (should be minimal)

**Render Logs to Watch:**
```bash
# Check for errors
grep -i error

# Check database connections
grep -i "database"

# Check timer operations
grep -i "timer"
```

---

### 🔥 Troubleshooting

#### **Issue: Timer resets on refresh**
**Solution:** Database migration not run
```sql
-- Verify columns exist
SELECT * FROM information_schema.columns WHERE table_name = 'games';
```

#### **Issue: Pause button doesn't work**
**Check:**
1. User is logged in (userEmail set)
2. User is game creator
3. Browser console for errors

#### **Issue: Viewers don't see pause**
**Check:**
1. Database `timer_paused` field is updating
2. Polling is running (check network tab)
3. No JavaScript errors in viewer's console

#### **Issue: High database usage**
**Check:**
1. Polling optimization working (💤 logs for non-active tournaments)
2. Connection pooling enabled on Supabase
3. Number of concurrent users

---

### 🎯 Success Criteria

Your deployment is successful if:
- ✅ Timer persists across page refreshes
- ✅ Pause/resume works for game creator
- ✅ Viewers sync within 2 seconds
- ✅ Background timer continues when page is closed
- ✅ No console errors
- ✅ Database costs remain low (<$10/month for testing)

---

### 📝 Known Debug Logs (Optional Cleanup)

These console.logs are active in production:

**src/PokerTable.js:**
- `📥 Full game data received:` (Line ~67)
- `🔍 Timer load check:` (Line ~95)
- `⏰ Timer state check:` (Line ~126)
- `🕐 Background timer calculation:` (Line ~139)
- `⏸️ Pause button clicked:` (Line ~613)
- `⏱️ Timer effect running:` (Line ~305)
- `💤 Tournament status:` (Line ~264)

**Recommendation:**
- **Option 1:** Leave them for initial deployment (helpful for debugging)
- **Option 2:** Remove before deploying (cleaner production logs)
- **Option 3:** Use environment variable to toggle:
  ```javascript
  const DEBUG = process.env.NODE_ENV !== 'production';
  if (DEBUG) console.log(...);
  ```

---

### 🚀 Ready to Deploy?

**Final Steps:**
1. ✅ Run database migration on Supabase
2. ✅ Commit all code changes
3. ✅ Push to main branch
4. ✅ Wait for Render to build and deploy
5. ✅ Test all features
6. ✅ Monitor logs and metrics

**Let's deploy! 🎉**

