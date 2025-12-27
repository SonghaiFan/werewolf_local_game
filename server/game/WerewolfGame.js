const { ROLES, PHASES } = require("./constants");
const NightManager = require("./managers/NightManager");
const DayManager = require("./managers/DayManager");
const ROLE_DEFINITIONS = require("./RoleDefinitions");
const VOICE_MESSAGES = require("./voiceMessages");
const FLOW_DEFINITION = require("./GameFlow");

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
    // Build Public Player State
    const publicPlayers = {};
    Object.keys(this.players).forEach((pid) => {
      const p = this.players[pid];
      publicPlayers[pid] = {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        status: p.status,
        isReady: p.isReady,
        // Add Voting Status
        isVoting:
          (this.phase === PHASES.DAY_VOTE ||
            this.phase === PHASES.DAY_PK_VOTE ||
            this.phase === PHASES.DAY_ELIMINATION) &&
          this.dayManager.votes[pid] !== undefined,
        hasAbstained:
          (this.phase === PHASES.DAY_VOTE ||
            this.phase === PHASES.DAY_PK_VOTE ||
            this.phase === PHASES.DAY_ELIMINATION) &&
          this.dayManager.votes[pid] === "abstain",
        // Show role only if game over
        role: this.phase === PHASES.FINISHED ? p.role : undefined,
      };
    });

    // Add Speaking Data
    let speakingData = null;
    if (
      (this.phase === PHASES.DAY_DISCUSSION ||
        this.phase === PHASES.DAY_PK_SPEECH ||
        this.phase === PHASES.DAY_LEAVE_SPEECH) &&
      this.dayManager.speakingOrder
    ) {
      speakingData = {
        currentSpeakerId:
          this.dayManager.speakingOrder[this.dayManager.currentSpeakerIndex] ||
          null,
        order: this.dayManager.speakingOrder,
      };
    }

    return {
      id: this.id,
      phase: this.phase,
      round: this.round,
      players: publicPlayers,
      logs: this.logs,
      speaking: speakingData,
      executedId: this.executedPlayerId, // Expose executed player ID
      hunterDeadId: this.hunterDeadId, // Expose active hunter ID
      pkCandidates: this.pkCandidates, // Expose PK candidates
      hostId: this.hostId,
      winner: this.winner,
      config: this.initialConfig,
    };
  }

  getPlayerState(playerId) {
    const publicState = this.getPublicState();
    const me = this.players[playerId];

    if (me) {
      let info = { ...me };

      // Explicitly set my role in the players list so PlayerGrid sees it
      if (publicState.players[playerId]) {
        publicState.players[playerId].role = me.role;
      }

      // Capabilities-based Actions
      const definition = ROLE_DEFINITIONS[me.role];
      if (definition) {
        info.capabilities = {
          canActAtNight: definition.canActAtNight,
          nightPhase: definition.nightPhase,
          side: definition.side,
        };
        info.availableActions = definition.getAvailableActions(this, me);
      }

      // Add Voting Data
      if (this.phase === PHASES.DAY_VOTE || this.phase === PHASES.DAY_PK_VOTE) {
        info.votes = this.dayManager.votes;
        if (this.dayManager.votes[playerId]) {
          info.hasActed = true;
        }
      }
      if (this.phase === PHASES.DAY_ELECTION_VOTE) {
        // Info about election votes if needed?
        // Original code exposed election state generally.
      }

      // Speaking Data (Private Context if needed? No, public)

      // Context specific info
      // let hasActed = false; // Removed, now set directly on info

      if (me.role === ROLES.GUARD) {
        info.guardState = this.nightManager.guardState;
        info.guardTarget = this.nightManager.actions.guardTarget;
        if (
          this.phase === PHASES.NIGHT_GUARD &&
          this.nightManager.actions.guardTarget !== undefined
        ) {
          info.hasActed = true;
        }
      }

      if (me.role === ROLES.HUNTER) {
        if (this.poisonedId === playerId) {
          info.isPoisoned = true;
        }
        if (
          this.phase === PHASES.DAY_HUNTER_DECIDE &&
          this.hunterDeadId === playerId
        ) {
          // Not necessarily hasActed, since they might still be choosing
        }
      }

      if (me.role === ROLES.WOLF) {
        info.nightTarget = this.nightManager.actions.wolfTarget;
        info.wolfVotes = this.nightManager.actions.wolfVotes;
        if (
          this.phase === PHASES.NIGHT_WOLVES &&
          this.nightManager.actions.wolfTarget
        ) {
          info.hasActed = true;
        }
      }
      if (me.role === ROLES.WITCH) {
        // Add long-term potion status
        info.witchState = this.nightManager.witchState;

        if (this.phase === PHASES.NIGHT_WITCH) {
          // Only reveal victim if Witch has Antidote (save not used)
          if (!this.nightManager.witchState.saveUsed) {
            info.wolfTarget = this.nightManager.actions.wolfTarget;
          }
          if (this.nightManager.actions.witchAction) {
            info.hasActed = true;
          }
        }
      }
      if (me.role === ROLES.SEER && this.phase === PHASES.NIGHT_SEER) {
        if (
          this.nightManager.actions.seerResult ||
          this.nightManager.actions.seerTarget
        ) {
          info.hasActed = true;
        }
      }

      // The Day Vote hasActed logic was moved up to be with the other voting data.
      // if (this.phase === PHASES.DAY_VOTE) {
      //     if (this.dayManager.votes && this.dayManager.votes[playerId]) {
      //         hasActed = true;
      //     }
      //     info.votes = this.dayManager.votes;
      // } else if (this.phase === PHASES.DAY_ELECTION_VOTE) {
      //      // Info about election votes if needed?
      //      // Original code exposed election state generally.
      // }

      // info.hasActed = hasActed; // Removed, now set directly on info

      publicState.me = info;
    }

    // Reveal Wolf Allies
    if (me && me.role === ROLES.WOLF) {
      Object.values(this.players).forEach((p) => {
        if (p.role === ROLES.WOLF) {
          publicState.players[p.id].role = ROLES.WOLF;
        }
      });
      // Expose NightManager Wolf Votes ONLY during Night Wolf Phase
      if (this.phase === PHASES.NIGHT_WOLVES) {
        publicState.wolfVotes = this.nightManager.actions.wolfVotes;
      }
    }

    const isDead = me && me.status === "dead";
    const isMyLastWords =
      this.phase === PHASES.DAY_LEAVE_SPEECH &&
      this.executedPlayerId === playerId;
    const isMyHunterTurn =
      this.phase === PHASES.DAY_HUNTER_DECIDE && this.hunterDeadId === playerId;

    if (
      (isDead && !isMyLastWords && !isMyHunterTurn) ||
      this.phase === PHASES.FINISHED
    ) {
      Object.values(this.players).forEach((p) => {
        publicState.players[p.id].role = p.role;
      });
    }

    return publicState;
  }

  // --- Core Logic ---

  addLog(message) {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    this.logs.push(`[${time}] ${message}`);
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

    // Role Distribution
    const roles = [];

    // Effective Config: Passed Config (Lobby) > Initial Config (Landing) > Auto
    const effectiveConfig = config || this.initialConfig;

    if (effectiveConfig && typeof effectiveConfig === "object") {
      // 3a. Custom Config from Host
      const {
        wolves = 0,
        seer = false,
        witch = false,
        guard = false,
        hunter = false,
      } = effectiveConfig;

      // Add Wolves
      for (let i = 0; i < wolves; i++) roles.push(ROLES.WOLF);

      // Add Specials
      if (seer) roles.push(ROLES.SEER);
      if (witch) roles.push(ROLES.WITCH);
      if (guard) roles.push(ROLES.GUARD);
      if (hunter) roles.push(ROLES.HUNTER);

      // Validation: If config exceeds count, we might have issues, but UI prevents this.
      // If config is less, we fill with villagers below.

      this.addLog(
        `JUDGE: Custom Rules - Wolves: ${wolves}, Seer: ${
          seer ? "Yes" : "No"
        }, Witch: ${witch ? "Yes" : "No"}, Guard: ${
          guard ? "Yes" : "No"
        }, Hunter: ${hunter ? "Yes" : "No"}.`
      );
    } else {
      // 3b. Standard Auto-Config (Fallback)
      if (count >= 6 && count < 9) {
        // 6-8: 2 Wolves, 1 Seer, 1 Witch, rest Villagers
        roles.push(ROLES.WOLF, ROLES.WOLF);
        roles.push(ROLES.SEER, ROLES.WITCH);
      } else if (count >= 9 && count < 12) {
        // 9-11: 3 Wolves, 1 Seer, 1 Witch, 1 Hunter, rest Villagers
        roles.push(ROLES.WOLF, ROLES.WOLF, ROLES.WOLF);
        roles.push(ROLES.SEER, ROLES.WITCH, ROLES.HUNTER);
      } else if (count >= 12) {
        // 12+: 4 Wolves, 1 Seer, 1 Witch, 1 Hunter, 1 Guard, rest Villagers
        roles.push(ROLES.WOLF, ROLES.WOLF, ROLES.WOLF, ROLES.WOLF);
        roles.push(ROLES.SEER, ROLES.WITCH, ROLES.HUNTER, ROLES.GUARD);
      } else {
        // Fallback for small usage / debugging (<6)
        // e.g. 3 players -> 1 Wolf, 1 Seer, 1 Villager
        const numWolves = Math.max(1, Math.floor(count / 3));
        for (let i = 0; i < numWolves; i++) roles.push(ROLES.WOLF);
        roles.push(ROLES.SEER);
        if (roles.length < count) roles.push(ROLES.WITCH);
      }
    }

    // Fill rest with Villagers
    while (roles.length < count) roles.push(ROLES.VILLAGER);

    // Truncate/Balance if overflow (e.g. 6P preset used for 3 players)
    if (roles.length > count) {
      this.addLog(
        "JUDGE: Player count lower than rules require. Adjusting roles for balance."
      );
      // 1. If wolves exceed 1/2 of players, reduce them
      const maxWolves = Math.max(1, Math.floor(count / 3));
      while (
        roles.filter((r) => r === ROLES.WOLF).length > maxWolves &&
        roles.length > count
      ) {
        const idx = roles.indexOf(ROLES.WOLF);
        roles.splice(idx, 1);
      }
      // 2. Still too many? Remove specials
      while (roles.length > count && roles.indexOf(ROLES.WITCH) !== -1)
        roles.splice(roles.indexOf(ROLES.WITCH), 1);
      while (roles.length > count && roles.indexOf(ROLES.SEER) !== -1)
        roles.splice(roles.indexOf(ROLES.SEER), 1);
      // 3. Last resort, pop from end
      while (roles.length > count) roles.pop();
    }

    // Shuffle
    roles.sort(() => Math.random() - 0.5);

    playerIds.forEach((pid, idx) => {
      this.players[pid].role = roles[idx];
      this.players[pid].status = "alive";
    });

    this.addLog("JUDGE: Game Starting... Roles assigned.");

    const confirmText = VOICE_MESSAGES.GAME_START_CONFIRM;
    this.addLog(`JUDGE: ${confirmText}`);
    this.triggerVoice("GAME_START_CONFIRM");

    this.phase = PHASES.GAME_START;

    // Ensure initial state is sent so players can see "Tap to Reveal"
    if (this.onGameUpdate) this.onGameUpdate(this);

    setTimeout(() => {
      this.startNightPhase(1);
    }, 10000); // 10s to check role
  }

  calculateNightFlow() {
    const activeRoles = new Set(Object.values(this.players).map((p) => p.role));

    // Get definitions for all active roles
    const roleDefs = [];
    activeRoles.forEach((role) => {
      if (ROLE_DEFINITIONS[role]) {
        roleDefs.push(ROLE_DEFINITIONS[role]);
      }
    });

    // Filter for night actors and sort by priority
    const nightActors = roleDefs
      .filter((def) => def.canActAtNight && def.nightPhase)
      .sort((a, b) => (a.nightPriority || 999) - (b.nightPriority || 999));

    // Extract phases
    const phases = new Set();
    nightActors.forEach((def) => phases.add(def.nightPhase));

    return Array.from(phases);
  }

  startNightPhase(targetRound) {
    const closeText = VOICE_MESSAGES.NIGHT_START_CLOSE_EYES;
    this.triggerVoice("NIGHT_START_CLOSE_EYES");
    this.addLog(`JUDGE: ${closeText}`);

    this.phase = PHASES.NIGHT_START;
    this.nightManager.resetNight();

    // Calculate dynamic night flow
    this.nightFlow = this.calculateNightFlow();
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

    // Dynamic Voice Generation for Night Phases
    if (this.nightFlow && this.nightFlow.includes(newPhase)) {
      const idx = this.nightFlow.indexOf(newPhase);
      let voiceText = "";

      // 1. Close eyes for previous role
      if (idx > 0) {
        const prevPhase = this.nightFlow[idx - 1];
        const prevRoleDef = Object.values(ROLE_DEFINITIONS).find(
          (d) => d.nightPhase === prevPhase
        );
        if (prevRoleDef) {
          const name = VOICE_MESSAGES.ROLE_NAMES[prevRoleDef.id];
          if (name) voiceText += VOICE_MESSAGES.CLOSE_EYES(name);
        }
      }

      // 2. Open eyes for current role
      const currRoleDef = Object.values(ROLE_DEFINITIONS).find(
        (d) => d.nightPhase === newPhase
      );
      if (currRoleDef) {
        const name = VOICE_MESSAGES.ROLE_NAMES[currRoleDef.id];
        if (name) voiceText += VOICE_MESSAGES.OPEN_EYES(name);
      }

      if (voiceText) {
        this.triggerVoice(voiceText);
      } else {
        // Fallback
        if (flow && flow.voice) {
          this.triggerVoice(flow.voice);
        }
      }
    } else {
      // Standard Voice Trigger
      if (flow && flow.voice) {
        this.triggerVoice(flow.voice);
      } else {
        // Fallback or manual triggers
        this.triggerVoice(newPhase);
      }
    }

    // Execute Phase Logic
    if (flow && typeof flow.onEnter === "function") {
      flow.onEnter(this);
    }

    // Broadcast State Update AFTER all phase side-effects
    if (this.onGameUpdate) this.onGameUpdate(this);
  }

  triggerVoice(phaseOrText, ...args) {
    // If phaseOrText is a valid phase key in VOICE_MESSAGES, use that.
    // Otherwise, treat phaseOrText as the literal text to speak.
    let text = VOICE_MESSAGES[phaseOrText];

    if (typeof text === "function") {
      text = text(...args);
    } else if (!text) {
      // If it's not a phase key, it's either null or the actual text
      text = phaseOrText;
    }

    if (text) {
      console.log(`[Voice] Triggering cue: ${text}`);
      this.onVoiceCue(text);
    }
  }

  // --- Action Proxies ---

  resolveNight() {
    const { deadIds, poisonedId } = this.nightManager.resolve(this);
    this.pendingDeaths = deadIds;
    this.poisonedId = poisonedId;

    // Always announce deaths first (User Rule: Day breaks -> Deaths -> Election)
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
      const indices = this.pendingDeaths
        .map((pid) => `${this.players[pid]?.avatar || "?"}号玩家`)
        .join(", ");
      announcement = VOICE_MESSAGES.DEATH_ANNOUNCE(indices);
      this.addLog(
        `JUDGE: Sun rises. Last night, ${this.pendingDeaths.length} player(s) died.`
      );
    } else {
      announcement = VOICE_MESSAGES.DEATH_PEACEFUL();
      this.addLog("JUDGE: Sun rises. It was a peaceful night.");
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
        this.nextPhaseAfterSpeech = PHASES.DAY_DISCUSSION;
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
      this.nextPhaseAfterSpeech = PHASES.DAY_DISCUSSION; // Resume to discussion
      this.logs.push(`--- PHASE: ${PHASES.DAY_LEAVE_SPEECH} ---`);
      this.onGameUpdate(this);

      this.triggerVoice(VOICE_MESSAGES.DEATH_LAST_WORDS(announcement));
    } else {
      this.phase = PHASES.DAY_DISCUSSION;
      this.logs.push(`--- PHASE: ${PHASES.DAY_DISCUSSION} ---`);
      this.onGameUpdate(this);

      this.triggerVoice(VOICE_MESSAGES.NIGHT_DISCUSSION(announcement));

      this.dayManager.startDiscussion(this);
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

    // Hunter Decision Phase
    if (
      this.phase === PHASES.DAY_HUNTER_DECIDE &&
      playerId === this.hunterDeadId
    ) {
      console.log(`[Hunter] Entity accepted action. Processing shot...`);
      const me = this.players[playerId];
      if (me) me.hunterShotAction = true;

      if (action.type === "shoot") {
        const target = this.players[action.targetId];
        console.log(
          `[Hunter] Target: ${target?.name} (${action.targetId}), Status: ${target?.status}`
        );
        if (target && target.status === "alive") {
          target.status = "dead";
          this.hunterShootTarget = action.targetId;
          this.addLog(
            `JUDGE: The Hunter shot and killed ${String(
              target.avatar || "?"
            ).padStart(2, "0")}号玩家.`
          );
          this.triggerVoice("HUNTER_SHOT", String(target.avatar || "?"));

          // Check if the person shot was also a hunter? (Chain reaction)
          this.checkDeathTriggers(action.targetId, "shoot");
        } else {
          console.log(`[Hunter] Target invalid or already dead.`);
        }
      } else {
        this.addLog("JUDGE: The Hunter chose not to shoot.");
      }

      // Advance after a short delay
      setTimeout(() => {
        this.hunterDeadId = null; // Mark current as acted

        // Broadcast update so client clears the Hunter UI immediately
        if (this.onGameUpdate) this.onGameUpdate(this);

        // Check Win Condition again after Hunter shot!!
        const winResult = this.checkWinCondition();
        if (winResult) {
          this.finishGame(winResult);
          return;
        }

        const nextHunterId = this.findNextPendingHunter();
        if (nextHunterId) {
          this.hunterDeadId = nextHunterId;
          this.advancePhase(PHASES.DAY_HUNTER_DECIDE);
        } else {
          if (this.hunterCallback) {
            const cb = this.hunterCallback;
            this.hunterCallback = null;
            cb();
          } else if (this.phaseBeforeHunter === PHASES.DAY_LEAVE_SPEECH) {
            // Resume to Last Words
            this.phase = PHASES.DAY_LEAVE_SPEECH;
            this.logs.push(`--- PHASE: ${PHASES.DAY_LEAVE_SPEECH} ---`);

            // Trigger voice for the current speaker if available
            const currentSpeakerId =
              this.dayManager.speakingOrder[
                this.dayManager.currentSpeakerIndex
              ];
            if (currentSpeakerId && this.players[currentSpeakerId]) {
              const avatar = this.players[currentSpeakerId].avatar;
              this.triggerVoice("NEXT_SPEAKER", String(avatar));
            } else {
              this.triggerVoice(PHASES.DAY_LEAVE_SPEECH, "请发表遗言。");
            }
            this.onGameUpdate(this);
          } else if (this.phaseBeforeHunter === PHASES.DAY_ANNOUNCE) {
            // Legacy fallback
            this.advancePhase(PHASES.DAY_DISCUSSION);
          } else {
            // Default to Discussion if no other path
            this.advancePhase(PHASES.DAY_DISCUSSION);
          }
        }
      }, 3000); // 3s delay to let voice finish

      // Immediate update to reflect the shot happening (logs etc)
      if (this.onGameUpdate) this.onGameUpdate(this);
      return;
    }

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

  checkWinCondition() {
    // 1. Snapshot counts
    const alive = Object.values(this.players).filter(
      (p) => p.status === "alive"
    );

    const wolfCount = alive.filter((p) => p.role === ROLES.WOLF).length;
    const goodCount = alive.filter((p) => p.role !== ROLES.WOLF).length;

    const villagerCount = alive.filter((p) => p.role === ROLES.VILLAGER).length;
    // Gods = Good - Villagers (Seer, Witch, Hunter etc)
    const godCount = goodCount - villagerCount;

    const winCondition = this.initialConfig?.winCondition || "wipeout";

    // this.addLog(`DEBUG: Win Check [${winCondition}] - W:${wolfCount} G:${goodCount} (V:${villagerCount}/God:${godCount})`);

    // 2. Villager Win: No Wolves left
    if (wolfCount === 0) return "VILLAGERS";

    // 3. Wolf Win: Majority (Vote Dominance)
    // Rule: If Wolves >= Good, they can control the vote (tie or win) and kill at night.
    // User requested: "Equal numbers = Wolf Win".
    if (wolfCount >= goodCount) {
      this.addLog(
        "JUDGE: Wolves have taken control of the village (Parity/Majority)."
      );
      return "WEREWOLVES";
    }

    // 4. Wolf Win: Kill Condition
    if (winCondition === "side_kill") {
      // Side Victory: Kill ALL Villagers OR Kill ALL Gods
      if (villagerCount === 0 || godCount === 0) {
        this.addLog(
          `JUDGE: Wolves have slaughtered a side (${
            villagerCount === 0 ? "Villagers" : "Gods"
          }).`
        );
        return "WEREWOLVES";
      }
    } else {
      // Wipeout (Default): Kill ALL Good players
      if (goodCount === 0) {
        this.addLog("JUDGE: Wolves have slaughtered everyone.");
        return "WEREWOLVES";
      }
    }

    return null;
  }

  finishGame(winner) {
    this.phase = PHASES.FINISHED;
    this.winner = winner;
    const winnerText =
      winner === "VILLAGERS" ? "VILLAGERS (村民)" : "WEREWOLVES (狼人)";
    this.addLog(
      `GAME OVER. ${winnerText} WIN! (游戏结束。${winnerText} 胜利！)`
    );

    // Play Winner Voice
    const voiceKey =
      winner === "VILLAGERS" ? "WINNER_VILLAGERS" : "WINNER_WEREWOLVES";
    this.onVoiceCue(VOICE_MESSAGES[voiceKey]);

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

    // Reset Managers
    this.nightManager = new NightManager();
    this.dayManager = new DayManager();
    this.winner = null;

    // Reset Players (Keep connections/names, clear roles/status)
    Object.values(this.players).forEach((p) => {
      p.role = null;
      p.status = "alive";
      p.isReady = false; // Require ready again
    });

    this.addLog(
      "JUDGE: Game has been reset. Please get ready. (游戏已重置，请准备。)"
    );
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
