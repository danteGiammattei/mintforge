import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDb, seeded, scripted } from "./d1.js";
import { world, driver, circle, line, scribble } from "./helpers.js";
import { login, register, getAuth, hashPin } from "../server/auth.js";
import { act } from "../server/game.js";
import { loadState, patchCosmetics } from "../server/state.js";
import { readFileSync } from "node:fs";
import { AUTH, SCRIBE, CHESTS, FAVOUR_PER_RARITY, GIFTS, FORGE, SHINY_VALUE_MUL, ENGRAVE, DAILY } from "../shared/tuning.js";
import { forgeCost } from "../shared/economy.js";
import { TITLES, TITLE_RENAMES, PREMIUM_TITLES } from "../src/lib/data.js";
import { TRAITS } from "../shared/sigil.js";
import { coinValue, mkCoin } from "../src/lib/coin.js";
import { onRequestPost as vaultPost } from "../functions/api/vault/index.js";
import { onRequestPost as actPost } from "../functions/api/act.js";

const refuses = (p, status) => assert.rejects(p, e => (assert.equal(e.status, status, e.message), true));
const post = (token, body) => new Request("http://x/api", {
  method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });

/* ─── schema ──────────────────────────────────────────────────────── */

test("migrations 009 and 011 apply cleanly on top of the pre-rebuild schema", async () => {
  const db = makeDb(["tests/fixtures/schema_pre009.sql", "migrations/009_grassroots.sql", "migrations/011_journal_names_wells.sql"]);
  const fresh = makeDb();
  const cols = (d, t) => d.raw.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name).sort();
  for (const t of ["players", "player_state", "coins", "sessions", "scrolls", "chests", "action_log", "login_attempts"]) {
    assert.deepEqual(cols(db, t), cols(fresh, t), `${t} matches schema.sql`);
  }
});

test("schema.sql has every table the code reads", () => {
  const db = makeDb();
  const have = new Set(db.raw.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all().map(r => r.name));
  for (const t of ["players", "player_state", "coins", "sessions", "friends", "duels", "scrolls", "chests", "action_log", "login_attempts"]) {
    assert.ok(have.has(t), `missing table ${t}`);
  }
});

/* ─── accounts ────────────────────────────────────────────────────── */

test("register then login; a wrong PIN is refused", async () => {
  const { db } = await world("alice", 1000);
  assert.equal((await login(db, { username: "ALICE", pin: "4821", ip: "9.9.9.9", now: 2000 })).status, 200);
  assert.equal((await login(db, { username: "alice", pin: "0000", ip: "9.9.9.9", now: 2000 })).status, 401);
  assert.equal((await register(db, { username: "alice", pin: "1234", ip: "9.9.9.9", now: 2000 })).status, 409);
});

test("guessing a PIN locks the username and backs off exponentially", async () => {
  const { db } = await world("bob", 1000);
  let now = 5000, r;
  for (let i = 0; i < AUTH.userFreeFails - 1; i++) {
    r = await login(db, { username: "bob", pin: "0000", ip: "2.2.2.2", now });
    assert.equal(r.status, 401);
  }
  r = await login(db, { username: "bob", pin: "0000", ip: "2.2.2.2", now });
  assert.equal(r.status, 429);
  assert.equal(r.body.retryAfter, AUTH.userLockBaseMs / 1000);
  // even the right PIN waits, and from any address
  assert.equal((await login(db, { username: "bob", pin: "4821", ip: "3.3.3.3", now: now + 1000 })).status, 429);
  // after the lock, one more miss doubles it
  now += AUTH.userLockBaseMs + 1;
  r = await login(db, { username: "bob", pin: "0000", ip: "2.2.2.2", now });
  assert.equal(r.body.retryAfter, AUTH.userLockBaseMs * 2 / 1000);
  // and the right PIN, once the lock lapses, clears the slate
  now += AUTH.userLockBaseMs * 2 + 1;
  assert.equal((await login(db, { username: "bob", pin: "4821", ip: "2.2.2.2", now })).status, 200);
  assert.equal((await login(db, { username: "bob", pin: "0000", ip: "2.2.2.2", now })).status, 401);
});

