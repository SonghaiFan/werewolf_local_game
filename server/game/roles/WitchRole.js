const { ROLES, PHASES } = require('../constants');

module.exports = {
    id: ROLES.WITCH,
    side: 'GOOD',
    nightPhase: PHASES.NIGHT_WITCH,
    nightPriority: 20,
    canActAtNight: true,
    getAvailableActions: (game, player) => {
        if (game.phase !== PHASES.NIGHT_WITCH) return [];
        const { witchState, actions: nightActions } = game.nightManager;
        const currentWitchActions = nightActions.witchActions || {};
        const actions = [];
        
        // Rule: Cannot save self after Night 1
        const isSelfSave = game.round > 1 && nightActions.wolfTarget === player.id;
        
        actions.push({ 
            type: 'save', 
            label: 'save_victim', 
            needsTarget: false, 
            disabled: witchState.saveUsed || currentWitchActions.save || !nightActions.wolfTarget || isSelfSave
        });
        
        actions.push({ 
            type: 'poison', 
            label: 'poison_target', 
            needsTarget: true, 
            disabled: witchState.poisonUsed || !!currentWitchActions.poison
        });

        actions.push({ 
            type: 'skip', 
            label: 'do_nothing', 
            needsTarget: false 
        });

        return actions;
    }
};
