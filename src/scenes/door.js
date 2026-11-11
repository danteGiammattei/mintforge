/* ══════════════════════════════════════════════════════════════════════
 *  The door scene
 *  ────────────────────────────────────────────────────────────────────
 *  LIGHT: one cold slot of light BEHIND the door, up and to the left.
 *  Everything on his side is a silhouette with a grazing rim; everything
 *  on ours is unlit until his magic reaches it.
 *
 *  mount(canvas, bus) → teardown. The scene owns nothing but its canvas:
 *  the scrolls, the pot and the chests all live in game state and reach
 *  it through the bus.
 *
 *    bus.scrolls()        the player's scrolls, [{ id, rarity, seed }]
 *    bus.lean()           0..1, how far the pot has filled — his posture
 *    bus.offer(scroll)    → Promise<{ hint, lean, chest }>
 *    bus.visit()          → Promise<{ gift }>
 *    bus.say(text)        for the aria-live region
 *    bus.feel(name)       sound + haptics hook
 *    bus.received(what)   a chest or gift has landed in the satchel
 *    bus.toDesk()         the player asked to go and draw
 *
 *  There is no menu, no price and no tooltip in here, and there must not
 *  be. His posture is the only meter.
 * ══════════════════════════════════════════════════════════════════════ */

import { RAMP } from "../lib/pixelform.js";
import {
  goblinHand, goblinHandPoint, GOBLIN_HAND, playerHand, PLAYER_HAND,
  rolledScroll, SCROLL, openScroll, INV_SCROLL, chest as chestSprite, pouch,
} from "../lib/forms.js";
import { RARITY } from "../../shared/sigil.js";
import { stage, pointer, W, H, FONT, INK, lerp, ease, wrap, grainLayer, feather } from "./kit.js";

/* the colour the scene dissolves into at its edges; Door.jsx paints the page with it */
export const SURROUND = [4, 5, 7];

export function mount(cv, bus) {

const P = {
  wall:"#050609", jamb:"#0d0f15", cloak:"#040507",
  glint:"#aef0d6", dust:"#3a4150",
  magic:"#8fd4b4",
  panel:"#0b0d12", panelLine:"#20242e",
};

const GX = 72, GW = 46;          // the slot
const HEADY = 242;
const DRAWER_H = 142;

/* sprite metrics, from the forms that own them */
const HK = GOBLIN_HAND.scale, HT = GOBLIN_HAND.frame;
const OK = PLAYER_HAND.scale, OA = PLAYER_HAND.art;
const OS = { w: Math.round(OA.w * OK), h: Math.round(OA.h * OK) };
const SS = Math.round(SCROLL.art * SCROLL.scale);
const PALM = goblinHandPoint(GOBLIN_HAND.art.palm);
const SHOULDER = goblinHandPoint(GOBLIN_HAND.art.shoulder);
const colourOf = r => (RARITY[r] || RARITY[0]).c;

const S = {
  t: 0,
  mode: "idle",            // idle | drawer | give | arrive
  drawer: 0,               // 0..1 slide
  sel: null,               // index into bus.scrolls()
  phase: "", anim: 0,
  lean: bus.lean(),
  reach: 0, want: 0, curl: 0, glow: 0,
  orb: null,               // the scroll in flight
  ourK: 0,                 // our hand's entry, 0..1
  giftR: 0,
  res: null, fail: null,   // the server's answer to an offer
  line: "", lineA: 0,      // what the scene says, top of frame
  blink: 0,
  arriving: null,          // { kind: "chest"|"gift", tier, k, what }
  dust: Array.from({ length: 22 }, () => ({ x: GX + Math.random() * GW, y: Math.random() * H, v: 0.04 + Math.random() * 0.10, p: Math.random() * 6.28 })),
  motes: [],
};

const { ctx, view, stop } = stage(cv, { step: frame });
const grain = grainLayer();
const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };

function speak(text, hold = 2.2) {
  S.line = text; S.lineA = hold;
  bus.say(text);
}

