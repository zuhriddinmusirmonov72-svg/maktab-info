# MAKTAB INFO - Quick Start Guide

Get your education news bot running in 10 minutes!

## 🚀 Super Quick Setup (For Experienced Users)

```cmd
cd "d:\Saytlarim\MAKTAB INFO"
npm install
copy .env.example .env
notepad .env
```

Edit `.env` and set:
- `TELEGRAM_BOT_TOKEN` - From @BotFather
- `TELEGRAM_CHANNEL_ID` - Your channel ID  
- `ADMIN_IDS` - Your Telegram user ID

```cmd
npm start
```

Done! Bot is running.

## 📋 For Beginners (Step by Step)

### 1. Create Bot (2 minutes)
1. Open Telegram
2. Message `@BotFather`
3. Send `/newbot`
4. Follow instructions
5. **Copy the token**

### 2. Setup Channel (2 minutes)
1. Create or use existing channel
2. Add bot as administrator
3. Enable "Post Messages" permission
4. Get channel ID (use `@userinfobot` if private)

### 3. Get Your ID (1 minute)
1. Message `@userinfobot` in Telegram
2. **Copy your ID**

### 4. Install (2 minutes)
Open PowerShell:
```cmd
cd "d:\Saytlarim\MAKTAB INFO"
npm install
```

### 5. Configure (2 minutes)
```cmd
copy .env.example .env
notepad .env
```

Add your details:
```env
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHANNEL_ID=@your_channel
ADMIN_IDS=your_id_here
```

Save and close.

### 6. Start (1 minute)
```cmd
npm start
```

Look for:
```
✅ Configuration validated
✅ Database initialized
✅ Bot started
✅ Channel access verified
```

### 7. Test
1. Open bot in Telegram
2. Send `/start`
3. Click "🧪 Kanal testi"

Should see ✅ success!

## ⚡ What Happens Next?

### Immediately:
- Bot starts listening for commands
- Database is created
- Sources are initialized
- First collection starts in 10 seconds

### After 10 Seconds:
- Bot collects news from enabled sources
- Articles are validated and filtered
- **No publishing yet** (disabled by default)

### Check Collection:
In Telegram bot, click:
- "📊 Statistika" - See what was collected
- "📚 So'nggi maqolalar" - View articles

### Enable Publishing (When Ready):
1. Stop bot (Ctrl+C)
2. Edit `.env`:
```env
PUBLISHING_ENABLED=true
```
3. Save and restart:
```cmd
npm start
```

Bot will now publish automatically!

## 🎮 Commands

Send these in Telegram:

- `/start` - Show admin menu
- `/stats` - View statistics
- `/pause` - Stop publishing
- `/resume` - Resume publishing
- `/help` - Show help

## 🔧 Common Issues

### "Missing required environment variable"
→ Check `.env` file has all required fields

### "Chat not found"
→ Wrong channel ID. Verify it.

### "Bot is not administrator"
→ Add bot to channel as admin

### No articles collected
→ Wait 60 minutes or restart bot

## 📁 Files You Need to Know

- `.env` - Your configuration (DON'T share this!)
- `data/maktab-info.db` - Your database
- `README.md` - Full documentation
- `FIRST_RUN_CHECKLIST.md` - Detailed setup guide

## 🆘 Need Help?

1. Read `FIRST_RUN_CHECKLIST.md` for detailed instructions
2. Read `README.md` for complete documentation
3. Check bot logs for error messages
4. Verify configuration in `.env`

## ✅ Success Checklist

- [ ] Bot token obtained from @BotFather
- [ ] Channel created and bot added as admin
- [ ] Admin ID obtained from @userinfobot
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] Bot starts without errors
- [ ] Channel test passes
- [ ] Admin menu works in Telegram

**You're ready! 🎉**

## 📊 Default Settings

- Publishing: **DISABLED** (test first!)
- Collection: Every **60 minutes**
- Max posts per day: **5**
- Post interval: **120 minutes**
- Article max age: **72 hours**
- Sources: **2 enabled** (official Uzbekistan education)

## 🎯 Next Steps

1. ✅ Complete quick start
2. 🕐 Wait for first collection
3. 📊 Check statistics
4. ✅ Enable publishing when ready
5. 📱 Monitor your channel

---

**Time to first post: ~10 minutes setup + 60 minutes first collection**

Good luck! 🚀📰
