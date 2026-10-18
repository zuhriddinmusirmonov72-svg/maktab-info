# Deployment Guide

## Deployment Options

### Option 1: Local Windows Server (Recommended for Beginners)

**Best for**: Testing, personal use, full control

**Advantages**:
- ✅ Completely free
- ✅ Full control over the bot
- ✅ Easy to debug and monitor
- ✅ No hosting limitations
- ✅ Persistent database

**Requirements**:
- Windows 10/11 PC that stays online
- Node.js installed
- Stable internet connection

**Setup**:
See README.md "Quick Start" section for detailed instructions.

**Running 24/7**:
1. Keep your PC running
2. Configure Windows to not sleep
3. Use Task Scheduler to auto-start on boot:
   - Open Task Scheduler
   - Create Basic Task
   - Trigger: At startup
   - Action: Start a program
   - Program: `node`
   - Arguments: `d:\Saytlarim\MAKTAB INFO\src\index.js`
   - Start in: `d:\Saytlarim\MAKTAB INFO`

---

### Option 2: Cloud Hosting (Free Tier)

**⚠️ Important Limitations**:
- Free tiers have significant restrictions
- May not support 24/7 background workers
- Database persistence often requires paid tier
- Service may sleep after inactivity

#### Render.com

**Free Tier Limitations**:
- ⏰ Services sleep after 15 minutes of inactivity
- 📊 750 hours/month runtime limit
- 💾 No persistent disk on free tier (database resets!)
- 🔄 Wakes on HTTP request only

**Configuration**:
1. See `render.yaml` for configuration
2. ⚠️ **Free tier is NOT suitable for automated scheduling**
3. Database will reset when service sleeps
4. Consider paid tier ($7/month) for persistent storage

**Setup Steps**:
1. Create account on render.com
2. New → Web Service
3. Connect Git repository
4. Use `render.yaml` configuration
5. Add environment variables in dashboard
6. Deploy

---

#### Railway.app

**Free Tier**:
- 💵 $5 free credits (one-time)
- ⏰ No sleep, but limited runtime
- 💾 Persistent storage available
- 🔄 Good for background workers

**Better suited for this bot than Render free tier**

**Setup**:
1. Create account on railway.app
2. New Project → Deploy from GitHub
3. Add environment variables
4. Railway will auto-detect Node.js
5. Deploy

---

#### Fly.io

**Free Tier**:
- 🆓 Limited free tier available
- ⏰ Good for background workers
- 💾 Persistent volumes available
- 📊 3 shared-cpu VMs free

**Setup**:
```cmd
# Install Fly CLI
npm install -g flyctl

# Login
flyctl auth login

# Launch app
flyctl launch

# Set secrets
flyctl secrets set TELEGRAM_BOT_TOKEN=your_token
flyctl secrets set TELEGRAM_CHANNEL_ID=your_channel
flyctl secrets set ADMIN_IDS=your_id

# Deploy
flyctl deploy
```

---

### Option 3: VPS (Virtual Private Server)

**Best for**: Production use, 24/7 operation, full control

**Providers**:
- DigitalOcean ($4-6/month)
- Linode ($5/month)
- Vultr ($2.50-5/month)
- Hetzner (€4/month)

**Setup on Ubuntu VPS**:

```bash
# 1. Connect via SSH
ssh root@your_server_ip

# 2. Update system
apt update && apt upgrade -y

# 3. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# 4. Create app user
useradd -m -s /bin/bash maktabbot
su - maktabbot

# 5. Clone/upload project
git clone your_repo_url maktab-info
cd maktab-info

# 6. Install dependencies
npm install

# 7. Configure environment
cp .env.example .env
nano .env  # Edit configuration

# 8. Test
npm test
npm start

# 9. Install PM2 (process manager)
npm install -g pm2

# 10. Start with PM2
pm2 start src/index.js --name maktab-info

# 11. Auto-start on reboot
pm2 startup
pm2 save

# 12. Monitor
pm2 status
pm2 logs maktab-info
```

**PM2 Commands**:
```bash
pm2 start maktab-info      # Start
pm2 stop maktab-info       # Stop
pm2 restart maktab-info    # Restart
pm2 logs maktab-info       # View logs
pm2 monit                  # Monitor
```

---

## Comparison Table