test("one address trying many usernames is locked out", async () => {
  const { db } = await world("carol", 1000);
  let r;
  for (let i = 0; i < AUTH.ipFreeFails; i++) r = await login(db, { username: "nobody" + i, pin: "0000", ip: "6.6.6.6", now: 7000 });
  assert.equal(r.status, 429);
  assert.equal((await login(db, { username: "carol", pin: "4821", ip: "6.6.6.6", now: 7001 })).status, 429);
  assert.equal((await login(db, { username: "carol", pin: "4821", ip: "7.7.7.7", now: 7001 })).status, 200);
});

test("an old 10k-round hash is upgraded on the next good login", async () => {
  const db = makeDb();
  const hash = await hashPin("4821", "legacysalt", 10000);
  db.raw.prepare(`INSERT INTO players (username, password_hash, password_salt, created_at, last_seen_at) VALUES ('old', ?, 'legacysalt', 1, 1)`).run(hash);
  db.raw.prepare(`INSERT INTO player_state (player_id) VALUES (1)`).run();
  assert.equal((await login(db, { username: "old", pin: "4821", ip: "1.1.1.1", now: 100 })).status, 200);
  const row = db.raw.prepare(`SELECT password_hash, password_salt, pin_iter FROM players WHERE id = 1`).get();
  assert.equal(row.pin_iter, AUTH.pbkdf2Iterations);
  assert.equal(row.password_hash, await hashPin("4821", row.password_salt, AUTH.pbkdf2Iterations));
  assert.equal((await login(db, { username: "old", pin: "4821", ip: "1.1.1.1", now: 200 })).status, 200);
});

test("sessions expire when idle and at their maximum age", async () => {
  const { db, token } = await world("dave", 1000);
  const req = new Request("http://x", { headers: { Authorization: `Bearer ${token}` } });
  const env = { DB: db };
  assert.ok(await getAuth(req, env, 1000 + AUTH.sessionIdleMs - 1));
  assert.equal(await getAuth(req, env, 1000 + AUTH.sessionMaxMs + 1), null);
  assert.equal(db.raw.prepare(`SELECT COUNT(*) n FROM sessions`).get().n, 0, "dead session is removed");

  const b = await world("erin", 1000);
  const req2 = new Request("http://x", { headers: { Authorization: `Bearer ${b.token}` } });
  assert.equal(await getAuth(req2, { DB: b.db }, 1000 + AUTH.sessionIdleMs + 1), null);
});

/* ─── seal ────────────────────────────────────────────────────────── */

test("sealing judges the strokes on the server and stores a scroll", async () => {
  const { db, pid } = await world();
  const go = driver(db, pid, seeded(7));
  const { result, state } = await go("seal", { strokes: circle() });
  assert.ok(result.scroll.rarity >= 0 && result.scroll.rarity <= 5);
  assert.equal(state.scrolls.length, 1);
  assert.deepEqual(Object.keys(state.scrolls[0]).sort(), ["id", "rarity", "seed"], "no hint or trait leaves the server");
  assert.equal(state.stats.sealed, 1);
  assert.ok(state.xp > 0);
});

test("the client cannot name its own rarity", async () => {
  const { db, pid } = await world();
  const go = driver(db, pid, seeded(7));
  const a = await go("seal", { strokes: circle(), rarity: 5, seed: 1, hint: "symmetric" });
  const row = db.raw.prepare(`SELECT rarity FROM scrolls`).get();
  assert.equal(row.rarity, a.result.scroll.rarity);
  // same strokes, same player: the salt has moved, so the seed has too
  const b = await go("seal", { strokes: circle(80, 90, 30) });
  assert.notEqual(a.result.scroll.seed, b.result.scroll.seed);
});

