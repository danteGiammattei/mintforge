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
 *    bus.seal(strokes)   → Promise<{ scroll: { rarity, seed }, familiar, base, steps, likeness, poor }>
 *    bus.page()          { tome, page, n, of }: the tome open on the desk and
 *                        the page it is open at (shared/tomes.js)
 *    bus.newTome()       a tome the player has not yet looked at in the temple
 *    bus.lectern()       go to the lectern, to choose another tome or page:
 *                        the TOMES tab in the left margin, the tome's name,
 *                        the book, or a sideways swipe off the sheet
 *    bus.season()        the season of the event running today, or null:
 *                        the desk is dressed for it
 *    bus.wanted()        the page he wants today: { name, here } (here: it is
 *                        the open page), or null
 *    bus.toWanted()      open the tome at that page
 *    bus.room()          how many more scrolls the satchel will take
 *    bus.firstTime()     true until the player has sealed once
 *    bus.say(text)       for the aria-live region
 *    bus.feel(name)      sound + haptics hook
 *    bus.toDoor()        the satchel is full and the player asked to go
 *    bus.inkMax()        ink a sheet takes with the player's inkwell
 *    bus.deeper()        true if a deeper well can still be bought
 *    bus.well()          the player tapped the ink: offer the next well
 *
 *  Every scroll is a copy of the open page: the book lies under the
 *  sheet, and the closer the copy the higher the seal climbs.
 *
 *  The player is never told the rules, but is shown what happened: the
 *  seal climbs a tier for each lift and names it, the care meter fills
 *  while they draw, and the desk says what he craves today.
 * ══════════════════════════════════════════════════════════════════════ */

import { pageSigil } from "../lib/tomeArt.js";
import { tiedScroll, TIED } from "../lib/forms.js";
import { auraFrame, LOOP as AURA_LOOP, PAD as AURA_PAD, TOP as AURA_TOP } from "../lib/spriteAura.js";
import { RARITY, TRAITS, LIFTS, careOf } from "../../shared/sigil.js";
import { SCRIBE } from "../../shared/tuning.js";
import { stage, pointer, W, H, FONT, INK, rnd, wrap, feather } from "./kit.js";

/* the colour the scene dissolves into at its edges; Scribe.jsx paints the page with it */
export const SURROUND = [8, 7, 5];

