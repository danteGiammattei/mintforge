/* ══════════════════════════════════════════════════════════════════════
 *  The scribe scene
 *  ────────────────────────────────────────────────────────────────────
 *  Same contract as door.js: mount(canvas, bus) → teardown. The judging
 *  lives in lib/sigil.js; this only draws the desk and collects strokes.
 * ══════════════════════════════════════════════════════════════════════ */

import { rolledScroll, openScroll } from "../lib/forms.js";
import { RAMP } from "../lib/pixelform.js";
import { analyse, rollScroll, RARITY, TRAITS, similarity } from "../lib/sigil.js";

export function mount(cv, bus){
  let running = true;

const W = 195, H = 422;
const ctx = cv.getContext("2d");
cv.width = W; cv.height = H;

function fit(){
  const stage = cv.parentElement, bar = null;
  const cap = window.innerHeight - (bar ? bar.offsetHeight : 40) - 36;
  const availH = Math.min(stage.clientHeight || cap, cap) - 2;
  const availW = (stage.clientWidth || window.innerWidth - 32) - 2;
  const s = Math.max(1, Math.floor(Math.min(availW / W, availH / H) * 2) / 2);
  cv.style.width = W * s + "px"; cv.style.height = H * s + "px";
}
addEventListener("resize", fit);
const ro = window.ResizeObserver ? new ResizeObserver(fit) : null; if (ro && cv.parentElement) ro.observe(cv.parentElement);

/* the sheet: where ink may land */
const SHEET = { x: 20, y: 84, w: 155, h: 212 };
const INK_MAX = 520;

const P = {
  room:"#080705", deskA:"#17120c", deskB:"#241c12", deskEdge:"#2f2518",
  sheetA:"#4a4230", sheetB:"#6d6245", sheetC:"#8b7e5c", sheetD:"#a3957008",
  ink:"#17140d", inkSoft:"#2a2417",
  candle:"#c9a74e",
};

let S;
function reset(){
  S = { t:0, strokes:[], cur:null, ink:0, made:0, phase:"draw", sealT:0, result:null, recent:[] };
  try { S.recent = JSON.parse(localStorage.getItem("mf_sigs") || "[]"); } catch(e) { S.recent = []; }
  bus.sealed("0");
}
reset();

const plot = (x,y,w,h,c) => { ctx.fillStyle=c; ctx.fillRect(x|0,y|0,w|0,h|0); };

/* ─── the desk, lit by one candle off to the left ─────────────────── */
function drawRoom(flick){
  plot(0,0,W,H,P.room);
  // the pool of candlelight, falling off hard
  for (let y=0;y<H;y++){
    const d = Math.abs(y-190)/(H*0.52);
    const k = Math.max(0, 1-d*d) * flick;
    if (k<=0.04) continue;
    const a=[0x0c,0x0a,0x07], b=[0x2a,0x21,0x14];
    const col = "rgb("+Math.round(a[0]+(b[0]-a[0])*k)+","+Math.round(a[1]+(b[1]-a[1])*k)+","+Math.round(a[2]+(b[2]-a[2])*k)+")";
    plot(0,y,W,1,col);
  }
  // the desk's far edge
  plot(0,66,W,2,P.deskEdge);
  plot(0,68,W,3,P.deskA);
}

/* ─── the sheet, pinned flat ──────────────────────────────────────── */
function drawSheet(){
  const {x,y,w,h} = SHEET;
  plot(x-2,y-2,w+4,h+4,"#0f0c08");
  // the parchment, lit by the candle off the left edge. Dithered between
  // adjacent tones rather than stepped, or the falloff bands into stripes.
  const LX=-26, LY=188, RANGE=276;
  const ramp=["#191610","#272218","#363022","#47402d","#5a5139","#6f6446"];
  const nz=rnd(0xc4d1e7);
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
    const d=Math.hypot(x+xx-LX,y+yy-LY)/RANGE;
    const k=Math.max(0,Math.min(1,1.06-d*d*1.22));
    const f=k*(ramp.length-1), lo=Math.floor(f);
    // dither with noise, not a matrix — an ordered grid reads as halftone
    const idx=Math.min(ramp.length-1, lo + ((f-lo) > nz() ? 1 : 0));
    plot(x+xx,y+yy,1,1,ramp[idx]);
  }
  // pins at the corners
  for (const [px0,py0] of [[x+3,y+3],[x+w-5,y+3],[x+3,y+h-5],[x+w-5,y+h-5]]){
    plot(px0,py0,2,2,"#2a2318"); plot(px0,py0,1,1,"#6e6048");
  }
}

