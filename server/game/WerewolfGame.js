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
            if (me.role === ROLES.WITCH && this.phase === PHASES.NIGHT_WITCH) {
                 // Only reveal victim if Witch has Antidote (save not used)
                 if (!this.nightManager.witchState.saveUsed) {
                     info.wolfTarget = this.nightManager.actions.wolfTarget;
                 }
                 if (this.nightManager.actions.witchAction) {
                     hasActed = true;
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
        
        // Reveal All if Dead/Finished
        // EXCEPTION: If I am currently executed and giving last words, hide roles until I am done.
        const isMyLastWords = this.phase === PHASES.DAY_LEAVE_SPEECH && this.executedPlayerId === playerId;
        
        if (((me && me.status !== 'alive' && !isMyLastWords) || this.phase === PHASES.FINISHED)) {
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

    addPlayer(socketId, name) {
        if (this.phase !== PHASES.WAITING) return false;
        
        // Find first available seat number (1-based)
        const usedNumbers = new Set(Object.values(this.players).map(p => p.avatar));
        let seatNumber = 1;
        while (usedNumbers.has(seatNumber)) {
            seatNumber++;
        }

        this.players[socketId] = {
            id: socketId,
            name: name,
            role: null,
            status: 'alive',
            avatar: seatNumber, // Use sequential seat number
            isReady: false
        };
        return true;
    }

    removePlayer(socketId) {
        delete this.players[socketId];
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
        // Truncate if overflow (shouldn't happen with above logic but safe)
        while (roles.length > count) roles.pop();
        
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
             const closeText = VOICE_MESSAGES.GAME_START_CLOSE_EYES;
             this.triggerVoice('GAME_START_CLOSE_EYES');
             this.addLog(`JUDGE: ${closeText}`);
             
             setTimeout(() => {
                 this.round = 1;
                 this.advancePhase(PHASES.NIGHT_WOLVES);
             }, 4000); // 4s for closing eyes effect
             
        }, 10000); // 10s to check role
    }

    // --- Phase Transition ---

    advancePhase(newPhase) {
        this.phase = newPhase;
        this.logs.push(`--- PHASE: ${newPhase} ---`); 
        
        // Voice Triggers
        this.triggerVoice(newPhase);

        // Broadcast State Update (for async transitions)
        this.onGameUpdate(this);

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
                    this.addLog(`JUDGE: ${this.players[this.executedPlayerId].name} has been executed. Please leave your last words.`);
                } else {
                    setTimeout(() => this.startNightOrEnd(), 1000);
                }
                break;
        }
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
             const namesCN = this.pendingDeaths.map(pid => this.players[pid]?.name || '未知').join(', ');
             announcement = VOICE_MESSAGES.DEATH_ANNOUNCE(namesCN);
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
                this.round++;
                this.advancePhase(PHASES.NIGHT_WOLVES);
            }, 3000);
        }
    }

    checkWinCondition() {
        const alive = Object.values(this.players).filter(p => p.status === 'alive');
        const wolves = alive.filter(p => p.role === ROLES.WOLF).length;
        const villagers = alive.filter(p => p.role !== ROLES.WOLF).length;

        if (wolves === 0) return 'VILLAGERS';
        if (wolves >= villagers) return 'WEREWOLVES';
        return null;
    }

    finishGame(winner) {
        this.phase = PHASES.FINISHED;
        this.winner = winner;
        const winnerText = winner === 'VILLAGERS' ? 'VILLAGERS (村民)' : 'WEREWOLVES (狼人)';
        this.addLog(`GAME OVER. ${winnerText} WIN! (游戏结束。${winnerText} 胜利！)`);
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
