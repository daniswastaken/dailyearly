# DailyEarly - WhatsApp Year Progress Status Bot

Automated WhatsApp Status bot that posts your year's progress percentage daily.

## 📁 Project Structure

```
dailyearly/
├── img_base.png      # Base image template (720x1278)
├── consolasb.ttf     # Consolas Bold font
├── generate.py       # Python image generator
├── upload.js         # Node.js WhatsApp uploader (whatsapp-web.js)
├── run_daily.sh      # Daily automation script (with Cron fix)
├── post_now.sh       # Debug: post immediately
├── package.json      # Node dependencies
└── auth_info/        # WhatsApp session (created on first run)
```

## 🚀 Setup

### 1. Dependency Install
Run these commands to install the required system libraries for the headless browser and project dependencies:

```bash
# Update and install system dependencies
sudo apt-get update && sudo apt-get install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2

# Install additional rendering libraries
sudo apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libglib2.0-0 libx11-6 libx11-xcb1 libxcb1 libxext6 libxi6 libxtst6 fonts-liberation

# Install project dependencies
npm install
pip install pillow
```

### 2. First-Time WhatsApp Login
```bash
# Run the uploader to scan QR code
node upload.js
```
Scan the QR code with WhatsApp (Settings > Linked Devices > Link a Device).  
Session will be saved in `auth_info/` folder.

## 🛠️ Usage

### Debug: Post Status Now
```bash
./run_daily.sh --now
# or
npm run daily:now
```

### Manual Components
- **Generate Image Only**: `python3 generate.py`
- **Upload Only**: `node upload.js --now`

## ⏰ Automation (Cron)

Add this line to your crontab (`crontab -e`):

```cron
0 1 * * * /home/(user)/dailyearly/run_daily.sh >> /home/(user)/dailyearly/cron.log 2>&1
```

### ⚠️ Important: Node.js Path (NVM Users)
Cron has a limited `PATH`. If you use NVM, you **must** ensure the absolute path to `node` is available in `run_daily.sh`.

Update your `run_daily.sh` with your specific version:
```bash
export PATH=$PATH:/home/(user)/.nvm/versions/node/v24.13.0/bin
```

## 📋 How It Works

1. **generate.py**: Calculates year progress and renders a progress bar onto the base image.
2. **upload.js**: Uses `whatsapp-web.js` to simulate a browser session and post the image to `status@broadcast`.
3. **run_daily.sh**: Adds a random 1-60 minute delay (to avoid bot detection) and then executes both scripts.

## 🔧 Troubleshooting

- **Visibility Issues**: If friends can't see the status, ensure your Privacy settings for "Status" are set to "My Contacts" and that you both have each other's numbers saved.
- **Node not found**: Ensure the path in `run_daily.sh` matches your `which node` output.
- **Session Reset**: If it stops working, delete the `auth_info/` folder and run `node upload.js` manually to re-scan.