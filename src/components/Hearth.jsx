/* The Long Night's hearth, on the profile while the event runs: a stone
 * fireplace hung with stockings and greenery, its fire alive, and above
 * it a shelf with a place for each of the Magi's snow globes (shared/
 * events.js RELICS); a globe not yet found stands there in shadow.
 * Painted here pixel by pixel, 160 × 150, and scaled to its column. The
 * room is painted once; each tick only the fire, its light and the
 * candle flames move (still, one frame, for reduced motion). */
import { useEffect, useRef } from "react";
import { RELICS } from "../../shared/events.js";
import CoinCanvas from "./CoinCanvas.jsx";
import { onAuraFrame, auraStill } from "../lib/aura.js";

const W = 160, H = 150;
// where things stand, in the picture's own pixels
const SHELF = 41, SLOTS = [40, 80, 120], GLOBE = 32;
const FIRE = { x: 48, y: 86, w: 64, h: 42 };          // the fire's own box, inside the firebox
const BOX = { x0: 32, x1: 127, y0: 72, y1: 135 };     // the firebox's opening

const h32 = n => { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

function paintRoom() {
  const img = new ImageData(W, H), d = img.data;
  img.front = new Uint8Array(W * H);                                   // pixels the fire stays behind
  const set = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, typeof c === "function" ? c(x, y) : c); };

  // the wall: dark stone, coursed, each stone a little different
  rect(0, 0, W - 1, H - 1, (x, y) => {
    const row = Math.floor(y / 7), off = row % 2 ? 6 : 0, col = Math.floor((x + off) / 13);
    if (y % 7 === 6 || (x + off) % 13 === 12) return [26, 22, 26];
    const v = h32(row * 97 + col * 13) * 10 - 5;
    return [46 + v, 40 + v, 44 + v].map(Math.round);
  });

  // the shelf for the globes, on two brackets
  rect(12, SHELF, 147, SHELF, [178, 124, 72]);
  rect(12, SHELF + 1, 147, SHELF + 3, (x, y) => (x + y * 3) % 11 === 0 ? [104, 64, 36] : [132, 84, 46]);
  rect(12, SHELF + 4, 147, SHELF + 4, [60, 36, 22]);
  for (const bx of [22, 137]) for (let k = 0; k < 7; k++) { rect(bx - 1, SHELF + 5 + k, bx + 6 - k, SHELF + 5 + k, k === 0 ? [104, 64, 36] : [86, 52, 30]); set(bx - 1, SHELF + 5 + k, [60, 36, 22]); }
  // a soft shadow on the wall under it
  rect(14, SHELF + 5, 145, SHELF + 6, (x, y) => { const i = (y * W + x) * 4; return [d[i] * 0.6, d[i + 1] * 0.6, d[i + 2] * 0.6].map(Math.round); });

  // the columns, fluted, with their capitals and medallions
  const STONE = [[120, 108, 96], [156, 144, 128], [192, 180, 160], [214, 204, 186]];
  for (const [c0, c1] of [[10, 31], [128, 149]]) {
    rect(c0 + 1, 82, c1 - 1, 134, (x) => { const f = (x - c0) % 4; return f === 0 ? STONE[0] : f === 3 ? STONE[1] : x < (c0 + c1) / 2 ? STONE[3] : STONE[2]; });
    rect(c0, 70, c1, 81, (x, y) => y === 70 ? STONE[3] : y === 81 ? STONE[0] : x === c0 ? STONE[3] : x === c1 ? STONE[0] : STONE[2]);
    const mx = (c0 + c1) >> 1;
    for (let y = 72; y < 80; y++) for (let x = mx - 4; x <= mx + 4; x++) { const r = Math.hypot(x - mx, y - 75.5); if (r < 3.6 && r > 2.2) set(x, y, r > 3 ? STONE[0] : STONE[3]); }
    rect(c0 - 1, 134, c1 + 1, 137, (x, y) => y === 134 ? STONE[3] : y === 137 ? STONE[0] : STONE[2]);
  }

  // the firebox: brick, its back wall lit by the fire (the light itself moves; see glow)
  rect(BOX.x0, BOX.y0, BOX.x1, BOX.y1, (x, y) => {
    const row = Math.floor((y - BOX.y0) / 5), off = row % 2 ? 4 : 0;
    const side = x < BOX.x0 + 8 || x > BOX.x1 - 8, top = y < BOX.y0 + 6;
    if ((y - BOX.y0) % 5 === 4 || (x + off) % 9 === 8) return side || top ? [20, 12, 10] : [42, 22, 16];
    const v = h32(row * 31 + Math.floor((x + off) / 9)) * 14 - 7;
    const b = side || top ? [54, 30, 22] : [104, 50, 32];
    return b.map(c => Math.round(c + v));
  });
  rect(BOX.x0, BOX.y0, BOX.x1, BOX.y0 + 2, [14, 8, 8]);

  // the mantel: a long slab over a carved frieze
  rect(4, 60, 155, 63, (x, y) => y === 60 ? [226, 216, 198] : y === 63 ? STONE[0] : STONE[2]);
  rect(8, 64, 151, 69, (x, y) => y === 69 ? STONE[0] : (x % 8 === 0 && y > 65) ? STONE[1] : STONE[3]);

  // fir along the mantel's edge, with berries and baubles, a bow at its middle
  for (let x = 4; x < 156; x++) {
    const top = 56 + Math.round(Math.sin(x * 0.7) * 1.2 + h32(x * 7) * 1.5), drop = 62 + Math.round(h32(x * 3) * 3);
    for (let y = top; y <= drop; y++) {
      const h = h32(x * 131 + y * 17);
      set(x, y, y === top ? [74, 122, 70] : h < 0.25 ? [26, 54, 34] : h < 0.6 ? [40, 82, 48] : [56, 104, 60]);
    }
    if (h32(x * 53) < 0.12) set(x, top + 2, [214, 44, 40]);
  }
  for (const bx of [24, 52, 108, 136]) { rect(bx - 1, 61, bx + 1, 63, [196, 40, 36]); set(bx - 1, 61, [246, 120, 96]); }
  // the bow
  const bow = ["#..###..#", "##.###.##", "#########", "##.###.##", "#..#.#..#", "...#.#...", "..#...#.."];
  bow.forEach((r, ry) => [...r].forEach((ch, rx) => { if (ch === "#") set(76 + rx, 54 + ry, ry === 0 || rx === 4 ? [236, 84, 70] : [184, 30, 34]); }));

  // three stockings, hung from the frieze: a fur cuff, the leg, a heel
  // and toe in the cuff's white, the toes pointing in to the middle
  const LEG = [[0, 12], [0, 12], [0, 12], [0, 12], [2, 10], [2, 10], [2, 10], [2, 10], [2, 10], [2, 10], [2, 10], [2, 10], [2, 11], [2, 12], [1, 13], [1, 13], [1, 13], [2, 12], [3, 10]];
  [[56, [176, 34, 38], [116, 18, 24], 1], [80, [48, 110, 66], [26, 70, 40], 1], [104, [176, 34, 38], [116, 18, 24], -1]].forEach(([sx, c, dk, dir]) => {
    const y0 = 70;
    LEG.forEach(([l, r], ry) => {
      for (let rx = l; rx <= r; rx++) {
        const x = dir > 0 ? sx - 6 + rx : sx + 6 - rx, y = y0 + ry;
        const edge = rx === l || rx === r || ry === LEG.length - 1;
        const cuff = ry < 4, heel = ry >= 14 && rx <= 4, toe = ry >= 13 && rx >= r - 2;
        img.front[y * W + x] = 1;
        set(x, y, cuff ? (ry === 3 || edge ? [196, 190, 182] : (rx + ry) % 3 ? [244, 240, 232] : [226, 222, 214])
                 : heel || toe ? (edge ? [176, 170, 162] : [232, 228, 220])
                 : edge ? dk : ry % 4 === 1 && rx % 4 === 2 ? [226, 196, 110] : c);
      }
    });
    set(sx, 68, [90, 70, 50]); set(sx, 69, [90, 70, 50]);           // its hook
  });

  // the logs and the grate
  for (let x = 48; x < 112; x++) for (let y = 0; y < 5; y++) {
    const ly = 122 + y + Math.round((x - 48) * 0.06), ry = 124 + y - Math.round((x - 48) * 0.06);
    img.front[ly * W + x] = 1; if (x > 54 && x < 106) img.front[ry * W + x] = 1;
    set(x, ly, y === 0 ? [140, 92, 56] : y === 4 ? [40, 24, 16] : (x * 3 + y) % 7 === 0 ? [70, 42, 26] : [102, 64, 38]);
    if (x > 54 && x < 106) set(x, ry, y === 0 ? [150, 100, 60] : y === 4 ? [40, 24, 16] : (x * 5 + y) % 9 === 0 ? [70, 42, 26] : [116, 74, 44]);
  }
  for (const [lx, ly] of [[48, 122], [110, 125]]) for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) set(lx + x - 1, ly + y, Math.hypot(x - 1, y - 2) < 1.2 ? [200, 160, 110] : [150, 110, 70]);
  rect(40, 131, 120, 132, [24, 20, 22]);
  for (let x = 42; x <= 118; x += 6) rect(x, 128, x, 131, [36, 30, 34]);
  rect(40, 128, 40, 134, [24, 20, 22]); rect(120, 128, 120, 134, [24, 20, 22]);

  // the hearth stone
  rect(2, 138, 157, 149, (x, y) => y === 138 ? [214, 204, 186] : (x + (y > 143 ? 9 : 0)) % 26 === 0 ? STONE[0] : y > 146 ? STONE[1] : STONE[2]);

  // the candles on the mantel (their flames move; see flames)
  for (const cx of CANDLES) rect(cx, 50, cx + 1, 59, (x, y) => (y === 50 ? [250, 246, 230] : x === cx ? [236, 228, 206] : [196, 186, 164]));
  return img;
}
const CANDLES = [14, 22, 137, 145];