test("sealing is refused: too soon, malformed, off the sheet, too much ink, satchel full", async () => {
  const { db, pid } = await world();
  const rand = seeded(3);
  await act(db, pid, { action: "seal", strokes: circle() }, { now: 1e7, rand });
  await refuses(act(db, pid, { action: "seal", strokes: circle() }, { now: 1e7 + SCRIBE.cooldownMs - 1, rand }), 429);
  const go = driver(db, pid, rand);
  await refuses(go("seal", { strokes: [] }), 400);
  await refuses(go("seal", { strokes: [[{ x: 1, y: 1 }]] }), 400);
  await refuses(go("seal", { strokes: line(0, 0, 400, 10) }), 400);
  const fat = Array.from({ length: 6 }, (_, i) => line(2, 10 + i * 30, 152, 10 + i * 30)[0]);   // 900px of ink
  await refuses(go("seal", { strokes: fat }), 400);
  for (let i = 1; i < SCRIBE.scrollCap; i++) await go("seal", { strokes: scribble(rand) });
  await refuses(go("seal", { strokes: scribble(rand) }), 409);
  assert.equal((await loadState(db, pid)).scrolls.length, SCRIBE.scrollCap);
});

test("drawing the same sigil again pays less, and he says nothing about it", async () => {
  const { db, pid } = await world();
  const go = driver(db, pid, seeded(11));
  let familiar = 0;
  for (let i = 0; i < 6; i++) { const r = await go("seal", { strokes: circle() }); if (r.result.familiar) familiar++; }
  assert.equal(familiar, 5, "every repeat after the first is recognised");
  const hints = db.raw.prepare(`SELECT hint FROM scrolls ORDER BY created_at`).all().slice(1);
  assert.ok(hints.every(h => h.hint === null));
});

/* ─── offer ───────────────────────────────────────────────────────── */

function plant(db, pid, rarity, hint = null, id = "s_" + Math.random().toString(36).slice(2)) {
  db.raw.prepare(`INSERT INTO scrolls (id, player_id, rarity, seed, hint, created_at) VALUES (?, ?, ?, 1, ?, 1)`).run(id, pid, rarity, hint);
  return id;
}

test("offering consumes the scroll, fills the pot and releases a chest when it is covered", async () => {
  const { db, pid } = await world();
  const go = driver(db, pid, scripted(0));            // first roll 0 → he is holding a wooden chest
  const cost = CHESTS.cost[0];
  let chest = null, n = 0, lastLean = 0;
  while (!chest) {
    const { result } = await go("offer", { scrollId: plant(db, pid, 0) });
    n++; chest = result.chest;
    if (!chest) { assert.ok(result.lean >= lastLean, "he only leans further out"); lastLean = result.lean; }
  }
  assert.equal(n, Math.ceil(cost / FAVOUR_PER_RARITY[0]));
  assert.equal(chest.tier, 0);
  const s = await loadState(db, pid);
  assert.equal(s.scrolls.length, 0);
  assert.equal(s.chests.length, 1);
  assert.equal(s.stats.offered, n);
  assert.ok(!("favour" in s) && !("chestCost" in s) && !("chest_cost" in s), "the price never reaches the client");
});

test("a scroll cannot be offered twice, nor someone else's at all", async () => {
  const a = await world("ann");
  const id = plant(a.db, a.pid, 2);
  const go = driver(a.db, a.pid, seeded(5));
  await go("offer", { scrollId: id });
  await refuses(go("offer", { scrollId: id }), 404);
  const other = await register(a.db, { username: "thief", pin: "1111", ip: "8.8.8.8", now: 5 });
  const id2 = plant(a.db, a.pid, 5);
  await refuses(act(a.db, other.body.player.id, { action: "offer", scrollId: id2 }, { now: 9e9, rand: seeded(1) }), 404);
});

test("he hints only at the trait that lifted the scroll, and never at a plain one", async () => {
  const { db, pid } = await world();
  const go = driver(db, pid, () => 0);                // every chance roll succeeds
  const plain = await go("offer", { scrollId: plant(db, pid, 0, null) });
  assert.equal(plain.result.hint, null);
  const lifted = await go("offer", { scrollId: plant(db, pid, 2, "symmetric") });
  assert.equal(lifted.result.hint, TRAITS.symmetric.hint);
  const quiet = driver(db, pid, () => 0.999);         // …and sometimes he keeps it to himself
  assert.equal((await quiet("offer", { scrollId: plant(db, pid, 2, "woven") })).result.hint, null);
});

