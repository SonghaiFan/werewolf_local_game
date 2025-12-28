const { ROLES } = require("../constants");

function getAliveRoleCounts(players) {
  const alivePlayers = Object.values(players).filter(
    (player) => player.status === "alive"
  );

  const wolfCount = alivePlayers.filter((p) => p.role === ROLES.WOLF).length;
  const villagerCount = alivePlayers.filter(
    (p) => p.role === ROLES.VILLAGER
  ).length;
  const goodCount = alivePlayers.length - wolfCount;
  const godCount = goodCount - villagerCount;

  return { wolfCount, villagerCount, goodCount, godCount };
}

function checkWinCondition(players, initialConfig, addLog = () => {}) {
  const { wolfCount, villagerCount, goodCount, godCount } =
    getAliveRoleCounts(players);
  const winCondition = initialConfig?.winCondition || "wipeout";

  if (wolfCount === 0) return "VILLAGERS";

  if (wolfCount >= goodCount) {
    addLog("JUDGE: Wolves have taken control of the village (Parity/Majority).");
    return "WEREWOLVES";
  }

  if (winCondition === "side_kill") {
    if (villagerCount === 0 || godCount === 0) {
      addLog(
        `JUDGE: Wolves have slaughtered a side (${
          villagerCount === 0 ? "Villagers" : "Gods"
        }).`
      );
      return "WEREWOLVES";
    }
  } else if (goodCount === 0) {
    addLog("JUDGE: Wolves have slaughtered everyone.");
    return "WEREWOLVES";
  }

  return null;
}

module.exports = { getAliveRoleCounts, checkWinCondition };
