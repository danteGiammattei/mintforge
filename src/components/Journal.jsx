import { useGame } from "../lib/GameContext.js";
import { METALS, RARITIES } from "../lib/data.js";
import PixelIcon from "../ui/PixelIcon.jsx";

/* ─── JOURNAL ─────────────────────────────────────────────────────────────
 * Every kind of coin you have ever cleaned or won: nine metals by six
 * rarities, fifty-four kinds. A kind stays found after the coin is sold.
 * Kinds not yet found show nothing — not even that they exist is hinted
 * beyond the empty square. */
export default function Journal() {
  const g = useGame(), j = g.journal;
  const count = (m, r) => j.c[`${m}:${r}`] || 0;
  const found = METALS.reduce((n, _, m) => n + RARITIES.filter((_r, r) => count(m, r) > 0).length, 0);
  const total = METALS.length * RARITIES.length;
  const everything = Object.values(j.c).reduce((a, b) => a + b, 0);

  return (
    <>
      <dl style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, margin: 0 }}>
        {[["KINDS FOUND", `${found} / ${total}`], ["SHINIES", j.shiny], ["BEST COIN", j.best ? j.best.toLocaleString() : "-"]].map(([k, v]) => (
          <div key={k} className="panel" style={{ padding: 8, textAlign: "center" }}>
            <dd className="t-title" style={{ margin: 0 }}>{v}</dd><dt className="t-label">{k}</dt>
          </div>
        ))}
      </dl>
      <div className="meter" role="progressbar" aria-label="Kinds found" aria-valuemin={0} aria-valuemax={total} aria-valuenow={found}>
        <i style={{ width: `${found / total * 100}%` }}/>
      </div>

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

      <p className="t-label" style={{ margin: 0, textAlign: "center" }}>
        {everything ? <>{everything.toLocaleString()} COINS CLEANED OR WON, ALL TOLD.</> : <>NOTHING YET. BRUSH A COIN CLEAN AND IT IS WRITTEN HERE.</>}
        {g.streak > 1 && <><br/><PixelIcon name="door" size={11} style={{ display: "inline", verticalAlign: "-1px" }}/> {g.streak} DAYS RUNNING AT THE DOOR.</>}
      </p>
    </>
  );
}
