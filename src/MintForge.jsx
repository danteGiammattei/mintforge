import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ════════════════════════════════════════════════════════════════════════
   MINTFORGE  •  v2  •  refined dark-fantasy codex
   ──────────────────────────────────────────────────────────────────────── */

/* ─── THEME ───────────────────────────────────────────────────────────── */
const DARK = {
  bg:"#0e0a08", surface:"#1a1310", surface2:"#15100d", surfaceHi:"#241a14",
  border:"rgba(212,160,23,0.10)", borderHi:"rgba(212,160,23,0.22)",
  text:"#f3e6cf", textDim:"#c8b89a", muted:"#8a7560", faint:"#221813",
  accent:"#d4a017", accentHi:"#f0c850", accentDim:"#7a5a10", accentInk:"#1a0f04",
  oxblood:"#5a1818", oxbloodHi:"#a83040",
  nav:"rgba(14,10,8,0.88)",
  input:"#15100d", inputBorder:"rgba(212,160,23,0.18)", inputFocus:"rgba(212,160,23,0.45)",
  danger:"#d24a28", success:"#7ab85a",
  noiseOpacity:0.04,
};
const LIGHT = {
  bg:"#f5ecd8", surface:"#fcf6e6", surface2:"#f0e6c8", surfaceHi:"#ebe0bc",
  border:"rgba(74,40,8,0.14)", borderHi:"rgba(74,40,8,0.28)",
  text:"#241608", textDim:"#4a3520", muted:"#7a6240", faint:"#ebe0bc",
  accent:"#a06800", accentHi:"#d49020", accentDim:"#6a4400", accentInk:"#fcf6e6",
  oxblood:"#7a1818", oxbloodHi:"#a83040",
  nav:"rgba(245,236,216,0.9)",
  input:"#fcf6e6", inputBorder:"rgba(74,40,8,0.2)", inputFocus:"rgba(160,104,0,0.6)",
  danger:"#a83018", success:"#4a7820",
  noiseOpacity:0.03,
};

/* ─── STYLES (deduped) ────────────────────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("mintforge-styles")) {
  const s = document.createElement("style");
  s.id = "mintforge-styles";
  s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900&family=Outfit:wght@300;400;500;600;700;800;900&family=VT323&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overscroll-behavior:none;}
button{-webkit-tap-highlight-color:transparent;}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(212,160,23,.18);border-radius:8px}
::-webkit-scrollbar-thumb:hover{background:rgba(212,160,23,.32)}
::selection{background:rgba(212,160,23,.3);color:#fff}

@keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeinSlow{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes ping{0%{transform:translate(-50%,-50%) scale(.8);opacity:.85}100%{transform:translate(-50%,-50%) scale(3.6);opacity:0}}
@keyframes scanline{0%{transform:translateX(-4%)}100%{transform:translateX(104%)}}
@keyframes pulseDot{0%,100%{transform:translate(-50%,-50%) scale(1);box-shadow:0 0 12px currentColor}50%{transform:translate(-50%,-50%) scale(1.15);box-shadow:0 0 22px currentColor}}
@keyframes lensRingPulse{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.06);opacity:.9}}
@keyframes lensGlyphFloat{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(-2px)}}
@keyframes lensFoundPulse{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes senseFadeIn{0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}
@keyframes ambientDrift{0%,100%{transform:translateX(0)}50%{transform:translateX(8px)}}
@keyframes gleam{0%{transform:translateX(-60%);opacity:0}10%{opacity:1}60%{opacity:.9}100%{transform:translateX(140%);opacity:0}}
@keyframes flashIn{0%{opacity:0;transform:scale(.7) translateY(14px)}55%{transform:scale(1.06) translateY(-3px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes rarityFlash{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes subtlePulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes digPop{0%{transform:scale(1)}40%{transform:scale(.84) translateY(5px)}100%{transform:scale(1)}}
@keyframes cellReveal{0%{opacity:0;transform:scale(.5)}65%{transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}60%{transform:translateX(6px)}}
@keyframes winPop{0%{transform:scale(0) rotate(-15deg)}65%{transform:scale(1.18) rotate(4deg)}100%{transform:scale(1) rotate(0)}}
@keyframes shinyAuraGlow{0%,100%{box-shadow:0 0 0 1.5px #ff6080,0 0 18px 2px rgba(255,96,128,.55),inset 0 0 12px rgba(255,200,80,.18)}33%{box-shadow:0 0 0 1.5px #60ff90,0 0 18px 2px rgba(96,255,144,.55),inset 0 0 12px rgba(120,255,180,.18)}66%{box-shadow:0 0 0 1.5px #9060ff,0 0 18px 2px rgba(144,96,255,.55),inset 0 0 12px rgba(180,120,255,.18)}}
@keyframes ambientFloat1{0%,100%{transform:translate(0,0);opacity:.0}25%{opacity:.9}50%{transform:translate(10px,-12px);opacity:.5}75%{opacity:.9}}
@keyframes ambientFloat2{0%,100%{transform:translate(0,0);opacity:.0}30%{opacity:.7}50%{transform:translate(-8px,-10px);opacity:.4}70%{opacity:.7}}
@keyframes ambientFloat3{0%,100%{transform:translate(0,0);opacity:.0}35%{opacity:.85}50%{transform:translate(6px,-14px);opacity:.45}65%{opacity:.85}}
.ambient-particles{position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:2;}
.ambient-particles>span{position:absolute;width:3px;height:3px;border-radius:50%;display:block;}
.ambient-particles.eldritch>span{background:#80ffb0;box-shadow:0 0 6px #80ffb0,0 0 10px #5af090aa;}
.ambient-particles.astral>span{background:#fff8a0;box-shadow:0 0 6px #fff8a0,0 0 12px #ffd060aa;width:2.5px;height:2.5px;}
.ambient-particles>span:nth-child(1){left:18%;top:75%;animation:ambientFloat1 4s ease-in-out infinite;}
.ambient-particles>span:nth-child(2){left:78%;top:65%;animation:ambientFloat2 5s ease-in-out infinite .8s;}
.ambient-particles>span:nth-child(3){left:50%;top:82%;animation:ambientFloat3 4.5s ease-in-out infinite 1.6s;}
@keyframes titleShimmer{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes titleVoidPulse{0%,100%{text-shadow:0 0 6px rgba(160,80,232,.6),0 0 12px rgba(160,80,232,.3)}50%{text-shadow:0 0 10px rgba(200,120,255,.9),0 0 20px rgba(160,80,232,.6),0 0 28px rgba(120,40,200,.4)}}
@keyframes titleAstralGlow{0%,100%{filter:hue-rotate(0deg) brightness(1)}33%{filter:hue-rotate(15deg) brightness(1.15)}66%{filter:hue-rotate(-10deg) brightness(1.05)}}
.title-shimmer{background:linear-gradient(90deg,#d4a017 0%,#fff8a0 50%,#d4a017 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:titleShimmer 3s ease-in-out infinite;font-weight:800;}
.title-void{color:#c890ff;animation:titleVoidPulse 2.4s ease-in-out infinite;font-weight:800;}
.title-astral{background:linear-gradient(90deg,#fff8a0,#ffd060,#a8d8ff,#c890ff,#fff8a0);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:titleShimmer 4s linear infinite, titleAstralGlow 5s ease-in-out infinite;font-weight:800;}
@keyframes scrapFly{0%{transform:translate(0,0) scale(0.4) rotate(0deg);opacity:0}10%{transform:translate(0,-22px) scale(1.5) rotate(40deg);opacity:1}45%{transform:translate(calc(var(--dx)*.4),calc(var(--dy)*.3 - 30px)) scale(1.15) rotate(180deg);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(0.6) rotate(720deg);opacity:0}}
@keyframes scrapText{0%{opacity:0;transform:translate(-50%,0) scale(.7)}15%{opacity:1;transform:translate(-50%,-12px) scale(1.1)}65%{opacity:1;transform:translate(-50%,-30px) scale(1)}100%{opacity:0;transform:translate(-50%,-50px) scale(.85)}}
@keyframes marksPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18);text-shadow:0 0 12px currentColor}}
@keyframes shinyText{0%,100%{color:#ff8080}16%{color:#ffcc40}33%{color:#80ffa0}50%{color:#80d0ff}66%{color:#a080ff}83%{color:#ff80ff}}
@keyframes shinyRotate{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes particleFly{0%{opacity:1;transform:translate(0,0) rotate(0deg) scale(1)}100%{opacity:0;transform:translate(var(--tx),var(--ty)) rotate(var(--r)) scale(.4)}}
@keyframes luckySlam{0%{opacity:0;transform:translateY(-44px) scale(.55)}50%{transform:translateY(5px) scale(1.1)}70%{transform:translateY(-3px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes flicker{0%,100%{opacity:1}45%{opacity:.84}55%{opacity:1}}
@keyframes pickSwing{0%{transform:translate(-50%,-90%) rotate(-55deg) scale(.9);opacity:.95}45%{transform:translate(-50%,-90%) rotate(20deg) scale(1.18);opacity:1}100%{transform:translate(-50%,-90%) rotate(0deg) scale(.7);opacity:0}}
@keyframes pickSwingCell{0%{transform:rotate(-50deg) scale(.8);opacity:.9}45%{transform:rotate(15deg) scale(1.25);opacity:1}100%{transform:rotate(0) scale(.6);opacity:0}}
.shiny-card{position:relative;}
.shiny-aura{position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;animation:shinyAuraGlow 2.4s linear infinite;}
.shiny-card>*:not(.shiny-aura){position:relative;z-index:1;}
.noise-overlay{position:absolute;inset:0;pointer-events:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/></svg>");mix-blend-mode:overlay}
.tab-active-indicator{position:absolute;top:0;left:50%;transform:translateX(-50%);width:24px;height:2px;border-radius:0 0 2px 2px;background:currentColor;box-shadow:0 0 8px currentColor}
`;
  document.head.appendChild(s);
}

/* ─── RUNES ───────────────────────────────────────────────────────────── */
const RL={A:"ᚨ",B:"ᛒ",C:"ᚲ",D:"ᛞ",E:"ᛖ",F:"ᚠ",G:"ᚷ",H:"ᚺ",I:"ᛁ",J:"ᛃ",K:"ᚲ",L:"ᛚ",M:"ᛗ",N:"ᚾ",O:"ᛟ",P:"ᛈ",R:"ᚱ",S:"ᛊ",T:"ᛏ",U:"ᚢ",V:"ᚡ",W:"ᚹ",X:"ᛪ",Y:"ᚤ",Z:"ᛉ"};
const DG={TH:"ᚦ",GR:"ᚷᚱ",BR:"ᛒᚱ",DR:"ᛞᚱ",KR:"ᚲᚱ",SK:"ᛊᚲ",ST:"ᛊᛏ"};
function rune(s){let o="",i=0;while(i<s.length){const d=s.slice(i,i+2);if(DG[d]){o+=DG[d];i+=2;}else{o+=RL[s[i]]||s[i];i++;}}return o;}

/* ─── PRNG ────────────────────────────────────────────────────────────── */
class RNG{
  constructor(seed){this.s=(seed^0xdeadbeef)>>>0||1;}
  next(){this.s^=this.s<<13;this.s^=this.s>>>17;this.s^=this.s<<5;return(this.s>>>0)/4294967296;}
  int(lo,hi){return Math.floor(this.next()*(hi-lo+1))+lo;}
  pick(a){return a[this.int(0,a.length-1)];}
  bool(p=0.5){return this.next()<p;}
}

/* ─── METALS ──────────────────────────────────────────────────────────── */
const METALS=[
  {name:"Copper",  base:"#c47a30",mid:"#9a5218",dark:"#3e1e06",hl:"#eeaa70",eng:"#5a2e0a",accent:"#c47a30",flash:"rgba(196,122,48,.18)",rarity:"Common"},
  {name:"Bronze",  base:"#9a7240",mid:"#7a5428",dark:"#3a2010",hl:"#d4a060",eng:"#6a4218",accent:"#9a7240",flash:"rgba(154,114,64,.18)",rarity:"Uncommon"},
  {name:"Silver",  base:"#aabccc",mid:"#7890a2",dark:"#38506a",hl:"#d8eaf8",eng:"#304858",accent:"#aabccc",flash:"rgba(150,185,215,.18)",rarity:"Rare"},
  {name:"Gold",    base:"#d4a017",mid:"#a87800",dark:"#503800",hl:"#ffe878",eng:"#6a5000",accent:"#d4a017",flash:"rgba(212,160,23,.22)",rarity:"Epic"},
  {name:"Platinum",base:"#c0d8e8",mid:"#8ab0c8",dark:"#304860",hl:"#e8f4ff",eng:"#283848",accent:"#90c0e0",flash:"rgba(160,200,230,.22)",rarity:"Legendary"},
  {name:"Obsidian",base:"#5a1890",mid:"#380a60",dark:"#0e0020",hl:"#c060ff",eng:"#e090ff",accent:"#7a28b0",flash:"rgba(120,20,220,.2)",rarity:"Mythic"},
  {name:"Void",    base:"#0e1040",mid:"#090920",dark:"#020208",hl:"#7070f8",eng:"#a0a0ff",accent:"#3030c0",flash:"rgba(50,50,220,.22)",rarity:"Transcendent"},
  {name:"Eldritch",base:"#2a5a3a",mid:"#0e3a1a",dark:"#021a08",hl:"#80ffb0",eng:"#5af090",accent:"#1aa050",flash:"rgba(80,255,160,.24)",rarity:"Eldritch"},
  {name:"Astral",  base:"#f0e8d0",mid:"#a89060",dark:"#605030",hl:"#fff8a0",eng:"#806010",accent:"#f0c840",flash:"rgba(255,240,160,.28)",rarity:"Celestial"},
];
const MAX_TIER=8;
// SHOVEL_TIER_CAP[shovelLevel-1] = highest metal index reachable at that level.
// Lv9 doesn't unlock a new metal — caps at 8 (Astral). The top tier provides
// non-metal benefits (durability, depth bonus). See SHOVEL_UPS for details.
const SHOVEL_TIER_CAP=[1,2,3,4,5,6,7,8,8];
function pickMetal(rng,pLvl=1,tierCap=MAX_TIER){
  const b=Math.min(pLvl-1,50);
  // 9 tiers: copper, bronze, silver, gold, platinum, obsidian, void, eldritch, astral
  // Weights skew heavily toward common at low levels, slowly opening up rare tiers as pLvl rises.
  const w=[
    Math.max(14,38-b*.48),    // copper
    Math.max(10,22-b*.18),    // bronze
    18+b*.08,                  // silver
    12+b*.12,                  // gold
    6+b*.14,                   // platinum
    3+b*.08,                   // obsidian
    Math.min(15,1+b*.08),      // void
    Math.max(.2,b*.02),        // eldritch — very rare even at high levels
    Math.max(.05,b*.008),      // astral — vanishingly rare
  ];
  const tot=w.reduce((a,v)=>a+v,0);
  let r=rng.next()*tot,c=0;
  for(let i=0;i<w.length;i++){c+=w[i];if(r<=c)return Math.min(i,tierCap);}return 0;
}

/* ─── SHAPES & FACES ──────────────────────────────────────────────────── */
const SHAPES=["round","round","round","round","octagonal","octagonal","hexagonal","hexagonal","holed","shield","diamond","oval"];
const SHAPE_NAMES={round:"Round",octagonal:"Octagonal",hexagonal:"Hexagonal",holed:"Pierced",shield:"Shield",diamond:"Diamond",oval:"Oval"};
function genFace(seed){
  // 13×13 face grid (was 9×9). Higher density allows more complex random patterns
  // while preserving the "ancient minted" aesthetic. half=7 cells per side, mirrored.
  const rng=new RNG(seed^0xf4ce1a);const SZ=13,half=7,center=(SZ-1)/2;
  let L=Array.from({length:SZ},(_,y)=>Array.from({length:half},(_,x)=>{
    const d=Math.hypot(x-center,y-center)/(center*0.95);
    // Higher base density (0.42 vs 0.38) compensates for finer grid; falloff toward edges
    return rng.next()>(0.42+d*.3)?1:0;
  }));
  // Three smoothing passes (was 2) to clean up the larger grid
  for(let it=0;it<3;it++){
    L=L.map((row,y)=>row.map((cell,x)=>{
      let n=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dy&&!dx)continue;
        const ny=y+dy,nx=x+dx;
        n+=(ny>=0&&ny<SZ&&nx>=0&&nx<half)?L[ny][nx]:0;
      }
      return n>=4?1:n<=2?0:cell;
    }));
  }
  // Mirror left half across to make symmetric face
  const g=Array.from({length:SZ},(_,y)=>{
    const row=new Array(SZ).fill(0);
    for(let x=0;x<half;x++){row[x]=L[y][x];row[SZ-1-x]=L[y][x];}
    return row;
  });
  // Choose 2-4 highlight cells (engraving accent — was 1-2). More cells, more visual richness.
  const pool=[];
  for(let y=3;y<SZ-3;y++)for(let x=3;x<SZ-3;x++){
    if(g[y][x]===1&&Math.hypot(x-center,y-center)<center*0.7)pool.push([y,x]);
  }
  for(let h=0;h<rng.int(2,4);h++){
    if(!pool.length)break;
    const idx=rng.int(0,pool.length-1);
    const[hy,hx]=pool.splice(idx,1)[0];
    g[hy][hx]=2;
    // Mirror the highlight too — keeps the symmetry
    if(SZ-1-hx!==hx)g[hy][SZ-1-hx]=2;
  }
  return g;
}

/* ─── LORE ────────────────────────────────────────────────────────────── */
const CONS=["BR","DR","GR","KR","TH","SK","VR","BL","ST","MN","TR","ZR","KH","SV"];
const VOWS=["AN","OR","EI","AE","UR","OA","UN","IA","YR","ETH","EOR"];
const ERAS=["First","Second","Third","Ancient","Lost","Fallen","Risen","Sunken","Eternal","Cursed"];
const EPOCH=["Epoch","Age","Cycle","Era","Reign","Dawn","Tide","Turning"];
const HOUSES=["the Ashen Crown","the Collapsing Sun","the Iron Serpent","the Void Moon","the Forgotten Flame","the Eternal Storm","the Black Tide","the Golden Silence","the Hollow King","the Ember Throne","the Shattered Mirror","the Sleeping God","the Crimson Veil"];
const CONDS=["Pristine","Mint","Fine","Good","Fair","Worn","Corroded"];

// Deterministic id derived from seed — stable across React remounts
function mkCoin(seed,pLvl=1,tier=null,tierCap=MAX_TIER,rarityOverride=null){
  const rng=new RNG(seed);
  const raw=(rng.pick(CONS)+rng.pick(VOWS)+rng.pick(CONS)+rng.pick(VOWS)).slice(0,9);
  // Rarity: explicit override (used when finding a coin so dig quality matters),
  // otherwise derived from seed for stability. Stored coins persist their rarity.
  const rarity=rarityOverride!=null?rarityOverride:deriveRarity(seed);
  return{id:`c_${seed>>>0}_${(Date.now()&0xffff).toString(36)}`,seed,raw,runes:rune(raw),metalIdx:tier??pickMetal(rng,pLvl,tierCap),shape:rng.pick(SHAPES),era:`${rng.pick(ERAS)} ${rng.pick(EPOCH)}, House of ${rng.pick(HOUSES)}`,cond:rng.pick(CONDS),wt:+(rng.next()*12+2).toFixed(1),dia:rng.int(18,44),shiny:false,rarity};
}
const newSeed=()=>(Date.now()^(Math.random()*0xffffffff|0))>>>0;

/* ─── DRAW COIN ───────────────────────────────────────────────────────── */
function drawCoin(canvas,coin,px){
  // Bumped from 48 to 64 for higher pixel density. The face moves from 9×9 (5px each)
  // to 13×13 (3.5px each), giving ~2.6× the pixel detail per face. The blit at the end
  // is still nearest-neighbor scaled to whatever target px is requested.
  const S=64,off=document.createElement("canvas");off.width=S;off.height=S;
  const c=off.getContext("2d"),m=METALS[coin.metalIdx],noise=new RNG(coin.seed^0xcafeba),cx=S/2,cy=S/2,r=S/2-1;
  const clip=()=>{c.beginPath();const sh=coin.shape;
    if(sh==="round"||sh==="holed")c.arc(cx,cy,r,0,Math.PI*2);
    else if(sh==="octagonal"){for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2+Math.PI/8;i?c.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):c.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a));}c.closePath();}
    else if(sh==="hexagonal"){for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2+Math.PI/6;i?c.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):c.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a));}c.closePath();}
    else if(sh==="shield"){const hw=r*.88;c.moveTo(cx-hw,cy-r);c.lineTo(cx+hw,cy-r);c.lineTo(cx+hw,cy-.1*r);c.quadraticCurveTo(cx+hw,cy+r*.65,cx,cy+r);c.quadraticCurveTo(cx-hw,cy+r*.65,cx-hw,cy-.1*r);c.closePath();}
    else if(sh==="diamond"){c.moveTo(cx,cy-r);c.lineTo(cx+r*.78,cy);c.lineTo(cx,cy+r);c.lineTo(cx-r*.78,cy);c.closePath();}
    else if(sh==="oval")c.ellipse(cx,cy,r*.7,r,0,0,Math.PI*2);
    else c.rect(cx-r+1,cy-r+1,(r-1)*2,(r-1)*2);
  };
  clip();c.save();c.clip();
  const grd=c.createRadialGradient(cx-r*.3,cy-r*.3,0,cx,cy,r);grd.addColorStop(0,m.base);grd.addColorStop(.55,m.mid);grd.addColorStop(1,m.dark);c.fillStyle=grd;c.fillRect(0,0,S,S);
  // More noise particles to fill the larger canvas (240 → 420)
  for(let i=0;i<420;i++){const a=noise.next()*Math.PI*2,d=noise.next()*r*.95,x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d,b=noise.next();c.fillStyle=`rgba(${b>.5?255:0},${b>.5?255:0},${b>.5?255:0},${.04+noise.next()*.06})`;c.fillRect(x|0,y|0,1,1);}
  // Face: 13×13 grid centered on canvas, ~3.5px per cell. Offset = (S - 13*cellSize)/2.
  const face=genFace(coin.seed);
  const cellSize=3.5,faceOffset=(S-13*cellSize)/2;
  for(let y=0;y<13;y++)for(let x=0;x<13;x++){
    const v=face[y][x];if(!v)continue;
    const px2=faceOffset+x*cellSize,py=faceOffset+y*cellSize;
    c.fillStyle=v===2?m.eng:m.hl;
    // Rendering at non-integer pixel positions: draw with ceil to avoid gaps
    c.fillRect(Math.floor(px2),Math.floor(py),Math.ceil(cellSize),Math.ceil(cellSize));
    if(v===1){
      c.fillStyle="rgba(255,255,255,.22)";
      c.fillRect(Math.floor(px2),Math.floor(py),Math.ceil(cellSize),1);
      c.fillStyle="rgba(0,0,0,.26)";
      c.fillRect(Math.floor(px2),Math.floor(py)+Math.ceil(cellSize)-1,Math.ceil(cellSize),1);
    }
  }
  c.fillStyle="rgba(255,255,255,.14)";c.beginPath();c.arc(cx-r*.4,cy-r*.4,r*.55,0,Math.PI*2);c.fill();
  if(coin.shape==="holed"){c.save();c.globalCompositeOperation="destination-out";c.beginPath();c.arc(cx,cy,r*.18,0,Math.PI*2);c.fill();c.restore();}
  c.restore();
  c.lineWidth=1;c.strokeStyle=m.eng;clip();c.stroke();
  if(coin.shiny){c.save();clip();c.clip();const ang=(Date.now()/40)%360;const lg=c.createLinearGradient(0,0,S,S);lg.addColorStop(0,"rgba(255,255,255,0)");lg.addColorStop(.4,`hsla(${ang},100%,75%,.35)`);lg.addColorStop(.5,`hsla(${(ang+60)%360},100%,80%,.5)`);lg.addColorStop(.6,`hsla(${(ang+120)%360},100%,75%,.35)`);lg.addColorStop(1,"rgba(255,255,255,0)");c.fillStyle=lg;c.fillRect(0,0,S,S);c.restore();}
  canvas.width=px;canvas.height=px;const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;ctx.drawImage(off,0,0,px,px);
}
function CoinCanvas({coin,size}){
  const ref=useRef();
  useEffect(()=>{if(ref.current)drawCoin(ref.current,coin,size);},[coin.seed,coin.metalIdx,coin.shiny,size]);
  return <canvas ref={ref} style={{imageRendering:"pixelated",display:"block"}}/>;
}

/* ─── PARTICLES ───────────────────────────────────────────────────────── */
function Particles({active,type,origin}){
  const colors=useMemo(()=>{
    if(type==="shiny")return Array.from({length:60},(_,i)=>`hsl(${i*6},100%,65%)`);
    if(type==="lucky")return["#d4a017","#ffe878","#ffffff","#60e880","#d4a017","#eeaa70"];
    return["#d4a017","#ffffff"];
  },[type]);
  const particles=useMemo(()=>Array.from({length:type==="shiny"?72:36},(_,i)=>({
    id:i,tx:`${(Math.random()-.5)*380}px`,ty:`${-80-Math.random()*320}px`,r:`${(Math.random()-.5)*720}deg`,
    delay:`${Math.random()*.35}s`,size:type==="shiny"?6+Math.random()*8:5+Math.random()*7,
    color:colors[Math.floor(Math.random()*colors.length)],shape:Math.random()>.5?"50%":"3px",dur:`${.8+Math.random()*.7}s`,
  })),[type,colors]);
  if(!active)return null;
  const ox=origin?.x??50,oy=origin?.y??50;
  return(
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:180,overflow:"hidden"}}>
      {particles.map(p=>(
        <div key={p.id} style={{position:"absolute",left:`${ox}%`,top:`${oy}%`,width:p.size,height:p.size,borderRadius:p.shape,background:p.color,animation:`particleFly ${p.dur} ease-out ${p.delay} both`,"--tx":p.tx,"--ty":p.ty,"--r":p.r}}/>
      ))}
    </div>
  );
}

/* ─── LUCKY FANFARE ───────────────────────────────────────────────────── */
function LuckyFanfare({show,onDone}){
  useEffect(()=>{if(show){const t=setTimeout(onDone,2000);return()=>clearTimeout(t);}},[show,onDone]);
  if(!show)return null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:170,pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <Particles active={show} type="lucky" origin={{x:50,y:55}}/>
      <div style={{textAlign:"center",animation:"luckySlam .55s cubic-bezier(.2,.9,.3,1.1) forwards"}}>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:74,fontStyle:"italic",color:"#ffe878",letterSpacing:-1,lineHeight:1,textShadow:"0 0 30px rgba(212,160,23,.6),0 4px 0 #6a3800,0 6px 12px rgba(0,0,0,.4)"}}>Lucky!</div>
        <div style={{fontFamily:"Outfit,sans-serif",fontWeight:800,fontSize:14,color:"#d4a017",letterSpacing:4,marginTop:6,textTransform:"uppercase"}}>⚡ Rarity Upgraded</div>
      </div>
    </div>
  );
}

