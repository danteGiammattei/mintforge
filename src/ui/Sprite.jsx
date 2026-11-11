import { useEffect, useRef } from "react";

/* Shows a sprite canvas from lib/forms.js at a whole-number scale.
 * `make` returns the (cached) source canvas; `dep` says when to redraw. */
export default function Sprite({ make, dep, scale = 2, title, style, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const src = make(), cv = ref.current;
    if (!cv || !src) return;
    cv.width = src.width; cv.height = src.height;
    cv.style.width = src.width * scale + "px"; cv.style.height = src.height * scale + "px";
    cv.getContext("2d").drawImage(src, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep, scale]);
  return <canvas ref={ref} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}
                 className={className} style={{ imageRendering: "pixelated", display: "block", ...style }}/>;
}
