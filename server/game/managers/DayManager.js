const { PHASES } = require("../constants");
const SCRIPT = require("../JudgeScript");

const seatLabel = (player) =>
  `${String(player?.avatar || "?").padStart(2, "0")}号`;

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
      game.announce("DISCUSSION_START", { seat: seatLabel(nextP) });
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
      const endKey =
        game.phase === PHASES.DAY_LEAVE_SPEECH
          ? "LAST_WORDS_END"
          : "SPEECH_END";
      game.print(endKey);
      setTimeout(() => game.nextPhase(), 100);
    } else {
      const nextId = this.speakingOrder[this.currentSpeakerIndex];
      const nextP = game.players[nextId];

      if (game.phase === PHASES.DAY_LEAVE_SPEECH) {
        game.announce("NEXT_LAST_WORDS", { seat: seatLabel(nextP) });
      } else {
        game.announce("NEXT_SPEAKER", { seat: seatLabel(nextP) });
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
      game.announce("VOTES_TALLYING");
      setTimeout(() => this.resolve(game), 1500);
    }
  }

  startPK(game, candidates) {
    game.pkCandidates = candidates;

    // Set speaking queue to candidates
    this.setSpeakingQueue(candidates);

    game.announce("ENTER_PK");

    // Advance to PK Speech
    game.advancePhase(PHASES.DAY_PK_SPEECH);

    // Trigger first speaker immediately
    if (candidates.length > 0) {
      const firstId = candidates[0];
      const firstP = game.players[firstId];
      game.announce("NEXT_SPEAKER", { seat: seatLabel(firstP) });
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
      const voterSeat = seatLabel(game.players[voterId]);

      if (targetId === "abstain") {
        voteDetails.push(`${voterSeat}->弃票`);
      } else {
        let w = 1;
        if (game.metadata && game.metadata.mayorId === voterId) {
          w = 1.5;
        }
        voteCounts[targetId] = (voteCounts[targetId] || 0) + w;
        const targetSeat = seatLabel(game.players[targetId]);
        voteDetails.push(
          `${voterSeat}->${targetSeat}${w > 1 ? "(1.5票)" : ""}`
        );
      }
    });

    // Log only (no voice) for vote details
    if (voteDetails.length > 0) {
      game.print(
        game.resolveLine("VOTES_DETAIL", { detail: voteDetails.join(", ") })
      );
    } else {
      game.print(game.resolveLine("VOTES_NONE"));
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
      game.announce("BANISH_EXECUTE", {
        seat: seatLabel(game.players[victim]),
      });

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

          game.read("BANISH_LEAVE_SPEECH", {
            seat: seatLabel(game.players[victim]),
          });

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
        game.announce("DAY_PK_TIE");
        game.executedPlayerId = null;
        game.pkCandidates = []; // Clear PK state

        if (game.onGameUpdate) game.onGameUpdate(game);

        setTimeout(() => {
          game.startNightOrEnd();
        }, 5000);
        return;
      }

      // First Tie -> Enter PK
      game.announce("DAY_VOTE_TIE");

      game.executedPlayerId = null;

      // Broadcast the tie message
      if (game.onGameUpdate) game.onGameUpdate(game);

      this.startPK(game, candidates);
    }
  }
}

module.exports = DayManager;
