# MAKTAB INFO - Automated School News Telegram Bot

An intelligent Telegram bot that automatically collects, filters, and publishes education news to your Telegram channel.

## 🌟 Features

- **Automated News Collection**: Gathers education news from trusted sources
- **Smart Filtering**: Removes duplicates and irrelevant content
- **Uzbek Language Posts**: Creates beautiful, readable posts in Uzbek
- **Source Verification**: Only publishes from allowlisted trusted sources
- **Duplicate Detection**: Prevents publishing the same news multiple times
- **Relevance Scoring**: Prioritizes important educational content
- **Admin Dashboard**: Full control via Telegram bot interface
- **Safety Checks**: Content safety validation before publishing
- **Analytics**: Track published posts and channel performance
- **Configurable**: Easy configuration via environment variables

## 📋 Prerequisites

- **Node.js**: Version 18 or higher
- **Telegram Bot**: Created via [@BotFather](https://t.me/botfather)
- **Telegram Channel**: Where news will be published
- **Windows 10/11**: For local development

## 🚀 Quick Start (Windows)

### Step 1: Install Node.js

1. Download Node.js LTS from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the setup wizard
3. Verify installation:
```cmd
node --version
npm --version
```

### Step 2: Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow instructions to create your bot
4. **Save the bot token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 3: Setup Telegram Channel

1. Create a new Telegram channel (or use existing)
2. Add your bot as administrator:
   - Go to Channel → Administrators → Add Administrator
   - Search for your bot username
   - Grant "Post Messages" permission
3. Get your channel ID:
   - **For public channels**: Use `@channelname` (e.g., `@maktab_info`)
   - **For private channels**: Use numeric ID (e.g., `-1001234567890`)
     - Forward a message from the channel to [@userinfobot](https://t.me/userinfobot) to get the ID

### Step 4: Get Your Admin ID

1. Open Telegram and search for [@userinfobot](https://t.me/userinfobot)
2. Send any message
3. **Save your user ID** (e.g., `123456789`)

### Step 5: Install Project

1. Open PowerShell or Command Prompt
2. Navigate to project folder:
```cmd
cd "d:\Saytlarim\MAKTAB INFO"
```

3. Install dependencies:
```cmd
npm install
```

### Step 6: Configure Environment

1. Copy `.env.example` to `.env`:
```cmd
copy .env.example .env
```

2. Edit `.env` file with your favorite text editor:
```env
# Telegram Configuration (REQUIRED)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHANNEL_ID=@your_channel or -1001234567890
ADMIN_IDS=your_telegram_user_id

# School Information (OPTIONAL)
SCHOOL_NAME=
SCHOOL_CITY=
SCHOOL_REGION=

# Publishing Configuration
PUBLISHING_ENABLED=false
MAX_POSTS_PER_DAY=5
```

**Important**: Keep `PUBLISHING_ENABLED=false` initially for testing!

### Step 7: Run Tests

```cmd
npm test
```

All tests should pass. If any test fails, check your configuration.

### Step 8: Start Bot (Test Mode)

```cmd
npm start
```

You should see:
```
✅ Configuration validated
✅ Database initialized
✅ Sources initialized
✅ Bot started
✅ Channel access verified
=== MAKTAB INFO Bot Running ===
```

### Step 9: Test Bot Commands

1. Open Telegram and find your bot
2. Send `/start` command
3. You should see the admin menu
4. Click "🧪 Kanal testi" to verify channel access

If channel test fails:
- Verify bot is added as channel administrator
- Check channel ID is correct
- Ensure bot has "Post Messages" permission

### Step 10: Enable Publishing

Once everything is working:

1. Stop the bot (Ctrl+C)
2. Edit `.env` and set:
```env
PUBLISHING_ENABLED=true
```
3. Restart the bot:
```cmd
npm start
```

Bot will now automatically collect and publish news!

## 🎮 Bot Commands

### User Commands

- `/start` - Show admin menu
- `/admin` - Open admin panel
- `/stats` - View statistics
- `/status` - Check system status
- `/pause` - Pause publishing
- `/resume` - Resume publishing
- `/help` - Show help

### Admin Menu Buttons

- **📊 Statistika** - View detailed statistics
- **🌐 Manbalar** - Manage news sources
- **⚙️ Sozlamalar** - Configure settings
- **📚 So'nggi maqolalar** - View recent articles
- **🔎 Ko'rib chiqish** - Review queue
- **🧪 Kanal testi** - Test channel access
- **⏸ Nashrni to'xtatish** - Emergency pause
- **▶️ Nashrni davom ettirish** - Resume publishing
- **❤️ Tizim holati** - System health

## ⚙️ Configuration

### Essential Settings

```env
# Telegram (Required)
TELEGRAM_BOT_TOKEN=        # From @BotFather
TELEGRAM_CHANNEL_ID=       # Channel ID or @username
ADMIN_IDS=                 # Comma-separated user IDs

# Publishing Control
PUBLISHING_ENABLED=false   # Enable/disable auto-publishing
MAX_POSTS_PER_DAY=5       # Daily post limit
MAX_POSTS_PER_RUN=2       # Posts per collection
COLLECTION_INTERVAL_MINUTES=60  # How often to collect

# Content Filtering
MAX_ARTICLE_AGE_HOURS=72  # Only publish recent news
SIMILARITY_THRESHOLD=0.88  # Duplicate detection sensitivity (0-1)
```

### Advanced Settings

```env
# School Context (Optional)
SCHOOL_NAME=              # Your school name
SCHOOL_CITY=              # Your city
SCHOOL_REGION=            # Your region

# System
DATABASE_PATH=./data/maktab-info.db
LOG_LEVEL=info
TIMEZONE=Asia/Tashkent

# AI Integration (Optional)
OPENROUTER_API_KEY=
AI_SUMMARIZATION_ENABLED=false
```

## 📰 News Sources

### Default Sources

The bot includes these trusted Uzbek education sources:

1. **Xalq ta'limi vazirligi** (uzedu.uz) - Official education ministry
2. **Davlat test markazi** (dtm.uz) - State testing center

### Managing Sources

**Via Admin Menu:**
1. Send `/admin` to bot
2. Click "🌐 Manbalar"
3. Toggle sources on/off

**Via Database:**
Sources can be added programmatically by modifying `src/collectors/sourceRegistry.js`

### Adding Custom Sources

To add a new RSS source, edit `src/collectors/sourceRegistry.js`:

```javascript
{
  name: 'Source Name',
  domain: 'example.uz',
  url: 'https://example.uz/rss',
  type: 'rss',
  enabled: true,
  language: 'uz',
  category: 'official',
  trust_level: 'trusted',
  collection_interval_minutes: 60,
}
```

**Important**: Only add sources you verify and trust!

## 🔒 Security Features

- **Source Allowlisting**: Only collects from configured trusted sources
- **SSRF Protection**: Blocks requests to localhost and private IPs
- **Content Safety**: Detects and rejects suspicious content
- **Admin Authorization**: All commands verify admin status
- **Secret Redaction**: Logs never contain tokens or API keys
- **Safe URL Handling**: Validates and normalizes all URLs

## 📊 How It Works

```
1. Collection (Every 60 minutes)
   ↓
2. Validation (URL, content, date checks)
   ↓
3. Duplicate Detection (URL + similarity)
   ↓
4. Relevance Filtering (Education keywords)
   ↓
5. Safety Check (Suspicious content)
   ↓
6. Post Formatting (Uzbek language)
   ↓
7. Publishing (With rate limits)
```

## 🧪 Testing

Run all tests:
```cmd
npm test
```

Run in dry-run mode (no actual publishing):
```cmd
npm run dry-run
```

Individual test categories:
- Configuration validation
- URL safety and normalization
- Duplicate detection
- Relevance filtering
- Content safety
- Post formatting

## 🚨 Troubleshooting

### Bot won't start

**Error**: `Missing required environment variable`
- Check `.env` file has all required fields
- Verify no typos in variable names

**Error**: `Invalid bot token`
- Get fresh token from @BotFather
- Ensure no extra spaces in `.env`

### Channel access fails

**Error**: `Chat not found`
- Verify channel ID is correct
- For private channels, ID must start with `-100`

**Error**: `Bot is not administrator`
- Add bot to channel as admin
- Grant "Post Messages" permission

**Error**: `Not enough rights to post`
- Check bot's admin permissions in channel
- Ensure "Post Messages" is enabled

### No articles collected

**Possible causes:**
- All sources are disabled (check with `/admin` → Sources)
- Articles are too old (MAX_ARTICLE_AGE_HOURS)
- Network connectivity issues
- RSS feed temporarily unavailable

**Solutions:**
1. Check `/stats` for collection errors
2. Verify sources are enabled
3. Check source URLs manually in browser
4. Review logs for error messages

### Duplicates still published

- Increase SIMILARITY_THRESHOLD (max 1.0)
- Check database for fingerprints
- Verify URL normalization is working

### Posts look wrong

- Check Markdown escaping in postFormatter.js
- Verify Uzbek text encoding
- Test with `/admin` → Recent articles

## 📦 Database

The bot uses SQLite for data storage:

**Location**: `./data/maktab-info.db`

**Tables:**
- `sources` - News source configurations
- `articles` - Collected articles
- `article_fingerprints` - Duplicate detection
- `published_posts` - Publishing history
- `collection_runs` - Collection statistics
- `application_settings` - App configuration
- `admin_actions` - Admin activity log
- `error_events` - Error tracking

**Backup:**
```cmd
copy data\maktab-info.db data\backup\maktab-info-backup.db
```

## 🌐 Deployment

### Option 1: Local Windows Server

Keep bot running on your PC:

```cmd
npm start
```

**Pros:**
- Free
- Full control
- No hosting costs

**Cons:**
- Must keep PC running
- No automatic restart on error

### Option 2: Free Cloud Hosting

The bot can be deployed to free cloud platforms. See `render.yaml` for configuration template.

**Note**: Free tier limitations:
- Services may sleep after inactivity
- Limited monthly runtime hours
- Persistent storage may require paid tier

Recommended free hosting options:
- Render.com (Free tier with limitations)
- Railway.app (Limited free credits)
- Fly.io (Free tier available)

For production use, consider a paid tier or VPS with persistent storage.

## 🔄 Updates

To update the bot:

```cmd
git pull
npm install
npm test
npm start
```

## 📝 Best Practices

1. **Start with publishing disabled** - Test everything first
2. **Use conservative limits** - Don't spam your channel
3. **Monitor regularly** - Check `/stats` daily
4. **Verify sources** - Only add trusted news sources
5. **Backup database** - Especially before updates
6. **Review posts** - Manually check quality initially
7. **Emergency pause** - Use if something goes wrong

## 🤝 Contributing

This is a complete, working project ready for use. Improvements welcome!

## 📄 License

MIT License - See LICENSE file

## 🆘 Support

For issues or questions:
1. Check this README
2. Review logs for error messages
3. Test with `/admin` menu
4. Verify configuration in `.env`

## ⚠️ Important Notes

- **Publishing is disabled by default** - Enable only after testing
- **Bot requires constant internet** - For collecting and publishing
- **Admin access only** - Bot only responds to configured ADMIN_IDS
- **Source verification** - Never publishes from unknown sources
- **Content moderation** - Safety checks before publishing
- **Rate limits** - Respects daily and interval limits

## 🎯 Project Status

✅ **Complete and Working**

- [x] Configuration and validation
- [x] Database setup and management
- [x] News collection from RSS feeds
- [x] Source validation and allowlisting
- [x] Duplicate detection (URL + similarity)
- [x] Relevance filtering
- [x] Content safety checks
- [x] Uzbek post formatting
- [x] Telegram publishing
- [x] Admin bot interface
- [x] Statistics and analytics
- [x] Automated scheduling
- [x] Error handling and logging
- [x] Comprehensive tests
- [x] Windows setup instructions
- [x] Deployment configuration

**Limitations:**
- Web scraping is minimal (RSS feeds recommended)
- AI summarization optional (requires API key)
- Channel metrics limited by Telegram API
- Free hosting has sleep/runtime limits

---

**Made with ❤️ for education**
