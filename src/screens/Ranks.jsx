import { useCallback, useEffect, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { feel } from "../lib/feel.js";
import { FRAMES } from "../lib/data.js";
import PixelIcon from "../ui/PixelIcon.jsx";
import { useSocial } from "../state/useSocial.js";
import { ProfileCard, TitleText } from "./Friends.jsx";
import { REGIONS, BOARD_WORLD, seasonName } from "../../shared/ranks.js";

/* ─── THE RANKS ───────────────────────────────────────────────────────────
 * The richest vaults: the world's, and each region's. A vault's worth is
 * every clean coin in it, right now. When each quarter ends the first of
 * every board is crowned with a title to keep (shared/ranks.js). Its own
 * page for now, reached from the top bar; it is to be tied in with the
 * rest when the screens are reworked. */

const BOARDS = [[BOARD_WORLD, "WORLD"], ...Object.entries(REGIONS).map(([k, r]) => [k, r.short])];
const left = ms => {
  const d = Math.floor(ms / 86400e3), h = Math.floor(ms / 3600e3) % 24, m = Math.floor(ms / 60e3) % 60;
  return d > 0 ? `${d}D ${h}H` : h > 0 ? `${h}H ${m}M` : `${Math.max(0, m)}M`;
};
const MEDAL = ["#f3c94a", "#cfd6e0", "#d08a4e"];

export default function Ranks() {
  const g = useGame(), soc = useSocial(g.api, true);
  const [board, setBoard] = useState(BOARD_WORLD);
  const [data, setData] = useState(null), [err, setErr] = useState(null);
  const load = useCallback(b => {
    setData(d => (d && d.board === b ? d : null));
    return g.act("ranks", { board: b }).then(r => { setData(r); setErr(null); }).catch(e => setErr(e.message));
  }, [g]);
  useEffect(() => { load(board); }, [board]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = b => { if (b !== board) { feel("tap"); setBoard(b); } };
  const name = board === BOARD_WORLD ? "THE WORLD" : REGIONS[board].name.toUpperCase();
  const mineHere = data && data.me.rank != null;

  return (
    <div className="page">
      <div className="page-in">
        <div className="between">
          <h1 className="t-big" style={{ margin: 0 }}>RANKS</h1>
          {data && <span className="t-label">{seasonName(data.season).toUpperCase()} · ENDS IN {left(data.endsAt - Date.now())}</span>}
        </div>
        <p className="t-dim" style={{ margin: 0 }}>
          THE RICHEST VAULTS, BY THE WORTH OF EVERY COIN IN THEM RIGHT NOW. WHEN EACH QUARTER ENDS, THE FIRST IN THE WORLD AND THE FIRST IN EACH REGION ARE CROWNED WITH A TITLE TO KEEP.
        </p>

        <div className="seg" role="tablist" aria-label="Board" style={{ overflowX: "auto" }}>
          {BOARDS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={board === k} onClick={() => pick(k)} style={{ flex: "1 0 auto", padding: "0 8px" }}
                    aria-label={k === BOARD_WORLD ? "The world" : REGIONS[k].name}>
              {label}{data?.region === k ? " ★" : ""}
            </button>
          ))}
        </div>

        {/* where you stand */}
        {data && (
          <section className="panel" style={{ padding: 12, display: "flex", alignItems: "center", gap: 12 }} aria-label="Your place">
            <span className="t-big" style={{ minWidth: 48, textAlign: "center", color: mineHere && data.me.rank <= 3 ? MEDAL[data.me.rank - 1] : "var(--candle)" }}>
              {mineHere ? `#${data.me.rank}` : "–"}
            </span>
            <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 4 }}>
              <span className="t-label">YOUR VAULT{data.region ? ` · ${REGIONS[data.region].name.toUpperCase()}` : ""}</span>
              <span className="t-gold row" style={{ gap: 6 }}><PixelIcon name="mark" size={11}/>{data.me.value.toLocaleString()}</span>
              {!mineHere && <span className="t-dim">{!data.region && board !== BOARD_WORLD ? "YOUR REGION IS SET THE NEXT TIME YOU OPEN THE GAME." : board !== BOARD_WORLD && board !== data.region ? "NOT YOUR REGION." : "NO COINS IN YOUR VAULT YET."}</span>}
            </span>
          </section>
        )}

        <section className="panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }} aria-label={`Richest in ${name}`}>
          <h2 className="t-title" style={{ margin: "0 0 4px" }}>RICHEST IN {name}</h2>
          {err && <p className="t-bad" style={{ margin: 0 }}>{err}</p>}
          {!data && !err && <p className="t-dim blink" style={{ margin: 0 }}>COUNTING…</p>}
          {data && !data.rows.length && <p className="t-dim" style={{ margin: 0 }}>NOBODY HERE YET. A VAULT IS COUNTED ONCE ITS KEEPER OPENS THE GAME.</p>}
          {data && data.rows.length > 0 && (
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {data.rows.map(r => {
                const me = r.username === g.username;
                return (
                  <li key={r.username}>
                    <button className="btn" onClick={() => soc.view(r.username)}
                            style={{ width: "100%", justifyContent: "flex-start", gap: 10, textAlign: "left", minHeight: 48,
                                     borderLeft: `4px solid ${(FRAMES[r.frame] || FRAMES.stone).accent}`, background: me ? "var(--stone-3)" : undefined }}
                            aria-label={`Rank ${r.rank}, ${r.username}, ${r.value} marks. View profile.`}>
                      <span className="t-title" style={{ minWidth: 32, textAlign: "right", color: r.rank <= 3 ? MEDAL[r.rank - 1] : "var(--bone-dim)" }}>{r.rank}</span>
                      <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 2 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: me ? "var(--candle)" : undefined }}>
                          {r.username}{board === BOARD_WORLD && r.region && REGIONS[r.region] ? <span className="t-dim"> · {REGIONS[r.region].short}</span> : null}
                        </span>
                        {r.title && <span className="t-label" style={{ lineHeight: 1.5 }}><TitleText label={r.title}/></span>}
                      </span>
                      <span className="t-gold row" style={{ gap: 4, flexShrink: 0 }}><PixelIcon name="mark" size={11}/>{r.value.toLocaleString()}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {data?.crowns?.length > 0 && (
          <section className="panel" style={{ padding: 12, display: "grid", gap: 6 }} aria-label="Crowned before">
            <h2 className="t-title" style={{ margin: 0 }}>CROWNED</h2>
            {data.crowns.map(c => (
              <div key={c.season} className="between">
                <span className="t-label">{seasonName(c.season).toUpperCase()}</span>
                <button className="btn" style={{ minHeight: 36, padding: "0 8px" }} onClick={() => soc.view(c.username)}>{c.username}</button>
                <span className="t-gold row" style={{ gap: 4 }}><PixelIcon name="mark" size={11}/>{c.value.toLocaleString()}</span>
              </div>
            ))}
          </section>
        )}
        <p className="t-label" style={{ margin: 0 }}>SEASONS END AT MIDNIGHT UTC ON THE LAST DAY OF MARCH, JUNE, SEPTEMBER AND DECEMBER. YOUR REGION IS WHERE YOU FIRST PLAYED FROM. COINS UP FOR AUCTION ARE NOT IN YOUR VAULT.</p>
        {soc.viewing && <ProfileCard soc={soc}/>}
      </div>
    </div>
  );
}
