/* ══════════════════════════════════════════════════════════════════════
 *  tuning — every number that decides how the game pays
 *  ────────────────────────────────────────────────────────────────────
 *  One file, read by the client, the server and the simulator, so a
 *  balance change is one edit and `npm run sim` tells you what it did.
 *  Nothing in here is art or layout; if changing it would not move a
 *  line in the simulator's report, it does not belong here.
 *
 *  Rarity indices run 0..5: common, uncommon, rare, epic, legendary,
 *  mythic. Metal indices run 0..8: copper … astral. Chest tiers 0..4.
 * ══════════════════════════════════════════════════════════════════════ */

/* ─── the desk ────────────────────────────────────────────────────── */
export const SCRIBE = {
  sheet: { w: 155, h: 212 },   // drawable area, in scene pixels
  inkMax: 520,                 // path length a sheet takes with the first inkwell
  // Inkwells are bought with marks at the desk, in order. More ink does
  // not make a scroll better by itself — it makes room for the drawings
  // that tend to be: long unbroken lines, knots, page-filling shapes.
  wells: [
    { name: "CLAY WELL",   ink: 520, cost: 0 },
    { name: "HORN WELL",   ink: 620, cost: 600 },
    { name: "GLASS WELL",  ink: 740, cost: 2500 },
    { name: "SILVER WELL", ink: 880, cost: 9000 },
    { name: "VOID WELL",   ink: 1040, cost: 30000 },
  ],
  inkSlack: 1.06,              // server tolerance over inkMax (float drift)
  maxStrokes: 80,
  maxPoints: 3000,
  cooldownMs: 2500,            // server-side gap between seals
  scrollCap: 8,                // the satchel holds this many; the drawer shows them all
  recentSigs: 6,               // how far back he remembers a sigil
};

/* ─── sigil judging ───────────────────────────────────────────────────
 * Baseline weights are the roll a drawing gets from its own seed before
 * any trait speaks. Thresholds decide when a trait is present; `bump` is
 * the chance a present trait lifts the scroll one tier. Tuned against
 * `npm run sim` so no single archetype of drawing wins on average. */
export const SIGIL = {
  baseline: [62, 25, 9, 3.1, 0.8, 0.1],
  bump: 0.45,            // chance a present trait lifts the scroll one tier
  maxBumps: 3,           // however many traits a drawing has
  // the highest tier a scroll can reach, by how many traits it has: a
  // bare mark tops out at rare, one trait at epic; legendary and mythic
  // take two or more. The roll and every lift are held to it.
  capByTraits: [2, 3, 5],
  // time spent drawing (pen down, pauses counted only a beat) earns care:
  // none below fromMs, all of it at fullMs, and full care is this chance
  // of one more lift. The server never credits more time than has passed
  // since the last seal.
  care: { fromMs: 2000, fullMs: 12000, bump: 0.6 },
  hurriedMs: 2500,       // pen-down time at which a drawing stops counting as hurried
  // one trait a day he craves (the same for everyone, by their calendar
  // day): it always lifts, and sometimes lifts twice
  craving: { again: 0.35 },
  thresholds: {
    symmetric: 0.66,         // mirrored overlap, left against right, more than
    symmetricMinCells: 28,   //   …of a shape with at least this many grid cells inked
    closed: 0.22,            // share of the drawing's own box that is enclosed, more than
    continuousInk: 300,      // one stroke, at least this long
    woven: 6,                // self-crossings, at least
    sparse: 0.10,            // inked share of the drawing's own box, less than
    sparseSpan: 0.07,        //   …while that box covers this much of the sheet
    deliberate: 0.085,       // pace in px/ms with the pen down, slower than
    deliberateInk: 80,       //   …over at least this much ink
    vast: 0.42,              // share of the sheet the drawing's box covers, more than
  },
  effortInk: 150,        // ink at which a drawing counts as a real attempt
  faintChance: 0.85,     // with no ink or time at all, how often the roll comes to nothing
  familiar: 0.86,        // signature similarity that counts as a repeat
  familiarPenalty: 2,    // tiers lost for a repeat
};

/* ─── the door ────────────────────────────────────────────────────────
 * Favour is what a scroll is worth to him. It is never shown. */
export const FAVOUR_PER_RARITY = [1, 2, 4, 9, 20, 50];

