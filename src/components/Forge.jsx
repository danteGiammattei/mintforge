import { useEffect, useRef, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { coinValue, coinRarity } from "../lib/coin.js";
import { RARITIES } from "../lib/data.js";
import { forgeCost } from "../../shared/economy.js";
import { FORGE, ENGRAVE } from "../../shared/tuning.js";
import { coinName, matterOf } from "../lib/coinview.js";
import { mount, SURROUND } from "../scenes/forge.js";
import PixelIcon from "../ui/PixelIcon.jsx";

/* ─── THE FORGE ───────────────────────────────────────────────────────────
 * Where marks go. Take a coin from the vault, pay for a strike, and it may
 * come away shiny. A miss costs the marks and nothing else — the coin is
 * never at risk, which is what separates this from the Tavern. The price
 * and the odds are shown; the server takes the marks and makes the roll.
 *
 * The second bench is the engraver's: a name of your own cut into the
 * coin, for marks. It shows wherever the coin does, to you and to anyone
 * looking in your cabinet. */
export default function Forge({ coinId, onClose }) {
  const g = useGame(), ui = useUi();
  const ref = useRef(null), scene = useRef(null), live = useRef(g);
  live.current = g;
  const [busy, setBusy] = useState(false);
  const [bench, setBench] = useState("strike");
  const [name, setName] = useState("");
  const coin = g.coins.find(c => c.id === coinId);

  useEffect(() => {
    scene.current = mount(ref.current, {
      coin: () => live.current.coins.find(c => c.id === coinId),
      say: ui.say, feel,
    });
    const key = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); scene.current(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinId]);

  if (!coin) return null;
  const cost = forgeCost(coinValue({ ...coin, shiny: false }));
  const short = g.marks < cost;
  const m = matterOf(coin), r = RARITIES[coinRarity(coin)];

  const strike = () => {
    if (busy || coin.shiny || short) return;
    const p = g.act("forge", { coinId });
    if (!scene.current.strike(p)) return;
    setBusy(true);
    // the button comes back once the blow has played out, whatever the answer
    p.catch(() => {}).finally(() => setTimeout(() => setBusy(false), 1100));
  };

  const typed = name.replace(/\s+/g, " ").trim().toUpperCase();
  const engrave = async clear => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await g.act("engrave", { coinId, name: clear ? "" : typed });
      feel(clear ? "dull" : "strike");
      ui.toast(res.name ? `IT IS ${res.name} NOW.` : "THE NAME IS GONE.");
      setName("");
    } catch (e) { ui.toast(e.message, "bad"); feel("error"); }
    setBusy(false);
  };

  return (
    <div className="veil appear" style={{ zIndex: 520, flexDirection: "column", padding: 0, background: `rgb(${SURROUND})` }}
         role="dialog" aria-modal="true" aria-label="The forge">
      <div className="scene" style={{ width: "100%", background: "transparent" }}>
        <canvas ref={ref} role="img" style={{ display: "block" }}
                aria-label={`A ${r.name} ${m.name} coin on an anvil, a hammer raised over it, coals glowing below.`}/>
      </div>
      <div style={{ width: "100%", maxWidth: 360, padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="between">
          <span style={{ color: m.hl }}>{coinName(coin)}</span>
          <span className="t-gold row" style={{ gap: 6 }} aria-label={`You have ${g.marks} marks`}><PixelIcon name="mark" size={11}/>{g.marks.toLocaleString()}</span>
        </div>
        <div className="seg" role="tablist" aria-label="Bench">
          <button role="tab" aria-selected={bench === "strike"} disabled={busy} onClick={() => setBench("strike")}><PixelIcon name="spark" size={11}/>SHINE</button>
          <button role="tab" aria-selected={bench === "name"} disabled={busy} onClick={() => setBench("name")}><PixelIcon name="quill" size={11}/>NAME</button>
        </div>

        {bench === "strike" && (coin.shiny ? (
          <p className="t-gold" style={{ margin: 0, textAlign: "center" }}>IT SHINES. THERE IS NOTHING MORE THE HAMMER CAN DO FOR IT.</p>
        ) : (
          <>
            <p className="t-dim" style={{ margin: 0 }}>
              A STRIKE MAY LEAVE A SHINE ON IT — ABOUT 1 IN {Math.round(1 / FORGE.shinyChance)}. THE COIN IS NEVER HARMED. THE MARKS ARE SPENT EITHER WAY.
            </p>
            <button className="btn btn-gold btn-block" disabled={busy || short} onClick={strike}>
              {busy ? "…" : <><PixelIcon name="mark" size={11}/>STRIKE FOR {cost.toLocaleString()}</>}
            </button>
            {short && <p className="t-blood" role="status" style={{ margin: 0, textAlign: "center" }}>YOU NEED {(cost - g.marks).toLocaleString()} MORE MARKS.</p>}
          </>
        ))}

        {bench === "name" && (
          <form onSubmit={e => { e.preventDefault(); if (typed && g.marks >= ENGRAVE.cost) engrave(false); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="t-dim" htmlFor="forge-name" style={{ margin: 0 }}>
              {coin.nick ? <>IT IS CALLED {coin.nick}. IT WAS STRUCK AS {coin.raw}.</> : <>IT WAS STRUCK AS {coin.raw}. CUT A NAME OF YOUR OWN INTO IT.</>}
            </label>
            <input id="forge-name" className="field" value={name} maxLength={ENGRAVE.maxLength} placeholder="OLD SOL" autoComplete="off" spellCheck={false}
                   onChange={e => setName(e.target.value.replace(/[^A-Za-z0-9 '-]/g, ""))}/>
            <button type="submit" className="btn btn-gold btn-block" disabled={busy || !typed || typed === coin.nick || g.marks < ENGRAVE.cost}>
              <PixelIcon name="mark" size={11}/>ENGRAVE FOR {ENGRAVE.cost}
            </button>
            {g.marks < ENGRAVE.cost && <p className="t-blood" role="status" style={{ margin: 0, textAlign: "center" }}>YOU NEED {(ENGRAVE.cost - g.marks).toLocaleString()} MORE MARKS.</p>}
            {coin.nick && <button type="button" className="btn btn-block" disabled={busy} onClick={() => engrave(true)}>GRIND THE NAME OFF · FREE</button>}
          </form>
        )}
        <button className="btn btn-ghost btn-block" disabled={busy} onClick={onClose}>LEAVE</button>
      </div>
    </div>
  );
}
