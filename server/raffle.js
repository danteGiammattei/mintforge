/* ══════════════════════════════════════════════════════════════════════
 *  raffles — a daily draw for each metal
 *  ────────────────────────────────────────────────────────────────────
 *  enter   coins become tickets in their own metal's next draw. Each is
 *          taken from the vault there and then (locked ones are not),
 *          worth RAFFLE.entries[rarity] entries, and adds its sell price
 *          to that draw's pot.
 *  draw    once a draw's time has passed, the first request that looks
 *          (anyone's, entering or just viewing) draws it: one winner,
 *          picked by entries, takes the pot. The draw's row is the
 *          guard: the winner is paid in the same batch that writes it,
 *          and only if it was not already there, so two at once cannot
 *          pay twice.
 *  There is no clock running on the server; a draw nobody looks at waits
 *  (its time does not change) until someone does.
 * ══════════════════════════════════════════════════════════════════════ */

import { RAFFLE, METAL_BASE_VALUE } from "../shared/tuning.js";
import { MAX_RARITY } from "../shared/economy.js";
import { mkCoin, coinValue, deriveRarity } from "../src/lib/coin.js";
import { Refusal, cryptoRand } from "./http.js";

const DAY = 86400000;
const idOk = v => typeof v === "string" && v.length > 0 && v.length <= 80;

/* the next draw after `now` */
export function nextDraw(now) {
  const d = new Date(now), at = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), RAFFLE.drawUtcHour);
  return at > now ? at : at + DAY;
}
export const basePot = tier => RAFFLE.base * METAL_BASE_VALUE[tier];
export const entriesFor = rarity => RAFFLE.entries[Math.max(0, Math.min(MAX_RARITY, rarity))];

/* one winner among { player_id, n } by entries; rand in [0, 1) */
export function pickWinner(rows, rand) {
  const total = rows.reduce((s, r) => s + r.n, 0);
  let t = rand() * total;
  for (const r of rows) { if ((t -= r.n) < 0) return r.player_id; }
  return rows[rows.length - 1].player_id;
}

const coinOf = r => {
  const c = mkCoin(r.seed >>> 0, 1, r.metal_idx);
  c.shiny = !!r.shiny;
  c.rarity = r.rarity ?? deriveRarity(r.seed >>> 0);
  if (r.material) c.material = r.material;
  return c;
};

/* draw every draw whose time has come and that has not been drawn */
export async function settleDue(db, now, rand = cryptoRand) {
  const due = (await db.prepare(
    `SELECT draw_at, tier, SUM(value) AS value, SUM(entries) AS n, COUNT(DISTINCT player_id) AS players
       FROM raffle_entries e
      WHERE draw_at <= ?1 AND NOT EXISTS (SELECT 1 FROM raffle_draws d WHERE d.draw_at = e.draw_at AND d.tier = e.tier)
      GROUP BY draw_at, tier`).bind(now).all()).results || [];
  for (const d of due) {
    const rows = (await db.prepare(
      `SELECT player_id, SUM(entries) AS n FROM raffle_entries WHERE draw_at = ?1 AND tier = ?2 GROUP BY player_id ORDER BY player_id`
    ).bind(d.draw_at, d.tier).all()).results || [];
    if (!rows.length) continue;
    const winner = pickWinner(rows, rand), pot = basePot(d.tier) + d.value;
    await db.batch([
      db.prepare(`UPDATE player_state SET marks = marks + ?2 WHERE player_id = ?1
                    AND NOT EXISTS (SELECT 1 FROM raffle_draws WHERE draw_at = ?3 AND tier = ?4)`).bind(winner, pot, d.draw_at, d.tier),
      db.prepare(`INSERT OR IGNORE INTO raffle_draws (draw_at, tier, winner_id, pot, entries, players, drawn_at)
                  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`).bind(d.draw_at, d.tier, winner, pot, d.n, d.players, now),
    ]);
  }
}

/* what the raffle screen shows */
export async function raffleState(db, pid, { now = Date.now(), rand = cryptoRand } = {}) {
  await settleDue(db, now, rand);
  const drawAt = nextDraw(now);
  const open = (await db.prepare(
    `SELECT tier, SUM(value) AS value, SUM(entries) AS n, COUNT(DISTINCT player_id) AS players,
            SUM(CASE WHEN player_id = ?2 THEN entries ELSE 0 END) AS mine
       FROM raffle_entries WHERE draw_at = ?1 GROUP BY tier`).bind(drawAt, pid).all()).results || [];
  const byTier = Object.fromEntries(open.map(r => [r.tier, r]));
  const tiers = METAL_BASE_VALUE.map((_, tier) => {
    const r = byTier[tier];
    return { tier, pot: basePot(tier) + (r?.value || 0), entries: r?.n || 0, players: r?.players || 0, mine: r?.mine || 0 };
  });
  // the last draw, and anything you have won in the past week
  const lastAt = drawAt - DAY;
  const last = ((await db.prepare(
    `SELECT d.tier, d.pot, d.entries, d.players, d.winner_id, p.username AS winner
       FROM raffle_draws d JOIN players p ON p.id = d.winner_id WHERE d.draw_at = ?1 ORDER BY d.tier`).bind(lastAt).all()).results || [])
    .map(r => ({ tier: r.tier, pot: r.pot, entries: r.entries, players: r.players, winner: r.winner, you: r.winner_id === pid }));
  const won = ((await db.prepare(
    `SELECT draw_at, tier, pot FROM raffle_draws WHERE winner_id = ?1 AND draw_at > ?2 ORDER BY draw_at DESC LIMIT 20`
  ).bind(pid, now - 7 * DAY).all()).results || []).map(r => ({ drawAt: r.draw_at, tier: r.tier, pot: r.pot }));
  return { now, drawAt, lastAt, tiers, last, won };
}

/* coins into their metals' next draws */
export async function enterRaffle(db, pid, body, { now = Date.now(), rand = cryptoRand } = {}) {
  const ids = [...new Set((Array.isArray(body?.coinIds) ? body.coinIds : []).filter(idOk))].slice(0, RAFFLE.maxCoins);
  if (!ids.length) throw new Refusal("Which coins?");
  await settleDue(db, now, rand);
  const drawAt = nextDraw(now);
  // locked and dusty coins are simply not matched, so not entered
  const gone = (await db.prepare(
    `DELETE FROM coins WHERE player_id = ?1 AND locked = 0 AND dusty = 0 AND id IN (${ids.map((_, i) => `?${i + 2}`).join(",")})
     RETURNING id, seed, metal_idx, shiny, rarity, material, sign`).bind(pid, ...ids).all()).results || [];
  if (!gone.length) throw new Refusal("None of those can be entered", 409);
  const tickets = gone.map(r => {
    const c = coinOf(r);
    return { tier: r.metal_idx, entries: entriesFor(c.rarity), value: coinValue(c), coin: JSON.stringify(r) };
  });
  await db.batch(tickets.map(t => db.prepare(
    `INSERT INTO raffle_entries (draw_at, tier, player_id, coin, entries, value, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  ).bind(drawAt, t.tier, pid, t.coin, t.entries, t.value, now)));
  return {
    entered: gone.map(r => r.id), drawAt,
    entries: tickets.reduce((s, t) => s + t.entries, 0),
    raffle: await raffleState(db, pid, { now, rand }),
  };
}
