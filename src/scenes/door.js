/* ══════════════════════════════════════════════════════════════════════
 *  The door scene
 *  ────────────────────────────────────────────────────────────────────
 *  Lifted wholesale from the prototype. mount() takes a canvas and a bus
 *  of callbacks into game state, and returns a teardown. Nothing in here
 *  touches React, the DOM outside its canvas, or persistence — the screen
 *  wrapper owns all of that.
 * ══════════════════════════════════════════════════════════════════════ */

export function mount(cv, bus){
  let running = true;

const W=195,H=422;

const ctx=cv.getContext("2d");
cv.width=W;cv.height=H;

function fit(){
  const stage=cv.parentElement;
  const bar=null;
  const cap=window.innerHeight-(bar?bar.offsetHeight:40)-36;
  const availH=Math.min(stage.clientHeight||cap,cap)-2;
  const availW=(stage.clientWidth||window.innerWidth-32)-2;
  const s=Math.max(1,Math.floor(Math.min(availW/W,availH/H)*2)/2);
  cv.style.width=(W*s)+"px";cv.style.height=(H*s)+"px";
}
window.addEventListener("resize",fit);
const ro=window.ResizeObserver?new ResizeObserver(fit):null; if(ro&&cv.parentElement)ro.observe(cv.parentElement);

const P={
  wall:"#050609", jamb:"#0d0f15", cloak:"#040507", cloakEdge:"#0b0e15",
  // cold-lit flesh: his is greener and deader, ours a shade warmer
  boneOut:"#141b1e", boneDark:"#2c383a", boneMid:"#5d6e6b", boneLite:"#92a39c", boneHi:"#b6c5bc",
  ourOut:"#0e1113", ourDark:"#252a2b", ourMid:"#444b4c", ourLite:"#666d6c", ourHi:"#848a86",
  glint:"#aef0d6", dust:"#3a4150",
  scrollOut:"#2b2a22", scrollDark:"#4f4b3c", scroll:"#776f58", scrollLite:"#9a9077",
  magic:"#8fd4b4", magicDim:"#3e6a5a",
  panel:"#0b0d12", panelLine:"#20242e",
};
const RARITY=[
  {n:"COMMON",c:"#6E6758"},{n:"UNCOMMON",c:"#7ad888"},{n:"RARE",c:"#80c0ff"},
  {n:"EPIC",c:"#c080ff"},{n:"LEGENDARY",c:"#f0c850"},
];
const HINTS=[
  "HE SMILES UPON THE HILLS OF SYMMETRY",
  "A LINE THAT NEVER LIFTED. HE APPROVES",
  "SOMETHING IN THE KNOTS PLEASES HIM",
  "HE HOLDS IT TO THE LIGHT. THE EMPTINESS SUITS HIM",
  "HE LINGERS ON THE CLOSED SHAPE",
];

const GX=72, GW=46;
const HEADY=242;
const HANDY=286;
const DRAWER_H=132;

let S;
function reset(){
  S={
    t:0, favour:0,
    mode:"idle",            // idle | drawer | give
    drawer:0,               // 0..1 slide
    scrolls:Array.from({length:8},()=>({r:pickR(),seed:(Math.random()*0xffffffff)>>>0})),
    sel:null,
    phase:"", anim:0,
    reach:0, want:0, curl:0, glow:0,
    orb:null,               // the scroll in flight
    ourK:0,                 // our hand's entry, 0..1
    holding:true,
    hint:"", hintA:0, blink:0, chest:0, giftR:0,
    dust:Array.from({length:22},()=>({x:GX+Math.random()*GW,y:Math.random()*H,v:0.04+Math.random()*0.10,p:Math.random()*6.28})),
    motes:[],
  };
  bus.favour("0");
}
function pickR(){
  const r=Math.random();
  return r<0.5?0:r<0.78?1:r<0.92?2:r<0.985?3:4;
}
reset();

const px=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x|0,y|0,w|0,h|0);};

/* ── the goblin's hand, built as a shaded sprite ───────────────────────
 * No outline. The form is a set of rounded capsules — forearm, palm,
 * knobbly jointed fingers, thumb — rasterised into a distance field and
 * lit from the doorway on the upper left, then quantised to five cold
 * tones. Joints carry a slightly fatter radius than the bones between
 * them, which is what makes an old hand read as old.
 */
const HK=0.304;                                  // overall hand scale
/* Authored from a photo reference: forearm running in from the left,
 * tapering to a narrow wrist, then widening into a broad palm held face
 * up. Thumb rides high with a heavy thenar mound behind it; the four
 * fingers fan out to the right and drift slightly downward, pinky
 * shortest and lowest. */
const HA={w:92,h:52,wristX:2,wristY:26};
// the authored hand is mirrored and swung down, so the forearm runs up and
// back behind the jamb while the hand hangs into the light below his chest
const HT={w:106,h:70,pivX:66,pivY:24,ang:-0.20};
const HS={w:Math.round(HT.w*HK),h:Math.round(HT.h*HK)};
function xform(x,y){
  let px0=92-x-66, py0=y-26;                       // mirror, then move to the wrist
  const c=Math.cos(HT.ang), sn=Math.sin(HT.ang);
  return {x:(px0*c-py0*sn)+HT.pivX, y:(px0*sn+py0*c)+HT.pivY};
}
const HAND_TONES=["#0d1314","#17201f","#222c29","#32403a","#55685e","#90a9a2"];
const handCache={};

