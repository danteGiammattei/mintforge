import { useEffect, useMemo, useRef } from "react";
import { GAMBLE } from "../../shared/tuning.js";

/* ─── ROULETTE WHEEL ──────────────────────────────────────────────────────
 * Six weighted sectors. The server picks where it lands; this only shows
 * the spin. It is rasterised per pixel at its current angle on a 96×96
 * grid every frame and shown at 3× — the wheel turns, the pixels never
 * do, which is the same rule pixelform follows for sprites.
 *
 *   spinning  true from the moment the stake is placed
 *   target    null until the server answers, then the sector index
 *   onLanded  called once the wheel has stopped on it                   */
export const SECTOR_COLOURS = {
  lose:    ["#3a1512", "#e98676"],
  same:    ["#232833", "#98a19a"],
  up1:     ["#13241c", "#8fd4b4"],
  x2:      ["#12203a", "#80c0ff"],
  up2:     ["#24143c", "#c080ff"],
  jackpot: ["#3a2c10", "#e0b860"],
};
const N = 96, SCALE = 3;
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export default function RouletteWheel({ spinning, target, onLanded }) {
  const cvRef = useRef(null);
  const st = useRef({ ang: 0, raf: 0, mode: "rest", from: 0, to: 0, t0: 0, landed: null });

  const secs = useMemo(() => {
    const tot = GAMBLE.roulette.reduce((s, v) => s + v.weight, 0);
    let cum = 0;
    return GAMBLE.roulette.map(s => {
      const start = (cum / tot) * Math.PI * 2, span = (s.weight / tot) * Math.PI * 2;
      cum += s.weight;
      return { ...s, start, span, fill: hex(SECTOR_COLOURS[s.outcome][0]), edge: hex(SECTOR_COLOURS[s.outcome][1]) };
    });
  }, []);

  const draw = angle => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(N, N), d = img.data;
    const c = (N - 1) / 2, R = N / 2 - 6;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x - c, dy = y - c, r = Math.hypot(dx, dy), i = (y * N + x) * 4;
      let col = null;
      if (r <= R + 4 && r > R) col = r > R + 2 ? [0, 0, 0] : [74, 84, 102];           // the rim
      else if (r <= 5) col = r > 3 ? [0, 0, 0] : [224, 184, 96];                       // the hub
      else if (r <= R) {
        const a = (((Math.atan2(dy, dx) - angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const s = secs.find(q => a >= q.start && a < q.start + q.span) || secs[0];
        const nearEdge = Math.min(a - s.start, s.start + s.span - a) * r < 0.8;
        col = nearEdge ? [0, 0, 0] : r > R - 4 ? s.edge : s.fill;
      }
      if (col) { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; }
    }
    ctx.putImageData(img, 0, 0);
    // the pointer, fixed at the top
    ctx.fillStyle = "#000"; ctx.fillRect(c - 4, 0, 9, 9);
    ctx.fillStyle = "#e0b860"; ctx.fillRect(c - 3, 0, 7, 3); ctx.fillRect(c - 2, 3, 5, 2); ctx.fillRect(c - 1, 5, 3, 2); ctx.fillRect(c, 7, 1, 1);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { draw(st.current.ang); }, []);

  useEffect(() => {
    const s = st.current;
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    cancelAnimationFrame(s.raf);
    if (!spinning) { s.mode = "rest"; s.landed = null; return; }

    if (target != null && s.landed !== target) {
      const q = secs[target];
      const final = -Math.PI / 2 - (q.start + q.span / 2 + (Math.random() - 0.5) * q.span * 0.6);
      let delta = (((final - s.ang) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      delta += (calm ? 0 : 4) * Math.PI * 2;
      s.mode = "land"; s.from = s.ang; s.to = s.ang + delta; s.t0 = performance.now(); s.landed = target;
    } else if (target == null) s.mode = "free";

    const dur = calm ? 300 : 3200;
    const tick = now => {
      if (s.mode === "free") s.ang += 0.22;
      else if (s.mode === "land") {
        const k = Math.min(1, (now - s.t0) / dur);
        s.ang = s.from + (s.to - s.from) * (1 - Math.pow(1 - k, 4));
        if (k >= 1) { s.mode = "rest"; draw(s.ang); onLanded?.(); return; }
      } else return;
      draw(s.ang);
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, target]);

  return <canvas ref={cvRef} width={N} height={N} role="img" aria-label="Roulette wheel"
                 style={{ width: N * SCALE, height: N * SCALE, maxWidth: "100%", imageRendering: "pixelated", display: "block" }}/>;
}
