/* ══════════════════════════════════════════════════════════════════════
 *  The chest ceremony
 *  ────────────────────────────────────────────────────────────────────
 *  LIGHT: the same candle as the desk — low, left, in front. When the
 *  seal gives, the chest briefly becomes a second source of its own.
 *
 *  Hold to break the seal. There is no skill in it and it cannot fail:
 *  letting go only lets the strain ease back. It is here so that a chest
 *  is opened, not clicked.
 *
 *    bus.open()        → Promise<{ coin }>   asked once, when the seal gives
 *    bus.done(coin)    the dusty coin is in hand; the ceremony is over
 *    bus.say(text)     for the aria-live region
 *    bus.feel(name)    sound + haptics hook
 * ══════════════════════════════════════════════════════════════════════ */

import { chestParts, CHEST, dirtClod } from "../lib/forms.js";
import { presentParts, PRESENT, giftFrame, GIFT } from "../lib/presentArt.js";
import { chestClosed, chestOpening, chestHeight, CHEST_W, OPEN_FRAMES, RATTLE, OPEN_FROM } from "../lib/chestArt.js";
import { CHESTS } from "../../shared/tuning.js";
import { RARITIES } from "../lib/data.js";
import { stage, FONT, INK, lerp, ease, feather } from "./kit.js";

export const SURROUND = [8, 7, 5];

export const CW = 195, CH = 260;
const SC = 3;                         // sprites are drawn at 3×, never between

