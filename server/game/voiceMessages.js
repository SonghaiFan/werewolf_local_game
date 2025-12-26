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
    NIGHT_START_CLOSE_EYES: "天黑请闭眼。", 
    
    // Dynamic Constructors
    DEATH_ANNOUNCE: (indices) => `昨晚死亡的是 ${indices}。`,
    DEATH_PEACEFUL: () => "昨晚是个平安夜。",
    
    DEATH_LAST_WORDS: (announcement) => `${announcement} 请发表遗言。`,
    NIGHT_DISCUSSION: (announcement) => `${announcement} 请开始讨论昨晚发生的事情。`,
    
    BANISH_LEAVE_SPEECH: (index) => `${index}号玩家出局，请发表遗言。`,
    BANISH_GENERIC: (index) => `${index}号玩家出局。`,
    
    NEXT_SPEAKER: (index) => `请${index}号玩家发言。`,

    WINNER_VILLAGERS: "游戏结束。好人阵营胜利。",
    WINNER_WEREWOLVES: "游戏结束。狼人阵营胜利。",
};

module.exports = VOICE_MESSAGES;
