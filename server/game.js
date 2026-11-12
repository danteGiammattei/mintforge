/* ══════════════════════════════════════════════════════════════════════
 *  game — every action that makes or destroys value
 *  ────────────────────────────────────────────────────────────────────
 *  The client asks; this decides. It never accepts a coin, a rarity, a
 *  balance or a roll from the request — only which of the player's own
 *  things to act on, and (for sealing) the strokes they drew.
 *
 *  D1 has no interactive transactions, so each action is ordered to be
 *  safe under a concurrent copy of itself:
 *    · anything consumed is removed first with DELETE … RETURNING, and
 *      the action only proceeds on the rows it actually got;
 *    · counters move with SQL arithmetic (xp = xp + n), never
 *      read-modify-write;
 *    · the pot is read-modify-write, so it is written compare-and-swap
 *      and retried.
 *
 *  A request may carry an `opId`. The first answer to an opId is stored
 *  and any repeat gets that answer back without the action running
 *  again — which is what makes it safe for the client to retry a request
 *  whose reply it never received.
 * ══════════════════════════════════════════════════════════════════════ */

import { analyse, rollScroll, measure, TRAITS } from "../shared/sigil.js";
import { SCRIBE, CHESTS, XP, FORGE, ENGRAVE } from "../shared/tuning.js";
import {
  levelOf, offerScroll, leanOf, rollCoin, nextGift,
  xpForSeal, xpForOffer, xpForBrush,
  resolveToss, resolveCrucible, resolveRoulette, resolvePlinko, forgeCost,
  inkFor, wellOf, dailyGift, cleanName, nameAllowed, localDay, clampTz,
} from "../shared/economy.js";
import { mkCoin, coinValue, deriveRarity } from "../src/lib/coin.js";
import { FRAMES, PREMIUM_TITLES, BRUSH_UPS } from "../src/lib/data.js";
import { Refusal, randomHex, cryptoRand } from "./http.js";
import { loadState, parseList, parseObj, coinOut } from "./state.js";

const u32 = rand => Math.floor(rand() * 4294967296) >>> 0;
const bump = key => `json_set(stats, '$.${key}', COALESCE(json_extract(stats, '$.${key}'), 0) + 1)`;
const idOk = v => typeof v === "string" && v.length > 0 && v.length <= 80;

/* ─── seal ────────────────────────────────────────────────────────── */

export function cleanStrokes(raw) {
  if (!Array.isArray(raw) || !raw.length) throw new Refusal("Nothing to seal");
  if (raw.length > SCRIBE.maxStrokes) throw new Refusal("Too many strokes");
  const { w, h } = SCRIBE.sheet;
  let points = 0;
  const out = [];
  for (const s of raw) {
    if (!Array.isArray(s)) throw new Refusal("Malformed stroke");
    const stroke = [];
    for (const p of s) {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.t)) throw new Refusal("Malformed stroke");
      if (p.x < -1 || p.y < -1 || p.x > w + 1 || p.y > h + 1) throw new Refusal("Ink off the sheet");
      stroke.push({ x: p.x, y: p.y, t: p.t });
      if (++points > SCRIBE.maxPoints) throw new Refusal("Too many points");
    }
    if (stroke.length) out.push(stroke);
  }
  return out;
}

