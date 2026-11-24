/* A coin as the server sends it → a coin the screens can show. The look
 * and the lore come from the seed (lib/coin.js); the server adds what it
 * decided or was told: shine, lock, rarity, and an engraved name. */
import { mkCoin, rune } from "./coin.js";
import { METALS, MATERIALS } from "./data.js";
import { ASTRAL } from "../../shared/tuning.js";
import { SEASONS, relicOf } from "../../shared/events.js";

export function hydrate(row) {
  const c = mkCoin(row.seed, 1, row.metalIdx);
  c.id = row.id; c.shiny = !!row.shiny; c.locked = !!row.locked;
  if (typeof row.rarity === "number") c.rarity = row.rarity;
  if (row.nick) c.nick = row.nick;
  if (row.material && MATERIALS[row.material]) c.material = row.material;
  if (row.sign != null && ASTRAL.signs[row.sign]) c.sign = row.sign;
  if (row.season && SEASONS[row.season]) c.season = row.season;
  const rel = relicOf(row.relic);
  if (rel) { c.relic = row.relic; c.raw = rel.name; c.runes = rune(rel.name); c.era = rel.era; c.shape = "round"; }
  return c;
}

/* What it is made of: its material if it has one, else its metal, with
 * a colour to write that in. */
export function matterOf(c) {
  const rel = relicOf(c.relic);
  if (rel) return { name: rel.of.name, hl: "#ffd98a", material: false, relic: true };
  const mat = c.material && MATERIALS[c.material];
  if (c.metalIdx === ASTRAL.metal && c.sign != null) return { name: `${METALS[c.metalIdx].name} ${ASTRAL.signs[c.sign]}`, hl: METALS[c.metalIdx].hl, material: false, sign: c.sign };
  return mat ? { name: mat.name, hl: mat.glows?.[0] || mat.ramp[6], material: true } : { name: METALS[c.metalIdx].name, hl: METALS[c.metalIdx].hl, material: false };
}

/* What to call it: the name its owner had cut into it, or the one it was struck with. */
export const coinName = c => c.nick || c.raw;
