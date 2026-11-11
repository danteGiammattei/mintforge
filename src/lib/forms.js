/* ══════════════════════════════════════════════════════════════════════
 *  forms — every MintForge sprite, as a skeleton
 *  ────────────────────────────────────────────────────────────────────
 *  Each export returns a finished canvas. The shapes live here; the
 *  shading lives in pixelform.js. Nothing in this file knows about
 *  lighting beyond naming which rig it wants.
 *
 *  Authoring convention: build at a generous size with the subject
 *  pointing right and the body end at the left, then let `place()` do
 *  the mirroring, rotation and scaling. That way the same skeleton can
 *  be reused at a different angle without redrawing anything.
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  COINS ARE NOT IN THIS FILE AND MUST NEVER BE.                   │
 *  │                                                                  │
 *  │  Coins keep their own renderer — the 13×13 cellular-automaton    │
 *  │  face in lib/coin.js — untouched. That generator is deliberately │
 *  │  coarse: the blobs are ambiguous enough that players see things  │
 *  │  in them, and an almost-empty face is prized. Both of those come │
 *  │  from the low resolution, not in spite of it. Re-rendering coins │
 *  │  through pixelform would give them more detail, more legible     │
 *  │  shapes, and less meaning. Do not do it. Do not raise the grid   │
 *  │  past 13×13 either.                                              │
 *  └──────────────────────────────────────────────────────────────────┘
 * ══════════════════════════════════════════════════════════════════════ */

import { capsule, joint, digit, merge, place, raster, sprite, quantise, LIGHT, RAMP } from "./pixelform.js";

/* ─── the goblin's hand ───────────────────────────────────────────────
 * Authored from a photograph: a forearm running in from the left and
 * tapering to a narrow wrist, widening into a broad palm held face up,
 * a thumb riding high over a heavy thenar mound, and four fingers
 * fanning out and drifting downward with the pinky shortest.
 *
 * Then mirrored and swung down, so it reaches out of the doorway and
 * across into the light rather than off to the side. */
export const GOBLIN_HAND = {
  art:   { w: 92, h: 52, wrist: { x: 2, y: 26 }, shoulder: { x: -8, y: 27 }, palm: { x: 38, y: 26 } },
  frame: { w: 106, h: 70, pivot: { x: 66, y: 24 }, angle: -0.20 },
  scale: 0.304,
};

function goblinHandForm(curl) {
  const f = [];
  f.push({ C: [
    capsule(-8, 27, 20, 26, 10.0, 7.2),      // forearm into the wrist
    capsule(20, 26, 42, 27, 8.4, 9.0),       // the palm, widening
    capsule(25, 21, 36, 20, 6.2, 5.2),       // thenar mound behind the thumb
  ], J: [] });

  // thumb, riding high and swinging in as the hand closes
  const ta = -0.54 + curl * 0.52;
  const tx = 34 + Math.cos(ta) * 14, ty = 19 + Math.sin(ta) * 14;
  f.push({ C: [
    capsule(34, 19, tx, ty, 4.2, 3.3),
    capsule(tx, ty, tx + Math.cos(ta - 0.3) * 8, ty + Math.sin(ta - 0.3) * 8, 3.3, 2.4),
  ], J: [joint(tx, ty, 3.6)] });

  // four fingers: relaxed when open, hooking up over the palm when shut
  const F = [
    { base: { x: 45, y: 21.5 }, a: 0.04, lens: [16, 11, 7.0], r: 3.6 },
    { base: { x: 46, y: 25.5 }, a: 0.15, lens: [17, 12, 7.5], r: 3.7 },
    { base: { x: 45, y: 29.5 }, a: 0.27, lens: [16, 11, 7.0], r: 3.5 },
    { base: { x: 43, y: 33.0 }, a: 0.42, lens: [12,  9, 5.5], r: 3.0 },
  ];
  for (const d of F) {
    const open = d.a, shut = d.a - 1.05;
    f.push(digit({
      base: d.base,
      angle: open + (shut - open) * curl,
      lens: d.lens, r: d.r,
      bend: 0.13 + curl * -0.75,
      taper: 0.44,
    }));
  }
  return merge(...f);
}

