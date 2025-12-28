import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGameContext } from "../context/GameContext";
import { RoleIcons } from "../components/RoleIcons";

export function useAvatarCardLogic(player, onSelect) {
  const { t } = useTranslation();
  const {
    gameState,
    myId,
    phase,
    metadata,
    wolfTarget,
    inspectedPlayers,
    wolfVotes,
    selectedTarget,
    setSelectedTarget,
    actions,
  } = useGameContext();

  const [isRevealed, setIsRevealed] = useState(false);

  const { isTargetDisabled, disabledReason } = useMemo(() => {
    if (!player) return { isTargetDisabled: false, disabledReason: null };
    const availableActions = gameState.me?.availableActions || [];
    const action = availableActions.find(
      (action) =>
        action.needsTarget &&
        action.disabledTargets &&
        action.disabledTargets.includes(player.id)
    );
    return {
      isTargetDisabled: !!action,
      disabledReason: action?.disabledReasons?.[player.id],
    };
  }, [gameState.me?.availableActions, player]);

  // Phase checks
  const isMayorVotePhase = phase === "DAY_MAYOR_VOTE";
  const isMayorPkVotePhase = phase === "DAY_MAYOR_PK_VOTE";
  const isDayVotePhase =
    phase === "DAY_VOTE" ||
    phase === "DAY_PK_VOTE" ||
    phase === "DAY_ELIMINATION";

  const voteMap = useMemo(() => {
    if (isDayVotePhase && gameState.votes) {
      return gameState.votes;
    }
    if ((isMayorVotePhase || isMayorPkVotePhase) && metadata?.mayorVotes) {
      return metadata.mayorVotes;
    }
    return {};
  }, [
    isDayVotePhase,
    isMayorVotePhase,
    isMayorPkVotePhase,
    gameState.votes,
    metadata?.mayorVotes,
  ]);

  const votersForPlayer = useMemo(() => {
    return !player || !voteMap
      ? []
      : Object.entries(voteMap)
          .filter(([, targetId]) => String(targetId) === String(player.id))
          .map(([voterId]) => gameState.players?.[voterId])
          .filter(Boolean);
  }, [player, voteMap, gameState.players]);

  if (!player) return null;

  // Derived Selection Logic
  const isSelected = selectedTarget === player.id;
  const handleSelect =
    onSelect !== undefined ? onSelect : actions?.onSelect || setSelectedTarget;

  // Derived Inspection Logic
  const inspectedRole = inspectedPlayers ? inspectedPlayers[player.id] : null;

  const isMe = player.id === myId;
  const isDead = player.status === "dead";
  const isMyHunterTurn =
    phase === "DAY_HUNTER_DECIDE" && gameState.hunterDeadId === myId;
  const isMayor = player.specialFlags?.isMayor;

  const pId = String(player.id);
  const isVictim = Array.isArray(wolfTarget)
    ? wolfTarget.some((t) => String(t) === pId)
    : String(wolfTarget) === pId;

  const isPkCandidate =
    (phase === "DAY_PK_VOTE" || phase === "DAY_PK_SPEECH") &&
    gameState.pkCandidates &&
    gameState.pkCandidates.includes(player.id);
  const isMayorNominee = metadata?.mayorNominees?.includes(player.id);
  const isMayorPk = metadata?.mayorPkCandidates?.includes(player.id);

  const hasPublicRole = !!player.role && player.role !== "scanned";

  // Determine if we should show the card face
  const showCardFace =
    (isMe && isRevealed) ||
    (player.role && (isDead || (hasPublicRole && !isMe)));

  const roleKey = (player.role || "UNKNOWN").toUpperCase();
  const roleIcon = RoleIcons[roleKey] || RoleIcons.UNKNOWN;

  let isSelectable =
    (!isDead || isMyHunterTurn) &&
    !isTargetDisabled &&
    player.status !== "dead";

  // Mayor voting restriction
  if (isMayorVotePhase) {
    isSelectable = isSelectable && isMayorNominee;
  }
  if (isMayorPkVotePhase) {
    isSelectable = isSelectable && isMayorPk;
  }
  // Candidates themselves cannot vote; block their selection state entirely
  const isMayorCandidateSelf =
    (isMayorVotePhase && isMayorNominee && isMe) ||
    (isMayorPkVotePhase && isMayorPk && isMe);
  if (isMayorCandidateSelf) {
    isSelectable = false;
  }

  const canInteract = handleSelect && isSelectable;
  const dimEffect =
    (isDead && !isMe) ||
    (isDead && isMe && !isMyHunterTurn) ||
    (phase === "DAY_PK_VOTE" && !isPkCandidate) ||
    (isMayorVotePhase && !isMayorNominee) ||
    (isMayorPkVotePhase && !isMayorPk);
  const blurEffect = (isDead && !isMe) || (isDead && isMe && !isMyHunterTurn);

  const voteBadgeClass =
    isMayorVotePhase || isMayorPkVotePhase ? "bg-indigo-500" : "bg-danger";

  // Wolf votes for this player
  const myWolfVotes = useMemo(() => {
    if (phase !== "NIGHT_WOLVES" || !wolfVotes) return [];
    return Object.entries(wolfVotes)
      .filter(([, targetId]) => String(targetId) === String(player.id))
      .map(([wolfId]) => wolfId);
  }, [phase, wolfVotes, player.id]);

  return {
    // State
    isRevealed,
    setIsRevealed,

    // Flags
    isMe,
    isDead,
    isMayor,
    isVictim,
    isPkCandidate,
    isMayorNominee,
    isMayorPk,
    isSelected,
    isTargetDisabled,
    disabledReason,

    // Visuals
    showCardFace,
    roleKey,
    roleIcon,
    dimEffect,
    blurEffect,
    voteBadgeClass,

    // Data
    inspectedRole,
    votersForPlayer,
    myWolfVotes,
    guardTarget: gameState.me?.guardTarget,

    // Interaction
    canInteract,
    handleSelect,

    // Utils
    t,
    phase,
  };
}
