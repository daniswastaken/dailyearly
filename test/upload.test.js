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

async function setup(randomSource = 0) {
    process.env.TZ = 'UTC'; // Simulate a panel configured with the wrong timezone.
    let now = new Date('2026-09-17T18:00:00+07:00').getTime();
    const timers = new Set();
    const clients = [];
    const calls = { generated: 0, sent: 0, failGeneration: false, failSend: false };
    const nextRandom = () => {
        if (typeof randomSource === 'function') return randomSource();
        if (Array.isArray(randomSource)) return randomSource.length ? randomSource.shift() : 0;
        return randomSource;
    };
    const mathStub = {
        floor: (x) => Math.floor(x),
        round: (x) => Math.round(x),
        ceil: (x) => Math.ceil(x),
        random: () => nextRandom()
    };
    class Clock extends Date {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
    }
    const modules = {
        dotenv: { config() {} },
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
        process: { env: process.env, execPath: process.execPath, exit: code => { throw new Error(`Unexpected exit ${code}`); } },
        Date: Clock,
        Math: mathStub,
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
        },
        fireDaily: async () => {
            const timer = [...timers].find(item => item.delay >= SIX_HOURS && item.delay <= SIX_HOURS + ONE_HOUR);
            assert.ok(timer, `Missing daily timer in [${SIX_HOURS}, ${SIX_HOURS + ONE_HOUR}], got [${[...timers].map(t => t.delay)}]`);
            timers.delete(timer);
            now += timer.delay;
            timer.fn();
            await flush();
            return timer.delay;
        }
    };
}

const SIX_HOURS = 6 * 60 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
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
    await app.fireDaily();
    await app.fire(5000);
    assert.equal(app.calls.generated, 2);
    assert.equal(app.calls.sent, 2);
    assert.ok([...app.timers].some(timer => timer.delay >= DAY - ONE_HOUR - 20000 && timer.delay <= DAY + ONE_HOUR + 20000));
});

test('midnight while disconnected queues one fresh upload', async () => {
    const app = await setup();
    await app.fireDaily();
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
        await app.fireDaily();
        await app.fire(5000);
        assert.equal(app.calls.generated, attempts + 1);
        assert.ok(app.calls.sent >= 1);
    });
}

test('daily upload is jittered 00:00-01:00 to avoid bot detection', async () => {
    for (const [random, expectedJitter] of [[0, 0], [0.5, Math.floor(0.5 * (ONE_HOUR + 1))], [0.999999, Math.floor(0.999999 * (ONE_HOUR + 1))]]) {
        const app = await setup(random);
        const delay = [...app.timers].find(t => t.delay >= SIX_HOURS && t.delay <= SIX_HOURS + ONE_HOUR)?.delay;
        assert.ok(delay !== undefined, 'Missing jittered daily timer');
        assert.equal(delay, SIX_HOURS + expectedJitter);
    }
    // Consecutive days stay within 23-25h apart.
    const app = await setup([0.9, 0.1]);
    const first = await app.fireDaily();
    assert.ok(first >= SIX_HOURS && first <= SIX_HOURS + ONE_HOUR);
    const nextDelay = [...app.timers][0].delay;
    assert.ok(nextDelay >= DAY - ONE_HOUR - 20000 && nextDelay <= DAY + ONE_HOUR + 20000);
});
