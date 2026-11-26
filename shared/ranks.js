/* The leaderboards: who holds the richest vault, the world over and in
 * each region.
 *
 * A player's score is the worth of every coin in their vault right now
 * (the sum of coinValue over their clean coins): sell, lose or fuse a
 * coin and it drops. Their region is the continent Cloudflare saw them
 * connect from the first time they loaded the game after leaderboards
 * came in; it is kept from then on, so a trip or a VPN can't move them.
 *
 * Seasons are calendar quarters, in UTC. When one ends, the first of
 * each board (the world, and each region with anyone on it) is crowned
 * with a title of their own to keep, named for the board and the
 * season: "Richest Vault · Q4 2026", "Rank #1 Oceania · Q4 2026". */

export const RANKS = {
  firstSeason: "2026Q4",   // nothing before this is ever crowned
  top: 50,                 // rows shown on a board
  refresh: 10,             // at crowning, the top this many on each board are re-counted from their coins first
};

/* Cloudflare's continent codes, in the order the boards are shown. */
export const REGIONS = {
  OC: { name: "Oceania",       short: "OCE" },
  AS: { name: "Asia",          short: "ASIA" },
  EU: { name: "Europe",        short: "EU" },
  NA: { name: "North America", short: "NA" },
  SA: { name: "South America", short: "SA" },
  AF: { name: "Africa",        short: "AF" },
};
export const regionOk = r => typeof r === "string" && Object.prototype.hasOwnProperty.call(REGIONS, r);

/* "2026Q4" for a moment in time (UTC). */
export function seasonOf(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}
const parse = key => { const m = /^(\d{4})Q([1-4])$/.exec(key || ""); return m ? { y: +m[1], q: +m[2] } : null; };
/* When a season begins and ends, ms since the epoch (UTC). */
export function seasonStart(key) { const s = parse(key); return s ? Date.UTC(s.y, (s.q - 1) * 3, 1) : NaN; }
export function seasonEnd(key) { const s = parse(key); return s ? Date.UTC(s.y, s.q * 3, 1) : NaN; }
export function prevSeason(key) { const s = parse(key); return !s ? null : s.q === 1 ? `${s.y - 1}Q4` : `${s.y}Q${s.q - 1}`; }
export const seasonName = key => { const s = parse(key); return s ? `Q${s.q} ${s.y}` : key; };
const before = (a, b) => seasonStart(a) < seasonStart(b);

/* The seasons that have ended by `now` and may be crowned, oldest first:
 * from RANKS.firstSeason up to the last one finished. */
export function endedSeasons(now) {
  const out = [];
  for (let k = prevSeason(seasonOf(now)); k && !before(k, RANKS.firstSeason); k = prevSeason(k)) out.unshift(k);
  return out;
}

/* A crown title is stored by id ("crown:G:2026Q4", "crown:OC:2026Q4");
 * its label is made from the id, so there is no list to keep. */
export const BOARD_WORLD = "G";
export const crownId = (board, season) => `crown:${board}:${season}`;
export function crownOf(id) {
  const m = /^crown:([A-Z]{1,2}):(\d{4}Q[1-4])$/.exec(id || "");
  if (!m || (m[1] !== BOARD_WORLD && !regionOk(m[1]))) return null;
  const [, board, season] = m;
  const label = board === BOARD_WORLD ? `Richest Vault · ${seasonName(season)}` : `Rank #1 ${REGIONS[board].name} · ${seasonName(season)}`;
  // the world's crown in starlight, a region's in gold
  return { id, board, season, label, effect: board === BOARD_WORLD ? "astral" : "shimmer", minLvl: 1, secret: true };
}
const LABEL = /^(?:Richest Vault|Rank #1 ([A-Za-z ]+)) · Q([1-4]) (\d{4})$/;
export function crownByLabel(label) {
  const m = LABEL.exec(label || "");
  if (!m) return null;
  const board = m[1] ? Object.keys(REGIONS).find(k => REGIONS[k].name === m[1]) : BOARD_WORLD;
  return board ? crownOf(crownId(board, `${m[3]}Q${m[2]}`)) : null;
}
/* the line under a crown, in its popup */
export const crownLine = c => (c.board === BOARD_WORLD
  ? `THE RICHEST VAULT IN THE WORLD AT THE END OF ${seasonName(c.season).toUpperCase()}.`
  : `THE RICHEST VAULT IN ${REGIONS[c.board].name.toUpperCase()} AT THE END OF ${seasonName(c.season).toUpperCase()}.`);
