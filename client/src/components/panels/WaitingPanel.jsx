import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { useGameContext } from "../../context/GameContext";
import GameSettings from "../GameSettings";
import { PanelSection } from "./BasePanel";

export default function WaitingPanel({ gameConfig, setGameConfig }) {
  const { t } = useTranslation();
  const { roomId, myId, hostId, gameState, serverIP, actions } =
    useGameContext();
  const { players } = gameState;
  const isHost = hostId === myId;
  const isReady = players && players[myId] && players[myId].isReady;
  const onPlayerReady = actions.onPlayerReady;
  const onStartGame = actions.onStartGame;

  const [showQRCode, setShowQRCode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const playerCount = players ? Object.keys(players).length : 0;
  const hostname = window.location.hostname;
  const effectiveHost =
    serverIP && (hostname === "localhost" || hostname === "127.0.0.1")
      ? serverIP
      : hostname;

  const joinUrl = `${window.location.protocol}//${effectiveHost}:${window.location.port}/?room=${roomId}`;

  const canStart =
    players && Object.values(players).every((p) => p.id === myId || p.isReady);

  return (
    <PanelSection className="flex flex-col gap-3">
      {showQRCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in">
          <div className="bg-surface p-6 rounded-[var(--radius-lg)] border border-border shadow-2xl max-w-sm w-full relative">
            <button
              className="absolute top-4 right-4 text-muted hover:text-ink"
              onClick={() => setShowQRCode(false)}
            >
              ✕
            </button>
            <div className="font-bold text-ink mb-6 text-center text-lg">
              {t("scan_to_join")}
            </div>
            <div className="bg-white p-4 rounded-xl shadow-inner mx-auto w-fit">
              <QRCodeSVG
                value={joinUrl}
                size={180}
                level="H"
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>
            <div className="font-mono text-[10px] text-muted mt-5 text-center bg-black/30 p-2 rounded break-all select-all">
              {joinUrl}
            </div>
          </div>
        </div>
      )}

      {!isHost && (
        <button
          className={`btn-primary w-full transition-all duration-500 ${
            isReady
              ? "bg-surface text-muted border-transparent shadow-none"
              : "shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)] animate-pulse-slow"
          }`}
          onClick={onPlayerReady}
        >
          {isReady ? t("waiting_for_others") : t("click_when_ready")}
        </button>
      )}

      {isHost && (
        <div className="pt-2">
          <div className="w-full space-y-3">
            <div className="flex items-center justify-end px-1">
              <button
                className={`text-[10px] uppercase tracking-wider font-bold transition-colors ${
                  showSettings ? "text-ink" : "text-muted hover:text-ink"
                }`}
                onClick={() => setShowSettings(!showSettings)}
              >
                {showSettings ? "Hide Settings" : "Settings"}
              </button>
            </div>

            {showSettings && (
              <div className="mb-4 p-4 bg-surface/30 backdrop-blur-md rounded-xl border border-border/50 text-xs animate-in">
                <GameSettings
                  t={t}
                  gameConfig={gameConfig}
                  setGameConfig={setGameConfig}
                  showPresets={playerCount < 2}
                />
              </div>
            )}

            <button
              className={`btn-primary w-full ${
                !canStart &&
                "opacity-50 grayscale cursor-not-allowed shadow-none"
              }`}
              onClick={() => {
                if (canStart) onStartGame(gameConfig);
              }}
              disabled={!canStart}
            >
              {!canStart ? t("waiting_for_others") : t("start_game")}
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-center mt-2">
        <button
          className="text-[10px] text-muted/50 hover:text-white transition-colors uppercase tracking-widest"
          onClick={() => setShowQRCode(true)}
        >
          {t("show_qr")}
        </button>
      </div>
    </PanelSection>
  );
}
