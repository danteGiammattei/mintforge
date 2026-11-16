/* ══════════════════════════════════════════════════════════════════════
 *  the lectern — where the tomes are read
 *  ────────────────────────────────────────────────────────────────────
 *  To the left of the scribe's desk: a ruined temple at night, moss on
 *  broken stone, the sky through the far arches, and in the middle a
 *  weathered marble plinth with the tome you have chosen floating over
 *  it, glowing in its own colour, closed. Its arrows (or a swipe across it) bring up your
 *  other tomes; ones not yet found lie chained. Tap it and it opens: the
 *  cover swings back, pages riffle past, and it settles at a spread, its
 *  name and tier on the left, its sigil on the right. Tap or swipe the
 *  book to turn; the page it is open at is the one copied at the desk.
 *  A swipe to the left anywhere off the book (or the DESK tab) goes back.
 *
 *  bus:
 *    bus.tomes()             every tome (shared/tomes.js TOMES)
 *    bus.owned()             ids of the tomes the player has
 *    bus.chosen()            { tome, page }: the tome id and page index in use
 *    bus.choose(tome, page)  use this page of this tome at the desk
 *    bus.back()              go back to the desk
 *    bus.where(tier)         where a locked tome is found, as words
 *    bus.say(text), bus.feel(kind)
 * ══════════════════════════════════════════════════════════════════════ */
import { W, H, FONT, stage, pointer, wrap, ease } from "./kit.js";
import { tomeCover, pageSigil } from "../lib/tomeArt.js";
import { RARITY } from "../../shared/sigil.js";

export const SURROUND = [7, 8, 12];

// night stone, darkest to lit; moss; the sky; the plinth's old marble
const ST = ["#07080c", "#0e1117", "#161b23", "#1f2630", "#2b3440", "#3c4654", "#55606e"];
const MOSS = ["#14261a", "#1f3a24", "#2f5634", "#4a7a44"];
const SKY = ["#0a1024", "#111a36", "#1a2448"];
const MARBLE = ["#c8c5bc", "#a9a69e", "#8a877f", "#67655f", "#46443f"];
const INK_ON = "#b6c5bc", INK_SOFT = "#8f98a6";        // kit.js INK.coldHi and INK.cold: they read on the dark
const PARCH = ["#8a7652", "#a89068", "#c4ab80", "#d8c49a"], PAGE_INK = "#2a2014";

const PLINTH_Y = 252;                              // the plinth's top
const BOOK_Y = 228;                                // the floating book's foot (a locked one rests on the plinth)
const CLOSED = { w: 72, h: 90 };                    // the cover at 3×
const SPREAD = { x: 12, w: 171, h: 100 };           // the open book
const SPINE = SPREAD.x + Math.floor(SPREAD.w / 2);
const ARROWS = { back: [8, 168, 24, 30], on: [W - 32, 168, 24, 30] };
const DESK_TAB = [W - 52, 398, 46, 18];

