import { useEffect, useRef } from "react";
import { onAuraFrame, auraStill } from "../lib/aura.js";

/* ─── the cabinet's frame ─────────────────────────────────────────────
 * A frame round the cabinet that grows finer with its grade (shared/
 * economy.js cabinetScore, rank 0–6), after the coin tiers:
 *   0  an empty shelf …………………… wood
 *   1  a few curios ………………………… stone
 *   2  a fine cabinet ……………………… gold, with a glint of light crossing it
 *   3  a collector's cabinet …………… void, its stars twinkling
 *   4  an obsidian vault ………………… dark stone, small tentacles stirring at
 *                                   the corners, spores, green in the carving
 *   5  a legendary hoard ………………… eldritch: great tentacles swaying, their
 *                                   suckers pulsing, runes lit in turn, spores
 *   6  a mythic hoard ……………………… astral: stars twinkling, light running
 *                                   along the filament, planets turning, rays
 *                                   of a halo pulsing out from the corners
 * A frame can reach past its box (`bleed`, its own ornament; `room`, empty
 * pixels for effects to draw into). Up to 12 screen pixels of that may
 * spill over its surroundings' padding; any more, it makes room for.
 * The painted frames are Gemini's, rebuilt as nine-slices by tools/frames
 * (corners K × K, the sides one repeating run). Everything is drawn at
 * half size and shown at twice that, so it sits on the pixel grid at any
 * width. */

const ART = [
  { src: "/sprites/frames/wood.png",  k: 11, band: 11, plaque: { lo: [52, 34, 24], mid: [86, 58, 38], hi: [122, 84, 54], ink: [232, 196, 110] } },
  { src: "/sprites/frames/stone.png", k: 12, band: 10, plaque: { lo: [44, 46, 50], mid: [74, 76, 80], hi: [112, 114, 118], ink: [214, 218, 210] } },
  { src: "/sprites/frames/gold.png",  k: 15, band: 9,  plaque: { lo: [120, 82, 28], mid: [198, 148, 52], hi: [244, 204, 88], ink: [42, 26, 8] }, fx: "glint" },
  { src: "/sprites/frames/void.png",  k: 10, band: 9,  plaque: { lo: [18, 22, 44], mid: [30, 38, 70], hi: [150, 160, 190], ink: [214, 222, 246] }, fx: "twinkle" },
  // the tentacles reach `bleed` pixels past the frame proper, so the frame
  // is drawn that much outside the box and only the band pads its contents
  { src: "/sprites/frames/obsidian.png", k: 12, band: 12, bleed: 5, plaque: { lo: [14, 22, 24], mid: [34, 54, 58], hi: [70, 110, 112], ink: [122, 216, 136] }, fx: "writhe" },
  // the next two were drawn finer (a 95 pixel image), so their corners are
  // bigger; flat, so their parts keep the colours the effects look for
  { src: "/sprites/frames/eldritch.png", k: 34, band: 22, bleed: 10, plaque: { lo: [16, 26, 26], mid: [48, 64, 64], hi: [84, 104, 104], ink: [112, 216, 136] }, fx: "grasp" },
  { src: "/sprites/frames/astral.png",   k: 21, band: 12, bleed: 6, room: 5, plaque: { lo: [176, 150, 104], mid: [242, 232, 204], hi: [255, 250, 236], ink: [58, 52, 84] }, fx: "halo" },
];
// the Long Night's garland (Dante's own art), over every cabinet while it runs
export const XMAS_FRAME = { src: "/sprites/frames/xmas.png", k: 30, band: 19, plaque: { lo: [120, 26, 22], mid: [176, 44, 32], hi: [226, 96, 64], ink: [250, 238, 214] } };
const SPILL = 12;                                // screen pixels a frame may reach past its box for free

/* the colour a grade's name is written in: the coin rarities', with
 * obsidian's own violet slipped in at 4 */
