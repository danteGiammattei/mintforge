import { useState } from "react";
import { PROFILE_FX } from "../../shared/events.js";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel, isMuted, setMuted } from "../lib/feel.js";
import { unlockedTitles, coinRarity } from "../lib/coin.js";
import { journalCounts, cabinetScore, setsDone } from "../../shared/economy.js";
import { FRAMES, titleById, TITLES, TITLE_LEVELS } from "../lib/data.js";
import CoinModal from "../components/CoinModal.jsx";
import CabinetFrame, { gradeInk } from "../components/CabinetFrame.jsx";
import { CABINET_SCORE } from "../../shared/tuning.js";
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

/* The cabinet's frame: each grade's frame is earned by reaching that
 * grade, and any earned one below it can be worn instead. */
const FRAME_NAMES = ["WOOD", "STONE", "GOLD", "VOID", "OBSIDIAN", "ELDRITCH", "ASTRAL"];
function CabinetFrames({ g }) {
  const { rank } = cabinetScore(g.showcase.map(c => c && { metalIdx: c.metalIdx, rarity: coinRarity(c), shiny: c.shiny, season: c.season }));
  const worn = g.cabFrame == null ? rank : Math.min(g.cabFrame, rank);
  return (
    <section className="panel" style={{ padding: 12 }} aria-label="Cabinet frame">
      <h2 className="t-title" style={{ margin: "0 0 12px" }}>CABINET FRAME</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {CABINET_SCORE.grades.map(([need], i) => {
          const locked = i > rank;
          return (
            <button key={i} className="tile" disabled={locked} aria-pressed={worn === i} style={{ padding: "14px 10px 8px", gap: 8, overflow: "hidden" }}
                    onClick={() => g.setCabFrame(i === rank ? null : i)}
                    aria-label={locked ? `${FRAME_NAMES[i]}, earned at a cabinet score of ${need}` : FRAME_NAMES[i]}>
              <div style={{ width: "100%", opacity: locked ? 0.35 : 1, filter: locked ? "grayscale(1)" : "none" }}>
                <CabinetFrame rank={i}><div style={{ height: 40 }}/></CabinetFrame>
              </div>
              <span aria-hidden style={{ color: locked ? undefined : gradeInk(i), position: "relative", zIndex: 2, marginTop: 6 }}>{locked ? `${need.toLocaleString()}` : FRAME_NAMES[i]}</span>
            </button>
          );
        })}
      </div>
      <p className="t-label" style={{ margin: "12px 0 0" }}>
        {g.event ? "THE GARLAND HANGS OVER EVERY CABINET UNTIL 5 JANUARY. " : ""}A FRAME IS EARNED BY THE CABINET'S SCORE.
      </p>
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
          {g.ownedTitles.map(id => titleById(id) && (
            <button key={id} className="chip" aria-pressed={g.selectedTitle === titleById(id).label} onClick={() => g.setSelectedTitle(titleById(id).label)}>
              <TitleText label={titleById(id).label}/>
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

      {g.ownedFx.length > 0 && (
        <section className="panel" style={{ padding: 12 }} aria-label="Effect">
          <h2 className="t-title" style={{ margin: "0 0 12px" }}>EFFECT</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            <button className="tile" aria-pressed={!g.profileFx} onClick={() => g.setProfileFx(null)} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ width: "100%" }}><PixelBanner frame={g.frame} height={44}/></div>
              <span style={{ padding: "4px 0 8px" }}>NONE</span>
            </button>
            {g.ownedFx.filter(id => PROFILE_FX[id]).map(id => (
              <button key={id} className="tile" aria-pressed={g.profileFx === id} onClick={() => g.setProfileFx(id)} style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ width: "100%" }}><PixelBanner frame={g.frame} fx={id} height={44}/></div>
                <span style={{ padding: "4px 0 8px" }}>{PROFILE_FX[id].label.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <CabinetSlots g={g}/>
      <CabinetFrames g={g}/>

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
  const cab = cabinetScore(g.showcase.map(c => c && { metalIdx: c.metalIdx, rarity: coinRarity(c), shiny: c.shiny, season: c.season }));
  return (
    <>
      <section className="panel" style={{ overflow: "hidden" }} aria-label="Your profile, as others see it">
        <PublicProfile sets={setsDone(g.journal, g.coins.filter(c => !c.relic).map(c => `${c.metalIdx}:${coinRarity(c)}`))} festive={!!g.event} relics={g.coins.filter(c => c.relic).map(c => c.relic)} cabFrame={g.cabFrame} frame={g.frame} fx={g.profileFx} username={g.username} level={g.level} title={g.selectedTitle} bio={g.bio}
                       coins={g.coins.length} kinds={journalCounts(g.journal).kinds} shiny={g.coins.filter(c => c.shiny).length}
                       signs={[...new Set(g.coins.filter(c => c.sign != null).map(c => c.sign))]}
                       tomes={g.tomes}
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
