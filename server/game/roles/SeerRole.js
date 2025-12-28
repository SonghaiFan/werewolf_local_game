const { ROLES, PHASES } = require("../constants");

module.exports = {
  id: ROLES.SEER,
  side: "GOOD",
  nightPhase: PHASES.NIGHT_SEER,
  nightPriority: 30,
  canActAtNight: true,
  getAvailableActions: (game, player) => {
    if (game.phase !== PHASES.NIGHT_SEER) return [];
    return [{ type: "check", label: "check_identity", needsTarget: true }];
  },

  handleAction: (game, player, action) => {
    if (game.phase !== PHASES.NIGHT_SEER) return false;

    if (action.type === "check") {
      const nightManager = game.nightManager;
      nightManager.actions.seerTarget = action.targetId;
      const target = game.players[action.targetId];
      // Format result clearly: 'WOLF' or 'GOOD'
      const result = target
        ? target.role === ROLES.WOLF
          ? "WOLF"
          : "GOOD"
        : "UNKNOWN";

      nightManager.actions.seerResult = {
        targetId: action.targetId,
        status: result,
      };

      game.addLog("JUDGE: The Seer has acted.");
      setTimeout(() => game.nextPhase(), 1500);
      return { targetId: action.targetId, role: result };
    }
    return false;
  },
};
