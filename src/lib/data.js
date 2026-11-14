/* ════════════════════════════════════════════════════════════════════════
 *  DATA TABLES
 *  ────────────────────────────────────────────────────────────────────────
 *  What things are called and what they look like. No React, no DOM, so
 *  the server can import it too. What things are WORTH lives in
 *  shared/tuning.js; this file only borrows from it.
 * ════════════════════════════════════════════════════════════════════════ */

import { RARITY_VALUE_MUL, SHINY_CHANCE_BY_BRUSH } from "../../shared/tuning.js";

/* ─── METALS ──────────────────────────────────────────────────────────── */
export const METALS = [
  { name:"Copper",  base:"#c47a30", mid:"#9a5218", dark:"#3e1e06", hl:"#eeaa70", eng:"#5a2e0a", accent:"#c47a30", flash:"rgba(196,122,48,.18)", rarity:"Common" },
  { name:"Bronze",  base:"#9a7240", mid:"#7a5428", dark:"#3a2010", hl:"#d4a060", eng:"#6a4218", accent:"#9a7240", flash:"rgba(154,114,64,.18)", rarity:"Uncommon" },
  { name:"Silver",  base:"#aabccc", mid:"#7890a2", dark:"#38506a", hl:"#d8eaf8", eng:"#304858", accent:"#aabccc", flash:"rgba(150,185,215,.18)",rarity:"Rare" },
  { name:"Gold",    base:"#d4a017", mid:"#a87800", dark:"#503800", hl:"#ffe878", eng:"#6a5000", accent:"#d4a017", flash:"rgba(212,160,23,.22)", rarity:"Epic" },
  { name:"Ice",     base:"#7ccaf4", mid:"#2f94d4", dark:"#0a2c48", hl:"#e8f8ff", eng:"#0c4a78", accent:"#52b6ec", flash:"rgba(124,202,244,.22)",rarity:"Legendary" },
  { name:"Obsidian",base:"#5a1890", mid:"#380a60", dark:"#0e0020", hl:"#c060ff", eng:"#e090ff", accent:"#7a28b0", flash:"rgba(120,20,220,.2)",  rarity:"Mythic" },
  { name:"Lava",    base:"#7e2c16", mid:"#55180c", dark:"#1a0604", hl:"#ffb030", eng:"#ff8a1a", accent:"#d8301a", flash:"rgba(255,120,30,.22)", rarity:"Molten" },
  { name:"Fire",    base:"#e86a1c", mid:"#a82c0c", dark:"#2a0802", hl:"#ffe070", eng:"#6a1404", accent:"#ff8a1a", flash:"rgba(255,170,40,.26)", rarity:"Blazing" },
  { name:"Void",    base:"#0e1040", mid:"#090920", dark:"#020208", hl:"#7070f8", eng:"#a0a0ff", accent:"#3030c0", flash:"rgba(50,50,220,.22)", rarity:"Transcendent" },
  { name:"Eldritch",base:"#2a5a3a", mid:"#0e3a1a", dark:"#021a08", hl:"#80ffb0", eng:"#5af090", accent:"#1aa050", flash:"rgba(80,255,160,.24)",rarity:"Eldritch" },
  { name:"Astral",  base:"#f0e8d0", mid:"#a89060", dark:"#605030", hl:"#fff8a0", eng:"#806010", accent:"#f0c840", flash:"rgba(255,240,160,.28)",rarity:"Celestial" },
];
export const MAX_TIER = 10;
/* the metals by name, for the places that treat one specially */
export const METAL = { copper: 0, bronze: 1, silver: 2, gold: 3, ice: 4, obsidian: 5, lava: 6, fire: 7, void: 8, eldritch: 9, astral: 10 };
/* ─── MATERIALS ───────────────────────────────────────────────────────────
 * Rare twins of a metal in another material. There are none just now:
 * ice and lava, the two there were, became metals of their own in the
 * ladder of November 2026 (migration 017). The plumbing stays for the
 * next ones. Shape: { tier, name, tex, eng, ramp[7], glows? }. */
export const MATERIALS = {};

/* ─── THE TWELVE ──────────────────────────────────────────────────────────
 * Each astral coin carries a star sign (shared/tuning.js ASTRAL), drawn on
 * its face as its constellation: stars at these points (0…1 across the
 * coin's field) joined by these lines. Simplified, but each its own. */
