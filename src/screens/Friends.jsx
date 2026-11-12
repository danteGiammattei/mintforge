import { useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { useSocial } from "../state/useSocial.js";
import { lvl } from "../lib/coin.js";
import { hydrate } from "../lib/coinview.js";
import { FRAMES, METALS, PREMIUM_TITLES } from "../lib/data.js";
import { FEATURES } from "../../shared/tuning.js";
import CoinCanvas from "../components/CoinCanvas.jsx";
import CoinModal from "../components/CoinModal.jsx";
import PixelBanner from "../components/PixelBanner.jsx";
import PixelIcon from "../ui/PixelIcon.jsx";
import { CoinTile } from "./Vault.jsx";

/* ─── FRIENDS ─────────────────────────────────────────────────────────────
 * Find players, follow them, look in their cabinets. A friend is someone
 * you have added; when they add you back, the two of you can duel — if
 * duels are switched on (FEATURES.duels in shared/tuning.js; they were
 * hidden before the rebuild and still are). */

export const TitleText = ({ label }) => {
  const p = PREMIUM_TITLES.find(t => t.label === label);
  return p ? <span className={`title-${p.effect}`}>{label}</span> : <span>{label}</span>;
};

function PlayerRow({ p, onOpen, right }) {
  return (
    <li style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
      <button className="btn" style={{ flex: 1, justifyContent: "flex-start", textAlign: "left", borderLeft: `4px solid ${(FRAMES[p.frame] || FRAMES.stone).accent}`, minWidth: 0 }}
              onClick={() => onOpen(p.username)} aria-label={`${p.username}, level ${lvl(p.xp || 0)}. View profile.`}>
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span className="t-plain" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.username}</span>
          <span className="t-label">LV {lvl(p.xp || 0)} · <TitleText label={p.title}/></span>
        </span>
      </button>
      {right}
    </li>
  );
}

function ProfileCard({ soc, me, onDuel }) {
  const v = soc.viewing, d = v.data;
  const [coin, setCoin] = useState(null);
  const [busy, setBusy] = useState(false);
  const ui = useUi();
  const toggle = async () => {
    setBusy(true);
    try { await soc.setFriend(d.username, !d.isFriend); ui.toast(d.isFriend ? "REMOVED" : "ADDED"); }
    catch (e) { ui.toast(e.message, "bad"); }
    setBusy(false);
  };
  // the server has the last word on whether the friendship runs both ways
  const mutual = !!d?.isFriend;
  return (
    <div className="veil appear" style={{ zIndex: 420 }} onClick={soc.closeView}>
      <div className="panel panel-hi sheet rise" role="dialog" aria-modal="true" aria-label={`Profile of ${v.username}`} onClick={e => e.stopPropagation()}>
        {v.loading && <p style={{ padding: 16, margin: 0 }} role="status">LOOKING THEM UP</p>}
        {v.error && <p className="t-blood" style={{ padding: 16, margin: 0 }} role="alert">{v.error}</p>}
        {d && (
          <>
            <PixelBanner frame={d.frame} height={84}/>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div className="t-title t-plain">{d.username}</div>
                <div className="t-label">LV {lvl(d.xp)} · <TitleText label={d.title}/></div>
                {d.bio && <p className="t-dim t-plain" style={{ margin: "8px 0 0" }}>{d.bio}</p>}
              </div>
              <dl style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, margin: 0 }}>
                {[["COINS", d.coinCount], ["SCORE", d.rarityScore.toLocaleString()], ["SHINY", d.shinyCount]].map(([k, val]) => (
                  <div key={k} className="panel" style={{ padding: 8, textAlign: "center" }}>
                    <dd className="t-title" style={{ margin: 0 }}>{val}</dd><dt className="t-label">{k}</dt>
                  </div>
                ))}
              </dl>
              {d.showcase.length > 0 && (
                <div>
                  <div className="t-label" style={{ marginBottom: 8 }}>CABINET</div>
                  <div className="grid-coins">
                    {d.showcase.map(r => { const c = hydrate(r); return <CoinTile key={c.id} coin={c} onClick={() => setCoin(c)}/>; })}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!d.isSelf && <button className={`btn ${d.isFriend ? "" : "btn-gold"}`} style={{ flex: 1 }} disabled={busy} onClick={toggle}>{d.isFriend ? "REMOVE FRIEND" : "ADD FRIEND"}</button>}
                {FEATURES.duels && !d.isSelf && mutual && me.coins.some(c => !c.locked) && (
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => onDuel({ kind: "create", friendUsername: d.username })}><PixelIcon name="swords" size={11}/>DUEL</button>
                )}
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={soc.closeView}>CLOSE</button>
              </div>
            </div>
          </>
        )}
      </div>
      {coin && <CoinModal coin={coin} onClose={() => setCoin(null)}/>}
    </div>
  );
}

