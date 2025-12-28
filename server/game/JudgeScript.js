const { PHASES, ROLES } = require("./constants");

const ROLE_NAMES = {
  [ROLES.GUARD]: "守卫",
  [ROLES.WOLF]: "狼人",
  [ROLES.WITCH]: "女巫",
  [ROLES.SEER]: "预言家",
  [ROLES.HUNTER]: "猎人",
  [ROLES.VILLAGER]: "村民",
};

// Centralized voice messages configuration
const VOICE_MESSAGES = {
  ROLE_NAMES,

  // Dynamic Night Construction
  OPEN_EYES: (roleName) => `${roleName}请睁眼。`,
  CLOSE_EYES: (roleName) => `${roleName}请闭眼。`,

  [PHASES.DAY_ANNOUNCE]: "天亮了。所有人都醒过来。",
  [PHASES.DAY_DISCUSSION]: "请开始讨论昨晚发生的事情。",
  [PHASES.DAY_VOTE]: "讨论结束。请投票放逐玩家。",
  [PHASES.DAY_PK_SPEECH]: "请PK玩家发表言论。",
  [PHASES.DAY_PK_VOTE]: "请再次投票。",
  [PHASES.DAY_LEAVE_SPEECH]: "请发表遗言。",
  [PHASES.DAY_HUNTER_DECIDE]: "猎人请开枪。",
  [PHASES.DAY_MAYOR_NOMINATE]: "警长竞选：请选择参选玩家。",
  [PHASES.DAY_MAYOR_SPEECH]: "警长竞选：上警玩家依次发言。",
  [PHASES.DAY_MAYOR_WITHDRAW]: "警长竞选：如需退选请操作。",
  [PHASES.DAY_MAYOR_VOTE]: "警长竞选：请投票。",
  [PHASES.DAY_MAYOR_PK_SPEECH]: "警长竞选平票，进入PK发言。",
  [PHASES.DAY_MAYOR_PK_VOTE]: "警长PK投票开始。",

  // Events & Outcomes
  DAY_VOTE_TIE: "平票。进入PK环节。",
  DAY_PK_TIE: "再次平票。今天是平安日。",
  HUNTER_SHOT: (index) => `猎人开枪带走了 ${index} 号玩家。`,

  GAME_START_CONFIRM: "请确认身份。",
  NIGHT_START_CLOSE_EYES: "天黑请闭眼。",

  DEATH_ANNOUNCE: (indices) => `昨晚死亡的是 ${indices}。`,
  DEATH_PEACEFUL: () => "昨晚是个平安夜。",

  DEATH_LAST_WORDS: (announcement) => `${announcement} 请发表遗言。`,
  NIGHT_DISCUSSION: (announcement) =>
    `${announcement} 请开始讨论昨晚发生的事情。`,

  BANISH_LEAVE_SPEECH: (index) => `${index}号玩家出局，请发表遗言。`,
  BANISH_GENERIC: (index) => `${index}号玩家出局。`,

  NEXT_SPEAKER: (index) => `请${index}号玩家发言。`,

  WINNER_VILLAGERS: "游戏结束。好人阵营胜利。",
  WINNER_WEREWOLVES: "游戏结束。狼人阵营胜利。",
};

// Judge log/script lines (non-voice)
const LINES = {
  DISCUSSION_START: (seat) => `讨论开始，${seat}先发言。`,
  NEXT_LAST_WORDS: (seat) => `下一位遗言：${seat}。`,
  NEXT_SPEAKER: (seat) => `轮到${seat}发言。`,
  VOTES_DETAIL: (detail) => `投票详情：${detail}`,
  VOTES_NONE: "无人投票。",
  VOTES_TALLYING: "票已收齐，正在结算。",
  ENTER_PK: "进入PK环节，候选人依次发言。",
  DAY_VOTE_TIE: "平票，进入PK。",
  DAY_PK_TIE: "再次平票，今天平安。",
  BANISH_EXECUTE: (seat) => `投票放逐：${seat}。`,
  HUNTER_RECONNECT: (name) => `${name} 重新连接。`,
  MAYOR_PASS: (seat) => `${seat} 放弃竞选。`,
  MAYOR_NOMINATE: (seat) => `${seat} 上警竞选警长。`,
  MAYOR_ELECT: (seat) => `警长当选：${seat}`,
  MAYOR_NONE: "警长竞选无结果，跳过。",
};

module.exports = { ...VOICE_MESSAGES, LINES };
