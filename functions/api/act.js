import { json, bad, getAuth, readJson, guarded, tzOf } from "./_utils.js";
import { act } from "../../server/game.js";

/* POST /api/act  { action, opId?, … }
 *
 * The one door for everything that makes or destroys value: seal, offer,
 * visit, open, brush, sell, gamble. Replies { result, state } — the
 * outcome of this action and the player's whole state after it, so the
 * client never has to work out what changed. See server/game.js. */
export const onRequestPost = ({ request, env }) => guarded(async () => {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  const body = await readJson(request);
  return json(await act(env.DB, auth.player.id, body, { tz: tzOf(request) }));
});
