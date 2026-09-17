const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { execFile } = require('child_process');
const { promisify } = require('util');

const runFile = promisify(execFile);
const PROJECT_ROOT = path.dirname(__dirname);
const AUTH_DIR = path.join(PROJECT_ROOT, '.baileys_auth');
const IMAGE_PATH = path.join(PROJECT_ROOT, 'final_status.jpg');
const GENERATOR_PATH = path.join(PROJECT_ROOT, 'src', 'generate.js');

let sock = null;
let connected = false;
let uploading = false;
let midnightTimer = null;
let reconnectTimer = null;
let pendingUpload = true; // One startup upload; reconnects do not create new uploads.

function scheduleNextMidnightUpload() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0); // Calendar midnight in the process timezone (TZ).
    clearTimeout(midnightTimer);
    console.log(`⏰ Next upload: ${next.toString()}`);
    midnightTimer = setTimeout(() => {
        pendingUpload = true;
        scheduleNextMidnightUpload();
        runUpload();
    }, next - now);
}

async function runUpload() {
    if (!pendingUpload || uploading || !connected) return;
    uploading = true;
    pendingUpload = false;
    const uploadSocket = sock;

    try {
        // Allow a newly opened socket to settle before generating and sending.
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('🔄 Running image generator...');
        const { stdout, stderr } = await runFile(process.execPath, [GENERATOR_PATH], {
            cwd: PROJECT_ROOT,
            timeout: 120000
        });
        if (stdout) console.log(stdout.trim());
        if (stderr) console.error(stderr.trim());
        if (!fs.existsSync(IMAGE_PATH)) throw new Error(`Image not found: ${IMAGE_PATH}`);

        if (!connected || sock !== uploadSocket) {
            // Nothing sent yet. Keep one catch-up upload for the next connection.
            pendingUpload = true;
            return;
        }

        await postStatus(uploadSocket);
    } catch (error) {
        // Do not retry an uncertain send: WhatsApp may already have accepted it.
        console.error('❌ Upload failed; next attempt at midnight:', error);
    } finally {
        uploading = false;
        if (pendingUpload && connected) runUpload();
    }
}

function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        startConnection();
    }, 5000);
}

async function startConnection() {
    try {
        await connectToWhatsApp();
    } catch (error) {
        connected = false;
        console.error('❌ Connection failed; retrying in 5 seconds:', error);
        scheduleReconnect();
    }
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const client = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
    });
    sock = client;

    client.ev.on('creds.update', () => {
        saveCreds().catch(error => console.error('❌ Failed to save credentials:', error));
    });

    client.ev.on('connection.update', (update) => {
        if (sock !== client) return;
        if (update.qr) {
            qrcode.generate(update.qr, { small: true });
            console.log('Scan the QR code above.');
        }

        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            connected = false;
            sock = null;
            const loggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
            if (loggedOut) {
                console.error('🔒 Logged out. Re-authenticate before restarting the bot.');
                process.exit(1);
            } else {
                console.log('🔌 Disconnected; reconnecting in 5 seconds.');
                scheduleReconnect();
            }
        } else if (connection === 'open') {
            connected = true;
            console.log('Connection opened!');
            runUpload();
        }
    });
}

async function postStatus(client) {
    console.log('📸 Uploading image...');
    // Get contacts from the auth folder, retaining the existing audience behavior.
    const authFiles = fs.readdirSync(AUTH_DIR);
    const contactJids = authFiles
        .filter(f => f.startsWith('lid-mapping-') && f.endsWith('.json') && !f.includes('reverse'))
        .map(f => f.replace('lid-mapping-', '').replace('.json', '') + '@s.whatsapp.net');

    const myJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    if (!contactJids.includes(myJid)) contactJids.push(myJid);

    await client.sendMessage('status@broadcast', {
        image: fs.readFileSync(IMAGE_PATH)
    }, {
        broadcast: true,
        statusJidList: contactJids
    });
    console.log('✅ Status sent request.');
}

console.log('🚀 Starting DailyEarly (24/7 mode). Startup upload, then daily at midnight.');
scheduleNextMidnightUpload();
startConnection();
