/* ══════════════════════════════════════════════════════════════════════
 *  chestArt — the chest, from Frakassets' sheets, lit by this game
 *  ────────────────────────────────────────────────────────────────────
 *  The art is "Wooden chest" by Frakassets (CC BY 4.0; credit shown in
 *  Profile, terms in public/sprites/chest/). It ships as flat colours and
 *  a normal map, which is what lets it follow the rule every other
 *  sprite here follows: lit by the scene's own named light, not its own.
 *
 *  Sheets are 32×32 frames, two rows: Close (6 frames, the last is the
 *  chest shut) and Open (10 frames: the lid rattles, flies up, settles).
 *
 *  Materials: the art uses exactly four flat colours — light wood, dark
 *  wood, metal, and the gold of the lock and what is inside. Each chest
 *  tier swaps those four, so five chests come out of one drawing, and a
 *  chest in the doorway is the same chest seen by colder light.
 *
 *  If the sheets fail to load, chests fall back to the procedural ones in
 *  forms.js. Call loadChestArt() before the first chest is drawn.
 * ══════════════════════════════════════════════════════════════════════ */

import { LIGHT } from "./pixelform.js";

export const CHEST_FRAME = 32;
export const CLOSED = { row: 0, col: 5 };
export const OPEN_FRAMES = 10;

// the four flat colours in the art, and what each tier makes of them
const KEYS = ["c08a50", "623a2c", "8a90a2", "ffe070"];          // wood, dark wood, metal, gold
const TIERS = [
  ["c08a50", "623a2c", "8a90a2", "ffe070"],                       // wooden: as drawn
  ["76604e", "3c2c24", "aab2c0", "c8cfdc"],                       // iron: weathered wood, bright steel
  ["963e30", "461e1a", "e6b850", "ffeca0"],                       // gilded: red lacquer, gold bands
  ["463068", "221634", "dcb048", "be8cff"],                       // obsidian: violet-black, gold, a violet lock
  ["222a54", "0e1024", "a0bae6", "8cc8ff"],                       // void: night blue, pale silver, a glowing lock
];
// how much of each material shines by itself (the lock and the hoard)
const EMIT = [0, 0, 0, 0.55];
const LIGHTS = { candle: { rig: LIGHT.candle, tint: [1.08, 0.95, 0.80] }, slot: { rig: LIGHT.slot, tint: [0.72, 0.88, 0.96] } };

let art = null, pending = null;
const cache = new Map();

function pixels(src) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      ok(g.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = fail;
    img.src = src;
  });
}

export function loadChestArt() {
  if (art) return Promise.resolve(true);
  pending ||= Promise.all([pixels("/sprites/chest/chest-albedo.png"), pixels("/sprites/chest/chest-normal.png")])
    .then(([albedo, normal]) => { art = { albedo, normal }; return true; })
    .catch(() => false);
  return pending;
}
export const chestArtReady = () => !!art;

const hex = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

/* One frame, of one tier, under one light. */
export function chestFrame(tier, light, row, col) {
  const key = `${tier}:${light}:${row}:${col}`;
  if (cache.has(key)) return cache.get(key);
  if (!art) return null;
  const F = CHEST_FRAME, cv = document.createElement("canvas");
  cv.width = F; cv.height = F;
  const g = cv.getContext("2d"), out = g.createImageData(F, F);
  const { albedo: A, normal: N } = art, W = A.width;
  const mats = (TIERS[tier] || TIERS[0]).map(hex), keys = KEYS.map(hex);
  const { rig, tint } = LIGHTS[light] || LIGHTS.candle;
  let [lx, ly, lz] = rig; const amb = rig[3], fill = rig[4], rim = rig[5], rp = rig[6];
  const L = Math.hypot(lx, ly, lz); lx /= L; ly /= L; lz /= L;
  const flat = Math.hypot(lx, ly) || 1;

  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    const si = ((row * F + y) * W + col * F + x) * 4, di = (y * F + x) * 4;
    if (A.data[si + 3] < 8) continue;
    // which of the four materials this pixel is
    let m = 0, best = 1e9;
    for (let k = 0; k < 4; k++) {
      const d = Math.abs(A.data[si] - keys[k][0]) + Math.abs(A.data[si + 1] - keys[k][1]) + Math.abs(A.data[si + 2] - keys[k][2]);
      if (d < best) { best = d; m = k; }
    }
    // the surface's facing, from the normal map (x right, y up, z out) into
    // the rigs' space (y down)
    let nx = N.data[si] / 127.5 - 1, ny = -(N.data[si + 1] / 127.5 - 1), nz = N.data[si + 2] / 127.5 - 1;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const dif = Math.max(0, nx * lx + ny * ly + nz * lz);
    const edge = Math.pow(1 - Math.max(0, nz), rp) * Math.max(0, (nx * lx + ny * ly) / flat);
    let k = amb + fill * dif + rim * Math.max(0, edge);
    k = Math.max(k, EMIT[m] * (light === "slot" ? 0.7 : 1));
    k = Math.round(Math.min(1.25, k) * 5) / 5;                       // six tones, as pixelform quantises
    const c = mats[m];
    out.data[di]     = Math.min(255, c[0] * k * tint[0]);
    out.data[di + 1] = Math.min(255, c[1] * k * tint[1]);
    out.data[di + 2] = Math.min(255, c[2] * k * tint[2]);
    out.data[di + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  cache.set(key, cv);
  return cv;
}
export const chestClosed = (tier, light) => chestFrame(tier, light, CLOSED.row, CLOSED.col);
export const chestOpening = (tier, light, i) => chestFrame(tier, light, 1, Math.max(0, Math.min(OPEN_FRAMES - 1, i)));
