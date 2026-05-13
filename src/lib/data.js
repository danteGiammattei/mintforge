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
// SHOVEL_TIER_CAP[shovelLevel-1] = highest metal index reachable at that level.
// Lv9 doesn't unlock a new metal — caps at 8 (Astral). The top tier provides
// non-metal benefits (durability, depth bonus). See SHOVEL_UPS for details.
export const SHOVEL_TIER_CAP = [1, 2, 3, 4, 5, 6, 7, 8, 8];

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
export const TITLES       = ["Novice Digger","Copper Hand","Bronzesmith","Silver Seeker","Coin Warden","Vault Keeper","Master Minter","Grand Archivist","Mythic Collector","Void Walker"];
export const TITLE_LEVELS = [1, 5, 10, 15, 22, 30, 40, 52, 65, 80];

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

/* ─── ARTEFACTS ───────────────────────────────────────────────────────────
   Forged at the Shrine by combining 5 coins of the same metal + a marks fee.
   Each metal yields a different artefact. The artefact's "grade" reflects
   the average rarity of input coins. Currently decorative; future hooks
   include effects, avatars, and companions. */
export const ARTEFACTS = [
  { metal:0, name:"Sunforged Pendant", icon:"☉", art:"copper",   desc:"A pendant blessed by solar fire. It radiates warmth and courage, burning darkness at bay." },
  { metal:1, name:"Bronze Astrolabe",  icon:"⊙", art:"bronze",   desc:"An ancient instrument used to chart the stars and measure fate's endless cycles." },
  { metal:2, name:"Silver Crescent",   icon:"☽", art:"silver",   desc:"A crescent of cold silver. It whispers of the night and guides travelers in darkness." },
  { metal:3, name:"Gilded Time",       icon:"⧗", art:"gold",     desc:"Time is suspended within. It grants moments to those who dare command it." },
  { metal:4, name:"Platinum Compass",  icon:"✥", art:"platinum", desc:"A flawless compass that points not north, but to destiny's truest path." },
  { metal:5, name:"Obsidian Mirror",   icon:"◈", art:"obsidian", desc:"It reflects not your face, but your hidden self. Beware what gazes back." },
  { metal:6, name:"Voidstone Anchor",  icon:"✶", art:null,       desc:"Heavier than any object should be — its weight pulls at more than gravity." },
  { metal:7, name:"Eldritch Codex",    icon:"⌬", art:"eldritch", desc:"Written in a language that unminds. It holds knowledge meant to remain unseen." },
  { metal:8, name:"Celestial Orb",     icon:"❋", art:"astral",   desc:"A remnant from the heavens. It hums with starlight and cosmic harmony." },
];

export const ARTEFACT_GRADES = [
  { id:0, name:"Worn",      color:"#9a8870", threshold:0   },
  { id:1, name:"Polished",  color:"#7ad888", threshold:1.5 },
  { id:2, name:"Pristine",  color:"#80c0ff", threshold:2.5 },
  { id:3, name:"Radiant",   color:"#c080ff", threshold:3.5 },
  { id:4, name:"Ascendant", color:"#f0c850", threshold:4.5 },
];

// Marks cost to forge an artefact. Aggressive curve so abundant low-tier coins
// still cost meaningful marks to convert, while top tiers serve as a long-term sink.
export const ARTEFACT_FORGE_COST = [250, 600, 1500, 3500, 7500, 14000, 22000, 32000, 50000];

/* ─── PREMIUM TITLES ──────────────────────────────────────────────────── */
export const PREMIUM_TITLES = [
  { id:"goldspun",    label:"Goldspun",            minLvl:10, price:600,  effect:"shimmer" },
  { id:"voidtouched", label:"Void-Touched",        minLvl:20, price:1500, effect:"void" },
  { id:"astral",      label:"Of the Astral Hour",  minLvl:35, price:3500, effect:"astral" },
];
export const PREMIUM_TITLE_BY_ID  = Object.fromEntries(PREMIUM_TITLES.map(t => [t.id, t]));
export const PREMIUM_TITLE_LABELS = new Set(PREMIUM_TITLES.map(t => t.label));

/* ─── EQUIPMENT UPGRADES ──────────────────────────────────────────────── */
// Index 0 is null (no upgrade); array index = shovel level.
export const SHOVEL_UPS = [
  null,
  { label:"Iron Shovel",    depth:2, cost:[{m:0,n:3}],          desc:"Reaches depth 2" },
  { label:"Bronze Pick",    depth:3, cost:[{m:0,n:2},{m:1,n:2}],desc:"Reaches depth 3" },
  { label:"Steel Pick",     depth:4, cost:[{m:2,n:2},{m:1,n:1}],desc:"Reaches depth 4" },
  { label:"Gilded Pick",    depth:5, cost:[{m:3,n:1},{m:2,n:2}],desc:"Reaches depth 5" },
  { label:"Platinum Pick",  depth:6, cost:[{m:4,n:1},{m:3,n:1}],desc:"Reaches depth 6" },
  { label:"Void Excavator", depth:7, cost:[{m:5,n:1},{m:4,n:1}],desc:"Reaches depth 7" },
  { label:"Eldritch Drill", depth:8, cost:[{m:6,n:1},{m:5,n:1}],desc:"Reaches depth 8" },
  { label:"Astral Cleaver", depth:9, cost:[{m:7,n:1},{m:6,n:1}],desc:"Reaches depth 9 — all metals" },
  { label:"Eldritch Maul",  depth:9, cost:[{m:8,n:2},{m:7,n:2}],desc:"+ Heavy build · 50% more durability" },
];

