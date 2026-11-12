/* ══════════════════════════════════════════════════════════════════════
 *  cards — the deck for war at the tavern
 *  ────────────────────────────────────────────────────────────────────
 *  Card n is 0..51: suit n / 13 (spades, hearts, diamonds, clubs), rank
 *  n % 13 + 1 (ace … king), the same numbering as server/war.js.
 *
 *  The faces are Jorel's Card Pack, 96 × 128, if tools/cards.mjs has put
 *  it in public/sprites/cards/ (it is not in the repo: see that tool).
 *  If not, each card is drawn here instead: a plain pixel card in the
 *  game's own palette, the same size, so nothing else changes.
 * ══════════════════════════════════════════════════════════════════════ */

export const CARD_W = 96, CARD_H = 128;
const SUITS = ["spade", "heart", "diamond", "club"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const cardName = n => `${RANKS[n % 13]} OF ${["SPADES", "HEARTS", "DIAMONDS", "CLUBS"][Math.floor(n / 13)]}`;
const red = n => { const s = Math.floor(n / 13); return s === 1 || s === 2; };

const cache = new Map();
let art = null;            // null: not tried · true: the pack is here · false: draw our own

function load(src) {
  return new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
}
export function loadCards() {
  art ||= load("/sprites/cards/card_back.png").then(im => {
    if (!im) return false;
    cache.set("back", im);
    return Promise.all(Array.from({ length: 52 }, (_, n) =>
      load(`/sprites/cards/${SUITS[Math.floor(n / 13)]}_${String((n % 13) + 1).padStart(4, "0")}.png`).then(f => f && cache.set(n, f))))
      .then(() => true);
  });
  return art;
}

/* 7 × 7 suit marks for the drawn cards */
const MARK = [
  ["...#...", "..###..", ".#####.", "#######", "##.#.##", "...#...", "..###.."],
  [".##.##.", "#######", "#######", "#######", ".#####.", "..###..", "...#..."],
  ["...#...", "..###..", ".#####.", "#######", ".#####.", "..###..", "...#..."],
  ["..###..", "..###..", "##.#.##", "#######", "##.#.##", "...#...", "..###.."],
];
function drawn(n) {
  const cv = document.createElement("canvas"), W = CARD_W / 2, H = CARD_H / 2;
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  if (n === "back") {
    g.fillStyle = "#2a0e10"; g.fillRect(1, 0, W - 2, H); g.fillRect(0, 1, W, H - 2);
    g.fillStyle = "#7a2a24"; g.fillRect(3, 3, W - 6, H - 6);
    g.fillStyle = "#2a0e10";
    for (let y = 5; y < H - 5; y++) for (let x = 5; x < W - 5; x++) if ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0) g.fillRect(x, y, 1, 1);
    return cv;
  }
  const ink = red(n) ? "#b8322a" : "#20242a";
  g.fillStyle = "#4a3a28"; g.fillRect(1, 0, W - 2, H); g.fillRect(0, 1, W, H - 2);
  g.fillStyle = "#efe4c8"; g.fillRect(1, 1, W - 2, H - 2);
  g.fillStyle = ink; g.font = "8px Silkscreen, monospace"; g.textBaseline = "top";
  g.fillText(RANKS[n % 13], 3, 2);
  const m = MARK[Math.floor(n / 13)];
  const mark = (ox, oy, k) => m.forEach((row, y) => [...row].forEach((c, x) => { if (c === "#") g.fillRect(ox + x * k, oy + y * k, k, k); }));
  mark(3, 11, 1);
  mark(Math.round(W / 2 - 10.5), Math.round(H / 2 - 10.5), 3);
  return cv;
}

/* The image for card n (or "back"), ready to draw at CARD_W × CARD_H.
 * Drawn cards are half size: show them at a scale of 2. */
export function cardImage(n) {
  if (cache.has(n)) return cache.get(n);
  const key = "d" + n;
  if (!cache.has(key)) cache.set(key, drawn(n));
  return cache.get(key);
}