/* The chest rule
 * ──────────────
 * The moment a chest leaves his hands he decides what the next one will
 * be — its tier is rolled then and kept hidden — and its price follows
 * from the tier. Every scroll adds its favour to the pot. When the pot
 * covers the price the chest comes through and the overpayment carries
 * into the next. One thing can still change his mind: if the best scroll
 * in the pot was epic or better he may trade up a tier before handing it
 * over. So fine scrolls come back as faster chests and, sometimes,
 * better ones; nobody is told either.
 *
 * `trust` slides the tier odds from `early` to `late` as he hands a
 * player more chests. It is the long game. */
export const CHESTS = {
  names: ["WOODEN", "IRON", "GILDED", "OBSIDIAN", "VOID"],
  cost:  [10, 26, 60, 120, 240],
  early: [70, 22, 6, 1.7, 0.3],
  late:  [42, 31, 16, 8, 3],
  trustChests: 60,                    // chests received at which `late` applies in full
  alwaysWooden: 3,                    // a new player's first few are quick, whatever the odds say
  impressFrom: 3,                     // best-in-pot rarity that can trade a chest up
  impressChance: [0, 0, 0, 0.2, 0.4, 0.75],
  leanSteps: 8,                       // how coarsely his posture shows the pot
  hintChance: 0.7,                    // when a trait lifted a scroll, how often he says so
};

/* ─── what a chest holds ──────────────────────────────────────────── */
export const COIN_METAL_BY_CHEST = [
  // Lava and Fire came in between Obsidian and Void (November 2026),
  // their share taken from those two, so the tiers above come as before.
  //  Cu   Br   Ag   Au   Ice  Ob   Lava Fire Vo   El   As
  [  50,  30,  14,   5,   1,   0,   0,   0,   0,   0,   0   ],   // wooden
  [  22,  30,  26,  14,   6, 1.2, 0.4, 0.2, 0.2,   0,   0   ],   // iron
  [   6,  14,  26,  28,  16,   5,   2, 1.2, 1.3, 0.4, 0.1  ],   // gilded
  [   0,   4,  12,  24,  28,  14,   7,   4,   4, 2.5, 0.5  ],   // obsidian
  [   0,   0,   3,  10,  22,  20,  12,  10,  12,   8,   3   ],   // void
];
/* Coin rarity starts from the standard weights and each chest tier leans
 * them toward the top: weight × (1 + tier × lean) ^ rarity. */
export const COIN_RARITY = { base: [55, 28, 11, 4.5, 1.3, 0.2], leanPerTier: 0.35 };
/* Shiny is decided when the chest opens, from the brush the player holds. */
export const SHINY_CHANCE_BY_BRUSH = [0.005, 0.015, 0.03, 0.05, 0.08];

/* ─── what a coin sells for ───────────────────────────────────────────
 * value = metal base × rarity × condition × shiny.
 * Metal climbs about ×2.6 a step; rarity is meant to rival it, so a
 * mythic is worth about three and a half metals up (a mythic copper
 * outsells a common gold). The metal bases came down about a sixth when
 * this spread went in (it was ×1 to ×14), so income rose by about a
 * fifth rather than a half. */
export const METAL_BASE_VALUE = [2, 4, 11, 29, 74, 190, 270, 370, 475, 1240, 3150];   // Lava and Fire between Obsidian and Void
export const RARITY_VALUE_MUL = [1.0, 1.8, 3.2, 6.0, 12.0, 30.0];
export const SHINY_VALUE_MUL  = 4;
export const CONDITION_STEP   = 0.05;   // each grade below Pristine; Pristine is +15%

/* ─── experience ──────────────────────────────────────────────────────
 * Sealing, offering and brushing are the sources. */
export const XP = {
  seal:   { base: 6,  perRarity: 4 },
  offer:  { base: 8,  perRarity: 6 },
  open:   10,
  brush:  { base: 30, perRarity: 15, perMetal: 10, shiny: 60 },
  forge:  { strike: 5, shine: 60 },
  gambleWin: 120, gambleLoss: 20,
  rouletteWin: 140, rouletteLoss: 20,
  perLevel: 220,                       // level = floor(sqrt(xp / perLevel)) + 1
};

/* ─── the forge ───────────────────────────────────────────────────────
 * Where marks go. A strike costs marks and may put a shine on a coin; it
 * never harms the coin. The price follows what the coin is worth, so the
 * expected gain from a strike (chance × the three extra multiples a
 * shiny coin sells for) must stay BELOW the price or the forge turns
 * into a way to print marks: shinyChance × (SHINY_VALUE_MUL − 1) < costMul. */
