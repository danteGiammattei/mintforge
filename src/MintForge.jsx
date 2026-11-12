import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameContext } from "./lib/GameContext.js";
import { useGameState } from "./state/useGameState.js";
import { OverlayProvider, useUi } from "./ui/Overlay.jsx";
import { TITLES, TITLE_LEVELS, FRAMES } from "./lib/data.js";
import { RewardHost, useCelebrate } from "./components/Reward.jsx";
import { loadChestArt } from "./lib/chestArt.js";
import { useWar } from "./state/useWar.js";
import { feel } from "./lib/feel.js";
import AuthScreen from "./components/AuthScreen.jsx";
import BottomNav, { TABS } from "./components/BottomNav.jsx";
import TopBar from "./components/TopBar.jsx";
import Scribe from "./screens/Scribe.jsx";
import Door from "./screens/Door.jsx";
import Satchel from "./screens/Satchel.jsx";
import Vault from "./screens/Vault.jsx";
import Tavern from "./screens/Tavern.jsx";
import Profile from "./screens/Profile.jsx";

/* ══════════════════════════════════════════════════════════════════════
 *  MintForge — the shell
 *  ────────────────────────────────────────────────────────────────────
 *  Sign-in, the frame around the six screens, and nothing else. State
 *  lives in state/useGameState.js; each screen is its own file.
 *
 *  The two canvas scenes (Scribe, Door) take the whole space above the
 *  nav — no top bar — because the door in particular must be nothing but
 *  the door.
 * ══════════════════════════════════════════════════════════════════════ */

const SCREENS = { scribe: Scribe, door: Door, satchel: Satchel, vault: Vault, tavern: Tavern, profile: Profile };
const BARE = new Set(["scribe", "door"]);
const TAB_KEY = "mintforge:tab";

function Splash({ children }) {
  return (
    <main className="app" style={{ alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
      <div className="t-big">MINTFORGE</div>
      {children}
    </main>
  );
}

/* A level gained gets its own moment, listing anything it unlocked. */
function LevelWatch({ level }) {
  const celebrate = useCelebrate(), seen = useRef(level);
  useEffect(() => {
    const was = seen.current; seen.current = level;
    if (level <= was) return;
    celebrate({
      kind: "level", level,
      titles: TITLES.filter((_, i) => TITLE_LEVELS[i] > was && TITLE_LEVELS[i] <= level),
      frames: Object.entries(FRAMES).filter(([, f]) => !f.premium && f.minLvl > was && f.minLvl <= level).map(([id]) => id),
    });
  }, [level, celebrate]);
  return null;
}

/* Once a session, if today's gift is waiting and the player is elsewhere, say so. */
function DailyNudge({ ready, onDoor }) {
  const ui = useUi(), said = useRef(false);
  useEffect(() => {
    if (!ready || onDoor || said.current) return;
    said.current = true;
    const t = setTimeout(() => ui.toast("SOMETHING WAITS FOR YOU AT THE DOOR.", "magic"), 1200);
    return () => clearTimeout(t);
  }, [ready, onDoor, ui]);
  return null;
}

/* A challenge to war arrives while you are elsewhere: say so, once each. */
function WarNudge({ invites, inTavern }) {
  const ui = useUi(), told = useRef(new Set());
  useEffect(() => {
    for (const inv of invites) {
      if (told.current.has(inv.id)) continue;
      told.current.add(inv.id);
      if (!inTavern) ui.toast(`${inv.other} CHALLENGES YOU TO WAR AT THE TAVERN.`, "magic");
      feel("rarity2");
    }
  }, [invites, inTavern, ui]);
  return null;
}

function Game({ game }) {
  // A new player starts at the door, where the first chest is waiting.
  const [tab, setTabRaw] = useState(() => {
    if (!(game.stats.visits > 0)) return "door";
    let saved = null;
    try { saved = sessionStorage.getItem(TAB_KEY); } catch { /* fine */ }
    return TABS.some(t => t[0] === saved) ? saved : "scribe";
  });
  const setTab = useCallback(id => {
    setTabRaw(id);
    try { sessionStorage.setItem(TAB_KEY, id); } catch { /* fine */ }
  }, []);
  useEffect(() => { document.title = `${TABS.find(t => t[0] === tab)?.[2] || ""} · MintForge`; }, [tab]);


  const war = useWar(game.api, game.refresh, tab === "tavern");
  const ctx = useMemo(() => ({ ...game, tab, setTab, war }), [game, tab, setTab, war]);
  const warBadge = war.invites.length || (war.table?.status === "playing" && !war.table.youFlipped ? "!" : 0);
  const Screen = SCREENS[tab] || Scribe;
  const waiting = game.chests.length + game.dusty.length;

  return (
    <GameContext.Provider value={ctx}>
      <RewardHost>
      <LevelWatch level={game.level}/>
      <DailyNudge ready={game.dailyReady} onDoor={tab === "door"}/>
      <WarNudge invites={war.invites} inTavern={tab === "tavern"}/>
      <div className="app">
        <a className="sr-only" href="#main">Skip to the game</a>
        {!BARE.has(tab) && <TopBar marks={game.marks} level={game.level} xp={game.xp} onRetry={game.retrySaves}
                                   daily={game.dailyReady} onDaily={() => setTab("door")}/>}
        <main id="main" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", paddingTop: BARE.has(tab) ? "env(safe-area-inset-top, 0px)" : 0 }}>
          <Screen key={tab}/>
        </main>
        <BottomNav tab={tab} setTab={setTab} badges={{ satchel: waiting, door: game.dailyReady && tab !== "door" ? "!" : 0, tavern: tab !== "tavern" ? warBadge : 0 }}/>
      </div>
      </RewardHost>
    </GameContext.Provider>
  );
}

export default function MintForge() {
  const game = useGameState();
  const { boot } = game;
  // the chest's sheets are small; wait for them (or for them to fail) so
  // every chest drawn is the same one
  const [art, setArt] = useState(false);
  useEffect(() => { loadChestArt().finally(() => setArt(true)); }, []);

  let body;
  if (boot.status === "anon") body = <AuthScreen onAuthed={game.onAuthed}/>;
  else if (boot.status === "error") body = (
    <Splash>
      <p className="t-blood" role="alert" style={{ margin: 0, maxWidth: 300 }}>{boot.error}</p>
      <p className="t-dim" style={{ margin: 0, maxWidth: 300 }}>YOU ARE STILL SIGNED IN. NOTHING HAS BEEN LOST.</p>
      <button className="btn btn-gold" style={{ minWidth: 200 }} onClick={game.reload}>TRY AGAIN</button>
      <button className="btn btn-ghost" style={{ minWidth: 200 }} onClick={game.signOut}>SIGN OUT</button>
    </Splash>
  );
  else if (boot.status !== "ready" || !game.snap || !art) body = <Splash><p className="t-dim blink" role="status" style={{ margin: 0 }}>OPENING THE VAULT</p></Splash>;
  else body = <Game game={game}/>;

  return <OverlayProvider>{body}</OverlayProvider>;
}
