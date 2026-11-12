import { useMemo, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { coinRarity, coinValue } from "../lib/coin.js";
import { METALS, RARITIES } from "../lib/data.js";
import CoinCanvas from "../components/CoinCanvas.jsx";
import Journal from "../components/Journal.jsx";
import { coinName } from "../lib/coinview.js";
import CoinModal from "../components/CoinModal.jsx";
import Forge from "../components/Forge.jsx";
import { FORGE } from "../../shared/tuning.js";
import PixelIcon from "../ui/PixelIcon.jsx";

/* ─── VAULT ───────────────────────────────────────────────────────────────
 * Every clean coin you own. Filter by metal, sort, tap to inspect; SELECT
 * turns taps into a multi-select for selling several at once. Selling is
 * decided by the server — the figures here are what it will pay. */
const SORTS = [
  ["new",    "NEWEST", null],
  ["rarity", "RAREST", (a, b) => coinRarity(b) - coinRarity(a) || b.metalIdx - a.metalIdx],
  ["value",  "VALUE",  (a, b) => coinValue(b) - coinValue(a)],
];

export function CoinTile({ coin, selected, pinned, disabled, onClick, label }) {
  const m = METALS[coin.metalIdx], r = RARITIES[coinRarity(coin)];
  return (
    <button className="tile" aria-pressed={selected ? true : undefined} disabled={disabled} onClick={onClick}
            style={{ borderTopColor: r.color, ...(r.id >= 4 && !selected ? { background: `radial-gradient(circle at 50% 38%, ${r.glow}, transparent 70%), var(--stone-1)` } : {}) }}
            aria-label={label || `${r.name} ${m.name} coin, ${coinName(coin)}${coin.shiny ? ", shiny" : ""}${coin.locked ? ", locked" : ""}`}>
      <CoinCanvas coin={coin} size={64}/>
      <span aria-hidden style={{ color: m.hl, maxWidth: "100%", overflowWrap: "anywhere", textAlign: "center", lineHeight: 1.25 }}>{coinName(coin)}</span>
      <span aria-hidden style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4, color: "var(--candle)" }}>
        {coin.shiny && <PixelIcon name="spark" size={11}/>}
        {coin.locked && <PixelIcon name="lock" size={11}/>}
        {pinned && <PixelIcon name="pin" size={11}/>}
      </span>
    </button>
  );
}

