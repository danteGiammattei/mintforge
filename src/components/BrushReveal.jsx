import { useState, useRef, useEffect, useCallback } from "react";
import { drawCoin, RNG } from "../lib/coin.js";
import { METALS, BA } from "../lib/data.js";

/* Local rendering constants — only used inside BrushReveal so they live here.
 *   RS = render size of the coin/dirt canvas (180px square)
 *   BW/BH = brush ellipse width/height
 *   SS = sampling stride for measuring how much dirt is cleared */
const RS = 180;
const BW = 28;
const BH = 10;
const SS = 4;

/* Two-canvas reveal: bottom canvas is the painted coin, top canvas is dirt
 * that the player brushes away. Sampling at stride SS measures what fraction
 * of dirt remains; once below ~22% transparent we trigger the reveal. */
export default function BrushReveal({ coin, brushAlpha = BA, shinyChance = .01, onRevealed, t }) {
  const coinRef = useRef();
  const dirtRef = useRef();
  const prevRef = useRef(null);
  const downRef = useRef(false);
  const chkRef  = useRef(0);
  const m       = METALS[coin.metalIdx];

  const [pct, setPct]       = useState(0);
  const [gleam, setGleam]   = useState(false);
  const [cursor, setCursor] = useState({ x:-300, y:-300 });

  // Paint the coin once
  useEffect(() => {
    if (coinRef.current) drawCoin(coinRef.current, coin, RS);
  }, [coin.seed]);

  // Paint the dirt overlay — pseudo-random rocks, particles, scratches
  useEffect(() => {
    const cv = dirtRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
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
    if (p > .78) {
      const isShiny = Math.random() < shinyChance;
      ctx.clearRect(0, 0, RS, RS);
      setPct(1); setGleam(true);
      setTimeout(() => onRevealed(isShiny), 950);
    }
  }, [onRevealed, shinyChance]);

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
    setCursor({
      x: e.touches ? e.touches[0].clientX : e.clientX,
      y: e.touches ? e.touches[0].clientY : e.clientY,
    });
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

  const onUp = useCallback(() => { downRef.current = false; prevRef.current = null; }, []);

  const hint = pct < .12 ? "Hold and drag to brush"
             : pct < .45 ? "Keep brushing..."
             : pct < .78 ? "Almost clean!"
             : "";

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, userSelect:"none" }}>
      <div style={{ position:"fixed", left:cursor.x, top:cursor.y, pointerEvents:"none", zIndex:999, transform:"translate(-50%,-70%)", fontSize:24 }}>🖌️</div>
      <div style={{ position:"relative", width:RS, height:RS, borderRadius:"50%", overflow:"hidden", flexShrink:0, cursor:"none", boxShadow:`0 0 0 6px ${t.surface},0 0 0 7px ${t.borderHi},0 18px 40px rgba(0,0,0,.5),inset 0 0 30px rgba(0,0,0,.4)` }}>
        <canvas ref={coinRef} style={{ imageRendering:"pixelated", position:"absolute", top:0, left:0, width:RS, height:RS }}/>
        <canvas ref={dirtRef} width={RS} height={RS}
                style={{ position:"absolute", top:0, left:0, touchAction:"none" }}
                onMouseMove={onMove} onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onUp}
                onTouchMove={onMove} onTouchStart={onDown} onTouchEnd={onUp}/>
        {gleam && <div style={{ position:"absolute", top:0, left:0, width:"60%", height:"100%", background:`linear-gradient(108deg,transparent,${m.hl}dd 50%,transparent)`, animation:"gleam .9s ease-out forwards", pointerEvents:"none", mixBlendMode:"screen" }}/>}
        <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`2px solid rgba(255,255,255,${pct*.18+.04})`, pointerEvents:"none" }}/>
      </div>
      {pct < 1 && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, width:RS }}>
          <div style={{ width:"100%", height:5, background:t.faint, borderRadius:3, overflow:"hidden", border:`1px solid ${t.border}` }}>
            <div style={{ width:`${pct*100}%`, height:"100%", background:`linear-gradient(to right,${t.accentDim},${m.hl})`, transition:"width .08s", boxShadow:`0 0 8px ${m.hl}66` }}/>
          </div>
          {hint && <div style={{ fontFamily:"Outfit,sans-serif", fontSize:12, color:t.muted, fontWeight:500, letterSpacing:.5 }}>{hint}</div>}
        </div>
      )}
    </div>
  );
}
