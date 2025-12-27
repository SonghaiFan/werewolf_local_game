const { ROLES, PHASES } = require('../constants');

module.exports = {
    id: ROLES.HUNTER,
    side: 'GOOD',
    canActAtNight: false,
    getAvailableActions: (game, player) => {
        // Hunter only acts in the special death decision phase
        if (game.phase !== PHASES.DAY_HUNTER_DECIDE) return [];
        
        // This player must be the one who is currently "deciding" (the dead hunter)
        if (game.hunterDeadId !== player.id) return [];

        return [
            { 
                type: 'shoot', 
                label: 'shoot_target', 
                needsTarget: true 
            },
            { 
                type: 'skip', 
                label: 'do_nothing', 
                needsTarget: false 
            }
        ];
    }
};
