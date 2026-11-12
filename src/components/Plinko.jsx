import { useEffect, useRef } from "react";
import { GAMBLE } from "../../shared/tuning.js";
import { plinkoOdds } from "../../shared/economy.js";
import { METALS } from "../lib/data.js";
import { SECTOR_COLOURS } from "./RouletteWheel.jsx";

/* ─── PLINKO ──────────────────────────────────────────────────────────────
 * Eight rows of pegs over nine slots. The server decides the path — one
 * left or right per row — and this replays it: the coin drops onto the
 * top peg, hops a peg left or right at each row, and falls into the slot
 * the path ends in. Drawn on a 160×150 pixel board at a whole 2×.
 *
 *   dropping  true from the moment the stake is placed
 *   path      null until the server answers, then [0|1 × rows]
 *   metal     the staked coin's metal, for the colour of the falling coin
 *   onLanded  called once, when the coin is in its slot                  */
const BW = 160, BH = 150, SCALE = 2;
const S = 15, TOP = 20, ROW = 13, CX = BW / 2;
const N = GAMBLE.plinko.rows, SLOTS = GAMBLE.plinko.slots;
const SLOT_Y = TOP + N * ROW + 4;
const pegX = (row, j) => CX + (j - row / 2) * S;
const slotX = k => CX + (k - N / 2) * S;
const SYMBOL = { lose: "X", same: "=", up1: "+1", x2: "2x", up2: "+2", jackpot: "JP" };

export default function Plinko({ dropping, path, metal = 0, onLanded }) {
  const ref = useRef(null);
  const st = useRef({ raf: 0, t0: 0, landed: -1, hop: -1 });

  const draw = (ball, lit) => {
    const cv = ref.current; if (!cv) return;
    const c = cv.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#0a0c0f"; c.fillRect(0, 0, BW, BH);
    // pegs: a lit top edge, as if a lamp hangs over the board
    for (let r = 0; r < N; r++) for (let j = 0; j <= r; j++) {
      const x = Math.round(pegX(r, j)), y = TOP + r * ROW;
      c.fillStyle = "#000"; c.fillRect(x - 2, y - 1, 4, 4);
      c.fillStyle = "#4a5466"; c.fillRect(x - 1, y, 2, 2);
      c.fillStyle = "#98a19a"; c.fillRect(x - 1, y, 2, 1);
    }
    // slots, in the colours the roulette wheel uses for the same outcomes
    for (let k = 0; k <= N; k++) {
      const [fill, edge] = SECTOR_COLOURS[SLOTS[k]];
      const x = Math.round(slotX(k) - S / 2) + 1, w = S - 2;
      c.fillStyle = lit === k ? edge : fill; c.fillRect(x, SLOT_Y, w, BH - SLOT_Y - 2);
      c.fillStyle = edge; c.fillRect(x, SLOT_Y, w, 1);
      c.fillStyle = "#000"; c.fillRect(x - 1, SLOT_Y - 6, 1, BH - SLOT_Y + 4);
    }
    c.fillStyle = "#000"; c.fillRect(Math.round(slotX(N) + S / 2), SLOT_Y - 6, 1, BH - SLOT_Y + 4);
    if (ball) {
      const m = METALS[metal] || METALS[0], x = Math.round(ball.x), y = Math.round(ball.y);
      c.fillStyle = "#000"; c.fillRect(x - 3, y - 3, 6, 6);
      c.fillStyle = m.base; c.fillRect(x - 2, y - 2, 4, 4);
      c.fillStyle = m.hl; c.fillRect(x - 2, y - 2, 2, 1); c.fillRect(x - 2, y - 2, 1, 2);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { draw(null, -1); }, []);

  useEffect(() => {
    const s = st.current;
    cancelAnimationFrame(s.raf);
    if (!dropping) { s.landed = -1; draw(null, -1); return; }
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const HOP = calm ? 40 : 190;                         // ms per row
    // while waiting for the server the coin wobbles above the board
    if (!path) {
      const t0 = performance.now();
      const wait = now => { draw({ x: CX + Math.sin((now - t0) / 120) * 3, y: 7 }, -1); s.raf = requestAnimationFrame(wait); };
      s.raf = requestAnimationFrame(wait);
      return () => cancelAnimationFrame(s.raf);
    }
    // the stops: onto the top peg, then each row's peg, then the slot
    const pos = [0];
    for (const b of path) pos.push(pos[pos.length - 1] + b);
    const at = i => (i < N ? { x: pegX(i, pos[i]), y: TOP + i * ROW - 4 } : { x: slotX(pos[N]), y: SLOT_Y + 6 });
    const t0 = performance.now(), slot = pos[N];
    const tick = now => {
      const t = (now - t0) / HOP;
      if (t < 1) { const k = t * t; draw({ x: CX, y: 7 + (at(0).y - 7) * k }, -1); }
      else {
        const i = Math.floor(t), u = t - i;                // hop i: stop i-1 → stop i; stop N is the slot
        if (t >= N + 1) {
          draw(at(N), slot);
          if (s.landed !== slot) { s.landed = slot; onLanded?.(); }
          return;
        }
        if (i !== s.hop) { s.hop = i; try { navigator.vibrate?.(4); } catch { /* unsupported */ } }
        const from = at(i - 1), to = at(i);
        // a short hop up and over to the next peg
        const x = from.x + (to.x - from.x) * u, y = from.y + (to.y - from.y) * u - Math.sin(Math.PI * u) * 5;
        draw({ x, y }, -1);
      }
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropping, path]);

  const odds = plinkoOdds();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <canvas ref={ref} width={BW} height={BH} role="img" aria-label="Plinko board: eight rows of pegs above nine slots"
              style={{ width: BW * SCALE, height: BH * SCALE, maxWidth: "100%", imageRendering: "pixelated", display: "block" }}/>
      <div aria-hidden style={{ display: "grid", gridTemplateColumns: `repeat(${N + 1}, ${S * SCALE}px)`, maxWidth: "100%", textAlign: "center", fontSize: 12 }}>
        {SLOTS.map((o, k) => <span key={k} style={{ color: SECTOR_COLOURS[o][1] }}>{SYMBOL[o]}</span>)}
      </div>
      <span className="sr-only">{SLOTS.map((o, k) => `${o} ${(odds[k] * 100).toFixed(1)}%`).join(", ")}</span>
    </div>
  );
}
