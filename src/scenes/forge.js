/* ══════════════════════════════════════════════════════════════════════
 *  The forge
 *  ────────────────────────────────────────────────────────────────────
 *  LIGHT: a bed of coals, low and to the right, in front of everything.
 *  Orange, and the only light in the room.
 *
 *  A coin on the anvil, a hammer above it. Each strike costs marks and
 *  may leave a shine on the coin; it never harms it. The scene shows the
 *  blow and the answer — the price, the purse and the button are HTML,
 *  outside the canvas.
 *
 *    bus.coin()        the coin on the anvil (re-read after each strike)
 *    bus.say(text)     for the aria-live region
 *    bus.feel(name)    sound + haptics hook
 *
 *  mount() returns its teardown with one method on it:
 *    .strike(promise)  play a blow; `promise` resolves to { shiny }
 *
 *  The coin itself is painted by lib/coin.js, as everywhere.
 * ══════════════════════════════════════════════════════════════════════ */

import { anvil, ANVIL, hammer, HAMMER } from "../lib/forms.js";
import { drawCoin } from "../lib/coin.js";
import { stage, FONT, INK, lerp, ease, feather } from "./kit.js";

export const FW = 195, FH = 280;
export const SURROUND = [8, 6, 5];
const SC = 3, HS = 2, COIN = 64;

