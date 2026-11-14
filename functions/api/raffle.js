import { json, bad, getAuth, readJson, guarded } from "./_utils.js";
import { raffleState, enterRaffle } from "../../server/raffle.js";

/* GET  /api/raffle               → { drawAt, tiers, last, won }
 * POST /api/raffle { coinIds }   → { entered, entries, raffle }
 * The daily raffles. See server/raffle.js. */
export const onRequestGet = ({ request, env }) => guarded(async () => {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  return json(await raffleState(env.DB, auth.player.id));
});

export const onRequestPost = ({ request, env }) => guarded(async () => {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  return json(await enterRaffle(env.DB, auth.player.id, await readJson(request)));
});
