/* ══════════════════════════════════════════════════════════════════════
 *  tomes — books of sigils to copy
 *  ────────────────────────────────────────────────────────────────────
 *  Every scroll is a copy of a page. Each page is a sigil, drawn here as
 *  lines in a 0…1 square, and a tier: the highest rarity a copy of it can
 *  reach (shared/sigil.js rollScroll). Harder pages go higher. Everyone
 *  has the primer; the rest turn up in chests (CHESTS.tomeChance), a
 *  tome no rarer than its chest.
 *
 *  Pages are plain data so the server judges against exactly what the
 *  client shows. Ids are stored once live, so after this rename none;
 *  add to the end.
 * ══════════════════════════════════════════════════════════════════════ */

const TAU = Math.PI * 2;

/* ─── drawing helpers: each returns one stroke, [[x, y], …] ─────────── */
const arc = (cx, cy, r, a0 = 0, a1 = TAU, n = 28, ry = r) =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * ry]; });
const ring = (cx, cy, r, n = 32) => arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU, n);
const line = (...pts) => pts;
// a regular polygon, point up; `skip` 2 makes a star of it, drawn in one line
const poly = (cx, cy, r, k, skip = 1, turn = -Math.PI / 2) =>
  Array.from({ length: k + 1 }, (_, i) => { const a = turn + TAU * ((i * skip) % k) / k; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
const spiral = (cx, cy, r, turns, n = 48) =>
  Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = -Math.PI / 2 + t * turns * TAU; return [cx + Math.cos(a) * r * t, cy + Math.sin(a) * r * t]; });
const wave = (x0, x1, y, amp, waves, n = 32) =>
  Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [x0 + (x1 - x0) * t, y + Math.sin(t * waves * TAU) * amp]; });
// a star of k points, alternating outer and inner, in one line
const points = (cx, cy, R, r, k, turn = -Math.PI / 2) =>
  Array.from({ length: k * 2 + 1 }, (_, i) => { const a = turn + Math.PI * i / k, d = i % 2 ? r : R; return [cx + Math.cos(a) * d, cy + Math.sin(a) * d]; });
const rays = (cx, cy, r0, r1, k, turn = -Math.PI / 2) =>
  Array.from({ length: k }, (_, i) => { const a = turn + TAU * i / k; return [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]]; });

// an arrow's head at (x, y), pointing along angle `a`, as one stroke
const head = (x, y, a, l = 0.12) => [[x - Math.cos(a - 0.6) * l, y - Math.sin(a - 0.6) * l], [x, y], [x - Math.cos(a + 0.6) * l, y - Math.sin(a + 0.6) * l]];

/* ─── the tomes ───────────────────────────────────────────────────────
 * tier: how rare the tome is (the chest tier it first drops from).
 * look: its cover, for the pixel art (lib/tomeArt.js).
 * The primer and the hedge book are the old alchemists' signs, two or
 * three lines each; the star chart, signs of the heavens; the last two,
 * small circles of binding. Every one is meant to be drawn with a finger. */
