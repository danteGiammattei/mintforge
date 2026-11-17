import { drawCoin } from "./coin.js";

/* ─── a coin of yours as the app's icon ───────────────────────────────
 * The choice is kept on the account (stats.iconCoin, server/state.js
 * patchCosmetics), so Safari and the installed app, which keep separate
 * storage on an iPhone, agree on it. Here it is painted into the tab's
 * icon, the apple-touch-icon and the manifest's icons. A phone copies
 * the icon when the app is added to its home screen and never looks
 * again, so a new one reaches the home screen only when the app is
 * removed and added again; the tab icon changes at once.
 *
 * The painted icons are kept on this device too (mf.appIcon), so they
 * are in place from the first moment the page loads, before sign-in. */
const KEY = "mf.appIcon";
const BG = "#050609";                      // the manifest's background

// the coin, whole pixels, centred on the night (or on nothing, for the tab)
function paint(coin, size, inner, ground) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const x = c.getContext("2d");
  if (ground) { x.fillStyle = BG; x.fillRect(0, 0, size, size); }
  const cv = document.createElement("canvas");
  drawCoin(cv, coin, inner);
  x.imageSmoothingEnabled = false;
  x.drawImage(cv, (size - inner) / 2, (size - inner) / 2);
  return c.toDataURL("image/png");
}

const defaults = {};
function link(rel) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement("link"); el.rel = rel; document.head.appendChild(el); }
  if (!(rel in defaults)) defaults[rel] = el.getAttribute("href");
  return el;
}

let manifestUrl = null;
function put(icons) {
  link("icon").href = icons.tab;
  link("apple-touch-icon").href = icons.apple;
  // the manifest, rewritten with these icons, for Android's install
  const base = location.origin + "/";
  const m = {
    name: "MintForge", short_name: "MintForge", start_url: base, scope: base, id: "/",
    display: "standalone", orientation: "portrait", background_color: BG, theme_color: BG,
    icons: [
      { src: icons.i192, sizes: "192x192", type: "image/png" },
      { src: icons.i512, sizes: "512x512", type: "image/png" },
      { src: icons.i512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  if (manifestUrl) URL.revokeObjectURL(manifestUrl);
  manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: "application/manifest+json" }));
  link("manifest").href = manifestUrl;
}

function reset() {
  for (const rel of ["icon", "apple-touch-icon", "manifest"]) {
    const el = link(rel);
    if (defaults[rel]) el.setAttribute("href", defaults[rel]);
  }
  if (manifestUrl) { URL.revokeObjectURL(manifestUrl); manifestUrl = null; }
}

/* the coin (or null for MintForge's own icon) as the icon, now and on
 * the next load */
export function setAppIcon(coin) {
  try {
    if (!coin) { localStorage.removeItem(KEY); reset(); return; }
    const kept = JSON.parse(localStorage.getItem(KEY) || "null");
    if (kept?.id === coin.id) { put(kept.icons); return; }
    // 192 and 512 keep the coin inside the maskable safe circle
    const icons = { tab: paint(coin, 64, 64, false), apple: paint(coin, 180, 128, true),
                    i192: paint(coin, 192, 128, true), i512: paint(coin, 512, 320, true) };
    put(icons);
    localStorage.setItem(KEY, JSON.stringify({ id: coin.id, icons }));
  } catch { /* storage full or blocked: the icon still changes for now */ }
}

/* at load, before anything else: put back the icon last painted here */
export function restoreAppIcon() {
  try { const kept = JSON.parse(localStorage.getItem(KEY) || "null"); if (kept?.icons) put(kept.icons); } catch { /* fine */ }
}
