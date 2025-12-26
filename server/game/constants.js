const ROLES = {
    WOLF: 'WOLF',
    VILLAGER: 'VILLAGER',
    SEER: 'SEER',
    WITCH: 'WITCH'
};

const PHASES = {
    WAITING: 'WAITING',
    // Granular Night Phases
    NIGHT_WOLVES: 'NIGHT_WOLVES',
    NIGHT_WITCH: 'NIGHT_WITCH',
    NIGHT_SEER: 'NIGHT_SEER',
    // Election Phases (Day 1)
    DAY_ELECTION_NOMINATION: 'DAY_ELECTION_NOMINATION',
    DAY_ELECTION_VOTE: 'DAY_ELECTION_VOTE',
    // Granular Day Phases
    DAY_ANNOUNCE: 'DAY_ANNOUNCE', // Deaths announced
    DAY_DISCUSSION: 'DAY_DISCUSSION',
    DAY_SHERIFF_SPEECH: 'DAY_SHERIFF_SPEECH', // Sheriff summary logic
    DAY_VOTE: 'DAY_VOTE',
    DAY_ELIMINATION: 'DAY_ELIMINATION', // Post-vote announcement
    DAY_SHERIFF_HANDOVER: 'DAY_SHERIFF_HANDOVER', // Sheriff died
    DAY_LEAVE_SPEECH: 'DAY_LEAVE_SPEECH', // Executed player last words
    FINISHED: 'FINISHED'
};

module.exports = { ROLES, PHASES };
