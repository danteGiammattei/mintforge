import { useContext, useEffect, useRef } from "react";
import { GameContext } from "../lib/GameContext.js";
import { mount } from "../scenes/door.js";

/* The goblin at the door. The scene owns its canvas and its own loop; this
 * wrapper only hands it a bus into game state and tears it down on unmount. */
export default function Door(){
  const g = useContext(GameContext);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    return mount(ref.current, {
      favour: n => g.setFavour?.(n),
    });
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden">
      <canvas ref={ref} style={{ imageRendering:"pixelated", touchAction:"none", display:"block" }}/>
    </div>
  );
}
