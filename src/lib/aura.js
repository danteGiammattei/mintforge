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
    const put = (x, y, rgb) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= G || y >= G) return; const i = (y * G + x) * 4; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; };
    if (flames) paintBlaze(put, G, M, coin.seed >>> 0, frame);
    if (tendrils) paintTentacles(put, G, M, coin.seed >>> 0, frame, "behind");
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
    if (flames) paintBlazeEdge(put, inner, seed, frame);
    if (tendrils) paintTentacles(put, G, M, seed, frame, "front");
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

  if (flames) paintBlazeEdge(put, inner, seed, frame);
  if (tendrils) paintTentacles(put, G, M, seed, frame, "front");
  if (moon) paintMoon(put, G, M, inside, seed, frame);
  ctx.putImageData(img, 0, 0);
}

/* Eldritch tentacles are runs of discs, thick and round, shaded as a
 * cylinder lit from the top-left. Placed by the coin's seed. */
const TENT = {
  // black, rim-lit in the eldritch teal, as the reference's are against its sky
  behind: { lit: [34, 84, 76], body: [16, 24, 28], shade: [8, 11, 13] },
  front:  { lit: [72, 168, 144], body: [24, 36, 40], shade: [10, 15, 17], edge: [4, 7, 8] },
};
function tentacle(put, pts, pal) {
  // the front ones lie on a green coin: a dark edge keeps them apart from it
  if (pal.edge) for (const [x, y, w] of pts) {
    const n = Math.ceil(w + 1);
    for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) if (dx * dx + dy * dy <= (w + 1) * (w + 1) + 0.35) put(x + dx, y + dy, pal.edge, 1);
  }
  for (const [x, y, w] of pts) {
    const n = Math.ceil(w);
    for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > w * w + 0.35) continue;
      const lean = -(dx + dy) / Math.SQRT2;                       // toward the light
      put(x + dx, y + dy, lean > w * 0.62 ? pal.lit : lean < -w * 0.3 ? pal.shade : pal.body, 1);
    }
  }
}
/* Eldritch, after the references: six thick tentacles grip the coin's
 * rim all round. Each comes in from beyond the coin and passes UNDER its
 * edge (that part on the layer beneath the coin), then reappears ON the
 * rim, drapes over it, and lifts away to a tip curling back out. Suckers
 * line the side that holds the coin. Each sways a little on its own beat. */
const SUCKER = [104, 78, 140];
function grips(G, M, seed, frame) {
  const c = G / 2, r = 31, out = [];
  for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * Math.PI * 2 + 0.26 + (h32(seed + k * 31) - 0.5) * 0.35, dir = k % 2 ? 1 : -1;
    const sway = Math.sin(frame * 0.3 + k * 1.7) * 0.06;
    // under: from just behind the coin's edge to beneath it, so the grip
    // reads as coming round from the back
    const sa = a0 - dir * 0.42 + sway, under = [];
    const back = r + 4 + Math.min(4, M * 0.35);
    let x = c + Math.cos(sa) * back, y = c + Math.sin(sa) * back;
    const ex = c + Math.cos(a0) * (r - 3), ey = c + Math.sin(a0) * (r - 3);
    const n = Math.ceil(Math.hypot(ex - x, ey - y));
    for (let i = 0; i <= n; i++) {
      const u = i / n, bow = Math.sin(u * Math.PI) * 2.2 * dir;      // a slight bow, not a ruler line
      const nx = -(ey - y) / n, ny = (ex - x) / n;
      under.push([Math.round(x + (ex - x) * u + nx * bow), Math.round(y + (ey - y) * u + ny * bow), 3.7]);
    }
    // over: from on the rim, along it and away, the tip curling back out
    const over = [];
    let h = a0 + dir * (Math.PI / 2) * 0.72 + sway, px = ex, py = ey;
    const len = 13 + Math.round(M * 0.7) + Math.floor(h32(seed + k * 11) * 4);
    for (let i = 0; i < len; i++) {
      const u = i / len;
      over.push([Math.round(px), Math.round(py), Math.max(0.7, 3.6 * (1 - u) ** 0.85)]);
      h -= dir * (0.02 + 0.85 * u ** 3);                            // turning outward, tighter at the tip
      px += Math.cos(h); py += Math.sin(h);
    }
    out.push({ under, over, c });
  }
  return out;
}
function suckers(put, pts, c) {
  pts.forEach(([x, y, w], i) => {
    if (i % 3 !== 1 || w < 1.6) return;
    const a = Math.atan2(c - y, c - x);                              // the side toward the coin
    put(Math.round(x + Math.cos(a) * (w - 0.6)), Math.round(y + Math.sin(a) * (w - 0.6)), SUCKER, 1);
  });
}

