/* ══════════════════════════════════════════════════════════════════════
 *  auth — PINs, sessions and the throttle on guessing
 *  ────────────────────────────────────────────────────────────────────
 *  A PIN is four to six digits, so the hash alone protects nothing: ten
 *  thousand guesses is not a search. What protects an account is that
 *  guesses are rationed — per username, backing off exponentially, and
 *  per address across all usernames. The hash is there for the day the
 *  database leaks, and is as slow as the Workers runtime permits.
 * ══════════════════════════════════════════════════════════════════════ */

import { AUTH } from "../shared/tuning.js";
import { randomHex } from "./http.js";

const LEGACY_ITERATIONS = 10000;

export async function hashPin(pin, salt, iterations = AUTH.pbkdf2Iterations) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations, hash: "SHA-256" }, key, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

/* Timing-safe string compare */
export function safeEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function validateUsername(u) {
  if (typeof u !== "string") return null;
  const v = u.trim();
  if (v.length < 3 || v.length > 20) return null;
  if (!/^[A-Za-z0-9_]+$/.test(v)) return null;
  return v;
}
export const validatePin = p => typeof p === "string" && /^\d{4,6}$/.test(p);

export const clientIp = request =>
  request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0].trim() || "local";

/* ─── throttle ────────────────────────────────────────────────────── */

async function attemptRow(db, key) {
  return await db.prepare(`SELECT fails, locked_until, last_at FROM login_attempts WHERE key = ?1`).bind(key).first();
}

/* Seconds the caller must wait, or 0. */
export async function lockedFor(db, keys, now) {
  let until = 0;
  for (const k of keys) {
    const r = await attemptRow(db, k);
    if (r && r.locked_until > now) until = Math.max(until, r.locked_until);
  }
  return until ? Math.ceil((until - now) / 1000) : 0;
}

export function lockAfter(fails, kind) {
  if (kind === "ip")  return fails >= AUTH.ipFreeFails ? AUTH.ipLockMs : 0;
  if (kind === "reg") return fails >= AUTH.regPerDay ? AUTH.regLockMs : 0;
  if (fails < AUTH.userFreeFails) return 0;
  return Math.min(AUTH.userLockMaxMs, AUTH.userLockBaseMs * 2 ** (fails - AUTH.userFreeFails));
}

async function recordFail(db, key, kind, now) {
  const r = await attemptRow(db, key);
  const stale = !r || now - r.last_at > AUTH.failWindowMs;
  const fails = (stale ? 0 : r.fails) + 1;
  const lock = lockAfter(fails, kind);
  await db.prepare(
    `INSERT INTO login_attempts (key, fails, locked_until, last_at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(key) DO UPDATE SET fails = ?2, locked_until = ?3, last_at = ?4`
  ).bind(key, fails, lock ? now + lock : 0, now).run();
}

const waitMessage = secs =>
  `Too many attempts. Try again in ${secs >= 90 ? Math.ceil(secs / 60) + " minutes" : secs + " seconds"}.`;

/* ─── login / register ────────────────────────────────────────────────
 * Both return { status, body } so the endpoints stay one line each and
 * the tests can call them without building a Request. */

export async function login(db, { username: rawName, pin, ip, now = Date.now() }) {
  const username = validateUsername(rawName);
  if (!username || !validatePin(pin)) return { status: 401, body: { error: "Invalid credentials" } };

  const uKey = "u:" + username.toLowerCase(), ipKey = "ip:" + ip;
  const wait = await lockedFor(db, [uKey, ipKey], now);
  if (wait) return { status: 429, body: { error: waitMessage(wait), retryAfter: wait } };

  const row = await db.prepare(
    `SELECT id, username, password_hash, password_salt, pin_iter FROM players WHERE username = ?1 COLLATE NOCASE`
  ).bind(username).first();

  // An unknown name costs the same time and the same strike as a wrong
  // PIN, so the response says nothing about which names exist.
  const iter = row?.pin_iter || LEGACY_ITERATIONS;
  const attempt = await hashPin(pin, row?.password_salt || "0000000000000000", row ? iter : AUTH.pbkdf2Iterations);
  if (!row || !safeEq(attempt, row.password_hash)) {
    await recordFail(db, uKey, "user", now);
    await recordFail(db, ipKey, "ip", now);
    const after = await lockedFor(db, [uKey, ipKey], now);
    return after
      ? { status: 429, body: { error: waitMessage(after), retryAfter: after } }
      : { status: 401, body: { error: "Invalid credentials" } };
  }

  const stmts = [db.prepare(`DELETE FROM login_attempts WHERE key = ?1`).bind(uKey)];
  if (iter < AUTH.pbkdf2Iterations) {
    // Right PIN, old hash: this is the one moment it can be strengthened.
    const salt = randomHex(16);
    const hash = await hashPin(pin, salt, AUTH.pbkdf2Iterations);
    stmts.push(db.prepare(
      `UPDATE players SET password_hash = ?1, password_salt = ?2, pin_iter = ?3 WHERE id = ?4`
    ).bind(hash, salt, AUTH.pbkdf2Iterations, row.id));
  }
  const token = randomHex(24);
  stmts.push(
    db.prepare(`INSERT INTO sessions (token, player_id, created_at, last_used_at) VALUES (?1, ?2, ?3, ?3)`).bind(token, row.id, now),
    db.prepare(`UPDATE players SET last_seen_at = ?1 WHERE id = ?2`).bind(now, row.id),
    // housekeeping rides along: this player's dead sessions go now
    db.prepare(`DELETE FROM sessions WHERE player_id = ?1 AND (created_at < ?2 OR COALESCE(last_used_at, created_at) < ?3)`)
      .bind(row.id, now - AUTH.sessionMaxMs, now - AUTH.sessionIdleMs),
  );
  await db.batch(stmts);
  return { status: 200, body: { token, player: { id: row.id, username: row.username } } };
}