export function mount(cv, bus) {

/* the sheet: where ink may land */
const SHEET = { x: 20, y: 84, w: SCRIBE.sheet.w, h: SCRIBE.sheet.h };
const inkMax = () => bus.inkMax();          // the well on the desk decides
const WELL = [W - 96, 14, 80, 34];           // the ink meter is a button: a deeper well

const P = { room:"#080705", deskA:"#17120c", deskEdge:"#2f2518", ink:"#17140d" };
const STEP = 28;                             // frames between each lift on the seal: time to see each colour
const markOf = why => (TRAITS[why] || LIFTS[why] || { mark: why }).mark;
const BTN = { undo:[20,304,48,30], clear:[74,304,48,30], seal:[128,304,47,30] };
const BOOK = [20, 342, 155, 72];             // the open tome, under the buttons
const SHELF = [16, 18, 110, 18];              // the tome's name, top left: to the lectern
const TAB = [0, 150, 15, 92];
const WANT = [16, 48, 130, 20];                // "TODAY HE DESIRES", on the desk: tap to open his page                 // the TOMES tab, in the margin left of the sheet

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
  // on the Long Night, a sprig of pine and holly laid along it
  if (bus.season?.()) {
    const X = 150, Y = 64;
    for (let i = 0; i < 34; i++) plot(X + i, Y + (i >> 3), 1, 1, "#3a2a18");            // the twig
    for (let i = 2; i < 32; i += 3) {
      plot(X + i - 2, Y - 2 + (i >> 3), 2, 1, "#24442c"); plot(X + i + 1, Y - 3 + (i >> 3), 2, 1, "#2e5636");   // needles above
      plot(X + i - 1, Y + 1 + (i >> 3), 2, 1, "#1c3424"); plot(X + i + 1, Y + 2 + (i >> 3), 2, 1, "#24442c");   // and below
    }
    plot(X + 4, Y - 1, 5, 3, "#2a4a2e"); plot(X + 6, Y - 2, 1, 1, "#3e6a44");            // a holly leaf
    plot(X + 8, Y + 1, 2, 2, "#8a2420"); plot(X + 8, Y + 1, 1, 1, "#c8483e");              // and its berries
    plot(X + 10, Y, 2, 2, "#8a2420"); plot(X + 10, Y, 1, 1, "#c8483e");
  }
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
  ctx.textAlign = "left"; ctx.fillStyle = INK.warmHi;
  ctx.fillText(bus.page().tome.name, 20, 30);

  // ink remaining
  const frac = Math.max(0, 1 - S.ink / inkMax()), low = frac < 0.18;
  ctx.textAlign = "right"; ctx.fillStyle = low ? INK.warn : INK.warm;
  ctx.fillText("INK", W - 20, 30);
  plot(W - 20 - 62, 36, 62, 4, "#1d1812");
  plot(W - 20 - 62, 36, Math.round(62 * frac), 4, low ? "#9a5a3a" : "#7d6a44");
  if (bus.deeper()) { ctx.textAlign = "left"; ctx.fillStyle = INK.warmHi; ctx.fillText("+", W - 20 - 62, 30); }

  // care: time spent drawing, the same count the judge makes (sigil.js)
  const care = careOf(penDown()), barX = W - 20 - 62;
  ctx.textAlign = "right"; ctx.fillStyle = care >= 1 ? INK.warmHi : INK.warm;
  ctx.fillText("CARE", barX - 4, 46);
  plot(barX, 42, 62, 4, "#1d1812");
  plot(barX, 42, Math.round(62 * care), 4, care >= 1 ? "#c9a25a" : "#6a5636");

  // the page he wants today, on the desk; tapped, the tome opens at it
  const want = bus.wanted?.();
  if (want) {
    ctx.textAlign = "left"; ctx.fillStyle = INK.warm;
    ctx.fillText("TODAY HE DESIRES", 20, 56);
    ctx.fillStyle = INK.warmHi;
    ctx.fillText(want.here ? `${want.name}: THIS PAGE` : `${want.name} ›`, 20, 64);
  }

  const can = S.strokes.length > 0 && S.phase === "draw", full = bus.room() <= 0;
  btn(BTN.undo, "UNDO", can);
  btn(BTN.clear, "CLEAR", can);
  btn(BTN.seal, full ? "FULL" : "SEAL", can && !full);

  if (full && S.phase === "draw") {
    ctx.textAlign = "center"; ctx.fillStyle = INK.warm;
    ctx.fillText("YOUR SATCHEL IS FULL.", W / 2, 350);
    btn(DOOR_BTN, "TO THE DOOR", true);
  } else drawBook();
  if (S.phase === "draw") drawTab();

  // lines for the player sit in a dark band across the foot of the sheet,
  // where they can be read: the one-time prompt, then passing notes
  const lines = S.fresh && !S.strokes.length && S.phase === "draw"
    ? ["COPY THE PAGE ONTO THE SHEET.", "THEN SEAL IT. HE PAYS FOR SCROLLS.", "A SLOW, CAREFUL HAND PAYS MORE."]
    : S.noteA > 0.01 ? wrap(S.note, 32) : null;
  if (lines) {
    const a = S.fresh && !S.strokes.length ? 1 : Math.min(1, S.noteA), y0 = SHEET.y + SHEET.h - 6 - lines.length * 10;
    ctx.globalAlpha = 0.85 * a; plot(SHEET.x, y0 - 4, SHEET.w, lines.length * 10 + 6, "#0d0b08");
    ctx.globalAlpha = a; ctx.textAlign = "center"; ctx.fillStyle = INK.warmHi;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + 6 + i * 10));
    ctx.globalAlpha = 1;
    if (!S.fresh || S.strokes.length) S.noteA -= 0.008;
  }
}

/* ─── the open tome ───────────────────────────────────────────────────
 * Leather round two pages: on the left the page's name, how high it can
 * go, and the turns; on the right its sigil, in ink, to copy. */
