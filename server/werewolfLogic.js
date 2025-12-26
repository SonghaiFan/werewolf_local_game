const ROLES = {
    WOLF: 'WOLF',
    VILLAGER: 'VILLAGER',
    SEER: 'SEER',
    WITCH: 'WITCH'
};

const PHASES = {
    WAITING: 'WAITING',
    // Granular Night Phases
    NIGHT_WOLVES: 'NIGHT_WOLVES',
    NIGHT_WITCH: 'NIGHT_WITCH',
    NIGHT_SEER: 'NIGHT_SEER',
    // Election Phases (Day 1)
    DAY_ELECTION_NOMINATION: 'DAY_ELECTION_NOMINATION',
    DAY_ELECTION_VOTE: 'DAY_ELECTION_VOTE',
    // Granular Day Phases
    DAY_ANNOUNCE: 'DAY_ANNOUNCE', // Deaths announced
    DAY_DISCUSSION: 'DAY_DISCUSSION',
    DAY_SHERIFF_SPEECH: 'DAY_SHERIFF_SPEECH', // Sheriff summary logic
    DAY_VOTE: 'DAY_VOTE',
    DAY_ELIMINATION: 'DAY_ELIMINATION', // Post-vote announcement
    DAY_SHERIFF_HANDOVER: 'DAY_SHERIFF_HANDOVER', // Sheriff died
    DAY_LEAVE_SPEECH: 'DAY_LEAVE_SPEECH', // Executed player last words
    FINISHED: 'FINISHED'
};

class WerewolfGame {
    constructor(id, hostId, onVoiceCue) {
        this.id = id;
        this.hostId = hostId;
        this.onVoiceCue = onVoiceCue || (() => {}); // Callback for voice

        this.players = {}; // { status: alive/dead, role, etc }
        this.phase = PHASES.WAITING;
        this.round = 0;
        this.logs = [];
        this.sheriffId = null; // Socket ID of sheriff
        this.pendingNextPhase = null; // Staging for transitions
        this.executedPlayerId = null; // Track who died day
        
        // ... (rest same)
        this.nightActions = {
            wolfTarget: null, // targetId
            wolfVotes: {}, // wolfId -> targetId
            witchSaveUsed: false,
            witchPoisonUsed: false,
            witchAction: null, // { type: 'save'|'poison'|'skip', targetId }
            seerTarget: null, // targetId checked
        };
        // ... (election state same)
        this.election = { candidates: [], votes: {} }; // for sheriff
        
        // ... (day state same)
        this.votes = {}; // for day voting
        this.pendingDeaths = []; // Store calls for night resolution
    }

    // ... (skipped methods)

    getPublicState() {
        // Return sanitized state for everyone
        const publicPlayers = {};
        for(const [pid, p] of Object.entries(this.players)) {
            publicPlayers[pid] = {
                id: p.id,
                name: p.name,
                status: p.status,
                isReady: p.isReady, // Public info
                isSheriff: (pid === this.sheriffId),
                // Hide role if alive, show if dead (maybe? usually standard is hide unless special)
                // For MVP: hide role always.
                isCandidate: this.election.candidates.includes(pid) // Helper
            };
        }
        
        return {
            phase: this.phase,
            round: this.round,
            players: publicPlayers,
            logs: this.logs,
            election: this.election, // expose votes? Maybe just candidates
            hostId: this.hostId // Essential for Voice Judge
        };
    }

