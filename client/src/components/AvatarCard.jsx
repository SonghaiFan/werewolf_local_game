import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useGameContext } from "../context/GameContext";
import { RoleIcons } from "./RoleIcons";

export default function AvatarCard({
  player,
  onSelect,
  size = "7rem",
  className = "",
}) {
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

  const [isRevealed, setIsRevealed] = React.useState(false);

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

  // Phase checks (moved up for hooks)
  const isMayorVotePhase = phase === "DAY_MAYOR_VOTE";
  const isMayorPkVotePhase = phase === "DAY_MAYOR_PK_VOTE";
  const isDayVotePhase =
    phase === "DAY_VOTE" ||
    phase === "DAY_PK_VOTE" ||
    phase === "DAY_ELIMINATION";

  const voteMap =
    isDayVotePhase && gameState.votes
      ? gameState.votes
      : (isMayorVotePhase || isMayorPkVotePhase) && metadata?.mayorVotes
      ? metadata.mayorVotes
      : {};

  const votersForPlayer =
    !player || !voteMap
      ? []
      : Object.entries(voteMap)
          .filter(([, targetId]) => String(targetId) === String(player.id))
          .map(([voterId]) => gameState.players?.[voterId])
          .filter(Boolean);

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
  // If it's my Hunter turn, I shouldn't see others roles yet.
  const showCardFace =
    (isMe && isRevealed) ||
    (player.role && (isDead || (hasPublicRole && !isMe)));

  const roleKey = (player.role || "UNKNOWN").toUpperCase();
  const roleIcon = RoleIcons[roleKey] || RoleIcons.UNKNOWN;

  let isSelectable =
    (!isDead || isMyHunterTurn) &&
    !isTargetDisabled &&
    player.status !== "dead";

  // Mayor voting restriction: only allow selecting nominees/PK candidates
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

  const seatLabel = (p) => String(p?.avatar || "?").padStart(2, "0");
  const voteBadgeClass =
    isMayorVotePhase || isMayorPkVotePhase ? "bg-indigo-500" : "bg-danger";

  return (
    <div
      className={`
                relative aspect-square flex flex-col justify-between
                bg-surface/60 backdrop-blur-sm border border-white/5 rounded-[var(--radius-lg)] shadow-lg
                transition-all duration-300 ease-out overflow-hidden
                ${
                  canInteract
                    ? "cursor-pointer hover:bg-surface hover:shadow-xl hover:-translate-y-1"
                    : ""
                }
                ${dimEffect ? "opacity-20 grayscale" : ""}
                ${blurEffect ? "blur-[1px]" : ""}
                ${
                  isSelected
                    ? "ring-2 ring-primary border-transparent bg-primary/10 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                    : ""
                }
                ${className}
            `}
      style={{
        borderRadius: "var(--radius-lg)",
        width: size,
      }}
      onClick={() => {
        if (canInteract) {
          handleSelect(player.id);
        } else if (disabledReason) {
          alert(t(disabledReason));
        }
      }}
    >
      {/* Top Bar: Player Name & Status */}
      <div
        className={`
                px-3 py-2 border-b border-border/50 flex justify-between items-center
                                ${
                                  inspectedRole === "WOLF"
                                    ? "bg-danger/10"
                                    : inspectedRole
                                    ? "bg-emerald-500/5"
                                    : ""
                                }
            `}
      >
        <div className="flex items-baseline gap-2 overflow-hidden">
          <span className="font-mono text-lg font-black text-ink leading-none tracking-tight">
            {String(player.avatar || "0").padStart(2, "0")}
          </span>
          <span className="truncate text-[9px] text-muted/60 font-medium uppercase tracking-wide">
            {player.name}
          </span>
        </div>
        {isPkCandidate && (
          <span className="shrink-0 px-1.5 py-0.5 bg-danger text-white text-[9px] font-bold rounded uppercase tracking-wider animate-pulse">
            PK
          </span>
        )}
        {/* Ready Status indicator */}
        {phase === "WAITING" && (
          <span
            className={`shrink-0 w-1.5 h-1.5 rounded-full ${
              player.isReady
                ? "bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.5)]"
                : "bg-border"
            }`}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex items-center justify-center p-2">
        {showCardFace ? (
          // --- FRONT (Role Revealed) ---
          <div
            className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in duration-300 cursor-pointer"
            onClick={(e) => {
              if (isMe && !isDead && !canInteract) {
                e.stopPropagation();
                setIsRevealed(false);
              }
            }}
          >
            <div
              className={`w-8 h-8 md:w-10 md:h-10 mb-1 ${
                isDead ? "text-muted" : "text-primary"
              }`}
            >
              {roleIcon}
            </div>

            <div className="text-xs font-bold uppercase tracking-wider text-ink/90 scale-75 md:scale-100 origin-center transition-transform">
              {roleKey ? t(`roles.${roleKey}`, roleKey) : t("unknown_role")}
            </div>

            {/* Reveal Toggle Button (Self Only - Hide) */}
            {isMe && !isDead && (
              <div
                className="absolute -bottom-2 -left-2 z-40 p-2 rounded-full hover:bg-black/20 text-primary/40 hover:text-primary transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRevealed(false);
                }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18"
                  />
                </svg>
              </div>
            )}
          </div>
        ) : (
          // --- BACK (Hidden) ---
          <div
            className="w-full h-full flex items-center justify-center relative group"
            onClick={(e) => {
              if (isMe && !isDead && !canInteract) {
                e.stopPropagation();
                setIsRevealed(true);
              }
            }}
          >
            {/* Large Number (Background) */}
            <div
              className={`font-mono text-4xl font-black select-none transition-all duration-300 ${
                isMe && !isDead
                  ? "text-primary/5 scale-90 group-hover:scale-100"
                  : "text-primary/5"
              }`}
            >
              {String(player.avatar || "00").padStart(2, "0")}
            </div>

            {/* Reveal Toggle Button (Self Only) */}
            {isMe && !isDead && (
              <div
                className="absolute -bottom-2 -left-2 z-40 p-2 rounded-full hover:bg-black/20 text-primary/40 hover:text-primary transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRevealed(true);
                }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Badges Overlay */}
      <div className="absolute bottom-2 left-2 flex flex-col gap-1 z-20 pointer-events-none">
        {/* Guard Protection Target */}
        {gameState.me?.guardTarget === player.id && (
          <div className="bg-sky-500 text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface shadow-sm text-[10px]">
            <svg
              className="w-2.5 h-2.5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
        )}

        {isVictim && (
          <div className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse">
            {t("victim")}
          </div>
        )}
        {inspectedRole && (
          <div
            className={`
                        text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg
                        ${
                          inspectedRole === "WOLF"
                            ? "bg-danger"
                            : "bg-green-600"
                        }
                    `}
          >
            {inspectedRole === "WOLF" ? t("identity_bad") : t("identity_good")}
          </div>
        )}
      </div>

      {/* Status Badges (Mayor flow) */}
      {(isMayor || isMayorNominee || isMayorPk) && (
        <div className="absolute bottom-2 right-2 pointer-events-none flex gap-1 flex-wrap justify-end items-end">
          {isMayor && (
            <div
              className="bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface shadow-sm"
              title={t("mayor", "Mayor")}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </div>
          )}
          {!isMayor && isMayorPk && (
            <div className="px-2 py-1 bg-danger text-white text-[9px] font-bold rounded-full shadow-sm uppercase tracking-wider">
              {t("mayor_pk_candidate", "PK")}
            </div>
          )}
          {!isMayor && !isMayorPk && isMayorNominee && (
            <div className="px-2 py-1 bg-blue-500/60 text-white text-[9px] font-bold rounded-full shadow-sm uppercase tracking-wider animate-pulse">
              {t("mayor_nominee", "Running")}
            </div>
          )}
        </div>
      )}

      {/* Vote markers: show who voted for this player */}
      {votersForPlayer.length > 0 && (
        <div className="absolute top-2 right-2 z-30 flex flex-wrap gap-1 justify-end max-w-[65%]">
          {votersForPlayer.map((voter) => (
            <div
              key={voter.id}
              className={`${voteBadgeClass} text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md shadow-black/20 border border-white/10`}
            >
              {seatLabel(voter)}
            </div>
          ))}
        </div>
      )}

      {/* Wolf Proposal Indicators */}
      {wolfVotes &&
        phase === "NIGHT_WOLVES" &&
        Object.entries(wolfVotes).map(([wolfId, targetId]) => {
          if (String(targetId) === String(player.id)) {
            return (
              <div
                key={wolfId}
                className="absolute top-2 right-1 z-40 animate-bounce"
              >
                <div className="bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface shadow-sm text-[10px]">
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
              </div>
            );
          }
          return null;
        })}
    </div>
  );
}
