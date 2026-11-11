import { useEffect, useRef } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { mount, SURROUND } from "../scenes/door.js";
import { RARITY } from "../../shared/sigil.js";
import { CHESTS } from "../../shared/tuning.js";

/* The goblin at the door. There is no menu, price or tooltip on this
 * screen and none may be added: the only chrome is the scene itself. */
const GIFT_LINE = {
  chest: g => `A ${g.name}. IT IS IN YOUR SATCHEL.`,
  brush: g => `HE GAVE YOU A BRUSH: ${g.name}.`,
  title: g => `HE GAVE YOU A TITLE: ${g.name}.`,
  frame: g => `HE GAVE YOU A BANNER: ${g.name}.`,
  marks: g => `HE GAVE YOU ${g.name}.`,
};

export default function Door() {
  const g = useGame(), ui = useUi();
  const ref = useRef(null), scene = useRef(null), live = useRef(g);
  live.current = g;

  useEffect(() => {
    scene.current = mount(ref.current, {
      scrolls: () => live.current.scrolls,
      lean: () => live.current.lean / CHESTS.leanSteps,
      offer: scroll => live.current.act("offer", { scrollId: scroll.id }),
      visit: () => live.current.act("visit"),
      say: ui.say, feel,
      received: what => {
        const name = what.name || (CHESTS.names[what.tier] + " CHEST");
        ui.toast((GIFT_LINE[what.type] || GIFT_LINE.chest)({ ...what, name }), what.type === "chest" ? "" : "magic");
        if (what.type !== "chest") feel("gift");
      },
      toDesk: () => live.current.setTab("scribe"),
    });
    return scene.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="scene" style={{ background: `rgb(${SURROUND})` }} aria-label="The door">
      <canvas ref={ref} role="img" aria-label="A door standing ajar. Something small waits in the gap with one hand held out, palm up."
              style={{ touchAction: "none", display: "block" }}/>
      <div className="sr-only">
        {g.scrolls.length === 0 && <button onClick={() => g.setTab("scribe")}>You have no scrolls. Go to the desk.</button>}
        {g.scrolls.map((s, i) => (
          <button key={s.id} onClick={() => scene.current?.offer(s.id)}>Offer scroll {i + 1}, {RARITY[s.rarity].n}</button>
        ))}
      </div>
    </section>
  );
}