function handGeom(curl){
  const C=[],J=[];
  C.push({x1:-8,y1:27,x2:20,y2:26,r1:10.0,r2:7.2});     // forearm into the wrist
  C.push({x1:20,y1:26,x2:42,y2:27,r1:8.4,r2:9.0});      // the palm, widening
  C.push({x1:25,y1:21,x2:36,y2:20,r1:6.2,r2:5.2});      // thenar mound behind the thumb
  // thumb, riding high and swinging out from the hand
  const ta=-0.54+curl*0.52;
  const t1x=34+Math.cos(ta)*14, t1y=19+Math.sin(ta)*14;
  C.push({x1:34,y1:19,x2:t1x,y2:t1y,r1:4.2,r2:3.3});
  C.push({x1:t1x,y1:t1y,x2:t1x+Math.cos(ta-0.3)*8,y2:t1y+Math.sin(ta-0.3)*8,r1:3.3,r2:2.4});
  J.push({x:t1x,y:t1y,r:3.6});
  // four fingers, fanning right and drifting down
  const F=[{x:45,y:21.5,a: 0.04,L:[16,11,7.0],r:3.6},
           {x:46,y:25.5,a: 0.15,L:[17,12,7.5],r:3.7},
           {x:45,y:29.5,a: 0.27,L:[16,11,7.0],r:3.5},
           {x:43,y:33.0,a: 0.42,L:[12, 9,5.5],r:3.0}];
  for(const f of F){
    let x=f.x,y=f.y;
    for(let sgi=0;sgi<3;sgi++){
      const openA=f.a+sgi*0.13;                   // relaxed, barely curled
      const shutA=f.a-1.05-sgi*0.62;              // closes up and over the palm
      const ang=openA+(shutA-openA)*curl;
      const nx=x+Math.cos(ang)*f.L[sgi], ny=y+Math.sin(ang)*f.L[sgi];
      const r1=f.r-sgi*0.44;
      C.push({x1:x,y1:y,x2:nx,y2:ny,r1:r1,r2:Math.max(1.6,f.r-(sgi+1)*0.44)});
      J.push({x:x,y:y,r:r1+0.5});
      x=nx;y=ny;
    }
    J.push({x:x,y:y,r:1.8});
  }
  for(const c of C){
    const a=xform(c.x1,c.y1), b=xform(c.x2,c.y2);
    c.x1=a.x*HK;c.y1=a.y*HK;c.x2=b.x*HK;c.y2=b.y*HK;c.r1*=HK;c.r2*=HK;
  }
  for(const j of J){const a=xform(j.x,j.y);j.x=a.x*HK;j.y=a.y*HK;j.r*=HK;}
  return {C,J};
}

function rasterForm(C,J,w,h,tones,depthR,L){
  const g={C,J};
  const off=document.createElement("canvas");off.width=w;off.height=h;
  const c2=off.getContext("2d");
  const img=c2.createImageData(w,h), d=img.data;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const v=fieldAt(g,x+0.5,y+0.5);
    const i=(y*w+x)*4;
    if(v>0){d[i+3]=0;continue;}
    const gx=fieldAt(g,x+1.5,y+0.5)-fieldAt(g,x-0.5,y+0.5);
    const gy=fieldAt(g,x+0.5,y+1.5)-fieldAt(g,x+0.5,y-0.5);
    const gl=Math.hypot(gx,gy)||1;
    const depth=Math.min(1,-v/depthR);
    const nz=Math.sqrt(depth), s=Math.sqrt(Math.max(0,1-nz*nz));
    // L = [lx, ly, lz, ambient, fill, rim, rimPower]
    const lam=(gx/gl)*s*L[0]+(gy/gl)*s*L[1]+nz*L[2];
    // the key is behind and to the left, so it grazes the edge rather than
    // filling the form: most of the light lands where the surface turns away
    const rimT=Math.pow(1-depth,L[6])*Math.max(0,lam);
    let lit=L[3]+Math.max(0,lam)*L[4]+rimT*L[5];
    let near=0;
    for(const c of C){
      const dx=c.x2-c.x1,dy=c.y2-c.y1,l2=dx*dx+dy*dy||1e-6;
      let t=((x+0.5-c.x1)*dx+(y+0.5-c.y1)*dy)/l2; t=t<0?0:t>1?1:t;
      const r=c.r1+(c.r2-c.r1)*t;
      if(Math.hypot(x+0.5-(c.x1+dx*t),y+0.5-(c.y1+dy*t))-r<0.8)near++;
    }
    if(near>1)lit-=0.14*(near-1);
    let tone=Math.round(lit*(tones.length-1));
    tone=tone<0?0:tone>tones.length-1?tones.length-1:tone;
    const hex=tones[tone];
    d[i]=parseInt(hex.slice(1,3),16);
    d[i+1]=parseInt(hex.slice(3,5),16);
    d[i+2]=parseInt(hex.slice(5,7),16);
    d[i+3]=255;
  }
  c2.putImageData(img,0,0);
  return off;
}

function fieldAt(g,x,y){
  let d=1e9;
  for(const c of g.C){
    const dx=c.x2-c.x1, dy=c.y2-c.y1;
    const l2=dx*dx+dy*dy||1e-6;
    let t=((x-c.x1)*dx+(y-c.y1)*dy)/l2;
    t=t<0?0:t>1?1:t;
    const r=c.r1+(c.r2-c.r1)*t;
    const v=Math.hypot(x-(c.x1+dx*t),y-(c.y1+dy*t))-r;
    if(v<d)d=v;
  }
  for(const j of g.J){
    const v=Math.hypot(x-j.x,y-j.y)-j.r;
    if(v<d)d=v;
  }
  return d;
}

