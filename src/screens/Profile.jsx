import { useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel, isMuted, setMuted } from "../lib/feel.js";
import { rarityScore, unlockedTitles, rune } from "../lib/coin.js";
import { FRAMES, METALS, PREMIUM_TITLE_BY_ID, TITLES, TITLE_LEVELS, BRUSH_UPS } from "../lib/data.js";
import CoinCanvas from "../components/CoinCanvas.jsx";
import CoinModal from "../components/CoinModal.jsx";
import PixelBanner from "../components/PixelBanner.jsx";
import PixelIcon from "../ui/PixelIcon.jsx";
import Friends, { TitleText } from "./Friends.jsx";
import { CoinTile } from "./Vault.jsx";

/* ─── PROFILE ─────────────────────────────────────────────────────────────
 * Who you are to other players: banner, title, bio and the cabinet of six
 * coins. Banners and titles you have earned by level are listed with the
 * level that unlocks the next; the ones the goblin gives are not listed
 * at all until he has given them. FRIENDS is the second view. */

function Cabinet({ g }) {
  const ui = useUi();
  const [slot, setSlot] = useState(null);         // picking a coin for this slot
  const [open, setOpen] = useState(null);         // { coin, slot }
  const slots = Array.from({ length: g.maxPins }, (_, i) => g.showcase[i] || null);
  const reset = async () => {
    if (await ui.confirm({ title: "RESET THE CABINET?", body: "IT WILL SHOW YOUR SIX BEST COINS AGAIN.", yes: "RESET" })) g.setPinnedIds(null);
  };
  return (
    <section className="panel" style={{ padding: 12 }} aria-label="Display cabinet">
      <div className="between" style={{ marginBottom: 12 }}>
        <h2 className="t-title" style={{ margin: 0 }}>CABINET</h2>
        {g.pinnedIds != null ? <button className="btn btn-ghost" onClick={reset}>RESET</button> : <span className="t-label">YOUR BEST SIX</span>}
      </div>
      <div className="grid-3">
        {slots.map((c, i) => c
          ? <CoinTile key={c.id} coin={c} onClick={() => setOpen({ coin: c, slot: i })}/>
          : <button key={"e" + i} className="tile" style={{ minHeight: 104, justifyContent: "center", color: "var(--bone-dim)", borderStyle: "dashed" }}
                    disabled={!g.coins.length} onClick={() => setSlot(i)} aria-label={`Empty slot ${i + 1}. Choose a coin.`}>
              <PixelIcon name="pin" size={22}/><span aria-hidden>EMPTY</span>
            </button>)}
      </div>

      {open && (
        <CoinModal coin={g.coins.find(c => c.id === open.coin.id) || open.coin} onClose={() => setOpen(null)} onToggleLock={g.toggleLock}
                   pinned onTogglePin={() => { g.clearPinSlot(open.slot); setOpen(null); }}/>
      )}
      {slot != null && (
        <div className="veil appear" style={{ zIndex: 430 }} onClick={() => setSlot(null)}>
          <div className="panel panel-hi sheet rise" role="dialog" aria-modal="true" aria-label="Choose a coin for the cabinet" style={{ padding: 12 }} onClick={e => e.stopPropagation()}>
            <h2 className="t-title" style={{ margin: "0 0 12px" }}>CHOOSE A COIN</h2>
            <div className="grid-coins" style={{ maxHeight: 360, overflowY: "auto", padding: 2 }}>
              {g.coins.map(c => <CoinTile key={c.id} coin={c} pinned={g.pinnedIds?.includes(c.id)} onClick={() => { g.pinToSlot(slot, c.id); setSlot(null); feel("tap"); }}/>)}
            </div>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => setSlot(null)}>CANCEL</button>
          </div>
        </div>
      )}
    </section>
  );
}

