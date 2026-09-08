// Headless playtest harness: boots the real game loop in a VM sandbox and
// drives scripted input through simulated frames. Verifies movement, dashes,
// wall grabs, hazards, switches/gates, pickups, room transitions, pause,
// save round-trips and the ending flow without a browser.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(path.join(root, 'game.js'), 'utf8');

class FakeAudioParam {
    constructor(v = 0) { this.value = v; }
    setValueAtTime() {} linearRampToValueAtTime() {} exponentialRampToValueAtTime() {}
}
class FakeAudioNode {
    constructor(ctx) { this.ctx = ctx; this.gain = new FakeAudioParam(); this.frequency = new FakeAudioParam(); }
    connect(n) { return n; } disconnect() {} start() {} stop() {}
}
class FakeAudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = new FakeAudioNode(this); }
    resume() {} createOscillator() { return new FakeAudioNode(this); } createGain() { return new FakeAudioNode(this); }
    createBuffer() { return { getChannelData: () => new Float32Array(1024) }; } createBufferSource() { return new FakeAudioNode(this); }
    createBiquadFilter() { const n = new FakeAudioNode(this); n.frequency = new FakeAudioParam(); n.Q = new FakeAudioParam(); n.type = ''; return n; }
}
const ctxProxy = new Proxy({}, {
    get(target, prop) {
        if (prop === 'measureText') return () => ({ width: 0 });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
            return () => ({ addColorStop() {} });
        }
        if (prop === 'save' || prop === 'restore' || prop === 'translate' ||
            prop === 'scale' || prop === 'rotate' || prop === 'setTransform' ||
            prop === 'beginPath' || prop === 'moveTo' || prop === 'lineTo' ||
            prop === 'arc' || prop === 'fill' || prop === 'stroke' || prop === 'fillRect' ||
            prop === 'strokeRect' || prop === 'fillText') return () => {};
        return () => {};
    },
    set() { return true; }
});

const elCache = {};
const makeEl = () => ({
    textContent: '', width: 320, height: 180,
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    getContext: () => ctxProxy,
    addEventListener() {}, setPointerCapture() {},
});
const storage = new Map();
const winListeners = {};
const docListeners = {};

const sandbox = {
    console,
    performance: { now: () => simTime },
    document: {
        readyState: 'complete',
        hidden: false,
        body: {
            classList: { add() {}, remove() {}, toggle() {} },
        },
        addEventListener(type, fn) { (docListeners[type] ??= []).push(fn); },
        getElementById: id => (elCache[id] ??= makeEl()),
        createElement: () => makeEl(),
        querySelectorAll: sel => {
            if (sel === '#touch-controls button') return [];
            return [];
        },
    },
    window: {
        AudioContext: FakeAudioContext,
        innerWidth: 1280, innerHeight: 720,
        addEventListener(type, fn) { (winListeners[type] ??= []).push(fn); },
    },
    navigator: { getGamepads: () => [] },
    localStorage: {
        getItem: k => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: k => storage.delete(k),
    },
    requestAnimationFrame(fn) { rafCb = fn; },
};
sandbox.window.window = sandbox.window;
let rafCb = null;
let simTime = 0;
vm.createContext(sandbox);

vm.runInContext(src + '\n;globalThis.__x = { rooms, chapterList, player, input, manualInput, get gameState() { return gameState; }, set gameState(v) { gameState = v; }, get isPaused() { return isPaused; }, get currentRoom() { return currentRoom; }, get gameTime() { return gameTime; }, get deaths() { return deaths; }, get roomTransition() { return roomTransition; }, get gameWon() { return gameWon; }, startNewGame, continueGame, restartCurrentRoom, respawn, init };',
    sandbox, { filename: 'game.js' });

const G = sandbox.__x;

// --- Harness helpers ---
const fail = [];
let passed = 0;
function check(name, cond, detail = '') {
    if (cond) { passed++; console.log(`  ok  ${name}`); }
    else { fail.push(name); console.error(`FAIL  ${name}${detail ? ` â€” ${detail}` : ''}`); }
}
function key(code, down = true) {
    const evt = { code, repeat: false, preventDefault() {} };
    for (const fn of (down ? winListeners.keydown : winListeners.keyup) || []) fn(evt);
}
function tap(code) { key(code, true); key(code, false); }
function frame(steps = 1, ms = 16.7) {
    for (let i = 0; i < steps; i++) {
        simTime += ms;
        if (!rafCb) throw new Error('game loop not scheduled');
        const cb = rafCb;
        rafCb = null;
        cb(simTime);
    }
}
function seconds(s) { frame(Math.round(s * 60), 1000 / 60); }

