import { useEffect, useState } from "react";
import { eventOn } from "../../shared/events.js";
import { localDay } from "../../shared/economy.js";

/* ─── the way in ──────────────────────────────────────────────────────────
 * Every launch: black, and the studio's name flickering up out of it and
 * away (StudioCard); then the splash, the game's name over its art, with a
 * bar that fills as the game gathers what it needs (Splash). The splash
 * holds for a set while even when everything is ready sooner: the time is
 * spent painting coins and fetching screens ahead (MintForge.jsx), so the
 * game opens on the door with nothing left to wait for.
 *
 * The art is public/splash.png when there is one; until then, a candle.
 * The studio's logo is public/studio-logo.png, the game's public/logo.png;
 * without them, each name in type. */

export const STUDIO = "RAINFALL STUDIOS";  // the studio's name, as shown at launch
export const STUDIO_MS = 2200;             // the studio card, start to finish
export const SPLASH_MIN_MS = 4000;         // the least the splash is shown

export function StudioCard() {
  // the logo when it has been added (public/studio-logo.png), else the name set in type
  const [logo, setLogo] = useState(true);
  const [word, kind] = STUDIO.split(" ");
  return (
    <main className="app" aria-label={STUDIO} style={{ alignItems: "center", justifyContent: "center", background: "#000" }}>
      <div className="studio-card" style={{ display: "grid", justifyItems: "center", gap: 10, padding: "0 16px" }}>
        {logo
          ? <img src="/studio-logo.png" alt={STUDIO} onError={() => setLogo(false)}
                 style={{ width: "min(66vw, 280px)", height: "auto" }}/>
          : <>
              <span className="t-big" style={{ fontSize: 32, letterSpacing: ".18em", paddingLeft: ".18em", color: "var(--bone)" }}>{word}</span>
              {kind && <span className="t-title" style={{ letterSpacing: ".6em", paddingLeft: ".6em", color: "var(--bone-dim)" }}>{kind}</span>}
            </>}
        <span className="t-label" style={{ letterSpacing: ".4em", paddingLeft: ".4em", marginTop: 14 }}>PRESENTS</span>
      </div>
    </main>
  );
}

/* The splash art if it has been added (public/splash.webp), else the
 * placeholder. The art is laid as "cover" by hand, on a stage of its own
 * proportions that always fills the screen, so the candlelight drawn over
 * it stays on its flame however the phone crops it. */
/* The loading screens: one is chosen at random each launch. To add one,
 * put its image in public/ and a line here: its size, and where any warm
 * light in it sits (in % of the image) to flicker; leave `lights` empty
 * for a screen that should hold still. */
// `season`: shown only while that event runs (shared/events.js), and then
// on half of all launches; the rest rotate the year round. Art: docs/ART_STYLE.md.
const W = 1080, H = 1927;
const ARTS = [
  // the candle on the desk is out of the rotation until it is redone in this style
  { src: "/splash-door.webp",        w: W, h: H, lights: [[82, 60], [57, 77]] },          // the door, through the arch
  { src: "/splash-mint.webp",        w: W, h: H, lights: [[50, 86], [60, 34]] },          // the Mint Below
  { src: "/splash-observatory.webp", w: W, h: H, lights: [[56, 64.5]] },                  // the observatory
  { src: "/splash-vault.webp",       w: W, h: H, lights: [[37, 84.5], [41, 53]] },        // the vault
  { src: "/splash-longnight.webp",   w: W, h: H, lights: [[66, 66], [62, 57]], season: "frost26" },   // the Long Night
];
function pickArt() {
  const ev = eventOn(localDay(Date.now(), -new Date().getTimezoneOffset()));
  const own = ev && ARTS.filter(a => a.season === ev.season);
  if (own?.length && Math.random() < 0.5) return own[Math.floor(Math.random() * own.length)];
  const all = ARTS.filter(a => !a.season);
  return all[Math.floor(Math.random() * all.length)];
}
function Art() {
  const [missing, setMissing] = useState(false);
  const [ART] = useState(pickArt);
  if (missing) return (
    <div aria-hidden style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center",
                              background: "radial-gradient(circle at 50% 42%, #2a1d0c 0, #0b0805 45%, #000 80%)" }}>
      <Candle/>
    </div>
  );
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", translate: "-50% -50%",
                    width: `max(100vw, calc(100dvh * ${ART.w / ART.h}))`, aspectRatio: `${ART.w} / ${ART.h}` }}>
        <img src={ART.src} alt="" onError={() => setMissing(true)} style={{ width: "100%", height: "100%", display: "block" }}/>
        {/* each warm light: the room breathing with it, and a halo round it */}
        {ART.lights.map(([fx, fy], i) => (
          <span key={i}>
            <span className="candle-room" style={{ "--fx": fx + "%", "--fy": fy + "%", animationDelay: -i * 0.7 + "s" }}/>
            <span className="candle-halo" style={{ left: fx + "%", top: fy + "%", animationDelay: -i * 0.7 + "s" }}/>
          </span>
        ))}
      </div>
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

