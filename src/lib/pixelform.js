/* ══════════════════════════════════════════════════════════════════════
 *  pixelform — MintForge's shared pixel renderer
 *  ────────────────────────────────────────────────────────────────────
 *  Every character and object in the game is built the same way: as a
 *  set of rounded volumes (capsules and knuckles), rasterised into a
 *  signed distance field, lit by one rig, and quantised to a short tone
 *  ramp. Nothing is drawn with rectangles and nothing carries an
 *  outline — form reads by value alone.
 *
 *  The payoff is that a new asset only needs its skeleton and a ramp.
 *  Lighting, shading, anti-outlining and the chunky silhouette all come
 *  out of the same code, so a sprite made next month matches one made
 *  today without anyone having to eyeball it.
 *
 *  Scale once, at the end. Author every form at a comfortable size and
 *  let `place()` shrink it — rotating or resizing a finished sprite
 *  resamples pixels and smears them, but transforming the geometry and
 *  re-rasterising keeps every pixel on the grid.
 * ══════════════════════════════════════════════════════════════════════ */

/* ─── geometry primitives ─────────────────────────────────────────────
 * A form is { C, J }: capsules (tapered rounded segments, the bones)
 * and joints (spheres, the knuckles). Joints exist so a limb can be
 * knobbly — a joint slightly fatter than the segments either side is
 * what makes a hand read as old rather than moulded. */

export const capsule = (x1, y1, x2, y2, r1, r2 = r1) => ({ x1, y1, x2, y2, r1, r2 });
export const joint   = (x, y, r) => ({ x, y, r });

/* A jointed digit: n segments, each angled a little further than the
 * last, tapering as it goes, with a proud knuckle at every bend.
 *   base   {x,y}      where it leaves the palm
 *   angle  radians    0 is +x, negative is up
 *   lens   [..]       segment lengths, base to tip
 *   r      number     radius at the base
 *   bend   radians    extra rotation per segment (curl)          */
export function digit({ base, angle, lens, r, bend = 0.1, taper = 0.42 }) {
  const C = [], J = [];
  let x = base.x, y = base.y;
  for (let i = 0; i < lens.length; i++) {
    const a = angle + bend * i;
    const nx = x + Math.cos(a) * lens[i];
    const ny = y + Math.sin(a) * lens[i];
    const r1 = r - taper * i;
    C.push(capsule(x, y, nx, ny, r1, Math.max(1.5, r - taper * (i + 1))));
    J.push(joint(x, y, r1 + 0.5));
    x = nx; y = ny;
  }
  J.push(joint(x, y, Math.max(1.4, r - taper * lens.length)));
  return { C, J };
}

export function merge(...forms) {
  const C = [], J = [];
  for (const f of forms) { C.push(...(f.C || [])); J.push(...(f.J || [])); }
  return { C, J };
}

/* ─── placing a form ──────────────────────────────────────────────────
 * Mirror, rotate, scale and offset the SKELETON, never the raster.
 *   mirror  about x = mirrorAxis
 *   angle   radians, clockwise on screen (y down)
 *   pivot   the authored point that everything turns around
 *   at      where that pivot lands in sprite space
 *   scale   applied last                                           */
export function place(form, { mirror = null, angle = 0, pivot = { x: 0, y: 0 }, at = { x: 0, y: 0 }, scale = 1 }) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const pt = (x, y) => {
    let px = mirror === null ? x : mirror - x;
    let dx = px - pivot.x, dy = y - pivot.y;
    return { x: (dx * c - dy * s + at.x) * scale, y: (dx * s + dy * c + at.y) * scale };
  };
  return {
    C: form.C.map(o => {
      const a = pt(o.x1, o.y1), b = pt(o.x2, o.y2);
      return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, r1: o.r1 * scale, r2: o.r2 * scale };
    }),
    J: form.J.map(o => { const a = pt(o.x, o.y); return { x: a.x, y: a.y, r: o.r * scale }; }),
    // where an authored point ended up — for anchoring things in the world
    locate: (x, y) => { const a = pt(x, y); return { x: a.x * 1, y: a.y * 1 }; },
  };
}

/* ─── the distance field ─────────────────────────────────────────── */
export function fieldAt(form, x, y) {
  let d = 1e9;
  for (const c of form.C) {
    const dx = c.x2 - c.x1, dy = c.y2 - c.y1;
    const l2 = dx * dx + dy * dy || 1e-6;
    let t = ((x - c.x1) * dx + (y - c.y1) * dy) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const r = c.r1 + (c.r2 - c.r1) * t;
    const v = Math.hypot(x - (c.x1 + dx * t), y - (c.y1 + dy * t)) - r;
    if (v < d) d = v;
  }
  for (const j of form.J) {
    const v = Math.hypot(x - j.x, y - j.y) - j.r;
    if (v < d) d = v;
  }
  return d;
}

/* ─── light rigs ──────────────────────────────────────────────────────
 * [ lx, ly, lz, ambient, fill, rim, rimPower ]
 *
 * The scene has exactly two sources: the slot of light behind the door,
 * and the goblin's magic when he pulls. Both sit up and to the left, and
 * both are BEHIND what they light — so the rig is mostly rim. A form lit
 * this way is dark through its body with a bright grazing edge, which is
 * how you actually see anything in an unlit room.
 *
 * Raise `fill` to make something read more plainly; raise `rim` and drop
 * `ambient` to push it further into silhouette.                        */
