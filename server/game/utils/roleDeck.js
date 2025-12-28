const { ROLES } = require("../constants");

function buildRoleDeck(playerCount, config, addLog = () => {}) {
  const roles = [];
  const hasCustomConfig = config && typeof config === "object";

  if (hasCustomConfig) {
    const {
      wolves = 0,
      seer = false,
      witch = false,
      guard = false,
      hunter = false,
    } = config;

    for (let i = 0; i < wolves; i++) roles.push(ROLES.WOLF);
    if (seer) roles.push(ROLES.SEER);
    if (witch) roles.push(ROLES.WITCH);
    if (guard) roles.push(ROLES.GUARD);
    if (hunter) roles.push(ROLES.HUNTER);

    addLog(
      `JUDGE: Custom Rules - Wolves: ${wolves}, Seer: ${
        seer ? "Yes" : "No"
      }, Witch: ${witch ? "Yes" : "No"}, Guard: ${
        guard ? "Yes" : "No"
      }, Hunter: ${hunter ? "Yes" : "No"}.`
    );
  } else {
    if (playerCount >= 6 && playerCount < 9) {
      roles.push(ROLES.WOLF, ROLES.WOLF);
      roles.push(ROLES.SEER, ROLES.WITCH);
    } else if (playerCount >= 9 && playerCount < 12) {
      roles.push(ROLES.WOLF, ROLES.WOLF, ROLES.WOLF);
      roles.push(ROLES.SEER, ROLES.WITCH, ROLES.HUNTER);
    } else if (playerCount >= 12) {
      roles.push(ROLES.WOLF, ROLES.WOLF, ROLES.WOLF, ROLES.WOLF);
      roles.push(ROLES.SEER, ROLES.WITCH, ROLES.HUNTER, ROLES.GUARD);
    } else {
      const numWolves = Math.max(1, Math.floor(playerCount / 3));
      for (let i = 0; i < numWolves; i++) roles.push(ROLES.WOLF);
      roles.push(ROLES.SEER);
      if (roles.length < playerCount) roles.push(ROLES.WITCH);
    }
  }

  while (roles.length < playerCount) roles.push(ROLES.VILLAGER);

  return balanceRoleDeck(roles, playerCount, addLog);
}

function balanceRoleDeck(roleDeck, playerCount, addLog = () => {}) {
  const roles = [...roleDeck];

  if (roles.length > playerCount) {
    addLog(
      "JUDGE: Player count lower than rules require. Adjusting roles for balance."
    );
    const maxWolves = Math.max(1, Math.floor(playerCount / 3));
    while (
      roles.filter((role) => role === ROLES.WOLF).length > maxWolves &&
      roles.length > playerCount
    ) {
      const idx = roles.indexOf(ROLES.WOLF);
      roles.splice(idx, 1);
    }
    while (roles.length > playerCount && roles.indexOf(ROLES.WITCH) !== -1)
      roles.splice(roles.indexOf(ROLES.WITCH), 1);
    while (roles.length > playerCount && roles.indexOf(ROLES.SEER) !== -1)
      roles.splice(roles.indexOf(ROLES.SEER), 1);
    while (roles.length > playerCount) roles.pop();
  }

  return roles.sort(() => Math.random() - 0.5);
}

module.exports = { buildRoleDeck, balanceRoleDeck };
