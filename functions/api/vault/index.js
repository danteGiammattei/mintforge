import { json, bad, getAuth, readJson, guarded } from "../_utils.js";
import { loadState, patchCosmetics } from "../../../server/state.js";

/* GET /api/vault — the player's whole state, as the client may know it. */
export const onRequestGet = ({ request, env }) => guarded(async () => {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  return json(await loadState(env.DB, auth.player.id));
});

/* POST /api/vault — choices only: frame, title, bio, cabinet, locks.
 *
 * This endpoint used to take coins to add, coins to remove and a marks
 * balance from the client. It takes none of them now; anything else in
 * the body is refused rather than ignored, so an old client fails loudly
 * instead of believing it saved. Value changes go through /api/act. */
const ALLOWED_TOP = new Set(["state", "lock"]);
const ALLOWED_STATE = new Set(["frame", "bio", "selectedTitle", "pinnedIds"]);

export const onRequestPost = ({ request, env }) => guarded(async () => {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  const body = await readJson(request);
  for (const k of Object.keys(body || {})) {
    if (!ALLOWED_TOP.has(k)) return bad(`"${k}" cannot be set by the client`, 403);
  }
  for (const k of Object.keys(body?.state || {})) {
    if (!ALLOWED_STATE.has(k)) return bad(`"${k}" cannot be set by the client`, 403);
  }
  return json(await patchCosmetics(env.DB, auth.player.id, body));
});