/* Black flecks drifting outward and up off an eldritch coin, as in the
 * reference: single pixels and 2 × 2 blots, each on its own slow loop. */
const FLECK = [10, 15, 17], FLECK_LIT = [60, 140, 120];
function paintFlecks(put, G, M, seed, frame) {
  const c = G / 2, r = 31;
  for (let k = 0; k < 12; k++) {
    const LIFE = 40, age = (frame + Math.floor(h32(seed + k * 3) * LIFE)) % LIFE;
    const a = h32(seed + k * 71 + Math.floor((frame + h32(seed + k * 3) * LIFE) / LIFE) * 13) * Math.PI * 2;
    const d = r - 6 + age * 0.45, x = Math.round(c + Math.cos(a) * d), y = Math.round(c + Math.sin(a) * d - age * 0.25);
    if (age > LIFE - 6 && (age + k) % 2) continue;                  // flickering out
    if (k % 3 === 0) { put(x, y, FLECK_LIT, 1); put(x + 1, y, FLECK, 1); put(x, y + 1, FLECK, 1); put(x + 1, y + 1, FLECK, 1); }
    else put(x, y, k % 2 ? FLECK : FLECK_LIT, 1);
  }
}

function paintTentacles(put, G, M, seed, frame, layer) {
  const gs = grips(G, M, seed, frame);
  if (layer === "behind") {
    for (const g of gs) tentacle(put, g.under, TENT.behind);
    return;
  }
  paintFlecks(put, G, M, seed, frame);
  for (const g of gs) { tentacle(put, g.over, TENT.front); suckers(put, g.over, g.c); }
}

/* Fire, after the reference ring: the coin burns all the way round.
 * Behind it (a layer under the coin) the blaze is tallest over the crown,
 * shorter down the sides, a low band under the bottom; gold at the heart
 * against the coin, then orange, hot orange, a red edge, loose pixels off
 * that edge. Above the crown, smoke curls up and sparks fly. In front, the
 * coin's own edge catches and small licks climb up off its bottom rim. */
