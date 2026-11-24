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
 *    bus.offer(scrolls)   → Promise<{ hints, lean, chests }>  one or several at once
 *    bus.visit()          → Promise<{ gift }>
 *    bus.say(text)        for the aria-live region
 *    bus.feel(name)       sound + haptics hook
 *    bus.received(what)   a chest or gift has landed in the satchel
 *    bus.toDesk()         the player asked to go and draw
 *    bus.more()           true while he still has something waiting (the daily gift)
 *    bus.coach()          a line for a player who has never offered, or null
 *    bus.toStall()        he has walked away to his stall: show it
 *    bus.season()         the season of the event running today
 *                        (shared/events.js), or null: the door is dressed
 *    bus.invite()         "first": there is something on his stall you could
 *                        buy and you have never been (his lantern burns
 *                        bright, he says so once, an arrow points up);
 *                        "known": you have been (it burns low); or null
 *
 *  A swipe up from high in the frame (on him, not the satchel) asks for
 *  his wares: he turns, walks off into the light and the scene goes to
 *  black. teardown.back() brings him back to the door.
 *
 *  There is no menu, no price and no tooltip in here, and there must not
 *  be. His posture is the only meter.
 * ══════════════════════════════════════════════════════════════════════ */

import { present } from "../lib/presentArt.js";
import { RAMP } from "../lib/pixelform.js";
import {
  goblinHand, goblinHandPoint, GOBLIN_HAND, playerHand, PLAYER_HAND,
  tiedScroll, TIED, chest as chestSprite, pouch,
} from "../lib/forms.js";
import { auraFrame, LOOP as AURA_LOOP, PAD as AURA_PAD, TOP as AURA_TOP } from "../lib/spriteAura.js";
import { playerHandArt, loadPlayerHand, HAND_ART } from "../lib/playerHandArt.js";
import { RARITY } from "../../shared/sigil.js";
import { stage, pointer, W, H, FONT, INK, lerp, ease, wrap, grainLayer, feather } from "./kit.js";

/* the colour the scene dissolves into at its edges; Door.jsx paints the page with it */
export const SURROUND = [4, 5, 7];

