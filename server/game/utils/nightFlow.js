const ROLE_DEFINITIONS = require("../RoleDefinitions");

function buildNightFlow(players) {
  const activeRoles = new Set(Object.values(players).map((player) => player.role));
  const roleDefs = [];

  activeRoles.forEach((role) => {
    if (ROLE_DEFINITIONS[role]) {
      roleDefs.push(ROLE_DEFINITIONS[role]);
    }
  });

  const nightActors = roleDefs
    .filter((def) => def.canActAtNight && def.nightPhase)
    .sort((a, b) => (a.nightPriority || 999) - (b.nightPriority || 999));

  const phases = new Set();
  nightActors.forEach((def) => phases.add(def.nightPhase));

  return Array.from(phases);
}

module.exports = { buildNightFlow };
