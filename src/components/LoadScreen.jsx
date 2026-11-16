import { useEffect, useRef, useState } from "react";

/* ─── the loading screen ──────────────────────────────────────────────────
 * A candle in the dark, the name over it, a bar of wax that fills as the
 * game gathers what it needs (lib/preload.js), and a line from the goblin
 * that changes now and then. Pixels drawn small and shown at 4×. */

const LINES = [
  "LIGHTING THE CANDLE",
  "HE IS COUNTING THE COINS",
  "DUSTING THE SHELVES",
  "THE INK IS STILL WET",
  "SOMEONE IS AT THE DOOR",
];

function Candle() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, c = cv.getContext("2d");
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let f = 0, raf = 0, last = 0;
    const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const draw = now => {
      if (now - last > 125) {                       // 8 frames a second, like everything else
        last = now; f++;
        c.clearRect(0, 0, 24, 40);
        // the glow, stepped not smooth
        const g = calm ? 0 : Math.sin(f * 0.9) * 0.5 + Math.sin(f * 2.3) * 0.3;
        const disc = (r, a) => {
          c.globalAlpha = a;
          for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r) px(12 + x, 12 + y, 1, 1, "#f0b050");
        };
        disc(9 + (g > 0.3 ? 1 : 0), 0.07); disc(5 + (g > 0 ? 1 : 0), 0.12);
        c.globalAlpha = 1;
        // the flame, leaning a pixel now and then
        const lean = calm ? 0 : (f % 7 === 0 ? 1 : f % 11 === 0 ? -1 : 0);
        px(11 + lean, 8, 2, 2, "#c84a2a");
        px(10 + lean, 10, 4, 4, "#f0a040");
        px(11 + lean, 11, 2, 3, "#ffe8a0");
        px(11, 14, 2, 1, "#f0a040");
        px(12, 15, 1, 2, "#2a2018");                  // the wick
        // the candle and its drips
        px(9, 17, 6, 16, "#d8cba8"); px(9, 17, 1, 16, "#f0e6cc"); px(14, 17, 1, 16, "#a89878");
        px(10, 17, 1, 4, "#f0e6cc"); px(13, 17, 1, 6, "#c0b090");
        // the dish
        px(5, 33, 14, 2, "#6a5a40"); px(4, 35, 16, 2, "#4a3e2c"); px(6, 37, 12, 1, "#2a2218");
      }
      if (!calm || f < 2) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={24} height={40} aria-hidden style={{ width: 96, height: 160, imageRendering: "pixelated" }}/>;
}

export default function LoadScreen({ progress = 0, label }) {
  const [line, setLine] = useState(0);
  useEffect(() => { const t = setInterval(() => setLine(n => (n + 1) % LINES.length), 2400); return () => clearInterval(t); }, []);
  const cells = 12, lit = Math.round(Math.max(0, Math.min(1, progress)) * cells);
  return (
    <main className="app" style={{ alignItems: "center", justifyContent: "center", gap: 18, padding: 24, textAlign: "center", background: "var(--void)" }}
          aria-busy="true">
      <div className="t-big">MINTFORGE</div>
      <Candle/>
      <div aria-hidden style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: cells }, (_, i) => (
          <span key={i} style={{ width: 12, height: 12, background: i < lit ? "var(--candle)" : "var(--stone-2)", boxShadow: "0 0 0 2px #000" }}/>
        ))}
      </div>
      <p className="t-dim" role="status" style={{ margin: 0, minHeight: "1.4em" }}>{label || LINES[line]}…</p>
    </main>
  );
}
