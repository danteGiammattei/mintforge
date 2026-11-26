/* The leaderboards (shared/ranks.js has the rules): each player's vault
 * value, kept on their row whenever their state is loaded; their region,
 * set once; the boards; and, from the clock (workers/clock), the crowning
 * of each board's first when a season ends. */
import { mkCoin, coinValue } from "../src/lib/coin.js";
import { MATERIAL } from "../shared/tuning.js";
import { SEASONS, relicOf } from "../shared/events.js";
import { RANKS, REGIONS, BOARD_WORLD, regionOk, seasonOf, seasonEnd, endedSeasons, crownId, crownOf, crownLine } from "../shared/ranks.js";
import { Refusal } from "./http.js";

/* a coin row as the game's coin, for its worth */
export const hydrate = r => {
  const c = mkCoin(r.seed >>> 0, 1, r.metal_idx);
  c.shiny = !!r.shiny;
  if (r.rarity != null) c.rarity = r.rarity;
  if (MATERIAL.byTier.includes(r.material) && r.material) c.material = r.material;
  if (r.season && SEASONS[r.season]) c.season = r.season;
  if (relicOf(r.relic)) c.relic = r.relic;
  return c;
};

/* what a vault is worth: every clean coin in it */
export const vaultValue = rows => rows.reduce((n, r) => n + (r.dusty ? 0 : coinValue(hydrate(r))), 0);

/* Keep the row's value up to date (only written when it has changed),
 * and the player's region, the first time it is known. */
export function keepRankStmts(db, pid, { value, oldValue, region, oldRegion }) {
  const out = [];
  if (value !== oldValue) out.push(db.prepare(`UPDATE player_state SET vault_value = ?2 WHERE player_id = ?1`).bind(pid, value));
  if (!oldRegion && regionOk(region)) out.push(db.prepare(`UPDATE players SET region = ?2 WHERE id = ?1 AND region IS NULL`).bind(pid, region));
  return out;
}

/* ─── the boards ──────────────────────────────────────────────────── */

const ROW = `SELECT p.username, p.region, s.vault_value AS value, s.selected_title AS title, s.frame
               FROM player_state s JOIN players p ON p.id = s.player_id`;

/* act "ranks" { board: "G" | "OC" | … } → the top of that board, where
 * you stand on it, when the season ends, and who was crowned before. */
export async function ranks(db, pid, body, { now }) {
  const me = await db.prepare(
    `SELECT p.region, s.vault_value AS value FROM player_state s JOIN players p ON p.id = s.player_id WHERE s.player_id = ?1`
  ).bind(pid).first();
  const board = body.board ?? BOARD_WORLD;
  if (board !== BOARD_WORLD && !regionOk(board)) throw new Refusal("No such board");
  const world = board === BOARD_WORLD;
  const [top, above, crowns] = await Promise.all([
    world
      ? db.prepare(`${ROW} WHERE s.vault_value > 0 ORDER BY s.vault_value DESC, p.id LIMIT ${RANKS.top}`).all()
      : db.prepare(`${ROW} WHERE s.vault_value > 0 AND p.region = ?1 ORDER BY s.vault_value DESC, p.id LIMIT ${RANKS.top}`).bind(board).all(),
    // where I stand: how many are ahead (ties go to the older account), on
    // the world's board or my own region's
    (world || board === me.region) && me.value > 0
      ? db.prepare(`SELECT COUNT(*) AS n FROM player_state s JOIN players p ON p.id = s.player_id
                     WHERE (s.vault_value > ?1 OR (s.vault_value = ?1 AND p.id < ?2)) AND (?3 IS NULL OR p.region = ?3)`)
          .bind(me.value, pid, world ? null : board).first()
      : null,
    db.prepare(`SELECT c.season, p.username, c.value FROM crowns c JOIN players p ON p.id = c.player_id
                 WHERE c.board = ?1 ORDER BY c.season DESC LIMIT 8`).bind(board).all(),
  ]);
  const season = seasonOf(now);
  return {
    board, region: me.region || null,
    rows: (top.results || []).map((r, i) => ({ rank: i + 1, username: r.username, value: r.value, title: r.title || null, frame: r.frame || null, region: r.region || null })),
    me: { value: me.value || 0, rank: above ? above.n + 1 : null },
    season, endsAt: seasonEnd(season),
    crowns: (crowns.results || []).map(c => ({ season: c.season, username: c.username, value: c.value })),
  };
}

