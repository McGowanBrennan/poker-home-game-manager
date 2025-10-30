# Production Deployment Checklist ✅

Quick reference guide for deploying the production-ready application.

## Pre-Deployment

### 1. Database Migrations
- [ ] Run `database-migration-game-config.sql` on Supabase
- [ ] Run `database-migration-blind-structures.sql` on Supabase
- [ ] Verify migrations with: `SELECT column_name FROM information_schema.columns WHERE table_name='games';`

### 2. Code Verification
- [ ] All local file operations removed from `server.js`
- [ ] localStorage operations replaced with API calls in `GameManagement.js`
- [ ] No linter errors: `npm run lint` (if available)
- [ ] Test locally: `npm run dev`

### 3. Environment Variables
Verify these are set in Render:
- [ ] `DATABASE_URL` - Supabase connection string (port 5432)
- [ ] `NODE_ENV` - Set to `production`
- [ ] Other env vars as needed

## Deployment

### 1. Git Push
```bash
git status                    # Check what's changed
git add .                     # Stage all changes
git commit -m "Production-ready: Migrate to database storage"
git push origin main          # Deploy to Render (if auto-deploy enabled)
```

### 2. Monitor Deployment
- [ ] Watch Render deployment logs
- [ ] Wait for "Your service is live" message
- [ ] Check for any error messages

## Post-Deployment Testing

### Critical Features
- [ ] **User Registration** - Create new account
- [ ] **User Login** - Log in with credentials
- [ ] **Create Cash Game** - With custom settings
- [ ] **Create Tournament** - With blind structure
- [ ] **Join Game** - By game code
- [ ] **Reserve Seat** - On poker table
- [ ] **Save Blind Structure** - Custom structure
- [ ] **Load Blind Structure** - Retrieve saved structure
- [ ] **Update Tournament Status** - Change game status
- [ ] **Delete Game** - Remove game

### Data Persistence
- [ ] Create a game, restart server, verify game still exists
- [ ] Save blind structure, log out, log in, verify structure exists
- [ ] Update tournament status, refresh page, verify status persists

### Multi-User Test
- [ ] Create game on Device A
- [ ] Join game on Device B
- [ ] Reserve seats from both devices
- [ ] Verify real-time updates

## Rollback (If Needed)

```bash
git log                       # Find previous commit hash
git revert HEAD               # Revert last commit
git push origin main          # Deploy old version
```

## Common Issues & Solutions

### Issue: "column config does not exist"
**Solution:** Run `database-migration-game-config.sql`

### Issue: "table saved_blind_structures does not exist"
**Solution:** Run `database-migration-blind-structures.sql`

### Issue: "Failed to save blind structure"
**Check:**
1. Database connection working?
2. Table created successfully?
3. Check Render logs for detailed error

### Issue: Game configs not loading
**Check:**
1. `config` column added to `games` table?
2. GIN index created?
3. Check network tab for API responses

## Performance Baseline

After deployment, measure:
- [ ] Game creation time: < 500ms
- [ ] Game load time: < 300ms
- [ ] Blind structure save: < 1s
- [ ] Page load time: < 2s

## Success Criteria

Deployment is successful when:
- ✅ All critical features work
- ✅ No errors in Render logs
- ✅ Data persists across restarts
- ✅ Multiple users can interact simultaneously
- ✅ Response times are acceptable

## Next Steps After Deployment

1. **Monitor Logs** - Watch for any errors in first 24 hours
2. **User Testing** - Have beta users test all features
3. **Backup Verification** - Ensure Supabase backups are enabled
4. **Documentation** - Update README with any production-specific notes

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Deployment Status:** ⬜ Success  ⬜ Issues  ⬜ Rolled Back

