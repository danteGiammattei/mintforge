import { useEffect, useRef, useState } from "react";
import { SPRITE, ANIM } from "../lib/sprite.js";

/* ─── SPRITE FRAME ────────────────────────────────────────────────────────
 * Renders a single animated sprite by stepping through cells of the
 * shared character sheet. Uses CSS background-image + background-position
 * so we don't allocate per-frame DOM (one div, position changes).
 *
 * Props:
 *   anim       — key into ANIM ('idle' | 'run' | 'dig' | ...)
 *   onComplete — for non-loop anims, fires when the last frame plays
 *                (useful for chaining: dig anim → spawn dig result)
 *
 * Implementation note: we step frames via a setTimeout chain rather than
 * setInterval. Lets each frame set the timeout for the *next* frame,
 * which avoids drift if the browser throttles. Also makes loop vs
 * one-shot behavior trivial (just stop scheduling when done).
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

  // Sheet dimensions in scaled space.
  const sheetW = SPRITE.cols * SPRITE.cell * SPRITE.scale;
  const sheetH = SPRITE.rows * SPRITE.cell * SPRITE.scale;
  const cellPx = SPRITE.cell * SPRITE.scale;
  const realCol = (a.startCol || 0) + frame;

  return (
    <div
      style={{
        width: cellPx,
        height: cellPx,
        backgroundImage: `url(${SPRITE.src})`,
        backgroundSize: `${sheetW}px ${sheetH}px`,
        backgroundPositionX: `-${realCol * cellPx}px`,
        backgroundPositionY: `-${a.row * cellPx}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
      aria-hidden
    />
  );
}