function buildHand(curlStep){
  const curl=0.06+(curlStep/8)*0.94;
  const g=handGeom(curl);
  const L=[-0.62,-0.66,0.44, 0.19,0.28,0.92,1.5];
  const off=rasterForm(g.C,g.J,HS.w,HS.h,HAND_TONES,4.6*HK,L);
  const c2=off.getContext("2d");
  c2.globalAlpha=0.45;c2.fillStyle=HAND_TONES[1];
  const cr=xform(31,30);
  c2.fillRect(Math.round((cr.x-5)*HK),Math.round(cr.y*HK),Math.round(11*HK),1);
  c2.fillRect(Math.round((cr.x-4)*HK),Math.round((cr.y+1)*HK),Math.round(10*HK),1);
  c2.globalAlpha=1;
  return off;
}

/* ── our own hand, first person ───────────────────────────────────────
 * From the photo: the forearm rises from the lower right, pinches at
 * the wrist, and opens into a broad palm turned toward the camera with
 * the fingers up and fanned, thumb well out to the right. The scroll
 * rests on the open palm rather than being clutched. */
const OK=0.60;
const OA={w:62,h:94,palmX:31,palmY:50,armX:35};
const OS={w:Math.round(OA.w*OK),h:Math.round(OA.h*OK)};
const OUR_TONES=["#080b0c","#111616","#1a2021","#252d2e","#3a4547","#64747a"];
const OUR_LIT=["#0a1410","#13241c","#1e3528","#2c4a38","#426e54","#67a383"];
const ourCache={};
function ourGeom(){
  const C=[],J=[];
  C.push({x1:35,y1:106,x2:34,y2:66,r1:12,r2:7.6});          // forearm, near vertical
  C.push({x1:34,y1:64,x2:30,y2:40,r1:10.2,r2:9.8});         // the palm, facing us
  C.push({x1:37,y1:56,x2:43,y2:47,r1:6.6,r2:5.0});          // thenar mound
  // thumb, out to the right and well clear of the fingers
  C.push({x1:43,y1:47,x2:55,y2:38,r1:4.3,r2:3.4});
  C.push({x1:55,y1:38,x2:59,y2:30,r1:3.4,r2:2.5});
  J.push({x:55,y:38,r:3.7});
  // four fingers up and fanned — pinky left and shortest, middle tallest
  const F=[{x:18.5,y:39,a:-1.80,L:[13, 9.0,5.5],r:3.0},
           {x:24.5,y:37,a:-1.66,L:[17,12.0,7.0],r:3.4},
           {x:30.5,y:36,a:-1.53,L:[18,13.0,7.5],r:3.5},
           {x:36.5,y:37,a:-1.39,L:[16,11.0,7.0],r:3.3}];
  for(const f of F){
    let x=f.x,y=f.y;
    for(let sgi=0;sgi<3;sgi++){
      const ang=f.a+sgi*0.09;                 // relaxed, barely bent
      const nx=x+Math.cos(ang)*f.L[sgi], ny=y+Math.sin(ang)*f.L[sgi];
      const r1=f.r-sgi*0.42;
      C.push({x1:x,y1:y,x2:nx,y2:ny,r1:r1,r2:Math.max(1.6,f.r-(sgi+1)*0.42)});
      J.push({x:x,y:y,r:r1+0.5});
      x=nx;y=ny;
    }
    J.push({x:x,y:y,r:1.8});
  }
  for(const c of C){c.x1*=OK;c.y1*=OK;c.x2*=OK;c.y2*=OK;c.r1*=OK;c.r2*=OK;}
  for(const j of J){j.x*=OK;j.y*=OK;j.r*=OK;}
  return {C,J};
}
function ourSprite(){
  if(!ourCache.base){
    const g=ourGeom();
    const L=[-0.64,-0.54,0.46, 0.12,0.15,0.86,1.8];
    ourCache.base=rasterForm(g.C,g.J,OS.w,OS.h,OUR_TONES,4.6*OK,L);
    // the same hand under his green light, cross-faded in during the pull
    ourCache.lit=rasterForm(g.C,g.J,OS.w,OS.h,OUR_LIT,4.6*OK,[-0.70,-0.60,0.40, 0.16,0.30,0.95,1.4]);
    const c2=ourCache.base.getContext("2d");
    c2.globalAlpha=0.45;c2.fillStyle=OUR_TONES[1];
    c2.fillRect(24*OK,48*OK,13*OK,1);          // palm creases
    c2.fillRect(25*OK,49*OK,12*OK,1);
    c2.fillRect(27*OK,55*OK,10*OK,1);
    c2.globalAlpha=1;
  }
  return ourCache;
}

