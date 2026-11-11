/* ══════════════════════════════════════════════════════════════════════
 *  The scribe scene
 *  ────────────────────────────────────────────────────────────────────
 *  LIGHT: one candle, off the left edge of the desk at about sheet
 *  height, in front of everything. Warm, falling off hard to the right.
 *
 *  Same contract as door.js: mount(canvas, bus) → teardown. The scene
 *  collects strokes and nothing else; the judging happens on the server
 *  (shared/sigil.js) and comes back through the bus as a verdict.
 *
 *    bus.seal(strokes)   → Promise<{ scroll: { rarity, seed }, familiar }>
 *    bus.room()          how many more scrolls the satchel will take
 *    bus.firstTime()     true until the player has sealed once
 *    bus.say(text)       for the aria-live region
 *    bus.feel(name)      sound + haptics hook
 *    bus.toDoor()        the satchel is full and the player asked to go
 *
 *  The player is never told what makes a scroll good. Nothing in here
 *  may hint at it.
 * ══════════════════════════════════════════════════════════════════════ */

import { rolledScroll } from "../lib/forms.js";
import { RARITY } from "../../shared/sigil.js";
import { SCRIBE } from "../../shared/tuning.js";
import { stage, pointer, W, H, FONT, INK, rnd, wrap, feather } from "./kit.js";

/* the colour the scene dissolves into at its edges; Scribe.jsx paints the page with it */
export const SURROUND = [8, 7, 5];

export function mount(cv, bus) {

/* the sheet: where ink may land */
const SHEET = { x: 20, y: 84, w: SCRIBE.sheet.w, h: SCRIBE.sheet.h };
const INK_MAX = SCRIBE.inkMax;

const P = { room:"#080705", deskA:"#17120c", deskEdge:"#2f2518", ink:"#17140d" };
const BTN = { undo:[20,304,48,30], clear:[74,304,48,30], seal:[128,304,47,30] };

const S = {
  t: 0, strokes: [], cur: null, ink: 0,
  phase: "draw",           // draw | sealing | sealed
  sealT: 0, result: null,
  note: "", noteA: 0,      // a line under the buttons
  fresh: bus.firstTime(),
};

const { ctx, view, stop } = stage(cv, { step: frame });
const plot = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };

function note(text, hold = 3) { S.note = text; S.noteA = hold; bus.say(text); }

/* ─── the desk, lit by one candle off to the left ─────────────────── */
function drawRoom(flick) {
  plot(0, 0, W, H, P.room);
  // the pool of candlelight, falling off hard
  for (let y = 0; y < H; y++) {
    const d = Math.abs(y - 190) / (H * 0.52);
    const k = Math.max(0, 1 - d * d) * flick;
    if (k <= 0.04) continue;
    const a = [0x0c, 0x0a, 0x07], b = [0x2a, 0x21, 0x14];
    plot(0, y, W, 1, "rgb(" + Math.round(a[0] + (b[0] - a[0]) * k) + "," + Math.round(a[1] + (b[1] - a[1]) * k) + "," + Math.round(a[2] + (b[2] - a[2]) * k) + ")");
  }
  // the desk's far edge
  plot(0, 66, W, 2, P.deskEdge);
  plot(0, 68, W, 3, P.deskA);
}

/* ─── the sheet, pinned flat ──────────────────────────────────────────
 * Lit by the candle off the left edge. Dithered between adjacent tones
 * rather than stepped, or the falloff bands into stripes — and with
 * noise, not a matrix: an ordered grid reads as halftone. It never
 * changes, so it is painted once. */
