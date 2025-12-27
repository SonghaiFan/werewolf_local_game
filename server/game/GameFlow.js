const { PHASES, ROLES } = require("./constants");

const FLOW_DEFINITION = {
  [PHASES.WAITING]: { next: PHASES.GAME_START },
  [PHASES.GAME_START]: { next: PHASES.NIGHT_START },
  [PHASES.NIGHT_START]: {
    // Next is determined dynamically by calculateNightFlow
  },

  // Night Sequence
  [PHASES.NIGHT_GUARD]: {
    role: ROLES.GUARD,
    onEnter: (game) => {
      game.checkActiveRole(ROLES.GUARD);
    },
  },
  [PHASES.NIGHT_WOLVES]: {
    role: ROLES.WOLF,
    onEnter: (game) => {
      // No specific check needed as Wolves are usually handled differently or just wait
    },
  },
  [PHASES.NIGHT_WITCH]: {
    role: ROLES.WITCH,
    onEnter: (game) => {
      game.checkActiveRole(ROLES.WITCH);
    },
  },
  [PHASES.NIGHT_SEER]: {
    role: ROLES.SEER,
    onEnter: (game) => {
      game.checkActiveRole(ROLES.SEER);
    },
  },

  // Day Sequence
  [PHASES.DAY_ANNOUNCE]: {
    next: PHASES.DAY_DISCUSSION,
    onEnter: (game) => {
      game.applyPendingDeaths();
    },
  },
  [PHASES.DAY_DISCUSSION]: {
    next: PHASES.DAY_VOTE,
    onEnter: (game) => {
      game.dayManager.startDiscussion(game);
    },
  },
  [PHASES.DAY_VOTE]: {
    next: PHASES.DAY_ELIMINATION,
    onEnter: (game) => {
      game.addLog("JUDGE: Speech over. Please cast your votes now.");
      game.dayManager.resetVotes();
    },
  },
  [PHASES.DAY_ELIMINATION]: { next: PHASES.DAY_LEAVE_SPEECH },
  [PHASES.DAY_LEAVE_SPEECH]: {
    next: "RESOLVE_SPEECH_FLOW",
    onEnter: (game) => {
      if (game.executedPlayerId && game.players[game.executedPlayerId]) {
        game.addLog(
          `JUDGE: ${String(
            game.players[game.executedPlayerId].avatar || "0"
          ).padStart(2, "0")}号玩家出局，发表遗言。`
        );
      } else {
        setTimeout(() => game.nextPhase(), 1000);
      }
    },
  },

  // Hunter is special, usually triggered manually or via interrupt
  [PHASES.DAY_HUNTER_DECIDE]: { next: "RESUME_FROM_HUNTER" },
};

module.exports = FLOW_DEFINITION;
