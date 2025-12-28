import { useTranslation } from "react-i18next";
import { useGameContext } from "../../context/GameContext";
import { PanelSection, PanelInfo } from "./BasePanel";

export default function DayPanel() {
  const { t } = useTranslation();
  const { gameState, myId, hostId, executedId, metadata, actions, selectedTarget } =
    useGameContext();
  const { phase, players, speaking, pkCandidates } = gameState;
  const isHost = hostId === myId;
  const hasActed = gameState.me?.hasActed;
  const onEndSpeech = actions.onEndSpeech;
  const onDayVote = actions.onDayVote;
  const onMayorNominate = actions.onMayorNominate;
  const onMayorWithdraw = actions.onMayorWithdraw;
  const onMayorVote = actions.onMayorVote;
  const onMayorAdvance = actions.onMayorAdvance;
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

  // --- MAYOR NOMINATION ---
  if (phase === "DAY_MAYOR_NOMINATE") {
    const nominees = metadata?.mayorNominees || [];
    const isRunning = nominees.includes(myId);
    return (
      <PanelSection title={t("mayor_nomination_title", "Mayor Nomination")}>
        <PanelInfo>
          <p className="text-sm text-muted">
            {t("mayor_nomination_desc", "Select a player to nominate.")}
          </p>
          {nominees.length > 0 && (
            <div className="text-xs text-muted mt-2">
              {t("mayor_nominees_label", "Nominees")}: {nominees.length}
            </div>
          )}
        </PanelInfo>
        <div className="flex gap-3 mt-2">
          <button
            className={`btn-primary w-full ${isRunning ? "bg-blue-900/40 border-blue-500/40" : ""}`}
            onClick={() => onMayorNominate(myId)}
          >
            {isRunning ? t("withdraw", "Withdraw") : t("nominate", "Nominate")}
          </button>
          <button
            className="btn-secondary text-[10px] uppercase tracking-widest"
            onClick={onMayorAdvance}
          >
            {t("advance", "Advance")}
          </button>
        </div>
      </PanelSection>
    );
  }

  // --- MAYOR VOTE ---
  if (phase === "DAY_MAYOR_VOTE") {
    const nominees = metadata?.mayorNominees || [];
    if (nominees.includes(myId)) {
      return (
        <PanelSection>
          <PanelInfo>
            <div className="font-mono text-[10px] mb-1 text-muted opacity-40 uppercase tracking-[0.2em]">
              {t("mayor_nominees_label", "Nominees")}
            </div>
            <p className="text-sm text-muted font-medium italic">
              {t("waiting_for_others")}
            </p>
          </PanelInfo>
        </PanelSection>
      );
    }
    const targetName =
      selectedTarget && players?.[selectedTarget]
        ? players[selectedTarget].name
        : t("select_vote_target");
    const nomineeNames =
      nominees.length > 0
        ? nominees
            .map((id) => players?.[id]?.name || id)
            .filter(Boolean)
            .join(", ")
        : t("none", "None");

    return (
      <PanelSection title={t("mayor_vote_title", "Mayor Vote")}>
        <PanelInfo>
          <div className="text-sm text-muted">
            {t("mayor_vote_nominees", "Nominees")}: {nomineeNames || t("none", "None")}
          </div>
          <div className="text-xs text-muted mt-1">
            {t("mayor_vote_selected", "Selected")}: {targetName || t("none", "None")}
          </div>
          <div className="text-[10px] text-muted/60 mt-1">
            {t("mayor_vote_hint")}
          </div>
        </PanelInfo>
        <div className="flex gap-3 mt-2">
          <button className="btn-primary w-full" onClick={onMayorVote}>
            {t("vote", "Vote")}
          </button>
          {isHost && (
            <button
              className="btn-secondary text-[10px] uppercase tracking-widest"
              onClick={onMayorAdvance}
            >
              {t("close_vote", "Close Vote")}
            </button>
          )}
        </div>
      </PanelSection>
    );
  }

  // --- MAYOR SPEECH / PK SPEECH ---
  if (phase === "DAY_MAYOR_SPEECH" || phase === "DAY_MAYOR_PK_SPEECH") {
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
      <PanelSection
        title={
          phase === "DAY_MAYOR_PK_SPEECH"
            ? t("mayor_pk_speech_title", "Mayor PK Speech")
            : t("mayor_speech_title", "Mayor Speech")
        }
      >
        <PanelInfo type={isMyTurn ? "primary" : "default"}>
          <div className="font-black tracking-tight">{speakerLabel}</div>
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
        {isHost && (
          <button
            className="btn-secondary w-full mt-3 text-[10px] uppercase tracking-widest"
            onClick={onMayorAdvance}
          >
            {t("advance", "Advance")}
          </button>
        )}
      </PanelSection>
    );
  }

  // --- MAYOR WITHDRAW ---
  if (phase === "DAY_MAYOR_WITHDRAW") {
    const nominees = metadata?.mayorNominees || [];
    return (
      <PanelSection title={t("mayor_withdraw_title", "Withdraw?")}>
        <PanelInfo>
          <p className="text-sm text-muted">
            {t("mayor_nominees_label", "Nominees")}:{" "}
            {nominees
              .map((id) => players?.[id]?.name || id)
              .filter(Boolean)
              .join(", ") || t("none", "None")}
          </p>
          <p className="text-xs text-muted mt-1">
            {t("mayor_withdraw_desc", "Withdraw to exit the ballot.")}
          </p>
        </PanelInfo>
        <div className="flex gap-3 mt-2">
          {nominees.includes(myId) && (
            <button className="btn-secondary w-full" onClick={onMayorWithdraw}>
              {t("withdraw", "Withdraw")}
            </button>
          )}
          {isHost && (
            <button
              className="btn-primary w-full text-[10px] uppercase tracking-widest"
              onClick={onMayorAdvance}
            >
              {t("advance", "Advance")}
            </button>
          )}
        </div>
      </PanelSection>
    );
  }

  // --- MAYOR PK VOTE ---
  if (phase === "DAY_MAYOR_PK_VOTE") {
    const nominees = metadata?.mayorPkCandidates || [];
    if (nominees.includes(myId)) {
      return (
        <PanelSection>
          <PanelInfo>
            <div className="font-mono text-[10px] mb-1 text-muted opacity-40 uppercase tracking-[0.2em]">
              PK
            </div>
            <p className="text-sm text-muted font-medium italic">
              {t("waiting_for_others")}
            </p>
          </PanelInfo>
        </PanelSection>
      );
    }
    const targetName =
      selectedTarget && players?.[selectedTarget]
        ? players[selectedTarget].name
        : t("select_vote_target");
    const nomineeNames =
      nominees.length > 0
        ? nominees
            .map((id) => players?.[id]?.name || id)
            .filter(Boolean)
            .join(", ")
        : "None";

    return (
      <PanelSection title={t("mayor_pk_vote_title", "Mayor PK Vote")}>
        <PanelInfo>
          <div className="text-sm text-muted">
            {t("mayor_pk_candidates", "PK candidates")}: {nomineeNames}
          </div>
          <div className="text-xs text-muted mt-1">
            {t("mayor_vote_selected", "Selected")}: {targetName || t("none", "None")}
          </div>
        </PanelInfo>
        <div className="flex gap-3 mt-2">
          <button className="btn-danger w-full" onClick={onMayorVote}>
            {t("vote", "Vote")}
          </button>
          {isHost && (
            <button
              className="btn-secondary text-[10px] uppercase tracking-widest"
              onClick={onMayorAdvance}
            >
              {t("close_vote", "Close Vote")}
            </button>
          )}
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
