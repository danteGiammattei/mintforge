import { useRef, useEffect } from "react";
import { drawCoin } from "../lib/coin.js";
import Aura from "./Aura.jsx";

/* A coin, painted by the one generator in lib/coin.js. Pass a `size`
 * that is a multiple of 64 (the generator's own canvas) wherever the
 * layout allows, so its pixels land whole. */
export default function CoinCanvas({ coin, size, hideShine = false, aura = true, auraMargin = 8 }) {
  const canvasRef = useRef();
  const shiny = coin.shiny && !hideShine;

  useEffect(() => {
    if (canvasRef.current) drawCoin(canvasRef.current, hideShine ? { ...coin, shiny: false } : coin, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin.seed, coin.metalIdx, shiny, size]);

  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block", flexShrink: 0 }}>
      <canvas ref={canvasRef} aria-hidden style={{ imageRendering: "pixelated", display: "block", width: size, height: size }}/>
      {(aura || shiny) && <Aura coin={coin} size={size} margin={auraMargin} shine={shiny} rare={aura}/>}
    </div>
  );
}
