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
    connect(n) { return n; } start() {} stop() {}
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
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop() {} });
        return () => {};
    },
    set() { return true; }
});
const makeEl = () => ({
    textContent: '', width: 320, height: 180,
    style: {}, classList: { add() {}, remove() {}, toggle() {} },
    getContext: () => ctxProxy, addEventListener() {},
});
const elCache = {};
const sandbox = {
    console,
    document: {
        readyState: 'loading',
        addEventListener() {},
        getElementById: id => (elCache[id] ??= makeEl()),
        createElement: () => makeEl(),
        querySelectorAll: () => [],
    },
    window: {
        AudioContext: FakeAudioContext, addEventListener() {},
        innerWidth: 1280, innerHeight: 720,
    },
    navigator: { getGamepads: () => [] },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    requestAnimationFrame() {},
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(src + '\n;globalThis.__x = { rooms, chapterList, CURATED_ROOM_DESIGNS };', sandbox, { filename: 'game.js' });
sandbox.init();
const { rooms, chapterList } = sandbox.__x;

// Movement model constants (mirrors game.js physics)
const PW = 6, PH = 10;
const JUMP_APEX = 280 * 280 / (2 * 900) - 4;      // ~39 conservative
const JUMP_RANGE = 52;                            // flat full-jump drift
const DASH_XTRA = 46;                             // forward dash distance
const UPDASH_COMBO_RISE = 82;                     // jump + up-dash chain
const SPRING_RISE = { 1: 92, 2: 142 };            // p2 assumes the -520 buff
const BUBBLE_RISE = 55;

const issues = [];
const note = (room, msg) => issues.push(`[${room}] ${msg}`);

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const box = (x, y, w, h) => ({ x, y, w, h });

function analyze(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const solids = room.solids.map(s => ({ x: s.x, y: s.y, w: s.w, h: s.h }));
    // Kevin blocks are permanently solid; include them with terrain.
    const kevinRects = room.kevinBlocks.map(k => ({ x: k.x, y: k.y, w: k.w, h: k.h }));
    const staticSolids = solids.concat(kevinRects);
    // Cassette gate blocks start INACTIVE and are player-toggled, so they are
    // excluded from the vanilla reachability model â€” but their active state is
    // checked for hazard/embedding conflicts in the integrity pass below.
    const gateRects = (room.cassetteBlocks || []).map(c => ({ x: c.x, y: c.y, w: c.w, h: c.h }));
    const dreamRects = room.dreamBlocks.map(d => ({ x: d.x, y: d.y, w: d.w, h: d.h }));
    const spikes = room.spikes;
    const springs = room.springs;
    const bubbles = room.bubbles;
    // Movers contribute two static rest positions you can stand on.
    const moverRests = room.movingPlatforms.flatMap(mp => [
        { x: mp.originStartX ?? mp.startX, y: mp.startY, w: mp.w, h: mp.h },
        { x: mp.originEndX ?? mp.endX, y: mp.endY, w: mp.w, h: mp.h },
    ]);
    const standable = staticSolids.concat(moverRests);

    const collide = (b, opts = {}) => {
        for (const s of staticSolids) if (overlap(b, s)) return true;
        if (!opts.ignoreDream) for (const d of dreamRects) if (overlap(b, d)) return true;
        return false;
    };
    const spikeAt = b => spikes.some(s => overlap(b, s));

    const free = (x, y, opts) =>
        x >= 0 && x + PW <= room.width && y + PH <= room.height &&
        !collide(box(x, y, PW, PH), opts) && !spikeAt(box(x, y, PW, PH));
    const supported = (x, yBottom) => {
        const strip = box(x + 1, yBottom, PW - 2, 6);
        return standable.some(s => overlap(strip, s));
    };

    // --- Nodes: standable surfaces + wall-climb holds ---
    const normSide = s => (s === -1 || s === 1) ? String(s) : '';
    const key = (x, y, side = '') => `${Math.round(x)},${Math.round(y)}|${normSide(side)}`;
    const nodes = new Map();
    const addStand = (x, y) => {
        x = Math.round(x * 2) / 2; y = Math.round(y);
        const k = key(x, y);
        if (nodes.has(k)) return nodes.get(k);
        if (!free(x, y) || !supported(x, y + PH)) return null;
        const n = { x, y, hold: 0, edges: [] };
        nodes.set(k, n);
        return n;
    };

    const tops = new Set(standable.map(s => Math.round(s.y)));
    for (const top of tops) {
        for (let x = 0; x <= room.width - PW; x += 2) addStand(x, top - PH);
    }

    // Wall holds hug vertical faces (perimeter walls included)
    const probeSide = (x, y) => {
        const probeL = box(x - 3, y + 2, 3, PH - 4);
        const probeR = box(x + PW, y + 2, 3, PH - 4);
        if (staticSolids.some(s => overlap(probeL, s))) return -1;
        if (staticSolids.some(s => overlap(probeR, s))) return 1;
        return 0;
    };
    const faceXs = new Set();
    for (const s of standable) {
        if (s.h >= 8) { faceXs.add(s.x - PW); faceXs.add(s.x + s.w); }
    }
    for (const fx of faceXs) {
        for (let y = -PH; y <= room.height - PH; y += 3) {
            const x = Math.max(0, Math.min(room.width - PW, fx));
            if (!free(x, y)) continue;
            const side = probeSide(x, y);
            if (!side) continue;
            const k = key(x, y, side);
            if (!nodes.has(k)) nodes.set(k, { x, y, hold: side, edges: [] });
        }
    }

    // --- Edge construction ---
    const _pathCache = new Map();
    const clearPath = (from, to) => {
        const k = `${Math.round(from.x * 2)},${Math.round(from.y)},${Math.round(to.x * 2)},${Math.round(to.y)}`;
        const c = _pathCache.get(k);
        if (c !== undefined) return c;
        const steps = Math.max(2, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4));
        let ok = true;
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            if (!free(x, y) || spikeAt(box(x, y, PW, PH))) { ok = false; break; }
        }
        _pathCache.set(k, ok);
        return ok;
    };
    const landsSafely = (x, y) => {
        const foot = y + PH;
        for (const s of standable) {
            if (x + 1 < s.x + s.w && x + 1 + (PW - 2) > s.x && foot >= s.y - 6 && foot <= s.y + 2) {
                const snapY = s.y - PH;
                if (free(x, snapY)) return true;
            }
        }
        return false;
    };
    // Sample a real jump arc. mode: 'plain', 'dash' (jump chained into a
    // forward dash), or 'wall' (wall-jump launch speed). spd is the pre-dash
    // horizontal speed â€” players can jump nearly straight up beside a wall.
    const _arcCache = new Map();
    const clearJumpArc = (from, dir, mode = 'plain', spd = 90) => {
        const k = `${Math.round(from.x * 2)},${Math.round(from.y)},${dir},${mode},${spd}`;
        const c = _arcCache.get(k);
        if (c !== undefined) return c;
        const vy = 280, g = 900;
        const vAt = t => mode === 'dash' ? (t < 0.05 ? spd : t < 0.20 ? 320 : 90)
            : mode === 'wall' ? 160 : spd;
        const T_END = mode === 'dash' ? 0.85 : 0.65;
        let ok = true;
        for (let t = 0.03; t <= T_END; t += 0.02) {
            let x = from.x, prev = 0;
            for (let s = 1; s <= Math.ceil(t / 0.01); s++) {
                const ts = (t * s) / Math.ceil(t / 0.01);
                x += vAt((prev + ts) / 2) * dir * (ts - prev);
                prev = ts;
            }
            const y = from.y - (vy * t - g * t * t / 2);
            if (x < 0 || x + PW > room.width || y + PH > room.height) { ok = false; break; }
            if (!free(x, y) || spikeAt(box(x, y, PW, PH))) {
                ok = landsSafely(x, y); // touching down on a surface ends the arc
                break;
            }
        }
        _arcCache.set(k, ok);
        return ok;
    };

    // Gravity fall from a stance edge with mid-air steering tolerance.
    const _fallCache = new Map();
    const clearFallArc = (from, m) => {
        const k = `${Math.round(from.x * 2)},${Math.round(from.y)},${Math.round(m.x * 2)},${Math.round(m.y)}`;
        const c = _fallCache.get(k);
        if (c !== undefined) return c;
        const dy = m.y - from.y;
        if (dy < 2) { _fallCache.set(k, false); return false; }
        const tLand = Math.sqrt(2 * dy / 900);
        let ok = false;
        for (const dir of [-1, 1]) {
            for (const spd of [25, 50, 90]) {
                if (Math.abs(from.x + spd * dir * tLand - m.x) > 4) continue;
                let good = true;
                for (let t = 0.03; t < tLand; t += 0.03) {
                    const x = from.x + spd * dir * t;
                    const y = from.y + 450 * t * t;
                    if (x < 0 || x + PW > room.width || y + PH > room.height) { good = false; break; }
                    if (!free(x, y) || spikeAt(box(x, y, PW, PH))) { good = false; break; }
                }
                if (good) { ok = true; break; }
            }
            if (ok) break;
        }
        _fallCache.set(k, ok);
        return ok;
    };

    const nodeList = [...nodes.values()];
    const stands = nodeList.filter(n => !n.hold);

    // Vertical-ish hops must not assume a drift direction or speed.
    const tryArc = (n, m, mode = 'plain') => {
        const s = Math.sign(m.x - n.x);
        const dirs = Math.abs(m.x - n.x) <= 8 ? [-1, 1] : [s];
        for (const dir of dirs) {
            for (const spd of [25, 55, 90]) {
                if (clearJumpArc(n, dir, mode, spd)) return true;
            }
        }
        return false;
    };

    for (const n of stands) {
        for (const m of stands) {
            if (n === m) continue;
            const dx = Math.abs(n.x - m.x);
            const rise = n.y - m.y; // positive: m above n
            let ok = false;

            if (dx <= 10 && rise >= -10 && rise <= 10) ok = clearPath(n, m);                     // walk/step
            else if (rise > 10 && rise <= JUMP_APEX && dx <= JUMP_RANGE) ok = tryArc(n, m);          // plain jump
            else if (rise > 10 && rise <= JUMP_APEX && dx <= JUMP_RANGE + DASH_XTRA) ok = tryArc(n, m, 'dash'); // jump+dash
            else if (rise > JUMP_APEX && rise <= UPDASH_COMBO_RISE && dx <= 26) ok = clearPath(n, m);                 // up-dash combo
            else if (rise <= -2 && dx <= 56 + Math.min(130, -rise)) ok = clearFallArc(n, m);     // fall with drift

            if (ok) n.edges.push({ to: m });
        }
    }

    // Climb along a wall face (chainable small steps)
    for (const n of nodeList) {
        if (!n.hold) continue;
        for (const m of nodeList) {
            if (m === n || m.hold !== n.hold) continue;
            if (Math.abs(n.x - m.x) > 6 || Math.abs(n.y - m.y) > 18 || n.y === m.y) continue;
            if (clearPath(n, m)) { n.edges.push({ to: m }); }
        }
    }
    // Grab a wall from a stance (and let go back onto one)
    for (const h of nodeList) {
        if (!h.hold) continue;
        for (const s of stands) {
            const dx = Math.abs(h.x - s.x), dy = Math.abs(h.y - s.y);
            if (dx <= 8 && dy <= 40 && dy >= 3 && clearPath(h, s)) { h.edges.push({ to: s }); s.edges.push({ to: h }); }
        }
    }
    // Leap off a stance and latch onto a wall mid-air
    for (const s of stands) {
        for (const h of nodeList) {
            if (!h.hold) continue;
            const dx = Math.abs(s.x - h.x);
            const rise = s.y - h.y;
            if (dx > 70 || rise < -10 || rise > 55 || (dx < 2 && rise <= 4)) continue;
            if (clearPath(s, h)) s.edges.push({ to: h });
        }
    }
    // Wall jump away from a hold
    for (const h of nodeList) {
        if (!h.hold) continue;
        const dir = -h.hold;
        for (const s of stands) {
            const dx = (s.x - h.x) * dir;
            const rise = h.y - s.y;
            if (dx <= 4 || dx > 95) continue;
            if (rise > 58 || rise < -110) continue;
            if (clearJumpArc(h, dir, 'wall') || clearPath(h, s)) h.edges.push({ to: s });
        }
    }
    // Climb over a lip: launch a normal jump straight out of a hold
    for (const h of nodeList) {
        if (!h.hold) continue;
        for (const s of stands) {
            const dx = Math.abs(h.x - s.x);
            const rise = h.y - s.y;
            if (dx < 4 || dx > 100 || rise > 44 || rise < -110) continue;
            if (tryArc(h, s)) h.edges.push({ to: s });
        }
    }
    // Mantle: climb to the lip of the hugged face and pop onto its top
    for (const h of nodeList) {
        if (!h.hold) continue;
        for (const s of standable) {
            const face = h.hold === -1 ? s.x + s.w : s.x;
            const hugX = h.hold === -1 ? s.x + s.w : s.x - PW;
            if (Math.abs(hugX - h.x) > 1) continue;
            if (h.y < s.y - 14 || h.y > s.y + s.h) continue;
            const topY = s.y - PH;
            for (const st of stands) {
                if (st.y !== topY) continue;
                const fromFace = h.hold === -1 ? face - st.x : st.x - face;
                if (fromFace < -2 || fromFace > 18) continue;
                if (Math.abs(st.y - h.y) <= 14 && clearPath(h, st)) { h.edges.push({ to: st }); st.edges.push({ to: h }); }
            }
        }
    }

    // Springs launch arcs
    for (const sp of springs) {
        const sources = nodeList.filter(n => overlap(box(n.x, n.y, PW, PH), box(sp.x - 2, sp.y - 6, sp.w + 4, sp.h + 6)));
        const rise = SPRING_RISE[sp.power] || SPRING_RISE[1];
        for (const src of sources) {
            for (const m of nodeList) {
                const dx = Math.abs(src.x - m.x);
                const r = src.y - m.y;
                if ((r > 0 && r <= rise && dx <= 70) || (r <= 0 && dx <= 90)) {
                    if (clearPath({ x: src.x, y: src.y }, m)) src.edges.push({ to: m, dash: false, via: `spring${sp.power}` });
                }
            }
        }
    }

    // Bubbles: enter -> boosted exit
    for (const bub of bubbles) {
        const centers = [{ x: bub.x + bub.r / 2, y: bub.y + bub.r / 2 }];
        const entries = nodeList.filter(n => Math.hypot(n.x + PW / 2 - centers[0].x, n.y + PH / 2 - centers[0].y) <= bub.r + 8);
        const exits = nodeList.filter(m => {
            const dx = Math.abs(m.x + PW / 2 - centers[0].x);
            const dy = centers[0].y - (m.y + PH / 2);
            return dx <= 95 && dy <= BUBBLE_RISE + 20 && dy >= -140;
        });
        for (const e of entries) for (const x of exits) {
            if (clearPath(e, x, { ignoreBubbles: true })) e.edges.push({ to: x, dash: true, via: 'bubble' });
        }
    }

    // --- Targets ---
    const reachable = new Set();
    const spawn = room.spawn;
    const startNode = stands.reduce((best, n) => {
        const d = Math.hypot(n.x - spawn.x, n.y - spawn.y);
        return !best || d < best.d ? { n, d } : best;
    }, null);
    if (!startNode || startNode.d > 12) {
        note(roomId, `spawn (${spawn.x},${spawn.y}) has no standable position nearby${startNode ? ` (nearest ${startNode.d.toFixed(0)}px)` : ''}`);
    } else {
        const q = [startNode.n];
        reachable.add(key(startNode.n.x, startNode.n.y));
        while (q.length) {
            const cur = q.shift();
            for (const e of cur.edges) {
                const m = e.to;
                const k = key(m.x, m.y, m.hold);
                if (!reachable.has(k)) { reachable.add(k); q.push(m); }
            }
        }
    }

    const targets = [];
    for (const f of room.flags) targets.push({ kind: 'exit', rect: box(f.x, f.y, f.w, f.h), label: `-> ${f.targetRoom}` });
    for (const b of room.strawberries) targets.push({ kind: 'strawberry', rect: box(b.x - 2, b.y - 2, 12, 12), label: b.id + (b.golden ? ' (golden)' : '') });
    if (room.cassette) targets.push({ kind: 'cassette', rect: box(room.cassette.x, room.cassette.y, 16, 10), label: room.cassette.id });
    if (room.heartGem) targets.push({ kind: 'heart', rect: box(room.heartGem.x, room.heartGem.y, 16, 16), label: 'heart gem' });
    if (room.feather) targets.push({ kind: 'feather', rect: box(room.feather.x, room.feather.y, 16, 16), label: 'feather' });
    for (const ds of room.dashSwitches || []) {
        targets.push({ kind: 'switch', rect: box(ds.x, ds.y, ds.w, ds.h), label: `dash switch @ (${ds.x},${ds.y})` });
    }

    const arcTouches = (n, rect) => {
        for (const dir of [-1, 1]) {
            const vy = 280, g = 900, vx = 90 * dir;
            for (let t = 0.04; t <= 0.65; t += 0.03) {
                const x = n.x + vx * t;
                const y = n.y - (vy * t - g * t * t / 2);
                if (x < 0 || x + PW > room.width) break;
                if (overlap(box(x, y, PW, PH), rect)) return true;
            }
        }
        return false;
    };

    for (const t of targets) {
        let hit = stands.some(n => reachable.has(key(n.x, n.y)) && overlap(box(n.x, n.y, PW, PH), t.rect));
        if (!hit && t.kind !== 'exit') {
            hit = stands.some(n => {
                if (!reachable.has(key(n.x, n.y))) return false;
                const rise = n.y - (t.rect.y + t.rect.h);
                const dx = Math.abs(n.x + PW / 2 - (t.rect.x + t.rect.w / 2));
                if (dx > 80 || rise < -20 || rise > 60) return false;
                return arcTouches(n, t.rect);
            });
        }
        if (!hit && process.env.DBG === roomId) {
            const cands = stands.filter(n => overlap(box(n.x, n.y, PW, PH), t.rect));
            console.error(`DBG ${roomId} ${t.label}: ${cands.length} overlapping stands, ` +
                cands.slice(0, 6).map(c => `(${c.x},${c.y})${reachable.has(key(c.x, c.y)) ? 'R' : 'U'}`).join(' ') +
                ` | reachable=${reachable.size}/${nodes.size}`);
            // what's reachable nearby?
            const nearR = [...reachable].map(k => nodes.get(k)).filter(n => n.hold === 0 && n.y < 60)
                .sort((a, b) => a.y - b.y).slice(0, 10);
            console.error('DBG topmost reachable stands:', nearR.map(n => `(${n.x},${n.y})`).join(' '));
            const allStands = stands.map(n => `${n.x},${n.y}${reachable.has(key(n.x, n.y)) ? 'R' : 'u'}`);
            console.error('DBG stands:', allStands.join(' '));
            const qA = process.env.DBG_EDGE;
            if (qA) {
                const [ax, ay, bx, by] = qA.split(',').map(Number);
                const A = stands.find(n => n.x === ax && n.y === ay);
                const B = stands.find(n => n.x === bx && n.y === by);
                console.error(`DBG edge (${ax},${ay})->(${bx},${by}):`, A && B ? A.edges.some(e => e.to === B) : `node missing (A=${!!A}, B=${!!B})`);
                for (const yy of new Set([ay, by])) {
                    const row = stands.filter(n => n.y === yy).map(n => n.x);
                    console.error(`DBG stands at y=${yy}:`, row.join(' ') || '(none)');
                }
                const reachSorted = [...reachable].map(k => nodes.get(k)).filter(n => !n.hold)
                    .sort((a, b) => a.y - b.y || a.x - b.x).slice(0, 24);
                console.error('DBG first reachable stands:', reachSorted.map(n => `(${n.x},${n.y})`).join(' '));
            }
        }
        if (!hit) note(roomId, `${t.kind.toUpperCase()} unreachable: ${t.label} @ (${t.rect.x},${t.rect.y})`);
        if (collide(t.rect) && t.kind !== 'exit') note(roomId, `${t.kind} embedded in solid: ${t.label}`);
        if (spikeAt(t.rect)) note(roomId, `${t.kind} overlapping spikes: ${t.label}`);
    }

    // Spawn safety
    if (collide(box(spawn.x, spawn.y, PW, PH))) note(roomId, `spawn intersects solid`);
    if (spikeAt(box(spawn.x, spawn.y, PW, PH))) note(roomId, `spawn intersects spikes`);

    // Dash switch / gate block integrity
    for (const ds of room.dashSwitches || []) {
        if (collide(box(ds.x, ds.y, ds.w, ds.h))) note(roomId, `dash switch @ (${ds.x},${ds.y}) embedded in solid`);
        if (spikeAt(box(ds.x, ds.y, ds.w, ds.h))) note(roomId, `dash switch @ (${ds.x},${ds.y}) overlaps spikes`);
        if (!ds.targets.length) note(roomId, `dash switch @ (${ds.x},${ds.y}) has no gate targets`);
        for (const t of ds.targets) {
            if (!gateRects.some(g => g.x === t.x && g.y === t.y)) {
                note(roomId, `dash switch @ (${ds.x},${ds.y}) target (${t.x},${t.y}) matches no gate block`);
            }
        }
    }
    if (gateRects.length && !(room.dashSwitches || []).length) {
        note(roomId, 'room has gate blocks but no dash switches to raise them');
    }
    for (const g of gateRects) {
        const gLabel = `gate block (${g.x},${g.y})`;
        if (spikeAt(g)) note(roomId, `${gLabel} active state overlaps spikes`);
        if (overlap(g, box(room.spawn.x - 2, room.spawn.y - 2, 10, 14))) note(roomId, `${gLabel} active state overlaps spawn`);
        for (const f of room.flags) if (overlap(g, f)) note(roomId, `${gLabel} active state overlaps exit flag -> ${f.targetRoom}`);
        for (const b of room.strawberries) if (overlap(g, box(b.x - 2, b.y - 2, 12, 12))) note(roomId, `${gLabel} active state overlaps berry ${b.id}`);
        if (room.cassette && overlap(g, box(room.cassette.x, room.cassette.y, 16, 10))) note(roomId, `${gLabel} active state overlaps cassette`);
        if (room.heartGem && overlap(g, box(room.heartGem.x, room.heartGem.y, 16, 16))) note(roomId, `${gLabel} active state overlaps heart gem`);
        if (room.feather && overlap(g, box(room.feather.x, room.feather.y, 16, 16))) note(roomId, `${gLabel} active state overlaps feather`);
        for (const ds of room.dashSwitches || []) {
            if (overlap(g, box(ds.x, ds.y, ds.w, ds.h))) note(roomId, `${gLabel} active state buries its dash switch`);
        }
    }
}

