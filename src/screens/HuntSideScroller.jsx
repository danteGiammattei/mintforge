import { useEffect, useRef, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import {
  LOCATION_BY_ID, DEFAULT_LOCATION_ID, METALS,
  ORE_PER_BAR, rollOreMetal,
} from "../lib/data.js";
import SpriteFrame from "../components/SpriteFrame.jsx";
import OreBars from "../components/OreBars.jsx";
import { ANIM, SPRITE_SCALE } from "../lib/sprite.js";

/* ════════════════════════════════════════════════════════════════════════
 *  HUNT — SIDE-SCROLLER (skeleton / ore version)
 *  ────────────────────────────────────────────────────────────────────────
 *  Replaces the dig-grid loop. The character (warrior) walks in place at
 *  centre. Skeletons spawn off-screen right and walk left at world scroll
 *  speed toward the player. When a skeleton is within TAP_TOLERANCE of the
 *  player and the player taps, the skeleton dies and drops one ore. Ores
 *  are auto-collected into per-metal counter bars below the viewport.
 *  When a bar fills, the player taps it to claim a coin of that metal
 *  (uses the existing brush-reveal flow + coin gen).
 *
 *  Phases:
 *    hunt    — world scrolling, accepting taps
 *    attack  — warrior swinging axe / skeleton dying. After completion
 *              returns to hunt automatically. (Driven by anim onComplete.)
 *    brush   — handed off to BrushReveal (after claim)
 *
 *  Skeleton spawn cadence:
 *    1s base cooldown after a death, then +1-4s random jitter.
 *    One skeleton at a time. Pure backend logic — no UI indicator.
 *
 *  Decorations (option B procedural):
 *    Trees / bushes / vending machines spawn at random worldX, drift left
 *    with the floor scroll speed, recycle off-screen. Max 4 concurrent.
 *
 *  Tap rules:
 *    Misses still play the attack anim (player feedback) but don't damage
 *    durability — only successful kills cost durability.
 * ════════════════════════════════════════════════════════════════════════ */

// Tap-zone tolerance (viewport-ratio distance from character). Same value
// as the old hunt — generous enough for thumb taps on mobile.
const TAP_TOLERANCE = 0.18;

// Player horizontal position in the viewport (0 = left edge, 1 = right).
const CHARACTER_X_RATIO = 0.5;

// Skeleton spawn timing
const SPAWN_BASE_COOLDOWN_MS = 1000;    // minimum delay after death
const SPAWN_JITTER_MIN_MS    = 1000;    // additional 1-4s random
const SPAWN_JITTER_MAX_MS    = 4000;

// Max concurrent decoration entities (mobile-conscious cap)
const DECOR_MAX = 4;
// Spawn a decoration roughly every N ms
const DECOR_SPAWN_MS = 2200;

// Asset paths for decorations. Pre-build once so we don't allocate per-frame.
const DECOR_KINDS = [
  // Each: src, footprint (rendered width × height in CSS px), drift speed multiplier
  { src: "/decor/tree_1.png",  w: 124, h: 114, mul: 1.0 },
  { src: "/decor/tree_2.png",  w:  70, h:  56, mul: 1.0 },
  { src: "/decor/tree_3.png",  w:  64, h:  54, mul: 1.0 },
  { src: "/decor/tree_4.png",  w:  66, h:  62, mul: 1.0 },
  { src: "/decor/bush_1.png",  w: 130, h:  64, mul: 1.0 },
  { src: "/decor/bush_2.png",  w:  60, h:  40, mul: 1.0 },
  { src: "/decor/bush_3.png",  w:  78, h:  58, mul: 1.0 },
  { src: "/decor/bush_4.png",  w:  58, h:  34, mul: 1.0 },
  { src: "/decor/vending.png", w:  90, h: 188, mul: 1.0 },
];

export default function Hunt() {
  const {
    phase, setPhase, foundCoin, setFoundCoin,
    huntCoin, setHuntCoin,
    shovelDur, setShovelDur, maxDur,
    oreCounts, addOre, claimOreCoin,
    buff,
    t, isDark,
  } = useGame();

  const [locationId] = useState(DEFAULT_LOCATION_ID);
  const loc = LOCATION_BY_ID[locationId];

  // Engine state held in a ref to avoid React renders 60×/sec.
  // Only `tick` (incremented by RAF) triggers a render to refresh visuals.
  const engine = useRef({
    scrollX: 0,
    worldFrozen: false,
    // One-at-a-time skeleton model. `skeleton` is null between spawns.
    // Shape: { id, worldX, state:'walk'|'dying', spawnedAt, dyingAt }
    skeleton: null,
    // Next spawn time. Starts 1.2s after mount to give the player a beat.
    nextSpawnAt: performance.now() + 1200,
    // Decoration entities (procedural background spawning)
    decorations: [],
    nextDecorAt: performance.now() + 600,
    lastTime: performance.now(),
  });
  const [tick, setTick] = useState(0);
  const viewportRef = useRef(null);
  const rafRef = useRef(null);

  // Player anim state. "walk" by default, "attack" plays once on tap.
  const [playerAnim, setPlayerAnim] = useState("warrior_walk");

  // When phase transitions back to "hunt", unfreeze the world.
  useEffect(() => {
    if (phase === "hunt") {
      engine.current.worldFrozen = false;
      setPlayerAnim("warrior_walk");
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
        // World scrolls at the location's configured speed (viewport units/sec).
        e.scrollX += (loc.scrollSpeed * dt) / 1000;

        // ── Skeleton lifecycle ─────────────────────────────────────────
        if (!e.skeleton && now >= e.nextSpawnAt) {
          // Spawn one. Place it 1.2 viewports to the right of the player's
          // current world position so it walks in from off-screen.
          e.skeleton = {
            id: `sk-${now}-${Math.random().toString(36).slice(2,6)}`,
            // worldX is in viewport units, just like scrollX. The skeleton
            // walks at the same speed as world scroll (so it appears
            // stationary in WORLD space, but the player's centre-anchored
            // character means the skeleton drifts toward them).
            worldX: e.scrollX + 1.2,
            state: "walk",
            spawnedAt: now,
            dyingAt: 0,
            dropMetalIdx: -1, // rolled at death time
          };
        } else if (e.skeleton && e.skeleton.state === "walk") {
          // Skeleton drifts toward the player. In WORLD coords it's
          // stationary — but the player is anchored at viewport centre
          // (scrollX + CHARACTER_X_RATIO in world coords), and as scrollX
          // grows, the player advances. So we want the skeleton's worldX
          // to stay put while the world scrolls past — that already
          // makes it drift visually toward the player.
          //
          // (No extra movement logic needed — the skeleton just *exists*
          // at a fixed worldX and the scroll does the work.)

          // Has the skeleton walked off the LEFT side without being hit?
          // If skeleton's worldX < scrollX - 0.2 it's well past the player.
          if (e.skeleton.worldX < e.scrollX - 0.3) {
            // Despawn silently — no penalty, just gone.
            e.skeleton = null;
            e.nextSpawnAt = now + SPAWN_BASE_COOLDOWN_MS
              + SPAWN_JITTER_MIN_MS + Math.random() * (SPAWN_JITTER_MAX_MS - SPAWN_JITTER_MIN_MS);
          }
        } else if (e.skeleton && e.skeleton.state === "dying") {
          // After the die anim duration, remove the skeleton.
          const dieMs = ANIM.skeleton_die.frames * ANIM.skeleton_die.frameMs;
          if (now - e.skeleton.dyingAt > dieMs) {
            e.skeleton = null;
            e.nextSpawnAt = now + SPAWN_BASE_COOLDOWN_MS
              + SPAWN_JITTER_MIN_MS + Math.random() * (SPAWN_JITTER_MAX_MS - SPAWN_JITTER_MIN_MS);
          }
        }

        // ── Decoration lifecycle ──────────────────────────────────────
        if (e.decorations.length < DECOR_MAX && now >= e.nextDecorAt) {
          const kind = DECOR_KINDS[Math.floor(Math.random() * DECOR_KINDS.length)];
          e.decorations.push({
            id: `d-${now}-${Math.random().toString(36).slice(2,6)}`,
            kind,
            worldX: e.scrollX + 1.4,
            // Slight vertical jitter so they don't all line up perfectly
            yOffset: Math.random() * 14,
          });
          e.nextDecorAt = now + DECOR_SPAWN_MS * (0.7 + Math.random() * 0.6);
        }
        // Recycle decorations that have scrolled off the left
        e.decorations = e.decorations.filter(d => d.worldX > e.scrollX - 1.4);
      }

      setTick(f => (f + 1) % 1024);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(rafRef.current); };
  }, [loc]);

  // ── Tap handler ───────────────────────────────────────────────────────
  const handleTap = () => {
    if (phase !== "hunt") return;
    if (engine.current.worldFrozen) return;
    if (shovelDur <= 0) return; // axe broken
    const eng = engine.current;

    // Is there a skeleton in tap range?
    let target = null;
    if (eng.skeleton && eng.skeleton.state === "walk") {
      const screenRatio = eng.skeleton.worldX - eng.scrollX;
      const dist = Math.abs(screenRatio - CHARACTER_X_RATIO);
      if (dist < TAP_TOLERANCE) target = eng.skeleton;
    }

    // Always play the attack animation for feedback
    setPlayerAnim("warrior_attack");

    if (target) {
      // Hit: skeleton dies, drops ore, durability ticks down.
      target.state = "dying";
      target.dyingAt = performance.now();
      target.dropMetalIdx = rollOreMetal(Math.random());
      // Tick durability (1 per kill — keeps the axe meaningful)
      setShovelDur(d => Math.max(0, d - 1));
      // Award ore to the appropriate bar via the game context
      addOre(target.dropMetalIdx, 1);
    }
    // (Miss: just play the swing animation, no other effect.)
  };

  // When the warrior's attack anim finishes, return to walk
  const handleAttackDone = () => {
    setPlayerAnim("warrior_walk");
  };

  // ── Viewport sizing (used to convert worldX/ratio → CSS pixels) ──────
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

  // ── World → screen position helpers ──────────────────────────────────
  // Given a world X (in viewport units), return CSS pixel x within the
  // viewport. Anchored at the LEFT edge of whatever entity.
  const worldXToPx = (wx) => (wx - engine.current.scrollX) * viewSize.w;

  const charXPx = viewSize.w * CHARACTER_X_RATIO;

  // ── Background parallax positioning ──────────────────────────────────
  // The location's bgLayers are sky + near (far layer dropped per design).
  // Each layer scrolls at scrollMul × world speed.
  const renderBgLayers = () => {
    return (loc.bgLayers || []).map((layer, i) => {
      const isStatic = (layer.scrollMul ?? 0) === 0;
      const offsetPx = -(engine.current.scrollX * (layer.scrollMul ?? 0) * viewSize.w);
      return (
        <div key={i} style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${layer.path})`,
          backgroundSize:    isStatic ? "cover"        : "auto 100%",
          backgroundPosition: isStatic ? "center bottom" : `${offsetPx}px bottom`,
          backgroundRepeat: isStatic ? "no-repeat" : "repeat-x",
          imageRendering: "pixelated",
          pointerEvents: "none",
        }}/>
      );
    });
  };

  // ── Decoration positioning ───────────────────────────────────────────
  // Bottom-anchored on the ground line (which we treat as the bottom 14%
  // of the viewport — same as the character feet position).
  const groundLineFromBottom = Math.round(viewSize.h * 0.14);

  return (
    <div className="flex flex-col" style={{ width: "100%", height: "100%", userSelect: "none" }}>
      {/* ── World viewport ─────────────────────────────────────────── */}
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
        {/* Parallax background */}
        {renderBgLayers()}

        {/* Decorations (procedural). Render before character so character is in front. */}
        {engine.current.decorations.map(d => {
          const x = worldXToPx(d.worldX);
          // Off-screen culling for the renderer
          if (x < -d.kind.w || x > viewSize.w + d.kind.w) return null;
          return (
            <img key={d.id}
              src={d.kind.src}
              alt=""
              style={{
                position: "absolute",
                left: x,
                bottom: groundLineFromBottom - d.yOffset,
                width: d.kind.w,
                height: d.kind.h,
                imageRendering: "pixelated",
                pointerEvents: "none",
              }}
            />
          );
        })}

        {/* Skeleton */}
        {engine.current.skeleton && (() => {
          const sk = engine.current.skeleton;
          const x = worldXToPx(sk.worldX);
          const animKey = sk.state === "dying" ? "skeleton_die" : "skeleton_walk";
          const a = ANIM[animKey];
          // Center the cell horizontally on its world position
          const cellPx = a.cellW * SPRITE_SCALE;
          return (
            <div key={sk.id}
              style={{
                position: "absolute",
                left: x - cellPx / 2,
                bottom: groundLineFromBottom,
                pointerEvents: "none",
              }}>
              <SpriteFrame anim={animKey} key={sk.id + ":" + sk.state}/>
            </div>
          );
        })()}

        {/* Warrior (player character) — centred at CHARACTER_X_RATIO */}
        <div style={{
          position: "absolute",
          left: charXPx,
          bottom: groundLineFromBottom,
          transform: "translate(-50%, 0)",
          pointerEvents: "none",
        }}>
          <SpriteFrame
            anim={playerAnim}
            // Restart attack from frame 0 each tap
            key={playerAnim === "warrior_attack" ? "atk-" + tick : "walk"}
            onComplete={playerAnim === "warrior_attack" ? handleAttackDone : undefined}
          />
        </div>

        {/* Axe-durability indicator (small, top-right). Visible always. */}
        <div style={{
          position: "absolute",
          top: 8, right: 10,
          padding: "3px 8px",
          fontSize: 11,
          fontWeight: 600,
          borderRadius: 4,
          color: shovelDur <= 0 ? "#ff8080" : "#fff",
          background: "rgba(0,0,0,.5)",
        }}>
          Axe {shovelDur}/{maxDur}
        </div>

        {/* Helper text bottom-left */}
        <div style={{
          position: "absolute",
          bottom: 6, left: 8,
          fontSize: 11,
          color: "rgba(255,255,255,.7)",
        }}>
          Tap skeletons to attack
        </div>
      </div>

      {/* ── Ore bars ──────────────────────────────────────────────── */}
      <OreBars
        counts={oreCounts || []}
        onClaim={(metalIdx) => claimOreCoin(metalIdx)}
        theme={t}
      />
    </div>
  );
}
