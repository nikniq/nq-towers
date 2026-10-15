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
const bestSpan = document.getElementById('best');
const waveBtn = document.getElementById('waveBtn');
const speedBtn = document.getElementById('speedBtn');
const restartBtn = document.getElementById('restartBtn');
const towerPanel = document.getElementById('towerPanel');
const tpName = document.getElementById('tpName');
const tpStats = document.getElementById('tpStats');
const upgradeBtn = document.getElementById('upgradeBtn');
const sellBtn = document.getElementById('sellBtn');
const toastEl = document.getElementById('toast');
const scoreSpan = document.getElementById('score');
const scoreForm = document.getElementById('scoreForm');
const nameInput = document.getElementById('nameInput');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const scoreStatus = document.getElementById('scoreStatus');
const boardList = document.getElementById('boardList');
const NAME_KEY = 'nq-towers-name';
let lastSubmittedId = null;
const muteBtn = document.getElementById('muteBtn');
const wavePreview = document.getElementById('wavePreview');
// Audio lives next to the script, so resolve it from the script URL rather
// than the page URL in case the page is ever served from a sub-path.
const ASSET_BASE = new URL('assets/', (document.currentScript && document.currentScript.src) || location.href).href;

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
let selectedTower = null;      // tower whose stats panel is open
let spawnQueue = [];           // {type, at: frame} — frame-based so pause and speed apply
let waveCountdown = 0;         // frames until the next wave auto-starts (0 = none pending)
let waitingForStart = true;    // first wave waits for the player
let gameOver = false;
let speed = 1;
let hurtFlash = 0;
let toastTimer = null;
let lastMoney = -1;
const WAVE_GAP_FRAMES = 60 * 10;
const SELL_REFUND = 0.6;
const BEST_KEY = 'nq-towers-best-wave';
const BEST_SCORE_KEY = 'nq-towers-best-score';
const MUTE_KEY = 'nq-towers-muted';
let score = 0;
let kills = 0;
const ENEMY_NAMES = { normal: 'Grunt', fast: 'Dart', armored: 'Tank', boss: 'Boss' };
const TOWER_NAMES = { basic: 'Basic', fast: 'Fast', strong: 'Strong', splash: 'Splash', frost: 'Frost' };
const TOWER_BLURB = {
    basic: 'All-rounder. Steady damage, good range.',
    fast: 'Fires three times as fast. Shreds weak enemies.',
    strong: 'Slow, heavy hits. Best against armour and bosses.',
    splash: 'Damages every enemy near the impact.',
    frost: 'Light damage, but chills enemies so they crawl. Pair with heavy hitters.',
};

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
    frost:  { color: '#b085f5', dark: '#5e35b1', light: '#e6dcff', cost: 70 },
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
    // Upgrades make the turret visibly bigger, so level reads at a glance.
    const grow = 1 + (t.level - 1) * 0.07;
    ctx.scale(grow, grow);
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
    } else if (t.type === 'frost') {
        ctx.fillStyle = st.dark;
        roundRect(ctx, 0 - recoil, -3, 17, 6, 2); ctx.fill();
        ctx.fillStyle = st.color;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // Six-point crystal
        ctx.strokeStyle = st.light;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const a = i * Math.PI / 3 + frame * 0.01;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
            ctx.lineTo(-Math.cos(a) * 7, -Math.sin(a) * 7);
            ctx.stroke();
        }
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

    // Chill tint while slowed
    if (e.slowUntil && e.slowUntil > frame) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#bfe8ff';
        ctx.beginPath(); ctx.arc(0, 0, r + 1, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#e6f7ff';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const a = i * Math.PI / 3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2));
            ctx.lineTo(-Math.cos(a) * (r - 2), -Math.sin(a) * (r - 2));
            ctx.stroke();
        }
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
    drawSelectedRange();
    drawPlacementGhost();
    // Draw enemies back-to-front so the ones lower on screen overlap.
    const sorted = enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of sorted) drawEnemy(e);
    for (const b of bullets) drawBullet(b);
    drawParticles();
    drawWaveBanner();
    if (hurtFlash > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255,40,40,${0.35 * hurtFlash})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        hurtFlash = Math.max(0, hurtFlash - 0.08);
    }
    if (waitingForStart && !gameOver) drawReadyOverlay();
    if (paused && !gameOver) drawPauseOverlay();
    if (gameOver) drawGameOver();
}

