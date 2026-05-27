const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.dirname(__dirname);
const AUTH_DIR = path.join(PROJECT_ROOT, '.baileys_auth');
const IMAGE_PATH = path.join(PROJECT_ROOT, 'final_status.jpg');
const GENERATOR_PATH = path.join(PROJECT_ROOT, 'src', 'generate.py');

// Ensure image is generated
console.log('🔄 Running image generator...');
try {
    execSync(`python3 "${GENERATOR_PATH}"`, { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Failed to generate image:', error.message);
    process.exit(1);
}

// Check if image exists
if (!fs.existsSync(IMAGE_PATH)) {
    console.error(`❌ Image not found: ${IMAGE_PATH}`);
    process.exit(1);
}

// Initialize
console.log('🚀 Starting WhatsApp client...');
console.log('📂 Auth directory:', AUTH_DIR);
console.log('🖼️ Image path:', IMAGE_PATH);

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        console.log('Connection update:', update);
        
        // Explicitly handle QR code
        if (update.qr) {
            qrcode.generate(update.qr, { small: true });
            console.log('Scan the QR code above.');
        }

        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Connection opened!');
            postStatus(sock);
        }
    });
}

async function postStatus(sock) {
    try {
        console.log('📸 Uploading image...');
        
        // Add a slight delay to ensure the socket is truly ready
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Get contacts from auth folder as a workaround since no store is used
        const authFiles = fs.readdirSync(AUTH_DIR);
        const contactJids = authFiles
            .filter(f => f.startsWith('lid-mapping-') && f.endsWith('.json') && !f.includes('reverse'))
            .map(f => f.replace('lid-mapping-', '').replace('.json', '') + '@s.whatsapp.net');
        
        // Ensure our own JID is included so it shows up on our device
        const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (!contactJids.includes(myJid)) {
            contactJids.push(myJid);
        }

        await sock.sendMessage('status@broadcast', {
            image: fs.readFileSync(IMAGE_PATH)
        }, {
            broadcast: true,
            statusJidList: contactJids
        });
        
        console.log('✅ Status sent request.');
        setTimeout(() => process.exit(0), 5000);
    } catch (err) {
        console.error('❌ Failed to post:', err);
        process.exit(1);
    }
}

connectToWhatsApp();
