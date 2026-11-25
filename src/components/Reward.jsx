import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Sprite from "../ui/Sprite.jsx";
import { present, loadGifts } from "../lib/presentArt.js";
import { PROFILE_FX, RELICS, relicOf } from "../../shared/events.js";
import { useGame } from "../lib/GameContext.js";
import { feel } from "../lib/feel.js";
import { FRAMES, PREMIUM_TITLES, METALS } from "../lib/data.js";
import { SCRIBE, DAILY, CHESTS, ASTRAL } from "../../shared/tuning.js";
import { TOME_BY_ID } from "../../shared/tomes.js";
import { RARITY } from "../../shared/sigil.js";
import CoinCanvas from "./CoinCanvas.jsx";
import { hydrate } from "../lib/coinview.js";
import { Gem } from "./SetGems.jsx";
import { TomeCover } from "./TomeCover.jsx";
import PixelBanner from "./PixelBanner.jsx";
import PixelIcon from "../ui/PixelIcon.jsx";
import { TitleText } from "../screens/Friends.jsx";

/* ══════════════════════════════════════════════════════════════════════
 *  Reward — the moment something is given
 *  ────────────────────────────────────────────────────────────────────
 *  One popup for every reward the player earns: a brush or banner or
 *  title from the goblin, a level gained and what it unlocked, a deeper
 *  inkwell. Several at once wait their turn. Anything that changes a
 *  number says which number, and from what to what — a reward the player
 *  cannot see the effect of does not feel like one.
 *
 *    const celebrate = useCelebrate();
 *    celebrate({ kind: "well", level: 2 });
 *    celebrate({ kind: "title", label: "Goldspun", from: "gift" });
 *    celebrate({ kind: "frame", id: "stargazer", from: "gift" });
 *    celebrate({ kind: "level", level: 10, titles: [...], frames: [...] });
 *    celebrate({ kind: "well", level: 1 });
 *    celebrate({ kind: "marks", n: 40 });
 *    celebrate({ kind: "signs", signs: [{ sign: 3, marks: 10000 }] });
 *    celebrate({ kind: "tome", id: "hedge" });
 *
 *  The goblin's own gifts never say why they came. Neither does this.
 * ══════════════════════════════════════════════════════════════════════ */

const Ctx = createContext(() => {});
export const useCelebrate = () => useContext(Ctx);

// how long an event has left, counting today, by the player's own calendar
function eventLeft(to) {
  const now = new Date(), today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const n = Math.max(1, Math.round((Date.parse(to + "T00:00:00Z") - today) / 86400e3) + 1);
  const end = new Date(to + "T00:00:00Z").toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "UTC" }).toUpperCase();
  return n === 1 ? "ITS LAST DAY" : `${n} DAYS LEFT · UNTIL ${end}`;
}


function Stat({ label, from, to }) {
  const up = from !== to;
  return (
    <div className="between" style={{ padding: "8px 12px", background: "var(--stone-0)", border: "2px solid var(--line)" }}>
      <span className="t-dim">{label}</span>
      <span className="row" style={{ gap: 8 }}>
        <span className="t-dim">{from}</span>
        <PixelIcon name="back" size={11} style={{ transform: "scaleX(-1)", color: up ? "var(--magic)" : "var(--mute)" }}/>
        <span className={up ? "t-magic" : ""}>{to}</span>
      </span>
    </div>
  );
}

/* A handful of pixels thrown up from behind the card. Pure CSS, so the
 * reduced-motion rule in styles.css stills it with everything else. */
function Burst({ colour }) {
  return (
    <div aria-hidden style={{ position: "absolute", left: "50%", top: 56, width: 0, height: 0, pointerEvents: "none" }}>
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2, d = 70 + (i % 3) * 26;
        return <i key={i} style={{
          position: "absolute", width: i % 4 ? 4 : 6, height: i % 4 ? 4 : 6, background: i % 3 ? colour : "#fff0a8",
          "--dx": `${Math.cos(a) * d}px`, "--dy": `${Math.sin(a) * d * 0.8}px`,
          animation: `burst .9s steps(9) ${(i % 5) * 0.03}s both`,
        }}/>;
      })}
    </div>
  );
}

