import { makeDb } from "./d1.js";
import { register } from "../server/auth.js";
import { act } from "../server/game.js";

/* Drawings, as the scribe scene would send them: sheet-relative points
 * with a millisecond timestamp. */
export function circle(cx = 78, cy = 100, r = 40, n = 48, t0 = 0, dt = 16) {
  return [Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, t: t0 + i * dt };
  })];
}
export function line(x1, y1, x2, y2, n = 12, t0 = 0, dt = 16) {
  return [Array.from({ length: n + 1 }, (_, i) => ({ x: x1 + (x2 - x1) * i / n, y: y1 + (y2 - y1) * i / n, t: t0 + i * dt }))];
}
export function scribble(rand, n = 60) {
  let x = 20 + rand() * 110, y = 20 + rand() * 170, t = 0;
  const s = [];
  for (let i = 0; i < n; i++) {
    x = Math.max(2, Math.min(152, x + (rand() - 0.5) * 16));
    y = Math.max(2, Math.min(209, y + (rand() - 0.5) * 16));
    t += 8 + rand() * 40;
    s.push({ x, y, t });
  }
  return [s];
}

export async function world(name = "tester", now = Date.now()) {
  const db = makeDb();
  const r = await register(db, { username: name, pin: "4821", ip: "1.1.1.1", now });
  return { db, pid: r.body.player.id, token: r.body.token };
}

/* Run an action with a fixed clock that moves forward on its own. */
export function driver(db, pid, rand) {
  let now = 10_000_000;
  const go = (action, body = {}) => { now += 60_000; return act(db, pid, { action, ...body }, { now, rand }); };
  go.now = () => now;
  return go;
}
