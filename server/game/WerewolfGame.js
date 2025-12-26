const { ROLES, PHASES } = require('./constants');
const NightManager = require('./managers/NightManager');
const ElectionManager = require('./managers/ElectionManager');
const DayManager = require('./managers/DayManager');

class WerewolfGame {
    constructor(id, hostId, onVoiceCue, onGameUpdate) {
        this.id = id;
        this.hostId = hostId;
        this.onVoiceCue = onVoiceCue || (() => {});
        this.onGameUpdate = onGameUpdate || (() => {});

        this.players = {};
        this.phase = PHASES.WAITING;
        this.round = 0;
        this.logs = [];
        this.sheriffId = null;
        this.pendingNextPhase = null;
        this.executedPlayerId = null;
        this.pendingDeaths = [];

        this.nightManager = new NightManager();
        this.electionManager = new ElectionManager();
        this.dayManager = new DayManager();
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
                isSheriff: (pid === this.sheriffId),
                isVoting: !!this.dayManager.votes[pid]
            };
        }
        
        let electionData = null;
        if (this.phase === PHASES.DAY_ELECTION_NOMINATION || this.phase === PHASES.DAY_ELECTION_VOTE) {
            electionData = { candidates: this.electionManager.candidates };
        }

        return {
            id: this.id,
            phase: this.phase,
            round: this.round,
            players: publicPlayers,
            logs: this.logs,
            election: electionData,
            hostId: this.hostId
        };
    }

    getPlayerState(playerId) {
        const publicState = this.getPublicState();
        const me = this.players[playerId];
        
        if (me) {
            let info = { ...me };
            
            // Add Voting Data
            if (this.phase === PHASES.DAY_VOTE) {
                info.votes = this.dayManager.votes;
            }
            if (this.phase === PHASES.DAY_ELECTION_VOTE) {
                 // Info about election votes if needed? 
                 // Original code exposed election state generally.
            }

            // Context specific info
            if (me.role === ROLES.WOLF) {
                info.nightTarget = this.nightManager.actions.wolfTarget;
                info.wolfVotes = this.nightManager.actions.wolfVotes;
            }
            if (me.role === ROLES.WITCH && this.phase === PHASES.NIGHT_WITCH) {
                 info.wolfTarget = this.nightManager.actions.wolfTarget;
            }
            
            publicState.me = info;
        }

        // Reveal Wolf Allies
        if (me && me.role === ROLES.WOLF) {
             Object.values(this.players).forEach(p => {
                 if (p.role === ROLES.WOLF) {
                     publicState.players[p.id].role = ROLES.WOLF; 
                 }
             });
        }
        
        // Reveal All if Dead/Finished
        if ((me && me.status !== 'alive') || this.phase === PHASES.FINISHED) {
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
        
        this.players[socketId] = {
            id: socketId,
            name: name,
            role: null,
            status: 'alive',
            avatar: Math.floor(Math.random() * 6) + 1,
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

    startGame() {
        if (this.phase !== PHASES.WAITING) return;
        
        const allReady = Object.values(this.players).every(p => p.isReady);
        if (!allReady) return;
        
        const playerIds = Object.keys(this.players);
        const count = playerIds.length;
        
        // Role Distribution
        let rolesToDistribute = [];
        if (count < 5) {
            rolesToDistribute = [ROLES.WOLF, ROLES.SEER];
            while (rolesToDistribute.length < count) rolesToDistribute.push(ROLES.VILLAGER);
        } else {
            rolesToDistribute = [ROLES.WOLF, ROLES.WOLF, ROLES.SEER, ROLES.WITCH];
            while (rolesToDistribute.length < count) rolesToDistribute.push(ROLES.VILLAGER);
        }

        rolesToDistribute.sort(() => Math.random() - 0.5);

        playerIds.forEach((id, index) => {
            this.players[id].role = rolesToDistribute[index];
            this.players[id].status = 'alive';
        });

        this.round = 1;
        this.addLog("SYSTEM: Roles assigned. Game initializing.");
        this.advancePhase(PHASES.NIGHT_WOLVES); 
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
            case PHASES.DAY_ELECTION_NOMINATION:
                this.addLog("JUDGE: It is now time for the Sheriff Election. Please declare if you wish to run.");
                this.electionManager.reset();
                break;
            case PHASES.DAY_ELECTION_VOTE:
                const cIds = this.electionManager.candidates;
                if (cIds.length === 0) {
                     this.addLog("JUDGE: No candidates. Cancelling Election.");
                     setTimeout(() => this.startDayAnnounce(), 2000);
                } else if (cIds.length === 1) {
                     this.sheriffId = cIds[0];
                     this.addLog(`JUDGE: Only one candidate. Player ${this.players[cIds[0]].name} is automatically the Sheriff!`);
                     setTimeout(() => this.startDayAnnounce(), 3000);
                } else {
                     const names = cIds.map(id => this.players[id].name).join(", ");
                     this.addLog(`JUDGE: Candidates are: ${names}. Voters, please cast your vote.`);
                }
                break;
            case PHASES.DAY_ANNOUNCE:
                this.applyPendingDeaths();
                break;
            case PHASES.DAY_DISCUSSION:
                this.addLog("JUDGE: Discuss who is the suspicion. You have free speech.");
                if (this.sheriffId && this.players[this.sheriffId]?.status === 'alive') {
                    const pIds = Object.keys(this.players);
                    const sIndex = pIds.indexOf(this.sheriffId);
                    const nextIndex = (sIndex + 1) % pIds.length;
                    this.addLog(`JUDGE: Sheriff ${this.players[this.sheriffId].name}, please direct discussion starting from ${this.players[pIds[nextIndex]].name}.`);
                }
                break;
            case PHASES.DAY_SHERIFF_SPEECH:
                if (this.sheriffId && this.players[this.sheriffId]?.status === 'alive') {
                    this.addLog(`JUDGE: Discussion over. Sheriff ${this.players[this.sheriffId].name}, please make your summary speech.`);
                } else {
                    this.addLog("JUDGE: Discussion over. (No Sheriff for summary).");
                    setTimeout(() => this.advancePhase(PHASES.DAY_VOTE), 2000);
                }
                break;
            case PHASES.DAY_VOTE:
                this.addLog("JUDGE: Speech over. Please cast your votes now.");
                this.dayManager.resetVotes(); 
                break;
            case PHASES.DAY_SHERIFF_HANDOVER:
                this.addLog(`JUDGE: Sheriff has died. Please wait for them to handover the badge or tear it.`);
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

    triggerVoice(phase) {
        let text = "";
        if (phase === PHASES.NIGHT_WOLVES) text = "It is night. Everyone close your eyes. Wolves, wake up.";
        else if (phase === PHASES.NIGHT_WITCH) text = "Wolves, close your eyes. Witch, wake up.";
        else if (phase === PHASES.NIGHT_SEER) text = "Witch, close your eyes. Seer, wake up.";
        else if (phase === PHASES.DAY_ANNOUNCE) text = "The sun rises. Everyone wake up.";
        else if (phase === PHASES.DAY_ELECTION_NOMINATION) text = "Election for Sheriff has started. Candidates, step forward.";
        else if (phase === PHASES.DAY_ELECTION_VOTE) text = "Speeches over. Please vote for Sheriff.";
        else if (phase === PHASES.DAY_DISCUSSION) text = "Discuss today's events.";
        else if (phase === PHASES.DAY_SHERIFF_SPEECH) text = "Sheriff, please summarize.";
        else if (phase === PHASES.DAY_VOTE) text = "Discussion End. Please vote for elimination.";
        else if (phase === PHASES.DAY_SHERIFF_HANDOVER) text = "Sheriff has died. Pass the badge.";
        else if (phase === PHASES.DAY_LEAVE_SPEECH) text = "Please leave your last words.";
        
        if(text) this.onVoiceCue(text);
    }

    // --- Action Proxies ---

    resolveNight() {
        const deadIds = this.nightManager.resolve(this);
        this.pendingDeaths = deadIds;
        if (this.round === 1) {
            this.advancePhase(PHASES.DAY_ELECTION_NOMINATION);
        } else {
            this.startDayAnnounce();
        }
    }

    startDayAnnounce() {
        this.advancePhase(PHASES.DAY_ANNOUNCE);
    }

    applyPendingDeaths() {
        this.pendingDeaths.forEach(id => {
            if(this.players[id]) this.players[id].status = 'dead';
        });
        
        if (this.pendingDeaths.length > 0) {
            const names = this.pendingDeaths.map(id => this.players[id].name).join(", ");
            this.addLog(`JUDGE: Sun rises. Last night, ${this.pendingDeaths.length} player(s) died: ${names}.`);
            
            if (this.sheriffId && this.pendingDeaths.includes(this.sheriffId)) {
                // Night Death -> Handover -> Discussion
                this.pendingNextPhase = PHASES.DAY_DISCUSSION; 
                this.advancePhase(PHASES.DAY_SHERIFF_HANDOVER);
                // Note: pendingDeaths cleared after this block? No, just clear now.
            } else {
                 setTimeout(() => this.advancePhase(PHASES.DAY_DISCUSSION), 3000); 
            }
        } else {
            this.addLog("JUDGE: Sun rises. It was a peaceful night.");
            setTimeout(() => this.advancePhase(PHASES.DAY_DISCUSSION), 3000); 
        }
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
        this.addLog(`GAME OVER. ${winner} WIN!`);
    }

    // Handlers delegated to managers
    handleNightAction(playerId, action) {
        return this.nightManager.handleAction(this, playerId, action);
    }
    handleElectionNominate(playerId) {
        this.electionManager.handleNominate(this, playerId);
    }
    handleElectionPass(playerId) {
        this.electionManager.handlePass(this, playerId);
    }
    handleElectionVote(playerId, targetId) {
        this.electionManager.handleVote(this, playerId, targetId);
    }
    handleDayVote(playerId, targetId) {
        this.dayManager.handleVote(this, playerId, targetId);
    }
    handleSheriffHandover(playerId, targetId) {
        this.dayManager.handleSheriffHandover(this, playerId, targetId);
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
