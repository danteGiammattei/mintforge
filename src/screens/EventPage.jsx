import { useGame } from "../lib/GameContext.js";
import PixelIcon from "../ui/PixelIcon.jsx";
import CoinCanvas from "../components/CoinCanvas.jsx";
import { METALS } from "../lib/data.js";
import { EVENTS, RELICS, SEASONS, PROFILE_FX } from "../../shared/events.js";
import { COIN_METAL_BY_CHEST, ASTRAL } from "../../shared/tuning.js";
import { TOME_BY_ID } from "../../shared/tomes.js";
import { titleById } from "../lib/data.js";
import { localDay } from "../../shared/economy.js";

/* ─── THE EVENT ───────────────────────────────────────────────────────────
 * Reached from the snow on the door. Before an event begins it is a
 * teaser: what is coming and when, everything still hidden. While it
 * runs it is the event's checklist: a coin of the season in every metal,
 * the named coins, its tome, its title and its banner effect, ticked off
 * as they are found. */

const SEASON_METALS = METALS.map((_, i) => i).filter(i => i !== ASTRAL.metal && COIN_METAL_BY_CHEST.some(b => b[i] > 0));
const dayOf = iso => Math.floor(Date.parse(iso + "T00:00:00Z") / 86400e3);

/* the event running, or else the next to come, with the days until it */
function eventNow() {
  const today = localDay(Date.now(), -new Date().getTimezoneOffset());
  const on = EVENTS.find(e => today >= dayOf(e.from) && today <= dayOf(e.to));
  if (on) return { ev: on, live: true, days: dayOf(on.to) - today + 1 };
  const next = EVENTS.filter(e => dayOf(e.from) > today).sort((a, b) => dayOf(a.from) - dayOf(b.from))[0];
  return next ? { ev: next, live: false, days: dayOf(next.from) - today } : null;
}
const dateName = iso => new Date(iso + "T00:00:00Z").toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "UTC" }).toUpperCase();

