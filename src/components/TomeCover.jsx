import { useEffect, useRef } from "react";
import { tomeCover } from "../lib/tomeArt.js";

/* ─── a tome's cover, as a component ─────────────────────────────────
 * (Choosing a tome is at the lectern now: scenes/lectern.js.) */
export function TomeCover({ tome, owned = true, scale = 3 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, art = tomeCover(tome, owned), x = c.getContext("2d");
    x.clearRect(0, 0, c.width, c.height); x.drawImage(art, 0, 0);
  }, [tome, owned]);
  return <canvas ref={ref} width={24} height={30} aria-hidden style={{ width: 24 * scale, height: 30 * scale, imageRendering: "pixelated" }}/>;
}