const PAGE_INK = "#2a2014", PARCH = ["#8a7652", "#a89068", "#bca27a"];
function drawBook() {
  const { tome, page, n, of } = bus.page();
  const [x, y, w, h] = BOOK, half = (w - 6) / 2;
  plot(x, y, w, h, "#0a0806");
  plot(x + 1, y + 1, w - 2, h - 2, tome.look.leather);
  for (const [px0, pw] of [[x + 3, half - 1], [x + 4 + half, half - 1]]) {
    plot(px0, y + 3, pw, h - 6, PARCH[1]);
    plot(px0, y + 3, pw, 1, PARCH[2]);
    plot(px0, y + h - 4, pw, 1, PARCH[0]);
  }
  plot(x + 2 + half, y + 2, 2, h - 4, "#3a2c1c");                           // the gutter
  // left: the page's name, its tier as pips in the rarity colours, turns
  ctx.font = FONT; ctx.textAlign = "left"; ctx.fillStyle = PAGE_INK;
  wrap(page.name, 12).slice(0, 2).forEach((l, i) => ctx.fillText(l, x + 7, y + 13 + i * 9));
  for (let i = 1; i <= 5; i++) plot(x + 7 + (i - 1) * 7, y + 34, 5, 5, i <= page.tier ? RARITY[i].c : PARCH[0]);
  ctx.fillStyle = "#5a4a32"; ctx.fillText(`${n} / ${of}`, x + 7, y + 48);
  if (bus.wanted?.()?.here) { ctx.fillStyle = "#7a2418"; ctx.fillText("HE WANTS IT", x + 7, y + 62); }
  else ctx.fillText("TAP TO CHANGE", x + 7, y + 62);
  // right: the sigil
  const sz = Math.min(half - 8, h - 12) | 0, sg = pageSigil(page, sz, PAGE_INK);
  ctx.drawImage(sg, Math.round(x + 4 + half + (half - 1 - sz) / 2), Math.round(y + (h - sz) / 2));
}
/* the TOMES tab in the left margin: the way to the lectern, which lies
 * that way. It breathes a little, so it is noticed. */
