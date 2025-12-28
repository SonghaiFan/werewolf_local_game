function allPlayersActed(game, actedSetOrArray) {
  const alive = Object.values(game.players).filter((p) => p.status === "alive");
  const acted = Array.isArray(actedSetOrArray)
    ? actedSetOrArray
    : Array.from(actedSetOrArray);
  return acted.length === alive.length;
}

module.exports = {
  allPlayersActed,
};