    advancePhase(newPhase) {
        this.phase = newPhase;
        this.logs.push(`--- PHASE: ${newPhase} ---`); 
        
        // Voice Triggers
        if (newPhase === PHASES.NIGHT_WOLVES) {
            this.onVoiceCue("It is night. Everyone close your eyes. Wolves, wake up.");
        } else if (newPhase === PHASES.NIGHT_WITCH) {
            this.onVoiceCue("Wolves, close your eyes. Witch, wake up.");
        } else if (newPhase === PHASES.NIGHT_SEER) {
            this.onVoiceCue("Witch, close your eyes. Seer, wake up.");
        } else if (newPhase === PHASES.DAY_ANNOUNCE) {
            // Handled in applyPendingDeaths usually, but reliable here too
             this.onVoiceCue("The sun rises. Everyone wake up.");
        } else if (newPhase === PHASES.DAY_ELECTION_NOMINATION) {
             this.onVoiceCue("Election for Sheriff has started. Candidates, step forward.");
        } else if (newPhase === PHASES.DAY_ELECTION_VOTE) {
             this.onVoiceCue("Speeches over. Please vote for Sheriff.");
        } else if (newPhase === PHASES.DAY_DISCUSSION) {
             this.onVoiceCue("Discuss today's events.");
        } else if (newPhase === PHASES.DAY_SHERIFF_SPEECH) {
             this.onVoiceCue("Sheriff, please summarize.");
        } else if (newPhase === PHASES.DAY_VOTE) {
             this.onVoiceCue("Discussion End. Please vote for elimination.");
        } else if (newPhase === PHASES.DAY_SHERIFF_HANDOVER) {
             this.onVoiceCue("Sheriff has died. Pass the badge.");
        } else if (newPhase === PHASES.DAY_LEAVE_SPEECH) {
             this.onVoiceCue("Please leave your last words.");
        }

        switch (this.phase) {
            // ... (Night Phases same)
            case PHASES.NIGHT_WOLVES:
                this.addLog("JUDGE: Night falls. Wolves, please wake up and hunt.");
                this.resetNightState();
                break;
            case PHASES.NIGHT_WITCH:
                this.addLog("JUDGE: Wolves have closed their eyes. Witch, please wake up.");
                if (this.isRoleDead(ROLES.WITCH) || (this.nightActions.witchSaveUsed && this.nightActions.witchPoisonUsed)) {
                     setTimeout(() => this.advancePhase(PHASES.NIGHT_SEER), 2000);
                     this.addLog("JUDGE: (Witch is inactive/dead/out of potions)...");
                }
                break;
            case PHASES.NIGHT_SEER:
                this.addLog("JUDGE: Witch has closed eyes. Seer, please wake up.");
                if (this.isRoleDead(ROLES.SEER)) {
                     setTimeout(() => this.resolveNight(), 2000);
                     this.addLog("JUDGE: (Seer is inactive/dead)...");
                }
                break;
            // ... (Election phases same)
            case PHASES.DAY_ELECTION_NOMINATION:
                this.addLog("JUDGE: It is now time for the Sheriff Election. Please declare if you wish to run.");
                this.electionState = { candidates: [], votes: {} };
                break;
            case PHASES.DAY_ELECTION_VOTE:
                const cIds = this.electionState.candidates;
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
                    const nextPlayer = this.players[pIds[nextIndex]];
                    this.addLog(`JUDGE: Sheriff ${this.players[this.sheriffId].name}, please direct discussion starting from ${nextPlayer.name} (Next Player).`);
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
                this.votes = {}; 
                break;
            case PHASES.DAY_SHERIFF_HANDOVER:
                this.addLog(`JUDGE: Sheriff has died. Please wait for them to handover the badge or tear it.`);
                break;
            case PHASES.DAY_LEAVE_SPEECH:
                if (this.executedPlayerId && this.players[this.executedPlayerId]) {
                    this.addLog(`JUDGE: ${this.players[this.executedPlayerId].name} has been executed. Please leave your last words.`);
                } else {
                    // Should not happen, but safe fallback
                    setTimeout(() => this.startNightOrEnd(), 1000);
                }
                break;
            case PHASES.DAY_ELIMINATION:
                break;
            case PHASES.FINISHED:
                break; 
        }
    }

    // ... (resetNightState, isRoleDead, handleNightAction, resolveNight same)

    resolveNight() {
        let deadIds = [];
        const wolfTarget = this.nightActions.wolfTarget;
        const witchAction = this.nightActions.witchAction;

        if (wolfTarget) {
            let actualDeath = wolfTarget;
            if (witchAction && witchAction.type === 'save' && witchAction.targetId === wolfTarget) {
                actualDeath = null;
            }
            if (actualDeath) deadIds.push(actualDeath);
        }

        if (witchAction && witchAction.type === 'poison') {
            if (!deadIds.includes(witchAction.targetId)) deadIds.push(witchAction.targetId);
        }

        this.pendingDeaths = deadIds;

        if (this.round === 1) {
            this.advancePhase(PHASES.DAY_ELECTION_NOMINATION);
        } else {
            this.startDayAnnounce();
        }
        
        return { deadIds };
    }


    applyPendingDeaths() {
        this.pendingDeaths.forEach(id => {
            if(this.players[id]) this.players[id].status = 'dead';
        });
        
        const deadCount = this.pendingDeaths.length;
        if (deadCount > 0) {
            const names = this.pendingDeaths.map(id => this.players[id].name).join(", ");
            this.addLog(`JUDGE: Sun rises. Last night, ${this.pendingDeaths.length} player(s) died: ${names}.`);
        } else {
            this.addLog("JUDGE: Sun rises. It was a peaceful night.");
        }

        const sheriffDied = this.sheriffId && this.pendingDeaths.includes(this.sheriffId);
        this.pendingDeaths = []; 

        if (sheriffDied) {
            // Night Death -> Handover -> Discussion (Standard Rule)
            this.pendingNextPhase = PHASES.DAY_DISCUSSION; 
            this.advancePhase(PHASES.DAY_SHERIFF_HANDOVER);
        } else {
            setTimeout(() => this.advancePhase(PHASES.DAY_DISCUSSION), 3000); 
        }
    }
    
    // ... (handleSheriffHandover same)
    
    // ... (Election logic same)

    // ... (Day Vote logic same)