// the fire's heat, 0..36, rising and cooling: classic and cheap
const PAL = [[0, 0, 0, 0], [40, 8, 6, 120], [70, 14, 8, 170], [110, 22, 10, 210], [150, 36, 12, 235], [186, 54, 14], [214, 76, 16], [232, 104, 20], [242, 134, 28], [248, 164, 44], [252, 196, 74], [255, 222, 120], [255, 242, 186], [255, 252, 232]];
const hot = v => PAL[Math.min(PAL.length - 1, Math.floor(v / 36 * (PAL.length - 1) + 0.5))];
function makeFire() {
  const { w, h } = FIRE, heat = new Float32Array(w * h);
  return () => {
    // the coals along the bottom, hottest in the middle
    for (let x = 0; x < w; x++) {
      const m = 1 - Math.abs(x - w / 2) / (w / 2);
      heat[(h - 1) * w + x] = m > 0.2 ? Math.min(36, 22 + m * 20 + Math.random() * 10) : 0;
    }
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) {
      const src = heat[y * w + x], edge = Math.abs(x - w / 2) / (w / 2);
      const drift = Math.round(Math.random() * 2 - 1.2);
      const cool = Math.random() * (0.9 + edge * edge * 4.2) * (Math.random() < 0.08 ? 3 : 1);
      const to = (y - 1) * w + Math.max(0, Math.min(w - 1, x + drift));
      heat[to] = Math.max(0, src - cool);
    }
    return heat;
  };
}

