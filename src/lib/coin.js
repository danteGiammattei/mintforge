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
  METALS, METAL, MATERIALS, CONSTELLATIONS, MAX_TIER, SHAPES, CONS, VOWS, ERAS, EPOCH, HOUSES, CONDS,
  RARITIES,   TITLES, TITLE_LEVELS,
} from "./data.js";
import { METAL_BASE_VALUE, SHINY_VALUE_MUL, CONDITION_STEP, XP, MATERIAL, ASTRAL } from "../../shared/tuning.js";

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
 * opts.back  draw the reverse: a plain field and the mint's mark
 * opts.phase where a moving texture (void) is in its loop, 0 … SPACE_LOOP-1 */
const SZ = 64;
const CELLS = [4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4];
const CELL_AT = (() => { const at = new Int8Array(SZ).fill(-1); let p = (SZ - 46) / 2; CELLS.forEach((w, i) => { for (let k = 0; k < w; k++) at[p + k] = i; p += w; }); return at; })();
// how far into its cell each pixel row (or column) is: 0 is the cell's first
const CELL_OFF = (() => { const off = new Int8Array(SZ).fill(-1); let p = (SZ - 46) / 2; CELLS.forEach(w => { for (let k = 0; k < w; k++) off[p + k] = k; p += w; }); return off; })();
const MINT = ["#...#", "##.##", "#.#.#", "#...#", "#...#"];         // the mint's mark: an M
const MINT_CELLS = [4, 3, 4, 3, 4];
const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgbCss = c => `rgb(${c[0]},${c[1]},${c[2]})`;

/* metals with a texture of their own: void is a piece of night sky,
 * dithered nebula and stars (glows: white star, blue star, nebula) */
const METAL_LOOK = {
  // ice and lava take their colours from the reference textures
  [METAL.ice]:  { tex: "ice",  ramp: ["#1a5a8a", "#2a86c8", "#46a8e8", "#5cbef6", "#6acefc", "#aaebfb", "#f4fdff"] },
  [METAL.lava]: { tex: "lava", ramp: ["#1e0802", "#3c1204", "#501703", "#5b1e05", "#6a2206", "#782007", "#94320c"],
                  glows: ["#ffd23a", "#f78f0d", "#f65111", "#cd1605"] },
  // fire: a coin of living flame, white-gold at the bottom through orange
  // and red to ember at the top, the bands licking upward as it burns
  [METAL.fire]: { tex: "fire", ramp: ["#1a0402", "#3a0c04", "#6a1808", "#a02a0c", "#d04a14", "#f07a24", "#ffd060"],
                  glows: ["#fff2b0", "#ffb030", "#e8501a"] },
  [METAL.void]: { tex: "space", glows: ["#eef4ff", "#3a86f0", "#2c1a50"] },
  // eldritch: cracked through, something green showing in the crack
  [METAL.eldritch]: { crack: true },
};

