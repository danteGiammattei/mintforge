import { useEffect, useState } from "react";

/* ─── the way in ──────────────────────────────────────────────────────────
 * Every launch: black, and the studio's name flickering up out of it and
 * away (StudioCard); then the splash, the game's name over its art, with a
 * bar that fills as the game gathers what it needs (Splash). The splash
 * holds for a set while even when everything is ready sooner: the time is
 * spent painting coins and fetching screens ahead (MintForge.jsx), so the
 * game opens on the door with nothing left to wait for.
 *
 * The art is public/splash.png when there is one; until then, a candle. */

export const STUDIO = "PROJECT THOTH";     // the studio's name, as shown at launch
export const STUDIO_MS = 2200;             // the studio card, start to finish
export const SPLASH_MIN_MS = 2600;         // the least the splash is shown

export function StudioCard() {
  return (
    <main className="app" aria-label={STUDIO} style={{ alignItems: "center", justifyContent: "center", background: "#000" }}>
      <div className="studio-card" style={{ display: "grid", justifyItems: "center", gap: 10 }}>
        <span className="t-big" style={{ letterSpacing: ".3em", color: "var(--bone)", paddingLeft: ".3em" }}>{STUDIO}</span>
        <span className="t-label" style={{ letterSpacing: ".4em", paddingLeft: ".4em" }}>PRESENTS</span>
      </div>
    </main>
  );
}

/* the splash art if it has been added, else the placeholder */
function Art() {
  const [missing, setMissing] = useState(false);
  if (!missing) return (
    <img src="/splash.png" alt="" onError={() => setMissing(true)}
         style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }}/>
  );
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center",
                              background: "radial-gradient(circle at 50% 42%, #2a1d0c 0, #0b0805 45%, #000 80%)" }}>
      <Candle/>
    </div>
  );
}

function Candle() {
  // the placeholder: a candle in the dark, stepped at 8 frames a second
  const [f, setF] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setF(n => n + 1), 125); return () => clearInterval(t);
  }, []);
  const lean = f % 7 === 0 ? 1 : f % 11 === 0 ? -1 : 0;
  const P = 6, px = (x, y, w, h, c, o = 1) => <rect x={x} y={y} width={w} height={h} fill={c} opacity={o}/>;
  return (
    <svg width={24 * P} height={40 * P} viewBox="0 0 24 40" shapeRendering="crispEdges" style={{ marginTop: "-8vh", filter: `drop-shadow(0 0 ${f % 3 ? 18 : 22}px #f0b05066)` }}>
      {px(11 + lean, 8, 2, 2, "#c84a2a")}{px(10 + lean, 10, 4, 4, "#f0a040")}{px(11 + lean, 11, 2, 3, "#ffe8a0")}
      {px(11, 14, 2, 1, "#f0a040")}{px(12, 15, 1, 2, "#2a2018")}
      {px(9, 17, 6, 16, "#d8cba8")}{px(9, 17, 1, 16, "#f0e6cc")}{px(14, 17, 1, 16, "#a89878")}
      {px(10, 17, 1, 4, "#f0e6cc")}{px(13, 17, 1, 6, "#c0b090")}
      {px(5, 33, 14, 2, "#6a5a40")}{px(4, 35, 16, 2, "#4a3e2c")}{px(6, 37, 12, 1, "#2a2218")}
    </svg>
  );
}

export function Splash({ progress = 0, line }) {
  const cells = 20, lit = Math.round(Math.max(0, Math.min(1, progress)) * cells);
  return (
    <main className="app splash-in" aria-busy="true" style={{ position: "relative", background: "#000", overflow: "hidden" }}>
      <Art/>
      {/* the name up top, the bar along the foot, over a darkening at each edge */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(#000c, transparent 28%, transparent 68%, #000e)" }}/>
      <div style={{ position: "absolute", left: 0, right: 0, top: "calc(env(safe-area-inset-top, 0px) + 9vh)", textAlign: "center" }}>
        <h1 className="t-big" style={{ margin: 0, fontSize: 40, letterSpacing: ".12em", color: "#f3d48a", textShadow: "0 4px 0 #3a2410, 0 0 24px #f0b05055" }}>MINTFORGE</h1>
      </div>
      <div style={{ position: "absolute", left: 24, right: 24, bottom: "calc(env(safe-area-inset-bottom, 0px) + 7vh)", display: "grid", gap: 10, justifyItems: "center" }}>
        <div aria-hidden style={{ display: "flex", gap: 3, width: "100%", maxWidth: 320 }}>
          {Array.from({ length: cells }, (_, i) => (
            <span key={i} style={{ flex: 1, height: 10, background: i < lit ? "var(--candle)" : "#1a1510", boxShadow: "0 0 0 2px #000" }}/>
          ))}
        </div>
        <p className="t-dim" role="status" style={{ margin: 0, minHeight: "1.4em" }}>{line}</p>
      </div>
    </main>
  );
}
