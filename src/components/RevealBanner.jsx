import { matterOf } from "../lib/coinview.js";
import { useEffect } from "react";
import CoinCanvas from "./CoinCanvas.jsx";
import PixelIcon from "../ui/PixelIcon.jsx";
import { coinRarity, coinValue } from "../lib/coin.js";
import { RARITIES, SHAPE_NAMES } from "../lib/data.js";

/* What you found, once the dirt is off. Stays until dismissed: nothing
 * here is on a timer, so nobody has to read against the clock. */
export default function RevealBanner({ coin, xp, onDone, doneLabel = "KEEP IT" }) {
  const m = matterOf(coin);
  const r = RARITIES[coinRarity(coin)];
  useEffect(() => {
    const key = e => { if (e.key === "Escape" || e.key === "Enter") onDone(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onDone]);

  return (
    <div className="veil appear" role="dialog" aria-modal="true" aria-label={`${r.name} ${m.name} coin`} style={{ zIndex: 500, flexDirection: "column", gap: 16, textAlign: "center" }}>
      {coin.shiny && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, animation: "shinyText 1s steps(2) infinite" }}>
          <PixelIcon name="spark" size={22}/> SHINY <PixelIcon name="spark" size={22}/>
        </div>
      )}
      <div className="t-big rise" style={{ color: r.color }}>{r.name}</div>
      <div style={{ padding: 36, boxShadow: `0 0 0 2px #000, 0 0 0 4px ${r.color}` , background: "var(--stone-0)", animation: "coinEmerge .8s steps(6) both" }}>
        <CoinCanvas coin={coin} size={192} auraMargin={12}/>
      </div>
      <div style={{ color: m.hl }}>{m.name} · {SHAPE_NAMES[coin.shape] || coin.shape}</div>
      <div>
        <div className="t-rune" style={{ fontSize: 24, color: m.hl }}>{coin.runes}</div>
        <div className="t-title">{coin.raw}</div>
        <div className="t-dim" style={{ maxWidth: 300, marginTop: 4 }}>{coin.era}</div>
      </div>
      <div className="t-dim" style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }} className="t-gold"><PixelIcon name="mark" size={11}/>{coinValue(coin).toLocaleString()}</span>
        <span>{coin.cond}</span>
        {xp ? <span className="t-magic">+{xp} XP</span> : null}
      </div>
      <button autoFocus className="btn btn-gold" style={{ minWidth: 200 }} onClick={onDone}>{doneLabel}</button>
    </div>
  );
}
