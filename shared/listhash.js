/* A short fingerprint of a list as the server sends it (FNV-1a over its
 * JSON), so the client can say "I have this one" and the server can leave
 * it out of its answer. Both sides hash the same JSON text. */
export const LISTS = ["coins", "dusty", "scrolls", "chests", "journal"];
export function listHash(v) {
  const s = JSON.stringify(v ?? null);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + ":" + s.length.toString(36);
}
