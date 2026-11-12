import { useState, useRef, useEffect, useCallback } from "react";
import { drawCoin, RNG } from "../lib/coin.js";
import { METALS, BA } from "../lib/data.js";
import { brush as brushSprite } from "../lib/forms.js";
import Sprite from "../ui/Sprite.jsx";

/* Local rendering constants — only used inside BrushReveal so they live here.
 *   RS = render size of the coin/dirt canvas (180px square)
 *   BW/BH = brush ellipse width/height
 *   SS = sampling stride for measuring how much dirt is cleared
 *
 * THE BRUSHING ITSELF IS UNCHANGED from the original game: the same dirt,
 * the same brush, the same 78% threshold. Two things differ around it.
 * Whether the coin is shiny was decided by the server when the chest was
 * opened, so nothing is rolled here; and the cursor is a pixel brush
 * rather than an emoji. */
const RS = 180;
const BW = 25;      // 20% less area than the original 28×10 brush, so a coin takes a little longer
const BH = 9;
const SS = 4;

/* Two-canvas reveal: bottom canvas is the painted coin, top canvas is dirt
 * that the player brushes away. Sampling at stride SS measures what fraction
 * of dirt remains; once below ~22% transparent we trigger the reveal. */
export default function BrushReveal({ coin, brushAlpha = BA, onRevealed, onProgress }) {
  const coinRef = useRef();
  const dirtRef = useRef();
  const prevRef = useRef(null);
  const downRef = useRef(false);
  const chkRef  = useRef(0);
  const doneRef = useRef(false);
  const m       = METALS[coin.metalIdx];

  const [pct, setPct]       = useState(0);
  const [gleam, setGleam]   = useState(false);
  // Cursor position is stored in CANVAS-LOCAL coords (0..RS), not viewport
  // pixels — and the brush emoji is rendered as a child of the canvas
  // wrapper, not a position:fixed overlay. This sidesteps a class of bugs
  // where any ancestor with `transform`/`filter`/`will-change` becomes the
  // containing block for fixed-positioned descendants and the emoji
  // appears far away from the actual pointer.
  const [cursor, setCursor] = useState({ x: -100, y: -100 });
  const [hovering, setHovering] = useState(false);

  // Paint the coin once, with the same generator the vault uses, so the
  // coin you brush is the coin you keep. Its shine waits for the reveal.
  useEffect(() => {
    const cv = coinRef.current;
    if (!cv) return;
    drawCoin(cv, { ...coin, shiny: false }, RS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin.seed, coin.metalIdx]);

  // Paint the dirt overlay — pseudo-random rocks, particles, scratches
  useEffect(() => {
    const cv = dirtRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    doneRef.current = false;
    ctx.clearRect(0, 0, RS, RS);
    ctx.save(); ctx.beginPath(); ctx.arc(RS/2, RS/2, RS/2 - 1, 0, Math.PI*2); ctx.clip();
    ctx.fillStyle = "#1e1208"; ctx.fillRect(0, 0, RS, RS);
    const rng = new RNG(coin.seed ^ 0xd1d7);
    const tones = ["#3a2410","#4a3018","#221408","#1c1006","#5a3c1e","#2e1c0c","#6a4220"];
    for (let i = 0; i < 5500; i++) {
      ctx.fillStyle = rng.pick(tones);
      ctx.fillRect(rng.int(0, RS - 5), rng.int(0, RS - 3), rng.int(1, 5), rng.int(1, 3));
    }
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(${rng.int(8,28)},${rng.int(5,16)},${rng.int(2,8)},.7)`;
      ctx.beginPath(); ctx.arc(rng.int(5, RS - 5), rng.int(5, RS - 5), rng.int(3, 8), 0, Math.PI*2); ctx.fill();
    }
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = `rgba(${rng.int(5,22)},${rng.int(3,12)},1,${rng.next()*.5+.2})`;
      ctx.lineWidth = rng.int(1, 2);
      ctx.beginPath();
      const sx = rng.int(0, RS), sy = rng.int(0, RS);
      ctx.moveTo(sx, sy); ctx.lineTo(sx + rng.int(-50, 50), sy + rng.int(-8, 8)); ctx.stroke();
    }
    ctx.restore();
  }, [coin.seed]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    dirtRef.current?.getContext("2d").clearRect(0, 0, RS, RS);
    setPct(1); setGleam(true);
    setTimeout(() => onRevealed(), 950);
  }, [onRevealed]);

  const sample = useCallback(() => {
    const cv = dirtRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); const half = RS / 2;
    const data = ctx.getImageData(0, 0, RS, RS).data;
    let tr = 0, tot = 0;
    for (let y = 0; y < RS; y += SS) for (let x = 0; x < RS; x += SS) {
      if (Math.hypot(x - half, y - half) < half - 2) {
        tot++;
        if (data[((y * RS + x) * 4) + 3] < 80) tr++;
      }
    }
    const p = Math.min(1, tr / Math.max(1, tot));
    setPct(p);
    onProgress?.(p);
    if (p > .78 && !doneRef.current) finish();
  }, [onProgress, finish]);


  const stroke = useCallback((x, y, px, py) => {
    const cv = dirtRef.current; if (!cv) return;
    const dx = x - px, dy = y - py, dist = Math.hypot(dx, dy);
    if (dist < .5) return;
    const angle = Math.atan2(dy, dx);
    const ctx = cv.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = brushAlpha;
    const steps = Math.max(1, Math.ceil(dist / 6));
    for (let s = 0; s <= steps; s++) {
      const tt = steps ? s / steps : 0;
      const sx = px + dx * tt, sy = py + dy * tt;
      ctx.translate(sx, sy); ctx.rotate(angle);
      ctx.beginPath(); ctx.ellipse(0, 0, BW, BH, 0, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(-angle); ctx.translate(-sx, -sy);
    }
    ctx.globalAlpha = brushAlpha * .5;
    const mx = px + dx * .5, my = py + dy * .5;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, BW * 1.5);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(mx, my, BW * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    chkRef.current++;
    if (chkRef.current % 4 === 0) sample();
  }, [brushAlpha, sample]);

  const gp = (e, rect) => {
    const sR = e.touches ? e.touches[0] : e;
    return { x:(sR.clientX - rect.left) * (RS / rect.width), y:(sR.clientY - rect.top) * (RS / rect.height) };
  };

  const onMove = useCallback((e) => {
    const cv = dirtRef.current; if (!cv) return;
    e.preventDefault();
    const rect = cv.getBoundingClientRect();
    const { x, y } = gp(e, rect);
    // Cursor is in canvas-local coordinates (0..RS). The emoji renders as
    // an absolute-positioned child of the same wrapper that contains the
    // canvas, so x/y map directly to the wrapper's coordinate space.
    setCursor({ x, y });
    setHovering(true);
    if (!downRef.current && !e.touches) return;
    if (prevRef.current) stroke(x, y, prevRef.current.x, prevRef.current.y);
    prevRef.current = { x, y };
  }, [stroke]);

  const onDown = useCallback((e) => {
    downRef.current = true;
    const cv = dirtRef.current; if (!cv) return;
    e.preventDefault();
    const rect = cv.getBoundingClientRect();
    const { x, y } = gp(e, rect);
    prevRef.current = { x, y };
  }, []);

  const onUp = useCallback(() => {
    downRef.current = false;
    prevRef.current = null;
    // On touch, lifting the finger should hide the cursor — otherwise the
    // brush emoji is stranded at the last touched position with no way
    // for the player to know they're not interacting.
    setHovering(false);
  }, []);

  const hint = pct < .12 ? "HOLD AND DRAG TO BRUSH"
             : pct < .45 ? "KEEP BRUSHING"
             : pct < .78 ? "ALMOST CLEAN"
             : "";

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, userSelect:"none" }}>
      <div style={{ position:"relative", width:RS, height:RS, borderRadius:"50%", overflow:"visible", flexShrink:0, cursor:"none", boxShadow:"0 0 0 4px #000, 0 0 0 6px var(--line-hi)" }}>
        <div style={{ position:"absolute", inset:0, borderRadius:"50%", overflow:"hidden" }}>
          <canvas ref={coinRef} aria-hidden style={{ imageRendering:"pixelated", position:"absolute", top:0, left:0, width:RS, height:RS }}/>
          <canvas ref={dirtRef} width={RS} height={RS} role="img" aria-label="A coin under a crust of dirt"
                  style={{ position:"absolute", top:0, left:0, touchAction:"none", imageRendering:"auto" }}
                  onMouseMove={onMove} onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onUp}
                  onMouseEnter={() => setHovering(true)}
                  onTouchMove={onMove} onTouchStart={onDown} onTouchEnd={onUp}/>
          {gleam && <div style={{ position:"absolute", top:0, left:0, width:"60%", height:"100%", background:`linear-gradient(108deg,transparent,${m.hl}dd 50%,transparent)`, animation:"gleam .9s ease-out forwards", pointerEvents:"none" }}/>}
        </div>
        {/* The brush: positioned in canvas-local coords and drawn outside
            the round window so its handle can run past the edge. */}
        {hovering && pct < 1 && (
          <div style={{ position:"absolute", left:cursor.x, top:cursor.y, pointerEvents:"none", transform:"translate(-20%,-80%)" }}>
            <Sprite make={brushSprite} dep="brush" scale={2}/>
          </div>
        )}
      </div>
      {pct < 1 && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, width:RS }}>
          <div className="meter" style={{ width:"100%" }} role="progressbar" aria-label="Dirt cleared" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct*100)}>
            <i style={{ width:`${Math.min(100, pct / .78 * 100)}%`, background:m.hl }}/>
          </div>
          <div className="t-label" style={{ minHeight:18 }}>{hint}</div>
          {/* brushing is a drag; this is the way through for anyone who cannot drag */}
          <button className="sr-only" onClick={finish}>Brush the coin clean</button>
        </div>
      )}
    </div>
  );
}
