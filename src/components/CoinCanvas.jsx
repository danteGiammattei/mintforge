import { useState, useRef, useEffect } from "react";
import { coinImagePath } from "../lib/data.js";
import { drawCoinFallback } from "../lib/coin.js";

/* ─── COIN CANVAS ─────────────────────────────────────────────────────────
 * Renders a coin at the requested pixel size.
 *
 * Default path (image-backed): renders <img src="/coins/copper_compass.png">
 * sized via `width`/`height`. The image is hand-illustrated and ships with
 * the bundle — see tools/slice-coins.mjs for the generator.
 *
 * Fallback path: if the image fails to load (404, missing slice, etc.) the
 * component falls back to the legacy procedural canvas painter so coins
 * always render *something*. This is mainly defensive — under normal
 * deploys every coin's image exists.
 *
 * Shiny coins get a rotating diagonal sheen overlay via a CSS conic-gradient
 * blended on top of the image. The hue is metal-tone (warm gold) rather
 * than rainbow; matches the established "shiny ✦" treatment elsewhere.
 */
export default function CoinCanvas({ coin, size }) {
  const canvasRef = useRef();
  const [imageFailed, setImageFailed] = useState(false);

  // If the image failed to load, paint via the legacy procedural drawer.
  useEffect(() => {
    if (imageFailed && canvasRef.current) {
      drawCoinFallback(canvasRef.current, coin, size);
    }
  }, [imageFailed, coin.seed, coin.metalIdx, coin.shiny, size]);

  if (imageFailed) {
    return (
      <canvas
        ref={canvasRef}
        style={{ imageRendering: "pixelated", display: "block" }}
      />
    );
  }

  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
      <img
        src={coinImagePath(coin)}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setImageFailed(true)}
        style={{
          width: size, height: size,
          display: "block",
          // The source PNGs already have transparent backgrounds and a
          // subtle drop shadow baked in; no extra CSS needed.
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
      {coin.shiny && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            // Warm gold sheen sweeping diagonally — animation is in styles.css.
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(255,232,160,.55) 30deg, transparent 60deg, transparent 360deg)",
            mixBlendMode: "screen",
            animation: "shinyRotate 3.6s linear infinite",
            pointerEvents: "none",
            opacity: 0.7,
          }}
        />
      )}
    </div>
  );
}
