import { useEffect, useRef } from "react";
import { onAuraFrame, auraStill } from "../lib/aura.js";

/* ─── the cabinet's frame ─────────────────────────────────────────────
 * A frame round the cabinet that grows finer with its grade (shared/
 * economy.js cabinetScore, rank 0–5), after the coin tiers:
 *   0  an empty shelf / a few curios … wood
 *   1  a few curios ………………………… stone
 *   2  a fine cabinet ……………………… gold, with a glint of light crossing it
 *   3  a collector's cabinet …………… void, its stars twinkling
 *   4  a legendary hoard ………………… (eldritch, to come: drawn in code for now)
 *   5  a mythic hoard ……………………… (astral, to come: drawn in code for now)
 * The painted frames are Gemini's, rebuilt as nine-slices by tools/frames
 * (corners K × K, the sides one repeating run). Everything is drawn at
 * half size and shown at twice that, so it sits on the pixel grid at any
 * width. */

const ART = [
  { src: "/sprites/frames/wood.png",  k: 11, band: 11, plaque: { lo: [52, 34, 24], mid: [86, 58, 38], hi: [122, 84, 54], ink: [232, 196, 110] } },
  { src: "/sprites/frames/stone.png", k: 12, band: 10, plaque: { lo: [44, 46, 50], mid: [74, 76, 80], hi: [112, 114, 118], ink: [214, 218, 210] } },
  { src: "/sprites/frames/gold.png",  k: 15, band: 9,  plaque: { lo: [120, 82, 28], mid: [198, 148, 52], hi: [244, 204, 88], ink: [42, 26, 8] }, fx: "glint" },
  { src: "/sprites/frames/void.png",  k: 10, band: 9,  plaque: { lo: [18, 22, 44], mid: [30, 38, 70], hi: [150, 160, 190], ink: [214, 222, 246] }, fx: "twinkle" },
];
const sheets = new Map();
function sheet(src) {
  if (!sheets.has(src)) sheets.set(src, new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }));
  return sheets.get(src);
}
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
  return img;
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

export default function CabinetFrame({ rank = 0, score = null, children, pad = 0 }) {
  const box = useRef(null), cv = useRef(null);
  const art = ART[rank];
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
      w = Math.floor(el.clientWidth / S); h = Math.floor(el.clientHeight / S);
      c.width = w; c.height = h; c.style.width = w * S + "px"; c.style.height = h * S + "px";
      if (art) { const im = await sheet(art.src); if (!live || !im) return; base = lay(im, art.k, w, h); }
      draw(still ? null : 0);
    };
    const ro = new ResizeObserver(size); ro.observe(el); size();
    if (!still && (art ? art.fx : rank === 5)) off = onAuraFrame(draw);
    return () => { live = false; ro.disconnect(); off?.(); };
  }, [rank, art]);
  const P = (art ? art.band : FRAME_THICK[rank]) * S + pad, m = art ? art.plaque : PLAQUE[rank];
  return (
    <div style={{ paddingBottom: score != null ? 12 : 0 }}>
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
