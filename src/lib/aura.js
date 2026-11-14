/* ══════════════════════════════════════════════════════════════════════
 *  aura — what a coin's rarity looks like
 *  ────────────────────────────────────────────────────────────────────
 *  Metal is what a coin is made of; rarity is how strange this one is.
 *  The coin itself is frozen (lib/coin.js), so rarity is drawn as a layer
 *  of its own around it, on the coin's 64-unit grid plus a margin, and
 *  shown at the same whole-number scale as the coin.
 *
 *  It is the coin's own light, so it needs no light from the scene:
 *    common     nothing
 *    uncommon   a faint rim of its colour
 *    rare       the rim, and a glint that walks round it
 *    epic       a brighter rim, a dithered halo, three sparks in orbit
 *    legendary  all that, and rays that turn and breathe
 *    mythic     a burning rim, and embers that rise off it and die
 *
 *  An Eldritch coin is never quite still: tentacles curl off its rim
 *  and sway, dark as the deep, edged with its own sick green light.
 *
 *  An astral coin has a small moon in orbit, on a tilted path: in front
 *  of the coin for half its round, hidden behind it for the other half.
 *
 *  A shiny coin also catches the light: a glint sweeps across its face
 *  every few seconds and small stars twinkle on it, held to the coin's
 *  own pixels, whatever its shape.
 *
 *  Rare and above, and shinies, move at 8 frames a second, all coins on
 *  one shared clock, and only while on screen. With reduced motion they
 *  hold still.
 * ══════════════════════════════════════════════════════════════════════ */

import { drawCoin, shapeOf } from "./coin.js";
import { RARITIES } from "./data.js";

export const AURA_FPS = 8;
const S = 64;

/* The coin's outline: which pixels of the 64 grid the coin covers, and
 * the rings of empty pixels around it, each in order round the centre. */
const shapes = new Map();
function rings(coin, M) {
  const key = `${shapeOf(coin)}:${M}`;
  if (shapes.has(key)) return shapes.get(key);
  const cv = document.createElement("canvas");
  drawCoin(cv, { ...coin, shiny: false }, S);
  const a = cv.getContext("2d").getImageData(0, 0, S, S).data;
  const G = S + 2 * M, inside = new Uint8Array(G * G);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (a[(y * S + x) * 4 + 3] > 96) inside[(y + M) * G + x + M] = 1;
  // distance out from the coin, by 8-neighbour steps, up to 4
  const dist = new Uint8Array(G * G).fill(255);
  let front = [];
  for (let i = 0; i < G * G; i++) if (inside[i]) { dist[i] = 0; front.push(i); }
  for (let d = 1; d <= 4; d++) {
    const next = [];
    for (const i of front) {
      const x = i % G, y = (i / G) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
        const j = ny * G + nx;
        if (dist[j] === 255) { dist[j] = d; next.push(j); }
      }
    }
    front = next;
  }
  // and inward: the coin's own edge pixels (1) and the ones just inside (2)
  const inner = new Uint8Array(G * G);
  for (let pass = 1; pass <= 2; pass++) for (let i = 0; i < G * G; i++) {
    if (dist[i] !== 0 || inner[i]) continue;
    const x = i % G, y = (i / G) | 0;
    let edge = false;
    for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
      const j = (y + dy) * G + x + dx;
      if (pass === 1 ? dist[j] >= 1 : inner[j] === 1) { edge = true; break; }
    }
    if (edge) inner[i] = pass;
  }
  const c = G / 2, out = [[], [], [], [], []], ins = [[], [], []], face = [];
  for (let i = 0; i < G * G; i++) {
    const x = i % G, y = (i / G) | 0, p = { x, y, a: Math.atan2(y - c, x - c) };
    if (dist[i] >= 1 && dist[i] <= 4) out[dist[i]].push(p);
    else if (inner[i]) ins[inner[i]].push(p);
    if (dist[i] === 0) face.push(p);
  }
  out.forEach(r => r.sort((p, q) => p.a - q.a));
  const res = { G, ring: out, inner: ins, face, inside: dist };
  shapes.set(key, res);
  return res;
}

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const WHITE = [255, 250, 235];
// tiny hash, so every coin's sparks and embers sit differently
const h32 = (n) => { n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d); n = Math.imul(n ^ (n >>> 12), 0x297a2d39); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };

