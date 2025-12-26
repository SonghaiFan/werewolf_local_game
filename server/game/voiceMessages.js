const { PHASES } = require('./constants');

const VOICE_MESSAGES = {
    // Phases
    [PHASES.NIGHT_WOLVES]: "狼人请睁眼。",
    [PHASES.NIGHT_WITCH]: "狼人请闭眼。女巫请睁眼。",
    [PHASES.NIGHT_SEER]: "女巫请闭眼。预言家请睁眼。",
    [PHASES.DAY_ANNOUNCE]: "天亮了。所有人都醒过来。",
    [PHASES.DAY_DISCUSSION]: "请开始讨论今天发生的事情。",
    [PHASES.DAY_VOTE]: "讨论结束。请投票放逐玩家。",
    [PHASES.DAY_LEAVE_SPEECH]: "请发表遗言。",

    // Events
    GAME_START_CONFIRM: "请确认身份。你有5秒钟。", 
    GAME_START_CLOSE_EYES: "天黑请闭眼。", 
};

module.exports = VOICE_MESSAGES;
