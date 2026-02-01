#!/usr/bin/env node
/**
 * WhatsApp Status Uploader
 * Uses whatsapp-web.js to post images to WhatsApp Status
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Configuration
const SCRIPT_DIR = __dirname;
const AUTH_DIR = path.join(SCRIPT_DIR, 'auth_info');
const IMAGE_PATH = path.join(SCRIPT_DIR, 'final_status.jpg');

// Parse CLI arguments
const args = process.argv.slice(2);
const isDebugMode = args.includes('--now') || args.includes('-n');

if (isDebugMode) {
    console.log('🔧 Debug mode: Posting status immediately');
}

// Check if image exists before starting
if (!fs.existsSync(IMAGE_PATH)) {
    console.error(`❌ Image not found: ${IMAGE_PATH}`);
    console.error('   Run generate.py first to create the status image.');
    process.exit(1);
}

// Create client
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: AUTH_DIR
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu'
        ]
    }
});

// QR Code event
client.on('qr', (qr) => {
    console.log('\n📱 Scan this QR code with WhatsApp:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n(Settings > Linked Devices > Link a Device)\n');
});

// Ready event
client.on('ready', async () => {
    console.log('✅ Connected to WhatsApp');

    try {
        // Read and prepare the image
        console.log('📤 Posting status...');

        const media = MessageMedia.fromFilePath(IMAGE_PATH);

        // Post to status
        await client.setStatus('');  // Clear text status first

        // Send image as status
        const result = await client.sendMessage('status@broadcast', media, {
            sendMediaAsStory: true
        });

        console.log('✅ Status posted successfully!');

        // Wait a bit then exit
        setTimeout(async () => {
            await client.destroy();
            process.exit(0);
        }, 3000);

    } catch (error) {
        console.error('❌ Failed to post status:', error.message);
        await client.destroy();
        process.exit(1);
    }
});

// Authentication failure
client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
    console.log('   Try deleting auth_info folder and running again.');
    process.exit(1);
});

// Disconnected
client.on('disconnected', (reason) => {
    console.log('🔌 Disconnected:', reason);
    process.exit(0);
});

// Loading screen
client.on('loading_screen', (percent, message) => {
    console.log(`⏳ Loading: ${percent}% - ${message}`);
});

// Initialize
console.log('🚀 Starting WhatsApp client...');
client.initialize();
