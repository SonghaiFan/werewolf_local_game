// Player connection and readiness helpers mixed into WerewolfGame.
const { PHASES } = require("../constants");

function addPlayer(socketId, name, pid) {
  if (this.players[pid]) return false;
  if (this.phase !== PHASES.WAITING) return false;

  const usedNumbers = new Set(
    Object.values(this.players).map((p) => p.avatar)
  );
  let seatNumber = 1;
  while (usedNumbers.has(seatNumber)) {
    seatNumber++;
  }

  this.players[pid] = {
    id: pid,
    socketId,
    name,
    role: null,
    status: "alive",
    previousStatus: "alive",
    avatar: seatNumber,
    isReady: false,
  };

  this.socketToPid.set(socketId, pid);
  return true;
}

function reconnectPlayer(socketId, pid) {
  const player = this.players[pid];
  if (!player) return false;

  player.socketId = socketId;
  player.status = player.previousStatus;
  this.socketToPid.set(socketId, pid);
  this.addLog(`Player ${player.name} reconnected.`);
  return true;
}

function removePlayer(socketId) {
  const pid = this.socketToPid.get(socketId);
  if (pid) {
    delete this.players[pid];
    this.socketToPid.delete(socketId);
  }
}

function handlePlayerReady(playerId) {
  if (this.phase !== PHASES.WAITING) return;
  if (this.players[playerId]) {
    this.players[playerId].isReady = !this.players[playerId].isReady;
  }
}

module.exports = {
  addPlayer,
  reconnectPlayer,
  removePlayer,
  handlePlayerReady,
};