test("overpayment carries into the next chest", async () => {
  const { db, pid } = await world();
  const go = driver(db, pid, scripted(0, 0.99, 0, 0, 0));   // wooden; not impressed; next is wooden too
  const big = await go("offer", { scrollId: plant(db, pid, 4) });   // 20 favour into an 8 pot
  assert.equal(big.result.chest.tier, 0);
  const next = await go("offer", { scrollId: plant(db, pid, 0) });  // 12 carried + 1 ≥ 8
  assert.ok(next.result.chest, "the carried favour pays for the next one");
});

/* ─── gifts ───────────────────────────────────────────────────────── */

test("the first visit brings a free chest, once", async () => {
  const { db, pid } = await world();
  const go = driver(db, pid, seeded(2));
  const first = await go("visit");
  assert.equal(first.result.gift.type, "chest");
  assert.equal(first.state.chests.length, 1);
  const again = await go("visit");
  assert.equal(again.result.gift, null);
  assert.equal(again.state.chests.length, 1);
});

test("later gifts wait for their conditions", async () => {
  const { db, pid } = await world();
  const go = driver(db, pid, seeded(2));
  await go("visit");
  db.raw.prepare(`UPDATE player_state SET stats = json_set(stats, '$.brushed', 3) WHERE player_id = ?`).run(pid);
  const g = await go("visit");
  assert.deepEqual([g.result.gift.type, g.result.gift.level], ["brush", 1]);
  assert.equal(g.state.brushLevel, 1);
  // a title needs its level as well as its counter
  db.raw.prepare(`UPDATE player_state SET stats = json_set(stats, '$.chests', 99, '$.offered', 9) WHERE player_id = ?`).run(pid);
  assert.equal((await go("visit")).result.gift, null);
  db.raw.prepare(`UPDATE player_state SET xp = 220 * 81 WHERE player_id = ?`).run(pid);   // level 10
  const t = await go("visit");
  assert.deepEqual([t.result.gift.type, t.result.gift.id], ["title", "goldspun"]);
  assert.deepEqual(t.state.ownedTitles, ["goldspun"]);
});

test("every gift names something that exists", async () => {
  const { db, pid } = await world();
  db.raw.prepare(`UPDATE player_state SET xp = 220 * 10000, stats = '{"visits":999,"sealed":999,"offered":999,"chests":999,"brushed":999,"gambles":999}' WHERE player_id = ?`).run(pid);
  const go = driver(db, pid, seeded(2));
  const got = [];
  for (let i = 0; i < GIFTS.length + 2; i++) { const r = await go("visit"); if (r.result.gift) got.push(r.result.gift.name); }
  assert.equal(got.length, GIFTS.length);
  const s = await loadState(db, pid);
  assert.equal(s.brushLevel, 4);
  assert.equal(s.ownedFrames.length, 4);
  assert.equal(s.ownedTitles.length, 5);
});

/* ─── chest → coin → vault → marks ────────────────────────────────── */

test("the full loop: chest opens to a dusty coin, brushing moves it to the vault, selling pays its value", async () => {
  const { db, pid } = await world();
  const go = driver(db, pid, seeded(9));
  const v = await go("visit");
  const chestId = v.state.chests[0].id;
  const o = await go("open", { chestId });
  assert.equal(o.state.chests.length, 0);
  assert.equal(o.state.coins.length, 0, "not in the vault yet");
  assert.equal(o.state.dusty.length, 1);
  await refuses(go("open", { chestId }), 404);
  const coinId = o.result.coin.id;
  await refuses(go("sell", { coinIds: [coinId] }), 409);          // dusty coins cannot be sold
  await refuses(go("gamble", { game: "toss", coinIds: [coinId] }), 409);
  const b = await go("brush", { coinId });
  assert.equal(b.state.dusty.length, 0);
  assert.equal(b.state.coins.length, 1);
  assert.equal(b.state.stats.brushed, 1);
  await refuses(go("brush", { coinId }), 404);
  const c = b.state.coins[0];
  const expect = coinValue(Object.assign(mkCoin(c.seed, 1, c.metalIdx), { shiny: c.shiny, rarity: c.rarity }));
  const s = await go("sell", { coinIds: [coinId, "c_made_up"] });
  assert.equal(s.result.marks, expect);
  assert.equal(s.state.marks, expect);
  assert.equal(s.state.coins.length, 0);
});