const GRADE_INK = ["#a8a8a8", "#5fd48a", "#5aa8f0", "#b070f0", "#9a8ccc", "#f0a040", "#ff5a5a"];
export const gradeInk = rank => GRADE_INK[Math.max(0, Math.min(GRADE_INK.length - 1, rank))];
const sheets = new Map();
function sheet(src) {
  if (!sheets.has(src)) sheets.set(src, new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }));
  return sheets.get(src);
}
export const preloadFrames = () => Promise.all(ART.map(a => sheet(a.src)));
// the frame at w × h, from its nine-slice: corners as drawn, sides repeated
function lay(im, k, w, h) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d"), S9 = im.width, L = S9 - 2 * k;
  const run = (sx, sy, sw, sh, dx, dy, dw, dh, horiz) => {
    for (let o = 0; o < (horiz ? dw : dh); o += L) {
      const n = Math.min(L, (horiz ? dw : dh) - o);
      if (horiz) x.drawImage(im, sx, sy, n, sh, dx + o, dy, n, dh);
      else x.drawImage(im, sx, sy, sw, n, dx, dy + o, dw, n);
    }
  };
  run(k, 0, L, k, k, 0, w - 2 * k, k, true);                // top
  run(k, S9 - k, L, k, k, h - k, w - 2 * k, k, true);       // bottom
  run(0, k, k, L, 0, k, k, h - 2 * k, false);               // left
  run(S9 - k, k, k, L, w - k, k, k, h - 2 * k, false);      // right
  x.drawImage(im, 0, 0, k, k, 0, 0, k, k);
  x.drawImage(im, S9 - k, 0, k, k, w - k, 0, k, k);
  x.drawImage(im, 0, S9 - k, k, k, 0, h - k, k, k);
  x.drawImage(im, S9 - k, S9 - k, k, k, w - k, h - k, k, k);
  return x.getImageData(0, 0, w, h);
}
const h32 = n => { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
// the effects, over the frame's own pixels only
function fx(base, kind, f) {
  const img = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height), d = img.data, w = base.width, h = base.height;
  if (kind === "glint") {
    // a band of light crossing the frame corner to corner, then a rest
    const per = 96, at = ((f % per) / 48) * (w + h) - 8;
    if (at < w + h + 8) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, t = Math.abs(x + y - at);
      if (!d[i + 3] || t > 3) continue;
      const k = t < 1.5 ? 0.6 : 0.3;
      d[i] += (255 - d[i]) * k; d[i + 1] += (244 - d[i + 1]) * k; d[i + 2] += (190 - d[i + 2]) * k;
    }
  } else if (kind === "twinkle") {
    // stars across the band, each brightening and fading on its own beat
    const n = Math.round((w + h) / 6);
    for (let s = 0; s < n; s++) {
      const x = Math.floor(h32(s * 7 + 1) * w), y = Math.floor(h32(s * 13 + 5) * h), i = (y * w + x) * 4;
      if (!d[i + 3]) continue;
      const b = Math.sin((f / 8) * Math.PI * 2 / (1.5 + h32(s) * 2) + s);
      if (b < 0.3) continue;
      const c = b > 0.85 ? [255, 255, 255] : [170, 190, 240];
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
      if (b > 0.85) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = ((y + dy) * w + x + dx) * 4;
        if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h && d[j + 3]) { d[j] = 150; d[j + 1] = 170; d[j + 2] = 230; }
      }
    }
  }
  else if (kind === "writhe") writhe(base, d, f);
  else if (kind === "grasp") grasp(base, d, f);
  else if (kind === "halo") halo(base, d, f);
  return img;
}

/* ─── parts picked out by colour ─────────────────────────────────────
 * Done once per laid frame and kept on it: which pixels are which part,
 * by the flat colours Gemini was asked to paint them in. */