export function mount(cv, bus, { tier = 0, season = null, look = 0 } = {}) {
  const S = {
    t: 0, p: 0, held: false,
    phase: "hold",                    // hold | breaking | risen
    anim: 0, coin: null, failed: false, line: "",
    motes: [], sparks: [], lit: 0,       // lit: frames since the coin's light began
  };
  const { ctx, view, stop } = stage(cv, { w: CW, h: CH, step: frame });
  const plot = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };
  const parts = chestParts(tier, "candle"), body = parts.body, lid = parts.lid;
  const bx = Math.round((CW - CHEST.w * SC) / 2), by = 92;
  // on the Long Night it is a present (lib/presentArt.js): its lid, bow
  // and all, lifts off the box and is gone
  const gift = season ? presentParts(look) : null;
  // the drawn chest, when its sheets are loaded: 32px frames at a whole 4×,
  // standing on the same table line as the procedural one
  const drawn = !gift && !!chestClosed(tier, "candle"), DS = 3;
  const dyBase = by + CHEST.h * SC - chestHeight(tier) * DS + 6;
  let alive = true;

  function frame() {
    S.t++;
    if (S.phase === "hold") {
      const before = S.p;
      S.p = Math.max(0, Math.min(1, S.p + (S.held ? 1 / 84 : -0.02)));
      if (S.held && Math.floor(S.p * 6) > Math.floor(before * 6)) bus.feel("strain");
      if (S.p >= 1) breakSeal();
    } else S.anim++;

    // the room and the table, by candlelight
    const flick = view.calm ? 0.95 : 0.9 + Math.sin(S.t * 0.05) * 0.06 + Math.random() * 0.03;
    plot(0, 0, CW, CH, "#080705");
    for (let y = 150; y < CH; y++) {
      const k = Math.max(0, 1 - (y - 150) / 120) * flick;
      plot(0, y, CW, 1, "rgb(" + Math.round(12 + 30 * k) + "," + Math.round(10 + 23 * k) + "," + Math.round(7 + 13 * k) + ")");
    }
    plot(0, 150, CW, 2, "#2f2518");
    feather(ctx, SURROUND, 16, CW, CH);

    const shake = (S.phase === "hold" && S.held && !view.calm) ? Math.round(Math.sin(S.t * 1.3) * S.p * 2) : 0;
    const x = bx + shake;
    const dx = Math.round((CW - CHEST_W * DS) / 2) + shake, dy = dyBase;

    // what is inside shows first as light through the seam
    const strain = S.phase === "hold" ? S.p : Math.max(0, 1 - S.anim / 50);
    if (strain > 0.25) {
      const g = ctx.createRadialGradient(CW / 2, by + CHEST.lidH * SC, 2, CW / 2, by + CHEST.lidH * SC, 30 + strain * 60);
      g.addColorStop(0, "rgba(236,196,110," + (0.45 * strain) + ")");
      g.addColorStop(1, "rgba(236,196,110,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
    }

    const painted = gift && giftFrame(look, 0);
    if (painted) {
      // the painted present (lib/presentArt.js): held, it squashes and
      // stretches against its ribbon; let go of, it bursts open, the lid
      // flung off and the sides falling flat
      let f = 0;
      if (S.phase === "hold") f = S.held && !view.calm && S.p > 0.25 ? [0, 1, 0, 2][(S.t >> (S.p > 0.7 ? 1 : 2)) % 4] : 0;
      else if (S.failed) f = 0;
      else f = Math.min(GIFT.frames - 1, 2 + Math.floor(S.anim / (view.calm ? 1 : 7)));
      const im = giftFrame(look, f), GS = 3;
      ctx.drawImage(im, Math.round((CW - GIFT.w * GS) / 2) + shake, 150 + 6 - GIFT.h * GS, GIFT.w * GS, GIFT.h * GS);
    } else if (gift) {
      // the box stands on the table; held, the lid strains and hops on
      // its ribbon; broken, it rises off, tipping, and fades
      const PW = PRESENT.w * SC, px = Math.round((CW - PW) / 2) + shake, boxY = 150 + 6 - 16 * SC;
      ctx.drawImage(gift.box, px, boxY, PW, 16 * SC);
      let ly = boxY - 16 * SC, la = 1, tilt = 0;
      if (S.phase === "hold") { if (S.held && !view.calm && S.p > 0.25 && ((S.t >> (S.p > 0.7 ? 1 : 2)) % 3 === 0)) ly -= SC; }
      else if (!S.failed) { const k = ease(Math.min(1, S.anim / 34)); ly -= Math.round(k * 60); la = 1 - k * k; tilt = k * 0.35; }
      if (la > 0.02) {
        ctx.save(); ctx.globalAlpha = la; ctx.translate(px + PW / 2, ly + 16 * SC); ctx.rotate(-tilt);
        ctx.drawImage(gift.lid, -PW / 2, -16 * SC, PW, 16 * SC); ctx.restore();
      }
      if (S.phase === "hold" && S.p > 0.3) {                // light at the seam
        ctx.globalAlpha = Math.min(1, (S.p - 0.3) * 1.6);
        plot(px + 2 * SC, boxY - 1, PW - 4 * SC, 2, "#ecc46e");
        ctx.globalAlpha = 1;
      }
    } else if (drawn) {
      // held: the lid jumps against the lock, more often as the seal
      // strains; broken: it swings up through the open frames
      let f = null;
      if (S.phase === "hold") {
        const jump = S.held && !view.calm && S.p > 0.25 && ((S.t >> (S.p > 0.7 ? 1 : 2)) % 3 === 0);
        f = jump ? chestOpening(tier, "candle", RATTLE) : chestClosed(tier, "candle");
      } else if (S.failed) f = chestClosed(tier, "candle");
      else f = chestOpening(tier, "candle", Math.min(OPEN_FRAMES - 1, OPEN_FROM + Math.floor(S.anim / (view.calm ? 1 : 6))));
      ctx.drawImage(f, dx, dy, CHEST_W * DS, f.height * DS);
    } else {
      ctx.drawImage(body, x, by, CHEST.w * SC, CHEST.h * SC);
      let lidY = by, lidA = 1;
      if (S.phase !== "hold" && !S.failed) { const k = ease(Math.min(1, S.anim / 34)); lidY = by - Math.round(k * 46); lidA = 1 - k; }
      if (lidA > 0.02) { ctx.globalAlpha = lidA; ctx.drawImage(lid, x, lidY, CHEST.w * SC, CHEST.lidH * SC); ctx.globalAlpha = 1; }
      if (S.phase === "hold" && S.p > 0.3) {               // the seam, splitting
        ctx.globalAlpha = Math.min(1, (S.p - 0.3) * 1.6);
        plot(x + 12, by + CHEST.lidH * SC - 3, CHEST.w * SC - 24, 3, "#ecc46e");
        ctx.globalAlpha = 1;
      }
    }

    // the coin's light, pouring up out of the open chest: its rarity's
    // colour, brighter and wider the finer it is; rays from rare, and
    // sparks rising from epic
    if (S.phase !== "hold" && S.coin) shine(Math.max(0, Math.min(RARITIES.length - 1, S.coin.rarity ?? 0)));

    // dust thrown up when it gives
    for (let i = S.motes.length - 1; i >= 0; i--) {
      const m = S.motes[i]; m.x += m.vx; m.y += m.vy; m.vy += 0.03; m.life -= 0.016;
      if (m.life <= 0) { S.motes.splice(i, 1); continue; }
      ctx.globalAlpha = m.life; plot(m.x, m.y, 2, 2, "#6a4220"); ctx.globalAlpha = 1;
    }

    // and the coin, which is all dirt
    if (S.phase !== "hold" && S.coin) {
      const rise = drawn ? (view.calm ? 6 : 26) : gift ? (giftFrame(look, 0) ? 14 : 20) : 30;    // once the lid is up
      const k = ease(Math.min(1, Math.max(0, (S.anim - rise) / 50)));
      if (S.anim > rise) {
        const sp = dirtClod(S.coin.seed);
        ctx.drawImage(sp, Math.round(CW / 2 - sp.width * SC / 2), Math.round(lerp(by + 30, by - 56, k)), sp.width * SC, sp.height * SC);
      }
      if (k >= 1 && S.phase !== "risen") { S.phase = "risen"; say("A COIN, THICK WITH DUST."); bus.feel("coin"); }
    }

    ctx.font = FONT; ctx.textAlign = "center";
    ctx.fillStyle = INK.warm;
    ctx.fillText(gift ? "A PRESENT FOR THE LONG NIGHT" : CHESTS.names[tier] + " CHEST", CW / 2, 22);
    if (S.phase === "hold") {
      ctx.fillStyle = INK.warmHi;
      ctx.fillText(S.line || (gift ? "HOLD TO PULL THE RIBBON" : "HOLD TO BREAK THE SEAL"), CW / 2, 224);
      plot(48, 234, 99, 5, "#1d1812");
      plot(48, 234, Math.round(99 * S.p), 5, "#bb9030");
    } else if (S.phase === "risen") {
      ctx.fillStyle = INK.warmHi;
      ctx.fillText("A COIN, THICK WITH DUST.", CW / 2, 224);
      ctx.fillStyle = INK.warm;
      ctx.fillText("TAP TO TAKE IT", CW / 2, 240);
    }
  }

  function shine(r) {
    S.lit++;
    const col = RARITIES[r].color, rgb = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16)).join(",");
    const k = Math.min(1, S.lit / 30);                       // swelling in as the lid goes
    const beat = view.calm ? 1 : 0.85 + Math.sin(S.t * (0.06 + r * 0.015)) * 0.15;
    const mouth = gift ? 150 - 16 * SC : by + CHEST.lidH * SC;
    const power = (0.24 + r * 0.08) * k * beat, reach = 44 + r * 14;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    // a pool of light at the mouth, spilling upward
    const g = ctx.createRadialGradient(CW / 2, mouth, 2, CW / 2, mouth - 10, reach);
    g.addColorStop(0, `rgba(${rgb},${Math.min(0.7, power)})`);
    g.addColorStop(0.45, `rgba(${rgb},${Math.min(0.7, power) * 0.35})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);              // spilling onto the table too: no edge
    // rays: columns of light fanning up out of it, turning slowly
    if (r >= 2) {
      const rays = 3 + r * 2, spin = view.calm ? 0 : S.t * 0.004;
      for (let i = 0; i < rays; i++) {
        const a = -Math.PI / 2 + (i - (rays - 1) / 2) * (1.5 / rays) + Math.sin(spin + i * 1.7) * 0.08;
        const len = reach * (1.2 + ((i * 37) % 5) / 8), w = 3 + (i % 3) * 2;
        ctx.globalAlpha = power * (0.35 + ((i * 13) % 4) / 10);
        for (let d = 6; d < len; d += 3) {
          const fade = 1 - d / len, x = CW / 2 + Math.cos(a) * d, y = mouth + Math.sin(a) * d;
          ctx.fillStyle = `rgba(${rgb},${fade})`;
          ctx.fillRect(Math.round(x - w / 2), Math.round(y), w, 3);
        }
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // sparks, on whole pixels, rising and going out
    if (r >= 3 && !view.calm && S.t % Math.max(1, 6 - r) === 0)
      S.sparks.push({ x: CW / 2 + (Math.random() - 0.5) * 60, y: mouth, vy: -0.4 - Math.random() * 0.8, life: 1 });
    for (let i = S.sparks.length - 1; i >= 0; i--) {
      const m = S.sparks[i]; m.y += m.vy; m.x += Math.sin((S.t + i * 9) * 0.1) * 0.3; m.life -= 0.012;
      if (m.life <= 0) { S.sparks.splice(i, 1); continue; }
      ctx.globalAlpha = m.life; plot(m.x, m.y, 2, 2, m.life > 0.6 ? "#fff8e8" : col); ctx.globalAlpha = 1;
    }
  }

  function say(text) { S.line = text; bus.say(text); }

  function breakSeal() {
    S.phase = "breaking"; S.anim = 0; S.held = false; S.failed = false;
    bus.feel("break");
    if (!view.calm) for (let i = 0; i < 26; i++)
      S.motes.push({ x: CW / 2 + (Math.random() - 0.5) * 100, y: by + 48, vx: (Math.random() - 0.5) * 1.6, vy: -Math.random() * 1.8, life: 0.6 + Math.random() * 0.4 });
    bus.open().then(r => { if (alive) S.coin = r.coin; }, () => {
      if (!alive) return;
      // the lid drops back: nothing was opened, nothing was lost
      S.failed = true; S.phase = "hold"; S.p = 0; S.motes = []; S.sparks = []; S.lit = 0;
      say("THE LOCK HOLDS. TRY AGAIN."); bus.feel("error");
    });
  }

  const onDown = e => {
    if (S.phase === "hold") { S.held = true; S.line = ""; cv.setPointerCapture?.(e.pointerId); }
    else if (S.phase === "risen") bus.done(S.coin);
  };
  const onUp = () => { S.held = false; };
  const onKey = e => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (e.type === "keydown") onDown(e); else onUp();
  };
  cv.addEventListener("pointerdown", onDown);
  cv.addEventListener("pointerup", onUp);
  cv.addEventListener("pointercancel", onUp);
  cv.addEventListener("pointerleave", onUp);
  cv.addEventListener("keydown", onKey);
  cv.addEventListener("keyup", onKey);

  return () => {
    alive = false; stop();
    cv.removeEventListener("pointerdown", onDown);
    cv.removeEventListener("pointerup", onUp);
    cv.removeEventListener("pointercancel", onUp);
    cv.removeEventListener("pointerleave", onUp);
    cv.removeEventListener("keydown", onKey);
    cv.removeEventListener("keyup", onKey);
  };
}
