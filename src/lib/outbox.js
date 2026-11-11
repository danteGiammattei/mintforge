/* ══════════════════════════════════════════════════════════════════════
 *  outbox — cosmetic choices, sent until they stick
 *  ────────────────────────────────────────────────────────────────────
 *  Wearing a frame, pinning a coin, locking one, editing the bio: these
 *  show on screen the moment they are chosen and are sent after. If the
 *  send fails the choice is kept — merged with any later ones, written
 *  to localStorage so a reload does not lose it — and retried with
 *  backoff and whenever the connection returns. The top bar says
 *  "UNSAVED" for as long as anything is waiting.
 *
 *  A choice the server refuses outright (a frame that is not owned) is
 *  dropped, and `onRefused` lets the app put the screen right.
 * ══════════════════════════════════════════════════════════════════════ */

import { sync } from "./sync.js";

const BACKOFF = [1500, 4000, 10000, 30000];

export function createOutbox({ send, storageKey, onRefused }) {
  let pending = null;             // { state: {…}, lock: { id: bool } }
  let inAir = null;               // the same shape, while a send is in flight
  let timer = 0, tries = 0, busy = false, dead = false;
  const merge = (a, b) => (!a && !b ? null : {
    state: { ...(a?.state || {}), ...(b?.state || {}) },
    lock:  { ...(a?.lock  || {}), ...(b?.lock  || {}) },
  });

  try { const saved = JSON.parse(localStorage.getItem(storageKey) || "null"); if (saved) pending = saved; } catch { /* nothing saved */ }

  const persist = () => {
    const all = merge(inAir, pending);     // a reload mid-send must not lose what was in the air
    try { all ? localStorage.setItem(storageKey, JSON.stringify(all)) : localStorage.removeItem(storageKey); } catch { /* fine */ }
    sync.setQueue(all ? Object.keys(all.state).length + Object.keys(all.lock).length : 0, tries > 0);
  };
  const schedule = ms => { clearTimeout(timer); if (!dead) timer = setTimeout(flush, ms); };

  async function flush() {
    if (busy || dead || !pending) return;
    busy = true;
    const sending = inAir = pending; pending = null;
    const body = {};
    if (Object.keys(sending.state || {}).length) body.state = sending.state;
    const locks = Object.entries(sending.lock || {});
    if (locks.length) body.lock = locks.map(([id, locked]) => ({ id, locked }));
    try {
      await send(body);
      tries = 0;
    } catch (e) {
      if (e.status && e.status < 500 && e.status !== 401) {
        tries = 0;                                    // refused: retrying cannot help
        onRefused?.(e);
      } else {
        pending = merge(sending, pending);            // keep it, under anything chosen since
        tries++;
      }
    }
    busy = false; inAir = null;
    persist();
    if (pending) schedule(tries ? BACKOFF[Math.min(tries - 1, BACKOFF.length - 1)] : 0);
  }

  const onOnline = () => { if (pending) schedule(0); };
  window.addEventListener("online", onOnline);
  persist();
  if (pending) schedule(0);

  return {
    /* queue({ state: { frame } }) or queue({ lock: { [id]: true } }) */
    queue(change) {
      pending = merge(pending, change);
      persist();
      schedule(600);
    },
    pending: () => merge(inAir, pending),
    retryNow: () => schedule(0),
    stop() { dead = true; clearTimeout(timer); window.removeEventListener("online", onOnline); sync.setQueue(0, false); },
  };
}
