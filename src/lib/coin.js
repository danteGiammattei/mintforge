/* ════════════════════════════════════════════════════════════════════════
 *  COIN — generation, drawing, value
 *  ────────────────────────────────────────────────────────────────────────
 *  All the pure logic for coins. Imports static data from data.js but holds
 *  the RNG, rune translator, face generator, drawCoin canvas painter, and
 *  the coinValue / rarity calculations.
 *
 *  Pure apart from drawCoin, which needs a canvas and is only ever called
 *  in the browser — so the server imports this file for coinValue too.
 *
 *  THE GENERATOR (genFace, mkCoin, drawCoin) IS FROZEN. tests/coin.golden
 *  pins its output; if that test fails, the change is wrong, not the test.
 * ════════════════════════════════════════════════════════════════════════ */

import {
  METALS, MAX_TIER, SHAPES, CONS, VOWS, ERAS, EPOCH, HOUSES, CONDS,
  RARITIES,   TITLES, TITLE_LEVELS,
} from "./data.js";
import { METAL_BASE_VALUE, SHINY_VALUE_MUL, CONDITION_STEP, XP } from "../../shared/tuning.js";

/* ─── RUNE TRANSLATOR ─────────────────────────────────────────────────── */
const RL = { A:"ᚨ",B:"ᛒ",C:"ᚲ",D:"ᛞ",E:"ᛖ",F:"ᚠ",G:"ᚷ",H:"ᚺ",I:"ᛁ",J:"ᛃ",K:"ᚲ",L:"ᛚ",M:"ᛗ",N:"ᚾ",O:"ᛟ",P:"ᛈ",R:"ᚱ",S:"ᛊ",T:"ᛏ",U:"ᚢ",V:"ᚡ",W:"ᚹ",X:"ᛪ",Y:"ᚤ",Z:"ᛉ" };
const DG = { TH:"ᚦ", GR:"ᚷᚱ", BR:"ᛒᚱ", DR:"ᛞᚱ", KR:"ᚲᚱ", SK:"ᛊᚲ", ST:"ᛊᛏ" };
export function rune(s) {
  let o = "", i = 0;
  while (i < s.length) {
    const d = s.slice(i, i + 2);
    if (DG[d]) { o += DG[d]; i += 2; }
    else       { o += RL[s[i]] || s[i]; i++; }
  }
  return o;
}

/* ─── PRNG ────────────────────────────────────────────────────────────────
 * xorshift32 — fast, deterministic, seed-stable. Used for everything that
 * needs reproducibility from a coin seed (face generation, dig depths,
 * artefact rarity, etc.). */
export class RNG {
  constructor(seed) { this.s = (seed ^ 0xdeadbeef) >>> 0 || 1; }
  next()           { this.s ^= this.s << 13; this.s ^= this.s >>> 17; this.s ^= this.s << 5; return (this.s >>> 0) / 4294967296; }
  int(lo, hi)      { return Math.floor(this.next() * (hi - lo + 1)) + lo; }
  pick(a)          { return a[this.int(0, a.length - 1)]; }
  bool(p = 0.5)    { return this.next() < p; }
}

/* ─── METAL PICKING ───────────────────────────────────────────────────────
 * Weighted by player level: at Lv1 it's mostly Copper/Bronze, by Lv50 the
 * top tiers (Eldritch, Astral) become reachable. tierCap clamps to whatever
 * the player's tools allow. */
export function pickMetal(rng, pLvl = 1, tierCap = MAX_TIER) {
  const b = Math.min(pLvl - 1, 50);
  const w = [
    Math.max(14, 38 - b * .48),  // copper
    Math.max(10, 22 - b * .18),  // bronze
    18 + b * .08,                // silver
    12 + b * .12,                // gold
    6  + b * .14,                // platinum
    3  + b * .08,                // obsidian
    Math.min(15, 1 + b * .08),   // void
    Math.max(.2,  b * .02),      // eldritch — very rare even at high levels
    Math.max(.05, b * .008),     // astral — vanishingly rare
  ];
  const tot = w.reduce((a, v) => a + v, 0);
  let r = rng.next() * tot, c = 0;
  for (let i = 0; i < w.length; i++) { c += w[i]; if (r <= c) return Math.min(i, tierCap); }
  return 0;
}

