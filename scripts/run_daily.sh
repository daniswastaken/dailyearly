#!/bin/bash
#
# Daily WhatsApp Status Automation Script
# Optimized for Cron and environment portability
#

# 1. Robust PATH setup
# This ensures standard binary locations are searchable by Cron
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

# 2. Project Location
# Auto-detect project root based on script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/daily_status.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Cycle triggered at $(date)"

# 3. Environment Check
# Verify dependencies are available before proceeding
if ! command -v node &> /dev/null; then
    log "CRITICAL ERROR: 'node' not found in PATH ($PATH). Execution halted."
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    log "CRITICAL ERROR: 'python3' not found in PATH. Execution halted."
    exit 1
fi

# 4. Change to project directory
cd "$PROJECT_DIR" || { log "CRITICAL ERROR: Could not access $PROJECT_DIR"; exit 1; }

# 5. Random Delay (Skip if --now or -n is passed)
if [[ "$1" != "--now" && "$1" != "-n" ]]; then
    RANDOM_DELAY=$((RANDOM % 3600 + 60))
    log "Randomizing post: Sleeping for $RANDOM_DELAY seconds..."
    sleep $RANDOM_DELAY
else
    log "Immediate execution mode enabled."
fi

log "Initiating status upload pipeline..."

# 6. Execute
node src/upload.js 2>&1 | tee -a "$LOG_FILE"

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log "CRITICAL ERROR: Status upload failed."
    exit 1
fi

log "Daily automation cycle completed successfully."
log "=========================================="
