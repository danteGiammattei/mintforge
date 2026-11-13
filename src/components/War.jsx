import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { coinRarity } from "../lib/coin.js";
import { hydrate, matterOf } from "../lib/coinview.js";
import { RARITIES } from "../lib/data.js";
import { CARD_W, CARD_H, cardImage, cardName, loadCards } from "../lib/cards.js";
import CoinCanvas from "./CoinCanvas.jsx";
import { CoinTile } from "../screens/Vault.jsx";

/* ─── WAR ─────────────────────────────────────────────────────────────────
 * Two friends at one table. Each stakes a coin; the friend's must be at
 * least as rare. Both flip; high card takes both coins, aces high. A tie
 * is war: three face down, one up, again. The server deals (server/war.js)
 * and nothing is shown until both have flipped. */

const SEEN_KEY = "mintforge:war-seen";
const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; } };
const writeSeen = ids => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-30))); } catch { /* fine */ } };
const clock = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const coinLine = c => `${RARITIES[coinRarity(c)].name} ${matterOf(c).name}`.toUpperCase();

/* ms left on a server countdown, ticking down here between polls */
function useLeft(ms) {
  const [at, setAt] = useState(() => ({ ms, t: Date.now() }));
  const [, tick] = useState(0);
  useEffect(() => { setAt({ ms, t: Date.now() }); }, [ms]);
  useEffect(() => { const i = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(i); }, []);
  return ms == null ? null : Math.max(0, at.ms - (Date.now() - at.t));
}

/* A card. With `flip`, it turns over as it arrives: its back narrows to
 * an edge, then its face widens out (columns gathered whole, nothing
 * smoothed), nine frames at 18 a second. `delay` holds it face down
 * first, so two cards can turn one after the other. */
const FLIP = [96, 72, 48, 24, 6, 24, 48, 72, 96];
const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
function Card({ n, fresh, ready, flip = false, delay = 0 }) {
  const ref = useRef();
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const g = cv.getContext("2d");
    g.imageSmoothingEnabled = false;
    const paint = (src, w) => {
      g.clearRect(0, 0, CARD_W, CARD_H);
      const img = cardImage(src), sw = img.width, x0 = Math.round((CARD_W - w) / 2);
      if (w >= CARD_W) { g.drawImage(img, 0, 0, CARD_W, CARD_H); return; }
      for (let i = 0; i < w; i++) g.drawImage(img, Math.floor(((i + 0.5) * sw) / w), 0, 1, img.height, x0 + i, 0, 1, CARD_H);
    };
    if (!flip || n == null || still()) { paint(n == null ? "back" : n, CARD_W); return; }
    paint("back", CARD_W);
    let i = 0, t = null;
    const step = () => {
      paint(i < 5 ? "back" : n, FLIP[i]);
      if (++i < FLIP.length) t = setTimeout(step, 55);
    };
    t = setTimeout(step, delay);
    return () => clearTimeout(t);
  }, [n, ready, flip, delay]);
  return <canvas ref={ref} width={CARD_W} height={CARD_H} role="img" aria-label={n == null ? "A card, face down" : cardName(n)}
                 style={{ display: "block", width: CARD_W, height: CARD_H, imageRendering: "pixelated", animation: fresh ? "cardDeal .32s steps(4) both" : undefined }}/>;
}

/* a card face up with `down` cards fanned beneath it, or a face-down pile */
function Stack({ up, down = 0, fresh, ready, delay = 0 }) {
  const fan = 8;
  return (
    <div style={{ position: "relative", width: CARD_W + down * fan, height: CARD_H, flexShrink: 0 }}>
      {Array.from({ length: down }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: i * fan, top: 0 }}><Card n={null} ready={ready} fresh={fresh}/></div>
      ))}
      <div style={{ position: "absolute", left: down * fan, top: 0 }}><Card n={up} ready={ready} fresh={fresh} flip={fresh} delay={delay + 320}/></div>
    </div>
  );
}

/* A fan of face-down cards, low at the ends and high in the middle (whole
 * pixels, nothing turned or scaled). Yours are buttons; theirs show only
 * their tops, across the table. */