/* ─── FACE GENERATOR ──────────────────────────────────────────────────────
 * 13×13 grid of cell values: 0=empty, 1=engraved, 2=highlight. Mirrored
 * vertically so coins look symmetric. Uses cellular-automaton smoothing
 * (3 passes) to produce blob-like shapes instead of noise. */
export function genFace(seed) {
  const rng    = new RNG(seed ^ 0xf4ce1a);
  const SZ     = 13;
  const half   = 7;
  const center = (SZ - 1) / 2;

  let L = Array.from({ length: SZ }, (_, y) =>
    Array.from({ length: half }, (_, x) => {
      const d = Math.hypot(x - center, y - center) / (center * 0.95);
      // Higher base density (0.42) + falloff toward edges
      return rng.next() > (0.42 + d * .3) ? 1 : 0;
    })
  );

  // Three smoothing passes to clean up the noise into shapes
  for (let it = 0; it < 3; it++) {
    L = L.map((row, y) => row.map((cell, x) => {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dy && !dx) continue;
        const ny = y + dy, nx = x + dx;
        n += (ny >= 0 && ny < SZ && nx >= 0 && nx < half) ? L[ny][nx] : 0;
      }
      return n >= 4 ? 1 : n <= 2 ? 0 : cell;
    }));
  }

  // Mirror left half across to make a symmetric face
  const g = Array.from({ length: SZ }, (_, y) => {
    const row = new Array(SZ).fill(0);
    for (let x = 0; x < half; x++) { row[x] = L[y][x]; row[SZ - 1 - x] = L[y][x]; }
    return row;
  });

  // Choose 2–4 highlight cells (engraving accent). Mirrored too.
  const pool = [];
  for (let y = 3; y < SZ - 3; y++) for (let x = 3; x < SZ - 3; x++) {
    if (g[y][x] === 1 && Math.hypot(x - center, y - center) < center * 0.7) pool.push([y, x]);
  }
  for (let h = 0; h < rng.int(2, 4); h++) {
    if (!pool.length) break;
    const idx = rng.int(0, pool.length - 1);
    const [hy, hx] = pool.splice(idx, 1)[0];
    g[hy][hx] = 2;
    if (SZ - 1 - hx !== hx) g[hy][SZ - 1 - hx] = 2;
  }
  return g;
}

/* ─── COIN CONSTRUCTION ──────────────────────────────────────────────────
 * mkCoin produces a deterministic coin object from a seed + player context.
 * The id encodes the seed for stable React keys across remounts. */
export function mkCoin(seed, pLvl = 1, tier = null, tierCap = MAX_TIER, rarityOverride = null) {
  const rng = new RNG(seed);
  const raw = (rng.pick(CONS) + rng.pick(VOWS) + rng.pick(CONS) + rng.pick(VOWS)).slice(0, 9);
  // Rarity: explicit override (used at dig time so dig quality matters),
  // otherwise derived from seed so stored coins persist their rarity stably.
  const rarity = rarityOverride != null ? rarityOverride : deriveRarity(seed);
  return {
    id:       `c_${seed >>> 0}_${(Date.now() & 0xffff).toString(36)}`,
    seed,
    raw,
    runes:    rune(raw),
    metalIdx: tier ?? pickMetal(rng, pLvl, tierCap),
    shape:    rng.pick(SHAPES),
    era:      `${rng.pick(ERAS)} ${rng.pick(EPOCH)}, House of ${rng.pick(HOUSES)}`,
    cond:     rng.pick(CONDS),
    wt:       +(rng.next() * 12 + 2).toFixed(1),
    dia:      rng.int(18, 44),
    shiny:    false,
    rarity,
  };
}
export const newSeed = () => (Date.now() ^ (Math.random() * 0xffffffff | 0)) >>> 0;

