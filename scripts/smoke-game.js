/* Basic smoke test for WerewolfGame server logic.
 * Runs without sockets/browser; accelerates timers so phases advance immediately.
 */
const assert = require("assert");
const path = require("path");
const WerewolfGame = require(path.join("..", "server", "game", "WerewolfGame"));
const { ROLES, PHASES } = require(path.join(
  "..",
  "server",
  "game",
  "constants"
));

const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const originalSetImmediate = global.setImmediate;
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

function createGame(playerCount = 8, extraConfig = {}) {
  const logs = [];
  const game = new WerewolfGame(
    "ROOM1",
    "host",
    (text) => logs.push(`[VOICE] ${text}`),
    () => {},
    {
      // deterministic-ish config so we know role counts
      wolves: 2,
      seer: true,
      witch: true,
      guard: true,
      hunter: true,
      ...extraConfig,
    }
  );

  for (let i = 0; i < playerCount; i++) {
    const pid = i === 0 ? "host" : `P${i}`;
    game.addPlayer(`S${i + 1}`, `Player${i + 1}`, pid);
    game.handlePlayerReady(pid);
  }

  return { game, logs };
}

async function run() {
  enableFastTimers();
  try {
    const { game } = createGame(8);

    game.startGame();
    // allow queued timers (start night, enter first phase)
    await tick();
    await tick();

    // Wait for flow to reach wolves; fallback force if needed
    for (let i = 0; i < 5 && game.phase !== PHASES.NIGHT_WOLVES; i++) {
      await tick();
    }
    if (game.phase !== PHASES.NIGHT_WOLVES && game.nightFlow?.length) {
      game.advancePhase(PHASES.NIGHT_WOLVES);
      await tick();
    }

    // Assert roles assigned
    const roles = Object.values(game.players).map((p) => p.role);
    assert.strictEqual(roles.length, 8, "Every player should have a role");
    const wolfCount = roles.filter((r) => r === ROLES.WOLF).length;
    assert.strictEqual(wolfCount, 2, "Expected two wolves from config");

    // Night flow includes wolves and seer/witch/guard
    const nightPhases = new Set(game.nightFlow);
    ["NIGHT_WOLVES", "NIGHT_SEER", "NIGHT_WITCH", "NIGHT_GUARD"].forEach(
      (phase) => assert.ok(nightPhases.has(phase), `Night flow missing ${phase}`)
    );

    // Simulate a wolf kill and resolve the night
    const wolfId = Object.values(game.players).find(
      (p) => p.role === ROLES.WOLF
    )?.id;
    const victimId = Object.values(game.players).find(
      (p) => p.role !== ROLES.WOLF
    )?.id;
    assert.ok(wolfId && victimId, "Need both wolf and victim");

    game.handleNightAction(wolfId, { type: "kill", targetId: victimId });
    await tick(); // allow wolf's nextPhase timer
    game.resolveNight();
    await tick(); // allow day announce applyPending

    assert.strictEqual(
      game.players[victimId].status,
      "dead",
      "Wolf target should be dead after night resolution"
    );

    // Force parity to test win condition
    Object.values(game.players)
      .filter((p) => p.role !== ROLES.WOLF)
      .slice(1)
      .forEach((p) => (p.status = "dead"));
    const winner = game.checkWinCondition();
    assert.strictEqual(winner, "WEREWOLVES", "Wolves should win on parity");

    console.log("Smoke test passed ✔");
  } catch (err) {
    console.error("Smoke test failed:", err);
    process.exitCode = 1;
  } finally {
    restoreTimers();
  }
}

run();
