const { ROLES, PHASES } = require('./constants');
const NightManager = require('./managers/NightManager');
const DayManager = require('./managers/DayManager');
const VOICE_MESSAGES = require('./voiceMessages');

class WerewolfGame {
    constructor(id, hostId, onVoiceCue, onGameUpdate, config = null) {
        this.id = id;
        this.hostId = hostId;
        this.onVoiceCue = onVoiceCue || (() => {});
        this.onGameUpdate = onGameUpdate || (() => {});
        this.initialConfig = config;

        this.players = {};
        this.phase = PHASES.WAITING;
        this.round = 0;
        this.logs = [];
        this.pendingNextPhase = null;
        this.executedPlayerId = null;
        this.pendingDeaths = [];

        this.nightManager = new NightManager();
        this.dayManager = new DayManager();
        this.winner = null;
        this.banishCount = 0;
        
        // Mapping Ephemeral Socket ID -> Persistent Player ID
        this.socketToPid = new Map();
    }

    // --- State Access ---

    getPublicState() {
        const publicPlayers = {};
        for(const [pid, p] of Object.entries(this.players)) {
            publicPlayers[pid] = {
                id: p.id,
                name: p.name,
                status: p.status,
                avatar: p.avatar,
                isReady: p.isReady,
                isVoting: !!this.dayManager.votes[pid]
            };
        }

        // Add Speaking Data
        let speakingData = null;
        if (this.phase === PHASES.DAY_DISCUSSION && this.dayManager.speakingOrder) {
            speakingData = {
                currentSpeakerId: this.dayManager.speakingOrder[this.dayManager.currentSpeakerIndex] || null,
                order: this.dayManager.speakingOrder
            };
        }

        return {
            id: this.id,
            phase: this.phase,
            round: this.round,
            players: publicPlayers,
            logs: this.logs,
            speaking: speakingData,
            executedId: this.executedPlayerId, // Expose executed player ID
            hostId: this.hostId,
            winner: this.winner
        };
    }

    getPlayerState(playerId) {
        const publicState = this.getPublicState();
        const me = this.players[playerId];
        
        if (me) {
            let info = { ...me };
            
            // Explicitly set my role in the players list so PlayerGrid sees it
            if (publicState.players[playerId]) {
                publicState.players[playerId].role = me.role;
            }
            
            // Add Voting Data
            if (this.phase === PHASES.DAY_VOTE) {
                info.votes = this.dayManager.votes;
            }
            if (this.phase === PHASES.DAY_ELECTION_VOTE) {
                 // Info about election votes if needed? 
                 // Original code exposed election state generally.
            }

            // Speaking Data (Private Context if needed? No, public)


            // Context specific info
            let hasActed = false;

            if (me.role === ROLES.WOLF) {
                info.nightTarget = this.nightManager.actions.wolfTarget;
                info.wolfVotes = this.nightManager.actions.wolfVotes;
                if (this.phase === PHASES.NIGHT_WOLVES && this.nightManager.actions.wolfTarget) {
                    hasActed = true;
                }
            }
            if (me.role === ROLES.WITCH) {
                 // Add long-term potion status
                 info.witchState = {
                     saveUsed: this.nightManager.witchState.saveUsed,
                     poisonUsed: this.nightManager.witchState.poisonUsed
                 };

                 if (this.phase === PHASES.NIGHT_WITCH) {
                     // Only reveal victim if Witch has Antidote (save not used)
                     if (!this.nightManager.witchState.saveUsed) {
                         info.wolfTarget = this.nightManager.actions.wolfTarget;
                     }
                     if (this.nightManager.actions.witchAction) {
                         hasActed = true;
                     }
                 }
            }
            if (me.role === ROLES.SEER && this.phase === PHASES.NIGHT_SEER) {
                if (this.nightManager.actions.seerResult || this.nightManager.actions.seerTarget) {
                    hasActed = true;
                }
            }
            
            if (this.phase === PHASES.DAY_VOTE) {
                if (this.dayManager.votes && this.dayManager.votes[playerId]) {
                    hasActed = true;
                }
                info.votes = this.dayManager.votes;
            } else if (this.phase === PHASES.DAY_ELECTION_VOTE) {
                 // Info about election votes if needed? 
                 // Original code exposed election state generally.
            }

            info.hasActed = hasActed;
            
            publicState.me = info;
        }

        // Reveal Wolf Allies
        if (me && me.role === ROLES.WOLF) {
             Object.values(this.players).forEach(p => {
                 if (p.role === ROLES.WOLF) {
                     publicState.players[p.id].role = ROLES.WOLF; 
                 }
             });
             // Expose NightManager Wolf Votes ONLY during Night Wolf Phase
             if (this.phase === PHASES.NIGHT_WOLVES) {
                 publicState.wolfVotes = this.nightManager.actions.wolfVotes;
             }
        }
        
        const isDead = me && me.status === 'dead';
        const isMyLastWords = this.phase === PHASES.DAY_LEAVE_SPEECH && this.executedPlayerId === playerId;
        
        if ((isDead && !isMyLastWords) || this.phase === PHASES.FINISHED) {
             Object.values(this.players).forEach(p => {
                 publicState.players[p.id].role = p.role;
             });
        }

        return publicState;
    }