function drawTab() {
  // a tome not yet looked at in the temple: it calls louder, and says so
  const fresh = bus.newTome?.(), a = fresh ? 0.6 + Math.abs(Math.sin(S.t * 0.09)) * 0.4 : 0.75 + Math.sin(S.t * 0.04) * 0.25;
  const [x, y, w, h] = TAB;
  plot(x, y, w, h, "#1d1710"); plot(x + w - 1, y, 1, h, "#4a3e2b"); plot(x, y, w, 1, "#4a3e2b"); plot(x, y + h - 1, w, 1, "#4a3e2b");
  ctx.globalAlpha = a; ctx.font = FONT; ctx.textAlign = "center"; ctx.fillStyle = INK.warmHi;
  ctx.fillText("<", x + w / 2, y + 12);
  [..."TOMES"].forEach((ch, i) => ctx.fillText(ch, x + w / 2, y + 28 + i * 12));
  ctx.globalAlpha = 1;
  if (fresh) {
    plot(x, y + h + 3, w + 18, 11, "#3a2a10"); plot(x, y + h + 3, w + 18, 1, "#f0b850");
    ctx.textAlign = "left"; ctx.fillStyle = "#f0d080"; ctx.fillText("NEW", x + 3, y + h + 12);
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

/* ─── the seal: the scroll rolls up, the ribbon goes on, and it climbs ──
 * The ribbon takes the roll's colour, then steps up a tier for each lift
 * (a trait, care, the craving), naming each as it lands. */
const shownSteps = () => (S.result ? Math.max(0, Math.min(S.result.steps.length, Math.floor((S.sealT - 40) / (view.calm ? 1 : STEP)) + 1)) : 0);
/* after the last lift lands the glowing sheet is held a moment
 * (HOLD), then rolls itself up and ties into the scroll (ROLL) */
const HOLD = 54, ROLL = 64;
const revealEnd = () => 58 + (view.calm ? 0 : STEP * (S.result?.steps.length || 0));
const rollAt = () => (!S.result ? -1 : view.calm ? (S.sealT >= revealEnd() ? ROLL : -1) : S.sealT - revealEnd() - HOLD);
const sealDone = () => S.phase === "sealed" && rollAt() >= ROLL;
/* ─── the reveal: the ink itself lights up ───────────────────────────
 * As the wax sets the desk falls dark round the sheet and the lines warm.
 * When the verdict lands they light in the scroll's colour, in layers so
 * the drawing keeps its detail: a soft field of colour behind it, a faint
 * halo hugging the lines, the line in its colour, and down its middle a
 * near-white core one pixel wide. The rarer, the more of the soft layers
 * (never thicker lines): twinkling stars in a second colour from
 * uncommon, sparks rising from epic, a turning ring of light round it all
 * from legendary. Each lift flashes the lines white and settles them into
 * the next colour. The ink's pixels are found once, each tier drawn once
 * and kept. */
const HALO_R = [0, 1, 1, 2, 2, 3];
const ACCENT = ["#c9b98f", "#e2ffc0", "#d0f4ff", "#ffc8f4", "#fff2b8", "#8ccaff"];   // the twinkles' colour per tier
function inkMask() {
  if (S.mask) return S.mask;
  const m = document.createElement("canvas"); m.width = W; m.height = H;
  const c = m.getContext("2d"); c.fillStyle = "#fff";
  const px = new Set(), core = new Set();
  const dot = (x, y) => {
    x = Math.round(x); y = Math.round(y); core.add(y * W + x);
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) px.add((y + dy) * W + x + dx);
  };
  for (const st of S.strokes) for (let i = 0; i < st.length; i++) {
    if (!i) { dot(st[0].x, st[0].y); continue; }
    const a = st[i - 1], b = st[i], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
    for (let k = 0; k <= n; k++) dot(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n);
  }
  for (const i of px) c.fillRect(i % W, (i / W) | 0, 1, 1);
  const cm = document.createElement("canvas"); cm.width = W; cm.height = H;
  const cc = cm.getContext("2d"); cc.fillStyle = "#fff";
  for (const i of core) cc.fillRect(i % W, (i / W) | 0, 1, 1);
  // where the drawing sits, for the field behind it and the ring round it
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const i of px) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  S.mask = m; S.coreMask = cm; S.inkPx = [...px]; S.glows = {};
  S.inkBox = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, r: Math.max(x1 - x0, y1 - y0) / 2 };
  return m;
}
function tinted(mask, col) {
  const t = document.createElement("canvas"); t.width = W; t.height = H;
  const c = t.getContext("2d"); c.drawImage(mask, 0, 0);
  c.globalCompositeOperation = "source-in"; c.fillStyle = col; c.fillRect(0, 0, W, H);
  return t;
}
const lighten = (hex, k) => { const n = parseInt(hex.slice(1), 16); return "#" + [16, 8, 0].map(sh => Math.round(((n >> sh) & 255) + (255 - ((n >> sh) & 255)) * k).toString(16).padStart(2, "0")).join(""); };
const darken = (hex, k) => { const n = parseInt(hex.slice(1), 16); return "#" + [16, 8, 0].map(sh => Math.round(((n >> sh) & 255) * k).toString(16).padStart(2, "0")).join(""); };
function glowOf(tier) {
  inkMask();
  if (S.glows[tier]) return S.glows[tier];
  const g = document.createElement("canvas"); g.width = W; g.height = H;
  const c = g.getContext("2d"), col = tier ? RARITY[tier].c : "#a89c84", R = HALO_R[tier];
  // the field: a soft disc of the colour behind the drawing, in steps
  if (tier) {
    const { cx, cy, r } = S.inkBox, rings = 2 + tier, step = r * 0.14 + 3, out = r * 0.5 + rings * step;
    c.fillStyle = darken(col, 0.55);
    for (let y = Math.floor(cy - out); y <= cy + out; y++) for (let x = Math.floor(cx - out); x <= cx + out; x++) {
      const d = Math.hypot(x - cx, y - cy), inside = Math.min(rings, Math.ceil((out - d) / step));
      if (inside <= 0) continue;
      c.globalAlpha = 0.045 * inside; c.fillRect(x, y, 1, 1);
    }
  }
  // the halo: the ink spread out a pixel at a time, faint
  const halo = tinted(S.mask, col);
  for (let r = R; r >= 1; r--) {
    c.globalAlpha = 0.09 + 0.05 * (R - r);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && dx * dx + dy * dy <= r * r + r) c.drawImage(halo, dx, dy);
  }
  // the line in its colour, and its bright core
  c.globalAlpha = 1;
  c.drawImage(tinted(S.mask, tier ? col : "#8a7f68"), 0, 0);
  c.drawImage(tinted(S.coreMask, tier ? lighten(col, 0.72) : "#c9b98f"), 0, 0);
  return (S.glows[tier] = g);
}
let flashOf = null;
function drawSeal() {
  const waiting = S.phase === "sealing";
  const k = waiting ? Math.min(0.5, S.sealT / 58) : Math.min(1, S.sealT / 58);
  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const r = S.result;
  const n = shownSteps();
  if (r && n > S.lifted) { S.lifted = n; S.flashAt = S.sealT; bus.feel("rarity" + r.steps[n - 1].to); }
  const tier = r ? (n ? r.steps[n - 1].to : r.base) : 0;

  // the desk falls away into the dark round the sheet; the sheet dims too,
  // so the ink can shine
  const dark = Math.min(1, e * 2);
  ctx.globalAlpha = 0.92 * dark;
  plot(0, 0, W, SHEET.y, `rgb(${SURROUND})`); plot(0, SHEET.y + SHEET.h, W, H, `rgb(${SURROUND})`);
  plot(0, SHEET.y, SHEET.x, SHEET.h, `rgb(${SURROUND})`); plot(SHEET.x + SHEET.w, SHEET.y, W, SHEET.h, `rgb(${SURROUND})`);
  ctx.globalAlpha = 0.6 * dark; plot(SHEET.x, SHEET.y, SHEET.w, SHEET.h, "#050403");
  ctx.globalAlpha = 1;

  if (waiting || !r) {
    // the wax setting: the lines warm and breathe, no colour yet
    ctx.globalAlpha = 0.35 + 0.35 * Math.min(1, S.sealT / 40) * (view.calm ? 1 : 0.7 + 0.3 * Math.sin(S.t * 0.15));
    ctx.drawImage(glowOf(0), 0, 0);
    ctx.globalAlpha = 1;
    ctx.font = FONT; ctx.textAlign = "center";
    if (S.sealT > 40) { ctx.fillStyle = INK.warm; ctx.fillText("THE WAX IS SETTING" + ".".repeat(1 + ((S.t / 24) | 0) % 3), W / 2, 318); }
    return;
  }

  const rolled = rollAt(), since = S.sealT - (S.flashAt ?? -99);
  if (rolled >= 0) drawRoll(tier, rolled);
  else {
  // the glow, breathing; a white flash as each lift lands
  const flash = !view.calm && since < 10 ? 1 - since / 10 : 0;
  const shown = Math.min(1, e * 1.4);
  ctx.globalAlpha = shown * (view.calm ? 1 : 0.88 + 0.12 * Math.sin(S.t * 0.08));
  ctx.drawImage(glowOf(tier), 0, 0);
  if (flash > 0) {
    if (!flashOf || flashOf.mask !== S.mask) flashOf = { mask: S.mask, img: tinted(S.mask, "#fff8e8") };
    ctx.globalAlpha = flash * 0.85; ctx.drawImage(flashOf.img, 0, 0);
  }
  ctx.globalAlpha = 1;
  const col = RARITY[tier].c, acc = ACCENT[tier], { cx, cy, r: rr } = S.inkBox;
  // a ring of light round it all, its dashes turning, from legendary
  if (tier >= 4) {
    const R = Math.round(rr + 10), turn = view.calm ? 0 : S.t * 0.006, dashes = 36;
    for (let i = 0; i < dashes * 4; i++) {
      const a = turn + (i / (dashes * 4)) * Math.PI * 2, on = Math.floor(i / 2) % 2 === 0;
      if (!on) continue;
      ctx.globalAlpha = shown * 0.55;
      plot(Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R), 1, 1, i % 8 === 0 ? acc : col);
    }
    if (tier >= 5) {
      ctx.globalAlpha = shown * 0.3;
      for (let i = 0; i < 160; i++) { const a = -turn * 1.6 + (i / 160) * Math.PI * 2; plot(Math.round(cx + Math.cos(a) * (R + 4)), Math.round(cy + Math.sin(a) * (R + 4)), 1, 1, col); }
    }
    ctx.globalAlpha = 1;
  }
  // twinkles: four-pointed stars near the lines, each on its own beat
  if (tier >= 1 && S.inkPx.length) {
    const many = tier * 3;
    for (let i = 0; i < many; i++) {
      const life = 70 + (i * 29) % 50, cycle = Math.floor((S.t + i * 41) / life), u = ((S.t + i * 41) % life) / life;
      const at = S.inkPx[(i * 7919 + cycle * 104729) % S.inkPx.length];
      const x = at % W + ((i * 13 + cycle * 7) % 17) - 8, y = ((at / W) | 0) + ((i * 11 + cycle * 5) % 17) - 8;
      const b = view.calm ? 0.6 : Math.sin(u * Math.PI);
      ctx.globalAlpha = shown * b;
      plot(x, y, 1, 1, "#ffffff");
      if (b > 0.45) { plot(x - 1, y, 1, 1, acc); plot(x + 1, y, 1, 1, acc); plot(x, y - 1, 1, 1, acc); plot(x, y + 1, 1, 1, acc); }
      if (b > 0.8 && tier >= 3) { plot(x - 2, y, 1, 1, acc); plot(x + 2, y, 1, 1, acc); plot(x, y - 2, 1, 1, acc); plot(x, y + 2, 1, 1, acc); }
    }
    ctx.globalAlpha = 1;
  }
  // sparks rising off the lines, from epic up
  if (tier >= 3 && !view.calm && S.inkPx.length) {
    const many = (tier - 2) * 5;
    for (let i = 0; i < many; i++) {
      const life = 50 + (i * 17) % 30, u = ((S.t + i * 23) % life) / life;
      const at = S.inkPx[(i * 7919 + Math.floor((S.t + i * 23) / life) * 104729) % S.inkPx.length];
      const x = at % W + Math.round(Math.sin(u * 6 + i) * 2), y = ((at / W) | 0) - Math.round(u * 14);
      ctx.globalAlpha = 1 - u; plot(x, y, 1, 1, u < 0.3 ? "#fff8e8" : acc);
    }
    ctx.globalAlpha = 1;
  }

  }

  // the verdict, under the sheet
  ctx.font = FONT; ctx.textAlign = "center";
  if (k > 0.55) {
    ctx.globalAlpha = Math.min(1, (k - 0.55) / 0.3);
    const y0 = SHEET.y + SHEET.h + 16;
    if (r.likeness != null) {
      ctx.fillStyle = r.poor ? INK.warn : INK.warmHi;
      ctx.fillText(r.poor ? "NOTHING LIKE THE PAGE" : `LIKENESS ${Math.round(r.likeness * 100)}%`, W / 2, y0);
    }
    ctx.fillStyle = RARITY[tier].c;
    ctx.fillText(RARITY[tier].n, W / 2, y0 + 13);
    ctx.fillStyle = INK.warm;
    if (r.familiar) ctx.fillText("HE HAS SEEN THIS ONE BEFORE", W / 2, y0 + 27);
    else if (!r.steps.length) ctx.fillText("SEALED INTO YOUR SATCHEL", W / 2, y0 + 27);
    // each lift, as it lands
    for (let i = 0; i < n; i++) {
      const st = r.steps[i], fresh = i === n - 1 && since < 8 && !view.calm;
      ctx.fillStyle = fresh ? "#fff0c8" : RARITY[st.to].c;
      ctx.fillText("+ " + markOf(st.why), W / 2, y0 + 27 + i * 11);
    }
    ctx.globalAlpha = 1;
  }
  if (sealDone()) { ctx.fillStyle = INK.warm; ctx.fillText("TAP TO BEGIN ANOTHER", W / 2, H - 12); }
}

