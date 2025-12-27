const zh = {
  // --- 基础 UI / COMMON ---
  close: "关闭",
  error: "错误",
  you: "你",
  unknown_role: "???",
  back_to_menu: "返回主菜单",

  // --- 登录 / 大厅 / LANDING & LOBBY ---
  enter_name: "输入昵称",
  create_new_game: "创建新游戏",
  or_join_existing: "或 加入现有房间",
  room_id: "房间号",
  join: "加入",
  join_with_code: "使用房间号加入",
  scan_to_join: "扫码加入",
  show_qr: "显示加入二维码",
  lobby: "大厅 // 等待玩家",
  ready_waiting: "已准备",
  ready_short: "备",
  not_ready_short: "...",
  tap_to_ready: "点击准备",
  click_when_ready: "点击准备",
  waiting_for_others: "等待其他玩家...",
  waiting_for_host: "等待房主...",
  leave_room: "离开",

  // --- 游戏流程 / GAME FLOW ---
  start_game: "开始游戏",
  game_start: "游戏开始",
  night_falls: "入夜",
  close_eyes: "请闭眼",
  wait_turn: "请等待...",
  please_confirm_identity: "请确认身份",
  discussions_open: "讨论",
  current_speaker: "当前发言",
  listening: "聆听中...",
  end_speech: "结束发言",
  judge_speaking: "法官发言中...",
  last_words: "遗言",
  leaving_words: "{{name}} 发表遗言中...",
  execution: "处决",
  vote_required: "投票",
  confirm_vote: "确认投票",
  voted: "已投",
  abstain: "弃票",
  voting_not_open: "投票未开启！",
  select_vote_target: "请选择投票对象！",
  game_over: "游戏结束",
  play_again: "再来一局",
  reboot: "重启系统",
  admin_skip: "(管理员跳过)",

  // --- 身份与行动 / ROLES & ACTIONS ---
  identity: "身份代号",
  identity_good: "好人",
  identity_bad: "狼人",
  reveal: "查看",
  analyze: "查验",
  running: "竞选",
  host: "房主",
  deceased: "已阵亡",
  you_are_dead: "你已死亡",
  victim: "濒死",
  select_target_first: "请先选择目标！",

  // 狼人 / Wolf
  wolf_wake: "狼人请睁眼。选择击杀目标。",
  kill_target: "击杀目标",
  wolves_hunting: "狼人正在行动。",

  // 女巫 / Witch
  witch_wake: "女巫请睁眼。药水已备。",
  save_victim: "救活目标",
  poison_target: "毒杀目标",
  do_nothing: "过",
  witch_active: "女巫正在行动。",
  cannot_save_self: "无法自救",
  consumed: "已消耗",
  select_poison_target: "请选择毒药目标！",

  // 预言家 / Seer
  seer_wake: "预言家请睁眼。揭示真相。",
  check_identity: "查验身份",
  seer_active: "预言家正在行动。",

  // 守卫 / Guard
  guard_wake: "守卫请睁眼。选择守护目标。",
  protect_target: "守护目标",
  guard_active: "守卫正在行动。",
  cannot_guard_self: "无法自守",
  cannot_guard_consecutive: "无法连续守护同一人",

  // 猎人 / Hunter
  hunter_wake: "猎人请开枪。选择带走目标。",
  shoot_target: "开枪射击",
  hunter_active: "猎人正在行动。",
  hunter_poisoned_hint: "你已被女巫毒杀，法力受限，无法开枪。",

  // 角色名称 / Role Names
  roles: {
    WOLF: "狼人",
    VILLAGER: "村民",
    SEER: "预言家",
    WITCH: "女巫",
    GUARD: "守卫",
    HUNTER: "猎人",
    scanned: "已扫描",
    UNKNOWN: "???",
  },

  // --- 设置 / SETTINGS ---
  settings: "游戏设置",
  room: "房间",
  round_short: "轮",
  wolves: "狼人数量",
  win_condition: "胜利条件",
  side_kill: "屠边",
  wipeout: "屠城",
};

export default zh;