/* ── the lit slot ────────────────────────────────────────── */
function drawGap(flick) {
  px(0, 0, W, H, P.wall);
  const A = [0x0b, 0x0d, 0x12], B = [0x39, 0x42, 0x56];
  for (let y = 0; y < H; y++) {
    const d = Math.abs(y - 212) / (H * 0.38);
    const k = Math.max(0, 1 - d * d) * flick;
    if (k <= 0.03) continue;
    px(GX, y, GW, 1, "rgb(" + Math.round(lerp(A[0], B[0], k)) + "," + Math.round(lerp(A[1], B[1], k)) + "," + Math.round(lerp(A[2], B[2], k)) + ")");
  }
  px(GX - 3, 0, 3, H, P.jamb); px(GX + GW, 0, 3, H, P.jamb);
  px(GX - 1, 0, 1, H, "#000"); px(GX + GW, 0, 1, H, "#000");
}

function drawDust() {
  for (const m of S.dust) {
    if (!view.calm) { m.y -= m.v; m.p += 0.013; }
    if (m.y < -2) { m.y = H + 2; m.x = GX + Math.random() * GW; }
    const x = m.x + Math.sin(m.p) * 2.2;
    if (x < GX || x > GX + GW) continue;
    px(x, m.y, 1, 1, P.dust);
  }
}

