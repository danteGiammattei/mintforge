/* ─── SPRITE METADATA ─────────────────────────────────────────────────────
 * Each animation lives in its own PNG strip under /public/sprites/.
 * Per-anim sheets are easier to maintain than one giant grid, and Vite
 * hashes them individually for caching. SpriteFrame reads from ANIM to
 * know how to step through frames.
 *
 * Entry shape:
 *   src        — path under /public
 *   sheetW/H   — total strip dimensions
 *   cellW/H    — single frame dimensions
 *   cols       — frames per row (always 1 row in current sheets)
 *   row        — which row to start from (0 here)
 *   startCol   — column offset within that row
 *   frames     — number of frames to play
 *   frameMs    — per-frame duration in ms
 *   loop       — true for ambient, false for one-shots (holds final frame)
 *
 * Heights differ between anims of the same character because action frames
 * (attack, jump) extend the weapon overhead — that's intentional. Feet stay
 * bottom-anchored, the cell grows upward.
 */

// Global render scale — anims declare source-pixel cell sizes, the renderer
// multiplies by this. Tune here to make every character bigger or smaller.
export const SPRITE_SCALE = 2;

export const ANIM = {
  // ── WARRIOR (player character) ───────────────────────────────────
  warrior_idle: {
    src: "/sprites/warrior_idle.png",
    sheetW: 351, sheetH: 80, cellW: 39, cellH: 80,
    cols: 9, row: 0, startCol: 0, frames: 9, frameMs: 130, loop: true,
  },
  warrior_walk: {
    src: "/sprites/warrior_walk.png",
    sheetW: 520, sheetH: 83, cellW: 65, cellH: 83,
    cols: 8, row: 0, startCol: 0, frames: 8, frameMs: 95, loop: true,
  },
  warrior_run: {
    src: "/sprites/warrior_run.png",
    sheetW: 427, sheetH: 82, cellW: 61, cellH: 82,
    cols: 7, row: 0, startCol: 0, frames: 7, frameMs: 70, loop: true,
  },
  // Attack 1 — one-shot, holds the final recovery frame after the swing.
  warrior_attack: {
    src: "/sprites/warrior_attack.png",
    sheetW: 744, sheetH: 91, cellW: 93, cellH: 91,
    cols: 8, row: 0, startCol: 0, frames: 8, frameMs: 55, loop: false,
  },
  warrior_jump: {
    src: "/sprites/warrior_jump.png",
    sheetW: 603, sheetH: 83, cellW: 67, cellH: 83,
    cols: 9, row: 0, startCol: 0, frames: 9, frameMs: 70, loop: false,
  },

  // ── SKELETON (enemy) ────────────────────────────────────────────
  // Pre-mirrored at slice time so they face LEFT (walking toward the
  // player at viewport centre).
  skeleton_walk: {
    src: "/sprites/skeleton_walk.png",
    sheetW: 430, sheetH: 52, cellW: 43, cellH: 52,
    cols: 10, row: 0, startCol: 0, frames: 10, frameMs: 95, loop: true,
  },
  skeleton_idle: {
    src: "/sprites/skeleton_idle.png",
    sheetW: 304, sheetH: 50, cellW: 38, cellH: 50,
    cols: 8, row: 0, startCol: 0, frames: 8, frameMs: 130, loop: true,
  },
  skeleton_attack: {
    src: "/sprites/skeleton_attack.png",
    sheetW: 630, sheetH: 52, cellW: 63, cellH: 52,
    cols: 10, row: 0, startCol: 0, frames: 10, frameMs: 60, loop: false,
  },
  skeleton_hurt: {
    src: "/sprites/skeleton_hurt.png",
    sheetW: 190, sheetH: 50, cellW: 38, cellH: 50,
    cols: 5, row: 0, startCol: 0, frames: 5, frameMs: 70, loop: false,
  },
  // Plays once on kill — long anim (15 frames) so the death feels weighty.
  skeleton_die: {
    src: "/sprites/skeleton_die.png",
    sheetW: 990, sheetH: 57, cellW: 66, cellH: 57,
    cols: 15, row: 0, startCol: 0, frames: 15, frameMs: 70, loop: false,
  },
};

// Legacy export — old code might still import SPRITE. Keep as empty stub
// so imports don't break before the rewrite settles.
export const SPRITE = { scale: SPRITE_SCALE };

// Helper: returns the background-position for a given anim + frame index.
// Used by SpriteFrame to step through a horizontal strip.
export function spritePos(animKey, frameIdx) {
  const a = ANIM[animKey];
  if (!a) return { backgroundPositionX: "0px", backgroundPositionY: "0px" };
  const realCol = (a.startCol || 0) + frameIdx;
  const x = -realCol * a.cellW * SPRITE_SCALE;
  const y = -a.row   * a.cellH * SPRITE_SCALE;
  return { backgroundPositionX: `${x}px`, backgroundPositionY: `${y}px` };
}
