#!/bin/bash
#
# CLI command to post status immediately (for debugging)
# Usage: ./post_now.sh
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Debug: Posting status NOW (no delay)"
echo ""

cd "$PROJECT_DIR"

echo ""
echo "📤 Uploading to WhatsApp..."
node src/upload.js --now

if [ $? -ne 0 ]; then
    echo "❌ Failed to upload"
    exit 1
fi

echo ""
echo "✅ Done!"
