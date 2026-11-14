import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDb, seeded } from "./d1.js";
import { register } from "../server/auth.js";
import { enterRaffle, raffleState, settleDue, nextDraw, basePot, pickWinner } from "../server/raffle.js";
import { RAFFLE } from "../shared/tuning.js";
import { mkCoin, coinValue } from "../src/lib/coin.js";

const T0 = Date.UTC(2026, 10, 15, 3);            // 03:00 UTC: today's draw is at 10:00
async function setup() {
  const db = makeDb();
  const a = (await register(db, { username: "rafa", pin: "4821", ip: "1.1.1.1", now: T0 })).body.player.id;
  const b = (await register(db, { username: "bea", pin: "4821", ip: "1.1.1.2", now: T0 })).body.player.id;
  const coin = (pid, id, metal, rarity, locked = 0) => db.prepare(
    `INSERT INTO coins (id, player_id, seed, metal_idx, shiny, locked, rarity, acquired_at, dusty) VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, ?7, 0)`
  ).bind(id, pid, 1000 + id.length * 7, metal, locked, rarity, T0).run();
  await coin(a, "a1", 0, 0); await coin(a, "a2", 0, 3); await coin(a, "a3", 2, 1); await coin(a, "a4", 0, 5, 1);
  await coin(b, "b1", 0, 2);
  const marks = async pid => (await db.prepare(`SELECT marks FROM player_state WHERE player_id = ?1`).bind(pid).first()).marks;
  const left = async pid => (await db.prepare(`SELECT id FROM coins WHERE player_id = ?1 ORDER BY id`).bind(pid).all()).results.map(r => r.id);
  return { db, a, b, marks, left };
}
const worth = (seed, metal, rarity) => coinValue(Object.assign(mkCoin(seed, 1, metal), { rarity }));

test("draw times: today's at the hour if it is still to come, else tomorrow's", () => {
  assert.equal(nextDraw(T0), Date.UTC(2026, 10, 15, RAFFLE.drawUtcHour));
  assert.equal(nextDraw(Date.UTC(2026, 10, 15, RAFFLE.drawUtcHour)), Date.UTC(2026, 10, 16, RAFFLE.drawUtcHour));
});

test("entering: each coin goes to its own metal's draw, worth entries by rarity; locked ones stay", async () => {
  const { db, a, left } = await setup();
  const r = await enterRaffle(db, a, { coinIds: ["a1", "a2", "a3", "a4"] }, { now: T0 });
  assert.deepEqual(r.entered.sort(), ["a1", "a2", "a3"]);
  assert.equal(r.entries, 1 + 8 + 2);
  assert.deepEqual(await left(a), ["a4"]);
  const copper = r.raffle.tiers[0], silver = r.raffle.tiers[2];
  assert.equal(copper.mine, 9); assert.equal(silver.mine, 2);
  assert.equal(copper.pot, basePot(0) + worth(1014, 0, 0) + worth(1014, 0, 3));
  await assert.rejects(enterRaffle(db, a, { coinIds: ["a4"] }, { now: T0 }), /None of those/);
});

test("the draw: one winner by entries takes the pot, once, however many look", async () => {
  const { db, a, b, marks } = await setup();
  await enterRaffle(db, a, { coinIds: ["a1"] }, { now: T0 });
  await enterRaffle(db, b, { coinIds: ["b1"] }, { now: T0 });
  const before = [await marks(a), await marks(b)];
  const after = nextDraw(T0) + 1;
  // nothing is drawn before its time
  await settleDue(db, nextDraw(T0) - 1);
  assert.equal((await db.prepare(`SELECT COUNT(*) AS n FROM raffle_draws`).first()).n, 0);
  // looked at twice
  await settleDue(db, after, seeded(3)); await settleDue(db, after, seeded(9));
  const s = await raffleState(db, a, { now: after + 5 });
  assert.equal(s.last.length, 1);
  const pot = s.last[0].pot, gained = [(await marks(a)) - before[0], (await marks(b)) - before[1]];
  assert.equal(gained[0] + gained[1], pot, "paid once");
  assert.ok(gained.includes(pot));
  assert.equal(s.tiers[0].entries, 0, "a new draw has begun");
});

test("weighting: a mythic's 32 entries against a common's 1", () => {
  let wins = 0, r = seeded(1);
  for (let i = 0; i < 3300; i++) if (pickWinner([{ player_id: 1, n: 1 }, { player_id: 2, n: 32 }], r) === 2) wins++;
  assert.ok(Math.abs(wins / 3300 - 32 / 33) < 0.02);
});
