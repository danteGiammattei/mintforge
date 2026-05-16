import { useEffect, useRef, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import {
  LOCATION_BY_ID, DEFAULT_LOCATION_ID, METALS,
  BA, BRUSH_UPS,
  ORE_PER_BAR, rollOreMetal,
} from "../lib/data.js";
import SpriteFrame from "../components/SpriteFrame.jsx";
import OreBars from "../components/OreBars.jsx";
import BrushReveal from "../components/BrushReveal.jsx";
import { ANIM, SPRITE_SCALE } from "../lib/sprite.js";

/* ════════════════════════════════════════════════════════════════════════
 *  HUNT — SIDE-SCROLLER (skeleton + ore + claim → brush)
 *  ────────────────────────────────────────────────────────────────────────
 *  Loop:
 *    1. Warrior walks in place at viewport centre, world scrolls past
 *    2. Skeleton spawns from off-screen right, drifts left toward player
 *    3. When skeleton reaches "engagement range" of the player, it STOPS
 *       walking and switches to idle (threatens). World scroll keeps going.
 *    4. Player taps → warrior attack anim plays, skeleton dies in place,
 *       drops a gem-shaped ore that flies down to the relevant bar.
 *    5. After death anim completes, next-spawn timer ticks. Repeat.
 *
 *  Phases:
 *    hunt    — world scrolling, accepting taps
 *    brush   — handed off to BrushReveal (after claim coin tapped)
 *
 *  Notes:
 *    - World scroll continues during skeleton-idle phase. Skeletons are
 *      worldX-anchored but DON'T scroll left once "engaged" — they hold
 *      their viewport position by tracking the world drift in their
 *      `worldX` field every frame.
 *    - Flying ore is pure visual feedback. Bar increments at kill time,
 *      regardless of whether the animation has reached the bar yet.
 * ════════════════════════════════════════════════════════════════════════ */

// Tap-zone tolerance (viewport-ratio distance from character).
const TAP_TOLERANCE = 0.20;

// Player horizontal position in the viewport (0 = left edge, 1 = right).
const CHARACTER_X_RATIO = 0.5;
// Skeleton stops walking when within this many viewport-widths of the
// player. Slightly tighter than TAP_TOLERANCE so the skeleton is
// reliably in tap range once engaged.
const ENGAGEMENT_RANGE = 0.15;

// Character feet sit this fraction of viewport height ABOVE the bottom.
const CHARACTER_BOTTOM_RATIO = 0.06;

// Skeleton spawn timing
const SPAWN_BASE_COOLDOWN_MS = 1000;    // minimum delay after death
const SPAWN_JITTER_MIN_MS    = 1000;    // 1-4s additional jitter
const SPAWN_JITTER_MAX_MS    = 4000;

// Character scale ratios — both applied via CSS transform anchored at feet
// (transform-origin: 50% 100%) so neither floats off the ground when scaled.
const PLAYER_SCALE_RATIO   = 0.7;
const SKELETON_SCALE_RATIO = 0.7;

// How many frames of skeleton_die we actually play. The full 15-frame
// source has the body lying down with horizontal drift in late frames —
// capping early gives a clean stagger-and-vanish.
const SKELETON_DIE_FRAMES_USED = 8;
const SKELETON_DIE_DURATION_MS = SKELETON_DIE_FRAMES_USED * ANIM.skeleton_die.frameMs;

// Flying-ore animation. Pure visual — addOre is called immediately on
// kill so the player's bar increments instantly.
const FLY_DURATION_MS = 1100;
// How high above the spawn point the gem peaks before falling
const FLY_ARC_HEIGHT_PX = 90;

// Decoration density. Mobile-conscious cap.
const DECOR_MAX = 8;
const DECOR_SPAWN_MS = 1200;

// Decoration kinds. `layer` is z-order: "back" renders behind character,
// "front" renders in front. `weight` controls spawn frequency.
// Back-layer sprites are deliberately SMALL — they sit way above the
// walking strip to read as "distant treeline / silhouette" rather than
// "tree on the path". Front-layer sprites are larger and sit at the
// viewport floor in front of the player.
const DECOR_KINDS = [
  // Back-layer trees — small, far. Bottom anchored at the top of the
  // walking strip; smaller than before so they read as distance.
  { src: "/decor/tree_1.png", w:  80, h:  72, layer: "back",  weight: 16 },
  { src: "/decor/tree_2.png", w:  50, h:  40, layer: "back",  weight: 14 },
  { src: "/decor/tree_3.png", w:  46, h:  38, layer: "back",  weight: 14 },
  { src: "/decor/tree_4.png", w:  48, h:  42, layer: "back",  weight: 14 },
  // Front-layer bushes — big, foreground. Stand on the viewport floor.
  { src: "/decor/bush_1.png", w: 180, h:  88, layer: "front", weight: 12 },
  { src: "/decor/bush_2.png", w:  90, h:  60, layer: "front", weight: 10 },
  { src: "/decor/bush_3.png", w: 120, h:  88, layer: "front", weight: 10 },
  { src: "/decor/bush_4.png", w:  88, h:  52, layer: "front", weight: 10 },
  // Vending easter-egg — back layer, smaller scale to match the trees.
  { src: "/decor/vending.png", w: 38, h:  78, layer: "back",  weight: 2 },
];

const DECOR_TOTAL_WEIGHT = DECOR_KINDS.reduce((s, d) => s + d.weight, 0);
function rollDecorKind() {
  let r = Math.random() * DECOR_TOTAL_WEIGHT;
  for (const k of DECOR_KINDS) {
    r -= k.weight;
    if (r <= 0) return k;
  }
  return DECOR_KINDS[0];
}

export default function Hunt() {
  const {
    phase, setPhase, foundCoin,
    shovelDur, setShovelDur, maxDur,
    brushLevel,
    oreCounts, addOre, claimOreCoin,
    onBrushDone,
    buff,
    t,
  } = useGame();

  const [locationId] = useState(DEFAULT_LOCATION_ID);
  const loc = LOCATION_BY_ID[locationId];

  // Engine state in a ref so 60Hz updates don't trigger React renders.
  // `tick` (incremented each RAF frame) is what drives renders.
  const engine = useRef({
    scrollX: 0,
    // One-at-a-time skeleton model.
    // Shape: {
    //   id, worldX, state, spawnedAt, dyingAt, dropMetalIdx,
    //   engagedAt,           // ms timestamp when stopped walking (idle)
    // }
    skeleton: null,
    nextSpawnAt: performance.now() + 1200,
    // Flying ore animation entries (visual only).
    // Shape: { id, metalIdx, startX, startY, endX, endY, startedAt }
    flyingOres: [],
    decorations: [],
    nextDecorAt: performance.now() + 600,
    lastTime: performance.now(),
  });
  const [, setTick] = useState(0);
  const viewportRef = useRef(null);
  const rafRef = useRef(null);

  // Player anim: walk default; attack plays once on tap with stable key.
  const [playerAnim, setPlayerAnim] = useState("warrior_walk");
  const [attackId,   setAttackId]   = useState(0);

  // Reset to walk when returning to hunt phase.
  useEffect(() => {
    if (phase === "hunt") setPlayerAnim("warrior_walk");
  }, [phase]);

  // ── Viewport sizing ──────────────────────────────────────────────────
  const [viewSize, setViewSize] = useState({ w: 600, h: 280 });
  useEffect(() => {
    if (!viewportRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const ent of entries) {
        const r = ent.contentRect;
        setViewSize({ w: r.width, h: r.height });
      }
    });
    ro.observe(viewportRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Render loop ──────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const loop = (now) => {
      if (!active) return;
      const e = engine.current;
      const dt = Math.min(64, now - e.lastTime);
      e.lastTime = now;

      // Determine if the world should be scrolling this frame:
      // - hunt phase, AND
      // - no skeleton currently locked in close-combat (idle / dying)
      // When the skeleton engages the player, EVERYTHING freezes
      // (background scroll, decoration drift, even skeleton spawn timer)
      // so the moment reads as a stand-off. Resumes the instant the
      // skeleton dies and is despawned.
      const engaged = e.skeleton && (e.skeleton.state === "idle" || e.skeleton.state === "dying");
      if (phase === "hunt" && !engaged) {
        e.scrollX += (loc.scrollSpeed * dt) / 1000;
      }

      if (phase === "hunt") {
        // ── Skeleton state machine ───────────────────────────────────
        if (!e.skeleton && now >= e.nextSpawnAt) {
          // Spawn 1.2 viewports right of the player's world position.
          e.skeleton = {
            id: `sk-${now}-${Math.random().toString(36).slice(2,6)}`,
            worldX: e.scrollX + 1.2,
            state: "walk",
            spawnedAt: now,
            engagedAt: 0,
            dyingAt: 0,
            dropMetalIdx: -1,
            frozenScreenX: 0,
          };
        } else if (e.skeleton && e.skeleton.state === "walk") {
          // Check if skeleton has reached the player. ENGAGEMENT_RANGE
          // means "this far in front of the player". Once in range, the
          // skeleton stops walking and goes idle (threatens).
          const screenRatio = e.skeleton.worldX - e.scrollX;
          const distFromPlayer = screenRatio - CHARACTER_X_RATIO;
          if (distFromPlayer < ENGAGEMENT_RANGE && distFromPlayer > -TAP_TOLERANCE) {
            e.skeleton.state = "idle";
            e.skeleton.engagedAt = now;
            e.skeleton.frozenScreenX = screenRatio;
          } else if (distFromPlayer < -0.4) {
            // Walked past the player without engaging (rare edge case)
            e.skeleton = null;
            e.nextSpawnAt = now + SPAWN_BASE_COOLDOWN_MS
              + SPAWN_JITTER_MIN_MS + Math.random() * (SPAWN_JITTER_MAX_MS - SPAWN_JITTER_MIN_MS);
          }
        } else if (e.skeleton && e.skeleton.state === "idle") {
          // No-op. World scroll is frozen above while engaged, so the
          // skeleton's worldX naturally stays fixed and screen position
          // is stable. Animation loops via skeleton_idle.
        } else if (e.skeleton && e.skeleton.state === "dying") {
          if (now - e.skeleton.dyingAt > SKELETON_DIE_DURATION_MS) {
            e.skeleton = null;
            e.nextSpawnAt = now + SPAWN_BASE_COOLDOWN_MS
              + SPAWN_JITTER_MIN_MS + Math.random() * (SPAWN_JITTER_MAX_MS - SPAWN_JITTER_MIN_MS);
          }
        }

        // ── Flying ore aging ────────────────────────────────────────
        e.flyingOres = e.flyingOres.filter(f => now - f.startedAt < FLY_DURATION_MS);

        // ── Decoration lifecycle ────────────────────────────────────
        if (e.decorations.length < DECOR_MAX && now >= e.nextDecorAt) {
          const kind = rollDecorKind();
          e.decorations.push({
            id: `d-${now}-${Math.random().toString(36).slice(2,6)}`,
            kind,
            worldX: e.scrollX + 1.4,
            // Per-spawn jitter so they don't all line up perfectly
            yJitter: Math.floor(Math.random() * 24),
          });
          e.nextDecorAt = now + DECOR_SPAWN_MS * (0.7 + Math.random() * 0.6);
        }
        e.decorations = e.decorations.filter(d => d.worldX > e.scrollX - 1.4);
      }

      setTick(f => (f + 1) % 1024);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(rafRef.current); };
  }, [loc, phase]);

  // ── World → screen helper ────────────────────────────────────────────
  const worldXToPx = (wx) => (wx - engine.current.scrollX) * viewSize.w;
  const charXPx = viewSize.w * CHARACTER_X_RATIO;
  const groundLineFromBottom = Math.round(viewSize.h * CHARACTER_BOTTOM_RATIO);
  // Top of the walking strip in viewport CSS px (from bottom).
  const charPixelHeight = ANIM.warrior_walk.cellH * SPRITE_SCALE * PLAYER_SCALE_RATIO;
  const walkStripTopY = groundLineFromBottom + charPixelHeight;

  // ── Tap handler ──────────────────────────────────────────────────────
  // ONE outcome per tap, prioritised:
  //   1. Skeleton in range + alive + axe intact  →  kill
  //   2. Miss  →  just play swing anim
  // Ore is auto-added; no ore-pickup tap.
  const handleTap = () => {
    if (phase !== "hunt") return;
    const eng = engine.current;

    setAttackId(id => id + 1);
    setPlayerAnim("warrior_attack");

    if (shovelDur <= 0) return;
    if (!eng.skeleton) return;
    if (eng.skeleton.state !== "walk" && eng.skeleton.state !== "idle") return;

    const screenRatio = eng.skeleton.worldX - eng.scrollX;
    const dist = Math.abs(screenRatio - CHARACTER_X_RATIO);
    if (dist >= TAP_TOLERANCE) return;

    // Kill: state → dying, freeze screen position, spawn flying ore.
    const target = eng.skeleton;
    target.state = "dying";
    target.dyingAt = performance.now();
    target.frozenScreenX = screenRatio;
    target.dropMetalIdx = rollOreMetal(Math.random());
    setShovelDur(d => Math.max(0, d - 1));

    // Visual: flying ore from skeleton position toward the ore-bar area.
    // We target a point near the viewport's BOTTOM (where the bars sit
    // just below) — bars are in a separate DOM container so we can't
    // address them directly, but a downward arc reads correctly.
    eng.flyingOres.push({
      id: `fly-${performance.now()}`,
      metalIdx: target.dropMetalIdx,
      startX: screenRatio * viewSize.w,
      startY: groundLineFromBottom + 30,
      endX:   screenRatio * viewSize.w + (Math.random() * 80 - 40),
      endY:   -40, // travels below the viewport floor
      startedAt: performance.now(),
    });

    // Bar updates immediately — animation is feedback only.
    addOre(target.dropMetalIdx, 1);
  };

  const handleAttackDone = () => setPlayerAnim("warrior_walk");

  // ── Background parallax layers ───────────────────────────────────────
  const renderBgLayers = () => (loc.bgLayers || []).map((layer, i) => {
    const isStatic = (layer.scrollMul ?? 0) === 0;
    const offsetPx = -(engine.current.scrollX * (layer.scrollMul ?? 0) * viewSize.w);
    return (
      <div key={i} style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `url(${layer.path})`,
        backgroundSize:    isStatic ? "cover"          : "auto 100%",
        backgroundPosition: isStatic ? "center bottom" : `${offsetPx}px bottom`,
        backgroundRepeat: isStatic ? "no-repeat" : "repeat-x",
        imageRendering: "pixelated",
        pointerEvents: "none",
      }}/>
    );
  });

  // ── Decoration positioning ──────────────────────────────────────────
  // back   → top of strip + jitter upward (above character head, distant)
  // front  → mostly below viewport floor, top peeks above to occlude feet
  const backDecor  = engine.current.decorations.filter(d => d.kind.layer !== "front");
  const frontDecor = engine.current.decorations.filter(d => d.kind.layer === "front");

  const renderDecor = (list) => list.map(d => {
    const x = worldXToPx(d.worldX);
    if (x < -d.kind.w || x > viewSize.w + d.kind.w) return null;
    const bottomPx = d.kind.layer === "front"
      // FRONT: bottom of sprite at viewport floor (0), so the whole bush
      // is visible standing on the ground IN FRONT of the player. Small
      // jitter for variety.
      ? 0 + (d.yJitter % 6)
      // BACK: bottom of sprite anchored WELL ABOVE the walking strip
      // (top of warrior + 24px clearance + jitter) so trees never crowd
      // the player's walking line. Small heights make them read as
      // distant treeline silhouettes.
      : walkStripTopY + 24 + d.yJitter;
    return (
      <img key={d.id}
        src={d.kind.src}
        alt=""
        style={{
          position: "absolute",
          left: x,
          bottom: bottomPx,
          width: d.kind.w,
          height: d.kind.h,
          imageRendering: "pixelated",
          pointerEvents: "none",
        }}
      />
    );
  });

  // ── BRUSH PHASE — render BrushReveal over the side-scroller ─────────
  // When the player taps a full ore bar, claimOreCoin sets phase=brush and
  // foundCoin. We render BrushReveal here. onBrushDone hands back to the
  // post-brush flow (RevealBanner → back to hunt).
  if (phase === "brush" && foundCoin) {
    const br = BRUSH_UPS?.[brushLevel] || { alpha: BA, shinyChance: 0.01 };
    return (
      <div className="flex flex-col items-center justify-center" style={{ width:"100%", height:"100%", padding: 16 }}>
        <BrushReveal
          coin={foundCoin}
          brushAlpha={br.alpha}
          shinyChance={Math.min(0.95, (br.shinyChance || 0.01) + (buff.shinyBonus || 0))}
          onRevealed={onBrushDone}
          t={t}
        />
      </div>
    );
  }

  // ── Default HUNT view ──────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ width: "100%", height: "100%", userSelect: "none" }}>
      <div
        ref={viewportRef}
        onClick={handleTap}
        onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
        style={{
          position: "relative",
          flex: 1,
          minHeight: 240,
          background: "#1a1208",
          overflow: "hidden",
          cursor: "pointer",
          borderRadius: 8,
          boxShadow: "inset 0 0 0 2px rgba(0,0,0,.5)",
        }}>
        {renderBgLayers()}
        {renderDecor(backDecor)}

        {/* Skeleton */}
        {engine.current.skeleton && (() => {
          const sk = engine.current.skeleton;
          const isDying = sk.state === "dying";
          const isIdle  = sk.state === "idle";
          // Walking: live world position. Idle/dying: frozen.
          const screenRatio = (isDying || isIdle)
            ? sk.frozenScreenX
            : (sk.worldX - engine.current.scrollX);
          const x = screenRatio * viewSize.w;
          const animKey = isDying ? "skeleton_die"
                        : isIdle  ? "skeleton_idle"
                        :           "skeleton_walk";
          const a = ANIM[animKey];
          const cellPx = a.cellW * SPRITE_SCALE;
          return (
            <div key={sk.id}
              style={{
                position: "absolute",
                left: x - (cellPx * SKELETON_SCALE_RATIO) / 2,
                bottom: groundLineFromBottom,
                transform: `scale(${SKELETON_SCALE_RATIO})`,
                transformOrigin: "50% 100%",
                pointerEvents: "none",
              }}>
              <SpriteFrame anim={animKey} key={sk.id + ":" + sk.state}/>
            </div>
          );
        })()}

        {/* Warrior */}
        <div style={{
          position: "absolute",
          left: charXPx,
          bottom: groundLineFromBottom,
          transform: `translate(-50%, 0) scale(${PLAYER_SCALE_RATIO})`,
          transformOrigin: "50% 100%",
          pointerEvents: "none",
        }}>
          <SpriteFrame
            anim={playerAnim}
            key={playerAnim === "warrior_attack" ? `atk-${attackId}` : "walk"}
            onComplete={playerAnim === "warrior_attack" ? handleAttackDone : undefined}
          />
        </div>

        {renderDecor(frontDecor)}

        {/* Flying ores — render last so they're on top of everything.
            More dramatic than the previous attempt: bigger arc, scaling
            from a tiny pop-out at the start to full size mid-flight then
            shrinking as it falls, slow rotation, and a punchier
            metal-coloured glow. Pure feedback — bar already incremented. */}
        {engine.current.flyingOres.map(f => {
          const tNow = (performance.now() - f.startedAt) / FLY_DURATION_MS;
          const t = Math.min(1, tNow);
          // Two-phase ease: a slow lift (ease-out), then a fast fall (ease-in).
          // Triangle wave for the arc: 0..1 over t=0..0.5 (rising),
          // 1..0 over t=0.5..1 (falling). Smoothed via sine.
          const arcT = Math.sin(t * Math.PI); // 0 → 1 → 0
          const fallT = t < 0.5 ? 0 : (t - 0.5) * 2; // 0..1 over second half
          // Horizontal: parabolic drift toward endX
          const x = f.startX + (f.endX - f.startX) * (t * t);
          // Vertical: start at startY, ARC UP by FLY_ARC_HEIGHT_PX, then
          // FALL through to endY in second half.
          const y = f.startY + arcT * FLY_ARC_HEIGHT_PX - fallT * (f.startY - f.endY + FLY_ARC_HEIGHT_PX);
          // Scale: pop-in from 0.4 → 1.4 (mid), → 0.9 (landing)
          const scale = 0.4 + Math.sin(t * Math.PI) * 1.0 + (1 - t) * 0.1;
          // Spin: full rotation over the flight
          const rotation = t * 540;
          // Fade only at the very end
          const opacity = t < 0.85 ? 1 : (1 - (t - 0.85) / 0.15);
          const metal = METALS[f.metalIdx];
          return (
            <div
              key={f.id}
              style={{
                position: "absolute",
                left: x,
                bottom: y,
                width: 36,
                height: 42,
                pointerEvents: "none",
                transform: `translate(-50%, 0) scale(${scale}) rotate(${rotation}deg)`,
                opacity,
                // Strong drop-shadow plus a glow disc behind
                filter: `drop-shadow(0 0 6px ${metal.hl}) drop-shadow(0 0 12px ${metal.base}aa)`,
                willChange: "transform, opacity",
              }}>
              <img
                src={`/decor/ore_${f.metalIdx}.png`}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  imageRendering: "pixelated",
                  display: "block",
                }}
              />
            </div>
          );
        })}

        {/* Axe-durability indicator */}
        <div style={{
          position: "absolute", top: 8, right: 10,
          padding: "3px 8px", fontSize: 11, fontWeight: 600, borderRadius: 4,
          color: shovelDur <= 0 ? "#ff8080" : "#fff",
          background: "rgba(0,0,0,.5)",
        }}>
          Axe {shovelDur}/{maxDur}
        </div>

        <div style={{
          position: "absolute", bottom: 6, left: 8,
          fontSize: 11, color: "rgba(255,255,255,.7)",
        }}>
          Tap skeletons to attack
        </div>
      </div>

      <OreBars
        counts={oreCounts || []}
        onClaim={(metalIdx) => claimOreCoin(metalIdx)}
        theme={t}
      />
    </div>
  );
}
