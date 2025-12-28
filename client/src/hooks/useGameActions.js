import { useCallback, useState } from "react";

/**
 * Centralizes socket actions and selection handling so components stay lean.
 */
export function useGameActions({
  socket,
  roomId,
  gameState,
  setInspectedPlayers,
  t,
  myId,
}) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [prevPhase, setPrevPhase] = useState(gameState.phase);

  if (gameState.phase !== prevPhase) {
    setPrevPhase(gameState.phase);
    if (gameState.phase === "WAITING") {
      setSelectedTarget(null);
    }
  }

  const emitWithRoom = useCallback(
    (event, payload = {}) => {
      if (!socket) return;
      socket.emit(event, { roomId, ...payload });
    },
    [socket, roomId]
  );

  const resetSelections = useCallback(() => setSelectedTarget(null), []);

  const onStartGame = useCallback(
    (config) => {
      emitWithRoom("start_game", { config });
      setInspectedPlayers({});
      resetSelections();
    },
    [emitWithRoom, resetSelections, setInspectedPlayers]
  );

  const onPlayerReady = useCallback(() => {
    emitWithRoom("player_ready");
  }, [emitWithRoom]);

  const onSelect = useCallback(
    (targetId) => {
      if (gameState.phase === "NIGHT_WOLVES" && gameState.me?.role === "WOLF") {
        emitWithRoom("wolf_propose", { targetId });
      }
      setSelectedTarget(targetId);
    },
    [emitWithRoom, gameState.me?.role, gameState.phase]
  );

  const onAction = useCallback(
    (type, needsTarget) => {
      if (needsTarget && !selectedTarget) {
        alert(t("select_target_first"));
        return;
      }

      emitWithRoom("night_action", {
        action: { type, targetId: selectedTarget },
      });
      resetSelections();
    },
    [emitWithRoom, resetSelections, selectedTarget, t]
  );

  const onWitchAction = useCallback(
    (type) => {
      if (type === "poison" && !selectedTarget) {
        alert(t("select_poison_target"));
        return;
      }
      emitWithRoom("night_action", {
        action: { type, targetId: selectedTarget },
      });
      resetSelections();
    },
    [emitWithRoom, resetSelections, selectedTarget, t]
  );

  const onDayVote = useCallback(
    (targetIdOverride) => {
      const targetId =
        typeof targetIdOverride === "string"
          ? targetIdOverride
          : selectedTarget;

      if (targetId) {
        emitWithRoom("day_vote", { targetId });
        resetSelections();
      } else {
        alert(t("select_vote_target"));
      }
    },
    [emitWithRoom, resetSelections, selectedTarget, t]
  );

  const onResolvePhase = useCallback(() => {
    emitWithRoom("resolve_phase");
  }, [emitWithRoom]);

  const onMayorNominate = useCallback(
    (targetIdOverride) => {
      const targetId = targetIdOverride || selectedTarget || myId;
      if (!targetId) {
        alert(t("select_target_first"));
        return;
      }
      emitWithRoom("mayor_nominate", { targetId });
    },
    [emitWithRoom, selectedTarget, myId, t]
  );

  const onMayorWithdraw = useCallback(() => {
    emitWithRoom("mayor_withdraw");
    resetSelections();
  }, [emitWithRoom, resetSelections]);

  const onMayorVote = useCallback(() => {
    if (!selectedTarget) {
      alert(t("select_target_first"));
      return;
    }
    emitWithRoom("mayor_vote", { targetId: selectedTarget });
    resetSelections();
  }, [emitWithRoom, resetSelections, selectedTarget, t]);

  const onMayorAdvance = useCallback(() => {
    emitWithRoom("mayor_advance");
  }, [emitWithRoom]);

  const onEndSpeech = useCallback(() => {
    emitWithRoom("end_speech");
  }, [emitWithRoom]);

  const onPlayAgain = useCallback(() => {
    emitWithRoom("play_again");
    setInspectedPlayers({});
    resetSelections();
  }, [emitWithRoom, resetSelections, setInspectedPlayers]);

  const actions = {
    onStartGame,
    onPlayerReady,
    onSelect,
    onAction,
    onWitchAction,
    onDayVote,
    onResolvePhase,
    onMayorNominate,
    onMayorWithdraw,
    onMayorVote,
    onMayorAdvance,
    onSkipTurn: resetSelections,
    onEndSpeech,
    onPlayAgain,
    onNightAction: onAction,
  };

  return { actions, selectedTarget, setSelectedTarget };
}
