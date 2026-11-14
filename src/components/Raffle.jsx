import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { coinRarity } from "../lib/coin.js";
import { METALS, RARITIES } from "../lib/data.js";
import { RAFFLE } from "../../shared/tuning.js";
import { CoinTile } from "../screens/Vault.jsx";

/* ─── RAFFLE ──────────────────────────────────────────────────────────────
 * A daily draw for each metal (server/raffle.js). Coins are the tickets:
 * each goes into its own metal's draw, worth more entries the rarer it
 * is, and is gone once entered. One winner per metal takes the pot. */

const left = ms => {
  const m = Math.max(0, Math.ceil(ms / 60000)), h = Math.floor(m / 60);
  return h ? `${h}H ${m % 60}M` : `${m}M`;
};
const chance = (mine, all) => (!mine ? null : mine === all ? "100%" : `${Math.max(1, Math.round((mine / all) * 100))}%`);

export default function Raffle() {
  const g = useGame(), ui = useUi();
  const [data, setData] = useState(null);
  const [ids, setIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const refresh = useRef(g.refresh); refresh.current = g.refresh;

  const load = useCallback(() => g.api.getRaffle().then(setData).catch(e => ui.toast(e.message, "bad")), [g.api, ui]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  // when the draw comes round, look again (that look is what draws it)
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => { load(); refresh.current(); }, Math.max(1000, data.drawAt - Date.now() + 1500));
    return () => clearTimeout(t);
  }, [data, load]);

  const free = useMemo(() => g.coins.filter(c => !c.locked).sort((a, b) => a.metalIdx - b.metalIdx || coinRarity(a) - coinRarity(b)), [g.coins]);
  const picked = ids.map(id => free.find(c => c.id === id)).filter(Boolean);
  const tickets = picked.reduce((s, c) => s + RAFFLE.entries[coinRarity(c)], 0);
  const pick = id => { feel("tap"); setIds(p => p.includes(id) ? p.filter(x => x !== id) : p.length >= RAFFLE.maxCoins ? p : [...p, id]); };

  const enter = async () => {
    const dear = picked.find(c => c.shiny || coinRarity(c) >= 3);
    if (!(await ui.confirm({
      title: "ENTER THE RAFFLE?",
      body: `${picked.length} COIN${picked.length > 1 ? "S" : ""} FOR ${tickets} ${tickets > 1 ? "ENTRIES" : "ENTRY"}. ENTERED COINS ARE GONE, WIN OR LOSE.${dear ? " ONE OF THEM IS " + (dear.shiny ? "SHINY." : RARITIES[coinRarity(dear)].name.toUpperCase() + ".") : ""}`,
      yes: "ENTER", tone: "danger",
    }))) return;
    setBusy(true);
    try {
      const r = await g.api.enterRaffle(ids);
      setData(r.raffle); setIds([]); feel("offer");
      ui.say(`${r.entries} ${r.entries > 1 ? "ENTRIES" : "ENTRY"} IN.`);
      g.refresh();
    } catch (e) { ui.toast(e.message, "bad"); feel("error"); }
    setBusy(false);
  };

  if (!data) return <section className="panel" style={{ padding: 12 }}><p className="t-dim" style={{ margin: 0 }}>LOOKING FOR THE RAFFLE…</p></section>;
  const mine = data.last.filter(d => d.you);
  const at = new Date(data.drawAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toUpperCase();

  return (
    <>
      <section className="panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="between" style={{ alignItems: "baseline" }}>
          <span className="t-title">NEXT DRAW IN {left(data.drawAt - now)}</span>
          <span className="t-label">{at} DAILY</span>
        </div>
        <p className="t-dim" style={{ margin: 0 }}>
          EACH COIN IS A TICKET FOR ITS OWN METAL'S RAFFLE. RARER COINS COUNT FOR MORE: {RARITIES.map((r, i) => `${r.name.toUpperCase()} ${RAFFLE.entries[i]}`).join(" · ")}.
          ONE WINNER PER METAL TAKES THE POT. ENTERED COINS ARE GONE.
        </p>
        {mine.length > 0 && (
          <div className="panel" style={{ padding: 8, borderColor: "var(--candle)" }} role="status">
            {mine.map(d => <div key={d.tier} className="t-gold">YOU WON THE {METALS[d.tier].name.toUpperCase()} RAFFLE: {d.pot.toLocaleString()} MARKS</div>)}
          </div>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr className="t-label">{["METAL", "POT", "ENTRIES", "YOURS"].map((h, i) => <th key={h} style={{ textAlign: i ? "right" : "left", fontWeight: "normal", paddingBottom: 4 }}>{h}</th>)}</tr></thead>
          <tbody>
            {data.tiers.map(t => (
              <tr key={t.tier} style={{ opacity: t.entries || g.coins.some(c => c.metalIdx === t.tier) ? 1 : 0.55 }}>
                <td style={{ color: METALS[t.tier].hl, padding: "3px 0" }}>{METALS[t.tier].name.toUpperCase()}</td>
                <td style={{ textAlign: "right" }} className="t-gold">{t.pot.toLocaleString()}</td>
                <td style={{ textAlign: "right" }}>{t.entries}{t.players > 1 ? <span className="t-label"> ·{t.players}</span> : null}</td>
                <td style={{ textAlign: "right" }} className={t.mine ? "t-magic" : "t-label"}>{t.mine ? `${t.mine} · ${chance(t.mine, t.entries)}` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="between">
          <span className="t-title">BUY TICKETS</span>
          <span className="t-label">{picked.length ? `${picked.length} COINS · ${tickets} ENTRIES` : "PICK COINS"}</span>
        </div>
        {free.length ? (
          <>
            <div className="grid-coins coin-scroll" style={{ maxHeight: 300, padding: 2 }}>
              {free.slice(0, 160).map(c => <CoinTile key={c.id} coin={c} selected={ids.includes(c.id)} onClick={() => pick(c.id)}/>)}
            </div>
            <button className="btn btn-danger btn-block" disabled={!picked.length || busy} onClick={enter}>
              {picked.length ? `ENTER FOR ${tickets} ${tickets > 1 ? "ENTRIES" : "ENTRY"}` : "PICK COINS TO ENTER"}
            </button>
          </>
        ) : <p style={{ margin: 0 }}>YOU HAVE NO UNLOCKED COINS TO ENTER.</p>}
      </section>

      {data.last.length > 0 && (
        <section className="panel" style={{ padding: 12 }}>
          <h2 className="t-title" style={{ margin: "0 0 8px" }}>LAST DRAW</h2>
          {data.last.map(d => (
            <div key={d.tier} className="between" style={{ padding: "2px 0" }}>
              <span style={{ color: METALS[d.tier].hl }}>{METALS[d.tier].name.toUpperCase()}</span>
              <span className={d.you ? "t-gold" : "t-dim"}>{d.you ? "YOU" : d.winner} · {d.pot.toLocaleString()}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
