/* ══════════════════════════════════════════════════════════════════════
 *  useGameState — the player's state, and the only ways to change it
 *  ────────────────────────────────────────────────────────────────────
 *  The server owns everything of value. This hook holds the last
 *  snapshot it sent (`snap`), and every action replaces that snapshot
 *  with the one the server sends back — the client never works out for
 *  itself what an action did.
 *
 *  Cosmetic choices are the exception: they change `snap` at once and go
 *  out through the outbox. Whenever a fresh snapshot arrives, choices
 *  still waiting in the outbox are laid back over it so the screen does
 *  not flicker to the old value.
 * ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient, TOKEN_KEY } from "../lib/api.js";
import { createOutbox } from "../lib/outbox.js";
import { coinRarity } from "../lib/coin.js";
import { hydrate } from "../lib/coinview.js";
import { FRAMES } from "../lib/data.js";

export const MAX_PINS = 6;

const readToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };


function overlay(snap, pending) {
  if (!snap || !pending) return snap;
  const out = { ...snap, ...(pending.state || {}) };
  const locks = pending.lock || {};
  if (Object.keys(locks).length) out.coins = snap.coins.map(c => (c.id in locks ? { ...c, locked: locks[c.id] } : c));
  return out;
}

export function useGameState() {
  const [token, setToken] = useState(readToken);
  const [boot, setBoot] = useState({ status: token ? "loading" : "anon", error: null });
  const [snap, setSnap] = useState(null);
  const [retry, setRetry] = useState(0);
  const outboxRef = useRef(null);
  const snapRef = useRef(null);
  snapRef.current = snap;

  const logout = useCallback(() => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* fine */ }
    outboxRef.current?.stop(); outboxRef.current = null;
    setToken(null); setSnap(null); setBoot({ status: "anon", error: null });
  }, []);

  const api = useMemo(() => apiClient(token, logout), [token, logout]);

  const apply = useCallback(state => {
    setSnap(overlay(state, outboxRef.current?.pending()));
  }, []);

  /* load on sign-in, and again on "retry" */
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setBoot({ status: "loading", error: null });
    api.getState().then(state => {
      if (cancelled) return;
      outboxRef.current?.stop();
      outboxRef.current = createOutbox({
        send: body => api.patch(body),
        storageKey: "mintforge:outbox:" + state.username.toLowerCase(),
        // the server said no: forget the choice and show what is really there
        onRefused: () => api.getState().then(s => { if (!cancelled) setSnap(s); }).catch(() => {}),
      });
      setSnap(overlay(state, outboxRef.current.pending()));
      setBoot({ status: "ready", error: null });
    }).catch(err => {
      if (cancelled || err.status === 401) return;      // 401 has already signed us out
      // anything else keeps the session and offers a retry: a bad
      // connection must not look like being logged out
      setBoot({ status: "error", error: err.message || "Could not reach the vault" });
    });
    return () => { cancelled = true; };
  }, [token, api, retry]);
  useEffect(() => () => outboxRef.current?.stop(), []);

  const onAuthed = useCallback(tok => {
    try { localStorage.setItem(TOKEN_KEY, tok); } catch { /* fine */ }
    setToken(tok);
  }, []);
  const signOut = useCallback(() => { api.logout(); logout(); }, [api, logout]);

  /* ── value: ask the server, take its answer ── */
  const act = useCallback(async (action, payload) => {
    const res = await api.act(action, payload);
    if (res.state) apply(res.state);
    return res.result;
  }, [api, apply]);

  /* ── cosmetics: show now, send after ── */
  const choose = useCallback(change => {
    setSnap(s => (s ? { ...s, ...change } : s));
    outboxRef.current?.queue({ state: change });
  }, []);
  const setFrame = useCallback(id => choose({ frame: id }), [choose]);
  const setSelectedTitle = useCallback(label => choose({ selectedTitle: label }), [choose]);
  const setBio = useCallback(bio => choose({ bio: String(bio).slice(0, 120) }), [choose]);
  const setPinnedIds = useCallback(next => {
    const cur = snapRef.current?.pinnedIds ?? null;
    choose({ pinnedIds: typeof next === "function" ? next(cur) : next });
  }, [choose]);
  const toggleLock = useCallback(id => {
    const c = snapRef.current?.coins.find(x => x.id === id);
    if (!c) return;
    const locked = !c.locked;
    setSnap(s => ({ ...s, coins: s.coins.map(x => (x.id === id ? { ...x, locked } : x)) }));
    outboxRef.current?.queue({ lock: { [id]: locked } });
  }, []);

  /* ── derived ── */
  const coins = useMemo(() => (snap?.coins || []).map(hydrate), [snap?.coins]);
  const dusty = useMemo(() => (snap?.dusty || []).map(hydrate), [snap?.dusty]);

  const autoTop = useMemo(() => [...coins].sort((a, b) =>
    coinRarity(b) - coinRarity(a) || b.metalIdx - a.metalIdx || (b.shiny ? 1 : 0) - (a.shiny ? 1 : 0)).slice(0, MAX_PINS), [coins]);
  // Slot order is the order of pinnedIds; a null is an empty slot.
  const showcase = useMemo(() => {
    const ids = snap?.pinnedIds;
    if (!ids) return autoTop;
    const byId = new Map(coins.map(c => [c.id, c]));
    return ids.slice(0, MAX_PINS).map(id => (id ? byId.get(id) || null : null));
  }, [snap?.pinnedIds, coins, autoTop]);

  const pinToSlot = useCallback((slot, coinId) => {
    setPinnedIds(prev => {
      let next = prev == null ? showcase.map(c => c?.id || null) : [...prev];
      const at = next.indexOf(coinId);
      if (at >= 0) next[at] = null;
      while (next.length <= slot) next.push(null);
      next[slot] = coinId;
      while (next.length && next[next.length - 1] == null) next.pop();
      return next.slice(0, MAX_PINS);
    });
  }, [setPinnedIds, showcase]);
  const clearPinSlot = useCallback(slot => {
    setPinnedIds(prev => {
      const next = prev == null ? showcase.map(c => c?.id || null) : [...prev];
      if (slot < next.length) next[slot] = null;
      while (next.length && next[next.length - 1] == null) next.pop();
      return next;
    });
  }, [setPinnedIds, showcase]);
  const togglePin = useCallback(id => {
    setPinnedIds(prev => {
      const base = prev == null ? showcase.map(c => c?.id || null) : [...prev];
      const at = base.indexOf(id);
      if (at >= 0) { base[at] = null; while (base.length && base[base.length - 1] == null) base.pop(); return base; }
      const free = base.indexOf(null);
      if (free >= 0) { base[free] = id; return base; }
      return base.length < MAX_PINS ? [...base, id] : base;
    });
  }, [setPinnedIds, showcase]);

  /* selling also empties any cabinet slot the coin was in */
  const sell = useCallback(async ids => {
    const result = await act("sell", { coinIds: ids });
    const gone = new Set(result.sold);
    const pins = snapRef.current?.pinnedIds;
    if (pins?.some(id => gone.has(id))) setPinnedIds(pins.map(id => (gone.has(id) ? null : id)));
    return result;
  }, [act, setPinnedIds]);

  return {
    boot, token, api, snap,
    onAuthed, signOut, reload: () => setRetry(n => n + 1),
    retrySaves: () => outboxRef.current?.retryNow(),
    act, sell,
    coins, dusty,
    scrolls: snap?.scrolls || [], chests: snap?.chests || [],
    username: snap?.username || "", xp: snap?.xp || 0, level: snap?.level || 1, marks: snap?.marks || 0,
    brushLevel: snap?.brushLevel || 0, lean: snap?.lean || 0, stats: snap?.stats || {},
    scrollCap: snap?.scrollCap || 8,
    inkMax: snap?.inkMax || 520, wellLevel: snap?.wellLevel || 0, streak: snap?.streak || 0,
    dailyReady: !!snap?.dailyReady, dailyIn: snap?.dailyIn || 0,
    journal: snap?.journal || { c: {}, shiny: 0, best: 0 },
    frame: snap?.frame || "stone", fr: FRAMES[snap?.frame] || FRAMES.stone,
    bio: snap?.bio || "", selectedTitle: snap?.selectedTitle || "",
    pinnedIds: snap?.pinnedIds ?? null,
    ownedFrames: snap?.ownedFrames || [], ownedTitles: snap?.ownedTitles || [],
    setFrame, setSelectedTitle, setBio, setPinnedIds, toggleLock,
    autoTop, showcase, pinToSlot, clearPinSlot, togglePin, maxPins: MAX_PINS,
  };
}