export default function EventPage() {
  const g = useGame();
  const now = eventNow();
  if (!now) return (
    <div className="page"><div className="page-in">
      <h1 className="t-big" style={{ margin: 0 }}>EVENTS</h1>
      <p className="t-dim" style={{ margin: 0 }}>NOTHING ON THE CALENDAR YET. WATCH THE DOOR.</p>
    </div></div>
  );
  const { ev, live, days } = now;
  const set = RELICS[ev.relics], s = g.journal?.s || {}, r = g.journal?.r || {};
  const items = [
    ...SEASON_METALS.map(m => ({ kind: "coin", m, got: !!s[`${ev.season}:${m}`] })),
    ...(set ? set.coins.map((c, i) => ({ kind: "relic", c, i, got: !!r[`${ev.relics}:${i}`] })) : []),
    { kind: "tome", got: g.tomes.includes(ev.tome.id) },
    { kind: "title", got: g.ownedTitles.includes(ev.title.id) },
    { kind: "fx", got: g.ownedFx.includes(ev.effect.id) },
  ];
  const hide = !live;                         // before it begins, nothing is shown but its shape
  if (hide) for (const it of items) it.got = false;
  const got = items.filter(i => i.got).length, pct = Math.round(got / items.length * 100);
  const seasonLabel = SEASONS[ev.season]?.label || ev.season;

  return (
    <div className="page">
      <div className="page-in">
        <div className="between">
          <h1 className="t-big" style={{ margin: 0, color: "#bfe6f5" }}>{ev.name}</h1>
          <PixelIcon name="snow" size={22} style={{ color: "#bfe6f5" }}/>
        </div>

        <section className="panel" style={{ padding: 12, display: "grid", gap: 8, borderColor: "#3c5a6a" }} aria-label={live ? "Your progress" : "Coming soon"}>
          {live ? (
            <>
              <div className="between">
                <span className="t-title" style={{ color: "#bfe6f5" }}>{got} / {items.length} FOUND</span>
                <span className="t-label">{days === 1 ? "LAST DAY" : `${days} DAYS LEFT`}</span>
              </div>
              <span className="meter" style={{ display: "block" }}><i style={{ width: pct + "%", background: "#9fd8f0" }}/></span>
              <p className="t-dim" style={{ margin: 0 }}>A THIRD OF HIS CHESTS ARE PRESENTS WHILE THE NIGHT LASTS. EVERY PRESENT HOLDS A {seasonLabel} COIN. COPY HARD PAGES WELL AND THE PRESENTS ARE BETTER.</p>
            </>
          ) : (
            <>
              <span className="t-title" style={{ color: "#bfe6f5" }}>BEGINS {dateName(ev.from)}</span>
              <span className="t-label">{days === 1 ? "TOMORROW" : `IN ${days} DAYS`} · UNTIL {dateName(ev.to)}</span>
              <p className="t-dim" style={{ margin: 0 }}>SOMETHING IS COMING THROUGH THE GAP. PRESENTS AMONG HIS CHESTS, COINS OF THE SEASON IN EVERY METAL, THREE GIFTS FIT FOR KINGS, AND A FEW THINGS NOBODY WILL HAVE ONCE THE NIGHT IS OVER.</p>
            </>
          )}
        </section>

        <section className="panel" style={{ padding: 12, display: "grid", gap: 10 }} aria-label={`${seasonLabel} coins`}>
          <h2 className="t-title" style={{ margin: 0 }}>{seasonLabel} COINS</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {items.filter(i => i.kind === "coin").map(({ m, got: have }) => (
              <div key={m} className="tile" style={{ display: "grid", justifyItems: "center", gap: 2, padding: 4, opacity: have ? 1 : 0.55 }}
                   aria-label={hide ? "Hidden" : `${METALS[m].name}: ${have ? "found" : "not yet"}`}>
                {have ? <CoinCanvas coin={{ seed: 4242 + m, metalIdx: m, season: ev.season }} size={40} aura={false}/>
                  : <span style={{ width: 40, height: 40, display: "grid", placeItems: "center", color: "var(--mute)" }}>?</span>}
                <span className="t-label" style={{ fontSize: 11, color: have ? METALS[m].hl : undefined }}>{hide ? "???" : METALS[m].name.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel" style={{ padding: 12, display: "grid", gap: 8 }} aria-label="Treasures">
          <h2 className="t-title" style={{ margin: 0 }}>{hide ? "AND MORE" : "TREASURES"}</h2>
          {items.filter(i => i.kind !== "coin").map((it, k) => {
            const name = hide ? "???"
              : it.kind === "relic" ? `${it.c.name} · ${set.name}`
              : it.kind === "tome" ? TOME_BY_ID[ev.tome.id]?.name || "THE SEASON'S TOME"
              : it.kind === "title" ? `TITLE · ${(titleById(ev.title.id)?.label || "").toUpperCase()}`
              : `BANNER · ${(PROFILE_FX[ev.effect.id]?.label || "").toUpperCase()}`;
            const how = it.kind === "relic" ? "ONE PRESENT IN A HUNDRED HOLDS ONE" : it.kind === "fx" ? "THE RAREST THING IN A PRESENT" : "IN A PRESENT, NOW AND THEN";
            return (
              <div key={k} className="between" style={{ gap: 10, padding: "6px 0", borderTop: k ? "1px solid var(--line)" : 0 }}>
                <span style={{ width: 18, display: "grid", placeItems: "center", color: it.got ? "#9fd8f0" : "var(--mute)" }}>{it.got ? <PixelIcon name="check" size={11}/> : "·"}</span>
                <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 2 }}>
                  <span style={{ color: it.got ? "var(--bone)" : "var(--bone-dim)" }}>{name}</span>
                  {!hide && <span className="t-label">{it.got ? "FOUND" : how}</span>}
                </span>
              </div>
            );
          })}
        </section>
        {live && <p className="t-label" style={{ margin: 0 }}>NOTHING OF THE SEASON IS MADE ONCE IT IS OVER. WHAT YOU FIND, YOU KEEP.</p>}
      </div>
    </div>
  );
}
