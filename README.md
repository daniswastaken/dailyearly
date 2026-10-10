# DailyEarly: WhatsApp Year Progress Status Bot

DailyEarly generates a year-progress image and publishes it as a WhatsApp status.

## Setup

Requires Node.js >= 18 and the dependencies in `package.json`.

```bash
npm install
npm start
```

Scan the terminal QR code on first login. Credentials are stored in `.baileys_auth`.

## 24/7 operation

Keep one instance of `node src/upload.js` (or `npm start`) running continuously.

- Generates and uploads a fresh image after WhatsApp connects on **every process start**.
- Generates and uploads again once daily at a random time between **00:00-01:00 (midnight + 0-60 min jitter)** to avoid bot detection.
- Hardcodes **Asia/Jakarta (WIB, UTC+7)** for scheduling and image year-progress calculations, overriding the server/panel timezone. Midnight means 12 AM, not 12 PM.
- Reconnects automatically after temporary disconnections, without posting again just because it reconnected.
- If disconnected at midnight, queues one fresh upload for reconnection, not one per missed day.
- Uploads cannot overlap. Generation or send errors are logged; the next scheduled attempt remains active. Uncertain sends are not automatically retried, to avoid duplicates.
- No longer stops the Pterodactyl server or exits after posting. A logged-out session still exits with an error and requires re-authentication.

Daily scheduling follows calendar midnight plus a uniform random 0-60 min delay, not 24 hours from startup. The first jittered upload can therefore be less than 24 hours after the startup upload, and consecutive daily posts land 23-25h apart. Asia/Jakarta does not observe daylight saving time. Restarting the process intentionally triggers another startup upload.

### Pterodactyl

1. Set the startup command to `node src/upload.js` or `npm start`.
2. Disable the old scheduled start/stop/restart tasks for this bot.
3. No `TZ` panel setting is required: the code forces `Asia/Jakarta`. Check the logged next-upload time for midnight with `GMT+0700`.
4. Start the server and leave it running. Restart after deploying code changes. Do not launch multiple instances.

The previous hardcoded Pterodactyl power API credential is no longer needed and has been removed from the script. Revoke or rotate that credential in the panel.

## Commands

- `npm start`, `npm run post`, `npm run daily`: start the continuously running bot.
- `npm run post:now`, `npm run daily:now`: compatibility aliases; startup already uploads immediately, and the process stays running.
- `npm run generate`: generate `final_status.jpg` without uploading.
- `npm test`: run mocked scheduling and connection tests without contacting WhatsApp.

## Files

- `src/generate.js`: year-progress calculation and image generation using Canvas and Sharp.
- `src/upload.js`: WhatsApp authentication, reconnection, uploads, and midnight scheduling.
- `assets/`: fonts, overlays, textures, and fallback background.
- `final_status.jpg`: generated output, refreshed before each upload.
- `.baileys_auth/`: saved WhatsApp credentials; keep private.
