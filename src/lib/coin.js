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
 *  THE GENERATOR (genFace, mkCoin) IS FROZEN. tests/coin.golden pins its
 *  output; if that test fails, the change is wrong, not the test. How a
 *  coin is drawn (drawCoin) may change, as it did in November 2026 when
 *  coins became pixel art; what a coin IS, from its seed, may not.
 * ════════════════════════════════════════════════════════════════════════ */

import {
  METALS, MATERIALS, MAX_TIER, SHAPES, CONS, VOWS, ERAS, EPOCH, HOUSES, CONDS,
  RARITIES,   TITLES, TITLE_LEVELS,
} from "./data.js";
import { METAL_BASE_VALUE, SHINY_VALUE_MUL, CONDITION_STEP, XP, MATERIAL } from "../../shared/tuning.js";

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
 * needs reproducibility from a coin seed (the face, the name, the lore). */
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
  // Rarity: explicit override (the server's roll, stored with the coin),
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
/* ─── drawing a coin ───────────────────────────────────────────────────
 * Pixel art, after hand-drawn coin sprites: a seven-step tone ramp per
 * metal (or material), a dark outline, a bevelled rim lit from the top
 * left, the face embossed (raised pixels catch the light on their top-left
 * edges and cast one pixel of shadow down-right), two gloss streaks. No
 * gradients, no anti-aliasing: every pixel is one of the ramp's colours.
 *
 * The face is genFace's 13 × 13, mirror-symmetric by construction, laid on
 * cells that alternate 4 and 3 pixels (4,3,4,…,4 = 46): a palindrome, so
 * the face stays symmetric and sits exactly centred on the 64-pixel coin.
 * Shapes are tested at pixel centres about the coin's centre, so they are
 * symmetric too. Only the light (and the gloss) is one-sided, on purpose.
 *
 * opts.turn  how wide the coin shows as it spins (64 = face on, ~4 = edge)
 * opts.back  draw the reverse: a plain field and the mint's mark */
const SZ = 64;
const CELLS = [4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4];
const CELL_AT = (() => { const at = new Int8Array(SZ).fill(-1); let p = (SZ - 46) / 2; CELLS.forEach((w, i) => { for (let k = 0; k < w; k++) at[p + k] = i; p += w; }); return at; })();
const MINT = ["#...#", "##.##", "#.#.#", "#...#", "#...#"];         // the mint's mark: an M
const MINT_CELLS = [4, 3, 4, 3, 4];
const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgbCss = c => `rgb(${c[0]},${c[1]},${c[2]})`;

/* outline, deep, dark, mid, base, light, glint */
export function coinRamp(coin) {
  const mat = coin.material && MATERIALS[coin.material];
  if (mat) return { ramp: mat.ramp.map(hexRgb), eng: hexRgb(mat.eng), tex: mat.tex, glows: (mat.glows || []).map(hexRgb) };
  const m = METALS[coin.metalIdx], dark = hexRgb(m.dark), mid = hexRgb(m.mid), base = hexRgb(m.base), hl = hexRgb(m.hl);
  return {
    ramp: [mixRgb(dark, [0, 0, 0], 0.55), dark, mixRgb(dark, mid, 0.55), mid, base, hl, mixRgb(hl, [255, 255, 255], 0.5)],
    eng: hexRgb(m.eng), tex: "metal", glows: [],
  };
}

export function inShape(shape, x, y, r) {
  const c = SZ / 2, dx = x + 0.5 - c, dy = y + 0.5 - c;
  const poly = (n, off) => {
    const a = Math.atan2(dy, dx), seg = (Math.PI * 2) / n, t = ((((a - off) % seg) + seg) % seg) - seg / 2;
    return Math.hypot(dx, dy) * Math.cos(t) <= r * Math.cos(seg / 2);
  };
  switch (shape) {
    case "octagonal": return poly(8, Math.PI / 8);
    case "hexagonal": return poly(6, Math.PI / 6);
    case "diamond":   return Math.abs(dx) / (r * 0.78) + Math.abs(dy) / r <= 1;
    case "oval":      return (dx / (r * 0.72)) ** 2 + (dy / r) ** 2 <= 1;
    case "shield": {
      const hw = r * 0.88;
      if (dy < -r || Math.abs(dx) > hw) return false;
      if (dy <= -0.1 * r) return true;
      const k = (dy + 0.1 * r) / (1.1 * r);
      return Math.abs(dx) <= hw * Math.sqrt(Math.max(0, 1 - k * k));
    }
    default: return dx * dx + dy * dy <= r * r;
  }
}

