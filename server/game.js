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

import { analyse, rollScroll, measure, TRAITS, LIFTS, likeness } from "../shared/sigil.js";
import { SCRIBE, CHESTS, XP, FORGE, ENGRAVE, MATERIAL, ASTRAL, SECRET, FUSE, STREAK } from "../shared/tuning.js";
import {
  levelOf, offerScroll, streakAfter, leanOf, rollCoin, nextGift,
  xpForSeal, xpForOffer, xpForBrush,
  resolveToss, resolveRoulette, resolvePlinko, forgeCost, restrikeCost,
  inkFor, wellOf, dailyGift, cleanName, nameAllowed, localDay, clampTz, placeAstral, MAX_RARITY,
} from "../shared/economy.js";
import { heldSigns } from "./signs.js";
import { TOMES, pageOf, tomeFromChest, cravedPage } from "../shared/tomes.js";
import { eventOn, eventChest, eventChestHolds, eventById, SEASONS, RELICS, relicOf } from "../shared/events.js";
import { mkCoin, coinValue, deriveRarity } from "../src/lib/coin.js";
import { FRAMES, PREMIUM_TITLES } from "../src/lib/data.js";
import { Refusal, randomHex, cryptoRand } from "./http.js";
import { loadState, parseList, parseObj, coinOut, tomesOf } from "./state.js";
import { hydrate, ranks } from "./ranks.js";
import { stall, buy } from "./stall.js";
import { auctions, list, bid, withdraw } from "./auction.js";
import { board, post, unpost, report } from "./board.js";
import { LISTS, listHash } from "../shared/listhash.js";

const SECRET_TITLES = { faultless: "faultless" };
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