export const LIGHT = {
  // the goblin, in the doorway, with the slot behind him
  slot:    [-0.62, -0.66, 0.44, 0.19, 0.28, 0.92, 1.5],
  // the player's side of the door, where no light reaches
  unlit:   [-0.64, -0.54, 0.46, 0.12, 0.15, 0.86, 1.8],
  // anything caught in his pull — brighter, because it IS the source
  magic:   [-0.70, -0.60, 0.40, 0.16, 0.30, 0.95, 1.4],
  // an object held out in the slot's edge light
  carried: [-0.62, -0.66, 0.44, 0.15, 0.20, 0.86, 1.5],
};

/* ─── tone ramps ──────────────────────────────────────────────────────
 * Short ramps, dark ends, cold throughout. The top entry is the rim and
 * is always the coolest colour in the ramp — it is the doorway's light,
 * not the object's own. Keep ramps to six; more just muddies the bands
 * that give the art its shape. */
export const RAMP = {
  goblin:      ["#0d1314", "#17201f", "#222c29", "#32403a", "#55685e", "#90a9a2"],
  player:      ["#080b0c", "#111616", "#1a2021", "#252d2e", "#3a4547", "#64747a"],
  playerMagic: ["#0a1410", "#13241c", "#1e3528", "#2c4a38", "#426e54", "#67a383"],
  parchment:   ["#16130c", "#292418", "#423a26", "#5c5338", "#847657", "#b0a58c"],
  parchmentLit:["#131a15", "#223029", "#38493d", "#547053", "#7ea877", "#bbe8b6"],
  wood:        ["#140f08", "#2a1f10", "#42301a", "#5c452a", "#7a5f3c", "#9b7f55"],
  stone:       ["#0b0d10", "#15181d", "#20242b", "#2d333c", "#414a56", "#5d6878"],
};

/* ─── rasterise ───────────────────────────────────────────────────────
 * form   a placed { C, J }, already in sprite pixels
 * opts   { w, h, ramp, light, depth }
 *        depth is how fast the surface domes away from the edge: small
 *        values give a tight bright rim, large values give broad flat
 *        bands. Scale it with the sprite, or small sprites turn noisy. */
export function raster(form, { w, h, ramp, light, depth = 3 }) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(w, h), d = img.data;
  const top = ramp.length - 1;
  const rgb = ramp.map(hex => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]);

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = fieldAt(form, x + 0.5, y + 0.5);
    const i = (y * w + x) * 4;
    if (v > 0) { d[i + 3] = 0; continue; }

    // surface normal: the field's gradient points out of the form, and
    // the z component domes toward the viewer as we move inward
    const gx = fieldAt(form, x + 1.5, y + 0.5) - fieldAt(form, x - 0.5, y + 0.5);
    const gy = fieldAt(form, x + 0.5, y + 1.5) - fieldAt(form, x + 0.5, y - 0.5);
    const gl = Math.hypot(gx, gy) || 1;
    const dep = Math.min(1, -v / depth);
    const nz = Math.sqrt(dep), s = Math.sqrt(Math.max(0, 1 - nz * nz));
    const lam = (gx / gl) * s * light[0] + (gy / gl) * s * light[1] + nz * light[2];
    const rimT = Math.pow(1 - dep, light[6]) * Math.max(0, lam);
    let lit = light[3] + Math.max(0, lam) * light[4] + rimT * light[5];

    // where two volumes overlap, the crease goes dark — cheap occlusion
    let near = 0;
    for (const c of form.C) {
      const dx = c.x2 - c.x1, dy = c.y2 - c.y1, l2 = dx * dx + dy * dy || 1e-6;
      let t = ((x + 0.5 - c.x1) * dx + (y + 0.5 - c.y1) * dy) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const r = c.r1 + (c.r2 - c.r1) * t;
      if (Math.hypot(x + 0.5 - (c.x1 + dx * t), y + 0.5 - (c.y1 + dy * t)) - r < 0.8) near++;
    }
    if (near > 1) lit -= 0.14 * (near - 1);

    let tone = Math.round(lit * top);
    tone = tone < 0 ? 0 : tone > top ? top : tone;
    d[i] = rgb[tone][0]; d[i + 1] = rgb[tone][1]; d[i + 2] = rgb[tone][2]; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/* ─── sprite cache ────────────────────────────────────────────────────
 * Rasterising is too slow for every frame. Anything that varies
 * continuously (a curl, a lean) gets quantised to a handful of steps and
 * cached under a key. Eight steps is plenty — the eye reads motion from
 * the sprite's position far more than from its shape. */
const _cache = new Map();
export function sprite(key, build) {
  let s = _cache.get(key);
  if (!s) { s = build(); _cache.set(key, s); }
  return s;
}
export function quantise(v, steps = 8) {
  return Math.max(0, Math.min(steps, Math.round(v * steps)));
}
export function clearCache() { _cache.clear(); }

/* ─── drawing helper ─────────────────────────────────────────────── */
export const plot = (ctx, x, y, w, h, col) => {
  ctx.fillStyle = col;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
};