/* ─── the ink ─────────────────────────────────────────────────────── */
function stamp(x,y,soft){
  const c = soft ? P.inkSoft : P.ink;
  plot(x-1,y,3,1,c); plot(x,y-1,1,3,c);
}
function drawStrokes(){
  for (const s of S.strokes) for (let i=0;i<s.length;i++){
    if (i){
      const a=s[i-1], b=s[i], n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y));
      for (let k=0;k<=n;k++) stamp(a.x+(b.x-a.x)*k/n, a.y+(b.y-a.y)*k/n, false);
    } else stamp(s[i].x,s[i].y,false);
  }
}

/* ─── chrome ──────────────────────────────────────────────────────── */
function drawChrome(){
  ctx.font='7px "Silkscreen", monospace';
  ctx.textAlign="left"; ctx.fillStyle="#6a6256";
  ctx.fillText("SCRIBE", 20, 30);

  // ink remaining
  const frac = Math.max(0, 1 - S.ink/INK_MAX);
  ctx.textAlign="right"; ctx.fillStyle = frac<0.18 ? "#9a5a3a" : "#5a5248";
  ctx.fillText("INK", W-20, 30);
  plot(W-20-62, 36, 62, 4, "#1d1812");
  plot(W-20-62, 36, Math.round(62*frac), 4, frac<0.18 ? "#9a5a3a" : "#7d6a44");

  // buttons
  const can = S.strokes.length>0;
  btn(20, 318, 48, 18, "UNDO", can);
  btn(74, 318, 48, 18, "CLEAR", can);
  btn(128, 318, 47, 18, "SEAL", can);
}
function btn(x,y,w,h,label,on){
  plot(x,y,w,h, on ? "#15110c" : "#0d0b08");
  ctx.strokeStyle = on ? "#3b3122" : "#1a1610"; ctx.lineWidth=1;
  ctx.strokeRect(x+0.5,y+0.5,w-1,h-1);
  ctx.font='7px "Silkscreen", monospace'; ctx.textAlign="center";
  ctx.fillStyle = on ? "#9d9077" : "#2e2a22";
  ctx.fillText(label, x+w/2, y+h/2+3);
}
const BTN = { undo:[20,318,48,18], clear:[74,318,48,18], seal:[128,318,47,18] };

/* ─── the seal: the scroll rolls up and the ribbon goes on ────────── */
function drawSeal(){
  const k = Math.min(1, S.sealT/58);
  const e = k<0.5 ? 2*k*k : 1-Math.pow(-2*k+2,2)/2;
  const r = S.result;
  const col = RARITY[r.rarity].c;

  ctx.globalAlpha = 0.94*e;
  plot(0,0,W,H,"#050403");
  ctx.globalAlpha = 1;

  const sp = rolledScroll(col, false);
  const cx = W/2, cy = 176 - e*8;
  const sc = e > 0.6 ? 3 : 2;            // integer only — never resample pixels
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sp, Math.round(cx - sp.width*sc/2), Math.round(cy - sp.height*sc/2),
                Math.round(sp.width*sc), Math.round(sp.height*sc));
  ctx.restore();

  if (k > 0.55){
    const a = Math.min(1, (k-0.55)/0.3);
    ctx.globalAlpha = a;
    ctx.font='7px "Silkscreen", monospace'; ctx.textAlign="center";
    ctx.fillStyle = col;
    ctx.fillText(RARITY[r.rarity].n, W/2, 246);
    ctx.fillStyle = "#5a5248";
    ctx.fillText(r.familiar ? "HE HAS SEEN THIS ONE BEFORE" : "SEALED", W/2, 262);
    ctx.globalAlpha = 1;
  }
  if (k >= 1){
    ctx.font='7px "Silkscreen", monospace'; ctx.textAlign="center";
    ctx.fillStyle = "#4a443a";
    ctx.fillText("TAP TO BEGIN ANOTHER", W/2, 300);
  }
}