/* outline, deep, dark, mid, base, light, glint */
export function coinRamp(coin) {
  const mat = coin.material && MATERIALS[coin.material];
  if (mat) return { ramp: mat.ramp.map(hexRgb), eng: hexRgb(mat.eng), tex: mat.tex, glows: (mat.glows || []).map(hexRgb) };
  const look = METAL_LOOK[coin.metalIdx];
  if (look?.ramp) return { ramp: look.ramp.map(hexRgb), eng: hexRgb(METALS[coin.metalIdx].eng), tex: look.tex, glows: (look.glows || []).map(hexRgb) };
  const m = METALS[coin.metalIdx], dark = hexRgb(m.dark), mid = hexRgb(m.mid), base = hexRgb(m.base), hl = hexRgb(m.hl);
  return {
    ramp: [mixRgb(dark, [0, 0, 0], 0.55), dark, mixRgb(dark, mid, 0.55), mid, base, hl, mixRgb(hl, [255, 255, 255], 0.5)],
    eng: hexRgb(m.eng), tex: METAL_LOOK[coin.metalIdx]?.tex || "metal", glows: (METAL_LOOK[coin.metalIdx]?.glows || []).map(hexRgb),
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
  // ice: a pale mosaic in 2-pixel tiles, mostly the base blue, flecked
  // lighter and deeper, light catching on the diagonals, frost on top
  ice: s => (x, y, t) => {
    const h = hashPx(x >> 1, y >> 1, s), h2 = hashPx(x, y, s + 7);
    const frost = y < 11 + Math.round(hashPx(x >> 1, 0, s + 3) * 4);
    if (frost) return h < 0.5 ? 6 : 5;
    let v = 4 + (h < 0.16 ? -1 : h > 0.84 ? 1 : 0);
    if (t < 4 && h < 0.4) v--;                                  // the side away from the light
    if ((x - y + 64) % 7 === 0 && h2 > 0.55) v = 6;
    return v;
  },
  // lava: plates of dark mottled rock round scattered points (a jittered
  // 3 × 3 grid, so they stay even), each lit on its top-left, split by
  // thick cracks: yellow at the heart, then amber, orange, red
  lava: s => {
    const pts = Array.from({ length: 9 }, (_, i) => [((i % 3) + 0.2 + 0.6 * hashPx(i, 1, s)) * 64 / 3, (Math.floor(i / 3) + 0.2 + 0.6 * hashPx(i, 2, s)) * 64 / 3]);
    return (x, y) => {
      let d1 = 1e9, d2 = 1e9, near = null;
      for (const [px, py] of pts) for (const ox of [-64, 0, 64]) for (const oy of [-64, 0, 64]) {
        const d = Math.hypot(x + 0.5 - px - ox, y + 0.5 - py - oy);
        if (d < d1) { d2 = d1; d1 = d; near = [px + ox, py + oy]; } else if (d < d2) d2 = d;
      }
      const gap = d2 - d1;
      if (gap < 1.2) return 7;
      if (gap < 2.3) return 8;
      if (gap < 3.3) return 9;
      if (gap < 4.4) return 10;
      const lit = (x - near[0]) + (y - near[1]);
      const mottle = hashPx(x >> 1, y >> 1, s) < 0.3 ? -1 : 0;
      return (lit < -5 ? 5 : lit < 3 ? 4 : 3) + mottle;
    };
  },
  // void: night sky. Nebula in checker-dithered diagonal drifts, single
  // stars white and blue, and a few that shine in a cross
  // `phase` (0 … SPACE_LOOP-1) moves it: the nebula drifts along its
  // diagonal and the stars twinkle, looping without a seam
  space: (s, phase = 0) => {
    const crosses = Array.from({ length: 3 }, (_, i) => [8 + Math.floor(hashPx(i, 5, s) * 48), 8 + Math.floor(hashPx(i, 6, s) * 48)]);
    const turn = (phase / SPACE_LOOP) * Math.PI * 2;
    return (x, y, t) => {
      for (const [i, [cx, cy]] of crosses.entries()) {
        const lit = (phase + i * 5) % SPACE_LOOP < SPACE_LOOP / 2;
        if (x === cx && y === cy) return lit ? 7 : 8;
        if (lit && Math.abs(x - cx) + Math.abs(y - cy) === 1) return 8;
      }
      const h = hashPx(x, y, s);
      if (h > 0.988) return (Math.floor(h * 1e5) + phase) % 6 === 0 ? 8 : 7;   // now and then a star dims
      if (h > 0.976) return (Math.floor(h * 1e5) + phase) % 7 === 0 ? t - 1 : 8;
      const n = Math.sin((x + y) * 0.17 + s - turn) + 0.8 * Math.sin((x - y) * 0.07 - s * 0.5 + turn);
      if (n > 0.95) return (x + y) % 2 ? 9 : t;
      if (n > 0.45) return (x % 2 === 0 && y % 2 === 0) ? 9 : t - 1;
      return t - 1;
    };
  },  // fire: bands of flame, hottest at the bottom, their edges licking up;
  // `phase` moves the licks, looping like the void's sky
  fire: (s, phase = 0) => {
    const turn = (phase / SPACE_LOOP) * Math.PI * 2;
    return (x, y, t) => {
      const h = (SZ - y) + 3.5 * Math.sin(x * 0.42 + s - turn * 2) + 2 * Math.sin(x * 0.95 - s + turn * 3);
      if (h < 16) return 7;
      if (h < 27) return 8;
      if (h < 39) return 9;
      return t - 1;
    };
  },
  plain: () => (x, y, t) => t,
};
export const GRAIN_NAMES = Object.keys(GRAIN);

/* Paint a coin, face on, into a 64 × 64 canvas (kept: a coin that turns
 * is drawn many times a second). */
/* The shape a coin is drawn in: an astral coin with a sign is always a
 * pointed hexagon, a badge of the sky; anything else, its own shape. */
export const shapeOf = coin => (coin.metalIdx === METAL.astral && coin.sign != null ? "hexagonal" : coin.shape);

/* ─── the astral series ────────────────────────────────────────────────
 * A badge of the sky: a pointed hexagon, a cream frame studded with
 * stars, a deep teal field that darkens toward the middle in stepped
 * bands, the sign's glyph above, its constellation large in the middle,
 * and its name lettered along the bottom. No face: the sign is the
 * figure. The back is the field and the glyph, large. */
const ZODIAC = [
  [".##.##.", "#..#..#", "#..#..#", "...#...", "...#...", "...#...", "...#..."],   // Aries
  ["#.....#", ".#...#.", "..###..", ".#...#.", ".#...#.", ".#...#.", "..###.."],   // Taurus
  ["#######", ".#...#.", ".#...#.", ".#...#.", ".#...#.", ".#...#.", "#######"],   // Gemini
  ["..####.", ".#.....", "#.##...", ".......", "...##.#", ".....#.", ".####.."],   // Cancer
  ["..##...", ".#..#..", ".#..#..", "..#.#..", "....#..", "....#.#", ".....#."],   // Leo
  ["#.#.#..", "##.#.#.", "#..#.#.", "#..#.##", "#..#.##", "#..#.#.", "....#.."],   // Virgo
  ["..###..", ".#...#.", ".#...#.", "##...##", ".......", "#######", "......."],   // Libra
  ["#.#.#..", "##.#.#.", "#..#.#.", "#..#.#.", "#..#.#.", ".....##", "....###"],   // Scorpio
  ["...####", ".....##", "....#.#", "...#...", "#.#....", ".#.....", "#.#...."],   // Sagittarius
  ["#...#..", ".#.#.#.", "..#..#.", ".....#.", "....##.", "...#.#.", "....#.."],   // Capricorn
  [".......", ".#.#.#.", "#.#.#.#", ".......", ".#.#.#.", "#.#.#.#", "......."],   // Aquarius
  ["#.....#", ".#...#.", ".#...#.", "#######", ".#...#.", ".#...#.", "#.....#"],   // Pisces
];
/* 3 × 5 capitals, for the signs' names */
const LETTERS = {
  A: [".#.", "#.#", "###", "#.#", "#.#"], B: ["##.", "#.#", "##.", "#.#", "##."], C: [".##", "#..", "#..", "#..", ".##"],
  E: ["###", "#..", "##.", "#..", "###"], G: [".##", "#..", "#.#", "#.#", ".##"], I: ["#", "#", "#", "#", "#"],
  L: ["#..", "#..", "#..", "#..", "###"], M: ["#.#", "###", "###", "#.#", "#.#"], N: ["##.", "#.#", "#.#", "#.#", "#.#"],
  O: [".#.", "#.#", "#.#", "#.#", ".#."], P: ["##.", "#.#", "##.", "#..", "#.."], Q: [".#.", "#.#", "#.#", "##.", ".##"],
  R: ["##.", "#.#", "##.", "#.#", "#.#"], S: [".##", "#..", ".#.", "..#", "##."], T: ["###", ".#.", ".#.", ".#.", ".#."],
  U: ["#.#", "#.#", "#.#", "#.#", "###"], V: ["#.#", "#.#", "#.#", "#.#", ".#."],
};
const SKY = {
  out: [11, 28, 38], frame: [251, 246, 210], frameMid: [226, 216, 160], frameDark: [176, 160, 108],
  bands: [[7, 30, 40], [12, 46, 60], [19, 66, 80], [29, 90, 106], [43, 117, 134], [69, 147, 166], [106, 178, 196]],
  rose: [[255, 216, 230], [244, 160, 192], [212, 120, 152], [138, 68, 98]], roseCut: [90, 42, 64],
  ink: [251, 243, 200], star: [255, 255, 255],
};
function paintAstral(coin, back) {
  const off = document.createElement("canvas"); off.width = SZ; off.height = SZ;
  const g = off.getContext("2d"), img = g.createImageData(SZ, SZ), d = img.data;
  const r = SZ / 2 - 1, mid = SZ / 2, k = r * Math.cos(Math.PI / 6);
  const set = (x, y, c) => { if (x < 0 || y < 0 || x >= SZ || y >= SZ) return; const i = (y * SZ + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  // how far out, 0 at the middle to 1 at the hexagon's edge
  const hexD = (x, y) => {
    const dx = x + 0.5 - mid, dy = y + 0.5 - mid;
    return Math.max(Math.abs(dx), Math.abs(dx * 0.5 + dy * 0.866), Math.abs(dx * -0.5 + dy * 0.866)) / k;
  };
  const inHex = (x, y) => inShape("hexagonal", x, y, r);
  for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) {
    if (!inHex(x, y)) continue;
    const t = hexD(x, y), lit = x - mid + (y - mid);
    if (!inShape("hexagonal", x, y, r - 1)) set(x, y, SKY.out);
    else if (!inShape("hexagonal", x, y, r - 3)) set(x, y, lit < 0 ? SKY.frame : SKY.frameMid);
    else if (!inShape("hexagonal", x, y, r - 4)) set(x, y, SKY.frameDark);
    else {
      // stepped bands, dark at the heart, dithered where they meet
      const q = Math.min(6.999, Math.max(0, (t - 0.05) / 0.82) * 7);
      let b = Math.floor(q);
      if (q - b > 0.7 && (x + y) % 2 && b < 6) b++;
      set(x, y, SKY.bands[b]);
      // an inner line of the frame, dotted
      if (Math.abs(t - 0.79) < 0.02 && (x + y) % 3 === 0) set(x, y, SKY.frameMid);
    }
  }
  // stars set into the frame at the side corners and below
  const stud = (cx, cy, arm) => { set(cx, cy, SKY.star); for (let s = 1; s <= arm; s++) for (const [ax, ay] of [[s, 0], [-s, 0], [0, s], [0, -s]]) set(cx + ax, cy + ay, s === arm ? SKY.frameMid : SKY.frame); };
  stud(Math.round(mid - k + 6) - 1, mid - 9, 2); stud(Math.round(mid + k - 6), mid - 9, 2);
  stud(Math.round(mid - k + 6) - 1, mid + 9, 1); stud(Math.round(mid + k - 6), mid + 9, 1);
  stud(mid - 1, SZ - 9, 1); stud(mid, SZ - 9, 1);

  const glyph = ZODIAC[coin.sign];
  if (back) {
    // the back: the sign's glyph, large
    for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 7; gx++) if (glyph[gy][gx] === "#")
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) set(mid - 11 + gx * 3 + a + 1, mid - 11 + gy * 3 + b + 1, SKY.frame);
  } else {
    // the glyph above, in the frame's cream
    for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 7; gx++) if (glyph[gy][gx] === "#") set(mid - 4 + gx + 1, 8 + gy, SKY.frame);
    // the constellation, large, in the middle: cream lines, and stars that
    // are small cream diamonds with a bright heart
    const con = CONSTELLATIONS[coin.sign];
    const pt = ([u, v]) => [Math.round(14 + u * 36), Math.round(18 + v * 21)];
    for (const [a, b] of con.lines) {
      const [x0, y0] = pt(con.stars[a]), [x1, y1] = pt(con.stars[b]);
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 1; i < n; i++) set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), SKY.frameMid);
    }
    for (const st of con.stars) {
      const [x, y] = pt(st);
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(x + ax, y + ay, SKY.ink);
      set(x, y, SKY.star);
    }
    // and its name along the bottom, with a shadow under it
    const name = [...ASTRAL.signs[coin.sign].toUpperCase()].map(ch => LETTERS[ch]).filter(Boolean);
    const w = name.reduce((n, gl) => n + gl[0].length + 1, -1), y0 = 43;
    for (const [col, dy] of [[SKY.bands[0], 1], [SKY.frame, 0]]) {
      let x = Math.round(mid - w / 2);
      for (const gl of name) {
        for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < gl[0].length; gx++) if (gl[gy][gx] === "#") set(x + gx, y0 + gy + dy, col);
        x += gl[0].length + 1;
      }
    }
  }
  g.putImageData(img, 0, 0);
  return off;
}

