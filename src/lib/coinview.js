/* A coin as the server sends it → a coin the screens can show. The look
 * and the lore come from the seed (lib/coin.js); the server adds what it
 * decided or was told: shine, lock, rarity, and an engraved name. */
import { mkCoin } from "./coin.js";
import { METALS, MATERIALS } from "./data.js";

export function hydrate(row) {
  const c = mkCoin(row.seed, 1, row.metalIdx);
  c.id = row.id; c.shiny = !!row.shiny; c.locked = !!row.locked;
  if (typeof row.rarity === "number") c.rarity = row.rarity;
  if (row.nick) c.nick = row.nick;
  if (row.material && MATERIALS[row.material]) c.material = row.material;
  return c;
}

/* What it is made of: its material if it has one, else its metal, with
 * a colour to write that in. */
export function matterOf(c) {
  const mat = c.material && MATERIALS[c.material];
  return mat ? { name: mat.name, hl: mat.glow || mat.ramp[6], material: true } : { name: METALS[c.metalIdx].name, hl: METALS[c.metalIdx].hl, material: false };
}

/* What to call it: the name its owner had cut into it, or the one it was struck with. */
export const coinName = c => c.nick || c.raw;
