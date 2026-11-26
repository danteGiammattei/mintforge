import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { coinRarity } from "../lib/coin.js";
import { hydrate, matterOf, coinName } from "../lib/coinview.js";
import { RARITIES } from "../lib/data.js";
import { AUCTION } from "../../shared/tuning.js";
import CoinCanvas from "./CoinCanvas.jsx";
import PixelIcon from "../ui/PixelIcon.jsx";
import { CoinTile } from "../screens/Vault.jsx";

/* ─── THE AUCTION HOUSE ───────────────────────────────────────────────────
 * In the tavern's back room. Every open listing, soonest to close first;
 * bid at or over the next price (your marks are held until you are
 * beaten); list a coin of your own for any starting price and any time
 * from ten minutes to seven days. The goblin puts up two of his own each
 * day. The server keeps the clock and the rules (server/auction.js). */

const LINES = [
  "EVERYTHING GOES TO THE HIGHEST HAND. EVERYTHING.",
  "BID LATE IF YOU LIKE. THE HAMMER WAITS.",
  "THE HOUSE TAKES A TENTH. THE HOUSE ALWAYS DOES.",
  "TWO OF MINE ON THE BLOCK TODAY. CHEAP. FOR NOW.",
];
const left = ms => {
  if (ms <= 0) return "CLOSING";
  const m = Math.ceil(ms / 60000);
  if (m < 60) return ms < 60000 ? `${Math.ceil(ms / 1000)}S` : `${m}M`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h}H ${m % 60}M` : `${Math.floor(h / 24)}D ${h % 24}H`;
};
const UNITS = [["MIN", 1], ["HRS", 60], ["DAYS", 1440]];
const QUICK = [["1H", 60], ["12H", 720], ["1D", 1440], ["3D", 4320], ["7D", 10080]];

export default function Auction() {
  const g = useGame(), ui = useUi();
  const [feed, setFeed] = useState(null), [err, setErr] = useState(null), [skew, setSkew] = useState(0);
  const [, tick] = useState(0), [busy, setBusy] = useState(false), [listing, setListing] = useState(false);
  const line = useMemo(() => LINES[Math.floor(Math.random() * LINES.length)], []);
  const open = g.level >= AUCTION.minLevel;

  // through a ref: every act brings a new game state, and a load that
  // changed with it would fetch again, and again, forever
  const live = useRef(g); live.current = g;
  const load = useCallback(() => live.current.act("auctions").then(r => { setFeed(r.list); setSkew(r.now - Date.now()); setErr(null); })
    .catch(e => setErr(e.message || "THE BACK ROOM IS SHUT")), []);
  useEffect(() => {
    if (!open) return;
    load();
    // the block is refreshed every half minute, and only while it can be seen
    const poll = setInterval(() => { if (document.visibilityState === "visible") load(); }, 30_000), clock = setInterval(() => tick(t => t + 1), 1000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [open, load]);

  if (!open) return (
    <section className="panel" style={{ padding: 16, display: "grid", gap: 8, textAlign: "center" }}>
      <h2 className="t-title" style={{ margin: 0 }}>THE AUCTION HOUSE</h2>
      <p className="t-dim" style={{ margin: 0 }}>THE BACK ROOM OPENS AT LEVEL {AUCTION.minLevel}. THE GOBLIN DOES NOT DEAL WITH STRANGERS.</p>
    </section>
  );

  const now = Date.now() + skew;
  const mine = (feed || []).filter(a => a.mine), block = (feed || []).filter(a => !a.mine);

  const bid = async (a, amount) => {
    setBusy(true);
    try {
      await g.act("bid", { auctionId: a.id, amount });
      feel("coin"); ui.toast(`YOUR BID: ${amount.toLocaleString()}`, "good");
    } catch (e) { ui.toast(e.message, "bad"); feel("error"); }
    setBusy(false); load();
  };
  const withdraw = async a => {
    if (!(await ui.confirm({ title: "TAKE IT BACK?", body: "IT GOES BACK IN YOUR VAULT.", yes: "TAKE IT BACK" }))) return;
    setBusy(true);
    try { await g.act("withdraw", { auctionId: a.id }); feel("tap"); } catch (e) { ui.toast(e.message, "bad"); feel("error"); }
    setBusy(false); load();
  };

  return (
    <section className="panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }} aria-label="Auction house">
      <div className="between">
        <h2 className="t-title" style={{ margin: 0 }}>THE AUCTION HOUSE</h2>
        <button className="btn btn-gold" style={{ minHeight: 40, padding: "0 12px" }} disabled={busy} onClick={() => setListing(v => !v)}>
          {listing ? "CANCEL" : "LIST A COIN"}
        </button>
      </div>
      <p className="t-dim" style={{ margin: 0, fontStyle: "italic" }}>"{line}"</p>

      {listing && <ListForm g={g} ui={ui} onDone={() => { setListing(false); load(); }}/>}

      {err && <p className="t-bad" style={{ margin: 0 }}>{err}</p>}
      {!feed && !err && <p className="t-dim" style={{ margin: 0 }}>THE GOBLIN IS FINDING HIS GAVEL…</p>}

      {mine.length > 0 && (
        <>
          <h3 className="t-label" style={{ margin: "4px 0 0" }}>YOUR LISTINGS · {mine.length} / {AUCTION.openPerPlayer}</h3>
          {mine.map(a => <Lot key={a.id} a={a} now={now} busy={busy} onWithdraw={withdraw}/>)}
        </>
      )}
      {feed && (
        <>
          <h3 className="t-label" style={{ margin: "4px 0 0" }}>ON THE BLOCK · {block.length}</h3>
          {block.length ? block.map(a => <Lot key={a.id} a={a} now={now} busy={busy} marks={g.marks} onBid={bid}/>)
            : <p className="t-dim" style={{ margin: 0 }}>NOTHING ON THE BLOCK. PUT SOMETHING UP.</p>}
        </>
      )}
      <p className="t-label" style={{ margin: 0 }}>
        BIDS ARE HELD AND HANDED BACK IF BEATEN. A BID IN THE LAST 2 MINUTES ADDS 2 MINUTES. THE HOUSE KEEPS {Math.round(AUCTION.cut * 100)}% OF A SALE.
      </p>
    </section>
  );
}

/* One listing: the coin, where the bidding stands, the time left, and a
 * bid you can raise before you place it. */
function Lot({ a, now, busy, marks, onBid, onWithdraw }) {
  const c = hydrate(a.coin), m = matterOf(c), r = RARITIES[coinRarity(c)];
  const [amount, setAmount] = useState(a.next);
  useEffect(() => { setAmount(v => Math.max(v, a.next)); }, [a.next]);
  const ms = a.endsAt - now, soon = ms < 5 * 60_000;
  const step = Math.max(1, Math.ceil(a.next * AUCTION.raise));
  return (
    <article className="tile" style={{ display: "grid", gridTemplateColumns: "64px minmax(0, 1fr)", gap: 10, padding: 10, textAlign: "left", alignItems: "start", borderTopColor: r.color }}
             aria-label={`${r.name} ${m.name} coin, ${a.bid != null ? `bid ${a.bid}` : `starts at ${a.start}`}, ${left(ms)} left`}>
      <CoinCanvas coin={c} size={64}/>
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <div className="between" style={{ gap: 6 }}>
          <span style={{ color: m.hl, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{coinName(c)}</span>
          <span className={soon ? "t-bad" : "t-dim"} style={{ whiteSpace: "nowrap" }}>{left(ms)}</span>
        </div>
        <span className="t-label"><span style={{ color: r.color }}>{r.name.toUpperCase()}</span> {m.name.toUpperCase()}{c.shiny ? " · SHINY" : ""} · {a.house ? <span className="t-gold">THE GOBLIN</span> : a.mine ? "YOURS" : a.seller.toUpperCase()}</span>
        <div className="row" style={{ gap: 6 }}>
          <PixelIcon name="mark" size={12}/>
          <span className="t-gold">{(a.bid ?? a.start).toLocaleString()}</span>
          <span className="t-label">{a.bid != null ? `${a.bids} BID${a.bids === 1 ? "" : "S"}` : "TO START"}</span>
          {a.leading && <span className="t-good" style={{ marginLeft: "auto" }}>YOURS SO FAR</span>}
        </div>
        {onBid && !a.leading && (
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            <button className="btn" style={{ minHeight: 36, padding: "0 10px" }} disabled={busy || amount - step < a.next} onClick={() => setAmount(v => Math.max(a.next, v - step))} aria-label="Lower the bid">−</button>
            <input className="field" inputMode="numeric" style={{ width: 96, minHeight: 36, padding: "0 8px", textAlign: "center" }} aria-label="Your bid"
                   value={amount} onChange={e => setAmount(Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)))}/>
            <button className="btn" style={{ minHeight: 36, padding: "0 10px" }} disabled={busy} onClick={() => setAmount(v => v + step)} aria-label="Raise the bid">+</button>
            <button className="btn btn-gold" style={{ minHeight: 36, padding: "0 12px", marginLeft: "auto" }}
                    disabled={busy || amount < a.next || amount > marks} onClick={() => onBid(a, amount)}>BID</button>
          </div>
        )}
        {onWithdraw && a.bid == null && (
          <button className="btn" style={{ minHeight: 36, justifySelf: "start", padding: "0 12px" }} disabled={busy} onClick={() => onWithdraw(a)}>TAKE IT BACK</button>
        )}
      </div>
    </article>
  );
}

/* Putting a coin up: which, from what, and for how long. */
function ListForm({ g, ui, onDone }) {
  const free = g.coins.filter(c => !c.locked && !c.relic && c.sign == null);
  const [pick, setPick] = useState(null), [price, setPrice] = useState(""), [n, setN] = useState(1), [unit, setUnit] = useState(1), [busy, setBusy] = useState(false);
  const minutes = n * UNITS[unit][1], coin = free.find(c => c.id === pick);
  const ok = coin && +price >= 1 && minutes >= AUCTION.minutes[0] && minutes <= AUCTION.minutes[1];
  const go = async () => {
    if (!(await ui.confirm({
      title: "PUT IT UP?",
      body: `${coinName(coin)} FROM ${(+price).toLocaleString()} MARKS, FOR ${left(minutes * 60_000)}. IT LEAVES YOUR VAULT WHILE IT IS UP. THE HOUSE KEEPS ${Math.round(AUCTION.cut * 100)}% OF THE SALE.`,
      yes: "LIST IT",
    }))) return;
    setBusy(true);
    try { await g.act("list", { coinId: coin.id, price: +price, minutes }); feel("sell"); ui.toast("ON THE BLOCK", "good"); onDone(); }
    catch (e) { ui.toast(e.message, "bad"); feel("error"); }
    setBusy(false);
  };
  return (
    <div className="panel" style={{ padding: 10, display: "grid", gap: 10, background: "var(--stone-1)" }}>
      <span className="t-label">WHICH COIN</span>
      {free.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))", gap: 6, maxHeight: 260, overflowY: "auto" }}>
          {free.map(c => <CoinTile key={c.id} coin={c} selected={pick === c.id} onClick={() => setPick(c.id)}/>)}
        </div>
      ) : <p className="t-dim" style={{ margin: 0 }}>NOTHING YOU CAN LIST. LOCKED COINS AND THE COLLECTABLE SETS STAY HOME.</p>}
      <label className="t-label" htmlFor="auc-price">STARTING PRICE</label>
      <input id="auc-price" className="field" inputMode="numeric" placeholder="ANY PRICE" value={price}
             onChange={e => setPrice(e.target.value.replace(/\D/g, "").slice(0, 8))}/>
      <span className="t-label">HOW LONG</span>
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {QUICK.map(([l, m]) => (
          <button key={l} className="chip" aria-pressed={minutes === m} style={{ minHeight: 36, padding: "0 10px" }}
                  onClick={() => { const u = m % 1440 === 0 ? 2 : 1; setUnit(u); setN(m / UNITS[u][1]); }}>{l}</button>
        ))}
      </div>
      <div className="row" style={{ gap: 6 }}>
        <input className="field" inputMode="numeric" aria-label="How many" style={{ width: 80, textAlign: "center" }} value={n}
               onChange={e => setN(Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)))}/>
        <div className="seg" role="radiogroup" aria-label="Unit" style={{ flex: 1 }}>
          {UNITS.map(([l], i) => <button key={l} role="radio" aria-checked={unit === i} aria-pressed={unit === i} onClick={() => setUnit(i)}>{l}</button>)}
        </div>
      </div>
      {(minutes < AUCTION.minutes[0] || minutes > AUCTION.minutes[1]) && <p className="t-bad" style={{ margin: 0 }}>BETWEEN 10 MINUTES AND 7 DAYS.</p>}
      <button className="btn btn-gold" disabled={!ok || busy} onClick={go}>LIST IT</button>
    </div>
  );
}
