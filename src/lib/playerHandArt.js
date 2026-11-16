/* ─── our hand, painted ────────────────────────────────────────────────
 * Dante's first-person hand, made with GPT and reduced to a tone map
 * (public/sprites/hands/player.png: grey level k × 40 is tone k; 0 empty,
 * 1 the outline, 2–6 the lit tones). The game paints the tones in its own
 * ramps (pixelform RAMP), so the hand sits in the door's night like
 * everything else there and goes green, tone for tone, in the goblin's
 * light.
 *
 * The drawing's forearm runs off its canvas at the bottom right, so below
 * the wrist the arm is carried on from one whole cross-section of it
 * (row ARM.from), along the arm's own slant and widening a little as it
 * comes nearer the eye, long enough to reach off the screen from any
 * height the hand rises to, darkening as it goes, away from the light. */
import { RAMP } from "./pixelform.js";

export const HAND_ART = {
  src: "/sprites/hands/player.png",
  palm: { x: 16, y: 18 },          // the hollow of the palm, where a scroll lies
};
const ARM = { from: 47, left: 20, right: 43, dl: 0.25, dr: 0.67, more: 150, wrist: 30, fade: 14 };

let tones = null, W = 0, H = 0, loading = null;
const kept = {};

export function loadPlayerHand() {
  if (loading) return loading;
  loading = new Promise(ok => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
      const x = c.getContext("2d"); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, im.width, im.height).data;
      // the drawing to the cut, then the forearm carried on below
      const w0 = im.width, rows = ARM.from + ARM.more;
      W = Math.ceil(ARM.right + ARM.dr * ARM.more) + 2; H = rows;
      tones = new Uint8Array(W * H);
      for (let y = 0; y < ARM.from; y++) for (let xx = 0; xx < w0; xx++) tones[y * W + xx] = Math.round(d[(y * w0 + xx) * 4] / 40);
      const profile = [];
      for (let xx = ARM.left; xx <= ARM.right; xx++) profile.push(Math.round(d[(ARM.from * w0 + xx) * 4] / 40));
      for (let y = ARM.from; y < rows; y++) {
        const k = y - ARM.from, l = Math.round(ARM.left + ARM.dl * k), r = Math.round(ARM.right + ARM.dr * k);
        for (let xx = l; xx <= r; xx++) {
          const t = (xx - l) / Math.max(1, r - l);
          tones[y * W + xx] = xx === l || xx === r ? 1 : Math.max(2, profile[Math.round(t * (profile.length - 1))]);
        }
      }
      // below the wrist the arm falls away from the door's light toward
      // us: a tone darker every `fade` pixels measured along the arm, each
      // step broken in a checker so it reads as a falloff, not a band
      const ax = Math.hypot(1, (ARM.dl + ARM.dr) / 2), ux = (ARM.dl + ARM.dr) / 2 / ax, uy = 1 / ax;
      for (let y = ARM.wrist; y < rows; y++) for (let xx = 0; xx < W; xx++) {
        const i = y * W + xx; if (tones[i] < 2) continue;
        const along = (y - ARM.wrist) * uy + (xx - ARM.left) * ux, drop = Math.floor((along + ((xx + y) & 1 ? ARM.fade / 2 : 0)) / ARM.fade);
        if (drop > 0) tones[i] = Math.max(2, tones[i] - drop);
      }
      ok(true);
    };
    im.onerror = () => ok(false);
    im.src = HAND_ART.src;
  });
  return loading;
}

/* the hand in the night (lit false) or in his light (true); null until
 * the drawing has loaded, when the door draws its old hand instead */
export function playerHandArt(lit = false) {
  if (!tones) return null;
  const key = lit ? "lit" : "dark";
  if (kept[key]) return kept[key];
  const ramp = lit ? RAMP.playerMagic : RAMP.player;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"), img = x.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const t = tones[i]; if (!t) continue;
    const hex = ramp[Math.min(ramp.length - 1, t - 1)];
    img.data[i * 4] = parseInt(hex.slice(1, 3), 16); img.data[i * 4 + 1] = parseInt(hex.slice(3, 5), 16);
    img.data[i * 4 + 2] = parseInt(hex.slice(5, 7), 16); img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return (kept[key] = c);
}