function partsOf(base, kind) {
  if (base.parts) return base.parts;
  const w = base.width, h = base.height, s = base.data, cx = (w - 1) / 2, cy = (h - 1) / 2;
  const P = { w, h, list: {} }, add = (k, x, y) => (P.list[k] ||= []).push([x, y]);
  // how far round the frame a pixel is, 0…1, clockwise from the top
  P.round = (x, y) => (Math.atan2(x - cx, cy - y) / (Math.PI * 2) + 1) % 1;
  const at = (x, y) => (y * w + x) * 4;
  const white = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return false; const i = at(x, y); return s[i + 3] && s[i] > 225 && s[i + 1] > 225 && s[i + 2] > 225; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = at(x, y); if (!s[i + 3]) continue;
    const r = s[i], g = s[i + 1], b = s[i + 2];
    if (kind === "grasp") {
      if (g > 180 && g - r > 60 && b < 170) add("spore", x, y);
      else if (g > 150 && b > 130 && r < 150) add("sucker", x, y);
      else if (g - r > 18 && g - b > 8 && r + g + b < 150) add("rune", x, y);
    } else if (kind === "halo") {
      if (white(x, y)) {
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => white(x + dx, y + dy)).length;
        add(n === 0 ? "mote" : n >= 3 ? "star" : "arm", x, y);
      }
      else if (b > 215 && g > 200 && r < 200) add("filament", x, y);
      else if (r > 200 && g < 180 && b > 140 && b < 205) add("planet", x, y);
    }
  }
  // planets as blobs, each with its middle, for the turning light
  if (P.list.planet) {
    const left = new Set(P.list.planet.map(([x, y]) => y * w + x)), blobs = [];
    for (const [x0, y0] of P.list.planet) {
      if (!left.has(y0 * w + x0)) continue;
      const q = [[x0, y0]], px = []; left.delete(y0 * w + x0);
      while (q.length) {
        const [x, y] = q.pop(); px.push([x, y]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (y + dy) * w + x + dx; if (left.has(k)) { left.delete(k); q.push([x + dx, y + dy]); } }
      }
      const mx = px.reduce((a, p) => a + p[0], 0) / px.length, my = px.reduce((a, p) => a + p[1], 0) / px.length;
      blobs.push({ px, mx, my, r: Math.sqrt(px.length / Math.PI) });
    }
    P.planets = blobs;
  }
  base.parts = P;
  return P;
}
const mix = (c, to, k) => [0, 1, 2].map(i => Math.round(c[i] + (to[i] - c[i]) * k));
const seedOf = (x, y) => h32((x >> 2) * 73856093 ^ (y >> 2) * 19349663);
const ring = (u, p) => { const d = Math.abs(u - p); return Math.min(d, 1 - d); };      // distance round the frame

/* The new eldritch frame, a legendary hoard: the great tentacles' outer
 * reach sways as one per corner, the suckers pulse in a wave, a glow runs
 * round the runes, and the spores rise a little and fade, over and over. */
function grasp(base, d, f) {
  const P = partsOf(base, "grasp"), { w, h } = P, src = base.data, ph = (f / 16) * Math.PI * 2;
  const put = (x, y, c, a = 255) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const j = (y * w + x) * 4; d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = a; };
  const get = (x, y) => { const i = (y * w + x) * 4; return [src[i], src[i + 1], src[i + 2]]; };
  const spore = new Set((P.list.spore || []).map(([x, y]) => y * w + x));
  // the tentacles' outer reach, swaying a pixel
  const M = 5, sway = [0, 1, 2, 3].map(k => [Math.round(Math.sin(ph + k * 1.7) * 0.7), Math.round(Math.cos(ph * 0.5 + k * 2.3) * 0.7)]);
  const tip = (x, y) => Math.min(x, y, w - 1 - x, h - 1 - y) < M;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (tip(x, y) || spore.has(y * w + x)) d[(y * w + x) * 4 + 3] = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (!tip(x, y) || !src[i + 3] || spore.has(y * w + x)) continue;
    const [dx, dy] = sway[(x < w / 2 ? 0 : 1) + (y < h / 2 ? 0 : 2)];
    put(x + dx, y + dy, get(x, y));
  }
  // suckers, pulsing in a wave round the frame
  for (const [x, y] of P.list.sucker || []) {
    if (tip(x, y)) continue;
    const k = (Math.sin(ph * 2 - P.round(x, y) * 40) + 1) / 2;
    put(x, y, mix(get(x, y), [200, 255, 236], k * 0.55));
  }
  // a glow going round the runes
  const at = (f % 64) / 64;
  for (const [x, y] of P.list.rune || []) {
    const r = ring(P.round(x, y), at);
    if (r < 0.03) put(x, y, [122, 216, 136]); else if (r < 0.07) put(x, y, [78, 160, 100]); else if (r < 0.11) put(x, y, [46, 112, 70]);
  }
  // the spores: each rises up to three pixels and fades, then again
  for (const [x, y] of P.list.spore || []) {
    const u = (f / 32 + seedOf(x, y)) % 1;
    put(x, y - Math.floor(u * 4), get(x, y), Math.round(255 * (1 - u * u)));
  }
}

