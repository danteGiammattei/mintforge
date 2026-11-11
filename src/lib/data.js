/* ════════════════════════════════════════════════════════════════════════
 *  DATA TABLES
 *  ────────────────────────────────────────────────────────────────────────
 *  Pure data — no functions, no React. Imported by coin.js (for METALS,
 *  RARITIES, SHAPES, CONDS, etc.) and by components throughout the app.
 *
 *  GAMBLES lives in coin.js because it references mkCoin / newSeed and
 *  putting it here would create a circular import.
 * ════════════════════════════════════════════════════════════════════════ */

/* ─── METALS ──────────────────────────────────────────────────────────── */
export const METALS = [
  { name:"Copper",  base:"#c47a30", mid:"#9a5218", dark:"#3e1e06", hl:"#eeaa70", eng:"#5a2e0a", accent:"#c47a30", flash:"rgba(196,122,48,.18)", rarity:"Common" },
  { name:"Bronze",  base:"#9a7240", mid:"#7a5428", dark:"#3a2010", hl:"#d4a060", eng:"#6a4218", accent:"#9a7240", flash:"rgba(154,114,64,.18)", rarity:"Uncommon" },
  { name:"Silver",  base:"#aabccc", mid:"#7890a2", dark:"#38506a", hl:"#d8eaf8", eng:"#304858", accent:"#aabccc", flash:"rgba(150,185,215,.18)",rarity:"Rare" },
  { name:"Gold",    base:"#d4a017", mid:"#a87800", dark:"#503800", hl:"#ffe878", eng:"#6a5000", accent:"#d4a017", flash:"rgba(212,160,23,.22)", rarity:"Epic" },
  { name:"Platinum",base:"#c0d8e8", mid:"#8ab0c8", dark:"#304860", hl:"#e8f4ff", eng:"#283848", accent:"#90c0e0", flash:"rgba(160,200,230,.22)",rarity:"Legendary" },
  { name:"Obsidian",base:"#5a1890", mid:"#380a60", dark:"#0e0020", hl:"#c060ff", eng:"#e090ff", accent:"#7a28b0", flash:"rgba(120,20,220,.2)",  rarity:"Mythic" },
  { name:"Void",    base:"#0e1040", mid:"#090920", dark:"#020208", hl:"#7070f8", eng:"#a0a0ff", accent:"#3030c0", flash:"rgba(50,50,220,.22)", rarity:"Transcendent" },
  { name:"Eldritch",base:"#2a5a3a", mid:"#0e3a1a", dark:"#021a08", hl:"#80ffb0", eng:"#5af090", accent:"#1aa050", flash:"rgba(80,255,160,.24)",rarity:"Eldritch" },
  { name:"Astral",  base:"#f0e8d0", mid:"#a89060", dark:"#605030", hl:"#fff8a0", eng:"#806010", accent:"#f0c840", flash:"rgba(255,240,160,.28)",rarity:"Celestial" },
];
export const MAX_TIER = 8;
/* ─── SHAPES ──────────────────────────────────────────────────────────── */
export const SHAPES      = ["round","round","round","round","octagonal","octagonal","hexagonal","hexagonal","holed","shield","diamond","oval"];
export const SHAPE_NAMES = { round:"Round", octagonal:"Octagonal", hexagonal:"Hexagonal", holed:"Pierced", shield:"Shield", diamond:"Diamond", oval:"Oval" };

/* ─── LORE / NAMING ───────────────────────────────────────────────────── */
export const CONS   = ["BR","DR","GR","KR","TH","SK","VR","BL","ST","MN","TR","ZR","KH","SV"];
export const VOWS   = ["AN","OR","EI","AE","UR","OA","UN","IA","YR","ETH","EOR"];
export const ERAS   = ["First","Second","Third","Ancient","Lost","Fallen","Risen","Sunken","Eternal","Cursed"];
export const EPOCH  = ["Epoch","Age","Cycle","Era","Reign","Dawn","Tide","Turning"];
export const HOUSES = ["the Ashen Crown","the Collapsing Sun","the Iron Serpent","the Void Moon","the Forgotten Flame","the Eternal Storm","the Black Tide","the Golden Silence","the Hollow King","the Ember Throne","the Shattered Mirror","the Sleeping God","the Crimson Veil"];
export const CONDS  = ["Pristine","Mint","Fine","Good","Fair","Worn","Corroded"];

