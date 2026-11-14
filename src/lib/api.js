/* ══════════════════════════════════════════════════════════════════════
 *  API client
 *  ────────────────────────────────────────────────────────────────────
 *  Thin wrapper around fetch for the Pages Functions backend (same
 *  origin). Two kinds of write exist and they fail differently:
 *
 *  · act()    anything that makes or destroys value. The server decides
 *             the outcome, so it cannot be applied ahead of the reply.
 *             Each call carries an opId and is retried on network
 *             failure; the server answers a repeated opId with its first
 *             answer, so a retry can never apply twice.
 *  · patch()  cosmetic choices. Applied on screen at once and sent by
 *             the outbox (lib/outbox.js), which keeps trying.
 * ══════════════════════════════════════════════════════════════════════ */

import { sync } from "./sync.js";

export const TOKEN_KEY = "mintforge:token";

export class ApiError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
  get offline() { return !this.status; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const newOpId = () => "op_" + Array.from(crypto.getRandomValues(new Uint8Array(9)), b => b.toString(36).padStart(2, "0")).join("");
const RETRY_AFTER = [400, 1200, 3000];

export function apiClient(token, onUnauthorized) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // so "a day" is the player's own day: minutes east of UTC (Brisbane is 600)
  headers["X-TZ-Offset"] = String(-new Date().getTimezoneOffset());

  const call = async (path, method = "GET", body) => {
    let r;
    try { r = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
    catch { throw new ApiError("No connection", 0); }
    const txt = await r.text();
    let data = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch { /* a non-JSON error page */ }
    if (r.status === 401 && token) onUnauthorized?.();
    if (!r.ok) throw new ApiError(data.error || `Server error (${r.status})`, r.status, data);
    return data;
  };

  const act = async (action, payload = {}) => {
    const body = { action, opId: newOpId(), ...payload };
    sync.begin();
    try {
      for (let attempt = 0; ; attempt++) {
        try { return await call("/api/act", "POST", body); }
        catch (e) {
          // worth another go: the network, the server falling over, or
          // our own earlier attempt still being worked on
          const again = e.offline || e.status >= 500 || (e.status === 409 && /still working/i.test(e.message));
          if (!again || attempt >= RETRY_AFTER.length) throw e;
          await sleep(RETRY_AFTER[attempt]);
        }
      }
    } finally { sync.end(); }
  };

  return {
    register:     (username, pin) => call("/api/auth/register", "POST", { username, pin }),
    login:        (username, pin) => call("/api/auth/login",    "POST", { username, pin }),
    logout:       ()              => call("/api/auth/logout",   "POST").catch(() => {}),
    getState:     ()              => call("/api/vault",         "GET"),
    patch:        (payload)       => call("/api/vault",         "POST", payload),
    act,
    searchUsers:  (q)             => call(`/api/users/search?q=${encodeURIComponent(q)}`, "GET"),
    getUser:      (username)      => call(`/api/users/${encodeURIComponent(username)}`,  "GET"),
    listFriends:  ()              => call("/api/friends",       "GET"),
    addFriend:    (username)      => call("/api/friends",       "POST",   { username }),
    removeFriend: (username)      => call("/api/friends",       "DELETE", { username }),
    getWar:       ()              => call("/api/war",           "GET"),
    war:          (op, payload)   => call("/api/war",           "POST",   { op, ...payload }),
  };
}
