import { useGame } from "../lib/GameContext.js";
import PickaxeIcon from "../components/PickaxeIcon.jsx";

/* ─── FORGE ───────────────────────────────────────────────────────────────
 * Equipment-upgrade tab. Two upgrade tracks: Shovel (depth/metal tiers) and
 * Brush (shiny chance). Each requires a specific recipe of coins to forge.
 *
 * The hero banner uses a warm orange gradient + flicker animation to read
 * as a literal forge. Repair button is shown when shovel durability < max
 * and routes to Tavern → repair sub-tab. */
export default function Forge() {
  const {
    coins, sacrificialCoins,
    shovelLevel, brushLevel, shovelDur, maxDur,
    setTab, setTavernView,
    forgeUp, canAfford,
    METALS, MAX_SH, MAX_BR, SHOVEL_UPS, BRUSH_UPS, SHOVEL_TIER_CAP,
    t, isDark, F, FR, mu, microLabel, card,
  } = useGame();
  return (
    <div className="animate-fadein">
      {/* Hero banner — flicker-lit forge with warm orange ember glow */}
      <div
        className="-mx-3.5 -mt-[18px] mb-4 px-[22px] pt-9 pb-5 relative overflow-hidden"
        style={{
          background:isDark?"linear-gradient(to bottom,#0a0402 0%,#1a0a04 40%,transparent 100%)":"linear-gradient(to bottom,#f0d8a0 0%,#e8c890 40%,transparent 100%)",
          borderBottom:`1px solid ${isDark?"rgba(200,80,10,.18)":"rgba(180,80,20,.2)"}`,
        }}>
        {/* Embers — three soft radial halos at the bottom */}
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[280px] h-[70px] rounded-full pointer-events-none"
          style={{ background:`radial-gradient(ellipse,${isDark?"rgba(255,90,10,.28)":"rgba(220,80,10,.28)"},transparent 70%)`, filter:"blur(2px)" }}/>
        <div
          className="absolute bottom-0 left-[22%] w-[90px] h-[50px] rounded-full pointer-events-none"
          style={{ background:`radial-gradient(ellipse,${isDark?"rgba(255,60,5,.18)":"rgba(220,60,10,.2)"},transparent 70%)` }}/>
        <div
          className="absolute bottom-0 right-[18%] w-[70px] h-[50px] rounded-full pointer-events-none"
          style={{ background:`radial-gradient(ellipse,${isDark?"rgba(255,60,5,.18)":"rgba(220,60,10,.2)"},transparent 70%)` }}/>
        <div className="flex gap-3.5 items-center relative">
          <div className="text-[40px] animate-flicker" style={{ filter:"drop-shadow(0 2px 6px rgba(255,80,10,.4))" }}>⚒</div>
          <div className="flex-1">
            <div className="font-extrabold text-[22px] mb-[3px] -tracking-[0.3px]" style={{ ...FR, color:t.text }}>The Forge</div>
            <div className="text-xs italic" style={mu}>Sacrifice coins. Earn the right to dig deeper.</div>
          </div>
          <div className="text-2xl opacity-50 animate-flicker" style={{ animationDuration:"1.8s" }}>🔥</div>
        </div>
      </div>

      {/* Available-coins ledger */}
      {coins.length>0&&(
        <div className="px-3.5 py-[11px] mb-3.5 flex gap-3 flex-wrap items-center" style={card}>
          <span className="text-[10px]" style={microLabel}>Available</span>
          {METALS.map((m,i)=>{
            const have=sacrificialCoins.filter(c=>c.metalIdx===i).length;
            const lockedCnt=coins.filter(c=>c.metalIdx===i&&c.locked).length;
            return (have>0||lockedCnt>0)&&(
              <div key={i} className="flex items-center gap-[5px]">
                <div className="w-2 h-2 rounded-sm" style={{ background:m.hl, boxShadow:`0 0 4px ${m.hl}66` }}/>
                <span className="text-[11px] font-bold tabular-nums" style={{ ...F, color:m.hl }}>
                  {have}
                  {lockedCnt>0&&<span className="font-medium text-[10px]" style={{ color:t.muted }}> +{lockedCnt}🔒</span>}
                  <span className="font-medium ml-0.5" style={{ color:t.muted }}>×</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Upgrade rows — Shovel + Brush tracks */}
      <div className="flex flex-col gap-3.5">
        {[
          { type:"shovel", icon:"⛏",  label:"Shovel", level:shovelLevel, max:MAX_SH, ups:SHOVEL_UPS, stat:"Unlocks up to",  statV:l=>METALS[SHOVEL_TIER_CAP[Math.min(l-1,SHOVEL_TIER_CAP.length-1)]]?.name??"Copper" },
          { type:"brush",  icon:"🖌️", label:"Brush",  level:brushLevel,  max:MAX_BR, ups:BRUSH_UPS,  stat:"Shiny chance",   statV:l=>`${Math.round((BRUSH_UPS[l]?.shinyChance??0.01)*100)}%` },
        ].map(({type,icon,label,level:lv,max,ups,stat,statV})=>{
          const nl=lv+1;
          const nu=nl<=max?ups[nl]:null;
          const maxed=lv>=max;
          const afford=nu&&canAfford(nu.cost);
          return (
            <div key={type} className="overflow-hidden" style={card}>
              {/* Row header — icon + name + level pip strip */}
              <div className="px-[17px] py-[15px] flex justify-between items-center" style={{ borderBottom:`1px solid ${t.border}` }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[22px]"
                    style={{
                      background:`linear-gradient(135deg,${t.surfaceHi},${t.surface})`,
                      border:`1px solid ${t.borderHi}`,
                      boxShadow:`inset 0 1px 0 rgba(255,255,255,.05)`,
                    }}>
                    {type==="shovel"?<PickaxeIcon level={lv} size={32}/>:icon}
                  </div>
                  <div>
                    <div className="font-bold text-[15px] -tracking-[0.2px]" style={{ ...FR, color:t.text }}>{label}</div>
                    <div className="text-[11px]" style={mu}>{ups[lv]?.label??`Lv.${lv} Base`}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-[22px] -tracking-[1px] leading-none" style={{ ...FR, color:t.accent }}>Lv.{lv}</div>
                  <div className="flex gap-[3px] mt-[5px] justify-end">
                    {Array.from({length:max},(_,i)=>(
                      <div key={i} className="w-2.5 h-1 rounded-sm" style={{ background:i<lv?t.accent:t.faint, boxShadow:i<lv?`0 0 4px ${t.accent}66`:"none" }}/>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row body — durability (shovel only) + cost recipe + forge button */}
              <div className="px-[17px] py-[13px]">
                {type==="shovel"&&(()=>{
                  const durPct=Math.round((shovelDur/maxDur)*100);
                  const durColor=durPct>50?t.success:durPct>20?t.accent:t.danger;
                  return (
                    <div className="mb-3 px-3 py-2.5 rounded-lg" style={{ background:t.surfaceHi, border:`1px solid ${t.border}` }}>
                      <div className="flex justify-between items-center mb-1.5 text-[11px]" style={F}>
                        <span className="uppercase tracking-[1.5px] font-bold" style={{ color:t.muted }}>Durability</span>
                        <span className="font-extrabold tabular-nums" style={{ color:durColor }}>{shovelDur} / {maxDur}</span>
                      </div>
                      <div className="h-1.5 rounded-[3px] overflow-hidden" style={{ background:t.faint, border:`1px solid ${t.border}` }}>
                        <div className="h-full transition-[width] duration-[400ms]" style={{ width:`${durPct}%`, background:`linear-gradient(to right,${durColor}88,${durColor})`, boxShadow:`0 0 6px ${durColor}66` }}/>
                      </div>
                      {shovelDur<maxDur&&(
                        <button
                          onClick={()=>{ setTab("tavern"); setTavernView("repair"); }}
                          className="mt-2 w-full py-[7px] rounded-[7px] text-[10px] font-bold uppercase tracking-[2px] cursor-pointer"
                          style={{ ...F, border:`1px solid ${t.border}`, background:"transparent", color:t.textDim }}>
                          ⚒ Repair in Tavern
                        </button>
                      )}
                    </div>
                  );
                })()}

                <div className="flex justify-between mb-2.5 text-xs items-baseline" style={F}>
                  <span className="tracking-[0.5px]" style={{ color:t.muted }}>{stat}</span>
                  <span className="font-bold text-sm italic" style={{ ...FR, color:t.text }}>{statV(lv)}</span>
                </div>

                {maxed?(
                  <div className="text-center text-[13px] font-extrabold py-2 uppercase tracking-[3px]" style={{ ...F, color:t.accent }}>✦ Fully Forged</div>
                ):(
                  nu?(
                    <>
                      <div className="text-xs mb-2.5 font-medium" style={{ ...F, color:t.textDim }}>
                        <span style={{ color:t.muted }}>→</span> {nu.label}
                        <span className="font-normal ml-1.5 italic" style={{ color:t.muted }}>· {nu.desc}</span>
                      </div>
                      <div className="flex gap-1.5 mb-[11px] flex-wrap">
                        {(nu.cost||[]).map(({m:mi,n},ci)=>{
                          const mt=METALS[mi];
                          const have=sacrificialCoins.filter(c=>c.metalIdx===mi).length;
                          const ok=have>=n;
                          return (
                            <div key={ci} className="flex items-center gap-1.5 px-[11px] py-1.5 rounded-[7px]"
                              style={{
                                background:ok?`${mt.dark}44`:t.surfaceHi,
                                border:`1px solid ${ok?mt.eng+"66":t.border}`,
                              }}>
                              <div className="w-[7px] h-[7px] rounded-sm" style={{ background:ok?mt.hl:t.muted, boxShadow:ok?`0 0 4px ${mt.hl}88`:"none" }}/>
                              <span className="text-xs font-bold tabular-nums" style={{ ...F, color:ok?mt.hl:t.muted }}>{n}× {mt.name}</span>
                              <span className="text-[10px] font-semibold opacity-80" style={{ ...F, color:ok?t.success:t.muted }}>({have})</span>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        onClick={()=>forgeUp(type)}
                        disabled={!afford}
                        className="w-full py-[11px] rounded-[10px] text-[13px] font-extrabold uppercase tracking-[2px] transition-all duration-150"
                        style={{
                          ...F,
                          border:`1px solid ${afford?t.accentDim:t.border}`,
                          cursor:afford?"pointer":"not-allowed",
                          background:afford?(isDark?"linear-gradient(135deg,#2a1e08,#604a14)":"linear-gradient(135deg,#ede0b0,#d4a830)"):t.surfaceHi,
                          color:afford?(isDark?t.accent:t.accentInk):t.muted,
                          boxShadow:afford?`0 4px 12px ${t.accent}22`:"none",
                        }}>
                        {afford?"⚒ Forge · +200 XP":"Missing materials"}
                      </button>
                    </>
                  ):(
                    <div className="text-xs py-2 text-center italic" style={mu}>Forge to unlock upgrades</div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
