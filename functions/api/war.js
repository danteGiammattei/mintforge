import { json, bad, getAuth, readJson, guarded } from "./_utils.js";
import { warState, warMove } from "../../server/war.js";

/* GET  /api/war                → { table, invites, recent }
 * POST /api/war  { op, … }     → { result, war }
 * High card for two friends' coins. See server/war.js. */
export const onRequestGet = ({ request, env }) => guarded(async () => {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  return json(await warState(env.DB, auth.player.id));
});

export const onRequestPost = ({ request, env }) => guarded(async () => {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  return json(await warMove(env.DB, auth.player.id, await readJson(request)));
});