function handSprite(curl){
  const k=Math.max(0,Math.min(8,Math.round(curl*8)));
  if(!handCache[k])handCache[k]=buildHand(k);
  return handCache[k];
}
/* a filled block with a 1px dark edge — what makes pixel shapes read as solid */
function solid(x,y,w,h,fill,out){
  x|=0;y|=0;w|=0;h|=0;
  px(x,y,w,h,fill);
  px(x,y,w,1,out); px(x,y+h-1,w,1,out);
  px(x,y,1,h,out); px(x+w-1,y,1,h,out);
}
function rnd(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

/* ── the lit slot ────────────────────────────────────────── */
function drawGap(flick){
  px(0,0,W,H,P.wall);
  const A=[0x0b,0x0d,0x12], B=[0x39,0x42,0x56];
  for(let y=0;y<H;y++){
    const d=Math.abs(y-212)/(H*0.38);
    const k=Math.max(0,1-d*d)*flick;
    if(k<=0.03)continue;
    px(GX,y,GW,1,"rgb("+Math.round(lerp(A[0],B[0],k))+","+Math.round(lerp(A[1],B[1],k))+","+Math.round(lerp(A[2],B[2],k))+")");
  }
  px(GX-3,0,3,H,P.jamb); px(GX+GW,0,3,H,P.jamb);
  px(GX-1,0,1,H,"#000"); px(GX+GW,0,1,H,"#000");
}

function drawDust(){
  for(const m of S.dust){
    m.y-=m.v; m.p+=0.013;
    if(m.y<-2){m.y=H+2;m.x=GX+Math.random()*GW;}
    const x=m.x+Math.sin(m.p)*2.2;
    if(x<GX||x>GX+GW)continue;
    px(x,m.y,1,1,P.dust);
  }
}

/* ── the figure, barely there ────────────────────────────── */
function drawFigure(lean){
  // He stands hard against the far jamb and leans round it, so only his
  // near half ever clears the frame. No cloak: a bare skull, long swept
  // ears, a thin hunched body, all of it flat black against the slot.
  const cx=GX+GW-7-lean*5;
  const sway=Math.sin(S.t*0.012)*1.0;
  const HEADCY=HEADY+11;

  ctx.save();
  ctx.beginPath();ctx.rect(GX-2,0,GW+2,H);ctx.clip();   // the jamb cuts him off

  // ears: long, swept up and back off the sides of the skull
  for(let i=0;i<13;i++){
    const t=i/14;
    const h=Math.max(1,Math.round(10-t*t*9));       // broad at the skull, a point at the tip
    const top=HEADCY-4-Math.round(t*t*8+t*4)+sway*0.3;
    px(cx-8-i, top, 1, h, P.cloak);
    px(cx+7+i, top, 1, h, P.cloak);
  }
  // skull: a tall oval with a brow that juts over the eyes
  for(let y=HEADY;y<HEADY+23;y++){
    const t=(y-HEADY)/22;
    let hw=9*Math.sin(Math.PI*(0.14+t*0.82));
    if(t>0.42&&t<0.62)hw+=1.2;                       // brow ridge
    if(t>0.74)hw*=0.82;                              // jaw narrows
    px(cx-hw+sway*0.3,y,hw*2,1,P.cloak);
  }
  // short neck into narrow hunched shoulders
  for(let y=HEADY+22;y<HEADY+30;y++){
    const t=(y-HEADY-22)/8, hw=3.2+t*t*6;
    px(cx-hw+sway*0.3,y,hw*2,1,P.cloak);
  }
  // thin body dropping away into the dark
  const SH=HEADY+30;
  for(let y=SH;y<H;y++){
    const t=(y-SH)/60;
    const hw=8.5+t*3+Math.sin(y*0.13)*0.6;
    const x=cx+sway*Math.min(1,(y-SH)/50);
    px(x-hw,y,hw*2,1,P.cloak);
  }

  // eyes, set under the brow
  S.blink-=1;
  if(S.blink<-40 && Math.random()<0.012)S.blink=14;
  const shut=S.blink>0&&S.blink<9;
  if(!shut){
    const ey=HEADCY+1, pulse=0.72+Math.sin(S.t*0.035)*0.2+Math.sin(S.t*0.11)*0.07;
    const g=ctx.createRadialGradient(cx+0.5,ey,0,cx+0.5,ey,11);
    g.addColorStop(0,"rgba(174,240,214,"+(0.3*pulse)+")");
    g.addColorStop(0.45,"rgba(143,212,180,"+(0.11*pulse)+")");
    g.addColorStop(1,"rgba(143,212,180,0)");
    ctx.fillStyle=g;ctx.fillRect(cx-12,ey-12,24,24);
    ctx.globalAlpha=Math.min(1,pulse);
    px(cx-4,ey,2,1,P.glint); px(cx+2,ey,2,1,P.glint);
    ctx.globalAlpha=Math.min(1,pulse)*0.55;
    px(cx-4,ey+1,2,1,"#5fae90"); px(cx+2,ey+1,2,1,"#5fae90");
    ctx.globalAlpha=1;
  }
  ctx.restore();
  return cx;
}

/* ── his hand: palm up, open, waiting ────────────────────── */
function drawHand(cx,reach,curl){
  if(reach<=0.01)return null;
  const startX=cx+2;
  const out=reach*58;
  const tremor=Math.sin(S.t*0.17)*0.3+Math.sin(S.t*0.41)*0.2;
  const y=HANDY+Math.sin(S.t*0.016)*1.6+tremor;
  const open=1-curl;

  const cuffW=0;                       // bare arm now, no sleeve
  if(out<=17)return null;

  // the hand itself, slid out from behind the door jamb
  const sp=handSprite(curl);
  const ext=(out-17)*0.20;
  const sx=Math.round(cx-17.4-HT.pivX*HK+ext*0.5);
  const sy=Math.round(HEADY+47.5-HT.pivY*HK+ext*0.8);
  // the arm runs back behind the jamb, so the sprite is cut there too
  ctx.save();
  ctx.beginPath();ctx.rect(GX-2,0,GW+4,H);ctx.clip();
  ctx.drawImage(sp,sx,sy);
  // a rag bound round the arm where it leaves his body, hiding the join
  const sh=xform(-8,27);
  const shx=sx+sh.x*HK, shy=sy+sh.y*HK;
  const adx=Math.cos(HT.ang), ady=Math.sin(HT.ang);
  for(let t=-13;t<=11;t++){                       // a sleeve over the upper arm
    const k=(t+13)/24;
    const hh=Math.max(3,Math.round(7.2-k*3.0));   // thick at the body, tapering out
    px(shx+adx*t, shy+ady*t-hh/2, 1, hh, P.cloak);
  }
  for(let t=11;t<=14;t++){                        // its torn hem
    const hh=(t%2)?3:4;
    px(shx+adx*t, shy+ady*t-hh/2, 1, hh, P.cloak);
  }
  ctx.restore();

  const pp=xform(38,26);
  return {x:sx+Math.round(pp.x*HK),y:sy+Math.round(pp.y*HK)};
}

/* ── his magic, drawn when he pulls ──────────────────────── */
function drawGlow(palm,k){
  if(!palm||k<=0.01)return;
  const g=ctx.createRadialGradient(palm.x,palm.y,0,palm.x,palm.y,16+k*10);
  g.addColorStop(0,"rgba(143,212,180,"+(0.34*k)+")");
  g.addColorStop(0.5,"rgba(143,212,180,"+(0.12*k)+")");
  g.addColorStop(1,"rgba(143,212,180,0)");
  ctx.fillStyle=g;ctx.fillRect(palm.x-30,palm.y-30,60,60);
  // sigil ticks orbiting the palm
  for(let i=0;i<5;i++){
    const a=S.t*0.05+i*1.256, rr=9+Math.sin(S.t*0.07+i)*2.5;
    ctx.globalAlpha=k*0.9;
    px(palm.x+Math.cos(a)*rr,palm.y+Math.sin(a)*rr*0.7,1,1,P.magic);
    ctx.globalAlpha=1;
  }
}

/* ── our hand, first person, rising into frame ───────────── */
function drawOurHand(k,holding,rarity){
  if(k<=0.01)return null;
  const gx=Math.round(lerp(126,114,ease(k)));
  const gy=Math.round(lerp(H+56,340,ease(k)));

  const sp=ourSprite();
  const ox=Math.round(gx-OA.palmX*OK), oy=Math.round(gy-OA.palmY*OK);

  // the forearm carries on off the bottom of the frame
  const armTop=oy+OS.h-2;
  for(let yy=armTop;yy<H;yy++){
    const t=(yy-armTop)/Math.max(1,H-armTop);
    const hw=Math.round((12+t*3.5)*OK);
    const cxx=Math.round(ox+OA.armX*OK);
    px(cxx-hw,yy,hw*2,1,OUR_TONES[2]);
    px(cxx-hw,yy,1,1,OUR_TONES[0]);
    px(cxx+hw-1,yy,1,1,OUR_TONES[0]);
    px(cxx-hw+1,yy,2,1,OUR_TONES[3]);
    px(cxx-hw+3,yy,1,1,OUR_TONES[4]);
  }

  ctx.drawImage(sp.base,ox,oy);
  if(S.glow>0.01){                      // his light reaches across onto us
    ctx.globalAlpha=Math.min(1,S.glow)*0.8;
    ctx.drawImage(sp.lit,ox,oy);
    ctx.globalAlpha=1;
  }
  // the scroll lies across the open palm
  if(holding)drawScrollSprite(gx-1,Math.round(gy+2),rarity||0);

  return {x:gx,y:Math.round(gy+2)};
}

/* ── the scroll ───────────────────────────────────────────────────────
 * A rolled tube on the diagonal with an open mouth at the lower left and
 * a ribbon tied round the waist. The ribbon carries the rarity colour, so
 * a scroll says what it is by how it is tied rather than by a glow. */
const SK=0.82;
const SA=26;
const SS=Math.round(SA*SK);
const SCROLL_TONES=["#16130c","#292418","#423a26","#5c5338","#847657","#b0a58c"];
const SCROLL_LIT=["#131a15","#223029","#38493d","#547053","#7ea877","#bbe8b6"];
const scrollCache={};
function scrollSprite(r,charged){
  const key=r+(charged?"_c":"");
  if(scrollCache[key])return scrollCache[key];
  const C=[{x1:6,y1:20,x2:20,y2:6,r1:5.6,r2:5.4}];
  const J=[{x:6,y:20,r:6.3},{x:20,y:6,r:6.1}];          // the rolled lips
  for(const c of C){c.x1*=SK;c.y1*=SK;c.x2*=SK;c.y2*=SK;c.r1*=SK;c.r2*=SK;}
  for(const j of J){j.x*=SK;j.y*=SK;j.r*=SK;}
  // held, it catches only the slot's edge light; in his pull it is lit
  // from the palm it is travelling toward, and goes green with it
  const cv2=charged
    ? rasterForm(C,J,SS,SS,SCROLL_LIT,4.4*SK,[-0.62,-0.66,0.44, 0.30,0.40,0.95,1.2])
    : rasterForm(C,J,SS,SS,SCROLL_TONES,4.4*SK,[-0.62,-0.66,0.44, 0.15,0.20,0.86,1.5]);
  const c2=cv2.getContext("2d");
  const S_=(x,y,w,h,col)=>{c2.fillStyle=col;c2.fillRect(Math.round(x*SK),Math.round(y*SK),Math.max(1,Math.round(w*SK)),Math.max(1,Math.round(h*SK)));};

  // the open mouth at the lower-left end, looking into the roll
  c2.fillStyle=SCROLL_TONES[1];
  c2.beginPath();c2.ellipse(6.4*SK,19.6*SK,4.2*SK,3.0*SK,-0.78,0,6.283);c2.fill();
  c2.fillStyle=SCROLL_TONES[0];
  c2.beginPath();c2.ellipse(6.8*SK,19.2*SK,2.3*SK,1.5*SK,-0.78,0,6.283);c2.fill();

  // the ribbon, across the waist, in the rarity's colour
  const col=RARITY[r]?RARITY[r].c:"#8a8372";
  const dark=shade(col,-0.42), lite=shade(col,0.22);
  const ax=0.7071, ay=-0.7071;                       // along the tube
  for(let t=-6.4;t<=6.4;t+=0.34){
    for(let u=-2.1;u<=2.1;u+=0.34){
      const x=(13+ax*u-ay*t)*SK, y=(13+ay*u+ax*t)*SK;
      c2.fillStyle=(u<-0.9)?lite:(u>1.0?dark:col);
      c2.fillRect(Math.round(x),Math.round(y),1,1);
    }
  }
  // two tails falling away from the knot
  for(let i=0;i<7;i++){
    S_(15.4+i*0.55,15.2+i*0.95,1.6-i*0.1,1.3,i>4?dark:col);
    S_(17.2+i*0.75,14.4+i*0.72,1.5-i*0.1,1.2,i>3?dark:col);
  }
  scrollCache[key]=cv2;
  return cv2;
}
function shade(hex,k){
  let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  const f=v=>Math.max(0,Math.min(255,Math.round(k<0?v*(1+k):v+(255-v)*k)));
  return "rgb("+f(r)+","+f(g)+","+f(b)+")";
}
function drawScrollSprite(x,y,r,charged){
  ctx.drawImage(scrollSprite(r||0,!!charged),Math.round(x-SS/2),Math.round(y-SS/2));
}

/* ── the scroll as it hangs in your satchel ───────────────────────────
 * Unrolled between two rods and seen face on, so the sigil you drew is
 * the thing you pick it out by. The ink glows in the rarity's colour,
 * and the best ones smoke. */
const INVW=22, INVH=28;
const WOOD=["#1d1810","#3c2b18","#5e4526","#7f6138"];
const PARCH=["#1d1810","#6f6246","#90835d","#b0a378"];
const invCache={};
function invScroll(r,seed){
  const key=r+"_"+seed;
  if(invCache[key])return invCache[key];
  const cv2=document.createElement("canvas");cv2.width=INVW;cv2.height=INVH;
  const c2=cv2.getContext("2d");
  const F=(x,y,w,h,col)=>{c2.fillStyle=col;c2.fillRect(x,y,w,h);};
  const col=RARITY[r]?RARITY[r].c:"#8a8372";

  // parchment panel
  F(3,7,16,14,PARCH[0]);
  F(4,8,14,12,PARCH[2]);
  F(4,8,14,1,PARCH[3]);
  F(4,19,14,1,PARCH[1]);
  F(17,8,1,12,PARCH[1]);

  // the sigil: mirrored, grown from the scroll's own seed
  const rng=rnd(seed^0x51617);
  c2.fillStyle=col;
  const cells=[];
  for(let y=0;y<7;y++)for(let x=0;x<3;x++){
    if(rng()>0.52){cells.push([x,y]);}
  }
  for(const [x,y] of cells){
    F(8+x,11+y,1,1,col);
    F(14-x,11+y,1,1,col);
  }
  F(11,11,1,7,col);                               // a spine down the middle

  // rods top and bottom, with knobbed ends
  for(const ry of [3,20]){
    F(1,ry,20,4,WOOD[0]);
    F(2,ry+1,18,2,WOOD[2]);
    F(2,ry+1,18,1,WOOD[3]);
    F(0,ry,2,4,WOOD[1]); F(20,ry,2,4,WOOD[1]);
    F(0,ry+1,1,2,WOOD[2]); F(21,ry+1,1,2,WOOD[2]);
  }

  // the good ones smoke
  if(r>=3){
    c2.globalAlpha=0.75;
    F(8,1,1,2,col); F(9,0,1,2,col); F(13,1,1,2,col); F(12,0,1,1,col);
    c2.globalAlpha=1;
  }
  invCache[key]=cv2;
  return cv2;
}

/* ── the inventory drawer ────────────────────────────────── */
const CELLS=[];
(function(){
  for(let i=0;i<8;i++){
    const col=i%4,row=(i/4)|0;
    CELLS.push({x:12+col*44,y:24+row*36,w:40,h:32});
  }
})();
function drawerTop(){ return H-DRAWER_H*S.drawer; }

function drawDrawer(){
  if(S.drawer<=0.001)return;
  const top=drawerTop();
  ctx.globalAlpha=0.72*S.drawer;
  px(0,0,W,H,"#020305");
  ctx.globalAlpha=1;
  px(0,top,W,DRAWER_H,P.panel);
  px(0,top,W,1,P.panelLine);
  px(0,top+1,W,1,"#000");

  ctx.fillStyle="#5d6470";
  ctx.font='7px "Silkscreen", monospace';
  ctx.textAlign="left";
  ctx.fillText("YOUR SCROLLS",12,top+15);
  ctx.textAlign="right";
  ctx.fillText("TAP ONE",W-12,top+15);

  for(let i=0;i<S.scrolls.length;i++){
    const c=CELLS[i],s=S.scrolls[i];
    const bx=c.x,by=top+c.y;
    if(!s){ px(bx,by,c.w,c.h,"#070910"); continue; }
    const on=(S.sel===i);
    px(bx,by,c.w,c.h,on?"#141822":"#0e1118");
    ctx.strokeStyle=on?RARITY[s.r].c:"#1c2029";
    ctx.lineWidth=1;ctx.strokeRect(bx+0.5,by+0.5,c.w-1,c.h-1);
    // the scroll, hanging open
    const sp=invScroll(s.r,s.seed||0);
    if(s.r>0){                                   // the ink's glow, behind it
      ctx.globalAlpha=0.26+Math.sin(S.t*0.06+i)*0.08;
      const g=ctx.createRadialGradient(bx+c.w/2,by+c.h/2,0,bx+c.w/2,by+c.h/2,13);
      g.addColorStop(0,RARITY[s.r].c);g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g;ctx.fillRect(bx,by,c.w,c.h);
      ctx.globalAlpha=1;
    }
    ctx.drawImage(sp,Math.round(bx+(c.w-INVW)/2),Math.round(by+(c.h-INVH)/2));
  }

  // confirm
  const by=top+DRAWER_H-24, can=S.sel!==null;
  px(12,by,W-24,18,can?"#1b2a22":"#0c0e13");
  ctx.strokeStyle=can?P.magic:"#1c2029";ctx.lineWidth=1;
  ctx.strokeRect(12.5,by+0.5,W-25,17);
  ctx.fillStyle=can?P.magic:"#2e333c";
  ctx.font='7px "Silkscreen", monospace';ctx.textAlign="center";
  ctx.fillText(can?"OFFER IT":"SELECT A SCROLL",W/2,by+12);
}

function drawChest(cx,k){
  const y=HANDY+62,x=cx+10+k*32,w=24,h=18;
  px(x,y-h/2,w,h,"#2a2316");
  px(x,y-h/2,w,1,"#4a3d22"); px(x,y-h/2,1,h,"#4a3d22");
  px(x+w/2-3,y-3,6,6,P.ember); px(x+w/2-1,y-1,2,2,"#1a1408");
}

function drawGrain(){
  const img=ctx.getImageData(0,0,W,H),d=img.data;
  for(let i=0;i<d.length;i+=4){
    const n=(Math.random()*13)|0;
    d[i]=Math.min(255,d[i]+n);d[i+1]=Math.min(255,d[i+1]+n);d[i+2]=Math.min(255,d[i+2]+n);
  }
  ctx.putImageData(img,0,0);
  const g=ctx.createRadialGradient(W*0.56,H*0.54,40,W*0.56,H*0.54,H*0.82);
  g.addColorStop(0,"rgba(0,0,0,0)");
  g.addColorStop(1,"rgba(0,0,0,0.74)");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}

function drawHint(){
  if(S.hintA<=0.01)return;
  ctx.globalAlpha=Math.min(1,S.hintA)*0.9;
  ctx.fillStyle=P.boneLite;
  ctx.font='7px "Silkscreen", monospace';ctx.textAlign="center";
  const words=S.hint.split(" ");const lines=[];let line="";
  for(const w of words){
    if((line+" "+w).trim().length>30){lines.push(line.trim());line=w;}else line+=" "+w;
  }
  lines.push(line.trim());
  lines.forEach((l,i)=>ctx.fillText(l,W/2,46+i*10));
  ctx.globalAlpha=1;
  S.hintA-=0.004;
}

/* ── the giving sequence ─────────────────────────────────── */
function stepGive(){
  S.anim++;
  const A=S.anim;
  if(S.phase==="reach"){
    S.ourK=Math.min(1,A/46);
    if(A>=58){S.phase="pull";S.anim=0;}
  } else if(S.phase==="pull"){
    S.glow=Math.min(1,A/26);
    if(A>26&&!S.orb){
      S.orb={t:0};
    }
    if(S.orb){
      S.orb.t=Math.min(1,S.orb.t+0.016);
      if(Math.random()<0.5)S.motes.push({x:0,y:0,life:1,a:Math.random()*6.28,s:0.3+Math.random()*0.5});
      if(S.orb.t>=1){S.phase="close";S.anim=0;}
    }
  } else if(S.phase==="close"){
    S.curl=Math.min(1,S.curl+0.05);
    S.glow=Math.max(0,S.glow-0.03);
    S.ourK=Math.max(0,S.ourK-0.022);
    if(S.curl>=1){S.phase="withdraw";S.anim=0;}
  } else if(S.phase==="withdraw"){
    S.want=0;S.ourK=Math.max(0,S.ourK-0.03);
    if(S.reach<0.08){
      S.mode="idle";S.phase="";S.curl=0;S.orb=null;S.glow=0;S.want=1;
    }
  }
}

function frame(){
  S.t++;
  const flick=0.9+Math.sin(S.t*0.03)*0.05+Math.sin(S.t*0.11)*0.03+Math.random()*0.03;

  if(S.mode==="give")stepGive();

  const patience=0.3+Math.min(0.7,S.favour*0.14);
  if(S.mode!=="give")S.want=0.74+patience*0.2;
  S.reach+=(S.want-S.reach)*(S.phase==="withdraw"?0.05:0.035);
  if(S.mode!=="give"&&S.curl>0.001)S.curl+=(0-S.curl)*0.1;

  drawGap(flick);
  drawDust();
  const cx=drawFigure(Math.min(1,S.favour*0.16));

  const fade=ctx.createLinearGradient(0,316,0,404);
  fade.addColorStop(0,"rgba(5,6,9,0)");fade.addColorStop(1,"rgba(5,6,9,1)");
  ctx.fillStyle=fade;ctx.fillRect(GX-5,316,GW+10,H-316);

  const palm=drawHand(cx,S.reach,S.curl);
  drawGlow(palm,S.glow);
  if(S.chest>0){S.chest=Math.min(1,S.chest+0.012);drawChest(cx,S.chest);}

  // our hand, and the scroll either in it or in flight
  const grip=(S.mode==="give")?drawOurHand(S.ourK,!S.orb||S.orb.t<0.04,S.giftR):null;
  if(S.mode==="give"&&grip&&palm){
    if(!S.orb){
      /* the scroll is drawn inside the grip, by drawOurHand */
    }else{
      const t=ease(S.orb.t);
      const ox=lerp(grip.x,palm.x,t);
      const oy=lerp(grip.y,palm.y-7,t)-Math.sin(S.orb.t*Math.PI)*12;
      // motes streaming along the path
      for(let i=S.motes.length-1;i>=0;i--){
        const m=S.motes[i];m.life-=0.035;
        if(m.life<=0){S.motes.splice(i,1);continue;}
        ctx.globalAlpha=m.life*0.8;
        px(ox+Math.cos(m.a+S.t*0.1)*(1-m.life)*11, oy+Math.sin(m.a+S.t*0.1)*(1-m.life)*9, 1,1,P.magic);
        ctx.globalAlpha=1;
      }
      ctx.globalAlpha=0.5;
      const hg=ctx.createRadialGradient(ox,oy,0,ox,oy,13);
      hg.addColorStop(0,"rgba(143,212,180,.5)");hg.addColorStop(1,"rgba(143,212,180,0)");
      ctx.fillStyle=hg;ctx.fillRect(ox-14,oy-14,28,28);
      ctx.globalAlpha=1;
      drawScrollSprite(ox,oy+Math.sin(S.t*0.14)*1.2,S.giftR||0,true);
    }
  }

  drawHint();
  drawDrawer();
  drawGrain();

  // swipe affordance, only when nothing is happening
  if(S.mode==="idle"&&S.drawer<0.01){
    ctx.globalAlpha=0.3+Math.sin(S.t*0.04)*0.14;
    ctx.fillStyle="#6a6f7a";
    ctx.font='7px "Silkscreen", monospace';ctx.textAlign="center";
    ctx.fillText("^",W/2,H-20);
    ctx.globalAlpha=1;
  }
  if(running) requestAnimationFrame(frame);
}

/* ── input ───────────────────────────────────────────────── */
function toLocal(e){
  const r=cv.getBoundingClientRect();
  return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};
}
let down=null;
cv.addEventListener("pointerdown",e=>{down=toLocal(e);cv.setPointerCapture(e.pointerId);});
cv.addEventListener("pointermove",e=>{
  if(!down)return;
  const p=toLocal(e);
  if(S.mode==="idle"&&down.y-p.y>26){ S.mode="drawer"; down=null; }
});
cv.addEventListener("pointerup",e=>{
  if(!down)return;
  const p=toLocal(e),start=down;down=null;
  if(S.mode!=="drawer")return;
  // swipe back down closes it
  if(p.y-start.y>26){ S.mode="idle"; S.sel=null; return; }
  const top=drawerTop();
  if(p.y<top){ S.mode="idle"; S.sel=null; return; }
  for(let i=0;i<S.scrolls.length;i++){
    const c=CELLS[i];
    if(!S.scrolls[i])continue;
    if(p.x>=c.x&&p.x<=c.x+c.w&&p.y>=top+c.y&&p.y<=top+c.y+c.h){ S.sel=i; return; }
  }
  const by=top+DRAWER_H-24;
  if(S.sel!==null&&p.y>=by&&p.y<=by+18&&p.x>=12&&p.x<=W-12){
    S.mode="give";S.phase="reach";S.anim=0;S.ourK=0;S.orb=null;S.motes=[];
    S.favour++;bus.favour(S.favour);
    const r=S.scrolls[S.sel].r;
    S.giftR=r;
    S.scrolls[S.sel]=null;
    if(r>=1&&Math.random()<0.55+r*0.1){S.hint=HINTS[(Math.random()*HINTS.length)|0];S.hintA=2.2;}
    if(S.favour>=5&&S.chest===0)S.chest=0.01;
  }
});

// the drawer slides
(function slide(){
  const target=(S.mode==="drawer")?1:0;
  S.drawer+=(target-S.drawer)*0.18;
  if(S.drawer<0.001)S.drawer=0;
  requestAnimationFrame(slide);
})();

fit();
if(running) requestAnimationFrame(frame);

  return () => { running = false; removeEventListener("resize", fit); if (ro) ro.disconnect(); };
}