    resolveDay() {
        // ... (Tally same)
        const voteCounts = {};
        Object.values(this.votes).forEach(targetId => {
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        });
        Object.keys(voteCounts).forEach(k => voteCounts[k] = 0);
        Object.entries(this.votes).forEach(([voterId, targetId]) => {
             let w = 1;
             if (voterId === this.sheriffId) w = 1.5;
             voteCounts[targetId] += w;
        });

        let maxVotes = 0;
        let candidates = [];
        for (const [id, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) { maxVotes = count; candidates = [id]; }
            else if (count === maxVotes) candidates.push(id);
        }

        this.phase = PHASES.DAY_ELIMINATION;

        let victim = null;
        if (candidates.length === 1) {
            victim = candidates[0];
            this.players[victim].status = 'dead';
            this.executedPlayerId = victim; // Store for last words
            this.addLog(`JUDGE: The village has voted to execute ${this.players[victim].name}.`);
        } else {
            this.executedPlayerId = null;
            this.addLog("JUDGE: Tie vote. No one gets executed today.");
        }

        // Logic branching
        // If victim is Sheriff: Handover -> Leave Speech -> Night/End
        // If victim is Regular: Leave Speech -> Night/End
        // If no victim: Night/End

        if (this.executedPlayerId) {
             const winResult = this.checkWinCondition();
             if (winResult) {
                 // Game Over overrides everything? 
                 // Usually we let them say last words then end.
                 // For MVP, just end.
                 this.phase = PHASES.FINISHED;
                 this.addLog(`GAME OVER. ${winResult} WIN!`);
                 return { winner: winResult };
             }

             if (this.executedPlayerId === this.sheriffId) {
                 this.pendingNextPhase = PHASES.DAY_LEAVE_SPEECH; // Go to speech after handover
                 this.advancePhase(PHASES.DAY_SHERIFF_HANDOVER);
             } else {
                 // Go directly to speech
                 this.advancePhase(PHASES.DAY_LEAVE_SPEECH);
             }
        } else {
             // No death
             setTimeout(() => this.startNightOrEnd(), 2000);
        }
    }
    
    startNightOrEnd() {
        const winResult = this.checkWinCondition();
        if (winResult) {
            this.phase = PHASES.FINISHED;
            this.addLog(`GAME OVER. ${winResult} WIN!`);
        } else {
            // Start Next Night
            setTimeout(() => {
                this.round++;
                this.advancePhase(PHASES.NIGHT_WOLVES);
            }, 3000);
        }
    }

    handleSheriffHandover(playerId, targetId) {
        if (this.phase !== PHASES.DAY_SHERIFF_HANDOVER) return;
        if (playerId !== this.sheriffId) return;

        if (targetId && this.players[targetId]?.status === 'alive') {
            this.sheriffId = targetId;
            this.addLog(`JUDGE: Sheriff Badge has been passed to ${this.players[targetId].name}.`);
        } else {
            this.sheriffId = null;
            this.addLog("JUDGE: The Sheriff Badge has been torn!");
        }

        // Resume
        const next = this.pendingNextPhase;
        this.pendingNextPhase = null;

        if (next) {
            this.advancePhase(next); // Go to pending (Discussion or Leave Speech)
        } else {
            // Fallback (Should typically be set)
            this.startNightOrEnd();
        }
    }

    // ... (skipped standard methods)

    // --- State Machine & Phase Transitions ---

    advancePhase(nextPhase) {
        this.phase = nextPhase;

        switch (this.phase) {
            // ... (Night Phases same)
            case PHASES.NIGHT_WOLVES:
                this.addLog("JUDGE: Night falls. Wolves, please wake up and hunt.");
                this.resetNightState();
                break;
            case PHASES.NIGHT_WITCH:
                this.addLog("JUDGE: Wolves have closed their eyes. Witch, please wake up.");
                if (this.isRoleDead(ROLES.WITCH) || (this.nightActions.witchSaveUsed && this.nightActions.witchPoisonUsed)) {
                     setTimeout(() => this.advancePhase(PHASES.NIGHT_SEER), 2000);
                     this.addLog("JUDGE: (Witch is inactive/dead/out of potions)...");
                }
                break;
            case PHASES.NIGHT_SEER:
                this.addLog("JUDGE: Witch has closed eyes. Seer, please wake up.");
                if (this.isRoleDead(ROLES.SEER)) {
                     setTimeout(() => this.resolveNight(), 2000);
                     this.addLog("JUDGE: (Seer is inactive/dead)...");
                }
                break;
            case PHASES.DAY_ELECTION_NOMINATION:
                this.addLog("JUDGE: It is now time for the Sheriff Election. Please declare if you wish to run.");
                this.electionState = { candidates: [], votes: {} };
                break;
            case PHASES.DAY_ELECTION_VOTE:
                const cIds = this.electionState.candidates;
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
                    const nextPlayer = this.players[pIds[nextIndex]];
                    this.addLog(`JUDGE: Sheriff ${this.players[this.sheriffId].name}, please direct discussion starting from ${nextPlayer.name} (Next Player).`);
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
                this.votes = {}; 
                break;
            case PHASES.DAY_SHERIFF_HANDOVER:
                // Wait for player action
                this.addLog(`JUDGE: Sheriff has died. Please wait for them to handover the badge or tear it.`);
                break;
            case PHASES.DAY_ELIMINATION:
                break;
            case PHASES.FINISHED:
                break; 
        }
    }

