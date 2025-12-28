const { PHASES, ROLES } = require("../constants");
const VOICE_MESSAGES = require("../JudgeScript");

class DayManager {
  constructor() {
    this.votes = {};
    this.speakingOrder = [];
    this.currentSpeakerIndex = 0;
  }

  resetVotes() {
    this.votes = {};
    this.speakingOrder = [];
    this.currentSpeakerIndex = 0;
  }

  startDiscussion(game) {
    const alivePlayers = Object.values(game.players).filter(
      (p) => p.status === "alive"
    );
    // Sort by ID to ensure consistent order
    alivePlayers.sort((a, b) => a.id.localeCompare(b.id)); // Assuming ID is string

    let order = alivePlayers.map((p) => p.id);

    // Plain logic: ID sort
    this.speakingOrder = order;
    this.currentSpeakerIndex = 0;

    if (order.length > 0) {
      const nextId = order[0];
      const nextP = game.players[nextId];
      game.addLog(
        `JUDGE: Discussion starts. ${nextP.name}, you have the floor.`
      );

      // Trigger specific voice for first speaker
      const text = VOICE_MESSAGES.NEXT_SPEAKER(nextP.avatar);
      game.onVoiceCue(text);
    } else {
      // Should unlikely happen
      game.nextPhase();
    }

    // Broadcast speaking order update
    if (game.onGameUpdate) game.onGameUpdate(game);
  }

  setSpeakingQueue(ids) {
    this.speakingOrder = ids || [];
    this.currentSpeakerIndex = 0;
  }

  handleEndSpeech(game, playerId) {
    // Common validation
    if (this.speakingOrder.length === 0) return;

    const currentSpeaker = this.speakingOrder[this.currentSpeakerIndex];
    if (playerId !== currentSpeaker && playerId !== game.hostId) return;

    this.currentSpeakerIndex++;

    if (this.currentSpeakerIndex >= this.speakingOrder.length) {
      const msg =
        game.phase === PHASES.DAY_LEAVE_SPEECH
          ? "Last words concluded."
          : "All speeches concluded.";
      game.addLog(`JUDGE: ${msg}`);
      setTimeout(() => game.nextPhase(), 100);
    } else {
      const nextId = this.speakingOrder[this.currentSpeakerIndex];
      const nextP = game.players[nextId];

      if (game.phase === PHASES.DAY_LEAVE_SPEECH) {
        game.addLog(`JUDGE: Next player for last words: ${nextP.name}.`);
        const code = nextP.avatar || "?";
        const text = VOICE_MESSAGES.BANISH_LEAVE_SPEECH(code);
        game.triggerVoice(PHASES.DAY_LEAVE_SPEECH, text);
      } else {
        game.addLog(`JUDGE: Next speaker is ${nextP.name}.`);
        const text = VOICE_MESSAGES.NEXT_SPEAKER(nextP.avatar);
        game.onVoiceCue(text);
      }
    }

    // Trigger generic update for UI
    if (game.onGameUpdate) game.onGameUpdate(game);
  }

  handleVote(game, voterId, targetId) {
    const player = game.players[voterId];
    if (!player || player.status !== "alive") return;

    // PK Restriction: Candidates cannot vote in PK phase
    if (
      game.phase === PHASES.DAY_PK_VOTE &&
      game.pkCandidates &&
      game.pkCandidates.includes(voterId)
    ) {
      // Silently ignore or warn?
      return;
    }

    // Toggle vote
    if (this.votes[voterId] === targetId) {
      delete this.votes[voterId];
    } else {
      this.votes[voterId] = targetId;
    }

    // Calculate expected voters
    let expectedVoters = Object.values(game.players).filter(
      (p) => p.status === "alive"
    );

    // In PK Vote, exclude candidates
    if (game.phase === PHASES.DAY_PK_VOTE && game.pkCandidates) {
      expectedVoters = expectedVoters.filter(
        (p) => !game.pkCandidates.includes(p.id)
      );
    }

    if (Object.keys(this.votes).length === expectedVoters.length) {
      game.addLog("JUDGE: All votes received. Tallying...");
      setTimeout(() => this.resolve(game), 1500);
    }
  }

  startPK(game, candidates) {
    game.pkCandidates = candidates;

    // Set speaking queue to candidates
    this.setSpeakingQueue(candidates);

    game.addLog("JUDGE: Entering PK Session. Candidates will speak.");

    // Advance to PK Speech
    game.advancePhase(PHASES.DAY_PK_SPEECH);

    // Trigger first speaker immediately
    if (candidates.length > 0) {
      const firstId = candidates[0];
      const firstP = game.players[firstId];
      const cue = VOICE_MESSAGES.NEXT_SPEAKER(firstP.avatar);
      game.onVoiceCue(cue);
    }
  }

