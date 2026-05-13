/* ─── CHARACTER SPRITE METADATA ───────────────────────────────────────────
 * Per-animation sheet config. Each entry specifies its own source PNG,
 * sheet dimensions, and cell dimensions — sheets aren't required to share
 * a layout, which avoids repacking source art and losing pixel fidelity.
 *
 * Multi-row animations: frame N's position is computed row-major across
 * the sheet. With cols=4 and frames=24, frame 0 is (row 0, col 0), frame
 * 4 is (row 1, col 0), etc. `row` and `startCol` set the *starting* cell;
 * `frames` is how many cells to play from there, wrapping across rows.
 *
 * To add a new animation:
 *   1. Drop the sheet into /public/sprites/  (RGBA, character faces right)
 *   2. Add an entry with src + sheetW/sheetH + cellW/cellH + cols
 *   3. Set row/startCol/frames/frameMs/loop
 *   4. Reference the key in SpriteFrame
 *
 * Note: sprites in /public/sprites/ are pre-flipped to face right since the
 * world scrolls left past the character (character moves right through it).
 */
export const SPRITE = {
  scale: 2,   // global render scale. 2× = sprite renders ~90×116 in viewport.
};

export const ANIM = {
  // Standing breathing. idle.png is a 9-frame horizontal strip — subtle
  // sway and weight shift. Loops forever; used during the "found coin"
  // pause and any future paused-state UI.
  idle: {
    src:    "/sprites/idle.png",
    sheetW: 460, sheetH:  55,
    cellW:   51, cellH:  55,
    cols: 9,
    row: 0, startCol: 0, frames: 9, frameMs: 130, loop: true,
  },

  // Side-scrolling run. walk.png is a 4×6 grid laid out row-major =
  // 24 frames of one continuous walk cycle. 90ms/frame ≈ 2.3s/cycle —
  // matches the world scroll rate so feet don't appear to slip.
  run: {
    src:    "/sprites/walk.png",
    sheetW: 180, sheetH: 348,
    cellW:   45, cellH:  58,
    cols: 4,
    row: 0, startCol: 0, frames: 24, frameMs: 90, loop: true,
  },

  // Pickaxe swing. 11-frame strip: wind-up → overhead → arc → strike →
  // recovery. The source was generated at high resolution with non-uniform
  // spacing; the slicer in /tools normalises it into this clean horizontal
  // strip with frames bottom-anchored so the character's feet stay planted
  // through the swing. 45ms × 11 ≈ 500ms total — snappy tap response.
  // (If a future export has more frames, just bump cols/frames here.)
  dig: {
    src:    "/sprites/swing.png",
    sheetW: 330, sheetH:  61,
    cellW:   30, cellH:  61,
    cols: 11,
    row: 0, startCol: 0, frames: 11, frameMs: 45, loop: false,
  },
};