export function goblinHand(curl) {
  const step = quantise(curl, 8);
  return sprite(`goblin-hand:${step}`, () => {
    const G = GOBLIN_HAND;
    const form = place(goblinHandForm(0.06 + (step / 8) * 0.94), {
      mirror: G.art.w - G.frame.pivot.x,   // flip so it reaches left
      angle:  G.frame.angle,               // and hangs slightly down
      pivot:  G.art.wrist,
      at:     G.frame.pivot,
      scale:  G.scale,
    });
    const cv = raster(form, {
      w: Math.round(G.frame.w * G.scale),
      h: Math.round(G.frame.h * G.scale),
      ramp: RAMP.goblin, light: LIGHT.slot, depth: 4.6 * G.scale,
    });
    // the long creases across the palm
    const c = cv.getContext("2d");
    const cr = form.locate(31, 30);
    c.globalAlpha = 0.45; c.fillStyle = RAMP.goblin[1];
    c.fillRect(Math.round(cr.x - 5 * G.scale), Math.round(cr.y), Math.round(11 * G.scale), 1);
    c.fillRect(Math.round(cr.x - 4 * G.scale), Math.round(cr.y + 1), Math.round(10 * G.scale), 1);
    c.globalAlpha = 1;
    return cv;
  });
}

/* ─── the player's hand ───────────────────────────────────────────────
 * Also from a photograph, and the opposite view: the forearm rises from
 * below, pinches at the wrist and opens into a palm turned toward the
 * camera, fingers up and fanned, thumb well clear to the right.
 *
 * Built in two layers so the fingers can close over whatever is resting
 * on the palm instead of beside it. */
export const PLAYER_HAND = {
  art: { w: 62, h: 94, palm: { x: 31, y: 50 }, arm: { x: 35 } },
  scale: 0.60,
};

function playerHandForms() {
  const base = { C: [
    capsule(35, 106, 34, 66, 12, 7.6),       // forearm, near vertical
    capsule(34, 64, 30, 40, 10.2, 9.8),      // back of the hand
    capsule(37, 56, 43, 47, 6.6, 5.0),       // thenar mound
    capsule(43, 47, 55, 38, 4.3, 3.4),       // thumb, out to the right
    capsule(55, 38, 59, 30, 3.4, 2.5),
  ], J: [joint(55, 38, 3.7)] };

  const F = [
    { base: { x: 18.5, y: 39 }, a: -1.80, lens: [13,  9.0, 5.5], r: 3.0 },
    { base: { x: 24.5, y: 37 }, a: -1.66, lens: [17, 12.0, 7.0], r: 3.4 },
    { base: { x: 30.5, y: 36 }, a: -1.53, lens: [18, 13.0, 7.5], r: 3.5 },
    { base: { x: 36.5, y: 37 }, a: -1.39, lens: [16, 11.0, 7.0], r: 3.3 },
  ];
  const fingers = merge(...F.map(d =>
    digit({ base: d.base, angle: d.a, lens: d.lens, r: d.r, bend: 0.09, taper: 0.42 })));

  return { base, fingers };
}

export function playerHand(lit = false) {
  return sprite(`player-hand:${lit ? "magic" : "dark"}`, () => {
    const P = PLAYER_HAND;
    const { base, fingers } = playerHandForms();
    const opts = { mirror: null, angle: 0, pivot: { x: 0, y: 0 }, at: { x: 0, y: 0 }, scale: P.scale };
    const w = Math.round(P.art.w * P.scale), h = Math.round(P.art.h * P.scale);
    const common = {
      w, h, depth: 4.6 * P.scale,
      ramp:  lit ? RAMP.playerMagic : RAMP.player,
      light: lit ? LIGHT.magic : LIGHT.unlit,
    };
    const whole = raster(place(merge(base, fingers), opts), common);
    const c = whole.getContext("2d");
    c.globalAlpha = 0.45; c.fillStyle = common.ramp[1];
    c.fillRect(24 * P.scale, 48 * P.scale, 13 * P.scale, 1);
    c.fillRect(25 * P.scale, 49 * P.scale, 12 * P.scale, 1);
    c.fillRect(27 * P.scale, 55 * P.scale, 10 * P.scale, 1);
    c.globalAlpha = 1;
    return whole;
  });
}

/* Fingers alone, to be drawn over anything held in the palm. */
export function playerFingers(lit = false) {
  return sprite(`player-fingers:${lit ? "magic" : "dark"}`, () => {
    const P = PLAYER_HAND;
    const { fingers } = playerHandForms();
    return raster(place(fingers, { scale: P.scale }), {
      w: Math.round(P.art.w * P.scale), h: Math.round(P.art.h * P.scale),
      depth: 4.6 * P.scale,
      ramp:  lit ? RAMP.playerMagic : RAMP.player,
      light: lit ? LIGHT.magic : LIGHT.unlit,
    });
  });
}

/* ─── the scroll, rolled ──────────────────────────────────────────────
 * A tube on the diagonal with rolled lips at both ends, the open mouth
 * looking into the roll, and a ribbon round the waist. The ribbon takes
 * the rarity's colour — it is the one part visible however the scroll
 * sits, so it carries the tier instead of a glow around the sprite. */
export const SCROLL = { art: 26, scale: 0.82 };

