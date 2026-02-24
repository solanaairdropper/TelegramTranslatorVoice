// All user-facing UI strings — English defaults.
// Keys are used as cache/lookup IDs. Values are the English text.
// {placeholders} are replaced at render time via t().

export const UI_STRINGS = {
  // ── Button Labels ──
  btn_confirm: '\u2705 Confirm',
  btn_change: '\u270F\uFE0F Change',
  btn_resume: '\u{1F4AC} Resume',
  btn_end: '\u{1F6D1} End',
  btn_copy_link: '\u{1F4CB} Copy Link',
  btn_cancel: '\u274C Cancel',
  btn_start_chat: '\u{1F4AC} Start Chat',
  btn_join_chat: '\u{1F517} Join Chat',
  btn_settings: '\u2699\uFE0F Settings',
  btn_enter_code: '\u{1F522} Enter Code',
  btn_back: '\u2190 Back',
  btn_join: '\u2705 Join',
  btn_original: 'Original',
  btn_literal: 'Literal',
  btn_clarify: 'Clarify',
  btn_condense: 'Condense',
  btn_expand: 'Expand',
  btn_tone: 'Tone',
  btn_close: '\u2716 Close',
  btn_delete_history: '\u{1F5D1} Delete',
  btn_keep: '\u{1F4BE} Keep',
  btn_language: '\u{1F30D} Language',
  btn_dialect: '\u{1F3AD} Dialect',
  btn_standard: 'Standard',

  // ── Onboarding ──
  msg_greeting: 'Hey {name}! What language do you type and speak in?',
  msg_dialect_pick: 'Dialect of {lang}?',
  msg_lang_confirm: '<b>{lang}</b> \u2014 you\u2019ll type and read in {langName}.\nYour partner sees everything in <i>their</i> language.',
  msg_pick_language: 'Pick your language:',

  // ── Home Card ──
  card_active_chat: '\u{1F7E2} Active chat with <b>{name}</b>',
  card_waiting_code: '\u{1F7E1} Waiting \u00B7 code: <code>{code}</code>',
  card_no_chats: '<i>No active chats</i>',
  card_waiting_partner: '\u{1F7E1} <b>Waiting for partner</b>',
  card_code: 'Code: <code>{code}</code>',
  card_share_link: 'Share this link:',

  // ── Returning User ──
  msg_welcome_back: 'Welcome back, <b>{name}</b>!',
  msg_last_partner: 'Last talked with <b>{name}</b>.',
  msg_still_using: 'Still using <b>{lang}</b>?',

  // ── Session Join ──
  msg_invite_expired: 'This invite link has expired or is no longer valid.',
  msg_own_session: 'You can\'t join your own chat session!',
  msg_join_title: '\u{1F517} <b>Join Chat with {name}?</b>',
  msg_their_lang: 'Their language: <b>{lang}</b>',
  msg_your_lang: 'Your language: <b>{lang}</b>',
  msg_you_type_in: 'You will type in {yourLang} and they will read it in {theirLang}.',
  msg_they_type_in: 'They will type in {theirLang} and you will read it in {yourLang}.',
  msg_no_sessions: 'No chats are currently waiting for someone to join.\n\nYou can enter a code if someone shared one with you, or go back.',
  msg_available_chats: '\u{1F4AC} <b>Available Chats</b>\n\nSelect a chat to join:',
  msg_enter_code: '\u{1F522} <b>Enter the 4-digit code</b> shared with you:',
  msg_invalid_code: 'Invalid code or session no longer available. Please try again or go back.',

  // ── Chat ──
  msg_not_in_chat: 'You\'re not in an active chat. Use /menu to start or join one.',
  msg_delete_history_prompt: 'Delete chat history for you?',
  msg_partner_disconnected: 'Partner disconnected.',

  // ── View Labels ──
  label_original: '<b>Original:</b>',
  label_literal: '<b>Literal:</b>',
  label_meaning: '<b>Meaning:</b>',
  label_condensed: '<b>Condensed:</b>',
  label_expanded: '<b>Expanded:</b>',
  label_tone: '<b>Tone:</b>',

  // ── Separators ──
  sep_chat_started: 'Chat Started',
  sep_speak_natural: 'You may begin speaking in your natural language.',
  sep_type_end: 'Type /end to disconnect anytime.',
  sep_chat_ended: 'Chat Ended',
  sep_ended_time: 'Ended: {time}',
  sep_connected_to: '\u{1F91D} <b>Now connected to {name}</b>',
  sep_type_naturally: 'Just type naturally in your language. Everything will be translated automatically.',

  // ── Settings ──
  msg_settings: '\u2699\uFE0F <b>Settings</b>\n\nChange your language or dialect.',

  // ── Router / Misc ──
  msg_use_buttons: 'Please use the buttons above to continue setup.',
  msg_use_menu: 'Please use the menu buttons or type /menu to see options.',
  msg_type_start: 'Type /start to get started!',

  // ── Callback Alerts (toast notifications) ──
  alert_copy_link: 'Copy the link from the message above!',
  alert_just_type: 'Just type your message!',
  alert_error: 'Something went wrong',
  alert_set_lang: 'Please set your language first',
  alert_not_in_chat: 'You\'re not in an active chat.',
  alert_session_unavailable: 'Session no longer available',
  alert_connected: 'Connected!',
  alert_history_deleted: 'History deleted for you.',
  alert_history_kept: 'History kept.',
  alert_not_found: 'Message not found',
  alert_unknown_lang: 'Unknown language',

  // ── Loading Quotes ──
  loading_1: 'Calling the Continental...',
  loading_2: 'Consulting the Elder...',
  loading_3: 'Checking the ledger...',
  loading_4: 'Under the table at the Continental...',
  loading_5: 'Asking the Bowery King...',
  loading_6: 'Sharpening the pencil...',
  loading_7: 'Reciting the rules...',
  loading_8: 'Consequentia mirabilis...',
  loading_9: 'Running it through the High Table...',
  loading_10: 'Exchanging the coin...',
  loading_11: 'The marker has been presented...',
  loading_12: 'Si vis pacem, para bellum...',
  loading_13: 'Checking the archives...',
  loading_14: 'The body is not yet cold...',
  loading_15: 'One last job...',

  // ── Time Ago ──
  time_just_now: 'just now',
  time_min_ago: '{n}m ago',
  time_hour_ago: '{n}h ago',
  time_day_ago: '{n}d ago',
} as const;

export type StringKey = keyof typeof UI_STRINGS;

export const LOADING_KEYS: StringKey[] = [
  'loading_1', 'loading_2', 'loading_3', 'loading_4', 'loading_5',
  'loading_6', 'loading_7', 'loading_8', 'loading_9', 'loading_10',
  'loading_11', 'loading_12', 'loading_13', 'loading_14', 'loading_15',
];