    // --- Core Logic ---

    addLog(message) {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        this.logs.push(`[${time}] ${message}`);
    }

    addPlayer(socketId, name, pid) {
        // If pid already exists (rejoin scenario handled by reconnectPlayer, but just in case)
        if (this.players[pid]) return false;

        if (this.phase !== PHASES.WAITING) return false;
        
        // Find first available seat number (1-based)
        const usedNumbers = new Set(Object.values(this.players).map(p => p.avatar));
        let seatNumber = 1;
        while (usedNumbers.has(seatNumber)) {
            seatNumber++;
        }

        this.players[pid] = {
            id: pid, // Persistent ID
            socketId: socketId, // Current Socket
            name: name,
            role: null,
            status: 'alive',
            previousStatus: 'alive',
            avatar: seatNumber,
            isReady: false
        };
        
        this.socketToPid.set(socketId, pid);
        return true;
    }

    reconnectPlayer(socketId, pid) {
        const player = this.players[pid];
        if (!player) return false;

        // Update with new socket
        player.socketId = socketId;
        // Restore status from before disconnection
        player.status = player.previousStatus; 
        
        // Update map
        // Remove old socket mapping if exists? Hard to know old socket, but clean up potentially? 
        // We just set new one.
        this.socketToPid.set(socketId, pid);
        this.addLog(`Player ${player.name} reconnected.`);
        return true;
    }

    removePlayer(socketId) {
        const pid = this.socketToPid.get(socketId);
        if (pid) {
            delete this.players[pid];
            this.socketToPid.delete(socketId);
        }
    }

    handlePlayerReady(playerId) {
        if (this.phase !== PHASES.WAITING) return;
        if (this.players[playerId]) {
            this.players[playerId].isReady = !this.players[playerId].isReady;
        }
    }