/* ─── BRUSH REVEAL ────────────────────────────────────────────────────── */
const RS=180,BA=0.32,BW=28,BH=10,SS=4;
function BrushReveal({coin,brushAlpha=BA,shinyChance=.01,onRevealed,t}){
  const coinRef=useRef(),dirtRef=useRef(),prevRef=useRef(null),downRef=useRef(false),chkRef=useRef(0);
  const m=METALS[coin.metalIdx];
  const[pct,setPct]=useState(0);const[gleam,setGleam]=useState(false);const[cursor,setCursor]=useState({x:-300,y:-300});
  useEffect(()=>{if(coinRef.current)drawCoin(coinRef.current,coin,RS);},[coin.seed]);
  useEffect(()=>{
    const cv=dirtRef.current;if(!cv)return;const ctx=cv.getContext("2d");ctx.clearRect(0,0,RS,RS);
    ctx.save();ctx.beginPath();ctx.arc(RS/2,RS/2,RS/2-1,0,Math.PI*2);ctx.clip();
    ctx.fillStyle="#1e1208";ctx.fillRect(0,0,RS,RS);
    const rng=new RNG(coin.seed^0xd1d7);const tones=["#3a2410","#4a3018","#221408","#1c1006","#5a3c1e","#2e1c0c","#6a4220"];
    for(let i=0;i<5500;i++){ctx.fillStyle=rng.pick(tones);ctx.fillRect(rng.int(0,RS-5),rng.int(0,RS-3),rng.int(1,5),rng.int(1,3));}
    for(let i=0;i<26;i++){ctx.fillStyle=`rgba(${rng.int(8,28)},${rng.int(5,16)},${rng.int(2,8)},.7)`;ctx.beginPath();ctx.arc(rng.int(5,RS-5),rng.int(5,RS-5),rng.int(3,8),0,Math.PI*2);ctx.fill();}
    for(let i=0;i<14;i++){ctx.strokeStyle=`rgba(${rng.int(5,22)},${rng.int(3,12)},1,${rng.next()*.5+.2})`;ctx.lineWidth=rng.int(1,2);ctx.beginPath();const sx=rng.int(0,RS),sy=rng.int(0,RS);ctx.moveTo(sx,sy);ctx.lineTo(sx+rng.int(-50,50),sy+rng.int(-8,8));ctx.stroke();}
    ctx.restore();
  },[coin.seed]);
  const sample=useCallback(()=>{
    const cv=dirtRef.current;if(!cv)return;const ctx=cv.getContext("2d");const half=RS/2;
    const data=ctx.getImageData(0,0,RS,RS).data;let tr=0,tot=0;
    for(let y=0;y<RS;y+=SS)for(let x=0;x<RS;x+=SS)if(Math.hypot(x-half,y-half)<half-2){tot++;if(data[((y*RS+x)*4)+3]<80)tr++;}
    const p=Math.min(1,tr/Math.max(1,tot));setPct(p);
    if(p>.78){const isShiny=Math.random()<shinyChance;ctx.clearRect(0,0,RS,RS);setPct(1);setGleam(true);setTimeout(()=>onRevealed(isShiny),950);}
  },[onRevealed,shinyChance]);
  const stroke=useCallback((x,y,px,py)=>{
    const cv=dirtRef.current;if(!cv)return;const dx=x-px,dy=y-py,dist=Math.hypot(dx,dy);if(dist<.5)return;
    const angle=Math.atan2(dy,dx);const ctx=cv.getContext("2d");ctx.save();ctx.globalCompositeOperation="destination-out";ctx.globalAlpha=brushAlpha;
    const steps=Math.max(1,Math.ceil(dist/6));
    for(let s=0;s<=steps;s++){const tt=steps?s/steps:0;const sx=px+dx*tt,sy=py+dy*tt;ctx.translate(sx,sy);ctx.rotate(angle);ctx.beginPath();ctx.ellipse(0,0,BW,BH,0,0,Math.PI*2);ctx.fill();ctx.rotate(-angle);ctx.translate(-sx,-sy);}
    ctx.globalAlpha=brushAlpha*.5;const mx=px+dx*.5,my=py+dy*.5;const g=ctx.createRadialGradient(mx,my,0,mx,my,BW*1.5);g.addColorStop(0,"rgba(0,0,0,1)");g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(mx,my,BW*1.5,0,Math.PI*2);ctx.fill();
    ctx.restore();chkRef.current++;if(chkRef.current%4===0)sample();
  },[brushAlpha,sample]);
  const gp=(e,rect)=>{const sR=e.touches?e.touches[0]:e;return{x:(sR.clientX-rect.left)*(RS/rect.width),y:(sR.clientY-rect.top)*(RS/rect.height)};};
  const onMove=useCallback((e)=>{const cv=dirtRef.current;if(!cv)return;e.preventDefault();const rect=cv.getBoundingClientRect();const{x,y}=gp(e,rect);setCursor({x:e.touches?e.touches[0].clientX:e.clientX,y:e.touches?e.touches[0].clientY:e.clientY});if(!downRef.current&&!e.touches)return;if(prevRef.current)stroke(x,y,prevRef.current.x,prevRef.current.y);prevRef.current={x,y};},[stroke]);
  const onDown=useCallback((e)=>{downRef.current=true;const cv=dirtRef.current;if(!cv)return;e.preventDefault();const rect=cv.getBoundingClientRect();const{x,y}=gp(e,rect);prevRef.current={x,y};},[]);
  const onUp=useCallback(()=>{downRef.current=false;prevRef.current=null;},[]);
  const hint=pct<.12?"Hold and drag to brush":pct<.45?"Keep brushing...":pct<.78?"Almost clean!":"";
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,userSelect:"none"}}>
      <div style={{position:"fixed",left:cursor.x,top:cursor.y,pointerEvents:"none",zIndex:999,transform:"translate(-50%,-70%)",fontSize:24}}>🖌️</div>
      <div style={{position:"relative",width:RS,height:RS,borderRadius:"50%",overflow:"hidden",flexShrink:0,cursor:"none",boxShadow:`0 0 0 6px ${t.surface},0 0 0 7px ${t.borderHi},0 18px 40px rgba(0,0,0,.5),inset 0 0 30px rgba(0,0,0,.4)`}}>
        <canvas ref={coinRef} style={{imageRendering:"pixelated",position:"absolute",top:0,left:0,width:RS,height:RS}}/>
        <canvas ref={dirtRef} width={RS} height={RS} style={{position:"absolute",top:0,left:0,touchAction:"none"}}
          onMouseMove={onMove} onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onUp} onTouchMove={onMove} onTouchStart={onDown} onTouchEnd={onUp}/>
        {gleam&&<div style={{position:"absolute",top:0,left:0,width:"60%",height:"100%",background:`linear-gradient(108deg,transparent,${m.hl}dd 50%,transparent)`,animation:"gleam .9s ease-out forwards",pointerEvents:"none",mixBlendMode:"screen"}}/>}
        <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid rgba(255,255,255,${pct*.18+.04})`,pointerEvents:"none"}}/>
      </div>
      {pct<1&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,width:RS}}>
        <div style={{width:"100%",height:5,background:t.faint,borderRadius:3,overflow:"hidden",border:`1px solid ${t.border}`}}><div style={{width:`${pct*100}%`,height:"100%",background:`linear-gradient(to right,${t.accentDim},${m.hl})`,transition:"width .08s",boxShadow:`0 0 8px ${m.hl}66`}}/></div>
        {hint&&<div style={{fontFamily:"Outfit,sans-serif",fontSize:12,color:t.muted,fontWeight:500,letterSpacing:.5}}>{hint}</div>}
      </div>}
    </div>
  );
}

/* ─── DIG PIT  (core bug fixed) ───────────────────────────────────────── */
const GRID=4;
function DigPit({coin,shovelLevel,onFound,onTooDeep,onCellScrap,t,isDark}){
  // ── BUG FIX ──
  // Previously the coin-cell depth was `int(1, shovelLevel)` — always reachable,
  // so the "TOO DEEP" gate could never fire. Now the coin cell has an 18% chance
  // of being exactly one level too deep, which is what the shovel-upgrade system
  // was clearly designed to gate. (useMemo means we don't rebuild RNGs every render.)
  const{coinCell,depths}=useMemo(()=>{
    const pRng=new RNG(coin.seed^0xd16);
    const cc=pRng.int(0,GRID*GRID-1);
    const ds=Array.from({length:GRID*GRID},(_,i)=>{
      const d=new RNG(coin.seed^i^0xd16);
      if(i===cc){
        // At max shovel level (now 8 with extended SHOVEL_UPS), all coins must be reachable.
        if(shovelLevel>=8)return d.int(1,shovelLevel);                   // max shovel: never too-deep
        return d.bool(0.82)?d.int(1,shovelLevel):shovelLevel+1;          // 18% are one level too deep
      }
      return d.int(1,Math.min(9,shovelLevel+1));                         // non-coin cells: visual flavour only
    });
    return{coinCell:cc,depths:ds};
  },[coin.seed,shovelLevel]);

  const[dug,setDug]=useState({});const[shake,setShake]=useState(null);const[found,setFound]=useState(null);
  const[touchPick,setTouchPick]=useState(null);  // {x,y} screen coords for touch follower
  const[swingCell,setSwingCell]=useState(null);  // cell idx currently animating swing
  const cntRef=useRef(0);
  // Reset when coin changes (per-hunt freshness)
  useEffect(()=>{setDug({});setShake(null);setFound(null);cntRef.current=0;setTouchPick(null);setSwingCell(null);},[coin.seed]);

  const dig=(idx,e)=>{
    if(dug[idx]||found!==null)return;
    // Trigger swing animation in the clicked cell (visual feedback for both PC + mobile)
    setSwingCell(idx);setTimeout(()=>setSwingCell(c=>c===idx?null:c),380);
    if(idx===coinCell&&depths[idx]>shovelLevel){
      setShake(idx);setTimeout(()=>setShake(null),500);
      onTooDeep(depths[idx]);return;
    }
    cntRef.current++;const cnt=cntRef.current;
    setDug(p=>({...p,[idx]:true}));
    if(idx===coinCell){
      setFound(idx);setTimeout(()=>onFound(cnt,GRID*GRID),600);
    }else if(onCellScrap){
      // Non-coin dig: forward cell idx + bounding rect so parent can decide whether
      // this cell is in the pre-budgeted scrap set, and animate accordingly.
      const target=e?.currentTarget;
      requestAnimationFrame(()=>{
        if(target?.getBoundingClientRect){
          onCellScrap(idx,target.getBoundingClientRect());
        }
      });
    }
  };
  // Track finger position over the pit (touch only — mouse uses native cursor + hover)
  const trackPointer=(e)=>{
    if(e.pointerType==="mouse"){setTouchPick(null);return;}
    setTouchPick({x:e.clientX,y:e.clientY});
  };
  const cellSize=64;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,position:"relative"}}>
      {/* Touch-only floating pickaxe so the player can see where they're about to tap */}
      {touchPick&&<div style={{position:"fixed",left:touchPick.x,top:touchPick.y,pointerEvents:"none",zIndex:60,fontSize:34,transform:"translate(-50%,-90%) rotate(-25deg)",filter:"drop-shadow(0 2px 4px rgba(0,0,0,.7))"}}>⛏</div>}
      <div style={{padding:12,paddingTop:18,background:isDark?"linear-gradient(to bottom,#231408,#170c04)":"linear-gradient(to bottom,#6a4218,#3a240c)",border:`3px solid ${isDark?"#5a3c18":"#8a5828"}`,borderRadius:16,boxShadow:`inset 0 6px 24px rgba(0,0,0,.7),0 8px 24px rgba(0,0,0,.4)`,position:"relative"}}
        onPointerMove={trackPointer} onPointerDown={trackPointer} onPointerLeave={()=>setTouchPick(null)}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:14,background:"linear-gradient(to bottom,#8a5a28,#4a2c10)",borderRadius:"13px 13px 0 0",borderBottom:"1px solid #2a1808"}}/>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${GRID},1fr)`,gap:7}}>
          {Array.from({length:GRID*GRID},(_,idx)=>{
            const isDug=!!dug[idx],isFound=found===idx,isShaking=shake===idx;
            const tooDeep=isDug&&idx===coinCell&&depths[idx]>shovelLevel;
            const isSwinging=swingCell===idx;
            const cr=new RNG(coin.seed^idx^0xba5e);
            const sc=["#c8a460","#c09858","#bfa066","#c8aa70","#d0b070"][cr.int(0,4)];
            return(
              <div key={idx} onPointerDown={(e)=>dig(idx,e)} style={{width:cellSize,height:cellSize,borderRadius:9,position:"relative",overflow:"hidden",border:`1.5px solid ${isDug?"#3a2410":"#6a4220"}`,cursor:isDug?"default":"pointer",animation:isShaking?"shake .4s ease-out":isFound?"cellReveal .5s ease-out":"none",background:isDug?(isFound?"#1a2810":tooDeep?"#2a1408":"#3a2210"):"transparent",transition:"background .15s,border-color .15s",touchAction:"manipulation"}}
                onMouseEnter={e=>{if(!isDug){e.currentTarget.style.borderColor="#d4a017";const h=e.currentTarget.querySelector(".hl");if(h)h.style.opacity="1";}}}
                onMouseLeave={e=>{if(!isDug){e.currentTarget.style.borderColor="#6a4220";const h=e.currentTarget.querySelector(".hl");if(h)h.style.opacity="0";}}}>
                {!isDug&&<>
                  <div style={{position:"absolute",inset:0,background:sc}}>
                    {cr.bool(.35)&&<div style={{position:"absolute",width:7,height:5,borderRadius:"50%",background:"#8a6030aa",top:`${cr.int(15,70)}%`,left:`${cr.int(15,70)}%`}}/>}
                    {cr.bool(.2)&&<div style={{position:"absolute",width:3,height:3,borderRadius:"50%",background:"#604018cc",top:`${cr.int(20,75)}%`,left:`${cr.int(20,75)}%`}}/>}
                  </div>
                  <div className="hl" style={{position:"absolute",inset:0,background:"rgba(0,0,0,.25)",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity .12s"}}><span style={{fontSize:30,filter:"drop-shadow(0 1px 2px rgba(0,0,0,.6))"}}>⛏</span></div>
                </>}
                {isDug&&!isFound&&!tooDeep&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:"78%",height:"78%",borderRadius:5,background:"#1e1008",boxShadow:"inset 0 2px 8px rgba(0,0,0,.85)"}}/></div>}
                {tooDeep&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"VT323,monospace",fontSize:14,color:"#e04020",lineHeight:1,letterSpacing:1,textShadow:"0 0 8px #c0301088"}}><span>TOO</span><span>DEEP</span></div>}
                {isFound&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,animation:"digPop .35s ease-out"}}>✦</div>}
                {/* Per-cell swing animation on tap — works on both PC and mobile */}
                {isSwinging&&<div key={`swing-${idx}-${cntRef.current}`} style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,pointerEvents:"none",animation:"pickSwingCell .38s ease-out forwards",filter:"drop-shadow(0 2px 4px rgba(0,0,0,.8))",zIndex:5}}>⛏</div>}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{fontFamily:"Outfit,sans-serif",fontSize:11,color:t.muted,letterSpacing:1,textTransform:"uppercase",fontWeight:600}}>⛏ Shovel Lv.{shovelLevel} · Max depth {shovelLevel}</div>
    </div>
  );
}

/* ─── ROULETTE WHEEL ──────────────────────────────────────────────────── */
const WSECTORS=[
  {label:"LOSE",    color:"#4a0c14",text:"#ff8080",weight:38,outcome:"lose"},
  {label:"SAME",    color:"#141828",text:"#8090b8",weight:24,outcome:"same"},
  {label:"TIER UP", color:"#0c2014",text:"#70d488",weight:20,outcome:"up1"},
  {label:"×2 BACK", color:"#0e1830",text:"#68a0e8",weight:10,outcome:"x2"},
  {label:"TIER +2", color:"#2a1a00",text:"#e0b040",weight:6, outcome:"up2"},
  {label:"JACKPOT", color:"#1c0434",text:"#d070ff",weight:2, outcome:"jackpot"},
];
const WTOT=WSECTORS.reduce((s,v)=>s+v.weight,0);
function RouletteWheel({betCoin,onResult,disabled,t}){
  const cvRef=useRef(),rafRef=useRef(),angRef=useRef(0);
  const[spinning,setSpinning]=useState(false);const[done,setDone]=useState(false);
  const WS=280;
  const secs=useMemo(()=>{let cum=0;return WSECTORS.map(s=>{const start=(cum/WTOT)*Math.PI*2;const span=(s.weight/WTOT)*Math.PI*2;cum+=s.weight;return{...s,start,span};});},[]);
  const drawW=useCallback((angle)=>{
    const cv=cvRef.current;if(!cv)return;const ctx=cv.getContext("2d");const cx=WS/2,cy=WS/2,R=WS/2-16;
    ctx.clearRect(0,0,WS,WS);
    ctx.beginPath();ctx.arc(cx,cy,R+12,0,Math.PI*2);
    const br=ctx.createLinearGradient(0,0,WS,WS);
    br.addColorStop(0,"#5a3a14");br.addColorStop(.4,"#8a5a20");br.addColorStop(.6,"#3a2410");br.addColorStop(1,"#5a3818");
    ctx.fillStyle=br;ctx.fill();ctx.strokeStyle="#d4a017";ctx.lineWidth=2;ctx.stroke();
    for(let i=0;i<48;i++){const a=angle+(i/48)*Math.PI*2;const maj=i%8===0;ctx.beginPath();ctx.moveTo(cx+(R+2)*Math.cos(a),cy+(R+2)*Math.sin(a));ctx.lineTo(cx+(R+(maj?12:6))*Math.cos(a),cy+(R+(maj?12:6))*Math.sin(a));ctx.strokeStyle=maj?"#f0c850":"#7a5818";ctx.lineWidth=maj?2:1;ctx.stroke();}
    for(const sec of secs){
      const a0=angle+sec.start,a1=a0+sec.span;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,a0,a1);ctx.closePath();ctx.fillStyle=sec.color;ctx.fill();
      ctx.strokeStyle="#0a0604";ctx.lineWidth=1.5;ctx.stroke();
      const hg=ctx.createRadialGradient(cx,cy,0,cx,cy,R);hg.addColorStop(0,"rgba(255,255,255,.06)");hg.addColorStop(1,"rgba(0,0,0,.1)");
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,a0,a1);ctx.closePath();ctx.fillStyle=hg;ctx.fill();
      const mid=a0+sec.span/2;const lx=cx+R*.65*Math.cos(mid),ly=cy+R*.65*Math.sin(mid);
      ctx.save();ctx.translate(lx,ly);ctx.rotate(mid+Math.PI/2);
      ctx.fillStyle=sec.text;ctx.font="700 9px Outfit,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(sec.label,0,0);ctx.restore();
    }
    ctx.beginPath();ctx.arc(cx,cy,22,0,Math.PI*2);
    const hg2=ctx.createRadialGradient(cx-6,cy-6,0,cx,cy,22);hg2.addColorStop(0,"#5a3818");hg2.addColorStop(1,"#0e0804");
    ctx.fillStyle=hg2;ctx.fill();ctx.strokeStyle="#d4a017";ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle="#d4a017";ctx.font="14px serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("⚒",cx,cy+1);
    ctx.beginPath();ctx.moveTo(cx-10,2);ctx.lineTo(cx+10,2);ctx.lineTo(cx,22);ctx.closePath();
    ctx.fillStyle="#f0c850";ctx.fill();ctx.strokeStyle="#0a0604";ctx.lineWidth=1.5;ctx.stroke();
    ctx.beginPath();ctx.arc(cx,5,4,0,Math.PI*2);ctx.fillStyle="#d4a017";ctx.fill();
  },[secs]);
  useEffect(()=>{drawW(0);},[drawW]);
  useEffect(()=>()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);},[]);
  const doSpin=()=>{
    if(spinning||!betCoin||disabled)return;setSpinning(true);setDone(false);
    const roll=Math.random()*WTOT;let cum=0,chosen=secs[0];for(const sc of secs){cum+=sc.weight;if(roll<=cum){chosen=sc;break;}}
    const jitter=(Math.random()-.5)*chosen.span*.65;
    const sectorMid=chosen.start+chosen.span/2+jitter;
    let finalAng=-Math.PI/2-sectorMid;
    let delta=finalAng-angRef.current;delta=((delta%(Math.PI*2))+Math.PI*2)%(Math.PI*2);delta+=(8+Math.floor(Math.random()*4))*Math.PI*2;
    const startA=angRef.current;const dur=4600;const t0=performance.now();
    const tick=(now)=>{const tt=Math.min(1,(now-t0)/dur);const ease=1-Math.pow(1-tt,4);angRef.current=startA+delta*ease;drawW(angRef.current);if(tt<1){rafRef.current=requestAnimationFrame(tick);}else{setSpinning(false);setDone(true);onResult(chosen);}};
    rafRef.current=requestAnimationFrame(tick);
  };
  const ready=!spinning&&betCoin&&!disabled;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
      <canvas ref={cvRef} width={WS} height={WS} style={{maxWidth:"100%",filter:"drop-shadow(0 12px 32px rgba(0,0,0,.5))"}}/>
      <button onClick={doSpin} disabled={!ready} style={{padding:"14px 40px",borderRadius:14,border:`1px solid ${ready?"#a06820":t.border}`,cursor:ready?"pointer":"not-allowed",background:ready?"linear-gradient(135deg,#3a1c08,#7a4a18)":t.surfaceHi,fontFamily:"Outfit,sans-serif",fontWeight:800,fontSize:15,color:ready?"#f0c850":t.muted,letterSpacing:2,textTransform:"uppercase",transition:"all .18s",boxShadow:ready?"0 6px 18px rgba(212,160,23,.18)":"none"}}>
        {spinning?"⟳ Spinning…":done?"🎰 Spin Again":"🎰 Spin the Wheel"}
      </button>
    </div>
  );
}

/* ─── REVEAL BANNER ───────────────────────────────────────────────────── */
function RevealBanner({coin,onDone}){
  const m=METALS[coin.metalIdx];
  const rIdx=coinRarity(coin);
  const r=RARITIES[rIdx];
  const isShiny=coin.shiny;
  const isHighRarity=rIdx>=4; // Legendary or Mythic
  const [showParticles,setShowParticles]=useState(isShiny||isHighRarity);
  useEffect(()=>{const t=setTimeout(onDone,(isShiny||isHighRarity)?4000:3000);return()=>clearTimeout(t);},[onDone,isShiny,isHighRarity]);
  useEffect(()=>{if(isShiny||isHighRarity){const t=setTimeout(()=>setShowParticles(false),2000);return()=>clearTimeout(t);}},[isShiny,isHighRarity]);
  return(
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:isShiny?"rgba(0,0,0,.95)":"rgba(8,4,2,.92)",backdropFilter:"blur(14px)",transition:"background .5s"}} onClick={onDone}>
      {(isShiny||isHighRarity)&&<Particles active={showParticles} type="shiny" origin={{x:50,y:45}}/>}
      {isShiny&&<div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"conic-gradient(#ff8080,#ffcc40,#80ff90,#80d0ff,#a080ff,#ff80ff,#ff8080)",animation:"shinyRotate 2.2s linear infinite",opacity:.42,pointerEvents:"none",filter:"blur(4px)"}}/>}
      {!isShiny&&isHighRarity&&<div style={{position:"absolute",width:280,height:280,borderRadius:"50%",background:`radial-gradient(circle,${r.color}55,transparent 70%)`,animation:"subtlePulse 2s ease-in-out infinite",pointerEvents:"none",filter:"blur(8px)"}}/>}
      <div style={{textAlign:"center",animation:"flashIn .5s cubic-bezier(.2,.8,.3,1) forwards",padding:"0 24px",position:"relative",zIndex:1,maxWidth:420}}>
        {isShiny&&<div style={{fontFamily:"Outfit,sans-serif",fontSize:13,fontWeight:800,letterSpacing:5,marginBottom:14,animation:"shinyText 1s linear infinite"}}>✦ SHINY DISCOVERED ✦</div>}
        {/* Big rarity headline — this is the dominant signal now */}
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontStyle:"italic",fontSize:isHighRarity?34:24,letterSpacing:-.5,color:r.color,marginBottom:6,textShadow:isHighRarity?`0 0 24px ${r.glow},0 2px 8px rgba(0,0,0,.6)`:`0 0 12px ${r.glow}`,lineHeight:1}}>{r.name}</div>
        {coin.digBonus==="first"&&<div style={{fontFamily:"Outfit,sans-serif",fontSize:10,fontWeight:800,color:"#ffd060",letterSpacing:4,marginBottom:14,textTransform:"uppercase",textShadow:"0 0 12px rgba(255,208,96,.6)"}}>★ First-try strike</div>}
        {coin.digBonus==="lucky"&&<div style={{fontFamily:"Outfit,sans-serif",fontSize:10,fontWeight:700,color:"#7ad888",letterSpacing:4,marginBottom:14,textTransform:"uppercase"}}>⚡ Lucky find</div>}
        {coin.digBonus==="damaged"&&<div style={{fontFamily:"Outfit,sans-serif",fontSize:10,fontWeight:700,color:"#e07050",letterSpacing:4,marginBottom:14,textTransform:"uppercase"}}>✕ Over-excavated</div>}
        {!coin.digBonus&&<div style={{height:14,marginBottom:8}}/>}
        <div style={{display:"flex",justifyContent:"center",marginBottom:18,position:"relative"}}>
          <CoinCanvas coin={coin} size={180}/>
          {[0,60,120,180,240,300].map(deg=>(
            <div key={deg} style={{position:"absolute",top:"50%",left:"50%",width:2,height:isShiny?78:58,background:isShiny?`linear-gradient(to top,transparent,hsl(${deg},100%,75%))`:`linear-gradient(to top,transparent,${r.color}aa)`,transform:`translate(-50%,-100%) rotate(${deg}deg)`,transformOrigin:"bottom center",animation:"subtlePulse 1.4s ease-in-out infinite",animationDelay:`${deg/300*.4}s`}}/>
          ))}
        </div>
        {/* Metal pill — secondary descriptor (the type, not the rarity) */}
        <div style={{display:"inline-flex",alignItems:"center",gap:10,padding:"5px 16px",background:m.flash,border:`1px solid ${m.accent}66`,borderRadius:3,marginBottom:14,fontFamily:"Outfit,sans-serif",fontSize:11,fontWeight:800,color:m.hl,letterSpacing:4,textTransform:"uppercase",animation:`rarityFlash .9s ease-in-out ${isShiny?0:3}`}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:m.hl,boxShadow:`0 0 6px ${m.hl}`}}/>
          {m.name} · {SHAPE_NAMES[coin.shape]||coin.shape}{isShiny?" ✦":""}
          <span style={{width:5,height:5,borderRadius:"50%",background:m.hl,boxShadow:`0 0 6px ${m.hl}`}}/>
        </div>
        <div style={{fontFamily:"VT323,monospace",fontSize:isShiny?56:50,letterSpacing:6,lineHeight:1,marginBottom:6,animation:isShiny?"shinyText 1.2s linear infinite":undefined,color:isShiny?undefined:m.hl}}>{coin.runes}</div>
        <div style={{fontFamily:"'Fraunces',serif",fontStyle:"italic",fontWeight:600,fontSize:18,color:"#b8a890",letterSpacing:3,marginBottom:6}}>{coin.raw}</div>
        <div style={{fontFamily:"'Fraunces',serif",fontStyle:"italic",fontSize:12,color:"#5a4a38",letterSpacing:.5}}>{coin.era}</div>
        {coin.scrapEarned>0&&(
          <div style={{marginTop:14,padding:"7px 14px",display:"inline-flex",alignItems:"center",gap:8,background:"rgba(212,160,23,.08)",border:"1px solid rgba(212,160,23,.22)",borderRadius:6,fontFamily:"Outfit,sans-serif",fontSize:11,fontWeight:700,color:"#d4a017",letterSpacing:1.5,animation:"flashIn .5s ease-out .3s backwards"}}>
            <span style={{fontSize:13}}>⚙</span>
            Bonus scrap · ◈ {coin.scrapEarned}
          </div>
        )}
        <div style={{fontFamily:"Outfit,sans-serif",fontSize:10,color:"#3a3024",marginTop:18,letterSpacing:3,textTransform:"uppercase"}}>tap to continue</div>
      </div>
    </div>
  );
}

