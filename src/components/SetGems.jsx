/* A gem for each metal's set (shared/tuning.js METAL_SETS): one coin of
 * every rarity of that metal, ever found. Lit in the metal's colours once
 * the set is whole, dark until then. On the profile, yours and friends'. */
import { METALS } from "../lib/data.js";
import { METAL_SETS } from "../../shared/tuning.js";

// 9 × 11, cut like a brilliant: a crown of facets, a pointed pavilion
const CUT = [
  "..aaaaa..",
  ".abbbbba.",
  "abbcbbbba",
  "aaaaaaaaa",
  ".dbbcbbd.",
  "..dbbbd..",
  "...dbd...",
  "....d....",
];
export function Gem({ metal, lit, size = 18 }) {
  const M = METALS[metal];
  const col = lit ? { a: M.base, b: M.mid, c: M.hl, d: M.dark } : { a: "#2a2c34", b: "#1a1c22", c: "#2a2c34", d: "#121318" };
  return (
    <svg viewBox="0 0 9 8" width={size} height={size * 8 / 9} shapeRendering="crispEdges" aria-hidden
         style={{ display: "block", filter: lit ? `drop-shadow(0 0 3px ${M.hl}88)` : "none" }}>
      {CUT.flatMap((row, y) => [...row].map((ch, x) => ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={col[ch]}/>))}
      {lit && <rect x={3} y={1} width={1} height={1} fill="#fff"/>}
    </svg>
  );
}

// 11 × 11, a struck coin: dark rim, a face lit from the top left, a pip
const FACE = [
  "...aaaaa...",
  "..abbbbba..",
  ".abccbbbba.",
  "abccbbbbbda",
  "abcbbbbbbda",
  "abbbbebbbda",
  "abbbbbbbdda",
  "abbbbbbddda",
  ".abbbbddda.",
  "..adddddda.",
  "...aaaaa...",
];
/* A metal as a small coin, in its own colours (the vault's filters) */
export function MiniCoin({ metal, size = 16 }) {
  const M = METALS[metal];
  const col = { a: M.dark, b: M.base, c: M.hl, d: M.mid, e: M.eng || M.dark };
  return (
    <svg viewBox="0 0 11 11" width={size} height={size} shapeRendering="crispEdges" aria-hidden style={{ display: "block", flexShrink: 0 }}>
      {FACE.flatMap((row, y) => [...row].map((ch, x) => ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={col[ch]}/>))}
    </svg>
  );
}

export default function SetGems({ sets = [] }) {
  const done = new Set(sets);
  const names = METALS.slice(0, METAL_SETS.metals).map((m, i) => done.has(i) ? m.name : null).filter(Boolean);
  return (
    <section className="panel" style={{ padding: "10px 12px", display: "grid", gap: 8 }}
             aria-label={`Metal sets: ${done.size} of ${METAL_SETS.metals} complete${names.length ? `: ${names.join(", ")}` : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }} aria-hidden>
        {METALS.slice(0, METAL_SETS.metals).map((m, i) => (
          <span key={m.name} title={`${m.name.toUpperCase()}${done.has(i) ? ": COMPLETE" : ""}`}><Gem metal={i} lit={done.has(i)} size={24}/></span>
        ))}
      </div>
      <span className="t-label" style={{ textAlign: "center" }} aria-hidden>METAL SETS {done.size} / {METAL_SETS.metals}</span>
    </section>
  );
}
