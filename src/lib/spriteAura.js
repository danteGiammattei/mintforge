/* ─── a sprite's aura, as in the "aura animation sprite" reference ────────
 * A flat cloak of one colour hugging the sprite, its edge flickering, and
 * above it flame-like wisps that rise, curl and break into drops that
 * drift off. Drawn in pixels around any sprite canvas; the sprite itself
 * goes on top, bobbing a pixel.
 *
 *   auraFrame(src, colour, level, f) → a canvas, padded PAD all round and
 *   TOP above, for frame f of a seamless LOOP. level 1 is a quiet cloak,
 *   2 adds wisps, 3 more and taller ones. Each frame is drawn once and
 *   kept. */

export const LOOP = 12, PAD = 3, TOP = 12;

const h32 = n => { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * k));
  return `rgb(${c.join(",")})`;
};

const kept = new Map(), ids = new WeakMap();
let nextId = 0;
export function auraFrame(src, colour, level, f) {
  f = ((f % LOOP) + LOOP) % LOOP;
  const key = `${src.width}x${src.height}:${colour}:${level}:${f}:${ids.get(src) ?? (ids.set(src, ++nextId), nextId)}`;
  if (kept.has(key)) return kept.get(key);

  const sw = src.width, sh = src.height, W = sw + PAD * 2, H = sh + PAD + TOP;
  const sd = src.getContext("2d").getImageData(0, 0, sw, sh).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < sw && y < sh && sd[(y * sw + x) * 4 + 3] > 0;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d"), dot = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
  const ph = (f / LOOP) * Math.PI * 2;

  // the cloak: a flat blob round the sprite, reaching further upward (it
  // is flame), its edge rippling slowly round it
  const dark = shade(colour, 0.7);
  const base = 1.6 + level * 0.5;
  // level 0: no aura at all, just the same frame, so a plain sprite sits
  // where its glowing neighbours do
  if (level > 0) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = x - PAD, sy = y - TOP;
    if (on(sx, sy)) continue;
    let best = 9;
    for (let dy = -4; dy <= 7; dy++) for (let dx = -4; dx <= 4; dx++) {
      if (!on(sx + dx, sy + dy)) continue;
      const d = Math.hypot(dx, dy > 0 ? dy * 0.55 : dy * 1.4);    // above the sprite it reaches further
      if (d < best) best = d;
    }
    const a = Math.atan2(sy - sh / 2, sx - sw / 2);
    const reach = base + 0.9 * Math.sin(a * 5 + ph * 2) + 0.5 * Math.sin(a * 3 - ph);
    if (best <= reach) dot(x, y, best > reach - 0.8 && level > 1 && (x + y + f) % 3 === 0 ? dark : colour);
  }

  // the wisps: rising from the top of the cloak, swaying, curling at the
  // tip, then letting go of a drop that drifts on up
  if (level > 1) {
    const tops = [];
    for (let x = 0; x < sw; x++) for (let y = 0; y < sh; y++) if (on(x, y)) { tops.push([x, y]); break; }
    const n = level > 2 ? 4 : 2;
    for (let k = 0; k < n; k++) {
      const [tx, ty] = tops[Math.floor(((k + 0.5) / n) * tops.length)] || [sw / 2, 0];
      const life = (f + Math.floor(h32(k * 977) * LOOP)) % LOOP, u = life / LOOP;
      const len = Math.round((level > 2 ? 10 : 7) * Math.sin(u * Math.PI) + 3);
      const lean = k % 2 ? 1 : -1;
      let x0 = tx + PAD, y0 = ty + TOP - Math.round(base);
      for (let s = 0; s < len; s++) {
        const x = Math.round(x0 + Math.sin(s * 0.7 + ph + k) * (s / len) * 1.6 + lean * (s / len) * 1.2), y = y0 - s;
        dot(x, y, colour);
        if (s < len * 0.6) dot(x + 1, y, colour);          // thick at the root
        if (s === len - 1) { dot(x + lean, y - 1, colour); dot(x + lean * 2, y, colour); }   // the curl
      }
      // a drop let go, higher each frame, gone at the top
      const dy = Math.round(len + 2 + u * 10);
      if (u > 0.35 && y0 - dy > 0) dot(Math.round(x0 + lean * 2 + Math.sin(ph + k) * 1.5), y0 - dy, colour);
    }
  }

  // the sprite on top, breathing a pixel
  c.drawImage(src, PAD, TOP + (Math.sin(ph) > 0.3 ? -1 : 0));
  kept.set(key, cv);
  return cv;
}
