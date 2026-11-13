/* ══════════════════════════════════════════════════════════════════════
 *  war — high card for two friends' coins
 *  ────────────────────────────────────────────────────────────────────
 *  invite  the host stakes a coin and names a friend      → invited
 *  join    the friend stakes one at least as rare         → playing
 *  flip    each flips; when both have, the server deals   → … → done
 *  decline / cancel, or nobody answering or flipping      → void
 *
 *  A staked coin leaves `coins` and waits in its table as JSON, so it
 *  cannot be sold, forged or staked twice while it is on the felt. When
 *  a table settles, both go to the winner; when it is voided, each goes
 *  home. Every settle is one batch, and only the attempt whose nonce won
 *  the table's status change moves any coin.
 *
 *  The deck is shuffled when the guest sits down and never leaves the
 *  server. Each round the host is fanned the top WAR.fan cards and the
 *  guest the next WAR.fan, face down, and each picks one: the pick is
 *  real, the card under it is what they play. A card is only shown once
 *  both have picked, so walking away can never dodge a decided loss.
 * ══════════════════════════════════════════════════════════════════════ */

import { WAR } from "../shared/tuning.js";
import { MAX_RARITY } from "../shared/economy.js";
import { deriveRarity } from "../src/lib/coin.js";
import { Refusal, randomHex, cryptoRand } from "./http.js";
import { journalStmt } from "./game.js";

const ACTIVE = "('invited','playing')";
const idOk = v => typeof v === "string" && v.length > 0 && v.length <= 80;

/* cards are 0..51: suit = n / 13 (spades, hearts, diamonds, clubs), rank =
 * n % 13 + 1 (ace 1 … king 13). In war the ace is high. */
export const cardValue = n => { const r = (n % 13) + 1; return r === 1 ? 14 : r; };

