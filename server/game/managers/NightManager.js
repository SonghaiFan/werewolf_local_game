const { ROLES, PHASES } = require('../constants');

class NightManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.actions = {
            wolfTarget: null,
            wolfVotes: {}, // wolfId -> targetId
            witchSaveUsed: this.actions ? this.actions.witchSaveUsed : false, // Persist across nights? No, usage persists
            witchPoisonUsed: this.actions ? this.actions.witchPoisonUsed : false,
            witchAction: null, // { type: 'save'|'poison'|'skip', targetId }
            seerTarget: null,
        };
        // Fix: witch usage should persist game-long, but actions reset nightly.
        // We'll handle persistence by checking if we are constructing fresh or resetting.
        // Actually best to store "Used" flags separately or handle carefully.
        // Let's rely on the Game to persist the "Used" flags or store them here permanently?
        // In original code: `this.nightActions = { ... witchSaveUsed: false ... }` in constructor.
        // Then in `resetNightState`, it resets `wolfVotes`, `wolfTarget`, `witchAction`.
        // It does NOT reset `witchSaveUsed`.
        
        // So we need distinct state for "Round State" vs "Game State".
        // Let's store Game State properties on the instance, and Round State in a resetable object.
        
        if (!this.witchState) {
            this.witchState = {
                saveUsed: false,
                poisonUsed: false
            };
        }
    }

    resetNight() {
        this.actions = {
            wolfTarget: null,
            wolfVotes: {},
            witchAction: null,
            seerTarget: null
        };
    }

    handleAction(game, playerId, action) {
        const player = game.players[playerId];
        if (!player || player.status !== 'alive') return false;

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
            const result = target ? (target.role === ROLES.WOLF ? 'WOLF' : 'GOOD') : 'UNKNOWN';
            
            game.addLog("JUDGE: The Seer has acted.");
            setTimeout(() => game.resolveNight(), 1500);
            return result;
        }

        return false;
    }

    resolve(game) {
        let deadIds = [];
        const wolfTarget = this.actions.wolfTarget;
        const witchAction = this.actions.witchAction;

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

        return deadIds;
    }
}

module.exports = NightManager;
