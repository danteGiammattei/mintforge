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
 * present(tier)      → one canvas, 32 × 32, closed: for tiles and slots */

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

export function presentParts(tier) {
  const key = tier | 0;
  if (!kept.has(key)) kept.set(key, paint(key));
  return kept.get(key);
}

const whole = new Map();
export function present(tier) {
  const key = tier | 0;
  if (whole.has(key)) return whole.get(key);
  const { box, lid } = presentParts(key), c = canvas(32, 32), g = c.getContext("2d");
  g.drawImage(box, 0, PRESENT.boxY); g.drawImage(lid, 0, 0);
  whole.set(key, c);
  return c;
}
