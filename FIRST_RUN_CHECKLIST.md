# MAKTAB INFO - First Run Checklist

Follow this step-by-step guide to get your bot running for the first time.

## ✅ Prerequisites Check

- [ ] Windows 10 or 11
- [ ] Node.js 18+ installed
- [ ] Text editor (Notepad, VS Code, etc.)
- [ ] Telegram account

## 📝 Step 1: Create Telegram Bot

1. Open Telegram
2. Search for `@BotFather`
3. Send `/newbot`
4. Choose a name: `Maktab Info Bot` (or your school name)
5. Choose a username: `your_school_info_bot` (must end with `bot`)
6. **SAVE THE TOKEN** (looks like: `123456789:ABCdef...`)

## 📢 Step 2: Setup Channel

### Option A: New Channel
1. Create new channel in Telegram
2. Make it public or private
3. Add your bot as administrator
4. Give "Post Messages" permission

### Option B: Existing Channel
1. Go to your channel
2. Channel Info → Administrators → Add Administrator
3. Add your bot
4. Enable "Post Messages"

### Get Channel ID:
- **Public channel**: Use `@channelname` (e.g., `@maktab_yangiliklari`)
- **Private channel**: Forward a message to `@userinfobot` to get ID

## 👤 Step 3: Get Your Admin ID

1. Search `@userinfobot` in Telegram
2. Send any message
3. **SAVE YOUR ID** (e.g., `123456789`)

## 💻 Step 4: Install Project

Open PowerShell or Command Prompt:

```cmd
cd "d:\Saytlarim\MAKTAB INFO"
npm install
```

Wait for installation to complete.

## ⚙️ Step 5: Configure Environment

1. Copy `.env.example` to `.env`:
```cmd
copy .env.example .env
```

2. Open `.env` in Notepad or any text editor

3. Fill in these REQUIRED fields:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHANNEL_ID=@your_channel_or_-1001234567890
ADMIN_IDS=your_telegram_user_id
```

4. OPTIONAL: Add school information:
```env
SCHOOL_NAME=Your School Name
SCHOOL_CITY=Your City
SCHOOL_REGION=Your Region
```

5. Save and close `.env`

## 🧪 Step 6: Run Tests

```cmd
npm test
```

Expected result: Most tests should pass (some may have minor issues, that's okay for now).

## 🚀 Step 7: Start Bot (Test Mode)

```cmd
npm start
```

You should see:
```
✅ Configuration validated
✅ Database initialized
✅ Sources initialized
✅ Bot started
✅ Channel access verified: Your Channel Name
=== MAKTAB INFO Bot Running ===
```

**If you see errors:**
- Check your bot token is correct
- Verify channel ID
- Ensure bot is channel administrator
- Confirm "Post Messages" permission is enabled

## 💬 Step 8: Test Bot Commands

1. Open Telegram
2. Find your bot
3. Send `/start`

You should see admin menu with buttons.

4. Click "🧪 Kanal testi"

Expected result: ✅ Success message

**If test fails:**
- Bot not added to channel
- Wrong channel ID
- Missing permissions

## 📰 Step 9: Check News Sources

1. Click "🌐 Manbalar" in admin menu
2. You'll see default sources:
   - ✅ Xalq ta'limi vazirligi
   - ✅ Davlat test markazi

These are enabled by default and collect education news from official Uzbekistan sources.

## 📊 Step 10: View Statistics

Click "📊 Statistika" to see:
- Total articles collected
- Articles published
- Sources performance

Initially, all values will be zero.

## ⏱️ Step 11: Wait for First Collection

The bot will:
- Collect news every 60 minutes
- First collection starts 10 seconds after bot starts
- Check logs for collection status

You should see in console:
```
[INFO] Starting article collection...
[INFO] Checking 2 enabled sources...
[INFO] Collecting from: Xalq ta'limi vazirligi
```

## ⚠️ Step 12: Important - Publishing is DISABLED

**By default, the bot will NOT publish automatically!**

This is intentional so you can:
1. See what articles are collected
2. Verify sources are working
3. Check article quality
4. Test formatting

Check collected articles:
- Send `/admin` to bot
- Click "📚 So'nggi maqolalar"

## ✅ Step 13: Enable Publishing (When Ready)

**Only do this after testing!**

1. Stop the bot (Ctrl+C in terminal)
2. Open `.env` file
3. Change:
```env
PUBLISHING_ENABLED=false
```
To:
```env
PUBLISHING_ENABLED=true
```
4. Save `.env`
5. Restart bot:
```cmd
npm start
```

Now bot will automatically publish approved articles!

## 🎛️ Step 14: Configure Publishing Settings

Edit `.env` to adjust:

```env
# How many posts per day maximum
MAX_POSTS_PER_DAY=5

