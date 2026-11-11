/* Friends, search, other players' profiles, and duels. None of this is
 * part of the loop, so it loads only when the Friends view is opened. */
import { useCallback, useEffect, useRef, useState } from "react";
import { FEATURES } from "../../shared/tuning.js";

export function useSocial(api, active) {
  const [friends, setFriends] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [duels, setDuels] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [viewing, setViewing] = useState(null);       // { username, data, error, loading }
  const [error, setError] = useState(null);
  const seq = useRef(0);

  const refresh = useCallback(() => {
    api.listFriends().then(r => { setFriends(r.friends || []); setFollowers(r.followers || []); setError(null); })
      .catch(e => setError(e.message));
  }, [api]);
  const refreshDuels = useCallback(() => {
    if (!FEATURES.duels) return;
    api.listDuels().then(r => setDuels(r.duels || [])).catch(() => {});
  }, [api]);

  useEffect(() => { if (active) { refresh(); refreshDuels(); } }, [active, refresh, refreshDuels]);

  // search as you type, a beat behind, newest answer wins
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const mine = ++seq.current;
    const t = setTimeout(() => {
      api.searchUsers(q).then(r => { if (mine === seq.current) { setResults(r.users || []); setSearching(false); } })
        .catch(() => { if (mine === seq.current) { setResults([]); setSearching(false); } });
    }, 300);
    return () => clearTimeout(t);
  }, [query, api]);

  const view = useCallback(username => {
    setViewing({ username, loading: true });
    api.getUser(username)
      .then(data => setViewing(v => (v?.username === username ? { username, data } : v)))
      .catch(e => setViewing(v => (v?.username === username ? { username, error: e.message } : v)));
  }, [api]);

  const setFriend = useCallback(async (username, on) => {
    await (on ? api.addFriend(username) : api.removeFriend(username));
    refresh();
    setViewing(v => (v?.data && v.username === username ? { ...v, data: { ...v.data, isFriend: on } } : v));
  }, [api, refresh]);

  return {
    friends, followers, duels, error, refresh, refreshDuels,
    query, setQuery, results, searching,
    viewing, view, closeView: () => setViewing(null),
    setFriend,
  };
}