for (const id of Object.keys(rooms).sort()) analyze(id);

// Cross-room integrity
for (const id of Object.keys(rooms)) {
    for (const f of rooms[id].flags) {
        if (!rooms[f.targetRoom]) note(id, `flag targets missing room '${f.targetRoom}'`);
    }
}
if (Array.isArray(chapterList)) {
    for (const ch of chapterList) {
        for (const rid of ch.rooms || []) if (!rooms[rid]) note('chapterList', `chapter '${ch.id}' references missing room '${rid}'`);
    }
}

// Hazard/entity overlap integrity (spikes must never sit on springs, spawns,
// pickups or exits; movers must not park inside spikes; bubbles must be free).
{
    const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const box = (x, y, w = 8, h = 8) => ({ x, y, w, h });
    for (const [id, r] of Object.entries(rooms)) {
    for (const s of [...r.spikes, ...(r.triggerSpikes || [])]) {
        for (const sp of r.springs) if (hits(box(s.x, s.y), box(sp.x, sp.y, sp.w, sp.h))) note(id, `spike (${s.x},${s.y}) overlaps spring (${sp.x},${sp.y})`);
        if (hits(box(s.x, s.y), box(r.spawn.x - 2, r.spawn.y - 2, 10, 14))) note(id, `spike (${s.x},${s.y}) overlaps spawn`);
        for (const f of r.flags) if (hits(box(s.x, s.y), f)) note(id, `spike (${s.x},${s.y}) overlaps exit flag -> ${f.targetRoom}`);
        for (const b of r.strawberries) if (hits(box(s.x, s.y), box(b.x, b.y))) note(id, `spike (${s.x},${s.y}) overlaps strawberry ${b.id}`);
        if (r.cassette && hits(box(s.x, s.y), box(r.cassette.x, r.cassette.y, 16, 10))) note(id, `spike (${s.x},${s.y}) overlaps cassette`);
        if (r.heartGem && hits(box(s.x, s.y), box(r.heartGem.x, r.heartGem.y, 16, 16))) note(id, `spike (${s.x},${s.y}) overlaps heart gem`);
        if (r.feather && hits(box(s.x, s.y), box(r.feather.x, r.feather.y, 16, 16))) note(id, `spike (${s.x},${s.y}) overlaps feather`);
    }
        for (const mp of r.movingPlatforms) {
            for (const s of r.spikes) {
                if (hits(box(mp.startX, mp.startY, mp.w, mp.h), box(s.x, s.y)) ||
                    hits(box(mp.endX, mp.endY, mp.w, mp.h), box(s.x, s.y))) {
                    note(id, `mover endpoint (${mp.startX},${mp.startY})->(${mp.endX},${mp.endY}) overlaps spike (${s.x},${s.y})`);
                }
            }
        }
        for (const bub of r.bubbles) {
            const b = box(bub.x - bub.r / 2, bub.y - bub.r / 2, bub.r, bub.r);
            if (r.solids.some(sol => sol.type !== 'berry-perch' && hits(b, sol))) note(id, `bubble (${bub.x},${bub.y}) intersects solid tile`);
        }
    }
}

console.log(issues.length ? issues.join('\n') : 'ALL CHECKS PASSED');
console.log(`\n(${Object.keys(rooms).length} rooms analyzed, ${issues.length} issues)`);
process.exit(issues.length ? 1 : 0);