export const FORGE = {
  shinyChance: 0.12,
  costMul: 0.6,          // × the coin's unshined sale value, per strike
  minCost: 120,          // so a copper is not shined for pocket change
};

/* Engraving a name on a coin, also at the forge. Clearing one is free. */
export const ENGRAVE = { cost: 250, maxLength: 14 };

/* ─── the tavern ──────────────────────────────────────────────────── */
export const GAMBLE = {
  toss:     { coins: 1, win: 0.5 },                 // tier up, or lost
  crucible: { coins: 3, win: 0.38 },                // three of one metal: all tier up, or keep one
  roulette: [
    { outcome: "lose",    label: "LOSE",    weight: 50 },
    { outcome: "same",    label: "SAME",    weight: 12 },
    { outcome: "up1",     label: "TIER UP", weight: 20 },
    { outcome: "x2",      label: "x2 BACK", weight: 10 },
    { outcome: "up2",     label: "TIER +2", weight: 6  },
    { outcome: "jackpot", label: "JACKPOT", weight: 2  },
  ],
  // A coin dropped through eight rows of pegs, bouncing left or right at
  // each with even odds, lands in one of nine slots. Odds follow from the
  // board: the edges are rare (1 in 256 each), the middle is common.
  plinko: {
    rows: 8,
    slots: ["jackpot", "up2", "up1", "lose", "same", "lose", "up1", "up2", "jackpot"],
  },
};

/* ─── what he gives away ──────────────────────────────────────────────
 * One gift per visit at most, the first whose conditions are all met and
 * which has not been given. `when` keys are minimums: `level`, or any
 * counter in the player's stats (visits, sealed, offered, chests,
 * brushed, gambles). Order is priority. */
export const GIFTS = [
  { id: "welcome",      when: { visits: 1 },                reward: { type: "chest", tier: 0 } },
  { id: "brush1",       when: { brushed: 3 },               reward: { type: "brush", level: 1 } },
  // the journal: `kinds` is how many of the 54 metal × rarity kinds have
  // been cleaned or won, `found` the rarest rarity ever found
  { id: "ledger9",      when: { kinds: 9 },                 reward: { type: "chest", tier: 1 } },
  { id: "firstEpic",    when: { found: 3 },                 reward: { type: "marks", n: 150 } },
  { id: "ledger18",     when: { kinds: 18 },                reward: { type: "chest", tier: 2 } },
  { id: "firstLegend",  when: { found: 4 },                 reward: { type: "chest", tier: 3 } },
  { id: "cataloguer",   when: { kinds: 27 },                reward: { type: "title", id: "cataloguer" } },
  { id: "firstMythic",  when: { found: 5 },                 reward: { type: "title", id: "mythbound" } },
  { id: "ledger40",     when: { kinds: 40 },                reward: { type: "chest", tier: 4 } },
  { id: "keeper",       when: { kinds: 54 },                reward: { type: "title", id: "keeper" } },
  { id: "pouch1",       when: { offered: 10 },              reward: { type: "marks", n: 40 } },
  { id: "brush2",       when: { brushed: 15 },              reward: { type: "brush", level: 2 } },
  { id: "goldspun",     when: { level: 10, chests: 12 },    reward: { type: "title", id: "goldspun" } },
  { id: "stargazer",    when: { level: 15, offered: 120 },  reward: { type: "frame", id: "stargazer" } },
  { id: "brush3",       when: { brushed: 40 },              reward: { type: "brush", level: 3 } },
  { id: "bone_reaper",  when: { level: 18, sealed: 250 },   reward: { type: "title", id: "bone_reaper" } },
  { id: "archive",      when: { level: 20, chests: 60 },    reward: { type: "frame", id: "archive" } },
  { id: "voidtouched",  when: { level: 20, brushed: 80 },   reward: { type: "title", id: "voidtouched" } },
  { id: "wanderer",     when: { level: 25, visits: 150 },   reward: { type: "frame", id: "wanderer" } },
  { id: "fortunes_hand",when: { level: 25, gambles: 25 },   reward: { type: "title", id: "fortunes_hand" } },
  { id: "brush4",       when: { brushed: 100 },             reward: { type: "brush", level: 4 } },
  { id: "astrarium",    when: { level: 30, chests: 150 },   reward: { type: "frame", id: "astrarium" } },
  { id: "astral",       when: { level: 35, offered: 600 },  reward: { type: "title", id: "astral" } },
];