const sheetLayer = (() => {
  const { w, h } = SHEET;
  const c = document.createElement("canvas"); c.width = w + 4; c.height = h + 4;
  const g = c.getContext("2d");
  const F = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  F(0, 0, w + 4, h + 4, "#0f0c08");
  const LX = -26, LY = 188, RANGE = 276;
  const ramp = ["#191610", "#272218", "#363022", "#47402d", "#5a5139", "#6f6446"];
  const nz = rnd(0xc4d1e7);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const d = Math.hypot(SHEET.x + xx - LX, SHEET.y + yy - LY) / RANGE;
    const k = Math.max(0, Math.min(1, 1.06 - d * d * 1.22));
    const f = k * (ramp.length - 1), lo = Math.floor(f);
    F(2 + xx, 2 + yy, 1, 1, ramp[Math.min(ramp.length - 1, lo + ((f - lo) > nz() ? 1 : 0))]);
  }
  for (const [px0, py0] of [[5, 5], [w - 3, 5], [5, h - 3], [w - 3, h - 3]]) {   // pins at the corners
    F(px0, py0, 2, 2, "#2a2318"); F(px0, py0, 1, 1, "#6e6048");
  }
  return c;
})();

/* ─── the ink ─────────────────────────────────────────────────────── */
function stamp(x, y) { plot(x - 1, y, 3, 1, P.ink); plot(x, y - 1, 1, 3, P.ink); }
function drawStrokes() {
  for (const s of S.strokes) for (let i = 0; i < s.length; i++) {
    if (i) {
      const a = s[i - 1], b = s[i], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
      for (let k = 0; k <= n; k++) stamp(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n);
    } else stamp(s[i].x, s[i].y);
  }
}

/* ─── chrome ──────────────────────────────────────────────────────── */
function drawChrome() {
  ctx.font = FONT;
  ctx.textAlign = "left"; ctx.fillStyle = INK.warm;
  ctx.fillText("SCRIBE", 20, 30);

  // ink remaining
  const frac = Math.max(0, 1 - S.ink / INK_MAX), low = frac < 0.18;
  ctx.textAlign = "right"; ctx.fillStyle = low ? INK.warn : INK.warm;
  ctx.fillText("INK", W - 20, 30);
  plot(W - 20 - 62, 36, 62, 4, "#1d1812");
  plot(W - 20 - 62, 36, Math.round(62 * frac), 4, low ? "#9a5a3a" : "#7d6a44");

  const can = S.strokes.length > 0 && S.phase === "draw", full = bus.room() <= 0;
  btn(BTN.undo, "UNDO", can);
  btn(BTN.clear, "CLEAR", can);
  btn(BTN.seal, full ? "FULL" : "SEAL", can && !full);

  if (full && S.phase === "draw") {
    ctx.textAlign = "center"; ctx.fillStyle = INK.warm;
    ctx.fillText("YOUR SATCHEL IS FULL.", W / 2, 350);
    btn(DOOR_BTN, "TO THE DOOR", true);
  } else if (S.fresh && !S.strokes.length && S.phase === "draw") {
    // the one-time prompt: what to do, never how to do it well. It sits
    // on the desk, not the parchment, where it can be read.
    ctx.textAlign = "center"; ctx.fillStyle = INK.warmHi;
    ctx.fillText("DRAW ANY MARK ON THE SHEET.", W / 2, 350);
    ctx.fillText("THEN SEAL IT.", W / 2, 362);
    ctx.fillStyle = INK.warm;
    ctx.fillText("HE PAYS FOR SCROLLS.", W / 2, 380);
  } else if (S.noteA > 0.01) {
    ctx.globalAlpha = Math.min(1, S.noteA);
    ctx.textAlign = "center"; ctx.fillStyle = INK.warmHi;
    wrap(S.note, 32).forEach((l, i) => ctx.fillText(l, W / 2, 350 + i * 10));
    ctx.globalAlpha = 1;
    S.noteA -= 0.008;
  }
}
const DOOR_BTN = [50, 362, 95, 30];
function btn([x, y, w, h], label, on) {
  plot(x, y, w, h, on ? "#15110c" : "#0d0b08");
  ctx.strokeStyle = on ? "#4a3e2b" : "#1a1610"; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.font = FONT; ctx.textAlign = "center";
  ctx.fillStyle = on ? INK.warmHi : INK.off;
  ctx.fillText(label, x + w / 2, y + h / 2 + 3);
}

