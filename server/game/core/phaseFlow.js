// Phase graph navigation and day speech helpers.
const { PHASES } = require("../constants");
const ROLE_DEFINITIONS = require("../RoleDefinitions");
const FLOW_DEFINITION = require("../GameFlow");

function hasRole(role) {
  return Object.values(this.players).some((p) => p.role === role);
}

function nextPhase() {
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

function advancePhase(newPhase) {
  const flow = FLOW_DEFINITION[newPhase];

  if (flow && flow.role && !this.hasRole(flow.role)) {
    const next = flow.next;
    if (next === "RESOLVE_NIGHT") return this.resolveNight();
    return this.advancePhase(next);
  }

  this.phase = newPhase;
  this.logs.push(`--- PHASE: ${newPhase} ---`);

  if (this.nightFlow && this.nightFlow.includes(newPhase)) {
    const idx = this.nightFlow.indexOf(newPhase);
    const voiceParts = [];

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
  } else if (flow && flow.voice) {
    this.read(flow.voice);
  } else {
    this.read(newPhase);
  }

  if (flow && typeof flow.onEnter === "function") {
    flow.onEnter(this);
  }

  if (this.onGameUpdate) this.onGameUpdate(this);
}

function getPostSpeechPhase() {
  return this.shouldRunMayorFlow()
    ? PHASES.DAY_MAYOR_NOMINATE
    : PHASES.DAY_DISCUSSION;
}

function handleDayVote(playerId, targetId) {
  this.dayManager.handleVote(this, playerId, targetId);
}

function handleEndSpeech(playerId) {
  this.dayManager.handleEndSpeech(this, playerId);
}

function checkActiveRole(role) {
  const player = Object.values(this.players).find((p) => p.role === role);
  const isActive = player && player.status === "alive";

  if (!isActive) {
    const delay = Math.floor(Math.random() * 5000) + 5000;
    console.log(`[Game] Role ${role} inactive. Fake waiting for ${delay}ms.`);
    setTimeout(() => {
      this.nextPhase();
    }, delay);
  }
}

module.exports = {
  advancePhase,
  checkActiveRole,
  getPostSpeechPhase,
  handleDayVote,
  handleEndSpeech,
  hasRole,
  nextPhase,
};
