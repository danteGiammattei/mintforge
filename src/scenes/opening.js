/* ══════════════════════════════════════════════════════════════════════
 *  The beginning, told once
 *  ────────────────────────────────────────────────────────────────────
 *  Six panels, one line each, typed on. Tap to hurry a line, tap again
 *  for the next panel; each moves on by itself after a while. The last
 *  is the desk: the candle, the ink, a blank sheet, and the line "THE
 *  INK IS FRESH. BEGIN." Then something breathes through the room and
 *  the candle goes out: the flame leans, stretches, tears and is gone,
 *  a thread of smoke rises out of the dark, and the story is over.
 *
 *    bus.done()       the story is told (or skipped from outside)
 *    bus.feel(name)   sound + haptics hook
 *    bus.say(text)    for the aria-live region
 * ══════════════════════════════════════════════════════════════════════ */

import { stage, FONT, INK, wrap, ease, rnd } from "./kit.js";
import { mkCoin, drawCoin } from "../lib/coin.js";
import { TOME_BY_ID } from "../../shared/tomes.js";

export const SURROUND = [5, 6, 9];
const W = 195, H = 422;

const PANELS = [
  { draw: town,   line: "THE TOWN SLEEPS. YOU DO NOT." },
  { draw: wall,   line: "THERE IS A DOOR IN THE OLD WALL THAT NO ONE ELSE SEEMS TO SEE." },
  { draw: eyes,   line: "SOMETHING LIVES BEHIND IT. IT DOES NOT SPEAK." },
  { draw: hand,   line: "BUT IT TRADES. COIN, FOR THE RIGHT KIND OF MARK." },
  { draw: book,   line: "YOU FOUND A BOOK OF SIGILS. COPY THEM WELL AND HE PAYS." },
  { draw: candle, line: "THE INK IS FRESH. BEGIN." },
];
const FADE = 24, TYPE = 2, AUTO = 330;          // frames: fade in/out, per letter, before moving on
// the candle's end: gust, the flame torn away, the dark, the smoke
const GUST = 70, SNUFF = 26, DARK = 150;

let ctx, view, S;
const plot = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };
const mix = (a, b, t) => "rgb(" + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",") + ")";

export function mount(cv, bus) {
  S = { t: 0, panel: 0, at: 0, out: -1, blow: -1, smoke: [], said: -1, ended: false };
  const st = stage(cv, { step: frame });
  ctx = st.ctx; view = st.view;
  const coinCv = document.createElement("canvas");
  drawCoin(coinCv, mkCoin(40, 1, 3, undefined, 1), 32);
  S.coin = coinCv;

  function frame() {
    S.t++; S.at++;
    const p = PANELS[S.panel], typed = Math.min(p.line.length, Math.floor(Math.max(0, S.at - FADE) / TYPE));
    if (S.said !== S.panel) { S.said = S.panel; bus.say(p.line); }
    const last = S.panel === PANELS.length - 1;
    // the last panel does not move on: the candle goes out
    if (last && S.blow < 0 && S.at > FADE + p.line.length * TYPE + 120) blowOut();
    if (!last && S.out < 0 && S.at > AUTO + p.line.length * TYPE) next();
    if (S.out >= 0 && ++S.out > FADE) { S.panel++; S.at = 0; S.out = -1; }
    if (S.blow >= 0) S.blow++;
    if (S.blow > GUST + SNUFF + DARK && !S.ended) { S.ended = true; bus.done(); }

    ctx.save();
    // the gust shakes the room a little
    if (S.blow >= 0 && S.blow < GUST + 8 && !view.calm) ctx.translate(Math.round((Math.random() - 0.5) * 2 * (1 - S.blow / (GUST + 8))), 0);
    p.draw(S.at);
    ctx.restore();
    caption(p.line.slice(0, typed), typed >= p.line.length);
    // fades in and out of black
    const k = S.out >= 0 ? S.out / FADE : Math.max(0, 1 - S.at / FADE);
    if (k > 0) { ctx.globalAlpha = Math.min(1, k); plot(0, 0, W, H, "#050609"); ctx.globalAlpha = 1; }
  }
  function next() { if (S.out < 0 && S.panel < PANELS.length - 1) { S.out = 0; bus.feel("tap"); } }
  function blowOut() { if (S.blow < 0) { S.blow = 0; bus.feel("snuff"); } }

  function tap() {
    const p = PANELS[S.panel];
    if (S.at < FADE + p.line.length * TYPE) { S.at = FADE + p.line.length * TYPE; return; }   // finish the line
    if (S.panel === PANELS.length - 1) blowOut(); else next();
  }
  cv.addEventListener("pointerup", tap);
  return { stop() { cv.removeEventListener("pointerup", tap); st.stop(); }, tap };
}

