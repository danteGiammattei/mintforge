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

import { capsule, joint, box, digit, merge, place, raster, sprite, quantise, LIGHT, RAMP } from "./pixelform.js";
import { chestClosed } from "./chestArt.js";

/* ─── the goblin's hand ───────────────────────────────────────────────
 * Authored from a photograph: a forearm running in from the left and
 * tapering to a narrow wrist, widening into a broad palm held face up,
 * a thumb riding high over a heavy thenar mound, and four fingers
 * fanning out and drifting downward with the pinky shortest.
 *
 * Then mirrored and swung down, so it reaches out of the doorway and
 * across into the light rather than off to the side. */
export const GOBLIN_HAND = {
  art:   { w: 92, h: 52, wrist: { x: 0, y: 26 }, shoulder: { x: -8, y: 27 }, palm: { x: 38, y: 26 } },
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
      taper: 0.44, minR: 1.6, tipR: 1.8,
    }));
  }
  return merge(...f);
}

const goblinPlacement = () => {
  const G = GOBLIN_HAND;
  return {
    mirror: G.art.w - G.frame.pivot.x,   // flip so it reaches left
    angle:  G.frame.angle,               // and hangs slightly down
    pivot:  G.art.wrist,
    at:     G.frame.pivot,
    scale:  G.scale,
  };
};
/* Where an authored point of the hand lands inside its sprite — the
 * scene uses this to hang the sleeve on the shoulder and to aim the
 * scroll at the palm. */
export function goblinHandPoint(p) {
  return place({ C: [], J: [] }, goblinPlacement()).locate(p.x, p.y);
}