export const CONSTELLATIONS = [
  { stars: [[.1,.35],[.45,.25],[.75,.4],[.85,.62]], lines: [[0,1],[1,2],[2,3]] },                                                    // Aries
  { stars: [[.08,.1],[.4,.45],[.55,.57],[.68,.45],[.95,.12],[.55,.85]], lines: [[0,1],[1,2],[2,3],[3,4],[2,5]] },                      // Taurus
  { stars: [[.25,.08],[.2,.5],[.14,.9],[.68,.1],[.72,.5],[.82,.9]], lines: [[0,1],[1,2],[3,4],[4,5],[0,3],[1,4]] },                    // Gemini
  { stars: [[.5,.45],[.45,.08],[.15,.88],[.82,.86]], lines: [[0,1],[0,2],[0,3]] },                                                    // Cancer
  { stars: [[.15,.2],[.3,.08],[.45,.24],[.36,.45],[.5,.6],[.86,.55],[.9,.86],[.45,.86]], lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,4]] }, // Leo
  { stars: [[.08,.2],[.3,.35],[.5,.42],[.7,.3],[.92,.15],[.5,.7],[.34,.92],[.72,.94]], lines: [[0,1],[1,2],[2,3],[3,4],[2,5],[5,6],[5,7]] },        // Virgo
  { stars: [[.5,.08],[.15,.48],[.85,.48],[.25,.9],[.75,.9]], lines: [[0,1],[0,2],[1,2],[1,3],[2,4]] },                                 // Libra
  { stars: [[.08,.14],[.24,.24],[.4,.34],[.5,.54],[.55,.74],[.7,.88],[.88,.8],[.93,.6]], lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]] },     // Scorpio
  { stars: [[.12,.56],[.34,.4],[.55,.34],[.76,.45],[.88,.66],[.6,.78],[.34,.78],[.55,.1]], lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[2,7]] }, // Sagittarius
  { stars: [[.08,.2],[.5,.8],[.92,.14],[.7,.42],[.3,.38]], lines: [[0,1],[1,2],[2,3],[3,4],[4,0]] },                                   // Capricorn
  { stars: [[.08,.3],[.3,.14],[.5,.3],[.7,.14],[.92,.3],[.3,.62],[.5,.78],[.7,.62]], lines: [[0,1],[1,2],[2,3],[3,4],[5,6],[6,7]] },   // Aquarius
  { stars: [[.12,.18],[.3,.46],[.5,.9],[.7,.5],[.88,.24],[.02,.06],[.22,.04],[.98,.1],[.78,.08]], lines: [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,0],[4,7],[7,8],[8,4]] }, // Pisces
];
export const MATERIAL_OF_TIER = Object.fromEntries(Object.entries(MATERIALS).map(([id, m]) => [m.tier, id]));
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
// XP-gated titles: a scribe's climb. TITLE_LEVELS MUST stay the same length
// as TITLES — entries pair by index.
//
// A player's chosen title is stored by its label, so a label can never
// simply be edited: add the old → new pair to TITLE_RENAMES (and to a
// migration, see 010) and every place a title is read goes through
// currentTitle(). The first five entries below are the titles of the old
// digging game, rethemed.
export const TITLES       = ["Novice Scribe","Copper Hand","Sigil-Wright","Wax-Sealer","Coin Warden","Vault Keeper","Master of Seals","Grand Archivist","Mythic Collector","Void Walker","Starbinder","Coin Sage","Eternal Quill"];
export const TITLE_RENAMES = {
  "Novice Digger": "Novice Scribe",
  "Bronzesmith":   "Sigil-Wright",
  "Silver Seeker": "Wax-Sealer",
  "Master Minter": "Master of Seals",
  "Eternal Forge": "Eternal Quill",
  "Bone Reaper":   "Bone Quill",
};
export const DEFAULT_TITLE = TITLES[0];
export const currentTitle = label => TITLE_RENAMES[label] || label || DEFAULT_TITLE;
export const TITLE_LEVELS = [1, 5, 10, 15, 22, 30, 40, 52, 65, 80, 95, 110, 130];

/* ─── RARITY (independent of metal) ──────────────────────────────────────
   Six tiers. A coin's rarity is independent of its metal — a Common Bronze
   and a Legendary Bronze are both possible. The server rolls it when the
   chest opens; better chests lean it upward. */
