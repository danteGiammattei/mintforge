import { useMemo, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { coinRarity, coinValue } from "../lib/coin.js";
import { matterOf, coinName } from "../lib/coinview.js";
import { METALS, RARITIES } from "../lib/data.js";
import { FUSE, ASTRAL } from "../../shared/tuning.js";
import { MAX_RARITY } from "../../shared/economy.js";
import CoinCanvas from "../components/CoinCanvas.jsx";
import Forge from "../components/Forge.jsx";
import PixelIcon from "../ui/PixelIcon.jsx";
import { CoinTile } from "./Vault.jsx";

/* ─── THE FORGE ───────────────────────────────────────────────────────────
 * Its own room now. FUSE: three coins of one metal and one rarity go into
 * the fire and one comes out a rarity finer (server/game.js fuse). WORK A
 * COIN: pick one to shine, restrike or name (components/Forge.jsx). The
 * vault's FORGE button sends a coin here, already on the bench. */

// a coin sent from the vault, picked up when this room opens
let waiting = null;
export const sendToForge = id => { waiting = id; };

// the one to keep may be locked: it is not lost, only lifted
const keepable = c => !c.relic && c.sign == null && c.metalIdx !== ASTRAL.metal && coinRarity(c) < MAX_RARITY;
const fusable = c => keepable(c) && !c.locked;
const feeFor = coins => Math.max(FUSE.minFee, Math.round(coins.reduce((n, c) => n + coinValue(c), 0) * FUSE.feeShare));

export default function ForgeRoom() {
  const g = useGame(), ui = useUi();
  const [view, setView] = useState(() => (waiting ? "work" : "fuse"));
  const [bench, setBench] = useState(() => { const w = waiting; waiting = null; return w; });
  return (
    <div className="page">
      <div className="page-in">
        <div className="between">
          <h1 className="t-big" style={{ margin: 0 }}>FORGE</h1>
          <span className="t-label">{g.coins.length} {g.coins.length === 1 ? "COIN" : "COINS"}</span>
        </div>
        <div className="seg" role="tablist" aria-label="Forge">
          <button role="tab" aria-selected={view === "fuse"} onClick={() => setView("fuse")}>FUSE</button>
          <button role="tab" aria-selected={view === "work"} onClick={() => setView("work")}>WORK A COIN</button>
        </div>
        {view === "fuse" ? <Fuse g={g} ui={ui}/> : (
          <section className="panel" style={{ padding: 12, display: "grid", gap: 10 }}>
            <p className="t-dim" style={{ margin: 0 }}>SHINE IT, STRIKE IT A NEW FACE, OR ENGRAVE A NAME. PICK A COIN.</p>
            {g.coins.length ? (
              <div className="grid-coins">{g.coins.map(c => <CoinTile key={c.id} coin={c} onClick={() => { feel("tap"); setBench(c.id); }}/>)}</div>
            ) : <p className="t-dim" style={{ margin: 0 }}>NOTHING TO WORK. CLEAN A COIN FIRST.</p>}
          </section>
        )}
      </div>
      {bench && g.coins.some(c => c.id === bench) && <Forge coinId={bench} onClose={() => setBench(null)}/>}
    </div>
  );
}

/* Three in, one out. Pick a coin and only its kin (same metal, same
 * rarity) can follow; the groups you have three of are offered first.
 * The right-hand place is optional: put a fourth coin of the same kind
 * there and it is the one that comes out a rarity finer, itself, instead
 * of a new coin. */
function Fuse({ g, ui }) {
  const [ids, setIds] = useState([]), [busy, setBusy] = useState(false), [made, setMade] = useState(null);
  const [keepId, setKeepId] = useState(null), [choosing, setChoosing] = useState(false);
  const pool = useMemo(() => g.coins.filter(fusable), [g.coins]);
  const keepPool = useMemo(() => g.coins.filter(keepable), [g.coins]);
  const picked = ids.map(id => pool.find(c => c.id === id)).filter(Boolean);
  const keep = keepId ? keepPool.find(c => c.id === keepId) || null : null;
  const first = picked[0] || keep;
  const same = c => !first || (c.metalIdx === first.metalIdx && coinRarity(c) === coinRarity(first));
  const kin = choosing ? keepPool.filter(c => same(c) && !ids.includes(c.id)) : pool.filter(c => same(c) && c.id !== keepId);
  // what you have three of, finest first; the named and the shiny go in last
  const groups = useMemo(() => {
    const by = new Map();
    for (const c of pool) { const k = `${c.metalIdx}:${coinRarity(c)}`; by.set(k, [...(by.get(k) || []), c]); }
    return [...by.values()].filter(v => v.length >= FUSE.take)
      .map(v => v.sort((a, b) => (!!a.nick - !!b.nick) || (!!a.shiny - !!b.shiny) || coinValue(a) - coinValue(b)))
      .sort((a, b) => coinRarity(b[0]) - coinRarity(a[0]) || b[0].metalIdx - a[0].metalIdx);
  }, [pool]);
  const toggle = c => {
    setMade(null); feel("tap");
    if (choosing) { setKeepId(c.id); setChoosing(false); return; }
    setIds(p => p.includes(c.id) ? p.filter(x => x !== c.id) : p.length < FUSE.take ? [...p, c.id] : p);
  };
  // the right-hand place: empty makes a new coin; tap it to choose one to keep, tap again to empty it
  const keepTap = () => { setMade(null); feel("tap"); if (keep) { setKeepId(null); setChoosing(false); } else setChoosing(v => !v); };
  const ready = picked.length === FUSE.take, fee = ready ? feeFor(picked) : 0;
  const out = first && { metal: METALS[first.metalIdx], rarity: RARITIES[coinRarity(first) + 1] };

  const go = async () => {
    const special = picked.filter(c => c.nick || c.shiny);
    if (!(await ui.confirm({
      title: "INTO THE FIRE?",
      body: keep
        ? `THREE ${RARITIES[coinRarity(first)].name.toUpperCase()} ${out.metal.name.toUpperCase()} GO INTO THE FIRE. ${coinName(keep)} COMES OUT ${out.rarity.name.toUpperCase()}, ITSELF. ${fee.toLocaleString()} MARKS.${special.length ? " A SHINE OR AN ENGRAVED NAME ON THE THREE DOES NOT SURVIVE IT." : ""} THIS CANNOT BE UNDONE.`
        : `THREE ${RARITIES[coinRarity(first)].name.toUpperCase()} ${out.metal.name.toUpperCase()} BECOME ONE ${out.rarity.name.toUpperCase()}. ${fee.toLocaleString()} MARKS.${special.length ? " A SHINE OR AN ENGRAVED NAME DOES NOT SURVIVE IT." : ""} THIS CANNOT BE UNDONE.`,
      yes: "FUSE",
    }))) return;
    setBusy(true);
    try {
      const r = await g.act("fuse", { coinIds: ids, ...(keep ? { targetId: keep.id } : {}) });
      feel("gift"); setMade(r.coin.id); setIds([]); setKeepId(null); setChoosing(false);
    } catch (e) { ui.toast(e.message, "bad"); feel("error"); }
    setBusy(false);
  };
  const result = made && g.coins.find(c => c.id === made);

  return (
    <section className="panel" style={{ padding: 12, display: "grid", gap: 12 }} aria-label="Fuse">
      <p className="t-dim" style={{ margin: 0 }}>THREE COINS OF ONE METAL AND ONE RARITY GO IN. ONE COMES OUT, A RARITY FINER. PUT A FOURTH ON THE RIGHT TO KEEP IT: THAT ONE COMES OUT FINER INSTEAD OF A NEW COIN.</p>

      {/* the three places, the fire, and what it will make */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr) auto 1.2fr", gap: 6, alignItems: "center" }}>
        {[0, 1, 2].map(i => {
          const c = picked[i];
          return (
            <button key={i} className="tile" style={{ aspectRatio: "1", padding: 4, display: "grid", placeItems: "center" }} disabled={!c || busy}
                    onClick={() => c && toggle(c)} aria-label={c ? `${coinName(c)}, take it out` : "Empty"}>
              {c ? <CoinCanvas coin={c} size={56} aura={false}/> : <span className="t-label">{i + 1}</span>}
            </button>
          );
        })}
        <PixelIcon name="anvil" size={22} style={{ color: ready ? "var(--candle)" : "var(--bone-dim)" }}/>
        <button className="tile" disabled={busy}
             style={{ aspectRatio: "1", display: "grid", placeItems: "center", padding: 4, position: "relative",
                      borderColor: result ? RARITIES[coinRarity(result)].color : choosing ? "var(--candle)" : keep ? out.rarity.color : undefined,
                      borderStyle: !result && !keep ? "dashed" : undefined }}
             onClick={result ? () => setMade(null) : keepTap}
             aria-live="polite"
             aria-label={result ? `Made: ${coinName(result)}` : keep ? `Keeping ${coinName(keep)}; it comes out ${out.rarity.name}. Tap to make a new coin instead`
               : choosing ? "Choosing a coin to keep. Tap to stop" : out ? `Makes one new ${out.rarity.name} ${out.metal.name}. Tap to keep one of yours instead` : "Tap to choose a coin to keep, or leave it for a new coin"}>
          {result ? <CoinCanvas coin={result} size={72}/>
            : keep ? <>
                <CoinCanvas coin={keep} size={56} aura={false}/>
                <span className="t-label" style={{ position: "absolute", bottom: 2, left: 0, right: 0, textAlign: "center", color: out.rarity.color }}>→ {out.rarity.name.toUpperCase()}</span>
              </>
            : choosing ? <span className="t-label" style={{ textAlign: "center", color: "var(--candle)" }}>PICK<br/>ONE<br/>BELOW</span>
            : out ? <span className="t-label" style={{ textAlign: "center" }}>NEW<br/><span style={{ color: out.rarity.color }}>{out.rarity.name.toUpperCase()}</span><br/>{out.metal.name.toUpperCase()}<br/><span className="t-dim">+ KEEP</span></span>
            : <span className="t-label" style={{ textAlign: "center" }}>NEW COIN<br/><span className="t-dim">+ KEEP</span></span>}
        </button>
      </div>
      {result && <p className="t-gold" style={{ margin: 0, textAlign: "center" }}>OUT OF THE FIRE: {coinName(result)} · {RARITIES[coinRarity(result)].name.toUpperCase()} {matterOf(result).name.toUpperCase()}</p>}

      <button className="btn btn-gold" disabled={!ready || busy || fee > g.marks} onClick={go}>
        {ready ? <span className="row" style={{ gap: 6, justifyContent: "center" }}>FUSE · <PixelIcon name="mark" size={11}/>{fee.toLocaleString()}</span> : `PICK ${FUSE.take - picked.length} MORE`}
      </button>

      {!first && !choosing && groups.length > 0 && (
        <>
          <span className="t-label">READY TO FUSE</span>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {groups.map(v => {
              const c = v[0], r = RARITIES[coinRarity(c)];
              return (
                <button key={`${c.metalIdx}:${coinRarity(c)}`} className="chip" onClick={() => { setMade(null); setIds(v.slice(0, FUSE.take).map(x => x.id)); feel("tap"); }}>
                  {v.length}× <span style={{ color: r.color }}>{r.name.toUpperCase()}</span>&nbsp;<span style={{ color: METALS[c.metalIdx].hl }}>{METALS[c.metalIdx].name.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      <span className="t-label" style={choosing ? { color: "var(--candle)" } : undefined}>
        {choosing ? (first ? `PICK THE ${RARITIES[coinRarity(first)].name.toUpperCase()} ${METALS[first.metalIdx].name.toUpperCase()} TO KEEP` : "PICK THE COIN TO KEEP")
          : first ? `ONLY ${RARITIES[coinRarity(first)].name.toUpperCase()} ${METALS[first.metalIdx].name.toUpperCase()} CAN JOIN IT` : "OR PICK ANY COIN"}
      </span>
      {kin.length ? (
        <div className="grid-coins">
          {kin.map(c => <CoinTile key={c.id} coin={c} selected={ids.includes(c.id)} onClick={() => toggle(c)}/>)}
        </div>
      ) : <p className="t-dim" style={{ margin: 0 }}>NOTHING TO FUSE. LOCKED COINS, MYTHICS AND THE COLLECTABLE SETS STAY OUT OF THE FIRE.</p>}
    </section>
  );
}
