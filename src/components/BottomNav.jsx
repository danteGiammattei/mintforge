import PixelIcon from "../ui/PixelIcon.jsx";

/* Seven tabs, in the order the loop runs: draw, pay, open, keep, work —
 * then the two places that are not part of it. Friends live under
 * Profile. Icons only (seven names don't fit a phone); each keeps its
 * name for screen readers and as a tooltip. */
export const TABS = [
  ["scribe",  "quill",   "SCRIBE"],
  ["door",    "door",    "DOOR"],
  ["satchel", "satchel", "SATCHEL"],
  ["vault",   "vault",   "VAULT"],
  ["forge",   "anvil",   "FORGE"],
  ["tavern",  "die",     "TAVERN"],
  ["profile", "face",    "PROFILE"],
];

export default function BottomNav({ tab, setTab, badges = {}, guide = null }) {
  return (
    <nav aria-label="Main" style={{
      flexShrink: 0, display: "flex", background: "var(--stone-0)", borderTop: "2px solid var(--line)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {TABS.map(([id, icon, label]) => {
        const on = tab === id, n = badges[id] || 0;
        return (
          <button key={id} onClick={() => setTab(id)} aria-current={on ? "page" : undefined}
                  aria-label={n ? `${label}, ${typeof n === "number" ? n : "something"} waiting` : label} title={label}
                  style={{
                    flex: 1, minWidth: 0, height: "var(--nav-h)", padding: 0, position: "relative",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                    background: on ? "var(--stone-2)" : "transparent", border: 0,
                    borderTop: `2px solid ${on ? "var(--candle)" : "transparent"}`, marginTop: -2,
                    color: on ? "var(--candle)" : "var(--bone-dim)",
                    // the tab the first-loop guide points at breathes
                    ...(guide === id ? { animation: "guideGlow 1.4s ease-in-out infinite", color: "var(--candle)" } : {}),
                  }}>
            <PixelIcon name={icon} size={26}/>
            {n !== 0 && <span className="badge" aria-hidden style={{ position: "absolute", top: 6, left: "50%", marginLeft: 8, ...(typeof n === "number" ? {} : { background: "var(--magic)" }) }}>{typeof n === "number" && n > 9 ? "9+" : n}</span>}
          </button>
        );
      })}
    </nav>
  );
}
