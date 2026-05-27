# DailyEarly: WhatsApp Year Progress Status Bot

DailyEarly is an automated utility that calculates the current year's progress percentage and publishes it as a WhatsApp status.

## Project Structure

```
dailyearly-1/
├── src/              # Source code
│   ├── generate.py   # Year progress calculator & image generator
│   └── upload.js     # WhatsApp interface (baileys)
├── assets/           # Static assets
│   ├── img_base.png  # Base template (fallback)
│   ├── consolasb.ttf # Visualization font
│   ├── overlay_image.png # UI overlay
│   └── textures/     # Background texture layers
├── scripts/          # Automation and utility scripts
│   ├── run_daily.sh  # Main automation wrapper
│   └── post_now.sh   # Manual post utility
├── logs/             # Execution and cron logs
├── package.json      # Node.js dependencies
├── requirements.txt  # Python dependencies
└── final_status.jpg  # Generated status image
```

## Setup

### Requirements
- Node.js (>= 18.0.0)
- Python 3

### Dependency Installation
```bash
# Install Node.js dependencies (baileys & pino)
npm install

# Install Python dependencies (Pillow, requests)
pip install -r requirements.txt
```

### Authentication
Initialize the WhatsApp session:
```bash
node src/upload.js
```
Scan the QR code in your terminal. The session will be cached in the `.baileys_auth` directory.

## Usage

### Automated Pipeline Execution
To generate and post the status immediately:
```bash
# Using npm
npm run daily:now

# Using the shell script
bash scripts/run_daily.sh --now
```

### Component Execution
- Generate progress image: `npm run generate`
- Upload status image: `npm run post`

## Automation (Cron)
Configure the system to run the update daily by adding the following to your crontab (`crontab -e`):

```cron
0 1 * * * /path/to/dailyearly-1/scripts/run_daily.sh >> /path/to/dailyearly-1/logs/cron.log 2>&1
```

## Operational Logic
1. `src/generate.py`: Calculates year progress, fetches a random landscape background from `picsum.photos`, overlays a random texture from `assets/textures/`, and applies the UI overlay.
2. `src/upload.js`: Utilizes `@whiskeysockets/baileys` to authenticate and dispatch the generated image as a status update.
3. `scripts/run_daily.sh`: Introduces a randomized delay (1–60 minutes) to mitigate automated bot detection before executing the generation and upload sequence.

## Troubleshooting
- **Session Authentication**: If posting fails, delete the `.baileys_auth` directory and re-run `node src/upload.js` to re-authenticate.
- **Node.js Environment**: If automation fails via cron, ensure the environment `PATH` in `scripts/run_daily.sh` is correctly configured to locate the Node.js executable.