export function shuffled(rand) {
  const d = Array.from({ length: 52 }, (_, i) => i);
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

/* Play a round from what is left of `deck`: the host's card is the one
 * at their pick in the first fan, the guest's at theirs in the second.
 * After a tie it is war, and each also lays WAR.warDown face down from
 * the top. The cards not picked stay in the deck, in order. Returns the
 * deck left and the round, or null when there are too few cards. */
export function dealRound(deck, hp, gp, war) {
  const F = WAR.fan, down = war ? WAR.warDown : 0;
  if (deck.length < 2 * F + 2 * down) return null;
  const h = deck[hp], g = deck[F + gp];
  let left = deck.filter((_, i) => i !== hp && i !== F + gp);
  left = left.slice(2 * down);
  const result = cardValue(h) > cardValue(g) ? "host" : cardValue(g) > cardValue(h) ? "guest" : "tie";
  return { deck: left, entry: { war, down, host: h, guest: g, hp, gp, result } };
}
const pickOk = v => Number.isInteger(v) && v >= 0 && v < WAR.fan;

const coinJson = `json_object('id', id, 'seed', seed, 'metal_idx', metal_idx, 'shiny', shiny,
  'rarity', COALESCE(rarity, ?R), 'nickname', nickname, 'acquired_at', acquired_at, 'material', material)`;
const parse = s => { try { return JSON.parse(s); } catch { return null; } };
const coinOut = c => c && ({
  id: c.id, seed: c.seed >>> 0, metalIdx: c.metal_idx, shiny: !!c.shiny, locked: false, rarity: c.rarity,
  ...(c.nickname ? { nick: c.nickname } : {}),
  ...(c.material ? { material: c.material } : {}),
});
const rarityOf = row => row.rarity ?? deriveRarity(row.seed >>> 0);

/* A coin coming out of escrow into `owner`'s vault. */
const release = (db, t, side, owner, nonce, now) => db.prepare(
  `INSERT INTO coins (id, player_id, seed, metal_idx, shiny, locked, rarity, acquired_at, dusty, nickname, material)
   SELECT json_extract(${side}_coin, '$.id'), ?3, json_extract(${side}_coin, '$.seed'), json_extract(${side}_coin, '$.metal_idx'),
          json_extract(${side}_coin, '$.shiny'), 0, json_extract(${side}_coin, '$.rarity'), ?4, 0, json_extract(${side}_coin, '$.nickname'),
          json_extract(${side}_coin, '$.material')
     FROM war_tables WHERE id = ?1 AND settle = ?2 AND ${side}_coin IS NOT NULL`
).bind(t.id, nonce, owner, now);

/* Call a table off: each coin goes home. */
async function voidTable(db, t, why, now) {
  const nonce = randomHex(8);
  await db.batch([
    db.prepare(`UPDATE war_tables SET status = 'void', why = ?2, settle = ?3, updated_at = ?4 WHERE id = ?1 AND status IN ${ACTIVE}`)
      .bind(t.id, why, nonce, now),
    release(db, t, "host", t.host_id, nonce, now),
    release(db, t, "guest", t.guest_id, nonce, now),
  ]);
}

/* Lapse whatever of this player's tables nobody answered or played. */
async function sweep(db, pid, now) {
  const stale = await db.prepare(
    `SELECT * FROM war_tables WHERE (host_id = ?1 OR guest_id = ?1) AND (
       (status = 'invited' AND expires_at <= ?2) OR (status = 'playing' AND updated_at <= ?3))`
  ).bind(pid, now, now - WAR.idleMs).all();
  for (const t of stale.results || []) await voidTable(db, t, t.status === "invited" ? "unanswered" : "abandoned", now);
}

/* Is this player already at a table (hosting one, or seated as guest)? */
const busy = (db, pid, except = "") => db.prepare(
  `SELECT 1 FROM war_tables WHERE id != ?2 AND ((host_id = ?1 AND status IN ${ACTIVE}) OR (guest_id = ?1 AND status = 'playing')) LIMIT 1`
).bind(pid, except).first();

async function getTable(db, id, pid) {
  if (!idOk(id)) throw new Refusal("Which table?");
  const t = await db.prepare(`SELECT * FROM war_tables WHERE id = ?1 AND (host_id = ?2 OR guest_id = ?2)`).bind(id, pid).first();
  if (!t) throw new Refusal("That table is gone", 404);
  return t;
}

/* ─── the moves ───────────────────────────────────────────────────── */

async function invite(db, pid, body, now) {
  const friend = String(body.friend || "").trim();
  if (!friend || !idOk(body.coinId)) throw new Refusal("Whom, and with which coin?");
  const g = await db.prepare(
    `SELECT players.id FROM friends JOIN players ON players.id = friends.friend_id
      WHERE friends.player_id = ?1 AND players.username = ?2 COLLATE NOCASE`).bind(pid, friend).first();
  if (!g) throw new Refusal("You can only challenge a friend", 403);
  if (g.id === pid) throw new Refusal("You cannot play yourself");
  if (await busy(db, pid)) throw new Refusal("You are already at a table", 409);
  const c = await db.prepare(`SELECT id, seed, rarity, locked, dusty FROM coins WHERE id = ?1 AND player_id = ?2`).bind(body.coinId, pid).first();
  if (!c || c.dusty) throw new Refusal("That coin is not yours to stake", 404);
  if (c.locked) throw new Refusal("That coin is locked", 409);

  const id = "w_" + randomHex(8);
  const [put] = await db.batch([
    db.prepare(
      `INSERT INTO war_tables (id, host_id, guest_id, host_coin, status, created_at, updated_at, expires_at)
       SELECT ?1, ?2, ?3, ${coinJson.replace("?R", "?6")}, 'invited', ?4, ?4, ?5
         FROM coins WHERE id = ?7 AND player_id = ?2 AND dusty = 0 AND locked = 0
          AND NOT EXISTS (SELECT 1 FROM war_tables WHERE (host_id = ?2 AND status IN ${ACTIVE}) OR (guest_id = ?2 AND status = 'playing'))`
    ).bind(id, pid, g.id, now, now + WAR.inviteMs, rarityOf(c), c.id),
    db.prepare(`DELETE FROM coins WHERE id = ?1 AND player_id = ?2 AND EXISTS (SELECT 1 FROM war_tables WHERE id = ?3)`).bind(c.id, pid, id),
  ]);
  if (!put.meta.changes) throw new Refusal("That coin cannot be staked right now", 409);
  return { tableId: id };
}

async function join(db, pid, body, now, rand) {
  const t = await getTable(db, body.tableId, pid);
  if (t.guest_id !== pid || t.status !== "invited" || t.expires_at <= now) throw new Refusal("That challenge has lapsed", 409);
  if (!idOk(body.coinId)) throw new Refusal("Which coin?");
  if (await busy(db, pid, t.id)) throw new Refusal("You are already at a table", 409);
  const c = await db.prepare(`SELECT id, seed, rarity, locked, dusty FROM coins WHERE id = ?1 AND player_id = ?2`).bind(body.coinId, pid).first();
  if (!c || c.dusty) throw new Refusal("That coin is not yours to stake", 404);
  if (c.locked) throw new Refusal("That coin is locked", 409);
  const need = parse(t.host_coin)?.rarity ?? 0;
  if (rarityOf(c) < need) throw new Refusal("Your coin must be at least as rare as theirs", 409);

  const [sat] = await db.batch([
    db.prepare(
      `UPDATE war_tables SET status = 'playing', deck = ?4, updated_at = ?3,
              guest_coin = (SELECT ${coinJson.replace("?R", "?5")} FROM coins WHERE id = ?6 AND player_id = ?2)
        WHERE id = ?1 AND guest_id = ?2 AND status = 'invited' AND expires_at > ?3
          AND EXISTS (SELECT 1 FROM coins WHERE id = ?6 AND player_id = ?2 AND dusty = 0 AND locked = 0)`
    ).bind(t.id, pid, now, JSON.stringify(shuffled(rand)), rarityOf(c), c.id),
    db.prepare(
      `DELETE FROM coins WHERE id = ?1 AND player_id = ?2
          AND EXISTS (SELECT 1 FROM war_tables WHERE id = ?3 AND status = 'playing' AND json_extract(guest_coin, '$.id') = ?1)`
    ).bind(c.id, pid, t.id),
  ]);
  if (!sat.meta.changes) throw new Refusal("That challenge has lapsed", 409);
  return { tableId: t.id };
}

async function leave(db, pid, body, now, as) {
  const t = await getTable(db, body.tableId, pid);
  if (t.status !== "invited") throw new Refusal("The cards are already out", 409);
  if (as === "decline" && t.guest_id !== pid) throw new Refusal("That challenge is not to you", 403);
  if (as === "cancel" && t.host_id !== pid) throw new Refusal("That challenge is not yours", 403);
  await voidTable(db, t, as === "decline" ? "declined" : "cancelled", now);
  return { tableId: t.id };
}

async function flip(db, pid, body, now) {
  let t = await getTable(db, body.tableId, pid);
  if (t.status !== "playing") throw new Refusal("That table is closed", 409);
  const side = t.host_id === pid ? "host" : "guest";
  if (t[`${side}_flip`] < t.round) {
    if (!pickOk(body.pick)) throw new Refusal("Pick a card");
    await db.prepare(`UPDATE war_tables SET ${side}_flip = ?2, ${side}_pick = ?4, updated_at = ?3
                       WHERE id = ?1 AND status = 'playing' AND round = ?2 AND ${side}_flip < ?2`)
      .bind(t.id, t.round, now, body.pick).run();
    t = await getTable(db, t.id, pid);
  }
  if (t.status !== "playing" || t.host_flip < t.round || t.guest_flip < t.round) return { tableId: t.id };

  // both have flipped for this round: deal it
  const log = parse(t.log) || [], deck = parse(t.deck) || [];
  const war = log.length > 0 && log[log.length - 1].result === "tie";
  const dealt = dealRound(deck, t.host_pick, t.guest_pick, war);
  if (!dealt) { await voidTable(db, t, "deck", now); return { tableId: t.id }; }
  log.push(dealt.entry);
  const done = dealt.entry.result !== "tie";
  const winner = done ? (dealt.entry.result === "host" ? t.host_id : t.guest_id) : null;
  const nonce = randomHex(8);
  const out = await db.batch([
    db.prepare(
      `UPDATE war_tables SET round = round + 1, deck = ?3, log = ?4, status = ?5, winner_id = ?6, settle = ?7, updated_at = ?8
        WHERE id = ?1 AND round = ?2 AND status = 'playing'`
    ).bind(t.id, t.round, JSON.stringify(dealt.deck), JSON.stringify(log), done ? "done" : "playing", winner, done ? nonce : null, now),
    ...(done ? [release(db, t, "host", winner, nonce, now), release(db, t, "guest", winner, nonce, now)] : []),
  ]);
  if (done && out[0].meta.changes) {
    const won = parse(winner === t.host_id ? t.guest_coin : t.host_coin);
    if (won) await journalStmt(db, winner, { seed: won.seed, metalIdx: won.metal_idx, shiny: !!won.shiny, rarity: won.rarity, material: won.material }).run();
  }
  return { tableId: t.id };
}

/* ─── what a player sees ──────────────────────────────────────────── */

export async function warState(db, pid, now = Date.now()) {
  await sweep(db, pid, now);
  const rows = (await db.prepare(
    `SELECT w.id, w.host_id, w.guest_id, w.host_coin, w.guest_coin, w.status, w.round, w.host_flip, w.guest_flip,
            w.log, w.winner_id, w.host_pick, w.guest_pick, w.why, w.updated_at, w.expires_at, h.username AS host_name, g.username AS guest_name
       FROM war_tables w JOIN players h ON h.id = w.host_id JOIN players g ON g.id = w.guest_id
      WHERE (w.host_id = ?1 OR w.guest_id = ?1) AND (w.status IN ${ACTIVE} OR w.updated_at > ?2)
      ORDER BY w.updated_at DESC LIMIT 20`
  ).bind(pid, now - WAR.recentMs).all()).results || [];

  const view = r => {
    const me = r.host_id === pid ? "host" : "guest", them = me === "host" ? "guest" : "host";
    return {
      id: r.id, role: me, other: r[`${them}_name`], status: r.status,
      mine: coinOut(parse(r[`${me}_coin`])), theirs: coinOut(parse(r[`${them}_coin`])),
      round: r.round, youFlipped: r[`${me}_flip`] >= r.round, theyFlipped: r[`${them}_flip`] >= r.round,
      // which face-down card each pulled this round (says nothing of what it is)
      yourPick: r[`${me}_flip`] >= r.round ? r[`${me}_pick`] : null,
      theirPick: r[`${them}_flip`] >= r.round ? r[`${them}_pick`] : null,
      fan: WAR.fan,
      // rounds dealt, from this player's side
      log: (parse(r.log) || []).map(e => ({ war: e.war, down: e.down, mine: e[me], theirs: e[them], result: e.result === "tie" ? "tie" : e.result === me ? "won" : "lost" })),
      outcome: r.status === "done" ? (r.winner_id === pid ? "won" : "lost") : r.status === "void" ? r.why : null,
      expiresIn: r.status === "invited" ? Math.max(0, r.expires_at - now) : null,
      idleIn: r.status === "playing" ? Math.max(0, r.updated_at + WAR.idleMs - now) : null,
      at: r.updated_at,
    };
  };
  const table = rows.find(r => r.status === "playing" || (r.status === "invited" && r.host_id === pid));
  return {
    table: table ? view(table) : null,
    invites: rows.filter(r => r.status === "invited" && r.guest_id === pid).map(view),
    recent: rows.filter(r => r.status === "done" || r.status === "void").map(view).slice(0, 5),
    maxRarity: MAX_RARITY,
  };
}

export async function warMove(db, pid, body, { now = Date.now(), rand = cryptoRand } = {}) {
  await sweep(db, pid, now);
  const op = body?.op;
  let result;
  if (op === "invite") result = await invite(db, pid, body, now);
  else if (op === "join") result = await join(db, pid, body, now, rand);
  else if (op === "decline" || op === "cancel") result = await leave(db, pid, body, now, op);
  else if (op === "flip") result = await flip(db, pid, body, now);
  else throw new Refusal("Unknown move");
  return { result, war: await warState(db, pid, now) };
}
