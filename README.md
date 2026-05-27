# DailyEarly: WhatsApp Year Progress Status Bot

DailyEarly is an automated utility that calculates the current year's progress percentage and publishes it as a WhatsApp status.

## Project Structure

```
dailyearly-1/
├── src/              # Source code
│   ├── generate.py   # Year progress calculator & image generator
│   └── upload.js     # WhatsApp interface (whatsapp-web.js)
├── assets/           # Static assets
│   ├── img_base.png  # Base template (720x1278)
│   ├── consolasb.ttf # Visualization font
│   └── overlay_image.png # UI overlay
├── scripts/          # Automation and utility scripts
│   ├── run_daily.sh  # Main automation wrapper
│   └── post_now.sh   # Manual post utility
├── logs/             # Execution and cron logs
├── package.json      # Node.js dependencies
└── final_status.jpg  # Generated status image
```

## Setup

### Requirements
- Node.js (>= 18.0.0)
- Python 3
- Pillow (Python image library)

### Dependency Installation
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install pillow
```

### Authentication
Initialize the WhatsApp session:
```bash
node src/upload.js
```
Scan the QR code in your terminal via WhatsApp (Linked Devices). The session will be cached in the root `.wwebjs_auth` directory.

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
1. `src/generate.py`: Calculates year progress and renders the results onto the template image.
2. `src/upload.js`: Utilizes `whatsapp-web.js` to authenticate and dispatch the generated image to your status broadcast.
3. `scripts/run_daily.sh`: Introduces a randomized delay (1–60 minutes) to mitigate automated bot detection before executing the generation and upload sequence.

## Troubleshooting
- **Session Authentication**: If posting fails, delete the `.wwebjs_auth` directory and re-run `node src/upload.js` to re-authenticate.
- **Visibility**: Confirm WhatsApp privacy settings permit status updates to be viewed by your contacts.
- **Node.js Environment**: If automation fails via cron, ensure the environment `PATH` in `scripts/run_daily.sh` is correctly configured to locate the Node.js executable.