/* ─── loop ────────────────────────────────────────────────────────── */
function frame(){
  S.t++;
  const flick = 0.88 + Math.sin(S.t*0.05)*0.07 + Math.sin(S.t*0.17)*0.04 + Math.random()*0.04;
  drawRoom(flick);
  drawSheet();
  drawStrokes();
  drawChrome();
  if (S.phase === "sealed"){ S.sealT++; drawSeal(); }
  if (running) requestAnimationFrame(frame);
}

/* ─── input ───────────────────────────────────────────────────────── */
const toLocal = e => {
  const r = cv.getBoundingClientRect();
  return { x:(e.clientX-r.left)/r.width*W, y:(e.clientY-r.top)/r.height*H };
};
const inSheet = p => p.x>=SHEET.x && p.x<=SHEET.x+SHEET.w && p.y>=SHEET.y && p.y<=SHEET.y+SHEET.h;
const hit = (p,b) => p.x>=b[0] && p.x<=b[0]+b[2] && p.y>=b[1] && p.y<=b[1]+b[3];

cv.addEventListener("pointerdown", e => {
  const p = toLocal(e);
  if (S.phase === "sealed"){ if (S.sealT>58) newSheet(); return; }
  if (hit(p,BTN.undo))  { S.strokes.pop(); recount(); return; }
  if (hit(p,BTN.clear)) { S.strokes=[]; recount(); return; }
  if (hit(p,BTN.seal))  { seal(); return; }
  if (!inSheet(p) || S.ink >= INK_MAX) return;
  S.cur = [{ x:p.x, y:p.y, t:performance.now() }];
  S.strokes.push(S.cur);
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener("pointermove", e => {
  if (!S.cur || S.phase!=="draw") return;
  const p = toLocal(e);
  if (!inSheet(p)) { S.cur = null; return; }
  const last = S.cur[S.cur.length-1];
  const d = Math.hypot(p.x-last.x, p.y-last.y);
  if (d < 1) return;
  if (S.ink + d > INK_MAX) { S.cur = null; return; }
  S.ink += d;
  S.cur.push({ x:p.x, y:p.y, t:performance.now() });
});
cv.addEventListener("pointerup", () => { S.cur = null; });

function recount(){
  S.ink = 0;
  for (const s of S.strokes) for (let i=1;i<s.length;i++)
    S.ink += Math.hypot(s[i].x-s[i-1].x, s[i].y-s[i-1].y);
  S.cur = null;
}
function seal(){
  const rel = S.strokes.map(s => s.map(p => ({ x:p.x-SHEET.x, y:p.y-SHEET.y, t:p.t })));
  const a = analyse(rel, { w:SHEET.w, h:SHEET.h });
  if (!a) return;
  S.result = rollScroll(a, S.recent);
  S.phase = "sealed"; S.sealT = 0;
  S.made++; bus.sealed(S.made);
  S.recent.unshift(S.result.signature); S.recent = S.recent.slice(0,6);
  try { localStorage.setItem("mf_sigs", JSON.stringify(S.recent)); } catch(e){}
  // the finished scroll goes into the satchel, hints and all
  bus.scrollSealed({
    rarity: S.result.rarity,
    seed: S.result.seed,
    hints: S.result.bumped.map(t => TRAITS[t].hint),
    familiar: S.result.familiar,
  });
}
function newSheet(){
  S.strokes = []; S.ink = 0; S.cur = null; S.phase = "draw"; S.result = null;
}

function rnd(seed){ let s=seed>>>0||1; return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;}; }

fit();
if (running) requestAnimationFrame(frame);
  return () => { running = false; removeEventListener("resize", fit); if (ro) ro.disconnect(); };
}
