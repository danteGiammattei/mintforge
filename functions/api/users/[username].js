import { json, bad, getAuth } from "../_utils.js";
import { currentTitle } from "../../../src/lib/data.js";
import { journalOut } from "../../../server/state.js";
import { journalCounts } from "../../../shared/economy.js";

/* GET /api/users/:username
   The public profile of a player — bio, title, level, frame and the
   cabinet (pinned coins in their order, or the best few if none are
   pinned). Dusty coins are not public: nobody has seen them yet,
   including their owner. */
export async function onRequestGet({ request, env, params }) {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);

  const username = String(params.username || "").trim();
  if (!username) return bad("Username required");

  const player = await env.DB.prepare(
    `SELECT players.id, players.username, players.created_at,
            COALESCE(player_state.xp, 0) AS xp,
            COALESCE(player_state.frame, 'stone') AS frame,
            COALESCE(player_state.bio, '') AS bio,
            player_state.selected_title AS title,
            player_state.pinned_ids, player_state.journal
       FROM players
       LEFT JOIN player_state ON player_state.player_id = players.id
      WHERE players.username = ?1 COLLATE NOCASE`
  ).bind(username).first();
  if (!player) return bad("Player not found", 404);

  const r = await env.DB.prepare(
    `SELECT id, seed, metal_idx, shiny, rarity, nickname FROM coins WHERE player_id = ?1 AND dusty = 0`
  ).bind(player.id).all();
  const allCoins = r.results || [];

  let showcase = [];
  if (player.pinned_ids) {
    try {
      const ids = JSON.parse(player.pinned_ids);
      const byId = new Map(allCoins.map(c => [c.id, c]));
      showcase = ids.map(id => byId.get(id)).filter(Boolean).slice(0, 8);
    } catch { showcase = []; }
  }
  if (!showcase.length) {
    showcase = [...allCoins]
      .sort((a, b) => (b.rarity ?? 0) - (a.rarity ?? 0) || b.metal_idx - a.metal_idx || (b.shiny ? 1 : 0) - (a.shiny ? 1 : 0))
      .slice(0, 6);
  }

  const kinds = journalCounts(journalOut(player.journal, allCoins)).kinds;

  const friendRow = await env.DB.prepare(
    `SELECT 1 FROM friends WHERE player_id = ?1 AND friend_id = ?2`
  ).bind(auth.player.id, player.id).first();

  return json({
    id: player.id,
    username: player.username,
    title: currentTitle(player.title),
    bio: player.bio,
    xp: player.xp,
    frame: player.frame,
    createdAt: player.created_at,
    isSelf: player.id === auth.player.id,
    isFriend: !!friendRow,
    coinCount: allCoins.length,
    shinyCount: allCoins.filter(c => c.shiny).length,
    kinds,
    showcase: showcase.map(c => ({
      id: c.id, seed: c.seed >>> 0, metalIdx: c.metal_idx, shiny: !!c.shiny,
      ...(c.rarity != null ? { rarity: c.rarity } : {}),
      ...(c.nickname ? { nick: c.nickname } : {}),
    })),
  });
}