test("locked coins are not sold", async () => {
  const { db, pid } = await world();
  db.raw.prepare(`INSERT INTO coins (id, player_id, seed, metal_idx, shiny, locked, rarity, acquired_at) VALUES ('c1', ?, 5, 2, 0, 1, 0, 1)`).run(pid);
  await refuses(driver(db, pid, seeded(1))("sell", { coinIds: ["c1"] }), 409);
});

/* ─── tavern ──────────────────────────────────────────────────────── */

function coin(db, pid, id, metal, locked = 0) {
  db.raw.prepare(`INSERT INTO coins (id, player_id, seed, metal_idx, shiny, locked, rarity, acquired_at) VALUES (?, ?, 5, ?, 0, ?, 0, 1)`).run(id, pid, metal, locked);
}

test("coin toss: a win mints the next metal, a loss takes the coin", async () => {
  const { db, pid } = await world();
  coin(db, pid, "a", 2); coin(db, pid, "b", 2);
  const win = await driver(db, pid, scripted(0.1))("gamble", { game: "toss", coinIds: ["a"] });
  assert.equal(win.result.won, true);
  assert.equal(win.result.minted[0].metalIdx, 3);
  const loss = await driver(db, pid, scripted(0.9))("gamble", { game: "toss", coinIds: ["b"] });
  assert.equal(loss.result.won, false);
  assert.deepEqual(loss.state.coins.map(c => c.metalIdx), [3]);
  assert.equal(loss.state.stats.gambles, 2);
});

test("crucible wants three of one metal; losing keeps exactly one", async () => {
  const { db, pid } = await world();
  coin(db, pid, "a", 1); coin(db, pid, "b", 1); coin(db, pid, "c", 1); coin(db, pid, "d", 4);
  const go = driver(db, pid, scripted(0.9, 0.5));
  await refuses(go("gamble", { game: "crucible", coinIds: ["a", "b", "d"] }), 400);
  await refuses(go("gamble", { game: "crucible", coinIds: ["a", "b"] }), 400);
  const r = await driver(db, pid, scripted(0.9, 0.5))("gamble", { game: "crucible", coinIds: ["a", "b", "c"] });
  assert.equal(r.result.won, false);
  assert.deepEqual(r.result.kept, ["b"]);
  assert.deepEqual(r.state.coins.map(c => c.id).sort(), ["b", "d"]);
});

test("roulette: locked coins cannot be staked, the top metal does not overflow", async () => {
  const { db, pid } = await world();
  coin(db, pid, "locked", 3, 1); coin(db, pid, "top", 8);
  await refuses(driver(db, pid, seeded(1))("gamble", { game: "roulette", coinIds: ["locked"] }), 409);
  const r = await driver(db, pid, scripted(0.95))("gamble", { game: "roulette", coinIds: ["top"] });   // up2
  assert.equal(r.result.outcome, "up2");
  assert.equal(r.result.minted[0].metalIdx, 8);
});

/* ─── retries ─────────────────────────────────────────────────────── */

test("a retried request with the same op id is answered once", async () => {
  const { db, pid } = await world();
  const id = plant(db, pid, 1);
  const body = { action: "offer", scrollId: id, opId: "op_12345678" };
  const a = await act(db, pid, body, { now: 1e7, rand: seeded(4) });
  const b = await act(db, pid, body, { now: 1e7 + 5, rand: seeded(99) });
  assert.deepEqual(b.result, a.result);
  assert.equal(b.replayed, true);
  assert.equal((await loadState(db, pid)).stats.offered, 1);
  // a refused action can be retried under the same id
  const again = { action: "offer", scrollId: "nope", opId: "op_abcdefgh" };
  await refuses(act(db, pid, again, { now: 1e7, rand: seeded(4) }), 404);
  await refuses(act(db, pid, again, { now: 1e7, rand: seeded(4) }), 404);
});

