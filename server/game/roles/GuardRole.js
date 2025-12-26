const { ROLES, PHASES } = require('../constants');

module.exports = {
    id: ROLES.GUARD,
    side: 'GOOD',
    nightPhase: PHASES.NIGHT_GUARD,
    nightPriority: 5,
    canActAtNight: true,
    getAvailableActions: (game, player) => {
        if (game.phase !== PHASES.NIGHT_GUARD) return [];
        
        const lastTargetId = game.nightManager.guardState.lastTargetId;
        const disabledTargets = [];
        
        // Rule: Cannot protect the same person twice in a row
        if (lastTargetId) disabledTargets.push(lastTargetId);
        
        // Rule: Generally cannot protect self (as per user request)
        disabledTargets.push(player.id);
        
        return [
            { 
                type: 'protect', 
                label: 'protect_target', 
                needsTarget: true,
                disabledTargets: disabledTargets
            },
            { 
                type: 'skip', 
                label: 'do_nothing', 
                needsTarget: false 
            }
        ];
    }
};