export function mount(cv, bus) {
  const { ctx, view, stop } = stage(cv, { step: frame });
  const plot = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };
  const tomes = bus.tomes();
  const start = bus.chosen();
  const S = {
    t: 0,
    at: Math.max(0, tomes.findIndex(t => t.id === start.tome)),   // which tome lies on the lectern
    page: start.page,
    phase: "closed",          // closed | opening | open | turning | closing
    pt: 0, dir: 1, next: 0,
  };
  const tome = () => tomes[S.at];
  const has = () => bus.owned().includes(tome().id);

  /* ─── the ruined temple, drawn once ─────────────────────────────── */
  const VX = W / 2, VY = 196;                       // where the corridor's lines meet
  const hall = document.createElement("canvas"); hall.width = W; hall.height = H;
  {
    const c = hall.getContext("2d"), p = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const rng = (() => { let n = 7; return () => ((n = (n * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
    p(0, 0, W, H, ST[1]);
    // the sky through the broken roof and far arches, with its stars
    for (let y = 0; y < 230; y++) p(44, y, W - 88, 1, y < 70 ? SKY[0] : y < 150 ? SKY[1] : SKY[2]);
    for (let i = 0; i < 46; i++) { const x = 46 + Math.floor(rng() * (W - 92)), y = Math.floor(rng() * 210); p(x, y, 1, 1, rng() < 0.2 ? "#e8eeff" : "#7f8cb4"); }
    // the far arches, one inside the next, each a little darker; the
    // innermost broken open to the sky
    const arch = (x0, x1, top, base, thick, col, lit) => {
      const cx = (x0 + x1) / 2, r = (x1 - x0) / 2, spring = top + r;
      for (let y = top; y < base; y++) for (let x = x0; x < x1; x++) {
        const inR = y < spring ? Math.hypot(x - cx, y - spring) : Math.abs(x - cx);
        const outer = r, inner = r - thick;
        if (inR <= outer && inR > inner) p(x, y, 1, 1, (x < cx ? lit : col));
        else if (inR > outer) p(x, y, 1, 1, ST[1]);
      }
    };
    arch(44, 151, 36, 330, 12, ST[3], ST[4]);
    arch(60, 135, 92, 300, 9, ST[2], ST[3]);
    arch(72, 123, 136, 280, 7, ST[2], ST[3]);
    // a break in the innermost arch's crown, sky showing through
    for (let y = 136; y < 146; y++) for (let x = 90; x < 104; x++) if ((x * 7 + y * 3) % 5) p(x, y, 1, 1, SKY[2]);
    // beyond: a far ruined wall and fallen blocks, against the sky
    for (let x = 80; x < 115; x++) { const h = 30 + ((x * 13) % 7) * 3 + (x > 96 && x < 104 ? -14 : 0); p(x, 280 - h, 1, h, ST[2]); }
    // the side walls, running away to the far arch, in courses of stone
    for (const side of [0, 1]) {
      for (let y = 0; y < H; y++) {
        const edge = y < VY ? 44 : 44 - (y - VY) * 0.2;        // the wall's inner edge, flaring toward us below
        for (let x = 0; x < edge; x++) {
          const xx = side ? W - 1 - x : x, course = Math.floor((y + x * 0.35) / 11), joint = (y + x * 0.35) % 11 < 1;
          const brick = (Math.floor((x + course * 9) / 15) + course) % 3;
          p(xx, y, 1, 1, joint ? ST[0] : [ST[2], ST[3], ST[2]][brick]);
        }
      }
      // a column at the wall's edge, broken off near the top
      const x0 = side ? W - 40 : 26, top = side ? 24 : 40;
      for (let x = 0; x < 14; x++) {
        const f = x % 4, lit = side ? x > 9 : x < 4;
        p(x0 + x, top, 1, 330 - top, f === 0 ? ST[1] : lit ? ST[5] : f === 2 ? ST[4] : ST[3]);
      }
      for (let x = -2; x < 16; x++) if ((x * 5) % 7 > 2) p(x0 + x, top - 2 - ((x * 3) % 4), 1, 3 + ((x * 3) % 4), ST[3]);   // the break
      p(x0 - 3, 318, 20, 4, ST[4]); p(x0 - 4, 322, 22, 8, ST[3]);
      // a carved panel on the wall, worn almost away
      const px = side ? W - 24 : 6;
      for (let y = 150; y < 250; y++) for (let x = 0; x < 16; x++) if (x === 0 || x === 15 || y === 150 || y === 249) p(px + x, y, 1, 1, ST[1]);
      for (const [fx, fy, fw, fh] of [[5, 165, 6, 6], [4, 172, 8, 22], [3, 194, 4, 30], [9, 194, 4, 30]]) p(px + fx, fy, fw, fh, ST[2]);
    }
    // moss and hanging vines along the arches and walls
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(rng() * W), y = Math.floor(rng() * 300);
      p(x, y, 2 + Math.floor(rng() * 3), 1, MOSS[Math.floor(rng() * 3)]);
    }
    // the floor: cracked flags running away from us, wet in places
    for (let y = 330; y < H; y++) {
      const d = (y - VY) / (H - VY);
      for (let x = 0; x < W; x++) {
        const across = (x - VX) / d, row = Math.floor(Math.log(y - VY) * 7), col = Math.floor(across / 26 + 100);
        const seam = Math.abs(across % 26) < 1.2 / d * 0.6 || Math.abs(Math.log(y - VY) * 7 % 1) < 0.08;
        p(x, y, 1, 1, seam ? ST[0] : (row + col) % 2 ? ST[2] : ST[3]);
      }
    }
    for (let i = 0; i < 26; i++) {                                     // cracks, and rubble at the sides
      let x = Math.floor(rng() * W), y = 336 + Math.floor(rng() * 80);
      for (let k = 0; k < 6; k++) { p(x, y, 1, 1, ST[0]); x += Math.round(rng() * 2 - 1); y += 1; }
    }
    for (const [x, y, w, h] of [[2, 350, 22, 12], [10, 340, 14, 10], [W - 26, 356, 24, 14], [W - 18, 344, 12, 12], [30, 392, 16, 9], [W - 44, 404, 18, 8]]) {
      p(x, y, w, h, ST[3]); p(x, y, w, 1, ST[5]); p(x, y + h - 1, w, 1, ST[0]); p(x + 2, y, Math.floor(w / 2), 1, MOSS[2]);
    }
    // the plinth: a weathered marble block, its top lit, moss in its cracks
    const px0 = 66, pw = 63;
    p(px0 - 6, 350, pw + 12, 8, MARBLE[3]); p(px0 - 6, 350, pw + 12, 1, MARBLE[1]); p(px0 - 6, 357, pw + 12, 1, MARBLE[4]);
    p(px0 - 3, 342, pw + 6, 8, MARBLE[2]); p(px0 - 3, 342, pw + 6, 1, MARBLE[0]);
    for (let y = PLINTH_Y + 8; y < 342; y++) for (let x = px0; x < px0 + pw; x++) {
      const lit = x < px0 + 22, panel = x > px0 + 8 && x < px0 + pw - 8 && y > PLINTH_Y + 18 && y < 332;
      p(x, y, 1, 1, panel ? (lit ? MARBLE[2] : MARBLE[3]) : lit ? MARBLE[1] : MARBLE[2]);
    }
    for (let y = PLINTH_Y + 18; y < 332; y++) { p(px0 + 8, y, 1, 1, MARBLE[4]); p(px0 + pw - 9, y, 1, 1, MARBLE[0]); }
    p(px0 - 4, PLINTH_Y, pw + 8, 8, MARBLE[1]); p(px0 - 4, PLINTH_Y, pw + 8, 2, MARBLE[0]); p(px0 - 4, PLINTH_Y + 7, pw + 8, 1, MARBLE[4]);
    for (let i = 0; i < 40; i++) {                                     // age: moss, stains, cracks
      const x = px0 + Math.floor(rng() * pw), y = PLINTH_Y + 8 + Math.floor(rng() * 80);
      p(x, y, 1, 1 + Math.floor(rng() * 4), rng() < 0.6 ? MOSS[1] : MARBLE[4]);
    }
    p(px0 - 4, PLINTH_Y + 2, 12, 2, MOSS[2]); p(px0 + pw - 10, PLINTH_Y + 1, 9, 2, MOSS[1]);
  }

  // a soft glow round a rectangle, in stepped rings, kept per size and colour
  const halos = new Map();
  function halo(w, h, col, R = 10) {
    const key = `${w}x${h}:${col}:${R}`;
    if (halos.has(key)) return halos.get(key);
    const cv2 = document.createElement("canvas"); cv2.width = w + R * 2; cv2.height = h + R * 2;
    const c = cv2.getContext("2d"); c.fillStyle = col;
    for (let y = 0; y < cv2.height; y++) for (let x = 0; x < cv2.width; x++) {
      const dx = Math.max(0, R - x, x - (R + w - 1)), dy = Math.max(0, R - y, y - (R + h - 1)), d = Math.hypot(dx, dy);
      if (d === 0 || d > R) continue;
      c.globalAlpha = Math.round((1 - d / R) * 4) / 4 * 0.42;       // stepped, not smooth
      c.fillRect(x, y, 1, 1);
    }
    halos.set(key, cv2);
    return cv2;
  }

  /* ─── the book ────────────────────────────────────────────────────── */
  function drawClosed() {
    const t = tome(), own = has(), cover = tomeCover(t, own);
    const x = Math.round(W / 2 - CLOSED.w / 2), y = own ? BOOK_Y - CLOSED.h + bob() : PLINTH_Y - CLOSED.h + 2;
    if (own) ctx.drawImage(halo(CLOSED.w, CLOSED.h, t.look.trim, 12), x - 12, y - 12);
    ctx.drawImage(cover, x, y, CLOSED.w, CLOSED.h);
    if (!own) {                                                            // chained shut
      for (let i = 0; i < CLOSED.w + 10; i += 4) {
        const a = [x - 5 + i, y + 18 + i * 0.7], b = [x - 5 + i, y + CLOSED.h - 18 - i * 0.7];
        for (const [cx, cy] of [a, b]) { plot(cx, cy, 3, 2, (i / 4) % 2 ? "#5e5a52" : "#8e8a80"); plot(cx, cy + 2, 3, 1, "#2a2722"); }
      }
    }
    ctx.font = FONT; ctx.textAlign = "center"; ctx.fillStyle = INK_ON;
    ctx.fillText(own ? t.name : "NOT YET FOUND", W / 2, 96);
    ctx.fillStyle = INK_SOFT;
    ctx.fillText(own ? `${t.pages.length} PAGES` : bus.where(t.tier), W / 2, 107);
    // arrows to the other tomes
    if (tomes.length > 1) { arrow(ARROWS.back, "<", S.at > 0); arrow(ARROWS.on, ">", S.at < tomes.length - 1); }
    ctx.fillStyle = INK_SOFT; ctx.fillText(own ? "TAP THE BOOK TO OPEN IT" : "", W / 2, 118);
  }
  function arrow([x, y, w, h], label, on) {
    plot(x, y, w, h, on ? ST[3] : ST[2]); plot(x, y, w, 1, on ? ST[5] : ST[3]); plot(x, y + h - 1, w, 1, ST[0]);
    ctx.font = FONT; ctx.textAlign = "center"; ctx.fillStyle = on ? INK_ON : ST[4];
    ctx.fillText(label, x + w / 2, y + h / 2 + 3);
  }

  // the spread, open at page i, with `left`/`right` hidden while a page turns
  function drawSpread(i, show = { left: true, right: true }) {
    const t = tome(), page = t.pages[i], y = BOOK_Y - SPREAD.h, half = SPINE - SPREAD.x;
    ctx.drawImage(halo(SPREAD.w + 4, SPREAD.h + 4, t.look.trim, 12), SPREAD.x - 14, y - 14);
    plot(SPREAD.x - 2, y - 2, SPREAD.w + 4, SPREAD.h + 4, "#0a0806");
    plot(SPREAD.x - 1, y - 1, SPREAD.w + 2, SPREAD.h + 2, t.look.leather);
    for (const [px, pw] of [[SPREAD.x + 2, half - 3], [SPINE + 2, half - 3]]) {
      plot(px, y + 2, pw, SPREAD.h - 4, PARCH[2]);
      plot(px, y + 2, pw, 1, PARCH[3]);
      plot(px, y + SPREAD.h - 3, pw, 1, PARCH[0]);
      for (let k = 1; k < 3; k++) plot(px + (px < SPINE ? -k : pw + k - 1), y + 2 + k, 1, SPREAD.h - 4 - 2 * k, PARCH[1]);   // page edges
    }
    plot(SPINE - 1, y, 3, SPREAD.h, "#3a2c1c");
    if (show.left) {
      ctx.font = FONT; ctx.textAlign = "left"; ctx.fillStyle = PAGE_INK;
      wrap(page.name, 14).slice(0, 2).forEach((l, k) => ctx.fillText(l, SPREAD.x + 8, y + 18 + k * 10));
      for (let k = 1; k <= 5; k++) plot(SPREAD.x + 8 + (k - 1) * 9, y + 44, 7, 7, k <= page.tier ? RARITY[k].c : PARCH[1]);
      ctx.fillStyle = "#6a5638";
      ctx.fillText(`UP TO ${RARITY[page.tier].n}`, SPREAD.x + 8, y + 64);
      ctx.fillText(`${i + 1} / ${t.pages.length}`, SPREAD.x + 8, y + SPREAD.h - 10);
    }
    if (show.right) {
      const sz = 66, sg = pageSigil(page, sz, PAGE_INK, true);
      ctx.drawImage(sg, Math.round(SPINE + (half - sz) / 2), Math.round(y + (SPREAD.h - sz) / 2));
    }
  }
  // a single leaf in the air, v 0 → 1 carrying it from the right page to
  // the left (or back), lifting as it passes the spine; blank but for a
  // few lines of writing too small to read
  function drawLeaf(v, seed) {
    const y = BOOK_Y - SPREAD.h, half = SPINE - SPREAD.x - 3, lift = Math.sin(v * Math.PI) * 10;
    const edge = SPINE + Math.cos(v * Math.PI) * half, x0 = Math.min(SPINE, edge), w = Math.abs(edge - SPINE);
    if (w < 1) { plot(SPINE - 1, y - lift, 3, SPREAD.h, PARCH[3]); return; }
    plot(x0, y + 2 - lift, w, SPREAD.h - 4, v < 0.5 ? PARCH[3] : PARCH[2]);
    plot(edge < SPINE ? x0 : x0 + w - 1, y + 2 - lift, 1, SPREAD.h - 4, PARCH[0]);
    for (let k = 0; k < 6; k++) {
      const ly = y + 14 + k * 12 - lift, lw = Math.max(0, w * (0.45 + ((seed * 7 + k * 13) % 5) / 12) - 6);
      if (lw > 2) plot(x0 + 3, ly, lw, 1, "#b49a70");
    }
  }

  /* ─── the tome's light: a pool on the plinth, motes rising round it ─ */
  const bob = () => (view.calm ? 0 : Math.round(Math.sin(S.t * 0.045) * 2));
  function drawLight() {
    if (!has()) return;
    const col = tome().look.trim;
    ctx.globalAlpha = 0.22 + (view.calm ? 0 : 0.06 * Math.sin(S.t * 0.045));
    plot(62, PLINTH_Y, 71, 2, col); ctx.globalAlpha *= 0.5; plot(66, PLINTH_Y + 2, 63, 6, col);
    ctx.globalAlpha = 1;
    if (view.calm) return;
    for (let i = 0; i < 12; i++) {
      const life = 120 + (i * 37) % 90, u = ((S.t + i * 53) % life) / life;
      const x = W / 2 + Math.sin(i * 2.1 + u * 4) * (30 + (i % 4) * 9), y = PLINTH_Y - u * 140;
      ctx.globalAlpha = Math.sin(u * Math.PI) * 0.9; plot(x, y, 1, 1, i % 3 ? col : "#ffffff");
    }
    ctx.globalAlpha = 1;
  }

  function drawTab() {
    const [x, y, w, h] = DESK_TAB;
    plot(x, y, w, h, ST[3]); plot(x, y, w, 1, ST[5]); plot(x, y + h - 1, w, 1, ST[0]);
    ctx.font = FONT; ctx.textAlign = "center"; ctx.fillStyle = INK_ON; ctx.fillText("DESK >", x + w / 2, y + 12);
  }

  /* ─── each frame ─────────────────────────────────────────────────── */
  const OPEN_T = 54, TURN_T = 14, CLOSE_T = 12;
  function frame() {
    S.t++;
    ctx.drawImage(hall, 0, 0);
    drawLight();
    const quick = view.calm;
    // an open book floats as the closed one does
    ctx.save(); if (S.phase !== "closed") ctx.translate(0, bob());
    if (S.phase === "closed") drawClosed();
    else if (S.phase === "opening") {
      S.pt++;
      const T = quick ? 1 : OPEN_T;
      if (S.pt < 12 && !quick) {
        // the cover swings back off the spine
        const u = ease(S.pt / 12), cover = tomeCover(tome(), true), y = BOOK_Y - CLOSED.h - (SPREAD.h - CLOSED.h) * u;
        drawSpread(S.page, { left: false, right: false });
        const cw = Math.max(1, Math.round(CLOSED.w * (1 - u)));
        ctx.drawImage(cover, SPINE + 1, y, cw, CLOSED.h + (SPREAD.h - CLOSED.h) * u);
      } else if (S.pt < T) {
        // the riffle: leaves flicking over, quick then slowing
        drawSpread(S.page, { left: false, right: false });
        const v = (S.pt - 12) / (T - 12), n = 7, at = ease(v) * n, k = Math.floor(at);
        if (k < n) drawLeaf(at - k, k);
        if (k !== S.leaf && k < n) { S.leaf = k; bus.feel("leaf"); }
      } else { S.phase = "open"; drawSpread(S.page); }
    } else if (S.phase === "open") drawSpread(S.page);
    else if (S.phase === "turning") {
      S.pt++;
      const v = Math.min(1, S.pt / (quick ? 1 : TURN_T)), fwd = S.dir > 0;
      // underneath: the page coming (on the side the leaf uncovers) and going
      drawSpread(S.page, { left: false, right: false });
      if (fwd) { drawSpreadHalf(S.next, "right"); if (v > 0.5) drawSpreadHalf(S.next, "left"); else drawSpreadHalf(S.page, "left"); }
      else { drawSpreadHalf(S.next, "left"); if (v > 0.5) drawSpreadHalf(S.next, "right"); else drawSpreadHalf(S.page, "right"); }
      drawLeaf(fwd ? v : 1 - v, S.next);
      if (v >= 1) { S.page = S.next; S.phase = "open"; bus.choose(tome().id, S.page); }
    } else if (S.phase === "closing") {
      S.pt++;
      const u = ease(Math.min(1, S.pt / (quick ? 1 : CLOSE_T)));
      drawSpread(S.page, { left: false, right: false });
      const cover = tomeCover(tome(), true), cw = Math.max(1, Math.round(CLOSED.w * u));
      ctx.drawImage(cover, SPINE + 1, BOOK_Y - SPREAD.h + (SPREAD.h - CLOSED.h) * u, cw, SPREAD.h - (SPREAD.h - CLOSED.h) * u);
      if (u >= 1) S.phase = "closed";
    }
    ctx.restore();
    if (S.phase === "open") {
      ctx.font = FONT; ctx.textAlign = "center"; ctx.fillStyle = INK_ON;
      ctx.fillText(tome().name, W / 2, 96);
      ctx.fillStyle = INK_SOFT;
      ctx.fillText("TAP OR SWIPE IT TO TURN", W / 2, 107);
      ctx.fillText("TAP HERE TO CLOSE IT", W / 2, 118);
    }
    drawTab();
  }
  // one side of the spread's content, for a page mid-turn
  function drawSpreadHalf(i, side) {
    const t = tome(), page = t.pages[i], y = BOOK_Y - SPREAD.h, half = SPINE - SPREAD.x;
    if (side === "right") {
      plot(SPINE + 2, y + 2, half - 3, SPREAD.h - 4, PARCH[2]);
      const sz = 66; ctx.drawImage(pageSigil(page, sz, PAGE_INK, true), Math.round(SPINE + (half - sz) / 2), Math.round(y + (SPREAD.h - sz) / 2));
    } else {
      plot(SPREAD.x + 2, y + 2, half - 3, SPREAD.h - 4, PARCH[2]);
      ctx.font = FONT; ctx.textAlign = "left"; ctx.fillStyle = PAGE_INK;
      wrap(page.name, 14).slice(0, 2).forEach((l, k) => ctx.fillText(l, SPREAD.x + 8, y + 18 + k * 10));
      for (let k = 1; k <= 5; k++) plot(SPREAD.x + 8 + (k - 1) * 9, y + 44, 7, 7, k <= page.tier ? RARITY[k].c : PARCH[1]);
      ctx.fillStyle = "#6a5638";
      ctx.fillText(`UP TO ${RARITY[page.tier].n}`, SPREAD.x + 8, y + 64);
      ctx.fillText(`${i + 1} / ${t.pages.length}`, SPREAD.x + 8, y + SPREAD.h - 10);
    }
  }

  /* ─── what the player does ───────────────────────────────────────── */
  const hit = (p, [x, y, w, h]) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
  const onBook = p => {
    if (S.phase === "closed") return hit(p, [W / 2 - CLOSED.w / 2 - 6, BOOK_Y - CLOSED.h - 6, CLOSED.w + 12, CLOSED.h + 12]);
    return hit(p, [SPREAD.x, BOOK_Y - SPREAD.h, SPREAD.w, SPREAD.h]);
  };
  function cycle(d) {
    const at = Math.max(0, Math.min(tomes.length - 1, S.at + d));
    if (at === S.at) return;
    S.at = at; bus.feel("tap");
    const t = tome();
    bus.say(bus.owned().includes(t.id) ? `${t.name}, ${t.pages.length} PAGES.` : `A TOME NOT YET FOUND. ${bus.where(t.tier)}.`);
  }
  function open() {
    if (!has()) { bus.feel("error"); bus.say(`IT IS CHAINED SHUT. ${bus.where(tome().tier)}.`); return; }
    const c = bus.chosen();
    S.page = c.tome === tome().id ? Math.min(c.page, tome().pages.length - 1) : 0;
    S.phase = "opening"; S.pt = 0; S.leaf = -1;
    bus.choose(tome().id, S.page);
    bus.feel("open");
    bus.say(`${tome().name}, OPEN AT ${tome().pages[S.page].name}.`);
  }
  function turn(d) {
    const next = S.page + d;
    if (next < 0 || next >= tome().pages.length) { bus.feel("error"); return; }
    S.dir = d; S.next = next; S.phase = "turning"; S.pt = 0; bus.feel("tap");
    bus.say(`${tome().pages[next].name}. ${next + 1} OF ${tome().pages.length}.`);
  }
  function close() { S.phase = "closing"; S.pt = 0; bus.feel("tap"); }

  let down = null;
  const onDown = e => { down = { ...pointer(cv, e), t: performance.now() }; };
  const onUp = e => {
    if (!down) return;
    const p = pointer(cv, e), dx = p.x - down.x, dy = p.y - down.y, startOnBook = onBook(down);
    const swipe = Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 1.2;
    const from = down; down = null;
    if (hit(from, DESK_TAB) && !swipe) return bus.back();
    if (swipe && !startOnBook) { if (dx < 0) return bus.back(); return; }
    if (S.phase === "closed") {
      if (swipe) return cycle(dx < 0 ? 1 : -1);
      if (hit(from, ARROWS.back)) return cycle(-1);
      if (hit(from, ARROWS.on)) return cycle(1);
      if (onBook(from)) return open();
    } else if (S.phase === "open") {
      if (swipe) return turn(dx < 0 ? 1 : -1);
      if (onBook(from)) return turn(from.x < SPINE ? -1 : 1);
      if (from.y < BOOK_Y - SPREAD.h) return close();
    }
  };
  const onCancel = () => { down = null; };
  cv.addEventListener("pointerdown", onDown);
  cv.addEventListener("pointerup", onUp);
  cv.addEventListener("pointercancel", onCancel);

  const teardown = () => {
    stop();
    cv.removeEventListener("pointerdown", onDown);
    cv.removeEventListener("pointerup", onUp);
    cv.removeEventListener("pointercancel", onCancel);
  };
  // for controls outside the canvas (keyboard, screen readers)
  teardown.cycle = cycle; teardown.turn = turn;
  teardown.open = () => (S.phase === "closed" ? open() : null);
  teardown.close = () => (S.phase === "open" ? close() : null);
  teardown.isOpen = () => S.phase !== "closed";
  return teardown;
}
