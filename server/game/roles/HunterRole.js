const { ROLES, PHASES } = require("../constants");

module.exports = {
  id: ROLES.HUNTER,
  side: "GOOD",
  canActAtNight: false,
  getAvailableActions: (game, player) => {
    // Hunter only acts in the special death decision phase
    if (game.phase !== PHASES.DAY_HUNTER_DECIDE) return [];

    // This player must be the one who is currently "deciding" (the dead hunter)
    if (game.hunterDeadId !== player.id) return [];

    return [
      {
        type: "shoot",
        label: "shoot_target",
        needsTarget: true,
      },
      {
        type: "skip",
        label: "do_nothing",
        needsTarget: false,
      },
    ];
  },

  onDeath: (game, player, cause) => {
    // Rule: Hunter cannot shoot if poisoned at night
    if (cause === "night" && game.poisonedId === player.id) {
      return;
    }
    game.hunterDeadId = player.id;
  },

  interruptDeathProcessing: (game, player, nextStepCallback, options = {}) => {
    if (game.hunterDeadId === player.id) {
      game.hunterCallback = nextStepCallback;
      const delay = options.delay || 2000;
      setTimeout(() => {
        game.advancePhase(PHASES.DAY_HUNTER_DECIDE);
      }, delay);
      return true;
    }
    return false;
  },
};
