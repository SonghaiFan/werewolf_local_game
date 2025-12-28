const { ROLES, PHASES } = require("../constants");

module.exports = {
  id: ROLES.WITCH,
  side: "GOOD",
  nightPhase: PHASES.NIGHT_WITCH,
  nightPriority: 20,
  canActAtNight: true,
  getAvailableActions: (game, player) => {
    if (game.phase !== PHASES.NIGHT_WITCH) return [];
    const { witchState, actions: nightActions } = game.nightManager;
    const currentWitchActions = nightActions.witchActions || {};
    const actions = [];

    // Rule: Cannot save self after Night 1
    const isSelfSave = game.round > 1 && nightActions.wolfTarget === player.id;

    actions.push({
      type: "save",
      label: "save_victim",
      needsTarget: false,
      disabled:
        witchState.saveUsed ||
        currentWitchActions.save ||
        !nightActions.wolfTarget ||
        isSelfSave,
      disabledReason: isSelfSave ? "cannot_save_self" : null,
    });

    actions.push({
      type: "poison",
      label: "poison_target",
      needsTarget: true,
      disabled: witchState.poisonUsed || !!currentWitchActions.poison,
    });

    actions.push({
      type: "skip",
      label: "skip",
      needsTarget: false,
    });

    return actions;
  },

  handleAction: (game, player, action) => {
    if (game.phase !== PHASES.NIGHT_WITCH) return false;

    const nightManager = game.nightManager;
    // Ensure initialization
    if (!nightManager.actions.witchActions)
      nightManager.actions.witchActions = { save: false, poison: null };

    if (action.type === "save" && !nightManager.witchState.saveUsed) {
      // Self-save restriction logic
      // Rule: Cannot save self on night > 1
      if (game.round > 1 && nightManager.actions.wolfTarget === player.id) {
        console.log("[Witch] Attempted self-save > Round 1. Blocked.");
        return false;
      }

      nightManager.actions.witchActions.save = true;
      nightManager.witchState.saveUsed = true;
    } else if (
      action.type === "poison" &&
      !nightManager.witchState.poisonUsed
    ) {
      nightManager.actions.witchActions.poison = action.targetId;
      nightManager.witchState.poisonUsed = true;
    } else if (action.type === "skip") {
      // "Skip" button acts as "Confirm/Done"
      game.addLog("JUDGE: The Witch has acted.");
      setTimeout(() => game.nextPhase(), 1000);
    }
    return true; // Updates state, triggers onGameUpdate, but waits for 'skip' to advance
  },
};
