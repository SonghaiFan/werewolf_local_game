const { PHASES } = require('./constants');

// Centralized voice messages configuration
const VOICE_MESSAGES = {
    // Phases
    [PHASES.NIGHT_WOLVES]: "狼人请睁眼。",
    [PHASES.NIGHT_WITCH]: "狼人请闭眼。女巫请睁眼。",
    [PHASES.NIGHT_SEER]: "女巫请闭眼。预言家请睁眼。",
    [PHASES.DAY_ANNOUNCE]: "天亮了。所有人都醒过来。",
    [PHASES.DAY_DISCUSSION]: "请开始讨论昨晚发生的事情。",
    [PHASES.DAY_VOTE]: "讨论结束。请投票放逐玩家。",
    DAY_VOTE_TIE: "平票。请重新投票。",
    [PHASES.DAY_LEAVE_SPEECH]: "请发表遗言。",

    // Events
    GAME_START_CONFIRM: "请确认身份。", 
    GAME_START_CLOSE_EYES: "天黑请闭眼。", 
    
    // Dynamic Constructors
    DEATH_ANNOUNCE: (names) => `昨晚死亡的玩家是 ${names}。`,
    DEATH_PEACEFUL: () => "昨晚是个平安夜。",
    
    DEATH_LAST_WORDS: (announcement) => `${announcement} 请昨晚死亡的玩家发表遗言。`,
    NIGHT_DISCUSSION: (announcement) => `${announcement} 请开始讨论昨晚发生的事情。`,
    
    BANISH_LEAVE_SPEECH: (idOrCode) => `${idOrCode}号玩家出局，请${idOrCode}号玩家发表遗言。`,
    BANISH_GENERIC: (idOrCode) => `${idOrCode}号玩家出局。`,
    
    NEXT_SPEAKER: (idOrName) => `请${idOrName}号玩家发言`,
};

module.exports = VOICE_MESSAGES;