/* ─── PROGRESSION ─────────────────────────────────────────────────────── */
// XP-gated titles. The TITLE_LEVELS array MUST stay the same length as
// TITLES — entries pair by index. selectTitle UI fades anything you haven't
// yet hit the level for.
export const TITLES       = ["Novice Digger","Copper Hand","Bronzesmith","Silver Seeker","Coin Warden","Vault Keeper","Master Minter","Grand Archivist","Mythic Collector","Void Walker","Starbinder","Coin Sage","Eternal Forge"];
export const TITLE_LEVELS = [1, 5, 10, 15, 22, 30, 40, 52, 65, 80, 95, 110, 130];

/* ─── RARITY (independent of metal) ──────────────────────────────────────
   Six tiers. A coin's rarity is independent of its metal — a Common Bronze
   and a Legendary Bronze are both possible. Rarity is rolled at find time
   based on dig quality, shiny status, and player level. */
export const RARITIES = [
  { id:0, name:"Common",    color:"#9a8868", glow:"rgba(154,136,104,.35)", weight:55,   valueMul:1.0  },
  { id:1, name:"Uncommon",  color:"#7ad888", glow:"rgba(122,216,136,.40)", weight:28,   valueMul:1.6  },
  { id:2, name:"Rare",      color:"#80c0ff", glow:"rgba(128,192,255,.45)", weight:11,   valueMul:2.5  },
  { id:3, name:"Epic",      color:"#c080ff", glow:"rgba(192,128,255,.50)", weight:4.5,  valueMul:4.0  },
  { id:4, name:"Legendary", color:"#f0c850", glow:"rgba(240,200,80,.55)",  weight:1.3,  valueMul:7.0  },
  { id:5, name:"Mythic",    color:"#ff7060", glow:"rgba(255,112,96,.65)",  weight:0.2,  valueMul:14.0 },
];
export const MAX_RARITY = 5;
export const RARITY_COLOR = { common:"#8a7560", uncommon:"#7ad888", rare:"#80c0ff", epic:"#c080ff", legendary:"#f0c850", mythic:"#ff7060" };

/* ─── BANNERS / FRAMES ────────────────────────────────────────────────── */
export const BANNERS = {
  stone:    "linear-gradient(135deg,#241a14 0%,#3a2820 50%,#1a120c 100%)",
  wood:     "linear-gradient(135deg,#3a1e08 0%,#5a3018 50%,#241408 100%)",
  iron:     "linear-gradient(135deg,#1a2630 0%,#2a3848 50%,#0e1820 100%)",
  gilded:   "linear-gradient(135deg,#3a2400 0%,#604000 50%,#241400 100%)",
  obsidian: "linear-gradient(135deg,#1a0040 0%,#400870 50%,#0a0020 100%)",
  void:     "linear-gradient(135deg,#04041a 0%,#101030 50%,#020210 100%)",
  // Image-backed banners — bannerStyle() turns these into proper image properties
  stargazer:"image:/banners/stargazer.webp",
  archive:  "image:/banners/archive.webp",
  wanderer: "image:/banners/wanderer.webp",
  astrarium:"image:/banners/astrarium.webp",
};
export const FRAMES = {
  stone:    { lbl:"Stone",        minLvl:1,  accent:"#8a7560" },
  wood:     { lbl:"Wood",         minLvl:5,  accent:"#a87238" },
  iron:     { lbl:"Iron",         minLvl:10, accent:"#7090b0" },
  gilded:   { lbl:"Gilded",       minLvl:20, accent:"#d4a017" },
  obsidian: { lbl:"Obsidian",     minLvl:30, accent:"#a050e8" },
  void:     { lbl:"Void",         minLvl:50, accent:"#5050e8" },
  // Premium frames — gated by both XP and a marks purchase. Keys must match BANNERS.
  stargazer:{ lbl:"Stargazer",    minLvl:15, accent:"#c8b878", premium:true, price:1800, desc:"A lone scholar at the edge of the world" },
  archive:  { lbl:"The Archive",  minLvl:20, accent:"#d4a850", premium:true, price:2100, desc:"Where every collected lore is bound in light" },
  wanderer: { lbl:"The Wanderer", minLvl:25, accent:"#a89060", premium:true, price:2400, desc:"Crowned spires beyond the wandering staff" },
  astrarium:{ lbl:"The Astrarium",minLvl:30, accent:"#b8a060", premium:true, price:3000, desc:"Where the heavens are charted on stone" },
};

