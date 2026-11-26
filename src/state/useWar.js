/* War at the tavern, as the client sees it: GET /api/war on a timer:
 * quickly only while a table is in play, every few seconds in the tavern
 * (a challenge should land while you are there), and rarely anywhere
 * else, only to hear of one; never while the app is hidden.
 * Coins move in and out of the vault as tables open and settle, so the
 * game state is fetched again whenever the table changes hands. */
import { useCallback, useEffect, useRef, useState } from "react";

const FAST = 1200, NEAR = 5000, FAR = 30000;

export function useWar(api, refreshGame, watching) {
  const [war, setWar] = useState({ table: null, invites: [], recent: [] });
  const [error, setError] = useState(null);
  const last = useRef("");
  const again = useRef(refreshGame);
  again.current = refreshGame;

  const take = useCallback(w => {
    setWar(w); setError(null);
    // a coin went onto the felt, came home, or changed hands
    const key = [w.table?.id, w.table?.status, ...w.recent.map(r => r.id)].join("|");
    if (last.current && key !== last.current) again.current();
    last.current = key;
  }, []);

  const poll = useCallback(() => api.getWar().then(take).catch(e => setError(e.message)), [api, take]);

  // a table in play: quick; your challenge waiting on them, or the tavern
  // open: every few seconds; anywhere else: now and then
  const every = war.table?.status === "playing" ? FAST : war.table || watching ? NEAR : FAR;
  useEffect(() => {
    let t = null, dead = false;
    const tick = () => {
      if (dead) return;
      if (document.visibilityState === "visible") poll();
      t = setTimeout(tick, every);
    };
    tick();
    const wake = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", wake);
    return () => { dead = true; clearTimeout(t); document.removeEventListener("visibilitychange", wake); };
  }, [poll, every]);

  const move = useCallback(async (op, payload = {}) => {
    const r = await api.war(op, payload);
    take(r.war);
    return r.result;
  }, [api, take]);

  return { ...war, error, move, poll };
}