# How many posts per collection run
MAX_POSTS_PER_RUN=2

# Minimum time between posts (minutes)
MIN_POST_INTERVAL_MINUTES=120

# Collection frequency (minutes)
COLLECTION_INTERVAL_MINUTES=60

# Only publish recent news (hours)
MAX_ARTICLE_AGE_HOURS=72
```

Restart bot after changes.

## 🛑 Emergency Controls

### Pause Publishing Immediately:
- Send `/pause` command to bot
- Or click "⏸ Nashrni to'xtatish" in menu

Bot will stop publishing but continue collecting.

### Resume Publishing:
- Send `/resume` command
- Or click "▶️ Nashrni davom ettirish"

## 📱 Daily Monitoring

Check these daily:

1. `/stats` - View statistics
2. "📚 So'nggi maqolalar" - See collected articles
3. "❤️ Tizim holati" - System health
4. Your channel - Verify posts look good

## 🐛 Common Issues & Solutions

### "Chat not found" error:
→ Channel ID is wrong. Double-check it.

### "Bot is not administrator":
→ Add bot to channel as admin with "Post Messages" permission.

### No articles collected:
→ Wait 60 minutes for first collection. Or restart bot to trigger immediate collection.

### Duplicate articles published:
→ Increase `SIMILARITY_THRESHOLD` in `.env` (max 1.0).

### Posts look strange:
→ Check Telegram for proper Markdown rendering.

### Bot stopped working:
→ Check logs for errors. Restart with `npm start`.

## 🎓 Understanding the Bot

### How it works:
1. **Collection** (every 60 min): Downloads news from enabled sources
2. **Validation**: Checks URL, content, date, source trustworthiness
3. **Duplicate Detection**: Compares with existing articles
4. **Relevance Filtering**: Scores based on education keywords and location
5. **Content Safety**: Checks for spam, suspicious content
6. **Post Formatting**: Creates beautiful Uzbek-language posts
7. **Publishing**: Posts to channel (if enabled and within limits)

### Default Limits:
- Maximum 5 posts per day
- Minimum 2 hours between posts
- Only recent news (last 72 hours)
- Only from approved sources

### Article Statuses:
- **NEW**: Just collected
- **VALIDATED**: Passed all checks
- **READY_TO_PUBLISH**: Waiting to be published
- **PUBLISHED**: Successfully posted to channel
- **REJECTED**: Failed validation
- **NEEDS_REVIEW**: Failed publishing, needs manual check

## 📖 Next Steps

1. ✅ Complete this checklist
2. 📊 Monitor for 24 hours with publishing disabled
3. ✅ Enable publishing when satisfied
4. 📱 Check channel daily
5. ⚙️ Adjust settings as needed
6. 🌐 Consider adding more sources (carefully!)

## 🆘 Get Help

If stuck:
1. Read `README.md` for detailed docs
2. Check logs for specific errors
3. Review configuration in `.env`
4. Test channel access with "🧪 Kanal testi"

## 🎉 Success Criteria

You're ready when:
- ✅ Bot starts without errors
- ✅ Channel test passes
- ✅ Articles are being collected
- ✅ Admin menu works
- ✅ Statistics show data
- ✅ Test posts look good

**Congratulations! Your education news bot is running! 🎓📰**

---

Remember: Start with publishing DISABLED, test everything, then enable when confident.