function frameOf(base, step, t) {
  const img = new ImageData(new Uint8ClampedArray(base.data), W, H), d = img.data;
  const heat = step(), { x: fx, y: fy, w, h } = FIRE;
  const flick = 0.82 + Math.sin(t * 0.9) * 0.06 + Math.random() * 0.12;
  // the fire's light on the firebox and the hearth, warm, falling away
  const lx = fx + w / 2, ly = fy + h - 6;
  for (let y = BOX.y0; y < H; y++) for (let x = 0; x < W; x++) {
    const inBox = x >= BOX.x0 && x <= BOX.x1 && y <= BOX.y1, onHearth = y >= 138;
    if (!inBox && !onHearth) continue;
    const r = Math.hypot((x - lx) * 0.8, y - ly), a = Math.max(0, 1 - r / (inBox ? 58 : 70)) * flick * (inBox ? 0.9 : 0.45) * (base.front[y * W + x] ? 0.3 : 1);
    if (a <= 0) continue;
    const i = (y * W + x) * 4;
    d[i] = Math.min(255, d[i] + 150 * a); d[i + 1] = Math.min(255, d[i + 1] + 70 * a); d[i + 2] = Math.min(255, d[i + 2] + 18 * a);
  }
  // the flames, over the logs' back and the back wall
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = heat[y * w + x]; if (v < 2) continue;
    const c = hot(v), i = ((fy + y) * W + fx + x) * 4, a = (c[3] ?? 255) / 255;
    const py = fy + y; if (py > 127 || base.front[py * W + fx + x]) continue;   // the logs stay in front of their own fire
    d[i] = d[i] + (c[0] - d[i]) * a; d[i + 1] = d[i + 1] + (c[1] - d[i + 1]) * a; d[i + 2] = d[i + 2] + (c[2] - d[i + 2]) * a;
  }
  // embers drifting up
  for (let k = 0; k < 5; k++) {
    const ph = h32(k * 71), ey = Math.round(fy + h - ((t * (0.8 + ph) * 3 + ph * 60) % 50)), ex = Math.round(fx + w / 2 + (h32(k * 13) - 0.5) * 40 + Math.sin(t * 0.7 + k) * 3);
    if (ey > BOX.y0 + 3 && ey < fy + h - 4) { const i = (ey * W + ex) * 4; d[i] = 255; d[i + 1] = 190; d[i + 2] = 80; }
  }
  // the candle flames: two pixels and a tip that leans
  CANDLES.forEach((cx, n) => {
    const lean = Math.sin(t * 1.3 + n * 2) > 0.6 ? 1 : 0;
    for (const [x, y, c] of [[cx, 49, [255, 214, 110]], [cx + 1, 49, [255, 236, 170]], [cx + lean, 48, [255, 244, 210]], [cx + lean, 47, [255, 196, 90]]]) {
      const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  });
  return img;
}

