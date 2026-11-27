/* ══════════════════════════════════════════════════════════════════════
 *  events — seasons that come and go
 *  ────────────────────────────────────────────────────────────────────
 *  An event runs from `from` to `to` (both days included) on each
 *  player's own calendar (economy.localDay), and while it runs a share
 *  of the chests he hands through the gap are the event's own. Each
 *  such chest is guaranteed a coin of the season (its `season`, kept on
 *  the coin for good, like shine), and may hold the event's tome, its
 *  title or, rarely, its profile effect. How good it is follows the finest scroll
 *  in the pot that paid for it (`grade`, a rarity 0..5): copy hard pages
 *  well and the chest is better.
 *
 *  Nothing of a season is made once it is over. Next year's event is a
 *  new entry with a new season, so this year's coins stay this year's.
 *
 *  Everything that decides what an event pays is in here, read by the
 *  server, the client and tools/maxout.mjs alike.
 * ══════════════════════════════════════════════════════════════════════ */

import { CHESTS } from "./tuning.js";

export const EVENTS = [
  {
    id: "longnight26",
    name: "THE LONG NIGHT",
    from: "2026-12-01", to: "2027-01-05",
    season: "frost26",
    chestShare: 1 / 3,                // of the chests released while it runs
    // the chest's coin is rolled as from a chest this many tiers better,
    // by grade (the best scroll's rarity), never past the void chest
    coinLift: [0, 0, 1, 1, 2, 3],
    tome: { id: "almanac", chance: [0.08, 0.1, 0.14, 0.2, 0.28, 0.35] },
    title: { id: "long_night", chance: [0.03, 0.05, 0.08, 0.12, 0.18, 0.25] },
    effect: { id: "frostfall", chance: [0, 0.005, 0.015, 0.03, 0.06, 0.12] },
    relics: "magi",
    // its banners (src/lib/data.js): a present may hold one not yet owned
    banners: { ids: ["xmas_star", "xmas_square", "xmas_chimneys", "xmas_rooftops"], chance: [0.02, 0.03, 0.05, 0.08, 0.12, 0.18] },
    // how it looks and speaks (client only)
    look: "winter", icon: "snow", tint: "#bfe6f5",
    present: { name: "PRESENT", arrives: "HE PUSHES A PRESENT THROUGH THE GAP, TIED WITH RIBBON", heading: "A PRESENT FOR THE LONG NIGHT", hold: "HOLD TO PULL THE RIBBON" },
    blurb: "A THIRD OF HIS CHESTS ARE PRESENTS WHILE THE NIGHT LASTS. EVERY PRESENT HOLDS A FROST '26 COIN. COPY HARD PAGES WELL AND THE PRESENTS ARE BETTER.",
    teaser: "SOMETHING IS COMING THROUGH THE GAP. PRESENTS AMONG HIS CHESTS, COINS OF THE SEASON IN EVERY METAL, THREE GIFTS FIT FOR KINGS, AND A FEW THINGS NOBODY WILL HAVE ONCE THE NIGHT IS OVER.",
  },
  {
    // Lunar New Year 2027 (the Year of the Goat begins 6 February), from
    // New Year's Eve to the Lantern Festival. Built on the Long Night's
    // pattern: the same odds, its own coins, art and words.
    id: "lunar27",
    name: "THE LANTERN DAYS",
    from: "2027-02-05", to: "2027-02-20",
    season: "lunar27",
    chestShare: 1 / 3,
    coinLift: [0, 0, 1, 1, 2, 3],
    tome: { id: "lantern_book", chance: [0.08, 0.1, 0.14, 0.2, 0.28, 0.35] },
    title: { id: "lunar27", chance: [0.03, 0.05, 0.08, 0.12, 0.18, 0.25] },
    effect: { id: "lanternrise", chance: [0, 0.005, 0.015, 0.03, 0.06, 0.12] },
    relics: "stargods",
    banners: { ids: ["lny_market", "lny_lanterns", "lny_fireworks", "lny_dragon"], chance: [0.02, 0.03, 0.05, 0.08, 0.12, 0.18] },
    look: "lunar", icon: "lantern", tint: "#ff8a5a",
    present: { name: "RED ENVELOPE", arrives: "HE SLIDES A RED ENVELOPE THROUGH THE GAP", heading: "A RED ENVELOPE FOR THE NEW YEAR", hold: "HOLD TO LIFT THE FLAP" },
    blurb: "A THIRD OF HIS CHESTS ARE RED ENVELOPES UNTIL THE LANTERN FESTIVAL. EVERY ENVELOPE HOLDS A LUNAR '27 COIN. COPY HARD PAGES WELL AND THE ENVELOPES ARE RICHER.",
    teaser: "THE NEW YEAR IS COMING THROUGH THE GAP. RED ENVELOPES AMONG HIS CHESTS, COINS OF THE SEASON IN EVERY METAL, THE THREE STAR GODS, AND A FEW THINGS NOBODY WILL HAVE ONCE THE LANTERNS ARE DOWN.",
  },
];