/* Paint one frame of a coin's aura into ctx, at 1 unit = 1 pixel. The
 * canvas is (64 + 2·margin) square, the coin sitting in the middle; the
 * layer lies over the coin, but touches only its outermost two pixels. */
export function paintAura(ctx, coin, rarity, frame, M = 8, shine = false, tendrils = false, moon = false, layer = "front", flames = false) {
  const { G, ring, inner, face, inside } = rings(coin, M);
  ctx.clearRect(0, 0, G, G);
  if (layer === "behind") {
    // only what stands behind the coin: an eldritch coin's far tentacles,
    // or the great flame of a fire coin
    if ((!tendrils && !flames) || (rarity === 5 && !auraStill() && turnAt(coin, frame))) return;
    const img = ctx.createImageData(G, G), d = img.data;
    const seed = coin.seed >>> 0, f = frame % LOOP;
    if (flames) replay(d, G, `blaze:${seed}:${M}:${f}`, p => paintBlaze(p, G, M, seed, f));
    if (tendrils) replay(d, G, `tent-b:${seed}:${M}:${f}`, p => paintTentacles(p, G, M, seed, f, "behind"));
    ctx.putImageData(img, 0, 0);
    return;
  }
  if (rarity <= 0 && !shine && !tendrils && !moon && !flames) return;
  if (rarity === 5 && !auraStill() && turnAt(coin, frame)) return;
  const img = ctx.createImageData(G, G), d = img.data;
  const put = (x, y, rgb, al) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= G || y >= G || al <= 0) return;
    const i = (y * G + x) * 4, a = Math.min(1, al);
    if (a * 255 < d[i + 3]) return;                       // keep the brighter
    d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = Math.round(a * 255);
  };
  const col = hex(RARITIES[rarity].color), seed = coin.seed >>> 0, c = G / 2;
  if (shine) paintShine(put, G, face, inside, seed, frame);
  if (rarity <= 0) {
    const f = frame % LOOP;
    if (flames) replay(d, G, `edge:${seed}:${shapeOf(coin)}:${M}:${f}`, p => paintBlazeEdge(p, inner, seed, f));
    if (tendrils) replay(d, G, `tent-f:${seed}:${M}:${f}`, p => paintTentacles(p, G, M, seed, f, "front"));
    if (moon) paintMoon(put, G, M, inside, seed, frame);
    ctx.putImageData(img, 0, 0); return;
  }
  const hot = [255, 236, 170], warm = [255, 160, 70];
  const burn = rarity === 5, beat = (frame >> 1) % 4;      // a slow 4-step pulse
  const flick = i => h32(seed + i * 7 + (frame >> 1) * 131);
  const fire = (i, base) => { const f = flick(i); return f > 0.75 ? hot : f > 0.4 ? warm : base; };

  // the rim, and from epic up the band and haze beyond it
  const L = {          //  rim   band  haze  far   inner
    1: [0.5,  0,    0,    0,    0   ],
    2: [0.8,  0.25, 0,    0,    0   ],
    3: [1,    0.6,  0.3,  0,    0.3 ],
    4: [1,    0.8,  0.45, 0.22, 0.45],
    5: [1,    0.9,  0.55, 0.3,  0.55],
  }[rarity];
  ring[1].forEach((p, i) => put(p.x, p.y, burn ? fire(i, col) : col, L[0]));
  ring[2].forEach((p, i) => put(p.x, p.y, burn ? fire(i + 999, col) : col, L[1] * (rarity >= 4 ? 0.85 + beat * 0.05 : 1)));
  ring[3].forEach(p => { if ((p.x + p.y) % 2 === 0) put(p.x, p.y, col, L[2]); });
  ring[4].forEach(p => { if (p.x % 2 === 0 && p.y % 2 === 0) put(p.x, p.y, col, L[3]); });
  // light reaching in over the coin's own edge
  if (L[4]) {
    inner[1].forEach((p, i) => put(p.x, p.y, burn ? fire(i + 4242, col) : col, L[4] * (0.7 + beat * 0.1)));
    if (rarity >= 4) inner[2].forEach(p => { if ((p.x + p.y) % 2 === 0) put(p.x, p.y, col, L[4] * 0.45); });
  }

  // a glint walking the rim, rare to legendary
  if (rarity >= 2 && !burn) {
    const r1 = ring[1], n = r1.length, at = (frame * (rarity >= 4 ? 3 : 2) + seed % n) % n;
    for (let k = -3; k <= 3; k++) {
      const p = r1[(at + k + n) % n];
      put(p.x, p.y, mix(col, WHITE, 1 - Math.abs(k) * 0.22), 1);
    }
  }

  // sparks in orbit, epic and legendary
  if (rarity >= 3 && !burn) {
    const count = rarity >= 4 ? 4 : 3;
    for (let k = 0; k < count; k++) {
      const R = S / 2 + 4 + (k % 2) * 2;
      const ang = (k / count) * Math.PI * 2 + frame * 0.09 + h32(seed + k) * 0.6;
      const x = c + Math.cos(ang) * R, y = c + Math.sin(ang) * R;
      put(x, y, mix(col, WHITE, 0.85), 1);
      if ((frame + k * 3) % 6 < 3) { put(x + 1, y, col, 0.8); put(x - 1, y, col, 0.8); put(x, y + 1, col, 0.8); put(x, y - 1, col, 0.8); }
    }
  }

  // rays that turn and breathe, legendary
  if (rarity === 4) {
    const turn = frame * 0.035;
    for (let k = 0; k < 8; k++) {
      const ang = turn + (k / 8) * Math.PI * 2, len = (k % 2 ? 2 : 4) + beat;
      for (let s = 0; s < len; s++) {
        const R = S / 2 + 2 + s;
        put(c + Math.cos(ang) * R, c + Math.sin(ang) * R, s < 2 ? mix(col, WHITE, 0.4) : col, 0.9 - s * 0.1);
      }
    }
  }

  // a mythic burns: tongues of flame lick up off its top, embers rise and die
  if (burn) {
    // flames stand tallest at the top and shrink down the sides
    ring[1].forEach((p, i) => {
      if (i % 2 || p.y > c + 4) return;
      const up = (c + 4 - p.y) / (c + 4);                 // 0 at the sides … 1 at the top
      const h = Math.round((1 + flick(i + 77) * 5) * (0.35 + up * 0.75));
      const sway = Math.round(Math.sin(frame * 0.7 + i * 0.5));
      for (let s = 1; s <= h; s++) {
        const t = s / (h + 1);
        put(p.x + (t > 0.5 ? sway : 0), p.y - s, t < 0.34 ? hot : t < 0.7 ? warm : col, 1 - t * 0.55);
      }
    });
    const LIFE = 18, N = 30, edge = ring[1].filter(p => p.y < c + 12);
    for (let k = 0; k < N; k++) {
      const phase = Math.floor(h32(seed * 3 + k) * LIFE), age = (frame + phase) % LIFE;
      const gen = Math.floor((frame + phase) / LIFE);
      const p = edge[Math.floor(h32(seed + k * 977 + gen * 7919) * edge.length)];
      if (!p) continue;
      const x = p.x + Math.round(Math.sin((age + k) * 0.6) * 1.5), y = p.y - age;
      const t = age / LIFE, rgb = t < 0.25 ? hot : t < 0.6 ? warm : col;
      put(x, y, rgb, 1 - t * 0.8);
      if (t < 0.5) { put(x, y + 1, t < 0.2 ? warm : col, 0.8 - t); if (k % 3 === 0) put(x + 1, y, rgb, 0.8 - t); }
    }
  }

  if (flames) replay(d, G, `edge:${seed}:${shapeOf(coin)}:${M}:${frame % LOOP}`, p => paintBlazeEdge(p, inner, seed, frame % LOOP));
  if (tendrils) replay(d, G, `tent-f:${seed}:${M}:${frame % LOOP}`, p => paintTentacles(p, G, M, seed, frame % LOOP, "front"));
  if (moon) paintMoon(put, G, M, inside, seed, frame);
  ctx.putImageData(img, 0, 0);
}