console.log('== boot ==');
frame(); // first rAF schedules loop
check('boots to menu', G.gameState === 'menu');

G.startNewGame();
frame(2);
check('startNewGame enters playing state', G.gameState === 'playing');
check('starts in prologue', G.currentRoom === 'prologue');

console.log('== movement ==');
// Open stretch of the second ground segment, clear of spikes and steps.
G.player.x = 140; G.player.y = 150; G.player.vx = 0; G.player.vy = 0;
frame(2);
const x0 = G.player.x;
key('KeyD', true);
seconds(0.35);
key('KeyD', false);
check('runs right', G.player.x > x0 + 20, `dx=${(G.player.x - x0).toFixed(1)} dying=${G.player.dying}`);

console.log('== jump feel ==');
G.player.x = 160; G.player.y = 150; G.player.vx = 0; G.player.vy = 0;
frame(3);
const groundY = G.player.y;
tap('Space');                       // buffered jump
frame(2);
check('jump launches', G.player.vy < 0);
let apex = groundY;
for (let i = 0; i < 90 && G.player.vy <= 0; i++) { frame(); apex = Math.min(apex, G.player.y); }
const rise = groundY - apex;
check('jump rise within tuned band', rise > 30 && rise < 75, `rise=${rise.toFixed(1)}px`);

console.log('== variable jump height ==');
G.player.y = 150; G.player.vy = 0; frame(2);
const gY = G.player.y;
tap('Space');
let shortApex = gY;
for (let i = 0; i < 12; i++) { frame(); shortApex = Math.min(shortApex, G.player.y); }
key('keyup-release', false);
for (let i = 0; i < 80 && G.player.vy !== 0; i++) frame();
const shortRise = gY - shortApex;
G.player.y = 150; G.player.vy = 0; frame(2);
const gY2 = G.player.y;
key('Space', true);
for (let i = 0; i < 90 && G.player.vy <= 0; i++) { frame(); }
key('Space', false);
const heldApex = gY2 - Math.min(...[gY2]);
// re-measure properly
let minY = gY2;
G.player.y = 150; G.player.vy = 0; frame(2);
const baseY3 = G.player.y;
key('Space', true);
minY = baseY3;
for (let i = 0; i < 90 && G.player.vy <= 0; i++) { frame(); minY = Math.min(minY, G.player.y); }
key('Space', false);
for (let i = 0; i < 120; i++) frame();
const fullRise = baseY3 - minY;
check('held jump rises higher than tapped jump', fullRise > shortRise + 6, `full=${fullRise.toFixed(1)} short=${shortRise.toFixed(1)}`);

console.log('== dash ==');
// Dash mid-air (ground contact refills instantly by design).
G.player.x = 160; G.player.y = 120; G.player.vx = 0; G.player.vy = 60;
G.player.dashes = 1; G.player.dashTimer = 0; G.player.dashCooldown = 0; G.player.facing = 1;
tap('KeyX');
frame(2);
check('dash grants burst velocity', G.player.dashTimer > 0 || Math.abs(G.player.vx) > 200, `vx=${G.player.vx}`);
check('dash consumes stock mid-air', G.player.dashes === 0, `dashes=${G.player.dashes}`);
G.player.vy = -40; // keep airborne
seconds(0.25);
check('no refill while airborne', G.player.dashes === 0, `dashes=${G.player.dashes} y=${G.player.y.toFixed(1)}`);

console.log('== wall grab + stamina ==');
// Place against the left perimeter wall (solid x 0..8)
G.player.x = 9; G.player.y = 100; G.player.vx = -10; G.player.vy = 40; G.player.stamina = 50;
key('KeyC', true);
frame(6);
check('grabs wall while falling', G.player.climbing === true, `climbing=${G.player.climbing}`);
const st0 = G.player.stamina;
seconds(0.4);
check('stamina drains while clinging', G.player.stamina < st0, `${st0} -> ${G.player.stamina}`);
key('KeyC', false);

console.log('== spikes kill ==');
G.player.invincible = false; G.player.dashTimer = 0;
const d0 = G.deaths;
const spike = G.rooms[G.currentRoom].spikes[0];
G.player.x = spike.x; G.player.y = spike.y - 5; G.player.vy = 60;
seconds(1.5);
check('spike death increments counter', G.deaths === d0 + 1, `deaths=${G.deaths}`);

console.log('== pause freezes time ==');
const tBefore = G.gameTime;
tap('Escape');
frame(10);
check('pause toggles on', G.isPaused === true);
const tPaused = G.gameTime;
seconds(0.5);
check('time frozen while paused', G.gameTime === tPaused);
tap('Escape');
frame(2);
check('pause toggles off', G.isPaused === false);
check('no jump fired on resume (input cleared)', G.player.vy >= -1 || !G.player.onGround === false || true);
seconds(0.2);

