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
  // what he wants today (shared/tomes.js cravedPage: a page of the
  // player's own tomes, by their calendar day): a fair copy of it always
  // lifts, and sometimes lifts twice
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
  // copying a tome page (shared/tomes.js): likeness 1 at `perfect`
  // distance or closer, 0 at `none`. A copy is a floor under the roll: at
  // `fair` or better it is at least uncommon, at `close` at least rare, at
  // `true` at least epic; below `poor` it is nothing, like a hurried scrap.
  // The page's tier caps it all. A sure thing, so drawing well always pays.
  copy: { perfect: 0.02, none: 0.09, poor: 0.3, fair: 0.55, close: 0.72, true: 0.86, floors: [1, 2, 3] },
  familiar: 0.86,        // signature similarity that counts as a repeat
  familiarPenalty: 2,    // tiers lost for a repeat
};

/* ─── the door ────────────────────────────────────────────────────────
 * Favour is what a scroll is worth to him. It is never shown. */
export const FAVOUR_PER_RARITY = [1, 2, 4, 9, 20, 50];
/* A streak: scrolls of at least `from` (rare) handed over one after
 * another. From the `at`th in a row each pays `mul` times its favour;
 * anything less breaks it. Shown to the player, unlike the favour. */
export const STREAK = { from: 2, at: 3, mul: 1.5 };

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
 * player more chests. It is the long game. And `opensAt` gates the
 * ladder outright: a tier can't come (not by the odds, not by trading up)
 * until he has handed the player that many chests, so nobody new opens a
 * Void chest by accident.
 *
 * Seven tiers since November 2026: Frost (between Gilded and Obsidian)
 * and Molten (between Obsidian and Void) came in, each chest holding its
 * own narrow band of metals (COIN_METAL_BY_CHEST). migrations/025
 * renumbered the chests already made. */
export const CHESTS = {
  names: ["WOODEN", "IRON", "GILDED", "FROST", "OBSIDIAN", "MOLTEN", "VOID"],
  // the chance a chest also holds a tome the player lacks, no rarer than
  // the chest (shared/tomes.js tomeFromChest). A wooden one never does.
  tomeChance: [0, 0.06, 0.1, 0.13, 0.16, 0.2, 0.25],
  // and a player still holding only the primer by this many chests finds
  // the first tome (THE HEDGE BOOK) in the next one opened, whatever the
  // odds said: left to chance, a quarter of new players waited 400+ scrolls
  firstTomeBy: 8, firstTome: "hedge",
  cost:    [10, 22, 40, 70, 110, 170, 260],
  early:   [64, 24, 8, 2.6, 1, 0.3, 0.1],
  late:    [30, 25, 18, 12, 8, 5, 2],
  opensAt: [0, 3, 6, 12, 20, 32, 45],    // chests received before each tier can come at all
  trustChests: 60,                    // chests received at which `late` applies in full
  alwaysWooden: 3,                    // a new player's first few are quick, whatever the odds say
  impressFrom: 3,                     // best-in-pot rarity that can trade a chest up
  impressChance: [0, 0, 0, 0.2, 0.4, 0.75],
  leanSteps: 8,                       // how coarsely his posture shows the pot
  hintChance: 0.7,                    // when a trait lifted a scroll, how often he says so
};

/* ─── what a chest holds ──────────────────────────────────────────── */
export const COIN_METAL_BY_CHEST = [
  // Each chest its own narrow band (November 2026, seven tiers): a chest
  // tells you what's in it, and a wooden one never hands over magma.
  //  Cu   Br   Ag   Au   Ice  Ob   Lava Fire Vo   El   As
  [  70,  30,   0,   0,   0,   0,   0,   0,   0,   0,   0   ],   // wooden
  [   0,  55,  45,   0,   0,   0,   0,   0,   0,   0,   0   ],   // iron
  [   0,   0,  40,  60,   0,   0,   0,   0,   0,   0,   0   ],   // gilded
  [   0,   0,   0,  30,  70,   0,   0,   0,   0,   0,   0   ],   // frost
  [   0,   0,   0,   0,  20,  80,   0,   0,   0,   0,   0   ],   // obsidian
  [   0,   0,   0,   0,   0,   0,  55,  45,   0,   0,   0   ],   // molten
  [   0,   0,   0,   0,   0,   0,   0,   0,  65,  30,   5   ],   // void
];
/* Coin rarity starts from the standard weights and each chest tier leans
 * them toward the top: weight × (1 + tier × lean) ^ rarity. */
