const { ROLES, PHASES } = require("../constants");
const ROLE_DEFINITIONS = require("../RoleDefinitions");

class NightManager {
  constructor() {
    // Game-long state
    this.witchState = {
      saveUsed: false,
      poisonUsed: false,
    };
    this.guardState = {
      lastTargetId: null,
    };
    // Nightly state
    this.resetNight();
  }

  resetNight() {
    this.actions = {
      guardTarget: undefined,
      wolfTarget: null,
      wolfVotes: {},
      witchActions: { save: false, poison: null }, // Changed structure
      seerTarget: null,
      seerResult: null,
      poisonedId: null,
      wolfKillId: null,
    };
  }

  handleAction(game, playerId, action) {
    const player = game.players[playerId];
    if (!player || player.status !== "alive") return false;

    const roleDef = ROLE_DEFINITIONS[player.role];
    if (roleDef && typeof roleDef.handleAction === "function") {
      return roleDef.handleAction(game, player, action);
    }

    return false;
  }

  handlePropose(game, playerId, targetId) {
    const player = game.players[playerId];
    if (!player || player.status !== "alive") return false;

    const roleDef = ROLE_DEFINITIONS[player.role];
    if (roleDef && typeof roleDef.handlePropose === "function") {
      return roleDef.handlePropose(game, player, targetId);
    }

    return false;
  }

  resolve(game) {
    let deadIds = [];
    const wolfTarget = this.actions.wolfTarget;
    const witchActions = this.actions.witchActions || {
      save: false,
      poison: null,
    };
    const guardTarget = this.actions.guardTarget;

    if (wolfTarget) {
      let actualDeath = wolfTarget;
      const isSaved = witchActions.save;
      const isGuarded = guardTarget === wolfTarget;

      if (isSaved && isGuarded) {
        // Over-protected players still die
        actualDeath = wolfTarget;
      } else if (isSaved || isGuarded) {
        actualDeath = null;
      }

      if (actualDeath) {
        deadIds.push(actualDeath);
        this.actions.wolfKillId = actualDeath;
      }
    }

    if (witchActions.poison) {
      const poisonId = witchActions.poison;
      if (!deadIds.includes(poisonId)) {
        deadIds.push(poisonId);
      }
      this.actions.poisonedId = poisonId; // Critical for Hunter logic
    }

    // Update Guard's long-term memory
    this.guardState.lastTargetId = guardTarget;

    return {
      deadIds,
      poisonedId: this.actions.poisonedId,
      wolfKillId: this.actions.wolfKillId,
    };
  }
}

module.exports = NightManager;
