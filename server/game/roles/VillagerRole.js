const { ROLES } = require('../constants');

module.exports = {
    id: ROLES.VILLAGER,
    side: 'GOOD',
    canActAtNight: false,
    getAvailableActions: () => []
};
