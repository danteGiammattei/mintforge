import { useEffect, useRef } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { mount, SURROUND } from "../scenes/scribe.js";
import { SCRIBE } from "../../shared/tuning.js";

/* The scribe's desk. The scene owns its canvas and its loop; this hands
 * it a bus into game state and mirrors its three buttons as real ones
 * for anyone not using a pointer. */
export default function Scribe() {
  const g = useGame(), ui = useUi();
  const ref = useRef(null), scene = useRef(null), live = useRef(g);
  live.current = g;

  // A deeper inkwell, for marks. The desk is the player's own side of the
  // door, so unlike the goblin it says plainly what a thing costs.
  const buyWell = async () => {
    const cur = live.current, next = SCRIBE.wells[cur.wellLevel + 1];
    if (!next) return;
    if (cur.marks < next.cost) {
      await ui.notify({ title: next.name, body: `HOLDS ${next.ink} INK, UP FROM ${cur.inkMax}. IT COSTS ${next.cost.toLocaleString()} MARKS; YOU HAVE ${cur.marks.toLocaleString()}. SELL COINS IN THE VAULT TO EARN MORE.`, yes: "NOT YET" });
      return;
    }
    if (!(await ui.confirm({ title: next.name, body: `HOLDS ${next.ink} INK, UP FROM ${cur.inkMax}. ${next.cost.toLocaleString()} OF YOUR ${cur.marks.toLocaleString()} MARKS.`, yes: "BUY IT" }))) return;
    try { const r = await cur.act("well"); feel("gift"); ui.toast(`${r.name}. A SHEET NOW TAKES ${r.ink} INK.`); }
    catch (e) { ui.toast(e.message, "bad"); feel("error"); }
  };
  const buyRef = useRef(buyWell);
  buyRef.current = buyWell;

  useEffect(() => {
    scene.current = mount(ref.current, {
      inkMax: () => live.current.inkMax,
      deeper: () => live.current.wellLevel < SCRIBE.wells.length - 1,
      well: () => buyRef.current(),
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
        {g.wellLevel < SCRIBE.wells.length - 1 && <button onClick={buyWell}>Buy a deeper inkwell</button>}
      </div>
    </section>
  );
}