/* ─── cheating ────────────────────────────────────────────────────── */

test("the vault endpoint refuses fabricated coins and balances", async () => {
  const { db, token, pid } = await world();
  const env = { DB: db };
  const fake = { id: "c_fake", seed: 1, metalIdx: 8, rarity: 5, shiny: true };
  for (const body of [{ add: [fake] }, { state: { marks: 999999 } }, { state: { xp: 1e9 } }, { state: { brushLevel: 4 } },
                      { state: { ownedFrames: ["astrarium"] } }, { remove: ["x"] }]) {
    const r = await vaultPost({ request: post(token, body), env });
    assert.equal(r.status, 403, JSON.stringify(body));
  }
  const s = await loadState(db, pid);
  assert.equal(s.coins.length + s.dusty.length, 0);
  assert.equal(s.marks, 0);
  assert.equal(s.xp, 0);
  assert.equal((await vaultPost({ request: post("nottoken", { state: { bio: "x" } }), env })).status, 401);
});

test("the action endpoint takes no values from the client", async () => {
  const { db, token, pid } = await world();
  const env = { DB: db };
  for (const body of [{ action: "mint", coin: {} }, { action: "addMarks", n: 5 }, { action: "__proto__" }, { action: "toString" }, {}]) {
    assert.equal((await actPost({ request: post(token, body), env })).status, 400, JSON.stringify(body));
  }
  // opening a chest you do not have yields nothing
  assert.equal((await actPost({ request: post(token, { action: "open", chestId: "k_fake", tier: 4 }), env })).status, 404);
  assert.equal((await loadState(db, pid)).dusty.length, 0);
});

test("cosmetics: only what you have earned can be worn", async () => {
  const { db, pid } = await world();
  await refuses(patchCosmetics(db, pid, { state: { frame: "astrarium" } }), 403);   // premium, not owned
  await refuses(patchCosmetics(db, pid, { state: { frame: "void" } }), 403);        // level 50
  await refuses(patchCosmetics(db, pid, { state: { selectedTitle: "Eternal Forge" } }), 403);
  await refuses(patchCosmetics(db, pid, { state: { selectedTitle: "Goldspun" } }), 403);
  await patchCosmetics(db, pid, { state: { frame: "stone", selectedTitle: "Novice Scribe", bio: "x".repeat(500), pinnedIds: ["a", null, 7] } });
  const s = await loadState(db, pid);
  assert.equal(s.bio.length, 120);
  assert.deepEqual(s.pinnedIds, ["a", null, null]);
});

/* ─── the forge ───────────────────────────────────────────────────── */

test("a strike costs marks, may shine the coin, and never harms it", async () => {
  const { db, pid } = await world();
  coin(db, pid, "a", 3);                                           // gold, common
  const plain = coinValue(Object.assign(mkCoin(5, 1, 3), { rarity: 0 }));
  const cost = forgeCost(plain);
  await refuses(driver(db, pid, seeded(1))("forge", { coinId: "a" }), 402);       // no marks yet
  db.raw.prepare(`UPDATE player_state SET marks = ? WHERE player_id = ?`).run(cost * 2 + 7, pid);

  const miss = await driver(db, pid, scripted(0.99))("forge", { coinId: "a" });
  assert.deepEqual([miss.result.shiny, miss.result.cost], [false, cost]);
  assert.equal(miss.state.marks, cost + 7);
  assert.equal(miss.state.coins[0].shiny, false);

  const hit = await driver(db, pid, scripted(0.01))("forge", { coinId: "a" });
  assert.equal(hit.result.shiny, true);
  assert.equal(hit.state.marks, 7);
  assert.equal(hit.state.coins[0].shiny, true);
  assert.deepEqual([hit.state.stats.struck, hit.state.stats.shined], [2, 1]);

  await refuses(driver(db, pid, seeded(1))("forge", { coinId: "a" }), 409);       // already shines
  assert.equal((await loadState(db, pid)).marks, 7, "a refused strike costs nothing");
  await refuses(driver(db, pid, seeded(1))("forge", { coinId: "nope" }), 404);
});

