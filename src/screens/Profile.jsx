import { useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel, isMuted, setMuted } from "../lib/feel.js";
import { unlockedTitles, coinRarity } from "../lib/coin.js";
import { journalCounts, cabinetScore } from "../../shared/economy.js";
import { FRAMES, PREMIUM_TITLE_BY_ID, TITLES, TITLE_LEVELS } from "../lib/data.js";
import CoinModal from "../components/CoinModal.jsx";
import PixelBanner from "../components/PixelBanner.jsx";
import PixelIcon from "../ui/PixelIcon.jsx";
import PublicProfile from "../components/PublicProfile.jsx";
import Friends, { TitleText } from "./Friends.jsx";
import { CoinTile } from "./Vault.jsx";

/* ─── PROFILE ─────────────────────────────────────────────────────────────
 * YOU is your profile as other players see it (components/PublicProfile),
 * with one button: EDIT PROFILE, where everything you can change lives —
 * bio, title, banner, the cabinet's six coins, sound, signing out.
 * FRIENDS is the second view. */

/* the cabinet's six slots, to fill, change or empty */
function CabinetSlots({ g }) {
  const ui = useUi();
  const [slot, setSlot] = useState(null);
  const slots = Array.from({ length: g.maxPins }, (_, i) => g.showcase[i] || null);
  const reset = async () => {
    if (await ui.confirm({ title: "RESET THE CABINET?", body: "IT WILL SHOW YOUR SIX BEST COINS AGAIN.", yes: "RESET" })) g.setPinnedIds(null);
  };
  return (
    <section className="panel" style={{ padding: 12 }} aria-label="Cabinet">
      <div className="between" style={{ marginBottom: 12 }}>
        <h2 className="t-title" style={{ margin: 0 }}>CABINET</h2>
        {g.pinnedIds != null ? <button className="btn btn-ghost" onClick={reset}>RESET</button> : <span className="t-label">YOUR BEST SIX</span>}
      </div>
      <div className="grid-3">
        {slots.map((c, i) => c
          ? <CoinTile key={c.id} coin={c} label={`Slot ${i + 1}. Change it.`} onClick={() => setSlot(i)}/>
          : <button key={"e" + i} className="tile" style={{ minHeight: 104, justifyContent: "center", color: "var(--bone-dim)", borderStyle: "dashed" }}
                    disabled={!g.coins.length} onClick={() => setSlot(i)} aria-label={`Empty slot ${i + 1}. Choose a coin.`}>
              <PixelIcon name="pin" size={22}/><span aria-hidden>EMPTY</span>
            </button>)}
      </div>
      {slot != null && (
        <div className="veil appear" style={{ zIndex: 440 }} onClick={() => setSlot(null)}>
          <div className="panel panel-hi sheet rise" role="dialog" aria-modal="true" aria-label="Choose a coin for the cabinet" style={{ padding: 12 }} onClick={e => e.stopPropagation()}>
            <h2 className="t-title" style={{ margin: "0 0 12px" }}>CHOOSE A COIN</h2>
            <div className="grid-coins coin-scroll" style={{ maxHeight: 360, padding: 2 }}>
              {g.coins.map(c => <CoinTile key={c.id} coin={c} pinned={g.pinnedIds?.includes(c.id)} onClick={() => { g.pinToSlot(slot, c.id); setSlot(null); feel("tap"); }}/>)}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {slots[slot] && <button className="btn" style={{ flex: 1 }} onClick={() => { g.clearPinSlot(slot); setSlot(null); }}>EMPTY IT</button>}
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setSlot(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function EditProfile({ g, onDone }) {
  const ui = useUi();
  const [draft, setDraft] = useState(g.bio);
  const [muted, setMute] = useState(isMuted());
  const titles = unlockedTitles(g.level);
  const nextTitle = TITLE_LEVELS[titles.length];
  const frames = Object.entries(FRAMES).filter(([id, f]) => !f.premium || g.ownedFrames.includes(id));
  const nextFrame = Object.values(FRAMES).filter(f => !f.premium && f.minLvl > g.level).sort((a, b) => a.minLvl - b.minLvl)[0];
  const done = () => { if (draft !== g.bio) g.setBio(draft); onDone(); };
  const signOut = async () => {
    if (await ui.confirm({ title: "SIGN OUT?", body: "YOUR VAULT STAYS ON THE SERVER. YOU WILL NEED YOUR PIN TO RETURN.", yes: "SIGN OUT" })) g.signOut();
  };

  return (
    <>
      <div className="between">
        <h1 className="t-big" style={{ margin: 0 }}>EDIT PROFILE</h1>
        <button className="btn btn-gold" onClick={done}>DONE</button>
      </div>

      <section className="panel" style={{ padding: 12 }} aria-label="Bio">
        <label className="t-title" htmlFor="bio">BIO</label>
        <textarea id="bio" className="field t-plain" rows={3} maxLength={120} value={draft} style={{ resize: "none", marginTop: 8 }}
                  onChange={e => setDraft(e.target.value.slice(0, 120))}/>
        <div className="t-label" style={{ textAlign: "right", marginTop: 4 }}>{draft.length} / 120</div>
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

      <CabinetSlots g={g}/>

      <section className="panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }} aria-label="Settings">
        <h2 className="t-title" style={{ margin: 0 }}>SETTINGS</h2>
        <button className="btn btn-block" aria-pressed={!muted} onClick={() => { const m = !muted; setMuted(m); setMute(m); if (!m) feel("tap"); }}>
          <PixelIcon name={muted ? "mute" : "sound"} size={11}/>SOUND AND HAPTICS: {muted ? "OFF" : "ON"}
        </button>
        <button className="btn btn-ghost btn-block" onClick={signOut}>SIGN OUT</button>
      </section>
    </>
  );
}

function You({ g }) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(null);         // a cabinet coin, looked at
  if (editing) return <EditProfile g={g} onDone={() => setEditing(false)}/>;
  const shown = g.showcase.filter(Boolean);
  const cab = cabinetScore(g.showcase.map(c => c && { metalIdx: c.metalIdx, rarity: coinRarity(c), shiny: c.shiny }));
  return (
    <>
      <section className="panel" style={{ overflow: "hidden" }} aria-label="Your profile, as others see it">
        <PublicProfile frame={g.frame} username={g.username} level={g.level} title={g.selectedTitle} bio={g.bio}
                       coins={g.coins.length} kinds={journalCounts(g.journal).kinds} shiny={g.coins.filter(c => c.shiny).length}
                       cabinet={cab} showcase={shown} onCoin={c => setOpen(c)}
                       empty={<p className="t-dim" style={{ margin: 0 }}>YOUR CABINET IS EMPTY. COINS YOU KEEP WILL SHOW HERE.</p>}>
          <button className="btn btn-block" onClick={() => setEditing(true)}><PixelIcon name="face" size={11}/>EDIT PROFILE</button>
        </PublicProfile>
      </section>
      {open && <CoinModal coin={g.coins.find(c => c.id === open.id) || open} onClose={() => setOpen(null)} onToggleLock={g.toggleLock}/>}
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