const UP = -Math.PI / 2, DOWN = Math.PI / 2;
export const TOMES = [
  {
    id: "primer", name: "THE PRIMER", tier: 0,
    look: { leather: "#5a3a22", trim: "#b08a4a", emblem: "eye" },
    pages: [
      { id: "salt",     name: "SALT",      tier: 2, strokes: [ring(0.5, 0.5, 0.42), line([0.08, 0.5], [0.92, 0.5])] },
      { id: "sulphur",  name: "SULPHUR",   tier: 2, strokes: [poly(0.5, 0.36, 0.28, 3), line([0.5, 0.5], [0.5, 0.96]), line([0.3, 0.78], [0.7, 0.78])] },
      { id: "earth",    name: "EARTH",     tier: 2, strokes: [ring(0.5, 0.5, 0.42), line([0.5, 0.08], [0.5, 0.92]), line([0.08, 0.5], [0.92, 0.5])] },
      { id: "iron",     name: "IRON",      tier: 2, strokes: [ring(0.4, 0.6, 0.3), line([0.61, 0.39], [0.92, 0.08]), head(0.92, 0.08, -Math.PI / 4, 0.22)] },
      { id: "mercury",  name: "MERCURY",   tier: 2, strokes: [arc(0.5, 0.1, 0.18, 0, Math.PI, 16), ring(0.5, 0.48, 0.18, 24), line([0.5, 0.66], [0.5, 0.96]), line([0.34, 0.83], [0.66, 0.83])] },
    ],
  },
  {
    id: "hedge", name: "THE HEDGE BOOK", tier: 1,
    look: { leather: "#2e4a2a", trim: "#8ab060", emblem: "leaf" },
    pages: [
      { id: "copper",  name: "COPPER",       tier: 2, strokes: [ring(0.5, 0.32, 0.26, 28), line([0.5, 0.58], [0.5, 0.96]), line([0.3, 0.78], [0.7, 0.78])] },
      { id: "moon",    name: "THE MOON",     tier: 3, strokes: [[...arc(0.44, 0.5, 0.4, Math.PI * 0.35, Math.PI * 1.65), ...arc(0.6, 0.5, 0.32, Math.PI * 1.45, Math.PI * 0.55, 20)], line([0.84, 0.36], [0.84, 0.64]), line([0.7, 0.5], [0.98, 0.5])] },
      { id: "arrow",   name: "THE ARROW",    tier: 3, strokes: [line([0.08, 0.92], [0.92, 0.08]), head(0.92, 0.08, -Math.PI / 4, 0.26), line([0.12, 0.66], [0.34, 0.88]), line([0.24, 0.54], [0.46, 0.76])] },
      { id: "trident", name: "THE TRIDENT",  tier: 3, strokes: [line([0.5, 0.74], [0.5, 0.06]), [[0.8, 0.06], ...arc(0.5, 0.3, 0.3, 0, Math.PI, 18), [0.2, 0.06]], ring(0.5, 0.86, 0.1, 16)] },
      { id: "knot",    name: "THE KNOT",     tier: 3, strokes: [Array.from({ length: 49 }, (_, i) => { const a = TAU * i / 48; return [0.5 + Math.sin(a) * 0.44, 0.5 + Math.sin(a * 2) * 0.24]; }), line([0.5, 0.08], [0.5, 0.92])] },
    ],
  },
  {
    id: "stars", name: "THE STAR CHART", tier: 2,
    look: { leather: "#1e2a4a", trim: "#7aa0e0", emblem: "star" },
    pages: [
      { id: "pentacle", name: "THE PENTACLE", tier: 3, strokes: [ring(0.5, 0.5, 0.46), poly(0.5, 0.5, 0.44, 5, 2)] },
      { id: "seal",     name: "THE SEAL",     tier: 3, strokes: [poly(0.5, 0.5, 0.46, 3), poly(0.5, 0.5, 0.46, 3, 1, DOWN)] },
      { id: "compass",  name: "THE COMPASS",  tier: 4, strokes: [line([0.5, 0.04], [0.5, 0.96]), line([0.04, 0.5], [0.96, 0.5]), head(0.5, 0.04, UP), head(0.5, 0.96, DOWN), head(0.04, 0.5, Math.PI), head(0.96, 0.5, 0), ring(0.5, 0.5, 0.16, 20)] },
      { id: "watcher",  name: "THE WATCHER",  tier: 4, strokes: [poly(0.5, 0.56, 0.46, 3), [...arc(0.5, 0.62, 0.2, Math.PI, TAU, 14, 0.1), ...arc(0.5, 0.62, 0.2, 0, Math.PI, 14, 0.1)], ring(0.5, 0.62, 0.05, 10)] },
      { id: "vitriol",  name: "VITRIOL",      tier: 4, strokes: [ring(0.26, 0.5, 0.2, 24), ring(0.74, 0.5, 0.2, 24), line([0.04, 0.5], [0.96, 0.5]), line([0.26, 0.3], [0.26, 0.7]), line([0.74, 0.3], [0.74, 0.7])] },
    ],
  },
  {
    id: "ember", name: "THE EMBER CODEX", tier: 3,
    look: { leather: "#5a1a14", trim: "#e0703a", emblem: "flame" },
    pages: [
      { id: "kindling", name: "KINDLING",     tier: 4, strokes: [ring(0.5, 0.5, 0.46), poly(0.5, 0.56, 0.4, 3), poly(0.5, 0.62, 0.14, 3, 1, DOWN)] },
      { id: "crucible", name: "THE CRUCIBLE", tier: 4, strokes: [ring(0.5, 0.5, 0.46), poly(0.5, 0.5, 0.46, 4, 1, -Math.PI / 4), poly(0.5, 0.54, 0.28, 3)] },
      { id: "phoenix",  name: "THE PHOENIX",  tier: 4, strokes: [line([0.5, 0.06], [0.5, 0.94]), head(0.5, 0.06, UP, 0.14), line([0.1, 0.42], [0.9, 0.42]), arc(0.1, 0.42, 0.14, UP, DOWN, 12), arc(0.9, 0.42, 0.14, DOWN, Math.PI * 1.5, 12), ring(0.5, 0.74, 0.12, 16)] },
      { id: "brand",    name: "THE BRAND",    tier: 5, strokes: [ring(0.5, 0.5, 0.46), poly(0.5, 0.5, 0.46, 6, 1, UP), poly(0.5, 0.5, 0.26, 3), poly(0.5, 0.5, 0.26, 3, 1, DOWN)] },
    ],
  },
  {
    id: "grimoire", name: "THE ELDER GRIMOIRE", tier: 4,
    look: { leather: "#1a1424", trim: "#7ad888", emblem: "maw" },
    pages: [
      { id: "elder",   name: "THE ELDER SIGN", tier: 4, strokes: [poly(0.5, 0.52, 0.46, 5, 2), line([0.5, 0.8], [0.5, 0.36]), line([0.5, 0.52], [0.36, 0.36]), line([0.5, 0.52], [0.64, 0.36]), line([0.5, 0.36], [0.44, 0.24]), line([0.5, 0.36], [0.56, 0.24])] },
      { id: "deep",    name: "THE DEEP",       tier: 5, strokes: [ring(0.5, 0.5, 0.46), ring(0.5, 0.5, 0.36), spiral(0.5, 0.5, 0.28, 2)] },
      { id: "maw",     name: "THE MAW",        tier: 5, strokes: [ring(0.5, 0.5, 0.46), ...Array.from({ length: 6 }, (_, i) => { const a = TAU * i / 6; return [[0.5 + Math.cos(a) * 0.46, 0.5 + Math.sin(a) * 0.46], [0.5 + Math.cos(a + 0.6) * 0.2, 0.5 + Math.sin(a + 0.6) * 0.2]]; }), ring(0.5, 0.5, 0.1, 12)] },
      { id: "binding", name: "THE BINDING",    tier: 5, strokes: [ring(0.5, 0.5, 0.46), poly(0.5, 0.5, 0.46, 5, 2), ring(0.5, 0.5, 0.16, 20), ...rays(0.5, 0.5, 0.16, 0.24, 5, DOWN)] },
    ],
  },
];

export const TOME_BY_ID = Object.fromEntries(TOMES.map(t => [t.id, t]));
export const STARTER = "primer";

/* the page a seal names, if the player has that tome */
export function pageOf(tomeId, pageId, owned) {
  if (!owned.includes(tomeId)) return null;
  return TOME_BY_ID[tomeId]?.pages.find(p => p.id === pageId) || null;
}

/* Which tome a chest of `tier` holds, if any: one the player lacks, no
 * rarer than the chest, the chest's own rarity likelier. */
export function tomeFromChest(tier, owned, chance, rand) {
  if (rand() >= (chance[tier] || 0)) return null;
  const can = TOMES.filter(t => t.tier <= tier && t.tier > 0 && !owned.includes(t.id));
  if (!can.length) return null;
  const w = can.map(t => 1 + t.tier * 2), tot = w.reduce((a, b) => a + b, 0);
  let r = rand() * tot;
  for (let i = 0; i < can.length; i++) { r -= w[i]; if (r <= 0) return can[i].id; }
  return can[can.length - 1].id;
}
