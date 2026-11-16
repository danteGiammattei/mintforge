import { json, bad, getAuth } from "../_utils.js";
import { currentTitle } from "../../../src/lib/data.js";
import { journalOut, tomesOf } from "../../../server/state.js";
import { journalCounts, cabinetScore } from "../../../shared/economy.js";
import { deriveRarity } from "../../../src/lib/coin.js";

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
            player_state.pinned_ids, player_state.journal,
            COALESCE(player_state.brush_level, 0) AS brush_level, player_state.tomes
       FROM players
       LEFT JOIN player_state ON player_state.player_id = players.id
      WHERE players.username = ?1 COLLATE NOCASE`
  ).bind(username).first();
  if (!player) return bad("Player not found", 404);

  const r = await env.DB.prepare(
    `SELECT id, seed, metal_idx, shiny, rarity, nickname, material, sign FROM coins WHERE player_id = ?1 AND dusty = 0`
  ).bind(player.id).all();
  const allCoins = r.results || [];

  const ranked = [...allCoins]
    .sort((a, b) => (b.rarity ?? 0) - (a.rarity ?? 0) || b.metal_idx - a.metal_idx || (b.shiny ? 1 : 0) - (a.shiny ? 1 : 0));
  let showcase = [];
  if (player.pinned_ids) {
    try {
      // a pinned coin that has gone (sold, lost at war) leaves its slot to
      // the best coin not already shown, as the player's own view does
      const ids = JSON.parse(player.pinned_ids).slice(0, 8);
      const byId = new Map(allCoins.map(c => [c.id, c]));
      const spare = ranked.filter(c => !ids.includes(c.id));
      showcase = ids.map(id => (id == null ? null : byId.get(id) || spare.shift() || null)).filter(Boolean);
    } catch { showcase = []; }
  }
  if (!showcase.length) showcase = ranked.slice(0, 6);

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
    brushLevel: player.brush_level,
    tomes: tomesOf(player.tomes),
    // the star signs they hold, one astral coin each
    signs: [...new Set(allCoins.filter(c => c.sign != null).map(c => c.sign))].sort((a, b) => a - b),
    cabinet: cabinetScore(showcase.map(c => ({ metalIdx: c.metal_idx, shiny: !!c.shiny, rarity: c.rarity ?? deriveRarity(c.seed >>> 0) }))),
    showcase: showcase.map(c => ({
      id: c.id, seed: c.seed >>> 0, metalIdx: c.metal_idx, shiny: !!c.shiny,
      ...(c.rarity != null ? { rarity: c.rarity } : {}),
      ...(c.nickname ? { nick: c.nickname } : {}),
      ...(c.material ? { material: c.material } : {}),
      ...(c.sign != null ? { sign: c.sign } : {}),
    })),
  });
}