/* ─── DRAW COIN (legacy procedural painter) ──────────────────────────────
 * Renders into an offscreen 64×64 canvas, then nearest-neighbor blits to
 * the requested px size for crisp pixel-art at any scale.
 *
 * As of the coin-art overhaul, this is no longer the primary renderer —
 * coins are now displayed via hand-illustrated images (see CoinCanvas.jsx
 * and coinImagePath in data.js). drawCoin is kept as a fallback for cases
 * where the image fails to load (404, missing slice) and is still used
 * directly by CoinModal and BrushReveal where they need to paint into
 * their own canvas elements (3D rotation modal, brush-reveal pipeline).
 *
 * Exported under both names: `drawCoin` for legacy callers,
 * `drawCoinFallback` for the new CoinCanvas's defensive fallback path. */
export function drawCoin(canvas, coin, px) {
  const S = 64, off = document.createElement("canvas"); off.width = S; off.height = S;
  const c   = off.getContext("2d");
  const m   = METALS[coin.metalIdx];
  const noise = new RNG(coin.seed ^ 0xcafeba);
  const cx  = S / 2, cy = S / 2, r = S / 2 - 1;

  const clip = () => {
    c.beginPath();
    const sh = coin.shape;
    if (sh === "round" || sh === "holed") c.arc(cx, cy, r, 0, Math.PI * 2);
    else if (sh === "octagonal") { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; i ? c.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)) : c.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); } c.closePath(); }
    else if (sh === "hexagonal")  { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; i ? c.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)) : c.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); } c.closePath(); }
    else if (sh === "shield")     { const hw = r * .88; c.moveTo(cx - hw, cy - r); c.lineTo(cx + hw, cy - r); c.lineTo(cx + hw, cy - .1 * r); c.quadraticCurveTo(cx + hw, cy + r * .65, cx, cy + r); c.quadraticCurveTo(cx - hw, cy + r * .65, cx - hw, cy - .1 * r); c.closePath(); }
    else if (sh === "diamond")    { c.moveTo(cx, cy - r); c.lineTo(cx + r * .78, cy); c.lineTo(cx, cy + r); c.lineTo(cx - r * .78, cy); c.closePath(); }
    else if (sh === "oval")       c.ellipse(cx, cy, r * .7, r, 0, 0, Math.PI * 2);
    else                          c.rect(cx - r + 1, cy - r + 1, (r - 1) * 2, (r - 1) * 2);
  };

  clip(); c.save(); c.clip();
  const grd = c.createRadialGradient(cx - r * .3, cy - r * .3, 0, cx, cy, r);
  grd.addColorStop(0, m.base); grd.addColorStop(.55, m.mid); grd.addColorStop(1, m.dark);
  c.fillStyle = grd; c.fillRect(0, 0, S, S);

  // Noise specks across the coin face — adds patina texture
  for (let i = 0; i < 420; i++) {
    const a = noise.next() * Math.PI * 2;
    const d = noise.next() * r * .95;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    const b = noise.next();
    c.fillStyle = `rgba(${b > .5 ? 255 : 0},${b > .5 ? 255 : 0},${b > .5 ? 255 : 0},${.04 + noise.next() * .06})`;
    c.fillRect(x | 0, y | 0, 1, 1);
  }

  // Engraved face — 13×13 grid centered on the canvas
  const face       = genFace(coin.seed);
  const cellSize   = 3.5;
  const faceOffset = (S - 13 * cellSize) / 2;
  for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
    const v = face[y][x]; if (!v) continue;
    const px2 = faceOffset + x * cellSize, py = faceOffset + y * cellSize;
    c.fillStyle = v === 2 ? m.eng : m.hl;
    c.fillRect(Math.floor(px2), Math.floor(py), Math.ceil(cellSize), Math.ceil(cellSize));
    if (v === 1) {
      c.fillStyle = "rgba(255,255,255,.22)"; c.fillRect(Math.floor(px2), Math.floor(py), Math.ceil(cellSize), 1);
      c.fillStyle = "rgba(0,0,0,.26)";       c.fillRect(Math.floor(px2), Math.floor(py) + Math.ceil(cellSize) - 1, Math.ceil(cellSize), 1);
    }
  }

  // Top-left highlight glow
  c.fillStyle = "rgba(255,255,255,.14)"; c.beginPath(); c.arc(cx - r * .4, cy - r * .4, r * .55, 0, Math.PI * 2); c.fill();
  // Pierced shape — punch a hole in the center
  if (coin.shape === "holed") { c.save(); c.globalCompositeOperation = "destination-out"; c.beginPath(); c.arc(cx, cy, r * .18, 0, Math.PI * 2); c.fill(); c.restore(); }
  c.restore();

  // Edge stroke
  c.lineWidth = 1; c.strokeStyle = m.eng; clip(); c.stroke();

  // Shiny rotating diagonal sheen
  if (coin.shiny) {
    c.save(); clip(); c.clip();
    const ang = (Date.now() / 40) % 360;
    const lg  = c.createLinearGradient(0, 0, S, S);
    lg.addColorStop(0,   "rgba(255,255,255,0)");
    lg.addColorStop(.4,  `hsla(${ang},100%,75%,.35)`);
    lg.addColorStop(.5,  `hsla(${(ang + 60)  % 360},100%,80%,.5)`);
    lg.addColorStop(.6,  `hsla(${(ang + 120) % 360},100%,75%,.35)`);
    lg.addColorStop(1,   "rgba(255,255,255,0)");
    c.fillStyle = lg; c.fillRect(0, 0, S, S);
    c.restore();
  }

  // Final blit to the requested size, nearest-neighbor for pixel-perfect scale
  canvas.width = px; canvas.height = px;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, px, px);
}