/* The tentacles and the fire are costly to draw (every pixel near an arm
 * hunts for its nearest point; the blaze walks the whole canvas), so they
 * move on a seamless loop of LOOP frames and each frame is drawn once per
 * coin, kept as the pixels it set, and replayed after. Every motion in
 * them is a whole number of turns per loop. */
const LOOP = 32, TAU_LOOP = (Math.PI * 2) / LOOP;
const kept = new Map();
let keptSize = 0;
function replay(d, G, key, draw) {
  let rec = kept.get(key);
  if (!rec) {
    const pos = [], rgb = [];
    draw((x, y, c) => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= G || y >= G) return;
      pos.push(y * G + x); rgb.push((c[0] << 16) | (c[1] << 8) | c[2]);
    });
    rec = { pos: Uint32Array.from(pos), rgb: Uint32Array.from(rgb) };
    kept.set(key, rec); keptSize += rec.pos.length;
    for (const [k, v] of kept) { if (keptSize < 6e6) break; kept.delete(k); keptSize -= v.pos.length; }
  }
  const { pos, rgb } = rec;
  for (let j = 0; j < pos.length; j++) {
    const i = pos[j] * 4, c = rgb[j];
    d[i] = c >> 16; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255;
  }
}

/* Eldritch, traced from Dante's markup: black tentacles, some lying over
 * the coin and its rim (front), some reaching out behind it (on the layer
 * under the coin). Each is drawn from its thick root to its curled tip
 * through points given in coin radii from the centre (+x right, +y down);
 * the ones behind are pulled in a little so they fit the margin. Black
 * body, a dark outline, a teal strip down one side; each sways slowly. */
