const { ROLES } = require('./constants');
const WolfRole = require('./roles/WolfRole');
const VillagerRole = require('./roles/VillagerRole');
const SeerRole = require('./roles/SeerRole');
const WitchRole = require('./roles/WitchRole');
const GuardRole = require('./roles/GuardRole');

/**
 * Role Definitions Registry
 * Aggregates all individual role modules.
 */
const ROLE_DEFINITIONS = {
    [ROLES.WOLF]: WolfRole,
    [ROLES.VILLAGER]: VillagerRole,
    [ROLES.SEER]: SeerRole,
    [ROLES.WITCH]: WitchRole,
    [ROLES.GUARD]: GuardRole
};

module.exports = ROLE_DEFINITIONS;