const painted = new Map();
export const SPACE_LOOP = 16;                 // frames in the void's loop
function paintCoin(coin, back = false, phase = 0) {
  const key = `${coin.seed}:${coin.metalIdx}:${coin.shape}:${coin.material || ""}:${coin.sign ?? ""}:${coin.shiny ? 1 : 0}:${back ? 1 : 0}:${phase}`;
  if (painted.has(key)) return painted.get(key);
  const out = coin.metalIdx === METAL.astral && coin.sign != null ? paintAstral(coin, back) : paintFresh(coin, back, phase);
  if (coin.shiny && coin.metalIdx === METAL.astral && coin.sign != null) shine(out.getContext("2d"), coin);
  if (painted.size > 900) painted.delete(painted.keys().next().value);
  painted.set(key, out);
  return out;
}
function paintFresh(coin, back, phase) {
  const off = document.createElement("canvas"); off.width = SZ; off.height = SZ;
  const g = off.getContext("2d"), img = g.createImageData(SZ, SZ), d = img.data;
  const { ramp: R, eng, tex, glows } = coinRamp(coin);
  const grain = (GRAIN[tex] || GRAIN.metal)((coin.seed >>> 0) % 997, phase);
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
      if (v === 1) {
        // raised, and carved cell by cell, as the coins always were: each
        // cell's top row catches the light, its bottom row falls in shade;
        // the design's left edges are lit, its right edges dark; and the
        // side of the coin away from the light is a step dimmer
        const row = back ? -1 : CELL_OFF[y], last = back ? -2 : CELLS[CELL_AT[y]] - 1;
        let tt = row === 0 ? 6 : row === last ? 4 : 5;
        if (faceAt(x - 1, y) !== 1 || faceAt(x, y - 1) !== 1) tt = 6;
        else if (faceAt(x + 1, y) !== 1 || faceAt(x, y + 1) !== 1) tt = Math.min(tt, 4);
        if (lit > 18 && tt > 4) tt--;
        t = tt;
      } else if (v === 2) {
        // cut in: shadowed along its top, its own colour below
        const row = back ? 1 : CELL_OFF[y];
        set(x, y, row === 0 || faceAt(x, y - 1) !== 2 ? mixRgb(eng, R[0], 0.45) : eng);
        continue;
      }
      else if (faceAt(x - 1, y - 1) === 1 || faceAt(x - 1, y) === 1 && faceAt(x, y - 1) === 1) t = 2;   // shadow down-right
      // two gloss streaks across the upper left
      const u = x + y;
      if ((u === 24 || u === 25 || u === 29) && x > 10 && y > 10 && v !== 1) t = Math.min(6, t + 1);
    }
    if (t >= 7 && glows[t - 7]) { set(x, y, glows[t - 7]); continue; }
    set(x, y, R[Math.max(0, Math.min(6, t))]);
  }
  g.putImageData(img, 0, 0);
  if (METAL_LOOK[coin.metalIdx]?.crack && !back) crack(g, coin);
  if (coin.shiny) shine(g, coin);
  return off;
}

