import { useContext, useEffect, useRef } from "react";
import { GameContext } from "../lib/GameContext.js";
import { mount } from "../scenes/scribe.js";

/* The scribe's desk. Draw a sigil, seal it, and the finished scroll lands
 * in the satchel with whatever the goblin is permitted to say about it. */
export default function Scribe(){
  const g = useContext(GameContext);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    return mount(ref.current, {
      sealed: n => g.setSealedCount?.(n),
      scrollSealed: scroll => g.addScroll?.(scroll),
    });
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden">
      <canvas ref={ref} style={{ imageRendering:"pixelated", touchAction:"none", display:"block" }}/>
    </div>
  );
}