const ARC = [8, 4, 1, 0, 1, 4, 8, 13, 19];
function Fan({ count, step, chosen, played, onChoose, ready, theirs, label }) {
  const mid = (count - 1) / 2;
  const lift = i => (i === played ? (theirs ? 14 : -18) : i === chosen ? -10 : 0);
  const arc = i => ARC[Math.round(Math.abs(i - mid))] * (theirs ? -1 : 1);
  const w = CARD_W + step * (count - 1);
  return (
    <div role={theirs ? "img" : "group"} aria-label={label}
         style={{ position: "relative", width: w, maxWidth: "100%", height: theirs ? 72 : CARD_H + 30, margin: "0 auto", overflow: theirs ? "hidden" : "visible" }}>
      {Array.from({ length: count }, (_, i) => {
        const y = (theirs ? -64 : 14) + arc(i) + lift(i);
        const dim = played != null && i !== played;
        const card = <Card n={null} ready={ready}/>;
        const style = { position: "absolute", left: i * step, top: y, filter: dim ? "brightness(.5)" : "none", transition: "top .12s steps(2)", padding: 0, border: 0, background: "none" };
        return theirs ? <div key={i} style={style} aria-hidden>{card}</div> : (
          <button key={i} style={{ ...style, cursor: played == null ? "pointer" : "default", outline: i === chosen && played == null ? "2px solid var(--candle)" : "none", outlineOffset: -2 }}
                  disabled={played != null} aria-pressed={i === chosen} aria-label={`Card ${i + 1} of ${count}, face down`}
                  onClick={() => onChoose(i)}>{card}</button>
        );
      })}
    </div>
  );
}

function Felt({ t, ready }) {
  const g = useGame(), ui = useUi();
  const [chosen, setChosen] = useState(null);
  const [sending, setSending] = useState(false);
  const last = t.log[t.log.length - 1];
  const tie = last?.result === "tie";
  const idle = useLeft(t.idleIn);
  useEffect(() => { setChosen(null); }, [t.round]);

  const play = async (pick = chosen) => {
    if (pick == null || t.youFlipped) return;
    setSending(true); feel("offer");
    try { await g.war.move("flip", { tableId: t.id, pick }); }
    catch (e) { ui.toast(e.message, "bad"); }
    finally { setSending(false); }
  };
  // tap a card to draw it out of the fan; tap it again to play it
  const choose = i => { if (i === chosen) play(i); else { feel("tap"); setChosen(i); } };

  const said = useRef(t.log.length);
  useEffect(() => {
    if (t.log.length > said.current && last) ui.say(`YOU ${cardName(last.mine)}, ${t.other} ${cardName(last.theirs)}. ${tie ? "WAR." : ""}`);
    said.current = t.log.length;
  }, [t.log.length, last, tie, t.other, ui]);

  const slot = <div style={{ width: CARD_W, height: CARD_H, border: "2px dashed var(--line)" }} aria-hidden/>;
  const played = t.youFlipped ? t.yourPick : null;

  return (
    <section className="panel" aria-label={`War with ${t.other}`} style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, background: "var(--felt)" }}>
      <div className="between" style={{ gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div className="t-title t-plain" style={{ overflowWrap: "anywhere" }}>{t.other}</div>
          <div className="t-label" style={{ color: t.theyFlipped ? "var(--candle)" : "var(--mute)" }}>{t.theyFlipped ? "HAS PICKED A CARD" : "CHOOSING…"}</div>
        </div>
        {t.theirs && <CoinCanvas coin={hydrate(t.theirs)} size={64}/>}
      </div>
      <Fan theirs count={t.fan} step={26} played={t.theirPick} ready={ready} label={`${t.other}'s cards, face down`}/>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 12 }} aria-live="polite">
        {last ? <Stack key={"t" + t.log.length} up={last.theirs} down={last.down} fresh ready={ready}/> : slot}
        {last ? <Stack key={"m" + t.log.length} up={last.mine} down={last.down} fresh ready={ready} delay={500}/> : slot}
      </div>
      <div style={{ textAlign: "center", minHeight: 20 }}>
        {tie ? <><span className="t-big" style={{ color: "#ff7060" }}>WAR!</span><div className="t-label">THREE GO DOWN. PICK AGAIN.</div></>
             : last ? <span className="t-label">{last.result === "won" ? "YOURS WAS HIGHER" : "THEIRS WAS HIGHER"}</span>
             : <span className="t-dim">PICK A CARD. HIGH CARD TAKES BOTH COINS.</span>}
      </div>

      <Fan count={t.fan} step={34} chosen={chosen} played={played} onChoose={choose} ready={ready} label="Your cards, face down"/>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {t.mine && <CoinCanvas coin={hydrate(t.mine)} size={64}/>}
        <button className="btn btn-gold" style={{ flex: 1, minHeight: 52 }} disabled={t.youFlipped || sending || chosen == null} onClick={() => play()}>
          {t.youFlipped ? `WAITING FOR ${t.other}` : chosen == null ? "TAP A CARD" : tie ? "PLAY IT FOR WAR" : "PLAY THIS CARD"}
        </button>
      </div>
      {idle != null && idle < 60_000 && <p className="t-label" style={{ margin: 0, textAlign: "center" }}>
        IF NOBODY PLAYS IN {clock(idle)} THE TABLE IS CALLED OFF AND BOTH COINS GO HOME</p>}
    </section>
  );
}

