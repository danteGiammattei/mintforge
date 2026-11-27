import { matterOf } from "../lib/coinview.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import Sprite from "../ui/Sprite.jsx";
import AuraSprite from "../components/AuraSprite.jsx";
import BrushReveal from "../components/BrushReveal.jsx";
import RevealBanner from "../components/RevealBanner.jsx";
import { tiedScroll, chest as chestSprite, dirtClod } from "../lib/forms.js";
import { present, loadGifts } from "../lib/presentArt.js";
import { mount as mountChest, SURROUND } from "../scenes/chest.js";
import { RARITY } from "../../shared/sigil.js";
import { CHESTS } from "../../shared/tuning.js";
import { RARITIES, PREMIUM_TITLES } from "../lib/data.js";
import { coinRarity } from "../lib/coin.js";
import { useCelebrate } from "../components/Reward.jsx";

/* ─── SATCHEL ─────────────────────────────────────────────────────────────
 * Everything in transit: scrolls waiting to be offered, chests waiting to
 * be opened, coins waiting to be brushed. Each empty shelf says where the
 * thing that fills it comes from, which is most of the tutorial. */

function Ceremony({ chest, onDone, onClose }) {
  const g = useGame(), ui = useUi(), celebrate = useCelebrate();
  const ref = useRef(null), live = useRef(g), found = useRef(null);
  live.current = g;
  useEffect(() => mountChest(ref.current, {
    open: () => live.current.act("open", { chestId: chest.id }).then(r => { found.current = r; return r; }),
    done: raw => {
      onDone(live.current.dusty.find(c => c.id === raw?.id) || null);
      // a tome tucked in with the coin, and what a frost chest may hold
      const r = found.current || {};
      if (r.tome) celebrate({ kind: "tome", id: r.tome });
      if (r.title) celebrate({ kind: "title", label: PREMIUM_TITLES.find(t => t.id === r.title.id)?.label || r.title.name, from: "chest" });
      if (r.secretTitle) celebrate({ kind: "title", label: PREMIUM_TITLES.find(t => t.id === r.secretTitle.id)?.label || r.secretTitle.name, from: "first_star" });
      if (r.effect) celebrate({ kind: "fx", id: r.effect });
      if (r.banner) celebrate({ kind: "frame", id: r.banner, from: "chest" });
    }, say: ui.say, feel,
  }, { tier: chest.tier, season: chest.season || null, look: chest.id }), [chest.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="veil appear" style={{ zIndex: 450, flexDirection: "column", gap: 12, padding: "env(safe-area-inset-top) 0 max(12px, env(safe-area-inset-bottom))", background: `rgb(${SURROUND})` }}>
      <div className="scene" style={{ width: "100%", background: "transparent" }}>
        <canvas ref={ref} tabIndex={0} autoFocus role="button"
                aria-label={chest.season ? "A present. Hold to pull the ribbon." : `A ${CHESTS.names[chest.tier].toLowerCase()} chest. Hold to break the seal.`}
                style={{ touchAction: "none", display: "block", outlineOffset: 4 }}/>
      </div>
      <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={onClose}>NOT NOW</button>
    </div>
  );
}

function Shelf({ title, count, children, empty }) {
  return (
    <section className="panel" style={{ padding: 12 }} aria-label={title}>
      <div className="between" style={{ marginBottom: 12 }}>
        <h2 className="t-title" style={{ margin: 0 }}>{title}</h2>
        <span className="t-label">{count}</span>
      </div>
      {children || empty}
    </section>
  );
}

export default function Satchel() {
  const g = useGame(), ui = useUi();
  const [opening, setOpening] = useState(null);     // a chest
  const [brushing, setBrushing] = useState(null);   // a dusty coin
  const [found, setFound] = useState(null);         // { coin, xp } once clean
  // the painted presents come in a moment after the page; redraw when they do
  const [giftsIn, setGiftsIn] = useState(false);
  useEffect(() => { let on = true; loadGifts().then(ok => on && setGiftsIn(ok)); return () => { on = false; }; }, []);

  // the coin object must outlive its move from `dusty` to the vault
  const startBrush = useCallback(coin => { setOpening(null); setBrushing(coin); }, []);

  const revealed = useCallback(async () => {
    const coin = brushing;
    const isNew = !(g.journal.c[`${coin.metalIdx}:${coinRarity(coin)}`] > 0);    // before the brush writes it in
    try {
      const r = await g.act("brush", { coinId: coin.id });
      feel("reveal");
      setFound({ coin, xp: r.xp, isNew });
      ui.say(`${RARITIES[coinRarity(coin)].name} ${matterOf(coin).name} coin${coin.shiny ? ", shiny" : ""}.`);
    } catch (e) {
      // it is still dusty on the server, so it is still here to brush
      ui.toast(`${e.message}. THE COIN IS STILL IN YOUR SATCHEL.`, "bad");
    }
    setBrushing(null);
  }, [brushing, g, ui]);

  return (
    <div className="page">
      <div className="page-in">
        <h1 className="t-big" style={{ margin: 0 }}>SATCHEL</h1>

        <Shelf title="CHESTS" count={g.chests.length}
               empty={<p className="t-dim" style={{ margin: 0 }}>NONE. HE PAYS IN CHESTS, WHEN HE HAS BEEN PAID ENOUGH.</p>}>
          {g.chests.length > 0 && (
            <div className="grid-3">
              {g.chests.map(c => (
                <button key={c.id} className="tile" style={{ borderTopColor: c.season ? "#d8584e" : "var(--candle)" }} onClick={() => { feel("tap"); setOpening(c); }}
                        aria-label={c.season ? "A present. Open it." : `${CHESTS.names[c.tier]} chest. Open it.`}>
                  {/* sheets differ in height: stand every chest on the same floor */}
                  <div style={{ height: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                    <Sprite make={() => (c.season ? present(c.id) : chestSprite(c.tier, "candle"))} dep={c.tier + (c.season || "") + giftsIn} scale={c.season && !giftsIn ? 3 : 2}/>
                  </div>
                  <span aria-hidden style={c.season ? { color: "#d8584e" } : undefined}>{c.season ? "PRESENT" : CHESTS.names[c.tier]}</span>
                </button>
              ))}
            </div>
          )}
        </Shelf>

        <Shelf title="DUSTY COINS" count={g.dusty.length}
               empty={<p className="t-dim" style={{ margin: 0 }}>NONE. THEY COME OUT OF CHESTS.</p>}>
          {g.dusty.length > 0 && (
            <div className="grid-3">
              {g.dusty.map(c => (
                <button key={c.id} className="tile" style={{ borderTopColor: "#6a4220" }} onClick={() => { feel("tap"); setBrushing(c); }}
                        aria-label="A coin thick with dust. Brush it clean.">
                  <Sprite make={() => dirtClod(c.seed)} dep={c.seed & 7} scale={2}/>
                  <span aria-hidden>BRUSH</span>
                </button>
              ))}
            </div>
          )}
        </Shelf>

        <Shelf title="SCROLLS" count={`${g.scrolls.length} / ${g.scrollCap}`}
               empty={
                 <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                   <p className="t-dim" style={{ margin: 0 }}>NONE. THE DESK IS WHERE THEY ARE MADE.</p>
                   <button className="btn btn-gold" onClick={() => g.setTab("scribe")}>TO THE DESK</button>
                 </div>}>
          {g.scrolls.length > 0 && (
            <>
              <div className="grid-4">
                {g.scrolls.map(s => (
                  <div key={s.id} className="tile" style={{ borderTopColor: RARITY[s.rarity].c }} role="img" aria-label={`${RARITY[s.rarity].n} scroll`}>
                    <AuraSprite make={() => tiedScroll(RARITY[s.rarity].c)} dep={s.rarity} colour={RARITY[s.rarity].c}
                                level={s.rarity >= 4 ? 3 : s.rarity >= 2 ? 2 : s.rarity}/>
                  </div>
                ))}
              </div>
              <button className="btn btn-magic btn-block" style={{ marginTop: 12 }} onClick={() => g.setTab("door")}>TAKE THEM TO THE DOOR</button>
            </>
          )}
        </Shelf>
      </div>

      {opening && <Ceremony chest={opening} onDone={startBrush} onClose={() => setOpening(null)}/>}

      {brushing && (
        <div className="veil appear" style={{ zIndex: 460, flexDirection: "column", gap: 24 }} role="dialog" aria-modal="true" aria-label="Brush the coin clean">
          <BrushReveal coin={brushing} onRevealed={revealed}/>
          <button className="btn btn-ghost" onClick={() => setBrushing(null)}>LATER</button>
        </div>
      )}

      {found && <RevealBanner coin={found.coin} xp={found.xp} isNew={found.isNew} onDone={() => { setFound(null); ui.toast("IT IS IN YOUR VAULT."); }}/>}
    </div>
  );
}
