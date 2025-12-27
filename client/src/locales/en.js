const en = {
  // --- COMMON / UI ---
  close: "CLOSE",
  error: "ERROR",
  you: "YOU",
  unknown_role: "???",
  back_to_menu: "BACK TO MENU",

  // --- LANDING / LOBBY ---
  enter_name: "ENTER NAME",
  create_new_game: "CREATE NEW GAME",
  or_join_existing: "OR JOIN EXISTING",
  room_id: "ROOM ID",
  join: "JOIN",
  join_with_code: "JOIN WITH CODE",
  scan_to_join: "SCAN TO JOIN",
  show_qr: "SHOW JOIN QR CODE",
  lobby: "LOBBY // WAITING FOR PLAYERS",
  ready_waiting: "READY (WAITING)",
  ready_short: "RDY",
  not_ready_short: "...",
  tap_to_ready: "TAP TO READY",
  click_when_ready: "CLICK WHEN READY",
  waiting_for_others: "WAITING FOR OTHERS...",
  waiting_for_host: "Waiting for host...",
  leave_room: "LEAVE",

  // --- GAME FLOW ---
  start_game: "START GAME",
  game_start: "GAME STARTING",
  night_falls: "NIGHT FALLS",
  close_eyes: "PLEASE CLOSE YOUR EYES",
  wait_turn: "Wait for your turn...",
  please_confirm_identity: "PLEASE CHECK YOUR ROLE",
  discussions_open: "DISCUSSIONS OPEN",
  current_speaker: "CURRENT SPEAKER",
  listening: "LISTENING...",
  end_speech: "END SPEECH",
  judge_speaking: "JUDGE SPEAKING...",
  last_words: "LAST WORDS",
  leaving_words: "{{name}} is leaving last words...",
  execution: "EXECUTION",
  vote_required: "VOTE FOR ELIMINATION",
  confirm_vote: "CONFIRM VOTE",
  voted: "VOTED",
  abstain: "ABSTAIN",
  voting_not_open: "Voting is not open yet!",
  select_vote_target: "Select a player to vote for!",
  game_over: "GAME OVER",
  play_again: "PLAY AGAIN",
  reboot: "REBOOT SYSTEM",
  admin_skip: "(Admin Skip)",

  // --- ROLES & ACTIONS ---
  identity: "IDENTITY",
  identity_good: "GOOD",
  identity_bad: "BAD",
  reveal: "REVEAL",
  analyze: "ANALYZE",
  running: "RUNNING",
  host: "HOST",
  deceased: "DECEASED",
  you_are_dead: "YOU ARE DEAD",
  victim: "VICTIM",
  select_target_first: "Select a target first!",

  // Wolf
  wolf_wake: "WAKE UP. CHOOSE A VICTIM.",
  kill_target: "KILL TARGET",
  wolves_hunting: "Wolves are hunting.",

  // Witch
  witch_wake: "WAKE UP. POTION READY.",
  save_victim: "SAVE VICTIM",
  poison_target: "POISON TARGET",
  do_nothing: "DO NOTHING",
  witch_active: "Witch is active.",
  cannot_save_self: "CANNOT SAVE YOURSELF",
  consumed: "Consumed",
  select_poison_target: "Select a target to poison!",

  // Seer
  seer_wake: "WAKE UP. REVEAL TRUTH.",
  check_identity: "CHECK IDENTITY",
  seer_active: "Seer is active.",

  // Guard
  guard_wake: "WAKE UP. PROTECT A TARGET.",
  protect_target: "PROTECT TARGET",
  guard_active: "Guard is active.",
  cannot_guard_self: "CANNOT GUARD YOURSELF",
  cannot_guard_consecutive: "CANNOT GUARD SAME TARGET TWICE",

  // Hunter
  hunter_wake: "WAKE UP. SHOOT A TARGET.",
  shoot_target: "SHOOT TARGET",
  hunter_active: "Hunter is active.",
  hunter_poisoned_hint:
    "You have been poisoned. Your gun is jammed and you cannot shoot.",

  // Role Names
  roles: {
    WOLF: "WEREWOLF",
    VILLAGER: "VILLAGER",
    SEER: "SEER",
    WITCH: "WITCH",
    GUARD: "GUARD",
    HUNTER: "HUNTER",
    scanned: "SCANNED",
    UNKNOWN: "???",
  },

  // --- SETTINGS ---
  settings: "SETTINGS",
  room: "ROOM",
  round_short: "R",
  wolves: "WOLVES",
  win_condition: "WIN CONDITION",
  side_kill: "SIDE KILL",
  wipeout: "WIPEOUT",
};

export default en;
