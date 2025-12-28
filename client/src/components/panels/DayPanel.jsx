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
  const role = gameState.me?.role;
  const isPoisoned = gameState.me?.isPoisoned;

  // --- LEAVE SPEECH ---
  if (phase === "DAY_LEAVE_SPEECH") {
    const isMeDying = executedId === myId;
    if (isMeDying) {
      return (
        <PanelSection title={t("last_words")}>
          {role === "HUNTER" && isPoisoned && (
            <PanelInfo type="danger" className="mb-4">
              {t("hunter_poisoned_hint")}
            </PanelInfo>
          )}
          <button className="btn-primary w-full" onClick={onEndSpeech}>
            {t("end_speech")}
          </button>
        </PanelSection>
      );
    }
    return (
      <PanelSection title={t("execution")}>
        <PanelInfo>
          <p className="text-sm text-muted">
            {t("leaving_words", {
              name: players?.[executedId]?.name || "Player",
            })}
          </p>
        </PanelInfo>
        {isHost && (
          <button
            className="text-[10px] text-muted underline hover:text-white mt-4 mx-auto block"
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
      <PanelSection title={t("judge_speaking")}>
        <div className="flex justify-center py-4">
          <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
        </div>
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
      ? isMyTurn
        ? t("you")
        : t("player_speaking", {
            number: String(speaker.avatar || "0").padStart(2, "0"),
          })
      : t("unknown_role");

    return (
      <PanelSection title={isMyTurn ? t("your_turn_speaking") : t("listening")}>
        <PanelInfo type={isMyTurn ? "primary" : "default"}>
          <div className={`font-black tracking-tight `}>{speakerLabel}</div>
        </PanelInfo>

        {isMyTurn && (
          <button className="btn-primary w-full mt-2" onClick={onEndSpeech}>
            {t("end_speech")}
          </button>
        )}

        {isHost && !isMyTurn && (
          <div className="text-center mt-3">
            <button
              className="btn-outline w-full py-2 text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100"
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
      <PanelSection title={t("vote_required")}>
        <div className="flex flex-col gap-3">
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
            {t("abstain")}
          </button>
        </div>
      </PanelSection>
    );
  }

  return null;
}
