/* ─── tome art ────────────────────────────────────────────────────────
 * The covers, drawn in pixels after the "pixel spell tomes" reference
 * (a leather board, a darker spine, metal at the corners, one emblem
 * in the middle). 24 × 30, shown at whole multiples. And a page's sigil
 * in ink, for the open book on the desk. Each drawing is kept. */

const kept = new Map();
const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (hex, k) => `rgb(${hexRgb(hex).map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(",")})`;

/* 9 × 9 emblems */
const EMBLEMS = {
  eye:   ["..#####..", ".#.....#.", "#..###..#", "#.#####.#", "#.##.##.#", "#.#####.#", "#..###..#", ".#.....#.", "..#####.."],
  leaf:  ["....#....", "...###...", "..#.#.#..", ".##.#.##.", ".#..#..#.", ".##.#.##.", "..#.#.#..", "...###...", "....#...."],
  star:  ["....#....", "....#....", "...###...", "#########", ".#######.", "..#####..", "..##.##..", ".##...##.", ".#.....#."],
  flame: ["....#....", "...##....", "...###...", "..####.#.", ".#####.#.", ".###.###.", "##.#.####", "##.....##", ".#######."],
  tree:  ["....#....", "...###...", "..#####..", "...###...", "..#####..", ".#######.", "..#####..", "#########", "...###..."],
  lantern: ["....#....", "..#####..", ".#######.", "#########", "#########", "#########", ".#######.", "..#####..", "....#...."],
  maw:   ["#.#...#.#", ".#.###.#.", "..#####..", ".##.#.##.", "#########", "#.#.#.#.#", "#.......#", ".#.#.#.#.", "..#####.."],
};

export function tomeCover(tome, owned = true) {
  const key = `${tome.id}:${owned}`;
  if (kept.has(key)) return kept.get(key);
  const W = 24, H = 30, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d"), px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const L = owned ? tome.look.leather : "#1c1a18", T = owned ? tome.look.trim : "#34302a";
  // the board, outlined, its leather grained in a sparse dither
  px(0, 0, W, H, "#0a0806");
  px(1, 1, W - 2, H - 2, L);
  for (let y = 2; y < H - 2; y++) for (let x = 4; x < W - 2; x++) if (((x * 7 + y * 13) % 11) === 0) px(x, y, 1, 1, shade(L, 0.8));
  px(1, 1, W - 2, 1, shade(L, 1.3)); px(1, 1, 1, H - 2, shade(L, 1.2));      // lit top and left
  px(1, H - 2, W - 2, 1, shade(L, 0.6));
  // the spine
  px(1, 1, 3, H - 2, shade(L, 0.6)); px(4, 1, 1, H - 2, "#0a0806");
  px(1, 6, 3, 1, T); px(1, H - 7, 3, 1, T);
  // metal at the corners
  for (const [x, y] of [[W - 5, 1], [W - 5, H - 5], [5, 1], [5, H - 5]]) {
    px(x, y, 4, 4, shade(T, 0.7)); px(x, y, 3, 1, T); px(x, y, 1, 3, T); px(x + 1, y + 1, 1, 1, shade(T, 1.4));
  }
  // a plate behind the emblem, and the emblem
  const ex = 9, ey = 10;
  px(ex - 2, ey - 2, 13, 13, shade(L, 0.55));
  px(ex - 2, ey - 2, 13, 1, shade(T, 0.6)); px(ex - 2, ey + 10, 13, 1, shade(T, 0.6));
  px(ex - 2, ey - 2, 1, 13, shade(T, 0.6)); px(ex + 10, ey - 2, 1, 13, shade(T, 0.6));
  const em = owned ? EMBLEMS[tome.look.emblem] : null;
  if (em) em.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") px(ex + x, ey + y, 1, 1, (x + y) % 5 ? T : shade(T, 1.35)); }));
  else { // a tome not found yet: a keyhole
    px(ex + 3, ey + 2, 3, 3, "#0a0806"); px(ex + 4, ey + 5, 1, 3, "#0a0806");
  }
  kept.set(key, cv);
  return cv;
}

/* A page's sigil in ink, `size` pixels square, lines one pixel wide
 * (two where `bold`), on transparent. */
export function pageSigil(page, size, ink = "#2a2014", bold = false) {
  const key = `sig:${page.id}:${size}:${ink}:${bold}`;
  if (kept.has(key)) return kept.get(key);
  const cv = document.createElement("canvas"); cv.width = size; cv.height = size;
  const c = cv.getContext("2d"); c.fillStyle = ink;
  const m = bold ? 2 : 1, k = size - 1 - m;
  for (const s of page.strokes) for (let i = 1; i < s.length; i++) {
    const [ax, ay] = s[i - 1], [bx, by] = s[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * k));
    for (let j = 0; j <= n; j++) c.fillRect(Math.round((ax + (bx - ax) * j / n) * k), Math.round((ay + (by - ay) * j / n) * k), m, m);
  }
  kept.set(key, cv);
  return cv;
}