function caption(text, whole) {
  if (S.blow >= 0) ctx.globalAlpha = Math.max(0, 1 - S.blow / GUST);
  ctx.font = FONT; ctx.textAlign = "center"; ctx.fillStyle = INK.coldHi;
  const rows = wrap(text, 26);
  rows.forEach((r, i) => ctx.fillText(r, W / 2, 352 + i * 11));
  if (whole && S.blow < 0 && (view.calm || (S.t >> 5) & 1)) {
    ctx.fillStyle = INK.cold; ctx.fillText("TAP", W / 2, 402);
  }
  ctx.globalAlpha = 1;
}

/* ─── the panels ─────────────────────────────────────────────────────── */

function sky(top, bottom) {
  for (let y = 0; y < 330; y++) plot(0, y, W, 1, mix(top, bottom, y / 330));
  const r = rnd(7);
  for (let i = 0; i < 46; i++) {
    const x = r() * W, y = r() * 170, tw = view.calm ? 1 : 0.5 + 0.5 * Math.sin(S.t * 0.04 + i);
    ctx.globalAlpha = 0.35 + 0.5 * tw * r(); plot(x, y, 1, 1, "#c8d0e0");
  }
  ctx.globalAlpha = 1;
}

// a dark town, one lit window
function town() {
  sky([4, 5, 12], [14, 16, 26]);
  plot(150, 40, 9, 9, "#c9c6b0"); plot(151, 41, 7, 7, "#e0dcc4");                   // the moon
  const r = rnd(3);
  let x = -4;
  while (x < W) {
    const w = 16 + ((r() * 18) | 0), h = 60 + ((r() * 70) | 0), top = 330 - h;
    plot(x, top, w, h, "#0a0b11");
    for (let k = 0; k < w / 2; k++) plot(x + k, top - k * 0.8, w - 2 * k, 1, "#0a0b11");   // the roof
    x += w + 1;
  }
  plot(0, 330, W, 92, "#07080c");
  const flick = view.calm ? 1 : 0.85 + 0.1 * Math.sin(S.t * 0.09) + 0.05 * Math.random();
  ctx.globalAlpha = 0.18 * flick; plot(84, 238, 22, 20, "#e0a050"); ctx.globalAlpha = 1;      // its glow
  plot(90, 244, 10, 9, mix([120, 70, 20], [240, 180, 90], flick));                            // your window
  plot(94, 244, 1, 9, "#0a0b11"); plot(90, 248, 10, 1, "#0a0b11");
}

// an old wall, and a door with a thin line of light
function wall() {
  sky([3, 4, 9], [9, 10, 16]);
  for (let y = 120; y < 330; y += 7) for (let x = ((y / 7) & 1) * -6; x < W; x += 12) {
    const k = 0.5 + 0.5 * Math.sin(x * 3.1 + y * 1.7);
    plot(x, y, 11, 6, mix([18, 18, 22], [30, 29, 33], k));
  }
  plot(0, 330, W, 92, "#07080c");
  // the door, in the wall's shadow
  plot(72, 196, 52, 134, "#0b0c10");
  for (let k = 0; k < 26; k++) plot(72 + k, 196 - Math.sqrt(26 * 26 - (k - 26) * (k - 26)) * 0.5, 52 - 2 * k, 1, "#0b0c10");
  plot(76, 200, 44, 130, "#15130f");
  for (let x = 80; x < 118; x += 9) plot(x, 200, 1, 130, "#0e0d0a");
  // the line of light it leaves open
  const g = view.calm ? 1 : 0.8 + 0.2 * Math.sin(S.t * 0.07);
  ctx.globalAlpha = 0.25 * g; plot(95, 200, 7, 130, "#5fa0a0"); ctx.globalAlpha = 1;
  plot(98, 202, 1, 128, mix([60, 110, 110], [150, 220, 210], g));
}

