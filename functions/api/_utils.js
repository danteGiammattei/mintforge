/* MintForge · shared API utilities.
 * The logic lives in /server so the tests can run it under Node; the
 * endpoints import it from here. */
export { json, bad, randomHex, Refusal, readJson, cryptoRand } from "../../server/http.js";
export { getAuth, hashPin, safeEq, validateUsername, validatePin, clientIp } from "../../server/auth.js";

import { bad, Refusal } from "../../server/http.js";

/* Run a handler; turn a Refusal into its status and anything else into
 * a 500 that does not leak internals. */
export async function guarded(fn) {
  try { return await fn(); }
  catch (e) {
    if (e instanceof Refusal) return bad(e.message, e.status);
    console.error(e);
    return bad("Something went wrong on our side", 500);
  }
}
