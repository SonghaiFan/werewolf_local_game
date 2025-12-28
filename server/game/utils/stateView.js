const { PHASES, ROLES } = require("../constants");
const ROLE_DEFINITIONS = require("../RoleDefinitions");

function buildPublicState(game) {
  const publicPlayers = {};
  Object.keys(game.players).forEach((pid) => {
    const player = game.players[pid];
    publicPlayers[pid] = {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      status: player.status,
      isReady: player.isReady,
      specialFlags: player.specialFlags || {},
      isVoting:
        (game.phase === PHASES.DAY_VOTE ||
          game.phase === PHASES.DAY_PK_VOTE ||
          game.phase === PHASES.DAY_ELIMINATION) &&
        game.dayManager.votes[pid] !== undefined,
      hasAbstained:
        (game.phase === PHASES.DAY_VOTE ||
          game.phase === PHASES.DAY_PK_VOTE ||
          game.phase === PHASES.DAY_ELIMINATION) &&
        game.dayManager.votes[pid] === "abstain",
      role: game.phase === PHASES.FINISHED ? player.role : undefined,
    };
  });

  let speakingData = null;
  if (
    (game.phase === PHASES.DAY_DISCUSSION ||
      game.phase === PHASES.DAY_PK_SPEECH ||
      game.phase === PHASES.DAY_LEAVE_SPEECH ||
      game.phase === PHASES.DAY_MAYOR_SPEECH ||
      game.phase === PHASES.DAY_MAYOR_PK_SPEECH) &&
    game.dayManager.speakingOrder
  ) {
    speakingData = {
      currentSpeakerId:
        game.dayManager.speakingOrder[game.dayManager.currentSpeakerIndex] ||
        null,
      order: game.dayManager.speakingOrder,
    };
  }

  return {
    id: game.id,
    phase: game.phase,
    round: game.round,
    players: publicPlayers,
    logs: game.logs,
    speaking: speakingData,
    executedId: game.executedPlayerId,
    hunterDeadId: game.hunterDeadId,
    pkCandidates: game.pkCandidates,
    hostId: game.hostId,
    winner: game.winner,
    config: game.initialConfig,
    metadata: game.metadata || {},
  };
}

function buildPlayerState(game, playerId) {
  const publicState = buildPublicState(game);
  const me = game.players[playerId];

  if (me) {
    let info = { ...me };
    info.specialFlags = me.specialFlags || {};

    if (publicState.players[playerId]) {
      publicState.players[playerId].role = me.role;
    }

    const definition = ROLE_DEFINITIONS[me.role];
    if (definition) {
      info.capabilities = {
        canActAtNight: definition.canActAtNight,
        nightPhase: definition.nightPhase,
        side: definition.side,
      };
      info.availableActions = definition.getAvailableActions(game, me);
    }

    if (game.phase === PHASES.DAY_VOTE || game.phase === PHASES.DAY_PK_VOTE) {
      info.votes = game.dayManager.votes;
      if (game.dayManager.votes[playerId]) {
        info.hasActed = true;
      }
    }
    if (
      game.phase === PHASES.DAY_MAYOR_NOMINATE &&
      (game.metadata.mayorNominees || []).includes(playerId)
    ) {
      info.hasActed = true;
    }
    if (
      game.phase === PHASES.DAY_MAYOR_NOMINATE &&
      (game.metadata.mayorPassers || []).includes(playerId)
    ) {
      info.hasActed = true;
    }

    if (me.role === ROLES.GUARD) {
      info.guardState = game.nightManager.guardState;
      info.guardTarget = game.nightManager.actions.guardTarget;
      if (
        game.phase === PHASES.NIGHT_GUARD &&
        game.nightManager.actions.guardTarget !== undefined
      ) {
        info.hasActed = true;
      }
    }

    if (me.role === ROLES.HUNTER) {
      if (game.poisonedId === playerId) {
        info.isPoisoned = true;
      }
      if (
        game.phase === PHASES.DAY_HUNTER_DECIDE &&
        game.hunterDeadId === playerId
      ) {
        // Hunter is deciding; may still act
      }
    }

    if (me.role === ROLES.WOLF) {
      info.nightTarget = game.nightManager.actions.wolfTarget;
      info.wolfVotes = game.nightManager.actions.wolfVotes;
      if (
        game.phase === PHASES.NIGHT_WOLVES &&
        game.nightManager.actions.wolfTarget
      ) {
        info.hasActed = true;
      }
    }

    if (me.role === ROLES.WITCH) {
      info.witchState = game.nightManager.witchState;

      if (game.phase === PHASES.NIGHT_WITCH) {
        if (!game.nightManager.witchState.saveUsed) {
          info.wolfTarget = game.nightManager.actions.wolfTarget;
        }
        if (game.nightManager.actions.witchAction) {
          info.hasActed = true;
        }
      }
    }

    if (me.role === ROLES.SEER && game.phase === PHASES.NIGHT_SEER) {
      if (
        game.nightManager.actions.seerResult ||
        game.nightManager.actions.seerTarget
      ) {
        info.hasActed = true;
      }
    }

    publicState.me = info;
  }

  if (me && me.role === ROLES.WOLF) {
    Object.values(game.players).forEach((player) => {
      if (player.role === ROLES.WOLF) {
        publicState.players[player.id].role = ROLES.WOLF;
      }
    });
    if (game.phase === PHASES.NIGHT_WOLVES) {
      publicState.wolfVotes = game.nightManager.actions.wolfVotes;
    }
  }

  const isDead = me && me.status === "dead";
  const isMyLastWords =
    game.phase === PHASES.DAY_LEAVE_SPEECH &&
    game.executedPlayerId === playerId;
  const isMyHunterTurn =
    game.phase === PHASES.DAY_HUNTER_DECIDE &&
    game.hunterDeadId === playerId;

  if (
    (isDead && !isMyLastWords && !isMyHunterTurn) ||
    game.phase === PHASES.FINISHED
  ) {
    Object.values(game.players).forEach((player) => {
      publicState.players[player.id].role = player.role;
    });
  }

  return publicState;
}

module.exports = { buildPublicState, buildPlayerState };
