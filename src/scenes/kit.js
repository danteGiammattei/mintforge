/* ══════════════════════════════════════════════════════════════════════
 *  scene kit — what every canvas scene needs and none should rewrite
 *  ────────────────────────────────────────────────────────────────────
 *  · fit      scale the canvas so one scene pixel is a whole number of
 *             device pixels. A fractional scale gives pixels of uneven
 *             width, which is the one thing pixel art cannot survive.
 *  · loop     a fixed 60Hz step, so the scene runs at the same speed on
 *             a 120Hz phone as on a 60Hz one, and stops entirely while
 *             the tab is hidden.
 *  · calm     true when the player has asked for reduced motion. Scenes
 *             hold their flicker, grain, sway and shake still.
 *  · pointer  canvas-space coordinates for a pointer event.
 * ══════════════════════════════════════════════════════════════════════ */

export const W = 195, H = 422;
export const FONT = '7px "Silkscreen", monospace';

/* Text colours for canvas chrome. Each clears 4.5:1 against the darkest
 * ground a scene puts it on; tests/contrast.test.js holds them to it. */
export const INK = {
  cold:    "#8f98a6",     // door chrome, on #050609
  coldHi:  "#b6c5bc",     // his words
  warm:    "#9a8f7a",     // desk chrome, on #080705
  warmHi:  "#c9b98f",
  off:     "#5b5e66",     // disabled — exempt from contrast by definition
  warn:    "#d08a62",
};

const STEP = 1000 / 60;

export function stage(cv, { w = W, h = H, step }) {
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  function fit() {
    const box = cv.parentElement;
    if (!box) return;
    const dpr = window.devicePixelRatio || 1;
    const raw = Math.min(box.clientWidth / w, box.clientHeight / h);
    if (!(raw > 0)) return;
    const s = Math.max(1 / dpr, Math.floor(raw * dpr) / dpr);
    cv.style.width = w * s + "px"; cv.style.height = h * s + "px";
  }
  const ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
  if (ro && cv.parentElement) ro.observe(cv.parentElement);
  window.addEventListener("resize", fit);

  const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const view = { calm: !!mq?.matches };
  const onMq = () => { view.calm = !!mq.matches; };
  mq?.addEventListener?.("change", onMq);

  let raf = 0, last = 0, acc = 0, alive = true;
  function tick(now) {
    if (!alive) return;
    acc += Math.min(100, now - (last || now)); last = now;
    let n = 0;
    while (acc >= STEP && n < 3) { step(); acc -= STEP; n++; }
    if (acc > STEP) acc = 0;                        // fell behind: drop it, do not spiral
    raf = requestAnimationFrame(tick);
  }
  function wake() {
    cancelAnimationFrame(raf);
    if (alive && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); }
  }
  document.addEventListener("visibilitychange", wake);
  document.fonts?.load?.(FONT).catch(() => {});
  fit(); wake();

  return {
    ctx, view,
    stop() {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("resize", fit);
      mq?.removeEventListener?.("change", onMq);
      ro?.disconnect();
    },
  };
}

export function pointer(cv, e, w = W, h = H) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * w, y: (e.clientY - r.top) / r.height * h };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function rnd(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

/* Break a line into rows of at most `max` characters, on spaces. */
export function wrap(text, max = 30) {
  const lines = []; let line = "";
  for (const word of String(text).split(" ")) {
    if ((line + " " + word).trim().length > max) { if (line) lines.push(line.trim()); line = word; }
    else line += " " + word;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

/* Film grain, baked once and scrolled: per-frame getImageData on the
 * whole scene costs more than everything else in it put together. */
export function grainLayer(w = W, h = H) {
  const tiles = [];
  for (let k = 0; k < 4; k++) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"), img = g.createImageData(w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = (Math.random() * 13) | 0; }
    g.putImageData(img, 0, 0);
    tiles.push(c);
  }
  return (ctx, t, calm) => ctx.drawImage(tiles[calm ? 0 : (t >> 1) & 3], 0, 0);
}

/* Fade the scene's four edges into the colour of the page around it, so
 * the canvas has no visible border on a screen wider or taller than it. */
export function feather(ctx, [r, g, b], px = 14, w = W, h = H) {
  const solid = `rgb(${r},${g},${b})`, clear = `rgba(${r},${g},${b},0)`;
  const band = (x0, y0, x1, y1, x, y, ww, hh) => {
    const gr = ctx.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, solid); gr.addColorStop(1, clear);
    ctx.fillStyle = gr; ctx.fillRect(x, y, ww, hh);
  };
  band(0, 0, px, 0, 0, 0, px, h);  band(w, 0, w - px, 0, w - px, 0, px, h);
  band(0, 0, 0, px, 0, 0, w, px);  band(0, h, 0, h - px, 0, h - px, w, px);
}
