import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { METALS, RARITIES } from "../lib/data.js";
import { BOARD } from "../../shared/tuning.js";
import { useSocial } from "../state/useSocial.js";
import { ProfileCard } from "../screens/Friends.jsx";

/* ─── THE NOTICE BOARD ────────────────────────────────────────────────────
 * Pinned up by the tavern's door: what players want, what they have to
 * spare, and anything else worth a few words. Yours at the top of the
 * form; tap a name to see their profile (and their showcase). The server
 * keeps the rules (server/board.js). */

const KINDS = { wanted: { label: "WANTED", col: "#e0b860" }, offering: { label: "OFFERING", col: "#8fd49a" }, notice: { label: "NOTICE", col: "#a9b3c8" } };
const ago = ms => {
  const m = Math.floor(ms / 60000);
  return m < 1 ? "JUST NOW" : m < 60 ? `${m}M AGO` : m < 1440 ? `${Math.floor(m / 60)}H AGO` : `${Math.floor(m / 1440)}D AGO`;
};

export default function Board() {
  const g = useGame(), ui = useUi(), soc = useSocial(g.api, true);
  const [list, setList] = useState(null), [err, setErr] = useState(null), [writing, setWriting] = useState(false);
  const open = g.level >= BOARD.minLevel;
  // through a ref: every act brings a new game state, and a load that
  // changed with it would fetch again, and again, forever
  const live = useRef(g); live.current = g;
  const load = useCallback(() => live.current.act("board").then(r => { setList(r.list); setErr(null); }).catch(e => setErr(e.message)), []);
  useEffect(() => { if (open) load(); }, [open, load]);

  if (!open) return (
    <section className="panel" style={{ padding: 16, display: "grid", gap: 8, textAlign: "center" }}>
      <h2 className="t-title" style={{ margin: 0 }}>THE NOTICE BOARD</h2>
      <p className="t-dim" style={{ margin: 0 }}>THE BOARD IS FOR LEVEL {BOARD.minLevel} AND UP. COME BACK WITH A FEW MORE SEALS BEHIND YOU.</p>
    </section>
  );

  const mine = (list || []).find(n => n.mine);
  const takeDown = async () => {
    if (!(await ui.confirm({ title: "TAKE IT DOWN?", body: "YOUR NOTICE COMES OFF THE BOARD.", yes: "TAKE IT DOWN" }))) return;
    try { await g.act("unpost"); feel("tap"); load(); } catch (e) { ui.toast(e.message, "bad"); }
  };
  const report = async n => {
    if (!(await ui.confirm({ title: "REPORT THIS NOTICE?", body: "FOR WHAT SHOULDN'T BE ON THE BOARD. THREE REPORTS TAKE IT DOWN.", yes: "REPORT" }))) return;
    try { await g.act("report", { noticeId: n.id }); ui.toast("REPORTED. THANK YOU", "good"); } catch (e) { ui.toast(e.message, "bad"); }
  };

  return (
    <section className="panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }} aria-label="Notice board">
      <div className="between">
        <h2 className="t-title" style={{ margin: 0 }}>THE NOTICE BOARD</h2>
        <button className="btn btn-gold" style={{ minHeight: 40, padding: "0 12px" }} onClick={() => setWriting(v => !v)}>
          {writing ? "CANCEL" : mine ? "REPLACE YOURS" : "PIN A NOTICE"}
        </button>
      </div>
      {writing && <Write g={g} ui={ui} replacing={!!mine} onDone={() => { setWriting(false); load(); }}/>}
      {err && <p className="t-bad" style={{ margin: 0 }}>{err}</p>}
      {!list && !err && <p className="t-dim" style={{ margin: 0 }}>READING THE BOARD…</p>}
      {list && !list.length && <p className="t-dim" style={{ margin: 0 }}>THE BOARD IS BARE. PIN THE FIRST NOTICE.</p>}
      {(list || []).map(n => <Notice key={n.id} n={n} onName={() => soc.view(n.by)} onDown={takeDown} onReport={() => report(n)}/>)}
      <p className="t-label" style={{ margin: 0 }}>ONE NOTICE EACH, UP {BOARD.days} DAYS. NO LINKS. TAP A NAME TO SEE THEIR PROFILE.</p>
      {soc.viewing && <ProfileCard soc={soc}/>}
    </section>
  );
}