/* ─── the sheet rolls itself up into the scroll ──────────────────────
 * From the bottom, the glowing ink going with it and catching on the
 * roll's edge; the roll then comes to the middle of the desk, narrowing,
 * and with a flash it is tied: the scroll, three times its satchel size,
 * in the same aura it has there. */
const PARCH_ROLL = ["#e7d6a8", "#cdb98a", "#b39f72", "#8e7c55", "#6b5c3e"];
const AURA_LVL = r => (r >= 4 ? 3 : r >= 2 ? 2 : r);
function drawRoll(tier, t) {
  const col = RARITY[tier].c, glow = glowOf(tier), cy = SHEET.y + SHEET.h / 2 - 10;
  const ease = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  plot(SHEET.x - 2, SHEET.y - 2, SHEET.w + 4, SHEET.h + 4, `rgb(${SURROUND})`);
  const roll = (x, y, w, h) => {
    for (let k = 0; k < h; k++) plot(x, Math.round(y - h / 2 + k), w, 1, PARCH_ROLL[Math.min(4, Math.floor(k / h * 5))]);
    plot(x, Math.round(y - h / 2), 1, h, PARCH_ROLL[4]); plot(x + w - 1, Math.round(y - h / 2), 1, h, PARCH_ROLL[4]);
    if (tier) { ctx.globalAlpha = 0.85; plot(x + 2, Math.round(y), w - 4, 1, lighten(col, 0.3)); ctx.globalAlpha = 1; }   // the ink, wrapped inside, showing at the edge
  };
  if (t < 36) {
    // rolling up from the bottom: what is left of the sheet, then the roll
    const u = ease(t / 36), left = Math.round(SHEET.h * (1 - u)), rh = 5 + Math.round(u * 7);
    if (left > 0) {
      ctx.drawImage(sheetLayer, 2, 2, SHEET.w, left, SHEET.x, SHEET.y, SHEET.w, left);
      ctx.globalAlpha = 0.6; plot(SHEET.x, SHEET.y, SHEET.w, left, "#050403"); ctx.globalAlpha = 1;
      ctx.drawImage(glow, SHEET.x, SHEET.y, SHEET.w, left, SHEET.x, SHEET.y, SHEET.w, left);
    }
    roll(SHEET.x, SHEET.y + left, SHEET.w, rh);
    return;
  }
  if (t < 56) {
    // to the middle, narrowing toward the size of the tied scroll
    const v = ease((t - 36) / 20), w = Math.round(SHEET.w + (TIED.w * 3 - 10 - SHEET.w) * v), y = SHEET.y + (cy - SHEET.y) * v;
    roll(Math.round(W / 2 - w / 2), y, w, 12 + Math.round(v * 8));
    return;
  }
  // tied: the scroll in its aura, at three times
  const lvl = AURA_LVL(tier), src = tiedScroll(col);
  const img = lvl ? auraFrame(src, col, lvl, view.calm ? 0 : Math.floor(S.t / 7.5) % AURA_LOOP) : src;
  const dx = lvl ? AURA_PAD : 0, dy = lvl ? AURA_TOP : 0, k = 3;
  ctx.drawImage(img, Math.round(W / 2 - (TIED.w / 2 + dx) * k), Math.round(cy - (TIED.h / 2 + dy) * k), img.width * k, img.height * k);
  // the flash of the tying, and a ring of sparks going out
  const since = t - 56;
  if (since < 14 && !view.calm) {
    const f = 1 - since / 14;
    // the scroll itself flares, brightening only its own pixels
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = f * 0.7;
    ctx.drawImage(img, Math.round(W / 2 - (TIED.w / 2 + dx) * k), Math.round(cy - (TIED.h / 2 + dy) * k), img.width * k, img.height * k);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, d = 20 + since * 4;
      ctx.globalAlpha = f; plot(Math.round(W / 2 + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.8), 1, 1, i % 2 ? ACCENT[tier] : col);
    }
    ctx.globalAlpha = 1;
  }
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
  if (S.phase === "sealed") { if (sealDone()) newSheet(); return; }
  if (S.phase !== "draw") return;
  if (hit(p, WELL) && bus.deeper()) return bus.well();
  if (hit(p, WANT) && bus.wanted?.() && !bus.wanted().here) { bus.feel("tap"); return bus.toWanted(); }
  if (hit(p, BTN.undo))  return undo();
  if (hit(p, BTN.clear)) return clear();
  if (hit(p, BTN.seal))  return seal();
  if (hit(p, SHELF) || hit(p, TAB) || (bus.room() > 0 && hit(p, BOOK))) { bus.feel("tap"); return bus.lectern(); }
  if (bus.room() <= 0 && hit(p, DOOR_BTN)) return bus.toDoor();
  // off the sheet, a touch may be the start of a sideways swipe to the lectern
  if (!inSheet(p)) { S.swipe = { x: p.x, y: p.y }; return; }
  if (S.ink >= inkMax()) return;
  S.cur = [{ x: p.x, y: p.y, t: performance.now() }];
  S.strokes.push(S.cur);
  cv.setPointerCapture?.(e.pointerId);
};
const onMove = e => {
  if (S.swipe) {
    const p = pointer(cv, e), dx = p.x - S.swipe.x, dy = p.y - S.swipe.y;
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) * 1.2) { S.swipe = null; bus.feel("tap"); bus.lectern(); }
    return;
  }
  if (!S.cur || S.phase !== "draw") return;
  const p = pointer(cv, e);
  if (!inSheet(p)) { S.cur = null; return; }
  const last = S.cur[S.cur.length - 1];
  const d = Math.hypot(p.x - last.x, p.y - last.y);
  if (d < 1) return;
  if (S.ink + d > inkMax()) {
    S.cur = null; bus.feel("dry");
    if (bus.deeper()) note("THE WELL IS DRY. TAP THE INK FOR A DEEPER ONE.", 4);
    return;
  }
  S.ink += d;
  S.cur.push({ x: p.x, y: p.y, t: performance.now() });
};
const onUp = () => { S.cur = null; S.swipe = null; };
cv.addEventListener("pointerdown", onDown);
cv.addEventListener("pointermove", onMove);
cv.addEventListener("pointerup", onUp);
cv.addEventListener("pointercancel", onUp);