/* An event's set of named coins: each drawn with its own emblem
 * (lib/coin.js paintRelic), always mythic, `chance` of any of the event's
 * presents holding one (which, at random). The first time a player finds
 * each pays `firstBonus` marks, and finding the whole set pays `setBonus`
 * once more (server/state.js payRelics). They are one of a kind, so the
 * tavern, war and the restrike will not take them. A relic is written
 * "set:index", e.g. "magi:1". */
export const RELICS = {
  magi: {
    event: "longnight26", name: "THE MAGI'S GIFTS", chance: 0.01,
    firstBonus: 5000, setBonus: 20000, metal: 3,
    coins: [
      { name: "GOLD",         emblem: "crown",  era: "Carried by the first king, for a king" },
      { name: "FRANKINCENSE", emblem: "censer", era: "Carried by the second king, for a god" },
      { name: "MYRRH",        emblem: "jar",    era: "Carried by the third king, for the grave" },
    ],
  },  // the Three Star Gods, shown together at the New Year: each in a red
  // paper lantern (vessel), not a snow globe
  stargods: {
    event: "lunar27", name: "THE THREE STAR GODS", chance: 0.01, vessel: "lantern",
    firstBonus: 5000, setBonus: 20000, metal: 3,
    coins: [
      { name: "FORTUNE",    emblem: "bat",   era: "Fu, the star of blessings: a bat, for its name sounds like fortune" },
      { name: "PROSPERITY", emblem: "ingot", era: "Lu, the star of rank: a gold ingot, for wealth that keeps coming" },
      { name: "LONGEVITY",  emblem: "peach", era: "Shou, the star of long life: the peach of the immortals" },
    ],
  },

};
export const relicOf = r => {
  const [set, i] = String(r || "").split(":"), s = RELICS[set], c = s?.coins[+i];
  return c ? { set, index: +i, ...c, of: s } : null;
};

/* What each season does to a coin: its sale value and cabinet score
 * multiply; `label` is how the coin names it. */
export const SEASONS = {
  frost26: { label: "FROST '26", event: "longnight26", valueMul: 1.5, cabinetMul: 1.5, look: "frost" },
  lunar27: { label: "LUNAR '27", event: "lunar27", valueMul: 1.5, cabinetMul: 1.5, look: "lunar" },
};

/* Profile effects, worn over the banner (components/ProfileFx.jsx). */
export const PROFILE_FX = {
  frostfall: { label: "Frostfall", desc: "Snow falls across your banner; frost creeps along your name." },
  lanternrise: { label: "Lanternrise", desc: "Paper lanterns rise across your banner, an ember glow beneath them." },
};

const dayOf = iso => Math.floor(Date.parse(iso + "T00:00:00Z") / 86400e3);

/* the event running on this local day number, or else the next to come:
 * { ev, live, days } (days left, or days until it begins), or null */
export function eventAhead(day) {
  const on = EVENTS.find(e => day >= dayOf(e.from) && day <= dayOf(e.to));
  if (on) return { ev: on, live: true, days: dayOf(on.to) - day + 1 };
  const next = EVENTS.filter(e => dayOf(e.from) > day).sort((a, b) => dayOf(a.from) - dayOf(b.from))[0];
  return next ? { ev: next, live: false, days: dayOf(next.from) - day } : null;
}

/* the event running on this local day number, or null */
export function eventOn(day) {
  for (const e of EVENTS) if (day >= dayOf(e.from) && day <= dayOf(e.to)) return e;
  return null;
}
export const eventById = id => EVENTS.find(e => e.id === id) || null;

/* Whether a released chest is the event's: decided as it leaves his
 * hands, like its tier. */
export const eventChest = (ev, rand) => !!ev && rand() < ev.chestShare;

/* What an event chest holds beyond its coin: the event's title and its
 * effect, each by the chest's grade, never one already owned. The coin's
 * own chest tier, lifted by grade, is `coinTier`. */
export function eventChestHolds(ev, tier, grade, owned, rand) {
  const g = Math.max(0, Math.min(5, grade | 0));
  const out = { coinTier: Math.min(CHESTS.cost.length - 1, tier + (ev.coinLift[g] || 0)), tome: null, title: null, effect: null, relic: null, banner: null };
  // now and then, in place of the frost coin, one of the event's named coins
  const set = ev.relics && RELICS[ev.relics];
  if (set && rand() < set.chance) out.relic = `${ev.relics}:${Math.floor(rand() * set.coins.length)}`;
  if (ev.tome && !(owned.tomes || []).includes(ev.tome.id) && rand() < ev.tome.chance[g]) out.tome = ev.tome.id;
  if (!owned.titles.includes(ev.title.id) && rand() < ev.title.chance[g]) out.title = ev.title.id;
  if (!owned.effects.includes(ev.effect.id) && rand() < ev.effect.chance[g]) out.effect = ev.effect.id;
  const left = (ev.banners?.ids || []).filter(id => !(owned.frames || []).includes(id));
  if (left.length && rand() < ev.banners.chance[g]) out.banner = left[Math.floor(rand() * left.length)];
  return out;
}