    // ... (resetNightState, isRoleDead, handleNightAction same)

    resolveNight() {
        let deadIds = [];
        const wolfTarget = this.nightActions.wolfTarget;
        const witchAction = this.nightActions.witchAction;

        if (wolfTarget) {
            let actualDeath = wolfTarget;
            if (witchAction && witchAction.type === 'save' && witchAction.targetId === wolfTarget) {
                actualDeath = null;
            }
            if (actualDeath) deadIds.push(actualDeath);
        }

        if (witchAction && witchAction.type === 'poison') {
            if (!deadIds.includes(witchAction.targetId)) deadIds.push(witchAction.targetId);
        }

        this.pendingDeaths = deadIds;

        if (this.round === 1) {
            this.advancePhase(PHASES.DAY_ELECTION_NOMINATION);
        } else {
            this.startDayAnnounce();
        }
        
        return { deadIds };
    }

    applyPendingDeaths() {
        // Commit Deaths
        this.pendingDeaths.forEach(id => {
            if(this.players[id]) this.players[id].status = 'dead';
        });
        
        const deadCount = this.pendingDeaths.length;
        if (deadCount > 0) {
            const names = this.pendingDeaths.map(id => this.players[id].name).join(", ");
            this.addLog(`JUDGE: Sun rises. Last night, ${this.pendingDeaths.length} player(s) died: ${names}.`);
        } else {
            this.addLog("JUDGE: Sun rises. It was a peaceful night.");
        }

        // Check Sheriff Death
        const sheriffDied = this.sheriffId && this.pendingDeaths.includes(this.sheriffId);
        this.pendingDeaths = []; // Clear

        if (sheriffDied) {
            this.pendingNextPhase = PHASES.DAY_DISCUSSION; // Resume to discussion after
            this.advancePhase(PHASES.DAY_SHERIFF_HANDOVER);
        } else {
            setTimeout(() => this.advancePhase(PHASES.DAY_DISCUSSION), 3000); 
        }
    }
    
    handleSheriffHandover(playerId, targetId) {
        if (this.phase !== PHASES.DAY_SHERIFF_HANDOVER) return;
        if (playerId !== this.sheriffId) return; // Only dead sheriff acts

        if (targetId) {
            // Check if target is valid
            // Logic allows handing to DEAD player? Usually NO.
            // Logic allows handing to SELF? No.
            if (this.players[targetId] && this.players[targetId].status === 'alive') {
                this.sheriffId = targetId;
                this.addLog(`JUDGE: Sheriff Badge has been passed to ${this.players[targetId].name}.`);
            } else {
                return; // Invalid target
            }
        } else {
            this.sheriffId = null;
            this.addLog("JUDGE: The Sheriff Badge has been torn!");
        }

        // Resume
        const next = this.pendingNextPhase || PHASES.DAY_DISCUSSION; // Default fallback
        this.pendingNextPhase = null;
        setTimeout(() => this.advancePhase(next), 2000);
    }

    // ... (Election logic same)

    // ... (Day Vote logic same)