export function mount(cv, bus) {
  loadPlayerHand();                    // usually already in hand from the loading screen

const P = {
  wall:"#050609", jamb:"#0d0f15", cloak:"#040507",
  glint:"#aef0d6", dust:"#3a4150",
  magic:"#8fd4b4",
  panel:"#0b0d12", panelLine:"#20242e",
};

const GX = 72, GW = 46;          // the slot
const HEADY = 242;
const DRAWER_H = 166;                    // two rows of scrolls with room for their auras, then the button

/* sprite metrics, from the forms that own them */
const HK = GOBLIN_HAND.scale, HT = GOBLIN_HAND.frame;
const OK = PLAYER_HAND.scale, OA = PLAYER_HAND.art;
const OS = { w: Math.round(OA.w * OK), h: Math.round(OA.h * OK) };
const PALM = goblinHandPoint(GOBLIN_HAND.art.palm);
const SHOULDER = goblinHandPoint(GOBLIN_HAND.art.shoulder);
const colourOf = r => (RARITY[r] || RARITY[0]).c;

const S = {
  t: 0,
  mode: "idle",            // idle | drawer | give | arrive | leave | gone | back
  away: 0,                 // 0..1 how far he has walked off; dark: the black over all
  drawer: 0,               // 0..1 slide
  sel: new Set(),          // ids of the scrolls picked to offer
  phase: "", anim: 0,
  lean: bus.lean(),
  reach: 0, want: 0, curl: 0, glow: 0,
  orb: null,               // the scroll in flight
  ourK: 0,                 // our hand's entry, 0..1
  giftR: 0,
  res: null, fail: null,   // the server's answer to an offer
  line: "", lineA: 0,      // what the scene says, top of frame
  blink: 0,
  hurry: false, say: [], queue: [],   // skip-ahead; hints and chests still to come
  arriving: null,          // { kind: "chest"|"gift", tier, k, what }
  coachAt: 90,             // when a player who has never offered is next told what he wants
  dark: 0,
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

/* his stall's lantern, somewhere beyond him, high in the gap: lit once
 * there is something there you could buy (bus.invite "first"), and left
 * burning low once you have been ("known") */
function drawLantern() {
  const how = bus.invite?.(); if (!how) return;
  const a = (how === "first" ? 0.95 : 0.45) * (view.calm ? 1 : 0.82 + Math.sin(S.t * 0.05) * 0.12 + Math.random() * 0.06);
  const ly = 58, lx = Math.round(GX + GW / 2 + (view.calm ? 0 : Math.sin(S.t * 0.017) * 1.5));
  for (let y = 10; y < 112; y++) {
    const d = Math.abs(y - ly) / 50, k = Math.max(0, 1 - d * d) * a * 0.32;
    if (k < 0.02) continue;
    ctx.globalAlpha = k; px(GX, y, GW, 1, "#c98a3a");
  }
  ctx.globalAlpha = a;
  px(lx, 0, 1, ly - 5, "#2a2118");                                    // its chain
  px(lx - 1, ly - 5, 3, 1, "#3a2a18");
  px(lx - 2, ly - 4, 5, 7, "#b07030");
  px(lx - 1, ly - 3, 3, 5, "#ffd890");
  px(lx - 1, ly + 3, 3, 1, "#3a2a18");
  ctx.globalAlpha = 1;
}

/* The Long Night (bus.season() "frost26"), Christmas at the door. Out
 * beyond him, far off through the slot: snow falling on dark pines and a
 * log cabin, a fire lit in its window and smoke from its chimney. On our
 * side, by what light reaches it: a holly wreath with a candy cane
 * hooked on it, and presents stacked against the wall's foot. Framing it
 * all, over the room's dark so they always show that the season is on
 * (drawEventFrame): a string of lights across the top, snow along the foot. */
const SNOWFALL = Array.from({ length: 34 }, (_, i) => ({ x: (i * 13.37) % 1, y: (i * 71.3) % 422, v: 0.25 + ((i * 7) % 10) / 22, ph: i * 1.3 }));
function drawWinter() {
  if (!bus.season?.()) return;
  const flick = view.calm ? 1 : 0.85 + 0.15 * Math.sin(S.t * 0.13) * Math.sin(S.t * 0.07 + 1);
  // far off, at the slot's foot: the pines and the cabin, under snow
  const FY = 300;
  px(GX, FY, GW, 12, "#1a2234"); px(GX, FY, GW, 1, "#8a96ac");                      // the snowfield
  for (const [tx, th] of [[GX + 3, 16], [GX + 11, 22], [GX + 34, 19], [GX + 41, 13]]) {
    for (let k = 0; k < th; k++) {
      const w = Math.max(1, Math.round((k / th) * 7));
      px(tx - (w >> 1), FY - th + k, w, 1, k % 4 === 0 ? "#6a7890" : "#121a26");    // dark pine, snow on its tiers
    }
  }
  const cx0 = GX + 18, cy0 = FY - 11;
  px(cx0, cy0, 13, 11, "#2a1e16"); for (let k = 0; k < 7; k++) px(cx0 - 1 + k, cy0 - 1 - k, 15 - 2 * k, 1, k === 0 ? "#2a1e16" : "#9aa8c0");   // walls, a snowy roof
  for (let y = cy0 + 2; y < FY; y += 3) px(cx0, y, 13, 1, "#1c140e");                // the logs
  px(cx0 + 9, cy0 - 8, 2, 4, "#1c140e");                                               // the chimney
  const fire = flick;                                                                    // the fire, in the window
  px(cx0 + 3, cy0 + 3, 4, 3, "rgb(" + Math.round(200 * fire + 40) + "," + Math.round(120 * fire + 20) + ",40)");
  ctx.globalAlpha = 0.25 * fire; px(cx0 + 1, cy0 + 1, 8, 7, "#e0a050"); ctx.globalAlpha = 1;
  for (let i = 0; i < 6; i++) {                                                          // its smoke, rising
    const t = ((S.t * 0.25 + i * 9) % 54) / 54, sx = cx0 + 10 + Math.sin(t * 6 + i) * 2 + t * 3, sy = cy0 - 9 - t * 40;
    ctx.globalAlpha = 0.35 * (1 - t); px(sx, sy, 2, 1, "#8a8478"); ctx.globalAlpha = 1;
  }
  // the snow, through the slot only: it is falling outside, beyond him
  for (const f of SNOWFALL) {
    const y = view.calm ? f.y : (f.y + S.t * f.v) % H;
    const x = GX + 1 + f.x * (GW - 2) + (view.calm ? 0 : Math.sin(S.t * 0.02 + f.ph) * 1.5);
    const k = Math.max(0, 1 - Math.abs(y - 212) / (H * 0.42));
    ctx.globalAlpha = 0.25 + 0.6 * k; px(x, y, 1, 1, "#e8f0ff");
  }
  ctx.globalAlpha = 1;
  // the wreath, on the wall to the left of the door, in the slot's light
  const wx = 36, wy = 156, R = 11;
  for (let a = 0; a < 64; a++) {
    const t = a / 64 * Math.PI * 2;
    for (const r of [R - 2, R - 1, R, R + 1]) {
      const x = wx + Math.cos(t) * r, y = wy + Math.sin(t) * r, lit = Math.cos(t) > 0.2;
      px(x, y, 1, 1, ((a * 7 + r) % 5 === 0) ? (lit ? "#3e6a44" : "#22382a") : (lit ? "#2c5034" : "#16261c"));
    }
  }
  for (const [bx, by] of [[wx - 8, wy - 6], [wx + 9, wy - 3], [wx + 5, wy + 8], [wx - 6, wy + 7], [wx + 1, wy - 11]]) {
    px(bx, by, 2, 2, "#7a1e1c"); px(bx, by, 1, 1, "#b8403a");
  }
  px(wx - 3, wy + 10, 7, 3, "#7a1e1c"); px(wx - 1, wy + 13, 1, 4, "#7a1e1c"); px(wx + 1, wy + 13, 1, 5, "#5e1614");
  // a candy cane hooked over it
  for (let k = 0; k < 14; k++) px(wx + 8, wy - 4 + k, 2, 1, k % 4 < 2 ? "#c8c0b8" : "#8a2420");
  px(wx + 9, wy - 6, 2, 1, "#8a2420"); px(wx + 11, wy - 5, 1, 2, "#c8c0b8"); px(wx + 11, wy - 3, 1, 1, "#8a2420");
  // presents stacked at the foot of the wall, half in the dark
  ctx.globalAlpha = 0.7;
  // (painted ones are 48 × 40, ours 32: either way they stay clear of the jamb)
  const big = present(0).width > 40;
  if (big) { ctx.drawImage(present(2), 4, 256); ctx.drawImage(present(0), -6, 268); ctx.drawImage(present(1), 20, 276); }
  else { ctx.drawImage(present(0), 4, 268); ctx.drawImage(present(1), 26, 276); ctx.drawImage(present(2), 14, 246); }
  ctx.globalAlpha = 1;
}

const BULBS = ["#ff5a4a", "#ffd060", "#5ab0ff", "#6ae07a", "#ff8ad8"];
function drawEventFrame() {
  if (!bus.season?.()) return;
  // the wire, swagged between hooks along the top edge
  const sag = x => 3 + Math.round(Math.sin(((x % 49) / 49) * Math.PI) * 5);
  for (let x = 0; x < W; x++) px(x, sag(x), 1, 1, "#1a2018");
  for (let x = 0; x < W; x += 49) px(x, 0, 1, 4, "#1a2018");
  // a bulb every eleven pixels, twinkling in a slow chase
  for (let i = 0, x = 5; x < W; i++, x += 11) {
    const y = sag(x) + 1, c = BULBS[i % BULBS.length];
    const on = view.calm ? 1 : 0.55 + 0.45 * Math.max(0, Math.sin(S.t * 0.05 - i * 0.9));
    ctx.globalAlpha = 0.22 * on; px(x - 3, y - 1, 8, 8, c); ctx.globalAlpha = 0.4 * on; px(x - 1, y, 4, 5, c);
    ctx.globalAlpha = 1;
    px(x, y, 2, 1, "#20261c");                                                 // its cap
    px(x, y + 1, 2, 3, c); ctx.globalAlpha = 0.35 + 0.65 * on; px(x, y + 1, 1, 1, "#ffffff"); ctx.globalAlpha = 1;
  }
  // snow banked along the foot of the screen, lumpy, lit cold
  for (let x = 0; x < W; x++) {
    const h = 6 + Math.round(2 * Math.sin(x * 0.11) + 1.5 * Math.sin(x * 0.37 + 1) + (((x * 7) % 5) === 0 ? 1 : 0));
    px(x, H - h, 1, h, "#a8b6cc"); px(x, H - h, 1, 1, "#eef4ff"); if (h > 6) px(x, H - h + 1, 1, 1, "#d8e2f0");
  }
  if (!view.calm) for (let k = 0; k < 3; k++) {                                // a glint or two in it
    const gx = (k * 67 + (S.t >> 4) * 23) % W, gy = H - 4 - (k % 2) * 2;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(S.t * 0.2 + k); px(gx, gy, 1, 1, "#ffffff"); ctx.globalAlpha = 1;
  }
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
  // Walking away (S.away) he is drawn smaller about a point deep in the
  // slot, drifting to its middle, his back to us (no eyes), bobbing.
  const k = 1 - 0.62 * S.away, AX = GX + GW / 2, AY = 236;
  const step = S.away > 0.2 && !view.calm ? Math.abs(Math.sin(S.t * 0.22)) * 2 * (1 - S.away) : 0;
  const cx0 = GX + GW - 7 - lean * 5, cx = cx0 + (AX - cx0) * Math.min(1, S.away * 1.6);
  const sway = view.calm ? 0 : Math.sin(S.t * 0.012) * 1.0;
  const HEADCY = HEADY + 11;
  const px = (x, y, w, h, c) => {
    if (k === 1) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); return; }
    const X = AX + (x - AX) * k, Y = AY + (y - AY) * k - step;
    ctx.fillStyle = c; ctx.fillRect(Math.round(X), Math.round(Y), Math.max(1, Math.round(w * k)), Math.max(1, Math.ceil(h * k)));
  };

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
  const shut = (S.blink > 0 && S.blink < 9) || S.away > 0.06;     // turned away, his eyes are gone
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

  // the painted hand, once it has loaded: the drawing carries its own
  // forearm off the bottom of the frame
  const art = playerHandArt(false);
  if (art) {
    const ax = gx - HAND_ART.palm.x, ay = gy - HAND_ART.palm.y;
    ctx.drawImage(art, ax, ay);
    if (S.glow > 0.01) {                    // his light reaches across onto us
      ctx.globalAlpha = Math.min(1, S.glow) * 0.8;
      ctx.drawImage(playerHandArt(true), ax, ay);
      ctx.globalAlpha = 1;
    }
    if (holding) drawScroll(gx - 1, Math.round(gy + 2), rarity || 0, false);
    return { x: gx, y: Math.round(gy + 2) };
  }

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

/* a scroll, wreathed in its aura as in the satchel (lib/spriteAura.js):
 * none for common, a cloak from uncommon, wisps from rare, more from
 * legendary; on the shared 8-a-second beat, still for reduced motion */
const auraLevel = r => (r >= 4 ? 3 : r >= 2 ? 2 : r);
const auraBeat = () => (view.calm ? 0 : Math.floor(performance.now() / 125) % AURA_LOOP);
function scrollSprite(r) {
  const col = colourOf(r), lvl = auraLevel(r);
  if (!lvl) return { img: tiedScroll(col), dx: 0, dy: 0 };
  return { img: auraFrame(tiedScroll(col), col, lvl, auraBeat()), dx: AURA_PAD, dy: AURA_TOP };
}
function drawScroll(x, y, r) {
  const { img, dx, dy } = scrollSprite(r);
  ctx.drawImage(img, Math.round(x - TIED.w / 2) - dx, Math.round(y - TIED.h / 2) - dy);
}

/* ── the inventory drawer ────────────────────────────────── */
const CELLS = [];
for (let i = 0; i < 8; i++) CELLS.push({ x: 12 + (i % 4) * 44, y: 24 + ((i / 4) | 0) * 46, w: 40, h: 42 });   // tall enough for an aura
const CONFIRM = { x: 12, y: DRAWER_H - 40, w: W - 24, h: 30 };
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
  if (scrolls.length) {                                 // pick them all in one touch
    const all = scrolls.every(s => S.sel.has(s.id));
    ctx.textAlign = "right"; ctx.fillStyle = all ? P.magic : INK.coldHi; ctx.fillText(all ? "NONE" : "ALL", W - 12, top + 15);
    ctx.fillStyle = INK.cold;
  }

  if (!scrolls.length) {
    ctx.textAlign = "center";
    ctx.fillText("YOU HAVE NOTHING HE WANTS.", W / 2, top + 52);
    ctx.fillText("THE DESK IS WAITING.", W / 2, top + 64);
  }
  for (let i = 0; i < CELLS.length; i++) {
    const c = CELLS[i], s = scrolls[i];
    const bx = c.x, by = top + c.y;
    if (!s) { if (scrolls.length) px(bx, by, c.w, c.h, "#070910"); continue; }
    const on = S.sel.has(s.id), col = colourOf(s.rarity);
    px(bx, by, c.w, c.h, on ? "#141822" : "#0e1118");
    ctx.strokeStyle = on ? col : "#1c2029";
    ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, c.w - 1, c.h - 1);
    // the scroll in its aura, as in the satchel, sat low so the wisps rise into the cell
    drawScroll(bx + c.w / 2, by + c.h - TIED.h / 2 - 2, s.rarity);
  }

  // confirm, or the way to the desk
  const picked = scrolls.filter(s => S.sel.has(s.id)).length;
  const b = CONFIRM, by = top + b.y, can = picked > 0 || !scrolls.length;
  px(b.x, by, b.w, b.h, can ? "#1b2a22" : "#0c0e13");
  ctx.strokeStyle = can ? P.magic : "#1c2029"; ctx.lineWidth = 1;
  ctx.strokeRect(b.x + 0.5, by + 0.5, b.w - 1, b.h - 1);
  ctx.fillStyle = can ? P.magic : INK.off;
  ctx.font = FONT; ctx.textAlign = "center";
  ctx.fillText(!scrolls.length ? "TO THE DESK" : picked > 1 ? "OFFER " + picked : picked ? "OFFER IT" : "SELECT A SCROLL", W / 2, by + 18);
}

