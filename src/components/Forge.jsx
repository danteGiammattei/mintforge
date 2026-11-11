import { useEffect, useRef, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { coinValue, coinRarity } from "../lib/coin.js";
import { METALS, RARITIES } from "../lib/data.js";
import { forgeCost } from "../../shared/economy.js";
import { FORGE } from "../../shared/tuning.js";
import { mount, SURROUND } from "../scenes/forge.js";
import PixelIcon from "../ui/PixelIcon.jsx";

/* ─── THE FORGE ───────────────────────────────────────────────────────────
 * Where marks go. Take a coin from the vault, pay for a strike, and it may
 * come away shiny. A miss costs the marks and nothing else — the coin is
 * never at risk, which is what separates this from the Tavern. The price
 * and the odds are shown; the server takes the marks and makes the roll. */
export default function Forge({ coinId, onClose }) {
  const g = useGame(), ui = useUi();
  const ref = useRef(null), scene = useRef(null), live = useRef(g);
  live.current = g;
  const [busy, setBusy] = useState(false);
  const coin = g.coins.find(c => c.id === coinId);

  useEffect(() => {
    scene.current = mount(ref.current, {
      coin: () => live.current.coins.find(c => c.id === coinId),
      say: ui.say, feel,
    });
    const key = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); scene.current(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinId]);

  if (!coin) return null;
  const cost = forgeCost(coinValue({ ...coin, shiny: false }));
  const short = g.marks < cost;
  const m = METALS[coin.metalIdx], r = RARITIES[coinRarity(coin)];

  const strike = () => {
    if (busy || coin.shiny || short) return;
    const p = g.act("forge", { coinId });
    if (!scene.current.strike(p)) return;
    setBusy(true);
    // the button comes back once the blow has played out, whatever the answer
    p.catch(() => {}).finally(() => setTimeout(() => setBusy(false), 1100));
  };

  return (
    <div className="veil appear" style={{ zIndex: 520, flexDirection: "column", padding: 0, background: `rgb(${SURROUND})` }}
         role="dialog" aria-modal="true" aria-label="The forge">
      <div className="scene" style={{ width: "100%", background: "transparent" }}>
        <canvas ref={ref} role="img" style={{ display: "block" }}
                aria-label={`A ${r.name} ${m.name} coin on an anvil, a hammer raised over it, coals glowing below.`}/>
      </div>
      <div style={{ width: "100%", maxWidth: 360, padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="between">
          <span style={{ color: m.hl }}>{coin.raw}</span>
          <span className="t-gold row" style={{ gap: 6 }} aria-label={`You have ${g.marks} marks`}><PixelIcon name="mark" size={11}/>{g.marks.toLocaleString()}</span>
        </div>
        {coin.shiny ? (
          <p className="t-gold" style={{ margin: 0, textAlign: "center" }}>IT SHINES. THERE IS NOTHING MORE THE FORGE CAN DO FOR IT.</p>
        ) : (
          <>
            <p className="t-dim" style={{ margin: 0 }}>
              A STRIKE MAY LEAVE A SHINE ON IT — ABOUT 1 IN {Math.round(1 / FORGE.shinyChance)}. THE COIN IS NEVER HARMED. THE MARKS ARE SPENT EITHER WAY.
            </p>
            <button className="btn btn-gold btn-block" disabled={busy || short} onClick={strike}>
              {busy ? "…" : <><PixelIcon name="mark" size={11}/>STRIKE FOR {cost.toLocaleString()}</>}
            </button>
            {short && <p className="t-blood" role="status" style={{ margin: 0, textAlign: "center" }}>YOU NEED {(cost - g.marks).toLocaleString()} MORE MARKS.</p>}
          </>
        )}
        <button className="btn btn-ghost btn-block" disabled={busy} onClick={onClose}>{coin.shiny ? "DONE" : "LEAVE"}</button>
      </div>
    </div>
  );
}