/* time spent drawing, counted as the judge counts it: pauses only a beat */
function penDown() {
  let ms = 0;
  for (const s of S.strokes) for (let i = 1; i < s.length; i++) ms += Math.min(250, Math.max(4, s[i].t - s[i - 1].t));
  return ms;
}

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
  S.mask = null; S.flashAt = null;                 // the ink to light, found afresh
  bus.feel("seal");
  bus.seal(rel).then(res => {
    if (!alive) return;
    const steps = Array.isArray(res.steps) ? res.steps : [];
    S.result = { rarity: res.scroll.rarity, base: res.base ?? res.scroll.rarity, steps, familiar: !!res.familiar,
                 likeness: typeof res.likeness === "number" ? res.likeness : null, poor: !!res.poor };
    S.phase = "sealed"; S.sealT = Math.min(S.sealT, 29); S.fresh = false; S.lifted = 0;
    if (!steps.length) bus.feel("rarity" + res.scroll.rarity);
    bus.say("SEALED. A " + RARITY[res.scroll.rarity].n + " SCROLL."
      + (typeof res.likeness === "number" ? " LIKENESS " + Math.round(res.likeness * 100) + " PERCENT." : "") + (steps.length ? " LIFTED BY " + steps.map(s => markOf(s.why)).join(", ") + "." : "")
      + (res.familiar ? " HE HAS SEEN THIS ONE BEFORE." : ""));
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
  S.mask = null; S.coreMask = null; S.inkPx = null; S.inkBox = null; S.glows = null; S.flashAt = null;
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
/* A copy made without a pointer: the open page, by a shaky hand, as
 * much of it as the ink allows. It is judged like any other, so nobody
 * is shut out of the loop for being unable to drag. */
teardown.scrawl = () => {
  if (S.phase !== "draw") return;
  const { page } = bus.page(), k = 120, ox = SHEET.x + (SHEET.w - k) / 2, oy = SHEET.y + (SHEET.h - k) / 2;
  let t = performance.now(), ink = 0;
  S.strokes = [];
  for (const st of page.strokes) {
    const out = [];
    for (let i = 0; i < st.length; i++) {
      const x = ox + st[i][0] * k + (Math.random() - 0.5) * 4, y = oy + st[i][1] * k + (Math.random() - 0.5) * 4;
      if (out.length) { const l = out[out.length - 1]; ink += Math.hypot(x - l.x, y - l.y); if (ink > inkMax() - 2) break; }
      out.push({ x, y, t: (t += 60) });
    }
    if (out.length) S.strokes.push(out);
  }
  recount();
  bus.say("THE PAGE IS COPIED ONTO THE SHEET.");
};
teardown.seal = () => (S.phase === "sealed" ? (sealDone() && newSheet()) : seal());
return teardown;
}