/* ── something pushed through the gap ────────────────────────
 * It comes out from behind him low in the slot, then slides down past
 * the bottom of the frame — toward us, into the satchel. */
function drawArriving(cx) {
  const a = S.arriving; if (!a) return;
  const sp = a.kind === "chest" ? (a.season ? present(a.what?.id ?? a.tier) : chestSprite(a.tier, "slot")) : pouch("slot");
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
        // his praise first, then what he makes of it: how near the next
        // chest is, in words, by the same measure as his posture
        S.say = [...(S.res.hints || [])];
        if (!(S.res.chests || []).length) S.say.push(LEAN_LINES[Math.min(LEAN_LINES.length - 1, S.res.lean | 0)]);
        if (S.say.length) speak(S.say.shift());
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
      const got = S.res?.chests || [];
      endGive();
      for (const c of got) S.queue.push({ kind: "chest", tier: c.tier, season: c.season || null, what: { type: "chest", ...c },
        line: c.season ? "THAT IS ENOUGH. HE PUSHES A PRESENT THROUGH THE GAP, TIED WITH RIBBON" : "THAT IS ENOUGH. HE PUSHES A CHEST THROUGH THE GAP" });
    }
  } else if (S.phase === "refuse") {
    S.ourK = Math.max(0, S.ourK - 0.03);
    if (S.ourK <= 0) endGive();
  }
}
function endGive() {
  S.mode = "idle"; S.phase = ""; S.curl = 0; S.orb = null; S.glow = 0; S.want = 1; S.res = null; S.fail = null; S.motes = [];
}
/* what he makes of an offer, by how far toward the next chest it leaves
 * him (shared/economy.js leanOf, 0 to CHESTS.leanSteps): never a number */