    startGame(config = null) {
        if (this.phase !== PHASES.WAITING) return;
        
        const allReady = Object.values(this.players).every(p => p.isReady || p.id === this.hostId);
        if (!allReady) return;
        
        // Ensure host is marked ready for consistency if not already
        if (this.players[this.hostId] && !this.players[this.hostId].isReady) {
            this.players[this.hostId].isReady = true;
        }
        
        const playerIds = Object.keys(this.players);
        const count = playerIds.length;
        
        // Role Distribution
        const roles = [];
        
        // Effective Config: Passed Config (Lobby) > Initial Config (Landing) > Auto
        const effectiveConfig = config || this.initialConfig;

        if (effectiveConfig && typeof effectiveConfig === 'object') {
             // 3a. Custom Config from Host
             const { wolves = 0, seer = false, witch = false } = effectiveConfig;
             
             // Add Wolves
             for (let i = 0; i < wolves; i++) roles.push(ROLES.WOLF);
             
             // Add Specials
             if (seer) roles.push(ROLES.SEER);
             if (witch) roles.push(ROLES.WITCH);
             
             // Validation: If config exceeds count, we might have issues, but UI prevents this.
             // If config is less, we fill with villagers below.
             
             this.addLog(`JUDGE: Custom Rules - Wolves: ${wolves}, Seer: ${seer?'Yes':'No'}, Witch: ${witch?'Yes':'No'}.`);
             
        } else {
            // 3b. Standard Auto-Config (Fallback)
             if (count >= 6 && count < 9) {
                 // 6-8: 2 Wolves, 1 Seer, 1 Witch, rest Villagers
                 roles.push(ROLES.WOLF, ROLES.WOLF);
                 roles.push(ROLES.SEER, ROLES.WITCH);
             } else if (count >= 9 && count < 12) {
                  // 9-11: 3 Wolves, 1 Seer, 1 Witch, rest Villagers (Hunter placeholder as Villager)
                  roles.push(ROLES.WOLF, ROLES.WOLF, ROLES.WOLF);
                  roles.push(ROLES.SEER, ROLES.WITCH);
             } else if (count >= 12) {
                  // 12+: 4 Wolves, 1 Seer, 1 Witch, rest Villagers
                  roles.push(ROLES.WOLF, ROLES.WOLF, ROLES.WOLF, ROLES.WOLF);
                  roles.push(ROLES.SEER, ROLES.WITCH);
             } else {
                  // Fallback for small usage / debugging (<6)
                  // e.g. 3 players -> 1 Wolf, 1 Seer, 1 Villager
                  const numWolves = Math.max(1, Math.floor(count / 3));
                  for (let i = 0; i < numWolves; i++) roles.push(ROLES.WOLF);
                  roles.push(ROLES.SEER); 
                  if (roles.length < count) roles.push(ROLES.WITCH);
             }
        }

        // Fill rest with Villagers
        while (roles.length < count) roles.push(ROLES.VILLAGER);
        
        // Truncate/Balance if overflow (e.g. 6P preset used for 3 players)
        if (roles.length > count) {
            this.addLog("JUDGE: Player count lower than rules require. Adjusting roles for balance.");
            // 1. If wolves exceed 1/2 of players, reduce them
            const maxWolves = Math.max(1, Math.floor(count / 3)); 
            while (roles.filter(r => r === ROLES.WOLF).length > maxWolves && roles.length > count) {
                const idx = roles.indexOf(ROLES.WOLF);
                roles.splice(idx, 1);
            }
            // 2. Still too many? Remove specials
            while (roles.length > count && roles.indexOf(ROLES.WITCH) !== -1) roles.splice(roles.indexOf(ROLES.WITCH), 1);
            while (roles.length > count && roles.indexOf(ROLES.SEER) !== -1) roles.splice(roles.indexOf(ROLES.SEER), 1);
            // 3. Last resort, pop from end
            while (roles.length > count) roles.pop();
        }
        
        // Shuffle
        roles.sort(() => Math.random() - 0.5);
        
        playerIds.forEach((pid, idx) => {
            this.players[pid].role = roles[idx];
            this.players[pid].status = 'alive';
        });
        
        this.addLog("JUDGE: Game Starting... Roles assigned.");
        
        const confirmText = VOICE_MESSAGES.GAME_START_CONFIRM;
        this.addLog(`JUDGE: ${confirmText}`);
        this.triggerVoice('GAME_START_CONFIRM');
        
        // Ensure initial state is sent so players can see "Tap to Reveal"
        if(this.onGameUpdate) this.onGameUpdate(this);

        setTimeout(() => {
             this.startNightPhase(1);
        }, 10000); // 10s to check role
    }

    startNightPhase(targetRound) {
        const closeText = VOICE_MESSAGES.NIGHT_START_CLOSE_EYES;
        this.triggerVoice('NIGHT_START_CLOSE_EYES');
        this.addLog(`JUDGE: ${closeText}`);
        
        setTimeout(() => {
            this.round = targetRound;
            this.advancePhase(PHASES.NIGHT_WOLVES);
        }, 4000); // 4s for closing eyes effect
    }

    // --- Phase Transition ---

