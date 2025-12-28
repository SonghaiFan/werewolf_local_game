// Game lifecycle: starting, win checks, and reset plumbing.
const { PHASES } = require("../constants");
const NightManager = require("../managers/NightManager");
const DayManager = require("../managers/DayManager");
const SCRIPT = require("../JudgeScript");
const { buildRoleDeck } = require("../utils/roleDeck");
const { checkWinCondition: computeWinCondition } = require("../utils/winLogic");

function startGame(config = null) {
  if (this.phase !== PHASES.WAITING) return;

  const allReady = Object.values(this.players).every(
    (p) => p.isReady || p.id === this.hostId
  );
  if (!allReady) return;

  if (this.players[this.hostId] && !this.players[this.hostId].isReady) {
    this.players[this.hostId].isReady = true;
  }

  const playerIds = Object.keys(this.players);
  const count = playerIds.length;

  const effectiveConfig = config || this.initialConfig;
  this.locale =
    effectiveConfig?.locale || this.locale || SCRIPT.DEFAULT_LOCALE;
  this.metadata.mayorEnabled = !!effectiveConfig?.enableMayor;
  const roles = buildRoleDeck(count, effectiveConfig, this.addLog.bind(this));

  playerIds.forEach((pid, idx) => {
    this.players[pid].role = roles[idx];
    this.players[pid].status = "alive";
  });

  this.addLog("JUDGE: Game Starting... Roles assigned.");
  this.announce("GAME_START_CONFIRM");

  this.phase = PHASES.GAME_START;
  if (this.onGameUpdate) this.onGameUpdate(this);

  setTimeout(() => {
    this.startNightPhase(1);
  }, 10000);
}

function checkWinCondition() {
  return computeWinCondition(
    this.players,
    this.initialConfig,
    this.addLog.bind(this)
  );
}

function finishGame(winner) {
  this.phase = PHASES.FINISHED;
  this.winner = winner;
  const side = winner === "VILLAGERS" ? "VILLAGERS" : "WEREWOLVES";
  this.announce("GAME_OVER", { side });

  if (this.onGameUpdate) this.onGameUpdate(this);
}

function reset() {
  this.phase = PHASES.WAITING;
  this.round = 0;
  this.logs = [];
  this.pendingNextPhase = null;
  this.executedPlayerId = null;
  this.pendingDeaths = [];
  this.metadata = this.createDefaultMetadata();

  this.nightManager = new NightManager();
  this.dayManager = new DayManager();
  this.winner = null;
  this.banishCount = 0;

  this.pkCandidates = [];
  this.hunterDeadId = null;
  this.hunterShootTarget = null;
  this.poisonedId = null;
  this.phaseBeforeHunter = null;

  Object.values(this.players).forEach((p) => {
    p.role = null;
    p.status = "alive";
    p.isReady = false;
    p.specialFlags = {};
  });

  this.print(this.resolveLine("GAME_RESET"));
}

module.exports = {
  checkWinCondition,
  finishGame,
  reset,
  startGame,
};
