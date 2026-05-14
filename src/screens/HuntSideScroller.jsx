import { useEffect, useRef, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { coinRarity } from "../lib/coin.js";
import { LOCATION_BY_ID, DEFAULT_LOCATION_ID, RARITIES } from "../lib/data.js";
import SpriteFrame from "../components/SpriteFrame.jsx";
import BrushReveal from "../components/BrushReveal.jsx";
import CoinCanvas from "../components/CoinCanvas.jsx";

/* ════════════════════════════════════════════════════════════════════════
 *  HUNT — SIDE-SCROLLER
 *  ────────────────────────────────────────────────────────────────────────
 *  Replaces the old metal-detector field/sweep loop with a side-scrolling
 *  world. The character runs in place at center; the world moves past
 *  behind them. Tap anywhere → world freezes → character digs at center
 *  → result resolves → world resumes (or transitions to brush phase).
 *
 *  Coin placement is world-driven: the engine schedules "windows" at a
 *  loose cadence (every ~6s ±25%). When a window is currently in
 *  tap-eligible range, taps land. When it isn't, taps miss.
 *
 *  Glints: a fraction of windows surface a small gold spark on the
 *  ground while the window is active, hinting at the right tap moment.
 *  The remaining windows are silent — players who tap by feel still
 *  catch them sometimes, players who watch carefully catch more.
 *
 *  Phases:
 *    scroll  — world scrolling, accepting taps
 *    digging — dig animation playing, no input
 *    found   — coin emerging + flying up + spinning + scaling
 *    fading  — full screen fade-to-black before brush
 *    brush   — handed off to BrushReveal component
 *
 *  Tarot integration:
 *    - The Hermit: forces every coin window to glint. With Hermit equipped
 *      the "spot silent finds" skill collapses — every window is cued.
 *      Implemented in the window spawn block below; buff.revealRarity flag.
 *    - Wheel of Fortune (every Nth find → guaranteed rare) → still
 *      applies via `findStreak` + `buff.guaranteedEvery` on hit resolve.
 *    - The Sun (rarity floor) → applies in onDigFound via buff.rarityFloor.
 *    - The Chariot (first-strike bonus) → no-op in v1; the dig grid that
 *      consumed first-strike chance is gone. Could be repurposed later as
 *      "first tap of session always lands" or similar.
 *
 *  Durability rules:
 *    Per the design discussion, only HITS consume shovel durability.
 *    Misses are free. Keeps the loop forgiving and naturally throttles
 *    wasted taps (you don't pay for inattentive play, just don't progress).
 * ════════════════════════════════════════════════════════════════════════ */

// How close to screen center a window must be to count as "in tap zone".
// Center-relative ratio of viewport width. ±0.18 = a generous middle ~36%.
const TAP_TOLERANCE = 0.18;

// Visual: where the character stands in the viewport (horizontal ratio).
// 0.5 = exact center. Keep this consistent with TAP_TOLERANCE check.
const CHARACTER_X_RATIO = 0.5;

// How long the glint cue is visible after spawn. At scrollSpeed=0.3 the
// world moves ~0.55 viewport-fractions in 1800ms, so the glint tracks the
// coin from screen-entry through the centre of the tap zone before fading.
// Long enough that the player can actually see and time the hit; short
// enough that the glint isn't just a "tap now" arrow that removes skill.
const GLINT_VISIBLE_MS = 1800;

export default function Hunt() {
  const {
    foundCoin, setFoundCoin, phase, setPhase,
    onDigFound, onBrushDone, brushData, buff,
    shovelLevel, shovelDur, maxDur,
    setTab, setTavernView,
    huntCoin,
    findStreak,
    t, isDark, F, FR, mu, microLabel, sectionTitle,
  } = useGame();

  // Active location (v1: always the default "field"). State is here so
  // a future map screen can swap it without remounting Hunt.
  const [locationId] = useState(DEFAULT_LOCATION_ID);
  const loc = LOCATION_BY_ID[locationId];

  // Engine state held in a ref to avoid React re-renders 60×/sec.
  // Only `tickFrame` triggers a render to refresh visible elements.
  const engine = useRef({
    scrollX: 0,
    worldFrozen: false,
    windows: [],          // array of { id, x, glint, expired, hit }
    nextSpawnAt: performance.now() + 800, // first window appears after 0.8s — gives the player a beat to read the screen, then play starts
    lastTime: performance.now(),
  });
  const [tickFrame, setTickFrame] = useState(0);
  const viewportRef = useRef(null);
  const rafRef = useRef(null);

  // Local result state: when a hit happens we capture the coin here for
  // the emerge/spin/fade sequence. Once brush completes the coin is
  // committed via onDigFound() (which already exists in MintForge).
  const [pendingCoin, setPendingCoin] = useState(null);
  const [feedback, setFeedback] = useState(null); // {kind:'miss'|'hit', t:0..1}

  // When phase transitions back to "hunt" (after brush completes and the
  // banner animation finishes), the engine needs to unfreeze. Without
  // this, the world stays paused indefinitely after the first find.
  useEffect(() => {
    if (phase === "hunt") {
      engine.current.worldFrozen = false;
      setPendingCoin(null);
      setFeedback(null);
    }
  }, [phase]);

  // ── Render loop ───────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const loop = (now) => {
      if (!active) return;
      const e = engine.current;
      const dt = Math.min(64, now - e.lastTime); // clamp tab-resume jumps
      e.lastTime = now;

      if (!e.worldFrozen) {
        e.scrollX += (loc.scrollSpeed * dt) / 1000;

        // Spawn new windows on schedule
        if (now >= e.nextSpawnAt) {
          const id = `${now}-${Math.random()}`;
          // Hermit tarot ("the lantern lights the path") forces every
          // window to glint, removing silent finds. Without Hermit, the
          // location's glintFrequency determines the ratio of cued vs
          // silent windows (default 0.6 = 60% glinted).
          const glint = buff.revealRarity ? true : Math.random() < loc.glintFrequency;
          e.windows.push({
            id,
            spawnedAt: now,
            // Spawn position: right at the viewport edge (screenRatio=1.0)
            // so the glint cue is visible immediately. Was 1.2 (0.2 vp off-
            // screen), which made the glint fire invisibly when the world
            // scrolls slowly. The window then drifts left across the screen
            // and is tappable while screenRatio is within ±TAP_TOLERANCE of
            // CHARACTER_X_RATIO.
            worldX: e.scrollX + 1.0,
            glint,
            expired: false,
            hit: false,
          });
          // Schedule next: spacing ± 25%
          const jitter = 0.5 + Math.random();
          e.nextSpawnAt = now + loc.windowSpacingMs * jitter;
        }

        // Expire windows that have scrolled fully off the left.
        // worldX < scrollX - 1 means window is more than one viewport
        // to the left of where we currently are.
        e.windows = e.windows.filter(w => w.worldX > e.scrollX - 1.2);
      }

      // Advance feedback fade
      if (feedback) {
        // handled below via timeout
      }

      setTickFrame(f => (f + 1) % 1000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(rafRef.current); };
  }, [loc, feedback]);

  // ── Tap handling ──────────────────────────────────────────────────────
  const handleTap = (e) => {
    if (phase !== "hunt") return;
    if (engine.current.worldFrozen) return;
    if (shovelDur <= 0) return; // pickaxe broken; player must repair first

    const eng = engine.current;

    // Find the closest active window. A window's screen position is
    // computed from worldX - scrollX (in viewport units, where 0 = left
    // edge, 1 = right edge of viewport). Character is at CHARACTER_X_RATIO.
    let bestWindow = null;
    let bestDist = Infinity;
    for (const w of eng.windows) {
      if (w.hit || w.expired) continue;
      const screenRatio = w.worldX - eng.scrollX; // 0..1+ relative position
      const dist = Math.abs(screenRatio - CHARACTER_X_RATIO);
      if (dist < bestDist) {
        bestDist = dist;
        bestWindow = w;
      }
    }

    const isHit = bestWindow && bestDist < TAP_TOLERANCE;

    if (isHit) {
      bestWindow.hit = true;
      eng.worldFrozen = true;
      // Bind the current huntCoin as the foundCoin immediately so
      // onDigFound (which reads from foundCoin state) can use it after
      // the dig animation completes.
      setFoundCoin(huntCoin);
      setPhase("dig"); // play dig animation
      // The dig anim's onComplete (from SpriteFrame) calls handleDigAnimDone
      // below; the hit branch there triggers the emerge animation.
    } else {
      // Miss: brief freeze + dig anim + resume. No durability cost.
      eng.worldFrozen = true;
      setPhase("dig");
      setFeedback({ kind: "miss", at: performance.now() });
    }
  };

  // ── After dig animation completes ─────────────────────────────────────
  // Called when the SpriteFrame finishes the (non-loop) dig animation.
  const handleDigAnimDone = () => {
    if (feedback?.kind === "miss") {
      // Resume world, clear feedback shortly after
      setTimeout(() => {
        engine.current.worldFrozen = false;
        setPhase("hunt");
        setFeedback(null);
      }, 200);
      return;
    }

    // Hit path: foundCoin was already set when the tap landed. Move to
    // the "found" phase which triggers the emerge animation.
    setPendingCoin(huntCoin);
    setPhase("found");
  };

  // ── After "found" emerge animation ────────────────────────────────────
  // Coin has flown up + spun + scaled. Now fade to black, then commit
  // the find via onDigFound (which transitions to brush phase).
  const handleFoundDone = () => {
    setPhase("fading");
    setTimeout(() => {
      // (8, 16) = "neutral" dig — no first-try bonus, no all-cells penalty.
      // The side-scroller's tap is its own gameplay; we don't double-reward
      // it with a rarity boost. Existing rarity distribution stays intact.
      onDigFound(8, 16);
      // onDigFound sets phase to "brush" internally, so the brush UI
      // takes over from the same Hunt component below.
    }, 500);
  };

  // ── Render ────────────────────────────────────────────────────────────

  // Brush phase: same as before, just rendered here.
  if (phase === "brush" && foundCoin) {
    return (
      <div className="animate-fadein flex flex-col items-center gap-3.5">
        <div className="text-center" style={sectionTitle}>Brush It Off</div>
        {(() => {
          const r = RARITIES[coinRarity(foundCoin)] || RARITIES[0];
          return (
            <div
              className="text-[10px] px-[13px] py-1.5 rounded-md font-extrabold tracking-[1.5px] flex items-center gap-1.5"
              style={{
                ...microLabel,
                background: `${r.color}15`,
                border: `1px solid ${r.color}66`,
                color: r.color,
                boxShadow: `0 0 10px ${r.color}22`,
              }}>
              <span>Rolled · {r.name}</span>
            </div>
          );
        })()}
        <div
          className="text-[10px] px-[13px] py-[5px] rounded-md"
          style={{ ...microLabel, background: t.surfaceHi, border: `1px solid ${t.border}`, color: t.textDim }}>
          🖌️ {brushData.label} · {Math.round(Math.min(0.95, brushData.shinyChance + buff.shinyBonus) * 100)}% shiny
        </div>
        <BrushReveal
          coin={foundCoin}
          brushAlpha={brushData.alpha}
          shinyChance={Math.min(0.95, brushData.shinyChance + buff.shinyBonus)}
          onRevealed={onBrushDone}
          t={t}
        />
      </div>
    );
  }

  // Otherwise: the side-scrolling viewport
  const eng = engine.current;
  const charXPx = `${CHARACTER_X_RATIO * 100}%`;

  return (
    <div className="animate-fadein">
      {/* Header strip — durability + location name */}
      <div className="flex items-baseline justify-between mb-3 px-0.5">
        <div style={sectionTitle}>{loc.name}</div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] opacity-65">⛏</span>
          <div className="w-[42px] h-[5px] rounded-[3px] overflow-hidden" style={{ background: t.faint, border: `1px solid ${t.border}` }}>
            <div
              className="h-full transition-[width] duration-300"
              style={{
                width: `${Math.round((shovelDur / maxDur) * 100)}%`,
                background: shovelDur > maxDur * .5 ? t.success : shovelDur > maxDur * .2 ? t.accent : t.danger,
              }}/>
          </div>
          <span className="text-[9px] font-semibold tabular-nums" style={{ ...F, color: t.muted }}>{shovelDur}/{maxDur}</span>
        </div>
      </div>

      {/* Viewport — the side-scrolling world */}
      <div
        ref={viewportRef}
        onClick={handleTap}
        onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
        className="relative w-full h-[280px] rounded-2xl overflow-hidden cursor-pointer select-none"
        style={{
          touchAction: "none",
          // When real art layers are present, the sky webp covers the full viewport;
          // use a neutral warm tone as the load-state fallback. Procedural mode
          // keeps the original gradient.
          background: loc.bgLayers.length > 0
            ? "#c0a87a"
            : isDark
              ? "linear-gradient(to bottom, #1a1408 0%, #2a1c0a 60%, #3a2810 100%)"
              : "linear-gradient(to bottom, #d8c8a0 0%, #c8b890 60%, #a89870 100%)",
          border: `1px solid ${isDark ? "#2a1a0a" : "#a08868"}`,
          boxShadow: "inset 0 0 60px rgba(0,0,0,.45)",
        }}>
        {/* ── Parallax background layers ──
            When bgLayers is populated (real art), render each as a
            CSS background-image div stacked deepest-first. The sky layer
            (scrollMul=0) is static and covers the viewport fully. The
            transparent RGBA layers scroll at their respective multipliers
            using repeat-x so the world tiles infinitely.
            Falls back to ProceduralBackdrop when no art is configured.

            SCROLL_PX_SCALE converts viewport-fraction-of-scroll → pixels.
            Higher = faster apparent scroll for a given scrollSpeed. With
            scrollSpeed=0.3 vp/sec, 333 → ~100px/sec for the near layer,
            which reads as a comfortable walking pace. */}
        {loc.bgLayers.length === 0 ? (
          <ProceduralBackdrop scrollX={eng.scrollX} isDark={isDark}/>
        ) : (
          loc.bgLayers.map((layer, i) => {
            // Scroll constant: pixels of parallax movement per viewport-fraction
            // of world scroll. 150 with scrollSpeed=0.3 gives the near layer
            // ~45px/sec — a chill walking pace that doesn't pull the eye
            // away from the gameplay action. Bump higher for a more frantic
            // feel; lower for a slow-stroll feel.
            const SCROLL_PX_SCALE = 150;
            const isStatic = layer.scrollMul === 0;
            const offsetPx = isStatic ? 0 : -(eng.scrollX * SCROLL_PX_SCALE * layer.scrollMul);
            return (
              <div
                key={i}
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${layer.path})`,
                  backgroundRepeat: isStatic ? "no-repeat" : "repeat-x",
                  backgroundSize:   isStatic ? "cover"     : "auto 100%",
                  backgroundPosition: isStatic
                    ? "center bottom"
                    : `${offsetPx}px bottom`,
                }}
              />
            );
          })
        )}

        {/* ── Active windows (glints) ── */}
        {eng.windows.map(w => {
          if (!w.glint || w.hit || w.expired) return null;
          const age = performance.now() - w.spawnedAt;
          if (age > GLINT_VISIBLE_MS) return null;
          const screenRatio = w.worldX - eng.scrollX;
          if (screenRatio < 0 || screenRatio > 1) return null;
          const opacity = 1 - (age / GLINT_VISIBLE_MS);
          return (
            <div
              key={w.id}
              className="absolute pointer-events-none"
              style={{
                left: `${screenRatio * 100}%`,
                bottom: "26%", // on the ground line
                transform: "translate(-50%, 0)",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "radial-gradient(circle, #ffe060 0%, #ffd040 40%, transparent 70%)",
                boxShadow: "0 0 8px #ffe060cc, 0 0 16px #ffd04088",
                opacity,
              }}/>
          );
        })}

        {/* ── Character ── */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: charXPx,
            // Feet at 14% from viewport bottom puts them on the near layer's
            // rocky content. Previously 22% left the character floating well
            // above the ground — the walk cells have 0px bottom padding so
            // the div's bottom IS where the feet are.
            bottom: "14%",
            transform: "translate(-50%, 0)",
          }}>
          {phase === "hunt" && <SpriteFrame anim="run"/>}
          {/* Keep the dig sprite mounted through both phases so it holds on
              its final frame after the swing completes — the previous "idle"
              animation during 'found' showed the wrong pose and read as a
              glitch. dig is loop:false so SpriteFrame freezes on the last
              cell once onComplete fires. */}
          {(phase === "dig" || phase === "found") && (
            <SpriteFrame
              anim="dig"
              onComplete={phase === "dig" ? handleDigAnimDone : undefined}
            />
          )}
        </div>

        {/* ── Dig hole + dirt mound (during dig and brief after) ── */}
        {(phase === "dig" || phase === "found") && (
          <div
            className="absolute pointer-events-none animate-fadein"
            style={{
              left: charXPx,
              bottom: "20%",
              transform: "translate(-50%, 0)",
              width: 36,
              height: 8,
              background: "radial-gradient(ellipse, rgba(0,0,0,.65) 0%, transparent 70%)",
            }}/>
        )}

        {/* ── Found-coin emerge animation ── */}
        {phase === "found" && pendingCoin && (
          <FoundCoinEmerge coin={pendingCoin} onDone={handleFoundDone}/>
        )}

        {/* ── Miss feedback (subtle) ── */}
        {feedback?.kind === "miss" && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: charXPx,
              top: "30%",
              transform: "translate(-50%, 0)",
              ...F,
              fontSize: 11,
              color: "#a89878",
              opacity: 0.6,
              textShadow: "0 1px 2px rgba(0,0,0,.6)",
            }}>
            …nothing here
          </div>
        )}

        {/* ── Fade-to-black for brush transition ── */}
        {phase === "fading" && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "#000", animation: "fadein .5s ease forwards" }}/>
        )}

        {/* ── Hermit "lantern" indicator ── */}
        {buff.revealRarity && (
          <div
            className="absolute top-2.5 left-2.5 px-[11px] py-[5px] rounded-[7px] z-[6] pointer-events-none flex items-center gap-1.5"
            style={{
              background: isDark ? "rgba(20,12,4,.92)" : "rgba(255,248,232,.92)",
              border: "1px solid rgba(255,224,120,.5)",
            }}>
            <span className="text-[10px]">🕯️</span>
            <span className="text-[8px] tracking-[1.5px]" style={{ ...microLabel, color: isDark ? "#e8c87a" : "#5a4020" }}>Hermit</span>
          </div>
        )}

        {/* ── Wheel of Fortune streak (top-right) ── */}
        {buff.guaranteedEvery > 0 && (
          <div
            className="absolute top-2.5 right-2.5 px-[11px] py-[5px] rounded-[7px] z-[6] pointer-events-none flex items-center gap-1.5"
            style={{
              background: isDark ? "rgba(20,12,4,.92)" : "rgba(255,248,232,.92)",
              border: "1px solid #ad6cf488",
            }}>
            <span className="text-[8px] tracking-[1.5px]" style={{ ...microLabel, color: isDark ? "#8a7250" : "#5a4020" }}>Wheel</span>
            <span className="text-[11px] font-extrabold tracking-[0.5px] tabular-nums" style={{ ...F, color: "#ad6cf4" }}>
              {findStreak % buff.guaranteedEvery}/{buff.guaranteedEvery}
            </span>
          </div>
        )}

        {/* ── Broken pickaxe overlay ── */}
        {shovelDur <= 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center backdrop-blur-sm"
            style={{ background: "rgba(0,0,0,.55)" }}>
            <div className="text-center">
              <div className="text-[40px] mb-1.5">⛏</div>
              <div className="font-bold text-[15px] mb-2 -tracking-[0.2px]" style={{ ...FR, color: "#fff" }}>Pickaxe Broken</div>
              <button
                onClick={(ev) => { ev.stopPropagation(); setTab("tavern"); setTavernView("repair"); }}
                className="px-[18px] py-2 rounded-lg cursor-pointer text-[11px] font-extrabold uppercase tracking-[1.5px]"
                style={{
                  ...F,
                  border: `1px solid ${t.danger}`,
                  background: "linear-gradient(135deg,#3a1010,#5a1818)",
                  color: "#ffb0a0",
                }}>
                ⚒ Repair in Tavern
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help line */}
      <div className="text-[12px] mt-3 px-1 italic" style={{ ...mu, color: t.textDim }}>
        Tap when you sense a coin — watch for the glint. Misses are free; only finds wear the pickaxe.
      </div>
    </div>
  );
}

/* ─── Procedural backdrop (v1 default, no art assets needed) ─────────────
 * A simple parallax mock made of CSS gradients + a moving ground stripe.
 * Replace with real bgLayers per location once art is authored. */
function ProceduralBackdrop({ scrollX, isDark }) {
  // Repeating "ground texture" via a CSS-tiled gradient that uses
  // background-position to scroll. No DOM cost beyond the divs.
  const groundOffset = -((scrollX * 60) % 40);
  return (
    <>
      {/* Distant horizon — barely scrolls */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: "30%", height: "8%",
          background: isDark
            ? "linear-gradient(to top, #2a1a08, transparent)"
            : "linear-gradient(to top, #8a7050, transparent)",
          opacity: 0.6,
        }}/>
      {/* Mid-range silhouette stripe — scrolls slow */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: "26%", height: "6%",
          backgroundImage: `repeating-linear-gradient(90deg, ${isDark ? "#3a2818" : "#6a5030"} 0px, ${isDark ? "#3a2818" : "#6a5030"} 30px, transparent 30px, transparent 80px)`,
          backgroundPositionX: `${-((scrollX * 20) % 80)}px`,
          opacity: 0.5,
        }}/>
      {/* Ground line */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: "22%",
          height: 2,
          background: isDark ? "#5a3818" : "#3a2814",
          opacity: 0.7,
        }}/>
      {/* Foreground texture — tiny scrolling grain */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: 0, height: "22%",
          backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, transparent 18px, ${isDark ? "rgba(90,55,25,.4)" : "rgba(58,40,20,.3)"} 18px, ${isDark ? "rgba(90,55,25,.4)" : "rgba(58,40,20,.3)"} 20px)`,
          backgroundPositionX: `${groundOffset}px`,
        }}/>
    </>
  );
}

