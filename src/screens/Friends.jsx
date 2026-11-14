import { useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { useSocial } from "../state/useSocial.js";
import { lvl } from "../lib/coin.js";
import { hydrate } from "../lib/coinview.js";
import { FRAMES, PREMIUM_TITLES, RARITIES } from "../lib/data.js";
import CoinModal from "../components/CoinModal.jsx";
import PixelBanner from "../components/PixelBanner.jsx";
import PixelIcon from "../ui/PixelIcon.jsx";
import { CoinTile } from "./Vault.jsx";
import CabinetFrame from "../components/CabinetFrame.jsx";

/* ─── FRIENDS ─────────────────────────────────────────────────────────────
 * Find players, follow them, look in their cabinets. */

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

function ProfileCard({ soc }) {
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
                {[["COINS", d.coinCount], ["KINDS", `${d.kinds} / 54`], ["SHINY", d.shinyCount]].map(([k, val]) => (
                  <div key={k} className="panel" style={{ padding: 8, textAlign: "center" }}>
                    <dd className="t-title" style={{ margin: 0 }}>{val}</dd><dt className="t-label">{k}</dt>
                  </div>
                ))}
              </dl>
              {d.showcase.length > 0 && (
                <CabinetFrame rank={d.cabinet?.rank || 0} pad={6}>
                <div>
                  <div className="between" style={{ marginBottom: 8, gap: 8 }}>
                    <span className="t-label">CABINET</span>
                    {d.cabinet && <CabinetScore cab={d.cabinet} small/>}
                  </div>
                  <div className="grid-coins">
                    {d.showcase.map(r => { const c = hydrate(r); return <CoinTile key={c.id} coin={c} onClick={() => setCoin(c)}/>; })}
                  </div>
                </div>
                </CabinetFrame>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!d.isSelf && <button className={`btn ${d.isFriend ? "" : "btn-gold"}`} style={{ flex: 1 }} disabled={busy} onClick={toggle}>{d.isFriend ? "REMOVE FRIEND" : "ADD FRIEND"}</button>}
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

export default function Friends() {
  const g = useGame();
  const soc = useSocial(g.api, true);
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

      {soc.viewing && <ProfileCard soc={soc}/>}
    </>
  );
}


/* A cabinet's score and grade (shared/economy.js cabinetScore), the grade
 * in the colour of the rarity it takes to reach it. */
export function CabinetScore({ cab, small = false }) {
  const col = RARITIES[Math.min(cab.rank, RARITIES.length - 1)].color;
  if (small) return <span className="t-label" style={{ color: col }}>{cab.score.toLocaleString()} · {cab.grade}</span>;
  const prev = cab.next == null ? 1 : (cab.score - (cab.from || 0)) / (cab.next - (cab.from || 0));
  return (
    <div className="panel" style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }} aria-label={`Cabinet score ${cab.score}, ${cab.grade}`}>
      <div className="between" style={{ alignItems: "baseline", gap: 8 }}>
        <span className="t-title" style={{ color: col }}>{cab.score.toLocaleString()}</span>
        <span className="t-label" style={{ color: col, textAlign: "right" }}>{cab.grade}</span>
      </div>
      <div className="meter" aria-hidden><i style={{ width: `${Math.min(100, prev * 100)}%`, background: col }}/></div>
      <span className="t-label">{cab.next == null ? "THE FINEST GRADE THERE IS" : `NEXT GRADE AT ${cab.next.toLocaleString()}`}</span>
    </div>
  );
}