const LEAN_LINES = [
  "HE TAKES IT. HE WANTS MORE THAN THIS.",
  "HE TAKES IT. HE WANTS MORE THAN THIS.",
  "HE TAKES IT. NOT ENOUGH YET.",
  "HE TAKES IT. NOT ENOUGH YET.",
  "HE WEIGHS IT. HALFWAY, PERHAPS.",
  "HE WEIGHS IT. HALFWAY, PERHAPS.",
  "HE IS NEARLY SATISFIED.",
  "A LITTLE MORE, AND HE WILL PAY.",
  "A LITTLE MORE, AND HE WILL PAY.",
];
function arrive(a, text) {
  S.arriving = { ...a, k: 0 }; S.mode = "arrive";
  speak(text, 2.6); bus.feel("arrive");
}
function stepArrive() {
  const a = S.arriving;
  if (S.hurry) a.k = Math.min(1, a.k + 0.02);
  a.k = Math.min(1, a.k + 0.0065);
  if (a.k >= 1) {
    S.arriving = null; S.mode = "idle"; bus.received(a.what);
    // he had more than one thing for us (a gift and the day's pouch): ask again
    if (a.visit && bus.more()) visitTimer = setTimeout(doVisit, 900);
  }
}

function beginGive(ids) {
  const scrolls = bus.scrolls().filter(s => ids.includes(s.id));
  if (!scrolls.length || S.mode === "give" || S.mode === "arrive") return;
  // the hand holds out the finest of them; the rest go with it
  const scroll = scrolls.reduce((a, b) => (b.rarity > a.rarity ? b : a));
  S.mode = "give"; S.phase = "reach"; S.anim = 0; S.ourK = 0; S.orb = null; S.motes = [];
  S.giftR = scroll.rarity; S.sel = new Set(); S.res = null; S.fail = null; S.hurry = false;
  bus.feel("offer");
  bus.offer(scrolls).then(
    res => { S.res = res; },
    err => { S.fail = (err && err.message ? String(err.message).toUpperCase() : "THE DOOR DOES NOT ANSWER"); });
}

