/* Small response helpers shared by every endpoint. */

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });

export const bad = (msg, status = 400, extra = {}) => json({ error: msg, ...extra }, status);

/* An error an action throws on purpose: it carries the status to send. */
export class Refusal extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function randomHex(bytes = 24) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
}

/* Uniform [0,1) from the platform's CSPRNG. Every roll the server makes
 * for a player comes through here. */
export function cryptoRand() {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] / 4294967296;
}

export async function readJson(request, maxBytes = 200_000) {
  const txt = await request.text();
  if (txt.length > maxBytes) throw new Refusal("Request too large", 413);
  try { return JSON.parse(txt); } catch { throw new Refusal("Invalid JSON"); }
}