function drawSelectedRange() {
    if (!selectedTower) return;
    const t = selectedTower;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,215,0,0.75)';
    ctx.fillStyle = 'rgba(255,215,0,0.07)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.arc(cx(t), cy(t), towerStats(t).range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    roundRect(ctx, t.x * TILE_SIZE + 2, t.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4, 6); ctx.stroke();
    ctx.restore();
}

function overlayText(lines, color) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    let y = H / 2 - (lines.length - 1) * 14;
    lines.forEach((line, i) => {
        const big = i === 0;
        ctx.font = big ? 'bold 40px system-ui, sans-serif' : '15px system-ui, sans-serif';
        ctx.lineWidth = big ? 7 : 4;
        ctx.strokeText(line, W / 2, y);
        ctx.fillStyle = big ? color : '#eee';
        ctx.fillText(line, W / 2, y);
        y += big ? 34 : 22;
    });
    ctx.restore();
}

function drawReadyOverlay() {
    overlayText([
        'Get Ready',
        'Pick a tower below, then tap the grass to place it.',
        'Enemies follow the road from the portal to your base.',
        'Press Start (or N) when you are ready.',
    ], '#ffffff');
}

function drawPauseOverlay() {
    overlayText(['Paused', 'Press Space or Resume to continue.'], '#ffffff');
}

function drawGameOver() {
    const best = loadBest(), bestScore = loadBestScore();
    overlayText([
        'Game Over',
        `Wave ${wave} · Score ${score} · ${kills} kills`,
        (score >= bestScore && score > 0 ? 'New best score!' : `Best: wave ${best}, score ${bestScore}.`),
        'Tap the map or press Play Again.',
    ], '#ff5c5c');
}

// ---------------------------------------------------------------------------
// Audio: three sampled effects from assets/, short synthesised UI cues, and
// a looped music bed. Nothing starts until the first tap or key press, which
// is what browsers require before they allow sound.
// ---------------------------------------------------------------------------

const audio = { ctx: null, master: null, music: null, buffers: {}, muted: false, lastShot: -99 };
try { audio.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* private mode */ }

function initAudio() {
    if (audio.ctx) { if (audio.ctx.state === 'suspended') audio.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = audio.muted ? 0 : 1;
    audio.master.connect(audio.ctx.destination);
    for (const name of ['shoot', 'enemy-die', 'bgm']) {
        fetch(ASSET_BASE + name + '.wav')
            .then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
            .then(buf => audio.ctx.decodeAudioData(buf))
            .then(decoded => { audio.buffers[name] = decoded; if (name === 'bgm') startMusic(); })
            .catch(() => { /* missing sample: the synthesised fallback plays instead */ });
    }
    updateMuteButton();
}

function startMusic() {
    if (!audio.ctx || !audio.buffers.bgm || audio.music) return;
    const src = audio.ctx.createBufferSource();
    src.buffer = audio.buffers.bgm;
    src.loop = true;
    const gain = audio.ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain).connect(audio.master);
    src.start();
    audio.music = gain;
    updateMusic();
}

// Music plays only while a game is live and unpaused.
function updateMusic() {
    if (!audio.music || !audio.ctx) return;
    const want = running && !paused && !gameOver ? 0.22 : 0;
    audio.music.gain.setTargetAtTime(want, audio.ctx.currentTime, 0.15);
}

function playSample(name, volume, rate) {
    if (!audio.ctx || audio.muted) return false;
    const buf = audio.buffers[name];
    if (!buf) return false;
    const src = audio.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate || 1;
    const g = audio.ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(audio.master);
    src.start();
    return true;
}

