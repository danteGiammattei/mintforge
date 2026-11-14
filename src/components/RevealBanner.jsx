import { matterOf } from "../lib/coinview.js";
import { useEffect } from "react";
import CoinCanvas from "./CoinCanvas.jsx";
import PixelIcon from "../ui/PixelIcon.jsx";
import { coinRarity, coinValue, shapeOf } from "../lib/coin.js";
import { RARITIES, SHAPE_NAMES } from "../lib/data.js";

/* What you found, once the dirt is off: its rarity, the coin, its name,
 * metal and shape, whether it is a kind new to your journal, what it would
 * sell for and the XP. Stays until dismissed: nothing here is on a timer,
 * so nobody has to read against the clock. */
export default function RevealBanner({ coin, xp, isNew, onDone, doneLabel = "KEEP IT" }) {
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
      <div>
        <div className="t-title">{coin.nick || coin.raw}</div>
        <div style={{ color: m.hl, marginTop: 4 }}>{m.name} · {SHAPE_NAMES[shapeOf(coin)] || shapeOf(coin)}</div>
      </div>
      {isNew && <div className="t-magic">NEW IN YOUR JOURNAL</div>}
      <div className="t-dim" style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }} className="t-gold"><PixelIcon name="mark" size={11}/>{coinValue(coin).toLocaleString()}</span>
        {xp ? <span className="t-magic">+{xp} XP</span> : null}
      </div>
      <button autoFocus className="btn btn-gold" style={{ minWidth: 200 }} onClick={onDone}>{doneLabel}</button>
    </div>
  );
}
