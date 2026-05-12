import { useEffect, useRef, useState } from "react";
import { SPRITE, ANIM } from "../lib/sprite.js";

/* ─── SPRITE FRAME ────────────────────────────────────────────────────────
 * Renders an animated sprite by stepping through cells of the source sheet
 * specified by the ANIM entry. Each anim can use its own sheet (different
 * source PNGs, different cell sizes, different grid layouts).
 *
 * Frame indexing is row-major: given anim.cols, starting position
 * (anim.row, anim.startCol) and a 0-based frame counter, the absolute
 * cell is computed by walking right then wrapping down. Lets a 24-frame
 * walk cycle laid out in a 4×6 grid play as one continuous animation.
 *
 * Steps frames via a setTimeout chain rather than setInterval. Each tick
 * schedules the next, so non-loop anims just stop scheduling when they
 * hit their final frame.
 *
 * Props:
 *   anim       — key into ANIM ('idle' | 'run' | 'dig' | ...)
 *   onComplete — fires once on the final frame of non-loop anims
 */
export default function SpriteFrame({ anim = "idle", onComplete }) {
  const a = ANIM[anim];
  const [frame, setFrame] = useState(0);
  const timerRef = useRef();
  const completedRef = useRef(false);

  useEffect(() => {
    setFrame(0);
    completedRef.current = false;

    let i = 0;
    const tick = () => {
      i++;
      if (i >= a.frames) {
        if (a.loop) {
          i = 0;
        } else {
          // Hold the final frame visible, fire onComplete once.
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete?.();
          }
          return;
        }
      }
      setFrame(i);
      timerRef.current = setTimeout(tick, a.frameMs);
    };
    timerRef.current = setTimeout(tick, a.frameMs);

    return () => clearTimeout(timerRef.current);
  }, [anim]); // re-init when animation changes

  // Compute absolute (row, col) of the current frame within the sheet.
  // anim.row + startCol set the starting position; frame counts forward
  // row-major, wrapping at anim.cols.
  const S = SPRITE.scale;
  const cols = a.cols || 1;
  const absIndex = (a.row * cols) + (a.startCol || 0) + frame;
  const realRow  = Math.floor(absIndex / cols);
  const realCol  = absIndex % cols;

  return (
    <div
      style={{
        width:  a.cellW * S,
        height: a.cellH * S,
        backgroundImage: `url(${a.src})`,
        backgroundSize: `${a.sheetW * S}px ${a.sheetH * S}px`,
        backgroundPositionX: `-${realCol * a.cellW * S}px`,
        backgroundPositionY: `-${realRow * a.cellH * S}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
      aria-hidden
    />
  );
}
