/* ══════════════════════════════════════════════════════════════════════
 *  the lectern — where the tomes are read
 *  ────────────────────────────────────────────────────────────────────
 *  To the left of the scribe's desk: a pale marble hall, columns either
 *  side, light falling from above onto a lectern, and on it the tome you
 *  have chosen, closed. Its arrows (or a swipe across it) bring up your
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

export const SURROUND = [20, 19, 17];

// marble, lightest to darkest, and the ink written on it
const M = ["#f2efe8", "#dcd8ce", "#c4bfb3", "#a39e92", "#7a756b", "#4e4a43", "#2a2722"];
const INK_ON = "#3a352c", INK_SOFT = "#6a6458";
const PARCH = ["#8a7652", "#a89068", "#c4ab80", "#d8c49a"], PAGE_INK = "#2a2014";

const BOOK_Y = 246;                                // the lectern's lip: the book stands on it
const CLOSED = { w: 72, h: 90 };                    // the cover at 3×
const SPREAD = { x: 12, w: 171, h: 100 };           // the open book
const SPINE = SPREAD.x + Math.floor(SPREAD.w / 2);
const ARROWS = { back: [8, 186, 24, 30], on: [W - 32, 186, 24, 30] };
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

  /* ─── the hall, drawn once ───────────────────────────────────────── */
  const hall = document.createElement("canvas"); hall.width = W; hall.height = H;
  {
    const c = hall.getContext("2d"), p = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    // the back wall, brightest where the light falls in the middle
    for (let x = 0; x < W; x++) { const k = Math.abs(x - W / 2) / (W / 2); p(x, 24, 1, 306, k < 0.3 ? M[1] : k < 0.65 ? M[2] : M[3]); }
    // an arch in the wall behind the lectern
    for (let y = 60; y < 300; y++) for (let x = 50; x < 146; x++) {
      const cx = 97.5, r = 48, top = 108, inArch = y >= top ? true : Math.hypot(x - cx, y - top) <= r;
      const edge = y >= top ? (x < 54 || x > 141) : Math.hypot(x - cx, y - top) > r - 4;
      if (inArch) p(x, y, 1, 1, edge ? M[3] : M[2]);
    }
    // the frieze along the top, its dentils, the architrave
    p(0, 0, W, 24, M[1]); p(0, 0, W, 2, M[0]);
    for (let x = 2; x < W; x += 7) p(x, 16, 4, 4, M[3]);
    p(0, 22, W, 2, M[4]);
    // columns either side: capital, fluted shaft, base
    for (const cx of [17, W - 18]) {
      p(cx - 15, 24, 30, 4, M[0]); p(cx - 14, 28, 28, 6, M[1]); p(cx - 15, 33, 30, 2, M[4]);
      for (const vx of [cx - 11, cx + 9]) { p(vx, 28, 3, 3, M[3]); p(vx + 1, 29, 1, 1, M[5]); }   // the volutes
      for (let x = cx - 11; x < cx + 11; x++) {
        const f = (x - (cx - 11)) % 4, lit = x < cx;
        p(x, 35, 1, 283, f === 0 ? M[4] : f === 1 ? (lit ? M[0] : M[2]) : lit ? M[1] : M[3]);
      }
      p(cx - 13, 318, 26, 4, M[1]); p(cx - 15, 322, 30, 8, M[2]); p(cx - 15, 329, 30, 1, M[5]);
    }
    // the floor: rows of tiles, larger as they come nearer, veined
    p(0, 330, W, 1, M[5]);
    let y = 331, hgt = 10, row = 0;
    while (y < H) {
      const tw = 24 + row * 10;
      for (let x = -(row * 5) % tw, k = 0; x < W; x += tw, k++) {
        p(x, y, tw, hgt, (k + row) % 2 ? M[2] : M[1]);
        p(x, y, 1, hgt, M[3]);
      }
      p(0, y + hgt - 1, W, 1, M[3]);
      y += hgt; hgt += 6; row++;
    }
    for (let i = 0; i < 40; i++) { const vx = (i * 53) % W, vy = 334 + (i * 29) % 86; p(vx, vy, 2, 1, M[3]); p(vx + 2, vy + 1, 2, 1, M[3]); }
    // the lectern: a plinth, a fluted shaft, a capital, a sloped board with its lip
    p(64, 372, 67, 14, M[2]); p(64, 372, 67, 2, M[0]); p(64, 385, 67, 1, M[5]);
    p(72, 366, 51, 6, M[1]);
    for (let x = 84; x < 112; x++) { const f = (x - 84) % 4, lit = x < 98; p(x, 262, 1, 104, f === 0 ? M[4] : f === 1 ? (lit ? M[0] : M[2]) : lit ? M[1] : M[3]); }
    p(76, 254, 44, 8, M[1]); p(76, 254, 44, 1, M[0]); p(76, 261, 44, 1, M[4]);
    p(26, 238, 144, 8, M[0]); p(26, 246, 144, 8, M[2]); p(26, 253, 144, 1, M[5]);
    p(26, 238, 1, 16, M[4]); p(169, 238, 1, 16, M[4]);
  }

  /* ─── the book ────────────────────────────────────────────────────── */
  function drawClosed() {
    const t = tome(), own = has(), cover = tomeCover(t, own);
    const x = Math.round(W / 2 - CLOSED.w / 2), y = BOOK_Y - CLOSED.h;
    plot(x + 3, BOOK_Y - 2, CLOSED.w, 3, M[3]);                          // its shadow on the board
    ctx.drawImage(cover, x, y, CLOSED.w, CLOSED.h);
    if (!own) {                                                            // chained shut
      for (let i = 0; i < CLOSED.w + 10; i += 4) {
        const a = [x - 5 + i, y + 18 + i * 0.7], b = [x - 5 + i, y + CLOSED.h - 18 - i * 0.7];
        for (const [cx, cy] of [a, b]) { plot(cx, cy, 3, 2, (i / 4) % 2 ? "#5e5a52" : "#8e8a80"); plot(cx, cy + 2, 3, 1, "#2a2722"); }
      }
    }
    ctx.font = FONT; ctx.textAlign = "center"; ctx.fillStyle = INK_ON;
    ctx.fillText(own ? t.name : "NOT YET FOUND", W / 2, 116);
    ctx.fillStyle = INK_SOFT;
    ctx.fillText(own ? `${t.pages.length} PAGES` : bus.where(t.tier), W / 2, 127);
    // arrows to the other tomes
    if (tomes.length > 1) { arrow(ARROWS.back, "<", S.at > 0); arrow(ARROWS.on, ">", S.at < tomes.length - 1); }
    ctx.fillStyle = INK_SOFT; ctx.fillText(own ? "TAP THE BOOK TO OPEN IT" : "", W / 2, 142);
  }
  function arrow([x, y, w, h], label, on) {
    plot(x, y, w, h, on ? M[1] : M[2]); plot(x, y, w, 1, M[0]); plot(x, y + h - 1, w, 1, M[4]);
    ctx.font = FONT; ctx.textAlign = "center"; ctx.fillStyle = on ? INK_ON : M[3];
    ctx.fillText(label, x + w / 2, y + h / 2 + 3);
  }

  // the spread, open at page i, with `left`/`right` hidden while a page turns
  function drawSpread(i, show = { left: true, right: true }) {
    const t = tome(), page = t.pages[i], y = BOOK_Y - SPREAD.h, half = SPINE - SPREAD.x;
    plot(SPREAD.x + 3, BOOK_Y - 2, SPREAD.w, 3, M[3]);
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

  /* ─── the light, falling from above, motes drifting in it ────────── */
  function drawLight() {
    ctx.globalAlpha = 0.09;
    for (let y = 24; y < BOOK_Y; y++) { const k = (y - 24) / (BOOK_Y - 24), half = 16 + k * 58; plot(W / 2 - half, y, half * 2, 1, "#fffbe8"); }
    ctx.globalAlpha = 1;
    if (view.calm) return;
    for (let i = 0; i < 14; i++) {
      const life = 900 + (i * 137) % 500, u = ((S.t + i * 211) % life) / life;
      const x = W / 2 + Math.sin(i * 2.3 + S.t * 0.01) * (14 + u * 40) * (i % 2 ? 1 : -1), y = 30 + u * (BOOK_Y - 50);
      ctx.globalAlpha = Math.sin(u * Math.PI) * 0.8; plot(x, y, 1, 1, "#fffef4");
    }
    ctx.globalAlpha = 1;
  }

  function drawTab() {
    const [x, y, w, h] = DESK_TAB;
    plot(x, y, w, h, M[1]); plot(x, y, w, 1, M[0]); plot(x, y + h - 1, w, 1, M[4]);
    ctx.font = FONT; ctx.textAlign = "center"; ctx.fillStyle = INK_ON; ctx.fillText("DESK >", x + w / 2, y + 12);
  }

  /* ─── each frame ─────────────────────────────────────────────────── */
  const OPEN_T = 54, TURN_T = 14, CLOSE_T = 12;
  function frame() {
    S.t++;
    ctx.drawImage(hall, 0, 0);
    drawLight();
    const quick = view.calm;
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
    if (S.phase === "open") {
      ctx.font = FONT; ctx.textAlign = "center"; ctx.fillStyle = INK_ON;
      ctx.fillText(tome().name, W / 2, 106);
      ctx.fillStyle = INK_SOFT;
      ctx.fillText("TAP OR SWIPE IT TO TURN", W / 2, 120);
      ctx.fillText("TAP HERE TO CLOSE IT", W / 2, 131);
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
