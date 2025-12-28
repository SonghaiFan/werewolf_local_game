// Mayor election flow handlers mixed into WerewolfGame.
const { PHASES } = require("../constants");

function shouldRunMayorFlow() {
  return (
    this.metadata.mayorEnabled &&
    !this.metadata.mayorId &&
    !this.metadata.mayorSkipped &&
    this.round === 1
  );
}

function startMayorNomination() {
  this.metadata.mayorNominees = [];
  this.metadata.mayorPkCandidates = [];
  this.metadata.mayorVotes = {};
  this.metadata.mayorPassers = [];
  this.metadata.mayorWithdrawQueue = [];
  this.metadata.mayorWithdrawResponded = [];
  this.metadata.mayorWithdrawStarted = false;
  this.phase = PHASES.DAY_MAYOR_NOMINATE;
  this.logs.push(`--- PHASE: ${PHASES.DAY_MAYOR_NOMINATE} ---`);
  this.announce(PHASES.DAY_MAYOR_NOMINATE);
  if (this.onGameUpdate) this.onGameUpdate(this);
}

function handleMayorNomination(playerId, targetId) {
  if (this.phase !== PHASES.DAY_MAYOR_NOMINATE) return;
  const player = this.players[playerId];
  if (!player || player.status !== "alive") return;
  if (playerId !== targetId) return;

  const set = new Set(this.metadata.mayorNominees || []);
  if (set.has(playerId)) {
    set.delete(playerId);
    this.print(this.resolveLine("MAYOR_PASS", { seat: this.seatLabel(player) }));
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

function handleMayorPass(playerId) {
  if (this.phase !== PHASES.DAY_MAYOR_NOMINATE) return;
  const player = this.players[playerId];
  if (!player || player.status !== "alive") return;
  this.metadata.mayorNominees = (this.metadata.mayorNominees || []).filter(
    (id) => id !== playerId
  );
  this.metadata.mayorPassers = Array.from(
    new Set([...(this.metadata.mayorPassers || []), playerId])
  );
  this.print(this.resolveLine("MAYOR_PASS", { seat: this.seatLabel(player) }));
  this.maybeAdvanceMayorNominate();
  if (this.onGameUpdate) this.onGameUpdate(this);
}

function maybeAdvanceMayorNominate() {
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

function advanceMayorPhase() {
  if (this.phase === PHASES.DAY_MAYOR_NOMINATE) {
    this.startMayorSpeech();
    return;
  }
  if (this.phase === PHASES.DAY_MAYOR_VOTE) {
    this.finalizeMayorVote();
  }
  if (this.phase === PHASES.DAY_MAYOR_SPEECH) {
    console.log(
      "[Mayor] Transitioning to Withdraw. Nominees:",
      this.metadata.mayorNominees
    );
    this.advancePhase(PHASES.DAY_MAYOR_WITHDRAW);
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

function handleMayorVote(playerId, targetId) {
  const isPkVote = this.phase === PHASES.DAY_MAYOR_PK_VOTE;
  const isMayorVote = this.phase === PHASES.DAY_MAYOR_VOTE;
  if (!isPkVote && !isMayorVote) return;

  const player = this.players[playerId];
  if (!player || player.status !== "alive") return;

  const candidates = isPkVote
    ? this.metadata.mayorPkCandidates || []
    : this.metadata.mayorNominees || [];

  if (candidates.includes(playerId)) return;
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

function enterMayorWithdraw() {
  if (this.metadata.mayorWithdrawStarted) return;
  this.metadata.mayorWithdrawQueue = [...(this.metadata.mayorNominees || [])];
  this.metadata.mayorWithdrawResponded = [];
  this.metadata.mayorWithdrawStarted = true;
  console.log(
    "[Mayor] Withdraw Queue set to:",
    this.metadata.mayorWithdrawQueue
  );
  this.announce(PHASES.DAY_MAYOR_WITHDRAW);
}

function maybeAdvanceMayorWithdraw() {
  const queue = this.metadata.mayorWithdrawQueue || [];
  const respondedList = this.metadata.mayorWithdrawResponded || [];
  const respondedSet = new Set(respondedList);

  console.log(
    `[MayorWithdraw] Checking advance. Queue: ${queue.length}, Responded: ${respondedList.length}`
  );

  if (respondedList.length >= queue.length) {
    console.log(`[MayorWithdraw] All responded (count). Advancing.`);
    this.startMayorVote();
    return;
  }

  const pending = queue.filter((pid) => {
    const p = this.players[pid];
    if (!p || p.status === "dead" || p.status === "disconnected")
      return false;
    return !respondedSet.has(pid);
  });

  console.log(`[MayorWithdraw] Pending players: ${pending}`);

  if (pending.length === 0) {
    console.log(`[MayorWithdraw] All active players responded. Advancing.`);
    this.startMayorVote();
  }
}

function handleMayorWithdraw(playerId, withdraw = true) {
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

function startMayorSpeech() {
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

  if (nominees.length > 0) {
    const firstId = nominees[0];
    const firstP = this.players[firstId];
    if (firstP) {
      this.announce("NEXT_SPEAKER", { seat: this.seatLabel(firstP) });
    }
  }
  if (this.onGameUpdate) this.onGameUpdate(this);
}

function startMayorVote() {
  const nominees = this.metadata.mayorNominees;
  if (!nominees || nominees.length === 0) {
    this.metadata.mayorSkipped = true;
    this.phase = PHASES.DAY_DISCUSSION;
    this.logs.push(`--- PHASE: ${PHASES.DAY_DISCUSSION} ---`);
    if (this.onGameUpdate) this.onGameUpdate(this);
    this.dayManager.startDiscussion(this);
    return;
  }

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

function finalizeMayorVote(isPk = false) {
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
  this.metadata.mayorWithdrawStarted = false;

  this.phase = PHASES.DAY_DISCUSSION;
  this.logs.push(`--- PHASE: ${PHASES.DAY_DISCUSSION} ---`);
  if (this.onGameUpdate) this.onGameUpdate(this);
  this.dayManager.startDiscussion(this);
}

module.exports = {
  advanceMayorPhase,
  enterMayorWithdraw,
  finalizeMayorVote,
  handleMayorNomination,
  handleMayorPass,
  handleMayorVote,
  handleMayorWithdraw,
  maybeAdvanceMayorNominate,
  maybeAdvanceMayorWithdraw,
  shouldRunMayorFlow,
  startMayorNomination,
  startMayorSpeech,
  startMayorVote,
};
