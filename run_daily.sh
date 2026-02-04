#!/bin/bash
#
# Daily WhatsApp Status Automation Script
# Run this via cron at 01:00 AM daily
#
export PATH=$PATH:/home/daniswastaken/.nvm/versions/node/v24.13.0/bin

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/daily_status.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Starting daily status update"

# Random sleep between 1 and 60 minutes to avoid bot detection
# This makes the posting time vary daily
if [ "$1" != "--now" ] && [ "$1" != "-n" ]; then
    RANDOM_DELAY=$((RANDOM % 3600 + 60))  # 60 to 3660 seconds (1-61 minutes)
    log "Sleeping for $RANDOM_DELAY seconds to randomize post time..."
    sleep $RANDOM_DELAY
else
    log "Debug mode: Skipping random delay"
fi

log "Generating status image..."

# Run Python script
cd "$SCRIPT_DIR"
python3 generate.py >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    log "ERROR: Failed to generate image"
    exit 1
fi

log "Image generated successfully"
log "Uploading to WhatsApp..."

# Run Node.js script
node upload.js 2>&1 | tee -a "$LOG_FILE"

if [ $? -ne 0 ]; then
    log "ERROR: Failed to upload to WhatsApp"
    exit 1
fi

log "Status posted successfully!"
log "=========================================="

exit 0
