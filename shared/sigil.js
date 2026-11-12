/* ══════════════════════════════════════════════════════════════════════
 *  sigil — reading a drawn scroll
 *  ────────────────────────────────────────────────────────────────────
 *  The player draws; this decides what they made. Two rules govern it:
 *
 *  1. It must feel random. Draw a heart, a star and a scribble and the
 *     results should surprise you every time. So the BASELINE rarity is
 *     a seeded roll taken from the stroke data itself — deterministic
 *     (the same drawing always gives the same scroll) but unguessable.
 *
 *  2. It must not be nothing. If the drawing had no influence at all we
 *     could roll dice and skip the canvas. So traits sit ON TOP of the
 *     baseline as occasional bumps, and the traits conflict with each
 *     other, which is what stops the meta being solved in a week.
 *
 *  The player is never told any of this. The goblin alludes to a trait
 *  only when it actually fired, and only ever to praise one — positive
 *  examples with no negatives produce superstition rather than a rule,
 *  which is the texture we want.
 *
 *  This file is pure: no DOM, no clock, no Math.random. The server runs
 *  it to judge a scroll; the client only ever sees the verdict. Every
 *  threshold lives in tuning.js and is tuned with `npm run sim`.
 * ══════════════════════════════════════════════════════════════════════ */

import { SIGIL } from "./tuning.js";

const TH = SIGIL.thresholds;

export const RARITY = [
  { n: "COMMON",    c: "#8a8372" },
  { n: "UNCOMMON",  c: "#7ad888" },
  { n: "RARE",      c: "#80c0ff" },
  { n: "EPIC",      c: "#c080ff" },
  { n: "LEGENDARY", c: "#f0c850" },
  { n: "MYTHIC",    c: "#ff7060" },
].map((r, i) => ({ ...r, w: SIGIL.baseline[i] }));

/* Each trait carries the line the goblin uses for it. The hint lives
 * with the rule so the two can never drift apart. */
export const TRAITS = {
  symmetric:  { hint: "HE SMILES UPON THE HILLS OF SYMMETRY" },
  closed:     { hint: "HE LINGERS ON THE CLOSED SHAPE" },
  continuous: { hint: "A LINE THAT NEVER LIFTED. HE APPROVES" },
  woven:      { hint: "SOMETHING IN THE KNOTS PLEASES HIM" },
  sparse:     { hint: "HE HOLDS IT TO THE LIGHT. THE EMPTINESS SUITS HIM" },
  deliberate: { hint: "NOTHING HERE WAS HURRIED. HE NOTICES" },
  vast:       { hint: "IT BARELY FITS HIS HANDS. HE IS PLEASED" },
};

const GRID = 24;          // the occupancy grid traits are measured on

/* ─── turn raw strokes into something measurable ───────────────────────
 * strokes: [[{x,y,t}, …], …] in sheet pixels
 * sheet:   {w,h} of the drawable area                                */
export function analyse(strokes, sheet) {
  const pts = strokes.flat();
  if (pts.length < 4) return null;

  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, ink = 0, penDown = 0;
  for (const s of strokes) {
    for (let i = 0; i < s.length; i++) {
      const p = s[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (i) {
        ink += Math.hypot(p.x - s[i - 1].x, p.y - s[i - 1].y);
        // a pause mid-stroke is thinking, not drawing: count at most a beat of it
        penDown += Math.min(250, Math.max(4, p.t - s[i - 1].t));
      }
    }
  }
  const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);

  // occupancy grid, normalised to the drawing's own box so an off-centre
  // shape is still judged on its shape
  const grid = new Uint8Array(GRID * GRID);
  const cell = (x, y) => {
    const gx = Math.min(GRID - 1, Math.max(0, Math.floor((x - minX) / bw * GRID)));
    const gy = Math.min(GRID - 1, Math.max(0, Math.floor((y - minY) / bh * GRID)));
    grid[gy * GRID + gx] = 1;
  };
  for (const s of strokes) for (let i = 0; i < s.length; i++) {
    cell(s[i].x, s[i].y);
    if (i) {                                   // fill the gap between samples
      const a = s[i - 1], b = s[i], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
      for (let k = 1; k < n; k++) cell(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n);
    }
  }

  return {
    strokes, ink, grid,
    bbox: { x: minX, y: minY, w: bw, h: bh },
    sheetFrac: (bw * bh) / (sheet.w * sheet.h),
    pace: penDown > 0 ? ink / penDown : 0,          // scene pixels per millisecond, pen down
    seed: hashStrokes(strokes),
    signature: signature(grid),
  };
}

/* ─── which traits a drawing has ──────────────────────────────────────
 * Each is something a person can stumble into and half-notice, and most
 * pull against another: a line that never lifts is rarely symmetric, a
 * page-filling sprawl is never sparse, patience costs time. Thresholds
 * are tuned (npm run sim) so each fires on a minority of drawings. */
export function traitsOf(a) {
  const m = measure(a);
  if (!m) return [];
  const out = [];
  if (m.cells >= TH.symmetricMinCells && m.symmetry > TH.symmetric) out.push("symmetric");
  if (m.enclosed > TH.closed) out.push("closed");                          // a real enclosure, not a scribble's pocket
  if (m.strokes === 1 && m.ink >= TH.continuousInk) out.push("continuous"); // one unbroken stroke, and a long one
  if (m.crossings >= TH.woven) out.push("woven");
  if (m.span > TH.sparseSpan && m.filled < TH.sparse) out.push("sparse");  // a mark or two across a wide stretch
  if (m.ink >= TH.deliberateInk && m.pace > 0 && m.pace < TH.deliberate) out.push("deliberate");
  if (m.span > TH.vast) out.push("vast");
  return out;
}