// two flat tones, as in the reference: a near-black body and a slate band
// down the lit side; no outline
const TENT = { body: [17, 26, 30], lit: [52, 84, 86] };
const FRONT_ARMS = [
  { w: 5.4, cw: 1, p: [[-0.70, -0.92], [-0.55, -0.74], [-0.42, -0.54], [-0.30, -0.33]] },
  { w: 5.0, cw: -1, p: [[0.56, -1.00], [0.47, -0.78], [0.38, -0.60], [0.30, -0.47]] },
  { w: 4.6, cw: 1, p: [[1.05, -0.20], [0.93, -0.03], [0.80, 0.10], [0.72, 0.18]] },
  { w: 4.8, cw: -1, p: [[-0.80, 0.04], [-0.91, 0.30], [-1.01, 0.52], [-0.99, 0.68]] },
  { w: 5.6, cw: 1, p: [[-0.62, 1.04], [-0.46, 0.74], [-0.29, 0.48], [-0.11, 0.26]] },
];
const BACK_ARMS = [
  { w: 6.2, p: [[0.04, -0.80], [0.06, -1.06], [0.13, -1.28], [0.21, -1.52], [0.33, -1.60], [0.44, -1.50], [0.40, -1.32], [0.29, -1.27]] },
  { w: 5.8, p: [[0.06, 0.80], [0.08, 1.08], [0.13, 1.35], [0.08, 1.56], [-0.08, 1.65], [-0.26, 1.60], [-0.29, 1.50]] },
];
function armPts(G, arm, k, frame, squeeze) {
  const c = G / 2, R = 31;
  let P = arm.p.map(([x, y]) => {
    const d = Math.hypot(x, y), s = d > 1 ? (1 + (d - 1) * squeeze) / d : 1;
    return [x * s, y * s];
  });
  if (arm.cw) {
    // bow the run into a gentle S, then curl the tip round on itself
    const [sx, sy] = P[0], [ex, ey] = P[P.length - 1], L = Math.hypot(ex - sx, ey - sy) || 1;
    const nx = -(ey - sy) / L, ny = (ex - sx) / L;
    P = P.map(([x, y], i) => { const u = i / (P.length - 1), b = Math.sin(u * Math.PI * 2) * 0.06 * arm.cw; return [x + nx * b, y + ny * b]; });
    let [x, y] = P[P.length - 1], h = Math.atan2(ey - P[P.length - 2][1], ex - P[P.length - 2][0]), step = 0.11;
    for (let k = 0; k < 4; k++) { h += arm.cw * 1.05; step *= 0.78; x += Math.cos(h) * step; y += Math.sin(h) * step; P.push([x, y]); }
  }
  const pts = [], n = P.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
    const steps = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * R * 2));
    for (let j = 0; j < steps; j++) {
      const t = j / steps, t2 = t * t, t3 = t2 * t;
      const cr = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      pts.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(P[n - 1]);
  // sway: the tip moves most, the root not at all
  const m = pts.length, sw = arm.even ? 0 : Math.sin(frame * TAU_LOOP + k * 1.9) * 0.1;
  const [ox, oy] = pts[0];
  return pts.map(([x, y], i) => {
    const u = i / (m - 1), a = sw * u, dx = x - ox, dy = y - oy;
    // a slow wave runs down each arm toward its tip, on top of the sway
    const wv = arm.even ? 0 : Math.sin(frame * TAU_LOOP * 2 - u * 5 + k * 2.3) * 0.04 * u;
    const rx = ox + dx * Math.cos(a) - dy * Math.sin(a) - dy * wv, ry = oy + dx * Math.sin(a) + dy * Math.cos(a) + dx * wv;
    return [c + rx * R, c + ry * R, arm.even ? arm.w : Math.max(0.8, arm.w * (1 - u) ** 0.8)];
  });
}
function tentacle(put, pts, pal = TENT) {
  // each pixel takes its shade from the nearest point of the centre line
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y, w] of pts) { x0 = Math.min(x0, x - w - 1); y0 = Math.min(y0, y - w - 1); x1 = Math.max(x1, x + w + 1); y1 = Math.max(y1, y + w + 1); }
  for (let py = Math.floor(y0); py <= y1; py++) for (let px = Math.floor(x0); px <= x1; px++) {
    let bi = -1, bd = 1e9;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], d = Math.hypot(px + 0.5 - p[0], py + 0.5 - p[1]) - p[2]; if (d < bd) { bd = d; bi = i; } }
    if (bd > 0) continue;
    const [x, y, w] = pts[bi], q = pts[Math.min(pts.length - 1, bi + 1)], b = pts[Math.max(0, bi - 1)];
    const hx = q[0] - b[0], hy = q[1] - b[1], hl = Math.hypot(hx, hy) || 1;
    const side = ((px + 0.5 - x) * -hy / hl + (py + 0.5 - y) * hx / hl) / w;   // across the arm, -1 … 1
    put(px, py, side > 0.62 && w > 1.2 ? pal.lit : pal.body, 1);
  }
}