function You({ g }) {
  const ui = useUi();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(g.bio);
  const [muted, setMute] = useState(isMuted());
  const titles = unlockedTitles(g.level);
  const nextTitle = TITLE_LEVELS[titles.length];
  const frames = Object.entries(FRAMES).filter(([id, f]) => !f.premium || g.ownedFrames.includes(id));
  const nextFrame = Object.values(FRAMES).filter(f => !f.premium && f.minLvl > g.level).sort((a, b) => a.minLvl - b.minLvl)[0];
  const lead = g.showcase.find(Boolean);

  const signOut = async () => {
    if (await ui.confirm({ title: "SIGN OUT?", body: "YOUR VAULT STAYS ON THE SERVER. YOU WILL NEED YOUR PIN TO RETURN.", yes: "SIGN OUT" })) g.signOut();
  };

  return (
    <>
      <section className="panel" style={{ overflow: "hidden" }} aria-label="You">
        <PixelBanner frame={g.frame}>
          <div className="t-label" style={{ position: "absolute", left: 12, bottom: 8, color: g.fr.accent }}>{g.fr.lbl}</div>
        </PixelBanner>
        <div style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ flexShrink: 0, padding: 4, background: "var(--stone-0)", boxShadow: `0 0 0 2px #000, 0 0 0 4px ${g.fr.accent}` }}>
            {lead ? <CoinCanvas coin={lead} size={64}/> : <div style={{ width: 64, height: 64, display: "grid", placeItems: "center", color: "var(--mute)" }}><PixelIcon name="face" size={33}/></div>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="t-title t-plain" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{g.username}</div>
            <div className="t-rune t-dim">{rune(g.username.toUpperCase().replace(/[^A-Z]/g, ""))}</div>
            <div><TitleText label={g.selectedTitle}/></div>
          </div>
        </div>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, margin: 0, padding: "0 12px 12px" }}>
          {[["COINS", g.coins.length], ["SCORE", rarityScore(g.coins).toLocaleString()], ["SHINY", g.coins.filter(c => c.shiny).length]].map(([k, v]) => (
            <div key={k} className="panel" style={{ padding: 8, textAlign: "center" }}>
              <dd className="t-title" style={{ margin: 0 }}>{v}</dd><dt className="t-label">{k}</dt>
            </div>
          ))}
        </dl>
        <div style={{ padding: "0 12px 12px" }}>
          {editing ? (
            <>
              <label className="t-label" htmlFor="bio">BIO</label>
              <textarea id="bio" className="field t-plain" rows={3} maxLength={120} value={draft} style={{ resize: "none", marginTop: 4 }}
                        onChange={e => setDraft(e.target.value.slice(0, 120))}/>
              <div className="between" style={{ marginTop: 8 }}>
                <span className="t-label">{draft.length} / 120</span>
                <span className="row">
                  <button className="btn btn-ghost" onClick={() => { setDraft(g.bio); setEditing(false); }}>CANCEL</button>
                  <button className="btn btn-gold" onClick={() => { g.setBio(draft); setEditing(false); }}>SAVE</button>
                </span>
              </div>
            </>
          ) : (
            <div className="between" style={{ alignItems: "flex-start" }}>
              <p className="t-dim t-plain" style={{ margin: 0, minWidth: 0, overflowWrap: "anywhere" }}>{g.bio || "NO BIO YET."}</p>
              <button className="btn" onClick={() => { setDraft(g.bio); setEditing(true); }}>EDIT</button>
            </div>
          )}
        </div>
      </section>

      <section className="panel" style={{ padding: 12 }} aria-label="Title">
        <h2 className="t-title" style={{ margin: "0 0 12px" }}>TITLE</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {titles.map(t => <button key={t} className="chip" aria-pressed={g.selectedTitle === t} onClick={() => g.setSelectedTitle(t)}>{t}</button>)}
          {g.ownedTitles.map(id => PREMIUM_TITLE_BY_ID[id] && (
            <button key={id} className="chip" aria-pressed={g.selectedTitle === PREMIUM_TITLE_BY_ID[id].label} onClick={() => g.setSelectedTitle(PREMIUM_TITLE_BY_ID[id].label)}>
              <TitleText label={PREMIUM_TITLE_BY_ID[id].label}/>
            </button>
          ))}
        </div>
        {nextTitle && <p className="t-label" style={{ margin: "12px 0 0" }}>{TITLES[titles.length]} AT LEVEL {nextTitle}</p>}
      </section>

      <section className="panel" style={{ padding: 12 }} aria-label="Banner">
        <h2 className="t-title" style={{ margin: "0 0 12px" }}>BANNER</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          {frames.map(([id, f]) => {
            const locked = g.level < f.minLvl;
            return (
              <button key={id} className="tile" style={{ padding: 0, borderTopColor: f.accent, overflow: "hidden" }} aria-pressed={g.frame === id}
                      disabled={locked} onClick={() => g.setFrame(id)} aria-label={locked ? `${f.lbl}, unlocks at level ${f.minLvl}` : f.lbl}>
                <div style={{ width: "100%" }}><PixelBanner frame={id} height={44} dim={locked}/></div>
                <span aria-hidden style={{ padding: "4px 0 8px" }}>{locked ? `LV ${f.minLvl}` : f.lbl}</span>
              </button>
            );
          })}
        </div>
        {nextFrame && <p className="t-label" style={{ margin: "12px 0 0" }}>{nextFrame.lbl} AT LEVEL {nextFrame.minLvl}</p>}
      </section>

      <Cabinet g={g}/>

      {g.coins.length > 0 && (
        <section className="panel" style={{ padding: 12 }} aria-label="What the vault is made of">
          <h2 className="t-title" style={{ margin: "0 0 12px" }}>VAULT, BY METAL</h2>
          <div style={{ display: "flex", height: 12, border: "2px solid #000" }} aria-hidden>
            {METALS.map((m, i) => { const n = g.coins.filter(c => c.metalIdx === i).length; return n > 0 && <div key={i} style={{ flex: n, background: m.base }}/>; })}
          </div>
          <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
            {METALS.map((m, i) => { const n = g.coins.filter(c => c.metalIdx === i).length; return n > 0 && <li key={i} style={{ color: m.hl }}>{n} {m.name}</li>; })}
          </ul>
        </section>
      )}

      <section className="panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }} aria-label="Settings">
        <h2 className="t-title" style={{ margin: 0 }}>SETTINGS</h2>
        <div className="between"><span className="t-dim">BRUSH</span><span>{(BRUSH_UPS[g.brushLevel] || BRUSH_UPS[0]).label}</span></div>
        <button className="btn btn-block" aria-pressed={!muted} onClick={() => { const m = !muted; setMuted(m); setMute(m); if (!m) feel("tap"); }}>
          <PixelIcon name={muted ? "mute" : "sound"} size={11}/>SOUND AND HAPTICS: {muted ? "OFF" : "ON"}
        </button>
        <button className="btn btn-ghost btn-block" onClick={signOut}>SIGN OUT</button>
      </section>
    </>
  );
}

export default function Profile() {
  const g = useGame();
  const [view, setView] = useState("you");
  return (
    <div className="page">
      <div className="page-in">
        <div className="seg" role="tablist" aria-label="Profile">
          <button role="tab" aria-selected={view === "you"} onClick={() => setView("you")}><PixelIcon name="face" size={11}/>YOU</button>
          <button role="tab" aria-selected={view === "friends"} onClick={() => setView("friends")}><PixelIcon name="friends" size={11}/>FRIENDS</button>
        </div>
        {view === "you" ? <You g={g}/> : <Friends/>}
      </div>
    </div>
  );
}
