// Night progression, night actions, and death resolution helpers.
const { ROLES, PHASES } = require("../constants");
const ROLE_DEFINITIONS = require("../RoleDefinitions");
const { buildNightFlow } = require("../utils/nightFlow");
const { handleHunterDecision } = require("../utils/hunterHandler");

function startNightPhase(targetRound) {
  this.announce("NIGHT_START_CLOSE_EYES");

  this.phase = PHASES.NIGHT_START;
  this.nightManager.resetNight();
  this.nightFlow = buildNightFlow(this.players);
  console.log("[Game] Night Flow:", this.nightFlow);

  if (this.onGameUpdate) this.onGameUpdate(this);

  setTimeout(() => {
    this.round = targetRound;
    if (this.nightFlow.length > 0) {
      this.advancePhase(this.nightFlow[0]);
    } else {
      this.resolveNight();
    }
  }, 4000);
}

function resolveNight() {
  const { deadIds, poisonedId } = this.nightManager.resolve(this);
  this.pendingDeaths = deadIds;
  this.poisonedId = poisonedId;
  this.startDayAnnounce();
}

function startDayAnnounce() {
  this.advancePhase(PHASES.DAY_ANNOUNCE);
}

function applyPendingDeaths() {
  this.pendingDeaths.forEach((id) => {
    if (this.players[id]) {
      this.players[id].status = "dead";
      this.checkDeathTriggers(id, "night");
    }
  });

  let announcement = "";
  let hasDeaths = this.pendingDeaths.length > 0;

  if (hasDeaths) {
    const seats = this.pendingDeaths
      .map((pid) => this.seatLabel(this.players[pid]))
      .join(", ");
    announcement = this.resolveLine("DEATH_ANNOUNCE", { seats });
    this.print(announcement);
  } else {
    announcement = this.resolveLine("DEATH_PEACEFUL");
    this.print(announcement);
  }

  this.onGameUpdate(this);

  const winResult = this.checkWinCondition();
  if (winResult) {
    this.finishGame(winResult);
    this.pendingDeaths = [];
    return;
  }

  if (this.hunterDeadId) {
    if (this.round === 1) {
      this.executedPlayerId = this.pendingDeaths[0];
      this.phaseBeforeHunter = PHASES.DAY_LEAVE_SPEECH;
      this.dayManager.setSpeakingQueue(this.pendingDeaths);
      this.nextPhaseAfterSpeech = this.getPostSpeechPhase();
    } else {
      this.phaseBeforeHunter = PHASES.DAY_DISCUSSION;
    }

    if (announcement) {
      this.triggerVoice(announcement);
    }

    setTimeout(() => {
      this.advancePhase(PHASES.DAY_HUNTER_DECIDE);
    }, 4000);
    return;
  }

  if (this.round === 1 && hasDeaths) {
    this.executedPlayerId = this.pendingDeaths[0];
    this.dayManager.setSpeakingQueue(this.pendingDeaths);

    this.phase = PHASES.DAY_LEAVE_SPEECH;
    this.nextPhaseAfterSpeech = this.getPostSpeechPhase();
    this.logs.push(`--- PHASE: ${PHASES.DAY_LEAVE_SPEECH} ---`);
    this.onGameUpdate(this);

    this.read("DEATH_LAST_WORDS", { announcement });
  } else if (this.shouldRunMayorFlow()) {
    if (announcement) this.triggerVoice(announcement);
    this.startMayorNomination();
  } else {
    this.phase = PHASES.DAY_DISCUSSION;
    this.logs.push(`--- PHASE: ${PHASES.DAY_DISCUSSION} ---`);
    this.onGameUpdate(this);

    this.read("NIGHT_DISCUSSION", { announcement });
    this.dayManager.startDiscussion(this);
  }
}

function checkDeathTriggers(deadId, cause) {
  const player = this.players[deadId];
  if (!player) return;

  const roleDef = ROLE_DEFINITIONS[player.role];
  if (roleDef && typeof roleDef.onDeath === "function") {
    roleDef.onDeath(this, player, cause);
  }
}

function processDeathInterruption(deadId, nextStepCallback, options = {}) {
  const player = this.players[deadId];
  if (!player) return false;

  const roleDef = ROLE_DEFINITIONS[player.role];
  if (roleDef && typeof roleDef.interruptDeathProcessing === "function") {
    return roleDef.interruptDeathProcessing(
      this,
      player,
      nextStepCallback,
      options
    );
  }
  return false;
}

function handleNightAction(playerId, action) {
  const player = this.players[playerId];
  console.log(
    `[Action] Player ${player?.name}(${playerId}) performing ${action.type}. Phase: ${this.phase}, DeadHunter: ${this.hunterDeadId}, Status: ${player?.status}`
  );

  if (handleHunterDecision(this, playerId, action)) return;

  if (!player || player.status !== "alive") {
    console.log(`[Action] Dropped - Player dead or invalid.`);
    return;
  }
  const success = this.nightManager.handleAction(this, playerId, action);
  if (success && this.onGameUpdate) this.onGameUpdate(this);
  return success;
}

function findNextPendingHunter() {
  return Object.values(this.players).find(
    (p) =>
      p.status === "dead" && p.role === ROLES.HUNTER && !p.hunterShotAction
  )?.id;
}

function startNightOrEnd() {
  const winResult = this.checkWinCondition();
  if (winResult) {
    this.finishGame(winResult);
  } else {
    this.startNightPhase(this.round + 1);
  }
}

function handleWolfPropose(playerId, targetId) {
  const changed = this.nightManager.handlePropose(this, playerId, targetId);
  if (changed) {
    this.onGameUpdate(this);
  }
}

module.exports = {
  applyPendingDeaths,
  checkDeathTriggers,
  findNextPendingHunter,
  handleNightAction,
  handleWolfPropose,
  processDeathInterruption,
  resolveNight,
  startDayAnnounce,
  startNightOrEnd,
  startNightPhase,
};
