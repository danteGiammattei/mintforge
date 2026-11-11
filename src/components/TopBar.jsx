import { useSyncExternalStore } from "react";
import PixelIcon from "../ui/PixelIcon.jsx";
import { sync } from "../lib/sync.js";
import { lvlMin, lvlMax } from "../lib/coin.js";

/* Marks, level, and — only when it is true — that something has not
 * reached the server yet. */
export default function TopBar({ marks, level, xp, onRetry }) {
  const state = useSyncExternalStore(sync.subscribe, sync.get);
  const lo = lvlMin(level), hi = lvlMax(level);
  const pct = Math.max(0, Math.min(100, Math.round((xp - lo) / (hi - lo) * 100)));
  return (
    <header style={{
      flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "0 12px", height: 44,
      paddingTop: "env(safe-area-inset-top, 0px)", boxSizing: "content-box",
      background: "var(--stone-0)", borderBottom: "2px solid var(--line)",
    }}>
      <div className="t-gold" style={{ display: "flex", alignItems: "center", gap: 6 }} aria-label={`${marks} marks`}>
        <PixelIcon name="mark" size={11}/><span aria-hidden>{marks.toLocaleString()}</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }} aria-label={`Level ${level}, ${pct} percent to the next`}>
        <span aria-hidden>LV {level}</span>
        <div className="meter" style={{ flex: 1, maxWidth: 140 }} aria-hidden><i style={{ width: pct + "%", background: "var(--magic)" }}/></div>
      </div>
      {state === "unsaved" && (
        <button className="btn btn-danger" style={{ minHeight: 44, padding: "0 10px" }} onClick={onRetry} aria-label="Some changes are not saved. Tap to retry.">
          <PixelIcon name="cloud" size={11}/>UNSAVED
        </button>
      )}
      {state === "saving" && <span className="t-dim blink" role="status">SAVING</span>}
    </header>
  );
}
