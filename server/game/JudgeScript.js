const { PHASES, ROLES } = require("./constants");

const DEFAULT_LOCALE = "zh";

const ROLE_NAMES = {
  zh: {
    [ROLES.GUARD]: "守卫",
    [ROLES.WOLF]: "狼人",
    [ROLES.WITCH]: "女巫",
    [ROLES.SEER]: "预言家",
    [ROLES.HUNTER]: "猎人",
    [ROLES.VILLAGER]: "村民",
  },
  en: {
    [ROLES.GUARD]: "Guard",
    [ROLES.WOLF]: "Werewolf",
    [ROLES.WITCH]: "Witch",
    [ROLES.SEER]: "Seer",
    [ROLES.HUNTER]: "Hunter",
    [ROLES.VILLAGER]: "Villager",
  },
};

const lines = {
  GAME_START_CONFIRM: {
    zh: "请确认身份。",
    en: "Please confirm your role.",
  },
  NIGHT_START_CLOSE_EYES: {
    zh: "天黑请闭眼。",
    en: "Night falls. Please close your eyes.",
  },
  OPEN_EYES: ({ roleName }) => ({
    zh: `${roleName}请睁眼。`,
    en: `${roleName}, open your eyes.`,
  }),
  CLOSE_EYES: ({ roleName }) => ({
    zh: `${roleName}请闭眼。`,
    en: `${roleName}, close your eyes.`,
  }),

  [PHASES.DAY_ANNOUNCE]: {
    zh: "天亮了。所有人请睁眼。",
    en: "Dawn breaks. Everyone wakes up.",
  },
  [PHASES.DAY_DISCUSSION]: {
    zh: "请开始讨论昨晚发生的事情。",
    en: "Discuss what happened last night.",
  },
  [PHASES.DAY_VOTE]: {
    zh: "讨论结束。请投票放逐玩家。",
    en: "Discussion over. Please cast your votes.",
  },
  [PHASES.DAY_PK_SPEECH]: {
    zh: "请PK玩家发表言论。",
    en: "PK players, please speak.",
  },
  [PHASES.DAY_PK_VOTE]: {
    zh: "请再次投票。",
    en: "Please vote again.",
  },
  [PHASES.DAY_LEAVE_SPEECH]: {
    zh: "请发表遗言。",
    en: "Please give your last words.",
  },
  [PHASES.DAY_HUNTER_DECIDE]: {
    zh: "猎人请开枪。",
    en: "Hunter, please shoot.",
  },
  [PHASES.DAY_MAYOR_NOMINATE]: {
    zh: "警长竞选：请选择参选玩家。",
    en: "Mayor election: nominate yourself.",
  },
  [PHASES.DAY_MAYOR_SPEECH]: {
    zh: "警长竞选：上警玩家依次发言。",
    en: "Mayor candidates speak in order.",
  },
  [PHASES.DAY_MAYOR_WITHDRAW]: {
    zh: "警长竞选：如需退选请操作。",
    en: "Mayor election: withdraw if you want.",
  },
  [PHASES.DAY_MAYOR_VOTE]: {
    zh: "警长竞选：请投票。",
    en: "Mayor election: please vote.",
  },
  [PHASES.DAY_MAYOR_PK_SPEECH]: {
    zh: "警长竞选平票，进入PK发言。",
    en: "Mayor tie: PK speeches.",
  },
  [PHASES.DAY_MAYOR_PK_VOTE]: {
    zh: "警长PK投票开始。",
    en: "Mayor PK vote begins.",
  },

  DAY_VOTE_TIE: {
    zh: "平票，进入PK。",
    en: "Tie. Enter PK.",
  },
  DAY_PK_TIE: {
    zh: "再次平票，今天平安。",
    en: "Tie again. No one is exiled today.",
  },
  HUNTER_SHOT: ({ seat }) => ({
    zh: `猎人开枪带走了 ${seat}。`,
    en: `Hunter shot ${seat}.`,
  }),

  DEATH_ANNOUNCE: ({ seats }) => ({
    zh: `昨晚死亡的是 ${seats}。`,
    en: `Died last night: ${seats}.`,
  }),
  DEATH_PEACEFUL: {
    zh: "昨晚是个平安夜。",
    en: "No one died last night.",
  },

  DEATH_LAST_WORDS: ({ announcement }) => ({
    zh: `${announcement} 请发表遗言。`,
    en: `${announcement} Please give last words.`,
  }),
  NIGHT_DISCUSSION: ({ announcement }) => ({
    zh: `${announcement} 请开始讨论昨晚发生的事情。`,
    en: `${announcement} Please start discussing last night.`,
  }),

  BANISH_LEAVE_SPEECH: ({ seat }) => ({
    zh: `${seat}玩家出局，请发表遗言。`,
    en: `${seat} is eliminated. Last words.`,
  }),
  BANISH_GENERIC: ({ seat }) => ({
    zh: `${seat}玩家出局。`,
    en: `${seat} is eliminated.`,
  }),

  NEXT_SPEAKER: ({ seat }) => ({
    zh: `请${seat}发言。`,
    en: `Seat ${seat}, your turn to speak.`,
  }),
  DISCUSSION_START: ({ seat }) => ({
    zh: `讨论开始，${seat}先发言。`,
    en: `Discussion starts. ${seat} speaks first.`,
  }),
  NEXT_LAST_WORDS: ({ seat }) => ({
    zh: `下一位遗言：${seat}。`,
    en: `Next last words: ${seat}.`,
  }),
  SPEECH_END: {
    zh: "发言结束。",
    en: "Speeches complete.",
  },
  LAST_WORDS_END: {
    zh: "遗言结束。",
    en: "Last words complete.",
  },

  VOTES_DETAIL: ({ detail }) => ({
    zh: `投票详情：${detail}`,
    en: `Vote details: ${detail}`,
  }),
  VOTES_NONE: {
    zh: "无人投票。",
    en: "No votes cast.",
  },
  VOTES_TALLYING: {
    zh: "票已收齐，正在结算。",
    en: "Votes collected. Calculating.",
  },
  ENTER_PK: {
    zh: "进入PK环节，候选人依次发言。",
    en: "Entering PK. Candidates speak in order.",
  },
  BANISH_EXECUTE: ({ seat }) => ({
    zh: `投票放逐：${seat}。`,
    en: `Exiled: ${seat}.`,
  }),
  HUNTER_RECONNECT: ({ name }) => ({
    zh: `${name} 重新连接。`,
    en: `${name} reconnected.`,
  }),
  MAYOR_PASS: ({ seat }) => ({
    zh: `${seat} 放弃竞选。`,
    en: `${seat} quits the race.`,
  }),
  MAYOR_NOMINATE: ({ seat }) => ({
    zh: `${seat} 上警竞选警长。`,
    en: `${seat} is running for mayor.`,
  }),
  MAYOR_ELECT: ({ seat }) => ({
    zh: `警长当选：${seat}`,
    en: `Mayor elected: ${seat}`,
  }),
  MAYOR_NONE: {
    zh: "警长竞选无结果，跳过。",
    en: "Mayor election has no result.",
  },

  GAME_OVER: ({ side }) => {
    const zhSide = side === "VILLAGERS" ? "好人阵营" : "狼人阵营";
    const enSide = side === "VILLAGERS" ? "Villagers" : "Werewolves";
    return {
      zh: `游戏结束。${zhSide}胜利。`,
      en: `Game over. ${enSide} win!`,
    };
  },
  GAME_RESET: {
    zh: "游戏已重置，请准备。",
    en: "Game has been reset. Please get ready.",
  },
};

const fallback = (keyOrText) =>
  typeof keyOrText === "string" ? keyOrText : "";

function resolveRoleName(role, locale = DEFAULT_LOCALE) {
  if (!role) return null;
  return (
    ROLE_NAMES[locale]?.[role] ||
    ROLE_NAMES[DEFAULT_LOCALE]?.[role] ||
    String(role)
  );
}

function renderLine(keyOrText, params = {}, locale = DEFAULT_LOCALE) {
  const entry = lines[keyOrText];
  if (!entry) return fallback(keyOrText);

  const roleName =
    params.roleName || resolveRoleName(params.role, locale) || null;
  const enrichedParams = { ...params, roleName };
  const payload =
    typeof entry === "function" ? entry(enrichedParams, locale) : entry;

  const text =
    payload?.[locale] ?? payload?.[DEFAULT_LOCALE] ?? fallback(keyOrText);

  return text;
}

module.exports = {
  DEFAULT_LOCALE,
  ROLE_NAMES,
  lines,
  renderLine,
  resolveRoleName,
};