// BRUSH constants — BA is the base brush alpha used by both the BrushReveal
// component and the brush-upgrade table. Importing it directly keeps the data
// layer self-contained without forcing components to provide it.
export const BA = 0.32;
export const BRUSH_UPS = [
  { label:"Rough Brush",  alpha:BA,  shinyChance:.005, cost:null,                     desc:"0.5% shiny chance" },
  { label:"Boar Bristle", alpha:.55, shinyChance:.015, cost:[{m:0,n:2}],              desc:"1.5% shiny chance" },
  { label:"Silver Brush", alpha:.9,  shinyChance:.03,  cost:[{m:0,n:1},{m:2,n:2}],    desc:"3% shiny chance" },
  { label:"Gold Brush",   alpha:1.0, shinyChance:.05,  cost:[{m:3,n:1},{m:2,n:1}],    desc:"5% shiny chance" },
  { label:"Void Brush",   alpha:1.0, shinyChance:.08,  cost:[{m:5,n:1}],              desc:"8% shiny chance — tarot buffs stack on top" },
];
export const MAX_SH = SHOVEL_UPS.length - 1;
export const MAX_BR = BRUSH_UPS.length - 1;

// Pickaxe durability — index by shovelLevel.
export const SHOVEL_MAX_DUR = [null, 40, 60, 90, 130, 180, 250, 350, 500, 700];

/* ─── TAROT ───────────────────────────────────────────────────────────────
   Nine cards across three rarity tiers. Maximum 2 equipped. Each effect is
   *visible* during normal play (numerical badge, conditional UI, post-find moment). */
export const TAROT_CARDS = [
  // ── COMMON TIER ──────────────────────────────────────────────────
  { id:"magician", title:"The Magician", roman:"I",  rarity:"common",  price:800,  minLvl:5,
    xpMul:0.25,
    desc:"+25% XP from every find." },
  { id:"lovers",   title:"The Lovers",   roman:"VI", rarity:"common",  price:1000, minLvl:6,
    pinSlots:1,
    desc:"+1 display cabinet slot." },
  { id:"empress",  title:"The Empress",  roman:"III",rarity:"common",  price:1200, minLvl:8,
    marksMul:0.15,
    desc:"+15% marks from selling coins." },

  // ── RARE TIER ────────────────────────────────────────────────────
  { id:"hermit",           title:"The Hermit",       roman:"IX", rarity:"rare", price:2200, minLvl:12,
    revealRarity:true, allowSkip:true,
    desc:"Every coin window glints — no silent finds. The lantern lights the path." },
  { id:"wheel_of_fortune", title:"Wheel of Fortune", roman:"X",  rarity:"rare", price:2800, minLvl:15,
    guaranteedEvery:7, guaranteedFloor:2,
    desc:"Every 7th find is guaranteed Rare or higher. Counter visible on hunt screen." },
  { id:"chariot",          title:"The Chariot",      roman:"VII",rarity:"rare", price:2400, minLvl:14,
    firstStrikeBonus:0.25,
    desc:"+25% chance the coin is in your first dig cell (instant find, max XP)." },

  // ── LEGENDARY TIER ───────────────────────────────────────────────
  { id:"tower",      title:"The Tower",      roman:"XVI",rarity:"legendary", price:5000, minLvl:25,
    forgeDiscount:0.40,
    desc:"All artefact forging costs reduced by 40%." },
  { id:"hanged_man", title:"The Hanged Man", roman:"XII",rarity:"legendary", price:4500, minLvl:22,
    rerollRarity:1,
    desc:"Once per day, reroll the rarity of a coin you just found." },
  { id:"sun",        title:"The Sun",        roman:"XIX",rarity:"legendary", price:5500, minLvl:30,
    rarityFloor:1, glyph:"☀",
    desc:"All finds are guaranteed at least Uncommon rarity." },
];
export const TAROT_BY_ID = Object.fromEntries(TAROT_CARDS.map(c => [c.id, c]));
// Two equipped at a time — combinations matter, but no card is "always-on".
export const MAX_EQUIPPED_TAROTS = 2;

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
    // Two-layer parallax: sky covers everything, near is the foreground
    // the player runs across. The mid and far layers were dropped because
    // their painted horizons clashed with the sky's own painted haze —
    // hard top edges on both layers read as floating cutouts rather than
    // distance. The sky alone sells the mid-distance depth.
    bgLayers: [
      { path: "/locations/field/sky.webp",  scrollMul: 0    }, // full-coverage sky, static
      { path: "/locations/field/near.webp", scrollMul: 1.0  }, // foreground dirt, rocks, grass
    ],
    // scrollSpeed unit: VIEWPORT-FRACTIONS per second (NOT px/sec — the
    // comment used to say px/sec and the value was 70, which made windows
    // zip past in 10ms. 0.3 means the world scrolls ~one viewport every
    // ~3 seconds, giving the player time to react to a glint cue.
    scrollSpeed: 0.3,
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