/* The floating bits from the reference: black specks, 2 × 2 blots and
 * round 3 × 3 blobs hanging round the tentacles, each drifting slowly up
 * and out on its own loop and blinking out at the end of it. The bigger
 * ones catch the same slate light as the tentacles. */
const FLECK = [18, 27, 31];
function paintFlecks(put, G, seed, frame, from, to, n, salt) {
  const c = G / 2;
  for (let k = 0; k < n; k++) {
    const LIFE = LOOP, ph = Math.floor(h32(seed + salt + k * 3) * LIFE), age = (frame + ph) % LIFE, gen = 0;   // one life a loop
    const a = h32(seed + salt + k * 71 + gen * 13) * Math.PI * 2, d0 = from + h32(seed + salt + k * 37 + gen * 5) * (to - from);
    const d = d0 + age * 0.12, x = Math.round(c + Math.cos(a) * d), y = Math.round(c + Math.sin(a) * d - age * 0.18);
    if (age > LIFE - 6 && (age + k) % 2) continue;                    // blinking out
    const size = k % 5 === 0 ? 3 : k % 3 === 0 ? 2 : 1;
    if (size === 1) put(x, y, k % 2 ? FLECK : TENT.lit, 1);
    else if (size === 2) { put(x, y, TENT.lit, 1); put(x + 1, y, FLECK, 1); put(x, y + 1, FLECK, 1); put(x + 1, y + 1, FLECK, 1); }
    else {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx * dy === 0 || dx + dy === 0) put(x + dx, y + dy, FLECK, 1);
      put(x + 1, y - 1, TENT.lit, 1);
    }
  }
}