export function goblinHand(curl) {
  const step = quantise(curl, 8);
  return sprite(`goblin-hand:${step}`, () => {
    const G = GOBLIN_HAND;
    const form = place(goblinHandForm(0.06 + (step / 8) * 0.94), goblinPlacement());
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
    c.fillRect(Math.round(cr.x - 4 * G.scale), Math.round(cr.y + G.scale), Math.round(10 * G.scale), 1);
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
    digit({ base: d.base, angle: d.a, lens: d.lens, r: d.r, bend: 0.09, taper: 0.42, minR: 1.6, tipR: 1.8 })));

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
    if (!lit) {                          // palm creases; his light washes them out
      const c = whole.getContext("2d");
      c.globalAlpha = 0.45; c.fillStyle = common.ramp[1];
      c.fillRect(24 * P.scale, 48 * P.scale, 13 * P.scale, 1);
      c.fillRect(25 * P.scale, 49 * P.scale, 12 * P.scale, 1);
      c.fillRect(27 * P.scale, 55 * P.scale, 10 * P.scale, 1);
      c.globalAlpha = 1;
    }
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
      light: charged ? LIGHT.pulled : LIGHT.carried,
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
      c.fillStyle = i > 3 ? dark : rarityColour;
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
const OPEN_PARCH = ["#1d1810", "#6f6246", "#90835d", "#b0a378"];
const OPEN_ROD   = ["#1d1810", "#3c2b18", "#5e4526", "#7f6138"];

export function openScroll(rarityColour, seed, smokes = false) {
  return sprite(`inv:${rarityColour}:${seed}:${smokes}`, () => {
    const cv = document.createElement("canvas");
    cv.width = INV_SCROLL.w; cv.height = INV_SCROLL.h;
    const c = cv.getContext("2d");
    const F = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

    F(3, 7, 16, 14, OPEN_PARCH[0]);                  // the sheet
    F(4, 8, 14, 12, OPEN_PARCH[2]);
    F(4, 8, 14, 1, OPEN_PARCH[3]);
    F(4, 19, 14, 1, OPEN_PARCH[1]);
    F(17, 8, 1, 12, OPEN_PARCH[1]);

    const rng = rnd(seed ^ 0x51617);                 // the sigil, mirrored
    for (let y = 0; y < 7; y++) for (let x = 0; x < 3; x++) {
      if (rng() > 0.52) { F(8 + x, 11 + y, 1, 1, rarityColour); F(14 - x, 11 + y, 1, 1, rarityColour); }
    }
    F(11, 11, 1, 7, rarityColour);

    for (const ry of [3, 20]) {                      // rods, with knobbed ends
      F(1, ry, 20, 4, OPEN_ROD[0]);
      F(2, ry + 1, 18, 2, OPEN_ROD[2]);
      F(2, ry + 1, 18, 1, OPEN_ROD[3]);
      F(0, ry, 2, 4, OPEN_ROD[1]); F(20, ry, 2, 4, OPEN_ROD[1]);
      F(0, ry + 1, 1, 2, OPEN_ROD[2]); F(21, ry + 1, 1, 2, OPEN_ROD[2]);
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

/* ─── the chest ───────────────────────────────────────────────────────
 * A slab body under a domed lid, bound with two straps and a lock. It is
 * two sprites so the lid can lift. The tier picks the materials; the
 * light picks how they are seen — warm and plain by the candle in the
 * satchel, a cold near-silhouette in the doorway. Same skeleton both
 * times, which is the point of building it this way. */
export const CHEST = { w: 40, h: 34, lidH: 17 };
const CHEST_TIERS = [
  { body: "wood",      strap: "iron"      },   // wooden
  { body: "wood",      strap: "stone"     },   // iron
  { body: "wood",      strap: "gold"      },   // gilded
  { body: "obsidian",  strap: "gold"      },   // obsidian
  { body: "voidstone", strap: "parchmentLit" },// void
];
const toneIndex = (ramp) => {
  const key = ramp.map(h => parseInt(h.slice(1), 16));
  return (r, g, b) => key.indexOf((r << 16) | (g << 8) | b);
};
/* Repaint a region in another material, keeping each pixel's tone — so
 * a strap is lit exactly as the wood under it was. */
function reskin(cv, from, to, test) {
  const c = cv.getContext("2d"), img = c.getImageData(0, 0, cv.width, cv.height), d = img.data, idx = toneIndex(from);
  const rgb = to.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    const i = (y * cv.width + x) * 4;
    if (!d[i + 3] || !test(x, y)) continue;
    const t = idx(d[i], d[i + 1], d[i + 2]);
    if (t < 0) continue;
    d[i] = rgb[t][0]; d[i + 1] = rgb[t][1]; d[i + 2] = rgb[t][2];
  }
  c.putImageData(img, 0, 0);
}
const strapAt = x => (x >= 8 && x <= 10) || (x >= 29 && x <= 31);

export function chestParts(tier = 0, light = "candle") {
  const t = CHEST_TIERS[Math.max(0, Math.min(CHEST_TIERS.length - 1, tier))];
  return sprite(`chest:${tier}:${light}`, () => {
    const cold = light === "slot";
    const bodyRamp = cold ? RAMP.stone : RAMP[t.body];
    const strapRamp = cold ? RAMP.goblin : RAMP[t.strap];
    const rig = cold ? LIGHT.slot : LIGHT.candle;
    const opts = { w: CHEST.w, h: CHEST.h, ramp: bodyRamp, light: rig, depth: 3.2 };

    const body = raster({ C: [], J: [], B: [box(3, 15, 34, 18, 2)] }, opts);
    reskin(body, bodyRamp, strapRamp, (x) => strapAt(x));
    const bc = body.getContext("2d");
    bc.fillStyle = bodyRamp[0]; bc.fillRect(4, 15, 32, 1);            // the dark where the lid sits
    bc.fillStyle = bodyRamp[1]; bc.fillRect(5, 22, 30, 1); bc.fillRect(5, 28, 30, 1);   // plank lines
    reskin(body, bodyRamp, strapRamp, (x, y) => strapAt(x) && (y === 22 || y === 28));

    const lid = raster({ C: [], J: [], B: [box(2, 3, 36, 14, 6)] }, { ...opts, h: CHEST.lidH });
    reskin(lid, bodyRamp, strapRamp, (x) => strapAt(x));
    const lc = lid.getContext("2d");
    lc.fillStyle = bodyRamp[1]; lc.fillRect(6, 10, 28, 1);
    reskin(lid, bodyRamp, strapRamp, (x, y) => strapAt(x) && y === 10);
    // the lock plate hangs from the lid over the seam
    const lock = cold ? RAMP.goblin : RAMP[t.strap];
    lc.fillStyle = lock[2]; lc.fillRect(17, 12, 6, 5);
    lc.fillStyle = lock[4]; lc.fillRect(17, 12, 6, 1); lc.fillRect(17, 12, 1, 5);
    lc.fillStyle = lock[0]; lc.fillRect(19, 14, 2, 2);
    return { body, lid };
  });
}
/* The chest shut, as one sprite: the Frakassets chest (lib/chestArt.js)
 * once its sheets have loaded, this procedural one if they never do. */
export function chest(tier = 0, light = "candle") {
  const drawn = chestClosed(tier, light);
  if (drawn) return drawn;
  return sprite(`chest-shut:${tier}:${light}`, () => {
    const { body, lid } = chestParts(tier, light);
    const cv = document.createElement("canvas"); cv.width = CHEST.w; cv.height = CHEST.h;
    const c = cv.getContext("2d");
    c.drawImage(body, 0, 0); c.drawImage(lid, 0, 0);
    return cv;
  });
}

/* ─── a coin nobody has seen yet ──────────────────────────────────────
 * Deliberately NOT a coin: a clod of dirt the size of one. What is under
 * it is drawn by lib/coin.js when it is brushed, and by nothing else. */
export function dirtClod(seed = 1) {
  return sprite(`clod:${seed & 7}`, () => {
    const cv = raster({ C: [], J: [joint(12, 12, 10.5)] }, { w: 24, h: 24, ramp: RAMP.dirt, light: LIGHT.candle, depth: 6 });
    const c = cv.getContext("2d"), rng = rnd((seed & 7) + 0x99), idx = toneIndex(RAMP.dirt);
    const img = c.getImageData(0, 0, 24, 24), d = img.data;
    for (let n = 0; n < 46; n++) {                   // grit: nudge a pixel one tone
      const x = (rng() * 24) | 0, y = (rng() * 24) | 0, i = (y * 24 + x) * 4;
      if (!d[i + 3]) continue;
      const t = Math.max(0, Math.min(5, idx(d[i], d[i + 1], d[i + 2]) + (rng() < 0.5 ? -1 : 1)));
      const h = RAMP.dirt[t];
      d[i] = parseInt(h.slice(1, 3), 16); d[i + 1] = parseInt(h.slice(3, 5), 16); d[i + 2] = parseInt(h.slice(5, 7), 16);
    }
    c.putImageData(img, 0, 0);
    return cv;
  });
}

/* ─── the brush ───────────────────────────────────────────────────── */
export function brush() {
  return sprite("brush", () => {
    const handle = raster({ C: [capsule(21, 4, 11, 14, 2.2, 2.6)], J: [] }, { w: 26, h: 26, ramp: RAMP.wood, light: LIGHT.candle, depth: 2 });
    const head = raster({ C: [capsule(10, 15, 5, 20, 3.4, 4.2)], J: [] }, { w: 26, h: 26, ramp: RAMP.bristle, light: LIGHT.candle, depth: 3 });
    const c = handle.getContext("2d");
    c.drawImage(head, 0, 0);
    c.fillStyle = RAMP.iron[3]; c.fillRect(10, 13, 3, 1); c.fillRect(9, 14, 3, 1);   // the ferrule
    c.fillStyle = RAMP.bristle[1];
    for (const [x, y] of [[4, 19], [6, 21], [3, 22], [7, 18]]) c.fillRect(x, y, 1, 2);
    return handle;
  });
}

/* ─── the forge ───────────────────────────────────────────────────────
 * An anvil and a hammer, lit from the coal bed low on the right. */
export const ANVIL = { w: 52, h: 34, face: { x: 31, y: 4 } };      // face: where a coin rests
export function anvil() {
  return sprite("anvil", () => raster({
    C: [capsule(16, 9, 3, 8, 4.2, 1.4)],                            // the horn
    J: [],
    B: [box(14, 4, 34, 9, 2), box(23, 12, 16, 10, 2), box(14, 21, 34, 11, 2)],   // face, waist, foot
  }, { w: ANVIL.w, h: ANVIL.h, ramp: RAMP.ironHot, light: LIGHT.ember, depth: 3 }));
}
export const HAMMER = { w: 44, h: 26, strike: { x: 8, y: 24 } };    // strike: the middle of the head's underside
export function hammer() {
  return sprite("hammer", () => {
    // the head stands upright with the handle running off to the right,
    // so a blow is a straight drop and nothing has to turn
    const cv = raster({ C: [capsule(14, 12, 41, 12, 2, 2.4)], J: [] }, { w: HAMMER.w, h: HAMMER.h, ramp: RAMP.woodHot, light: LIGHT.ember, depth: 2 });
    const head = raster({ C: [], J: [], B: [box(2, 2, 13, 22, 2)] }, { w: HAMMER.w, h: HAMMER.h, ramp: RAMP.ironHot, light: LIGHT.ember, depth: 3 });
    cv.getContext("2d").drawImage(head, 0, 0);
    return cv;
  });
}

/* ─── something small, wrapped, pushed through the gap ────────────── */
export function pouch(light = "slot") {
  return sprite(`pouch:${light}`, () => {
    const cold = light === "slot";
    const cv = raster({ C: [capsule(8, 5, 8, 7, 2.2, 2.6)], J: [joint(8, 11, 5.2)] },
      { w: 16, h: 18, ramp: cold ? RAMP.stone : RAMP.wood, light: cold ? LIGHT.slot : LIGHT.candle, depth: 3 });
    const c = cv.getContext("2d");
    c.fillStyle = (cold ? RAMP.goblin : RAMP.gold)[4]; c.fillRect(6, 7, 5, 1);     // the drawstring
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
