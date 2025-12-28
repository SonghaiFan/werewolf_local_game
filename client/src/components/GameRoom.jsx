import React, { useEffect } from "react";
import { socket } from "../socket";
import ControlPanel from "./ControlPanel";
import AvatarCard from "./AvatarCard";
import { useTranslation } from "react-i18next";
import GameContext from "../context/GameContext";
import { useGameState } from "../hooks/useGameState";
import { useGameActions } from "../hooks/useGameActions";
import { useVoiceJudge } from "../hooks/useVoiceJudge";

export default function GameRoom({ roomId, myId, onExit, serverIP }) {
  const { t } = useTranslation();
  const { gameState, inspectedPlayers, setInspectedPlayers } =
    useGameState(socket);
  const { phase } = gameState;
  const { actions, selectedTarget, setSelectedTarget } = useGameActions({
    socket,
    roomId,
    gameState,
    setInspectedPlayers,
    t,
  });

  useVoiceJudge(socket, gameState, myId);

  const mePlayer = gameState.players[myId] || {
    ...gameState.me,
    name: t("you"),
    id: myId,
    avatar: 1,
  };
  const otherPlayers = Object.values(gameState.players).filter(
    (p) => p.id !== myId
  );

  const contextValue = {
    gameState,
    myId,
    hostId: gameState.hostId,
    executedId: gameState.executedId,
    actions,
    onExit, // Expose exit to context
    inspectedPlayers,
    candidates: gameState.candidates || [],
    wolfTarget: gameState.wolfTarget || gameState.me?.wolfTarget,
    wolfVotes: gameState.wolfVotes,
    selectedTarget,
    setSelectedTarget,
    role: gameState.me?.role,
    phase: gameState.phase,
    roomId,
    serverIP,
  };

  useEffect(() => {
    const theme =
      phase.startsWith("DAY_") || phase === "FINISHED" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    // Cleanup: Reset to dark when leaving the game
    return () => document.documentElement.setAttribute("data-theme", "dark");
  }, [phase]);

  return (
    <GameContext.Provider value={contextValue}>
      <div className="werewolf-app bg-bg flex flex-col items-center justify-center h-[100dvh] w-full overflow-hidden transition-colors duration-700">
        {/* Max-width container for larger screens */}
        <div className="w-full max-w-6xl h-full flex flex-col relative">
          {/* 1. HEADER - Minimalist, No Background */}
          <header className="flex justify-between items-start px-4 pt-4 pb-0">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1 opacity-70">
                  Room {roomId}
                </div>
                <button
                  onClick={onExit}
                  className="text-[10px] uppercase tracking-wider text-danger/50 hover:text-danger mb-1 transition-colors flex items-center gap-1"
                >
                  <span>•</span> {t("leave_room", "Leave")}
                </button>
              </div>
              <h1 className="text-2xl font-black text-ink tracking-tight">
                Werewolf
              </h1>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1 opacity-70">
                {t("round_short")} {gameState.round}
              </div>
              <div
                className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  gameState.phase.includes("NIGHT")
                    ? "bg-primary/10 text-primary"
                    : gameState.phase.includes("DAY")
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-surface text-muted"
                }`}
              >
                {gameState.phase.replace(/_/g, " ")}
              </div>
            </div>
          </header>

          <section className="flex-1 overflow-y-auto px-4 scrollbar-hide flex items-start justify-center">
            <div className="w-full pt-6 pb-6">
              <div className="flex flex-wrap gap-3 justify-center">
                {Object.values(otherPlayers).map((player) => (
                  <AvatarCard key={player.id} player={player} />
                ))}
              </div>
            </div>
          </section>

          {/* 3. FOOTER AREA - Fixed/Sticky Bottom for Mobile Feel, immersive */}
          <footer className="shrink-0 flex flex-col gap-4 pb-6 px-4">
            {/* Logs - Full Width, Floating Above Controls */}
            <div className="w-full h-[60px] relative mask-image-gradient-to-t flex items-end justify-center">
              <div className="absolute inset-x-0 bottom-0 pointer-events-none h-6 z-10" />
              <div className="w-full max-w-lg">
                <ControlPanel onlyLogs={true} />
              </div>
            </div>

            {/* Bottom Row: Me Card + Actions */}
            <div className="w-full flex items-stretch gap-4 md:gap-8 pb-2">
              {/* User Avatar (Me) - Floating Card */}
              <div
                className={`shrink-0 transition-all duration-300 flex flex-col items-center justify-center ${
                  gameState.me?.status === "dead" &&
                  gameState.hunterDeadId !== myId
                    ? "opacity-50 grayscale"
                    : ""
                }`}
              >
                <div className="text-[9px] uppercase tracking-wider text-muted text-center mb-1 opacity-60">
                  {t("you")}
                </div>
                <AvatarCard
                  player={mePlayer}
                  className="shadow-2xl !bg-surface"
                  size={"8rem"}
                />
              </div>

              {/* Actions Area (Anchored) */}
              <div className="flex-1 flex flex-col justify-center">
                <ControlPanel onlyActions={true} />
              </div>
            </div>
          </footer>
        </div>
      </div>
    </GameContext.Provider>
  );
}
