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
  inkMax: 520,                 // path length a sheet will take
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
  baseline: [55, 28, 11, 4.5, 1.3, 0.2],
  bump: 0.42,
  thresholds: {
    symmetric: 0.62,     // mirrored overlap, left against right
    closed: 2,           // enclosed grid cells, more than
    woven: 4,            // self-crossings, at least
    sparse: 0.17,        // filled fraction of the grid, less than
    deliberate: 0.58,    // speed variation, less than
    vast: 0.46,          // share of the sheet covered, more than
  },
  effortInk: 420,        // ink at which effort counts in full
  effortBump: 0.28,      // chance full effort lifts a tier
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
  cost:  [8, 22, 60, 150, 400],
  early: [70, 22, 6, 1.7, 0.3],
  late:  [38, 32, 18, 9, 3],
  trustChests: 60,                    // chests received at which `late` applies in full
  impressFrom: 3,                     // best-in-pot rarity that can trade a chest up
  impressChance: [0, 0, 0, 0.2, 0.4, 0.75],
  leanSteps: 4,                       // how coarsely his posture shows the pot
  hintChance: 0.7,                    // when a trait lifted a scroll, how often he says so
  heldCap: 24,                        // chests the satchel will take
};

/* ─── what a chest holds ──────────────────────────────────────────── */
export const COIN_METAL_BY_CHEST = [
  //  Cu   Br   Ag   Au   Pt   Ob   Vo   El   As
  [  50,  30,  14,   5,   1,   0,   0,   0,   0   ],   // wooden
  [  22,  30,  26,  14,   6, 1.6, 0.4,   0,   0   ],   // iron
  [   6,  14,  26,  28,  16,   7, 2.5, 0.4, 0.1  ],   // gilded
  [   0,   4,  12,  24,  28,  20,   9, 2.5, 0.5  ],   // obsidian
  [   0,   0,   3,  10,  22,  30,  24,   8,   3   ],   // void
];
/* Coin rarity starts from the standard weights and each chest tier leans
 * them toward the top: weight × (1 + tier × lean) ^ rarity. */
export const COIN_RARITY = { base: [55, 28, 11, 4.5, 1.3, 0.2], leanPerTier: 0.35 };
/* Shiny is decided when the chest opens, from the brush the player holds. */
export const SHINY_CHANCE_BY_BRUSH = [0.005, 0.015, 0.03, 0.05, 0.08];

/* ─── what a coin sells for ───────────────────────────────────────────
 * value = metal base × rarity × condition × shiny.
 * Rarity used to contribute nothing (a bug); now that it does, the metal
 * bases are scaled down by the average rarity multiplier (≈1.57) so the
 * expected sale of each metal is what it was before. */
export const METAL_BASE_VALUE = [2, 5, 13, 35, 90, 230, 575, 1500, 3800];
export const RARITY_VALUE_MUL = [1.0, 1.6, 2.5, 4.0, 7.0, 14.0];
export const SHINY_VALUE_MUL  = 4;
export const CONDITION_STEP   = 0.05;   // each grade below Pristine; Pristine is +15%

/* ─── experience ──────────────────────────────────────────────────────
 * Sealing, offering and brushing replace digging as the sources. */
export const XP = {
  seal:   { base: 6,  perRarity: 4 },
  offer:  { base: 8,  perRarity: 6 },
  open:   10,
  brush:  { base: 30, perRarity: 15, perMetal: 10, shiny: 60 },
  gambleWin: 120, gambleLoss: 20,
  rouletteWin: 140, rouletteLoss: 20,
  perLevel: 220,                       // level = floor(sqrt(xp / perLevel)) + 1
};

/* ─── the tavern ──────────────────────────────────────────────────── */
export const GAMBLE = {
  toss:     { coins: 1, win: 0.5 },                 // tier up, or lost
  crucible: { coins: 3, win: 0.38 },                // three of one metal: all tier up, or keep one
  roulette: [
    { outcome: "lose",    label: "LOSE",    weight: 38 },
    { outcome: "same",    label: "SAME",    weight: 24 },
    { outcome: "up1",     label: "TIER UP", weight: 20 },
    { outcome: "x2",      label: "x2 BACK", weight: 10 },
    { outcome: "up2",     label: "TIER +2", weight: 6  },
    { outcome: "jackpot", label: "JACKPOT", weight: 2  },
  ],
};

/* ─── what he gives away ──────────────────────────────────────────────
 * One gift per visit at most, the first whose conditions are all met and
 * which has not been given. `when` keys are minimums: `level`, or any
 * counter in the player's stats (visits, sealed, offered, chests,
 * brushed, gambles). Order is priority. */
export const GIFTS = [
  { id: "welcome",      when: { visits: 1 },                reward: { type: "chest", tier: 0 } },
  { id: "brush1",       when: { brushed: 3 },               reward: { type: "brush", level: 1 } },
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

/* Kept off by default: duels were hidden before the rebuild and stay so
 * until they are reworked. The server endpoint is untouched. */
export const FEATURES = { duels: false };
