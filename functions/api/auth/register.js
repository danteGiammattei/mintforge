import { json, readJson, clientIp, guarded } from "../_utils.js";
import { register } from "../../../server/auth.js";

export const onRequestPost = ({ request, env }) => guarded(async () => {
  const body = await readJson(request, 2000);
  const r = await register(env.DB, { username: body?.username, pin: body?.pin, ip: clientIp(request) });
  return json(r.body, r.status, r.body.retryAfter ? { "Retry-After": String(r.body.retryAfter) } : {});
});