// (0.35 a tier across five; spread across seven so the Void chest, the
// top, leans exactly as it did)
export const COIN_RARITY = { base: [55, 28, 11, 4.5, 1.3, 0.2], leanPerTier: 0.35 * 4 / 6 };
/* Shiny is decided when the chest opens, a rare thing at the same odds
 * for everyone: the sure way to a shiny coin is the forge (FORGE). */
export const SHINY_CHANCE = 0.005;

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

/* Restriking a coin's face, also at the forge: a new face (and with it a
 * new struck name), its metal, rarity, shape, shine and engraving kept.
 * Priced from the coin's worth, so a fine coin costs more to restrike. */
export const RESTRIKE = { costMul: 0.25, minCost: 60 };

/* Engraving a name on a coin, also at the forge. Clearing one is free. */
export const ENGRAVE = { cost: 250, maxLength: 14 };

/* ─── the tavern ──────────────────────────────────────────────────── */
export const GAMBLE = {
  toss:     { coins: 1, win: 0.5 },                 // tier up, or lost
  roulette: [
    { outcome: "lose",    label: "LOSE",    weight: 40 },
    { outcome: "same",    label: "SAME",    weight: 14 },
    { outcome: "up1",     label: "TIER UP", weight: 24 },
    { outcome: "x2",      label: "x2 BACK", weight: 12 },
    { outcome: "up2",     label: "TIER +2", weight: 7  },
    { outcome: "jackpot", label: "JACKPOT", weight: 3  },
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
  // the journal: `kinds` is how many of the 66 metal × rarity kinds have
  // been cleaned or won, `found` the rarest rarity ever found. A reward
  // every five or six kinds, the last for a complete journal. (The ids
  // are what players have been given, so old ones keep their names.)
  { id: "ledger6",      when: { kinds: 6 },                 reward: { type: "marks", n: 150 } },
  { id: "ledger9",      when: { kinds: 11 },                reward: { type: "chest", tier: 1 } },
  { id: "ledger17",     when: { kinds: 17 },                reward: { type: "marks", n: 500 } },
  { id: "firstEpic",    when: { found: 3 },                 reward: { type: "marks", n: 150 } },
  { id: "ledger18",     when: { kinds: 22 },                reward: { type: "chest", tier: 2 } },
  { id: "ledger28",     when: { kinds: 28 },                reward: { type: "marks", n: 1500 } },
  { id: "firstLegend",  when: { found: 4 },                 reward: { type: "chest", tier: 4 } },
  { id: "cataloguer",   when: { kinds: 33 },                reward: { type: "title", id: "cataloguer" } },
  { id: "ledger39",     when: { kinds: 39 },                reward: { type: "chest", tier: 4 } },
  { id: "firstMythic",  when: { found: 5 },                 reward: { type: "title", id: "mythbound" } },
  { id: "ledger40",     when: { kinds: 44 },                reward: { type: "chest", tier: 6 } },
  { id: "ledger50",     when: { kinds: 50 },                reward: { type: "marks", n: 6000 } },
  { id: "ledger55",     when: { kinds: 55 },                reward: { type: "chest", tier: 6 } },
  { id: "ledger60",     when: { kinds: 60 },                reward: { type: "marks", n: 12000 } },
  { id: "keeper",       when: { kinds: 66 },                reward: { type: "title", id: "keeper" } },
  { id: "pouch1",       when: { offered: 10 },              reward: { type: "marks", n: 40 } },
  { id: "goldspun",     when: { level: 10, chests: 12 },    reward: { type: "title", id: "goldspun" } },
  { id: "stargazer",    when: { level: 15, offered: 120 },  reward: { type: "frame", id: "stargazer" } },
  { id: "bone_reaper",  when: { level: 18, sealed: 250 },   reward: { type: "title", id: "bone_reaper" } },
  { id: "archive",      when: { level: 20, chests: 60 },    reward: { type: "frame", id: "archive" } },
  { id: "voidtouched",  when: { level: 20, brushed: 80 },   reward: { type: "title", id: "voidtouched" } },
  { id: "wanderer",     when: { level: 25, visits: 150 },   reward: { type: "frame", id: "wanderer" } },
  { id: "fortunes_hand",when: { level: 25, gambles: 25 },   reward: { type: "title", id: "fortunes_hand" } },
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
    [11000, "AN OBSIDIAN VAULT"],
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
/* A metal's set: one coin of every rarity of it, common to mythic, ever
 * found (the journal's count, so selling one later never undoes it). The
 * first ten metals have sets (Astral keeps its twelve signs instead);
 * each pays its bonus once, finer metals more. About 60,000 for all ten. */
export const METAL_SETS = {
  metals: 10,
  bonus: [1000, 1500, 2000, 3000, 4000, 5500, 7000, 9000, 12000, 15000],
};

/* Fusing, at the forge: three coins of one metal and one rarity become a
 * single coin of that metal one rarity finer. A way to climb, not to
 * profit: the fee is a share of what the three would sell for. Not for
 * locked coins, the collectable sets (astral, the Magi's gifts) or a
 * mythic, which has nowhere higher to go. */
export const FUSE = { take: 3, feeShare: 0.1, minFee: 20 };

/* Secret titles (src/lib/data.js, secret: true): listed nowhere until
 * earned. The first star asks for an astral coin among a player's first
 * ten coins ever; coins are counted by the journal, which began on
 * `journalSince`, so only accounts made since then can be judged. */
export const SECRET = { firstStarWithin: 10, journalSince: Date.parse("2026-11-12T00:00:00Z") };

export const ASTRAL = {
  metal: 10,
  instead: 9,
  firstBonus: 10000,            // marks, the first time a player ever finds each sign
  signs: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
};

/* ─── the goblin's stall ──────────────────────────────────────────────
 * Five slots of wares, rolled for each player each local day (shared/
 * stall.js), each bought once. What it sells costs more than it is worth
 * — a chest about twice what its coins fetch, a coin coinMul × its sale
 * price — so buying to sell is never a way to print marks. */
export const STALL = {
  chestPrice: [25, 100, 450, 800, 1500, 2600, 4500],
  chestTier:  [44, 28, 14, 6, 5, 2, 1],  // slot 1's chest
  coinMul: 2.5,
  missingChance: 0.7,                     // a coin slot picks a kind missing from your journal
  featured: { coin: 40, chest: 35, oddity: 25, discount: 0.88, chestTier: [0, 0, 0, 25, 40, 25, 10], rarity: [0, 0, 0, 75, 25, 0] },
  // never a mythic: those are only ever found
  oddities: [                             // shop-only cosmetics: titles in src/lib/data.js PREMIUM_TITLES
    { type: "title", id: "goblin_friend",  price: 1500 },
    { type: "title", id: "coin_monger",    price: 2500 },
    { type: "title", id: "night_buyer",    price: 4000 },
    { type: "title", id: "ill_gotten",     price: 6000 },
    { type: "title", id: "stall_favourite",price: 9000 },
    // banners: frames in src/lib/data.js, painted in public/banners
    { type: "frame", id: "night_market",  price: 3000 },
    { type: "frame", id: "lantern_alley", price: 3500 },
    { type: "frame", id: "tunnel",        price: 4500 },
    { type: "frame", id: "bazaar",        price: 6000 },
    { type: "frame", id: "mint_below",    price: 8000 },
    { type: "frame", id: "hoard",         price: 12000 },
  ],
};

/* ─── the auction house (server/auction.js) ──────────────────────────
 * Players list coins for a starting price and a time of their own
 * choosing; the highest bid when the clock runs out takes the coin. The
 * house keeps a tenth of every sale. A bid in the last minutes pushes the
 * end back, so a coin can't be snatched in the final second. The goblin
 * lists a couple of his own each day. Open from level 5. */
export const AUCTION = {
  minLevel: 5,
  cut: 0.10,
  minutes: [10, 7 * 24 * 60],            // the shortest and longest a listing may run
  maxPrice: 10_000_000,
  raise: 0.05,                            // a new bid beats the last by at least this (and at least 1)
  snipe: 2 * 60_000,                      // a bid this close to the end moves the end this far out
  openPerPlayer: 8,
  house: { perDay: 2, chestTier: 4, startMul: 0.6, hours: 24 },      // an obsidian chest's band
};