// each front tentacle comes round from behind the coin: its root rises
// out from under the coin (drawn on the layer beneath), turns over the rim
// and lies across the face (drawn over it)
function wrapArms() {
  return FRONT_ARMS.map(arm => {
    const [x0, y0] = arm.p[0], a = Math.atan2(y0, x0), at = (ang, d) => [Math.cos(ang) * d, Math.sin(ang) * d];
    const out = at(a, 1.16);
    return {
      root: { w: arm.w, even: true, p: [at(a - arm.cw * 0.3, 0.84), at(a - arm.cw * 0.14, 1.1), out] },
      over: { ...arm, p: [out, at(a + arm.cw * 0.05, 0.97), ...arm.p.slice(1)] },
    };
  });
}
const WRAP = wrapArms();
function paintTentacles(put, G, M, seed, frame, layer) {
  if (layer === "behind") {
    const squeeze = Math.min(1, (M - 2) / 22);                   // reach no further than the margin
    BACK_ARMS.forEach((arm, k) => tentacle(put, armPts(G, arm, k, frame, squeeze)));
    WRAP.forEach(({ root }, k) => tentacle(put, armPts(G, root, k, frame, 1)));
    paintFlecks(put, G, seed, frame, 34, 31 + M, 12, 999);
    return;
  }
  WRAP.forEach(({ over }, k) => tentacle(put, armPts(G, over, k + 7, frame, 1)));
  paintFlecks(put, G, seed, frame, 20, 31 + M - 1, 14, 0);
}

/* Fire, traced from Dante's markup: one flame around the whole coin, on
 * the layer under it. Its outline is given as a reach (in coin radii from
 * the centre) at angles round the coin, 0 at the top, clockwise: tall
 * tongues over the top, the tallest leaning left, a lower fringe down the
 * sides, and a tight band hugging the bottom. Gold against the coin, then
 * orange, hot orange, a red edge and loose pixels beyond. The tongues
 * flicker and the outline ripples. */