/* ─── the seal: the scroll rolls up and the ribbon goes on ────────── */
function drawSeal() {
  const waiting = S.phase === "sealing";
  const k = waiting ? Math.min(0.5, S.sealT / 58) : Math.min(1, S.sealT / 58);
  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const r = S.result;
  const col = r ? RARITY[r.rarity].c : "#3a3226";       // no ribbon colour until the verdict is in

  ctx.globalAlpha = 0.94 * Math.min(1, e * 2);
  plot(0, 0, W, H, `rgb(${SURROUND})`);       // the desk falls away into the room
  ctx.globalAlpha = 1;

  const sp = rolledScroll(col, false);
  const cx = W / 2, cy = 176 - e * 8;
  const sc = e > 0.6 ? 3 : 2;            // integer only — never resample pixels
  ctx.drawImage(sp, Math.round(cx - sp.width * sc / 2), Math.round(cy - sp.height * sc / 2), sp.width * sc, sp.height * sc);

  ctx.font = FONT; ctx.textAlign = "center";
  if (waiting) {
    if (S.sealT > 40) { ctx.fillStyle = INK.warm; ctx.fillText("THE WAX IS SETTING" + ".".repeat(1 + ((S.t / 24) | 0) % 3), W / 2, 246); }
    return;
  }
  if (k > 0.55) {
    ctx.globalAlpha = Math.min(1, (k - 0.55) / 0.3);
    ctx.fillStyle = col;
    ctx.fillText(RARITY[r.rarity].n, W / 2, 246);
    ctx.fillStyle = INK.warm;
    ctx.fillText(r.familiar ? "HE HAS SEEN THIS ONE BEFORE" : "SEALED", W / 2, 262);
    ctx.globalAlpha = 1;
  }
  if (k >= 1) { ctx.fillStyle = INK.warm; ctx.fillText("TAP TO BEGIN ANOTHER", W / 2, 300); }
}

/* ─── loop ────────────────────────────────────────────────────────── */
function frame() {
  S.t++;
  const flick = view.calm ? 0.95 : 0.88 + Math.sin(S.t * 0.05) * 0.07 + Math.sin(S.t * 0.17) * 0.04 + Math.random() * 0.04;
  drawRoom(flick);
  feather(ctx, SURROUND, 16);
  ctx.drawImage(sheetLayer, SHEET.x - 2, SHEET.y - 2);
  drawStrokes();
  drawChrome();
  if (S.phase !== "draw") { S.sealT++; drawSeal(); }
}

/* ─── input ───────────────────────────────────────────────────────── */
const inSheet = p => p.x >= SHEET.x && p.x <= SHEET.x + SHEET.w && p.y >= SHEET.y && p.y <= SHEET.y + SHEET.h;
// buttons take a touch a little above and below what is drawn, so they
// stay a full 44px target on the smallest phones
const hit = (p, b) => p.x >= b[0] && p.x <= b[0] + b[2] && p.y >= b[1] - 4 && p.y <= b[1] + b[3] + 4;

function undo()  { if (S.phase !== "draw") return; S.strokes.pop(); recount(); bus.feel("tap"); }
function clear() { if (S.phase !== "draw") return; S.strokes = []; recount(); bus.feel("tap"); }

const onDown = e => {
  const p = pointer(cv, e);
  if (S.phase === "sealed") { if (S.sealT > 58) newSheet(); return; }
  if (S.phase !== "draw") return;
  if (hit(p, BTN.undo))  return undo();
  if (hit(p, BTN.clear)) return clear();
  if (hit(p, BTN.seal))  return seal();
  if (bus.room() <= 0 && hit(p, DOOR_BTN)) return bus.toDoor();
  if (!inSheet(p) || S.ink >= INK_MAX) return;
  S.cur = [{ x: p.x, y: p.y, t: performance.now() }];
  S.strokes.push(S.cur);
  cv.setPointerCapture?.(e.pointerId);
};
const onMove = e => {
  if (!S.cur || S.phase !== "draw") return;
  const p = pointer(cv, e);
  if (!inSheet(p)) { S.cur = null; return; }
  const last = S.cur[S.cur.length - 1];
  const d = Math.hypot(p.x - last.x, p.y - last.y);
  if (d < 1) return;
  if (S.ink + d > INK_MAX) { S.cur = null; bus.feel("dry"); return; }
  S.ink += d;
  S.cur.push({ x: p.x, y: p.y, t: performance.now() });
};
const onUp = () => { S.cur = null; };
cv.addEventListener("pointerdown", onDown);
cv.addEventListener("pointermove", onMove);
cv.addEventListener("pointerup", onUp);
cv.addEventListener("pointercancel", onUp);

