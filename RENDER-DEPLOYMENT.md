# Deploying Poker Home Game Manager to Render

This guide will walk you through deploying your Poker Home Game Manager application to Render.

## Prerequisites

1. A [Render](https://render.com) account (free tier available)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. A Supabase PostgreSQL database (or any PostgreSQL database)
4. (Optional) Twilio account for SMS notifications

## Environment Variables

You'll need to set the following environment variables in Render:

### Required:
- `DATABASE_URL` - Your PostgreSQL connection string from Supabase
  - Format: `postgresql://user:password@host:port/database`
  - Get this from your Supabase project settings under "Database" → "Connection String"

### Optional (for SMS features):
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token  
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number (format: +1234567890)

### Auto-set by Render:
- `NODE_ENV` - Set to `production` (automatically set by Render)
- `PORT` - Dynamic port assigned by Render (automatically set)

## Deployment Methods

### Method 1: Using render.yaml (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Create a New Web Service on Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your Git repository
   - Render will detect the `render.yaml` file automatically

3. **Configure Environment Variables**
   - In the Render dashboard, go to your web service
   - Navigate to "Environment" tab
   - Add your environment variables:
     - `DATABASE_URL` (your Supabase connection string)
     - `TWILIO_ACCOUNT_SID` (if using SMS)
     - `TWILIO_AUTH_TOKEN` (if using SMS)
     - `TWILIO_PHONE_NUMBER` (if using SMS)

4. **Deploy**
   - Render will automatically build and deploy your application
   - The build process will:
     1. Install dependencies (`npm install`)
     2. Build the React frontend (`npm run build`)
     3. Start the Node.js server (`npm start`)

### Method 2: Manual Setup

1. **Create a New Web Service**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your repository

2. **Configure Build Settings**
   - **Name**: poker-home-game-manager (or your preferred name)
   - **Environment**: Node
   - **Region**: Choose your preferred region (e.g., Oregon)
   - **Branch**: main (or your default branch)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

3. **Add Environment Variables** (same as Method 1, step 3)

4. **Deploy** - Click "Create Web Service"

## Database Setup

### Using Supabase (Recommended)

1. **Create a Supabase Project**
   - Go to [Supabase](https://supabase.com)
   - Create a new project
   - Wait for the database to be provisioned

2. **Get Your Connection String**
   - Go to Project Settings → Database
   - Copy the "Connection String" (PostgreSQL format)
   - Replace `[YOUR-PASSWORD]` with your actual database password

3. **Run Database Migrations**
   - The application will automatically create tables on first run
   - Or you can run the SQL schema from your Supabase SQL editor

### Alternative: Render PostgreSQL

1. Create a new PostgreSQL database on Render
2. Copy the "Internal Database URL"
3. Use this as your `DATABASE_URL` environment variable

## Post-Deployment

### Verify Deployment

1. **Check Build Logs**
   - In your Render service dashboard, check the "Logs" tab
   - Look for successful build messages:
     ```
     ✅ Connected to Supabase PostgreSQL database
     ✅ Database connection successful
     ✅ Game cleanup scheduler started
     Server running on http://0.0.0.0:[PORT]
     ```

2. **Test Your Application**
   - Visit your Render URL (e.g., `https://poker-home-game-manager.onrender.com`)
   - Try logging in or creating an account
   - Create a test game
   - Verify database connectivity

### Custom Domain (Optional)

1. Go to your web service settings
2. Navigate to "Custom Domains"
3. Add your domain and follow the DNS configuration instructions

## Troubleshooting

### Build Fails

**Issue**: Build command fails
- Check that all dependencies are in `package.json`
- Verify Node version compatibility (app uses Node 20.10.0)
- Check build logs for specific errors

**Issue**: Database connection fails
- Verify `DATABASE_URL` is correct
- Ensure your database allows connections from Render's IP ranges
- Check Supabase or database firewall settings

### Runtime Issues

**Issue**: 503 Service Unavailable
- Check if the service is running in Render dashboard
- Review runtime logs for errors
- Verify the start command is correct (`npm start`)

**Issue**: API calls fail
- Check that API routes are defined correctly
- Verify CORS settings in `server.js`
- Check browser console for errors

**Issue**: React routes don't work (404 errors)
- This is handled by the catch-all route in `server.js`
- Ensure `NODE_ENV=production` is set
- Verify the build folder exists

### Database Connection Issues

**Issue**: Can't connect to Supabase
- Verify connection string format
- Check that password is URL-encoded if it contains special characters
- Ensure database is active and not paused

## Monitoring

### Render Dashboard
- Monitor CPU and memory usage
- Check application logs
- Review deploy history

### Database Monitoring
- Use Supabase dashboard for query performance
- Monitor connection count
- Check database size and usage

## Updating Your Application

Render automatically deploys when you push to your connected branch:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

Render will automatically:
1. Pull the latest code
2. Run the build command
3. Deploy the new version
4. Zero-downtime deployment (on paid plans)

## Scaling

### Free Tier Limitations
- Service spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- 750 hours/month free (may require credit card)

### Upgrading
- Paid plans start at $7/month
- Benefits:
  - Always-on service (no spin-down)
  - Custom domains with SSL
  - Faster builds
  - More resources

## Security Checklist

- [x] `.env` file is in `.gitignore`
- [x] Environment variables set in Render dashboard (not in code)
- [x] Database credentials are secure
- [x] HTTPS enabled by default on Render
- [ ] Enable Render's DDoS protection (paid plans)
- [ ] Set up monitoring and alerts

## Support

- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Twilio Documentation](https://www.twilio.com/docs)

## Cost Breakdown

### Free Tier (Good for testing)
- Render Web Service: Free (with limitations)
- Supabase: Free tier includes 500MB database
- Twilio: Pay-as-you-go (free trial credits available)

### Production Ready
- Render: $7/month (Starter plan)
- Supabase: Free tier sufficient for small-medium apps
- Twilio: ~$0.0075 per SMS sent

---

**Last Updated**: October 2025