export const RARITIES = [
  { id:0, name:"Common",    color:"#9a8868", glow:"rgba(154,136,104,.35)", weight:55,   valueMul:0 },
  { id:1, name:"Uncommon",  color:"#7ad888", glow:"rgba(122,216,136,.40)", weight:28,   valueMul:0 },
  { id:2, name:"Rare",      color:"#80c0ff", glow:"rgba(128,192,255,.45)", weight:11,   valueMul:0 },
  { id:3, name:"Epic",      color:"#c080ff", glow:"rgba(192,128,255,.50)", weight:4.5,  valueMul:0 },
  { id:4, name:"Legendary", color:"#f0c850", glow:"rgba(240,200,80,.55)",  weight:1.3,  valueMul:0 },
  { id:5, name:"Mythic",    color:"#ff7060", glow:"rgba(255,112,96,.65)",  weight:0.2,  valueMul:0 },
];
RARITIES.forEach((r, i) => { r.valueMul = RARITY_VALUE_MUL[i]; });
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
  // Premium frames — never sold. The goblin gives them (see GIFTS in
  // shared/tuning.js). Keys must match BANNERS.
  stargazer:{ lbl:"Stargazer",    minLvl:15, accent:"#c8b878", premium:true, desc:"A lone scholar at the edge of the world" },
  archive:  { lbl:"The Archive",  minLvl:20, accent:"#d4a850", premium:true, desc:"Where every collected lore is bound in light" },
  wanderer: { lbl:"The Wanderer", minLvl:25, accent:"#a89060", premium:true, desc:"Crowned spires beyond the wandering staff" },
  astrarium:{ lbl:"The Astrarium",minLvl:30, accent:"#b8a060", premium:true, desc:"Where the heavens are charted on stone" },
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
// Gifts from the goblin, never bought. `effect` maps to a CSS class in
// styles.css for the flair on the title text.
export const PREMIUM_TITLES = [
  { id:"goldspun",     label:"Goldspun",            minLvl:10, effect:"shimmer" },
  { id:"voidtouched",  label:"Void-Touched",        minLvl:20, effect:"void" },
  { id:"astral",       label:"Of the Astral Hour",  minLvl:35, effect:"astral" },
  { id:"bone_reaper",  label:"Bone Quill",          minLvl:18, effect:"shimmer" },   // id kept: it is what players own
  { id:"fortunes_hand",label:"Fortune's Hand",      minLvl:25, effect:"shimmer" },
  // for the journal
  { id:"cataloguer",   label:"The Cataloguer",      minLvl:1,  effect:"shimmer" },
  { id:"mythbound",    label:"Mythbound",           minLvl:1,  effect:"void" },
  { id:"keeper",       label:"Keeper of the Ledger",minLvl:1,  effect:"astral" },
  // sold at the goblin's stall
  { id:"goblin_friend",  label:"Goblin-Friend",           minLvl:1, effect:"shimmer" },
  { id:"coin_monger",    label:"Coin-Monger",             minLvl:1, effect:"shimmer" },
  { id:"night_buyer",    label:"Night Buyer",             minLvl:1, effect:"void" },
  { id:"ill_gotten",     label:"Of Ill-Gotten Wares",     minLvl:1, effect:"void" },
  { id:"stall_favourite",label:"The Stallholder's Favourite", minLvl:1, effect:"astral" },
];
export const PREMIUM_TITLE_BY_ID  = Object.fromEntries(PREMIUM_TITLES.map(t => [t.id, t]));
export const PREMIUM_TITLE_LABELS = new Set(PREMIUM_TITLES.map(t => t.label));

/* ─── BRUSHES ─────────────────────────────────────────────────────────── */
// `alpha` is how much dirt one pass lifts. Better brushes are gifts too.
export const BA = 0.32;
export const BRUSH_UPS = [
  { label:"Rough Brush",  alpha:BA  },
  { label:"Boar Bristle", alpha:.55 },
  { label:"Silver Brush", alpha:.9  },
  { label:"Gold Brush",   alpha:1.0 },
  { label:"Void Brush",   alpha:1.0 },
].map((b, i) => ({ ...b, shinyChance: SHINY_CHANCE_BY_BRUSH[i] }));
export const MAX_BR = BRUSH_UPS.length - 1;