  resolve(game) {
    const voteCounts = {};
    const voteDetails = [];

    // Initialize counts to 0 for targets
    Object.values(this.votes).forEach((targetId) => {
      if (targetId !== "abstain") voteCounts[targetId] = 0;
    });

    // Tally and build detail log
    Object.entries(this.votes).forEach(([voterId, targetId]) => {
      const voterName =
        game.players[voterId]?.avatar ||
        game.players[voterId]?.name ||
        "Unknown";

      if (targetId === "abstain") {
        voteDetails.push(`${voterName}->弃票`);
      } else {
        let w = 1;
        voteCounts[targetId] = (voteCounts[targetId] || 0) + w;
        const targetName =
          game.players[targetId]?.avatar ||
          game.players[targetId]?.name ||
          "Unknown";
        voteDetails.push(`${voterName}->${targetName}`);
      }
    });

    // Log the details
    if (voteDetails.length > 0) {
      game.addLog(`JUDGE: Votes: ${voteDetails.join(", ")}`);
    } else {
      game.addLog(`JUDGE: No votes cast.`);
    }

    let maxVotes = 0;
    let candidates = [];
    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        candidates = [id];
      } else if (count === maxVotes) candidates.push(id);
    }

    game.phase = PHASES.DAY_ELIMINATION;

    // If it's a tie, reset votes immediately so UI doesn't look stuck during the 5s tie announcement
    const names = Object.values(voteCounts);
    const tieMode = names.length === 0 || candidates.length > 1;

    if (tieMode) {
      this.resetVotes();
    }

    // Broadcast immediately to show the "Tallying" result / logs
    if (game.onGameUpdate) game.onGameUpdate(game);

    if (candidates.length === 1) {
      const victim = candidates[0];
      game.pkCandidates = null; // Clear PK state if resolved
      game.players[victim].status = "dead";
      game.addLog(
        `JUDGE: The village has voted to execute ${game.players[victim].name}.`
      );

      game.checkDeathTriggers(victim, "vote"); // Check for Hunter

      game.executedPlayerId = victim;
      game.banishCount = (game.banishCount || 0) + 1;

      const winResult = game.checkWinCondition();
      if (winResult) {
        game.finishGame(winResult);
      } else {
        const proceedAfterDeathProcessing = () => {
          // Rule: Day Execution always allows Last Words
          // Phase: DAY_LEAVE_SPEECH (Standard)
          game.phase = PHASES.DAY_LEAVE_SPEECH;
          game.nextPhaseAfterSpeech = "START_NIGHT_OR_END"; // Go to night after speech
          game.logs.push(`--- PHASE: ${PHASES.DAY_LEAVE_SPEECH} ---`);

          // Set queue for single banishment
          this.setSpeakingQueue([victim]);

          const code = game.players[victim].avatar || "?";
          const text = VOICE_MESSAGES.BANISH_LEAVE_SPEECH(code);
          game.triggerVoice(text);

          if (game.onGameUpdate) game.onGameUpdate(game);
        };

        const interrupted = game.processDeathInterruption(
          victim,
          proceedAfterDeathProcessing
        );
        if (!interrupted) {
          proceedAfterDeathProcessing();
        }
      }
    } else {
      // TIE / DRAW

      // Check if this is already a PK vote
      if (game.phase === PHASES.DAY_PK_VOTE) {
        // Second Tie -> Peaceful Day
        const text = VOICE_MESSAGES.DAY_PK_TIE;
        game.addLog(`JUDGE: ${text}`);
        game.onVoiceCue(text);
        game.executedPlayerId = null;
        game.pkCandidates = []; // Clear PK state

        if (game.onGameUpdate) game.onGameUpdate(game);

        setTimeout(() => {
          game.startNightOrEnd();
        }, 5000);
        return;
      }

      // First Tie -> Enter PK
      const text = VOICE_MESSAGES.DAY_VOTE_TIE;
      game.addLog(`JUDGE: ${text}`);
      game.onVoiceCue(text);

      game.executedPlayerId = null;

      // Broadcast the tie message
      if (game.onGameUpdate) game.onGameUpdate(game);

      this.startPK(game, candidates);
    }
  }
}

module.exports = DayManager;