/* ── to the stall: he turns, walks off into the light, all goes black ── */
function beginLeave() {
  if (S.mode !== "idle") return;
  S.mode = "leave"; S.anim = 0; S.want = 0; S.sel = new Set();
  S.lineA = 0; bus.feel("drawer");
}
function stepLeave() {
  S.anim++;
  if (view.calm) { S.away = 1; S.dark = Math.min(1, S.dark + 0.06); }
  else if (S.anim > 14) S.away = Math.min(1, S.away + 0.011);       // a beat to turn, then the walk
  if (S.away > 0.7 || view.calm) S.dark = Math.min(1, S.dark + 0.035);
  if (S.dark >= 1) { S.mode = "gone"; bus.toStall(); }
}
function stepBack() {
  S.away = 0; S.dark = Math.max(0, S.dark - 0.05);
  if (S.dark <= 0) { S.mode = "idle"; S.want = 1; }
}

function stepHands() { S.reach += (S.want - S.reach) * (S.phase === "withdraw" ? 0.05 : 0.035); }

function frame() {
  S.t++;
  const flick = view.calm ? 0.94 : 0.9 + Math.sin(S.t * 0.03) * 0.05 + Math.sin(S.t * 0.11) * 0.03 + Math.random() * 0.03;

  // the drawer slides
  S.drawer += ((S.mode === "drawer" ? 1 : 0) - S.drawer) * 0.18;
  if (S.drawer < 0.001) S.drawer = 0;

  // a tap during the exchange hurries it along: the same steps, four at a time
  if (S.mode === "give") for (let n = 0, N = S.hurry ? 4 : 1; n < N && S.mode === "give"; n++) { stepGive(); if (n) stepHands(); }
  if (S.mode === "arrive") stepArrive();
  if (S.mode === "leave") stepLeave();
  if (S.mode === "back") stepBack();
  if (S.mode === "idle") {
    S.hurry = false;
    if (S.say?.length && S.lineA < 1) speak(S.say.shift());           // anything else he had to say
    else if (S.queue.length && S.drawer < 0.01) { const a = S.queue.shift(); arrive(a, a.line || "HE PUSHES A CHEST THROUGH THE GAP"); }
    // a player who has never offered is told what he wants, soon after
    // arriving and again every so often while nothing happens
    else if (S.t > S.coachAt && S.lineA < 0.4 && S.drawer < 0.01 && !S.arriving) {
      S.coachAt = S.t + 1200;
      const line = bus.coach();
      if (line) speak(line, 3.4);
    }
    // the first time there is something you could buy from him, he says so
    else if (!S.invited && S.t > 200 && S.lineA < 0.4 && S.drawer < 0.01 && !S.arriving && bus.invite?.() === "first") {
      S.invited = true;
      speak("HE NODS AT YOUR MARKS. HE HAS THINGS TO SELL. SWIPE UP ON HIM.", 3.6);
    }
  }

  // his posture follows the pot, slowly: he does not jump
  S.lean += (bus.lean() - S.lean) * 0.02;
  const patience = 0.3 + 0.7 * S.lean;
  if (S.mode !== "give" && S.mode !== "leave" && S.mode !== "gone") S.want = 0.74 + patience * 0.2;
  stepHands();
  if (S.mode !== "give" && S.curl > 0.001) S.curl += (0 - S.curl) * 0.1;

  drawGap(flick);
  drawLantern();
  drawWinter();
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
  drawEventFrame();
  drawLine();
  drawDrawer();

  if (S.dark > 0) { ctx.globalAlpha = S.dark; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }

  // swipe affordance, only when nothing is happening
  if (S.mode === "idle" && S.drawer < 0.01 && bus.invite?.() === "first") {
    // and until you have been, one up there on him too, toward the lantern
    ctx.globalAlpha = view.calm ? 0.9 : 0.65 + Math.sin(S.t * 0.06) * 0.3;
    const cx = Math.round(GX + GW / 2), bob = view.calm ? 0 : Math.round(Math.sin(S.t * 0.06) * 2);
    for (const dy of [0, 6]) for (let k = 0; k < 4; k++) {               // two chevrons, pointing up
      px(cx - k - 1, 140 + dy + k + bob, 1, 1, "#e0b070"); px(cx + k, 140 + dy + k + bob, 1, 1, "#e0b070");
    }
    ctx.globalAlpha = 1;
  }
  if (S.mode === "idle" && S.drawer < 0.01) {
    ctx.globalAlpha = view.calm ? 0.9 : 0.85 + Math.sin(S.t * 0.04) * 0.15;
    ctx.fillStyle = INK.cold;
    ctx.font = FONT; ctx.textAlign = "center";
    // with scrolls to give, say so by the arrow
    const n = bus.scrolls().length;
    ctx.fillText(n ? `^  ${n} SCROLL${n > 1 ? "S" : ""}` : "^", W / 2, H - 20);
    ctx.globalAlpha = 1;
  }
}

