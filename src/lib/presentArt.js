/* ─── presents ─────────────────────────────────────────────────────────
 * What an event's chest is while the Long Night lasts (shared/events.js):
 * a wrapped box, tied with ribbon and a bow, snow lying on its lid. Drawn
 * here in the game's pixels until a painted sheet replaces it. Lit like
 * the chests, by the candle low on the left: the left edge catches warm,
 * the right falls away.
 *
 * Paper and ribbon by the chest's tier, the finer the dearer:
 *   0 red, gold ribbon · 1 green, red ribbon · 2 candy stripe, green
 *   ribbon · 3 midnight blue with stars, silver ribbon · 4 gold, red
 *
 * presentParts(tier) → { box, lid }  separate, for the opening (the lid
 *                                      lifts off); both 32 wide, the lid
 *                                      carrying the bow, so 16 tall
 * present(tier)      → one canvas, closed: for tiles and slots; the painted
 *                      present (48 × 40) once loaded, else ours (32 × 32) */

export const PRESENT = { w: 32, h: 32, lidH: 16, boxY: 16 };

const PAPER = [
  { p: ["#5e1614", "#8a2420", "#b8403a"], r: ["#7a5a1c", "#c89a40", "#ecc46e"] },
  { p: ["#16281c", "#24442c", "#3e6a44"], r: ["#5e1614", "#a8302a", "#d8584e"] },
  { p: ["#9a948a", "#d8d2c8", "#f4f0e8"], r: ["#16281c", "#2c5034", "#4e8456"], stripe: ["#7a1e1c", "#b8302a"] },
  { p: ["#141c34", "#26345e", "#3a4c80"], r: ["#7a8494", "#c8d4e8", "#f0f4fa"], stars: "#e8d890" },
  { p: ["#6a4e14", "#b8902e", "#e0c060"], r: ["#5e1614", "#a8302a", "#d8584e"] },
];
const SNOW = ["#9aa8c0", "#d8e2f0", "#f4f8ff"];

const kept = new Map();
const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

// one tone of three, by how far along the width a pixel is from the candle
const shade = (tones, x, w, lift = 0) => tones[Math.max(0, Math.min(2, (x < 2 ? 2 : x > w - 4 ? 0 : 1) + lift))];

function paint(tier) {
  const P = PAPER[Math.max(0, Math.min(PAPER.length - 1, tier | 0))];
  const box = canvas(32, 16), lid = canvas(32, 16);
  const b = box.getContext("2d"), l = lid.getContext("2d");
  const dot = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };

  // the box: 28 wide, set in by 2, standing 16 tall
  for (let y = 0; y < 16; y++) for (let x = 2; x < 30; x++) {
    let c = shade(P.p, x - 2, 28, y < 2 ? 1 : 0);
    if (P.stripe && ((x + y) % 6) < 2) c = x < 4 ? P.stripe[1] : P.stripe[0];
    if (P.stars && ((x * 7 + y * 13) % 23) === 0) c = P.stars;
    dot(b, x, y, c);
  }
  for (let x = 2; x < 30; x++) dot(b, x, 15, P.p[0]);                       // its foot, in shadow
  for (let y = 0; y < 16; y++) { dot(b, 15, y, shade(P.r, 0, 1, 1)); dot(b, 16, y, P.r[1]); }   // the ribbon, down the front

  // the lid: 32 wide, 5 deep, sitting at the foot of this canvas
  const LY = 11;
  for (let y = LY; y < 16; y++) for (let x = 0; x < 32; x++) {
    let c = shade(P.p, x, 32, y === LY ? 1 : 0);
    if (P.stripe && ((x + y) % 6) < 2) c = x < 2 ? P.stripe[1] : P.stripe[0];
    if (y === 15) c = P.p[0];                                                 // its lower lip, shadowed
    dot(l, x, y, c);
  }
  for (let y = LY; y < 16; y++) { dot(l, 15, y, shade(P.r, 0, 1, 1)); dot(l, 16, y, P.r[1]); }
  // snow, lying along the lid, thick in places, a little over the lip
  for (let x = 0; x < 32; x++) {
    const deep = 1 + ((x * 5 + 3) % 7 === 0 ? 1 : 0) + (x > 4 && x < 27 && (x * 3) % 11 === 0 ? 1 : 0);
    for (let k = 0; k < deep; k++) dot(l, x, LY - k, k === deep - 1 ? SNOW[2] : SNOW[1]);
    if ((x * 7) % 9 === 0 && x > 1 && x < 30) dot(l, x, LY + 1, SNOW[1]);
  }
  // the bow, two loops and two tails, on top
  const R = P.r, cx = 15;
  const loop = (dir) => {
    for (let i = 0; i < 6; i++) {
      const x = cx + (dir < 0 ? -1 - i : 2 + i), top = LY - 3 - Math.round(Math.sin((i / 5) * Math.PI) * 4);
      for (let y = top; y < LY - 1; y++) dot(l, x, y, y === top ? R[2] : (dir < 0 ? R[1] : R[0]));
    }
  };
  loop(-1); loop(1);
  dot(l, cx, LY - 3, R[2]); dot(l, cx + 1, LY - 3, R[1]); dot(l, cx, LY - 2, R[1]); dot(l, cx + 1, LY - 2, R[0]);   // the knot
  for (const [x, y] of [[cx - 4, LY - 7], [cx - 3, LY - 7], [cx + 4, LY - 7], [cx + 5, LY - 7]]) dot(l, x, y, SNOW[2]);   // snow on the loops
  return { box, lid };
}

