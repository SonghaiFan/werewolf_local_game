import React from "react";
import { useTranslation } from "react-i18next";
import { useGameContext } from "../../context/GameContext";

export default function GameOverPanel() {
  const { t } = useTranslation();
  const { gameState, myId, hostId, actions, onExit } = useGameContext();
  const { winner } = gameState;
  const isHost = hostId === myId;

  const isVillagersWin = winner === "VILLAGERS";
  const winnerName = isVillagersWin ? t("roles.VILLAGER") : t("roles.WOLF");

  return (
    <div className="flex flex-col items-center justify-center animate-in overflow-hidden">
      <div
        className={`w-full p-6 rounded-[var(--radius-lg)] mb-4 text-center border bg-surface/50 backdrop-blur-sm ${
          isVillagersWin
            ? "border-primary/20 text-ink"
            : "border-danger/20 text-ink"
        }`}
      >
        <div className="text-xs font-bold uppercase mb-2 tracking-widest opacity-60">
          {t("game_over")}
        </div>
        <div
          className={`text-4xl font-black tracking-tighter ${
            isVillagersWin ? "text-primary" : "text-danger"
          }`}
        >
          {winnerName}
        </div>
        <div className="text-sm tracking-widest uppercase mt-1 opacity-80">
          {t("win")}
        </div>
      </div>

      <div className="w-full flex flex-col gap-2">
        {isHost && (
          <button
            className="btn-primary w-full shadow-xl"
            onClick={actions.onPlayAgain}
          >
            {t("play_again")}
          </button>
        )}
        <button className="btn-secondary w-full" onClick={onExit}>
          {t("back_to_menu")}
        </button>
      </div>
    </div>
  );
}