// the gap, close, and two green eyes
function eyes(at) {
  plot(0, 0, W, 330, "#050609");
  plot(0, 0, 70, 330, "#14120e"); plot(125, 0, 70, 330, "#14120e");                          // the door's two leaves
  for (let x = 4; x < 70; x += 13) plot(x, 0, 1, 330, "#0d0c09");
  for (let x = 130; x < 195; x += 13) plot(x, 0, 1, 330, "#0d0c09");
  plot(69, 0, 1, 330, "#3a5050"); plot(125, 0, 1, 330, "#3a5050");
  plot(0, 330, W, 92, "#050609");
  // they open slowly, then blink once
  const open = Math.min(1, Math.max(0, (at - 60) / 50)), blink = at > 200 && at < 208;
  if (open > 0 && !blink) {
    const h = Math.max(1, Math.round(3 * open)), y = 150 - (h >> 1);
    for (const ex of [84, 106]) {
      ctx.globalAlpha = 0.25 * open; plot(ex - 3, y - 3, 11, h + 6, "#7ad05a"); ctx.globalAlpha = 1;
      plot(ex, y, 5, h, "#9fe07a"); plot(ex + 2, y, 1, h, "#1a2a10");
    }
  }
}

// a thin hand pushes a coin through the gap; it glints
function hand(at) {
  eyes(400);
  const k = ease(Math.min(1, Math.max(0, (at - 30) / 90))), reach = Math.round(16 * k);
  const skin = "#4f6048", lit = "#6c7e5e", dark = "#2c3828";
  // the wrist, out of the gap, and the back of the hand
  plot(96 - reach * 0.3, 232, 30, 9, dark);
  plot(88 - reach, 228, 18 + reach * 0.7, 14, skin); plot(88 - reach, 228, 18 + reach * 0.7, 2, lit);
  // three long fingers, each in two joints, curled round the coin's edge
  [[226, 12], [233, 14], [240, 11]].forEach(([y, len], i) => {
    const x0 = 88 - reach;
    plot(x0 - len, y + i, len, 3, skin); plot(x0 - len, y + i, len, 1, lit);
    plot(x0 - len - 6, y + i + 1, 7, 2, skin);                         // the last joint, bent down
    plot(x0 - len - 7, y + i + 2, 2, 2, "#8a9a70");                    // a long nail
    plot(x0 - Math.round(len / 2), y + i, 1, 3, dark);                 // the knuckle
  });
  // the thumb, under, pinning it
  plot(84 - reach, 244, 10, 3, skin); plot(80 - reach, 245, 4, 2, "#8a9a70");
  ctx.drawImage(S.coin, 70 - reach - 30, 222);
  // the glint
  const g = (at - 130) % 120;
  if (k >= 1 && g >= 0 && g < 18 && !view.calm) {
    const s = g < 9 ? g : 18 - g, gx = 70 - reach - 20, gy = 228;
    ctx.globalAlpha = 0.9; plot(gx - s, gy, 2 * s + 1, 1, "#fff6c8"); plot(gx, gy - s, 1, 2 * s + 1, "#fff6c8"); ctx.globalAlpha = 1;
  }
}

// the desk, by candlelight: shared by the book and the candle panels
function desk(light) {
  plot(0, 0, W, H, "#080705");
  for (let y = 0; y < 330; y++) {
    const d = Math.hypot((y - 150) / 1.4, 0) / 230, k = Math.max(0, 1 - d) * light;
    plot(0, y, W, 1, mix([8, 7, 5], [40, 30, 18], k * k));
  }
  for (let y = 200; y < 330; y++) plot(0, y, W, 1, mix([10, 8, 6], [58, 42, 24], Math.max(0, 1 - (y - 200) / 160) * light));
  plot(0, 200, W, 1, mix([10, 8, 6], [80, 60, 34], light));
}

function sheet(x, y, w, h, light) {
  plot(x, y, w, h, mix([20, 17, 12], [190, 172, 136], light));
  plot(x, y + h, w, 1, mix([8, 7, 5], [90, 76, 56], light));
}

// an old book, open at a sigil that draws itself in
function book(at) {
  desk(1);
  sheet(28, 232, 68, 84, 0.9); sheet(99, 232, 68, 84, 0.95);
  plot(96, 230, 3, 88, "#3a2814");
  const page = TOME_BY_ID.primer.pages.find(p => p.id === "mercury") || TOME_BY_ID.primer.pages[0];
  const pts = page.strokes.flat(), shown = Math.min(pts.length, Math.floor(Math.max(0, at - 40) / 2));
  let n = 0;
  for (const st of page.strokes) for (let i = 1; i < st.length; i++) {
    if (++n > shown) break;
    const [a, b] = [st[i - 1], st[i]], steps = 6;
    for (let s = 0; s <= steps; s++) plot(108 + (a[0] + (b[0] - a[0]) * s / steps) * 50, 248 + (a[1] + (b[1] - a[1]) * s / steps) * 50, 1, 1, "#2a1a10");
  }
  ctx.font = FONT; ctx.textAlign = "left"; ctx.fillStyle = "#5a4630"; ctx.fillText(page.name, 36, 250);
  candleAt(18, 196, 1, 0, at);
}

