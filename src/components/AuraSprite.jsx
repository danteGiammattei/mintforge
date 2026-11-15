import { useEffect, useRef } from "react";
import { auraFrame, LOOP } from "../lib/spriteAura.js";
import { onAuraFrame, auraStill } from "../lib/aura.js";

/* A sprite (lib/forms.js) wreathed in its aura (lib/spriteAura.js), on the
 * shared clock while on screen; still for reduced motion. */
export default function AuraSprite({ make, dep, colour, level, scale = 2 }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, src = make();
    if (!cv || !src) return;
    const draw = f => {
      const fr = auraFrame(src, colour, level, f);
      if (cv.width !== fr.width) { cv.width = fr.width; cv.height = fr.height; cv.style.width = fr.width * scale + "px"; cv.style.height = fr.height * scale + "px"; }
      const x = cv.getContext("2d"); x.clearRect(0, 0, cv.width, cv.height); x.drawImage(fr, 0, 0);
    };
    draw(0);
    if (auraStill()) return;
    let off = null, n = 0;
    const tick = () => draw(n++ % LOOP);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !off) off = onAuraFrame(tick);
      else if (!e.isIntersecting && off) { off(); off = null; }
    });
    io.observe(cv);
    return () => { io.disconnect(); off?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep, colour, level, scale]);
  return <canvas ref={ref} aria-hidden style={{ imageRendering: "pixelated", display: "block" }}/>;
}
