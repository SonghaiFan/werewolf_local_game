const { ROLES, PHASES } = require('../constants');

module.exports = {
    id: ROLES.SEER,
    side: 'GOOD',
    nightPhase: PHASES.NIGHT_SEER,
    nightPriority: 30,
    canActAtNight: true,
    getAvailableActions: (game, player) => {
        if (game.phase !== PHASES.NIGHT_SEER) return [];
        return [
            { type: 'check', label: 'check_identity', needsTarget: true }
        ];
    }
};
