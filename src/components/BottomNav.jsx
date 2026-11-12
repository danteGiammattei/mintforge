import PixelIcon from "../ui/PixelIcon.jsx";

/* Six tabs, in the order the loop runs: draw, pay, open, keep — then the
 * two places that are not part of it. Friends live under Profile. */
export const TABS = [
  ["scribe",  "quill",   "SCRIBE"],
  ["door",    "door",    "DOOR"],
  ["satchel", "satchel", "SATCHEL"],
  ["vault",   "vault",   "VAULT"],
  ["tavern",  "die",     "TAVERN"],
  ["profile", "face",    "PROFILE"],
];

export default function BottomNav({ tab, setTab, badges = {} }) {
  return (
    <nav aria-label="Main" style={{
      flexShrink: 0, display: "flex", background: "var(--stone-0)", borderTop: "2px solid var(--line)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {TABS.map(([id, icon, label]) => {
        const on = tab === id, n = badges[id] || 0;
        return (
          <button key={id} onClick={() => setTab(id)} aria-current={on ? "page" : undefined}
                  aria-label={n ? `${label}, ${typeof n === "number" ? n : "something"} waiting` : label}
                  style={{
                    flex: 1, minWidth: 0, height: "var(--nav-h)", padding: 0, position: "relative",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                    background: on ? "var(--stone-2)" : "transparent", border: 0,
                    borderTop: `2px solid ${on ? "var(--candle)" : "transparent"}`, marginTop: -2,
                    color: on ? "var(--candle)" : "var(--bone-dim)",
                  }}>
            <PixelIcon name={icon} size={22}/>
            <span style={{ fontSize: 12, lineHeight: 1, letterSpacing: 0 }} aria-hidden>{label}</span>
            {n !== 0 && <span className="badge" aria-hidden style={{ position: "absolute", top: 6, left: "50%", marginLeft: 8, ...(typeof n === "number" ? {} : { background: "var(--magic)" }) }}>{typeof n === "number" && n > 9 ? "9+" : n}</span>}
          </button>
        );
      })}
    </nav>
  );
}