/* ─── Found-coin emerge animation ────────────────────────────────────────
 * After a successful dig, the coin emerges from the hole, flies up while
 * spinning, and grows toward the camera. ~1.4s total, then fade-to-black
 * fires and we hand to brush.
 *
 * Uses the real CoinCanvas (image-backed) so the player sees the actual
 * art that's about to land in their vault. The animation rotates 720°
 * (two full spins) so the coin ends right-side-up regardless of which
 * emblem it carries — important since emblems have a fixed "up". */
function FoundCoinEmerge({ coin, onDone }) {
  // Pin onDone in a ref so it doesn't appear in the effect's dependency
  // list. HuntSideScroller re-renders ~60 times/sec via the RAF tick, which
  // produces a fresh onDone reference every frame. If we used onDone in
  // deps, the setTimeout would be cleared and re-created every frame and
  // the 1400ms timer would NEVER fire — leaving the player stuck on the
  // "found" phase forever. The ref pattern keeps the latest onDone callable
  // while running the timer setup exactly once on mount.
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current?.(), 1400);
    return () => clearTimeout(t);
  }, []); // run once on mount; do NOT add onDone here
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: "50%",
        bottom: "20%",
        // Bake the translate(-50%) into the animation; the keyframe
        // animates translate, scale, and rotate together.
        animation: "coinFlyUp 1.4s cubic-bezier(.34,1.4,.5,1) forwards",
        zIndex: 8,
        // Soft warm glow behind the coin to read against any backdrop.
        filter: "drop-shadow(0 0 14px rgba(255,224,120,.6)) drop-shadow(0 0 28px rgba(255,200,80,.35))",
      }}>
      <CoinCanvas coin={coin} size={48}/>
    </div>
  );
}
