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
            witchAction: null,
            seerTarget: null,
            seerResult: null // Explicitly field for Seer result
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
            if (action.type === 'save' && !this.witchState.saveUsed) {
                this.actions.witchAction = { type: 'save', targetId: this.actions.wolfTarget };
                this.witchState.saveUsed = true;
            } else if (action.type === 'poison' && !this.witchState.poisonUsed) {
                this.actions.witchAction = { type: 'poison', targetId: action.targetId };
                this.witchState.poisonUsed = true;
            } else if (action.type === 'skip') {
                this.actions.witchAction = { type: 'skip' };
            }

            if (this.actions.witchAction) {
                game.addLog("JUDGE: The Witch has acted.");
                setTimeout(() => game.advancePhase(PHASES.NIGHT_SEER), 1500);
            }
            return true;
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
        const witchAction = this.actions.witchAction;
        const guardTarget = this.actions.guardTarget;

        if (wolfTarget) {
            let actualDeath = wolfTarget;
            const isSaved = witchAction && witchAction.type === 'save' && witchAction.targetId === wolfTarget;
            const isGuarded = guardTarget === wolfTarget;

            if (isSaved && isGuarded) {
                // Tong-shou: Over-protected players still die
                actualDeath = wolfTarget;
            } else if (isSaved || isGuarded) {
                actualDeath = null;
            }

            if (actualDeath) deadIds.push(actualDeath);
        }

        if (witchAction && witchAction.type === 'poison') {
            if (!deadIds.includes(witchAction.targetId)) deadIds.push(witchAction.targetId);
        }

        // Update Guard's long-term memory
        this.guardState.lastTargetId = guardTarget;

        return deadIds;
    }
}

module.exports = NightManager;
