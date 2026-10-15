const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
window.__NQ_TOWERS_BUILD__ = '2026-10-15';
console.log('[nq-towers] build', window.__NQ_TOWERS_BUILD__);
const moneySpan = document.getElementById('money');
const livesSpan = document.getElementById('lives');
const towerMenu = document.getElementById('towerMenu');
let selectedTowerType = 'basic';
const waveSpan = document.getElementById('wave');
const upgradeInfo = document.getElementById('upgradeInfo');
const pauseBtn = document.getElementById('pauseBtn');

const TILE_SIZE = 40;
const MAP_COLS = 15;
const MAP_ROWS = 10;
// Logical canvas size. The backing store is scaled for HiDPI screens, so
// everything that used canvas.width/height for game coordinates uses these.
const W = MAP_COLS * TILE_SIZE;
const H = MAP_ROWS * TILE_SIZE;

let money = 100;
let lives = 10;
let towers = [];
let enemies = [];
let bullets = [];
let particles = [];
let wave = 0;
let placingTower = false;
let paused = false;
let running = false;
let hoverTile = null;
let waveBanner = null;
let frame = 0;

const path = [
    {x: 0, y: 4}, {x: 5, y: 4}, {x: 5, y: 8}, {x: 12, y: 8}, {x: 12, y: 2}, {x: 14, y: 2}
];

// Every tile the road crosses, not just the waypoints, so towers cannot be
// dropped on the road between corners.
const pathTiles = new Set();
for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    for (let s = 0; s <= steps; s++) {
        const x = a.x + Math.sign(b.x - a.x) * s;
        const y = a.y + Math.sign(b.y - a.y) * s;
        pathTiles.add(x + ',' + y);
    }
}
const isPathTile = (x, y) => pathTiles.has(x + ',' + y);

// Visual identity per tower type. Colours match the menu buttons.
const TOWER_STYLE = {
    basic:  { color: '#1ab3ff', dark: '#0b6fa3', light: '#9fe3ff', cost: 50 },
    fast:   { color: '#00b386', dark: '#006b50', light: '#7ff0cf', cost: 60 },
    strong: { color: '#f0a500', dark: '#9a6400', light: '#ffd980', cost: 80 },
    splash: { color: '#56b4e9', dark: '#2a6f98', light: '#bfe6ff', cost: 100 },
};
const ENEMY_STYLE = {
    normal:  { color: '#ff4d4d', dark: '#8f1c1c', r: 12 },
    fast:    { color: '#2ef2ff', dark: '#0c7f8a', r: 11 },
    armored: { color: '#9aa3ad', dark: '#4a525b', r: 13 },
    boss:    { color: '#ffd400', dark: '#8a6c00', r: 19 },
};

const cx = t => t.x * TILE_SIZE + TILE_SIZE / 2;
const cy = t => t.y * TILE_SIZE + TILE_SIZE / 2;

// ---------------------------------------------------------------------------
// Canvas setup and static background
// ---------------------------------------------------------------------------

let dpr = 1;
let bg = null;

function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    // CSS caps the width on small screens; height follows the intrinsic ratio.
    canvas.style.width = W + 'px';
    canvas.style.height = 'auto';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bg = buildBackground();
}

// Deterministic pseudo-random so the grass pattern is stable between builds.
function seeded(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
}

