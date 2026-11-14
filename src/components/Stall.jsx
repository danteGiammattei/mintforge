import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { mkCoin } from "../lib/coin.js";
import { matterOf } from "../lib/coinview.js";
import { RARITIES, PREMIUM_TITLE_BY_ID, FRAMES } from "../lib/data.js";
import { CHESTS } from "../../shared/tuning.js";
import { loadChestArt, chestClosed } from "../lib/chestArt.js";
import CoinCanvas from "./CoinCanvas.jsx";
import PixelIcon from "../ui/PixelIcon.jsx";
import { TitleText } from "../screens/Friends.jsx";

/* ─── THE GOBLIN'S STALL ──────────────────────────────────────────────────
 * Reached from the door: swipe up on him and he walks off to it. Five
 * wares, rolled for you for the day (shared/stall.js), each sold once;
 * new ones at your midnight. Prices and stock are the server's. */

const LINES = [
  "FRESH FROM THE DARK, THESE. MOSTLY.",
  "NO TOUCHING. LOOKING IS FREE. FOR NOW.",
  "EVERYTHING HAS A PRICE. THESE ONES ARE WRITTEN DOWN.",
  "FOUND THEM. DON'T ASK WHERE.",
  "COME BACK TOMORROW. IT WILL ALL BE DIFFERENT.",
];
const untilMidnight = now => {
  const d = new Date(now), m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) - d;
  const min = Math.ceil(m / 60000);
  return min >= 60 ? `${Math.floor(min / 60)}H ${min % 60}M` : `${min}M`;
};

/* the awning over the stall: scalloped stripes, drawn small, shown large */
function Awning() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, x = c.getContext("2d"), W = c.width;
    for (let i = 0; i < W; i++) {
      const band = Math.floor(i / 8) % 2;
      x.fillStyle = band ? "#5a1e1a" : "#b8a37a"; x.fillRect(i, 0, 1, 9);
      x.fillStyle = band ? "#3e1210" : "#8e7a54"; x.fillRect(i, 9, 1, 2);
      const sc = Math.round(2 * Math.sin(((i % 8) / 8) * Math.PI));       // the scallop under each stripe
      x.fillStyle = band ? "#3e1210" : "#8e7a54"; x.fillRect(i, 11, 1, sc);
    }
    x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(0, 0, W, 2);
  }, []);
  return <canvas ref={ref} width={96} height={14} aria-hidden style={{ width: "100%", height: 56, imageRendering: "pixelated", display: "block" }}/>;
}

function ChestPic({ tier, size }) {
  const ref = useRef(null);
  useEffect(() => {
    let live = true;
    loadChestArt().then(() => {
      const f = chestClosed(tier, "candle"), c = ref.current;
      if (!live || !f || !c) return;
      c.width = f.width; c.height = f.height;
      const x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height); x.drawImage(f, 0, 0);
    });
    return () => { live = false; };
  }, [tier]);
  return <canvas ref={ref} aria-hidden style={{ width: size, imageRendering: "pixelated" }}/>;
}

