import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { feel } from "../lib/feel.js";
import { BRUSH_UPS, BA, FRAMES, PREMIUM_TITLES } from "../lib/data.js";
import { SCRIBE, DAILY, CHESTS } from "../../shared/tuning.js";
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
 *    celebrate({ kind: "brush", level: 2 });
 *    celebrate({ kind: "title", label: "Goldspun", from: "gift" });
 *    celebrate({ kind: "frame", id: "stargazer", from: "gift" });
 *    celebrate({ kind: "level", level: 10, titles: [...], frames: [...] });
 *    celebrate({ kind: "well", level: 1 });
 *    celebrate({ kind: "marks", n: 40 });
 *
 *  The goblin's own gifts never say why they came. Neither does this.
 * ══════════════════════════════════════════════════════════════════════ */

const Ctx = createContext(() => {});
export const useCelebrate = () => useContext(Ctx);

const pct = v => { const p = v * 100; return (Number.isInteger(Math.round(p * 10) / 10) ? Math.round(p) : p.toFixed(1)) + "%"; };
const strength = a => "×" + (a / BA).toFixed(1);

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
  if (r.kind === "brush") {
    const from = BRUSH_UPS[Math.max(0, r.level - 1)], to = BRUSH_UPS[r.level];
    return (
      <>
        <div className="t-title" style={{ textAlign: "center" }}>{to.label.toUpperCase()}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Stat label="CLEANING STRENGTH" from={strength(from.alpha)} to={strength(to.alpha)}/>
          <Stat label="SHINY CHANCE" from={pct(from.shinyChance)} to={pct(to.shinyChance)}/>
        </div>
        <p className="t-dim" style={{ margin: 0, textAlign: "center" }}>
          {to.alpha > from.alpha ? "DIRT COMES OFF FASTER. " : ""}EVERY CHEST YOU OPEN FROM NOW IS MORE LIKELY TO HOLD A SHINY COIN.
        </p>
      </>
    );
  }
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
        <p className="t-dim" style={{ margin: 0, textAlign: "center" }}>{r.from === "gift" ? "HE DOES NOT GIVE THIS TO JUST ANYONE." : "IT IS YOURS TO WEAR."}</p>
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
  brush: ["A BETTER BRUSH", "HE PUSHED IT THROUGH THE GAP"],
  well:  ["A DEEPER WELL", "IT SITS ON YOUR DESK NOW"],
  title: ["A NEW TITLE", "HE PUSHED IT THROUGH THE GAP"],
  frame: ["A NEW BANNER", "HE PUSHED IT THROUGH THE GAP"],
  level: ["LEVEL UP", ""],
  marks: ["A POUCH OF MARKS", "HE PUSHED IT THROUGH THE GAP"],
  daily: ["TODAY'S GIFT", ""],
};
const COLOUR = { brush: "#e0b860", well: "#80c0ff", title: "#c080ff", frame: "#e0b860", level: "#8fd4b4", marks: "#e0b860", daily: "#8fd4b4" };

function Card({ r, onClose }) {
  const g = useGame();
  const btn = useRef(null);
  useEffect(() => {
    btn.current?.focus();
    const key = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const [head0, sub] = HEADS[r.kind];
  const head = r.kind === "daily" ? `DAY ${((r.streak - 1) % DAILY.chestEvery) + 1}` : head0;
  const subline = r.from === "level" ? "" : sub;
  // something wearable can be put on from here
  const wear = r.kind === "title" ? { on: g.selectedTitle === r.label, go: () => g.setSelectedTitle(r.label) }
             : r.kind === "frame" ? { on: g.frame === r.id, go: () => g.setFrame(r.id) } : null;

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
  if (what.type === "brush") return { kind: "brush", level: what.level };
  if (what.type === "title") return { kind: "title", label: PREMIUM_TITLES.find(t => t.id === what.id)?.label || what.name, from: "gift" };
  if (what.type === "frame") return { kind: "frame", id: what.id, from: "gift" };
  if (what.type === "marks") return { kind: "marks", n: what.n };
  return null;
}