const VOID_LINE = {
  declined:   (r) => `${r.other} TURNED YOU DOWN. YOUR COIN IS BACK.`,
  cancelled:  (r) => `${r.other} WITHDREW THE CHALLENGE.`,
  unanswered: (r) => r.role === "host" ? `NO ANSWER FROM ${r.other}. YOUR COIN IS BACK.` : `THE CHALLENGE FROM ${r.other} LAPSED.`,
  abandoned:  () => "THE TABLE WENT QUIET. BOTH COINS WENT HOME.",
  deck:       () => "THE DECK RAN OUT. BOTH COINS WENT HOME.",
};

function Result({ r, ready, onDone }) {
  const last = r.log[r.log.length - 1];
  const won = r.outcome === "won", done = r.outcome === "won" || r.outcome === "lost";
  const wars = r.log.filter(e => e.war).length;
  useEffect(() => { if (done) feel(won ? "win" : "lose"); }, [done, won]);
  return (
    <section className="panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12, alignItems: "center", textAlign: "center", background: done ? "var(--felt)" : undefined }}>
      {done ? (
        <>
          <div className="t-big" style={{ color: won ? "var(--candle)" : "var(--mute)" }}>{won ? "YOU WIN" : `${r.other} WINS`}</div>
          {last && (
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end", justifyContent: "center", flexWrap: "wrap" }}>
              <figure style={{ margin: 0 }}><Card n={last.mine} ready={ready} flip delay={250}/><figcaption className="t-label">YOU</figcaption></figure>
              <figure style={{ margin: 0 }}><Card n={last.theirs} ready={ready} flip delay={750}/><figcaption className="t-label t-plain">{r.other}</figcaption></figure>
            </div>
          )}
          {wars > 0 && <div className="t-label">AFTER {wars === 1 ? "A WAR" : `${wars} WARS`}</div>}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            {[r.mine, r.theirs].filter(Boolean).map(c => <CoinCanvas key={c.id} coin={hydrate(c)} size={64}/>)}
          </div>
          <p className="t-dim" style={{ margin: 0 }}>{won ? `BOTH COINS ARE IN YOUR VAULT, ${coinLine(r.theirs)} INCLUDED.` : `${r.other} TAKES YOUR ${coinLine(r.mine)}.`}</p>
        </>
      ) : <p className="t-dim" style={{ margin: 0 }}>{(VOID_LINE[r.outcome] || (() => "THE TABLE IS CLOSED."))(r)}</p>}
      <button autoFocus className="btn btn-gold" style={{ minWidth: 200 }} onClick={onDone}>OK</button>
    </section>
  );
}

function Waiting({ t }) {
  const g = useGame(), ui = useUi();
  const left = useLeft(t.expiresIn);
  const cancel = async () => { try { await g.war.move("cancel", { tableId: t.id }); } catch (e) { ui.toast(e.message, "bad"); } };
  return (
    <section className="panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12, alignItems: "center", textAlign: "center" }}>
      <CoinCanvas coin={hydrate(t.mine)} size={64}/>
      <div className="t-title t-plain">WAITING FOR {t.other}</div>
      <p className="t-dim" style={{ margin: 0 }}>THEY NEED THE GAME OPEN TO SEE IT. {left != null && `THE CHALLENGE STANDS FOR ${clock(left)}.`}</p>
      <p className="t-label" style={{ margin: 0 }}>YOUR {coinLine(t.mine)} IS ON THE TABLE</p>
      <button className="btn btn-ghost" onClick={cancel}>WITHDRAW</button>
    </section>
  );
}

