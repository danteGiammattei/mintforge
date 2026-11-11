import { useEffect, useRef } from "react";
import { BANNERS } from "../lib/data.js";

/* A profile banner, brought onto the pixel grid. Banners are either a
 * gradient or a painted image; both are drawn small (96×28) and shown
 * large, so a painterly premium banner sits in the same world as
 * everything else instead of looking pasted in. */
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
    let cancelled = false;
    if (v.startsWith("image:")) {
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        const s = Math.max(BW / img.width, BH / img.height);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, (BW - img.width * s) / 2, (BH - img.height * s) / 2, img.width * s, img.height * s);
      };
      img.src = v.slice(6);
    } else {
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
    return () => { cancelled = true; };
  }, [frame]);
  return (
    <div style={{ position: "relative", height, overflow: "hidden", borderBottom: "2px solid #000" }}>
      <canvas ref={ref} width={BW} height={BH} aria-hidden
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated", filter: dim ? "grayscale(.5) brightness(.6)" : "none" }}/>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(5,6,9,0) 40%, rgba(5,6,9,.7) 100%)" }}/>
      {children}
    </div>
  );
}