function Body({ r }) {
  const g = useGame();
  const [giftsIn, setGiftsIn] = useState(false);
  useEffect(() => { if (r.kind !== "event") return; let on = true; loadGifts().then(ok => on && setGiftsIn(ok)); return () => { on = false; }; }, [r.kind]);
  if (r.kind === "well") {
    const from = SCRIBE.wells[r.level - 1], to = SCRIBE.wells[r.level];
    return (
      <>
        <div className="t-title" style={{ textAlign: "center" }}>{to.name}</div>
        <Stat label="INK PER SHEET" from={from.ink} to={to.ink}/>
        <p className="t-dim" style={{ margin: 0, textAlign: "center" }}>ROOM FOR LONGER LINES AND BIGGER SIGILS.</p>
      </>
    );
  }
  if (r.kind === "title") {
    return (
      <>
        <div className="t-big" style={{ textAlign: "center", lineHeight: 1.3 }}><TitleText label={r.label}/></div>
        <p className="t-dim" style={{ margin: 0, textAlign: "center" }}>{r.from === "gift" ? "HE DOES NOT GIVE THIS TO JUST ANYONE."
          : r.from === "faultless" ? "A COPY HE CANNOT FAULT. FEW HANDS EVER MAKE ONE."
          : r.from === "first_star" ? "A STAR AMONG YOUR FIRST FIFTY COINS. THE SKY NOTICED YOU EARLY." : "IT IS YOURS TO WEAR."}</p>
      </>
    );
  }
  if (r.kind === "frame") {
    const f = FRAMES[r.id];
    return (
      <>
        <div style={{ border: "2px solid #000", boxShadow: `0 0 0 2px ${f.accent}` }}><PixelBanner frame={r.id} height={96}/></div>
        <div className="t-title" style={{ textAlign: "center", color: f.accent }}>{f.lbl.toUpperCase()}</div>
        {f.desc && <p className="t-dim" style={{ margin: 0, textAlign: "center" }}>{f.desc.toUpperCase()}</p>}
      </>
    );
  }
  if (r.kind === "level") {
    return (
      <>
        <div className="t-big t-magic" style={{ textAlign: "center", fontSize: 32 }}>{r.level}</div>
        {(r.titles.length > 0 || r.frames.length > 0) ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="t-label" style={{ textAlign: "center" }}>UNLOCKED</div>
            {r.titles.map(t => <div key={t} className="between" style={{ padding: "8px 12px", background: "var(--stone-0)", border: "2px solid var(--line)" }}><span className="t-dim">TITLE</span><TitleText label={t}/></div>)}
            {r.frames.map(id => <div key={id} className="between" style={{ padding: "8px 12px", background: "var(--stone-0)", border: "2px solid var(--line)" }}><span className="t-dim">BANNER</span><span style={{ color: FRAMES[id].accent }}>{FRAMES[id].lbl.toUpperCase()}</span></div>)}
          </div>
        ) : <p className="t-dim" style={{ margin: 0, textAlign: "center" }}>KEEP DRAWING. KEEP PAYING HIM.</p>}
      </>
    );
  }
  if (r.kind === "daily") {
    const week = DAILY.chestEvery, day = ((r.streak - 1) % week) + 1, g = r.gift;
    const markFor = d => DAILY.marks[Math.min(DAILY.marks.length - 1, d - 1)];
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${week}, 1fr)`, gap: 4 }} role="list" aria-label={`Day ${day} of ${week}`}>
          {Array.from({ length: week }, (_, i) => {
            const d = i + 1, done = d < day, now = d === day, chest = d === week;
            return (
              <div key={d} role="listitem" aria-label={`Day ${d}${chest ? ", a chest" : ""}${done ? ", collected" : now ? ", today" : ""}`}
                   style={{ padding: "6px 0", textAlign: "center", border: `2px solid ${now ? "var(--magic)" : done ? "var(--line-hi)" : "var(--line)"}`,
                            background: now ? "var(--magic-lo)" : "var(--stone-0)", color: now ? "var(--magic)" : done ? "var(--bone-dim)" : "var(--mute)" }}>
                <div aria-hidden style={{ fontSize: 12 }}>{d}</div>
                <div aria-hidden style={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
                  {done ? <PixelIcon name="check" size={11}/> : <PixelIcon name={chest ? "chest" : "mark"} size={11}/>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="t-title" style={{ textAlign: "center" }}>
          {g.type === "chest" ? <span className="t-gold">{CHESTS.names[g.tier]} CHEST</span>
                              : <span className="t-gold row" style={{ justifyContent: "center", gap: 8 }}><PixelIcon name="mark" size={11}/>{g.n} MARKS</span>}
        </div>
        <p className="t-dim" style={{ margin: 0, textAlign: "center" }}>
          {day === week ? "A WHOLE WEEK. COME BACK TOMORROW AND IT BEGINS AGAIN."
            : day === week - 1 ? "COME BACK TOMORROW. ON THE SEVENTH DAY HE GIVES A CHEST."
            : `COME BACK TOMORROW FOR ${markFor(day + 1)}. ON THE SEVENTH DAY, A CHEST.`}
          <br/>MISS TWO DAYS AND IT STARTS OVER.
        </p>
      </>
    );
  }
  if (r.kind === "signs") {
    const total = r.signs.reduce((a, b) => a + b.marks, 0);
    return (
      <>
        <div className="row" style={{ justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {r.signs.slice(0, 12).map(b => <CoinCanvas key={b.sign} coin={{ seed: 1, metalIdx: ASTRAL.metal, sign: b.sign, shape: "hexagonal", rarity: 0 }} size={r.signs.length > 2 ? 64 : 128} aura={false}/>)}
        </div>
        <p className="t-title" style={{ margin: 0, textAlign: "center" }}>{r.signs.map(b => ASTRAL.signs[b.sign].toUpperCase()).join(" · ")}</p>
        <div className="t-big t-gold row" style={{ justifyContent: "center", gap: 10 }}><PixelIcon name="mark" size={22}/>{total.toLocaleString()}</div>
        <p className="t-dim" style={{ margin: 0, textAlign: "center" }}>{r.signs.length > 1 ? "FOR EACH SIGN, THE FIRST TIME YOU HOLD IT." : "FOR HOLDING THIS SIGN FOR THE FIRST TIME."}</p>
      </>
    );
  }
  if (r.kind === "sets") {
    // a metal's set whole: its gem lights, and he pays for it
    return (
      <>
        <div className="row" style={{ justifyContent: "center", gap: 10 }}>{r.sets.map(s => <Gem key={s.metal} metal={s.metal} lit size={54}/>)}</div>
        <p className="t-title" style={{ margin: 0, textAlign: "center" }}>{r.sets.map(s => METALS[s.metal].name.toUpperCase()).join(" · ")}</p>
        <div className="t-big t-gold row" style={{ justifyContent: "center", gap: 10 }}><PixelIcon name="mark" size={22}/>{r.sets.reduce((n, s) => n + s.marks, 0).toLocaleString()}</div>
        <p className="t-dim" style={{ margin: 0, textAlign: "center" }}>EVERY RARITY OF IT, COMMON TO MYTHIC. ITS GEM IS LIT ON YOUR PROFILE.</p>
      </>
    );
  }
  if (r.kind === "auction") {
    // the back room's news, every line since you last looked
    const SAY = { won: "YOU WON IT", sold: "SOLD", unsold: "NO BIDS. IT CAME HOME", outbid: "OUTBID" };
    return (
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        {r.notes.slice(0, 6).map((nt, i) => (
          <li key={i} className="row" style={{ gap: 10 }}>
            {nt.coin && <CoinCanvas coin={hydrate(nt.coin)} size={48} aura={false}/>}
            <div style={{ display: "grid", gap: 2, textAlign: "left" }}>
              <span className={nt.kind === "won" || nt.kind === "sold" ? "t-gold" : "t-dim"}>{SAY[nt.kind] || nt.kind.toUpperCase()}</span>
              {nt.amount != null && (
                <span className="t-label row" style={{ gap: 4 }}>
                  <PixelIcon name="mark" size={10}/>
                  {nt.kind === "sold" ? `${nt.amount.toLocaleString()} TO YOU, AFTER THE HOUSE'S TENTH`
                    : nt.kind === "outbid" ? `SOMEONE BID ${nt.amount.toLocaleString()}. YOUR MARKS ARE BACK`
                    : `${nt.amount.toLocaleString()} PAID. IT IS IN YOUR VAULT`}
                </span>
              )}
            </div>
          </li>
        ))}
        {r.notes.length > 6 && <li className="t-label">AND {r.notes.length - 6} MORE</li>}
      </ul>
    );
  }
  if (r.kind === "relics") {
    // one gift found, or the last of the three (then the set pays too)
    const total = r.relics.reduce((a, b) => a + b.marks, 0);
    const set = r.relics.find(b => b.set), found = r.relics.filter(b => b.relic).map(b => relicOf(b.relic));
    const show = set ? RELICS[set.set].coins.map((_, i) => `${set.set}:${i}`) : found.map(f => `${f.set}:${f.index}`);
    return (
      <>
        <div className="row" style={{ justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {show.map(id => <CoinCanvas key={id} coin={{ seed: 7, metalIdx: 3, rarity: 5, relic: id, shape: "round" }} size={show.length > 1 ? 80 : 128} aura={false}/>)}
        </div>
        <p className="t-title" style={{ margin: 0, textAlign: "center" }}>{show.map(id => relicOf(id).name).join(" · ")}</p>
        <div className="t-big t-gold row" style={{ justifyContent: "center", gap: 10 }}><PixelIcon name="mark" size={22}/>{total.toLocaleString()}</div>
        <p className="t-dim" style={{ margin: 0, textAlign: "center" }}>
          {set ? "ALL THREE GIFTS, BROUGHT TOGETHER. THE STAR STOPS OVER YOUR VAULT."
               : `ONE OF THE THREE GIFTS. ${RELICS[found[0].set].firstBonus.toLocaleString()} FOR EACH, THE FIRST TIME; ${RELICS[found[0].set].setBonus.toLocaleString()} MORE FOR ALL THREE.`}
        </p>
      </>
    );
  }
  if (r.kind === "tome") {
    const t = TOME_BY_ID[r.id];
    if (!t) return null;
    const top = Math.max(...t.pages.map(p => p.tier));
    return (
      <>
        <div style={{ display: "grid", placeItems: "center" }}><TomeCover tome={t} scale={4}/></div>
        <p className="t-title" style={{ margin: 0, textAlign: "center" }}>{t.name}</p>
        <p className="t-dim" style={{ margin: 0, textAlign: "center" }}>
          {t.pages.length} PAGES TO COPY, UP TO <span style={{ color: RARITY[top].c }}>{RARITY[top].n}</span>.<br/>OPEN IT AT THE SCRIBE'S DESK.
        </p>
      </>
    );
  }
  if (r.kind === "event") {
    return (
      <>
        <div className="row" style={{ justifyContent: "center", gap: 8, alignItems: "flex-end", minHeight: 80 }} aria-hidden>
          {[3, 7, 11].map(i => <Sprite key={i + (giftsIn ? "p" : "")} make={() => present(i)} dep={i + (giftsIn ? "p" : "")} scale={2}/>)}
        </div>
        <div className="t-title" style={{ textAlign: "center", color: "#d8584e" }}>{r.name}</div>
        <ul className="t-dim" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6, textAlign: "center" }}>
          <li>ONE CHEST IN THREE HE GIVES IS A PRESENT.</li>
          <li>EVERY PRESENT HOLDS A FROST COIN, MADE ONLY NOW.</li>
          <li>SOME HOLD THE WINTER ALMANAC, A TITLE, OR FROSTFALL.</li>
          <li>THE BETTER YOUR SCROLLS, THE BETTER THE PRESENT.</li>
        </ul>
      </>
    );
  }
  if (r.kind === "fx") {
    const f = PROFILE_FX[r.id];
    if (!f) return null;
    return (
      <>
        <div style={{ border: "2px solid #000" }}><PixelBanner frame={g.frame} fx={r.id} height={96}/></div>
        <div className="t-title" style={{ textAlign: "center", color: "#a8d8ff" }}>{f.label.toUpperCase()}</div>
        <p className="t-dim" style={{ margin: 0, textAlign: "center" }}>{f.desc.toUpperCase()} EVERYONE WHO LOOKS YOU UP WILL SEE IT.</p>
      </>
    );
  }
  if (r.kind === "marks") {
    return (
      <>
        <div className="t-big t-gold row" style={{ justifyContent: "center", gap: 10 }}><PixelIcon name="mark" size={22}/>{r.n.toLocaleString()}</div>
        <p className="t-dim" style={{ margin: 0, textAlign: "center" }}>SPEND THEM AT THE FORGE, THE DESK, OR HIS STALL.</p>
      </>
    );
  }
  return null;
}

