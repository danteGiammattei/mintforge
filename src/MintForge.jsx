import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameContext } from "./lib/GameContext.js";
import { useGameState } from "./state/useGameState.js";
import { OverlayProvider, useUi } from "./ui/Overlay.jsx";
import { TITLES, TITLE_LEVELS, FRAMES } from "./lib/data.js";
import { RewardHost, useCelebrate } from "./components/Reward.jsx";
import { preloadFirst, preloadBanner, warmAfter } from "./lib/preload.js";
import LoadScreen from "./components/LoadScreen.jsx";
import { useWar } from "./state/useWar.js";
import { feel } from "./lib/feel.js";
import AuthScreen from "./components/AuthScreen.jsx";
import BottomNav, { TABS } from "./components/BottomNav.jsx";
import TopBar from "./components/TopBar.jsx";
import Guide, { guideStep, journalSeen } from "./components/Guide.jsx";
import { setAppIcon } from "./lib/appIcon.js";
import Scribe from "./screens/Scribe.jsx";
import Door from "./screens/Door.jsx";
import Satchel from "./screens/Satchel.jsx";
import Vault from "./screens/Vault.jsx";
// the tavern (its games and war) loads when first visited, and warm in
// idle time after launch, so the app opens on less
const loadTavern = () => import("./screens/Tavern.jsx");
const Tavern = lazy(loadTavern);
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

/* Star signs found for the first time, and paid for: one card for them all. */
function SignWatch({ news }) {
  const celebrate = useCelebrate();
  useEffect(() => { if (news?.signs?.length) celebrate({ kind: "signs", signs: news.signs }); }, [news, celebrate]);
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
  // the coin chosen as the app's icon, painted wherever it was chosen
  const iconCoin = game.coins.find(c => c.id === game.iconCoin) || null;
  useEffect(() => { setAppIcon(iconCoin); }, [iconCoin?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // the first loop, walked once (components/Guide.jsx)
  const [, nudge] = useState(0);
  const guide = guideStep(game);
  const sawJournal = useCallback(() => { journalSeen(); nudge(n => n + 1); }, []);
  const ctx = useMemo(() => ({ ...game, tab, setTab, war, sawJournal }), [game, tab, setTab, war, sawJournal]);
  const warBadge = war.invites.length || (war.table?.status === "playing" && !war.table.youFlipped ? "!" : 0);
  const Screen = SCREENS[tab] || Scribe;
  const waiting = game.chests.length + game.dusty.length;

  return (
    <GameContext.Provider value={ctx}>
      <RewardHost>
      <LevelWatch level={game.level}/>
      <SignWatch news={game.news}/>
      <DailyNudge ready={game.dailyReady} onDoor={tab === "door"}/>
      <WarNudge invites={war.invites} inTavern={tab === "tavern"}/>
      <div className="app">
        <a className="sr-only" href="#main">Skip to the game</a>
        {!BARE.has(tab) && <TopBar marks={game.marks} level={game.level} xp={game.xp} onRetry={game.retrySaves}
                                   daily={game.dailyReady} onDaily={() => setTab("door")}/>}
        <main id="main" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", paddingTop: BARE.has(tab) ? "env(safe-area-inset-top, 0px)" : 0 }}>
          <Suspense key={tab} fallback={<div className="page"><p className="t-dim blink" style={{ padding: 24, textAlign: "center" }}>…</p></div>}><Screen/></Suspense>
        </main>
        <Guide step={guide} tab={tab} setTab={setTab} bare={BARE.has(tab)} onSkip={() => nudge(n => n + 1)}/>
        <BottomNav tab={tab} setTab={setTab} guide={guide && guide.tab !== tab ? guide.tab : null} badges={{ satchel: waiting, door: game.dailyReady && tab !== "door" ? "!" : 0, tavern: tab !== "tavern" ? warBadge : 0 }}/>
      </div>
      </RewardHost>
    </GameContext.Provider>
  );
}

export default function MintForge() {
  const game = useGameState();
  const { boot } = game;
  // the chests, the cabinet frames and the font are small: wait for them
  // (or for them to fail) behind the loading screen, then your banner
  // once we know it, then warm the rest quietly once the game is open
  const [art, setArt] = useState({ done: 0, total: 3, ready: false });
  useEffect(() => { preloadFirst((done, total) => setArt(a => ({ ...a, done, total }))).then(() => setArt(a => ({ ...a, ready: true }))); }, []);
  const [banner, setBanner] = useState(false);
  const frame = game.snap?.frame;
  useEffect(() => { if (frame !== undefined && !banner) preloadBanner(frame).then(() => setBanner(true)); }, [frame, banner]);
  const warmed = useRef(false);
  const open = boot.status === "ready" && !!game.snap && art.ready && banner;
  useEffect(() => { if (open && !warmed.current) { warmed.current = true; warmAfter(game.coins); setTimeout(() => loadTavern().catch(() => {}), 4000); } }, [open, game.coins]);

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
  else if (!open) {
    // the state counts for half the wax, the art for the rest
    const p = ((boot.status === "ready" && game.snap ? 1 : 0) + (banner ? 0.5 : 0) + 1.5 * (art.done / art.total)) / 3;
    body = <LoadScreen progress={p}/>;
  }
  else body = <Game game={game}/>;

  return <OverlayProvider>{body}</OverlayProvider>;
}
