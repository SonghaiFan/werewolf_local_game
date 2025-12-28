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
  const [actionLock, setActionLock] = useState(false);
  const lockBriefly = useCallback(() => {
    setActionLock(true);
    setTimeout(() => setActionLock(false), 800);
  }, []);

  if (gameState.phase !== prevPhase) {
    setPrevPhase(gameState.phase);
    if (gameState.phase === "WAITING") {
      setSelectedTarget(null);
    }
    setActionLock(false);
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
      if (actionLock) return;
      if (needsTarget && !selectedTarget) {
        alert(t("select_target_first"));
        return;
      }

      emitWithRoom("night_action", {
        action: { type, targetId: selectedTarget },
      });
      resetSelections();
      lockBriefly();
    },
    [emitWithRoom, resetSelections, selectedTarget, t, actionLock, lockBriefly]
  );

  const onWitchAction = useCallback(
    (type) => {
      if (actionLock) return;
      if (type === "poison" && !selectedTarget) {
        alert(t("select_poison_target"));
        return;
      }
      emitWithRoom("night_action", {
        action: { type, targetId: selectedTarget },
      });
      resetSelections();
      lockBriefly();
    },
    [emitWithRoom, resetSelections, selectedTarget, t, actionLock, lockBriefly]
  );

  const onDayVote = useCallback(
    (targetIdOverride) => {
      if (actionLock) return;
      const targetId =
        typeof targetIdOverride === "string"
          ? targetIdOverride
          : selectedTarget;

      if (targetId) {
        emitWithRoom("day_vote", { targetId });
        resetSelections();
        lockBriefly();
      } else {
        alert(t("select_vote_target"));
      }
    },
    [emitWithRoom, resetSelections, selectedTarget, t, actionLock, lockBriefly]
  );

  const onResolvePhase = useCallback(() => {
    if (actionLock) return;
    emitWithRoom("resolve_phase");
    lockBriefly();
  }, [emitWithRoom, actionLock, lockBriefly]);

  const onMayorNominate = useCallback(
    (targetIdOverride) => {
      if (actionLock) return;
      const targetId = targetIdOverride || selectedTarget || myId;
      if (!targetId) {
        alert(t("select_target_first"));
        return;
      }
      emitWithRoom("mayor_nominate", { targetId });
      lockBriefly();
    },
    [emitWithRoom, selectedTarget, myId, t, actionLock, lockBriefly]
  );

  const onMayorWithdraw = useCallback(() => {
    if (actionLock) return;
    emitWithRoom("mayor_withdraw");
    resetSelections();
    lockBriefly();
  }, [emitWithRoom, resetSelections, actionLock, lockBriefly]);

  const onMayorPass = useCallback(() => {
    if (actionLock) return;
    emitWithRoom("mayor_pass");
    resetSelections();
    lockBriefly();
  }, [emitWithRoom, resetSelections, actionLock, lockBriefly]);

  const onMayorVote = useCallback(() => {
    if (actionLock) return;
    if (!selectedTarget) {
      alert(t("select_target_first"));
      return;
    }
    emitWithRoom("mayor_vote", { targetId: selectedTarget });
    resetSelections();
    lockBriefly();
  }, [emitWithRoom, resetSelections, selectedTarget, t, actionLock, lockBriefly]);

  const onMayorAdvance = useCallback(() => {
    if (actionLock) return;
    emitWithRoom("mayor_advance");
    lockBriefly();
  }, [emitWithRoom, actionLock, lockBriefly]);

  const onEndSpeech = useCallback(() => {
    if (actionLock) return;
    emitWithRoom("end_speech");
    lockBriefly();
  }, [emitWithRoom, actionLock, lockBriefly]);

  const onPlayAgain = useCallback(() => {
    emitWithRoom("play_again");
    setInspectedPlayers({});
    resetSelections();
  }, [emitWithRoom, resetSelections, setInspectedPlayers]);

  const onSkipTurn = useCallback(() => {
    if (actionLock) return;
    emitWithRoom("night_action", { action: { type: "skip" } });
    resetSelections();
    lockBriefly();
  }, [emitWithRoom, resetSelections, actionLock, lockBriefly]);

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
    onMayorPass,
    onMayorVote,
    onMayorAdvance,
    onSkipTurn,
    onEndSpeech,
    onPlayAgain,
    onNightAction: onAction,
  };

  return { actions, selectedTarget, setSelectedTarget };
}