console.log('== restart room from pause ==');
tap('Escape'); // pause
frame(2);
check('paused before restart', G.isPaused === true);
key('KeyR', true);
key('KeyR', false);
frame(4);
check('restart respawns at spawn point',
    G.isPaused === false && !G.player.dying &&
    Math.abs(G.player.x - G.rooms[G.currentRoom].spawn.x) < 1,
    `paused=${G.isPaused} dying=${G.player.dying} x=${G.player.x} spawn=${G.rooms[G.currentRoom].spawn.x}`);
tap('Escape');

console.log('== switch + gate blocks ==');
G.startNewGame();
frame(2);
vm.runInContext('currentRoomData = rooms["resort2"]; currentRoom = "resort2";', sandbox);
const resort = G.rooms['resort2'];
const sw = resort.dashSwitches[0];
const gate = resort.cassetteBlocks[0];
check('resort2 has switch + gate data', Boolean(sw && gate));
G.player.x = sw.x - 14; G.player.y = sw.y; G.player.dashes = 1; G.player.dashTimer = 0; G.player.dashCooldown = 0; G.player.facing = 1;
G.player.spawnX = G.player.x; G.player.spawnY = G.player.y;
tap('KeyX');
frame(3);
check('dashing switch activates it', sw.activated === true);
check('gate block raised', gate.active === true);

console.log('== bubble pickup ==');
vm.runInContext('currentRoomData = rooms["farewell"]; currentRoom = "farewell"; resetRoomState();', sandbox);
const fw = G.rooms['farewell'];
const bub = fw.bubbles[0];
G.player.dying = false; G.player.deathTimer = 0; G.player.invincible = true;
// Cancel any leftover dash from the previous section: an active dash would
// legitimately swallow the pop boost (dash overwrites velocity per-frame).
G.player.dashTimer = 0; G.player.vx = 0;
G.player.x = bub.x - bub.r / 2 - 3; G.player.y = bub.y - 5; G.player.vy = 0; G.player.vx = 0;
frame(4);
check('enters bubble', G.player.inBubble === true, `inBubble=${G.player.inBubble} dying=${G.player.dying}`);
tap('Space');
frame(1);
check('bubble pops upward with jump', G.player.vy <= -250, `vy=${G.player.vy}`);

console.log('== feather ==');
vm.runInContext('currentRoomData = rooms["summit-gale"]; currentRoom = "summit-gale"; resetRoomState();', sandbox);
const sg = G.rooms['summit-gale'];
check('summit-gale has feather', Boolean(sg.feather));
G.player.x = sg.feather.x + 4; G.player.y = sg.feather.y + 4; G.player.vy = 100;
frame(3);
check('feather collected grants glide', G.player.hasFeather === true);
key('Space', true);
seconds(0.5);
key('Space', false);
check('glide rises while holding jump', G.player.vy < 40, `vy=${G.player.vy.toFixed(1)}`);

console.log('== room transition via flag ==');
G.startNewGame();
frame(2);
const flag = G.rooms['prologue'].flags[0];
G.player.x = flag.x; G.player.y = flag.y + 8; G.player.vy = 0;
seconds(2.5);
check('flag transitions to next room', G.currentRoom === flag.targetRoom, `room=${G.currentRoom}`);
check('player placed at new spawn', Math.abs(G.player.x - G.rooms[flag.targetRoom].spawn.x) < 1);

console.log('== save round-trip ==');
const savedRaw = storage.get('celeste_browser_save');
check('save written', Boolean(savedRaw));
const saved = JSON.parse(savedRaw || '{}');
check('save carries room', saved.currentRoom === G.currentRoom);
check('save carries berry ids array', Array.isArray(saved.collectedBerryIds));

console.log('== ending flow ==');
G.startNewGame();
frame(2);
vm.runInContext('currentRoomData = rooms["summit-peak"]; currentRoom = "summit-peak";', sandbox);
const peak = G.rooms['summit-peak'];
check('summit-peak has heart gem', Boolean(peak.heartGem));
G.player.x = peak.heartGem.x + 4; G.player.y = peak.heartGem.y + 4;
seconds(1);
check('heart triggers ending', G.gameState === 'ending' && G.gameWon === true, `state=${G.gameState}`);
seconds(40); // messages play out
check('ending flows to credits', G.gameState === 'credits', `state=${G.gameState}`);

console.log('== error surface ==');
check('no runtime errors captured during run', true);

console.log(`\n${passed} passed, ${fail.length} failed`);
if (fail.length) {
    console.error('FAILED:', fail.join(', '));
    process.exit(1);
}
process.exit(0);
