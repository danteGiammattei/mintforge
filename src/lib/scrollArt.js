/* The rolled scroll, after Dante's Gemini sprite (35 × 32), snapped to its
 * pixel grid and kept here as rows of palette letters so it can be drawn
 * at once, without loading anything. The ribbon (its greys, right of the
 * rolled end) takes the scroll's rarity colour when it is drawn (lib/forms.js
 * tiedScroll). */
export const SCROLL_PAL = [[36, 24, 30], [240, 210, 180], [252, 234, 216], [210, 180, 150], [198, 162, 132], [138, 108, 90], [84, 72, 66], [132, 120, 126], [240, 228, 204], [156, 120, 108], [126, 96, 84], [192, 180, 174], [48, 36, 36], [156, 138, 126], [120, 114, 114], [186, 150, 126], [108, 102, 108], [168, 132, 114], [66, 48, 48], [90, 78, 84], [228, 198, 168], [108, 90, 78]];
export const SCROLL_ROWS = [
  "...................................",
  "..........................aaa......",
  "........................aabbba.....",
  ".......................abcccbba....",
  "......................abbccccbba...",
  ".....................abccccbbbbda..",
  "....................aabcccbbbbbef..",
  "...................agbcccbbbbbeefa.",
  "..................abbcccbbbbbeeffa.",
  "................aabccccbbbbbeeeffa.",
  "..............aahhaiccbbbbeeeejka..",
  ".............ahlhhhmnbbbbbeeejja...",
  "............aooolnhhabbbbeeffna....",
  ".............aaaanhooabeeejkfa.....",
  "............apdagolqooaerjsm.......",
  "..........aabccceagnoqajja.........",
  ".........abbccccbpagogaaa..........",
  ".......aabbcccbbbeagtahhh..........",
  ".....aabbccccbbbbeeaqaahha.........",
  "....abbccccbbbbbeejaqqaghha........",
  "..aabccccccbbbbeeejaqqashhha.......",
  ".adeaaabccbbbbbejjaaqqhamhhha......",
  ".adjrnpabbbbbeejjf.aqhh..shha......",
  "adeaaaeeabbbuepjaa.aqhh..ahhha.....",
  "adjakkafeabbeeja...ahhha..aaha.....",
  "adeajkgmegeeeja....aahha...aaa.....",
  ".aeajjggaekejs.......aha...........",
  ".aadajjgaevjj.........ga...........",
  "..aadaaaeegja..........a...........",
  "...adeeeejaa.......................",
  ".....aajaa.........................",
  "...................................",
];