| Option | Cost | Reliability | Database | Difficulty | Best For |
|--------|------|-------------|----------|------------|----------|
| Local Windows | Free | Good* | Persistent | Easy | Testing, personal use |
| Render Free | Free | Poor** | Resets | Easy | Not recommended |
| Railway | $5 credits | Good | Persistent | Easy | Short-term testing |
| Fly.io Free | Free | Good | Persistent | Medium | Small scale |
| VPS | $4-6/mo | Excellent | Persistent | Medium | Production |

\* Requires PC to stay on  
\*\* Service sleeps, not suitable for scheduled tasks

---

## Database Considerations

### SQLite (Default)

**Pros**:
- Simple, no setup required
- Perfect for local development
- Good for low-to-medium traffic

**Cons**:
- Single file (backup important)
- Not ideal for free cloud hosting
- May reset on some platforms

**Backup Strategy**:
```cmd
# Windows
copy data\maktab-info.db backups\maktab-info-%date:~-4,4%%date:~-10,2%%date:~-7,2%.db

# Linux
cp data/maktab-info.db backups/maktab-info-$(date +%Y%m%d).db
```

### PostgreSQL (Production)

For production deployments, consider PostgreSQL:

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

Code changes needed in `src/database.js` to support PostgreSQL.

---

## Monitoring

### Local Monitoring

```cmd
# View logs
npm start

# Check status
# Bot shows status in console
```

### Production Monitoring

**Health Checks**:
1. Bot sends admin notifications on errors
2. Use `/status` command daily
3. Check `/stats` for collection failures
4. Monitor database size

**Logging**:
```javascript
// Set in .env
LOG_LEVEL=debug  # For detailed logs
LOG_LEVEL=info   # For production
LOG_LEVEL=error  # Minimal logging
```

**Alerts**:
- Configure bot to send alerts to admin
- Use external monitoring (UptimeRobot, Pingdom)
- Set up log aggregation (Papertrail, Loggly)

---

## Security Checklist

- [ ] Strong bot token from @BotFather
- [ ] Correct ADMIN_IDS configured
- [ ] `.env` file not committed to Git
- [ ] Database backed up regularly
- [ ] VPS firewall configured (if applicable)
- [ ] Only HTTPS URLs in sources
- [ ] Source allowlist properly configured
- [ ] Logs don't contain secrets

---

## Troubleshooting Deployment

### Service won't start

**Check**:
1. Environment variables set correctly
2. Node.js version (18+)
3. Dependencies installed (`npm install`)
4. Port not in use
5. Database directory writable

### Database issues

**SQLite locked**:
- Close other connections
- Restart service
- Check file permissions

**Data lost on restart**:
- Free tier without persistent storage
- Upgrade to paid tier
- Use external database

### Scheduler not working

**Cloud hosting**:
- Service may be sleeping
- Need HTTP endpoint to wake service
- Consider VPS for reliable scheduling

**Local**:
- Check logs for errors
- Verify collection interval
- Ensure bot is running

---

## Backup Strategy

### Automatic Backups

Create backup script `backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p backups
cp data/maktab-info.db backups/maktab-info-$DATE.db
# Keep only last 7 days
find backups/ -name "*.db" -mtime +7 -delete
```

Run daily with cron:
```bash
crontab -e
# Add line:
0 2 * * * /path/to/backup.sh
```

### Manual Backups

Before updates:
```cmd
npm run backup  # If script added to package.json
# Or manually:
copy data\maktab-info.db backups\before-update.db
```

---

## Scaling Considerations

For high-volume channels:

1. **Multiple Workers**: Run parallel collection
2. **External Database**: PostgreSQL or MongoDB
3. **Queue System**: Redis for job queue
4. **Caching**: Cache duplicate checks
5. **Load Balancing**: Multiple bot instances

These require code modifications beyond initial implementation.

---

## Recommended Setup

**For Beginners**:
→ Start with **Local Windows Server**

**For Testing**:
→ **Railway** or **Fly.io** free tier

**For Production**:
→ **VPS** with PM2 and PostgreSQL

**For Enterprise**:
→ Cloud infrastructure with load balancing

---

## Support

Deployment issues? Check:
1. README.md for basic setup
2. Logs for error messages
3. This deployment guide
4. Platform-specific documentation

---

*Last updated: 2024-01-15*