function buildBackground() {
    const off = document.createElement('canvas');
    off.width = W * dpr;
    off.height = H * dpr;
    const c = off.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rnd = seeded(20251227);

    // Grass: two-tone checker with subtle per-tile variation.
    for (let x = 0; x < MAP_COLS; x++) {
        for (let y = 0; y < MAP_ROWS; y++) {
            const even = (x + y) % 2 === 0;
            const v = (rnd() - 0.5) * 8;
            const g = (even ? 118 : 108) + v;
            c.fillStyle = `rgb(${Math.round(58 + v)}, ${Math.round(g)}, ${Math.round(52 + v)})`;
            c.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    // Grass blades and flowers.
    for (let i = 0; i < 520; i++) {
        const x = rnd() * W, y = rnd() * H;
        const tx = Math.floor(x / TILE_SIZE), ty = Math.floor(y / TILE_SIZE);
        if (isPathTile(tx, ty)) continue;
        if (rnd() < 0.06) {
            c.fillStyle = rnd() < 0.5 ? '#f3e37a' : '#f2a7c4';
            c.beginPath(); c.arc(x, y, 1.6, 0, Math.PI * 2); c.fill();
        } else {
            c.strokeStyle = rnd() < 0.5 ? 'rgba(170,220,120,0.55)' : 'rgba(40,80,35,0.5)';
            c.lineWidth = 1.2;
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x + (rnd() - 0.5) * 3, y - 3 - rnd() * 4);
            c.stroke();
        }
    }
    // Subtle grid for placement.
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth = 1;
    for (let i = 0; i <= MAP_COLS; i++) { c.beginPath(); c.moveTo(i * TILE_SIZE, 0); c.lineTo(i * TILE_SIZE, H); c.stroke(); }
    for (let j = 0; j <= MAP_ROWS; j++) { c.beginPath(); c.moveTo(0, j * TILE_SIZE); c.lineTo(W, j * TILE_SIZE); c.stroke(); }

    // Road: extended past the canvas edges so it runs off-screen at both ends.
    const pts = path.map(p => ({ x: cx(p), y: cy(p) }));
    pts[0] = { x: pts[0].x - TILE_SIZE, y: pts[0].y };
    pts[pts.length - 1] = { x: pts[pts.length - 1].x + TILE_SIZE, y: pts[pts.length - 1].y };
    const roadPath = () => {
        c.beginPath();
        c.moveTo(pts[0].x, pts[0].y);
        for (const p of pts) c.lineTo(p.x, p.y);
    };
    c.lineJoin = 'round';
    c.lineCap = 'butt';
    // Road shadow / verge
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = TILE_SIZE - 2;
    roadPath(); c.stroke();
    // Edge
    c.strokeStyle = '#5a3b1e';
    c.lineWidth = TILE_SIZE - 6;
    roadPath(); c.stroke();
    // Surface
    c.strokeStyle = '#9b6b3a';
    c.lineWidth = TILE_SIZE - 14;
    roadPath(); c.stroke();
    // Worn centre
    c.strokeStyle = 'rgba(255,230,180,0.18)';
    c.lineWidth = 6;
    roadPath(); c.stroke();
    // Pebbles
    for (let i = 0; i < 160; i++) {
        const x = rnd() * W, y = rnd() * H;
        const tx = Math.floor(x / TILE_SIZE), ty = Math.floor(y / TILE_SIZE);
        if (!isPathTile(tx, ty)) continue;
        c.fillStyle = rnd() < 0.5 ? 'rgba(60,35,15,0.45)' : 'rgba(220,190,150,0.35)';
        c.beginPath(); c.arc(x, y, 1 + rnd() * 1.6, 0, Math.PI * 2); c.fill();
    }

    // Spawn portal at the start of the road.
    const sx = cx(path[0]) - 4, sy = cy(path[0]);
    const pg = c.createRadialGradient(sx, sy, 2, sx, sy, 18);
    pg.addColorStop(0, '#d9b3ff');
    pg.addColorStop(0.6, '#7a2cff');
    pg.addColorStop(1, 'rgba(60,0,120,0)');
    c.fillStyle = pg;
    c.beginPath(); c.ellipse(sx, sy, 12, 17, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3a1a6e';
    c.lineWidth = 3;
    c.beginPath(); c.ellipse(sx, sy, 12, 17, 0, 0, Math.PI * 2); c.stroke();

    // Base to defend at the end of the road.
    const end = path[path.length - 1];
    const bx = cx(end), by = cy(end);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); c.ellipse(bx + 2, by + 14, 16, 5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c9c2b4';
    roundRect(c, bx - 13, by - 10, 26, 22, 3); c.fill();
    c.fillStyle = '#8d867a';
    c.fillRect(bx - 13, by - 10, 26, 4);
    for (let i = 0; i < 4; i++) { c.fillStyle = '#c9c2b4'; c.fillRect(bx - 13 + i * 7, by - 15, 4, 6); }
    c.fillStyle = '#4b3a2a';
    roundRect(c, bx - 4, by, 8, 12, 3); c.fill();
    c.fillStyle = '#e63946';
    c.beginPath(); c.moveTo(bx, by - 15); c.lineTo(bx, by - 26); c.lineTo(bx + 9, by - 23); c.closePath(); c.fill();
    c.strokeStyle = '#333'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(bx, by - 15); c.lineTo(bx, by - 27); c.stroke();

    // Vignette
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);
    return off;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function drawTower(t, ghost) {
    const st = TOWER_STYLE[t.type] || TOWER_STYLE.basic;
    const x = cx(t), y = cy(t);
    const angle = t.angle ?? -Math.PI / 2;
    const recoil = (t.recoil || 0) * 4;

    ctx.save();
    if (ghost) ctx.globalAlpha = 0.55;

    // Stone platform
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x + 1, y + 3, 17, 15, 0, 0, Math.PI * 2); ctx.fill();
    const plat = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 17);
    plat.addColorStop(0, '#7d8794');
    plat.addColorStop(1, '#3b434d');
    ctx.fillStyle = plat;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222a33';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Turret, rotated toward the last target
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = st.color;
    ctx.shadowBlur = ghost ? 0 : 10;

    if (t.type === 'fast') {
        ctx.fillStyle = st.dark;
        ctx.fillRect(2 - recoil, -8, 16, 4);
        ctx.fillRect(2 - recoil, 4, 16, 4);
        ctx.fillStyle = st.color;
        roundRect(ctx, -9, -9, 18, 18, 5); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = st.light;
        roundRect(ctx, -5, -5, 8, 8, 2); ctx.fill();
    } else if (t.type === 'strong') {
        ctx.fillStyle = st.dark;
        roundRect(ctx, 0 - recoil, -5, 20, 10, 3); ctx.fill();
        ctx.fillStyle = st.color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3;
            ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
        }
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = st.light;
        ctx.beginPath(); ctx.arc(-2, 0, 4, 0, Math.PI * 2); ctx.fill();
    } else if (t.type === 'splash') {
        ctx.fillStyle = st.color;
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = st.dark;
        ctx.beginPath(); ctx.ellipse(6 - recoil, 0, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#17364a';
        ctx.beginPath(); ctx.ellipse(10 - recoil, 0, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.fillStyle = st.dark;
        roundRect(ctx, 0 - recoil, -3.5, 19, 7, 2); ctx.fill();
        ctx.fillStyle = st.color;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = st.light;
        ctx.beginPath(); ctx.arc(-2, -2, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Level pips along the bottom edge of the platform
    if (!ghost) {
        ctx.save();
        for (let i = 0; i < t.level; i++) {
            const px = x - (t.level - 1) * 3.5 + i * 7;
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = '#5a4400';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(px, y + 20, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
    }
}

function drawEnemy(e) {
    const st = ENEMY_STYLE[e.type] || ENEMY_STYLE.normal;
    const r = st.r;
    const angle = e.angle ?? 0;
    const bob = Math.sin((frame + (e.seed || 0)) * 0.25) * 1.2;

    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.9, r * 0.9, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();

    ctx.translate(e.x, e.y + bob);
    ctx.rotate(angle);
    ctx.lineWidth = 2;
    ctx.strokeStyle = st.dark;

    if (e.type === 'fast') {
        ctx.fillStyle = st.color;
        ctx.beginPath();
        ctx.moveTo(r + 3, 0);
        ctx.lineTo(-r * 0.8, -r * 0.75);
        ctx.lineTo(-r * 0.4, 0);
        ctx.lineTo(-r * 0.8, r * 0.75);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(r * 0.2, 0, 2.2, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'armored') {
        ctx.fillStyle = st.color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3 + Math.PI / 6;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.35); ctx.lineTo(r * 0.6, -r * 0.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.35); ctx.lineTo(r * 0.6, r * 0.35); ctx.stroke();
        ctx.fillStyle = '#e3e8ee';
        for (const [px, py] of [[-5, -7], [5, -7], [-5, 7], [5, 7]]) {
            ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#ff5555';
        ctx.beginPath(); ctx.arc(r * 0.45, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'boss') {
        ctx.fillStyle = st.dark;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = i * Math.PI / 5 + frame * 0.02;
            ctx.lineTo(Math.cos(a) * (r + 7), Math.sin(a) * (r + 7));
            ctx.lineTo(Math.cos(a + Math.PI / 10) * r, Math.sin(a + Math.PI / 10) * r);
        }
        ctx.closePath(); ctx.fill();
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
        g.addColorStop(0, '#fff2a8');
        g.addColorStop(1, st.color);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#c1121f';
        ctx.beginPath(); ctx.arc(r * 0.45, -5, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.45, 5, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#5a0b0b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(r * 0.3, 0, 7, -Math.PI * 0.35, Math.PI * 0.35); ctx.stroke();
    } else {
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
        g.addColorStop(0, '#ff9a9a');
        g.addColorStop(1, st.color);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(r * 0.45, -4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.45, 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(r * 0.55, -4, 1.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.55, 4, 1.4, 0, Math.PI * 2); ctx.fill();
    }

    // Hit flash tint
    if (e._hitFlash && e._hitFlash > 0) {
        ctx.globalAlpha = 0.25 * e._hitFlash;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        e._hitFlash--;
    }
    ctx.restore();

    // Health bar, only once damaged
    if (e.hp < e.maxHp) {
        const w = Math.max(24, r * 2.2), h = 4;
        const bx = e.x - w / 2, by = e.y - r - 11 + bob;
        const pct = Math.max(0, e.hp / e.maxHp);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        roundRect(ctx, bx - 1, by - 1, w + 2, h + 2, 2); ctx.fill();
        const hue = Math.round(pct * 110);
        ctx.fillStyle = `hsl(${hue}, 85%, 50%)`;
        roundRect(ctx, bx, by, w * pct, h, 1.5); ctx.fill();
        ctx.restore();
    }
}

function drawBullet(b) {
    const st = TOWER_STYLE[b.type] || TOWER_STYLE.basic;
    const color = b.type === 'basic' ? '#ffffff' : st.light;
    const len = b.type === 'fast' ? 3 : 2.2;
    ctx.save();
    // Trail
    const tg = ctx.createLinearGradient(b.x - b.dx * len, b.y - b.dy * len, b.x, b.y);
    tg.addColorStop(0, 'rgba(255,255,255,0)');
    tg.addColorStop(1, color);
    ctx.strokeStyle = tg;
    ctx.lineWidth = b.type === 'strong' ? 4 : b.type === 'splash' ? 5 : 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x - b.dx * len, b.y - b.dy * len);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    // Core
    ctx.shadowColor = st.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    const r = b.type === 'splash' ? 5.5 : b.type === 'strong' ? 4.5 : 3;
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawParticles() {
    for (const p of particles) {
        const k = p.life / p.maxLife;
        ctx.save();
        if (p.kind === 'ring') {
            ctx.globalAlpha = k * 0.8;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3 * k + 1;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (1 - k) * p.grow, 0, Math.PI * 2); ctx.stroke();
        } else if (p.kind === 'text') {
            ctx.globalAlpha = Math.min(1, k * 1.5);
            ctx.font = 'bold 13px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(0,0,0,0.7)';
            ctx.strokeText(p.text, p.x, p.y);
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, p.x, p.y);
        } else {
            ctx.globalAlpha = k;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

function drawPlacementGhost() {
    if (!placingTower || !hoverTile) return;
    const { x, y } = hoverTile;
    if (x < 0 || y < 0 || x >= MAP_COLS || y >= MAP_ROWS) return;
    const st = TOWER_STYLE[selectedTowerType];
    const blocked = isPathTile(x, y) || towers.some(t => t.x === x && t.y === y);
    const affordable = money >= st.cost;
    const px = x * TILE_SIZE, py = y * TILE_SIZE;
    ctx.save();
    ctx.fillStyle = blocked || !affordable ? 'rgba(255,60,60,0.28)' : 'rgba(255,255,255,0.16)';
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    if (!blocked) {
        const range = 120 + 10;
        ctx.strokeStyle = affordable ? 'rgba(255,255,255,0.55)' : 'rgba(255,80,80,0.6)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, range, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = affordable ? 'rgba(255,255,255,0.06)' : 'rgba(255,60,60,0.08)';
        ctx.fill();
        drawTower({ x, y, type: selectedTowerType, level: 1 }, true);
    } else {
        ctx.strokeStyle = 'rgba(255,80,80,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px + 12, py + 12); ctx.lineTo(px + TILE_SIZE - 12, py + TILE_SIZE - 12);
        ctx.moveTo(px + TILE_SIZE - 12, py + 12); ctx.lineTo(px + 12, py + TILE_SIZE - 12);
        ctx.stroke();
    }
    ctx.restore();
}

function drawWaveBanner() {
    if (!waveBanner) return;
    const k = waveBanner.t / waveBanner.max;
    const alpha = k > 0.8 ? (1 - k) / 0.2 : k < 0.15 ? k / 0.15 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(waveBanner.text, W / 2, 70);
    ctx.fillStyle = waveBanner.color;
    ctx.fillText(waveBanner.text, W / 2, 70);
    if (waveBanner.sub) {
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.lineWidth = 4;
        ctx.strokeText(waveBanner.sub, W / 2, 92);
        ctx.fillStyle = '#fff';
        ctx.fillText(waveBanner.sub, W / 2, 92);
    }
    ctx.restore();
    waveBanner.t--;
    if (waveBanner.t <= 0) waveBanner = null;
}

function drawMap() {
    ctx.clearRect(0, 0, W, H);
    if (bg) ctx.drawImage(bg, 0, 0, W, H);
    for (const t of towers) drawTower(t, false);
    drawPlacementGhost();
    // Draw enemies back-to-front so the ones lower on screen overlap.
    const sorted = enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of sorted) drawEnemy(e);
    for (const b of bullets) drawBullet(b);
    drawParticles();
    drawWaveBanner();
}

function drawGameOver() {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText('Game Over', W / 2, H / 2 - 6);
    ctx.fillStyle = '#ff5c5c';
    ctx.fillText('Game Over', W / 2, H / 2 - 6);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#eee';
    ctx.fillText(`You reached wave ${wave}. Restarting…`, W / 2, H / 2 + 26);
    ctx.restore();
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = (0.5 + Math.random()) * speed;
        particles.push({ x, y, dx: Math.cos(a) * v, dy: Math.sin(a) * v - 0.5, life: 22 + Math.random() * 14, maxLife: 36, color, size: 2 + Math.random() * 2.5 });
    }
}

function ring(x, y, r, grow, color) {
    particles.push({ kind: 'ring', x, y, r, grow, life: 18, maxLife: 18, color });
}

function floatText(x, y, text, color) {
    particles.push({ kind: 'text', x, y, dx: 0, dy: -0.7, life: 40, maxLife: 40, text, color });
}

function onEnemyKilled(e) {
    const st = ENEMY_STYLE[e.type] || ENEMY_STYLE.normal;
    burst(e.x, e.y, st.color, e.type === 'boss' ? 28 : 10, e.type === 'boss' ? 3.2 : 2.2);
    burst(e.x, e.y, '#fff', 4, 1.6);
    if (e.type === 'boss') ring(e.x, e.y, 10, 60, '#ffd400');
    floatText(e.x, e.y - 14, '+' + (e.reward || 10), '#ffe066');
}

function updateParticles() {
    for (const p of particles) {
        if (p.kind === 'ring') { p.life--; continue; }
        p.x += p.dx; p.y += p.dy;
        if (p.kind !== 'text') { p.dy += 0.08; p.dx *= 0.96; }
        p.life--;
    }
    particles = particles.filter(p => p.life > 0);
}

// ---------------------------------------------------------------------------
// Game logic (unchanged rules; visual state like angle/recoil added)
// ---------------------------------------------------------------------------

function spawnEnemy(type) {
    const start = path[0];
    let hp = 3 + wave, speed = 1.2, reward = 10, maxHp = hp;
    if (type === 'fast') { speed = 2.2; hp = 2 + Math.floor(wave/2); maxHp = hp; reward = 12; }
    else if (type === 'armored') { hp = 8 + wave*2; maxHp = hp; reward = 20; }
    else if (type === 'boss') { hp = 30 + wave*5; maxHp = hp; speed = 0.8; reward = 100; }
    enemies.push({
        x: start.x * TILE_SIZE + TILE_SIZE/2,
        y: start.y * TILE_SIZE + TILE_SIZE/2,
        pathIndex: 0,
        hp,
        maxHp,
        speed,
        reward,
        type: type || 'normal',
        angle: 0,
        seed: Math.random() * 100
    });
    ring(start.x * TILE_SIZE + TILE_SIZE/2 - 4, start.y * TILE_SIZE + TILE_SIZE/2, 6, 18, '#c58cff');
}

function updateEnemies() {
    for (let e of enemies) {
        const target = path[e.pathIndex+1];
        if (!target) continue;
        const tx = target.x * TILE_SIZE + TILE_SIZE/2;
        const ty = target.y * TILE_SIZE + TILE_SIZE/2;
        const dx = tx - e.x;
        const dy = ty - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const speed = e.speed || 1.2;
        // Smoothly turn toward the direction of travel.
        const want = Math.atan2(dy, dx);
        let diff = want - (e.angle ?? want);
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        e.angle = (e.angle ?? want) + diff * 0.25;
        if (dist < speed) {
            e.x = tx; e.y = ty;
            e.pathIndex++;
            if (e.pathIndex === path.length-1) {
                lives--;
                e.hp = 0;
                burst(e.x, e.y, '#ff3b3b', 12, 2.5);
                floatText(e.x - 10, e.y - 20, '-1 life', '#ff6b6b');
            }
        } else {
            e.x += dx/dist * speed;
            e.y += dy/dist * speed;
        }
    }
    enemies = enemies.filter(e => e.hp > 0);
}

function updateTowers() {
    for (let t of towers) {
        t.cooldown--;
        if (t.recoil) t.recoil = Math.max(0, t.recoil - 0.15);
        const tx = t.x * TILE_SIZE + TILE_SIZE/2;
        const ty = t.y * TILE_SIZE + TILE_SIZE/2;
        let range = 120 + t.level*10;
        // Keep tracking the current target between shots.
        if (t.target && t.target.hp > 0) {
            const dx = t.target.x - tx, dy = t.target.y - ty;
            if (dx*dx + dy*dy < range*range) t.angle = Math.atan2(dy, dx);
            else t.target = null;
        } else {
            t.target = null;
        }
        if (t.cooldown <= 0) {
            // Find enemy in range
            for (let e of enemies) {
                const dx = tx - e.x;
                const dy = ty - e.y;
                if (dx*dx + dy*dy < range*range) {
                    let bulletType = t.type;
                    let speed = 15 - t.level*2;
                    if (speed < 6) speed = 6;
                    let damage = 1 + (t.type === 'strong' ? 2 : 0) + t.level;
                    if (t.type === 'splash') damage = 1 + t.level;
                    t.angle = Math.atan2(e.y - ty, e.x - tx);
                    t.target = e;
                    t.recoil = 1;
                    bullets.push({
                        x: tx,
                        y: ty,
                        dx: (e.x - tx)/speed,
                        dy: (e.y - ty)/speed,
                        target: e,
                        type: bulletType,
                        damage,
                        splash: t.type === 'splash',
                        splashRadius: t.type === 'splash' ? 40 + t.level*10 : 0
                    });
                    t.cooldown = t.type === 'fast' ? 10 : t.type === 'strong' ? 40 : t.type === 'splash' ? 50 : 30;
                    break;
                }
            }
        }
    }
}

function updateBullets() {
    for (let b of bullets) {
        b.x += b.dx;
        b.y += b.dy;
        // Hit detection
        if (b.target && Math.abs(b.x - b.target.x) < 12 && Math.abs(b.y - b.target.y) < 12) {
            let playedDeath = false;
            if (b.splash) {
                ring(b.x, b.y, 8, b.splashRadius, TOWER_STYLE.splash.light);
                burst(b.x, b.y, TOWER_STYLE.splash.light, 8, 2);
                // Splash damage
                for (let e of enemies) {
                    const dx = b.x - e.x, dy = b.y - e.y;
                    if (dx*dx + dy*dy < b.splashRadius*b.splashRadius) {
                        const wasAlive = e.hp > 0;
                        e.hp -= b.damage;
                        e._hitFlash = 3;
                        if (e.hp <= 0 && wasAlive) {
                            onEnemyKilled(e);
                            if (!playedDeath) { money += e.reward || 10; playedDeath = true; }
                        }
                    }
                }
            } else {
                const st = TOWER_STYLE[b.type] || TOWER_STYLE.basic;
                burst(b.x, b.y, st.light, 3, 1.4);
                const wasAlive = b.target.hp > 0;
                b.target.hp -= b.damage;
                b.target._hitFlash = 3;
                if (b.target.hp <= 0 && wasAlive) { money += b.target.reward || 10; onEnemyKilled(b.target); }
            }
            b.hit = true;
        }
    }
    bullets = bullets.filter(b => !b.hit && b.x >= 0 && b.x <= W && b.y >= 0 && b.y <= H);
}

function gameLoop() {
    if (!running || paused) return;
    frame++;
    drawMap();
    updateEnemies();
    updateTowers();
    updateBullets();
    updateParticles();
    moneySpan.textContent = 'Money: ' + money;
    livesSpan.textContent = 'Lives: ' + lives;
    waveSpan.textContent = 'Wave: ' + Math.max(1, wave);
    if (enemies.length === 0) {
        wave++;
        const bossWave = wave > 7;
        waveBanner = {
            text: 'Wave ' + wave,
            sub: bossWave ? 'A boss approaches!' : wave > 4 ? 'Armoured units incoming' : wave > 2 ? 'Fast units incoming' : '',
            color: bossWave ? '#ffd400' : '#ffffff',
            t: 110, max: 110
        };
        // Mix of enemy types
        for (let i = 0; i < 3 + wave; i++) {
            let type = 'normal';
            if (wave > 2 && i % 5 === 0) type = 'fast';
            if (wave > 4 && i % 7 === 0) type = 'armored';
            if (wave > 7 && i === 0) type = 'boss';
            setTimeout(() => spawnEnemy(type), i * 600);
        }
    }
    if (lives > 0) requestAnimationFrame(gameLoop);
    else {
        drawGameOver();
        running = false;
        setTimeout(() => {
            if (!running) startGame();
        }, 1800);
    }
}

function clientPointToTile(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    return {
        x: Math.floor(canvasX / TILE_SIZE),
        y: Math.floor(canvasY / TILE_SIZE),
    };
}

function setMenuSelection(type) {
    towerMenu.querySelectorAll('.tower-btn').forEach(b => b.classList.toggle('selected', b.getAttribute('data-type') === type));
}

function tryPlace(x, y, type) {
    if (x < 0 || y < 0 || x >= MAP_COLS || y >= MAP_ROWS) return false;
    if (isPathTile(x, y) || towers.some(t => t.x === x && t.y === y)) return false;
    const cost = TOWER_STYLE[type]?.cost ?? 50;
    if (money < cost) return false;
    towers.push({x, y, type, cooldown: 0, level: 1, angle: -Math.PI / 2, recoil: 0});
    money -= cost;
    ring(cx({x, y}), cy({x, y}), 10, 20, TOWER_STYLE[type].light);
    burst(cx({x, y}), cy({x, y}), '#cfd8e3', 8, 1.6);
    return true;
}

// Tower menu event listeners: pointer events for best compatibility
document.addEventListener('DOMContentLoaded', () => {
    if (towerMenu) {
        towerMenu.querySelectorAll('.tower-btn').forEach(btn => {
            btn.setAttribute('draggable', 'true');
            // Drag start for drag-and-drop
            btn.addEventListener('dragstart', function(e) {
                selectedTowerType = this.getAttribute('data-type');
                e.dataTransfer.setData('text/plain', selectedTowerType);
                if (this.querySelector('svg')) {
                    e.dataTransfer.setDragImage(this.querySelector('svg'), 16, 16);
                }
            });
            // Use pointerdown for universal click/tap
            btn.addEventListener('pointerdown', function(e) {
                e.preventDefault();
                const type = this.getAttribute('data-type');

                // Tap the currently-selected tower again to exit placement mode.
                if (placingTower && selectedTowerType === type) {
                    placingTower = false;
                    setMenuSelection(null);
                    return;
                }

                setMenuSelection(type);
                selectedTowerType = type;
                placingTower = true;
            });
        });
        // Default select first
        setMenuSelection('basic');
    }

    // Canvas drag-and-drop
    canvas.addEventListener('dragover', function(e) {
        e.preventDefault();
        hoverTile = clientPointToTile(e.clientX, e.clientY);
    });
    canvas.addEventListener('drop', function(e) {
        e.preventDefault();
        const { x, y } = clientPointToTile(e.clientX, e.clientY);
        let type = e.dataTransfer.getData('text/plain') || selectedTowerType;
        if (tryPlace(x, y, type)) drawMap();
    });
});

canvas.addEventListener('pointermove', e => {
    hoverTile = clientPointToTile(e.clientX, e.clientY);
});
canvas.addEventListener('pointerleave', () => { hoverTile = null; });

function tryUpgrade(t) {
    let upgradeCost = 40 + t.level*30;
    if (money >= upgradeCost && t.level < 5) {
        t.level++;
        money -= upgradeCost;
        upgradeInfo.textContent = `Upgraded to Lv${t.level}!`;
        ring(cx(t), cy(t), 12, 24, '#ffd700');
        burst(cx(t), cy(t), '#ffd700', 10, 2);
        floatText(cx(t), cy(t) - 24, 'Lv' + t.level, '#ffd700');
    } else if (t.level >= 5) {
        upgradeInfo.textContent = 'Max level!';
    } else {
        upgradeInfo.textContent = 'Not enough money!';
    }
    setTimeout(()=>upgradeInfo.textContent = 'Click a tower to upgrade', 1200);
}

// Canvas click for placement and upgrade
canvas.addEventListener('click', e => {
    const { x, y } = clientPointToTile(e.clientX, e.clientY);
    // Tapping an existing tower upgrades it, whether or not we are placing.
    for (let t of towers) {
        if (t.x === x && t.y === y) { tryUpgrade(t); return; }
    }
    if (placingTower) tryPlace(x, y, selectedTowerType);
});


function startGame() {
    money = 100;
    lives = 10;
    towers = [];
    enemies = [];
    bullets = [];
    particles = [];
    wave = 0;
    waveBanner = null;
    placingTower = false;
    paused = false;
    running = true;
    if (pauseBtn) pauseBtn.textContent = 'Pause';
    gameLoop();
}
window.addEventListener('DOMContentLoaded', () => {
    setupCanvas();
    startGame();
});
window.addEventListener('resize', () => {
    const next = Math.min(window.devicePixelRatio || 1, 3);
    if (next !== dpr) { setupCanvas(); if (!running || paused) drawMap(); }
});

// Pause/resume logic
if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
        if (!running) return;
        paused = !paused;
        pauseBtn.textContent = paused ? 'Resume' : 'Pause';
        if (!paused) gameLoop();
    });
}
