import { useEffect, useRef, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { mount, SURROUND } from "../scenes/scribe.js";
import { SCRIBE } from "../../shared/tuning.js";
import { useCelebrate } from "../components/Reward.jsx";
import { TOMES, TOME_BY_ID, STARTER } from "../../shared/tomes.js";
import { CHESTS } from "../../shared/tuning.js";
import { mount as mountLectern, SURROUND as HALL } from "../scenes/lectern.js";

/* which tome is open, and at which page: kept on this device only */
const OPEN_KEY = "mf.tome";
const readOpen = () => { try { return JSON.parse(localStorage.getItem(OPEN_KEY)) || null; } catch { return null; } };
const keepOpen = v => { try { localStorage.setItem(OPEN_KEY, JSON.stringify(v)); } catch { /* fine */ } };

/* The scribe's desk. The scene owns its canvas and its loop; this hands
 * it a bus into game state and mirrors its buttons as real ones for
 * anyone not using a pointer. It also keeps which tome lies open, and at
 * which page, and the lectern (to the desk's left) where they are chosen. */

/* The lectern, sliding in from the left over the desk and back out. */
function Lectern({ owned, chosen, choose, onBack }) {
  const ref = useRef(null), scene = useRef(null), live = useRef({ owned, chosen });
  live.current = { owned, chosen };
  const [inPlace, setIn] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    scene.current = mountLectern(ref.current, {
      tomes: () => TOMES,
      owned: () => live.current.owned,
      chosen: () => live.current.chosen,
      choose: (t, p) => { choose(t, p); setOpen(true); },
      back: () => leave(),
      where: tier => `IN ${CHESTS.names[tier]} CHESTS AND RARER`,
      say: () => {}, feel,
    });
    const r = requestAnimationFrame(() => setIn(true));
    return () => { cancelAnimationFrame(r); scene.current?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const leave = () => { setIn(false); setTimeout(onBack, 320); };
  return (
    <section className="scene" aria-label="The lectern" style={{
      position: "absolute", inset: 0, zIndex: 5, background: `rgb(${HALL})`,
      transform: inPlace ? "translateX(0)" : "translateX(-100%)", transition: "transform .32s ease-out",
    }}>
      <canvas ref={ref} role="img" aria-label="A marble hall. A tome lies on a lectern in the light from above." style={{ touchAction: "none", display: "block" }}/>
      <div className="sr-only">
        <button onClick={() => scene.current?.cycle(-1)}>The tome before</button>
        <button onClick={() => scene.current?.cycle(1)}>The next tome</button>
        <button onClick={() => scene.current?.open()}>Open the tome</button>
        {open && <button onClick={() => scene.current?.turn(-1)}>Turn back a page</button>}
        {open && <button onClick={() => scene.current?.turn(1)}>Turn the page</button>}
        <button onClick={leave}>Back to the desk</button>
      </div>
    </section>
  );
}
export default function Scribe() {
  const g = useGame(), ui = useUi(), celebrate = useCelebrate();
  const ref = useRef(null), scene = useRef(null), live = useRef(g);
  live.current = g;
  const [lectern, setLectern] = useState(false);
  const [open, setOpenRaw] = useState(() => readOpen() || { tome: STARTER, page: 0 });
  const setOpen = v => { setOpenRaw(v); keepOpen(v); };
  // the open tome, if you have it, else the primer; the page held in range
  const tome = g.tomes.includes(open.tome) && TOME_BY_ID[open.tome] ? TOME_BY_ID[open.tome] : TOME_BY_ID[STARTER];
  const pageAt = Math.max(0, Math.min(tome.pages.length - 1, tome.id === open.tome ? open.page : 0));
  const book = useRef(null);
  book.current = { tome, page: tome.pages[pageAt], n: pageAt + 1, of: tome.pages.length };

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
    try { const r = await cur.act("well"); celebrate({ kind: "well", level: r.level }); }
    catch (e) { ui.toast(e.message, "bad"); feel("error"); }
  };
  const buyRef = useRef(buyWell);
  buyRef.current = buyWell;

  useEffect(() => {
    scene.current = mount(ref.current, {
      inkMax: () => live.current.inkMax,
      craving: () => live.current.craving,
      deeper: () => live.current.wellLevel < SCRIBE.wells.length - 1,
      well: () => buyRef.current(),
      seal: strokes => live.current.act("seal", { strokes, tome: book.current.tome.id, page: book.current.page.id }),
      page: () => book.current,
      lectern: () => setLectern(true),
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
      <canvas ref={ref} role="img" aria-label={`A sheet of parchment on a desk, lit by one candle, and ${tome.name.toLowerCase()} open at ${book.current.page.name.toLowerCase()}. Copy its sigil onto the sheet.`}
              style={{ touchAction: "none", display: "block" }}/>
      <div className="sr-only">
        <button onClick={() => scene.current?.scrawl()}>Copy the page onto the sheet</button>
        <button onClick={() => setLectern(true)}>Go to the lectern to choose a tome and page</button>
        <button onClick={() => scene.current?.undo()}>Undo the last stroke</button>
        <button onClick={() => scene.current?.clear()}>Clear the sheet</button>
        <button onClick={() => scene.current?.seal()}>Seal the scroll</button>
        {g.wellLevel < SCRIBE.wells.length - 1 && <button onClick={buyWell}>Buy a deeper inkwell</button>}
      </div>
      {lectern && <Lectern owned={g.tomes} chosen={{ tome: tome.id, page: pageAt }} choose={(t, p) => setOpen({ tome: t, page: p })} onBack={() => setLectern(false)}/>}
    </section>
  );
}
