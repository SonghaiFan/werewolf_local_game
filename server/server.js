const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { WerewolfGame, PHASES } = require('./werewolfLogic');

const app = express();
app.use(cors());

// Serve static files from the client build folder
app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const games = new Map(); // RoomID -> WerewolfGame

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Helper to broadcast state to room
    const broadcastState = (game) => {
        const room = io.in(game.id);
        const sockets = room.allSockets ? room.allSockets() : []; // Varies by version, just iterate logic:
         
        // We need to send personalized state to each player
        io.sockets.adapter.rooms.get(game.id)?.forEach(socketId => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit('game_state', game.getPlayerState(socketId));
            }
        });
    };

    socket.on('create_game', ({ name }) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const game = new WerewolfGame(roomId, socket.id);
        
        game.addPlayer(socket.id, name);
        games.set(roomId, game);

        socket.join(roomId);
        socket.emit('game_created', { roomId }); // Ack
        broadcastState(game);
        console.log(`Game created: ${roomId} by ${name}`);
    });

    socket.on('join_game', ({ roomId, name }) => {
        const game = games.get(roomId);

        if (!game) {
            socket.emit('error', 'Room not found');
            return;
        }

        if (game.phase !== 'WAITING') {
            socket.emit('error', 'Game already in progress');
            return;
        }

        game.addPlayer(socket.id, name);
        socket.join(roomId);
        
        broadcastState(game);
        console.log(`User ${name} joined room ${roomId}`);
    });

    socket.on('start_game', ({ roomId }) => {
        const game = games.get(roomId);
        if (!game || game.hostId !== socket.id) return;
        
        game.startGame();
        broadcastState(game);
        io.to(roomId).emit('notification', 'The Game Has Started!');
    });

    socket.on('night_action', ({ roomId, action }) => {
        const game = games.get(roomId);
        if (!game) return;
        
        const result = game.handleNightAction(socket.id, action);
        
        // If Seer check, send private result back immediately
        if (result && typeof result === 'string') {
            socket.emit('seer_result', { targetId: action.targetId, role: result });
        }

        // Just update state for everyone (so they see "waiting" or updated lock-in if applicable)
        broadcastState(game);
    });

    socket.on('resolve_phase', ({ roomId }) => {
        // Can be triggered by Host manually to force move night -> day
        const game = games.get(roomId);
        if (!game || game.hostId !== socket.id) return;

        if (game.phase === PHASES.NIGHT) {
             game.resolveNight();
             broadcastState(game);
        } else if (game.phase === PHASES.DAY) {
             const result = game.resolveDay();
             broadcastState(game);
        }
    });

    socket.on('day_vote', ({ roomId, targetId }) => {
        const game = games.get(roomId);
        if (!game) return;

        game.handleDayVote(socket.id, targetId);
        broadcastState(game);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const [roomId, game] of games.entries()) {
            if (game.players[socket.id]) {
                game.players[socket.id].status = 'disconnected'; // Mark as disconnected but keep in game logic?
                // For simplified logic, if in waiting, remove. If playing, keep but "dead"?
                if (game.phase === 'WAITING') {
                    game.removePlayer(socket.id);
                    if (Object.keys(game.players).length === 0) {
                        games.delete(roomId);
                    } else {
                        broadcastState(game);
                    }
                } else {
                    // In game, mark disconnected
                    game.addLog(`Player ${game.players[socket.id].name} disconnected.`);
                    broadcastState(game);
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
