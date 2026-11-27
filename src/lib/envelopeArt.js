/* ─── red envelopes ──────────────────────────────────────────────────────
 * What an event's chest is during the Lantern Days (shared/events.js
 * lunar27, look "lunar"): a red money envelope, Dante's own painted sprite
 * (public/sprites/envelope.png, 40 × 69), cut here into the pieces its
 * opening needs:
 *
 *   front  the envelope below the flap: its pocket, the knot and tassel
 *   flap   the flap, folded down over the pocket, the gold clasp at its
 *          point (the point is the clasp's foot, where the tassel hangs)
 *   inside the envelope's lining, dark red, behind the flap: seen once
 *          the flap is lifted, and on the flap's own underside
 *
 * envelope()      → the closed envelope (for tiles and slots), or null
 *                   until the sprite has loaded
 * envelopeParts() → { front, flap, inside, hinge }, or null likewise
 * seasonSprite(season, look, fallback) → whatever stands for an event's
 *                   chest of that season: an envelope or a present */
import { SEASONS } from "../../shared/events.js";
import { present } from "./presentArt.js";

export const ENVELOPE = { w: 40, h: 69 };
let sheet = null, parts = null;

// the flap's lower edge: a shallow V from the top corners to the clasp's foot
const flapY = x => Math.round(17 + 12 * (1 - Math.abs(x - ENVELOPE.w / 2) / (ENVELOPE.w / 2)));

function cut() {
  const { w, h } = ENVELOPE;
  const mk = () => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const src = mk().getContext("2d"); src.drawImage(sheet, 0, 0);
  const all = src.getImageData(0, 0, w, h);
  const front = mk(), flap = mk(), inside = mk();
  const F = front.getContext("2d").createImageData(w, h), L = flap.getContext("2d").createImageData(w, h), I = inside.getContext("2d").createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, onFlap = y <= flapY(x);
    const solid = all.data[i + 3] >= 128;
    if (solid) { const to = onFlap ? L : F; for (let j = 0; j < 4; j++) to.data[i + j] = all.data[i + j]; }
    // the lining fills the flap's whole width, its rounded top edge too
    if (onFlap && (solid || (y < 4 && x > 0 && x < w - 1))) {                                          // the lining, deepest at the top
      const k = 0.55 + 0.45 * Math.min(1, y / 22);
      I.data[i] = Math.round(78 * k); I.data[i + 1] = Math.round(12 * k); I.data[i + 2] = Math.round(14 * k); I.data[i + 3] = 255;
    }
  }
  front.getContext("2d").putImageData(F, 0, 0);
  flap.getContext("2d").putImageData(L, 0, 0);
  inside.getContext("2d").putImageData(I, 0, 0);
  let hinge = 0; for (let x = 0; x < w; x++) hinge = Math.max(hinge, flapY(x) + 1);
  parts = { front, flap, inside, hinge };
}

export function loadEnvelope() {
  if (sheet || typeof Image === "undefined") return;
  const im = new Image();
  im.onload = () => { sheet = im; cut(); };
  im.src = "/sprites/envelope.png";
}
loadEnvelope();

export const envelopeParts = () => parts;
export const envelope = () => sheet ? (() => { const c = document.createElement("canvas"); c.width = ENVELOPE.w; c.height = ENVELOPE.h; c.getContext("2d").drawImage(sheet, 0, 0); return c; })() : null;

/* what stands for an event chest of `season`, for tiles and slots */
export function seasonSprite(season, look) {
  if (SEASONS[season]?.look === "lunar") return envelope() || present(look);
  return present(look);
}