const HEADS = {
  fx:    ["A PROFILE EFFECT", "IT WAS IN THE PRESENT"],
  well:  ["A DEEPER WELL", "IT SITS ON YOUR DESK NOW"],
  title: ["A NEW TITLE", "HE PUSHED IT THROUGH THE GAP"],
  frame: ["A NEW BANNER", "HE PUSHED IT THROUGH THE GAP"],
  level: ["LEVEL UP", ""],
  marks: ["A POUCH OF MARKS", "HE PUSHED IT THROUGH THE GAP"],
  daily: ["TODAY'S GIFT", ""],
  signs: ["A NEW STAR SIGN", "THE SKY PAYS ITS DUES"],
  relics: ["A GIFT OF THE MAGI", "A KING'S OFFERING"],
  auction: ["FROM THE BACK ROOM", "THE HAMMER FELL"],
  sets: ["A SET COMPLETE", "EVERY RARITY OF IT"],
  tome:  ["A NEW TOME", "IT WAS IN THE CHEST"],
  event: ["LIMITED TIME EVENT", ""],
};
const COLOUR = { event: "#d8584e", fx: "#a8d8ff", well: "#80c0ff", title: "#c080ff", frame: "#e0b860", level: "#8fd4b4", marks: "#e0b860", daily: "#8fd4b4", signs: "#8fd4e0", relics: "#ffd98a", auction: "#e0b860", sets: "#9fe0d0", tome: "#c080ff" };

