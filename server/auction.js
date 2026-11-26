/* ══════════════════════════════════════════════════════════════════════
 *  The tavern's auction house
 *  ────────────────────────────────────────────────────────────────────
 *  auctions  the open listings (the goblin's two for the day are made on
 *            the first look), and your own
 *  list      a coin of yours, a starting price and how long it runs. The
 *            coin leaves the vault: its row moves into the listing whole
 *  bid       at least the starting price, then at least 5% over the last
 *            bid. Your marks are taken now; a bid that is beaten is handed
 *            straight back, with a note to say so
 *  withdraw  your own listing, while nobody has bid on it
 *  settle    when the clock runs out (the clock worker, workers/clock, or
 *            whoever looks next): the coin goes to the highest bid and the
 *            seller gets the bid less the house's tenth; with no bid it
 *            goes home. The goblin's takings simply leave the game.
 *
 *  D1 has no interactive transactions, so every change that moves value
 *  is one batch whose first statement claims the listing with a fresh
 *  token (a guarded UPDATE that matches only if nothing has moved since it
 *  was read); every statement after it runs only where that token
 *  stands. A losing race changes nothing at all.
 *
 *  Not listable: the collectable sets (the Magi's gifts, the astral
 *  coins, of which a vault holds one per sign), locked coins and coins
 *  still to be brushed.
 * ══════════════════════════════════════════════════════════════════════ */

import { AUCTION, COIN_METAL_BY_CHEST } from "../shared/tuning.js";
import { levelOf, weighted, coinRarityWeights } from "../shared/economy.js";
import { mkCoin, coinValue } from "../src/lib/coin.js";
import { Refusal, randomHex } from "./http.js";
import { coinOut } from "./state.js";
import { journalStmt } from "./game.js";

