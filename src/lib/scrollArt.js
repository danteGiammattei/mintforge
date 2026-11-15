/* The rolled scroll, after Dante's Gemini sprite (30 × 27), snapped to its
 * pixel grid and kept here as rows of palette letters so it can be drawn
 * at once, without loading anything. The ribbon (its greys, right of the
 * rolled end) takes the scroll's rarity colour when it is drawn (lib/forms.js
 * tiedScroll). */
export const SCROLL_PAL = [[36, 24, 30], [240, 210, 180], [252, 234, 216], [210, 180, 144], [138, 102, 90], [198, 162, 132], [246, 228, 198], [132, 120, 126], [156, 120, 108], [192, 180, 180], [120, 114, 114], [228, 204, 168], [186, 150, 120], [78, 66, 72], [96, 84, 84], [66, 54, 60], [102, 96, 96], [54, 42, 48], [168, 132, 114], [120, 84, 78], [84, 60, 54]];
export const SCROLL_ROWS = [
  ".......................aaa....",
  ".....................aabbaa...",
  "....................abcccbba..",
  "...................abbccccbda.",
  "..................abcccbbbbde.",
  ".................abcccbbbbdfea",
  "................abcccbbbbffeea",
  "..............aabgccbbbbfffeea",
  "............aahhaccbbbbfffiea.",
  "...........ahjhhhabbbbbffiia..",
  "..........akkhjhhhlbbbffeia...",
  "...........aaaajhkabffiia.....",
  "..........amdbanokkafiia......",
  "........aabbccdapknaiia.......",
  ".......adbccccbmanaaha........",
  "......abbcccbbbffaahhh........",
  "...abbcccbbbbbbfiaqahhka......",
  ".aabcccccbbbblfmiaqaphhha.....",
  "addaaabcgbbbbfiiaaqharhhha....",
  "adssmmbbbbbffiia.aqh..phha....",
  "aiaaafabbbffiia..ahh...aha....",
  "aiaettfabfffia...ahha...aa....",
  ".daiiuafaffia....ahha....a....",
  ".adiitafafia.......aa.........",
  ".aaaaaafaia.........a.........",
  "..adfdfiaa....................",
  "...aaaiaa.....................",
];
