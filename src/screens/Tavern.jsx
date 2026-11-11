import { useMemo, useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { useUi } from "../ui/Overlay.jsx";
import { feel } from "../lib/feel.js";
import { coinRarity, mkCoin } from "../lib/coin.js";
import { METALS, RARITIES, MAX_TIER } from "../lib/data.js";
import { GAMBLE } from "../../shared/tuning.js";
import CoinCanvas from "../components/CoinCanvas.jsx";
import RouletteWheel, { SECTOR_COLOURS } from "../components/RouletteWheel.jsx";
import { CoinTile } from "./Vault.jsx";

/* ─── TAVERN ──────────────────────────────────────────────────────────────
 * Three wagers, all staked in coins, all resolved by the server:
 *   TOSS      one coin. It rises a metal, or it is gone.
 *   CRUCIBLE  three of one metal. All rise, or you keep one.
 *   ROULETTE  one coin on a six-sector wheel.
 * The odds are printed. Locked coins cannot be staked. */
const pct = p => Math.round(p * 100) + "%";
const GAMES = {
  toss:     { label: "TOSS",     need: 1, rule: `1 COIN · ${pct(GAMBLE.toss.win)} IT RISES A METAL · OTHERWISE IT IS LOST` },
  crucible: { label: "CRUCIBLE", need: 3, rule: `3 COINS OF ONE METAL · ${pct(GAMBLE.crucible.win)} ALL THREE RISE · OTHERWISE YOU KEEP ONE` },
  roulette: { label: "ROULETTE", need: 1, rule: "1 COIN ON THE WHEEL" },
};
const OUTCOME_LINE = {
  lose: "IT IS GONE", same: "IT CAME BACK", up1: "IT ROSE A METAL", x2: "IT CAME BACK TWICE",
  up2: "IT ROSE TWO METALS", jackpot: "JACKPOT",
};
const hydrate = r => Object.assign(mkCoin(r.seed, 1, r.metalIdx), { id: r.id, shiny: !!r.shiny, rarity: r.rarity });
const wheelTotal = GAMBLE.roulette.reduce((s, v) => s + v.weight, 0);

export default function Tavern() {
  const g = useGame(), ui = useUi();
  const [game, setGame] = useState("toss");
  const [ids, setIds] = useState([]);
  const [phase, setPhase] = useState("pick");       // pick | working | result
  const [stake, setStake] = useState([]);           // snapshot of the staked coins
  const [res, setRes] = useState(null);
  const def = GAMES[game];

  const free = useMemo(() => g.coins.filter(c => !c.locked), [g.coins]);
  const first = free.find(c => c.id === ids[0]);
  // the crucible takes one metal: once the first coin is in, only its kin can follow
  const eligible = game === "crucible" && first ? free.filter(c => c.metalIdx === first.metalIdx) : free;
  const ready = ids.length === def.need;

  const reset = () => { setIds([]); setPhase("pick"); setRes(null); setStake([]); };
  const pick = id => {
    feel("tap");
    setIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= def.need ? [...prev.slice(1), id] : [...prev, id]);
  };

  const play = async () => {
    const coins = ids.map(id => g.coins.find(c => c.id === id)).filter(Boolean);
    if (coins.length !== def.need) return;
    const prize = coins.find(c => c.shiny || coinRarity(c) >= 3);
    if (prize && !(await ui.confirm({
      title: "STAKE THIS ONE?",
      body: `${prize.shiny ? "A SHINY " : "A "}${RARITIES[coinRarity(prize)].name} ${METALS[prize.metalIdx].name} COIN. YOU MAY NOT SEE IT AGAIN.`,
      yes: "STAKE IT", tone: "danger",
    }))) return;

    setStake(coins); setPhase("working"); setRes(null); feel("offer");
    const started = Date.now();
    try {
      const r = await g.act("gamble", { game, coinIds: ids });
      const out = { ...r, minted: r.minted.map(hydrate), keptCoins: coins.filter(c => r.kept.includes(c.id)) };
      setRes(out);
      if (game !== "roulette") {
        // let the toss or the pour play out before the answer shows
        setTimeout(() => finish(out), Math.max(0, 1500 - (Date.now() - started)));
      }
    } catch (e) { ui.toast(e.message, "bad"); feel("error"); reset(); }
  };
  const finish = out => {
    setPhase("result");
    feel(out.won ? "win" : "lose");
    ui.say(`${OUTCOME_LINE[out.outcome] || (out.won ? "YOU WON" : "YOU LOST")}.`);
  };

  return (
    <div className="page">
      <div className="page-in">
        <h1 className="t-big" style={{ margin: 0 }}>TAVERN</h1>
        <div className="seg" role="tablist" aria-label="Game">
          {Object.entries(GAMES).map(([id, d]) => (
            <button key={id} role="tab" aria-selected={game === id} disabled={phase === "working"}
                    onClick={() => { setGame(id); reset(); }}>{d.label}</button>
          ))}
        </div>

        <section className="panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="t-dim" style={{ margin: 0 }}>{def.rule}</p>

          {game === "roulette" && (
            <>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <RouletteWheel spinning={phase === "working"} target={res ? res.sector : null} onLanded={() => res && finish(res)}/>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                {GAMBLE.roulette.map(s => (
                  <li key={s.outcome} className="between" style={{ color: SECTOR_COLOURS[s.outcome][1] }}>
                    <span className="row"><i aria-hidden style={{ width: 8, height: 8, background: SECTOR_COLOURS[s.outcome][1] }}/>{s.label}</span>
                    <span>{pct(s.weight / wheelTotal)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {phase === "working" && game !== "roulette" && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "16px 0" }} role="status" aria-label="Working">
              {stake.map((c, i) => (
                <div key={c.id} style={{ animation: `coinFlip .5s steps(8) ${i * 0.12}s infinite` }}><CoinCanvas coin={c} size={64}/></div>
              ))}
            </div>
          )}

          {phase === "result" && res && (
            <div className="rise" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
              <div className="t-big" style={{ color: res.won ? "var(--magic)" : "var(--blood)" }}>{OUTCOME_LINE[res.outcome]}</div>
              {(res.minted.length > 0 || res.keptCoins.length > 0) && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                  {[...res.minted, ...res.keptCoins].map(c => (
                    <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <CoinCanvas coin={c} size={64}/>
                      <span style={{ color: METALS[c.metalIdx].hl }}>{METALS[c.metalIdx].name}</span>
                      <span style={{ color: RARITIES[coinRarity(c)].color }}>{RARITIES[coinRarity(c)].name}</span>
                    </div>
                  ))}
                </div>
              )}
              {!res.won && res.keptCoins.length > 0 && <div className="t-dim">YOU KEPT ONE.</div>}
              <div className="t-magic">+{res.xp} XP</div>
              <button className="btn btn-gold" style={{ minWidth: 200 }} onClick={reset}>AGAIN</button>
            </div>
          )}

          {phase === "pick" && (
            free.length < def.need ? (
              <p style={{ margin: 0 }}>{g.coins.length ? "NOT ENOUGH UNLOCKED COINS TO STAKE." : "YOU HAVE NO COINS TO STAKE."}</p>
            ) : (
              <>
                <div className="between">
                  <span className="t-label">STAKE {ids.length} / {def.need}</span>
                  {game === "crucible" && first && <span style={{ color: METALS[first.metalIdx].hl }}>{METALS[first.metalIdx].name} ONLY</span>}
                  {first && first.metalIdx >= MAX_TIER && game !== "roulette" && <span className="t-blood">ALREADY THE HIGHEST METAL</span>}
                </div>
                <div className="grid-coins" style={{ maxHeight: 300, overflowY: "auto", padding: 2 }}>
                  {eligible.slice(0, 120).map(c => (
                    <CoinTile key={c.id} coin={c} selected={ids.includes(c.id)} onClick={() => pick(c.id)}/>
                  ))}
                </div>
                <button className="btn btn-danger btn-block" disabled={!ready} onClick={play}>
                  {ready ? (game === "roulette" ? "SPIN" : game === "toss" ? "TOSS IT" : "POUR THEM IN") : `PICK ${def.need - ids.length} MORE`}
                </button>
              </>
            )
          )}
        </section>
        <p className="t-label" style={{ margin: 0, textAlign: "center" }}>WAGERS ARE COINS ONLY. NOTHING HERE COSTS OR PAYS REAL MONEY.</p>
      </div>
    </div>
  );
}
