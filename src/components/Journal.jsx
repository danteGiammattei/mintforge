import { useGame } from "../lib/GameContext.js";
import { METALS, RARITIES } from "../lib/data.js";
import { ASTRAL } from "../../shared/tuning.js";
import CoinCanvas from "./CoinCanvas.jsx";
import PixelIcon from "../ui/PixelIcon.jsx";
import { LEDGER_MARKS } from "../../shared/economy.js";
import { GIFTS, CHESTS } from "../../shared/tuning.js";
import { PREMIUM_TITLE_BY_ID } from "../lib/data.js";

/* ─── JOURNAL ─────────────────────────────────────────────────────────────
 * Every kind of coin you have ever cleaned or won: eleven metals by six
 * rarities, sixty-six kinds. A kind stays found after the coin is sold.
 * Every five or six kinds the goblin has something for you (shared/
 * tuning.js GIFTS): the meter marks where, and the next one is named.
 * Kinds not yet found show nothing — not even that they exist is hinted
 * beyond the empty square. */
// what the goblin gives at a milestone, in words
function prize(kinds) {
  const r = GIFTS.find(g => g.when.kinds === kinds)?.reward;
  if (!r) return "SOMETHING";
  if (r.type === "marks") return `${r.n.toLocaleString()} MARKS`;
  if (r.type === "chest") return `${/^[AEIOU]/.test(CHESTS.names[r.tier]) ? "AN" : "A"} ${CHESTS.names[r.tier]} CHEST`;
  if (r.type === "title") return `A TITLE: ${(PREMIUM_TITLE_BY_ID[r.id]?.label || r.id).toUpperCase()}`;
  return "SOMETHING";
}

export default function Journal() {
  const g = useGame(), j = g.journal;
  const count = (m, r) => j.c[`${m}:${r}`] || 0;
  const found = METALS.reduce((n, _, m) => n + RARITIES.filter((_r, r) => count(m, r) > 0).length, 0);
  const total = METALS.length * RARITIES.length;
  const everything = Object.values(j.c).reduce((a, b) => a + b, 0);
  const next = LEDGER_MARKS.find(k => k > found);

  return (
    <>
      <dl style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, margin: 0 }}>
        {[["KINDS FOUND", `${found} / ${total}`], ["SHINIES", j.shiny], ["BEST COIN", j.best ? j.best.toLocaleString() : "-"]].map(([k, v]) => (
          <div key={k} className="panel" style={{ padding: 8, textAlign: "center" }}>
            <dd className="t-title" style={{ margin: 0 }}>{v}</dd><dt className="t-label">{k}</dt>
          </div>
        ))}
      </dl>
      <div style={{ position: "relative" }}>
        <div className="meter" role="progressbar" aria-label="Kinds found" aria-valuemin={0} aria-valuemax={total} aria-valuenow={found}>
          <i style={{ width: `${found / total * 100}%` }}/>
        </div>
        {/* where the goblin is watching for */}
        {LEDGER_MARKS.map(k => <i key={k} aria-hidden style={{ position: "absolute", top: -2, left: `calc(${k / total * 100}% - 1px)`, width: 2, height: 12, background: k <= found ? "var(--candle)" : "var(--bone-dim)" }}/>)}
      </div>
      {next ? <p className="t-magic" style={{ margin: 0, textAlign: "center" }}>AT {next} KINDS HE HAS {prize(next)} FOR YOU. COLLECT IT AT THE DOOR.</p>
            : <p className="t-gold" style={{ margin: 0, textAlign: "center" }}>EVERY KIND THERE IS. THE LEDGER IS COMPLETE.</p>}

      <section className="panel" style={{ padding: 8, overflowX: "auto" }} aria-label="Kinds of coin found">
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 4, tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ width: 84 }}><span className="sr-only">Metal</span></th>
              {RARITIES.map(r => (
                <th key={r.name} scope="col" style={{ fontWeight: 400, padding: "0 0 4px" }}>
                  <span className="sr-only">{r.name}</span>
                  <i aria-hidden style={{ display: "block", height: 6, background: r.color }}/>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METALS.map((m, mi) => (
              <tr key={m.name}>
                <th scope="row" style={{ fontWeight: 400, textAlign: "left", color: m.hl }}>{m.name}</th>
                {RARITIES.map((r, ri) => {
                  const n = count(mi, ri);
                  return (
                    <td key={ri} aria-label={n ? `${r.name}: ${n} found` : `${r.name}: not found`}
                        style={{ height: 32, textAlign: "center", background: n ? "var(--stone-3)" : "var(--stone-0)",
                                 border: `2px solid ${n ? r.color : "var(--line)"}`, color: n ? r.color : "var(--mute)" }}>
                      <span aria-hidden>{n ? (n > 99 ? "99+" : n) : ""}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <ul style={{ listStyle: "none", display: "flex", flexWrap: "wrap", gap: "4px 12px", margin: "8px 4px 4px", padding: 0 }} aria-hidden>
          {RARITIES.map(r => <li key={r.name} className="row" style={{ gap: 6, color: r.color }}><i style={{ width: 8, height: 8, background: r.color }}/>{r.name}</li>)}
        </ul>
      </section>

      {/* the twelve signs: which this player holds right now */}
      {(() => {
        const held = new Map([...g.coins, ...(g.dusty || [])].filter(c => c.metalIdx === ASTRAL.metal && c.sign != null).map(c => [c.sign, c]));
        return (
          <section className="panel" style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }} aria-label="The twelve signs">
            <div className="between"><span className="t-label">THE TWELVE</span><span className="t-label">{held.size} / 12</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {ASTRAL.signs.map((name, i) => {
                const c = held.get(i);
                return (
                  <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: 4,
                                           border: `2px solid ${c ? METALS[ASTRAL.metal].hl : "var(--line)"}`, background: c ? "var(--stone-3)" : "var(--stone-0)" }}
                       aria-label={c ? `${name}: held` : `${name}: not held`}>
                    {c ? <CoinCanvas coin={c} size={64} aura={false} still/>
                       : <div style={{ width: 64, height: 64, display: "grid", placeItems: "center" }} className="t-label" aria-hidden>?</div>}
                    <span className="t-label" style={{ color: c ? METALS[ASTRAL.metal].hl : "var(--mute)" }}>{name.toUpperCase()}</span>
                  </div>
                );
              })}
            </div>
            <p className="t-label" style={{ margin: 0 }}>
              {held.size >= 12 ? "ALL TWELVE ARE YOURS. NO MORE ASTRAL COINS WILL COME, UNLESS ONE LEAVES YOU."
                               : "EVERY ASTRAL COIN BEARS A SIGN YOU DO NOT HOLD. HOLD ALL TWELVE AND THE SKY CLOSES."}
            </p>
          </section>
        );
      })()}

      <p className="t-label" style={{ margin: 0, textAlign: "center" }}>
        {everything ? <>{everything.toLocaleString()} COINS CLEANED OR WON, ALL TOLD.</> : <>NOTHING YET. BRUSH A COIN CLEAN AND IT IS WRITTEN HERE.</>}
        {g.streak > 1 && <><br/><PixelIcon name="door" size={11} style={{ display: "inline", verticalAlign: "-1px" }}/> {g.streak} DAYS RUNNING AT THE DOOR.</>}
      </p>
    </>
  );
}
