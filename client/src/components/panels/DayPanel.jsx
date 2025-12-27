import React from "react";
import { useTranslation } from "react-i18next";
import { useGameContext } from "../../context/GameContext";
import { PanelSection, PanelInfo } from "./BasePanel";

export default function DayPanel() {
  const { t } = useTranslation();
  const { gameState, myId, hostId, executedId, actions } = useGameContext();
  const { phase, players, speaking, pkCandidates } = gameState;
  const isHost = hostId === myId;
  const hasActed = gameState.me?.hasActed;
  const onEndSpeech = actions.onEndSpeech;
  const onDayVote = actions.onDayVote;

  // --- LEAVE SPEECH ---
  if (phase === "DAY_LEAVE_SPEECH") {
    const isMeDying = executedId === myId;
    if (isMeDying) {
      return (
        <PanelSection className="text-center">
          <div className="text-danger font-bold uppercase tracking-widest mb-4">
            {t("last_words")}
          </div>
          <button className="btn-primary w-full" onClick={onEndSpeech}>
            {t("end_speech")}
          </button>
        </PanelSection>
      );
    }
    return (
      <PanelSection className="text-center">
        <div className="text-danger font-bold uppercase tracking-widest mb-2 text-xs">
          {t("execution")}
        </div>
        <p className="text-sm text-muted mb-4">
          {t("leaving_words", {
            name: players?.[executedId]?.name || "Player",
          })}
        </p>
        {isHost && (
          <button
            className="text-[10px] text-muted underline hover:text-white"
            onClick={onEndSpeech}
          >
            {t("admin_skip")}
          </button>
        )}
      </PanelSection>
    );
  }

  // --- ANNOUNCE / ELIMINATION ---
  if (phase === "DAY_ANNOUNCE" || phase === "DAY_ELIMINATION") {
    return (
      <PanelSection className="text-center text-sm text-muted animate-pulse">
        {t("judge_speaking")}
      </PanelSection>
    );
  }

  // --- DISCUSSION / PK SPEECH ---
  if (phase === "DAY_DISCUSSION" || phase === "DAY_PK_SPEECH") {
    const currentSpeakerId = speaking?.currentSpeakerId;
    const isMyTurn = currentSpeakerId === myId;
    const speaker =
      currentSpeakerId && players ? players[currentSpeakerId] : null;
    const speakerLabel = speaker
      ? `${String(speaker.avatar || "0").padStart(2, "0")} 号玩家`
      : t("unknown_role");

    return (
      <PanelSection>
        <div
          className={`p-4 rounded-[var(--radius-lg)] mb-4 text-center transition-all ${
            isMyTurn
              ? "bg-primary/10 border-primary/20"
              : "bg-surface/30 border-white/5"
          } border`}
        >
          <div className="text-[10px] uppercase tracking-widest text-muted mb-1">
            {phase === "DAY_PK_SPEECH" ? "PK SPEECH" : t("current_speaker")}
          </div>
          <div
            className={`text-lg font-bold ${
              isMyTurn ? "text-primary" : "text-ink"
            }`}
          >
            {isMyTurn ? t("you") : speakerLabel}
          </div>
        </div>

        {isMyTurn ? (
          <button className="btn-primary w-full" onClick={onEndSpeech}>
            {t("end_speech")}
          </button>
        ) : (
          <div className="text-center text-xs text-muted opacity-50">
            {t("listening")}
          </div>
        )}

        {isHost && !isMyTurn && (
          <div className="text-center mt-3">
            <button
              className="text-[10px] text-muted underline hover:text-white"
              onClick={onEndSpeech}
            >
              {t("admin_skip")}
            </button>
          </div>
        )}
      </PanelSection>
    );
  }

  // --- VOTE / PK VOTE ---
  if (phase === "DAY_VOTE" || phase === "DAY_PK_VOTE") {
    if (
      phase === "DAY_PK_VOTE" &&
      pkCandidates &&
      pkCandidates.includes(myId)
    ) {
      return (
        <PanelSection>
          <PanelInfo>
            <div className="font-mono text-[10px] mb-1 text-muted opacity-40 uppercase tracking-[0.2em]">
              PK CANDIDATE
            </div>
            <p className="text-sm text-muted font-medium italic">
              {t("wait_turn")}
            </p>
          </PanelInfo>
        </PanelSection>
      );
    }

    if (hasActed) {
      return (
        <PanelSection>
          <button
            className="btn-secondary w-full opacity-50 cursor-not-allowed"
            disabled
          >
            {t("waiting_for_others")}
          </button>
        </PanelSection>
      );
    }

    return (
      <PanelSection className="flex flex-col gap-2">
        <div className="text-center text-danger font-bold uppercase tracking-widest text-xs mb-1">
          {t("vote_required")}
        </div>
        <button
          className="btn-danger hover:shadow-red-500/20"
          onClick={() => onDayVote()}
        >
          {t("confirm_vote")}
        </button>
        <button
          className="btn-secondary text-[10px] uppercase tracking-widest py-2"
          onClick={() => onDayVote("abstain")}
        >
          {t("abstain", "Skip / Abstain")}
        </button>
      </PanelSection>
    );
  }

  // --- HUNTER DECIDE (Special Day Phase) ---
  if (phase === "DAY_HUNTER_DECIDE") {
    // This is handled by NightPanel in the original code, but it's a day phase.
    // Let's see if we should keep it here or in NightPanel.
    // The original code had: if (phase.startsWith("NIGHT_") || phase === "DAY_HUNTER_DECIDE")
    // I'll move it to NightPanel for consistency with the original logic if it uses the same action structure.
    return null;
  }

  return null;
}