/* ════════════════════════════════════════════════════════════════════════
 *  COIN EMBLEM CATALOGUE
 *  ────────────────────────────────────────────────────────────────────────
 *  Coins are now hand-illustrated rather than procedurally drawn. The art
 *  lives at /public/coins/<metal>_<emblem>.png and is sliced from a master
 *  sheet by tools/slice-coins.mjs.
 *
 *  Each metal has a roster of available emblems. A coin's seed deterministic-
 *  ally picks one from its metal's roster. Same seed → same emblem, always.
 *
 *  Copper and Bronze have 32 emblems each (more variety for the most-found
 *  coins). All other metals have 16 emblems (the "base" set).
 * ════════════════════════════════════════════════════════════════════════ */

// The 16 base emblems shared across every metal.
export const EMBLEMS_BASE = [
  "compass", "crescent", "sun", "northstar", "eye", "sword",
  "chalice", "scales", "laurel", "lyre", "tree", "flame",
  "lotus", "wing", "key", "tower",
];

// Additional 16 emblems available only for Copper and Bronze.
// Names marked TODO need verification against the source sheet — derived
// from visual analysis but a couple of cells were ambiguous.
export const EMBLEMS_EXTRA = [
  "chalice2", "tower2", "hourglass", "serpent", "triskele", "shield",
  "feather", "wolf", "bear", "anchor", "pendant", "shootingstar",
  "planet", "book", "crystal", "comet",
];

// Per-metal emblem rosters. Look up by metalIdx (0-8 from METALS array).
// Updated for the high-res sheet, which adds extra emblems for Silver,
// Obsidian and Eldritch (alongside the existing Copper/Bronze extras).
// Platinum and Void aren't in the high-res sheet — they fall back to
// EMBLEMS_BASE so coinImagePath still resolves to a stable filename
// (CoinCanvas's procedural fallback paints them if the file 404s).
//   0=Copper, 1=Bronze, 2=Silver, 5=Obsidian, 7=Eldritch → base + extra (32)
//   3=Gold, 4=Platinum, 6=Void, 8=Astral                  → base only   (16)
export const EMBLEMS_BY_METAL = [
  [...EMBLEMS_BASE, ...EMBLEMS_EXTRA], // 0 Copper
  [...EMBLEMS_BASE, ...EMBLEMS_EXTRA], // 1 Bronze
  [...EMBLEMS_BASE, ...EMBLEMS_EXTRA], // 2 Silver
  EMBLEMS_BASE,                        // 3 Gold
  EMBLEMS_BASE,                        // 4 Platinum (procedural)
  [...EMBLEMS_BASE, ...EMBLEMS_EXTRA], // 5 Obsidian
  EMBLEMS_BASE,                        // 6 Void (procedural)
  [...EMBLEMS_BASE, ...EMBLEMS_EXTRA], // 7 Eldritch
  EMBLEMS_BASE,                        // 8 Astral
];

// File-system metal slugs — must match the slicer output filenames.
// Keep in step with METALS array order.
export const METAL_SLUGS = [
  "copper", "bronze", "silver", "gold", "platinum",
  "obsidian", "void", "eldritch", "astral",
];

// Pick an emblem deterministically from a coin's seed + metal.
// Same seed → same emblem, every render. Stable as long as the metal's
// roster doesn't change order.
export function emblemForCoin(seed, metalIdx) {
  const roster = EMBLEMS_BY_METAL[metalIdx] || EMBLEMS_BASE;
  // xor with a fixed constant so emblem distribution doesn't accidentally
  // correlate with other seed-derived properties (rune name, era, etc.)
  const idx = ((seed >>> 0) ^ 0xc01ee) % roster.length;
  return roster[idx];
}

// Returns the public asset path for a coin image.
// Used by CoinCanvas / CoinModal / RevealBanner.
export function coinImagePath(coin) {
  const metal = METAL_SLUGS[coin.metalIdx] || "copper";
  const emblem = emblemForCoin(coin.seed, coin.metalIdx);
  return `/coins/${metal}_${emblem}.webp`;
}