/* ─── crowning, from the clock ───────────────────────────────────── */

/* Re-count a few players' vaults from their coins, so a sale the clock
 * settled while they were away is in their value before a crown is
 * decided on it. */
async function recount(db, pids) {
  if (!pids.length) return;
  const rows = (await db.prepare(
    `SELECT player_id, seed, metal_idx, shiny, rarity, dusty, material, season, relic FROM coins
      WHERE player_id IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(pids)).all()).results || [];
  const by = new Map(pids.map(p => [p, []]));
  for (const r of rows) by.get(r.player_id)?.push(r);
  await db.batch([...by].map(([p, rs]) => db.prepare(`UPDATE player_state SET vault_value = ?2 WHERE player_id = ?1`).bind(p, vaultValue(rs))));
}

/* Crown every season that has ended and not been crowned yet: the world's
 * first and each region's. Each crown is claimed by its row in `crowns`
 * (season, board) before it is given, so the clock firing twice, or two
 * clocks, can never crown twice. Returns how many were given. */
export async function crownDue(db, now) {
  let given = 0;
  // only the latest season to end is looked at (a clock down for a whole
  // quarter is not worth planning for), and once it has been through every
  // board it is marked and left alone, so most minutes cost one read
  for (const season of endedSeasons(now).slice(-1)) {
    const mark = `crowned:${season}`;
    if (await db.prepare(`SELECT 1 FROM migration_marks WHERE id = ?1`).bind(mark).first()) continue;
    const done = await db.prepare(`SELECT board FROM crowns WHERE season = ?1`).bind(season).all();
    const have = new Set((done.results || []).map(r => r.board));
    for (const board of [BOARD_WORLD, ...Object.keys(REGIONS)]) {
      if (have.has(board)) continue;
      const where = board === BOARD_WORLD ? "" : "AND p.region = ?1";
      const args = board === BOARD_WORLD ? [] : [board];
      const lead = async n => ((await db.prepare(
        `SELECT s.player_id AS pid, s.vault_value AS value FROM player_state s JOIN players p ON p.id = s.player_id
          WHERE s.vault_value > 0 ${where} ORDER BY s.vault_value DESC, p.id LIMIT ${n}`).bind(...args).all()).results || []);
      const before = await lead(RANKS.refresh);
      if (!before.length) continue;                                   // nobody on this board
      await recount(db, before.map(r => r.pid));
      const [first] = await lead(1);
      if (!first) continue;
      const id = crownId(board, season), c = crownOf(id);
      const res = await db.batch([
        db.prepare(`INSERT OR IGNORE INTO crowns (season, board, player_id, value, at) VALUES (?1, ?2, ?3, ?4, ?5)`)
          .bind(season, board, first.pid, first.value, now),
        // the title, and a popup for their next load; only if this crown was claimed just now
        db.prepare(
          `UPDATE player_state
              SET owned_titles = CASE WHEN EXISTS (SELECT 1 FROM json_each(COALESCE(owned_titles, '[]')) WHERE value = ?2)
                                      THEN owned_titles ELSE json_insert(COALESCE(owned_titles, '[]'), '$[#]', ?2) END,
                  stats = json_set(COALESCE(stats, '{}'), '$.crowned',
                                   json_insert(COALESCE(json_extract(stats, '$.crowned'), json('[]')), '$[#]', json(?3)))
            WHERE player_id = ?1
              AND EXISTS (SELECT 1 FROM crowns WHERE season = ?4 AND board = ?5 AND player_id = ?1 AND at = ?6)`
        ).bind(first.pid, id, JSON.stringify({ title: id, line: crownLine(c) }), season, board, now),
      ]);
      if (res[0]?.meta?.changes) given++;
    }
    await db.prepare(`INSERT OR IGNORE INTO migration_marks (id, at) VALUES (?1, ?2)`).bind(mark, now).run();
  }
  return given;
}
