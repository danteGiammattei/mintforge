import { useSyncExternalStore } from "react";
import PixelIcon from "../ui/PixelIcon.jsx";
import { sync } from "../lib/sync.js";
import { lvlMin, lvlMax } from "../lib/coin.js";
import { useUi } from "../ui/Overlay.jsx";

/* Marks, level, and — only when it is true — that something has not
 * reached the server yet. A tap on the marks or the level says what they
 * are, how they are earned and what they are for. */
const EXPLAIN = {
  title: "MARKS AND LEVEL",
  body: "MARKS ARE YOUR MONEY. YOU EARN THEM BY SELLING COINS IN THE VAULT, AND HE GIVES SOME AS GIFTS. "
      + "SPEND THEM ON A DEEPER INKWELL AT THE DESK (IT HOLDS MORE INK, FOR BIGGER SIGILS), AT THE FORGE, "
      + "AND ON WHATEVER ELSE YOU FIND FOR SALE IN THE DARK. "
      + "YOUR LEVEL RISES AS YOU SEAL, OFFER AND BRUSH. IT EARNS TITLES AND BANNERS FOR YOUR PROFILE.",
  yes: "GOT IT",
};
export default function TopBar({ marks, level, xp, onRetry, daily, onDaily }) {
  const state = useSyncExternalStore(sync.subscribe, sync.get), ui = useUi();
  const explain = () => ui.notify(EXPLAIN);
  const lo = lvlMin(level), hi = lvlMax(level);
  const pct = Math.max(0, Math.min(100, Math.round((xp - lo) / (hi - lo) * 100)));
  return (
    <header style={{
      flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "0 12px", height: 44,
      paddingTop: "env(safe-area-inset-top, 0px)", boxSizing: "content-box",
      background: "var(--stone-0)", borderBottom: "2px solid var(--line)",
    }}>
      <button onClick={explain} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, minWidth: 0, minHeight: 44, padding: 0, background: "none", border: 0, color: "inherit", font: "inherit", textAlign: "left" }}
              aria-label={`${marks} marks. Level ${level}, ${pct} percent to the next. Tap to learn what they are for.`}>
        <span className="t-gold" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <PixelIcon name="mark" size={11}/><span aria-hidden>{marks.toLocaleString()}</span>
        </span>
        <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }} aria-hidden>
          <span>LV {level}</span>
          <span className="meter" style={{ flex: 1, maxWidth: 140, display: "block" }}><i style={{ width: pct + "%", background: "var(--magic)" }}/></span>
        </span>
      </button>
      {daily && state !== "unsaved" && (
        <button className="btn btn-magic" style={{ minHeight: 44, padding: "0 10px" }} onClick={onDaily} aria-label="Today's gift is waiting at the door">
          <PixelIcon name="door" size={11}/>GIFT
        </button>
      )}
      {state === "unsaved" && (
        <button className="btn btn-danger" style={{ minHeight: 44, padding: "0 10px" }} onClick={onRetry} aria-label="Some changes are not saved. Tap to retry.">
          <PixelIcon name="cloud" size={11}/>UNSAVED
        </button>
      )}
      {state === "saving" && <span className="t-dim blink" role="status">SAVING</span>}
    </header>
  );
}