// a soft halo of candlelight, falling off in dithered rings
function glow(cx, cy, r, a) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y * 1.15) / r;
    if (d >= 1) continue;
    const k = (1 - d) * (1 - d), odd = ((x + y) & 1) ? 0.85 : 1;
    ctx.globalAlpha = a * k * odd; plot(cx + x, cy + y, 1, 1, "#e0a050");
  }
  ctx.globalAlpha = 1;
}

/* the candle, its flame and its light: `gust` 0..1 leans and tears the
 * flame, `left` 1..0 is how much of it remains */
function candleAt(x, top, left, gust, at) {
  plot(x - 4, top, 9, 210 - top, "#d8cbb0"); plot(x + 2, top, 3, 210 - top, "#b8a888");
  plot(x - 6, 208, 13, 3, "#3a2c1c");
  plot(x, top - 4, 1, 4, "#1a1410");                                                    // the wick
  if (left <= 0) return;
  const sway = view.calm ? 0 : Math.sin(at * 0.07) * 0.6 + (Math.random() - 0.5) * 0.4;
  const lean = sway + gust * 12, tall = (14 + gust * 9) * left, wide = Math.max(1, 5 * left * (1 - gust * 0.55));
  glow(x + lean * 0.5, top - 12, 26, 0.22 * left);
  for (let i = 0; i < tall; i++) {
    const f = i / tall, w = Math.max(1, Math.round(wide * Math.sin(Math.PI * Math.min(1, (1 - f) * 1.3)))), dx = Math.round(lean * f * f);
    plot(x - (w >> 1) + dx, top - 5 - i, w, 1, f < 0.25 ? "#ffe8a8" : f < 0.6 ? "#f0b050" : "#c06020");
  }
}

// the candle, the ink, a blank sheet; then the candle goes out
function candle(at) {
  const b = S.blow;
  const gust = b < 0 ? 0 : Math.min(1, b / GUST);
  const left = b < 0 ? 1 : b < GUST ? 1 - 0.25 * gust : Math.max(0, 1 - (b - GUST) / SNUFF) * 0.75;
  const flick = view.calm ? 1 : 0.92 + 0.08 * Math.sin(S.t * 0.11) + 0.05 * Math.random();
  const light = left * flick * (b >= GUST ? 0.75 : 1);
  desk(light);
  sheet(70, 236, 84, 92, light);
  // the inkwell and its pen
  plot(36, 256, 18, 16, mix([6, 6, 8], [26, 26, 34], light)); plot(39, 253, 12, 3, mix([6, 6, 8], [46, 44, 52], light));
  plot(44, 226, 1, 30, mix([8, 7, 5], [120, 100, 70], light));
  candleAt(22, 150, left, gust, at);
  // the breath that does it: streaks of air across the desk
  if (b >= 0 && b < GUST + 10 && !view.calm) {
    for (let i = 0; i < 9; i++) {
      const y = 110 + i * 11 + Math.sin(i * 7) * 4, x = ((b * 7 + i * 41) % (W + 60)) - 30;
      ctx.globalAlpha = 0.12 * Math.sin(Math.PI * Math.min(1, b / (GUST + 10))); plot(x, y, 26 + (i % 3) * 8, 1, "#c8c0b0");
    }
    ctx.globalAlpha = 1;
  }
  // when it is out, a thread of smoke rises from the wick
  if (b >= GUST + SNUFF - 4) {
    if (!view.calm && b % 3 === 0 && b < GUST + SNUFF + DARK - 40) S.smoke.push({ x: 22, y: 145, a: 0.65, s: Math.random() * 6 });
    for (const m of S.smoke) {
      m.y -= 0.45; m.x += Math.sin((m.y + m.s * 9) * 0.06) * 0.35 + 0.08; m.a *= 0.985;
      ctx.globalAlpha = m.a; plot(m.x, m.y, m.a > 0.3 ? 2 : 1, 1, "#a09a8c");
    }
    ctx.globalAlpha = 1;
    S.smoke = S.smoke.filter(m => m.a > 0.03);
    // the wick's last ember
    const e = Math.max(0, 1 - (b - GUST - SNUFF) / 60);
    if (e > 0) plot(22, 146, 1, 1, mix([20, 10, 6], [230, 90, 30], e));
  }
}
