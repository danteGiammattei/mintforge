import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDb, seeded } from "./d1.js";
import { register } from "../server/auth.js";
import { warMove, dealRound, cardValue } from "../server/war.js";
import { WAR } from "../shared/tuning.js";

const T0 = 50_000_000;
async function table() {
  const db = makeDb();
  const a = (await register(db, { username: "hostess", pin: "4821", ip: "1.1.1.1", now: T0 })).body.player.id;
  const b = (await register(db, { username: "guesty", pin: "4821", ip: "1.1.1.2", now: T0 })).body.player.id;
  await db.prepare(`INSERT INTO friends (player_id, friend_id, created_at) VALUES (?1, ?2, ?3)`).bind(a, b, T0).run();
  const coin = (pid, id, rarity, extra = {}) => db.prepare(
    `INSERT INTO coins (id, player_id, seed, metal_idx, shiny, locked, rarity, acquired_at, dusty, nickname)
     VALUES (?1, ?2, ?3, 2, 0, ?4, ?5, ?6, 0, ?7)`).bind(id, pid, 1234, extra.locked ? 1 : 0, rarity, T0, extra.nick || null).run();
  await coin(a, "c_a1", 3, { nick: "OLD SOL" });
  await coin(a, "c_a2", 1, { locked: true });
  await coin(b, "c_b1", 2);
  await coin(b, "c_b2", 4);
  const ids = async pid => (await db.prepare(`SELECT id FROM coins WHERE player_id = ?1 ORDER BY id`).bind(pid).all()).results.map(r => r.id);
  const go = (pid, body, now = T0 + 1000) => warMove(db, pid, body, { now, rand: seeded(7) });
  // set the deck so the next cards dealt are these (host first, guest second, …)
  const stack = async (tid, cards) => {
    const rest = Array.from({ length: 52 }, (_, i) => i).filter(n => !cards.includes(n));
    await db.prepare(`UPDATE war_tables SET deck = ?2 WHERE id = ?1`).bind(tid, JSON.stringify([...cards, ...rest])).run();
  };
  return { db, a, b, ids, go, stack };
}
const refused = async (p, re) => { await assert.rejects(p, e => re.test(e.message)); };

test("cards: ace is high, a tie turns to war with three face down", () => {
  assert.equal(cardValue(0), 14); assert.equal(cardValue(12), 13); assert.equal(cardValue(14), 2);
  const r = dealRound([12, 11], 0, false);
  assert.equal(r.entry.result, "host");
  const w = dealRound([0, 1, 2, 5, 9, 9, 9, 6], 0, true);
  assert.equal(w.pos, 8); assert.equal(w.entry.down, 3); assert.equal(w.entry.host, 5); assert.equal(w.entry.guest, 6);
  assert.equal(dealRound([1, 2, 3], 0, true), null);
});

test("war: stake, sit, flip — the winner holds both coins, name and all", async () => {
  const { a, b, ids, go, stack } = await table();
  const { result: { tableId } } = await go(a, { op: "invite", friend: "GUESTY", coinId: "c_a1" });
  assert.deepEqual(await ids(a), ["c_a2"], "the host's stake is off the shelf");

  await refused(go(b, { op: "join", tableId, coinId: "c_b1" }), /at least as rare/);
  await go(b, { op: "join", tableId, coinId: "c_b2" });
  assert.deepEqual(await ids(b), ["c_b1"]);
  await stack(tableId, [12, 11]);                         // king beats queen: the host wins

  let r = await go(a, { op: "flip", tableId });
  assert.equal(r.war.table.youFlipped, true); assert.equal(r.war.table.theyFlipped, false);
  assert.equal(r.war.table.log.length, 0, "nothing shown until both flip");
  r = await go(b, { op: "flip", tableId });
  assert.equal(r.war.table, null);
  assert.equal(r.war.recent[0].outcome, "lost");
  assert.equal(r.war.recent[0].log[0].mine, 11);

  assert.deepEqual(await ids(a), ["c_a1", "c_a2", "c_b2"]);
  assert.deepEqual(await ids(b), ["c_b1"]);
});

test("war: a tie goes to war and the guest can take it", async () => {
  const { a, b, ids, go, stack } = await table();
  const { result: { tableId } } = await go(a, { op: "invite", friend: "guesty", coinId: "c_a1" });
  await go(b, { op: "join", tableId, coinId: "c_b2" });
  await stack(tableId, [4, 17, /* war */ 1, 2, 3, 5, 20, 21, 22, 12]);   // 5 v 5, then 6 v king
  await go(a, { op: "flip", tableId });
  let r = await go(b, { op: "flip", tableId });
  assert.equal(r.war.table.log[0].result, "tie");
  assert.equal(r.war.table.round, 1);
  await go(b, { op: "flip", tableId });
  r = await go(a, { op: "flip", tableId });
  assert.equal(r.war.recent[0].outcome, "lost");
  assert.equal(r.war.recent[0].log[1].war, true);
  assert.deepEqual(await ids(b), ["c_a1", "c_b1", "c_b2"]);
});

test("war: declined, cancelled, unanswered and abandoned tables send the coins home", async () => {
  const { a, b, ids, go } = await table();
  let { result: { tableId } } = await go(a, { op: "invite", friend: "guesty", coinId: "c_a1" });
  await go(b, { op: "decline", tableId });
  assert.deepEqual(await ids(a), ["c_a1", "c_a2"]);

  ({ result: { tableId } } = await go(a, { op: "invite", friend: "guesty", coinId: "c_a1" }));
  await go(a, { op: "cancel", tableId });
  assert.deepEqual(await ids(a), ["c_a1", "c_a2"]);

  ({ result: { tableId } } = await go(a, { op: "invite", friend: "guesty", coinId: "c_a1" }));
  const later = T0 + 1000 + WAR.inviteMs + 1;
  await refused(go(b, { op: "join", tableId, coinId: "c_b2" }, later), /lapsed/);
  assert.deepEqual(await ids(a), ["c_a1", "c_a2"]);

  ({ result: { tableId } } = await go(a, { op: "invite", friend: "guesty", coinId: "c_a1" }, later));
  await go(b, { op: "join", tableId, coinId: "c_b2" }, later);
  await go(a, { op: "flip", tableId }, later);
  const r = await go(a, { op: "flip", tableId }, later + WAR.idleMs + 1).catch(e => e);
  assert.match(String(r.message || ""), /closed/);
  assert.deepEqual(await ids(a), ["c_a1", "c_a2"]);
  assert.deepEqual(await ids(b), ["c_b1", "c_b2"]);
});

test("war: only friends, only free coins, one table at a time", async () => {
  const { a, b, go } = await table();
  await refused(go(b, { op: "invite", friend: "hostess", coinId: "c_b1" }), /friend/);
  await refused(go(a, { op: "invite", friend: "guesty", coinId: "c_a2" }), /locked/);
  await refused(go(a, { op: "invite", friend: "guesty", coinId: "c_b1" }), /not yours/);
  await go(a, { op: "invite", friend: "guesty", coinId: "c_a1" });
  await refused(go(a, { op: "invite", friend: "guesty", coinId: "c_a1" }), /already at a table/);
});