/* ── input ───────────────────────────────────────────────── */
let down = null;
const onDown = e => { down = pointer(cv, e); cv.setPointerCapture?.(e.pointerId); };
const onMove = e => {
  if (!down) return;
  const p = pointer(cv, e);
  if (S.mode === "idle" && down.y - p.y > 26) {
    if (down.y < H * 0.45) beginLeave(); else { S.mode = "drawer"; bus.feel("drawer"); }
    down = null;
  }
};
const onUp = e => {
  if (!down) return;
  const p = pointer(cv, e), start = down; down = null;
  if (S.mode === "give" || S.mode === "arrive") { S.hurry = true; return; }
  if (S.mode === "idle") {
    // a tap low in the frame opens the satchel too: a swipe is not the only way in
    if (p.y > H - 64 && Math.abs(p.y - start.y) < 10) { S.mode = "drawer"; bus.feel("drawer"); }
    return;
  }
  if (S.mode !== "drawer") return;
  if (p.y - start.y > 26) { S.mode = "idle"; S.sel = new Set(); return; }       // swipe back down closes it
  const top = drawerTop();
  if (p.y < top) { S.mode = "idle"; S.sel = new Set(); return; }
  const scrolls = bus.scrolls();
  for (let i = 0; i < CELLS.length; i++) {
    const c = CELLS[i];
    if (!scrolls[i]) continue;
    if (p.x >= c.x && p.x <= c.x + c.w && p.y >= top + c.y && p.y <= top + c.y + c.h) {
      const id = scrolls[i].id;
      S.sel.has(id) ? S.sel.delete(id) : S.sel.add(id); bus.feel("tap"); return;
    }
  }
  const b = CONFIRM;
  if (p.y >= top + b.y - 4 && p.y <= top + b.y + b.h + 4 && p.x >= b.x && p.x <= b.x + b.w) {
    if (!scrolls.length) { bus.toDesk(); return; }
    const ids = scrolls.filter(s => S.sel.has(s.id)).map(s => s.id);
    if (ids.length) beginGive(ids);
    return;
  }
  // ALL / NONE, top right of the drawer
  if (scrolls.length && p.x > W - 60 && p.y >= top && p.y < top + 22) {
    const all = scrolls.every(s => S.sel.has(s.id));
    S.sel = all ? new Set() : new Set(scrolls.map(s => s.id)); bus.feel("tap");
  }
};
const onCancel = () => { down = null; };
cv.addEventListener("pointerdown", onDown);
cv.addEventListener("pointermove", onMove);
cv.addEventListener("pointerup", onUp);
cv.addEventListener("pointercancel", onCancel);

