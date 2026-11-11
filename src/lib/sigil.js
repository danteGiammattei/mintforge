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
 *  Thresholds below are first guesses and want tuning against real
 *  drawings, not reasoning.
 * ══════════════════════════════════════════════════════════════════════ */

export const RARITY = [
  { n: "COMMON",    c: "#8a8372", w: 55   },
  { n: "UNCOMMON",  c: "#7ad888", w: 28   },
  { n: "RARE",      c: "#80c0ff", w: 11   },
  { n: "EPIC",      c: "#c080ff", w: 4.5  },
  { n: "LEGENDARY", c: "#f0c850", w: 1.3  },
  { n: "MYTHIC",    c: "#ff7060", w: 0.2  },
];

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

  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, ink = 0;
  const speeds = [];
  for (const s of strokes) {
    for (let i = 0; i < s.length; i++) {
      const p = s[i];
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
      if (i) {
        const d = Math.hypot(p.x - s[i - 1].x, p.y - s[i - 1].y);
        const dt = Math.max(8, p.t - s[i - 1].t);
        ink += d;
        if (d > 0.4) speeds.push(d / dt);
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
    speedCV: cv(speeds),
    seed: hashStrokes(strokes),
    signature: signature(grid),
  };
}

/* ─── which traits a drawing has ──────────────────────────────────── */
export function traitsOf(a) {
  if (!a) return [];
  const out = [];
  const filled = a.grid.reduce((s, v) => s + v, 0);

  // mirrored overlap, left against right
  let both = 0, either = 0;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const p = a.grid[y * GRID + x], q = a.grid[y * GRID + (GRID - 1 - x)];
    if (p || q) either++;
    if (p && q) both++;
  }
  if (either && both / either > 0.62) out.push("symmetric");

  if (enclosedCells(a.grid) > 2) out.push("closed");
  if (a.strokes.length === 1) out.push("continuous");
  if (crossings(a.strokes) >= 4) out.push("woven");
  if (filled / (GRID * GRID) < 0.17) out.push("sparse");
  if (a.speedCV > 0 && a.speedCV < 0.58) out.push("deliberate");
  if (a.sheetFrac > 0.46) out.push("vast");

  return out;
}

/* ─── the roll ────────────────────────────────────────────────────────
 * recent: signatures of the player's last few scrolls, so the same
 * sigil drawn over and over stops paying. The goblin has seen it. */
export function rollScroll(a, recent = []) {
  if (!a) return null;
  const rng = rnd(a.seed);

  // baseline: weighted, from the drawing's own seed
  const tot = RARITY.reduce((s, r) => s + r.w, 0);
  let roll = rng() * tot, rarity = 0;
  for (let i = 0; i < RARITY.length; i++) { roll -= RARITY[i].w; if (roll <= 0) { rarity = i; break; } }

  // traits bump, sometimes. the ones that land are the ones he can mention
  const traits = traitsOf(a), bumped = [];
  for (const t of traits) {
    if (rng() < 0.42 && rarity < RARITY.length - 1) { rarity++; bumped.push(t); }
  }

  // effort nudges quietly: a two-second dot should not pay like a sigil
  const effort = Math.min(1, a.ink / 420);
  if (rng() < effort * 0.28 && rarity < RARITY.length - 1) rarity++;

  // a near-copy of something recent is worth much less
  const familiar = recent.some(sig => similarity(sig, a.signature) > 0.86);
  if (familiar) { rarity = Math.max(0, rarity - 2); bumped.length = 0; }

  return { rarity, traits, bumped, familiar, ink: a.ink, seed: a.seed, signature: a.signature };
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
function cv(xs) {
  if (xs.length < 4) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  if (!m) return 0;
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / xs.length;
  return Math.sqrt(v) / m;
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
