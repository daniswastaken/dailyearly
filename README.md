# DailyEarly - WhatsApp Year Progress Status Bot

Automated WhatsApp Status bot that posts your year's progress percentage daily.

## 📁 Project Structure

```
dailyearly/
├── img_base.png      # Base image template (720x1278)
├── consolasb.ttf     # Consolas Bold font
├── generate.py       # Python image generator
├── upload.js         # Node.js WhatsApp uploader
├── run_daily.sh      # Daily automation script
├── post_now.sh       # Debug: post immediately
├── package.json      # Node dependencies
└── auth_info/        # WhatsApp session (created on first run)
```

## 🚀 Setup

### 1. Install Dependencies

```bash
# Python (Pillow)
pip install Pillow

# Node.js
cd /home/daniswastaken/dailyearly
npm install
```

### 2. Make Scripts Executable

```bash
chmod +x run_daily.sh post_now.sh
```

### 3. First-Time WhatsApp Login

```bash
# Run the uploader to scan QR code
node upload.js
```

Scan the QR code with WhatsApp (Settings > Linked Devices > Link a Device).  
Session will be saved in `auth_info/` folder.

## 🛠️ Usage

### Debug: Post Status Now

```bash
./post_now.sh
# or
npm run daily:now
```

### Generate Image Only

```bash
python3 generate.py
# or
npm run generate
```

### Upload Only

```bash
node upload.js --now
# or
npm run post:now
```

## ⏰ Automation (Cron)

Add this line to your crontab (`crontab -e`):

```cron
0 1 * * * /home/daniswastaken/dailyearly/run_daily.sh >> /home/daniswastaken/dailyearly/cron.log 2>&1
```

This runs every day at 01:00 AM. The script includes a random 1-60 minute delay to avoid bot detection.

## 📋 How It Works

1. **generate.py**: Calculates year progress (e.g., `50.27%`) and renders it onto the base image with a progress bar
2. **upload.js**: Connects to WhatsApp via Baileys and posts the image to your status
3. **run_daily.sh**: Adds random delay, then runs both scripts in sequence

## ⚠️ Important Notes

- **Session Persistence**: Don't delete `auth_info/` folder or you'll need to re-scan QR
- **Bot Detection**: The random delay in `run_daily.sh` helps avoid WhatsApp flagging automated posts
- **Rate Limits**: Posting once daily should be safe; avoid posting too frequently
- **Image Size**: Base image must be 720x1278 pixels

## 🔧 Troubleshooting

**"Image not found"**
- Run `python3 generate.py` first

**"Connection closed, reconnecting..."**
- Normal if first-time setup; scan QR when prompted

**"Logged out"**
- Delete `auth_info/` folder and re-scan QR code

## 📦 Dependencies

- Python 3.x + Pillow
- Node.js 18+ 
- @whiskeysockets/baileys
- @hapi/boom
- pino