/* ─── 3D COIN MODAL ───────────────────────────────────────────────────── */
function CoinModal({coin,onClose,onToggleLock,onSell,t,isDark}){
  const cvRef=useRef();
  const rotRef=useRef({x:12,y:0});
  const velRef=useRef({x:0,y:0});
  const dragging=useRef(false);
  const lastPos=useRef(null);
  const rafRef=useRef();
  const [rot,setRot]=useState({x:12,y:0});
  const m=METALS[coin.metalIdx];
  useEffect(()=>{if(cvRef.current)drawCoin(cvRef.current,coin,220);},[coin.seed,coin.metalIdx,coin.shiny]);
  useEffect(()=>{
    const loop=()=>{
      if(!dragging.current){
        velRef.current.x*=0.92;velRef.current.y*=0.92;
        rotRef.current.y+=velRef.current.x;
        rotRef.current.x=Math.max(-55,Math.min(55,rotRef.current.x+velRef.current.y));
        if(Math.abs(velRef.current.x)>.04||Math.abs(velRef.current.y)>.04)
          setRot({x:rotRef.current.x,y:rotRef.current.y});
      }
      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(rafRef.current);
  },[]);
  // Esc-to-close (previously missing)
  useEffect(()=>{const h=(e)=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[onClose]);
  const gp=(e)=>e.touches?{x:e.touches[0].clientX,y:e.touches[0].clientY}:{x:e.clientX,y:e.clientY};
  const onStart=(e)=>{dragging.current=true;lastPos.current=gp(e);velRef.current={x:0,y:0};e.stopPropagation();};
  const onMove=(e)=>{if(!dragging.current||!lastPos.current)return;const p=gp(e);const dx=p.x-lastPos.current.x,dy=p.y-lastPos.current.y;velRef.current={x:dx*.55,y:dy*.4};rotRef.current.y+=dx*.55;rotRef.current.x=Math.max(-55,Math.min(55,rotRef.current.x+dy*.4));setRot({x:rotRef.current.x,y:rotRef.current.y});lastPos.current=p;};
  const onEnd=()=>{dragging.current=false;lastPos.current=null;};
  const nx=rot.y/55,ny=rot.x/55;
  const hlX=50+nx*35,hlY=50-ny*35;
  const tiltMag=Math.hypot(nx,ny);
  const glintOpacity=coin.shiny?Math.max(0,.85-tiltMag*.6):0;
  const glintAngle=Math.atan2(ny,nx)*(180/Math.PI)+90;
  const hue=((rot.y+rot.x)*2.5+360)%360;
  const F={fontFamily:"Outfit,sans-serif"};const VT={fontFamily:"VT323,monospace"};const FR={fontFamily:"'Fraunces',serif"};
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeinSlow .25s ease"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,backdropFilter:"blur(28px)",background:"rgba(8,4,2,.78)"}}/>
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:18,padding:"28px 22px",maxWidth:360,width:"100%",animation:"scaleIn .3s cubic-bezier(.2,.9,.3,1.1)"}} onClick={e=>e.stopPropagation()}>
        <div style={{cursor:"grab",userSelect:"none",touchAction:"none"}}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}>
          <div style={{transform:`perspective(560px) rotateY(${rot.y}deg) rotateX(${-rot.x}deg)`,position:"relative",display:"inline-block",filter:`drop-shadow(0 ${14+rot.x*.2}px ${32+Math.abs(rot.y)*.2}px ${m.flash})`}}>
            <canvas ref={cvRef} style={{imageRendering:"pixelated",display:"block",width:220,height:220}}/>
            <div style={{position:"absolute",inset:0,borderRadius:coin.shape==="round"?"50%":coin.shape==="oval"?"50%":"8px",background:`radial-gradient(circle at ${hlX}% ${hlY}%, rgba(255,255,255,${.24+tiltMag*.12}), rgba(255,255,255,.03) 55%, transparent 80%)`,pointerEvents:"none",mixBlendMode:"screen"}}/>
            {coin.shiny&&<div style={{position:"absolute",inset:0,borderRadius:coin.shape==="round"?"50%":coin.shape==="oval"?"50%":"8px",background:`linear-gradient(${glintAngle}deg, transparent 25%, hsla(${hue},100%,72%,.85) 50%, transparent 75%)`,opacity:glintOpacity,pointerEvents:"none",mixBlendMode:"screen",transition:"opacity .15s"}}/>}
          </div>
        </div>
        <div style={{...F,fontSize:10,color:"rgba(245,230,200,.32)",letterSpacing:3,textTransform:"uppercase"}}>drag · spin · esc to close</div>
        <div style={{width:"100%",background:"rgba(245,230,200,.04)",borderRadius:14,border:`1px solid ${m.eng}55`,overflow:"hidden",boxShadow:`0 12px 40px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.05)`}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid rgba(245,230,200,.06)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <div style={{minWidth:0,flex:1}}>
              <div style={{...VT,fontSize:28,color:m.hl,letterSpacing:5,lineHeight:1}}>{coin.runes}</div>
              <div style={{...FR,fontStyle:"italic",fontSize:14,fontWeight:600,color:"rgba(245,230,200,.72)",marginTop:3,letterSpacing:1.5}}>{coin.raw}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{...F,fontSize:11,fontWeight:800,color:RARITIES[coinRarity(coin)].color,letterSpacing:3,textTransform:"uppercase",textShadow:`0 0 8px ${RARITIES[coinRarity(coin)].glow}`}}>{RARITIES[coinRarity(coin)].name}</div>
              {coin.shiny&&<div style={{fontSize:10,fontWeight:800,marginTop:2,animation:"shinyText 1s linear infinite",fontFamily:"Outfit,sans-serif",letterSpacing:2}}>✦ SHINY</div>}
            </div>
          </div>
          <div style={{padding:"12px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Rarity",RARITIES[coinRarity(coin)].name],["Metal",m.name],["Shape",SHAPE_NAMES[coin.shape]||coin.shape],["Condition",coin.cond],["Weight",`${coin.wt}g`],["Value",`◈ ${coinValue(coin).toLocaleString()}`]].map(([k,v])=>(
              <div key={k}><div style={{...F,fontSize:9,color:"rgba(245,230,200,.32)",fontWeight:700,textTransform:"uppercase",letterSpacing:2}}>{k}</div><div style={{...F,fontSize:13,color:k==="Value"?"#f0c850":k==="Rarity"?RARITIES[coinRarity(coin)].color:"rgba(245,230,200,.86)",marginTop:2,fontWeight:(k==="Value"||k==="Rarity")?700:500}}>{v}</div></div>
            ))}
          </div>
          <div style={{padding:"10px 18px 14px",borderTop:"1px solid rgba(245,230,200,.05)",...FR,fontStyle:"italic",fontSize:11,color:"rgba(245,230,200,.4)",lineHeight:1.5}}>{coin.era}</div>
        </div>
        <div style={{display:"flex",gap:8,width:"100%",flexWrap:"wrap"}}>
          {onToggleLock&&<button onClick={()=>onToggleLock(coin.id)} style={{flex:"1 1 130px",padding:"11px 0",borderRadius:11,border:`1px solid ${coin.locked?"rgba(212,160,23,.55)":"rgba(245,230,200,.16)"}`,background:coin.locked?"rgba(212,160,23,.16)":"rgba(245,230,200,.06)",cursor:"pointer",...F,fontWeight:700,fontSize:13,color:coin.locked?"#f0c850":"rgba(245,230,200,.7)",letterSpacing:1.5,textTransform:"uppercase",transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <span style={{fontSize:14}}>{coin.locked?"🔒":"🔓"}</span>
            {coin.locked?"Locked":"Lock"}
          </button>}
          {onSell&&!coin.locked&&<button onClick={()=>{if(confirm(`Sell this coin for ◈${coinValue(coin).toLocaleString()}?`))onSell(coin.id);}} style={{flex:"1 1 130px",padding:"11px 0",borderRadius:11,border:"1px solid rgba(212,160,23,.35)",background:"linear-gradient(135deg,rgba(212,160,23,.12),rgba(212,160,23,.04))",cursor:"pointer",...F,fontWeight:700,fontSize:13,color:"#f0c850",letterSpacing:1.5,textTransform:"uppercase",transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <span>◈</span> Sell · {coinValue(coin).toLocaleString()}
          </button>}
          <button onClick={onClose} style={{flex:"1 1 80px",padding:"11px 16px",borderRadius:11,border:"1px solid rgba(245,230,200,.16)",background:"rgba(245,230,200,.06)",cursor:"pointer",...F,fontWeight:700,fontSize:13,color:"rgba(245,230,200,.7)",letterSpacing:2,textTransform:"uppercase"}}>Close</button>
        </div>
        {onToggleLock&&<div style={{...FR,fontStyle:"italic",fontSize:11,color:"rgba(245,230,200,.4)",textAlign:"center",lineHeight:1.5,marginTop:-4,maxWidth:300}}>{coin.locked?"This coin is protected — locked coins can't be forged, wagered, or sold.":"Lock to protect from forge sacrifices, bets, and accidental sales."}</div>}
      </div>
    </div>
  );
}

/* ─── PROGRESSION ─────────────────────────────────────────────────────── */
const TITLES=["Novice Digger","Copper Hand","Bronzesmith","Silver Seeker","Coin Warden","Vault Keeper","Master Minter","Grand Archivist","Mythic Collector","Void Walker"];
const TITLE_LEVELS=[1,5,10,15,22,30,40,52,65,80];
function lvl(xp){return Math.floor(Math.sqrt(xp/220))+1;}
function lvlMin(l){return(l-1)**2*220;}
function lvlMax(l){return l**2*220;}
function unlockedTitles(l){return TITLES.filter((_,i)=>l>=TITLE_LEVELS[i]);}

/* ─── RARITY SYSTEM ──────────────────────────────────────────────────────
   Rarity is independent from metal — a Legendary Copper and a Common Gold
   can both exist. Rarity is derived from dig conditions (first-try, lucky,
   shiny, player level) and stored alongside the metal.

   For backward compatibility, coins missing a stored rarity get one derived
   deterministically from their seed — so existing collections still work,
   and a player's old coins don't all become "Common" overnight. */
const RARITIES=[
  {id:0,name:"Common",   color:"#9a8868",glow:"rgba(154,136,104,.35)",weight:55,valueMul:1.0},
  {id:1,name:"Uncommon", color:"#7ad888",glow:"rgba(122,216,136,.40)",weight:28,valueMul:1.6},
  {id:2,name:"Rare",     color:"#80c0ff",glow:"rgba(128,192,255,.45)",weight:11,valueMul:2.5},
  {id:3,name:"Epic",     color:"#c080ff",glow:"rgba(192,128,255,.50)",weight:4.5,valueMul:4.0},
  {id:4,name:"Legendary",color:"#f0c850",glow:"rgba(240,200,80,.55)",weight:1.3,valueMul:7.0},
  {id:5,name:"Mythic",   color:"#ff7060",glow:"rgba(255,112,96,.65)",weight:0.2,valueMul:14.0},
];
const MAX_RARITY=5;

// Derive a deterministic baseline rarity from a coin's seed alone.
// Used as a fallback for coins stored before rarity was tracked.
function deriveRarity(seed){
  const r=new RNG(seed^0xab12cd);
  const tot=RARITIES.reduce((s,x)=>s+x.weight,0);
  let roll=r.next()*tot;
  for(let i=0;i<RARITIES.length;i++){roll-=RARITIES[i].weight;if(roll<=0)return i;}
  return 0;
}

// Pick a rarity at coin-find time, weighted by player level + dig conditions.
// digBonus: "first" (+2 tiers), "lucky" (+1), "damaged" (-1), null (none).
// shiny: +1 rarity tier on top.
// Player level slowly raises the floor so high-level players stop seeing Commons.
function rollRarity(rng,playerLevel,digBonus,shiny){
  // Base weights skewed by level — at Lv1 you mostly get Common, by Lv50 Common is rare
  const lvFactor=Math.min(1,playerLevel/50);
  const w=RARITIES.map((r,i)=>{
    if(i===0)return r.weight*(1-lvFactor*0.85);          // Common: fades with level
    if(i===1)return r.weight*(1-lvFactor*0.4);           // Uncommon: also fades a bit
    if(i===2)return r.weight*(1+lvFactor*0.3);           // Rare: rises slightly
    if(i===3)return r.weight*(1+lvFactor*0.6);           // Epic: rises with level
    if(i===4)return r.weight*(1+lvFactor*1.0);           // Legendary: doubles by Lv50
    return r.weight*(1+lvFactor*1.4);                    // Mythic: triples by Lv50
  });
  const tot=w.reduce((s,x)=>s+x,0);
  let roll=rng.next()*tot,r=0;
  for(let i=0;i<w.length;i++){roll-=w[i];if(roll<=0){r=i;break;}}
  // Dig bonuses bump tier
  if(digBonus==="first")r=Math.min(MAX_RARITY,r+2);
  else if(digBonus==="lucky")r=Math.min(MAX_RARITY,r+1);
  else if(digBonus==="damaged")r=Math.max(0,r-1);
  if(shiny)r=Math.min(MAX_RARITY,r+1);
  return r;
}

// Read a coin's rarity — uses stored value if present, otherwise derives from seed.
// Read rarity from a coin object. Newer coins persist .rarity; older coins
// fall back to a deterministic derive so the vault stays diverse on legacy data.
function coinRarity(c){
  if(typeof c?.rarity==="number")return c.rarity;
  if(typeof c?.rarityIdx==="number")return c.rarityIdx; // legacy field name
  return deriveRarity(c?.seed||0);
}

function rarityScore(coins){return coins.reduce((s,c)=>s+([1,3,8,20,45,120,300,800,2000][c.metalIdx]||1)*(coinRarity(c)+1)*(c.shiny?3:1),0);}

// Value of a single coin in marks. Rarity is the dominant axis — a Legendary Copper
// outperforms a Common Gold. Metal sets a floor, condition adjusts ±15%, shiny ×4.
function coinValue(c){
  const base=[3,8,20,55,140,360,900,2400,6000][c.metalIdx]||3;
  const condIdx=Math.max(0,CONDS.indexOf(c.cond));
  const condMul=1+(0.15-condIdx*0.05);
  const shinyMul=c.shiny?4:1;
  const rarMul=RARITIES[coinRarity(c)]?.multiplier||1;
  return Math.max(1,Math.round(base*condMul*shinyMul*rarMul));
}
function vaultMarks(coins){return coins.reduce((s,c)=>s+coinValue(c),0);}

const BANNERS={
  stone:"linear-gradient(135deg,#241a14 0%,#3a2820 50%,#1a120c 100%)",
  wood:"linear-gradient(135deg,#3a1e08 0%,#5a3018 50%,#241408 100%)",
  iron:"linear-gradient(135deg,#1a2630 0%,#2a3848 50%,#0e1820 100%)",
  gilded:"linear-gradient(135deg,#3a2400 0%,#604000 50%,#241400 100%)",
  obsidian:"linear-gradient(135deg,#1a0040 0%,#400870 50%,#0a0020 100%)",
  void:"linear-gradient(135deg,#04041a 0%,#101030 50%,#020210 100%)",
  // Image-backed banners — bannerStyle() turns these into proper image properties
  stargazer:"image:/banners/stargazer.webp",
  archive:"image:/banners/archive.webp",
  wanderer:"image:/banners/wanderer.webp",
  astrarium:"image:/banners/astrarium.webp",
};
// Returns the style object to spread for a banner background — handles both
// gradient strings and image URLs. Mixing CSS shorthand (`background:`) with
// React longhand (`backgroundSize:`) can cancel out, so we always split.
function bannerStyle(frameId){
  const v=BANNERS[frameId]||BANNERS.stone;
  if(v.startsWith("image:")){
    const url=v.slice(6);
    return{backgroundImage:`url('${url}')`,backgroundSize:"cover",backgroundPosition:"center"};
  }
  return{backgroundImage:v}; // gradient
}
const FRAMES={
  stone:{lbl:"Stone",minLvl:1,accent:"#8a7560"},
  wood:{lbl:"Wood",minLvl:5,accent:"#a87238"},
  iron:{lbl:"Iron",minLvl:10,accent:"#7090b0"},
  gilded:{lbl:"Gilded",minLvl:20,accent:"#d4a017"},
  obsidian:{lbl:"Obsidian",minLvl:30,accent:"#a050e8"},
  void:{lbl:"Void",minLvl:50,accent:"#5050e8"},
  // Premium frames — gated by both XP and a marks purchase. Keys must match BANNERS.
  stargazer:{lbl:"Stargazer",minLvl:15,accent:"#c8b878",premium:true,price:1800,desc:"A lone scholar at the edge of the world"},
  archive:{lbl:"The Archive",minLvl:20,accent:"#d4a850",premium:true,price:2100,desc:"Where every collected lore is bound in light"},
  wanderer:{lbl:"The Wanderer",minLvl:25,accent:"#a89060",premium:true,price:2400,desc:"Crowned spires beyond the wandering staff"},
  astrarium:{lbl:"The Astrarium",minLvl:30,accent:"#b8a060",premium:true,price:3000,desc:"Where the heavens are charted on stone"},
};
// Premium titles — purchasable, with animated text effects.
// Free titles are still managed by the existing TITLES list (XP-gated by index).
/* ─── ARTEFACTS ────────────────────────────────────────────────────────
   Forged at the Shrine by combining 5 coins of the same metal + a marks fee.
   Each metal yields a different artefact. The artefact's "grade" reflects
   the average rarity of input coins (Common/Rare/Mythic etc.). Artefacts are
   currently decorative — collected and displayed in the Shrine. Future hooks:
     - effect:  buff/passive when equipped (planned)
     - avatar:  unlocks a player avatar variant (planned)
     - companion: unlocks a small follower (planned)
   The catalog is intentionally aspirational so the engine has somewhere to
   grow without the data layer needing changes. */
const ARTEFACTS=[
  {metal:0, name:"Sunforged Pendant", icon:"☉", art:"copper",   desc:"A pendant blessed by solar fire. It radiates warmth and courage, burning darkness at bay."},
  {metal:1, name:"Bronze Astrolabe",  icon:"⊙", art:"bronze",   desc:"An ancient instrument used to chart the stars and measure fate's endless cycles."},
  {metal:2, name:"Silver Crescent",   icon:"☽", art:"silver",   desc:"A crescent of cold silver. It whispers of the night and guides travelers in darkness."},
  {metal:3, name:"Gilded Time",       icon:"⧗", art:"gold",     desc:"Time is suspended within. It grants moments to those who dare command it."},
  {metal:4, name:"Platinum Compass",  icon:"✥", art:"platinum", desc:"A flawless compass that points not north, but to destiny's truest path."},
  {metal:5, name:"Obsidian Mirror",   icon:"◈", art:"obsidian", desc:"It reflects not your face, but your hidden self. Beware what gazes back."},
  {metal:6, name:"Voidstone Anchor",  icon:"✶", art:null,       desc:"Heavier than any object should be — its weight pulls at more than gravity."},
  {metal:7, name:"Eldritch Codex",    icon:"⌬", art:"eldritch", desc:"Written in a language that unminds. It holds knowledge meant to remain unseen."},
  {metal:8, name:"Celestial Orb",     icon:"❋", art:"astral",   desc:"A remnant from the heavens. It hums with starlight and cosmic harmony."},
];
const ARTEFACT_GRADES=[
  {id:0,name:"Worn",     color:"#9a8870",threshold:0},
  {id:1,name:"Polished", color:"#7ad888",threshold:1.5},
  {id:2,name:"Pristine", color:"#80c0ff",threshold:2.5},
  {id:3,name:"Radiant",  color:"#c080ff",threshold:3.5},
  {id:4,name:"Ascendant",color:"#f0c850",threshold:4.5},
];
function gradeForRaritySum(avgRarity){
  let g=0;
  for(let i=0;i<ARTEFACT_GRADES.length;i++)if(avgRarity>=ARTEFACT_GRADES[i].threshold)g=i;
  return g;
}
// Marks cost to forge an artefact. Aggressive curve so the abundant low-tier
// coins still cost meaningful marks to convert, while top tiers serve as a
// long-term currency sink:
//   Copper 250 / Bronze 600 / Silver 1.5k / Gold 3.5k / Platinum 7.5k
//   Obsidian 14k / Void 22k / Eldritch 32k / Astral 50k
const ARTEFACT_FORGE_COST=[250,600,1500,3500,7500,14000,22000,32000,50000];

const PREMIUM_TITLES=[
  {id:"goldspun",   label:"Goldspun",         minLvl:10, price:600,  effect:"shimmer"},
  {id:"voidtouched",label:"Void-Touched",     minLvl:20, price:1500, effect:"void"},
  {id:"astral",     label:"Of the Astral Hour",minLvl:35,price:3500, effect:"astral"},
];
const PREMIUM_TITLE_BY_ID=Object.fromEntries(PREMIUM_TITLES.map(t=>[t.id,t]));
const PREMIUM_TITLE_LABELS=new Set(PREMIUM_TITLES.map(t=>t.label));

const SHOVEL_UPS=[null,{label:"Iron Shovel",depth:2,cost:[{m:0,n:3}],desc:"Reaches depth 2"},{label:"Bronze Pick",depth:3,cost:[{m:0,n:2},{m:1,n:2}],desc:"Reaches depth 3"},{label:"Steel Pick",depth:4,cost:[{m:2,n:2},{m:1,n:1}],desc:"Reaches depth 4"},{label:"Gilded Pick",depth:5,cost:[{m:3,n:1},{m:2,n:2}],desc:"Reaches depth 5"},{label:"Platinum Pick",depth:6,cost:[{m:4,n:1},{m:3,n:1}],desc:"Reaches depth 6"},{label:"Void Excavator",depth:7,cost:[{m:5,n:1},{m:4,n:1}],desc:"Reaches depth 7"},{label:"Eldritch Drill",depth:8,cost:[{m:6,n:1},{m:5,n:1}],desc:"Reaches depth 8"},{label:"Astral Cleaver",depth:9,cost:[{m:7,n:1},{m:6,n:1}],desc:"Reaches depth 9 — all metals"},{label:"Eldritch Maul",depth:9,cost:[{m:8,n:2},{m:7,n:2}],desc:"+ Heavy build · 50% more durability"}];

// Visual representation of each shovel tier — distinct SVG art so progression
// feels tangible. The shaft, head, and accents change as you tier up.
function ShovelIcon({level=1,size=32}){
  const lv=Math.max(1,Math.min(8,level));
  // Per-tier palettes: handle / metal / accent
  const palettes=[
    null, // index 0 unused
    {h:"#5a3a1c",m:"#7a7a7a",a:"#a0a0a0"},  // Lv1 Iron Shovel — basic wood + iron
    {h:"#5a3a1c",m:"#a87238",a:"#d4a060"},  // Lv2 Bronze Pick
    {h:"#3a2818",m:"#9aa8b8",a:"#d8e4f0"},  // Lv3 Steel Pick
    {h:"#3a2818",m:"#d4a017",a:"#ffe878"},  // Lv4 Gilded
    {h:"#2a1810",m:"#c0d8e8",a:"#e8f4ff"},  // Lv5 Platinum
    {h:"#1a0a14",m:"#3030c0",a:"#9090ff"},  // Lv6 Void
    {h:"#0e1a0a",m:"#1aa050",a:"#80ffb0"},  // Lv7 Eldritch
    {h:"#3a2810",m:"#f0c840",a:"#fff8a0"},  // Lv8 Astral
  ];
  const p=palettes[lv];
  // The head shape changes: shovel(1), pick(2-3), broad pick(4), refined(5-6), cleaver(7-8)
  let head;
  if(lv===1){
    // Shovel head — trapezoid blade
    head=<><polygon points="13,18 27,18 30,28 10,28" fill={p.m} stroke={p.a} strokeWidth="0.5"/><polygon points="13,18 27,18 24,21 16,21" fill={p.a} opacity=".4"/></>;
  }else if(lv<=3){
    // Pick head — pointed double-sided
    head=<><polygon points="6,20 18,16 30,16 34,20 30,24 18,24 6,20" fill={p.m} stroke={p.a} strokeWidth="0.5"/><line x1="18" y1="16" x2="18" y2="24" stroke={p.a} strokeWidth=".4" opacity=".5"/></>;
  }else if(lv===4){
    // Broad pick — wider, more elaborate
    head=<><polygon points="4,20 10,15 22,15 30,17 36,20 30,23 22,25 10,25 4,20" fill={p.m} stroke={p.a} strokeWidth="0.6"/><circle cx="20" cy="20" r="1.5" fill={p.a} opacity=".7"/></>;
  }else if(lv<=6){
    // Refined — angular crystal-pick
    head=<><polygon points="3,20 9,12 22,14 32,17 37,20 32,23 22,26 9,28 3,20" fill={p.m} stroke={p.a} strokeWidth="0.7"/><polygon points="9,12 22,14 16,18" fill={p.a} opacity=".55"/><circle cx="20" cy="20" r="2" fill={p.a}/></>;
  }else{
    // Cleaver/drill — top tier, highly stylized
    head=<><polygon points="2,20 7,10 18,12 28,14 38,17 38,23 28,26 18,28 7,30 2,20" fill={p.m} stroke={p.a} strokeWidth="0.8"/><polygon points="7,10 18,12 12,18" fill={p.a} opacity=".7"/><polygon points="38,17 38,23 32,20" fill={p.a} opacity=".7"/><circle cx="20" cy="20" r="2.5" fill={p.a}/><circle cx="20" cy="20" r="1" fill="#fff" opacity=".7"/></>;
  }
  // Glow effect for top tiers
  const glow=lv>=7?<circle cx="20" cy="32" r="14" fill={p.a} opacity=".15" filter="blur(2px)"/>:null;
  return(
    <svg width={size} height={size} viewBox="0 0 40 40" style={{flexShrink:0}}>
      {glow}
      {/* Handle/shaft */}
      <line x1="20" y1="20" x2="20" y2="38" stroke={p.h} strokeWidth="3" strokeLinecap="round"/>
      <line x1="20" y1="22" x2="20" y2="36" stroke={p.a} strokeWidth=".5" opacity=".3"/>
      {head}
    </svg>
  );
}
const BRUSH_UPS=[{label:"Rough Brush",alpha:BA,shinyChance:.005,cost:null,desc:"0.5% shiny chance"},{label:"Boar Bristle",alpha:.55,shinyChance:.015,cost:[{m:0,n:2}],desc:"1.5% shiny chance"},{label:"Silver Brush",alpha:.9,shinyChance:.03,cost:[{m:0,n:1},{m:2,n:2}],desc:"3% shiny chance"},{label:"Gold Brush",alpha:1.0,shinyChance:.05,cost:[{m:3,n:1},{m:2,n:1}],desc:"5% shiny chance"},{label:"Void Brush",alpha:1.0,shinyChance:.08,cost:[{m:5,n:1}],desc:"8% shiny chance — tarot buffs stack on top"}];
const MAX_SH=SHOVEL_UPS.length-1,MAX_BR=BRUSH_UPS.length-1;

/* ─── TAROT ───────────────────────────────────────────────────────────
   Each card has: id (matches /public/tarot/<id>.webp), title, suit, buff
   description, gameplay-affecting fields the engine reads, and a marks
   price in the shop. Cards stack additively up to 5 equipped slots. */
/* ─── TAROT ─────────────────────────────────────────────────────────────
   Six cards. Each does something *meaningful and visible*, not a small
   percent bonus. Maximum 2 equipped at a time so equipping is a real choice.
   Costs raised so cards feel like commitments. */
const TAROT_CARDS=[
  // Glass-cannon leveling — clear tradeoff
  {id:"magician", title:"The Magician", roman:"I", rarity:"uncommon", price:1500, minLvl:10,
   xpMul:0.50, durPenalty:1.0,
   desc:"+50% XP from finds, but pickaxe wear is doubled."},
  // Information advantage — tells you what's about to be dug
  {id:"hermit", title:"The Hermit", roman:"IX", rarity:"rare", price:2000, minLvl:12,
   revealRarity:true,
   desc:"Reveals the rarity tier of the next coin before you dig."},
  // Daily reroll — the player-agency moment, but applied to rarity (not too-deep)
  {id:"hanged_man", title:"The Hanged Man", roman:"XII", rarity:"rare", price:2500, minLvl:15,
   rerollRarity:1,
   desc:"Once per day, reroll the rarity of a coin you just found."},
  // Cabinet expansion — kept from old design
  {id:"lovers", title:"The Lovers", roman:"VI", rarity:"uncommon", price:1800, minLvl:8,
   pinSlots:2,
   desc:"+2 display cabinet slots."},
  // Predictable jackpot — every 8th find guaranteed Rare+
  {id:"wheel_of_fortune", title:"Wheel of Fortune", roman:"X", rarity:"epic", price:3000, minLvl:20,
   guaranteedEvery:8, guaranteedFloor:2,
   desc:"Every 8th find is guaranteed Rare or higher. Counter visible on hunt screen."},
  // Build-defining for shrine players — substantial forge discount
  {id:"tower", title:"The Tower", roman:"XVI", rarity:"epic", price:3500, minLvl:25,
   forgeDiscount:0.30, glyph:"⚯",
   desc:"All artefact forging costs reduced by 30%."},
];
const TAROT_BY_ID=Object.fromEntries(TAROT_CARDS.map(c=>[c.id,c]));
// Maximum tarots equipped at once. Cut from 5 → 2 so equipping has weight.
const MAX_EQUIPPED_TAROTS=2;
/* ─── RARITY (separate from metal) ─────────────────────────────────────
   Six tiers. A coin's rarity is independent of its metal — a Common Bronze
   and a Legendary Bronze are both possible. Rarity is rolled at find time
   based on dig quality (first-try, lucky, damaged), shiny, and player level.
   Backward compat: existing coins without stored rarity fall back to a seed-
   derived value via deriveRarity() so the vault stays diverse. */
const RARITY_COLOR={common:"#8a7560",uncommon:"#7ad888",rare:"#80c0ff",epic:"#c080ff",legendary:"#f0c850"};

// Aggregate active buffs from a list of equipped tarot card ids.
function tarotBuffs(equippedIds){
  const buff={
    xpMul:0, durPenalty:0, revealRarity:false, rerollRarity:0, pinSlots:0,
    guaranteedEvery:0, guaranteedFloor:0, forgeDiscount:0,
    // Legacy fields kept at neutral defaults so older code that reads them doesn't break
    shinyBonus:0, marksMul:0, tierUp:0, durMul:1, digSpeed:0, artefactRate:0, forgeRefund:0, rerollDig:0,
  };
  for(const id of equippedIds||[]){
    const c=TAROT_BY_ID[id];if(!c)continue;
    if(c.xpMul)buff.xpMul+=c.xpMul;
    if(c.durPenalty)buff.durPenalty+=c.durPenalty;
    if(c.revealRarity)buff.revealRarity=true;
    if(c.rerollRarity)buff.rerollRarity+=c.rerollRarity;
    if(c.pinSlots)buff.pinSlots+=c.pinSlots;
    if(c.guaranteedEvery&&!buff.guaranteedEvery)buff.guaranteedEvery=c.guaranteedEvery; // first-equipped wins
    if(c.guaranteedFloor)buff.guaranteedFloor=Math.max(buff.guaranteedFloor,c.guaranteedFloor);
    if(c.forgeDiscount)buff.forgeDiscount+=c.forgeDiscount;
  }
  return buff;
}

/* ─── PICKAXE DURABILITY ─────────────────────────────────────────────── */
// Each shovel level has a max durability. Base wear is 1 per dig; tarot can halve it.
const SHOVEL_MAX_DUR=[null,40,60,90,130,180,250,350,500,700]; // index by shovelLevel
function shovelMaxDur(lv){return SHOVEL_MAX_DUR[Math.min(lv,SHOVEL_MAX_DUR.length-1)]||40;}
// Repair cost — flatter curve so repairs feel routine, not punishing.
// Was (6 + lv*4) per point. Now (3 + lv*1.5) per point.
// At Lv6: 12/pt (was 30, then 14 — ~13% additional drop).
function repairCost(missing,shovelLevel){
  return Math.max(1,Math.round(missing*(3+shovelLevel*1.3)));
}

const GAMBLES=[
  {id:"toss",label:"Coin Toss",icon:"🪙",desc:"1 coin · 50/50: tier up or lost",odds:"50/50",count:1,same:false,
   resolve:(bet)=>{const c=bet[0];if(Math.random()<.5){return{won:true,remove:[c.id],add:[mkCoin(newSeed(),1,Math.min(MAX_TIER,c.metalIdx+1))],msg:"LUCKY FLIP"};}return{won:false,remove:[c.id],add:[],msg:"TAILS — COIN LOST"};}},
];

/* ─── TAROT CARD COMPONENT ────────────────────────────────────────────
   Renders a single card with art + title bar. Optional locked prop greys
   it out (for "not yet owned" in shop). Optional equipped prop adds glow.
   Click handler is up to the parent. Aspect ratio matches the source art. */
function TarotCard({card,owned=true,equipped=false,onClick,size="md",t}){
  const dims=size==="sm"?{w:88,fs:9}:size==="lg"?{w:170,fs:14}:{w:120,fs:11};
  const rarColor=RARITY_COLOR[card.rarity]||"#888";
  // Track image load failure so we can render a styled fallback for cards
  // without art (e.g. The Tower, which wasn't in the original 12).
  const [imgFailed,setImgFailed]=useState(false);
  return(
    <div onClick={onClick} style={{
      width:dims.w,
      cursor:onClick?"pointer":"default",
      borderRadius:9,
      overflow:"hidden",
      border:`2px solid ${equipped?rarColor:owned?rarColor+"88":"rgba(255,255,255,.08)"}`,
      background:"#15100d",
      boxShadow:equipped?`0 0 18px ${rarColor}55,0 4px 14px rgba(0,0,0,.5)`:`0 4px 12px rgba(0,0,0,.4)`,
      transition:"transform .18s, border-color .18s, box-shadow .18s",
      filter:owned?"none":"grayscale(.85) brightness(.55)",
      position:"relative",
    }}
    onMouseEnter={e=>{if(onClick){e.currentTarget.style.transform="translateY(-3px)";}}}
    onMouseLeave={e=>{if(onClick){e.currentTarget.style.transform="";}}}>
      <div style={{position:"relative",aspectRatio:"241 / 495",overflow:"hidden",background:imgFailed?`linear-gradient(165deg,${rarColor}22,#0a0604 60%)`:"#0a0604"}}>
        {!imgFailed?(
          <img src={`/tarot/${card.id}.webp`} alt={card.title} loading="lazy" onError={()=>setImgFailed(true)} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
        ):(
          // Stylised placeholder: roman numeral, glyph, frame ornaments.
          // Keeps the visual rhythm consistent so a card without art doesn't break the row.
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"14% 8%",fontFamily:"'Fraunces',serif",color:rarColor,textAlign:"center"}}>
            <div style={{fontSize:dims.fs+2,fontWeight:700,letterSpacing:2,opacity:.85}}>{card.roman}</div>
            <div style={{fontSize:Math.round(dims.w*0.5),lineHeight:1,filter:`drop-shadow(0 0 14px ${rarColor}88)`,opacity:.9}}>{card.glyph||"✦"}</div>
            <div style={{fontSize:Math.round(dims.fs*0.78),fontStyle:"italic",letterSpacing:.5,opacity:.65,padding:"0 4%"}}>{card.title}</div>
          </div>
        )}
        {equipped&&<div style={{position:"absolute",top:5,right:5,background:rarColor,color:"#000",fontFamily:"Outfit,sans-serif",fontSize:8,fontWeight:900,padding:"2px 6px",borderRadius:3,letterSpacing:1,textTransform:"uppercase",boxShadow:`0 0 8px ${rarColor}`}}>Equipped</div>}
      </div>
      <div style={{padding:"6px 7px 7px",borderTop:`1px solid ${rarColor}33`,background:"linear-gradient(to bottom,#1a1310,#0e0a08)"}}>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontStyle:"italic",fontSize:dims.fs,color:rarColor,textAlign:"center",letterSpacing:.3,lineHeight:1.1}}>{card.title}</div>
        <div style={{fontFamily:"Outfit,sans-serif",fontSize:8,color:"rgba(255,255,255,.45)",textAlign:"center",marginTop:2,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600}}>{card.rarity}</div>
      </div>
    </div>
  );
}

/* ─── PICKAXE ICON ────────────────────────────────────────────────────
   SVG pickaxe that visually evolves with shovel level. Each level uses the
   corresponding metal tier palette + small head shape variations. Levels
   1-2 are simple stone/iron picks, 3-5 are forged-metal picks, 6-8 add
   embellishments (runes, glow, double-headed). Drop-in replacement for the
   "⛏" emoji in the Forge upgrade card. */

/* Sense text — single italicized line that drifts in based on signal strength.
   Cycles through phrases for atmosphere. Uses the coin's metal index as a hint. */
const SENSE_PHRASES={
  faint:["a faint hum, far below","something stirs in the depths","an old presence, just barely"],
  moderate:["the soil grows warmer","you sense weight, near","ancient echoes rise"],
  strong:["close — the air thickens","metal-bright, calling","beneath your feet"],
  locked:["here. dig.","the soil answers","this is the place"],
};
function senseLevel(signal){
  if(signal<.04)return null;
  if(signal<.28)return "faint";
  if(signal<.58)return "moderate";
  if(signal<.84)return "strong";
  return "locked";
}

/* ─── PICKAXE ICON ──────────────────────────────────────────────────── */
function PickaxeIcon({level=1,size=44}){
  // Map shovel level (1-9) to its art file. Levels above 9 use the top art.
  const lv=Math.max(1,Math.min(9,level|0));
  // Drop shadow color matches the metal's general tone
  const glow=[null,
    "rgba(150,80,30,.45)",  // 1 copper
    "rgba(160,110,40,.45)", // 2 bronze
    "rgba(160,170,180,.4)", // 3 silver
    "rgba(220,170,40,.55)", // 4 gold
    "rgba(160,170,180,.4)", // 5 platinum
    "rgba(120,80,160,.5)",  // 6 obsidian
    "rgba(160,80,255,.55)", // 7 void
    "rgba(80,140,255,.55)", // 8 celestial
    "rgba(180,80,200,.6)",  // 9 eldritch
  ][lv];
  return(
    <img src={`/pickaxes/lv${lv}.webp`} alt={`Pickaxe Lv${lv}`} loading="lazy"
      width={size} height={size}
      style={{
        width:size,height:size,
        objectFit:"contain",
        filter:`drop-shadow(0 2px 4px rgba(0,0,0,.6)) drop-shadow(0 0 8px ${glow})`,
        userSelect:"none",
        pointerEvents:"none",
      }}/>
  );
}