const FLAME = { core: [255, 236, 150], mid: [255, 190, 95], hot: [244, 130, 52], edge: [214, 76, 54], ash: [168, 52, 50] };
const BLAZE = [
  [-180, 1.03], [-153, 1.10], [-140, 1.10], [-112, 1.21], [-86, 1.30], [-66, 1.23], [-52, 1.55], [-44, 1.48],
  [-36, 1.55], [-28, 1.75], [-21, 2.30], [-13, 1.75], [-4, 2.00], [0, 1.95], [3, 2.50], [8, 1.95],
  [13, 1.85], [19, 2.10], [27, 1.70], [33, 1.56], [41, 2.08], [50, 1.62], [61, 1.42], [69, 1.39], [84, 1.25], [98, 1.31],
  [111, 1.20], [134, 1.04], [171, 1.02], [180, 1.03],
];
const BLAZE_MAX = Math.max(...BLAZE.map(([, r]) => r)) * 1.1;   // with room for the flicker
function blazeReach(deg, frame, seed) {
  deg += Math.sin(frame * TAU_LOOP * 2 + deg * 0.04) * 4;                 // the tongues lean and sway
  let i = 0;
  while (i < BLAZE.length - 2 && BLAZE[i + 1][0] < deg) i++;
  const [a0, r0] = BLAZE[i], [a1, r1] = BLAZE[i + 1], t = (deg - a0) / (a1 - a0 || 1);
  const r = r0 + (r1 - r0) * (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t)))) / 2;
  // the tongues flicker: the further out, the more
  return r + (r - 1) * (0.11 * Math.sin(frame * TAU_LOOP * 5 + deg * 0.11 + seed % 7) + 0.06 * Math.sin(frame * TAU_LOOP * 9 + deg * 0.31));
}
function paintBlaze(put, G, M, seed, frame) {
  const c = G / 2, R = 31, squeeze = Math.min(1, (M - 2) / ((BLAZE_MAX - 1) * R * 0.8));
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, rad = Math.hypot(dx, dy);
    if (rad < R - 1) continue;                                  // under the coin
    const deg = Math.atan2(dx, -dy) * 180 / Math.PI;
    const reach = (1 + (blazeReach(deg, frame, seed) - 1) * squeeze) * R;
    // the bands step in 2-pixel blocks, as the sprites' do
    const T = reach - R + 1 + (h32(seed + (x >> 1) * 31 + (y >> 1) * 977 + (frame >> 1) * 7) - 0.5) * 2;
    if (T < 0.6) continue;
    const t = (rad - R + 1) / T, n = (h32(seed + (x >> 1) * 53 + (y >> 1) * 409 + (frame >> 1) * 3) - 0.5) * 0.12;
    let col = null;
    if (t < 0.42 + n) col = FLAME.core;
    else if (t < 0.66 + n) col = FLAME.mid;
    else if (t < 0.86 + n) col = FLAME.hot;
    else if (t < 1) col = FLAME.edge;
    if (col) put(x, y, col, 1);
  }
  // embers: loose square bits flung up off the tongue tips, cooling as they rise
  const tips = BLAZE.filter(([, r]) => r > 1.4);
  for (let k = 0; k < 12; k++) {
    const LIFE = LOOP / 2, ph = Math.floor(h32(seed * 5 + k) * LIFE), age = (frame + ph) % LIFE, gen = Math.floor((frame + ph) / LIFE) % 2;
    const [deg] = tips[Math.floor(h32(seed + k * 389 + gen * 7919) * tips.length)];
    const a = (deg + (h32(seed + k * 17 + gen) - 0.5) * 10) * Math.PI / 180;
    const reach = (1 + (blazeReach(deg, frame, seed) - 1) * squeeze) * R * (0.8 + h32(seed + k * 3 + gen) * 0.2);
    const x = Math.round(c + Math.sin(a) * reach + Math.sin(age * 0.7 + k) * 0.8), y = Math.round(c - Math.cos(a) * reach - age * 0.9);
    if (age > LIFE - 4 && age % 2) continue;
    const col = age < 5 ? FLAME.hot : age < 11 ? FLAME.edge : FLAME.ash;
    put(x, y, col, 1);
    if (k % 3 === 0 && age < 8) { put(x + 1, y, col, 1); put(x, y + 1, col, 1); put(x + 1, y + 1, col, 1); }
  }
}
function paintBlazeEdge(put, inner, seed, frame) {
  const ys = inner[1].map(p => p.y), c = (Math.min(...ys) + Math.max(...ys)) / 2;
  // the coin's top edge catches
  inner[1].forEach((p, i) => { if (p.y > c - 8) return; const h = h32(seed + i * 17 + (frame >> 1) * 101); if (h < 0.4) put(p.x, p.y, h < 0.15 ? FLAME.core : FLAME.mid, 1); });
}

/* The astral moon: a round of 64 frames (8 s), on an ellipse tipped a
 * little off level. The near half of its path crosses in front of the
 * coin; on the far half, wherever the coin is, the moon is hidden. Lit
 * from the left, with a short fading trail behind it. */
const MOON = { lit: [236, 244, 255], mid: [168, 186, 222], dark: [90, 106, 150], rim: [24, 32, 64] };
function paintMoon(put, G, M, inside, seed, frame) {
  const c = G / 2, rx = 31 + M / 2, ry = 13, tilt = -0.32, ROUND = 64;
  const at = f => {
    const th = (f / ROUND) * Math.PI * 2 + (seed % 628) / 100;
    const ex = Math.cos(th) * rx, ey = Math.sin(th) * ry;
    return { x: c + ex * Math.cos(tilt) - ey * Math.sin(tilt), y: c + ex * Math.sin(tilt) + ey * Math.cos(tilt), near: Math.sin(th) > 0 };
  };
  const hidden = (x, y, near) => !near && x >= 0 && y >= 0 && x < G && y < G && inside[y * G + x] === 0;
  for (let k = 4; k >= 1; k--) {                                 // the trail
    const p = at(frame - k * 0.6), x = Math.round(p.x), y = Math.round(p.y);
    if (!hidden(x, y, p.near)) put(x, y, MOON.mid, 0.5 - k * 0.1);
  }
  const p = at(frame), mx = Math.round(p.x), my = Math.round(p.y);
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    const d2 = dx * dx + dy * dy, x = mx + dx, y = my + dy;
    if (d2 > 17 || hidden(x, y, p.near)) continue;
    const col = d2 > 11 ? MOON.rim : dx <= -1 ? MOON.lit : dx <= 1 ? MOON.mid : MOON.dark;
    put(x, y, col, 1);
  }
}

