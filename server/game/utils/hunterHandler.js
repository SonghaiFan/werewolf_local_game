const { PHASES } = require("../constants");

/**
 * Handles the special Hunter shoot/skip logic during DAY_HUNTER_DECIDE.
 * Returns true if the action was handled here (so caller can stop).
 */
function handleHunterDecision(game, playerId, action) {
  if (
    game.phase !== PHASES.DAY_HUNTER_DECIDE ||
    playerId !== game.hunterDeadId
  ) {
    return false;
  }

  console.log(`[Hunter] Entity accepted action. Processing shot...`);
  const me = game.players[playerId];
  if (me) me.hunterShotAction = true;

  if (action.type === "shoot") {
    const target = game.players[action.targetId];
    console.log(
      `[Hunter] Target: ${target?.name} (${action.targetId}), Status: ${target?.status}`
    );
    if (target && target.status === "alive") {
      target.status = "dead";
      game.hunterShootTarget = action.targetId;
      game.addLog(
        `JUDGE: The Hunter shot and killed ${String(target.avatar || "?").padStart(
          2,
          "0"
        )}号玩家.`
      );
      game.triggerVoice("HUNTER_SHOT", String(target.avatar || "?"));

      game.checkDeathTriggers(action.targetId, "shoot");
    } else {
      console.log(`[Hunter] Target invalid or already dead.`);
    }
  } else {
    game.addLog("JUDGE: The Hunter chose not to shoot.");
  }

  setTimeout(() => {
    game.hunterDeadId = null;

    if (game.onGameUpdate) game.onGameUpdate(game);

    const winResult = game.checkWinCondition();
    if (winResult) {
      game.finishGame(winResult);
      return;
    }

    const nextHunterId = game.findNextPendingHunter();
    if (nextHunterId) {
      game.hunterDeadId = nextHunterId;
      game.advancePhase(PHASES.DAY_HUNTER_DECIDE);
    } else {
      if (game.hunterCallback) {
        const cb = game.hunterCallback;
        game.hunterCallback = null;
        cb();
      } else if (game.phaseBeforeHunter === PHASES.DAY_LEAVE_SPEECH) {
        game.phase = PHASES.DAY_LEAVE_SPEECH;
        game.logs.push(`--- PHASE: ${PHASES.DAY_LEAVE_SPEECH} ---`);

        const currentSpeakerId =
          game.dayManager.speakingOrder[game.dayManager.currentSpeakerIndex];
        if (currentSpeakerId && game.players[currentSpeakerId]) {
          const avatar = game.players[currentSpeakerId].avatar;
          game.triggerVoice("NEXT_SPEAKER", String(avatar));
        } else {
          game.triggerVoice(PHASES.DAY_LEAVE_SPEECH, "请发表遗言。");
        }
        game.onGameUpdate && game.onGameUpdate(game);
      } else if (game.phaseBeforeHunter === PHASES.DAY_ANNOUNCE) {
        game.advancePhase(PHASES.DAY_DISCUSSION);
      } else {
        game.advancePhase(PHASES.DAY_DISCUSSION);
      }
    }
  }, 3000);

  if (game.onGameUpdate) game.onGameUpdate(game);
  return true;
}

module.exports = { handleHunterDecision };
