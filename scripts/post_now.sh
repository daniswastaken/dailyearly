#!/bin/bash
#
# CLI command to post status immediately (for debugging)
# Usage: ./post_now.sh
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 Debug: Posting status NOW (no delay)"
echo ""

cd "$SCRIPT_DIR"

echo "📊 Generating status image..."
python3 generate.py

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate image"
    exit 1
fi

echo ""
echo "📤 Uploading to WhatsApp..."
node upload.js --now

if [ $? -ne 0 ]; then
    echo "❌ Failed to upload"
    exit 1
fi

echo ""
echo "✅ Done!"
