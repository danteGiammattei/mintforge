import PixelBanner from "./PixelBanner.jsx";
import CabinetFrame from "./CabinetFrame.jsx";
import { CoinTile } from "../screens/Vault.jsx";
import { TitleText } from "../screens/Friends.jsx";
import { METALS, MAX_RARITY, RARITIES } from "../lib/data.js";

/* ─── a profile as other players see it ───────────────────────────────────
 * Banner, name, level and title, bio, three counts and the cabinet in its
 * frame (its score on the frame's plaque). The same card on your own Profile and on anyone's you look up,
 * so what you see of yourself is what they see. */
export const KINDS_TOTAL = METALS.length * (MAX_RARITY + 1);

export default function PublicProfile({ frame, username, level, title, bio, coins, kinds, shiny, cabinet, showcase, onCoin, empty, children }) {
  return (
    <>
      <PixelBanner frame={frame} height={96}/>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div className="t-title t-plain" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{username}</div>
          <div className="t-label">LV {level} · <TitleText label={title}/></div>
          {bio && <p className="t-dim t-plain" style={{ margin: "8px 0 0", overflowWrap: "anywhere" }}>{bio}</p>}
        </div>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, margin: 0 }}>
          {[["COINS", coins], ["KINDS", `${kinds} / ${KINDS_TOTAL}`], ["SHINY", shiny]].map(([k, v]) => (
            <div key={k} className="panel" style={{ padding: 8, textAlign: "center" }}>
              <dd className="t-title" style={{ margin: 0 }}>{v}</dd><dt className="t-label">{k}</dt>
            </div>
          ))}
        </dl>
        {showcase.length > 0 ? (
          <CabinetFrame rank={cabinet?.rank || 0} score={cabinet?.score} pad={6}>
            <div>
              <div className="between" style={{ marginBottom: 8, gap: 8 }}>
                <span className="t-label">CABINET</span>
                {cabinet && <span className="t-label" style={{ color: RARITIES[Math.min(cabinet.rank, RARITIES.length - 1)].color, textAlign: "right" }}>{cabinet.grade}</span>}
              </div>
              <div className="grid-3">
                {showcase.map(c => <CoinTile key={c.id} coin={c} onClick={() => onCoin?.(c)}/>)}
              </div>
            </div>
          </CabinetFrame>
        ) : empty}
        {children}
      </div>
    </>
  );
}
