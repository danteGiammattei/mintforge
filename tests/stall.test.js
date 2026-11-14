import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDb } from "./d1.js";
import { register } from "../server/auth.js";
import { act } from "../server/game.js";
import { rollStall } from "../shared/stall.js";
import { STALL } from "../shared/tuning.js";
import { mkCoin, coinValue } from "../src/lib/coin.js";
import { localDay } from "../shared/economy.js";

const T0 = Date.UTC(2026, 10, 15, 3);
async function setup(marks = 100000) {
  const db = makeDb();
  const pid = (await register(db, { username: "shopper", pin: "4821", ip: "1.1.1.1", now: T0 })).body.player.id;
  await db.prepare(`UPDATE player_state SET marks = ?2 WHERE player_id = ?1`).bind(pid, marks).run();
  const go = (body, now = T0) => act(db, pid, body, { now });
  const marksOf = async () => (await db.prepare(`SELECT marks FROM player_state WHERE player_id = ?1`).bind(pid).first()).marks;
  return { db, pid, go, marksOf };
}

test("the stall: five wares, the same all day, new the next; never an astral or a mythic", () => {
  const a = rollStall(7, 100, {}), b = rollStall(7, 100, {}), c = rollStall(7, 101, {});
  assert.equal(a.length, 5); assert.deepEqual(a, b); assert.notDeepEqual(a, c);
  assert.equal(a[0].kind, "chest"); assert.equal(a[1].kind, "coin"); assert.ok(a[4].featured);
  for (let d = 0; d < 400; d++) for (const w of rollStall(3, d, {})) if (w.kind === "coin") { assert.ok(w.coin.metalIdx <= 9); assert.ok(w.coin.rarity <= 4); }
});

test("prices: a coin costs more than it sells for, a chest more than its coins", () => {
  for (let d = 0; d < 300; d++) for (const w of rollStall(11, d, {})) {
    if (w.kind === "coin") assert.ok(w.price > coinValue(mkCoin(w.coin.seed, 1, w.coin.metalIdx, undefined, w.coin.rarity)));
    if (w.kind === "chest") assert.ok(w.price >= STALL.chestPrice[w.tier] * STALL.featured.discount - 5);
  }
});

test("the coin slots hunt the journal's gaps", () => {
  // every kind but one filled: the coin slots mostly offer that one
  const c = {}; for (let m = 0; m <= 10; m++) for (let r = 0; r <= 5; r++) c[`${m}:${r}`] = 1;
  delete c["4:2"];
  let hits = 0, n = 0;
  for (let d = 0; d < 200; d++) for (const w of rollStall(5, d, { c }).slice(1, 3)) { n++; if (w.coin.metalIdx === 4 && w.coin.rarity === 2) hits++; }
  assert.ok(hits / n > 0.6, `${hits}/${n}`);
});

test("buying: marks taken, the ware handed over, each slot once", async () => {
  const { db, pid, go, marksOf } = await setup();
  const { result: s } = await go({ action: "stall" });
  assert.equal(s.wares.length, 5); assert.equal(s.day, localDay(T0, 0));
  const before = await marksOf();
  const r0 = (await go({ action: "buy", slot: 0, day: s.day })).result;
  assert.equal(await marksOf(), before - s.wares[0].price);
  assert.ok(await db.prepare(`SELECT 1 FROM chests WHERE id = ?1 AND player_id = ?2`).bind(r0.chestId, pid).first());
  const r1 = (await go({ action: "buy", slot: 1, day: s.day })).result;
  const coin = await db.prepare(`SELECT metal_idx, rarity, dusty FROM coins WHERE id = ?1`).bind(r1.coinId).first();
  assert.deepEqual([coin.metal_idx, coin.rarity, coin.dusty], [s.wares[1].coin.metalIdx, s.wares[1].coin.rarity, 1]);
  await assert.rejects(go({ action: "buy", slot: 0, day: s.day }), /sold/);
  const again = (await go({ action: "stall" })).result;
  assert.deepEqual(again.wares.map(w => w.sold), [true, true, false, false, false]);
  // tomorrow, a new stall and nothing sold
  const next = (await go({ action: "stall" }, T0 + 86400e3)).result;
  assert.ok(next.wares.every(w => !w.sold));
  await assert.rejects(go({ action: "buy", slot: 2, day: s.day }, T0 + 86400e3), /packed/);
});

test("buying without the marks takes nothing and leaves the slot for sale", async () => {
  const { go, marksOf } = await setup(3);
  const { result: s } = await go({ action: "stall" });
  await assert.rejects(go({ action: "buy", slot: 4, day: s.day }), /Not enough/);
  assert.equal(await marksOf(), 3);
  assert.ok(!(await go({ action: "stall" })).result.wares[4].sold);
});

test("an oddity bought is owned, and the stall stops offering it", async () => {
  const { db, pid, go } = await setup();
  let d = 0, s;
  for (; d < 60; d++) { s = (await go({ action: "stall" }, T0 + d * 86400e3)).result; if (s.wares[3].kind === "title") break; }
  const w = s.wares[3];
  await go({ action: "buy", slot: 3, day: s.day }, T0 + d * 86400e3);
  const owned = JSON.parse((await db.prepare(`SELECT owned_titles FROM player_state WHERE player_id = ?1`).bind(pid).first()).owned_titles);
  assert.ok(owned.includes(w.id));
  for (let k = 1; k < 30; k++) for (const x of (await go({ action: "stall" }, T0 + (d + k) * 86400e3)).result.wares) assert.notEqual(x.id, w.id);
});
