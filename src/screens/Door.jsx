import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { eventNow } from "./EventPage.jsx";
import PixelIcon from "../ui/PixelIcon.jsx";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { mount, SURROUND } from "../scenes/door.js";
import { useCelebrate, giftToReward } from "../components/Reward.jsx";
import { RARITY } from "../../shared/sigil.js";
import { CHESTS, STALL } from "../../shared/tuning.js";
const Stall = lazy(() => import("../components/Stall.jsx"));
// whether this device has followed him to his stall
const STALL_KEY = "mf.stallSeen";
const stallSeen = () => { try { return !!localStorage.getItem(STALL_KEY); } catch { return false; } };
const keepStallSeen = () => { try { localStorage.setItem(STALL_KEY, "1"); } catch { /* fine */ } };

/* The goblin at the door. There is no menu, price or tooltip on this
 * screen and none may be added: the only chrome is the scene itself.
 * His stall is somewhere else: swipe up on him and he walks off to it
 * (components/Stall.jsx, shown over the scene once it has gone black). */
const GIFT_LINE = {
  chest: g => `A ${g.name}. IT IS IN YOUR SATCHEL.`,
  brush: g => `HE GAVE YOU A BRUSH: ${g.name}.`,
  title: g => `HE GAVE YOU A TITLE: ${g.name}.`,
  frame: g => `HE GAVE YOU A BANNER: ${g.name}.`,
  marks: g => `HE GAVE YOU ${g.name}.`,
};

export default function Door() {
  const g = useGame(), ui = useUi(), celebrate = useCelebrate();
  const cel = useRef(celebrate);
  cel.current = celebrate;
  const ref = useRef(null), scene = useRef(null), live = useRef(g);
  const [stall, setStall] = useState(false);
  const [mode, setMode] = useState("idle");          // the scene's: its corners step aside unless idle
  live.current = g;

  useEffect(() => {
    scene.current = mount(ref.current, {
      scrolls: () => live.current.scrolls,
      lean: () => live.current.lean / CHESTS.leanSteps,
      offer: scrolls => live.current.act("offer", { scrollIds: scrolls.map(s => s.id) }).then(r => {
        // the one part of his reckoning you are shown: a run of fine scrolls
        if (r?.boosted) setTimeout(() => ui.toast(`STREAK ×${r.streakMul} · ${r.streakPeak || r.streak} IN A ROW`, "magic"), 1400);
        return r;
      }),
      visit: () => live.current.act("visit"),
      say: ui.say, feel,
      received: what => {
        // a lasting reward gets its moment, and so does the day's gift; a chest is a line
        if (what.daily) { cel.current({ kind: "daily", streak: what.streak, gift: what }); return; }
        const reward = giftToReward(what);
        if (reward) { cel.current(reward); return; }
        const name = what.name || (CHESTS.names[what.tier] + " CHEST");
        const line = (GIFT_LINE[what.type] || GIFT_LINE.chest)({ ...what, name });
        ui.toast(what.daily ? `DAY ${what.streak}. ${line}` : line, what.type === "chest" ? "" : "magic");
        if (what.type !== "chest") feel("gift");
      },
      toDesk: () => live.current.setTab("scribe"),
      mode: setMode,
      toStall: () => { keepStallSeen(); setStall(true); },
      // his lantern: lit once his cheapest chest is within your marks
      season: () => live.current.event?.season || null,
      invite: () => stallSeen() ? "known"
        : live.current.stats.offered > 0 && live.current.marks >= STALL.chestPrice[0] ? "first" : null,
      more: () => live.current.dailyReady,
      coach: () => (live.current.stats.offered > 0 ? null
        : live.current.scrolls.length ? "HE WANTS WHAT YOU MADE. SWIPE UP."
        : "HE WANTS SCROLLS. THE DESK MAKES THEM."),
    });
    return scene.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="scene" style={{ background: `rgb(${SURROUND})`, position: "relative" }} aria-label="The door">
      <canvas ref={ref} role="img" aria-label="A door standing ajar. Something small waits in the gap with one hand held out, palm up."
              style={{ touchAction: "none", display: "block" }}/>
      {!stall && <Corners g={g} hidden={mode !== "idle"}/>}
      {stall && <Suspense fallback={null}><Stall onClose={() => { setStall(false); scene.current?.back(); }}/></Suspense>}
      <div className="sr-only">
        {!stall && <button onClick={() => scene.current?.toStall()}>Follow him to his stall</button>}
        {g.scrolls.length === 0 && <button onClick={() => g.setTab("scribe")}>You have no scrolls. Go to the desk.</button>}
        {g.scrolls.length > 1 && <button onClick={() => scene.current?.offer(g.scrolls.map(s => s.id))}>Offer all {g.scrolls.length} scrolls</button>}
        {g.scrolls.map((s, i) => (
          <button key={s.id} onClick={() => scene.current?.offer(s.id)}>Offer scroll {i + 1}, {RARITY[s.rarity].n}</button>
        ))}
      </div>
    </section>
  );
}

/* The door's corners: what is yours on the left (the satchel, and the
 * season's snow), the wider world on the right (the ranks, your profile).
 * Small and dark so the scene stays the thing; gone while he is busy. */
function Corners({ g, hidden }) {
  const waiting = g.chests.length + g.dusty.length;
  const ahead = eventNow();
  // the first chest's way in breathes, as the guide's tab did
  const nudge = waiting > 0 && !(g.stats.brushed > 0);
  const Btn = ({ icon, label, to, badge, tint, glow }) => (
    <button onClick={() => { feel("tap"); g.setTab(to); }} title={label}
            aria-label={badge ? `${label}, ${badge} waiting` : label}
            style={{ position: "relative", width: 44, height: 44, display: "grid", placeItems: "center", padding: 0,
                     background: "rgba(8,9,12,.66)", border: "2px solid var(--line)", color: tint || "var(--bone)", font: "inherit",
                     ...(glow ? { animation: "guideGlow 1.4s ease-in-out infinite", color: "var(--candle)" } : {}) }}>
      <PixelIcon name={icon} size={22}/>
      {badge ? <span className="badge" style={{ position: "absolute", top: -7, right: -7 }}>{badge > 9 ? "9+" : badge}</span> : null}
    </button>
  );
  const col = side => ({ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 10px)", [side]: 10, display: "grid", gap: 8 });
  return (
    <div aria-hidden={hidden || undefined} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: hidden ? 0 : 1, transition: "opacity .2s" }}>
      <div style={{ ...col("left"), pointerEvents: hidden ? "none" : "auto" }}>
        <Btn icon="satchel" label="SATCHEL" to="satchel" badge={waiting} glow={nudge}/>
        {ahead && <Btn icon={ahead.ev.icon || "snow"} label={ahead.live ? ahead.ev.name : "COMING SOON"} to="event" tint={ahead.ev.tint || "#bfe6f5"}/>}
      </div>
      <div style={{ ...col("right"), pointerEvents: hidden ? "none" : "auto" }}>
        <Btn icon="trophy" label="RANKS" to="ranks" tint="var(--candle)"/>
        <Btn icon="face" label="PROFILE" to="profile"/>
      </div>
    </div>
  );
}