/* ─── XP / LEVEL CURVE ────────────────────────────────────────────────── */
export function lvl(xp)         { return Math.floor(Math.sqrt(xp / XP.perLevel)) + 1; }
export function lvlMin(l)       { return (l - 1) ** 2 * XP.perLevel; }
export function lvlMax(l)       { return l ** 2 * XP.perLevel; }

/* ─── RARITY ──────────────────────────────────────────────────────────── */

// Derive a deterministic baseline rarity from a coin's seed alone.
// Used as a fallback for coins stored before rarity was tracked.
export function deriveRarity(seed) {
  const r   = new RNG(seed ^ 0xab12cd);
  const tot = RARITIES.reduce((s, x) => s + x.weight, 0);
  let roll  = r.next() * tot;
  for (let i = 0; i < RARITIES.length; i++) { roll -= RARITIES[i].weight; if (roll <= 0) return i; }
  return 0;
}

// Read a coin's rarity — uses stored value if present, derives from seed otherwise.
export function coinRarity(c) {
  if (typeof c?.rarity    === "number") return c.rarity;
  if (typeof c?.rarityIdx === "number") return c.rarityIdx; // legacy field name
  return deriveRarity(c?.seed || 0);
}

/* ─── ECONOMY ─────────────────────────────────────────────────────────── */

export function rarityScore(coins) {
  return coins.reduce(
    (s, c) => s + ([1, 3, 8, 20, 45, 120, 300, 800, 2000][c.metalIdx] || 1)
              * (coinRarity(c) + 1)
              * (c.shiny ? 3 : 1),
    0
  );
}

// Single coin → marks: metal base × rarity × condition × shiny. Every
// factor is in shared/tuning.js. The server sells with this same function.
export function coinValue(c) {
  const base     = METAL_BASE_VALUE[c.metalIdx] || METAL_BASE_VALUE[0];
  const condIdx  = Math.max(0, CONDS.indexOf(c.cond));
  const condMul  = 1 + (3 - condIdx) * CONDITION_STEP;
  const shinyMul = c.shiny ? SHINY_VALUE_MUL : 1;
  const rarMul   = RARITIES[coinRarity(c)]?.valueMul || 1;
  return Math.max(1, Math.round(base * condMul * shinyMul * rarMul));
}

export function vaultMarks(coins) {
  return coins.reduce((s, c) => s + coinValue(c), 0);
}

/* ─── UNLOCKED TITLES ─────────────────────────────────────────────────── */
export function unlockedTitles(level) {
  return TITLES.filter((_, i) => level >= TITLE_LEVELS[i]);
}
