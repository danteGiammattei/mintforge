/* ══════════════════════════════════════════════════════════════════════
 *  chestArt — the drawn chests
 *  ────────────────────────────────────────────────────────────────────
 *  One sheet per tier in public/sprites/chests/ (see tools/chest/README.md
 *  for where they came from and how to replace one). Six frames, each
 *  40 px wide, standing on the bottom edge: closed, lid lifted a pixel,
 *  a crack, half, nearly, open.
 *
 *  The sheets are lit by a candle, low and left, in front — the light of
 *  the satchel and of the opening, so there they are shown as drawn. In
 *  the doorway the only light is the cold slot behind him, so the same
 *  frames are graded down: darker, colder, and darkest away from the
 *  light. Never resampled; shown at whole-number scales only.
 *
 *  If a sheet fails to load, that tier falls back to the procedural chest
 *  in forms.js. Call loadChestArt() before the first chest is drawn.
 * ══════════════════════════════════════════════════════════════════════ */

export const CHEST_W = 40;
export const FRAMES = 6;
export const OPEN_FRAMES = FRAMES;
export const RATTLE = 1, OPEN_FROM = 2;

const sheets = [];
const cache = new Map();
let pending = null;

function load(src) {
  return new Promise(ok => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });
}

export function loadChestArt() {
  pending ||= Promise.all([0, 1, 2, 3, 4].map(t => load(`/sprites/chests/chest-${t}.png`)))
    .then(imgs => { imgs.forEach((im, t) => { sheets[t] = im; }); return imgs.every(Boolean); });
  return pending;
}
export const chestArtReady = tier => !!sheets[tier];
export const chestHeight = tier => sheets[tier]?.height || 0;

/* The doorway's grade: a cold, dim version of the candle-lit drawing,
 * darker toward the bottom right, away from the slot. */
function grade(cv) {
  const g = cv.getContext("2d"), d = g.getImageData(0, 0, cv.width, cv.height);
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    const i = (y * cv.width + x) * 4;
    if (!d.data[i + 3]) continue;
    // half its own colour (so the tiers still read), half cold grey
    const away = 0.7 - 0.3 * ((x / cv.width) * 0.6 + (y / cv.height) * 0.4);
    const r = d.data[i], gr = d.data[i + 1], b = d.data[i + 2];
    const lum = r * 0.3 + gr * 0.55 + b * 0.15;
    d.data[i]     = away * (r * 0.5 + lum * 0.36);
    d.data[i + 1] = away * (gr * 0.5 + lum * 0.45);
    d.data[i + 2] = away * (b * 0.5 + lum * 0.55);
  }
  g.putImageData(d, 0, 0);
  return cv;
}

/* One frame, of one tier, by one light ("candle" or "slot"). */
export function chestFrame(tier, light, i) {
  const im = sheets[tier];
  if (!im) return null;
  const f = Math.max(0, Math.min(FRAMES - 1, i)), key = `${tier}:${light}:${f}`;
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement("canvas");
  cv.width = CHEST_W; cv.height = im.height;
  cv.getContext("2d").drawImage(im, f * CHEST_W, 0, CHEST_W, im.height, 0, 0, CHEST_W, im.height);
  if (light === "slot") grade(cv);
  cache.set(key, cv);
  return cv;
}
export const chestClosed = (tier, light) => chestFrame(tier, light, 0);
export const chestOpening = (tier, light, i) => chestFrame(tier, light, i);