// Returns the style object to spread for a banner background — handles both
// gradient strings and image URLs. Mixing CSS shorthand (`background:`) with
// React longhand (`backgroundSize:`) can cancel out, so we always split.
export function bannerStyle(frameId) {
  const v = BANNERS[frameId] || BANNERS.stone;
  if (v.startsWith("image:")) {
    const url = v.slice(6);
    return { backgroundImage:`url('${url}')`, backgroundSize:"cover", backgroundPosition:"center" };
  }
  return { backgroundImage:v };
}

/* ─── PREMIUM TITLES ──────────────────────────────────────────────────── */
// Premium titles — purchased with marks, level-gated. The `effect` string
// maps to a CSS class in styles.css for the visual flair on the title text.
// IMPORTANT: keep VALID_TITLE_IDS in functions/api/vault/index.js in sync
// with any additions here, otherwise the server will silently drop new IDs
// from saves.
export const PREMIUM_TITLES = [
  { id:"goldspun",    label:"Goldspun",            minLvl:10, price:600,  effect:"shimmer" },
  { id:"voidtouched", label:"Void-Touched",        minLvl:20, price:1500, effect:"void" },
  { id:"astral",      label:"Of the Astral Hour",  minLvl:35, price:3500, effect:"astral" },
  // Skeleton-gameplay-era additions
  { id:"bone_reaper", label:"Bone Reaper",         minLvl:18, price:1200, effect:"shimmer" },
  { id:"fortunes_hand",label:"Fortune's Hand",     minLvl:25, price:2000, effect:"shimmer" },
];
export const PREMIUM_TITLE_BY_ID  = Object.fromEntries(PREMIUM_TITLES.map(t => [t.id, t]));
export const PREMIUM_TITLE_LABELS = new Set(PREMIUM_TITLES.map(t => t.label));

export const BA = 0.32;
export const BRUSH_UPS = [
  { label:"Rough Brush",  alpha:BA,  shinyChance:.005, cost:null,                     desc:"0.5% shiny chance" },
  { label:"Boar Bristle", alpha:.55, shinyChance:.015, cost:[{m:0,n:2}],              desc:"1.5% shiny chance" },
  { label:"Silver Brush", alpha:.9,  shinyChance:.03,  cost:[{m:0,n:1},{m:2,n:2}],    desc:"3% shiny chance" },
  { label:"Gold Brush",   alpha:1.0, shinyChance:.05,  cost:[{m:3,n:1},{m:2,n:1}],    desc:"5% shiny chance" },
  { label:"Void Brush",   alpha:1.0, shinyChance:.08,  cost:[{m:5,n:1}],              desc:"8% shiny chance — tarot buffs stack on top" },
];
export const MAX_BR = BRUSH_UPS.length - 1;
/* ─── ORE / SKELETON GAMEPLAY ─────────────────────────────────────────────
   The hunt screen is now a side-scroller where skeletons spawn from the
   right, walk toward the player, get tapped to die, and drop one ore. Each
   ore is for a specific metal (matched to the existing METALS array).
   When a metal's ore bar fills, the player claims a coin of that metal —
   the existing brush-reveal flow takes over and rolls rarity + shiny as
   usual. */

// 9 ore drop weights — one per metal index. Sum to 1.0 ± rounding.
// Heavier weighting on copper/bronze so the loop feels active early, with
// astral as a vanishingly rare drop. Tweak in-game by editing this array.
export const ORE_DROP_WEIGHTS = [
  0.35,  // 0 Copper
  0.25,  // 1 Bronze
  0.15,  // 2 Silver
  0.10,  // 3 Gold
  0.07,  // 4 Platinum
  0.04,  // 5 Obsidian
  0.025, // 6 Void
  0.01,  // 7 Eldritch
  0.005, // 8 Astral
];

// How many ore drops fill a single bar (same for every metal — drop
// weights do the heavy lifting on coin-acquisition pacing).
export const ORE_PER_BAR = 10;

// Default zero state. Used when player_state.ore_counts is missing or
// when starting a fresh account.
export const DEFAULT_ORE_COUNTS = METALS.map(() => 0);

// Roll a single ore drop. Pure function — caller passes RNG range.
// Returns a metalIdx (0..8) according to ORE_DROP_WEIGHTS.
export function rollOreMetal(rand01) {
  let acc = 0;
  for (let i = 0; i < ORE_DROP_WEIGHTS.length; i++) {
    acc += ORE_DROP_WEIGHTS[i];
    if (rand01 < acc) return i;
  }
  return ORE_DROP_WEIGHTS.length - 1; // safety — should never hit
}