export default function Hearth({ relics = [] }) {
  const cv = useRef(null);
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d"), base = paintRoom(), step = makeFire();
    for (let i = 0; i < 40; i++) step();                                 // let it catch before it is seen
    let t = 0;
    const tick = () => { t += 1; ctx.putImageData(frameOf(base, step, t), 0, 0); };
    tick();
    if (auraStill()) return;
    let off = null;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !off) off = onAuraFrame(tick); else if (!e.isIntersecting && off) { off(); off = null; } });
    io.observe(c);
    return () => { io.disconnect(); off?.(); };
  }, []);
  const set = RELICS.magi, have = new Set(relics);
  return (
    <figure style={{ position: "relative", margin: 0, width: "100%", aspectRatio: `${W} / ${H}`, border: "2px solid #000" }}
            aria-label={`A fireplace for the Long Night. On the shelf, ${set.coins.filter((_, i) => have.has(`magi:${i}`)).map(c => c.name.toLowerCase()).join(", ") || "no snow globes yet"}.`}>
      <canvas ref={cv} width={W} height={H} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }}/>
      {SLOTS.map((sx, i) => {
        const id = `magi:${i}`, has = have.has(id);
        return (
          <div key={id} aria-hidden style={{
            position: "absolute", left: `${((sx - GLOBE / 2) / W) * 100}%`, top: `${((SHELF + 1 - GLOBE) / H) * 100}%`, width: `${(GLOBE / W) * 100}%`,
            opacity: has ? 1 : 0.4, filter: has ? "none" : "brightness(0)",
          }}>
            <Fit><CoinCanvas coin={{ seed: 7, metalIdx: set.metal, rarity: 5, relic: id, shape: "round" }} size={64} aura={false}/></Fit>
          </div>
        );
      })}
    </figure>
  );
}

// a 64px coin scaled to its slot's width
function Fit({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => { const k = el.parentElement.clientWidth / 64; el.style.transform = `scale(${k})`; });
    ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, []);
  return <div ref={ref} style={{ width: 64, height: 64, transformOrigin: "0 0", lineHeight: 0 }}>{children}</div>;
}