function tone(freq, duration, type, volume, slideTo) {
    if (!audio.ctx || audio.muted) return;
    const t0 = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    g.gain.setValueAtTime(volume, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g).connect(audio.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
}

const sfx = {
    shoot(type) {
        // Many towers fire at once; one sample every few frames is plenty.
        if (frame - audio.lastShot < 3) return;
        audio.lastShot = frame;
        const rate = type === 'strong' ? 0.7 : type === 'fast' ? 1.4 : type === 'splash' ? 0.85 : 1;
        if (!playSample('shoot', 0.18, rate + (Math.random() - 0.5) * 0.1)) tone(880 * rate, 0.06, 'square', 0.05, 440 * rate);
    },
    kill(type) {
        const rate = type === 'boss' ? 0.5 : type === 'fast' ? 1.3 : 1;
        if (!playSample('enemy-die', type === 'boss' ? 0.5 : 0.3, rate)) tone(300 * rate, 0.18, 'sawtooth', 0.08, 80 * rate);
    },
    place() { tone(520, 0.08, 'triangle', 0.12, 660); },
    upgrade() { tone(660, 0.1, 'triangle', 0.12, 990); setTimeout(() => tone(990, 0.12, 'triangle', 0.1, 1320), 90); },
    sell() { tone(600, 0.12, 'triangle', 0.1, 300); },
    deny() { tone(180, 0.12, 'square', 0.06, 140); },
    lifeLost() { tone(220, 0.35, 'sawtooth', 0.14, 60); },
    wave() { tone(440, 0.1, 'triangle', 0.1); setTimeout(() => tone(554, 0.1, 'triangle', 0.1), 110); setTimeout(() => tone(659, 0.2, 'triangle', 0.1), 220); },
    gameOver() { tone(330, 0.4, 'sawtooth', 0.12, 110); setTimeout(() => tone(220, 0.7, 'sawtooth', 0.12, 55), 350); },
};

// ---------------------------------------------------------------------------
// Leaderboard: a small JSON API on the same site.
// ---------------------------------------------------------------------------

function csrfToken() {
    const m = document.querySelector('meta[name="csrf-token"]');
    return m ? m.getAttribute('content') : '';
}

function renderBoard(scores) {
    if (!boardList) return;
    if (!scores || !scores.length) {
        boardList.innerHTML = '<li class="empty">No scores yet. Be the first!</li>';
        return;
    }
    boardList.innerHTML = scores.map((row, i) => {
        const mine = row.id === lastSubmittedId ? ' mine' : '';
        const name = String(row.name).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
        return `<li class="row${mine}"><span class="rank">${i + 1}</span><span class="name">${name}</span>` +
               `<span class="wave">wave ${row.wave}</span><span class="pts">${row.score}</span></li>`;
    }).join('');
}

async function loadBoard() {
    if (!boardList) return;
    try {
        const r = await fetch('scores', { headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(r.status);
        renderBoard((await r.json()).scores);
    } catch (e) {
        boardList.innerHTML = '<li class="empty">Leaderboard unavailable.</li>';
    }
}

async function submitScore(ev) {
    if (ev) ev.preventDefault();
    if (!scoreForm || !gameOver) return;
    const name = (nameInput.value || '').trim();
    if (name.length < 2) { scoreStatus.textContent = 'Name needs at least 2 characters.'; nameInput.focus(); return; }
    try { localStorage.setItem(NAME_KEY, name); } catch (e) { /* private mode */ }
    submitScoreBtn.disabled = true;
    scoreStatus.textContent = 'Saving…';
    try {
        const r = await fetch('scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken() },
            body: JSON.stringify({ name, wave, score, kills }),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
            const msg = body.message || (r.status === 429 ? 'Too many submissions. Try again in a minute.' : 'Could not save the score.');
            throw new Error(msg);
        }
        lastSubmittedId = body.id;
        renderBoard(body.scores);
        scoreStatus.textContent = body.rank <= 10 ? `Saved! You are #${body.rank} on the board.` : `Saved. You ranked #${body.rank}.`;
        scoreForm.classList.add('done');
        toast(body.rank <= 3 ? 'Top three! Nice.' : 'Score saved');
    } catch (e) {
        scoreStatus.textContent = e.message;
        submitScoreBtn.disabled = false;
    }
}

function showScoreForm() {
    if (!scoreForm) return;
    scoreForm.hidden = false;
    scoreForm.classList.remove('done');
    submitScoreBtn.disabled = false;
    scoreStatus.textContent = score > 0 ? `Wave ${wave}, ${score} points. Add your name to the board?` : 'Score 0 cannot be submitted.';
    submitScoreBtn.disabled = score <= 0;
    try { nameInput.value = nameInput.value || localStorage.getItem(NAME_KEY) || ''; } catch (e) { /* private mode */ }
    if (score > 0) nameInput.focus();
}

function toggleMute() {
    audio.muted = !audio.muted;
    try { localStorage.setItem(MUTE_KEY, audio.muted ? '1' : '0'); } catch (e) { /* private mode */ }
    if (audio.master) audio.master.gain.value = audio.muted ? 0 : 1;
    updateMuteButton();
    if (!audio.muted) initAudio();
}

function updateMuteButton() {
    if (!muteBtn) return;
    muteBtn.textContent = audio.muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-label', audio.muted ? 'Unmute sound' : 'Mute sound');
    muteBtn.title = (audio.muted ? 'Unmute' : 'Mute') + ' (M)';
    muteBtn.classList.toggle('muted', audio.muted);
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
    kills++;
    score += e.reward || 10;
    sfx.kill(e.type);
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
        const chilled = e.slowUntil && e.slowUntil > frame;
        const speed = (e.speed || 1.2) * (chilled ? e.slowFactor : 1);
        // How far along the road this enemy is, so towers can shoot the one
        // closest to the base rather than whichever spawned first.
        const prev = path[e.pathIndex];
        const segLen = Math.hypot((target.x - prev.x) * TILE_SIZE, (target.y - prev.y) * TILE_SIZE) || 1;
        e.progress = e.pathIndex + 1 - dist / segLen;
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
                const cost = e.type === 'boss' ? 3 : 1;
                lives = Math.max(0, lives - cost);
                e.hp = 0;
                hurtFlash = 1;
                sfx.lifeLost();
                livesSpan.classList.remove('shake'); void livesSpan.offsetWidth; livesSpan.classList.add('shake');
                burst(e.x, e.y, '#ff3b3b', 12, 2.5);
                floatText(e.x - 10, e.y - 20, cost === 1 ? '-1 life' : `-${cost} lives`, '#ff6b6b');
            }
        } else {
            e.x += dx/dist * speed;
            e.y += dy/dist * speed;
        }
    }
    enemies = enemies.filter(e => e.hp > 0);
}