const idOk = v => typeof v === "string" && /^[A-Za-z0-9_#:-]{1,80}$/.test(v);
// the columns a coin keeps when it changes hands; who holds it, when it
// came, and its lock are the new holder's own
const KEEP = ["id", "seed", "metal_idx", "shiny", "rarity", "nickname", "material", "season"];
const nextBid = a => a.bid == null ? a.start_price : a.bid + Math.max(1, Math.ceil(a.bid * AUCTION.raise));
const holds = (id, tok) => `EXISTS (SELECT 1 FROM auctions WHERE id = '${id}' AND token = '${tok}')`;

async function gate(db, pid) {
  const ps = await db.prepare(`SELECT xp, marks FROM player_state WHERE player_id = ?1`).bind(pid).first();
  if (levelOf(ps?.xp || 0) < AUCTION.minLevel) throw new Refusal(`The auction house opens at level ${AUCTION.minLevel}`, 403);
  return ps;
}

// a coin row back into a vault, if the token stands
function giveCoin(db, pid, row, now, guard) {
  const vals = KEEP.map(k => row[k] ?? null);
  return db.prepare(
    `INSERT INTO coins (${KEEP.join(", ")}, player_id, locked, dusty, acquired_at)
     SELECT ${KEEP.map((_, i) => `?${i + 1}`).join(", ")}, ?${KEEP.length + 1}, 0, 0, ?${KEEP.length + 2} WHERE ${guard}`
  ).bind(...vals, pid, now);
}
const note = (db, pid, kind, a, amount, now, guard) => db.prepare(
  `INSERT INTO auction_notes (player_id, kind, auction_id, amount, coin, created_at) SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE ${guard}`
).bind(pid, kind, a.id, amount, a.coin, now);
const asCoin = row => ({ seed: row.seed >>> 0, metalIdx: row.metal_idx, shiny: !!row.shiny, rarity: row.rarity, material: row.material, season: row.season });

/* ─── settling ────────────────────────────────────────────────────── */

export async function settleOne(db, a, now) {
  const tok = randomHex(8);
  if (!idOk(a.id)) return false;
  const guard = holds(a.id, tok), row = JSON.parse(a.coin), stmts = [
    db.prepare(`UPDATE auctions SET settled = 1, token = ?2 WHERE id = ?1 AND settled = 0 AND ends_at <= ?3`).bind(a.id, tok, now),
  ];
  if (a.bidder_id != null) {
    const paid = a.bid - Math.floor(a.bid * AUCTION.cut);
    stmts.push(giveCoin(db, a.bidder_id, row, now, guard));
    stmts.push(journalStmt(db, a.bidder_id, asCoin(row), guard));
    stmts.push(note(db, a.bidder_id, "won", a, a.bid, now, guard));
    if (a.seller_id != null) {
      stmts.push(db.prepare(`UPDATE player_state SET marks = marks + ?2 WHERE player_id = ?1 AND ${guard}`).bind(a.seller_id, paid));
      stmts.push(note(db, a.seller_id, "sold", a, paid, now, guard));
    }
  } else if (a.seller_id != null) {
    stmts.push(giveCoin(db, a.seller_id, row, now, guard));
    stmts.push(note(db, a.seller_id, "unsold", a, null, now, guard));
  }
  await db.batch(stmts);
  return true;
}

/** Settle whatever has run out (the clock worker calls this each minute). */
export async function settleDue(db, now = Date.now(), limit = 25) {
  const due = (await db.prepare(
    `SELECT * FROM auctions WHERE settled = 0 AND ends_at <= ?1 ORDER BY ends_at LIMIT ?2`).bind(now, limit).all()).results || [];
  for (const a of due) await settleOne(db, a, now);
  return due.length;
}

/* ─── the goblin's own ───────────────────────────────────────────────
 * Two a day, the same for everyone, rolled from the day: a fair coin,
 * often a fine one, at well under what it is worth. Made by whoever looks
 * first; the day's key makes a second making a no-op. */
function rng(a, b) {
  let s = (Math.imul(a ^ 0x9e3779b9, 2654435761) ^ Math.imul(b + 0x7f4a7c15, 1597334677)) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function houseWares(day) {
  const H = AUCTION.house, n = Math.floor(Date.parse(day + "T00:00:00Z") / 86400e3);
  return Array.from({ length: H.perDay }, (_, i) => {
    const rand = rng(n, i + 1);
    const metalIdx = weighted(COIN_METAL_BY_CHEST[H.chestTier], rand());
    const rarity = Math.min(4, weighted(coinRarityWeights(H.chestTier), rand()));
    const seed = Math.floor(rand() * 4294967296) >>> 0;
    const c = mkCoin(seed, 1, metalIdx, undefined, rarity);
    return {
      key: `${day}#${i}`,
      row: { id: `c_h${n.toString(36)}${i}`, seed, metal_idx: metalIdx, shiny: 0, rarity, nickname: null, material: null, season: null },
      start: Math.max(5, Math.round(coinValue(c) * H.startMul / 5) * 5),
    };
  });
}
export async function stockHouse(db, now) {
  const day = new Date(now).toISOString().slice(0, 10);
  const have = await db.prepare(`SELECT COUNT(*) AS n FROM auctions WHERE house_key LIKE ?1`).bind(day + "#%").first();
  if ((have?.n || 0) >= AUCTION.house.perDay) return;
  await db.batch(houseWares(day).map(w => db.prepare(
    `INSERT OR IGNORE INTO auctions (id, seller_id, coin, start_price, created_at, ends_at, house_key) VALUES (?1, NULL, ?2, ?3, ?4, ?5, ?6)`
  ).bind("a_" + w.key.replace("#", "_"), JSON.stringify(w.row), w.start, now, now + AUCTION.house.hours * 3600e3, w.key)));
}

/* ─── the actions ─────────────────────────────────────────────────── */

const bare = row => { const c = coinOut(row); delete c.locked; return c; };
const out = (a, pid) => {
  const c = bare(JSON.parse(a.coin));
  return {
    id: a.id, coin: c, start: a.start_price, bid: a.bid, bids: a.bids, endsAt: a.ends_at, next: nextBid(a),
    seller: a.seller_id == null ? null : a.seller_name || "?", house: a.seller_id == null,
    mine: a.seller_id === pid, leading: a.bidder_id === pid,
  };
};

export async function auctions(db, pid, body, { now }) {
  await gate(db, pid);
  const settled = await settleDue(db, now);
  await stockHouse(db, now);
  const rows = (await db.prepare(
    `SELECT a.*, p.username AS seller_name FROM auctions a LEFT JOIN players p ON p.id = a.seller_id
     WHERE a.settled = 0 ORDER BY a.ends_at LIMIT 80`).all()).results || [];
  // settling may have moved this player's coins or marks: say so, and the
  // reply carries their state (server/game.js act, READS)
  return { now, cut: AUCTION.cut, list: rows.map(a => out(a, pid)), ...(settled ? { _state: true } : {}) };
}

export async function list(db, pid, body, { now }) {
  await gate(db, pid);
  if (!idOk(body.coinId)) throw new Refusal("Which coin?");
  const price = body.price, minutes = body.minutes;
  if (!Number.isInteger(price) || price < 1 || price > AUCTION.maxPrice) throw new Refusal("Set a starting price");
  if (!Number.isInteger(minutes) || minutes < AUCTION.minutes[0] || minutes > AUCTION.minutes[1]) throw new Refusal("Between ten minutes and seven days");
  const open = await db.prepare(`SELECT COUNT(*) AS n FROM auctions WHERE seller_id = ?1 AND settled = 0`).bind(pid).first();
  if ((open?.n || 0) >= AUCTION.openPerPlayer) throw new Refusal(`You have ${AUCTION.openPerPlayer} up already`, 409);
  const c = await db.prepare(`SELECT * FROM coins WHERE id = ?1 AND player_id = ?2 AND dusty = 0`).bind(body.coinId, pid).first();
  if (!c) throw new Refusal("That coin is gone", 404);
  if (c.relic || c.sign != null) throw new Refusal("That one belongs to a set. It is not for the block", 409);
  if (c.locked) throw new Refusal("Unlock it first", 409);
  const id = "a_" + randomHex(8), row = Object.fromEntries(KEEP.map(k => [k, c[k] ?? null]));
  await db.batch([
    db.prepare(
      `INSERT INTO auctions (id, seller_id, coin, start_price, created_at, ends_at)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE EXISTS (
         SELECT 1 FROM coins WHERE id = ?7 AND player_id = ?2 AND locked = 0 AND dusty = 0 AND relic IS NULL AND sign IS NULL)`
    ).bind(id, pid, JSON.stringify(row), price, now, now + minutes * 60_000, c.id),
    db.prepare(`DELETE FROM coins WHERE id = ?1 AND player_id = ?2 AND EXISTS (SELECT 1 FROM auctions WHERE id = ?3)`).bind(c.id, pid, id),
  ]);
  const made = await db.prepare(`SELECT id, ends_at FROM auctions WHERE id = ?1`).bind(id).first();
  if (!made) throw new Refusal("That coin is gone", 409);
  return { auctionId: id, coinId: c.id, endsAt: made.ends_at };
}

export async function bid(db, pid, body, { now }) {
  const ps = await gate(db, pid);
  if (!idOk(body.auctionId)) throw new Refusal("Which one?");
  const a = await db.prepare(`SELECT * FROM auctions WHERE id = ?1`).bind(body.auctionId).first();
  if (!a || a.settled || a.ends_at <= now) throw new Refusal("The hammer has fallen on that one", 409);
  if (a.seller_id === pid) throw new Refusal("You can't bid on your own coin", 409);
  if (a.bidder_id === pid) throw new Refusal("Yours is the bid to beat", 409);
  const amount = body.amount;
  if (!Number.isInteger(amount) || amount > AUCTION.maxPrice) throw new Refusal("How much?");
  if (amount < nextBid(a)) throw new Refusal(`At least ${nextBid(a).toLocaleString()}`, 409);
  if ((ps.marks || 0) < amount) throw new Refusal("Not enough marks", 402);
  const tok = randomHex(8), guard = holds(a.id, tok), stmts = [
    db.prepare(
      `UPDATE auctions SET bid = ?2, bidder_id = ?3, bids = bids + 1, token = ?4, ends_at = MAX(ends_at, ?5 + ?6)
       WHERE id = ?1 AND settled = 0 AND ends_at > ?5 AND bid IS ?7 AND bidder_id IS ?8
         AND (SELECT marks FROM player_state WHERE player_id = ?3) >= ?2`
    ).bind(a.id, amount, pid, tok, now, AUCTION.snipe, a.bid, a.bidder_id),
    db.prepare(`UPDATE player_state SET marks = marks - ?2 WHERE player_id = ?1 AND ${guard}`).bind(pid, amount),
  ];
  if (a.bidder_id != null) {
    stmts.push(db.prepare(`UPDATE player_state SET marks = marks + ?2 WHERE player_id = ?1 AND ${guard}`).bind(a.bidder_id, a.bid));
    stmts.push(note(db, a.bidder_id, "outbid", a, amount, now, guard));
  }
  await db.batch(stmts);
  const won = await db.prepare(`SELECT ends_at FROM auctions WHERE id = ?1 AND token = ?2`).bind(a.id, tok).first();
  if (!won) throw new Refusal("Someone bid first. Have another look", 409);
  return { auctionId: a.id, bid: amount, endsAt: won.ends_at };
}

export async function withdraw(db, pid, body, { now }) {
  if (!idOk(body.auctionId)) throw new Refusal("Which one?");
  const a = await db.prepare(`SELECT * FROM auctions WHERE id = ?1 AND seller_id = ?2`).bind(body.auctionId, pid).first();
  if (!a || a.settled) throw new Refusal("That one is done", 409);
  if (a.bidder_id != null) throw new Refusal("Someone has bid. It stays up", 409);
  const tok = randomHex(8), guard = holds(a.id, tok);
  await db.batch([
    db.prepare(`UPDATE auctions SET settled = 1, token = ?3 WHERE id = ?1 AND seller_id = ?2 AND settled = 0 AND bidder_id IS NULL`).bind(a.id, pid, tok),
    giveCoin(db, pid, JSON.parse(a.coin), now, guard),
  ]);
  const ok = await db.prepare(`SELECT 1 FROM auctions WHERE id = ?1 AND token = ?2`).bind(a.id, tok).first();
  if (!ok) throw new Refusal("Someone has bid. It stays up", 409);
  return { auctionId: a.id, coinId: JSON.parse(a.coin).id };
}

/* What happened while you were away, once (loadState). */
export async function takeNotes(db, pid) {
  const rows = (await db.prepare(
    `DELETE FROM auction_notes WHERE player_id = ?1 RETURNING kind, auction_id, amount, coin`).bind(pid).all()).results || [];
  return rows.map(r => ({ kind: r.kind, auctionId: r.auction_id, amount: r.amount, coin: r.coin ? bare(JSON.parse(r.coin)) : null }));
}
