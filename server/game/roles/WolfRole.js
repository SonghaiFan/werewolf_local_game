const { ROLES, PHASES } = require('../constants');

module.exports = {
    id: ROLES.WOLF,
    side: 'BAD',
    nightPhase: PHASES.NIGHT_WOLVES,
    nightPriority: 10,
    canActAtNight: true,
    getAvailableActions: (game, player) => {
        if (game.phase !== PHASES.NIGHT_WOLVES) return [];
        return [
            { type: 'kill', label: 'kill_target', needsTarget: true }
        ];
    }
};
