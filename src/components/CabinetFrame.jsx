import { useEffect, useRef } from "react";
import { onAuraFrame, auraStill } from "../lib/aura.js";

/* ─── the cabinet's frame ─────────────────────────────────────────────
 * A frame round the cabinet that grows finer with its grade (shared/
 * economy.js cabinetScore, rank 0–5). Drawn in pixels at half size and
 * shown at twice that, so it sits on the pixel grid at any width.
 *   0  an empty shelf: no frame
 *   1  a few curios: a plain plank frame, nailed at the corners
 *   2  a fine cabinet: polished wood with brass corner caps
 *   3  a collector's cabinet: dark wood, a gold inner line, corner rosettes
 *      and purple gems at the middle of each side
 *   4  a legendary hoard: gilded, bevelled, with filigree along it and
 *      white gems
 *   5  a mythic hoard: as legendary, with red gems and a glint of light
 *      that runs round the frame */

const S = 2;                                    // screen pixels per frame pixel
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
const PLAQUE = [null, WOOD, POLISH, DARK, GOLD, GOLD];
const css = c => `rgb(${c.join(",")})`;

export default function CabinetFrame({ rank = 0, score = null, children, pad = 0 }) {
  const box = useRef(null), cv = useRef(null);
  useEffect(() => {
    if (!rank) return;
    const el = box.current, c = cv.current; if (!el || !c) return;
    let w = 0, h = 0, off = null;
    const draw = f => { if (w && h) paint(c.getContext("2d"), w, h, rank, f == null ? null : (f % 48) / 48); };
    const size = () => {
      w = Math.floor(el.clientWidth / S); h = Math.floor(el.clientHeight / S);
      c.width = w; c.height = h; c.style.width = w * S + "px"; c.style.height = h * S + "px";
      draw(rank === 5 && !auraStill() ? 0 : null);
    };
    const ro = new ResizeObserver(size); ro.observe(el); size();
    if (rank === 5 && !auraStill()) off = onAuraFrame(draw);
    return () => { ro.disconnect(); off?.(); };
  }, [rank]);
  if (!rank) return children;
  const P = FRAME_THICK[rank] * S + pad, m = PLAQUE[rank];
  return (
    <div style={{ paddingBottom: score != null ? 12 : 0 }}>
      <div ref={box} style={{ position: "relative", padding: P }}>
        <canvas ref={cv} aria-hidden style={{ position: "absolute", left: 0, top: 0, imageRendering: "pixelated", pointerEvents: "none" }}/>
        {children}
        {score != null && (
          <div className="t-label" aria-hidden style={{
            position: "absolute", left: "50%", bottom: 0, transform: "translate(-50%, 50%)", padding: "4px 10px",
            background: css(m.mid), color: rank >= 4 ? "#2a1a08" : css(rank === 3 ? GOLD.hi : BRASS.hi),
            boxShadow: `0 0 0 2px #000, inset 2px 2px 0 ${css(m.hi)}, inset -2px -2px 0 ${css(m.lo)}`, whiteSpace: "nowrap",
          }}>{score.toLocaleString()}</div>
        )}
      </div>
    </div>
  );
}