/* The astral frame, a mythic hoard: each star twinkles on its own beat,
 * two lights run along the filament, a highlight turns on each planet,
 * the rays of a halo pulse out from the corners, and the motes drift up
 * and fade. */
function halo(base, d, f) {
  const P = partsOf(base, "halo"), { w, h } = P, src = base.data, ph = (f / 16) * Math.PI * 2;
  const put = (x, y, c, a = 255) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const j = (y * w + x) * 4; d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = a; };
  const empty = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !d[(y * w + x) * 4 + 3];
  // stars: dim, bright, and at their brightest a longer cross
  for (const [x, y] of P.list.star || []) {
    const b = Math.sin(ph * (0.5 + seedOf(x * 3, y * 3) * 0.7) + seedOf(x, y) * 9);
    const arms = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    if (b < -0.3) { put(x, y, [200, 200, 226]); for (const [dx, dy] of arms) if (!empty(x + dx, y + dy)) put(x + dx, y + dy, [150, 150, 190]); }
    else if (b > 0.75) for (const [dx, dy] of arms) if (empty(x + dx * 2, y + dy * 2)) put(x + dx * 2, y + dy * 2, [230, 236, 255], 200);
  }
  // two lights along the filament, half a frame apart
  const at = (f % 96) / 96;
  for (const [x, y] of P.list.filament || []) {
    const r = Math.min(ring(P.round(x, y), at), ring(P.round(x, y), (at + 0.5) % 1));
    if (r < 0.012) put(x, y, [244, 255, 255]); else if (r < 0.035) put(x, y, [204, 246, 255]);
  }
  // a highlight turning on each planet
  (P.planets || []).forEach((p, k) => {
    if (p.px.length < 3) return;
    const a = ph * 0.5 + k * 1.3, x = Math.round(p.mx + Math.cos(a) * p.r * 0.55), y = Math.round(p.my + Math.sin(a) * p.r * 0.55);
    if (p.px.some(([px, py]) => px === x && py === y)) put(x, y, [255, 226, 236]);
  });
  // the halo: three rays out of each corner, their length breathing
  const o = (base.room || 0) + 2;
  [[o, o, -1, -1], [w - 1 - o, o, 1, -1], [o, h - 1 - o, -1, 1], [w - 1 - o, h - 1 - o, 1, 1]].forEach(([cx, cy, sx, sy], k) => {
    [-0.42, 0, 0.42].forEach((spread, j) => {
      const ang = Math.atan2(sy, sx) + spread, len = 4 + Math.round(2.5 * (Math.sin(ph + k + j * 1.1) + 1));
      for (let t = 3; t < len + 3; t++) {
        const x = Math.round(cx + Math.cos(ang) * t), y = Math.round(cy + Math.sin(ang) * t);
        if (empty(x, y)) put(x, y, [255, 224, 138], Math.round(230 * (1 - (t - 3) / (len + 1))));
      }
    });
  });
  // motes: up two pixels and gone, then again
  for (const [x, y] of P.list.mote || []) {
    const u = (f / 24 + seedOf(x * 5, y * 5)) % 1, i = (y * w + x) * 4;
    d[i + 3] = 0;
    put(x, y - Math.floor(u * 3), [src[i], src[i + 1], src[i + 2]], Math.round(255 * (1 - u)));
  }
}


/* The eldritch frame: in the outer ring only the corner tentacles reach.
 * Their outer part sways as one, a pixel at a time, each corner on its
 * own beat, while the roots hold; spores leave the corners and drift off;
 * and here and there the carving in the band glimmers green. */