const hashPx = (x, y, s) => ((Math.imul((x * 73856093) ^ (y * 19349663) ^ s, 2654435761) >>> 0) % 1000) / 1000;
/* a material's grain: (x, y, tone) → tone; 7, 8, 9 mean its glows */
const GRAIN = {
  metal: s => (x, y, t) => t + (hashPx(x, y, s) < 0.025 ? -1 : hashPx(x, y, s) > 0.985 ? 1 : 0),
  // ice: a mosaic of blues in 2-pixel tiles, light catching on the
  // diagonals, and frost across the top
  ice: s => (x, y, t) => {
    const h = hashPx(x >> 1, y >> 1, s), h2 = hashPx(x, y, s + 7);
    const frost = y < 11 + Math.round(hashPx(x >> 1, 0, s + 3) * 4);
    if (frost) return h < 0.45 ? 6 : 5;
    let v = t + (h < 0.22 ? -1 : h > 0.8 ? 1 : 0);
    if ((x - y + 64) % 9 === 0 && h2 > 0.45) v = 6;
    return v;
  },
  // lava: plates of dark rock (cells round scattered points), each lit on
  // its top-left, split by cracks that glow yellow at the heart, then
  // orange, then red
  lava: s => {
    // one point in each cell of a 3 × 3 grid, jittered, so plates stay even
    const pts = Array.from({ length: 9 }, (_, i) => [((i % 3) + 0.2 + 0.6 * hashPx(i, 1, s)) * 64 / 3, (Math.floor(i / 3) + 0.2 + 0.6 * hashPx(i, 2, s)) * 64 / 3]);
    return (x, y) => {
      let d1 = 1e9, d2 = 1e9, near = null;
      for (const [px, py] of pts) for (const ox of [-64, 0, 64]) for (const oy of [-64, 0, 64]) {
        const d = Math.hypot(x + 0.5 - px - ox, y + 0.5 - py - oy);
        if (d < d1) { d2 = d1; d1 = d; near = [px + ox, py + oy]; } else if (d < d2) d2 = d;
      }
      const gap = d2 - d1;
      if (gap < 1.3) return 7;
      if (gap < 2.7) return 8;
      if (gap < 4.0) return 9;
      const lit = (x - near[0]) + (y - near[1]);
      return lit < -4 ? 5 : lit < 3 ? 4 : 3;
    };
  },
  plain: () => (x, y, t) => t,
};

/* Paint a coin, face on, into a 64 × 64 canvas (kept: a coin that turns
 * is drawn many times a second). */
const painted = new Map();
function paintCoin(coin, back = false) {
  const key = `${coin.seed}:${coin.metalIdx}:${coin.shape}:${coin.material || ""}:${coin.shiny ? 1 : 0}:${back ? 1 : 0}`;
  if (painted.has(key)) return painted.get(key);
  const out = paintFresh(coin, back);
  if (painted.size > 400) painted.delete(painted.keys().next().value);
  painted.set(key, out);
  return out;
}
function paintFresh(coin, back) {
  const off = document.createElement("canvas"); off.width = SZ; off.height = SZ;
  const g = off.getContext("2d"), img = g.createImageData(SZ, SZ), d = img.data;
  const { ramp: R, eng, tex, glows } = coinRamp(coin);
  const grain = GRAIN[tex || "metal"]((coin.seed >>> 0) % 997);
  const r = SZ / 2 - 1, mid = SZ / 2;
  const holed = coin.shape === "holed";
  const ring = (x, y) => Math.hypot(x + 0.5 - mid, y + 0.5 - mid);
  const inside = (x, y, rr) => inShape(coin.shape, x, y, rr) && !(holed && ring(x, y) <= 5.5);
  const face = back ? null : genFace(coin.seed);
  const faceAt = (x, y) => {
    if (back) {
      // the mint's mark, centred on its own 4/3 cells
      const o = (SZ - 18) / 2, fx = x - o, fy = y - o;
      if (fx < 0 || fy < 0 || fx >= 18 || fy >= 18) return 0;
      let cx = 0, cy = 0, a = 0; while (a + MINT_CELLS[cx] <= fx) a += MINT_CELLS[cx++];
      a = 0; while (a + MINT_CELLS[cy] <= fy) a += MINT_CELLS[cy++];
      return MINT[cy][cx] === "#" ? 1 : 0;
    }
    if (x < 0 || y < 0 || x >= SZ || y >= SZ) return 0;
    const fx = CELL_AT[x], fy = CELL_AT[y];
    return fx < 0 || fy < 0 ? 0 : face[fy][fx];
  };
  const set = (x, y, c) => { const i = (y * SZ + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };

  for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) {
    if (!inside(x, y, r)) continue;
    const lit = (x - mid) + (y - mid);                         // < 0 toward the light, top left
    const outer = !inShape(coin.shape, x, y, r - 1) || (holed && ring(x, y) <= 6.5);
    const rim = !inShape(coin.shape, x, y, r - 4) || (holed && ring(x, y) <= 8.5);
    const lip = !inShape(coin.shape, x, y, r - 5) || (holed && ring(x, y) <= 9.5);
    let t;
    if (outer) t = 0;
    else if (rim) t = lit < -16 ? 5 : lit < 0 ? 4 : lit < 16 ? 3 : 2;
    else if (lip) t = lit < 0 ? 2 : 4;                         // the step down to the field
    else {
      t = grain(x, y, lit < 4 ? 4 : 3);
      const v = faceAt(x, y);
      if (v === 1) t = faceAt(x - 1, y) !== 1 || faceAt(x, y - 1) !== 1 ? 6 : 5;
      else if (v === 2) { set(x, y, faceAt(x + 1, y + 1) === 2 ? eng : mixRgb(eng, R[1], 0.35)); continue; }
      else if (faceAt(x - 1, y - 1) === 1 || faceAt(x - 1, y) === 1 && faceAt(x, y - 1) === 1) t = 2;   // shadow down-right
      // two gloss streaks across the upper left
      const u = x + y;
      if ((u === 24 || u === 25 || u === 29) && x > 10 && y > 10 && v !== 1) t = Math.min(6, t + 1);
    }
    if (t >= 7 && glows[t - 7]) { set(x, y, glows[t - 7]); continue; }
    set(x, y, R[Math.max(0, Math.min(6, t))]);
  }
  g.putImageData(img, 0, 0);
  if (coin.shiny) shine(g, coin);
  return off;
}