export async function register(db, { username: rawName, pin, ip, now = Date.now() }) {
  const username = validateUsername(rawName);
  if (!username) return { status: 400, body: { error: "Username must be 3–20 letters, numbers, or underscores" } };
  if (!validatePin(pin)) return { status: 400, body: { error: "PIN must be 4–6 digits" } };

  // New accounts are rationed per address too, on the same counter as
  // failed logins: a burst of either looks the same from here.
  const ipKey = "ip:" + ip, regKey = "reg:" + ip;
  const wait = await lockedFor(db, [ipKey, regKey], now);
  if (wait) return { status: 429, body: { error: waitMessage(wait), retryAfter: wait } };

  const salt = randomHex(16);
  const hash = await hashPin(pin, salt, AUTH.pbkdf2Iterations);
  let playerId;
  try {
    const ins = await db.prepare(
      `INSERT INTO players (username, password_hash, password_salt, pin_iter, created_at, last_seen_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5)`
    ).bind(username, hash, salt, AUTH.pbkdf2Iterations, now).run();
    playerId = ins.meta.last_row_id;
  } catch (e) {
    if (/UNIQUE constraint/i.test(e.message || "")) {
      await recordFail(db, ipKey, "ip", now);
      return { status: 409, body: { error: "Username already taken" } };
    }
    return { status: 500, body: { error: "Could not create account" } };
  }

  const token = randomHex(24);
  const nonce = crypto.getRandomValues(new Uint32Array(1))[0];
  await db.batch([
    db.prepare(
      `INSERT INTO player_state (player_id, xp, brush_level, frame, bio, selected_title, seal_nonce)
       VALUES (?1, 0, 0, 'stone', '', 'Novice Digger', ?2)`
    ).bind(playerId, nonce),
    db.prepare(`INSERT INTO sessions (token, player_id, created_at, last_used_at) VALUES (?1, ?2, ?3, ?3)`).bind(token, playerId, now),
  ]);
  await recordFail(db, regKey, "reg", now);
  return { status: 200, body: { token, player: { id: playerId, username } } };
}

/* ─── sessions ────────────────────────────────────────────────────────
 * Resolve the player from `Authorization: Bearer <token>`. A session
 * dies after sessionIdleMs unused or sessionMaxMs from creation,
 * whichever comes first, and the dead row is removed on sight. */
export async function getAuth(request, env, now = Date.now()) {
  const m = /^Bearer\s+([A-Za-z0-9]+)$/.exec(request.headers.get("Authorization") || "");
  if (!m) return null;
  const token = m[1];
  const row = await env.DB.prepare(
    `SELECT players.id AS player_id, players.username, sessions.created_at, sessions.last_used_at
       FROM sessions JOIN players ON players.id = sessions.player_id
      WHERE sessions.token = ?1`
  ).bind(token).first();
  if (!row) return null;

  const used = row.last_used_at ?? row.created_at;
  if (now - row.created_at > AUTH.sessionMaxMs || now - used > AUTH.sessionIdleMs) {
    await env.DB.prepare(`DELETE FROM sessions WHERE token = ?1`).bind(token).run();
    return null;
  }
  if (now - used > 3600e3) {            // touch at most hourly; it is a write
    await env.DB.batch([
      env.DB.prepare(`UPDATE sessions SET last_used_at = ?1 WHERE token = ?2`).bind(now, token),
      env.DB.prepare(`UPDATE players SET last_seen_at = ?1 WHERE id = ?2`).bind(now, row.player_id),
    ]);
  }
  return { player: { id: row.player_id, username: row.username }, token };
}
