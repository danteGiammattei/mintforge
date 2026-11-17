import { useEffect, useRef } from "react";
import { feel } from "../lib/feel.js";

/* ─── the first loop, shown once ──────────────────────────────────────
 * A new player is walked round the loop once: the chest he gives you,
 * opening it, brushing the coin, copying a page, giving him the scroll,
 * and the journal where what you found is kept. Where you are in it is
 * worked out from what you have done (the server's stats and what you
 * hold), so it carries to another device with nothing stored; only
 * skipping it, and having opened the journal, are kept on this device.
 *
 * guideStep(g) → { tab, line } for the next thing to do, or null.
 * <Guide/> is the strip above the nav that says it, with the tab it
 * points at glowing (BottomNav `guide`). The two canvas scenes coach for
 * themselves, so on those the strip stays out of the way and only the
 * tab glows. */
const DONE_KEY = "mf.guideDone", JOURNAL_KEY = "mf.journalSeen";
const flag = k => { try { return !!localStorage.getItem(k); } catch { return false; } };
const setFlag = k => { try { localStorage.setItem(k, "1"); } catch { /* fine */ } };
export const journalSeen = () => setFlag(JOURNAL_KEY);

export function guideStep(g) {
  if (flag(DONE_KEY)) return null;
  const s = g.stats || {};
  if (!(s.visits > 0)) return { tab: "door", line: "SOMETHING WAITS FOR YOU AT THE DOOR." };
  if (g.chests.length && !g.coins.length && !g.dusty.length && !(s.brushed > 0)) return { tab: "satchel", line: "HE GAVE YOU A CHEST. OPEN IT IN YOUR SATCHEL." };
  if (g.dusty.length && !(s.brushed > 0)) return { tab: "satchel", line: "YOUR COIN IS DUSTY. BRUSH IT CLEAN IN YOUR SATCHEL." };
  if (!(s.sealed > 0)) return { tab: "scribe", line: "HE PAYS FOR SCROLLS. COPY A PAGE AT THE DESK AND SEAL IT." };
  if (!(s.offered > 0)) return { tab: "door", line: "TAKE YOUR SCROLL TO THE DOOR AND GIVE IT TO HIM." };
  if (!flag(JOURNAL_KEY) && !(s.offered >= 5)) return { tab: "vault", line: "EVERY COIN YOU FIND IS WRITTEN IN YOUR JOURNAL, IN THE VAULT." };
  return null;
}

export default function Guide({ step, tab, setTab, bare, onSkip }) {
  // toasts rise above the strip while it is there (ui/Overlay.jsx)
  const el = useRef(null), shown = !!step && !bare;
  useEffect(() => {
    const root = document.documentElement.style;
    if (shown && el.current) root.setProperty("--guide-h", el.current.offsetHeight + "px");
    else root.removeProperty("--guide-h");
    return () => root.removeProperty("--guide-h");
  }, [shown, step?.line]);
  if (!shown) return null;
  const here = step.tab === tab;
  return (
    <div ref={el} role="status" style={{
      flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
      background: "var(--stone-1)", borderTop: "2px solid var(--line)", minHeight: 40,
    }}>
      <button onClick={() => { if (!here) { feel("tap"); setTab(step.tab); } }}
              style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: 0, padding: 0, font: "inherit",
                       color: "var(--candle)", cursor: here ? "default" : "pointer", lineHeight: 1.4 }}>
        {step.line}{!here && " ›"}
      </button>
      <button className="t-dim" onClick={() => { setFlag(DONE_KEY); onSkip(); }}
              style={{ background: "none", border: 0, font: "inherit", padding: "4px 0 4px 8px", cursor: "pointer", minHeight: 32 }}>
        SKIP
      </button>
    </div>
  );
}
