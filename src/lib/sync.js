/* What the player is told about saving. One tiny store, three states:
 *   idle     everything the player did is on the server
 *   saving   a request is in flight
 *   unsaved  something is waiting to be sent and the last try failed
 * The top bar shows the last two. */

const listeners = new Set();
let inFlight = 0, queued = 0, failing = false;

const snapshot = () => (failing && queued > 0 ? "unsaved" : inFlight > 0 || queued > 0 ? "saving" : "idle");
let state = "idle";
const emit = () => { const next = snapshot(); if (next !== state) { state = next; listeners.forEach(f => f()); } };

export const sync = {
  begin() { inFlight++; emit(); },
  end() { inFlight = Math.max(0, inFlight - 1); emit(); },
  setQueue(n, isFailing) { queued = n; failing = isFailing; emit(); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  get: () => state,
};