/* ── the figure, barely there ────────────────────────────── */
function drawFigure(lean) {
  // He stands hard against the far jamb and leans round it, so only his
  // near half ever clears the frame. No cloak: a bare skull, long swept
  // ears, a thin hunched body, all of it flat black against the slot.
  const cx = GX + GW - 7 - lean * 5;
  const sway = view.calm ? 0 : Math.sin(S.t * 0.012) * 1.0;
  const HEADCY = HEADY + 11;

  ctx.save();
  ctx.beginPath(); ctx.rect(GX - 2, 0, GW + 2, H); ctx.clip();   // the jamb cuts him off

  // ears: long, swept up and back off the sides of the skull
  for (let i = 0; i < 13; i++) {
    const t = i / 14;
    const h = Math.max(1, Math.round(10 - t * t * 9));       // broad at the skull, a point at the tip
    const top = HEADCY - 4 - Math.round(t * t * 8 + t * 4) + sway * 0.3;
    px(cx - 8 - i, top, 1, h, P.cloak);
    px(cx + 7 + i, top, 1, h, P.cloak);
  }
  // skull: a tall oval with a brow that juts over the eyes
  for (let y = HEADY; y < HEADY + 23; y++) {
    const t = (y - HEADY) / 22;
    let hw = 9 * Math.sin(Math.PI * (0.14 + t * 0.82));
    if (t > 0.42 && t < 0.62) hw += 1.2;                     // brow ridge
    if (t > 0.74) hw *= 0.82;                                // jaw narrows
    px(cx - hw + sway * 0.3, y, hw * 2, 1, P.cloak);
  }
  // short neck into narrow hunched shoulders
  for (let y = HEADY + 22; y < HEADY + 30; y++) {
    const t = (y - HEADY - 22) / 8, hw = 3.2 + t * t * 6;
    px(cx - hw + sway * 0.3, y, hw * 2, 1, P.cloak);
  }
  // thin body dropping away into the dark
  const SH = HEADY + 30;
  for (let y = SH; y < H; y++) {
    const t = (y - SH) / 60;
    const hw = 8.5 + t * 3 + Math.sin(y * 0.13) * 0.6;
    const x = cx + sway * Math.min(1, (y - SH) / 50);
    px(x - hw, y, hw * 2, 1, P.cloak);
  }

  // eyes, set under the brow
  S.blink -= 1;
  if (S.blink < -40 && Math.random() < 0.012) S.blink = 14;
  const shut = S.blink > 0 && S.blink < 9;
  if (!shut) {
    const ey = HEADCY + 1;
    const pulse = view.calm ? 0.8 : 0.72 + Math.sin(S.t * 0.035) * 0.2 + Math.sin(S.t * 0.11) * 0.07;
    const g = ctx.createRadialGradient(cx + 0.5, ey, 0, cx + 0.5, ey, 11);
    g.addColorStop(0, "rgba(174,240,214," + (0.3 * pulse) + ")");
    g.addColorStop(0.45, "rgba(143,212,180," + (0.11 * pulse) + ")");
    g.addColorStop(1, "rgba(143,212,180,0)");
    ctx.fillStyle = g; ctx.fillRect(cx - 12, ey - 12, 24, 24);
    ctx.globalAlpha = Math.min(1, pulse);
    px(cx - 4, ey, 2, 1, P.glint); px(cx + 2, ey, 2, 1, P.glint);
    ctx.globalAlpha = Math.min(1, pulse) * 0.55;
    px(cx - 4, ey + 1, 2, 1, "#5fae90"); px(cx + 2, ey + 1, 2, 1, "#5fae90");
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  return cx;
}

/* ── his hand: palm up, open, waiting ────────────────────── */
function drawHand(cx, reach, curl) {
  const out = reach * 58;
  if (out <= 17) return null;

  // the hand itself, slid out from behind the door jamb
  const sp = goblinHand(curl);
  const ext = (out - 17) * 0.20;
  const sx = Math.round(cx - 17.4 - HT.pivot.x * HK + ext * 0.5);
  const sy = Math.round(HEADY + 47.5 - HT.pivot.y * HK + ext * 0.8);
  // the arm runs back behind the jamb, so the sprite is cut there too
  ctx.save();
  ctx.beginPath(); ctx.rect(GX - 2, 0, GW + 4, H); ctx.clip();
  ctx.drawImage(sp, sx, sy);
  // a sleeve over the upper arm where it leaves his body, hiding the join
  const shx = sx + SHOULDER.x, shy = sy + SHOULDER.y;
  const adx = Math.cos(HT.angle), ady = Math.sin(HT.angle);
  for (let t = -13; t <= 11; t++) {
    const k = (t + 13) / 24;
    const hh = Math.max(3, Math.round(7.2 - k * 3.0));   // thick at the body, tapering out
    px(shx + adx * t, shy + ady * t - hh / 2, 1, hh, P.cloak);
  }
  for (let t = 11; t <= 14; t++) {                        // its torn hem
    const hh = (t % 2) ? 3 : 4;
    px(shx + adx * t, shy + ady * t - hh / 2, 1, hh, P.cloak);
  }
  ctx.restore();

  return { x: sx + Math.round(PALM.x), y: sy + Math.round(PALM.y) };
}

/* ── his magic, drawn when he pulls ──────────────────────── */
function drawGlow(palm, k) {
  if (!palm || k <= 0.01) return;
  const g = ctx.createRadialGradient(palm.x, palm.y, 0, palm.x, palm.y, 16 + k * 10);
  g.addColorStop(0, "rgba(143,212,180," + (0.34 * k) + ")");
  g.addColorStop(0.5, "rgba(143,212,180," + (0.12 * k) + ")");
  g.addColorStop(1, "rgba(143,212,180,0)");
  ctx.fillStyle = g; ctx.fillRect(palm.x - 30, palm.y - 30, 60, 60);
  // sigil ticks orbiting the palm
  for (let i = 0; i < 5; i++) {
    const a = S.t * 0.05 + i * 1.256, rr = 9 + Math.sin(S.t * 0.07 + i) * 2.5;
    ctx.globalAlpha = k * 0.9;
    px(palm.x + Math.cos(a) * rr, palm.y + Math.sin(a) * rr * 0.7, 1, 1, P.magic);
    ctx.globalAlpha = 1;
  }
}

/* ── our hand, first person, rising into frame ───────────── */
function drawOurHand(k, holding, rarity) {
  if (k <= 0.01) return null;
  const gx = Math.round(lerp(126, 114, ease(k)));
  const gy = Math.round(lerp(H + 56, 340, ease(k)));
  const T = RAMP.player;

  const ox = Math.round(gx - OA.palm.x * OK), oy = Math.round(gy - OA.palm.y * OK);

  // the forearm carries on off the bottom of the frame
  const armTop = oy + OS.h - 2;
  for (let yy = armTop; yy < H; yy++) {
    const t = (yy - armTop) / Math.max(1, H - armTop);
    const hw = Math.round((12 + t * 3.5) * OK);
    const cxx = Math.round(ox + OA.arm.x * OK);
    px(cxx - hw, yy, hw * 2, 1, T[2]);
    px(cxx - hw, yy, 1, 1, T[0]);
    px(cxx + hw - 1, yy, 1, 1, T[0]);
    px(cxx - hw + 1, yy, 2, 1, T[3]);
    px(cxx - hw + 3, yy, 1, 1, T[4]);
  }

  ctx.drawImage(playerHand(false), ox, oy);
  if (S.glow > 0.01) {                      // his light reaches across onto us
    ctx.globalAlpha = Math.min(1, S.glow) * 0.8;
    ctx.drawImage(playerHand(true), ox, oy);
    ctx.globalAlpha = 1;
  }
  // the scroll lies across the open palm
  if (holding) drawScroll(gx - 1, Math.round(gy + 2), rarity || 0, false);

  return { x: gx, y: Math.round(gy + 2) };
}

function drawScroll(x, y, r, charged) {
  ctx.drawImage(rolledScroll(colourOf(r), !!charged), Math.round(x - SS / 2), Math.round(y - SS / 2));
}

/* ── the inventory drawer ────────────────────────────────── */
const CELLS = [];
for (let i = 0; i < 8; i++) CELLS.push({ x: 12 + (i % 4) * 44, y: 24 + ((i / 4) | 0) * 36, w: 40, h: 32 });
const CONFIRM = { x: 12, y: DRAWER_H - 36, w: W - 24, h: 28 };
const drawerTop = () => H - DRAWER_H * S.drawer;

function drawDrawer() {
  if (S.drawer <= 0.001) return;
  const top = drawerTop(), scrolls = bus.scrolls();
  ctx.globalAlpha = 0.72 * S.drawer;
  px(0, 0, W, H, "#020305");
  ctx.globalAlpha = 1;
  px(0, top, W, DRAWER_H, P.panel);
  px(0, top, W, 1, P.panelLine);
  px(0, top + 1, W, 1, "#000");

  ctx.fillStyle = INK.cold; ctx.font = FONT;
  ctx.textAlign = "left";
  ctx.fillText("YOUR SCROLLS", 12, top + 15);
  if (scrolls.length) { ctx.textAlign = "right"; ctx.fillText("TAP ONE", W - 12, top + 15); }

  if (!scrolls.length) {
    ctx.textAlign = "center";
    ctx.fillText("YOU HAVE NOTHING HE WANTS.", W / 2, top + 52);
    ctx.fillText("THE DESK IS WAITING.", W / 2, top + 64);
  }
  for (let i = 0; i < CELLS.length; i++) {
    const c = CELLS[i], s = scrolls[i];
    const bx = c.x, by = top + c.y;
    if (!s) { if (scrolls.length) px(bx, by, c.w, c.h, "#070910"); continue; }
    const on = (S.sel === i), col = colourOf(s.rarity);
    px(bx, by, c.w, c.h, on ? "#141822" : "#0e1118");
    ctx.strokeStyle = on ? col : "#1c2029";
    ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, c.w - 1, c.h - 1);
    if (s.rarity > 0) {                                  // the ink's glow, behind it
      ctx.globalAlpha = 0.26 + (view.calm ? 0 : Math.sin(S.t * 0.06 + i) * 0.08);
      const g = ctx.createRadialGradient(bx + c.w / 2, by + c.h / 2, 0, bx + c.w / 2, by + c.h / 2, 13);
      g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(bx, by, c.w, c.h);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(openScroll(col, s.seed || 0, s.rarity >= 3), Math.round(bx + (c.w - INV_SCROLL.w) / 2), Math.round(by + (c.h - INV_SCROLL.h) / 2));
  }

  // confirm, or the way to the desk
  const b = CONFIRM, by = top + b.y, can = S.sel !== null || !scrolls.length;
  px(b.x, by, b.w, b.h, can ? "#1b2a22" : "#0c0e13");
  ctx.strokeStyle = can ? P.magic : "#1c2029"; ctx.lineWidth = 1;
  ctx.strokeRect(b.x + 0.5, by + 0.5, b.w - 1, b.h - 1);
  ctx.fillStyle = can ? P.magic : INK.off;
  ctx.font = FONT; ctx.textAlign = "center";
  ctx.fillText(!scrolls.length ? "TO THE DESK" : S.sel !== null ? "OFFER IT" : "SELECT A SCROLL", W / 2, by + 17);
}

/* ── something pushed through the gap ────────────────────────
 * It comes out from behind him low in the slot, then slides down past
 * the bottom of the frame — toward us, into the satchel. */
function drawArriving(cx) {
  const a = S.arriving; if (!a) return;
  const sp = a.kind === "chest" ? chestSprite(a.tier, "slot") : pouch("slot");
  const w = sp.width, h = sp.height;
  const k1 = ease(Math.min(1, a.k / 0.45)), k2 = ease(Math.max(0, (a.k - 0.6) / 0.4));
  const x = Math.round(lerp(cx - 6, GX + (GW - w) / 2, k1));
  const y = Math.round(lerp(330 - h, 336 - h, k1) + k2 * (H - 330 + h));
  ctx.save();
  ctx.beginPath(); ctx.rect(GX, 0, GW, H); ctx.clip();        // it stays in the slot's light
  ctx.drawImage(sp, x, y);
  ctx.restore();
}

function drawLine() {
  if (S.lineA <= 0.01) return;
  ctx.globalAlpha = Math.min(1, S.lineA);
  ctx.fillStyle = INK.coldHi;
  ctx.font = FONT; ctx.textAlign = "center";
  wrap(S.line, 30).forEach((l, i) => ctx.fillText(l, W / 2, 46 + i * 10));
  ctx.globalAlpha = 1;
  S.lineA -= 0.004;
}

/* ── the giving sequence ─────────────────────────────────── */
function stepGive() {
  S.anim++;
  const A = S.anim;
  if (S.phase === "reach") {
    S.ourK = Math.min(1, A / 46);
    if (A >= 58) {
      // the hand waits, held out, until the door has answered
      if (S.res) { S.phase = "pull"; S.anim = 0; bus.feel("pull"); }
      else if (S.fail) { S.phase = "refuse"; S.anim = 0; speak(S.fail); bus.feel("error"); }
    }
  } else if (S.phase === "pull") {
    S.glow = Math.min(1, A / 26);
    if (A > 26 && !S.orb) S.orb = { t: 0 };
    if (S.orb) {
      S.orb.t = Math.min(1, S.orb.t + 0.016);
      if (!view.calm && Math.random() < 0.5) S.motes.push({ life: 1, a: Math.random() * 6.28 });
      if (S.orb.t >= 1) {
        S.phase = "close"; S.anim = 0; bus.feel("taken");
        if (S.res.hint) speak(S.res.hint);
      }
    }
  } else if (S.phase === "close") {
    S.curl = Math.min(1, S.curl + 0.05);
    S.glow = Math.max(0, S.glow - 0.03);
    S.ourK = Math.max(0, S.ourK - 0.022);
    if (S.curl >= 1) { S.phase = "withdraw"; S.anim = 0; }
  } else if (S.phase === "withdraw") {
    S.want = 0; S.ourK = Math.max(0, S.ourK - 0.03);
    if (S.reach < 0.08) {
      const got = S.res?.chest;
      endGive();
      if (got) arrive({ kind: "chest", tier: got.tier, what: { type: "chest", ...got } }, "HE PUSHES A CHEST THROUGH THE GAP");
    }
  } else if (S.phase === "refuse") {
    S.ourK = Math.max(0, S.ourK - 0.03);
    if (S.ourK <= 0) endGive();
  }
}
function endGive() {
  S.mode = "idle"; S.phase = ""; S.curl = 0; S.orb = null; S.glow = 0; S.want = 1; S.res = null; S.fail = null; S.motes = [];
}
function arrive(a, text) {
  S.arriving = { ...a, k: 0 }; S.mode = "arrive";
  speak(text, 2.6); bus.feel("arrive");
}
function stepArrive() {
  const a = S.arriving;
  a.k = Math.min(1, a.k + 0.0065);
  if (a.k >= 1) { S.arriving = null; S.mode = "idle"; bus.received(a.what); }
}

function beginGive(index) {
  const scroll = bus.scrolls()[index];
  if (!scroll || S.mode === "give" || S.mode === "arrive") return;
  S.mode = "give"; S.phase = "reach"; S.anim = 0; S.ourK = 0; S.orb = null; S.motes = [];
  S.giftR = scroll.rarity; S.sel = null; S.res = null; S.fail = null;
  bus.feel("offer");
  bus.offer(scroll).then(
    res => { S.res = res; },
    err => { S.fail = (err && err.message ? String(err.message).toUpperCase() : "THE DOOR DOES NOT ANSWER"); });
}

function frame() {
  S.t++;
  const flick = view.calm ? 0.94 : 0.9 + Math.sin(S.t * 0.03) * 0.05 + Math.sin(S.t * 0.11) * 0.03 + Math.random() * 0.03;

  // the drawer slides
  S.drawer += ((S.mode === "drawer" ? 1 : 0) - S.drawer) * 0.18;
  if (S.drawer < 0.001) S.drawer = 0;

  if (S.mode === "give") stepGive();
  if (S.mode === "arrive") stepArrive();

  // his posture follows the pot, slowly: he does not jump
  S.lean += (bus.lean() - S.lean) * 0.02;
  const patience = 0.3 + 0.7 * S.lean;
  if (S.mode !== "give") S.want = 0.74 + patience * 0.2;
  S.reach += (S.want - S.reach) * (S.phase === "withdraw" ? 0.05 : 0.035);
  if (S.mode !== "give" && S.curl > 0.001) S.curl += (0 - S.curl) * 0.1;

  drawGap(flick);
  drawDust();
  const cx = drawFigure(S.lean);

  const fade = ctx.createLinearGradient(0, 316, 0, 404);
  fade.addColorStop(0, "rgba(5,6,9,0)"); fade.addColorStop(1, "rgba(5,6,9,1)");
  ctx.fillStyle = fade; ctx.fillRect(GX - 5, 316, GW + 10, H - 316);

  const palm = drawHand(cx, S.reach, S.curl);
  drawGlow(palm, S.glow);
  drawArriving(cx);

  // our hand, and the scroll either in it or in flight
  const grip = (S.mode === "give") ? drawOurHand(S.ourK, !S.orb || S.orb.t < 0.04, S.giftR) : null;
  if (S.mode === "give" && grip && palm && S.orb) {
    const t = ease(S.orb.t);
    const ox = lerp(grip.x, palm.x, t);
    const oy = lerp(grip.y, palm.y - 7, t) - Math.sin(S.orb.t * Math.PI) * 12;
    // motes streaming along the path
    for (let i = S.motes.length - 1; i >= 0; i--) {
      const m = S.motes[i]; m.life -= 0.035;
      if (m.life <= 0) { S.motes.splice(i, 1); continue; }
      ctx.globalAlpha = m.life * 0.8;
      px(ox + Math.cos(m.a + S.t * 0.1) * (1 - m.life) * 11, oy + Math.sin(m.a + S.t * 0.1) * (1 - m.life) * 9, 1, 1, P.magic);
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 0.5;
    const hg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 13);
    hg.addColorStop(0, "rgba(143,212,180,.5)"); hg.addColorStop(1, "rgba(143,212,180,0)");
    ctx.fillStyle = hg; ctx.fillRect(ox - 14, oy - 14, 28, 28);
    ctx.globalAlpha = 1;
    drawScroll(ox, oy + (view.calm ? 0 : Math.sin(S.t * 0.14) * 1.2), S.giftR || 0, true);
  }

  // the room's own darkness goes over the scene; words and the satchel
  // go over that, so they are never dimmed below what can be read
  grain(ctx, S.t, view.calm);
  const vg = ctx.createRadialGradient(W * 0.56, H * 0.54, 40, W * 0.56, H * 0.54, H * 0.82);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.74)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  feather(ctx, SURROUND);
  drawLine();
  drawDrawer();

  // swipe affordance, only when nothing is happening
  if (S.mode === "idle" && S.drawer < 0.01) {
    ctx.globalAlpha = view.calm ? 0.8 : 0.62 + Math.sin(S.t * 0.04) * 0.2;
    ctx.fillStyle = INK.cold;
    ctx.font = FONT; ctx.textAlign = "center";
    ctx.fillText("^", W / 2, H - 20);
    ctx.globalAlpha = 1;
  }
}