const FLAME = { core: [255, 228, 138], mid: [246, 174, 83], hot: [232, 116, 44], edge: [197, 78, 61], ash: [155, 48, 54] };
const SMOKE = [[138, 128, 130], [104, 96, 100], [72, 66, 72]];
function paintBlaze(put, G, M, seed, frame) {
  const c = G / 2, r = 31, s0 = (seed % 628) / 100, f = frame * 0.9, TOP = Math.max(5, Math.round(M * 0.62));
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, rad = Math.hypot(dx, dy);
    if (rad < r - 1) continue;                                 // under the coin
    // where along the rim it rises from, and how far it has risen. Over the
    // top the flame goes straight up from the rim below it; elsewhere it
    // stands out from the rim
    let a, out;
    if (Math.abs(dx) < r - 2 && dy < 0) {
      const rimY = -Math.sqrt(r * r - dx * dx);
      a = Math.asin(dx / r); out = rimY - dy;
    } else {
      a = Math.atan2(dy, dx) + Math.PI / 2; if (a > Math.PI) a -= 2 * Math.PI;
      out = rad - r;
    }
    const along = Math.abs(a) / Math.PI;                       // 0 at the crown … 1 at the bottom
    // tongues: pointed licks all round, each swaying as it rises
    const lean = Math.sin(out * 0.45 + f + s0) * 0.05 * out / TOP;
    const tongue = 0.42 + 0.58 * Math.abs(Math.sin((a + lean) * 6 + s0 + f * 0.25)) ** 0.55;
    const T = TOP * (0.3 + 0.7 * (1 - along) ** 1.6) * tongue
      + (h32(seed + (x >> 1) * 31 + (y >> 1) * 977 + (frame >> 1) * 7) - 0.5) * 1.6;
    if (T < 0.8) continue;
    const t = out / T;
    let col = null;
    if (t < 0.3) col = FLAME.core;
    else if (t < 0.55) col = FLAME.mid;
    else if (t < 0.8) col = FLAME.hot;
    else if (t < 1) col = FLAME.edge;
    else if (t < 1.45 && h32(seed + x * 131 + y * 7919 + frame * 31) < 0.34 * (1.45 - t) / 0.45) col = t < 1.2 ? FLAME.edge : FLAME.ash;
    if (col) put(x, y, col, 1);
  }
  // smoke: three wisps curling up off the crown, thinning as they rise
  const top = c - r - TOP * 0.7;
  for (let k = 0; k < 3; k++) {
    const x0 = c + (k - 1) * 9 + (h32(seed + k * 5) - 0.5) * 6, L = Math.max(4, Math.round(top));
    for (let s = 0; s < L; s++) {
      const u = s / L, y = Math.round(top - s);
      const x = Math.round(x0 + Math.sin(s * 0.45 - frame * 0.35 + k * 2.1) * (0.8 + s * 0.22));
      if (h32(seed + k * 97 + s * 13 + (frame >> 1) * 3) < u * 0.6) continue;
      const tone = SMOKE[Math.min(2, Math.floor(u * 3))];
      put(x, y, tone, 1);
      if (u < 0.6) put(x + 1, y, SMOKE[Math.min(2, Math.floor(u * 3) + 1)], 1);
    }
  }
  // sparks flung up and out off the flames, each on its own short life
  for (let k = 0; k < 9; k++) {
    const LIFE = 14, ph = Math.floor(h32(seed * 7 + k) * LIFE), age = (frame + ph) % LIFE, gen = Math.floor((frame + ph) / LIFE);
    const a = (h32(seed + k * 389 + gen * 7919) - 0.5) * Math.PI * 1.1;
    const x = Math.round(c + Math.sin(a) * (r + 2) + Math.sin(a) * age * 0.6 + Math.sin(age * 0.8 + k) * 0.8);
    const y = Math.round(c - Math.cos(a) * (r + 2) - age * 1.1);
    if (age > LIFE - 4 && age % 2) continue;
    put(x, y, age < 4 ? FLAME.core : age < 9 ? FLAME.mid : FLAME.edge, 1);
  }
}
function paintBlazeEdge(put, inner, seed, frame) {
  const ys = inner[1].map(p => p.y), lo = Math.min(...ys), hi = Math.max(...ys), c = (lo + hi) / 2;
  inner[1].forEach((p, i) => { if (p.y > c + 6) return; const h = h32(seed + i * 17 + (frame >> 1) * 101); if (h < 0.55) put(p.x, p.y, h < 0.2 ? FLAME.core : FLAME.mid, 1); });
  inner[2].forEach((p, i) => { if (p.y > c) return; if (h32(seed + i * 23 + (frame >> 1) * 59) < 0.22) put(p.x, p.y, FLAME.hot, 1); });
  // a few small tongues climbing up off the bottom rim, over the coin's lower edge
  for (let k = 0; k < 4; k++) {
    const x0 = Math.round(c + (k - 1.5) * 8 + Math.sin(frame * 0.5 + k * 2) * 0.6);
    const base = inner[1].filter(p => Math.abs(p.x - x0) <= 0 && p.y > c).reduce((m, p) => Math.max(m, p.y), 0);
    if (!base) continue;
    const H = 3 + Math.round(3 * Math.abs(Math.sin(frame * 0.45 + k * 1.3 + seed % 5)));
    for (let s = 0; s < H; s++) {
      const t = s / H, w = Math.round(1.6 * (1 - t)), sway = t > 0.5 ? Math.round(Math.sin(frame * 0.7 + k)) : 0;
      for (let dx = -w; dx <= w; dx++) put(x0 + dx + sway, base - s, Math.abs(dx) === w && w ? FLAME.hot : t < 0.4 ? FLAME.core : FLAME.mid, 1);
    }
  }
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