test("the forge cannot be run at a profit", () => {
  // expected gain from a strike on a coin worth V is chance × (shiny multiple − 1) × V
  assert.ok(FORGE.shinyChance * (SHINY_VALUE_MUL - 1) < FORGE.costMul);
  for (const v of [1, 50, 199, 200, 5000, 90000]) {
    assert.ok(forgeCost(v) >= FORGE.minCost);
    assert.ok(forgeCost(v) > FORGE.shinyChance * (SHINY_VALUE_MUL - 1) * v, `value ${v}`);
  }
});

/* ─── titles ──────────────────────────────────────────────────────── */

test("old titles read as their new names, everywhere a title is read", async () => {
  const { db, pid } = await world("oldhand");
  assert.equal((await loadState(db, pid)).selectedTitle, "Novice Scribe");
  for (const [old, now] of Object.entries(TITLE_RENAMES)) {
    db.raw.prepare(`UPDATE player_state SET selected_title = ? WHERE player_id = ?`).run(old, pid);
    assert.equal((await loadState(db, pid)).selectedTitle, now);
    assert.ok(!TITLES.includes(old), `${old} is retired`);
  }
  // no title, old or new, still speaks of the game that was removed
  const all = [...TITLES, ...PREMIUM_TITLES.map(t => t.label)].join(" ");
  assert.ok(!/dig|hunt|reaper|tarot|shovel|pick|ore\b|smith|seeker/i.test(all), all);
});

test("migration 010 rewrites stored titles and can be run twice", async () => {
  const { db, pid } = await world("mig");
  db.raw.prepare(`UPDATE player_state SET selected_title = 'Bronzesmith' WHERE player_id = ?`).run(pid);
  const sql = readFileSync(new URL("../migrations/010_retheme_titles.sql", import.meta.url), "utf8");
  db.raw.exec(sql); db.raw.exec(sql);
  assert.equal(db.raw.prepare(`SELECT selected_title t FROM player_state WHERE player_id = ?`).get(pid).t, "Sigil-Wright");
});

test("offering several scrolls at once is the same as offering them in turn", async () => {
  const a = await world("one"), b = await world("many");
  const rar = [0, 2, 1, 4, 0, 3];
  const idsA = rar.map(r => plant(a.db, a.pid, r, "closed")), idsB = rar.map(r => plant(b.db, b.pid, r, "closed"));
  const goA = driver(a.db, a.pid, seeded(77));
  let chestsA = 0;
  for (const id of idsA) { const r = await goA("offer", { scrollId: id }); chestsA += r.result.chests.length; }
  const all = await driver(b.db, b.pid, seeded(77))("offer", { scrollIds: [...idsB, idsB[0], "s_not_mine"] });
  assert.equal(all.result.offered, rar.length);
  assert.equal(all.result.chests.length, chestsA);
  const sa = await loadState(a.db, a.pid), sb = all.state;
  const tiers = st => st.chests.map(c => c.tier).sort();     // chests from one handful share a timestamp
  assert.deepEqual([sb.xp, sb.lean, tiers(sb), sb.stats.offered], [sa.xp, sa.lean, tiers(sa), sa.stats.offered]);
  assert.equal(sb.scrolls.length, 0);
  await refuses(driver(b.db, b.pid, seeded(1))("offer", { scrollIds: [] }), 400);
});

/* ─── journal, names, wells, the daily visit ──────────────────────── */

test("the journal remembers kinds of coin after they are sold, and counts what was held before it existed", async () => {
  const { db, pid } = await world();
  coin(db, pid, "old", 4);                                         // held from before the journal: platinum, common
  const go = driver(db, pid, seeded(9));
  const v = await go("visit");
  const o = await go("open", { chestId: v.state.chests[0].id });
  const b = await go("brush", { coinId: o.result.coin.id });
  const c = o.result.coin, k = `${c.metalIdx}:${c.rarity}`;
  assert.equal(b.state.journal.c[k], 1);
  assert.equal(b.state.journal.c["4:0"], 1);
  assert.ok(b.state.journal.best > 0);
  const s = await go("sell", { coinIds: [c.id, "old"] });
  assert.equal(s.state.journal.c[k], 1, "selling does not un-find it");
  assert.equal(s.state.journal.c["4:0"], undefined, "a coin never cleaned here is only counted while held");
});

