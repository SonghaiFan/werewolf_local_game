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
        const disabledReasons = {};
        
        // Rule: Cannot protect the same person twice in a row
        if (lastTargetId) {
            disabledTargets.push(lastTargetId);
            disabledReasons[lastTargetId] = 'cannot_guard_consecutive';
        }
        
        // Rule: Generally cannot protect self (as per user request)
        disabledTargets.push(player.id);
        disabledReasons[player.id] = 'cannot_guard_self';
        
        return [
            { 
                type: 'protect', 
                label: 'protect_target', 
                needsTarget: true,
                disabledTargets: disabledTargets,
                disabledReasons: disabledReasons
            },
            { 
                type: 'skip', 
                label: 'do_nothing', 
                needsTarget: false 
            }
        ];
    }
};
