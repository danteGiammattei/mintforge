import { METAL } from "../lib/data.js";
import { useEffect, useRef } from "react";
import { paintAura, onAuraFrame, auraFrame, auraStill } from "../lib/aura.js";
import { coinRarity } from "../lib/coin.js";

/* A coin's rarity, as light around it, and a shiny's glint across it
 * (lib/aura.js). Sits over a coin of `size` px (a multiple of 64) and
 * spills `margin` coin-pixels past it. Pointer-transparent; ticks only
 * while on screen. `rare: false` leaves out the rarity, keeping the shine. */
export default function Aura({ coin, size, margin = 8, shine = !!coin.shiny, rare = true, layer = "front" }) {
  const ref = useRef();
  const rarity = rare ? coinRarity(coin) : 0, k = Math.max(1, Math.round(size / 64));
  const tendrils = rare && coin.metalIdx === METAL.eldritch;
  const moon = rare && coin.metalIdx === METAL.astral && layer === "front";
  const flames = rare && coin.metalIdx === METAL.fire && layer === "front";
  const G = 64 + 2 * margin;

  useEffect(() => {
    const cv = ref.current;
    if (!cv || (rarity <= 0 && !shine && !tendrils && !moon && !flames)) return;
    const ctx = cv.getContext("2d");
    const paint = f => paintAura(ctx, coin, rarity, f, margin, shine, tendrils, moon, layer, flames);
    paint(auraFrame());
    if ((rarity < 2 && !shine && !tendrils && !moon && !flames) || auraStill()) return;
    let off = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !off) off = onAuraFrame(paint);
      else if (!e.isIntersecting && off) { off(); off = null; }
    });
    io.observe(cv);
    return () => { io.disconnect(); off?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin.seed, coin.shape, rarity, margin, shine, tendrils, moon, flames, layer]);

  if (layer === "behind" ? !tendrils : rarity <= 0 && !shine && !tendrils && !moon && !flames) return null;
  return (
    <canvas ref={ref} width={G} height={G} aria-hidden style={{
      position: "absolute", left: -margin * k, top: -margin * k, width: G * k, height: G * k,
      imageRendering: "pixelated", pointerEvents: "none",
    }}/>
  );
}
