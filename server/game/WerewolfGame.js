const { PHASES } = require("./constants");
const NightManager = require("./managers/NightManager");
const DayManager = require("./managers/DayManager");
const SCRIPT = require("./JudgeScript");
const { buildPublicState, buildPlayerState } = require("./utils/stateView");
const lifecycle = require("./core/lifecycle");
const nightCycle = require("./core/nightCycle");
const phaseFlow = require("./core/phaseFlow");
const playerManagement = require("./core/playerManagement");
const mayorFlow = require("./core/mayorFlow");

// Lightweight shell that composes domain handlers from ./core for readability.
class WerewolfGame {
  constructor(id, hostId, onVoiceCue, onGameUpdate, config = null) {
    this.id = id;
    this.hostId = hostId;
    this.onVoiceCue = onVoiceCue || (() => {});
    this.onGameUpdate = onGameUpdate || (() => {});
    this.initialConfig = config;

    this.players = {};
    this.phase = PHASES.WAITING;
    this.round = 0;
    this.logs = [];
    this.pendingNextPhase = null;
    this.executedPlayerId = null;
    this.pendingDeaths = [];
    this.metadata = this.createDefaultMetadata();
    this.locale = config?.locale || SCRIPT.DEFAULT_LOCALE;

    this.nightManager = new NightManager();
    this.dayManager = new DayManager();
    this.winner = null;
    this.banishCount = 0;
    this.nightFlow = [];

    this.pkCandidates = [];

    this.hunterDeadId = null;
    this.hunterShootTarget = null;
    this.poisonedId = null;
    this.phaseBeforeHunter = null;

    this.socketToPid = new Map();
  }

  getPublicState() {
    return buildPublicState(this);
  }

  getPlayerState(playerId) {
    return buildPlayerState(this, playerId);
  }

  resolveLine(keyOrText, params = {}) {
    return SCRIPT.renderLine(keyOrText, params, this.locale);
  }

  addLog(message) {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    this.logs.push(`[${time}] ${message}`);
  }

  print(message) {
    this.addLog(`JUDGE: ${message}`);
  }

  read(keyOrText, params) {
    const text = this.resolveLine(keyOrText, params);
    if (text) {
      this.triggerVoice(text);
    }
  }

  seatLabel(playerIdOrObj) {
    const player =
      typeof playerIdOrObj === "object"
        ? playerIdOrObj
        : this.players[playerIdOrObj];
    return `${String(player?.avatar || "?").padStart(2, "0")}号`;
  }

  announce(messageKeyOrText, params, voiceKey = null) {
    const message = this.resolveLine(messageKeyOrText, params);
    const voiceText = this.resolveLine(voiceKey || message, params);
    if (message) this.print(message);
    if (voiceText) this.read(voiceText);
  }

  triggerVoice(keyOrText, params) {
    const text = this.resolveLine(keyOrText, params);
    const finalText = text || keyOrText;
    if (finalText) {
      console.log(`[Voice] Triggering cue: ${finalText}`);
      this.onVoiceCue(finalText);
    }
  }

  createDefaultMetadata() {
    return {
      mayorEnabled: false,
      mayorId: null,
      mayorNominees: [],
      mayorPkCandidates: [],
      mayorVotes: {},
      mayorSkipped: false,
      mayorPassers: [],
      mayorWithdrawQueue: [],
      mayorWithdrawResponded: [],
      mayorWithdrawStarted: false,
    };
  }
}

// Merge modularized handlers into the main game prototype.
Object.assign(
  WerewolfGame.prototype,
  lifecycle,
  nightCycle,
  phaseFlow,
  playerManagement,
  mayorFlow
);

module.exports = WerewolfGame;