/* ─── BOTTOM NAV ──────────────────────────────────────────────────────── */
function BottomNav({tab,setTab,huntActive,t}){
  const items=[["profile","☉","Profile"],["social","♟","Social"],["vault","◈","Vault"],["hunt","⛏","Hunt"],["forge","⚒","Forge"],["shrine","✧","Shrine"],["tavern","♢","Tavern"]];
  return(
    <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:90,background:t.nav,borderTop:`1px solid ${t.border}`,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",display:"flex",justifyContent:"space-around",padding:"4px 2px 8px",paddingBottom:`calc(8px + env(safe-area-inset-bottom,0px))`}}>
      {items.map(([id,icon,lbl])=>{
        const active=tab===id;
        return(
          <button key={id} onClick={()=>setTab(id)} style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 6px 6px",border:"none",cursor:"pointer",background:"transparent",minWidth:48,flex:1,maxWidth:80,transition:"all .18s",color:active?t.accent:t.muted}}>
            {active&&<div className="tab-active-indicator"/>}
            <span style={{fontSize:19,lineHeight:1,fontFamily:"'Fraunces',serif",fontWeight:active?900:600,transition:"transform .18s",transform:active?"scale(1.05)":"scale(1)",position:"relative"}}>
              {icon}
              {id==="hunt"&&huntActive&&<span style={{position:"absolute",top:-2,right:-6,width:6,height:6,borderRadius:"50%",background:t.success,boxShadow:`0 0 8px ${t.success}`,animation:"flicker 1.4s linear infinite"}}/>}
            </span>
            <span style={{fontFamily:"Outfit,sans-serif",fontSize:8.5,fontWeight:active?800:600,letterSpacing:1.2,textTransform:"uppercase"}}>{lbl}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ─── API CLIENT ──────────────────────────────────────────────────────── */
const API_BASE = ""; // same-origin
const TOKEN_KEY = "mintforge:token";

function apiClient(token){
  const headers={"Content-Type":"application/json"};
  if(token)headers["Authorization"]=`Bearer ${token}`;
  const call=async(path,method="GET",body)=>{
    const r=await fetch(API_BASE+path,{method,headers,body:body?JSON.stringify(body):undefined});
    const txt=await r.text();
    let data={};try{data=txt?JSON.parse(txt):{};}catch{}
    if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`);
    return data;
  };
  return{
    register:(username,pin)=>call("/api/auth/register","POST",{username,pin}),
    login:(username,pin)=>call("/api/auth/login","POST",{username,pin}),
    logout:()=>call("/api/auth/logout","POST").catch(()=>{}),
    getVault:()=>call("/api/vault","GET"),
    tx:(payload)=>call("/api/vault","POST",payload),
    searchUsers:(q)=>call(`/api/users/search?q=${encodeURIComponent(q)}`,"GET"),
    getUser:(username)=>call(`/api/users/${encodeURIComponent(username)}`,"GET"),
    listFriends:()=>call("/api/friends","GET"),
    addFriend:(username)=>call("/api/friends","POST",{username}),
    removeFriend:(username)=>call("/api/friends","DELETE",{username}),
  };
}

/* ─── AUTH SCREEN ─────────────────────────────────────────────────────── */
function AuthScreen({onAuthed}){
  const[mode,setMode]=useState("login");
  const[username,setUsername]=useState("");
  const[pin,setPin]=useState("");
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState(null);
  const t=DARK;
  const F={fontFamily:"Outfit,sans-serif"},VT={fontFamily:"VT323,monospace"},FR={fontFamily:"'Fraunces',serif"};

  const submit=async(e)=>{
    e?.preventDefault?.();
    if(busy)return;
    setErr(null);setBusy(true);
    try{
      const api=apiClient(null);
      const res=await(mode==="login"?api.login(username,pin):api.register(username,pin));
      localStorage.setItem(TOKEN_KEY,res.token);
      onAuthed(res.token,res.player);
    }catch(ex){setErr(ex.message);setBusy(false);}
  };

  const canSubmit=username.length>=3&&/^\d{4,6}$/.test(pin)&&!busy;

  return(
    <div style={{...F,minHeight:"100vh",background:t.bg,color:t.text,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 20px",position:"relative",overflow:"hidden"}}>
      <div className="noise-overlay" style={{position:"fixed",zIndex:1,opacity:.04}}/>
      <div style={{position:"absolute",top:"15%",left:"50%",width:360,height:360,borderRadius:"50%",background:"radial-gradient(circle,rgba(212,160,23,.12),transparent 65%)",transform:"translateX(-50%)",pointerEvents:"none",filter:"blur(12px)"}}/>
      <div style={{position:"relative",zIndex:2,width:"100%",maxWidth:360,textAlign:"center"}}>
        <div style={{width:72,height:72,margin:"0 auto 18px",background:`linear-gradient(135deg,${t.surfaceHi},${t.surface})`,border:`1px solid ${t.borderHi}`,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"inset 0 1px 0 rgba(255,255,255,.05),0 8px 24px rgba(0,0,0,.4)"}}>
          <span style={{...FR,fontSize:42,fontWeight:900,color:t.accent,letterSpacing:-2}}>⚒</span>
        </div>
        <div style={{...FR,fontWeight:900,fontSize:34,letterSpacing:-1,lineHeight:1,color:t.text}}>MINTFORGE</div>
        <div style={{...VT,fontSize:18,color:t.muted,letterSpacing:5,marginTop:4}}>{rune("MINTFORGE")}</div>
        <div style={{...FR,fontStyle:"italic",fontSize:14,color:t.textDim,marginTop:14,marginBottom:28,letterSpacing:.3}}>Your vault awaits.</div>

        <div style={{display:"flex",gap:4,padding:4,borderRadius:12,background:t.surface,border:`1px solid ${t.border}`,marginBottom:18}}>
          {[["login","Sign In"],["register","Create Vault"]].map(([id,lbl])=>{const active=mode===id;return(
            <button key={id} onClick={()=>{setMode(id);setErr(null);}} style={{flex:1,padding:"10px 0",borderRadius:9,border:"none",background:active?`linear-gradient(135deg,${t.accentHi},${t.accent})`:"transparent",cursor:"pointer",...F,fontSize:12,fontWeight:800,color:active?t.accentInk:t.muted,letterSpacing:2,textTransform:"uppercase",transition:"all .18s"}}>{lbl}</button>
          );})}
        </div>

        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:12,textAlign:"left"}}>
          <div>
            <div style={{...F,fontSize:10,color:t.muted,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase",marginBottom:6}}>Username</div>
            <input autoFocus value={username} onChange={e=>setUsername(e.target.value.slice(0,20))} autoComplete="username" spellCheck={false} placeholder="3–20 letters, numbers, _" style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1px solid ${t.inputBorder}`,background:t.input,color:t.text,...F,fontSize:15,outline:"none",transition:"border-color .15s"}} onFocus={e=>e.target.style.borderColor=t.inputFocus} onBlur={e=>e.target.style.borderColor=t.inputBorder}/>
          </div>
          <div>
            <div style={{...F,fontSize:10,color:t.muted,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase",marginBottom:6}}>PIN</div>
            <input type="password" inputMode="numeric" pattern="[0-9]*" autoComplete={mode==="login"?"current-password":"new-password"} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="4–6 digits" style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1px solid ${t.inputBorder}`,background:t.input,color:t.text,...F,fontSize:15,outline:"none",letterSpacing:6,fontVariantNumeric:"tabular-nums",transition:"border-color .15s"}} onFocus={e=>e.target.style.borderColor=t.inputFocus} onBlur={e=>e.target.style.borderColor=t.inputBorder}/>
          </div>
          {err&&<div style={{...F,fontSize:12,color:t.danger,padding:"8px 12px",background:"#1a0808",border:`1px solid ${t.danger}55`,borderRadius:8,textAlign:"center"}}>⚠ {err}</div>}
          <button type="submit" disabled={!canSubmit} style={{marginTop:4,padding:"14px 0",borderRadius:11,border:`1px solid ${canSubmit?t.accent:t.border}`,cursor:canSubmit?"pointer":"not-allowed",background:canSubmit?`linear-gradient(135deg,${t.accentHi},${t.accent})`:t.surfaceHi,...F,fontWeight:800,fontSize:14,color:canSubmit?t.accentInk:t.muted,letterSpacing:3,textTransform:"uppercase",boxShadow:canSubmit?`0 6px 18px ${t.accent}33`:"none",transition:"all .15s"}}>
            {busy?"…":mode==="login"?"⚒ Enter":"⚒ Forge Vault"}
          </button>
          <div style={{...FR,fontStyle:"italic",fontSize:11,color:t.muted,textAlign:"center",marginTop:8,lineHeight:1.6}}>{mode==="login"?"Welcome back, collector.":"A new vault. A new reign."}</div>
        </form>
      </div>
    </div>
  );
}

/* ─── DEBOUNCE HOOK ───────────────────────────────────────────────────── */
function useDebouncedEffect(fn,deps,delay){
  useEffect(()=>{const t=setTimeout(fn,delay);return()=>clearTimeout(t);},deps); // eslint-disable-line
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════════ */
export default function MintForge(){
  /* ── auth layer ─────────────────────────────────────────────── */
  const[token,setToken]=useState(()=>{try{return localStorage.getItem(TOKEN_KEY);}catch{return null;}});
  const[player,setPlayer]=useState(null);
  const[authReady,setAuthReady]=useState(false);
  const[loadErr,setLoadErr]=useState(null);
  const[retryCounter,setRetryCounter]=useState(0); // bump to retry vault fetch
  const api=useMemo(()=>apiClient(token),[token]);
  const[loadedFromServer,setLoadedFromServer]=useState(false);
  const [isDark,setIsDark]=useState(true);
  const t=isDark?DARK:LIGHT;

  const [coins,setCoins]=useState([]);
  const [xp,setXP]=useState(0);
  const [tab,setTab]=useState("hunt");
  const [frame,setFrame]=useState("stone");
  const [filter,setFilter]=useState(-1);
  const [pinnedIds,setPinnedIds]=useState(null);
  const [shovelLevel,setShovelLevel]=useState(1);
  const [brushLevel,setBrushLevel]=useState(0);
  const [marks,setMarks]=useState(0);
  const [shovelDur,setShovelDur]=useState(40);
  const [hangedManUsed,setHangedManUsed]=useState(false); // resets on each successful coin found
  // Wheel of Fortune: counts finds since last guaranteed Rare+ trigger.
  // Resets to 0 after a guaranteed find. Persisted so it survives reloads.
  const [findStreak,setFindStreak]=useState(0);
  // Hanged Man: daily reroll usage. Stores ISO date string of last use.
  const [hangedManDate,setHangedManDate]=useState("");
  // Hermit: peek at the rarity that *would* roll for the current hunt coin.
  // Computed via deterministic seed branch so it matches what onDigFound rolls.
  const [hermitPeek,setHermitPeek]=useState(null);
  const [pickerSlot,setPickerSlot]=useState(null);  // index of cabinet slot being filled, or null
  const marksCounterRef=useRef(null);  // for scrap flyer targeting
  // Per-dig scrap budget. Generated when entering dig phase. Some non-coin cells contain
  // scrap (chosen randomly per dig); each scrap-cell awards budget/scrapCellCount marks.
  // Remaining budget (unawarded if you found the coin early) is granted as bonus on success.
  const digBudgetRef=useRef({total:0,perCell:0,remaining:0,scrapCells:new Set()});
  const [ownedTarots,setOwnedTarots]=useState([]);   // array of card IDs
  const [equippedTarots,setEquippedTarots]=useState([]); // up to 5
  const [ownedFrames,setOwnedFrames]=useState([]);   // premium frames purchased
  const [ownedTitles,setOwnedTitles]=useState([]);   // premium titles purchased
  const [artefacts,setArtefacts]=useState([]);       // forged artefacts
  const [shrineView,setShrineView]=useState("forge");
  const [shrinePicker,setShrinePicker]=useState(null); // {metalIdx, available}: open coin picker for forging
  const [shrineSelection,setShrineSelection]=useState([]); // 5 coin IDs being forged
  const [schemaWarning,setSchemaWarning]=useState(null);
  const buff=useMemo(()=>tarotBuffs(equippedTarots),[equippedTarots]);
  const maxPins=6+(buff.pinSlots||0);
  const maxDur=shovelMaxDur(shovelLevel);
  const [tooDeepMsg,setTooDeepMsg]=useState(null);
  const [selectedCoin,setSelectedCoin]=useState(null);
  const [selectMode,setSelectMode]=useState(false);
  const [selectedIds,setSelectedIds]=useState(new Set());
  const [username,setUsername]=useState("");
  const [bio,setBio]=useState("Collector of ancient mintings from lost civilisations.");
  const [selectedTitle,setSelectedTitle]=useState(TITLES[0]);
  const [editingProfile,setEditingProfile]=useState(false);
  const level=lvl(xp);

  // Auto-revert frame if the player falls below requirement
  useEffect(()=>{if(level<FRAMES[frame].minLvl)setFrame("stone");},[level,frame]);
  // Keep selected title legal — accepts XP-unlocked titles AND any owned premium title.
  useEffect(()=>{
    const legal=unlockedTitles(level);
    const ownedPremiumLabels=ownedTitles.map(id=>PREMIUM_TITLE_BY_ID[id]?.label).filter(Boolean);
    if(!legal.includes(selectedTitle)&&!ownedPremiumLabels.includes(selectedTitle)){
      setSelectedTitle(legal.slice(-1)[0]||TITLES[0]);
    }
  },[level,selectedTitle,ownedTitles]);

  const [huntCoin,setHuntCoin]=useState(()=>mkCoin(newSeed(),1,null,1));
  const [coinFrac,setCoinFrac]=useState(()=>({x:.2+Math.random()*.6,y:.2+Math.random()*.6}));
  // Mirror refs — read in onFieldInteract (the hot path) without triggering useCallback
  // re-creation on every state change. Updated in a sync useEffect below.
  const huntCoinRef=useRef(null);
  const coinFracRef=useRef({x:.5,y:.5});
  // Keep refs in sync with state on every render. Cheap.
  huntCoinRef.current=huntCoin;
  coinFracRef.current=coinFrac;
  // Initialize lens DOM transform once the field is mounted and on each new hunt.
  // Without this, the lens sits at translate3d(0,0,0) until the player moves.
  useEffect(()=>{
    if(phase!=="hunt"||!fieldRef.current||!lensRef.current)return;
    const rect=fieldRef.current.getBoundingClientRect();
    if(rect.width===0)return;
    const x=detFracRef.current.x*rect.width;
    const y=detFracRef.current.y*rect.height;
    lensRef.current.style.transform=`translate3d(${x}px,${y}px,0)`;
    if(glyphRef.current)glyphRef.current.style.opacity="0";
  },[phase,huntCoin.seed]);
  const [detFrac,setDetFrac]=useState({x:.5,y:.5});
  // Always-current detector position — updated synchronously on every input event
  // so the canvas (which animates via requestAnimationFrame) reads the freshest
  // position without forcing React to re-render at input rate.
  const detFracRef=useRef({x:.5,y:.5});
  // Throttle React state updates to one per animation frame at most.
  const detRafRef=useRef(0);
  const [phase,setPhase]=useState("hunt");
  const [foundCoin,setFoundCoin]=useState(null);
  const fieldRef=useRef();
  // Refs to DOM nodes that update on every input event without going through
  // React. iOS-critical: writing transform/opacity directly to a DOM node
  // bypasses React's reconciliation entirely. The hot path is just ref reads
  // and style assignments.
  const lensRef=useRef();         // outer wrapper — gets transform: translate3d
  const lensRingRef=useRef();     // ring element — border-color, box-shadow change
  const lensGlowRef=useRef();     // inner glow ring — appears on signal
  const lensBeadRef=useRef();     // center bead — color shifts
  const glyphRef=useRef();        // buried glyph — opacity ramps with proximity
  const [showLucky,setShowLucky]=useState(false);

  const [gambMode,setGambMode]=useState("toss");
  const [tavernView,setTavernView]=useState("shop"); // shop · wager · repair
  const [shopTab,setShopTab]=useState("tarot");      // tarot · banners · titles
  const [betIds,setBetIds]=useState([]);
  const [gambPhase,setGambPhase]=useState("select");
  const [gambResult,setGambResult]=useState(null);
  const [roulBetId,setRoulBetId]=useState(null);
  const [roulResult,setRoulResult]=useState(null);
  const [roulDone,setRoulDone]=useState(false);

  /* ── social state ───────────────────────────────────────────── */
  const [searchQ,setSearchQ]=useState("");
  const [searchResults,setSearchResults]=useState([]);
  const [searching,setSearching]=useState(false);
  const [friendsList,setFriendsList]=useState([]);
  const [followersList,setFollowersList]=useState([]);
  const [viewingProfile,setViewingProfile]=useState(null); // username string or null
  const [profileData,setProfileData]=useState(null);
  const [profileLoading,setProfileLoading]=useState(false);
  const [profileErr,setProfileErr]=useState(null);

  const xpIn=xp-lvlMin(level);const xpRange=lvlMax(level)-lvlMin(level);

  /* ── auth bootstrap: on mount, if we have a token, fetch the vault ─ */
  useEffect(()=>{
    if(!token){setAuthReady(true);return;}
    let cancel=false;
    api.getVault().then(v=>{
      if(cancel)return;
      setPlayer({username:v.username});
      setUsername(v.username);
      setBio(v.bio||"");
      setXP(v.xp||0);
      setShovelLevel(v.shovelLevel||1);
      setBrushLevel(v.brushLevel||0);
      setFrame(v.frame||"stone");
      setSelectedTitle(v.selectedTitle||TITLES[0]);
      setPinnedIds(v.pinnedIds||null);
      setMarks(v.marks||0);
      setShovelDur(v.shovelDur!=null?v.shovelDur:shovelMaxDur(v.shovelLevel||1));
      setOwnedTarots(v.ownedTarots||[]);
      setEquippedTarots(v.equippedTarots||[]);
      setOwnedFrames(v.ownedFrames||[]);
      setOwnedTitles(v.ownedTitles||[]);
      setFindStreak(typeof v.findStreak==="number"?v.findStreak:0);
      setHangedManDate(typeof v.hangedManDate==="string"?v.hangedManDate:"");
      setArtefacts(v.artefacts||[]);
      setSchemaWarning(v.schemaWarning||null);
      // reconstruct coins from stored {seed, metalIdx, shiny, locked, id, rarity?}
      setCoins((v.coins||[]).map(row=>{
        const base=mkCoin(row.seed,1,row.metalIdx);
        base.id=row.id;
        base.shiny=!!row.shiny;
        base.locked=!!row.locked;
        // Rarity: use stored value if present, otherwise the derived value from mkCoin stays
        if(typeof row.rarity==="number")base.rarity=row.rarity;
        return base;
      }));
      setLoadedFromServer(true);
      setAuthReady(true);
    }).catch(err=>{
      if(cancel)return;
      const msg=String(err.message||"");
      // ONLY treat actual auth failures (401) as a logout trigger.
      // Anything else (500, network, schema mismatch) keeps the token
      // and shows a retry screen — silently logging out destroys the session
      // for transient issues like a missing migration.
      if(/401|unauthor/i.test(msg)){
        try{localStorage.removeItem(TOKEN_KEY);}catch{}
        setToken(null);setAuthReady(true);setLoadErr(null);
      }else{
        // Keep token, show retry — likely a server-side issue
        setAuthReady(true);
        setLoadErr(msg||"Could not reach the vault");
      }
    });
    return()=>{cancel=true;};
  },[token,retryCounter]); // eslint-disable-line

  const handleAuthed=useCallback((tok,pl)=>{setToken(tok);setPlayer(pl);setUsername(pl.username);setLoadedFromServer(false);},[]);

  const handleLogout=useCallback(()=>{
    api.logout();
    try{localStorage.removeItem(TOKEN_KEY);}catch{}
    setToken(null);setPlayer(null);setCoins([]);setXP(0);setShovelLevel(1);setBrushLevel(0);
    setFrame("stone");setBio("");setSelectedTitle(TITLES[0]);setPinnedIds(null);
    setMarks(0);setShovelDur(40);setOwnedTarots([]);setEquippedTarots([]);
    setOwnedFrames([]);setOwnedTitles([]);setArtefacts([]);
    setPhase("hunt");setFoundCoin(null);setTooDeepMsg(null);setTab("hunt");
    setLoadedFromServer(false);setAuthReady(true);
  },[api]);

  /* ── sync scalar state (debounced) ─────────────────────────────── */
  useDebouncedEffect(()=>{
    if(!loadedFromServer)return;
    api.tx({state:{xp,shovelLevel,brushLevel,frame,bio,selectedTitle,pinnedIds,marks,shovelDur,ownedTarots,equippedTarots,ownedFrames,ownedTitles,findStreak,hangedManDate}}).catch(()=>{});
  },[xp,shovelLevel,brushLevel,frame,bio,selectedTitle,pinnedIds,marks,shovelDur,ownedTarots,equippedTarots,ownedFrames,ownedTitles,findStreak,hangedManDate,loadedFromServer],800);

  /* ── load friends list on auth + when entering social tab ──── */
  useEffect(()=>{
    if(!token||!loadedFromServer)return;
    if(tab!=="social")return;
    api.listFriends().then(r=>{setFriendsList(r.friends||[]);setFollowersList(r.followers||[]);}).catch(()=>{});
  },[tab,token,loadedFromServer]); // eslint-disable-line

  /* ── debounced user search ──────────────────────────────────── */
  useDebouncedEffect(()=>{
    if(searchQ.trim().length<2){setSearchResults([]);setSearching(false);return;}
    setSearching(true);
    api.searchUsers(searchQ.trim()).then(r=>{setSearchResults(r.users||[]);setSearching(false);}).catch(()=>setSearching(false));
  },[searchQ],250);

  /* ── load specific profile ──────────────────────────────────── */
  useEffect(()=>{
    if(!viewingProfile)return;
    setProfileLoading(true);setProfileErr(null);setProfileData(null);
    api.getUser(viewingProfile).then(d=>{setProfileData(d);setProfileLoading(false);}).catch(e=>{setProfileErr(e.message);setProfileLoading(false);});
  },[viewingProfile]); // eslint-disable-line

  const handleAddFriend=useCallback(async(uname)=>{
    try{await api.addFriend(uname);
      // refresh both friend list and active profile
      api.listFriends().then(r=>{setFriendsList(r.friends||[]);setFollowersList(r.followers||[]);}).catch(()=>{});
      if(viewingProfile===uname)setProfileData(p=>p?{...p,isFriend:true}:p);
    }catch{}
  },[api,viewingProfile]);

  const handleRemoveFriend=useCallback(async(uname)=>{
    try{await api.removeFriend(uname);
      api.listFriends().then(r=>{setFriendsList(r.friends||[]);setFollowersList(r.followers||[]);}).catch(()=>{});
      if(viewingProfile===uname)setProfileData(p=>p?{...p,isFriend:false}:p);
    }catch{}
  },[api,viewingProfile]);

  const xpPct=Math.min(100,Math.round(xpIn/xpRange*100));
  const fr=FRAMES[frame];
  const brushData=BRUSH_UPS[brushLevel];
  const autoTop=useMemo(()=>[...coins].sort((a,b)=>{
    const ra=coinRarity(a),rb=coinRarity(b);
    if(ra!==rb)return rb-ra;                          // rarity first
    if(b.metalIdx!==a.metalIdx)return b.metalIdx-a.metalIdx; // then metal tier
    return (b.shiny?1:0)-(a.shiny?1:0);              // then shiny
  }).slice(0,maxPins),[coins,maxPins]);
  // Pinned showcase preserves the order in pinnedIds (slot 0 = first ID in array).
  // Previously used coins.filter which broke ordering since it followed coin acquisition order.
  const showcaseCoins=useMemo(()=>{
    if(!pinnedIds)return autoTop;
    const byId=new Map(coins.map(c=>[c.id,c]));
    // Preserve null slots (empty positions) — only filter null at the end of the array
    const arr=pinnedIds.slice(0,maxPins).map(id=>id?byId.get(id)||null:null);
    return arr;
  },[pinnedIds,coins,autoTop,maxPins]);

  const dist=Math.hypot(detFrac.x-coinFrac.x,detFrac.y-coinFrac.y);
  const signal=Math.max(0,1-dist/.55);const canDig=dist<.09;
  const signalColor=signal>.75?"#50e890":signal>.4?"#f0c850":"#7088a8";

  // Direct-write field interaction — iOS-critical perf path.
  //
  // Each input event:
  //  1. Computes cursor position in field-local fraction (0..1).
  //  2. Writes that to detFracRef (sync — anything reading the ref sees it).
  //  3. Writes transform/opacity DIRECTLY to lens + glyph DOM nodes via refs.
  //     React is NOT involved on this hot path. No re-render. No reconciliation.
  //  4. Coalesces a *single* React state update per animation frame so consumers
  //     that need to react (signal bar, sense text level) update eventually but
  //     not at input-event rate.
  const onFieldInteract=useCallback((e)=>{
    if(!fieldRef.current||phase!=="hunt")return;
    e.preventDefault();
    const rect=fieldRef.current.getBoundingClientRect();
    const cx2=e.touches?e.touches[0].clientX:e.clientX;
    const cy2=e.touches?e.touches[0].clientY:e.clientY;
    const x=Math.max(0,Math.min(1,(cx2-rect.left)/rect.width));
    const y=Math.max(0,Math.min(1,(cy2-rect.top)/rect.height));
    detFracRef.current={x,y};

    // ── Direct DOM writes — runs on every input event, no React render ──
    // Lens cursor position (translate3d for GPU compositing)
    if(lensRef.current){
      lensRef.current.style.transform=`translate3d(${x*rect.width}px,${y*rect.height}px,0)`;
    }
    // Compute proximity once
    const dx=coinFracRef.current.x-x;
    const dy=coinFracRef.current.y-y;
    const dist=Math.hypot(dx,dy);
    const proximity=Math.max(0,Math.min(1,1-dist*1.9)); // 0..1, peaks near coin
    const locked=dist<.09;
    // Buried glyph opacity ramps in as you approach
    if(glyphRef.current){
      glyphRef.current.style.opacity=String(Math.pow(proximity,1.6)*0.85);
    }
    // Lens ring color/glow reflects signal strength (locked = green, hot = metal hue)
    const m=METALS[huntCoinRef.current?.metalIdx??0];
    if(lensRingRef.current){
      const r=lensRingRef.current;
      if(locked){
        r.style.borderColor="#7cffb0";
        r.style.boxShadow=`0 0 24px #7cffb088, 0 2px 6px rgba(0,0,0,.5), inset 0 0 0 4px rgba(124,255,176,.15), inset 0 0 0 6px #7cffb066`;
      }else if(proximity>0.4){
        const hue=m?.hl||"#d4a060";
        r.style.borderColor=hue;
        r.style.boxShadow=`0 0 ${Math.round(8+proximity*16)}px ${hue}66, 0 2px 6px rgba(0,0,0,.5), inset 0 0 0 4px rgba(0,0,0,.15), inset 0 0 0 6px ${hue}55`;
      }else{
        r.style.borderColor=isDark?"#a07840":"#5a3818";
        r.style.boxShadow=`0 2px 6px rgba(0,0,0,.5), inset 0 0 0 4px rgba(0,0,0,.15), inset 0 0 0 6px ${isDark?"#3a2410":"#a08868"}55`;
      }
    }
    // Inner glow ring
    if(lensGlowRef.current){
      const g=lensGlowRef.current;
      if(proximity>0.15){
        const hue=locked?"#7cffb0":(m?.hl||"#d4a060");
        g.style.borderColor=`${hue}${Math.round(proximity*255).toString(16).padStart(2,"0")}`;
        g.style.boxShadow=`inset 0 0 ${Math.round(proximity*16)}px ${hue}66`;
      }else{
        g.style.borderColor="transparent";
        g.style.boxShadow="none";
      }
    }
    // Center bead glows when active
    if(lensBeadRef.current){
      const b=lensBeadRef.current;
      const hue=locked?"#7cffb0":proximity>0.5?(m?.hl||"#d4a060"):isDark?"#a07840":"#5a3818";
      b.style.background=hue;
      b.style.boxShadow=proximity>0.5?`0 0 8px ${hue}`:"none";
    }
    // Apply lensRingPulse animation on lock — handled by adding/removing className
    if(lensRingRef.current){
      if(locked){lensRingRef.current.style.animation="lensRingPulse 1s ease-in-out infinite";}
      else{lensRingRef.current.style.animation="none";}
    }

    // ── Throttled React state update — for consumers that need to render ──
    if(detRafRef.current)return;
    detRafRef.current=requestAnimationFrame(()=>{
      detRafRef.current=0;
      setDetFrac(detFracRef.current);
    });
  },[phase,isDark]);

  const onDig=()=>{
    if(!canDig||phase!=="hunt")return;
    if(shovelDur<=0){setTooDeepMsg("Pickaxe broken — repair it in the Shop.");return;}
    // ─ Per-cell scrap budget infrastructure (kept for visual feedback only) ─
    // Marks income from digging was removed in the economy rebalance — now there's
    // no payout per cell. The budget structure stays so the scrap-cells set still
    // exists for the on-cell-dug effect (currently a no-op visually since the
    // flyer was removed too). Future feature can re-use this hook.
    const r=new RNG(huntCoin.seed^0x5c4ab);
    const coinCellIdx=new RNG(huntCoin.seed^0xd16).int(0,GRID*GRID-1);
    const scrapCells=new Set();
    const scrapCellCount=r.int(3,5);
    while(scrapCells.size<scrapCellCount){
      const idx=r.int(0,GRID*GRID-1);
      if(idx!==coinCellIdx)scrapCells.add(idx);
    }
    digBudgetRef.current={total:0,perCell:0,remaining:0,scrapCells};
    setFoundCoin(huntCoin);setTooDeepMsg(null);setPhase("dig");
  };

  // Enter / Space to dig — desktop convenience so you don't need to click off the field
  useEffect(()=>{
    if(tab!=="hunt"||phase!=="hunt"||!canDig)return;
    const h=(e)=>{
      // Skip if typing in a form field
      if(e.target?.tagName==="INPUT"||e.target?.tagName==="TEXTAREA"||e.target?.tagName==="SELECT")return;
      if(e.key==="Enter"||e.key===" "){e.preventDefault();onDig();}
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[tab,phase,canDig,shovelDur]); // eslint-disable-line

  const onDigFound=(cnt,total)=>{
    // ─ COHERENT RARITY MODEL ─
    // Dig timing now affects RARITY, not metal. Metal is what the ground gave you;
    // rarity is what you earned by finding it efficiently.
    //   cnt 1 (first try):           "first"  → +2 rarity tiers, fanfare
    //   cnt 2:                       "lucky"  → +1 rarity tier
    //   cnt 3 with Chariot:          "lucky"  → +1 rarity tier (Chariot only)
    //   cnt 4-15:                    no rarity mod
    //   cnt 16 (all cells):          "damaged" → -1 rarity tier (still keeps coin)
    // Emperor tarot adds an independent +1 rarity roll.
    // Shiny adds +1 rarity tier on top (rolled in brush phase).
    let reason=null;
    if(cnt===1)reason="first";
    else if(cnt===2)reason="lucky";
    else if(cnt>=total)reason="damaged";

    // Roll rarity now (shiny gets folded in at brush phase). Player level + dig
    // condition are the inputs.
    const rRng=new RNG(foundCoin.seed^0xfa11);
    let rarity=rollRarity(rRng,level,reason,false);
    // Wheel of Fortune: every Nth find (default N=8) is guaranteed at least Rare.
    // findStreak counts consecutive finds since last guaranteed trigger.
    const newStreak=findStreak+1;
    let streakReset=false;
    if(buff.guaranteedEvery>0&&newStreak>=buff.guaranteedEvery){
      const floor=buff.guaranteedFloor||2; // Rare = index 2
      if(rarity<floor){rarity=floor;}
      streakReset=true;
    }
    setFindStreak(streakReset?0:newStreak);
    if(rarity>=4)reason="first"; // Legendary or Mythic always feels like a first-try moment

    // Skill bonus only — small marks reward for fast digs. No more
    // "remaining budget" payout. Income now flows almost entirely through
    // selling/forging coins, not through the dig itself.
    const skillBonus=cnt===1?20:cnt<=3?8:0;

    const showFanfare=rarity>=4||reason==="first";
    setFoundCoin(p=>p?{...p,rarity,digBonus:reason,digCnt:cnt,scrapEarned:skillBonus}:p);
    if(showFanfare)setShowLucky(true);

    if(skillBonus>0)setMarks(m=>m+skillBonus);
    if(digBudgetRef.current)digBudgetRef.current.remaining=0;
    // Pickaxe wear: 1 base, plus integer extra from durPenalty (Magician adds 1).
    // Old durMul-as-probability removed in tarot rework.
    const wearAmount=1+Math.round(buff.durPenalty||0);
    setShovelDur(d=>Math.max(0,d-wearAmount));
    // XP scales with rarity now too — finding a Legendary feels meaningfully better
    const xpBase=80+(cnt===1?40:cnt<=3?15:0);
    const xpRarityBonus=rarity*30; // 0/30/60/90/120/150 by rarity
    const xpGain=Math.round((xpBase+xpRarityBonus)*(1+buff.xpMul));
    setXP(p=>p+xpGain);
    setPhase("brush");
  };
  // Per-cell scrap callback fired by DigPit when a non-coin cell is excavated.
  // Only awards if this cell was in the pre-budgeted scrap set generated at onDig.
  // Each scrap-cell awards budget.perCell marks, with the running total drained
  // from budget.remaining so the bonus payout at the end shrinks accordingly.
  const [scrapFlyers,setScrapFlyers]=useState([]);
  const onCellScrap=useCallback((cellIdx,rect)=>{
    // Per-cell scrap marks were removed in the economy rebalance — hunting now
    // rewards via coin sales, not via scrap during dig. The visual flyer is
    // kept for tactile feedback (you uncovered a piece of coin matter), just
    // without awarding marks. The "remaining" budget is still tracked because
    // it gets consumed-then-returned as a bonus payout in onDigFound.
    const budget=digBudgetRef.current;
    if(!budget?.scrapCells?.has?.(cellIdx))return;
    // Subtract from the remaining budget so the dig completion bonus reflects
    // that you "found" some of the budget cell-by-cell — but no marks change.
    budget.remaining=Math.max(0,budget.remaining-budget.perCell);
  },[]);
  const onTooDeep=(d)=>setTooDeepMsg(`Coin lies at depth ${d} — upgrade your shovel.`);
  // Abandon the current dig — prevents soft-lock when a too-deep coin is
  // unreachable AND the player can't afford to forge. Generates a new hunt
  // coin and returns to the hunt phase. No reward, no penalty.
  const onAbandon=()=>{
    // Small consolation so abandoning isn't a dead loss — soft-lock prevention.
    const consolation=Math.max(1,Math.round(4+shovelLevel*0.5));
    setMarks(m=>m+consolation);
    const tc=SHOVEL_TIER_CAP[Math.min(shovelLevel-1,SHOVEL_TIER_CAP.length-1)];
    const next=mkCoin(newSeed(),level,null,tc);
    setHuntCoin(next);setCoinFrac({x:.1+Math.random()*.8,y:.1+Math.random()*.8});
    setDetFrac({x:.5,y:.5});setFoundCoin(null);setTooDeepMsg(null);setPhase("hunt");
  };
  // Hanged Man tarot: once per day, reroll the rarity of a coin you just found.
  // Used during the brush phase — the player gets to gamble for a better outcome.
  // Date-keyed to player's local date string so it resets at midnight in their TZ.
  const todayDate=()=>new Date().toDateString();
  const hangedManAvailable=buff.rerollRarity>0&&hangedManDate!==todayDate();
  const rerollFoundRarity=()=>{
    if(!hangedManAvailable||!foundCoin)return;
    setHangedManDate(todayDate());
    // New rarity roll, fresh RNG, weighted by player level. Doesn't carry digBonus reason
    // so the player gets a "fair" base roll — the gamble is whether RNG smiles.
    const newRarity=pickRarity(new RNG(((Date.now()^0x4ace)>>>0)),level);
    setFoundCoin(p=>p?{...p,rarity:newRarity,rerolled:true}:p);
  };
  const onBrushDone=(isShiny)=>{
    setFoundCoin(p=>{
      if(!p)return p;
      // Shiny adds +1 rarity tier on top of whatever was rolled at find time
      const newRarity=isShiny?Math.min(MAX_RARITY,(p.rarity??0)+1):p.rarity;
      return{...p,shiny:!!isShiny,rarity:newRarity};
    });
    setPhase("banner");
  };
  const onBannerDone=()=>{
    if(foundCoin){
      const stored={...foundCoin};
      setCoins(p=>[stored,...p]);
      // Grant marks: 30% of the coin's display value, modulated by Empress/Wheel of Fortune
      const earned=Math.max(1,Math.round(coinValue(stored)*0.3*(1+buff.marksMul)));
      setMarks(m=>m+earned);
      // Persist: add the coin (server maps {id,seed,metalIdx,shiny})
      api.tx({add:[{id:stored.id,seed:stored.seed,metalIdx:stored.metalIdx,shiny:!!stored.shiny,rarity:stored.rarity}]}).catch(()=>{});
    }
    const tc=SHOVEL_TIER_CAP[Math.min(shovelLevel-1,SHOVEL_TIER_CAP.length-1)];
    const next=mkCoin(newSeed(),level,null,tc);
    setHuntCoin(next);setCoinFrac({x:.1+Math.random()*.8,y:.1+Math.random()*.8});
    setDetFrac({x:.5,y:.5});setFoundCoin(null);setPhase("hunt");
    setHangedManUsed(false); // fresh reroll budget for next hunt
  };

  // Pin toggle — when going from auto-mode (pinnedIds === null) to manual,
  // start with JUST the tapped coin instead of inheriting all 6 auto-top coins,
  // otherwise the slots are immediately full and you can't add anything new.
  // To unpin in auto-mode, the user can manually start their own selection from scratch.
  const togglePin=(id)=>setPinnedIds(prev=>{
    if(prev==null){
      return [id];
    }
    if(prev.includes(id))return prev.filter(x=>x!==id);
    if(prev.length<maxPins)return [...prev,id];
    return prev;
  });
  // Add a coin to the cabinet, unconditionally if there's room. Used by the
  // picker modal opened from an empty slot — the bug was that the only way to
  // pin was double-tap-vault, which was unreliable on mobile.
  const pinCoinToSlot=(id)=>{
    setPinnedIds(prev=>{
      // Snapshot current pins (transitioning auto→manual takes the auto list as base)
      const base=prev??autoTop.map(c=>c.id);
      if(base.includes(id))return base; // already pinned
      if(base.length>=maxPins)return base;
      return [...base,id];
    });
    setPickerSlot(null);
  };
  // Place a coin in a specific cabinet slot. Used by the slot-tap-to-pick flow:
  // tapping an empty slot opens a picker, then the picker calls this with (slotIdx, coinId).
  // If we were in auto mode, transitions to manual mode seeded with current showcase.
  const pinToSlot=(slotIdx,coinId)=>{
    setPinnedIds(prev=>{
      // Start from current visible showcase if we were in auto mode
      let next=prev==null?showcaseCoins.map(c=>c?.id||null):[...prev];
      // If the coin was already pinned elsewhere, null out that previous slot
      const existingIdx=next.indexOf(coinId);
      if(existingIdx>=0)next[existingIdx]=null;
      // Pad with nulls up to target slot
      while(next.length<=slotIdx)next.push(null);
      next[slotIdx]=coinId;
      // Trim trailing nulls but PRESERVE interior nulls (they're empty slots)
      while(next.length&&next[next.length-1]==null)next.pop();
      // Clamp length
      if(next.length>maxPins)next=next.slice(0,maxPins);
      return next;
    });
    setPickerSlot(null);
  };
  const clearPinSlot=(slotIdx)=>{
    setPinnedIds(prev=>{
      const next=prev==null?showcaseCoins.map(c=>c?.id||null):[...prev];
      if(slotIdx<next.length)next[slotIdx]=null;
      // Trim trailing nulls only
      while(next.length&&next[next.length-1]==null)next.pop();
      return next;
    });
  };

  // Sell a coin from the vault for marks (locked coins protected)
  const sellCoin=useCallback((id)=>{
    const c=coins.find(x=>x.id===id);if(!c||c.locked)return;
    const earned=Math.round(coinValue(c)*(1+buff.marksMul));
    setCoins(prev=>prev.filter(x=>x.id!==id));
    setMarks(m=>m+earned);
    // Also remove from pinned showcase to avoid phantom slots
    setPinnedIds(prev=>prev?prev.filter(x=>x!==id):prev);
    setSelectedCoin(null);
    api.tx({remove:[id]}).catch(()=>{});
  },[coins,buff.marksMul,api]);

  // Bulk sell — sell every selected coin at once (skips locked).
  const bulkSell=useCallback(()=>{
    const ids=[...selectedIds];
    const sellable=coins.filter(c=>ids.includes(c.id)&&!c.locked);
    if(!sellable.length)return;
    const total=sellable.reduce((s,c)=>s+Math.round(coinValue(c)*(1+buff.marksMul)),0);
    const sellableIds=sellable.map(c=>c.id);
    setCoins(prev=>prev.filter(c=>!sellableIds.includes(c.id)));
    setMarks(m=>m+total);
    setPinnedIds(prev=>prev?prev.map(x=>sellableIds.includes(x)?null:x):prev);
    setSelectedIds(new Set());
    setSelectMode(false);
    api.tx({remove:sellableIds}).catch(()=>{});
  },[selectedIds,coins,buff.marksMul,api]);
  // Total value of selected coins (display in action bar)
  const selectedTotal=useMemo(()=>{
    let total=0,locked=0;
    for(const id of selectedIds){
      const c=coins.find(x=>x.id===id);if(!c)continue;
      if(c.locked){locked++;continue;}
      total+=Math.round(coinValue(c)*(1+buff.marksMul));
    }
    return{total,locked,sellable:selectedIds.size-locked};
  },[selectedIds,coins,buff.marksMul]);

  // Repair pickaxe — pay marks per missing durability
  const repairPickaxe=()=>{
    const missing=maxDur-shovelDur;
    if(missing<=0)return;
    const cost=repairCost(missing,shovelLevel);
    if(marks<cost)return;
    setMarks(m=>m-cost);
    setShovelDur(maxDur);
  };

  // When pickaxe is broken AND can't afford a repair, the shop sells a fresh Lv1
  // pickaxe at proportional cost. Resets shovel level to 1 — a true last-resort
  // soft-lock break. Always available so a player can always escape the deadlock.
  const NEW_PICKAXE_COST=200;
  const buyNewPickaxe=()=>{
    if(marks<NEW_PICKAXE_COST)return;
    if(shovelDur>0)return; // only when broken
    setMarks(m=>m-NEW_PICKAXE_COST);
    setShovelLevel(1);
    setShovelDur(shovelMaxDur(1));
  };

  // Buy a tarot card from the shop
  const buyTarot=(cardId)=>{
    const card=TAROT_BY_ID[cardId];if(!card)return;
    if(marks<card.price)return;
    if(ownedTarots.includes(cardId))return; // single copy of each
    setMarks(m=>m-card.price);
    setOwnedTarots(prev=>[...prev,cardId]);
    // Persist the purchase + new marks balance atomically
    api.tx({tarotBuy:[cardId],state:{marks:marks-card.price}}).catch(()=>{});
  };
  // Buy a premium frame (banner). XP-gated and marks-priced.
  const buyFrame=(frameId)=>{
    const f=FRAMES[frameId];if(!f||!f.premium)return;
    if(level<f.minLvl||marks<f.price||ownedFrames.includes(frameId))return;
    setMarks(m=>m-f.price);
    setOwnedFrames(prev=>[...prev,frameId]);
  };
  // Buy a premium title. XP-gated and marks-priced.
  const buyTitle=(titleId)=>{
    const ti=PREMIUM_TITLE_BY_ID[titleId];if(!ti)return;
    if(level<ti.minLvl||marks<ti.price||ownedTitles.includes(titleId))return;
    setMarks(m=>m-ti.price);
    setOwnedTitles(prev=>[...prev,titleId]);
  };

  // Forge an artefact at the Shrine.
  // Takes 5 coin IDs of the same metal. Consumes them + a marks fee.
  // Output grade is determined by the average rarity of inputs.
  const forgeArtefact=(coinIds)=>{
    if(coinIds.length!==5)return{ok:false,error:"Need exactly 5 coins"};
    const inputs=coinIds.map(id=>coins.find(c=>c.id===id)).filter(Boolean);
    if(inputs.length!==5)return{ok:false,error:"Some coins missing"};
    if(inputs.some(c=>c.locked))return{ok:false,error:"Cannot use locked coins"};
    const metal=inputs[0].metalIdx;
    if(!inputs.every(c=>c.metalIdx===metal))return{ok:false,error:"All 5 must be the same metal"};
    const baseCost=ARTEFACT_FORGE_COST[metal]||80;
    // Tower tarot reduces forge cost by 30% if equipped
    const cost=Math.max(1,Math.round(baseCost*(1-(buff.forgeDiscount||0))));
    if(marks<cost)return{ok:false,error:`Need ◈${cost.toLocaleString()}`};
    // Average rarity → grade
    const avgRarity=inputs.reduce((s,c)=>s+coinRarity(c),0)/5;
    const grade=gradeForRaritySum(avgRarity);
    const def=ARTEFACTS[metal];
    const newArtefact={
      id:`a_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      metal,
      grade,
      forgedAt:Date.now(),
    };
    // Apply state changes
    setMarks(m=>m-cost);
    setCoins(prev=>prev.filter(c=>!coinIds.includes(c.id)));
    setPinnedIds(prev=>prev?prev.map(x=>coinIds.includes(x)?null:x):prev);
    setArtefacts(prev=>[newArtefact,...prev]);
    api.tx({remove:coinIds,artefactAdd:[newArtefact]}).catch(()=>{});
    return{ok:true,artefact:newArtefact,def,gradeName:ARTEFACT_GRADES[grade].name};
  };

  // Equip / unequip tarot (max MAX_EQUIPPED_TAROTS active slots — currently 2)
  const toggleTarot=(cardId)=>{
    setEquippedTarots(prev=>{
      if(prev.includes(cardId))return prev.filter(x=>x!==cardId);
      if(prev.length>=MAX_EQUIPPED_TAROTS)return prev; // full
      return [...prev,cardId];
    });
  };

  // Lock toggle — prevents a coin being used in upgrades/wagers
  const toggleLock=useCallback((id)=>{
    setCoins(prev=>{
      const next=prev.map(c=>c.id===id?{...c,locked:!c.locked}:c);
      const target=next.find(c=>c.id===id);
      if(target)api.tx({lock:[{id,locked:target.locked}]}).catch(()=>{});
      return next;
    });
  },[api]);

  // Available coins for sacrificing/betting = unlocked only
  const sacrificialCoins=useMemo(()=>coins.filter(c=>!c.locked),[coins]);
  const canAfford=(cost)=>!cost||cost.every(({m,n})=>sacrificialCoins.filter(c=>c.metalIdx===m).length>=n);
  const forgeUp=(type)=>{
    const isS=type==="shovel";const nl=isS?shovelLevel+1:brushLevel+1;
    const u=(isS?SHOVEL_UPS:BRUSH_UPS)[nl];if(!u||!canAfford(u.cost))return;
    const removedIds=[];
    let rem=[...coins];
    if(u.cost){
      for(const{m,n}of u.cost){
        let r=0;
        rem=rem.filter(c=>{
          if(!c.locked&&c.metalIdx===m&&r<n){
            r++;
            // Justice: 25% chance to recover the consumed material
            if(Math.random()<buff.forgeRefund){return true;}
            removedIds.push(c.id);
            return false;
          }
          return true;
        });
      }
    }
    setCoins(rem);
    if(isS){setShovelLevel(nl);setShovelDur(shovelMaxDur(nl));} // refill on upgrade
    else setBrushLevel(nl);
    setXP(p=>p+200);
    if(removedIds.length)api.tx({remove:removedIds}).catch(()=>{});
  };

  const gamble=GAMBLES.find(g=>g.id===gambMode)||GAMBLES[0];
  const betCoins=betIds.map(id=>coins.find(c=>c.id===id)).filter(Boolean);
  const gambOk=betCoins.length===gamble.count&&(!gamble.same||new Set(betCoins.map(c=>c.metalIdx)).size===1);
  const doGamble=()=>{if(!gambOk||gambPhase!=="select")return;setGambPhase("spinning");setTimeout(()=>{const res=gamble.resolve(betCoins);setCoins(prev=>[...res.add,...prev.filter(c=>!res.remove.includes(c.id))]);setXP(p=>p+(res.won?120:20));setGambResult(res);setGambPhase("result");
    api.tx({remove:res.remove,add:res.add.map(c=>({id:c.id,seed:c.seed,metalIdx:c.metalIdx,shiny:!!c.shiny}))}).catch(()=>{});
  },1600);};
  const resetGamble=()=>{setBetIds([]);setGambResult(null);setGambPhase("select");};
  const toggleBet=(id)=>{if(gambPhase!=="select")return;
    const c=coins.find(x=>x.id===id);if(c?.locked)return;  // ignore taps on locked coins
    setBetIds(prev=>{if(prev.includes(id))return prev.filter(x=>x!==id);if(prev.length>=gamble.count)return[...prev.slice(1),id];return[...prev,id];});};
  const roulBetCoin=coins.find(c=>c.id===roulBetId)||null;
  const onRoulResult=(sector)=>{
    if(!roulBetCoin)return;const tier=roulBetCoin.metalIdx;let remove=[roulBetCoin.id],add=[],msg="",won=false;
    if(sector.outcome==="lose"){msg="BETTER LUCK NEXT TIME";}
    else if(sector.outcome==="same"){add=[mkCoin(newSeed(),1,tier)];won=true;msg="SAME TIER RETURNED";}
    else if(sector.outcome==="up1"){add=[mkCoin(newSeed(),1,Math.min(MAX_TIER,tier+1))];won=true;msg="TIER UP";}
    else if(sector.outcome==="x2"){add=[mkCoin(newSeed(),1,tier),mkCoin(newSeed(),1,tier)];won=true;msg="DOUBLE RETURN";}
    else if(sector.outcome==="up2"){add=[mkCoin(newSeed(),1,Math.min(MAX_TIER,tier+2))];won=true;msg="DOUBLE TIER UP";}
    else if(sector.outcome==="jackpot"){add=[mkCoin(newSeed(),1,MAX_TIER)];won=true;msg="JACKPOT — VOID COIN";}
    setCoins(prev=>[...add,...prev.filter(c=>!remove.includes(c.id))]);setXP(p=>p+(won?140:20));setRoulResult({won,add,msg});setRoulDone(true);
    api.tx({remove,add:add.map(c=>({id:c.id,seed:c.seed,metalIdx:c.metalIdx,shiny:!!c.shiny}))}).catch(()=>{});
  };
  const resetRoulette=()=>{setRoulBetId(null);setRoulResult(null);setRoulDone(false);};
  const visCoins=filter===-1?coins:coins.filter(c=>c.metalIdx===filter);

  /* shared style helpers */
  const F={fontFamily:"Outfit,sans-serif"};
  const VT={fontFamily:"VT323,monospace"};
  const FR={fontFamily:"'Fraunces',serif"};
  const card={background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,boxShadow:isDark?"0 1px 0 rgba(255,255,255,.02) inset, 0 6px 16px rgba(0,0,0,.18)":"0 1px 0 rgba(255,255,255,.6) inset, 0 4px 12px rgba(74,40,8,.06)"};
  const mu={...F,fontSize:13,color:t.muted,fontWeight:500};
  const microLabel={...F,fontSize:10,color:t.muted,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase"};
  const sectionTitle={...FR,fontWeight:700,fontSize:22,letterSpacing:-.3,color:t.text};

  /* ── auth gate ──────────────────────────────────────────────── */
  if(!authReady){
    return(<div style={{...F,minHeight:"100vh",background:DARK.bg,color:DARK.muted,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Outfit,sans-serif",fontSize:13,letterSpacing:2,textTransform:"uppercase"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontFamily:"'Fraunces',serif",fontSize:22,color:DARK.accent}}>⚒</span> Opening the vault…</div>
    </div>);
  }
  // If we have a token but vault load failed (non-auth error like a server bug),
  // show a retry screen instead of bouncing back to login. Logging the user out
  // for a transient server issue is far more frustrating than this explicit retry.
  if(token&&loadErr&&!loadedFromServer){
    return(
      <div style={{...F,minHeight:"100vh",background:DARK.bg,color:DARK.text,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 20px",position:"relative"}}>
        <div className="noise-overlay" style={{position:"fixed",zIndex:1,opacity:.04}}/>
        <div style={{position:"relative",zIndex:2,maxWidth:380,textAlign:"center"}}>
          <div style={{fontSize:48,opacity:.5,marginBottom:16}}>⚒</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:800,fontSize:22,letterSpacing:-.4,marginBottom:10}}>The vault won't open</div>
          <div style={{fontSize:13,color:DARK.textDim,lineHeight:1.55,marginBottom:6}}>The server returned an error while loading your account. This is most likely a backend issue — your account is safe.</div>
          <div style={{fontFamily:"VT323,monospace",fontSize:13,color:DARK.danger,padding:"10px 14px",background:"rgba(210,74,40,.08)",border:`1px solid ${DARK.danger}33`,borderRadius:8,margin:"16px 0",letterSpacing:.5,wordBreak:"break-word"}}>{loadErr}</div>
          <div style={{display:"flex",flexDirection:"column",gap:9,marginTop:18}}>
            <button onClick={()=>{setLoadErr(null);setRetryCounter(c=>c+1);}} style={{padding:"12px 0",borderRadius:11,border:`1px solid ${DARK.accent}`,background:`linear-gradient(135deg,${DARK.accentHi},${DARK.accent})`,cursor:"pointer",fontWeight:800,fontSize:13,color:DARK.accentInk,letterSpacing:2.5,textTransform:"uppercase",fontFamily:"Outfit,sans-serif"}}>Retry</button>
            <button onClick={()=>{try{localStorage.removeItem(TOKEN_KEY);}catch{}setToken(null);setLoadErr(null);}} style={{padding:"10px 0",borderRadius:11,border:`1px solid ${DARK.border}`,background:"transparent",cursor:"pointer",fontWeight:600,fontSize:11,color:DARK.muted,letterSpacing:2,textTransform:"uppercase",fontFamily:"Outfit,sans-serif"}}>Sign out</button>
          </div>
        </div>
      </div>
    );
  }
  if(!token){return<AuthScreen onAuthed={handleAuthed}/>;}

  return(
    <div style={{...F,minHeight:"100vh",background:t.bg,color:t.text,paddingBottom:"calc(78px + env(safe-area-inset-bottom,0px))",position:"relative"}}>
      <div className="noise-overlay" style={{position:"fixed",zIndex:1,opacity:t.noiseOpacity}}/>

      {/* Schema warning banner — surfaced when the server tells us a migration is missing */}
      {schemaWarning&&(
        <div style={{padding:"10px 14px",background:"#3a1a08",borderBottom:`1px solid ${t.danger}55`,...F,fontSize:12,color:"#ffb060",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:85}}>
          <span style={{fontSize:16,flexShrink:0}}>⚠</span>
          <div style={{flex:1,lineHeight:1.4}}>
            <div style={{fontWeight:700,marginBottom:2}}>Database migration pending</div>
            <div style={{fontSize:11,color:"#d8a070",lineHeight:1.4}}>{schemaWarning}</div>
          </div>
          <button onClick={()=>setSchemaWarning(null)} style={{border:"none",background:"transparent",color:"#ffb060",cursor:"pointer",fontSize:18,padding:4,lineHeight:1}}>×</button>
        </div>
      )}

      {/* ═══ TOP BAR ═══ */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px 14px",borderBottom:`1px solid ${t.border}`,background:t.nav,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:80}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:36,height:36,background:`linear-gradient(135deg,${t.surfaceHi},${t.surface})`,border:`1px solid ${t.borderHi}`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`inset 0 1px 0 rgba(255,255,255,.06)`}}>
            <span style={{...FR,fontSize:18,fontWeight:900,color:t.accent,letterSpacing:-1}}>⚒</span>
          </div>
          <div>
            <div style={{...FR,fontWeight:900,fontSize:17,letterSpacing:-.5,lineHeight:1,color:t.text}}>MINTFORGE</div>
            <div style={{...VT,fontSize:13,color:t.muted,letterSpacing:4,marginTop:2}}>{rune("MINTFORGE")}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,justifyContent:"flex-end",marginBottom:4}}>
              <span ref={marksCounterRef} style={{...F,fontSize:11,fontWeight:800,color:t.accent,letterSpacing:.5,fontVariantNumeric:"tabular-nums",display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:11,opacity:.85}}>◈</span>{marks.toLocaleString()}</span>
              <span style={{...F,fontSize:10,color:t.textDim,fontWeight:600,letterSpacing:1,textTransform:"uppercase",opacity:.55}}>·</span>
              <span style={{background:`linear-gradient(135deg,${t.accentHi},${t.accent})`,color:t.accentInk,fontWeight:900,fontSize:10,padding:"2px 8px",borderRadius:4,letterSpacing:1,boxShadow:"0 1px 2px rgba(0,0,0,.2)"}}>LV {level}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:104,height:5,background:t.faint,borderRadius:3,overflow:"hidden",border:`1px solid ${t.border}`}}>
                <div style={{width:`${xpPct}%`,height:"100%",background:`linear-gradient(to right,${t.accentDim},${t.accent},${t.accentHi})`,transition:"width .6s",boxShadow:`0 0 6px ${t.accent}66`}}/>
              </div>
              <span style={{...F,fontSize:9,color:t.muted,fontWeight:600,letterSpacing:.5,fontVariantNumeric:"tabular-nums"}}>{xpIn}/{xpRange}</span>
            </div>
          </div>
          <button onClick={()=>setIsDark(d=>!d)} style={{width:36,height:36,borderRadius:10,border:`1px solid ${t.border}`,background:t.surfaceHi,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",color:t.text}} onMouseEnter={e=>e.currentTarget.style.borderColor=t.borderHi} onMouseLeave={e=>e.currentTarget.style.borderColor=t.border}>
            {isDark?"☀":"☾"}
          </button>
          <button onClick={()=>{if(confirm("Sign out? Your vault stays saved."))handleLogout();}} title="Sign out" style={{width:36,height:36,borderRadius:10,border:`1px solid ${t.border}`,background:t.surfaceHi,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",color:t.muted}} onMouseEnter={e=>{e.currentTarget.style.borderColor=t.borderHi;e.currentTarget.style.color=t.textDim;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.color=t.muted;}}>
            ⎋
          </button>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{maxWidth:480,margin:"0 auto",padding:"18px 14px 8px",position:"relative",zIndex:2}}>

        {/* ─── PROFILE ─── */}
        {tab==="profile"&&(
          <div style={{animation:"fadein .35s ease"}}>
            <div style={{height:130,borderRadius:"0 0 20px 20px",...bannerStyle(frame),position:"relative",overflow:"hidden",marginTop:-18,marginLeft:-14,marginRight:-14,border:`1px solid ${t.border}`,borderTop:"none"}}>
              <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 30% 60%,rgba(255,255,255,.06),transparent 65%)"}}/>
              <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 70% 30%,rgba(212,160,23,.08),transparent 60%)"}}/>
              {/* Image banners get a subtle darkening overlay for text legibility */}
              {FRAMES[frame]?.premium&&<div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.15) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 70%,rgba(0,0,0,.45) 100%)"}}/>}
              <div className="noise-overlay" style={{opacity:.06}}/>
              <div style={{position:"absolute",top:12,right:14}}>
                <select value={frame} onChange={e=>setFrame(e.target.value)} style={{background:"rgba(0,0,0,.6)",border:`1px solid rgba(255,255,255,.16)`,color:"#c8b89a",borderRadius:6,padding:"4px 10px",...F,fontSize:11,cursor:"pointer",fontWeight:600,letterSpacing:.5}}>
                  {Object.entries(FRAMES).filter(([k,f])=>!f.premium||ownedFrames.includes(k)).map(([k,f])=><option key={k} value={k} disabled={level<f.minLvl}>{f.lbl}{level<f.minLvl?` · Lv${f.minLvl}`:""}</option>)}
                </select>
              </div>
              <div style={{position:"absolute",bottom:8,left:16,...microLabel,fontSize:9,color:fr.accent,opacity:.85,textShadow:"0 1px 3px rgba(0,0,0,.7)"}}>{fr.lbl}</div>
            </div>

            {/* Avatar sits fully below banner now (no overlap) */}
            <div style={{marginTop:14,marginBottom:12,padding:"0 4px",display:"flex",justifyContent:"flex-start"}}>
              <div style={{width:88,height:88,borderRadius:"50%",border:`3px solid ${fr.accent}`,background:t.surface,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 6px 18px rgba(0,0,0,.35),inset 0 0 0 2px ${t.surface}`}}>
                {showcaseCoins[0]?<CoinCanvas coin={showcaseCoins[0]} size={80}/>:<span style={{fontSize:30,opacity:.3}}>⚒</span>}
              </div>
            </div>

            {/* Stats row — sits cleanly BELOW banner, full width */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14,padding:"0 4px"}}>
              {[["Coins",coins.length],["Score",rarityScore(coins).toLocaleString()],["✦ Shiny",coins.filter(c=>c.shiny).length]].map(([k,v])=>(
                <div key={k} style={{padding:"10px 8px",...card,textAlign:"center"}}>
                  <div style={{...FR,fontWeight:800,fontSize:20,color:t.text,letterSpacing:-.5,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{v}</div>
                  <div style={{...microLabel,fontSize:9,marginTop:4}}>{k}</div>
                </div>
              ))}
            </div>

            {!editingProfile?(
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"0 4px",marginBottom:14}}>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{...FR,fontWeight:800,fontSize:22,letterSpacing:-.5,color:t.text}}>{username}</div>
                    <div style={{...VT,fontSize:18,color:t.muted,letterSpacing:3,marginTop:2}}>{rune(username.toUpperCase().replace(/[^A-Z]/g,""))}</div>
                    <div style={{...mu,fontSize:13,color:t.textDim,marginTop:8,lineHeight:1.55,maxWidth:340}}>{bio}</div>
                  </div>
                  <button onClick={()=>setEditingProfile(true)} style={{padding:"8px 14px",borderRadius:9,border:`1px solid ${t.border}`,background:t.surfaceHi,cursor:"pointer",...F,fontSize:11,fontWeight:700,color:t.textDim,whiteSpace:"nowrap",flexShrink:0,letterSpacing:1.5,textTransform:"uppercase",marginLeft:8}}>Edit</button>
                </div>
                <div style={{padding:"0 4px",marginBottom:18}}>
                  <div style={{...microLabel,marginBottom:8}}>Equipped Title</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {unlockedTitles(level).map(title=>{const sel=selectedTitle===title;return(
                      <button key={title} onClick={()=>setSelectedTitle(title)} style={{padding:"6px 13px",borderRadius:20,border:`1px solid ${sel?t.accent:t.border}`,background:sel?`${t.accent}18`:t.surface,cursor:"pointer",...F,fontSize:12,fontWeight:600,color:sel?t.accent:t.textDim,transition:"all .15s",letterSpacing:.5}}>{title}</button>
                    );})}
                    {/* Premium owned titles render with their animated effect even in selection chips */}
                    {ownedTitles.map(id=>{const ti=PREMIUM_TITLE_BY_ID[id];if(!ti)return null;const sel=selectedTitle===ti.label;return(
                      <button key={id} onClick={()=>setSelectedTitle(ti.label)} style={{padding:"6px 13px",borderRadius:20,border:`1px solid ${sel?t.accent:t.border}`,background:sel?`${t.accent}18`:t.surface,cursor:"pointer",...F,fontSize:12,fontWeight:700,letterSpacing:.5,transition:"all .15s"}}><span className={`title-${ti.effect}`}>{ti.label}</span></button>
                    );})}
                    {level<TITLE_LEVELS[unlockedTitles(level).length]&&<span style={{...mu,fontSize:11,alignSelf:"center",fontStyle:"italic"}}>Lv.{TITLE_LEVELS[unlockedTitles(level).length]} unlocks next</span>}
                  </div>
                </div>
              </>
            ):(
              <div style={{...card,padding:18,marginBottom:16}}>
                <div style={{...FR,fontWeight:700,fontSize:16,marginBottom:14,letterSpacing:-.3}}>Edit Profile</div>
                <div style={{marginBottom:12}}>
                  <div style={{...microLabel,marginBottom:6}}>Username</div>
                  <div style={{width:"100%",padding:"10px 13px",borderRadius:9,border:`1px solid ${t.border}`,background:t.surface2,color:t.textDim,...F,fontSize:14,letterSpacing:.3,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>{username}</span>
                    <span style={{...F,fontSize:9,color:t.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>🔒 Locked</span>
                  </div>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{...microLabel,marginBottom:6}}>Bio</div>
                  <textarea value={bio} onChange={e=>setBio(e.target.value.slice(0,120))} rows={2} style={{width:"100%",padding:"10px 13px",borderRadius:9,border:`1px solid ${t.inputBorder}`,background:t.input,color:t.text,...F,fontSize:13,resize:"none",outline:"none",lineHeight:1.55,transition:"border-color .15s"}} onFocus={e=>e.target.style.borderColor=t.inputFocus} onBlur={e=>e.target.style.borderColor=t.inputBorder}/>
                  <div style={{...mu,fontSize:10,textAlign:"right",marginTop:3,letterSpacing:.5}}>{bio.length} / 120</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setEditingProfile(false)} style={{flex:1,padding:"11px 0",borderRadius:10,border:`1px solid ${t.border}`,background:t.surfaceHi,cursor:"pointer",...F,fontWeight:700,fontSize:13,color:t.muted,letterSpacing:1.5,textTransform:"uppercase"}}>Cancel</button>
                  <button onClick={()=>setEditingProfile(false)} style={{flex:2,padding:"11px 0",borderRadius:10,border:"none",background:`linear-gradient(135deg,${t.accentHi},${t.accent})`,cursor:"pointer",...F,fontWeight:800,fontSize:13,color:t.accentInk,letterSpacing:2,textTransform:"uppercase",boxShadow:`0 4px 12px ${t.accent}33`}}>Save</button>
                </div>
              </div>
            )}

            {coins.length>0&&<div style={{padding:"0 4px",marginBottom:18}}>
              <div style={{...microLabel,marginBottom:6}}>Vault Composition</div>
              <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden",gap:1.5,background:t.faint,padding:1,border:`1px solid ${t.border}`}}>
                {METALS.map((mt,i)=>{const cnt=coins.filter(c=>c.metalIdx===i).length;const p=(cnt/Math.max(1,coins.length))*100;return p>0&&<div key={i} style={{width:`${p}%`,background:`linear-gradient(to bottom,${mt.hl},${mt.base})`,borderRadius:1.5}}/>;})}
              </div>
              <div style={{display:"flex",gap:11,marginTop:9,flexWrap:"wrap"}}>{METALS.map((mt,i)=>{const cnt=coins.filter(c=>c.metalIdx===i).length;return cnt>0&&<div key={i} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:7,height:7,borderRadius:2,background:mt.hl,boxShadow:`0 0 6px ${mt.hl}55`}}/><span style={{...mu,fontSize:11,color:t.textDim,fontWeight:600}}>{cnt}<span style={{color:t.muted,fontWeight:500}}> {mt.name}</span></span></div>;})}</div>
            </div>}

            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:12,padding:"0 4px"}}>
              <div style={{...sectionTitle,fontSize:18}}>Display Cabinet</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {pinnedIds!=null&&(
                  <button onClick={()=>{if(confirm("Reset to auto-pinned (top 6 by rarity)?"))setPinnedIds(null);}} style={{...F,fontSize:9,fontWeight:700,color:t.muted,letterSpacing:1.5,textTransform:"uppercase",border:`1px solid ${t.border}`,padding:"3px 8px",borderRadius:5,background:"transparent",cursor:"pointer"}}>Reset</button>
                )}
                <div style={{...microLabel}}>{pinnedIds?"Manual":"Auto"}{maxPins>6&&` · ${maxPins} slots`}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
              {Array.from({length:maxPins}).map((_,i)=>{
                const coin=showcaseCoins[i];
                if(!coin)return(
                  <button key={i} onClick={()=>setPickerSlot(i)} style={{minHeight:144,border:`1px dashed ${t.border}`,borderRadius:13,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,background:`${t.surface}66`,cursor:"pointer",transition:"all .15s",color:t.muted,fontFamily:"Outfit,sans-serif"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=t.borderHi;e.currentTarget.style.background=t.surfaceHi;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.background=`${t.surface}66`;}}>
                    <span style={{fontSize:22,opacity:.4}}>+</span>
                    <span style={{...F,fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",opacity:.55}}>Pick coin</span>
                  </button>
                );
                const m=METALS[coin.metalIdx];
                return(<div key={coin.id} className={coin.shiny?"shiny-card":""} style={{background:isDark?`linear-gradient(160deg,${m.dark}40,${t.surface})`:t.surface,border:`1px solid ${m.eng}30`,borderTop:`2px solid ${fr.accent}`,borderRadius:13,padding:"13px 8px 10px",textAlign:"center",position:"relative",transition:"transform .2s",cursor:"pointer",overflow:"visible"}} onClick={()=>setSelectedCoin(coin)} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";}} onMouseLeave={e=>{e.currentTarget.style.transform="";}}>
                  {coin.shiny&&<div className="shiny-aura"/>}
                  {coin.metalIdx>=7&&<div className={`ambient-particles ${coin.metalIdx===8?"astral":"eldritch"}`}><span/><span/><span/></div>}
                  <button onClick={(e)=>{e.stopPropagation();togglePin(coin.id);}} title="Unpin from display" style={{position:"absolute",top:5,right:5,width:20,height:20,borderRadius:"50%",border:`1px solid ${t.border}`,background:`${t.surface}cc`,cursor:"pointer",fontFamily:"Outfit,sans-serif",fontSize:11,color:t.muted,padding:0,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",zIndex:3}}>×</button>
                  {coin.shiny&&<div style={{position:"absolute",top:6,left:7,fontSize:11,color:"#ffe060",textShadow:"0 0 6px #ffe06088"}}>✦</div>}
                  <div style={{display:"flex",justifyContent:"center",marginBottom:7}}><CoinCanvas coin={coin} size={64}/></div>
                  <div style={{...VT,fontSize:15,color:m.hl,letterSpacing:3,lineHeight:1}}>{coin.runes}</div>
                  <div style={{...microLabel,fontSize:8,marginTop:3,color:m.hl,opacity:.6}}>{m.name}{coin.shiny?" ✦":""}</div>
                </div>);
              })}
            </div>

            {/* ─── EQUIPPED TAROTS ─── */}
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:12,marginTop:22,padding:"0 4px"}}>
              <div style={{...sectionTitle,fontSize:18}}>Tarot Spread</div>
              <div style={{...microLabel}}>{equippedTarots.length} / {MAX_EQUIPPED_TAROTS}</div>
            </div>
            {equippedTarots.length===0&&ownedTarots.length===0?(
              <div style={{textAlign:"center",padding:"24px 18px",...card,borderStyle:"dashed"}}>
                <div style={{fontSize:32,marginBottom:8,opacity:.4}}>🃏</div>
                <div style={{...mu,fontSize:13,maxWidth:280,margin:"0 auto",lineHeight:1.55}}>The merchant in the Tavern sells tarot cards that grant passive buffs.</div>
                <button onClick={()=>{setTab("tavern");setTavernView("shop");}} style={{marginTop:14,padding:"8px 18px",borderRadius:9,border:`1px solid ${t.borderHi}`,background:`${t.accent}1a`,cursor:"pointer",...F,fontWeight:700,fontSize:11,color:t.accent,letterSpacing:2,textTransform:"uppercase"}}>Visit Shop →</button>
              </div>
            ):(<>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:6,paddingLeft:2,paddingRight:2}}>
                {Array.from({length:5}).map((_,i)=>{
                  const cardId=equippedTarots[i];
                  if(!cardId)return(
                    <div key={`empty-${i}`} style={{flexShrink:0,width:88,aspectRatio:"241 / 565",borderRadius:9,border:`1px dashed ${t.border}`,display:"flex",alignItems:"center",justifyContent:"center",background:`${t.surface}66`}}>
                      <span style={{...F,fontSize:9,color:t.muted,fontWeight:600,letterSpacing:1.5,textTransform:"uppercase"}}>Slot {i+1}</span>
                    </div>
                  );
                  const card=TAROT_BY_ID[cardId];if(!card)return null;
                  return<div key={cardId} style={{flexShrink:0}}><TarotCard card={card} owned equipped size="sm" t={t} onClick={()=>toggleTarot(cardId)}/></div>;
                })}
              </div>
              {/* Active buffs summary */}
              {equippedTarots.length>0&&(
                <div style={{...card,padding:"12px 14px",marginTop:10,display:"flex",flexWrap:"wrap",gap:8}}>
                  {equippedTarots.map(cid=>{const c=TAROT_BY_ID[cid];if(!c)return null;return(
                    <div key={cid} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 9px",borderRadius:6,background:t.surfaceHi,border:`1px solid ${RARITY_COLOR[c.rarity]}33`}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:RARITY_COLOR[c.rarity],boxShadow:`0 0 5px ${RARITY_COLOR[c.rarity]}88`}}/>
                      <span style={{...F,fontSize:11,color:t.textDim,fontWeight:500}}>{c.desc}</span>
                    </div>
                  );})}
                </div>
              )}
              {ownedTarots.length>equippedTarots.length&&(
                <div style={{...mu,fontSize:11,marginTop:8,fontStyle:"italic",textAlign:"center"}}>{ownedTarots.length-equippedTarots.length} unequipped — manage in the Tavern shop</div>
              )}
            </>)}
          </div>
        )}

        {/* ─── SOCIAL ─── */}
        {tab==="social"&&(
          <div style={{animation:"fadein .35s ease"}}>
            {!viewingProfile?(<>
              <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:14,padding:"0 2px"}}>
                <div style={sectionTitle}>Social</div>
                <div style={{...microLabel}}>{friendsList.length} friend{friendsList.length===1?"":"s"}</div>
              </div>

              {/* Search bar */}
              <div style={{position:"relative",marginBottom:14}}>
                <input value={searchQ} onChange={e=>setSearchQ(e.target.value.replace(/[^A-Za-z0-9_]/g,"").slice(0,20))} placeholder="Search by username…" style={{width:"100%",padding:"12px 14px 12px 38px",borderRadius:11,border:`1px solid ${t.inputBorder}`,background:t.input,color:t.text,...F,fontSize:14,outline:"none",transition:"border-color .15s"}} onFocus={e=>e.target.style.borderColor=t.inputFocus} onBlur={e=>e.target.style.borderColor=t.inputBorder}/>
                <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:16,opacity:.5,pointerEvents:"none"}}>🔍</span>
                {searchQ&&<button onClick={()=>setSearchQ("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",border:"none",background:"transparent",cursor:"pointer",color:t.muted,fontSize:18,padding:4}}>×</button>}
              </div>

              {/* Search results */}
              {searchQ.trim().length>=2&&(
                <div style={{marginBottom:18}}>
                  <div style={{...microLabel,marginBottom:8,padding:"0 2px"}}>{searching?"Searching…":`Results (${searchResults.length})`}</div>
                  {searchResults.length===0&&!searching?<div style={{...mu,fontSize:13,padding:"16px 4px",fontStyle:"italic"}}>No collectors found by that name.</div>:(
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {searchResults.map(u=>{
                        const ulvl=lvl(u.xp);
                        const isFriend=friendsList.some(f=>f.username.toLowerCase()===u.username.toLowerCase());
                        return(
                          <div key={u.id} onClick={()=>setViewingProfile(u.username)} style={{...card,padding:"11px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=t.borderHi;e.currentTarget.style.transform="translateX(2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.transform="";}}>
                            <div style={{width:40,height:40,borderRadius:"50%",background:t.surfaceHi,border:`1px solid ${t.borderHi}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,...FR,fontWeight:900,fontSize:16,color:t.accent}}>{u.username.slice(0,2).toUpperCase()}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{...FR,fontWeight:700,fontSize:15,color:t.text,letterSpacing:-.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.username}{isFriend&&<span style={{...F,fontSize:9,fontWeight:700,color:t.success,marginLeft:8,letterSpacing:1.5,textTransform:"uppercase"}}>· Friend</span>}</div>
                              <div style={{...mu,fontSize:11,color:t.textDim,marginTop:1}}>Lv.{ulvl} · {u.title}</div>
                            </div>
                            <span style={{fontSize:18,opacity:.4,color:t.muted}}>›</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Friends list */}
              <div style={{...microLabel,marginBottom:8,padding:"0 2px"}}>Your Circle</div>
              {friendsList.length===0?(
                <div style={{textAlign:"center",padding:"40px 20px",...card}}>
                  <div style={{fontSize:42,marginBottom:12,opacity:.4}}>♟</div>
                  <div style={{...FR,fontWeight:700,fontSize:16,marginBottom:6,letterSpacing:-.3}}>No friends yet</div>
                  <div style={{...mu,fontSize:12,maxWidth:240,margin:"0 auto",lineHeight:1.55}}>Search above to find other collectors and add them to your circle.</div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {friendsList.map(f=>{
                    const flvl=lvl(f.xp);
                    return(
                      <div key={f.id} onClick={()=>setViewingProfile(f.username)} style={{...card,padding:"11px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=t.borderHi;e.currentTarget.style.transform="translateX(2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.transform="";}}>
                        <div style={{width:40,height:40,borderRadius:"50%",...bannerStyle(f.frame||"stone"),border:`1px solid ${(FRAMES[f.frame]||FRAMES.stone).accent}66`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,...FR,fontWeight:900,fontSize:16,color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,.5)"}}>{f.username.slice(0,2).toUpperCase()}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{...FR,fontWeight:700,fontSize:15,color:t.text,letterSpacing:-.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.username}</div>
                          <div style={{...mu,fontSize:11,color:t.textDim,marginTop:1}}>Lv.{flvl} · {f.title}</div>
                        </div>
                        <span style={{fontSize:18,opacity:.4,color:t.muted}}>›</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Followers (people who friended you, but you haven't friended them back) ── */}
              {followersList.length>0&&(
                <div style={{marginTop:24}}>
                  <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:8,padding:"0 2px"}}>
                    <div style={{...microLabel}}>Followers</div>
                    <div style={{...microLabel,color:t.muted}}>{followersList.length}</div>
                  </div>
                  <div style={{...mu,fontSize:11,marginBottom:10,padding:"0 2px",fontStyle:"italic"}}>Tap to view their profile and friend back.</div>
                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                    {followersList.map(f=>{
                      const flvl=lvl(f.xp);
                      return(
                        <div key={f.id} onClick={()=>setViewingProfile(f.username)} style={{...card,padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all .15s",opacity:.85}} onMouseEnter={e=>{e.currentTarget.style.borderColor=t.borderHi;e.currentTarget.style.opacity="1";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.opacity=".85";}}>
                          <div style={{width:36,height:36,borderRadius:"50%",...bannerStyle(f.frame||"stone"),border:`1px solid ${(FRAMES[f.frame]||FRAMES.stone).accent}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,...FR,fontWeight:900,fontSize:14,color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,.5)"}}>{f.username.slice(0,2).toUpperCase()}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{...FR,fontWeight:700,fontSize:13,color:t.textDim,letterSpacing:-.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.username}</div>
                            <div style={{...mu,fontSize:10,marginTop:1}}>Lv.{flvl} · {f.title}</div>
                          </div>
                          <span style={{...F,fontSize:9,fontWeight:700,color:t.accent,background:`${t.accent}11`,padding:"3px 7px",borderRadius:4,letterSpacing:1.5,textTransform:"uppercase",border:`1px solid ${t.accent}33`}}>+ Friend</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>):(
              /* ── Profile detail view ── */
              <div style={{animation:"fadein .25s ease"}}>
                <button onClick={()=>{setViewingProfile(null);setProfileData(null);setProfileErr(null);}} style={{...F,fontSize:12,fontWeight:700,color:t.muted,background:"transparent",border:"none",padding:"4px 0",marginBottom:14,cursor:"pointer",letterSpacing:1.5,textTransform:"uppercase"}}>← Back</button>
                {profileLoading&&<div style={{...mu,textAlign:"center",padding:"60px 0",fontStyle:"italic"}}>Opening their vault…</div>}
                {profileErr&&<div style={{...card,padding:"24px 16px",textAlign:"center",borderColor:t.danger}}><div style={{...F,color:t.danger,fontWeight:600}}>⚠ {profileErr}</div></div>}
                {profileData&&(()=>{
                  const pd=profileData;const plvl=lvl(pd.xp);const pfr=FRAMES[pd.frame]||FRAMES.stone;
                  return(<>
                    <div style={{height:130,borderRadius:16,...bannerStyle(pd.frame||"stone"),position:"relative",overflow:"hidden",marginLeft:-14,marginRight:-14,border:`1px solid ${t.border}`}}>
                      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 30% 60%,rgba(255,255,255,.06),transparent 65%)"}}/>
                      <div className="noise-overlay" style={{opacity:.06}}/>
                      <div style={{position:"absolute",bottom:8,left:16,...microLabel,fontSize:9,color:pfr.accent,opacity:.7}}>{pfr.lbl}</div>
                    </div>
                    <div style={{marginTop:14,marginBottom:12,padding:"0 4px",display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:10}}>
                      <div style={{width:88,height:88,borderRadius:"50%",border:`3px solid ${pfr.accent}`,background:t.surface,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 6px 18px rgba(0,0,0,.35),inset 0 0 0 2px ${t.surface}`}}>
                        {pd.showcase[0]?<CoinCanvas coin={(()=>{const b=mkCoin(pd.showcase[0].seed,1,pd.showcase[0].metalIdx);b.shiny=pd.showcase[0].shiny;return b;})()} size={80}/>:<span style={{fontSize:30,opacity:.3}}>⚒</span>}
                      </div>
                      {!pd.isSelf&&(
                        pd.isFriend?
                          <button onClick={()=>handleRemoveFriend(pd.username)} style={{padding:"9px 16px",borderRadius:10,border:`1px solid ${t.border}`,background:t.surfaceHi,cursor:"pointer",...F,fontSize:11,fontWeight:700,color:t.muted,letterSpacing:1.5,textTransform:"uppercase",transition:"all .15s"}}>✓ Friends</button>
                        :<button onClick={()=>handleAddFriend(pd.username)} style={{padding:"9px 16px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${t.accentHi},${t.accent})`,cursor:"pointer",...F,fontSize:11,fontWeight:800,color:t.accentInk,letterSpacing:1.5,textTransform:"uppercase",boxShadow:`0 4px 10px ${t.accent}33`}}>+ Add Friend</button>
                      )}
                    </div>
                    <div style={{padding:"0 4px",marginBottom:14}}>
                      <div style={{...FR,fontWeight:800,fontSize:24,letterSpacing:-.5,color:t.text,lineHeight:1.1}}>{pd.username}</div>
                      <div style={{...VT,fontSize:18,color:t.muted,letterSpacing:3,marginTop:3}}>{rune(pd.username.toUpperCase().replace(/[^A-Z]/g,""))}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
                        <span style={{background:`linear-gradient(135deg,${t.accentHi},${t.accent})`,color:t.accentInk,fontWeight:900,fontSize:11,padding:"3px 10px",borderRadius:5,letterSpacing:1}}>LV {plvl}</span>
                        <span style={{...F,fontSize:12,color:t.textDim,fontWeight:600}}>{pd.title}</span>
                      </div>
                      {pd.bio&&<div style={{...mu,fontSize:13,color:t.textDim,marginTop:10,lineHeight:1.55,maxWidth:380}}>{pd.bio}</div>}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:18,padding:"0 4px"}}>
                      {[["Coins",pd.coinCount],["Score",pd.rarityScore.toLocaleString()],["✦ Shiny",pd.shinyCount]].map(([k,v])=>(
                        <div key={k} style={{padding:"10px 8px",...card,textAlign:"center"}}>
                          <div style={{...FR,fontWeight:800,fontSize:20,color:t.text,letterSpacing:-.5,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{v}</div>
                          <div style={{...microLabel,fontSize:9,marginTop:4}}>{k}</div>
                        </div>
                      ))}
                    </div>
                    {pd.showcase.length>0&&<div style={{padding:"0 2px"}}>
                      <div style={{...microLabel,marginBottom:9}}>Display Cabinet</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
                        {pd.showcase.map((cs,i)=>{
                          const m=METALS[cs.metalIdx];
                          const dispCoin=(()=>{const b=mkCoin(cs.seed,1,cs.metalIdx);b.id=cs.id;b.shiny=cs.shiny;return b;})();
                          return(
                            <div key={i} className={cs.shiny?"shiny-card":""} style={{background:isDark?`linear-gradient(160deg,${m.dark}40,${t.surface})`:t.surface,border:`1px solid ${m.eng}30`,borderTop:`2px solid ${pfr.accent}`,borderRadius:13,padding:"13px 8px 10px",textAlign:"center",position:"relative"}}>
                              {cs.shiny&&<div className="shiny-aura"/>}
                              {cs.metalIdx>=7&&<div className={`ambient-particles ${cs.metalIdx===8?"astral":"eldritch"}`}><span/><span/><span/></div>}
                              {cs.shiny&&<div style={{position:"absolute",top:6,right:7,fontSize:11,color:"#ffe060",textShadow:"0 0 6px #ffe06088"}}>✦</div>}
                              <div style={{display:"flex",justifyContent:"center",marginBottom:7}}><CoinCanvas coin={dispCoin} size={64}/></div>
                              <div style={{...VT,fontSize:14,color:m.hl,letterSpacing:2,lineHeight:1.1}}>{dispCoin.runes}</div>
                              <div style={{...microLabel,fontSize:8,marginTop:3,color:RARITIES[coinRarity(dispCoin)].color,opacity:.85,fontWeight:700}}>{RARITIES[coinRarity(dispCoin)].name}{cs.shiny?" ✦":""}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>}
                    {/* Equipped tarots — visible on friends' profiles too */}
                    {Array.isArray(pd.equippedTarots)&&pd.equippedTarots.length>0&&(
                      <div style={{padding:"0 2px",marginTop:18}}>
                        <div style={{...microLabel,marginBottom:9}}>Tarot Spread · {pd.equippedTarots.length}/{MAX_EQUIPPED_TAROTS}</div>
                        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:6,paddingLeft:2,paddingRight:2}}>
                          {pd.equippedTarots.map(cid=>{const card=TAROT_BY_ID[cid];if(!card)return null;return(
                            <div key={cid} style={{flexShrink:0}}><TarotCard card={card} owned equipped size="sm" t={t}/></div>
                          );})}
                        </div>
                      </div>
                    )}
                  </>);
                })()}
              </div>
            )}
          </div>
        )}

        {/* ─── VAULT ─── */}
        {tab==="vault"&&(
          <div style={{animation:"fadein .35s ease"}}>
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:14,padding:"0 2px",gap:8}}>
              <div style={sectionTitle}>The Vault</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{...microLabel}}>{coins.length} {coins.length===1?"coin":"coins"}</div>
                {coins.length>0&&(
                  <button onClick={()=>{setSelectMode(s=>!s);setSelectedIds(new Set());}} style={{padding:"5px 11px",borderRadius:6,border:`1px solid ${selectMode?t.accent:t.border}`,background:selectMode?`${t.accent}22`:t.surface,cursor:"pointer",...F,fontSize:10,fontWeight:700,color:selectMode?t.accent:t.muted,letterSpacing:1.5,textTransform:"uppercase",transition:"all .15s"}}>{selectMode?"Cancel":"Select"}</button>
                )}
              </div>
            </div>
            {coins.length===0?(
              <div style={{textAlign:"center",padding:"56px 20px",...card}}>
                <div style={{fontSize:54,marginBottom:14,opacity:.5,filter:"drop-shadow(0 4px 8px rgba(0,0,0,.3))"}}>⛏</div>
                <div style={{...FR,fontWeight:700,fontSize:19,marginBottom:8,letterSpacing:-.3}}>The Vault is empty</div>
                <div style={{...mu,maxWidth:260,margin:"0 auto",lineHeight:1.55}}>Visit the Hunt to unearth your first coin from the soil of forgotten ages.</div>
                <button onClick={()=>setTab("hunt")} style={{marginTop:18,padding:"10px 26px",borderRadius:10,border:`1px solid ${t.borderHi}`,background:`${t.accent}22`,cursor:"pointer",...F,fontWeight:700,fontSize:12,color:t.accent,letterSpacing:2,textTransform:"uppercase"}}>Begin Hunting →</button>
              </div>
            ):(
              <>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
                  {[[-1,"All",coins.length],...METALS.map((m,i)=>[i,m.name,coins.filter(c=>c.metalIdx===i).length]).filter(x=>x[2]>0)].map(([idx,lbl,cnt])=>{const active=filter===idx;const mt=idx>=0?METALS[idx]:null;return(<button key={idx} onClick={()=>setFilter(idx)} style={{padding:"6px 13px",borderRadius:20,border:`1px solid ${active?(mt?.eng||t.accent):t.border}`,background:active?(mt?`${mt.dark}55`:t.surfaceHi):"transparent",color:active?(mt?.hl||t.accent):t.muted,...F,fontSize:11,fontWeight:600,cursor:"pointer",transition:"all .15s",letterSpacing:.5}}>{lbl}<span style={{marginLeft:5,opacity:.65,fontWeight:500,fontVariantNumeric:"tabular-nums"}}>{cnt}</span></button>);})}
                </div>
                <div style={{...mu,fontSize:11,marginBottom:10,fontStyle:"italic"}}>Tap to inspect · double-tap to pin</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
                  {visCoins.map(coin=>{const m=METALS[coin.metalIdx];const r=RARITIES[coinRarity(coin)];const pinned=pinnedIds?pinnedIds.includes(coin.id):autoTop.some(c=>c.id===coin.id);const isSel=selectedIds.has(coin.id);return(
                    <div key={coin.id} className={coin.shiny?"shiny-card":""} style={{...card,padding:"13px 8px 10px",textAlign:"center",cursor:"pointer",border:`1px solid ${isSel?t.accent:pinned?m.eng+"66":t.border}`,borderTop:`2px solid ${isSel?t.accent:r.color}`,background:isSel?`${t.accent}11`:pinned?(isDark?`linear-gradient(160deg,${m.dark}30,${t.surface})`:t.surface):t.surface,transition:"transform .18s, border-color .18s, background .15s",position:"relative",boxShadow:isSel?`0 0 0 2px ${t.accent}55`:r.id>=3?`0 0 0 1px ${r.color}33`:"none",opacity:selectMode&&coin.locked?0.45:1}}
                      onMouseEnter={e=>{if(!selectMode){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=m.eng;e.currentTarget.style.borderTopColor=r.color;}}}
                      onMouseLeave={e=>{if(!selectMode){e.currentTarget.style.transform="";e.currentTarget.style.borderColor=pinned?m.eng+"66":t.border;e.currentTarget.style.borderTopColor=r.color;}}}
                      onClick={e=>{
                        // Select mode: toggle selection (skips locked coins)
                        if(selectMode){
                          if(coin.locked)return;
                          setSelectedIds(prev=>{
                            const next=new Set(prev);
                            if(next.has(coin.id))next.delete(coin.id);
                            else next.add(coin.id);
                            return next;
                          });
                          return;
                        }
                        // Normal: double-tap pins, single-tap opens detail
                        const now=Date.now();
                        const last=e.currentTarget._lastTap||0;
                        if(now-last<350){
                          clearTimeout(e.currentTarget._tapT);
                          e.currentTarget._lastTap=0;
                          togglePin(coin.id);
                        }else{
                          e.currentTarget._lastTap=now;
                          const target=e.currentTarget;
                          e.currentTarget._tapT=setTimeout(()=>{
                            target._lastTap=0;
                            setSelectedCoin(coin);
                          },280);
                        }
                      }}>
                      {coin.shiny&&<div className="shiny-aura"/>}
                      {coin.metalIdx>=7&&<div className={`ambient-particles ${coin.metalIdx===8?"astral":"eldritch"}`}><span/><span/><span/></div>}
                      {pinned&&!isSel&&<div style={{position:"absolute",top:7,right:7,width:6,height:6,borderRadius:"50%",background:m.hl,boxShadow:`0 0 6px ${m.hl}`}}/>}
                      {isSel&&<div style={{position:"absolute",top:5,right:5,width:18,height:18,borderRadius:"50%",background:t.accent,color:t.accentInk,...F,fontSize:11,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 8px ${t.accent}88`,zIndex:3}}>✓</div>}
                      {coin.shiny&&<div style={{position:"absolute",top:6,left:7,fontSize:10,color:"#ffe060",textShadow:"0 0 6px #ffe06088"}}>✦</div>}
                      {coin.locked&&<div style={{position:"absolute",bottom:6,right:7,fontSize:10,opacity:.85,filter:"drop-shadow(0 0 4px rgba(0,0,0,.6))"}}>🔒</div>}
                      <div style={{display:"flex",justifyContent:"center",marginBottom:7}}><CoinCanvas coin={coin} size={64}/></div>
                      <div style={{...VT,fontSize:14,color:m.hl,letterSpacing:3,lineHeight:1.1}}>{coin.runes}</div>
                      <div style={{...microLabel,fontSize:7.5,marginTop:3,color:r.color,opacity:.85,fontWeight:700}}>{r.name}</div>
                      <div style={{...microLabel,fontSize:7,marginTop:1,color:m.hl,opacity:.45}}>{m.name}{coin.shiny?" ✦":""}</div>
                    </div>
                  );})}
                </div>
              </>
            )}
            {/* Bulk-sell action bar — appears when in select mode with at least one selection */}
            {selectMode&&selectedIds.size>0&&(
              <div style={{position:"fixed",bottom:"calc(82px + env(safe-area-inset-bottom,0px))",left:"50%",transform:"translateX(-50%)",zIndex:90,display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:t.surface,border:`1px solid ${t.borderHi}`,borderRadius:14,boxShadow:"0 8px 28px rgba(0,0,0,.5)",animation:"fadein .15s ease",maxWidth:"calc(100vw - 24px)"}}>
                <div style={{minWidth:0}}>
                  <div style={{...F,fontSize:11,fontWeight:700,color:t.muted,letterSpacing:1.5,textTransform:"uppercase"}}>{selectedTotal.sellable} selected</div>
                  <div style={{...F,fontSize:14,fontWeight:800,color:t.accent,letterSpacing:.5,fontVariantNumeric:"tabular-nums"}}>◈ {selectedTotal.total.toLocaleString()}</div>
                  {selectedTotal.locked>0&&<div style={{...mu,fontSize:9,marginTop:1,fontStyle:"italic"}}>{selectedTotal.locked} locked · skipped</div>}
                </div>
                <button onClick={()=>{if(confirm(`Sell ${selectedTotal.sellable} coin${selectedTotal.sellable===1?"":"s"} for ◈${selectedTotal.total.toLocaleString()}?`))bulkSell();}} disabled={selectedTotal.sellable===0} style={{padding:"10px 18px",borderRadius:10,border:`1px solid ${t.accent}`,background:`linear-gradient(135deg,${t.accentHi},${t.accent})`,cursor:selectedTotal.sellable?"pointer":"not-allowed",opacity:selectedTotal.sellable?1:0.5,...F,fontWeight:800,fontSize:12,color:t.accentInk,letterSpacing:1.5,textTransform:"uppercase",whiteSpace:"nowrap"}}>Sell All</button>
              </div>
            )}
          </div>
        )}

        {/* ─── HUNT ─── */}
        {tab==="hunt"&&(
          <div style={{animation:"fadein .35s ease"}}>
            {phase==="hunt"&&(<>
              <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:12,padding:"0 2px"}}>
                <div style={sectionTitle}>The Field</div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{...microLabel}}>Lv.{shovelLevel}</div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:11,opacity:.65}}>⛏</span>
                    <div style={{width:42,height:5,background:t.faint,borderRadius:3,overflow:"hidden",border:`1px solid ${t.border}`}}>
                      <div style={{width:`${Math.round((shovelDur/maxDur)*100)}%`,height:"100%",background:shovelDur>maxDur*.5?t.success:shovelDur>maxDur*.2?t.accent:t.danger,transition:"width .3s"}}/>
                    </div>
                    <span style={{...F,fontSize:9,color:t.muted,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{shovelDur}/{maxDur}</span>
                  </div>
                </div>
              </div>
              <div style={{...mu,fontSize:13,marginBottom:14,padding:"0 2px",fontStyle:"italic",color:t.textDim}}>Sweep across the soil. When the signal locks, dig.</div>
              <div style={{...card,padding:"12px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,alignItems:"baseline"}}>
                    <span style={{...microLabel,fontSize:9}}>Signal</span>
                    <span style={{...VT,fontSize:18,color:signalColor,letterSpacing:1.5,textShadow:`0 0 8px ${signalColor}55`}}>{signal<.04?"NO SIGNAL":signal<.28?"FAINT":signal<.58?"MODERATE":signal<.84?"STRONG":"LOCKED ON"}</span>
                  </div>
                  <div style={{height:6,background:t.faint,borderRadius:3,overflow:"hidden",border:`1px solid ${t.border}`}}><div style={{width:`${signal*100}%`,height:"100%",borderRadius:3,background:`linear-gradient(to right,#2a3850,${signalColor})`,transition:"width .08s",boxShadow:`0 0 8px ${signalColor}55`}}/></div>
                </div>
                {canDig&&shovelDur>0&&<button onClick={onDig} style={{padding:"11px 26px",borderRadius:11,border:`1px solid ${t.success}`,cursor:"pointer",background:isDark?"linear-gradient(135deg,#0e2810,#1e4820)":"linear-gradient(135deg,#e8f8ee,#bce8ca)",...F,fontWeight:800,fontSize:14,color:t.success,flexShrink:0,letterSpacing:2,textTransform:"uppercase",boxShadow:`0 4px 12px ${t.success}33`,animation:"flicker 1.4s linear infinite",display:"flex",alignItems:"center",gap:8}}>
                  <span>⛏ Dig</span>
                  <kbd style={{...F,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"rgba(0,0,0,.25)",color:t.success,letterSpacing:.5,opacity:.85,border:`1px solid ${t.success}55`}}>↵</kbd>
                </button>}
                {shovelDur<=0&&<button onClick={()=>{setTab("tavern");setTavernView("repair");}} style={{padding:"11px 22px",borderRadius:11,border:`1px solid ${t.danger}`,cursor:"pointer",background:isDark?"linear-gradient(135deg,#2a0808,#481010)":"linear-gradient(135deg,#fbe8e8,#f0c4c4)",...F,fontWeight:800,fontSize:13,color:t.danger,flexShrink:0,letterSpacing:1.5,textTransform:"uppercase"}}>⚒ Repair Pickaxe</button>}
              </div>
              {/* Hunt field — buried-cross-section design.
                  iOS-optimized:
                  - Cursor + glyph positions written DIRECTLY to DOM via refs in
                    onFieldInteract, bypassing React render entirely on the hot path.
                  - All animated properties are transform/opacity only (GPU compositor).
                  - No canvas, no mask-image, no mix-blend-mode, no backdrop-filter,
                    no filter:drop-shadow on hot-path elements.
                  - Static SVG patterns for soil texture (browser caches once). */}
              <div ref={fieldRef} onMouseMove={onFieldInteract} onTouchMove={onFieldInteract} onClick={onFieldInteract}
                style={{
                  position:"relative",height:300,borderRadius:16,overflow:"hidden",
                  cursor:"crosshair",userSelect:"none",touchAction:"none",
                  border:`1px solid ${isDark?"#3a2812":"#a08868"}`,
                  background:isDark
                    ? `linear-gradient(180deg,#1a0f06 0%,#241608 18%,#1c1006 32%,#2a1a0a 48%,#1e1208 65%,#160d05 82%,#0e0703 100%)`
                    : `linear-gradient(180deg,#c8b090 0%,#b8a080 18%,#a89070 32%,#9a8260 48%,#8a7050 65%,#705840 82%,#5a4630 100%)`,
                  boxShadow:`inset 0 4px 12px rgba(0,0,0,.5), inset 0 -4px 12px rgba(0,0,0,.6)`,
                  WebkitTapHighlightColor:"transparent",
                }}>

                {/* Soil texture — static SVG pattern. Browser paints once and caches. */}
                <svg width="100%" height="100%" style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:1,opacity:isDark?.4:.55}}>
                  <defs>
                    <pattern id="soilGrain" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                      <circle cx="4" cy="6" r="0.6" fill={isDark?"#5a3818":"#3a2814"}/>
                      <circle cx="11" cy="22" r="0.4" fill={isDark?"#704020":"#403018"}/>
                      <circle cx="22" cy="9" r="0.7" fill={isDark?"#4a2810":"#5a4020"}/>
                      <circle cx="27" cy="26" r="0.4" fill={isDark?"#604020":"#3e2c18"}/>
                      <circle cx="16" cy="15" r="0.5" fill={isDark?"#503010":"#4a3418"}/>
                    </pattern>
                    <pattern id="soilDots" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="0.3" fill={isDark?"#7a4a20":"#2a1c0c"} opacity="0.6"/>
                      <circle cx="6" cy="5" r="0.2" fill={isDark?"#5a3818":"#3a280f"} opacity="0.4"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#soilGrain)"/>
                  <rect width="100%" height="100%" fill="url(#soilDots)"/>
                  <line x1="0" y1="32%" x2="100%" y2="33%" stroke={isDark?"#3a2412":"#5a4020"} strokeWidth="0.5" opacity="0.4"/>
                  <line x1="0" y1="58%" x2="100%" y2="60%" stroke={isDark?"#2a1a08":"#4a3418"} strokeWidth="0.5" opacity="0.5"/>
                  <line x1="0" y1="82%" x2="100%" y2="83%" stroke={isDark?"#1a0e04":"#2a1c0c"} strokeWidth="0.5" opacity="0.5"/>
                </svg>

                {/* Drifting ambient particles — pure CSS animation on a single element */}
                <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:1,animation:"ambientDrift 18s ease-in-out infinite",opacity:.5}}>
                  <div style={{position:"absolute",left:"15%",top:"22%",width:2,height:2,borderRadius:"50%",background:isDark?"#a07840":"#5a3818"}}/>
                  <div style={{position:"absolute",left:"68%",top:"18%",width:1.5,height:1.5,borderRadius:"50%",background:isDark?"#806030":"#4a2814"}}/>
                  <div style={{position:"absolute",left:"42%",top:"71%",width:2,height:2,borderRadius:"50%",background:isDark?"#a07840":"#3a2814"}}/>
                  <div style={{position:"absolute",left:"82%",top:"55%",width:1.5,height:1.5,borderRadius:"50%",background:isDark?"#906838":"#503018"}}/>
                  <div style={{position:"absolute",left:"24%",top:"48%",width:1.2,height:1.2,borderRadius:"50%",background:isDark?"#704830":"#3a2010"}}/>
                </div>

                {/* Buried glyph — at coin's position. Opacity controlled via ref by
                    onFieldInteract directly so React doesn't re-render on movement. */}
                <div ref={glyphRef} style={{
                  position:"absolute",
                  left:`${coinFrac.x*100}%`,top:`${coinFrac.y*100}%`,
                  transform:"translate3d(-50%,-50%,0)",
                  pointerEvents:"none",zIndex:3,
                  opacity:0,
                  willChange:"opacity",
                }}>
                  <span style={{
                    fontFamily:"\'Fraunces\',serif",
                    fontSize:42,fontWeight:700,lineHeight:1,
                    color:METALS[huntCoin.metalIdx]?.hl||"#d4a060",
                    textShadow:`0 0 14px ${METALS[huntCoin.metalIdx]?.hl||"#d4a060"}, 0 0 28px ${METALS[huntCoin.metalIdx]?.hl||"#d4a060"}99`,
                    display:"block",
                    animation:"lensGlyphFloat 2.4s ease-in-out infinite",
                  }}>{["☉","⊙","☽","◉","✥","◈","✶","⌬","❋"][huntCoin.metalIdx]||"☉"}</span>
                </div>

                {/* The lens cursor — position written DIRECTLY via ref by
                    onFieldInteract, bypassing React. iOS-friendly hot path. */}
                <div ref={lensRef} style={{
                  position:"absolute",
                  left:0,top:0,
                  transform:"translate3d(0,0,0)",
                  pointerEvents:"none",zIndex:5,
                  willChange:"transform",
                }}>
                  <div ref={lensRingRef} style={{
                    width:78,height:78,borderRadius:"50%",
                    border:`2px solid ${isDark?"#a07840":"#5a3818"}`,
                    boxSizing:"border-box",
                    boxShadow:`0 2px 6px rgba(0,0,0,.5), inset 0 0 0 4px rgba(0,0,0,.15), inset 0 0 0 6px ${isDark?"#3a2410":"#a08868"}55`,
                    transform:"translate(-50%,-50%)",
                    background:isDark
                      ? `radial-gradient(circle at 35% 35%,#3a2818,#1a0f06 70%)`
                      : `radial-gradient(circle at 35% 35%,#d8c0a0,#806848 75%)`,
                    transition:"border-color .25s, box-shadow .25s",
                  }}>
                    <div ref={lensGlowRef} style={{
                      position:"absolute",inset:4,borderRadius:"50%",
                      border:"2px solid transparent",
                      pointerEvents:"none",
                      transition:"border-color .2s, box-shadow .2s",
                      boxSizing:"border-box",
                    }}/>
                    <div style={{position:"absolute",left:"50%",top:8,bottom:8,width:1,background:isDark?"rgba(160,120,64,.3)":"rgba(58,40,20,.3)",transform:"translateX(-50%)",pointerEvents:"none"}}/>
                    <div style={{position:"absolute",top:"50%",left:8,right:8,height:1,background:isDark?"rgba(160,120,64,.3)":"rgba(58,40,20,.3)",transform:"translateY(-50%)",pointerEvents:"none"}}/>
                    <div ref={lensBeadRef} style={{
                      position:"absolute",left:"50%",top:"50%",
                      transform:"translate(-50%,-50%)",
                      width:6,height:6,borderRadius:"50%",
                      background:isDark?"#a07840":"#5a3818",
                      transition:"background .2s, box-shadow .2s",
                    }}/>
                  </div>
                </div>

                {/* Sense text — re-renders only when level changes (via key prop) */}
                <div style={{position:"absolute",bottom:14,left:0,right:0,textAlign:"center",pointerEvents:"none",zIndex:6}}>
                  {(() => {
                    const lvl=senseLevel(signal);
                    if(!lvl)return(
                      <span style={{...mu,fontSize:13,opacity:.4,fontStyle:"italic",letterSpacing:1.5,color:isDark?"#8a7250":"#3a2814"}}>Sweep the field</span>
                    );
                    const phrases=SENSE_PHRASES[lvl];
                    const phrase=phrases[huntCoin.seed%phrases.length];
                    return(
                      <span key={lvl} style={{
                        ...mu,
                        fontSize:lvl==="locked"?14:12,
                        opacity:lvl==="locked"?.95:.7,
                        fontStyle:"italic",
                        letterSpacing:1.2,
                        color:lvl==="locked"?(isDark?"#7cffb0":"#207040"):(isDark?"#c8b89a":"#3a2814"),
                        display:"inline-block",
                        animation:"senseFadeIn .4s ease-out",
                      }}>{phrase}</span>
                    );
                  })()}
                </div>

                {/* Hermit reveal badge — solid background (no backdrop-filter for iOS) */}
                {buff.revealRarity&&(()=>{
                  const rRng=new RNG(huntCoin.seed^0xfa11);
                  const previewRarity=rollRarity(rRng,level,null,false);
                  const r=RARITIES[previewRarity];
                  return(
                    <div style={{position:"absolute",top:10,left:10,padding:"5px 11px",borderRadius:7,background:isDark?"rgba(20,12,4,.92)":"rgba(255,248,232,.92)",border:`1px solid ${r.color}88`,zIndex:7,pointerEvents:"none",display:"flex",alignItems:"center",gap:6}}>
                      <span style={{...microLabel,fontSize:8,color:isDark?"#8a7250":"#5a4020",letterSpacing:1.5}}>Hermit sees</span>
                      <span style={{...F,fontSize:11,fontWeight:800,color:r.color,letterSpacing:.5}}>{r.name}</span>
                    </div>
                  );
                })()}

                {/* Wheel of Fortune streak — solid background */}
                {buff.guaranteedEvery>0&&(
                  <div style={{position:"absolute",top:10,right:10,padding:"5px 11px",borderRadius:7,background:isDark?"rgba(20,12,4,.92)":"rgba(255,248,232,.92)",border:`1px solid ${RARITY_COLOR.epic}88`,zIndex:7,pointerEvents:"none",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{...microLabel,fontSize:8,color:isDark?"#8a7250":"#5a4020",letterSpacing:1.5}}>Wheel</span>
                    <span style={{...F,fontSize:11,fontWeight:800,color:RARITY_COLOR.epic,letterSpacing:.5,fontVariantNumeric:"tabular-nums"}}>{findStreak%buff.guaranteedEvery}/{buff.guaranteedEvery}</span>
                  </div>
                )}
              </div>
            </>)}
            {phase==="dig"&&foundCoin&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,animation:"fadein .35s ease"}}>
                <div style={{...sectionTitle,textAlign:"center"}}>Excavate</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                  <div style={{...microLabel,fontSize:10,padding:"5px 11px",background:isDark?"#0e2010":"#e8f5ec",border:`1px solid ${isDark?"#1e3820":"#aadaba"}`,borderRadius:6,color:t.success}}>⚡ 1–2 digs · rarity up</div>
                  <div style={{...microLabel,fontSize:10,padding:"5px 11px",background:isDark?"#1a0e08":"#faf0ea",border:`1px solid ${isDark?"#3a1e10":"#e0b090"}`,borderRadius:6,color:"#c47040"}}>☠ All cells · rarity down</div>
                </div>
                {tooDeepMsg&&<div style={{background:isDark?"#1a0c08":"#fff5f0",border:`1px solid ${t.danger}`,borderRadius:9,padding:"11px 18px",...F,fontSize:13,color:t.danger,textAlign:"center",fontWeight:600,maxWidth:320,letterSpacing:.3}}>⛏ {tooDeepMsg}</div>}
                <DigPit coin={foundCoin} shovelLevel={shovelLevel} onFound={onDigFound} onTooDeep={onTooDeep} onCellScrap={onCellScrap} t={t} isDark={isDark}/>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"center"}}>
                  <button onClick={onAbandon} style={{padding:"8px 18px",borderRadius:8,border:`1px solid ${t.border}`,background:"transparent",cursor:"pointer",...F,fontSize:11,fontWeight:600,color:t.muted,letterSpacing:2,textTransform:"uppercase",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.color=t.textDim;e.currentTarget.style.borderColor=t.borderHi;}} onMouseLeave={e=>{e.currentTarget.style.color=t.muted;e.currentTarget.style.borderColor=t.border;}}>
                    ← Leave buried
                  </button>
                </div>
              </div>
            )}
            {phase==="brush"&&foundCoin&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,animation:"fadein .4s ease"}}>
                <div style={{...sectionTitle,textAlign:"center"}}>Brush It Off</div>
                {/* Show what rarity was rolled — the Hanged Man choice is informed */}
                {(()=>{
                  const r=RARITIES[coinRarity(foundCoin)]||RARITIES[0];
                  return(
                    <div style={{...microLabel,fontSize:10,padding:"6px 13px",background:`${r.color}15`,border:`1px solid ${r.color}66`,borderRadius:6,color:r.color,fontWeight:800,letterSpacing:1.5,boxShadow:`0 0 10px ${r.color}22`,display:"flex",alignItems:"center",gap:6}}>
                      <span>Rolled · {r.name}</span>
                      {foundCoin.rerolled&&<span style={{opacity:.7,fontSize:8}}>(rerolled)</span>}
                    </div>
                  );
                })()}
                <div style={{...microLabel,fontSize:10,padding:"5px 13px",background:t.surfaceHi,border:`1px solid ${t.border}`,borderRadius:6,color:t.textDim}}>🖌️ {brushData.label} · {Math.round(Math.min(0.95,brushData.shinyChance+buff.shinyBonus)*100)}% shiny{buff.shinyBonus>0&&<span style={{color:t.success,marginLeft:4}}>(+{Math.round(buff.shinyBonus*100)}%)</span>}</div>
                {/* Hanged Man reroll button — only when tarot equipped, not used today, and not already rerolled */}
                {hangedManAvailable&&!foundCoin.rerolled&&(
                  <button onClick={rerollFoundRarity} style={{padding:"9px 22px",borderRadius:9,border:`1px solid ${RARITY_COLOR.epic}`,background:`linear-gradient(135deg,${RARITY_COLOR.epic}33,${RARITY_COLOR.epic}11)`,cursor:"pointer",...F,fontSize:11,fontWeight:800,color:RARITY_COLOR.epic,letterSpacing:2,textTransform:"uppercase",transition:"all .15s",boxShadow:`0 0 16px ${RARITY_COLOR.epic}33`}}>
                    ✦ Hanged Man · Reroll Rarity
                  </button>
                )}
                <BrushReveal coin={foundCoin} brushAlpha={brushData.alpha} shinyChance={Math.min(0.95,brushData.shinyChance+buff.shinyBonus)} onRevealed={onBrushDone} t={t}/>
              </div>
            )}
          </div>
        )}

        {/* ─── FORGE ─── */}
        {tab==="forge"&&(
          <div style={{animation:"fadein .35s ease"}}>
            <div style={{margin:"-18px -14px 16px",padding:"36px 22px 20px",background:isDark?"linear-gradient(to bottom,#0a0402 0%,#1a0a04 40%,transparent 100%)":"linear-gradient(to bottom,#f0d8a0 0%,#e8c890 40%,transparent 100%)",position:"relative",overflow:"hidden",borderBottom:`1px solid ${isDark?"rgba(200,80,10,.18)":"rgba(180,80,20,.2)"}`}}>
              <div style={{position:"absolute",bottom:-12,left:"50%",width:280,height:70,borderRadius:"50%",background:`radial-gradient(ellipse,${isDark?"rgba(255,90,10,.28)":"rgba(220,80,10,.28)"},transparent 70%)`,transform:"translateX(-50%)",pointerEvents:"none",filter:"blur(2px)"}}/>
              <div style={{position:"absolute",bottom:0,left:"22%",width:90,height:50,borderRadius:"50%",background:`radial-gradient(ellipse,${isDark?"rgba(255,60,5,.18)":"rgba(220,60,10,.2)"},transparent 70%)`,pointerEvents:"none"}}/>
              <div style={{position:"absolute",bottom:0,right:"18%",width:70,height:50,borderRadius:"50%",background:`radial-gradient(ellipse,${isDark?"rgba(255,60,5,.18)":"rgba(220,60,10,.2)"},transparent 70%)`,pointerEvents:"none"}}/>
              <div style={{display:"flex",gap:14,alignItems:"center",position:"relative"}}>
                <div style={{fontSize:40,filter:"drop-shadow(0 2px 6px rgba(255,80,10,.4))",animation:"flicker 2.4s linear infinite"}}>⚒</div>
                <div style={{flex:1}}>
                  <div style={{...FR,fontWeight:800,fontSize:22,marginBottom:3,letterSpacing:-.3,color:t.text}}>The Forge</div>
                  <div style={{...mu,fontSize:12,fontStyle:"italic"}}>Sacrifice coins. Earn the right to dig deeper.</div>
                </div>
                <div style={{fontSize:24,opacity:.5,animation:"flicker 1.8s linear infinite"}}>🔥</div>
              </div>
            </div>
            {coins.length>0&&<div style={{...card,padding:"11px 14px",marginBottom:14,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{...microLabel,fontSize:10}}>Available</span>
              {METALS.map((m,i)=>{const have=sacrificialCoins.filter(c=>c.metalIdx===i).length;const lockedCnt=coins.filter(c=>c.metalIdx===i&&c.locked).length;return(have>0||lockedCnt>0)&&(<div key={i} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:2,background:m.hl,boxShadow:`0 0 4px ${m.hl}66`}}/><span style={{...F,fontSize:11,color:m.hl,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{have}{lockedCnt>0&&<span style={{color:t.muted,fontWeight:500,fontSize:10}}> +{lockedCnt}🔒</span>}<span style={{color:t.muted,fontWeight:500,marginLeft:2}}>×</span></span></div>);})}
            </div>}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {[
                {type:"shovel",icon:"⛏",label:"Shovel",level:shovelLevel,max:MAX_SH,ups:SHOVEL_UPS,stat:"Unlocks up to",statV:l=>METALS[SHOVEL_TIER_CAP[Math.min(l-1,SHOVEL_TIER_CAP.length-1)]]?.name??"Copper"},
                {type:"brush", icon:"🖌️",label:"Brush", level:brushLevel,max:MAX_BR,ups:BRUSH_UPS, stat:"Shiny chance",statV:l=>`${Math.round((BRUSH_UPS[l]?.shinyChance??0.01)*100)}%`},
              ].map(({type,icon,label,level:lv,max,ups,stat,statV})=>{
                const nl=lv+1;const nu=nl<=max?ups[nl]:null;const maxed=lv>=max;const afford=nu&&canAfford(nu.cost);
                return(
                  <div key={type} style={{...card,overflow:"hidden"}}>
                    <div style={{padding:"15px 17px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:44,height:44,background:`linear-gradient(135deg,${t.surfaceHi},${t.surface})`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:`1px solid ${t.borderHi}`,boxShadow:`inset 0 1px 0 rgba(255,255,255,.05)`}}>{type==="shovel"?<PickaxeIcon level={lv} size={32}/>:icon}</div>
                        <div>
                          <div style={{...FR,fontWeight:700,fontSize:15,letterSpacing:-.2,color:t.text}}>{label}</div>
                          <div style={{...mu,fontSize:11}}>{ups[lv]?.label??`Lv.${lv} Base`}</div>
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{...FR,fontWeight:800,fontSize:22,color:t.accent,letterSpacing:-1,lineHeight:1}}>Lv.{lv}</div>
                        <div style={{display:"flex",gap:3,marginTop:5,justifyContent:"flex-end"}}>{Array.from({length:max},(_,i)=><div key={i} style={{width:10,height:4,borderRadius:1,background:i<lv?t.accent:t.faint,boxShadow:i<lv?`0 0 4px ${t.accent}66`:"none"}}/>)}</div>
                      </div>
                    </div>
                    <div style={{padding:"13px 17px"}}>
                      {type==="shovel"&&(()=>{
                        const durPct=Math.round((shovelDur/maxDur)*100);
                        const durColor=durPct>50?t.success:durPct>20?t.accent:t.danger;
                        return(
                          <div style={{marginBottom:12,padding:"10px 12px",background:t.surfaceHi,borderRadius:8,border:`1px solid ${t.border}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,...F,fontSize:11}}>
                              <span style={{color:t.muted,letterSpacing:1.5,textTransform:"uppercase",fontWeight:700}}>Durability</span>
                              <span style={{color:durColor,fontWeight:800,fontVariantNumeric:"tabular-nums"}}>{shovelDur} / {maxDur}</span>
                            </div>
                            <div style={{height:6,background:t.faint,borderRadius:3,overflow:"hidden",border:`1px solid ${t.border}`}}>
                              <div style={{width:`${durPct}%`,height:"100%",background:`linear-gradient(to right,${durColor}88,${durColor})`,transition:"width .4s",boxShadow:`0 0 6px ${durColor}66`}}/>
                            </div>
                            {shovelDur<maxDur&&(
                              <button onClick={()=>{setTab("tavern");setTavernView("repair");}} style={{marginTop:8,width:"100%",padding:"7px 0",borderRadius:7,border:`1px solid ${t.border}`,background:"transparent",cursor:"pointer",...F,fontSize:10,fontWeight:700,color:t.textDim,letterSpacing:2,textTransform:"uppercase"}}>⚒ Repair in Tavern</button>
                            )}
                          </div>
                        );
                      })()}
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,...F,fontSize:12,alignItems:"baseline"}}>
                        <span style={{color:t.muted,letterSpacing:.5}}>{stat}</span>
                        <span style={{color:t.text,fontWeight:700,...FR,fontSize:14,fontStyle:"italic"}}>{statV(lv)}</span>
                      </div>
                      {maxed?<div style={{textAlign:"center",...F,fontSize:13,color:t.accent,fontWeight:800,padding:"8px 0",letterSpacing:3,textTransform:"uppercase"}}>✦ Fully Forged</div>:(
                        nu?<>
                          <div style={{...F,fontSize:12,marginBottom:10,color:t.textDim,fontWeight:500}}><span style={{color:t.muted}}>→</span> {nu.label}<span style={{color:t.muted,fontWeight:400,marginLeft:6,fontStyle:"italic"}}>· {nu.desc}</span></div>
                          <div style={{display:"flex",gap:6,marginBottom:11,flexWrap:"wrap"}}>
                            {(nu.cost||[]).map(({m:mi,n},ci)=>{const mt=METALS[mi];const have=sacrificialCoins.filter(c=>c.metalIdx===mi).length;const ok=have>=n;return(<div key={ci} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 11px",borderRadius:7,background:ok?`${mt.dark}44`:t.surfaceHi,border:`1px solid ${ok?mt.eng+"66":t.border}`}}><div style={{width:7,height:7,borderRadius:2,background:ok?mt.hl:t.muted,boxShadow:ok?`0 0 4px ${mt.hl}88`:"none"}}/><span style={{...F,fontSize:12,color:ok?mt.hl:t.muted,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{n}× {mt.name}</span><span style={{...F,fontSize:10,color:ok?t.success:t.muted,fontWeight:600,opacity:.8}}>({have})</span></div>);})}
                          </div>
                          <button onClick={()=>forgeUp(type)} disabled={!afford} style={{width:"100%",padding:"11px 0",borderRadius:10,border:`1px solid ${afford?t.accentDim:t.border}`,cursor:afford?"pointer":"not-allowed",background:afford?(isDark?"linear-gradient(135deg,#2a1e08,#604a14)":"linear-gradient(135deg,#ede0b0,#d4a830)"):t.surfaceHi,...F,fontWeight:800,fontSize:13,color:afford?(isDark?t.accent:t.accentInk):t.muted,transition:"all .15s",letterSpacing:2,textTransform:"uppercase",boxShadow:afford?`0 4px 12px ${t.accent}22`:"none"}}>{afford?"⚒ Forge · +200 XP":"Missing materials"}</button>
                        </>:<div style={{...mu,fontSize:12,padding:"8px 0",textAlign:"center",fontStyle:"italic"}}>Forge to unlock upgrades</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAVERN ─── */}
        {/* ─── SHRINE ─── */}
        {tab==="shrine"&&(
          <div style={{animation:"fadein .35s ease"}}>
            <div style={{margin:"-18px -14px 16px",padding:"36px 22px 20px",background:isDark?"linear-gradient(to bottom,#020a14 0%,#04101e 50%,transparent 100%)":"linear-gradient(to bottom,#d8dde8 0%,#c8d2e0 50%,transparent 100%)",position:"relative",overflow:"hidden",borderBottom:`1px solid ${isDark?"rgba(120,140,200,.18)":"rgba(120,140,200,.2)"}`}}>
              <div style={{position:"absolute",top:"30%",left:"20%",width:140,height:140,borderRadius:"50%",background:`radial-gradient(circle,${isDark?"rgba(180,200,255,.12)":"rgba(180,200,255,.15)"},transparent 70%)`,pointerEvents:"none",filter:"blur(4px)",animation:"flicker 4s linear infinite"}}/>
              <div style={{position:"absolute",top:"40%",right:"15%",width:90,height:90,borderRadius:"50%",background:`radial-gradient(circle,${isDark?"rgba(200,160,255,.16)":"rgba(200,160,255,.18)"},transparent 70%)`,pointerEvents:"none",filter:"blur(4px)",animation:"flicker 3.2s linear infinite"}}/>
              <div style={{display:"flex",gap:14,alignItems:"center",position:"relative"}}>
                <div style={{fontSize:38,filter:"drop-shadow(0 2px 6px rgba(180,200,255,.4))"}}>✧</div>
                <div style={{flex:1}}>
                  <div style={{...FR,fontWeight:800,fontSize:22,marginBottom:3,letterSpacing:-.3,color:t.text}}>The Shrine</div>
                  <div style={{...mu,fontSize:12,fontStyle:"italic"}}>Forge artefacts from coins of like metal — vessels for the long ages.</div>
                </div>
                <div style={{...F,fontSize:13,fontWeight:800,color:t.accent,letterSpacing:.5,fontVariantNumeric:"tabular-nums",display:"flex",alignItems:"center",gap:4,padding:"6px 11px",background:"rgba(212,160,23,.1)",border:`1px solid ${t.borderHi}`,borderRadius:8}}>◈ {marks.toLocaleString()}</div>
              </div>
            </div>

            {/* Sub-tab: Forge / Collection */}
            <div style={{display:"flex",gap:6,marginBottom:14,padding:4,borderRadius:11,background:t.surface,border:`1px solid ${t.border}`}}>
              {[["forge","⚒","Forge"],["collection","✧",`Collection · ${artefacts.length}`]].map(([id,ic,lbl])=>{const active=shrineView===id;return(
                <button key={id} onClick={()=>setShrineView(id)} style={{flex:1,padding:"9px 0",borderRadius:8,border:"none",background:active?`linear-gradient(135deg,${t.accentHi},${t.accent})`:"transparent",cursor:"pointer",...F,fontSize:11,fontWeight:800,color:active?t.accentInk:t.muted,letterSpacing:1.5,textTransform:"uppercase",transition:"all .18s",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><span style={{fontSize:13}}>{ic}</span>{lbl}</button>
              );})}
            </div>

            {shrineView==="forge"&&(()=>{
              // Group unlocked coins by metal so the player can see what they can forge
              const grouped={};
              for(const c of coins){
                if(c.locked)continue;
                if(!grouped[c.metalIdx])grouped[c.metalIdx]=[];
                grouped[c.metalIdx].push(c);
              }
              const metalsWithEnough=Object.entries(grouped).filter(([,arr])=>arr.length>=5).map(([m])=>+m);
              return(
                <div style={{animation:"fadein .25s ease"}}>
                  <div style={{...mu,fontSize:12,marginBottom:12,fontStyle:"italic",padding:"0 2px"}}>Combine 5 coins of the same metal to forge an artefact. Higher rarity coins yield finer grades.</div>
                  {coins.filter(c=>!c.locked).length<5?(
                    <div style={{...card,padding:"24px 18px",textAlign:"center"}}>
                      <div style={{fontSize:34,marginBottom:10,opacity:.5}}>✧</div>
                      <div style={{...FR,fontSize:15,fontWeight:700,marginBottom:6}}>Not enough coins</div>
                      <div style={{...mu,fontSize:12,maxWidth:260,margin:"0 auto",lineHeight:1.5}}>You need at least 5 unlocked coins of the same metal to forge.</div>
                    </div>
                  ):metalsWithEnough.length===0?(
                    <div style={{...card,padding:"24px 18px",textAlign:"center"}}>
                      <div style={{fontSize:34,marginBottom:10,opacity:.5}}>✧</div>
                      <div style={{...FR,fontSize:15,fontWeight:700,marginBottom:6}}>Spread too thin</div>
                      <div style={{...mu,fontSize:12,maxWidth:280,margin:"0 auto",lineHeight:1.5}}>You have unlocked coins, but no metal with 5 of the same kind yet. Keep hunting!</div>
                    </div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {metalsWithEnough.map(metalIdx=>{
                        const m=METALS[metalIdx];
                        const arr=grouped[metalIdx];
                        const def=ARTEFACTS[metalIdx];
                        const baseCost=ARTEFACT_FORGE_COST[metalIdx];
                        const cost=Math.max(1,Math.round(baseCost*(1-(buff.forgeDiscount||0))));
                        const discounted=cost<baseCost;
                        const canAfford=marks>=cost;
                        return(
                          <div key={metalIdx} style={{...card,padding:"14px 16px",border:`1px solid ${m.eng}55`}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10}}>
                              <div style={{display:"flex",alignItems:"center",gap:11,minWidth:0,flex:1}}>
                                <div style={{width:42,height:42,borderRadius:10,background:isDark?`linear-gradient(135deg,${m.dark},${m.mid})`:`linear-gradient(135deg,${m.mid},${m.base})`,border:`1px solid ${m.eng}88`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:m.hl,flexShrink:0,fontFamily:"'Fraunces',serif",overflow:"hidden"}}>{def.art?<img src={`/artefacts/${def.art}.webp`} alt={def.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:def.icon}</div>
                                <div style={{minWidth:0,flex:1}}>
                                  <div style={{...FR,fontWeight:700,fontSize:15,letterSpacing:-.2}}>{def.name}</div>
                                  <div style={{...mu,fontSize:11,fontStyle:"italic",marginTop:1}}>{m.name} · {arr.length} available</div>
                                </div>
                              </div>
                            </div>
                            <button onClick={()=>setShrinePicker({metalIdx,available:arr})} disabled={!canAfford} style={{width:"100%",padding:"10px 0",borderRadius:8,border:`1px solid ${canAfford?m.eng:t.border}`,background:canAfford?`linear-gradient(135deg,${m.dark}80,${m.mid}90)`:t.surfaceHi,cursor:canAfford?"pointer":"not-allowed",...F,fontSize:11,fontWeight:800,color:canAfford?m.hl:t.muted,letterSpacing:1.5,textTransform:"uppercase"}}>{canAfford?`Forge · ◈ ${cost.toLocaleString()}${discounted?" ✦":""}`:`Need ◈ ${cost.toLocaleString()}`}</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {shrineView==="collection"&&(
              <div style={{animation:"fadein .25s ease"}}>
                <div style={{...mu,fontSize:12,marginBottom:12,fontStyle:"italic",padding:"0 2px"}}>Forged artefacts. Future updates will let these grant passive effects, unlock avatars, or summon companions.</div>
                {artefacts.length===0?(
                  <div style={{...card,padding:"32px 18px",textAlign:"center"}}>
                    <div style={{fontSize:38,marginBottom:12,opacity:.4}}>✧</div>
                    <div style={{...FR,fontSize:15,fontWeight:700,marginBottom:6}}>No artefacts yet</div>
                    <div style={{...mu,fontSize:12,maxWidth:260,margin:"0 auto",lineHeight:1.5}}>Visit the Forge tab here to combine coins into your first relic.</div>
                  </div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:9}}>
                    {artefacts.map(a=>{
                      const m=METALS[a.metal];const def=ARTEFACTS[a.metal];const g=ARTEFACT_GRADES[a.grade]||ARTEFACT_GRADES[0];
                      return(
                        <div key={a.id} style={{...card,padding:0,textAlign:"center",border:`1px solid ${g.color}55`,borderTop:`2px solid ${g.color}`,position:"relative",background:"#0a0604",boxShadow:`0 0 0 1px ${g.color}22, 0 0 14px ${g.color}22`,overflow:"hidden",display:"flex",flexDirection:"column"}}>
                          {def.art?(
                            <div style={{aspectRatio:"280/254",width:"100%",position:"relative",background:`radial-gradient(ellipse at center,${m.dark}40,#000)`}}>
                              <img src={`/artefacts/${def.art}.webp`} alt={def.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                            </div>
                          ):(
                            <div style={{aspectRatio:"280/254",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:isDark?`radial-gradient(circle,${m.mid},${m.dark})`:`radial-gradient(circle,${m.base},${m.mid})`,fontSize:48,color:m.hl,fontFamily:"'Fraunces',serif",textShadow:`0 0 20px ${m.hl}88`}}>{def.icon}</div>
                          )}
                          <div style={{padding:"8px 6px 9px",borderTop:`1px solid ${g.color}33`,background:"linear-gradient(to bottom,#15100d,#0a0604)"}}>
                            <div style={{...FR,fontSize:11,fontWeight:700,lineHeight:1.2,letterSpacing:-.1,color:"#e8d8a0"}}>{def.name}</div>
                            <div style={{...microLabel,fontSize:7.5,marginTop:3,color:g.color,fontWeight:800,letterSpacing:1.5}}>{g.name}</div>
                            <div style={{...microLabel,fontSize:7,marginTop:1,color:m.hl,opacity:.55}}>{m.name}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAVERN ─── */}
        {tab==="tavern"&&(
          <div style={{animation:"fadein .35s ease"}}>
            <div style={{margin:"-18px -14px 16px",padding:"36px 22px 20px",background:isDark?"linear-gradient(to bottom,#0e0604 0%,#1a0a04 40%,transparent 100%)":"linear-gradient(to bottom,#f0d8a8 0%,#e8c898 40%,transparent 100%)",position:"relative",overflow:"hidden",borderBottom:`1px solid ${isDark?"rgba(180,80,20,.18)":"rgba(180,80,20,.2)"}`}}>
              <div style={{position:"absolute",bottom:0,left:"15%",width:90,height:90,borderRadius:"50%",background:`radial-gradient(circle,${isDark?"rgba(220,90,15,.32)":"rgba(220,90,15,.3)"},transparent 70%)`,pointerEvents:"none",filter:"blur(2px)",animation:"flicker 2s linear infinite"}}/>
              <div style={{position:"absolute",bottom:0,right:"18%",width:70,height:70,borderRadius:"50%",background:`radial-gradient(circle,${isDark?"rgba(220,90,15,.26)":"rgba(220,90,15,.24)"},transparent 70%)`,pointerEvents:"none",filter:"blur(2px)",animation:"flicker 1.6s linear infinite"}}/>
              <div style={{display:"flex",gap:14,alignItems:"center",position:"relative"}}>
                <div style={{fontSize:40,filter:"drop-shadow(0 2px 6px rgba(220,90,15,.4))"}}>🍺</div>
                <div style={{flex:1}}>
                  <div style={{...FR,fontWeight:800,fontSize:22,marginBottom:3,letterSpacing:-.3,color:t.text}}>The Tavern</div>
                  <div style={{...mu,fontSize:12,fontStyle:"italic"}}>Trade with the merchant. Wager with the dealer. Mend your pickaxe.</div>
                </div>
                <div style={{...F,fontSize:13,fontWeight:800,color:t.accent,letterSpacing:.5,fontVariantNumeric:"tabular-nums",display:"flex",alignItems:"center",gap:4,padding:"6px 11px",background:"rgba(212,160,23,.1)",border:`1px solid ${t.borderHi}`,borderRadius:8}}>◈ {marks.toLocaleString()}</div>
              </div>
            </div>

            {/* Top-level view switcher */}
            <div style={{display:"flex",gap:6,marginBottom:14,padding:4,borderRadius:11,background:t.surface,border:`1px solid ${t.border}`}}>
              {[["shop","◈","Shop"],["wager","🎲","Wager"],["repair","⚒","Repair"]].map(([id,ic,lbl])=>{const active=tavernView===id;return(
                <button key={id} onClick={()=>setTavernView(id)} style={{flex:1,padding:"9px 0",borderRadius:8,border:"none",background:active?`linear-gradient(135deg,${t.accentHi},${t.accent})`:"transparent",cursor:"pointer",...F,fontSize:11,fontWeight:800,color:active?t.accentInk:t.muted,letterSpacing:1.5,textTransform:"uppercase",transition:"all .18s",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><span style={{fontSize:13}}>{ic}</span>{lbl}</button>
              );})}
            </div>

            {/* ── SHOP VIEW ── */}
            {tavernView==="shop"&&(
              <div style={{animation:"fadein .25s ease"}}>
                {/* Shop sub-tab picker */}
                <div style={{display:"flex",gap:5,marginBottom:12,padding:3,borderRadius:9,background:t.surfaceHi,border:`1px solid ${t.border}`}}>
                  {[["tarot","🃏","Tarot"],["banners","🖼","Banners"],["titles","✦","Titles"]].map(([id,ic,lbl])=>{const active=shopTab===id;return(
                    <button key={id} onClick={()=>setShopTab(id)} style={{flex:1,padding:"7px 0",borderRadius:7,border:"none",background:active?(isDark?"#2a1a08":"#f0e0c0"):"transparent",cursor:"pointer",...F,fontSize:10,fontWeight:800,color:active?t.accent:t.muted,letterSpacing:1.5,textTransform:"uppercase",transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><span style={{fontSize:12}}>{ic}</span>{lbl}</button>
                  );})}
                </div>

                {/* ── TAROT SUB-TAB ── */}
                {shopTab==="tarot"&&(<>
                <div style={{...mu,fontSize:12,marginBottom:12,fontStyle:"italic",padding:"0 2px"}}>Tarot cards grant a single, build-defining effect while equipped. Maximum 2 active at a time — choose carefully. One copy each.</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10}}>
                  {TAROT_CARDS.map(card=>{
                    const owned=ownedTarots.includes(card.id);
                    const equipped=equippedTarots.includes(card.id);
                    const canBuy=!owned&&marks>=card.price;
                    return(
                      <div key={card.id} style={{display:"flex",flexDirection:"column",gap:7}}>
                        <TarotCard card={card} owned={owned} equipped={equipped} t={t} onClick={owned?()=>toggleTarot(card.id):canBuy?()=>{if(confirm(`Purchase ${card.title} for ◈${card.price}?`))buyTarot(card.id);}:undefined}/>
                        <div style={{...F,fontSize:10,color:t.textDim,lineHeight:1.4,fontStyle:"italic",textAlign:"center",minHeight:28}}>{card.desc}</div>
                        {!owned?(
                          <button onClick={()=>{if(canBuy&&confirm(`Purchase ${card.title} for ◈${card.price}?`))buyTarot(card.id);}} disabled={!canBuy} style={{padding:"7px 0",borderRadius:8,border:`1px solid ${canBuy?t.accent:t.border}`,background:canBuy?`linear-gradient(135deg,${t.accentHi},${t.accent})`:t.surfaceHi,cursor:canBuy?"pointer":"not-allowed",...F,fontSize:11,fontWeight:800,color:canBuy?t.accentInk:t.muted,letterSpacing:1,textTransform:"uppercase",fontVariantNumeric:"tabular-nums"}}>◈ {card.price.toLocaleString()}</button>
                        ):(
                          <button onClick={()=>toggleTarot(card.id)} disabled={!equipped&&equippedTarots.length>=MAX_EQUIPPED_TAROTS} style={{padding:"7px 0",borderRadius:8,border:`1px solid ${equipped?t.success:(equippedTarots.length>=MAX_EQUIPPED_TAROTS?t.border:t.borderHi)}`,background:equipped?(isDark?"#0e2810":"#e8f8ee"):t.surfaceHi,cursor:(!equipped&&equippedTarots.length>=MAX_EQUIPPED_TAROTS)?"not-allowed":"pointer",...F,fontSize:11,fontWeight:800,color:equipped?t.success:(equippedTarots.length>=MAX_EQUIPPED_TAROTS?t.muted:t.textDim),letterSpacing:1,textTransform:"uppercase"}}>{equipped?"✓ Equipped":(equippedTarots.length>=MAX_EQUIPPED_TAROTS?"Slots Full":"Equip")}</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                </>)}

                {/* ── BANNERS SUB-TAB ── */}
                {shopTab==="banners"&&(<>
                <div style={{...mu,fontSize:12,marginBottom:12,fontStyle:"italic",padding:"0 2px"}}>Premium banners — once owned, equip them in your Profile. Standard frames are XP-unlocked separately.</div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {Object.entries(FRAMES).filter(([,f])=>f.premium).map(([id,f])=>{
                    const owned=ownedFrames.includes(id);
                    const equipped=frame===id;
                    const lvlMet=level>=f.minLvl;
                    const canBuy=!owned&&lvlMet&&marks>=f.price;
                    return(
                      <div key={id} style={{borderRadius:12,overflow:"hidden",border:`1px solid ${equipped?f.accent:t.border}`,background:t.surface,boxShadow:equipped?`0 0 14px ${f.accent}55`:"none"}}>
                        <div style={{height:120,...bannerStyle(id),position:"relative",filter:owned?"none":"grayscale(.4) brightness(.75)"}}>
                          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 30%,rgba(0,0,0,.55) 100%)"}}/>
                          <div style={{position:"absolute",bottom:8,left:12,right:12,display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:10}}>
                            <div>
                              <div style={{...FR,fontWeight:800,fontSize:18,color:"#fff",letterSpacing:-.3,textShadow:"0 2px 6px rgba(0,0,0,.8)"}}>{f.lbl}</div>
                              <div style={{...F,fontSize:10,color:"#e0d0a0",fontStyle:"italic",letterSpacing:.3,textShadow:"0 1px 3px rgba(0,0,0,.9)"}}>{f.desc}</div>
                            </div>
                            <div style={{...F,fontSize:9,fontWeight:700,color:lvlMet?"#fff":"#f0a060",background:"rgba(0,0,0,.55)",padding:"3px 8px",borderRadius:5,letterSpacing:1.5,textTransform:"uppercase",whiteSpace:"nowrap"}}>Lv {f.minLvl}+</div>
                          </div>
                        </div>
                        <div style={{padding:"10px 12px"}}>
                          {!owned?(
                            <button onClick={()=>{if(canBuy&&confirm(`Purchase ${f.lbl} banner for ◈${f.price}?`))buyFrame(id);}} disabled={!canBuy} style={{width:"100%",padding:"9px 0",borderRadius:8,border:`1px solid ${canBuy?t.accent:t.border}`,background:canBuy?`linear-gradient(135deg,${t.accentHi},${t.accent})`:t.surfaceHi,cursor:canBuy?"pointer":"not-allowed",...F,fontSize:11,fontWeight:800,color:canBuy?t.accentInk:t.muted,letterSpacing:1.5,textTransform:"uppercase"}}>{!lvlMet?`Reach Lv ${f.minLvl}`:marks<f.price?`Need ◈ ${f.price.toLocaleString()}`:`Purchase · ◈ ${f.price.toLocaleString()}`}</button>
                          ):equipped?(
                            <div style={{...F,fontSize:11,fontWeight:800,color:t.success,textAlign:"center",letterSpacing:1.5,textTransform:"uppercase",padding:"9px 0"}}>✓ Currently equipped</div>
                          ):(
                            <button onClick={()=>setFrame(id)} style={{width:"100%",padding:"9px 0",borderRadius:8,border:`1px solid ${t.borderHi}`,background:t.surfaceHi,cursor:"pointer",...F,fontSize:11,fontWeight:800,color:t.text,letterSpacing:1.5,textTransform:"uppercase"}}>Equip</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>)}

                {/* ── TITLES SUB-TAB ── */}
                {shopTab==="titles"&&(<>
                <div style={{...mu,fontSize:12,marginBottom:12,fontStyle:"italic",padding:"0 2px"}}>Premium titles with animated text effects. Equip in your Profile after purchase.</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {PREMIUM_TITLES.map(ti=>{
                    const owned=ownedTitles.includes(ti.id);
                    const equipped=selectedTitle===ti.label;
                    const lvlMet=level>=ti.minLvl;
                    const canBuy=!owned&&lvlMet&&marks>=ti.price;
                    return(
                      <div key={ti.id} style={{...card,padding:"14px 16px",border:`1px solid ${equipped?t.accent:t.border}`,boxShadow:equipped?`0 0 12px ${t.accent}33`:"none"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:10}}>
                          <div style={{minWidth:0,flex:1}}>
                            <div style={{...FR,fontSize:18,letterSpacing:-.2,marginBottom:4}}><span className={`title-${ti.effect}`}>{ti.label}</span></div>
                            <div style={{...F,fontSize:10,color:t.muted,letterSpacing:1.5,textTransform:"uppercase",fontWeight:700}}>Lv {ti.minLvl}+ · ◈ {ti.price.toLocaleString()}</div>
                          </div>
                        </div>
                        {!owned?(
                          <button onClick={()=>{if(canBuy&&confirm(`Purchase title "${ti.label}" for ◈${ti.price}?`))buyTitle(ti.id);}} disabled={!canBuy} style={{width:"100%",padding:"8px 0",borderRadius:7,border:`1px solid ${canBuy?t.accent:t.border}`,background:canBuy?`linear-gradient(135deg,${t.accentHi},${t.accent})`:t.surfaceHi,cursor:canBuy?"pointer":"not-allowed",...F,fontSize:10,fontWeight:800,color:canBuy?t.accentInk:t.muted,letterSpacing:1.5,textTransform:"uppercase"}}>{!lvlMet?`Reach Lv ${ti.minLvl}`:marks<ti.price?`Need ◈ ${ti.price.toLocaleString()}`:`Purchase`}</button>
                        ):equipped?(
                          <div style={{...F,fontSize:10,fontWeight:800,color:t.success,textAlign:"center",letterSpacing:1.5,textTransform:"uppercase",padding:"8px 0"}}>✓ Currently equipped</div>
                        ):(
                          <button onClick={()=>setSelectedTitle(ti.label)} style={{width:"100%",padding:"8px 0",borderRadius:7,border:`1px solid ${t.borderHi}`,background:t.surfaceHi,cursor:"pointer",...F,fontSize:10,fontWeight:800,color:t.text,letterSpacing:1.5,textTransform:"uppercase"}}>Equip</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                </>)}
              </div>
            )}

            {/* ── REPAIR VIEW ── */}
            {tavernView==="repair"&&(()=>{
              const missing=maxDur-shovelDur;
              const cost=repairCost(missing,shovelLevel);
              const canRepair=missing>0&&marks>=cost;
              const durPct=Math.round((shovelDur/maxDur)*100);
              return(
                <div style={{animation:"fadein .25s ease",display:"flex",flexDirection:"column",gap:14}}>
                  <div style={{...card,padding:"18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
                      <div style={{width:54,height:54,background:`linear-gradient(135deg,${t.surfaceHi},${t.surface})`,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${t.borderHi}`}}><ShovelIcon level={shovelLevel} size={40}/></div>
                      <div style={{flex:1}}>
                        <div style={{...FR,fontWeight:700,fontSize:16,letterSpacing:-.2,color:t.text}}>{SHOVEL_UPS[shovelLevel]?.label||`Shovel Lv.${shovelLevel}`}</div>
                        <div style={{...mu,fontSize:11,marginTop:2}}>Durability {shovelDur} / {maxDur}</div>
                      </div>
                      <div style={{...FR,fontWeight:800,fontSize:24,color:durPct>50?t.success:durPct>20?t.accent:t.danger,letterSpacing:-1,fontVariantNumeric:"tabular-nums"}}>{durPct}%</div>
                    </div>
                    <div style={{height:9,background:t.faint,borderRadius:4,overflow:"hidden",border:`1px solid ${t.border}`,marginBottom:14}}>
                      <div style={{width:`${durPct}%`,height:"100%",background:durPct>50?`linear-gradient(to right,${t.success},#a0e0a0)`:durPct>20?`linear-gradient(to right,${t.accentDim},${t.accent})`:`linear-gradient(to right,#8a2010,${t.danger})`,transition:"width .4s",boxShadow:`0 0 8px ${durPct>50?t.success:durPct>20?t.accent:t.danger}55`}}/>
                    </div>
                    {missing===0?(
                      <div style={{...F,fontSize:13,color:t.success,fontWeight:700,textAlign:"center",padding:"10px 0",letterSpacing:1.5,textTransform:"uppercase"}}>✦ Pickaxe Pristine</div>
                    ):(
                      <button onClick={()=>{if(canRepair)repairPickaxe();}} disabled={!canRepair} style={{width:"100%",padding:"12px 0",borderRadius:10,border:`1px solid ${canRepair?t.accent:t.border}`,cursor:canRepair?"pointer":"not-allowed",background:canRepair?`linear-gradient(135deg,${t.accentHi},${t.accent})`:t.surfaceHi,...F,fontWeight:800,fontSize:13,color:canRepair?t.accentInk:t.muted,letterSpacing:2,textTransform:"uppercase"}}>
                        {canRepair?`⚒ Repair · ◈ ${cost.toLocaleString()}`:marks<cost?`Need ◈ ${cost.toLocaleString()}`:`Repair · ◈ ${cost.toLocaleString()}`}
                      </button>
                    )}
                    <div style={{...mu,fontSize:11,marginTop:10,fontStyle:"italic",textAlign:"center"}}>Each dig consumes 1 durability. The Hierophant tarot halves it.</div>
                  </div>

                  {/* Broken-pickaxe last-resort replacement — only visible when shovel is broken.
                      Lets a soft-locked player buy a fresh Lv1 pickaxe at fixed cost. */}
                  {shovelDur<=0&&(
                    <div style={{...card,padding:"14px 16px",border:`1px dashed ${t.danger}66`,background:isDark?"#1a0606":"#fff0ec"}}>
                      <div style={{...FR,fontWeight:700,fontSize:14,marginBottom:6,color:t.danger,letterSpacing:-.2}}>Pickaxe Broken</div>
                      <div style={{...mu,fontSize:12,fontStyle:"italic",lineHeight:1.5,marginBottom:10}}>Stuck without enough marks to repair? Buy a fresh Lv1 pickaxe — resets your shovel level and refills durability.</div>
                      <button onClick={()=>{if(marks>=NEW_PICKAXE_COST&&confirm(`Buy a fresh Lv1 pickaxe for ◈${NEW_PICKAXE_COST}? Your shovel level will reset to 1.`))buyNewPickaxe();}} disabled={marks<NEW_PICKAXE_COST} style={{width:"100%",padding:"10px 0",borderRadius:9,border:`1px solid ${marks>=NEW_PICKAXE_COST?t.danger:t.border}`,cursor:marks>=NEW_PICKAXE_COST?"pointer":"not-allowed",background:marks>=NEW_PICKAXE_COST?(isDark?"linear-gradient(135deg,#3a1010,#5a1818)":"linear-gradient(135deg,#fbe8e8,#f0c4c4)"):t.surfaceHi,...F,fontWeight:800,fontSize:12,color:marks>=NEW_PICKAXE_COST?(isDark?"#ffb0a0":t.danger):t.muted,letterSpacing:2,textTransform:"uppercase"}}>
                        ⛏ Buy New Pickaxe · ◈ {NEW_PICKAXE_COST}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── WAGER VIEW (existing UI) ── */}
            {tavernView==="wager"&&(<>
            <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
              {[["toss","🪙","Coin Toss"],["roulette","🎰","Roulette"]].map(([id,ic,lbl])=>{const active=gambMode===id;return(
                <button key={id} onClick={()=>{setGambMode(id);resetGamble();resetRoulette();}} style={{padding:"9px 15px",borderRadius:10,border:`1px solid ${active?t.oxbloodHi:t.border}`,background:active?(isDark?"linear-gradient(135deg,#1a0810,#2a1018)":"linear-gradient(135deg,#f8eef3,#f0d8e0)"):"transparent",...F,fontSize:12,fontWeight:700,color:active?t.oxbloodHi:t.muted,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,letterSpacing:.5,display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}><span style={{fontSize:14}}>{ic}</span>{lbl}</button>
              );})}
            </div>

            {(gambMode==="toss")&&(()=>{
              const gDef=GAMBLES.find(g=>g.id===gambMode);
              return(<>
                <div style={{...card,padding:"13px 16px",marginBottom:12,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:120}}>
                    <div style={{...FR,fontWeight:700,fontSize:15,marginBottom:3,letterSpacing:-.3}}>{gDef.label}</div>
                    <div style={{...mu,fontSize:12,fontStyle:"italic"}}>{gDef.desc}</div>
                  </div>
                  <div style={{...VT,fontSize:22,color:t.oxbloodHi,letterSpacing:1,textShadow:`0 0 8px ${t.oxbloodHi}44`}}>{gDef.odds}</div>
                </div>
                {gambPhase==="result"&&gambResult&&(
                  <div style={{...card,marginBottom:12,padding:"15px 17px",background:gambResult.won?(isDark?"#0a1e0a":"#f0faf0"):(isDark?"#1a0808":"#fff5f5"),border:`1px solid ${gambResult.won?t.success:t.danger}`,animation:"fadein .35s ease"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                      {gambResult.add[0]&&<div style={{animation:"winPop .55s ease-out"}}><CoinCanvas coin={gambResult.add[0]} size={68}/></div>}
                      <div style={{flex:1,minWidth:120}}>
                        <div style={{...VT,fontSize:24,color:gambResult.won?t.success:t.danger,letterSpacing:2,lineHeight:1,marginBottom:5,textShadow:`0 0 10px ${gambResult.won?t.success:t.danger}44`}}>{gambResult.msg}</div>
                        {gambResult.add[0]&&<div style={{...mu,fontSize:12,color:METALS[gambResult.add[0].metalIdx].hl,fontWeight:600}}>{METALS[gambResult.add[0].metalIdx].name} · {gambResult.add[0].runes}</div>}
                      </div>
                      <button onClick={resetGamble} style={{padding:"8px 16px",borderRadius:9,border:`1px solid ${t.borderHi}`,background:t.surfaceHi,cursor:"pointer",...F,fontSize:11,fontWeight:700,color:t.textDim,letterSpacing:1.5,textTransform:"uppercase"}}>Again</button>
                    </div>
                  </div>
                )}
                {gambPhase==="spinning"&&<div style={{...card,padding:"28px",textAlign:"center",marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:14}}>{betCoins.map(c=><CoinCanvas key={c.id} coin={c} size={62}/>)}</div>
                  <div style={{...VT,fontSize:22,color:t.oxbloodHi,animation:"rarityFlash .6s ease-in-out infinite",letterSpacing:2,textShadow:`0 0 10px ${t.oxbloodHi}44`}}>THE FATES DECIDE…</div>
                </div>}
                {gambPhase==="select"&&(<>
                  <div style={{...mu,fontSize:12,marginBottom:11,fontStyle:"italic"}}>Select {gDef.count} coin{gDef.count>1?"s":""}{gDef.same?" (same tier)":""} · <span style={{color:t.text,fontWeight:600,fontStyle:"normal"}}>{betIds.length} / {gDef.count}</span></div>
                  {coins.length===0?<div style={{...card,padding:"32px 20px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:10,opacity:.4}}>🪙</div><div style={{...mu}}>No coins to bet — visit the Hunt first.</div></div>:(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:14}}>
                      {coins.map(coin=>{const m=METALS[coin.metalIdx];const sel=betIds.includes(coin.id);const lk=coin.locked;return(
                        <div key={coin.id} onClick={()=>!lk&&toggleBet(coin.id)} style={{...card,padding:"9px 6px 7px",textAlign:"center",cursor:lk?"not-allowed":"pointer",border:`1.5px solid ${sel?m.hl:t.border}`,background:sel?`${m.dark}40`:t.surface,transition:"all .12s",opacity:lk?.4:1,position:"relative"}} onMouseEnter={e=>{if(!lk)e.currentTarget.style.borderColor=m.eng;}} onMouseLeave={e=>e.currentTarget.style.borderColor=sel?m.hl:t.border}>
                          <div style={{display:"flex",justifyContent:"center",marginBottom:5}}><CoinCanvas coin={coin} size={52}/></div>
                          <div style={{...VT,fontSize:12,color:m.hl,letterSpacing:1.5}}>{coin.runes.slice(0,4)}</div>
                          {lk&&<div style={{position:"absolute",top:4,right:5,fontSize:10}}>🔒</div>}
                        </div>
                      );})}
                    </div>
                  )}
                  <button onClick={doGamble} disabled={!gambOk} style={{width:"100%",padding:"13px 0",borderRadius:11,border:`1px solid ${gambOk?t.oxblood:t.border}`,cursor:gambOk?"pointer":"not-allowed",background:gambOk?"linear-gradient(135deg,#2a0818,#7a1838)":t.surfaceHi,...F,fontWeight:800,fontSize:14,color:gambOk?"#f0a0c0":t.muted,letterSpacing:3,textTransform:"uppercase",boxShadow:gambOk?"0 6px 18px rgba(122,24,56,.3)":"none"}}>{gambOk?"🎲 Wager":"Select coins"}</button>
                </>)}
              </>);
            })()}

            {gambMode==="roulette"&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
                <div style={{...card,padding:"11px 14px",width:"100%"}}>
                  <div style={{...microLabel,fontSize:9,marginBottom:7}}>Outcome Table</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {WSECTORS.map(s=><div key={s.outcome} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:5,background:`${s.color}cc`,border:`1px solid ${s.text}33`}}><span style={{...F,fontSize:10,color:s.text,fontWeight:700,letterSpacing:.5}}>{s.label} · {s.weight}%</span></div>)}
                  </div>
                </div>
                {roulResult&&(
                  <div style={{...card,padding:"15px 17px",width:"100%",background:roulResult.won?(isDark?"#0a1e0a":"#f0faf0"):(isDark?"#1a0808":"#fff5f5"),border:`1px solid ${roulResult.won?t.success:t.danger}`,animation:"fadein .35s ease"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                      {roulResult.add.map((c,i)=><div key={i} style={{animation:"winPop .55s ease-out"}}><CoinCanvas coin={c} size={64}/></div>)}
                      <div style={{flex:1,minWidth:120}}>
                        <div style={{...VT,fontSize:22,color:roulResult.won?t.success:t.danger,letterSpacing:2,lineHeight:1,marginBottom:5,textShadow:`0 0 10px ${roulResult.won?t.success:t.danger}44`}}>{roulResult.msg}</div>
                        {roulResult.add.map((c,i)=><div key={i} style={{...mu,fontSize:12,color:METALS[c.metalIdx].hl,fontWeight:600}}>{METALS[c.metalIdx].name} · {c.runes}</div>)}
                      </div>
                      <button onClick={resetRoulette} style={{padding:"8px 14px",borderRadius:9,border:`1px solid ${t.borderHi}`,background:t.surfaceHi,cursor:"pointer",...F,fontSize:11,fontWeight:700,color:t.textDim,letterSpacing:1.5,textTransform:"uppercase"}}>Again</button>
                    </div>
                  </div>
                )}
                <div style={{width:"100%"}}>
                  <div style={{...mu,fontSize:12,marginBottom:9,fontStyle:"italic"}}>Select 1 coin to bet:</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                    {coins.slice(0,20).map(coin=>{const m=METALS[coin.metalIdx];const sel=roulBetId===coin.id;const lk=coin.locked;return(
                      <div key={coin.id} onClick={()=>{if(lk)return;setRoulBetId(sel?null:coin.id);}} style={{padding:"5px",borderRadius:7,border:`1.5px solid ${sel?m.hl:t.border}`,background:sel?`${m.dark}40`:t.surface,cursor:lk?"not-allowed":"pointer",transition:"all .12s",opacity:lk?.4:1,position:"relative"}}>
                        <CoinCanvas coin={coin} size={44}/>
                        {lk&&<div style={{position:"absolute",top:1,right:2,fontSize:9}}>🔒</div>}
                      </div>
                    );})}
                    {coins.length===0&&<div style={{...mu,fontSize:12,fontStyle:"italic"}}>No coins — go hunt first!</div>}
                  </div>
                </div>
                <RouletteWheel betCoin={roulBetCoin} onResult={onRoulResult} disabled={roulDone} t={t}/>
              </div>
            )}
            </>)}
          </div>
        )}
      </div>

      <BottomNav tab={tab} setTab={setTab} huntActive={phase==="dig"||phase==="brush"} t={t}/>

      <LuckyFanfare show={showLucky} onDone={()=>setShowLucky(false)}/>
      {/* Flying scrap animation — fixed-position overlay, one element per dug cell.
          Each flyer arcs from cell origin toward the marks counter, with floating
          "+◈ N scrap" text near the origin. Timing is tuned so marks ticker fires
          ~75% through the flight (700ms) and the element vanishes at 1000ms. */}
      {scrapFlyers.length>0&&(
        <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:170}}>
          {scrapFlyers.map(f=>(
            <div key={f.id}>
              <div style={{position:"fixed",left:f.startX,top:f.startY,fontSize:22,filter:"drop-shadow(0 2px 6px rgba(0,0,0,.7))",animation:"scrapFly 1s cubic-bezier(.45,.05,.55,.95) forwards",pointerEvents:"none",willChange:"transform",["--dx"]:`${f.dx}px`,["--dy"]:`${f.dy}px`}}>⚙</div>
              <div style={{position:"fixed",left:f.startX,top:f.startY-8,...F,fontSize:13,fontWeight:800,color:"#f0c850",letterSpacing:.5,textShadow:"0 1px 4px rgba(0,0,0,.85),0 0 10px rgba(212,160,23,.6)",pointerEvents:"none",animation:"scrapText .85s ease-out forwards",whiteSpace:"nowrap"}}>
                Scrap +◈{f.amount}
              </div>
            </div>
          ))}
        </div>
      )}
      {phase==="banner"&&foundCoin&&<RevealBanner coin={foundCoin} onDone={onBannerDone}/>}
      {selectedCoin&&<CoinModal coin={coins.find(c=>c.id===selectedCoin.id)||selectedCoin} onClose={()=>setSelectedCoin(null)} onToggleLock={toggleLock} onSell={sellCoin} t={t} isDark={isDark}/>}

      {/* Cabinet slot picker — opens when an empty cabinet slot is tapped.
          Shows all coins, tapping one assigns it to the slot. */}
      {pickerSlot!==null&&(
        <div onClick={()=>setPickerSlot(null)} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.7)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadein .18s ease",padding:"24px 12px"}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:520,maxHeight:"80vh",background:t.surface,border:`1px solid ${t.borderHi}`,borderRadius:16,boxShadow:"0 -12px 40px rgba(0,0,0,.6)",display:"flex",flexDirection:"column",animation:"slideUp .25s cubic-bezier(.2,.8,.3,1)"}}>
            <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{...FR,fontWeight:800,fontSize:16,letterSpacing:-.2,color:t.text}}>Choose a coin</div>
                <div style={{...mu,fontSize:11,marginTop:2,fontStyle:"italic"}}>Slot {pickerSlot+1} · {coins.length} coins available</div>
              </div>
              <button onClick={()=>setPickerSlot(null)} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${t.border}`,background:t.surfaceHi,cursor:"pointer",...F,fontSize:14,color:t.muted,padding:0,lineHeight:1}}>×</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"12px"}}>
              {coins.length===0?(
                <div style={{...mu,fontSize:13,fontStyle:"italic",textAlign:"center",padding:"32px 0"}}>No coins yet — go hunt some!</div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(82px,1fr))",gap:7}}>
                  {[...coins].sort((a,b)=>b.metalIdx-a.metalIdx||(b.shiny?1:0)-(a.shiny?1:0)).map(c=>{
                    const m=METALS[c.metalIdx];
                    const alreadyPinned=pinnedIds?.includes(c.id);
                    return(
                      <button key={c.id} onClick={()=>pinToSlot(pickerSlot,c.id)} className={c.shiny?"shiny-card":""} style={{position:"relative",padding:"8px 4px 5px",borderRadius:9,border:`1px solid ${alreadyPinned?t.accent:m.eng+"40"}`,background:isDark?`linear-gradient(160deg,${m.dark}30,${t.surface})`:t.surface,cursor:"pointer",transition:"transform .12s, border-color .12s",overflow:"visible"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=t.borderHi;}} onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor=alreadyPinned?t.accent:m.eng+"40";}}>
                        {c.shiny&&<div className="shiny-aura"/>}
                        {c.metalIdx>=7&&<div className={`ambient-particles ${c.metalIdx===8?"astral":"eldritch"}`}><span/><span/><span/></div>}
                        {alreadyPinned&&<div style={{position:"absolute",top:3,right:3,...F,fontSize:7,fontWeight:800,letterSpacing:1,color:t.accent,background:`${t.surface}dd`,padding:"1px 4px",borderRadius:3,zIndex:2}}>PINNED</div>}
                        <div style={{display:"flex",justifyContent:"center",marginBottom:4}}><CoinCanvas coin={c} size={48}/></div>
                        <div style={{...microLabel,fontSize:7,color:m.hl,opacity:.7,letterSpacing:1}}>{m.name}{c.shiny?" ✦":""}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shrine forge picker — pick exactly 5 coins of one metal to forge an artefact */}
      {shrinePicker&&(()=>{
        const m=METALS[shrinePicker.metalIdx];
        const def=ARTEFACTS[shrinePicker.metalIdx];
        const baseCost=ARTEFACT_FORGE_COST[shrinePicker.metalIdx];
        const cost=Math.max(1,Math.round(baseCost*(1-(buff.forgeDiscount||0))));
        const close=()=>{setShrinePicker(null);setShrineSelection([]);};
        // Preview the grade we'd get with current selection
        const inputs=shrineSelection.map(id=>coins.find(c=>c.id===id)).filter(Boolean);
        const avgRarity=inputs.length>0?inputs.reduce((s,c)=>s+coinRarity(c),0)/inputs.length:0;
        const previewGrade=ARTEFACT_GRADES[gradeForRaritySum(avgRarity)];
        const ready=shrineSelection.length===5&&marks>=cost;
        return(
          <div onClick={close} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.78)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadein .18s ease",padding:"20px 12px"}}>
            <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:520,maxHeight:"85vh",background:t.surface,border:`1px solid ${m.eng}88`,borderRadius:16,boxShadow:"0 -12px 40px rgba(0,0,0,.6)",display:"flex",flexDirection:"column",animation:"slideUp .25s cubic-bezier(.2,.8,.3,1)"}}>
              <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:46,height:46,borderRadius:11,background:isDark?`linear-gradient(135deg,${m.dark},${m.mid})`:`linear-gradient(135deg,${m.mid},${m.base})`,border:`1px solid ${m.eng}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:m.hl,fontFamily:"'Fraunces',serif",flexShrink:0,overflow:"hidden"}}>{def.art?<img src={`/artefacts/${def.art}.webp`} alt={def.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:def.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{...FR,fontWeight:800,fontSize:16,letterSpacing:-.2,color:t.text}}>Forge {def.name}</div>
                  <div style={{...mu,fontSize:11,marginTop:1,fontStyle:"italic"}}>{def.desc}</div>
                </div>
                <button onClick={close} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${t.border}`,background:t.surfaceHi,cursor:"pointer",...F,fontSize:14,color:t.muted,padding:0,lineHeight:1,flexShrink:0}}>×</button>
              </div>
              <div style={{padding:"10px 14px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:t.surfaceHi}}>
                <div>
                  <div style={{...microLabel,fontSize:9}}>Selected</div>
                  <div style={{...FR,fontWeight:800,fontSize:18,color:shrineSelection.length===5?t.success:t.text,letterSpacing:-.5}}>{shrineSelection.length} / 5</div>
                </div>
                {shrineSelection.length>0&&(
                  <div style={{textAlign:"right"}}>
                    <div style={{...microLabel,fontSize:9}}>Preview Grade</div>
                    <div style={{...FR,fontWeight:800,fontSize:14,color:previewGrade.color,letterSpacing:.3}}>{previewGrade.name}</div>
                  </div>
                )}
                <div style={{textAlign:"right"}}>
                  <div style={{...microLabel,fontSize:9}}>Cost</div>
                  <div style={{...F,fontWeight:800,fontSize:13,color:marks>=cost?t.accent:t.danger,letterSpacing:.3,fontVariantNumeric:"tabular-nums"}}>◈ {cost.toLocaleString()}</div>
                </div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"12px"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))",gap:7}}>
                  {[...shrinePicker.available].sort((a,b)=>coinRarity(b)-coinRarity(a)||(b.shiny?1:0)-(a.shiny?1:0)).map(c=>{
                    const sel=shrineSelection.includes(c.id);
                    const r=RARITIES[coinRarity(c)];
                    const cantSelect=!sel&&shrineSelection.length>=5;
                    return(
                      <button key={c.id} disabled={cantSelect} onClick={()=>{
                        setShrineSelection(prev=>{
                          if(prev.includes(c.id))return prev.filter(x=>x!==c.id);
                          if(prev.length>=5)return prev;
                          return [...prev,c.id];
                        });
                      }} className={c.shiny?"shiny-card":""} style={{position:"relative",padding:"7px 4px 5px",borderRadius:9,border:`1px solid ${sel?t.accent:r.color+"55"}`,background:sel?`${t.accent}22`:isDark?`linear-gradient(160deg,${m.dark}30,${t.surface})`:t.surface,cursor:cantSelect?"not-allowed":"pointer",opacity:cantSelect?.4:1,transition:"all .12s",overflow:"visible",boxShadow:sel?`0 0 0 2px ${t.accent}66`:"none"}}>
                        {c.shiny&&<div className="shiny-aura"/>}
                        {sel&&<div style={{position:"absolute",top:3,right:3,width:16,height:16,borderRadius:"50%",background:t.accent,color:t.accentInk,...F,fontSize:10,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",zIndex:3}}>✓</div>}
                        <div style={{display:"flex",justifyContent:"center",marginBottom:3}}><CoinCanvas coin={c} size={42}/></div>
                        <div style={{...microLabel,fontSize:6.5,color:r.color,fontWeight:800,letterSpacing:1}}>{r.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{padding:"12px 14px",borderTop:`1px solid ${t.border}`}}>
                <button onClick={()=>{
                  if(!ready)return;
                  const result=forgeArtefact(shrineSelection);
                  if(result.ok){close();}
                }} disabled={!ready} style={{width:"100%",padding:"12px 0",borderRadius:10,border:`1px solid ${ready?m.eng:t.border}`,background:ready?`linear-gradient(135deg,${m.dark},${m.mid})`:t.surfaceHi,cursor:ready?"pointer":"not-allowed",...F,fontWeight:800,fontSize:13,color:ready?m.hl:t.muted,letterSpacing:2,textTransform:"uppercase"}}>{shrineSelection.length<5?`Pick ${5-shrineSelection.length} more`:marks<cost?`Need ◈ ${cost.toLocaleString()}`:"✦ Forge Artefact"}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
