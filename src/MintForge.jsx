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
@keyframes gleam{0%{transform:translateX(-60%);opacity:0}10%{opacity:1}60%{opacity:.9}100%{transform:translateX(140%);opacity:0}}
@keyframes flashIn{0%{opacity:0;transform:scale(.7) translateY(14px)}55%{transform:scale(1.06) translateY(-3px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes rarityFlash{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes subtlePulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes digPop{0%{transform:scale(1)}40%{transform:scale(.84) translateY(5px)}100%{transform:scale(1)}}
@keyframes cellReveal{0%{opacity:0;transform:scale(.5)}65%{transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}60%{transform:translateX(6px)}}
@keyframes winPop{0%{transform:scale(0) rotate(-15deg)}65%{transform:scale(1.18) rotate(4deg)}100%{transform:scale(1) rotate(0)}}
@keyframes shinyAuraGlow{0%,100%{box-shadow:0 0 0 1.5px #ff6080,0 0 18px 2px rgba(255,96,128,.55),inset 0 0 12px rgba(255,200,80,.18)}33%{box-shadow:0 0 0 1.5px #60ff90,0 0 18px 2px rgba(96,255,144,.55),inset 0 0 12px rgba(120,255,180,.18)}66%{box-shadow:0 0 0 1.5px #9060ff,0 0 18px 2px rgba(144,96,255,.55),inset 0 0 12px rgba(180,120,255,.18)}}
@keyframes shinyText{0%,100%{color:#ff8080}16%{color:#ffcc40}33%{color:#80ffa0}50%{color:#80d0ff}66%{color:#a080ff}83%{color:#ff80ff}}
@keyframes shinyRotate{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes particleFly{0%{opacity:1;transform:translate(0,0) rotate(0deg) scale(1)}100%{opacity:0;transform:translate(var(--tx),var(--ty)) rotate(var(--r)) scale(.4)}}
@keyframes luckySlam{0%{opacity:0;transform:translateY(-44px) scale(.55)}50%{transform:translateY(5px) scale(1.1)}70%{transform:translateY(-3px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes flicker{0%,100%{opacity:1}45%{opacity:.84}55%{opacity:1}}
@keyframes pickSwing{0%{transform:translate(-50%,-90%) rotate(-55deg) scale(.9);opacity:.95}45%{transform:translate(-50%,-90%) rotate(20deg) scale(1.18);opacity:1}100%{transform:translate(-50%,-90%) rotate(0deg) scale(.7);opacity:0}}
@keyframes pickSwingCell{0%{transform:rotate(-50deg) scale(.8);opacity:.9}45%{transform:rotate(15deg) scale(1.25);opacity:1}100%{transform:rotate(0) scale(.6);opacity:0}}
.shiny-card{position:relative;isolation:isolate;}
.shiny-card::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;animation:shinyAuraGlow 2.4s linear infinite;}
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
];
const MAX_TIER=6;
const SHOVEL_TIER_CAP=[1,2,3,4,5,6,6];
function pickMetal(rng,pLvl=1,tierCap=MAX_TIER){
  const b=Math.min(pLvl-1,50);
  const w=[Math.max(14,38-b*.48),Math.max(10,22-b*.18),18+b*.08,12+b*.12,6+b*.14,3+b*.08,Math.min(15,1+b*.08)];
  const tot=w.reduce((a,v)=>a+v,0);
  let r=rng.next()*tot,c=0;
  for(let i=0;i<w.length;i++){c+=w[i];if(r<=c)return Math.min(i,tierCap);}return 0;
}

/* ─── SHAPES & FACES ──────────────────────────────────────────────────── */
const SHAPES=["round","round","round","round","octagonal","octagonal","hexagonal","hexagonal","holed","shield","diamond","oval"];
const SHAPE_NAMES={round:"Round",octagonal:"Octagonal",hexagonal:"Hexagonal",holed:"Pierced",shield:"Shield",diamond:"Diamond",oval:"Oval"};
function genFace(seed){
  const rng=new RNG(seed^0xf4ce1a);const SZ=9,half=5;
  let L=Array.from({length:SZ},(_,y)=>Array.from({length:half},(_,x)=>{const d=Math.hypot(x-4,y-4)/4.2;return rng.next()>(0.38+d*.28)?1:0;}));
  for(let it=0;it<2;it++){L=L.map((row,y)=>row.map((cell,x)=>{let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dy&&!dx)continue;const ny=y+dy,nx=x+dx;n+=(ny>=0&&ny<SZ&&nx>=0&&nx<half)?L[ny][nx]:0;}return n>=4?1:n<=2?0:cell;}));}
  const g=Array.from({length:SZ},(_,y)=>{const row=new Array(SZ).fill(0);for(let x=0;x<half;x++){row[x]=L[y][x];row[SZ-1-x]=L[y][x];}return row;});
  const pool=[];for(let y=2;y<7;y++)for(let x=2;x<7;x++)if(g[y][x]===1&&Math.hypot(x-4,y-4)<2.8)pool.push([y,x]);
  for(let h=0;h<rng.int(1,2);h++){if(!pool.length)break;const idx=rng.int(0,pool.length-1);const[hy,hx]=pool.splice(idx,1)[0];g[hy][hx]=2;}
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
function mkCoin(seed,pLvl=1,tier=null,tierCap=MAX_TIER){
  const rng=new RNG(seed);
  const raw=(rng.pick(CONS)+rng.pick(VOWS)+rng.pick(CONS)+rng.pick(VOWS)).slice(0,9);
  return{id:`c_${seed>>>0}_${(Date.now()&0xffff).toString(36)}`,seed,raw,runes:rune(raw),metalIdx:tier??pickMetal(rng,pLvl,tierCap),shape:rng.pick(SHAPES),era:`${rng.pick(ERAS)} ${rng.pick(EPOCH)}, House of ${rng.pick(HOUSES)}`,cond:rng.pick(CONDS),wt:+(rng.next()*12+2).toFixed(1),dia:rng.int(18,44),shiny:false};
}
const newSeed=()=>(Date.now()^(Math.random()*0xffffffff|0))>>>0;

/* ─── DRAW COIN ───────────────────────────────────────────────────────── */
function drawCoin(canvas,coin,px){
  const S=48,off=document.createElement("canvas");off.width=S;off.height=S;
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
  for(let i=0;i<240;i++){const a=noise.next()*Math.PI*2,d=noise.next()*r*.95,x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d,b=noise.next();c.fillStyle=`rgba(${b>.5?255:0},${b>.5?255:0},${b>.5?255:0},${.04+noise.next()*.06})`;c.fillRect(x|0,y|0,1,1);}
  const face=genFace(coin.seed);for(let y=0;y<9;y++)for(let x=0;x<9;x++){const v=face[y][x];if(!v)continue;const px2=4+x*4.5,py=4+y*4.5;c.fillStyle=v===2?m.eng:m.hl;c.fillRect(px2|0,py|0,5,5);if(v===1){c.fillStyle="rgba(255,255,255,.18)";c.fillRect(px2|0,py|0,5,1);c.fillStyle="rgba(0,0,0,.22)";c.fillRect(px2|0,(py+4)|0,5,1);}}
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
function DigPit({coin,shovelLevel,onFound,onTooDeep,t,isDark}){
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
        if(shovelLevel>=7)return d.int(1,7);                           // max shovel always reaches
        return d.bool(0.82)?d.int(1,shovelLevel):shovelLevel+1;        // 18% of coins are just out of reach
      }
      return d.int(1,Math.min(7,shovelLevel+1));                       // non-coin cells: visual flavour only
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
    if(idx===coinCell){setFound(idx);setTimeout(()=>onFound(cnt,GRID*GRID),600);}
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
  const isShiny=coin.shiny;
  const [showParticles,setShowParticles]=useState(isShiny);
  useEffect(()=>{const t=setTimeout(onDone,isShiny?4000:3000);return()=>clearTimeout(t);},[onDone,isShiny]);
  useEffect(()=>{if(isShiny){const t=setTimeout(()=>setShowParticles(false),2000);return()=>clearTimeout(t);}},[isShiny]);
  return(
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:isShiny?"rgba(0,0,0,.95)":"rgba(8,4,2,.92)",backdropFilter:"blur(14px)",transition:"background .5s"}} onClick={onDone}>
      {isShiny&&<Particles active={showParticles} type="shiny" origin={{x:50,y:45}}/>}
      {isShiny&&<div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"conic-gradient(#ff8080,#ffcc40,#80ff90,#80d0ff,#a080ff,#ff80ff,#ff8080)",animation:"shinyRotate 2.2s linear infinite",opacity:.42,pointerEvents:"none",filter:"blur(4px)"}}/>}
      <div style={{textAlign:"center",animation:"flashIn .5s cubic-bezier(.2,.8,.3,1) forwards",padding:"0 24px",position:"relative",zIndex:1,maxWidth:420}}>
        {isShiny&&<div style={{fontFamily:"Outfit,sans-serif",fontSize:13,fontWeight:800,letterSpacing:5,marginBottom:14,animation:"shinyText 1s linear infinite"}}>✦ SHINY DISCOVERED ✦</div>}
        {coin.digBonus==="lucky"&&!isShiny&&<div style={{fontFamily:"Outfit,sans-serif",fontSize:11,fontWeight:700,color:"#7ad888",letterSpacing:4,marginBottom:10,textTransform:"uppercase"}}>⚡ Lucky find — rarity upgraded</div>}
        {coin.digBonus==="damaged"&&<div style={{fontFamily:"Outfit,sans-serif",fontSize:11,fontWeight:700,color:"#e07050",letterSpacing:4,marginBottom:10,textTransform:"uppercase"}}>✕ Over-excavated — rarity reduced</div>}
        <div style={{display:"flex",justifyContent:"center",marginBottom:18,position:"relative"}}>
          <CoinCanvas coin={coin} size={180}/>
          {[0,60,120,180,240,300].map(deg=>(
            <div key={deg} style={{position:"absolute",top:"50%",left:"50%",width:2,height:isShiny?78:58,background:isShiny?`linear-gradient(to top,transparent,hsl(${deg},100%,75%))`:`linear-gradient(to top,transparent,${m.hl}88)`,transform:`translate(-50%,-100%) rotate(${deg}deg)`,transformOrigin:"bottom center",animation:"subtlePulse 1.4s ease-in-out infinite",animationDelay:`${deg/300*.4}s`}}/>
          ))}
        </div>
        <div style={{display:"inline-flex",alignItems:"center",gap:10,padding:"5px 16px",background:m.flash,border:`1px solid ${m.accent}66`,borderRadius:3,marginBottom:14,fontFamily:"Outfit,sans-serif",fontSize:11,fontWeight:800,color:m.hl,letterSpacing:4,textTransform:"uppercase",animation:`rarityFlash .9s ease-in-out ${isShiny?0:3}`}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:m.hl,boxShadow:`0 0 6px ${m.hl}`}}/>
          {m.rarity} · {SHAPE_NAMES[coin.shape]||coin.shape}{isShiny?" ✦":""}
          <span style={{width:5,height:5,borderRadius:"50%",background:m.hl,boxShadow:`0 0 6px ${m.hl}`}}/>
        </div>
        <div style={{fontFamily:"VT323,monospace",fontSize:isShiny?56:50,letterSpacing:6,lineHeight:1,marginBottom:6,animation:isShiny?"shinyText 1.2s linear infinite":undefined,color:isShiny?undefined:m.hl}}>{coin.runes}</div>
        <div style={{fontFamily:"'Fraunces',serif",fontStyle:"italic",fontWeight:600,fontSize:18,color:"#b8a890",letterSpacing:3,marginBottom:6}}>{coin.raw}</div>
        <div style={{fontFamily:"'Fraunces',serif",fontStyle:"italic",fontSize:12,color:"#5a4a38",letterSpacing:.5}}>{coin.era}</div>
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
              <div style={{...F,fontSize:10,fontWeight:800,color:m.hl,letterSpacing:3,textTransform:"uppercase"}}>{m.rarity}</div>
              {coin.shiny&&<div style={{fontSize:10,fontWeight:800,marginTop:2,animation:"shinyText 1s linear infinite",fontFamily:"Outfit,sans-serif",letterSpacing:2}}>✦ SHINY</div>}
            </div>
          </div>
          <div style={{padding:"12px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Metal",m.name],["Shape",SHAPE_NAMES[coin.shape]||coin.shape],["Condition",coin.cond],["Weight",`${coin.wt}g`],["Diameter",`${coin.dia}mm`],["Value",`◈ ${coinValue(coin).toLocaleString()}`]].map(([k,v])=>(
              <div key={k}><div style={{...F,fontSize:9,color:"rgba(245,230,200,.32)",fontWeight:700,textTransform:"uppercase",letterSpacing:2}}>{k}</div><div style={{...F,fontSize:13,color:k==="Value"?"#f0c850":"rgba(245,230,200,.86)",marginTop:2,fontWeight:k==="Value"?700:500}}>{v}</div></div>
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
function rarityScore(coins){return coins.reduce((s,c)=>s+([1,3,8,20,45,120,300][c.metalIdx]||1)*(c.shiny?3:1),0);}

// Value of a single coin in "marks" (the in-game currency).
// Tiered by metal, shinies are 4×, condition modulates ±15%.
// Pristine adds 15%, Corroded subtracts 15%, others scale linearly between.
function coinValue(c){
  const base=[3,8,20,55,140,360,900][c.metalIdx]||3;
  const condIdx=Math.max(0,CONDS.indexOf(c.cond));
  // CONDS: Pristine=0 (+15%), Mint=1 (+10%), Fine=2 (+5%), Good=3 (0%), Fair=4 (-5%), Worn=5 (-10%), Corroded=6 (-15%)
  const condMul=1+(0.15-condIdx*0.05);
  const shinyMul=c.shiny?4:1;
  return Math.max(1,Math.round(base*condMul*shinyMul));
}
function vaultMarks(coins){return coins.reduce((s,c)=>s+coinValue(c),0);}

const BANNERS={
  stone:"linear-gradient(135deg,#241a14 0%,#3a2820 50%,#1a120c 100%)",
  wood:"linear-gradient(135deg,#3a1e08 0%,#5a3018 50%,#241408 100%)",
  iron:"linear-gradient(135deg,#1a2630 0%,#2a3848 50%,#0e1820 100%)",
  gilded:"linear-gradient(135deg,#3a2400 0%,#604000 50%,#241400 100%)",
  obsidian:"linear-gradient(135deg,#1a0040 0%,#400870 50%,#0a0020 100%)",
  void:"linear-gradient(135deg,#04041a 0%,#101030 50%,#020210 100%)",
};
const FRAMES={
  stone:{lbl:"Stone",minLvl:1,accent:"#8a7560"},
  wood:{lbl:"Wood",minLvl:5,accent:"#a87238"},
  iron:{lbl:"Iron",minLvl:10,accent:"#7090b0"},
  gilded:{lbl:"Gilded",minLvl:20,accent:"#d4a017"},
  obsidian:{lbl:"Obsidian",minLvl:30,accent:"#a050e8"},
  void:{lbl:"Void",minLvl:50,accent:"#5050e8"},
};

const SHOVEL_UPS=[null,{label:"Iron Shovel",depth:2,cost:[{m:0,n:3}],desc:"Reaches depth 2"},{label:"Bronze Pick",depth:3,cost:[{m:0,n:2},{m:1,n:2}],desc:"Reaches depth 3"},{label:"Steel Pick",depth:4,cost:[{m:2,n:2},{m:1,n:1}],desc:"Reaches depth 4"},{label:"Gilded Pick",depth:5,cost:[{m:3,n:1},{m:2,n:2}],desc:"Reaches depth 5"},{label:"Platinum Pick",depth:6,cost:[{m:4,n:1},{m:3,n:1}],desc:"Reaches depth 6"},{label:"Void Excavator",depth:7,cost:[{m:5,n:1},{m:4,n:1}],desc:"Reaches depth 7 — Maxed"}];
const BRUSH_UPS=[{label:"Rough Brush",alpha:BA,shinyChance:.01,cost:null,desc:"1% shiny chance"},{label:"Boar Bristle",alpha:.55,shinyChance:.03,cost:[{m:0,n:2}],desc:"3% shiny chance"},{label:"Silver Brush",alpha:.9,shinyChance:.06,cost:[{m:0,n:1},{m:2,n:2}],desc:"6% shiny chance"},{label:"Gold Brush",alpha:1.0,shinyChance:.10,cost:[{m:3,n:1},{m:2,n:1}],desc:"10% shiny chance"},{label:"Void Brush",alpha:1.0,shinyChance:.15,cost:[{m:5,n:1}],desc:"15% shiny chance — tarot buffs stack on top"}];
const MAX_SH=SHOVEL_UPS.length-1,MAX_BR=BRUSH_UPS.length-1;

/* ─── TAROT ───────────────────────────────────────────────────────────
   Each card has: id (matches /public/tarot/<id>.webp), title, suit, buff
   description, gameplay-affecting fields the engine reads, and a marks
   price in the shop. Cards stack additively up to 5 equipped slots. */
const TAROT_CARDS=[
  {id:"magician",         title:"The Magician",       roman:"I",    rarity:"common",   price:300,   shinyBonus:0.03, desc:"+3% shiny chance"},
  {id:"high_priestess",   title:"The High Priestess", roman:"II",   rarity:"common",   price:300,   xpMul:0.10,      desc:"+10% XP from digs"},
  {id:"empress",          title:"The Empress",        roman:"III",  rarity:"common",   price:400,   marksMul:0.15,   desc:"+15% marks earned"},
  {id:"emperor",          title:"The Emperor",        roman:"IV",   rarity:"uncommon", price:650,   tierUp:0.05,     desc:"+5% chance any dig is one tier higher"},
  {id:"hierophant",       title:"The Hierophant",     roman:"V",    rarity:"uncommon", price:600,   durMul:0.50,     desc:"Pickaxe wear halved"},
  {id:"lovers",           title:"The Lovers",         roman:"VI",   rarity:"uncommon", price:700,   pinSlots:2,      desc:"+2 display cabinet slots"},
  {id:"chariot",          title:"The Chariot",        roman:"VII",  rarity:"rare",     price:1200,  digSpeed:0.20,   desc:"+20% lucky-dig chance (≤2 digs to find)"},
  {id:"strength",         title:"Strength",           roman:"VIII", rarity:"rare",     price:1500,  shinyBonus:0.08, desc:"+8% shiny chance"},
  {id:"hermit",           title:"The Hermit",         roman:"rare", rarity:"rare",     price:1300,  artefactRate:0.10, desc:"+10% chance to find artefacts (coming soon)"},
  {id:"wheel_of_fortune", title:"Wheel of Fortune",   roman:"X",    rarity:"epic",     price:2400,  marksMul:0.40,   desc:"+40% marks earned"},
  {id:"justice",          title:"Justice",            roman:"XI",   rarity:"epic",     price:2200,  forgeRefund:0.25, desc:"25% chance to recover forge materials"},
  {id:"hanged_man",       title:"The Hanged Man",     roman:"XII",  rarity:"epic",     price:2800,  rerollDig:1,     desc:"Once per hunt, retry a too-deep coin"},
];
const TAROT_BY_ID=Object.fromEntries(TAROT_CARDS.map(c=>[c.id,c]));
const RARITY_COLOR={common:"#8a7560",uncommon:"#7ad888",rare:"#80c0ff",epic:"#c080ff",legendary:"#f0c850"};

// Aggregate active buffs from a list of equipped tarot card ids.
function tarotBuffs(equippedIds){
  const buff={shinyBonus:0,xpMul:0,marksMul:0,tierUp:0,durMul:1,pinSlots:0,digSpeed:0,artefactRate:0,forgeRefund:0,rerollDig:0};
  for(const id of equippedIds||[]){
    const c=TAROT_BY_ID[id];if(!c)continue;
    if(c.shinyBonus)buff.shinyBonus+=c.shinyBonus;
    if(c.xpMul)buff.xpMul+=c.xpMul;
    if(c.marksMul)buff.marksMul+=c.marksMul;
    if(c.tierUp)buff.tierUp+=c.tierUp;
    if(c.durMul!=null)buff.durMul*=c.durMul; // multiplicative — two halvings = quartered
    if(c.pinSlots)buff.pinSlots+=c.pinSlots;
    if(c.digSpeed)buff.digSpeed+=c.digSpeed;
    if(c.artefactRate)buff.artefactRate+=c.artefactRate;
    if(c.forgeRefund)buff.forgeRefund+=c.forgeRefund;
    if(c.rerollDig)buff.rerollDig+=c.rerollDig;
  }
  return buff;
}

/* ─── PICKAXE DURABILITY ─────────────────────────────────────────────── */
// Each shovel level has a max durability. Base wear is 1 per dig; tarot can halve it.
const SHOVEL_MAX_DUR=[null,40,60,90,130,180,250,350]; // index by shovelLevel
function shovelMaxDur(lv){return SHOVEL_MAX_DUR[Math.min(lv,SHOVEL_MAX_DUR.length-1)]||40;}
// Repair cost scales with shovel level — 8 marks per missing point at Lv1, doubling roughly per level.
function repairCost(missing,shovelLevel){
  return Math.max(1,Math.round(missing*(6+shovelLevel*4)));
}

const GAMBLES=[
  {id:"toss",label:"Coin Toss",icon:"🪙",desc:"1 coin · 50/50: tier up or lost",odds:"50/50",count:1,same:false,
   resolve:(bet)=>{const c=bet[0];if(Math.random()<.5){return{won:true,remove:[c.id],add:[mkCoin(newSeed(),1,Math.min(MAX_TIER,c.metalIdx+1))],msg:"LUCKY FLIP"};}return{won:false,remove:[c.id],add:[],msg:"TAILS — COIN LOST"};}},
  {id:"crucible",label:"Crucible",icon:"⚗️",desc:"3 of same tier · 40% up · 40% return · 20% bust",odds:"40/40/20",count:3,same:true,
   resolve:(bet)=>{const ids=bet.map(c=>c.id);const tier=bet[0].metalIdx;const r=Math.random();if(r<.4)return{won:true,remove:ids,add:[mkCoin(newSeed(),1,Math.min(MAX_TIER,tier+1))],msg:"TRANSMUTED"};if(r<.8)return{won:true,remove:ids,add:[mkCoin(newSeed(),1,tier)],msg:"STABLE RETURN"};return{won:false,remove:ids,add:[],msg:"CRUCIBLE COLLAPSED"};}},
];

/* ─── TAROT CARD COMPONENT ────────────────────────────────────────────
   Renders a single card with art + title bar. Optional locked prop greys
   it out (for "not yet owned" in shop). Optional equipped prop adds glow.
   Click handler is up to the parent. Aspect ratio matches the source art. */
function TarotCard({card,owned=true,equipped=false,onClick,size="md",t}){
  const dims=size==="sm"?{w:88,fs:9}:size==="lg"?{w:170,fs:14}:{w:120,fs:11};
  const rarColor=RARITY_COLOR[card.rarity]||"#888";
  return(
    <div onClick={onClick} className={equipped?"shiny-card":""} style={{
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
      <div style={{position:"relative",aspectRatio:"241 / 495",overflow:"hidden",background:"#0a0604"}}>
        <img src={`/tarot/${card.id}.webp`} alt={card.title} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
        {equipped&&<div style={{position:"absolute",top:5,right:5,background:rarColor,color:"#000",fontFamily:"Outfit,sans-serif",fontSize:8,fontWeight:900,padding:"2px 6px",borderRadius:3,letterSpacing:1,textTransform:"uppercase",boxShadow:`0 0 8px ${rarColor}`}}>Equipped</div>}
      </div>
      <div style={{padding:"6px 7px 7px",borderTop:`1px solid ${rarColor}33`,background:"linear-gradient(to bottom,#1a1310,#0e0a08)"}}>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontStyle:"italic",fontSize:dims.fs,color:rarColor,textAlign:"center",letterSpacing:.3,lineHeight:1.1}}>{card.title}</div>
        <div style={{fontFamily:"Outfit,sans-serif",fontSize:8,color:"rgba(255,255,255,.45)",textAlign:"center",marginTop:2,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600}}>{card.rarity}</div>
      </div>
    </div>
  );
}

/* ─── BOTTOM NAV ──────────────────────────────────────────────────────── */
function BottomNav({tab,setTab,huntActive,t}){
  const items=[["profile","☉","Profile"],["social","♟","Social"],["vault","◈","Vault"],["hunt","⛏","Hunt"],["forge","⚒","Forge"],["tavern","♢","Tavern"]];
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
  const [ownedTarots,setOwnedTarots]=useState([]);   // array of card IDs
  const [equippedTarots,setEquippedTarots]=useState([]); // up to 5
  const buff=useMemo(()=>tarotBuffs(equippedTarots),[equippedTarots]);
  const maxPins=6+(buff.pinSlots||0);
  const maxDur=shovelMaxDur(shovelLevel);
  const [tooDeepMsg,setTooDeepMsg]=useState(null);
  const [selectedCoin,setSelectedCoin]=useState(null);
  const [username,setUsername]=useState("");
  const [bio,setBio]=useState("Collector of ancient mintings from lost civilisations.");
  const [selectedTitle,setSelectedTitle]=useState(TITLES[0]);
  const [editingProfile,setEditingProfile]=useState(false);
  const level=lvl(xp);

  // Auto-revert frame if the player falls below requirement
  useEffect(()=>{if(level<FRAMES[frame].minLvl)setFrame("stone");},[level,frame]);
  // Keep selected title legal
  useEffect(()=>{if(!unlockedTitles(level).includes(selectedTitle))setSelectedTitle(unlockedTitles(level).slice(-1)[0]||TITLES[0]);},[level,selectedTitle]);

  const [huntCoin,setHuntCoin]=useState(()=>mkCoin(newSeed(),1,null,1));
  const [coinFrac,setCoinFrac]=useState(()=>({x:.2+Math.random()*.6,y:.2+Math.random()*.6}));
  const [detFrac,setDetFrac]=useState({x:.5,y:.5});
  const [phase,setPhase]=useState("hunt");
  const [foundCoin,setFoundCoin]=useState(null);
  const fieldRef=useRef();
  const [showLucky,setShowLucky]=useState(false);

  const [gambMode,setGambMode]=useState("toss");
  const [tavernView,setTavernView]=useState("shop"); // shop · wager · repair
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
      // reconstruct coins from stored {seed, metalIdx, shiny, locked, id}
      setCoins((v.coins||[]).map(row=>{
        const base=mkCoin(row.seed,1,row.metalIdx);
        base.id=row.id;
        base.shiny=!!row.shiny;
        base.locked=!!row.locked;
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
    setPhase("hunt");setFoundCoin(null);setTooDeepMsg(null);setTab("hunt");
    setLoadedFromServer(false);setAuthReady(true);
  },[api]);

  /* ── sync scalar state (debounced) ─────────────────────────────── */
  useDebouncedEffect(()=>{
    if(!loadedFromServer)return;
    api.tx({state:{xp,shovelLevel,brushLevel,frame,bio,selectedTitle,pinnedIds,marks,shovelDur,ownedTarots,equippedTarots}}).catch(()=>{});
  },[xp,shovelLevel,brushLevel,frame,bio,selectedTitle,pinnedIds,marks,shovelDur,ownedTarots,equippedTarots,loadedFromServer],800);

  /* ── load friends list on auth + when entering social tab ──── */
  useEffect(()=>{
    if(!token||!loadedFromServer)return;
    if(tab!=="social")return;
    api.listFriends().then(r=>setFriendsList(r.friends||[])).catch(()=>{});
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
      api.listFriends().then(r=>setFriendsList(r.friends||[])).catch(()=>{});
      if(viewingProfile===uname)setProfileData(p=>p?{...p,isFriend:true}:p);
    }catch{}
  },[api,viewingProfile]);

  const handleRemoveFriend=useCallback(async(uname)=>{
    try{await api.removeFriend(uname);
      api.listFriends().then(r=>setFriendsList(r.friends||[])).catch(()=>{});
      if(viewingProfile===uname)setProfileData(p=>p?{...p,isFriend:false}:p);
    }catch{}
  },[api,viewingProfile]);

  const xpPct=Math.min(100,Math.round(xpIn/xpRange*100));
  const fr=FRAMES[frame];
  const brushData=BRUSH_UPS[brushLevel];
  const autoTop=useMemo(()=>[...coins].sort((a,b)=>b.metalIdx-a.metalIdx||(b.shiny?1:0)-(a.shiny?1:0)).slice(0,maxPins),[coins,maxPins]);
  const showcaseCoins=pinnedIds?coins.filter(c=>pinnedIds.includes(c.id)).slice(0,maxPins):autoTop;

  const dist=Math.hypot(detFrac.x-coinFrac.x,detFrac.y-coinFrac.y);
  const signal=Math.max(0,1-dist/.55);const canDig=dist<.09;
  const signalColor=signal>.75?"#50e890":signal>.4?"#f0c850":"#7088a8";

  const onFieldInteract=useCallback((e)=>{
    if(!fieldRef.current||phase!=="hunt")return;e.preventDefault();
    const rect=fieldRef.current.getBoundingClientRect();
    const cx2=e.touches?e.touches[0].clientX:e.clientX;const cy2=e.touches?e.touches[0].clientY:e.clientY;
    setDetFrac({x:Math.max(0,Math.min(1,(cx2-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(cy2-rect.top)/rect.height))});
  },[phase]);

  const onDig=()=>{
    if(!canDig||phase!=="hunt")return;
    if(shovelDur<=0){setTooDeepMsg("Pickaxe broken — repair it in the Shop.");return;}
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
    // Tarot Chariot widens the lucky-dig window (≤2 by default; +20% to a 3-cell window roll)
    const luckyThreshold=2;
    const isLucky=cnt<=luckyThreshold||(cnt===3&&Math.random()<buff.digSpeed);
    // Emperor: +5% chance the resulting coin is one tier higher than rolled
    const tierUpRoll=Math.random()<buff.tierUp;
    if(isLucky){
      setFoundCoin(p=>p?{...p,metalIdx:Math.min(MAX_TIER,p.metalIdx+1+(tierUpRoll?1:0)),digBonus:"lucky"}:p);
      setShowLucky(true);
    }else if(tierUpRoll){
      setFoundCoin(p=>p?{...p,metalIdx:Math.min(MAX_TIER,p.metalIdx+1),digBonus:"lucky"}:p);
    }
    else if(cnt>=total){setFoundCoin(p=>p?{...p,metalIdx:Math.max(0,p.metalIdx-1),digBonus:"damaged"}:p);}
    // Pickaxe wear — Hierophant halves it (multiplicative)
    const wear=Math.max(1,Math.round(1*buff.durMul));
    setShovelDur(d=>Math.max(0,d-wear));
    // XP — High Priestess +10%
    setXP(p=>p+Math.round(80*(1+buff.xpMul)));
    setPhase("brush");
  };
  const onTooDeep=(d)=>setTooDeepMsg(`Coin lies at depth ${d} — upgrade your shovel.`);
  // Abandon the current dig — prevents soft-lock when a too-deep coin is
  // unreachable AND the player can't afford to forge. Generates a new hunt
  // coin and returns to the hunt phase. No reward, no penalty.
  const onAbandon=()=>{
    const tc=SHOVEL_TIER_CAP[Math.min(shovelLevel-1,SHOVEL_TIER_CAP.length-1)];
    const next=mkCoin(newSeed(),level,null,tc);
    setHuntCoin(next);setCoinFrac({x:.1+Math.random()*.8,y:.1+Math.random()*.8});
    setDetFrac({x:.5,y:.5});setFoundCoin(null);setTooDeepMsg(null);setPhase("hunt");
  };
  const onBrushDone=(isShiny)=>{setFoundCoin(p=>p?{...p,shiny:!!isShiny}:p);setPhase("banner");};
  const onBannerDone=()=>{
    if(foundCoin){
      const stored={...foundCoin};
      setCoins(p=>[stored,...p]);
      // Grant marks: 30% of the coin's display value, modulated by Empress/Wheel of Fortune
      const earned=Math.max(1,Math.round(coinValue(stored)*0.3*(1+buff.marksMul)));
      setMarks(m=>m+earned);
      // Persist: add the coin (server maps {id,seed,metalIdx,shiny})
      api.tx({add:[{id:stored.id,seed:stored.seed,metalIdx:stored.metalIdx,shiny:!!stored.shiny}]}).catch(()=>{});
    }
    const tc=SHOVEL_TIER_CAP[Math.min(shovelLevel-1,SHOVEL_TIER_CAP.length-1)];
    const next=mkCoin(newSeed(),level,null,tc);
    setHuntCoin(next);setCoinFrac({x:.1+Math.random()*.8,y:.1+Math.random()*.8});
    setDetFrac({x:.5,y:.5});setFoundCoin(null);setPhase("hunt");
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

  // Sell a coin from the vault for marks (locked coins protected)
  const sellCoin=useCallback((id)=>{
    const c=coins.find(x=>x.id===id);if(!c||c.locked)return;
    const earned=Math.round(coinValue(c)*(1+buff.marksMul));
    setCoins(prev=>prev.filter(x=>x.id!==id));
    setMarks(m=>m+earned);
    setSelectedCoin(null);
    api.tx({remove:[id]}).catch(()=>{});
  },[coins,buff.marksMul,api]);

  // Repair pickaxe — pay marks per missing durability
  const repairPickaxe=()=>{
    const missing=maxDur-shovelDur;
    if(missing<=0)return;
    const cost=repairCost(missing,shovelLevel);
    if(marks<cost)return;
    setMarks(m=>m-cost);
    setShovelDur(maxDur);
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

  // Equip / unequip tarot (max 5 active slots)
  const toggleTarot=(cardId)=>{
    setEquippedTarots(prev=>{
      if(prev.includes(cardId))return prev.filter(x=>x!==cardId);
      if(prev.length>=5)return prev; // full
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
              <span style={{...F,fontSize:11,fontWeight:800,color:t.accent,letterSpacing:.5,fontVariantNumeric:"tabular-nums",display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:11,opacity:.85}}>◈</span>{marks.toLocaleString()}</span>
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
            <div style={{height:130,borderRadius:"0 0 20px 20px",background:BANNERS[frame],position:"relative",overflow:"hidden",marginTop:-18,marginLeft:-14,marginRight:-14,border:`1px solid ${t.border}`,borderTop:"none"}}>
              <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 30% 60%,rgba(255,255,255,.06),transparent 65%)"}}/>
              <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 70% 30%,rgba(212,160,23,.08),transparent 60%)"}}/>
              <div className="noise-overlay" style={{opacity:.06}}/>
              <div style={{position:"absolute",top:12,right:14}}>
                <select value={frame} onChange={e=>setFrame(e.target.value)} style={{background:"rgba(0,0,0,.6)",border:`1px solid rgba(255,255,255,.16)`,color:"#c8b89a",borderRadius:6,padding:"4px 10px",...F,fontSize:11,cursor:"pointer",fontWeight:600,letterSpacing:.5}}>
                  {Object.entries(FRAMES).map(([k,f])=><option key={k} value={k} disabled={level<f.minLvl}>{f.lbl}{level<f.minLvl?` · Lv${f.minLvl}`:""}</option>)}
                </select>
              </div>
              <div style={{position:"absolute",bottom:8,left:16,...microLabel,fontSize:9,color:fr.accent,opacity:.7}}>{fr.lbl}</div>
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
              <div style={{...microLabel}}>{pinnedIds?"Manual":"Auto"}{maxPins>6&&` · ${maxPins} slots`}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
              {Array.from({length:maxPins}).map((_,i)=>{
                const coin=showcaseCoins[i];
                if(!coin)return<div key={i} style={{minHeight:144,border:`1px dashed ${t.border}`,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",background:`${t.surface}66`}}><span style={{...mu,fontSize:24,opacity:.3}}>+</span></div>;
                const m=METALS[coin.metalIdx];
                return(<div key={coin.id} className={coin.shiny?"shiny-card":""} style={{background:isDark?`linear-gradient(160deg,${m.dark}40,${t.surface})`:t.surface,border:`1px solid ${m.eng}30`,borderTop:`2px solid ${fr.accent}`,borderRadius:13,padding:"13px 8px 10px",textAlign:"center",position:"relative",transition:"transform .2s",cursor:"pointer"}} onClick={()=>setSelectedCoin(coin)} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";}} onMouseLeave={e=>{e.currentTarget.style.transform="";}}>
                  {coin.shiny&&<div style={{position:"absolute",top:6,right:7,fontSize:11,color:"#ffe060",textShadow:"0 0 6px #ffe06088"}}>✦</div>}
                  <div style={{display:"flex",justifyContent:"center",marginBottom:7}}><CoinCanvas coin={coin} size={64}/></div>
                  <div style={{...VT,fontSize:15,color:m.hl,letterSpacing:3,lineHeight:1}}>{coin.runes}</div>
                  <div style={{...microLabel,fontSize:8,marginTop:3,color:m.hl,opacity:.6}}>{m.name}{coin.shiny?" ✦":""}</div>
                </div>);
              })}
            </div>

            {/* ─── EQUIPPED TAROTS ─── */}
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:12,marginTop:22,padding:"0 4px"}}>
              <div style={{...sectionTitle,fontSize:18}}>Tarot Spread</div>
              <div style={{...microLabel}}>{equippedTarots.length} / 5</div>
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
                        <div style={{width:40,height:40,borderRadius:"50%",background:BANNERS[f.frame]||BANNERS.stone,border:`1px solid ${(FRAMES[f.frame]||FRAMES.stone).accent}66`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,...FR,fontWeight:900,fontSize:16,color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,.5)"}}>{f.username.slice(0,2).toUpperCase()}</div>
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
            </>):(
              /* ── Profile detail view ── */
              <div style={{animation:"fadein .25s ease"}}>
                <button onClick={()=>{setViewingProfile(null);setProfileData(null);setProfileErr(null);}} style={{...F,fontSize:12,fontWeight:700,color:t.muted,background:"transparent",border:"none",padding:"4px 0",marginBottom:14,cursor:"pointer",letterSpacing:1.5,textTransform:"uppercase"}}>← Back</button>
                {profileLoading&&<div style={{...mu,textAlign:"center",padding:"60px 0",fontStyle:"italic"}}>Opening their vault…</div>}
                {profileErr&&<div style={{...card,padding:"24px 16px",textAlign:"center",borderColor:t.danger}}><div style={{...F,color:t.danger,fontWeight:600}}>⚠ {profileErr}</div></div>}
                {profileData&&(()=>{
                  const pd=profileData;const plvl=lvl(pd.xp);const pfr=FRAMES[pd.frame]||FRAMES.stone;
                  return(<>
                    <div style={{height:130,borderRadius:16,background:BANNERS[pd.frame]||BANNERS.stone,position:"relative",overflow:"hidden",marginLeft:-14,marginRight:-14,border:`1px solid ${t.border}`}}>
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
                              {cs.shiny&&<div style={{position:"absolute",top:6,right:7,fontSize:11,color:"#ffe060",textShadow:"0 0 6px #ffe06088"}}>✦</div>}
                              <div style={{display:"flex",justifyContent:"center",marginBottom:7}}><CoinCanvas coin={dispCoin} size={64}/></div>
                              <div style={{...VT,fontSize:14,color:m.hl,letterSpacing:2,lineHeight:1.1}}>{dispCoin.runes}</div>
                              <div style={{...microLabel,fontSize:8,marginTop:3,color:m.hl,opacity:.55}}>{m.name}{cs.shiny?" ✦":""}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>}
                  </>);
                })()}
              </div>
            )}
          </div>
        )}

        {/* ─── VAULT ─── */}
        {tab==="vault"&&(
          <div style={{animation:"fadein .35s ease"}}>
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:14,padding:"0 2px"}}>
              <div style={sectionTitle}>The Vault</div>
              <div style={{...microLabel}}>{coins.length} {coins.length===1?"coin":"coins"}</div>
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
                  {visCoins.map(coin=>{const m=METALS[coin.metalIdx];const pinned=pinnedIds?pinnedIds.includes(coin.id):autoTop.some(c=>c.id===coin.id);return(
                    <div key={coin.id} className={coin.shiny?"shiny-card":""} style={{...card,padding:"13px 8px 10px",textAlign:"center",cursor:"pointer",border:`1px solid ${pinned?m.eng+"66":t.border}`,background:pinned?(isDark?`linear-gradient(160deg,${m.dark}30,${t.surface})`:t.surface):t.surface,transition:"all .18s",position:"relative"}}
                      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=m.eng;}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor=pinned?m.eng+"66":t.border;}}
                      onClick={e=>{
                        // Double-tap detector: if a tap was registered <350ms ago, treat as double
                        const now=Date.now();
                        const last=e.currentTarget._lastTap||0;
                        if(now-last<350){
                          // double-tap: pin/unpin, cancel pending single-tap
                          clearTimeout(e.currentTarget._tapT);
                          e.currentTarget._lastTap=0;
                          togglePin(coin.id);
                        }else{
                          // first tap: schedule single-tap action
                          e.currentTarget._lastTap=now;
                          const target=e.currentTarget;
                          e.currentTarget._tapT=setTimeout(()=>{
                            target._lastTap=0;
                            setSelectedCoin(coin);
                          },280);
                        }
                      }}>
                      {pinned&&<div style={{position:"absolute",top:7,right:7,width:6,height:6,borderRadius:"50%",background:m.hl,boxShadow:`0 0 6px ${m.hl}`}}/>}
                      {coin.shiny&&<div style={{position:"absolute",top:6,left:7,fontSize:10,color:"#ffe060",textShadow:"0 0 6px #ffe06088"}}>✦</div>}
                      {coin.locked&&<div style={{position:"absolute",bottom:6,right:7,fontSize:10,opacity:.85,filter:"drop-shadow(0 0 4px rgba(0,0,0,.6))"}}>🔒</div>}
                      <div style={{display:"flex",justifyContent:"center",marginBottom:7}}><CoinCanvas coin={coin} size={64}/></div>
                      <div style={{...VT,fontSize:14,color:m.hl,letterSpacing:3,lineHeight:1.1}}>{coin.runes}</div>
                      <div style={{...microLabel,fontSize:8,marginTop:3,color:m.hl,opacity:.55}}>{m.name}{coin.shiny?" ✦":""}</div>
                    </div>
                  );})}
                </div>
              </>
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
              <div ref={fieldRef} onMouseMove={onFieldInteract} onTouchMove={onFieldInteract} onClick={onFieldInteract}
                style={{position:"relative",height:280,borderRadius:16,overflow:"hidden",cursor:"crosshair",userSelect:"none",background:isDark?"radial-gradient(ellipse at center,#0e1018 0%,#06070c 100%)":"radial-gradient(ellipse at center,#e8e4d8,#c8c4b8)",border:`1px solid ${t.border}`,backgroundImage:`radial-gradient(circle,${isDark?"rgba(212,160,23,.06)":"rgba(0,0,0,.05)"} 1px,transparent 1px)`,backgroundSize:"24px 24px",touchAction:"none",boxShadow:`inset 0 0 60px rgba(0,0,0,.4)`}}>
                <div style={{position:"absolute",top:0,height:"100%",width:"3px",background:"linear-gradient(to bottom,transparent,rgba(80,140,255,.18),transparent)",animation:"scanline 8s linear infinite",pointerEvents:"none",left:0}}/>
                <div style={{position:"absolute",inset:0,background:`radial-gradient(circle at ${detFrac.x*100}% ${detFrac.y*100}%, ${signalColor}22 0%, transparent 30%)`,pointerEvents:"none",transition:"background .15s"}}/>
                {[0,1,2,3].map(i=>{const visible=signal>(i*.22);return(
                  <div key={i} style={{position:"absolute",left:`${detFrac.x*100}%`,top:`${detFrac.y*100}%`,width:54+i*28,height:54+i*28,borderRadius:"50%",border:`1.5px solid ${signalColor}`,animation:`ping 1.4s ease-out ${i*.28}s infinite`,opacity:visible?.85:0,transition:"opacity .4s, border-color .4s",pointerEvents:"none"}}/>
                );})}
                <div style={{position:"absolute",left:`${detFrac.x*100}%`,top:`${detFrac.y*100}%`,width:canDig?18:11,height:canDig?18:11,borderRadius:"50%",background:canDig?"#50ff90":signalColor,transform:"translate(-50%,-50%)",border:`2px solid ${canDig?"#20c060":"#33445a"}`,boxShadow:canDig?`0 0 16px #50ff90`:signal>.5?`0 0 8px ${signalColor}66`:"none",transition:"all .25s",pointerEvents:"none",animation:canDig?"pulseDot 1.2s ease-in-out infinite":"none",color:canDig?"#50ff90":signalColor}}/>
                {signal<.04&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}><span style={{...mu,fontSize:13,opacity:.5,fontStyle:"italic",letterSpacing:1}}>Sweep to scan</span></div>}
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
                <DigPit coin={foundCoin} shovelLevel={shovelLevel} onFound={onDigFound} onTooDeep={onTooDeep} t={t} isDark={isDark}/>
                <button onClick={onAbandon} style={{marginTop:4,padding:"8px 18px",borderRadius:8,border:`1px solid ${t.border}`,background:"transparent",cursor:"pointer",...F,fontSize:11,fontWeight:600,color:t.muted,letterSpacing:2,textTransform:"uppercase",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.color=t.textDim;e.currentTarget.style.borderColor=t.borderHi;}} onMouseLeave={e=>{e.currentTarget.style.color=t.muted;e.currentTarget.style.borderColor=t.border;}}>
                  ← Leave buried
                </button>
              </div>
            )}
            {phase==="brush"&&foundCoin&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,animation:"fadein .4s ease"}}>
                <div style={{...sectionTitle,textAlign:"center"}}>Brush It Off</div>
                <div style={{...microLabel,fontSize:10,padding:"5px 13px",background:t.surfaceHi,border:`1px solid ${t.border}`,borderRadius:6,color:t.textDim}}>🖌️ {brushData.label} · {Math.round(Math.min(0.95,brushData.shinyChance+buff.shinyBonus)*100)}% shiny{buff.shinyBonus>0&&<span style={{color:t.success,marginLeft:4}}>(+{Math.round(buff.shinyBonus*100)}%)</span>}</div>
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
                        <div style={{width:44,height:44,background:`linear-gradient(135deg,${t.surfaceHi},${t.surface})`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:`1px solid ${t.borderHi}`,boxShadow:`inset 0 1px 0 rgba(255,255,255,.05)`}}>{icon}</div>
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
                <div style={{...mu,fontSize:12,marginBottom:12,fontStyle:"italic",padding:"0 2px"}}>Tarot cards grant passive buffs while equipped (max 5). One copy each.</div>
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
                          <button onClick={()=>toggleTarot(card.id)} disabled={!equipped&&equippedTarots.length>=5} style={{padding:"7px 0",borderRadius:8,border:`1px solid ${equipped?t.success:(equippedTarots.length>=5?t.border:t.borderHi)}`,background:equipped?(isDark?"#0e2810":"#e8f8ee"):t.surfaceHi,cursor:(!equipped&&equippedTarots.length>=5)?"not-allowed":"pointer",...F,fontSize:11,fontWeight:800,color:equipped?t.success:(equippedTarots.length>=5?t.muted:t.textDim),letterSpacing:1,textTransform:"uppercase"}}>{equipped?"✓ Equipped":(equippedTarots.length>=5?"Slots Full":"Equip")}</button>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                      <div style={{width:54,height:54,background:`linear-gradient(135deg,${t.surfaceHi},${t.surface})`,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,border:`1px solid ${t.borderHi}`}}>⛏</div>
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

                  {/* Frame purchases — placeholder for now: frames are XP-gated, not coin-gated */}
                  <div style={{...card,padding:"14px 16px"}}>
                    <div style={{...FR,fontWeight:700,fontSize:14,marginBottom:8,letterSpacing:-.2}}>Banner Frames</div>
                    <div style={{...mu,fontSize:12,fontStyle:"italic"}}>Frames unlock with player level — equip them in your Profile.</div>
                  </div>
                </div>
              );
            })()}

            {/* ── WAGER VIEW (existing UI) ── */}
            {tavernView==="wager"&&(<>
            <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
              {[["toss","🪙","Coin Toss"],["crucible","⚗️","Crucible"],["roulette","🎰","Roulette"]].map(([id,ic,lbl])=>{const active=gambMode===id;return(
                <button key={id} onClick={()=>{setGambMode(id);resetGamble();resetRoulette();}} style={{padding:"9px 15px",borderRadius:10,border:`1px solid ${active?t.oxbloodHi:t.border}`,background:active?(isDark?"linear-gradient(135deg,#1a0810,#2a1018)":"linear-gradient(135deg,#f8eef3,#f0d8e0)"):"transparent",...F,fontSize:12,fontWeight:700,color:active?t.oxbloodHi:t.muted,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,letterSpacing:.5,display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}><span style={{fontSize:14}}>{ic}</span>{lbl}</button>
              );})}
            </div>

            {(gambMode==="toss"||gambMode==="crucible")&&(()=>{
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
      {phase==="banner"&&foundCoin&&<RevealBanner coin={foundCoin} onDone={onBannerDone}/>}
      {selectedCoin&&<CoinModal coin={coins.find(c=>c.id===selectedCoin.id)||selectedCoin} onClose={()=>setSelectedCoin(null)} onToggleLock={toggleLock} onSell={sellCoin} t={t} isDark={isDark}/>}
    </div>
  );
}