function shine(c, coin) {
  const clipShape = () => {
    c.beginPath();
    for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) if (inShape(coin.shape, x, y, SZ / 2 - 1)) c.rect(x, y, 1, 1);
  };

  // Shiny: an iridescent film in hard diagonal pixel bands, faint enough
  // that the metal still reads. Fixed per coin; the moving glint and the
  // twinkles are drawn over it by lib/aura.js.
  {
    c.save(); clipShape(); c.clip();
    const film = ["rgba(120,230,255,.15)", null, "rgba(255,120,220,.13)", null, "rgba(255,230,120,.15)", null];
    const o = (coin.seed >>> 3) % 6;
    for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) {
      const band = film[(Math.floor((x + y) / 8) + o) % film.length];
      if (band) { c.fillStyle = band; c.fillRect(x, y, 1, 1); }
    }
    c.restore();
  }
}

export function drawCoin(canvas, coin, px, opts = {}) {
  const off = paintCoin(coin, !!opts.back);
  if (canvas.width !== px) canvas.width = px;
  if (canvas.height !== px) canvas.height = px;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, px, px);
  const w = Math.round(opts.turn ?? SZ);
  if (w >= SZ) { ctx.drawImage(off, 0, 0, px, px); return; }

  // turning: columns gathered toward the middle (whole pixels, nearest),
  // the coin's edge showing on the side turned away; edge-on, just a band
  const { ramp: R } = coinRamp(coin);
  const tmp = document.createElement("canvas"); tmp.width = SZ; tmp.height = SZ;
  const t2 = tmp.getContext("2d");
  const x0 = Math.round((SZ - w) / 2);
  if (w <= 6) {
    t2.fillStyle = rgbCss(R[0]); t2.fillRect(x0 - 1, 1, w + 2, SZ - 2);
    t2.fillStyle = rgbCss(R[3]); t2.fillRect(x0, 2, w, SZ - 4);
    t2.fillStyle = rgbCss(R[5]); t2.fillRect(x0, 3, 1, SZ - 6);
  } else {
    for (let i = 0; i < w; i++) t2.drawImage(off, Math.floor(((i + 0.5) * SZ) / w), 0, 1, SZ, x0 + i, 0, 1, SZ);
    const side = opts.back ? -1 : 1, band = w < 30 ? 3 : 2;
    const id = t2.getImageData(0, 0, SZ, SZ), dd = id.data;
    for (let y = 0; y < SZ; y++) {
      let edge = -1;
      if (side > 0) { for (let x = SZ - 1; x >= 0; x--) if (dd[(y * SZ + x) * 4 + 3]) { edge = x; break; } }
      else { for (let x = 0; x < SZ; x++) if (dd[(y * SZ + x) * 4 + 3]) { edge = x; break; } }
      if (edge < 0) continue;
      for (let k = 1; k <= band; k++) {
        const x = edge + side * k; if (x < 0 || x >= SZ) continue;
        const col = k === band ? R[0] : R[2], i = (y * SZ + x) * 4;
        dd[i] = col[0]; dd[i + 1] = col[1]; dd[i + 2] = col[2]; dd[i + 3] = 255;
      }
    }
    t2.putImageData(id, 0, 0);
  }
  ctx.drawImage(tmp, 0, 0, px, px);
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
  const matMul   = c.material ? MATERIAL.valueMul : 1;
  return Math.max(1, Math.round(base * condMul * shinyMul * rarMul * matMul));
}

export function vaultMarks(coins) {
  return coins.reduce((s, c) => s + coinValue(c), 0);
}

/* ─── UNLOCKED TITLES ─────────────────────────────────────────────────── */
export function unlockedTitles(level) {
  return TITLES.filter((_, i) => level >= TITLE_LEVELS[i]);
}