/* A shiny's light: a glint band sweeping corner to corner across the
 * coin's face, then a rest; and four small stars that open and close on
 * the face at their own times. Only ever on the coin's own pixels. */
const GLINT = [255, 252, 232], GOLD = [255, 226, 150];
function paintShine(put, G, face, inside, seed, frame) {
  const CYCLE = 26, SWEEP = 9;                         // frames: ~3 s round, ~1 s of sweep
  const f = (frame + (seed % CYCLE)) % CYCLE;
  if (f < SWEEP) {
    const at = -8 + (f / (SWEEP - 1)) * (2 * G + 8);  // along x + y
    for (const p of face) {
      const d = p.x + p.y - at;
      if (d >= 0 && d < 2) put(p.x, p.y, GLINT, 0.85);
      else if (d >= -4 && d < 0) put(p.x, p.y, GOLD, 0.45);
      else if (d >= 2 && d < 4) put(p.x, p.y, GOLD, 0.3);
    }
  }
  const on = (x, y) => x >= 0 && y >= 0 && x < G && y < G && inside[y * G + x] === 0;
  for (let k = 0; k < 4; k++) {
    const LIFE = 6, PERIOD = 13 + k * 3;
    const age = (frame + Math.floor(h32(seed + k * 31) * PERIOD)) % PERIOD;
    if (age >= LIFE) continue;
    const gen = Math.floor((frame + Math.floor(h32(seed + k * 31) * PERIOD)) / PERIOD);
    const p = face[Math.floor(h32(seed * 7 + k * 131 + gen * 977) * face.length)];
    if (!p) continue;
    const arm = [0, 1, 2, 2, 1, 0][age];
    put(p.x, p.y, GLINT, 1);
    for (let s = 1; s <= arm; s++) {
      const a = s === arm ? 0.55 : 0.85;
      for (const [dx, dy] of [[s, 0], [-s, 0], [0, s], [0, -s]]) if (on(p.x + dx, p.y + dy)) put(p.x + dx, p.y + dy, GOLD, a);
    }
  }
}

/* ─── a mythic turns over ─────────────────────────────────────────────
 * Every nine seconds or so (each coin at its own moment) a mythic turns:
 * face, edge, its plain back with the mint's mark, edge, face again. The
 * aura steps aside while it turns, since it hugs the coin's flat outline. */
const TURN = [54, 40, 24, 10, 4, 10, 24, 40, 54, 64, 64, 64, 54, 40, 24, 10, 4, 10, 24, 40, 54];
const BACK = TURN.map((_, i) => i >= 5 && i <= 15);
const TURN_EVERY = 72;
export function turnAt(coin, frame) {
  const i = (frame + ((coin.seed >>> 0) % TURN_EVERY)) % TURN_EVERY;
  return i < TURN.length ? { turn: TURN[i], back: BACK[i] } : null;
}

/* ─── the one clock ───────────────────────────────────────────────── */
const subs = new Set();
let timer = null, frame = 0;
export function onAuraFrame(fn) {
  subs.add(fn);
  if (!timer) timer = setInterval(() => { frame++; subs.forEach(f => f(frame)); }, 1000 / AURA_FPS);
  return () => { subs.delete(fn); if (!subs.size) { clearInterval(timer); timer = null; } };
}
export const auraFrame = () => frame;
export const auraStill = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
