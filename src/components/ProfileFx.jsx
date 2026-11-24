import { useEffect, useRef } from "react";
import { auraStill } from "../lib/aura.js";

/* ─── a profile effect, over the banner ───────────────────────────────
 * Worn on the profile (shared/events.js PROFILE_FX), seen by everyone who
 * looks it up. Drawn small (96 wide, the banner's own grid) and shown
 * large, so its pixels sit on the banner's.
 *
 *   frostfall   snow falling across the banner, frost crept up from its
 *               lower edge, thickest at the corners; the snow settles
 *               still when motion is reduced. */
const W = 96;

export default function ProfileFx({ fx, height = 96 }) {
  const ref = useRef(null);
  const H = Math.max(12, Math.round(W * height / 360));      // the banner's grid, about
  useEffect(() => {
    const cv = ref.current;
    if (!cv || fx !== "frostfall") return;
    const ctx = cv.getContext("2d");
    const flakes = Array.from({ length: 26 }, (_, i) => ({
      x: (i * 37.7) % W, y: (i * 13.3) % H, v: 0.12 + ((i * 7) % 10) / 55, ph: i * 0.7, big: i % 5 === 0,
    }));
    // the frost along the bottom edge: a ragged line, taller at the corners
    const rime = Array.from({ length: W }, (_, x) => {
      const corner = Math.max(0, 1 - Math.min(x, W - 1 - x) / 22);
      return Math.round(1 + corner * 4 + ((x * 2654435761) >>> 28) % 2);
    });
    const draw = t => {
      ctx.clearRect(0, 0, W, H);
      for (let x = 0; x < W; x++) {
        const h = rime[x];
        for (let k = 0; k < h; k++) {
          ctx.fillStyle = k === h - 1 ? "rgba(214,236,255,.55)" : "rgba(236,246,255,.8)";
          ctx.fillRect(x, H - 1 - k, 1, 1);
        }
      }
      for (const f of flakes) {
        const y = (f.y + t * f.v) % (H + 2) - 1, x = (f.x + Math.sin(t * 0.03 + f.ph) * 1.5 + W) % W;
        ctx.fillStyle = "rgba(244,249,255,.9)"; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        if (f.big) {
          ctx.fillStyle = "rgba(244,249,255,.45)";
          ctx.fillRect(Math.round(x) - 1, Math.round(y), 1, 1); ctx.fillRect(Math.round(x) + 1, Math.round(y), 1, 1);
          ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 1); ctx.fillRect(Math.round(x), Math.round(y) + 1, 1, 1);
        }
      }
    };
    if (auraStill()) { draw(0); return; }
    let raf = 0, t = 0, last = 0;
    const loop = now => {
      raf = requestAnimationFrame(loop);
      if (now - last < 50) return;                         // 20 a second is plenty for snow
      last = now; t++; draw(t);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fx, H]);
  if (fx !== "frostfall") return null;
  return (
    <canvas ref={ref} width={W} height={H} aria-hidden
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated", pointerEvents: "none" }}/>
  );
}