// One place for the numbers the game uses, so the stats panel never drifts
// from what the towers actually do.
function towerStats(t) {
    const level = t.level;
    let damage = 1 + (t.type === 'strong' ? 2 : 0) + level;
    if (t.type === 'splash') damage = 1 + level;
    if (t.type === 'frost') damage = 1 + Math.floor(level / 2);
    const cooldown = t.type === 'fast' ? 10 : t.type === 'strong' ? 40 : t.type === 'splash' ? 50 : t.type === 'frost' ? 35 : 30;
    return {
        damage,
        range: 120 + level * 10,
        cooldown,
        shotsPerSec: +(60 / cooldown).toFixed(1),
        splashRadius: t.type === 'splash' ? 40 + level * 10 : 0,
        // Speed multiplier while chilled, and how long the chill lasts.
        slowFactor: t.type === 'frost' ? 0.6 - (level - 1) * 0.05 : 1,
        slowFrames: t.type === 'frost' ? 75 + level * 15 : 0,
        upgradeCost: 40 + level * 30,
        maxed: level >= 5,
    };
}

function towerValue(t) {
    let spent = TOWER_STYLE[t.type].cost;
    for (let l = 1; l < t.level; l++) spent += 40 + l * 30;
    return Math.floor(spent * SELL_REFUND);
}

function updateTowers() {
    for (let t of towers) {
        t.cooldown--;
        if (t.recoil) t.recoil = Math.max(0, t.recoil - 0.15);
        const tx = t.x * TILE_SIZE + TILE_SIZE/2;
        const ty = t.y * TILE_SIZE + TILE_SIZE/2;
        const st = towerStats(t);
        const range = st.range;
        // Keep tracking the current target between shots.
        if (t.target && t.target.hp > 0) {
            const dx = t.target.x - tx, dy = t.target.y - ty;
            if (dx*dx + dy*dy < range*range) t.angle = Math.atan2(dy, dx);
            else t.target = null;
        } else {
            t.target = null;
        }
        if (t.cooldown <= 0) {
            // Target the enemy furthest along the road: the one about to leak.
            let e = null, best = -1;
            for (const c of enemies) {
                const dx = tx - c.x, dy = ty - c.y;
                if (dx*dx + dy*dy < range*range && (c.progress || 0) > best) { best = c.progress || 0; e = c; }
            }
            if (e) {
                let bulletSpeed = 15 - t.level*2;
                if (bulletSpeed < 6) bulletSpeed = 6;
                t.angle = Math.atan2(e.y - ty, e.x - tx);
                t.target = e;
                t.recoil = 1;
                bullets.push({
                    x: tx,
                    y: ty,
                    dx: (e.x - tx)/bulletSpeed,
                    dy: (e.y - ty)/bulletSpeed,
                    target: e,
                    type: t.type,
                    damage: st.damage,
                    splash: t.type === 'splash',
                    splashRadius: st.splashRadius,
                    slowFactor: st.slowFactor,
                    slowFrames: st.slowFrames
                });
                t.cooldown = st.cooldown;
                sfx.shoot(t.type);
            }
        }
    }
}