export default function Vault() {
  const g = useGame(), ui = useUi();
  const [filter, setFilter] = useState(-1);
  const [sort, setSort] = useState("new");
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [forging, setForging] = useState(null);
  const [view, setView] = useState("coins");

  const pinnedSet = useMemo(() => new Set(g.showcase.filter(Boolean).map(c => c.id)), [g.showcase]);
  const counts = useMemo(() => METALS.map((_, i) => g.coins.filter(c => c.metalIdx === i).length), [g.coins]);
  const shown = useMemo(() => {
    const list = filter === -1 ? g.coins : g.coins.filter(c => c.metalIdx === filter);
    const cmp = SORTS.find(s => s[0] === sort)?.[2];
    return cmp ? [...list].sort(cmp) : list;
  }, [g.coins, filter, sort]);
  const open = g.coins.find(c => c.id === openId) || null;
  const pickedCoins = g.coins.filter(c => picked.has(c.id) && !c.locked);
  // what a bulk pick may take: never a locked, pinned or named coin
  const chosen = new Set((g.pinnedIds || []).filter(Boolean));     // pinned by hand, not the automatic six
  const spare = shown.filter(c => !c.locked && !chosen.has(c.id) && !c.nick);
  const pickWhere = test => { setPicked(new Set(spare.filter(test).map(c => c.id))); feel("tap"); };
  const pickedTotal = pickedCoins.reduce((s, c) => s + coinValue(c), 0);

  const sell = async (coins) => {
    const total = coins.reduce((s, c) => s + coinValue(c), 0);
    const ok = await ui.confirm({
      title: coins.length === 1 ? "SELL THIS COIN?" : `SELL ${coins.length} COINS?`,
      body: `FOR ${total.toLocaleString()} MARKS. THIS CANNOT BE UNDONE.`, yes: "SELL", tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await g.sell(coins.map(c => c.id));
      feel("sell");
      ui.toast(`SOLD FOR ${r.marks.toLocaleString()} MARKS`);
      setOpenId(null); setPicked(new Set()); setSelecting(false);
    } catch (e) { ui.toast(e.message, "bad"); feel("error"); }
    setBusy(false);
  };

  const tap = coin => {
    if (!selecting) { feel("tap"); setOpenId(coin.id); return; }
    setPicked(prev => { const n = new Set(prev); n.has(coin.id) ? n.delete(coin.id) : n.add(coin.id); return n; });
  };

  return (
    <div className="page">
      <div className="page-in" style={{ paddingBottom: selecting ? 96 : 24 }}>
        <div className="between">
          <h1 className="t-big" style={{ margin: 0 }}>VAULT</h1>
          <div className="row">
            <span className="t-label">{g.coins.length} {g.coins.length === 1 ? "COIN" : "COINS"}</span>
            {g.coins.length > 0 && view === "coins" && (
              <button className={`btn ${selecting ? "btn-gold" : ""}`} aria-pressed={selecting}
                      onClick={() => { setSelecting(s => !s); setPicked(new Set()); }}>{selecting ? "DONE" : "SELECT"}</button>
            )}
          </div>
        </div>

        <div className="seg" role="tablist" aria-label="Vault">
          <button role="tab" aria-selected={view === "coins"} onClick={() => setView("coins")}>COINS</button>
          <button role="tab" aria-selected={view === "journal"} onClick={() => { setView("journal"); setSelecting(false); }}>JOURNAL</button>
        </div>

        {view === "journal" ? <Journal/> : g.coins.length === 0 ? (
          <div className="panel" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="t-title">THE VAULT IS EMPTY</div>
            <p className="t-dim" style={{ margin: 0 }}>
              {g.dusty.length ? "THERE IS A COIN IN YOUR SATCHEL WAITING TO BE BRUSHED."
                : g.chests.length ? "THERE IS A CHEST IN YOUR SATCHEL WAITING TO BE OPENED."
                : "COINS COME OUT OF CHESTS. CHESTS COME FROM THE DOOR."}
            </p>
            <button className="btn btn-gold" onClick={() => g.setTab(g.dusty.length || g.chests.length ? "satchel" : "door")}>
              {g.dusty.length || g.chests.length ? "TO THE SATCHEL" : "TO THE DOOR"}
            </button>
          </div>
        ) : (
          <>
            {g.marks >= FORGE.minCost && !(g.stats.struck > 0) && (
              <p className="panel t-gold" style={{ margin: 0, padding: 12 }}>
                YOU HAVE MARKS TO SPEND. OPEN A COIN AND TAKE IT TO THE FORGE.
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label="Filter by metal">
              <button className="chip" aria-pressed={filter === -1} onClick={() => setFilter(-1)}>ALL {g.coins.length}</button>
              {METALS.map((m, i) => counts[i] > 0 && (
                <button key={i} className="chip" aria-pressed={filter === i} onClick={() => setFilter(i)}
                        style={filter === i ? { borderColor: m.hl, color: m.hl, background: "var(--stone-2)" } : { color: m.hl }}>
                  {m.name} {counts[i]}
                </button>
              ))}
            </div>
            <div className="seg" role="group" aria-label="Sort">
              {SORTS.map(([id, label]) => <button key={id} aria-pressed={sort === id} onClick={() => setSort(id)}>{label}</button>)}
            </div>
            {selecting && (
              <div className="panel" style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label="Pick coins">
                  {RARITIES.slice(0, 3).map((r, i) => (
                    <button key={r.name} className="chip" style={{ color: r.color }} onClick={() => pickWhere(c => coinRarity(c) <= i)}>
                      {i === 0 ? "COMMONS" : `${r.name} AND BELOW`}
                    </button>
                  ))}
                  <button className="chip" onClick={() => pickWhere(() => true)}>ALL</button>
                  <button className="chip" onClick={() => setPicked(new Set())}>NONE</button>
                </div>
                <span className="t-label">{filter === -1 ? "FROM ALL METALS" : `${METALS[filter].name} ONLY`}. PINNED, LOCKED AND NAMED COINS ARE LEFT OUT.</span>
              </div>
            )}
            <div className="grid-coins">
              {shown.map(coin => (
                <CoinTile key={coin.id} coin={coin} pinned={pinnedSet.has(coin.id)}
                          selected={selecting && picked.has(coin.id)} disabled={selecting && coin.locked} onClick={() => tap(coin)}/>
              ))}
            </div>
          </>
        )}
      </div>

      {selecting && (
        <div className="panel panel-hi" style={{ position: "fixed", left: 8, right: 8, bottom: "calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 12px)", zIndex: 80, padding: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, paddingLeft: 4 }}>
            <div>{pickedCoins.length} PICKED</div>
            <div className="t-gold row" style={{ gap: 6 }}><PixelIcon name="mark" size={11}/>{pickedTotal.toLocaleString()}</div>
          </div>
          <button className="btn btn-danger" disabled={!pickedCoins.length || busy} onClick={() => sell(pickedCoins)}>SELL</button>
        </div>
      )}

      {open && (
        <CoinModal coin={open} busy={busy} onClose={() => setOpenId(null)} onToggleLock={g.toggleLock} onSell={c => sell([c])}
                   pinned={pinnedSet.has(open.id)} onTogglePin={id => { g.togglePin(id); feel("tap"); }}
                   onForge={c => { setOpenId(null); setForging(c.id); }}/>
      )}
      {forging && <Forge coinId={forging} onClose={() => setForging(null)}/>}
    </div>
  );
}