    resolveDay() {
        // ... (Tally votes logic same)
        const voteCounts = {};
        Object.values(this.votes).forEach(targetId => {
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        });
        Object.keys(voteCounts).forEach(k => voteCounts[k] = 0);
        Object.entries(this.votes).forEach(([voterId, targetId]) => {
             let w = 1;
             if (voterId === this.sheriffId) w = 1.5;
             voteCounts[targetId] += w;
        });

        let maxVotes = 0;
        let candidates = [];
        for (const [id, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) { maxVotes = count; candidates = [id]; }
            else if (count === maxVotes) candidates.push(id);
        }

        this.phase = PHASES.DAY_ELIMINATION;

        let victim = null;
        if (candidates.length === 1) {
            victim = candidates[0];
            this.players[victim].status = 'dead';
            this.addLog(`JUDGE: The village has voted to execute ${this.players[victim].name}.`);
        } else {
            this.addLog("JUDGE: Tie vote. No one gets executed today.");
        }

        // Handover check
        if (victim && victim === this.sheriffId) {
             this.pendingNextPhase = this.checkWinCondition() ? PHASES.FINISHED : PHASES.NIGHT_WOLVES;
           
             this.pendingNextPhase = 'START_NIGHT'; 
             this.advancePhase(PHASES.DAY_SHERIFF_HANDOVER);
             return;
        }

        const winResult = this.checkWinCondition();
        if (winResult) {
            this.phase = PHASES.FINISHED;
            this.addLog(`GAME OVER. ${winResult} WIN!`);
            return { winner: winResult };
        } else {
            // Start Next Night
            setTimeout(() => {
                this.round++;
                this.advancePhase(PHASES.NIGHT_WOLVES);
            }, 5000);
            return null;
        }
    }
    handleSheriffHandover(playerId, targetId) {
        if (this.phase !== PHASES.DAY_SHERIFF_HANDOVER) return;
        if (playerId !== this.sheriffId) return;

        if (targetId && this.players[targetId]?.status === 'alive') {
            this.sheriffId = targetId;
            this.addLog(`JUDGE: Sheriff Badge has been passed to ${this.players[targetId].name}.`);
        } else {
            this.sheriffId = null;
            this.addLog("JUDGE: The Sheriff Badge has been torn!");
        }

        // Resume
        const next = this.pendingNextPhase;
        this.pendingNextPhase = null;

        if (next === PHASES.DAY_DISCUSSION) {
            setTimeout(() => this.advancePhase(PHASES.DAY_DISCUSSION), 2000);
        } else {
            // Assume it was Day Resolution (go to night/win)
            const winResult = this.checkWinCondition();
            if (winResult) {
                this.phase = PHASES.FINISHED;
                this.addLog(`GAME OVER. ${winResult} WIN!`);
            } else {
                setTimeout(() => {
                    this.round++;
                    this.advancePhase(PHASES.NIGHT_WOLVES);
                }, 3000);
            }
        }
    }


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
            isReady: false // Track readiness
        };
        return true;
    }

    handlePlayerReady(playerId) {
        if (this.phase !== PHASES.WAITING) return;
        if (this.players[playerId]) {
            this.players[playerId].isReady = !this.players[playerId].isReady;
        }
    }

    removePlayer(socketId) {
        delete this.players[socketId];
    }

    startGame() {
        if (this.phase !== PHASES.WAITING) return;
        
        // Enforce Readiness
        const allReady = Object.values(this.players).every(p => p.isReady);
        if (!allReady) {
            // Optional: Log/Error? For now just return or log.
            // this.addLog("SYSTEM: Cannot start. Not all players are ready."); 
            // Better to strictly return so UI syncs.
            return;
        }
        
        const playerIds = Object.keys(this.players);
        const count = playerIds.length;
        
        // Role Distribution
        let rolesToDistribute = [];
        if (count < 5) {
            // Testing: 1 Wolf, 1 Seer, Villagers
            rolesToDistribute = [ROLES.WOLF, ROLES.SEER];
            while (rolesToDistribute.length < count) rolesToDistribute.push(ROLES.VILLAGER);
        } else {
            // Standard: 2 Wolves, 1 Seer, 1 Witch, Villagers
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
        this.advancePhase(PHASES.NIGHT_WOLVES); // Start Night Cycle
    }

    // --- State Machine & Phase Transitions ---

    advancePhase(nextPhase) {
        this.phase = nextPhase;

        switch (this.phase) {
            case PHASES.NIGHT_WOLVES:
                this.addLog("JUDGE: Night falls. Wolves, please wake up and hunt.");
                this.resetNightState();
                break;
            case PHASES.NIGHT_WITCH:
                this.addLog("JUDGE: Wolves have closed their eyes. Witch, please wake up.");
                // If witch is dead, we auto-skip in check logic, but here assume valid transition
                if (this.isRoleDead(ROLES.WITCH) || (this.nightActions.witchSaveUsed && this.nightActions.witchPoisonUsed)) {
                     // Auto-skip delay or immediate
                     setTimeout(() => this.advancePhase(PHASES.NIGHT_SEER), 2000);
                     this.addLog("JUDGE: (Witch is inactive/dead/out of potions)...");
                }
                break;
            case PHASES.NIGHT_SEER:
                this.addLog("JUDGE: Witch has closed eyes. Seer, please wake up.");
                if (this.isRoleDead(ROLES.SEER)) {
                     setTimeout(() => this.resolveNight(), 2000);
                     this.addLog("JUDGE: (Seer is inactive/dead)...");
                }
                break;
            case PHASES.DAY_ELECTION_NOMINATION:
                this.addLog("JUDGE: It is now time for the Sheriff Election. Please declare if you wish to run.");
                this.electionState = { candidates: [], votes: {} };
                break;
            case PHASES.DAY_ELECTION_VOTE:
                const cIds = this.electionState.candidates;
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
                // Process Pending Deaths from Night
                this.applyPendingDeaths();
                break;
            case PHASES.DAY_DISCUSSION:
                this.addLog("JUDGE: Discuss who is the suspicion. You have free speech.");
                
                // Sheriff Order Logic
                if (this.sheriffId && this.players[this.sheriffId]?.status === 'alive') {
                    const pIds = Object.keys(this.players); // Order matches insertion usually
                    const sIndex = pIds.indexOf(this.sheriffId);
                    // Simple "Next" logic: (index + 1) % length
                    const nextIndex = (sIndex + 1) % pIds.length;
                    const nextPlayer = this.players[pIds[nextIndex]];
                    
                    this.addLog(`JUDGE: Sheriff ${this.players[this.sheriffId].name}, please direct discussion starting from ${nextPlayer.name} (Next Player).`);
                }
                
                break;
            case PHASES.DAY_SHERIFF_SPEECH:
                if (this.sheriffId && this.players[this.sheriffId]?.status === 'alive') {
                    this.addLog(`JUDGE: Discussion over. Sheriff ${this.players[this.sheriffId].name}, please make your summary speech.`);
                } else {
                    this.addLog("JUDGE: Discussion over. (No Sheriff for summary).");
                    setTimeout(() => this.advancePhase(PHASES.DAY_VOTE), 2000); // Skip if no sheriff
                }
                break;
            case PHASES.DAY_VOTE:
                this.addLog("JUDGE: Speech over. Please cast your votes now.");
                this.votes = {}; // Reset votes
                break;
            case PHASES.DAY_ELIMINATION:
                // Triggered after votes
                break;
            case PHASES.FINISHED:
                break; 
        }
    }

    resetNightState() {
        this.nightActions.wolfVotes = {};
        this.nightActions.wolfTarget = null;
        this.nightActions.witchAction = null; // Reset per night
        this.nightActions.seerTarget = null;
    }

    isRoleDead(role) {
        const p = Object.values(this.players).find(p => p.role === role);
        return !p || p.status !== 'alive';
    }

    // --- Action Handlers ---

    handleNightAction(playerId, action) {
        const player = this.players[playerId];
        if (!player || player.status !== 'alive') return false;

        // WOLVES
        if (this.phase === PHASES.NIGHT_WOLVES && player.role === ROLES.WOLF && action.type === 'kill') {
            // First Act Logic: As soon as a wolf picks, it's locked and we move on.
            this.nightActions.wolfTarget = action.targetId;
            const targetName = this.players[action.targetId]?.name || 'Unknown';
            
            // Log for internal debugging, or publicly? 
            // "Wolves have chosen" is safe.
            // this.addLog(`JUDGE: Wolves have sealed the fate of a player.`);
            
            // Auto-advance immediately
            setTimeout(() => this.advancePhase(PHASES.NIGHT_WITCH), 1000);
            return true;
        }

        // WITCH
        if (this.phase === PHASES.NIGHT_WITCH && player.role === ROLES.WITCH) {
            if (action.type === 'save' && !this.nightActions.witchSaveUsed) {
                this.nightActions.witchAction = { type: 'save', targetId: this.nightActions.wolfTarget };
                this.nightActions.witchSaveUsed = true;
            } else if (action.type === 'poison' && !this.nightActions.witchPoisonUsed) {
                this.nightActions.witchAction = { type: 'poison', targetId: action.targetId };
                this.nightActions.witchPoisonUsed = true;
            } else if (action.type === 'skip') {
                this.nightActions.witchAction = { type: 'skip' };
            }

            if (this.nightActions.witchAction) { // Action committed
                 this.addLog("JUDGE: The Witch has acted.");
                 // AUTO-TRANSITION TO SEER
                 setTimeout(() => this.advancePhase(PHASES.NIGHT_SEER), 1500);
            }
            return true;
        }

        // SEER
        if (this.phase === PHASES.NIGHT_SEER && player.role === ROLES.SEER && action.type === 'check') {
            this.nightActions.seerTarget = action.targetId;
            const target = this.players[action.targetId];
            const result = target ? (target.role === ROLES.WOLF ? 'WOLF' : 'GOOD') : 'UNKNOWN';
            
            this.addLog("JUDGE: The Seer has acted.");
            
            // AUTO-TRANSITION TO DAY (via Resolve)
            setTimeout(() => this.resolveNight(), 1500);

            return result; // Return to socket for private emission
        }

        return false;
    }

    resolveNight() {
        let deadIds = [];
        const wolfTarget = this.nightActions.wolfTarget;
        const witchAction = this.nightActions.witchAction;

        // Apply Kill
        if (wolfTarget) {
            let actualDeath = wolfTarget;
            // Save logic
            if (witchAction && witchAction.type === 'save' && witchAction.targetId === wolfTarget) {
                actualDeath = null;
            }
            if (actualDeath) deadIds.push(actualDeath);
        }

        // Apply Poison
        if (witchAction && witchAction.type === 'poison') {
            if (!deadIds.includes(witchAction.targetId)) deadIds.push(witchAction.targetId);
        }

        // Store pending deaths instead of applying immediately if it's Round 1
        this.pendingDeaths = deadIds;

        // ELECTION CHECK: Day 1
        if (this.round === 1) {
            this.advancePhase(PHASES.DAY_ELECTION_NOMINATION);
        } else {
            this.startDayAnnounce();
        }
        
        return { deadIds };
    }

    startDayAnnounce() {
        this.advancePhase(PHASES.DAY_ANNOUNCE);
    }

    applyPendingDeaths() {
        // Commit Deaths
        this.pendingDeaths.forEach(id => {
            if(this.players[id]) this.players[id].status = 'dead';
        });

        if (this.pendingDeaths.length > 0) {
            const names = this.pendingDeaths.map(id => this.players[id].name).join(", ");
            this.addLog(`JUDGE: Sun rises. Last night, ${this.pendingDeaths.length} player(s) died: ${names}.`);
            
            // Check if Sheriff died?
            if (this.sheriffId && this.pendingDeaths.includes(this.sheriffId)) {
                this.addLog(`JUDGE: The Sheriff has died! (Badge lost in chaos - MVP)`); 
                // In full game: Prompt for handover. MVP: Lose badge or set null.
                this.sheriffId = null; 
            }
        } else {
            this.addLog("JUDGE: Sun rises. It was a peaceful night.");
        }
    }

    async startElection() {
        this.election = {
            candidates: [],
            votes: {},
            participants: [] // Track who has acted (Run or Pass)
        };
        this.pendingNextPhase = PHASES.DAY_ELECTION_VOTE;
        this.advancePhase(PHASES.DAY_ELECTION_NOMINATION);
    }

    handleElectionNominate(playerId) {
        if (this.phase !== PHASES.DAY_ELECTION_NOMINATION) return;
        const p = this.players[playerId];
        if (!p || p.status !== 'alive') return;

        // Add to candidates if not already
        if (!this.election.candidates.includes(playerId)) {
            this.election.candidates.push(playerId);
            this.addLog(`JUDGE: ${p.name} is running for Sheriff.`);
        }
        
        // Mark as participated
        if (!this.election.participants.includes(playerId)) {
            this.election.participants.push(playerId);
        }

        this.checkElectionNominationComplete();
    }

    handleElectionPass(playerId) {
        if (this.phase !== PHASES.DAY_ELECTION_NOMINATION) return;
        const p = this.players[playerId];
        if (!p || p.status !== 'alive') return;

        // If they were running, remove them (toggle logic?) - No, simpler is explicit choices.
        // If they pass, ensure they are NOT in candidates
        this.election.candidates = this.election.candidates.filter(id => id !== playerId);
        
        // Mark as participated
        if (!this.election.participants.includes(playerId)) {
            this.election.participants.push(playerId);
            // Optional log? "X declined to run." No, too chatty.
        }

        this.checkElectionNominationComplete();
    }

    checkElectionNominationComplete() {
        const aliveCount = Object.values(this.players).filter(p => p.status === 'alive').length;
        if (this.election.participants.length >= aliveCount) {
            // All have acted
            if (this.election.candidates.length > 0) {
                this.addLog(`JUDGE: Nominations closed. Candidates: ${this.election.candidates.map(id => this.players[id].name).join(', ')}.`);
                setTimeout(() => this.advancePhase(PHASES.DAY_ELECTION_VOTE), 1000);
            } else {
                this.addLog("JUDGE: No candidates for Sheriff. Election cancelled.");
                // Skip election vote, go straight to discussion
                setTimeout(() => this.advancePhase(PHASES.DAY_DISCUSSION), 2000);
            }
        }
    }

    handleElectionVote(voterId, candidateId) {
        if (this.phase !== PHASES.DAY_ELECTION_VOTE) return;
        // Candidates cannot vote? (Usually they can vote for anyone including themselves, but in some rules not)
        // Standard: Candidates stay on stage, non-candidates vote.
        // If candidate votes, they forfeit? No, usually candidates PK.
        // Let's implement: Candidates CANNOT vote (simple "Jing Xia" rule). Or they can but usually they are the targets.
        // Actually standard: Everyone votes (Candidate votes for self).
        // BUT user prompt imply: "Alert to run" -> "Voting".
        // Let's go with: Only non-candidates vote for candidates.
        
        if (this.electionState.candidates.includes(voterId)) {
             // Candidates usually just defend. We'll simplify: Candidates DON'T vote.
             // Or allow them? Let's allow simple voting.
        }

        this.electionState.votes[voterId] = candidateId;

        // Check if all voters have voted
        // Who acts? Everyone alive.
        const alive = Object.values(this.players).filter(p => p.status === 'alive');
        if (Object.keys(this.electionState.votes).length >= alive.length) { // >= in case of weirdness
             this.resolveElection();
        }
    }

    resolveElection() {
        const counts = {};
        Object.values(this.electionState.votes).forEach(cid => {
            counts[cid] = (counts[cid] || 0) + 1;
        });

        let max = 0;
        let winners = [];
        for (const [cid, c] of Object.entries(counts)) {
            if (c > max) { max = c; winners = [cid]; }
            else if (c === max) winners.push(cid);
        }

        if (winners.length === 1) {
             this.sheriffId = winners[0];
             this.addLog(`JUDGE: Election Results: ${this.players[winners[0]].name} is elected Sheriff!`);
        } else {
             this.addLog("JUDGE: Election TIE. Badge is lost (MVP simplified rule).");
             this.sheriffId = null;
        }

        setTimeout(() => this.startDayAnnounce(), 3000);
    }
    
    // --- Day Handlers ---

    handleDayVote(voterId, targetId) {
        if (this.phase !== PHASES.DAY_VOTE) return;
        
        const player = this.players[voterId];
        if (!player || player.status !== 'alive') return;

        // Toggle vote
        if (this.votes[voterId] === targetId) {
            delete this.votes[voterId];
        } else {
            this.votes[voterId] = targetId;
        }

        // Check if everyone voted
        const alivePlayers = Object.values(this.players).filter(p => p.status === 'alive');
        if (Object.keys(this.votes).length === alivePlayers.length) {
            // All votes cast
            this.addLog("JUDGE: All votes received. Tallying...");
            setTimeout(() => this.resolveDay(), 1500);
        }
    }

    resolveDay() {
        // Tally votes
        const voteCounts = {};
        Object.values(this.votes).forEach(targetId => {
            let weight = 1;
            // Sheriff check
            if (this.sheriffId) {
                 // Who voted for this target?
                 // No, wait, if SHERIFF voted for this target, add +0.5 weight?
                 // Standard: Sheriff vote counts as 1.5 or tie-break.
                 // Let's do simple: Sheriff has 1.5 votes.
            }
            
            // To do weight properly, we need to iterate votes relative to voter
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 1; // Base count
        });
        
        // Retally with weight
        Object.keys(voteCounts).forEach(k => voteCounts[k] = 0); // Clear
        Object.entries(this.votes).forEach(([voterId, targetId]) => {
             let w = 1;
             if (voterId === this.sheriffId) w = 1.5;
             voteCounts[targetId] += w;
        });

        // Find max
        let maxVotes = 0;
        let candidates = [];
        for (const [id, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                candidates = [id];
            } else if (count === maxVotes) {
                candidates.push(id);
            }
        }

        this.phase = PHASES.DAY_ELIMINATION;

        if (candidates.length === 1) {
            const victim = candidates[0];
            this.players[victim].status = 'dead';
            this.addLog(`JUDGE: The village has voted to execute ${this.players[victim].name}.`);
            
            // Handover check
            if (victim === this.sheriffId) {
                 this.addLog(`JUDGE: The Sheriff has been executed!`);
                 this.sheriffId = null; // Lost 
            }
        } else {
            this.addLog("JUDGE: Tie vote. No one gets executed today.");
        }

        const winResult = this.checkWinCondition();
        if (winResult) {
            this.phase = PHASES.FINISHED;
            this.addLog(`GAME OVER. ${winResult} WIN!`);
            return { winner: winResult };
        } else {
            // Start Next Night
            setTimeout(() => {
                this.round++;
                this.advancePhase(PHASES.NIGHT_WOLVES);
            }, 5000);
            return null;
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

    // --- State Serialization ---

    getPublicState() {
        const publicPlayers = {};
        Object.values(this.players).forEach(p => {
            publicPlayers[p.id] = {
                id: p.id,
                name: p.name,
                status: p.status,
                avatar: p.avatar,
                isVoting: !!this.votes[p.id],
                isSheriff: p.id === this.sheriffId,
                isReady: p.isReady
            };
        });

        // Add Candidates Context
        const election = (this.phase === PHASES.DAY_ELECTION_NOMINATION || this.phase === PHASES.DAY_ELECTION_VOTE) 
            ? { candidates: this.electionState.candidates } 
            : null;

        return {
            id: this.id,
            players: publicPlayers,
            phase: this.phase,
            round: this.round,
            logs: this.logs,
            hostId: this.hostId,
            election: election
        };
    }

    getPlayerState(playerId) {
        const publicState = this.getPublicState();
        const me = this.players[playerId];
        
        if (me) {
            let info = { ...me, votes: this.votes };
            
            // Context specific info
            if (me.role === ROLES.WOLF) {
                info.nightTarget = this.nightActions.wolfTarget;
                info.wolfVotes = this.nightActions.wolfVotes; // See allies' votes
            }
            if (me.role === ROLES.WITCH && this.phase === PHASES.NIGHT_WITCH) {
                 // Witch needs to know who is dying to save them
                 info.wolfTarget = this.nightActions.wolfTarget;
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
}

module.exports = { WerewolfGame, ROLES, PHASES };
