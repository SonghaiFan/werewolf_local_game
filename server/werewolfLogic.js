const ROLES = {
    WOLF: 'WOLF',
    VILLAGER: 'VILLAGER',
    SEER: 'SEER',
    WITCH: 'WITCH'
};

const PHASES = {
    WAITING: 'WAITING',
    NIGHT: 'NIGHT',
    DAY: 'DAY',
    FINISHED: 'FINISHED'
};

class WerewolfGame {
    constructor(roomId, hostId) {
        this.id = roomId;
        this.hostId = hostId;
        this.players = {}; // socketId -> { id, name, role, status: 'alive'|'dead'|'spectator', avatar? }
        this.phase = PHASES.WAITING;
        this.round = 0;
        this.logs = []; // Array of strings (public logs)
        
        // Night State
        this.nightActions = {
            wolfTarget: null, // targetId
            witchSaveUsed: false,
            witchPoisonUsed: false,
            witchAction: null, // { type: 'save'|'poison'|'skip', targetId }
            seerTarget: null, // targetId checked
        };

        // Day State
        this.votes = {}; // voterId -> targetId
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
            avatar: Math.floor(Math.random() * 6) + 1 // placeholder for avatar index
        };
        return true;
    }

    removePlayer(socketId) {
        delete this.players[socketId];
    }

    startGame() {
        if (this.phase !== PHASES.WAITING) return;
        
        const playerIds = Object.keys(this.players);
        const count = playerIds.length;
        
        // Simple Role Distribution Logic
        // For < 5 players (Testing): 1 Wolf, 1 Seer, Rest Villagers
        // For >= 5: 2 Wolves, 1 Seer, 1 Witch, Rest Villagers
        let rolesToDistribute = [];
        
        if (count < 5) {
            rolesToDistribute = [ROLES.WOLF, ROLES.SEER];
            while (rolesToDistribute.length < count) rolesToDistribute.push(ROLES.VILLAGER);
        } else {
            rolesToDistribute = [ROLES.WOLF, ROLES.WOLF, ROLES.SEER, ROLES.WITCH];
            while (rolesToDistribute.length < count) rolesToDistribute.push(ROLES.VILLAGER);
        }

        // Shuffle
        rolesToDistribute.sort(() => Math.random() - 0.5);

        playerIds.forEach((id, index) => {
            this.players[id].role = rolesToDistribute[index];
            this.players[id].status = 'alive';
        });

        this.round = 1;
        this.addLog("System initialized. Identities assigned.");
        this.startNight();
    }

    startNight() {
        this.phase = PHASES.NIGHT;
        this.nightActions = {
            wolfTarget: null,
            witchSaveUsed: this.nightActions.witchSaveUsed, // Persist
            witchPoisonUsed: this.nightActions.witchPoisonUsed, // Persist
            witchAction: null,
            seerTarget: null
        };
        this.addLog(`Night Fall // Day ${this.round}. The village sleeps.`);
    }

    handleNightAction(playerId, action) {
        if (this.phase !== PHASES.NIGHT) return false;
        const player = this.players[playerId];
        if (!player || player.status !== 'alive') return false;

        // WOLF ACTION
        if (player.role === ROLES.WOLF && action.type === 'kill') {
            this.nightActions.wolfTarget = action.targetId;
            return true;
        }

        // SEER ACTION
        if (player.role === ROLES.SEER && action.type === 'check') {
            this.nightActions.seerTarget = action.targetId;
            const target = this.players[action.targetId];
            return target ? (target.role === ROLES.WOLF ? 'WOLF' : 'GOOD') : 'UNKNOWN';
        }

        // WITCH ACTION
        if (player.role === ROLES.WITCH) {
            if (action.type === 'save' && !this.nightActions.witchSaveUsed) {
                // Can only save if wolves have targeted someone (in a real game, witch wakes up after wolves)
                // For simple turn-based async, we might let witch preemptively save or accept that she sees the target if we implement strict steps.
                // Simplified: Witch just lock in action. Resolution handles logic.
                // NOTE: Usually witch is told who died. We'll simplify: ID `wolfTarget` is sent to witch if set.
                this.nightActions.witchAction = { type: 'save', targetId: this.nightActions.wolfTarget };
                this.nightActions.witchSaveUsed = true;
                return true;
            }
            if (action.type === 'poison' && !this.nightActions.witchPoisonUsed) {
                this.nightActions.witchAction = { type: 'poison', targetId: action.targetId };
                this.nightActions.witchPoisonUsed = true;
                return true;
            }
            if (action.type === 'skip') {
                this.nightActions.witchAction = { type: 'skip' };
                return true;
            }
        }
        return false;
    }

    // Check if night is over (all active roles acted)
    checkNightEnd() {
        const activePlayers = Object.values(this.players).filter(p => p.status === 'alive');
        const wolves = activePlayers.filter(p => p.role === ROLES.WOLF);
        const seer = activePlayers.find(p => p.role === ROLES.SEER);
        const witch = activePlayers.find(p => p.role === ROLES.WITCH);

        const wolfDone = this.nightActions.wolfTarget !== null; // Strictly needs target for now (or skip if we allow)
        const seerDone = !seer || this.nightActions.seerTarget !== null; 
        // Witch logic is complex: usually waits for wolf. 
        // For this MVP, let's assume if Wolf has acted, Witch "CAN" act.
        // We will trigger a specific "Witch Phase" socket event effectively.
        // Or simplified: We wait for all roles to submit 'action' or 'skip'.
        
        // Simplified Logic: Just check if we have inputs.
        // In a real app, we'd have sub-phases.
        // Let's assume the frontend enforces the wait.
        
        // return wolfDone && seerDone && (witch ? !!this.nightActions.witchAction : true);
        
        // Actually, let's do manual trigger from Host or Auto-resolve when all submitted.
        return false; // let's control via explicit "Next Phase" or wait for count.
    }

    resolveNight() {
        let deadIds = [];
        const wolfTarget = this.nightActions.wolfTarget;
        const witchAction = this.nightActions.witchAction;

        // Wolf Kill
        if (wolfTarget) {
            let actualDeath = wolfTarget;
            // Witch Save
            if (witchAction && witchAction.type === 'save' && witchAction.targetId === wolfTarget) {
                actualDeath = null;
            }
            if (actualDeath) deadIds.push(actualDeath);
        }

        // Witch Poison
        if (witchAction && witchAction.type === 'poison') {
            deadIds.push(witchAction.targetId);
        }

        // Apply Deaths
        deadIds.forEach(id => {
            if(this.players[id]) this.players[id].status = 'dead';
        });

        this.phase = PHASES.DAY;
        this.votes = {};
        
        if (deadIds.length > 0) {
            const names = deadIds.map(id => this.players[id].name).join(", ");
            this.addLog(`Night summary: ${deadIds.length} casualties detected (${names}).`);
        } else {
            this.addLog("Night summary: Safe night. No casualties.");
        }
        
        return { deadIds };
    }

    handleDayVote(voterId, targetId) {
        if (this.phase !== PHASES.DAY) return;
         // Allow changing vote, or toggle.
        if (this.votes[voterId] === targetId) {
            delete this.votes[voterId]; // Toggle off
        } else {
            this.votes[voterId] = targetId;
        }
    }

    resolveDay() {
        // Tally votes
        const voteCounts = {};
        Object.values(this.votes).forEach(targetId => {
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        });

        // Find max
        let maxVotes = 0;
        let candidate = null;
        let tie = false;

        for (const [id, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                candidate = id;
                tie = false;
            } else if (count === maxVotes) {
                tie = true;
            }
        }

        if (candidate && !tie) {
            this.players[candidate].status = 'dead';
            this.addLog(`Voting Result: Player ${this.players[candidate].name} eliminated by popular vote.`);
        } else {
            this.addLog("Voting Result: Tie or no votes. No one eliminated.");
        }

        const winResult = this.checkWinCondition();
        if (winResult) {
            this.phase = PHASES.FINISHED;
            this.addLog(`GAME OVER. Winner: ${winResult}`);
            return { winner: winResult };
        } else {
            this.startNight();
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

    getPublicState() {
        // Hide roles of others
        const publicPlayers = {};
        Object.values(this.players).forEach(p => {
            publicPlayers[p.id] = {
                id: p.id,
                name: p.name,
                status: p.status,
                avatar: p.avatar,
                isVoting: !!this.votes[p.id] // Show IF they voted, maybe not WHO yet? Or just show logic.
            };
        });

        return {
            id: this.id,
            players: publicPlayers,
            phase: this.phase,
            round: this.round,
            logs: this.logs,
            hostId: this.hostId
        };
    }

    getPlayerState(playerId) {
        const publicState = this.getPublicState();
        const me = this.players[playerId];
        
        // Add private info
        if (me) {
            publicState.me = { 
                ...me, 
                votes: this.votes,
                nightTarget: (me.role === ROLES.WOLF) ? this.nightActions.wolfTarget : null,
                // Witch gets to see wolf target only if we decide so, or if she has potion.
                // Seer gets last check result?
            };
        }
        
        // If Wolf, reveal other wolves
        if (me && me.role === ROLES.WOLF) {
             Object.values(this.players).forEach(p => {
                 if (p.role === ROLES.WOLF) {
                     publicState.players[p.id].role = ROLES.WOLF; 
                 }
             });
        }
        
        // If Dead/Spectator, maybe reveal all?
        if (me && me.status !== 'alive') {
             Object.values(this.players).forEach(p => {
                 publicState.players[p.id].role = p.role;
             });
        }

        return publicState;
    }
}

module.exports = { WerewolfGame, ROLES, PHASES };
