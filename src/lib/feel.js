/* ══════════════════════════════════════════════════════════════════════
 *  feel — sound and haptics hooks
 *  ────────────────────────────────────────────────────────────────────
 *  Every moment in the game that should be felt calls feel("name").
 *  Each name has a haptic pattern and a placeholder tone made with
 *  WebAudio, so the game is not silent today.
 *
 *  TO DROP IN REAL SOUND: put a file at public/sfx/<name>.ogg (or .mp3)
 *  and add its name to SAMPLES below. A sample replaces the tone for
 *  that name; nothing else changes.
 *
 *  Sound is off until the player's first tap (browsers require it) and
 *  can be muted in Profile. Haptics follow the same switch and are
 *  skipped when the player asks for reduced motion.
 * ══════════════════════════════════════════════════════════════════════ */

const SAMPLES = {
  // seal: "/sfx/seal.ogg",
};

/* name → [ haptic pattern (ms), tone: [freq Hz, duration s, type, gain] … ] */
const CUES = {
  tap:     [[6],            [[520, 0.03, "square", 0.03]]],
  drawer:  [[8],            [[180, 0.06, "triangle", 0.05]]],
  dry:     [[12],           [[110, 0.05, "sawtooth", 0.03]]],
  seal:    [[14],           [[140, 0.10, "triangle", 0.07], [90, 0.16, "sine", 0.06]]],
  offer:   [[10],           [[220, 0.08, "sine", 0.04]]],
  pull:    [[6, 40, 6],     [[330, 0.25, "sine", 0.04], [495, 0.35, "sine", 0.03]]],
  taken:   [[18],           [[660, 0.12, "triangle", 0.05]]],
  arrive:  [[20, 60, 30],   [[98, 0.20, "triangle", 0.08], [73, 0.30, "sine", 0.07]]],
  strain:  [[8],            [[70, 0.05, "sawtooth", 0.04]]],
  break:   [[40, 30, 60],   [[60, 0.25, "sawtooth", 0.09], [880, 0.20, "triangle", 0.04]]],
  coin:    [[14],           [[784, 0.10, "triangle", 0.05], [1175, 0.18, "sine", 0.04]]],
  reveal:  [[18, 40, 18],   [[523, 0.10, "triangle", 0.05], [784, 0.14, "triangle", 0.05], [1047, 0.24, "sine", 0.05]]],
  sell:    [[10],           [[988, 0.05, "square", 0.03], [1319, 0.09, "square", 0.03]]],
  win:     [[20, 40, 40],   [[523, 0.08, "square", 0.04], [659, 0.08, "square", 0.04], [784, 0.20, "square", 0.04]]],
  lose:    [[50],           [[196, 0.16, "sawtooth", 0.05], [147, 0.28, "sawtooth", 0.05]]],
  gift:    [[16, 50, 16],   [[440, 0.10, "sine", 0.05], [660, 0.22, "sine", 0.05]]],
  error:   [[30, 40, 30],   [[120, 0.18, "square", 0.04]]],
  // a sealed scroll speaks its tier: higher, longer, brighter
  rarity0: [[10],               [[330, 0.10, "sine", 0.04]]],
  rarity1: [[12],               [[392, 0.12, "sine", 0.05]]],
  rarity2: [[14, 30, 14],       [[494, 0.12, "triangle", 0.05], [740, 0.16, "sine", 0.04]]],
  rarity3: [[16, 30, 16],       [[587, 0.12, "triangle", 0.05], [880, 0.20, "sine", 0.05]]],
  rarity4: [[20, 30, 20, 30, 20],[[659, 0.12, "triangle", 0.06], [988, 0.14, "triangle", 0.05], [1319, 0.30, "sine", 0.05]]],
  rarity5: [[30, 30, 30, 30, 60],[[784, 0.12, "triangle", 0.06], [1175, 0.14, "triangle", 0.06], [1568, 0.40, "sine", 0.06]]],
};

const KEY = "mintforge:muted";
let muted = false;
try { muted = localStorage.getItem(KEY) === "1"; } catch { /* storage may be blocked */ }

export const isMuted = () => muted;
export function setMuted(v) {
  muted = !!v;
  try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch { /* fine */ }
}

let ac = null;
const buffers = new Map();
function audio() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ac = new AC(); } catch { ac = null; }
  return ac;
}
// browsers only start audio from a gesture
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => { const a = audio(); if (a?.state === "suspended") a.resume().catch(() => {}); }, { passive: true });
}

function tone(a, cue) {
  let at = a.currentTime;
  for (const [freq, dur, type, gain] of cue) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(a.destination);
    o.start(at); o.stop(at + dur + 0.02);
    at += dur * 0.7;
  }
}
async function sample(a, name) {
  if (!buffers.has(name)) {
    buffers.set(name, fetch(SAMPLES[name]).then(r => r.arrayBuffer()).then(b => a.decodeAudioData(b)).catch(() => null));
  }
  const buf = await buffers.get(name);
  if (!buf) return false;
  const src = a.createBufferSource(); src.buffer = buf; src.connect(a.destination); src.start();
  return true;
}

const calm = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function feel(name) {
  const cue = CUES[name];
  if (!cue || muted) return;
  if (!calm()) { try { navigator.vibrate?.(cue[0]); } catch { /* unsupported */ } }
  const a = audio();
  if (!a || a.state !== "running") return;
  if (SAMPLES[name]) sample(a, name).then(ok => { if (!ok) tone(a, cue[1]); });
  else tone(a, cue[1]);
}
