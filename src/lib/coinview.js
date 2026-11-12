/* A coin as the server sends it → a coin the screens can show. The look
 * and the lore come from the seed (lib/coin.js); the server adds what it
 * decided or was told: shine, lock, rarity, and an engraved name. */
import { mkCoin } from "./coin.js";

export function hydrate(row) {
  const c = mkCoin(row.seed, 1, row.metalIdx);
  c.id = row.id; c.shiny = !!row.shiny; c.locked = !!row.locked;
  if (typeof row.rarity === "number") c.rarity = row.rarity;
  if (row.nick) c.nick = row.nick;
  return c;
}

/* What to call it: the name its owner had cut into it, or the one it was struck with. */
export const coinName = c => c.nick || c.raw;