function Invite({ inv }) {
  const g = useGame(), ui = useUi();
  const [pick, setPick] = useState(null);
  const left = useLeft(inv.expiresIn);
  const need = coinRarity(inv.theirs);
  const eligible = g.coins.filter(c => !c.locked && coinRarity(c) >= need);
  const sit = async () => {
    const c = g.coins.find(x => x.id === pick); if (!c) return;
    if ((c.shiny || coinRarity(c) >= 3) && !(await ui.confirm({
      title: "STAKE THIS ONE?", body: `YOUR ${c.shiny ? "SHINY " : ""}${coinLine(c)} AGAINST ${inv.other}'S ${coinLine(inv.theirs)}. HIGH CARD TAKES BOTH.`,
      yes: "STAKE IT", tone: "danger" }))) return;
    feel("offer");
    try { await g.war.move("join", { tableId: inv.id, coinId: c.id }); } catch (e) { ui.toast(e.message, "bad"); }
  };
  const decline = async () => { try { await g.war.move("decline", { tableId: inv.id }); } catch (e) { ui.toast(e.message, "bad"); } };
  return (
    <section className="panel" aria-label={`Challenge from ${inv.other}`} style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="between" style={{ gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="t-title t-plain" style={{ overflowWrap: "anywhere" }}>{inv.other} CHALLENGES YOU</div>
          <div className="t-label">{coinLine(inv.theirs)} ON THE TABLE{left != null && ` · ${clock(left)} LEFT`}</div>
        </div>
        <CoinCanvas coin={hydrate(inv.theirs)} size={64}/>
      </div>
      {eligible.length ? (
        <>
          <p className="t-label" style={{ margin: 0 }}>STAKE A COIN AT LEAST AS RARE ({RARITIES[need].name.toUpperCase()} OR BETTER)</p>
          <div className="grid-coins coin-scroll" style={{ maxHeight: 260 }}>
            {eligible.map(c => <CoinTile key={c.id} coin={c} selected={pick === c.id} onClick={() => { feel("tap"); setPick(p => (p === c.id ? null : c.id)); }}/>)}
          </div>
        </>
      ) : <p className="t-dim" style={{ margin: 0 }}>YOU HAVE NO UNLOCKED COIN AS RARE AS THAT.</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={decline}>DECLINE</button>
        <button className="btn btn-gold" style={{ flex: 1 }} disabled={!pick} onClick={sit}>SIT DOWN</button>
      </div>
    </section>
  );
}

function Challenge() {
  const g = useGame(), ui = useUi();
  const [friends, setFriends] = useState(null);
  const [who, setWho] = useState(null);
  const [pick, setPick] = useState(null);
  useEffect(() => { g.api.listFriends().then(r => setFriends(r.friends || [])).catch(() => setFriends([])); }, [g.api]);
  const free = useMemo(() => g.coins.filter(c => !c.locked), [g.coins]);
  const send = async () => {
    const c = g.coins.find(x => x.id === pick); if (!c || !who) return;
    if ((c.shiny || coinRarity(c) >= 3) && !(await ui.confirm({
      title: "STAKE THIS ONE?", body: `YOUR ${c.shiny ? "SHINY " : ""}${coinLine(c)}. IF ${who} TAKES THE CHALLENGE AND WINS, IT IS THEIRS.`,
      yes: "STAKE IT", tone: "danger" }))) return;
    feel("offer");
    try { await g.war.move("invite", { friend: who, coinId: c.id }); setPick(null); } catch (e) { ui.toast(e.message, "bad"); }
  };
  return (
    <section className="panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      <p className="t-dim" style={{ margin: 0 }}>CHALLENGE A FRIEND. YOU EACH STAKE A COIN, THEIRS AT LEAST AS RARE AS YOURS. HIGH CARD TAKES BOTH. ACES HIGH. A TIE IS WAR.</p>
      <div>
        <div className="t-label" style={{ marginBottom: 8 }}>WHO</div>
        {friends == null ? <span className="t-label">…</span> : friends.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {friends.map(f => <button key={f.id} className="chip t-plain" aria-pressed={who === f.username} onClick={() => setWho(w => (w === f.username ? null : f.username))}>{f.username}</button>)}
          </div>
        ) : <span className="t-dim">ADD A FRIEND FIRST, FROM YOUR PROFILE.</span>}
      </div>
      <div>
        <div className="t-label" style={{ marginBottom: 8 }}>YOUR STAKE</div>
        {free.length ? (
          <div className="grid-coins coin-scroll" style={{ maxHeight: 260 }}>
            {free.map(c => <CoinTile key={c.id} coin={c} selected={pick === c.id} onClick={() => { feel("tap"); setPick(p => (p === c.id ? null : c.id)); }}/>)}
          </div>
        ) : <span className="t-dim">NO UNLOCKED COINS TO STAKE.</span>}
      </div>
      <button className="btn btn-gold" disabled={!who || !pick} onClick={send}>{who ? `CHALLENGE ${who}` : "CHALLENGE"}</button>
    </section>
  );
}

export default function War() {
  const g = useGame(), w = g.war;
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  useEffect(() => { loadCards().then(() => setReady(true)); }, []);
  const mute = r => (r.outcome === "cancelled" && r.role === "host") || (r.outcome === "declined" && r.role === "guest");
  const result = w.recent.find(r => !seen.includes(r.id) && !mute(r));
  const dismiss = id => setSeen(s => { const n = [...s, id]; writeSeen(n); return n; });

  if (w.table?.status === "playing") return <Felt t={w.table} ready={ready}/>;
  if (result) return <Result r={result} ready={ready} onDone={() => dismiss(result.id)}/>;
  return (
    <>
      {w.invites.map(inv => <Invite key={inv.id} inv={inv}/>)}
      {w.table?.status === "invited" ? <Waiting t={w.table}/> : <Challenge/>}
      {w.error && <p className="t-label" style={{ margin: 0 }}>THE TABLE IS HARD TO HEAR: {w.error}</p>}
    </>
  );
}