function updateBullets() {
    for (let b of bullets) {
        b.x += b.dx;
        b.y += b.dy;
        if (b.target && Math.abs(b.x - b.target.x) < 12 && Math.abs(b.y - b.target.y) < 12) {
            let playedDeath = false;
            if (b.splash) {
                ring(b.x, b.y, 8, b.splashRadius, TOWER_STYLE.splash.light);
                burst(b.x, b.y, TOWER_STYLE.splash.light, 8, 2);
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
                if (b.slowFrames) {
                    const e = b.target;
                    // A stronger chill replaces a weaker one; the same chill just refreshes.
                    if (!e.slowUntil || e.slowUntil <= frame || b.slowFactor <= e.slowFactor) e.slowFactor = b.slowFactor;
                    e.slowUntil = Math.max(e.slowUntil || 0, frame + b.slowFrames);
                    burst(e.x, e.y, '#e6f7ff', 4, 1.2);
                }
                if (b.target.hp <= 0 && wasAlive) { money += b.target.reward || 10; onEnemyKilled(b.target); }
            }
            b.hit = true;
        }
    }
    bullets = bullets.filter(b => !b.hit && b.x >= 0 && b.x <= W && b.y >= 0 && b.y <= H);
}

// ---------------------------------------------------------------------------
// Waves
// ---------------------------------------------------------------------------

// What a given wave sends, in spawn order. Shared by the spawner and the
// preview so the preview can never lie.
function waveComposition(w) {
    const list = [];
    for (let i = 0; i < 3 + w; i++) {
        let type = 'normal';
        if (w > 2 && i % 5 === 0) type = 'fast';
        if (w > 4 && i % 7 === 0) type = 'armored';
        list.push(type);
    }
    // A boss every fifth wave from wave 5, leading the charge.
    if (w >= 5 && w % 5 === 0) list[0] = 'boss';
    return list;
}

function queueWave() {
    wave++;
    const comp = waveComposition(wave);
    const bossWave = comp.includes('boss');
    waveBanner = {
        text: 'Wave ' + wave,
        sub: bossWave ? 'A boss approaches! It costs 3 lives if it gets through.'
           : wave === 3 ? 'Darts are fast but fragile'
           : wave === 6 ? 'Tanks shrug off light fire' : '',
        color: bossWave ? '#ffd400' : '#ffffff',
        t: 110, max: 110
    };
    comp.forEach((type, i) => spawnQueue.push({ type, at: frame + i * 36 }));
    waveCountdown = 0;
    waitingForStart = false;
    sfx.wave();
    updateWaveButton();
}

function updateWavePreview() {
    if (!wavePreview) return;
    if (gameOver) { wavePreview.innerHTML = ''; return; }
    const comp = waveComposition(wave + 1);
    const counts = {};
    for (const t of comp) counts[t] = (counts[t] || 0) + 1;
    wavePreview.innerHTML = '<span class="pv-label">Next:</span>' + Object.keys(ENEMY_STYLE)
        .filter(t => counts[t])
        .map(t => `<span class="pv ${t}" title="${counts[t]} × ${ENEMY_NAMES[t]}"><i></i>${counts[t]}</span>`)
        .join('');
}

function callNextWave() {
    if (gameOver) return;
    if (paused) togglePause();
    if (waitingForStart) { queueWave(); return; }
    if (waveCountdown > 0) {
        // Reward calling the wave early with the seconds you gave up.
        const bonus = Math.ceil(waveCountdown / 60) * 2;
        money += bonus;
        toast(`Early wave bonus +${bonus}`);
        queueWave();
    }
}

function updateSpawns() {
    if (spawnQueue.length && spawnQueue[0].at <= frame) {
        spawnQueue = spawnQueue.filter(q => {
            if (q.at <= frame) { spawnEnemy(q.type); return false; }
            return true;
        });
    }
    const waveActive = enemies.length > 0 || spawnQueue.length > 0;
    if (!waveActive && !waitingForStart && waveCountdown === 0) {
        waveCountdown = WAVE_GAP_FRAMES;
        // Clearing a wave pays interest, so the economy keeps up with enemy hp.
        const bonus = 10 + wave * 2;
        money += bonus;
        score += bonus;
        toast(`Wave ${wave} cleared! +${bonus} bonus`);
    }
    if (waveCountdown > 0) {
        waveCountdown--;
        if (waveCountdown === 0) queueWave();
    }
}

