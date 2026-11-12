import { useState, useRef, useEffect } from "react";
import { drawCoin, coinRarity, coinValue } from "../lib/coin.js";
import Aura from "./Aura.jsx";
import { METALS, RARITIES, SHAPE_NAMES } from "../lib/data.js";
import PixelIcon from "../ui/PixelIcon.jsx";
import { coinName } from "../lib/coinview.js";

/* ─── COIN MODAL ──────────────────────────────────────────────────────────
 * The coin inspector. Drag to turn the coin over in the light; the canvas
 * itself is the flat painted coin from lib/coin.js at 3× (192px).
 *
 * Esc closes. Background click closes. `onSell`, `onToggleLock`,
 * `onTogglePin` and `onForge` are optional — a coin in someone else's cabinet has none. */
const SIZE = 192;

export default function CoinModal({ coin, onClose, onToggleLock, onSell, onTogglePin, onForge, pinned, busy }) {
  const cvRef    = useRef();
  const rotRef   = useRef({ x: 12, y: 0 });
  const velRef   = useRef({ x: 0,  y: 0 });
  const dragging = useRef(false);
  const lastPos  = useRef(null);
  const rafRef   = useRef();
  const [rot, setRot] = useState({ x: 12, y: 0 });
  const m = METALS[coin.metalIdx];
  const r = RARITIES[coinRarity(coin)];

  useEffect(() => {
    if (cvRef.current) drawCoin(cvRef.current, coin, SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin.seed, coin.metalIdx, coin.shiny]);

  // Inertial spin — when not dragging, velocity decays and rotation drifts
  useEffect(() => {
    const loop = () => {
      if (!dragging.current) {
        velRef.current.x *= 0.92; velRef.current.y *= 0.92;
        rotRef.current.y += velRef.current.x;
        rotRef.current.x = Math.max(-55, Math.min(55, rotRef.current.x + velRef.current.y));
        if (Math.abs(velRef.current.x) > .04 || Math.abs(velRef.current.y) > .04) {
          setRot({ x: rotRef.current.x, y: rotRef.current.y });
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const onStart = (e) => { dragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; velRef.current = { x: 0, y: 0 }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove  = (e) => {
    if (!dragging.current || !lastPos.current) return;
    const dx = e.clientX - lastPos.current.x, dy = e.clientY - lastPos.current.y;
    velRef.current = { x: dx * .55, y: dy * .4 };
    rotRef.current.y += dx * .55;
    rotRef.current.x  = Math.max(-55, Math.min(55, rotRef.current.x + dy * .4));
    setRot({ x: rotRef.current.x, y: rotRef.current.y });
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onEnd = () => { dragging.current = false; lastPos.current = null; };

  const rows = [
    ["RARITY", r.name, r.color], ["METAL", m.name, m.hl],
    ["SHAPE", SHAPE_NAMES[coin.shape] || coin.shape], ["CONDITION", coin.cond],
    ["WEIGHT", `${coin.wt}G`], ["VALUE", coinValue(coin).toLocaleString(), "var(--candle)"],
  ];

  return (
    <div className="veil appear" style={{ zIndex: 500 }} onClick={onClose}>
      <div className="sheet rise" role="dialog" aria-modal="true" aria-label={`${r.name} ${m.name} coin, ${coinName(coin)}`}
           style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }} onClick={e => e.stopPropagation()}>
        <div style={{ cursor: "grab", userSelect: "none", touchAction: "none" }}
             onPointerDown={onStart} onPointerMove={onMove} onPointerUp={onEnd} onPointerCancel={onEnd}>
          <div style={{ transform: `perspective(560px) rotateY(${rot.y}deg) rotateX(${-rot.x}deg)` }}>
            <div style={{ position: "relative", width: SIZE, height: SIZE }}>
              <canvas ref={cvRef} aria-hidden style={{ imageRendering: "pixelated", display: "block", width: SIZE, height: SIZE }}/>
              <Aura coin={coin} size={SIZE} margin={12}/>
            </div>
          </div>
        </div>
        <div className="t-label">DRAG TO TURN IT</div>

        <div className="panel" style={{ width: "100%", borderColor: r.color }}>
          <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, borderBottom: "2px solid var(--line)" }}>
            <div style={{ minWidth: 0 }}>
              <div className="t-rune" style={{ fontSize: 24, color: m.hl, lineHeight: 1.1 }}>{coin.runes}</div>
              <div className="t-title">{coinName(coin)}</div>
              {coin.nick && <div className="t-label">STRUCK AS {coin.raw}</div>}
            </div>
            {coin.shiny && <div style={{ display: "flex", gap: 6, alignItems: "center", animation: "shinyText 1s steps(2) infinite" }}><PixelIcon name="spark" size={11}/>SHINY</div>}
          </div>
          <dl style={{ padding: 12, margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {rows.map(([k, v, col]) => (
              <div key={k}>
                <dt className="t-label">{k}</dt>
                <dd style={{ margin: 0, color: col || "var(--bone)" }}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="t-dim" style={{ padding: "0 12px 12px" }}>{coin.era}</div>
        </div>

        <div style={{ display: "flex", gap: 12, width: "100%", flexWrap: "wrap" }}>
          {onToggleLock && (
            <button className={`btn ${coin.locked ? "btn-gold" : ""}`} style={{ flex: "1 1 120px" }} aria-pressed={!!coin.locked} onClick={() => onToggleLock(coin.id)}>
              <PixelIcon name={coin.locked ? "lock" : "unlock"} size={11}/>{coin.locked ? "LOCKED" : "LOCK"}
            </button>
          )}
          {onTogglePin && (
            <button className={`btn ${pinned ? "btn-gold" : ""}`} style={{ flex: "1 1 120px" }} aria-pressed={!!pinned} onClick={() => onTogglePin(coin.id)}>
              <PixelIcon name="pin" size={11}/>{pinned ? "PINNED" : "PIN"}
            </button>
          )}
          {onForge && (
            <button className="btn btn-gold" style={{ flex: "1 1 120px" }} onClick={() => onForge(coin)}>
              <PixelIcon name="spark" size={11}/>FORGE
            </button>
          )}
          {onSell && !coin.locked && (
            <button className="btn btn-danger" style={{ flex: "1 1 120px" }} disabled={busy} onClick={() => onSell(coin)}>
              <PixelIcon name="mark" size={11}/>SELL {coinValue(coin).toLocaleString()}
            </button>
          )}
          <button className="btn btn-ghost" style={{ flex: "1 1 80px" }} onClick={onClose}>CLOSE</button>
        </div>
        {onToggleLock && (
          <div className="t-label" style={{ textAlign: "center" }}>
            {coin.locked ? "A LOCKED COIN CANNOT BE SOLD OR WAGERED." : "LOCK IT TO KEEP IT FROM SALES AND WAGERS."}
          </div>
        )}
      </div>
    </div>
  );
}
