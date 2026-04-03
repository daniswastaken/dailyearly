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

// Initialize
console.log('🚀 Starting WhatsApp client...');
console.log('📂 Auth directory:', AUTH_DIR);
console.log('🖼️ Image path:', IMAGE_PATH);

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
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    }
});

// QR Code event
client.on('qr', (qr) => {
    console.log('📲 QR Code received. Waiting for scan...');
    if (!isDebugMode) {
        console.log('\n📱 Scan this QR code with WhatsApp:\n');
        qrcode.generate(qr, { small: true });
        console.log('\n(Settings > Linked Devices > Link a Device)\n');
    }
});

// Ready event
client.on('ready', async () => {
    console.log('✅ Connected to WhatsApp!');
    console.log('👤 Authenticated as:', client.info.pushname, `(${client.info.wid.user})`);

    try {
        console.log('📤 Preparing to post status...');

        if (!fs.existsSync(IMAGE_PATH)) {
            throw new Error(`Image file not found at ${IMAGE_PATH}`);
        }

        console.log('📸 Reading image file...');
        const media = MessageMedia.fromFilePath(IMAGE_PATH);
        console.log('✅ Media prepared');

        // Post to status
        console.log('🧹 Clearing text status...');
        await client.setStatus('');

        console.log('🚀 Sending media to status@broadcast...');
        const result = await client.sendMessage('status@broadcast', media, {
            sendMediaAsStory: true
        });

        if (result && result.id) {
            console.log('✅ Status posted successfully! Message ID:', result.id.id);
        } else {
            console.log('⚠️ Status might have been posted, but no result ID received.');
        }

        // Wait a bit then exit
        console.log('😴 Waiting 5 seconds before closing...');
        setTimeout(async () => {
            console.log('👋 Closing client...');
            await client.destroy();
            process.exit(0);
        }, 5000);

    } catch (error) {
        console.error('❌ Failed to post status!');
        console.error('❌ Error Name:', error.name);
        console.error('❌ Error Message:', error.message);
        if (error.stack) {
            console.error('❌ Stack Trace:\n', error.stack);
        }

        try {
            await client.destroy();
        } catch (destroyError) {
            console.error('❌ Error while destroying client:', destroyError.message);
        }
        process.exit(1);
    }
});

// Authentication failure
client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
    console.log('👉 Tip: Try deleting the "auth_info" folder and running again to re-sync.');
    process.exit(1);
});

// Disconnected
client.on('disconnected', (reason) => {
    console.log('🔌 Disconnected from WhatsApp. Reason:', reason);
});

// Loading screen
client.on('loading_screen', (percent, message) => {
    console.log(`⏳ Loading WhatsApp Web: ${percent}% - ${message}`);
});

// Initialize
client.initialize().catch(err => {
    console.error('❌ Failed to initialize client:', err.message);
    process.exit(1);
});