/* ─── DIG PIT ─────────────────────────────────────────────────────────── */
// 4×4 grid of soil cells. Used by both DigPit (rendering) and the main
// MintForge state machine (predicting non-coin cells for scrap budget).
export const GRID = 4;

/* ─── HUNT SENSE TEXT ─────────────────────────────────────────────────────
   Italicised line that drifts in based on signal strength on the hunt screen. */
export const SENSE_PHRASES = {
  faint:  ["something stirs the soil","the ground answers, faintly","a breath in the loam"],
  rising: ["the soil grows warmer","metal sings beneath","ancient echoes rise"],
  close:  ["something is here","the field grows tense","the air thickens"],
  locked: ["here. dig.","the coin waits","this place. now."],
};

/* ════════════════════════════════════════════════════════════════════════
 *  LOCATIONS — biomes the player travels to in the side-scrolling Hunt
 *  ────────────────────────────────────────────────────────────────────────
 *  Each location is a side-scrolling biome with its own coin profile.
 *  v1 ships ONE location ("the field") so the structure is set up for
 *  later expansion without code restructuring. To add a biome later:
 *    1. Add an entry here with art paths + dig modifiers
 *    2. Drop the parallax layer images into public/locations/<id>/
 *    3. Set its `unlockShovelLevel` to gate it behind a pickaxe tier
 *
 *  Fields:
 *    id                — stable string identifier (used in URLs/state)
 *    name              — display name on the map
 *    desc              — one-line atmospheric description
 *    unlockShovelLevel — minimum shovel level to enter (1 = always available)
 *    bgLayers          — list of parallax layer paths, deepest first.
 *                        Each layer has its own scrollMul (0 = static, 1 = world)
 *    scrollSpeed       — world scroll speed in px/sec at the foreground
 *    glintFrequency    — fraction of coin windows that surface a glint cue (0–1)
 *                        0.6 = 60% of windows are glinted, 40% are silent (per design)
 *    windowSpacingMs   — average ms between coin windows (range ±25%)
 *    windowDurationMs  — how long each window stays in tap-eligible range
 *    metalBias         — multiplier per metal idx applied during pickMetal
 *                        e.g. [1.5, 1.2, 1, 1, 1, 1, 1, 1, 1] biases toward copper
 *    rarityFloor       — minimum rarity index for finds (0 = common allowed)
 * ════════════════════════════════════════════════════════════════════════ */

export const LOCATIONS = [
  {
    id: "field",
    name: "The Field",
    desc: "Tall grass, distant mountains. The default stretch of earth.",
    unlockShovelLevel: 1,
    // Three-layer parallax: sky static, near foreground scrolls at world
    // speed. Far layer dropped per the skeleton-gameplay redesign — its
    // role is taken by procedurally-spawned trees/bushes/vending machines
    // in HuntSideScroller.
    bgLayers: [
      { path: "/locations/field/sky.webp",  scrollMul: 0    },
      { path: "/locations/field/near.webp", scrollMul: 1.0  },
    ],
    scrollSpeed: 0.3,            // viewport-widths per second
    glintFrequency: 0.6,
    windowSpacingMs: 6000,     // average ~6s between windows
    windowDurationMs: 1800,    // ~1.8s tap-eligible window
    metalBias: [1.5, 1.3, 1, 1, 1, 1, 1, 1, 1],  // copper/bronze biased
    rarityFloor: 0,
  },
  // Future locations slot in here. Examples (NOT YET BUILT):
  //
  // {
  //   id: "ruins", name: "The Eldritch Ruins",
  //   desc: "Stone and silence. Things sleep here that should not.",
  //   unlockShovelLevel: 5,
  //   bgLayers: [{path:"/locations/ruins/sky.webp", scrollMul:0.05}, ...],
  //   scrollSpeed: 55, glintFrequency: 0.5, windowSpacingMs: 5000,
  //   metalBias: [0.5, 0.7, 1, 1.2, 1.4, 1.6, 1.5, 1.3, 1.1],
  //   rarityFloor: 1,
  // },
];

// Fast lookup by id; v1 only has one entry but consumers should still go
// through this so the API doesn't change when biomes get added.
export const LOCATION_BY_ID = Object.fromEntries(LOCATIONS.map(l => [l.id, l]));
export const DEFAULT_LOCATION_ID = "field";