    advancePhase(newPhase) {
        this.phase = newPhase;
        this.logs.push(`--- PHASE: ${newPhase} ---`); 
        
        // Voice Triggers
        this.triggerVoice(newPhase);

        switch (this.phase) {
            case PHASES.NIGHT_WOLVES:
                this.addLog("JUDGE: Night falls. Wolves, please wake up and hunt.");
                this.nightManager.resetNight();
                break;
            case PHASES.NIGHT_WITCH:
                this.addLog("JUDGE: Wolves have closed their eyes. Witch, please wake up.");
                // Check if Witch exists and is alive
                this.checkActiveRole(ROLES.WITCH, PHASES.NIGHT_SEER);
                break;
            case PHASES.NIGHT_SEER:
                this.addLog("JUDGE: Witch has closed eyes. Seer, please wake up.");
                // Check if Seer exists and is alive
                this.checkActiveRole(ROLES.SEER, () => this.resolveNight());
                break;

            case PHASES.DAY_ANNOUNCE:
                this.applyPendingDeaths();
                break;
            case PHASES.DAY_DISCUSSION:
                this.dayManager.startDiscussion(this);
                break;

            case PHASES.DAY_VOTE:
                this.addLog("JUDGE: Speech over. Please cast your votes now.");
                this.dayManager.resetVotes(); 
                break;

            case PHASES.DAY_LEAVE_SPEECH:
                if (this.executedPlayerId && this.players[this.executedPlayerId]) {
                    this.addLog(`JUDGE: ${String(this.players[this.executedPlayerId].avatar || '0').padStart(2, '0')}号玩家出局，发表遗言。`);
                } else {
                    setTimeout(() => this.startNightOrEnd(), 1000);
                }
                break;
        }

        // Broadcast State Update AFTER all phase side-effects
        if(this.onGameUpdate) this.onGameUpdate(this);
    }

    triggerVoice(phase, overrideText = null) {
        const text = overrideText || VOICE_MESSAGES[phase];
        if (text) {
            this.onVoiceCue(text);
        }
    }

    // --- Action Proxies ---

    resolveNight() {
        const deadIds = this.nightManager.resolve(this);
        this.pendingDeaths = deadIds;
        // Always announce deaths first (User Rule: Day breaks -> Deaths -> Election)
        this.startDayAnnounce();
    }

    startDayAnnounce() {
        this.advancePhase(PHASES.DAY_ANNOUNCE);
    }

    applyPendingDeaths() {
        this.pendingDeaths.forEach(id => {
            if(this.players[id]) this.players[id].status = 'dead';
        });
        
        // 3. ANNOUNCE DEATHS & CHECK FOR LAST WORDS
        let announcement = "";
        let hasDeaths = this.pendingDeaths.length > 0;

        if (hasDeaths) {
             const indices = this.pendingDeaths.map(pid => `${this.players[pid]?.avatar || '?' }号玩家`).join(', ');
             announcement = VOICE_MESSAGES.DEATH_ANNOUNCE(indices);
             this.addLog(`JUDGE: Sun rises. Last night, ${this.pendingDeaths.length} player(s) died.`);
        } else {
             announcement = VOICE_MESSAGES.DEATH_PEACEFUL();
             this.addLog("JUDGE: Sun rises. It was a peaceful night.");
        }
        
        // Broadcast the update (deaths handled)
        this.onGameUpdate(this);

        // CHECK WIN immediately after deaths
        const winResult = this.checkWinCondition();
        if (winResult) {
            this.finishGame(winResult);
            this.pendingDeaths = []; 
            return;
        }

        // TRANSITION
        // Rule: Night Death Last Words ONLY on Round 1
        if (this.round === 1 && hasDeaths) {
            this.executedPlayerId = this.pendingDeaths[0]; // Set focus to first victim for UI
            
            this.phase = PHASES.DAY_LEAVE_SPEECH;
            this.logs.push(`--- PHASE: ${PHASES.DAY_LEAVE_SPEECH} ---`);
            this.onGameUpdate(this);
            
            // Voice: "Please leave last words."
            this.triggerVoice(PHASES.DAY_LEAVE_SPEECH, VOICE_MESSAGES.DEATH_LAST_WORDS(announcement)); 
            
        } else {
            // No last words (Round > 1 OR Peace)
            // Announcement + "Please discuss"
            this.phase = PHASES.DAY_DISCUSSION;
            this.logs.push(`--- PHASE: ${PHASES.DAY_DISCUSSION} ---`);
            this.onGameUpdate(this);
            
            this.triggerVoice(PHASES.DAY_DISCUSSION, VOICE_MESSAGES.NIGHT_DISCUSSION(announcement));
            
            // Actually start discussion timer/manage it
            this.dayManager.startDiscussion(this);
        }
        
        // Clear pending
        this.pendingDeaths = [];
    }
    
    startNightOrEnd() {
        const winResult = this.checkWinCondition();
        if (winResult) {
            this.finishGame(winResult);
        } else {
            setTimeout(() => {
                this.startNightPhase(this.round + 1);
            }, 2000);
        }
    }