/* The salt moves with every seal and is never sent anywhere. */
function sealSalt(nonce, count) {
  let h = (nonce ^ Math.imul(count + 1, 0x9e3779b1)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}

async function seal(db, pid, body, { now, rand }) {
  const strokes = cleanStrokes(body.strokes);
  const a = analyse(strokes, SCRIBE.sheet);
  if (!a) throw new Refusal("Nothing to seal");

  const ps = await db.prepare(
    `SELECT last_seal_at, seal_nonce, seal_count, recent_sigs, well_level FROM player_state WHERE player_id = ?1`
  ).bind(pid).first();
  if (a.ink > inkFor(ps.well_level) * SCRIBE.inkSlack) throw new Refusal("More ink than your well holds");
  if (now - ps.last_seal_at < SCRIBE.cooldownMs) throw new Refusal("The wax is still warm", 429);
  const held = await db.prepare(`SELECT COUNT(*) AS n FROM scrolls WHERE player_id = ?1`).bind(pid).first();
  if (held.n >= SCRIBE.scrollCap) throw new Refusal("Your satchel is full", 409);

  // claim the cooldown; a concurrent seal loses here and stops
  const claim = await db.prepare(
    `UPDATE player_state SET last_seal_at = ?2 WHERE player_id = ?1 AND last_seal_at = ?3`
  ).bind(pid, now, ps.last_seal_at).run();
  if (!claim.meta.changes) throw new Refusal("The wax is still warm", 429);

  const nonce = ps.seal_nonce || (u32(rand) || 1);
  const recent = parseList(ps.recent_sigs);
  const r = rollScroll(a, recent, sealSalt(nonce, ps.seal_count));
  const hint = r.bumped.length ? r.bumped[Math.min(r.bumped.length - 1, Math.floor(rand() * r.bumped.length))] : null;
  const id = "s_" + randomHex(8);
  const xp = xpForSeal(r.rarity);
  const sigs = [r.signature, ...recent].slice(0, SCRIBE.recentSigs);

  await db.batch([
    db.prepare(`INSERT INTO scrolls (id, player_id, rarity, seed, hint, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
      .bind(id, pid, r.rarity, r.seed, hint, now),
    db.prepare(
      `INSERT INTO seal_log (player_id, created_at, rarity, traits, bumped, familiar, well_level, m) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    ).bind(pid, now, r.rarity, r.traits.join(","), r.bumped.join(","), r.familiar ? 1 : 0, ps.well_level || 0,
           JSON.stringify(Object.fromEntries(Object.entries(measure(a)).map(([k, v]) => [k, Math.round(v * 10000) / 10000])))),
    db.prepare(
      `UPDATE player_state SET xp = xp + ?2, seal_nonce = ?3, seal_count = seal_count + 1, recent_sigs = ?4,
              stats = ${bump("sealed")} WHERE player_id = ?1`
    ).bind(pid, xp, nonce, JSON.stringify(sigs)),
  ]);
  return { scroll: { id, rarity: r.rarity, seed: r.seed }, familiar: r.familiar, xp };
}

/* ─── offer ───────────────────────────────────────────────────────── */

async function offerOne(db, pid, scrollId, { now, rand }) {
  const sc = await db.prepare(
    `DELETE FROM scrolls WHERE id = ?1 AND player_id = ?2 RETURNING rarity, hint`
  ).bind(scrollId, pid).first();
  if (!sc) return null;

  let pot, chest;
  for (let attempt = 0; ; attempt++) {
    const ps = await db.prepare(
      `SELECT favour, chest_tier, chest_cost, pot_best, chests_given FROM player_state WHERE player_id = ?1`
    ).bind(pid).first();
    ({ pot, chest } = offerScroll(
      { favour: ps.favour, tier: ps.chest_tier, cost: ps.chest_cost, best: ps.pot_best, chests: ps.chests_given },
      sc.rarity, rand));
    const w = await db.prepare(
      `UPDATE player_state SET favour = ?2, chest_tier = ?3, chest_cost = ?4, pot_best = ?5, chests_given = ?6
        WHERE player_id = ?1 AND favour = ?7 AND chest_cost = ?8 AND chests_given = ?9`
    ).bind(pid, pot.favour, pot.tier, pot.cost, pot.best, pot.chests, ps.favour, ps.chest_cost, ps.chests_given).run();
    if (w.meta.changes) break;
    if (attempt >= 4) throw new Refusal("The door is busy. Try again.", 503);
  }

  const xp = xpForOffer(sc.rarity);
  const stmts = [db.prepare(
    `UPDATE player_state SET xp = xp + ?2, stats = ${bump("offered")} WHERE player_id = ?1`).bind(pid, xp)];
  let given = null;
  if (chest != null) {
    given = { id: "k_" + randomHex(8), tier: chest };
    stmts.push(
      db.prepare(`INSERT INTO chests (id, player_id, tier, created_at) VALUES (?1, ?2, ?3, ?4)`).bind(given.id, pid, chest, now),
      db.prepare(`UPDATE player_state SET stats = ${bump("chests")} WHERE player_id = ?1`).bind(pid),
    );
  }
  await db.batch(stmts);

  // He only ever praises, and only what actually lifted the scroll.
  const hint = sc.hint && TRAITS[sc.hint] && rand() < CHESTS.hintChance ? TRAITS[sc.hint].hint : null;
  return { rarity: sc.rarity, hint, lean: leanOf(pot), chest: given, xp };
}

/* One scroll (`scrollId`) or a handful at once (`scrollIds`). A handful
 * is exactly the same as offering them one after another, in order —
 * each fills the pot, each can release a chest, each can earn a remark —
 * so offering together is a convenience and never a better or worse deal. */
async function offer(db, pid, body, ctx) {
  const ids = Array.isArray(body.scrollIds) ? [...new Set(body.scrollIds.filter(idOk))].slice(0, SCRIBE.scrollCap)
            : idOk(body.scrollId) ? [body.scrollId] : [];
  if (!ids.length) throw new Refusal("Which scroll?");
  const done = [];
  for (const id of ids) { const r = await offerOne(db, pid, id, ctx); if (r) done.push(r); }
  if (!done.length) throw new Refusal("That scroll is gone", 404);
  const last = done[done.length - 1];
  const hints = [...new Set(done.map(r => r.hint).filter(Boolean))];
  const chests = done.map(r => r.chest).filter(Boolean);
  return {
    offered: done.length, rarity: Math.max(...done.map(r => r.rarity)),
    hint: hints[0] || null, hints, lean: last.lean,
    chest: chests[0] || null, chests, xp: done.reduce((s, r) => s + r.xp, 0),
  };
}

/* ─── visit: he may have something for you ────────────────────────── */

const VISIT_GAP_MS = 5 * 60e3;       // how often a visit counts toward anything

function describeReward(reward) {
  if (reward.type === "chest") return { type: "chest", tier: reward.tier, name: CHESTS.names[reward.tier] + " CHEST" };
  if (reward.type === "brush") return { type: "brush", level: reward.level, name: BRUSH_UPS[reward.level].label.toUpperCase() };
  if (reward.type === "title") return { type: "title", id: reward.id, name: PREMIUM_TITLES.find(t => t.id === reward.id).label.toUpperCase() };
  if (reward.type === "frame") return { type: "frame", id: reward.id, name: FRAMES[reward.id].lbl.toUpperCase() };
  return { type: "marks", n: reward.n, name: reward.n + " MARKS" };
}

async function visit(db, pid, _body, { now, tz }) {
  let ps = await db.prepare(
    `SELECT xp, stats, gifts, favour, chest_cost, journal FROM player_state WHERE player_id = ?1`).bind(pid).first();
  let stats = parseObj(ps.stats);
  if (now - (stats.lastVisitAt || 0) >= VISIT_GAP_MS) {
    await db.prepare(
      `UPDATE player_state SET stats = json_set(${bump("visits")}, '$.lastVisitAt', ?2) WHERE player_id = ?1`
    ).bind(pid, now).run();
    stats = { ...stats, visits: (stats.visits || 0) + 1 };
  }
  const lean = leanOf({ favour: ps.favour, cost: ps.chest_cost });
  const given = parseList(ps.gifts);
  const gift = nextGift(stats, levelOf(ps.xp), given, parseObj(ps.journal));
  if (!gift) return { gift: await daily(db, pid, stats, ps.stats, now, tz), lean };

  // claim it: the list only grows from the value we read
  const claim = await db.prepare(
    `UPDATE player_state SET gifts = ?2 WHERE player_id = ?1 AND gifts = ?3`
  ).bind(pid, JSON.stringify([...given, gift.id]), ps.gifts).run();
  if (!claim.meta.changes) return { gift: null, lean };

  // the welcome chest is also day one of the daily visits
  if (gift.id === "welcome") await db.prepare(
    `UPDATE player_state SET stats = json_set(stats, '$.daily', json(?2)) WHERE player_id = ?1`
  ).bind(pid, JSON.stringify({ at: now, day: localDay(now, tz), tz: clampTz(tz), streak: 1 })).run();

  const r = gift.reward, out = describeReward(r);
  if (r.type === "chest") {
    out.id = "k_" + randomHex(8);
    await db.prepare(`INSERT INTO chests (id, player_id, tier, created_at) VALUES (?1, ?2, ?3, ?4)`).bind(out.id, pid, r.tier, now).run();
  } else if (r.type === "brush") {
    await db.prepare(`UPDATE player_state SET brush_level = MAX(brush_level, ?2) WHERE player_id = ?1`).bind(pid, r.level).run();
  } else if (r.type === "marks") {
    await db.prepare(`UPDATE player_state SET marks = marks + ?2 WHERE player_id = ?1`).bind(pid, r.n).run();
  } else {
    const col = r.type === "title" ? "owned_titles" : "owned_frames";
    const row = await db.prepare(`SELECT ${col} AS v FROM player_state WHERE player_id = ?1`).bind(pid).first();
    const owned = parseList(row.v);
    if (!owned.includes(r.id)) owned.push(r.id);
    await db.prepare(`UPDATE player_state SET ${col} = ?2 WHERE player_id = ?1`).bind(pid, JSON.stringify(owned)).run();
  }
  return { gift: out, lean };
}

/* Nothing owed from the milestones: is today's visit still unclaimed? */
async function daily(db, pid, stats, statsText, now, tz) {
  const d = dailyGift(stats.daily, now, tz);
  if (!d) return null;
  // claim it against the stats we read, so two tabs cannot both collect
  const claim = await db.prepare(
    `UPDATE player_state SET stats = json_set(stats, '$.daily', json(?2)) WHERE player_id = ?1 AND stats = ?3`
  ).bind(pid, JSON.stringify(d.daily), statsText).run();
  if (!claim.meta.changes) {
    const fresh = await db.prepare(`SELECT stats FROM player_state WHERE player_id = ?1`).bind(pid).first();
    const again = dailyGift(parseObj(fresh.stats).daily, now, tz);
    if (!again) return null;
    const retry = await db.prepare(
      `UPDATE player_state SET stats = json_set(stats, '$.daily', json(?2)) WHERE player_id = ?1 AND stats = ?3`
    ).bind(pid, JSON.stringify(again.daily), fresh.stats).run();
    if (!retry.meta.changes) return null;
  }
  const out = { ...describeReward(d.reward), daily: true, streak: d.daily.streak };
  if (d.reward.type === "chest") {
    out.id = "k_" + randomHex(8);
    await db.prepare(`INSERT INTO chests (id, player_id, tier, created_at) VALUES (?1, ?2, ?3, ?4)`).bind(out.id, pid, d.reward.tier, now).run();
  } else {
    await db.prepare(`UPDATE player_state SET marks = marks + ?2 WHERE player_id = ?1`).bind(pid, d.reward.n).run();
  }
  return out;
}

/* ─── the journal ─────────────────────────────────────────────────────
 * A statement that records one coin as found. Kinds only ever count up. */
function journalStmt(db, pid, c) {
  const k = `$.c."${c.metalIdx}:${c.rarity ?? 0}"`;
  const value = coinValue(hydrate({ seed: c.seed, metal_idx: c.metalIdx, shiny: c.shiny ? 1 : 0, rarity: c.rarity }));
  return db.prepare(
    `UPDATE player_state SET journal = json_set(
        CASE WHEN json_type(journal, '$.c') IS NULL THEN json_set(journal, '$.c', json('{}')) ELSE journal END,
        '${k}', COALESCE(json_extract(journal, '${k}'), 0) + 1,
        '$.shiny', COALESCE(json_extract(journal, '$.shiny'), 0) + ?2,
        '$.best', MAX(COALESCE(json_extract(journal, '$.best'), 0), ?3))
      WHERE player_id = ?1`
  ).bind(pid, c.shiny ? 1 : 0, value);
}

/* ─── chest → dusty coin → vault ──────────────────────────────────── */

async function open(db, pid, body, { now, rand }) {
  if (!idOk(body.chestId)) throw new Refusal("Which chest?");
  const ch = await db.prepare(
    `DELETE FROM chests WHERE id = ?1 AND player_id = ?2 RETURNING tier`).bind(body.chestId, pid).first();
  if (!ch) throw new Refusal("That chest is gone", 404);
  const ps = await db.prepare(`SELECT brush_level FROM player_state WHERE player_id = ?1`).bind(pid).first();
  const c = rollCoin(ch.tier, ps.brush_level || 0, rand);
  const id = "c_" + randomHex(8);
  await db.batch([
    db.prepare(
      `INSERT INTO coins (id, player_id, seed, metal_idx, shiny, locked, rarity, acquired_at, dusty)
       VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, 1)`
    ).bind(id, pid, c.seed, c.metalIdx, c.shiny ? 1 : 0, c.rarity, now),
    db.prepare(`UPDATE player_state SET xp = xp + ?2 WHERE player_id = ?1`).bind(pid, XP.open),
  ]);
  return { tier: ch.tier, coin: { id, seed: c.seed, metalIdx: c.metalIdx, shiny: c.shiny, locked: false, rarity: c.rarity }, xp: XP.open };
}

async function brush(db, pid, body, { now }) {
  if (!idOk(body.coinId)) throw new Refusal("Which coin?");
  const c = await db.prepare(
    `UPDATE coins SET dusty = 0, acquired_at = ?3 WHERE id = ?1 AND player_id = ?2 AND dusty = 1
     RETURNING id, seed, metal_idx, shiny, locked, rarity`
  ).bind(body.coinId, pid, now).first();
  if (!c) throw new Refusal("That coin is already clean", 404);
  const xp = xpForBrush({ rarity: c.rarity, metalIdx: c.metal_idx, shiny: !!c.shiny });
  await db.batch([
    db.prepare(`UPDATE player_state SET xp = xp + ?2, stats = ${bump("brushed")} WHERE player_id = ?1`).bind(pid, xp),
    journalStmt(db, pid, { seed: c.seed, metalIdx: c.metal_idx, shiny: !!c.shiny, rarity: c.rarity }),
  ]);
  return { coin: coinOut(c), xp };
}

/* ─── sell ────────────────────────────────────────────────────────── */

const hydrate = r => {
  const c = mkCoin(r.seed >>> 0, 1, r.metal_idx);
  c.shiny = !!r.shiny;
  if (r.rarity != null) c.rarity = r.rarity;
  return c;
};
const placeholders = (n, from) => Array.from({ length: n }, (_, i) => `?${i + from}`).join(",");

async function sell(db, pid, body) {
  const ids = [...new Set((Array.isArray(body.coinIds) ? body.coinIds : []).filter(idOk))].slice(0, 200);
  if (!ids.length) throw new Refusal("Nothing to sell");
  // locked coins and dusty ones are simply not matched, so not sold
  const gone = await db.prepare(
    `DELETE FROM coins WHERE player_id = ?1 AND locked = 0 AND dusty = 0 AND id IN (${placeholders(ids.length, 2)})
     RETURNING id, seed, metal_idx, shiny, rarity`
  ).bind(pid, ...ids).all();
  const rows = gone.results || [];
  if (!rows.length) throw new Refusal("None of those can be sold", 409);
  const marks = rows.reduce((s, r) => s + coinValue(hydrate(r)), 0);
  await db.prepare(`UPDATE player_state SET marks = marks + ?2 WHERE player_id = ?1`).bind(pid, marks).run();
  return { sold: rows.map(r => r.id), marks };
}

/* ─── the forge ───────────────────────────────────────────────────────
 * Marks for a chance at a shine. The marks leave first, and only if the
 * balance covers them; the coin is never at risk. */
async function forge(db, pid, body, { rand }) {
  if (!idOk(body.coinId)) throw new Refusal("Which coin?");
  const c = await db.prepare(
    `SELECT id, seed, metal_idx, shiny, rarity FROM coins WHERE id = ?1 AND player_id = ?2 AND dusty = 0`
  ).bind(body.coinId, pid).first();
  if (!c) throw new Refusal("That coin is gone", 404);
  if (c.shiny) throw new Refusal("It already shines", 409);

  const cost = forgeCost(coinValue(hydrate({ ...c, shiny: 0 })));
  const paid = await db.prepare(
    `UPDATE player_state SET marks = marks - ?2 WHERE player_id = ?1 AND marks >= ?2`).bind(pid, cost).run();
  if (!paid.meta.changes) throw new Refusal("Not enough marks", 402);

  const shiny = rand() < FORGE.shinyChance;
  if (shiny) {
    const set = await db.prepare(
      `UPDATE coins SET shiny = 1 WHERE id = ?1 AND player_id = ?2 AND shiny = 0 AND dusty = 0`).bind(c.id, pid).run();
    if (!set.meta.changes) {
      // the coin was sold, staked or shined from under us: give the marks back
      await db.prepare(`UPDATE player_state SET marks = marks + ?2 WHERE player_id = ?1`).bind(pid, cost).run();
      throw new Refusal("That coin is gone", 409);
    }
  }
  if (shiny) await db.prepare(
    `UPDATE player_state SET journal = json_set(journal, '$.shiny', COALESCE(json_extract(journal, '$.shiny'), 0) + 1) WHERE player_id = ?1`).bind(pid).run();
  const xp = XP.forge.strike + (shiny ? XP.forge.shine : 0);
  const struck = bump("struck");
  const stats = shiny ? `json_set(${struck}, '$.shined', COALESCE(json_extract(stats, '$.shined'), 0) + 1)` : struck;
  await db.prepare(`UPDATE player_state SET xp = xp + ?2, stats = ${stats} WHERE player_id = ?1`).bind(pid, xp).run();
  return { shiny, cost, xp };
}

/* A name cut into the coin. Costs marks; clearing one is free. The name
 * goes wherever the coin goes. */
async function engrave(db, pid, body) {
  if (!idOk(body.coinId)) throw new Refusal("Which coin?");
  const name = cleanName(body.name);
  if (name === null) throw new Refusal(`A name is up to ${ENGRAVE.maxLength} letters, digits or spaces`);
  if (name && !nameAllowed(name)) throw new Refusal("The engraver will not cut that");
  const c = await db.prepare(
    `SELECT id, nickname FROM coins WHERE id = ?1 AND player_id = ?2 AND dusty = 0`).bind(body.coinId, pid).first();
  if (!c) throw new Refusal("That coin is gone", 404);
  if ((c.nickname || "") === name) throw new Refusal(name ? "It already bears that name" : "It has no name to remove", 409);
  const cost = name ? ENGRAVE.cost : 0;
  if (cost) {
    const paid = await db.prepare(
      `UPDATE player_state SET marks = marks - ?2 WHERE player_id = ?1 AND marks >= ?2`).bind(pid, cost).run();
    if (!paid.meta.changes) throw new Refusal("Not enough marks", 402);
  }
  await db.prepare(`UPDATE coins SET nickname = ?3 WHERE id = ?1 AND player_id = ?2`).bind(c.id, pid, name || null).run();
  return { name, cost };
}

/* ─── the desk: a deeper inkwell ──────────────────────────────────────
 * Bought in order, with marks. The level only moves if it is the one we
 * read and the balance covers the price, in a single statement. */
async function well(db, pid) {
  const ps = await db.prepare(`SELECT well_level FROM player_state WHERE player_id = ?1`).bind(pid).first();
  const next = ps.well_level + 1;
  if (next >= SCRIBE.wells.length) throw new Refusal("There is no deeper well", 409);
  const w = wellOf(next);
  const paid = await db.prepare(
    `UPDATE player_state SET marks = marks - ?2, well_level = ?3 WHERE player_id = ?1 AND well_level = ?4 AND marks >= ?2`
  ).bind(pid, w.cost, next, ps.well_level).run();
  if (!paid.meta.changes) throw new Refusal("Not enough marks", 402);
  return { level: next, name: w.name, ink: w.ink, cost: w.cost };
}

/* ─── the tavern ──────────────────────────────────────────────────── */

const GAMES = {
  toss:     { coins: 1, resolve: resolveToss,     winXp: XP.gambleWin,   lossXp: XP.gambleLoss },
  crucible: { coins: 3, resolve: resolveCrucible, winXp: XP.gambleWin,   lossXp: XP.gambleLoss, sameMetal: true },
  roulette: { coins: 1, resolve: resolveRoulette, winXp: XP.rouletteWin, lossXp: XP.rouletteLoss },
  plinko:   { coins: 1, resolve: resolvePlinko,   winXp: XP.rouletteWin, lossXp: XP.rouletteLoss },
};

async function gamble(db, pid, body, { now, rand }) {
  const g = GAMES[body.game];
  if (!g) throw new Refusal("No such game");
  const ids = [...new Set((Array.isArray(body.coinIds) ? body.coinIds : []).filter(idOk))];
  if (ids.length !== g.coins) throw new Refusal(`Stake ${g.coins} coin${g.coins > 1 ? "s" : ""}`);

  const found = await db.prepare(
    `SELECT id, metal_idx FROM coins WHERE player_id = ?1 AND locked = 0 AND dusty = 0 AND id IN (${placeholders(ids.length, 2)})`
  ).bind(pid, ...ids).all();
  const staked = ids.map(id => (found.results || []).find(r => r.id === id));
  if (staked.some(r => !r)) throw new Refusal("A staked coin is locked or gone", 409);
  const metal = staked[0].metal_idx;
  if (g.sameMetal && staked.some(r => r.metal_idx !== metal)) throw new Refusal("All three must be the same metal");

  const res = g.resolve(metal, rand);
  const lost = res.lose.map(i => ids[i]);
  const del = await db.prepare(
    `DELETE FROM coins WHERE player_id = ?1 AND locked = 0 AND dusty = 0 AND id IN (${placeholders(lost.length, 2)})`
  ).bind(pid, ...lost).run();
  // if someone else got to a staked coin first, nothing is minted
  if (del.meta.changes !== lost.length) throw new Refusal("A staked coin is locked or gone", 409);

  const minted = res.make.map(m => {
    const seed = u32(rand);
    return { id: "c_" + randomHex(8), seed, metalIdx: m, shiny: false, locked: false, rarity: deriveRarity(seed) };
  });
  const xp = res.won ? g.winXp : g.lossXp;
  await db.batch([
    ...minted.map(c => journalStmt(db, pid, c)),
    ...minted.map(c => db.prepare(
      `INSERT INTO coins (id, player_id, seed, metal_idx, shiny, locked, rarity, acquired_at, dusty)
       VALUES (?1, ?2, ?3, ?4, 0, 0, ?5, ?6, 0)`).bind(c.id, pid, c.seed, c.metalIdx, c.rarity, now)),
    db.prepare(`UPDATE player_state SET xp = xp + ?2, stats = ${bump("gambles")} WHERE player_id = ?1`).bind(pid, xp),
  ]);
  return {
    game: body.game, won: res.won, outcome: res.outcome, sector: res.sector ?? null, slot: res.slot ?? null, path: res.path ?? null,
    lost, kept: ids.filter(id => !lost.includes(id)), minted, xp,
  };
}

/* ─── dispatch ────────────────────────────────────────────────────── */

const ACTIONS = { seal, offer, visit, open, brush, sell, gamble, forge, engrave, well };

export async function act(db, pid, body, { now = Date.now(), rand = cryptoRand, tz = 0 } = {}) {
  const fn = body && typeof body.action === "string" && Object.hasOwn(ACTIONS, body.action) ? ACTIONS[body.action] : null;
  if (!fn) throw new Refusal("Unknown action");
  const opId = typeof body.opId === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(body.opId) ? body.opId : null;

  if (opId) {
    const claim = await db.prepare(
      `INSERT OR IGNORE INTO action_log (player_id, op_id, response, created_at) VALUES (?1, ?2, '', ?3)`
    ).bind(pid, opId, now).run();
    if (!claim.meta.changes) {
      const prev = await db.prepare(
        `SELECT response FROM action_log WHERE player_id = ?1 AND op_id = ?2`).bind(pid, opId).first();
      if (!prev?.response) throw new Refusal("Still working on that", 409);
      return { result: JSON.parse(prev.response), state: await loadState(db, pid, now, tz), replayed: true };
    }
  }

  let result;
  try {
    result = await fn(db, pid, body, { now, rand, tz });
  } catch (e) {
    // a refused action left nothing behind, so the op id is free to try again
    if (opId) await db.prepare(`DELETE FROM action_log WHERE player_id = ?1 AND op_id = ?2`).bind(pid, opId).run();
    throw e;
  }
  if (opId) {
    await db.prepare(
      `UPDATE action_log SET response = ?3 WHERE player_id = ?1 AND op_id = ?2`).bind(pid, opId, JSON.stringify(result)).run();
    if (rand() < 0.02) await db.prepare(`DELETE FROM action_log WHERE created_at < ?1`).bind(now - 2 * 86400e3).run();
  }
  return { result, state: await loadState(db, pid, now, tz) };
}