/* ── input ───────────────────────────────────────────────── */
let down = null;
const onDown = e => { down = pointer(cv, e); cv.setPointerCapture?.(e.pointerId); };
const onMove = e => {
  if (!down) return;
  const p = pointer(cv, e);
  if (S.mode === "idle" && down.y - p.y > 26) { S.mode = "drawer"; down = null; bus.feel("drawer"); }
};
const onUp = e => {
  if (!down) return;
  const p = pointer(cv, e), start = down; down = null;
  if (S.mode === "idle") {
    // a tap low in the frame opens the satchel too: a swipe is not the only way in
    if (p.y > H - 64 && Math.abs(p.y - start.y) < 10) { S.mode = "drawer"; bus.feel("drawer"); }
    return;
  }
  if (S.mode !== "drawer") return;
  if (p.y - start.y > 26) { S.mode = "idle"; S.sel = null; return; }       // swipe back down closes it
  const top = drawerTop();
  if (p.y < top) { S.mode = "idle"; S.sel = null; return; }
  const scrolls = bus.scrolls();
  for (let i = 0; i < CELLS.length; i++) {
    const c = CELLS[i];
    if (!scrolls[i]) continue;
    if (p.x >= c.x && p.x <= c.x + c.w && p.y >= top + c.y && p.y <= top + c.y + c.h) { S.sel = i; bus.feel("tap"); return; }
  }
  const b = CONFIRM;
  if (p.y >= top + b.y && p.y <= top + b.y + b.h && p.x >= b.x && p.x <= b.x + b.w) {
    if (!scrolls.length) { bus.toDesk(); return; }
    if (S.sel !== null) beginGive(S.sel);
  }
};
const onCancel = () => { down = null; };
cv.addEventListener("pointerdown", onDown);
cv.addEventListener("pointermove", onMove);
cv.addEventListener("pointerup", onUp);
cv.addEventListener("pointercancel", onCancel);

/* ── arrival: he may have something for us ───────────────── */
let alive = true;
const visitTimer = setTimeout(() => {
  bus.visit().then(r => {
    if (!alive || !r?.gift) return;
    const g = r.gift;
    const wait = () => {
      if (!alive) return;
      if (S.mode !== "idle") { setTimeout(wait, 400); return; }
      if (g.type === "chest") arrive({ kind: "chest", tier: g.tier, what: g }, "HE PUSHES A CHEST THROUGH THE GAP");
      else arrive({ kind: "gift", what: g }, "HE PUSHES SOMETHING THROUGH THE GAP");
    };
    wait();
  }, () => {});
}, 900);

const teardown = () => {
  alive = false; clearTimeout(visitTimer); stop();
  cv.removeEventListener("pointerdown", onDown);
  cv.removeEventListener("pointermove", onMove);
  cv.removeEventListener("pointerup", onUp);
  cv.removeEventListener("pointercancel", onCancel);
};
/* for controls outside the canvas (keyboard, screen readers) */
teardown.offer = id => {
  const i = bus.scrolls().findIndex(s => s.id === id);
  if (i >= 0 && (S.mode === "idle" || S.mode === "drawer")) beginGive(i);
};
return teardown;
}
