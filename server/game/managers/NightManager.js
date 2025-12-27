const { ROLES, PHASES } = require('../constants');

class NightManager {
    constructor() {
        // Game-long state
        this.witchState = {
            saveUsed: false,
            poisonUsed: false
        };
        this.guardState = {
            lastTargetId: null
        };
        // Nightly state
        this.resetNight();
    }

    resetNight() {
        this.actions = {
            guardTarget: undefined,
            wolfTarget: null,
            wolfVotes: {},
            witchActions: { save: false, poison: null }, // Changed structure
            seerTarget: null,
            seerResult: null,
            poisonedId: null, 
            wolfKillId: null
        };
    }

    handleAction(game, playerId, action) {
        const player = game.players[playerId];
        if (!player || player.status !== 'alive') return false;

        // GUARD
        if (game.phase === PHASES.NIGHT_GUARD && player.role === ROLES.GUARD) {
            if (action.type === 'protect') {
                // Server-side validation
                if (action.targetId === playerId || action.targetId === this.guardState.lastTargetId) {
                    console.log(`[NightManager] Guard tried to protect invalid target: ${action.targetId}`);
                    return false; 
                }
                this.actions.guardTarget = action.targetId;
            } else if (action.type === 'skip') {
                this.actions.guardTarget = null;
            }
            
            game.addLog("JUDGE: The Guard has acted.");
            setTimeout(() => game.advancePhase(PHASES.NIGHT_WOLVES), 1000);
            return true;
        }

        // WOLVES
        if (game.phase === PHASES.NIGHT_WOLVES && player.role === ROLES.WOLF && action.type === 'kill') {
            this.actions.wolfTarget = action.targetId;
            // Auto-advance
            setTimeout(() => game.advancePhase(PHASES.NIGHT_WITCH), 1000);
            return true;
        }

        // WITCH
        if (game.phase === PHASES.NIGHT_WITCH && player.role === ROLES.WITCH) {
            // Ensure initialization
            if (!this.actions.witchActions) this.actions.witchActions = { save: false, poison: null };

            if (action.type === 'save' && !this.witchState.saveUsed) {
                // Self-save restriction logic (Double check backend)
                // Rule: Cannot save self on night > 1
                if (game.round > 1 && this.actions.wolfTarget === playerId) {
                     console.log("[Witch] Attempted self-save > Round 1. Blocked.");
                     return false;
                }
                
                this.actions.witchActions.save = true;
                this.witchState.saveUsed = true;
                
            } else if (action.type === 'poison' && !this.witchState.poisonUsed) {
                this.actions.witchActions.poison = action.targetId;
                this.witchState.poisonUsed = true;
                
            } else if (action.type === 'skip') {
                // "Skip" button acts as "Confirm/Done"
                game.addLog("JUDGE: The Witch has acted.");
                setTimeout(() => game.advancePhase(PHASES.NIGHT_SEER), 1000);
            }
            return true; // Updates state, triggers onGameUpdate, but waits for 'skip' to advance
        }

        // SEER
        if (game.phase === PHASES.NIGHT_SEER && player.role === ROLES.SEER && action.type === 'check') {
            this.actions.seerTarget = action.targetId;
            const target = game.players[action.targetId];
            // Format result clearly: 'WOLF' or 'GOOD'
            const result = target ? (target.role === ROLES.WOLF ? 'WOLF' : 'GOOD') : 'UNKNOWN';
            
            this.actions.seerResult = { targetId: action.targetId, status: result };
            
            // Should return object for server handling
            // NOTE: 'status' is local internal logic, but server expects 'role' in emission
            game.addLog("JUDGE: The Seer has acted.");
            setTimeout(() => game.resolveNight(), 1500);
            return { targetId: action.targetId, role: result }; // result is 'WOLF' or 'GOOD'
        }

        return false;
    }

    handlePropose(game, playerId, targetId) {
        const player = game.players[playerId];
        if (!player || player.status !== 'alive' || player.role !== ROLES.WOLF) return false;
        if (game.phase !== PHASES.NIGHT_WOLVES) return false;

        // Toggle or Set
        if (this.actions.wolfVotes[playerId] === targetId) {
            delete this.actions.wolfVotes[playerId];
        } else {
            this.actions.wolfVotes[playerId] = targetId;
        }
        return true;
    }

    resolve(game) {
        let deadIds = [];
        const wolfTarget = this.actions.wolfTarget;
        const witchActions = this.actions.witchActions || { save: false, poison: null };
        const guardTarget = this.actions.guardTarget;

        if (wolfTarget) {
            let actualDeath = wolfTarget;
            const isSaved = witchActions.save;
            const isGuarded = guardTarget === wolfTarget;

            if (isSaved && isGuarded) {
                // Tong-shou: Over-protected players still die
                actualDeath = wolfTarget;
            } else if (isSaved || isGuarded) {
                actualDeath = null;
            }

            if (actualDeath) {
                deadIds.push(actualDeath);
                this.actions.wolfKillId = actualDeath;
            }
        }

        if (witchActions.poison) {
            const poisonId = witchActions.poison;
            if (!deadIds.includes(poisonId)) {
                deadIds.push(poisonId);
            }
            this.actions.poisonedId = poisonId; // Critical for Hunter logic
        }

        // Update Guard's long-term memory
        this.guardState.lastTargetId = guardTarget;

        return { 
            deadIds, 
            poisonedId: this.actions.poisonedId,
            wolfKillId: this.actions.wolfKillId
        };
    }
}

module.exports = NightManager;
