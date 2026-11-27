# MintForge art style: loading screens and key art

The locked recipe for the game's painted art (loading screens, key art,
event splashes), arrived at in November 2026. Everything made this way
should look like one set. Art is made by Dante in Midjourney and is his
own; no third-party or reference images are ever fed in (see "Never").

## The look

2D, hand-painted, high-detail pixel art ("HD pixel art"): small pixels,
fine detail, painterly depth. Not chunky 16-bit, not a 3D render.

- Palette: deep indigo and blue shadows; one warm light (molten gold,
  lantern, firelight) as the only warm colour. Green only for his eyes.
- Scale: vast architecture or caverns, one tiny cloaked figure.
- Depth: layered fog and cloud, paler with distance; glowing clouds lit
  from below by the warm light.
- Composition: tall portrait 9:16; the top and bottom stay darker and
  calmer, since the logo sits at the top and the loading bar at the foot.

## Midjourney settings

- Version 8.2, Standard (HD only to redo a keeper). Personalize off.
- Raw: Standard. Weirdness 0.
- Style reference: the door-through-the-arch image (Dante's own, the
  first keeper). Style References on, Edit OFF.

## The prompt

Swap only the `[SCENE]`. Everything else stays word for word.

```
2D hand-painted pixel art illustration, [SCENE], deep indigo and blue shadows with [WARM LIGHT], strong atmospheric depth, high detail pixel art --ar 9:16 --s 150 --sw 200 --no 3d render, voxel, cgi, octane, unreal engine, photorealistic, text, border
```

`[WARM LIGHT]` names the scene's one warm source: "molten gold light",
"warm gold lantern light", "warm gold firelight".

If results copy the reference's arch or door, lower `--sw` to 100.
If they drift to 3D or photoreal, raise it to 300.

## Scenes

| Screen | `[SCENE]` |
|---|---|
| The door | a tiny cloaked figure holding a glowing coin before a heavy wooden door cracked open in an ancient wall, two green eyes in the gap, a colossal city of towers and bridges above a sea of glowing clouds |
| The Mint Below | a vast underground cavern holding an ancient forge city carved into the rock, rivers of molten gold running through channels like streets, chains and giant bellows, a tiny cloaked figure crossing a stone bridge over the brightest channel |
| The Observatory | a colossal stone observatory on a lone spire above a sea of clouds, dome open to a star-filled sky and huge pale moon, giant brass orrery rings with zodiac symbols circling the spire, one warm gold window, a tiny figure on a balcony |
| The Vault | an immense cathedral-like underground treasury, stone pillars vanishing into darkness, mountains of coins and chests, one great pile lit by a shaft of light from far above, a tiny figure with a lantern at its foot |
| The Long Night | a snow-buried mountain town of tall narrow stone houses under heavy falling snow at night, every window dark except one tavern pouring light onto the snow, a wreath on its door, a tiny cloaked figure walking up the path |

## Into the game

1. Upscale the keeper in Midjourney and download it.
2. It goes through the art tool (planned: one shared palette and pixel
   grid for the whole set, warm lights and eyes protected).
3. It is added to the loading screens in `src/components/Boot.jsx`
   (`ARTS`), with its warm lights marked so they flicker.

## Never

- No images from Pinterest, Behance or anywhere else, as style
  references, moodboards or image prompts. A reference image carries its
  content into the result, and the repo is public.
- No artists' names in prompts.