function Ware({ w, onBuy, big }) {
  let pic, name, sub;
  if (w.kind === "chest") {
    pic = <ChestPic tier={w.tier} size={big ? 96 : 72}/>;
    name = `${CHESTS.names[w.tier]} CHEST`; sub = "";
  } else if (w.kind === "coin") {
    const c = mkCoin(w.coin.seed, 1, w.coin.metalIdx, undefined, w.coin.rarity);
    const r = RARITIES[w.coin.rarity];
    pic = <CoinCanvas coin={c} size={64}/>;
    name = <span style={{ color: matterOf(c).hl }}>{matterOf(c).name.toUpperCase()} COIN</span>;
    sub = <span style={{ color: r.color }}>{r.name.toUpperCase()}</span>;
  } else if (w.kind === "title") {
    const t = PREMIUM_TITLE_BY_ID[w.id];
    pic = <div style={{ padding: "14px 4px", textAlign: "center" }}><TitleText label={t?.label || w.id}/></div>;
    name = "A TITLE"; sub = "ONLY SOLD HERE";
  } else {
    pic = <div className="t-title" style={{ padding: 12 }}>{FRAMES[w.id]?.lbl || w.id}</div>;
    name = "A BANNER"; sub = "ONLY SOLD HERE";
  }
  return (
    <button className="tile" disabled={w.sold} onClick={onBuy}
            style={{ position: "relative", minHeight: big ? 168 : 150, justifyContent: "space-between", gap: 6, padding: 8,
                     ...(big ? { gridColumn: "1 / -1", borderColor: "var(--candle)", background: "radial-gradient(circle at 50% 35%, rgba(240,200,80,.16), transparent 70%), var(--stone-1)" } : {}) }}
            aria-label={`${typeof name === "string" ? name : "coin"}, ${w.price} marks${w.sold ? ", sold" : ""}`}>
      {big && <span className="t-label t-gold" style={{ position: "absolute", top: 6, left: 8 }}>★ FEATURED</span>}
      <div style={{ flex: 1, display: "grid", placeItems: "center", minHeight: 72 }}>{pic}</div>
      <span style={{ textAlign: "center", lineHeight: 1.3 }}>{name}<br/><span className="t-label">{sub}</span></span>
      <span className="t-gold" style={{ display: "flex", gap: 6, alignItems: "center" }}><PixelIcon name="mark" size={11}/>{w.price.toLocaleString()}</span>
      {w.sold && <span className="t-title" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(5,6,9,.72)", color: "var(--blood)" }}>SOLD</span>}
    </button>
  );
}

export default function Stall({ onClose }) {
  const g = useGame(), ui = useUi();
  const [s, setS] = useState(null);
  const [err, setErr] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [line] = useState(() => LINES[Math.floor(Math.random() * LINES.length)]);
  const busy = useRef(false);

  const load = useCallback(() => g.act("stall").then(r => { setS(r); setErr(null); }).catch(e => setErr(e.message || "THE STALL IS SHUT")), [g]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      // past midnight: new wares
      if (new Date(n).getDate() !== new Date(now).getDate()) load();
      setNow(n);
    }, 20000);
    return () => clearInterval(t);
  }, [now, load]);

  const buy = async (w, slot) => {
    if (busy.current || w.sold) return;
    if (g.marks < w.price) { ui.toast("NOT ENOUGH MARKS", "bad"); feel("error"); return; }
    if (!(await ui.confirm({ title: "BUY IT?", body: `${w.price.toLocaleString()} MARKS. HE DOES NOT DO REFUNDS.`, yes: "BUY" }))) return;
    busy.current = true;
    try {
      await g.act("buy", { slot, day: s.day });
      feel("gift");
      ui.toast(w.kind === "chest" ? "THE CHEST IS IN YOUR SATCHEL." : w.kind === "coin" ? "THE COIN IS IN YOUR SATCHEL. BRUSH IT CLEAN." : "IT IS YOURS. WEAR IT FROM YOUR PROFILE.", "magic");
      await load();
    } catch (e) { ui.toast(e.message, "bad"); feel("error"); await load(); }
    busy.current = false;
  };

  return (
    <div className="appear" style={{ position: "absolute", inset: 0, overflowY: "auto", background: "var(--void)", animationDuration: ".6s" }}>
      <div className="page-in" style={{ paddingTop: 0 }}>
        <Awning/>
        <div className="between" style={{ alignItems: "baseline" }}>
          <h1 className="t-big" style={{ margin: 0 }}>THE STALL</h1>
          <span className="t-label">NEW WARES IN {untilMidnight(now)}</span>
        </div>
        <p className="t-dim" style={{ margin: 0 }}>"{line}"</p>
        {err && !s ? (
          <div className="panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }} role="alert">
            <span className="t-blood">THE STALL IS SHUT: {String(err).toUpperCase()}</span>
            <button className="btn" onClick={() => { setErr(null); load(); }}>TRY AGAIN</button>
          </div>
        ) : !s ? <p className="t-dim">HE IS LAYING THINGS OUT…</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Ware w={s.wares[4]} big onBuy={() => buy(s.wares[4], 4)}/>
            {s.wares.slice(0, 4).map((w, i) => <Ware key={i} w={w} onBuy={() => buy(w, i)}/>)}
          </div>
        )}
        <button className="btn btn-block" onClick={onClose}>BACK TO THE DOOR</button>
      </div>
    </div>
  );
}