/* Eldritch: a jagged crack down through the coin, face and all: black
 * at its heart, a sick green light along one lip. Placed by the seed. */
function crack(g, coin) {
  const s = (coin.seed >>> 0) % 997, img = g.getImageData(0, 0, SZ, SZ), d = img.data;
  const set = (x, y, c) => { if (x < 0 || y < 0 || x >= SZ || y >= SZ || !d[(y * SZ + x) * 4 + 3]) return; const i = (y * SZ + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; };
  const pts = [];
  for (let y = 9, i = 0; y <= 55; y += 6, i++) pts.push([Math.round(30 + (hashPx(i, 3, s) - 0.5) * 9), y]);
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    const w = k === 1 || k === pts.length - 1 ? 1 : 2;                 // narrow at the ends
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
      for (let j = 0; j < w; j++) set(x + j, y, [4, 14, 8]);
      set(x + w, y, [128, 255, 176]);
      set(x - 1, y, [10, 40, 22]);
    }
  }
  g.putImageData(img, 0, 0);
}

function shine(c, coin) {
  const clipShape = () => {
    c.beginPath();
    for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) if (inShape(shapeOf(coin), x, y, SZ / 2 - 1)) c.rect(x, y, 1, 1);
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
  const off = paintCoin(coin, !!opts.back, opts.phase || 0);
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