/* ── arrival: he may have something for us ───────────────── */
let alive = true;
let visitTimer = 0;
function doVisit() {
  bus.visit().then(r => {
    if (!alive || !r?.gift) return;
    const g = r.gift;
    const wait = () => {
      if (!alive) return;
      if (S.mode !== "idle") { visitTimer = setTimeout(wait, 400); return; }
      if (g.type === "chest") arrive({ kind: "chest", tier: g.tier, what: g, visit: true }, "HE PUSHES A CHEST THROUGH THE GAP");
      else arrive({ kind: "gift", what: g, visit: true }, "HE PUSHES SOMETHING THROUGH THE GAP");
    };
    wait();
  }, () => {});
}
visitTimer = setTimeout(doVisit, 900);

const teardown = () => {
  alive = false; clearTimeout(visitTimer); stop();
  cv.removeEventListener("pointerdown", onDown);
  cv.removeEventListener("pointermove", onMove);
  cv.removeEventListener("pointerup", onUp);
  cv.removeEventListener("pointercancel", onCancel);
};
/* for controls outside the canvas (keyboard, screen readers) */
teardown.back = () => { if (S.mode === "gone" || S.mode === "leave") { S.mode = "back"; S.dark = 1; S.away = 0; } };
teardown.toStall = () => beginLeave();
teardown.offer = ids => {
  const want = (Array.isArray(ids) ? ids : [ids]).filter(id => bus.scrolls().some(s => s.id === id));
  if (want.length && (S.mode === "idle" || S.mode === "drawer")) beginGive(want);
};
return teardown;
}
