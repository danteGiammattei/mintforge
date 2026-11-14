/* ══════════════════════════════════════════════════════════════════════
 *  The goblin's stall, on the server
 *  ────────────────────────────────────────────────────────────────────
 *  stall  today's five slots (shared/stall.js) and which are sold
 *  buy    one slot. Its row in stall_buys is claimed first, so a slot
 *         cannot sell twice; then the marks are taken, only if they are
 *         there (if not, the claim is let go); then the ware is handed
 *         over: a chest to the satchel, a coin to the satchel dusty (to
 *         be brushed like any other), a title or banner to what you own.
 *  The day is the player's own local day, so the stall turns over at
 *  their midnight.
 * ══════════════════════════════════════════════════════════════════════ */

import { rollStall } from "../shared/stall.js";
import { localDay } from "../shared/economy.js";
import { Refusal, randomHex } from "./http.js";
import { parseList, parseObj } from "./state.js";

async function today(db, pid, now, tz) {
  const day = localDay(now, tz);
  const ps = await db.prepare(`SELECT journal, owned_titles, owned_frames FROM player_state WHERE player_id = ?1`).bind(pid).first();
  const wares = rollStall(pid, day, parseObj(ps.journal), parseList(ps.owned_titles), parseList(ps.owned_frames));
  const sold = ((await db.prepare(`SELECT slot FROM stall_buys WHERE player_id = ?1 AND day = ?2`).bind(pid, day).all()).results || []).map(r => r.slot);
  return { day, wares, sold };
}

export async function stall(db, pid, body, { now, tz }) {
  const t = await today(db, pid, now, tz);
  return { day: t.day, wares: t.wares.map((w, i) => ({ ...w, sold: t.sold.includes(i) })) };
}

export async function buy(db, pid, body, { now, tz }) {
  const slot = body?.slot;
  if (!Number.isInteger(slot) || slot < 0 || slot > 4) throw new Refusal("Which ware?");
  const t = await today(db, pid, now, tz);
  // the price the player saw must be the price today: a stall that turned
  // over at midnight while they looked is not the stall they meant
  if (body.day !== undefined && body.day !== t.day) throw new Refusal("He has packed those away. New wares are out", 409);
  const w = t.wares[slot];
  const claim = await db.prepare(
    `INSERT OR IGNORE INTO stall_buys (player_id, day, slot, price, item, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  ).bind(pid, t.day, slot, w.price, JSON.stringify(w), now).run();
  if (!claim.meta.changes) throw new Refusal("That one is sold", 409);
  const paid = await db.prepare(
    `UPDATE player_state SET marks = marks - ?2 WHERE player_id = ?1 AND marks >= ?2`).bind(pid, w.price).run();
  if (!paid.meta.changes) {
    await db.prepare(`DELETE FROM stall_buys WHERE player_id = ?1 AND day = ?2 AND slot = ?3`).bind(pid, t.day, slot).run();
    throw new Refusal("Not enough marks", 402);
  }

  const out = { slot, ware: w, price: w.price };
  if (w.kind === "chest") {
    out.chestId = "k_" + randomHex(8);
    await db.prepare(`INSERT INTO chests (id, player_id, tier, created_at) VALUES (?1, ?2, ?3, ?4)`).bind(out.chestId, pid, w.tier, now).run();
  } else if (w.kind === "coin") {
    out.coinId = "c_" + randomHex(8);
    await db.prepare(
      `INSERT INTO coins (id, player_id, seed, metal_idx, shiny, locked, rarity, acquired_at, dusty) VALUES (?1, ?2, ?3, ?4, 0, 0, ?5, ?6, 1)`
    ).bind(out.coinId, pid, w.coin.seed, w.coin.metalIdx, w.coin.rarity, now).run();
  } else {
    const col = w.kind === "title" ? "owned_titles" : "owned_frames";
    const row = await db.prepare(`SELECT ${col} AS v FROM player_state WHERE player_id = ?1`).bind(pid).first();
    const owned = parseList(row.v);
    if (!owned.includes(w.id)) owned.push(w.id);
    await db.prepare(`UPDATE player_state SET ${col} = ?2 WHERE player_id = ?1`).bind(pid, JSON.stringify(owned)).run();
  }
  return out;
}

