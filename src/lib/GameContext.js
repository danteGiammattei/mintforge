import { createContext, useContext } from "react";

/* One context carries the game: the state hook's return value
 * (state/useGameState.js) plus `setTab`. Screens read it with useGame(). */
export const GameContext = createContext(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameContext.Provider>");
  return ctx;
}
