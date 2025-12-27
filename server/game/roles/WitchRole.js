const { ROLES, PHASES } = require('../constants');

module.exports = {
    id: ROLES.WITCH,
    side: 'GOOD',
    nightPhase: PHASES.NIGHT_WITCH,
    nightPriority: 20,
    canActAtNight: true,
    getAvailableActions: (game, player) => {
        if (game.phase !== PHASES.NIGHT_WITCH) return [];
        const { witchState } = game.nightManager;
        const actions = [];
        
        actions.push({ 
            type: 'save', 
            label: 'save_victim', 
            needsTarget: false, 
            disabled: witchState.saveUsed || !game.nightManager.actions.wolfTarget
        });
        
        actions.push({ 
            type: 'poison', 
            label: 'poison_target', 
            needsTarget: true, 
            disabled: witchState.poisonUsed 
        });

        actions.push({ 
            type: 'skip', 
            label: 'do_nothing', 
            needsTarget: false 
        });

        return actions;
    }
};
