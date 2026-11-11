import { useEffect, useRef } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { mount, SURROUND } from "../scenes/scribe.js";

/* The scribe's desk. The scene owns its canvas and its loop; this hands
 * it a bus into game state and mirrors its three buttons as real ones
 * for anyone not using a pointer. */
export default function Scribe() {
  const g = useGame(), ui = useUi();
  const ref = useRef(null), scene = useRef(null), live = useRef(g);
  live.current = g;

  useEffect(() => {
    scene.current = mount(ref.current, {
      seal: strokes => live.current.act("seal", { strokes }),
      room: () => live.current.scrollCap - live.current.scrolls.length,
      firstTime: () => !(live.current.stats.sealed > 0),
      say: ui.say, feel,
      toDoor: () => live.current.setTab("door"),
    });
    return scene.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="scene" style={{ background: `rgb(${SURROUND})` }} aria-label="The scribe's desk">
      <canvas ref={ref} role="img" aria-label="A sheet of parchment on a desk, lit by one candle. Draw on it to make a sigil."
              style={{ touchAction: "none", display: "block" }}/>
      <div className="sr-only">
        <button onClick={() => scene.current?.scrawl()}>Make a mark on the sheet</button>
        <button onClick={() => scene.current?.undo()}>Undo the last stroke</button>
        <button onClick={() => scene.current?.clear()}>Clear the sheet</button>
        <button onClick={() => scene.current?.seal()}>Seal the scroll</button>
      </div>
    </section>
  );
}