function Notice({ n, onName, onDown, onReport }) {
  const k = KINDS[n.kind] || KINDS.notice, m = n.metal != null ? METALS[n.metal] : null, r = n.rarity != null ? RARITIES[n.rarity] : null;
  return (
    <article className="tile" style={{ display: "grid", gap: 6, padding: 10, textAlign: "left", borderTopColor: k.col, alignItems: "start" }}
             aria-label={`${k.label} from ${n.by}${m ? `: ${r.name} ${m.name}` : ""}. ${n.text}`}>
      <div className="between" style={{ gap: 6 }}>
        <span style={{ color: k.col }}>{k.label}{m && <span className="t-label">&nbsp;·&nbsp;<span style={{ color: r.color }}>{r.name.toUpperCase()}</span> <span style={{ color: m.hl }}>{m.name.toUpperCase()}</span></span>}</span>
        <span className="t-label">{ago(Date.now() - n.at)}</span>
      </div>
      <p style={{ margin: 0, overflowWrap: "anywhere", textTransform: "uppercase", lineHeight: 1.5 }}>{n.text}</p>
      <div className="between" style={{ gap: 6 }}>
        {n.mine ? <span className="t-good">YOURS</span>
          : <button className="chip" style={{ minHeight: 32 }} onClick={onName} aria-label={`See ${n.by}'s profile`}>{n.by.toUpperCase()}</button>}
        {n.mine ? <button className="btn" style={{ minHeight: 32, padding: "0 10px" }} onClick={onDown}>TAKE DOWN</button>
          : <button className="btn" style={{ minHeight: 32, padding: "0 10px" }} onClick={onReport} aria-label={`Report the notice from ${n.by}`}>REPORT</button>}
      </div>
    </article>
  );
}

/* Writing one: what kind, a coin if it's about one, a few words. */
function Write({ g, ui, replacing, onDone }) {
  const [kind, setKind] = useState("wanted"), [about, setAbout] = useState(true), [metal, setMetal] = useState(3), [rarity, setRarity] = useState(3);
  const [text, setText] = useState(""), [busy, setBusy] = useState(false);
  const go = async () => {
    if (replacing && !(await ui.confirm({ title: "REPLACE YOUR NOTICE?", body: "ONE EACH: THIS TAKES THE OLD ONE DOWN.", yes: "REPLACE" }))) return;
    setBusy(true);
    try {
      await g.act("post", { kind, text, ...(about ? { metal, rarity } : {}) });
      feel("coin"); ui.toast("PINNED TO THE BOARD", "good"); onDone();
    } catch (e) { ui.toast(e.message, "bad"); feel("error"); }
    setBusy(false);
  };
  return (
    <div className="panel" style={{ padding: 10, display: "grid", gap: 10, background: "var(--stone-1)" }}>
      <div className="seg" role="radiogroup" aria-label="Kind of notice">
        {Object.entries(KINDS).map(([id, k]) => <button key={id} role="radio" aria-checked={kind === id} aria-pressed={kind === id} onClick={() => setKind(id)}>{k.label}</button>)}
      </div>
      <label className="row" style={{ gap: 8 }}>
        <input type="checkbox" checked={about} onChange={e => setAbout(e.target.checked)}/>
        <span className="t-label">ABOUT A COIN</span>
      </label>
      {about && (
        <div className="row" style={{ gap: 6 }}>
          <select className="field" aria-label="Metal" value={metal} onChange={e => setMetal(+e.target.value)} style={{ flex: 1, minWidth: 0 }}>
            {METALS.map((m, i) => <option key={m.name} value={i}>{m.name.toUpperCase()}</option>)}
          </select>
          <select className="field" aria-label="Rarity" value={rarity} onChange={e => setRarity(+e.target.value)} style={{ flex: 1, minWidth: 0 }}>
            {RARITIES.map((r, i) => <option key={r.name} value={i}>{r.name.toUpperCase()}</option>)}
          </select>
        </div>
      )}
      <textarea className="field" rows={3} maxLength={BOARD.maxChars} value={text} onChange={e => setText(e.target.value)} aria-label="Your notice"
                placeholder={kind === "wanted" ? "WHAT YOU'RE AFTER, WHAT YOU'D PAY…" : kind === "offering" ? "WHAT YOU HAVE SPARE…" : "A FEW WORDS…"}
                style={{ resize: "vertical", textTransform: "uppercase" }}/>
      <span className="t-label" style={{ textAlign: "right" }}>{text.length} / {BOARD.maxChars}</span>
      <button className="btn btn-gold" disabled={busy || !text.trim()} onClick={go}>PIN IT UP</button>
    </div>
  );
}