function recount() {
  S.ink = 0;
  for (const s of S.strokes) for (let i = 1; i < s.length; i++)
    S.ink += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
  S.cur = null;
}

let alive = true;
function seal() {
  if (S.phase !== "draw" || !S.strokes.length) return;
  if (bus.room() <= 0) { note("YOUR SATCHEL IS FULL."); return; }
  const rel = S.strokes
    .map(s => s.map(p => ({ x: +(p.x - SHEET.x).toFixed(2), y: +(p.y - SHEET.y).toFixed(2), t: Math.round(p.t) })))
    .filter(s => s.length);
  if (rel.reduce((n, s) => n + s.length, 0) < 4) { note("TOO FAINT TO SEAL. DRAW A LITTLE MORE."); return; }
  S.phase = "sealing"; S.sealT = 0; S.result = null; S.cur = null;
  bus.feel("seal");
  bus.seal(rel).then(res => {
    if (!alive) return;
    S.result = { rarity: res.scroll.rarity, familiar: !!res.familiar };
    S.phase = "sealed"; S.sealT = Math.min(S.sealT, 29); S.fresh = false;
    bus.feel("rarity" + res.scroll.rarity);
    bus.say("SEALED. A " + RARITY[res.scroll.rarity].n + " SCROLL." + (res.familiar ? " HE HAS SEEN THIS ONE BEFORE." : ""));
  }, err => {
    if (!alive) return;
    // nothing was sealed, so nothing is lost: the drawing is still on the sheet
    S.phase = "draw";
    note((err && err.message ? String(err.message).toUpperCase() : "NO ANSWER") + ". YOUR SIGIL IS STILL ON THE SHEET.", 4);
    bus.feel("error");
  });
}
function newSheet() {
  S.strokes = []; S.ink = 0; S.cur = null; S.phase = "draw"; S.result = null;
}

const teardown = () => {
  alive = false; stop();
  cv.removeEventListener("pointerdown", onDown);
  cv.removeEventListener("pointermove", onMove);
  cv.removeEventListener("pointerup", onUp);
  cv.removeEventListener("pointercancel", onUp);
};
/* for controls outside the canvas (keyboard, screen readers) */
teardown.undo = undo; teardown.clear = clear;
/* A mark made without a pointer: one wandering stroke. It is judged like
 * any other, so nobody is shut out of the loop for being unable to drag. */
teardown.scrawl = () => {
  if (S.phase !== "draw" || S.ink >= INK_MAX - 20) return;
  let x = SHEET.x + 20 + Math.random() * (SHEET.w - 40), y = SHEET.y + 20 + Math.random() * (SHEET.h - 40);
  let a = Math.random() * 6.283, t = performance.now();
  const stroke = [{ x, y, t }], budget = Math.min(140, INK_MAX - S.ink - 1);
  for (let used = 0; used + 4 <= budget; used += 4) {
    a += (Math.random() - 0.5) * 1.1;
    x = Math.max(SHEET.x + 2, Math.min(SHEET.x + SHEET.w - 2, x + Math.cos(a) * 4));
    y = Math.max(SHEET.y + 2, Math.min(SHEET.y + SHEET.h - 2, y + Math.sin(a) * 4));
    t += 14 + Math.random() * 30;
    stroke.push({ x, y, t });
  }
  S.strokes.push(stroke); recount();
  bus.say("A MARK IS ON THE SHEET.");
};
teardown.seal = () => (S.phase === "sealed" ? newSheet() : seal());
return teardown;
}