test("engraving costs marks, clearing is free, and only sensible names are cut", async () => {
  const { db, pid } = await world();
  coin(db, pid, "a", 2);
  const go = driver(db, pid, seeded(1));
  await refuses(go("engrave", { coinId: "a", name: "The Rabbit" }), 402);
  db.raw.prepare(`UPDATE player_state SET marks = ? WHERE player_id = ?`).run(ENGRAVE.cost + 5, pid);
  for (const bad of ["<b>x</b>", "x".repeat(ENGRAVE.maxLength + 1), "emoji 🐇", 7, null]) await refuses(go("engrave", { coinId: "a", name: bad }), 400);
  const r = await go("engrave", { coinId: "a", name: "  the   rabbit " });
  assert.equal(r.result.name, "THE RABBIT");
  assert.equal(r.state.coins[0].nick, "THE RABBIT");
  assert.equal(r.state.marks, 5);
  await refuses(go("engrave", { coinId: "a", name: "the rabbit" }), 409);
  const cleared = await go("engrave", { coinId: "a", name: "" });
  assert.equal(cleared.state.coins[0].nick, undefined);
  assert.equal(cleared.state.marks, 5);
  await refuses(go("engrave", { coinId: "nope", name: "x" }), 404);
});

test("a deeper inkwell is bought with marks, in order, and lets a sheet take more ink", async () => {
  const { db, pid } = await world();
  const go = driver(db, pid, seeded(3));
  const long = Array.from({ length: 4 }, (_, i) => line(4, 20 + i * 40, 150, 20 + i * 40, 30, i * 3000)[0]);   // 584px of ink
  await refuses(go("seal", { strokes: long }), 400);
  await refuses(go("well"), 402);
  db.raw.prepare(`UPDATE player_state SET marks = ? WHERE player_id = ?`).run(SCRIBE.wells[1].cost + SCRIBE.wells[2].cost - 1, pid);
  const w = await go("well");
  assert.deepEqual([w.result.level, w.state.inkMax, w.state.marks], [1, SCRIBE.wells[1].ink, SCRIBE.wells[2].cost - 1]);
  await refuses(go("well"), 402);                                   // one mark short of the next
  assert.equal((await go("seal", { strokes: long })).state.scrolls.length, 1);
  db.raw.prepare(`UPDATE player_state SET marks = 1e9, well_level = ? WHERE player_id = ?`).run(SCRIBE.wells.length - 1, pid);
  await refuses(go("well"), 409);
});

test("the daily visit: once a day, growing over a streak, a chest on the seventh, reset by a long absence", async () => {
  const { db, pid } = await world();
  let now = 1e9;
  const visit = async () => (await act(db, pid, { action: "visit" }, { now, rand: seeded(1) })).result.gift;
  assert.equal((await visit()).type, "chest");                      // the welcome chest is day one
  now += 3600e3; assert.equal(await visit(), null);
  const got = [];
  for (let day = 2; day <= 8; day++) { now += DAILY.gapMs + 60e3; const g = await visit(); got.push(g.type === "chest" ? "chest" : g.n); assert.equal(g.streak, day); }
  assert.deepEqual(got, [DAILY.marks[1], DAILY.marks[2], DAILY.marks[3], DAILY.marks[4], DAILY.marks[5], "chest", DAILY.marks[0]]);
  now += 1000; assert.equal(await visit(), null, "only one a day");
  now += DAILY.breakMs + 1; const back = await visit();
  assert.deepEqual([back.streak, back.n], [1, DAILY.marks[0]]);
  const s = await loadState(db, pid, now);
  assert.equal(s.streak, 1);
  assert.ok(!("daily" in s.stats));
});
