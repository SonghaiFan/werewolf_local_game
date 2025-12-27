const { ROLES, PHASES } = require("../constants");

module.exports = {
  id: ROLES.WOLF,
  side: "BAD",
  nightPhase: PHASES.NIGHT_WOLVES,
  nightPriority: 10,
  canActAtNight: true,
  getAvailableActions: (game, player) => {
    if (game.phase !== PHASES.NIGHT_WOLVES) return [];
    // Note: Wolves can self-kill (no disabledTargets for self)
    return [{ type: "kill", label: "kill_target", needsTarget: true }];
  },

  handleAction: (game, player, action) => {
    if (game.phase !== PHASES.NIGHT_WOLVES) return false;
    if (action.type === "kill") {
      game.nightManager.actions.wolfTarget = action.targetId;
      // Auto-advance
      setTimeout(() => game.nextPhase(), 1000);
      return true;
    }
    return false;
  },

  handlePropose: (game, player, targetId) => {
    if (game.phase !== PHASES.NIGHT_WOLVES) return false;

    const nightManager = game.nightManager;
    // Toggle or Set
    if (nightManager.actions.wolfVotes[player.id] === targetId) {
      delete nightManager.actions.wolfVotes[player.id];
    } else {
      nightManager.actions.wolfVotes[player.id] = targetId;
    }
    return true;
  },
};