    checkWinCondition() {
        // 1. Snapshot counts
        const alive = Object.values(this.players).filter(p => p.status === 'alive');
        
        const wolfCount = alive.filter(p => p.role === ROLES.WOLF).length;
        const goodCount = alive.filter(p => p.role !== ROLES.WOLF).length;
        
        const villagerCount = alive.filter(p => p.role === ROLES.VILLAGER).length;
        // Gods = Good - Villagers (Seer, Witch, Hunter etc)
        const godCount = goodCount - villagerCount;

        const winCondition = this.initialConfig?.winCondition || 'wipeout';

        this.addLog(`DEBUG: Win Check [${winCondition}] - W:${wolfCount} G:${goodCount} (V:${villagerCount}/God:${godCount})`);

        // 2. Villager Win: No Wolves left
        if (wolfCount === 0) return 'VILLAGERS';

        // 3. Wolf Win: Majority (Vote Dominance)
        // If Wolves > Good, they can force any vote during the day.
        // We only check this STRICTLY >. Parity (==) allows game to continue (e.g., 2v2).
        if (wolfCount > goodCount) {
             this.addLog("JUDGE: Wolves have taken control of the village (Majority).");
             return 'WEREWOLVES';
        }

        // 4. Wolf Win: Kill Condition
        if (winCondition === 'side_kill') {
            // Side Victory: Kill ALL Villagers OR Kill ALL Gods
            if (villagerCount === 0 || godCount === 0) {
                 this.addLog(`JUDGE: Wolves have slaughtered a side (${villagerCount===0 ? 'Villagers' : 'Gods'}).`);
                 return 'WEREWOLVES';
            }
        } else {
            // Wipeout (Default): Kill ALL Good players
            if (goodCount === 0) {
                 this.addLog("JUDGE: Wolves have slaughtered everyone.");
                 return 'WEREWOLVES';
            }
        }

        return null;
    }

    finishGame(winner) {
        this.phase = PHASES.FINISHED;
        this.winner = winner;
        const winnerText = winner === 'VILLAGERS' ? 'VILLAGERS (村民)' : 'WEREWOLVES (狼人)';
        this.addLog(`GAME OVER. ${winnerText} WIN! (游戏结束。${winnerText} 胜利！)`);
        
        // Play Winner Voice
        const voiceKey = winner === 'VILLAGERS' ? 'WINNER_VILLAGERS' : 'WINNER_WEREWOLVES';
        this.onVoiceCue(VOICE_MESSAGES[voiceKey]);

        if(this.onGameUpdate) this.onGameUpdate(this);
    }

    handleWolfPropose(playerId, targetId) {
        // Delegate to NightManager
        const changed = this.nightManager.handlePropose(this, playerId, targetId);
        if (changed) {
            this.onGameUpdate(this);
        }
    }

    reset() {
        this.phase = PHASES.WAITING;
        // ... (reset state)
        this.round = 0;
        this.logs = [];
        this.pendingNextPhase = null;
        this.executedPlayerId = null;
        this.pendingDeaths = [];
        
        // Reset Managers
        this.nightManager = new NightManager();
        this.dayManager = new DayManager();
        this.winner = null;
        
        // Reset Players (Keep connections/names, clear roles/status)
        Object.values(this.players).forEach(p => {
            p.role = null;
            p.status = 'alive';
            p.isReady = false; // Require ready again
        });
        
        this.addLog("JUDGE: Game has been reset. Please get ready. (游戏已重置，请准备。)");
    }

    // Handlers delegated to managers
    handleNightAction(playerId, action) {
        return this.nightManager.handleAction(this, playerId, action);
    }
    handleDayVote(playerId, targetId) {
        this.dayManager.handleVote(this, playerId, targetId);
    }

    handleEndSpeech(playerId) {
        this.dayManager.handleEndSpeech(this, playerId);
    }

    checkActiveRole(role, nextAction) {
        const player = Object.values(this.players).find(p => p.role === role);
        const isActive = player && player.status === 'alive';
        
        // If inactive (dead or doesn't exist), wait random time then advance
        if (!isActive) {
            const delay = Math.floor(Math.random() * 10000) + 15000; // 15-25 seconds random delay
            console.log(`[Game] Role ${role} inactive. Fake waiting for ${delay}ms.`);
            setTimeout(() => {
                if (typeof nextAction === 'string') {
                    this.advancePhase(nextAction);
                } else {
                    nextAction();
                }
            }, delay);
        }
    }
}

module.exports = WerewolfGame;
