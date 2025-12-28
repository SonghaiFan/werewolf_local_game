import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useGameContext } from "../context/GameContext";
import BasePanel, {
  PanelSection,
  PanelInfo,
  IdleMessage,
} from "./panels/BasePanel";
import WaitingPanel from "./panels/WaitingPanel";
import NightPanel from "./panels/NightPanel";
import DayPanel from "./panels/DayPanel";
import GameOverPanel from "./panels/GameOverPanel";
import LogPanel from "./panels/LogPanel";

export default function ControlPanel({
  onlyActions = false,
  onlyLogs = false,
}) {
  const { t } = useTranslation();
  const { gameState, myId, executedId, hostId } = useGameContext();

  const { phase, logs } = gameState;
  const myStatus = gameState.me?.status;
  const isHost = hostId === myId;

  // Host Settings State
  const [gameConfig, setGameConfig] = useState({
    wolves: 2,
    seer: true,
    witch: true,
    guard: true,
    hunter: true,
    winCondition: "wipeout",
    enableMayor: false,
  });

  const hasSyncedConfig = useRef(false);

  // Sync config from server state
  useEffect(() => {
    if (gameState.config) {
      if (isHost) {
        // Only sync once for host to avoid overwriting local changes
        if (!hasSyncedConfig.current) {
          setGameConfig((prev) => ({
            ...prev,
            ...gameState.config,
          }));
          hasSyncedConfig.current = true;
        }
      } else {
        // Always sync for non-hosts
        setGameConfig((prev) => ({
          ...prev,
          ...gameState.config,
        }));
      }
    }
  }, [gameState.config, isHost]);

  if (onlyLogs) {
    return <LogPanel logs={logs} />;
  }

  const renderActions = () => {
    const isMyLastWords = phase === "DAY_LEAVE_SPEECH" && executedId === myId;
    const isMyHunterTurn =
      phase === "DAY_HUNTER_DECIDE" && gameState.hunterDeadId === myId;

    // 1. Global States (Dead / Finished)
    if (phase === "FINISHED") return <GameOverPanel />;
    if (myStatus === "dead" && !isMyLastWords && !isMyHunterTurn) {
      return <IdleMessage>{t("you_are_dead", "You are dead")}</IdleMessage>;
    }

    // 2. Phase-specific rendering
    switch (true) {
      case phase === "GAME_START":
        return (
          <PanelSection>
            <PanelInfo>
              <div className="font-mono text-[10px] mb-2 text-muted opacity-60 uppercase tracking-[0.2em]">
                {t("game_start", "GAME STARTING")}
              </div>
              <p className="text-sm text-ink/90 font-medium">
                {t("please_confirm_identity", "Please check your role")}
              </p>
            </PanelInfo>
          </PanelSection>
        );

      case phase === "WAITING":
        return (
          <WaitingPanel gameConfig={gameConfig} setGameConfig={setGameConfig} />
        );

      case phase.startsWith("NIGHT_") || phase === "DAY_HUNTER_DECIDE":
        return <NightPanel />;

      case phase.startsWith("DAY_"):
        return <DayPanel />;

      default:
        return (
          <PanelSection>
            <button
              className="btn-secondary w-full text-xs"
              onClick={() => window.location.reload()}
            >
              {t("reboot")}
            </button>
          </PanelSection>
        );
    }
  };

  return (
    <BasePanel className={onlyActions ? "justify-end" : ""}>
      {renderActions()}
    </BasePanel>
  );
}
