const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { EventEmitter } = require('events');

const source = fs.readFileSync(path.join(__dirname, '../src/upload.js'), 'utf8');

async function flush() {
    for (let i = 0; i < 20; i++) await Promise.resolve();
}

async function setup() {
    let now = new Date(2026, 8, 17, 18, 0, 0).getTime();
    const timers = new Set();
    const clients = [];
    const calls = { generated: 0, sent: 0, failGeneration: false, failSend: false };
    class Clock extends Date {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
    }
    const modules = {
        '@whiskeysockets/baileys': {
            default: () => {
                const client = {
                    ev: new EventEmitter(),
                    user: { id: '123:1@s.whatsapp.net' },
                    sendMessage: async () => {
                        calls.sent++;
                        if (calls.failSend) throw new Error('Send failed');
                    }
                };
                clients.push(client);
                return client;
            },
            useMultiFileAuthState: async () => ({ state: {}, saveCreds: async () => {} }),
            DisconnectReason: { loggedOut: 401 }
        },
        pino: () => ({}),
        fs: { existsSync: () => true, readdirSync: () => [], readFileSync: () => Buffer.from('image') },
        path,
        'qrcode-terminal': { generate() {} },
        'child_process': { execFile() {} },
        util: { promisify: () => async () => {
            calls.generated++;
            if (calls.failGeneration) throw new Error('Generation failed');
            return { stdout: '', stderr: '' };
        } }
    };
    vm.runInNewContext(source, {
        require: name => modules[name],
        __dirname: path.join(__dirname, '../src'),
        console: { log() {}, error() {} },
        process: { execPath: process.execPath, exit: code => { throw new Error(`Unexpected exit ${code}`); } },
        Date: Clock,
        setTimeout: (fn, delay) => {
            const timer = { fn, delay };
            timers.add(timer);
            return timer;
        },
        clearTimeout: timer => timers.delete(timer)
    });
    await flush();
    return {
        calls, clients, timers,
        open: () => clients.at(-1).ev.emit('connection.update', { connection: 'open' }),
        close: () => clients.at(-1).ev.emit('connection.update', { connection: 'close' }),
        fire: async delay => {
            const timer = [...timers].find(item => item.delay === delay);
            assert.ok(timer, `Missing timer with delay ${delay}`);
            timers.delete(timer);
            now += delay;
            timer.fn();
            await flush();
        }
    };
}

const SIX_HOURS = 6 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

test('generates on startup and midnight; reconnects do not repost', async () => {
    const app = await setup();
    app.open();
    app.open();
    await app.fire(5000);
    assert.equal(app.calls.generated, 1);
    assert.equal(app.calls.sent, 1);
    app.close();
    await app.fire(5000);
    app.open();
    await flush();
    assert.equal(app.calls.sent, 1);
    await app.fire(SIX_HOURS);
    await app.fire(5000);
    assert.equal(app.calls.generated, 2);
    assert.equal(app.calls.sent, 2);
    assert.ok([...app.timers].some(timer => timer.delay > DAY - 20000));
});

test('midnight while disconnected queues one fresh upload', async () => {
    const app = await setup();
    await app.fire(SIX_HOURS);
    assert.equal(app.calls.generated, 0);
    app.open();
    await app.fire(5000);
    assert.equal(app.calls.generated, 1);
    assert.equal(app.calls.sent, 1);
});

test('disconnect during startup delay defers send until reconnect', async () => {
    const app = await setup();
    app.open();
    app.close();
    await app.fire(5000);
    assert.equal(app.calls.sent, 0);
    await app.fire(5000);
    app.open();
    await app.fire(5000);
    assert.equal(app.calls.sent, 1);
});

for (const failure of ['failGeneration', 'failSend']) {
    test(`${failure} keeps scheduler alive without reconnect retries`, async () => {
        const app = await setup();
        app.calls[failure] = true;
        app.open();
        await app.fire(5000);
        const attempts = app.calls.generated;
        app.open();
        await flush();
        assert.equal(app.calls.generated, attempts);
        app.calls[failure] = false;
        await app.fire(SIX_HOURS);
        await app.fire(5000);
        assert.equal(app.calls.generated, attempts + 1);
        assert.ok(app.calls.sent >= 1);
    });
}