export function rolledScroll(rarityColour, charged = false) {
  const key = `scroll:${rarityColour}:${charged ? "lit" : "dim"}`;
  return sprite(key, () => {
    const S = SCROLL, px = S.scale;
    const form = place({
      C: [capsule(6, 20, 20, 6, 5.6, 5.4)],
      J: [joint(6, 20, 6.3), joint(20, 6, 6.1)],
    }, { scale: px });
    const size = Math.round(S.art * px);
    const cv = raster(form, {
      w: size, h: size, depth: 4.4 * px,
      ramp:  charged ? RAMP.parchmentLit : RAMP.parchment,
      light: charged ? LIGHT.magic : LIGHT.carried,
    });
    const c = cv.getContext("2d");

    // the open mouth, looking into the roll
    c.fillStyle = RAMP.parchment[1];
    c.beginPath(); c.ellipse(6.4 * px, 19.6 * px, 4.2 * px, 3.0 * px, -0.78, 0, 6.283); c.fill();
    c.fillStyle = RAMP.parchment[0];
    c.beginPath(); c.ellipse(6.8 * px, 19.2 * px, 2.3 * px, 1.5 * px, -0.78, 0, 6.283); c.fill();

    // the ribbon, bound across the waist
    const dark = shade(rarityColour, -0.42), lite = shade(rarityColour, 0.22);
    const ax = 0.7071, ay = -0.7071;
    for (let t = -6.4; t <= 6.4; t += 0.34)
      for (let u = -2.1; u <= 2.1; u += 0.34) {
        c.fillStyle = u < -0.9 ? lite : u > 1.0 ? dark : rarityColour;
        c.fillRect(Math.round((13 + ax * u - ay * t) * px), Math.round((13 + ay * u + ax * t) * px), 1, 1);
      }
    for (let i = 0; i < 7; i++) {   // two tails falling from the knot
      c.fillStyle = i > 4 ? dark : rarityColour;
      c.fillRect(Math.round((15.4 + i * 0.55) * px), Math.round((15.2 + i * 0.95) * px), Math.max(1, Math.round((1.6 - i * 0.1) * px)), Math.max(1, Math.round(1.3 * px)));
      c.fillRect(Math.round((17.2 + i * 0.75) * px), Math.round((14.4 + i * 0.72) * px), Math.max(1, Math.round((1.5 - i * 0.1) * px)), Math.max(1, Math.round(1.2 * px)));
    }
    return cv;
  });
}

/* ─── the scroll, open in the satchel ─────────────────────────────────
 * Hung between two knobbed rods and seen face on, because that gives
 * the sigil somewhere to live. Each scroll grows its own mark from its
 * seed — the hook for showing what the player actually drew. */
export const INV_SCROLL = { w: 22, h: 28 };

export function openScroll(rarityColour, seed, smokes = false) {
  return sprite(`inv:${rarityColour}:${seed}:${smokes}`, () => {
    const cv = document.createElement("canvas");
    cv.width = INV_SCROLL.w; cv.height = INV_SCROLL.h;
    const c = cv.getContext("2d");
    const F = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

    F(3, 7, 16, 14, RAMP.parchment[0]);              // the sheet
    F(4, 8, 14, 12, RAMP.parchment[3]);
    F(4, 8, 14, 1, RAMP.parchment[4]);
    F(4, 19, 14, 1, RAMP.parchment[2]);
    F(17, 8, 1, 12, RAMP.parchment[2]);

    const rng = rnd(seed ^ 0x51617);                 // the sigil, mirrored
    for (let y = 0; y < 7; y++) for (let x = 0; x < 3; x++) {
      if (rng() > 0.52) { F(8 + x, 11 + y, 1, 1, rarityColour); F(14 - x, 11 + y, 1, 1, rarityColour); }
    }
    F(11, 11, 1, 7, rarityColour);

    for (const ry of [3, 20]) {                      // rods, with knobbed ends
      F(1, ry, 20, 4, RAMP.wood[0]);
      F(2, ry + 1, 18, 2, RAMP.wood[3]);
      F(2, ry + 1, 18, 1, RAMP.wood[4]);
      F(0, ry, 2, 4, RAMP.wood[1]); F(20, ry, 2, 4, RAMP.wood[1]);
      F(0, ry + 1, 1, 2, RAMP.wood[3]); F(21, ry + 1, 1, 2, RAMP.wood[3]);
    }
    if (smokes) {                                    // the good ones smoke
      c.globalAlpha = 0.75;
      F(8, 1, 1, 2, rarityColour); F(9, 0, 1, 2, rarityColour);
      F(13, 1, 1, 2, rarityColour); F(12, 0, 1, 1, rarityColour);
      c.globalAlpha = 1;
    }
    return cv;
  });
}

/* ─── odds and ends ──────────────────────────────────────────────── */
export function shade(hex, k) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function rnd(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