/* The game's logo (public/logo.png), alive: a glint crossing the letters
 * now and then, embers rising from under it, a faint ring turning behind.
 * The effects are drawn here rather than baked into the image, so they
 * stay sharp at any size. Without the image, the name in type. */
const EMBERS = Array.from({ length: 14 }, (_, i) => ({ x: 30 + ((i * 37) % 41), d: (i * 0.53) % 3.2, t: 2.4 + (i % 4) * 0.5, s: i % 3 ? 2 : 3 }));
function GameLogo() {
  const [img, setImg] = useState(true);
  if (!img) return <h1 className="t-big" style={{ margin: 0, fontSize: 40, letterSpacing: ".12em", color: "#f3d48a", textShadow: "0 4px 0 #3a2410, 0 0 24px #f0b05055" }}>MINTFORGE</h1>;
  return (
    <div className="logo-live" style={{ width: "min(86vw, 400px)" }}>
      <span className="logo-ring" aria-hidden/>
      {EMBERS.map((e, i) => <span key={i} className="logo-ember" aria-hidden
        style={{ left: e.x + "%", width: e.s, height: e.s, animationDelay: e.d + "s", animationDuration: e.t + "s" }}/>)}
      <img src="/logo.png" alt="MintForge" onError={() => setImg(false)} style={{ width: "100%", height: "auto", display: "block", position: "relative" }}/>
      <span className="logo-glint" aria-hidden/>
    </div>
  );
}

/* the bar: a forged trough, filling with molten gold */
function Bar({ progress }) {
  const p = Math.round(Math.max(0, Math.min(1, progress)) * 1000) / 10;
  return (
    <div className="forge-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)} aria-label="Loading">
      <i style={{ width: p + "%" }}/>
    </div>
  );
}

export function Splash({ progress = 0, line }) {
  return (
    <main className="app splash-in" aria-busy="true" style={{ position: "relative", background: "#000", overflow: "hidden" }}>
      <Art/>
      {/* the name up top, the bar along the foot, over a darkening at each edge */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(#000c, transparent 28%, transparent 68%, #000e)" }}/>
      <div style={{ position: "absolute", left: 0, right: 0, top: "calc(env(safe-area-inset-top, 0px) + 9vh)", textAlign: "center" }}>
        <GameLogo/>
      </div>
      <div style={{ position: "absolute", left: 24, right: 24, bottom: "calc(env(safe-area-inset-bottom, 0px) + 7vh)", display: "grid", gap: 10, justifyItems: "center" }}>
        <Bar progress={progress}/>
        <p className="t-dim" role="status" style={{ margin: 0, minHeight: "1.4em" }}>{line}</p>
      </div>
    </main>
  );
}
