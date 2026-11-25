/* ══════════════════════════════════════════════════════════════════════
 *  state — what the client is allowed to know, and to set
 *  ────────────────────────────────────────────────────────────────────
 *  loadState builds the one snapshot the client renders from. It leaves
 *  out everything the design keeps secret: the pot, the price of the
 *  chest he is holding, which trait lifted a scroll.
 *
 *  patchCosmetics is the only write the client makes directly, and it
 *  can only touch things that are choices rather than value: which frame
 *  and title to wear, the bio, the cabinet, which coins are locked.
 * ══════════════════════════════════════════════════════════════════════ */

import { levelOf, leanOf, inkFor, dailyGift, dailyStreak, dailyWait, localDay, setsDone } from "../shared/economy.js";
import { settleDue, takeNotes } from "./auction.js";
import { SCRIBE, ASTRAL, CABINET_SCORE, METAL_SETS } from "../shared/tuning.js";
import { heldSigns } from "./signs.js";
import { STARTER, cravedPage } from "../shared/tomes.js";
import { eventOn, RELICS, relicOf } from "../shared/events.js";
import { FRAMES, TITLES, TITLE_LEVELS, PREMIUM_TITLES, currentTitle } from "../src/lib/data.js";
import { Refusal } from "./http.js";

export const parseList = (txt) => { try { const v = JSON.parse(txt || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
export const parseObj  = (txt) => { try { const v = JSON.parse(txt || "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { return {}; } };

export const coinOut = r => ({
  id: r.id, seed: r.seed >>> 0, metalIdx: r.metal_idx, shiny: !!r.shiny, locked: !!r.locked,
  ...(r.rarity != null ? { rarity: r.rarity } : {}),
  ...(r.nickname ? { nick: r.nickname } : {}),
  ...(r.material ? { material: r.material } : {}),
  ...(r.sign != null ? { sign: r.sign } : {}),
  ...(r.season ? { season: r.season } : {}),
  ...(r.relic ? { relic: r.relic } : {}),
});

/* The journal as stored, topped up with what the player holds right now —
 * so coins from before the journal existed count without a backfill. */
export function journalOut(stored, coins) {
  const j = parseObj(stored), c = { ...(j.c || {}) }, m = { ...(j.m || {}) }, s = { ...(j.s || {}) }, rel = { ...(j.r || {}) }, held = {}, heldM = {};
  let shinyHeld = 0;
  for (const r of coins) {
    if (r.dusty) continue;
    // a named coin is on its own page, not among the kinds
    if (relicOf(r.relic)) { rel[r.relic] = Math.max(rel[r.relic] || 0, 1); if (r.shiny) shinyHeld++; continue; }
    const k = `${r.metal_idx}:${r.rarity ?? 0}`;
    held[k] = (held[k] || 0) + 1;
    if (r.shiny) shinyHeld++;
    if (r.material) heldM[r.material] = (heldM[r.material] || 0) + 1;
    if (r.season) { const sk = `${r.season}:${r.metal_idx}`; s[sk] = Math.max(s[sk] || 0, 1); }
  }
  for (const [k, n] of Object.entries(held)) c[k] = Math.max(c[k] || 0, n);
  for (const [k, n] of Object.entries(heldM)) m[k] = Math.max(m[k] || 0, n);
  return { c, m, s, r: rel, shiny: Math.max(j.shiny || 0, shinyHeld), best: j.best || 0 };
}

/* Astral coins from before the signs (migration 016) get one each, the
 * oldest first, from the signs the player does not hold; any beyond
 * twelve stay unsigned. Done once, the first time their owner loads. */
async function signOldAstrals(db, pid, rows) {
  const bare = rows.filter(r => r.metal_idx === ASTRAL.metal && r.sign == null);
  if (!bare.length) return;
  const held = await heldSigns(db, pid);
  const free = ASTRAL.signs.map((_, i) => i).filter(i => !held.has(i));
  const stmts = [];
  for (const r of [...bare].reverse()) {                      // rows are newest first
    if (!free.length) break;
    const s = free.splice((r.seed >>> 0) % free.length, 1)[0];
    r.sign = s;
    stmts.push(db.prepare(`UPDATE coins SET sign = ?3 WHERE player_id = ?1 AND id = ?2 AND sign IS NULL`).bind(pid, r.id, s));
  }
  try { if (stmts.length) await db.batch(stmts); }
  catch { for (const r of bare) r.sign = null; }               // a race: try again next load
}

/* ─── the first-find bonus for star signs ─────────────────────────────
 * ASTRAL.firstBonus marks for each sign a player has, the first time they
 * have it, however it came: a chest, the tavern, a war, an old coin given
 * its sign. Paid here because every way in ends with this load. The
 * journal keeps the signs paid for ($.signsPaid, only ever gaining bits)
 * and, from migration 019, the signs held before the bonus began
 * ($.signs), which are back paid. A dusty coin waits until it is brushed,
 * so the popup never gives away a reveal. Each sign is its own guarded
 * statement, so two loads at once pay it once. */
async function paySigns(db, pid, ps, rows) {
  const j = parseObj(ps.journal);
  let found = (j.signs | 0);
  for (const r of rows) if (!r.dusty && r.sign != null) found |= 1 << r.sign;
  const due = found & ~(j.signsPaid | 0);
  if (!due) return [];
  const signs = ASTRAL.signs.map((_, i) => i).filter(i => due & (1 << i));
  let res;
  try {
    res = await db.batch(signs.map(i => db.prepare(
      `UPDATE player_state SET marks = marks + ?3,
         journal = json_set(journal, '$.signsPaid', COALESCE(json_extract(journal, '$.signsPaid'), 0) | ?2)
       WHERE player_id = ?1 AND (COALESCE(json_extract(journal, '$.signsPaid'), 0) & ?2) = 0`
    ).bind(pid, 1 << i, ASTRAL.firstBonus)));
  } catch { return []; }                                       // try again next load
  const paid = signs.filter((_, k) => res[k]?.meta?.changes);
  ps.marks = (ps.marks || 0) + paid.length * ASTRAL.firstBonus;
  return paid.map(sign => ({ sign, marks: ASTRAL.firstBonus }));
}

/* ─── the first-find bonus for an event's named coins ─────────────────
 * RELICS[set].firstBonus marks the first time a player has each of a
 * set's coins (brushed: a dusty one waits, so the popup never spoils a
 * reveal), and setBonus once more when the set is whole. Found ever is
 * the journal's $.r with what is held; paid is $.relicsPaid, a bitmask per
 * set, the set's own bonus the bit past its coins. Each payment is its own
 * guarded statement, so two loads at once pay it once. */
/* A metal's set, completed: its bonus, once (journal.setsPaid, a bit per
 * metal), guarded so two loads can't both pay it. */
async function paySets(db, pid, ps) {
  const j = parseObj(ps.journal), had = j.setsPaid | 0;
  const due = setsDone(j).filter(m => !(had & (1 << m)));
  if (!due.length) return [];
  let res;
  try {
    res = await db.batch(due.map(m => db.prepare(
      `UPDATE player_state SET marks = marks + ?3,
         journal = json_set(journal, '$.setsPaid', COALESCE(json_extract(journal, '$.setsPaid'), 0) | ?2)
       WHERE player_id = ?1 AND (COALESCE(json_extract(journal, '$.setsPaid'), 0) & ?2) = 0`
    ).bind(pid, 1 << m, METAL_SETS.bonus[m])));
  } catch { return []; }
  const got = due.filter((_, k) => res[k]?.meta?.changes).map(m => ({ metal: m, marks: METAL_SETS.bonus[m] }));
  ps.marks = (ps.marks || 0) + got.reduce((n, g) => n + g.marks, 0);
  return got;
}

async function payRelics(db, pid, ps, rows) {
  const j = parseObj(ps.journal), paid = parseObj(j.relicsPaid), out = [], stmts = [];
  for (const [set, def] of Object.entries(RELICS)) {
    let found = 0;
    def.coins.forEach((_, i) => { if ((j.r || {})[`${set}:${i}`]) found |= 1 << i; });
    for (const r of rows) { const rel = relicOf(r.relic); if (rel && rel.set === set && !r.dusty) found |= 1 << rel.index; }
    const had = paid[set] | 0, whole = (1 << def.coins.length) - 1, setBit = 1 << def.coins.length;
    def.coins.forEach((c, i) => {
      if ((found & (1 << i)) && !(had & (1 << i))) { stmts.push([set, 1 << i, def.firstBonus]); out.push({ relic: `${set}:${i}`, marks: def.firstBonus }); }
    });
    if ((found & whole) === whole && !(had & setBit)) { stmts.push([set, setBit, def.setBonus]); out.push({ set, marks: def.setBonus }); }
  }
  if (!stmts.length) return [];
  let res;
  try {
    res = await db.batch(stmts.map(([set, bit, marks]) => db.prepare(
      `UPDATE player_state SET marks = marks + ?4,
         journal = json_set(journal, '$.relicsPaid.' || ?2, COALESCE(json_extract(journal, '$.relicsPaid.' || ?2), 0) | ?3)
       WHERE player_id = ?1 AND (COALESCE(json_extract(journal, '$.relicsPaid.' || ?2), 0) & ?3) = 0`
    ).bind(pid, set, bit, marks)));
  } catch { return []; }                                       // try again next load
  const got = out.filter((_, k) => res[k]?.meta?.changes);
  ps.marks = (ps.marks || 0) + got.reduce((n, g) => n + g.marks, 0);
  return got;
}

/* the tomes a player has: always the primer, whatever the row says */
export const tomesOf = raw => { const t = parseList(raw); return t.includes(STARTER) ? t : [STARTER, ...t]; };

export async function loadState(db, pid, now = Date.now(), tz = 0) {
  // an auction run out and not yet settled by the clock is settled now,
  // so a coin won is in the vault this very load
  await settleDue(db, now, 5);
  // every read at once: one round trip to the database, not two
  const [ps, coins, scrolls, chests] = await Promise.all([
    db.prepare(
      `SELECT players.username, s.xp, s.marks, s.frame, s.bio, s.selected_title, s.pinned_ids,
              s.owned_frames, s.owned_titles, s.owned_fx, s.profile_fx, s.favour, s.chest_cost, s.gifts, s.stats, s.last_seal_at,
              s.journal, s.well_level, s.tomes
         FROM player_state s JOIN players ON players.id = s.player_id
        WHERE s.player_id = ?1`
    ).bind(pid).first(),
    db.prepare(`SELECT id, seed, metal_idx, shiny, locked, rarity, dusty, nickname, material, sign, season, relic FROM coins WHERE player_id = ?1 ORDER BY acquired_at DESC, id`).bind(pid).all(),
    db.prepare(`SELECT id, rarity, seed FROM scrolls WHERE player_id = ?1 ORDER BY created_at, id`).bind(pid).all(),
    db.prepare(`SELECT id, tier, season FROM chests WHERE player_id = ?1 ORDER BY created_at, id`).bind(pid).all(),
  ]);
  if (!ps) throw new Refusal("State missing — your account may need recreating", 500);
  const all = coins.results || [];
  await signOldAstrals(db, pid, all);
  const signBonus = await paySigns(db, pid, ps, all);
  const relicBonus = await payRelics(db, pid, ps, all);
  const setBonus = await paySets(db, pid, ps);
  const auctionNotes = await takeNotes(db, pid);
  const stats = parseObj(ps.stats);
  delete stats.lastVisitAt;
  const daily = stats.daily || {};
  delete stats.daily;

  return {
    username: ps.username,
    xp: ps.xp, level: levelOf(ps.xp), marks: ps.marks || 0,
    frame: ps.frame, bio: ps.bio || "", selectedTitle: currentTitle(ps.selected_title),
    pinnedIds: ps.pinned_ids ? JSON.parse(ps.pinned_ids) : null,
    iconCoin: stats.iconCoin || null, cabFrame: Number.isInteger(stats.cabFrame) ? stats.cabFrame : null,
    offerStreak: stats.offerStreak || 0,
    ownedFrames: parseList(ps.owned_frames), ownedTitles: parseList(ps.owned_titles),
    ownedFx: parseList(ps.owned_fx), profileFx: ps.profile_fx || null,
    coins: all.filter(r => !r.dusty).map(coinOut),
    dusty: all.filter(r => r.dusty).map(coinOut),
    scrolls: (scrolls.results || []).map(r => ({ id: r.id, rarity: r.rarity, seed: r.seed >>> 0 })),
    chests: (chests.results || []).map(r => ({ id: r.id, tier: r.tier, ...(r.season ? { season: r.season } : {}) })),
    scrollCap: SCRIBE.scrollCap,
    wellLevel: ps.well_level || 0, inkMax: inkFor(ps.well_level || 0),
    tomes: tomesOf(ps.tomes),
    journal: journalOut(ps.journal, all),
    streak: dailyStreak(daily, now, tz),
    // the door's daily gift: waiting now, or how long until it is
    dailyReady: !!dailyGift(daily, now, tz),
    dailyIn: dailyWait(daily, now, tz),
    lean: leanOf({ favour: ps.favour, cost: ps.chest_cost }),
    stats,
    gifts: parseList(ps.gifts).length,
    sealReadyIn: Math.max(0, SCRIBE.cooldownMs - (now - (ps.last_seal_at || 0))),
    craving: cravedPage(localDay(now, tz), pid, tomesOf(ps.tomes)),
    // the event running on the player's calendar today (shared/events.js), or null
    event: (e => e && { id: e.id, name: e.name, season: e.season, to: e.to })(eventOn(localDay(now, tz))),   // the page he wants today: { tome, page }
    // star signs paid for just now, for the popup
    ...(signBonus.length ? { signBonus } : {}),
    ...(relicBonus.length ? { relicBonus } : {}),
    ...(setBonus.length ? { setBonus } : {}),
    ...(auctionNotes.length ? { auctionNotes } : {}),
  };
}

/* ─── cosmetics ───────────────────────────────────────────────────── */

export function titleAllowed(label, level, ownedTitles) {
  const i = TITLES.indexOf(label);
  if (i >= 0) return level >= TITLE_LEVELS[i];
  const p = PREMIUM_TITLES.find(t => t.label === label);
  return !!p && ownedTitles.includes(p.id);
}
export function frameAllowed(id, level, ownedFrames) {
  const f = FRAMES[id];
  if (!f || level < f.minLvl) return false;
  return !f.premium || ownedFrames.includes(id);
}

export async function patchCosmetics(db, pid, body) {
  const s = body?.state && typeof body.state === "object" ? body.state : {};
  const ps = await db.prepare(
    `SELECT xp, owned_frames, owned_titles, owned_fx FROM player_state WHERE player_id = ?1`
  ).bind(pid).first();
  if (!ps) throw new Refusal("State missing", 500);
  const level = levelOf(ps.xp);

  const sets = [], binds = [pid];
  const set = (col, v) => { binds.push(v); sets.push(`${col} = ?${binds.length}`); };

  if (typeof s.frame === "string") {
    if (!frameAllowed(s.frame, level, parseList(ps.owned_frames))) throw new Refusal("That frame is not yours to wear", 403);
    set("frame", s.frame);
  }
  if (typeof s.selectedTitle === "string") {
    if (!titleAllowed(s.selectedTitle, level, parseList(ps.owned_titles))) throw new Refusal("That title is not yours to wear", 403);
    set("selected_title", s.selectedTitle);
  }
  if (typeof s.bio === "string") set("bio", s.bio.slice(0, 120));
  if ("pinnedIds" in s) {
    if (s.pinnedIds === null) set("pinned_ids", null);
    else if (Array.isArray(s.pinnedIds)) {
      const ids = s.pinnedIds.slice(0, 8).map(x => (typeof x === "string" && x.length <= 80 ? x : null));
      set("pinned_ids", JSON.stringify(ids));
    }
  }

  // the profile effect worn (shared/events.js PROFILE_FX): one owned, or none
  if ("profileFx" in s) {
    if (s.profileFx === null) set("profile_fx", null);
    else if (typeof s.profileFx === "string") {
      if (!parseList(ps.owned_fx).includes(s.profileFx)) throw new Refusal("That effect is not yours to wear", 403);
      set("profile_fx", s.profileFx);
    }
  }
  // the cabinet's frame: a grade at or below the cabinet's own (it is
  // shown no higher than the grade the coins earn, wherever it is drawn),
  // or null for the cabinet's own
  if ("cabFrame" in s) {
    if (s.cabFrame === null) sets.push(`stats = json_remove(COALESCE(stats, '{}'), '$.cabFrame')`);
    else if (Number.isInteger(s.cabFrame) && s.cabFrame >= 0 && s.cabFrame < CABINET_SCORE.grades.length) {
      binds.push(s.cabFrame); sets.push(`stats = json_set(COALESCE(stats, '{}'), '$.cabFrame', ?${binds.length})`);
    }
  }
  // the coin chosen as the app's icon (lib/appIcon.js), or null for none
  if ("iconCoin" in s) {
    if (s.iconCoin === null) sets.push(`stats = json_remove(COALESCE(stats, '{}'), '$.iconCoin')`);
    else if (typeof s.iconCoin === "string" && s.iconCoin.length <= 80) {
      binds.push(s.iconCoin); sets.push(`stats = json_set(COALESCE(stats, '{}'), '$.iconCoin', ?${binds.length})`);
    }
  }

  const stmts = [];
  if (sets.length) stmts.push(db.prepare(`UPDATE player_state SET ${sets.join(", ")} WHERE player_id = ?1`).bind(...binds));
  if (Array.isArray(body?.lock)) {
    for (const op of body.lock.slice(0, 50)) {
      if (typeof op?.id !== "string" || op.id.length > 80) continue;
      stmts.push(db.prepare(`UPDATE coins SET locked = ?3 WHERE player_id = ?1 AND id = ?2`).bind(pid, op.id, op.locked ? 1 : 0));
    }
  }
  if (stmts.length) await db.batch(stmts);
  return { ok: true, applied: stmts.length };
}