const TENT_LIT = [76, 120, 118], GLOW = [[46, 96, 64], [78, 160, 100], [122, 216, 136]];
function writhe(base, d, f) {
  const w = base.width, h = base.height, src = base.data, ph = (f / 16) * Math.PI * 2;
  const put = (x, y, c, a = 255) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const j = (y * w + x) * 4; d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = a; };
  // each corner's sway this frame: a step of at most a pixel
  const sway = [0, 1, 2, 3].map(k => [Math.round(Math.sin(ph + k * 1.7) * 0.7), Math.round(Math.cos(ph * 0.5 + k * 2.3) * 0.7)]);
  const tip = (x, y) => Math.min(x, y, w - 1 - x, h - 1 - y) < 3;       // the outer part, that moves
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (tip(x, y)) d[(y * w + x) * 4 + 3] = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (!tip(x, y) || !src[i + 3]) continue;
    const [dx, dy] = sway[(x < w / 2 ? 0 : 1) + (y < h / 2 ? 0 : 2)];
    put(x + dx, y + dy, [src[i], src[i + 1], src[i + 2]]);
  }
  // spores off each corner, rising and fading
  const corners = [[2, 2, -1, -1], [w - 3, 2, 1, -1], [2, h - 3, -1, 1], [w - 3, h - 3, 1, 1]];
  corners.forEach(([cx, cy, sx, sy], k) => {
    for (let n = 0; n < 2; n++) {
      const life = 24, age = (f + k * 7 + n * 12) % life, u = age / life;
      const x = Math.round(cx + sx * (2 + u * 6) + Math.sin(u * 6 + k) * 1.5), y = Math.round(cy - 1 - u * 9 + (sy > 0 ? 2 : 0));
      if (u < 0.85) put(x, y, u < 0.4 ? GLOW[1] : TENT_LIT, Math.round(255 * (1 - u)));
    }
  });
  // the carving glimmers: a few mid-band pixels at a time, each on its beat
  const n = Math.round((w + h) / 7);
  for (let s = 0; s < n; s++) {
    const side = s % 4, along = h32(s * 31 + 7), depth = 7 + Math.floor(h32(s * 17 + 3) * 3);
    const x = side === 0 ? Math.floor(along * w) : side === 1 ? w - 1 - depth : side === 2 ? Math.floor(along * w) : depth;
    const y = side === 0 ? depth : side === 2 ? h - 1 - depth : Math.floor(along * h);
    const i = (y * w + x) * 4;
    if (!src[i + 3] || src[i] + src[i + 1] + src[i + 2] < 60) continue;
    const b = Math.sin(ph * 0.5 + s * 2.1);
    if (b > 0.55) put(x, y, GLOW[b > 0.92 ? 2 : b > 0.75 ? 1 : 0]);
  }
}

const S = 2;                                    // screen pixels per frame pixel
// the frames still drawn in code: legendary and mythic
export const FRAME_THICK = [0, 5, 6, 7, 8, 8];  // in frame pixels

const BLACK = [8, 7, 9];
const WOOD = { lo: [52, 34, 24], mid: [86, 58, 38], hi: [122, 84, 54], grain: [70, 46, 31] };
const POLISH = { lo: [60, 32, 22], mid: [104, 58, 34], hi: [150, 92, 54], grain: [84, 46, 28] };
const DARK = { lo: [24, 16, 14], mid: [40, 27, 22], hi: [62, 42, 32], grain: [32, 21, 18] };
const BRASS = { lo: [112, 80, 36], mid: [176, 134, 62], hi: [232, 196, 110] };
const GOLD = { lo: [120, 82, 28], mid: [198, 148, 52], hi: [244, 204, 88], shine: [255, 240, 170], grain: [164, 118, 40] };
const GEM = {
  3: { lo: [92, 44, 140], mid: [170, 104, 236], hi: [232, 200, 255] },
  4: { lo: [110, 140, 170], mid: [200, 226, 246], hi: [255, 255, 255] },
  5: { lo: [140, 30, 30], mid: [255, 96, 80], hi: [255, 214, 196] },
};

