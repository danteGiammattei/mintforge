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
  const rarity = rare ? coinRarity(coin) : 0, k = size >= 64 ? Math.round(size / 64) : size / 64;   // a small coin, a small glow
  const tendrils = rare && coin.metalIdx === METAL.eldritch;
  const moon = rare && coin.metalIdx === METAL.astral && layer === "front";
  // the great flame round a fire coin is retired (Nov 2026): its fire
  // burns inside it now. paintAura still knows how, should it come back
  const flames = false;
  // a frost coin's falling snow (lib/aura.js paintSnow), in front
  const snow = layer === "front" && !!coin.season;
  const G = 64 + 2 * margin;

  useEffect(() => {
    const cv = ref.current;
    if (!cv || (rarity <= 0 && !shine && !tendrils && !moon && !flames && !snow)) return;
    const ctx = cv.getContext("2d");
    const paint = f => paintAura(ctx, coin, rarity, f, margin, shine, tendrils, moon, layer, flames, snow);
    if ((rarity < 2 && !shine && !tendrils && !moon && !flames && !snow) || auraStill()) { paint(auraFrame()); return; }
    // a moving aura is first drawn when it comes on screen, not before:
    // a long vault would otherwise draw every one of them at once
    let off = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !off) { paint(auraFrame()); off = onAuraFrame(paint); }
      else if (!e.isIntersecting && off) { off(); off = null; }
    });
    io.observe(cv);
    return () => { io.disconnect(); off?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin.seed, coin.shape, rarity, margin, shine, tendrils, moon, flames, layer, snow]);

  if (layer === "behind" ? !tendrils && !flames : rarity <= 0 && !shine && !tendrils && !moon && !flames && !snow) return null;
  return (
    <canvas ref={ref} width={G} height={G} aria-hidden style={{
      position: "absolute", left: -margin * k, top: -margin * k, width: G * k, height: G * k,
      imageRendering: "pixelated", pointerEvents: "none",
    }}/>
  );
}
