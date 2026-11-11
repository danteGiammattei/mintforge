import { useRef, useEffect } from "react";
import { drawCoin } from "../lib/coin.js";

/* A coin, painted by the one generator in lib/coin.js. Pass a `size`
 * that is a multiple of 64 (the generator's own canvas) wherever the
 * layout allows, so its pixels land whole. */
export default function CoinCanvas({ coin, size, hideShine = false }) {
  const canvasRef = useRef();
  const shiny = coin.shiny && !hideShine;

  useEffect(() => {
    if (canvasRef.current) drawCoin(canvasRef.current, hideShine ? { ...coin, shiny: false } : coin, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin.seed, coin.metalIdx, shiny, size]);

  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block", flexShrink: 0 }}>
      <canvas ref={canvasRef} aria-hidden style={{ imageRendering: "pixelated", display: "block", width: size, height: size }}/>
      {shiny && (
        <div aria-hidden style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,232,160,.55) 30deg, transparent 60deg, transparent 360deg)",
          mixBlendMode: "screen", animation: "shinyRotate 3.6s linear infinite", pointerEvents: "none", opacity: 0.7,
        }}/>
      )}
    </div>
  );
}
