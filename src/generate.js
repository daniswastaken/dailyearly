const sharp = require('sharp');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.dirname(__dirname);
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'final_status.jpg');
const OVERLAY_IMAGE_PATH = path.join(PROJECT_ROOT, 'assets', 'overlay_image.png');
const FALLBACK_IMAGE = path.join(PROJECT_ROOT, 'assets', 'img_base.png');
const TEXTURE_DIR = path.join(PROJECT_ROOT, 'assets', 'textures');

const FINAL_WIDTH = 720;
const FINAL_HEIGHT = 1278;
const TEXT_X = 360;
const TEXT_Y = 700;
const BAR_X = 81;
const BAR_Y = 860;
const BAR_MAX_WIDTH = 558;
const BAR_HEIGHT = 30;
const FONT_SIZE = 75;

function calculateYearProgress() {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
    const totalMs = yearEnd - yearStart;
    const elapsedMs = now - yearStart;
    return Math.round((elapsedMs / totalMs) * 10000) / 100;
}

async function fetchBackground() {
    try {
        const res = await fetch('https://picsum.photos/1920/1080', { redirect: 'follow' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        console.log(`Fetched remote background (${buf.length} bytes)`);
        return buf;
    } catch (e) {
        console.log(`Warning: Failed to fetch remote background: ${e.message}. Falling back.`);
        if (fs.existsSync(FALLBACK_IMAGE)) {
            const buf = fs.readFileSync(FALLBACK_IMAGE);
            console.log(`Using fallback image (${buf.length} bytes)`);
            return buf;
        }
        console.log('No fallback image found, using black background.');
        return null;
    }
}

function getRandomTexture() {
    if (!fs.existsSync(TEXTURE_DIR)) return null;
    const files = fs.readdirSync(TEXTURE_DIR).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    if (files.length === 0) return null;
    const pick = files[Math.floor(Math.random() * files.length)];
    return path.join(TEXTURE_DIR, pick);
}

function makeDarkOverlay(width, height, opacity) {
    const channels = 4;
    const buf = Buffer.alloc(width * height * channels);
    const alpha = Math.round(255 * opacity);
    for (let i = 0; i < buf.length; i += channels) {
        buf[i] = 0;     // R
        buf[i + 1] = 0; // G
        buf[i + 2] = 0; // B
        buf[i + 3] = alpha; // A
    }
    return sharp(buf, { raw: { width, height, channels } }).png().toBuffer();
}

async function generateStatusImage() {
    const percentage = calculateYearProgress();
    console.log(`Year Progress: ${percentage.toFixed(2)}%`);

    // 1. Start with background
    const bgBuf = await fetchBackground();
    let base;
    if (bgBuf) {
        base = sharp(bgBuf).resize(FINAL_WIDTH, FINAL_HEIGHT, { fit: 'cover', position: 'centre' });
    } else {
        base = sharp({
            create: {
                width: FINAL_WIDTH,
                height: FINAL_HEIGHT,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 255 }
            }
        });
    }

    // 2. Dark overlay (30% opacity)
    const darkOverlay = await makeDarkOverlay(FINAL_WIDTH, FINAL_HEIGHT, 0.3);

    const composites = [{ input: darkOverlay }];

    // 3. Random texture (already has proper alpha)
    const texturePath = getRandomTexture();
    if (texturePath) {
        const textureBuf = await sharp(texturePath)
            .resize(FINAL_WIDTH, FINAL_HEIGHT, { fit: 'fill' })
            .png().toBuffer();
        composites.push({ input: textureBuf });
    }

    // 4. UI overlay (use as-is, like Python did)
    if (fs.existsSync(OVERLAY_IMAGE_PATH)) {
        const overlayBuf = await sharp(OVERLAY_IMAGE_PATH)
            .resize(FINAL_WIDTH, FINAL_HEIGHT, { fit: 'fill' })
            .png().toBuffer();
        composites.push({ input: overlayBuf });
    } else {
        console.log(`Warning: ${OVERLAY_IMAGE_PATH} not found. Skipping UI overlay.`);
    }

    // 5. Draw text + progress bar on canvas
    const canvas = createCanvas(FINAL_WIDTH, FINAL_HEIGHT);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${FONT_SIZE}px Consolas`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percentage.toFixed(2)}%`, TEXT_X, TEXT_Y);

    const fillWidth = Math.round((percentage / 100) * BAR_MAX_WIDTH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(BAR_X, BAR_Y, fillWidth, BAR_HEIGHT);

    composites.push({ input: canvas.toBuffer('image/png') });

    // 6. Composite all layers and save
    await base
        .composite(composites)
        .jpeg({ quality: 95 })
        .toFile(OUTPUT_PATH);

    console.log(`Generated: ${OUTPUT_PATH}`);
}

generateStatusImage().catch(err => {
    console.error('Failed to generate image:', err);
    process.exit(1);
});