export function mount(cv, bus) {
  const S = {
    t: 0, phase: "rest",             // rest | wind | drop | held | lift
    anim: 0, answer: null, failed: null,
    line: "", lineCol: INK.warmHi, flash: 0, shake: 0,
    sparks: [], motes: [],
    coals: Array.from({ length: 70 }, () => ({ x: (Math.random() * FW) | 0, y: 264 + ((Math.random() * 14) | 0), p: Math.random() * 6.28, v: 0.03 + Math.random() * 0.06 })),
  };
  const { ctx, view, stop } = stage(cv, { w: FW, h: FH, step: frame });
  const plot = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };
  let alive = true;

  // the coin, painted once per look by the one coin painter
  const coinCv = document.createElement("canvas");
  let painted = "";
  function paintCoin() {
    const c = bus.coin(); if (!c) return;
    const key = c.id + ":" + (c.shiny ? 1 : 0);
    if (key !== painted) { drawCoin(coinCv, c, COIN); painted = key; }
  }

  const ax = Math.round((FW - ANVIL.w * SC) / 2) - 6, ay = 162;
  const cx = ax + ANVIL.face.x * SC, coinY = ay + ANVIL.face.y * SC - COIN + 5;   // the coin stands on the face
  // the hammer hangs over the coin and comes straight down on its rim
  const HX = cx - HAMMER.strike.x * HS;
  const REST = { x: HX, y: coinY - HAMMER.strike.y * HS - 30 };
  const HIT  = { x: HX, y: coinY - HAMMER.strike.y * HS + 4 };

  function say(text, col = INK.warmHi) { S.line = text; S.lineCol = col; bus.say(text); }

  function frame() {
    S.t++;
    paintCoin();
    let k = 0;                                           // 0 at rest, 1 on the coin
    if (S.phase === "wind") { S.anim++; k = -0.18 * ease(Math.min(1, S.anim / 12)); if (S.anim >= 12) { S.phase = "drop"; S.anim = 0; } }
    else if (S.phase === "drop") {
      S.anim++; k = -0.18 + 1.18 * Math.pow(Math.min(1, S.anim / 5), 2);
      if (S.anim >= 5) {
        S.phase = "held"; S.anim = 0; S.flash = 1; S.shake = 6; bus.feel("strike");
        if (!view.calm) for (let i = 0; i < 22; i++) {
          const a = -Math.PI * Math.random();
          S.sparks.push({ x: cx, y: coinY + 4, vx: Math.cos(a) * (0.6 + Math.random() * 2.2), vy: Math.sin(a) * (0.6 + Math.random() * 2.4), life: 0.5 + Math.random() * 0.5 });
        }
      }
    } else if (S.phase === "held") {
      S.anim++; k = 1;
      // the hammer rests on the coin until the answer is in
      if (S.anim > 16 && (S.answer || S.failed)) {
        S.phase = "lift"; S.anim = 0;
        if (S.failed) { say(S.failed, INK.warn); bus.feel("error"); }
        else if (S.answer.shiny) {
          say("IT TOOK THE SHINE.", "#f0c850"); bus.feel("reveal");
          if (!view.calm) for (let i = 0; i < 26; i++) S.motes.push({ x: cx + (Math.random() - 0.5) * 60, y: coinY + 20 + Math.random() * 40, v: 0.2 + Math.random() * 0.5, life: 1 });
        } else { say("NOTHING. THE MARKS ARE SPENT."); bus.feel("dull"); }
      }
    } else if (S.phase === "lift") { S.anim++; k = 1 - ease(Math.min(1, S.anim / 18)); if (S.anim >= 18) { S.phase = "rest"; S.answer = null; S.failed = null; } }

    // the room, by the coals
    const flick = view.calm ? 0.92 : 0.86 + Math.sin(S.t * 0.07) * 0.07 + Math.random() * 0.05;
    plot(0, 0, FW, FH, "#080605");
    const glow = ctx.createRadialGradient(FW * 0.72, FH + 10, 6, FW * 0.72, FH + 10, 210);
    glow.addColorStop(0, `rgba(196,96,36,${0.42 * flick})`); glow.addColorStop(0.5, `rgba(120,50,20,${0.16 * flick})`); glow.addColorStop(1, "rgba(60,24,10,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, FW, FH);
    plot(0, 262, FW, FH - 262, "#120a07");
    for (const c of S.coals) {
      if (!view.calm) c.p += c.v;
      const h = 0.5 + Math.sin(c.p) * 0.5;
      plot(c.x, c.y, 2, 1, h > 0.75 ? "#f0a040" : h > 0.4 ? "#c4601e" : "#5a2410");
    }

    const sh = (S.shake > 0 && !view.calm) ? (S.shake-- % 2 ? 1 : -1) : (S.shake = 0);
    ctx.drawImage(anvil(), ax, ay + sh, ANVIL.w * SC, ANVIL.h * SC);
    ctx.drawImage(coinCv, cx - COIN / 2, coinY + sh);
    const hx = REST.x;
    const hy = Math.round(lerp(REST.y, HIT.y, k));           // k < 0 is the wind-up, above rest
    ctx.drawImage(hammer(), hx, hy, HAMMER.w * HS, HAMMER.h * HS);

    if (S.flash > 0.02) { ctx.globalAlpha = S.flash * (view.calm ? 0.15 : 0.5); plot(0, 0, FW, FH, "#f0a040"); ctx.globalAlpha = 1; S.flash *= 0.78; }
    for (let i = S.sparks.length - 1; i >= 0; i--) {
      const p = S.sparks[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= 0.03;
      if (p.life <= 0) { S.sparks.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life * 2); plot(p.x, p.y, 1, 1, p.life > 0.4 ? "#ffd27a" : "#c4601e"); ctx.globalAlpha = 1;
    }
    for (let i = S.motes.length - 1; i >= 0; i--) {
      const m = S.motes[i]; m.y -= m.v; m.life -= 0.012;
      if (m.life <= 0) { S.motes.splice(i, 1); continue; }
      ctx.globalAlpha = m.life; plot(m.x, m.y, 1, 1, "#fff0a8"); ctx.globalAlpha = 1;
    }

    feather(ctx, SURROUND, 16, FW, FH);
    ctx.font = FONT; ctx.textAlign = "center";
    ctx.fillStyle = INK.warm; ctx.fillText("THE FORGE", FW / 2, 14);
    if (S.line) { ctx.fillStyle = S.lineCol; ctx.fillText(S.line, FW / 2, 28); }
  }

  const teardown = () => { alive = false; stop(); };
  teardown.strike = promise => {
    if (S.phase !== "rest") return false;
    S.phase = "wind"; S.anim = 0; S.answer = null; S.failed = null; S.line = "";
    promise.then(r => { if (alive) S.answer = r; },
                 e => { if (alive) S.failed = (e && e.message ? String(e.message).toUpperCase() : "THE FIRE IS OUT") + "."; });
    return true;
  };
  teardown.busy = () => S.phase !== "rest";
  return teardown;
}
