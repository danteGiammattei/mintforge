/* ─── CHARACTER SPRITE METADATA ───────────────────────────────────────────
 * Single source of truth for the character sprite sheet. Lives at
 * /public/sprites/character.png. The sheet is a packed grid of 24×24
 * cells, 30 columns × 7 rows = 210 frames total.
 *
 * The artist's row labels weren't documented in the pack, so the row
 * interpretations below were derived by eye. Notes from analysis:
 *
 *   Row 0: idle, facing camera (8 frames). Subtle blink/breathe.
 *   Row 1: walk facing camera (down).
 *   Row 2: walk/run facing camera.
 *   Row 3: MIXED — first ~6 frames face camera, frames 6+ are side-run.
 *   Row 4-5: mixed action poses, mostly facing camera.
 *   Row 6: action set (dig/pickup/swing/fall — varied poses).
 *
 * Each animation can specify a startCol offset (default 0) so we can pull
 * the side-run cycle out of row 3 starting at col 6, etc.
 *
 * If something looks wrong in-game, edit the ANIM table — every consumer
 * reads from it.
 */
export const SPRITE = {
  src: "/sprites/character.png",
  cell: 24,        // each frame is 24×24 px
  cols: 30,
  rows: 7,
  scale: 4,        // default render scale → 96px on screen
};

// Animation table. Each entry: { row, startCol, frames, frameMs, loop }
//   row      — 0-indexed top to bottom
//   startCol — column to begin from (default 0)
//   frames   — how many cells to play from startCol onward
//   frameMs  — per-frame duration in ms
//   loop     — true for looping, false for one-shot
export const ANIM = {
  // Standing / breathing facing camera. Used during the brush moment and
  // when the character is paused mid-sequence. 8 frames at slow cadence.
  idle: { row: 0, startCol: 0, frames: 8, frameMs: 140, loop: true },

  // Side-facing run. Row 3 is mixed (front-walk early frames, side-run
  // later frames). Side-run cycle starts at column 6 — pulling 6 frames
  // gives a clean loop. If the character looks like it's facing the
  // camera instead of running rightward, increase startCol to 7 or 8.
  run: { row: 3, startCol: 6, frames: 6, frameMs: 90, loop: true },

  // Dig swing — short one-shot for the tap response. Row 6 has the
  // action poses; cols 12-15 read as bent-over/working stances which
  // match a dig action. Compressed to 4 frames so the tap feels snappy.
  // If this doesn't look like digging, try startCol 0 or 18.
  dig: { row: 6, startCol: 12, frames: 4, frameMs: 75, loop: false },
};

// Helper: returns CSS background-position for a given anim + frame index.
// Frame is 0-relative within the animation; we add startCol to get the
// actual sheet column.
export function spritePos(animKey, frameIdx) {
  const a = ANIM[animKey];
  if (!a) return { backgroundPositionX: 0, backgroundPositionY: 0 };
  const realCol = (a.startCol || 0) + frameIdx;
  const x = -realCol * SPRITE.cell * SPRITE.scale;
  const y = -a.row   * SPRITE.cell * SPRITE.scale;
  return { backgroundPositionX: `${x}px`, backgroundPositionY: `${y}px` };
}

