import { useRef, useEffect } from "react";
import { drawCoin, SPACE_LOOP } from "../lib/coin.js";
import Aura from "./Aura.jsx";
import { METAL } from "../lib/data.js";
import { onAuraFrame, auraStill } from "../lib/aura.js";

/* A coin, painted by the one generator in lib/coin.js. Pass a `size`
 * that is a multiple of 64 (the generator's own canvas) wherever the
 * layout allows, so its pixels land whole. A void coin's night sky and a
 * fire coin's flames drift, on the shared clock, while on screen. */
export default function CoinCanvas({ coin, size, hideShine = false, aura = true, auraMargin = 8, still = false }) {
  const canvasRef = useRef();
  const shiny = coin.shiny && !hideShine;
  const drifts = !still && (coin.metalIdx === METAL.void || coin.metalIdx === METAL.fire) && !coin.material;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const c = hideShine ? { ...coin, shiny: false } : coin;
    // painted when it first comes near the screen, so a long vault opens
    // without painting every coin in it at once
    const moves = drifts && !auraStill();
    let off = null, drawn = false;
    const tick = f => drawCoin(cv, c, size, { phase: f % SPACE_LOOP });
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !drawn) { drawCoin(cv, c, size); drawn = true; if (!moves) io.disconnect(); }
      if (!moves) return;
      if (e.isIntersecting && !off) off = onAuraFrame(tick);
      else if (!e.isIntersecting && off) { off(); off = null; }
    }, { rootMargin: "200px" });
    io.observe(cv);
    return () => { io.disconnect(); off?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin.seed, coin.metalIdx, coin.material, coin.sign, coin.shape, shiny, size, drifts]);

  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block", flexShrink: 0 }}>
      {aura && coin.metalIdx === METAL.eldritch && <Aura coin={coin} size={size} margin={auraMargin + 16} rare layer="behind" shine={false}/>}
      {/* a fire coin's great flame stands behind it, taller than the usual margin */}
      {aura && coin.metalIdx === METAL.fire && <Aura coin={coin} size={size} margin={auraMargin + 26} rare layer="behind" shine={false}/>}
      <canvas ref={canvasRef} aria-hidden style={{ position: "relative", imageRendering: "pixelated", display: "block", width: size, height: size }}/>
      {(aura || shiny) && <Aura coin={coin} size={size} margin={auraMargin} shine={shiny} rare={aura}/>}
    </div>
  );
}