/* ── duels: stake a coin against a friend's, best of three flips ── */
function Duels({ soc, g, intent, setIntent }) {
  const ui = useUi();
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const stake = async coinId => {
    try {
      if (intent.kind === "create") await g.api.createDuel(intent.friendUsername, coinId);
      else await g.api.acceptDuel(intent.duelId, coinId);
      setIntent(null); setErr(null); soc.refreshDuels();
    } catch (e) { setErr(e.message || "COULD NOT STAKE THAT COIN"); }
  };
  const decline = async d => {
    if (!(await ui.confirm({ title: "DECLINE THIS DUEL?", yes: "DECLINE", tone: "danger" }))) return;
    try { await g.api.declineDuel(d.id); } catch (e) { ui.toast(e.message, "bad"); }
    soc.refreshDuels();
  };
  const flip = async d => {
    try {
      const r = await g.api.flipDuel(d.id);
      setResult({ flips: r.flips, won: r.winnerUsername === g.username, winner: r.winnerUsername });
      g.reload(); soc.refreshDuels();
    } catch (e) { ui.toast(e.message, "bad"); soc.refreshDuels(); }
  };
  const stakeable = g.coins.filter(c => !c.locked && (intent?.opposingMetalIdx == null || Math.abs(c.metalIdx - intent.opposingMetalIdx) <= 1));

  return (
    <>
      {soc.duels.length > 0 && (
        <section className="panel" style={{ padding: 12 }} aria-label="Duels">
          <h2 className="t-title" style={{ margin: "0 0 12px" }}>DUELS</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {soc.duels.map(d => {
              const mine = d.role === "challenger", other = mine ? d.challengedUsername : d.challengerUsername;
              return (
                <li key={d.id} className="panel" style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="between"><span className="t-plain">{mine ? `YOU vs ${other}` : `${other} vs YOU`}</span><span className="t-label">{d.status}</span></div>
                  <div className="row" style={{ justifyContent: "center", gap: 16 }}>
                    {[d.challengerCoin, d.challengedCoin].map((c, i) => c
                      ? <CoinCanvas key={i} coin={hydrate(c)} size={64}/>
                      : <div key={i} className="panel t-label" style={{ width: 64, height: 64, display: "grid", placeItems: "center" }}>?</div>)}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {d.status === "pending" && !mine && d.challengerCoin && (
                      <button className="btn btn-gold" style={{ flex: 1 }} onClick={() => setIntent({ kind: "accept", duelId: d.id, opposingMetalIdx: d.challengerCoin.metalIdx })}>STAKE A COIN</button>
                    )}
                    {d.status === "ready" && <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => flip(d)}>FLIP</button>}
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => decline(d)}>{mine && d.status === "pending" ? "WITHDRAW" : "DECLINE"}</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {intent && (
        <div className="veil appear" style={{ zIndex: 440 }} onClick={() => { setIntent(null); setErr(null); }}>
          <div className="panel panel-hi sheet rise" role="dialog" aria-modal="true" aria-label="Choose a coin to stake" style={{ padding: 12 }} onClick={e => e.stopPropagation()}>
            <h2 className="t-title" style={{ margin: "0 0 4px" }}>STAKE A COIN</h2>
            <p className="t-dim" style={{ margin: "0 0 12px" }}>BEST OF THREE FLIPS. THE WINNER TAKES BOTH.{intent.opposingMetalIdx != null ? ` WITHIN ONE METAL OF ${METALS[intent.opposingMetalIdx].name}.` : ""}</p>
            {err && <p className="t-blood" role="alert" style={{ margin: "0 0 12px" }}>{err}</p>}
            {stakeable.length === 0 ? <p style={{ margin: 0 }}>NO COIN OF YOURS QUALIFIES.</p> : (
              <div className="grid-coins" style={{ maxHeight: 320, overflowY: "auto", padding: 2 }}>
                {stakeable.map(c => <CoinTile key={c.id} coin={c} onClick={() => stake(c.id)}/>)}
              </div>
            )}
            <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => { setIntent(null); setErr(null); }}>CANCEL</button>
          </div>
        </div>
      )}

      {result && (
        <div className="veil appear" style={{ zIndex: 440, flexDirection: "column", gap: 16, textAlign: "center" }} role="alertdialog" aria-modal="true" aria-label="Duel result">
          <div className="t-big" style={{ color: result.won ? "var(--magic)" : "var(--blood)" }}>{result.won ? "YOU WON" : "YOU LOST"}</div>
          <div className="row" style={{ gap: 12 }}>
            {result.flips.map((f, i) => (
              <div key={i} className="panel" style={{ width: 48, height: 48, display: "grid", placeItems: "center", color: f == null ? "var(--mute)" : "var(--bone)" }}>{f == null ? "-" : i + 1}</div>
            ))}
          </div>
          <div className="t-dim t-plain">{result.winner} TAKES BOTH COINS</div>
          <button autoFocus className="btn btn-gold" style={{ minWidth: 200 }} onClick={() => setResult(null)}>CLOSE</button>
        </div>
      )}
    </>
  );
}

export default function Friends() {
  const g = useGame();
  const soc = useSocial(g.api, true);
  const [intent, setIntent] = useState(null);
  const q = soc.query.trim();

  return (
    <>
      <section className="panel" style={{ padding: 12 }} aria-label="Find a player">
        <label className="t-label" htmlFor="friend-q">FIND A PLAYER</label>
        <div style={{ position: "relative", marginTop: 4 }}>
          <input id="friend-q" className="field t-plain" style={{ paddingRight: 48 }} value={soc.query} maxLength={20}
                 autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="username"
                 onChange={e => soc.setQuery(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))}/>
          <span style={{ position: "absolute", right: 0, top: 0, width: 44, height: 44, display: "grid", placeItems: "center" }}>
            {q ? <button className="btn btn-ghost" style={{ border: 0 }} onClick={() => soc.setQuery("")} aria-label="Clear search"><PixelIcon name="close" size={11}/></button>
               : <PixelIcon name="search" size={11} style={{ color: "var(--mute)" }}/>}
          </span>
        </div>
        {q.length >= 2 && (
          <div style={{ marginTop: 12 }} aria-live="polite">
            <div className="t-label" style={{ marginBottom: 8 }}>{soc.searching ? "SEARCHING" : soc.results.length ? `${soc.results.length} FOUND` : "NOBODY BY THAT NAME"}</div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {soc.results.map(u => <PlayerRow key={u.id} p={u} onOpen={soc.view}/>)}
            </ul>
          </div>
        )}
      </section>

      {FEATURES.duels && <Duels soc={soc} g={g} intent={intent} setIntent={setIntent}/>}

      <section className="panel" style={{ padding: 12 }} aria-label="Friends">
        <div className="between" style={{ marginBottom: 12 }}>
          <h2 className="t-title" style={{ margin: 0 }}>FRIENDS</h2><span className="t-label">{soc.friends.length}</span>
        </div>
        {soc.error && <p className="t-blood" role="alert" style={{ margin: "0 0 12px" }}>{soc.error} <button className="btn" onClick={soc.refresh}>RETRY</button></p>}
        {soc.friends.length === 0
          ? <p className="t-dim" style={{ margin: 0 }}>NOBODY YET. SEARCH FOR A NAME ABOVE.</p>
          : <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {soc.friends.map(f => <PlayerRow key={f.id} p={f} onOpen={soc.view}/>)}
            </ul>}
      </section>

      {soc.followers.length > 0 && (
        <section className="panel" style={{ padding: 12 }} aria-label="Players who added you">
          <div className="between" style={{ marginBottom: 12 }}>
            <h2 className="t-title" style={{ margin: 0 }}>ADDED YOU</h2><span className="t-label">{soc.followers.length}</span>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {soc.followers.map(f => <PlayerRow key={f.id} p={f} onOpen={soc.view}/>)}
          </ul>
        </section>
      )}

      {soc.viewing && <ProfileCard soc={soc} me={g} onDuel={i => { soc.closeView(); setIntent(i); }}/>}
    </>
  );
}

