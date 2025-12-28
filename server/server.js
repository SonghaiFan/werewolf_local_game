const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const os = require("os");
const { WerewolfGame, PHASES } = require("./game");

// Helper to get Local LAN IP
function getLocalExternalIP() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (non-127.0.0.1) and non-ipv4
      if ("IPv4" !== iface.family || iface.internal) {
        continue;
      }
      candidates.push(iface.address);
    }
  }

  // Filter out 169.254 (Link-Local) unless it's the only one
  const workable = candidates.filter((ip) => !ip.startsWith("169.254"));
  const list = workable.length > 0 ? workable : candidates;

  // Prioritize common LAN subnets
  const best =
    list.find((ip) => ip.startsWith("192.168")) ||
    list.find((ip) => ip.startsWith("10.")) ||
    list.find((ip) => ip.startsWith("172.")) ||
    list[0] ||
    "127.0.0.1";

  return best;
}
const SERVER_IP = getLocalExternalIP();
console.log(`[System] Detected Local Server IP: ${SERVER_IP}`);

const app = express();
app.use(cors());

// Serve static files from the client build folder
app.use(express.static(path.join(__dirname, "../client/dist")));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const games = new Map(); // RoomID -> WerewolfGame

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  // Broadcast server IP config to new connection
  socket.emit("server_config", { ip: SERVER_IP });

  // Send latest room for quick join
  const roomIds = Array.from(games.keys());
  const latestRoomId = roomIds[roomIds.length - 1]; // Last created is at the end of Map keys array
  if (latestRoomId) {
    socket.emit("latest_room", { roomId: latestRoomId });
  }

  // Helper to broadcast state to room
  const broadcastState = (game) => {
    const room = io.in(game.id);
    const sockets = room.allSockets ? room.allSockets() : []; // Varies by version, just iterate logic:

    // We need to send personalized state to each player
    io.sockets.adapter.rooms.get(game.id)?.forEach((socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        const pid = game.socketToPid.get(socketId);
        // Only send state if we can identify the player (or maybe they are a spectator? for now require pid)
        if (pid) {
          socket.emit("game_state", game.getPlayerState(pid));
        }
      }
    });
  };

  socket.on("create_game", ({ name, config, pid }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const effectivePid = pid || socket.id;

    // Pass callback for voice cues
    const onVoiceCue = (text) => {
      io.to(roomId).emit("voice_cue", { text });
    };

    // Pass callback for state broadcasting (for async transitions)
    const onGameUpdate = (g) => broadcastState(g);

    const game = new WerewolfGame(
      roomId,
      effectivePid,
      onVoiceCue,
      onGameUpdate,
      config
    );

    game.addPlayer(socket.id, name, effectivePid);
    games.set(roomId, game);

    socket.join(roomId);
    // Send back PID so client can save it
    socket.emit("game_created", { roomId, pid: effectivePid });
    broadcastState(game);
    console.log(`Game created: ${roomId} by ${name} (PID: ${effectivePid})`);
  });

  socket.on("join_game", ({ roomId, name, pid }) => {
    const game = games.get(roomId);
    const effectivePid = pid || socket.id;

    if (!game) {
      socket.emit("error", "Room not found");
      return;
    }

    // Rejoin Logic
    if (game.players[effectivePid]) {
      const success = game.reconnectPlayer(socket.id, effectivePid);
      if (success) {
        socket.join(roomId);
        socket.emit("joined_success", { roomId, pid: effectivePid });
        broadcastState(game);
        console.log(
          `User ${name} reconnected to room ${roomId} (PID: ${effectivePid})`
        );
        return;
      }
    }

    if (game.phase !== "WAITING") {
      socket.emit("error", "Game already in progress");
      return;
    }

    game.addPlayer(socket.id, name, effectivePid);
    socket.join(roomId);
    socket.emit("joined_success", { roomId, pid: effectivePid });

    broadcastState(game);
    console.log(`User ${name} joined room ${roomId}`);
  });

  // ... (Start game same)
  socket.on("player_ready", ({ roomId }) => {
    const game = games.get(roomId);
    if (!game) return;

    const pid = game.socketToPid.get(socket.id);
    if (pid) {
      game.handlePlayerReady(pid);
      broadcastState(game);
    }
  });

  socket.on("start_game", ({ roomId, config }) => {
    const game = games.get(roomId);
    if (!game) return;

    game.startGame(config);
    broadcastState(game);
  });

  socket.on("play_again", ({ roomId }) => {
    const game = games.get(roomId);
    if (!game) return;

    game.reset();
    broadcastState(game);
  });

  socket.on("wolf_propose", ({ roomId, targetId }) => {
    const game = games.get(roomId);
    if (!game) return;

    const pid = game.socketToPid.get(socket.id);
    if (pid) {
      game.handleWolfPropose(pid, targetId);
      broadcastState(game);
    }
  });

  socket.on("night_action", ({ roomId, action }) => {
    const game = games.get(roomId);
    if (!game) return;

    const pid = game.socketToPid.get(socket.id);
    if (pid) {
      const result = game.handleNightAction(pid, action);
      if (result && typeof result === "object" && result.role) {
        // Seer check result
        socket.emit("seer_result", {
          targetId: action.targetId,
          role: result.role,
        });
      }
      broadcastState(game);
    }
  });

  socket.on("resolve_phase", ({ roomId }) => {
    const game = games.get(roomId);
    if (!game) return;

    game.resolveNight();
    broadcastState(game);
  });

  socket.on("end_speech", ({ roomId }) => {
    const game = games.get(roomId);
    if (game) {
      const pid = game.socketToPid.get(socket.id);
      if (pid) {
        game.handleEndSpeech(pid);
        broadcastState(game);
      }
    }
  });

  socket.on("day_vote", ({ roomId, targetId }) => {
    const game = games.get(roomId);
    if (!game) return;

    const pid = game.socketToPid.get(socket.id);
    if (pid) {
      game.handleDayVote(pid, targetId);
      broadcastState(game);
    }
  });

  socket.on("mayor_nominate", ({ roomId, targetId }) => {
    const game = games.get(roomId);
    if (!game) return;
    const pid = game.socketToPid.get(socket.id);
    if (pid) {
      game.handleMayorNomination(pid, targetId);
      broadcastState(game);
    }
  });

  socket.on("mayor_vote", ({ roomId, targetId }) => {
    const game = games.get(roomId);
    if (!game) return;
    const pid = game.socketToPid.get(socket.id);
    if (pid) {
      game.handleMayorVote(pid, targetId);
      broadcastState(game);
    }
  });

  socket.on("mayor_pass", ({ roomId }) => {
    const game = games.get(roomId);
    if (!game) return;
    const pid = game.socketToPid.get(socket.id);
    if (pid) {
      game.handleMayorPass(pid);
      broadcastState(game);
    }
  });

  socket.on("mayor_withdraw", ({ roomId, withdraw = true }) => {
    const game = games.get(roomId);
    if (!game) return;
    const pid = game.socketToPid.get(socket.id);
    if (pid) {
      game.handleMayorWithdraw(pid, withdraw);
      broadcastState(game);
    }
  });

  socket.on("mayor_advance", ({ roomId }) => {
    const game = games.get(roomId);
    if (!game) return;
    const pid = game.socketToPid.get(socket.id);
    if (pid && pid === game.hostId) {
      game.advanceMayorPhase();
      broadcastState(game);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const [roomId, game] of games.entries()) {
      const pid = game.socketToPid.get(socket.id);
      if (pid && game.players[pid]) {
        const player = game.players[pid];
        player.previousStatus = player.status; // Backup status
        player.status = "disconnected";
        game.addLog(`Player ${player.name} disconnected.`);

        // Do NOT remove player logic. Just mark disconnected.
        // Cleanup logic could be a timeout if needed, but for accidental refresh, keep it.
        // However, we must ensure socketToPid is cleaned up to prevent leaks?
        // Actually no, if they never come back we have a zombie player.
        // For a Local LAN game, this is acceptable.

        // Note: If game has not started (WAITING), we MIGHT want to remove them?
        // For waiting room, if they leave, we remove them to free up the "seat" visualization?
        // But if they just refreshed, they want their seat back.
        // Let's keep them even in WAITING for 1 min? Too complex.
        // User Request: "accidently exit room and rejoin" - implies they want to be back.
        // So we keep them.
        broadcastState(game);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