/* ─── the numbers the traits are read from ────────────────────────────
 * Kept separate from the thresholds so the server can log them for each
 * seal and tools/seal-report.mjs can re-judge real drawings against new
 * thresholds without ever storing a drawing. */
export function measure(a) {
  if (!a) return null;
  const cells = GRID * GRID;
  let both = 0, either = 0, inked = 0;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const p = a.grid[y * GRID + x], q = a.grid[y * GRID + (GRID - 1 - x)];
    if (p) inked++;
    if (p || q) either++;
    if (p && q) both++;
  }
  return {
    cells: either,
    symmetry: either ? both / either : 0,
    enclosed: enclosedCells(a.grid) / cells,
    crossings: crossings(a.strokes),
    filled: inked / cells,
    span: a.sheetFrac,
    pace: a.pace,
    ink: a.ink,
    strokes: a.strokes.length,
  };
}

/* ─── the roll ────────────────────────────────────────────────────────
 * recent: signatures of the player's last few scrolls, so the same
 * sigil drawn over and over stops paying. The goblin has seen it.
 * salt:   mixed into the drawing's seed. The server passes a secret
 * per-player value that moves with every seal, so the roll cannot be
 * searched for offline and a winning drawing cannot be replayed. */
export function rollScroll(a, recent = [], salt = 0) {
  if (!a) return null;
  const seed = (a.seed ^ (salt >>> 0)) >>> 0;
  const rng = rnd(seed);

  // baseline: weighted, from the drawing's own seed
  const tot = RARITY.reduce((s, r) => s + r.w, 0);
  let roll = rng() * tot, rarity = 0;
  for (let i = 0; i < RARITY.length; i++) { roll -= RARITY[i].w; if (roll <= 0) { rarity = i; break; } }

  // a two-second dot should not pay like a sigil: too little ink and the
  // roll often comes to nothing, whatever it would have been
  const effort = Math.min(1, a.ink / SIGIL.effortInk);
  const faint = rng() < (1 - effort) * SIGIL.faintChance;
  if (faint) rarity = 0;

  // traits bump, sometimes — at most a couple, in an order that changes
  // from scroll to scroll. The ones that land are the ones he can mention.
  const traits = traitsOf(a), bumped = [];
  const order = traits.map(t => [rng(), t]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
  for (const t of order) {
    if (bumped.length >= SIGIL.maxBumps || faint) break;
    if (rng() < SIGIL.bump && rarity < RARITY.length - 1) { rarity++; bumped.push(t); }
  }

  // a near-copy of something recent is worth much less
  const familiar = recent.some(sig => similarity(sig, a.signature) > SIGIL.familiar);
  if (familiar) { rarity = Math.max(0, rarity - SIGIL.familiarPenalty); bumped.length = 0; }

  return { rarity, traits, bumped, familiar, ink: a.ink, seed, signature: a.signature };
}

/* ─── measurements ────────────────────────────────────────────────── */

// empty cells the border cannot reach — i.e. the drawing encloses them
function enclosedCells(grid) {
  const seen = new Uint8Array(GRID * GRID), q = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
    const i = y * GRID + x;
    if (seen[i] || grid[i]) return;
    seen[i] = 1; q.push(i);
  };
  for (let i = 0; i < GRID; i++) { push(i, 0); push(i, GRID - 1); push(0, i); push(GRID - 1, i); }
  while (q.length) {
    const i = q.pop(), x = i % GRID, y = (i / GRID) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  let n = 0;
  for (let i = 0; i < grid.length; i++) if (!grid[i] && !seen[i]) n++;
  return n;
}

function crossings(strokes) {
  const segs = [];
  for (const s of strokes) for (let i = 1; i < s.length; i++) segs.push([s[i - 1], s[i], s]);
  let n = 0;
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 2; j < segs.length; j++) {
      if (segs[i][2] === segs[j][2] && j - i < 4) continue;   // ignore neighbours
      if (segCross(segs[i][0], segs[i][1], segs[j][0], segs[j][1])) n++;
    }
  return n;
}
function segCross(p, p2, q, q2) {
  const d = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p, p2, q), d2 = d(p, p2, q2), d3 = d(q, q2, p), d4 = d(q, q2, p2);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
/* a short fingerprint of the drawn shape, for spotting repeats */
function signature(grid) {
  let s = "";
  for (let y = 0; y < GRID; y += 2) {
    let byte = 0;
    for (let x = 0; x < GRID; x += 2) byte = (byte << 1) | (grid[y * GRID + x] ? 1 : 0);
    s += byte.toString(36);
  }
  return s;
}
export function similarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let same = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) same++;
  return same / a.length;
}

function hashStrokes(strokes) {
  let h = 0x811c9dc5;
  for (const s of strokes) {
    for (const p of s) {
      h ^= (p.x | 0) * 0x9e37; h = Math.imul(h, 0x01000193);
      h ^= (p.y | 0) * 0x85eb; h = Math.imul(h, 0x01000193);
    }
    h ^= 0x5bf0; h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
export function rnd(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