/* ─── the painted presents, when they are there ─────────────────────
 * tools/gifts.mjs puts five strips from cofe-man's Gifts Pixel Animation
 * Pack in public/sprites/gifts/ (kept out of the repo): tierN.png, ten
 * 48×40 frames each, closed, squash, stretch, lid off, sides falling.
 * They are bright as bought, so as they load each frame is put in the
 * game's light: dimmed, a little greyed, warm where the candle low on
 * the left reaches and cold away from it, with snow lying on whatever
 * faces up. Missing, the drawn presents above stand in. */
export const GIFT = { w: 48, h: 40, frames: 10, lidOff: 3 };
const graded = [];                 // by tier: ten canvases, or null
let giftsLoading = null;
export function loadGifts() {
  if (giftsLoading) return giftsLoading;
  if (typeof Image === "undefined") return (giftsLoading = Promise.resolve(false));
  giftsLoading = Promise.all(PAPER.map((_, tier) => new Promise(ok => {
    const im = new Image();
    im.onload = () => { graded[tier] = grade(im); ok(true); };
    im.onerror = () => ok(false);
    im.src = `/sprites/gifts/tier${tier}.png`;
  }))).then(r => r.every(Boolean));
  return giftsLoading;
}
function grade(im) {
  const out = [];
  for (let f = 0; f < GIFT.frames; f++) {
    const c = canvas(GIFT.w, GIFT.h), g = c.getContext("2d");
    g.drawImage(im, f * GIFT.w, 0, GIFT.w, GIFT.h, 0, 0, GIFT.w, GIFT.h);
    const img = g.getImageData(0, 0, GIFT.w, GIFT.h), d = img.data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < GIFT.w && y < GIFT.h && d[(y * GIFT.w + x) * 4 + 3] > 96;
    const up = new Uint8Array(GIFT.w * GIFT.h);
    for (let y = 0; y < GIFT.h; y++) for (let x = 0; x < GIFT.w; x++) if (solid(x, y) && !solid(x, y - 1)) up[y * GIFT.w + x] = 1;
    for (let y = 0; y < GIFT.h; y++) for (let x = 0; x < GIFT.w; x++) {
      const i = (y * GIFT.w + x) * 4;
      if (d[i + 3] <= 96) continue;
      const lum = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
      // the candle: brightest low on the left, falling away up and right
      const k = 0.42 + 0.4 * (1 - x / GIFT.w) * 0.7 + 0.3 * (y / GIFT.h) * 0.6;
      for (let j = 0; j < 3; j++) d[i + j] = Math.round((d[i + j] * 0.78 + lum * 0.22) * k);
      d[i] = Math.min(255, d[i] + 8 * k); d[i + 2] = Math.max(0, d[i + 2] - 6);           // warmed a little
      if (up[y * GIFT.w + x] || (solid(x, y - 1) && up[(y - 1) * GIFT.w + x] && ((x * 7 + y) % 3))) {
        const s = up[y * GIFT.w + x] ? SNOW[2] : SNOW[1];                                   // snow lying on what faces up
        d[i] = parseInt(s.slice(1, 3), 16); d[i + 1] = parseInt(s.slice(3, 5), 16); d[i + 2] = parseInt(s.slice(5, 7), 16);
      }
    }
    g.putImageData(img, 0, 0);
    out.push(c);
  }
  return out;
}
/* frame f of tier's painted present, or null while (or if) there is none */
export const giftFrame = (tier, f) => graded[Math.max(0, Math.min(PAPER.length - 1, tier | 0))]?.[Math.max(0, Math.min(GIFT.frames - 1, f | 0))] || null;
loadGifts();

export function presentParts(tier) {
  const key = tier | 0;
  if (!kept.has(key)) kept.set(key, paint(key));
  return kept.get(key);
}

const whole = new Map();
export function present(tier) {
  const key = tier | 0;
  const painted = giftFrame(key, 0);
  if (painted) return painted;
  if (whole.has(key)) return whole.get(key);
  const { box, lid } = presentParts(key), c = canvas(32, 32), g = c.getContext("2d");
  g.drawImage(box, 0, PRESENT.boxY); g.drawImage(lid, 0, 0);
  whole.set(key, c);
  return c;
}