/* ─── the daily visit ─────────────────────────────────────────────────
 * The first visit to the door on each calendar day — the player's own,
 * from their device's time zone — brings a pouch of marks that grows over
 * a streak, and a chest on every seventh day in a row. Skip a whole day
 * and the streak starts again. */
export const DAILY = {
  minGapMs: 4 * 3600e3,                // however the clock is turned, never two claims closer than this
  marks: [30, 40, 50, 60, 70, 80],     // days 1–6 of a streak (then it holds at the last)
  chestEvery: 7, chestTier: 1,         // every seventh day in a row: an iron chest instead
};

/* ─── accounts ────────────────────────────────────────────────────── */
export const AUTH = {
  pbkdf2Iterations: 100000,            // the Workers runtime refuses more
  sessionIdleMs: 30 * 24 * 3600e3,     // unused this long, a session dies
  sessionMaxMs:  90 * 24 * 3600e3,     // however busy, it dies here
  userFreeFails: 5,                    // wrong PINs before a username locks
  userLockBaseMs: 30e3,                // then 30s, doubling each further miss
  userLockMaxMs: 3600e3,
  ipFreeFails: 20,                     // across all usernames, per address
  ipLockMs: 15 * 60e3,
  failWindowMs: 24 * 3600e3,           // a quiet day clears the count
  regPerDay: 10,                       // new accounts per address per day
  regLockMs: 12 * 3600e3,
};


/* ─── the cabinet's score ─────────────────────────────────────────────
 * What the six coins on show are worth to a collector, which is mostly
 * how rare they are: points by rarity, a little more for a finer metal
 * (+25% a step, so an astral counts ×3), double for a shine. Six common
 * astrals score 450; one mythic copper scores 3,750. The grades are for
 * the profile; each is reached by a cabinet of roughly that rarity. */
export const CABINET_SCORE = {
  slots: 6,
  rarity: [25, 75, 200, 500, 1250, 3750],
  perMetal: 0.25,
  shiny: 2,
  grades: [
    [0,     "AN EMPTY SHELF"],
    [500,   "A FEW CURIOS"],
    [2000,  "A FINE CABINET"],
    [6250,  "A COLLECTOR'S CABINET"],
    [17500, "A LEGENDARY HOARD"],
    [40000, "A MYTHIC HOARD"],
  ],
};

/* ─── war at the tavern ───────────────────────────────────────────────
 * Two friends, one coin each, high card takes both. The guest's coin
 * must be at least as rare as the host's. A tie is war: three cards face
 * down and one up, until someone wins or the deck runs out (then the
 * coins go home). Nothing is lost to a table nobody finishes. */
export const WAR = {
  inviteMs: 180_000,     // an unanswered challenge lapses after this
  idleMs:   120_000,     // a table nobody flips at for this long is called off
  warDown:  3,           // cards laid face down at each war
  fan:      7,           // face-down cards each player picks from, every round
  recentMs: 600_000,     // how long a finished table is still shown
};

/* ─── materials ───────────────────────────────────────────────────────
 * A silver or obsidian coin from a chest is, now and then, its twin in
 * another material (src/lib/data.js MATERIALS): ice, or lava. The same
 * tier, a different look, worth a little more for being rarer. byTier
 * (null where a tier has none) must match MATERIALS. */
export const MATERIAL = {
  chance: 1 / 15,
  valueMul: 1.6,
  byTier: [null, null, null, null, null, null, null, null, null, null, null],
};

/* ─── astral: the twelve signs ────────────────────────────────────────
 * Every astral coin carries one of the twelve signs, its constellation on
 * its face. A player never holds two of one sign: a new astral coin
 * takes a sign they lack, and once they hold all twelve, no more astral
 * coins come (that roll is eldritch instead). Selling or losing one frees
 * its sign. Enforced by a unique index (migration 016). */
export const ASTRAL = {
  metal: 10,
  instead: 9,
  signs: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
};

/* ─── raffles ─────────────────────────────────────────────────────────
 * One draw a day for each metal, at drawUtcHour (10:00 UTC is 8 pm in
 * Brisbane). A coin of the metal is a ticket worth entries[rarity]
 * entries, and is gone once entered. One winner, picked by entries,
 * takes the pot: base × the metal's base value, plus what every entered
 * coin was worth (its sell price). So the pot grows as people enter,
 * coins leave the game, and only the base is new marks. */
export const RAFFLE = {
  drawUtcHour: 10,
  entries: [1, 2, 4, 8, 16, 32],
  base: 3,
  maxCoins: 50,          // in one go
};