let previewFor = -1;
function updateWaveButton() {
    if (wavePreview && previewFor !== wave) { previewFor = wave; updateWavePreview(); }
    if (!waveBtn) return;
    if (gameOver) { waveBtn.textContent = 'Game over'; waveBtn.disabled = true; return; }
    waveBtn.disabled = false;
    if (waitingForStart) waveBtn.textContent = 'Start wave 1';
    else if (waveCountdown > 0) waveBtn.textContent = `Send wave ${wave + 1} (${Math.ceil(waveCountdown / 60)}s)`;
    else { waveBtn.textContent = `Wave ${wave} in progress`; waveBtn.disabled = true; }
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

function loadBest() {
    try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (e) { return 0; }
}
function saveBest(w) {
    try { if (w > loadBest()) localStorage.setItem(BEST_KEY, String(w)); } catch (e) { /* private mode */ }
}
function loadBestScore() {
    try { return parseInt(localStorage.getItem(BEST_SCORE_KEY) || '0', 10) || 0; } catch (e) { return 0; }
}
function saveBestScore(v) {
    try { if (v > loadBestScore()) localStorage.setItem(BEST_SCORE_KEY, String(v)); } catch (e) { /* private mode */ }
}

function toast(msg, kind) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = 'show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.className = ''; }, 1600);
}

function setHint() {
    if (!upgradeInfo) return;
    if (gameOver) upgradeInfo.textContent = 'Press Play Again to try once more.';
    else if (placingTower) upgradeInfo.textContent = `Tap the grass to place a ${TOWER_NAMES[selectedTowerType]} tower (${TOWER_STYLE[selectedTowerType].cost}). Esc cancels.`;
    else if (selectedTower) upgradeInfo.textContent = 'U upgrades, S sells, Esc deselects.';
    else upgradeInfo.textContent = 'Tap a tower on the map to see its stats. Keys 1-5 pick a tower type.';
}

function updateTowerPanel() {
    if (!towerPanel) return;
    const t = selectedTower;
    if (!t || !towers.includes(t)) {
        selectedTower = null;
        towerPanel.classList.remove('open');
        return;
    }
    const st = towerStats(t);
    towerPanel.classList.add('open');
    tpName.textContent = `${TOWER_NAMES[t.type]} tower · Lv ${t.level}`;
    tpStats.innerHTML =
        `<span>Damage <b>${st.damage}</b></span>` +
        `<span>Range <b>${st.range}</b></span>` +
        `<span>Rate <b>${st.shotsPerSec}/s</b></span>` +
        (st.splashRadius ? `<span>Splash <b>${st.splashRadius}</b></span>` : '') +
        (st.slowFrames ? `<span>Chill <b>-${Math.round((1 - st.slowFactor) * 100)}% for ${(st.slowFrames / 60).toFixed(1)}s</b></span>` : '') +
        `<span class="blurb">${TOWER_BLURB[t.type]}</span>`;
    if (st.maxed) {
        upgradeBtn.textContent = 'Max level';
        upgradeBtn.disabled = true;
    } else {
        const next = towerStats({ ...t, level: t.level + 1 });
        upgradeBtn.textContent = `Upgrade (${st.upgradeCost}) → dmg ${next.damage}, range ${next.range}`;
        upgradeBtn.disabled = money < st.upgradeCost;
    }
    sellBtn.textContent = `Sell (+${towerValue(t)})`;
}

function updateAffordability() {
    if (money === lastMoney) return;
    lastMoney = money;
    towerMenu.querySelectorAll('.tower-btn').forEach(b => {
        const type = b.getAttribute('data-type');
        b.classList.toggle('unaffordable', money < TOWER_STYLE[type].cost);
    });
    if (selectedTower) updateTowerPanel();
}

