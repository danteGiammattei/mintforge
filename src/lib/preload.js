/* ─── what the game needs before it opens, and what it can warm after ────
 * preloadFirst(onStep)  the chests, the cabinet frames and the pixel font:
 *                       small, and drawn the moment you look. The loading
 *                       screen waits for these (or for them to fail).
 * preloadBanner(frame)  your own banner, the first thing on your profile.
 * warmAfter(coins)      once the game is open, quietly: every painted
 *                       banner, and your coins painted ahead of time so
 *                       the vault opens without stalling. */
import { loadChestArt } from "./chestArt.js";
import { preloadFrames } from "../components/CabinetFrame.jsx";
import { BANNERS } from "./data.js";
import { warmCoin } from "./coin.js";

const image = src => new Promise(ok => { const im = new Image(); im.onload = im.onerror = () => ok(); im.src = src; });
const font = () => (document.fonts?.load ? document.fonts.load("16px Silkscreen").then(() => {}, () => {}) : Promise.resolve());
const bannerSrc = id => { const b = BANNERS[id]; return typeof b === "string" && b.startsWith("image:") ? b.slice(6) : null; };

export function preloadFirst(onStep) {
  const jobs = [loadChestArt(), preloadFrames(), font()];
  let done = 0;
  return Promise.all(jobs.map(j => Promise.resolve(j).catch(() => {}).then(() => onStep(++done, jobs.length))));
}

export function preloadBanner(frame) {
  const src = bannerSrc(frame);
  return src ? image(src) : Promise.resolve();
}

export function warmAfter(coins) {
  const idle = window.requestIdleCallback || (f => setTimeout(() => f({ timeRemaining: () => 8 }), 60));
  const banners = Object.keys(BANNERS).map(bannerSrc).filter(Boolean);
  const queue = [...coins];
  const step = dl => {
    while (queue.length && dl.timeRemaining() > 4) warmCoin(queue.shift());
    if (banners.length) image(banners.shift());
    if (queue.length || banners.length) idle(step);
  };
  idle(step);
}
