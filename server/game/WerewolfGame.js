const { ROLES, PHASES } = require("./constants");
const NightManager = require("./managers/NightManager");
const DayManager = require("./managers/DayManager");
const ROLE_DEFINITIONS = require("./RoleDefinitions");
const SCRIPT = require("./JudgeScript");
const FLOW_DEFINITION = require("./GameFlow");
const { buildRoleDeck } = require("./utils/roleDeck");
const { buildNightFlow } = require("./utils/nightFlow");
const { checkWinCondition: computeWinCondition } = require("./utils/winLogic");
const { buildPublicState, buildPlayerState } = require("./utils/stateView");
const { handleHunterDecision } = require("./utils/hunterHandler");

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

    // PK State
    this.pkCandidates = [];

    // Hunter specific
    this.hunterDeadId = null;
    this.hunterShootTarget = null;
    this.poisonedId = null;
    this.phaseBeforeHunter = null;

    // Mapping Ephemeral Socket ID -> Persistent Player ID
    this.socketToPid = new Map();
  }

  // --- State Access ---

  getPublicState() {
    return buildPublicState(this);
  }

  getPlayerState(playerId) {
    return buildPlayerState(this, playerId);
  }

  // --- Core Logic ---

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

  /**
   * Convenience: log a judge message and optionally trigger a voice cue.
   */
  announce(messageKeyOrText, params, voiceKey = null) {
    const message = this.resolveLine(messageKeyOrText, params);
    const voiceText = this.resolveLine(voiceKey || message, params);
    if (message) this.print(message);
    if (voiceText) this.read(voiceText);
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
    };
  }

  addPlayer(socketId, name, pid) {
    // If pid already exists (rejoin scenario handled by reconnectPlayer, but just in case)
    if (this.players[pid]) return false;

    if (this.phase !== PHASES.WAITING) return false;

    // Find first available seat number (1-based)
    const usedNumbers = new Set(
      Object.values(this.players).map((p) => p.avatar)
    );
    let seatNumber = 1;
    while (usedNumbers.has(seatNumber)) {
      seatNumber++;
    }

    this.players[pid] = {
      id: pid, // Persistent ID
      socketId: socketId, // Current Socket
      name: name,
      role: null,
      status: "alive",
      previousStatus: "alive",
      avatar: seatNumber,
      isReady: false,
    };

    this.socketToPid.set(socketId, pid);
    return true;
  }

  reconnectPlayer(socketId, pid) {
    const player = this.players[pid];
    if (!player) return false;

    // Update with new socket
    player.socketId = socketId;
    // Restore status from before disconnection
    player.status = player.previousStatus;

    // Update map
    // Remove old socket mapping if exists? Hard to know old socket, but clean up potentially?
    // We just set new one.
    this.socketToPid.set(socketId, pid);
    this.addLog(`Player ${player.name} reconnected.`);
    return true;
  }

  removePlayer(socketId) {
    const pid = this.socketToPid.get(socketId);
    if (pid) {
      delete this.players[pid];
      this.socketToPid.delete(socketId);
    }
  }

  handlePlayerReady(playerId) {
    if (this.phase !== PHASES.WAITING) return;
    if (this.players[playerId]) {
      this.players[playerId].isReady = !this.players[playerId].isReady;
    }
  }

  startGame(config = null) {
    if (this.phase !== PHASES.WAITING) return;

    const allReady = Object.values(this.players).every(
      (p) => p.isReady || p.id === this.hostId
    );
    if (!allReady) return;

    // Ensure host is marked ready for consistency if not already
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

    // Ensure initial state is sent so players can see "Tap to Reveal"
    if (this.onGameUpdate) this.onGameUpdate(this);

    setTimeout(() => {
      this.startNightPhase(1);
    }, 10000); // 10s to check role
  }

  startNightPhase(targetRound) {
    this.announce("NIGHT_START_CLOSE_EYES");

    this.phase = PHASES.NIGHT_START;
    this.nightManager.resetNight();

    // Calculate dynamic night flow
    this.nightFlow = buildNightFlow(this.players);
    console.log("[Game] Night Flow:", this.nightFlow);

    if (this.onGameUpdate) this.onGameUpdate(this);

    setTimeout(() => {
      this.round = targetRound;
      // Start the first phase of the night flow
      if (this.nightFlow.length > 0) {
        this.advancePhase(this.nightFlow[0]);
      } else {
        this.resolveNight();
      }
    }, 4000); // 4s for closing eyes effect
  }

  // --- Phase Transition ---

  hasRole(role) {
    return Object.values(this.players).some((p) => p.role === role);
  }

  nextPhase() {
    // Check dynamic night flow
    if (this.nightFlow && this.nightFlow.includes(this.phase)) {
      const idx = this.nightFlow.indexOf(this.phase);
      if (idx >= 0 && idx < this.nightFlow.length - 1) {
        this.advancePhase(this.nightFlow[idx + 1]);
        return;
      } else if (idx === this.nightFlow.length - 1) {
        this.resolveNight();
        return;
      }
    }

    const currentFlow = FLOW_DEFINITION[this.phase];
    if (!currentFlow) {
      console.warn("[Game] No flow defined for phase:", this.phase);
      return;
    }

    const next = currentFlow.next;

    if (next === "RESOLVE_NIGHT") return this.resolveNight();
    if (next === "START_NIGHT_OR_END") return this.startNightOrEnd();
    if (next === "RESOLVE_SPEECH_FLOW") {
      if (this.nextPhaseAfterSpeech) {
        const target = this.nextPhaseAfterSpeech;
        this.nextPhaseAfterSpeech = null;
        if (target === "START_NIGHT_OR_END") return this.startNightOrEnd();
        return this.advancePhase(target);
      }
      // Default fallback
      return this.startNightOrEnd();
    }
    if (next === "RESUME_FROM_HUNTER") {
      if (this.phaseBeforeHunter) {
        this.advancePhase(this.phaseBeforeHunter);
        this.phaseBeforeHunter = null;
      } else {
        this.startNightOrEnd();
      }
      return;
    }

    this.advancePhase(next);
  }

  advancePhase(newPhase) {
    const flow = FLOW_DEFINITION[newPhase];

    // Skip phases for roles that don't exist in the current game config
    // (Legacy check, but kept for non-night phases or safety)
    if (flow && flow.role && !this.hasRole(flow.role)) {
      const next = flow.next;
      if (next === "RESOLVE_NIGHT") return this.resolveNight();
      // Handle other special strings if they appear in skip path (unlikely for roles)
      return this.advancePhase(next);
    }

    this.phase = newPhase;
    this.logs.push(`--- PHASE: ${newPhase} ---`);

    if (newPhase === PHASES.DAY_MAYOR_WITHDRAW) {
      this.enterMayorWithdraw();
    }

    // Dynamic Voice Generation for Night Phases
    if (this.nightFlow && this.nightFlow.includes(newPhase)) {
      const idx = this.nightFlow.indexOf(newPhase);
      const voiceParts = [];

      // 1. Close eyes for previous role
      if (idx > 0) {
        const prevPhase = this.nightFlow[idx - 1];
        const prevRoleDef = Object.values(ROLE_DEFINITIONS).find(
          (d) => d.nightPhase === prevPhase
        );
        if (prevRoleDef) {
          const closeText = this.resolveLine("CLOSE_EYES", {
            role: prevRoleDef.id,
          });
          if (closeText) voiceParts.push(closeText);
        }
      }

      // 2. Open eyes for current role
      const currRoleDef = Object.values(ROLE_DEFINITIONS).find(
        (d) => d.nightPhase === newPhase
      );
      if (currRoleDef) {
        const openText = this.resolveLine("OPEN_EYES", {
          role: currRoleDef.id,
        });
        if (openText) voiceParts.push(openText);
      }

      if (voiceParts.length > 0) {
        this.read(voiceParts.join(" "));
      } else if (flow && flow.voice) {
        this.read(flow.voice);
      }
    } else {
      // Standard Voice Trigger
      if (flow && flow.voice) {
        this.read(flow.voice);
      } else {
        // Fallback or manual triggers
        this.read(newPhase);
      }
    }

    // Execute Phase Logic
    if (flow && typeof flow.onEnter === "function") {
      flow.onEnter(this);
    }

    // Broadcast State Update AFTER all phase side-effects
    if (this.onGameUpdate) this.onGameUpdate(this);
  }

  triggerVoice(keyOrText, params) {
    const text = this.resolveLine(keyOrText, params);
    const finalText = text || keyOrText;
    if (finalText) {
      console.log(`[Voice] Triggering cue: ${finalText}`);
      this.onVoiceCue(finalText);
    }
  }

  // --- Action Proxies ---

  resolveNight() {
    const { deadIds, poisonedId } = this.nightManager.resolve(this);
    this.pendingDeaths = deadIds;
    this.poisonedId = poisonedId;
    this.startDayAnnounce();
  }

  startDayAnnounce() {
    this.advancePhase(PHASES.DAY_ANNOUNCE);
  }

  applyPendingDeaths() {
    this.pendingDeaths.forEach((id) => {
      if (this.players[id]) {
        this.players[id].status = "dead";
        this.checkDeathTriggers(id, "night");
      }
    });

    // 3. ANNOUNCE DEATHS & CHECK FOR LAST WORDS
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

    // Broadcast the update (deaths handled)
    this.onGameUpdate(this);

    // CHECK WIN immediately after deaths
    const winResult = this.checkWinCondition();
    if (winResult) {
      this.finishGame(winResult);
      this.pendingDeaths = [];
      return;
    }

    // Check if Hunter needs to act now
    if (this.hunterDeadId) {
      // Set phaseBeforeHunter to handle resume logic
      // If it's Round 1, we should go to LEAVE_SPEECH after hunter.
      // If Round > 1, we go to DISCUSSION.
      if (this.round === 1) {
        this.executedPlayerId = this.pendingDeaths[0]; // Ensure we still have a "main" death for reference
        this.phaseBeforeHunter = PHASES.DAY_LEAVE_SPEECH;

        // FIX: Initialize speaking queue so it's ready when we return
        this.dayManager.setSpeakingQueue(this.pendingDeaths);
        this.nextPhaseAfterSpeech = this.getPostSpeechPhase();
      } else {
        this.phaseBeforeHunter = PHASES.DAY_DISCUSSION;
      }

      // Speak the death result FIRST
      if (announcement) {
        this.triggerVoice(announcement);
      }

      // Immediately switch to Hunter Phase, skipping standard transition
      setTimeout(() => {
        this.advancePhase(PHASES.DAY_HUNTER_DECIDE);
      }, 4000); // 4s delay to allow announcement to finish
      return; // STOP! Don't run the else block below
    }

    // TRANSITION (Only run if no Hunter action intervened)
    // Rule: Night Death Last Words ONLY on Round 1
    if (this.round === 1 && hasDeaths) {
      this.executedPlayerId = this.pendingDeaths[0]; // Legacy reference

      // Set up queue for multiple deaths
      this.dayManager.setSpeakingQueue(this.pendingDeaths);

      this.phase = PHASES.DAY_LEAVE_SPEECH;
      this.nextPhaseAfterSpeech = this.getPostSpeechPhase();
      this.logs.push(`--- PHASE: ${PHASES.DAY_LEAVE_SPEECH} ---`);
      this.onGameUpdate(this);

      this.read("DEATH_LAST_WORDS", { announcement });
    } else {
      if (this.shouldRunMayorFlow()) {
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
  }

  checkDeathTriggers(deadId, cause) {
    const player = this.players[deadId];
    if (!player) return;

    const roleDef = ROLE_DEFINITIONS[player.role];
    if (roleDef && typeof roleDef.onDeath === "function") {
      roleDef.onDeath(this, player, cause);
    }
  }

  processDeathInterruption(deadId, nextStepCallback, options = {}) {
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

  handleNightAction(playerId, action) {
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

  findNextPendingHunter() {
    // Return any DEAD Hunter who hasn't shot yet.
    // We'll track shot status on the player object for simplicity.
    return Object.values(this.players).find(
      (p) =>
        p.status === "dead" && p.role === ROLES.HUNTER && !p.hunterShotAction
    )?.id;
  }

  startNightOrEnd() {
    const winResult = this.checkWinCondition();
    if (winResult) {
      this.finishGame(winResult);
    } else {
      this.startNightPhase(this.round + 1);
    }
  }

  shouldRunMayorFlow() {
    return (
      this.metadata.mayorEnabled &&
      !this.metadata.mayorId &&
      !this.metadata.mayorSkipped &&
      this.round === 1
    );
  }

  startMayorNomination() {
    this.metadata.mayorNominees = [];
    this.metadata.mayorPkCandidates = [];
    this.metadata.mayorVotes = {};
    this.metadata.mayorPassers = [];
    this.metadata.mayorWithdrawQueue = [];
    this.metadata.mayorWithdrawResponded = [];
    this.phase = PHASES.DAY_MAYOR_NOMINATE;
    this.logs.push(`--- PHASE: ${PHASES.DAY_MAYOR_NOMINATE} ---`);
    this.announce(PHASES.DAY_MAYOR_NOMINATE);
    if (this.onGameUpdate) this.onGameUpdate(this);
  }

  handleMayorNomination(playerId, targetId) {
    if (this.phase !== PHASES.DAY_MAYOR_NOMINATE) return;
    const player = this.players[playerId];
    if (!player || player.status !== "alive") return;
    // Only self nomination allowed
    if (playerId !== targetId) return;

    const set = new Set(this.metadata.mayorNominees || []);
    if (set.has(playerId)) {
      set.delete(playerId);
      this.print(
        this.resolveLine("MAYOR_PASS", { seat: this.seatLabel(player) })
      );
      this.metadata.mayorPassers = Array.from(
        new Set([...(this.metadata.mayorPassers || []), playerId])
      );
    } else {
      set.add(playerId);
      this.announce("MAYOR_NOMINATE", { seat: this.seatLabel(player) });
      this.metadata.mayorPassers = (this.metadata.mayorPassers || []).filter(
        (id) => id !== playerId
      );
    }
    this.metadata.mayorNominees = Array.from(set);
    this.maybeAdvanceMayorNominate();
    if (this.onGameUpdate) this.onGameUpdate(this);
  }

  handleMayorPass(playerId) {
    if (this.phase !== PHASES.DAY_MAYOR_NOMINATE) return;
    const player = this.players[playerId];
    if (!player || player.status !== "alive") return;
    this.metadata.mayorNominees = (this.metadata.mayorNominees || []).filter(
      (id) => id !== playerId
    );
    this.metadata.mayorPassers = Array.from(
      new Set([...(this.metadata.mayorPassers || []), playerId])
    );
    this.print(
      this.resolveLine("MAYOR_PASS", { seat: this.seatLabel(player) })
    );
    this.maybeAdvanceMayorNominate();
    if (this.onGameUpdate) this.onGameUpdate(this);
  }

  maybeAdvanceMayorNominate() {
    const alive = Object.values(this.players).filter(
      (p) => p.status === "alive"
    ).length;
    const responded = new Set([
      ...(this.metadata.mayorNominees || []),
      ...(this.metadata.mayorPassers || []),
    ]);
    if (responded.size >= alive) {
      this.advanceMayorPhase();
    }
  }

  advanceMayorPhase() {
    if (this.phase === PHASES.DAY_MAYOR_NOMINATE) {
      this.startMayorSpeech();
      return;
    }
    if (this.phase === PHASES.DAY_MAYOR_VOTE) {
      this.finalizeMayorVote();
    }
    if (this.phase === PHASES.DAY_MAYOR_SPEECH) {
      this.phase = PHASES.DAY_MAYOR_WITHDRAW;
      this.logs.push(`--- PHASE: ${PHASES.DAY_MAYOR_WITHDRAW} ---`);
      console.log(
        "[Mayor] Transitioning to Withdraw. Nominees:",
        this.metadata.mayorNominees
      );
      this.enterMayorWithdraw();
      if (this.onGameUpdate) this.onGameUpdate(this);
      return;
    }
    if (this.phase === PHASES.DAY_MAYOR_WITHDRAW) {
      this.startMayorVote();
      return;
    }
    if (this.phase === PHASES.DAY_MAYOR_PK_SPEECH) {
      this.phase = PHASES.DAY_MAYOR_PK_VOTE;
      this.logs.push(`--- PHASE: ${PHASES.DAY_MAYOR_PK_VOTE} ---`);
      this.announce(PHASES.DAY_MAYOR_PK_VOTE);
      if (this.onGameUpdate) this.onGameUpdate(this);
      return;
    }
    if (this.phase === PHASES.DAY_MAYOR_PK_VOTE) {
      this.finalizeMayorVote(true);
      return;
    }
  }

  handleMayorVote(playerId, targetId) {
    const isPkVote = this.phase === PHASES.DAY_MAYOR_PK_VOTE;
    const isMayorVote = this.phase === PHASES.DAY_MAYOR_VOTE;
    if (!isPkVote && !isMayorVote) return;

    const player = this.players[playerId];
    if (!player || player.status !== "alive") return;

    const candidates = isPkVote
      ? this.metadata.mayorPkCandidates || []
      : this.metadata.mayorNominees || [];

    // Candidates cannot vote
    if (candidates.includes(playerId)) return;

    // Only vote for a valid candidate
    if (!candidates.includes(targetId)) return;

    this.metadata.mayorVotes[playerId] = targetId;

    const aliveVoters = Object.values(this.players).filter(
      (p) => p.status === "alive" && !candidates.includes(p.id)
    );

    const needsFinalize =
      Object.keys(this.metadata.mayorVotes).length >= aliveVoters.length;

    if (needsFinalize) {
      this.finalizeMayorVote(isPkVote);
    } else if (this.onGameUpdate) {
      this.onGameUpdate(this);
    }
  }

  enterMayorWithdraw() {
    this.metadata.mayorWithdrawQueue = [
      ...(this.metadata.mayorNominees || []),
    ];
    this.metadata.mayorWithdrawResponded = [];
    console.log(
      "[Mayor] Withdraw Queue set to:",
      this.metadata.mayorWithdrawQueue
    );
    this.announce(PHASES.DAY_MAYOR_WITHDRAW);
  }

  maybeAdvanceMayorWithdraw() {
    const queue = this.metadata.mayorWithdrawQueue || [];
    const respondedList = this.metadata.mayorWithdrawResponded || [];
    const respondedSet = new Set(respondedList);

    console.log(
      `[MayorWithdraw] Checking advance. Queue: ${queue.length}, Responded: ${respondedList.length}`
    );

    // 1. Simple Count Check (Optimization)
    if (respondedList.length >= queue.length) {
      console.log(`[MayorWithdraw] All responded (count). Advancing.`);
      this.startMayorVote();
      return;
    }

    // 2. Liveness Check (Handle disconnects/deaths)
    const pending = queue.filter((pid) => {
      const p = this.players[pid];
      // If player is missing, dead, or disconnected, they don't block
      if (!p || p.status === "dead" || p.status === "disconnected")
        return false;
      // If player is alive and connected, check if they responded
      return !respondedSet.has(pid);
    });

    console.log(`[MayorWithdraw] Pending players: ${pending}`);

    if (pending.length === 0) {
      console.log(`[MayorWithdraw] All active players responded. Advancing.`);
      this.startMayorVote();
    }
  }

  handleMayorWithdraw(playerId, withdraw = true) {
    if (this.phase !== PHASES.DAY_MAYOR_WITHDRAW) return;
    const player = this.players[playerId];
    if (!player || player.status !== "alive") return;
    const before = this.metadata.mayorNominees || [];
    const seat = this.seatLabel(player);

    const responded = new Set(this.metadata.mayorWithdrawResponded || []);
    responded.add(playerId);
    this.metadata.mayorWithdrawResponded = Array.from(responded);

    if (withdraw) {
      this.metadata.mayorNominees = before.filter((id) => id !== playerId);
      this.print(this.resolveLine("MAYOR_PASS", { seat }));
    } else {
      this.print(
        this.resolveLine("MAYOR_STAY", { seat }) || `${seat} 继续参选。`
      );
    }

    this.maybeAdvanceMayorWithdraw();
    if (this.onGameUpdate) this.onGameUpdate(this);
  }

  startMayorSpeech() {
    const nominees = this.metadata.mayorNominees;
    console.log("[Mayor] Starting Speech. Nominees:", nominees);
    if (!nominees || nominees.length === 0) {
      this.metadata.mayorSkipped = true;
      this.phase = PHASES.DAY_DISCUSSION;
      this.logs.push(`--- PHASE: ${PHASES.DAY_DISCUSSION} ---`);
      if (this.onGameUpdate) this.onGameUpdate(this);
      this.dayManager.startDiscussion(this);
      return;
    }
    this.dayManager.setSpeakingQueue(nominees);
    this.phase = PHASES.DAY_MAYOR_SPEECH;
    this.logs.push(`--- PHASE: ${PHASES.DAY_MAYOR_SPEECH} ---`);
    this.announce(PHASES.DAY_MAYOR_SPEECH);

    // Trigger first speaker cue
    if (nominees.length > 0) {
      const firstId = nominees[0];
      const firstP = this.players[firstId];
      if (firstP) {
        this.announce("NEXT_SPEAKER", { seat: this.seatLabel(firstP) });
      }
    }
    if (this.onGameUpdate) this.onGameUpdate(this);
  }

  startMayorVote() {
    const nominees = this.metadata.mayorNominees;
    if (!nominees || nominees.length === 0) {
      this.metadata.mayorSkipped = true;
      this.phase = PHASES.DAY_DISCUSSION;
      this.logs.push(`--- PHASE: ${PHASES.DAY_DISCUSSION} ---`);
      if (this.onGameUpdate) this.onGameUpdate(this);
      this.dayManager.startDiscussion(this);
      return;
    }

    // If only one nominee remains, auto-elect without entering vote.
    if (nominees.length === 1 && this.players[nominees[0]]) {
      this.metadata.mayorVotes = {};
      const mayorId = nominees[0];
      this.metadata.mayorId = mayorId;
      this.players[mayorId].specialFlags = {
        ...(this.players[mayorId].specialFlags || {}),
        isMayor: true,
      };
      const seat = this.seatLabel(this.players[mayorId]);
      this.announce("MAYOR_ELECT", { seat });
      this.metadata.mayorNominees = [];
      this.metadata.mayorPkCandidates = [];
      this.phase = PHASES.DAY_DISCUSSION;
      this.logs.push(`--- PHASE: ${PHASES.DAY_DISCUSSION} ---`);
      if (this.onGameUpdate) this.onGameUpdate(this);
      this.dayManager.startDiscussion(this);
      return;
    }

    this.metadata.mayorVotes = {};
    this.phase = PHASES.DAY_MAYOR_VOTE;
    this.logs.push(`--- PHASE: ${PHASES.DAY_MAYOR_VOTE} ---`);
    this.announce(PHASES.DAY_MAYOR_VOTE);
    if (this.onGameUpdate) this.onGameUpdate(this);
  }

  finalizeMayorVote(isPk = false) {
    const votes = this.metadata.mayorVotes || {};
    const tally = {};
    Object.values(votes).forEach((targetId) => {
      tally[targetId] = (tally[targetId] || 0) + 1;
    });
    const entries = Object.entries(tally);
    let mayorId = null;
    if (entries.length > 0) {
      entries.sort((a, b) => b[1] - a[1]);
      const top = entries[0];
      const tied = entries.filter(([, count]) => count === top[1]);
      if (tied.length === 1) {
        mayorId = top[0];
      }
      if (tied.length > 1 && !isPk) {
        this.metadata.mayorPkCandidates = tied.map(([id]) => id);
        this.dayManager.setSpeakingQueue(this.metadata.mayorPkCandidates);
        this.phase = PHASES.DAY_MAYOR_PK_SPEECH;
        this.logs.push(`--- PHASE: ${PHASES.DAY_MAYOR_PK_SPEECH} ---`);
        this.announce(PHASES.DAY_MAYOR_PK_SPEECH);
        if (this.onGameUpdate) this.onGameUpdate(this);
        return;
      }
    }

    if (mayorId && this.players[mayorId]) {
      this.metadata.mayorId = mayorId;
      this.players[mayorId].specialFlags = {
        ...(this.players[mayorId].specialFlags || {}),
        isMayor: true,
      };
      const seat = this.seatLabel(this.players[mayorId]);
      this.announce("MAYOR_ELECT", { seat });
    } else {
      this.metadata.mayorSkipped = true;
      this.announce("MAYOR_NONE");
    }

    this.metadata.mayorVotes = {};
    this.metadata.mayorNominees = [];
    this.metadata.mayorPkCandidates = [];

    // Move to discussion
    this.phase = PHASES.DAY_DISCUSSION;
    this.logs.push(`--- PHASE: ${PHASES.DAY_DISCUSSION} ---`);
    if (this.onGameUpdate) this.onGameUpdate(this);
    this.dayManager.startDiscussion(this);
  }

  getPostSpeechPhase() {
    return this.shouldRunMayorFlow()
      ? PHASES.DAY_MAYOR_NOMINATE
      : PHASES.DAY_DISCUSSION;
  }

  checkWinCondition() {
    return computeWinCondition(
      this.players,
      this.initialConfig,
      this.addLog.bind(this)
    );
  }

  finishGame(winner) {
    this.phase = PHASES.FINISHED;
    this.winner = winner;
    const side = winner === "VILLAGERS" ? "VILLAGERS" : "WEREWOLVES";
    this.announce("GAME_OVER", { side });

    if (this.onGameUpdate) this.onGameUpdate(this);
  }

  handleWolfPropose(playerId, targetId) {
    // Delegate to NightManager
    const changed = this.nightManager.handlePropose(this, playerId, targetId);
    if (changed) {
      this.onGameUpdate(this);
    }
  }

  reset() {
    this.phase = PHASES.WAITING;
    // ... (reset state)
    this.round = 0;
    this.logs = [];
    this.pendingNextPhase = null;
    this.executedPlayerId = null;
    this.pendingDeaths = [];
    this.metadata = this.createDefaultMetadata();

    // Reset Managers
    this.nightManager = new NightManager();
    this.dayManager = new DayManager();
    this.winner = null;
    this.banishCount = 0;

    // Reset PK State
    this.pkCandidates = [];

    // Reset Hunter specific
    this.hunterDeadId = null;
    this.hunterShootTarget = null;
    this.poisonedId = null;
    this.phaseBeforeHunter = null;

    // Reset Players (Keep connections/names, clear roles/status)
    Object.values(this.players).forEach((p) => {
      p.role = null;
      p.status = "alive";
      p.isReady = false; // Require ready again
      p.specialFlags = {};
    });

    this.print(this.resolveLine("GAME_RESET"));
  }

  // Handlers delegated to managers
  handleDayVote(playerId, targetId) {
    this.dayManager.handleVote(this, playerId, targetId);
  }

  handleEndSpeech(playerId) {
    this.dayManager.handleEndSpeech(this, playerId);
  }

  checkActiveRole(role) {
    const player = Object.values(this.players).find((p) => p.role === role);
    const isActive = player && player.status === "alive";

    // If inactive (dead or doesn't exist), wait random time then advance
    if (!isActive) {
      const delay = Math.floor(Math.random() * 5000) + 5000; // 5-10 seconds random delay
      console.log(`[Game] Role ${role} inactive. Fake waiting for ${delay}ms.`);
      setTimeout(() => {
        this.nextPhase();
      }, delay);
    }
  }
}

module.exports = WerewolfGame;
