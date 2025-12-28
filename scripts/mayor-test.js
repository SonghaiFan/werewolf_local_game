/* Mayor flow tests: nomination, voting, tie/skip. */
const assert = require("assert");
const path = require("path");
const WerewolfGame = require(path.join("..", "server", "game", "WerewolfGame"));
const { PHASES } = require(path.join("..", "server", "game", "constants"));

const originalSetImmediate = global.setImmediate;
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const originalClearImmediate = global.clearImmediate;

function enableFastTimers() {
  global.setTimeout = (fn) => originalSetImmediate(fn);
  global.clearTimeout = (id) =>
    originalClearImmediate ? originalClearImmediate(id) : originalClearTimeout(id);
}

function restoreTimers() {
  global.setTimeout = originalSetTimeout;
  global.clearTimeout = originalClearTimeout;
}

const tick = () => new Promise((resolve) => originalSetImmediate(resolve));

function createMayorGame(playerCount = 6) {
  const game = new WerewolfGame(
    "ROOM1",
    "host",
    () => {},
    () => {},
    { enableMayor: true }
  );
  for (let i = 0; i < playerCount; i++) {
    const pid = i === 0 ? "host" : `P${i}`;
    game.addPlayer(`S${i + 1}`, `Player${i + 1}`, pid);
    game.handlePlayerReady(pid);
  }
  return game;
}

async function testWinner() {
  const game = createMayorGame();
  game.startGame();
  await tick();
  await tick();
  game.round = 1;
  game.startMayorNomination();

  const nomineeId = "P2";
  game.handleMayorNomination(nomineeId, nomineeId);
  assert.ok(game.metadata.mayorNominees.includes(nomineeId), "Nominee recorded");

  game.advanceMayorPhase(); // to speech
  game.advanceMayorPhase(); // to withdraw
  game.advanceMayorPhase(); // to vote
  const candidates = game.metadata.mayorNominees;
  const voters = Object.values(game.players)
    .filter((p) => p.status === "alive" && !candidates.includes(p.id))
    .map((p) => p.id);
  voters.forEach((pid) => game.handleMayorVote(pid, nomineeId));

  assert.strictEqual(game.metadata.mayorId, nomineeId, "Mayor elected");
  assert.strictEqual(
    game.players[nomineeId].specialFlags?.isMayor,
    true,
    "Mayor flag set on player"
  );
  assert.strictEqual(game.phase, PHASES.DAY_DISCUSSION, "Returns to discussion");
}

async function testTieSkip() {
  const game = createMayorGame();
  game.startGame();
  await tick();
  await tick();
  game.round = 1;
  game.startMayorNomination();

  game.handleMayorNomination("P1", "P2");
  game.handleMayorNomination("P1", "P3");
  game.advanceMayorPhase(); // to speech
  game.advanceMayorPhase(); // to withdraw
  game.advanceMayorPhase(); // to vote

  // Split votes evenly
  const candidates = game.metadata.mayorNominees;
  const voters = Object.values(game.players)
    .filter((p) => p.status === "alive" && !candidates.includes(p.id))
    .map((p) => p.id);
  voters.forEach((pid, idx) => {
    const target = idx % 2 === 0 ? "P2" : "P3";
    game.handleMayorVote(pid, target);
  });

  // Now PK speech -> advance to PK vote
  game.advanceMayorPhase(); // from PK speech to PK vote
  // tie again in PK vote
  voters.forEach((pid, idx) => {
    const target = idx % 2 === 0 ? "P2" : "P3";
    game.handleMayorVote(pid, target);
  });

  assert.strictEqual(game.metadata.mayorId, null, "No mayor on tie");
  assert.strictEqual(game.metadata.mayorSkipped, true, "Mayor skipped flag");
  assert.strictEqual(game.phase, PHASES.DAY_DISCUSSION, "Returns to discussion");
}

async function run() {
  enableFastTimers();
  try {
    await testWinner();
    await testTieSkip();
    console.log("Mayor tests passed ✔");
  } catch (err) {
    console.error("Mayor tests failed:", err);
    process.exitCode = 1;
  } finally {
    restoreTimers();
  }
}

run();
