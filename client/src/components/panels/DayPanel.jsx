import { useTranslation } from "react-i18next";
import { useGameContext } from "../../context/GameContext";
import {
  PanelSection,
  PanelInfo,
  PanelActions,
  PanelProcessControl,
  IdleMessage,
} from "./BasePanel";
import { VoteSection } from "./sections/VoteSection";
import { SpeechSection } from "./sections/SpeechSection";

export default function DayPanel() {
  const { t } = useTranslation();
  const {
    gameState,
    myId,
    hostId,
    executedId,
    metadata,
    actions,
    selectedTarget,
    phase,
    role,
  } = useGameContext();

  const { players, speaking, pkCandidates } = gameState;
  const isHost = hostId === myId;
  const hasActed = gameState.me?.hasActed;
  const isPoisoned = gameState.me?.isPoisoned;

  const {
    onEndSpeech,
    onDayVote,
    onMayorNominate,
    onMayorWithdraw,
    onMayorStay,
    onMayorPass,
    onMayorVote,
    onMayorAdvance,
  } = actions;

  const commonProps = {
    t,
    players,
    isHost,
  };

  // --- LEAVE SPEECH ---
  if (phase === "DAY_LEAVE_SPEECH") {
    const isMeDying = executedId === myId;
    return (
      <SpeechSection
        {...commonProps}
        title={isMeDying ? t("last_words") : t("execution")}
        speaking={{ currentSpeakerId: executedId }}
        myId={myId}
        onEndSpeech={onEndSpeech}
        customLabel={
          !isMeDying ? (
            <p className="text-sm text-muted font-normal">
              {t("leaving_words", {
                name: players?.[executedId]?.name || "Player",
              })}
            </p>
          ) : null
        }
      >
        {isMeDying && role === "HUNTER" && isPoisoned && (
          <PanelInfo type="danger" className="mb-4">
            {t("hunter_poisoned_hint")}
          </PanelInfo>
        )}
      </SpeechSection>
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
      <VoteSection
        {...commonProps}
        hasActed={hasActed}
        title={t("mayor_nomination_title", "Mayor Nomination")}
        showTarget={false}
        onVote={() => onMayorNominate(myId)}
        voteLabel={
          isRunning ? t("withdraw", "Withdraw") : t("nominate", "Nominate")
        }
        voteButtonClass={`btn-primary ${
          isRunning ? "bg-blue-900/40 border-blue-500/40" : ""
        }`}
        onAbstain={onMayorPass}
        abstainLabel={t("skip", "Skip")}
        onCloseVote={onMayorAdvance}
        closeVoteLabel={t("advance", "Advance")}
      />
    );
  }

  // --- MAYOR VOTE ---
  if (phase === "DAY_MAYOR_VOTE") {
    return (
      <VoteSection
        {...commonProps}
        title={t("mayor_vote_title", "Mayor Vote")}
        isCandidate={metadata?.mayorNominees?.includes(myId)}
        candidateLabel={t("mayor_nominees_label", "Nominees")}
        candidates={metadata?.mayorNominees || []}
        candidateListLabel={t("mayor_vote_nominees", "Nominees")}
        selectedTarget={selectedTarget}
        hint={t("mayor_vote_hint")}
        onVote={onMayorVote}
        voteLabel={t("vote", "Vote")}
        onCloseVote={onMayorAdvance}
        closeVoteLabel={t("close_vote", "Close Vote")}
      />
    );
  }

  // --- MAYOR SPEECH / PK SPEECH ---
  if (phase === "DAY_MAYOR_SPEECH" || phase === "DAY_MAYOR_PK_SPEECH") {
    return (
      <SpeechSection
        {...commonProps}
        title={
          phase === "DAY_MAYOR_PK_SPEECH"
            ? t("mayor_pk_speech_title", "Mayor PK Speech")
            : t("mayor_speech_title", "Mayor Speech")
        }
        speaking={speaking}
        myId={myId}
        onEndSpeech={onEndSpeech}
        onAdvance={onMayorAdvance}
      />
    );
  }

  // --- MAYOR WITHDRAW ---
  if (phase === "DAY_MAYOR_WITHDRAW") {
    const nominees = metadata?.mayorNominees || [];
    const responded = metadata?.mayorWithdrawResponded || [];

    // Am I still a nominee and haven't responded?
    const canDecide = nominees.includes(myId) && !responded.includes(myId);

    return (
      <PanelSection
        title={t("mayor_withdraw_title", "Mayor Election: Withdraw Phase")}
      >
        {/* Action Buttons */}
        {canDecide ? (
          <PanelActions>
            <button className="btn-secondary py-3" onClick={onMayorWithdraw}>
              {t("withdraw", "Withdraw")}
            </button>
            <button className="btn-primary py-3" onClick={onMayorStay}>
              {t("stay", "Stay")}
            </button>
          </PanelActions>
        ) : (
          <IdleMessage>{t("waiting_for_others")}</IdleMessage>
        )}

        {/* Host Force Advance */}
        {isHost && (
          <PanelProcessControl>
            <button
              className="btn-ghost text-xs text-muted hover:text-white"
              onClick={onMayorAdvance}
            >
              {t("force_advance", "Force Advance")}
            </button>
          </PanelProcessControl>
        )}
      </PanelSection>
    );
  }

  // --- MAYOR PK VOTE ---
  if (phase === "DAY_MAYOR_PK_VOTE") {
    return (
      <VoteSection
        {...commonProps}
        title={t("mayor_pk_vote_title", "Mayor PK Vote")}
        isCandidate={metadata?.mayorPkCandidates?.includes(myId)}
        candidateLabel="PK"
        candidates={metadata?.mayorPkCandidates || []}
        candidateListLabel={t("mayor_pk_candidates", "PK candidates")}
        selectedTarget={selectedTarget}
        showTarget={false}
        onVote={onMayorVote}
        voteLabel={t("vote", "Vote")}
        voteButtonClass="btn-danger"
        onCloseVote={onMayorAdvance}
        closeVoteLabel={t("close_vote", "Close Vote")}
      />
    );
  }

  // --- DISCUSSION / PK SPEECH ---
  if (phase === "DAY_DISCUSSION" || phase === "DAY_PK_SPEECH") {
    return (
      <SpeechSection
        {...commonProps}
        speaking={speaking}
        myId={myId}
        onEndSpeech={onEndSpeech}
      />
    );
  }

  // --- VOTE / PK VOTE ---
  if (phase === "DAY_VOTE" || phase === "DAY_PK_VOTE") {
    return (
      <VoteSection
        {...commonProps}
        title={t("vote_required")}
        isCandidate={
          phase === "DAY_PK_VOTE" && pkCandidates && pkCandidates.includes(myId)
        }
        candidateLabel="PK CANDIDATE"
        hasActed={hasActed}
        onVote={() => onDayVote()}
        voteLabel={t("confirm_vote")}
        voteButtonClass="btn-danger"
        onAbstain={() => onDayVote("abstain")}
        abstainLabel={t("abstain")}
        selectedTarget={selectedTarget}
      />
    );
  }

  return null;
}
