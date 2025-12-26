const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const os = require('os');
const { WerewolfGame, PHASES } = require('./game');

// Helper to get Local LAN IP
function getLocalExternalIP() {
    const interfaces = os.networkInterfaces();
    const candidates = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (non-127.0.0.1) and non-ipv4
            if ('IPv4' !== iface.family || iface.internal) {
                continue;
            }
            candidates.push(iface.address);
        }
    }
    
    // Filter out 169.254 (Link-Local) unless it's the only one
    const workable = candidates.filter(ip => !ip.startsWith('169.254'));
    const list = workable.length > 0 ? workable : candidates;

    // Prioritize common LAN subnets
    const best = list.find(ip => ip.startsWith('192.168')) 
              || list.find(ip => ip.startsWith('10.'))
              || list.find(ip => ip.startsWith('172.'))
              || list[0]
              || '127.0.0.1';
              
    return best;
}
const SERVER_IP = getLocalExternalIP();
console.log(`[System] Detected Local Server IP: ${SERVER_IP}`);

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
    // Broadcast server IP config to new connection
    socket.emit('server_config', { ip: SERVER_IP });

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
        // Pass callback for voice cues
        const onVoiceCue = (text) => {
            io.to(roomId).emit('voice_cue', { text });
        };

        // Pass callback for state broadcasting (for async transitions)
        const onGameUpdate = (g) => broadcastState(g);

        const game = new WerewolfGame(roomId, socket.id, onVoiceCue, onGameUpdate);
        
        game.addPlayer(socket.id, name);
        games.set(roomId, game);

        socket.join(roomId);
        socket.emit('game_created', { roomId }); // Ack
        broadcastState(game);
        console.log(`Game created: ${roomId} by ${name}`);
    });

    socket.on('join_game', ({ roomId, name }) => {
        // ... (Join logic same)
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

    // ... (Start game same)
    socket.on('player_ready', ({ roomId }) => {
        const game = games.get(roomId);
        if (!game) return;
        
        game.handlePlayerReady(socket.id);
        broadcastState(game);
    });

    socket.on('start_game', ({ roomId }) => {
        const game = games.get(roomId);
        if (!game) return;
        
        game.startGame();
        broadcastState(game);
    });

    socket.on('night_action', ({ roomId, action }) => {
        const game = games.get(roomId);
        if (!game) return;
        
        game.handleNightAction(socket.id, action);
        broadcastState(game);
    });

    socket.on('resolve_phase', ({ roomId }) => {
        const game = games.get(roomId);
        if (!game) return;
        
        game.resolveNight(); 
        broadcastState(game);
    });

    // --- Election Events ---
    socket.on('election_nominate', ({ roomId }) => {
        const game = games.get(roomId);
        if(!game) return;
        game.handleElectionNominate(socket.id);
        broadcastState(game);
    });

    socket.on('election_pass', ({ roomId }) => {
        const game = games.get(roomId);
        if(!game) return;
        game.handleElectionPass(socket.id);
        broadcastState(game);
    });

    socket.on('election_vote', ({ roomId, targetId }) => {
        const game = games.get(roomId);
        if(!game) return;
        game.handleElectionVote(socket.id, targetId);
        broadcastState(game);
    });

    socket.on('end_speech', ({ roomId }) => {
        const game = games.get(roomId);
        if (game) {
            game.handleEndSpeech(socket.id);
            broadcastState(game);
        }
    });

    socket.on('sheriff_handover', ({ roomId, targetId }) => {
        const game = games.get(roomId);
        if(!game) return;
        // targetId can be null (tear) or a playerId
        game.handleSheriffHandover(socket.id, targetId);
        broadcastState(game);
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
                game.players[socket.id].status = 'disconnected'; // Mark as disconnected
                // If it's the host, maybe migrate host? For now, if everyone leaves, destroy.
                
                const playerName = game.players[socket.id].name;
                game.removePlayer(socket.id); 
                
                // If count is 0, delete room.
                if (Object.keys(game.players).length === 0) {
                     console.log(`Room ${roomId} empty. Closing.`);
                     games.delete(roomId);
                } else {
                     game.addLog(`Player ${playerName} disconnected.`);
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
