import { useEffect, useRef } from "react";
import { auraStill } from "../lib/aura.js";

/* ─── a profile effect ────────────────────────────────────────────────
 * Worn on the profile (shared/events.js PROFILE_FX), seen by everyone who
 * looks it up. It fills whatever it is laid in: the banner, and behind
 * the whole profile (components/PublicProfile), where it shows between
 * the panels. Drawn 96 pixels across and shown large, so its pixels sit
 * on the banner's whatever it covers.
 *
 *   frostfall   snow falling, and frost crept up from the lower edge,
 *               thickest at the corners; still when motion is reduced. */
const W = 96;

export default function ProfileFx({ fx }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || fx !== "frostfall") return;
    const ctx = cv.getContext("2d");
    let H = 0, flakes = [], rime = [], raf = 0, t = 0, last = 0;
    // sized to what it covers, at 96 across
    const size = () => {
      const r = cv.getBoundingClientRect();
      H = Math.max(12, Math.round(W * (r.height || 1) / (r.width || 1)));
      cv.width = W; cv.height = H;
      const n = Math.round(W * H / 350);
      flakes = Array.from({ length: n }, (_, i) => ({
        x: (i * 37.7) % W, y: (i * 13.3 * (H / 26)) % H, v: 0.12 + ((i * 7) % 10) / 55, ph: i * 0.7, big: i % 5 === 0,
      }));
      rime = Array.from({ length: W }, (_, x) => {
        const corner = Math.max(0, 1 - Math.min(x, W - 1 - x) / 22);
        return Math.round(1 + corner * 4 + ((x * 2654435761) >>> 28) % 2);
      });
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (let x = 0; x < W; x++) {
        const h = rime[x];
        for (let k = 0; k < h; k++) {
          ctx.fillStyle = k === h - 1 ? "rgba(214,236,255,.55)" : "rgba(236,246,255,.8)";
          ctx.fillRect(x, H - 1 - k, 1, 1);
        }
      }
      for (const f of flakes) {
        const y = Math.round((f.y + t * f.v) % (H + 2) - 1), x = Math.round((f.x + Math.sin(t * 0.03 + f.ph) * 1.5 + W) % W);
        ctx.fillStyle = "rgba(244,249,255,.9)"; ctx.fillRect(x, y, 1, 1);
        if (f.big) {
          ctx.fillStyle = "rgba(244,249,255,.45)";
          ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1);
        }
      }
    };
    size(); draw();
    const ro = new ResizeObserver(() => { size(); draw(); });
    ro.observe(cv);
    if (!auraStill()) {
      const loop = now => {
        raf = requestAnimationFrame(loop);
        if (now - last < 50) return;                       // 20 a second is plenty for snow
        last = now; t++; draw();
      };
      raf = requestAnimationFrame(loop);
    }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [fx]);
  if (fx !== "frostfall") return null;
  return (
    <canvas ref={ref} aria-hidden
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated", pointerEvents: "none" }}/>
  );
}
