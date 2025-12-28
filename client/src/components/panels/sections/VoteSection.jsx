import {
  PanelSection,
  PanelInfo,
  PanelActions,
  PanelProcessControl,
  IdleMessage,
} from "../BasePanel";
import { IdleSection } from "./IdleSection";

export function VoteSection({
  t,
  title,
  // Waiting State
  isCandidate = false,
  candidateLabel = "CANDIDATE",
  hasActed = false,

  // Info Display
  candidates = [],
  candidateListLabel,
  selectedTarget,
  players,
  hint,
  showTarget = true,

  // Actions
  onVote,
  voteLabel,
  voteButtonClass = "btn-primary",
  canVote = true,
  onAbstain,
  abstainLabel,

  // Host
  isHost,
  onCloseVote,
  closeVoteLabel,
}) {
  // 1. Candidate Waiting State
  if (isCandidate) {
    return <IdleSection title={candidateLabel} content={t("wait_turn")} />;
  }

  // 2. Has Acted Waiting State
  if (hasActed) {
    return <IdleSection content={t("waiting_for_others")} animate={true} />;
  }

  // 3. Voting UI
  const targetName =
    selectedTarget && players?.[selectedTarget]
      ? players[selectedTarget].name
      : t("select_vote_target");

  const candidateNames =
    candidates.length > 0
      ? candidates
          .map((id) => players?.[id]?.name || id)
          .filter(Boolean)
          .join(", ")
      : null;

  const hasInfo = (candidateNames && candidateListLabel) || showTarget || hint;

  return (
    <PanelSection title={title}>
      {hasInfo && (
        <PanelInfo>
          {candidateNames && candidateListLabel && (
            <div className="text-sm text-muted">
              {candidateListLabel}: {candidateNames}
            </div>
          )}

          {showTarget && (
            <div className="text-xs text-muted mt-1">
              {t("mayor_vote_selected", "Selected")}:{" "}
              {targetName || t("none", "None")}
            </div>
          )}

          {hint && <div className="text-[10px] text-muted/60 mt-1">{hint}</div>}
        </PanelInfo>
      )}

      <PanelActions>
        {canVote && (
          <button
            className={`${voteButtonClass} w-full ${
              onAbstain ? "" : "col-span-2"
            }`}
            onClick={onVote}
          >
            {voteLabel || t("vote")}
          </button>
        )}
        {onAbstain && (
          <button
            className="btn-secondary text-[10px] uppercase tracking-widest py-2"
            onClick={onAbstain}
          >
            {abstainLabel || t("abstain")}
          </button>
        )}
      </PanelActions>

      {isHost && onCloseVote && (
        <PanelProcessControl>
          <button
            className="btn-secondary w-full text-[10px] uppercase tracking-widest"
            onClick={onCloseVote}
          >
            {closeVoteLabel || t("close_vote")}
          </button>
        </PanelProcessControl>
      )}
    </PanelSection>
  );
}