function updateHud() {
    moneySpan.textContent = 'Money: ' + money;
    livesSpan.textContent = 'Lives: ' + lives;
    waveSpan.textContent = 'Wave: ' + Math.max(1, wave);
    if (scoreSpan) scoreSpan.textContent = 'Score: ' + score;
    if (bestSpan) bestSpan.textContent = 'Best: ' + Math.max(loadBest(), wave);
    updateAffordability();
    updateWaveButton();
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

function step() {
    frame++;
    updateSpawns();
    updateEnemies();
    updateTowers();
    updateBullets();
    updateParticles();
}

function gameLoop() {
    if (!running || paused || gameOver) return;
    if (!waitingForStart) {
        for (let i = 0; i < speed; i++) step();
    } else {
        frame++;
        updateParticles();
    }
    drawMap();
    updateHud();
    if (lives <= 0) endGame();
    else requestAnimationFrame(gameLoop);
}

function endGame() {
    gameOver = true;
    running = false;
    placingTower = false;
    selectedTower = null;
    saveBest(wave);
    saveBestScore(score);
    sfx.gameOver();
    updateMusic();
    setMenuSelection(null);
    updateTowerPanel();
    updateWaveButton();
    setHint();
    if (restartBtn) restartBtn.hidden = false;
    showScoreForm();
    drawMap();
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

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function setMenuSelection(type) {
    towerMenu.querySelectorAll('.tower-btn').forEach(b => b.classList.toggle('selected', b.getAttribute('data-type') === type));
}

function beginPlacing(type) {
    if (gameOver) return;
    if (placingTower && selectedTowerType === type) { cancelPlacing(); return; }
    selectedTowerType = type;
    placingTower = true;
    selectedTower = null;
    updateTowerPanel();
    setMenuSelection(type);
    if (money < TOWER_STYLE[type].cost) toast(`Need ${TOWER_STYLE[type].cost - money} more for a ${TOWER_NAMES[type]} tower`, 'warn');
    setHint();
}

function cancelPlacing() {
    placingTower = false;
    setMenuSelection(null);
    setHint();
}

function selectTower(t) {
    selectedTower = t;
    placingTower = false;
    setMenuSelection(null);
    updateTowerPanel();
    setHint();
}

function tryPlace(x, y, type) {
    if (gameOver) return false;
    if (x < 0 || y < 0 || x >= MAP_COLS || y >= MAP_ROWS) return false;
    if (isPathTile(x, y)) { toast('Cannot build on the road', 'warn'); sfx.deny(); return false; }
    if (towers.some(t => t.x === x && t.y === y)) { toast('That tile already has a tower', 'warn'); sfx.deny(); return false; }
    const cost = TOWER_STYLE[type]?.cost ?? 50;
    if (money < cost) { toast(`Need ${cost - money} more money`, 'warn'); sfx.deny(); return false; }
    const t = {x, y, type, cooldown: 0, level: 1, angle: -Math.PI / 2, recoil: 0};
    towers.push(t);
    money -= cost;
    ring(cx(t), cy(t), 10, 20, TOWER_STYLE[type].light);
    burst(cx(t), cy(t), '#cfd8e3', 8, 1.6);
    sfx.place();
    // Stay in placement mode so several towers can be dropped in a row,
    // but drop out once the next one cannot be afforded.
    if (money < cost) cancelPlacing();
    setHint();
    return true;
}

function tryUpgrade(t) {
    if (!t || gameOver) return;
    const st = towerStats(t);
    if (st.maxed) { toast('Already at max level', 'warn'); sfx.deny(); return; }
    if (money < st.upgradeCost) { toast(`Need ${st.upgradeCost - money} more to upgrade`, 'warn'); sfx.deny(); return; }
    t.level++;
    sfx.upgrade();
    money -= st.upgradeCost;
    ring(cx(t), cy(t), 12, 24, '#ffd700');
    burst(cx(t), cy(t), '#ffd700', 10, 2);
    floatText(cx(t), cy(t) - 24, 'Lv' + t.level, '#ffd700');
    toast(`Upgraded to level ${t.level}`);
    lastMoney = -1;
    updateTowerPanel();
}

function sellTower(t) {
    if (!t || gameOver) return;
    const value = towerValue(t);
    towers = towers.filter(x => x !== t);
    money += value;
    floatText(cx(t), cy(t) - 10, '+' + value, '#ffe066');
    burst(cx(t), cy(t), '#cfd8e3', 10, 2);
    toast(`Sold for ${value}`);
    sfx.sell();
    selectedTower = null;
    lastMoney = -1;
    updateTowerPanel();
    setHint();
}

function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    updateMusic();
    if (paused) drawMap();
    else gameLoop();
}

function toggleSpeed() {
    speed = speed === 1 ? 2 : 1;
    if (speedBtn) {
        speedBtn.textContent = speed + '×';
        speedBtn.classList.toggle('active', speed === 2);
    }
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    if (towerMenu) {
        towerMenu.querySelectorAll('.tower-btn').forEach(btn => {
            btn.setAttribute('draggable', 'true');
            btn.addEventListener('dragstart', function(e) {
                selectedTowerType = this.getAttribute('data-type');
                e.dataTransfer.setData('text/plain', selectedTowerType);
                if (this.querySelector('svg')) {
                    e.dataTransfer.setDragImage(this.querySelector('svg'), 16, 16);
                }
            });
            btn.addEventListener('pointerdown', function(e) {
                e.preventDefault();
                beginPlacing(this.getAttribute('data-type'));
            });
        });
    }

    canvas.addEventListener('dragover', function(e) {
        e.preventDefault();
        hoverTile = clientPointToTile(e.clientX, e.clientY);
    });
    canvas.addEventListener('drop', function(e) {
        e.preventDefault();
        const { x, y } = clientPointToTile(e.clientX, e.clientY);
        const type = e.dataTransfer.getData('text/plain') || selectedTowerType;
        tryPlace(x, y, type);
    });

    if (waveBtn) waveBtn.addEventListener('click', callNextWave);
    if (speedBtn) speedBtn.addEventListener('click', toggleSpeed);
    if (restartBtn) restartBtn.addEventListener('click', startGame);
    if (upgradeBtn) upgradeBtn.addEventListener('click', () => tryUpgrade(selectedTower));
    if (sellBtn) sellBtn.addEventListener('click', () => sellTower(selectedTower));
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    if (muteBtn) { muteBtn.addEventListener('click', toggleMute); updateMuteButton(); }
    if (scoreForm) scoreForm.addEventListener('submit', submitScore);
    loadBoard();
    // Browsers only allow sound after a user gesture; the first one unlocks it.
    const unlock = () => { initAudio(); };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
});