function Card({ r, onClose }) {
  const g = useGame();
  const btn = useRef(null);
  useEffect(() => {
    btn.current?.focus();
    const key = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const [head0, sub0] = HEADS[r.kind];
  const sub = r.kind === "signs" && r.signs.length > 1 ? "THE SKY PAYS WHAT IT OWES" : sub0;
  const head = r.kind === "relics" && r.relics.some(b => b.set) ? "THE MAGI'S GIFTS" : r.kind === "daily" ? `DAY ${((r.streak - 1) % DAILY.chestEvery) + 1}` : r.kind === "signs" && r.signs.length > 1 ? "NEW STAR SIGNS" : head0;
  const subline = r.from === "level" ? "" : r.from === "chest" ? "IT WAS IN THE PRESENT"
                : r.kind === "daily" && g.event ? `A GIFT FOR ${g.event.name}` : r.kind === "event" ? eventLeft(r.to) : r.kind === "relics" && r.relics.some(b => b.set) ? "THE SET IS WHOLE" : sub;
  // something wearable can be put on from here
  const wear = r.kind === "title" ? { on: g.selectedTitle === r.label, go: () => g.setSelectedTitle(r.label) }
             : r.kind === "frame" ? { on: g.frame === r.id, go: () => g.setFrame(r.id) }
             : r.kind === "fx" ? { on: g.profileFx === r.id, go: () => g.setProfileFx(r.id) } : null;

  return (
    <div className="veil appear" style={{ zIndex: 650 }} onClick={onClose}>
      <div className="panel panel-hi sheet rise" role="alertdialog" aria-modal="true" aria-labelledby="rw-h" aria-describedby="rw-b"
           style={{ position: "relative", padding: 16, borderColor: COLOUR[r.kind], overflow: "visible" }} onClick={e => e.stopPropagation()}>
        <Burst colour={COLOUR[r.kind]}/>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div className="row" style={{ justifyContent: "center", gap: 8, color: COLOUR[r.kind] }}>
            <PixelIcon name="spark" size={11}/><span id="rw-h" className="t-title" style={{ color: "inherit" }}>{head}</span><PixelIcon name="spark" size={11}/>
          </div>
          {subline && <div className="t-label" style={{ marginTop: 4 }}>{subline}</div>}
        </div>
        <div id="rw-b" style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}><Body r={r}/></div>
        <div style={{ display: "flex", gap: 12 }}>
          {wear && !wear.on && <button className="btn" style={{ flex: 1 }} onClick={() => { wear.go(); feel("tap"); onClose(); }}>WEAR IT</button>}
          <button ref={btn} className="btn btn-gold" style={{ flex: 1 }} onClick={onClose}>{wear?.on ? "WEARING IT" : "GOOD"}</button>
        </div>
      </div>
    </div>
  );
}

export function RewardHost({ children }) {
  const [queue, setQueue] = useState([]);
  const celebrate = useCallback(r => {
    setQueue(q => (q.length > 8 ? q : [...q, r]));
  }, []);
  const current = queue[0];
  useEffect(() => { if (current) feel(current.kind === "level" ? "reveal" : "gift"); }, [current]);
  const close = useCallback(() => setQueue(q => q.slice(1)), []);
  return (
    <Ctx.Provider value={celebrate}>
      {children}
      {current && <Card key={queue.length + ":" + current.kind} r={current} onClose={close}/>}
    </Ctx.Provider>
  );
}

/* What the server's gift descriptor (server/game.js describeReward) is, as a reward. */
export function giftToReward(what) {
  if (what.type === "title") return { kind: "title", label: PREMIUM_TITLES.find(t => t.id === what.id)?.label || what.name, from: "gift" };
  if (what.type === "frame") return { kind: "frame", id: what.id, from: "gift" };
  if (what.type === "marks") return { kind: "marks", n: what.n };
  return null;
}