function paint(ctx, w, h, rank, glint) {
  const img = ctx.createImageData(w, h), d = img.data;
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  const T = FRAME_THICK[rank];
  const inBand = (x, y) => x < T || y < T || x >= w - T || y >= h - T;
  const mat = rank === 1 ? WOOD : rank === 2 ? POLISH : rank === 3 ? DARK : GOLD;

  // the band: lit from the top-left, outer and inner edges in black
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inBand(x, y)) continue;
    const dOut = Math.min(x, y, w - 1 - x, h - 1 - y);
    if (dOut === 0 || dOut === T - 1) { put(x, y, BLACK); continue; }
    const top = y < T && y <= x && y <= w - 1 - x, left = x < T && x < y && x <= h - 1 - y;
    const lit = top || left;
    let c = dOut === 1 ? (lit ? mat.hi : mat.lo) : dOut === T - 2 ? (lit ? mat.lo : mat.hi) : mat.mid;
    // wood grain along the planks; filigree dots along the gold
    const along = y < T || y >= h - T ? x : y;
    if (rank <= 3 && c === mat.mid && (along * 7 + dOut * 13) % 11 === 0) c = mat.grain;
    if (rank >= 4 && dOut === Math.floor(T / 2) && along % 4 === 0) c = mat.hi;
    if (rank >= 4 && dOut === Math.floor(T / 2) && along % 4 === 2) c = mat.grain;
    put(x, y, c);
  }
  // a fine gold line just inside the band
  if (rank === 3) for (let y = T - 2; y <= h - T + 1; y++) for (let x = T - 2; x <= w - T + 1; x++) {
    const dOut = Math.min(x, y, w - 1 - x, h - 1 - y);
    if (dOut === T - 2) put(x, y, (x + y) % 6 === 0 ? GOLD.hi : GOLD.mid);
  }

  const corners = [[0, 0], [w - T, 0], [0, h - T], [w - T, h - T]];
  if (rank === 1) corners.forEach(([x, y]) => { put(x + 2, y + 2, [150, 150, 150]); put(x + T - 3, y + T - 3, [70, 70, 74]); });
  if (rank === 2) corners.forEach(([x, y]) => {
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      const e = i === 0 || j === 0 || i === T - 1 || j === T - 1;
      put(x + i, y + j, e ? BLACK : i + j < T - 1 ? BRASS.hi : i + j > T ? BRASS.lo : BRASS.mid);
    }
    put(x + 2, y + 2, BRASS.hi);
  });
  // rosettes and gems: a diamond in the corners, and gems mid-side
  const diamond = (cx, cy, r, pal) => {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const m = Math.abs(i) + Math.abs(j);
      if (m > r) continue;
      put(cx + i, cy + j, m === r ? BLACK : i + j < -1 ? pal.hi : i + j > 0 ? pal.lo : pal.mid);
    }
  };
  if (rank >= 3) {
    const r = Math.floor(T / 2), rose = rank === 3 ? GOLD : { lo: GOLD.lo, mid: GOLD.hi, hi: GOLD.shine };
    corners.forEach(([x, y]) => diamond(x + r, y + r, r, rose));
    const g = GEM[rank], rg = r - 1;
    [[w >> 1, r], [w >> 1, h - 1 - r], [r, h >> 1], [w - 1 - r, h >> 1]].forEach(([x, y]) => diamond(x, y, rg + (rank === 5 ? 1 : 0), g));
    if (rank >= 4) [[w >> 2, r], [(w * 3) >> 2, r], [w >> 2, h - 1 - r], [(w * 3) >> 2, h - 1 - r]].forEach(([x, y]) => diamond(x, y, rg - 1, g));
  }
  // the mythic glint: a short run of light travelling round the band
  if (rank === 5 && glint != null) {
    const per = 2 * (w + h), at = Math.floor(glint * per);
    for (let k = -4; k <= 4; k++) {
      let p = ((at + k) % per + per) % per, x, y;
      if (p < w) { x = p; y = 1; } else if ((p -= w) < h) { x = w - 2; y = p; } else if ((p -= h) < w) { x = w - 1 - p; y = h - 2; } else { x = 1; y = h - 1 - (p - w); }
      const c = Math.abs(k) < 2 ? GOLD.shine : GOLD.hi;
      for (let s = 0; s < T - 2; s++) {
        const xx = y === 1 || y === h - 2 ? x : x === 1 ? 1 + s : w - 2 - s, yy = y === 1 ? 1 + s : y === h - 2 ? h - 2 - s : y;
        if (Math.abs(k) + s < 5) put(xx, yy, c);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

// the plaque on the frame's foot, in the frame's own material
const PLAQUE = [null, null, null, null, { lo: [120, 82, 28], mid: [198, 148, 52], hi: [244, 204, 88], ink: [42, 26, 8] }, { lo: [120, 82, 28], mid: [198, 148, 52], hi: [244, 204, 88], ink: [42, 26, 8] }];
const css = c => `rgb(${c.join(",")})`;

export default function CabinetFrame({ rank = 0, score = null, children, pad = 0, dress = null }) {
  const box = useRef(null), cv = useRef(null);
  const art = dress || ART[rank];
  useEffect(() => {
    const el = box.current, c = cv.current; if (!el || !c) return;
    let w = 0, h = 0, off = null, base = null, live = true;
    const still = auraStill();
    const draw = f => {
      if (!w || !h) return;
      if (!art) return paint(c.getContext("2d"), w, h, rank, f == null ? null : (f % 48) / 48);
      if (!base) return;
      c.getContext("2d").putImageData(art.fx && f != null ? fx(base, art.fx, f) : base, 0, 0);
    };
    const size = async () => {
      const b = art?.bleed || 0, r = art?.room || 0, out = b + r;
      w = Math.floor(el.clientWidth / S) + 2 * out; h = Math.floor(el.clientHeight / S) + 2 * out;
      c.width = w; c.height = h; c.style.width = w * S + "px"; c.style.height = h * S + "px";
      c.style.left = c.style.top = -out * S + "px";
      if (art) {
        const im = await sheet(art.src); if (!live || !im) return;
        const laid = lay(im, art.k, w - 2 * r, h - 2 * r);
        if (!r) base = laid;
        else {                                   // the frame inside an empty margin, for effects to draw into
          base = new ImageData(w, h);
          for (let y = 0; y < laid.height; y++) base.data.set(laid.data.subarray(y * laid.width * 4, (y + 1) * laid.width * 4), ((y + r) * w + r) * 4);
        }
        base.room = r;
      }
      draw(still ? null : 0);
    };
    const ro = new ResizeObserver(size); ro.observe(el); size();
    if (!still && (art ? art.fx : rank === 5)) off = onAuraFrame(draw);
    return () => { live = false; ro.disconnect(); off?.(); };
  }, [rank, art]);
  const P = (art ? art.band - (art.bleed || 0) : FRAME_THICK[rank]) * S + pad, m = art ? art.plaque : PLAQUE[rank];
  const reach = art ? ((art.bleed || 0) + (art.room || 0)) * S : 0, spare = Math.max(0, reach - SPILL);
  return (
    <div style={{ paddingBottom: score != null ? 12 : 0, margin: spare ? `${spare}px ${spare}px ${Math.max(0, spare - 12)}px` : 0 }}>
      <div ref={box} style={{ position: "relative", padding: P }}>
        <canvas ref={cv} aria-hidden style={{ position: "absolute", left: 0, top: 0, imageRendering: "pixelated", pointerEvents: "none", zIndex: 1 }}/>
        {children}
        {score != null && (
          <div className="t-label" aria-hidden style={{
            position: "absolute", left: "50%", bottom: 0, transform: "translate(-50%, 50%)", padding: "4px 10px", zIndex: 2,
            background: css(m.mid), color: css(m.ink),
            boxShadow: `0 0 0 2px #000, inset 2px 2px 0 ${css(m.hi)}, inset -2px -2px 0 ${css(m.lo)}`, whiteSpace: "nowrap",
          }}>{score.toLocaleString()}</div>
        )}
      </div>
    </div>
  );
}