canvas.addEventListener('pointermove', e => {
    hoverTile = clientPointToTile(e.clientX, e.clientY);
});
canvas.addEventListener('pointerleave', () => { hoverTile = null; });

canvas.addEventListener('click', e => {
    if (gameOver) { startGame(); return; }
    const { x, y } = clientPointToTile(e.clientX, e.clientY);
    const hit = towers.find(t => t.x === x && t.y === y);
    if (hit) { selectTower(hit); return; }
    if (placingTower) { tryPlace(x, y, selectedTowerType); return; }
    if (selectedTower) { selectedTower = null; updateTowerPanel(); setHint(); }
});

document.addEventListener('keydown', e => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName) && e.key !== 'Escape') return;
    const types = ['basic', 'fast', 'strong', 'splash', 'frost'];
    switch (e.key) {
        case '1': case '2': case '3': case '4': case '5':
            beginPlacing(types[+e.key - 1]); break;
        case 'Escape':
            if (placingTower) cancelPlacing();
            else if (selectedTower) { selectedTower = null; updateTowerPanel(); setHint(); }
            break;
        case ' ': case 'p': case 'P':
            e.preventDefault(); togglePause(); break;
        case 'n': case 'N':
            callNextWave(); break;
        case 'f': case 'F':
            toggleSpeed(); break;
        case 'm': case 'M':
            toggleMute(); break;
        case 'u': case 'U':
            tryUpgrade(selectedTower); break;
        case 's': case 'S':
            sellTower(selectedTower); break;
        case 'Enter':
            if (gameOver) startGame(); break;
        default: return;
    }
});

function startGame() {
    money = 100;
    lives = 10;
    towers = [];
    enemies = [];
    bullets = [];
    particles = [];
    spawnQueue = [];
    wave = 0;
    score = 0;
    kills = 0;
    previewFor = -1;
    waveBanner = null;
    waveCountdown = 0;
    waitingForStart = true;
    placingTower = false;
    selectedTower = null;
    gameOver = false;
    paused = false;
    running = true;
    hurtFlash = 0;
    lastMoney = -1;
    if (pauseBtn) pauseBtn.textContent = 'Pause';
    if (restartBtn) restartBtn.hidden = true;
    if (scoreForm) scoreForm.hidden = true;
    setMenuSelection(null);
    updateTowerPanel();
    setHint();
    updateHud();
    updateMusic();
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
