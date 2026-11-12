import { useEffect, useRef } from "react";
import { BANNERS } from "../lib/data.js";

/* A profile banner. Banners are either a gradient or a painted image.
 * A gradient is redrawn small (96×28) in hard bands and shown large, so
 * it sits on the pixel grid. A painted banner is already pixel art: it
 * is shown exactly as it was made, never resampled. */
const BW = 96, BH = 28;

function stops(css) {
  const m = css.match(/#[0-9a-f]{6}/gi) || ["#241a14", "#3a2820", "#1a120c"];
  return m.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
}

export default function PixelBanner({ frame, height = 112, dim = false, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const v = BANNERS[frame] || BANNERS.stone;
    if (!v.startsWith("image:")) {
      // a diagonal sweep through the gradient's own colours, in hard bands
      const c = stops(v), img = ctx.createImageData(BW, BH), d = img.data;
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
        const t = Math.min(0.999, (x / BW * 0.7 + y / BH * 0.3)) * (c.length - 1);
        const band = Math.floor(t * 4) / 4, lo = Math.floor(band), k = band - lo;
        const a = c[lo], b = c[Math.min(c.length - 1, lo + 1)], i = (y * BW + x) * 4;
        d[i] = a[0] + (b[0] - a[0]) * k; d[i + 1] = a[1] + (b[1] - a[1]) * k; d[i + 2] = a[2] + (b[2] - a[2]) * k; d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
  }, [frame]);
  const painted = (BANNERS[frame] || "").startsWith("image:") ? BANNERS[frame].slice(6) : null;
  return (
    <div style={{ position: "relative", height, overflow: "hidden", borderBottom: "2px solid #000" }}>
      {painted && <img src={painted} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: dim ? "grayscale(.5) brightness(.6)" : "none" }}/>}
      <canvas ref={ref} hidden={!!painted} width={BW} height={BH} aria-hidden
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated", filter: dim ? "grayscale(.5) brightness(.6)" : "none" }}/>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(5,6,9,0) 40%, rgba(5,6,9,.7) 100%)" }}/>
      {children}
    </div>
  );
}