async function seal(db, pid, body, { now, rand, tz }) {
  const strokes = cleanStrokes(body.strokes);
  const a = analyse(strokes, SCRIBE.sheet);
  if (!a) throw new Refusal("Nothing to seal");

  const [ps, held] = await Promise.all([
    db.prepare(`SELECT last_seal_at, seal_nonce, seal_count, recent_sigs, well_level, tomes, owned_titles FROM player_state WHERE player_id = ?1`).bind(pid).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM scrolls WHERE player_id = ?1`).bind(pid).first(),
  ]);
  if (a.ink > inkFor(ps.well_level) * SCRIBE.inkSlack) throw new Refusal("More ink than your well holds");
  if (now - ps.last_seal_at < SCRIBE.cooldownMs) throw new Refusal("The wax is still warm", 429);
  if (held.n >= SCRIBE.scrollCap) throw new Refusal("Your satchel is full", 409);
  // every scroll is a copy of a page of one of your tomes
  const owned = tomesOf(ps.tomes);
  const page = pageOf(String(body.tome || ""), String(body.page || ""), owned);
  if (!page) throw new Refusal("Choose a page of your tome to copy");
  const like = likeness(strokes, page);

  // claim the cooldown; a concurrent seal loses here and stops
  const claim = await db.prepare(
    `UPDATE player_state SET last_seal_at = ?2 WHERE player_id = ?1 AND last_seal_at = ?3`
  ).bind(pid, now, ps.last_seal_at).run();
  if (!claim.meta.changes) throw new Refusal("The wax is still warm", 429);

  const nonce = ps.seal_nonce || (u32(rand) || 1);
  const recent = parseList(ps.recent_sigs);
  const r = rollScroll(a, recent, sealSalt(nonce, ps.seal_count), {
    craved: (w => !!w && w.tome === body.tome && w.page === page.id)(cravedPage(localDay(now, tz), pid, owned)),
    // the client stamps its own strokes, so never believe more drawing
    // time than has really passed since the last seal
    maxMs: ps.last_seal_at ? now - ps.last_seal_at + 1000 : Infinity,
    page, likeness: like,
  });
  const hint = r.bumped.length ? r.bumped[Math.min(r.bumped.length - 1, Math.floor(rand() * r.bumped.length))] : null;
  const id = "s_" + randomHex(8);
  const xp = xpForSeal(r.rarity);
  const sigs = [r.signature, ...recent].slice(0, SCRIBE.recentSigs);
  // a secret title for a copy he can't fault: 100% likeness, as the
  // player is shown it (rounded), once
  const faultless = !r.poor && Math.round(like * 100) >= 100 && !parseList(ps.owned_titles).includes(SECRET_TITLES.faultless);

  await db.batch([
    db.prepare(`INSERT INTO scrolls (id, player_id, rarity, seed, hint, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
      .bind(id, pid, r.rarity, r.seed, hint, now),
    db.prepare(
      `INSERT INTO seal_log (player_id, created_at, rarity, traits, bumped, familiar, well_level, m) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    ).bind(pid, now, r.rarity, r.traits.join(","), r.bumped.join(","), r.familiar ? 1 : 0, ps.well_level || 0,
           JSON.stringify({ ...Object.fromEntries(Object.entries(measure(a)).map(([k, v]) => [k, Math.round(v * 10000) / 10000])),
                            page: `${body.tome}/${page.id}`, like: Math.round(like * 1000) / 1000 })),
    db.prepare(
      `UPDATE player_state SET xp = xp + ?2, seal_nonce = ?3, seal_count = seal_count + 1, recent_sigs = ?4,
              stats = ${bump("sealed")} WHERE player_id = ?1`
    ).bind(pid, xp, nonce, JSON.stringify(sigs)),
    ...(faultless ? [db.prepare(
      `UPDATE player_state SET owned_titles = json_insert(COALESCE(owned_titles, '[]'), '$[#]', ?2)
        WHERE player_id = ?1 AND NOT EXISTS (SELECT 1 FROM json_each(COALESCE(owned_titles, '[]')) WHERE value = ?2)`).bind(pid, SECRET_TITLES.faultless)] : []),
  ]);
  return { scroll: { id, rarity: r.rarity, seed: r.seed }, familiar: r.familiar, xp, base: r.base, steps: r.steps,
           likeness: Math.round(like * 100) / 100, poor: r.poor, faint: r.faint, ...(faultless ? { title: SECRET_TITLES.faultless } : {}) };
}

/* ─── offer ───────────────────────────────────────────────────────── */

/* One scroll (`scrollId`) or a handful at once (`scrollIds`). A handful
 * goes over plainest first, so its fine scrolls arrive one after another
 * and a streak is never broken by a common tucked between them: the same
 * as a careful player handing them over in that order, one by one. Each
 * fills the pot, each can release a chest, each can earn a remark.
 *
 * All of it is reckoned in one pass and written in one batch, whatever
 * the size of the handful: the claim on the pot goes first and holds
 * only if the pot and every scroll are still as read; everything after
 * it is tied to the claim's token. */
async function offer(db, pid, body, { now, rand, tz }) {
  const want = Array.isArray(body.scrollIds) ? [...new Set(body.scrollIds.filter(idOk))].slice(0, SCRIBE.scrollCap)
             : idOk(body.scrollId) ? [body.scrollId] : [];
  if (!want.length) throw new Refusal("Which scroll?");
  const wantJson = JSON.stringify(want);

  for (let attempt = 0; ; attempt++) {
    const [ps, found] = await Promise.all([
      db.prepare(
        `SELECT favour, chest_tier, chest_cost, pot_best, chests_given, json_extract(stats, '$.offerStreak') AS streak
           FROM player_state WHERE player_id = ?1`).bind(pid).first(),
      db.prepare(
        `SELECT id, rarity, hint FROM scrolls WHERE player_id = ?1 AND id IN (SELECT value FROM json_each(?2))`
      ).bind(pid, wantJson).all(),
    ]);
    const rows = (found.results || []).sort((a, b) => a.rarity - b.rarity || want.indexOf(a.id) - want.indexOf(b.id));
    if (!rows.length) throw new Refusal("That scroll is gone", 404);

    const ev = eventOn(localDay(now, tz));
    let pot = { favour: ps.favour, tier: ps.chest_tier, cost: ps.chest_cost, best: ps.pot_best, chests: ps.chests_given };
    let streak = ps.streak || 0, peak = 0, boosted = 0, xp = 0;
    const chests = [], hints = [];
    for (const sc of rows) {
      const grade = Math.max(pot.best || 0, sc.rarity);              // the best scroll in the pot that pays
      const run = streakAfter(streak, sc.rarity);                    // fine scrolls one after another pay more
      streak = run.streak; peak = Math.max(peak, streak); if (run.mul > 1) boosted++;
      const step = offerScroll(pot, sc.rarity, rand, run.mul);
      pot = step.pot;
      xp += xpForOffer(sc.rarity);
      if (step.chest != null) {
        // while an event runs, a share of his chests are the event's
        chests.push({ id: "k_" + randomHex(8), tier: step.chest, ...(eventChest(ev, rand) ? { season: ev.season } : {}), grade });
      }
      // He only ever praises, and only what actually lifted the scroll.
      const h = sc.hint && (TRAITS[sc.hint] || LIFTS[sc.hint])?.hint;
      if (h && rand() < CHESTS.hintChance && !hints.includes(h)) hints.push(h);
    }

    const ids = JSON.stringify(rows.map(r => r.id)), tok = randomHex(8);
    const guard = `EXISTS (SELECT 1 FROM player_state WHERE player_id = ${pid | 0} AND json_extract(stats, '$.offer') = '${tok}')`;
    const res = await db.batch([
      db.prepare(
        `UPDATE player_state SET favour = ?2, chest_tier = ?3, chest_cost = ?4, pot_best = ?5, chests_given = ?6, xp = xp + ?7,
            stats = json_set(COALESCE(stats, '{}'), '$.offerStreak', ?8, '$.offer', ?9,
                             '$.offered', COALESCE(json_extract(stats, '$.offered'), 0) + ?10,
                             '$.chests', COALESCE(json_extract(stats, '$.chests'), 0) + ?11)
          WHERE player_id = ?1 AND favour = ?12 AND chest_cost = ?13 AND chests_given = ?14
            AND (SELECT COUNT(*) FROM scrolls WHERE player_id = ?1 AND id IN (SELECT value FROM json_each(?15))) = ?10`
      ).bind(pid, pot.favour, pot.tier, pot.cost, pot.best, pot.chests, xp, streak, tok, rows.length, chests.length,
             ps.favour, ps.chest_cost, ps.chests_given, ids),
      db.prepare(`DELETE FROM scrolls WHERE player_id = ?1 AND id IN (SELECT value FROM json_each(?2)) AND ${guard}`).bind(pid, ids),
      ...chests.map(c => db.prepare(
        `INSERT INTO chests (id, player_id, tier, created_at, season, grade) SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE ${guard}`
      ).bind(c.id, pid, c.tier, now, c.season || null, c.season ? c.grade : 0)),
      db.prepare(`UPDATE player_state SET stats = json_remove(stats, '$.offer') WHERE player_id = ?1 AND ${guard}`).bind(pid),
    ]);
    if (!res[0]?.meta?.changes) {
      if (attempt >= 4) throw new Refusal("The door is busy. Try again.", 503);
      continue;                                                       // something moved: read again
    }
    const given = chests.map(({ grade: _g, ...c }) => c);
    return {
      offered: rows.length, rarity: rows[rows.length - 1].rarity,
      hint: hints[0] || null, hints, lean: leanOf(pot),
      chest: given[0] || null, chests: given, xp,
      streak, streakMul: boosted ? STREAK.mul : 1, streakPeak: peak, boosted,
    };
  }
}

/* ─── visit: he may have something for you ────────────────────────── */

const VISIT_GAP_MS = 5 * 60e3;       // how often a visit counts toward anything

function describeReward(reward) {
  if (reward.type === "chest") return { type: "chest", tier: reward.tier, name: CHESTS.names[reward.tier] + " CHEST" };
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
export function journalStmt(db, pid, c, guard = null) {
  // one of an event's named coins is counted on its own page ($.r."magi:1"),
  // not among the kinds of coin; only known ones, written into the path
  const rel = relicOf(c.relic) ? c.relic : null;
  const k = rel ? `$.r."${rel}"` : `$.c."${c.metalIdx}:${c.rarity ?? 0}"`;
  // a material is also counted on its own page, by name ($.m); only
  // known names, since they are written into the path
  const mat = MATERIAL.byTier.includes(c.material) ? c.material : null;
  const mk = mat ? `$.m."${mat}"` : null;
  // a season too, by metal ($.s."frost26:3"); only known seasons
  const sk = c.season && SEASONS[c.season] ? `$.s."${c.season}:${c.metalIdx}"` : null;
  const value = coinValue(hydrate({ seed: c.seed, metal_idx: c.metalIdx, shiny: c.shiny ? 1 : 0, rarity: c.rarity, material: mat, season: c.season }));
  return db.prepare(
    `UPDATE player_state SET journal = json_set(
        json_set(journal,
          '$.c', json(COALESCE(json_extract(journal, '$.c'), '{}')),
          '$.m', json(COALESCE(json_extract(journal, '$.m'), '{}')),
          '$.s', json(COALESCE(json_extract(journal, '$.s'), '{}')),
          '$.r', json(COALESCE(json_extract(journal, '$.r'), '{}'))),
        '${k}', COALESCE(json_extract(journal, '${k}'), 0) + 1,${mk ? `
        '${mk}', COALESCE(json_extract(journal, '${mk}'), 0) + 1,` : ""}${sk ? `
        '${sk}', COALESCE(json_extract(journal, '${sk}'), 0) + 1,` : ""}
        '$.shiny', COALESCE(json_extract(journal, '$.shiny'), 0) + ?2,
        '$.best', MAX(COALESCE(json_extract(journal, '$.best'), 0), ?3))
      WHERE player_id = ?1${guard ? ` AND ${guard}` : ""}`
  ).bind(pid, c.shiny ? 1 : 0, value);
}

/* ─── chest → dusty coin → vault ──────────────────────────────────── */

async function open(db, pid, body, { now, rand }) {
  if (!idOk(body.chestId)) throw new Refusal("Which chest?");
  const [ch, ps] = await Promise.all([
    db.prepare(`DELETE FROM chests WHERE id = ?1 AND player_id = ?2 RETURNING tier, season, grade`).bind(body.chestId, pid).first(),
    db.prepare(`SELECT tomes, owned_titles, owned_fx, chests_given FROM player_state WHERE player_id = ?1`).bind(pid).first(),
  ]);
  if (!ch) throw new Refusal("That chest is gone", 404);
  // now and then a tome, tucked in with the coin
  let tome = tomeFromChest(ch.tier, tomesOf(ps.tomes), CHESTS.tomeChance, rand);
  // an event's chest: its coin is of the season, rolled as from a finer
  // chest the better the scroll that paid for it, and it may hold the
  // event's title or its profile effect (shared/events.js)
  const ev = ch.season && SEASONS[ch.season] ? eventById(SEASONS[ch.season].event) : null;
  const holds = ev ? eventChestHolds(ev, ch.tier, ch.grade, { tomes: tomesOf(ps.tomes), titles: parseList(ps.owned_titles), effects: parseList(ps.owned_fx) }, rand) : null;
  let rolled = rollCoin(holds ? holds.coinTier : ch.tier, rand);
  if (ev) rolled.season = ch.season;
  // or, rarely, one of the event's named coins: always mythic, no frost
  if (holds?.relic) rolled = { ...rolled, metalIdx: RELICS[relicOf(holds.relic).set].metal, rarity: MAX_RARITY, material: null, season: null, relic: holds.relic };
  if (!tome && holds?.tome) tome = holds.tome;          // the event's own tome, from its present
  // nobody waits forever for their first book (an event's tome isn't one)
  if (!tome && (ps.chests_given || 0) >= CHESTS.firstTomeBy && !tomesOf(ps.tomes).some(t => TOMES.some(x => x.id === t && x.tier > 0 && !x.event))) tome = CHESTS.firstTome;
  const id = "c_" + randomHex(8);
  // an astral coin takes a sign its owner lacks (and if two chests race
  // for the last free one, the index refuses the second: pick again)
  let c;
  for (let tries = 0; ; tries++) {
    c = placeAstral(rolled, await heldSigns(db, pid), rand);
    try {
      await db.batch([
        db.prepare(
          `INSERT INTO coins (id, player_id, seed, metal_idx, shiny, locked, rarity, acquired_at, dusty, material, sign, season, relic)
           VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, 1, ?8, ?9, ?10, ?11)`
        ).bind(id, pid, c.seed, c.metalIdx, c.shiny ? 1 : 0, c.rarity, now, c.material || null, c.sign ?? null, c.season || null, c.relic || null),
        db.prepare(`UPDATE player_state SET xp = xp + ?2 WHERE player_id = ?1`).bind(pid, XP.open),
        ...(tome ? [db.prepare(
          `UPDATE player_state SET tomes = json_insert(tomes, '$[#]', ?2)
            WHERE player_id = ?1 AND NOT EXISTS (SELECT 1 FROM json_each(tomes) WHERE value = ?2)`).bind(pid, tome)] : []),
        ...(holds?.title ? [db.prepare(
          `UPDATE player_state SET owned_titles = json_insert(COALESCE(owned_titles, '[]'), '$[#]', ?2)
            WHERE player_id = ?1 AND NOT EXISTS (SELECT 1 FROM json_each(COALESCE(owned_titles, '[]')) WHERE value = ?2)`).bind(pid, holds.title)] : []),
        ...(holds?.effect ? [db.prepare(
          `UPDATE player_state SET owned_fx = json_insert(owned_fx, '$[#]', ?2)
            WHERE player_id = ?1 AND NOT EXISTS (SELECT 1 FROM json_each(owned_fx) WHERE value = ?2)`).bind(pid, holds.effect)] : []),
      ]);
      break;
    } catch (e) { if (tries >= 2 || !/UNIQUE/i.test(String(e?.message))) throw e; }
  }
  // a secret title: an astral coin among your first fifty coins ever (the
  // journal's count of every coin you've cleaned, won or bought, and those
  // still to be brushed; this one is among them now)
  let firstStar = false;
  if (c.metalIdx === ASTRAL.metal && c.sign != null) {
    const seen = await db.prepare(
      `SELECT p.created_at AS born, ps.owned_titles AS titles,
              COALESCE((SELECT SUM(value) FROM json_each(ps.journal, '$.c')), 0) + COALESCE((SELECT SUM(value) FROM json_each(ps.journal, '$.r')), 0)
              + (SELECT COUNT(*) FROM coins WHERE player_id = ?1 AND dusty = 1) AS n
         FROM player_state ps JOIN players p ON p.id = ps.player_id WHERE ps.player_id = ?1`).bind(pid).first();
    if (seen && seen.born >= SECRET.journalSince && seen.n <= SECRET.firstStarWithin && !parseList(seen.titles).includes("first_star")) {
      await db.prepare(
        `UPDATE player_state SET owned_titles = json_insert(COALESCE(owned_titles, '[]'), '$[#]', 'first_star')
          WHERE player_id = ?1 AND NOT EXISTS (SELECT 1 FROM json_each(COALESCE(owned_titles, '[]')) WHERE value = 'first_star')`).bind(pid).run();
      firstStar = true;
    }
  }
  return { tier: ch.tier, coin: { id, seed: c.seed, metalIdx: c.metalIdx, shiny: c.shiny, locked: false, rarity: c.rarity, ...(c.season ? { season: c.season } : {}), ...(c.relic ? { relic: c.relic } : {}) },
           xp: XP.open, ...(tome ? { tome } : {}),
           ...(holds?.title ? { title: describeReward({ type: "title", id: holds.title }) } : {}),
           ...(firstStar ? { secretTitle: describeReward({ type: "title", id: "first_star" }) } : {}),
           ...(holds?.effect ? { effect: holds.effect } : {}) };
}

/* ─── fuse: three coins of one metal and rarity → one, a rarity finer ─ */

export function fuseFee(rows) {
  const worth = rows.reduce((n, r) => n + coinValue(hydrate({ seed: r.seed, metal_idx: r.metal_idx, shiny: r.shiny, rarity: r.rarity, material: r.material, season: r.season })), 0);
  return Math.max(FUSE.minFee, Math.round(worth * FUSE.feeShare));
}

/* Fuse: three coins of one metal and one rarity go into the fire. With
 * no target, one new coin comes out a rarity finer. With a target (a
 * fourth coin of the same metal and rarity, `targetId`), the three go
 * and the target itself comes out a rarity finer: its face, shine, lock
 * and engraved name all kept. The fee is the three's either way. */
async function fuse(db, pid, body, { now, rand }) {
  const ids = Array.isArray(body.coinIds) ? [...new Set(body.coinIds.filter(idOk))] : [];
  if (ids.length !== FUSE.take) throw new Refusal(`Three coins go in`);
  const target = body.targetId == null ? null : idOk(body.targetId) ? body.targetId : "";
  if (target === "" || (target && ids.includes(target))) throw new Refusal("Which coin is to be kept?");
  const rows = (await db.prepare(
    `SELECT * FROM coins WHERE player_id = ?1 AND id IN (?2, ?3, ?4)`).bind(pid, ...ids).all()).results || [];
  if (rows.length !== FUSE.take) throw new Refusal("One of those is gone", 404);
  if (rows.some(r => r.dusty)) throw new Refusal("Brush them first", 409);
  if (rows.some(r => r.locked)) throw new Refusal("Unlock them first", 409);
  if (rows.some(r => r.relic || r.sign != null || r.metal_idx === ASTRAL.metal)) throw new Refusal("The collectable sets don't go in the fire", 409);
  const { metal_idx: metal, rarity } = rows[0];
  if (rows.some(r => r.metal_idx !== metal || (r.rarity ?? 0) !== (rarity ?? 0))) throw new Refusal("All three of one metal and one rarity", 409);
  if ((rarity ?? 0) >= MAX_RARITY) throw new Refusal("A mythic has nowhere higher to go", 409);
  let kept = null;
  if (target) {
    kept = await db.prepare(`SELECT * FROM coins WHERE id = ?1 AND player_id = ?2`).bind(target, pid).first();
    if (!kept) throw new Refusal("The coin to keep is gone", 404);
    if (kept.dusty) throw new Refusal("Brush it first", 409);
    if (kept.relic || kept.sign != null || kept.metal_idx === ASTRAL.metal) throw new Refusal("The collectable sets don't go in the fire", 409);
    if (kept.metal_idx !== metal || (kept.rarity ?? 0) !== (rarity ?? 0)) throw new Refusal("The coin to keep must match the three", 409);
  }
  const fee = fuseFee(rows), tok = randomHex(8), id = kept ? kept.id : "c_" + randomHex(8);
  const up = (rarity ?? 0) + 1;
  const made = kept
    ? { id, seed: kept.seed, metalIdx: metal, rarity: up, shiny: !!kept.shiny }        // counted at its new rarity; its material and season were counted when found
    : { id, seed: u32(rand), metalIdx: metal, rarity: up, shiny: false };
  const guard = `EXISTS (SELECT 1 FROM player_state WHERE player_id = ${pid | 0} AND json_extract(stats, '$.fuse') = '${tok}')`;
  const res = await db.batch([
    // the fee, and the claim: only if all three (and the one to keep) are still there as they were
    db.prepare(
      `UPDATE player_state SET marks = marks - ?2, stats = json_set(COALESCE(stats, '{}'), '$.fuse', ?3)
        WHERE player_id = ?1 AND marks >= ?2
          AND (SELECT COUNT(*) FROM coins WHERE player_id = ?1 AND id IN (?4, ?5, ?6) AND dusty = 0 AND locked = 0
                 AND relic IS NULL AND sign IS NULL AND metal_idx = ?7 AND COALESCE(rarity, 0) = ?8) = 3
          AND (?9 IS NULL OR EXISTS (SELECT 1 FROM coins WHERE player_id = ?1 AND id = ?9 AND dusty = 0
                 AND relic IS NULL AND sign IS NULL AND metal_idx = ?7 AND COALESCE(rarity, 0) = ?8))`
    ).bind(pid, fee, tok, ...ids, metal, rarity ?? 0, kept ? id : null),
    db.prepare(`DELETE FROM coins WHERE player_id = ?1 AND id IN (?2, ?3, ?4) AND ${guard}`).bind(pid, ...ids),
    kept
      ? db.prepare(`UPDATE coins SET rarity = ?3 WHERE id = ?1 AND player_id = ?2 AND ${guard}`).bind(id, pid, up)
      : db.prepare(
        `INSERT INTO coins (id, player_id, seed, metal_idx, shiny, locked, rarity, acquired_at, dusty)
         SELECT ?1, ?2, ?3, ?4, 0, 0, ?5, ?6, 0 WHERE ${guard}`).bind(id, pid, made.seed, metal, made.rarity, now),
    journalStmt(db, pid, made, guard),
    db.prepare(`UPDATE player_state SET stats = json_remove(${bump("fused")}, '$.fuse') WHERE player_id = ?1 AND ${guard}`).bind(pid),
  ]);
  if (!res[0]?.meta?.changes) {
    const ps = await db.prepare(`SELECT marks FROM player_state WHERE player_id = ?1`).bind(pid).first();
    throw new Refusal((ps?.marks || 0) < fee ? "Not enough marks" : "Those coins changed. Have another look", 409);
  }
  return { coin: kept ? coinOut({ ...kept, rarity: up }) : { id, seed: made.seed, metalIdx: metal, shiny: false, locked: false, rarity: made.rarity },
           fee, gone: ids, kept: !!kept };
}

async function brush(db, pid, body, { now }) {
  if (!idOk(body.coinId)) throw new Refusal("Which coin?");
  const c = await db.prepare(
    `UPDATE coins SET dusty = 0, acquired_at = ?3 WHERE id = ?1 AND player_id = ?2 AND dusty = 1
     RETURNING id, seed, metal_idx, shiny, locked, rarity, material, sign, season, relic`
  ).bind(body.coinId, pid, now).first();
  if (!c) throw new Refusal("That coin is already clean", 404);
  const xp = xpForBrush({ rarity: c.rarity, metalIdx: c.metal_idx, shiny: !!c.shiny });
  await db.batch([
    db.prepare(`UPDATE player_state SET xp = xp + ?2, stats = ${bump("brushed")} WHERE player_id = ?1`).bind(pid, xp),
    journalStmt(db, pid, { seed: c.seed, metalIdx: c.metal_idx, shiny: !!c.shiny, rarity: c.rarity, material: c.material, season: c.season, relic: c.relic }),
  ]);
  return { coin: coinOut(c), xp };       // a new star sign's bonus is paid by the state load (server/state.js)
}

/* ─── sell ────────────────────────────────────────────────────────── */

const placeholders = (n, from) => Array.from({ length: n }, (_, i) => `?${i + from}`).join(",");

async function sell(db, pid, body) {
  const ids = [...new Set((Array.isArray(body.coinIds) ? body.coinIds : []).filter(idOk))].slice(0, 200);
  if (!ids.length) throw new Refusal("Nothing to sell");
  // locked coins, dusty ones and the Magi's gifts are simply not matched, so not sold
  const gone = await db.prepare(
    `DELETE FROM coins WHERE player_id = ?1 AND locked = 0 AND dusty = 0 AND relic IS NULL AND id IN (${placeholders(ids.length, 2)})
     RETURNING id, seed, metal_idx, shiny, rarity, material, season, relic`
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
    `SELECT id, seed, metal_idx, shiny, rarity, material, season FROM coins WHERE id = ?1 AND player_id = ?2 AND dusty = 0`
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
/* a new face for a coin: a new seed, the same shape (the seed decides
 * that too, so seeds are drawn until one keeps it), and its rarity written
 * down if it was only ever derived from the old seed. Astral coins bear
 * their sign, not a face. */
async function restrike(db, pid, body, { rand }) {
  if (!idOk(body.coinId)) throw new Refusal("Which coin?");
  const c = await db.prepare(
    `SELECT id, seed, metal_idx, shiny, rarity, material, season, relic FROM coins WHERE id = ?1 AND player_id = ?2 AND dusty = 0`
  ).bind(body.coinId, pid).first();
  if (!c) throw new Refusal("That coin is gone", 404);
  if (c.metal_idx === ASTRAL.metal) throw new Refusal("An astral coin bears its sign, not a face", 409);
  if (c.relic) throw new Refusal("That coin bears its own mark, not a face", 409);
  const old = c.seed >>> 0, rarity = c.rarity ?? deriveRarity(old);
  const shape = mkCoin(old, 1, c.metal_idx).shape;
  let seed = old;
  for (let i = 0; i < 200 && (seed === old || mkCoin(seed, 1, c.metal_idx).shape !== shape); i++) seed = Math.floor(rand() * 4294967296) >>> 0;
  if (seed === old) throw new Refusal("The die slipped. Try again", 409);

  const cost = restrikeCost(coinValue(hydrate({ ...c, shiny: 0 })));
  const paid = await db.prepare(
    `UPDATE player_state SET marks = marks - ?2 WHERE player_id = ?1 AND marks >= ?2`).bind(pid, cost).run();
  if (!paid.meta.changes) throw new Refusal("Not enough marks", 402);
  const set = await db.prepare(
    `UPDATE coins SET seed = ?3, rarity = ?4 WHERE id = ?1 AND player_id = ?2 AND seed = ?5 AND dusty = 0`
  ).bind(c.id, pid, seed, rarity, c.seed).run();
  if (!set.meta.changes) {
    await db.prepare(`UPDATE player_state SET marks = marks + ?2 WHERE player_id = ?1`).bind(pid, cost).run();
    throw new Refusal("That coin is gone", 409);
  }
  return { cost, seed };
}

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
  roulette: { coins: 1, resolve: resolveRoulette, winXp: XP.rouletteWin, lossXp: XP.rouletteLoss },
  plinko:   { coins: 1, resolve: resolvePlinko,   winXp: XP.rouletteWin, lossXp: XP.rouletteLoss },
};

async function gamble(db, pid, body, { now, rand }) {
  const g = GAMES[body.game];
  if (!g) throw new Refusal("No such game");
  const ids = [...new Set((Array.isArray(body.coinIds) ? body.coinIds : []).filter(idOk))];
  if (ids.length !== g.coins) throw new Refusal(`Stake ${g.coins} coin${g.coins > 1 ? "s" : ""}`);

  const found = await db.prepare(
    `SELECT id, metal_idx, season FROM coins WHERE player_id = ?1 AND locked = 0 AND dusty = 0 AND relic IS NULL AND id IN (${placeholders(ids.length, 2)})`
  ).bind(pid, ...ids).all();
  const staked = ids.map(id => (found.results || []).find(r => r.id === id));
  if (staked.some(r => !r)) throw new Refusal("A staked coin is locked or gone", 409);
  const metal = staked[0].metal_idx;

  const res = g.resolve(metal, rand);
  const lost = res.lose.map(i => ids[i]);
  const del = await db.prepare(
    `DELETE FROM coins WHERE player_id = ?1 AND locked = 0 AND dusty = 0 AND id IN (${placeholders(lost.length, 2)})`
  ).bind(pid, ...lost).run();
  // if someone else got to a staked coin first, nothing is minted
  if (del.meta.changes !== lost.length) throw new Refusal("A staked coin is locked or gone", 409);

  const held = res.make.includes(ASTRAL.metal) ? await heldSigns(db, pid) : new Set();
  // a season is the coin's for good: what a staked coin becomes keeps it
  const seasons = staked.map(r => r.season).filter(Boolean);
  const minted = res.make.map((m, i) => {
    const seed = u32(rand);
    const c = placeAstral({ id: "c_" + randomHex(8), seed, metalIdx: m, shiny: false, locked: false, rarity: deriveRarity(seed) }, held, rand);
    if (seasons[i]) c.season = seasons[i];
    if (c.sign != null) held.add(c.sign);
    return c;
  });
  const xp = res.won ? g.winXp : g.lossXp;
  await db.batch([
    ...minted.map(c => journalStmt(db, pid, c)),
    ...minted.map(c => db.prepare(
      `INSERT INTO coins (id, player_id, seed, metal_idx, shiny, locked, rarity, acquired_at, dusty, sign, season)
       VALUES (?1, ?2, ?3, ?4, 0, 0, ?5, ?6, 0, ?7, ?8)`).bind(c.id, pid, c.seed, c.metalIdx, c.rarity, now, c.sign ?? null, c.season || null)),
    db.prepare(`UPDATE player_state SET xp = xp + ?2, stats = ${bump("gambles")} WHERE player_id = ?1`).bind(pid, xp),
  ]);
  return {
    game: body.game, won: res.won, outcome: res.outcome, sector: res.sector ?? null, slot: res.slot ?? null, path: res.path ?? null,
    lost, kept: ids.filter(id => !lost.includes(id)), minted, xp,
  };
}

/* ─── dispatch ────────────────────────────────────────────────────── */

const ACTIONS = { seal, offer, visit, open, brush, sell, gamble, forge, restrike, engrave, fuse, well, stall, buy, auctions, list, bid, withdraw, board, post, unpost, report, ranks };

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
  // the receipt and the new state at once: one round trip, not three.
  // Lists the client says it already has, unchanged, are left out (it
  // keeps its own): a big vault is not sent back after every tap.
  const [state] = await Promise.all([
    loadState(db, pid, now, tz),
    opId && db.prepare(`UPDATE action_log SET response = ?3 WHERE player_id = ?1 AND op_id = ?2`).bind(pid, opId, JSON.stringify(result)).run(),
    opId && rand() < 0.02 && db.prepare(`DELETE FROM action_log WHERE created_at < ?1`).bind(now - 2 * 86400e3).run(),
  ]);
  const have = body?.have && typeof body.have === "object" ? body.have : {};
  for (const k of LISTS) if (typeof have[k] === "string" && have[k] === listHash(state[k])) delete state[k];
  return { result, state };
}
