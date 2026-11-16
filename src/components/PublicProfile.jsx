import PixelBanner from "./PixelBanner.jsx";
import CabinetFrame, { gradeInk } from "./CabinetFrame.jsx";
import SignBadges from "./SignBadges.jsx";
import { CoinTile } from "../screens/Vault.jsx";
import { TitleText } from "../screens/Friends.jsx";
import { METALS, MAX_RARITY, BRUSH_UPS } from "../lib/data.js";
import { TOMES } from "../../shared/tomes.js";
import { TomeCover } from "./TomeShelf.jsx";

/* ─── a profile as other players see it ───────────────────────────────────
 * Banner, name, level and title, bio, three counts, their brush and
 * tomes, the star signs held
 * (as badges, once there is one) and the cabinet in its
 * frame (its score on the frame's plaque). The same card on your own Profile and on anyone's you look up,
 * so what you see of yourself is what they see. */
export const KINDS_TOTAL = METALS.length * (MAX_RARITY + 1);

export default function PublicProfile({ frame, username, level, title, bio, coins, kinds, shiny, signs = [], brush = 0, tomes = ["primer"], cabinet, showcase, onCoin, empty, children }) {
  const b = BRUSH_UPS[Math.max(0, Math.min(BRUSH_UPS.length - 1, brush))];
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
        {/* the brush they brush with, and the tomes they copy from */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)", gap: 8 }}>
          <div className="panel" style={{ padding: 8, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <span className="t-title" style={{ fontSize: "inherit" }}>{b.label.toUpperCase()}</span>
            <span className="t-label">BRUSH · TIER {brush + 1}</span>
          </div>
          <div className="panel" style={{ padding: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }} role="img"
                 aria-label={`Tomes: ${TOMES.filter(t => tomes.includes(t.id)).map(t => t.name.toLowerCase()).join(", ")}`}>
              {TOMES.map(t => <TomeCover key={t.id} tome={t} owned={tomes.includes(t.id)} scale={1}/>)}
            </div>
            <span className="t-label">TOMES {TOMES.filter(t => tomes.includes(t.id)).length} / {TOMES.length}</span>
          </div>
        </div>
        {signs.length > 0 && <SignBadges signs={signs}/>}
        {showcase.length > 0 ? (
          <CabinetFrame rank={cabinet?.rank || 0} score={cabinet?.score} pad={6}>
            <div>
              <div className="between" style={{ marginBottom: 8, gap: 8 }}>
                <span className="t-label">CABINET</span>
                {cabinet && <span className="t-label" style={{ color: gradeInk(cabinet.rank), textAlign: "right" }}>{cabinet.grade}</span>}
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
